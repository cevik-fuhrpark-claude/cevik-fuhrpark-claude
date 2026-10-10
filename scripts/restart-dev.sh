#!/bin/sh
# Startet den lokalen Entwicklungsserver neu (Port 8787)
for PID in $(ps -eo pid=,comm=,args= | awk '$2=="node" && /dev-server\.mjs/ {print $1}'); do kill "$PID"; done
sleep 0.5
cd "$(dirname "$0")/.." || exit 1
nohup node --experimental-sqlite --no-warnings scripts/dev-server.mjs > "${1:-/dev/null}" 2>&1 &
sleep 1.5
curl -s localhost:8787/api/setup/status
