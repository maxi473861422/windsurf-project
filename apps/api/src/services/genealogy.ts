import { prisma } from '../index';
import { redisClient } from '../index';

/**
 * Genealogy Service
 * 
 * Advanced genealogical calculations for German Shepherd Dogs
 * 
 * Mathematical Background:
 * 
 * 1. COI (Coefficient of Inbreeding) - Wright's Formula:
 *    COI = Σ (0.5)^(n1 + n2 + 1) * (1 + F_A)
 *    Where:
 *    - n1 = number of generations from sire to common ancestor
 *    - n2 = number of generations from dam to common ancestor
 *    - F_A = inbreeding coefficient of the common ancestor
 *    - Sum is over all common ancestors
 * 
 * 2. Relationship Coefficient (RC):
 *    RC = 2 * COI
 *    Represents the probability that two alleles are identical by descent
 * 
 * 3. Ancestral Influence:
 *    Influence = (0.5)^n * 100
 *    Where n is the number of generations to the ancestor
 * 
 * 4. Linebreeding Detection:
 *    An ancestor appearing multiple times in the pedigree
 *    with a total influence > 6.25% (appears within 4 generations)
 */

export interface PedigreeNode {
  id: string;
  name: string;
  registrationNumber?: string | null;
  sex: 'MALE' | 'FEMALE';
  sire?: PedigreeNode | null;
  dam?: PedigreeNode | null;
  generation: number;
  position: number; // Position in the pedigree (1-2^n)
  birthDate?: Date | null;
  isAlive?: boolean;
}

export interface CommonAncestor {
  id: string;
  name: string;
  paths: number;
  contribution: number; // COI contribution
  generations: number;
  pathsDetails: PathDetail[];
}

export interface PathDetail {
  sirePath: string[];
  damPath: string[];
  generations: number;
  contribution: number;
}

export interface LinebreedingAnalysis {
  ancestorId: string;
  ancestorName: string;
  percentage: number;
  occurrences: number;
  minGeneration: number;
  maxGeneration: number;
  pattern: string; // e.g., "3x4", "4x5", etc.
}

export interface DescendantStats {
  total: number;
  male: number;
  female: number;
  byGeneration: Record<number, number>;
  influential: number; // Dogs with >100 descendants
}

export interface BreederRanking {
  id: string;
  kennelName: string;
  totalOffspring: number;
  influentialOffspring: number;
  averageCOI: number;
  rank: number;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

const CACHE_TTL = {
  PEDIGREE: 86400, // 24 hours
  COI: 86400,
  ANCESTORS: 86400,
  LINEBREEDING: 86400,
  DESCENDANTS: 3600, // 1 hour
  RANKING: 7200, // 2 hours
};

async function getCached<T>(key: string): Promise<T | null> {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

async function setCached(key: string, value: any, ttl: number): Promise<void> {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

// ============================================================================
// PEDIGREE GENERATION
// ============================================================================

/**
 * Generate dynamic pedigree tree
 * @param dogId - ID of the dog
 * @param generations - Number of generations (default: 10)
 * @returns Pedigree tree structure
 */
export async function generatePedigree(
  dogId: string,
  generations: number = 10
): Promise<PedigreeNode> {
  const cacheKey = `pedigree:${dogId}:${generations}`;
  const cached = await getCached<PedigreeNode>(cacheKey);
  if (cached) return cached;

  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    select: {
      id: true,
      name: true,
      registrationNumber: true,
      sex: true,
      sireId: true,
      damId: true,
      birthDate: true,
      isAlive: true,
    },
  });

  if (!dog) {
    throw new Error('Dog not found');
  }

  const pedigree = await buildPedigreeNode(dog, generations, 0, 1);
  await setCached(cacheKey, pedigree, CACHE_TTL.PEDIGREE);

  return pedigree;
}

async function buildPedigreeNode(
  dog: any,
  maxGenerations: number,
  currentGeneration: number,
  position: number
): Promise<PedigreeNode> {
  const node: PedigreeNode = {
    id: dog.id,
    name: dog.name,
    registrationNumber: dog.registrationNumber,
    sex: dog.sex,
    generation: currentGeneration,
    position,
    birthDate: dog.birthDate,
    isAlive: dog.isAlive,
  };

  if (currentGeneration < maxGenerations) {
    // Build sire
    if (dog.sireId) {
      const sire = await prisma.dog.findUnique({
        where: { id: dog.sireId },
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          sex: true,
          sireId: true,
          damId: true,
          birthDate: true,
          isAlive: true,
        },
      });
      if (sire) {
        node.sire = await buildPedigreeNode(
          sire,
          maxGenerations,
          currentGeneration + 1,
          position * 2
        );
      }
    }

    // Build dam
    if (dog.damId) {
      const dam = await prisma.dog.findUnique({
        where: { id: dog.damId },
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          sex: true,
          sireId: true,
          damId: true,
          birthDate: true,
          isAlive: true,
        },
      });
      if (dam) {
        node.dam = await buildPedigreeNode(
          dam,
          maxGenerations,
          currentGeneration + 1,
          position * 2 + 1
        );
      }
    }
  }

  return node;
}

