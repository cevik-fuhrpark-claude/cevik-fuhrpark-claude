-- [CLAUDE] Umlagerung zwischen Werkstattlagern: Entnahme im Quell- und Zugang im Ziellager tragen dieselbe transfer_id.
-- Umlagerungen zählen nicht als Verbrauch (Bestellvorschlag „Verbrauch 90 Tage“, „letzte Entnahme“) und sind im Lagerjournal getrennt ausgewiesen.
ALTER TABLE stock_movements ADD COLUMN transfer_id TEXT NULL;
ALTER TABLE stock_movements ADD COLUMN transfer_site TEXT NULL; -- Gegenlager (bei Entnahme: Ziel, bei Zugang: Quelle)
CREATE INDEX IF NOT EXISTS idx_stock_mov_transfer ON stock_movements(transfer_id);
