import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { AuditLogService } from '@/lib/services/audit-service';
import { EventLogger } from '@/lib/services/event-logger.service';
import { NotificationService } from '@/services/notification.service';
import { NotFoundError, ValidationError } from '@/lib/api/errors/AppError';

const bodySchema = z.object({
  status: z.enum(['active', 'rejected', 'pending']),
  reason: z.string().max(500).optional(),
}).superRefine(({ status, reason }, ctx) => {
  if (status === 'rejected' && !reason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['reason'],
      message: 'Reason is required when rejecting a product',
    });
  }
});

export const PATCH = createApiHandler(async (req, { params, body, user }) => {
  const { id } = params;
  const { status, reason } = body;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product || product.deletedAt) throw new NotFoundError('Product not found');
  if (product.status === status && product.rejectionReason === (status === 'rejected' ? reason || 'Not specified' : null)) {
    throw new ValidationError('Product is already in the requested status');
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      status,
      rejectionReason: status === 'rejected' ? reason || 'Not specified' : null,
    },
  });

  await AuditLogService.logAction({
    userId: user?.userId,
    action: 'UPDATE',
    entityName: 'Product',
    entityId: id,
    changes: {
      previousStatus: product.status,
      nextStatus: status,
      reason,
    },
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  }).catch(() => {});

  if (status === 'active' || status === 'rejected') {
    EventLogger.log(
      status === 'active' ? 'product_approved' : 'product_rejected',
      { userId: user?.userId, entityType: 'product', entityId: id, metadata: { reason } }
    ).catch(() => {});
  }

  // Notify seller
  NotificationService.createSystemAndAudit(
    updated.sellerId,
    status === 'active' ? 'Product approved' : status === 'rejected' ? 'Product rejected' : 'Product status updated',
    status === 'rejected'
      ? `Your product "${updated.title}" was rejected. Reason: ${reason || 'Not specified'}.`
      : `Your product "${updated.title}" status is now ${status}.`,
    'INFO',
    { productId: updated.id, status, reason },
    user?.userId,
  ).catch(() => {});

  return {
    message: 'Status updated',
    product: {
      id: updated.id,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
    },
  };
}, { roles: ['admin'], bodySchema });
