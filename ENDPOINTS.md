# API Endpoints — YouTube Clone

Base URL: `http://<host>/api`

## Health

| Método | Endpoint  | Descripción              |
|--------|-----------|--------------------------|
| GET    | /health   | Health check del servidor |

## Videos

| Método | Endpoint                        | Descripción                                      | Params / Body |
|--------|---------------------------------|--------------------------------------------------|---------------|
| GET    | /videos                         | Lista videos paginados                           | `?offset=0&limit=20` |
| POST   | /videos/upload                  | Sube un video nuevo                              | Form: `title`, `description`, `file`, `thumbnail?`, `uploader_id?` |
| GET    | /videos/{video_id}              | Detalle del video + incrementa views             | Path: `video_id` |
| DELETE | /videos/{video_id}              | Elimina un video (solo el dueño)                 | Query: `requester_user_id` |
| GET    | /videos/{video_id}/stream       | Stream del video con soporte Range requests      | Header: `Range: bytes=X-Y` |
| GET    | /videos/{video_id}/thumbnail    | Imagen thumbnail del video                       | Path: `video_id` |
| GET    | /videos/{video_id}/comments     | Lista comentarios del video                      | Path: `video_id` |
| POST   | /videos/{video_id}/comments     | Agrega un comentario                             | Body: `{ "author": "", "content": "" }` |
| GET    | /videos/{video_id}/recommended  | Videos recomendados basados en el video actual   | Path: `video_id` |

## Users

| Método | Endpoint                                    | Descripción                        | Params / Body |
|--------|---------------------------------------------|------------------------------------|---------------|
| GET    | /users                                      | Lista todos los usuarios           | — |
| POST   | /users                                      | Crea un usuario nuevo              | Form: `display_name`, `provider?`, `provider_subject?`, `email?`, `avatar?` |
| GET    | /users/providers                            | Lista providers de autenticación   | — |
| GET    | /users/{user_id}/avatar                     | Imagen avatar del usuario          | Path: `user_id` |
| POST   | /users/{user_id}/subscriptions/{creator_id} | Suscribirse a un canal             | Path: `user_id`, `creator_id` |
| DELETE | /users/{user_id}/subscriptions/{creator_id} | Desuscribirse de un canal          | Path: `user_id`, `creator_id` |
| GET    | /users/{user_id}/subscriptions              | Lista IDs de canales suscritos     | Path: `user_id` |
| GET    | /users/{user_id}/feed                       | Feed de videos de canales suscritos | Path: `user_id` |
