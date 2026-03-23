/**
 * @openapi
 * /api/admin/products/{id}/status:
 *   patch:
 *     summary: Update product status (Admin)
 *     tags: [Admin, Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, pending, sold, expired, rejected]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product status updated
 *       404:
 *         description: Product not found
 *       403:
 *         description: Forbidden
 */
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';
import { NotFoundError } from '@/lib/api/errors/AppError';
import { AuditLogService } from '@/lib/services/audit-service';

const updateStatusSchema = z.object({
  status: z.enum(['active', 'pending', 'sold', 'expired', 'rejected']),
  rejectionReason: z.string().optional(),
});

export const PATCH = createApiHandler(async (req, { body, params, user }) => {
  const { id } = params;
  const { status, rejectionReason } = body as z.infer<typeof updateStatusSchema>;

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: {
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : null,
      updatedById: user.userId,
    },
  });

  // Create audit log entry for this action
  await AuditLogService.logAction({
    userId: user.userId,
    action: 'UPDATE',
    entityName: 'Product',
    entityId: id,
    changes: { status, rejectionReason },
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  // Invalidate caches
  const { CacheService } = await import('@/lib/cache');
  await CacheService.del(`products:detail:${id}`);
  await CacheService.invalidatePattern('products:list:*');

  return updatedProduct;
}, {
  roles: ['admin'],
  bodySchema: updateStatusSchema,
});
