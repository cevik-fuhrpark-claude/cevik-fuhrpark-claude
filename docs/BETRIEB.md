# [CLAUDE] Betrieb & Einrichtung

## Ersteinrichtung
1. Cloudflare → Worker `cevik-fuhrpark-claude` → Einstellungen → Variablen und Geheimnisse → Secret `SETUP_CODE` (beliebiges langes Codewort).
2. App-Adresse öffnen → „Ersteinrichtung“ → Codewort, Benutzername, Name → Passwort festlegen. Danach ist die Ersteinrichtung gesperrt.
3. „Mehr → Einstellungen → Fahrzeugstamm importieren“: `seed/fuhrpark_stammliste.csv` (38 Lkw aus der Fuhrpark-Stammliste), danach `seed/anhaenger_belegt.csv` (23 Anhänger mit FIN aus Prüfrechnungen).
4. „Mehr → Prüftermine → Prüftermine importieren“: `seed/prueftermine_belegt.csv` – Vorschau prüfen, dann „Übernehmen“. Enthält nur belegte letzte Prüfungen; Fälligkeiten erscheinen erst mit Intervall oder Plakettenmonat.

CSV-Dateien dürfen UTF-8 (mit oder ohne BOM) oder Windows-1252 sein – also direkt aus Excel „Speichern unter → CSV (Trennzeichen-getrennt)“; Semikolon, Komma oder Tabulator als Trenner (auch Excel „Unicode-Text“ als .txt). Die Vorschau nennt übersprungene Zeilen mit der Zeilennummer der Datei.

**Eigene Exporte wieder einlesen (Rundreise):** Die CSV-Exporte „Fahrzeuge“, „Prüftermine“ und „Verträge“ lassen sich unverändert im jeweils passenden Import wieder hochladen – die Vorschau zeigt dann „unverändert“ bzw. „vorhanden“. Praktische Arbeitsweise für fehlende Prüftermine: Prüftermine exportieren, in Excel in den Zeilen „kein Termin hinterlegt“ den nächsten Termin (oder die letzte Prüfung) **und** den Nachweis eintragen, Datei wieder importieren; nicht ausgefüllte Lückenzeilen erscheinen ruhig als „Kein Termin eingetragen – Zeile bleibt unverändert“. Der Export „Auslesungen“ ist eine Fristen-Übersicht und kein Beleg – im Auslese-Import wird er mit einem klaren Hinweis abgewiesen (Auslesungen nur aus der Datei der Auslesesoftware).

## Benutzer
- „Mehr → Benutzer → Benutzer anlegen“ erzeugt einen Einladungslink (7 Tage gültig). Die Person setzt ihr eigenes Passwort (mind. 10 Zeichen, Buchstaben und Ziffern; abgewiesen werden naheliegende Passwörter: eigener Name/Benutzername, Firmen-/App-Name, Allerweltswörter wie „Passwort“/„Sommer“, Tastaturfolgen, Wiederholungen – Prüfung lokal, ohne externe Dienste). Fehlanmeldungen: Sperre je Benutzer nach 8 Fehlversuchen (15 Min.) und zusätzlich je Netzadresse nach 60 Fehlversuchen in 15 Min. (gegen Durchprobieren vieler Namen; gilt dann für alle Anmeldungen von dieser Adresse – bei gemeinsamem Betriebshof-Internet 15 Min. warten). Die Adresse wird nur als gekürzter Hash gespeichert und nach 2 Tagen gelöscht; Protokolleintrag `login.ip_limited` ohne Adresse. Integrations-API (Bearer-Token): nach 30 ungültigen Tokens in 15 Min. von derselben Adresse 429 für diese Adresse – auch mit gültigem Token, bis das Fenster abläuft; Protokoll `integration.token_limited` (einmal je Fenster, rot markiert). Andere Adressen (z. B. n8n) sind nicht betroffen.
- Testkonten mit Umgebung „Test“ sehen ausschließlich Testdaten (serverseitig erzwungen). Vorgangsnummern: `T-…` (Test), `S-…` (Betrieb).
- Werkstattkonten brauchen eine Werkstatt (Dortmund, München, Extern) und sehen nur Aufträge dieser Werkstatt.
- Deaktivieren oder Rollen-/Umgebungswechsel beendet sofort alle Sitzungen und Push-Geräte der Person.

