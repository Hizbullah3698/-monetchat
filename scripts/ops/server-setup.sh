#!/bin/bash
# =============================================================================
# Monetchat — WSL Server First-Time Setup
# SSH into the server, then run: bash server-setup.sh
# Only needs to be run ONCE on a fresh machine.
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

echo ""
echo "================================================================="
echo "   Monetchat — WSL Server First-Time Setup"
echo "================================================================="
echo ""

# ─────────────────────────────────────────────
# 1. System packages
# ─────────────────────────────────────────────
info "Updating system packages..."
sudo apt-get update -y
sudo apt-get install -y \
  curl wget git unzip \
  ca-certificates gnupg lsb-release \
  build-essential
log "System packages updated."

# ─────────────────────────────────────────────
# 2. Install Docker Engine
# ─────────────────────────────────────────────
if command -v docker &>/dev/null; then
  log "Docker already installed: $(docker --version)"
else
  info "Installing Docker Engine..."
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y \
    docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker "$USER"
  log "Docker installed."
  warn "You may need to log out and back in for group membership to take effect."
  warn "Or run: newgrp docker"
fi

# ─────────────────────────────────────────────
# 3. Start Docker (WSL doesn't auto-start systemd)
# ─────────────────────────────────────────────
info "Starting Docker daemon..."
if ! sudo service docker status 2>&1 | grep -q "Docker is running"; then
  sudo service docker start
  sleep 3
fi
docker info &>/dev/null && log "Docker daemon is running." \
  || warn "Docker daemon may not be running. Try: sudo service docker start"

# ─────────────────────────────────────────────
# 4. Install docker-compose (standalone, for legacy compat)
# ─────────────────────────────────────────────
if ! command -v docker-compose &>/dev/null; then
  info "Installing docker-compose standalone..."
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep '"tag_name"' | cut -d'"' -f4)
  sudo curl -SL \
    "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  log "docker-compose installed: $(docker-compose --version)"
else
  log "docker-compose already installed."
fi

# ─────────────────────────────────────────────
# 5. Auto-start Docker on WSL boot
#    (add to ~/.bashrc so Docker starts when WSL opens)
# ─────────────────────────────────────────────
BASHRC_LINE='# Auto-start Docker in WSL'
if ! grep -q "Auto-start Docker in WSL" ~/.bashrc; then
  info "Adding Docker auto-start to ~/.bashrc..."
  cat >> ~/.bashrc << 'EOF'

# Auto-start Docker in WSL
if service docker status 2>&1 | grep -q "Docker is not running"; then
  sudo service docker start > /dev/null 2>&1
fi
EOF
  log "Docker auto-start added to ~/.bashrc."
else
  log "Docker auto-start already in ~/.bashrc."
fi

# Allow Docker to start without a password prompt
SUDOERS_LINE="$USER ALL=(ALL) NOPASSWD: /usr/sbin/service docker *"
if ! sudo grep -qF "$SUDOERS_LINE" /etc/sudoers.d/docker-wsl 2>/dev/null; then
  info "Adding passwordless sudo for Docker service..."
  echo "$SUDOERS_LINE" | sudo tee /etc/sudoers.d/docker-wsl > /dev/null
  sudo chmod 440 /etc/sudoers.d/docker-wsl
  log "Passwordless Docker service start configured."
fi

# ─────────────────────────────────────────────
# 6. Create app directory
# ─────────────────────────────────────────────
APP_DIR="/home/administrator/monetchat"
mkdir -p "$APP_DIR"
log "App directory ready: $APP_DIR"

echo ""
echo "================================================================="
log "Server setup complete!"
echo ""
echo "  NEXT STEPS:"
echo ""
echo "  1. Configure your .env on the server:"
echo "     scp -i /Users/shazej/.ssh/shazgit2025 \\"
echo "       scripts/ops/.env.production.example \\"
echo "       administrator@38.247.138.151:~/monetchat/.env"
echo "     Then edit it: ssh ... 'nano ~/monetchat/.env'"
echo ""
echo "  2. Deploy from your Mac:"
echo "     bash scripts/ops/deploy.sh"
echo "================================================================="
