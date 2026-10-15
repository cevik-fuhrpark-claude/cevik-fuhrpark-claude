// [CLAUDE] Robustheits-Lauf (lokal, In-Memory-DB, synthetische Daten): schickt Störwerte an die API und meldet jede Antwort ≥ 500.
// Aufruf: node --experimental-sqlite --no-warnings scripts/fuzz-api.mjs   (Fehlercode 1 bei mindestens einem Serverfehler)
// Abgedeckt: alle festen GET-Pfade × Abfrageparameter × Störwerte, Felder schreibender Endpunkte und Vorgangsbefehle, Körper ohne
// JSON-Objekt, CSV-Importe (Vorschau + Übernahme), Datei-Uploads, Integrations-API (Abfragen + Telematik-Lieferungen).
// Anlass: Fuzz-Lauf 15.10.2026 fand „limit=2.5“, Körper „null“, Name „[]“ und Telematik „items: [null]“ → jeweils „Interner Fehler“.
import { readFileSync } from 'node:fs';
import worker from '../src/worker.js';
import { makeEnv, Client } from '../test/harness.mjs';

const env = makeEnv();
const anon = new Client(worker, env, 'anon');
const owner = new Client(worker, env, 'owner');
const noLimit = () => env.DB.db.exec('DELETE FROM rate_limits'); // Ratenbegrenzung würde sonst Antworten mit 429 überdecken
const bad = []; let n = 0; const st = {};
const hit = async (what, p) => { noLimit(); const r = await p; n++; st[r.status] = (st[r.status] || 0) + 1; if (r.status >= 500) bad.push(`${what} → ${r.status} ${JSON.stringify(r.data).slice(0, 100)}`); return r; };

const s = await anon.post('/api/setup', { setup_code: 'test-setup-code-123', username: 'fuzz.inhaber', display_name: 'Fuzz Inhaber' });
await owner.post('/api/invite/accept', { token: s.data.invite_token, password: 'Sicheres-Passwort-2026' });
const VIN = 'WDB96340310777001'; const V = 'VIN:' + VIN; const VE = encodeURIComponent(V);
await owner.post('/api/vehicles', { vin: VIN, plate: 'FZ-1', site: 'Dortmund' });
const ws = (await owner.get('/api/meta')).data.workshops[0].code;
const cid = (await owner.post('/api/cases', { vehicle_id: V, description: 'Fuzz: Bremse quietscht', priority: 'mittel', driveability: 'fahrbereit', request_key: 'fz-1' })).data.id;

// 1) GET: feste Pfade aus dem Router + Fahrzeug-Unterseiten
const w = readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8');
const gets = [...new Set([...w.matchAll(/path === '(\/api\/[a-z0-9/_-]+)' && m === 'GET'/g)].map((x) => x[1]))].filter((p) => !/backup|setup|integration/.test(p));
gets.push(`/api/vehicles/${VE}`, `/api/vehicles/${VE}/timeline`, `/api/vehicles/${VE}/tires`, `/api/vehicles/${VE}/notes`, `/api/cases/${cid}`);
const params = ['limit', 'days', 'weeks', 'stale_days', 'from', 'to', 'until', 'before', 'site', 'vsite', 'status', 'sort', 'q', 'filter', 'kind', 'format', 'types', 'user', 'vehicle', 'vehicle_id', 'inactive', 'archived', 'part', 'asof', 'item', 'repeat_days'];
const vals = ['2.5', '-1', '0', 'x', '', '[]', '2026-13', '2026-02-30', '1e400', 'a'.repeat(300), '%00'];
for (const p of gets) for (const k of params) for (const v of vals) await hit(`GET ${p}?${k}=${v.slice(0, 12)}`, owner.get(`${p}?${k}=${encodeURIComponent(v)}`));

