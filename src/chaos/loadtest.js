import http from 'k6/http';
import { sleep,check } from 'k6';

export const options = {
  // Key configuration: Scale up to 1000 users over 1 minute
  stages: [
    { duration: '30s', target: 100 },  // Warm up
    { duration: '1m', target: 500 }, // Ramp to 500 users

  ],
};

export default function () {
  // Hit the DB endpoint
const randomPage = Math.floor(Math.random() * 800) + 1;

  // The URL with dynamic page
  const url = `http://10.109.94.57/players?page=${randomPage}&limit=50`;

  const res = http.get(url);

  check(res, {
    'is status 200': (r) => r.status === 200,
    // We want to see how many requests are still "fast"
    'is under 200ms': (r) => r.timings.duration < 200,
  });

  // Real users don't click instantly. They wait 1s.
  sleep(1);

}