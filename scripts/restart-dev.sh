#!/bin/sh
# Startet den lokalen Entwicklungsserver neu (Port 8787). Beendet nur den Server auf 8787 (Prozessnummer aus /tmp/cfp-dev-8787.pid),
# damit ein zweiter Server (z. B. PORT=8788 neben der Gesamtprüfung) weiterläuft. Ohne Datei (ältere Server): alle Dev-Server ohne bzw. mit PORT=8787.
PIDF=/tmp/cfp-dev-8787.pid
if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then
  kill "$(cat "$PIDF")"
else
  for PID in $(ps -eo pid=,comm=,args= | awk '$2=="node" && /dev-server\.mjs/ {print $1}'); do
    [ -f /tmp/cfp-dev-8788.pid ] && [ "$PID" = "$(cat /tmp/cfp-dev-8788.pid)" ] && continue
    # nur Server auf 8787 (PORT nicht gesetzt oder 8787) – eigene Prüfserver mit anderem PORT (8790, 8791 …) laufen weiter (22.10.2026)
    P=$(tr '\0' '\n' < "/proc/$PID/environ" 2>/dev/null | sed -n 's/^PORT=//p')
    [ -n "$P" ] && [ "$P" != 8787 ] && continue
    kill "$PID"
  done
fi
rm -f "$PIDF"
sleep 0.5
cd "$(dirname "$0")/.." || exit 1
# CFP_FAKE_NOW gesetzt (UI-Zeitreise): Server-Uhr über scripts/zeitreise.mjs verschieben
nohup env PORT=8787 node --experimental-sqlite --no-warnings ${CFP_FAKE_NOW:+--import ./scripts/zeitreise.mjs} scripts/dev-server.mjs > "${1:-/dev/null}" 2>&1 &
sleep 1.5
curl -s localhost:8787/api/setup/status
