/**
 * @openapi
 * /api/admin/stats:
 *   get:
 *     summary: Get dashboard statistics (Admin)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Overview and daily stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                 dailyStats:
 *                   type: object
 *       403:
 *         description: Forbidden (Admin only)
 */
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';

export const GET = createApiHandler(async (req) => {
  const [
    totalUsers,
    activeUsers,
    totalSellers,
    totalProducts,
    activeProducts,
    pendingProducts,
    soldProducts,
    totalSearches,
    totalContacts,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { isActive: true, deletedAt: null } }),
    prisma.seller.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.product.count({ where: { status: 'active', deletedAt: null } }),
    prisma.product.count({ where: { status: 'pending', deletedAt: null } }),
    prisma.product.count({ where: { status: 'sold', deletedAt: null } }),
    prisma.searchLog.count(),
    prisma.contactLog.count(),
  ]);

  // Aggregate stats by day for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Use separate grouped queries for better compatibility
  const userGrouped = await prisma.user.groupBy({
    by: ['createdAt'],
    _count: { id: true },
    where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null },
  });

  const productGrouped = await prisma.product.groupBy({
    by: ['createdAt'],
    _count: { id: true },
    where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null },
  });

  // Since Prisma groupBy on DateTime doesn't automatically truncate to DATE, 
  // we'll manually aggregate by date string in JS for this high-level overview.
  const aggregateByDate = (items: any[]) => {
    const map = new Map<string, number>();
    items.forEach(item => {
      const date = item.createdAt.toISOString().split('T')[0];
      map.set(date, (map.get(date) || 0) + (item._count.id || 0));
    });
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  };

  return {
    overview: {
      users: { total: totalUsers, active: activeUsers },
      sellers: { total: totalSellers },
      products: {
        total: totalProducts,
        active: activeProducts,
        pending: pendingProducts,
        sold: soldProducts,
      },
      activity: {
        searches: totalSearches,
        contacts: totalContacts,
      },
    },
    dailyStats: {
      users: aggregateByDate(userGrouped),
      products: aggregateByDate(productGrouped),
    },
  };
}, {
  roles: ['admin', 'super_admin'],
});
