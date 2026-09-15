#!/usr/bin/env bash
# One-shot: sync + docker compose on Pi (requires working `ssh pi`)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-pi}"
REMOTE_DIR="${2:-~/hk-maritime-hub-v4}"

if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "$HOST" 'echo ok' >/dev/null 2>&1; then
  cat <<EOF
ERROR: cannot SSH to '$HOST'.

Fix Cloudflare Access first (interactive, once):
  cloudflared access login https://ssh.sammier.com
  ssh pi

Or use LAN / Tailscale if available:
  ssh sammier@192.168.0.185
  ./deploy/install.sh sammier@192.168.0.185

Then re-run this script.
EOF
  exit 1
fi

exec "$ROOT/deploy/install.sh" "$HOST" "$REMOTE_DIR"
