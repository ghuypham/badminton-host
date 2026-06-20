// Member CRUD: create, list, get, update, soft-delete, history.
import { getDb } from '../db/connection.ts';
import { sanitizeText, sanitizeOptional } from '../utils/sanitize.ts';
import { notFound } from '../utils/http-error.ts';
import type { CreateMemberInput, UpdateMemberInput } from '../schemas/member-schema.ts';
import type { Member } from '../../shared/types.ts';

export function listMembers(opts: {
  search?: string;
  member_type?: string;
  skill_level?: number;
}): Member[] {
  const db = getDb();
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: Record<string, unknown> = {};

  if (opts.search) {
    conditions.push('(name LIKE @search OR phone LIKE @search)');
    params.search = `%${opts.search}%`;
  }
  if (opts.member_type) {
    conditions.push('member_type = @member_type');
    params.member_type = opts.member_type;
  }
  if (opts.skill_level !== undefined) {
    conditions.push('skill_level = @skill_level');
    params.skill_level = opts.skill_level;
  }

  const where = conditions.join(' AND ');
  return db.prepare(`SELECT * FROM members WHERE ${where} ORDER BY name ASC`).all(params) as Member[];
}

export function getMember(id: number): Member {
  const db = getDb();
  const row = db.prepare('SELECT * FROM members WHERE id = ? AND deleted_at IS NULL').get(id) as Member | undefined;
  if (!row) throw notFound('Không tìm thấy thành viên');
  return row;
}

export function createMember(input: CreateMemberInput): Member {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare(
    `INSERT INTO members (name, phone, member_type, skill_level, status, note, created_at, updated_at)
     VALUES (@name, @phone, @member_type, @skill_level, @status, @note, @now, @now)`
  ).run({
    name: sanitizeText(input.name),
    phone: sanitizeOptional(input.phone),
    member_type: input.member_type ?? 'fixed',
    skill_level: input.skill_level ?? 0,
    status: input.status ?? 'active',
    note: sanitizeOptional(input.note),
    now,
  });
  return getMember(result.lastInsertRowid as number);
}

export function updateMember(id: number, input: UpdateMemberInput): Member {
  getMember(id); // throws 404 if not found
  const db = getDb();
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = @now'];
  const params: Record<string, unknown> = { id, now };

  if (input.name !== undefined) { sets.push('name = @name'); params.name = sanitizeText(input.name); }
  if (input.phone !== undefined) { sets.push('phone = @phone'); params.phone = sanitizeOptional(input.phone); }
  if (input.member_type !== undefined) { sets.push('member_type = @member_type'); params.member_type = input.member_type; }
  if (input.skill_level !== undefined) { sets.push('skill_level = @skill_level'); params.skill_level = input.skill_level; }
  if (input.status !== undefined) { sets.push('status = @status'); params.status = input.status; }
  if (input.note !== undefined) { sets.push('note = @note'); params.note = sanitizeOptional(input.note); }

  db.prepare(`UPDATE members SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return getMember(id);
}

export function deleteMember(id: number): void {
  getMember(id); // throws 404 if not found
  const db = getDb();
  db.prepare('UPDATE members SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .run(new Date().toISOString(), new Date().toISOString(), id);
}

// Member history: list participations after P5/P9 tables exist.
// Returns empty array if session_participants table not yet created (safe stub).
export function getMemberHistory(id: number): unknown[] {
  getMember(id); // throws 404 if not found
  const db = getDb();
  try {
    const rows = db.prepare(
      `SELECT
         sp.id, sp.session_id, sp.status, sp.should_charge,
         sp.final_amount, sp.payment_status, sp.paid_amount,
         s.title, s.session_date, s.status AS session_status
       FROM session_participants sp
       JOIN sessions s ON sp.session_id = s.id
       WHERE sp.member_id = ? AND sp.deleted_at IS NULL
       ORDER BY s.session_date DESC`
    ).all(id);
    return rows;
  } catch {
    return [];
  }
}
