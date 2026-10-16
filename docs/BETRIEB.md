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
- **Protokoll je Person (15.10.2026, nur Inhaber):** Mehr → Benutzer → Knopf „Protokoll“ am Konto zeigt alle Protokolleinträge, die die Person ausgelöst hat oder die ihr Konto betreffen (Anmeldungen, Einladung, Rollen-/Umgebungswechsel, Sperren, Geräte). Hilfreich bei der Zugangsprüfung und beim Ausscheiden von Mitarbeitern. „Alle Personen“ hebt die Auswahl auf; der CSV-Export folgt ihr (Dateiname mit Benutzername). Die Aktionen stehen in der Ansicht als Text in der App-Sprache („Anmeldung“, „Benutzer geändert …“), der technische Code (z. B. `user.update`) klein daneben – Suche, Bereichsfilter und CSV arbeiten weiter mit dem Code. **Protokoll je Fahrzeug:** Fahrzeugakte → Knopf „Protokoll“ (nur Inhaber) zeigt die Einträge mit diesem Fahrzeug als Ziel (Stammdaten, Betriebsstatus, Bewertung, Prüftermine/HU-SP-Neuberechnung, Fahrerzuordnung, Hinweise, Telematik-Zuordnung); Vorgänge und Kontrollen stehen weiter in der Zeitleiste. Die Details stehen in der Ansicht ebenfalls in der App-Sprache („Kennzeichen: SZ-YC 5513 · Umgebung: Betrieb“, Änderungen als „alt → neu“); Werte bleiben unverändert, die CSV enthält weiter den JSON-Rohtext. „Betrifft: …“ nennt das betroffene Konto (Link zu dessen Protokoll) bzw. Fahrzeug (Link zur Fahrzeugakte). Die Suche findet auch das betroffene Konto bzw. Kennzeichen (z. B. HU/SP-Neuberechnung eines Fahrzeugs); die CSV hat dafür die Spalte „Betrifft“. Die Auswahl „Bereich“ deckt alle Aktionen ab, neu u. a. „Zugang & Sicherheit“ (Einladung, Passwort, Sitzungen, Zwei-Faktor, Ersteinrichtung, gesperrte Schnittstellen-Tokens), Reifen, Telematik-Zuordnung und Panne & Notfall. Das Protokoll ist mit „Drucken / PDF“ druckbar; der Ausdruckvermerk nennt die Auswahl (Bereich, Suche, Datum, Person, Fahrzeug, Anzahl).
- **Zwei-Faktor-Anmeldung (freiwillig, je Konto):** Mehr → Mein Konto → „Zwei-Faktor-Anmeldung“ → Einrichten (Passwort, QR-Code mit einer Authenticator-App scannen, ersten Code eingeben). Standard TOTP (RFC 6238, 30 s, 6 Ziffern) – kein Fremddienst, die App versendet nichts. Danach verlangt die Anmeldung zusätzlich den Code; jeder Code gilt nur einmal, falsche Codes zählen zur Sperre nach 8 Fehlversuchen, je Anmeldevorgang höchstens 5 Versuche in 5 Minuten. 10 Ersatzcodes werden einmalig angezeigt (gespeichert nur als Hash). Beim Einschalten enden die anderen Sitzungen des Kontos. Ein neuer Einladungslink (Passwort vergessen) ersetzt den Code nicht. Handy verloren: Inhaber → Mehr → Benutzer → „Zwei-Faktor zurücksetzen“ (beendet alle Sitzungen, Protokoll `totp.reset`). Das Geheimnis liegt serverseitig in D1 (nicht in Datensicherung oder Datenauskunft). **Empfehlung:** Inhaber und Fuhrparkleitung schalten sie ein – vorher Ersatzcodes ausdrucken. Eine Pflicht für bestimmte Rollen ist nicht eingebaut (Entscheidung des Inhabers).
- **Anmelde-Hinweis bei neuem Gerät (immer an):** Meldet sich jemand mit einem Konto auf einem Gerät an, das für dieses Konto neu ist, bekommt die Person selbst den Hinweis „Neue Anmeldung auf einem anderen Gerät“ (Gerät, Uhrzeit; App + Push, kein E-Mail-Versand) mit Sprung zu Mein Konto → „Meine Anmeldungen (Geräte)“. Erkennung über eine zufällige Gerätekennung im Browser (nur Hash in D1, Tabelle `known_devices`, max. 20 je Konto, Bereinigung nach 400 Tagen per Cron). Erste Anmeldung eines Kontos: kein Hinweis. Gelöschte Browserdaten oder privates Fenster gelten als neues Gerät. Protokoll `login.new_device` (Inhaber: Mehr → Protokoll).
  - **Bekannte Geräte (14.10.2026):** Mehr → Mein Konto → „Meine Anmeldungen (Geräte)“ zeigt darunter die bekannten Geräte (zuerst/zuletzt angemeldet, „dieses Gerät“). Altes oder verkauftes Handy dort **vergessen** – meldet sich danach jemand darauf an, kommt wieder der Hinweis. Das aktuelle Gerät lässt sich nicht vergessen. Die Benutzerliste zeigt je Konto „Bekannte Geräte: N“ und „Letzte Anmeldung“ (aus dem Protokoll; ältere Einladungs-Annahmen vor dem 14.10.2026 sind dort nicht erfasst → „Anmeldung noch nicht protokolliert“, bis sich die Person erneut anmeldet) – hilft bei der regelmäßigen Prüfung, ob ausgeschiedene Personen noch aktive Konten haben. Knopf „Berechtigungsübersicht (CSV)“ lädt alle Konten mit Rolle, Werkstatt, Umgebung, Status, 2FA, Push-Geräten und letzter Anmeldung (im Browser erzeugt, ohne interne Kennungen/Personalnummer); deaktivierte Konten tragen in der Liste den Chip „deaktiviert“. **Zugangsprüfung (14.10.2026, 19:15-Sitzung):** „Sortieren: Letzte Anmeldung (am längsten her zuerst)“ zeigt zuerst Konten ohne protokollierte Anmeldung, dann die am längsten nicht genutzten, offene Einladungen zuletzt (Auswahl bleibt in der Browsersitzung); CSV folgt derselben Reihenfolge. „Anzeigen“ grenzt auf aktive, deaktivierte, gesperrte Konten, offene Einladungen oder eine Rolle ein (CSV/Ausdruck folgen der Auswahl, die Hinweise zu 2FA/Push zählen immer alle Konten). „Drucken / PDF“ druckt die Liste mit Ausdruckvermerk (Zeitpunkt, Person, Sortierung, Anzahl) ohne Bedienknöpfe – als Nachweis der regelmäßigen Prüfung. **Lange nicht angemeldet (14.10.2026, 20:15-Sitzung, optional):** Einstellungen → „Benutzer – Hinweis bei Konten ohne Anmeldung seit Tagen“ (leer = aus, die App gibt keine Tage vor). Ist ein Wert eingetragen, nennt Benutzer die aktiven Konten, deren letzte protokollierte Anmeldung (ohne Protokoll: die Anlage des Kontos) länger zurückliegt, kennzeichnet sie in der Liste und bietet „Anzeigen: seit über N Tagen nicht angemeldet“ (Knopf „Diese anzeigen“). Deaktiviert wird nur von Hand – nichts automatisch. Offene Einladungen zeigen „Einladungslink gültig bis …“ bzw. „Einladungslink abgelaufen“ (7 Tage) – dann „Neuer Einladungslink“ erzeugen und weitergeben; die CSV-Spalte Status nennt den Ablauf ebenfalls. Die Uhrzeit im Hinweis steht in der Schreibweise der Sprache der Person (Berliner Zeit).

