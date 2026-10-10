# [CLAUDE] CEVIK Fuhrpark – Schnittstellen

Basis-URL: die Worker-Adresse (z. B. `https://cevik-fuhrpark-claude.<konto>.workers.dev`).
Alle Antworten JSON. Fehler: `{ "error": "<code>", "message": "<Text>" }` mit HTTP 400/401/403/404/409/410/413/429/500.

## 1. Integrations-API (Unternehmensbetriebssystem, n8n)
Authentifizierung: `Authorization: Bearer <INTEGRATION_TOKEN>` (Cloudflare-Secret; ohne Secret antwortet die API mit 503).
Parameter `environment=production|test` (Standard: production).

| Methode & Pfad | Zweck |
|---|---|
| `GET /api/integration/v1/vehicles` | Fahrzeugstamm (ID `VIN:<FIN>`, Kennzeichen, Standort, Anhänger) |
| `GET /api/integration/v1/cases?since=<ISO>` | Vorgänge mit Status, Priorität, Sperre, Zeitstempeln, Version (max. 1000, aufsteigend nach `updated_at`) |
| `GET /api/integration/v1/findings` | Offene Befunde des Fuhrparkagenten |
| `GET /api/integration/v1/costs?environment=&from=JJJJ-MM&to=JJJJ-MM&vehicle_id=` | Kosten je Fahrzeug und Monat (belegt / geschätzt / Anzahl unbewertet; max. 36 Monate) |
| `GET /api/integration/v1/master` | Management-Panel als Daten (Fälle, Befunde, Master-Eingang) |
| `POST /api/integration/v1/telematics` | Telematik-Einspeisung (siehe unten) |

### Telematik-Einspeisung
```json
{ "provider": "webfleet", "items": [
  { "external_id": "objectuid", "vin": "WMA15SZZ2HM722774", "plate": "SZ-YC 5513",
    "gps_time": "2026-10-10T08:20:00Z", "lat": 51.52, "lon": 7.42, "km": 456789, "speed": 0, "ignition": false } ] }
```
Regeln: Zuordnung nur über FIN oder bestätigtes Mapping (`telematics_mappings`). Nur Kennzeichen → Prüffall in
`telematics_unmatched`, keine Zuordnung. Ältere GPS-Zeit überschreibt keinen neueren Stand. (0,0)-Positionen werden verworfen.
Kilometerstände werden mit Quelle `telematik:<provider>` in die Fahrzeugakte geschrieben. Max. 500 Einträge je Aufruf.

### Agenten-Übergabe (Fuhrparkagent → Master)
Jede Übergabe ist ein Ereignis mit `schema_version 1.0`, eindeutiger `event_id` (SHA-256 aus Befund, Fingerprint, Erstauftreten),
`finding_code`, `case_id`, `vehicle_id`, `severity` (info/hinweis/handeln/kritisch), `next_action`, `requires_human_approval`.
Wiederholte Läufe erzeugen keine Dubletten. Ein übergeordneter Master-Agent kann `/api/integration/v1/master` abfragen.

Befundcodes: `CRITICAL_UNTRIAGED`, `TRIAGE_OVERDUE`, `TRIAGE_OPEN`, `WORKSHOP_ACK_MISSING`, `WORKSHOP_ACK_PENDING`,
`NO_FLEET_RECIPIENT`, `NO_WORKSHOP_RECIPIENT`, `WAITING_PARTS`, `QC_PENDING`, `SAFETY_OPEN_ITEMS`, `VEHICLE_LOCKED`,
`RELEASED_WITH_OPEN_ITEMS`, `URGENT_NOT_DELIVERED`, `COSTS_UNVALUED`, `MAINTENANCE_DUE`, `MAINTENANCE_OVERDUE`.

## 2. App-API (Sitzungscookie)
Schreibende Aufrufe brauchen den Header `x-cfp: 1` und gleiche Herkunft. Umgebung = Umgebung des Benutzers;
nur `owner` darf per Header `x-cfp-env: test|production` umschalten.

