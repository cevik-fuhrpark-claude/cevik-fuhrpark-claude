-- [CLAUDE] Nutzungsstatistik ohne Personenbezug (Einführungsphase): Aufrufe je Tag, Umgebung und Funktion.
-- Keine Benutzer-ID, keine Rolle, keine IP, keine Inhalte – nur normalisierte Funktionspfade (IDs durch :id ersetzt).
CREATE TABLE IF NOT EXISTS usage_daily (
  day TEXT NOT NULL,                    -- JJJJ-MM-TT (Berliner Zeit)
  environment TEXT NOT NULL CHECK (environment IN ('test','production')),
  feature TEXT NOT NULL,                -- z. B. 'POST cases/:id/commands'
  calls INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,    -- Antworten mit Status >= 400
  PRIMARY KEY (day, environment, feature)
);