## Push-Benachrichtigungen
- Jede Person aktiviert Push auf jedem Gerät selbst unter „Hinweise“. Mehrere Geräte pro Person möglich.
- **Benutzer-Liste** (Inhaber/Fuhrparkleitung) zeigt je Konto die Zahl angemeldeter Push-Geräte bzw. „kein Push-Gerät“ und oben einen gelben Hinweis, wenn aktive Betriebskonten (außer Lesezugriff) kein Gerät haben – dringende Hinweise wie eine Fahrzeugsperre erreichen sie dann nur beim Öffnen der App. Bei der Einführung Push auf jedem Fahrerhandy einschalten lassen. Nur Anzahl, keine Gerätedetails.
- iPhone/iPad: zuerst „Teilen → Zum Home-Bildschirm“, dann die App vom Home-Bildschirm öffnen und Push aktivieren (Apple-Vorgabe).
- Unter „Hinweise → Push für diese Hinweise“ kann jede Person nicht dringende Arten abwählen (bleiben in der App sichtbar). Dringende Hinweise kommen immer.
- **Ruhezeit je Person** (ebenda, „von–bis“, Uhrzeit Deutschland, auch über Mitternacht, z. B. 22:00–06:00 oder die Ruhezeit am Steuer): in dieser Zeit nur dringende Pushs (kritisch, nicht fahrbereit, Sperre). Andere Hinweise stehen sofort in der App (Push-Status „zurückgehalten (Ruhezeit) bis …“); nach dem Ende stellt der Cron (alle 15 Min.) sie als **einen** Sammel-Push je Person zu – in der App bereits geöffnete nicht mehr. Wiederholte und nachgeholte Pushs kommen in der **aktuellen** Sprache der Person (wie die Hinweisliste), auch wenn sie seit dem Ereignis umgestellt hat. Standard: keine Ruhezeit; die App gibt keine Zeiten vor. Protokoll `user.push_quiet`.
- **Sprache:** Pushs gehen in der Sprache, die die Person beim Versand eingestellt hat. Die Hinweisliste in der App zeigt Titel und Text danach in der **aktuellen** Sprache (Priorität, Prüfergebnis/-datum, Agent-Befunde, Anmelde-Hinweis; Datumswerte DE/UK TT.MM.JJJJ, EN TT/MM/JJJJ). Gespeichert und in der Datenauskunft bleibt der Text wie versandt; nicht erkennbare Texte werden unverändert angezeigt. **Sprachangabe im Push (16.10.2026):** Jeder Push nennt die Sprache seines Textes (`lang`, Migration 0053 `notifications.lang`), damit das Handy ihn mit der richtigen Stimme vorliest (z. B. Ukrainisch statt deutscher Aussprache). Beim Nachholen (Wiederholung, Ende der Ruhezeit): übersetzter Text → aktuelle Sprache, nicht übersetzbarer Freitext → gespeicherte Sprache, ältere Hinweise ohne gespeicherte Sprache → ohne Angabe (Gerät entscheidet). Behoben: die **Testbenachrichtigung** (Mein Konto → Push testen) kam bisher immer auf Deutsch, weil die Sprache der angemeldeten Person serverseitig nicht vorlag. **Uhrzeit nachgeholter Pushs:** Der Push trägt den Zeitpunkt des Ereignisses (`ts`); das Handy zeigt bei Wiederholung oder nach der Ruhezeit die echte Uhrzeit (z. B. 23:10) statt der Zustellzeit (06:00). **Tippen auf den Push** öffnet wie die Hinweisliste den Vorgang; der Anmelde-Hinweis („Neue Anmeldung auf einem anderen Gerät“) öffnet direkt Mein Konto → „Meine Anmeldungen (Geräte)“, um ein fremdes Gerät sofort abzumelden; „Prüfung mit gefährlichen Mängeln“ öffnet die Fahrzeugakte, ein einzelner kritischer Agent-Befund ohne Vorgang (z. B. Reifen unter Mindestprofil) die Fahrzeugakte, „Neues Schreiben einer Behörde“ beim Fahrer das Bußgeld (Bezug `ref`, Migration 0054; gilt in der Hinweisliste genauso); alle übrigen die Hinweise.
- „Push vom Dienst angenommen“ ist kein Lesenachweis: Empfang, Öffnen und „Gesehen“ werden getrennt gespeichert.
- Fehlgeschlagene Pushs werden bis zu 3× wiederholt; dringende, nicht zugestellte Hinweise meldet der Agent.
- Pushs des Fuhrparkagenten an Inhaber/Fuhrparkleitung kommen in der Sprache der Person und ohne Kennzeichen/Namen (Sperrbildschirm): ein neuer kritischer Befund als Kurzbezeichnung mit Code in Klammern (z. B. „Reifen unter Mindestprofil (TIRE_BELOW_MINIMUM)“), mehrere als „N neue kritische Befunde“, neue Termine/Fristen als ruhige Sammel-Erinnerung („2× Prüftermin bald fällig“). Details stehen im Management-Panel.
- Neue fällige/überfällige Prüftermine und ablaufende Behördenfristen meldet der Agent als eine ruhige Sammel-Erinnerung je Lauf (Vorlauf = „Vorwarnung Tage“ in den Einstellungen). Fahrzeugverträge (Ende, Kündigungstag, km-Kontingent) mit eigener Vorwarnung „Verträge – Vorwarnung“ (Standard 60 Tage). Versicherungsfälle ohne Regulierung nur, wenn unter Einstellungen „Versicherungsfälle – nachfassen nach Tagen“ eingetragen ist (leer = aus; die App setzt keine eigene Frist). Ebenso Vorgänge ohne Bewegung (bewertet, übernommen oder in Reparatur, aber seit so vielen Tagen keine Änderung – auch kein Kommentar) nur mit „Vorgänge – nachfassen nach Tagen ohne Änderung“.

