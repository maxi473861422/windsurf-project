import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import redis from 'redis';
import multer from 'multer';

import { authRoutes } from './routes/auth';
import { dogRoutes as dogsRoutes } from './routes/dogs';
import { pedigreeRoutes } from './routes/pedigree';
import { breedingRoutes } from './routes/breeding';
import { wordpressRoutes } from './routes/wordpress';
import { organizationRoutes } from './routes/organizations';
import { breederRoutes } from './routes/breeders';
import { showRoutes } from './routes/shows';
import { titleRoutes } from './routes/titles';
import { photoRoutes } from './routes/photos';
import { importRoutes } from './routes/import';
import { healthRoutes } from './routes/health';
import { errorHandler } from './middleware/errorHandler';

// Production optimization imports
import { 
  securityHeaders, 
  antiScraping, 
  additionalSecurityHeaders,
  corsConfig 
} from './middleware/security';
import { 
  standardRateLimiter, 
  authRateLimiter, 
  importRateLimiter,
  searchRateLimiter 
} from './middleware/rateLimiter';
import { logger, LogLevel } from './utils/logger';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Database
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Redis
export const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Connect to Redis
redisClient.connect().catch(console.error);

// Production middleware stack
if (process.env.NODE_ENV === 'production') {
  // Security headers
  app.use(securityHeaders);
  app.use(additionalSecurityHeaders);
  
  // Anti-scraping
  app.use(antiScraping);
  
  // Structured logging
  app.use(logger.httpLogger());
} else {
  // Development logging
  app.use(morgan('dev'));
}

// CORS with production config
app.use(cors(corsConfig));

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Make prisma, redis, and upload available globally
app.locals.prisma = prisma;
app.locals.redis = redisClient;
app.locals.upload = upload;

// Rate limiting by route
app.use('/api/auth', authRateLimiter.middleware());
app.use('/api/dogs/search', searchRateLimiter.middleware());
app.use('/api/import', importRateLimiter.middleware());
app.use('/api', standardRateLimiter.middleware());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dogs', dogsRoutes);
app.use('/api/pedigree', pedigreeRoutes);
app.use('/api/breeding', breedingRoutes);
app.use('/api/wordpress', wordpressRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/breeders', breederRoutes);
app.use('/api/health-records', healthRoutes);
app.use('/api/show-results', showRoutes);
app.use('/api/titles', titleRoutes);
app.use('/api/photos', upload.single('photo'), photoRoutes);
app.use('/api/import', upload.single('file'), importRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics endpoint (production only)
if (process.env.NODE_ENV === 'production') {
  app.get('/metrics', async (req, res) => {
    try {
      const stats = {
        cache: {
          logs: await logger.getLogStats(LogLevel.INFO, 1),
          errors: await logger.getLogStats(LogLevel.ERROR, 1),
        },
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });
}

// Error handling with logging
app.use(logger.errorLogger());
app.use(errorHandler);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`GSD Atlas API running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  await redisClient.quit();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal('Unhandled rejection', reason as Error, { promise });
  process.exit(1);
});

export { app };