| Bereich | Endpunkte |
|---|---|
| Einrichtung | `GET /api/setup/status`, `POST /api/setup` (SETUP_CODE, nur ohne Benutzer) |
| Anmeldung | `POST /api/login`, `POST /api/logout`, `GET/PATCH /api/me`, `POST /api/me/password`, `GET /api/invite/:token`, `POST /api/invite/accept` |
| Benutzer | `GET/POST /api/users`, `PATCH /api/users/:id`, `POST /api/users/:id/invite` |
| Fahrzeuge | `GET/POST /api/vehicles`, `POST /api/vehicles/import` (CSV), `GET /api/vehicles/:id`, `POST …/drivers`, `DELETE /api/assignments/:id`, `POST …/maintenance`, `POST /api/maintenance/:id/complete`, `POST …/odometer`, `POST …/ai` |
| Vorgänge | `GET/POST /api/cases`, `GET /api/cases/:id`, `POST /api/cases/:id/commands`, `POST /api/cases/:id/files`, `GET /api/files/:id` |
| Kontrollen | `POST /api/inspections` (`kind`: `nach_reparatur` \| `abfahrt`) |
| Hinweise | `GET /api/notifications`, `POST /api/notifications/:id/(received|opened|ack)`, `POST /api/notifications/read-all` |
| Push | `POST /api/push/subscribe`, `POST /api/push/unsubscribe`, `GET /api/push/devices`, `POST /api/push/test` |
| Management | `GET /api/dashboard`, `GET /api/master`, `POST /api/master/:eventId/decision`, `POST /api/agent/run` |
| Einstellungen | `GET/PUT /api/settings` (nur owner) |

### Befehle auf Vorgängen
`POST /api/cases/:id/commands` mit `{ action, command_id, expected_version, note, payload }`.
Gleiche `command_id` wird nur einmal ausgeführt; veraltete `expected_version` → 409 `version_conflict`.

| Aktion | Rolle | Status vorher → nachher | Pflicht |
|---|---|---|---|
| `receive` | fleet/owner | gemeldet (Eingang) | – |
| `change_priority` | fleet/owner | offen | `payload.priority`, Begründung |
| `set_safety_lock` / `lift_safety_lock` | fleet/owner | jeder offene | Grund; Aufheben + `confirm`, keine offenen sicherheitsrel. Restarbeiten |
| `approve_repair` | fleet/owner | gemeldet → werkstatt_freigegeben | `workshop_site`, Umfang |
| `reject` | fleet/owner | gemeldet → abgelehnt | Grund; nicht bei aktiver Sperre |
| `acknowledge` | Werkstatt (Standort) | werkstatt_freigegeben (Übernahme) | – |
| `start_repair` | Werkstatt | werkstatt_freigegeben → in_reparatur | – |
| `wait_parts` / `resume_repair` | Werkstatt | in_reparatur ↔ wartet_teile | Teile-Vermerk |
| `record_work`, `add_part`, `add_open_item`, `resolve_open_item` | Werkstatt, fleet/owner | Werkstattstatus | je Formular |
| `add_external_cost` | fleet/owner | Werkstattstatus | Lieferant |
| `request_quality_check` | Werkstatt | in_reparatur → abschlusskontrolle | Arbeiten dokumentiert, Kontrolle nach Reparatur, keine offenen sicherheitsrel. Restarbeiten |
| `return_for_rework` | fleet/owner | abschlusskontrolle → in_reparatur | Grund |
| `technical_release` | fleet/owner (Mensch) | abschlusskontrolle → fahrzeug_freigegeben | Kontrollnachweis + `confirm`; hebt Sperre auf |
| `comment` | alle mit Zugriff | – | Text |

## Kostenbericht (App)
`GET /api/reports/costs?from=JJJJ-MM&to=JJJJ-MM[&vehicle_id=][&format=csv]` – Rollen Inhaber, Fuhrparkleitung, Lesezugriff. CSV: Semikolon, Dezimalkomma, UTF-8 mit BOM (Excel), Formel-Injektion neutralisiert; jeder Export wird im Audit-Log vermerkt.