// ============================================================================
// COI CALCULATION (Wright's Formula)
// ============================================================================

/**
 * Calculate Coefficient of Inbreeding using Wright's formula
 * @param dogId - ID of the dog
 * @param generations - Number of generations to analyze (default: 10)
 * @returns COI value (0-1) and detailed analysis
 */
export async function calculateCOI(
  dogId: string,
  generations: number = 10
): Promise<{
  coi: number;
  coiPercentage: number;
  commonAncestors: CommonAncestor[];
  generationsAnalyzed: number;
}> {
  const cacheKey = `coi:${dogId}:${generations}`;
  const cached = await getCached<any>(cacheKey);
  if (cached) return cached;

  // Get all ancestors in the pedigree
  const ancestors = await getAncestors(dogId, generations);
  
  // Find common ancestors (ancestors that appear on both sire and dam sides)
  const commonAncestors = findCommonAncestors(ancestors);
  
  // Calculate COI using Wright's formula
  let coi = 0;
  const commonAncestorsDetails: CommonAncestor[] = [];

  for (const ancestor of commonAncestors) {
    const contribution = calculateAncestorContribution(ancestor, generations);
    coi += contribution;
    
    commonAncestorsDetails.push({
      id: ancestor.id,
      name: ancestor.name,
      paths: 1, // Each ancestor represents one path
      contribution,
      generations: ancestor.minGeneration,
      pathsDetails: [{
        sirePath: ancestor.sirePath,
        damPath: ancestor.damPath,
        generations: ancestor.generations,
        contribution: calculatePathContribution(ancestor.generations),
      }],
    });
  }

  const result = {
    coi: Math.min(coi, 1), // Cap at 1 (100%)
    coiPercentage: Math.min(coi * 100, 100),
    commonAncestors: commonAncestorsDetails,
    generationsAnalyzed: generations,
  };

  await setCached(cacheKey, result, CACHE_TTL.COI);

  // Update dog record with COI
  await prisma.dog.update({
    where: { id: dogId },
    data: {
      coi5Gen: generations >= 5 ? result.coi : null,
      coi10Gen: generations >= 10 ? result.coi : null,
      coiUpdatedAt: new Date(),
    },
  });

  return result;
}

interface AncestorPath {
  id: string;
  name: string;
  sirePath: string[];
  damPath: string[];
  generations: number;
  minGeneration: number;
}

async function getAncestors(
  dogId: string,
  generations: number
): Promise<Map<string, AncestorPath>> {
  const ancestors = new Map<string, AncestorPath>();

  // Get sire's ancestors
  await collectAncestors(dogId, 'sire', generations, [], ancestors);
  
  // Get dam's ancestors
  await collectAncestors(dogId, 'dam', generations, [], ancestors);

  return ancestors;
}

