# Production Infrastructure Guide

This document describes the production infrastructure setup for GSD Atlas.

## Overview

GSD Atlas uses a modern, cloud-native infrastructure built on AWS with CI/CD automation via GitHub Actions.

## Architecture

### Components

- **API**: Node.js + Express deployed on AWS ECS (Fargate)
- **Frontend**: Next.js deployed on AWS S3 + CloudFront (CDN)
- **Database**: PostgreSQL on AWS RDS
- **Cache**: Redis on AWS ElastiCache
- **Storage**: AWS S3 for images and backups
- **Monitoring**: Sentry for error tracking, custom metrics endpoint
- **CI/CD**: GitHub Actions

### Network Architecture

```
┌─────────────────┐
│   CloudFront    │
│     (CDN)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      S3         │
│  (Static Files) │
└─────────────────┘

┌─────────────────┐
│      ECS        │
│  (API Container)│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│  RDS   │ │Elasti- │
│ (Post- │ │Cache   │
│  gres) │ │ (Redis)│
└────────┘ └────────┘
```

## CI/CD Pipeline

### Continuous Integration (CI)

Location: `.github/workflows/ci.yml`

Triggers:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

Jobs:
1. **Lint and Type Check**: Runs ESLint and TypeScript type checking
2. **Unit Tests**: Runs Jest unit tests with PostgreSQL and Redis services
3. **Integration Tests**: Tests API endpoints with mocked dependencies
4. **Build**: Builds API and Web applications

### Continuous Deployment (CD)

Location: `.github/workflows/cd.yml`

Triggers:
- Push to `main` branch
- Manual workflow dispatch

Stages:
1. **Deploy to Staging**: Deploys to staging environment
2. **Load Tests**: Runs k6 load tests against staging
3. **Deploy to Production**: Deploys to production with:
   - Pre-deployment database snapshot
   - Zero-downtime ECS deployment
   - Health checks
   - Automatic rollback on failure

## Backup Strategy

### Automated Backups

Location: `.github/workflows/backup.yml`

Schedule: Daily at 2 AM UTC

What gets backed up:
- PostgreSQL database (custom format, compressed)
- Redis RDB file
- S3 user uploads

Retention: 30 days

Storage: AWS S3 backup bucket

### Manual Backup

Run backup script manually:
```bash
./scripts/backup.sh
```

### Restore from Backup

```bash
./scripts/restore.sh 20240101_120000
```

## Monitoring & Alerting

### Error Tracking (Sentry)

Configuration: `apps/api/src/utils/sentry.ts`

Features:
- Automatic error capture
- Performance monitoring (10% sample rate)
- Profiling (10% sample rate)
- User context tracking
- Sensitive data filtering

Environment Variables:
- `SENTRY_DSN`: Sentry project DSN
- `SENTRY_TRACES_SAMPLE_RATE`: Trace sampling (default: 0.1)
- `SENTRY_PROFILES_SAMPLE_RATE`: Profiling sampling (default: 0.1)

### Custom Metrics

Endpoint: `/metrics` (production only)

Metrics tracked:
- Cache hit/miss rate
- Request duration
- Error rate
- Memory usage
- Server uptime

### Alerts

Configure alerts in Sentry:
- Error rate > 1%
- P95 latency > 1s
- Error rate by endpoint
- New errors introduced

## Security

### Secrets Management

