// Products API
// GET /api/products - List products with filters
// POST /api/products - Create new product (sellers only)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth, getCurrentUser } from '@/lib/auth/jwt';
import { getTextEmbedding, analyzeImageForListing, moderateContent } from '@/lib/ai/openai';
import { indexProduct, textToSparseVector } from '@/lib/qdrant/client';

// GET: List products with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filters
    const categorySlug = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const countryCode = searchParams.get('country') || 'KW';
    const regionId = searchParams.get('region');
    const sellerId = searchParams.get('seller');
    const status = searchParams.get('status') || 'active';

    // Sorting
    const sort = searchParams.get('sort') || 'newest';

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      status,
      countryCode,
    };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (regionId) {
      where.regionId = parseInt(regionId);
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice);
      if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice);
    }

    // Build orderBy
    let orderBy: Record<string, string> = { createdAt: 'desc' };
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'popular':
        orderBy = { viewCount: 'desc' };
        break;
    }

    // Fetch products and count in parallel
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          category: {
            select: { slug: true, name: true, nameAr: true },
          },
          seller: {
            select: {
              businessName: true,
              phonePublic: true,
              rating: true,
              isVerified: true,
              user: {
                select: { name: true, avatarUrl: true },
              },
            },
          },
          region: {
            select: { name: true, nameAr: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Transform response
    const transformedProducts = products.map((p) => ({
      id: p.id,
      title: p.title,
      titleAr: p.titleAr,
      price: p.price,
      currency: p.currency,
      isNegotiable: p.isNegotiable,
      condition: p.condition,
      imageUrl: p.images[0]?.url || null,
      category: p.category,
      region: p.region,
      seller: {
        name: p.seller.businessName || p.seller.user.name,
        avatarUrl: p.seller.user.avatarUrl,
        rating: p.seller.rating,
        isVerified: p.seller.isVerified,
      },
      viewCount: p.viewCount,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      products: transformedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// Validation schema for creating product
const createProductSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  titleAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  currency: z.string().length(3).default('KWD'),
  isNegotiable: z.boolean().default(true),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).default('good'),
  regionId: z.number().optional(),
  imageUrls: z.array(z.string().url()).default([]),
  // Optional: auto-filled by AI
  categorySlug: z.string().optional(),
  // New Structured Fields
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().positive().optional(),
  phone: z.string().optional(),
  area: z.string().optional(),
  propertyType: z.string().optional(),
  sizeSqm: z.number().int().positive().optional(),
  categoryType: z.string().optional(),
});

// POST: Create new product
export async function POST(request: NextRequest) {
  try {
    // Require authentication (any logged-in user can sell)
    const user = await requireAuth();

    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    // Text-only categories don't require images; physical products do
    const isDescriptionBased = ['property', 'services', 'jobs', 'other'].includes(
      validatedData.categorySlug || ''
    );
    if (validatedData.imageUrls.length === 0 && !isDescriptionBased) {
      return NextResponse.json(
        { error: 'Validation failed', details: [{ message: 'At least one image is required for physical products' }] },
        { status: 400 }
      );
    }

    // Get or auto-create seller profile
    let seller = await prisma.seller.findUnique({
      where: { userId: user.userId },
      include: { user: { select: { countryCode: true, phone: true } } },
    });

    if (!seller) {
      // Auto-create seller profile for first-time sellers
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { countryCode: true, phone: true, name: true },
      });

      seller = await prisma.seller.create({
        data: {
          userId: user.userId,
          phonePublic: dbUser?.phone || '',
          businessName: dbUser?.name || undefined,
        },
        include: { user: { select: { countryCode: true, phone: true } } },
      });

      // Update user role to seller
      await prisma.user.update({
        where: { id: user.userId },
        data: { role: 'seller' },
      });
    }

    const countryCode = seller.user.countryCode;

    // Content moderation
    const moderation = await moderateContent(
      validatedData.title,
      validatedData.description || '',
      validatedData.imageUrls,
      countryCode
    );

    if (!moderation.approved) {
      return NextResponse.json(
        {
          error: 'Content rejected',
          reason: moderation.reason,
          flags: moderation.flags,
        },
        { status: 400 }
      );
    }

    // AI-analyze first image for category suggestion if not provided
    let categoryId: number | null = null;
    let aiAnalysis = null;

    if (!validatedData.categorySlug && validatedData.imageUrls[0]) {
      aiAnalysis = await analyzeImageForListing(validatedData.imageUrls[0], countryCode);

      // Find category by AI-suggested slug
      if (aiAnalysis.category) {
        const category = await prisma.category.findUnique({
          where: { slug: aiAnalysis.category },
        });
        if (category) categoryId = category.id;
      }
    } else if (validatedData.categorySlug) {
      const category = await prisma.category.findUnique({
        where: { slug: validatedData.categorySlug },
      });
      if (category) categoryId = category.id;
    }

    // Create product with images in transaction
    const product = await prisma.$transaction(async (tx) => {
      // Create product
      const newProduct = await tx.product.create({
        data: {
          sellerId: user.userId,
          title: validatedData.title,
          titleAr: validatedData.titleAr || aiAnalysis?.title_ar,
          description: validatedData.description || aiAnalysis?.description,
          descriptionAr: validatedData.descriptionAr || aiAnalysis?.description_ar,
          price: validatedData.price,
          currency: validatedData.currency,
          isNegotiable: validatedData.isNegotiable,
          condition: validatedData.condition,
          categoryId,
          countryCode,
          regionId: validatedData.regionId,
          brand: validatedData.brand,
          model: validatedData.model,
          year: validatedData.year,
          phone: validatedData.phone,
          area: validatedData.area,
          propertyType: validatedData.propertyType,
          sizeSqm: validatedData.sizeSqm,
          categoryType: validatedData.categoryType,
        },
      });

      // Create product images (only if provided)
      if (validatedData.imageUrls.length > 0) {
        await tx.productImage.createMany({
          data: validatedData.imageUrls.map((url, index) => ({
            productId: newProduct.id,
            url,
            s3Key: url.split('/').slice(-2).join('/'), // Extract key from URL
            isPrimary: index === 0,
            sortOrder: index,
          })),
        });
      }

      return newProduct;
    });

    // Generate embedding and index in Qdrant (async, don't block response)
    indexProductInQdrant(product.id, validatedData.title, countryCode).catch((err) => {
      console.error('Failed to index product in Qdrant:', err);
    });

    return NextResponse.json(
      {
        product: {
          id: product.id,
          title: product.title,
          price: product.price,
          status: product.status,
        },
        aiSuggestions: aiAnalysis
          ? {
            titleAr: aiAnalysis.title_ar,
            description: aiAnalysis.description,
            descriptionAr: aiAnalysis.description_ar,
            category: aiAnalysis.category,
            suggestedPrice: aiAnalysis.suggested_price,
          }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Products POST error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// Helper function to index product in Qdrant
async function indexProductInQdrant(
  productId: string,
  title: string,
  countryCode: string
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { select: { slug: true } },
      seller: { select: { userId: true } },
    },
  });

  if (!product) return;

  // Generate dense embedding + sparse BM25 vector
  const searchText = `${product.title} ${product.description || ''}`.trim();
  const embedding = await getTextEmbedding(searchText);
  const sparseVector = textToSparseVector(searchText);

  // Index in Qdrant with hybrid vectors
  await indexProduct(productId, embedding, sparseVector, {
    product_id: productId,
    seller_id: product.sellerId,
    title: product.title,
    title_ar: product.titleAr || undefined,
    description: product.description || undefined,
    price: Number(product.price),
    currency: product.currency,
    category_slug: product.category?.slug || 'other',
    country_code: countryCode,
    region_id: product.regionId || undefined,
    status: product.status,
    created_at: product.createdAt.toISOString(),
  });

  // Update product with Qdrant point ID
  await prisma.product.update({
    where: { id: productId },
    data: { qdrantPointId: productId },
  });
}
