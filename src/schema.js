// AUTOMATISCH ERZEUGT durch scripts/build-schema.mjs – nicht von Hand bearbeiten
export const MIGRATIONS = [
 {
  "id": "0001_init",
  "statements": [
   "CREATE TABLE IF NOT EXISTS users (\n  id TEXT PRIMARY KEY,\n  username TEXT NOT NULL UNIQUE COLLATE NOCASE,\n  display_name TEXT NOT NULL,\n  role TEXT NOT NULL CHECK (role IN ('owner','fleet','workshop','dispatch','driver','viewer')),\n  environment TEXT NOT NULL CHECK (environment IN ('test','production')),\n  workshop_site TEXT NULL,               -- nur für Rolle workshop: zuständige Werkstatt\n  employee_number TEXT NULL,\n  language TEXT NOT NULL DEFAULT 'de' CHECK (language IN ('de','uk','en')),\n  password_hash TEXT NULL,\n  password_salt TEXT NULL,\n  active INTEGER NOT NULL DEFAULT 1,\n  created_by TEXT NULL,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n)",
   "CREATE TABLE IF NOT EXISTS invites (\n  token_hash TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  created_by TEXT NULL,\n  created_at TEXT NOT NULL,\n  expires_at TEXT NOT NULL,\n  used_at TEXT NULL\n)",
   "CREATE TABLE IF NOT EXISTS sessions (\n  token_hash TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  created_at TEXT NOT NULL,\n  expires_at TEXT NOT NULL,\n  last_seen TEXT NOT NULL,\n  user_agent TEXT NULL\n)",
   "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
   "CREATE TABLE IF NOT EXISTS login_attempts (\n  key TEXT PRIMARY KEY,                  -- username (lowercase)\n  failures INTEGER NOT NULL DEFAULT 0,\n  locked_until TEXT NULL,\n  updated_at TEXT NOT NULL\n)",
   "CREATE TABLE IF NOT EXISTS workshops (\n  code TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  active INTEGER NOT NULL DEFAULT 1\n)",
   "INSERT OR IGNORE INTO workshops(code, name) VALUES ('DORTMUND','Werkstatt Dortmund'),('MUENCHEN','Werkstatt München'),('EXTERN','Externe Werkstatt')",
   "CREATE TABLE IF NOT EXISTS vehicles (\n  id TEXT PRIMARY KEY,                   -- 'VIN:<FIN>' (kompatibel zum bestehenden Portal)\n  vin TEXT NOT NULL UNIQUE,\n  plate TEXT NOT NULL,\n  site TEXT NULL,\n  manufacturer TEXT NULL,\n  model TEXT NULL,\n  build_year INTEGER NULL,\n  trailer_plate TEXT NULL,\n  trailer_vin TEXT NULL,\n  master_status TEXT NULL,               -- Status laut Stammliste (z. B. 'in Betrieb')\n  source TEXT NULL,                      -- Herkunft des Stammsatzes\n  telematics_note TEXT NULL,\n  active INTEGER NOT NULL DEFAULT 1,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n)",
   "CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate)",
   "CREATE TABLE IF NOT EXISTS driver_vehicles (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  valid_from TEXT NOT NULL,\n  valid_to TEXT NULL,\n  evidence TEXT NULL,\n  created_by TEXT NULL,\n  created_at TEXT NOT NULL\n)",
   "CREATE INDEX IF NOT EXISTS idx_dv_user ON driver_vehicles(user_id)",
   "CREATE TABLE IF NOT EXISTS case_counters (\n  environment TEXT NOT NULL,\n  year INTEGER NOT NULL,\n  last_no INTEGER NOT NULL,\n  PRIMARY KEY (environment, year)\n)",
   "CREATE TABLE IF NOT EXISTS cases (\n  id TEXT PRIMARY KEY,\n  case_no TEXT NOT NULL UNIQUE,          -- z. B. S-2026-0001 (Betrieb) / T-2026-0001 (Test)\n  environment TEXT NOT NULL CHECK (environment IN ('test','production')),\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  reporter_id TEXT NOT NULL REFERENCES users(id),\n  reporter_name_note TEXT NULL,          -- optionaler Fahrername (unbestätigt)\n  description TEXT NOT NULL,\n  location_note TEXT NULL,\n  reported_priority TEXT NOT NULL CHECK (reported_priority IN ('niedrig','mittel','kritisch')),\n  priority TEXT NOT NULL CHECK (priority IN ('niedrig','mittel','kritisch')),\n  priority_reviewed INTEGER NOT NULL DEFAULT 0,\n  reported_driveability TEXT NOT NULL CHECK (reported_driveability IN ('unbekannt','fahrbereit','eingeschraenkt','nicht_fahrbereit')),\n  safety_lock INTEGER NOT NULL DEFAULT 0,\n  safety_lock_reason TEXT NULL,\n  status TEXT NOT NULL CHECK (status IN ('gemeldet','werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle','fahrzeug_freigegeben','abgelehnt')),\n  workshop_site TEXT NULL REFERENCES workshops(code),\n  suggested_workshop_site TEXT NULL,\n  approval_scope TEXT NULL,\n  fleet_received_at TEXT NULL,\n  fleet_received_by TEXT NULL,\n  workshop_ack_at TEXT NULL,\n  workshop_ack_by TEXT NULL,\n  planned_date TEXT NULL,\n  origin TEXT NOT NULL DEFAULT 'meldung' CHECK (origin IN ('meldung','kontrolle','wartung','agent')),\n  parent_case_id TEXT NULL REFERENCES cases(id),\n  request_key TEXT NOT NULL,\n  content_hash TEXT NOT NULL,\n  version INTEGER NOT NULL DEFAULT 1,\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL,\n  closed_at TEXT NULL,\n  UNIQUE (environment, reporter_id, request_key)\n)",
   "CREATE INDEX IF NOT EXISTS idx_cases_env_status ON cases(environment, status)",
   "CREATE INDEX IF NOT EXISTS idx_cases_vehicle ON cases(vehicle_id)",
   "CREATE TABLE IF NOT EXISTS case_events (\n  id TEXT PRIMARY KEY,\n  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,\n  environment TEXT NOT NULL,\n  actor_id TEXT NULL,\n  actor_role TEXT NULL,\n  action TEXT NOT NULL,\n  from_status TEXT NULL,\n  to_status TEXT NULL,\n  from_version INTEGER NULL,\n  to_version INTEGER NULL,\n  note TEXT NULL,\n  payload TEXT NULL,\n  command_id TEXT NULL,\n  created_at TEXT NOT NULL\n)",
   "CREATE INDEX IF NOT EXISTS idx_events_case ON case_events(case_id, created_at)",
   "CREATE UNIQUE INDEX IF NOT EXISTS idx_events_command ON case_events(case_id, command_id) WHERE command_id IS NOT NULL",
   "CREATE TABLE IF NOT EXISTS work_entries (\n  id TEXT PRIMARY KEY,\n  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,\n  user_id TEXT NOT NULL REFERENCES users(id),\n  work_date TEXT NOT NULL,\n  hours REAL NOT NULL CHECK (hours > 0 AND hours <= 24),\n  description TEXT NOT NULL,\n  created_at TEXT NOT NULL\n)",
   "CREATE TABLE IF NOT EXISTS parts (\n  id TEXT PRIMARY KEY,\n  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,\n  user_id TEXT NOT NULL REFERENCES users(id),\n  name TEXT NOT NULL,\n  part_number TEXT NULL,\n  quantity REAL NOT NULL CHECK (quantity > 0),\n  unit TEXT NOT NULL DEFAULT 'Stk',\n  unit_price_net REAL NULL,              -- NULL = unbewertet (nicht 0 €)\n  valuation TEXT NOT NULL CHECK (valuation IN ('actual','estimate','unvalued')),\n  supplier TEXT NULL,\n  document_ref TEXT NULL,\n  created_at TEXT NOT NULL\n)",
   "CREATE TABLE IF NOT EXISTS open_items (\n  id TEXT PRIMARY KEY,\n  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,\n  description TEXT NOT NULL,\n  safety_relevant INTEGER NOT NULL DEFAULT 0,\n  status TEXT NOT NULL CHECK (status IN ('offen','erledigt')),\n  created_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  resolved_by TEXT NULL,\n  resolved_at TEXT NULL,\n  resolution_note TEXT NULL\n)",
   "CREATE TABLE IF NOT EXISTS external_costs (\n  id TEXT PRIMARY KEY,\n  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,\n  user_id TEXT NOT NULL REFERENCES users(id),\n  supplier TEXT NOT NULL,\n  invoice_no TEXT NULL,\n  amount_net REAL NULL,\n  valuation TEXT NOT NULL CHECK (valuation IN ('actual','estimate','unvalued')),\n  covers_work_and_parts INTEGER NOT NULL DEFAULT 0, -- 1 = ersetzt eigene Stunden/Teile (keine Doppelzählung)\n  note TEXT NULL,\n  created_at TEXT NOT NULL\n)",
   "CREATE TABLE IF NOT EXISTS files (\n  id TEXT PRIMARY KEY,\n  case_id TEXT NULL REFERENCES cases(id) ON DELETE CASCADE,\n  inspection_id TEXT NULL,\n  environment TEXT NOT NULL,\n  r2_key TEXT NOT NULL UNIQUE,\n  filename TEXT NOT NULL,\n  content_type TEXT NOT NULL,\n  size INTEGER NOT NULL,\n  sha256 TEXT NOT NULL,\n  uploaded_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  UNIQUE (case_id, sha256)\n)",
   "CREATE TABLE IF NOT EXISTS inspections (\n  id TEXT PRIMARY KEY,\n  environment TEXT NOT NULL,\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  case_id TEXT NULL REFERENCES cases(id) ON DELETE CASCADE,\n  kind TEXT NOT NULL CHECK (kind IN ('nach_reparatur','abfahrt')),\n  template_version TEXT NOT NULL,\n  performed_by TEXT NOT NULL REFERENCES users(id),\n  odometer_km INTEGER NULL,\n  items TEXT NOT NULL,                   -- JSON: [{key, result: ok|mangel|na, note, file_ids[], followup_case_id}]\n  result TEXT NOT NULL CHECK (result IN ('ok','maengel')),\n  note TEXT NULL,\n  created_at TEXT NOT NULL\n)",
   "CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspections(vehicle_id, created_at)",
   "CREATE TABLE IF NOT EXISTS push_subscriptions (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  endpoint TEXT NOT NULL UNIQUE,\n  p256dh TEXT NOT NULL,\n  auth TEXT NOT NULL,\n  device_label TEXT NULL,\n  created_at TEXT NOT NULL,\n  last_success_at TEXT NULL,\n  revoked_at TEXT NULL\n)",
   "CREATE TABLE IF NOT EXISTS notifications (\n  id TEXT PRIMARY KEY,\n  environment TEXT NOT NULL,\n  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n  case_id TEXT NULL REFERENCES cases(id) ON DELETE CASCADE,\n  event_key TEXT NOT NULL,\n  kind TEXT NOT NULL,\n  urgent INTEGER NOT NULL DEFAULT 0,\n  title TEXT NOT NULL,\n  body TEXT NOT NULL,\n  created_at TEXT NOT NULL,\n  push_status TEXT NOT NULL CHECK (push_status IN ('pending','accepted','failed','no_subscription','disabled')),\n  push_attempts INTEGER NOT NULL DEFAULT 0,\n  push_last_error TEXT NULL,\n  push_accepted_at TEXT NULL,\n  device_received_at TEXT NULL,\n  opened_at TEXT NULL,\n  acknowledged_at TEXT NULL,\n  UNIQUE (event_key, user_id)\n)",
   "CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at)",
   "CREATE TABLE IF NOT EXISTS agent_findings (\n  id TEXT PRIMARY KEY,\n  environment TEXT NOT NULL,\n  finding_code TEXT NOT NULL,\n  subject_key TEXT NOT NULL,             -- case_id oder vehicle_id oder 'system'\n  case_id TEXT NULL,\n  vehicle_id TEXT NULL,\n  severity TEXT NOT NULL CHECK (severity IN ('info','hinweis','handeln','kritisch')),\n  message TEXT NOT NULL,\n  next_action TEXT NOT NULL,\n  owner_role TEXT NOT NULL,\n  requires_decision INTEGER NOT NULL DEFAULT 0,\n  status TEXT NOT NULL CHECK (status IN ('offen','erledigt')),\n  fingerprint TEXT NOT NULL,\n  first_seen TEXT NOT NULL,\n  last_seen TEXT NOT NULL,\n  resolved_at TEXT NULL,\n  UNIQUE (environment, finding_code, subject_key)\n)",
   "CREATE TABLE IF NOT EXISTS master_inbox (\n  event_id TEXT PRIMARY KEY,             -- idempotente Übergabe Fuhrparkagent -> Master\n  schema_version TEXT NOT NULL,\n  environment TEXT NOT NULL,\n  source_agent TEXT NOT NULL,\n  event_type TEXT NOT NULL,\n  finding_id TEXT NULL,\n  case_id TEXT NULL,\n  vehicle_id TEXT NULL,\n  severity TEXT NOT NULL,\n  payload TEXT NOT NULL,\n  received_at TEXT NOT NULL,\n  processed_at TEXT NULL,\n  decision_status TEXT NOT NULL DEFAULT 'offen' CHECK (decision_status IN ('offen','gesehen','entschieden','erledigt')),\n  decided_by TEXT NULL,\n  decision_note TEXT NULL,\n  decided_at TEXT NULL\n)",
   "CREATE TABLE IF NOT EXISTS agent_runs (\n  id TEXT PRIMARY KEY,\n  environment TEXT NOT NULL,\n  trigger TEXT NOT NULL,\n  started_at TEXT NOT NULL,\n  finished_at TEXT NULL,\n  findings_open INTEGER NULL,\n  handoffs INTEGER NULL,\n  error TEXT NULL\n)",
   "CREATE TABLE IF NOT EXISTS maintenance_rules (\n  id TEXT PRIMARY KEY,\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  kind TEXT NOT NULL,                    -- HU, SP, UVV, Ölwechsel, Bremsen, Reifen, Inspektion, Sonstiges\n  interval_months INTEGER NULL,\n  interval_km INTEGER NULL,\n  last_done_date TEXT NULL,\n  last_done_km INTEGER NULL,\n  next_due_date TEXT NULL,               -- explizit belegter Termin (z. B. HU-Plakette)\n  evidence TEXT NOT NULL,                -- Nachweis/Quelle ist Pflicht\n  created_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n)",
   "CREATE TABLE IF NOT EXISTS odometer_readings (\n  id TEXT PRIMARY KEY,\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  km INTEGER NOT NULL CHECK (km >= 0),\n  measured_at TEXT NOT NULL,\n  source TEXT NOT NULL,\n  recorded_by TEXT NULL,\n  created_at TEXT NOT NULL,\n  UNIQUE (vehicle_id, measured_at, source)\n)",
   "CREATE TABLE IF NOT EXISTS settings (\n  key TEXT PRIMARY KEY,\n  value TEXT NOT NULL,\n  updated_by TEXT NULL,\n  updated_at TEXT NOT NULL\n)",
   "CREATE TABLE IF NOT EXISTS audit_log (\n  id TEXT PRIMARY KEY,\n  actor_id TEXT NULL,\n  action TEXT NOT NULL,\n  target TEXT NULL,\n  detail TEXT NULL,\n  created_at TEXT NOT NULL\n)",
   "CREATE TABLE IF NOT EXISTS cmd_guard (ok INTEGER NOT NULL CHECK (ok = 1))",
   "CREATE TABLE IF NOT EXISTS telematics_latest (\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  provider TEXT NOT NULL,\n  external_id TEXT NULL,\n  match_basis TEXT NOT NULL CHECK (match_basis IN ('vin','confirmed_mapping')),\n  gps_time TEXT NULL,\n  received_at TEXT NOT NULL,\n  lat REAL NULL,\n  lon REAL NULL,\n  km REAL NULL,\n  speed REAL NULL,\n  ignition INTEGER NULL,\n  PRIMARY KEY (vehicle_id, provider)\n)",
   "CREATE TABLE IF NOT EXISTS telematics_unmatched (\n  provider TEXT NOT NULL,\n  external_id TEXT NOT NULL,\n  source_plate TEXT NULL,\n  source_vin TEXT NULL,\n  candidate_vehicle_id TEXT NULL,\n  last_seen TEXT NOT NULL,\n  PRIMARY KEY (provider, external_id)\n)",
   "CREATE TABLE IF NOT EXISTS telematics_mappings (\n  provider TEXT NOT NULL,\n  external_id TEXT NOT NULL,\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  evidence TEXT NOT NULL,\n  confirmed_by TEXT NOT NULL,\n  confirmed_at TEXT NOT NULL,\n  PRIMARY KEY (provider, external_id)\n)"
  ]
 },
 {
  "id": "0002_tires",
  "statements": [
   "CREATE TABLE IF NOT EXISTS tire_specs (\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  axle TEXT NOT NULL CHECK (axle IN ('lenkachse','liftachse','antriebsachse','anhaenger')),\n  size TEXT NOT NULL,\n  source TEXT NOT NULL,\n  verified INTEGER NOT NULL DEFAULT 0,          -- 0 = Quellwert, nicht am Fahrzeug bestätigt\n  verified_by TEXT NULL REFERENCES users(id),\n  verified_at TEXT NULL,\n  updated_at TEXT NOT NULL,\n  PRIMARY KEY (vehicle_id, axle)\n)",
   "CREATE TABLE IF NOT EXISTS tire_events (\n  id TEXT PRIMARY KEY,\n  environment TEXT NOT NULL CHECK (environment IN ('test','production')),\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  position TEXT NOT NULL,                       -- z. B. VA-L, HA-R-aussen, AH2-L\n  event_type TEXT NOT NULL CHECK (event_type IN ('messung','wechsel','reparatur','sichtpruefung')),\n  tread_mm REAL NULL CHECK (tread_mm IS NULL OR (tread_mm >= 0 AND tread_mm <= 30)),\n  pressure_bar REAL NULL CHECK (pressure_bar IS NULL OR (pressure_bar >= 0 AND pressure_bar <= 15)),\n  size TEXT NULL,\n  brand TEXT NULL,\n  dot TEXT NULL,                                -- DOT-Code (Herstellwoche/-jahr)\n  odometer_km INTEGER NULL,\n  case_id TEXT NULL REFERENCES cases(id),\n  note TEXT NULL,\n  recorded_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL\n)",
   "CREATE INDEX IF NOT EXISTS idx_tire_events_vehicle ON tire_events(environment, vehicle_id, position, created_at)"
  ]
 },
 {
  "id": "0003_stock",
  "statements": [
   "CREATE TABLE IF NOT EXISTS stock_items (\n  id TEXT PRIMARY KEY,\n  environment TEXT NOT NULL CHECK (environment IN ('test','production')),\n  site TEXT NOT NULL REFERENCES workshops(code),\n  part_number TEXT NULL,\n  name TEXT NOT NULL,\n  unit TEXT NOT NULL DEFAULT 'Stk',\n  min_qty REAL NULL,                      -- Mindestbestand (leer = keine Meldung)\n  location TEXT NULL,                     -- Lagerort/Regal\n  unit_price_net REAL NULL,               -- letzter bekannter Einkaufspreis (leer = unbewertet)\n  active INTEGER NOT NULL DEFAULT 1,\n  created_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n)",
   "CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_unique ON stock_items(environment, site, COALESCE(part_number, ''), name)",
   "CREATE TABLE IF NOT EXISTS stock_movements (\n  id TEXT PRIMARY KEY,\n  environment TEXT NOT NULL,\n  item_id TEXT NOT NULL REFERENCES stock_items(id),\n  type TEXT NOT NULL CHECK (type IN ('zugang','entnahme','korrektur')),\n  qty REAL NOT NULL,                      -- vorzeichenbehaftet: Zugang +, Entnahme -\n  case_id TEXT NULL REFERENCES cases(id),\n  part_id TEXT NULL,\n  unit_price_net REAL NULL,\n  supplier TEXT NULL,\n  document_ref TEXT NULL,\n  note TEXT NULL,\n  user_id TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL\n)",
   "CREATE INDEX IF NOT EXISTS idx_stock_mov_item ON stock_movements(item_id, created_at)",
   "ALTER TABLE parts ADD COLUMN stock_item_id TEXT NULL"
  ]
 },
 {
  "id": "0004_fines",
  "statements": [
   "CREATE TABLE IF NOT EXISTS fines (\n  id TEXT PRIMARY KEY,\n  fine_no TEXT NOT NULL UNIQUE,                 -- z. B. B-2026-0001 (Betrieb) / TB-2026-0001 (Test)\n  environment TEXT NOT NULL CHECK (environment IN ('test','production')),\n  kind TEXT NOT NULL CHECK (kind IN ('anhoerung','zeugenfragebogen','bussgeldbescheid','verwarnung','maut','sonstiges')),\n  authority TEXT NOT NULL,                      -- Behörde / Absender\n  reference TEXT NULL,                          -- Aktenzeichen\n  offense_type TEXT NOT NULL CHECK (offense_type IN ('geschwindigkeit','abstand','parken','rotlicht','lenk_ruhezeit','ladung','maut','handy','sonstiges')),\n  offense_at TEXT NOT NULL,                     -- Tatzeit (ISO, laut Schreiben)\n  location TEXT NULL,\n  plate_in_letter TEXT NOT NULL,                -- Kennzeichen wie im Schreiben\n  vehicle_id TEXT NULL REFERENCES vehicles(id),\n  amount_eur REAL NULL,\n  response_due TEXT NULL,                       -- Antwortfrist laut Schreiben (YYYY-MM-DD), nie geschätzt\n  status TEXT NOT NULL CHECK (status IN ('eingegangen','fahrer_ermittelt','fahrer_informiert','beantwortet','bezahlt','eingestellt','erledigt')),\n  driver_id TEXT NULL REFERENCES users(id),\n  driver_name_note TEXT NULL,                   -- Fahrer ohne App-Konto (Name laut Nachweis)\n  driver_basis TEXT NULL CHECK (driver_basis IS NULL OR driver_basis IN ('zuordnung','tourenplan','telematik','fahrerangabe','manuell')),\n  driver_evidence TEXT NULL,\n  driver_confirmed_by TEXT NULL REFERENCES users(id),\n  driver_confirmed_at TEXT NULL,\n  driver_informed_at TEXT NULL,\n  driver_ack_at TEXT NULL,\n  note TEXT NULL,\n  created_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL,\n  version INTEGER NOT NULL DEFAULT 1\n)",
   "CREATE INDEX IF NOT EXISTS idx_fines_env_status ON fines(environment, status)",
   "CREATE TABLE IF NOT EXISTS fine_events (\n  id TEXT PRIMARY KEY,\n  fine_id TEXT NOT NULL REFERENCES fines(id) ON DELETE CASCADE,\n  actor_id TEXT NULL,\n  action TEXT NOT NULL,\n  note TEXT NULL,\n  payload TEXT NULL,\n  created_at TEXT NOT NULL\n)",
   "CREATE TABLE IF NOT EXISTS fine_counters (\n  environment TEXT NOT NULL,\n  year INTEGER NOT NULL,\n  last_no INTEGER NOT NULL,\n  PRIMARY KEY (environment, year)\n)",
   "ALTER TABLE files ADD COLUMN fine_id TEXT NULL"
  ]
 },
 {
  "id": "0005_maintenance_index",
  "statements": [
   "CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_kind ON maintenance_rules(vehicle_id, kind)",
   "CREATE INDEX IF NOT EXISTS idx_maintenance_due ON maintenance_rules(next_due_date)"
  ]
 },
 {
  "id": "0006_trailers",
  "statements": [
   "ALTER TABLE vehicles ADD COLUMN kind TEXT NOT NULL DEFAULT 'lkw' CHECK (kind IN ('lkw','anhaenger'))",
   "CREATE INDEX IF NOT EXISTS idx_vehicles_kind ON vehicles(kind)"
  ]
 },
 {
  "id": "0007_audit_index",
  "statements": [
   "CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at)"
  ]
 },
 {
  "id": "0008_rate_limits",
  "statements": [
   "CREATE TABLE IF NOT EXISTS rate_limits (\n  key TEXT PRIMARY KEY,                 -- '<aktion>:<benutzer-id>'\n  window_start INTEGER NOT NULL,        -- Fensterbeginn (Unix-Sekunden)\n  count INTEGER NOT NULL\n)"
  ]
 },
 {
  "id": "0009_vehicle_documents",
  "statements": [
   "ALTER TABLE files ADD COLUMN vehicle_id TEXT NULL",
   "ALTER TABLE files ADD COLUMN doc_kind TEXT NULL",
   "ALTER TABLE files ADD COLUMN doc_note TEXT NULL",
   "CREATE INDEX IF NOT EXISTS idx_files_vehicle ON files(vehicle_id)"
  ]
 },
 {
  "id": "0010_document_validity",
  "statements": [
   "ALTER TABLE files ADD COLUMN doc_valid_until TEXT NULL"
  ]
 },
 {
  "id": "0011_eval_excluded",
  "statements": [
   "ALTER TABLE vehicles ADD COLUMN eval_excluded INTEGER NOT NULL DEFAULT 0",
   "ALTER TABLE vehicles ADD COLUMN eval_excluded_reason TEXT NULL",
   "UPDATE vehicles SET eval_excluded=1, eval_excluded_reason='Reparatur oder Verkauf offen (Entscheidung Inhaber 10.10.2026)'\n  WHERE vin IN ('WDB9300561L373648','WDB9630051L903288','WDB9630051L909054','WDB9300561L373649','WDB9300561L373441','WJMA62AT20C378145','WDB96300510318431')"
  ]
 },
 {
  "id": "0012_usage_stats",
  "statements": [
   "CREATE TABLE IF NOT EXISTS usage_daily (\n  day TEXT NOT NULL,                    -- JJJJ-MM-TT (Berliner Zeit)\n  environment TEXT NOT NULL CHECK (environment IN ('test','production')),\n  feature TEXT NOT NULL,                -- z. B. 'POST cases/:id/commands'\n  calls INTEGER NOT NULL DEFAULT 0,\n  errors INTEGER NOT NULL DEFAULT 0,    -- Antworten mit Status >= 400\n  PRIMARY KEY (day, environment, feature)\n)"
  ]
 },
 {
  "id": "0013_odometer_note",
  "statements": [
   "ALTER TABLE odometer_readings ADD COLUMN note TEXT NULL",
   "CREATE INDEX IF NOT EXISTS idx_odometer_vehicle_time ON odometer_readings(vehicle_id, measured_at)"
  ]
 },
 {
  "id": "0014_maintenance_events",
  "statements": [
   "CREATE TABLE IF NOT EXISTS maintenance_events (\n  id TEXT PRIMARY KEY,\n  rule_id TEXT NOT NULL REFERENCES maintenance_rules(id),\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  kind TEXT NOT NULL,\n  done_date TEXT NOT NULL,               -- JJJJ-MM-TT laut Nachweis\n  done_km INTEGER NULL,\n  evidence TEXT NOT NULL,\n  source TEXT NOT NULL CHECK (source IN ('bestand','erfasst','erledigt','import')),\n  recorded_by TEXT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  UNIQUE (rule_id, done_date)\n)",
   "CREATE INDEX IF NOT EXISTS idx_maint_events_vehicle ON maintenance_events(vehicle_id, done_date)",
   "INSERT OR IGNORE INTO maintenance_events(id, rule_id, vehicle_id, kind, done_date, done_km, evidence, source, recorded_by, created_at)\n  SELECT lower(hex(randomblob(16))), id, vehicle_id, kind, last_done_date, last_done_km, evidence, 'bestand', NULL, updated_at\n  FROM maintenance_rules WHERE last_done_date IS NOT NULL"
  ]
 },
 {
  "id": "0015_push_prefs",
  "statements": [
   "ALTER TABLE users ADD COLUMN push_muted TEXT NULL"
  ]
 },
 {
  "id": "0016_hu_sp_rules",
  "statements": [
   "ALTER TABLE vehicles ADD COLUMN zgm_class TEXT NULL",
   "ALTER TABLE vehicles ADD COLUMN zgm_kg INTEGER NULL",
   "ALTER TABLE vehicles ADD COLUMN first_registration TEXT NULL",
   "ALTER TABLE vehicles ADD COLUMN spec_source TEXT NULL",
   "ALTER TABLE maintenance_rules ADD COLUMN due_source TEXT NULL",
   "ALTER TABLE maintenance_rules ADD COLUMN planned_date TEXT NULL",
   "ALTER TABLE maintenance_events ADD COLUMN result TEXT NULL",
   "UPDATE maintenance_rules SET due_source = CASE WHEN interval_months IS NOT NULL THEN 'berechnet' ELSE 'nachweis' END WHERE next_due_date IS NOT NULL AND due_source IS NULL",
   "UPDATE maintenance_rules SET due_source = 'berechnet' WHERE next_due_date IS NULL AND due_source IS NULL",
   "UPDATE vehicles SET zgm_class = CASE WHEN kind='anhaenger' THEN 'ueber_10' ELSE 'ueber_12' END, spec_source = 'Angabe Inhaber 10.10.2026: alle Lkw über 12 t, alle Anhänger über 10 t zGM' WHERE zgm_class IS NULL",
   "UPDATE maintenance_rules SET evidence = REPLACE(evidence, '; Intervall 6 Monate vom Inhaber bestätigt am 10.10.2026', ''), interval_months = NULL, due_source = 'berechnet' WHERE kind = 'SP' AND instr(evidence, 'Intervall 6 Monate vom Inhaber') > 0",
   "UPDATE maintenance_events SET evidence = REPLACE(evidence, '; Intervall 6 Monate vom Inhaber bestätigt am 10.10.2026', '') WHERE kind = 'SP' AND instr(evidence, 'Intervall 6 Monate vom Inhaber') > 0",
   "UPDATE maintenance_rules SET due_source = 'berechnet' WHERE kind = 'HU' AND instr(evidence, 'Intervall 12 Monate vom Inhaber') > 0",
   "INSERT INTO audit_log(id, actor_id, action, target, detail, created_at) VALUES (lower(hex(randomblob(16))), NULL, 'maintenance.husp_migration', NULL, '{\"grund\":\"SP-Frist nach StVZO Anlage VIII (6 Monate nach HU) statt pauschal 6 Monate nach letzter SP; zGM-Klassen laut Angabe Inhaber\"}', strftime('%Y-%m-%dT%H:%M:%fZ','now'))"
  ]
 },
 {
  "id": "0017_driver_records",
  "statements": [
   "CREATE TABLE IF NOT EXISTS drivers (\n  id TEXT PRIMARY KEY,\n  environment TEXT NOT NULL CHECK (environment IN ('test','production')),\n  display_name TEXT NOT NULL,\n  personnel_no TEXT NULL,\n  site TEXT NULL,\n  user_id TEXT NULL REFERENCES users(id),\n  active INTEGER NOT NULL DEFAULT 1,\n  note TEXT NULL,\n  created_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n)",
   "CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_user ON drivers(user_id) WHERE user_id IS NOT NULL",
   "CREATE INDEX IF NOT EXISTS idx_drivers_env ON drivers(environment, active)",
   "CREATE TABLE IF NOT EXISTS driver_documents (\n  id TEXT PRIMARY KEY,\n  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,\n  kind TEXT NOT NULL,\n  title TEXT NULL,\n  number TEXT NULL,\n  license_classes TEXT NULL,\n  issued_on TEXT NULL,\n  valid_until TEXT NULL,\n  evidence TEXT NOT NULL,\n  superseded INTEGER NOT NULL DEFAULT 0,\n  created_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL\n)",
   "CREATE INDEX IF NOT EXISTS idx_driver_docs ON driver_documents(driver_id, kind, superseded)",
   "CREATE TABLE IF NOT EXISTS driver_license_checks (\n  id TEXT PRIMARY KEY,\n  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,\n  checked_on TEXT NOT NULL,\n  result TEXT NOT NULL CHECK (result IN ('in_ordnung','maengel','nicht_vorgelegt')),\n  checked_by TEXT NOT NULL REFERENCES users(id),\n  note TEXT NULL,\n  created_at TEXT NOT NULL\n)",
   "CREATE INDEX IF NOT EXISTS idx_license_checks ON driver_license_checks(driver_id, checked_on)"
  ]
 },
 {
  "id": "0018_tacho_downloads",
  "statements": [
   "CREATE TABLE IF NOT EXISTS tacho_downloads (\n  id TEXT PRIMARY KEY,\n  environment TEXT NOT NULL CHECK (environment IN ('test','production')),\n  kind TEXT NOT NULL CHECK (kind IN ('fahrerkarte','massenspeicher')),\n  driver_id TEXT NULL REFERENCES drivers(id) ON DELETE CASCADE,\n  vehicle_id TEXT NULL REFERENCES vehicles(id),\n  downloaded_on TEXT NOT NULL,\n  evidence TEXT NOT NULL,\n  note TEXT NULL,\n  created_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  CHECK ((kind='fahrerkarte' AND driver_id IS NOT NULL AND vehicle_id IS NULL) OR (kind='massenspeicher' AND vehicle_id IS NOT NULL AND driver_id IS NULL))\n)",
   "CREATE UNIQUE INDEX IF NOT EXISTS idx_tacho_driver_day ON tacho_downloads(driver_id, downloaded_on) WHERE driver_id IS NOT NULL",
   "CREATE UNIQUE INDEX IF NOT EXISTS idx_tacho_vehicle_day ON tacho_downloads(environment, vehicle_id, downloaded_on) WHERE vehicle_id IS NOT NULL"
  ]
 },
 {
  "id": "0019_case_check_item",
  "statements": [
   "ALTER TABLE cases ADD COLUMN check_item TEXT NULL",
   "CREATE INDEX IF NOT EXISTS idx_cases_check_item ON cases(vehicle_id, environment, check_item)"
  ]
 },
 {
  "id": "0020_vehicle_contracts",
  "statements": [
   "CREATE TABLE IF NOT EXISTS vehicle_contracts (\n  id TEXT PRIMARY KEY,\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  kind TEXT NOT NULL CHECK (kind IN ('leasing','miete','finanzierung','versicherung','wartung','sonstiges')),\n  partner TEXT NOT NULL,\n  contract_no TEXT NULL,\n  start_date TEXT NULL,\n  end_date TEXT NULL,\n  notice_months INTEGER NULL,\n  km_allowance INTEGER NULL,\n  start_km INTEGER NULL,\n  monthly_rate_net REAL NULL,\n  evidence TEXT NOT NULL,\n  note TEXT NULL,\n  ended_on TEXT NULL,\n  end_note TEXT NULL,\n  created_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n)",
   "CREATE INDEX IF NOT EXISTS idx_vehicle_contracts_vehicle ON vehicle_contracts(vehicle_id, ended_on)"
  ]
 },
 {
  "id": "0021_contract_file",
  "statements": [
   "ALTER TABLE vehicle_contracts ADD COLUMN file_id TEXT NULL"
  ]
 },
 {
  "id": "0022_insurance_claims",
  "statements": [
   "CREATE TABLE IF NOT EXISTS insurance_claims (\n  id TEXT PRIMARY KEY,\n  case_id TEXT NOT NULL UNIQUE REFERENCES cases(id),\n  environment TEXT NOT NULL,\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  contract_id TEXT NULL REFERENCES vehicle_contracts(id),\n  insurer TEXT NOT NULL,\n  claim_no TEXT NULL,\n  reported_on TEXT NOT NULL,\n  status TEXT NOT NULL CHECK (status IN ('gemeldet','in_pruefung','reguliert','abgelehnt','zurueckgezogen')),\n  deductible_net REAL NULL,\n  reimbursed_net REAL NULL,\n  reimbursed_on TEXT NULL,\n  evidence TEXT NOT NULL,\n  note TEXT NULL,\n  created_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n)",
   "CREATE INDEX IF NOT EXISTS idx_insurance_claims_env ON insurance_claims(environment, status)"
  ]
 },
 {
  "id": "0023_claim_file",
  "statements": [
   "ALTER TABLE insurance_claims ADD COLUMN file_id TEXT NULL"
  ]
 },
 {
  "id": "0024_parts_eta",
  "statements": [
   "ALTER TABLE cases ADD COLUMN parts_expected_date TEXT NULL"
  ]
 },
 {
  "id": "0025_cost_limit",
  "statements": [
   "ALTER TABLE cases ADD COLUMN cost_over_limit_at TEXT NULL",
   "ALTER TABLE cases ADD COLUMN cost_approved_net REAL NULL"
  ]
 },
 {
  "id": "0026_maintenance_orders",
  "statements": [
   "ALTER TABLE cases ADD COLUMN maintenance_rule_id TEXT NULL",
   "CREATE INDEX IF NOT EXISTS idx_cases_mrule ON cases(maintenance_rule_id, environment)"
  ]
 },
 {
  "id": "0027_case_maintenance_event",
  "statements": [
   "ALTER TABLE cases ADD COLUMN maintenance_event_id TEXT NULL",
   "CREATE INDEX IF NOT EXISTS idx_cases_mevent ON cases(maintenance_event_id, environment)"
  ]
 },
 {
  "id": "0028_user_home_site",
  "statements": [
   "ALTER TABLE users ADD COLUMN home_site TEXT NULL"
  ]
 },
 {
  "id": "0029_stock_transfer",
  "statements": [
   "ALTER TABLE stock_movements ADD COLUMN transfer_id TEXT NULL",
   "ALTER TABLE stock_movements ADD COLUMN transfer_site TEXT NULL; -- Gegenlager (bei Entnahme: Ziel, bei Zugang: Quelle)\nCREATE INDEX IF NOT EXISTS idx_stock_mov_transfer ON stock_movements(transfer_id)"
  ]
 },
 {
  "id": "0030_stock_order_marker",
  "statements": [
   "ALTER TABLE stock_items ADD COLUMN ordered_qty REAL NULL",
   "ALTER TABLE stock_items ADD COLUMN ordered_on TEXT NULL",
   "ALTER TABLE stock_items ADD COLUMN ordered_eta TEXT NULL",
   "ALTER TABLE stock_items ADD COLUMN ordered_note TEXT NULL",
   "ALTER TABLE stock_items ADD COLUMN ordered_by TEXT NULL"
  ]
 },
 {
  "id": "0031_case_duplicate",
  "statements": [
   "ALTER TABLE cases ADD COLUMN duplicate_of TEXT NULL",
   "CREATE INDEX IF NOT EXISTS idx_cases_duplicate_of ON cases(duplicate_of)"
  ]
 },
 {
  "id": "0032_vehicle_notes",
  "statements": [
   "CREATE TABLE IF NOT EXISTS vehicle_notes (\n  id TEXT PRIMARY KEY,\n  environment TEXT NOT NULL CHECK (environment IN ('test','production')),\n  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),\n  text TEXT NOT NULL,\n  for_driver INTEGER NOT NULL DEFAULT 0,\n  created_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  archived_at TEXT NULL,\n  archived_by TEXT NULL REFERENCES users(id)\n)",
   "CREATE INDEX IF NOT EXISTS idx_vehicle_notes_vehicle ON vehicle_notes(vehicle_id, environment, archived_at)"
  ]
 },
 {
  "id": "0033_vehicle_note_valid_until",
  "statements": [
   "ALTER TABLE vehicle_notes ADD COLUMN valid_until TEXT NULL"
  ]
 },
 {
  "id": "0034_warranty",
  "statements": [
   "ALTER TABLE parts ADD COLUMN warranty_until TEXT NULL",
   "ALTER TABLE external_costs ADD COLUMN warranty_until TEXT NULL"
  ]
 },
 {
  "id": "0035_case_child_indexes",
  "statements": [
   "CREATE INDEX IF NOT EXISTS idx_work_entries_case ON work_entries(case_id)",
   "CREATE INDEX IF NOT EXISTS idx_parts_case ON parts(case_id)",
   "CREATE INDEX IF NOT EXISTS idx_external_costs_case ON external_costs(case_id)",
   "CREATE INDEX IF NOT EXISTS idx_open_items_case ON open_items(case_id, status)",
   "CREATE INDEX IF NOT EXISTS idx_files_case ON files(case_id)"
  ]
 },
 {
  "id": "0036_more_indexes",
  "statements": [
   "CREATE INDEX IF NOT EXISTS idx_inspections_case ON inspections(case_id, created_at)",
   "CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at)",
   "CREATE INDEX IF NOT EXISTS idx_notif_case ON notifications(case_id, kind)",
   "CREATE INDEX IF NOT EXISTS idx_fine_events_fine ON fine_events(fine_id, created_at)",
   "CREATE INDEX IF NOT EXISTS idx_files_fine ON files(fine_id)",
   "CREATE INDEX IF NOT EXISTS idx_dv_vehicle ON driver_vehicles(vehicle_id)",
   "CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id)",
   "CREATE INDEX IF NOT EXISTS idx_agent_runs_env ON agent_runs(environment, started_at)",
   "CREATE INDEX IF NOT EXISTS idx_agent_runs_started ON agent_runs(started_at)",
   "CREATE INDEX IF NOT EXISTS idx_master_inbox_env ON master_inbox(environment, processed_at)"
  ]
 },
 {
  "id": "0037_case_followup",
  "statements": [
   "ALTER TABLE cases ADD COLUMN followup_on TEXT NULL",
   "ALTER TABLE cases ADD COLUMN followup_note TEXT NULL",
   "CREATE INDEX IF NOT EXISTS idx_cases_followup ON cases(environment, followup_on) WHERE followup_on IS NOT NULL"
  ]
 },
 {
  "id": "0038_cases_updated_index",
  "statements": [
   "CREATE INDEX IF NOT EXISTS idx_cases_env_updated ON cases(environment, updated_at, id)"
  ]
 },
 {
  "id": "0039_fines_created_index",
  "statements": [
   "CREATE INDEX IF NOT EXISTS idx_fines_env_created ON fines(environment, created_at)"
  ]
 },
 {
  "id": "0040_maintenance_due_km",
  "statements": [
   "ALTER TABLE maintenance_rules ADD COLUMN due_km INTEGER NULL"
  ]
 },
 {
  "id": "0041_tire_winter_mark",
  "statements": [
   "ALTER TABLE tire_events ADD COLUMN winter_mark TEXT NULL CHECK (winter_mark IS NULL OR winter_mark IN ('3pmsf','ms','keine'))"
  ]
 },
 {
  "id": "0042_case_tire_order",
  "statements": [
   "ALTER TABLE cases ADD COLUMN tire_order TEXT NULL",
   "CREATE INDEX IF NOT EXISTS idx_cases_tire_order ON cases(vehicle_id, tire_order, environment)"
  ]
 },
 {
  "id": "0043_telematics_source_plate",
  "statements": [
   "ALTER TABLE telematics_latest ADD COLUMN source_plate TEXT NULL"
  ]
 },
 {
  "id": "0044_audit_target_index",
  "statements": [
   "CREATE INDEX IF NOT EXISTS idx_audit_target_action ON audit_log(target, action, created_at)"
  ]
 },
 {
  "id": "0045_finding_message_args",
  "statements": [
   "ALTER TABLE agent_findings ADD COLUMN message_args TEXT NULL"
  ]
 },
 {
  "id": "0046_findings_vehicle_index",
  "statements": [
   "CREATE INDEX IF NOT EXISTS idx_findings_vehicle ON agent_findings(vehicle_id, environment, status)"
  ]
 },
 {
  "id": "0047_emergency_contacts",
  "statements": [
   "CREATE TABLE IF NOT EXISTS emergency_contacts (\n  id TEXT PRIMARY KEY,\n  environment TEXT NOT NULL CHECK (environment IN ('test','production')),\n  kind TEXT NOT NULL CHECK (kind IN ('dispo','panne','werkstatt','versicherung','sonstiges')),\n  label TEXT NOT NULL,\n  phone TEXT NOT NULL,\n  note TEXT NULL,\n  site TEXT NULL,\n  vehicle_id TEXT NULL REFERENCES vehicles(id),\n  created_by TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  updated_by TEXT NULL REFERENCES users(id),\n  updated_at TEXT NOT NULL,\n  archived_at TEXT NULL,\n  archived_by TEXT NULL REFERENCES users(id),\n  CHECK (site IS NULL OR vehicle_id IS NULL)\n)",
   "CREATE INDEX IF NOT EXISTS idx_emergency_contacts_env ON emergency_contacts(environment, archived_at)"
  ]
 },
 {
  "id": "0048_totp",
  "statements": [
   "ALTER TABLE users ADD COLUMN totp_secret TEXT NULL",
   "ALTER TABLE users ADD COLUMN totp_pending TEXT NULL",
   "ALTER TABLE users ADD COLUMN totp_enabled_at TEXT NULL",
   "ALTER TABLE users ADD COLUMN totp_last_step INTEGER NULL",
   "ALTER TABLE users ADD COLUMN totp_recovery TEXT NULL",
   "CREATE TABLE IF NOT EXISTS login_challenges (\n  token_hash TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL REFERENCES users(id),\n  created_at TEXT NOT NULL,\n  expires_at TEXT NOT NULL,\n  attempts INTEGER NOT NULL DEFAULT 0\n)",
   "CREATE INDEX IF NOT EXISTS idx_login_challenges_user ON login_challenges(user_id)"
  ]
 },
 {
  "id": "0049_push_quiet",
  "statements": [
   "ALTER TABLE users ADD COLUMN push_quiet_from TEXT NULL",
   "ALTER TABLE users ADD COLUMN push_quiet_to TEXT NULL",
   "ALTER TABLE notifications ADD COLUMN push_hold_until TEXT NULL",
   "CREATE INDEX IF NOT EXISTS idx_notifications_hold ON notifications(push_hold_until) WHERE push_status = 'pending' AND push_hold_until IS NOT NULL"
  ]
 },
 {
  "id": "0050_known_devices",
  "statements": [
   "CREATE TABLE IF NOT EXISTS known_devices (\n  user_id TEXT NOT NULL REFERENCES users(id),\n  device_hash TEXT NOT NULL,\n  label TEXT,\n  first_seen TEXT NOT NULL,\n  last_seen TEXT NOT NULL,\n  PRIMARY KEY (user_id, device_hash)\n)",
   "CREATE INDEX IF NOT EXISTS idx_known_devices_seen ON known_devices(last_seen)"
  ]
 },
 {
  "id": "0051_audit_actor_index",
  "statements": [
   "CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id, created_at)"
  ]
 },
 {
  "id": "0052_stock_last_counted",
  "statements": [
   "ALTER TABLE stock_items ADD COLUMN last_counted_at TEXT NULL",
   "ALTER TABLE stock_items ADD COLUMN last_counted_qty REAL NULL"
  ]
 },
 {
  "id": "0053_notification_lang",
  "statements": [
   "ALTER TABLE notifications ADD COLUMN lang TEXT NULL"
  ]
 },
 {
  "id": "0054_notification_ref",
  "statements": [
   "ALTER TABLE notifications ADD COLUMN ref TEXT NULL"
  ]
 },
 {
  "id": "0055_maintenance_km_basis_at",
  "statements": [
   "ALTER TABLE maintenance_rules ADD COLUMN km_basis_at TEXT NULL",
   "UPDATE maintenance_rules SET km_basis_at = updated_at WHERE km_basis_at IS NULL"
  ]
 },
 {
  "id": "0056_notification_hidden",
  "statements": [
   "ALTER TABLE notifications ADD COLUMN hidden_at TEXT NULL"
  ]
 },
 {
  "id": "0057_stock_request_key",
  "statements": [
   "ALTER TABLE stock_movements ADD COLUMN request_key TEXT NULL",
   "CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_request_key ON stock_movements(request_key) WHERE request_key IS NOT NULL"
  ]
 },
 {
  "id": "0058_contract_km_basis_at",
  "statements": [
   "ALTER TABLE vehicle_contracts ADD COLUMN km_basis_at TEXT NULL",
   "UPDATE vehicle_contracts SET km_basis_at = updated_at WHERE km_basis_at IS NULL"
  ]
 },
 {
  "id": "0059_push_session",
  "statements": [
   "ALTER TABLE push_subscriptions ADD COLUMN session_hash TEXT NULL"
  ]
 },
 {
  "id": "0060_work_entry_site",
  "statements": [
   "ALTER TABLE work_entries ADD COLUMN site TEXT NULL"
  ]
 },
 {
  "id": "0061_fine_request_key",
  "statements": [
   "ALTER TABLE fines ADD COLUMN request_key TEXT NULL",
   "CREATE UNIQUE INDEX IF NOT EXISTS idx_fines_request_key ON fines(request_key) WHERE request_key IS NOT NULL"
  ]
 },
 {
  "id": "0062_tacho_cancel",
  "statements": [
   "ALTER TABLE tacho_downloads ADD COLUMN cancelled_at TEXT NULL",
   "ALTER TABLE tacho_downloads ADD COLUMN cancelled_by TEXT NULL",
   "ALTER TABLE tacho_downloads ADD COLUMN cancel_reason TEXT NULL",
   "DROP INDEX IF EXISTS idx_tacho_driver_day",
   "DROP INDEX IF EXISTS idx_tacho_vehicle_day",
   "CREATE UNIQUE INDEX IF NOT EXISTS idx_tacho_driver_day_valid ON tacho_downloads(driver_id, downloaded_on) WHERE driver_id IS NOT NULL AND cancelled_at IS NULL",
   "CREATE UNIQUE INDEX IF NOT EXISTS idx_tacho_vehicle_day_valid ON tacho_downloads(environment, vehicle_id, downloaded_on) WHERE vehicle_id IS NOT NULL AND cancelled_at IS NULL"
  ]
 },
 {
  "id": "0063_driver_doc_cancel",
  "statements": [
   "ALTER TABLE driver_documents ADD COLUMN cancelled_at TEXT NULL",
   "ALTER TABLE driver_documents ADD COLUMN cancelled_by TEXT NULL",
   "ALTER TABLE driver_documents ADD COLUMN cancel_reason TEXT NULL"
  ]
 },
 {
  "id": "0064_tire_request_key",
  "statements": [
   "ALTER TABLE tire_events ADD COLUMN request_key TEXT NULL",
   "CREATE UNIQUE INDEX IF NOT EXISTS idx_tire_events_request_key ON tire_events(vehicle_id, request_key, position) WHERE request_key IS NOT NULL"
  ]
 },
 {
  "id": "0065_license_check_cancel",
  "statements": [
   "ALTER TABLE driver_license_checks ADD COLUMN cancelled_at TEXT NULL",
   "ALTER TABLE driver_license_checks ADD COLUMN cancelled_by TEXT NULL",
   "ALTER TABLE driver_license_checks ADD COLUMN cancel_reason TEXT NULL"
  ]
 },
 {
  "id": "0066_telematics_km_at",
  "statements": [
   "ALTER TABLE telematics_latest ADD COLUMN km_at TEXT",
   "UPDATE telematics_latest SET km_at = gps_time WHERE km IS NOT NULL AND km_at IS NULL"
  ]
 },
 {
  "id": "0067_stock_item_key",
  "statements": [
   "ALTER TABLE stock_items ADD COLUMN item_key TEXT",
   "CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_item_key ON stock_items(environment, site, item_key) WHERE item_key IS NOT NULL"
  ]
 },
 {
  "id": "0068_case_event_command_hash",
  "statements": [
   "ALTER TABLE case_events ADD COLUMN command_hash TEXT"
  ]
 },
 {
  "id": "0069_users_was_driver",
  "statements": [
   "ALTER TABLE users ADD COLUMN was_driver INTEGER NOT NULL DEFAULT 0",
   "UPDATE users SET was_driver = 1 WHERE role = 'driver'\n  OR EXISTS (SELECT 1 FROM audit_log a WHERE a.target = users.id AND a.action IN ('user.create', 'user.update') AND json_extract(a.detail, '$.role') = 'driver')\n  OR EXISTS (SELECT 1 FROM audit_log a WHERE a.target = users.id AND a.action = 'user.update' AND json_extract(a.detail, '$.changed.role.from') = 'driver')\n  OR EXISTS (SELECT 1 FROM case_events e WHERE e.actor_id = users.id AND e.actor_role = 'driver')"
  ]
 }
];
export const TABLE_COLUMNS = {"_migrations":["id","applied_at"],"agent_findings":["id","environment","finding_code","subject_key","case_id","vehicle_id","severity","message","next_action","owner_role","requires_decision","status","fingerprint","first_seen","last_seen","resolved_at","message_args"],"agent_runs":["id","environment","trigger","started_at","finished_at","findings_open","handoffs","error"],"audit_log":["id","actor_id","action","target","detail","created_at"],"case_counters":["environment","year","last_no"],"case_events":["id","case_id","environment","actor_id","actor_role","action","from_status","to_status","from_version","to_version","note","payload","command_id","created_at","command_hash"],"cases":["id","case_no","environment","vehicle_id","reporter_id","reporter_name_note","description","location_note","reported_priority","priority","priority_reviewed","reported_driveability","safety_lock","safety_lock_reason","status","workshop_site","suggested_workshop_site","approval_scope","fleet_received_at","fleet_received_by","workshop_ack_at","workshop_ack_by","planned_date","origin","parent_case_id","request_key","content_hash","version","created_at","updated_at","closed_at","check_item","parts_expected_date","cost_over_limit_at","cost_approved_net","maintenance_rule_id","maintenance_event_id","duplicate_of","followup_on","followup_note","tire_order"],"cmd_guard":["ok"],"driver_documents":["id","driver_id","kind","title","number","license_classes","issued_on","valid_until","evidence","superseded","created_by","created_at","cancelled_at","cancelled_by","cancel_reason"],"driver_license_checks":["id","driver_id","checked_on","result","checked_by","note","created_at","cancelled_at","cancelled_by","cancel_reason"],"driver_vehicles":["id","user_id","vehicle_id","valid_from","valid_to","evidence","created_by","created_at"],"drivers":["id","environment","display_name","personnel_no","site","user_id","active","note","created_by","created_at","updated_at"],"emergency_contacts":["id","environment","kind","label","phone","note","site","vehicle_id","created_by","created_at","updated_by","updated_at","archived_at","archived_by"],"external_costs":["id","case_id","user_id","supplier","invoice_no","amount_net","valuation","covers_work_and_parts","note","created_at","warranty_until"],"files":["id","case_id","inspection_id","environment","r2_key","filename","content_type","size","sha256","uploaded_by","created_at","fine_id","vehicle_id","doc_kind","doc_note","doc_valid_until"],"fine_counters":["environment","year","last_no"],"fine_events":["id","fine_id","actor_id","action","note","payload","created_at"],"fines":["id","fine_no","environment","kind","authority","reference","offense_type","offense_at","location","plate_in_letter","vehicle_id","amount_eur","response_due","status","driver_id","driver_name_note","driver_basis","driver_evidence","driver_confirmed_by","driver_confirmed_at","driver_informed_at","driver_ack_at","note","created_by","created_at","updated_at","version","request_key"],"inspections":["id","environment","vehicle_id","case_id","kind","template_version","performed_by","odometer_km","items","result","note","created_at"],"insurance_claims":["id","case_id","environment","vehicle_id","contract_id","insurer","claim_no","reported_on","status","deductible_net","reimbursed_net","reimbursed_on","evidence","note","created_by","created_at","updated_at","file_id"],"invites":["token_hash","user_id","created_by","created_at","expires_at","used_at"],"known_devices":["user_id","device_hash","label","first_seen","last_seen"],"login_attempts":["key","failures","locked_until","updated_at"],"login_challenges":["token_hash","user_id","created_at","expires_at","attempts"],"maintenance_events":["id","rule_id","vehicle_id","kind","done_date","done_km","evidence","source","recorded_by","created_at","result"],"maintenance_rules":["id","vehicle_id","kind","interval_months","interval_km","last_done_date","last_done_km","next_due_date","evidence","created_by","created_at","updated_at","due_source","planned_date","due_km","km_basis_at"],"master_inbox":["event_id","schema_version","environment","source_agent","event_type","finding_id","case_id","vehicle_id","severity","payload","received_at","processed_at","decision_status","decided_by","decision_note","decided_at"],"notifications":["id","environment","user_id","case_id","event_key","kind","urgent","title","body","created_at","push_status","push_attempts","push_last_error","push_accepted_at","device_received_at","opened_at","acknowledged_at","push_hold_until","lang","ref","hidden_at"],"odometer_readings":["id","vehicle_id","km","measured_at","source","recorded_by","created_at","note"],"open_items":["id","case_id","description","safety_relevant","status","created_by","created_at","resolved_by","resolved_at","resolution_note"],"parts":["id","case_id","user_id","name","part_number","quantity","unit","unit_price_net","valuation","supplier","document_ref","created_at","stock_item_id","warranty_until"],"push_subscriptions":["id","user_id","endpoint","p256dh","auth","device_label","created_at","last_success_at","revoked_at","session_hash"],"rate_limits":["key","window_start","count"],"sessions":["token_hash","user_id","created_at","expires_at","last_seen","user_agent"],"settings":["key","value","updated_by","updated_at"],"stock_items":["id","environment","site","part_number","name","unit","min_qty","location","unit_price_net","active","created_by","created_at","updated_at","ordered_qty","ordered_on","ordered_eta","ordered_note","ordered_by","last_counted_at","last_counted_qty","item_key"],"stock_movements":["id","environment","item_id","type","qty","case_id","part_id","unit_price_net","supplier","document_ref","note","user_id","created_at","transfer_id","transfer_site","request_key"],"tacho_downloads":["id","environment","kind","driver_id","vehicle_id","downloaded_on","evidence","note","created_by","created_at","cancelled_at","cancelled_by","cancel_reason"],"telematics_latest":["vehicle_id","provider","external_id","match_basis","gps_time","received_at","lat","lon","km","speed","ignition","source_plate","km_at"],"telematics_mappings":["provider","external_id","vehicle_id","evidence","confirmed_by","confirmed_at"],"telematics_unmatched":["provider","external_id","source_plate","source_vin","candidate_vehicle_id","last_seen"],"tire_events":["id","environment","vehicle_id","position","event_type","tread_mm","pressure_bar","size","brand","dot","odometer_km","case_id","note","recorded_by","created_at","winter_mark","request_key"],"tire_specs":["vehicle_id","axle","size","source","verified","verified_by","verified_at","updated_at"],"usage_daily":["day","environment","feature","calls","errors"],"users":["id","username","display_name","role","environment","workshop_site","employee_number","language","password_hash","password_salt","active","created_by","created_at","updated_at","push_muted","home_site","totp_secret","totp_pending","totp_enabled_at","totp_last_step","totp_recovery","push_quiet_from","push_quiet_to","was_driver"],"vehicle_contracts":["id","vehicle_id","kind","partner","contract_no","start_date","end_date","notice_months","km_allowance","start_km","monthly_rate_net","evidence","note","ended_on","end_note","created_by","created_at","updated_at","file_id","km_basis_at"],"vehicle_notes":["id","environment","vehicle_id","text","for_driver","created_by","created_at","archived_at","archived_by","valid_until"],"vehicles":["id","vin","plate","site","manufacturer","model","build_year","trailer_plate","trailer_vin","master_status","source","telematics_note","active","created_at","updated_at","kind","eval_excluded","eval_excluded_reason","zgm_class","zgm_kg","first_registration","spec_source"],"work_entries":["id","case_id","user_id","work_date","hours","description","created_at","site"],"workshops":["code","name","active"]};
