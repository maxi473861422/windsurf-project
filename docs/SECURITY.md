# Security Guide

This guide covers all security measures implemented in GSD Atlas.

## Overview

GSD Atlas implements multiple layers of security to protect user data and prevent common attacks.

## Security Features

### 1. CORS Configuration

**Implementation**: `src/middleware/security.ts`

**Features**:
- Origin whitelisting with wildcard subdomain support
- Credentials support for cookies
- Configurable allowed headers
- Exposed headers for rate limiting
- 24-hour cache for preflight requests

**Configuration**:
```bash
# .env
ALLOWED_ORIGINS=https://gsdatlas.com,https://www.gsdatlas.com,https://staging.gsdatlas.com
```

**Usage**:
```typescript
import cors from 'cors';
import { enhancedCorsConfig } from './middleware/security';

app.use(cors(enhancedCorsConfig));
```

### 2. Cookie Security

**Implementation**: `src/middleware/security.ts`

**Features**:
- `HttpOnly`: Prevents JavaScript access to cookies
- `Secure`: Only sends cookies over HTTPS (production)
- `SameSite=strict`: Prevents CSRF attacks
- Configurable domain
- 7-day expiration

**Configuration**:
```typescript
import { cookieConfig } from './middleware/security';

res.cookie('token', token, cookieConfig);
```

### 3. Brute Force Protection

**Implementation**: `src/middleware/security.ts`

**Features**:
- Tracks failed login attempts per IP
- Locks IP after 5 failed attempts (configurable)
- 15-minute attempt window
- 1-hour lockout duration
- Automatic attempt clearing on successful auth

**Configuration**:
```bash
# .env
MAX_LOGIN_ATTEMPTS=5
```

**Usage**:
```typescript
import { bruteForceProtection, clearFailedAttempts } from './middleware/security';

// Apply to auth endpoints
router.post('/auth/login', bruteForceProtection, async (req, res) => {
  const ip = req.ip;
  const user = await login(req.body);
  
  if (user) {
    await clearFailedAttempts(ip, '/auth/login');
  }
});
```

### 4. IP Whitelisting/Blacklisting

**Implementation**: `src/middleware/security.ts`

**Features**:
- IP whitelist for admin access
- Dynamic IP blacklisting
- Redis-based storage
- Configurable blacklist duration
- Manual add/remove functions

**Configuration**:
```bash
# .env
ALLOWED_IPS=192.168.1.1,10.0.0.1
```

**Usage**:
```typescript
import { ipWhitelist, ipBlacklist, addToBlacklist, removeFromBlacklist } from './middleware/security';

// Apply whitelist
app.use('/admin', ipWhitelist(['192.168.1.1']));

// Apply blacklist globally
app.use(ipBlacklist);

// Manual management
await addToBlacklist('192.168.1.100', 86400); // 24 hours
await removeFromBlacklist('192.168.1.100');
```

### 5. Rate Limiting

**Implementation**: `src/middleware/security.ts`

**Features**:
- Per-endpoint rate limits
- Redis-based storage
- Configurable windows and limits
- Rate limit headers in responses
- Automatic expiration

**Default Limits**:
- `/auth/`: 5 requests per 15 minutes
- `/search/`: 30 requests per minute
- `/api/dogs`: 200 requests per 15 minutes
- `/import/`: 10 requests per hour
- `/admin/`: 100 requests per 15 minutes

**Usage**:
```typescript
import { rateLimiterByEndpoint, defaultRateLimits } from './middleware/security';

// Apply rate limiting
app.use(rateLimiterByEndpoint(defaultRateLimits));

// Custom limits
app.use('/custom', rateLimiterByEndpoint({
  '/custom': { windowMs: 60000, max: 100 },
}));
```

### 6. Security Headers

**Implementation**: `src/middleware/security.ts`

