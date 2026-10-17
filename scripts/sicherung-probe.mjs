// [CLAUDE] Wiederherstellungs-Probe der JSON-Datensicherung (nur lokal, In-Memory-Datenbank – nie gegen die echte D1).
// Spielt eine Sicherungsdatei in eine frische Datenbank mit aktuellem Schema ein und vergleicht die Zeilenzahl je Tabelle.
// Aufruf: node --experimental-sqlite scripts/sicherung-probe.mjs <sicherung.json>
// Hinweis: Passwort-Hashes, Sitzungen, Token und Dateiinhalte sind bewusst nicht in der Sicherung – nach einer Wiederherstellung
// aus der JSON-Datei müssten alle Benutzer neu eingeladen werden. Für den Betrieb ist D1 Time Travel der Wiederherstellungsweg.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Spielt `backup` in die (bereits migrierte) node:sqlite-Datenbank `db` ein. Ergebnis: Vergleich je Tabelle.
export function restoreInto(db, backup) {
  if (!backup || backup.format !== 'cevik-fuhrpark-backup' || !backup.data) throw new Error('Keine Fuhrpark-Sicherung.');
  const report = [];
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN');
  try {
    for (const [table, rows] of Object.entries(backup.data)) {
      if (!/^[a-z_]+$/.test(table)) throw new Error(`Ungültiger Tabellenname: ${table}`);
      const cols = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
      if (!cols.size) { report.push({ table, expected: rows.length, restored: 0, ok: false, error: 'Tabelle fehlt im Schema' }); continue; }
      if (table !== '_migrations') db.exec(`DELETE FROM ${table}`); // Grundwerte der Migrationen durch gesicherte Werte ersetzen
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => cols.has(k));
        if (!keys.length) continue;
        db.prepare(`INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...keys.map((k) => row[k]));
      }
      const n = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
      // _migrations: die aktuelle Datenbank kennt ggf. neuere Migrationen als eine ältere Sicherung – ok, wenn alle gesicherten enthalten sind
      report.push({ table, expected: rows.length, restored: Number(n), ok: table === '_migrations' ? Number(n) >= rows.length : Number(n) === rows.length });
    }
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; } finally { db.exec('PRAGMA foreign_keys = ON'); }
  const fk = db.prepare('PRAGMA foreign_key_check').all();
  return { ok: report.every((r) => r.ok) && fk.length === 0, tables: report, foreign_key_errors: fk.length };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const file = process.argv[2];
  if (!file) { console.error('Aufruf: node --experimental-sqlite scripts/sicherung-probe.mjs <sicherung.json>'); process.exit(2); }
  const { makeEnv } = await import('../test/harness.mjs');
  const { ensureSchema } = await import('../src/worker.js');
  const env = makeEnv();
  await ensureSchema(env);
  const r = restoreInto(env.DB.db, JSON.parse(readFileSync(file, 'utf8')));
  for (const t of r.tables) console.log(`${t.ok ? '✔' : '✘'} ${t.table.padEnd(24)} ${String(t.restored).padStart(7)} / ${t.expected}${t.error ? ' – ' + t.error : ''}`);
  console.log(`Fremdschlüssel-Fehler: ${r.foreign_key_errors}`);
  console.log(r.ok ? 'Wiederherstellung vollständig.' : 'Wiederherstellung UNVOLLSTÄNDIG.');
  process.exit(r.ok ? 0 : 1);
}
