-- [CLAUDE] Fahrernachweise stornierbar (19.10.2026): Tippfehler im „gültig bis“ (z. B. 2036 statt 2026) blieb sonst der gültige Nachweis –
-- der richtige landete als „älter“ nur im Verlauf, eine abgelaufene Fahrerkarte galt als gültig. Storno statt Löschen: Eintrag bleibt mit
-- Zeitpunkt, Person und Begründung sichtbar (superseded=2), zählt nicht mehr; der neueste verbliebene Nachweis gleicher Art gilt wieder.
ALTER TABLE driver_documents ADD COLUMN cancelled_at TEXT NULL;
ALTER TABLE driver_documents ADD COLUMN cancelled_by TEXT NULL;
ALTER TABLE driver_documents ADD COLUMN cancel_reason TEXT NULL;
