// Setup file for Jest tests
import { prisma } from '../index';

// Mock Redis client
jest.mock('../index', () => ({
  prisma: {
    $disconnect: jest.fn(),
  },
  redisClient: {
    connect: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    lPush: jest.fn(),
    lRange: jest.fn(),
    lLen: jest.fn(),
    sAdd: jest.fn(),
    sMembers: jest.fn(),
    mGet: jest.fn(),
    mSet: jest.fn(),
    multi: jest.fn(() => ({
      setEx: jest.fn().mockReturnThis(),
      sAdd: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    })),
  },
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global teardown
afterAll(async () => {
  await prisma.$disconnect();
});
