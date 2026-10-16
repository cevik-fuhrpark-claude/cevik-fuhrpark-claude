// Lokaler Entwicklungsserver: statische Dateien + Worker-API mit SQLite-Nachbildung (nur zum Testen)
import http from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import worker from '../src/worker.js';
import { makeEnv } from '../test/harness.mjs';
const PORT = Number(process.env.PORT) || 8787; // zweiter Server z. B. PORT=8788 neben laufender Gesamtprüfung
const env = makeEnv({ __pushFetch: async () => new Response('', { status: 201 }) });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const root = new URL('../public/', import.meta.url).pathname;
// public/_headers wie bei Cloudflare anwenden (einfacher Teil: Pfad /* oder exakter Pfad), damit lokale Tests unter der echten CSP laufen
const headerRules = [];
if (existsSync(join(root, '_headers'))) {
  let cur = null;
  for (const line of readFileSync(join(root, '_headers'), 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = { path: line.trim(), h: {} }; headerRules.push(cur); continue; }
    const i = line.indexOf(':'); if (cur && i > 0) cur.h[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
}
const staticHeaders = (path) => Object.assign({}, ...headerRules.filter((r) => r.path === '/*' || r.path === path).map((r) => r.h));
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  // Nur lokal (nicht im Worker): synthetische offene Agentenbefunde für den Browser-Lasttest (scripts/ui-lastpanel.py)
  if (url.pathname === '/__dev/seed-findings' && req.method === 'POST') {
    const n = Math.min(Number(url.searchParams.get('n')) || 0, 20000); const envName = url.searchParams.get('env') || 'production';
    const { FINDING_LABELS } = await import('../public/finding-labels.js'); const codes = Object.keys(FINDING_LABELS.de);
    const sev = ['kritisch', 'handeln', 'hinweis', 'info']; const now = new Date().toISOString();
    const st = env.DB.db.prepare(`INSERT OR IGNORE INTO agent_findings (id, environment, finding_code, subject_key, severity, message, next_action, owner_role, requires_decision, status, fingerprint, first_seen, last_seen)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'fleet', 0, 'offen', ?, ?, ?)`);
    for (let i = 0; i < n; i++) st.run(`last-${envName}-${i}`, envName, codes[i % codes.length], `last|${i}`, sev[i % 4], `Lasttest-Befund ${i + 1}`, 'Prüfen', `fp${i}`, now, now);
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ seeded: n })); return;
  }
  // Nur lokal (nicht im Worker): HTML-Einschleusungs-Probe für den UI-Rauchtest (CFP_XSS=1 python3 scripts/ui-rauchtest.py).
  // Hängt an alle Freitext-Spalten (Beschreibung, Name, Kennzeichen, Standort, Nachweis, Vermerk …) eine HTML-Probe an.
  // IDs, Zeitstempel, Datumswerte, Statuswerte/Aufzählungen, JSON und Schlüssel bleiben unverändert, damit die App funktionsfähig bleibt;
  // Spalten mit CHECK-Bedingung lehnt SQLite ab (wird übersprungen). Antwort: Anzahl veränderter Werte je Tabelle.Spalte.
  if (url.pathname === '/__dev/taint' && req.method === 'POST') {
    const probe = url.searchParams.get('probe') || '"\'><b data-xss=1>X</b>';
    const db = env.DB.db; const out = {};
    const SKIP = /(^id$|_id$|_ids$|_at$|_on$|_until$|_from$|_to$|date|time|^environment$|status|role|^kind$|hash|key$|^key|token|fingerprint|json|payload|args|password|salt|lang|^vin$|code$|valuation|priority|driveability|severity|^result|origin|action|scope|type$|subject|workshop_site|unit$|month|_by$|^source$|tire_order|position|endpoint|^auth$|p256dh|due_source|^ua$|^ip|^username$|_ref$|check_item|^value$|^month$|^day$|^site_key|duplicate_of|followup_on|^mime|^ext$|^size|^dot$|season|^axle|^tread|^owner_role|^decision$|^category$|^recipient)/;
    for (const { name: t } of db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('migrations','schema_migrations','settings','sessions','push_subscriptions','login_attempts','rate_limits','case_counters','fine_counters','cmd_guard','usage_daily','invites')`).all()) {
      for (const c of db.prepare(`PRAGMA table_info("${t}")`).all()) {
        if (!/TEXT/i.test(c.type) || c.pk || SKIP.test(c.name)) continue;
        try {
          const r = db.prepare(`UPDATE "${t}" SET "${c.name}" = "${c.name}" || ? WHERE "${c.name}" IS NOT NULL AND "${c.name}" <> '' AND substr("${c.name}",1,1) NOT IN ('{','[') AND "${c.name}" NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]*'`).run(probe);
          if (r.changes) out[`${t}.${c.name}`] = Number(r.changes);
        } catch { /* CHECK-/UNIQUE-Bedingung: Spalte ist keine Freitext-Spalte */ }
      }
    }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ tainted: out })); return;
  }
  // Nur lokal (nicht im Worker): Vorgang samt Ereignissen um N Stunden zurückdatieren (Dauer-Kennzahlen im Browser prüfen, scripts/ui-kpi-ausfall.py)
  if (url.pathname === '/__dev/backdate' && req.method === 'POST') {
    const id = String(url.searchParams.get('case') || ''); const hrs = Math.min(Math.max(Number(url.searchParams.get('hours')) || 0, 0), 24 * 60);
    const sh = (col) => `${col} = CASE WHEN ${col} IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ${col}, '-${hrs} hours') END`;
    const a = env.DB.db.prepare(`UPDATE cases SET ${['created_at', 'fleet_received_at', 'workshop_ack_at', 'closed_at'].map(sh).join(', ')} WHERE id=?`).run(id).changes;
    const b = env.DB.db.prepare(`UPDATE case_events SET ${sh('created_at')} WHERE case_id=?`).run(id).changes;
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ cases: Number(a), events: Number(b) })); return;
  }
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await worker.fetch(new Request(`http://localhost:${PORT}` + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }), env, { waitUntil() {} });
    const h = {}; r.headers.forEach((v, k) => { h[k] = k === 'set-cookie' ? v.replace('; Secure', '') : v; });
    res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  let p = join(root, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!existsSync(p) || url.pathname === '/_headers') p = join(root, 'index.html');
  res.writeHead(200, { ...staticHeaders(url.pathname), 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(PORT, () => {
  // Prozessnummer je Port ablegen: scripts/restart-dev.sh beendet damit nur den Server auf 8787, nicht einen zweiten (z. B. PORT=8788)
  try { writeFileSync(`/tmp/cfp-dev-${PORT}.pid`, String(process.pid)); } catch { /* nur Komfort */ }
  console.log('dev on ' + PORT);
});
