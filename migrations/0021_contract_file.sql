-- [CLAUDE] Fahrzeugverträge: optional verknüpftes Vertragsdokument aus der Dokumentablage des Fahrzeugs (files.id, ohne Vorgang).
-- Dokumente gehören zu einer Umgebung (Test/Betrieb); angezeigt wird die Verknüpfung nur in der Umgebung des Dokuments.
ALTER TABLE vehicle_contracts ADD COLUMN file_id TEXT NULL;
