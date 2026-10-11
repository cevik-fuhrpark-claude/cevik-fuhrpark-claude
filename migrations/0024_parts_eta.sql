-- [CLAUDE] Werkstatt: „Teile erwartet am“ (Liefertermin laut Lieferant/Werkstatt, optional) – für die Einsatzplanung der Disposition
ALTER TABLE cases ADD COLUMN parts_expected_date TEXT NULL;
