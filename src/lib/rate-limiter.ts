
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Global Rate Limiter: 100 requests per minute per IP
export const globalLimiter = new RateLimiterMemory({
    points: 100,
    duration: 60,
});

// AI Rate Limiter: 20 requests per hour per IP
export const aiLimiter = new RateLimiterMemory({
    points: 20,
    duration: 60 * 60,
});

// IP Helper
export function getIp(req: Request) {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
    return ip;
}
