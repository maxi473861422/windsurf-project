import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

/**
 * Middleware factory to validate request body against a Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware factory to validate request query against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: 'Query validation failed',
          details: errors,
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware factory to validate request params against a Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          error: 'Params validation failed',
          details: errors,
        });
      }
      next(error);
    }
  };
};

/**
 * Sanitize string inputs to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove inline event handlers
    .trim();
};

/**
 * Middleware to sanitize request body string fields
 */
export const sanitizeBody = (fields: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeInput(obj);
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
          if (fields.length === 0 || fields.includes(key)) {
            sanitized[key] = sanitize(obj[key]);
          } else {
            sanitized[key] = obj[key];
          }
        }
        return sanitized;
      }

      return obj;
    };

    req.body = sanitize(req.body);
    next();
  };
};

/**
 * Middleware to validate and sanitize request body
 */
export const validateAndSanitizeBody = (schema: ZodSchema, fields: string[] = []) => {
  return [
    validateBody(schema),
    sanitizeBody(fields),
  ];
};
