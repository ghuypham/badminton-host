// Reports service: aggregate queries cho trang báo cáo admin.
// Tất cả query đều exclude soft-deleted rows (deleted_at IS NULL).
// Session total = manual_total nếu có, nếu không = sum(courts.cost) + sum(cost_items.amount), clamp ≥ 0.
import { getDb } from '../db/connection.ts';

export interface DateFilter {
  from?: string; // ISO date string yyyy-mm-dd
  to?: string;
}

// ── Finance ──────────────────────────────────────────────────────────────────

export interface FinanceStats {
  totalCollected: number;       // sum of paid_amount (all participants)
  totalOutstanding: number;     // sum of (final_amount - paid_amount) where unpaid/partial
  totalSessionCost: number;     // sum of session totals across filtered sessions
  totalPending: number;         // alias: same as totalOutstanding (money yet to collect)
}

// Compute sum of session totals for sessions in date range.
// Uses the same logic as computeSessionTotal: manual_total if set, else courts+items.
function sumSessionTotals(sessionIds: number[]): number {
  if (sessionIds.length === 0) return 0;
  const db = getDb();
  const placeholders = sessionIds.map(() => '?').join(',');

  let total = 0;
  // For sessions with manual_total set
  const manualRows = db
    .prepare(
      `SELECT id, manual_total FROM sessions
       WHERE id IN (${placeholders}) AND manual_total IS NOT NULL AND deleted_at IS NULL`,
    )
    .all(...sessionIds) as { id: number; manual_total: number }[];

  const manualIds = new Set(manualRows.map((r) => r.id));
  total += manualRows.reduce((s, r) => s + r.manual_total, 0);

  // For sessions without manual_total: courts + cost_items
  const computedIds = sessionIds.filter((id) => !manualIds.has(id));
  if (computedIds.length > 0) {
    const cPlaceholders = computedIds.map(() => '?').join(',');
    const courtsRow = db
      .prepare(
        `SELECT COALESCE(SUM(cost), 0) AS total FROM session_courts
         WHERE session_id IN (${cPlaceholders}) AND deleted_at IS NULL`,
      )
      .get(...computedIds) as { total: number };
    const itemsRow = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM cost_items
         WHERE session_id IN (${cPlaceholders}) AND deleted_at IS NULL`,
      )
      .get(...computedIds) as { total: number };
    total += Math.max(0, courtsRow.total + itemsRow.total);
  }

  return total;
}

function getFilteredSessionIds(filter: DateFilter): number[] {
  const db = getDb();
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: string[] = [];
  if (filter.from) { conditions.push('session_date >= ?'); params.push(filter.from); }
  if (filter.to)   { conditions.push('session_date <= ?'); params.push(filter.to); }

  const rows = db
    .prepare(`SELECT id FROM sessions WHERE ${conditions.join(' AND ')} ORDER BY session_date DESC`)
    .all(...params) as { id: number }[];
  return rows.map((r) => r.id);
}

export function getFinanceStats(filter: DateFilter): FinanceStats {
  const db = getDb();
  const sessionIds = getFilteredSessionIds(filter);

  if (sessionIds.length === 0) {
    return { totalCollected: 0, totalOutstanding: 0, totalSessionCost: 0, totalPending: 0 };
  }

  const placeholders = sessionIds.map(() => '?').join(',');

  // Sum paid_amount across all participants in these sessions (should_charge = 1 only)
  const collectedRow = db
    .prepare(
      `SELECT COALESCE(SUM(paid_amount), 0) AS total
       FROM session_participants
       WHERE session_id IN (${placeholders}) AND should_charge = 1 AND deleted_at IS NULL`,
    )
    .get(...sessionIds) as { total: number };

  // Sum outstanding (unpaid + partial only, remaining > 0)
  const outstandingRow = db
    .prepare(
      `SELECT COALESCE(SUM(final_amount - paid_amount), 0) AS total
       FROM session_participants
       WHERE session_id IN (${placeholders})
         AND should_charge = 1
         AND payment_status IN ('unpaid', 'partial')
         AND (final_amount - paid_amount) > 0
         AND deleted_at IS NULL`,
    )
    .get(...sessionIds) as { total: number };

  const totalSessionCost = sumSessionTotals(sessionIds);

  return {
    totalCollected: collectedRow.total,
    totalOutstanding: outstandingRow.total,
    totalSessionCost,
    totalPending: outstandingRow.total,
  };
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export interface SessionBreakdown {
  session_id: number;
  session_date: string;
  title: string;
  participant_count: number;
  session_total: number;
  collected: number;
  outstanding: number;
}

export interface SessionsStats {
  totalSessions: number;
  totalParticipations: number;
  avgRevenuePerSession: number;
  breakdown: SessionBreakdown[];
}

export function getSessionsStats(filter: DateFilter): SessionsStats {
  const db = getDb();
  const sessionIds = getFilteredSessionIds(filter);

  if (sessionIds.length === 0) {
    return { totalSessions: 0, totalParticipations: 0, avgRevenuePerSession: 0, breakdown: [] };
  }

  const placeholders = sessionIds.map(() => '?').join(',');

  // Basic session info + aggregate per session
  const sessionRows = db
    .prepare(
      `SELECT s.id, s.title, s.session_date, s.manual_total,
              COALESCE(SUM(CASE WHEN sp.deleted_at IS NULL THEN 1 ELSE 0 END), 0) AS participant_count,
              COALESCE(SUM(CASE WHEN sp.deleted_at IS NULL AND sp.should_charge = 1 THEN sp.paid_amount ELSE 0 END), 0) AS collected,
              COALESCE(SUM(CASE WHEN sp.deleted_at IS NULL AND sp.should_charge = 1
                                 AND sp.payment_status IN ('unpaid','partial')
                                 AND (sp.final_amount - sp.paid_amount) > 0
                                THEN sp.final_amount - sp.paid_amount ELSE 0 END), 0) AS outstanding
       FROM sessions s
       LEFT JOIN session_participants sp ON sp.session_id = s.id
       WHERE s.id IN (${placeholders}) AND s.deleted_at IS NULL
       GROUP BY s.id
       ORDER BY s.session_date DESC`,
    )
    .all(...sessionIds) as Array<{
    id: number;
    title: string;
    session_date: string;
    manual_total: number | null;
    participant_count: number;
    collected: number;
    outstanding: number;
  }>;

  const totalParticipations = sessionRows.reduce((s, r) => s + r.participant_count, 0);

  // Compute session totals
  const breakdown: SessionBreakdown[] = sessionRows.map((r) => {
    // For individual session total computation, use same logic as cost-service
    let sessionTotal: number;
    if (r.manual_total !== null && r.manual_total !== undefined) {
      sessionTotal = r.manual_total;
    } else {
      const courtsRow = db
        .prepare(
          `SELECT COALESCE(SUM(cost), 0) AS total FROM session_courts
           WHERE session_id = ? AND deleted_at IS NULL`,
        )
        .get(r.id) as { total: number };
      const itemsRow = db
        .prepare(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM cost_items
           WHERE session_id = ? AND deleted_at IS NULL`,
        )
        .get(r.id) as { total: number };
      sessionTotal = Math.max(0, courtsRow.total + itemsRow.total);
    }
    return {
      session_id: r.id,
      session_date: r.session_date,
      title: r.title,
      participant_count: r.participant_count,
      session_total: sessionTotal,
      collected: r.collected,
      outstanding: r.outstanding,
    };
  });

  const totalSessionCost = breakdown.reduce((s, b) => s + b.session_total, 0);
  const avgRevenuePerSession = sessionRows.length > 0 ? Math.round(totalSessionCost / sessionRows.length) : 0;

  return {
    totalSessions: sessionRows.length,
    totalParticipations,
    avgRevenuePerSession,
    breakdown,
  };
}

