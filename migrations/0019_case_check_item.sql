-- [CLAUDE] Folgeaufträge aus Abfahrtskontrollen: Prüfpunkt merken, damit derselbe offene Mangel nicht täglich einen neuen Vorgang erzeugt
ALTER TABLE cases ADD COLUMN check_item TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_check_item ON cases(vehicle_id, environment, check_item);
