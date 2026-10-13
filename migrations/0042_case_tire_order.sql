-- [CLAUDE] Werkstattauftrag „Umrüstung Winterreifen“ aus der Reifen-Winterlage (Inhaber/Fuhrparkleitung):
-- Kennzeichnung des Auftrags (tire_order = 'winter'); je Fahrzeug und Umgebung höchstens ein offener Auftrag.
ALTER TABLE cases ADD COLUMN tire_order TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_tire_order ON cases(vehicle_id, tire_order, environment);
