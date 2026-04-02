import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(20).optional(),
  avatarUrl: z.string().url().max(512).optional(),
  countryCode: z.string().trim().length(2).optional(),
  regionId: z.coerce.number().int().positive().optional(),
  preferredLanguage: z.enum(['ar', 'en']).optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
