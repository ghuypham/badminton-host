// Settings service: đọc/ghi single-row id='default' + đổi mật khẩu admin.
import { getDb } from '../db/connection.ts';
import { sanitizeOptional, sanitizeText } from '../utils/sanitize.ts';
import { validateQrImage } from '../utils/validate-image.ts';
import { hashPassword, verifyPassword } from '../auth/password.ts';
import { badRequest, unauthorized } from '../utils/http-error.ts';
import type { UpdateSettingsInput } from '../schemas/settings-schema.ts';
import type { Settings } from '../../shared/types.ts';

export function getSettings(): Settings {
  return getDb().prepare("SELECT * FROM settings WHERE id = 'default'").get() as Settings;
}

export function updateSettings(input: UpdateSettingsInput): Settings {
  const db = getDb();
  const now = new Date().toISOString();

  // QR: clear_qr=true → xóa; base64+mime → validate+set; còn lại → giữ nguyên.
  let qrUpdate = '';
  const qrParams: Record<string, unknown> = {};
  if (input.clear_qr) {
    qrUpdate = ', bank_qr_image_base64=NULL, bank_qr_mime=NULL, bank_qr_updated_at=NULL';
  } else if (input.bank_qr_image_base64 && input.bank_qr_mime) {
    validateQrImage(input.bank_qr_image_base64, input.bank_qr_mime);
    qrUpdate = ', bank_qr_image_base64=@qr, bank_qr_mime=@qrMime, bank_qr_updated_at=@now';
    qrParams.qr = input.bank_qr_image_base64;
    qrParams.qrMime = input.bank_qr_mime;
  }

  db.prepare(
    `UPDATE settings SET
       club_name=@club_name, host_name=@host_name, bank_name=@bank_name,
       bank_account_name=@bank_account_name, bank_account_number=@bank_account_number,
       payment_note_template=@payment_note_template, default_rounding=@default_rounding,
       updated_at=@now${qrUpdate}
     WHERE id='default'`,
  ).run({
    club_name: sanitizeText(input.club_name),
    host_name: sanitizeOptional(input.host_name),
    bank_name: sanitizeOptional(input.bank_name),
    bank_account_name: sanitizeOptional(input.bank_account_name),
    bank_account_number: sanitizeOptional(input.bank_account_number),
    payment_note_template: sanitizeText(input.payment_note_template),
    default_rounding: input.default_rounding,
    now,
    ...qrParams,
  });

  return getSettings();
}

// Đổi mật khẩu admin: verify current → set new (argon2). Nguồn đổi password chính thức.
export async function changeAdminPassword(
  username: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const db = getDb();
  const row = db
    .prepare('SELECT id, password_hash FROM admins WHERE username = ?')
    .get(username) as { id: number; password_hash: string } | undefined;
  if (!row) throw unauthorized();

  const ok = await verifyPassword(row.password_hash, currentPassword);
  if (!ok) throw badRequest('Mật khẩu hiện tại không đúng');

  const hash = await hashPassword(newPassword);
  db.prepare('UPDATE admins SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hash,
    new Date().toISOString(),
    row.id,
  );
}
