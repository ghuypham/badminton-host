// Shared domain types — contract giữa client và server.
// Tiền luôn là integer VND. Timestamp lưu UTC ISO string.

export type MemberType = 'fixed' | 'guest';
export type MemberStatus = 'active' | 'inactive';

export interface Member {
  id: number;
  name: string;
  phone: string | null;
  member_type: MemberType;
  skill_level: number; // 0–5
  status: MemberStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type SessionStatus = 'draft' | 'open' | 'settled';

export interface Session {
  id: number;
  title: string;
  session_date: string; // ISO date (UTC)
  location: string | null;
  status: SessionStatus;
  public_token: string;
  registration_enabled: 0 | 1;
  manual_total: number | null;
  private_note: string | null;
  split_finalized_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SessionCourt {
  id: number;
  session_id: number;
  name: string;
  start_time: string | null;
  end_time: string | null;
  cost: number; // integer VND
  created_at: string;
  deleted_at: string | null;
}

export type ParticipantStatus = 'pending' | 'going' | 'attended' | 'absent' | 'cancelled' | 'rejected';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'waived' | 'needs_review';

export interface SessionParticipant {
  id: number;
  session_id: number;
  member_id: number | null; // null = guest
  name: string; // snapshot
  phone: string | null; // snapshot
  skill_level: number | null; // snapshot
  status: ParticipantStatus;
  should_charge: 0 | 1;
  note: string | null;
  calculated_amount: number;
  final_amount: number;
  previous_final_amount: number | null;
  payment_status: PaymentStatus;
  paid_amount: number;
  payment_note: string | null;
  bill_token: string | null;
  paid_by: number | null; // FK → session_participants.id; null = pays own bill
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CostItemType = 'shuttle' | 'water' | 'extra' | 'discount';

export interface CostItem {
  id: number;
  session_id: number;
  type: CostItemType;
  label: string | null;
  amount: number; // integer VND, discount âm
  created_at: string;
  deleted_at: string | null;
}

export interface Settings {
  id: string; // 'default'
  club_name: string;
  host_name: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  payment_note_template: string;
  default_rounding: number;
  bank_qr_image_base64: string | null;
  bank_qr_mime: string | null;
  bank_qr_updated_at: string | null;
  updated_at: string;
  // Public report (phase 8)
  public_report_enabled: 0 | 1;
  public_report_token: string | null;
  public_report_show_guests: 0 | 1;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface MeResponse {
  authenticated: boolean;
  username?: string;
}