## Push-Benachrichtigungen
- Jede Person aktiviert Push auf jedem Gerät selbst unter „Hinweise“. Mehrere Geräte pro Person möglich.
- iPhone/iPad: zuerst „Teilen → Zum Home-Bildschirm“, dann die App vom Home-Bildschirm öffnen und Push aktivieren (Apple-Vorgabe).
- Unter „Hinweise → Push für diese Hinweise“ kann jede Person nicht dringende Arten abwählen (bleiben in der App sichtbar). Dringende Hinweise kommen immer.
- „Push vom Dienst angenommen“ ist kein Lesenachweis: Empfang, Öffnen und „Gesehen“ werden getrennt gespeichert.
- Fehlgeschlagene Pushs werden bis zu 3× wiederholt; dringende, nicht zugestellte Hinweise meldet der Agent.
- Pushs des Fuhrparkagenten an Inhaber/Fuhrparkleitung kommen in der Sprache der Person und ohne Kennzeichen/Namen (Sperrbildschirm): ein neuer kritischer Befund als Kurzbezeichnung mit Code in Klammern (z. B. „Reifen unter Mindestprofil (TIRE_BELOW_MINIMUM)“), mehrere als „N neue kritische Befunde“, neue Termine/Fristen als ruhige Sammel-Erinnerung („2× Prüftermin bald fällig“). Details stehen im Management-Panel.
- Neue fällige/überfällige Prüftermine und ablaufende Behördenfristen meldet der Agent als eine ruhige Sammel-Erinnerung je Lauf (Vorlauf = „Vorwarnung Tage“ in den Einstellungen). Fahrzeugverträge (Ende, Kündigungstag, km-Kontingent) mit eigener Vorwarnung „Verträge – Vorwarnung“ (Standard 60 Tage). Versicherungsfälle ohne Regulierung nur, wenn unter Einstellungen „Versicherungsfälle – nachfassen nach Tagen“ eingetragen ist (leer = aus; die App setzt keine eigene Frist). Ebenso Vorgänge ohne Bewegung (bewertet, übernommen oder in Reparatur, aber seit so vielen Tagen keine Änderung – auch kein Kommentar) nur mit „Vorgänge – nachfassen nach Tagen ohne Änderung“.

## Ohne Netz (Funkloch)
- Ist die App einmal mit Netz geöffnet worden, startet sie auch ohne Netz: Startseite mit „Mein Fahrzeug“ (Stand der letzten Verbindung), Schadensmeldung und Abfahrtskontrolle werden auf dem Gerät gespeichert und automatisch gesendet.
- Auf dem Gerät gespeichert werden nur Anzeigedaten (Name, Rolle, Fahrzeugliste) – keine Passwörter. „Abmelden“ löscht diese Daten.

## Fristen und Kosten
- Reaktionsfristen (Erstbewertung, Werkstatt-Übernahme) je Priorität unter „Einstellungen“. Leer = keine Frist (der Agent meldet dann „Frist nicht konfiguriert“).
- Interner Werkstatt-Stundensatz: ohne Wert bleiben Arbeitsstunden „unbewertet“.
- Wiedervorlage: Inhaber/Fuhrparkleitung setzen im Vorgang ein eigenes Datum (optional mit Vermerk); ab dem Tag „Heute zu tun → Wiedervorlage fällig“ und ruhige Agent-Erinnerung. Werkstatt und Fahrer sehen sie nicht. Kalender-Download im Reiter „Wiedervorlage“ (ohne Vermerk).
- „Ohne Bewegung“: nur mit Einstellung „Vorgänge – nachfassen nach Tagen ohne Änderung“ (leer = aus).

