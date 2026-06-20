import { z } from 'zod';

export const createSessionSchema = z.object({
  title: z.string().min(1).max(200),
  session_date: z.string().min(1).max(30), // ISO date string
  location: z.string().max(200).nullish(),
  private_note: z.string().max(500).nullish(),
  registration_enabled: z.number().int().min(0).max(1).default(0),
});

export const updateSessionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  session_date: z.string().min(1).max(30).optional(),
  location: z.string().max(200).nullish(),
  private_note: z.string().max(500).nullish(),
  status: z.enum(['draft', 'open', 'settled']).optional(),
  registration_enabled: z.number().int().min(0).max(1).optional(),
  manual_total: z.number().int().nullable().optional(),
});

export const createCourtSchema = z.object({
  name: z.string().min(1).max(100),
  start_time: z.string().max(10).nullish(),
  end_time: z.string().max(10).nullish(),
  cost: z.number().int().min(0),
});

export const updateCourtSchema = createCourtSchema.partial();

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type CreateCourtInput = z.infer<typeof createCourtSchema>;
export type UpdateCourtInput = z.infer<typeof updateCourtSchema>;
