-- [CLAUDE] Wartungs-/Prüfhistorie: jede Durchführung bleibt erhalten (bisher überschrieb „erledigt“ die letzte Durchführung der Regel)
CREATE TABLE IF NOT EXISTS maintenance_events (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES maintenance_rules(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  kind TEXT NOT NULL,
  done_date TEXT NOT NULL,               -- JJJJ-MM-TT laut Nachweis
  done_km INTEGER NULL,
  evidence TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('bestand','erfasst','erledigt','import')),
  recorded_by TEXT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  UNIQUE (rule_id, done_date)
);
CREATE INDEX IF NOT EXISTS idx_maint_events_vehicle ON maintenance_events(vehicle_id, done_date);
-- Übernahme der bisher gespeicherten letzten Durchführungen (nur vorhandene Daten)
INSERT OR IGNORE INTO maintenance_events(id, rule_id, vehicle_id, kind, done_date, done_km, evidence, source, recorded_by, created_at)
  SELECT lower(hex(randomblob(16))), id, vehicle_id, kind, last_done_date, last_done_km, evidence, 'bestand', NULL, updated_at
  FROM maintenance_rules WHERE last_done_date IS NOT NULL;
