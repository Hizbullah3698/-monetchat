import { redis } from './redis';

export class CacheService {
  /**
   * Get parsed JSON data from cache
   * @param key The cache key
   * @returns The parsed data or null if not found
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Redis Cache Get Error [${key}]:`, error);
      return null;
    }
  }

  /**
   * Set data in cache with a TTL
   * @param key The cache key
   * @param data The data to stringify and store
   * @param ttlSeconds Time-to-live in seconds
   */
  static async set(key: string, data: any, ttlSeconds?: number): Promise<void> {
    try {
      const stringifiedData = JSON.stringify(data);
      if (ttlSeconds) {
        await redis.set(key, stringifiedData, 'EX', ttlSeconds);
      } else {
        await redis.set(key, stringifiedData);
      }
    } catch (error) {
      console.error(`Redis Cache Set Error [${key}]:`, error);
    }
  }

  /**
   * Delete a specific key from cache
   * @param key The cache key to delete
   */
  static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Redis Cache Delete Error [${key}]:`, error);
    }
  }

  /**
   * Delete all keys matching a specific pattern using SCAN for safety
   * @param pattern The pattern to match (e.g., 'products:list:*')
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      console.error(`Redis Cache Invalidate Pattern Error [${pattern}]:`, error);
    }
  }
}
