-- [CLAUDE] Reifenmanagement: Reifengrößen je Achse (Quelle/Prüfstatus) und Reifenereignisse je Position

CREATE TABLE IF NOT EXISTS tire_specs (
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  axle TEXT NOT NULL CHECK (axle IN ('lenkachse','liftachse','antriebsachse','anhaenger')),
  size TEXT NOT NULL,
  source TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,          -- 0 = Quellwert, nicht am Fahrzeug bestätigt
  verified_by TEXT NULL REFERENCES users(id),
  verified_at TEXT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (vehicle_id, axle)
);

CREATE TABLE IF NOT EXISTS tire_events (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment IN ('test','production')),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  position TEXT NOT NULL,                       -- z. B. VA-L, HA-R-aussen, AH2-L
  event_type TEXT NOT NULL CHECK (event_type IN ('messung','wechsel','reparatur','sichtpruefung')),
  tread_mm REAL NULL CHECK (tread_mm IS NULL OR (tread_mm >= 0 AND tread_mm <= 30)),
  pressure_bar REAL NULL CHECK (pressure_bar IS NULL OR (pressure_bar >= 0 AND pressure_bar <= 15)),
  size TEXT NULL,
  brand TEXT NULL,
  dot TEXT NULL,                                -- DOT-Code (Herstellwoche/-jahr)
  odometer_km INTEGER NULL,
  case_id TEXT NULL REFERENCES cases(id),
  note TEXT NULL,
  recorded_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tire_events_vehicle ON tire_events(environment, vehicle_id, position, created_at);
