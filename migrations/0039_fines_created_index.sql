-- [CLAUDE] Bußgeldliste: die 500 jüngsten Schreiben je Umgebung (ORDER BY created_at DESC, rowid DESC LIMIT 501).
-- Ohne Index liest D1 alle Schreiben der Umgebung und sortiert sie bei jedem Aufruf. Nur Index, keine Datenänderung (Backlog 77).
CREATE INDEX IF NOT EXISTS idx_fines_env_created ON fines(environment, created_at);
