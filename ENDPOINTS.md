# API Documentation — YouTube Clone

## Overview

REST API for a YouTube clone built with FastAPI + PostgreSQL + Redis.
All endpoints are served through Nginx at `http://<host>/api`.

**Base URL:** `http://<host>/api`  
**Content-Type:** `application/json` (unless specified)  
**Authentication:** Not required (open API)

---

## Health

### GET /health
Check if the server is running.

**Response 200:**
```json
{ "status": "ok" }
```

---

## Videos

### GET /videos
List videos with pagination.

**Query Parameters:**
| Parameter | Type    | Default | Description          |
|-----------|---------|---------|----------------------|
| offset    | integer | 0       | Number of items to skip |
| limit     | integer | 20      | Items per page (max 100) |

**Response 200:**
```json
[
  {
    "id": 1,
    "title": "My Video",
    "description": "Video description",
    "stream_url": "/videos/1/stream",
    "thumbnail_url": "/videos/1/thumbnail",
    "views": 42,
    "created_at": "2026-05-06T22:00:00",
    "uploader": {
      "id": 1,
      "display_name": "John Doe",
      "avatar_url": "/users/1/avatar"
    }
  }
]
```

---

### POST /videos/upload
Upload a new video.

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field        | Type   | Required | Description              |
|--------------|--------|----------|--------------------------|
| title        | string | Yes      | Video title              |
| description  | string | No       | Video description        |
| file         | file   | Yes      | Video file (.mp4)        |
| thumbnail    | file   | No       | Thumbnail image          |
| uploader_id  | int    | No       | ID of the uploader user  |

**Response 200:** Video object (same as GET /videos item)

**Error Responses:**
- `404` — Uploader not found
- `400` — Thumbnail must be an image

---

### GET /videos/{video_id}
Get video details and increment view count.

**Path Parameters:**
| Parameter | Type    | Description |
|-----------|---------|-------------|
| video_id  | integer | Video ID    |

**Response 200:** Video object

**Error Responses:**
- `404` — Video not found

---

### DELETE /videos/{video_id}
Delete a video. Only the uploader can delete their own video.

**Query Parameters:**
| Parameter          | Type    | Required | Description       |
|--------------------|---------|----------|-------------------|
| requester_user_id  | integer | Yes      | ID of the requester |

**Response 200:**
```json
{ "status": "ok" }
```

**Error Responses:**
- `403` — Not allowed to delete this video
- `404` — Video or user not found

---

### GET /videos/{video_id}/stream
Stream video file with HTTP Range request support.

**Headers:**
| Header | Example              | Description                    |
|--------|----------------------|--------------------------------|
| Range  | `bytes=0-1048575`    | Optional byte range to fetch   |

**Response 206** (with Range header):
```
Content-Range: bytes 0-1048575/10485760
Accept-Ranges: bytes
Content-Length: 1048576
Content-Type: video/mp4
```

**Response 200** (without Range header): Full video stream

**Error Responses:**
- `404` — Video or file not found

---

### GET /videos/{video_id}/thumbnail
Get video thumbnail image.

**Response 200:** Image file (jpeg/png)

**Headers:**
```
Cache-Control: public, max-age=3600
Content-Type: image/jpeg
```

**Error Responses:**
- `404` — Thumbnail not found

---

### GET /videos/{video_id}/comments
List all comments for a video.

**Response 200:**
```json
[
  {
    "id": 1,
    "video_id": 1,
    "author": "Jane",
    "content": "Great video!",
    "created_at": "2026-05-06T22:00:00"
  }
]
```

---

### POST /videos/{video_id}/comments
Add a comment to a video.

**Request Body:**
```json
{
  "author": "Jane",
  "content": "Great video!"
}
```

**Response 200:** Comment object

**Error Responses:**
- `400` — Author and content are required
- `404` — Video not found

---

### GET /videos/{video_id}/recommended
Get recommended videos based on the current video.

**Response 200:** Array of video objects (max 8)

**Error Responses:**
- `404` — Video not found

---

## Users

### GET /users
List all users.

**Response 200:**
```json
[
  {
    "id": 1,
    "display_name": "John Doe",
    "avatar_url": "/users/1/avatar",
    "created_at": "2026-05-06T22:00:00"
  }
]
```

---

### POST /users
Create a new user.

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field            | Type   | Required | Description                        |
|------------------|--------|----------|------------------------------------|
| display_name     | string | Yes      | User display name                  |
| provider         | string | No       | Auth provider (default: `local`)   |
| provider_subject | string | No       | Provider user ID                   |
| email            | string | No       | User email                         |
| avatar           | file   | No       | Avatar image                       |

**Response 200:** User object

**Error Responses:**
- `400` — display_name is required or unknown provider
- `400` — Avatar must be an image

---

### GET /users/providers
List available authentication providers.

**Response 200:**
```json
{
  "providers": ["local", "google"]
}
```

---

### GET /users/{user_id}/avatar
Get user avatar image.

**Response 200:** Image file (jpeg/png)

**Error Responses:**
- `404` — User or avatar not found

---

### POST /users/{user_id}/subscriptions/{creator_id}
Subscribe to a channel.

**Path Parameters:**
| Parameter  | Type    | Description           |
|------------|---------|-----------------------|
| user_id    | integer | Subscriber user ID    |
| creator_id | integer | Channel to subscribe  |

**Response 200:**
```json
{
  "follower_id": 1,
  "creator_id": 2
}
```

**Error Responses:**
- `400` — Cannot subscribe to yourself
- `404` — User or creator not found

---

### DELETE /users/{user_id}/subscriptions/{creator_id}
Unsubscribe from a channel.

**Response 200:**
```json
{ "status": "ok" }
```

---

### GET /users/{user_id}/subscriptions
List all channel IDs the user is subscribed to.

**Response 200:**
```json
{
  "creator_ids": [2, 5, 8]
}
```

---

### GET /users/{user_id}/feed
Get videos from all subscribed channels, ordered by most recent.

**Response 200:** Array of video objects

**Error Responses:**
- `404` — User not found

---

## Infrastructure

The application runs as a set of Docker containers orchestrated with Docker Compose:

| Service    | Technology              | Role                                    |
|------------|-------------------------|-----------------------------------------|
| nginx      | Nginx 1.29 alpine       | Reverse proxy, static file serving      |
| backend    | FastAPI + Gunicorn       | REST API with 8 Uvicorn workers         |
| frontend   | React + Vite (built)    | SPA served via Nginx                    |
| postgres   | PostgreSQL 16 alpine    | Primary database with connection pool   |
| redis      | Redis 7 alpine          | Response cache + view count buffering   |

**Key optimizations:**
- Redis caches `GET /videos`, `GET /videos/:id`, comments and recommendations (TTL: 10-60s)
- View counts are batched in Redis and flushed to PostgreSQL every 50 views
- Video streaming supports HTTP Range requests (206 Partial Content) for seeking
- PostgreSQL tuned with `max_connections=500`, `shared_buffers=256MB`
- Nginx handles up to 16,384 concurrent connections per worker

## Quick Start

```bash
docker compose up --build
```

App available at: `http://localhost`  
API available at: `http://localhost/api`  
Health check: `http://localhost/api/health`