## HU/SP-Fristen (StVZO § 29, Anlage VIII)
Berechnung zentral im Server (`src/inspection_rules.js`), nie im Browser:
- HU alle 12 Monate ab Monat der letzten HU; Fristende = Ablauf des Monats (Plakette).
- SP 6 Monate nach der letzten HU (nicht nach der letzten SP). Eine „SP i. V. m. HU“ am HU-Tag gehört zur HU. Eine SP im Vormonat ist zulässig und verschiebt den Turnus nicht; eine frühere SP → „Frist ungeklärt“.
- SP-Pflicht: Lkw > 12 t ab 30 Monaten, Lkw > 7,5–12 t ab 42 Monaten nach Erstzulassung; Lkw ≤ 7,5 t und Anhänger ≤ 10 t keine SP; Anhänger > 10 t wie Lkw > 12 t.
- Ohne zulässige Gesamtmasse, ohne belegte HU oder bei Widerspruch zum Nachweis: „Frist ungeklärt“ (keine geschätzten Fristen). Ein geplanter Werkstatttermin ersetzt keine Durchführung; eine HU erledigt keine offene SP; keine automatische Kulanz.
- Fahrzeugdaten (zGM laut F.2, Erstzulassung laut B) in der Fahrzeugakte unter „Prüfrelevante Fahrzeugdaten“ – nur mit Nachweis.
- Jede Neuberechnung einer gespeicherten Fälligkeit steht im Audit-Log (`maintenance.husp_recalc`, von/nach).

## Exporte (CSV, Kalender) – wer bekommt was
Alle CSV-Dateien: UTF-8 mit BOM, Semikolon, CRLF, Dezimalkomma – Doppelklick öffnet sie in deutschem Excel. Kalender (.ics) sind einmalige Kopien (kein Abo).
Format, Spaltenzahl je Zeile, Formelschutz und Rechte prüft `npm test` für jeden Export; ein neuer Export ohne Eintrag im Test lässt die Suite fehlschlagen.

| Export | Inhaber | Fuhrparkleitung | Werkstatt | Disposition | Lesezugriff | Fahrer |
|---|---|---|---|---|---|---|
| Fahrzeuge, Prüftermine (+ .ics), Vorgänge, Werkstattplan (.ics) | ✓ | ✓ | ✓ | ✓ | ✓ | – |
| Reifen, Werkstattauslastung | ✓ | ✓ | ✓ | – | ✓ | – |
| Lager, Bestellvorschlag, Lagerjournal | ✓ | ✓ | ✓ | – | – | – |
| Wiedervorlagen (.ics) | ✓ | ✓ | – | ✓ | ✓ | – |
| Durchgeführte Prüfungen, Kosten, Kennzahlen, Bußgelder (+ .ics; Fahrernamen nur Inhaber/Leitung) | ✓ | ✓ | – | – | ✓ | – |
| Verträge (+ .ics), Fahrer, Auslesungen, Versicherungsfälle, Telematik – letzter Stand je Fahrzeug | ✓ | ✓ | – | – | – | – |
| Protokoll (Audit-Log) | ✓ | – | – | – | – | – |
| Agentenbefunde (Management-Panel, im Browser erzeugt, in der App-Sprache) | ✓ | ✓ | – | – | – | – |

Exporte mit Personen- oder Kostenbezug werden im Protokoll vermerkt.
Hilfe in der App: „Ausdrucke & Exporte“.

## Sicherung & Wiederherstellung
**Automatisch (ohne Zutun):** Cloudflare D1 „Time Travel“ hält jeden Datenbankstand zum Zurückspielen bereit – im Gratis-Tarif 7 Tage, im Workers-Paid-Tarif 30 Tage.

**Manuell (Inhaber):** „Mehr → Einstellungen → Sicherung herunterladen“ erzeugt eine JSON-Datei mit allen Fachdaten
(Fahrzeuge, Vorgänge, Arbeiten, Teile, Kosten, Prüfungen inkl. Historie, Reifen, Lager, Bußgelder, Fahrerakte, Auslesungen, Befunde, Telematik-Zuordnungen, Protokoll). Nicht enthalten: Passwörter,
Sitzungen, Einladungs-/Integrations-Token, Push-Schlüssel und Dateiinhalte (nur deren Metadaten). Empfehlung: monatlich
herunterladen und im eigenen Drive ablegen. Jeder Export steht im Audit-Log.

