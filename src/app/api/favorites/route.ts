import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';
import { z } from 'zod';

const listQuerySchema = paginationSchema.extend({
  country: z.string().optional(),
});

// GET /api/favorites - list current user's favorites
export const GET = createApiHandler(async (_req, { query, user }) => {
  const { skip, take } = getPaginationParams(query);

  const where = {
    userId: user!.userId,
    product: { status: 'active', deletedAt: null },
  };

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        product: {
          include: {
            images: {
              where: { isPrimary: true },
              orderBy: { sortOrder: 'asc' },
              take: 1,
            },
            category: { select: { slug: true, name: true, nameAr: true } },
            seller: {
              select: {
                businessName: true,
                rating: true,
                isVerified: true,
                user: { select: { name: true, avatarUrl: true } },
              },
            },
            region: { select: { name: true, nameAr: true } },
          },
        },
      },
    }),
    prisma.favorite.count({ where }),
  ]);

  const data = favorites.map((f) => {
    const p = f.product;
    return {
      favoriteId: f.id,
      productId: p.id,
      favoritedAt: f.createdAt,
      product: {
        id: p.id,
        title: p.title,
        titleAr: p.titleAr,
        price: p.price,
        currency: p.currency,
        isNegotiable: p.isNegotiable,
        condition: p.condition,
        imageUrl: p.images[0]?.url ?? null,
        category: p.category,
        region: p.region,
        seller: {
          name: p.seller.businessName || p.seller.user.name,
          avatarUrl: p.seller.user.avatarUrl,
          rating: p.seller.rating,
          isVerified: p.seller.isVerified,
        },
        createdAt: p.createdAt,
      },
    };
  });

  return formatPaginatedResponse(data, total, query);
}, { requireAuth: true, querySchema: listQuerySchema });
