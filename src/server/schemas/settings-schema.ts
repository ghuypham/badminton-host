import { z } from 'zod';

// PUT settings — max-length ở boundary (Red Team High#6).
export const updateSettingsSchema = z.object({
  club_name: z.string().min(1).max(120),
  host_name: z.string().max(120).nullish(),
  bank_name: z.string().max(120).nullish(),
  bank_account_name: z.string().max(120).nullish(),
  bank_account_number: z.string().max(32).nullish(),
  payment_note_template: z.string().min(1).max(200),
  default_rounding: z.number().int().min(0).max(1_000_000),
  // QR: gửi base64+mime để set/replace; clear_qr=true để xóa; bỏ trống = giữ nguyên.
  bank_qr_image_base64: z.string().nullish(),
  bank_qr_mime: z.string().max(50).nullish(),
  clear_qr: z.boolean().optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(200),
  new_password: z.string().min(1).max(200),
});
