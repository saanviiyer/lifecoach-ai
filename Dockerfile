# syntax=docker/dockerfile:1

# ---- Stage 1: build the client (vite build -> /app/dist) ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Stage 2: production runtime (serves API + WebSocket + static client) ----
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
# Runtime dependencies only (no vite/tsc/etc.).
RUN npm install --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist

# With no ANTHROPIC_API_KEY set, the app runs in MOCK MODE (fully demoable).
# Provide ANTHROPIC_API_KEY at runtime to use the real Anthropic API.
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/index.js"]
