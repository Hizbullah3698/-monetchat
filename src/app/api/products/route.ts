/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: List products with filters and pagination
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: country
 *         schema: { type: string, default: 'KW' }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, oldest, price_asc, price_desc, popular], default: newest }
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/jwt';
import { getTextEmbedding, analyzeImageForListing, moderateContent } from '@/lib/ai/ai-service';
import { enqueueIndexProduct } from '@/jobs/indexing.job';
import { createApiHandler } from '@/lib/api/handler';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';
import { ValidationError, ForbiddenError } from '@/lib/api/errors/AppError';
import { CacheService } from '@/lib/cache';
import { ROLE_SELLER, ROLE_ADMIN, ROLE_SUPER_ADMIN } from '@/lib/auth/roles';
import { EventLogger } from '@/lib/services/event-logger.service';

const PRODUCTS_LIST_CACHE_TTL = 300; // 5 minutes

const publicQuerySchema = paginationSchema.extend({
  category: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  seller: z.string().optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional(),
  q: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'popular']).default('newest'),
});

// GET: List products with filters
export const GET = createApiHandler(async (req, { query }) => {
  const {
    page,
    limit,
    sort,
    country: countryCode = 'KW',
    category: categorySlug,
    minPrice,
    maxPrice,
    region: regionId,
    seller: sellerId,
    condition,
    q,
  } = query;
  const status = 'active';

  const { skip, take } = getPaginationParams({ 
    page: (page as number) || 1, 
    limit: (limit as number) || 10, 
    order: 'desc' 
  });

  const cacheKey = `products:list:${JSON.stringify(query)}`;
  const cachedProducts = await CacheService.get(cacheKey);
  if (cachedProducts) {
    return cachedProducts;
  }

  // Build where clause
  const where: any = {
    status,
    countryCode,
  };

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (regionId) {
    where.regionId = typeof regionId === 'string' ? parseInt(regionId) : regionId;
  }

  if (sellerId) {
    where.sellerId = sellerId as string;
  }

  if (condition) {
    where.condition = condition;
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice as string);
    if (maxPrice) where.price.lte = parseFloat(maxPrice as string);
  }

  // Build orderBy
  let orderBy: any = { createdAt: 'desc' };
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
      take,
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

  const response = formatPaginatedResponse(transformedProducts, total, { 
    page: (page as number) || 1, 
    limit: (limit as number) || 10, 
    order: 'desc' 
  });

  await CacheService.set(cacheKey, response, PRODUCTS_LIST_CACHE_TTL);

  return response;
}, {
  querySchema: publicQuerySchema
});

/**
 * @openapi
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductInput'
 *     responses:
 *       201:
 *         description: Product created successfully
 */
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
  categorySlug: z.string().optional(),
});

export const POST = createApiHandler(async (req, { body, user }) => {

  const validatedData = body as z.infer<typeof createProductSchema>;

  // Text-only categories don't require images; physical products do
  const isDescriptionBased = ['property', 'services', 'jobs', 'other'].includes(
    validatedData.categorySlug || ''
  );
  if ((!validatedData.imageUrls || validatedData.imageUrls.length === 0) && !isDescriptionBased) {
    throw new ValidationError('At least one image is required for physical products');
  }

  // Get or auto-create seller profile
  let seller = await prisma.seller.findUnique({
    where: { userId: user!.userId },
    include: { user: { select: { countryCode: true, phone: true } } },
  });

  if (!seller) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: { countryCode: true, phone: true, name: true },
    });

    seller = await prisma.seller.create({
      data: {
        userId: user!.userId,
        phonePublic: dbUser?.phone || '',
        businessName: dbUser?.name || undefined,
      },
      include: { user: { select: { countryCode: true, phone: true } } },
    });

    // attach seller role by id
    const sellerRole = await prisma.role.findUnique({ where: { name: ROLE_SELLER } });
    if (sellerRole) {
      await prisma.user.update({
        where: { id: user!.userId },
        data: { roleId: sellerRole.id },
      });
    }
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
    throw new ValidationError('Content rejected', { 
      reason: moderation.reason, 
      flags: moderation.flags 
    });
  }

  // AI-analyze first image for category suggestion if not provided
  let categoryId: number | null = null;
  let aiAnalysis = null;

  if (!validatedData.categorySlug && validatedData.imageUrls?.[0]) {
    aiAnalysis = await analyzeImageForListing(validatedData.imageUrls[0], countryCode);

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

  if (!categoryId) {
    throw new ValidationError('Category not found or not provided');
  }

  // Create product with images in transaction
  const product = await prisma.$transaction(async (tx) => {
    const newProduct = await tx.product.create({
      data: {
        sellerId: user!.userId,
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
        status: 'pending',
      },
    });

    if (validatedData.imageUrls && validatedData.imageUrls.length > 0) {
      await tx.productImage.createMany({
        data: validatedData.imageUrls.map((url: string, index: number) => ({
          productId: newProduct.id,
          url,
          s3Key: url.split('/').slice(-2).join('/'),
          isPrimary: index === 0,
          sortOrder: index,
        })),
      });
    }

    return newProduct;
  });

  EventLogger.log('product_created', { userId: user!.userId, entityType: 'product', entityId: product.id }).catch(() => {});

  // Generate embedding and index in Qdrant via Background Job
  enqueueIndexProduct(product.id).catch((err) => {
    console.error('Failed to enqueue product indexing job:', err);
  });

  // Invalidate products list cache
  await CacheService.invalidatePattern('products:list:*');

  return {
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
  };
}, {
  bodySchema: createProductSchema,
  requireAuth: true,
  roles: [ROLE_SELLER, ROLE_ADMIN, ROLE_SUPER_ADMIN],
});

