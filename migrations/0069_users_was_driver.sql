-- [CLAUDE] 21.10.2026: Datensparsamkeit Lesezugriff – Namen von Fahrern bleiben auch nach einem Rollenwechsel ausgeblendet.
-- Vorher entschied die heutige Rolle: Fahrer → Disposition machte seinen Namen in Vorgangsliste/-detail/CSV, Kontrollen,
-- Restarbeiten und Reifenverlauf für den Lesezugriff (und im Reifenverlauf für andere Fahrer) sichtbar.
-- was_driver = 1: Konto war irgendwann Fahrer (heute oder früher). Bestand aus Protokoll (Anlegen/Ändern mit Rolle Fahrer)
-- und Vorgangsverlauf (Handlung als Fahrer) nachgetragen.
ALTER TABLE users ADD COLUMN was_driver INTEGER NOT NULL DEFAULT 0;
UPDATE users SET was_driver = 1 WHERE role = 'driver'
  OR EXISTS (SELECT 1 FROM audit_log a WHERE a.target = users.id AND a.action IN ('user.create', 'user.update') AND json_extract(a.detail, '$.role') = 'driver')
  OR EXISTS (SELECT 1 FROM audit_log a WHERE a.target = users.id AND a.action = 'user.update' AND json_extract(a.detail, '$.changed.role.from') = 'driver')
  OR EXISTS (SELECT 1 FROM case_events e WHERE e.actor_id = users.id AND e.actor_role = 'driver');
