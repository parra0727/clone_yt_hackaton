# Documentación de la API — YouTube Clone

## Descripción general

API REST para un clon de YouTube construido con FastAPI + PostgreSQL + Redis.
Todos los endpoints se sirven a través de Nginx en `http://<host>/api`.

**URL Base:** `http://<host>/api`
**Content-Type:** `application/json` (salvo que se indique lo contrario)
**Autenticación:** No requerida (API abierta)

---

## Health

### GET /health
Verifica que el servidor está funcionando.

**Respuesta 200:**
```json
{ "status": "ok" }
```

---

## Videos

### GET /videos
Lista videos con paginación.

**Parámetros de consulta:**
| Parámetro | Tipo    | Default | Descripción                  |
|-----------|---------|---------|------------------------------|
| offset    | integer | 0       | Número de items a saltar     |
| limit     | integer | 20      | Items por página (máximo 100)|

**Respuesta 200:**
```json
[
  {
    "id": 1,
    "title": "Mi Video",
    "description": "Descripción del video",
    "stream_url": "/videos/1/stream",
    "thumbnail_url": "/videos/1/thumbnail",
    "views": 42,
    "created_at": "2026-05-06T22:00:00",
    "uploader": {
      "id": 1,
      "display_name": "Juan Perez",
      "avatar_url": "/users/1/avatar"
    }
  }
]
```

---

### POST /videos/upload
Sube un nuevo video.

**Content-Type:** `multipart/form-data`

**Campos del formulario:**
| Campo       | Tipo   | Requerido | Descripción                   |
|-------------|--------|-----------|-------------------------------|
| title       | string | Sí        | Título del video              |
| description | string | No        | Descripción del video         |
| file        | file   | Sí        | Archivo de video (.mp4)       |
| thumbnail   | file   | No        | Imagen de miniatura           |
| uploader_id | int    | No        | ID del usuario que sube       |

**Respuesta 200:** Objeto de video (igual al item de GET /videos)

**Errores:**
- `404` — Usuario no encontrado
- `400` — El thumbnail debe ser una imagen

---

### GET /videos/{video_id}
Obtiene el detalle de un video e incrementa el contador de vistas.

**Parámetros de ruta:**
| Parámetro | Tipo    | Descripción  |
|-----------|---------|--------------|
| video_id  | integer | ID del video |

**Respuesta 200:** Objeto de video

**Errores:**
- `404` — Video no encontrado

---

### DELETE /videos/{video_id}
Elimina un video. Solo el dueño puede eliminar su propio video.

**Parámetros de consulta:**
| Parámetro         | Tipo    | Requerido | Descripción             |
|-------------------|---------|-----------|-------------------------|
| requester_user_id | integer | Sí        | ID del usuario solicitante |

**Respuesta 200:**
```json
{ "status": "ok" }
```

**Errores:**
- `403` — No tienes permiso para eliminar este video
- `404` — Video o usuario no encontrado

---

### GET /videos/{video_id}/stream
Transmite el archivo de video con soporte de Range requests HTTP.

**Headers:**
| Header | Ejemplo           | Descripción                         |
|--------|-------------------|-------------------------------------|
| Range  | `bytes=0-1048575` | Rango de bytes a obtener (opcional) |

**Respuesta 206** (con header Range):
```
Content-Range: bytes 0-1048575/10485760
Accept-Ranges: bytes
Content-Length: 1048576
Content-Type: video/mp4
```

**Respuesta 200** (sin header Range): Stream completo del video

**Errores:**
- `404` — Video o archivo no encontrado

---

### GET /videos/{video_id}/thumbnail
Obtiene la imagen miniatura del video.

**Respuesta 200:** Archivo de imagen (jpeg/png)

**Headers:**
```
Cache-Control: public, max-age=3600
Content-Type: image/jpeg
```

**Errores:**
- `404` — Miniatura no encontrada

---

### GET /videos/{video_id}/comments
Lista todos los comentarios de un video.

**Respuesta 200:**
```json
[
  {
    "id": 1,
    "video_id": 1,
    "author": "Maria",
    "content": "Excelente video!",
    "created_at": "2026-05-06T22:00:00"
  }
]
```

---

### POST /videos/{video_id}/comments
Agrega un comentario a un video.

**Cuerpo de la solicitud:**
```json
{
  "author": "Maria",
  "content": "Excelente video!"
}
```

