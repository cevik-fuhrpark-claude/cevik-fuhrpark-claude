-- [CLAUDE] Weitere Indizes nach Abfrageplan-Prüfung der gesamten Testsuite (CFP_QPLAN=1 npm test): Diese Abfragen lasen bisher
-- jeweils die ganze Tabelle (zählt gegen das D1-Tageskontingent „gelesene Zeilen“). Nur Indizes, keine Datenänderung.
-- Vorgangsdetail und Abschluss: Kontrollen je Vorgang (Tabelle wächst mit jeder Abfahrtskontrolle)
CREATE INDEX IF NOT EXISTS idx_inspections_case ON inspections(case_id, created_at);
-- Push-Wiederholung (Cron alle 15 Min., letzte 24 h) und Kommentar-Empfänger je Vorgang
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notif_case ON notifications(case_id, kind);
-- Bußgeld-Detail: Verlauf und Dateien je Bußgeld
CREATE INDEX IF NOT EXISTS idx_fine_events_fine ON fine_events(fine_id, created_at);
CREATE INDEX IF NOT EXISTS idx_files_fine ON files(fine_id);
-- Fahrerzuordnung je Fahrzeug (Fahrzeugakte, Empfänger von Fahrzeug-Hinweisen)
CREATE INDEX IF NOT EXISTS idx_dv_vehicle ON driver_vehicles(vehicle_id);
-- Push-Geräte je Person
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
-- Letzter Agent-Lauf je Umgebung (Laufprotokoll wächst je Cron-Lauf) bzw. insgesamt (Systemstatus)
CREATE INDEX IF NOT EXISTS idx_agent_runs_env ON agent_runs(environment, started_at);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started ON agent_runs(started_at);
-- Master-Eingang: unverarbeitete Übergaben je Umgebung (jeder Agent-Lauf)
CREATE INDEX IF NOT EXISTS idx_master_inbox_env ON master_inbox(environment, processed_at);
