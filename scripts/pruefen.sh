#!/bin/sh
# [CLAUDE] Gesamtprüfung vor jedem Push: Tests, UI-Skripte, UI-Rauchtest (hell/dunkel/Ukrainisch/Englisch) je mit frischem Dev-Server.
# Bricht beim ersten Fehler mit Fehlercode ab (keine durch Pipes verdeckten Fehler).
# Aufruf: sh scripts/pruefen.sh [--schnell] [--ohne-tests] [--ohne-rauch] [--nur <Teil des Skriptnamens>]
#   --schnell     nur Tests + UI-Skripte + Rauchtest hell; ohne: zusätzlich Rauchtest dunkel, Ukrainisch, Englisch, HTML-Einschleusung, Zeitreise und UI-Zeitreise.
#   --ohne-tests  `npm test` überspringen (wenn gerade schon gelaufen)
#   --ohne-rauch  Rauchtests und Zeitreise überspringen (nur Tests + UI-Skripte)
#   --nur X       nur die UI-Skripte, deren Dateiname X enthält (z. B. --nur hoechstzahl); keine Rauchtests
# Gesamtlauf > 15 Min. → im Hintergrund starten: (sh scripts/pruefen.sh --schnell > /tmp/cfp-pruefen.log 2>&1; echo EXIT $? >> /tmp/cfp-pruefen.log) &
# Neues UI-Skript: eine Zeile „Bezeichnung|Skript|Logdatei“ in UI_SKRIPTE ergänzen.
cd "$(dirname "$0")/.." || exit 1
step() { echo "== $1"; }
fail() { echo "FEHLER: $1"; exit 1; }
SCHNELL=; OHNE_TESTS=; OHNE_RAUCH=; NUR=
while [ $# -gt 0 ]; do
  case "$1" in
    --schnell) SCHNELL=1 ;;
    --ohne-tests) OHNE_TESTS=1 ;;
    --ohne-rauch) OHNE_RAUCH=1 ;;
    --nur) shift; NUR="${1:-}"; OHNE_RAUCH=1; [ -n "$NUR" ] || fail "--nur braucht einen Namensteil" ;;
    *) fail "unbekannte Option: $1" ;;
  esac
  shift
