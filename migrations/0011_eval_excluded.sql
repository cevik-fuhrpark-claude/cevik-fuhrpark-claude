-- [CLAUDE] Fahrzeuge „ruhend“: bleiben im Bestand (Akte, Vorgänge möglich), zählen aber in keiner Auswertung
-- (Kostenberichte, Kennzahlen, Fahrzeugzählung, Prüftermin-/Reifen-/Dokument-Befunde und -Übersichten).
ALTER TABLE vehicles ADD COLUMN eval_excluded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vehicles ADD COLUMN eval_excluded_reason TEXT NULL;
-- Entscheidung des Inhabers vom 10.10.2026: 7 Lkw aus der Dortmunder Fuhrparkdatei (nicht in der Stammliste),
-- Reparatur oder Verkauf offen – im Bestand lassen, aus allen Bewertungen herausnehmen.
UPDATE vehicles SET eval_excluded=1, eval_excluded_reason='Reparatur oder Verkauf offen (Entscheidung Inhaber 10.10.2026)'
  WHERE vin IN ('WDB9300561L373648','WDB9630051L903288','WDB9630051L909054','WDB9300561L373649','WDB9300561L373441','WJMA62AT20C378145','WDB96300510318431');
