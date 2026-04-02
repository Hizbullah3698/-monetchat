import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';
import { updateReportStatusSchema } from '@/lib/validation/report';
import { z } from 'zod';

const listQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'reviewed', 'dismissed']).optional(),
  targetType: z.enum(['product', 'seller']).optional(),
});

export const GET = createApiHandler(async (_req, { query }) => {
  const { status, targetType } = query;
  const { skip, take } = getPaginationParams(query);

  const where: any = {};
  if (status) where.status = status;
  if (targetType) where.targetType = targetType;

  const [items, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return formatPaginatedResponse(items, total, query);
}, { roles: ['admin'], querySchema: listQuerySchema });

export const PATCH = createApiHandler(async (req, { body, params, user }) => {
  const { id } = params;
  const parsed = body;

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return Response.json({ error: 'Report not found' }, { status: 404 });
  }

  const updated = await prisma.report.update({
    where: { id },
    data: {
      status: parsed.status,
      notes: parsed.notes ?? report.notes,
      reviewedAt: new Date(),
      reviewedBy: user?.userId,
    },
  });

  // TODO: hook notifications to reporter/ seller/product owner if desired

  return { message: 'Report updated', report: updated };
}, { roles: ['admin'], bodySchema: updateReportStatusSchema });
