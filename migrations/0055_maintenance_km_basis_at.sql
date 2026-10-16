-- [CLAUDE] Zeitpunkt der letzten Änderung der km-Grundlage einer Prüfregel (Intervall km, km bei letzter Durchführung, belegte km-Fälligkeit).
-- Ein km-Zähler-Rücksprung (Tachotausch) gilt nur dann als geklärt, wenn die km-Grundlage DANACH neu eingetragen wurde – ein geplanter
-- Werkstatttermin (planned_date) oder eine reine Datumsänderung ändert updated_at, klärt aber nichts (Fehler 16.10.2026).
-- Bestand: bisheriger Stand (updated_at), damit sich heute nichts ändert.
ALTER TABLE maintenance_rules ADD COLUMN km_basis_at TEXT NULL;
UPDATE maintenance_rules SET km_basis_at = updated_at WHERE km_basis_at IS NULL;
