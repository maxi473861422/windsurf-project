import request from 'supertest';
import { app } from '../../index';

// Mock Prisma and Redis
jest.mock('../../index', () => ({
  prisma: {
    dog: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
  redisClient: {
    connect: jest.fn(),
    quit: jest.fn(),
  },
}));

describe('Dogs API Integration Tests', () => {
  describe('GET /api/dogs', () => {
    it('should return paginated list of dogs', async () => {
      const mockDogs = [
        { id: '1', name: 'Max', registrationNumber: 'REG001' },
        { id: '2', name: 'Bella', registrationNumber: 'REG002' },
      ];

      const { prisma } = require('../../index');
      prisma.dog.findMany.mockResolvedValue(mockDogs);
      prisma.dog.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/dogs')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data).toEqual(mockDogs);
      expect(prisma.dog.findMany).toHaveBeenCalled();
    });

    it('should apply filters', async () => {
      const { prisma } = require('../../index');
      prisma.dog.findMany.mockResolvedValue([]);
      prisma.dog.count.mockResolvedValue(0);

      await request(app)
        .get('/api/dogs?sex=MALE&color=Black')
        .expect(200);

      expect(prisma.dog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sex: 'MALE',
            color: 'Black',
          }),
        })
      );
    });
  });

  describe('GET /api/dogs/:id', () => {
    it('should return a single dog by ID', async () => {
      const mockDog = { id: '1', name: 'Max', registrationNumber: 'REG001' };

      const { prisma } = require('../../index');
      prisma.dog.findUnique.mockResolvedValue(mockDog);

      const response = await request(app)
        .get('/api/dogs/1')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(mockDog);
      expect(prisma.dog.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('should return 404 for non-existent dog', async () => {
      const { prisma } = require('../../index');
      prisma.dog.findUnique.mockResolvedValue(null);

      await request(app)
        .get('/api/dogs/999')
        .expect(404);
    });
  });

  describe('POST /api/dogs', () => {
    it('should create a new dog with authentication', async () => {
      const newDog = { name: 'Rex', registrationNumber: 'REG003', sex: 'MALE' };
      const createdDog = { id: '3', ...newDog };

      const { prisma } = require('../../index');
      prisma.dog.create.mockResolvedValue(createdDog);

      const token = 'valid-jwt-token';

      const response = await request(app)
        .post('/api/dogs')
        .set('Authorization', `Bearer ${token}`)
        .send(newDog)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toEqual(createdDog);
      expect(prisma.dog.create).toHaveBeenCalled();
    });

    it('should return 401 without authentication', async () => {
      const newDog = { name: 'Rex', registrationNumber: 'REG003', sex: 'MALE' };

      await request(app)
        .post('/api/dogs')
        .send(newDog)
        .expect(401);
    });
  });

  describe('PUT /api/dogs/:id', () => {
    it('should update a dog with authentication', async () => {
      const updatedDog = { id: '1', name: 'Max Updated', registrationNumber: 'REG001' };

      const { prisma } = require('../../index');
      prisma.dog.update.mockResolvedValue(updatedDog);

      const token = 'valid-jwt-token';

      const response = await request(app)
        .put('/api/dogs/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Max Updated' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toEqual(updatedDog);
    });
  });

  describe('DELETE /api/dogs/:id', () => {
    it('should soft delete a dog with authentication', async () => {
      const deletedDog = { id: '1', name: 'Max', deletedAt: new Date() };

      const { prisma } = require('../../index');
      prisma.dog.update.mockResolvedValue(deletedDog);

      const token = 'valid-jwt-token';

      await request(app)
        .delete('/api/dogs/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(prisma.dog.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