**Features**:
- Helmet.js for security headers
- Content Security Policy (CSP)
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options (clickjacking prevention)
- X-Content-Type-Options (MIME sniffing prevention)
- X-XSS-Protection
- Referrer Policy
- Permissions Policy
- Server header removal

**Usage**:
```typescript
import { securityHeaders, additionalSecurityHeaders } from './middleware/security';

app.use(securityHeaders);
app.use(additionalSecurityHeaders);
```

### 7. Input Validation

**Implementation**: `src/validation/schemas.ts`

**Features**:
- Zod schema validation
- Type checking
- Length validation
- Format validation (email, UUID, date)
- Custom validation rules
- Sanitization for XSS prevention

**See**: [Validation Guide](./VALIDATION.md)

### 8. Anti-Scraping

**Implementation**: `src/middleware/security.ts`

**Features**:
- User-Agent analysis
- Suspicious pattern detection
- Automatic blacklist for excessive scraping
- X-Robots-Tag header

**Usage**:
```typescript
import { antiScraping } from './middleware/security';

app.use(antiScraping);
```

### 9. File Upload Validation

**Implementation**: `src/middleware/security.ts`

**Features**:
- MIME type validation
- File size limits
- Allowed file type configuration

**Usage**:
```typescript
import { validateFileUpload } from './middleware/security';

router.post(
  '/upload',
  validateFileUpload(['image/jpeg', 'image/png'], 10 * 1024 * 1024),
  uploadHandler
);
```

### 10. CSRF Protection

**Implementation**: `src/middleware/security.ts`

**Features**:
- Stateless CSRF tokens
- Token generation from session
- Token validation on state-changing requests
- Skips GET/HEAD/OPTIONS

**Usage**:
```typescript
import { csrfProtection } from './middleware/security';

// Apply to state-changing endpoints
router.post('/api/dogs', csrfProtection, createDogHandler);
```

### 11. Security Audit

**Implementation**: `src/middleware/security.ts`

**Features**:
- Request/response logging
- Error tracking (4xx+)
- Slow request tracking (>5s)
- Redis-based audit log
- 30-day retention

**Usage**:
```typescript
import { securityAudit } from './middleware/security';

app.use(securityAudit);
```

### 12. API Key Validation

**Implementation**: `src/middleware/security.ts`

**Features**:
- X-API-Key header validation
- Configurable API key
- Disabled in development mode

**Usage**:
```typescript
import { validateApiKey } from './middleware/security';

// Apply to sensitive endpoints
router.post('/admin/endpoint', validateApiKey, adminHandler);
```

## Environment Variables

### Security Configuration

