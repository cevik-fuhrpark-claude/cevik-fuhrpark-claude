-- [CLAUDE] Backlog 1661 (Blickwinkel „Reifendienst wechselt Freitag, Werkstatt trägt Montag nach“): Datum der Durchführung je Reifenereignis
-- (JJJJ-MM-TT, optional). Leer = am Erfassungstag durchgeführt (wie bisher). Verlauf, Profil-Stand und Positionen zeigen dieses Datum.
ALTER TABLE tire_events ADD COLUMN performed_on TEXT NULL;
