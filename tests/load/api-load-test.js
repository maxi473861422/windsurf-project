import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Ramp up to 100 users
    { duration: '2m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'], // Error rate must be less than 1%
    errors: ['rate<0.01'], // Custom error rate must be less than 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';

export default function () {
  // Test 1: Health check
  let healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: List dogs (paginated)
  let dogsRes = http.get(`${BASE_URL}/api/dogs?limit=20&offset=0`);
  check(dogsRes, {
    'dogs list status is 200': (r) => r.status === 200,
    'dogs list has data': (r) => JSON.parse(r.body).data !== undefined,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Get single dog
  let dogRes = http.get(`${BASE_URL}/api/dogs/1`);
  check(dogRes, {
    'single dog status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  }) || errorRate.add(1);

  sleep(1);

  // Test 4: Search dogs
  let searchRes = http.get(`${BASE_URL}/api/dogs?name=Max&sex=MALE`);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(2);
}

export function handleSummary(data) {
  console.log('Test Summary:');
  console.log(`Total requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed requests: ${data.metrics.http_req_failed.values.count}`);
  console.log(`Error rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  console.log(`95th percentile: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log(`99th percentile: ${data.metrics.http_req_duration.values['p(99)']}ms`);
}
