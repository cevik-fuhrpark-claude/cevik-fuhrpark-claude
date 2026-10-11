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
| `GET /api/integration/v1/availability` | Verfügbarkeit je Fahrzeug für die Tourenplanung (`gesperrt`/`werkstatt`/`meldung_offen`/`einsatzbereit_lt_system`, letzter km-Stand, nächste Prüfung, `last_departure_check_at`/`_result` ok/maengel ohne Namen, `planned_workshop_date`/`planned_inspection_date` = nächster geplanter Werkstatt-/Prüftermin ab heute, `planned_inspection_kind` = Prüfart(en) an diesem Termin (z. B. „HU, SP“), `parts_expected_date` = spätester Teile-Liefertermin laut Werkstatt bei „wartet auf Teile“, nur gespeicherte Termine) – keine Freigabe-Aussage |
| `GET /api/integration/v1/findings` | Offene Befunde des Fuhrparkagenten |
| `GET /api/integration/v1/costs?environment=&from=JJJJ-MM&to=JJJJ-MM&vehicle_id=` | Kosten je Fahrzeug und Monat (belegt / geschätzt / Anzahl unbewertet; max. 36 Monate); `vehicles[]` mit gefahrenen km und €/km |
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
Kilometerstände werden mit Quelle `telematik:<provider>` in die Fahrzeugakte geschrieben – **je Fahrzeug und Tag ein Wert** (der jüngste) und nur, wenn er nicht kleiner ist als der zuvor erfasste km-Stand (`odometer_written` zählt neue/aktualisierte Tageswerte). GPS-Zeiten mehr als 10 Minuten in der Zukunft werden verworfen (`rejected`). Max. 500 Einträge je Aufruf; die Verarbeitung braucht unabhängig von der Menge ≤ 10 Datenbankanweisungen.

### Agenten-Übergabe (Fuhrparkagent → Master)
Jede Übergabe ist ein Ereignis mit `schema_version 1.0`, eindeutiger `event_id` (SHA-256 aus Befund, Fingerprint, Erstauftreten),
`finding_code`, `case_id`, `vehicle_id`, `severity` (info/hinweis/handeln/kritisch), `next_action`, `requires_human_approval`.
Wiederholte Läufe erzeugen keine Dubletten. Ein übergeordneter Master-Agent kann `/api/integration/v1/master` abfragen.

Befundcodes: `CRITICAL_UNTRIAGED`, `TRIAGE_OVERDUE`, `TRIAGE_OPEN`, `WORKSHOP_ACK_MISSING`, `WORKSHOP_ACK_PENDING`,
`NO_FLEET_RECIPIENT`, `NO_WORKSHOP_RECIPIENT`, `WAITING_PARTS`, `QC_PENDING`, `SAFETY_OPEN_ITEMS`, `VEHICLE_LOCKED`,
`RELEASED_WITH_OPEN_ITEMS`, `URGENT_NOT_DELIVERED`, `COSTS_UNVALUED`, `MAINTENANCE_DUE`, `MAINTENANCE_OVERDUE`, `DOCUMENT_EXPIRES_SOON`, `DOCUMENT_EXPIRED`, `TIRE_BELOW_MINIMUM`, `TIRE_WARN`, `STOCK_BELOW_MIN`, `FINE_OVERDUE`, `FINE_DUE_SOON`, `FINE_VEHICLE_UNKNOWN`, `FINE_DRIVER_OPEN`, `CONTRACT_ENDED`, `CONTRACT_ENDS_SOON`, `CONTRACT_NOTICE_DUE`, `CONTRACT_KM_OVER`, `CONTRACT_KM_FORECAST`, `CLAIM_OPEN_LONG`.

## 2. App-API (Sitzungscookie)
Schreibende Aufrufe brauchen den Header `x-cfp: 1` und gleiche Herkunft. Umgebung = Umgebung des Benutzers;
nur `owner` darf per Header `x-cfp-env: test|production` umschalten.

