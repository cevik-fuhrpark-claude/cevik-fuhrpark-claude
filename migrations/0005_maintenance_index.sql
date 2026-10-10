-- [CLAUDE] Prüftermin-Übersicht und -Import: schneller Zugriff je Fahrzeug und Prüfart
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_kind ON maintenance_rules(vehicle_id, kind);
CREATE INDEX IF NOT EXISTS idx_maintenance_due ON maintenance_rules(next_due_date);
