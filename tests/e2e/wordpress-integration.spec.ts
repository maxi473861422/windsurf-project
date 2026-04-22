import { test, expect } from '@playwright/test';

/**
 * WordPress Integration E2E Tests
 * Tests the WordPress plugin and theme integration with GSD Atlas API
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const WORDPRESS_URL = process.env.WORDPRESS_URL || 'http://localhost:8080';

test.describe('WordPress Integration - API Endpoints', () => {
  test('GET /api/wordpress/dogs should return dogs formatted for WordPress', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/wordpress/dogs?limit=10`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    
    if (data.data.length > 0) {
      const dog = data.data[0];
      expect(dog).toHaveProperty('id');
      expect(dog).toHaveProperty('name');
      expect(dog).toHaveProperty('registrationNumber');
      expect(dog).toHaveProperty('sex');
    }
  });

  test('GET /api/wordpress/dogs/:id should return single dog with HTML pedigree', async ({ request }) => {
    // First get a dog ID
    const listResponse = await request.get(`${API_URL}/api/wordpress/dogs?limit=1`);
    const listData = await listResponse.json();
    
    if (listData.data.length === 0) {
      test.skip();
      return;
    }
    
    const dogId = listData.data[0].id;
    
    const response = await request.get(`${API_URL}/api/wordpress/dogs/${dogId}`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('id', dogId);
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('htmlPedigree');
    expect(data.htmlPedigree).toContain('<div');
  });

  test('GET /api/wordpress/pedigree/:id should return HTML pedigree', async ({ request }) => {
    // First get a dog ID
    const listResponse = await request.get(`${API_URL}/api/wordpress/dogs?limit=1`);
    const listData = await listResponse.json();
    
    if (listData.data.length === 0) {
      test.skip();
      return;
    }
    
    const dogId = listData.data[0].id;
    
    const response = await request.get(`${API_URL}/api/wordpress/pedigree/${dogId}?generations=3`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('html');
    expect(data.html).toContain('<div');
    expect(data).toHaveProperty('generations', 3);
  });

  test('GET /api/wordpress/search should perform global search', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/wordpress/search?q=test&limit=10`);
    
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('dogs');
    expect(data).toHaveProperty('total');
    expect(Array.isArray(data.dogs)).toBe(true);
  });
});

test.describe('WordPress Integration - Caching', () => {
  test('WordPress endpoints should include cache headers', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/wordpress/dogs?limit=10`);
    
    expect(response.status()).toBe(200);
    
    const cacheHeader = response.headers()['x-cache'];
    expect(cacheHeader).toBeDefined();
    expect(['HIT', 'MISS']).toContain(cacheHeader);
  });

  test('Repeated requests should hit cache', async ({ request }) => {
    // First request
    const response1 = await request.get(`${API_URL}/api/wordpress/dogs?limit=10`);
    expect(response1.headers()['x-cache']).toBe('MISS');
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Second request
    const response2 = await request.get(`${API_URL}/api/wordpress/dogs?limit=10`);
    expect(response2.headers()['x-cache']).toBe('HIT');
  });
});

test.describe('WordPress Integration - Error Handling', () => {
  test('Invalid dog ID should return 404', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/wordpress/dogs/invalid-id`);
    
    expect(response.status()).toBe(404);
    
    const data = await response.json();
    expect(data).toHaveProperty('code', 'NOT_FOUND');
  });

  test('Invalid generations parameter should return validation error', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/wordpress/pedigree/some-id?generations=invalid`);
    
    expect(response.status()).toBe(400);
    
    const data = await response.json();
    expect(data).toHaveProperty('code', 'VALIDATION_ERROR');
  });
});

test.describe('WordPress Integration - Performance', () => {
  test('Dog list endpoint should respond within 500ms', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get(`${API_URL}/api/wordpress/dogs?limit=20`);
    const endTime = Date.now();
    
    expect(response.status()).toBe(200);
    expect(endTime - startTime).toBeLessThan(500);
  });

  test('Pedigree endpoint should respond within 1s', async ({ request }) => {
    // First get a dog ID
    const listResponse = await request.get(`${API_URL}/api/wordpress/dogs?limit=1`);
    const listData = await listResponse.json();
    
    if (listData.data.length === 0) {
      test.skip();
      return;
    }
    
    const dogId = listData.data[0].id;
    
    const startTime = Date.now();
    const response = await request.get(`${API_URL}/api/wordpress/pedigree/${dogId}?generations=5`);
    const endTime = Date.now();
    
    expect(response.status()).toBe(200);
    expect(endTime - startTime).toBeLessThan(1000);
  });
});

test.describe('WordPress Integration - Data Format', () => {
  test('Dog data should include all WordPress-required fields', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/wordpress/dogs?limit=1`);
    const data = await response.json();
    
    if (data.data.length === 0) {
      test.skip();
      return;
    }
    
    const dog = data.data[0];
    
    // Required fields for WordPress
    expect(dog).toHaveProperty('id');
    expect(dog).toHaveProperty('name');
    expect(dog).toHaveProperty('registrationNumber');
    expect(dog).toHaveProperty('sex');
    expect(dog).toHaveProperty('birthDate');
    expect(dog).toHaveProperty('color');
    expect(dog).toHaveProperty('breederName');
  });

  test('Pedigree HTML should be valid and structured', async ({ request }) => {
    const listResponse = await request.get(`${API_URL}/api/wordpress/dogs?limit=1`);
    const listData = await listResponse.json();
    
    if (listData.data.length === 0) {
      test.skip();
      return;
    }
    
    const dogId = listData.data[0].id;
    const response = await request.get(`${API_URL}/api/wordpress/pedigree/${dogId}?generations=3`);
    const data = await response.json();
    
    // Check for valid HTML structure
    expect(data.html).toMatch(/<div[^>]*>/);
    expect(data.html).toMatch(/<\/div>/);
    expect(data.html).toContain('class='); // Should have CSS classes
  });
});
