// Admin reports router: GET / returns aggregated stats { finance, sessions, members, payments }.
// Query params: from?, to? (ISO date strings yyyy-mm-dd) — both optional.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/http-error.ts';
import { getReport } from '../services/reports-service.ts';

export const adminReportsRouter = Router();

const dateFilterSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'from phải là yyyy-mm-dd').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'to phải là yyyy-mm-dd').optional(),
});

// GET /api/admin/reports?from=yyyy-mm-dd&to=yyyy-mm-dd
adminReportsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = dateFilterSchema.parse(req.query);
    res.json(getReport(filter));
  }),
);
