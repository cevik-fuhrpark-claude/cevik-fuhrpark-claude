-- [CLAUDE] Hinweise zum Fahrzeug: optionales „gültig bis“ (Berliner Datum, vom Verfasser eingetragen). Danach gilt der Hinweis als abgelaufen:
-- nicht mehr aktiv (Akte, Fahrzeugliste, Mein Fahrzeug, Integrations-API), sichtbar im Archiv. Nichts wird gelöscht.
ALTER TABLE vehicle_notes ADD COLUMN valid_until TEXT NULL;
