-- [CLAUDE] Auslesungen stornierbar (Tippfehler im Datum hielt die Frist sonst dauerhaft „in Ordnung“, 18.10.2026).
-- Storno statt Löschen: Eintrag bleibt mit Zeitpunkt, Person und Begründung sichtbar, zählt aber nicht mehr für Fristen.
ALTER TABLE tacho_downloads ADD COLUMN cancelled_at TEXT NULL;
ALTER TABLE tacho_downloads ADD COLUMN cancelled_by TEXT NULL;
ALTER TABLE tacho_downloads ADD COLUMN cancel_reason TEXT NULL;
-- je Tag eine gültige Auslesung: stornierte zählen nicht (derselbe Tag darf nach Storno neu erfasst werden)
DROP INDEX IF EXISTS idx_tacho_driver_day;
DROP INDEX IF EXISTS idx_tacho_vehicle_day;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tacho_driver_day_valid ON tacho_downloads(driver_id, downloaded_on) WHERE driver_id IS NOT NULL AND cancelled_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tacho_vehicle_day_valid ON tacho_downloads(environment, vehicle_id, downloaded_on) WHERE vehicle_id IS NOT NULL AND cancelled_at IS NULL;
