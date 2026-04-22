# Input Validation Guide

This guide explains the input validation system used in GSD Atlas.

## Overview

GSD Atlas uses **Zod** for runtime type validation and data sanitization. This ensures that all incoming data is validated before processing, preventing invalid data from entering the system.

## Architecture

### Components

1. **Schemas** (`src/validation/schemas.ts`) - Zod schemas for all entities
2. **Middleware** (`src/middleware/validation.ts`) - Express middleware for validation
3. **Sanitization** - Automatic XSS prevention for string inputs

## Available Schemas

### Dog Schemas

```typescript
import { createDogSchema, updateDogSchema, dogQuerySchema } from '../validation/schemas';

// Create dog
router.post('/', validateBody(createDogSchema), async (req, res) => {
  const dog = await prisma.dog.create({ data: req.body });
  res.json(dog);
});

// Update dog
router.put('/:id', validateBody(updateDogSchema), async (req, res) => {
  const dog = await prisma.dog.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(dog);
});

// List dogs with query validation
router.get('/', validateQuery(dogQuerySchema), async (req, res) => {
  const { limit, offset, sex, color } = req.query;
  // ...
});
```

### User Schemas

```typescript
import { createUserSchema, loginSchema, updateUserSchema } from '../validation/schemas';

// Register user
router.post('/register', validateBody(createUserSchema), async (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
});

// Login
router.post('/login', validateBody(loginSchema), async (req, res) => {
  const token = await login(req.body);
  res.json({ token });
});
```

### Other Schemas

Available schemas for:
- Breeder (`createBreederSchema`, `updateBreederSchema`)
- Organization (`createOrganizationSchema`, `updateOrganizationSchema`)
- Breeding (`createBreedingSchema`, `updateBreedingSchema`)
- Health Record (`createHealthRecordSchema`, `updateHealthRecordSchema`)
- Show Result (`createShowResultSchema`, `updateShowResultSchema`)
- Photo (`uploadPhotoSchema`)
- Search (`searchSchema`)
- Pedigree (`pedigreeQuerySchema`)
- COI (`coiQuerySchema`)
- Breeding Simulator (`breedingSimulatorSchema`)
- Import (`importSchema`)
- Pagination (`paginationSchema`)

## Middleware Usage

### validateBody

Validates request body against a schema:

```typescript
import { validateBody } from '../middleware/validation';
import { createDogSchema } from '../validation/schemas';

router.post('/dogs', validateBody(createDogSchema), async (req, res) => {
  // req.body is validated and typed
  const dog = await prisma.dog.create({ data: req.body });
  res.json(dog);
});
```

### validateQuery

Validates query parameters:

```typescript
import { validateQuery } from '../middleware/validation';
import { dogQuerySchema } from '../validation/schemas';

router.get('/dogs', validateQuery(dogQuerySchema), async (req, res) => {
  // req.query is validated and coerced to correct types
  const { limit, offset, sex } = req.query;
  // ...
});
```

### validateParams

Validates URL parameters:

```typescript
import { validateParams } from '../middleware/validation';
import { z } from 'zod';

const idSchema = z.object({ id: z.string().uuid() });

router.get('/dogs/:id', validateParams(idSchema), async (req, res) => {
  // req.params.id is validated UUID
  const dog = await prisma.dog.findUnique({
    where: { id: req.params.id },
  });
  res.json(dog);
});
```

### sanitizeBody

Sanitizes string inputs to prevent XSS:

```typescript
import { sanitizeBody } from '../middleware/validation';

// Sanitize all string fields
router.post('/dogs', sanitizeBody(), async (req, res) => {
  // All string fields in req.body are sanitized
});

// Sanitize specific fields only
router.post('/dogs', sanitizeBody(['name', 'description']), async (req, res) => {
  // Only 'name' and 'description' fields are sanitized
});
```

### validateAndSanitizeBody

Combines validation and sanitization:

```typescript
import { validateAndSanitizeBody } from '../middleware/validation';
import { createDogSchema } from '../validation/schemas';

router.post(
  '/dogs',
  validateAndSanitizeBody(createDogSchema, ['name', 'description']),
  async (req, res) => {
    // Body is validated and specified fields are sanitized
    const dog = await prisma.dog.create({ data: req.body });
    res.json(dog);
  }
);
```

## Error Response Format

When validation fails, the API returns a 400 status with detailed error messages:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name is required"
    },
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

## Custom Validation

### Adding Custom Rules

```typescript
import { z } from 'zod';

// Custom validation with regex
const registrationNumberSchema = z
  .string()
  .regex(/^[A-Z]{2} \d{6}$/, 'Invalid registration number format');

// Custom validation with function
const ageSchema = z
  .number()
  .min(0)
  .max(30)
  .refine((val) => val >= 1 && val <= 20, {
    message: 'Age must be between 1 and 20',
  });

// Using custom schema
const createDogSchema = z.object({
  registrationNumber: registrationNumberSchema,
  age: ageSchema,
});
```

### Conditional Validation

```typescript
const createDogSchema = z
  .object({
    isAlive: z.boolean(),
    deathDate: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.isAlive) {
        return data.deathDate !== undefined;
      }
      return true;
    },
    {
      message: 'Death date is required when dog is not alive',
      path: ['deathDate'],
    }
  );
```

## Schema Examples

### Dog Schema

