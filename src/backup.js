// [CLAUDE] Datensicherung zum Herunterladen (nur Inhaber): alle Fachdaten als JSON, ohne Geheimnisse.
// Nicht enthalten: Passwort-Hashes, Zwei-Faktor-Geheimnisse/Ersatzcodes, Sitzungen, Einladungs-Token, Push-Geräteschlüssel, VAPID-Schlüssel, Dateiinhalte (nur Metadaten).
import { forbidden, nowIso } from './util.js';
import { audit } from './auth.js';
import { TABLE_COLUMNS } from './schema.js';

const TABLES = [
  'workshops', 'vehicles', 'vehicle_plates', 'driver_vehicles', 'case_counters', 'cases', 'case_events', 'work_entries', 'parts', 'open_items', 'external_costs',
  'files', 'inspections', 'maintenance_rules', 'maintenance_events', 'odometer_readings', 'tire_specs', 'tire_events', 'stock_items', 'stock_movements',
  'fines', 'fine_events', 'fine_counters', 'agent_findings', 'master_inbox', 'notifications', 'telematics_latest', 'telematics_mappings', 'telematics_unmatched',
  'drivers', 'driver_documents', 'driver_license_checks', 'tacho_downloads', 'vehicle_contracts', 'insurance_claims', 'vehicle_notes', 'emergency_contacts', 'hourly_rate_periods', 'audit_log', '_migrations',
];
// Bewusst nicht in der Sicherung (Test prüft, dass jede Tabelle hier oder oben steht):
export const EXCLUDED = {
  users: 'eigene Abfrage ohne Passwort-Hash', settings: 'eigene Abfrage ohne Schlüssel', sessions: 'Anmeldesitzungen', invites: 'Einladungs-Token',
  login_attempts: 'Fehlversuche (kurzlebig)', push_subscriptions: 'Geräteschlüssel', cmd_guard: 'technische Sperre', rate_limits: 'Mengenbegrenzung (kurzlebig)', login_challenges: 'Anmeldevorgänge Zwei-Faktor (kurzlebig)', known_devices: 'Gerätekennungen für den Anmelde-Hinweis',
  usage_daily: 'Nutzungsstatistik ohne Fachbezug', agent_runs: 'Laufprotokoll des Agenten (technisch)',
};
export const BACKUP_TABLES = TABLES;
const ROW_LIMIT = 200000;

const GROUP = 8;
const ARGS = 30;
const q = (c) => `"${c.replace(/"/g, '""')}"`;
export function backupQueries(tables) {
  const out = [];
  for (let i = 0; i < tables.length; i += GROUP) {
    out.push(tables.slice(i, i + GROUP).map((t) => {
      const cols = TABLE_COLUMNS[t];
      if (!cols) throw new Error(`Tabelle ${t} fehlt im Schema (npm run build)`);
      const parts = [];
      // Kommazahlen (REAL) mit 17 gültigen Stellen als {"r":"…"} – json_array gibt sonst nur 15 aus (GPS-Position gerundet, 17.10.2026)
      const col = (c) => `CASE WHEN typeof(${q(c)})='real' THEN json_object('r', printf('%!.17g', ${q(c)})) ELSE ${q(c)} END`;
      for (let k = 0; k < cols.length; k += ARGS) parts.push(`json_array(${cols.slice(k, k + ARGS).map(col).join(',')})`);
      // neueste Zeilen zuerst und eine Zeile mehr als die Grenze: so bleibt bei einer Kappung das Neueste erhalten und „gekappt“
      // heißt wirklich „es fehlen Zeilen“ (vorher fielen die neuesten Protokollzeilen still weg, genau 200 000 galten als gekappt; 18.10.2026)
      return `SELECT '${t}' AS t, json_array(${parts.join(',')}) AS j FROM (SELECT * FROM ${q(t)} ORDER BY rowid DESC LIMIT ${ROW_LIMIT + 1})`;
    }).join(' UNION ALL '));
  }
  return out;
}

