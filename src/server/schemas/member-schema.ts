import { z } from 'zod';

export const createMemberSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().max(20).nullish(),
  member_type: z.enum(['fixed', 'guest']).default('fixed'),
  skill_level: z.number().int().min(0).max(10).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
  note: z.string().max(500).nullish(),
});

export const updateMemberSchema = createMemberSchema.partial();

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
