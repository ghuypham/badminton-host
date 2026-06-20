// Admin cost items routes: POST (body.session_id), PUT /:id, DELETE /:id.
// Settled sessions block all writes.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/http-error.ts';
import { createCostItemSchema, updateCostItemSchema } from '../schemas/cost-item-schema.ts';
import { createCostItem, updateCostItem, deleteCostItem } from '../services/cost-service.ts';

export const adminCostItemsRouter = Router();

// POST /api/admin/cost-items
adminCostItemsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const sessionId = z.number().int().positive().parse(req.body.session_id);
    const input = createCostItemSchema.parse(req.body);
    res.status(201).json(createCostItem(sessionId, input));
  }),
);

// PUT /api/admin/cost-items/:id
adminCostItemsRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const input = updateCostItemSchema.parse(req.body);
    res.json(updateCostItem(id, input));
  }),
);

// DELETE /api/admin/cost-items/:id
adminCostItemsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    deleteCostItem(id);
    res.json({ ok: true });
  }),
);
