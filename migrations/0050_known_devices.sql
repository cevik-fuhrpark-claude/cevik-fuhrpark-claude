-- [CLAUDE] Anmelde-Hinweis bei neuem Gerät: je Konto die Geräte, auf denen sich die Person bereits angemeldet hat.
-- device_hash = SHA-256 einer zufälligen Gerätekennung, die nur im Browser des Geräts liegt (localStorage), nie die Kennung selbst.
-- label = grobe Gerätebezeichnung aus dem Browser („Chrome · Android“). Nicht in der Datensicherung; Einträge ohne Anmeldung
-- seit 400 Tagen löscht der Cron, höchstens 20 je Konto (älteste fallen heraus).
CREATE TABLE IF NOT EXISTS known_devices (
  user_id TEXT NOT NULL REFERENCES users(id),
  device_hash TEXT NOT NULL,
  label TEXT,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  PRIMARY KEY (user_id, device_hash)
);
CREATE INDEX IF NOT EXISTS idx_known_devices_seen ON known_devices(last_seen);
