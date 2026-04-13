#!/usr/bin/env bash
# build-push.sh — Build the Grahachara server Docker image and push to Docker Hub
# Usage: ./build-push.sh
#
# Before running:
#   1. Set VERSION below
#   2. Set DOCKER_USER to your Docker Hub username
#   3. Run: docker login
set -euo pipefail

# ── ★ Edit these before running ───────────────────────────────
VERSION="1.0.0"
DOCKER_USER="your-dockerhub-username"          # e.g. rajin
# ─────────────────────────────────────────────────────────────

IMAGE_BASE="$DOCKER_USER/grahachara-server"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Helpers ───────────────────────────────────────────────────
info()  { echo "[INFO]  $*"; }
error() { echo "[ERROR] $*" >&2; exit 1; }

# ── Pre-flight ────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "Docker is not installed."

[[ "$DOCKER_USER" == "your-dockerhub-username" ]] && \
  error "Set DOCKER_USER in this script before running."

# ── Build ─────────────────────────────────────────────────────
info "Building image: $IMAGE_BASE:$VERSION"
docker build \
  --tag "$IMAGE_BASE:$VERSION" \
  --tag "$IMAGE_BASE:latest" \
  --file "$SCRIPT_DIR/server/Dockerfile" \
  "$SCRIPT_DIR/server"

# ── Push ──────────────────────────────────────────────────────
info "Pushing $IMAGE_BASE:$VERSION"
docker push "$IMAGE_BASE:$VERSION"

info "Pushing $IMAGE_BASE:latest"
docker push "$IMAGE_BASE:latest"

info "Done. Image available as:"
info "  docker.io/$IMAGE_BASE:$VERSION"
info "  docker.io/$IMAGE_BASE:latest"
info ""
info "Deploy on your VM with: ./vm-deploy.sh (set VERSION=$VERSION and DOCKER_USER=$DOCKER_USER there too)"
done

warn "Health check did not pass in time. Check logs:"
docker logs --tail 30 "$CONTAINER_NAME"
exit 1
