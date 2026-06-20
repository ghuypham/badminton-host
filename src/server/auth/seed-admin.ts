// Seed admin từ env nếu bảng admins rỗng. Fail-fast chỉ khi ADMIN_PASSWORD rỗng.
import type Database from 'better-sqlite3';
import { env } from '../env.ts';
import { hashPassword } from './password.ts';

export async function seedAdmin(db: Database.Database): Promise<void> {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM admins').get() as { n: number }).n;
  if (count > 0) return;

  const password = env.adminPassword; // getter → throw nếu rỗng
  const hash = await hashPassword(password);
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO admins (username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)',
  ).run(env.adminUsername, hash, now, now);
  console.log(`[seed] created admin "${env.adminUsername}"`);
}