```bash
# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
API_KEY=your-api-key-change-in-production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200

# CORS
ALLOWED_ORIGINS=https://gsdatlas.com,https://www.gsdatlas.com

# Security
MAX_LOGIN_ATTEMPTS=5
COOKIE_DOMAIN=.gsdatlas.com
ALLOWED_IPS=192.168.1.1,10.0.0.1

# Sentry
SENTRY_DSN=https://your-dsn@sentry.io/project
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

## Security Best Practices

### 1. Always Use HTTPS

- Never expose API over HTTP in production
- Use SSL/TLS certificates
- Configure HSTS headers
- Redirect HTTP to HTTPS

### 2. Rotate Secrets Regularly

- Change JWT secrets periodically
- Rotate API keys
- Update database passwords
- Rotate AWS credentials

### 3. Monitor Security Logs

- Check audit logs regularly
- Monitor error rates in Sentry
- Review rate limit violations
- Track suspicious IPs

### 4. Keep Dependencies Updated

- Regularly update npm packages
- Run `npm audit` to check for vulnerabilities
- Use `npm audit fix` to apply fixes
- Review security advisories

### 5. Implement Least Privilege

- Use minimal AWS IAM permissions
- Restrict database user permissions
- Limit API access with roles
- Use scoped JWT tokens

### 6. Validate All Input

- Never trust user input
- Use Zod schemas for validation
- Sanitize string inputs
- Validate file uploads

### 7. Use Prepared Statements

- Prisma ORM prevents SQL injection
- Never concatenate user input into queries
- Use parameterized queries

### 8. Enable Security Headers

- Use Helmet.js
- Configure CSP properly
- Enable HSTS
- Set X-Frame-Options

## Security Checklist

### Before Deployment

- [ ] All secrets stored in environment variables
- [ ] HTTPS enabled with valid SSL certificate
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Brute force protection enabled
- [ ] Security headers configured
- [ ] Input validation implemented
- [ ] File upload validation enabled
- [ ] API key validation on sensitive endpoints
- [ ] Sentry configured for error tracking
- [ ] Audit logging enabled
- [ ] Database credentials rotated
- [ ] JWT secret is strong (32+ chars)
- [ ] Cookies configured with HttpOnly, Secure, SameSite

### Regular Maintenance

- [ ] Review security logs weekly
- [ ] Update dependencies monthly
- [ ] Run security audits quarterly
- [ ] Rotate secrets quarterly
- [ ] Review access rights quarterly
- [ ] Test incident response plan annually

## Incident Response

### Security Breach Procedure

1. **Identify the breach**
   - Review audit logs
   - Check Sentry alerts
   - Monitor unusual activity

2. **Contain the breach**
   - Block suspicious IPs
   - Rotate compromised credentials
   - Disable affected accounts
   - Take affected systems offline if needed

3. **Eradicate the threat**
   - Identify vulnerability
   - Apply security patches
   - Remove malware
   - Update security measures

4. **Recover**
   - Restore from clean backups
   - Verify system integrity
   - Monitor for recurrence
   - Document lessons learned

5. **Notify stakeholders**
   - Inform affected users
   - Report to authorities if required
   - Update security documentation
   - Communicate with team

## Common Security Issues

### 1. SQL Injection

**Prevention**: Use Prisma ORM (parameterized queries)

```typescript
// Good - Prisma prevents SQL injection
const dogs = await prisma.dog.findMany({
  where: { name: userInput },
});

// Bad - Never do this
const query = `SELECT * FROM dogs WHERE name = '${userInput}'`;
const dogs = await db.query(query); // Vulnerable!
```

### 2. XSS Attacks

**Prevention**: Input sanitization and CSP

```typescript
// Good - Sanitize input
import { sanitizeInput } from './middleware/validation';

const cleanName = sanitizeInput(userInput);

// Good - Use CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'"],
    },
  },
}));
```

### 3. CSRF Attacks

**Prevention**: CSRF tokens and SameSite cookies

```typescript
// Good - Use CSRF protection
router.post('/api/dogs', csrfProtection, handler);

// Good - Use SameSite cookies
res.cookie('token', token, {
  sameSite: 'strict',
});
```

### 4. Brute Force Attacks

**Prevention**: Rate limiting and account lockout

```typescript
// Good - Apply brute force protection
router.post('/auth/login', bruteForceProtection, handler);
```

### 5. DDoS Attacks

**Prevention**: Rate limiting and IP blacklisting

```typescript
// Good - Apply rate limiting
app.use(rateLimiterByEndpoint(defaultRateLimits));

// Good - Blacklist abusive IPs
await addToBlacklist('192.168.1.100');
```

## Security Testing

### Automated Security Testing

```bash
# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Run dependency check
npx snyk test
```

### Manual Security Testing

1. **Test authentication endpoints**
   - Attempt login with invalid credentials
   - Test rate limiting on login
   - Verify brute force protection

2. **Test input validation**
   - Send malformed data to endpoints
   - Test XSS payloads
   - Attempt SQL injection

3. **Test authorization**
   - Access admin endpoints without auth
   - Test role-based access
   - Verify API key validation

4. **Test rate limiting**
   - Make rapid requests to endpoints
   - Verify rate limit headers
   - Test lockout behavior

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [Zod Documentation](https://zod.dev/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [AWS Security Best Practices](https://docs.aws.amazon.com/security/)
