import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

const photoSchema = z.object({
  dogId: z.string(),
  caption: z.string().optional(),
  photographerName: z.string().optional(),
  photographerCredit: z.string().optional(),
  isPrimary: z.boolean().default(false),
  photoDate: z.string().optional(),
  location: z.string().optional(),
});

const updatePhotoSchema = photoSchema.partial();

// Upload helper function
async function uploadToS3(file: Express.Multer.File, key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET || 'gsd-atlas-photos',
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });
  
  await s3Client.send(command);
  
  return `https://${process.env.AWS_S3_BUCKET || 'gsd-atlas-photos'}.s3.amazonaws.com/${key}`;
}

// POST /api/photos/upload - Upload photo
router.post('/upload', authenticate, upload.single('photo'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { dogId, caption, photographerName, photographerCredit, isPrimary, photoDate, location } = req.body;
    
    if (!dogId) {
      return res.status(400).json({ error: 'Dog ID is required' });
    }
    
    // Verify dog exists and user has permission
    const dog = await prisma.dog.findUnique({
      where: { id: dogId },
      select: { breederId: true, currentOwnerId: true },
    });
    
    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }
    
    // BREEDER can only upload photos to their own dogs
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      
      if (!breeder || dog.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only upload photos for your own dogs' });
      }
    }
    
    // Generate unique filename
    const fileExtension = req.file.originalname.split('.').pop();
    const fileName = `${dogId}/${uuidv4()}.${fileExtension}`;
    
    // Upload to S3
    const photoUrl = await uploadToS3(req.file, fileName);
    
    // If this is primary, set other photos to non-primary
    if (isPrimary === 'true' || isPrimary === true) {
      await prisma.photo.updateMany({
        where: { dogId },
        data: { isPrimary: false },
      });
    }
    
    // Create photo record
    const photo = await prisma.photo.create({
      data: {
        dogId,
        url: photoUrl,
        caption,
        photographerName,
        photographerCredit,
        isPrimary: isPrimary === 'true' || isPrimary === true,
        photoDate: photoDate ? new Date(photoDate) : null,
        location,
        fileSizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        storageProvider: 'S3',
        storagePath: fileName,
      },
      include: {
        dog: {
          select: { id: true, name: true },
        },
      },
    });
    
    res.status(201).json({ data: photo });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/photos - Create photo record (with external URL)
router.post('/', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const validatedData = photoSchema.parse(req.body);
    
    // Verify dog exists
    const dog = await prisma.dog.findUnique({
      where: { id: validatedData.dogId },
      select: { breederId: true },
    });
    
    if (!dog) {
      return res.status(404).json({ error: 'Dog not found' });
    }
    
    // BREEDER can only add photos to their own dogs
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      
      if (!breeder || dog.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only add photos to your own dogs' });
      }
    }
    
    // If this is primary, set other photos to non-primary
    if (validatedData.isPrimary) {
      await prisma.photo.updateMany({
        where: { dogId: validatedData.dogId },
        data: { isPrimary: false },
      });
    }
    
    const photo = await prisma.photo.create({
      data: {
        ...validatedData,
        photoDate: validatedData.photoDate ? new Date(validatedData.photoDate) : null,
      },
      include: {
        dog: {
          select: { id: true, name: true },
        },
      },
    });
    
    res.status(201).json({ data: photo });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error creating photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/photos - List photos
router.get('/', async (req, res) => {
  try {
    const { dogId, isPrimary } = req.query;
    
    const where: any = {};
    if (dogId) where.dogId = dogId;
    if (isPrimary !== undefined) where.isPrimary = isPrimary === 'true';
    
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const skip = (page - 1) * perPage;
    
    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        skip,
        take: perPage,
        include: {
          dog: {
            select: { id: true, name: true, registrationNumber: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.photo.count({ where }),
    ]);
    
    res.json({
      data: photos,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/photos/:id - Get single photo
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        dog: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            sex: true,
            birthDate: true,
          },
        },
      },
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    res.json({ data: photo });
  } catch (error) {
    console.error('Error fetching photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/photos/:id - Update photo
router.put('/:id', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const validatedData = updatePhotoSchema.parse(req.body);
    
    // Check permissions
    const photo = await prisma.photo.findUnique({
      where: { id },
      select: { dogId: true },
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // BREEDER can only update their own dogs' photos
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      const dog = await prisma.dog.findUnique({
        where: { id: photo.dogId },
        select: { breederId: true },
      });
      
      if (!breeder || dog?.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only update photos for your own dogs' });
      }
    }
    
    // If setting as primary, unset other primary photos
    if (validatedData.isPrimary) {
      await prisma.photo.updateMany({
        where: { dogId: photo.dogId },
        data: { isPrimary: false },
      });
    }
    
    const updatedPhoto = await prisma.photo.update({
      where: { id },
      data: validatedData.photoDate ? {
        ...validatedData,
        photoDate: new Date(validatedData.photoDate),
      } : validatedData,
      include: {
        dog: {
          select: { id: true, name: true },
        },
      },
    });
    
    res.json({ data: updatedPhoto });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error updating photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/photos/:id - Delete photo
router.delete('/:id', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    // Check permissions
    const photo = await prisma.photo.findUnique({
      where: { id },
      select: { dogId: true },
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // BREEDER can only delete their own dogs' photos
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      const dog = await prisma.dog.findUnique({
        where: { id: photo.dogId },
        select: { breederId: true },
      });
      
      if (!breeder || dog?.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only delete photos for your own dogs' });
      }
    }
    
    await prisma.photo.delete({
      where: { id },
    });
    
    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/photos/:id/set-primary - Set photo as primary
router.post('/:id/set-primary', authenticate, authorize('ADMIN', 'MODERATOR', 'BREEDER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const photo = await prisma.photo.findUnique({
      where: { id },
      select: { dogId: true },
    });
    
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // BREEDER can only set primary for their own dogs
    if (req.user?.role === 'BREEDER') {
      const breeder = await prisma.breeder.findFirst({
        where: { userId: req.user.userId },
      });
      const dog = await prisma.dog.findUnique({
        where: { id: photo.dogId },
        select: { breederId: true },
      });
      
      if (!breeder || dog?.breederId !== breeder.id) {
        return res.status(403).json({ error: 'You can only set primary photo for your own dogs' });
      }
    }
    
    // Set all photos to non-primary
    await prisma.photo.updateMany({
      where: { dogId: photo.dogId },
      data: { isPrimary: false },
    });
    
    // Set this photo as primary
    const updatedPhoto = await prisma.photo.update({
      where: { id },
      data: { isPrimary: true },
    });
    
    res.json({ data: updatedPhoto });
  } catch (error) {
    console.error('Error setting primary photo:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/photos/dog/:dogId - Get photos for a specific dog
router.get('/dog/:dogId', async (req, res) => {
  try {
    const { dogId } = req.params;
    const { isPrimary } = req.query;
    
    const where: any = { dogId };
    if (isPrimary !== undefined) where.isPrimary = isPrimary === 'true';
    
    const photos = await prisma.photo.findMany({
      where,
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
    
    res.json({ data: photos });
  } catch (error) {
    console.error('Error fetching dog photos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as photoRoutes };
