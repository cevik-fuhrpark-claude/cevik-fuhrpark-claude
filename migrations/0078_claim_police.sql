-- [CLAUDE] 24.10.2026 Teilagent „Kraftstoffdiebstahl am Rastplatz“: Bei Diebstahl/Einbruch verlangt der Versicherer (Teilkasko)
-- die polizeiliche Anzeige. Der Fahrerhinweis bittet um Dienststelle und Aktenzeichen in der Beschreibung – im Versicherungsfall
-- gab es dafür kein Feld; Aktenzeichen standen nur im Freitext und waren weder in der Übersicht noch im Export auffindbar.
-- Alle Felder optional und nur laut Anzeigebestätigung/Fahrerangabe (die App gibt nichts vor).
ALTER TABLE insurance_claims ADD COLUMN police_station TEXT NULL;
ALTER TABLE insurance_claims ADD COLUMN police_ref TEXT NULL;
ALTER TABLE insurance_claims ADD COLUMN police_reported_on TEXT NULL;
