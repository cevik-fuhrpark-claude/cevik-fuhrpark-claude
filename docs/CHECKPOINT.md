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
- `src/contracts.js` – Fahrzeugverträge (Leasing/Miete/Finanzierung/Versicherung/Wartung): Status, Agent-Befunde, Übersicht, CSV-Import/-Export.
- `src/integration.js` – Bearer-API für Unternehmensbetriebssystem/n8n (siehe `docs/API.md`).
- `public/` – PWA ohne Framework, DE/UK/EN, Service Worker mit Push-Quittung.

## Tests
`npm test` → 222 automatisierte Abnahmetests (`CFP_QPLAN=1 npm test` listet zusätzlich alle Volltabellen-Suchen je Tabelle) (T02–T18 der Projektdokumentation + Sicherheit); `npm run zeitreise` → dieselben Tests zu 8 kritischen Uhrzeiten/Daten. Lokaler UI-Server:
`node --experimental-sqlite scripts/dev-server.mjs` (Port 8787, In-Memory-DB).

## Stand 10.10.2026
- [x] Backend vollständig für Schaden → Werkstatt → Kontrolle → Freigabe, inkl. Rollen, Test/Betrieb, Push, Agent, Master-Panel
- [x] Oberfläche mobil/Tablet/PC, drei Sprachen
- [x] 30/30 Tests grün, UI per Headless-Browser geprüft
- [x] Cloudflare D1/KV angelegt, GitHub verbunden, erster Build gestartet
- [x] Erster Deploy verifiziert (https://cevik-fuhrpark-claude.y-cevik.workers.dev), D1-Migration live, Secret `SETUP_CODE` gesetzt
- [x] Inhaber-Konto durch Auftraggeber anlegen (Ersteinrichtung), dann Fahrzeugstamm (38 LKW) importieren (10.10.2026)
- [ ] Testkonten Fahrer/Fuhrparkleitung/Werkstatt anlegen; Einladungslinks an Auftraggeber

## Arbeitsregeln (Lehren aus bisherigen Sitzungen)
- Vor jedem Push mindestens `npm test`; bei Oberflächenänderungen `sh scripts/pruefen.sh --schnell` (bricht mit Fehlercode ab – Ausgaben nie per `| tail` den Fehlercode verdecken lassen; Vorfall 11.10.2026). Volle Prüfung ≈ 15 Min. im Hintergrund starten, Bash-Aufrufe sind auf 10 Min. begrenzt.
- Migrationen: nur neue Dateien `migrations/000N_*.sql`, danach `npm run build`; keine LIKE-Muster > 50 Zeichen (D1 lehnt ab – Vorfall 10.10.2026, App 11 Min. gestört).
- Neue Server-Texte (Fehlermeldungen, Hinweise) gleich in `V_MORE` in `public/i18n.js` übersetzen (DE/UK/EN); Wächter-Tests prüfen das.
- Hilfetexte (`help_*_s`): neue Absätze direkt im Grundtext je Sprache ergänzen (Trenner `|`), keine `+=`-Nachträge am Dateiende (13.10.2026 alle Nachträge zusammengeführt).
- Fristen, Preise, km-Stände nur aus Belegen/Einstellungen – nie schätzen oder vorgeben (fehlend = „ungeklärt“/„unbewertet“).
- Arbeitsklon: lokaler Zweig `main` kann veraltet sein – immer auf `origin/main` aufsetzen (`git fetch && git checkout -B main origin/main`).
- Abfragebudget: jeder API-Aufruf ≤ 50 D1-Abfragen (Test), Agent ≤ 40; vor neuen Agent-Prüfungen `scripts/agentprofil.mjs`.

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
- 10.10.2026 17:37: **Freigabe Fahrerdaten & YellowFox (Inhaber: „Ja ich gebe alles frei“):** Fahrerakte (Führerschein, Fahrerkarte, Code 95, Unterweisungen, Führerscheinkontrolle), Auslese-Fristen Fahrerkarte/Fahrtenschreiber, Lenk-/Ruhezeiten und Verstöße über YellowFox-API. Bedingungen: nur lesend gegenüber YellowFox, Sichtbarkeit nur Inhaber/Fuhrparkleitung, Fahrer nur eigene Daten, zuerst Testumgebung. Eigener YellowFox-API-Zugang für diese App empfohlen (Kosten ggf. Entscheidung Inhaber). Zugangsdaten trägt der Inhaber selbst als Cloudflare-Secret ein. Übergabedoku der bestehenden YellowFox-Anbindung kommt vom Inhaber aus dem ChatGPT-Projekt (ChatGPT-Projekt selbst wird nicht verändert).
- 10.10.2026 17:51: **Auftrag „Technische Übernahme Webfleet & YellowFox“** (nur lesend beginnen, keine Neuentwicklung, nichts überschreiben, Veröffentlichung nur nach Prüfung/Freigabe; Fortschritt im MASTER-CHECKPOINT). Stand: siehe `docs/TELEMATIK_BESTANDSAUFNAHME.md` – MASTER-CHECKPOINT gelesen, Telemetrie-Sheet analysiert (894 YellowFox-Zeilen: 0 Dubletten, 0 Zukunftszeiten, 0 km-Rückläufe; Gerät „SZ-YC 5523“ sendet RTI „SZ-YC 5531“; SZ-YC 5517 seit 46 h ohne Position), Monitor-Korrekturentwurf 153acd06 unabhängig getestet (live 3/8, Entwurf 8/8 Teilquellen-Tests; 18+14 Bestandstests grün) – **nicht veröffentlicht**. Laut Inhaber **keine Neon-Datenbank**. YellowFox-RTI: `https://map.yellowfox.de/rti`, Schlüssel-Authentifizierung (company/import/vehicle/group) laut doc.yellowfox.net; Lenkzeit-Funktionen dort nicht öffentlich belegt. Webfleet liefert Restlenkzeiten (getRemainingDrivingTimesEU, 27 Fahrer). Inhaber macht Pause (18:08); Wiederaufnahme mit n8n-Login.

## Verlauf
Der vollständige Verlauf aller erledigten Punkte und Sitzungsprotokolle steht in **`docs/HISTORIE.md`** (neueste Einträge unten). Bei Fragen „wurde X schon gebaut?“ dort suchen (`grep -n`). **Pflege:** Hier nur die letzten zwei Sitzungen halten; beim Sitzungsende ältere Einträge ans Ende von `docs/HISTORIE.md` verschieben (Fortsetzungszeile dort anpassen), damit diese Datei klein bleibt.

### Letzte Sitzungen
- 14.10.2026 (13:16-Sitzung): Sperre der 11:16-Sitzung war nicht entfernt (> 75 Min. → übernommen). Volle Prüfung `pruefen.sh` mit Stand c77a01f **grün** (Rauchtest hell/dunkel/UK/EN je 510 Ansichten + 35 Druck, HTML-Probe 540 + 38, 0 Auffälligkeiten; Zeitreise 8 Zeitpunkte). **Behoben:** `scripts/restart-dev.sh` beendete alle Dev-Server, auch einen zweiten auf Port 8788 neben der Gesamtprüfung (Rauchtest brach dadurch ab) – jetzt legt `scripts/dev-server.mjs` `/tmp/cfp-dev-<Port>.pid` an und der Neustart beendet nur den Server auf 8787 (geprüft: 8788 läuft nach zwei Neustarts weiter; Ablauftest grün). Postfach ohne neue Antworten.
- 14.10.2026 (13:16-Sitzung): **Kurzanleitung für Fahrer (Aushang)** (eigene Verbesserung für die Einführung): Mehr → „Kurzanleitung für Fahrer (Aushang)“ (Inhaber/Fuhrparkleitung/Disposition), Route `#/guide?l=de|uk|en` – Sprache des Aushangs unabhängig von der App-Sprache wählbar, eine A4-Seite: QR-Code + Adresse der App, 7 Abschnitte (Zugang, App aufs Handy/Push/Sprache, Schaden melden, Abfahrtskontrolle, Sicherheit gefährdet, Kein Netz, Stand der Meldungen). Alle Knopfnamen werden zur Laufzeit aus denselben App-Texten der gewählten Sprache eingesetzt (`{key}`), Telefonnummern nur als Linien zum Ausfüllen (keine erfundenen Angaben), keine Personennamen. Hilfe „Ausdrucke & Exporte“ (DE/UK/EN) und `docs/RUNDGANG.md` (Vorbereitung Punkt 5) ergänzt. Neuer Test (alle Texte DE/UK/EN, gleiche Schritte/Platzhalter je Sprache, Platzhalter = vorhandene App-Texte, keine Ziffernfolgen); Rauchtest öffnet den Aushang in allen drei Sprachen (Bildschirm + Druck). Keine Migration. 221 Tests.
- 14.10.2026 (14:16-Sitzung): Keine Sperre vorhanden; Postfach ohne neue Antworten zum Fuhrpark. **Panne & Notfall (eigene Verbesserung, Bedienbarkeit Fahrer):** Migration 0047 `emergency_contacts` (je Umgebung, Art dispo/panne/werkstatt/versicherung/sonstiges, Bezeichnung, Telefonnummer, Hinweis, Geltung alle/Standort laut Fahrzeugstamm/ein Fahrzeug, Archiv statt Löschen). API `GET /api/emergency[?vehicle_id=]` (alle Rollen; Fahrer: zugeordnete Fahrzeuge, Fahrzeug- vor Standortnummern), Pflege `GET/POST /api/emergency/contacts`, `PATCH …/:id`, `POST …/:id/archive` (Inhaber/Leitung/Dispo, höchstens 50 aktive, Protokoll `emergency.*`, in der Datensicherung). Oberfläche: Seite „Panne & Notfall“ (Start Fahrer, Mehr, QR-Scan-Seite) mit festem Notruf 112 und Anruf-Knöpfen (`tel:`), ohne Netz zuletzt geladener Stand (beim Abmelden gelöscht); „Rufnummern pflegen“ (Aktiv/Archiv, Ändern). DE/UK/EN inkl. Server-Texte (V_MORE, Feldnamen), Hilfe „Unfall melden“ ergänzt, `docs/API.md`, `docs/BETRIEB.md`. Die App gibt keine Nummern vor. Neuer Test (Rechte, Umgebungen, Geltung, Validierung, Höchstzahl, Archiv, Protokoll, Texte ohne Nummern außer 112); Rauchtest legt synthetische Nummern an und öffnet die Seiten je Rolle. 222 Tests, `pruefen.sh --schnell` grün (552 Ansichten + 38 Druck, 0 Auffälligkeiten; HTML-Probe jetzt 40 Spalten, 582 + 41 Ansichten, 0 Einschleusungen). Screenshots Handy/Tablet/PC und Ukrainisch geprüft. Nachtrag: Fahrer-Aushang Abschnitt „Sicherheit gefährdet“ um den Schritt „Panne oder Notfall: Mehr → Panne & Notfall“ ergänzt (DE/UK/EN, weiterhin je eine A4-Seite, per PDF geprüft). Fahrzeugakte: Knopf „Panne & Notfall“ (Nummern dieses Fahrzeugs). Builds 41d1ccf/96f8a3c **success**.

## Offene Fragen an den Auftraggeber
- **Reifen-Sammelimport (neu 13.10.2026, optional):** Soll ein Import vom Reifendienst (CSV: FIN/Kennzeichen, Position, Profiltiefe, DOT, Winterkennzeichnung) das **Messdatum aus der Datei** übernehmen dürfen? Ohne Freigabe würde jede Zeile mit dem Importzeitpunkt erfasst – alte Messungen sähen dann frisch aus, deshalb noch nicht gebaut.
- **n8n-Anmeldung (Wiederaufnahmepunkt Telematik-Übernahme):** Inhaber meldet sich selbst in Chrome (Claude-in-Chrome-Profil) unter https://yilmazcevik.app.n8n.cloud an und schreibt „drin“. Danach liest Claude nur lesend die Workflows k5DduArvxYLg3Eok, hreGSvOvRfi3OJsZ, QUYcJ63975Lq7dFR, iR3x5eaIUw2zVCpw, DAPynydnq2P6Ld7N (Graph, Endpunkte, Retry/Fehlerbehandlung, Credentials-Typen ohne Werte, letzte Executions). Stand 10.10.2026 18:00: Editor-Login fehlte (Weiterleitung auf /signin; Cloud-Dashboard war angemeldet).
- **Google-Docs-Connector** im Chat einschalten, damit Claude den MASTER-CHECKPOINT (Drive-Doc 130lB6Loc…) direkt fortschreiben kann; bis dahin eigene Sicherung als separates Google-Doc „[CLAUDE] Fuhrpark – MASTER-CHECKPOINT“.
- **Testkonten und gemeinsame Stammdaten (neu 10.10.2026, wichtig vor dem Testrundgang):** Fahrzeuge, Prüftermine/-historie und Kilometerstände gibt es nur einmal (keine Trennung Test/Betrieb). Testkonten mit Rolle Fuhrparkleitung/Werkstatt/Fahrer können sie heute ändern (z. B. Fahrzeug außer Betrieb nehmen, Prüfung „erledigt“, km-Stand aus Test-Abfahrtskontrolle). **Empfehlung:** Für Testkonten Stammdaten nur lesen; km-Stände aus Testkontrollen nicht in die gemeinsame Fahrzeugakte schreiben. **Stand 10.10. 23:45 UTC: als Schalter fertig vorbereitet** (Einstellungen → „Testkonten dürfen gemeinsame Stammdaten nur lesen“, Standard aus). Inhaber kann ihn selbst einschalten – oder Bescheid geben, dann wird er standardmäßig an.
- **Führerscheinkontrolle:** grundsätzlich freigegeben (Fahrerakte, 10.10.2026 17:37). Offen: Kontrollintervall in Monaten (keine Annahme ohne Vorgabe).
- **Geteilte Werkstatt-Tablets (neu 10.10.2026):** Automatische Abmeldung nach wie vielen Minuten ohne Nutzung (derzeit 30 Tage Sitzung)? Nur für Rolle Werkstatt oder für alle? **Stand 10.10. 23:55 UTC: als Einstellung fertig vorbereitet** (Einstellungen → „Abmelden nach Leerlauf – Werkstatt/alle anderen Rollen“, leer = aus). Inhaber trägt die Minuten selbst ein oder nennt sie.
- **SZ-YC 5539 doppelt:** Stammliste FIN `WDB96340510318431` (aktiv) und Dortmunder Datei FIN `WDB96300510318431` (ruhend) – vermutlich dasselbe Fahrzeug mit Tippfehler. Welche FIN ist richtig?
- **Letzte HU fehlt bei 13 Fahrzeugen** (nur SP belegt): Prüfberichte/Plaketten nachreichen, sonst bleibt die SP-Frist „ungeklärt“.
- **Datenschutz (neu 10.10.2026):** Entwurf `docs/DATENSCHUTZ_ENTWURF.md` prüfen – Aufbewahrungsfristen je Bereich festlegen (bisher keine automatische Löschung), Mitarbeiterinformation in der Hilfe ja/nein, Ansprechpartner. Erst danach Löschfristen bzw. Hilfetext umsetzen.
- Testkonten (Fahrer/Werkstatt) anlegen – optional, für den Rundgang.
- **Rufnummern „Panne & Notfall“ (neu 14.10.2026, Aufgabe Inhaber):** Funktion ist fertig, aber leer. Echte Nummern (Disposition, Pannendienst/Schutzbrief laut Leasing-/Versicherungsvertrag, Werkstatt-Bereitschaft) unter Mehr → „Panne & Notfall“ → „Rufnummern pflegen“ in der Ansicht **Betrieb** eintragen – Claude trägt keine Nummern ein.
- **Kosten-Freigabegrenze (neu 11.10.2026, optional):** Funktion ist fertig, aber aus. Wenn gewünscht: Betrag je Auftrag (€ netto) unter Einstellungen eintragen oder nennen – die App gibt keinen Betrag vor.

## Backlog (in dieser Reihenfolge)
0c. Lenk-/Ruhezeiten & Verstöße über YellowFox (Stufe 3) – wartet auf Übergabedoku und Secret.
1. Gehosteter Rundgang (Fahrer → Fuhrpark → Werkstatt → Freigabe), sobald der Auftraggeber die Ersteinrichtung erledigt und Testkonten angelegt hat. **Ablaufplan liegt bereit: `docs/RUNDGANG.md`** (Vorbereitung, 9 Schritte mit erwartetem Ergebnis; Knopf-/Statusnamen per Test gegen die App-Texte geprüft).
5. Telematik-Anbindung (nach Freigabe): n8n-Workflow „[CLAUDE] Telematik → Fuhrpark“ oder eigene API-Zugänge.
6. Prüftermine aus Belegen – **von Claude erledigt**: Intervalle am 10.10.2026 bestätigt, `seed/prueftermine_mit_intervall.csv` (63 Zeilen) übergeben; Import liegt beim Inhaber (Mehr → Prüftermine → importieren, Vorschau prüfen). Nicht übernommen: Kienzle AR121628+, Mirsso RE3267/RE3382, DAH-AC558, SZ-YC 5548 (FIN-Abweichung, siehe Offene Fragen).
10. Eigene Verbesserungen (ohne Freigabe möglich): Datenschutz-Entwurf liegt vor (`docs/DATENSCHUTZ_ENTWURF.md`, wartet auf Freigabe). UTC-Tagesvergleiche in SQL erledigt (12.10. 23:16-Sitzung, `berlinDaySql`). Druckansichten Vorgangs-/Fahrzeugliste erledigt. Druckknöpfe für Bußgelder/Fahrer ergänzt (Verträge hatten bereits einen). Hilfe „Ausdrucke & Exporte“ + CSV-/ICS-/Rechte-Wächter-Tests erledigt (13.10. 00:16-Sitzung). Druckansichten-Wächter, Datensparsamkeit Integrations-API, Token-Begrenzung, Anmeldepflicht-/Header-Wächter erledigt (13.10. 01:15-Sitzung). Kurzanleitung für Fahrer (Aushang DE/UK/EN) erledigt (14.10. 13:16-Sitzung). Panne & Notfall (Rufnummern) samt Hinweis im Fahrer-Aushang erledigt (14.10. 14:16-Sitzung). **Nächster Schritt:** Antworten auf die offenen Fragen prüfen und umsetzen – vor allem „Testkonten und gemeinsame Stammdaten“ (Empfehlung: Testkonten nur lesend für Fahrzeuge/Prüftermine/km; km aus Testkontrollen nicht in die gemeinsame Akte) und „Tablet-Abmeldung“. Ohne Antwort: weitere Verbesserungen aus der Liste unten (29 ff., in Reihenfolge; 15/16 nur nach Freigabe). Hinweis: personenbezogene Arbeitszeitauswertung je Mitarbeiter bewusst nicht gebaut (nur nach Freigabe/Betriebsrat).
8. E-Mail-Benachrichtigung als Rückfallebene (nur bestätigte Empfänger, erst nach Freigabe).
15. Auslesungen über die Integrations-API (Auslesesoftware/n8n meldet automatisch) – **erst nach Freigabe**: Fahrerkarten-Daten sind personenbezogen; Freigabe vom 10.10. umfasst Sichtbarkeit nur für Inhaber/Fuhrparkleitung, nicht für technische Schnittstellen. Massenspeicher (fahrzeugbezogen) wäre ohne Personenbezug möglich.
16. Fahrerakte: Nachweis-Dateien (Scan Führerschein/Fahrerkarte) anhängen – erst nach Datenschutz-Freigabe (Aufbewahrung/Löschfristen offen).
53. Technische Laufprotokolle (`agent_runs`) begrenzen – erst mit der Entscheidung zu Aufbewahrungsfristen (Datenschutz-Frage), da Löschung.
63. Hinweise: alte gelesene Hinweise > 90 Tage ausblenden/archivieren – erst mit Aufbewahrungsfristen (Datenschutz-Frage).
72. Vorschlag – **nur nach Zustimmung des Auftraggebers** (neuer Fachbereich, Datenquelle klären): Tankbuch/Kraftstoff je Fahrzeug (Import aus Tankkarten-Export, Verbrauch l/100 km zwischen Volltankungen, Ausreißer in Datenqualität).
73. Mängelstatistik/Kennzahlen: nach dem nächsten Live-Zugriff Laufzeit in D1 messen (lokal 200–300 ms bei 15 000 Kontrollen, überwiegend Datenbank).
74. Abfragebudget Zeitleiste: 12.10. auf 16 gesenkt (erledigt). Agent-Abfragebudget: **12.10. auf 38/50 gesenkt** (sieben Ausgangslisten in einer Abfrage, `agentBasics`); Test erzwingt ≤ 40. Vor neuen Agent-Prüfungen weiter mit `scripts/agentprofil.mjs` messen.
76. Wiedervorlage in der Integrations-API (`followup_on` in `/v1/cases`, nie der Vermerk) – nur wenn das Unternehmensbetriebssystem sie braucht (Datensparsamkeit).
80. Feste Grenzen geprüft (12.10.): unkritisch bei ~40–150 Fahrzeugen – Auslesungen je Fahrer/Fahrzeug 100 (≈ 7 Jahre bei 28-Tage-Takt), Verläufe in der Fahrzeugakte 200, Telematik-Prüffälle 500. Erst bei Bedarf Hinweis ergänzen (Muster: eine Zeile mehr lesen, `truncated`).
40. Nach dem Deployment prüfen (braucht Browser/Live-Zugriff): Datensicherung herunterladen und mit `scripts/sicherung-probe.mjs` prüfen (Sammelabfragen seit 10.10. 23 Uhr UTC); kommen die Sicherheitsheader aus `public/_headers` an (Antwort-Header von `/`), zeigt Hilfe die App-Version, meldet `GET /api/health` die neueste Migration (`schema`). Diese Sitzung konnte die Live-Adresse nicht abrufen.
81. Vorschlag – **nur nach Entscheidung des Auftraggebers**: Hinweis „Abfahrtskontrolle seit N Tagen nicht erfasst“ je Fahrzeug (Einstellung, leer = aus). Bisher bewusst nur Information, weil ohne Einsatzplan/Telematik nicht feststeht, ob das Fahrzeug gefahren ist.
84. Vorschlag – **nur nach Zustimmung des Auftraggebers** (neuer Ablauf, Schema-Änderung `inspections.kind`): Fahrzeugübergabe-Protokoll bei Fahrerwechsel (km, Schäden/Fotos, Zubehör, Unterschrift beider Fahrer).
82. Geteilte Tablets: Anmeldeseite nach dem Abmelden zeigt die Sprache der vorherigen Person (gewollt fürs eigene Handy). Bei Rückmeldung aus Dortmund ggf. für Rolle Werkstatt auf Gerätesprache zurücksetzen.
85. ~~Protokoll-Suche Groß-/Kleinschreibung außerhalb A–Z~~ – erledigt 13.10.2026 (13:16-Sitzung): gemeinsame Hilfsfunktionen `likeEsc`/`caseVariants` in `src/util.js`, genutzt von Vorgangs- und Protokoll-Suche (Ansicht + CSV), Test.
83. ~~Restliche deutsche Einzeltexte bei `validation`~~ – erledigt 12.10.2026 (16:16-Sitzung). Neue Server-Texte künftig gleich in `V_MORE` (`public/i18n.js`) ergänzen.
