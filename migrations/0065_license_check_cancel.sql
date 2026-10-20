-- [CLAUDE] Führerscheinkontrollen stornierbar (20.10.2026, Backlog 99): ein Tippfehler im Kontrolldatum (z. B. heute statt 2025) verschob
-- „Kontrolle fällig“ dauerhaft – eine neue Kontrolle mit dem richtigen, älteren Datum half nicht, weil das späteste Datum zählt.
-- Storno statt Löschen (wie Nachweise/Auslesungen): Eintrag bleibt mit Zeitpunkt, Person und Begründung im Verlauf, zählt nicht mehr.
ALTER TABLE driver_license_checks ADD COLUMN cancelled_at TEXT NULL;
ALTER TABLE driver_license_checks ADD COLUMN cancelled_by TEXT NULL;
ALTER TABLE driver_license_checks ADD COLUMN cancel_reason TEXT NULL;