// ── Members ───────────────────────────────────────────────────────────────────

export interface MemberRankEntry {
  member_id: number | null;
  name: string;
  count: number;
  amount: number; // debt remaining (for top-debt ranking)
}

export interface AttendanceEntry {
  member_id: number;
  name: string;
  attended: number;
  absent: number;
  total: number;
}

export interface MembersStats {
  topParticipants: MemberRankEntry[];   // by count DESC
  topDebtors: MemberRankEntry[];        // by total outstanding DESC
  attendanceRates: AttendanceEntry[];   // attended vs absent per member
}

const TOP_N = 10;

export function getMembersStats(filter: DateFilter): MembersStats {
  const db = getDb();
  const sessionIds = getFilteredSessionIds(filter);

  if (sessionIds.length === 0) {
    return { topParticipants: [], topDebtors: [], attendanceRates: [] };
  }

  const placeholders = sessionIds.map(() => '?').join(',');

  // Top participants by attendance count
  const participantRows = db
    .prepare(
      `SELECT sp.member_id, sp.name, COUNT(*) AS cnt
       FROM session_participants sp
       WHERE sp.session_id IN (${placeholders}) AND sp.deleted_at IS NULL
       GROUP BY COALESCE(sp.member_id, sp.name)
       ORDER BY cnt DESC
       LIMIT ${TOP_N}`,
    )
    .all(...sessionIds) as { member_id: number | null; name: string; cnt: number }[];

  const topParticipants: MemberRankEntry[] = participantRows.map((r) => ({
    member_id: r.member_id,
    name: r.name,
    count: r.cnt,
    amount: 0,
  }));

  // Top debtors: outstanding = sum(final_amount - paid_amount) where unpaid/partial
  const debtRows = db
    .prepare(
      `SELECT sp.member_id, sp.name,
              SUM(sp.final_amount - sp.paid_amount) AS remaining,
              COUNT(*) AS cnt
       FROM session_participants sp
       WHERE sp.session_id IN (${placeholders})
         AND sp.should_charge = 1
         AND sp.payment_status IN ('unpaid', 'partial')
         AND (sp.final_amount - sp.paid_amount) > 0
         AND sp.deleted_at IS NULL
       GROUP BY COALESCE(sp.member_id, sp.name)
       ORDER BY remaining DESC
       LIMIT ${TOP_N}`,
    )
    .all(...sessionIds) as { member_id: number | null; name: string; remaining: number; cnt: number }[];

  const topDebtors: MemberRankEntry[] = debtRows.map((r) => ({
    member_id: r.member_id,
    name: r.name,
    count: r.cnt,
    amount: r.remaining,
  }));

  // Attendance rates: attended vs absent for fixed members only
  const attendanceRows = db
    .prepare(
      `SELECT sp.member_id, sp.name,
              SUM(CASE WHEN sp.status = 'attended' THEN 1 ELSE 0 END) AS attended,
              SUM(CASE WHEN sp.status = 'absent' THEN 1 ELSE 0 END) AS absent,
              COUNT(*) AS total
       FROM session_participants sp
       WHERE sp.session_id IN (${placeholders})
         AND sp.member_id IS NOT NULL
         AND sp.deleted_at IS NULL
       GROUP BY sp.member_id
       ORDER BY total DESC
       LIMIT ${TOP_N}`,
    )
    .all(...sessionIds) as {
    member_id: number;
    name: string;
    attended: number;
    absent: number;
    total: number;
  }[];

  const attendanceRates: AttendanceEntry[] = attendanceRows.map((r) => ({
    member_id: r.member_id,
    name: r.name,
    attended: r.attended,
    absent: r.absent,
    total: r.total,
  }));

  return { topParticipants, topDebtors, attendanceRates };
}