```typescript
export const createDogSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  registrationNumber: z
    .string()
    .min(1, 'Registration number is required')
    .max(50, 'Registration number must be less than 50 characters')
    .trim()
    .optional(),
  sex: z.enum(['MALE', 'FEMALE']),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  color: z.string().max(100).trim().optional(),
  countryCode: z.string().length(2).regex(/^[A-Z]{2}$/).optional(),
});
```

### User Schema

```typescript
export const createUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(1, 'Email is required')
    .max(255)
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/[0-9]/, 'Must contain number'),
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  role: z.enum(['USER', 'BREEDER', 'ADMIN']).default('USER'),
});
```

## Best Practices

### 1. Always Validate Input

```typescript
// Good
router.post('/dogs', validateBody(createDogSchema), async (req, res) => {
  const dog = await prisma.dog.create({ data: req.body });
});

// Bad - No validation
router.post('/dogs', async (req, res) => {
  const dog = await prisma.dog.create({ data: req.body }); // Unsafe!
});
```

### 2. Use Type Inference

```typescript
import type { CreateDogInput } from '../validation/schemas';

router.post('/dogs', validateBody(createDogSchema), async (req, res) => {
  // req.body is typed as CreateDogInput
  const dogData: CreateDogInput = req.body;
});
```

### 3. Sanitize User Input

```typescript
// Good - Sanitize user-provided text fields
router.post(
  '/dogs',
  validateAndSanitizeBody(createDogSchema, ['name', 'description']),
  async (req, res) => {
    const dog = await prisma.dog.create({ data: req.body });
  }
);

// Bad - No sanitization
router.post('/dogs', validateBody(createDogSchema), async (req, res) => {
  const dog = await prisma.dog.create({ data: req.body }); // XSS risk!
});
```

### 4. Validate Query Parameters

```typescript
// Good - Validate query params
router.get('/dogs', validateQuery(dogQuerySchema), async (req, res) => {
  const { limit, offset } = req.query; // Properly typed
});

// Bad - No validation
router.get('/dogs', async (req, res) => {
  const limit = parseInt(req.query.limit as string); // Unsafe!
});
```

### 5. Provide Clear Error Messages

```typescript
// Good - Clear error messages
z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters')

// Bad - Generic error messages
z.string().min(1).max(100)
```

## Security Considerations

### XSS Prevention

The sanitization middleware prevents XSS attacks by:
- Removing `<` and `>` characters
- Removing `javascript:` protocol
- Removing inline event handlers (`onclick=`, etc.)

### SQL Injection Prevention

Using Zod validation prevents SQL injection by:
- Validating data types before database operations
- Using Prisma ORM (parameterized queries)
- Never concatenating user input into SQL queries

### Type Safety

Zod provides runtime type safety:
- Catches type mismatches at runtime
- Prevents invalid data from entering the database
- Ensures data consistency

## Testing Validation

### Unit Tests

```typescript
import { createDogSchema } from '../validation/schemas';

describe('Dog Schema Validation', () => {
  it('should validate valid dog data', () => {
    const data = {
      name: 'Max',
      sex: 'MALE',
      birthDate: '2020-01-01',
    };
    expect(() => createDogSchema.parse(data)).not.toThrow();
  });

  it('should reject invalid dog data', () => {
    const data = {
      name: '', // Invalid: empty string
      sex: 'INVALID', // Invalid: not MALE or FEMALE
    };
    expect(() => createDogSchema.parse(data)).toThrow();
  });
});
```

### Integration Tests

```typescript
import request from 'supertest';
import { app } from '../index';

describe('Dog API Validation', () => {
  it('should reject invalid dog creation', async () => {
    const response = await request(app)
      .post('/api/dogs')
      .send({
        name: '', // Invalid
        sex: 'INVALID', // Invalid
      })
      .expect(400);

    expect(response.body.error).toBe('Validation failed');
  });
});
```

## Migration Guide

### Adding Validation to Existing Routes

```typescript
// Before
router.post('/dogs', async (req, res) => {
  const dog = await prisma.dog.create({ data: req.body });
  res.json(dog);
});

// After
import { validateBody } from '../middleware/validation';
import { createDogSchema } from '../validation/schemas';

router.post('/dogs', validateBody(createDogSchema), async (req, res) => {
  const dog = await prisma.dog.create({ data: req.body });
  res.json(dog);
});
```

## Troubleshooting

### Validation Errors Not Appearing

**Problem**: Validation errors not being returned to client.

**Solution**: Ensure validation middleware is applied before route handler:

```typescript
// Correct order
router.post('/dogs', validateBody(createDogSchema), handler);

// Incorrect order
router.post('/dogs', handler, validateBody(createDogSchema));
```

### Type Errors

**Problem**: TypeScript errors with inferred types.

**Solution**: Use type inference from Zod schemas:

```typescript
import type { CreateDogInput } from '../validation/schemas';

const handler = async (req: Request, res: Response) => {
  const data: CreateDogInput = req.body; // Properly typed
};
```

### Sanitization Not Working

**Problem**: Sanitization not removing dangerous characters.

**Solution**: Ensure sanitization middleware is applied after validation:

```typescript
// Correct order
router.post(
  '/dogs',
  validateBody(createDogSchema),
  sanitizeBody(['name']),
  handler
);

// Incorrect order
router.post(
  '/dogs',
  sanitizeBody(['name']),
  validateBody(createDogSchema),
  handler
);
```

## Additional Resources

- [Zod Documentation](https://zod.dev/)
- [Express Middleware Guide](https://expressjs.com/en/guide/writing-middleware.html)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
