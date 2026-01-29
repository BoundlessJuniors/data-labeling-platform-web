import { Request, Response, NextFunction } from 'express';
import { cacheGet, cacheSet } from '../lib/redis';
import logger from '../lib/logger';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
}

// Cache middleware for GET requests
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const { ttl = 300, keyPrefix = 'cache' } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${keyPrefix}:${req.originalUrl}`;

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

// Selective cache invalidation middleware
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
