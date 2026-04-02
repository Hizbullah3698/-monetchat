import { z } from 'zod';

export const createOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive().max(10).default(1),
});

export const listOrderQuerySchema = z.object({
  status: z.enum(['draft', 'pending_payment', 'paid', 'canceled', 'expired']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
