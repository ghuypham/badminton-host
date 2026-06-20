// Bill view service: reads participant snapshot, NEVER recomputes from costs.
// Returns session info + amount/status + bank info + rendered payment note.
// Proxy-group billing: if A has followers (paid_by = A.id), A's bill shows group total.
// Followers' bill_tokens are blocked (404) — only the payer's bill is publicly accessible.
import { getDb } from '../db/connection.ts';
import { notFound } from '../utils/http-error.ts';
import { renderNote } from '../utils/render-note.ts';
import type { SessionParticipant, Session, Settings } from '../../shared/types.ts';

// A single line-item in a group bill breakdown
export interface GroupBillLine {
  participant_id: number;
  name: string;
  final_amount: number;
  paid_amount: number;
  payment_status: string; // waived lines show "Miễn" in UI; excluded from money sums
}

export interface BillView {
  participant: Pick<
    SessionParticipant,
    | 'id'
    | 'name'
    | 'phone'
    | 'final_amount'
    | 'paid_amount'
    | 'payment_status'
    | 'bill_token'
    | 'payment_note'
  >;
  // Group billing: total = participant.final_amount + sum(followers.final_amount).
  // group_lines is set only when A has followers; undefined otherwise (solo bill).
  group_lines?: GroupBillLine[];
  group_total?: number;       // integer VND; sum of all lines' final_amount
  group_paid?: number;        // integer VND; sum of all lines' paid_amount
  group_remaining?: number;   // integer VND; group_total - group_paid (clamped ≥ 0)
  remaining: number;          // payer's own remaining (backward compat; for group = group_remaining)
  session: Pick<Session, 'id' | 'title' | 'session_date' | 'location' | 'status'>;
  bank: {
    bank_name: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
    bank_qr_image_base64: string | null;
    bank_qr_mime: string | null;
  };
  renderedNote: string;
}

export function getBillByToken(token: string): BillView {
  const db = getDb();

  const participant = db
    .prepare(
      `SELECT id, session_id, name, phone, final_amount, paid_amount,
              payment_status, bill_token, payment_note, paid_by
       FROM session_participants
       WHERE bill_token = ? AND deleted_at IS NULL`,
    )
    .get(token) as
    | (Pick<
        SessionParticipant,
        'id' | 'name' | 'phone' | 'final_amount' | 'paid_amount' | 'payment_status' | 'bill_token' | 'payment_note'
      > & { session_id: number; paid_by: number | null })
    | undefined;

  if (!participant) throw notFound('Không tìm thấy hóa đơn');

  // Followers must not have an accessible public bill — constraint #5
  if (participant.paid_by !== null) throw notFound('Không tìm thấy hóa đơn');

  const session = db
    .prepare('SELECT id, title, session_date, location, status FROM sessions WHERE id = ? AND deleted_at IS NULL')
    .get(participant.session_id) as
    | Pick<Session, 'id' | 'title' | 'session_date' | 'location' | 'status'>
    | undefined;

  if (!session) throw notFound('Không tìm thấy buổi đánh');

  const settings = db
    .prepare(
      `SELECT bank_name, bank_account_name, bank_account_number,
              bank_qr_image_base64, bank_qr_mime, payment_note_template
       FROM settings WHERE id = 'default'`,
    )
    .get() as
    | (Pick<Settings, 'bank_name' | 'bank_account_name' | 'bank_account_number' | 'bank_qr_image_base64' | 'bank_qr_mime'> & {
        payment_note_template: string;
      })
    | undefined;

  // Load followers (paid_by = A.id) for group billing
  const followers = db
    .prepare(
      `SELECT id AS participant_id, name, final_amount, paid_amount, payment_status
       FROM session_participants
       WHERE paid_by = ? AND deleted_at IS NULL`,
    )
    .all(participant.id) as GroupBillLine[];

  // Build group lines (A first, then followers)
  const hasGroup = followers.length > 0;
  const groupLines: GroupBillLine[] | undefined = hasGroup
    ? [
        {
          participant_id: participant.id,
          name: participant.name,
          final_amount: participant.final_amount,
          paid_amount: participant.paid_amount,
          payment_status: participant.payment_status,
        },
        ...followers,
      ]
    : undefined;

  // Waived members have paid_amount = final_amount in DB but it is NOT real money.
  // Exclude waived lines from both group_total and group_paid so the payer's
  // actual debt is correct (A does not owe for waived companions).
  const groupTotal = hasGroup
    ? groupLines!.filter((l) => l.payment_status !== 'waived').reduce((s, l) => s + l.final_amount, 0)
    : undefined;
  const groupPaid = hasGroup
    ? groupLines!.filter((l) => l.payment_status !== 'waived').reduce((s, l) => s + l.paid_amount, 0)
    : undefined;
  const groupRemaining = hasGroup ? Math.max(groupTotal! - groupPaid!, 0) : undefined;

  const soloRemaining = Math.max(participant.final_amount - participant.paid_amount, 0);
  // For group payer, expose group_remaining as the top-level "remaining" for backward compat
  const remaining = groupRemaining ?? soloRemaining;

  const renderedNote = settings
    ? renderNote(settings.payment_note_template, {
        date: session.session_date,
        name: participant.name,
      })
    : '';

  const { session_id: _sid, paid_by: _pb, ...participantData } = participant;

  return {
    participant: participantData,
    ...(hasGroup && {
      group_lines: groupLines,
      group_total: groupTotal,
      group_paid: groupPaid,
      group_remaining: groupRemaining,
    }),
    remaining,
    session,
    bank: {
      bank_name: settings?.bank_name ?? null,
      bank_account_name: settings?.bank_account_name ?? null,
      bank_account_number: settings?.bank_account_number ?? null,
      bank_qr_image_base64: settings?.bank_qr_image_base64 ?? null,
      bank_qr_mime: settings?.bank_qr_mime ?? null,
    },
    renderedNote,
  };
}
