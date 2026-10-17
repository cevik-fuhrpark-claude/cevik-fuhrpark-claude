-- [CLAUDE] Lagerbuchungen idempotent: Zugang/Entnahme/Korrektur und Umlagerung tragen optional den Schlüssel der Anfrage (`request_key`).
-- Doppelklick oder Netzwiederholung legten sonst zwei Buchungen an (17.10.2026: Bestand 10 → 2 statt 6). Leer = alte Buchungen ohne Schlüssel.
ALTER TABLE stock_movements ADD COLUMN request_key TEXT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_movements_request_key ON stock_movements(request_key) WHERE request_key IS NOT NULL;
