# [CLAUDE] Betrieb & Einrichtung

## Ersteinrichtung
1. Cloudflare → Worker `cevik-fuhrpark-claude` → Einstellungen → Variablen und Geheimnisse → Secret `SETUP_CODE` (beliebiges langes Codewort).
2. App-Adresse öffnen → „Ersteinrichtung“ → Codewort, Benutzername, Name → Passwort festlegen. Danach ist die Ersteinrichtung gesperrt.
3. „Mehr → Einstellungen → Fahrzeugstamm importieren“: `seed/fuhrpark_stammliste.csv` (38 Lkw aus der Fuhrpark-Stammliste), danach `seed/anhaenger_belegt.csv` (23 Anhänger mit FIN aus Prüfrechnungen).
4. „Mehr → Prüftermine → Prüftermine importieren“: `seed/prueftermine_belegt.csv` – Vorschau prüfen, dann „Übernehmen“. Enthält nur belegte letzte Prüfungen; Fälligkeiten erscheinen erst mit Intervall oder Plakettenmonat.

## Benutzer
- „Mehr → Benutzer → Benutzer anlegen“ erzeugt einen Einladungslink (7 Tage gültig). Die Person setzt ihr eigenes Passwort.
- Testkonten mit Umgebung „Test“ sehen ausschließlich Testdaten (serverseitig erzwungen). Vorgangsnummern: `T-…` (Test), `S-…` (Betrieb).
- Werkstattkonten brauchen eine Werkstatt (Dortmund, München, Extern) und sehen nur Aufträge dieser Werkstatt.
- Deaktivieren oder Rollen-/Umgebungswechsel beendet sofort alle Sitzungen und Push-Geräte der Person.

## Push-Benachrichtigungen
- Jede Person aktiviert Push auf jedem Gerät selbst unter „Hinweise“. Mehrere Geräte pro Person möglich.
- iPhone/iPad: zuerst „Teilen → Zum Home-Bildschirm“, dann die App vom Home-Bildschirm öffnen und Push aktivieren (Apple-Vorgabe).
- Unter „Hinweise → Push für diese Hinweise“ kann jede Person nicht dringende Arten abwählen (bleiben in der App sichtbar). Dringende Hinweise kommen immer.
- „Push vom Dienst angenommen“ ist kein Lesenachweis: Empfang, Öffnen und „Gesehen“ werden getrennt gespeichert.
- Fehlgeschlagene Pushs werden bis zu 3× wiederholt; dringende, nicht zugestellte Hinweise meldet der Agent.
- Neue fällige/überfällige Prüftermine und ablaufende Behördenfristen meldet der Agent als eine ruhige Sammel-Erinnerung je Lauf (Vorlauf = „Vorwarnung Tage“ in den Einstellungen).

## Fristen und Kosten
- Reaktionsfristen (Erstbewertung, Werkstatt-Übernahme) je Priorität unter „Einstellungen“. Leer = keine Frist (der Agent meldet dann „Frist nicht konfiguriert“).
- Interner Werkstatt-Stundensatz: ohne Wert bleiben Arbeitsstunden „unbewertet“.

## Sicherung & Wiederherstellung
**Automatisch (ohne Zutun):** Cloudflare D1 „Time Travel“ hält jeden Datenbankstand zum Zurückspielen bereit – im Gratis-Tarif 7 Tage, im Workers-Paid-Tarif 30 Tage.

