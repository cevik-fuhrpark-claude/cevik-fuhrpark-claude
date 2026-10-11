-- [CLAUDE] Fahrzeugverträge (Leasing, Miete, Finanzierung, Versicherung, Wartungsvertrag): alle Angaben nur laut Vertrag (nichts berechnet oder erfunden).
-- Gemeinsame Stammdaten wie Fahrzeuge (keine Trennung Test/Betrieb). Sichtbar nur Inhaber/Fuhrparkleitung.
CREATE TABLE IF NOT EXISTS vehicle_contracts (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  kind TEXT NOT NULL CHECK (kind IN ('leasing','miete','finanzierung','versicherung','wartung','sonstiges')),
  partner TEXT NOT NULL,
  contract_no TEXT NULL,
  start_date TEXT NULL,
  end_date TEXT NULL,
  notice_months INTEGER NULL,
  km_allowance INTEGER NULL,
  start_km INTEGER NULL,
  monthly_rate_net REAL NULL,
  evidence TEXT NOT NULL,
  note TEXT NULL,
  ended_on TEXT NULL,
  end_note TEXT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_vehicle_contracts_vehicle ON vehicle_contracts(vehicle_id, ended_on);
