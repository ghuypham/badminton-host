// Split service: largest-remainder allocation + calculate/finalize split.
import { getDb } from '../db/connection.ts';
import { badRequest } from '../utils/http-error.ts';
import { generateUniqueToken } from '../utils/generate-token.ts';
import { computeSessionTotal } from './cost-service.ts';
import { getSession } from './session-service.ts';
import type { SessionParticipant } from '../../shared/types.ts';

// Pure: distribute total among count people with rounding unit.
// Uses largest-remainder method so sum === total exactly.
export function allocate(total: number, count: number, rounding: number): number[] {
  if (count <= 0) return [];
  if (rounding <= 0) rounding = 1;

  const raw = total / count;
  const base = Math.floor(raw / rounding) * rounding;
  const remainder = total - base * count;
  const extraUnits = Math.round(remainder / rounding); // how many people get +rounding

  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    result.push(base + (i < extraUnits ? rounding : 0));
  }
  return result;
}

export interface SplitSuggestion {
  participantId: number;
  name: string;
  calculatedAmount: number;
}

export interface SplitResult {
  suggestions: SplitSuggestion[];
  allocatedTotal: number;
  difference: number; // allocatedTotal - sessionTotal (rounding artifact)
}

export function calculateSplit(sessionId: number): SplitResult {
  const session = getSession(sessionId);
  const db = getDb();

  const participants = db
    .prepare(
      `SELECT id, name, should_charge FROM session_participants
       WHERE session_id = ? AND deleted_at IS NULL`,
    )
    .all(sessionId) as { id: number; name: string; should_charge: number }[];

  const chargeable = participants.filter((p) => p.should_charge === 1);
  if (chargeable.length === 0) {
    throw badRequest('Không có người cần chia tiền');
  }

  const total = computeSessionTotal(session);
  const settings = db
    .prepare("SELECT default_rounding FROM settings WHERE id = 'default'")
    .get() as { default_rounding: number } | undefined;
  const rounding = settings?.default_rounding ?? 1000;

  const amounts = allocate(total, chargeable.length, rounding);
  const suggestions: SplitSuggestion[] = chargeable.map((p, i) => ({
    participantId: p.id,
    name: p.name,
    calculatedAmount: amounts[i],
  }));

  const allocatedTotal = amounts.reduce((s, a) => s + a, 0);
  return { suggestions, allocatedTotal, difference: allocatedTotal - total };
}

// finalAmounts: array of {participantId, finalAmount} provided by host after review.
export interface FinalizeEntry {
  participantId: number;
  finalAmount: number;
}

export function finalizeSplit(sessionId: number, entries: FinalizeEntry[]): void {
  const session = getSession(sessionId);
  const db = getDb();

  const chargeable = db
    .prepare(
      `SELECT id FROM session_participants WHERE session_id = ? AND should_charge = 1 AND deleted_at IS NULL`,
    )
    .all(sessionId) as { id: number }[];
  if (chargeable.length === 0) throw badRequest('Không có người cần chia tiền');

  // Trust boundary: entries chỉ được phép đúng tập chargeable, và phải phủ hết —
  // tránh client gửi id lạ / bỏ sót người làm tiền không khớp tổng.
  const chargeableIds = new Set(chargeable.map((c) => c.id));
  const entryIds = new Set(entries.map((e) => e.participantId));
  if (entryIds.size !== entries.length) throw badRequest('Danh sách chia tiền bị trùng người');
  for (const e of entries) {
    if (!chargeableIds.has(e.participantId)) {
      throw badRequest('Có người không thuộc danh sách cần chia tiền');
    }
  }
  if (entryIds.size !== chargeableIds.size) {
    throw badRequest('Phải nhập số tiền cho tất cả người cần chia tiền');
  }

  const now = new Date().toISOString();

  db.transaction(() => {
    for (const entry of entries) {
      // Read current state to detect re-finalize on paid/partial
      const current = db
        .prepare('SELECT payment_status, final_amount FROM session_participants WHERE id = ? AND session_id = ?')
        .get(entry.participantId, sessionId) as
        | { payment_status: string; final_amount: number }
        | undefined;
      if (!current) continue;

      const isRefinalize =
        session.status === 'settled' &&
        (current.payment_status === 'paid' || current.payment_status === 'partial');

      let paymentStatus = 'unpaid';
      let previousFinalAmount: number | null = null;

      if (isRefinalize && entry.finalAmount !== current.final_amount) {
        paymentStatus = 'needs_review';
        previousFinalAmount = current.final_amount;
      }

      // Generate bill_token if missing
      const tokenRow = db
        .prepare('SELECT bill_token FROM session_participants WHERE id = ?')
        .get(entry.participantId) as { bill_token: string | null } | undefined;

      let billToken = tokenRow?.bill_token ?? null;
      if (!billToken) {
        billToken = generateUniqueToken((token) => {
          const conflict = db
            .prepare('SELECT id FROM session_participants WHERE bill_token = ?')
            .get(token);
          if (conflict) {
            const err = new Error('token conflict') as NodeJS.ErrnoException;
            err.code = 'SQLITE_CONSTRAINT_UNIQUE';
            throw err;
          }
        });
      }

      db.prepare(
        `UPDATE session_participants SET
           calculated_amount = @calculated_amount,
           final_amount = @final_amount,
           previous_final_amount = @previous_final_amount,
           payment_status = @payment_status,
           paid_amount = 0,
           bill_token = @bill_token,
           updated_at = @now
         WHERE id = @id`,
      ).run({
        calculated_amount: entry.finalAmount,
        final_amount: entry.finalAmount,
        previous_final_amount: isRefinalize ? previousFinalAmount : null,
        payment_status: isRefinalize ? paymentStatus : 'unpaid',
        bill_token: billToken,
        now,
        id: entry.participantId,
      });
    }

    // Mark non-chargeable participants with 0 amounts and generate bill_token
    const nonChargeable = db
      .prepare(
        `SELECT id, bill_token FROM session_participants
         WHERE session_id = ? AND should_charge = 0 AND deleted_at IS NULL`,
      )
      .all(sessionId) as { id: number; bill_token: string | null }[];

    for (const p of nonChargeable) {
      let billToken = p.bill_token;
      if (!billToken) {
        billToken = generateUniqueToken((token) => {
          const conflict = db
            .prepare('SELECT id FROM session_participants WHERE bill_token = ?')
            .get(token);
          if (conflict) {
            const err = new Error('token conflict') as NodeJS.ErrnoException;
            err.code = 'SQLITE_CONSTRAINT_UNIQUE';
            throw err;
          }
        });
      }
      db.prepare(
        `UPDATE session_participants SET bill_token = @bill_token, updated_at = @now WHERE id = @id`,
      ).run({ bill_token: billToken, now, id: p.id });
    }

    db.prepare(
      `UPDATE sessions SET status = 'settled', split_finalized_at = ?, updated_at = ? WHERE id = ?`,
    ).run(now, now, sessionId);
  })();
}
