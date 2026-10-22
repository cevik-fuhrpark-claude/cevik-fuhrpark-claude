// Erzeugt src/schema.js aus migrations/*.sql (Selbstmigration des Workers beim ersten Request)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const dir = new URL('../migrations/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const migrations = files.map((f) => {
  const sql = readFileSync(new URL(f, dir), 'utf8')
    .split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  const statements = sql.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter((s) => s && !/^PRAGMA/i.test(s));
  return { id: f.replace('.sql', ''), statements };
});
// Spalten je Tabelle nach allen Migrationen (für Sammelabfragen, z. B. Datensicherung mit wenigen D1-Abfragen)
const { DatabaseSync } = await import('node:sqlite');
const mem = new DatabaseSync(':memory:');
mem.exec('CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)'); // wie src/worker.js ensureSchema
for (const m of migrations) for (const st of m.statements) mem.exec(st);
const tableColumns = {};
for (const { name } of mem.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all()) {
  tableColumns[name] = mem.prepare(`SELECT name, type FROM pragma_table_info(?)`).all(name).map((c) => ({ name: c.name, type: c.type }));
}
mem.close();
writeFileSync(new URL('../src/schema.js', import.meta.url),
  `// AUTOMATISCH ERZEUGT durch scripts/build-schema.mjs – nicht von Hand bearbeiten\nexport const MIGRATIONS = ${JSON.stringify(migrations, null, 1)};\n` +
  `export const TABLE_COLUMNS = ${JSON.stringify(Object.fromEntries(Object.entries(tableColumns).map(([t, cs]) => [t, cs.map((c) => c.name)])))};\n`);
const blobs = Object.entries(tableColumns).flatMap(([t, cs]) => cs.filter((c) => /BLOB/i.test(c.type)).map((c) => `${t}.${c.name}`));
if (blobs.length) console.log('Hinweis: BLOB-Spalten (nicht JSON-fähig): ' + blobs.join(', '));
console.log(`schema.js: ${migrations.length} Migration(en), ${migrations.reduce((n, m) => n + m.statements.length, 0)} Statements`);

// App-Version = Hash über alle Dateien in public/ (ohne version.json). Die App vergleicht sie im Hintergrund und bietet
// „Neu laden“ an, wenn eine neuere Fassung bereitsteht (lange offene Tablets/Handys bekommen Fehlerbehebungen sonst erst spät).
export function appVersion() {
  const pub = new URL('../public/', import.meta.url);
  const h = createHash('sha256');
  const walk = (rel) => readdirSync(new URL(rel, pub), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach((e) => {
    const p = rel + e.name;
    if (e.isDirectory()) return walk(p + '/');
    if (p === 'version.json' || p === 'build-version.js') return; // beide tragen den Hash selbst
    h.update(p + '\0'); h.update(readFileSync(new URL(p, pub))); h.update('\0');
  });
  walk('');
  return h.digest('hex').slice(0, 12);
}
const version = appVersion();
writeFileSync(new URL('../public/version.json', import.meta.url), JSON.stringify({ version }) + '\n');
// Fassung des laufenden Codes (22.10.2026): vorher merkte sich die App die erste erreichbare version.json – nach einem Start ohne Netz
// und einem Deployment dazwischen also schon die neue Fassung, und der Hinweis „Aktualisierung verfügbar“ kam nie
writeFileSync(new URL('../public/build-version.js', import.meta.url), `// [CLAUDE] automatisch erzeugt (npm run build) – nicht von Hand ändern\nexport const BUILD_VERSION = '${version}';\n`);
console.log(`version.json: ${version}`);
