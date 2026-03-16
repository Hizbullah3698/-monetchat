// Seller Listings API - Prisma-based
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const seller = await prisma.seller.findUnique({
      where: { userId: user.userId },
    });

    if (!seller) {
      return NextResponse.json({ products: [], listings: [] });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { sellerId: user.userId };
    if (statusParam) where.status = statusParam;

    const listings = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        category: { select: { name: true, nameAr: true, slug: true } },
      },
    });

    const mapped = listings.map((p) => ({
      id: p.id,
      title: p.title,
      titleAr: p.titleAr,
      price: Number(p.price),
      currency: p.currency,
      status: p.status,
      condition: p.condition,
      images: p.images.map((img) => ({
        url: img.url,
        isPrimary: img.isPrimary,
      })),
      imageUrl: p.images[0]?.url || null,
      category: p.category,
      viewCount: p.viewCount,
      contactCount: p.contactCount,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({
      products: mapped,
      listings: mapped,
    });
  } catch (error) {
    console.error('Seller Listings API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