**Probe der JSON-Sicherung (lokal, ohne echte Datenbank):** `node --experimental-sqlite scripts/sicherung-probe.mjs <sicherung.json>`
spielt die Datei in eine frische In-Memory-Datenbank mit aktuellem Schema ein und vergleicht je Tabelle die Zeilenzahl sowie die
Fremdschlüssel. Ein automatischer Test macht das bei jedem `npm test` mit der Sicherung der Testdaten. Die JSON-Sicherung ist ein
Archiv der Fachdaten – Benutzer müssten nach einer Wiederherstellung daraus neu eingeladen werden (keine Passwörter enthalten).

**Wiederherstellung der Datenbank auf einen Zeitpunkt** (nur nach Freigabe durch den Inhaber – überschreibt den aktuellen Stand):
```
npx wrangler d1 time-travel info cevik-fuhrpark-claude                       # aktuelles Lesezeichen anzeigen und notieren
npx wrangler d1 time-travel restore cevik-fuhrpark-claude --timestamp=2026-10-10T08:00:00Z
```
Vor dem Zurückspielen das aktuelle Lesezeichen notieren – damit lässt sich auch die Wiederherstellung selbst rückgängig machen.

**Vollexport der Datenbank als SQL:** `npx wrangler d1 export cevik-fuhrpark-claude --remote --output=sicherung.sql`

**Fotos/PDFs (KV `FILES`):** Schlüssel `<umgebung>/<Vorgangs-ID>/<Datei-ID>` bzw. `<umgebung>/fines/<Bußgeld-ID>/<Datei-ID>` bzw. `<umgebung>/vehicles/<Fahrzeug-ID>/<Datei-ID>` (Fahrzeugdokumente) (Zuordnung über Tabelle `files` in der Sicherung); Liste mit
`npx wrangler kv key list --binding FILES --remote`, einzelne Datei mit `npx wrangler kv key get <Schlüssel> --binding FILES --remote > datei`.

**Code:** GitHub-Repository; jede Version ist unter Cloudflare → Worker → Deployments zurückrollbar.

