// Participant CRUD: add from member/guest, approve/reject, update, soft-delete.
// should_charge default: going/absent/cancelled → 0, attended → 1, override allowed.
import { getDb } from '../db/connection.ts';
import { sanitizeText, sanitizeOptional } from '../utils/sanitize.ts';
import { badRequest, notFound } from '../utils/http-error.ts';
import type {
  AddParticipantFromMemberInput,
  AddGuestParticipantInput,
  UpdateParticipantInput,
} from '../schemas/participant-schema.ts';
import type { SessionParticipant } from '../../shared/types.ts';

function defaultShouldCharge(status: string): number {
  return status === 'attended' ? 1 : 0;
}

export function getParticipant(id: number): SessionParticipant {
  const row = getDb()
    .prepare('SELECT * FROM session_participants WHERE id = ? AND deleted_at IS NULL')
    .get(id) as SessionParticipant | undefined;
  if (!row) throw notFound('Không tìm thấy người tham gia');
  return row;
}

export function listParticipants(sessionId: number): SessionParticipant[] {
  return getDb()
    .prepare(
      'SELECT * FROM session_participants WHERE session_id = ? AND deleted_at IS NULL ORDER BY created_at ASC',
    )
    .all(sessionId) as SessionParticipant[];
}

export function addParticipantFromMember(
  sessionId: number,
  input: AddParticipantFromMemberInput,
): SessionParticipant {
  const db = getDb();
  const session = db
    .prepare('SELECT id FROM sessions WHERE id = ? AND deleted_at IS NULL')
    .get(sessionId) as { id: number } | undefined;
  if (!session) throw notFound('Không tìm thấy buổi đánh');

  const member = db
    .prepare('SELECT * FROM members WHERE id = ? AND deleted_at IS NULL')
    .get(input.member_id) as { id: number; name: string; phone: string | null; skill_level: number } | undefined;
  if (!member) throw notFound('Không tìm thấy thành viên');

  const status = input.status ?? 'going';
  const now = new Date().toISOString();
  const res = db
    .prepare(
      `INSERT INTO session_participants
         (session_id, member_id, name, phone, skill_level, status, should_charge, note, created_at, updated_at)
       VALUES (@session_id, @member_id, @name, @phone, @skill_level, @status, @should_charge, @note, @now, @now)`,
    )
    .run({
      session_id: sessionId,
      member_id: member.id,
      name: sanitizeText(member.name),
      phone: member.phone ?? null,
      skill_level: member.skill_level,
      status,
      should_charge: defaultShouldCharge(status),
      note: sanitizeOptional(input.note),
      now,
    });
  return getParticipant(res.lastInsertRowid as number);
}

export function addGuestParticipant(
  sessionId: number,
  input: AddGuestParticipantInput,
): SessionParticipant {
  const db = getDb();
  const session = db
    .prepare('SELECT id FROM sessions WHERE id = ? AND deleted_at IS NULL')
    .get(sessionId) as { id: number } | undefined;
  if (!session) throw notFound('Không tìm thấy buổi đánh');

  const status = input.status ?? 'going';
  const now = new Date().toISOString();
  const res = db
    .prepare(
      `INSERT INTO session_participants
         (session_id, member_id, name, phone, skill_level, status, should_charge, note, created_at, updated_at)
       VALUES (@session_id, NULL, @name, @phone, @skill_level, @status, @should_charge, @note, @now, @now)`,
    )
    .run({
      session_id: sessionId,
      name: sanitizeText(input.name),
      phone: sanitizeOptional(input.phone),
      skill_level: input.skill_level ?? null,
      status,
      should_charge: defaultShouldCharge(status),
      note: sanitizeOptional(input.note),
      now,
    });
  return getParticipant(res.lastInsertRowid as number);
}

export function updateParticipant(id: number, input: UpdateParticipantInput): SessionParticipant {
  getParticipant(id); // throws 404
  const db = getDb();
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = @now'];
  const params: Record<string, unknown> = { id, now };

  if (input.status !== undefined) {
    sets.push('status = @status');
    params.status = input.status;
    // Auto-adjust should_charge if not explicitly overridden
    if (input.should_charge === undefined) {
      sets.push('should_charge = @should_charge');
      params.should_charge = defaultShouldCharge(input.status);
    }
  }
  if (input.should_charge !== undefined) {
    sets.push('should_charge = @should_charge');
    params.should_charge = input.should_charge;
  }
  if ('note' in input) {
    sets.push('note = @note');
    params.note = sanitizeOptional(input.note);
  }

  db.prepare(`UPDATE session_participants SET ${sets.join(', ')} WHERE id = @id`).run(params);
  return getParticipant(id);
}

export function approveParticipant(id: number): SessionParticipant {
  const p = getParticipant(id);
  if (p.status !== 'pending') throw badRequest('Chỉ có thể duyệt người đang ở trạng thái chờ');
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE session_participants SET status = 'going', should_charge = 0, updated_at = ? WHERE id = ?`,
  ).run(now, id);
  return getParticipant(id);
}

export function rejectParticipant(id: number): SessionParticipant {
  const p = getParticipant(id);
  if (p.status !== 'pending') throw badRequest('Chỉ có thể từ chối người đang ở trạng thái chờ');
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE session_participants SET status = 'rejected', should_charge = 0, updated_at = ? WHERE id = ?`,
  ).run(now, id);
  return getParticipant(id);
}

export function deleteParticipant(id: number): void {
  getParticipant(id); // throws 404
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE session_participants SET deleted_at = ?, updated_at = ? WHERE id = ?',
  ).run(now, now, id);
}
