import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

const titleSchema = z.object({
  dogId: z.string(),
  title: z.string(),
  titleType: z.string(),
  organizationId: z.string().optional(),
  earnedDate: z.string(),
  certificateNumber: z.string().optional(),
  certificateUrl: z.string().url().optional(),
  isInternational: z.boolean().default(false),
  notes: z.string().optional(),
});

const updateTitleSchema = titleSchema.partial();

// GET /api/titles - List titles
router.get('/', async (req, res) => {
  try {
    const { dogId, titleType, organizationId, isInternational } = req.query;
    
    const where: any = {};
    if (dogId) where.dogId = dogId;
    if (titleType) where.titleType = titleType;
    if (organizationId) where.organizationId = organizationId;
    if (isInternational !== undefined) where.isInternational = isInternational === 'true';
    
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const skip = (page - 1) * perPage;
    
    const [titles, total] = await Promise.all([
      prisma.title.findMany({
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
        orderBy: { earnedDate: 'desc' },
      }),
      prisma.title.count({ where }),
    ]);
    
    res.json({
      data: titles,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching titles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/titles/:id - Get single title
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const title = await prisma.title.findUnique({
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
          },
        },
        organization: {
          select: { id: true, name: true, type: true, countryCode: true },
        },
      },
    });
    
    if (!title) {
      return res.status(404).json({ error: 'Title not found' });
    }
    
    res.json({ data: title });
  } catch (error) {
    console.error('Error fetching title:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/titles - Create title
router.post('/', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const validatedData = titleSchema.parse(req.body);
    
    // Verify dog exists
    const dog = await prisma.dog.findUnique({
      where: { id: validatedData.dogId },
      select: { breederId: true },
    });
    
    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }
    
    // BREEDER can only add titles to their own dogs
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      
      if (!breeder || dog.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only add titles to your own dogs' });
      }
    }
    
    const title = await prisma.title.create({
      data: {
        ...validatedData,
        earnedDate: new Date(validatedData.earnedDate),
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
    
    res.status(201).json({ data: title });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This title already exists for this dog and organization' });
    }
    console.error('Error creating title:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/titles/:id - Update title
router.put('/:id', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateTitleSchema.parse(req.body);
    
    // Check permissions
    const title = await prisma.title.findUnique({
      where: { id },
      select: { dogId: true },
    });
    
    if (!title) {
      return res.status(404).json({ error: 'Title not found' });
    }
    
    // BREEDER can only update their own dogs' titles
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      const dog = await prisma.dog.findUnique({
        where: { id: title.dogId },
        select: { breederId: true },
      });
      
      if (!breeder || dog?.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only update titles for your own dogs' });
      }
    }
    
    const updatedTitle = await prisma.title.update({
      where: { id },
      data: validatedData.earnedDate ? {
        ...validatedData,
        earnedDate: new Date(validatedData.earnedDate),
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
    
    res.json({ data: updatedTitle });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This title already exists for this dog and organization' });
    }
    console.error('Error updating title:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/titles/:id - Delete title
router.delete('/:id', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    const title = await prisma.title.findUnique({
      where: { id },
      select: { dogId: true },
    });
    
    if (!title) {
      return res.status(404).json({ error: 'Title not found' });
    }
    
    // BREEDER can only delete their own dogs' titles
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      const dog = await prisma.dog.findUnique({
        where: { id: title.dogId },
        select: { breederId: true },
      });
      
      if (!breeder || dog?.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only delete titles for your own dogs' });
      }
    }
    
    await prisma.title.delete({
      where: { id },
    });
    
    res.json({ message: 'Title deleted successfully' });
  } catch (error) {
    console.error('Error deleting title:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/titles/dog/:dogId - Get titles for a specific dog
router.get('/dog/:dogId', async (req, res) => {
  try {
    const { dogId } = req.params;
    
    const titles = await prisma.title.findMany({
      where: { dogId },
      include: {
        organization: {
          select: { id: true, name: true, countryCode: true },
        },
      },
      orderBy: { earnedDate: 'desc' },
    });
    
    res.json({ data: titles });
  } catch (error) {
    console.error('Error fetching dog titles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as titleRoutes };
