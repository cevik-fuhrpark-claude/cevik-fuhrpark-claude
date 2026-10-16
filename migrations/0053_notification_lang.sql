-- [CLAUDE] Sprache des gespeicherten Hinweistextes (de/uk/en). Wird dem Push mitgegeben, damit das Gerät die Mitteilung
-- in der richtigen Sprache vorliest. Leer = unbekannt (ältere Hinweise, nicht übersetzte Freitexte) → Push ohne Sprachangabe.
ALTER TABLE notifications ADD COLUMN lang TEXT NULL;
