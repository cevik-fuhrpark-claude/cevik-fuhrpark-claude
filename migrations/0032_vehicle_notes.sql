-- [CLAUDE] Hinweise zum Fahrzeug (z. B. „Ladeetage hakt – bekannt, Termin geplant“, „Ersatzschlüssel im Büro“): kurze, angeheftete Notizen
-- je Fahrzeug und Umgebung. Sichtbar für Inhaber, Fuhrparkleitung, Werkstatt, Disposition, Lesezugriff; mit Häkchen auch für zugeordnete Fahrer.
-- Erledigte Hinweise werden archiviert (nicht gelöscht), mit Zeitpunkt und Person.
CREATE TABLE IF NOT EXISTS vehicle_notes (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment IN ('test','production')),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  text TEXT NOT NULL,
  for_driver INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  archived_at TEXT NULL,
  archived_by TEXT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_vehicle_notes_vehicle ON vehicle_notes(vehicle_id, environment, archived_at);
