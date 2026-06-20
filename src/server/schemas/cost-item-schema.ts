import { z } from 'zod';

export const createCostItemSchema = z.object({
  type: z.enum(['shuttle', 'water', 'extra', 'discount']),
  label: z.string().max(200).nullish(),
  amount: z.number().int(), // discount có thể âm
});

export const updateCostItemSchema = createCostItemSchema.partial();

export type CreateCostItemInput = z.infer<typeof createCostItemSchema>;
export type UpdateCostItemInput = z.infer<typeof updateCostItemSchema>;
