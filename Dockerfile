# ── Stage 1: Build the React frontend ──
FROM node:20-alpine AS frontend-build

WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: Install server dependencies ──
FROM node:20-alpine AS server-deps

WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 3: Production image ──
FROM node:20-alpine

WORKDIR /app

# Copy server code and production dependencies
COPY server/ ./server/
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Copy built frontend into client/dist (where the server expects it)
COPY --from=frontend-build /app/client/dist ./client/dist

# Create data directory for poll persistence
RUN mkdir -p /app/data/polls

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
# Ensure logs are flushed immediately in Docker
ENV NODE_OPTIONS="--no-warnings"

CMD ["node", "server/index.js"]
