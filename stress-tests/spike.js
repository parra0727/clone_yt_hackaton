/**
 * SPIKE TEST
 * 0 → 1000 usuarios en 10 segundos, luego baja
 * Objetivo: simular un momento viral — tráfico repentino masivo
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

const errorRate = new Rate('error_rate');
const recoveryTime = new Trend('recovery_time');
const successfulRequests = new Counter('successful_requests');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  stages: [
    { duration: '10s', target: 5 },     // baseline normal
    { duration: '10s', target: 1000 },  // SPIKE — momento viral
    { duration: '30s', target: 1000 },  // mantiene el spike
    { duration: '10s', target: 5 },     // baja rápido
    { duration: '30s', target: 5 },     // recuperación — ¿vuelve a normal?
  ],
  thresholds: {
    error_rate: ['rate<0.20'],          // acepta hasta 20% durante el spike
  },
};

export default function () {
  const start = Date.now();

  const res = http.get(`${BASE_URL}/videos?offset=0&limit=20`, {
    timeout: '15s',
  });

  const duration = Date.now() - start;
  const ok = res.status === 200;

  errorRate.add(!ok);
  if (ok) {
    successfulRequests.add(1);
    recoveryTime.add(duration);
  }

  check(res, {
    'responde durante spike': (r) => r.status === 200,
    'latencia aceptable durante spike': (r) => r.timings.duration < 10000,
  });

  // También prueba el health check — debe responder siempre
  const healthRes = http.get(`${BASE_URL}/health`, { timeout: '5s' });
  check(healthRes, { 'health check → 200': (r) => r.status === 200 });

  sleep(0.3);
}
