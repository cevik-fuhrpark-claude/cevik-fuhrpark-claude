-- [CLAUDE] 05.11.2026 Backlog 1020 (Blickwinkel „Fahrer schickt ein Foto aus der Galerie statt mit der Kamera“):
-- Aufnahmezeit eines Fotos am Vorgang laut Kamera (EXIF DateTimeOriginal, sonst DateTimeDigitized), vom Gerät vor dem Verkleinern gelesen
-- (das verkleinerte Bild enthält keine EXIF-Daten mehr). Ortszeit der Kamera ohne Zeitzone, Format JJJJ-MM-TTTHH:MM; fehlt die Angabe
-- (Screenshot, PDF, Kamera ohne Uhr), bleibt NULL – nichts wird geschätzt. GPS-Daten werden bewusst nicht gelesen.
ALTER TABLE files ADD COLUMN taken_at TEXT NULL;
