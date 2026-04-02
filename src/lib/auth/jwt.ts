// JWT Authentication Utilities
// Using jose library for JWT operations

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { AuthenticationError, ForbiddenError } from '@/lib/api/errors/AppError';
import { RoleName, ROLE_SUPER_ADMIN, isRoleAtLeast } from '@/lib/auth/roles';

const jwtSecretValue = process.env.JWT_SECRET;
if (!jwtSecretValue || jwtSecretValue.length < 32) {
  throw new Error('JWT_SECRET environment variable must be set and at least 32 characters long');
}
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue);
const JWT_ISSUER = 'Monetchat';
const JWT_AUDIENCE = 'Monetchat-users';
const ACCESS_TOKEN_EXPIRY = '24h';
const COOKIE_NAME = 'auth_token';

export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  role: RoleName;
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

// Get token from cookie or Authorization header
export async function getToken(req?: Request): Promise<string | null> {
  // 1. Try cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) return token;
  } catch {
    // cookies() might fail outside of Next.js request context
  }

  // 2. Try Authorization header
  if (req) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }

  return null;
}

// Get current user from request
export async function getCurrentUser(req?: Request): Promise<TokenPayload | null> {
  const token = await getToken(req);
  if (!token) return null;
  return verifyToken(token);
}

// Middleware helper: require authentication
export async function requireAuth(req?: Request): Promise<TokenPayload> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new AuthenticationError();
  }
  return user;
}

export async function requireRole(required: RoleName | RoleName[], req?: Request): Promise<TokenPayload> {
  const user = await requireAuth(req);
  const roles = Array.isArray(required) ? required : [required];

  if (user.role === ROLE_SUPER_ADMIN) {
    return user;
  }

  const allowed = roles.some((role) => user.role === role || isRoleAtLeast(user.role, role));
  if (!allowed) {
    throw new ForbiddenError('Insufficient permissions');
  }

  return user;
}

// Middleware helper: require seller role (seller or higher)
export async function requireSeller(req?: Request): Promise<TokenPayload> {
  return requireRole('seller', req);
}
