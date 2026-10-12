-- [CLAUDE] Integrations-API /v1/cases blättert nach (updated_at, id) je Umgebung (n8n/Unternehmensbetriebssystem fragt regelmäßig ab).
-- Ohne Index sortiert D1 alle Vorgänge der Umgebung bei jedem Abruf. Nur Index, keine Datenänderung.
CREATE INDEX IF NOT EXISTS idx_cases_env_updated ON cases(environment, updated_at, id);
