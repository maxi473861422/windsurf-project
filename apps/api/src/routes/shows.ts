import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

const showResultSchema = z.object({
  dogId: z.string(),
  eventName: z.string(),
  eventType: z.string().optional(),
  eventDate: z.string(),
  organizationId: z.string().optional(),
  judgeName: z.string().optional(),
  class: z.string().optional(),
  placement: z.number().int().optional(),
  points: z.number().optional(),
  titleEarned: z.string().optional(),
  certificateUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

const updateShowResultSchema = showResultSchema.partial();

// GET /api/show-results - List show results
router.get('/', async (req, res) => {
  try {
    const { dogId, eventType, organizationId, year } = req.query;
    
    const where: any = {};
    if (dogId) where.dogId = dogId;
    if (eventType) where.eventType = eventType;
    if (organizationId) where.organizationId = organizationId;
    if (year) {
      const startDate = new Date(parseInt(year as string), 0, 1);
      const endDate = new Date(parseInt(year as string), 11, 31);
      where.eventDate = { gte: startDate, lte: endDate };
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const skip = (page - 1) * perPage;
    
    const [results, total] = await Promise.all([
      prisma.showResult.findMany({
        where,
        skip,
        take: perPage,
        include: {
          dog: {
            select: { id: true, name: true, registrationNumber: true, sex: true },
          },
          organization: {
            select: { id: true, name: true, countryCode: true },
          },
        },
        orderBy: { eventDate: 'desc' },
      }),
      prisma.showResult.count({ where }),
    ]);
    
    res.json({
      data: results,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching show results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/show-results/:id - Get single show result
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await prisma.showResult.findUnique({
      where: { id },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            sex: true,
            birthDate: true,
            breeder: {
              select: { id: true, kennelName: true },
            },
            currentOwner: {
              select: { id: true, name: true },
            },
          },
        },
        organization: {
          select: { id: true, name: true, type: true, countryCode: true },
        },
      },
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Show result not found' });
    }
    
    res.json({ data: result });
  } catch (error) {
    console.error('Error fetching show result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/show-results - Create show result
router.post('/', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const validatedData = showResultSchema.parse(req.body);
    
    // Verify dog exists
    const dog = await prisma.dog.findUnique({
      where: { id: validatedData.dogId },
      select: { breederId: true, currentOwnerId: true },
    });
    
    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }
    
    // BREEDER can only add show results for their own dogs
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      
      if (!breeder || dog.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only add show results for your own dogs' });
      }
    }
    
    const result = await prisma.showResult.create({
      data: {
        ...validatedData,
        eventDate: new Date(validatedData.eventDate),
      },
      include: {
        dog: {
          select: { id: true, name: true, registrationNumber: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
    });
    
    res.status(201).json({ data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error creating show result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/show-results/:id - Update show result
router.put('/:id', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateShowResultSchema.parse(req.body);
    
    // Check permissions
    const result = await prisma.showResult.findUnique({
      where: { id },
      select: { dogId: true },
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Show result not found' });
    }
    
    // BREEDER can only update their own dogs' show results
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      const dog = await prisma.dog.findUnique({
        where: { id: result.dogId },
        select: { breederId: true },
      });
      
      if (!breeder || dog?.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only update show results for your own dogs' });
      }
    }
    
    const updatedResult = await prisma.showResult.update({
      where: { id },
      data: validatedData.eventDate ? {
        ...validatedData,
        eventDate: new Date(validatedData.eventDate),
      } : validatedData,
      include: {
        dog: {
          select: { id: true, name: true, registrationNumber: true },
        },
        organization: {
          select: { id: true, name: true },
        },
      },
    });
    
    res.json({ data: updatedResult });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error updating show result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/show-results/:id - Delete show result
router.delete('/:id', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    const result = await prisma.showResult.findUnique({
      where: { id },
      select: { dogId: true },
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Show result not found' });
    }
    
    // BREEDER can only delete their own dogs' show results
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      const dog = await prisma.dog.findUnique({
        where: { id: result.dogId },
        select: { breederId: true },
      });
      
      if (!breeder || dog?.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only delete show results for your own dogs' });
      }
    }
    
    await prisma.showResult.delete({
      where: { id },
    });
    
    res.json({ message: 'Show result deleted successfully' });
  } catch (error) {
    console.error('Error deleting show result:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/show-results/dog/:dogId - Get show results for a specific dog
router.get('/dog/:dogId', async (req, res) => {
  try {
    const { dogId } = req.params;
    
    const results = await prisma.showResult.findMany({
      where: { dogId },
      include: {
        organization: {
          select: { id: true, name: true, countryCode: true },
        },
      },
      orderBy: { eventDate: 'desc' },
    });
    
    res.json({ data: results });
  } catch (error) {
    console.error('Error fetching dog show results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as showRoutes };
