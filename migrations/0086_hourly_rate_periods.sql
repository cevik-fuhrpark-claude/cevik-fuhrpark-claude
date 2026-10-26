-- [CLAUDE] 26.10.2026 Backlog 412 (Blickwinkel „Jahreswechsel: Werkstatt-Stundensatz steigt zum 01.01.“):
-- Frühere Werkstatt-Stundensätze mit Gültigkeit. Ein Eintrag gilt für Arbeitszeit mit Arbeitsdatum bis einschließlich valid_until
-- (und nach dem vorherigen Eintrag); nach dem jüngsten Eintrag gilt der Stundensatz aus den Einstellungen. Ohne Eintrag: wie bisher
-- (Satz aus den Einstellungen für alle Arbeitsdaten). Nur vom Inhaber beim Ändern des Satzes angelegt – kein Satz wird geschätzt.
CREATE TABLE IF NOT EXISTS hourly_rate_periods (
  valid_until TEXT PRIMARY KEY,
  rate_net REAL NOT NULL CHECK (rate_net > 0),
  created_by TEXT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);
