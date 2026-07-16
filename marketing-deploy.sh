#!/usr/bin/env bash
# marketing-deploy.sh — (re)start the marketing studio container on the VM.
# Host network so it can reach the API over 127.0.0.1:3000 (satisfying the
# API's localhost gate) and be proxied by nginx at 127.0.0.1:3001. Hard memory
# cap → cgroup-isolated so it can NEVER starve the live API container.
set -euo pipefail

IMAGE="${IMAGE:-ghcr.io/shenaljfx/grahachara-marketing:latest}"
NAME="grahachara-marketing"
# Use the script's own dir, NOT $HOME — under `sudo` $HOME is /root and the
# .env (secrets) lives next to this script in the deploy user's home.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"
MEM="${MARKETING_MEM:-256m}"

# Pass ONLY the secrets the studio needs (not the whole server .env).
GEMINI_API_KEY="$(grep -E '^GEMINI_API_KEY=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"
PEXELS_API_KEY="$(grep -E '^PEXELS_API_KEY=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"
MARKETING_API_KEY="$(grep -E '^MARKETING_API_KEY=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true)"

echo "[marketing] pulling $IMAGE"
docker pull "$IMAGE"
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true

echo "[marketing] starting container (mem=$MEM, host network, loopback:3001)"
docker run -d \
  --name "$NAME" \
  --restart unless-stopped \
  --network host \
  --memory "$MEM" --memory-swap "$MEM" --cpus "${MARKETING_CPUS:-0.6}" \
  -e NODE_ENV=production \
  -e SERVER_INTERNAL_URL=http://127.0.0.1:3000 \
  -e GEMINI_API_KEY="$GEMINI_API_KEY" \
  -e PEXELS_API_KEY="$PEXELS_API_KEY" \
  -e MARKETING_API_KEY="$MARKETING_API_KEY" \
  --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 \
  "$IMAGE"

sleep 5
docker ps --filter "name=$NAME" --format 'table {{.Names}}\t{{.Status}}'
echo "[marketing] recent logs:"; docker logs --tail 20 "$NAME" 2>&1 || true
