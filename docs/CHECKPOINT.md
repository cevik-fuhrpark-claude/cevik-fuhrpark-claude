# [CLAUDE] CEVIK Fuhrpark – Projektstand (CHECKPOINT)

Diese Datei ist der verbindliche Wiederaufnahmepunkt für jede neue Entwicklungssitzung.
Zuerst lesen, dann `npm test` ausführen, dann den nächsten offenen Punkt aus „Backlog“ bearbeiten.

## Auftrag (Kurzfassung)
Eigenständiges Konkurrenzprojekt zum ChatGPT-Fuhrparkportal (Auftraggeber: Yilmaz Cevik, Cevik Mobility GmbH).
Nur Fuhrparkmanagement. Das ChatGPT-Projekt, dessen n8n-Workflows und die bestehenden Google Sheets **nicht verändern**.
Alles von Claude trägt das Präfix **[CLAUDE]**. Grundlagen: `docs/` (Anforderungen) und die Projektdokumentation vom 10.10.2026.

## Freigaben des Auftraggebers (10.10.2026)
- Erteilt: Cloudflare einrichten (kostenlos), GitHub↔Cloudflare-Deployment, geplante Entwicklungssitzungen,
  Postfächer fuhrpark@, dispo.bayern@, dispo@, y.cevik@ **lesend** auswerten.
- Zustimmung weiterhin nötig für: kostenpflichtige Dienste, Änderungen an produktiven Systemen (ChatGPT-Portal, n8n, Sheets),
  Löschen/Ändern produktiver Daten, Rechte auf sensible Daten, **Produktivschaltung** (echte Mitarbeiterkonten, echter Versand).
- GPS-Anbindung: „später entscheiden“. Vorbereitet ist die Integrations-API (`/api/integration/v1/telematics`).

## Infrastruktur
| Baustein | Wert |
|---|---|
| Repository | github.com/cevik-fuhrpark-claude/cevik-fuhrpark-claude (privat) |
| Cloudflare-Konto | y.cevik@cevik-mobility.de, Account-ID 0170889e91884f3c089f67b8518dd9b3 |
| Worker | `cevik-fuhrpark-claude` (Workers Builds, Auto-Deploy bei Push auf `main`) |
| D1 | `cevik-fuhrpark-claude-db`, ID 7b907fcf-5f11-4300-9091-f915179bd365, Jurisdiktion EU |
| KV (Dateien) | `cevik-fuhrpark-claude-files`, ID ed9ee50f6c09411d8b1be0711de32300, Jurisdiktion EU |
| Workers AI | Binding `AI` (KI-Vorschläge zur Schadenshistorie) |
| Cron | alle 15 Min.: Fuhrparkagent (Test + Betrieb), Push-Wiederholung, Sitzungsbereinigung |
| Secrets | `SETUP_CODE` (Ersteinrichtung), optional `INTEGRATION_TOKEN`, optional `VAPID_PRIVATE_JWK` |

Schema-Migration läuft automatisch beim ersten Request (`src/schema.js` wird aus `migrations/*.sql` erzeugt: `npm run build`).
**Neue Migrationen nur als neue Datei `migrations/000N_*.sql` anlegen**, nie bestehende ändern, sobald produktiv.

## Architektur
- `src/worker.js` – Router, CSRF-Schutz (Header `x-cfp: 1` + Origin), Sicherheitsheader, Selbstmigration, Cron.
- `src/auth.js` – Einladung → eigenes Passwort (PBKDF2), Sitzungscookie, Sperre nach 8 Fehlversuchen, Rollen
  owner/fleet/workshop/dispatch/driver/viewer, **Umgebung test/production serverseitig je Benutzer**.
- `src/cases.js` – Vorgänge als Befehle mit Version + Idempotenz (`command_id`), atomarer Versions-Guard (`cmd_guard`),
  Prioritäten niedrig/mittel/kritisch, Sicherheitssperre getrennt von Priorität, Werkstatt-Übernahme, Stunden/Teile/Fremdleistungen,
  Restarbeiten (sicherheitsrelevant blockiert Abschluss), Pflicht-Kontrolle nach Reparatur (18 Punkte), Mängel → Folgeaufträge,
  Dateien (JPG/PNG/WEBP/PDF, 5 MB, 10 je Vorgang, Magic-Bytes-Prüfung), Kosten (fehlender Satz/Preis = unbewertet, nie 0 €).
- `src/notify.js` + `src/push.js` – Empfängerlogik je Ereignis, Web-Push (VAPID + RFC 8291) ohne Bibliothek,
  Zustände: gespeichert → vom Dienst angenommen → am Gerät empfangen → geöffnet → gesehen/übernommen.
- `src/agent.js` – Fuhrparkagent (regelbasiert): Befunde, idempotente Übergabe an Master-Eingang, Management-Panel.
  Keine erfundenen Fristen: Fristen nur aus Einstellungen (`sla_<env>_<triage|ack>_<prio>_min`).
- `src/vehicles.js` – Fahrzeugakte, CSV-Import, Fahrerzuordnung mit Historie, Wartung/Prüftermine mit Pflicht-Nachweis,
  Kilometerstände, KI-Analyse.
