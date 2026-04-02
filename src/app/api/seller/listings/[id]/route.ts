import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { createApiHandler } from '@/lib/api/handler';
import { NotFoundError, ValidationError } from '@/lib/api/errors/AppError';
import { AuditLogService } from '@/lib/services/audit-service';
import { enqueueIndexProduct } from '@/jobs/indexing.job';
import { CacheService } from '@/lib/cache';

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  isNegotiable: z.boolean().optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional(),
  status: z.enum(['draft', 'pending', 'active', 'sold', 'expired', 'rejected']).optional(),
  regionId: z.number().optional(),
});

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending', 'active', 'draft'],
  pending: ['active', 'draft', 'rejected'],
  active: ['sold', 'expired', 'pending', 'active'],
  sold: ['sold'],
  expired: ['expired', 'pending'],
  rejected: ['pending', 'draft'],
};
const paramsSchema = z.object({
  id: z.string().uuid(),
});

export const GET = createApiHandler(async (
  _req: NextRequest,
  { params, user }
) => {
    const { id } = paramsSchema.parse(params ?? {});
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        category: { select: { name: true, nameAr: true, slug: true } },
      },
    });

    if (!product || product.deletedAt || product.sellerId !== user!.userId) {
      throw new NotFoundError('Not found');
    }

    return { product };
}, { requireAuth: true });

export const PATCH = createApiHandler(async (
  req: NextRequest,
  { params, body, user }
) => {
    const { id } = paramsSchema.parse(params ?? {});
    const data = updateSchema.parse(body);

    const product = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true, status: true, deletedAt: true },
    });
    if (!product || product.deletedAt || product.sellerId !== user!.userId) {
      throw new NotFoundError('Not found');
    }

    if (data.status) {
      const allowed = ALLOWED_TRANSITIONS[product.status] || [];
      if (!allowed.includes(data.status)) {
        throw new ValidationError(`Invalid status transition from ${product.status} to ${data.status}`);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        category: { select: { name: true, nameAr: true, slug: true } },
      },
    });

    enqueueIndexProduct(updated.id).catch(() => {});
    await CacheService.del(`products:detail:${id}`);
    await CacheService.invalidatePattern('products:list:*');

    await AuditLogService.logAction({
      userId: user!.userId,
      action: 'UPDATE',
      entityName: 'Product',
      entityId: id,
      changes: data,
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    }).catch(() => {});

    return { product: updated };
}, { requireAuth: true, bodySchema: updateSchema });
