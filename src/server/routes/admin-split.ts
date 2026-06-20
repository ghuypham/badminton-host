// Admin split routes: calculate suggestion + finalize.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/http-error.ts';
import { calculateSplit, finalizeSplit } from '../services/split-service.ts';

export const adminSplitRouter = Router();

// POST /api/admin/split/:sessionId/calculate — returns suggestion, no state change
adminSplitRouter.post(
  '/:sessionId/calculate',
  asyncHandler(async (req, res) => {
    const sessionId = parseInt(req.params.sessionId, 10);
    res.json(calculateSplit(sessionId));
  }),
);

// POST /api/admin/split/:sessionId/finalize — commits final amounts, marks settled
adminSplitRouter.post(
  '/:sessionId/finalize',
  asyncHandler(async (req, res) => {
    const sessionId = parseInt(req.params.sessionId, 10);
    const entriesSchema = z.array(
      z.object({
        participantId: z.number().int().positive(),
        finalAmount: z.number().int().min(0),
      }),
    );
    const entries = entriesSchema.parse(req.body);
    finalizeSplit(sessionId, entries);
    res.json({ ok: true });
  }),
);
