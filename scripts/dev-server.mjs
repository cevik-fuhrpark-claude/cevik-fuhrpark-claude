// Lokaler Entwicklungsserver: statische Dateien + Worker-API mit SQLite-Nachbildung (nur zum Testen)
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join } from 'node:path';
import worker from '../src/worker.js';
import { makeEnv } from '../test/harness.mjs';
const env = makeEnv({ __pushFetch: async () => new Response('', { status: 201 }) });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const root = new URL('../public/', import.meta.url).pathname;
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:8787');
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await worker.fetch(new Request('http://localhost:8787' + req.url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body }), env, { waitUntil() {} });
    const h = {}; r.headers.forEach((v, k) => { h[k] = k === 'set-cookie' ? v.replace('; Secure', '') : v; });
    res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); return;
  }
  let p = join(root, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!existsSync(p)) p = join(root, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}).listen(8787, () => console.log('dev on 8787'));
