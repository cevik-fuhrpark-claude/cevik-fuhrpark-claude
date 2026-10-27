-- [CLAUDE] 27.10.2026 Backlog 426 (Blickwinkel „Werkstatt-Tablet auf Ukrainisch, Mechaniker fotografiert die Teilenummer“):
-- Foto/PDF zum Ersatzteil (Typenschild, Teilenummer, Lieferschein) – optional eine Datei desselben Vorgangs, wie bei Restarbeiten (Backlog 261)
-- und Fremdleistungen. Hilft bei Gewährleistung und Nachbestellung; die Teilenummer muss nicht abgetippt werden.
ALTER TABLE parts ADD COLUMN file_id TEXT NULL;