// ── Payments history ──────────────────────────────────────────────────────────

export interface PaymentHistoryEntry {
  participant_id: number;
  name: string;
  session_id: number;
  session_title: string;
  session_date: string;
  paid_amount: number;
  payment_status: string;
  updated_at: string;
}

const PAYMENTS_LIMIT = 30;

export function getPaymentHistory(filter: DateFilter): PaymentHistoryEntry[] {
  const db = getDb();
  const sessionIds = getFilteredSessionIds(filter);

  if (sessionIds.length === 0) return [];

  const placeholders = sessionIds.map(() => '?').join(',');

  const rows = db
    .prepare(
      `SELECT sp.id AS participant_id, sp.name, sp.session_id, sp.paid_amount,
              sp.payment_status, sp.updated_at,
              s.title AS session_title, s.session_date
       FROM session_participants sp
       JOIN sessions s ON sp.session_id = s.id
       WHERE sp.session_id IN (${placeholders})
         AND sp.payment_status IN ('paid', 'partial', 'waived')
         AND sp.paid_amount > 0
         AND sp.deleted_at IS NULL
         AND s.deleted_at IS NULL
       ORDER BY sp.updated_at DESC
       LIMIT ${PAYMENTS_LIMIT}`,
    )
    .all(...sessionIds) as PaymentHistoryEntry[];

  return rows;
}

