import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../index';

/**
 * Sistema de Rate Limiting para prevenir scraping abusivo
 * Usa Redis para almacenar contadores de requests por IP
 */

interface RateLimitOptions {
  windowMs: number; // Ventana de tiempo en milisegundos
  maxRequests: number; // Máximo de requests permitidos
  skipSuccessfulRequests?: boolean; // No contar requests exitosos
  skipFailedRequests?: boolean; // No contar requests fallidos
  message?: string; // Mensaje de error personalizado
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  reset: Date;
}

declare module 'express' {
  interface Request {
    rateLimit?: RateLimitInfo;
  }
}

export class RateLimiter {
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = {
      windowMs: 15 * 60 * 1000, // 15 minutos por defecto
      maxRequests: 100, // 100 requests por defecto
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later.',
      ...options,
    };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ip = this.getClientIP(req);
        const key = `ratelimit:${ip}:${this.options.windowMs}`;

        const current = await redisClient.incr(key);
        
        if (current === 1) {
          await redisClient.expire(key, Math.ceil(this.options.windowMs / 1000));
        }

        const remaining = Math.max(0, this.options.maxRequests - current);
        const reset = new Date(Date.now() + this.options.windowMs);

        req.rateLimit = {
          limit: this.options.maxRequests,
          current,
          remaining,
          reset,
        };

        // Agregar headers de rate limit
        res.setHeader('X-RateLimit-Limit', this.options.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', remaining.toString());
        res.setHeader('X-RateLimit-Reset', reset.getTime().toString());

        if (current > this.options.maxRequests) {
          // Decrementar si el request es exitoso y skipSuccessfulRequests es true
          if (this.options.skipSuccessfulRequests) {
            res.on('finish', async () => {
              if (res.statusCode < 400) {
                await redisClient.decr(key);
              }
            });
          }

          return res.status(429).json({
            error: this.options.message,
            retryAfter: Math.ceil(this.options.windowMs / 1000),
          });
        }

        // Skip counting based on response
        if (this.options.skipSuccessfulRequests || this.options.skipFailedRequests) {
          res.on('finish', async () => {
            if (this.options.skipSuccessfulRequests && res.statusCode < 400) {
              await redisClient.decr(key);
            }
            if (this.options.skipFailedRequests && res.statusCode >= 400) {
              await redisClient.decr(key);
            }
          });
        }

        next();
      } catch (error) {
        // Si Redis falla, permitir el request (fail-open)
        console.error('Rate limiter error:', error);
        next();
      }
    };
  }

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}

// Predefined rate limiters para diferentes casos de uso
export const strictRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 50, // 50 requests
  message: 'Too many requests from this IP, please try again later.',
});

export const standardRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 200, // 200 requests
  message: 'Rate limit exceeded, please try again later.',
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 5, // 5 requests (para login/register)
  message: 'Too many authentication attempts, please try again later.',
});

export const importRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hora
  maxRequests: 10, // 10 imports por hora
  message: 'Import limit exceeded, please try again later.',
});

export const searchRateLimiter = new RateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minuto
  maxRequests: 30, // 30 searches por minuto
  message: 'Search rate limit exceeded, please try again later.',
});

export default RateLimiter;
