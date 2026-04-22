import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  surname: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  role: z.enum(['USER', 'BREEDER']).default('USER'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  name: z.string().optional(),
  surname: z.string().optional(),
  phone: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  preferences: z.record(z.any()).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

// POST /api/auth/register - Register new user
router.post('/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);
    
    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash: hashedPassword,
        name: validatedData.name,
        surname: validatedData.surname,
        countryCode: validatedData.countryCode,
        role: validatedData.role,
        verificationToken,
      },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        role: true,
        countryCode: true,
        isVerified: true,
        createdAt: true,
      },
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    
    res.status(201).json({
      user,
      token,
      refreshToken,
      requiresVerification: !user.isVerified,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.passwordHash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        role: user.role,
        countryCode: user.countryCode,
        isVerified: user.isVerified,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Generate new JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      { userId: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({
      token,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        role: true,
        countryCode: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        lastLogin: true,
        preferences: true,
      },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const validatedData = updateProfileSchema.parse(req.body);
    
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: validatedData,
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        role: true,
        countryCode: true,
        phone: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        preferences: true,
      },
    });
    
    res.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/change-password - Change password
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const validatedData = changePasswordSchema.parse(req.body);
    
    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(validatedData.currentPassword, user.passwordHash);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(validatedData.newPassword, 12);
    
    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If the email exists, a reset link will be sent' });
    }
    
    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    
    // Update user with reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires,
      },
    });
    
    // In production, send email here
    console.log(`Password reset for ${email}: ${resetToken}`);
    
    res.json({ message: 'If the email exists, a reset link will be sent' });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password - Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/verify-email - Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        isVerified: false,
      },
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }
    
    // Mark user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationDate: new Date(),
      },
    });
    
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as authRoutes };
