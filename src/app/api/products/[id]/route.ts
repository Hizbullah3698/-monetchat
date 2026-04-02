// Single Product API
// GET /api/products/[id] - Get product details
// PUT /api/products/[id] - Update product (owner only)
// DELETE /api/products/[id] - Delete product (owner only)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';
import { ValidationError } from '@/lib/api/errors/AppError';
import { enqueueIndexProduct, enqueueRemoveProduct } from '@/jobs/indexing.job';
import { CacheService } from '@/lib/cache';

const PRODUCT_DETAIL_CACHE_TTL = 3600; // 1 hour

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
// GET: Get product details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const cacheKey = `products:detail:${id}`;
    const cachedProduct = await CacheService.get(cacheKey);
    if (cachedProduct) {
      // Fire and forget view increment in background
      prisma.product.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      }).catch(() => {});
      return NextResponse.json(cachedProduct);
    }

    const product = await prisma.product.findUnique({
      where: { id },
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

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
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

    await CacheService.set(cacheKey, responseData, PRODUCT_DETAIL_CACHE_TTL);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

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
// PUT: Update product
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    // Check if product exists and user owns it
    const product = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true, status: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.sellerId !== user.userId) {
      return NextResponse.json(
        { error: 'You can only edit your own products' },
        { status: 403 }
      );
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

    return NextResponse.json({
      product: {
        id: updatedProduct.id,
        title: updatedProduct.title,
        price: updatedProduct.price,
        status: updatedProduct.status,
        updatedAt: updatedProduct.updatedAt,
      },
    });
  } catch (error) {
    console.error('Product PUT error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

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
// DELETE: Delete product
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if product exists and user owns it
    const product = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true, qdrantPointId: true, status: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.sellerId !== user.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own products' },
        { status: 403 }
      );
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

    return NextResponse.json({
      message: 'Product deactivated successfully',
    });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
