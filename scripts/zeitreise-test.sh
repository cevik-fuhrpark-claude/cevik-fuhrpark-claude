#!/bin/sh
# [CLAUDE] Testsuite zu kritischen Zeitpunkten: Berliner Mitternacht/Vormittag (UTC-Datum ≠ Berlin, 12:00 UTC liegt noch voraus),
# Zeitumstellung, Monats-/Jahreswechsel und Monate in der Zukunft. Findet Tests und Code, die nur zu bestimmten Uhrzeiten/Tagen
# funktionieren (die Entwicklungssitzungen laufen stündlich rund um die Uhr). Aufruf: sh scripts/zeitreise-test.sh
cd "$(dirname "$0")/.." || exit 1
node scripts/build-schema.mjs > /dev/null || exit 1
Y=$(date -u +%Y); N=$((Y + 1))
FAIL=0
for T in "${Y}-10-25T00:30:00Z" "${Y}-11-02T06:00:00Z" "${Y}-11-30T23:30:00Z" "${Y}-12-31T23:30:00Z" "${Y}-10-25T22:50:00Z" "${N}-03-28T22:30:00Z" "${N}-03-29T00:30:00Z" "${N}-06-15T10:00:00Z" "$(date -u -d '+1 day' +%Y-%m-%dT22:30:00Z)" "$(date -u -d '+2 days' +%Y-%m-%dT05:00:00Z)"; do
  OUT=$(CFP_FAKE_NOW="$T" node --experimental-sqlite --no-warnings --import ./scripts/zeitreise.mjs test/run.mjs 2>&1)
  # Ergebniszeile gezielt suchen (19.10.2026: einmal stand eine Leerzeichen-Zeile am Ende – Lauf galt ohne roten Test als fehlgeschlagen)
  LAST=$(printf '%s\n' "$OUT" | grep -a ' bestanden, ' | tail -1); [ -n "$LAST" ] || LAST=$(printf '%s\n' "$OUT" | tail -1)
  echo "$T  $LAST"
  case "$LAST" in *" 0 fehlgeschlagen"*) ;; *) FAIL=1; printf '%s\n' "$OUT" | grep -A2 '✘' | head -20 ;; esac
done
exit $FAIL
