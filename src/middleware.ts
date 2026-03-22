import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limiter';

// Add paths that require authentication
const protectedPaths = [
  '/api/user/profile',
  '/api/products/create',
  '/api/products/edit',
  '/api/seller/dashboard',
];

// Add paths that require specific roles
const roleProtectedPaths: Record<string, string[]> = {
  '/api/seller': ['seller'],
  '/api/admin': ['admin'],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

  // Rate limiting for auth routes
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
    const { allowed, retryAfter } = await checkRateLimit(ip, 'auth');
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': retryAfter.toString() } }
      );
    }
  }

  // Check if the path is protected
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const requiredRoles = Object.entries(roleProtectedPaths).find(([path]) => 
    pathname.startsWith(path)
  )?.[1];

  if (isProtected || requiredRoles) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Role-based access control (RBAC)
    if (requiredRoles && !requiredRoles.includes(payload.role as string)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // Pass user info to headers for downstream use
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', payload.role as string);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};