async function collectAncestors(
  dogId: string,
  side: 'sire' | 'dam',
  remainingGenerations: number,
  path: string[],
  ancestors: Map<string, AncestorPath>
): Promise<void> {
  if (remainingGenerations <= 0) return;

  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    select: {
      id: true,
      name: true,
      sireId: true,
      damId: true,
    },
  });

  if (!dog) return;

  const parentId = side === 'sire' ? dog.sireId : dog.damId;
  if (!parentId) return;

  const newPath = [...path, parentId];

  const parent = await prisma.dog.findUnique({
    where: { id: parentId },
    select: {
      id: true,
      name: true,
      sireId: true,
      damId: true,
    },
  });

  if (!parent) return;

  if (ancestors.has(parent.id)) {
    const existing = ancestors.get(parent.id)!;
    if (side === 'sire') {
      existing.sirePath = newPath;
    } else {
      existing.damPath = newPath;
    }
    existing.minGeneration = Math.min(
      existing.minGeneration,
      path.length + 1
    );
  } else {
    ancestors.set(parent.id, {
      id: parent.id,
      name: parent.name,
      sirePath: side === 'sire' ? newPath : [],
      damPath: side === 'dam' ? newPath : [],
      generations: path.length + 1,
      minGeneration: path.length + 1,
    });
  }

  // Continue collecting ancestors
  await collectAncestors(parentId, 'sire', remainingGenerations - 1, newPath, ancestors);
  await collectAncestors(parentId, 'dam', remainingGenerations - 1, newPath, ancestors);
}

function findCommonAncestors(
  ancestors: Map<string, AncestorPath>
): AncestorPath[] {
  return Array.from(ancestors.values()).filter(
    ancestor => ancestor.sirePath.length > 0 && ancestor.damPath.length > 0
  );
}

function calculateAncestorContribution(ancestor: AncestorPath, maxGenerations: number): number {
  // Wright's formula: (0.5)^(n1 + n2 + 1)
  // where n1 and n2 are the number of generations from sire and dam to the ancestor
  const n1 = ancestor.sirePath.length;
  const n2 = ancestor.damPath.length;
  
  // Base contribution from this ancestor
  let contribution = Math.pow(0.5, n1 + n2 + 1);
  
  // If the ancestor itself is inbred, multiply by (1 + F_A)
  // For simplicity, we'll assume F_A = 0 unless we have cached data
  // In a production system, you would fetch the ancestor's COI here
  
  return contribution;
}

function calculatePathContribution(generations: number): number {
  return Math.pow(0.5, generations + 1);
}

// ============================================================================
// COMMON ANCESTORS DETECTION
// ============================================================================

/**
 * Find common ancestors between two dogs
 * @param dog1Id - First dog ID
 * @param dog2Id - Second dog ID
 * @param generations - Number of generations to analyze
 * @returns List of common ancestors with contributions
 */
export async function findCommonAncestorsBetweenDogs(
  dog1Id: string,
  dog2Id: string,
  generations: number = 10
): Promise<CommonAncestor[]> {
  const cacheKey = `common:${dog1Id}:${dog2Id}:${generations}`;
  const cached = await getCached<CommonAncestor[]>(cacheKey);
  if (cached) return cached;

  // Get ancestors for both dogs
  const ancestors1 = await getAncestorsFlat(dog1Id, generations);
  const ancestors2 = await getAncestorsFlat(dog2Id, generations);

  // Find intersection
  const commonAncestorIds = new Set(
    ancestors1.filter(a => ancestors2.some(b => b.id === a.id)).map(a => a.id)
  );

  const commonAncestors: CommonAncestor[] = [];

  for (const id of commonAncestorIds) {
    const ancestor1 = ancestors1.find(a => a.id === id)!;
    const ancestor2 = ancestors2.find(a => a.id === id)!;

    // Calculate relationship coefficient
    const generations1 = ancestor1.generation;
    const generations2 = ancestor2.generation;
    const contribution = Math.pow(0.5, generations1 + generations2 + 1) * 2; // RC = 2 * COI

    commonAncestors.push({
      id,
      name: ancestor1.name,
      paths: 1,
      contribution,
      generations: Math.max(generations1, generations2),
      pathsDetails: [],
    });
  }

  // Sort by contribution (most influential first)
  commonAncestors.sort((a, b) => b.contribution - a.contribution);

  await setCached(cacheKey, commonAncestors, CACHE_TTL.ANCESTORS);

  return commonAncestors;
}

