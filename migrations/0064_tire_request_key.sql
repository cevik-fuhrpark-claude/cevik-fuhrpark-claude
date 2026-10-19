-- [CLAUDE] Reifen erfassen idempotent (19.10.2026): Wiederholung derselben Erfassung (Netzabbruch nach dem Speichern, erneutes Absenden)
-- legte doppelte Messungen/Wechsel an. Die App sendet je Formular einen Schlüssel; je Fahrzeug, Schlüssel und Position höchstens ein Ereignis.
ALTER TABLE tire_events ADD COLUMN request_key TEXT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tire_events_request_key ON tire_events(vehicle_id, request_key, position) WHERE request_key IS NOT NULL;
