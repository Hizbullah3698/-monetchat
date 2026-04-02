import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { formatPaginatedResponse, getPaginationParams, paginationSchema } from '@/lib/api/pagination';
import { z } from 'zod';

export const GET = createApiHandler(async (_req, { query }) => {
  const { page, limit } = query;
  const { skip, take } = getPaginationParams({ page, limit, order: 'desc' });

  const where = { status: 'pending' as const, deletedAt: null };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'asc' },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        seller: {
          select: {
            businessName: true,
            isVerified: true,
            rating: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        category: { select: { name: true, slug: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const data = products.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    currency: p.currency,
    condition: p.condition,
    createdAt: p.createdAt,
    seller: {
      id: p.seller.user.id,
      name: p.seller.businessName || p.seller.user.name,
      email: p.seller.user.email,
      isVerified: p.seller.isVerified,
      rating: p.seller.rating,
    },
    category: p.category,
    imageUrl: p.images[0]?.url ?? null,
  }));

  return formatPaginatedResponse(data, total, { page, limit, order: 'asc' });
}, {
  roles: ['admin'],
  querySchema: paginationSchema,
});
