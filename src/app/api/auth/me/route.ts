/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *   patch:
 *     summary: Update current user profile
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: User profile updated
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { profileUpdateSchema } from '@/lib/validation/profile';

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
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
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
        role: user.role.name,
        permissions: user.role.permissions.map((rp) => rp.permission.name),
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
export async function PATCH(request: NextRequest) {
  try {
    const tokenPayload = await getCurrentUser();
    if (!tokenPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = profileUpdateSchema.parse(body);

    const updated = await prisma.user.update({
      where: { id: tokenPayload.userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.countryCode !== undefined && { countryCode: data.countryCode }),
        ...(data.regionId !== undefined && { regionId: data.regionId }),
        ...(data.preferredLanguage !== undefined && { preferredLanguage: data.preferredLanguage }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        countryCode: true,
        regionId: true,
        preferredLanguage: true,
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
