-- [CLAUDE] 02.11.2026 Backlog 871 (Blickwinkel „Fahrer fragt: wann ist mein Lkw fertig?“):
-- Voraussichtliche Fertigstellung laut Werkstatt/Leitung (nur Datum, nichts vorgegeben oder berechnet). Der Werkstatttermin
-- (`planned_date`) ist der Beginn, nicht das Ende der Arbeit. Gilt solange der Auftrag freigegeben, in Reparatur oder „wartet auf Teile“ ist;
-- mit „Zur Abschlusskontrolle“, Freigabe, Beenden oder Werkstattwechsel entfernt (bleibt im Verlauf).
ALTER TABLE cases ADD COLUMN ready_expected_on TEXT NULL;