**Respuesta 200:** Objeto de comentario

**Errores:**
- `400` — El autor y el contenido son requeridos
- `404` — Video no encontrado

---

### GET /videos/{video_id}/recommended
Obtiene videos recomendados basados en el video actual.

**Respuesta 200:** Array de objetos de video (máximo 8)

**Errores:**
- `404` — Video no encontrado

---

## Usuarios

### GET /users
Lista todos los usuarios.

**Respuesta 200:**
```json
[
  {
    "id": 1,
    "display_name": "Juan Perez",
    "avatar_url": "/users/1/avatar",
    "created_at": "2026-05-06T22:00:00"
  }
]
```

---

### POST /users
Crea un nuevo usuario.

**Content-Type:** `multipart/form-data`

**Campos del formulario:**
| Campo            | Tipo   | Requerido | Descripción                          |
|------------------|--------|-----------|--------------------------------------|
| display_name     | string | Sí        | Nombre de usuario                    |
| provider         | string | No        | Proveedor de autenticación (default: `local`) |
| provider_subject | string | No        | ID del usuario en el proveedor       |
| email            | string | No        | Correo electrónico                   |
| avatar           | file   | No        | Imagen de avatar                     |

**Respuesta 200:** Objeto de usuario

**Errores:**
- `400` — display_name es requerido o proveedor desconocido
- `400` — El avatar debe ser una imagen

---

### GET /users/providers
Lista los proveedores de autenticación disponibles.

**Respuesta 200:**
```json
{
  "providers": ["local", "google"]
}
```

---

### GET /users/{user_id}/avatar
Obtiene la imagen de avatar del usuario.

**Respuesta 200:** Archivo de imagen (jpeg/png)

**Errores:**
- `404` — Usuario o avatar no encontrado

---

### POST /users/{user_id}/subscriptions/{creator_id}
Suscribirse a un canal.

**Parámetros de ruta:**
| Parámetro  | Tipo    | Descripción              |
|------------|---------|--------------------------|
| user_id    | integer | ID del usuario suscriptor|
| creator_id | integer | ID del canal a suscribir |

**Respuesta 200:**
```json
{
  "follower_id": 1,
  "creator_id": 2
}
```

**Errores:**
- `400` — No puedes suscribirte a ti mismo
- `404` — Usuario o canal no encontrado

---

### DELETE /users/{user_id}/subscriptions/{creator_id}
Desuscribirse de un canal.

**Respuesta 200:**
```json
{ "status": "ok" }
```

---

### GET /users/{user_id}/subscriptions
Lista todos los IDs de canales a los que el usuario está suscrito.

**Respuesta 200:**
```json
{
  "creator_ids": [2, 5, 8]
}
```

---

### GET /users/{user_id}/feed
Obtiene los videos de todos los canales suscritos, ordenados por más recientes.

**Respuesta 200:** Array de objetos de video

**Errores:**
- `404` — Usuario no encontrado

---

## Infraestructura

La aplicación corre como un conjunto de contenedores Docker orquestados con Docker Compose:

| Servicio   | Tecnología               | Rol                                          |
|------------|--------------------------|----------------------------------------------|
| nginx      | Nginx 1.29 alpine        | Reverse proxy y servido de archivos estáticos|
| backend    | FastAPI + Gunicorn        | API REST con 8 workers Uvicorn               |
| frontend   | React + Vite (compilado) | SPA servida vía Nginx                        |
| postgres   | PostgreSQL 16 alpine     | Base de datos principal con pool de conexiones|
| redis      | Redis 7 alpine           | Caché de respuestas + buffer de vistas       |

**Optimizaciones clave:**
- Redis cachea `GET /videos`, `GET /videos/:id`, comentarios y recomendaciones (TTL: 10-60s)
- Los contadores de vistas se acumulan en Redis y se sincronizan a PostgreSQL cada 50 vistas
- El streaming de video soporta Range requests HTTP (206 Partial Content) para seeking
- PostgreSQL configurado con `max_connections=500` y `shared_buffers=256MB`
- Nginx maneja hasta 16,384 conexiones concurrentes por worker

## Inicio rápido

```bash
docker compose up --build
```

App disponible en: `http://localhost`
API disponible en: `http://localhost/api`
Health check: `http://localhost/api/health`