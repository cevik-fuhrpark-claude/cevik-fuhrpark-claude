-- [CLAUDE] Push-Gerät an die Anmeldung (Sitzung) binden, mit der es eingerichtet wurde.
-- Fehler 18.10.2026: Passwortwechsel, „andere Anmeldungen beenden“, einzelne Anmeldung beenden und Zwei-Faktor ein/aus
-- meldeten das Gerät ab, aber es bekam weiter Pushs (Kennzeichen, Vorgänge). Jetzt werden Push-Geräte beendeter Anmeldungen abgemeldet.
-- Bestand: NULL (Anmeldung unbekannt) – bleibt wie bisher aktiv, bis die App das Gerät beim nächsten Start neu zuordnet.
ALTER TABLE push_subscriptions ADD COLUMN session_hash TEXT NULL;
