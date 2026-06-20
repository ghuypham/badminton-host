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

  // Regular debts: unpaid or partial, remaining > 0, NOT needs_review
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
         s.title AS session_title,
         s.session_date
       FROM session_participants sp
       JOIN sessions s ON sp.session_id = s.id
       WHERE sp.payment_status IN ('unpaid', 'partial')
         AND (sp.final_amount - sp.paid_amount) > 0
         AND sp.deleted_at IS NULL
         AND s.deleted_at IS NULL
       ORDER BY sp.member_id, s.session_date DESC`,
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
    session_title: string;
    session_date: string;
  }>;

  // Group by member (member_id + name as key)
  const memberMap = new Map<string, DebtEntry>();
  for (const row of debtRows) {
    const key = row.member_id !== null ? `m:${row.member_id}` : `g:${row.name}`;
    if (!memberMap.has(key)) {
      memberMap.set(key, {
        member_id: row.member_id,
        member_name: row.name,
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
      bill_token: row.bill_token,
      bill_url: makeBillUrl(row.bill_token),
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
