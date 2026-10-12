-- [CLAUDE] Wiedervorlage je Vorgang (Inhaber/Fuhrparkleitung): selbst gewähltes Datum + optionaler Vermerk. Der Fuhrparkagent erinnert ab dem
-- Datum (CASE_FOLLOWUP_DUE). Die App setzt kein Datum von sich aus. Nur neue Spalten, keine Datenänderung.
ALTER TABLE cases ADD COLUMN followup_on TEXT NULL;
ALTER TABLE cases ADD COLUMN followup_note TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_followup ON cases(environment, followup_on) WHERE followup_on IS NOT NULL;
