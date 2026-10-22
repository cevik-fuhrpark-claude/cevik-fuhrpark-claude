-- [CLAUDE] 22.10.2026 Rechenzeit (Cloudflare-Gratis-Tarif 10 ms CPU je Cron-Lauf): Eingabe des Befund-Fingerabdrucks (`code|subject|severity|requires_decision`)
-- neben dem Fingerabdruck speichern. Der Fuhrparkagent übernimmt bei unveränderter Eingabe den gespeicherten Fingerabdruck, statt im ersten Lauf
-- einer Worker-Instanz alle Befunde neu zu hashen. Bestand NULL = einmal neu berechnen (gleicher Fingerabdruck, keine neue Übergabe).
ALTER TABLE agent_findings ADD COLUMN fp_src TEXT NULL;
