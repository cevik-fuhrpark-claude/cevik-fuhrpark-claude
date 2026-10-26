-- [CLAUDE] 26.10.2026 Backlog 364 (Blickwinkel „Bußgeldbescheid mit Fahrverbot“):
-- Fahrverbot laut Schreiben in Monaten (1–3, § 25 StVG). Nur wie im Schreiben angegeben, nie geschätzt; leer = im Schreiben kein Fahrverbot angegeben.
ALTER TABLE fines ADD COLUMN driving_ban_months INTEGER NULL;
