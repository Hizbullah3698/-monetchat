import { RateLimiterMemory } from 'rate-limiter-flexible';
import { NextResponse } from 'next/server';

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