export async function exportBackup(env, user) {
  if (user.role !== 'owner') throw forbidden('Nur der Inhaber darf eine Datensicherung herunterladen.');
  const data = {};
  const counts = {};
  for (const t of TABLES) { data[t] = []; }
  // Abfragebudget (≤ 50 je Aufruf): je GROUP Tabellen eine Sammelabfrage statt einer je Tabelle; Zeilen als JSON-Arrays,
  // je Funktion höchstens ARGS Argumente (D1-Grenze für Funktionsargumente), Spaltennamen aus dem Schema (Build).
  // Spalten werden namentlich abgefragt (Reihenfolge egal). Weicht die Datenbank vom Schema ab (Abfragefehler), wird diese Gruppe
  // wie früher je Tabelle mit SELECT * gelesen – lieber mehr Abfragen als eine unvollständige Sicherung.
  const queries = backupQueries(TABLES);
  // ein Stapel = eine Transaktion: alle Gruppen, Benutzer und Einstellungen aus demselben Stand (vorher nacheinander gelesen –
  // eine Meldung zwischen zwei Gruppen ergab Hinweise ohne ihren Vorgang, 17.10.2026). Scheitert der Stapel, wie bisher je Gruppe.
  const userCols = TABLE_COLUMNS.users.filter((c) => !/^password_|^totp_(secret|pending|last_step|recovery)$/.test(c));
  const usersSql = `SELECT ${userCols.join(', ')}, CASE WHEN password_hash IS NULL THEN 0 ELSE 1 END AS has_password FROM users`;
  const settingsSql = `SELECT key, value, updated_by, updated_at FROM settings WHERE key NOT LIKE '%private%' AND key NOT LIKE '%secret%' AND key NOT LIKE '%token%'`;
  let batched = null;
  try { batched = await env.DB.batch([...queries.map((x) => env.DB.prepare(x)), env.DB.prepare(usersSql), env.DB.prepare(settingsSql)]); } catch { batched = null; }
  const num = (v) => (v && typeof v === 'object' && !Array.isArray(v) && typeof v.r === 'string' ? Number(v.r) : v);
  for (let g = 0; g < queries.length; g++) {
    let results;
    if (batched) results = batched[g].results;
    else try { results = (await env.DB.prepare(queries[g]).all()).results; } catch {
      for (const t of TABLES.slice(g * GROUP, (g + 1) * GROUP)) data[t] = (await env.DB.prepare(`SELECT * FROM ${q(t)} ORDER BY rowid DESC LIMIT ${ROW_LIMIT + 1}`).all()).results;
      continue;
    }
    for (const r of results) {
      const cols = TABLE_COLUMNS[r.t];
      const vals = JSON.parse(r.j).flat();
      const row = {};
      cols.forEach((c, i) => { row[c] = num(vals[i]); });
      data[r.t].push(row);
    }
  }
  const cut = [];
  for (const t of TABLES) {
    if (data[t].length > ROW_LIMIT) { data[t].length = ROW_LIMIT; cut.push(t); } // älteste Zeile(n) fallen weg
    data[t].reverse(); // wieder in Anlagereihenfolge
    counts[t] = data[t].length;
  }
  // Benutzer: alle Spalten laut Schema außer Passwort-Hash/-Salz (neue Spalten wie push_muted, home_site kommen automatisch mit)
  // ohne Passwort-Hash/-Salz und ohne Zwei-Faktor-Geheimnis/Ersatzcodes (nur „eingeschaltet seit“ bleibt)
  data.users = batched ? batched[queries.length].results : (await env.DB.prepare(usersSql).all()).results;
  counts.users = data.users.length;
  data.settings = batched ? batched[queries.length + 1].results : (await env.DB.prepare(settingsSql).all()).results;
  counts.settings = data.settings.length;
  const truncated = cut;
  await audit(env, user.id, 'backup.export', null, { counts });
  return {
    format: 'cevik-fuhrpark-backup', schema_version: 1, created_at: nowIso(), created_by: user.username,
    note: 'Fachdaten ohne Passwörter, Sitzungen, Token und Dateiinhalte. Vollständige Wiederherstellung: Cloudflare D1 Time Travel (siehe docs/BETRIEB.md).',
    counts, truncated, data,
  };
}
