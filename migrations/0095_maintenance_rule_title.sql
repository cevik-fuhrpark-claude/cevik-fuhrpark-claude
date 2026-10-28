-- [CLAUDE] Backlog 577 (28.10.2026, Blickwinkel „Ladebordwand/Ladekran prüfen“): Titel je Prüftermin der Art „Sonstiges“.
-- Bisher war der Nachweis-Text zugleich die Bezeichnung und wurde beim „erledigt“ überschrieben. Bestehende Einträge bleiben ohne Titel
-- (keine Rückrechnung aus dem Nachweis – der kann schon überschrieben sein); die Leitung kann ihn nachtragen.
ALTER TABLE maintenance_rules ADD COLUMN title TEXT NULL;
