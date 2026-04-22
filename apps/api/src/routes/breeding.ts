import { Router } from 'express';
import { z } from 'zod';
import { prisma, redisClient } from '../index';
import { findCommonAncestorsBetweenDogs, calculateCOI } from '../services/genealogy';

const router = Router();

const breedingSchema = z.object({
  sireId: z.string(),
  damId: z.string(),
  date: z.string().datetime(),
  notes: z.string().optional(),
  breederId: z.string(),
});

const simulateBreedingSchema = z.object({
  sireId: z.string(),
  damId: z.string(),
});

// GET /api/breeding - List breedings
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [breedings, total] = await Promise.all([
      prisma.breeding.findMany({
        include: {
          sire: { select: { id: true, name: true, registrationNumber: true } },
          dam: { select: { id: true, name: true, registrationNumber: true } },
          breeder: { select: { id: true, name: true, email: true } },
          litter: true,
        },
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.breeding.count(),
    ]);

    res.json({
      data: breedings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching breedings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/breeding/simulate - Simulate breeding
router.post('/simulate', async (req, res) => {
  try {
    const validatedData = simulateBreedingSchema.parse(req.body);

    // Check cache first
    const cacheKey = `simulation:${validatedData.sireId}:${validatedData.damId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Get parent data
    const [sire, dam] = await Promise.all([
      prisma.dog.findUnique({
        where: { id: validatedData.sireId },
        include: {
          healthRecords: true,
        },
      }),
      prisma.dog.findUnique({
        where: { id: validatedData.damId },
        include: {
          healthRecords: true,
        },
      }),
    ]);

    if (!sire || !dam) {
      return res.status(404).json({ error: 'Sire or Dam not found' });
    }

    // Calculate COI using genealogy service
    const coiResult = await calculateCOI('virtual', 10);
    const commonAncestors = await findCommonAncestorsBetweenDogs(validatedData.sireId, validatedData.damId, 10);

    // Calculate health risks
    const healthRisks = calculateHealthRisks(sire, dam);

    // Generate recommendations
    const recommendations = generateRecommendations(coiResult.coi, healthRisks, commonAncestors);

    const simulation = {
      sire: {
        id: sire.id,
        name: sire.name,
        registrationNumber: sire.registrationNumber,
        hipScore: sire.hipScore,
        elbowScore: sire.elbowScore,
      },
      dam: {
        id: dam.id,
        name: dam.name,
        registrationNumber: dam.registrationNumber,
        hipScore: dam.hipScore,
        elbowScore: dam.elbowScore,
      },
      coi: coiResult.coi,
      coiPercentage: coiResult.coiPercentage,
      commonAncestors,
      healthRisks,
      recommendations,
    };

    // Cache for 1 hour
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(simulation));

    res.json(simulation);
  } catch (error) {
    console.error('Error simulating breeding:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/breeding - Create breeding record
router.post('/', async (req, res) => {
  try {
    const validatedData = breedingSchema.parse(req.body);

    // Check if dogs exist
    const [sire, dam] = await Promise.all([
      prisma.dog.findUnique({ where: { id: validatedData.sireId } }),
      prisma.dog.findUnique({ where: { id: validatedData.damId } }),
    ]);

    if (!sire || !dam) {
      return res.status(404).json({ error: 'Sire or Dam not found' });
    }

    if (sire.sex !== 'MALE') {
      return res.status(400).json({ error: 'Sire must be male' });
    }

    if (dam.sex !== 'FEMALE') {
      return res.status(400).json({ error: 'Dam must be female' });
    }

    const breeding = await prisma.breeding.create({
      data: validatedData,
      include: {
        sire: { select: { id: true, name: true, registrationNumber: true } },
        dam: { select: { id: true, name: true, registrationNumber: true } },
        breeder: { select: { id: true, name: true, email: true } },
      },
    });

    // Invalidate caches
    await redisClient.del('breedings:list:*');
    await redisClient.del(`simulation:${validatedData.sireId}:${validatedData.damId}`);

    res.status(201).json(breeding);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error creating breeding:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function calculateHealthRisks(sire: any, dam: any) {
  const risks = {
    hipDysplasia: {
      risk: 0.5, // Default risk
      sireScore: sire.hipScore,
      damScore: dam.hipScore,
    },
    elbowDysplasia: {
      risk: 0.3, // Default risk
      sireScore: sire.elbowScore,
      damScore: dam.elbowScore,
    },
  };

  // Calculate risk based on parent scores
  if (sire.hipScore && dam.hipScore) {
    const avgScore = (sire.hipScore + dam.hipScore) / 2;
    risks.hipDysplasia.risk = avgScore > 20 ? 0.8 : avgScore > 10 ? 0.5 : 0.2;
  }

  if (sire.elbowScore && dam.elbowScore) {
    const avgScore = (sire.elbowScore + dam.elbowScore) / 2;
    risks.elbowDysplasia.risk = avgScore > 20 ? 0.6 : avgScore > 10 ? 0.3 : 0.1;
  }

  return risks;
}

function generateRecommendations(coi: number, healthRisks: any, commonAncestors: any[]) {
  const recommendations = [];

  if (coi > 0.125) {
    recommendations.push('High coefficient of inbreeding detected. Consider alternative breeding pair.');
  } else if (coi > 0.0625) {
    recommendations.push('Moderate coefficient of inbreeding. Monitor offspring carefully.');
  }

  if (healthRisks.hipDysplasia.risk > 0.6) {
    recommendations.push('High risk of hip dysplasia. Consider dogs with better hip scores.');
  }

  if (healthRisks.elbowDysplasia.risk > 0.5) {
    recommendations.push('Moderate to high risk of elbow dysplasia. Consider health screening.');
  }

  if (recommendations.length === 0) {
    recommendations.push('This appears to be a good breeding match with low risks.');
  }

  return recommendations;
}

export { router as breedingRoutes };
