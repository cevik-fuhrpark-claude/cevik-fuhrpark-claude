// [CLAUDE] Lokale Testumgebung: D1-Nachbildung über node:sqlite, KV im Speicher, Worker direkt aufrufen
import { DatabaseSync } from 'node:sqlite';

// Zähler ausgeführter SQL-Anweisungen (für Abfragebudget je Aufruf im Lasttest)
export const QSTAT = { n: 0, written: 0, perRequest: [], trace: process.env.CFP_QTRACE ? [] : null };
// Antwort-Header jeder API-Antwort der Testsuite (Wächter: Sicherheitsheader, kein öffentliches Caching, Cookie-Attribute)
export const HSTAT = { responses: [] };
// CFP_QPLAN=1: Abfrageplan jeder neuen SQL-Anweisung prüfen und Volltabellen-Suchen am Ende ausgeben (Index-Suche)
export const QPLAN = process.env.CFP_QPLAN ? new Map() : null;
function planCheck(db, sql) {
  if (!QPLAN || QPLAN.has(sql) || !/^\s*(SELECT|WITH|UPDATE|DELETE)/i.test(sql)) return;
  let scans = [];
  try {
    const n = (sql.match(/\?/g) || []).length;
    scans = db.prepare('EXPLAIN QUERY PLAN ' + sql).all(...Array(n).fill(null)).map((r) => r.detail).filter((d) => /^SCAN [a-z_]+(?: AS \w+)?$/i.test(d));
  } catch { /* z. B. benannte Parameter */ }
  QPLAN.set(sql, scans);
}
if (QPLAN) process.on('exit', () => {
  const by = {};
  for (const [sql, sc] of QPLAN) for (const d of sc) (by[d.split(' ')[1]] ||= []).push(sql.replace(/\s+/g, ' ').slice(0, 160));
  console.log('\n[QPLAN] Volltabellen-Suchen je Tabelle:');
  for (const [t, l] of Object.entries(by).sort((a, b) => b[1].length - a[1].length)) { console.log(`  ${t}: ${l.length}`); for (const q of l.slice(0, 6)) console.log('     ' + q); }
});
// Wächter (22.10.2026): korrelierte Unterabfragen, die nur über „environment“ suchen, lesen je Zeile alle Datensätze der Umgebung
// (Index 0070 verdrängte so den Index auf maintenance_event_id: Nachweisliste 19 → 620 ms). Jede neue SELECT-Anweisung der Testsuite
// mit Unterabfrage wird einmal mit ihren echten Parametern geplant; Treffer sammelt CORR.bad (geprüft im Test „Leistung 22.10.“).
export const CORR = { seen: new Set(), bad: new Map(), checked: 0 };
function corrCheck(db, sql, args) {
  if (CORR.seen.has(sql)) return; CORR.seen.add(sql);
  if (!/^\s*(SELECT|WITH)/i.test(sql) || !/\(\s*SELECT\b/i.test(sql)) return;
  let rows; try { rows = db.prepare('EXPLAIN QUERY PLAN ' + sql).all(...args); } catch { return; }
  CORR.checked++;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const corr = (r) => { for (let x = r; x; x = byId.get(x.parent)) if (/^CORRELATED/.test(x.detail)) return true; return false; };
  for (const r of rows) if (/^SEARCH \w+ USING (COVERING )?INDEX \w+ \(environment=\?(?: AND \w+[<>]=?\?)*\)$/.test(r.detail) && corr(r)) CORR.bad.set(sql.replace(/\s+/g, ' ').slice(0, 300), r.detail);
}
class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) {
    // D1 lehnt LIKE-/GLOB-Muster über 50 Byte ab („LIKE or GLOB pattern too complex“) – node:sqlite nicht; hier nachgebildet (19.10.2026)
    // D1-Grenzen (developers.cloudflare.com/d1/platform/limits): höchstens 100 gebundene Parameter und 100 KB SQL je Anweisung (22.10.2026)
    if (args.length > 100) throw new Error(`too many SQL variables (${args.length} > 100, D1-Grenze): SQLITE_ERROR`);
    if (Buffer.byteLength(this.sql) > 100000) throw new Error('SQL statement too long (> 100 KB, D1-Grenze): SQLITE_TOOBIG');
    if (/\b(LIKE|GLOB)\b/i.test(this.sql)) for (const a of args) if (typeof a === 'string' && /[%*]/.test(a) && Buffer.byteLength(a) > 50) throw new Error('LIKE or GLOB pattern too complex: SQLITE_ERROR');
    return new Stmt(this.db, this.sql, args.map((a) => (a === undefined ? null : typeof a === 'boolean' ? (a ? 1 : 0) : a)));
  }
  _prep() { QSTAT.n++; if (QPLAN) planCheck(this.db, this.sql); corrCheck(this.db, this.sql, this.args); if (QSTAT.trace) QSTAT.trace.push(this.sql.replace(/\s+/g, ' ').slice(0, 90)); return this.db.prepare(this.sql); }
  async first(col) {
    const r = this._prep().get(...this.args);
    if (!r) return null;
    const o = { ...r };
    return col ? o[col] : o;
  }
  async all() { return { results: this._prep().all(...this.args).map((r) => ({ ...r })), success: true }; }
  async run() {
    const r = this._prep().run(...this.args);
    QSTAT.written += Number(r.changes);
    return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
  _runSync() {
    const st = this._prep();
    if (/^\s*(SELECT|WITH)/i.test(this.sql) || /RETURNING/i.test(this.sql)) return { results: st.all(...this.args), meta: { changes: 0 } };
    const r = st.run(...this.args);
    QSTAT.written += Number(r.changes);
    return { results: [], meta: { changes: Number(r.changes) } };
  }
}

