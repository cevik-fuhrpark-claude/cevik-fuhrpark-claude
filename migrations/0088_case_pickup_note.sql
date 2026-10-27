-- [CLAUDE] 27.10.2026 Backlog 425 (Blickwinkel „Fahrzeug kommt aus der Werkstatt zurück, Fahrer findet den Schlüssel nicht“):
-- Abholvermerk zum Vorgang – wo Fahrzeug, Schlüssel und Fahrzeugschein nach der Reparatur zur Abholung liegen (z. B. Schlüsselkasten, Platz).
-- Stand vorher nur im freien Kontrollnachweis/Kommentar; Fahrer und Disposition fanden ihn nicht. Nur laut Werkstatt/Leitung, nichts vorgegeben.
ALTER TABLE cases ADD COLUMN pickup_note TEXT NULL;
