import { Router } from 'express';
import {
  generatePedigree,
  calculateCOI,
  findCommonAncestorsBetweenDogs,
  detectPedigreeRepetitions,
  calculateAncestralInfluence,
  analyzeLinebreeding,
  countDescendants,
  invalidateDogCache,
  rankInfluentialBreeders,
} from '../services/genealogy';

const router = Router();

// GET /api/pedigree/:id - Get pedigree tree
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const generations = Math.min(parseInt(req.query.generations as string) || 10, 15);

    const pedigree = await generatePedigree(id, generations);
    
    res.json({ data: pedigree });
  } catch (error: any) {
    if (error.message === 'Dog not found') {
      return res.status(404).json({ error: 'Dog not found' });
    }
    console.error('Error fetching pedigree:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/pedigree/:id/coi - Calculate COI using Wright's formula
router.get('/:id/coi', async (req, res) => {
  try {
    const { id } = req.params;
    const generations = Math.min(parseInt(req.query.generations as string) || 10, 15);

    const result = await calculateCOI(id, generations);
    
    res.json({ data: result });
  } catch (error: any) {
    if (error.message === 'Dog not found') {
      return res.status(404).json({ error: 'Dog not found' });
    }
    console.error('Error calculating COI:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/pedigree/common-ancestors/:sireId/:damId - Find common ancestors between two dogs
router.get('/common-ancestors/:sireId/:damId', async (req, res) => {
  try {
    const { sireId, damId } = req.params;
    const generations = Math.min(parseInt(req.query.generations as string) || 10, 15);

    const commonAncestors = await findCommonAncestorsBetweenDogs(sireId, damId, generations);
    
    res.json({ data: commonAncestors });
  } catch (error) {
    console.error('Error finding common ancestors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/pedigree/:id/repetitions - Detect pedigree repetitions
router.get('/:id/repetitions', async (req, res) => {
  try {
    const { id } = req.params;
    const generations = Math.min(parseInt(req.query.generations as string) || 10, 15);

    const repetitions = await detectPedigreeRepetitions(id, generations);
    
    const repetitionsArray = Array.from(repetitions.entries()).map(([id, data]) => ({
      id,
      ...data,
    }));
    
    res.json({ data: repetitionsArray });
  } catch (error) {
    console.error('Error detecting repetitions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/pedigree/:id/influence - Calculate ancestral influence
router.get('/:id/influence', async (req, res) => {
  try {
    const { id } = req.params;
    const generations = Math.min(parseInt(req.query.generations as string) || 10, 15);

    const influence = await calculateAncestralInfluence(id, generations);
    
    res.json({ data: influence });
  } catch (error) {
    console.error('Error calculating influence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/pedigree/:id/linebreeding - Analyze linebreeding patterns
router.get('/:id/linebreeding', async (req, res) => {
  try {
    const { id } = req.params;
    const generations = Math.min(parseInt(req.query.generations as string) || 10, 15);

    const linebreeding = await analyzeLinebreeding(id, generations);
    
    res.json({ data: linebreeding });
  } catch (error) {
    console.error('Error analyzing linebreeding:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/pedigree/:id/descendants - Count descendants
router.get('/:id/descendants', async (req, res) => {
  try {
    const { id } = req.params;
    const maxGenerations = Math.min(parseInt(req.query.generations as string) || 10, 15);

    const descendants = await countDescendants(id, maxGenerations);
    
    res.json({ data: descendants });
  } catch (error) {
    console.error('Error counting descendants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/pedigree/:id/cache - Invalidate cache for a dog
router.delete('/:id/cache', async (req, res) => {
  try {
    const { id } = req.params;
    
    await invalidateDogCache(id);
    
    res.json({ message: 'Cache invalidated successfully' });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/pedigree/rankings/breeders - Get influential breeder rankings
router.get('/rankings/breeders', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const rankings = await rankInfluentialBreeders(limit);
    
    res.json({ data: rankings });
  } catch (error) {
    console.error('Error getting breeder rankings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as pedigreeRoutes };
