-- [CLAUDE] Panne & Notfall: Rufnummern für unterwegs (Disposition, Pannendienst/Schutzbrief, Werkstatt-Bereitschaft, Versicherung …).
-- Nur vom Betrieb eingetragene Nummern (die App gibt keine Nummern vor; einzige feste Nummer in der Oberfläche ist der Notruf 112).
-- Geltung: alle Fahrzeuge, ein Standort (laut Fahrzeugstamm) oder ein einzelnes Fahrzeug. Je Umgebung getrennt (Test/Betrieb).
-- Nicht mehr gültige Nummern werden archiviert (nicht gelöscht), mit Zeitpunkt und Person.
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment IN ('test','production')),
  kind TEXT NOT NULL CHECK (kind IN ('dispo','panne','werkstatt','versicherung','sonstiges')),
  label TEXT NOT NULL,
  phone TEXT NOT NULL,
  note TEXT NULL,
  site TEXT NULL,
  vehicle_id TEXT NULL REFERENCES vehicles(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_by TEXT NULL REFERENCES users(id),
  updated_at TEXT NOT NULL,
  archived_at TEXT NULL,
  archived_by TEXT NULL REFERENCES users(id),
  CHECK (site IS NULL OR vehicle_id IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_env ON emergency_contacts(environment, archived_at);
