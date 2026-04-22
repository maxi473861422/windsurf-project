import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

const breederSchema = z.object({
  userId: z.string().optional(),
  kennelName: z.string().optional(),
  legalName: z.string().optional(),
  registrationNumber: z.string().optional(),
  countryCode: z.string().length(2),
  region: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  logoUrl: z.string().url().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  breedingLicense: z.string().optional(),
  licenseExpiry: z.string().optional(),
  organizationId: z.string().optional(),
});

const updateBreederSchema = breederSchema.partial();

// GET /api/breeders - List breeders
router.get('/', async (req, res) => {
  try {
    const { countryCode, isActive, search, organizationId } = req.query;
    
    const where: any = {};
    
    if (countryCode) where.countryCode = countryCode;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (organizationId) where.organizationId = organizationId;
    if (search) {
      where.OR = [
        { kennelName: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const skip = (page - 1) * perPage;
    
    const [breeders, total] = await Promise.all([
      prisma.breeder.findMany({
        where,
        skip,
        take: perPage,
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
          organization: {
            select: { id: true, name: true, type: true },
          },
          _count: {
            select: { dogs: true, breedings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.breeder.count({ where }),
    ]);
    
    res.json({
      data: breeders,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching breeders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/breeders/:id - Get single breeder
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const breeder = await prisma.breeder.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, name: true, surname: true, avatarUrl: true },
        },
        organization: {
          select: { id: true, name: true, type: true, countryCode: true },
        },
        dogs: {
          select: { id: true, name: true, sex: true, birthDate: true, isAlive: true },
          take: 10,
          orderBy: { birthDate: 'desc' },
        },
        breedings: {
          select: { id: true, breedingDate: true, isSuccessful: true },
          take: 5,
          orderBy: { breedingDate: 'desc' },
        },
        ownershipHistory: {
          select: { id: true, startDate: true, endDate: true, transferType: true },
          take: 5,
          orderBy: { startDate: 'desc' },
        },
        _count: {
          select: { dogs: true, breedings: true, ownershipHistory: true },
        },
      },
    });
    
    if (!breeder) {
      return res.status(404).json({ error: 'Breeder not found' });
    }
    
    res.json({ data: breeder });
  } catch (error) {
    console.error('Error fetching breeder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/breeders - Create breeder
router.post('/', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const validatedData = breederSchema.parse(req.body);
    
    // If user is BREEDER, they can only create their own breeder profile
    if (req.user?.role === 'BREEDER') {
      validatedData.userId = req.user.userId;
    }
    
    // Check if registration number already exists
    if (validatedData.registrationNumber) {
      const existing = await prisma.breeder.findFirst({
        where: { registrationNumber: validatedData.registrationNumber },
      });
      if (existing) {
        return res.status(400).json({ error: 'Breeder registration number already exists' });
      }
    }
    
    const breeder = await prisma.breeder.create({
      data: validatedData,
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
    });
    
    res.status(201).json({ data: breeder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error creating breeder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/breeders/:id - Update breeder
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateBreederSchema.parse(req.body);
    
    // Check permissions
    const breeder = await prisma.breeder.findUnique({
      where: { id },
      select: { userId: true },
    });
    
    if (!breeder) {
      return res.status(404).json({ error: 'Breeder not found' });
    }
    
    // BREEDER can only update their own profile
    if (req.user?.role === 'BREEDER' && breeder.userId !== req.user.userId) {
      return res.status(403).json({ error: 'You can only update your own breeder profile' });
    }
    
    // Check if registration number already exists (if being updated)
    if (validatedData.registrationNumber) {
      const existing = await prisma.breeder.findFirst({
        where: { registrationNumber: validatedData.registrationNumber, id: { not: id } },
      });
      if (existing) {
        return res.status(400).json({ error: 'Breeder registration number already exists' });
      }
    }
    
    const updatedBreeder = await prisma.breeder.update({
      where: { id },
      data: validatedData,
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
    });
    
    res.json({ data: updatedBreeder });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error updating breeder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/breeders/:id - Delete breeder
router.delete('/:id', authenticate, authorize('ADMIN', 'MODERATOR'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check dependencies
    const [dogsCount, breedingsCount] = await Promise.all([
      prisma.dog.count({ where: { breederId: id } }),
      prisma.breeding.count({ where: { breederId: id } }),
    ]);
    
    if (dogsCount > 0 || breedingsCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete breeder with associated records',
        dependencies: { dogs: dogsCount, breedings: breedingsCount }
      });
    }
    
    await prisma.breeder.delete({
      where: { id },
    });
    
    res.json({ message: 'Breeder deleted successfully' });
  } catch (error) {
    console.error('Error deleting breeder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/breeders/:id/dogs - Get breeder's dogs
router.get('/:id/dogs', async (req, res) => {
  try {
    const { id } = req.params;
    const { sex, isAlive } = req.query;
    
    const where: any = { breederId: id };
    if (sex) where.sex = sex;
    if (isAlive !== undefined) where.isAlive = isAlive === 'true';
    
    const dogs = await prisma.dog.findMany({
      where,
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        sex: true,
        birthDate: true,
        color: true,
        isAlive: true,
        photos: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1,
        },
      },
      orderBy: { birthDate: 'desc' },
    });
    
    res.json({ data: dogs });
  } catch (error) {
    console.error('Error fetching breeder dogs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as breederRoutes };
