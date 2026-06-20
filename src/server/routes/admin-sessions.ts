// Admin sessions routes: CRUD + courts + toggle registration + detail view + home stats.
// IMPORTANT: GET /home-stats MUST be declared before GET /:id to avoid param capture.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/http-error.ts';
import { createSessionSchema, updateSessionSchema, createCourtSchema, updateCourtSchema } from '../schemas/session-schema.ts';
import {
  listSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  listCourts,
  createCourt,
  updateCourt,
  deleteCourt,
  getHomeStats,
} from '../services/session-service.ts';
import { listParticipants } from '../services/participant-service.ts';
import { listCostItems, computeSessionTotal } from '../services/cost-service.ts';

export const adminSessionsRouter = Router();

// GET /api/admin/sessions/home-stats — MUST be before /:id
adminSessionsRouter.get('/home-stats', (_req, res) => {
  res.json(getHomeStats());
});

// GET /api/admin/sessions?status=
adminSessionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = z.object({ status: z.string().optional() }).parse(req.query);
    res.json(listSessions(q));
  }),
);

// POST /api/admin/sessions
adminSessionsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createSessionSchema.parse(req.body);
    res.status(201).json(createSession(input));
  }),
);

// GET /api/admin/sessions/:id — full detail: session + courts + participants + cost items + totals
adminSessionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const session = getSession(id);
    const courts = listCourts(id);
    const participants = listParticipants(id);
    const costItems = listCostItems(id);
    const total = computeSessionTotal(session);

    // Split summary: chargeable count + amounts
    const chargeable = participants.filter((p) => p.should_charge === 1);
    const splitSummary = {
      chargeableCount: chargeable.length,
      totalAmount: total,
      settledCount: chargeable.filter((p) =>
        p.payment_status === 'paid' || p.payment_status === 'waived',
      ).length,
      pendingPaymentCount: chargeable.filter((p) =>
        p.payment_status === 'unpaid' || p.payment_status === 'partial',
      ).length,
    };

    res.json({ session, courts, participants, costItems, total, splitSummary });
  }),
);

// PUT /api/admin/sessions/:id
adminSessionsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const input = updateSessionSchema.parse(req.body);
    res.json(updateSession(id, input));
  }),
);

// DELETE /api/admin/sessions/:id (soft delete)
adminSessionsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    deleteSession(id);
    res.json({ ok: true });
  }),
);

// PUT /api/admin/sessions/:id/registration
adminSessionsRouter.put(
  '/:id/registration',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { enabled } = z.object({ enabled: z.number().int().min(0).max(1) }).parse(req.body);
    res.json(updateSession(id, { registration_enabled: enabled }));
  }),
);

// POST /api/admin/sessions/:sessionId/courts
adminSessionsRouter.post(
  '/:sessionId/courts',
  asyncHandler(async (req, res) => {
    const sessionId = parseInt(req.params.sessionId, 10);
    const input = createCourtSchema.parse(req.body);
    res.status(201).json(createCourt(sessionId, input));
  }),
);

// PUT /api/admin/sessions/:sessionId/courts/:courtId
adminSessionsRouter.put(
  '/:sessionId/courts/:courtId',
  asyncHandler(async (req, res) => {
    const sessionId = parseInt(req.params.sessionId, 10);
    const courtId = parseInt(req.params.courtId, 10);
    const input = updateCourtSchema.parse(req.body);
    res.json(updateCourt(sessionId, courtId, input));
  }),
);

// DELETE /api/admin/sessions/:sessionId/courts/:courtId
adminSessionsRouter.delete(
  '/:sessionId/courts/:courtId',
  asyncHandler(async (req, res) => {
    const sessionId = parseInt(req.params.sessionId, 10);
    const courtId = parseInt(req.params.courtId, 10);
    deleteCourt(sessionId, courtId);
    res.json({ ok: true });
  }),
);