- `src/integration.js` – Bearer-API für Unternehmensbetriebssystem/n8n (siehe `docs/API.md`).
- `public/` – PWA ohne Framework, DE/UK/EN, Service Worker mit Push-Quittung.

## Tests
`npm test` → 78 automatisierte Abnahmetests (T02–T18 der Projektdokumentation + Sicherheit). Lokaler UI-Server:
`node --experimental-sqlite scripts/dev-server.mjs` (Port 8787, In-Memory-DB).

## Stand 10.10.2026
- [x] Backend vollständig für Schaden → Werkstatt → Kontrolle → Freigabe, inkl. Rollen, Test/Betrieb, Push, Agent, Master-Panel
- [x] Oberfläche mobil/Tablet/PC, drei Sprachen
- [x] 30/30 Tests grün, UI per Headless-Browser geprüft
- [x] Cloudflare D1/KV angelegt, GitHub verbunden, erster Build gestartet
- [x] Erster Deploy verifiziert (https://cevik-fuhrpark-claude.y-cevik.workers.dev), D1-Migration live, Secret `SETUP_CODE` gesetzt
- [ ] Inhaber-Konto durch Auftraggeber anlegen (Ersteinrichtung), dann Fahrzeugstamm (38 LKW) importieren
- [ ] Testkonten Fahrer/Fuhrparkleitung/Werkstatt anlegen; Einladungslinks an Auftraggeber

## Erledigt seit Erststand
- [x] Reifenmanagement (Migration 0002): Reifengrößen je Achse mit Prüfstatus (Import `seed/reifen_quelldaten.csv` aus Drive-Datei „Fuhrpark Cevik Mobility GmbH Dortmund (1).xlsx“, nur FIN-Treffer, geprüfte Werte bleiben), Messung/Wechsel/Reparatur/Sichtprüfung je Position, gesetzliches Mindestprofil 1,6 mm (StVZO § 36) → Agent-Befund `TIRE_BELOW_MINIMUM`, optionale Warnschwelle `tire_warn_tread_mm`. 33 Tests grün.
- [x] Ersatzteillager (Migration 0003): Artikel je Werkstatt, Zugang/Entnahme/Korrektur (Korrektur mit Grund), kein negativer Bestand, Entnahme direkt im Vorgang (`add_part` mit `stock_item_id`, Preis aus Lager), Mindestbestand → Agent-Hinweis `STOCK_BELOW_MIN` (keine automatische Bestellung). 36 Tests grün.
- [x] Bußgelder, Anhörungen & Zeugenfragebögen (Migration 0004): Schreiben erfassen (Kennzeichen → Fahrzeug, doppeltes Aktenzeichen abgewiesen), Fahrerkandidaten zum Tatzeitpunkt aus Fahrzeugzuordnung und Abfahrtskontrollen, Bestätigung nur mit Nachweis, Fahrer informieren (Push) und Kenntnisnahme, Status mit Begründung, Schreiben als PDF/Foto anhängen (nur Fuhrpark und betroffener Fahrer lesen). Fristen ausschließlich laut Schreiben; Agent-Befunde `FINE_OVERDUE`, `FINE_DUE_SOON` (Vorlauf `fine_warn_days`), `FINE_VEHICLE_UNKNOWN`, `FINE_DRIVER_OPEN`. 40 Tests grün, UI mobil geprüft.
- [x] Kosten je Fahrzeug/Monat: Bericht und CSV-Export (Excel-tauglich) in der App unter Mehr → „Kosten je Fahrzeug“, Integrationsendpunkt `/v1/costs`. Gleiche Regeln wie die Vorgangsbewertung (unbewertet ≠ 0 €, Schätzungen getrennt, keine Doppelzählung bei Fremdleistung); Test prüft Summengleichheit. 41 Tests grün.
- [x] Lasttest & Abfragebudget: `scripts/lasttest.mjs` (150 Lkw / 3000 Vorgänge, synthetisch, nur Arbeitsspeicher). Agent, Importe, Push-Zustellung, Fahrzeugakte auf Sammelabfragen umgestellt (Agent ≈ 33 statt ≈ 9000 Abfragen); Cron getrennt für Betrieb (`*/15`) und Test (`7,37`); Test „jeder API-Aufruf ≤ 50 D1-Abfragen“.
- [x] Datensicherung: Inhaber-Download (JSON, ohne Geheimnisse) unter Einstellungen; Wiederherstellung per D1 Time Travel in `docs/BETRIEB.md`. 43 Tests grün.

- [x] Prüftermine (Migration 0005, nur Indizes): Übersicht über alle Fahrzeuge unter Mehr → „Prüftermine“ (überfällig / bald fällig / alle / Lückenliste HU·SP·UVV·Tachograph ohne Termin), CSV-Export, Integrationsendpunkt `/v1/maintenance`. CSV-Import mit Vorschau (`dry_run`), Nachweis je Zeile Pflicht, Zuordnung FIN bzw. eindeutiges Kennzeichen, Plakette MM/JJJJ → Monatsende (vermerkt), spätere vorhandene Termine werden nie überschrieben, idempotent. 45 Tests grün, UI 390 px/Tablet/PC geprüft.
- [x] Anhänger als eigene Prüfobjekte (Migration 0006: `vehicles.kind` lkw/anhaenger): Import mit Spalte „Fahrzeugart“ (Lkw/Anhänger/KFZ/ANH) und „Quelle“, Kopplung Lkw↔Anhänger laut Stammliste (Spalte „Anhänger Kennzeichen“) in Liste und Fahrzeugakte, Filter Lkw/Anhänger, Lückenliste für Anhänger nur HU/SP, Integrations-API liefert `kind`. Pflege ohne Fahrzeugart lässt die Art unverändert. 46 Tests grün, UI 390 px/Tablet/PC geprüft (Kennzeichen in Listen werden nicht mehr abgeschnitten, Nachweis in der Fahrzeugakte als eigene Zeile).
- [x] Belegte Daten vorbereitet (nur Dateien im Repository, nichts produktiv eingespielt): `seed/anhaenger_belegt.csv` (23 Anhänger mit FIN von TÜV-NORD-Rechnungen „ANH“ bzw. KÜS-Rechnungen + Anhängerkennzeichen der Stammliste), `seed/prueftermine_belegt.csv` (61 Zeilen: 29 Lkw + 32 Anhänger, je letzte HU/SP/Tacho). Trockenlauf gegen Stammliste: 61 übernehmbar, 2 Prüffälle (SZ-YC 5548 FIN-Abweichung). **Einspiel-Reihenfolge nach Ersteinrichtung:** Stammliste → Anhänger (Einstellungen → Fahrzeugstamm importieren) → Prüftermine (Mehr → Prüftermine, Vorschau prüfen, Übernehmen).
- [x] Fahrzeug-Stammdaten in der App: „Fahrzeug anlegen“ (Liste) und „Stammdaten bearbeiten“ (Fahrzeugakte) für Inhaber/Fuhrparkleitung; „Außer Betrieb nehmen“ mit Pflichtgrund (nur ohne offene Vorgänge, Audit-Log), Liste „Außer Betrieb“, Reaktivieren. Hinweis: ein erneuter Stammlisten-Import aktiviert enthaltene Fahrzeuge wieder. 46 Tests grün.
- [x] Ruhige Sammel-Erinnerung des Fuhrparkagenten: neue Befunde `MAINTENANCE_DUE/OVERDUE`, `FINE_DUE_SOON/OVERDUE` erzeugen je Lauf **eine** nicht dringende Benachrichtigung an Fuhrparkleitung/Inhaber („2× Prüftermin bald fällig, 1× …“, ohne Kennzeichen/Details im Push-Text); unveränderte Befunde lösen keine Wiederholung aus. 46 Tests grün, Abfragebudget Agent ≤ 31.
- [x] Barrierefreiheit: alle Formularfelder programmatisch beschriftet (automatische Verknüpfung Label↔Feld, aria-label für Tabellen-/Dateifelder), Sprunglink „Zum Inhalt springen“, benannte Hauptnavigation; geprüft auf 15 Ansichten (0 unbeschriftete Felder). Neuer statischer Test: keine Inline-Handler (CSP) und vollständige DE/UK/EN-Texte. 47 Tests grün.
- [x] Kontrast „mittel“-Farbe auf WCAG AA angehoben (5:1), Fokus nach Seitenwechsel auf die Überschrift, Druckansicht/PDF der Fahrzeugakte (Button „Drucken / PDF“, ohne Navigation/Formulare, mit Ausdruckvermerk). 47 Tests grün.
- [x] Offline-Ausgang für Schadensmeldungen: bricht die Verbindung beim Senden ab, wird die Meldung nur auf dem Gerät (je Benutzer/Umgebung) gespeichert und automatisch mit demselben `request_key` nachgesendet (Server legt sie höchstens einmal an); bei „kritisch“/„nicht fahrbereit“ Hinweis auf zusätzlichen Anruf bei der Disposition; Fahrzeugliste für das Formular wird lokal vorgehalten. Mit Playwright offline→online geprüft (genau 1 Vorgang). Gleiches gilt für die Abfahrtskontrolle (serverseitig bereits idempotent über `request_key`, Folgeaufträge ebenfalls).
- [x] Kennzahlen Instandhaltung (Mehr → „Kennzahlen Instandhaltung“, `GET /api/reports/kpi?from=&to=`): je Priorität Anzahl/freigegeben/offen, Median und P90 für Erstbewertung, Werkstatt-Übernahme, Meldung→Freigabe, Teile-Wartezeit aus dem Ereignisprotokoll; Werkstattzeit je Fahrzeug. Nur gespeicherte Zeitstempel, nichts geschätzt. 48 Tests grün.
- [x] Prüftermine als Kalenderdatei (`/api/maintenance?format=ics`, Button „Kalender (.ics)“): ganztägige Termine mit Erinnerung (Vorlauf = Vorwarnung Tage), RFC-5545-Faltung; nur belegte Termine. 48 Tests grün.
- [x] Werkstatt-Tagesübersicht auf der Startseite (Werkstattrolle): Aufträge des eigenen Standorts nach Arbeitsschritt (neu/übernehmen, übernommen, in Reparatur, wartet auf Teile, Abschlusskontrolle, Vorab-Info) plus Prüftermine ≤ 14 Tage. Listen auf dem Handy: Titel in voller Breite (2 Zeilen) statt abgeschnitten.
- [x] Fotos direkt beim Melden: bis zu 10 Bilder im Meldeformular, nach dem Anlegen automatisch komprimiert hochgeladen (Fortschritt im Button, Fehlschläge werden gemeldet; Dubletten serverseitig per SHA-256 abgefangen). Ohne Verbindung: Hinweis, Fotos später im Vorgang anzuhängen.
- [x] Protokoll für den Inhaber (Migration 0007, Index): Mehr → „Protokoll“ / `GET /api/admin/audit?action=&before=&limit=`; neu protokolliert: Anmeldung, Kontosperre nach Fehlversuchen, Passwortänderung. Filter nach Bereich, Blättern, keine Geheimnisse in Details. 49 Tests grün.
- [x] Hilfe-Seite (Mehr → „Hilfe“, Link auf der Fahrer-Startseite) in DE/UK/EN: Schaden melden, Dringlichkeit, Abfahrtskontrolle, Push (inkl. iPhone), Verhalten ohne Netz.
- [x] Mengenbegrenzung (Migration 0008 `rate_limits`): je Benutzer max. 60 Datei-Uploads/10 Min. und 20 Importe/Std., sonst HTTP 429 mit verständlicher Meldung; eine atomare Abfrage je Aufruf.
- [x] Reifen über die Flotte (Mehr → „Reifen – Flotte“, `GET /api/tires/fleet?stale_days=90`): je Fahrzeug schlechtester Status, kleinste Profiltiefe, Anzahl Positionen unter Minimum, älteste Messung; Filter unter Minimum/Warnung, veraltet, nie gemessen. Nur gemessene Werte. 50 Tests grün.
- [x] Dokumentablage je Fahrzeug (Migration 0009: `files.vehicle_id/doc_kind/doc_note`): Fahrzeugakte → „Dokumente“ (Zulassung, Prüfbericht, Rechnung, Versicherung, Leasing/Miete, Foto, Sonstiges), Upload Inhaber/Fuhrparkleitung/Werkstatt, Lesen auch Dispo/Lesezugriff, nicht Fahrer; Typprüfung, 5 MB, 30 je Fahrzeug, Dubletten erkannt, Audit-Log; Datei-Links berücksichtigen die Test/Betrieb-Ansicht des Inhabers. 51 Tests grün.
- [x] Vorgangssuche (`GET /api/cases?q=`): Beschreibung, Vorgangsnummer, Kennzeichen auch ohne Leerzeichen/Bindestrich; Rollenfilter bleiben, SQL-Platzhalter wirkungslos; Suchfeld in „Vorgänge“ (300 ms Verzögerung). 52 Tests grün.
- [x] Gültig-bis an Fahrzeugdokumenten (Migration 0010): optionales Datum „nur wenn im Dokument angegeben“; Agent-Befunde `DOCUMENT_EXPIRES_SOON`/`DOCUMENT_EXPIRED` je Fahrzeug+Dokumentart (neueres Dokument ersetzt älteres), in der ruhigen Sammel-Erinnerung enthalten. Bugfix: Bemerkung wurde doppelt dekodiert (`%` brach den Upload). 52 Tests grün, Agent ≤ 32 Abfragen.
- [x] Fotos im Offline-Ausgang: bei Funkloch werden bis zu 10 komprimierte Fotos in IndexedDB gespeichert und nach dem Nachsenden der Meldung automatisch angehängt, danach gelöscht (Playwright offline→online: 1 Vorgang, 2 Fotos).
- [x] Leistung: Kostenbericht/Kennzahlen 20× schneller (Intl-Datumsformat zwischengespeichert – wichtig für das CPU-Budget je Worker-Aufruf); Lasttest um Kennzahlen, Prüftermine, Reifen-Flotte, Suche erweitert (`docs/BETRIEB.md`).
- [x] Fuhrparkagent-Profil (`scripts/agentprofil.mjs`): Befundtexte mit Zeitpunkt statt laufender Minuten, unveränderte Befunde werden nicht neu geschrieben (Folgelauf bei 3000 Vorgängen: 2 statt 3053 geschriebene Zeilen, ≈ 150 statt ≈ 320 ms), Fingerabdrücke gesammelt berechnet, schnellere Hex-Umwandlung; Panel zeigt „offen seit“, Folgetext umbricht auf dem Handy. 53 Tests grün.
- [x] Management-Panel auf dem Handy: Vorgangstabelle als Karten (allgemeine Klasse `table.stack`, Spaltenüberschrift je Zelle automatisch), Vorgangsnummer ohne Umbruch, Entscheidungs-Links „Gesehen/Erledigt“ werden nicht mehr abgeschnitten (Tablet). Geprüft 390 px/Tablet/PC.
- [x] Nutzungsstatistik ohne Personenbezug (Migration 0012 `usage_daily`): Zähler je Tag/Umgebung/Funktionspfad inkl. Fehler (Status ≥ 400), keine Person/Rolle/IP; Inhaber-Ansicht Mehr → „Nutzung der App“ (7/30/90/365 Tage, Bereiche, Tagesbalken, Einzelfunktionen), `GET /api/admin/usage`; Vorgangs- und Bußgeldbefehle je Aktion (`POST cases/:id/commands:receive`, nur bekannte Befehlsnamen). 55 Tests grün, UI 390 px/Tablet/PC geprüft.
- [x] Meine Anmeldungen (Mehr → Mein Konto): eigene aktive Sitzungen mit Gerät (aus Browser-Kennung), zuletzt aktiv, einzeln oder alle anderen abmelden; fremde Sitzungen nicht erreichbar, im Protokoll (`session.revoke`, `session.revoke_others`). Datenschutz-Entwurf `docs/DATENSCHUTZ_ENTWURF.md` zur Prüfung. 56 Tests grün.
- [x] Zeitleiste der Fahrzeugakte (Button „Zeitleiste“ in der Akte, `GET /api/vehicles/<id>/timeline`): Meldungen, Abschlüsse, Kontrollen, km-Stände, Fahrerzuordnungen, Dokumente, Reifen, erledigte Prüfungen, Bußgelder (nur Fuhrpark/Inhaber) – neueste zuerst, Filter je Bereich; nur gespeicherte Daten. 57 Tests grün, UI 390 px/Tablet/PC geprüft.
- [x] Kilometerstände (Migration 0013: `odometer_readings.note`, Index): Ablesedatum nachträglich erfassbar (nicht Zukunft), Plausibilität gegen den zeitlich vorherigen **und** nächsten Wert – Abweichung nur mit Begründung (z. B. Tachotausch), sonst 409; Doppelerfassung gleicher Tag/Rolle abgewiesen; Begründung in Zeitleiste sichtbar. 58 Tests grün, UI 390 px geprüft.
- [x] Prüfungen/Wartung nach Kilometern: `interval_km` + `last_done_km` werden ausgewertet (fällig bei, Rest-km aus letztem km-Stand), Status = strengerer aus Datum/km, überfällige zuerst, CSV-Spalten, Agent-Befunde (Subjekt `<regel>|km`, in Sammel-Erinnerung), Vorwarnung nur bei eingestellter Schwelle `maintenance_warn_km` (Einstellungen), Erledigen einer km-Regel nur mit km-Stand. Formular „Termin/Regel hinzufügen“ um km-Felder ergänzt. 59 Tests grün, UI 390 px/PC geprüft.
- [x] Wartungshistorie (Migration 0014 `maintenance_events`, Übernahme der bisherigen letzten Durchführungen als „bestand“): jede Durchführung (erfasst, erledigt, Import) bleibt erhalten, gleiche Regel+Datum nur einmal; Fahrzeugakte „Bisherige Durchführungen“, Zeitleiste, Sicherung. 60 Tests grün, UI 390 px geprüft.
- [x] Fahrerzuordnung: doppelte offene Zuordnung abgewiesen (409), Fahrzeugwechsel beendet auf Wunsch (Häkchen, Standard an) die bisherige Zuordnung, Beenden nur in eigener Umgebung (Sicherheitslücke Test↔Betrieb geschlossen), beides im Protokoll. Fahrer-Startseite „Mein Fahrzeug“ (`GET /api/me/vehicles`): Kennzeichen, Sperre („nicht fahren“), offene Meldungen, Anhänger, letzter km-Stand, nächste Prüftermine. 61 Tests grün, UI 390 px geprüft.
- [x] Meldeformular wählt bei genau einem zugeordneten Fahrzeug dieses vor. UI-Rauchtest `scripts/ui-rauchtest.py` (alle Ansichten × 4 Rollen × 3 Breiten = 153, prüft JS-Fehler, Fehlermeldungen, Überschrift, waagrechtes Scrollen): 0 Auffälligkeiten.
- [x] Datenqualität (Mehr → „Datenqualität“, Inhaber/Fuhrparkleitung, `GET /api/admin/data-quality`): doppelte Kennzeichen, Anhängerkennzeichen ohne Anhänger, Anhänger an mehreren Lkw, Zuordnung zu deaktivierten Fahrern, fehlender Standort/Hersteller/Baujahr, kein/veralteter km-Stand, Pflichtprüfung ohne Termin, offene Einladungen; ändert nichts. 62 Tests grün, UI-Rauchtest 159 Ansichten ohne Auffälligkeit.
- [x] Werkstatt-Auslastung (Mehr → „Werkstatt-Auslastung“, `GET /api/reports/workshop-load?weeks=`): je Standort und ISO-Kalenderwoche erfasste Stunden, übernommene/freigegebene Aufträge, aktuell offene je Status; Werkstattrolle sieht nur den eigenen Standort; **keine** Auswertung je Person. 63 Tests grün, UI-Rauchtest 168 Ansichten ohne Auffälligkeit.
- [x] Vorgangsliste als CSV (Button in „Vorgänge“, nicht für Fahrer): aktuelle Filter/Suche, gleiche Rollenrechte, Excel-tauglich (BOM, Semikolon), Formelschutz, Protokoll. 64 Tests grün.
- [x] Push-Einstellungen je Person (Migration 0015 `users.push_muted`; Hinweise → „Push für diese Hinweise“, `GET/PUT /api/me/notify-prefs`): 15 nicht dringende Ereignisarten abwählbar → Hinweis bleibt in der App, Push-Status `disabled`; dringende Hinweise und Sperre/Sicherheits-Restarbeit nie abschaltbar. 65 Tests grün, UI 390 px geprüft.
- [x] Integrations-API: Telematik-Einspeisung auf Sammelabfragen umgestellt (vorher bis zu 4 Abfragen je Eintrag → 500 Einträge hätten die D1-Grenze je Aufruf weit überschritten; jetzt 500 Einträge mit ≤ 10 Anweisungen, Test), Token-Wechsel ohne Ausfall (`INTEGRATION_TOKEN_NEXT`) und Nur-Lese-Token (`INTEGRATION_TOKEN_READ`), Mindestlänge 16. 65 Tests grün.
- [x] Telematik-Zuordnung (Mehr → „Telematik-Zuordnung“, Inhaber/Fuhrparkleitung; `GET /api/telematics`, `POST/DELETE /api/telematics/mappings`): Prüffälle ohne FIN/Mapping anzeigen, Zuordnung nur mit Nachweis bestätigen (Kennzeichen-Treffer nur als Hinweis, nicht vorausgewählt), Aufheben, Protokoll. Vorbereitung für die GPS-Entscheidung, keine Anbindung aktiviert. 66 Tests grün.
- [x] Fahrzeugakte zeigt letzten Telematik-Stand (Quelle FIN/Mapping, Zeitpunkt, km, Zündung, Position als OpenStreetMap-Link – keine eingebettete Karte) nur für Inhaber, Fuhrparkleitung, Disposition. 66 Tests grün.
- [x] Hilfe je Rolle erweitert (DE/UK/EN): Werkstatt (Auftrag → Abschlusskontrolle), Fuhrparkleitung (Meldungen, Kontrolle/Freigabe, Prüftermine/km/Datenqualität), Disposition (Sperren, Ausfälle). UI-Rauchtest 174 Ansichten ohne Auffälligkeit.
- [x] Lasttest um Zeitleiste, Datenqualität, Auslastung, Nutzungsstatistik, CSV-Export ergänzt (Ergebnisse in `docs/BETRIEB.md`); Zeitstempel-Formatierung ohne Intl je Wert (identische Ausgabe, über 3 Jahre inkl. Zeitumstellung geprüft). 66 Tests grün.
- [x] Sicherung: zusätzlich `telematics_unmatched` und Protokoll (`audit_log`); Liste bewusst ausgenommener Tabellen mit Begründung; Test vergleicht mit dem Schema, damit neue Tabellen nicht vergessen werden. 67 Tests grün.
- [x] Vorgang: „Dauer je Status“ aus dem Verlauf (nur gespeicherte Statuswechsel, aktueller Status bis jetzt) und Druckansicht/PDF (Werkstattauftrag) mit Ausdruckvermerk. 67 Tests grün, UI/Druck geprüft.
- [x] Ersatzteillager: Bestandsliste als CSV (Bestandswert nur mit hinterlegtem Preis) und Inventur je Lager (`POST /api/stock/inventory`, Vorschau `?dry_run=1`): Abweichungen werden als Korrektur mit Grund „Inventur <Datum>: gezählt X, Buchbestand Y“ gebucht, leere Felder = nicht gezählt, nur eigenes Lager, Protokoll. 68 Tests grün, UI 390 px geprüft.
- [x] UI-Rauchtest prüft zusätzlich Barrierefreiheit (unbeschriftete Felder, Bilder ohne alt, Schaltflächen/Links ohne Text; Prüfung selbst mit Negativbeispiel verifiziert): 174 Ansichten ohne Auffälligkeit.
- [x] Offline-Start für Fahrer: App startet im Funkloch mit zuletzt gespeichertem Konto (nur Anzeigedaten, keine Zugangsdaten; beim Abmelden/401 gelöscht), Startseite zeigt „Mein Fahrzeug“ aus dem Zwischenspeicher mit Stand-Hinweis, Meldungen gehen in den Offline-Ausgang und werden bei Netz gesendet (Playwright: kalter Start offline → Meldung → online → genau 1 Vorgang). Service-Worker-Cache v2.
- [x] Fahrzeugimport: **Fehler behoben** – fehlende Spalten/leere Zellen überschrieben bisher vorhandene Stammdaten mit leer (z. B. Modell, Hersteller, Standort beim Anhänger-Import); jetzt behalten sie den Bestand. CSV-Leser beachtet Anführungszeichen (Quelle mit „;“ wurde abgeschnitten). Vorschau vor dem Übernehmen (neu/geändert mit Feldern/unverändert, übersprungene Zeilen mit Zeilennummer), Spalte „Modell/Typ“. Abfahrtskontrolle offline mit Kaltstart geprüft (1 Kontrolle nach Wiederverbindung). 75 Tests grün.
- [x] Reifengrößen-Import: Vorschau (neu/geändert/unverändert, geprüft behalten, ohne Fahrzeug) vor dem Übernehmen, CSV-Leser mit Anführungszeichen. 75 Tests grün.
- [x] Bußgelder: CSV-Export (Fahrernamen nur auf ausdrücklichen Wunsch, nur Inhaber/Fuhrparkleitung, Protokoll) und Fristenkalender (.ics) offener Antwortfristen ohne Namen. **Fehler behoben:** Semikolons wurden in Kalenderdateien nicht maskiert (RFC 5545) – gemeinsame ICS-Funktion in `util.js`, Test. 76 Tests grün.
- [x] Fahrzeugliste: Filter nach Verfügbarkeit (gesperrt/Werkstatt/Meldung offen/keine offenen Meldungen) mit Zählern und nach Standort (bei mehreren Standorten); Suche umfasst FIN. UI-Rauchtest 174 Ansichten ohne Auffälligkeit.
- [x] Kommentar im Vorgang gezielt benachrichtigen (Fuhrparkleitung/Werkstatt/Meldende; leer = alle Beteiligten wie bisher), Auswahl im Verlauf gespeichert. 77 Tests grün.
- [x] Kosten je Kilometer im Kostenbericht (`vehicles[]` mit `km`, `cost_per_km`, `complete`): km aus erster/letzter Ablesung im Zeitraum, mind. 2 Ablesungen, kein Wert bei Zählerrückgang; Kennzeichnung „unvollständig“ bei unbewerteten Positionen. 78 Tests grün.
- [x] Startseite Inhaber/Fuhrparkleitung: „Heute zu tun“ (Meldungen bestätigen, Abschlusskontrollen, Warten auf Teile, Prüfungen überfällig/≤ 7 Tage inkl. km-Fälligkeit, Behördenfristen ≤ 7 Tage) mit direkten Links. UI-Rauchtest ohne Auffälligkeit.
- [x] Startseite Disposition: „Nicht einplanen“ – gesperrte Fahrzeuge, wartet auf Teile, in Werkstatt mit Status und „seit“ (nur gespeicherte Zeitpunkte). UI-Rauchtest jetzt mit 5 Rollen: 192 Ansichten ohne Auffälligkeit.

## Entscheidungen des Auftraggebers
- 10.10.2026: Prüfintervalle bestätigt – HU 12, SP 6, Tachograph 24, UVV 12 Monate. Datei `seed/prueftermine_mit_intervall.csv` (29 Lkw-Einträge) an Auftraggeber zum Import übergeben.
- 10.10.2026: Inhaber-Konto eingerichtet, Fahrzeugstamm und Reifengrößen durch den Auftraggeber importiert.

- 10.10.2026: 7 Lkw aus der Dortmunder Fuhrparkdatei (SZ-YC 5501, 5511, 5519, 5527, 5528, 5531, 5539; versehentlich über den Reifenimport angelegt) bleiben im Bestand, Reparatur/Verkauf offen – **aus allen Bewertungen ausgenommen** (Migration 0011, Status „ruhend“). Fahrzeugimport weist Reifen-/Prüftermindateien jetzt ab.

- 10.10.2026: **Zugmaschine und Anhänger sind fest gekoppelt und wechseln nicht.** Die Kopplung laut Stammliste ist maßgeblich; keine Kopplungshistorie nötig (Backlog 9 entfällt).
- 10.10.2026: Prüftermine (29 Lkw) vom Inhaber importiert; 2 SP laut Rechnungen überfällig (SZ-YC 5550, SZ-YC 5517).

- 10.10.2026: Anhänger-Kennzeichen gelten laut Stammliste (SZ-YC 5514 zu SZ-YC 5513, SZ-KC 5518 zu SZ-YC 5517); `seed/anhaenger_belegt.csv` (23 Anhänger) und Prüftermin-Datei korrigiert und übergeben. FIN SZ-YC 5548 trägt der Inhaber selbst nach.

- 10.10.2026: **HU/SP-Fristen korrigiert** (Auftrag Inhaber): Die SP war fälschlich als „letzte SP + 6 Monate“ hinterlegt. Jetzt zentral nach StVZO Anlage VIII (`src/inspection_rules.js`, Migration 0016): HU 12 Monate, SP 6 Monate nach der letzten HU, SP im Vormonat zulässig ohne Turnusverschiebung, Fristende Monatsende, erste SP 30 (> 12 t) bzw. 42 Monate (7,5–12 t) nach Erstzulassung, ≤ 7,5 t bzw. Anhänger ≤ 10 t keine SP, Anhänger > 10 t wie Lkw > 12 t (Anl. VIII 2.1.5.4). Getrennt: Durchführung, verbindliche Fälligkeit (Nachweis/berechnet), geplanter Werkstatttermin, Prognose. Status: in Ordnung, bald fällig, überfällig, Frist ungeklärt, nicht SP-pflichtig, erste SP künftig. Nachgewiesene Fälligkeiten werden nie überschrieben (Widerspruch → ungeklärt), HU erledigt keine offene SP, keine Kulanz. Neuberechnung im Audit-Log (`maintenance.husp_recalc`). zGM laut Inhaber: alle Lkw > 12 t, Anhänger > 10 t; Erstzulassung unbekannt (Drive-Spalte „Baujahr“ ist laut Inhaber **nicht** die EZ). 72 Tests grün. Sicherung vor Einspielen: D1-Lesezeichen `00000020-00000002-00005100-b2dd37624dff89142743dba20abcdd28` (Wiederherstellung: D1-Konsole `/restore <Lesezeichen>`, nur nach Freigabe).
- Produktiv seit 10.10.2026 ca. 17:20 MESZ (Migration 0016 live geprüft: 68 Fahrzeuge mit zGM-Klasse, keine falschen SP-Zusätze mehr, 58 Neuberechnungen im Audit-Log). Vorfall: erste Fassung der Migration nutzte lange LIKE-Muster, die D1 ablehnt → App ca. 17:09–17:20 MESZ mit „Interner Fehler“; behoben durch instr(). Lehre: in Migrationen keine LIKE-Muster > 50 Zeichen.
- Ergebnis mit echten Daten: 1 SP überfällig (SZ-YC 5517, fällig 08/2026); SZ-YC 5550/5551 nicht mehr überfällig (HU 07/2026 → SP 01/2027); 13 SP „Frist ungeklärt“, weil keine HU belegt ist (letzte HU-Rechnung fehlt im Drive).

## Offene Fragen an den Auftraggeber
- **Führerscheinkontrolle (neu 10.10.2026):** Soll die App die regelmäßige Führerscheinkontrolle der Fahrer führen (Klassen, Ablaufdatum, Kontrolldatum, Prüfer; Erinnerung)? Das sind sensible Personaldaten – nur mit Freigabe. Wenn ja: Kontrollintervall (Monate) vorgeben.
- **Geteilte Werkstatt-Tablets (neu 10.10.2026):** Automatische Abmeldung nach wie vielen Minuten ohne Nutzung (derzeit 30 Tage Sitzung)? Nur für Rolle Werkstatt oder für alle?
- **SZ-YC 5539 doppelt:** Stammliste FIN `WDB96340510318431` (aktiv) und Dortmunder Datei FIN `WDB96300510318431` (ruhend) – vermutlich dasselbe Fahrzeug mit Tippfehler. Welche FIN ist richtig?
- **Letzte HU fehlt bei 13 Fahrzeugen** (nur SP belegt): Prüfberichte/Plaketten nachreichen, sonst bleibt die SP-Frist „ungeklärt“.
- **Datenschutz (neu 10.10.2026):** Entwurf `docs/DATENSCHUTZ_ENTWURF.md` prüfen – Aufbewahrungsfristen je Bereich festlegen (bisher keine automatische Löschung), Mitarbeiterinformation in der Hilfe ja/nein, Ansprechpartner. Erst danach Löschfristen bzw. Hilfetext umsetzen.
- Testkonten (Fahrer/Werkstatt) anlegen – optional, für den Rundgang.
- GPS-Anbindung: Weg 1 (n8n) oder Weg 2 (eigene API-Zugänge) – „später entscheiden“.

## Backlog (in dieser Reihenfolge)
1. Gehosteter Rundgang (Fahrer → Fuhrpark → Werkstatt → Freigabe), sobald der Auftraggeber die Ersteinrichtung erledigt und Testkonten angelegt hat.
5. Telematik-Anbindung (nach Freigabe): n8n-Workflow „[CLAUDE] Telematik → Fuhrpark“ oder eigene API-Zugänge.
6. Prüftermine aus Belegen – **von Claude erledigt**: Intervalle am 10.10.2026 bestätigt, `seed/prueftermine_mit_intervall.csv` (63 Zeilen) übergeben; Import liegt beim Inhaber (Mehr → Prüftermine → importieren, Vorschau prüfen). Nicht übernommen: Kienzle AR121628+, Mirsso RE3267/RE3382, DAH-AC558, SZ-YC 5548 (FIN-Abweichung, siehe Offene Fragen).
10. Eigene Verbesserungen (ohne Freigabe möglich): Datenschutz-Entwurf liegt vor (`docs/DATENSCHUTZ_ENTWURF.md`, wartet auf Freigabe). **Nächster Schritt:** Ruhezeiten für nicht dringende Pushs (z. B. nachts sammeln und morgens zustellen) – nur mit vom Auftraggeber festgelegten Zeiten; bis dahin: Integrations-API um Fahrzeug-Verfügbarkeit (`GET /v1/availability`: gesperrt/Werkstatt/Meldung offen je Fahrzeug) für das Unternehmensbetriebssystem/Tourenplanung ergänzen. Hinweis: personenbezogene Arbeitszeitauswertung je Mitarbeiter bewusst nicht gebaut (nur nach Freigabe/Betriebsrat).
8. E-Mail-Benachrichtigung als Rückfallebene (nur bestätigte Empfänger, erst nach Freigabe).
