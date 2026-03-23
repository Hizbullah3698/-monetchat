/**
 * @openapi
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Update an existing category
 *     tags: [Admin, Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               slug:
 *                 type: string
 *               parentId:
 *                 type: integer
 *                 nullable: true
 *               icon:
 *                 type: string
 *                 nullable: true
 *               sortOrder:
 *                 type: integer
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated
 *       404:
 *         description: Category not found
 *       403:
 *         description: Forbidden
 *   delete:
 *     summary: Delete a category (Soft or Hard depending on children/products)
 *     tags: [Admin, Categories]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category deleted or deactivated
 *       404:
 *         description: Category not found
 *       403:
 *         description: Forbidden
 */
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';
import { NotFoundError } from '@/lib/api/errors/AppError';
import { AuditLogService } from '@/lib/services/audit-service';

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  nameAr: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  parentId: z.number().optional().nullable(),
  icon: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export const PUT = createApiHandler(async (req, { body, params, user }) => {
  const { id } = params;
  const data = body as z.infer<typeof updateCategorySchema>;

  const category = await prisma.category.findUnique({
    where: { id: parseInt(id) },
  });

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  const updatedCategory = await prisma.category.update({
    where: { id: parseInt(id) },
    data: {
      ...data,
      updatedById: user.userId,
    },
  });

  await AuditLogService.logAction({
    userId: user?.userId,
    action: 'UPDATE',
    entityName: 'Category',
    entityId: String(id),
    changes: data,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  // Invalidate public categories cache
  const { CacheService } = await import('@/lib/cache');
  await CacheService.del('categories:all');

  return updatedCategory;
}, {
  roles: ['admin'],
  bodySchema: updateCategorySchema,
});

export const DELETE = createApiHandler(async (req, { params, user }) => {
  const { id } = params;

  const category = await prisma.category.findUnique({
    where: { id: parseInt(id) },
    include: {
      _count: { select: { products: true, children: true } },
    },
  });

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  // Soft delete check: if it has products or children, maybe we shouldn't delete or just mark inactive
  if (category._count.products > 0 || category._count.children > 0) {
    // For now, let's just mark it as inactive and set deletedAt
    const updated = await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await AuditLogService.logAction({
      userId: user?.userId,
      action: 'DELETE', // Log as DELETE conceptually, or UPDATE. Let's do DELETE.
      entityName: 'Category',
      entityId: String(id),
      changes: { isSoftDelete: true },
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    const { CacheService } = await import('@/lib/cache');
    await CacheService.del('categories:all');

    return { success: true, message: 'Category marked as inactive and soft-deleted due to existing relations.', category: updated };
  }

  await prisma.category.delete({
    where: { id: parseInt(id) },
  });

  await AuditLogService.logAction({
    userId: user?.userId,
    action: 'DELETE',
    entityName: 'Category',
    entityId: String(id),
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  const { CacheService } = await import('@/lib/cache');
  await CacheService.del('categories:all');

  return { success: true, message: 'Category deleted successfully' };
}, {
  roles: ['admin'],
});
