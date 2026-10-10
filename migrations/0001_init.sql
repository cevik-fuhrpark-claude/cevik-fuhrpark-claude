-- [CLAUDE] Cevik Fuhrpark – Grundschema (Cloudflare D1 / SQLite)
-- Alle Vorgangsdaten tragen eine Umgebung ('test' | 'production'); die Trennung wird serverseitig erzwungen.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','fleet','workshop','dispatch','driver','viewer')),
  environment TEXT NOT NULL CHECK (environment IN ('test','production')),
  workshop_site TEXT NULL,               -- nur für Rolle workshop: zuständige Werkstatt
  employee_number TEXT NULL,
  language TEXT NOT NULL DEFAULT 'de' CHECK (language IN ('de','uk','en')),
  password_hash TEXT NULL,
  password_salt TEXT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by TEXT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  user_agent TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,                  -- username (lowercase)
  failures INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workshops (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
INSERT OR IGNORE INTO workshops(code, name) VALUES ('DORTMUND','Werkstatt Dortmund'),('MUENCHEN','Werkstatt München'),('EXTERN','Externe Werkstatt');

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,                   -- 'VIN:<FIN>' (kompatibel zum bestehenden Portal)
  vin TEXT NOT NULL UNIQUE,
  plate TEXT NOT NULL,
  site TEXT NULL,
  manufacturer TEXT NULL,
  model TEXT NULL,
  build_year INTEGER NULL,
  trailer_plate TEXT NULL,
  trailer_vin TEXT NULL,
  master_status TEXT NULL,               -- Status laut Stammliste (z. B. 'in Betrieb')
  source TEXT NULL,                      -- Herkunft des Stammsatzes
  telematics_note TEXT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);

CREATE TABLE IF NOT EXISTS driver_vehicles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  valid_from TEXT NOT NULL,
  valid_to TEXT NULL,
  evidence TEXT NULL,
  created_by TEXT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dv_user ON driver_vehicles(user_id);

CREATE TABLE IF NOT EXISTS case_counters (
  environment TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_no INTEGER NOT NULL,
  PRIMARY KEY (environment, year)
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  case_no TEXT NOT NULL UNIQUE,          -- z. B. S-2026-0001 (Betrieb) / T-2026-0001 (Test)
  environment TEXT NOT NULL CHECK (environment IN ('test','production')),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reporter_name_note TEXT NULL,          -- optionaler Fahrername (unbestätigt)
  description TEXT NOT NULL,
  location_note TEXT NULL,
  reported_priority TEXT NOT NULL CHECK (reported_priority IN ('niedrig','mittel','kritisch')),
  priority TEXT NOT NULL CHECK (priority IN ('niedrig','mittel','kritisch')),
  priority_reviewed INTEGER NOT NULL DEFAULT 0,
  reported_driveability TEXT NOT NULL CHECK (reported_driveability IN ('unbekannt','fahrbereit','eingeschraenkt','nicht_fahrbereit')),
  safety_lock INTEGER NOT NULL DEFAULT 0,
  safety_lock_reason TEXT NULL,
  status TEXT NOT NULL CHECK (status IN ('gemeldet','werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle','fahrzeug_freigegeben','abgelehnt')),
  workshop_site TEXT NULL REFERENCES workshops(code),
  suggested_workshop_site TEXT NULL,
  approval_scope TEXT NULL,
  fleet_received_at TEXT NULL,
  fleet_received_by TEXT NULL,
  workshop_ack_at TEXT NULL,
  workshop_ack_by TEXT NULL,
  planned_date TEXT NULL,
  origin TEXT NOT NULL DEFAULT 'meldung' CHECK (origin IN ('meldung','kontrolle','wartung','agent')),
  parent_case_id TEXT NULL REFERENCES cases(id),
  request_key TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT NULL,
  UNIQUE (environment, reporter_id, request_key)
);
CREATE INDEX IF NOT EXISTS idx_cases_env_status ON cases(environment, status);
CREATE INDEX IF NOT EXISTS idx_cases_vehicle ON cases(vehicle_id);

