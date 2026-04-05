// GET /api/geo/regions?country=KW - List regions by country

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country') || 'KW';

    const regions = await prisma.region.findMany({
      where: {
        countryCode,
        isActive: true,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nameAr: true,
        countryCode: true,
      },
    });

    return NextResponse.json({ regions });
  } catch (error) {
    console.error('Geo regions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regions' },
      { status: 500 }
    );
  }
}
