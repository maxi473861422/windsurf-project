import { createClient } from 'redis';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Connect to Redis
redisClient.connect()
  .then(() => console.log('Redis connected successfully'))
  .catch((err) => {
    console.error('Redis connection error:', err);
    // Don't exit on Redis error, allow app to start without Redis
  });
