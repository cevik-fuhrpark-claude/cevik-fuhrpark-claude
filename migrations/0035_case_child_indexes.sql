-- [CLAUDE] Indizes für Positionen je Vorgang: Vorgangsdetail, Kosten, Gewährleistung und Fahrzeugakte lesen Arbeitszeiten, Teile,
-- Fremdleistungen, Restarbeiten und Dateien je case_id. Ohne Index liest D1 dafür jeweils die ganze Tabelle (zählt gegen das
-- Tageskontingent „gelesene Zeilen“ im Gratis-Tarif). Nur Indizes, keine Datenänderung.
CREATE INDEX IF NOT EXISTS idx_work_entries_case ON work_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_parts_case ON parts(case_id);
CREATE INDEX IF NOT EXISTS idx_external_costs_case ON external_costs(case_id);
CREATE INDEX IF NOT EXISTS idx_open_items_case ON open_items(case_id, status);
CREATE INDEX IF NOT EXISTS idx_files_case ON files(case_id);