interface FlatAncestor {
  id: string;
  name: string;
  generation: number;
}

async function getAncestorsFlat(
  dogId: string,
  generations: number
): Promise<FlatAncestor[]> {
  const ancestors: FlatAncestor[] = [];
  await collectAncestorsFlat(dogId, generations, 0, ancestors);
  return ancestors;
}

async function collectAncestorsFlat(
  dogId: string,
  maxGenerations: number,
  currentGeneration: number,
  ancestors: FlatAncestor[]
): Promise<void> {
  if (currentGeneration >= maxGenerations) return;

  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    select: { sireId: true, damId: true },
  });

  if (!dog) return;

  // Process sire
  if (dog.sireId) {
    const sire = await prisma.dog.findUnique({
      where: { id: dog.sireId },
      select: { id: true, name: true },
    });
    if (sire) {
      ancestors.push({ id: sire.id, name: sire.name, generation: currentGeneration + 1 });
      await collectAncestorsFlat(sire.id, maxGenerations, currentGeneration + 1, ancestors);
    }
  }

  // Process dam
  if (dog.damId) {
    const dam = await prisma.dog.findUnique({
      where: { id: dog.damId },
      select: { id: true, name: true },
    });
    if (dam) {
      ancestors.push({ id: dam.id, name: dam.name, generation: currentGeneration + 1 });
      await collectAncestorsFlat(dam.id, maxGenerations, currentGeneration + 1, ancestors);
    }
  }
}

// ============================================================================
// PEDIGREE REPETITION DETECTION
// ============================================================================

/**
 * Detect repetitions in pedigree
 * @param dogId - ID of the dog
 * @param generations - Number of generations to analyze
 * @returns Map of ancestor ID to occurrence count
 */
export async function detectPedigreeRepetitions(
  dogId: string,
  generations: number = 10
): Promise<Map<string, { name: string; count: number; generations: number[] }>> {
  const cacheKey = `repetitions:${dogId}:${generations}`;
  const cached = await getCached<any>(cacheKey);
  if (cached) return new Map(Object.entries(cached));

  const repetitions = new Map<string, { name: string; count: number; generations: number[] }>();
  await collectRepetitions(dogId, generations, 0, [], repetitions);

  await setCached(cacheKey, Object.fromEntries(repetitions), CACHE_TTL.LINEBREEDING);

  return repetitions;
}

async function collectRepetitions(
  dogId: string,
  maxGenerations: number,
  currentGeneration: number,
  path: string[],
  repetitions: Map<string, { name: string; count: number; generations: number[] }>
): Promise<void> {
  if (currentGeneration >= maxGenerations) return;

  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    select: {
      id: true,
      name: true,
      sireId: true,
      damId: true,
    },
  });

  if (!dog) return;

  // Process sire
  if (dog.sireId) {
    const sire = await prisma.dog.findUnique({
      where: { id: dog.sireId },
      select: { id: true, name: true, sireId: true, damId: true },
    });
    if (sire) {
      if (repetitions.has(sire.id)) {
        const existing = repetitions.get(sire.id)!;
        existing.count++;
        existing.generations.push(currentGeneration + 1);
      } else {
        repetitions.set(sire.id, {
          name: sire.name,
          count: 1,
          generations: [currentGeneration + 1],
        });
      }
      await collectRepetitions(sire.id, maxGenerations, currentGeneration + 1, [...path, sire.id], repetitions);
    }
  }

  // Process dam
  if (dog.damId) {
    const dam = await prisma.dog.findUnique({
      where: { id: dog.damId },
      select: { id: true, name: true, sireId: true, damId: true },
    });
    if (dam) {
      if (repetitions.has(dam.id)) {
        const existing = repetitions.get(dam.id)!;
        existing.count++;
        existing.generations.push(currentGeneration + 1);
      } else {
        repetitions.set(dam.id, {
          name: dam.name,
          count: 1,
          generations: [currentGeneration + 1],
        });
      }
      await collectRepetitions(dam.id, maxGenerations, currentGeneration + 1, [...path, dam.id], repetitions);
    }
  }
}

