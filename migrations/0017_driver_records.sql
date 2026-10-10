-- [CLAUDE] Fahrerakte: Fahrer (auch ohne App-Konto), Nachweise mit belegtem Gültig-bis (Führerschein, Fahrerkarte, Code 95, Unterweisungen) und Führerscheinkontrollen
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment IN ('test','production')),
  display_name TEXT NOT NULL,
  personnel_no TEXT NULL,
  site TEXT NULL,
  user_id TEXT NULL REFERENCES users(id),
  active INTEGER NOT NULL DEFAULT 1,
  note TEXT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_user ON drivers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_env ON drivers(environment, active);
-- Nachweise: kind = fuehrerschein | fahrerkarte | code95 | unterweisung | sonstiges; Gültig-bis nur laut Dokument (nie berechnet)
CREATE TABLE IF NOT EXISTS driver_documents (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NULL,
  number TEXT NULL,
  license_classes TEXT NULL,
  issued_on TEXT NULL,
  valid_until TEXT NULL,
  evidence TEXT NOT NULL,
  superseded INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_driver_docs ON driver_documents(driver_id, kind, superseded);
-- Führerscheinkontrolle (Sichtprüfung des Originals durch den Halter/Beauftragten)
CREATE TABLE IF NOT EXISTS driver_license_checks (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  checked_on TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('in_ordnung','maengel','nicht_vorgelegt')),
  checked_by TEXT NOT NULL REFERENCES users(id),
  note TEXT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_license_checks ON driver_license_checks(driver_id, checked_on);