## Ohne Netz (Funkloch)
- Ist die App einmal mit Netz geöffnet worden, startet sie auch ohne Netz: Startseite mit „Mein Fahrzeug“ (Stand der letzten Verbindung), Schadensmeldung und Abfahrtskontrolle werden auf dem Gerät gespeichert und automatisch gesendet.
- Auf dem Gerät gespeichert werden nur Anzeigedaten (Name, Rolle, Fahrzeugliste) – keine Passwörter. „Abmelden“ löscht diese Daten.

## Panne & Notfall (Rufnummern für unterwegs)
- Seite „Panne & Notfall“ für alle Rollen: Startseite der Fahrer, Mehr, Scan-Seite des Fahrzeug-QR-Aufklebers (dort zusätzlich die Nummern für dieses Fahrzeug). Oben fest nur der Notruf 112 – alle anderen Nummern trägt der Betrieb selbst ein (die App gibt keine vor).
- Pflege unter „Rufnummern pflegen“ (Inhaber, Fuhrparkleitung, Disposition): Art (Disposition, Pannendienst/Schutzbrief, Werkstatt/Bereitschaft, Versicherung, Sonstiges), Bezeichnung, Telefonnummer, Hinweis (z. B. „Vertragsnummer angeben“), Geltung für alle Fahrzeuge, einen Standort (laut Fahrzeugstamm) oder ein Fahrzeug. Höchstens 50 aktive je Umgebung; Archiv statt Löschen; Protokoll `emergency.*`.
- Test und Betrieb sind getrennt: Nummern für die Fahrer im Betrieb unter der Ansicht „Betrieb“ eintragen.
- Ohne Netz zeigt die Seite den zuletzt auf diesem Gerät geladenen Stand (mit Zeitpunkt). Bei der Einführung die Seite daher auf jedem Fahrerhandy einmal mit Netz öffnen.
- Vor der Einführung: echte Nummern (Disposition, Pannendienst laut Leasing-/Versicherungsvertrag) durch den Inhaber eintragen – Claude trägt keine Nummern ein.

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
| Lager, Bestellvorschlag, Lagerjournal, Inventurdifferenzen, Bestand zum Stichtag | ✓ | ✓ | ✓ | – | – | – |
| Wiedervorlagen (.ics) | ✓ | ✓ | – | ✓ | ✓ | – |
| Durchgeführte Prüfungen, Kosten, Kennzahlen, Bußgelder (+ .ics; Fahrernamen nur Inhaber/Leitung) | ✓ | ✓ | – | – | ✓ | – |
| Verträge (+ .ics), Fahrer, Auslesungen, Versicherungsfälle, Telematik – letzter Stand je Fahrzeug | ✓ | ✓ | – | – | – | – |
| Protokoll (Audit-Log) | ✓ | – | – | – | – | – |
| Agentenbefunde (Management-Panel, im Browser erzeugt, in der App-Sprache) | ✓ | ✓ | – | – | – | – |