| Bereich | Endpunkte |
|---|---|
| Einrichtung | `GET /api/setup/status`, `POST /api/setup` (SETUP_CODE, nur ohne Benutzer) |
| Anmeldung | `POST /api/login`, `POST /api/logout`, `GET/PATCH /api/me`, `POST /api/me/password`, `GET /api/invite/:token`, `POST /api/invite/accept` |
| Benutzer | `GET/POST /api/users`, `PATCH /api/users/:id`, `POST /api/users/:id/invite` |
| Fahrzeuge | `GET /api/vehicles[?inactive=1]` (nicht für driver zusätzlich `last_check_at`, `last_check_result` ok/maengel = letzte Abfahrtskontrolle, nur Information; Akte: `last_check`), `POST /api/vehicles` (Anlegen/Bearbeiten, `kind` lkw/anhaenger), `POST /api/vehicles/:id/documents?kind=&note=&valid_until=JJJJ-MM-TT` (Rohdaten, Header `x-filename`), `POST /api/vehicles/:id/active` (`{active:false, reason}` = außer Betrieb, nur ohne offene Vorgänge), `POST /api/vehicles/import` (CSV), `GET /api/vehicles/:id`, `POST …/drivers`, `DELETE /api/assignments/:id`, `POST …/maintenance`, `POST /api/maintenance/:id/complete`, `POST …/odometer`, `POST …/ai` |
| Prüftermine | `GET /api/maintenance[?format=csv]` (alle außer Fahrer), `POST /api/maintenance/import[?dry_run=1]` (CSV, Inhaber/Fuhrparkleitung) |
| Vorgänge | `GET /api/cases?status=open/closed&q=<Suche>&vehicle_id=&repeat_days=1–30&limit=` (`repeat_days`: nur Vorgänge, bei denen die Abfahrtskontrolle den Mangel in den letzten N Tagen erneut festgestellt hat), `POST /api/cases`, `GET /api/cases/:id` (außer Fahrer zusätzlich `vehicle_info`: weitere offene Vorgänge, Prüfungen ≤ 30 Tage, letzter km-Stand, `previous_same_item` = freigegebene Vorgänge desselben Prüfpunkts in den 90 Tagen vor der Meldung), `POST /api/cases/:id/commands`, `POST /api/cases/:id/files`, `GET /api/files/:id` |
| Kontrollen | `POST /api/inspections` (`kind`: `nach_reparatur` \| `abfahrt`) → `{id, result, followups[], km_rejected, km_test_only}`; `km_rejected` ≠ null: km-Stand kleiner als zuletzt erfasst, nur an der Kontrolle gespeichert, nicht in der Fahrzeugakte; `km_test_only`: Testkonto bei eingeschaltetem `test_master_readonly`, km nur an der Kontrolle. Abfahrtskontrolle: hat derselbe Prüfpunkt (`cases.check_item`) schon einen offenen Folgeauftrag mit mindestens gleicher Priorität (bei sicherheitsrelevantem Mangel: mit aktiver Sperre), entsteht kein neuer Vorgang – Ereignis `repeat_finding` im offenen Vorgang, `followups[]` enthält ihn mit `repeat: true` |
| Hinweise | `GET /api/notifications`, `POST /api/notifications/:id/(received|opened|ack)`, `POST /api/notifications/read-all` |
| Push | `POST /api/push/subscribe`, `POST /api/push/unsubscribe`, `GET /api/push/devices`, `POST /api/push/test` |
| Management | `GET /api/dashboard`, `GET /api/master`, `POST /api/master/:eventId/decision`, `POST /api/agent/run` |
| Einstellungen | `GET/PUT /api/settings` (nur owner). `test_master_readonly` = `1`: Testkonten (außer owner) erhalten bei Schreibzugriffen auf gemeinsame Stammdaten (Fahrzeuge, Prüfregeln/-termine, km, Reifengrößen, Telematik-Zuordnung, Importe) 403 `test_readonly`. `idle_logout_workshop_min` / `idle_logout_other_min`: Abmeldung nach Leerlauf in Minuten (leer = aus, mind. 5) |
| Push-Einstellungen | `GET /api/me/notify-prefs` → `{kinds, muted}`, `PUT {muted: [...]}` – nur nicht dringende Arten; stumm → `push_status='disabled'`, In-App bleibt |
| Fahrer: mein Fahrzeug | `GET /api/me/vehicles` (nur driver): zugeordnete Fahrzeuge mit `locked`, `open_cases_total`, `my_open_cases`, `known_defects` (alle offenen Vorgänge des Fahrzeugs ohne Namen; `id` nur bei eigenen; `planned_date` = Werkstatttermin ab heute; `parts_expected_date` = Teile-Liefertermin ab heute bei „wartet auf Teile“), `next_inspections` (mit `planned_date` ab heute), `planned_workshop_date`, `planned_inspection` (`{kind, planned_date}`), `last_km` – nur gespeicherte Termine |
| Fahrerzuordnung | `POST /api/vehicles/<id>/drivers {user_id, end_previous?, evidence?}` – 409 `already_assigned`; `DELETE /api/assignments/<id>` nur eigene Umgebung |
| Wartungshistorie | Fahrzeugakte liefert `maintenance_history` (Datum, km, Nachweis, Quelle bestand/erfasst/erledigt/import, Person); Zeitleiste Typ `maintenance` je Durchführung |
| Prüfungen nach km | Regel mit `interval_km` + `last_done_km` → `GET /api/maintenance` liefert `next_due_km`, `current_km`, `km_remaining`, `km_status`; Gesamtstatus = strengerer aus Datum und km. Vorwarnung nur mit Einstellung `maintenance_warn_km`. Erledigen einer km-Regel verlangt `done_km`. Agent: `MAINTENANCE_DUE/OVERDUE` mit Subjekt `<regel>|km` |
| Kilometerstand | `POST /api/vehicles/<id>/odometer` `{km, measured_on?: JJJJ-MM-TT (nicht Zukunft, leer = jetzt), note?}` – kleiner als ein früherer oder größer als ein späterer Wert → 409 `km_not_plausible`, außer mit Begründung `note` |
| Fahrzeug-Zeitleiste | `GET /api/vehicles/<id>/timeline?types=case,case_closed,inspection,odometer,driver_from,driver_to,document,tire,maintenance,fine,tacho,contract,claim&limit=` – alle gespeicherten Ereignisse absteigend, gleiche Rechte wie die Fahrzeugakte (Bußgelder, Massenspeicher-Auslesungen, Verträge – Beginn bzw. Erfassung, Beendigung – und Versicherungsfälle – `claim_event` reported am Meldedatum, reimbursed am Erstattungsdatum mit `reimbursed_net` – nur owner/fleet; Fahrzeugakte liefert dann `tacho` und `tacho_downloads`) |
| Sperre aufheben | `POST /api/users/<id>/unlock` (owner; fleet für eigene Rollen/Umgebung); `GET /api/users` liefert `locked_until`, `sessions` (aktive Anmeldungen), `last_seen` |
| Anmeldungen beenden | `POST /api/users/<id>/revoke-sessions` (gleiche Rechte wie unlock, nicht für sich selbst): löscht alle Sitzungen und meldet Push-Geräte ab (Geräteverlust) → `{sessions, push_devices}`, Protokoll `user.revoke_sessions` |
| Eigene Anmeldungen | `GET /api/me/sessions` (Gerät aus Browser-Kennung, zuletzt aktiv, `current`), `DELETE /api/me/sessions/<16-stellige Kennung>`, `POST /api/me/sessions/revoke-others` – protokolliert als `session.revoke*` |
| Protokoll | `GET /api/admin/audit?action=<Präfix>&before=<ISO>&limit=` (nur owner) |
| Systemzustand | `GET /api/health` (ohne Anmeldung, nur `ok`/Zeit), `GET /healthz` |
| Stammwerte für die App | `GET /api/meta` (Werkstätten, Checkliste, Prioritäten, Status, Prüfarten, Dokumentarten, Reifenpositionen, Bußgeldarten, VAPID-Schlüssel) |
| Reifen je Fahrzeug | `GET /api/vehicles/:id/tires`, `POST /api/vehicles/:id/tires/events {event_type: messung|wechsel|reparatur|sichtpruefung, position, tread_mm?, …}` (Messung/Sichtprüfung auch Fahrer für zugeordnete Fahrzeuge), `POST /api/vehicles/:id/tires/specs {axle, size, verified?}` (owner/fleet/workshop) |
| Bewertung aussetzen | `POST /api/vehicles/:id/evaluation {excluded: true, reason}` bzw. `{excluded: false}` (owner/fleet) – Fahrzeug „ruhend“: aus allen Auswertungen ausgenommen, Protokoll |
| Reifengrößen-Import | `POST /api/tires/import[?dry_run=1]` (owner, CSV: Quelle;Kennzeichen;FIN;Reifen Lenkachse;…) → `counts`, `kept_verified`, `skipped_no_vehicle` |
| Datensicherung | `GET /api/admin/backup` (owner): JSON aller Fachtabellen ohne Geheimnisse (siehe `docs/BETRIEB.md`) |
| Fahrerakte | `GET /api/drivers[?inactive=1][&format=csv]` (CSV-Fristenliste nur owner/fleet, protokolliert) (owner/fleet alle; driver nur eigene Akte; sonst 403), `POST /api/drivers {display_name, personnel_no?, site?, user_id?, note?}`, `GET/PATCH /api/drivers/:id` (Detail mit `status`, `tacho`, `tacho_downloads`), `POST /api/drivers/:id/documents {kind: fuehrerschein|fahrerkarte|code95|unterweisung|sonstiges, valid_until?, evidence, …}`, `POST /api/drivers/:id/license-checks {checked_on, result, note?}` |
| Auslesungen Fahrtenschreiber | `GET /api/tacho[?format=csv]` (owner/fleet): Fahrerkarten (28 Tage) und Massenspeicher der Lkw (90 Tage) nach FPersV § 2 Abs. 5, `status` ueberfaellig/bald/ok/keine – Frist nur ab erfasster Auslesung; `POST /api/tacho/downloads {kind: fahrerkarte|massenspeicher, driver_id|vehicle_id, downloaded_on (nicht Zukunft), evidence, note?}` – 409 bei gleichem Tag; `GET /api/tacho/downloads?driver_id=|vehicle_id=` (Fahrer: nur eigene Fahrerkarte). Sammelimport `POST /api/tacho/import[?dry_run=1][&source=<Nachweis für alle Zeilen>]` (CSV: Art; Personalnummer/Fahrer; Kennzeichen/FIN; Datum JJJJ-MM-TT oder TT.MM.JJJJ; Nachweis/Datei) → `counts {neu, vorhanden, uebersprungen}`, `rows`, `skipped` – nur eindeutige Treffer, idempotent, max. 2000 Zeilen. Vorwarnung: Einstellung `tacho_warn_days` (Standard 7). Agent: `TACHO_CARD_OVERDUE/DUE`, `TACHO_VU_OVERDUE/DUE` |
| Vorschläge Werkstatt | `GET /api/work-suggestions` → häufige Tätigkeiten; `GET /api/part-suggestions` → frühere Teile (Bezeichnung, Teilenummer) – owner/fleet/workshop, Werkstatt nur eigener Standort |
| Kommentar gezielt | Befehl `comment` mit `payload.notify ⊆ ['reporter','fleet','workshop']` (leer = alle Beteiligten) |
| Fahrzeugimport | `POST /api/vehicles/import[?dry_run=1]` (owner, CSV): Vorschau `preview[] {line, plate, action neu/geändert/unverändert, changes[]}`, `counts`, `skipped[]`; leere Zellen/fehlende Spalten behalten vorhandene Werte |
| Bußgelder Export | `GET /api/fines?format=csv[&with_driver=1]` (owner/fleet/viewer; Fahrer nur owner/fleet), `GET /api/fines?format=ics` (offene Antwortfristen, ohne Namen) |
| Lager | `GET/POST /api/stock`, `GET/PATCH /api/stock/:id`, `POST /api/stock/:id/movements {type: zugang|entnahme|korrektur, qty, note?}` (Korrektur nur mit Grund, kein negativer Bestand); `GET /api/stock?format=csv`; Bestellvorschlag `GET /api/stock?reorder=1[&format=csv]` (nur Artikel unter Mindestbestand, `shortfall`, `used_90d`, `shortfall_value_net` nur mit Preis; löst keine Bestellung aus); Inventur `POST /api/stock/inventory[?dry_run=1] {site, counts: [{item_id, counted}], note?}` → `differences[]`, `booked` |
| Datenauskunft je Person | `GET /api/admin/users/:id/data-export` (nur owner; JSON-Datei mit Konto, Sitzungen/Geräten ohne Token, Zuordnungen, Meldungen, Verlauf, Arbeitszeiten, Kontrollen, Dateiangaben, Hinweisen, km-Ständen, Bußgeldern als Fahrer, Protokoll, verknüpfter Fahrerakte; ohne Passwort-Hash/Push-Schlüssel; Protokoll `privacy.export`); `GET /api/drivers/:id/data-export` für Fahrerakten (ohne Konto nur Fahrerakte, mit Konto wie oben) |
| Fahrzeuge als CSV | `GET /api/vehicles?format=csv[&inactive=1]` (nicht driver; inkl. Spalten „Letzte Abfahrtskontrolle“, „Ergebnis Abfahrtskontrolle“) |
| Vorgänge als CSV | `GET /api/cases?format=csv&status=&q=` (nicht driver): gleiche Filter/Rechte wie die Liste, bis 5000 Zeilen, Formelschutz, Audit `reports.cases.export`; für owner/fleet zusätzlich Spalten Versicherungsfall (Status), Versicherer, Schadennummer |
| Werkstattplan | `GET /api/workshop/plan?days=1..60&site=` (owner/fleet/viewer/dispatch; workshop nur eigener Standort): `days[] {date, items[]}` mit Vorgängen (`type: case`, Status freigegeben/in Reparatur/wartet auf Teile, mit `planned_date` und `parts_expected_date`) und geplanten Prüfterminen (`type: maintenance`), je Eintrag `other_dates[]` (weitere geplante Tage desselben Fahrzeugs im Zeitraum – Hinweis zum Zusammenlegen), `overdue[]` (Termin vor heute, noch offen), `unplanned[]` (ohne Termin); Vorgänge tragen `version` und `can_plan` (Termin direkt per `set_planned_date` setzbar: owner/fleet/workshop, nach Übernahme); `&format=ics` als Kalenderdatei (nur Vorgangsnummer, Kennzeichen, Status/Prüfart). Termin setzen/verschieben/entfernen: Vorgangsbefehl `set_planned_date` (`payload.planned_date` JJJJ-MM-TT oder leer) |
| Werkstattauftrag aus Prüftermin | `POST /api/maintenance/:id/order {workshop_site, priority? niedrig|mittel|kritisch, note?, request_key?}` (owner/fleet) → 201 `{id, case_no, status, planned_date}`: legt einen Vorgang (Herkunft `wartung`, `maintenance_rule_id`) an und gibt ihn per `approve_repair` an die Werkstatt frei; ein geplanter Prüftermin ab heute wird Werkstatttermin. Je Regel und Umgebung nur ein offener Auftrag (sonst 409 `order_exists` mit `case_id`). `GET /api/maintenance` liefert je Zeile `open_order {id, case_no, status}` (nicht über die Integrations-API); Vorgang liefert `maintenance_rule {id, kind, last_done_date, done_since_order}`. Die Prüfung wird weiterhin in der Fahrzeugakte mit Nachweis erledigt. |
| Werkstatt-Auslastung | `GET /api/reports/workshop-load?weeks=1..52` (owner/fleet/viewer; workshop nur eigener Standort): je Standort `weeks[] {week JJJJ-Www, hours, acknowledged, released}`, `open {status: n}` – ohne Personenbezug |
| Telematik-Zuordnung | `GET /api/telematics` (owner/fleet): `unmatched`, `mappings`, `latest`; `POST /api/telematics/mappings {provider, external_id, vehicle_id, evidence}` (409 bei vorhandener Zuordnung); `DELETE /api/telematics/mappings?provider=&external_id=` |
| Datenqualität | `GET /api/admin/data-quality?stale_days=90` (owner/fleet): `items[] {check, severity fehler/luecke/hinweis, vehicle_id, plate, case_id? (bei `accident_no_claim`: Vorgang nennt „Unfall“/ДТП/accident, letzte 12 Monate, ohne Versicherungsfall), detail}`, `counts` |
| Nutzungsstatistik | `GET /api/admin/usage?days=1..366` (nur owner, aktuelle Ansicht Test/Betrieb): Aufrufe/Fehler je Bereich, Funktion und Tag – ohne Personenbezug |
| Fahrzeugverträge | owner/fleet (sonst 403; Akte ohne `contracts`): `POST /api/vehicles/:id/contracts {kind: leasing|miete|finanzierung|versicherung|wartung|sonstiges, partner, evidence, contract_no?, start_date?, end_date?, notice_months? (nur mit end_date), km_allowance? (nur mit start_km), start_km?, monthly_rate_net?, note?, file_id? (Dokument aus der Ablage desselben Fahrzeugs, ohne Vorgang, in der aktuellen Umgebung; null = Verknüpfung aufheben, Feld weglassen = unverändert)}`, `PATCH /api/contracts/:id` (nicht nach Beenden), `POST /api/contracts/:id/end {ended_on? (nicht Zukunft), end_note}`; Fahrzeugakte `contracts[]` mit `file_id`/`file_name` (nur wenn das Dokument in der angezeigten Umgebung liegt, sonst `file_other_env: true`) und `status {overall handeln/hinweis/ok/beendet, end, notice {by = Ende − Frist}, km {driven, remaining, forecast_driven (linear, ab 30 Tagen)}}`; Übersicht `GET /api/contracts?filter=aktiv|aktion|beendet|alle&kind=[&format=csv|ics]` (ics: spätester Kündigungstag und Vertragsende laufender Verträge ab heute, Erinnerung = Vorwarnung, ohne Raten/Vertragsnummern) → `counts`, `monthly_rate_sum_net` (nur hinterlegte Raten), `unrated`. Vorwarnung `contract_warn_days` (Standard 60). Agent: `CONTRACT_ENDED`, `CONTRACT_ENDS_SOON`, `CONTRACT_NOTICE_DUE`, `CONTRACT_KM_OVER`, `CONTRACT_KM_FORECAST`. Sammelimport `POST /api/contracts/import[?dry_run=1][&source=<Nachweis für alle Zeilen>]` (CSV: Kennzeichen/FIN; Vertragsart; Vertragspartner; Vertragsnummer; Beginn; Ende; Kündigungsfrist; km-Kontingent; km bei Übernahme; Monatsrate; Nachweis; Bemerkung – Datum JJJJ-MM-TT oder TT.MM.JJJJ, Zahlen deutsch) → `counts {neu, vorhanden, uebersprungen}`, `rows`, `skipped`; nur eindeutige Fahrzeuge, vorhandene Verträge (Fahrzeug+Art+Nummer bzw. Partner+Beginn) bleiben unverändert, max. 500 Zeilen. Gemeinsame Stammdaten (Schalter `test_master_readonly` gilt) |
| Versicherungsfälle | owner/fleet (sonst 403): Fahrzeugakte (`GET /api/vehicles/:id`) liefert der Leitung `claims_summary {total, open, reimbursed_net}`. `PUT /api/cases/:id/claim {insurer (oder aus contract_id), contract_id? (Versicherungsvertrag desselben Fahrzeugs), claim_no?, reported_on (Pflicht, nicht Zukunft), status: gemeldet|in_pruefung|reguliert|abgelehnt|zurueckgezogen, deductible_net?, reimbursed_net? + reimbursed_on? (nur zusammen, nicht bei abgelehnt/zurückgezogen), evidence, note?, file_id? (Datei desselben Vorgangs = Schreiben/Abrechnung; weglassen = unverändert, null = aufheben)}` – je Vorgang höchstens ein Fall (anlegen bzw. ändern, Protokoll `claim.create/update`). Vorgang (`GET /api/cases/:id`) liefert für die Leitung `claim` (mit `open`, `days_open`) und `insurance_contracts[]`. Übersicht `GET /api/claims?filter=offen|alle|<status>[&format=csv]` → `counts`, `claims[]` mit `case_cost_net` (nur belegte Ist-Kosten, sonst null) und `balance_net` (Kosten − Erstattung, nur wenn beides belegt), `reimbursed_sum_net`, `followup_days` (Einstellung oder null) und je Fall `followup_due` (offen und Meldedatum ≥ Nachfass-Tage). Umgebung wie der Vorgang. Agent: `CLAIM_OPEN_LONG` (Fall gemeldet/in Prüfung und Meldedatum älter als Einstellung `claim_followup_days`; leer = aus), in der Sammel-Erinnerung. |

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
| `wait_parts` / `resume_repair` | Werkstatt | in_reparatur ↔ wartet_teile | Teile-Vermerk; optional `payload.parts_expected_date` (Liefertermin laut Lieferant, ab heute, ≤ 1 Jahr); `resume_repair` leert ihn |
| `set_parts_eta` | Werkstatt, fleet/owner | wartet_teile (kein Statuswechsel, kein Push) | `payload.parts_expected_date` oder leer = entfernen |
| `record_work`, `add_part`, `add_open_item`, `resolve_open_item` | Werkstatt, fleet/owner | Werkstattstatus | je Formular |
| `add_external_cost` | fleet/owner | Werkstattstatus | Lieferant |
| `request_quality_check` | Werkstatt | in_reparatur → abschlusskontrolle | Arbeiten dokumentiert, Kontrolle nach Reparatur, keine offenen sicherheitsrel. Restarbeiten |
| `return_for_rework` | fleet/owner | abschlusskontrolle → in_reparatur | Grund |
| `technical_release` | fleet/owner (Mensch) | abschlusskontrolle → fahrzeug_freigegeben | Kontrollnachweis + `confirm`; hebt Sperre auf |
| `approve_costs` | fleet/owner | jeder offene, nur wenn `cost_over_limit_at` gesetzt | Freigabevermerk; setzt `cost_approved_net` = aktueller bewerteter Betrag (Ist + Schätzung), Hinweis an die Werkstatt |
| `comment` | alle mit Zugriff | – | Text |

