-- [CLAUDE] 24.10.2026 Teilagent „Fahrzeug wird abgeschleppt – wer sieht was?“: Nach einer Panne/einem Unfall steht das Fahrzeug
-- oft nicht mehr am gemeldeten Ort, sondern auf dem Hof eines Abschleppdienstes oder bei einer Fremdwerkstatt. Der Vorgang kannte nur
-- den Ort der Meldung (location_note); wo das Fahrzeug jetzt steht und wer es abgeschleppt hat, stand höchstens im Kommentar und war
-- für Disposition/Werkstatt (Abholung) nicht auf einen Blick sichtbar. Alle Felder optional und nur laut Angabe/Beleg (nichts vorgegeben).
ALTER TABLE cases ADD COLUMN vehicle_location TEXT NULL;
ALTER TABLE cases ADD COLUMN tow_service TEXT NULL;
ALTER TABLE cases ADD COLUMN towed_on TEXT NULL;
