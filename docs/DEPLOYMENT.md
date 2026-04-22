# Production Deployment Guide

This guide covers deploying GSD Atlas to production environments.

## Prerequisites

Before deploying to production, ensure you have:

- AWS account with appropriate permissions
- Domain name configured (e.g., gsdatlas.com)
- SSL/TLS certificates (via AWS Certificate Manager)
- GitHub repository with CI/CD configured
- Sentry account for error tracking
- Slack workspace for notifications

## AWS Infrastructure Setup

### 1. Create S3 Buckets

```bash
# Create bucket for static files
aws s3 mb s3://gsd-atlas-photos --region us-east-1

# Create bucket for backups
aws s3 mb s3://gsd-atlas-backups --region us-east-1

# Create bucket for staging
aws s3 mb s3://gsd-atlas-staging --region us-east-1

# Create bucket for production
aws s3 mb s3://gsd-atlas-production --region us-east-1
```

### 2. Configure S3 Buckets

Enable versioning and lifecycle policies:

```bash
# Enable versioning on backup bucket
aws s3api put-bucket-versioning \
  --bucket gsd-atlas-backups \
  --versioning-configuration Status=Enabled

# Set lifecycle policy for backups (30-day retention)
aws s3api put-bucket-lifecycle-configuration \
  --bucket gsd-atlas-backups \
  --lifecycle-configuration file://backup-lifecycle.json
```

### 3. Create RDS PostgreSQL Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier gsd-atlas-production \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.9 \
  --allocated-storage 100 \
  --master-username postgres \
  --master-user-password YOUR_PASSWORD \
  --vpc-security-group-ids sg-xxxxx \
  --backup-retention-period 7 \
  --multi-az
```

### 4. Create ElastiCache Redis Cluster

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id gsd-atlas-redis \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxx
```

### 5. Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name gsd-atlas-production
```

### 6. Create Task Definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

### 7. Create ECS Service

```bash
aws ecs create-service \
  --cluster gsd-atlas-production \
  --service-name api \
  --task-definition gsd-atlas-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration file://network-config.json
```

### 8. Create Application Load Balancer

```bash
aws elbv2 create-load-balancer \
  --name gsd-atlas-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups sg-xxxxx
```

### 9. Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

### 10. Request SSL Certificate

```bash
aws acm request-certificate \
  --domain-name gsdatlas.com \
  --subject-alternative-names "*.gsdatlas.com" \
  --validation-method DNS
```

## GitHub Actions Secrets

Configure the following secrets in your GitHub repository:

### AWS Credentials
- `AWS_ACCESS_KEY_ID`: AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for deployment
- `AWS_REGION`: AWS region (e.g., us-east-1)
- `AWS_ECR_URI`: ECR repository URI

### Database
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

### Security
- `JWT_SECRET`: JWT signing secret (use a strong random string)
- `API_KEY`: API key for sensitive endpoints

### Sentry
- `SENTRY_DSN`: Sentry project DSN

### Notifications
- `SLACK_WEBHOOK`: Slack webhook URL for notifications

### S3
- `STAGING_S3_BUCKET`: Staging S3 bucket name
- `PRODUCTION_S3_BUCKET`: Production S3 bucket name
- `BACKUP_S3_BUCKET`: Backup S3 bucket name
- `STAGING_CLOUDFRONT_ID`: Staging CloudFront distribution ID
- `PRODUCTION_CLOUDFRONT_ID`: Production CloudFront distribution ID

## Deployment Process

### Initial Deployment

1. **Set up infrastructure** (one-time):
   ```bash
   # Run Terraform or CloudFormation scripts
   # Or manually create AWS resources as documented above
   ```

2. **Configure GitHub Actions**:
   - Add secrets to GitHub repository
   - Enable workflows in repository settings

3. **Push to main branch**:
   ```bash
   git checkout main
   git merge develop
   git push origin main
   ```

4. **Monitor deployment**:
   - Check GitHub Actions logs
   - Monitor ECS service status
   - Verify health checks

### Subsequent Deployments

1. **Create feature branch**:
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and test**:
   ```bash
   npm run test
   npm run build
   ```

3. **Create pull request**:
   ```bash
   git push origin feature/new-feature
   # Create PR in GitHub
   ```

4. **Merge to main** after approval:
   - CI runs automatically
   - CD deploys to staging
   - Load tests run on staging
   - Deploy to production after approval

## Environment Configuration

### Production Environment Variables

Create `.env.production`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@prod-db.gsdatlas.com:5432/gsd_atlas
REDIS_URL=redis://prod-redis.gsdatlas.com:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
API_KEY=your-api-key-change-in-production

# AWS
AWS_ACCESS_KEY_ID=AKIA...
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

### Staging Environment Variables

Create `.env.staging`:

```bash
# Database
DATABASE_URL=postgresql://user:pass@staging-db.gsdatlas.com:5432/gsd_atlas_staging
REDIS_URL=redis://staging-redis.gsdatlas.com:6379

