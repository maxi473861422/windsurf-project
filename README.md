# GSD Atlas - Global German Shepherd Database

The world's most comprehensive database for German Shepherd Dog genealogy, breeding simulation, and health tracking.

## Architecture

This is a monorepo built with:

- **Backend**: Node.js + TypeScript + Express + Prisma + PostgreSQL + Redis
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + React Query
- **Infrastructure**: Docker + Docker Compose

## Features

- **Comprehensive Database**: Millions of dog records with health, show, and breeding information
- **Advanced Pedigrees**: Multi-generational pedigree analysis with visual charts
- **COI Calculator**: Coefficient of inbreeding calculation and common ancestor detection
- **Breeding Simulation**: Health risk analysis and breeding recommendations
- **Professional Tools**: Designed for serious breeders and researchers

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)
- WordPress 5.0+ (for WordPress integration)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd gsd-atlas
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start services with Docker:
```bash
docker-compose up -d
```

5. Initialize the database:
```bash
npm run db:generate
npm run db:migrate
```

6. Start development servers:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Database Studio: `npm run db:studio`

### WordPress Integration

#### Option 1: Plugin Installation
1. Copy `wordpress/plugin/` to your WordPress plugins directory
2. Activate the "GSD Atlas" plugin in WordPress admin
3. Configure API URL in Settings > GSD Atlas
4. Use shortcodes to display data in your pages/posts

#### Option 2: Theme Installation
1. Copy `wordpress/theme/` to your WordPress themes directory
2. Activate the "GSD Atlas Theme" in WordPress admin
3. The theme includes built-in support for all GSD Atlas features

#### WordPress Shortcodes
- `[gsd_dog_search]` - Dog search form
- `[gsd_dog_profile id="dog-id"]` - Detailed dog profile
- `[gsd_pedigree id="dog-id" generations="5"]` - Pedigree tree
- `[gsd_breeding_simulator]` - Breeding simulation tool
- `[gsd_dogs_list limit="10"]` - List of dogs
- `[gsd_statistics]` - Database statistics

#### WordPress Widgets
- Dog Search Widget
- Dog Profile Widget
- Recent Dogs Widget
- Statistics Widget

#### WordPress REST API
The plugin also exposes REST endpoints:
- `/wp-json/gsd-atlas/v1/dogs` - Get dogs
- `/wp-json/gsd-atlas/v1/dogs/{id}` - Get single dog
- `/wp-json/gsd-atlas/v1/pedigree/{id}` - Get pedigree

## Project Structure

```
gsd-atlas/
apps/
  web/                 # Next.js frontend
  api/                 # Node.js backend API
packages/
  database/            # Prisma schema and migrations
  shared/              # Shared TypeScript types
  ui/                  # Shared UI components
wordpress/
  plugin/              # WordPress plugin
    includes/          # Plugin classes
    assets/            # CSS and JS files
  theme/               # WordPress theme
    template-parts/    # Theme templates
```

## API Documentation

### Overview

The GSD Atlas API is a RESTful API built with Express.js, providing comprehensive access to the German Shepherd Dog genealogy database.

**Base URL:** `http://localhost:3001/api` (development)
**Production URL:** `https://api.gsd-atlas.com/api`

### Authentication

Most endpoints require authentication using JWT tokens. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

**Endpoints:**
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/me` - Get current user
- `PUT /auth/profile` - Update user profile
- `POST /auth/change-password` - Change password
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/verify-email` - Verify email

### Response Format

All responses follow a consistent JSON format:

