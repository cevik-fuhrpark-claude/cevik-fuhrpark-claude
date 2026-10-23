// [CLAUDE] Wiederherstellungs-Probe der JSON-Datensicherung (nur lokal, In-Memory-Datenbank – nie gegen die echte D1).
// Spielt eine Sicherungsdatei in eine frische Datenbank mit aktuellem Schema ein und prüft je Tabelle Vorhandensein, Spalten und Zeilenzahl (gegen den Export).
// Aufruf: node --experimental-sqlite scripts/sicherung-probe.mjs <sicherung.json>
// Hinweis: Passwort-Hashes, Sitzungen, Token und Dateiinhalte sind bewusst nicht in der Sicherung – nach einer Wiederherstellung
// aus der JSON-Datei müssten alle Benutzer neu eingeladen werden. Für den Betrieb ist D1 Time Travel der Wiederherstellungsweg.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Spielt `backup` in die (bereits migrierte) node:sqlite-Datenbank `db` ein. Ergebnis: Vergleich je Tabelle.
// Seit 21.10.2026 zusätzlich (vorher galt eine Datei ohne Tabelle/Spalte oder mit fehlenden Zeilen als „vollständig“):
// – jede Tabelle, die eine Sicherung laut `src/backup.js` enthalten muss, aber fehlt → ✘ „fehlt in Sicherung“;
// – Zeilenzahl gegen `counts` beim Export (gekürzte/bearbeitete Datei);
// – Spalten je Tabelle gegen das Schema: fehlende Spalte ist ✘, wenn die Sicherung alle Migrationen der Datenbank kennt
//   (gleicher Stand → Datenverlust), sonst Hinweis (ältere Sicherung); unbekannte Spalte (würde verworfen) ist immer Hinweis.
// `opts.required`: Liste der Pflicht-Tabellen (Aufruf von der Kommandozeile: `requiredTables()` aus src/backup.js; ohne Angabe keine Prüfung).
const USER_SECRET = /^password_|^totp_(secret|pending|last_step|recovery)$/;
const EXTRA_OK = { users: new Set(['has_password']) };
export function restoreInto(db, backup, opts = {}) {
  if (!backup || backup.format !== 'cevik-fuhrpark-backup' || !backup.data) throw new Error('Keine Fuhrpark-Sicherung.');
  const report = [];
  const warnings = [];
  const counts = backup.counts && typeof backup.counts === 'object' ? backup.counts : {};
  const dbMigs = db.prepare('SELECT id FROM _migrations').all().map((r) => r.id);
  const bkMigs = new Set((Array.isArray(backup.data._migrations) ? backup.data._migrations : []).map((r) => r && r.id));
  const sameSchema = dbMigs.every((m) => bkMigs.has(m));
  // Sicherung kennt Migrationen, die dieser Programmstand nicht hat (Probe mit veraltetem Repo): neuere Spalten gingen still verloren (23.10.2026)
  const newerMigs = [...bkMigs].filter((m) => m && !dbMigs.includes(m));
  if (newerMigs.length) report.push({ table: '_migrations', expected: bkMigs.size, restored: dbMigs.length, ok: false, error: `Sicherung ist neuer als dieser Programmstand (${newerMigs.join(', ')}) – Repo aktualisieren (git pull)` });
  const exactSchema = sameSchema && !newerMigs.length;
  for (const table of opts.required || []) {
    if (!Object.prototype.hasOwnProperty.call(backup.data, table)) report.push({ table, expected: counts[table] ?? null, restored: 0, ok: false, error: 'fehlt in Sicherung' });
  }
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN');
  try {
    for (const [table, rows] of Object.entries(backup.data)) {
      if (!/^[a-z_]+$/.test(table)) throw new Error(`Ungültiger Tabellenname: ${table}`);
      if (!Array.isArray(rows)) { report.push({ table, expected: counts[table] ?? null, restored: 0, ok: false, error: 'keine Zeilenliste' }); continue; }
      const schemaCols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
      const cols = new Set(schemaCols);
      const expected = Number.isInteger(counts[table]) ? counts[table] : rows.length;
      if (!cols.size) { report.push({ table, expected, restored: 0, ok: false, error: 'Tabelle fehlt im Schema' }); continue; }
      // Spaltenabgleich (nur mit Zeilen möglich); Benutzer ohne Geheimnisse, Einstellungen nur mit den gesicherten Feldern
      let colError = null;
      if (rows.length) {
        const seen = new Set(rows.flatMap((r) => (r && typeof r === 'object' ? Object.keys(r) : [])));
        const want = schemaCols.filter((c) => !(table === 'users' && USER_SECRET.test(c)) && !(table === 'settings' && !['key', 'value', 'updated_by', 'updated_at'].includes(c)));
        const missing = want.filter((c) => !seen.has(c));
        const unknown = [...seen].filter((c) => !cols.has(c) && !(EXTRA_OK[table] && EXTRA_OK[table].has(c)));
        if (missing.length) {
          if (sameSchema && table !== '_migrations') colError = `Spalten fehlen: ${missing.join(', ')}`;
          else warnings.push(`${table}: Spalten fehlen (ältere Sicherung, Standardwert): ${missing.join(', ')}`);
        }
        // gleicher Migrationsstand: unbekannte Spalte = Datei bearbeitet oder Programmstand passt nicht → Fehler (23.10.2026; vorher nur Hinweis)
        if (unknown.length) { if (exactSchema && !colError) colError = `unbekannte Spalten (würden verworfen): ${unknown.join(', ')}`; else warnings.push(`${table}: unbekannte Spalten werden verworfen: ${unknown.join(', ')}`); }
      }
      if (table !== '_migrations') db.exec(`DELETE FROM ${table}`); // Grundwerte der Migrationen durch gesicherte Werte ersetzen
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => cols.has(k));
        if (!keys.length) continue;
        db.prepare(`INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map((k) => row[k]));
      }
      const n = Number(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n);
      // _migrations: die aktuelle Datenbank kennt ggf. neuere Migrationen als eine ältere Sicherung – ok, wenn alle gesicherten enthalten sind
      const rowsOk = table === '_migrations' ? n >= rows.length : n === rows.length && rows.length === expected;
      const error = colError || (rows.length !== expected ? `Zeilen laut Export ${expected}, in Datei ${rows.length}` : undefined);
      report.push({ table, expected, restored: n, ok: rowsOk && !colError, ...(error ? { error } : {}) });
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; } finally { db.exec('PRAGMA foreign_keys = ON'); }
  const fk = db.prepare('PRAGMA foreign_key_check').all();
  // gekappte Sicherung (Tabelle über der Zeilengrenze): nie „vollständig“, auch wenn alle enthaltenen Zeilen zurückkamen
  const truncated = Array.isArray(backup.truncated) ? backup.truncated : [];
  return { ok: report.every((r) => r.ok) && fk.length === 0 && !truncated.length, tables: report, foreign_key_errors: fk.length, truncated, warnings, same_schema: sameSchema };
}

// Vollständige Probe (Kommandozeile, 23.10.2026): frische Datenbank nur mit den Migrationen der Sicherung aufbauen, einspielen, dann die
// übrigen Migrationen samt ihren Rückfüllungen nachziehen (z. B. 0075 `driver_vehicles.environment` aus dem Protokoll) – so wie die echte
// Datenbank den Stand erreicht hätte. Vorher: Einspielen in das aktuelle Schema, Rückfüllungen liefen für ältere Sicherungen nie.
export async function probeBackup(backup, opts = {}) {
  const { makeEnv } = await import('../test/harness.mjs');
  const { ensureSchema } = await import('../src/worker.js');
  const { MIGRATIONS } = await import('../src/schema.js');
  const env = makeEnv(); const db = env.DB.db;
  const bk = new Set((backup && backup.data && Array.isArray(backup.data._migrations) ? backup.data._migrations : []).map((r) => r && r.id));
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const now = new Date().toISOString();
  // nur der zusammenhängende Anfang (in Programmreihenfolge), den die Sicherung kennt – danach regulär
  for (const m of MIGRATIONS) {
    if (!bk.has(m.id)) break;
    db.exec('BEGIN'); try { for (const st of m.statements) db.exec(st); db.prepare('INSERT INTO _migrations(id, applied_at) VALUES (?, ?)').run(m.id, now); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  const r = restoreInto(db, backup, opts);
  const before = db.prepare('SELECT COUNT(*) AS n FROM _migrations').get().n;
  await ensureSchema(env);
  const applied = Number(db.prepare('SELECT COUNT(*) AS n FROM _migrations').get().n) - Number(before);
  const fk = db.prepare('PRAGMA foreign_key_check').all().length;
  return { ...r, ok: r.ok && fk === 0, foreign_key_errors: fk, migrations_applied_after: applied, env };
}

// Pflicht-Tabellen einer Sicherung: alle gesicherten Tabellen plus Benutzer/Einstellungen (eigene Abfragen)
export async function requiredTables() {
  const { BACKUP_TABLES } = await import('../src/backup.js');
  return [...BACKUP_TABLES, 'users', 'settings'];
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const file = process.argv[2];
  if (!file) { console.error('Aufruf: node --experimental-sqlite scripts/sicherung-probe.mjs <sicherung.json>'); process.exit(2); }
  const r = await probeBackup(JSON.parse(readFileSync(file, 'utf8')), { required: await requiredTables() });
  for (const t of r.tables) console.log(`${t.ok ? '✔' : '✘'} ${t.table.padEnd(24)} ${String(t.restored).padStart(7)} / ${t.expected}${t.error ? ' – ' + t.error : ''}`);
  for (const w of r.warnings) console.log(`⚠ ${w}`);
  console.log(`Fremdschlüssel-Fehler: ${r.foreign_key_errors}`);
  if (r.migrations_applied_after) console.log(`Nach dem Einspielen nachgezogene Migrationen (ältere Sicherung, inkl. Rückfüllungen): ${r.migrations_applied_after}`);
  if (r.truncated.length) console.log(`Gekappt (Zeilengrenze, älteste Zeilen fehlen): ${r.truncated.join(', ')}`);
  console.log(r.ok ? 'Wiederherstellung vollständig.' : 'Wiederherstellung UNVOLLSTÄNDIG.');
  process.exit(r.ok ? 0 : 1);
}
