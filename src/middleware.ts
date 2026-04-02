import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limiter';
import { ROLE_ADMIN, ROLE_SELLER, ROLE_SUPER_ADMIN } from '@/lib/auth/roles';

// Add paths that require authentication
const protectedPaths = [
  '/api/user/profile',
  '/api/products/create',
  '/api/products/edit',
  '/api/seller/dashboard',
];

// Add paths that require specific roles
const roleProtectedPaths: Record<string, string[]> = {
  '/api/seller': [ROLE_SELLER, ROLE_ADMIN, ROLE_SUPER_ADMIN],
  '/api/admin': [ROLE_ADMIN, ROLE_SUPER_ADMIN],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const method = req.method;

  // Edge-safe structured logging matching Pino format
  console.log(JSON.stringify({
    level: 30, // INFO
    time: Date.now(),
    msg: 'Incoming Request',
    method,
    pathname,
    ip
  }));

  // Rate limiting
  if (pathname.startsWith('/api/')) {
    // Stricter rate limiting for auth routes
    if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
      const { allowed, retryAfter } = await checkRateLimit(ip, 'auth');
      if (!allowed) {
        console.log(JSON.stringify({ level: 40, time: Date.now(), msg: 'Rate limit exceeded', ip, type: 'auth' }));
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(retryAfter || 60) } }
        );
      }
    } else {
      // General API rate limiting for all other API routes
      const { allowed, retryAfter } = await checkRateLimit(ip, 'api');
      if (!allowed) {
        console.log(JSON.stringify({ level: 40, time: Date.now(), msg: 'Rate limit exceeded', ip, type: 'api' }));
        return NextResponse.json(
          { error: 'Too many requests. Please slow down.' },
          { status: 429, headers: { 'Retry-After': String(retryAfter || 60) } }
        );
      }
    }
  }

  // Handle CORS preflight explicitly here just to be safe (optional if handled in config)
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
        'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      },
    });
  }

  // Check if the path is protected
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const requiredRoles = Object.entries(roleProtectedPaths).find(([path]) => 
    pathname.startsWith(path)
  )?.[1];

  if (isProtected || requiredRoles) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(JSON.stringify({ level: 40, time: Date.now(), msg: 'Missing or invalid Auth header', ip, pathname }));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token);

    if (!payload) {
      console.log(JSON.stringify({ level: 40, time: Date.now(), msg: 'Invalid or expired token', ip, pathname }));
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Role-based access control (RBAC)
    const userRole = payload.role as string;
    const isSuperAdmin = userRole === ROLE_SUPER_ADMIN;

    if (requiredRoles && !isSuperAdmin && !requiredRoles.includes(userRole)) {
      console.log(JSON.stringify({ level: 40, time: Date.now(), msg: 'Forbidden: Insufficient permissions', ip, pathname, userRole, requiredRoles }));
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
