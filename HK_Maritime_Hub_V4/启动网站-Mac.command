#!/usr/bin/env bash
# Mac local launcher: ensures AIS collector + optional traffic rebuild + Vite dev
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT/pipeline"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
else
  source .venv/bin/activate
fi
if [[ ! -f ../data/manifest.json ]]; then
  python fetch_csdi.py
fi
if ! pgrep -f "ais_collector.py" >/dev/null 2>&1; then
  mkdir -p ../data/ais
  nohup python ais_collector.py > ../data/ais/collector.log 2>&1 &
  echo "AIS collector started (pid $!)"
fi
# rebuild traffic every launch (cheap)
python build_traffic.py || true
cd "$ROOT/web"
if [[ ! -d node_modules ]]; then npm install; fi
echo "Open http://127.0.0.1:5174  (top bar: 2D 平面 / 3D 视图)"
exec npm run dev
