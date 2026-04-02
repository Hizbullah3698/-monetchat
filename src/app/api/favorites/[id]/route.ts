import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth/jwt';
import { createApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/api/errors/AppError';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * POST /api/favorites/:id - add product to favorites
 */
export const POST = createApiHandler(async (req, { params, user }) => {
  const { id: productId } = paramsSchema.parse(params ?? {});
  const authUser = user ?? (await requireAuth(req));

  const product = await prisma.product.findFirst({
    where: { id: productId, status: 'active', deletedAt: null },
    select: { id: true },
  });
  if (!product) {
    throw new ValidationError('Product not found or not favoritable');
  }

  const favorite = await prisma.favorite.upsert({
    where: {
      userId_productId: {
        userId: authUser.userId,
        productId,
      },
    },
    update: {},
    create: {
      userId: authUser.userId,
      productId,
    },
  });

  return {
    message: 'Added to favorites',
    favoriteId: favorite.id,
    productId,
    isFavorited: true,
  };
}, { requireAuth: true });

/**
 * DELETE /api/favorites/:id - remove product from favorites
 */
export const DELETE = createApiHandler(async (req, { params, user }) => {
  const { id: productId } = paramsSchema.parse(params ?? {});
  const authUser = user ?? (await requireAuth(req));

  await prisma.favorite.delete({
    where: {
      userId_productId: {
        userId: authUser.userId,
        productId,
      },
    },
  }).catch(() => {});

  return {
    message: 'Removed from favorites',
    productId,
    isFavorited: false,
  };
}, { requireAuth: true });

/**
 * GET /api/favorites/:id - check if product is favorited by current user
 */
export const GET = createApiHandler(async (req, { params }) => {
  const { id: productId } = paramsSchema.parse(params ?? {});

  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return { isFavorited: false };
  }

  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_productId: {
        userId: authUser.userId,
        productId,
      },
    },
    select: { id: true },
  });

  return { isFavorited: !!favorite };
});