// ============================================================================
// ANCESTRAL INFLUENCE CALCULATION
// ============================================================================

/**
 * Calculate genetic influence percentage for each ancestor
 * @param dogId - ID of the dog
 * @param generations - Number of generations to analyze
 * @returns Map of ancestor ID to influence percentage
 */
export async function calculateAncestralInfluence(
  dogId: string,
  generations: number = 10
): Promise<Array<{ id: string; name: string; influence: number; generation: number }>> {
  const cacheKey = `influence:${dogId}:${generations}`;
  const cached = await getCached<any>(cacheKey);
  if (cached) return cached;

  const influences: Array<{ id: string; name: string; influence: number; generation: number }> = [];
  await collectInfluences(dogId, generations, 0, influences);

  // Sort by influence (highest first)
  influences.sort((a, b) => b.influence - a.influence);

  await setCached(cacheKey, influences, CACHE_TTL.LINEBREEDING);

  return influences;
}

async function collectInfluences(
  dogId: string,
  maxGenerations: number,
  currentGeneration: number,
  influences: Array<{ id: string; name: string; influence: number; generation: number }>
): Promise<void> {
  if (currentGeneration >= maxGenerations) return;

  const dog = await prisma.dog.findUnique({
    where: { id: dogId },
    select: {
      id: true,
      name: true,
      sireId: true,
      damId: true,
    },
  });

  if (!dog) return;

  // Process sire
  if (dog.sireId) {
    const sire = await prisma.dog.findUnique({
      where: { id: dog.sireId },
      select: { id: true, name: true, sireId: true, damId: true },
    });
    if (sire) {
      const influence = Math.pow(0.5, currentGeneration + 2) * 100; // 50% for parents, 25% for grandparents, etc.
      influences.push({
        id: sire.id,
        name: sire.name,
        influence,
        generation: currentGeneration + 1,
      });
      await collectInfluences(sire.id, maxGenerations, currentGeneration + 1, influences);
    }
  }

  // Process dam
  if (dog.damId) {
    const dam = await prisma.dog.findUnique({
      where: { id: dog.damId },
      select: { id: true, name: true, sireId: true, damId: true },
    });
    if (dam) {
      const influence = Math.pow(0.5, currentGeneration + 2) * 100;
      influences.push({
        id: dam.id,
        name: dam.name,
        influence,
        generation: currentGeneration + 1,
      });
      await collectInfluences(dam.id, maxGenerations, currentGeneration + 1, influences);
    }
  }
}

// ============================================================================
// LINEBREEDING ANALYSIS
// ============================================================================

/**
 * Analyze linebreeding patterns in pedigree
 * @param dogId - ID of the dog
 * @param generations - Number of generations to analyze
 * @returns Linebreeding analysis
 */
export async function analyzeLinebreeding(
  dogId: string,
  generations: number = 10
): Promise<LinebreedingAnalysis[]> {
  const cacheKey = `linebreeding:${dogId}:${generations}`;
  const cached = await getCached<LinebreedingAnalysis[]>(cacheKey);
  if (cached) return cached;

  const repetitions = await detectPedigreeRepetitions(dogId, generations);
  const linebreeding: LinebreedingAnalysis[] = [];

  for (const [id, data] of repetitions.entries()) {
    if (data.count > 1) {
      // Calculate total influence
      let totalInfluence = 0;
      for (const gen of data.generations) {
        totalInfluence += Math.pow(0.5, gen + 1) * 100;
      }

      // Only include if influence > 6.25% (appears within 4 generations)
      if (totalInfluence > 6.25) {
        // Generate pattern string (e.g., "3x4", "4x5x5")
        const pattern = generateLinebreedingPattern(data.generations);

        linebreeding.push({
          ancestorId: id,
          ancestorName: data.name,
          percentage: totalInfluence,
          occurrences: data.count,
          minGeneration: Math.min(...data.generations),
          maxGeneration: Math.max(...data.generations),
          pattern,
        });
      }
    }
  }

  // Sort by percentage (highest first)
  linebreeding.sort((a, b) => b.percentage - a.percentage);

  await setCached(cacheKey, linebreeding, CACHE_TTL.LINEBREEDING);

  // Store in database
  for (const lb of linebreeding) {
    await prisma.linebreedingStats.upsert({
      where: {
        dogId_ancestorId: {
          dogId,
          ancestorId: lb.ancestorId,
        },
      },
      update: {
        percentageInPedigree: lb.percentage,
        occurrenceCount: lb.occurrences,
        maxGeneration: lb.maxGeneration,
        minGeneration: lb.minGeneration,
        calculatedAt: new Date(),
      },
      create: {
        dogId,
        ancestorId: lb.ancestorId,
        percentageInPedigree: lb.percentage,
        occurrenceCount: lb.occurrences,
        maxGeneration: lb.maxGeneration,
        minGeneration: lb.minGeneration,
        calculatedAt: new Date(),
      },
    });
  }

  return linebreeding;
}

