-- [CLAUDE] Zwei-Faktor-Anmeldung (TOTP, freiwillig je Konto). Geheimnis und Ersatzcode-Hashes nie in Datensicherung/Datenauskunft.
-- totp_secret: Base32, aktiv. totp_pending: Base32, Einrichtung begonnen (noch nicht bestätigt).
-- totp_last_step: zuletzt verbrauchter Zeitschritt (kein zweites Mal). totp_recovery: JSON-Liste der SHA-256-Hashes unverbrauchter Ersatzcodes.
ALTER TABLE users ADD COLUMN totp_secret TEXT NULL;
ALTER TABLE users ADD COLUMN totp_pending TEXT NULL;
ALTER TABLE users ADD COLUMN totp_enabled_at TEXT NULL;
ALTER TABLE users ADD COLUMN totp_last_step INTEGER NULL;
ALTER TABLE users ADD COLUMN totp_recovery TEXT NULL;

-- Anmeldung nach richtigem Passwort, wartet auf den Code (5 Minuten, höchstens 5 Versuche)
CREATE TABLE IF NOT EXISTS login_challenges (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_login_challenges_user ON login_challenges(user_id);