**Kosten-Freigabegrenze** (Einstellung `repair_cost_limit_net`, € netto, leer = aus): Nach `record_work`/`add_part`/`add_external_cost` werden die bewerteten Kosten (Ist + Schätzung, unbewertete Positionen zählen nicht) mit der Grenze bzw. dem zuletzt freigegebenen Betrag verglichen. Beim Überschreiten einmalig: `cases.cost_over_limit_at`, Verlaufseintrag `cost_limit_exceeded` (`payload {total_net, limit_net, approved_net, unvalued_items}`, Beträge nur für fleet/owner), Hinweis `cost_limit` (nicht dringend) an Fuhrparkleitung/Inhaber; Antwort des Befehls enthält `cost_limit_exceeded: true`. Kein Statuswechsel, keine Sperre. Vorgang liefert der Leitung `cost_limit {limit_net, approved_net, over_since}`; Werkstatt/Dispo sehen nur `cost_over_limit_at`, Fahrer nichts.

## Kostenbericht (App)
`GET /api/reports/costs?from=JJJJ-MM&to=JJJJ-MM[&vehicle_id=][&format=csv]` – Rollen Inhaber, Fuhrparkleitung, Lesezugriff. CSV: Semikolon, Dezimalkomma, UTF-8 mit BOM (Excel), Formel-Injektion neutralisiert; jeder Export wird im Audit-Log vermerkt. Nur für Inhaber/Fuhrparkleitung zusätzlich `contract_costs {until_month, total_net, vehicles[{net, contracts[{kind, partner, months, monthly_rate_net, net}]}], without_start, without_rate}`: Monatsraten laut Vertrag je ganz oder teilweise belegtem Kalendermonat bis höchstens zum laufenden Monat – getrennt von den Instandhaltungskosten, nicht im CSV, nicht über die Integrations-API. Ebenso nur für Inhaber/Fuhrparkleitung `claim_reimbursements {total_net, items[{case_id, case_no, vehicle_id, plate, insurer, claim_no, reimbursed_net, reimbursed_on}]}`: Versicherungserstattungen mit Erstattungsdatum im Zeitraum (Umgebung wie der Vorgang, ruhende Fahrzeuge ausgenommen) – **nicht** von den Instandhaltungskosten abgezogen.

