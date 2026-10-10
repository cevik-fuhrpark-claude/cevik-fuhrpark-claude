# [CLAUDE] CEVIK Fuhrpark – Schnittstellen

Basis-URL: die Worker-Adresse (z. B. `https://cevik-fuhrpark-claude.<konto>.workers.dev`).
Alle Antworten JSON. Fehler: `{ "error": "<code>", "message": "<Text>" }` mit HTTP 400/401/403/404/409/410/413/429/500.

## 1. Integrations-API (Unternehmensbetriebssystem, n8n)
Authentifizierung: `Authorization: Bearer <Token>` (Cloudflare-Secrets; ohne Secret antwortet die API mit 503):
- `INTEGRATION_TOKEN` – lesen und Telematik schreiben.
- optional `INTEGRATION_TOKEN_NEXT` – gleiche Rechte; für einen Token-Wechsel ohne Ausfall: neues Token als `_NEXT` setzen, n8n umstellen, dann `INTEGRATION_TOKEN` ersetzen und `_NEXT` löschen.
- optional `INTEGRATION_TOKEN_READ` – nur lesen (schreibende Aufrufe → 403 `read_only_token`).
Tokens müssen mindestens 16 Zeichen haben.
Parameter `environment=production|test` (Standard: production).

| Methode & Pfad | Zweck |
|---|---|
| `GET /api/integration/v1/vehicles` | Fahrzeugstamm (ID `VIN:<FIN>`, Kennzeichen, `kind` lkw/anhaenger, Standort, Anhänger) |
| `GET /api/integration/v1/cases?since=<ISO>` | Vorgänge mit Status, Priorität, Sperre, Zeitstempeln, Version (max. 1000, aufsteigend nach `updated_at`) |
| `GET /api/integration/v1/findings` | Offene Befunde des Fuhrparkagenten |
| `GET /api/integration/v1/costs?environment=&from=JJJJ-MM&to=JJJJ-MM&vehicle_id=` | Kosten je Fahrzeug und Monat (belegt / geschätzt / Anzahl unbewertet; max. 36 Monate) |
| `GET /api/integration/v1/maintenance` | Prüftermine aller aktiven Fahrzeuge (Status überfällig/bald fällig/in Ordnung) und Lückenliste HU/SP/UVV/Tachograph |
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
Kilometerstände werden mit Quelle `telematik:<provider>` in die Fahrzeugakte geschrieben. Max. 500 Einträge je Aufruf; die Verarbeitung braucht unabhängig von der Menge ≤ 10 Datenbankanweisungen.

### Agenten-Übergabe (Fuhrparkagent → Master)
Jede Übergabe ist ein Ereignis mit `schema_version 1.0`, eindeutiger `event_id` (SHA-256 aus Befund, Fingerprint, Erstauftreten),
`finding_code`, `case_id`, `vehicle_id`, `severity` (info/hinweis/handeln/kritisch), `next_action`, `requires_human_approval`.
Wiederholte Läufe erzeugen keine Dubletten. Ein übergeordneter Master-Agent kann `/api/integration/v1/master` abfragen.

Befundcodes: `CRITICAL_UNTRIAGED`, `TRIAGE_OVERDUE`, `TRIAGE_OPEN`, `WORKSHOP_ACK_MISSING`, `WORKSHOP_ACK_PENDING`,
`NO_FLEET_RECIPIENT`, `NO_WORKSHOP_RECIPIENT`, `WAITING_PARTS`, `QC_PENDING`, `SAFETY_OPEN_ITEMS`, `VEHICLE_LOCKED`,
`RELEASED_WITH_OPEN_ITEMS`, `URGENT_NOT_DELIVERED`, `COSTS_UNVALUED`, `MAINTENANCE_DUE`, `MAINTENANCE_OVERDUE`, `DOCUMENT_EXPIRES_SOON`, `DOCUMENT_EXPIRED`, `TIRE_BELOW_MINIMUM`, `TIRE_WARN`, `STOCK_BELOW_MIN`, `FINE_OVERDUE`, `FINE_DUE_SOON`, `FINE_VEHICLE_UNKNOWN`, `FINE_DRIVER_OPEN`.

