import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

const healthRecordSchema = z.object({
  dogId: z.string(),
  type: z.string(),
  result: z.string(),
  score: z.number().optional(),
  grade: z.string().optional(),
  testDate: z.string(),
  organizationId: z.string().optional(),
  veterinarianName: z.string().optional(),
  clinicName: z.string().optional(),
  certificateNumber: z.string().optional(),
  certificateUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

const updateHealthRecordSchema = healthRecordSchema.partial();

// GET /api/health-records - List health records
router.get('/', async (req, res) => {
  try {
    const { dogId, type, result, organizationId } = req.query;
    
    const where: any = {};
    if (dogId) where.dogId = dogId;
    if (type) where.type = type;
    if (result) where.result = result;
    if (organizationId) where.organizationId = organizationId;
    
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const skip = (page - 1) * perPage;
    
    const [records, total] = await Promise.all([
      prisma.healthRecord.findMany({
        where,
        skip,
        take: perPage,
        include: {
          dog: {
            select: { id: true, name: true, registrationNumber: true },
          },
          organization: {
            select: { id: true, name: true, countryCode: true },
          },
        },
        orderBy: { testDate: 'desc' },
      }),
      prisma.healthRecord.count({ where }),
    ]);
    
    res.json({
      data: records,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching health records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/health-records/:id - Get single health record
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const record = await prisma.healthRecord.findUnique({
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
    
    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }
    
    res.json({ data: record });
  } catch (error) {
    console.error('Error fetching health record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/health-records - Create health record
router.post('/', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const validatedData = healthRecordSchema.parse(req.body);
    
    // Verify dog exists
    const dog = await prisma.dog.findUnique({
      where: { id: validatedData.dogId },
      select: { currentOwnerId: true },
    });
    
    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }
    
    // BREEDER can only add health records to their own dogs
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      const dogBreeder = await prisma.dog.findUnique({
        where: { id: validatedData.dogId },
        select: { breederId: true },
      });
      
      if (!breeder || dogBreeder?.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only add health records to your own dogs' });
      }
    }
    
    const record = await prisma.healthRecord.create({
      data: {
        ...validatedData,
        testDate: new Date(validatedData.testDate),
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
    
    res.status(201).json({ data: record });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error creating health record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/health-records/:id - Update health record
router.put('/:id', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateHealthRecordSchema.parse(req.body);
    
    // Check permissions
    const record = await prisma.healthRecord.findUnique({
      where: { id },
      select: { dogId: true },
    });
    
    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }
    
    // BREEDER can only update their own dogs' health records
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      const dog = await prisma.dog.findUnique({
        where: { id: record.dogId },
        select: { breederId: true },
      });
      
      if (!breeder || dog?.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only update health records for your own dogs' });
      }
    }
    
    const updatedRecord = await prisma.healthRecord.update({
      where: { id },
      data: validatedData.testDate ? {
        ...validatedData,
        testDate: new Date(validatedData.testDate),
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
    
    res.json({ data: updatedRecord });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error updating health record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/health-records/:id - Delete health record
router.delete('/:id', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    const record = await prisma.healthRecord.findUnique({
      where: { id },
      select: { dogId: true },
    });
    
    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }
    
    // BREEDER can only delete their own dogs' health records
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      const dog = await prisma.dog.findUnique({
        where: { id: record.dogId },
        select: { breederId: true },
      });
      
      if (!breeder || dog?.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only delete health records for your own dogs' });
      }
    }
    
    await prisma.healthRecord.delete({
      where: { id },
    });
    
    res.json({ message: 'Health record deleted successfully' });
  } catch (error) {
    console.error('Error deleting health record:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/health-records/dog/:dogId - Get health records for a specific dog
router.get('/dog/:dogId', async (req, res) => {
  try {
    const { dogId } = req.params;
    
    const records = await prisma.healthRecord.findMany({
      where: { dogId },
      include: {
        organization: {
          select: { id: true, name: true, countryCode: true },
        },
      },
      orderBy: { testDate: 'desc' },
    });
    
    res.json({ data: records });
  } catch (error) {
    console.error('Error fetching dog health records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as healthRoutes };
