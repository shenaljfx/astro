# ──────────────────────────────────────────────────────────────
# Stage 1 — Builder: compile native Node.js modules (swisseph)
# ──────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Install build dependencies for native addons (@swisseph/node)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first for layer-caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDeps needed for build)
RUN npm ci --ignore-scripts=false

# ──────────────────────────────────────────────────────────────
# Stage 2 — Runtime: lean production image
# ──────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

# Install runtime-only native library dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY package.json ./

# Firebase service account (optional — mounted at runtime via secret or volume)
# Do NOT bake the real credential into the image. Use:
#   docker run -v /path/to/firebase-service-account.json:/app/firebase-service-account.json ...
# or Docker secrets / environment variable injection.

# Drop privileges — run as non-root user
USER node

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "src/index.js"]
