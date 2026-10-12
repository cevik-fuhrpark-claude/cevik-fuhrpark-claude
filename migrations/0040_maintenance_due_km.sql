-- [CLAUDE] Belegte km-Fälligkeit je Prüfung/Wartung (z. B. laut Serviceanzeige, Wartungsheft, Werkstattbeleg).
-- NULL = keine eigene Angabe; dann gilt wie bisher „km bei letzter Durchführung + Intervall km“.
-- Wird beim Erledigen der Regel zurückgesetzt (der Beleg gilt nur bis zur nächsten Durchführung).
ALTER TABLE maintenance_rules ADD COLUMN due_km INTEGER NULL;
