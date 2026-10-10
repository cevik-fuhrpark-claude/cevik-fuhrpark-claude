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
writeFileSync(new URL('../src/schema.js', import.meta.url),
  `// AUTOMATISCH ERZEUGT durch scripts/build-schema.mjs – nicht von Hand bearbeiten\nexport const MIGRATIONS = ${JSON.stringify(migrations, null, 1)};\n`);
console.log(`schema.js: ${migrations.length} Migration(en), ${migrations.reduce((n, m) => n + m.statements.length, 0)} Statements`);

// App-Version = Hash über alle Dateien in public/ (ohne version.json). Die App vergleicht sie im Hintergrund und bietet
// „Neu laden“ an, wenn eine neuere Fassung bereitsteht (lange offene Tablets/Handys bekommen Fehlerbehebungen sonst erst spät).
export function appVersion() {
  const pub = new URL('../public/', import.meta.url);
  const h = createHash('sha256');
  const walk = (rel) => readdirSync(new URL(rel, pub), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).forEach((e) => {
    const p = rel + e.name;
    if (e.isDirectory()) return walk(p + '/');
    if (p === 'version.json') return;
    h.update(p + '\0'); h.update(readFileSync(new URL(p, pub))); h.update('\0');
  });
  walk('');
  return h.digest('hex').slice(0, 12);
}
const version = appVersion();
writeFileSync(new URL('../public/version.json', import.meta.url), JSON.stringify({ version }) + '\n');
console.log(`version.json: ${version}`);
