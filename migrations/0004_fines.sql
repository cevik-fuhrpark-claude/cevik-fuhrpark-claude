-- [CLAUDE] Bußgelder, Anhörungen und Zeugenfragebögen: Fahrerermittlung zum Tatzeitpunkt, Fristen aus dem Schreiben

CREATE TABLE IF NOT EXISTS fines (
  id TEXT PRIMARY KEY,
  fine_no TEXT NOT NULL UNIQUE,                 -- z. B. B-2026-0001 (Betrieb) / TB-2026-0001 (Test)
  environment TEXT NOT NULL CHECK (environment IN ('test','production')),
  kind TEXT NOT NULL CHECK (kind IN ('anhoerung','zeugenfragebogen','bussgeldbescheid','verwarnung','maut','sonstiges')),
  authority TEXT NOT NULL,                      -- Behörde / Absender
  reference TEXT NULL,                          -- Aktenzeichen
  offense_type TEXT NOT NULL CHECK (offense_type IN ('geschwindigkeit','abstand','parken','rotlicht','lenk_ruhezeit','ladung','maut','handy','sonstiges')),
  offense_at TEXT NOT NULL,                     -- Tatzeit (ISO, laut Schreiben)
  location TEXT NULL,
  plate_in_letter TEXT NOT NULL,                -- Kennzeichen wie im Schreiben
  vehicle_id TEXT NULL REFERENCES vehicles(id),
  amount_eur REAL NULL,
  response_due TEXT NULL,                       -- Antwortfrist laut Schreiben (YYYY-MM-DD), nie geschätzt
  status TEXT NOT NULL CHECK (status IN ('eingegangen','fahrer_ermittelt','fahrer_informiert','beantwortet','bezahlt','eingestellt','erledigt')),
  driver_id TEXT NULL REFERENCES users(id),
  driver_name_note TEXT NULL,                   -- Fahrer ohne App-Konto (Name laut Nachweis)
  driver_basis TEXT NULL CHECK (driver_basis IS NULL OR driver_basis IN ('zuordnung','tourenplan','telematik','fahrerangabe','manuell')),
  driver_evidence TEXT NULL,
  driver_confirmed_by TEXT NULL REFERENCES users(id),
  driver_confirmed_at TEXT NULL,
  driver_informed_at TEXT NULL,
  driver_ack_at TEXT NULL,
  note TEXT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_fines_env_status ON fines(environment, status);

CREATE TABLE IF NOT EXISTS fine_events (
  id TEXT PRIMARY KEY,
  fine_id TEXT NOT NULL REFERENCES fines(id) ON DELETE CASCADE,
  actor_id TEXT NULL,
  action TEXT NOT NULL,
  note TEXT NULL,
  payload TEXT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fine_counters (
  environment TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_no INTEGER NOT NULL,
  PRIMARY KEY (environment, year)
);

ALTER TABLE files ADD COLUMN fine_id TEXT NULL;
