// JWT Authentication Utilities
// Using jose library for JWT operations

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const jwtSecretValue = process.env.JWT_SECRET;
if (!jwtSecretValue || jwtSecretValue.length < 32) {
  throw new Error('JWT_SECRET environment variable must be set and at least 32 characters long');
}
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue);
const JWT_ISSUER = 'pickpic';
const JWT_AUDIENCE = 'pickpic-users';
const ACCESS_TOKEN_EXPIRY = '24h';
const COOKIE_NAME = 'auth_token';

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: 'buyer' | 'seller';
}

// Generate JWT token
export async function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp' | 'iss' | 'aud'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

// Set auth cookie
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

// Clear auth cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get token from cookie
export async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

// Get current user from request
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = await getTokenFromCookie();
  if (!token) return null;
  return verifyToken(token);
}

// Middleware helper: require authentication
export async function requireAuth(): Promise<TokenPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

// Middleware helper: require seller role
export async function requireSeller(): Promise<TokenPayload> {
  const user = await requireAuth();
  if (user.role !== 'seller') {
    throw new Error('Forbidden: Seller access required');
  }
  return user;
}
