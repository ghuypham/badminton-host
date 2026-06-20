// better-sqlite3 singleton. PRAGMA foreign_keys=ON + WAL + busy_timeout.
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { env } from '../env.ts';

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;

  mkdirSync(dirname(env.databasePath), { recursive: true });
  const db = new Database(env.databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  instance = db;
  return db;
}

// Gọi lúc SIGTERM: checkpoint WAL về main file trước khi exit → tránh mất data.
export function checkpointAndClose(): void {
  if (!instance) return;
  try {
    instance.pragma('wal_checkpoint(TRUNCATE)');
  } catch {
    /* best-effort */
  }
  instance.close();
  instance = null;
}
