import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';
import { z } from 'zod';
import { ValidationError } from '@/lib/api/errors/AppError';

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  isNegotiable: z.boolean().optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional(),
  status: z.enum(['draft', 'pending', 'active', 'sold', 'expired', 'rejected']).optional(),
  regionId: z.number().optional(),
});

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending', 'active', 'draft'],
  pending: ['active', 'draft', 'rejected'],
  active: ['sold', 'expired', 'pending', 'active'],
  sold: ['sold'],
  expired: ['expired', 'pending'],
  rejected: ['pending', 'draft'],
};

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        category: { select: { name: true, nameAr: true, slug: true } },
      },
    });

    if (!product || product.sellerId !== user.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Seller product GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await ctx.params;
    const body = await req.json();
    const data = updateSchema.parse(body);

    const product = await prisma.product.findUnique({
      where: { id },
      select: { sellerId: true, status: true },
    });
    if (!product || product.sellerId !== user.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (data.status) {
      const allowed = ALLOWED_TRANSITIONS[product.status] || [];
      if (!allowed.includes(data.status)) {
        throw new ValidationError(`Invalid status transition from ${product.status} to ${data.status}`);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        category: { select: { name: true, nameAr: true, slug: true } },
      },
    });

    return NextResponse.json({ product: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Seller product PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}
