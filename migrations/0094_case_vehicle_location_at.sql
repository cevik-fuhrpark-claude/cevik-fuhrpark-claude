-- [CLAUDE] 27.10.2026 Blickwinkel „Lkw kommt von der Fremdfirma zurück – Standortangabe veraltet?“ (Folge aus Backlog 438):
-- „Standort des Fahrzeugs“ (Migration 0079) zeigte nicht, wann er eingetragen wurde. Disposition/Werkstatt sahen „bei Fa. …“, ohne zu
-- wissen, ob das von heute früh oder von letzter Woche stammt. Neu: Zeitpunkt der letzten Änderung; vorhandene Angaben erhalten den
-- Zeitpunkt aus dem Verlauf (letzter Befehl set_vehicle_location des Vorgangs) – nichts geschätzt, ohne Verlaufseintrag bleibt er leer.
ALTER TABLE cases ADD COLUMN vehicle_location_at TEXT NULL;
UPDATE cases SET vehicle_location_at = (SELECT MAX(e.created_at) FROM case_events e WHERE e.case_id = cases.id AND e.action = 'set_vehicle_location')
  WHERE vehicle_location IS NOT NULL OR tow_service IS NOT NULL;
