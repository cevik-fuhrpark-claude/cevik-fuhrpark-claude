-- [CLAUDE] Protokoll je Person (Benutzer → „Protokoll“): Einträge, die eine Person ausgelöst hat (actor_id).
-- Zusammen mit idx_audit_target_action (Einträge, die das Konto betreffen) ohne Volltabellen-Suche.
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id, created_at);
