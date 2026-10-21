-- [CLAUDE] 21.10.2026: Zeitpunkt des zuletzt gemeldeten km-Werts je Gerät. Eine spätere Meldung ohne km behält den km-Wert,
-- verschob aber dessen Vergleichszeitpunkt (gps_time) → falscher Hinweis „km nicht übernommen“ gegen später erfasste Stände.
ALTER TABLE telematics_latest ADD COLUMN km_at TEXT;
UPDATE telematics_latest SET km_at = gps_time WHERE km IS NOT NULL AND km_at IS NULL;
