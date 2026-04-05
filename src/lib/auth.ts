// Legacy auth compatibility shim
// Routes still importing from @/lib/auth should be migrated to use @/lib/auth/jwt
// This file provides stub exports to prevent build failures

import { getCurrentUser, TokenPayload } from '@/lib/auth/jwt';

export const SESSION_COOKIE_NAME = 'auth_token';

export async function getSession(): Promise<{ user: { id: string; email: string; role: string } } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return {
    user: {
      id: user.userId,
      email: user.email,
      role: user.role,
    },
  };
}

// Stubs for legacy middleware imports (no longer used)
export async function decrypt(_token: string): Promise<{ user: TokenPayload } | null> {
  return null;
}

export async function updateSession(_request: unknown): Promise<void> {
  // No-op - JWT tokens don't need session refresh in middleware
}
