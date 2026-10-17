-- [CLAUDE] Zeitpunkt der letzten Prüfung der km-Grundlage eines Vertrags (km bei Übernahme, km-Kontingent, Vertragsbeginn).
-- Ein km-Zähler-Rücksprung (Tachotausch) gilt nur als geklärt, wenn diese Grundlage DANACH geändert oder ausdrücklich bestätigt wurde –
-- eine geänderte Bemerkung oder Rate ändert updated_at, klärt aber nichts (Fehler 17.10.2026, wie 0055 bei Prüfterminen).
-- Bestand: bisheriger Stand (updated_at), damit sich heute nichts ändert.
ALTER TABLE vehicle_contracts ADD COLUMN km_basis_at TEXT NULL;
UPDATE vehicle_contracts SET km_basis_at = updated_at WHERE km_basis_at IS NULL;
