import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getTextEmbedding } from '@/lib/ai/ai-service';
import { searchProducts, textToSparseVector } from '@/lib/qdrant/client';
import { createApiHandler } from '@/lib/api/handler';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';

/**
 * @openapi
 * /api/products/search:
 *   get:
 *     summary: AI-powered product search combining vector search and structured filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         required: true
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
 *         name: brand
 *         schema: { type: string }
 *       - in: query
 *         name: model
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of semantically matching products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
export const GET = createApiHandler(async (req, { query }) => {
  const { 
    q: searchQuery, 
    page, 
    limit, 
    country: countryCode = 'KW', 
    category: categorySlug, 
    minPrice, 
    maxPrice, 
    region: regionIdStr, 
    brand,
    model
  } = query;

  if (!searchQuery) {
    throw new Error('Search query (q) is required for semantic search');
  }

  const { skip: offset, take } = getPaginationParams({ page, limit, order: 'desc' });
  const regionId = regionIdStr ? parseInt(regionIdStr as string, 10) : undefined;
  const minPriceNum = minPrice ? parseFloat(minPrice as string) : undefined;
  const maxPriceNum = maxPrice ? parseFloat(maxPrice as string) : undefined;

  // 1. Convert text to embeddings (Dense + Sparse/BM25)
  const queryEmbedding = await getTextEmbedding(searchQuery as string);
  const querySparseVector = textToSparseVector(searchQuery as string);

  // 2. Perform Hybrid Visual Search via Qdrant
  const qdrantResults = await searchProducts(
    queryEmbedding,
    querySparseVector,
    {
      country_code: countryCode as string,
      category_slug: categorySlug as string | undefined,
      min_price: minPriceNum,
      max_price: maxPriceNum,
      region_id: regionId,
      brand: brand as string | undefined,
      model: model as string | undefined,
    },
    take,
    offset
  );

  if (qdrantResults.length === 0) {
    return formatPaginatedResponse([], 0, { page, limit, order: 'desc' });
  }

  const productIds = qdrantResults.map(r => r.id);

  // 3. Fetch full database records preserving Qdrant's relevance scoring order
  const products = await prisma.product.findMany({
    where: { 
      id: { in: productIds } 
    },
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
  });

  // Sort products to match Qdrant score order
  const sortedProducts = qdrantResults.map(qdrantItem => {
    const product = products.find(p => p.id === qdrantItem.id);
    if (!product) return null;
    return {
      id: product.id,
      title: product.title,
      titleAr: product.titleAr,
      price: product.price,
      currency: product.currency,
      isNegotiable: product.isNegotiable,
      condition: product.condition,
      imageUrl: product.images[0]?.url || null,
      category: product.category,
      region: product.region,
      seller: {
        name: product.seller.businessName || product.seller.user.name,
        avatarUrl: product.seller.user.avatarUrl,
        rating: product.seller.rating,
        isVerified: product.seller.isVerified,
      },
      viewCount: product.viewCount,
      createdAt: product.createdAt,
      searchScore: qdrantItem.score, // Includes the similarity score!
    };
  }).filter(Boolean);

  // Return formatted payload. 
  // * Note: Qdrant count doesn't give a total exact match easily when using limits/offsets without an aggregate, 
  //   so for standard pagination we simulate total > skip+take if we get a full page, 
  //   but returning a large mock total or just the offset + results length works.
  const totalEstimation = qdrantResults.length === take ? offset + take + 1 : offset + qdrantResults.length;

  return formatPaginatedResponse(sortedProducts, totalEstimation, { page, limit, order: 'desc' });
}, {
  querySchema: paginationSchema.extend({
    q: z.string().min(1),
    category: z.string().optional(),
    minPrice: z.string().optional(),
    maxPrice: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional()
  })
});
