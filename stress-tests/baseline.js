/**
 * BASELINE TEST
 * 10 usuarios simultáneos por 30 segundos
 * Objetivo: medir latencia normal del sistema sin carga
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const latencyVideos = new Trend('latency_get_videos');
const latencyVideo = new Trend('latency_get_video');
const latencyStream = new Trend('latency_stream_first_byte');
const errorRate = new Rate('error_rate');
const streamRequests = new Counter('stream_requests');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    error_rate: ['rate<0.01'],
  },
};

export default function () {
  // 1. Listar videos
  const videosRes = http.get(`${BASE_URL}/videos?offset=0&limit=20`);
  latencyVideos.add(videosRes.timings.duration);
  errorRate.add(videosRes.status !== 200);
  check(videosRes, {
    'GET /videos → 200': (r) => r.status === 200,
    'GET /videos → array': (r) => {
      try { return Array.isArray(JSON.parse(r.body)); } catch { return false; }
    },
  });

  let videos = [];
  try { videos = JSON.parse(videosRes.body); } catch {}

  if (videos.length > 0) {
    const video = videos[Math.floor(Math.random() * videos.length)];

    // 2. Ver detalle del video
    const videoRes = http.get(`${BASE_URL}/videos/${video.id}`);
    latencyVideo.add(videoRes.timings.duration);
    errorRate.add(videoRes.status !== 200);
    check(videoRes, { 'GET /videos/:id → 200': (r) => r.status === 200 });

    // 3. Stream con Range request (como hace el browser)
    const streamRes = http.get(`${BASE_URL}/videos/${video.id}/stream`, {
      headers: { 'Range': 'bytes=0-65535' },
    });
    latencyStream.add(streamRes.timings.duration);
    streamRequests.add(1);
    errorRate.add(streamRes.status !== 206 && streamRes.status !== 200);
    check(streamRes, {
      'GET /stream → 206': (r) => r.status === 206 || r.status === 200,
      'GET /stream → Accept-Ranges': (r) => r.headers['Accept-Ranges'] === 'bytes',
    });
  }

  sleep(1);
}
