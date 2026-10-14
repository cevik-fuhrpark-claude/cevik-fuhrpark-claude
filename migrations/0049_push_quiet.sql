-- [CLAUDE] Persönliche Ruhezeit für nicht dringende Pushs (z. B. Ruhezeit der Fahrer, Nacht). Wanduhrzeit Berlin „HH:MM“; beide leer = aus.
-- Während der Ruhezeit bleibt ein nicht dringender Hinweis in der App sichtbar, der Push wartet (push_status 'pending', push_hold_until = Ende
-- der Ruhezeit) und kommt danach gesammelt (ein Push je Person) per Cron. Dringende Hinweise (kritisch, nicht fahrbereit, Sperre) immer sofort.
ALTER TABLE users ADD COLUMN push_quiet_from TEXT NULL;
ALTER TABLE users ADD COLUMN push_quiet_to TEXT NULL;
ALTER TABLE notifications ADD COLUMN push_hold_until TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_hold ON notifications(push_hold_until) WHERE push_status = 'pending' AND push_hold_until IS NOT NULL;
