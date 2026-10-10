# [CLAUDE] Telematik Webfleet & YellowFox – Bestandsaufnahme (Stand 10.10.2026, 18:xx MESZ)

Auftrag des Inhabers 10.10.2026: technische Übernahme der bestehenden Webfleet-/YellowFox-Integration (n8n, Google Sheets, Neon),
**ohne** Neuentwicklung, ohne Überschreiben vorhandener Workflows, ohne Veröffentlichung ungeprüfter Änderungen.
Diese Datei enthält nur, was **nachgewiesen** gelesen bzw. getestet wurde. Alles andere steht unter „Nicht geprüft“.

## 1. Quellen, die tatsächlich gelesen wurden
| Quelle | Zugriff | Ergebnis |
|---|---|---|
| MASTER-CHECKPOINT v1.0 (Drive-Doc 130lB6Loc…, 145 968 Zeichen) | Drive, nur lesen | vollständig extrahiert; Telematik-Abschnitte (ab „ENDE DES FREIGEGEBENEN MASTER-CHECKPOINTS v1.0“) vollständig gelesen, übrige Abschnitte (Abrechnung, Dispo, Portal-Desktop) nur nach Stichworten durchsucht |
| Google Sheet „CEVIK YellowFox – Telemetrie“ (18lEpJWb…) | Drive, nur lesen | Struktur aller 9 Tabellenblätter; Blatt „Positionen“ vollständig (894 Datenzeilen) ausgewertet |
| Prüfpaket Quellenmonitor (Drive 1P1VWIp7…, 26 Dateien) | Drive, nur lesen | 25/25 SHA-256 geprüft; Tests unabhängig erneut ausgeführt (Abschnitt 6) |
| n8n (Instanz, Workflows, Executions, Credentials) | **kein Zugang** | nicht geprüft |
| Neon (PostgreSQL) | **kein Zugang** | nicht geprüft |
| ChatGPT-Portal V8 (Sites) | kein Zugang | nicht geprüft |

## 2. Workflows laut MASTER-CHECKPOINT (nicht selbst verifiziert)
| ID | Zweck | Stand laut Checkpoint |
|---|---|---|
| k5DduArvxYLg3Eok | Webfleet-Abruf (Positionen, Restlenkzeiten) | aktiv; Läufe 524/527/530 SUCCESS |
| hreGSvOvRfi3OJsZ | YellowFox-Flotte (18 Geräte, RTI, 15-Minuten-Takt, appendOrUpdate auf Blatt 1184202301, Schlüssel „Ereigniskennung“) | aktiv; Läufe 522/526/529 SUCCESS |
| QUYcJ63975Lq7dFR | Fuhrpark-Monitor (14 Prüfschlüssel, Blatt „Fuhrpark Monitor“) | aktiv, Version 7ade421d…; **unveröffentlichter Korrekturentwurf 153acd06…** |
| iR3x5eaIUw2zVCpw | YellowFox-Einzelpilot | absichtlich deaktiviert (Doppelschreibung) – nicht reaktivieren |
| DAPynydnq2P6Ld7N | Orchestrator (stündlich, liest Monitor, schreibt „Fuhrpark Agent“) | aktiv, Version 39f090d8… |

## 3. Schnittstellen (laut Checkpoint/Sheet, ohne Geheimnisse)
- **Webfleet WEBFLEET.connect** (Reference Guide 1.75.0): HTTP Basic Auth (Webfleet-Benutzer „CEVIK-API“), Parameter `account` (Kundennummer) und `apikey` (36 Zeichen); Limit 10 Aufrufe/Minute je Aktion. Genutzt: `showVehicleReportExtern` (Fahrzeuge, objectno/objectuid, Kennzeichen, Position, km), `getRemainingDrivingTimesEU` (Restlenkzeiten je Fahrer). Fehlercode 8014 „external request not allowed“ trat historisch auf.
- **YellowFox RTI**: Endpunkt-URL und Anmeldeart **nicht dokumentiert** (weder im Checkpoint noch im Sheet). Felder laut Sheet: Gerätebezeichnung, RTI Ident, GPS-Zeit, km, Lat/Lon, Geschwindigkeit, Zündung, Empfangszeit.

## 4. Datenhaltung Google Sheet „CEVIK YellowFox – Telemetrie“
| Blatt | Inhalt | Zeilen |
|---|---|---|
| Positionen | YellowFox-Historie (Ereigniskennung = [Quelle, Gerätebezeichnung, RTI, GPS-Zeit]) | 894 |
| Webfleet Positionen | 24 Webfleet-Objekte inkl. Zuordnungsstatus, Fahrer-UID/Name, Arbeitsstatus, Standort | 24 |
| Webfleet Restlenkzeiten | 27 Fahrer: Restlenkzeit heute/Woche/nächste Woche, nächste Pause/Ruhe, Schichtgrenzen, Verstöße | 27 |
| Fuhrpark Abgleich | 38 Lkw ↔ Webfleet-UID / YellowFox-RTI mit Zuordnungsstatus (einmaliger Snapshot 09.10.2026 23:00 UTC) | 38 |
| Fuhrpark Prüffälle | offene Identitätsfälle F1…F8 | 8 |
| Fuhrpark Monitor | 14 Prüfschlüssel (Quell-Health, Mapping, Send-Gate …) | 14 |
| Fahrzeug Zusatzdaten | Reifengrößen aus Dortmund-Datei | 38 |
| Fuhrpark Agent | Orchestrator-Befunde | 15 |
| Fahrzeugakten Übersicht / Schadensmeldungen TEST | Formelansicht / leere Teststruktur | 38 / 0 |

