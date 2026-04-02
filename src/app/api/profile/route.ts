import { createApiHandler } from '@/lib/api/handler';
import { prisma } from '@/lib/db/prisma';
import { profileUpdateSchema } from '@/lib/validation/profile';
import { ForbiddenError, NotFoundError } from '@/lib/api/errors/AppError';

// GET /api/profile - return current user's profile
export const GET = createApiHandler(async (_req, { user }) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: user!.userId },
    include: {
      role: { select: { name: true } },
      seller: {
        select: {
          phonePublic: true,
          businessName: true,
          isVerified: true,
          rating: true,
          totalSales: true,
        },
      },
      country: {
        select: {
          code: true,
          name: true,
          nameAr: true,
          currencyCode: true,
          currencySymbol: true,
        },
      },
      region: { select: { id: true, name: true, nameAr: true } },
    },
  });

  if (!dbUser) {
    throw new NotFoundError('User not found');
  }
  if (!dbUser.isActive) {
    throw new ForbiddenError('Account disabled');
  }

  return {
    profile: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      avatarUrl: dbUser.avatarUrl,
      countryCode: dbUser.countryCode,
      regionId: dbUser.regionId,
      preferredLanguage: dbUser.preferredLanguage,
      role: dbUser.role.name,
      country: dbUser.country,
      region: dbUser.region,
      seller: dbUser.seller,
      createdAt: dbUser.createdAt,
    },
  };
}, { requireAuth: true });

// PATCH /api/profile - update current user's profile
export const PATCH = createApiHandler(async (_req, { body, user }) => {
  const dbUser = await prisma.user.findUnique({
    where: { id: user!.userId },
    select: { id: true, isActive: true },
  });
  if (!dbUser) {
    throw new NotFoundError('User not found');
  }
  if (!dbUser.isActive) {
    throw new ForbiddenError('Account disabled');
  }

  const updated = await prisma.user.update({
    where: { id: user!.userId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
      ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
      ...(body.regionId !== undefined && { regionId: body.regionId }),
      ...(body.preferredLanguage !== undefined && { preferredLanguage: body.preferredLanguage }),
    },
    include: {
      role: { select: { name: true } },
      country: {
        select: {
          code: true,
          name: true,
          nameAr: true,
          currencyCode: true,
          currencySymbol: true,
        },
      },
      region: { select: { id: true, name: true, nameAr: true } },
    },
  });

  return {
    message: 'Profile updated',
    profile: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      countryCode: updated.countryCode,
      regionId: updated.regionId,
      preferredLanguage: updated.preferredLanguage,
      role: updated.role.name,
      country: updated.country,
      region: updated.region,
      createdAt: updated.createdAt,
    },
  };
}, { requireAuth: true, bodySchema: profileUpdateSchema });