## 2. App-API (Sitzungscookie)
Schreibende Aufrufe brauchen den Header `x-cfp: 1` und gleiche Herkunft. Umgebung = Umgebung des Benutzers;
nur `owner` darf per Header `x-cfp-env: test|production` umschalten.

| Bereich | Endpunkte |
|---|---|
| Einrichtung | `GET /api/setup/status`, `POST /api/setup` (SETUP_CODE, nur ohne Benutzer) |
| Anmeldung | `POST /api/login`, `POST /api/logout`, `GET/PATCH /api/me`, `POST /api/me/password`, `GET /api/invite/:token`, `POST /api/invite/accept` |
| Benutzer | `GET/POST /api/users`, `PATCH /api/users/:id`, `POST /api/users/:id/invite` |
| Fahrzeuge | `GET /api/vehicles[?inactive=1]`, `POST /api/vehicles` (Anlegen/Bearbeiten, `kind` lkw/anhaenger), `POST /api/vehicles/:id/documents?kind=&note=&valid_until=JJJJ-MM-TT` (Rohdaten, Header `x-filename`), `POST /api/vehicles/:id/active` (`{active:false, reason}` = außer Betrieb, nur ohne offene Vorgänge), `POST /api/vehicles/import` (CSV), `GET /api/vehicles/:id`, `POST …/drivers`, `DELETE /api/assignments/:id`, `POST …/maintenance`, `POST /api/maintenance/:id/complete`, `POST …/odometer`, `POST …/ai` |
| Prüftermine | `GET /api/maintenance[?format=csv]` (alle außer Fahrer), `POST /api/maintenance/import[?dry_run=1]` (CSV, Inhaber/Fuhrparkleitung) |
| Vorgänge | `GET /api/cases?status=open/closed&q=<Suche>&vehicle_id=&limit=`, `POST /api/cases`, `GET /api/cases/:id`, `POST /api/cases/:id/commands`, `POST /api/cases/:id/files`, `GET /api/files/:id` |
| Kontrollen | `POST /api/inspections` (`kind`: `nach_reparatur` \| `abfahrt`) |
| Hinweise | `GET /api/notifications`, `POST /api/notifications/:id/(received|opened|ack)`, `POST /api/notifications/read-all` |
| Push | `POST /api/push/subscribe`, `POST /api/push/unsubscribe`, `GET /api/push/devices`, `POST /api/push/test` |
| Management | `GET /api/dashboard`, `GET /api/master`, `POST /api/master/:eventId/decision`, `POST /api/agent/run` |
| Einstellungen | `GET/PUT /api/settings` (nur owner) |
| Push-Einstellungen | `GET /api/me/notify-prefs` → `{kinds, muted}`, `PUT {muted: [...]}` – nur nicht dringende Arten; stumm → `push_status='disabled'`, In-App bleibt |
| Fahrer: mein Fahrzeug | `GET /api/me/vehicles` (nur driver): zugeordnete Fahrzeuge mit `locked`, `open_cases_total`, `my_open_cases`, `next_inspections`, `last_km` |
| Fahrerzuordnung | `POST /api/vehicles/<id>/drivers {user_id, end_previous?, evidence?}` – 409 `already_assigned`; `DELETE /api/assignments/<id>` nur eigene Umgebung |
| Wartungshistorie | Fahrzeugakte liefert `maintenance_history` (Datum, km, Nachweis, Quelle bestand/erfasst/erledigt/import, Person); Zeitleiste Typ `maintenance` je Durchführung |
| Prüfungen nach km | Regel mit `interval_km` + `last_done_km` → `GET /api/maintenance` liefert `next_due_km`, `current_km`, `km_remaining`, `km_status`; Gesamtstatus = strengerer aus Datum und km. Vorwarnung nur mit Einstellung `maintenance_warn_km`. Erledigen einer km-Regel verlangt `done_km`. Agent: `MAINTENANCE_DUE/OVERDUE` mit Subjekt `<regel>|km` |
| Kilometerstand | `POST /api/vehicles/<id>/odometer` `{km, measured_on?: JJJJ-MM-TT (nicht Zukunft, leer = jetzt), note?}` – kleiner als ein früherer oder größer als ein späterer Wert → 409 `km_not_plausible`, außer mit Begründung `note` |
| Fahrzeug-Zeitleiste | `GET /api/vehicles/<id>/timeline?types=case,case_closed,inspection,odometer,driver_from,driver_to,document,tire,maintenance,fine&limit=` – alle gespeicherten Ereignisse absteigend, gleiche Rechte wie die Fahrzeugakte (Bußgelder nur owner/fleet) |
| Eigene Anmeldungen | `GET /api/me/sessions` (Gerät aus Browser-Kennung, zuletzt aktiv, `current`), `DELETE /api/me/sessions/<16-stellige Kennung>`, `POST /api/me/sessions/revoke-others` – protokolliert als `session.revoke*` |
| Protokoll | `GET /api/admin/audit?action=<Präfix>&before=<ISO>&limit=` (nur owner) |
| Vorgänge als CSV | `GET /api/cases?format=csv&status=&q=` (nicht driver): gleiche Filter/Rechte wie die Liste, bis 5000 Zeilen, Formelschutz, Audit `reports.cases.export` |
| Werkstatt-Auslastung | `GET /api/reports/workshop-load?weeks=1..52` (owner/fleet/viewer; workshop nur eigener Standort): je Standort `weeks[] {week JJJJ-Www, hours, acknowledged, released}`, `open {status: n}` – ohne Personenbezug |
| Datenqualität | `GET /api/admin/data-quality?stale_days=90` (owner/fleet): `items[] {check, severity fehler/luecke/hinweis, vehicle_id, plate, detail}`, `counts` |
| Nutzungsstatistik | `GET /api/admin/usage?days=1..366` (nur owner, aktuelle Ansicht Test/Betrieb): Aufrufe/Fehler je Bereich, Funktion und Tag – ohne Personenbezug |

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

