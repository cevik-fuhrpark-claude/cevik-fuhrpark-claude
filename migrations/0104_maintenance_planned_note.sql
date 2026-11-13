-- [CLAUDE] 13.11.2026 Backlog 1442, Blickwinkel „Prüfstelle/Fremdwerkstatt vereinbart den Prüftermin telefonisch – Uhrzeit, Ort und
-- Absprachen gehen verloren“: Der geplante Prüf-/Wartungstermin war nur ein Tag. „7:00 Uhr“, „TÜV-Station …“, „Schlüssel beim Pförtner“
-- standen nirgends – Werkstattplan, Fahrzeugakte und Disposition kannten nur das Datum (Vorgänge haben seit Migration 0093 einen Hinweis).
-- Optionaler Hinweis zum Termin (Freitext laut Leitung/Werkstatt, nichts vorgegeben); wird mit dem Termin bzw. bei jeder anderen
-- Terminänderung (Sammeltermin, Auftrag verschoben, Durchführung erfasst) entfernt.
ALTER TABLE maintenance_rules ADD COLUMN planned_note TEXT NULL;
