
import { z } from 'zod';

export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8).max(100),
    name: z.string().min(2).max(50).optional(),
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const productSchema = z.object({
    title: z.string().min(3).max(100),
    description: z.string().max(2000),
    price: z.number().min(0),
    category: z.string(),
    condition: z.string(),
    images: z.array(z.object({ url: z.string(), isPrimary: z.boolean().optional() })).max(10),
});

export const messageSchema = z.object({
    content: z.string().min(1).max(1000),
});

export const reviewSchema = z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().max(500).optional(),
});
