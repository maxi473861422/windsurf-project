# Developer Guide

This guide helps developers contribute to GSD Atlas.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Database](#database)
- [API Development](#api-development)
- [Frontend Development](#frontend-development)
- [Contributing](#contributing)

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Docker & Docker Compose
- Git
- PostgreSQL 14+ (optional, Docker recommended)
- Redis 7+ (optional, Docker recommended)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/gsd-atlas.git
   cd gsd-atlas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start services:**
   ```bash
   docker-compose up -d postgres redis
   ```

5. **Run database migrations:**
   ```bash
   cd packages/database
   npx prisma generate
   npx prisma migrate dev
   ```

6. **Start development servers:**
   ```bash
   # Terminal 1 - API
   cd apps/api
   npm run dev

   # Terminal 2 - Web
   cd apps/web
   npm run dev
   ```

7. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - API Docs: http://localhost:3001/api-docs

---

## Project Structure

```
gsd-atlas/
├── apps/
│   ├── api/              # Backend API (Express)
│   │   ├── src/
│   │   │   ├── config/   # Configuration files
│   │   │   ├── middleware/ # Express middleware
│   │   │   ├── routes/   # API routes
│   │   │   ├── services/ # Business logic
│   │   │   ├── utils/    # Utility functions
│   │   │   └── index.ts  # Entry point
│   │   └── package.json
│   └── web/              # Frontend (Next.js)
│       ├── src/
│       │   ├── app/      # Next.js app directory
│       │   ├── components/ # React components
│       │   ├── lib/      # Utility functions
│       │   └── styles/   # Global styles
│       └── package.json
├── packages/
│   ├── database/         # Prisma schema & migrations
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   └── shared/           # Shared utilities
│       ├── src/
│       └── package.json
├── docs/                 # Documentation
├── scripts/              # Utility scripts
└── package.json          # Root package.json
```

---

## Development Workflow

### Branch Strategy

- `main` - Production branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Hotfix branches

### Creating a Feature Branch

```bash
# Update develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature-name
```

### Commit Message Convention

Follow Conventional Commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build process or auxiliary tool changes

Examples:
```bash
feat: add dog search by registration number
fix: resolve cache invalidation issue
docs: update API documentation
test: add unit tests for cache service
```

### Pull Request Process

1. Create PR from feature branch to `develop`
2. Ensure CI checks pass
3. Request code review
4. Address review feedback
5. Merge after approval

---

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Enable all strict type checking options
- Avoid `any` types
- Use interfaces for object shapes
- Use type aliases for union types

```typescript
// Good
interface Dog {
  id: string;
  name: string;
  birthDate: Date;
}

// Bad
const dog: any = { id: 1, name: 'Max' };
```

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Use semicolons
- Max line length: 100 characters
- Use ES6+ features

```typescript
// Good
const getDog = async (id: string): Promise<Dog> => {
  return await prisma.dog.findUnique({ where: { id } });
};

// Bad
const getDog = function(id) {
  return prisma.dog.findUnique({where:{id:id}})
}
```

### Naming Conventions

- **Variables**: camelCase
- **Functions**: camelCase
- **Classes**: PascalCase
- **Interfaces**: PascalCase
- **Types**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Files**: kebab-case

```typescript
// Variables
const dogName = 'Max';

// Functions
function getDogById(id: string) {}

// Classes
class DogService {}

// Interfaces
interface Dog {}

// Types
type DogId = string;

// Constants
const MAX_DOGS = 1000;

// Files
dog-service.ts
```

### Comments

- Use JSDoc for functions
- Comment complex logic
- Keep comments up to date

```typescript
/**
 * Retrieves a dog by ID with related data
 * @param id - The dog's unique identifier
 * @returns The dog object or null if not found
 */
async function getDog(id: string): Promise<Dog | null> {
  return await prisma.dog.findUnique({
    where: { id },
    include: { photos: true, healthRecords: true },
  });
}
```

---

## Testing

### Unit Tests

```bash
# Run unit tests
cd apps/api
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Integration Tests

```bash
# Run integration tests
cd apps/api
npm run test:integration
```

### Writing Tests

```typescript
import { describe, it, expect } from '@jest/globals';

describe('DogService', () => {
  it('should retrieve a dog by ID', async () => {
    const dog = await dogService.getById('123');
    expect(dog).toBeDefined();
    expect(dog?.id).toBe('123');
  });
});
```

---

## Database

### Schema Changes

1. **Edit Prisma schema:**
   ```prisma
   // packages/database/prisma/schema.prisma
   model Dog {
     id        String   @id @default(uuid())
     name      String
     newField  String?
   }
   ```

2. **Generate migration:**
   ```bash
   cd packages/database
   npx prisma migrate dev --name add_new_field
   ```

3. **Generate client:**
   ```bash
   npx prisma generate
   ```

### Database Queries

```typescript
// Find single record
const dog = await prisma.dog.findUnique({
  where: { id: dogId },
  include: { photos: true },
});

// Find multiple records
const dogs = await prisma.dog.findMany({
  where: { sex: 'MALE' },
  orderBy: { name: 'asc' },
  take: 20,
  skip: 0,
});

// Create record
const newDog = await prisma.dog.create({
  data: {
    name: 'Max',
    registrationNumber: 'SZ 123456',
    sex: 'MALE',
  },
});

// Update record
const updatedDog = await prisma.dog.update({
  where: { id: dogId },
  data: { name: 'Max Updated' },
});

// Delete record (soft delete)
const deletedDog = await prisma.dog.update({
  where: { id: dogId },
  data: { deletedAt: new Date() },
});
```

---

## API Development

### Creating a New Route

1. **Create route file:**
   ```typescript
   // apps/api/src/routes/example.ts
   import { Router } from 'express';
   
   const router = Router();
   
   /**
    * @swagger
    * /api/example:
    *   get:
    *     summary: Get example data
    *     responses:
    *       200:
    *         description: Success
    */
   router.get('/', async (req, res) => {
     const data = await getExampleData();
     res.json(data);
   });
   
   export default router;
   ```

2. **Register route:**
   ```typescript
   // apps/api/src/index.ts
   import exampleRoutes from './routes/example';
   
   app.use('/api/example', exampleRoutes);
   ```

### Adding Swagger Documentation

```typescript
/**
 * @swagger
 * /api/dogs/{id}:
 *   get:
 *     summary: Get dog by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dog found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Dog'
 *       404:
 *         description: Dog not found
 */
router.get('/:id', async (req, res) => {
  // Implementation
});
```

---

## Frontend Development

### Creating a New Component

```typescript
// apps/web/src/components/example/ExampleComponent.tsx
'use client';

import { useState } from 'react';

interface ExampleProps {
  title: string;
}

export default function ExampleComponent({ title }: ExampleProps) {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}
```

### Using API Client

```typescript
// apps/web/src/lib/api.ts
import { Dog } from '@prisma/client';

export async function getDog(id: string): Promise<Dog> {
  const response = await fetch(`/api/dogs/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch dog');
  }
  return response.json();
}

// Usage in component
import { getDog } from '@/lib/api';

const dog = await getDog('123');
```

### Styling

```typescript
// Using Tailwind CSS
<div className="p-4 bg-blue-500 text-white rounded-lg">
  Hello World
</div>

// Using CSS modules
import styles from './Example.module.css';

<div className={styles.container}>
  Hello World
</div>
```

---

## Contributing

### Before Contributing

1. Read this guide
2. Check existing issues
3. Discuss changes in an issue or discussion
4. Follow coding standards
5. Write tests
6. Update documentation

### Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

### Code Review Guidelines

- Be constructive
- Explain reasoning
- Suggest improvements
- Test the changes
- Approve when satisfied

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Express Documentation](https://expressjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

## Questions?

- Create a GitHub issue
- Email: dev@gsdatlas.com
- Slack: #gsd-atlas-dev
