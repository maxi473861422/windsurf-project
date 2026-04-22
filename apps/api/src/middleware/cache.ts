import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../index';
import { redisCircuitBreaker } from '../utils/circuitBreaker';

interface CacheConfig {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
  skipCache?: (req: Request) => boolean;
}

const defaultConfig: CacheConfig = {
  ttl: 300, // 5 minutes default
  keyPrefix: 'cache',
};

export function cacheMiddleware(config: CacheConfig = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if configured to do so
    if (finalConfig.skipCache && finalConfig.skipCache(req)) {
      return next();
    }

    // Skip caching if user is authenticated (personalized content)
    if ((req as any).user) {
      return next();
    }

    const cacheKey = `${finalConfig.keyPrefix}:${req.originalUrl}`;

    try {
      // Try to get from cache with circuit breaker
      const cachedResponse = await redisCircuitBreaker.execute(
        async () => {
          const isConnected = redisClient.isOpen;
          if (!isConnected) {
            await redisClient.connect();
          }
          return redisClient.get(cacheKey);
        },
        async () => undefined // Fallback: return undefined if circuit is open
      );

      if (cachedResponse) {
        const data = JSON.parse(cachedResponse);
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Age', `${Math.floor((Date.now() - data.timestamp) / 1000)}s`);
        return res.json(data.body);
      }

      res.set('X-Cache', 'MISS');

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function (body: any) {
        const cacheData = {
          timestamp: Date.now(),
          body,
        };

        // Cache the response asynchronously (don't wait)
        redisCircuitBreaker.execute(
          async () => {
            try {
              const isConnected = redisClient.isOpen;
              if (!isConnected) {
                await redisClient.connect();
              }
              await redisClient.setEx(cacheKey, finalConfig.ttl!, JSON.stringify(cacheData));
            } catch (error) {
              console.error('Failed to cache response:', error);
            }
          },
          async () => {
            // Fallback: do nothing if circuit is open
          }
        );

        return originalJson(body);
      };

      next();
    } catch (error) {
      // If caching fails, continue without caching
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

// Cache invalidation helper
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.error('Failed to invalidate cache:', error);
  }
}

// Cache invalidation middleware for write operations
export function cacheInvalidator(pattern: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await invalidateCache(pattern);
      }
    });
    next();
  };
}
