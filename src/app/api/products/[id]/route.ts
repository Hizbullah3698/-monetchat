import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';
import { createApiHandler } from '@/lib/api/handler';
import { NotFoundError, ForbiddenError, ValidationError } from '@/lib/api/errors/AppError';
import { enqueueIndexProduct, enqueueRemoveProduct } from '@/jobs/indexing.job';
import { CacheService } from '@/lib/cache';
import { ROLE_ADMIN, ROLE_SUPER_ADMIN } from '@/lib/auth/roles';
import { buildPublicProductWhere } from '@/lib/marketplace/visibility';
import { AuditLogService } from '@/lib/services/audit-service';

const PRODUCT_DETAIL_CACHE_TTL = 3600; // 1 hour
const paramsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: Get product details
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 *       500:
 *         description: Failed to fetch product
 */
export const GET = createApiHandler(async (request, { params }) => {
    const { id } = paramsSchema.parse(params ?? {});
    const authUser = await getCurrentUser(request).catch(() => null);
    const canViewHidden =
      authUser?.role === ROLE_ADMIN || authUser?.role === ROLE_SUPER_ADMIN;

    const cacheKey = `products:detail:${id}`;
    const cachedProduct = !authUser ? await CacheService.get(cacheKey) : null;
    if (cachedProduct) {
      // Fire and forget view increment in background
      prisma.product.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      }).catch(() => {});
      return cachedProduct;
    }

    const product = await prisma.product.findFirst({
      where: canViewHidden ? { id, deletedAt: null } : buildPublicProductWhere({ id }),
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        category: {
          select: { slug: true, name: true, nameAr: true },
        },
        seller: {
          select: {
            phonePublic: true,
            whatsappNumber: true,
            businessName: true,
            businessNameAr: true,
            rating: true,
            totalReviews: true,
            totalSales: true,
            isVerified: true,
            user: {
              select: { name: true, nameAr: true, avatarUrl: true },
            },
          },
        },
        region: {
          select: { id: true, name: true, nameAr: true },
        },
        country: {
          select: { code: true, name: true, nameAr: true, currencyCode: true, currencySymbol: true },
        },
      },
    });

    if (!product) throw new NotFoundError('Product not found');

    const isOwner = authUser?.userId === product.sellerId;
    const isPubliclyVisible = product.status === 'active' && !product.deletedAt;
    if (!isPubliclyVisible && !isOwner && !canViewHidden) {
      throw new NotFoundError('Product not found');
    }

    // Increment view count (fire and forget)
    prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    const responseData = {
      product: {
        id: product.id,
        title: product.title,
        titleAr: product.titleAr,
        description: product.description,
        descriptionAr: product.descriptionAr,
        price: product.price,
        currency: product.currency,
        isNegotiable: product.isNegotiable,
        condition: product.condition,
        status: product.status,
        viewCount: product.viewCount,
        contactCount: product.contactCount,
        images: product.images.map((img) => ({
          id: img.id,
          url: img.url,
          isPrimary: img.isPrimary,
        })),
        category: product.category,
        region: product.region,
        country: product.country,
        seller: {
          id: product.sellerId,
          name: product.seller.businessName || product.seller.user.name,
          nameAr: product.seller.businessNameAr || product.seller.user.nameAr,
          avatarUrl: product.seller.user.avatarUrl,
          phonePublic: product.seller.phonePublic,
          whatsappNumber: product.seller.whatsappNumber,
          rating: product.seller.rating,
          totalReviews: product.seller.totalReviews,
          totalSales: product.seller.totalSales,
          isVerified: product.seller.isVerified,
        },
        createdAt: product.createdAt,
        expiresAt: product.expiresAt,
      },
    };

    if (!authUser && isPubliclyVisible) {
      await CacheService.set(cacheKey, responseData, PRODUCT_DETAIL_CACHE_TTL);
    }

    return responseData;
});

// Validation schema for updating product
const updateProductSchema = z.object({
  title: z.string().min(3).optional(),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
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

/**
 * @openapi
 * /api/products/{id}:
 *   put:
 *     summary: Update product (owner only)
 *     tags: [Products]
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
 *             properties:
 *               title:
 *                 type: string
 *               titleAr:
 *                 type: string
 *               description:
 *                 type: string
 *               descriptionAr:
 *                 type: string
 *               price:
 *                 type: number
 *               isNegotiable:
 *                 type: boolean
 *               condition:
 *                 type: string
 *               status:
 *                 type: string
 *               regionId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You can only edit your own products
 *       404:
 *         description: Product not found
 */
export const PUT = createApiHandler(async (request, { params, body, user }) => {
    const { id } = paramsSchema.parse(params ?? {});
    const validatedData = updateProductSchema.parse(body);

    // Check if product exists and user owns it
    const product = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true, status: true, deletedAt: true },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundError('Product not found');
    }

    if (product.sellerId !== user!.userId) {
      throw new ForbiddenError('You can only edit your own products');
    }

    // Enforce allowed status transitions for sellers
    if (validatedData.status) {
      const allowed = ALLOWED_TRANSITIONS[product.status] || [];
      if (!allowed.includes(validatedData.status)) {
        throw new ValidationError(`Invalid status transition from ${product.status} to ${validatedData.status}`);
      }
    }

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: validatedData,
      include: {
        category: { select: { slug: true } },
      },
    });

    // Reindex in Qdrant async via BullMQ (don't block response)
    enqueueIndexProduct(updatedProduct.id).catch((err) => {
      console.error('Failed to enqueue product indexing job:', err);
    });

    // Invalidate caches
    await CacheService.del(`products:detail:${id}`);
    await CacheService.invalidatePattern('products:list:*');

    await AuditLogService.logAction({
      userId: user!.userId,
      action: 'UPDATE',
      entityName: 'Product',
      entityId: id,
      changes: validatedData,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch(() => {});

    return {
      product: {
        id: updatedProduct.id,
        title: updatedProduct.title,
        price: updatedProduct.price,
        status: updatedProduct.status,
        updatedAt: updatedProduct.updatedAt,
      },
    };
}, { requireAuth: true, bodySchema: updateProductSchema });

/**
 * @openapi
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product (owner only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: You can only delete your own products
 *       404:
 *         description: Product not found
 */
export const DELETE = createApiHandler(async (request, { params, user }) => {
    const { id } = paramsSchema.parse(params ?? {});

    // Check if product exists and user owns it
    const product = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true, qdrantPointId: true, status: true, deletedAt: true },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundError('Product not found');
    }

    if (product.sellerId !== user!.userId) {
      throw new ForbiddenError('You can only delete your own products');
    }

    // Soft delete / deactivate
    await prisma.product.update({
      where: { id },
      data: {
        status: 'expired',
        deletedAt: new Date(),
      },
    });

    // Delete from Qdrant if indexed
    if (product.qdrantPointId) {
      enqueueRemoveProduct(product.qdrantPointId).catch(() => {});
    }

    // Invalidate caches
    await CacheService.del(`products:detail:${id}`);
    await CacheService.invalidatePattern('products:list:*');

    await AuditLogService.logAction({
      userId: user!.userId,
      action: 'DELETE',
      entityName: 'Product',
      entityId: id,
      changes: { previousStatus: product.status, newStatus: 'expired' },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch(() => {});

    return {
      message: 'Product deactivated successfully',
    };
}, { requireAuth: true });
