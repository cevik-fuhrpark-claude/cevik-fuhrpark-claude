-- [CLAUDE] 25.10.2026 Backlog 261 (Folge aus Teilagent „Werkstatt findet bei der Reparatur einen zusätzlichen Schaden“):
-- Restarbeit optional mit einer Datei (Foto/PDF) desselben Vorgangs – die Leitung sieht den Zusatzbefund samt Foto an der Restarbeit.
ALTER TABLE open_items ADD COLUMN file_id TEXT NULL;
