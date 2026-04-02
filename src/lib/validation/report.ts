import { z } from 'zod';

export const createReportSchema = z.object({
  targetType: z.enum(['product', 'seller']),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(3).max(100),
  notes: z.string().trim().max(1000).optional(),
});

export const updateReportStatusSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'dismissed']),
  notes: z.string().trim().max(1000).optional(),
});