## Belastbarkeit (Lasttest)
`npm run lasttest` (= `scripts/lasttest.mjs 150 3000 200 --check`, bricht mit Fehlercode ab, wenn ein Aufruf mehr als 50 D1-Abfragen braucht) – synthetische Daten (Kennzeichen `LT-…`), nur im Arbeitsspeicher, nie in der echten Datenbank.
Ergebnis 10.10.2026, 14 Uhr (150 Lkw, 3000 Vorgänge): Vorgang anlegen p95 ≈ 4 ms, Vorgangsliste ≈ 20 ms, Fahrzeugakte ≈ 3 ms,
Management-Panel ≈ 11 ms, Kostenbericht 12 Monate ≈ 19 ms (vorher ≈ 430 ms – Datumsformatierung wird jetzt einmal erzeugt statt je Buchung),
Kennzahlen 12 Monate ≈ 56 ms, Prüftermine ≈ 3 ms, Reifen-Flotte ≈ 2 ms, Vorgangssuche ≈ 20 ms, Fuhrparkagent-Lauf ≈ 500 ms (reine Anwendungslogik inkl.
SQLite-Nachbildung; D1 im Betrieb zusätzlich wenige ms je Abfrage).
Ergänzt 10.10.2026, 17 Uhr (gleiche Daten): Fahrzeug-Zeitleiste ≈ 5 ms (18 Abfragen), Datenqualität ≈ 4 ms, Werkstatt-Auslastung 26 Wochen ≈ 9 ms,
Nutzungsstatistik ≈ 3 ms, Vorgänge-CSV mit 3000 Zeilen ≈ 160 ms (überwiegend Datenbank; Zeitstempel-Formatierung auf Rechnung mit
zwischengespeichertem Zeitzonenversatz umgestellt, 12 000 Werte ≈ 10 ms statt ≈ 27 ms), Fuhrparkagent ≈ 175 ms / 36 Abfragen. Erster Lauf mit 3051 neuen Befunden: 41 Anweisungen (Sammelblöcke à 1000 Befunde, ≈ 0,6 MB je Block; vorher 47 bei Blöcken à 400 – Abstand zur Grenze von 50 vergrößert).
Ergänzt 10.10.2026, 18 Uhr (zusätzlich 200 Fahrer mit Fahrerkarte, Führerschein, Kontrolle, Auslesungen; Auslesung je Lkw; Aufruf
`scripts/lasttest.mjs 150 3000 200`): Fahrerliste ≈ 14 ms / 6 Abfragen, Fahrerakte ≈ 2 ms / 7, Auslesungen-Übersicht ≈ 6 ms / 5,
Fuhrparkagent ≈ 200 ms / 40 Abfragen (Fahrer- und Auslesebefunde mit konstanter Abfragezahl).
Ergänzt 10.10.2026, 21:45 UTC: Mängelstatistik über 365 Tage mit 15 000 synthetischen Abfahrtskontrollen (100 je Lkw, je 18 Prüfpunkte) ≈ 165 ms / 4 Abfragen (überwiegend JSON-Auswertung in der Datenbank).
Ergänzt 11.10.2026, 02:45 UTC: 600 freigegebene Aufträge mit geplantem Werkstatttermin (−5 … +34 Tage): Werkstattplan 30 Tage ≈ 13 ms / 4 Abfragen, Fahrzeugliste mit geplanten Terminen ≈ 19 ms / 3 Abfragen (p95).
Ergänzt 11.10.2026, 10:45 UTC: 2214 synthetische Teile-Ereignisse (1000 Abschnitte „wartet auf Teile“, mit/ohne/verschobenem Liefertermin): Kennzahlen 12 Monate inkl. Termintreue Teile ≈ 76 ms / 5 Abfragen (p95); `--check` bricht ab, wenn die Termintreue keine Abschnitte auswertet.
Ergänzt 11.10.2026, 05:30 UTC: 300 Fahrzeugverträge (je Lkw Leasing mit km-Kontingent + Versicherung, Enddaten so gestreut, dass alle Vertragsbefunde gleichzeitig entstehen): Vertrag anlegen ≈ 1 ms / 5 Abfragen, Verträge-Übersicht ≈ 16 ms / 5, CSV-Export ≈ 6 ms / 6, Import-Vorschau 150 Zeilen ≈ 11 ms / 5, Datenqualität mit Vertragsprüfungen ≈ 11 ms / 14, Fuhrparkagent ≈ 200 ms / 36 Abfragen (Vertragsbefunde mit konstanter Abfragezahl).
Ergänzt 11.10.2026, 06:45 UTC: 600 Versicherungsfälle (300 mit Erstattung): Fall erfassen ≈ 1 ms / 6 Abfragen, Übersicht ≈ 30 ms / 4, Kostenbericht inkl. Erstattungen ≈ 38 ms / 12, Zeitleiste ≈ 6 ms / 26, CSV ≈ 17 ms / 5, Datenqualität inkl. Unfall-Hinweis ≈ 18 ms / 15 (p95).
Ergänzt 11.10.2026, 07:00 UTC: 300 Prüfregeln (UVV/Tachograph, jede zweite eingeplant) + 600 geplante Aufträge: Prüftermin-Kalender (.ics) ≈ 19 ms, Werkstattplan-Kalender 60 Tage ≈ 21 ms (vorher ≈ 245 bzw. 300 ms – Zeilenfaltung der Kalenderdatei rechnete Bytes je Zeichen mit TextEncoder; jetzt aus dem Zeichencode, Ausgabe identisch, Test).
Ergänzt 12.10.2026, 21:55 UTC: Werkstattplan mit „Fällig – ohne Termin“ (Prüftermin-Auswertung inkl. km je Plan-Aufruf): 30 Tage ≈ 12 ms (p95 21 ms) / 14 Abfragen; Fahrzeugliste mit km-Fälligkeit ≈ 12 ms / 3 Abfragen (Lasttest 150 Lkw / 3000 Vorgänge).
Ergänzt 11.10.2026, 11:40 UTC: 60 Werkstattaufträge aus Prüfterminen mit Kosten-Freigabegrenze (je 2 Fremdleistungs-Schätzungen, 30 Freigaben): Auftrag aus Prüftermin ≈ 2 ms / 27 Abfragen (Anlegen + Freigabe in einem Aufruf), Kostenbuchung mit Grenzprüfung ≈ 1 ms / 21, Kosten freigeben ≈ 1 ms / 17, Kennzahlen inkl. Kostenfreigaben ≈ 46 ms / 5.

