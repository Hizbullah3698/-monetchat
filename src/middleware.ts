// Next.js Middleware - JWT-based authentication
// Checks auth cookies for protected routes

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'
);
const COOKIE_NAME = 'auth_token';

// Routes that require authentication
const protectedRoutes = ['/account', '/sell', '/messages', '/admin'];

// Routes that require specific roles (admin only - any logged-in user can sell)
const roleRules = [
  { prefix: '/admin', roles: ['seller'] },
];

// Auth pages - redirect to /account if already logged in
const authRoutes = ['/login', '/register', '/forgot-password'];

async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'Monetchat',
      audience: 'Monetchat-users',
    });
    return payload as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));

  // No auth check needed for non-protected, non-auth routes
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  // Get JWT from cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifyJWT(token) : null;

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Role-based access control
  if (user) {
    const requiredRoles = roleRules.find((r) => path.startsWith(r.prefix))?.roles;
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/account';
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/account';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
