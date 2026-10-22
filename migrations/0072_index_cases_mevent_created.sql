-- [CLAUDE] Leistung (Lasttest 22.10.2026): Seit Index idx_cases_env_created (0070) wählte SQLite für die Unterabfrage
-- „Mängelauftrag zur Prüfung“ (maintenance_event_id + environment, ORDER BY created_at DESC) den Index auf
-- environment/created_at und las je Prüfung alle Vorgänge der Umgebung: Nachweisliste, Kennzahlen „Mängelbeseitigung“
-- und /v1/kpi, /v1/maintenance/history 19–100 ms → 600–700 ms (150 Lkw, 3000 Vorgänge, 1200 Prüfungen).
-- Der zusammengesetzte Index deckt Suche und Sortierung ab und ersetzt idx_cases_mevent.
CREATE INDEX IF NOT EXISTS idx_cases_mevent_created ON cases(maintenance_event_id, environment, created_at);
DROP INDEX IF EXISTS idx_cases_mevent;
-- Gleicher Wächter fand zwei weitere korrelierte Unterabfragen, die nur über environment suchten:
-- Master-Eingang „neuere Übergabe desselben Befunds“ (has_newer; 20 000 Einträge: 860 ms) und
-- Vorgangsfilter „Gewährleistung prüfen“ (frühere Vorgänge desselben Fahrzeugs).
CREATE INDEX IF NOT EXISTS idx_master_inbox_finding ON master_inbox(finding_id, environment, received_at);
CREATE INDEX IF NOT EXISTS idx_cases_vehicle_env_created ON cases(vehicle_id, environment, created_at);
