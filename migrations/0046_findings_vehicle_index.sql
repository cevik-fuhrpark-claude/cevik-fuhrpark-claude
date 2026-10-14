-- [CLAUDE] Fahrzeugakte zeigt offene Agentenbefunde des Fahrzeugs (Inhaber/Fuhrparkleitung): Zugriff über vehicle_id ohne Volltabellen-Suche
CREATE INDEX IF NOT EXISTS idx_findings_vehicle ON agent_findings(vehicle_id, environment, status);
