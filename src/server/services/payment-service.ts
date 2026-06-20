// Payment update service: paid/partial/waived/unpaid transitions.
import { getDb } from '../db/connection.ts';
import { badRequest } from '../utils/http-error.ts';
import { getParticipant } from './participant-service.ts';
import type { SessionParticipant, PaymentStatus } from '../../shared/types.ts';

export interface UpdatePaymentInput {
  payment_status: PaymentStatus;
  paid_amount?: number;
  payment_note?: string | null;
}

export function updatePayment(participantId: number, input: UpdatePaymentInput): SessionParticipant {
  const participant = getParticipant(participantId);
  const db = getDb();
  const now = new Date().toISOString();

  let paidAmount: number;

  switch (input.payment_status) {
    case 'paid':
      paidAmount = participant.final_amount;
      break;
    case 'partial':
      if (input.paid_amount === undefined || input.paid_amount === null) {
        throw badRequest('Cần nhập số tiền đã thanh toán cho trạng thái partial');
      }
      if (input.paid_amount <= 0) throw badRequest('Số tiền phải lớn hơn 0');
      if (input.paid_amount >= participant.final_amount) {
        throw badRequest('Số tiền partial phải nhỏ hơn tổng tiền, dùng paid cho thanh toán đủ');
      }
      paidAmount = input.paid_amount;
      break;
    case 'waived':
      paidAmount = participant.final_amount; // waived = remaining = 0
      break;
    case 'unpaid':
      paidAmount = 0;
      break;
    case 'needs_review':
      // Admin can manually set needs_review
      paidAmount = input.paid_amount ?? participant.paid_amount;
      break;
    default:
      throw badRequest('Trạng thái thanh toán không hợp lệ');
  }

  db.prepare(
    `UPDATE session_participants
     SET payment_status = @payment_status, paid_amount = @paid_amount,
         payment_note = @payment_note, updated_at = @now
     WHERE id = @id`,
  ).run({
    payment_status: input.payment_status,
    paid_amount: paidAmount,
    payment_note: input.payment_note ?? null,
    now,
    id: participantId,
  });

  return getParticipant(participantId);
}
