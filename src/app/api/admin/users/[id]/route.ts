import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createApiHandler } from '@/lib/api/handler';
import { NotFoundError, ValidationError } from '@/lib/api/errors/AppError';
import { AuditLogService } from '@/lib/services/audit-service';

/**
 * @openapi
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get detailed user profile (Admin)
 *     tags: [Admin, Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile details
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */
// GET: Get detailed user profile
export const GET = createApiHandler(async (req, { params }) => {
  const { id } = params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: { select: { name: true } },
      seller: true,
      country: true,
      region: true,
    },
  });

  if (!user || user.deletedAt) {
    throw new NotFoundError('User not found');
  }

  const { passwordHash, ...userWithoutPassword } = user as any;
  return {
    ...userWithoutPassword,
    role: user.role.name,
  };
}, {
  roles: ['admin'],
});

/**
 * @openapi
 * /api/admin/users/{id}:
 *   patch:
 *     summary: Update user details (Admin)
 *     tags: [Admin, Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               role:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               isVerified:
 *                 type: boolean
 *               countryCode:
 *                 type: string
 *               regionId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */
// PATCH: Update user details (role, status, profile)
const updateUserSchema = z.object({
  name: z.string().optional(),
  nameAr: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
  countryCode: z.string().length(2).optional(),
  regionId: z.number().optional(),
});

export const PATCH = createApiHandler(async (req, { body, params, user: adminUser }) => {
  const { id } = params;
  const data = body as z.infer<typeof updateUserSchema>;

  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser || existingUser.deletedAt) {
    throw new NotFoundError('User not found');
  }

  const updateData: any = { ...data };

  // Handle role update by name
  if (data.role) {
    const role = await (prisma as any).role.findUnique({
      where: { name: data.role },
    });
    if (!role) {
      throw new ValidationError(`Role '${data.role}' not found`);
    }
    updateData.roleId = role.id;
    delete updateData.role;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      role: { select: { name: true } },
    },
  });

  await AuditLogService.logAction({
    userId: adminUser?.userId,
    action: 'UPDATE',
    entityName: 'User',
    entityId: id,
    changes: updateData,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  const { passwordHash, ...userWithoutPassword } = updatedUser as any;
  return {
    ...userWithoutPassword,
    role: updatedUser.role.name,
  };
}, {
  roles: ['admin'],
  bodySchema: updateUserSchema,
});

/**
 * @openapi
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Soft delete user (Admin)
 *     tags: [Admin, Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User soft-deleted successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */
// DELETE: Soft delete user
export const DELETE = createApiHandler(async (req, { params, user: adminUser }) => {
  const { id } = params;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.deletedAt) {
    throw new NotFoundError('User not found');
  }

  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  await AuditLogService.logAction({
    userId: adminUser?.userId,
    action: 'DELETE',
    entityName: 'User',
    entityId: id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  return { success: true, message: 'User soft-deleted successfully' };
}, {
  roles: ['admin'],
});
