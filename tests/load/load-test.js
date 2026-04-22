/**
 * Load Testing Configuration
 * Uses k6 for automated load testing
 * 
 * Run with: k6 run tests/load/load-test.js
 * 
 * Install k6: https://k6.io/docs/getting-started/installation/
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 10 },   // Stay at 10 users
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
    errors: ['rate<0.01'],            // Custom error rate must be less than 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  // Test 1: Health check
  let healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: List dogs
  let dogsRes = http.get(`${BASE_URL}/api/dogs?limit=20`);
  check(dogsRes, {
    'dogs list status is 200': (r) => r.status === 200,
    'dogs list has data': (r) => JSON.parse(r.body).data.length > 0,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Get single dog (if available)
  if (dogsRes.status === 200) {
    const dogsData = JSON.parse(dogsRes.body);
    if (dogsData.data.length > 0) {
      const dogId = dogsData.data[0].id;
      let dogRes = http.get(`${BASE_URL}/api/dogs/${dogId}`);
      check(dogRes, {
        'dog detail status is 200': (r) => r.status === 200,
        'dog detail has name': (r) => JSON.parse(r.body).name !== undefined,
      }) || errorRate.add(1);
    }
  }

  sleep(1);

  // Test 4: Search
  let searchRes = http.get(`${BASE_URL}/api/dogs?search=test&limit=10`);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}
