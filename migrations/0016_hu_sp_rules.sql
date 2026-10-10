-- [CLAUDE] HU/SP-Fristen nach StVZO Anlage VIII: Fahrzeugklasse (zGM), Erstzulassung, Herkunft der Fälligkeit, geplante Termine, Prüfergebnis
-- zgm_class: bis_3_5 | 3_5_7_5 | 7_5_12 | ueber_12 (Lkw), bis_3_5 | 3_5_10 | ueber_10 (Anhänger)
ALTER TABLE vehicles ADD COLUMN zgm_class TEXT NULL;
-- zulässige Gesamtmasse laut Fahrzeugschein F.2 (wenn bekannt)
ALTER TABLE vehicles ADD COLUMN zgm_kg INTEGER NULL;
-- Erstzulassung laut Fahrzeugschein Feld B (JJJJ-MM-TT)
ALTER TABLE vehicles ADD COLUMN first_registration TEXT NULL;
-- Nachweis für zGM/Erstzulassung
ALTER TABLE vehicles ADD COLUMN spec_source TEXT NULL;
-- Herkunft der Fälligkeit: nachweis = verbindlich laut Beleg/Plakette, berechnet = aus Regel
ALTER TABLE maintenance_rules ADD COLUMN due_source TEXT NULL;
-- geplanter Werkstatttermin (ersetzt keine Durchführung)
ALTER TABLE maintenance_rules ADD COLUMN planned_date TEXT NULL;
-- Prüfergebnis, wenn belegt
ALTER TABLE maintenance_events ADD COLUMN result TEXT NULL;
-- Herkunft vorhandener Fälligkeiten: mit Intervall importiert/erfasst = berechnet, sonst = Nachweis (z. B. Plakette)
UPDATE maintenance_rules SET due_source = CASE WHEN interval_months IS NOT NULL THEN 'berechnet' ELSE 'nachweis' END WHERE next_due_date IS NOT NULL AND due_source IS NULL;
UPDATE maintenance_rules SET due_source = 'berechnet' WHERE next_due_date IS NULL AND due_source IS NULL;
-- Angabe des Inhabers vom 10.10.2026: alle Lkw über 12 t, alle Anhänger über 10 t zulässige Gesamtmasse (je Fahrzeug änderbar)
UPDATE vehicles SET zgm_class = CASE WHEN kind='anhaenger' THEN 'ueber_10' ELSE 'ueber_12' END, spec_source = 'Angabe Inhaber 10.10.2026: alle Lkw über 12 t, alle Anhänger über 10 t zGM' WHERE zgm_class IS NULL;
-- Korrektur 10.10.2026: der Zusatz „Intervall 6 Monate“ an SP-Nachweisen war fachlich falsch (SP richtet sich nach der HU) – Zusatz entfernen, Beleg bleibt
UPDATE maintenance_rules SET evidence = REPLACE(evidence, '; Intervall 6 Monate vom Inhaber bestätigt am 10.10.2026', ''), interval_months = NULL, due_source = 'berechnet' WHERE kind = 'SP' AND instr(evidence, 'Intervall 6 Monate vom Inhaber') > 0;
UPDATE maintenance_events SET evidence = REPLACE(evidence, '; Intervall 6 Monate vom Inhaber bestätigt am 10.10.2026', '') WHERE kind = 'SP' AND instr(evidence, 'Intervall 6 Monate vom Inhaber') > 0;
UPDATE maintenance_rules SET due_source = 'berechnet' WHERE kind = 'HU' AND instr(evidence, 'Intervall 12 Monate vom Inhaber') > 0;
INSERT INTO audit_log(id, actor_id, action, target, detail, created_at) VALUES (lower(hex(randomblob(16))), NULL, 'maintenance.husp_migration', NULL, '{"grund":"SP-Frist nach StVZO Anlage VIII (6 Monate nach HU) statt pauschal 6 Monate nach letzter SP; zGM-Klassen laut Angabe Inhaber"}', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
