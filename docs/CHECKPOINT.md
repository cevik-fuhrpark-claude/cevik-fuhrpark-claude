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
`npm test` → 30 automatisierte Abnahmetests (T02–T18 der Projektdokumentation + Sicherheit). Lokaler UI-Server:
`node --experimental-sqlite scripts/dev-server.mjs` (Port 8787, In-Memory-DB).

## Stand 10.10.2026
- [x] Backend vollständig für Schaden → Werkstatt → Kontrolle → Freigabe, inkl. Rollen, Test/Betrieb, Push, Agent, Master-Panel
- [x] Oberfläche mobil/Tablet/PC, drei Sprachen
- [x] 30/30 Tests grün, UI per Headless-Browser geprüft
- [x] Cloudflare D1/KV angelegt, GitHub verbunden, erster Build gestartet
- [x] Erster Deploy verifiziert (https://cevik-fuhrpark-claude.y-cevik.workers.dev), D1-Migration live, Secret `SETUP_CODE` gesetzt
- [ ] Inhaber-Konto durch Auftraggeber anlegen (Ersteinrichtung), dann Fahrzeugstamm (38 LKW) importieren
- [ ] Testkonten Fahrer/Fuhrparkleitung/Werkstatt anlegen; Einladungslinks an Auftraggeber

## Backlog (in dieser Reihenfolge)
1. Deploy prüfen, Ersteinrichtung, Seed importieren, gehosteter Rundgang (Fahrer → Fuhrpark → Werkstatt → Freigabe) + Screenshots.
2. Reifenmanagement (Reifen je Achse/Position, Profiltiefe, Wechselhistorie; Import „Fahrzeug Zusatzdaten“).
3. Ersatzteillager (Bestand, Mindestmenge, Entnahme je Vorgang → Kosten).
4. Bußgeld/Zeugenfragebogen: Fahrerermittlung zum Zeitpunkt (Fahrerzuordnung + Telematik) – häufigster Vorgang im fuhrpark@-Postfach.
5. Telematik-Anbindung (nach Freigabe): n8n-Workflow „[CLAUDE] Telematik → Fuhrpark“ oder eigene API-Zugänge.
6. Prüftermine aus Belegen (HU/SP/UVV/Tacho) – Quellen aus Postfach/Drive sichten, nur belegte Termine eintragen.
7. Kosten je Fahrzeug/Monat, Export für Controlling (CSV), Integrationsendpunkt.
8. E-Mail-Benachrichtigung als Rückfallebene (nur bestätigte Empfänger, erst nach Freigabe).
9. Lasttest (100+ LKW), Backup-/Restore-Anleitung (D1 Time Travel, KV-Export).
