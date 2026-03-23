/**
 * @openapi
 * /api/admin/products:
 *   get:
 *     summary: Get all products (Admin)
 *     tags: [Admin, Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: sellerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: countryCode
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated list of products
 *       403:
 *         description: Forbidden (Admin only)
 */
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';

export const GET = createApiHandler(async (req, { query }) => {
  const { page, limit, status, sellerId, categoryId, q, countryCode } = query;
  const { skip, take } = getPaginationParams({ page, limit, order: 'desc' });

  const where: any = {};

  if (status) where.status = status;
  if (sellerId) where.sellerId = sellerId;
  if (categoryId) where.categoryId = categoryId;
  if (countryCode) where.countryCode = countryCode;
  
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { titleAr: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true, slug: true } },
        seller: {
          select: {
            businessName: true,
            user: { select: { name: true, email: true } },
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const transformedProducts = products.map((p) => ({
    id: p.id,
    title: p.title,
    titleAr: p.titleAr,
    price: p.price,
    currency: p.currency,
    status: p.status,
    createdAt: p.createdAt,
    category: p.category,
    seller: {
      name: p.seller.businessName || p.seller.user.name,
      email: p.seller.user.email,
    },
    imageUrl: p.images[0]?.url || null,
  }));

  return formatPaginatedResponse(transformedProducts, total, { page, limit, order: 'desc' });
}, {
  roles: ['admin'],
  querySchema: paginationSchema.extend({
    status: z.string().optional(),
    sellerId: z.string().optional(),
    categoryId: z.preprocess((val) => (val ? parseInt(val as string) : undefined), z.number().optional()),
    q: z.string().optional(),
    countryCode: z.string().optional(),
  }),
});