## Prüftermin-Import (CSV)
Kopfzeile mit `Kennzeichen` und/oder `FIN`, `Art` (HU, SP, UVV, Tachograph … ; Aliase TÜV, Sicherheitsprüfung, Tacho, Fahrtenschreiber),
`Nächster Termin` (JJJJ-MM-TT, TT.MM.JJJJ oder Plakette MM/JJJJ → fällig bis Monatsende, im Nachweis vermerkt) **oder** `Letzte Prüfung` + `Intervall Monate`,
`Nachweis` (Pflicht je Zeile). Nur `Letzte Prüfung` ohne Termin/Intervall ist erlaubt (Rechnung ohne Fälligkeit): die Prüfung wird „ohne Termin“ gespeichert, ein bereits hinterlegtes Intervall wird angewendet – es wird nie ein Termin erfunden. Zuordnung über FIN, sonst nur über eindeutiges Kennzeichen. Ein vorhandener späterer Termin wird nie überschrieben;
gleiche Termine bleiben unverändert (Import ist wiederholbar). `?dry_run=1` liefert die Vorschau ohne zu speichern. Jeder Import/Export im Audit-Log.

## Kennzahlen (App)
`GET /api/reports/kpi?from=JJJJ-MM&to=JJJJ-MM` – Inhaber, Fuhrparkleitung, Lesezugriff. Je Priorität (`kritisch`/`mittel`/`niedrig`/`alle`): `created`, `released`, `rejected`, `open`, `triage`/`workshop_ack`/`created_to_release` als `{n, median_h, p90_h}`, `parts_wait_h`; `vehicles[]` mit `workshop_h` und `parts_wait_h`. Definitionen im Feld `definitions`.

## Reifen – Flotte (App)
`GET /api/tires/fleet?stale_days=90` – Inhaber, Fuhrparkleitung, Werkstatt, Lesezugriff. Je aktivem Fahrzeug `status` (unter_minimum/warnung/ok/unbekannt), `min_tread_mm`, `measured_positions`, `below_min`, `below_warn`, `oldest_measure_at`, `stale`; Summen in `totals`.
