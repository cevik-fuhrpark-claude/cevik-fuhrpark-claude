-- [CLAUDE] 21.10.2026: Idempotenz der Vorgangsbefehle – Prüfsumme über Inhalt (payload + Vermerk) je command_id.
-- Gleiche Kennung mit anderem Inhalt → 409 statt still „duplicate“ (Schnittstellen-Client hielt die Änderung sonst für ausgeführt).
-- Bestand bleibt NULL (Wiederholung wie bisher als „duplicate“).
ALTER TABLE case_events ADD COLUMN command_hash TEXT;
