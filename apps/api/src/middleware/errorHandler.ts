import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

// Custom error codes
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  REDIS_ERROR = 'REDIS_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_ERROR = 'CSRF_ERROR',
}

// Custom error class
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log error
  console.error('Error:', {
    name: error.name,
    message: error.message,
    stack: isDevelopment ? error.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      code: ErrorCode.VALIDATION_ERROR,
      error: 'Validation Error',
      message: 'Invalid input data',
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    });
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return res.status(409).json({
          code: ErrorCode.CONFLICT,
          error: 'Conflict',
          message: 'A record with this unique field already exists',
          details: isDevelopment ? error.meta : undefined,
        });
      case 'P2025':
        return res.status(404).json({
          code: ErrorCode.NOT_FOUND,
          error: 'Not Found',
          message: 'Record not found',
        });
      case 'P2003':
        return res.status(400).json({
          code: ErrorCode.VALIDATION_ERROR,
          error: 'Validation Error',
          message: 'Foreign key constraint failed',
          details: isDevelopment ? error.meta : undefined,
        });
      default:
        return res.status(500).json({
          code: ErrorCode.DATABASE_ERROR,
          error: 'Database Error',
          message: 'A database error occurred',
          details: isDevelopment ? { code: error.code, meta: error.meta } : undefined,
        });
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      code: ErrorCode.VALIDATION_ERROR,
      error: 'Validation Error',
      message: 'Invalid data provided',
      details: isDevelopment ? error.message : undefined,
    });
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      code: error.code,
      error: error.name,
      message: error.message,
      details: isDevelopment ? error.details : undefined,
    });
  }

  // Handle specific error names
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      code: ErrorCode.VALIDATION_ERROR,
      error: 'Validation Error',
      message: error.message,
    });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      code: ErrorCode.UNAUTHORIZED,
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token',
    });
  }

  if (error.name === 'ForbiddenError') {
    return res.status(403).json({
      code: ErrorCode.FORBIDDEN,
      error: 'Forbidden',
      message: 'Insufficient permissions',
    });
  }

  if (error.name === 'NotFoundError') {
    return res.status(404).json({
      code: ErrorCode.NOT_FOUND,
      error: 'Not Found',
      message: 'Resource not found',
    });
  }

  // Default error
  res.status(500).json({
    code: ErrorCode.INTERNAL_ERROR,
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'Something went wrong',
    details: isDevelopment ? { stack: error.stack } : undefined,
  });
}
