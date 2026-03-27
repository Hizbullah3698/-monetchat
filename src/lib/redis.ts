import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

// Create a singleton instance
const globalForRedis = global as unknown as { redis: Redis };
let _redis: Redis | null = globalForRedis.redis || null;

export const redis = new Proxy({} as Redis, {
  get: (_target, prop) => {
    // Only initialize if we're not in the build phase
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || process.env.IS_NEXT_BUILD === 'true';
    
    if (!_redis) {
      if (isBuildPhase) {
        // Return dummy functions for common operations during build
        return () => ({ on: () => ({}) });
      }
      
      _redis = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        maxRetriesPerRequest: null, // Required by bullmq
      });

      _redis.on('error', (err: any) => {
        console.error('Redis connection error:', err);
      });

      _redis.on('connect', () => {
        console.log('Redis connected successfully');
      });

      if (process.env.NODE_ENV !== 'production') {
        globalForRedis.redis = _redis;
      }
    }

    if (isBuildPhase) {
      if (prop === 'on') return () => ({});
      return () => {};
    }

    const value = (_redis as any)[prop];
    return typeof value === 'function' ? value.bind(_redis) : value;
  }
});
