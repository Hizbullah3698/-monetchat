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
    let body: Record<string, unknown>;

    // Safely parse the request body
    try {
      body = await req.json();
    } catch (parseErr) {
      // Fallback: try reading as text (in case the stream was consumed by Next.js)
      try {
        const raw = await req.text().catch(() => '');
        if (!raw) {
          return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
        }
        body = JSON.parse(raw);
      } catch {
        return NextResponse.json({ error: 'Invalid request body - please check your input' }, { status: 400 });
      }
    }

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

    let hashedPassword: string;
    try {
      hashedPassword = await hashPassword(validatedData.password);
    } catch(hashErr: any) {
      console.error('[register] hashPassword failed:', hashErr.message);
      throw hashErr;
    }
    const verificationToken = generateToken();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Find or fallback-create the user role
    let userRole = await prisma.role.findUnique({
      where: { name: 'user' },
    });

    if (!userRole) {
      // Auto-create baseline roles if seeding was skipped
      userRole = await prisma.role.upsert({
        where: { name: 'user' },
        update: {},
        create: { name: 'user', description: 'Standard user role' },
      });
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

    // Enqueue welcome email notification (non-fatal if email not configured)
    try {
      await NotificationService.enqueueEmail(
        user.email,
        'Welcome to Monetchat!',
        `<h1>Welcome, ${user.name}!</h1><p>We are excited to have you on board.</p>`
      );
    } catch (notifErr) {
      logger.warn({ event: 'auth.register.email_failed', err: notifErr }, 'Welcome email could not be enqueued, continuing registration');
    }

    // Enqueue system notification for the welcome (non-fatal)
    try {
      await NotificationService.enqueueSystemNotification(
        user.id,
        'Welcome!',
        'Thank you for registering on Monetchat. Complete your profile to get started.',
        'SYSTEM'
      );
    } catch (notifErr) {
      logger.warn({ event: 'auth.register.notif_failed', err: notifErr }, 'System notification could not be enqueued, continuing registration');
    }

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
    console.error('[register] CAUGHT ERROR:', (error as any)?.message ?? String(error), 'code:', (error as any)?.code);
    logger.error({ event: 'auth.register.error', err: error }, 'Registration error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
