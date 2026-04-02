import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';
import { updateReportStatusSchema } from '@/lib/validation/report';
import { z } from 'zod';
import { AuditLogService } from '@/lib/services/audit-service';
import { NotFoundError } from '@/lib/api/errors/AppError';

const listQuerySchema = paginationSchema.extend({
  status: z.enum(['pending', 'reviewed', 'dismissed']).optional(),
  targetType: z.enum(['product', 'seller']).optional(),
});

const patchReportSchema = updateReportStatusSchema.extend({
  id: z.string().uuid(),
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
  const { id, status, notes } = patchReportSchema.parse(body);

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) throw new NotFoundError('Report not found');

  const updated = await prisma.report.update({
    where: { id },
    data: {
      status,
      notes: notes ?? report.notes,
      reviewedAt: new Date(),
      reviewedBy: user?.userId,
    },
  });

  await AuditLogService.logAction({
    userId: user?.userId,
    action: 'UPDATE',
    entityName: 'Report',
    entityId: id,
    changes: {
      previousStatus: report.status,
      nextStatus: status,
      notesUpdated: notes !== undefined,
    },
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  }).catch(() => {});

  // TODO: hook notifications to reporter/ seller/product owner if desired

  return { message: 'Report updated', report: updated };
}, { roles: ['admin'], bodySchema: patchReportSchema });
