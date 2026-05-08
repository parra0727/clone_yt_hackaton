/**
 * LOAD TEST
 * Rampa: 10 → 100 → 500 usuarios
 * Objetivo: ver dónde empieza a degradarse la latencia
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const latencyVideos = new Trend('latency_get_videos');
const latencyVideo = new Trend('latency_get_video');
const latencyComments = new Trend('latency_get_comments');
const errorRate = new Rate('error_rate');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // warmup
    { duration: '60s', target: 100 },  // carga media
    { duration: '60s', target: 500 },  // carga alta
    { duration: '30s', target: 0 },    // cooldown
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% bajo 2s bajo carga
    http_req_duration: ['p(99)<5000'],  // 99% bajo 5s
    error_rate: ['rate<0.05'],          // menos de 5% errores
  },
};

export default function () {
  // Simula comportamiento real de usuario

  // 1. Home page — lista videos
  const videosRes = http.get(`${BASE_URL}/videos?offset=0&limit=20`);
  latencyVideos.add(videosRes.timings.duration);
  errorRate.add(videosRes.status !== 200);
  check(videosRes, { 'GET /videos → 200': (r) => r.status === 200 });

  sleep(Math.random() * 2 + 1); // 1-3s mirando la home

  let videos = [];
  try { videos = JSON.parse(videosRes.body); } catch {}
  if (videos && videos.length > 0) return;

  // 2. Abre un video aleatorio
  const video = videos[Math.floor(Math.random() * videos.length)];
  const videoRes = http.get(`${BASE_URL}/videos/${video.id}`);
  latencyVideo.add(videoRes.timings.duration);
  errorRate.add(videoRes.status !== 200);
  check(videoRes, { 'GET /videos/:id → 200': (r) => r.status === 200 });

  // 3. Carga comentarios
  const commentsRes = http.get(`${BASE_URL}/videos/${video.id}/comments`);
  latencyComments.add(commentsRes.timings.duration);
  errorRate.add(commentsRes.status !== 200);
  check(commentsRes, { 'GET /comments → 200': (r) => r.status === 200 });

  // 4. Carga recomendados
  const recRes = http.get(`${BASE_URL}/videos/${video.id}/recommended`);
  errorRate.add(recRes.status !== 200);
  check(recRes, { 'GET /recommended → 200': (r) => r.status === 200 });

  // 5. Stream del video (solo primeros 64KB)
  const streamRes = http.get(`${BASE_URL}/videos/${video.id}/stream`, {
    headers: { 'Range': 'bytes=0-65535' },
  });
  errorRate.add(streamRes.status !== 206 && streamRes.status !== 200);
  check(streamRes, { 'GET /stream → 206': (r) => r.status === 206 || r.status === 200 });

  sleep(Math.random() * 3 + 2); // 2-5s viendo el video
}