## 5. Datenqualität „Positionen“ (eigene Auswertung, Abruf bis 10.10.2026 15:45 UTC)
- 894 Zeilen, **0 Dubletten** der Ereigniskennung, **0 GPS-Zeiten in der Zukunft**, **0 Kilometer-Rückläufe** je Gerät.
- 18 Gerätebezeichnungen. Abweichungen Bezeichnung ↔ RTI:
  - „SZ KC 5515“ → RTI „SZ-YC 5515“ (Stammliste: SZ-KC 5515; Prüffall F1)
  - **„SZ-YC 5523“ → RTI „SZ-YC 5531“** (aktuell sendend, 0,0 h alt) und „SZ-YC 5523 / 2G Box“ → RTI „SZ-YC 5523“ (letzte Position 20.03.2026). SZ-YC 5531 ist laut Dortmund-Datei abgemeldet. → Gerätetausch/Umbau möglich; **keine automatische Zuordnung** (Prüffall F2).
  - „SZ-YC 5521APP“ ohne RTI, letzte Position 15.10.2025 (App-Datensatz, veraltet)
  - Zusätze „-Cevik_16/-Cevik15/-Cevik14“ bei 5535/5537/5552 (Kennzeichen eindeutig)
- Veraltete Positionen (> 24 h zum letzten Abruf): SZ-YC 5517 (45,9 h, nur 1 Datensatz), SZ-YC 5521APP, SZ-YC 5523 / 2G Box. Zwischen 21 und 24 h: 5521, 5525, 5537, 5546.
- **SZ-YC 5539** sendet aktiv (0,1 h) → spricht dafür, dass der Stammlisten-Eintrag (FIN WDB96340510318431) das eingesetzte Fahrzeug ist; der ruhende Doppel-Eintrag (WDB96300510318431) bleibt offen (Frage an Inhaber).
- Webfleet: Objekte 001/002 „Wird installiert“ ohne FIN, GPS vom 24.06.2026 (veraltet); SZ-CM 5501 mit abweichendem Quellkennzeichen „ABI AK 562“.

## 6. Unabhängig wiederholte Tests (Prüfpaket Quellenmonitor)
| Test | Live-Version (baseline) | Korrekturentwurf |
|---|---|---|
| Monitor-Regression | 18/18 PASS | 18/18 PASS |
| Orchestrator-Regression | 14/14 PASS | 14/14 PASS |
| Teilquellen (neu) | **3/8 PASS, 5 FAIL** | **8/8 PASS** |
Damit ist der im Checkpoint beschriebene Fehler (ein frischer Datensatz verdeckt veraltete Teilquellen → falsche „OK“-Entwarnung) unabhängig bestätigt, ebenso, dass der Entwurf ihn behebt, ohne bestehende Fälle zu brechen. **Nicht geprüft:** Ausführung in n8n selbst, Live-Daten, Seiteneffekte im Graph. Veröffentlichung nur nach Prüfung im n8n und Freigabe des Inhabers.

## 7. Nicht geprüft / offene Integrationsschritte
1. **n8n-Zugang** (Instanz-URL; Anmeldung durch den Inhaber im Browser, dann nur lesend): Workflow-Graphen, Endpunkte/Parameter, Retry/Fehlerbehandlung, Credentials-Typen (ohne Werte), letzte Executions.
2. **Neon**: Schema und Nutzung unbekannt (Checkpoint erwähnt n8n/PostgreSQL) – Zugang/Connection nur über Inhaber.
3. **YellowFox-API-Doku** (Endpunkt, Anmeldeart).
4. Datenweg in die Cevik-Fuhrpark-App (Cloudflare): Vorschlag – zusätzlicher, **getrennter** n8n-Workflow „[CLAUDE] Telematik → Fuhrpark-App“, der die bereits normalisierten Daten liest und an `/api/integration/v1/telematics` (Bearer-Token, nur FIN/bestätigtes Mapping) übergibt. Bestehende Workflows bleiben unverändert. Erst nach Freigabe.
5. Lenk-/Ruhezeiten: Quelle Webfleet `getRemainingDrivingTimesEU` (nur Webfleet-Fahrzeuge, v. a. München); YellowFox-Fahrerzeiten unbekannt. Fahrerzuordnung laut Sheet überwiegend „Nicht aktuell bestätigt“ → keine Fahrermitteilungen (Send-Gate bleibt GESPERRT).
6. Prüffälle F1–F8 und 14 Kennzeichen-Kandidaten brauchen Nachweise (Gerät ↔ FIN) vom Fuhrpark/Telematik-Admin.
