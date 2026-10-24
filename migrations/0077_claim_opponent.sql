-- [CLAUDE] 24.10.2026 Teilagent „Unfall mit fremdem Fahrzeug“: Der Versicherungsfall kannte nur den eigenen Versicherer.
-- Kennzeichen, Versicherer und Schadennummer der Gegenseite (Haftpflichtfall) standen nur im Freitext „Bemerkung“ – damit
-- weder in der Übersicht noch im Export auffindbar, wenn der Versicherer der Gegenseite nach dem Aktenzeichen fragt.
-- Alle Felder optional und nur laut Beleg/Unfallbericht (die App gibt nichts vor); kein Namensfeld (Datenschutz-Frage offen).
ALTER TABLE insurance_claims ADD COLUMN opponent_plate TEXT NULL;
ALTER TABLE insurance_claims ADD COLUMN opponent_insurer TEXT NULL;
ALTER TABLE insurance_claims ADD COLUMN opponent_claim_no TEXT NULL;
