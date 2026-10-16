#!/bin/sh
# [CLAUDE] UI-Zeitreise: datumsabhängige UI-Skripte zu kritischen Zeitpunkten (Server-, Browser- und Python-Uhr verschoben).
# Ergänzt scripts/zeitreise-test.sh (nur API-Tests). Findet Anzeigefehler, die im Entwicklungszeitraum nie auftreten –
# z. B. „1.1.2027“ statt „01.01.2027“ (nur an Tagen/Monaten < 10, gefunden 15.10.2026) oder Berliner Tag ≠ UTC-Tag nach Mitternacht.
# Aufruf: sh scripts/ui-zeitreise.sh [--alle]   (--alle: alle UI-Skripte statt der datumsabhängigen Auswahl; ≈ 30 Min.)
# Ablauf je Zeitpunkt: restart-dev.sh startet den Dev-Server mit scripts/zeitreise.mjs (CFP_FAKE_NOW), die UI-Skripte laufen mit
# PYTHONPATH=scripts/zeitreise_py (sitecustomize: Playwright-Uhr je Seite/Kontext + datetime/time in Python).
cd "$(dirname "$0")/.." || exit 1
node --no-warnings scripts/build-schema.mjs > /dev/null || exit 1
Y=$(date -u +%Y); N=$((Y + 1))
SKRIPTE="ui-zahlenformat.py ui-ablauf.py ui-gewaehrleistung.py ui-inventur.py ui-artikelverlauf.py ui-kosten-unbewertet.py ui-zeitleiste-hinweis.py ui-protokoll-person.py ui-kpi-fahrzeuge.py ui-winter-werkstatt.py"
[ "${1:-}" = "--alle" ] && SKRIPTE=$(cd scripts && ls ui-*.py | grep -v -e '^ui-rauchtest.py$' -e '^ui-lastpanel.py$')
FAIL=0
# Silvester nach Mitternacht Berlin (Tag/Monat einstellig, Jahreswechsel), Monatswechsel, Zeitumstellung Ende Oktober, Frühjahr
for T in "${Y}-12-31T23:30:00Z" "${Y}-11-30T23:30:00Z" "${Y}-10-25T00:30:00Z" "${N}-03-05T07:00:00Z"; do
  for S in $SKRIPTE; do
    LOG=/tmp/cfp-zr-${S%.py}.log
    CFP_FAKE_NOW="$T" sh scripts/restart-dev.sh > /dev/null
    if CFP_FAKE_NOW="$T" PYTHONPATH=scripts/zeitreise_py python3 "scripts/$S" > "$LOG" 2>&1; then
      echo "$T  $S  grün"
    else
      echo "$T  $S  ROT"; grep -E '✘|FEHL|Error' "$LOG" | head -8; FAIL=1
    fi
  done
done
sh scripts/restart-dev.sh > /dev/null   # Dev-Server wieder mit echter Uhr
exit $FAIL
