// Public bills route: GET /:token — bill view (snapshot only, no recompute).
// Uniform 404 on bad/missing token.
import { Router } from 'express';
import { asyncHandler, notFound } from '../utils/http-error.ts';
import { getBillByToken } from '../services/bill-view-service.ts';

export const publicBillsRouter = Router();

// GET /api/public/bills/:token
publicBillsRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    if (!token) throw notFound();

    try {
      const bill = getBillByToken(token);
      res.json(bill);
    } catch {
      throw notFound(); // uniform 404 for any lookup failure
    }
  }),
);
