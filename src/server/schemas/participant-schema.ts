import { z } from 'zod';

export const addParticipantFromMemberSchema = z.object({
  member_id: z.number().int().positive(),
  status: z.enum(['going', 'pending']).default('going'),
  note: z.string().max(500).nullish(),
});

export const addGuestParticipantSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().max(20).nullish(),
  skill_level: z.number().int().min(0).max(10).nullish(),
  status: z.enum(['going', 'pending']).default('going'),
  note: z.string().max(500).nullish(),
});

export const updateParticipantSchema = z.object({
  status: z.enum(['pending', 'going', 'attended', 'absent', 'cancelled', 'rejected']).optional(),
  should_charge: z.number().int().min(0).max(1).optional(),
  note: z.string().max(500).nullish(),
});

// Companion entry for proxy registration (đăng ký hộ)
export const companionSchema = z.object({
  name: z.string().min(1).max(100),
  skill_level: z.number().int().min(0).max(10).nullish(),
});

export const publicRegisterSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().max(20).nullish(),
  skill_level: z.number().int().min(0).max(10).nullish(),
  note: z.string().max(500).nullish(),
  // Up to 5 companions; registrant (A) pays for all
  companions: z.array(companionSchema).max(5).optional(),
  // Honeypot field: bots will fill this, humans won't
  website: z.string().max(0).optional(),
});

export type AddParticipantFromMemberInput = z.infer<typeof addParticipantFromMemberSchema>;
export type AddGuestParticipantInput = z.infer<typeof addGuestParticipantSchema>;
export type UpdateParticipantInput = z.infer<typeof updateParticipantSchema>;
export type PublicRegisterInput = z.infer<typeof publicRegisterSchema>;
export type CompanionInput = z.infer<typeof companionSchema>;