// ── Public participation report (privacy-safe: NO money, NO phone) ────────────

export interface ParticipationEntry {
  name: string;
  sessionCount: number;
}

export interface PublicParticipationReport {
  generatedAllTime: true;
  members: ParticipationEntry[];  // has member_id (CLB members)
  guests?: ParticipationEntry[];  // member_id IS NULL; omitted when show_guests=0
}

// Count sessions attended (status='attended' OR should_charge=1 — matches how app records
// confirmed attendance/charges). Excludes soft-deleted sessions/participants.
// Draft sessions (status='draft') are excluded; only 'open' and 'settled' count.
export function getPublicParticipationReport(showGuests: boolean): PublicParticipationReport {
  const db = getDb();

  // CLB members: participant rows linked to a member (member_id NOT NULL)
  const memberRows = db
    .prepare(
      `SELECT m.name AS name, COUNT(*) AS cnt
       FROM session_participants sp
       JOIN sessions s ON sp.session_id = s.id
       JOIN members m ON m.id = sp.member_id
       WHERE sp.member_id IS NOT NULL
         AND sp.deleted_at IS NULL
         AND s.deleted_at IS NULL
         AND m.deleted_at IS NULL
         AND s.status IN ('open', 'settled')
         AND (sp.status = 'attended' OR sp.should_charge = 1)
       GROUP BY sp.member_id
       ORDER BY cnt DESC`,
    )
    .all() as { name: string; cnt: number }[];

  const members: ParticipationEntry[] = memberRows.map((r) => ({
    name: r.name,
    sessionCount: r.cnt,
  }));

  if (!showGuests) {
    return { generatedAllTime: true, members };
  }

  // Guests: participant rows with no member_id (khách vãng lai), grouped by name
  const guestRows = db
    .prepare(
      `SELECT sp.name, COUNT(*) AS cnt
       FROM session_participants sp
       JOIN sessions s ON sp.session_id = s.id
       WHERE sp.member_id IS NULL
         AND sp.deleted_at IS NULL
         AND s.deleted_at IS NULL
         AND s.status IN ('open', 'settled')
         AND (sp.status = 'attended' OR sp.should_charge = 1)
       GROUP BY sp.name
       ORDER BY cnt DESC`,
    )
    .all() as { name: string; cnt: number }[];

  const guests: ParticipationEntry[] = guestRows.map((r) => ({
    name: r.name,
    sessionCount: r.cnt,
  }));

  return { generatedAllTime: true, members, guests };
}

// ── Combined report ───────────────────────────────────────────────────────────

export interface ReportResult {
  finance: FinanceStats;
  sessions: SessionsStats;
  members: MembersStats;
  payments: PaymentHistoryEntry[];
}

export function getReport(filter: DateFilter): ReportResult {
  return {
    finance: getFinanceStats(filter),
    sessions: getSessionsStats(filter),
    members: getMembersStats(filter),
    payments: getPaymentHistory(filter),
  };
}
