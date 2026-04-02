// Seller Profile API - Prisma-based
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';
import { ROLE_SELLER } from '@/lib/auth/roles';

const updateSellerSchema = z.object({
  businessName: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(500).optional(),
  bioAr: z.string().trim().max(500).optional(),
  phonePublic: z.string().trim().regex(/^[\\d+\\-\\s()]*$/).max(20).optional(),
  whatsappNumber: z.string().trim().regex(/^[\\d+\\-\\s()]*$/).max(20).optional(),
  nationalId: z.string().trim().max(20).optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: user.userId },
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
      return NextResponse.json({ profile: null });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Seller Profile API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { businessName, bio, bioAr, phonePublic, whatsappNumber, nationalId } = updateSellerSchema.parse(body);

    // Fetch user's name to check profile completeness
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { name: true },
    });

    // Profile is complete when phone is set and user has a name
    const isProfileComplete = !!(phonePublic?.trim() && dbUser?.name?.trim());

    // Save nationalId to User model (separate update)
    if (nationalId !== undefined) {
      await prisma.user.update({
        where: { id: user.userId },
        data: { nationalId },
      });
    }

    // Ensure seller role exists and attach user to it
    const sellerRole = await prisma.role.findUnique({ where: { name: ROLE_SELLER } });
    if (!sellerRole) {
      return NextResponse.json({ error: 'Seller role is not configured' }, { status: 500 });
    }

    await prisma.user.update({
      where: { id: user.userId },
      data: { roleId: sellerRole.id },
    });

    const seller = await prisma.seller.upsert({
      where: { userId: user.userId },
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
        userId: user.userId,
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

    return NextResponse.json({
      message: 'Profile updated',
      profile: {
        ...seller,
        status: seller.status,
        isProfileComplete,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    console.error('Seller Profile API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
