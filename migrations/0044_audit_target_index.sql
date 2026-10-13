-- [CLAUDE] Index für Protokoll-Abfragen je Objekt (z. B. Zeitpunkt „außer Betrieb genommen“ für die Datenqualität
-- „Telematik sendet für außer Betrieb genommenes Fahrzeug“). Nur Index, keine Datenänderung.
CREATE INDEX IF NOT EXISTS idx_audit_target_action ON audit_log(target, action, created_at);
