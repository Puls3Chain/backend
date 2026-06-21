/**
 * Benchmark: GET /tips/my/received — p95 < 50 ms at 100k rows
 *
 * Prerequisites
 * ─────────────
 * 1. The database must contain at least 100 000 tip rows assigned to the test
 *    creator account (see SEED_USER_ID below).
 * 2. A valid JWT for that account must be supplied via AUTH_TOKEN env variable.
 * 3. The performance indexes from migration 1750464000000-AddPerformanceIndexes
 *    must be applied (npm run migration:run).
 *
 * Run
 * ───
 *   AUTH_TOKEN=<jwt> k6 run test/load/tips-received-benchmark.js
 *
 *   # Override base URL or row count hint
 *   k6 run --env BASE_URL=http://localhost:3000 \
 *           --env AUTH_TOKEN=<jwt> \
 *           test/load/tips-received-benchmark.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const responseTime = new Trend('tips_received_response_time', true);
const indexMisses = new Counter('tips_received_slow_requests');

export const options = {
  scenarios: {
    index_benchmark: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 30,
      maxVUs: 60,
    },
  },
  thresholds: {
    // Primary acceptance criterion from the issue
    tips_received_response_time: ['p(95)<50'],
    // Secondary: overall HTTP latency must also hold
    http_req_duration: ['p(95)<50'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export function setup() {
  if (!AUTH_TOKEN) {
    console.warn(
      '[tips-received-benchmark] AUTH_TOKEN is not set. ' +
        'Requests will return 401 and the benchmark will not be meaningful. ' +
        'Set AUTH_TOKEN=<jwt> before running.',
    );
  }
  console.log(
    `[tips-received-benchmark] targeting ${BASE_URL}/tips/my/received`,
  );
  console.log(
    '[tips-received-benchmark] ensure 100k tip rows exist for the token owner ' +
      'and that migration 1750464000000-AddPerformanceIndexes has been applied.',
  );
}

export default function () {
  const params = {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      Accept: 'application/json',
    },
  };

  const res = http.get(`${BASE_URL}/tips/my/received?limit=20&page=1`, params);

  responseTime.add(res.timings.duration);

  const passed = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 50ms': (r) => r.timings.duration < 50,
    'has data array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data);
      } catch {
        return false;
      }
    },
  });

  if (!passed || res.timings.duration >= 50) {
    indexMisses.add(1);
  }

  sleep(0);
}
