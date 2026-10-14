#!/bin/sh
# Startet den lokalen Entwicklungsserver neu (Port 8787). Beendet nur den Server auf 8787 (Prozessnummer aus /tmp/cfp-dev-8787.pid),
# damit ein zweiter Server (z. B. PORT=8788 neben der Gesamtprüfung) weiterläuft. Ohne Datei (ältere Server): wie bisher alle Dev-Server.
PIDF=/tmp/cfp-dev-8787.pid
if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then
  kill "$(cat "$PIDF")"
else
  for PID in $(ps -eo pid=,comm=,args= | awk '$2=="node" && /dev-server\.mjs/ {print $1}'); do
    [ -f /tmp/cfp-dev-8788.pid ] && [ "$PID" = "$(cat /tmp/cfp-dev-8788.pid)" ] && continue
    kill "$PID"
  done
fi
rm -f "$PIDF"
sleep 0.5
cd "$(dirname "$0")/.." || exit 1
nohup env PORT=8787 node --experimental-sqlite --no-warnings scripts/dev-server.mjs > "${1:-/dev/null}" 2>&1 &
sleep 1.5
curl -s localhost:8787/api/setup/status
