/**
 * @openapi
 * /api/admin/contact-logs:
 *   get:
 *     summary: Get all contact logs (Admin)
 *     tags: [Admin, Logs]
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
 *         name: productId
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: contactType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated contact logs
 *       403:
 *         description: Forbidden (Admin only)
 */
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';

export const GET = createApiHandler(async (req, { query }) => {
  const { page, limit, productId, userId, contactType } = query;
  const { skip, take } = getPaginationParams({ page, limit, order: 'desc' });

  const where: any = {};
  if (productId) where.productId = productId;
  if (userId) where.userId = userId;
  if (contactType) where.contactType = contactType;

  const [logs, total] = await Promise.all([
    prisma.contactLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { title: true } },
      },
    }),
    prisma.contactLog.count({ where }),
  ]);

  return formatPaginatedResponse(logs, total, { page, limit, order: 'desc' });
}, {
  roles: ['admin'],
  querySchema: paginationSchema.extend({
    productId: z.string().optional(),
    userId: z.string().optional(),
    contactType: z.string().optional(),
  }),
});
