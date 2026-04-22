import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import csv from 'csv-parser';
import { Readable } from 'stream';
import ImportService, { DataSourceType, ImportResult } from '../services/import';

const router = Router();

const createDataSourceSchema = z.object({
  name: z.string(),
  type: z.enum(['MANUAL', 'CSV', 'API', 'SCRAPING', 'IMPORT']),
  description: z.string().optional(),
  url: z.string().url().optional(),
  apiEndpoint: z.string().optional(),
  importFrequency: z.string().optional(),
});

const updateDataSourceSchema = createDataSourceSchema.partial();

const manualImportSchema = z.object({
  name: z.string(),
  registrationNumber: z.string().optional(),
  chipNumber: z.string().optional(),
  sex: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().optional(),
  color: z.string().optional(),
  country: z.string().optional(),
  sireName: z.string().optional(),
  sireRegistrationNumber: z.string().optional(),
  damName: z.string().optional(),
  damRegistrationNumber: z.string().optional(),
  breederName: z.string().optional(),
  breederKennel: z.string().optional(),
  skipDuplicates: z.boolean().default(true),
  updateExisting: z.boolean().default(false),
});

// POST /api/import/data-source - Create data source
router.post('/data-source', authenticate, authorize('ADMIN', 'MODERATOR'), async (req: AuthRequest, res) => {
  try {
    const validatedData = createDataSourceSchema.parse(req.body);
    
    const dataSource = await prisma.dataSource.create({
      data: {
        ...validatedData,
        createdBy: req.user?.userId,
      },
    });
    
    res.status(201).json({ data: dataSource });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error creating data source:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/import/manual - Manual import with fuzzy matching
router.post('/manual', authenticate, async (req: AuthRequest, res) => {
  try {
    const validatedData = manualImportSchema.parse(req.body);
    
    const normalizedData = {
      ...validatedData,
      birthDate: validatedData.birthDate ? new Date(validatedData.birthDate) : undefined,
      source: DataSourceType.MANUAL,
    };
    
    const result = await ImportService.importManually(normalizedData, {
      skipDuplicates: validatedData.skipDuplicates,
      updateExisting: validatedData.updateExisting,
    });
    
    res.json({
      data: {
        dogId: result.dogId,
        wasDuplicate: result.wasDuplicate,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error importing manually:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/import/check-duplicates - Check for duplicates using fuzzy matching
router.post('/check-duplicates', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, registrationNumber, sex, birthDate, breederName } = req.body;
    
    const { DuplicateDetector } = await import('../services/import');
    
    const normalizedData = {
      name,
      registrationNumber,
      sex,
      birthDate: birthDate ? new Date(birthDate) : undefined,
      breederName,
      source: DataSourceType.MANUAL,
    };
    
    const duplicates = await DuplicateDetector.findDuplicates(normalizedData);
    
    res.json({
      data: {
        duplicates,
        hasHighConfidenceMatch: duplicates.some(d => d.confidence === 'high'),
      },
    });
  } catch (error) {
    console.error('Error checking duplicates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/import/data-sources - List data sources
router.get('/data-sources', authenticate, authorize('ADMIN', 'MODERATOR'), async (req, AuthRequest, res) => {
  try {
    const dataSources = await prisma.dataSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { importBatches: true },
        },
      },
    });
    
    res.json({ data: dataSources });
  } catch (error) {
    console.error('Error fetching data sources:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/import/csv - Import CSV file with fuzzy matching
router.post('/csv', authenticate, authorize('ADMIN', 'MODERATOR'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { skipDuplicates = true, updateExisting = false } = req.body;
    
    const result = await ImportService.importFromCSV(req.file.buffer, DataSourceType.CSV, {
      skipDuplicates,
      updateExisting,
    });
    
    res.json({
      data: result,
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/import/excel - Import Excel file with fuzzy matching
router.post('/excel', authenticate, authorize('ADMIN', 'MODERATOR'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { skipDuplicates = true, updateExisting = false, sheetName } = req.body;
    
    const result = await ImportService.importFromExcel(req.file.buffer, DataSourceType.EXCEL, {
      skipDuplicates,
      updateExisting,
      sheetName,
    });
    
    res.json({
      data: result,
    });
  } catch (error) {
    console.error('Error importing Excel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/import/batches - List import batches
router.get('/batches', authenticate, authorize('ADMIN', 'MODERATOR'), async (req: AuthRequest, res) => {
  try {
    const { dataSourceId, status } = req.query;
    
    const where: any = {};
    if (dataSourceId) where.dataSourceId = dataSourceId;
    if (status) where.status = status;
    
    const batches = await prisma.importBatch.findMany({
      where,
      include: {
        dataSource: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { importLogs: true },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
    
    res.json({ data: batches });
  } catch (error) {
    console.error('Error fetching import batches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/import/batches/:id - Get import batch details
router.get('/batches/:id', authenticate, authorize('ADMIN', 'MODERATOR'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const batch = await prisma.importBatch.findUnique({
      where: { id },
      include: {
        dataSource: {
          select: { id: true, name: true, type: true },
        },
        importLogs: {
          take: 100,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    if (!batch) {
      return res.status(404).json({ error: 'Import batch not found' });
    }
    
    res.json({ data: batch });
  } catch (error) {
    console.error('Error fetching import batch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/import/scraping - Import from structured scraping
router.post('/scraping', authenticate, authorize('ADMIN', 'MODERATOR'), async (req: AuthRequest, res) => {
  try {
    const { data, sourceUrl, skipDuplicates = true, updateExisting = false } = req.body;
    
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Data must be an array' });
    }
    
    const result = await ImportService.importFromScraping(data, sourceUrl, {
      skipDuplicates,
      updateExisting,
    });
    
    res.json({
      data: result,
    });
  } catch (error) {
    console.error('Error importing from scraping:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/import/template - Download import template
router.get('/template', async (req: AuthRequest, res) => {
  try {
    const { type = 'csv' } = req.query;
    
    if (type !== 'csv' && type !== 'excel') {
      return res.status(400).json({ error: 'Invalid template type' });
    }
    
    const template = await ImportService.generateTemplate(type as 'csv' | 'excel');
    
    const filename = type === 'csv' 
      ? 'plantilla_importacion.csv' 
      : 'plantilla_importacion.xlsx';
    
    const contentType = type === 'csv' 
      ? 'text/csv' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType);
    res.send(template);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions for processing records
async function processDogRecord(data: any, dataSourceId: string, batchId: string) {
  // Map CSV columns to database fields
  const dogData = {
    name: data.name || data.Name,
    registrationNumber: data.registration_number || data.RegistrationNumber,
    sex: (data.sex || data.Sex)?.toUpperCase(),
    birthDate: data.birth_date || data.BirthDate ? new Date(data.birth_date || data.BirthDate) : null,
    color: data.color || data.Color,
    weightKg: data.weight_kg || data.WeightKg ? parseFloat(data.weight_kg || data.WeightKg) : null,
    chipNumber: data.chip_number || data.ChipNumber,
    sireId: data.sire_id || data.SireId,
    damId: data.dam_id || data.DamId,
    breederId: data.breeder_id || data.BreederId,
    currentOwnerId: data.owner_id || data.OwnerId,
    clubId: data.club_id || data.ClubId,
    dataSourceId,
    importBatchId: batchId,
  };
  
  return prisma.dog.create({
    data: dogData,
  });
}

async function processBreederRecord(data: any, dataSourceId: string, batchId: string) {
  const breederData = {
    kennelName: data.kennel_name || data.KennelName,
    legalName: data.legal_name || data.LegalName,
    registrationNumber: data.registration_number || data.RegistrationNumber,
    countryCode: data.country_code || data.CountryCode,
    region: data.region || data.Region,
    email: data.email || data.Email,
    phone: data.phone || data.Phone,
    website: data.website || data.Website,
    foundedYear: data.founded_year || data.FoundedYear ? parseInt(data.founded_year || data.FoundedYear) : null,
    description: data.description || data.Description,
    dataSourceId,
    importBatchId: batchId,
  };
  
  return prisma.breeder.create({
    data: breederData,
  });
}

async function processOrganizationRecord(data: any, dataSourceId: string, batchId: string) {
  const orgData = {
    name: data.name || data.Name,
    type: (data.type || data.Type)?.toUpperCase(),
    code: data.code || data.Code,
    countryCode: data.country_code || data.CountryCode,
    region: data.region || data.Region,
    website: data.website || data.Website,
    email: data.email || data.Email,
    phone: data.phone || data.Phone,
    foundedYear: data.founded_year || data.FoundedYear ? parseInt(data.founded_year || data.FoundedYear) : null,
    isOfficial: data.is_official || data.IsOfficial === 'true' || data.IsOfficial === true,
    dataSourceId,
    importBatchId: batchId,
  };
  
  return prisma.organization.create({
    data: orgData,
  });
}

export { router as importRoutes };
