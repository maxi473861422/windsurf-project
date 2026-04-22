import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { redisClient } from '../index';
import crypto from 'crypto';

/**
 * Helper function to ensure Redis is connected before operations
 */
async function ensureRedisConnected(): Promise<boolean> {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    return true;
  } catch (error) {
    console.error('Redis connection error:', error);
    return false;
  }
}

/**
 * Generate a secure CSRF token
 */
function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store CSRF token in Redis
 */
async function storeCSRFToken(sessionId: string, token: string): Promise<boolean> {
  try {
    const isConnected = await ensureRedisConnected();
    if (!isConnected) {
      return false;
    }
    const key = `csrf:${sessionId}`;
    await redisClient.setEx(key, 3600, token); // 1 hour expiry
    return true;
  } catch (error) {
    console.error('Error storing CSRF token:', error);
    return false;
  }
}

/**
 * Verify CSRF token
 */
async function verifyCSRFToken(sessionId: string, token: string): Promise<boolean> {
  try {
    const isConnected = await ensureRedisConnected();
    if (!isConnected) {
      // Si Redis no está disponible, en desarrollo permitir sin verificar
      if (process.env.NODE_ENV === 'development') {
        return true;
      }
      return false;
    }
    const key = `csrf:${sessionId}`;
    const storedToken = await redisClient.get(key);
    if (!storedToken) {
      return false;
    }
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(storedToken, 'hex'),
      Buffer.from(token, 'hex')
    );
  } catch (error) {
    console.error('Error verifying CSRF token:', error);
    return false;
  }
}

/**
 * Middleware de seguridad mejorado para producción
 */

// Configuración de Helmet optimizada
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// Prevención de scraping con User-Agent analysis
export const antiScraping = async (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.socket.remoteAddress || 'unknown';

  // Lista de User-Agents sospechosos (bots de scraping)
  const suspiciousPatterns = [
    /bot/i,
    /crawl/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /headless/i,
    /phantom/i,
    /selenium/i,
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

  if (isSuspicious) {
    // Verificar conexión Redis
    const isConnected = await ensureRedisConnected();
    if (!isConnected) {
      // Si Redis no está disponible, permitir el request pero loggear
      console.warn('Redis unavailable, skipping anti-scraping check');
      return next();
    }

    // Verificar si está en lista negra
    const blacklistKey = `blacklist:ip:${ip}`;
    const isBlacklisted = await redisClient.exists(blacklistKey);

    if (isBlacklisted) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Incrementar contador de requests sospechosos
    const suspiciousKey = `suspicious:ip:${ip}`;
    const count = await redisClient.incr(suspiciousKey);
    await redisClient.expire(suspiciousKey, 3600); // 1 hora

    // Si hay muchos requests sospechosos, agregar a blacklist temporal
    if (count > 100) {
      await redisClient.setEx(blacklistKey, 86400, '1'); // 24 horas
      return res.status(403).json({ error: 'Too many suspicious requests' });
    }

    // Agregar header para dificultar scraping
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }

  next();
};

// Validación de Content-Type
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      return next();
    }

    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      return res.status(415).json({ error: 'Content-Type header is required' });
    }

    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    
    if (!isAllowed) {
      return res.status(415).json({ 
        error: 'Unsupported Media Type',
        allowedTypes,
      });
    }

    next();
  };
};

// Validación de tamaño de payload
export const validatePayloadSize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSize) {
      return res.status(413).json({ 
        error: 'Payload Too Large',
        maxSize: `${maxSize} bytes`,
      });
    }

    next();
  };
};

// Sanitización de input básica
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Remover propiedades sospechosas
        if (key.includes('$') || key.includes('.')) {
          continue;
        }
        sanitized[key] = sanitize(obj[key]);
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }

  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};

// CORS configurado para producción
export const corsConfig = {
  origin: (origin: string | undefined, callback: any) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://gsdatlas.com',
    ];

    if (!origin) {
      // Allow requests without origin (mobile apps, curl, etc.)
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 horas
};

// Headers de seguridad adicionales
export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevenir clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevenir MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Server info (ocultar versión)
  res.removeHeader('X-Powered-By');
  
  next();
};

