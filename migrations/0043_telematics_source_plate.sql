-- [CLAUDE] Telematik: Kennzeichen, das das Gerät beim letzten Stand gemeldet hat (nur Information).
-- Weicht es vom Kennzeichen des zugeordneten Fahrzeugs ab (falsch gemapptes Gerät, veraltete Gerätekonfiguration
-- oder veraltetes Kennzeichen im Fahrzeugstamm), meldet die Datenqualität „telematics_plate_mismatch“. Keine automatische Korrektur.
ALTER TABLE telematics_latest ADD COLUMN source_plate TEXT NULL;
