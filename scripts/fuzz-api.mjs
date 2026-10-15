// [CLAUDE] Robustheits-Lauf (lokal, In-Memory-DB, synthetische Daten): schickt Störwerte an die API und meldet jede Antwort ≥ 500.
// Aufruf: node --experimental-sqlite --no-warnings scripts/fuzz-api.mjs   (Fehlercode 1 bei mindestens einem Serverfehler)
// Abgedeckt: alle festen GET-Pfade × Abfrageparameter × Störwerte, Felder schreibender Endpunkte und Vorgangsbefehle, Körper ohne
// JSON-Objekt, ändernde Endpunkte auf bestehende Datensätze (Abschnitt 6), dasselbe gekürzt für alle anderen Rollen (Abschnitt 7), ungültige Kennungen im Pfad (Abschnitt 8), CSV-Importe (Vorschau + Übernahme), Datei-Uploads, Integrations-API (Abfragen + Telematik-Lieferungen).
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

// 6) Ändernde Endpunkte mit Kennung (PATCH/PUT/POST auf bestehende Datensätze) – Erweiterung 15.10.2026 (21:15-Sitzung)
const id = (r) => r.data && (r.data.id || (r.data.item && r.data.item.id) || (r.data.contract && r.data.contract.id) || (r.data.driver && r.data.driver.id));
const ids = {
  contract: id(await owner.post(`/api/vehicles/${VE}/contracts`, { kind: 'leasing', partner: 'P', evidence: 'E', start_date: '2025-01-01' })),
  rule: id(await owner.post(`/api/vehicles/${VE}/maintenance`, { kind: 'UVV', last_done_date: '2025-11-10', interval_months: 12, evidence: 'Fuzz' })),
  item: id(await owner.post('/api/stock', { name: 'Fuzz-Filter', quantity: 5, site: ws, unit_price_net: 2 })),
  driver: id(await owner.post('/api/drivers', { display_name: 'Fuzz Fahrer' })),
  fine: id(await owner.post('/api/fines', { kind: 'anhoerung', authority: 'Bußgeldstelle', reference: 'AZ-FZ1', offense_type: 'geschwindigkeit', offense_at: '2026-10-01T08:00:00Z', plate_in_letter: 'FZ-1', amount_eur: 70 })),
  contact: id(await owner.post('/api/emergency/contacts', { kind: 'dispo', label: 'Dispo', phone: '0123 456' })),
};
const done = await owner.post(`/api/maintenance/${ids.rule}/complete`, { done_date: '2026-10-01', evidence: 'Fuzz-Bericht', done_km: 2000 });
if (done.status !== 200) { console.log('  ✘ Vorbereitung: Durchführung ' + JSON.stringify(done.data)); process.exit(1); }
ids.event = ((await owner.get(`/api/vehicles/${VE}`)).data.maintenance_history || [])[0]?.id;
for (const [k2, v2] of Object.entries(ids)) if (!v2) { console.log(`  ✘ Vorbereitung: keine Kennung für ${k2}`); process.exit(1); }
const CF = ['kind', 'partner', 'contract_no', 'start_date', 'end_date', 'notice_months', 'km_allowance', 'start_km', 'monthly_rate_net', 'evidence', 'note', 'file_id'];
const muts = [
  ['PATCH', `/api/contracts/${ids.contract}`, {}, CF],
  ['PATCH', `/api/stock/${ids.item}`, {}, ['name', 'part_number', 'min_qty', 'unit_price_net', 'location', 'unit', 'last_supplier', 'active', 'note']],
  ['PUT', `/api/stock/${ids.item}/order`, { qty: 2 }, ['qty', 'ordered_on', 'eta', 'supplier', 'document_ref', 'note']],
  ['POST', `/api/stock/${ids.item}/movements`, { type: 'zugang', qty: 1 }, ['type', 'qty', 'unit_price_net', 'note', 'case_id', 'document_ref', 'supplier']],
  ['POST', `/api/stock/${ids.item}/transfer`, { to_site: 'GIBTSNICHT', qty: 1 }, ['to_site', 'qty', 'note']],
  ['POST', '/api/stock/inventory?dry_run=1', { site: ws, counts: [{ item_id: ids.item, counted: 5 }] }, ['site', 'counts', 'note']],
  ['POST', '/api/stock/inventory', { site: ws, counts: [{ item_id: ids.item, counted: 5 }] }, ['site', 'counts', 'note']],
  ['PATCH', `/api/drivers/${ids.driver}`, {}, ['display_name', 'personnel_no', 'site', 'user_id', 'active', 'note']],
  ['POST', `/api/drivers/${ids.driver}/documents`, { kind: 'fuehrerschein', number: 'X1', valid_until: '2030-01-01', evidence: 'Sichtprüfung' }, ['kind', 'number', 'issued_on', 'valid_until', 'license_classes', 'title', 'evidence', 'note']],
  ['POST', `/api/drivers/${ids.driver}/license-checks`, { checked_on: '2026-01-10', result: 'in_ordnung' }, ['checked_on', 'result', 'note', 'evidence']],
  ['POST', '/api/tacho/downloads', { kind: 'massenspeicher', vehicle_id: V, downloaded_on: '2026-10-01', evidence: 'x' }, ['kind', 'vehicle_id', 'driver_id', 'downloaded_on', 'evidence', 'note']],
  ['PUT', `/api/cases/${cid}/claim`, { insurer: 'A AG', reported_on: '2026-10-01', evidence: 'Meldung' }, ['insurer', 'reported_on', 'claim_no', 'status', 'evidence', 'note', 'amount_net', 'valuation', 'file_id']],
  ['PATCH', `/api/emergency/contacts/${ids.contact}`, {}, ['label', 'phone', 'kind', 'scope', 'site', 'vehicle_id', 'note']],
  ['POST', `/api/maintenance/${ids.rule}/plan`, { planned_date: '2026-12-01' }, ['planned_date', 'workshop_site', 'note']],
  ['POST', `/api/maintenance/${ids.rule}/order`, { workshop_site: ws }, ['workshop_site', 'planned_date', 'note', 'request_key']],
  ['POST', `/api/maintenance/${ids.rule}/complete`, { done_date: '2026-10-02', evidence: 'x', done_km: 2100 }, ['done_date', 'done_km', 'evidence', 'note', 'result', 'next_due_date']],
  ['POST', `/api/maintenance/events/${ids.event}/result`, { result: 'ohne_maengel', evidence: 'x' }, ['result', 'evidence', 'note', 'defects']],
  ['POST', `/api/maintenance/events/${ids.event}/order`, { workshop_site: ws }, ['workshop_site', 'note', 'request_key']],
  ['POST', `/api/vehicles/${VE}/maintenance`, { kind: 'UVV', last_done_date: '2025-01-10', interval_months: 12, evidence: 'E' }, ['kind', 'last_done_date', 'last_done_km', 'interval_months', 'interval_km', 'next_due_date', 'next_due_km', 'evidence', 'note']],
  ['POST', `/api/vehicles/${VE}/tires/events`, { event_type: 'messung', position: 'VA-L', tread_mm: 5 }, ['event_type', 'position', 'positions', 'tread_mm', 'pressure_bar', 'dot', 'brand', 'size', 'winter_mark', 'odometer_km', 'at', 'note', 'case_id']],
  ['POST', `/api/vehicles/${VE}/tires/specs`, { axle: 'lenkachse', size: '315/70 R22.5', verified: true }, ['axle', 'size', 'verified', 'min_tread_mm', 'source', 'note']],
  ['POST', `/api/vehicles/${VE}/tires/winter-order`, { workshop_site: ws, planned_date: '2026-11-02', request_key: 'fz-wo' }, ['workshop_site', 'planned_date', 'request_key', 'note']],
  ['POST', `/api/vehicles/${VE}/spec`, {}, ['zgm_kg', 'zgm_class', 'first_registration', 'spec_source', 'evidence', 'build_year']],
  ['POST', `/api/vehicles/${VE}/evaluation`, { excluded: false }, ['excluded', 'reason']],
  ['POST', `/api/vehicles/${VE}/drivers`, { user_id: uid, evidence: 'x' }, ['user_id', 'evidence', 'end_previous', 'note']],
  ['POST', '/api/telematics/mappings', { provider: 'webfleet', external_id: 'WF-9', vehicle_id: V, evidence: 'Liste' }, ['provider', 'external_id', 'vehicle_id', 'evidence']],
  ['POST', `/api/fines/${ids.fine}/commands`, { action: 'update', payload: {} }, ['action', 'payload', 'expected_version']],
];
for (const [m, p, base, fields] of muts) for (const f of fields) for (const g of G) await hit(`${m} ${p.replace(/[\w-]{20,}/g, ':id')} ${f}=${JSON.stringify(g).slice(0, 12)}`, owner.req(m, p, { ...base, [f]: g }));
// Befehls-Nutzdaten (Bußgeld) und Zeilen der Inventur einzeln stören
for (const a of ['update', 'confirm_driver', 'inform_driver', 'set_status']) for (const key of ['driver_id', 'basis', 'evidence', 'status', 'amount_eur', 'offense_at', 'response_due', 'reference', 'authority', 'location', 'offense_type', 'note']) for (const g of G) {
  await hit(`Bußgeld ${a} ${key}=${JSON.stringify(g).slice(0, 12)}`, owner.post(`/api/fines/${ids.fine}/commands`, { action: a, payload: { [key]: g } }));
}
for (const key of ['item_id', 'counted', 'note']) for (const g of G) for (const q of ['?dry_run=1', '']) await hit(`Inventur ${q} ${key}=${JSON.stringify(g).slice(0, 12)}`, owner.post('/api/stock/inventory' + q, { site: ws, counts: [{ item_id: ids.item, counted: 5, [key]: g }] }));
for (const raw of ['', 'null', '[]', '1', '"x"', '{']) for (const [m, p] of muts.map((x) => [x[0], x[1]])) await hit(`${m} ${p} Körper ${raw}`, owner.req(m, p, raw, J));