Exporte mit Personen- oder Kostenbezug werden im Protokoll vermerkt.
Hilfe in der App: „Ausdrucke & Exporte“; Benutzerverwaltung, Zugangsprüfung und Protokoll: „Benutzer, Zugänge & Protokoll“ (Inhaber/Fuhrparkleitung).

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

Messung 14.10.2026, 09:30 UTC (`npm run lasttest`, Gesamtlauf ≈ 28 s, Prüfung bestanden – höchster Wert Fuhrparkagent 30 Abfragen, Fahrzeugdetail 22; p50/p95): Vorgang anlegen 1,8/4,2 ms (10 Abfragen), Vorgangsliste 25/29 ms, Startseite mit 500 offenen 51/55 ms, Fahrzeugliste 16/21 ms, Kennzahlen inkl. Mängel 92/119 ms, Mängelstatistik 365 Tage 194/235 ms, Vorgänge-CSV 3000 Zeilen ≈ 210 ms, Integrations-API `/v1/kpi` 104/124 ms, Fuhrparkagent (Cron-Lauf) ≈ 303 ms / 29 Abfragen. Die Werte liegen etwa 15–40 % über der Messung vom 13.10.; Gegenprobe mit dem damaligen Stand c168111 in derselben Umgebung ergab dieselben Werte (Startseite 54 ms, Mängelstatistik 211 ms, Agent 282 ms) – also Unterschied der Messumgebung, **keine Verschlechterung durch neuen Code**. Alle Werte weiter unkritisch.

