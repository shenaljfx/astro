# Grahachara Marketing Studio (Next.js 14) — hosted on the VM, memory-capped.
# Runs the UI + its API routes (script-gen, TTS, Pexels) and proxies astrology
# data to the API over VM-localhost. Final MP4 render is NOT done here (VM has
# no spare CPU) — that stays a one-click step on the operator's PC.
FROM node:20-slim

WORKDIR /app

# The studio never renders video server-side, so skip heavy browser downloads
# during install (keeps the image lean and the build reliable).
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1 \
    REMOTION_SKIP_BROWSER_DOWNLOAD=1 \
    NEXT_TELEMETRY_DISABLED=1

# System libs some transitive deps expect at build time.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Install ALL deps (devDeps are needed by `next build`).
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

COPY . .
RUN npm run build

EXPOSE 3001
# Bind loopback only — nginx (host network) proxies to it; not publicly exposed.
CMD ["npx", "next", "start", "-p", "3001", "-H", "127.0.0.1"]
