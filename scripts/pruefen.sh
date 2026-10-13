#!/bin/sh
# [CLAUDE] Gesamtprüfung vor jedem Push: Tests, UI-Ablauftest, UI-Rauchtest (hell/dunkel/Ukrainisch) je mit frischem Dev-Server.
# Bricht beim ersten Fehler mit Fehlercode ab (keine durch Pipes verdeckten Fehler). Aufruf: sh scripts/pruefen.sh [--schnell]
# --schnell: nur Tests + Ablauftest + Rauchtest hell (≈ 5 Min.); ohne: zusätzlich Rauchtest dunkel, Ukrainisch, Englisch und Zeitreise.
cd "$(dirname "$0")/.." || exit 1
step() { echo "== $1"; }
fail() { echo "FEHLER: $1"; exit 1; }
step "npm test"; npm test > /tmp/cfp-test.log 2>&1 || { tail -20 /tmp/cfp-test.log; fail "npm test"; }; tail -1 /tmp/cfp-test.log
step "UI-Ablauftest"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-ablauf.py > /tmp/cfp-ablauf.log 2>&1 || { tail -20 /tmp/cfp-ablauf.log; fail "Ablauftest"; }; tail -1 /tmp/cfp-ablauf.log
run_smoke() {
  sh scripts/restart-dev.sh > /dev/null
  env "$@" python3 scripts/ui-rauchtest.py > /tmp/cfp-rauch.log 2>&1 || { tail -30 /tmp/cfp-rauch.log; fail "Rauchtest $*"; }
  tail -1 /tmp/cfp-rauch.log
}
step "UI-Leerlauf (geteiltes Tablet)"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-leerlauf.py > /tmp/cfp-leerlauf.log 2>&1 || { tail -20 /tmp/cfp-leerlauf.log; fail "Leerlauftest"; }; tail -1 /tmp/cfp-leerlauf.log
step "UI-Prüfhinweise in der App-Sprache"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-pruefhinweise.py > /tmp/cfp-hinweise.log 2>&1 || { tail -20 /tmp/cfp-hinweise.log; fail "Prüfhinweise"; }; tail -1 /tmp/cfp-hinweise.log
step "UI-Import-Hinweise in der App-Sprache"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-importhinweise.py > /tmp/cfp-import.log 2>&1 || { tail -20 /tmp/cfp-import.log; fail "Import-Hinweise"; }; tail -1 /tmp/cfp-import.log
step "UI-Werkstatt Winterreifen"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-winter-werkstatt.py > /tmp/cfp-winter.log 2>&1 || { tail -20 /tmp/cfp-winter.log; fail "Werkstatt Winterreifen"; }; tail -1 /tmp/cfp-winter.log
step "UI-Rauchtest hell"; run_smoke CFP_LANG=
if [ "$1" != "--schnell" ]; then
  step "UI-Rauchtest dunkel"; run_smoke CFP_SCHEME=dark
  step "UI-Rauchtest Ukrainisch"; run_smoke CFP_LANG=uk
  step "UI-Rauchtest Englisch"; run_smoke CFP_LANG=en
  step "Zeitreise"; sh scripts/zeitreise-test.sh > /tmp/cfp-zeit.log 2>&1 || { cat /tmp/cfp-zeit.log; fail "Zeitreise"; }; echo "8 Zeitpunkte grün"
fi
echo "Alles grün."
