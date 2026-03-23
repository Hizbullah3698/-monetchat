/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: List all categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';
import { CacheService } from '@/lib/cache';

const CATEGORIES_CACHE_KEY = 'categories:all';
const CACHE_TTL = 86400; // 24 hours

export const GET = createApiHandler(async (req) => {
  // Check cache first
  const cachedCategories = await CacheService.get(CATEGORIES_CACHE_KEY);
  if (cachedCategories) {
    return cachedCategories;
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Save to cache
  await CacheService.set(CATEGORIES_CACHE_KEY, categories, CACHE_TTL);

  return categories;
});
