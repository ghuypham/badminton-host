// Admin members routes: CRUD + history.
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/http-error.ts';
import { createMemberSchema, updateMemberSchema } from '../schemas/member-schema.ts';
import {
  listMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
  getMemberHistory,
} from '../services/member-service.ts';

export const adminMembersRouter = Router();

// GET /api/admin/members?search=&member_type=&skill_level=
adminMembersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const querySchema = z.object({
      search: z.string().optional(),
      member_type: z.enum(['fixed', 'guest']).optional(),
      skill_level: z.coerce.number().int().min(0).max(5).optional(),
    });
    const query = querySchema.parse(req.query);
    res.json(listMembers(query));
  }),
);

// POST /api/admin/members
adminMembersRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = createMemberSchema.parse(req.body);
    res.status(201).json(createMember(input));
  }),
);

// GET /api/admin/members/:id
adminMembersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    res.json(getMember(id));
  }),
);

// PUT /api/admin/members/:id
adminMembersRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const input = updateMemberSchema.parse(req.body);
    res.json(updateMember(id, input));
  }),
);

// DELETE /api/admin/members/:id (soft delete)
adminMembersRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    deleteMember(id);
    res.json({ ok: true });
  }),
);

// GET /api/admin/members/:id/history
adminMembersRouter.get(
  '/:id/history',
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    res.json(getMemberHistory(id));
  }),
);
