// Tests for backup service: export + import round-trip, schema validation.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { runMigrations } from '../db/migrate.ts';
import { exportData, importData } from '../services/backup-service.ts';

// Helper: create fresh in-memory db with schema.
// Migration 002 seeds settings with club_name='CLB Cầu lông'; we update to known value.
function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  // Update seeded settings to a deterministic test value
  db.prepare(
    `UPDATE settings SET club_name = 'Test Club', payment_note_template = '{name} - {date}', updated_at = ? WHERE id = 'default'`,
  ).run(new Date().toISOString());
  return db;
}

// Temp dir for pre-import safety backups (backup() needs a file path)
let tmpBackupsDir: string;

before(() => {
  tmpBackupsDir = join(tmpdir(), `badminton-test-backups-${Date.now()}`);
  mkdirSync(tmpBackupsDir, { recursive: true });
  // Point env to temp dir — backup-service reads env.backupsDir at call time
  process.env.BACKUPS_DIR = tmpBackupsDir;
});

after(() => {
  if (existsSync(tmpBackupsDir)) {
    rmSync(tmpBackupsDir, { recursive: true, force: true });
  }
});

describe('exportData()', () => {
  test('returns correct shape with app + schemaVersion', () => {
    const db = createTestDb();
    const result = exportData(db, new Date().toISOString());
    assert.equal(result.app, 'badminton-host');
    assert.equal(result.schemaVersion, 1);
    assert.ok(typeof result.exportedAt === 'string');
    assert.ok(Array.isArray(result.members));
    assert.ok(Array.isArray(result.sessions));
    assert.ok(Array.isArray(result.sessionCourts));
    assert.ok(Array.isArray(result.sessionParticipants));
    assert.ok(Array.isArray(result.costItems));
    db.close();
  });

  test('includes QR fields from settings', () => {
    const db = createTestDb();
    const qrBase64 = 'data:image/png;base64,iVBORw0KGgo=';
    db.prepare(
      `UPDATE settings SET bank_qr_image_base64 = ?, bank_qr_mime = 'image/png' WHERE id = 'default'`,
    ).run(qrBase64);

    const result = exportData(db, new Date().toISOString());
    assert.equal(result.settings.bank_qr_image_base64, qrBase64);
    assert.equal(result.settings.bank_qr_mime, 'image/png');
    db.close();
  });
});

describe('importData()', () => {
  test('round-trip: export → import into fresh db restores data', async () => {
    const sourceDb = createTestDb();

    // Insert a member
    const now = new Date().toISOString();
    sourceDb.prepare(
      `INSERT INTO members (name, phone, member_type, skill_level, status, note, created_at, updated_at)
       VALUES ('Nguyễn A', '0901234567', 'fixed', 3, 'active', NULL, ?, ?)`,
    ).run(now, now);

    const exported = exportData(sourceDb, now);
    sourceDb.close();

    // Import into fresh db (settings will be overwritten by importData)
    const targetDb = createTestDb();
    await importData(targetDb, exported);

    const members = targetDb.prepare('SELECT * FROM members').all() as Array<{ name: string }>;
    assert.equal(members.length, 1);
    assert.equal(members[0].name, 'Nguyễn A');

    const settings = targetDb
      .prepare("SELECT * FROM settings WHERE id = 'default'")
      .get() as { club_name: string } | undefined;
    assert.ok(settings);
    assert.equal(settings.club_name, 'Test Club');

    targetDb.close();
  });

  test('rejects bad schemaVersion', async () => {
    const badBackup = {
      app: 'badminton-host',
      schemaVersion: 99, // unsupported
      exportedAt: new Date().toISOString(),
      settings: {},
      members: [],
      sessions: [],
      sessionCourts: [],
      sessionParticipants: [],
      costItems: [],
    };

    const db = createTestDb();
    await assert.rejects(
      () => importData(db, badBackup),
      (err: Error) => {
        assert.ok(err.message.includes('backup') || err.message.includes('Schema') || err.message.includes('schemaVersion') || err.message.includes('invalid') || err.message.length > 0);
        return true;
      },
    );
    db.close();
  });

  test('rejects wrong app field', async () => {
    const db = createTestDb();
    const exported = exportData(db, new Date().toISOString());
    const badBackup = { ...exported, app: 'wrong-app' as 'badminton-host' };

    await assert.rejects(() => importData(db, badBackup));
    db.close();
  });

  test('admins table untouched after import', async () => {
    const db = createTestDb();
    // Admins table should exist with no rows from migrations (seeded at boot, not here)
    const adminsBefore = db.prepare('SELECT COUNT(*) as cnt FROM admins').get() as { cnt: number };

    const exported = exportData(db, new Date().toISOString());
    await importData(db, exported);

    const adminsAfter = db.prepare('SELECT COUNT(*) as cnt FROM admins').get() as { cnt: number };
    assert.equal(adminsBefore.cnt, adminsAfter.cnt, 'admins table must not be touched by import');
    db.close();
  });
});