## Prüftermin-Import (CSV)
Kopfzeile mit `Kennzeichen` und/oder `FIN`, `Art` (HU, SP, UVV, Tachograph … ; Aliase TÜV, Sicherheitsprüfung, Tacho, Fahrtenschreiber),
`Nächster Termin` (JJJJ-MM-TT, TT.MM.JJJJ oder Plakette MM/JJJJ → fällig bis Monatsende, im Nachweis vermerkt) **oder** `Letzte Prüfung` + `Intervall Monate`,
`Nachweis` (Pflicht je Zeile). Nur `Letzte Prüfung` ohne Termin/Intervall ist erlaubt (Rechnung ohne Fälligkeit): die Prüfung wird „ohne Termin“ gespeichert, ein bereits hinterlegtes Intervall wird angewendet – es wird nie ein Termin erfunden. Zuordnung über FIN, sonst nur über eindeutiges Kennzeichen. Ein vorhandener späterer Termin wird nie überschrieben;
gleiche Termine bleiben unverändert (Import ist wiederholbar). `?dry_run=1` liefert die Vorschau ohne zu speichern. Jeder Import/Export im Audit-Log.

## Kennzahlen (App)
`GET /api/reports/kpi?from=JJJJ-MM&to=JJJJ-MM` – Inhaber, Fuhrparkleitung, Lesezugriff. Je Priorität (`kritisch`/`mittel`/`niedrig`/`alle`): `created`, `released`, `rejected`, `open`, `triage`/`workshop_ack`/`created_to_release` als `{n, median_h, p90_h}`, `parts_wait_h`; `vehicles[]` mit `workshop_h`, `parts_wait_h` und `locked_h` (Zeit mit Sicherheitssperre, Überschneidungen einmal). `parts_eta` (Termintreue Teile-Liefertermine je Abschnitt „wartet auf Teile“: `kept`, `late`, `on_time_pct`, `late_days_median`, `open_overdue`, `without_eta`, `by_site[]`; nur eingetragene Liefertermine, Bewertung der Lieferung, nicht von Personen). Definitionen im Feld `definitions`.

`GET /api/reports/defects?days=90&kind=abfahrt|nach_reparatur` – Inhaber, Fuhrparkleitung. Mängelstatistik der Kontrollen (Zeitraum 7–730 Tage, Standard 90): `totals` (`checks`, `checks_with_defects`, `defect_items`, `again_after_repair`, `vehicles_checked`), `items[]` je Prüfpunkt (`item`, `defects`, `again_after_repair` = neue Vorgänge aus Kontrollen im Zeitraum, deren Prüfpunkt am selben Fahrzeug in den 90 Tagen davor freigegeben wurde, `vehicle_count`, `vehicles[]` max. 10 mit `plate`/`n`, `last_at`), `vehicles[]` je kontrolliertem Fahrzeug. Ruhende Fahrzeuge ausgenommen, ohne Personen.

## Reifen – Flotte (App)
`GET /api/tires/fleet?stale_days=90` – Inhaber, Fuhrparkleitung, Werkstatt, Lesezugriff. Je aktivem Fahrzeug `status` (unter_minimum/warnung/ok/unbekannt), `min_tread_mm`, `measured_positions`, `below_min`, `below_warn`, `oldest_measure_at`, `stale`; Summen in `totals`.
