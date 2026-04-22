# Testing Guide

This document describes the testing strategy for GSD Atlas.

## Table of Contents

- [Overview](#overview)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Load Tests](#load-tests)
- [Test Coverage](#test-coverage)
- [CI/CD Integration](#ci/cd-integration)
- [Writing Tests](#writing-tests)
- [Troubleshooting](#troubleshooting)

## Overview

GSD Atlas uses a multi-layered testing approach:

1. **Unit Tests**: Test individual functions and classes in isolation
2. **Integration Tests**: Test API endpoints with a test database
3. **E2E Tests**: Test the entire application flow from user perspective
4. **Load Tests**: Test performance under high load

## Unit Tests

Unit tests test individual functions and services in isolation.

### Running Unit Tests

```bash
cd apps/api
npm run test
```

### Running Unit Tests with Coverage

```bash
cd apps/api
npm run test:coverage
```

### Watch Mode

```bash
cd apps/api
npm run test:watch
```

## Integration Tests

Integration tests test API endpoints with mocked dependencies.

### Running Integration Tests

```bash
cd apps/api
npm run test:integration
```

## E2E Tests

E2E tests test the entire application from the user's perspective using Playwright.

### Prerequisites

Install Playwright:
```bash
npm install
npx playwright install
```

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests in UI mode
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed
```

### E2E Test Structure

```
tests/e2e/
├── auth.spec.ts          # Authentication flow tests
├── main-flow.spec.ts     # Main application flow tests
└── ...                   # Additional E2E test files
```

### E2E Test Configuration

Playwright is configured in `playwright.config.ts`:

- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Reporters**: HTML, JSON, JUnit
- **Auto-retry**: 2 retries on CI
- **Screenshots**: On failure
- **Video**: Retain on failure
- **Traces**: On first retry

### Writing E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    await page.click('button');
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

## Load Tests

Load tests use k6 to test the API under load.

### Prerequisites

Install k6:
```bash
# On macOS
brew install k6

# On Linux
sudo gpg -k
sudo apt-get install k6

# On Windows
# Download from https://k6.io/
```

### Running Load Tests

```bash
# Set API URL (default: http://localhost:3001)
export API_URL=http://localhost:3001

# Run load test
k6 run tests/load/api-load-test.js
```

### Load Test Configuration

The load test is configured with the following stages:
- 2 minutes: Ramp up to 10 users
- 5 minutes: Ramp up to 50 users
- 5 minutes: Ramp up to 100 users
- 2 minutes: Ramp down to 0 users

### Thresholds

The load test enforces the following thresholds:
- 95% of requests must complete within 500ms
- 99% of requests must complete within 1000ms
- Error rate must be less than 1%

## Test Coverage

The project aims for the following coverage targets:
- Unit tests: 80%+ coverage
- Integration tests: All critical endpoints
- E2E tests: Main user flows

## CI/CD Integration

Tests are automatically run in CI/CD:
- Unit tests on every push
- Integration tests on every PR
- Load tests on merge to main
- E2E tests on release

## Writing Tests

### Unit Test Example

```typescript
import { cacheService } from '../../services/cache';

describe('CacheService', () => {
  it('should store and retrieve values', async () => {
    await cacheService.set('key', { data: 'test' });
    const result = await cacheService.get('key');
    expect(result).toEqual({ data: 'test' });
  });
});
```

### Integration Test Example

```typescript
import request from 'supertest';
import { app } from '../../index';

describe('Dogs API', () => {
  it('should return list of dogs', async () => {
    const response = await request(app)
      .get('/api/dogs')
      .expect(200);
    
    expect(response.body.data).toBeDefined();
  });
});
```

### Load Test Example

```javascript
import http from 'k6/http';
import { check } from 'k6';

export default function () {
  let res = http.get('http://localhost:3001/api/dogs');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
}
```

## Troubleshooting

### Tests Failing Due to Database

Make sure the test database is running:
```bash
docker-compose up -d postgres redis
```

### Tests Failing Due to Environment Variables

Make sure `.env.test` exists:
```bash
cp .env.example .env.test
```

### Load Tests Failing

Make sure the API is running:
```bash
cd apps/api
npm run dev
```
