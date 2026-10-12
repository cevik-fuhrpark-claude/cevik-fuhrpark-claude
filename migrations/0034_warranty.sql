-- [CLAUDE] Gewährleistung an Teilen und Fremdleistungen eines Vorgangs: optionales „Gewährleistung bis“ (Berliner Datum),
-- nur wenn laut Rechnung/Lieferant angegeben – die App gibt keine Frist vor. Neue Meldungen am selben Fahrzeug zeigen
-- laufende Gewährleistungen als Hinweis (Rückgriff beim Lieferanten prüfen).
ALTER TABLE parts ADD COLUMN warranty_until TEXT NULL;
ALTER TABLE external_costs ADD COLUMN warranty_until TEXT NULL;
