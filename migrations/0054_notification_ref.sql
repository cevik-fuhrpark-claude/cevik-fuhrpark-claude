-- [CLAUDE] Bezug eines Hinweises ohne Vorgang ('vehicle:<id>' = Fahrzeugakte, 'fine:<id>' = Bußgeld): Tippen auf Hinweis/Push öffnet
-- direkt den Gegenstand statt der allgemeinen Startseite. Leer = kein besonderer Bezug (ältere Hinweise, Agent, Test).
ALTER TABLE notifications ADD COLUMN ref TEXT NULL;
