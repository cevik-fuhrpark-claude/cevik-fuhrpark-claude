-- [CLAUDE] Werkstattauftrag zur Mängelbeseitigung aus einer Prüfung (HU/SP/… mit erheblichen/gefährlichen Mängeln bzw. verkehrsunsicher):
-- Verknüpfung Vorgang → Durchführung (maintenance_events.id); je Durchführung und Umgebung höchstens ein offener Auftrag.
ALTER TABLE cases ADD COLUMN maintenance_event_id TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_mevent ON cases(maintenance_event_id, environment);
