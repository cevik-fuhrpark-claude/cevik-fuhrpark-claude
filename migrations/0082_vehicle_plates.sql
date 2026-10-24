-- [CLAUDE] Backlog 256 (25.10.2026, Teilagent „Lkw wird umgekennzeichnet“): frühere Kennzeichen je Fahrzeug.
-- Vorher stand das alte Kennzeichen nur im Protokoll (nur Inhaber); Fahrzeugakte, Suche und Vorgangssuche kannten es nicht.
-- Eine Zeile je Kennzeichenwechsel: bisheriges Kennzeichen, gültig bis (Zeitpunkt der Änderung in der App), wer, Quelle.
CREATE TABLE IF NOT EXISTS vehicle_plates (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  plate TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  changed_by TEXT NULL,
  source TEXT NULL
);
CREATE INDEX IF NOT EXISTS idx_vehicle_plates_vehicle ON vehicle_plates(vehicle_id, valid_until);
-- Bestand aus dem Protokoll (Stammdaten bearbeiten und CSV-Import schreiben `plate_old` seit 21.10.2026)
INSERT OR IGNORE INTO vehicle_plates(id, vehicle_id, plate, valid_until, changed_by, source)
  SELECT 'vp-' || a.id, a.target, json_extract(a.detail, '$.plate_old'), a.created_at, a.actor_id, 'protokoll'
  FROM audit_log a JOIN vehicles v ON v.id = a.target
  WHERE a.action = 'vehicle.upsert' AND json_valid(a.detail) AND TRIM(COALESCE(json_extract(a.detail, '$.plate_old'), '')) <> '';
