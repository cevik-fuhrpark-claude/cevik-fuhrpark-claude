-- [CLAUDE] Backlog 804 (31.10.2026, Blickwinkel „Funkloch“): Hinweis zum Fahrzeug wiederholsicher anlegen.
-- Ohne Antwort (Funkloch) sendet die App denselben request_key erneut → der vorhandene Hinweis wird zurückgegeben, kein zweiter.
ALTER TABLE vehicle_notes ADD COLUMN request_key TEXT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_notes_request_key ON vehicle_notes(environment, created_by, request_key) WHERE request_key IS NOT NULL;
