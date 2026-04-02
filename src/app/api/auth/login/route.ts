/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { comparePassword, signAccessToken, signRefreshToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validation/auth';
import { createApiHandler } from '@/lib/api/handler';
import { AuthenticationError, ForbiddenError } from '@/lib/api/errors/AppError';
import { AuditLogService } from '@/lib/services/audit-service';
import { logger } from '@/lib/logger';

export const POST = createApiHandler(async (req, { body }) => {
  const { email, password } = body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: { select: { name: true } } },
  });

  if (!user || !(await comparePassword(password, user?.passwordHash || ''))) {
    logger.warn({ event: 'auth.login.failed', email, reason: 'Invalid credentials' }, 'Login failed');
    throw new AuthenticationError('Invalid email or password');
  }

  if (!user.isVerified) {
    logger.warn({ event: 'auth.login.failed', email, userId: user.id, reason: 'Unverified email' }, 'Login failed');
    throw new ForbiddenError('Please verify your email first');
  }

  if (!user.isActive) {
    logger.warn({ event: 'auth.login.failed', email, userId: user.id, reason: 'Account disabled' }, 'Login failed');
    throw new ForbiddenError('Your account is currently disabled');
  }

  const roleName = user.role?.name || 'user';
  const accessToken = await signAccessToken({ 
    userId: user.id, 
    role: roleName, 
    email: user.email 
  });
  const refreshToken = await signRefreshToken({ userId: user.id });

  // Store refresh token in database (hashed)
  await (prisma as any).refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Log to audit
  await AuditLogService.logAction({
    userId: user.id,
    action: 'LOGIN',
    entityName: 'User',
    entityId: user.id,
    ipAddress: req.headers.get('x-forwarded-for') || undefined,
    userAgent: req.headers.get('user-agent') || undefined,
  });

  logger.info({ event: 'auth.login.success', email, userId: user.id, role: roleName }, 'Login successful');

  const response = NextResponse.json({
    success: true,
    data: {
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name, role: roleName },
      accessToken,
    }
  });

  // Set refresh token in cookie (HttpOnly)
  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}, {
  bodySchema: loginSchema
});
