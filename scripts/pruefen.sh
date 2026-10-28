#!/bin/sh
# [CLAUDE] Gesamtprüfung vor jedem Push: Tests, UI-Skripte, UI-Rauchtest (hell/dunkel/Ukrainisch/Englisch) je mit frischem Dev-Server.
# Bricht beim ersten Fehler mit Fehlercode ab (keine durch Pipes verdeckten Fehler).
# Aufruf: sh scripts/pruefen.sh [--schnell] [--ohne-tests] [--ohne-rauch] [--nur <Teil des Skriptnamens>] [--ab <Teil des Skriptnamens>]
#   --schnell     nur Tests + UI-Skripte + Rauchtest hell; ohne: zusätzlich Rauchtest dunkel, Ukrainisch, Englisch, HTML-Einschleusung, Zeitreise und UI-Zeitreise.
#   --ohne-tests  `npm test` überspringen (wenn gerade schon gelaufen)
#   --ohne-rauch  Rauchtests und Zeitreise überspringen (nur Tests + UI-Skripte)
#   --nur X       nur die UI-Skripte, deren Dateiname X enthält (z. B. --nur hoechstzahl); keine Rauchtests
#   --ab X        UI-Skripte erst ab dem ersten, dessen Dateiname X enthält (Fortsetzen nach Abbruch, z. B. --ab einstellungen-vorwarnung); Rauchtests wie sonst
# Gesamtlauf > 15 Min. → im Hintergrund starten: (sh scripts/pruefen.sh --schnell > /tmp/cfp-pruefen.log 2>&1; echo EXIT $? >> /tmp/cfp-pruefen.log) &
# Neues UI-Skript: eine Zeile „Bezeichnung|Skript|Logdatei“ in UI_SKRIPTE ergänzen.
cd "$(dirname "$0")/.." || exit 1
step() { echo "== $1"; }
fail() { echo "FEHLER: $1"; exit 1; }
SCHNELL=; OHNE_TESTS=; OHNE_RAUCH=; NUR=; AB=
while [ $# -gt 0 ]; do
  case "$1" in
    --schnell) SCHNELL=1 ;;
    --ohne-tests) OHNE_TESTS=1 ;;
    --ohne-rauch) OHNE_RAUCH=1 ;;
    --nur) shift; NUR="${1:-}"; OHNE_RAUCH=1; [ -n "$NUR" ] || fail "--nur braucht einen Namensteil" ;;
    --ab) shift; AB="${1:-}"; [ -n "$AB" ] || fail "--ab braucht einen Namensteil" ;;
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
UI-Postausgang in der Umgebung der Erfassung|ui-postausgang-ansicht.py|/tmp/cfp-pa-umgebung.log
UI-Sprache offline gewählt bleibt|ui-sprache-offline.py|/tmp/cfp-sprache-offline.log
UI-Fahrer-Auswahl (Suchfeld-Enter, Vorauswahl Kontrolle)|ui-fahrer-auswahl.py|/tmp/cfp-fahrer-auswahl.log
UI-Leitung: Zeitraum-Fehler, km-Hinweis EN, außer Betrieb ohne Zuordnung|ui-leitung-ansichten.py|/tmp/cfp-leitung-ansichten.log
UI-Reserverad und Protokollsuche 1 Zeichen|ui-reserverad.py|/tmp/cfp-reserverad.log
UI-Fahrernachweis stornieren|ui-fahrernachweis-storno.py|/tmp/cfp-ddoc-storno.log
UI-Startseite: Werkstatt-Zähler getrennt, Disposition je Standort|ui-startseite-standort.py|/tmp/cfp-startseite-standort.log
UI-HU/SP ohne Eintrag: Durchführung aus der Akte legt Eintrag an|ui-husp-ohne-eintrag.py|/tmp/cfp-husp-ohne-eintrag.log
UI-Konto/Lager: Passwortformular, 2FA-Chip, Bestand mit Menge, Fahrer ohne Lagerformulare|ui-konto-lager.py|/tmp/cfp-konto-lager.log
UI-Lager-Import (CSV): Vorschau UK 390 px, Übernehmen, keine Doppelten|ui-lager-import.py|/tmp/cfp-lager-import.log
UI-Postausgang: Umgebung gewechselt, Werkstatt offline melden|ui-postausgang-umgebung.py|/tmp/cfp-postausgang-umgebung.log
UI-Foto nachreichen nach Netzabbruch beim direkten Senden|ui-foto-netzabbruch.py|/tmp/cfp-foto-netz.log
UI-Auftragstexte (Prüftermin) in der App-Sprache|ui-auftragstexte.py|/tmp/cfp-auftragstexte.log
UI-Aktionsformular bleibt offen, Vertrag km-Grundlage|ui-aktionsformular.py|/tmp/cfp-aktionsformular.log
UI-Sperrhinweis vor Ablehnen/Sperre aufheben|ui-sperrhinweis.py|/tmp/cfp-sperrhinweis.log
UI-Barrierefreiheit (Tippflächen, Glocke, Fokus, Live-Region)|ui-barrierefreiheit.py|/tmp/cfp-barrierefreiheit.log
UI-Tastatur (Fokus nach Aktion, Escape, aria-current, Fehlerseite, Lesezugriff Notfall)|ui-tastatur.py|/tmp/cfp-tastatur.log
UI-km-Begründung nachtragen (Datenqualität → Zeitleiste)|ui-km-begruendung.py|/tmp/cfp-km-begruendung.log
UI-Befund Empfänger nicht zugestellt (Name/Rolle)|ui-befund-empfaenger.py|/tmp/cfp-befund-empfaenger.log
UI-Befund gebündelt (gleiche Empfänger, Backlog 194)|ui-befund-buendel.py|/tmp/cfp-befund-buendel.log
UI-Verträge Stichtag (km zum Monatsende, Backlog 196)|ui-vertrag-stichtag.py|/tmp/cfp-vertrag-stichtag.log
UI-Verträge Rückgabe (offene Vorgänge vor Leasingrückgabe, Backlog 288)|ui-vertrag-rueckgabe.py|/tmp/cfp-vertrag-rueckgabe.log
UI-Auslesungen Verlauf (Betriebsprüfung, Backlog 245)|ui-auslesung-verlauf.py|/tmp/cfp-auslesung-verlauf.log
UI-Fahrernachweise Zeitraum (Betriebsprüfung, Backlog 246)|ui-fahrernachweise-zeitraum.py|/tmp/cfp-fahrernachweise-zeitraum.log
UI-Postausgang wirkt auf dem Gerät (kritisch noch nicht gesendet, Backlog 200)|ui-postausgang-fahrzeug.py|/tmp/cfp-postausgang-fahrzeug.log
UI-Straßenkontrolle (Gespann: HU/SP und Mängel des Anhängers, Backlog 202)|ui-strassenkontrolle.py|/tmp/cfp-strassenkontrolle.log
UI-Wiederinbetriebnahme (Hinweis vor der ersten Fahrt, Backlog 204)|ui-wiederinbetriebnahme.py|/tmp/cfp-wiederinbetriebnahme.log
UI-Erstnutzung mit leerem Bestand (Hinweise statt leerer Seiten)|ui-erstnutzung.py|/tmp/cfp-erstnutzung.log
UI-Geräteuhr falsch (Hinweis, „heute“ nach Serverzeit)|ui-geraeteuhr.py|/tmp/cfp-geraeteuhr.log
UI-Lebenszyklus Konto deaktivieren/Fahrzeug außer Betrieb (Hinweise)|ui-lebenszyklus.py|/tmp/cfp-lebenszyklus.log
UI-Standortwechsel Fahrzeug (Hinweise, Werkstatt ohne Standort-Vorfilter)|ui-standortwechsel.py|/tmp/cfp-standortwechsel.log
UI-Bußgeld Fahrer nicht mehr aktiv (Hinweis Quittung)|ui-bussgeld-fahrer-inaktiv.py|/tmp/cfp-bussgeld-fahrer-inaktiv.log
UI-Inhaber schaltet Umgebung während Foto-Upload um|ui-umschalten-fotos.py|/tmp/cfp-umschalten-fotos.log
UI-Lagerteil mit Artikelpreis ohne Schätzung|ui-lager-schaetzung.py|/tmp/cfp-lager-schaetzung.log
UI-Standortschlüssel (Fahrer ohne Standort, Werkstatt-Vorauswahl)|ui-standort-schluessel.py|/tmp/cfp-standort-schluessel.log
UI-Kleine Handys 320 px / große Schrift (Tabs, Lagerzeile, Tippflächen)|ui-kleine-handys.py|/tmp/cfp-kleine-handys.log
UI-Einrichtungsstand (Inhaber)|ui-einrichtungsstand.py|/tmp/cfp-einrichtungsstand.log
UI-Tippflächen Links in Tabellen, Hilfe Einrichtungsstand/Standort|ui-tippflaechen-links.py|/tmp/cfp-tippflaechen-links.log
UI-Screenreader-Ansagen (Suche, Filter, Akte, Fokus Datumsfeld)|ui-screenreader-ansagen.py|/tmp/cfp-screenreader.log
UI-Druck UK/EN (Spaltenbreiten, Werkstatt EXTERN übersetzt)|ui-druck-ukrainisch.py|/tmp/cfp-druck-uk.log
UI-Sitzungsende während der Eingabe, Speicher voll|ui-sitzungsende-eingaben.py|/tmp/cfp-sitzungsende.log
UI-Schichtwechsel am Werkstatt-Tablet (Konflikt, Eingaben behalten, 401 leert Offline-Daten)|ui-schichtwechsel.py|/tmp/cfp-schichtwechsel.log
UI-Disposition im Tagesgeschäft (Rückkehr ungeklärt, Ruhend, Überfällig-Link) und Restbestand ausbuchen|ui-dispo-tagesgeschaeft.py|/tmp/cfp-dispo-tag.log
UI-Disposition erster Tag (Rückkehr ungeklärt in Reparatur, neue unbestätigte Meldungen)|ui-dispo-erster-tag.py|/tmp/cfp-dispo-erster-tag.log
UI-Fahrzeugakte „Was fehlt noch?“ (Datenqualität je Fahrzeug)|ui-akte-wasfehlt.py|/tmp/cfp-akte-wasfehlt.log
UI-Reifen-Saison, Bußgeld-Tatzeit ändern, Kosten-Einzelpositionen|ui-saison-bussgeld-kosten.py|/tmp/cfp-saison.log
UI-Springer: Abfahrtskontrolle zeigt Sperre (auch fremdes Fahrzeug), Startseite → Auslesungen|ui-springer-sperre.py|/tmp/cfp-springer.log
UI-Inhaber am Handy (Teilausfall Startseite, Erledigt mit Rückfrage, Zurück-Scroll, Umschalten auf Detailseite, Einrichtungsstand → Feld)|ui-inhaber-unterwegs.py|/tmp/cfp-inhaber.log
UI-Stichtag Kennzahlen, Stundensatz-Hinweis, Rückruf am ruhenden Fahrzeug|ui-stichtag-rueckruf.py|/tmp/cfp-stichtag.log
UI-Urlaubsrückkehr „Ältere laden“, Kontrolle bei gesperrtem Anhänger|ui-urlaub-anhaenger.py|/tmp/cfp-urlaub.log
UI-Formularentwurf Abfahrtskontrolle/Meldung (Hilfe, Sprachwechsel, QR, Verwerfen, Senden)|ui-formularentwurf.py|/tmp/cfp-formularentwurf.log
UI-Bußgeld-Antwortfrist am Wochenende (Wochentag, Markierung, Formularhinweis)|ui-frist-wochenende.py|/tmp/cfp-frist-we.log
UI-Plan: Gespann und ruhende Fahrzeuge bei geplanten Terminen (Disposition, Werkstattplan)|ui-plan-gespann.py|/tmp/cfp-plan-gespann.log
UI-Werkstatt-Tablet in der Halle (Kontrolle nach Reparatur als Entwurf, Arbeitszeit ohne Netz)|ui-werkstatt-halle.py|/tmp/cfp-werkstatt-halle.log
UI-Aktionsformular nach Netzabbruch (Entwurf je Vorgang, keine Doppelbuchung)|ui-aktionsentwurf.py|/tmp/cfp-aktionsentwurf.log
UI-Jahresabschluss (Erfassungstag je Kostenposition, Rückfrage rückwirkende Vertragsrate/Arbeitsdatum im Vormonat, „nachträglich erfasst“)|ui-jahresabschluss.py|/tmp/cfp-jahresabschluss.log
UI-Fahrerakte ausgeschieden (Hinweis Konto aktiv) und Wiedereinstellung (Rückfrage alte Akte)|ui-fahrer-ausgeschieden.py|/tmp/cfp-fahrer-ausgeschieden.log
UI-Benutzer deaktivieren nennt beendete Fahrzeugzuordnungen|ui-austritt-zuordnung.py|/tmp/cfp-austritt-zuordnung.log
UI-Kommentar an deaktivierten Melder: Kästchen ausgegraut, Hinweis niemand benachrichtigt|ui-kommentar-melder.py|/tmp/cfp-kommentar-melder.log
UI-Fahrer zuordnen mit ausgeschiedener Fahrerakte: Auswahl und Warnhinweis|ui-zuordnung-akte-ausgeschieden.py|/tmp/cfp-zuordnung-akte.log
UI-Werkstattplan: Auftrag nach Fristende und mehrfach verschoben|ui-plan-verschoben.py|/tmp/cfp-plan-verschoben.log
UI-Gesperrtes Fahrzeug genutzt: Ergebnisseite, Verlauf, Befund|ui-sperre-genutzt.py|/tmp/cfp-sperre-genutzt.log
UI-Werkstattplan: begonnener Auftrag mit vergangenem Termin unter „in Arbeit“|ui-plan-inarbeit.py|/tmp/cfp-plan-inarbeit.log
UI-Fahrzeug korrigieren (Meldung am falschen Fahrzeug)|ui-fahrzeug-korrigieren.py|/tmp/cfp-fahrzeug-korrigieren.log
UI-Kontrolle korrigieren (Abfahrtskontrolle am falschen Fahrzeug)|ui-kontrolle-korrigieren.py|/tmp/cfp-kontrolle-korrigieren.log
UI-Restarbeit als Folgeauftrag|ui-restarbeit-folgeauftrag.py|/tmp/cfp-restarbeit-folgeauftrag.log
UI-Vorgänge: Werkstatt-Filter|ui-vorgaenge-werkstattfilter.py|/tmp/cfp-vorgaenge-werkstattfilter.log
UI-Werkstattplan: Werkstatt wechseln|ui-plan-werkstattwechsel.py|/tmp/cfp-plan-werkstattwechsel.log
UI-Sturmnacht und Schadenaufstellung (Filter, nächste Meldung, Versicherungsfälle)|ui-sturmnacht.py|/tmp/cfp-sturmnacht.log
UI-Schadenzeitpunkt (später gemeldet, Fahrer zum Zeitpunkt, berichtigen)|ui-schadenzeitpunkt.py|/tmp/cfp-schadenzeitpunkt.log
UI-Kennzeichenverlauf: Akte und Suche nach altem Kennzeichen|ui-kennzeichenverlauf.py|/tmp/cfp-kennzeichenverlauf.log
UI-Leitungswechsel: Eingang und „gesehen von“ einer ausgeschiedenen Leitung|ui-leitungswechsel.py|/tmp/cfp-leitungswechsel.log
UI-Ausdruck aus der Testumgebung erkennbar, kompakte Druckliste|ui-druck-testumgebung.py|/tmp/cfp-druck-test.log
UI-Leerlauf (geteiltes Tablet)|ui-leerlauf.py|/tmp/cfp-leerlauf.log
UI-Prüfhinweise in der App-Sprache|ui-pruefhinweise.py|/tmp/cfp-hinweise.log
UI-Import-Hinweise in der App-Sprache|ui-importhinweise.py|/tmp/cfp-import.log
UI-Werkstatt Winterreifen|ui-winter-werkstatt.py|/tmp/cfp-winter.log
UI-Management-Panel in der App-Sprache|ui-panelsprache.py|/tmp/cfp-panel.log
UI-Befundwerte und Datenqualität-km in der App-Sprache|ui-befundwerte.py|/tmp/cfp-befundwerte.log
UI-Startseite Befunde → Panel-Auswahl Kritisch + Handeln|ui-befund-auswahl.py|/tmp/cfp-befundauswahl.log
UI-Fahrzeugakte Fahrerauswahl und Dateigröße|ui-akte-fahrer-dateigroesse.py|/tmp/cfp-akte-fahrer.log
UI-Anmelde-Hinweis neues Gerät|ui-neues-geraet.py|/tmp/cfp-neugeraet.log
UI-Protokoll je Person|ui-protokoll-person.py|/tmp/cfp-protperson.log
UI-Hilfe Zugänge & Protokoll|ui-hilfe-zugang.py|/tmp/cfp-hilfezugang.log
UI-Benutzer bearbeiten|ui-benutzer-bearbeiten.py|/tmp/cfp-ubearb.log
UI-Inventur (Rückfrage, erneut prüfen)|ui-inventur.py|/tmp/cfp-inventur.log
UI-Lager-CSV mit Auswahl, Stückpreis 3 Stellen|ui-lager-csv-auswahl.py|/tmp/cfp-lagercsv.log
UI-Artikelverlauf (Hinweis, Journal je Artikel)|ui-artikelverlauf.py|/tmp/cfp-artverlauf.log
UI-Versicherungsfall bei Dublette (Hinweis statt Formular), Alle gelesen|ui-versicherung-dublette.py|/tmp/cfp-vers-dublette.log
UI-Führerscheinkontrolle stornieren (Verlauf, Begründung)|ui-fuehrerscheinkontrolle-storno.py|/tmp/cfp-fk-storno.log
UI-Startseite: Sprung mit Standortfilter wie Zähler|ui-startseite-sprung-standort.py|/tmp/cfp-sprung-standort.log
UI-Werkstatt-Befehl nach Funkloch nicht doppelt|ui-befehl-funkloch.py|/tmp/cfp-befehl-funkloch.log
UI-Vorgang nennt berechnete SP, Nachweistext übersetzt|ui-vorgang-sp-berechnet.py|/tmp/cfp-vorgang-sp.log
UI-Stammdaten auf gelesenem Stand, Bußgeld Anhänger/Übernahme|ui-stammdaten-stand-bussgeld-anhaenger.py|/tmp/cfp-stand-bussgeld.log
UI-Berechtigungsfehler mit Grund (Kontrolle nach Reparatur, Status)|ui-berechtigung-grund.py|/tmp/cfp-berechtigung-grund.log
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
UI-Versicherungsfall mit Gutachter (Abschnitt, Filter)|ui-versicherung-gutachter.py|/tmp/cfp-versicherung-gutachter.log
UI-Werkstattauftrag ohne Reparatur beenden (Totalschaden)|ui-ohne-reparatur.py|/tmp/cfp-ohne-reparatur.log
UI-Störung erneut gemeldet: abgeschlossene Vorgänge der 90 Tage davor|ui-stoerung-wiederholt.py|/tmp/cfp-stoerung-wiederholt.log
UI-Fahrtenschreiber-/Fahrerkarten-Hinweis im Meldeformular|ui-fahrtenschreiber-hinweis.py|/tmp/cfp-fahrtenschreiber-hinweis.log
UI-Diebstahl-/Einbruch-Hinweis im Meldeformular und Hilfe|ui-diebstahl-hinweis.py|/tmp/cfp-diebstahl-hinweis.log
UI-Glasschaden-Hinweis im Meldeformular, Vorgang und Hilfe|ui-glasschaden.py|/tmp/cfp-glasschaden.log
UI-Wildunfall-Hinweis im Meldeformular, Vorgang und Hilfe|ui-wildunfall.py|/tmp/cfp-wildunfall.log
UI-Schlüssel/Fahrzeugschein-verloren-Hinweis im Meldeformular und Hilfe|ui-schluessel-verloren.py|/tmp/cfp-schluessel-verloren.log
UI-Fehlbetankungs-Hinweis im Meldeformular und Hilfe|ui-falsch-getankt.py|/tmp/cfp-falsch-getankt.log
UI-Reifenpanne-Hinweis im Meldeformular und Hilfe|ui-reifenpanne.py|/tmp/cfp-reifenpanne.log
UI-Hinweis Beanstandung bei Polizei-/BAG-Kontrolle im Meldeformular und Hilfe|ui-kontrolle-beanstandet.py|/tmp/cfp-kontrolle-beanstandet.log
UI-Hinweis Fahrzeug springt nicht an im Meldeformular und Hilfe|ui-springt-nicht-an.py|/tmp/cfp-springt-nicht-an.log
UI-Hinweis Warnleuchte während der Fahrt im Meldeformular und Hilfe|ui-warnleuchte.py|/tmp/cfp-warnleuchte.log
UI-Hinweis Ölspur/Leck unter dem Lkw im Meldeformular und Hilfe|ui-leck.py|/tmp/cfp-leck.log
UI-Hinweis Schaden beim Kunden (Rampe, Stapler) im Meldeformular und Hilfe|ui-schaden-kunde.py|/tmp/cfp-schaden-kunde.log
UI-Hinweis Rauch oder Brandgeruch am Fahrzeug im Meldeformular und Hilfe|ui-rauch.py|/tmp/cfp-rauch.log
UI-Hinweis Kühlgerät des Kühlaufliegers ausgefallen im Meldeformular und Hilfe|ui-kuehlgeraet.py|/tmp/cfp-kuehlgeraet.log
UI-Hinweis Auffälligkeit an der Bremse im Meldeformular und Hilfe|ui-bremse.py|/tmp/cfp-bremse.log
UI-Hinweis Plane gerissen/Ladung nass im Meldeformular und Hilfe|ui-plane-gerissen.py|/tmp/cfp-plane-gerissen.log
UI-Hinweis Ladung verrutscht im Meldeformular und Hilfe|ui-ladung-verrutscht.py|/tmp/cfp-ladung-verrutscht.log
UI-Hinweis Spiegel abgefahren im Meldeformular und Hilfe|ui-spiegel.py|/tmp/cfp-spiegel.log
UI-Hinweis Auflieger lässt sich nicht kuppeln/hat sich gelöst im Meldeformular und Hilfe|ui-kupplung.py|/tmp/cfp-kupplung.log
UI-Hinweis Beleuchtung am Lkw/Auflieger ausgefallen im Meldeformular und Hilfe|ui-licht.py|/tmp/cfp-licht.log
UI-Hinweis Tür/Hecktür/Ladebordwand schließt nicht im Meldeformular und Hilfe|ui-tuer.py|/tmp/cfp-tuer.log
UI-Hinweis Lkw festgefahren/kommt bei Glätte nicht weiter im Meldeformular und Hilfe|ui-festgefahren.py|/tmp/cfp-festgefahren.log
UI-Hinweis Heizung/Gebläse/Scheibenwischer ausgefallen, Scheibe beschlagen/vereist im Meldeformular und Hilfe|ui-sicht.py|/tmp/cfp-sicht.log
UI-Hinweis Teil hängt herunter/schleift/unterwegs verloren im Meldeformular und Hilfe|ui-teil-lose.py|/tmp/cfp-teil-lose.log
UI-Hinweis Assistenzsystem gestört/Lkw bremst grundlos im Meldeformular und Hilfe|ui-assistenz.py|/tmp/cfp-assistenz.log
UI-Hinweis Lenkung schwergängig/Spiel/Lkw zieht zur Seite im Meldeformular und Hilfe|ui-lenkung.py|/tmp/cfp-lenkung.log
UI-Hinweis Motor im Notlauf/Leistungsverlust/Überhitzung im Meldeformular und Hilfe|ui-motor.py|/tmp/cfp-motor.log
UI-Hinweis Luftfederung defekt/Lkw oder Auflieger hängt schief im Meldeformular und Hilfe|ui-federung.py|/tmp/cfp-federung.log
UI-Hinweis Getriebe schaltet nicht/Gang geht nicht rein/Kupplung rutscht im Meldeformular und Hilfe|ui-getriebe.py|/tmp/cfp-getriebe.log
UI-Hinweis Sicherheitsgurt/Fahrersitz defekt im Meldeformular und Hilfe|ui-gurt.py|/tmp/cfp-gurt.log
UI-Hinweis Kombiinstrument/Display/Hupe ausgefallen im Meldeformular und Hilfe|ui-anzeige.py|/tmp/cfp-anzeige.log
UI-Hinweis Auspuff laut/undicht, Abgase im Fahrerhaus im Meldeformular und Hilfe|ui-abgas.py|/tmp/cfp-abgas.log
UI-Hinweis Fahrerhaus lässt sich nicht kippen/nicht verriegelt im Meldeformular und Hilfe|ui-fahrerhaus-kippen.py|/tmp/cfp-fahrerhaus-kippen.log
UI-Hinweis Diesel versulzt/AdBlue eingefroren im Meldeformular und Hilfe|ui-diesel-kaelte.py|/tmp/cfp-diesel-kaelte.log
UI-Hinweis Warndreieck/Verbandkasten/Feuerlöscher/Unterlegkeil fehlt im Meldeformular und Hilfe|ui-ausruestung.py|/tmp/cfp-ausruestung.log
UI-Hinweis Rad wackelt/Radmuttern locker/Radlager heiß im Meldeformular und Hilfe|ui-rad.py|/tmp/cfp-rad.log
UI-Hinweis Mautgerät (OBU) rot/Störung/ausgefallen im Meldeformular und Hilfe|ui-maut.py|/tmp/cfp-maut.log
UI-Hinweis Standheizung/Klimaanlage im Fahrerhaus ausgefallen im Meldeformular und Hilfe|ui-klima.py|/tmp/cfp-klima.log
UI-Hinweis Fensterheber defekt/Seitenscheibe geht nicht zu im Meldeformular und Hilfe|ui-fenster.py|/tmp/cfp-fenster.log
UI-Hinweis Tankdeckel/AdBlue-Deckel verloren/klemmt/schließt nicht im Meldeformular und Hilfe|ui-tankdeckel.py|/tmp/cfp-tankdeckel.log
UI-Hinweis Tankkarte verloren/gestohlen/abgelehnt im Meldeformular und Hilfe|ui-tankkarte.py|/tmp/cfp-tankkarte.log
UI-Hinweis Unterfahrschutz/Seitenschutz verbogen im Meldeformular und Hilfe|ui-unterfahrschutz.py|/tmp/cfp-unterfahrschutz.log
UI-Hinweis Reifen beschädigt/verliert Luft/abgefahren im Meldeformular und Hilfe|ui-reifenschaden.py|/tmp/cfp-reifenschaden.log
UI-Hinweis Fahrerhaus lässt sich nicht abschließen/Zentralverriegelung defekt im Meldeformular und Hilfe|ui-abschliessen.py|/tmp/cfp-abschliessen.log
UI-Hinweis Lkw vibriert/schaukelt/flattert im Meldeformular und Hilfe, Zündschloss → Start-Hinweis|ui-vibration.py|/tmp/cfp-vibration.log
UI-Hinweis Ladeetage/Auffahrrampe/Hydraulik gestört im Meldeformular und Hilfe, Hupe hängt → Anzeige-Hinweis|ui-ladeetage.py|/tmp/cfp-ladeetage.log
UI-Hinweise Kamera beschlagen, Kühler-/Luftschlauch geplatzt, Kühlergrill lose, Tachometer, Luftsitz im Meldeformular|ui-kamera-schlauch.py|/tmp/cfp-kamera-schlauch.log
UI-Bußgeld mit Fahrverbot: Auswahl beim Erfassen, Chip, Hinweis § 21 StVG, Ändern/Entfernen, DE/UK/EN 390/820/1366|ui-fahrverbot.py|/tmp/cfp-fahrverbot.log
UI-Bußgeld Zustellstand der Fahrerinformation und Einwand des Fahrers, DE/UK/EN 390/820/1366|ui-bussgeld-zustellung.py|/tmp/cfp-bussgeld-zustellung.log
UI-Vorgang wartet auf Teile: worauf gewartet wird, Liefertermin verschoben (Falschlieferung), Grund im Formular, DE/UK/EN 390/820/1366|ui-teile-falschlieferung.py|/tmp/cfp-teile-falschlieferung.log
UI-Teillieferung eingegangen: Formular, „Wartet noch auf“, Anzahl + ursprünglicher Vermerk, Liste, DE/UK/EN 390/820/1366|ui-teillieferung.py|/tmp/cfp-teillieferung.log
UI-Buchungsformulare nennen Auftrag + Kennzeichen, Hinweis „nicht änderbar“, DE/UK/EN 390/820/1366|ui-buchung-auftrag.py|/tmp/cfp-buchung-auftrag.log
UI-Werkstatt-Startseite Kurzablauf eines Auftrags (Knopf-Beschriftungen, Ausblenden bleibt), Vorab-Info bricht um, DE/UK/EN 390/820/1366|ui-werkstatt-kurzablauf.py|/tmp/cfp-werkstatt-kurzablauf.log
UI-Werkstatt-Startseite: Auftrag oben hervorgehoben und im Arbeitsschritt – „steht auch oben“, Gesamtzahl ohne Doppelzählung, DE/UK/EN 390/820/1366|ui-werkstatt-doppelt.py|/tmp/cfp-werkstatt-doppelt.log
UI-Werkstatt-Tagesreihenfolge: „Heute geplant“ und Werkstattplan gesperrt → mittel → niedrig, ältere Meldung zuerst, Hinweis zum Termin, DE/UK/EN 390/820/1366|ui-werkstatt-tagesreihenfolge.py|/tmp/cfp-werkstatt-tagesreihenfolge.log
UI-Disposition „Wieder einsatzbereit (heute/gestern freigegeben)“: nur freie Fahrzeuge, Freigabezeit, Abholvermerk, DE/UK/EN 390/820/1366|ui-dispo-wieder-da.py|/tmp/cfp-dispo-wieder-da.log
UI-Foto vom Melder nachgereicht: Verlauf „Foto/Datei nachgereicht“ mit Dateiname, Hinweis an die Leitung, Foto beim Melden ohne Eintrag, DE/UK/EN 390/820/1366|ui-foto-nachgereicht.py|/tmp/cfp-foto-nachgereicht.log
UI-Rückfrage an den Melder: Häkchen im Kommentar, Fahrer-Startseite/Vorgang, Antwort → „beantwortet“ in Vorgang, Liste und Heute zu tun, DE/UK/EN 390/820/1366|ui-rueckfrage-melder.py|/tmp/cfp-rueckfrage-melder.log
UI-Restarbeiten nach der Freigabe in „Mein Fahrzeug“ der Fahrer, ohne Link, DE/UK/EN 390/820/1366|ui-restarbeit-fahrer.py|/tmp/cfp-restarbeit-fahrer.log
UI-Disposition „Bis zum Werkstatttermin einplanbar“: künftiger Termin nicht in „Nicht einplanen“, Vortag, Hinweis zum Termin, DE/UK/EN 390/820/1366|ui-dispo-bis-termin.py|/tmp/cfp-dispo-bis-termin.log
UI-Werkstatt-Startseite wartet auf Teile: längste Wartezeit zuerst, Wartet auf/Wartezeit/kein Liefertermin in Listen, DE/UK/EN 390/820/1366|ui-teile-nachfassen.py|/tmp/cfp-teile-nachfassen.log
UI-Neuer Fahrer erster Tag: Einladung in gewählter Sprache, Kontrolle mit Mangel → Ergebnisseite „vor der Abfahrt klären“, Fahrbereitschaft „nicht abgefragt“, HU/SP ausgeschrieben, DE/UK/EN 390/820/1366|ui-fahrer-erster-tag.py|/tmp/cfp-fahrer-erster-tag.log
UI-Herstellerwerkstatt: Freigabe extern ohne Warnung, Werkstattplan mit Standort, Fremdleistung 0 € mit Vermerk, Hinweis 0/leer, DE/UK/EN 390/820/1366|ui-herstellerwerkstatt.py|/tmp/cfp-herstellerwerkstatt.log
UI-Unfall in Polen: Unfall-Hinweis bei Zusammenstoß/зіткнення/collision mit Unfallbericht-Schritt, Gegner-Kennzeichen ohne D-Band, DE/UK/EN 390/820/1366|ui-unfall-polen.py|/tmp/cfp-unfall-polen.log
UI-Getriebetausch/Fahrtenschreiber: Hinweis § 57b vor Abschlusskontrolle, Tachograph-Durchführung mit Einbauschild-Hinweis, Kurzinfo ≤ 60 Tage, DE/UK/EN 390/820/1366|ui-getriebe-57b.py|/tmp/cfp-getriebe-57b.log
UI-Ruhendes Fahrzeug/Versicherung beendet: Hinweis an den Fahrer auf „Mein Fahrzeug“, Datenqualität „kein laufender Kfz-Versicherungsvertrag“, DE/UK/EN 390/820/1366|ui-ruhend-versicherung.py|/tmp/cfp-ruhend-versicherung.log
UI-Sammelmeldung (Hagel): gleicher Schaden an 14 Fahrzeugen in zwei Blöcken, je Fahrzeug ein Vorgang mit Link, weniger als zwei Fahrzeuge abgewiesen, DE/UK/EN 390/820/1366|ui-hagel-sammelmeldung.py|/tmp/cfp-hagel-sammelmeldung.log
UI-Prüftermin für mehrere Fahrzeuge (Wintercheck): 5 Fahrzeuge, Hinweise ohne Bezeichnung/Fahrzeug, Link zur Fahrzeugakte, erneut ohne Dubletten, DE/UK/EN 390/820/1366|ui-pruefung-sammelanlage.py|/tmp/cfp-pruefung-sammelanlage.log
UI-Winterreifen-Bedarf je Reifengröße (Reifen-Flotte, Winter-Reiter), Größe nicht hinterlegt getrennt, DE/UK/EN 390/820/1366|ui-winterreifen-bedarf.py|/tmp/cfp-winterreifen-bedarf.log
UI-Winterreifen-Aufträge für mehrere Lkw (Werkstatt Pflicht, je Lkw ein Auftrag mit Link, danach nicht wählbar), DE/UK/EN 390/820/1366|ui-winterreifen-auftraege.py|/tmp/cfp-winterreifen-auftraege.log
UI-Umrüstung zum Winterreifen-Auftrag erfassen (je Achse vorbereitet, Kennzeichnung Pflicht, Größe per Knopf, danach erfüllt mit Link), DE/UK/EN 390/820/1366|ui-winterreifen-umruestung.py|/tmp/cfp-winterreifen-umruestung.log
UI-Verträge „Ende/Kündigung bis“ (Quartalsende, eigenes Datum, alle Termine, Stichtag hebt auf), DE/UK/EN 390/820/1366|ui-vertraege-faellig-bis.py|/tmp/cfp-vertraege-faellig-bis.log
UI-Unterweisung für mehrere Fahrer (ohne Auswahl Hinweis, alle erfasst mit Link, erneut ohne Dubletten, Akte), DE/UK/EN 390/820/1366|ui-unterweisung-mehrere.py|/tmp/cfp-unterweisung-mehrere.log
UI-Führerscheinkontrolle für mehrere Fahrer (Fällige auswählen, Link je Fahrer, danach aktuell, erneut ohne Dubletten), DE/UK/EN 390/820/1366|ui-fs-kontrolle-mehrere.py|/tmp/cfp-fs-kontrolle-mehrere.log
UI-Stundensatz-Verlauf (bisherigen Satz behalten, Liste, Entfernen), DE/UK/EN 390/820/1366|ui-stundensatz-verlauf.py|/tmp/cfp-stundensatz-verlauf.log
UI-Kostenbericht Schnellwahl (laufendes Jahr, Vorjahr, letzte 12 Monate), DE/UK/EN 390/820/1366|ui-kosten-schnellwahl.py|/tmp/cfp-kosten-schnellwahl.log
UI-Arbeitszeit am Tag (eigene Summe je Auftrag, Rest bis 24 h, Doppel-Warnung), DE/UK/EN 390/820/1366|ui-arbeitszeit-tag.py|/tmp/cfp-arbeitszeit-tag.log
UI-Fahrzeugtausch unterwegs: Hinweis „nicht dir zugeordnet“ in Kontrolle/Meldung, Zuordnung des Melders im Vorgang (Leitung), DE/UK/EN 390/820/1366|ui-fahrzeugtausch.py|/tmp/cfp-fahrzeugtausch.log
UI-Werkstatt ohne Schlüssel/Fahrzeugschein: „fehlt“ im Vorgang, Vorgangsliste, Werkstattplan, DE/UK/EN 390/820/1366|ui-werkstatt-schluessel.py|/tmp/cfp-werkstatt-schluessel.log
UI-Abholung nach der Reparatur: Abholvermerk Werkstatt → Freigabe → Fahrerhinweis, Vorgang/Fahrzeugakte, DE/UK/EN 390/820/1366|ui-abholung.py|/tmp/cfp-abholung.log
UI-Teilefoto: Foto/PDF zum Teil (Typenschild) im Formular, Teileliste mit Link, DE/UK/EN 390/820/1366|ui-teilefoto.py|/tmp/cfp-teilefoto.log
UI-Notfall-Bereitschaft: Erreichbarkeit je Rufnummer, „jetzt erreichbar/nicht besetzt“, Sortierung, Hinweis alle nicht besetzt, Pflegeformular, DE/UK/EN 390/820/1366|ui-notfall-bereitschaft.py|/tmp/cfp-notfall-bereitschaft.log
UI-Notfall-Wochenende: zwei Zeitspannen je Rufnummer (Fr 18 – Mo 06), Anzeige, Formular, Meldung bei Unvollständigem, Bundesland-Feiertage, DE/UK/EN 390/820/1366|ui-notfall-wochenende.py|/tmp/cfp-notfall-wochenende.log
UI-Notfall-Zeitzone: Gerät im Ausland (andere Zeitzone) – Hinweis „deutsche Zeit“ mit beiden Uhrzeiten, „wieder ab“ mit Gerätezeit; gleiche Zeit ohne Hinweis, DE/UK/EN 390/820/1366|ui-notfall-zeitzone.py|/tmp/cfp-notfall-zeitzone.log
UI-Notfall-Feiertage: Feiertage der nächsten 60 Tage ohne besetzte Nummer in „Rufnummern pflegen“, DE/UK/EN 390/820/1366|ui-notfall-feiertage.py|/tmp/cfp-notfall-feiertage.log
UI-HU-Mängel: Hinweis zum Fälligkeitsfeld je Prüfergebnis, Hinweis geringe Mängel in der Akte, DE/UK/EN 390/820/1366|ui-hu-maengel.py|/tmp/cfp-hu-maengel.log
UI-Tachograph ungeklärt: Fahrer sieht Fahrtenschreiber ohne Termin als „Frist ungeklärt“, Hinweis beim Anlegen nur bei Tachograph, DE 390/UK 820/EN 1366|ui-tacho-ungeklaert.py|/tmp/cfp-tacho-ungeklaert.log
UI-Dublette Gespann: Meldeformular zeigt Mängel des gekoppelten Aufliegers, Hinweis Gespannteil beim Ablehnen, Meldezeit der Dublette im Original, DE 390/UK 820/EN 1366|ui-dublette-gespann.py|/tmp/cfp-dublette-gespann.log
UI-Hinweis zum Termin: Leitung setzt Termin mit Hinweis („nur vormittags“), Vorgang/Verlauf/Werkstattplan und Disposition (Geplante Termine, Nicht einplanen) zeigen ihn, DE 390/UK 820/EN 1366|ui-termin-hinweis.py|/tmp/cfp-termin-hinweis.log
UI-Suche nach Rechnung/Teil: Leitung findet den Vorgang über Rechnungsnummer (Liste) und Lieferant (Lupe), Werkstatt über die Teilenummer, nicht über die Rechnung, DE 390/UK 820/EN 1366|ui-suche-rechnung.py|/tmp/cfp-suche-rechnung.log
UI-Teile-Verwendung (Rückruf): Leitung findet über Lager und Artikelakte „Wo verbaut?“ den Einbau per Teilenummer in anderer Schreibweise, Werkstatt anderer Standort nichts, DE 390/UK 820/EN 1366|ui-teileverwendung.py|/tmp/cfp-teileverwendung.log
UI-Wareneingang: Werkstatt bucht eine Lieferung mit zwei Positionen (Lieferant/Lieferschein einmal), Pflichtmenge, doppelter Artikel abgewiesen, DE 390/UK 820/EN 1366|ui-wareneingang.py|/tmp/cfp-wareneingang.log
UI-Wareneingang: wartende Aufträge der Werkstatt mit Vermerk, passender (Teilenummer) oben gekennzeichnet, DE 390/UK 820/EN 1366|ui-wareneingang-wartend.py|/tmp/cfp-wareneingang-wartend.log
UI-Standort mit Stand: Werkstatt trägt Standort ein, Vorgang/Werkstattplan/Akte/Disposition nennen „Stand …“, Hilfe Disposition, DE 390/UK 820/EN 1366|ui-standort-stand.py|/tmp/cfp-standort-stand.log
UI-Mehrere Hinweise im Meldeformular: wichtigster offen, weitere aufklappbar|ui-hinweise-gruppiert.py|/tmp/cfp-hinweise-gruppiert.log
UI-Fahrtenschreiber-Hinweis in der Abfahrtskontrolle|ui-abfahrt-fahrtenschreiber.py|/tmp/cfp-abfahrt-fahrtenschreiber.log
UI-Panne im Ausland: Nummern mit +49, Hinweis Inlandsformat, Hilfe|ui-ausland-nummern.py|/tmp/cfp-ausland-nummern.log
UI-Abschleppung: Standort/Abschleppdienst im Vorgang, Liste, Disposition, Hilfe|ui-abschleppung.py|/tmp/cfp-abschleppung.log
UI-Fotos im Vorgang: Zeitpunkt/Rolle/Name je Datei, Auswahl ohne Kamera-Zwang|ui-fotos-herkunft.py|/tmp/cfp-fotos-herkunft.log
UI-Fremdleistung mit Beleg: Kostenvoranschlag-PDF wählen, Link, Kostenfreigabe listet Belege|ui-fremdbeleg.py|/tmp/cfp-fremdbeleg.log
UI-Handywechsel: Push-Gerät ohne Anmeldung abmelden, Kontosprache auf der Anmeldeseite|ui-handywechsel.py|/tmp/cfp-handywechsel.log
UI-Diktat auf Ukrainisch/Russisch: Unfall-Hinweis ohne Warnblinker, change, lang= am Freitext|ui-diktat-ukrainisch.py|/tmp/cfp-diktat-ukrainisch.log
UI-Ersatzfahrzeug (Disposition): Prüfstand des gekoppelten Anhängers an der Lkw-Zeile, Sperrgrund auf der Tafel|ui-ersatzfahrzeug.py|/tmp/cfp-ersatzfahrzeug.log
UI-Lager zwei Aufträge (Werkstatt): Abweisung am letzten Lagerteil aktualisiert die Auswahl, Übernahme ins Freitextteil|ui-lager-zwei-auftraege.py|/tmp/cfp-lager-zwei-auftraege.log
UI-Doppelte Rechnung (Fremdleistung): Fundstelle, Häkchen „Trotzdem buchen“, neue Nummer entfernt den Hinweis|ui-doppelte-rechnung.py|/tmp/cfp-doppelte-rechnung.log
UI-Sammeltermin (Prüftermine): mehrere UVV an einem Tag, Absprache nicht still ersetzt, Rollen|ui-sammeltermin.py|/tmp/cfp-sammeltermin.log
UI-Heute zu tun nach dem Urlaub: Kostenfreigaben älteste zuerst, „+N“ führt zur gefilterten Vorgangsliste|ui-heute-zu-tun-urlaub.py|/tmp/cfp-heute-zu-tun-urlaub.log
UI-Bußgeld ändern (Frist), deaktivierter Kandidat, Umgebung|ui-bussgeld-aendern.py|/tmp/cfp-bussgeld-aendern.log
UI-Bußgeld Befund-Link, Zurücksetzen auf Eingegangen|ui-bussgeld-befundlink.py|/tmp/cfp-bussgeld-befundlink.log
UI-Bußgeld-Verlauf mit Fahrernamen, Kandidat-Nachweis übersetzt, berechnete SP beim Fahrer, Reifenverlauf|ui-bussgeld-verlauf-sp-fahrer.py|/tmp/cfp-bussgeld-verlauf-sp-fahrer.log
UI-Dokumentangaben korrigieren|ui-dokument-korrigieren.py|/tmp/cfp-dokument-korrigieren.log
UI-Dokument-Gültigkeit (Chips), Dublette mit anderen Angaben öffnet Korrektur|ui-dokument-status.py|/tmp/cfp-dokument-status.log
UI-Wiedervorlage behält Vermerk, Suche findet außer Betrieb, Chip-Zeilen 390 px|ui-wiedervorlage-suche.py|/tmp/cfp-wiedervorlage-suche.log
UI-Fahrzeugimport-Art/-Spalten, Versicherungsfall unvollständig, EN-Dezimalpunkt|ui-import-lager-versicherung.py|/tmp/cfp-import-lager-versicherung.log
UI-Fahrerakte: Nachweise gestapelt, App-Konto verknüpfen, nur freie Konten|ui-fahrerakte-konto.py|/tmp/cfp-fahrerakte-konto.log
UI-Offline-Postausgang (Fotos, Wiederholung, keine Verluste)|ui-postausgang.py|/tmp/cfp-postausgang.log
UI-Offline-Postausgang abgewiesen (sichtbar, erneut senden, verwerfen)|ui-postausgang-abgewiesen.py|/tmp/cfp-postausgang-abgewiesen.log
UI-Konflikt-Meldungen in der Sprache|ui-konfliktsprache.py|/tmp/cfp-konfliktsprache.log
UI-Artikel-Stammdaten bearbeiten|ui-artikel-bearbeiten.py|/tmp/cfp-artikel-bearbeiten.log
UI-Dokumentsprache (html lang)|ui-html-lang.py|/tmp/cfp-htmllang.log
UI-Start-Wächter (gemischte Module nach Deployment)|ui-startwaechter.py|/tmp/cfp-startwaechter.log
UI-Langsames Netz (Seitenwechsel beim Hochladen, Fotos am Vorgang, Lagerbuchung)|ui-netz-seitenwechsel.py|/tmp/cfp-netz-seitenwechsel.log
UI-Zwei Tabs (Abmelden/Personenwechsel, Meldung bei abgelaufener Anmeldung)|ui-tabs-anmeldung.py|/tmp/cfp-tabs-anmeldung.log
UI-Kleines Handy 320 px und große Schrift (Kontrolle, Tabbar, Kopfzeile)|ui-kleines-handy.py|/tmp/cfp-kleines-handy.log
UI-Hinweis öffnet Gegenstand (Fahrzeugakte)|ui-hinweis-ziel.py|/tmp/cfp-hinweisziel.log
UI-Ausfallzeit + Dauer je Status (> 48 h)|ui-kpi-ausfall.py|/tmp/cfp-kpiausfall.log
UI-Pluralformen (Zähltexte je Sprache)|ui-pluralformen.py|/tmp/cfp-pluralformen.log
UI-Technische Verfügbarkeit (Kennzahlen)|ui-kpi-verfuegbarkeit.py|/tmp/cfp-kpiverf.log
UI-Fahrleistung je Monat (Fahrzeugakte)|ui-fahrleistung.py|/tmp/cfp-fahrleistung.log
UI-Kosten je km (Regel Fahrleistung)|ui-kosten-km.py|/tmp/cfp-kostenkm.log
UI-km-Zähler gesunken (Tachotausch)|ui-tachotausch.py|/tmp/cfp-tachotausch.log
UI-Werkstattplan nach Tachotausch|ui-plan-tachotausch.py|/tmp/cfp-plan-tachotausch.log
UI-Einladung ungültig, Datenqualität-Link Akte, Offline-Fahrzeugliste|ui-einladung-dqlink.py|/tmp/cfp-einladung-dqlink.log
UI-Fahrzeug-CSV nach Auswahl, Druckkopf ohne Standort|ui-fahrzeug-csv-auswahl.py|/tmp/cfp-fahrzeug-csv-auswahl.log
UI-Fahrerakte Klassen, unbenannte Unterweisung, Notfall zurück zur Akte|ui-fahrerakte-klassen-notfall.py|/tmp/cfp-fahrerakte-klassen-notfall.log
UI-Reaktionsfrist kritisch sofort, Benutzer nach Aktivieren, Hilfe Zugänge|ui-reaktionsfrist-benutzer.py|/tmp/cfp-reaktionsfrist-benutzer.log
UI-Bußgeld mehrdeutiges Kennzeichen, Vertrag km unter Übernahme|ui-bussgeld-mehrdeutig-vertrag.py|/tmp/cfp-bussgeld-mehrdeutig-vertrag.log
UI-Großer Bestand: Lagerjournal-Karten, Lagersuche entprellt, QR-Bogen|ui-grossbestand-lager.py|/tmp/cfp-grossbestand.log
'
N=0
NL='
'
OLDIFS=$IFS; IFS=$NL; set -f
for zeile in $UI_SKRIPTE; do
  name=${zeile%%|*}; rest=${zeile#*|}; skript=${rest%%|*}; log=${rest#*|}
  if [ -n "$NUR" ]; then case "$skript" in *"$NUR"*) ;; *) continue ;; esac; fi
  if [ -n "$AB" ]; then case "$skript" in *"$AB"*) AB= ;; *) continue ;; esac; fi
  step "$name"; sh scripts/restart-dev.sh > /dev/null
  python3 "scripts/$skript" > "$log" 2>&1 || { tail -20 "$log"; fail "$name"; }; tail -1 "$log"; N=$((N + 1))
done
IFS=$OLDIFS; set +f
[ -z "$NUR" ] || [ "$N" -gt 0 ] || fail "kein UI-Skript passt zu „$NUR“"
[ -z "$AB" ] || fail "kein UI-Skript passt zu „$AB“ (--ab)"
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
    step "UI-Rauchtest lange Wörter (Handy)"; run_smoke CFP_LONGWORD=1
    step "Zeitreise"; sh scripts/zeitreise-test.sh > /tmp/cfp-zeit.log 2>&1 || { cat /tmp/cfp-zeit.log; fail "Zeitreise"; }; echo "8 Zeitpunkte grün"
    step "UI-Zeitreise"; sh scripts/ui-zeitreise.sh > /tmp/cfp-uizeit.log 2>&1 || { grep -v ' grün$' /tmp/cfp-uizeit.log | tail -30; fail "UI-Zeitreise"; }; echo "4 Zeitpunkte grün"
  fi
fi
echo "Alles grün ($N UI-Skripte)."
