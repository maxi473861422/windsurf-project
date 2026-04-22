import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { redisClient } from '../index';

const router = Router();

const dogSchema = z.object({
  name: z.string().min(1),
  registrationNumber: z.string().optional(),
  sex: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().datetime().optional(),
  color: z.string().optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  hipScore: z.number().min(0).max(100).optional(),
  elbowScore: z.number().min(0).max(100).optional(),
  eyeCertification: z.string().optional(),
  titles: z.array(z.string()).default([]),
  notes: z.string().optional(),
  sireId: z.string().optional(),
  damId: z.string().optional(),
  breederId: z.string(),
});

// GET /api/dogs - List dogs with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const sex = req.query.sex as string;
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (sex) {
      where.sex = sex;
    }
    
    const [dogs, total] = await Promise.all([
      prisma.dog.findMany({
        where,
        include: {
          sire: { select: { id: true, name: true } },
          dam: { select: { id: true, name: true } },
          breeder: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dog.count({ where }),
    ]);
    
    res.json({
      data: dogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching dogs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/dogs/:id - Get single dog
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try cache first
    const cacheKey = `dog:${id}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return res.json(JSON.parse(cached));
    }
    
    const dog = await prisma.dog.findUnique({
      where: { id },
      include: {
        sire: {
          include: {
            sire: true,
            dam: true,
          },
        },
        dam: {
          include: {
            sire: true,
            dam: true,
          },
        },
        breeder: { select: { id: true, name: true, email: true } },
        offspringSire: {
          select: { id: true, name: true, sex: true, birthDate: true },
        },
        offspringDam: {
          select: { id: true, name: true, sex: true, birthDate: true },
        },
        healthRecords: true,
        showResults: {
          orderBy: { date: 'desc' },
        },
      },
    });
    
    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }
    
    // Cache for 1 hour
    await redisClient.setex(cacheKey, 3600, JSON.stringify(dog));
    
    res.json(dog);
  } catch (error) {
    console.error('Error fetching dog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/dogs - Create dog
router.post('/', async (req, res) => {
  try {
    const validatedData = dogSchema.parse(req.body);
    
    const dog = await prisma.dog.create({
      data: validatedData,
      include: {
        sire: { select: { id: true, name: true } },
        dam: { select: { id: true, name: true } },
        breeder: { select: { id: true, name: true, email: true } },
      },
    });
    
    // Invalidate relevant caches
    await redisClient.del('dogs:list:*');
    
    res.status(201).json(dog);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error creating dog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/dogs/:id - Update dog
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = dogSchema.partial().parse(req.body);
    
    const dog = await prisma.dog.update({
      where: { id },
      data: validatedData,
      include: {
        sire: { select: { id: true, name: true } },
        dam: { select: { id: true, name: true } },
        breeder: { select: { id: true, name: true, email: true } },
      },
    });
    
    // Invalidate caches
    await Promise.all([
      redisClient.del(`dog:${id}`),
      redisClient.del('dogs:list:*'),
    ]);
    
    res.json(dog);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error updating dog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/dogs/:id - Delete dog
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.dog.delete({
      where: { id },
    });
    
    // Invalidate caches
    await Promise.all([
      redisClient.del(`dog:${id}`),
      redisClient.del('dogs:list:*'),
    ]);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting dog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as dogRoutes };
