-- [CLAUDE] 27.10.2026 Backlog 431 (Blickwinkel „Allerheiligen – Büro in Dortmund geschlossen, App sagt ‚jetzt erreichbar‘“):
-- „nicht an Feiertagen“ einer Rufnummer kannte nur die bundesweiten Feiertage. hours_holiday_state = Kürzel des Bundeslands (BW, BY, BE, BB,
-- HB, HH, HE, MV, NI, NW, RP, SL, SN, ST, SH, TH), dessen landesweite Feiertage zusätzlich gelten; NULL = nur bundesweite. Nur zusammen mit
-- hours_no_holidays = 1, vom Betrieb gewählt (keine Zuordnung Standort → Bundesland).
ALTER TABLE emergency_contacts ADD COLUMN hours_holiday_state TEXT NULL;