function generateLinebreedingPattern(generations: number[]): string {
  // Count occurrences per generation
  const counts = new Map<number, number>();
  for (const gen of generations) {
    counts.set(gen, (counts.get(gen) || 0) + 1);
  }

  // Generate pattern string
  const patternParts: string[] = [];
  for (const [gen, count] of counts.entries()) {
    patternParts.push(`${gen}${count > 1 ? `(${count})` : ''}`);
  }

  return patternParts.join('x');
}

// ============================================================================
// DESCENDANT COUNTING
// ============================================================================

/**
 * Count total descendants for a dog
 * @param dogId - ID of the dog
 * @param maxGenerations - Maximum generations to count (default: 10)
 * @returns Descendant statistics
 */
export async function countDescendants(
  dogId: string,
  maxGenerations: number = 10
): Promise<DescendantStats> {
  const cacheKey = `descendants:${dogId}:${maxGenerations}`;
  const cached = await getCached<DescendantStats>(cacheKey);
  if (cached) return cached;

  const stats: DescendantStats = {
    total: 0,
    male: 0,
    female: 0,
    byGeneration: {},
    influential: 0,
  };

  // Count direct offspring (generation 1)
  const directOffspring = await prisma.dog.findMany({
    where: {
      OR: [{ sireId: dogId }, { damId: dogId }],
    },
    select: {
      id: true,
      sex: true,
    },
  });

  stats.total += directOffspring.length;
  stats.male += directOffspring.filter(d => d.sex === 'MALE').length;
  stats.female += directOffspring.filter(d => d.sex === 'FEMALE').length;
  stats.byGeneration[1] = directOffspring.length;

  // Count descendants recursively for subsequent generations
  for (const offspring of directOffspring) {
    await countDescendantsRecursive(offspring.id, 2, maxGenerations, stats);
  }

  // Count influential descendants (dogs with >100 descendants)
  for (const offspring of directOffspring) {
    const offspringDescendants = await countDescendantsRecursiveSimple(offspring.id, maxGenerations);
    if (offspringDescendants > 100) {
      stats.influential++;
    }
  }

  await setCached(cacheKey, stats, CACHE_TTL.DESCENDANTS);

  // Store in database for each generation
  for (const [gen, count] of Object.entries(stats.byGeneration)) {
    await prisma.descendantStats.upsert({
      where: {
        dogId_generation: {
          dogId,
          generation: parseInt(gen),
        },
      },
      update: {
        totalDescendants: count,
        maleDescendants: stats.male,
        femaleDescendants: stats.female,
        lastCalculatedAt: new Date(),
      },
      create: {
        dogId,
        generation: parseInt(gen),
        totalDescendants: count,
        maleDescendants: stats.male,
        femaleDescendants: stats.female,
        lastCalculatedAt: new Date(),
      },
    });
  }

  return stats;
}

async function countDescendantsRecursive(
  dogId: string,
  currentGeneration: number,
  maxGenerations: number,
  stats: DescendantStats
): Promise<void> {
  if (currentGeneration > maxGenerations) return;

  const offspring = await prisma.dog.findMany({
    where: {
      OR: [{ sireId: dogId }, { damId: dogId }],
    },
    select: {
      id: true,
      sex: true,
    },
  });

  stats.total += offspring.length;
  stats.male += offspring.filter(d => d.sex === 'MALE').length;
  stats.female += offspring.filter(d => d.sex === 'FEMALE').length;
  stats.byGeneration[currentGeneration] = (stats.byGeneration[currentGeneration] || 0) + offspring.length;

  for (const child of offspring) {
    await countDescendantsRecursive(child.id, currentGeneration + 1, maxGenerations, stats);
  }
}

