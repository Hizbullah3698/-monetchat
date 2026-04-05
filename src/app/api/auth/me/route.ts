// Current User API
// GET /api/auth/me - Get current user profile
// PATCH /api/auth/me - Update current user profile

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

export async function GET() {
  try {
    const tokenPayload = await getCurrentUser();

    if (!tokenPayload) {
      return NextResponse.json({ user: null });
    }

    // Fetch full user data from database
    const user = await prisma.user.findUnique({
      where: { id: tokenPayload.userId },
      include: {
        seller: true,
        country: {
          select: {
            code: true,
            name: true,
            nameAr: true,
            currencyCode: true,
            currencySymbol: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        countryCode: user.countryCode,
        preferredLanguage: user.preferredLanguage,
        avatarUrl: user.avatarUrl,
        country: user.country,
        seller: user.seller
          ? {
              phonePublic: user.seller.phonePublic,
              businessName: user.seller.businessName,
              isVerified: user.seller.isVerified,
              rating: user.seller.rating,
              totalSales: user.seller.totalSales,
            }
          : null,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}

// PATCH: Update current user profile
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const tokenPayload = await getCurrentUser();
    if (!tokenPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: tokenPayload.userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
