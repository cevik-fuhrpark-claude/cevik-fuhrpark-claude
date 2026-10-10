# [CLAUDE] Betrieb & Einrichtung

## Ersteinrichtung
1. Cloudflare → Worker `cevik-fuhrpark-claude` → Einstellungen → Variablen und Geheimnisse → Secret `SETUP_CODE` (beliebiges langes Codewort).
2. App-Adresse öffnen → „Ersteinrichtung“ → Codewort, Benutzername, Name → Passwort festlegen. Danach ist die Ersteinrichtung gesperrt.
3. „Mehr → Einstellungen → Fahrzeugstamm importieren“: `seed/fuhrpark_stammliste.csv` (38 Lkw aus der Fuhrpark-Stammliste).

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

## Fristen und Kosten
- Reaktionsfristen (Erstbewertung, Werkstatt-Übernahme) je Priorität unter „Einstellungen“. Leer = keine Frist (der Agent meldet dann „Frist nicht konfiguriert“).
- Interner Werkstatt-Stundensatz: ohne Wert bleiben Arbeitsstunden „unbewertet“.

## Sicherung
- D1: Cloudflare „Time Travel“ (Wiederherstellung auf jeden Zeitpunkt der letzten 30 Tage, im Dashboard unter D1 → Datenbank).
- Dateien (KV): Export über Cloudflare-Dashboard bzw. Wrangler `kv key list` / `kv key get`.
- Code: GitHub-Repository; jede Version ist über Cloudflare „Deployments“ zurückrollbar.

## Was die App bewusst nicht tut
Keine automatische technische Fahrzeugfreigabe, keine Bestellungen oder kostenpflichtigen Aufträge, keine erfundenen Fristen,
Preise oder Kilometerstände, keine Fahrerzuordnung allein über Namen oder Kennzeichen.
