#!/usr/bin/env bash
# One-shot bootstrap on the Raspberry Pi: clone/pull from GitHub, ensure .env, build & start.
# Usage:
#   AISSTREAM_API_KEY=xxxx bash pi_bootstrap.sh
#   (or run without the variable if pipeline/.env already exists)
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ssgzy/hk-maritime-hub-v3.git}"
APP_DIR="${APP_DIR:-$HOME/apps/hk-maritime-hub-v3}"
V4_DIR="$APP_DIR/HK_Maritime_Hub_V4"
HOST_PORT="${HOST_PORT:-8091}"

echo "==> 1/5 Get code"
mkdir -p "$(dirname "$APP_DIR")"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi
test -f "$V4_DIR/deploy/docker-compose.yml" || { echo "V4 folder missing in repo"; exit 1; }

echo "==> 2/5 Ensure pipeline/.env"
ENV_FILE="$V4_DIR/pipeline/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -z "${AISSTREAM_API_KEY:-}" ]]; then
    echo "pipeline/.env not found and AISSTREAM_API_KEY not set."
    echo "Run:  AISSTREAM_API_KEY=your_key bash $0"
    exit 1
  fi
  printf 'AISSTREAM_API_KEY=%s\n' "$AISSTREAM_API_KEY" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "wrote $ENV_FILE"
fi
mkdir -p "$V4_DIR/data/geo" "$V4_DIR/data/traffic" "$V4_DIR/data/ais"

echo "==> 3/5 Port check ($HOST_PORT)"
if ss -tln 2>/dev/null | grep -q ":${HOST_PORT} "; then
  echo "WARNING: port ${HOST_PORT} already in use. Edit deploy/docker-compose.yml (ports) and re-run."
  exit 1
fi

echo "==> 4/5 Build & start (first build on a Pi can take 5-15 min)"
cd "$V4_DIR/deploy"
docker compose up -d --build
docker compose ps

echo "==> 5/5 Health"
for i in $(seq 1 20); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${HOST_PORT}/"; then
    echo "web OK  http://127.0.0.1:${HOST_PORT}/"
    break
  fi
  sleep 3
done
curl -fsS "http://127.0.0.1:${HOST_PORT}/data/manifest.json" | head -c 160; echo
echo
echo "Next: Cloudflare Zero Trust -> Tunnels -> Public Hostname:"
echo "      marine.sammier.com  ->  HTTP  localhost:${HOST_PORT}"