Browser-Lasttest Management-Panel (14.10.2026, 04:40 UTC, `scripts/ui-lastpanel.py 3000 --check` gegen frischen Dev-Server; Befunde nur über den lokalen Dev-Endpunkt `/__dev/seed-findings`, den es im Worker nicht gibt): 3000 offene Befunde → `/api/master` ≈ 1,25 MB / 81 ms lokal, Panel gerendert in ≈ 0,4 s (390 und 1366 px, Headless-Chromium), CSV-Export im Browser ≈ 0,1 s, kein Querscrollen. Im Betrieb (≈ 40–150 Fahrzeuge, typischerweise < 200 Befunde) unkritisch; erst bei dauerhaft vierstelligen Befundzahlen Seitenweise-Laden erwägen.

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

## Gesamtprüfung `scripts/pruefen.sh`
`sh scripts/pruefen.sh [--schnell] [--ohne-tests] [--ohne-rauch] [--nur <Namensteil>]` – `npm test`, alle UI-Skripte (Liste `UI_SKRIPTE` im Skript, je frischer Dev-Server) und die Rauchtests; bricht beim ersten Fehler mit Fehlercode ab.
`--schnell` nur Rauchtest hell (ohne dunkel/Ukrainisch/Englisch/HTML-Probe/Zeitreise/UI-Zeitreise), `--ohne-tests` überspringt `npm test`, `--ohne-rauch` lässt Rauchtests und Zeitreise weg,
`--nur hoechstzahl` führt nur passende UI-Skripte aus (z. B. nach einer gezielten Änderung). Der Gesamtlauf dauert über 15 Minuten – im Hintergrund starten und die Logdatei prüfen.
Neues UI-Skript: eine Zeile „Bezeichnung|Skript|Logdatei“ in `UI_SKRIPTE` ergänzen; ein Wächter-Test meldet Skripte, die dort fehlen (Ausnahme: Lasttest `ui-lastpanel.py`).

