-- [CLAUDE] Werkstatt-Auslastung je Standort der buchenden Werkstatt (Backlog 90, 18.10.2026)
-- Fehler: Nach einem Werkstattwechsel wurden bereits gebuchte Stunden der bisherigen Werkstatt der neuen zugerechnet
-- (Auswertung nach dem aktuellen Auftragsstandort). Neue Buchungen speichern den Auftragsstandort zum Buchungszeitpunkt.
-- Bestand: NULL – zählt wie bisher beim aktuellen Auftragsstandort (nichts wird nachträglich geschätzt).
ALTER TABLE work_entries ADD COLUMN site TEXT NULL;
