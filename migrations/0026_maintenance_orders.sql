-- [CLAUDE] Werkstattauftrag aus Prüftermin/Wartungsregel: Verknüpfung Vorgang → Regel (doppelte offene Aufträge je Regel werden abgewiesen)
ALTER TABLE cases ADD COLUMN maintenance_rule_id TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_mrule ON cases(maintenance_rule_id, environment);
