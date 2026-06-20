// Bill view service: reads participant snapshot, NEVER recomputes from costs.
// Returns session info + amount/status + bank info + rendered payment note.
import { getDb } from '../db/connection.ts';
import { notFound } from '../utils/http-error.ts';
import { renderNote } from '../utils/render-note.ts';
import type { SessionParticipant, Session, Settings } from '../../shared/types.ts';

export interface BillView {
  participant: Pick<
    SessionParticipant,
    | 'id'
    | 'name'
    | 'phone'
    | 'final_amount'
    | 'paid_amount'
    | 'payment_status'
    | 'bill_token'
    | 'payment_note'
  >;
  remaining: number;
  session: Pick<Session, 'id' | 'title' | 'session_date' | 'location' | 'status'>;
  bank: {
    bank_name: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
    bank_qr_image_base64: string | null;
    bank_qr_mime: string | null;
  };
  renderedNote: string;
}

export function getBillByToken(token: string): BillView {
  const db = getDb();

  const participant = db
    .prepare(
      `SELECT id, session_id, name, phone, final_amount, paid_amount,
              payment_status, bill_token, payment_note
       FROM session_participants
       WHERE bill_token = ? AND deleted_at IS NULL`,
    )
    .get(token) as
    | (Pick<
        SessionParticipant,
        'id' | 'name' | 'phone' | 'final_amount' | 'paid_amount' | 'payment_status' | 'bill_token' | 'payment_note'
      > & { session_id: number })
    | undefined;

  if (!participant) throw notFound('Không tìm thấy hóa đơn');

  const session = db
    .prepare('SELECT id, title, session_date, location, status FROM sessions WHERE id = ? AND deleted_at IS NULL')
    .get(participant.session_id) as
    | Pick<Session, 'id' | 'title' | 'session_date' | 'location' | 'status'>
    | undefined;

  if (!session) throw notFound('Không tìm thấy buổi đánh');

  const settings = db
    .prepare(
      `SELECT bank_name, bank_account_name, bank_account_number,
              bank_qr_image_base64, bank_qr_mime, payment_note_template
       FROM settings WHERE id = 'default'`,
    )
    .get() as
    | (Pick<Settings, 'bank_name' | 'bank_account_name' | 'bank_account_number' | 'bank_qr_image_base64' | 'bank_qr_mime'> & {
        payment_note_template: string;
      })
    | undefined;

  const remaining = Math.max(participant.final_amount - participant.paid_amount, 0);
  const renderedNote = settings
    ? renderNote(settings.payment_note_template, {
        date: session.session_date,
        name: participant.name,
      })
    : '';

  const { session_id: _sid, ...participantData } = participant;

  return {
    participant: participantData,
    remaining,
    session,
    bank: {
      bank_name: settings?.bank_name ?? null,
      bank_account_name: settings?.bank_account_name ?? null,
      bank_account_number: settings?.bank_account_number ?? null,
      bank_qr_image_base64: settings?.bank_qr_image_base64 ?? null,
      bank_qr_mime: settings?.bank_qr_mime ?? null,
    },
    renderedNote,
  };
}
