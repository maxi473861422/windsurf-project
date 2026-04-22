import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../index';
import { redisCircuitBreaker } from '../utils/circuitBreaker';

export interface UserRateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;    // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean;     // Skip counting failed requests
}

const defaultConfig: UserRateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 200,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
};

/**
 * User-based rate limiting middleware
 * Limits requests per user ID instead of per IP
 */
export function userRateLimit(config: Partial<UserRateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.userId;

    // Skip if no authenticated user
    if (!userId) {
      return next();
    }

    const key = `ratelimit:user:${userId}`;
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    try {
      // Use circuit breaker for Redis operations
      const result = await redisCircuitBreaker.execute(
        async () => {
          const isConnected = redisClient.isOpen;
          if (!isConnected) {
            await redisClient.connect();
          }

          // Get current request count
          const count = await redisClient.incr(key);

          // Set expiry on first request in window
          if (count === 1) {
            await redisClient.expire(key, Math.ceil(finalConfig.windowMs / 1000));
          }

          return count;
        },
        async () => {
          // Fallback: allow request if Redis is unavailable
          return 1;
        }
      );

      if (result > finalConfig.maxRequests) {
        const ttl = await redisClient.ttl(key);
        const resetTime = now + (ttl * 1000);

        res.setHeader('X-RateLimit-Limit', finalConfig.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', resetTime.toString());

        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil(ttl / 60)} minutes.`,
        });
      }

      // Set rate limit headers
      const remaining = finalConfig.maxRequests - result;
      const ttl = await redisClient.ttl(key);
      const resetTime = now + (ttl * 1000);

      res.setHeader('X-RateLimit-Limit', finalConfig.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', remaining.toString());
      res.setHeader('X-RateLimit-Reset', resetTime.toString());

      // Track request for skip logic
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 400;

        // Decrement if we should skip this type of request
        if (
          (finalConfig.skipSuccessfulRequests && isSuccess) ||
          (finalConfig.skipFailedRequests && !isSuccess)
        ) {
          redisCircuitBreaker.execute(
            async () => {
              await redisClient.decr(key);
            },
            async () => {}
          );
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('User rate limit error:', error);
      // Allow request if rate limiting fails
      next();
    }
  };
}

/**
 * Role-based rate limiting
 * Different limits for different user roles
 */
export function roleBasedRateLimit(roleLimits: Record<string, Partial<UserRateLimitConfig>>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;

    if (!userRole) {
      return next();
    }

    const config = roleLimits[userRole] || defaultConfig;
    const middleware = userRateLimit(config);
    middleware(req, res, next);
  };
}

/**
 * Get user rate limit status
 */
export async function getUserRateLimitStatus(userId: string): Promise<{
  used: number;
  remaining: number;
  reset: number;
}> {
  const key = `ratelimit:user:${userId}`;

  try {
    const count = await redisCircuitBreaker.execute(
      async () => {
        const isConnected = redisClient.isOpen;
        if (!isConnected) {
          await redisClient.connect();
        }
        const c = await redisClient.get(key);
        return c ? parseInt(c, 10) : 0;
      },
      async () => 0
    );

    const ttl = await redisCircuitBreaker.execute(
      async () => {
        const isConnected = redisClient.isOpen;
        if (!isConnected) {
          await redisClient.connect();
        }
        return redisClient.ttl(key);
      },
      async () => 0
    );

    return {
      used: count,
      remaining: Math.max(0, defaultConfig.maxRequests - count),
      reset: Date.now() + (ttl * 1000),
    };
  } catch (error) {
    console.error('Failed to get user rate limit status:', error);
    return {
      used: 0,
      remaining: defaultConfig.maxRequests,
      reset: Date.now() + defaultConfig.windowMs,
    };
  }
}

/**
 * Reset user rate limit
 */
export async function resetUserRateLimit(userId: string): Promise<void> {
  const key = `ratelimit:user:${userId}`;

  try {
    await redisCircuitBreaker.execute(
      async () => {
        const isConnected = redisClient.isOpen;
        if (!isConnected) {
          await redisClient.connect();
        }
        await redisClient.del(key);
      },
      async () => {}
    );
  } catch (error) {
    console.error('Failed to reset user rate limit:', error);
  }
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  standard: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 200,
  },
  authenticated: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 500,
  },
  admin: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 1000,
  },
  breeder: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 300,
  },
  search: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
  import: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  },
  pedigree: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 100,
  },
};