Ergänzt 11.10.2026, 15:45 UTC: 1200 Durchführungen mit Ergebnis (400 mit erheblichen/gefährlichen Mängeln, 200 mit Mängelauftrag, davon 67 freigegeben): Nachweisliste 12 Monate ≈ 19 ms / 3 Abfragen, als CSV ≈ 16 ms / 4, Prüftermine inkl. Prüfmängel/Nachprüfungen ≈ 10 ms / 12, Kennzahlen inkl. Mängelbeseitigung ≈ 54 ms / 6, Integrations-API `/v1/kpi` ≈ 54 ms / 4, `/v1/maintenance/history` ≈ 19 ms / 1, `/v1/maintenance` ≈ 7 ms / 9, Datenqualität ≈ 18 ms / 17, Fuhrparkagent ≈ 190 ms / 39.
Messung 13.10.2026, 13:40 UTC (alle Bereiche, `npm run lasttest`, Gesamtlauf ≈ 21 s, Prüfung bestanden – alle Aufrufe ≤ 50 Abfragen; p50/p95): Vorgang anlegen 1,5/3,2 ms (10 Abfragen), Vorgangsliste 20/29 ms, Startseite mit 500 offenen 40/69 ms, Fahrzeugliste 12/19 ms, Kennzahlen 12 Monate 63/91 ms, Mängelstatistik 365 Tage 164/210 ms (5 Abfragen), Vorgänge-CSV 3000 Zeilen ≈ 170 ms, Reifen – Flotte 3 ms (einzelner Ausreißer 113 ms), Integrations-API `/v1/kpi` 74/105 ms, Fuhrparkagent ≈ 233 ms / 32 Abfragen. Keine Verschlechterung gegenüber den Einzelmessungen oben, die über 100 ms liegenden Aufrufe sind Auswertungen über 12 Monate (überwiegend Datenbank).

Ergänzt 14.10.2026, 00:30 UTC: 10 Fahrzeuge außer Betrieb, deren Telematik-Geräte (2 Anbieter) weiter liefern: Datenqualität ≈ 28 ms / 19 Abfragen (20 Befunde `telematics_vehicle_inactive`, `--check` verlangt genau 20), `/v1/data-quality` ≈ 26 ms / 18, Fuhrparkagent ≈ 320 ms / 30 Abfragen.

Cloudflare begrenzt die Anzahl der Datenbankabfragen je Aufruf. Deshalb arbeiten Agent, Importe, Push-Zustellung und Fahrzeugakte
mit Sammelabfragen; die Anzahl der Abfragen hängt nicht mehr von der Zahl der Vorgänge oder Fahrzeuge ab (Agent: höchstens ≈ 38 – eigener Test ≤ 40 – statt
zuvor ≈ 9000 bei 3000 offenen Vorgängen). Ein Test prüft bei jedem Lauf, dass jeder API-Aufruf ≤ 50 Abfragen braucht.
Betrieb und Testumgebung laufen in getrennten Cron-Aufrufen (`*/15` bzw. `7,37`).
Push-Zustellung schreibt Ergebnisse mit höchstens 3 Anweisungen je Zustellung – unabhängig von Empfänger- und Gerätezahl
(vorher 1 je Hinweis + 1 je Gerät). Hinweis: Jeder Push ist ein eigener Netzaufruf an den Push-Dienst; Cloudflare begrenzt auch
diese (Gratis-Tarif 50 je Aufruf). Bei sehr vielen Geräten je Ereignis (> ≈ 40) wäre eine Verteilung über eine Warteschlange nötig.
Fehlersuche: `CFP_QTRACE=1 npm test` listet die Anweisungen des größten Aufrufs.

