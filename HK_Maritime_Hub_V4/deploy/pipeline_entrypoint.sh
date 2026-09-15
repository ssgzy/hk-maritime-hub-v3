#!/bin/sh
set -eu
# Rewrite DATA paths: pipeline expects ../data relative to pipeline/
# In container we mount /data and symlink.
mkdir -p /data/geo /data/traffic /data/ais
if [ ! -e /app/data ]; then
  ln -s /data /app/data
fi
cd /app/pipeline

echo "[pipeline] initial CSDI fetch…"
python fetch_csdi.py || true
echo "[pipeline] initial traffic build…"
python build_traffic.py || true

# Background schedulers
(
  while true; do
    sleep 86400
    python fetch_csdi.py || true
  done
) &

(
  while true; do
    sleep 1800
    python build_traffic.py || true
  done
) &

(
  while true; do
    sleep 86400
    # retention handled inside collector; extra vacuum optional
    sleep 1
  done
) &

echo "[pipeline] starting AIS collector…"
exec python ais_collector.py
