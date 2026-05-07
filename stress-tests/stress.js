/**
 * STRESS TEST
 * Rampa hasta 1000 usuarios simultáneos
 * Objetivo: encontrar el punto de quiebre del sistema
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('error_rate');
const timeoutRate = new Rate('timeout_rate');
const successfulRequests = new Counter('successful_requests');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  stages: [
    { duration: '20s', target: 50 },
    { duration: '20s', target: 200 },
    { duration: '20s', target: 500 },
    { duration: '20s', target: 1000 },
    { duration: '30s', target: 1000 },  // mantiene 1000 VUs
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    error_rate: ['rate<0.10'],          // acepta hasta 10% errores bajo stress
    http_req_duration: ['p(95)<10000'], // 95% bajo 10s bajo stress máximo
  },
};

export default function () {
  // Bajo stress usamos el flujo más liviano para maximizar requests
  const videosRes = http.get(`${BASE_URL}/videos?offset=0&limit=20`, {
    timeout: '10s',
  });

  const ok = videosRes.status === 200;
  errorRate.add(!ok);
  timeoutRate.add(videosRes.timings.duration > 5000);

  if (ok) {
    successfulRequests.add(1);
    check(videosRes, { 'GET /videos → 200': (r) => r.status === 200 });

    let videos = [];
    try { videos = JSON.parse(videosRes.body); } catch {}

    if (videos.length > 0) {
      const video = videos[Math.floor(Math.random() * videos.length)];

      // Solo metadata del video — no stream para no saturar disco
      const videoRes = http.get(`${BASE_URL}/videos/${video.id}`, {
        timeout: '10s',
      });
      errorRate.add(videoRes.status !== 200);
      if (videoRes.status === 200) successfulRequests.add(1);
    }
  }

  sleep(0.5);
}
