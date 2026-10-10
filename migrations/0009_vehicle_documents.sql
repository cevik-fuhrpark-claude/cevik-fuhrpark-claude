-- [CLAUDE] Dokumentablage je Fahrzeug (Zulassungsbescheinigung, Prüfberichte, Rechnungen …) – unabhängig von Vorgängen
ALTER TABLE files ADD COLUMN vehicle_id TEXT NULL;
ALTER TABLE files ADD COLUMN doc_kind TEXT NULL;
ALTER TABLE files ADD COLUMN doc_note TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_files_vehicle ON files(vehicle_id);
