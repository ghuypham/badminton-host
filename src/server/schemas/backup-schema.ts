// Zod schema for backup JSON validation (schemaVersion 1).
// auditLogs field tolerated if present or absent (P10 Red Team: CUT audit_logs).
import { z } from 'zod';

const settingsSchema = z.object({
  id: z.string(),
  club_name: z.string(),
  host_name: z.string().nullable(),
  bank_name: z.string().nullable(),
  bank_account_name: z.string().nullable(),
  bank_account_number: z.string().nullable(),
  payment_note_template: z.string(),
  default_rounding: z.number().int(),
  bank_qr_image_base64: z.string().nullable(),
  bank_qr_mime: z.string().nullable(),
  bank_qr_updated_at: z.string().nullable(),
  updated_at: z.string(),
  // Phase 8: public report settings — optional so old backups (pre-v8) still import correctly.
  public_report_enabled: z.number().int().optional(),
  public_report_token: z.string().nullable().optional(),
  public_report_show_guests: z.number().int().optional(),
});

const memberSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  phone: z.string().nullable(),
  member_type: z.enum(['fixed', 'guest']),
  skill_level: z.number().int(),
  status: z.enum(['active', 'inactive']),
  note: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

const sessionSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  session_date: z.string(),
  location: z.string().nullable(),
  status: z.enum(['draft', 'open', 'settled']),
  public_token: z.string(),
  registration_enabled: z.number().int(),
  manual_total: z.number().int().nullable(),
  private_note: z.string().nullable(),
  split_finalized_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

const sessionCourtSchema = z.object({
  id: z.number().int(),
  session_id: z.number().int(),
  name: z.string(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  cost: z.number().int(),
  created_at: z.string(),
  deleted_at: z.string().nullable(),
});

const sessionParticipantSchema = z.object({
  id: z.number().int(),
  session_id: z.number().int(),
  member_id: z.number().int().nullable(),
  name: z.string(),
  phone: z.string().nullable(),
  skill_level: z.number().int().nullable(),
  status: z.enum(['pending', 'going', 'attended', 'absent', 'cancelled', 'rejected']),
  should_charge: z.number().int(),
  note: z.string().nullable(),
  calculated_amount: z.number().int(),
  final_amount: z.number().int(),
  previous_final_amount: z.number().int().nullable(),
  payment_status: z.enum(['unpaid', 'partial', 'paid', 'waived', 'needs_review']),
  paid_amount: z.number().int(),
  payment_note: z.string().nullable(),
  bill_token: z.string().nullable(),
  // paid_by: optional for backward-compat with pre-v7 backups; null = solo payer
  paid_by: z.number().int().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

const costItemSchema = z.object({
  id: z.number().int(),
  session_id: z.number().int(),
  type: z.enum(['shuttle', 'water', 'extra', 'discount']),
  label: z.string().nullable(),
  amount: z.number().int(),
  created_at: z.string(),
  deleted_at: z.string().nullable(),
});

export const backupFileSchema = z.object({
  app: z.literal('badminton-host'),
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  settings: settingsSchema,
  members: z.array(memberSchema),
  sessions: z.array(sessionSchema),
  sessionCourts: z.array(sessionCourtSchema),
  sessionParticipants: z.array(sessionParticipantSchema),
  costItems: z.array(costItemSchema),
  // auditLogs tolerated: ignore if present
  auditLogs: z.array(z.unknown()).optional(),
});

export type BackupFile = z.infer<typeof backupFileSchema>;
