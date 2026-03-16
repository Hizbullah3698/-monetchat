// GET /api/geo/countries - List active countries

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        code: true,
        name: true,
        nameAr: true,
        currencyCode: true,
        currencySymbol: true,
        phoneCode: true,
      },
    });

    return NextResponse.json({ countries });
  } catch (error) {
    console.error('Geo countries error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}
