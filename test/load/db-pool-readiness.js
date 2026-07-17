import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const readinessResponseTime = new Trend('db_pool_readiness_response_time', true);
const readinessFailures = new Counter('db_pool_readiness_failures');

export const options = {
  scenarios: {
    db_pool_readiness: {
      executor: 'constant-arrival-rate',
      rate: 400,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 80,
      maxVUs: 160,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<250'],
    db_pool_readiness_response_time: ['p(95)<250'],
    db_pool_readiness_failures: ['count<10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/health/ready`);
  readinessResponseTime.add(res.timings.duration);

  const passed = check(res, {
    'status is 200': (r) => r.status === 200,
    'database is connected': (r) => {
      try {
        return JSON.parse(r.body).database === 'connected';
      } catch {
        return false;
      }
    },
    'response time < 250ms': (r) => r.timings.duration < 250,
  });

  if (!passed) {
    readinessFailures.add(1);
  }
}
