import {
  encodeCursor,
  decodeCursor,
  OffsetPagination,
  CursorPagination,
  HybridPagination,
  validatePaginationOptions,
} from '../../utils/pagination';

describe('Pagination Utils', () => {
  describe('encodeCursor', () => {
    it('should encode cursor to base64', () => {
      const cursorInfo = { id: '123', createdAt: '2024-01-01T00:00:00Z' };
      const encoded = encodeCursor(cursorInfo);
      expect(encoded).toBe(Buffer.from(JSON.stringify(cursorInfo)).toString('base64'));
    });
  });

  describe('decodeCursor', () => {
    it('should decode cursor from base64', () => {
      const cursorInfo = { id: '123', createdAt: '2024-01-01T00:00:00Z' };
      const encoded = encodeCursor(cursorInfo);
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(cursorInfo);
    });

    it('should throw error for invalid cursor', () => {
      expect(() => decodeCursor('invalid')).toThrow('Invalid cursor');
    });
  });

  describe('validatePaginationOptions', () => {
    it('should validate and limit pagination options', () => {
      const options = validatePaginationOptions({ limit: 150, offset: 50 });
      expect(options.limit).toBe(100); // Max limit
      expect(options.offset).toBe(50);
    });

    it('should allow valid sort fields', () => {
      const options = validatePaginationOptions({ sortBy: 'name', sortOrder: 'asc' });
      expect(options.sortBy).toBe('name');
      expect(options.sortOrder).toBe('asc');
    });

    it('should reject invalid sort fields', () => {
      const options = validatePaginationOptions({ sortBy: 'invalidField' });
      expect(options.sortBy).toBeUndefined();
    });

    it('should validate sort order', () => {
      const options = validatePaginationOptions({ sortOrder: 'invalid' });
      expect(options.sortOrder).toBeUndefined();
    });
  });
});

describe('OffsetPagination', () => {
  it('should paginate with offset', async () => {
    const mockQuery = {
      count: jest.fn().mockResolvedValue(100),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
    };

    const result = await OffsetPagination.paginate(mockQuery as any, { limit: 10, offset: 0 });

    expect(result.data).toHaveLength(2);
    expect(result.pagination.total).toBe(100);
    expect(result.pagination.hasMore).toBe(true);
  });
});

describe('CursorPagination', () => {
  it('should paginate with cursor', async () => {
    const mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockResolvedValue([{ id: 1, createdAt: '2024-01-01' }]),
    };

    const result = await CursorPagination.paginate(mockQuery as any, { limit: 10 });

    expect(result.data).toHaveLength(1);
    expect(result.pagination.hasMore).toBe(false);
  });

  it('should generate next cursor when has more', async () => {
    const mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockResolvedValue(
        Array.from({ length: 11 }, (_, i) => ({ id: i, createdAt: '2024-01-01' }))
      ),
    };

    const result = await CursorPagination.paginate(mockQuery as any, { limit: 10 });

    expect(result.data).toHaveLength(10);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextCursor).toBeDefined();
  });
});

describe('HybridPagination', () => {
  it('should use cursor-based when cursor provided', async () => {
    const mockQuery = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockResolvedValue([{ id: 1 }]),
    };

    await HybridPagination.paginate(mockQuery as any, { cursor: 'encoded-cursor', limit: 10 });

    expect(mockQuery.where).toHaveBeenCalled();
  });

  it('should use offset-based when no cursor', async () => {
    const mockQuery = {
      count: jest.fn().mockResolvedValue(10),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockResolvedValue([{ id: 1 }]),
    };

    await HybridPagination.paginate(mockQuery as any, { limit: 10 });

    expect(mockQuery.count).toHaveBeenCalled();
    expect(mockQuery.skip).toHaveBeenCalled();
  });
});
