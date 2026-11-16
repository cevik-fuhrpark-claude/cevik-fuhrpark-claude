-- Backlog 1530 (Blickwinkel „Leitung prüft vor der Mautabrechnung, ob Schadstoffklasse und Achszahl in der OBU stimmen“):
-- Schadstoffklasse (Zulassungsbescheinigung Teil I, Feld V.9 bzw. 14) und Anzahl der Achsen (Feld L) – nur laut Nachweis, leer = nicht erfasst
ALTER TABLE vehicles ADD COLUMN emission_class TEXT NULL;
ALTER TABLE vehicles ADD COLUMN axles INTEGER NULL;
