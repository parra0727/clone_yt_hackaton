# YouTube Clone

Clon de YouTube construido con FastAPI, React, PostgreSQL y Redis.

## Inicio rápido

Requisitos:
- Docker
- Docker Compose

```bash
docker compose up --build
```

Luego abre:
- App: http://localhost
- API: http://localhost/api
- Health check: http://localhost/api/health

Para detener:

```bash
docker compose down
```

## Documentación de la API

Ver [ENDPOINTS.md](./ENDPOINTS.md) para la referencia completa de endpoints.

## Stack tecnológico

- **Frontend:** React + TypeScript + Vite
- **Backend:** FastAPI + Python 3.12
- **Base de datos:** PostgreSQL 16
- **Caché:** Redis 7
- **Proxy:** Nginx
- **Contenedores:** Docker + Docker Compose