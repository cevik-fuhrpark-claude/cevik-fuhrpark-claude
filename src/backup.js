// [CLAUDE] Datensicherung zum Herunterladen (nur Inhaber): alle Fachdaten als JSON, ohne Geheimnisse.
// Nicht enthalten: Passwort-Hashes, Sitzungen, Einladungs-Token, Push-Geräteschlüssel, VAPID-Schlüssel, Dateiinhalte (nur Metadaten).
import { forbidden, nowIso } from './util.js';
import { audit } from './auth.js';

const TABLES = [
  'workshops', 'vehicles', 'driver_vehicles', 'case_counters', 'cases', 'case_events', 'work_entries', 'parts', 'open_items', 'external_costs',
  'files', 'inspections', 'maintenance_rules', 'maintenance_events', 'odometer_readings', 'tire_specs', 'tire_events', 'stock_items', 'stock_movements',
  'fines', 'fine_events', 'fine_counters', 'agent_findings', 'master_inbox', 'notifications', 'telematics_latest', 'telematics_mappings', '_migrations',
];
const ROW_LIMIT = 200000;

export async function exportBackup(env, user) {
  if (user.role !== 'owner') throw forbidden('Nur der Inhaber darf eine Datensicherung herunterladen.');
  const data = {};
  const counts = {};
  for (const t of TABLES) {
    const rows = (await env.DB.prepare(`SELECT * FROM ${t} LIMIT ${ROW_LIMIT}`).all()).results;
    data[t] = rows; counts[t] = rows.length;
  }
  data.users = (await env.DB.prepare(`SELECT id, username, display_name, role, environment, workshop_site, employee_number, language, active, created_by, created_at, updated_at,
    CASE WHEN password_hash IS NULL THEN 0 ELSE 1 END AS has_password FROM users`).all()).results;
  counts.users = data.users.length;
  data.settings = (await env.DB.prepare(`SELECT key, value, updated_at FROM settings WHERE key NOT LIKE '%private%' AND key NOT LIKE '%secret%' AND key NOT LIKE '%token%'`).all()).results;
  counts.settings = data.settings.length;
  const truncated = Object.entries(counts).filter(([, n]) => n >= ROW_LIMIT).map(([t]) => t);
  await audit(env, user.id, 'backup.export', null, { counts });
  return {
    format: 'cevik-fuhrpark-backup', schema_version: 1, created_at: nowIso(), created_by: user.username,
    note: 'Fachdaten ohne Passwörter, Sitzungen, Token und Dateiinhalte. Vollständige Wiederherstellung: Cloudflare D1 Time Travel (siehe docs/BETRIEB.md).',
    counts, truncated, data,
  };
}
