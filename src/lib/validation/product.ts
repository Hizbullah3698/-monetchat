
import { z } from 'zod';
import { ProductCondition, ProductStatus } from '@prisma/client';

export const CreateProductSchema = z.object({
  title: z.string().min(3).max(255),
  titleAr: z.string().max(255).optional(),
  description: z.string().min(10).optional(),
  descriptionAr: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().length(3).default('KWD'),
  isNegotiable: z.boolean().default(true),
  categoryId: z.number().int().positive().optional(),
  countryCode: z.string().length(2).default('KW'),
  regionId: z.number().int().positive().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  condition: z.nativeEnum(ProductCondition).default(ProductCondition.good),
  images: z.array(z.object({
    url: z.string().url(),
    s3Key: z.string(),
    isPrimary: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  })).min(1, "At least one image is required"),
});

export const UpdateProductSchema = CreateProductSchema.partial().omit({ images: true }).extend({
  // Images are usually handled separately or as a complete replacement
  images: z.array(z.object({
    id: z.string().uuid().optional(), // Existing images have IDs
    url: z.string().url(),
    s3Key: z.string(),
    isPrimary: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  })).optional(),
});

export const ProductStatusUpdateSchema = z.object({
  status: z.nativeEnum(ProductStatus),
  rejectionReason: z.string().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type ProductStatusUpdateInput = z.infer<typeof ProductStatusUpdateSchema>;
