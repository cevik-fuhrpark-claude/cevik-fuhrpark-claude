-- [CLAUDE] Doppelte Meldung: Fuhrparkleitung schließt eine Meldung als Dublette eines anderen Vorgangs desselben Fahrzeugs (Ablehnung mit Verweis).
-- Der ursprüngliche Vorgang zeigt seine Dubletten; die meldende Person erfährt die Nummer des bestehenden Vorgangs.
ALTER TABLE cases ADD COLUMN duplicate_of TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_duplicate_of ON cases(duplicate_of);