// Validación de API Key para endpoints sensibles
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    // Si no hay API key configurada, permitir (modo desarrollo)
    return next();
  }

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
};

// IP Whitelisting
export const ipWhitelist = (allowedIPs: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured
    }

    const ip = req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
    const ipWithoutPort = ip.split(':').pop() || ip;

    if (!allowedIPs.includes(ipWithoutPort)) {
      return res.status(403).json({ error: 'IP not whitelisted' });
    }

    next();
  };
};

// IP Blacklisting
export const ipBlacklist = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
  const ipWithoutPort = ip.split(':').pop() || ip;
  const blacklistKey = `blacklist:ip:${ipWithoutPort}`;

  const isConnected = await ensureRedisConnected();
  if (!isConnected) {
    // Si Redis no está disponible, permitir el request
    return next();
  }

  const isBlacklisted = await redisClient.exists(blacklistKey);

  if (isBlacklisted) {
    return res.status(403).json({ error: 'IP is blacklisted' });
  }

  next();
};

// Add IP to blacklist
export const addToBlacklist = async (ip: string, duration: number = 86400) => {
  const ipWithoutPort = ip.split(':').pop() || ip;
  const blacklistKey = `blacklist:ip:${ipWithoutPort}`;
  await redisClient.setEx(blacklistKey, duration, '1');
};

// Remove IP from blacklist
export const removeFromBlacklist = async (ip: string) => {
  const ipWithoutPort = ip.split(':').pop() || ip;
  const blacklistKey = `blacklist:ip:${ipWithoutPort}`;
  await redisClient.del(blacklistKey);
};

// Brute force protection
export const bruteForceProtection = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
  const ipWithoutPort = ip.split(':').pop() || ip;
  const path = req.path;

  // Only protect sensitive endpoints
  const sensitiveEndpoints = ['/auth/login', '/auth/register', '/auth/forgot-password'];
  if (!sensitiveEndpoints.some(endpoint => path.startsWith(endpoint))) {
    return next();
  }

  const attemptsKey = `attempts:${path}:${ipWithoutPort}`;
  const lockoutKey = `lockout:${path}:${ipWithoutPort}`;

  const isConnected = await ensureRedisConnected();
  if (!isConnected) {
    // Si Redis no está disponible, permitir el request pero loggear
    console.warn('Redis unavailable, skipping brute force protection');
    return next();
  }

  // Check if IP is locked out
  const isLockedOut = await redisClient.exists(lockoutKey);
  if (isLockedOut) {
    const ttl = await redisClient.ttl(lockoutKey);
    return res.status(429).json({
      error: 'Too many failed attempts. Account locked.',
      retryAfter: ttl,
    });
  }

  // Increment attempt counter
  const attempts = await redisClient.incr(attemptsKey);
  await redisClient.expire(attemptsKey, 900); // 15 minutes

  // Lock out after 5 failed attempts
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
  if (attempts >= maxAttempts) {
    await redisClient.setEx(lockoutKey, 3600, '1'); // Lock for 1 hour
    return res.status(429).json({
      error: 'Too many failed attempts. Account locked for 1 hour.',
    });
  }

  // Add remaining attempts header
  res.setHeader('X-RateLimit-Remaining', maxAttempts - attempts);

  next();
};

// Clear failed attempts on successful authentication
export const clearFailedAttempts = async (ip: string, path: string) => {
  const ipWithoutPort = ip.split(':').pop() || ip;
  const attemptsKey = `attempts:${path}:${ipWithoutPort}`;
  await redisClient.del(attemptsKey);
};

// Cookie security configuration
export const cookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: '/',
};

// Enhanced CORS configuration
export const enhancedCorsConfig = {
  origin: (origin: string | undefined, callback: any) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [
      'http://localhost:3000',
      'https://gsdatlas.com',
      'https://www.gsdatlas.com',
      'https://staging.gsdatlas.com',
    ];

    // Allow requests without origin (mobile apps, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.some(allowed => {
      // Exact match
      if (allowed === origin) return true;
      
      // Wildcard subdomain support
      if (allowed.includes('*')) {
        const pattern = allowed.replace('*', '.*');
        const regex = new RegExp(pattern);
        return regex.test(origin);
      }
      
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Total-Count',
  ],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204,
};

