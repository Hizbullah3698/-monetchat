/**
 * @openapi
 * /api/admin/users:
 *   get:
 *     summary: Search and list users (Admin only)
 *     tags: [Admin, Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [buyer, seller, admin] }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth';
import { createApiHandler } from '@/lib/api/handler';
import { paginationSchema, getPaginationParams, formatPaginatedResponse } from '@/lib/api/pagination';
import { ValidationError, ConflictError } from '@/lib/api/errors/AppError';
import { AuditLogService } from '@/lib/services/audit-service';

// GET: List users with filters
export const GET = createApiHandler(async (req, { query }) => {
  const { page, limit, q, role, isActive } = query;
  const { skip, take } = getPaginationParams({ page, limit, order: 'desc' });

  const where: any = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: skip,
      take: take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        nameAr: true,
        phone: true,
        role: {
          select: { name: true }
        },
        isActive: true,
        isVerified: true,
        createdAt: true,
        lastLoginAt: true,
      },
    } as any),
    prisma.user.count({ where }),
  ]);

  // Flatten role name for response consistency
  const transformedUsers = users.map(u => ({
    ...u,
    role: (u.role as any).name
  }));

  return formatPaginatedResponse(transformedUsers, total, { page, limit, order: 'desc' });
}, {
  roles: ['admin'],
  querySchema: paginationSchema.extend({
    q: z.string().optional(),
    role: z.string().optional(),
    isActive: z.preprocess((val) => val === 'true' ? true : val === 'false' ? false : undefined, z.boolean().optional()),
  })
});

/**
 * @openapi
 * /api/admin/users:
 *   post:
 *     summary: Create a new user (Admin initiated)
 *     tags: [Admin, Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserInput'
 *     responses:
 *       201:
 *         description: User created successfully
 */
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string(),
  role: z.string().default('buyer'),
  isActive: z.boolean().default(true),
  countryCode: z.string().default('KW'),
});

export const POST = createApiHandler(async (req, { body, user: adminUser }) => {
  const { email, password, name, role, isActive, countryCode } = body as z.infer<typeof createUserSchema>;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError('User already exists');
  }

  // Find the role first
  const dbRole = await (prisma as any).role.findUnique({
    where: { name: role },
  });

  if (!dbRole) {
    throw new ValidationError(`Role '${role}' not found`);
  }

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name,
      roleId: dbRole.id,
      isActive: isActive,
      isVerified: true,
      countryCode: countryCode,
    },
    include: {
      role: { select: { name: true } }
    }
  });

  await AuditLogService.logAction({
    userId: adminUser?.userId,
    action: 'CREATE',
    entityName: 'User',
    entityId: user.id,
    changes: { email, name, role, isActive, countryCode },
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  const { passwordHash, ...userWithoutPassword } = user as any;
  return {
    ...userWithoutPassword,
    role: (user.role as any).name
  };
}, {
  roles: ['admin'],
  bodySchema: createUserSchema
});
