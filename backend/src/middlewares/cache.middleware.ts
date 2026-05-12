import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet } from '../lib/redis';
import logger from '../lib/logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
}

/**
 * Build a canonical URL string for use in cache keys.
 * Sorts query parameters alphabetically so that these two URLs
 * produce the same key:
 *   /api/v1/listings?page=1&status=open
 *   /api/v1/listings?status=open&page=1
 */
function buildCanonicalUrl(req: Request): string {
  const url = new URL(req.originalUrl, 'http://cache.local');
  const path = url.pathname;

  const entries = Array.from(url.searchParams.entries()).sort(([keyA, valueA], [keyB, valueB]) => {
    const keyCompare = keyA.localeCompare(keyB);
    return keyCompare !== 0 ? keyCompare : valueA.localeCompare(valueB);
  });

  if (entries.length === 0) {
    return path;
  }

  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return `${path}?${query}`;
}

// Cache middleware for GET requests
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const { ttl = 300, keyPrefix = 'cache' } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Build a user-aware (userId + role) and canonical cache key to prevent
    // cross-user and cross-role cache leakage.
    //
    // Authenticated:  cache:u:<userId>:r:<role>:/api/v1/...
    // Anonymous:      cache:anon:/api/v1/...
    //
    // The role segment ensures that if a user's role changes (e.g. admin → client)
    // their old role's cached response is not returned after the change.
    const user = (req as any).user as { id?: string; role?: string } | undefined;
    const userSegment = user?.id ? `u:${user.id}:r:${user.role ?? 'unknown'}` : 'anon';
    const canonicalUrl = buildCanonicalUrl(req);
    const cacheKey = `${keyPrefix}:${userSegment}:${canonicalUrl}`;

    try {
      const cachedData = await cacheGet<any>(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit: ${cacheKey}`);
        res.json(cachedData);
        return;
      }

      logger.debug(`Cache miss: ${cacheKey}`);

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = ((data: any) => {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheSet(cacheKey, data, ttl).catch((error) => {
            logger.error(`Failed to cache response: ${error}`);
          });
        }
        return originalJson(data);
      }) as Response['json'];

      next();
    } catch (error) {
      logger.error(`Cache middleware error: ${error}`);
      next();
    }
  };
};

/**
 * Route-level cache invalidation middleware.
 *
 * IMPORTANT: Patterns supplied here MUST use the new wildcard format:
 *   'cache:*:/api/v1/<resource>*'
 * The old format 'cache:/api/v1/<resource>*' is DEPRECATED and will not
 * match the current user-aware key structure.
 *
 * Prefer moving invalidation into the service layer (await invalidateApiCache(…))
 * so that the cache is cleared synchronously before the response is sent.
 */
export const invalidateCache = (keyPatterns: string[]) => {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original send to invalidate cache after successful response
    const originalSend = res.send.bind(res);

    res.send = ((body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Import dynamically to avoid circular dependency
        import('../lib/redis').then(({ cacheDeletePattern }) => {
          keyPatterns.forEach((pattern) => {
            cacheDeletePattern(pattern).catch((error) => {
              logger.error(`Failed to invalidate cache: ${error}`);
            });
          });
        });
      }
      return originalSend(body);
    }) as Response['send'];

    next();
  };
};
