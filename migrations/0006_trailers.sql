-- [CLAUDE] Anhänger als eigene Prüfobjekte (eigene HU/SP), Fahrzeugart je Stammsatz
ALTER TABLE vehicles ADD COLUMN kind TEXT NOT NULL DEFAULT 'lkw' CHECK (kind IN ('lkw','anhaenger'));
CREATE INDEX IF NOT EXISTS idx_vehicles_kind ON vehicles(kind);
