// Admin debts router: GET / returns debts grouped by member + needs_review group.
import { Router } from 'express';
import { asyncHandler } from '../utils/http-error.ts';
import { listDebts } from '../services/debt-service.ts';

export const adminDebtsRouter = Router();

// GET /api/admin/debts
adminDebtsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(listDebts());
  }),
);
