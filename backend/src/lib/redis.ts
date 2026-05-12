import Redis from 'ioredis';
import logger from './logger';

const REDIS_URL = process.env.REDIS_URL;

export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
};

// Create connection
export const redis = REDIS_URL 
  ? new Redis(REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: true })
  : new Redis({
      ...redisConfig,
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Don't connect until first command
    });

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

// Helper functions for caching
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    return null;
  }
};

export const cacheSet = async (
  key: string, 
  value: unknown, 
  ttlSeconds: number = 300
): Promise<void> => {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
  }
};

export const cacheDelete = async (key: string): Promise<void> => {
  try {
    await redis.del(key);
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
  }
};

/**
 * Delete all Redis keys matching `pattern` using cursor-based SCAN.
 * Avoids the production-blocking KEYS command.
 * Silently succeeds if no keys match; logs errors without crashing.
 */
export const cacheDeletePattern = async (pattern: string): Promise<void> => {
  try {
    let cursor = '0';
    do {
      // SCAN cursor MATCH pattern COUNT 200
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (error) {
    logger.error(`Cache delete pattern error for ${pattern}:`, error);
  }
};

/**
 * Invalidate all cache entries for a given API resource path.
 *
 * Covers both authenticated (user/role-aware) and anonymous cache keys:
 *   cache:u:<userId>:r:<role>:/api/v1/<path>...
 *   cache:anon:/api/v1/<path>...
 *
 * Usage:
 *   await invalidateApiCache('/api/v1/listings');
 *   await invalidateApiCache('/api/v1/datasets');
 *   await invalidateApiCache('/api/v1/labelsets');
 *   await invalidateApiCache('/api/v1/assets');
 */
export const invalidateApiCache = async (resourcePath: string): Promise<void> => {
  // Wildcard matches all users, all roles, all query variants
  await cacheDeletePattern(`cache:*:${resourcePath}*`);
};

export default redis;
