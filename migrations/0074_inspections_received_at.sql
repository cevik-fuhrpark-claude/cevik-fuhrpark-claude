-- [CLAUDE] 22.10.2026 Nachvollziehbarkeit (Backlog 129): Eine offline gespeicherte Abfahrtskontrolle trägt den Durchführungszeitpunkt
-- (`created_at`, bis zu 7 Tage zurück). Der Empfangszeitpunkt am Server war nicht erkennbar. `received_at` wird nur gesetzt, wenn
-- die Kontrolle nachgereicht (zurückdatiert) wurde; NULL = sofort gesendet bzw. Bestand vor dieser Migration.
ALTER TABLE inspections ADD COLUMN received_at TEXT NULL;
