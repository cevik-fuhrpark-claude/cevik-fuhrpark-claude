-- [CLAUDE] Versicherungsfälle zu Vorgängen (Unfall/Schaden): Meldung an den Versicherer, Schadennummer, Status, Selbstbeteiligung und Erstattung
-- nur laut Schreiben/Abrechnung des Versicherers (Pflicht-Nachweis). Je Vorgang höchstens ein Versicherungsfall; Umgebung wie der Vorgang.
CREATE TABLE IF NOT EXISTS insurance_claims (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL UNIQUE REFERENCES cases(id),
  environment TEXT NOT NULL,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  contract_id TEXT NULL REFERENCES vehicle_contracts(id),
  insurer TEXT NOT NULL,
  claim_no TEXT NULL,
  reported_on TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('gemeldet','in_pruefung','reguliert','abgelehnt','zurueckgezogen')),
  deductible_net REAL NULL,
  reimbursed_net REAL NULL,
  reimbursed_on TEXT NULL,
  evidence TEXT NOT NULL,
  note TEXT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_env ON insurance_claims(environment, status);
