import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { AuditLogService } from '@/lib/services/audit-service';
import { EventLogger } from '@/lib/services/event-logger.service';
import { NotificationService } from '@/services/notification.service';

const bodySchema = z.object({
  status: z.enum(['active', 'rejected', 'pending']),
  reason: z.string().max(500).optional(),
});

export const PATCH = createApiHandler(async (req, { params, body, user }) => {
  const { id } = params;
  const { status, reason } = body;

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return Response.json({ error: 'Product not found' }, { status: 404 });
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
    action: status === 'active' ? 'UPDATE' : 'DELETE',
    entityName: 'Product',
    entityId: id,
    changes: { status, reason },
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  }).catch(() => {});

  EventLogger.log(
    status === 'active' ? 'product_approved' : status === 'rejected' ? 'product_rejected' : 'product_created',
    { userId: user?.userId, entityType: 'product', entityId: id, metadata: { reason } }
  ).catch(() => {});

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
