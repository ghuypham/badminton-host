// Admin payments router: GET summary per session grouped by payment_status.
// Actual payment mutation lives on admin-participants PUT /:id/payment.
import { Router } from 'express';
import { asyncHandler } from '../utils/http-error.ts';
import { getDb } from '../db/connection.ts';
import { getSession } from '../services/session-service.ts';

export const adminPaymentsRouter = Router();

// GET /api/admin/payments/:sessionId — participants grouped by payment_status
adminPaymentsRouter.get(
  '/:sessionId',
  asyncHandler(async (req, res) => {
    const sessionId = parseInt(req.params.sessionId, 10);
    getSession(sessionId); // throws 404 if not found

    const rows = getDb()
      .prepare(
        `SELECT id, name, phone, should_charge, payment_status,
                final_amount, paid_amount, bill_token, payment_note
         FROM session_participants
         WHERE session_id = ? AND deleted_at IS NULL
         ORDER BY payment_status, name`,
      )
      .all(sessionId) as Array<{
      id: number;
      name: string;
      phone: string | null;
      should_charge: number;
      payment_status: string;
      final_amount: number;
      paid_amount: number;
      bill_token: string | null;
      payment_note: string | null;
    }>;

    // Group by payment_status
    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      if (!grouped[row.payment_status]) grouped[row.payment_status] = [];
      grouped[row.payment_status].push(row);
    }

    res.json({ sessionId, grouped });
  }),
);
