-- [CLAUDE] 25.10.2026 Backlog 285 (Blickwinkel „Schaden wird erst Tage später gemeldet“):
-- Schadenzeitpunkt laut Meldung, getrennt von der Meldezeit (created_at). Optional: Kalendertag „JJJJ-MM-TT“ (Uhrzeit unbekannt)
-- oder Zeitpunkt als UTC-ISO. Leer = nicht angegeben (nie aus der Meldezeit abgeleitet).
ALTER TABLE cases ADD COLUMN occurred_at TEXT NULL;