done
[ -n "$OHNE_TESTS" ] || { step "npm test"; npm test > /tmp/cfp-test.log 2>&1 || { tail -20 /tmp/cfp-test.log; fail "npm test"; }; tail -1 /tmp/cfp-test.log; }
[ -n "$OHNE_TESTS" ] || { step "Robustheits-Lauf (Störwerte an die API)"; npm run -s fuzz > /tmp/cfp-fuzz.log 2>&1 || { tail -20 /tmp/cfp-fuzz.log; fail "Robustheits-Lauf"; }; tail -1 /tmp/cfp-fuzz.log | cut -c1-80; }
# UI-Skripte: Bezeichnung|Skript|Logdatei (je frischer Dev-Server, In-Memory-Daten)
UI_SKRIPTE='UI-Ablauftest|ui-ablauf.py|/tmp/cfp-ablauf.log
UI-Baujahr-Hinweis, Lagerbuchung einmal|ui-baujahr-lager.py|/tmp/cfp-baujahr.log
UI-Konflikt ohne Eingabeverlust (Kommentar, Fahrerakte)|ui-konflikt-eingaben.py|/tmp/cfp-konflikt.log
UI-Postausgang Foto nachreichen, Rechte Fahrzeugakte, Verlauf übersetzt|ui-postausgang-foto.py|/tmp/cfp-postfoto.log
UI-Postausgang nur unter der erfassenden Person (zwei Tabs)|ui-postausgang-fremder-name.py|/tmp/cfp-pa-person.log
UI-Postausgang in der Umgebung der Erfassung|ui-postausgang-umgebung.py|/tmp/cfp-pa-umgebung.log
UI-Sprache offline gewählt bleibt|ui-sprache-offline.py|/tmp/cfp-sprache-offline.log
UI-Foto nachreichen nach Netzabbruch beim direkten Senden|ui-foto-netzabbruch.py|/tmp/cfp-foto-netz.log
UI-Auftragstexte (Prüftermin) in der App-Sprache|ui-auftragstexte.py|/tmp/cfp-auftragstexte.log
UI-Aktionsformular bleibt offen, Vertrag km-Grundlage|ui-aktionsformular.py|/tmp/cfp-aktionsformular.log
UI-Leerlauf (geteiltes Tablet)|ui-leerlauf.py|/tmp/cfp-leerlauf.log
UI-Prüfhinweise in der App-Sprache|ui-pruefhinweise.py|/tmp/cfp-hinweise.log
UI-Import-Hinweise in der App-Sprache|ui-importhinweise.py|/tmp/cfp-import.log
UI-Werkstatt Winterreifen|ui-winter-werkstatt.py|/tmp/cfp-winter.log
UI-Management-Panel in der App-Sprache|ui-panelsprache.py|/tmp/cfp-panel.log
UI-Anmelde-Hinweis neues Gerät|ui-neues-geraet.py|/tmp/cfp-neugeraet.log
UI-Protokoll je Person|ui-protokoll-person.py|/tmp/cfp-protperson.log
UI-Hilfe Zugänge & Protokoll|ui-hilfe-zugang.py|/tmp/cfp-hilfezugang.log
UI-Benutzer bearbeiten|ui-benutzer-bearbeiten.py|/tmp/cfp-ubearb.log
UI-Inventur (Rückfrage, erneut prüfen)|ui-inventur.py|/tmp/cfp-inventur.log
UI-Artikelverlauf (Hinweis, Journal je Artikel)|ui-artikelverlauf.py|/tmp/cfp-artverlauf.log
UI-Kosten nur unbewertet (– statt 0 €)|ui-kosten-unbewertet.py|/tmp/cfp-kostenuv.log
UI-Zeitleiste Hinweis bei Kürzung|ui-zeitleiste-hinweis.py|/tmp/cfp-zlhinweis.log
UI-Datenqualität Hinweis bei Kappung|ui-dq-kappung.py|/tmp/cfp-dqkappung.log
UI-Archive Hinweis bei Kürzung|ui-archiv-hinweis.py|/tmp/cfp-archiv.log
UI-Hinweise Zähler über alle|ui-hinweise-zaehler.py|/tmp/cfp-hzaehler.log
UI-Glockensymbol (Push ohne Neuaufbau)|ui-glocke.py|/tmp/cfp-glocke.log
UI-Kalender in der App-Sprache|ui-kalender-sprache.py|/tmp/cfp-kalender.log
UI-Restarbeiten in der App-Sprache|ui-restarbeiten-sprache.py|/tmp/cfp-restarbeiten.log
UI-Datensicherung im Protokoll|ui-sicherung-protokoll.py|/tmp/cfp-sicherung-protokoll.log
UI-Reifenalter/Zahlformen|ui-reifenalter.py|/tmp/cfp-reifenalter.log
UI-Fahrernachweis abgelöst|ui-fahrernachweis-abgeloest.py|/tmp/cfp-fahrernachweis.log
UI-Einstellungen Werteprüfung|ui-einstellungen-pruefung.py|/tmp/cfp-einstellungen.log
UI-Einstellungen Altwerte|ui-einstellungen-altwerte.py|/tmp/cfp-einstellungen-altwerte.log
UI-Einstellungen Vorwarnung|ui-einstellungen-vorwarnung.py|/tmp/cfp-einstellungen-vorwarnung.log
UI-Wieder online (Eingaben bleiben)|ui-wieder-online.py|/tmp/cfp-online.log
UI-Fehlermeldungen (Aktion ohne Netz)|ui-fehlermeldung.py|/tmp/cfp-fehlermeldung.log
UI-Eingaben bleiben beim Neuaufbau|ui-eingaben-bleiben.py|/tmp/cfp-eingaben.log
UI-Listen-Filter (Suche bleibt)|ui-listenfilter.py|/tmp/cfp-listenfilter.log
UI-Fotogrenze (Hinweis > 10 Bilder)|ui-fotogrenze.py|/tmp/cfp-fotogrenze.log
UI-Kennzahlen Fahrzeugliste (alle anzeigen)|ui-kpi-fahrzeuge.py|/tmp/cfp-kpiveh.log
UI-Vorgangsdateien (Höchstzahl)|ui-vorgangsdateien.py|/tmp/cfp-vdateien.log
UI-Höchstzahl Hinweise/Rufnummern|ui-hoechstzahl-hinweise.py|/tmp/cfp-hoechstzahl.log
UI-Dublette wählen (alle offenen)|ui-dublette-auswahl.py|/tmp/cfp-dublette.log
UI-Zahlenformat je Sprache|ui-zahlenformat.py|/tmp/cfp-zahlenformat.log
UI-Gewährleistungen (Hinweis bei Kappung)|ui-gewaehrleistung.py|/tmp/cfp-gewaehrleistung.log
UI-Nacharbeit/Kostenfreigabe (Hinweise im Aktionsformular)|ui-nacharbeit-freigabe.py|/tmp/cfp-nacharbeit-freigabe.log
UI-Lager Entnahme mit Artikelpreis|ui-lager-entnahmepreis.py|/tmp/cfp-lager-entnahmepreis.log
UI-Restarbeit nach Freigabe, Arbeitsdatum-Grenzen|ui-restarbeit-freigabe.py|/tmp/cfp-restarbeit-freigabe.log
UI-Fahrerakte Nachtrag, Vertragsformular-Stand|ui-fahrerakte-nachtrag.py|/tmp/cfp-fahrerakte-nachtrag.log
UI-Bußgeld-Erfassung Wiederholung (request_key)|ui-bussgeld-wiederholung.py|/tmp/cfp-bussgeld-wiederholung.log
UI-Auslesung stornieren (Fahrer-/Fahrzeugakte)|ui-auslesung-storno.py|/tmp/cfp-auslesung-storno.log
UI-Telematik-km größer als später erfasster Stand (Übersicht, Akte)|ui-telematik-km-spaeter.py|/tmp/cfp-telematik-km-spaeter.log
UI-Versicherungsfälle ruhender Fahrzeuge (Summe, Chip)|ui-versicherung-ruhend.py|/tmp/cfp-versicherung-ruhend.log
UI-Dokumentangaben korrigieren|ui-dokument-korrigieren.py|/tmp/cfp-dokument-korrigieren.log
UI-Offline-Postausgang (Fotos, Wiederholung, keine Verluste)|ui-postausgang.py|/tmp/cfp-postausgang.log
UI-Offline-Postausgang abgewiesen (sichtbar, erneut senden, verwerfen)|ui-postausgang-abgewiesen.py|/tmp/cfp-postausgang-abgewiesen.log
UI-Konflikt-Meldungen in der Sprache|ui-konfliktsprache.py|/tmp/cfp-konfliktsprache.log
UI-Artikel-Stammdaten bearbeiten|ui-artikel-bearbeiten.py|/tmp/cfp-artikel-bearbeiten.log
UI-Dokumentsprache (html lang)|ui-html-lang.py|/tmp/cfp-htmllang.log
UI-Hinweis öffnet Gegenstand (Fahrzeugakte)|ui-hinweis-ziel.py|/tmp/cfp-hinweisziel.log
UI-Ausfallzeit + Dauer je Status (> 48 h)|ui-kpi-ausfall.py|/tmp/cfp-kpiausfall.log
UI-Pluralformen (Zähltexte je Sprache)|ui-pluralformen.py|/tmp/cfp-pluralformen.log
UI-Technische Verfügbarkeit (Kennzahlen)|ui-kpi-verfuegbarkeit.py|/tmp/cfp-kpiverf.log
UI-Fahrleistung je Monat (Fahrzeugakte)|ui-fahrleistung.py|/tmp/cfp-fahrleistung.log
UI-Kosten je km (Regel Fahrleistung)|ui-kosten-km.py|/tmp/cfp-kostenkm.log
UI-km-Zähler gesunken (Tachotausch)|ui-tachotausch.py|/tmp/cfp-tachotausch.log
UI-Werkstattplan nach Tachotausch|ui-plan-tachotausch.py|/tmp/cfp-plan-tachotausch.log
'
N=0
NL='
'
OLDIFS=$IFS; IFS=$NL; set -f
for zeile in $UI_SKRIPTE; do
  name=${zeile%%|*}; rest=${zeile#*|}; skript=${rest%%|*}; log=${rest#*|}
  if [ -n "$NUR" ]; then case "$skript" in *"$NUR"*) ;; *) continue ;; esac; fi
  step "$name"; sh scripts/restart-dev.sh > /dev/null
  python3 "scripts/$skript" > "$log" 2>&1 || { tail -20 "$log"; fail "$name"; }; tail -1 "$log"; N=$((N + 1))
