#!/usr/bin/env bash
# vm-deploy.sh — Pull, clean up, and run Grahachara server on a Linux VM
# Usage: ./vm-deploy.sh
#
# Before running:
#   1. Set VERSION and DOCKER_USER to match what was used in build-push.sh
#   2. Place your .env at: $ENV_FILE (path configured below)
#   3. Place firebase-service-account.json at: $FIREBASE_SA (optional)
#   4. docker login  (if pulling from a private repo)
set -euo pipefail

# ── ★ Edit these to match build-push.sh ───────────────────────
VERSION="1.0.0"
DOCKER_USER="rajindu98"          # e.g. rajin
# ─────────────────────────────────────────────────────────────

# ── Resource limits ───────────────────────────────────────────
MEMORY_LIMIT="512m"         # Hard memory cap  (e.g. 512m, 1g)
MEMORY_SWAP_LIMIT="512m"    # Same as memory = no swap
CPU_LIMIT="0.5"             # Number of CPUs   (e.g. 0.5, 1.0, 2.0)
# ─────────────────────────────────────────────────────────────

# ── Paths (adjust if you store files elsewhere on the VM) ─────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
FIREBASE_SA="$SCRIPT_DIR/firebase-service-account.json"
# ─────────────────────────────────────────────────────────────

IMAGE_BASE="$DOCKER_USER/grahachara-server"
IMAGE_TAG="$IMAGE_BASE:$VERSION"
CONTAINER_NAME="grahachara-server"
PORT="${PORT:-3000}"

# ── Helpers ───────────────────────────────────────────────────
info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*" >&2; }
error() { echo "[ERROR] $*" >&2; exit 1; }

# ── Pre-flight ────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "Docker is not installed. Run: curl -fsSL https://get.docker.com | sh"

[[ "$DOCKER_USER" == "your-dockerhub-username" ]] && \
  error "Set DOCKER_USER in this script before running."

if [[ ! -f "$ENV_FILE" ]]; then
  error ".env not found at $ENV_FILE — create it with your API keys before deploying."
fi

# ── Pull ──────────────────────────────────────────────────────
info "Pulling image: $IMAGE_TAG"
docker pull "$IMAGE_TAG"

# ── Stop and remove existing container ───────────────────────
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  info "Stopping container: $CONTAINER_NAME"
  docker stop "$CONTAINER_NAME" || true
  info "Removing container: $CONTAINER_NAME"
  docker rm   "$CONTAINER_NAME" || true
fi

# ── Remove old images (keep the new version) ──────────────────
info "Pruning old images for $IMAGE_BASE (keeping $VERSION)"
OLD_IMAGES=$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' \
  | grep "^$IMAGE_BASE:" \
  | grep -v ":$VERSION" \
  | grep -v ":latest" \
  | awk '{print $2}' || true)
if [[ -n "$OLD_IMAGES" ]]; then
  echo "$OLD_IMAGES" | xargs docker rmi --force || true
  info "Old images removed."
else
  info "No old images to remove."
fi

# ── Prepare volume mounts ─────────────────────────────────────
VOLUME_FLAGS=()
if [[ -f "$FIREBASE_SA" ]]; then
  VOLUME_FLAGS+=(-v "$FIREBASE_SA:/app/firebase-service-account.json:ro")
  info "Firebase service account: mounted from $FIREBASE_SA"
else
  warn "firebase-service-account.json not found at $FIREBASE_SA — running without Firebase"
fi

# ── Run ───────────────────────────────────────────────────────
info "Starting container: $CONTAINER_NAME"
info "  Image   : $IMAGE_TAG"
info "  Port    : $PORT -> 3000"
info "  Memory  : $MEMORY_LIMIT (swap: $MEMORY_SWAP_LIMIT)"
info "  CPUs    : $CPU_LIMIT"

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

# ── Health check ──────────────────────────────────────────────
info "Waiting for health check (up to 30s)..."
for i in $(seq 1 15); do
  if docker exec "$CONTAINER_NAME" node -e \
    "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))" \
    2>/dev/null; then
    info "Server is healthy on port $PORT."
    info "  Logs   : docker logs -f $CONTAINER_NAME"
    info "  Inspect: docker stats $CONTAINER_NAME"
    exit 0
  fi
  sleep 2
done

warn "Health check did not pass in time. Last logs:"
docker logs --tail 40 "$CONTAINER_NAME"
exit 1