// 7) Andere Rollen (Fuhrparkleitung, Werkstatt, Disposition, Fahrer, Nur-Lesen): eigene Codepfade (Lager der eigenen Werkstatt,
//    nur eigene Daten, Rechteprüfung vor Feldprüfung) – gekürzte Stör-Auswahl
const me = (await owner.get('/api/me')).data; const myEnv = (me.user && me.user.environment) || me.environment || 'test';
const roles = {};
for (const [role, extra] of [['fleet', {}], ['workshop', { workshop_site: ws }], ['dispatch', {}], ['driver', {}], ['viewer', {}]]) {
  const r = await owner.post('/api/users', { username: 'fz.' + role, display_name: 'Fuzz ' + role, role, environment: myEnv, ...extra });
  const c = new Client(worker, env, 'fz.' + role);
  const a = await c.post('/api/invite/accept', { token: r.data && r.data.invite_token, password: 'Sicheres-Passwort-2026' });
  if (a.status !== 200) { console.log(`  ✘ Vorbereitung: Rolle ${role} nicht angemeldet (${r.status}/${a.status})`); process.exit(1); }
  roles[role] = c;
}
await owner.post(`/api/vehicles/${VE}/drivers`, { user_id: (await owner.get('/api/users')).data.users.find((x) => x.username === 'fz.driver').id, evidence: 'Fuzz', end_previous: true });
const G2 = [null, 123, [], { a: [] }, '   ', 'x'.repeat(5000), '0000-00-00'];
for (const [role, c] of Object.entries(roles)) {
  for (const p of gets) for (const kk of ['limit', 'site', 'from', 'status', 'vehicle', 'q']) for (const v of ['2.5', '-1', '[]', '2026-13']) await hit(`${role} GET ${p}?${kk}=${v}`, c.get(`${p}?${kk}=${encodeURIComponent(v)}`));
  for (const [m, p, base, fields] of muts) for (const f of fields) for (const g of G2) await hit(`${role} ${m} ${p.replace(/[\w-]{20,}/g, ':id')} ${f}=${JSON.stringify(g).slice(0, 12)}`, c.req(m, p, { ...base, [f]: g }));
  for (const [p, [base, fields]] of Object.entries(posts)) for (const f of fields) for (const g of G2) {
    const body = { ...base, [f]: g, ...(p === '/api/cases' ? { request_key: 'fz-r' + (k++) } : {}) };
    await hit(`${role} POST ${p} ${f}=${JSON.stringify(g).slice(0, 12)}`, c.post(p, body));
  }
  for (const a of acts) for (const key of ['note', 'priority', 'workshop_site', 'hours', 'quantity', 'planned_date']) for (const g of G2) {
    const cs = await c.get(`/api/cases/${cid}`); const ver = cs.data && cs.data.case ? cs.data.case.version : 1;
    await hit(`${role} Befehl ${a} ${key}=${JSON.stringify(g).slice(0, 12)}`, c.post(`/api/cases/${cid}/commands`, { action: a, command_id: `fz-${k++}`, expected_version: ver, note: 'n', payload: { [key]: g } }));
  }
}

