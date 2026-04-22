import { cacheService } from '../../services/cache';

// Mock Redis client
const mockRedisClient = {
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  sAdd: jest.fn(),
  sMembers: jest.fn(),
  expire: jest.fn(),
  lPush: jest.fn(),
  lRange: jest.fn(),
  lLen: jest.fn(),
  mGet: jest.fn(),
  mSet: jest.fn(),
  multi: jest.fn(() => ({
    setEx: jest.fn().mockReturnThis(),
    sAdd: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  })),
};

jest.mock('../../index', () => ({
  redisClient: mockRedisClient,
}));

describe('CacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should store a value in cache', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.sAdd.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await cacheService.set('test-key', { data: 'test' }, { ttl: 3600 });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'gsd:test-key',
        3600,
        JSON.stringify({ data: 'test' })
      );
    });

    it('should store with custom prefix', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.set('test-key', { data: 'test' }, { prefix: 'custom' });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'custom:test-key',
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should register tags for invalidation', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.sAdd.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await cacheService.set('test-key', { data: 'test' }, {
        tags: ['tag1', 'tag2'],
      });

      expect(mockRedisClient.sAdd).toHaveBeenCalledTimes(2);
    });
  });

  describe('get', () => {
    it('should retrieve a value from cache', async () => {
      const testData = { data: 'test' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('gsd:test-key');
    });

    it('should return null for cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should handle cache errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a value from cache', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cacheService.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('gsd:test-key');
    });
  });

  describe('invalidateByTag', () => {
    it('should invalidate all keys with a tag', async () => {
      mockRedisClient.sMembers.mockResolvedValue(['key1', 'key2']);
      mockRedisClient.del.mockResolvedValue(2);

      const result = await cacheService.invalidateByTag('test-tag');

      expect(result).toBe(2);
      expect(mockRedisClient.del).toHaveBeenCalledWith('key1', 'key2');
    });

    it('should handle empty tag', async () => {
      mockRedisClient.sMembers.mockResolvedValue([]);

      const result = await cacheService.invalidateByTag('empty-tag');

      expect(result).toBe(0);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const cachedData = { data: 'cached' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      const fetcher = jest.fn().mockResolvedValue({ data: 'fresh' });
      const result = await cacheService.getOrSet('test-key', fetcher);

      expect(result).toEqual(cachedData);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('should fetch and cache new value if not exists', async () => {
      const freshData = { data: 'fresh' };
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.setEx.mockResolvedValue('OK');

      const fetcher = jest.fn().mockResolvedValue(freshData);
      const result = await cacheService.getOrSet('test-key', fetcher);

      expect(result).toEqual(freshData);
      expect(fetcher).toHaveBeenCalled();
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });
  });

  describe('cachePedigree', () => {
    it('should cache pedigree with tags', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.sAdd.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      const pedigreeData = { generations: 5, dogs: [] };
      await cacheService.cachePedigree('dog-123', 5, pedigreeData);

      expect(mockRedisClient.setEx).toHaveBeenCalled();
      expect(mockRedisClient.sAdd).toHaveBeenCalledWith(
        expect.stringContaining('tags:'),
        expect.any(String)
      );
    });
  });

  describe('cacheCOI', () => {
    it('should cache COI calculation', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.sAdd.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      const coiData = { value: 0.125, ancestors: [] };
      await cacheService.cacheCOI('dog-123', 5, coiData);

      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });
  });
});
