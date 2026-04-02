import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { createReviewSchema, listReviewQuerySchema } from '@/lib/validation/review';
import { ValidationError } from '@/lib/api/errors/AppError';
import { getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';

// POST /api/reviews - create a review
export const POST = createApiHandler(async (_req, { body, user }) => {
  const { targetType, targetId, rating, comment } = body;

  let productId: string | null = null;
  let sellerId: string | null = null;

  if (targetType === 'product') {
    const product = await prisma.product.findFirst({
      where: { id: targetId, deletedAt: null, status: 'active' },
      select: { id: true, sellerId: true },
    });
    if (!product) throw new ValidationError('Product not found or not reviewable');
    productId = product.id;
    sellerId = product.sellerId;
    if (sellerId === user!.userId) throw new ValidationError('Cannot review your own product');
  } else {
    const seller = await prisma.seller.findUnique({
      where: { userId: targetId },
      select: { userId: true },
    });
    if (!seller) throw new ValidationError('Seller not found');
    sellerId = seller.userId;
    if (sellerId === user!.userId) throw new ValidationError('Cannot review yourself');
  }

  // Prevent duplicate review
  const existing = await prisma.review.findFirst({
    where: {
      reviewerId: user!.userId,
      ...(productId ? { productId } : { sellerId }),
    },
  });
  if (existing) {
    throw new ValidationError('You already left a review here');
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        reviewerId: user!.userId,
        targetType,
        productId,
        sellerId,
        rating,
        comment,
      },
    });

    // Update seller aggregates if sellerId available
    if (sellerId) {
      const seller = await tx.seller.findUnique({
        where: { userId: sellerId },
        select: { rating: true, totalReviews: true },
      });
      if (seller) {
        const newTotal = seller.totalReviews + 1;
        const newRating = ((Number(seller.rating) * seller.totalReviews) + rating) / newTotal;
        await tx.seller.update({
          where: { userId: sellerId },
          data: {
            rating: newRating,
            totalReviews: newTotal,
          },
        });
      }
    }

    return created;
  });

  return { message: 'Review submitted', reviewId: review.id };
}, { requireAuth: true, bodySchema: createReviewSchema });

// GET /api/reviews - list reviews for product or seller
export const GET = createApiHandler(async (_req, { query }) => {
  const { targetType, targetId, page, limit } = query;
  const { skip, take } = getPaginationParams({ page, limit, order: 'desc' });

  const where =
    targetType === 'product'
      ? { targetType, productId: targetId }
      : { targetType, sellerId: targetId };

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { id: true, name: true, avatarUrl: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  return formatPaginatedResponse(
    items.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      reviewer: r.reviewer,
    })),
    total,
    { page, limit, order: 'desc' },
  );
}, { querySchema: listReviewQuerySchema });
