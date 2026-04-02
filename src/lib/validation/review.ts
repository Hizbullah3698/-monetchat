import { z } from 'zod';

export const createReviewSchema = z.object({
  targetType: z.enum(['product', 'seller']).default('product'),
  targetId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const listReviewQuerySchema = z.object({
  targetType: z.enum(['product', 'seller']),
  targetId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
