// User Registration API
// POST /api/auth/register

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { generateToken, setAuthCookie } from '@/lib/auth/jwt';
import { aiLimiter, getIp } from '@/lib/rate-limiter';

// Validation schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().max(20).optional(),
  role: z.enum(['buyer', 'seller']).default('buyer'),
  countryCode: z.string().length(2, 'Invalid country code').default('KW'),
  preferredLanguage: z.enum(['en', 'ar']).default('ar'),
  // Seller-specific fields
  phonePublic: z.string().optional(),
  businessName: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 attempts per hour per IP
    const ip = getIp(request);
    await aiLimiter.consume(ip, 1).catch(() => {
      throw Object.assign(new Error('Too many requests'), { isRateLimit: true });
    });

    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hash(validatedData.password, 12);

    // Create user with transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          email: validatedData.email.toLowerCase(),
          passwordHash,
          name: validatedData.name,
          phone: validatedData.phone || null,
          role: validatedData.role,
          countryCode: validatedData.countryCode,
          preferredLanguage: validatedData.preferredLanguage,
        },
      });

      // If seller, create seller profile
      if (validatedData.role === 'seller') {
        if (!validatedData.phonePublic) {
          throw new Error('Phone number is required for sellers');
        }

        await tx.seller.create({
          data: {
            userId: newUser.id,
            phonePublic: validatedData.phonePublic,
            businessName: validatedData.businessName,
          },
        });
      }

      return newUser;
    });

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set auth cookie
    await setAuthCookie(token);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          countryCode: user.countryCode,
          preferredLanguage: user.preferredLanguage,
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && (error as { isRateLimit?: boolean }).isRateLimit) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    console.error('Registration error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
