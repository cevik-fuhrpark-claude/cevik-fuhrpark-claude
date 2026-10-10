-- [CLAUDE] Gültig-bis-Datum an Fahrzeugdokumenten (nur wenn im Dokument angegeben) für Erinnerungen
ALTER TABLE files ADD COLUMN doc_valid_until TEXT NULL;
