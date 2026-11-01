-- [CLAUDE] Backlog 805e (01.11.2026, Blickwinkel „Funkloch“): Fahrerakte anlegen wiederholsicher. Gleiche Namen sind erlaubt
-- (nur Hinweis) – nach verlorener Antwort legte erneutes Speichern eine zweite Akte an. Die App sendet je Formularinhalt einen
-- request_key; dieselbe Person mit demselben Schlüssel bekommt die vorhandene Akte zurück.
ALTER TABLE drivers ADD COLUMN request_key TEXT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_request_key ON drivers(created_by, request_key) WHERE request_key IS NOT NULL;
