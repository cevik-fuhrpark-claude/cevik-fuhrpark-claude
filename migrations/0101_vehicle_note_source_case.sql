-- [CLAUDE] 02.11.2026 Backlog 879 (Blickwinkel „Fahrer holt den Lkw nach Feierabend in der Werkstatt ab“):
-- Abholhinweise für Fahrer (Backlog 425) kennen ihren Vorgang. Bei der nächsten technischen Freigabe desselben Fahrzeugs werden ältere,
-- noch aktive Abholhinweise archiviert – sonst sah der Fahrer zwei verschiedene Ablageorte für Schlüssel/Fahrzeugschein (oder den alten).
ALTER TABLE vehicle_notes ADD COLUMN source_case_id TEXT NULL;
-- Bestand: Abholhinweise wurden im selben Stapel wie die Freigabe angelegt (gleicher Zeitstempel, Text „<Vorgangsnummer>: …“)
UPDATE vehicle_notes SET source_case_id = (SELECT c.id FROM cases c WHERE c.vehicle_id = vehicle_notes.vehicle_id AND c.environment = vehicle_notes.environment
    AND c.closed_at = vehicle_notes.created_at AND c.status = 'fahrzeug_freigegeben' AND substr(vehicle_notes.text, 1, length(c.case_no) + 2) = c.case_no || ': ')
  WHERE for_driver = 1 AND source_case_id IS NULL;
