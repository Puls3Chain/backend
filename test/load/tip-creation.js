import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const responseTrend = new Trend('tip_creation_response_time');

export const options = {
  scenarios: {
    tip_burst: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 20,
      maxVUs: 60,
      startRate: 0,
      stages: [
        { target: 50, duration: '30s' },
        { target: 50, duration: '4m' },
        { target: 0, duration: '30s' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<200'],
    tip_creation_response_time: ['p(95)<200'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const params = { headers: { 'Content-Type': 'application/json' } };

export default function () {
  const payload = JSON.stringify({
    receiverWallet: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    senderWallet: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    amount: 1,
    asset: 'XLM',
    message: 'k6 load test',
  });

  const res = http.post(`${BASE_URL}/tips`, payload, params);
  responseTrend.add(res.timings.duration);
  check(res, {
    'status is 201 or 429': (r) => r.status === 201 || r.status === 429,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
