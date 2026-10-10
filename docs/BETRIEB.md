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

**Fotos/PDFs (KV `FILES`):** Schlüssel `<umgebung>/<Vorgangs-ID>/<Datei-ID>` bzw. `<umgebung>/fines/<Bußgeld-ID>/<Datei-ID>` (Zuordnung über Tabelle `files` in der Sicherung); Liste mit
`npx wrangler kv key list --binding FILES --remote`, einzelne Datei mit `npx wrangler kv key get <Schlüssel> --binding FILES --remote > datei`.

**Code:** GitHub-Repository; jede Version ist unter Cloudflare → Worker → Deployments zurückrollbar.

## Belastbarkeit (Lasttest)
`node --experimental-sqlite scripts/lasttest.mjs 150 3000` – synthetische Daten (Kennzeichen `LT-…`), nur im Arbeitsspeicher, nie in der echten Datenbank.
Ergebnis 10.10.2026 (150 Lkw, 3000 Vorgänge): Vorgang anlegen p95 ≈ 3 ms, Vorgangsliste ≈ 15 ms, Fahrzeugakte ≈ 2 ms,
Management-Panel ≈ 8 ms, Kostenbericht 12 Monate ≈ 230 ms, Fuhrparkagent-Lauf ≈ 300 ms (reine Anwendungslogik; D1 im Betrieb
zusätzlich wenige ms je Abfrage).

Cloudflare begrenzt die Anzahl der Datenbankabfragen je Aufruf. Deshalb arbeiten Agent, Importe, Push-Zustellung und Fahrzeugakte
mit Sammelabfragen; die Anzahl der Abfragen hängt nicht mehr von der Zahl der Vorgänge oder Fahrzeuge ab (Agent: höchstens ≈ 33 statt
zuvor ≈ 9000 bei 3000 offenen Vorgängen). Ein Test prüft bei jedem Lauf, dass jeder API-Aufruf ≤ 50 Abfragen braucht.
Betrieb und Testumgebung laufen in getrennten Cron-Aufrufen (`*/15` bzw. `7,37`).

## Was die App bewusst nicht tut
Keine automatische technische Fahrzeugfreigabe, keine Bestellungen oder kostenpflichtigen Aufträge, keine erfundenen Fristen,
Preise oder Kilometerstände, keine Fahrerzuordnung allein über Namen oder Kennzeichen.
