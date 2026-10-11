-- [CLAUDE] Kosten-Freigabegrenze je Auftrag (Einstellung repair_cost_limit_net, leer = aus):
-- cost_over_limit_at = Zeitpunkt, ab dem die bewerteten Kosten (Ist + Schätzung) die Grenze bzw. den zuletzt freigegebenen Betrag übersteigen;
-- cost_approved_net = von der Fuhrparkleitung freigegebener Betrag (netto). Keine Vorgabe der App – Grenze nur laut Einstellung.
ALTER TABLE cases ADD COLUMN cost_over_limit_at TEXT NULL;
ALTER TABLE cases ADD COLUMN cost_approved_net REAL NULL;
