-- [CLAUDE] Eigener Standard-Standort je Benutzer (Mein Konto): voreingestellter Filter „Fahrzeug-Standort“ in Listen und Berichten.
-- Reine Anzeige-Einstellung, keine Berechtigung; leer = alle Standorte.
ALTER TABLE users ADD COLUMN home_site TEXT NULL;