Store secrets in GitHub Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_ECR_URI`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `SENTRY_DSN`
- `SLACK_WEBHOOK`

### SSL/TLS

- CloudFront provides HTTPS for frontend
- ALB provides HTTPS for API
- Certificate managed by AWS Certificate Manager

### Security Headers

Helmet.js middleware adds:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection

### Rate Limiting

Redis-based rate limiting per IP:
- Standard API: 200 requests / 15 min
- Authentication: 5 requests / 15 min
- Search: 30 requests / 1 min
- Import: 10 imports / 1 hour

## Disaster Recovery

### Database Recovery

1. Create RDS snapshot before deployment
2. Automatic snapshots every 6 hours
3. Point-in-time recovery available (7 days)

### Rollback Procedure

1. Manual rollback via GitHub Actions
2. Automatic rollback on deployment failure
3. Database restore from snapshot

### Recovery Time Objective (RTO)

- API rollback: < 5 minutes
- Database restore: < 30 minutes
- Full system recovery: < 1 hour

## Performance Optimization

### CDN Configuration

- CloudFront edge locations worldwide
- Cache-Control headers for static assets
- Image optimization via CloudFront Functions

### Database Optimization

- Read replicas for read-heavy queries
- Connection pooling
- Query optimization with indexes
- Redis caching for expensive operations

### API Optimization

- Response compression (gzip)
- Pagination (cursor-based for large datasets)
- Batch operations support
- Async processing for long tasks

## Scaling

### Horizontal Scaling

- ECS auto-scaling based on CPU/memory
- Read replicas for database
- Redis cluster for cache

### Vertical Scaling

- RDS instance types
- ElastiCache node types
- ECS task CPU/memory

### Load Balancing

- Application Load Balancer for API
- CloudFront for frontend
- DNS-based routing

## Environment Variables

### Required for Production

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379

# Security
JWT_SECRET=your-secret-key
API_KEY=your-api-key

# AWS
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=gsd-atlas-photos
CDN_BASE_URL=https://cdn.gsdatlas.com

# Sentry
SENTRY_DSN=https://your-dsn@sentry.io/project
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1

# CORS
ALLOWED_ORIGINS=https://gsdatlas.com,https://www.gsdatlas.com

# Logging
LOG_LEVEL=INFO

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
```

## Deployment Checklist

### Before First Deployment

- [ ] Set up AWS account and configure credentials
- [ ] Create RDS PostgreSQL instance
- [ ] Create ElastiCache Redis cluster
- [ ] Create S3 buckets (photos, backups)
- [ ] Set up CloudFront distribution
- [ ] Create ECS cluster and services
- [ ] Configure ALB and target groups
- [ ] Set up ACM certificates
- [ ] Create Sentry project
- [ ] Configure GitHub Actions secrets
- [ ] Set up Slack webhook for notifications

### For Each Deployment

- [ ] Run tests locally
- [ ] Check CI pipeline passes
- [ ] Review code changes
- [ ] Create backup snapshot
- [ ] Deploy to staging
- [ ] Run load tests on staging
- [ ] Verify staging deployment
- [ ] Deploy to production
- [ ] Run health checks
- [ ] Monitor error rate
- [ ] Verify functionality

## Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs
2. Verify AWS credentials
3. Check ECS service health
4. Review CloudWatch logs
5. Check database connectivity

### High Error Rate

1. Check Sentry dashboard
2. Review recent deployments
3. Check database performance
4. Verify cache status
5. Review rate limiting logs

### Slow Performance

1. Check CloudWatch metrics
2. Review database query performance
3. Check cache hit rate
4. Verify CDN cache status
5. Check ECS resource utilization

## Cost Optimization

### AWS Cost Saving Tips

- Use reserved instances for RDS
- Enable S3 lifecycle policies
- Use CloudFront for static assets
- Monitor ECS task utilization
- Clean up unused resources
- Use Spot instances for non-critical workloads

### Estimated Monthly Costs (Production)

- RDS PostgreSQL (db.t3.medium): ~$50
- ElastiCache Redis (cache.t3.medium): ~$40
- ECS Fargate (2 tasks): ~$80
- S3 Storage (500GB): ~$12
- CloudFront (1TB transfer): ~$85
- ALB: ~$25
- Total: ~$292/month

## Support

For infrastructure issues:
- Create a GitHub issue
- Contact DevOps team
- Check AWS Health Dashboard
- Review Sentry alerts
