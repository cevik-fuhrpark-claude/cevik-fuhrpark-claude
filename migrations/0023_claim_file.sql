-- [CLAUDE] Versicherungsfälle: optional verknüpftes Schreiben/Abrechnung des Versicherers aus den Dateien desselben Vorgangs (files.id).
ALTER TABLE insurance_claims ADD COLUMN file_id TEXT NULL;
