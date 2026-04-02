import { z } from 'zod';

export const createInquirySchema = z.object({
  productId: z.string().uuid(),
  message: z.string().trim().max(1000).optional(),
});

export const inquiryStatusSchema = z.enum(['open', 'responded', 'closed']);

export const sellerUpdateInquirySchema = z.object({
  status: inquiryStatusSchema,
});
