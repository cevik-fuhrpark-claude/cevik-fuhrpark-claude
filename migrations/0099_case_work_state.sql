-- [CLAUDE] 02.11.2026 Backlog 867 (Blickwinkel „Werkstatt-Tablet: Mechaniker wird mitten in der Reparatur zu einem Notfall gerufen“):
-- Arbeitsstand für die Übergabe – was erledigt ist, was noch fehlt und in welchem Zustand das Fahrzeug steht (z. B. „Rad HL abgebaut –
-- nicht bewegen“). Nur laut Werkstatt/Leitung, nichts vorgegeben. Gilt solange der Auftrag in Reparatur bzw. „wartet auf Teile“ ist;
-- mit „Zur Abschlusskontrolle“, Freigabe oder Beenden des Auftrags entfernt (bleibt im Verlauf).
ALTER TABLE cases ADD COLUMN work_state_note TEXT NULL;
ALTER TABLE cases ADD COLUMN work_state_at TEXT NULL;
ALTER TABLE cases ADD COLUMN work_state_by TEXT NULL;
