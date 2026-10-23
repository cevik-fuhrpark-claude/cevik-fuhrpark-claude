-- [CLAUDE] 23.10.2026 Teilagent „Versicherungsschaden mit Gutachter“: Der Versicherungsfall kannte keinen Gutachter.
-- Besichtigungstermin, Eingang des Gutachtens und die Schadenhöhe laut Gutachten standen nur im Freitext „Bemerkung“ –
-- nicht auswertbar („Gutachten ausstehend“), nicht im Export. Alle Felder optional und nur laut Beleg (nichts vorgegeben).
ALTER TABLE insurance_claims ADD COLUMN appraiser TEXT NULL;
ALTER TABLE insurance_claims ADD COLUMN appraisal_on TEXT NULL;
ALTER TABLE insurance_claims ADD COLUMN appraisal_received_on TEXT NULL;
ALTER TABLE insurance_claims ADD COLUMN appraisal_net REAL NULL;