// 2) Felder schreibender Endpunkte und Vorgangsbefehle
const G = [null, true, 123, -1, 2.5, '', '   ', [], {}, ['a'], { a: [] }, 'x'.repeat(5000), '2026-02-30', '0000-00-00', 1e308, 'NaN'];
const posts = {
  '/api/vehicles': [{ vin: 'WDB96340310777009', plate: 'FZ-9', site: 'Dortmund' }, ['vin', 'plate', 'site', 'kind', 'manufacturer', 'model', 'build_year']],
  [`/api/vehicles/${VE}/odometer`]: [{ km: 1000 }, ['km', 'measured_on', 'note']],
  [`/api/vehicles/${VE}/notes`]: [{ text: 'Hinweis' }, ['text', 'for_driver', 'valid_until']],
  [`/api/vehicles/${VE}/contracts`]: [{ kind: 'leasing', partner: 'P', evidence: 'E' }, ['kind', 'partner', 'start_date', 'end_date', 'monthly_rate_net', 'notice_months', 'start_km']],
  '/api/cases': [{ vehicle_id: V, description: 'Fuzz-Beschreibung lang genug', priority: 'mittel', driveability: 'fahrbereit' }, ['vehicle_id', 'description', 'priority', 'driveability', 'check_item', 'safety_lock']],
  '/api/fines': [{ plate_in_letter: 'FZ-1', kind: 'geschwindigkeit' }, ['plate_in_letter', 'kind', 'offense_at', 'amount', 'reply_due']],
  '/api/stock': [{ name: 'Filter', quantity: 1, site: ws }, ['name', 'part_number', 'quantity', 'min_qty', 'unit_price_net', 'location']],
  '/api/emergency/contacts': [{ label: 'Dispo', phone: '0123' }, ['label', 'phone', 'kind', 'site', 'vehicle_id']],
  '/api/inspections': [{ kind: 'abfahrt', vehicle_id: V }, ['kind', 'vehicle_id', 'items', 'km', 'case_id']],
  '/api/users': [{ username: 'fz.u', display_name: 'U', role: 'driver', environment: 'test' }, ['username', 'display_name', 'role', 'environment', 'workshop_site']],
};
let k = 0;
for (const [p, [base, fields]] of Object.entries(posts)) for (const f of fields) for (const g of G) {
  const body = { ...base, [f]: g, ...(p === '/api/cases' ? { request_key: 'fz-k' + (k++) } : {}) };
  await hit(`POST ${p} ${f}=${JSON.stringify(g).slice(0, 12)}`, owner.post(p, body));
}
const u = (await owner.post('/api/users', { username: 'fz.patch', display_name: 'Fuzz Patch', role: 'viewer', environment: 'test' })).data;
const uid = (u.user && u.user.id) || u.id;
const patches = [['PATCH', '/api/me', ['language', 'home_site', 'display_name']], ['PUT', '/api/me/notify-prefs', ['muted', 'quiet']],
  ['PUT', '/api/settings', ['workshop_hourly_rate_net', 'cost_limit_net', 'idle_logout_workshop_min', 'test_master_readonly']],
  ['PATCH', `/api/users/${uid}`, ['display_name', 'role', 'workshop_site', 'environment', 'active']]];
for (const [m, p, fields] of patches) for (const f of fields) for (const g of G) await hit(`${m} ${p} ${f}=${JSON.stringify(g).slice(0, 12)}`, owner.req(m, p, { [f]: g }));
await owner.req('PATCH', '/api/me', { language: 'de' });
const acts = ['comment', 'set_priority', 'set_safety_lock', 'lift_safety_lock', 'set_followup', 'approve_repair', 'reject', 'add_external_cost', 'record_work', 'add_part', 'set_plan_date'];
for (const a of acts) for (const key of ['note', 'priority', 'workshop_site', 'followup_on', 'supplier', 'amount_net', 'hours', 'name', 'quantity', 'planned_date', 'duplicate_of', 'notify', 'warranty_until']) for (const g of G) {
  const ver = (await owner.get(`/api/cases/${cid}`)).data.case.version;
  await hit(`Befehl ${a} ${key}=${JSON.stringify(g).slice(0, 12)}`, owner.post(`/api/cases/${cid}/commands`, { action: a, command_id: `fz-${k++}`, expected_version: ver, note: 'n', payload: { [key]: g } }));
}