CREATE TABLE IF NOT EXISTS case_events (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  environment TEXT NOT NULL,
  actor_id TEXT NULL,
  actor_role TEXT NULL,
  action TEXT NOT NULL,
  from_status TEXT NULL,
  to_status TEXT NULL,
  from_version INTEGER NULL,
  to_version INTEGER NULL,
  note TEXT NULL,
  payload TEXT NULL,
  command_id TEXT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_case ON case_events(case_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_command ON case_events(case_id, command_id) WHERE command_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS work_entries (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  work_date TEXT NOT NULL,
  hours REAL NOT NULL CHECK (hours > 0 AND hours <= 24),
  description TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS parts (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  part_number TEXT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'Stk',
  unit_price_net REAL NULL,              -- NULL = unbewertet (nicht 0 €)
  valuation TEXT NOT NULL CHECK (valuation IN ('actual','estimate','unvalued')),
  supplier TEXT NULL,
  document_ref TEXT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS open_items (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  safety_relevant INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('offen','erledigt')),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  resolved_by TEXT NULL,
  resolved_at TEXT NULL,
  resolution_note TEXT NULL
);

CREATE TABLE IF NOT EXISTS external_costs (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  supplier TEXT NOT NULL,
  invoice_no TEXT NULL,
  amount_net REAL NULL,
  valuation TEXT NOT NULL CHECK (valuation IN ('actual','estimate','unvalued')),
  covers_work_and_parts INTEGER NOT NULL DEFAULT 0, -- 1 = ersetzt eigene Stunden/Teile (keine Doppelzählung)
  note TEXT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  case_id TEXT NULL REFERENCES cases(id) ON DELETE CASCADE,
  inspection_id TEXT NULL,
  environment TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  UNIQUE (case_id, sha256)
);

-- Standardisierte Fahrzeugkontrollen (nach Reparatur, Abfahrtskontrolle)
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  case_id TEXT NULL REFERENCES cases(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('nach_reparatur','abfahrt')),
  template_version TEXT NOT NULL,
  performed_by TEXT NOT NULL REFERENCES users(id),
  odometer_km INTEGER NULL,
  items TEXT NOT NULL,                   -- JSON: [{key, result: ok|mangel|na, note, file_ids[], followup_case_id}]
  result TEXT NOT NULL CHECK (result IN ('ok','maengel')),
  note TEXT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle ON inspections(vehicle_id, created_at);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_label TEXT NULL,
  created_at TEXT NOT NULL,
  last_success_at TEXT NULL,
  revoked_at TEXT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id TEXT NULL REFERENCES cases(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  urgent INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  push_status TEXT NOT NULL CHECK (push_status IN ('pending','accepted','failed','no_subscription','disabled')),
  push_attempts INTEGER NOT NULL DEFAULT 0,
  push_last_error TEXT NULL,
  push_accepted_at TEXT NULL,
  device_received_at TEXT NULL,
  opened_at TEXT NULL,
  acknowledged_at TEXT NULL,
  UNIQUE (event_key, user_id)
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at);

CREATE TABLE IF NOT EXISTS agent_findings (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL,
  finding_code TEXT NOT NULL,
  subject_key TEXT NOT NULL,             -- case_id oder vehicle_id oder 'system'
  case_id TEXT NULL,
  vehicle_id TEXT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','hinweis','handeln','kritisch')),
  message TEXT NOT NULL,
  next_action TEXT NOT NULL,
  owner_role TEXT NOT NULL,
  requires_decision INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('offen','erledigt')),
  fingerprint TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  resolved_at TEXT NULL,
  UNIQUE (environment, finding_code, subject_key)
);

CREATE TABLE IF NOT EXISTS master_inbox (
  event_id TEXT PRIMARY KEY,             -- idempotente Übergabe Fuhrparkagent -> Master
  schema_version TEXT NOT NULL,
  environment TEXT NOT NULL,
  source_agent TEXT NOT NULL,
  event_type TEXT NOT NULL,
  finding_id TEXT NULL,
  case_id TEXT NULL,
  vehicle_id TEXT NULL,
  severity TEXT NOT NULL,
  payload TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT NULL,
  decision_status TEXT NOT NULL DEFAULT 'offen' CHECK (decision_status IN ('offen','gesehen','entschieden','erledigt')),
  decided_by TEXT NULL,
  decision_note TEXT NULL,
  decided_at TEXT NULL
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL,
  trigger TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NULL,
  findings_open INTEGER NULL,
  handoffs INTEGER NULL,
  error TEXT NULL
);

CREATE TABLE IF NOT EXISTS maintenance_rules (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  kind TEXT NOT NULL,                    -- HU, SP, UVV, Ölwechsel, Bremsen, Reifen, Inspektion, Sonstiges
  interval_months INTEGER NULL,
  interval_km INTEGER NULL,
  last_done_date TEXT NULL,
  last_done_km INTEGER NULL,
  next_due_date TEXT NULL,               -- explizit belegter Termin (z. B. HU-Plakette)
  evidence TEXT NOT NULL,                -- Nachweis/Quelle ist Pflicht
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS odometer_readings (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  km INTEGER NOT NULL CHECK (km >= 0),
  measured_at TEXT NOT NULL,
  source TEXT NOT NULL,
  recorded_by TEXT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (vehicle_id, measured_at, source)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT NULL,
  action TEXT NOT NULL,
  target TEXT NULL,
  detail TEXT NULL,
  created_at TEXT NOT NULL
);

-- Hilfstabelle: Versions-Guard für atomare Befehle (bleibt leer)
CREATE TABLE IF NOT EXISTS cmd_guard (ok INTEGER NOT NULL CHECK (ok = 1));

-- Telematik: letzter bekannter Stand je Fahrzeug und Quelle (Einspeisung über Integrations-API, z. B. aus n8n)
CREATE TABLE IF NOT EXISTS telematics_latest (
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  provider TEXT NOT NULL,
  external_id TEXT NULL,
  match_basis TEXT NOT NULL CHECK (match_basis IN ('vin','confirmed_mapping')),
  gps_time TEXT NULL,
  received_at TEXT NOT NULL,
  lat REAL NULL,
  lon REAL NULL,
  km REAL NULL,
  speed REAL NULL,
  ignition INTEGER NULL,
  PRIMARY KEY (vehicle_id, provider)
);

-- Nicht eindeutig zuordenbare Quellsätze bleiben Prüffälle (keine Kennzeichen-Raterei)
CREATE TABLE IF NOT EXISTS telematics_unmatched (
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  source_plate TEXT NULL,
  source_vin TEXT NULL,
  candidate_vehicle_id TEXT NULL,
  last_seen TEXT NOT NULL,
  PRIMARY KEY (provider, external_id)
);

CREATE TABLE IF NOT EXISTS telematics_mappings (
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  evidence TEXT NOT NULL,
  confirmed_by TEXT NOT NULL,
  confirmed_at TEXT NOT NULL,
  PRIMARY KEY (provider, external_id)
);
