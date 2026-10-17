-- [CLAUDE] Hinweise ausblenden statt löschen: Bei Rollen- oder Umgebungswechsel eines Kontos gelten die bisherigen Hinweise der alten
-- Rolle (z. B. kritische Meldungen an die Fuhrparkleitung) nicht mehr für die Person – sie werden ausgeblendet (Liste, Zähler, Push-Wiederholung),
-- bleiben aber in der Datenbank (keine Löschung ohne Aufbewahrungsregel). Leer = sichtbar.
ALTER TABLE notifications ADD COLUMN hidden_at TEXT NULL;