// Rate limiting per endpoint
export const rateLimiterByEndpoint = (limits: { [key: string]: { windowMs: number; max: number } }) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
    const ipWithoutPort = ip.split(':').pop() || ip;
    const path = req.path;

    // Find matching limit
    let limit = null;
    for (const pattern in limits) {
      if (path.startsWith(pattern)) {
        limit = limits[pattern];
        break;
      }
    }

    // No limit configured for this endpoint
    if (!limit) {
      return next();
    }

    const isConnected = await ensureRedisConnected();
    if (!isConnected) {
      // Si Redis no está disponible, permitir el request
      return next();
    }

    const key = `ratelimit:${path}:${ipWithoutPort}`;
    const current = await redisClient.incr(key);

    if (current === 1) {
      await redisClient.expire(key, Math.ceil(limit.windowMs / 1000));
    }

    if (current > limit.max) {
      const ttl = await redisClient.ttl(key);
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: ttl,
      });
    }

    res.setHeader('X-RateLimit-Limit', limit.max);
    res.setHeader('X-RateLimit-Remaining', limit.max - current);
    res.setHeader('X-RateLimit-Reset', ttl || limit.windowMs / 1000);

    next();
  };
};

// Default rate limits per endpoint
export const defaultRateLimits = {
  '/auth/': { windowMs: 15 * 60 * 1000, max: 5 }, // 5 requests per 15 min
  '/search/': { windowMs: 60 * 1000, max: 30 }, // 30 requests per minute
  '/api/dogs': { windowMs: 15 * 60 * 1000, max: 200 }, // 200 requests per 15 min
  '/import/': { windowMs: 60 * 60 * 1000, max: 10 }, // 10 requests per hour
  '/admin/': { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 min
};

// Request logging for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const path = req.path;
  const method = req.method;

  // Log suspicious activity
  if (path.includes('admin') || path.includes('import')) {
    console.log(`[SECURITY] ${method} ${path} from ${ip} - ${userAgent}`);
  }

  next();
};

// Validate file uploads
export const validateFileUpload = (allowedMimeTypes: string[], maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next();
    }

    const file = req.file;

    // Check file type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(415).json({
        error: 'Invalid file type',
        allowedTypes: allowedMimeTypes,
      });
    }

    // Check file size
    if (file.size > maxSize) {
      return res.status(413).json({
        error: 'File too large',
        maxSize: `${maxSize} bytes`,
      });
    }

    next();
  };
};

// CSRF protection (improved implementation)
export const csrfProtection = async (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, and OPTIONS requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] as string;
  const sessionToken = req.headers['authorization']?.split(' ')[1];

  if (!csrfToken) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  if (!sessionToken) {
    return res.status(403).json({ error: 'Session token missing' });
  }

  // Use session token as session ID for CSRF storage
  const sessionId = sessionToken;

  // Verify CSRF token
  const isValid = await verifyCSRFToken(sessionId, csrfToken);

  if (!isValid) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};

// Generate CSRF token for a session
export const generateCSRFTokenForSession = async (sessionId: string): Promise<string | null> => {
  const token = generateCSRFToken();
  const stored = await storeCSRFToken(sessionId, token);
  return stored ? token : null;
};

// Security audit middleware
export const securityAudit = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Continue with request
  next();

  // Log after response
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const ip = req.socket.remoteAddress || req.connection.remoteAddress || 'unknown';
    const path = req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Log security-relevant events
    if (statusCode >= 400 || duration > 5000) {
      const isConnected = await ensureRedisConnected();
      if (!isConnected) {
        // Si Redis no está disponible, loggear a console en su lugar
        console.warn('Redis unavailable, logging audit to console', {
          timestamp: new Date().toISOString(),
          ip,
          path,
          method,
          statusCode,
          duration,
        });
        return;
      }

      const auditKey = `audit:${new Date().toISOString().split('T')[0]}`;
      const auditData = {
        timestamp: new Date().toISOString(),
        ip,
        path,
        method,
        statusCode,
        duration,
        userAgent: req.headers['user-agent'],
      };

      await redisClient.lpush(auditKey, JSON.stringify(auditData));
      await redisClient.expire(auditKey, 30 * 24 * 60 * 60); // 30 days
    }
  });
};
