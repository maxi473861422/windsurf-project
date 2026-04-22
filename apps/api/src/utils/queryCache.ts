/**
 * Complex Query Caching Utility
 * Manages caching of expensive database queries using cache tables
 */

import { redisClient } from '../index';
import { redisCircuitBreaker } from './circuitBreaker';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

/**
 * Cache configuration for different query types
 */
export const CACHE_CONFIG = {
  pedigree: {
    ttl: 86400, // 24 hours
    keyPrefix: 'pedigree',
  },
  coi: {
    ttl: 86400, // 24 hours
    keyPrefix: 'coi',
  },
  commonAncestors: {
    ttl: 86400, // 24 hours
    keyPrefix: 'common_ancestors',
  },
  descendants: {
    ttl: 3600, // 1 hour
    keyPrefix: 'descendants',
  },
  linebreeding: {
    ttl: 86400, // 24 hours
    keyPrefix: 'linebreeding',
  },
  breederRankings: {
    ttl: 7200, // 2 hours
    keyPrefix: 'breeder_rankings',
  },
  statistics: {
    ttl: 3600, // 1 hour
    keyPrefix: 'statistics',
  },
};

/**
 * Generate cache key for a query
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
  return `${prefix}:${Buffer.from(paramString).toString('base64')}`;
}

/**
 * Get cached data from Redis
 */
export async function getCachedData<T>(
  prefix: string,
  params: Record<string, any>
): Promise<T | null> {
  const key = generateCacheKey(prefix, params);
  
  try {
    const cached = await redisCircuitBreaker.execute(
      async () => {
        const isConnected = redisClient.isOpen;
        if (!isConnected) {
          await redisClient.connect();
        }
        return redisClient.get(key);
      },
      async () => null
    );
    
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl * 1000) {
      await redisClient.del(key);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error('Failed to get cached data:', error);
    return null;
  }
}

/**
 * Set cached data in Redis
 */
export async function setCachedData<T>(
  prefix: string,
  params: Record<string, any>,
  data: T,
  ttl: number,
  tags?: string[]
): Promise<void> {
  const key = generateCacheKey(prefix, params);
  
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl,
    tags,
  };
  
  try {
    await redisCircuitBreaker.execute(
      async () => {
        const isConnected = redisClient.isOpen;
        if (!isConnected) {
          await redisClient.connect();
        }
        await redisClient.setEx(key, ttl, JSON.stringify(entry));
        
        // Add to tag sets for invalidation
        if (tags && tags.length > 0) {
          const tagKeys = tags.map(tag => `cache:tag:${tag}`);
          await Promise.all(
            tagKeys.map(tagKey => redisClient.sAdd(tagKey, key))
          );
          await Promise.all(
            tagKeys.map(tagKey => redisClient.expire(tagKey, ttl))
          );
        }
      },
      async () => {
        // Fallback: do nothing if circuit is open
      }
    );
  } catch (error) {
    console.error('Failed to set cached data:', error);
  }
}

/**
 * Invalidate cache by key pattern
 */
export async function invalidateCacheByPattern(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      // @ts-ignore - Redis del with spread operator
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.error('Failed to invalidate cache by pattern:', error);
  }
}

/**
 * Invalidate cache by tags
 */
export async function invalidateCacheByTags(tags: string[]): Promise<void> {
  try {
    const tagKeys = tags.map(tag => `cache:tag:${tag}`);
    const allKeys: string[] = [];
    
    for (const tagKey of tagKeys) {
      const members = await redisClient.sMembers(tagKey);
      allKeys.push(...members);
    }
    
    if (allKeys.length > 0) {
      // @ts-ignore - Redis del with spread operator
      await redisClient.del(...allKeys);
    }
  } catch (error) {
    console.error('Failed to invalidate cache by tags:', error);
  }
}

/**
 * Memoization decorator for expensive functions
 */
export function memoize<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    ttl: number;
    prefix: string;
    keyGenerator?: (...args: Parameters<T>) => string;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const key = options.keyGenerator
      ? options.keyGenerator(...args)
      : generateCacheKey(options.prefix, { args });
    
    // Try to get from cache
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        const entry: CacheEntry<ReturnType<T>> = JSON.parse(cached);
        if (Date.now() <= entry.timestamp + entry.ttl * 1000) {
          return entry.data;
        }
      }
    } catch (error) {
      console.error('Cache read failed:', error);
    }
    
    // Execute function
    const result = await fn(...args);
    
    // Cache result
    try {
      const entry: CacheEntry<ReturnType<T>> = {
        data: result,
        timestamp: Date.now(),
        ttl: options.ttl,
      };
      await redisClient.setEx(key, options.ttl, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache write failed:', error);
    }
    
    return result;
  }) as T;
}

/**
 * Cache statistics
 */
export async function getCacheStats(prefix: string): Promise<{
  totalKeys: number;
  hitRate: number;
  avgAge: number;
}> {
  try {
    const keys = await redisClient.keys(`${prefix}:*`);
    const totalKeys = keys.length;
    
    if (totalKeys === 0) {
      return { totalKeys: 0, hitRate: 0, avgAge: 0 };
    }
    
    let totalAge = 0;
    let hits = 0;
    
    for (const key of keys) {
      const cached = await redisClient.get(key);
      if (cached) {
        const entry: CacheEntry<any> = JSON.parse(cached);
        totalAge += Date.now() - entry.timestamp;
        hits++;
      }
    }
    
    return {
      totalKeys,
      hitRate: hits / totalKeys,
      avgAge: totalAge / hits,
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return { totalKeys: 0, hitRate: 0, avgAge: 0 };
  }
}

/**
 * Warm up cache for frequently accessed data
 */
export async function warmUpCache<T>(
  queries: Array<{
    params: Record<string, any>;
    fetcher: () => Promise<T>;
    prefix: string;
    ttl: number;
  }>
): Promise<void> {
  const promises = queries.map(async (query) => {
    try {
      const data = await query.fetcher();
      await setCachedData(query.prefix, query.params, data, query.ttl);
    } catch (error) {
      console.error('Failed to warm up cache:', error);
    }
  });
  
  await Promise.allSettled(promises);
}
