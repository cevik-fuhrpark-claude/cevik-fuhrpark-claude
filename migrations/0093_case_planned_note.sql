-- [CLAUDE] 27.10.2026 Blickwinkel „Lkw für einen halben Tag zur Achsvermessung/zum Bremsprüfstand bei einer Fremdfirma“:
-- Der Werkstatttermin ist nur ein Tag. Ob das Fahrzeug den ganzen Tag fehlt oder nur vormittags, wann es abgeholt wird und wo
-- (Fremdfirma) es ist, stand höchstens als „Grund der Verschiebung“ im Verlauf – im Werkstattplan und bei der Disposition unsichtbar.
-- Optionaler Hinweis zum Termin (Freitext laut Werkstatt/Leitung, nichts vorgegeben); wird mit dem Termin entfernt.
ALTER TABLE cases ADD COLUMN planned_note TEXT NULL;
