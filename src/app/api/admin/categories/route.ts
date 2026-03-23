/**
 * @openapi
 * /api/admin/categories:
 *   get:
 *     summary: Get all categories (Admin)
 *     tags: [Admin, Categories]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of all categories
 *       403:
 *         description: Forbidden (Admin only)
 *   post:
 *     summary: Create a new category
 *     tags: [Admin, Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - nameAr
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               slug:
 *                 type: string
 *               parentId:
 *                 type: integer
 *               icon:
 *                 type: string
 *               sortOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 */
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';
import { AuditLogService } from '@/lib/services/audit-service';

export const GET = createApiHandler(async (req) => {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      parent: { select: { name: true, slug: true } },
      _count: { select: { products: true } },
    },
  });

  return categories;
}, {
  roles: ['admin'],
});

const createCategorySchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().min(2),
  slug: z.string().min(2),
  parentId: z.number().optional(),
  icon: z.string().optional(),
  sortOrder: z.number().default(0),
  isActive: z.boolean().default(true),
});

export const POST = createApiHandler(async (req, { body, user }) => {
  const data = body as z.infer<typeof createCategorySchema>;

  const category = await prisma.category.create({
    data: {
      ...data,
      createdById: user.userId,
    },
  });

  await AuditLogService.logAction({
    userId: user?.userId,
    action: 'CREATE',
    entityName: 'Category',
    entityId: String(category.id),
    changes: data,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  // Invalidate public categories cache
  const { CacheService } = await import('@/lib/cache');
  await CacheService.del('categories:all');

  return category;
}, {
  roles: ['admin'],
  bodySchema: createCategorySchema,
});
