#!/bin/sh
# [CLAUDE] Gesamtprüfung vor jedem Push: Tests, UI-Ablauftest, UI-Rauchtest (hell/dunkel/Ukrainisch) je mit frischem Dev-Server.
# Bricht beim ersten Fehler mit Fehlercode ab (keine durch Pipes verdeckten Fehler). Aufruf: sh scripts/pruefen.sh [--schnell]
# --schnell: nur Tests + Ablauftest + Rauchtest hell (≈ 5 Min.); ohne: zusätzlich Rauchtest dunkel, Ukrainisch, Englisch, HTML-Einschleusungs-Probe und Zeitreise.
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
step "UI-Management-Panel in der App-Sprache"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-panelsprache.py > /tmp/cfp-panel.log 2>&1 || { tail -20 /tmp/cfp-panel.log; fail "Panel-Sprache"; }; tail -1 /tmp/cfp-panel.log
step "UI-Anmelde-Hinweis neues Gerät"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-neues-geraet.py > /tmp/cfp-neugeraet.log 2>&1 || { tail -20 /tmp/cfp-neugeraet.log; fail "Neues Gerät"; }; tail -1 /tmp/cfp-neugeraet.log
step "UI-Protokoll je Person"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-protokoll-person.py > /tmp/cfp-protperson.log 2>&1 || { tail -20 /tmp/cfp-protperson.log; fail "Protokoll je Person"; }; tail -1 /tmp/cfp-protperson.log
step "UI-Hilfe Zugänge & Protokoll"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-hilfe-zugang.py > /tmp/cfp-hilfezugang.log 2>&1 || { tail -20 /tmp/cfp-hilfezugang.log; fail "Hilfe Zugänge"; }; tail -1 /tmp/cfp-hilfezugang.log
step "UI-Benutzer bearbeiten"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-benutzer-bearbeiten.py > /tmp/cfp-ubearb.log 2>&1 || { tail -20 /tmp/cfp-ubearb.log; fail "Benutzer bearbeiten"; }; tail -1 /tmp/cfp-ubearb.log
step "UI-Inventur (Rückfrage, erneut prüfen)"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-inventur.py > /tmp/cfp-inventur.log 2>&1 || { tail -20 /tmp/cfp-inventur.log; fail "Inventur"; }; tail -1 /tmp/cfp-inventur.log
step "UI-Artikelverlauf (Hinweis, Journal je Artikel)"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-artikelverlauf.py > /tmp/cfp-artverlauf.log 2>&1 || { tail -20 /tmp/cfp-artverlauf.log; fail "Artikelverlauf"; }; tail -1 /tmp/cfp-artverlauf.log
step "UI-Kosten nur unbewertet (– statt 0 €)"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-kosten-unbewertet.py > /tmp/cfp-kostenuv.log 2>&1 || { tail -20 /tmp/cfp-kostenuv.log; fail "Kosten unbewertet"; }; tail -1 /tmp/cfp-kostenuv.log
step "UI-Zeitleiste Hinweis bei Kürzung"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-zeitleiste-hinweis.py > /tmp/cfp-zlhinweis.log 2>&1 || { tail -20 /tmp/cfp-zlhinweis.log; fail "Zeitleiste Hinweis"; }; tail -1 /tmp/cfp-zlhinweis.log
step "UI-Datenqualität Hinweis bei Kappung"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-dq-kappung.py > /tmp/cfp-dqkappung.log 2>&1 || { tail -20 /tmp/cfp-dqkappung.log; fail "Datenqualität Kappung"; }; tail -1 /tmp/cfp-dqkappung.log
step "UI-Archive Hinweis bei Kürzung"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-archiv-hinweis.py > /tmp/cfp-archiv.log 2>&1 || { tail -20 /tmp/cfp-archiv.log; fail "Archiv-Hinweis"; }; tail -1 /tmp/cfp-archiv.log
step "UI-Hinweise Zähler über alle"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-hinweise-zaehler.py > /tmp/cfp-hzaehler.log 2>&1 || { tail -20 /tmp/cfp-hzaehler.log; fail "Hinweise Zähler"; }; tail -1 /tmp/cfp-hzaehler.log
step "UI-Glockensymbol (Push ohne Neuaufbau)"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-glocke.py > /tmp/cfp-glocke.log 2>&1 || { tail -20 /tmp/cfp-glocke.log; fail "Glockensymbol"; }; tail -1 /tmp/cfp-glocke.log
step "UI-Wieder online (Eingaben bleiben)"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-wieder-online.py > /tmp/cfp-online.log 2>&1 || { tail -20 /tmp/cfp-online.log; fail "Wieder online"; }; tail -1 /tmp/cfp-online.log
step "UI-Fehlermeldungen (Aktion ohne Netz)"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-fehlermeldung.py > /tmp/cfp-fehlermeldung.log 2>&1 || { tail -20 /tmp/cfp-fehlermeldung.log; fail "Fehlermeldungen"; }; tail -1 /tmp/cfp-fehlermeldung.log
step "UI-Eingaben bleiben beim Neuaufbau"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-eingaben-bleiben.py > /tmp/cfp-eingaben.log 2>&1 || { tail -20 /tmp/cfp-eingaben.log; fail "Eingaben bleiben"; }; tail -1 /tmp/cfp-eingaben.log
step "UI-Listen-Filter (Suche bleibt)"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-listenfilter.py > /tmp/cfp-listenfilter.log 2>&1 || { tail -20 /tmp/cfp-listenfilter.log; fail "Listen-Filter"; }; tail -1 /tmp/cfp-listenfilter.log
step "UI-Fotogrenze (Hinweis > 10 Bilder)"; sh scripts/restart-dev.sh > /dev/null; python3 scripts/ui-fotogrenze.py > /tmp/cfp-fotogrenze.log 2>&1 || { tail -20 /tmp/cfp-fotogrenze.log; fail "Fotogrenze"; }; tail -1 /tmp/cfp-fotogrenze.log
step "UI-Rauchtest hell"; run_smoke CFP_LANG=
if [ "$1" != "--schnell" ]; then
  step "UI-Rauchtest dunkel"; run_smoke CFP_SCHEME=dark
  step "UI-Rauchtest Ukrainisch"; run_smoke CFP_LANG=uk
  step "UI-Rauchtest Englisch"; run_smoke CFP_LANG=en
  step "UI-Rauchtest HTML-Einschleusung (Freitexte)"; run_smoke CFP_XSS=1
  step "Zeitreise"; sh scripts/zeitreise-test.sh > /tmp/cfp-zeit.log 2>&1 || { cat /tmp/cfp-zeit.log; fail "Zeitreise"; }; echo "8 Zeitpunkte grün"
fi
echo "Alles grün."
