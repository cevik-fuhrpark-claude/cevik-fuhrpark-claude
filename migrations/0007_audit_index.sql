-- [CLAUDE] Protokollansicht für den Inhaber: chronologischer Zugriff
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
