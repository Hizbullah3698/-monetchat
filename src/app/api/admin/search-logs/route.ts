/**
 * @openapi
 * /api/admin/search-logs:
 *   get:
 *     summary: Get search logs (Admin)
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
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: countryCode
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated search logs
 *       403:
 *         description: Forbidden (Admin only)
 */
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';

export const GET = createApiHandler(async (req, { query }) => {
  const { page, limit, q, countryCode } = query;
  const { skip, take } = getPaginationParams({ page, limit, order: 'desc' });

  const where: any = {};
  if (q) where.queryText = { contains: q, mode: 'insensitive' };
  if (countryCode) where.countryCode = countryCode;

  const [logs, total] = await Promise.all([
    prisma.searchLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.searchLog.count({ where }),
  ]);

  return formatPaginatedResponse(logs, total, { page, limit, order: 'desc' });
}, {
  roles: ['admin'],
  querySchema: paginationSchema.extend({
    q: z.string().optional(),
    countryCode: z.string().optional(),
  }),
});
