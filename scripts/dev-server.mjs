// Lokaler Entwicklungsserver: statische Dateien + Worker-API mit SQLite-Nachbildung (nur zum Testen)
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
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
}).listen(PORT, () => console.log('dev on ' + PORT));
