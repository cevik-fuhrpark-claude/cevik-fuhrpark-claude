-- [CLAUDE] Winterreifen: Kennzeichnung je Reifenereignis (StVO § 2 Abs. 3a, situative Winterreifenpflicht).
-- 3pmsf = Alpine-Symbol (Bergpiktogramm mit Schneeflocke), ms = nur M+S (seit 01.10.2024 nicht mehr ausreichend), keine = ohne Winterkennzeichnung.
-- NULL = nicht erfasst (nie angenommen).
ALTER TABLE tire_events ADD COLUMN winter_mark TEXT NULL CHECK (winter_mark IS NULL OR winter_mark IN ('3pmsf','ms','keine'));
