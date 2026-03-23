/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               name:
 *                 type: string
 *               countryCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: string
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Internal server error
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword, generateToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validation/auth';
import { ZodError } from 'zod';
import { NotificationService } from '@/services/notification.service';
import { logger } from '@/lib/logger';
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      logger.warn({ event: 'auth.register.failed', email: validatedData.email, reason: 'Email already in use' }, 'Registration failed');
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(validatedData.password);
    const verificationToken = generateToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const userRole = await prisma.role.findUnique({
      where: { name: 'user' },
    });

    if (!userRole) {
      return NextResponse.json(
        { error: 'User role not found' },
        { status: 500 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash: hashedPassword,
        name: validatedData.name,
        roleId: userRole.id,
        countryCode: validatedData.countryCode,
        verificationToken,
        verificationTokenExpires,
      },
    });


    // In a real app, send email here
    logger.debug({ event: 'auth.register.token_generated', email: user.email }, `Verification token generated`);

    // Enqueue welcome email notification
    await NotificationService.enqueueEmail(
      user.email,
      'Welcome to Monetchat!',
      `<h1>Welcome, ${user.name}!</h1><p>We are excited to have you on board.</p>`
    );

    // Enqueue system notification for the welcome
    await NotificationService.enqueueSystemNotification(
      user.id,
      'Welcome!',
      'Thank you for registering on Monetchat. Complete your profile to get started.',
      'SYSTEM'
    );

    logger.info({ event: 'auth.register.success', userId: user.id, email: user.email }, 'User registered successfully');

    return NextResponse.json(
      { message: 'User registered successfully. Please verify your email.', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ event: 'auth.register.failed', reason: 'Validation error', errors: error.errors }, 'Registration validation failed');
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    logger.error({ event: 'auth.register.error', err: error }, 'Registration error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
