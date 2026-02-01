import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  // We will ramp up faster to force a crash
  stages: [
    { duration: '30s', target: 500 },   // Warm up
    { duration: '1m', target: 1000 },  // Push to 1000 (MySQL usually breaks here)
  ],
};

export default function () {
  // 1. Generate a random nickname so we don't get "Duplicate Entry" errors
  const randomId = Math.floor(Math.random() * 1000000);
  const payload = JSON.stringify({
    nickname: `Player_${randomId}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 2. Hit the POST endpoint
  const res = http.post('http://10.109.94.57/players', payload, params);

  // 3. Check if it worked (Status 201 Created)
  check(res, {
    'is status 201': (r) => r.status === 201,
  });
if (res.status !== 201) {
    console.log(`Failed: ${res.status} - ${res.body}`);
  }
  // Short sleep to simulate real traffic
  sleep(1);

  
}