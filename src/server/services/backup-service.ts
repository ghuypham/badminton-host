// Backup service: export full DB snapshot + import with pre-import safety backup.
// Preserves all IDs/tokens; NEVER touches admins table.
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { backupFileSchema, type BackupFile } from '../schemas/backup-schema.ts';
import { badRequest } from '../utils/http-error.ts';
import { env } from '../env.ts';

export function exportData(db: Database.Database, exportedAt: string): BackupFile {
  const settings = db.prepare("SELECT * FROM settings WHERE id = 'default'").get();
  const members = db.prepare('SELECT * FROM members').all();
  const sessions = db.prepare('SELECT * FROM sessions').all();
  const sessionCourts = db.prepare('SELECT * FROM session_courts').all();
  const sessionParticipants = db.prepare('SELECT * FROM session_participants').all();
  const costItems = db.prepare('SELECT * FROM cost_items').all();

  return {
    app: 'badminton-host',
    schemaVersion: 1,
    exportedAt,
    settings: settings as BackupFile['settings'],
    members: members as BackupFile['members'],
    sessions: sessions as BackupFile['sessions'],
    sessionCourts: sessionCourts as BackupFile['sessionCourts'],
    sessionParticipants: sessionParticipants as BackupFile['sessionParticipants'],
    costItems: costItems as BackupFile['costItems'],
  };
}

export async function importData(db: Database.Database, rawJson: unknown): Promise<void> {
  // Validate schema first before any destructive ops
  const parsed = backupFileSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw badRequest(`Backup không hợp lệ: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
  }
  const data = parsed.data;

  if (data.app !== 'badminton-host') throw badRequest('Backup không đúng ứng dụng');
  if (data.schemaVersion !== 1) throw badRequest('Schema version không được hỗ trợ');

  // Create safety backup of current DB before destructive import
  const backupsDir = env.backupsDir;
  mkdirSync(backupsDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const safetyPath = join(backupsDir, `pre-import-${ts}.sqlite`);

  // better-sqlite3 .backup() is async-capable; use callback form for safety
  await db.backup(safetyPath);

  // Perform import in a transaction: clear all tables except admins, insert from backup
  db.transaction(() => {
    // Delete order respects FK constraints (cascade should handle most, but explicit is safer)
    db.prepare('DELETE FROM cost_items').run();
    db.prepare('DELETE FROM session_participants').run();
    db.prepare('DELETE FROM session_courts').run();
    db.prepare('DELETE FROM sessions').run();
    db.prepare('DELETE FROM members').run();
    db.prepare("DELETE FROM settings WHERE id != 'placeholder_that_never_exists'").run();

    // Insert settings
    const s = data.settings;
    db.prepare(
      `INSERT OR REPLACE INTO settings
         (id, club_name, host_name, bank_name, bank_account_name, bank_account_number,
          payment_note_template, default_rounding, bank_qr_image_base64, bank_qr_mime,
          bank_qr_updated_at, updated_at)
       VALUES (@id, @club_name, @host_name, @bank_name, @bank_account_name, @bank_account_number,
               @payment_note_template, @default_rounding, @bank_qr_image_base64, @bank_qr_mime,
               @bank_qr_updated_at, @updated_at)`,
    ).run(s);

    // Insert members
    const insertMember = db.prepare(
      `INSERT INTO members (id, name, phone, member_type, skill_level, status, note, created_at, updated_at, deleted_at)
       VALUES (@id, @name, @phone, @member_type, @skill_level, @status, @note, @created_at, @updated_at, @deleted_at)`,
    );
    for (const m of data.members) insertMember.run(m);

    // Insert sessions
    const insertSession = db.prepare(
      `INSERT INTO sessions (id, title, session_date, location, status, public_token, registration_enabled,
         manual_total, private_note, split_finalized_at, created_at, updated_at, deleted_at)
       VALUES (@id, @title, @session_date, @location, @status, @public_token, @registration_enabled,
               @manual_total, @private_note, @split_finalized_at, @created_at, @updated_at, @deleted_at)`,
    );
    for (const sess of data.sessions) insertSession.run(sess);

    // Insert session_courts
    const insertCourt = db.prepare(
      `INSERT INTO session_courts (id, session_id, name, start_time, end_time, cost, created_at, deleted_at)
       VALUES (@id, @session_id, @name, @start_time, @end_time, @cost, @created_at, @deleted_at)`,
    );
    for (const c of data.sessionCourts) insertCourt.run(c);

    // Insert session_participants
    // paid_by is optional (absent in pre-v7 backups) — default to NULL when missing.
    // Two-pass insert: first pass inserts payers (paid_by IS NULL), second pass inserts
    // followers (paid_by NOT NULL) so the FK reference is satisfied.
    const insertParticipant = db.prepare(
      `INSERT INTO session_participants
         (id, session_id, member_id, name, phone, skill_level, status, should_charge, note,
          calculated_amount, final_amount, previous_final_amount, payment_status, paid_amount,
          payment_note, bill_token, paid_by, created_at, updated_at, deleted_at)
       VALUES (@id, @session_id, @member_id, @name, @phone, @skill_level, @status, @should_charge, @note,
               @calculated_amount, @final_amount, @previous_final_amount, @payment_status, @paid_amount,
               @payment_note, @bill_token, @paid_by, @created_at, @updated_at, @deleted_at)`,
    );
    // Pass 1: payers / solo participants (paid_by null or absent)
    for (const p of data.sessionParticipants) {
      const paidBy = (p as { paid_by?: number | null }).paid_by ?? null;
      if (paidBy === null) insertParticipant.run({ ...p, paid_by: null });
    }
    // Pass 2: followers (paid_by set) — FK target already inserted
    for (const p of data.sessionParticipants) {
      const paidBy = (p as { paid_by?: number | null }).paid_by ?? null;
      if (paidBy !== null) insertParticipant.run({ ...p, paid_by: paidBy });
    }

    // Insert cost_items
    const insertCostItem = db.prepare(
      `INSERT INTO cost_items (id, session_id, type, label, amount, created_at, deleted_at)
       VALUES (@id, @session_id, @type, @label, @amount, @created_at, @deleted_at)`,
    );
    for (const ci of data.costItems) insertCostItem.run(ci);
  })();

  // Prune CHỈ sau khi import thành công → không bao giờ xóa nhầm safety backup vừa tạo.
  pruneOldBackups(backupsDir, env.maxBackups);
}

// Keep only the newest maxBackups files in backupsDir, delete older ones.
function pruneOldBackups(dir: string, maxKeep: number): void {
  try {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sqlite'))
      .map((f) => ({ name: f, path: join(dir, f) }))
      .sort((a, b) => a.name.localeCompare(b.name)); // lexicographic = chronological for our naming

    while (files.length > maxKeep) {
      const oldest = files.shift();
      if (oldest) {
        try { rmSync(oldest.path); } catch { /* best effort */ }
      }
    }
  } catch {
    /* best effort: don't fail import due to prune errors */
  }
}
