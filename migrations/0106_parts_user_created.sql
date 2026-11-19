-- [CLAUDE] Backlog 1619: eigene Teilebuchungen des Tages je Konto (Hinweis „gleiches Teil heute schon auf einem anderen Auftrag gebucht“)
CREATE INDEX IF NOT EXISTS idx_parts_user_created ON parts(user_id, created_at);