**Agent-Profil:** `node --experimental-sqlite scripts/agentprofil.mjs 150 3000` misst je Lauf Zeit, Abfragen und geschriebene Zeilen und
listet die teuersten Funktionen. Ergebnis 10.10.2026 (3000 offene Vorgänge, 3051 Befunde): erster Lauf ≈ 300 ms / 5055 Zeilen,
Folgeläufe ≈ 150 ms / 23 Abfragen / **2 geschriebene Zeilen** (vorher ≈ 320 ms und 3053 Zeilen je Lauf). Grund: Befundtexte nennen
den Zeitpunkt („seit 10.10.2026 14:05“) statt einer laufenden Minutenzahl, und unveränderte Befunde werden nicht neu geschrieben –
wichtig für das D1-Schreibkontingent (Gratis-Tarif 100 000 Zeilen/Tag bei 2 × 96 Läufen/Tag). In der Oberfläche steht je Befund „offen seit“.

## UI-Rauchtest (vor größeren Änderungen)
`sh scripts/restart-dev.sh && python3 scripts/ui-rauchtest.py [Screenshot-Ordner]` – ruft jede Ansicht für Inhaber, Fuhrparkleitung,
Werkstatt und Fahrer in Handy-, Tablet- und PC-Breite auf (267 Ansichten, inkl. Bußgeld-/Lager-/Vorgangsdetails je Rolle, Disposition, Fahrerakte, Auslesungen, QR-Aufkleber, Vorgang und Kontrollformular) und meldet JavaScript-Fehler, abgebrochene Ansichten, rote Fehlermeldungen,
fehlende Überschriften, waagrechtes Scrollen sowie (Handybreite) Felder ohne Beschriftung, Bilder ohne Alternativtext und Schaltflächen/Links ohne Text. Braucht Python-Playwright, nur lokale synthetische Daten. Stand 10.10.2026: 0 Auffälligkeiten.
Mit `CFP_LANG=uk` bzw. `CFP_LANG=en` laufen alle Konten in dieser Sprache; zusätzlich werden sichtbare deutsche Texte (Umlaute) gemeldet.

## UI-Test geteiltes Tablet (Leerlauf-Abmeldung)
`sh scripts/restart-dev.sh && python3 scripts/ui-leerlauf.py` – mit simulierter Uhr in 390/820/1366 px: Bedienung hält die Sitzung wach,
Vorwarnleiste 60 s vor Ablauf mit „Angemeldet bleiben“, ohne Bedienung Anmeldeseite und beendete Server-Sitzung; nach Abmelden sieht die
nächste Person im selben Tab keine Suche/Sortierung der vorherigen. Teil von `scripts/pruefen.sh`. Zweiter lokaler Server neben einer laufenden
Gesamtprüfung: `PORT=8788 node --experimental-sqlite scripts/dev-server.mjs` und `CFP_URL=http://localhost:8788`.

## UI-Ablauftest (Kernprozess per Klick)
`sh scripts/restart-dev.sh && python3 scripts/ui-ablauf.py [Screenshot-Ordner]` – spielt den Kernprozess in Handybreite über die Oberfläche durch:
Fahrer meldet → Fuhrparkleitung gibt Reparatur frei → Werkstatt übernimmt, repariert, erfasst Zeit → Kontrolle nach Reparatur im Formular
(leeres Absenden wird abgefangen, ein Mangel erzeugt einen Folgeauftrag) → Abschlusskontrolle → technische Freigabe → Abfahrtskontrolle über
den Aufkleber-Link. Prüft nach jedem Schritt den Status über die API und meldet JavaScript-Fehler. Anlass: Fehler „preId is not defined“
(10.10.2026) – die Kontrolle nach Reparatur war in der Oberfläche nicht abschließbar, obwohl alle API-Tests grün waren.

## Deployment prüfen
Nach einem Push auf `main` baut Cloudflare automatisch. Kontrolle ohne Anmeldung: `https://cevik-fuhrpark-claude.y-cevik.workers.dev/api/health`
liefert `{"ok":true,"time":…,"schema":"00NN"}` – `schema` muss der höchsten Nummer im Ordner `migrations/` entsprechen
(die Migrationen laufen beim ersten Aufruf automatisch). Die App-Version steht in `/version.json` und unter Hilfe.