// 3) Körper ohne JSON-Objekt
const J = { 'content-type': 'application/json' };
for (const raw of ['', 'null', '[]', '1', '"x"', '{', 'true']) for (const p of [...Object.keys(posts), `/api/cases/${cid}/commands`]) await hit(`POST ${p} Körper ${raw}`, owner.req('POST', p, raw, J));

// 4) CSV-Importe und Uploads
const imps = ['/api/contracts/import', '/api/maintenance/import', '/api/maintenance/recalls/import', '/api/tacho/import', '/api/tires/import', '/api/vehicles/import'];
const csvs = { leer: '', bom: '﻿', kopf: 'Kennzeichen;FIN', binaer: new Uint8Array([0, 255, 254, 1, 0x89, 0x50]), utf16: new Uint8Array([0xff, 0xfe, 0x4b, 0, 0x65, 0]),
  anfuehrung: '"""";"\n";"', offen: 'Kennzeichen;FIN\n"FZ-1;' + VIN, spalten: Array.from({ length: 300 }, (_, i) => 'c' + i).join(';') + '\n' + 'x;'.repeat(300),
  langzeile: 'a;'.repeat(50000), formel: 'Kennzeichen;FIN;Standort\n=HYPERLINK("x");' + VIN + ';@SUM(1)', doppelt: `FIN;FIN;Kennzeichen;Kennzeichen\n${VIN};X;FZ-1;FZ-2` };
for (const p of imps) for (const [name, b] of Object.entries(csvs)) for (const q of ['?dry_run=1', '']) await hit(`Import ${p}${q} ${name}`, owner.req('POST', p + q, b, { 'content-type': 'text/csv' }));
const enc = new TextEncoder();
for (const [name, b] of [['a.pdf', new Uint8Array([])], ['', enc.encode('%PDF-1.4')], ['x'.repeat(5000), enc.encode('%PDF-1.4')], ['a.exe', new Uint8Array([0x4d, 0x5a])]]) {
  for (const p of [`/api/cases/${cid}/files`, `/api/vehicles/${VE}/documents`]) await hit(`Upload ${p} ${name.slice(0, 10)}`, owner.req('POST', p, b, { 'content-type': 'application/octet-stream', 'x-filename': encodeURIComponent(name), 'x-kind': 'sonstiges' }));
}

// 5) Integrations-API
const IH = { authorization: 'Bearer integration-token-xyz' };
const ipaths = [...new Set([...readFileSync(new URL('../src/integration.js', import.meta.url), 'utf8').matchAll(/p === '(\/v1\/[a-z0-9/_-]+)' && m === 'GET'/g)].map((x) => x[1]))];
for (const p of ipaths) for (const kk of ['environment', 'limit', 'include', 'since', 'status', 'site', 'from', 'to']) for (const v of ['2.5', '-1', 'x', '', 'test', '[]', '9'.repeat(30), 'notes,warranties,winter,xyz']) {
  await hit(`API ${p}?${kk}=${v.slice(0, 12)}`, anon.req('GET', `/api/integration${p}?${kk}=${encodeURIComponent(v)}`, undefined, IH));
}
for (const g of G) for (const body of [{ provider: 'webfleet', items: g }, { provider: g, items: [] }, { provider: 'webfleet', items: [g] },
  { provider: 'yellowfox', items: [{ vin: g, km: g, gps_time: g, lat: g, lon: g, external_id: g, plate: g, ignition: g }] }]) {
  await hit(`Telematik ${JSON.stringify(body).slice(0, 40)}`, anon.req('POST', '/api/integration/v1/telematics?environment=test', body, IH));
}

console.log(`${n} Anfragen (${gets.length} GET-Pfade, ${ipaths.length} API-Pfade), ${bad.length} Serverfehler; Status: ${JSON.stringify(st)}`);
// Plausibilität: der Lauf muss angemeldet gewesen sein (sonst prüft er nur die Anmeldepflicht)
if ((st[200] || 0) < n / 3) { console.log('  ✘ zu wenige erfolgreiche Antworten – Anmeldung/Token prüfen'); process.exit(1); }
for (const b of bad.slice(0, 30)) console.log('  ✘ ' + b);
process.exit(bad.length ? 1 : 0);
