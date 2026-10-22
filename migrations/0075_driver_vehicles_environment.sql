-- [CLAUDE] 22.10.2026 Test/Betrieb getrennt (Teilagent „Rollen-/Umgebungswechsel“): Fahrzeugzuordnungen hatten keine eigene Umgebung –
-- Abfragen nahmen die HEUTIGE Umgebung des Kontos. Wurde ein Testfahrer in den Betrieb übernommen, galten seine (beendeten)
-- Test-Zuordnungen als Betriebsdaten (Bußgeld-Fahrerermittlung, Fahrzeugakte/Zeitleiste) und fehlten in der Testumgebung.
-- Rückfüllung: Umgebung des Kontos zum Beginn der Zuordnung laut Protokoll (letzter user.create/user.update bis valid_from,
-- `$.environment` = Umgebung nach dieser Änderung), sonst die heutige Umgebung des Kontos.
ALTER TABLE driver_vehicles ADD COLUMN environment TEXT NULL;
UPDATE driver_vehicles SET environment = COALESCE(
  (SELECT json_extract(a.detail, '$.environment') FROM audit_log a
    WHERE a.target = driver_vehicles.user_id AND a.action IN ('user.create', 'user.update') AND a.created_at <= driver_vehicles.valid_from
      AND json_valid(a.detail) AND json_extract(a.detail, '$.environment') IN ('test', 'production')
    ORDER BY a.created_at DESC LIMIT 1),
  (SELECT u.environment FROM users u WHERE u.id = driver_vehicles.user_id))
WHERE environment IS NULL;
CREATE INDEX IF NOT EXISTS idx_dv_vehicle_env ON driver_vehicles(vehicle_id, environment);
