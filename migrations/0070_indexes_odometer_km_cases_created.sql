-- [CLAUDE] Leistung bei wachsendem Datenbestand (Lastmessung 21.10.2026, 150 Lkw, 220 000 km-Stände, 15 000 Vorgänge):
-- Datenqualität „km der Kontrolle nicht übernommen“ suchte je Kontrolle alle km-Stände des Fahrzeugs (264 → 7 ms),
-- Kostenbericht/Kennzahlen lasen Vorgänge des Zeitraums über den Index auf updated_at (17 → 7 ms).
CREATE INDEX IF NOT EXISTS idx_odometer_vehicle_km ON odometer_readings(vehicle_id, km);
CREATE INDEX IF NOT EXISTS idx_cases_env_created ON cases(environment, created_at);
