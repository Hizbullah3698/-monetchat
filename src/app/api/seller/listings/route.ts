// Seller Listings API - Prisma-based
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { ProductStatus } from '@prisma/client';

const querySchema = z.object({
  status: z.nativeEnum(ProductStatus).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['updated', 'created']).default('updated'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const GET = createApiHandler(async (_request, { query, user }) => {
    const { status, q, sort, order } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Ensure seller exists
    const seller = await prisma.seller.findUnique({
      where: { userId: user!.userId },
      select: { userId: true },
    });
    if (!seller) {
      return {
        products: [],
        meta: { pagination: { page, limit, total: 0, totalPages: 0 } },
      };
    }

    const where: any = { sellerId: user!.userId, deletedAt: null };
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy = sort === 'created' ? { createdAt: order } : { updatedAt: order };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
          category: { select: { name: true, nameAr: true, slug: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const data = items.map((p) => ({
      id: p.id,
      title: p.title,
      titleAr: p.titleAr,
      price: Number(p.price),
      currency: p.currency,
      status: p.status,
      condition: p.condition,
      imageUrl: p.images[0]?.url || null,
      category: p.category,
      viewCount: p.viewCount,
      contactCount: p.contactCount,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return {
      products: data,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
}, { requireAuth: true, querySchema });
