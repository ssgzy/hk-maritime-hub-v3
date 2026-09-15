#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-pi}"
REMOTE_DIR="${2:-~/hk-maritime-hub-v4}"

echo "==> Sync to ${HOST}:${REMOTE_DIR}"
rsync -avz --delete \
  --exclude node_modules \
  --exclude web/dist \
  --exclude pipeline/.venv \
  --exclude '__pycache__' \
  --exclude .git \
  "$ROOT/" "${HOST}:${REMOTE_DIR}/"

echo "==> Build & start on Pi"
ssh "$HOST" "cd ${REMOTE_DIR}/deploy && docker compose up -d --build"

echo "==> Done. Configure Cloudflare Tunnel hostname marine.sammier.com → http://localhost:8091"
echo "    See deploy/CLOUDFLARED.md (preferred path for the Pi is deploy/pi_bootstrap.sh via GitHub)"