**Success Response:**
```json
{
  "data": { ... },
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

**Error Response:**
```json
{
  "code": "VALIDATION_ERROR",
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required or invalid |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `REDIS_ERROR` | 500 | Redis operation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate limit exceeded |
| `CSRF_ERROR` | 403 | CSRF token validation failed |
| `INTERNAL_ERROR` | 500 | Internal server error |

### Response Headers

| Header | Description |
|--------|-------------|
| `API-Version` | Current API version (e.g., v1) |
| `API-Supported-Versions` | Comma-separated list of supported versions |
| `X-Cache` | Cache status (HIT/MISS) |
| `X-Cache-Age` | Age of cached response in seconds |
| `X-RateLimit-Limit` | Request limit per window |
| `X-RateLimit-Remaining` | Remaining requests |
| `X-RateLimit-Reset` | Unix timestamp when limit resets |

### API Versioning

Specify API version using header or URL path:

**Header:**
```
X-API-Version: v1
```

**URL Path:**
```
GET /v1/dogs
GET /v2/dogs
```

Default version is `v1`.

### Rate Limiting

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Standard API | 200 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes |
| Search | 30 requests | 1 minute |
| Import | 10 requests | 1 hour |
| Pedigree | 100 requests | 1 hour |

### Pagination

All list endpoints support pagination:

**Query Parameters:**
- `limit` - Records per page (1-100, default: 20)
- `offset` - Number of records to skip (default: 0)
- `cursor` - Cursor for cursor-based pagination (optional)
- `sortBy` - Field to sort by
- `sortOrder` - Sort direction (asc/desc)

**Example:**
```
GET /api/dogs?limit=50&offset=0&sortBy=name&sortOrder=asc
```

**Cursor-based pagination:**
```
GET /api/dogs?limit=50&cursor=eyJpZCI6ImNseGQ...
```

### Full-Text Search

The API supports full-text search on dogs:

```
GET /api/dogs?search=german shepherd champion
```

Searches across: name, registration number, and description.

### API Endpoints

### Dogs
- `GET /api/dogs` - List dogs with pagination and filters
- `GET /api/dogs/:id` - Get single dog with full details
- `POST /api/dogs` - Create dog (authenticated)
- `PUT /api/dogs/:id` - Update dog (authenticated)
- `DELETE /api/dogs/:id` - Delete dog (admin/moderator/breeder)

### Organizations
- `GET /api/organizations` - List organizations with filters
- `GET /api/organizations/:id` - Get single organization
- `POST /api/organizations` - Create organization (admin/moderator)
- `PUT /api/organizations/:id` - Update organization (admin/moderator)
- `DELETE /api/organizations/:id` - Delete organization (admin)
- `GET /api/organizations/:id/users` - Get organization members

### Breeders
- `GET /api/breeders` - List breeders with filters
- `GET /api/breeders/:id` - Get single breeder
- `POST /api/breeders` - Create breeder (admin/moderator/breeder)
- `PUT /api/breeders/:id` - Update breeder (authenticated)
- `DELETE /api/breeders/:id` - Delete breeder (admin/moderator)
- `GET /api/breeders/:id/dogs` - Get breeder's dogs

### Health Records
- `GET /api/health-records` - List health records with filters
- `GET /api/health-records/:id` - Get single health record
- `POST /api/health-records` - Create health record (admin/moderator/breeder)
- `PUT /api/health-records/:id` - Update health record (admin/moderator/breeder)
- `DELETE /api/health-records/:id` - Delete health record (admin/moderator/breeder)
- `GET /api/health-records/dog/:dogId` - Get health records for a specific dog

### Show Results
- `GET /api/show-results` - List show results with filters
- `GET /api/show-results/:id` - Get single show result
- `POST /api/show-results` - Create show result (admin/moderator/breeder)
- `PUT /api/show-results/:id` - Update show result (admin/moderator/breeder)
- `DELETE /api/show-results/:id` - Delete show result (admin/moderator/breeder)
- `GET /api/show-results/dog/:dogId` - Get show results for a specific dog

### Titles
- `GET /api/titles` - List titles with filters
- `GET /api/titles/:id` - Get single title
- `POST /api/titles` - Create title (admin/moderator/breeder)
- `PUT /api/titles/:id` - Update title (admin/moderator/breeder)
- `DELETE /api/titles/:id` - Delete title (admin/moderator/breeder)
- `GET /api/titles/dog/:dogId` - Get titles for a specific dog

### Photos
- `GET /api/photos` - List photos with filters
- `GET /api/photos/:id` - Get single photo
- `POST /api/photos` - Create photo record with external URL
- `POST /api/photos/upload` - Upload photo to S3 (multipart/form-data)
- `PUT /api/photos/:id` - Update photo (admin/moderator/breeder)
- `DELETE /api/photos/:id` - Delete photo (admin/moderator/breeder)
- `POST /api/photos/:id/set-primary` - Set photo as primary
- `GET /api/photos/dog/:dogId` - Get photos for a specific dog

### Import System
- `POST /api/import/data-source` - Create data source (admin/moderator)
- `GET /api/import/data-sources` - List data sources (admin/moderator)
- `POST /api/import/csv` - Import CSV file (admin/moderator)
- `POST /api/import/excel` - Import Excel file (admin/moderator)
- `GET /api/import/batches` - List import batches (admin/moderator)
- `GET /api/import/batches/:id` - Get import batch details (admin/moderator)

### Pedigree (Advanced Genealogy Engine)
- `GET /api/pedigree/:id` - Get dynamic pedigree tree (up to 15 generations)
- `GET /api/pedigree/:id/coi` - Calculate COI using Wright's formula
- `GET /api/pedigree/common-ancestors/:sireId/:damId` - Find common ancestors between two dogs
- `GET /api/pedigree/:id/repetitions` - Detect pedigree repetitions
- `GET /api/pedigree/:id/influence` - Calculate ancestral influence percentages
- `GET /api/pedigree/:id/linebreeding` - Analyze linebreeding patterns
- `GET /api/pedigree/:id/descendants` - Count total descendants by generation
- `GET /api/pedigree/rankings/breeders` - Get influential breeder rankings
- `DELETE /api/pedigree/:id/cache` - Invalidate cache for a dog

### Breeding
- `GET /api/breeding` - List breedings
- `POST /api/breeding/simulate` - Simulate breeding
- `POST /api/breeding` - Create breeding record

### WordPress Integration
- `GET /api/wordpress/dogs` - Get dogs for WordPress
- `GET /api/wordpress/dogs/:id` - Get single dog for WordPress
- `GET /api/wordpress/pedigree/:id` - Get pedigree for WordPress
- `GET /api/wordpress/search` - Global search for WordPress

## Advanced Genealogy Engine

The platform features a sophisticated genealogy engine implementing advanced mathematical algorithms for pedigree analysis:

### Mathematical Algorithms

#### 1. Wright's Coefficient of Inbreeding (COI)

**Formula:**
```
COI = Σ (0.5)^(n1 + n2 + 1) × (1 + F_A)
```

**Where:**
- `n1` = Number of generations from sire to common ancestor
- `n2` = Number of generations from dam to common ancestor
- `F_A` = Inbreeding coefficient of the common ancestor
- Sum is over all common ancestors in the pedigree

**Example:**
If a common ancestor appears as:
- Sire's sire (n1 = 2) and Dam's dam (n2 = 2)
- Contribution = (0.5)^(2+2+1) = 0.5^5 = 0.03125 (3.125%)

#### 2. Relationship Coefficient (RC)

**Formula:**
```
RC = 2 × COI
```

Represents the probability that two alleles are identical by descent. Used for determining genetic relatedness between any two dogs.

#### 3. Ancestral Influence

**Formula:**
```
Influence = (0.5)^n × 100
```

**Where:**
- `n` = Number of generations to the ancestor
- Result is expressed as percentage

**Values by generation:**
- Parents: 50% each
- Grandparents: 25% each
- Great-grandparents: 12.5% each
- 4th generation: 6.25% each
- 5th generation: 3.125% each

#### 4. Linebreeding Detection

An ancestor is considered to be linebred when:
- Appears multiple times in the pedigree
- Total influence > 6.25% (within 4 generations)
- Pattern notation: "3x4", "4x5x5", etc.

**Pattern notation:**
- "3x4" = Ancestor appears in generation 3 and 4
- "4x5(2)" = Ancestor appears once in gen 4, twice in gen 5

#### 5. COI Interpretation Guidelines

- **< 6.25%**: Low inbreeding - Acceptable
- **6.25% - 12.5%**: Moderate - Monitor closely
- **12.5% - 25%**: High - Consider alternatives
- **> 25%**: Very High - Strongly discourage

### Performance Optimizations

The genealogy engine is optimized for large-scale data:

1. **Redis Caching**: All calculations cached with configurable TTL (24h for pedigrees, 1h for descendants)
2. **Database Indexes**: Strategic indexes on sireId, damId for fast traversal
3. **Closure Table Pattern**: O(1) ancestor queries using `dog_ancestors` table
4. **Batch Processing**: Recursive operations limited to 15 generations
5. **Lazy Loading**: Pedigree tree built on-demand, not pre-computed
6. **Cache Invalidation**: Automatic invalidation when dog data changes

### Cache Strategy

| Operation | TTL | Invalidation |
|-----------|-----|--------------|
| Pedigree | 24h | On dog update |
| COI | 24h | On pedigree change |
| Common Ancestors | 24h | On pedigree change |
| Linebreeding | 24h | On pedigree change |
| Descendants | 1h | On breeding record |
| Breeder Rankings | 2h | On breeding record |

## Database Schema

The database includes 25+ tables optimized for genealogical queries and millions of records:

### Core Entities
- **Users**: Authentication, roles, and preferences
- **Organizations**: Clubs, kennels, and breeding organizations
- **Dogs**: Comprehensive dog registry with genealogy, health, and titles
- **Breeders**: Professional breeder management and licensing

### Genealogy System
- **Breedings**: Complete breeding records with success tracking
- **Litters**: Detailed litter information with puppy data
- **LitterPuppies**: Individual puppy tracking
- **DogAncestors**: Closure table for O(1) ancestor queries
- **CoiRelationships**: Precomputed COI calculations
- **CommonAncestors**: Cached common ancestor relationships
- **LinebreedingStats**: Linebreeding percentage analysis

### Health & Genetics
- **HealthRecords**: Comprehensive health certifications (HD, ED, eyes, etc.)
- **DnaTests**: Genetic testing results and carrier status
- **OwnershipHistory**: Complete ownership tracking with transfers

### Shows & Titles
- **ShowResults**: Competition results and placements
- **Titles**: Beauty and working titles with certificates

### Media & Data
- **Photos**: Multi-photo management with storage optimization
- **DataSource**: Import source tracking (CSV, API, scraping)
- **ImportBatch**: Batch import management and error tracking
- **ImportLog**: Detailed import operation logging

### Audit & Performance
- **AuditLog**: Complete change tracking with user attribution
- **DataVersioning**: Full version control with rollback capability
- **PedigreeCache**: Cached pedigree trees and HTML
- **CoiCache**: Precomputed COI values
- **DescendantStats**: Descendant statistics by generation

### Performance Features
- **Strategic Indexing**: 30+ optimized indexes for common queries
- **Partial Indexes**: For active records and recent data
- **Closure Tables**: For O(1) genealogical queries
- **Materialized Path**: For lineage tracking
- **Cache Tables**: For expensive calculations
- **Soft Delete**: Data preservation capability

### Scalability
- **Partitioning Ready**: By birth year and region
- **Sharding Strategy**: Geographic distribution
- **Read Replica Support**: For reporting and analytics
- **Connection Pooling**: Optimized for high concurrency

See `DATABASE_DESIGN.md` for complete technical documentation including:
- Entity-Relationship diagrams
- Complete table definitions
- Index optimization strategies
- Recursive query optimization
- Scaling strategies for millions of records

## Development

### Available Scripts

- `npm run dev` - Start all development servers
- `npm run build` - Build all packages
- `npm run lint` - Run linting
- `npm run type-check` - Type checking
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

### Adding New Packages

1. Create package in `packages/` directory
2. Add to `workspaces` in root `package.json`
3. Configure `turbo.json` for new scripts

### Database Changes

1. Update `packages/database/prisma/schema.prisma`
2. Run `npm run db:generate`
3. Run `npm run db:migrate`

## Production Optimizations

### Security Features

- **Helmet.js**: HTTP security headers (CSP, HSTS, X-Frame-Options)
- **Rate Limiting**: Redis-based rate limiting per IP endpoint
- **Anti-Scraping**: User-Agent analysis and IP blacklisting
- **CORS**: Whitelist-based origin validation
- **Input Sanitization**: Automatic removal of suspicious properties
- **API Key Validation**: For sensitive operations

### Rate Limits

- **Standard API**: 200 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Search**: 30 requests per minute
- **Import**: 10 imports per hour

### Caching Strategy

Multi-layer Redis caching:
- **Pedigree Cache**: Cached by dog ID and generations
- **COI Cache**: Cached calculations with TTL
- **Search Cache**: Cached search results
- **Tag-based Invalidation**: Invalidate related caches by tags
- **Cache Statistics**: Hit/miss tracking

### Pagination

- **Offset-based**: For small datasets
- **Cursor-based**: Efficient for large datasets
- **Hybrid**: Automatic strategy selection
- **Limit**: Maximum 100 records per page

### Database Indexes

Advanced composite indexes:
- `[sex, isAlive, birthDate DESC]` - Filter queries
- `[breederId, isAlive, birthDate DESC]` - Breeder queries
- `[countryCode, isAlive]` - Country queries
- `[coi5Gen]`, `[coi10Gen]` - COI queries
- `[createdAt DESC]`, `[updatedAt DESC]` - Recent records

### Image Optimization

CDN-ready optimization:
- **Responsive Images**: Multiple sizes generated
- **WebP Conversion**: Modern format
- **Lazy Loading**: Blur placeholders
- **CDN Headers**: 1-year cache for assets
- **Srcset Generation**: Automatic responsive sources

### Logging & Monitoring

Structured logging:
- **Log Levels**: DEBUG, INFO, WARN, ERROR, FATAL
- **Storage**: Console + Redis
- **Request Logging**: HTTP request/response tracking
- **Error Logging**: Detailed error tracking
- **Metrics**: `/metrics` endpoint (production)
- **Retention**: 7 days

### Performance Metrics

- Cache hit rate tracking
- Request duration monitoring
- Error rate analysis
- Memory usage tracking
- Server uptime monitoring

## Deployment

### Production Build

```bash
npm run build
```

### Docker Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables

Required for production:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `AWS_ACCESS_KEY_ID` - S3 access key
- `AWS_SECRET_ACCESS_KEY` - S3 secret key
- `AWS_S3_BUCKET` - S3 bucket name

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Email: support@gsd-atlas.com
- Documentation: https://docs.gsd-atlas.com

## Documentation

- [API Documentation](#api-documentation) - REST API endpoints and usage
- [Database Schema](#database-schema) - Prisma schema overview
- [Development Guide](docs/DEVELOPER.md) - How to contribute
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions
- [Infrastructure Guide](docs/INFRASTRUCTURE.md) - Production infrastructure overview
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Validation Guide](docs/VALIDATION.md) - Input validation and sanitization
- [Security Guide](docs/SECURITY.md) - Security measures and best practices
- [Testing Guide](tests/README.md) - Testing strategy and execution

## Roadmap

- [ ] Mobile app (iOS/Android)
- [ ] Advanced genetics analysis
- [ ] AI-powered breeding recommendations
- [ ] International show results integration
- [ ] Health tracking and monitoring
- [ ] Marketplace for breeding services
- [ ] API for third-party integrations
