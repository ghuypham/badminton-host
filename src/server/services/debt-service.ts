// Debt service: group unpaid/partial participants by member, exclude needs_review.
import { getDb } from '../db/connection.ts';
import { env } from '../env.ts';

export interface DebtEntry {
  member_id: number | null;
  member_name: string;
  total_remaining: number;
  items: DebtItem[];
}

export interface DebtItem {
  participant_id: number;
  session_id: number;
  session_title: string;
  session_date: string;
  final_amount: number;
  paid_amount: number;
  remaining: number;
  payment_status: string;
  bill_token: string | null;
  bill_url: string | null;
}

export interface DebtsResult {
  debts: DebtEntry[];
  needsReview: NeedsReviewEntry[];
}

export interface NeedsReviewEntry {
  participant_id: number;
  name: string;
  member_id: number | null;
  session_id: number;
  session_title: string;
  session_date: string;
  previous_final_amount: number | null;
  final_amount: number;
  paid_amount: number;
  bill_token: string | null;
  bill_url: string | null;
}

function makeBillUrl(token: string | null): string | null {
  if (!token) return null;
  const path = `/b/${token}`;
  return env.appBaseUrl ? `${env.appBaseUrl}${path}` : path;
}

export function listDebts(): DebtsResult {
  const db = getDb();

  // Regular debts: unpaid or partial, remaining > 0, NOT needs_review.
  // Proxy-group billing: debts attributed to the payer (paid_by ?? id).
  // Followers' debts appear under the payer's entry, not under their own name.
  const debtRows = db
    .prepare(
      `SELECT
         sp.id AS participant_id,
         sp.session_id,
         sp.member_id,
         sp.name,
         sp.final_amount,
         sp.paid_amount,
         sp.payment_status,
         sp.bill_token,
         sp.paid_by,
         s.title AS session_title,
         s.session_date
       FROM session_participants sp
       JOIN sessions s ON sp.session_id = s.id
       WHERE sp.payment_status IN ('unpaid', 'partial')
         AND (sp.final_amount - sp.paid_amount) > 0
         AND sp.deleted_at IS NULL
         AND s.deleted_at IS NULL
       ORDER BY COALESCE(sp.paid_by, sp.id), s.session_date DESC`,
    )
    .all() as Array<{
    participant_id: number;
    session_id: number;
    member_id: number | null;
    name: string;
    final_amount: number;
    paid_amount: number;
    payment_status: string;
    bill_token: string | null;
    paid_by: number | null;
    session_title: string;
    session_date: string;
  }>;

  // For followers, we need the payer's name to group under them.
  // Build a lookup: participant_id → name (for payers that appear in the result set)
  const payerNames = new Map<number, { member_id: number | null; name: string; bill_token: string | null }>();
  for (const row of debtRows) {
    if (row.paid_by === null) {
      // This row is a payer (or solo): record it for lookup
      if (!payerNames.has(row.participant_id)) {
        payerNames.set(row.participant_id, {
          member_id: row.member_id,
          name: row.name,
          bill_token: row.bill_token,
        });
      }
    }
  }

  // For followers whose payer is NOT already in debtRows (payer is fully paid),
  // fetch the payer info from DB to display under the correct name.
  const missingPayerIds = new Set<number>();
  for (const row of debtRows) {
    if (row.paid_by !== null && !payerNames.has(row.paid_by)) {
      missingPayerIds.add(row.paid_by);
    }
  }
  if (missingPayerIds.size > 0) {
    const ids = Array.from(missingPayerIds);
    const placeholders = ids.map(() => '?').join(',');
    const payerRows = db
      .prepare(
        `SELECT id, member_id, name, bill_token FROM session_participants
         WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
      )
      .all(...ids) as Array<{ id: number; member_id: number | null; name: string; bill_token: string | null }>;
    for (const p of payerRows) {
      payerNames.set(p.id, { member_id: p.member_id, name: p.name, bill_token: p.bill_token });
    }
  }

  // Group by effective payer: paid_by ?? participant_id (for members: m:<id>; for guests: g:<payerId>)
  const memberMap = new Map<string, DebtEntry>();
  for (const row of debtRows) {
    // Determine who is the effective payer for this debt row
    const effectivePayerId = row.paid_by ?? row.participant_id;
    const effectivePayer = row.paid_by !== null
      ? payerNames.get(row.paid_by)
      : { member_id: row.member_id, name: row.name, bill_token: row.bill_token };

    const payerMemberId = effectivePayer?.member_id ?? null;
    const payerName = effectivePayer?.name ?? row.name;
    const payerBillToken = effectivePayer?.bill_token ?? null;

    const key = payerMemberId !== null ? `m:${payerMemberId}` : `g:${effectivePayerId}`;
    if (!memberMap.has(key)) {
      memberMap.set(key, {
        member_id: payerMemberId,
        member_name: payerName,
        total_remaining: 0,
        items: [],
      });
    }
    const entry = memberMap.get(key)!;
    const remaining = row.final_amount - row.paid_amount;
    entry.total_remaining += remaining;
    entry.items.push({
      participant_id: row.participant_id,
      session_id: row.session_id,
      session_title: row.session_title,
      session_date: row.session_date,
      final_amount: row.final_amount,
      paid_amount: row.paid_amount,
      remaining,
      payment_status: row.payment_status,
      // Followers have no accessible public bill; use payer's bill_token for the group entry
      bill_token: row.paid_by !== null ? payerBillToken : row.bill_token,
      bill_url: makeBillUrl(row.paid_by !== null ? payerBillToken : row.bill_token),
    });
  }

  // needs_review group
  const reviewRows = db
    .prepare(
      `SELECT
         sp.id AS participant_id,
         sp.session_id,
         sp.member_id,
         sp.name,
         sp.final_amount,
         sp.paid_amount,
         sp.previous_final_amount,
         sp.bill_token,
         s.title AS session_title,
         s.session_date
       FROM session_participants sp
       JOIN sessions s ON sp.session_id = s.id
       WHERE sp.payment_status = 'needs_review'
         AND sp.deleted_at IS NULL
         AND s.deleted_at IS NULL
       ORDER BY s.session_date DESC`,
    )
    .all() as Array<{
    participant_id: number;
    session_id: number;
    member_id: number | null;
    name: string;
    final_amount: number;
    paid_amount: number;
    previous_final_amount: number | null;
    bill_token: string | null;
    session_title: string;
    session_date: string;
  }>;

  const needsReview: NeedsReviewEntry[] = reviewRows.map((r) => ({
    participant_id: r.participant_id,
    name: r.name,
    member_id: r.member_id,
    session_id: r.session_id,
    session_title: r.session_title,
    session_date: r.session_date,
    previous_final_amount: r.previous_final_amount,
    final_amount: r.final_amount,
    paid_amount: r.paid_amount,
    bill_token: r.bill_token,
    bill_url: makeBillUrl(r.bill_token),
  }));

  return {
    debts: Array.from(memberMap.values()),
    needsReview,
  };
}