done
IFS=$OLDIFS; set +f
[ -z "$NUR" ] || [ "$N" -gt 0 ] || fail "kein UI-Skript passt zu „$NUR“"
run_smoke() {
  sh scripts/restart-dev.sh > /dev/null
  env "$@" python3 scripts/ui-rauchtest.py > /tmp/cfp-rauch.log 2>&1 || { tail -30 /tmp/cfp-rauch.log; fail "Rauchtest $*"; }
  tail -1 /tmp/cfp-rauch.log
}
if [ -z "$OHNE_RAUCH" ]; then
  step "UI-Rauchtest hell"; run_smoke CFP_LANG=
  if [ -z "$SCHNELL" ]; then
    step "UI-Rauchtest dunkel"; run_smoke CFP_SCHEME=dark
    step "UI-Rauchtest Ukrainisch"; run_smoke CFP_LANG=uk
    step "UI-Rauchtest Englisch"; run_smoke CFP_LANG=en
    step "UI-Rauchtest HTML-Einschleusung (Freitexte)"; run_smoke CFP_XSS=1
    step "Zeitreise"; sh scripts/zeitreise-test.sh > /tmp/cfp-zeit.log 2>&1 || { cat /tmp/cfp-zeit.log; fail "Zeitreise"; }; echo "8 Zeitpunkte grün"
    step "UI-Zeitreise"; sh scripts/ui-zeitreise.sh > /tmp/cfp-uizeit.log 2>&1 || { grep -v ' grün$' /tmp/cfp-uizeit.log | tail -30; fail "UI-Zeitreise"; }; echo "4 Zeitpunkte grün"
  fi
fi
echo "Alles grün ($N UI-Skripte)."
