# Troubleshooting Guide

This guide helps diagnose and resolve common issues with GSD Atlas.

## Table of Contents

- [Application Issues](#application-issues)
- [Database Issues](#database-issues)
- [Cache Issues](#cache-issues)
- [Performance Issues](#performance-issues)
- [Deployment Issues](#deployment-issues)
- [Security Issues](#security-issues)
- [API Issues](#api-issues)

---

## Application Issues

### Application Won't Start

**Symptoms:**
- API server fails to start
- Frontend build fails
- Docker containers won't run

**Diagnosis:**
```bash
# Check logs
docker-compose logs api
docker-compose logs web

# Check environment variables
docker-compose config

# Check port availability
netstat -an | grep 3001
netstat -an | grep 3000
```

**Solutions:**

1. **Missing environment variables:**
   ```bash
   # Copy example env file
   cp .env.example .env
   
   # Edit and fill in required values
   nano .env
   ```

2. **Port already in use:**
   ```bash
   # Find process using port
   lsof -i :3001
   
   # Kill process
   kill -9 <PID>
   
   # Or change port in .env
   PORT=3002
   ```

3. **Missing dependencies:**
   ```bash
   # Install dependencies
   npm install
   
   # For monorepo
   npm ci
   ```

4. **TypeScript errors:**
   ```bash
   # Check TypeScript errors
   npm run type-check
   
   # Fix errors or rebuild
   npm run build
   ```

### High Memory Usage

**Symptoms:**
- Application crashes with OOM error
- Slow response times
- High memory consumption in monitoring

**Diagnosis:**
```bash
# Check memory usage
docker stats

# Check Node.js memory
node --max-old-space-size=4096
```

**Solutions:**

1. **Increase Node.js memory:**
   ```bash
   # In package.json scripts
   "start": "node --max-old-space-size=4096 dist/index.js"
   ```

2. **Optimize database queries:**
   - Add indexes
   - Use pagination
   - Avoid N+1 queries

3. **Check for memory leaks:**
   ```bash
   # Use Node.js profiler
   node --inspect dist/index.js
   ```

---

## Database Issues

### Database Connection Failed

**Symptoms:**
- "Connection refused" error
- "Timeout" error
- Application can't connect to PostgreSQL

**Diagnosis:**
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
psql -h localhost -U postgres -d gsd_atlas
```

**Solutions:**

1. **PostgreSQL not running:**
   ```bash
   # Start PostgreSQL
   docker-compose up -d postgres
   
   # Wait for it to be ready
   docker-compose logs -f postgres
   ```

2. **Wrong credentials:**
   ```bash
   # Check .env file
   DATABASE_URL=postgresql://postgres:password@localhost:5432/gsd_atlas
   ```

3. **Network issues:**
   ```bash
   # Check if port is accessible
   telnet localhost 5432
   
   # Check firewall
   sudo ufw status
   ```

### Slow Database Queries

**Symptoms:**
- API responses are slow
- Database queries timeout
- High CPU usage on RDS

**Diagnosis:**
```bash
# Enable query logging
ALTER DATABASE gsd_atlas SET log_statement = 'all';

# Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

# Explain query plan
EXPLAIN ANALYZE SELECT * FROM dogs WHERE name = 'Max';
```

**Solutions:**

1. **Add indexes:**
   ```sql
   CREATE INDEX idx_dogs_name ON dogs(name);
   CREATE INDEX idx_dogs_registration ON dogs(registration_number);
   ```

2. **Optimize queries:**
   - Use SELECT specific columns instead of SELECT *
   - Add WHERE clauses
   - Use pagination
   - Avoid subqueries

3. **Use read replicas:**
   ```bash
   # Configure read replica for read-heavy queries
   DATABASE_READ_URL=postgresql://user:pass@read-replica.gsdatlas.com:5432/gsd_atlas
   ```

4. **Connection pooling:**
   ```typescript
   // Configure connection pool in Prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     pool_timeout = 10
     connection_limit = 10
   }
   ```

### Database Migration Failed

**Symptoms:**
- Migration script fails
- Schema out of sync
- Can't apply new migrations

**Diagnosis:**
```bash
# Check migration status
npx prisma migrate status

# View migration history
npx prisma migrate resolve --history
```

**Solutions:**

1. **Resolve failed migration:**
   ```bash
   # Mark migration as resolved
   npx prisma migrate resolve --applied migration_name
   
   # Or mark as rolled back
   npx prisma migrate resolve --rolled-back migration_name
   ```

2. **Reset database (dev only):**
   ```bash
   # WARNING: Deletes all data
   npx prisma migrate reset
   ```

3. **Create new migration:**
   ```bash
   npx prisma migrate dev --name fix_migration
   ```

---

## Cache Issues

### Redis Connection Failed

**Symptoms:**
- "Connection refused" error
- Cache operations fail
- Application falls back to database

**Diagnosis:**
```bash
# Check Redis status
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test connection
redis-cli ping
```

**Solutions:**

1. **Redis not running:**
   ```bash
   # Start Redis
   docker-compose up -d redis
   ```

2. **Wrong Redis URL:**
   ```bash
   # Check .env file
   REDIS_URL=redis://localhost:6379
   ```

3. **Redis memory full:**
   ```bash
   # Check Redis memory
   redis-cli INFO memory
   
   # Clear cache
   redis-cli FLUSHALL
   ```

### Cache Not Working

**Symptoms:**
- Cache always misses
- Data not being cached
- High database load

**Diagnosis:**
```bash
# Check cache operations
redis-cli MONITOR

# Check cache keys
redis-cli KEYS "*"
```

**Solutions:**

1. **Check cache service configuration:**
   ```typescript
   // Verify cache TTL settings
   await cacheService.set('key', data, { ttl: 3600 });
   ```

2. **Check cache invalidation:**
   ```typescript
   // Verify tags are being set correctly
   await cacheService.set('key', data, { tags: ['dogs'] });
   await cacheService.invalidateByTag('dogs');
   ```

3. **Monitor cache hit rate:**
   ```typescript
   // Add logging to track cache performance
   console.log('Cache hit rate:', hits / total);
   ```

---

## Performance Issues

### Slow API Response Times

**Symptoms:**
- API requests take > 1s
- Timeout errors
- Poor user experience

**Diagnosis:**
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.gsdatlas.com/api/dogs

# Check server metrics
top
htop
```

**Solutions:**

1. **Enable caching:**
   ```typescript
   // Cache expensive operations
   const cached = await cacheService.getOrSet(
     `pedigree:${dogId}`,
     () => generatePedigree(dogId),
     { ttl: 3600 }
   );
   ```

2. **Optimize database queries:**
   - Use indexes
   - Add pagination
   - Use connection pooling

3. **Use CDN for static assets:**
   ```bash
   # Configure CloudFront
   # Set cache headers
   Cache-Control: public, max-age=31536000
   ```

4. **Enable compression:**
   ```typescript
   app.use(compression());
   ```

### High CPU Usage

**Symptoms:**
- CPU utilization > 80%
- Slow response times
- Application crashes

**Diagnosis:**
```bash
# Check CPU usage
top
htop

# Check Node.js CPU profiling
node --prof dist/index.js
```

**Solutions:**

1. **Scale horizontally:**
   ```bash
   # Increase ECS task count
   aws ecs update-service --cluster gsd-atlas --service api --desired-count 4
   ```

2. **Optimize code:**
   - Use async/await properly
   - Avoid blocking operations
   - Use worker threads for CPU-intensive tasks

3. **Use read replicas:**
   - Offload read queries to replicas
   - Reduce load on primary database

---

## Deployment Issues

### Deployment Failed

**Symptoms:**
- GitHub Actions fails
- ECS deployment fails
- Health checks fail

**Diagnosis:**
```bash
# Check GitHub Actions logs
# Check ECS service events
aws ecs describe-services --cluster gsd-atlas --service api

# Check CloudWatch logs
aws logs tail /ecs/gsd-atlas-api --follow
```

**Solutions:**

1. **Check build errors:**
   - Review GitHub Actions logs
   - Fix TypeScript errors
   - Resolve dependency issues

2. **Check health checks:**
   ```bash
   # Verify health endpoint
   curl https://api.gsdatlas.com/health
   
   # Check health check configuration in ECS
   # Ensure health check path is correct
   ```

3. **Rollback deployment:**
   ```bash
   # Rollback to previous version
   aws ecs update-service --cluster gsd-atlas --service api --force-new-deployment
   ```

### Container Won't Start

**Symptoms:**
- ECS task fails to start
- Container exits immediately
- Status shows "STOPPED"

**Diagnosis:**
```bash
# Check ECS task logs
aws logs tail /ecs/gsd-atlas-api --follow

# Check task definition
aws ecs describe-task-definition --task-definition gsd-atlas-api
```

**Solutions:**

1. **Check task definition:**
   - Verify image URI is correct
   - Check environment variables
   - Verify resource allocation

2. **Check container logs:**
   ```bash
   # View container logs
   docker logs <container-id>
   ```

3. **Verify networking:**
   - Check security groups
   - Verify VPC configuration
   - Check subnets

---

## Security Issues

### Unauthorized Access

**Symptoms:**
- Users accessing restricted endpoints
- API key bypass
- Authentication failures

**Diagnosis:**
```bash
# Check audit logs
SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100;

# Check authentication logs
# Review Sentry security events
```

**Solutions:**

1. **Verify authentication middleware:**
   ```typescript
   // Ensure auth middleware is applied
   router.use(authenticate);
   ```

2. **Check JWT configuration:**
   ```bash
   # Verify JWT_SECRET is set
   echo $JWT_SECRET
   
   # Use strong secret
   JWT_SECRET=<random-32-char-string>
   ```

3. **Review security headers:**
   ```typescript
   // Ensure Helmet is configured
   app.use(helmet());
   ```

### Rate Limiting Issues

**Symptoms:**
- Legitimate users blocked
- Rate limit errors
- Too many requests

**Diagnosis:**
```bash
# Check rate limit headers
curl -I https://api.gsdatlas.com/api/dogs

# Check Redis rate limit data
redis-cli KEYS "ratelimit:*"
```

**Solutions:**

1. **Adjust rate limits:**
   ```bash
   # Increase rate limit in .env
   RATE_LIMIT_MAX_REQUESTS=500
   ```

2. **Whitelist IP addresses:**
   ```typescript
   // Add IP whitelist
   const whitelist = ['192.168.1.1', '10.0.0.1'];
   if (whitelist.includes(ip)) {
     // Skip rate limiting
   }
   ```

3. **Monitor rate limit hits:**
   ```typescript
   // Log rate limit violations
   console.log('Rate limit exceeded for IP:', ip);
   ```

---

## API Issues

### 404 Not Found

**Symptoms:**
- Endpoint returns 404
- Routes not working
- Wrong URL

**Diagnosis:**
```bash
# Test endpoint
curl https://api.gsdatlas.com/api/dogs

# Check route registration
# Verify route paths
```

**Solutions:**

1. **Check route registration:**
   ```typescript
   // Ensure routes are registered
   app.use('/api/dogs', dogRoutes);
   ```

2. **Verify URL path:**
   ```bash
   # Check for typos
   # Ensure correct path
   /api/dogs vs /api/dog
   ```

3. **Check method:**
   ```bash
   # Verify HTTP method
   curl -X GET https://api.gsdatlas.com/api/dogs
   curl -X POST https://api.gsdatlas.com/api/dogs
   ```

### 500 Internal Server Error

**Symptoms:**
- Server returns 500
- Application crashes
- Unhandled exceptions

**Diagnosis:**
```bash
# Check application logs
docker-compose logs api

# Check Sentry for errors
# Review error stack traces
```

**Solutions:**

1. **Check error logs:**
   ```typescript
   // Add error handling
   app.use((err, req, res, next) => {
     console.error(err);
     res.status(500).json({ error: 'Internal server error' });
   });
   ```

2. **Check database queries:**
   ```typescript
   // Add try-catch for database operations
   try {
     const dog = await prisma.dog.findUnique({ where: { id } });
   } catch (error) {
     console.error('Database error:', error);
     throw error;
   }
   ```

3. **Validate input:**
   ```typescript
   // Add input validation
   const schema = z.object({
     name: z.string().min(1),
     registrationNumber: z.string().min(1),
   });
   ```

---

## Getting Help

If you can't resolve an issue:

1. **Check documentation:**
   - README.md
   - INFRASTRUCTURE.md
   - DEPLOYMENT.md

2. **Search existing issues:**
   - GitHub issues
   - Stack Overflow

3. **Create a support ticket:**
   - Email: support@gsdatlas.com
   - Include:
     - Error messages
     - Logs
     - Steps to reproduce
     - Environment details

4. **Emergency contact:**
   - Email: oncall@gsdatlas.com
   - Slack: #emergency-gsd-atlas
