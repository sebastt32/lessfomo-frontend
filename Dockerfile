# Build the static dashboard.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# "/" makes the app call /api on its own origin; nginx proxies it to the backend.
ARG VITE_API_URL=/
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Serve it with nginx.
FROM nginx:1.27-alpine
# Internal URL of the lessfomo backend (Docker service name on the shared network).
ENV BACKEND_URL=http://lessfomo-backend:3001
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
