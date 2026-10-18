-- [CLAUDE] Bußgeld-Erfassung idempotent: die App sendet je Formular einen Schlüssel der Anfrage (`request_key`).
-- Doppelklick oder Netzwiederholung legten bei Schreiben ohne Aktenzeichen sonst zwei Bußgeldvorgänge an (18.10.2026).
-- Leer = alte Vorgänge ohne Schlüssel.
ALTER TABLE fines ADD COLUMN request_key TEXT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_fines_request_key ON fines(request_key) WHERE request_key IS NOT NULL;
