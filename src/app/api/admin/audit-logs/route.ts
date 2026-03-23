/**
 * @openapi
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get audit logs (Admin)
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
 *         name: entityName
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *       403:
 *         description: Forbidden (Admin only)
 */
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';

export const GET = createApiHandler(async (req, { query }) => {
  const { page, limit, entityName, userId, action } = query;
  const { skip, take } = getPaginationParams({ page, limit, order: 'desc' });

  const where: any = {};
  if (entityName) where.entityName = entityName;
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return formatPaginatedResponse(logs, total, { page, limit, order: 'desc' });
}, {
  roles: ['admin'],
  querySchema: paginationSchema.extend({
    entityName: z.string().optional(),
    userId: z.string().optional(),
    action: z.string().optional(),
  }),
});