export class D1Shim {
  constructor() { this.db = new DatabaseSync(':memory:'); this.db.exec('PRAGMA foreign_keys = ON'); }
  prepare(sql) { return new Stmt(this.db, sql); }
  async batch(stmts) {
    this.db.exec('BEGIN');
    try {
      const out = stmts.map((s) => s._runSync());
      this.db.exec('COMMIT');
      return out;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  async exec(sql) { this.db.exec(sql); return { count: 1 }; }
}

export class KVShim {
  constructor() { this.m = new Map(); }
  async put(k, v, opts) { this.m.set(k, { v: v instanceof Uint8Array ? v : new Uint8Array(v), meta: opts?.metadata }); }
  async get(k, opts) { const e = this.m.get(k); if (!e) return null; return opts?.type === 'arrayBuffer' ? e.v.buffer.slice(e.v.byteOffset, e.v.byteOffset + e.v.byteLength) : new TextDecoder().decode(e.v); }
  async delete(k) { this.m.delete(k); }
}

export function makeEnv(extra = {}) {
  const pushLog = [];
  const env = {
    DB: new D1Shim(),
    FILES: new KVShim(),
    SETUP_CODE: 'test-setup-code-123',
    INTEGRATION_TOKEN: 'integration-token-xyz',
    PUSH_CONTACT: 'mailto:test@example.com',
    APP_NAME: 'Test',
    pushLog,
    __pushFetch: async (url, init) => {
      pushLog.push({ url, init });
      if (url.includes('gone')) return new Response('', { status: 410 });
      if (url.includes('fail')) return new Response('boom', { status: 500 });
      return new Response('', { status: 201 });
    },
    ...extra,
  };
  return env;
}

export function makeCtx() {
  const p = [];
  return { waitUntil: (x) => p.push(x), passThroughOnException() {}, flush: () => Promise.all(p.splice(0)) };
}

// Einfacher Client mit Cookie-Jar je Benutzer
export class Client {
  constructor(worker, env, name = 'anon') { this.worker = worker; this.env = env; this.cookie = ''; this.name = name; this.envHeader = null; }
  async req(method, path, body, headers = {}) {
    const h = { 'x-cfp': '1', origin: 'https://app.test', ...headers };
    if (this.cookie) h.cookie = this.cookie;
    if (this.envHeader) h['x-cfp-env'] = this.envHeader;
    let b = body;
    if (body !== undefined && !(body instanceof Uint8Array) && typeof body !== 'string') { b = JSON.stringify(body); h['content-type'] = 'application/json'; }
    const ctx = makeCtx();
    const q0 = QSTAT.n; const t0 = QSTAT.trace ? QSTAT.trace.length : 0;
    const res = await this.worker.fetch(new Request('https://app.test' + path, { method, headers: h, body: b }), this.env, ctx);
    await ctx.flush();
    QSTAT.perRequest.push({ method, path: path.split('?')[0].replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, ':id').replace(/VIN:[A-Z0-9]+/g, ':vin'), n: QSTAT.n - q0, sql: QSTAT.trace ? QSTAT.trace.slice(t0) : undefined });
    HSTAT.responses.push({ method, path: path.split('?')[0], status: res.status, h: Object.fromEntries(res.headers) });
    const sc = res.headers.get('set-cookie');
    if (sc) { const v = sc.split(';')[0]; this.cookie = v.endsWith('=') ? '' : v; }
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('json') ? await res.json() : new Uint8Array(await res.arrayBuffer());
    return { status: res.status, data, headers: res.headers };
  }
  get(p, h) { return this.req('GET', p, undefined, h); }
  post(p, b, h) { return this.req('POST', p, b ?? {}, h); }
  patch(p, b) { return this.req('PATCH', p, b); }
  put(p, b) { return this.req('PUT', p, b); }
}