## UI-Zeitreise `scripts/ui-zeitreise.sh`
`sh scripts/ui-zeitreise.sh [--alle]` (≈ 12 Min.; `--alle` ≈ 30 Min.) – die datumsabhängigen UI-Skripte (Zahlen-/Datumsformat, Ablauf, Gewährleistung, Inventur, Artikelverlauf, Kosten, Zeitleiste, Protokoll, Kennzahlen, Winterreifen) zu vier Zeitpunkten: Silvester 23:30 UTC (Berlin schon 01.01.), Monatswechsel nach Berliner Mitternacht, Nacht der Zeitumstellung im Oktober, ein Märztag mit einstelligem Tag. Der Dev-Server läuft dazu mit `scripts/zeitreise.mjs` (`CFP_FAKE_NOW`, `restart-dev.sh` wertet es aus), die Skripte mit `PYTHONPATH=scripts/zeitreise_py` (`sitecustomize.py` stellt die Playwright-Uhr jeder neuen Seite und `datetime`/`time` in Python auf denselben Zeitpunkt; die Uhr läuft normal weiter). Einzeln: `CFP_FAKE_NOW=2026-12-31T23:30:00Z sh scripts/restart-dev.sh && CFP_FAKE_NOW=2026-12-31T23:30:00Z PYTHONPATH=scripts/zeitreise_py python3 scripts/ui-rauchtest.py`. Teil der vollen Prüfung `scripts/pruefen.sh` (nicht `--schnell`). Anlass 15.10.2026: Die Oberfläche zeigte deutsche Datumsangaben an Tagen/Monaten < 10 ohne führende Null („1.1.2027“, „5.3.2027“) – im Entwicklungszeitraum (10.–15.10.) nie sichtbar; behoben (`dateOpts` in `public/app.js`, Test).

## Robustheits-Lauf `npm run fuzz`
`scripts/fuzz-api.mjs` (≈ 40 s, In-Memory-DB, synthetische Daten) schickt rund 39 000 Störanfragen an die API: alle festen GET-Pfade (aus `src/worker.js` gelesen) × Abfrageparameter × Störwerte (Kommazahl, negativ, Text, Liste, ungültiges Datum, sehr lang), jedes Feld der wichtigsten schreibenden Endpunkte und Vorgangsbefehle mit falschen Typen (null, Zahl, Liste, Objekt, nur Leerzeichen …), ändernde Endpunkte auf bestehende Datensätze (Verträge, Lagerartikel/-buchungen/-bestellungen/Inventur, Fahrerakte samt Dokumenten und Führerscheinkontrollen, Auslesungen, Versicherungsfall, Panne-Rufnummern, Prüftermine anlegen/planen/beauftragen/durchführen/Ergebnis, Reifen, Fahrzeugdaten, Fahrerzuordnung, Telematik-Zuordnung, Bußgeld-Befehle), gekürzt dasselbe für alle anderen Rollen (Fuhrparkleitung, Werkstatt, Disposition, Fahrer, Nur-Lesen – eigene Codepfade wie Lager der eigenen Werkstatt, nur eigene Daten), ungültige Kennungen im Pfad (unbekannt, überlang, Sonderzeichen, andere Datensatzart, unbekannte FIN), unerwartete HTTP-Methoden an allen festen Pfaden (mit/ohne Anmeldung), Testkonten mit „gemeinsame Stammdaten nur lesen“, gleichzeitige gleiche Anfragen (je 6 parallel; gleicher Schlüssel → genau ein Datensatz, Befehl mit gleicher `command_id` genau einmal, kein negativer Lagerbestand), Körper ohne JSON-Objekt, CSV-Importe (leer, binär, UTF-16, offene Anführungszeichen, 50 000 Spalten, Formeln) als Vorschau und Übernahme, Datei-Uploads sowie die Integrations-API (Abfragen und Telematik-Lieferungen). Jede Antwort ≥ 500 ist ein Fehler (Fehlercode 1); der Lauf muss überwiegend erfolgreiche Antworten haben (sonst war er nicht angemeldet). Teil von `scripts/pruefen.sh` (außer mit `--ohne-tests`). Anlass 15.10.2026: „limit=2.5“, Körper „null“, Name „[]“ und Telematik „items: [null]“ lieferten „Interner Fehler“; Erweiterung am selben Abend: Lagerartikel auf vorhandenen Namen umbenennen, Lager als Liste Prüfdatum „0000-00-00“ mit Intervall und Reifengröße für ein unbekanntes Fahrzeug ebenso (behoben, Test).