async function countDescendantsRecursiveSimple(
  dogId: string,
  maxGenerations: number
): Promise<number> {
  if (maxGenerations <= 0) return 0;

  const offspring = await prisma.dog.count({
    where: {
      OR: [{ sireId: dogId }, { damId: dogId }],
    },
  });

  let total = offspring;
  const directOffspring = await prisma.dog.findMany({
    where: {
      OR: [{ sireId: dogId }, { damId: dogId }],
    },
    select: { id: true },
  });

  for (const child of directOffspring) {
    total += await countDescendantsRecursiveSimple(child.id, maxGenerations - 1);
  }

  return total;
}

// ============================================================================
// BREEDER RANKING
// ============================================================================

/**
 * Rank breeders by influence
 * @param limit - Maximum number of breeders to return (default: 100)
 * @returns Ranked breeders
 */
export async function rankInfluentialBreeders(limit: number = 100): Promise<BreederRanking[]> {
  const cacheKey = `breeder-ranking:${limit}`;
  const cached = await getCached<BreederRanking[]>(cacheKey);
  if (cached) return cached;

  const breeders = await prisma.breeder.findMany({
    where: { isActive: true },
    select: {
      id: true,
      kennelName: true,
      dogs: {
        select: {
          id: true,
          coi5Gen: true,
          coi10Gen: true,
        },
      },
    },
  });

  const rankings: BreederRanking[] = [];

  for (const breeder of breeders) {
    const totalOffspring = breeder.dogs.length;
    
    // Count influential offspring
    let influentialOffspring = 0;
    for (const dog of breeder.dogs) {
      const descendants = await countDescendantsRecursiveSimple(dog.id, 5);
      if (descendants > 100) {
        influentialOffspring++;
      }
    }

    // Calculate average COI
    const coiValues = breeder.dogs
      .map(d => d.coi5Gen || d.coi10Gen || 0)
      .filter(coi => coi > 0);
    const averageCOI = coiValues.length > 0
      ? coiValues.reduce((sum, coi) => sum + coi, 0) / coiValues.length
      : 0;

    rankings.push({
      id: breeder.id,
      kennelName: breeder.kennelName || 'Unknown',
      totalOffspring,
      influentialOffspring,
      averageCOI,
      rank: 0, // Will be set after sorting
    });
  }

  // Sort by influential offspring (descending)
  rankings.sort((a, b) => b.influentialOffspring - a.influentialOffspring);

  // Assign ranks
  rankings.forEach((r, index) => {
    r.rank = index + 1;
  });

  // Limit results
  const result = rankings.slice(0, limit);

  await setCached(cacheKey, result, CACHE_TTL.RANKING);

  return result;
}

// ============================================================================
// CACHE INVALIDATION
// ============================================================================

/**
 * Invalidate cache for a specific dog
 * @param dogId - ID of the dog
 */
export async function invalidateDogCache(dogId: string): Promise<void> {
  await invalidateCache(`pedigree:${dogId}:*`);
  await invalidateCache(`coi:${dogId}:*`);
  await invalidateCache(`repetitions:${dogId}:*`);
  await invalidateCache(`influence:${dogId}:*`);
  await invalidateCache(`linebreeding:${dogId}:*`);
  await invalidateCache(`descendants:${dogId}:*`);
}

/**
 * Invalidate all genealogy cache
 */
export async function invalidateAllGenealogyCache(): Promise<void> {
  await invalidateCache('pedigree:*');
  await invalidateCache('coi:*');
  await invalidateCache('common:*');
  await invalidateCache('repetitions:*');
  await invalidateCache('influence:*');
  await invalidateCache('linebreeding:*');
  await invalidateCache('descendants:*');
  await invalidateCache('breeder-ranking:*');
}
