// Seller Profile API - Prisma-based
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/api/errors/AppError';
import { ROLE_SELLER } from '@/lib/auth/roles';
import { AuditLogService } from '@/lib/services/audit-service';

const updateSellerSchema = z.object({
  businessName: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(500).optional(),
  bioAr: z.string().trim().max(500).optional(),
  phonePublic: z.string().trim().regex(/^[\\d+\\-\\s()]*$/).max(20).optional(),
  whatsappNumber: z.string().trim().regex(/^[\\d+\\-\\s()]*$/).max(20).optional(),
  nationalId: z.string().trim().max(20).optional(),
});

export const GET = createApiHandler(async (_req, { user }) => {
    const seller = await prisma.seller.findUnique({
      where: { userId: user!.userId },
      include: {
        user: {
          select: {
            name: true,
            nameAr: true,
            email: true,
            phone: true,
            nationalId: true,
            avatarUrl: true,
            countryCode: true,
            regionId: true,
          },
        },
      },
    });

    if (!seller) {
      return { profile: null };
    }

    return {
      profile: {
        userId: seller.userId,
        businessName: seller.businessName,
        bio: seller.bio,
        bioAr: seller.bioAr,
        phonePublic: seller.phonePublic,
        whatsappNumber: seller.whatsappNumber,
        rating: seller.rating,
        totalReviews: seller.totalReviews,
        totalSales: seller.totalSales,
        isVerified: seller.isVerified,
        isProfileComplete: seller.isProfileComplete,
        status: seller.status,
        user: seller.user,
      },
    };
}, { requireAuth: true });

export const PUT = createApiHandler(async (request, { body, user }) => {
    const { businessName, bio, bioAr, phonePublic, whatsappNumber, nationalId } = updateSellerSchema.parse(body);

    // Fetch user's name to check profile completeness
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.userId },
      select: { name: true },
    });

    // Profile is complete when phone is set and user has a name
    const isProfileComplete = !!(phonePublic?.trim() && dbUser?.name?.trim());

    // Save nationalId to User model (separate update)
    if (nationalId !== undefined) {
      await prisma.user.update({
        where: { id: user!.userId },
        data: { nationalId },
      });
    }

    // Ensure seller role exists and attach user to it
    const sellerRole = await prisma.role.findUnique({ where: { name: ROLE_SELLER } });
    if (!sellerRole) {
      throw new ValidationError('Seller role is not configured');
    }

    await prisma.user.update({
      where: { id: user!.userId },
      data: { roleId: sellerRole.id },
    });

    const seller = await prisma.seller.upsert({
      where: { userId: user!.userId },
      update: {
        businessName,
        bio,
        bioAr,
        phonePublic,
        whatsappNumber,
        isProfileComplete,
        // status and verification are admin-controlled; keep existing values
      },
      create: {
        userId: user!.userId,
        businessName,
        bio,
        bioAr,
        phonePublic: phonePublic ?? '',
        whatsappNumber,
        isProfileComplete,
        status: 'pending',
        isVerified: false,
      },
    });

    await AuditLogService.logAction({
      userId: user!.userId,
      action: 'UPDATE',
      entityName: 'Seller',
      entityId: user!.userId,
      changes: {
        businessName,
        bio,
        bioAr,
        phonePublic,
        whatsappNumber,
        isProfileComplete,
        nationalIdUpdated: nationalId !== undefined,
      },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    }).catch(() => {});

    return {
      message: 'Profile updated',
      profile: {
        ...seller,
        status: seller.status,
        isProfileComplete,
      },
    };
}, { requireAuth: true, bodySchema: updateSellerSchema });
