// Metrics API - Admin analytics
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/jwt';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'seller') {
      return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [searchCount, productCount, userCount] = await Promise.all([
      prisma.searchLog.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.product.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      activity: {
        searches_24h: searchCount,
        active_products: productCount,
        active_users: userCount,
      },
      system: {
        node_env: process.env.NODE_ENV,
        memory: process.memoryUsage(),
      },
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
