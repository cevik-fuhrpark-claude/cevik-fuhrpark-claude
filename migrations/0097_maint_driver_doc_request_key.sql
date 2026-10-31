-- [CLAUDE] Backlog 804 (01.11.2026, Blickwinkel „Funkloch“): Prüftermin anlegen und Nachweis in der Fahrerakte wiederholsicher.
-- Ohne Antwort sendet die App denselben request_key erneut → der vorhandene Eintrag wird zurückgegeben, kein zweiter
-- (Rückruf/Sonstiges bzw. Unterweisung/Sonstiges dürfen mehrfach vorkommen und wurden bisher doppelt angelegt).
ALTER TABLE maintenance_rules ADD COLUMN request_key TEXT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_maintenance_rules_request_key ON maintenance_rules(created_by, request_key) WHERE request_key IS NOT NULL;
ALTER TABLE driver_documents ADD COLUMN request_key TEXT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_documents_request_key ON driver_documents(created_by, request_key) WHERE request_key IS NOT NULL;
