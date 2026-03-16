// Single Product API
// GET /api/products/[id] - Get product details
// PUT /api/products/[id] - Update product (owner only)
// DELETE /api/products/[id] - Delete product (owner only)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';
import { deleteProductFromIndex, indexProduct, textToSparseVector } from '@/lib/qdrant/client';
import { getTextEmbedding } from '@/lib/ai/openai';

// GET: Get product details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

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

    return NextResponse.json({
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
    });
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
  status: z.enum(['active', 'sold']).optional(),
  regionId: z.number().optional(),
});

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
      select: { sellerId: true },
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

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: validatedData,
      include: {
        category: { select: { slug: true } },
      },
    });

    // Reindex in Qdrant async (don't block response)
    (async () => {
      try {
        const searchText = `${updatedProduct.title} ${updatedProduct.description || ''}`.trim();
        const embedding = await getTextEmbedding(searchText);
        const sparseVector = textToSparseVector(searchText);
        await indexProduct(updatedProduct.id, embedding, sparseVector, {
          product_id: updatedProduct.id,
          seller_id: updatedProduct.sellerId,
          title: updatedProduct.title,
          title_ar: updatedProduct.titleAr || undefined,
          description: updatedProduct.description || undefined,
          price: Number(updatedProduct.price),
          currency: updatedProduct.currency,
          category_slug: updatedProduct.category?.slug || 'other',
          country_code: updatedProduct.countryCode,
          region_id: updatedProduct.regionId || undefined,
          status: updatedProduct.status,
          created_at: updatedProduct.createdAt.toISOString(),
        });
      } catch (err) {
        console.error('Failed to reindex product in Qdrant:', err);
      }
    })();

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
      select: { sellerId: true, qdrantPointId: true },
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

    // Delete from Qdrant if indexed
    if (product.qdrantPointId) {
      deleteProductFromIndex(product.qdrantPointId).catch((err) => {
        console.error('Failed to delete from Qdrant:', err);
      });
    }

    // Delete product (cascades to images)
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
