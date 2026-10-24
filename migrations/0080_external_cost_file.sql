-- [CLAUDE] 24.10.2026 Teilagent „Leitung gibt Kostenvoranschlag als PDF frei“: Eine Fremdleistung (z. B. Kostenvoranschlag oder Rechnung
-- einer Fremdwerkstatt) hatte keinen Bezug zu ihrem Beleg. Der PDF lag zwar unter „Fotos & Dokumente“ im Vorgang, bei mehreren Dateien war
-- aber nicht erkennbar, welcher Beleg zu welchem Betrag gehört – auch nicht bei der Kostenfreigabe. Optional, nur Dateien desselben Vorgangs.
ALTER TABLE external_costs ADD COLUMN file_id TEXT NULL;