## UI-Rauchtest (vor größeren Änderungen)
`sh scripts/restart-dev.sh && python3 scripts/ui-rauchtest.py [Screenshot-Ordner]` – ruft jede Ansicht für Inhaber, Fuhrparkleitung,
Werkstatt und Fahrer in Handy-, Tablet- und PC-Breite auf (267 Ansichten, inkl. Bußgeld-/Lager-/Vorgangsdetails je Rolle, Disposition, Fahrerakte, Auslesungen, QR-Aufkleber, Vorgang und Kontrollformular) und meldet JavaScript-Fehler, abgebrochene Ansichten, rote Fehlermeldungen,
fehlende Überschriften, waagrechtes Scrollen sowie (Handybreite) Felder ohne Beschriftung, Bilder ohne Alternativtext, Schaltflächen/Links ohne Text und sichtbare ISO-Daten (JJJJ-MM-TT im Text statt im Format der Sprache; seit 16.10.2026). Braucht Python-Playwright, nur lokale synthetische Daten. Stand 10.10.2026: 0 Auffälligkeiten.
Mit `CFP_LANG=uk` bzw. `CFP_LANG=en` laufen alle Konten in dieser Sprache; zusätzlich werden sichtbare deutsche Texte (Umlaute) gemeldet.
Mit `CFP_XSS=1` läuft die **HTML-Einschleusungs-Probe**: Nach der Vorbereitung hängt der lokale Dev-Server (`POST /__dev/taint`, nur in `scripts/dev-server.mjs`, nicht im Worker) an alle Freitexte der Datenbank (Kennzeichen, Standort, Beschreibungen, Namen, Behörde, Partner, Nachweise, Vermerke, Hinweistexte …) `"'><b data-xss=1>X</b>` an; IDs, Datums-/Statuswerte, Schlüssel und JSON bleiben unverändert. Jede Bildschirm- und Druckansicht darf kein eingeschleustes Element enthalten (Freitext muss als Text erscheinen); der Test schlägt auch fehl, wenn die Probe wirkungslos war (Probetext in < 50 Ansichten sichtbar). Zusätzlich ruft die Probe für Inhaber/Fuhrparkleitung Direktsprünge mit der Probe in der Adresse auf (`#/master?q=`, `#/help?q=`, `#/search?q=`, `#/vehicles?f=`, `#/cases?f=`). Stand 14.10.2026: 36 Spalten, 540 Ansichten + 38 Druckansichten, 0 Einschleusungen, Probetext in 453 Ansichten als Text. Teil der vollen Prüfung `scripts/pruefen.sh`.

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

- Dev-Server (nur lokal): `POST /__dev/backdate?case=<id>&hours=<N>` datiert einen Vorgang samt Ereignissen um N Stunden zurück (Dauer-/Ausfall-Anzeigen prüfen; genutzt von `ui-kpi-ausfall.py` und dem Rauchtest); `POST /__dev/backdate?vehicle=<VIN:…>&hours=<N>` datiert die Anlage eines Fahrzeugs zurück (technische Verfügbarkeit zählt erst ab Anlage; `ui-kpi-verfuegbarkeit.py`).
