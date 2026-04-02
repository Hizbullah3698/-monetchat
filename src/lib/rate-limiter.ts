import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter for login and registration attempts
const authRateLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60 * 15, // per 15 minutes
});

// General API rate limiter
const apiRateLimiter = new RateLimiterMemory({
  points: 100, // 100 requests
  duration: 60, // per minute
});

const routeRateLimiters = new Map<string, RateLimiterMemory>();

export interface RouteRateLimitOptions {
  name: string;
  points: number;
  duration: number;
}

export async function checkRateLimit(ip: string, type: 'auth' | 'api' = 'api') {
  const limiter = type === 'auth' ? authRateLimiter : apiRateLimiter;
  
  try {
    await limiter.consume(ip);
    return { allowed: true };
  } catch (rejRes) {
    return { 
      allowed: false, 
      retryAfter: Math.round((rejRes as any).msBeforeNext / 1000) || 60 
    };
  }
}

function getRouteLimiter({ name, points, duration }: RouteRateLimitOptions) {
  const existing = routeRateLimiters.get(name);
  if (existing) {
    return existing;
  }

  const limiter = new RateLimiterMemory({
    points,
    duration,
  });
  routeRateLimiters.set(name, limiter);
  return limiter;
}

export async function checkRouteRateLimit(
  key: string,
  options: RouteRateLimitOptions
) {
  const limiter = getRouteLimiter(options);

  try {
    await limiter.consume(key);
    return { allowed: true as const };
  } catch (rejRes) {
    return {
      allowed: false as const,
      retryAfter: Math.max(
        1,
        Math.round(((rejRes as { msBeforeNext?: number }).msBeforeNext ?? 1000) / 1000)
      ),
    };
  }
}
