#!/bin/bash
set -e
cd /workspace/monetchat
echo '[deploy] Building...'
npm run build
echo '[deploy] Copying static assets to standalone...'
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true
echo '[deploy] Restarting PM2...'
pm2 restart monetchat-web
echo '[deploy] Done!'
