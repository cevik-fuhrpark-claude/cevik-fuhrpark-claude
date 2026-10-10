-- [CLAUDE] Auslesungen Fahrerkarte / Massenspeicher Fahrtenschreiber (FPersV § 2 Abs. 5): nur erfasste Auslesungen, Fristen aus dem Gesetz
CREATE TABLE IF NOT EXISTS tacho_downloads (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment IN ('test','production')),
  kind TEXT NOT NULL CHECK (kind IN ('fahrerkarte','massenspeicher')),
  driver_id TEXT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id TEXT NULL REFERENCES vehicles(id),
  downloaded_on TEXT NOT NULL,
  evidence TEXT NOT NULL,
  note TEXT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  CHECK ((kind='fahrerkarte' AND driver_id IS NOT NULL AND vehicle_id IS NULL) OR (kind='massenspeicher' AND vehicle_id IS NOT NULL AND driver_id IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tacho_driver_day ON tacho_downloads(driver_id, downloaded_on) WHERE driver_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tacho_vehicle_day ON tacho_downloads(environment, vehicle_id, downloaded_on) WHERE vehicle_id IS NOT NULL;
