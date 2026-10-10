-- [CLAUDE] Persönliche Push-Einstellungen: JSON-Liste nicht dringender Ereignisarten, für die kein Push gesendet wird.
-- Dringende Hinweise (kritisch, nicht fahrbereit, Sperre) werden immer gesendet; In-App-Hinweise bleiben immer erhalten.
ALTER TABLE users ADD COLUMN push_muted TEXT NULL;