// 8) Ungültige Kennungen im Pfad (unbekannt, sehr lang, Sonderzeichen, Prozent-Kodierung, andere Datensatzart)
const known = [cid, VE, ...Object.values(ids)].filter(Boolean);
const oddIds = ['gibt-es-nicht', 'x'.repeat(600), '%FF', '%00', '..', 'VIN%3A', 'VIN%3A' + 'A'.repeat(300), '0', '-1', ids.item, cid];
const swap = (p, o) => known.reduce((acc, kn) => acc.split(kn).join(o), p);
const idPaths = [...new Set([...gets.filter((p) => known.some((kn) => p.includes(kn))).map((p) => ['GET', p, undefined]),
  ...muts.filter(([, p]) => known.some((kn) => p.includes(kn))).map(([m, p, base]) => [m, p, base]),
  ...Object.entries(posts).filter(([p]) => p.includes(VE)).map(([p, [base]]) => ['POST', p, base]),
  ...['spec', 'evaluation', 'active', 'ai', 'drivers', 'documents', 'tires/winter-order'].map((x) => ['POST', `/api/vehicles/${VE}/${x}`, {}]),
  ['GET', `/api/stock/${ids.item}`], ['GET', `/api/drivers/${ids.driver}`], ['GET', `/api/fines/${ids.fine}`], ['GET', `/api/cases/${cid}/files`],
  ['POST', `/api/contracts/${ids.contract}/end`, { end_note: 'x' }], ['POST', `/api/emergency/contacts/${ids.contact}/archive`], ['DELETE', `/api/stock/${ids.item}/order`]].map((x) => JSON.stringify(x)))].map((x) => JSON.parse(x));
for (const [m, p, base] of idPaths) for (const o of oddIds) {
  const q = swap(p, o); if (q === p && o !== ids.item && o !== cid) continue;
  await hit(`Kennung ${m} ${q.slice(0, 70)}`, owner.req(m, q, m === 'GET' || m === 'DELETE' ? undefined : (base || {})));
}

console.log(`${n} Anfragen (${gets.length} GET-Pfade, ${ipaths.length} API-Pfade), ${bad.length} Serverfehler; Status: ${JSON.stringify(st)}`);
// Plausibilität: der Lauf muss angemeldet gewesen sein (sonst prüft er nur die Anmeldepflicht)
if ((st[200] || 0) < n / 3) { console.log('  ✘ zu wenige erfolgreiche Antworten – Anmeldung/Token prüfen'); process.exit(1); }
for (const b of bad.slice(0, 30)) console.log('  ✘ ' + b);
process.exit(bad.length ? 1 : 0);