## Sicherheitsheader
Die Oberfläche (HTML/JS/CSS) liefert Cloudflare direkt aus den statischen Dateien aus – **ohne** den Worker. Deshalb stehen
Content-Security-Policy, X-Frame-Options, HSTS usw. in `public/_headers` (Cloudflare wendet die Datei automatisch an; sie selbst ist
nicht abrufbar). Die CSP muss mit `CSP` in `src/worker.js` übereinstimmen (Test). Der lokale Entwicklungsserver wendet `_headers`
ebenfalls an, der UI-Rauchtest meldet CSP-Verstöße. Prüfen nach dem Deployment: Browser-Entwicklertools → Netzwerk → `/` → Antwort-Header.

## Nutzungsstatistik (Einführungsphase)
„Mehr → Nutzung der App“ (nur Inhaber) zeigt, wie oft welche Funktion aufgerufen wurde und wo Fehler auftraten – je Tag und Umgebung.
Gespeichert werden nur Tag, Umgebung, Funktionspfad (IDs, Kennzeichen, Token durch `:id` ersetzt) und Zähler (Tabelle `usage_daily`);
**keine** Benutzer-ID, Rolle, IP-Adresse oder Inhalte. Ein zusätzlicher Schreibzugriff je angemeldetem Aufruf (nach der Antwort, blockiert nichts).

## Telematik-Einspeisung überwachen
Ob die Telematik-Daten (Webfleet/YellowFox) noch ankommen, zeigt die App selbst unter **Mehr → Telematik** („Letzter Datenempfang“, darunter
„Empfang je Anbieter“). Für eine automatische Überwachung (z. B. ein eigener n8n-Workflow – **nicht** die bestehenden Workflows des ChatGPT-Portals ändern)
gibt es einen rein lesenden, datensparsamen Endpunkt:

```bash
curl -s -H "Authorization: Bearer $INTEGRATION_TOKEN_READ" \
  "https://cevik-fuhrpark-claude.y-cevik.workers.dev/api/integration/v1/telematics/status"
```
Antwort (Aufbau; Werte nur zur Veranschaulichung, nicht aus dem Betrieb):
```json
{ "schema_version": "1.0", "generated_at": "…",
  "providers": [ { "provider": "yellowfox", "devices": 0, "vehicles": 0, "last_received": "…", "last_gps_time": "…",
                   "unmatched": 0, "mappings": 0, "plate_mismatches": 0, "km_rejected": 0, "inactive_vehicle_reports": 0 } ],
  "vehicles_total": 0, "vehicles_without_data": 0, "trailers_with_data": 0, "unmatched_truncated": false }
```
- Dafür genügt das **Lese-Token** (`INTEGRATION_TOKEN_READ`); es kann nichts einspeisen oder ändern.
- Enthält nur Zähler und Zeitpunkte – keine Positionen, Geräte-IDs, Kennzeichen oder Personen.
- **Die App legt keinen Grenzwert fest.** Ab wann ein altes `last_received` als Ausfall gilt (z. B. nachts/am Wochenende normal), entscheidet der Betrieb
  und trägt es im eigenen Überwachungs-Workflow ein. Sinnvolle Prüfpunkte: `last_received` je Anbieter, Anstieg von `unmatched` (neue Geräte ohne Zuordnung →
  Mehr → Telematik → Prüffälle), `plate_mismatches`/`km_rejected` > 0 (Details unter Mehr → Datenqualität), `inactive_vehicle_reports` > 0 (Gerät liefert für ein außer Betrieb
  genommenes Fahrzeug – verkauft? Gerät ausbauen bzw. Zuordnung lösen; Details unter Mehr → Datenqualität), `vehicles_without_data`.
- `providers` enthält immer beide Anbieter; `last_received: null` und `devices: 0` = von diesem Anbieter kam noch nie ein Stand.
  Telematik-Daten sind gemeinsame Stammdaten (keine Trennung Test/Betrieb).
- Abrufhäufigkeit: alle 15–60 Minuten reicht; mehr als 30 ungültige Token-Versuche in 15 Minuten sperren die Netzadresse vorübergehend (siehe `docs/API.md`).

## Was die App bewusst nicht tut
Keine automatische technische Fahrzeugfreigabe, keine Bestellungen oder kostenpflichtigen Aufträge, keine erfundenen Fristen,
Preise oder Kilometerstände, keine Fahrerzuordnung allein über Namen oder Kennzeichen.