# Security
JWT_SECRET=staging-jwt-secret
API_KEY=staging-api-key

# AWS
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=gsd-atlas-staging
CDN_BASE_URL=https://staging-cdn.gsdatlas.com

# Sentry
SENTRY_DSN=https://your-staging-dsn@sentry.io/project

# CORS
ALLOWED_ORIGINS=https://staging.gsdatlas.com

# Logging
LOG_LEVEL=DEBUG

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500
```

## Database Migration

### Run Migrations

```bash
# Generate Prisma client
cd packages/database
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Or create a new migration
npx prisma migrate dev --name migration_name
```

### Rollback Migration

```bash
# View migration history
npx prisma migrate status

# Resolve migration (if needed)
npx prisma migrate resolve --rolled-back migration_name
```

## Health Checks

### API Health Check

```bash
curl https://api.gsdatlas.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "s3": "connected"
  }
}
```

### Database Health Check

```bash
# Check PostgreSQL connection
psql -h prod-db.gsdatlas.com -U postgres -d gsd_atlas -c "SELECT 1"

# Check Redis connection
redis-cli -h prod-redis.gsdatlas.com ping
```

## Rollback Procedure

### Automatic Rollback

The CD pipeline automatically rolls back if:
- Health checks fail
- Error rate exceeds threshold
- Deployment timeout

### Manual Rollback

```bash
# Rollback ECS service
aws ecs update-service \
  --cluster gsd-atlas-production \
  --service api \
  --task-definition gsd-atlas-api:previous-version

# Rollback database (if needed)
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier gsd-atlas-production-rollback \
  --db-snapshot-identifier pre-deploy-TIMESTAMP

# Rollback S3
aws s3 sync s3://gsd-atlas-backups/uploads/TIMESTAMP/ \
  s3://gsd-atlas-uploads/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

## Monitoring After Deployment

### Check Metrics

1. **Sentry Dashboard**:
   - Error rate
   - Performance
   - New errors

2. **AWS CloudWatch**:
   - ECS CPU/memory utilization
   - RDS connections
   - ElastiCache memory

3. **Application Metrics**:
   - Cache hit rate
   - Request duration
   - Error rate

### Verify Functionality

Test critical endpoints:
- Authentication
- Dog search
- Pedigree generation
- COI calculation
- Image upload

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Verify AWS credentials
3. Check ECS service events
4. Review CloudWatch logs

### High Error Rate After Deployment

1. Check Sentry for new errors
2. Review recent code changes
3. Check database connectivity
4. Verify cache status
5. Consider rollback

### Slow Performance

1. Check CloudWatch metrics
2. Review database query performance
3. Check cache hit rate
4. Verify CDN cache status
5. Check ECS resource utilization

## Security Checklist

- [ ] All secrets stored in GitHub Secrets
- [ ] SSL/TLS certificates configured
- [ ] Security groups properly configured
- [ ] Database access restricted
- [ ] API keys rotated regularly
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers enabled
- [ ] Input validation enabled
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection

## Performance Checklist

- [ ] CDN configured and active
- [ ] Caching enabled for expensive operations
- [ ] Database indexes optimized
- [ ] Connection pooling configured
- [ ] Response compression enabled
- [ ] Images optimized
- [ ] Lazy loading enabled
- [ ] Pagination implemented
- [ ] Query optimization
- [ ] Read replicas configured

## Post-Deployment Tasks

1. **Monitor for 24 hours**:
   - Error rate
   - Performance
   - User feedback

2. **Run load tests**:
   ```bash
   k6 run tests/load/api-load-test.js
   ```

3. **Verify backups**:
   ```bash
   aws s3 ls s3://gsd-atlas-backups/postgresql/
   ```

4. **Update documentation**:
   - API documentation
   - Infrastructure docs
   - Deployment notes

5. **Notify team**:
   - Send deployment summary
   - Share metrics
   - Document any issues

## Support Contacts

- **DevOps**: devops@gsdatlas.com
- **Database Admin**: dba@gsdatlas.com
- **Security**: security@gsdatlas.com
- **Emergency**: oncall@gsdatlas.com
