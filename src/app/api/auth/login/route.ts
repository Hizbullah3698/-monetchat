// User Login API
// POST /api/auth/login

import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { generateToken, setAuthCookie } from '@/lib/auth/jwt';
import { aiLimiter, getIp } from '@/lib/rate-limiter';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 attempts per hour per IP
    const ip = getIp(request);
    await aiLimiter.consume(ip, 1).catch(() => {
      throw Object.assign(new Error('Too many requests'), { isRateLimit: true });
    });

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        seller: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await compare(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Set auth cookie
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        countryCode: user.countryCode,
        preferredLanguage: user.preferredLanguage,
        avatarUrl: user.avatarUrl,
        seller: user.seller
          ? {
              phonePublic: user.seller.phonePublic,
              businessName: user.seller.businessName,
              isVerified: user.seller.isVerified,
            }
          : null,
      },
      token,
    });
  } catch (error) {
    if (error instanceof Error && (error as { isRateLimit?: boolean }).isRateLimit) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    console.error('Login error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
