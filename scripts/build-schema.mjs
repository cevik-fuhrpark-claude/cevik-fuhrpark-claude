// Erzeugt src/schema.js aus migrations/*.sql (Selbstmigration des Workers beim ersten Request)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