**Manuell (Inhaber):** „Mehr → Einstellungen → Sicherung herunterladen“ erzeugt eine JSON-Datei mit allen Fachdaten
(Fahrzeuge, Vorgänge, Arbeiten, Teile, Kosten, Prüfungen, Reifen, Lager, Bußgelder, Befunde). Nicht enthalten: Passwörter,
Sitzungen, Einladungs-/Integrations-Token, Push-Schlüssel und Dateiinhalte (nur deren Metadaten). Empfehlung: monatlich
herunterladen und im eigenen Drive ablegen. Jeder Export steht im Audit-Log.

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
`node --experimental-sqlite scripts/lasttest.mjs 150 3000` – synthetische Daten (Kennzeichen `LT-…`), nur im Arbeitsspeicher, nie in der echten Datenbank.
Ergebnis 10.10.2026, 14 Uhr (150 Lkw, 3000 Vorgänge): Vorgang anlegen p95 ≈ 4 ms, Vorgangsliste ≈ 20 ms, Fahrzeugakte ≈ 3 ms,
Management-Panel ≈ 11 ms, Kostenbericht 12 Monate ≈ 19 ms (vorher ≈ 430 ms – Datumsformatierung wird jetzt einmal erzeugt statt je Buchung),
Kennzahlen 12 Monate ≈ 56 ms, Prüftermine ≈ 3 ms, Reifen-Flotte ≈ 2 ms, Vorgangssuche ≈ 20 ms, Fuhrparkagent-Lauf ≈ 500 ms (reine Anwendungslogik inkl.
SQLite-Nachbildung; D1 im Betrieb zusätzlich wenige ms je Abfrage).

Cloudflare begrenzt die Anzahl der Datenbankabfragen je Aufruf. Deshalb arbeiten Agent, Importe, Push-Zustellung und Fahrzeugakte
mit Sammelabfragen; die Anzahl der Abfragen hängt nicht mehr von der Zahl der Vorgänge oder Fahrzeuge ab (Agent: höchstens ≈ 33 statt
zuvor ≈ 9000 bei 3000 offenen Vorgängen). Ein Test prüft bei jedem Lauf, dass jeder API-Aufruf ≤ 50 Abfragen braucht.
Betrieb und Testumgebung laufen in getrennten Cron-Aufrufen (`*/15` bzw. `7,37`).

**Agent-Profil:** `node --experimental-sqlite scripts/agentprofil.mjs 150 3000` misst je Lauf Zeit, Abfragen und geschriebene Zeilen und
listet die teuersten Funktionen. Ergebnis 10.10.2026 (3000 offene Vorgänge, 3051 Befunde): erster Lauf ≈ 300 ms / 5055 Zeilen,
Folgeläufe ≈ 150 ms / 23 Abfragen / **2 geschriebene Zeilen** (vorher ≈ 320 ms und 3053 Zeilen je Lauf). Grund: Befundtexte nennen
den Zeitpunkt („seit 10.10.2026 14:05“) statt einer laufenden Minutenzahl, und unveränderte Befunde werden nicht neu geschrieben –
wichtig für das D1-Schreibkontingent (Gratis-Tarif 100 000 Zeilen/Tag bei 2 × 96 Läufen/Tag). In der Oberfläche steht je Befund „offen seit“.

## UI-Rauchtest (vor größeren Änderungen)
`sh scripts/restart-dev.sh && python3 scripts/ui-rauchtest.py [Screenshot-Ordner]` – ruft jede Ansicht für Inhaber, Fuhrparkleitung,
Werkstatt und Fahrer in Handy-, Tablet- und PC-Breite auf (174 Ansichten) und meldet JavaScript-Fehler, rote Fehlermeldungen,
fehlende Überschriften und waagrechtes Scrollen. Braucht Python-Playwright, nur lokale synthetische Daten. Stand 10.10.2026: 0 Auffälligkeiten.

## Nutzungsstatistik (Einführungsphase)
„Mehr → Nutzung der App“ (nur Inhaber) zeigt, wie oft welche Funktion aufgerufen wurde und wo Fehler auftraten – je Tag und Umgebung.
Gespeichert werden nur Tag, Umgebung, Funktionspfad (IDs, Kennzeichen, Token durch `:id` ersetzt) und Zähler (Tabelle `usage_daily`);
**keine** Benutzer-ID, Rolle, IP-Adresse oder Inhalte. Ein zusätzlicher Schreibzugriff je angemeldetem Aufruf (nach der Antwort, blockiert nichts).

## Was die App bewusst nicht tut
Keine automatische technische Fahrzeugfreigabe, keine Bestellungen oder kostenpflichtigen Aufträge, keine erfundenen Fristen,
Preise oder Kilometerstände, keine Fahrerzuordnung allein über Namen oder Kennzeichen.
