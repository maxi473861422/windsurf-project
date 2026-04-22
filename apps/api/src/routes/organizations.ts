import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

const organizationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['CLUB', 'KENNEL', 'ORGANIZATION']),
  code: z.string().optional(),
  countryCode: z.string().length(2),
  region: z.string().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  logoUrl: z.string().url().optional(),
  description: z.string().optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  isOfficial: z.boolean().default(false),
  parentOrganizationId: z.string().optional(),
});

const updateOrganizationSchema = organizationSchema.partial();

// GET /api/organizations - List organizations
router.get('/', async (req, res) => {
  try {
    const { type, countryCode, isOfficial, search } = req.query;
    
    const where: any = {};
    
    if (type) where.type = type;
    if (countryCode) where.countryCode = countryCode;
    if (isOfficial !== undefined) where.isOfficial = isOfficial === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const skip = (page - 1) * perPage;
    
    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: perPage,
        include: {
          parentOrganization: {
            select: { id: true, name: true },
          },
          _count: {
            select: { users: true, dogs: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.organization.count({ where }),
    ]);
    
    res.json({
      data: organizations,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/organizations/:id - Get single organization
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        parentOrganization: {
          select: { id: true, name: true },
        },
        childOrganizations: {
          select: { id: true, name: true, type: true },
        },
        users: {
          select: { id: true, name: true, email: true, role: true },
          take: 10,
        },
        dogs: {
          select: { id: true, name: true, sex: true, birthDate: true },
          take: 5,
          orderBy: { birthDate: 'desc' },
        },
        breeders: {
          select: { id: true, kennelName: true, legalName: true, countryCode: true },
          take: 5,
        },
        _count: {
          select: { users: true, dogs: true, breeders: true },
        },
      },
    });
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({ data: organization });
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/organizations - Create organization
router.post('/', authenticate, authorize('ADMIN', 'MODERATOR'), async (req: AuthRequest, res) => {
  try {
    const validatedData = organizationSchema.parse(req.body);
    
    // Check if code already exists
    if (validatedData.code) {
      const existing = await prisma.organization.findUnique({
        where: { code: validatedData.code },
      });
      if (existing) {
        return res.status(400).json({ error: 'Organization code already exists' });
      }
    }
    
    const organization = await prisma.organization.create({
      data: validatedData,
      include: {
        parentOrganization: {
          select: { id: true, name: true },
        },
      },
    });
    
    res.status(201).json({ data: organization });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/organizations/:id - Update organization
router.put('/:id', authenticate, authorize('ADMIN', 'MODERATOR'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateOrganizationSchema.parse(req.body);
    
    // Check if code already exists (if being updated)
    if (validatedData.code) {
      const existing = await prisma.organization.findFirst({
        where: { code: validatedData.code, id: { not: id } },
      });
      if (existing) {
        return res.status(400).json({ error: 'Organization code already exists' });
      }
    }
    
    const organization = await prisma.organization.update({
      where: { id },
      data: validatedData,
      include: {
        parentOrganization: {
          select: { id: true, name: true },
        },
      },
    });
    
    res.json({ data: organization });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/organizations/:id - Delete organization
router.delete('/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check if organization has dependencies
    const [usersCount, dogsCount, breedersCount] = await Promise.all([
      prisma.userOrganization.count({ where: { organizationId: id } }),
      prisma.dog.count({ where: { clubId: id } }),
      prisma.breeder.count({ where: { organizationId: id } }),
    ]);
    
    if (usersCount > 0 || dogsCount > 0 || breedersCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete organization with associated records',
        dependencies: { users: usersCount, dogs: dogsCount, breeders: breedersCount }
      });
    }
    
    await prisma.organization.delete({
      where: { id },
    });
    
    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/organizations/:id/users - Get organization users
router.get('/:id/users', async (req, res) => {
  try {
    const { id } = req.params;
    
    const users = await prisma.userOrganization.findMany({
      where: { organizationId: id, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            surname: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    
    res.json({ 
      data: users.map(uo => ({
        ...uo.user,
        role: uo.role,
        joinedAt: uo.joinedAt,
      }))
    });
  } catch (error) {
    console.error('Error fetching organization users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as organizationRoutes };
