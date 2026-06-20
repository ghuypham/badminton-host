// Đọc + validate env một lần lúc boot. Fail-fast nếu thiếu biến bắt buộc.
import { existsSync, readFileSync } from 'node:fs';

// Tự load .env (tsx không tự load). Không override biến đã set sẵn.
function loadDotEnv(path = '.env'): void {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnv();

function required(name: string): string {
  const v = process.env[name];
  if (v === undefined || v.trim() === '') {
    throw new Error(`[env] Missing required env var: ${name}`);
  }
  return v;
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v.trim() === '' ? fallback : v;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v.trim() === '') return fallback;
  return v === '1' || v.toLowerCase() === 'true';
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3000'), 10),
  databasePath: optional('DATABASE_PATH', './data/badminton.sqlite'),
  backupsDir: optional('BACKUPS_DIR', './data/backups'),
  // Auth — ADMIN_PASSWORD bắt buộc, chỉ fail nếu rỗng (không enforce độ mạnh).
  adminUsername: optional('ADMIN_USERNAME', 'admin'),
  get adminPassword() {
    return required('ADMIN_PASSWORD');
  },
  sessionSecret: required('SESSION_SECRET'),
  cookieSecure: bool('COOKIE_SECURE', false),
  trustProxy: bool('TRUST_PROXY', false),
  appBaseUrl: optional('APP_BASE_URL', ''),
  maxBackups: parseInt(optional('MAX_BACKUPS', '10'), 10),
  get isProd() {
    return this.nodeEnv === 'production';
  },
};
