// Session + court CRUD service.
import { getDb } from '../db/connection.ts';
import { sanitizeText, sanitizeOptional } from '../utils/sanitize.ts';
import { notFound, badRequest } from '../utils/http-error.ts';
import { generateUniqueToken } from '../utils/generate-token.ts';
import type {
  CreateSessionInput, UpdateSessionInput,
  CreateCourtInput, UpdateCourtInput,
} from '../schemas/session-schema.ts';
import type { Session, SessionCourt } from '../../shared/types.ts';

// --- Session queries ---

export function listSessions(opts: { status?: string } = {}): Session[] {
  const db = getDb();
  if (opts.status) {
    return db.prepare(
      'SELECT * FROM sessions WHERE deleted_at IS NULL AND status = ? ORDER BY session_date DESC'
    ).all(opts.status) as Session[];
  }
  return db.prepare(
    'SELECT * FROM sessions WHERE deleted_at IS NULL ORDER BY session_date DESC'
  ).all() as Session[];
}

export function getSession(id: number): Session {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM sessions WHERE id = ? AND deleted_at IS NULL'
  ).get(id) as Session | undefined;
  if (!row) throw notFound('Không tìm thấy buổi đánh');
  return row;
}

export function getSessionByToken(token: string): Session {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM sessions WHERE public_token = ? AND deleted_at IS NULL'
  ).get(token) as Session | undefined;
  if (!row) throw notFound('Không tìm thấy buổi đánh');
  return row;
}

export function createSession(input: CreateSessionInput): Session {
  const db = getDb();
  const now = new Date().toISOString();
  let newId!: number;

  generateUniqueToken((token) => {
    const res = db.prepare(
      `INSERT INTO sessions (title, session_date, location, status, public_token, registration_enabled, private_note, created_at, updated_at)
       VALUES (@title, @session_date, @location, 'draft', @token, @registration_enabled, @private_note, @now, @now)`
    ).run({
      title: sanitizeText(input.title),
      session_date: input.session_date,
      location: sanitizeOptional(input.location),
      registration_enabled: input.registration_enabled ?? 0,
      private_note: sanitizeOptional(input.private_note),
      token,
      now,
    });
    newId = res.lastInsertRowid as number;
  });

  return getSession(newId);
}

export function updateSession(id: number, input: UpdateSessionInput): Session {
  const session = getSession(id); // throws 404

  // Block edits to manual_total if settled (P6 Red Team)
  if (
    session.status === 'settled' &&
    input.manual_total !== undefined &&
    input.manual_total !== session.manual_total
  ) {
    throw badRequest('Buổi đã chốt. Mở lại buổi trước khi chỉnh tổng tiền.');
  }

  const db = getDb();
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = @now'];
  const params: Record<string, unknown> = { id, now };

  if (input.title !== undefined) { sets.push('title = @title'); params.title = sanitizeText(input.title); }
  if (input.session_date !== undefined) { sets.push('session_date = @session_date'); params.session_date = input.session_date; }
  if ('location' in input) { sets.push('location = @location'); params.location = sanitizeOptional(input.location); }
  if ('private_note' in input) { sets.push('private_note = @private_note'); params.private_note = sanitizeOptional(input.private_note); }
  if (input.status !== undefined) { sets.push('status = @status'); params.status = input.status; }
  if (input.registration_enabled !== undefined) { sets.push('registration_enabled = @registration_enabled'); params.registration_enabled = input.registration_enabled; }
  if ('manual_total' in input) { sets.push('manual_total = @manual_total'); params.manual_total = input.manual_total ?? null; }

  db.prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return getSession(id);
}

export function deleteSession(id: number): void {
  getSession(id);
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE sessions SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
}

// --- Court queries ---

export function listCourts(sessionId: number): SessionCourt[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM session_courts WHERE session_id = ? AND deleted_at IS NULL ORDER BY id ASC'
  ).all(sessionId) as SessionCourt[];
}

export function getCourt(sessionId: number, courtId: number): SessionCourt {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM session_courts WHERE id = ? AND session_id = ? AND deleted_at IS NULL'
  ).get(courtId, sessionId) as SessionCourt | undefined;
  if (!row) throw notFound('Không tìm thấy sân');
  return row;
}

export function createCourt(sessionId: number, input: CreateCourtInput): SessionCourt {
  const session = getSession(sessionId);
  if (session.status === 'settled') throw badRequest('Buổi đã chốt. Mở lại trước khi thêm sân.');
  const db = getDb();
  const now = new Date().toISOString();
  const res = db.prepare(
    `INSERT INTO session_courts (session_id, name, start_time, end_time, cost, created_at)
     VALUES (@session_id, @name, @start_time, @end_time, @cost, @now)`
  ).run({
    session_id: sessionId,
    name: sanitizeText(input.name),
    start_time: input.start_time ?? null,
    end_time: input.end_time ?? null,
    cost: input.cost,
    now,
  });
  return getCourt(sessionId, res.lastInsertRowid as number);
}

export function updateCourt(sessionId: number, courtId: number, input: UpdateCourtInput): SessionCourt {
  const session = getSession(sessionId);
  if (session.status === 'settled') throw badRequest('Buổi đã chốt. Mở lại trước khi sửa sân.');
  getCourt(sessionId, courtId);
  const db = getDb();
  const sets: string[] = [];
  const params: Record<string, unknown> = { id: courtId };

  if (input.name !== undefined) { sets.push('name = @name'); params.name = sanitizeText(input.name); }
  if (input.start_time !== undefined) { sets.push('start_time = @start_time'); params.start_time = input.start_time ?? null; }
  if (input.end_time !== undefined) { sets.push('end_time = @end_time'); params.end_time = input.end_time ?? null; }
  if (input.cost !== undefined) { sets.push('cost = @cost'); params.cost = input.cost; }

  if (sets.length) {
    db.prepare(`UPDATE session_courts SET ${sets.join(', ')} WHERE id = @id`).run(params);
  }
  return getCourt(sessionId, courtId);
}

export function deleteCourt(sessionId: number, courtId: number): void {
  const session = getSession(sessionId);
  if (session.status === 'settled') throw badRequest('Buổi đã chốt. Mở lại trước khi xóa sân.');
  getCourt(sessionId, courtId);
  const db = getDb();
  db.prepare('UPDATE session_courts SET deleted_at = ? WHERE id = ?')
    .run(new Date().toISOString(), courtId);
}

// Home stats: upcoming sessions + pending count + total debt.
export function getHomeStats() {
  const db = getDb();
  const upcomingSessions = db.prepare(
    `SELECT id, title, session_date, status FROM sessions
     WHERE deleted_at IS NULL AND status != 'settled'
     ORDER BY session_date DESC LIMIT 5`
  ).all();

  let pendingCount = 0;
  let totalDebt = 0;
  try {
    const pc = db.prepare(
      `SELECT COUNT(*) as cnt FROM session_participants
       WHERE status = 'pending' AND deleted_at IS NULL`
    ).get() as { cnt: number };
    pendingCount = pc.cnt;

    const td = db.prepare(
      `SELECT COALESCE(SUM(MAX(final_amount - paid_amount, 0)), 0) as total
       FROM session_participants
       WHERE payment_status IN ('unpaid','partial') AND deleted_at IS NULL`
    ).get() as { total: number };
    totalDebt = td.total;
  } catch {
    // tables may not exist in dev before migration
  }

  return { upcomingSessions, pendingCount, totalDebt };
}
