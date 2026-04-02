// Seller Listings API - Prisma-based
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';
import { z } from 'zod';

const querySchema = z.object({
  status: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(['updated', 'created']).default('updated'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.parse(Object.fromEntries(searchParams.entries()));
    const { status, q, page, limit, sort, order } = parsed;

    // Ensure seller exists
    const seller = await prisma.seller.findUnique({
      where: { userId: user.userId },
      select: { userId: true },
    });
    if (!seller) {
      return NextResponse.json({ products: [], meta: { pagination: { page, limit, total: 0, totalPages: 0 } } });
    }

    const where: any = { sellerId: user.userId };
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy = sort === 'created' ? { createdAt: order } : { updatedAt: order };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          },
          category: { select: { name: true, nameAr: true, slug: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const data = items.map((p) => ({
      id: p.id,
      title: p.title,
      titleAr: p.titleAr,
      price: Number(p.price),
      currency: p.currency,
      status: p.status,
      condition: p.condition,
      imageUrl: p.images[0]?.url || null,
      category: p.category,
      viewCount: p.viewCount,
      contactCount: p.contactCount,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({
      products: data,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query', details: error.errors }, { status: 400 });
    }
    console.error('Seller Listings API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
