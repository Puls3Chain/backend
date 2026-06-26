import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const responseTrend = new Trend('profile_read_response_time');

export const options = {
  scenarios: {
    profile_reads: {
      executor: 'constant-arrival-rate',
      rate: 200,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 100,
      startRate: 0,
      stages: [
        { target: 200, duration: '30s' },
        { target: 200, duration: '4m' },
        { target: 0, duration: '30s' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
    profile_read_response_time: ['p(95)<200'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_USERNAME = __ENV.TEST_USERNAME || 'testcreator';

export default function () {
  const res = http.get(`${BASE_URL}/profiles/${TEST_USERNAME}`);
  responseTrend.add(res.timings.duration);
  check(res, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
