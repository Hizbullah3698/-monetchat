# Monetchat Server Startup Script
# This script brings up the Monetchat application server on Windows.

$repoDir = "c:\inetpub\wwwroot\monetchat_migration_local\monetchat_repo"
Set-Location $repoDir

Write-Host "--- Starting Monetchat Services ---" -ForegroundColor Cyan

# 1. Environment Check
if (-not (Test-Path ".env.production")) {
    Write-Host "ERROR: .env.production missing! Please create it from .env.example." -ForegroundColor Red
    exit
}

# 2. Docker Infrastructure (WSL)
Write-Host "Bringing up Docker services (Postgres, Qdrant, Redis)..."
# Note: Manually verify Docker Desktop is running.
# Try starting services via WSL if configured.
wsl docker-compose -f docker-compose.yml up -d postgres qdrant redis

# 3. Prisma Sync
Write-Host "Syncing Database schema..."
npx prisma db push --accept-data-loss --force-reset # CAUTION: Only for clean setup

# 4. Start Application
Write-Host "Starting Monetchat App on port 3000..."
npm run start
