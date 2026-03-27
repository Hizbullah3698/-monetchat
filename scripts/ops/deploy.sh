#!/bin/bash
# =============================================================================
# Monetchat — Deploy from Mac to WSL Server
# Run this from your Mac terminal from the project root:
#   bash scripts/ops/deploy.sh
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

# ─────────────────────────────────────────────
# Config — edit these if needed
# ─────────────────────────────────────────────
SSH_KEY="/Users/shazej/.ssh/shazgit2025"
REMOTE_USER="administrator"
REMOTE_HOST="38.247.138.151"
REMOTE_DIR="/home/administrator/monetchat"
LOCAL_DIR="$(cd "$(dirname "$0")/../.." && pwd)"  # project root

SSH_CMD="ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST"

echo ""
echo "================================================================="
echo "   Monetchat — Deploying to $REMOTE_HOST (WSL)"
echo "================================================================="
echo ""

# ─────────────────────────────────────────────
# 1. Check SSH key exists
# ─────────────────────────────────────────────
[ -f "$SSH_KEY" ] || fail "SSH key not found at $SSH_KEY"
log "SSH key found."

# ─────────────────────────────────────────────
# 2. Test SSH connection
# ─────────────────────────────────────────────
info "Testing SSH connection..."
$SSH_CMD "echo connected" &>/dev/null || fail "Cannot connect to $REMOTE_HOST. Check server is reachable."
log "SSH connection OK."

# ─────────────────────────────────────────────
# 3. Ensure remote directory exists
# ─────────────────────────────────────────────
info "Ensuring remote directory $REMOTE_DIR exists..."
$SSH_CMD "wsl mkdir -p $REMOTE_DIR"
log "Remote directory ready."

# ─────────────────────────────────────────────
# 4. Sync project files (excluding heavy/local artifacts)
# ─────────────────────────────────────────────
info "Syncing project files to server..."
rsync -avz --progress \
  --rsync-path="wsl rsync" \
  --exclude='.git' \
  --exclude='.claude' \
  --exclude='node_modules' \
  --exclude='**/node_modules' \
  --exclude='.next' \
  --exclude='*.log' \
  --exclude='.env' \
  --exclude='database' \
  --exclude='monetchat/database' \
  --exclude='playwright-report' \
  --exclude='test-results' \
  --exclude='*.png' \
  --exclude='*.tmp' \
  --exclude='*.pptx' \
  --exclude='monetchat' \
  --exclude='pickpickdata' \
  -e "ssh -i $SSH_KEY" \
  "$LOCAL_DIR/" \
  "$REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/"
log "Files synced."

# ─────────────────────────────────────────────
# 5. Check .env exists on server, warn if not
# ─────────────────────────────────────────────
info "Checking .env on server..."
if ! $SSH_CMD "wsl [ -f $REMOTE_DIR/.env ]"; then
  warn ".env not found on server!"
  warn "Copy your .env.production.example and fill in values:"
  warn "  scp -i $SSH_KEY scripts/ops/.env.production.example $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/.env"
  warn "  Then edit it: ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST 'wsl nano $REMOTE_DIR/.env'"
  warn "Re-run this script after .env is configured."
  exit 1
else
  log ".env exists on server."
fi

# ─────────────────────────────────────────────
# 6. Run start-app.sh on server
# ─────────────────────────────────────────────
info "Running Docker deployment on server..."
$SSH_CMD "wsl bash $REMOTE_DIR/scripts/ops/remote-deploy.sh"

echo ""
echo "================================================================="
log "Deployment complete!"
echo ""
echo "  App:       http://$REMOTE_HOST:3000"
echo "  Workers:   http://$REMOTE_HOST:4501"
echo "  Qdrant:    http://$REMOTE_HOST:6333/dashboard"
echo "================================================================="
