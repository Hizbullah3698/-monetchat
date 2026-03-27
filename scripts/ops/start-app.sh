#!/bin/bash
# =============================================================================
# Monetchat — Docker Start / Redeploy
# Run this INSIDE WSL on the server, or triggered remotely via deploy.sh
# Usage: bash ~/monetchat/scripts/ops/start-app.sh
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }
fail() { echo -e "${RED}[✘]${NC} $1"; exit 1; }

APP_DIR="/home/administrator/monetchat"
cd "$APP_DIR"

echo ""
echo "================================================================="
echo "   Monetchat — Docker Deployment"
echo "================================================================="
echo ""

# ─────────────────────────────────────────────
# Sanity checks
# ─────────────────────────────────────────────
[ -f ".env" ] || fail ".env file not found in $APP_DIR. Aborting."
command -v docker &>/dev/null || fail "Docker not installed. Run server-setup.sh first."

# Ensure Docker daemon is running (WSL-compatible)
if ! docker info &>/dev/null; then
  info "Docker daemon not running — starting it..."
  sudo service docker start
  sleep 3
  docker info &>/dev/null || fail "Docker daemon failed to start."
fi
log "Docker is running."

# ─────────────────────────────────────────────
# Pull latest base images
# ─────────────────────────────────────────────
info "Pulling latest base images..."
docker compose pull postgres qdrant redis
log "Base images up to date."

# ─────────────────────────────────────────────
# Build app + worker images
# ─────────────────────────────────────────────
info "Building app image..."
docker compose build --no-cache app
log "App image built."

info "Building worker image..."
docker compose build --no-cache worker
log "Worker image built."

# ─────────────────────────────────────────────
# Bring down existing containers gracefully
# ─────────────────────────────────────────────
info "Stopping existing containers..."
docker compose down --remove-orphans
log "Old containers stopped."

# ─────────────────────────────────────────────
# Start all services
# ─────────────────────────────────────────────
info "Starting all services with Docker Compose..."
docker compose up -d
log "All containers started."

# ─────────────────────────────────────────────
# Wait for postgres health
# ─────────────────────────────────────────────
info "Waiting for PostgreSQL to be healthy..."
for i in {1..30}; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' Monetchat_postgres 2>/dev/null || echo "missing")
  if [ "$STATUS" = "healthy" ]; then
    log "PostgreSQL is healthy."
    break
  fi
  sleep 2
  if [ $i -eq 30 ]; then
    fail "PostgreSQL did not become healthy in time. Check: docker logs Monetchat_postgres"
  fi
done

# ─────────────────────────────────────────────
# Show running containers
# ─────────────────────────────────────────────
echo ""
docker compose ps
echo ""

echo "================================================================="
log "All services are up!"
echo ""
echo "  App:     http://localhost:3000"
echo "  Worker:  http://localhost:4501  (BullMQ dashboard)"
echo "  Qdrant:  http://localhost:6333/dashboard"
echo ""
echo "  Logs:    docker compose logs -f app"
echo "  Stop:    docker compose down"
echo "================================================================="
