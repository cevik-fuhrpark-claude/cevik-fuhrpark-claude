# [CLAUDE] CEVIK Fuhrpark

Fuhrparkmanagement für die Cevik Mobility GmbH (Fahrzeugtransport, ca. 40 Lkw, ausgelegt für 100+).
Eigenständig entwickelt von Claude als Vergleichsprojekt; getrennt vom ChatGPT-Portal.

**Funktionen:** digitale Fahrzeugakte · Schadensmeldung per Handy mit Foto · Prioritäten niedrig/mittel/kritisch mit
Sicherheitssperre · Werkstatt-Eingang, Übernahme, Arbeitszeit, Teile, Fremdrechnungen, Restarbeiten · Pflicht-Fahrzeugkontrolle
nach Reparatur (Mängel werden automatisch Folgeaufträge) · Abfahrtskontrolle · technische Freigabe nur durch Menschen ·
Wartung/HU/SP/UVV, Ausrüstung und Herstellerrückrufe mit Nachweis, Prüftermin-Übersicht mit Lückenliste und belegtem CSV-Import · Kilometerstände · Fahrzeugverträge (Leasing/Miete/Versicherung: Kündigungstag, km-Kontingent) · Kosten je Vorgang und Fahrzeug (unbewertet statt 0 €) ·
Push-Benachrichtigungen mit Zustell-/Lesequittung · Fuhrparkagent + Management-Panel · KI-Analyse der Schadenshistorie ·
Fahrerakte (Führerschein, Fahrerkarte, Code 95, Unterweisungen) und Auslesungen Fahrerkarte/Fahrtenschreiber · Bußgelder & Anhörungen ·
Versicherungsfälle · Reifen je Fahrzeug (inkl. Winterreifen-Nachweis und Reifenalter laut DOT) · Ersatzteillager mit Bestellvorschlag · Werkstattplan und Disposition (Verfügbarkeit, Sperren) ·
Kennzahlen Instandhaltung, Mängelstatistik, Kosten je Fahrzeug · Datenqualität (Lücken/Widersprüche, CSV) · Protokoll und Datensicherung ·
Druck/PDF, CSV- und Kalender-Exporte je Rolle · Hilfe je Rolle mit Suche · Deutsch/Українська/English · getrennte Test- und Betriebsumgebung · Integrations-API.

**Technik:** Cloudflare Worker + D1 (EU) + KV (EU) + Workers AI, PWA ohne Framework, keine Laufzeitabhängigkeiten.

| Dokument | Inhalt |
|---|---|
| `docs/CHECKPOINT.md` | Projektstand, Infrastruktur, Backlog – Startpunkt jeder Entwicklungssitzung |
| `docs/HISTORIE.md` | Vollständiger Verlauf aller erledigten Punkte und Sitzungen |
| `docs/API.md` | App- und Integrationsschnittstellen, Befehle, Befundcodes |
| `docs/BETRIEB.md` | Einrichtung, Benutzer, Push, Exporte je Rolle, Sicherung, Prüfskripte |

```bash
npm test                                            # 212 Abnahmetests (Node ≥ 22)
sh scripts/pruefen.sh [--schnell]                  # Tests + UI-Ablauf + Leerlauf + UI-Rauchtest (+ dunkel/Ukrainisch/Zeitreise)
node --experimental-sqlite scripts/dev-server.mjs  # lokale Oberfläche auf :8787 (In-Memory-Daten)
```
Deployment: Push auf `main` → Cloudflare Workers Builds (`node scripts/build-schema.mjs`, `npx wrangler deploy`).
