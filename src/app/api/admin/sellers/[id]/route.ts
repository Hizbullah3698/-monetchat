import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { AuditLogService } from '@/lib/services/audit-service';
import { EventLogger } from '@/lib/services/event-logger.service';
import { NotificationService } from '@/services/notification.service';
import { NotFoundError } from '@/lib/api/errors/AppError';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const updateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  reason: z.string().max(500).optional(),
}).superRefine(({ status, reason }, ctx) => {
  if ((status === 'rejected' || status === 'suspended') && !reason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: 'Reason is required when rejecting or suspending a seller',
    });
  }
});

export const GET = createApiHandler(async (_req, { params }) => {
  const { id } = paramsSchema.parse(params ?? {});

  const seller = await prisma.seller.findUnique({
    where: { userId: id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          countryCode: true,
          regionId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!seller || seller.deletedAt) throw new NotFoundError('Seller not found');

  return { seller };
}, { roles: ['admin'] });

export const PATCH = createApiHandler(async (req, { params, body, user }) => {
  const { id } = paramsSchema.parse(params ?? {});
  const { status, reason } = updateSchema.parse(body);

  const seller = await prisma.seller.findUnique({ where: { userId: id } });
  if (!seller || seller.deletedAt) throw new NotFoundError('Seller not found');

  const updated = await prisma.seller.update({
    where: { userId: id },
    data: {
      status,
      statusReason: reason,
      isVerified: status === 'approved',
    },
  });

  await AuditLogService.logAction({
    userId: user?.userId,
    action: 'UPDATE',
    entityName: 'Seller',
    entityId: id,
    changes: {
      previousStatus: seller.status,
      nextStatus: status,
      reason,
    },
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  }).catch(() => {});

  if (status === 'approved') {
    EventLogger.log(
      'seller_onboarded',
      { userId: id, entityType: 'seller', entityId: id, metadata: { status, reason } }
    ).catch(() => {});
  }

  NotificationService.createSystemAndAudit(
    id,
    status === 'approved' ? 'Seller approved' : status === 'rejected' ? 'Seller rejected' : status === 'suspended' ? 'Seller suspended' : 'Seller status updated',
    status === 'approved'
      ? 'Your seller account has been approved. You can now list products.'
      : status === 'rejected'
        ? `Your seller account was rejected. Reason: ${reason || 'Not specified'}.`
        : status === 'suspended'
          ? `Your seller account was suspended. Reason: ${reason || 'Not specified'}.`
          : `Your seller status is now ${status}.`,
    'INFO',
    { status, reason },
    user?.userId,
  ).catch(() => {});

  return {
    message: 'Seller status updated',
    seller: {
      userId: updated.userId,
      status: updated.status,
      statusReason: updated.statusReason,
      isVerified: updated.isVerified,
    },
  };
}, { roles: ['admin'] });
