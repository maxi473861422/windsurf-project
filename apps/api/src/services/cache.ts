import { redisClient } from '../index';

/**
 * Servicio de caché mejorado para producción
 * Soporta múltiples estrategias de caché y invalidación automática
 */

export interface CacheOptions {
  ttl?: number; // Time to live en segundos
  prefix?: string; // Prefijo para la clave
  tags?: string[]; // Tags para invalidación por grupo
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

class CacheService {
  private stats: Map<string, CacheStats> = new Map();

  /**
   * Generar clave de caché con prefijo
   */
  private generateKey(key: string, prefix?: string): string {
    const effectivePrefix = prefix || 'gsd';
    return `${effectivePrefix}:${key}`;
  }

  /**
   * Almacenar valor en caché
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const { ttl = 3600, prefix, tags } = options;
    const cacheKey = this.generateKey(key, prefix);
    
    try {
      const serialized = JSON.stringify(value);
      await redisClient.setEx(cacheKey, ttl, serialized);

      // Registrar tags para invalidación por grupo
      if (tags && tags.length > 0) {
        for (const tag of tags) {
          const tagKey = `tags:${tag}`;
          await redisClient.sAdd(tagKey, cacheKey);
          await redisClient.expire(tagKey, ttl);
        }
      }

      // Actualizar estadísticas
      this.updateStats(prefix || 'default', 'miss');
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Obtener valor de caché
   */
  async get<T>(key: string, prefix?: string): Promise<T | null> {
    const cacheKey = this.generateKey(key, prefix);
    
    try {
      const value = await redisClient.get(cacheKey);
      
      if (value) {
        this.updateStats(prefix || 'default', 'hit');
        return JSON.parse(value) as T;
      }
      
      this.updateStats(prefix || 'default', 'miss');
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.updateStats(prefix || 'default', 'miss');
      return null;
    }
  }

  /**
   * Eliminar valor de caché
   */
  async delete(key: string, prefix?: string): Promise<void> {
    const cacheKey = this.generateKey(key, prefix);
    
    try {
      await redisClient.del(cacheKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Invalidar caché por tags
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const tagKey = `tags:${tag}`;
      const keys = await redisClient.sMembers(tagKey);
      
      if (keys.length > 0) {
        await redisClient.del(...keys);
        await redisClient.del(tagKey);
      }
      
      return keys.length;
    } catch (error) {
      console.error('Cache invalidate by tag error:', error);
      return 0;
    }
  }

  /**
   * Invalidar caché por patrón
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await redisClient.keys(`*${pattern}*`);
      
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      
      return keys.length;
    } catch (error) {
      console.error('Cache invalidate by pattern error:', error);
      return 0;
    }
  }

  /**
   * Cache con fallback (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options.prefix);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await fetcher();
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * Cache con múltiples claves (multi-get)
   */
  async getMany<T>(keys: string[], prefix?: string): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    
    try {
      const cacheKeys = keys.map(key => this.generateKey(key, prefix));
      const values = await redisClient.mGet(cacheKeys);
      
      for (let i = 0; i < keys.length; i++) {
        if (values[i]) {
          result.set(keys[i], JSON.parse(values[i] as string) as T);
          this.updateStats(prefix || 'default', 'hit');
        } else {
          this.updateStats(prefix || 'default', 'miss');
        }
      }
    } catch (error) {
      console.error('Cache get many error:', error);
    }
    
    return result;
  }

  /**
   * Almacenar múltiples valores (multi-set)
   */
  async setMany(
    entries: Map<string, any>,
    options: CacheOptions = {}
  ): Promise<void> {
    const { ttl = 3600, prefix, tags } = options;
    
    try {
      const pipeline = redisClient.multi();
      
      for (const [key, value] of entries) {
        const cacheKey = this.generateKey(key, prefix);
        const serialized = JSON.stringify(value);
        pipeline.setEx(cacheKey, ttl, serialized);

        // Registrar tags
        if (tags && tags.length > 0) {
          for (const tag of tags) {
            const tagKey = `tags:${tag}`;
            pipeline.sAdd(tagKey, cacheKey);
            pipeline.expire(tagKey, ttl);
          }
        }
      }
      
      await pipeline.exec();
    } catch (error) {
      console.error('Cache set many error:', error);
    }
  }

  /**
   * Actualizar estadísticas
   */
  private updateStats(prefix: string, type: 'hit' | 'miss'): void {
    const stats = this.stats.get(prefix) || { hits: 0, misses: 0, hitRate: 0 };
    
    if (type === 'hit') {
      stats.hits++;
    } else {
      stats.misses++;
    }
    
    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? stats.hits / total : 0;
    
    this.stats.set(prefix, stats);
  }

  /**
   * Obtener estadísticas de caché
   */
  getStats(prefix?: string): CacheStats | Map<string, CacheStats> {
    if (prefix) {
      return this.stats.get(prefix) || { hits: 0, misses: 0, hitRate: 0 };
    }
    return this.stats;
  }

  /**
   * Limpiar estadísticas
   */
  clearStats(prefix?: string): void {
    if (prefix) {
      this.stats.delete(prefix);
    } else {
      this.stats.clear();
    }
  }

  /**
   * Calentar caché (pre-cargar datos)
   */
  async warmup<T>(
    entries: Map<string, () => Promise<T>>,
    options: CacheOptions = {}
  ): Promise<void> {
    const promises = Array.from(entries.entries()).map(async ([key, fetcher]) => {
      try {
        const value = await fetcher();
        await this.set(key, value, options);
      } catch (error) {
        console.error(`Cache warmup error for key ${key}:`, error);
      }
    });
    
    await Promise.allSettled(promises);
  }

  /**
   * Caché distribuido para pedigree
   */
  async cachePedigree(
    dogId: string,
    generations: number,
    data: any,
    ttl: number = 3600
  ): Promise<void> {
    const key = `pedigree:${dogId}:${generations}`;
    await this.set(key, data, { ttl, tags: ['pedigree', `dog:${dogId}`] });
  }

  /**
   * Caché distribuido para COI
   */
  async cacheCOI(
    dogId: string,
    generations: number,
    data: any,
    ttl: number = 3600
  ): Promise<void> {
    const key = `coi:${dogId}:${generations}`;
    await this.set(key, data, { ttl, tags: ['coi', `dog:${dogId}`] });
  }

  /**
   * Invalidar caché de un perro
   */
  async invalidateDogCache(dogId: string): Promise<void> {
    await this.invalidateByTag(`dog:${dogId}`);
  }

  /**
   * Invalidar toda la caché de pedigrees
   */
  async invalidateAllPedigrees(): Promise<number> {
    return await this.invalidateByTag('pedigree');
  }

  /**
   * Invalidar toda la caché de COI
   */
  async invalidateAllCOI(): Promise<number> {
    return await this.invalidateByTag('coi');
  }

  /**
   * Cache para resultados de búsqueda
   */
  async cacheSearchResults(
    query: string,
    filters: Record<string, any>,
    results: any,
    ttl: number = 300
  ): Promise<void> {
    const key = `search:${Buffer.from(JSON.stringify({ query, filters })).toString('base64')}`;
    await this.set(key, results, { ttl, tags: ['search'] });
  }

  /**
   * Obtener resultados de búsqueda cacheados
   */
  async getCachedSearchResults(
    query: string,
    filters: Record<string, any>
  ): Promise<any | null> {
    const key = `search:${Buffer.from(JSON.stringify({ query, filters })).toString('base64')}`;
    return await this.get(key);
  }
}

export const cacheService = new CacheService();
export default cacheService;
