// src/chaos/memory-pressure-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 500 },
    { duration: '1m', target: 1500 },  // SPIKE to 1500 users
    { duration: '30s', target: 500 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],

  },
};

export default function () {
  const randomId = Math.floor(Math.random() * 1000000);
  
  // This will create large payloads forcing memory usage
  const payload = JSON.stringify({
    nickname: `Player_${randomId}`,
    metadata: 'x'.repeat(10000), // 10KB payload per request
  });

  const res = http.post('http://localhost:3000/players', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status 201': (r) => r.status === 201,
    'response time <500ms': (r) => r.timings.duration < 500,
  });

  sleep(0.5);
}