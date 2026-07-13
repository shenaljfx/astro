#!/usr/bin/env bash
# vm-deploy.sh — Pull the Grahachara server image and (re)start server + worker on the VM.
#
# Used both manually and by CI (.github/workflows/deploy.yml). CI scps this file to
# the VM and runs it with IMAGE set to the freshly-built tag.
#
# Config (all overridable via env):
#   IMAGE        Full image ref to run. If unset, built from REGISTRY + VERSION below.
#   REGISTRY     Registry/namespace.            default: ghcr.io/shenaljfx
#   VERSION      Tag to run when IMAGE is unset. default: latest
#
# On the VM, place your runtime files next to this script:
#   ./.env                             (server env — required)
#   ./firebase-service-account.json    (optional; mounted read-only)
set -euo pipefail

# ── Image selection ───────────────────────────────────────────
REGISTRY="${REGISTRY:-ghcr.io/shenaljfx}"
VERSION="${VERSION:-latest}"
IMAGE_TAG="${IMAGE:-$REGISTRY/grahachara-server:$VERSION}"

# ── Resource limits ───────────────────────────────────────────
MEMORY_LIMIT="${MEMORY_LIMIT:-512m}"
MEMORY_SWAP_LIMIT="${MEMORY_SWAP_LIMIT:-512m}"
CPU_LIMIT="${CPU_LIMIT:-0.5}"

# ── Paths ─────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"
FIREBASE_SA="${FIREBASE_SA:-$SCRIPT_DIR/firebase-service-account.json}"

CONTAINER_NAME="grahachara-server"
WORKER_NAME="grahachara-worker"
PORT="${PORT:-3000}"

info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*" >&2; }
error() { echo "[ERROR] $*" >&2; exit 1; }

# ── Pre-flight ────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "Docker is not installed."
[[ -f "$ENV_FILE" ]] || error ".env not found at $ENV_FILE — create it before deploying."

# ── Pull ──────────────────────────────────────────────────────
info "Pulling image: $IMAGE_TAG"
docker pull "$IMAGE_TAG"

# ── Stop and remove existing containers ──────────────────────
for CNAME in "$CONTAINER_NAME" "$WORKER_NAME"; do
  if docker ps -a --format '{{.Names}}' | grep -q "^${CNAME}$"; then
    info "Removing existing container: $CNAME"
    docker stop "$CNAME" >/dev/null 2>&1 || true
    docker rm   "$CNAME" >/dev/null 2>&1 || true
  fi
done

# ── Prune dangling images (frees disk on the small VM) ────────
docker image prune -f >/dev/null 2>&1 || true

# ── Volume mounts ─────────────────────────────────────────────
VOLUME_FLAGS=()
if [[ -f "$FIREBASE_SA" ]]; then
  VOLUME_FLAGS+=(-v "$FIREBASE_SA:/app/firebase-service-account.json:ro")
  info "Firebase service account: mounted from $FIREBASE_SA"
else
  warn "firebase-service-account.json not found at $FIREBASE_SA — running without it"
fi

# ── Run API server ────────────────────────────────────────────
info "Starting container: $CONTAINER_NAME ($IMAGE_TAG)"
docker run \
  --detach \
  --restart unless-stopped \
  --name "$CONTAINER_NAME" \
  --publish "$PORT:3000" \
  --env-file "$ENV_FILE" \
  --memory "$MEMORY_LIMIT" \
  --memory-swap "$MEMORY_SWAP_LIMIT" \
  --cpus "$CPU_LIMIT" \
  "${VOLUME_FLAGS[@]}" \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  "$IMAGE_TAG"

# ── Run worker ────────────────────────────────────────────────
# --no-healthcheck: the worker has no HTTP server, so the image's HTTP
# healthcheck would always mark it (falsely) unhealthy.
info "Starting container: $WORKER_NAME"
docker run \
  --detach \
  --restart unless-stopped \
  --name "$WORKER_NAME" \
  --no-healthcheck \
  --env-file "$ENV_FILE" \
  --memory "$MEMORY_LIMIT" \
  --memory-swap "$MEMORY_SWAP_LIMIT" \
  --cpus "$CPU_LIMIT" \
  "${VOLUME_FLAGS[@]}" \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  "$IMAGE_TAG" \
  node scripts/worker.js

# ── Health gate ───────────────────────────────────────────────
info "Waiting for server health (up to 40s)..."
for i in $(seq 1 20); do
  if docker exec "$CONTAINER_NAME" node -e \
    "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" \
    2>/dev/null; then
    info "Server is healthy on port $PORT. Deploy OK."
    docker ps --filter "name=grahachara" --format 'table {{.Names}}\t{{.Status}}'
    exit 0
  fi
  sleep 2
done

warn "Health check did not pass in time. Recent server logs:"
docker logs --tail 60 "$CONTAINER_NAME" || true
exit 1
