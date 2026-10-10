-- [CLAUDE] Kilometerstände: Begründung bei unplausiblem Wert (z. B. Zählerwechsel, Tachotausch) und Index für die Nachbarprüfung
ALTER TABLE odometer_readings ADD COLUMN note TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_odometer_vehicle_time ON odometer_readings(vehicle_id, measured_at);
