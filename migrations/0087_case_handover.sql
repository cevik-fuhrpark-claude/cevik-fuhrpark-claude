-- [CLAUDE] 27.10.2026 Backlog 423 (Blickwinkel „Werkstatt bekommt den Lkw ohne Schlüssel/Fahrzeugschein“):
-- Ob Fahrzeugschlüssel und Fahrzeugschein (Zulassungsbescheinigung Teil I) bei der Werkstatt sind. Stand vorher nur im Kommentar;
-- die Werkstatt konnte nicht anfangen bzw. nicht zur Prüfstelle, und die Leitung sah es nicht auf einen Blick.
-- Werte: NULL = nicht angegeben, 'da' = bei der Werkstatt, 'fehlt' = fehlt. Nur laut Werkstatt/Leitung, nichts vorgegeben.
ALTER TABLE cases ADD COLUMN handover_keys TEXT NULL;
ALTER TABLE cases ADD COLUMN handover_papers TEXT NULL;
