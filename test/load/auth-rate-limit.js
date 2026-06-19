import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const rateLimitedCount = new Counter('auth_rate_limited_requests');
const rateLimitEnforced = new Rate('auth_rate_limit_enforced');

// Each VU sends 15 requests per minute — expect the 11th+ to be rate-limited
export const options = {
  scenarios: {
    auth_rate_limit: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 15,
      maxDuration: '2m',
    },
  },
  thresholds: {
    // At least some requests should be rate-limited (429)
    auth_rate_limited_requests: ['count>0'],
    auth_rate_limit_enforced: ['rate>0'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const params = { headers: { 'Content-Type': 'application/json' } };

export default function () {
  const payload = JSON.stringify({ email: 'load@test.com', password: 'wrong' });
  const res = http.post(`${BASE_URL}/auth/login`, payload, params);

  const isRateLimited = res.status === 429;
  if (isRateLimited) rateLimitedCount.add(1);
  rateLimitEnforced.add(isRateLimited ? 1 : 0);

  check(res, {
    'status is 200, 401, or 429': (r) =>
      r.status === 200 || r.status === 401 || r.status === 429,
  });

  // ~4 req/s per VU — 10 requests within 60s window triggers rate limit
  sleep(0.25);
}
