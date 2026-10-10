-- [CLAUDE] Einfache Mengenbegrenzung je Benutzer und Aktion (Uploads, Importe) gegen versehentliche oder missbräuchliche Massenaufrufe
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,                 -- '<aktion>:<benutzer-id>'
  window_start INTEGER NOT NULL,        -- Fensterbeginn (Unix-Sekunden)
  count INTEGER NOT NULL
);
