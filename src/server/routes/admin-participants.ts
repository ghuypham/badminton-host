// Admin participants routes: add/edit/delete + approve/reject + payment + bill-link.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/http-error.ts';
import {
  addParticipantFromMemberSchema,
  addGuestParticipantSchema,
  updateParticipantSchema,
} from '../schemas/participant-schema.ts';
import {
  addParticipantFromMember,
  addGuestParticipant,
  updateParticipant,
  approveParticipant,
  rejectParticipant,
  deleteParticipant,
  approveGroupByPayer,
  rejectGroupByPayer,
  deleteGroupByPayer,
  getParticipant,
} from '../services/participant-service.ts';
import { updatePayment } from '../services/payment-service.ts';
import { env } from '../env.ts';

export const adminParticipantsRouter = Router();

const paymentUpdateSchema = z.object({
  payment_status: z.enum(['unpaid', 'partial', 'paid', 'waived', 'needs_review']),
  paid_amount: z.number().int().min(0).optional(),
  payment_note: z.string().max(500).nullish(),
});

// POST /api/admin/participants — add from member or guest
adminParticipantsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const sessionId = z.number().int().positive().parse(body.session_id);

    if (body.member_id !== undefined) {
      const input = addParticipantFromMemberSchema.parse(body);
      return res.status(201).json(addParticipantFromMember(sessionId, input));
    }
    // Guest: no member_id
    const input = addGuestParticipantSchema.parse(body);
    return res.status(201).json(addGuestParticipant(sessionId, input));
  }),
);

// PUT /api/admin/participants/:id
adminParticipantsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const input = updateParticipantSchema.parse(req.body);
    res.json(updateParticipant(id, input));
  }),
);

// DELETE /api/admin/participants/:id (soft)
// If ?group=1 and participant is a payer, also deletes all followers (paid_by = id).
adminParticipantsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (req.query.group === '1') {
      deleteGroupByPayer(id);
    } else {
      deleteParticipant(id);
    }
    res.json({ ok: true });
  }),
);

// POST /api/admin/participants/:id/approve
// If ?group=1 and participant is a payer, atomically approves all pending followers too.
adminParticipantsRouter.post(
  '/:id/approve',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (req.query.group === '1') {
      approveGroupByPayer(id);
      res.json({ ok: true });
    } else {
      res.json(approveParticipant(id));
    }
  }),
);

// POST /api/admin/participants/:id/reject
// If ?group=1 and participant is a payer, also rejects all pending followers (paid_by = id).
adminParticipantsRouter.post(
  '/:id/reject',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (req.query.group === '1') {
      rejectGroupByPayer(id);
      res.json({ ok: true });
    } else {
      res.json(rejectParticipant(id));
    }
  }),
);

// PUT /api/admin/participants/:id/payment
adminParticipantsRouter.put(
  '/:id/payment',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const input = paymentUpdateSchema.parse(req.body);
    res.json(
      updatePayment(id, {
        payment_status: input.payment_status,
        paid_amount: input.paid_amount,
        payment_note: input.payment_note ?? undefined,
      }),
    );
  }),
);

// GET /api/admin/participants/:id/bill-link
adminParticipantsRouter.get(
  '/:id/bill-link',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const participant = getParticipant(id);
    const token = participant.bill_token;
    if (!token) {
      return res.json({ billUrl: null });
    }
    const path = `/b/${token}`;
    const billUrl = env.appBaseUrl ? `${env.appBaseUrl}${path}` : path;
    return res.json({ billUrl });
  }),
);
