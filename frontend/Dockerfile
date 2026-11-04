# CivicConnect frontend — Vite/React build served by nginx (same-origin /api proxy)
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Same-origin API (default): the browser calls /api and nginx proxies it to
# the backend service. For a split-origin deployment rebuild with
#   --build-arg VITE_API_BASE_URL=https://api.example.org/api
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
