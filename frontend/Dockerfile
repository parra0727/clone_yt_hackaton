FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock* bun.lockb* ./
RUN bun install --frozen-lockfile

COPY . .

ENV VITE_API_BASE_URL=""
RUN bun run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo 'server { \
  listen 3000; \
  root /usr/share/nginx/html; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000
