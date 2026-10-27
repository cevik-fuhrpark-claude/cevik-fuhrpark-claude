-- [CLAUDE] 27.10.2026 Backlog 427 (Blickwinkel „Fahrer ruft nachts an: Lkw springt nicht an – wer hat Bereitschaft?“):
-- Erreichbarkeit je Rufnummer unter „Panne & Notfall“, vom Betrieb eingetragen (die App gibt keine Zeiten vor):
-- hours_days = Wochentage ISO als Ziffernfolge („12345“ = Mo–Fr), hours_from/hours_to = Uhrzeit HH:MM deutscher Zeit (beide oder keine;
-- Ende vor Beginn = über Mitternacht), hours_no_holidays = 1: nicht an bundesweiten Feiertagen. Alles leer = keine Zeiten eingetragen.
ALTER TABLE emergency_contacts ADD COLUMN hours_days TEXT NULL;
ALTER TABLE emergency_contacts ADD COLUMN hours_from TEXT NULL;
ALTER TABLE emergency_contacts ADD COLUMN hours_to TEXT NULL;
ALTER TABLE emergency_contacts ADD COLUMN hours_no_holidays INTEGER NULL;
