// [CLAUDE] Automatisierte Abnahmetests (Node >= 22, ohne Fremdpakete): node --experimental-sqlite test/run.mjs
import worker from '../src/worker.js';
import { makeEnv, Client, QSTAT } from './harness.mjs';
import { encryptPayload } from '../src/push.js';
import { b64urlEncode, b64urlDecode, concatBytes } from '../src/util.js';

let passed = 0; let failed = 0; const failures = [];
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✔ ${name}`); }
  catch (e) { failed++; failures.push(name); console.log(`  ✘ ${name}\n     ${e && e.stack ? e.stack.split('\n').slice(0, 3).join('\n     ') : e}`); }
}
function eq(a, b, msg = '') { if (a !== b) throw new Error(`${msg} erwartet ${JSON.stringify(b)}, erhalten ${JSON.stringify(a)}`); }
function ok(v, msg = 'Bedingung nicht erfüllt') { if (!v) throw new Error(msg); }
const rk = () => crypto.randomUUID();

const env = makeEnv();
const anon = new Client(worker, env, 'anon');
const owner = new Client(worker, env, 'owner');
const users = {};

async function invite(actor, body) {
  const r = await actor.post('/api/users', body);
  eq(r.status, 201, `Benutzer ${body.username} anlegen:`);
  const c = new Client(worker, env, body.username);
  const a = await c.post('/api/invite/accept', { token: r.data.invite_token, password: 'Sicheres-Passwort-2026' });
  eq(a.status, 200, 'Einladung annehmen:');
  c.id = r.data.id;
  return c;
}

console.log('\n[CLAUDE] Cevik Fuhrpark – Abnahmetests\n');

console.log('Einrichtung & Anmeldung');
await test('Erst-Einrichtung nur mit korrektem Code', async () => {
  eq((await anon.get('/api/setup/status')).data.needs_setup, true);
  eq((await anon.post('/api/setup', { setup_code: 'falsch', username: 'yilmaz', display_name: 'Yilmaz Cevik' })).status, 401);
  const r = await anon.post('/api/setup', { setup_code: 'test-setup-code-123', username: 'yilmaz', display_name: 'Yilmaz Cevik' });
  eq(r.status, 200);
  const weak = await owner.post('/api/invite/accept', { token: r.data.invite_token, password: 'kurz' });
  eq(weak.status, 400, 'Schwaches Passwort:');
  const a = await owner.post('/api/invite/accept', { token: r.data.invite_token, password: 'Sicheres-Passwort-2026' });
  eq(a.status, 200); eq(a.data.user.role, 'owner');
  eq((await anon.post('/api/setup', { setup_code: 'test-setup-code-123', username: 'x2', display_name: 'X' })).status, 410, 'Zweite Einrichtung:');
  eq((await owner.post('/api/invite/accept', { token: r.data.invite_token, password: 'Sicheres-Passwort-2026' })).status, 410, 'Einladung nur einmal:');
});
await test('CSRF-Schutz: schreibende Anfrage ohne Header wird abgewiesen', async () => {
  eq((await owner.req('POST', '/api/logout', {}, { 'x-cfp': '' })).status, 403);
  eq((await owner.req('POST', '/api/agent/run', {}, { origin: 'https://evil.example' })).status, 403);
});
await test('Nicht angemeldet: 401', async () => { eq((await anon.get('/api/cases')).status, 401); });

console.log('Benutzer & Rollen (T02, T03)');
await test('Testkonten Fahrer/Fuhrpark/Werkstatt/Dispo und Betriebskonto anlegen', async () => {
  users.fleet = await invite(owner, { username: 'test.fuhrpark', display_name: 'Test Fuhrparkleitung', role: 'fleet', environment: 'test' });
  users.ws = await invite(owner, { username: 'test.werkstatt', display_name: 'Test Werkstatt DO', role: 'workshop', environment: 'test', workshop_site: 'DORTMUND' });
  users.wsMuc = await invite(owner, { username: 'test.werkstatt.muc', display_name: 'Test Werkstatt MUC', role: 'workshop', environment: 'test', workshop_site: 'MUENCHEN' });
  users.driver = await invite(owner, { username: 'test.fahrer', display_name: 'Test Fahrer 1', role: 'driver', environment: 'test' });
  users.dispatch = await invite(owner, { username: 'test.dispo', display_name: 'Test Dispo', role: 'dispatch', environment: 'test' });
  users.prodFleet = await invite(owner, { username: 'prod.fuhrpark', display_name: 'Betrieb Fuhrpark', role: 'fleet', environment: 'production' });
  // Fuhrparkleitung darf Fahrer anlegen, aber keinen Owner
  users.driver2 = await invite(users.fleet, { username: 'test.fahrer2', display_name: 'Test Fahrer 2', role: 'driver' });
  eq((await users.fleet.post('/api/users', { username: 'boese', display_name: 'B', role: 'owner' })).status, 403);
  eq((await users.driver.post('/api/users', { username: 'boese2', display_name: 'B', role: 'driver' })).status, 403);
});
await test('T03: Testkonto kann nicht in den Betrieb wechseln', async () => {
  const me = await users.driver.get('/api/me', { 'x-cfp-env': 'production' });
  eq(me.data.active_environment, 'test');
  users.fleet.envHeader = 'production';
  eq((await users.fleet.get('/api/me')).data.active_environment, 'test');
  users.fleet.envHeader = null;
});

console.log('Fahrzeugstamm');
let V1, V2;
await test('CSV-Import der Fuhrpark-Stammliste (FIN-Pflicht)', async () => {
  const csv = 'Kennzeichen / LKW;Standort;Status;Hersteller;Baujahr;FIN;Anhänger Kennzeichen\nSZ-YC 5513;Dortmund;in Betrieb;MAN;2016;WMA15SZZ2HM722774;SZ-YC 5514\nSZ-KC 5515;Dortmund;in Betrieb;DAIMLER;2015;WDB9630051L917317;SZ-YC 5516\nSZ-XX 1;München;in Betrieb;MAN;2016;KAPUTT;';
  const r = await owner.req('POST', '/api/vehicles/import', csv, { 'content-type': 'text/csv' });
  eq(r.status, 200); eq(r.data.imported, 2); eq(r.data.skipped.length, 1);
  eq((await users.fleet.req('POST', '/api/vehicles/import', csv, { 'content-type': 'text/csv' })).status, 403);
  V1 = 'VIN:WMA15SZZ2HM722774'; V2 = 'VIN:WDB9630051L917317';
  const list = await users.driver.get('/api/vehicles');
  eq(list.data.vehicles.length, 2); ok(!('vin' in list.data.vehicles[0]), 'Fahrer sieht keine FIN-Details');
  eq((await users.driver.get(`/api/vehicles/${V1}`)).status, 403, 'Fahrer: keine Fahrzeugakte');
});

console.log('Schadensmeldung (T10, T11)');
let C1;
await test('T10: Pflichtangaben fehlen → keine Meldung', async () => {
  eq((await users.driver.post('/api/cases', { vehicle_id: V1, description: '', request_key: rk() })).status, 400);
  eq((await users.driver.post('/api/cases', { vehicle_id: 'VIN:UNBEKANNT', description: 'Licht defekt', request_key: rk() })).status, 400);
});
await test('Fahrer meldet Schaden; Fuhrparkleitung wird benachrichtigt', async () => {
  const key = rk();
  const r = await users.driver.post('/api/cases', { vehicle_id: V1, description: 'Rechte Rückleuchte defekt', priority: 'niedrig', driveability: 'fahrbereit', workshop_site: 'DORTMUND', request_key: key });
  eq(r.status, 201); ok(r.data.case_no.startsWith('T-'), 'Testvorgang mit T-Nummer'); eq(r.data.safety_lock, false);
  C1 = r.data.id;
  // T11: Doppelsendung
  const d = await users.driver.post('/api/cases', { vehicle_id: V1, description: 'Rechte Rückleuchte defekt', priority: 'niedrig', driveability: 'fahrbereit', workshop_site: 'DORTMUND', request_key: key });
  eq(d.data.id, C1); eq(d.data.duplicate, true);
  const c = await users.driver.post('/api/cases', { vehicle_id: V1, description: 'Anderer Inhalt', request_key: key });
  eq(c.status, 409, 'Gleicher Key, anderer Inhalt:');
  const n = await users.fleet.get('/api/notifications');
  ok(n.data.notifications.some((x) => x.case_id === C1 && x.kind === 'created'), 'Fuhrpark erhält Meldung');
  ok(!n.data.notifications.some((x) => x.body.includes('Rückleuchte')), 'Keine Schadensbeschreibung in Push-Text');
});

console.log('Rechte & Trennung (T04)');
await test('T04: fremde Vorgänge und Betrieb sind unsichtbar', async () => {
  eq((await users.driver2.get(`/api/cases/${C1}`)).status, 404, 'Anderer Fahrer:');
  eq((await users.driver2.get('/api/cases')).data.cases.length, 0);
  eq((await users.prodFleet.get(`/api/cases/${C1}`)).status, 404, 'Betrieb sieht Testfall nicht:');
  eq((await users.prodFleet.get('/api/cases')).data.cases.length, 0);
  const pv = await users.ws.get(`/api/cases/${C1}`);
  eq(pv.status, 200); eq(pv.data.access, 'preview', 'Werkstatt: ungeprüfte Voransicht');
  eq(pv.data.allowed_actions.includes('start_repair'), false);
  eq((await users.wsMuc.get(`/api/cases/${C1}`)).status, 404, 'Andere Werkstatt:');
  const det = await users.driver.get(`/api/cases/${C1}`);
  ok(!('costs' in det.data) && !('work' in det.data), 'Fahrer sieht keine Kosten/Arbeiten');
});

console.log('Fuhrparkleitung: Priorität & Freigabe (T05, T12)');
let ver;
await test('T05: Prioritätsänderung nur mit Begründung, Verlauf gespeichert', async () => {
  const d = await users.fleet.get(`/api/cases/${C1}`);
  ver = d.data.case.version;
  eq((await users.fleet.post(`/api/cases/${C1}/commands`, { action: 'change_priority', command_id: rk(), expected_version: ver, payload: { priority: 'mittel' } })).status, 400);
  eq((await users.driver.post(`/api/cases/${C1}/commands`, { action: 'change_priority', command_id: rk(), expected_version: ver, payload: { priority: 'mittel' }, note: 'x' })).status, 403);
  const r = await users.fleet.post(`/api/cases/${C1}/commands`, { action: 'change_priority', command_id: rk(), expected_version: ver, payload: { priority: 'mittel' }, note: 'Rückleuchte = Verkehrssicherheit' });
  eq(r.status, 200); ver = r.data.version;
  const ev = (await users.fleet.get(`/api/cases/${C1}`)).data.events.find((e) => e.action === 'change_priority');
  eq(ev.payload.from, 'niedrig'); eq(ev.payload.to, 'mittel'); ok(ev.actor_name === 'Test Fuhrparkleitung');
  ok((await users.driver.get('/api/notifications')).data.notifications.some((n) => n.kind === 'priority_changed'), 'Fahrer wird informiert');
});
await test('T12: veraltete Version → Konflikt, kein Teil-Schreiben; Befehl idempotent', async () => {
  const cmd = rk();
  const r = await users.fleet.post(`/api/cases/${C1}/commands`, { action: 'comment', command_id: cmd, expected_version: ver - 1, note: 'alt' });
  eq(r.status, 409);
  const ok1 = await users.fleet.post(`/api/cases/${C1}/commands`, { action: 'comment', command_id: cmd, expected_version: ver, note: 'Bitte Foto nachreichen' });
  eq(ok1.status, 200); ver = ok1.data.version;
  const again = await users.fleet.post(`/api/cases/${C1}/commands`, { action: 'comment', command_id: cmd, expected_version: ver - 1, note: 'Bitte Foto nachreichen' });
  eq(again.data.duplicate, true, 'Gleicher Befehl wird nicht doppelt ausgeführt');
  const comments = (await users.fleet.get(`/api/cases/${C1}`)).data.events.filter((e) => e.action === 'comment');
  eq(comments.length, 1);
});
await test('Freigabe an Werkstatt Dortmund → Werkstatt erhält Auftrag', async () => {
  const r = await users.fleet.post(`/api/cases/${C1}/commands`, { action: 'approve_repair', command_id: rk(), expected_version: ver, payload: { workshop_site: 'DORTMUND' }, note: 'Rückleuchte tauschen' });
  eq(r.status, 200); eq(r.data.status, 'werkstatt_freigegeben'); ver = r.data.version;
  const n = await users.ws.get('/api/notifications');
  ok(n.data.notifications.some((x) => x.case_id === C1 && x.kind === 'approved'), 'Werkstatt benachrichtigt');
  ok(!(await users.wsMuc.get('/api/notifications')).data.notifications.some((x) => x.case_id === C1), 'Andere Werkstatt nicht');
});

console.log('Werkstatt: Übernahme, Arbeiten, Teile, Restarbeiten, Kontrolle (T06–T08)');
await test('T06: Werkstatt-Eingang und bestätigte Übernahme', async () => {
  const dash = await users.ws.get('/api/dashboard');
  eq(dash.data.inbox, 1);
  const a = await users.ws.post(`/api/cases/${C1}/commands`, { action: 'acknowledge', command_id: rk(), expected_version: ver, payload: { planned_date: '2026-10-12' } });
  eq(a.status, 200); ver = a.data.version;
  ok((await users.fleet.get('/api/notifications')).data.notifications.some((x) => x.kind === 'acknowledged'), 'Fuhrpark sieht Übernahme');
  const s = await users.ws.post(`/api/cases/${C1}/commands`, { action: 'start_repair', command_id: rk(), expected_version: ver });
  eq(s.data.status, 'in_reparatur'); ver = s.data.version;
});
await test('T07: Stunden und Teile gespeichert; fehlender Preis = unbewertet', async () => {
  let r = await users.ws.post(`/api/cases/${C1}/commands`, { action: 'record_work', command_id: rk(), expected_version: ver, payload: { hours: 0.75, description: 'Rückleuchte getauscht', work_date: '2026-10-10' } });
  eq(r.status, 200); ver = r.data.version;
  r = await users.ws.post(`/api/cases/${C1}/commands`, { action: 'add_part', command_id: rk(), expected_version: ver, payload: { name: 'Rückleuchte LED rechts', quantity: 1 } });
  eq(r.status, 200); ver = r.data.version;
  const d = await users.fleet.get(`/api/cases/${C1}`);
  eq(d.data.work.length, 1); eq(d.data.work[0].hours, 0.75); eq(d.data.parts[0].valuation, 'unvalued');
  eq(d.data.costs.complete, false); eq(d.data.costs.actual_net, 0); eq(d.data.costs.unvalued_items, 2, 'Stunden ohne Satz + Teil ohne Preis');
  ok(!('costs' in (await users.ws.get(`/api/cases/${C1}`)).data), 'Werkstatt sieht keine kaufmännische Gesamtbewertung');
});
await test('T08: sicherheitsrelevante Restarbeit blockiert Abschluss', async () => {
  let r = await users.ws.post(`/api/cases/${C1}/commands`, { action: 'add_open_item', command_id: rk(), expected_version: ver, payload: { description: 'Kabelbaum Rückleuchte scheuert', safety_relevant: true } });
  eq(r.status, 200); ver = r.data.version;
  r = await users.ws.post(`/api/cases/${C1}/commands`, { action: 'request_quality_check', command_id: rk(), expected_version: ver, note: 'Fertig' });
  eq(r.status, 400); eq(r.data.error, 'inspection_missing', 'Erst Kontrolle nach Reparatur');
});
let FOLLOW;
await test('Kontrolle nach Reparatur: unvollständig abgewiesen, Mangel erzeugt Folgeauftrag', async () => {
  const meta = await users.ws.get('/api/meta');
  const keys = meta.data.checklist.map((i) => i.key);
  eq((await users.ws.post('/api/inspections', { kind: 'nach_reparatur', case_id: C1, request_key: rk(), items: keys.slice(0, 3).map((k) => ({ key: k, result: 'ok' })) })).status, 400);
  const items = keys.map((k) => ({ key: k, result: k === 'reifen_zustand' ? 'mangel' : 'ok', note: k === 'reifen_zustand' ? 'Reifen Achse 2 links Flankenschaden' : null }));
  const r = await users.ws.post('/api/inspections', { kind: 'nach_reparatur', case_id: C1, request_key: rk(), items, odometer_km: 812345 });
  eq(r.status, 201); eq(r.data.result, 'maengel'); eq(r.data.followups.length, 1);
  FOLLOW = r.data.followups[0].id;
  const f = await users.fleet.get(`/api/cases/${FOLLOW}`);
  eq(f.data.case.parent_case_id, C1); eq(f.data.case.origin, 'kontrolle');
  const d = await users.fleet.get(`/api/cases/${C1}`);
  eq(d.data.followups.length, 1); eq(d.data.inspections.length, 1);
  const vd = await users.fleet.get(`/api/vehicles/${V1}`);
  eq(vd.data.odometer[0].km, 812345, 'Kilometerstand aus Kontrolle in Fahrzeugakte');
  ver = d.data.case.version;
});
await test('Abschlusskontrolle nach Erledigung der Restarbeit; Freigabe nur durch Fuhrpark mit Bestätigung', async () => {
  const d = await users.ws.get(`/api/cases/${C1}`);
  const oi = d.data.open_items[0];
  let r = await users.ws.post(`/api/cases/${C1}/commands`, { action: 'resolve_open_item', command_id: rk(), expected_version: ver, payload: { open_item_id: oi.id }, note: 'Kabel neu verlegt' });
  eq(r.status, 200); ver = r.data.version;
  r = await users.ws.post(`/api/cases/${C1}/commands`, { action: 'request_quality_check', command_id: rk(), expected_version: ver, note: 'Leuchte + Kabel erneuert' });
  eq(r.status, 200); eq(r.data.status, 'abschlusskontrolle'); ver = r.data.version;
  eq((await users.ws.post(`/api/cases/${C1}/commands`, { action: 'technical_release', command_id: rk(), expected_version: ver, note: 'ok', payload: { confirm: true } })).status, 403, 'Werkstatt gibt nicht frei');
  eq((await users.driver.post(`/api/cases/${C1}/commands`, { action: 'technical_release', command_id: rk(), expected_version: ver, note: 'ok', payload: { confirm: true } })).status, 403);
  eq((await users.fleet.post(`/api/cases/${C1}/commands`, { action: 'technical_release', command_id: rk(), expected_version: ver, note: 'Sichtprüfung ok' })).status, 400, 'Ohne Bestätigung');
  r = await users.fleet.post(`/api/cases/${C1}/commands`, { action: 'technical_release', command_id: rk(), expected_version: ver, note: 'Sichtprüfung + Lichttest ok', payload: { confirm: true } });
  eq(r.status, 200); eq(r.data.status, 'fahrzeug_freigegeben');
  ok((await users.driver.get('/api/notifications')).data.notifications.some((n) => n.kind === 'released'), 'Fahrer erfährt Freigabe');
});

console.log('Kritische Meldung & Sicherheitssperre (T13, T16)');
let CK;
await test('T16: kritische Meldung sperrt Fahrzeug, alarmiert Dispo und Werkstatt, Ablehnung blockiert', async () => {
  const r = await users.driver.post('/api/cases', { vehicle_id: V2, description: 'Bremse zieht stark nach links', priority: 'kritisch', driveability: 'nicht_fahrbereit', workshop_site: 'DORTMUND', request_key: rk() });
  eq(r.status, 201); eq(r.data.safety_lock, true); CK = r.data.id;
  ok((await users.dispatch.get('/api/notifications')).data.notifications.some((n) => n.case_id === CK && n.urgent), 'Dispo alarmiert');
  ok((await users.ws.get('/api/notifications')).data.notifications.some((n) => n.case_id === CK), 'Werkstatt vorab informiert (ungeprüft)');
  const vs = await users.dispatch.get('/api/vehicles');
  eq(vs.data.vehicles.find((v) => v.id === V2).availability, 'gesperrt');
  const d = await users.fleet.get(`/api/cases/${CK}`);
  eq((await users.fleet.post(`/api/cases/${CK}/commands`, { action: 'reject', command_id: rk(), expected_version: d.data.case.version, note: 'kein Mangel' })).status, 400);
  // Herabstufen hebt Sperre nicht auf
  const p = await users.fleet.post(`/api/cases/${CK}/commands`, { action: 'change_priority', command_id: rk(), expected_version: d.data.case.version, payload: { priority: 'mittel' }, note: 'Erstbewertung' });
  eq(p.status, 200);
  eq((await users.fleet.get(`/api/cases/${CK}`)).data.case.safety_lock, 1, 'Sperre bleibt nach Herabstufung');
});

console.log('Dateien (T09)');
await test('T09: Upload nur PNG/JPEG/WEBP/PDF, byteidentisch, Rechte beim Download', async () => {
  const png = concatBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), crypto.getRandomValues(new Uint8Array(500)));
  const up = await users.driver.req('POST', `/api/cases/${CK}/files`, png, { 'content-type': 'image/png', 'x-filename': 'bremse.png' });
  eq(up.status, 201);
  const dup = await users.driver.req('POST', `/api/cases/${CK}/files`, png, { 'content-type': 'image/png', 'x-filename': 'bremse.png' });
  eq(dup.data.duplicate, true);
  eq((await users.driver.req('POST', `/api/cases/${CK}/files`, new TextEncoder().encode('<script>'), { 'x-filename': 'x.html' })).status, 400);
  const big = new Uint8Array(5 * 1024 * 1024 + 10); big.set([0xff, 0xd8, 0xff]);
  eq((await users.driver.req('POST', `/api/cases/${CK}/files`, big, { 'x-filename': 'gross.jpg' })).status, 400);
  const dl = await users.driver.get(`/api/files/${up.data.id}`);
  eq(dl.status, 200); eq(dl.data.length, png.length); ok(dl.data.every((b, i) => b === png[i]), 'Bytegleich');
  eq((await users.driver2.get(`/api/files/${up.data.id}`)).status, 404, 'Fremder Fahrer');
  eq((await users.prodFleet.get(`/api/files/${up.data.id}`)).status, 404, 'Betrieb');
});

console.log('Push (T14, T15)');
await test('T14: Web-Push verschlüsselt (RFC 8291) und vom Dienst angenommen', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  const authSecret = crypto.getRandomValues(new Uint8Array(16));
  const sub = await users.fleet.post('/api/push/subscribe', { endpoint: 'https://push.example/ok/1', keys: { p256dh: b64urlEncode(pub), auth: b64urlEncode(authSecret) }, device_label: 'Handy' });
  eq(sub.status, 200);
  env.pushLog.length = 0;
  const t = await users.fleet.post('/api/push/test');
  eq(t.data.push_status, 'accepted');
  const sent = env.pushLog[0];
  ok(sent.init.headers.authorization.startsWith('vapid t='), 'VAPID-Header');
  // Empfängerseitig entschlüsseln
  const body = new Uint8Array(sent.init.body);
  const salt = body.slice(0, 16); const idlen = body[20]; const asPub = body.slice(21, 21 + idlen); const ct = body.slice(21 + idlen);
  const asKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, kp.privateKey, 256));
  const te = new TextEncoder();
  const hk = async (s, ikm, info, bits) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), bits));
  const ikm = await hk(authSecret, shared, concatBytes(te.encode('WebPush: info\0'), pub, asPub), 256);
  const cek = await hk(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hk(salt, ikm, te.encode('Content-Encoding: nonce\0'), 96);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), ct));
  eq(pt[pt.length - 1], 2, 'Padding-Delimiter');
  const msg = JSON.parse(new TextDecoder().decode(pt.slice(0, -1)));
  eq(msg.title, 'Testbenachrichtigung');
});
await test('T15: abgemeldetes Gerät wird entwertet, Fehler sichtbar statt „zugestellt“', async () => {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const pub = b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey)));
  await users.dispatch.post('/api/push/subscribe', { endpoint: 'https://push.example/gone/1', keys: { p256dh: pub, auth: b64urlEncode(crypto.getRandomValues(new Uint8Array(16))) } });
  const t = await users.dispatch.post('/api/push/test');
  eq(t.data.push_status, 'failed');
  eq((await users.dispatch.get('/api/push/devices')).data.devices.length, 0, 'Gerät entfernt');
  const t2 = await users.driver2.post('/api/push/test');
  eq(t2.data.push_status, 'no_subscription');
});

console.log('Fuhrparkagent → Master → Kontrollpanel (T17, T18)');
let firstHandoffs;
await test('T17: Agent erkennt kritische unbewertete… Fälle und übergibt idempotent an Master', async () => {
  // neuer kritischer Fall ohne Erstbewertung
  await users.driver2.post('/api/cases', { vehicle_id: V1, description: 'Rauch aus Motorraum', priority: 'kritisch', driveability: 'nicht_fahrbereit', request_key: rk() });
  const r1 = await users.fleet.post('/api/agent/run');
  eq(r1.status, 200); ok(r1.data.handoffs >= 1, 'Mindestens eine Übergabe');
  firstHandoffs = r1.data.handoffs;
  const r2 = await users.fleet.post('/api/agent/run');
  eq(r2.data.handoffs, 0, 'Wiederholter Lauf erzeugt keine Dubletten');
  eq((await users.driver.post('/api/agent/run')).status, 403);
});
await test('T18: Kontrollpanel zeigt Fall, Befund und Entscheidungsbedarf; Betrieb getrennt', async () => {
  const p = await users.fleet.get('/api/master');
  eq(p.status, 200); eq(p.data.environment, 'test');
  ok(p.data.findings.some((f) => f.finding_code === 'CRITICAL_UNTRIAGED'), 'Befund kritisch unbewertet');
  ok(p.data.inbox.length >= firstHandoffs, 'Master-Eingang');
  eq(p.data.all_clear, false, 'Keine grüne Gesamtanzeige bei offenen Fällen');
  const item = p.data.inbox[0];
  const dec = await users.fleet.post(`/api/master/${item.event_id}/decision`, { decision_status: 'gesehen', note: 'Rufe Fahrer an' });
  eq(dec.data.ok, true);
  const prod = await users.prodFleet.get('/api/master');
  eq(prod.data.cases.length, 0); eq(prod.data.inbox.length, 0, 'Betrieb ohne Testmeldungen');
  eq((await users.ws.get('/api/master')).status, 403);
});
await test('Erledigter Zustand schließt Befund automatisch', async () => {
  const list = (await users.fleet.get('/api/cases?status=open')).data.cases.filter((c) => c.priority === 'kritisch' && !c.fleet_received_at);
  for (const c of list) {
    await users.fleet.post(`/api/cases/${c.id}/commands`, { action: 'receive', command_id: rk(), expected_version: c.version });
  }
  await users.fleet.post('/api/agent/run');
  const p = await users.fleet.get('/api/master');
  ok(!p.data.findings.some((f) => f.finding_code === 'CRITICAL_UNTRIAGED'), 'Befund geschlossen');
});

console.log('Kosten, Wartung, Integration, Sicherheit');
await test('Stundensatz festlegen → Kosten bewertet; ohne Satz unbewertet', async () => {
  eq((await users.fleet.put('/api/settings', { workshop_hourly_rate_net: 95 })).status, 403);
  eq((await owner.put('/api/settings', { workshop_hourly_rate_net: 95 })).status, 200);
  const d = await users.fleet.get(`/api/cases/${C1}`);
  eq(d.data.costs.actual_net, 71.25); eq(d.data.costs.unvalued_items, 1, 'Teil weiter unbewertet');
});
await test('Wartungsregel mit Nachweis; Fälligkeit erzeugt Befund', async () => {
  eq((await users.fleet.post(`/api/vehicles/${V1}/maintenance`, { kind: 'HU', next_due_date: '2026-10-20' })).status, 400, 'Nachweis Pflicht');
  const r = await users.fleet.post(`/api/vehicles/${V1}/maintenance`, { kind: 'HU', last_done_date: '2025-10-20', interval_months: 12, evidence: 'Prüfbericht TÜV 20.10.2025' });
  eq(r.status, 201); eq(r.data.next_due_date, '2026-10-20');
  await users.fleet.post('/api/agent/run');
  ok((await users.fleet.get('/api/master')).data.findings.some((f) => f.finding_code === 'MAINTENANCE_DUE'), 'HU-Fälligkeit erkannt');
  const rem = (await users.fleet.get('/api/notifications')).data.notifications.filter((n) => n.kind === 'agent_reminder');
  eq(rem.length, 1, 'eine Sammel-Erinnerung'); ok(/1× Prüftermin bald fällig/.test(rem[0].body) && !rem[0].urgent && !/SZ-/.test(rem[0].body), 'ruhig, ohne Details');
  await users.fleet.post('/api/agent/run');
  eq((await users.fleet.get('/api/notifications')).data.notifications.filter((n) => n.kind === 'agent_reminder').length, 1, 'keine Wiederholung bei gleichem Befund');
  ok(!(await users.ws.get('/api/notifications')).data.notifications.some((n) => n.kind === 'agent_reminder'), 'Werkstatt nicht');
});
await test('Prüftermin-Übersicht: Fälligkeiten, Lückenliste HU/SP/UVV/Tacho, Rechte, CSV-Export', async () => {
  const r = await users.fleet.get('/api/maintenance');
  eq(r.status, 200);
  const hu = r.data.rows.find((x) => x.vehicle_id === V1 && x.kind === 'HU');
  ok(hu && hu.next_due_date === '2026-10-20' && hu.plate === 'SZ-YC 5513', 'HU-Termin mit Kennzeichen');
  ok(['faellig', 'ueberfaellig', 'ok'].includes(hu.status) && typeof hu.days === 'number', 'Status und Tage');
  const g1 = r.data.gaps.find((g) => g.vehicle_id === V1); const g2 = r.data.gaps.find((g) => g.vehicle_id === V2);
  eq(g1.missing.join(','), 'SP,UVV,Tachograph', 'V1 ohne SP/UVV/Tacho'); eq(g2.missing.length, 4, 'V2 ohne alle Pflichtprüfungen');
  eq(r.data.totals.vehicles_with_gaps, 2);
  eq((await users.driver.get('/api/maintenance')).status, 403, 'Fahrer');
  eq((await users.ws.get('/api/maintenance')).status, 200, 'Werkstatt liest');
  const csv = await users.fleet.get('/api/maintenance?format=csv');
  eq(csv.status, 200);
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(csv.data);
  ok(text.startsWith('﻿Kennzeichen;'), 'BOM + Kopfzeile');
  ok(text.includes('SZ-KC 5515;VIN:WDB9630051L917317;Dortmund;HU;;;;kein Termin hinterlegt;'), 'Lücke im Export');
  const H = { authorization: 'Bearer integration-token-xyz' };
  const api = await anon.req('GET', '/api/integration/v1/maintenance', undefined, H);
  eq(api.status, 200); eq(api.data.rows.length, r.data.rows.length);
});
await test('Prüftermin-Import: nur mit Nachweis, FIN/eindeutiges Kennzeichen, Vorschau, kein Überschreiben neuerer Termine, idempotent', async () => {
  const csv = [
    'Kennzeichen;FIN;Art;Nächster Termin;Letzte Prüfung;Intervall Monate;Nachweis',
    ';WMA15SZZ2HM722774;HU;2026-09-01;;;Alter Prüfbericht',
    'SZ-KC 5515;;SP;11/2026;;;Prüfplakette Foto 10.10.2026',
    'sz kc 5515;;UVV;;15.01.2026;12;UVV-Prüfbuch S. 4',
    'XX-AB 1;;HU;2027-01-01;;;Beleg',
    ';WMA15SZZ2HM722774;Tacho;2027-05-31;;;',
    ';WMA15SZZ2HM722774;Fahrtenschreiber;31.02.2027;;;Tachobescheinigung',
    ';WMA15SZZ2HM722774;SP;2027-03-31;;;"Prüfbericht; Nr. ""17"""',
    'SZ-YC 5513;;Luftballon;2027-01-01;;;Beleg',
  ].join('\n');
  eq((await users.ws.req('POST', '/api/maintenance/import', csv, { 'content-type': 'text/csv' })).status, 403, 'Werkstatt darf nicht importieren');
  const before = (await users.fleet.get('/api/maintenance')).data.rows.length;
  const dry = await users.fleet.req('POST', '/api/maintenance/import?dry_run=1', csv, { 'content-type': 'text/csv' });
  eq(dry.status, 200); eq(dry.data.dry_run, true); eq(dry.data.created, 3, 'Vorschau: 3 neu');
  eq((await users.fleet.get('/api/maintenance')).data.rows.length, before, 'Vorschau schreibt nichts');
  const reasons = Object.fromEntries(dry.data.skipped.map((x) => [x.line, x.reason]));
  ok(/neuer/.test(reasons[2]), 'älterer Termin überschreibt nicht'); ok(/nicht im Fahrzeugstamm/.test(reasons[5]), 'unbekanntes Kennzeichen');
  ok(/Nachweis/.test(reasons[6]), 'Nachweis Pflicht'); ok(/ungültig/.test(reasons[7]), 'ungültiges Datum'); ok(/Prüfart unbekannt/.test(reasons[9]), 'unbekannte Art');
  const real = await users.fleet.req('POST', '/api/maintenance/import', csv, { 'content-type': 'text/csv' });
  eq(real.data.created, 3);
  const ov = (await users.fleet.get('/api/maintenance')).data;
  const sp2 = ov.rows.find((x) => x.vehicle_id === V2 && x.kind === 'SP');
  eq(sp2.next_due_date, '2026-11-30', 'Plakette: Monatsende'); ok(/Monatsende/.test(sp2.evidence), 'Herleitung im Nachweis');
  eq(ov.rows.find((x) => x.vehicle_id === V2 && x.kind === 'UVV').next_due_date, '2027-01-15', 'Letzte Prüfung + Intervall');
  eq(ov.rows.find((x) => x.vehicle_id === V1 && x.kind === 'SP').evidence, 'Prüfbericht; Nr. "17"', 'CSV mit Anführungszeichen');
  const again = await users.fleet.req('POST', '/api/maintenance/import', csv, { 'content-type': 'text/csv' });
  eq(again.data.created, 0); eq(again.data.unchanged, 3, 'Wiederholung idempotent');
  const upd = await users.fleet.req('POST', '/api/maintenance/import', 'FIN;Art;Fällig am;Nachweis\nWMA15SZZ2HM722774;HU;20.10.2027;Prüfbericht TÜV 09.10.2026', { 'content-type': 'text/csv' });
  eq(upd.data.updated, 1);
  const hu = (await users.fleet.get('/api/maintenance')).data.rows.find((x) => x.vehicle_id === V1 && x.kind === 'HU');
  eq(hu.next_due_date, '2027-10-20'); eq(hu.evidence, 'Prüfbericht TÜV 09.10.2026');
  // Nur letzte Prüfung belegt (Rechnung ohne Fälligkeit): kein erfundener Termin, Lücke bleibt sichtbar
  const H2 = { 'content-type': 'text/csv' };
  const lo = await users.fleet.req('POST', '/api/maintenance/import', 'FIN;Art;Letzte Prüfung;Nachweis\nWDB9630051L917317;Tachograph;28.08.2026;Rechnung Prüfstelle 4711\nWDB9630051L917317;Tachograph;01.03.2026;ältere Rechnung', H2);
  eq(lo.data.created, 1); ok(lo.data.skipped.some((x) => /neuer/.test(x.reason)), 'ältere Zeile derselben Datei verworfen');
  let ov2 = (await users.fleet.get('/api/maintenance')).data;
  const tc = ov2.rows.find((x) => x.vehicle_id === V2 && x.kind === 'Tachograph');
  ok(tc && tc.next_due_date === null && tc.last_done_date === '2026-08-28' && tc.status === 'ohne_termin', 'ohne Termin, letzte Prüfung belegt');
  ok(ov2.gaps.find((g) => g.vehicle_id === V2).missing.includes('Tachograph'), 'weiter in der Lückenliste');
  const old2 = await users.fleet.req('POST', '/api/maintenance/import', 'FIN;Art;Letzte Prüfung;Nachweis\nWDB9630051L917317;Tachograph;01.03.2026;ältere Rechnung', H2);
  ok(/neuer/.test(old2.data.skipped[0].reason), 'ältere letzte Prüfung überschreibt nicht');
  const iv = await users.fleet.req('POST', '/api/maintenance/import', 'FIN;Art;Letzte Prüfung;Intervall Monate;Nachweis\nWDB9630051L917317;Tachograph;28.08.2026;24;Rechnung Prüfstelle 4711, Intervall laut Prüfbescheinigung', H2);
  eq(iv.data.updated, 1);
  ov2 = (await users.fleet.get('/api/maintenance')).data;
  eq(ov2.rows.find((x) => x.vehicle_id === V2 && x.kind === 'Tachograph').next_due_date, '2028-08-28', 'Intervall ergänzt');
  eq((await users.fleet.req('POST', '/api/maintenance/import', 'Kennzeichen;Art;Nächster Termin\nSZ-YC 5513;HU;2027-01-01', { 'content-type': 'text/csv' })).status, 400, 'Spalte Nachweis Pflicht');
});
await test('Anhänger als eigene Prüfobjekte: Import mit Fahrzeugart, Kopplung laut Stammliste, Lückenliste nur HU/SP', async () => {
  const csv = 'Kennzeichen;FIN;Fahrzeugart;Quelle\nSZ-YC 5514;VAK656EBDG1613170;ANH;TÜV NORD Rechnung 5355932559\nSZ-XX 9;VAK656EBDG1613171;Kran;Test';
  eq((await users.fleet.req('POST', '/api/vehicles/import', csv, { 'content-type': 'text/csv' })).status, 403, 'nur Inhaber');
  const r = await owner.req('POST', '/api/vehicles/import', csv, { 'content-type': 'text/csv' });
  eq(r.status, 200); eq(r.data.imported, 1); ok(/Fahrzeugart unbekannt/.test(r.data.skipped[0].reason), 'unbekannte Art abgewiesen');
  const T = 'VIN:VAK656EBDG1613170';
  const list = (await users.fleet.get('/api/vehicles')).data.vehicles;
  const tr = list.find((v) => v.id === T); const tk = list.find((v) => v.id === V1);
  eq(tr.kind, 'anhaenger'); eq(tk.kind, 'lkw'); eq(tk.trailer_id, T, 'Lkw kennt Anhänger'); eq(tr.truck_plate, 'SZ-YC 5513', 'Anhänger kennt Zugfahrzeug');
  ok(/TÜV NORD Rechnung/.test(tr.source), 'Quelle gespeichert');
  const d = (await users.fleet.get(`/api/vehicles/${T}`)).data;
  eq(d.coupled.length, 1); eq(d.coupled[0].id, V1);
  eq((await users.fleet.get(`/api/vehicles/${V1}`)).data.coupled[0].id, T);
  const gap = (await users.fleet.get('/api/maintenance')).data.gaps.find((g) => g.vehicle_id === T);
  eq(gap.missing.join(','), 'HU,SP', 'Anhänger: nur HU/SP gefordert'); eq(gap.vehicle_kind, 'anhaenger');
  // Pflege ohne Fahrzeugart lässt die Art unverändert
  eq((await users.fleet.post('/api/vehicles', { vin: 'VAK656EBDG1613170', plate: 'SZ-YC 5514', site: 'Dortmund' })).status, 201);
  eq((await users.fleet.get('/api/vehicles')).data.vehicles.find((v) => v.id === T).kind, 'anhaenger');
  eq((await users.fleet.post('/api/vehicles', { vin: 'VAK656EBDG1613170', plate: 'SZ-YC 5514', kind: 'Boot' })).status, 400);
  const H = { authorization: 'Bearer integration-token-xyz' };
  eq((await anon.req('GET', '/api/integration/v1/vehicles', undefined, H)).data.vehicles.find((v) => v.id === T).kind, 'anhaenger');
  // Prüftermin für den Anhänger über die FIN der Prüfrechnung
  const imp = await users.fleet.req('POST', '/api/maintenance/import', 'FIN;Art;Letzte Prüfung;Nachweis\nVAK656EBDG1613170;HU;09.09.2026;TÜV NORD Rechnung 5355932559', { 'content-type': 'text/csv' });
  eq(imp.data.created, 1);
  // Außer Betrieb nehmen: Grund Pflicht, verschwindet aus Listen/Prüfterminen, keine neuen Meldungen, reaktivierbar
  eq((await users.driver.post(`/api/vehicles/${T}/active`, { active: false, reason: 'x' })).status, 403);
  eq((await users.fleet.post(`/api/vehicles/${T}/active`, { active: false })).status, 400, 'Grund Pflicht');
  eq((await users.fleet.post(`/api/vehicles/${V1}/active`, { active: false, reason: 'Test' })).status, 409, 'offene Vorgänge');
  eq((await users.fleet.post(`/api/vehicles/${T}/active`, { active: false, reason: 'verkauft' })).status, 200);
  ok(!(await users.fleet.get('/api/vehicles')).data.vehicles.some((v) => v.id === T), 'nicht mehr in der Liste');
  ok((await users.fleet.get('/api/vehicles?inactive=1')).data.vehicles.some((v) => v.id === T), 'in der Liste „außer Betrieb“');
  eq((await users.driver.get('/api/vehicles?inactive=1')).data.vehicles.some((v) => v.id === T), false, 'Fahrer sieht keine stillgelegten');
  ok(!(await users.fleet.get('/api/maintenance')).data.gaps.some((g) => g.vehicle_id === T), 'keine Prüflücke mehr');
  eq((await users.driver.post('/api/cases', { vehicle_id: T, description: 'Plane defekt', request_key: rk() })).status, 400, 'keine Meldung auf stillgelegtes Fahrzeug');
  eq((await users.fleet.post(`/api/vehicles/${T}/active`, { active: true })).status, 200);
  ok((await users.fleet.get('/api/vehicles')).data.vehicles.some((v) => v.id === T), 'reaktiviert');
});
await test('Integration: Telematik nur über FIN/bestätigtes Mapping; Token Pflicht', async () => {
  const H = { authorization: 'Bearer integration-token-xyz' };
  eq((await anon.req('GET', '/api/integration/v1/vehicles', undefined, { authorization: 'Bearer falsch' })).status, 401);
  const r = await anon.req('POST', '/api/integration/v1/telematics', { provider: 'webfleet', items: [
    { external_id: 'WF-1', vin: 'WMA15SZZ2HM722774', gps_time: '2026-10-10T08:00:00Z', lat: 51.5, lon: 7.4, km: 812500 },
    { external_id: 'WF-2', plate: 'SZ-KC 5515', gps_time: '2026-10-10T08:00:00Z', lat: 51.5, lon: 7.4, km: 10 },
  ] }, H);
  eq(r.status, 200); eq(r.data.matched, 1); eq(r.data.unmatched, 1, 'Nur Kennzeichen = Prüffall');
  const old = await anon.req('POST', '/api/integration/v1/telematics', { provider: 'webfleet', items: [{ external_id: 'WF-1', vin: 'WMA15SZZ2HM722774', gps_time: '2026-10-09T08:00:00Z', km: 1 }] }, H);
  eq(old.data.rejected, 1, 'Älterer GPS-Stand überschreibt nicht');
  const cs = await anon.req('GET', '/api/integration/v1/cases?environment=test', undefined, H);
  ok(cs.data.cases.length >= 3);
});
await test('Deaktivierung entwertet Sitzung sofort', async () => {
  const r = await owner.patch(`/api/users/${users.driver2.id}`, { active: false });
  eq(r.status, 200);
  eq((await users.driver2.get('/api/me')).status, 401);
});
await test('Login-Sperre nach wiederholten Fehlversuchen', async () => {
  const c = new Client(worker, env, 'x');
  for (let i = 0; i < 8; i++) await c.post('/api/login', { username: 'test.dispo', password: 'falsch-falsch-1' });
  eq((await c.post('/api/login', { username: 'test.dispo', password: 'Sicheres-Passwort-2026' })).status, 429);
  const ok2 = await new Client(worker, env).post('/api/login', { username: 'test.fahrer', password: 'Sicheres-Passwort-2026' });
  eq(ok2.status, 200);
});
await test('Cron-Läufe (Betrieb */15, Test 7,37) fehlerfrei und innerhalb des Abfragebudgets (≤ 50 je Aufruf)', async () => {
  for (const cron of ['*/15 * * * *', '7,37 * * * *']) {
    const p = [];
    const q0 = QSTAT.n;
    await worker.scheduled({ cron }, env, { waitUntil: (x) => p.push(x) });
    await Promise.all(p);
    ok(QSTAT.n - q0 <= 50, `Abfragen je Cron-Aufruf ${QSTAT.n - q0} > 50 (${cron})`);
  }
  const runs = (await env.DB.prepare('SELECT environment, error FROM agent_runs ORDER BY started_at DESC LIMIT 2').all()).results;
  ok(runs.every((r) => !r.error), 'ohne Fehler');
  eq(new Set(runs.map((r) => r.environment)).size, 2, 'beide Umgebungen');
});

console.log('Reifenmanagement');
await test('Reifengrößen-Import nur über FIN; geprüfte Werte bleiben erhalten', async () => {
  const csv = (await import('node:fs')).readFileSync(new URL('../seed/reifen_quelldaten.csv', import.meta.url), 'utf8');
  eq((await users.fleet.req('POST', '/api/tires/import', csv, { 'content-type': 'text/csv' })).status, 403);
  const r = await owner.req('POST', '/api/tires/import', csv, { 'content-type': 'text/csv' });
  eq(r.status, 200); ok(r.data.imported >= 4, 'Größen für Testfahrzeuge übernommen'); ok(r.data.skipped_no_vehicle.length > 10, 'Unbekannte FIN übersprungen');
  const o = await users.fleet.get(`/api/vehicles/${V1}/tires`);
  const lenk = o.data.specs.find((x) => x.axle === 'lenkachse');
  eq(lenk.size, '315/60 R22.5'); eq(lenk.verified, 0, 'Quellwert ungeprüft');
  eq((await users.ws.post(`/api/vehicles/${V1}/tires/specs`, { axle: 'lenkachse', size: '315/70 R22.5', verified: true })).status, 200);
  await owner.req('POST', '/api/tires/import', csv, { 'content-type': 'text/csv' });
  eq((await users.fleet.get(`/api/vehicles/${V1}/tires`)).data.specs.find((x) => x.axle === 'lenkachse').size, '315/70 R22.5', 'Geprüfter Wert nicht überschrieben');
});
await test('Profilmessung: Fahrer nur für zugeordnete Fahrzeuge; Unterschreitung 1,6 mm wird kritischer Befund', async () => {
  eq((await users.driver.post(`/api/vehicles/${V1}/tires/events`, { event_type: 'messung', position: 'VA-L', tread_mm: 5 })).status, 403);
  eq((await users.fleet.post(`/api/vehicles/${V1}/drivers`, { user_id: users.driver.id, evidence: 'Test-Zuordnung' })).status, 201);
  const m = await users.driver.post(`/api/vehicles/${V1}/tires/events`, { event_type: 'messung', position: 'VA-L', tread_mm: '1,2' });
  eq(m.status, 201); eq(m.data.warnings.length, 1);
  eq((await users.driver.post(`/api/vehicles/${V1}/tires/events`, { event_type: 'wechsel', position: 'VA-L', size: '315/70 R22.5' })).status, 403, 'Fahrer wechselt keine Reifen');
  eq((await users.ws.post(`/api/vehicles/${V1}/tires/events`, { event_type: 'messung', position: 'HA-L-aussen' })).status, 400, 'Messung ohne Wert');
  eq((await users.ws.post(`/api/vehicles/${V1}/tires/events`, { event_type: 'messung', position: 'XX', tread_mm: 5 })).status, 400, 'Unbekannte Position');
  const o = await users.fleet.get(`/api/vehicles/${V1}/tires`);
  eq(o.data.positions.find((p) => p.position === 'VA-L').status, 'unter_minimum');
  await users.fleet.post('/api/agent/run');
  ok((await users.fleet.get('/api/master')).data.findings.some((f) => f.finding_code === 'TIRE_BELOW_MINIMUM'), 'Agent meldet Reifen');
});
await test('Reifenwechsel nur mit Größe; danach ist der alte Messwert nicht mehr maßgeblich', async () => {
  eq((await users.ws.post(`/api/vehicles/${V1}/tires/events`, { event_type: 'wechsel', position: 'VA-L' })).status, 400);
  eq((await users.ws.post(`/api/vehicles/${V1}/tires/events`, { event_type: 'wechsel', position: 'VA-L', size: '315/70 R22.5', brand: 'Testmarke', dot: '2326', odometer_km: 812600 })).status, 201);
  const o = await users.fleet.get(`/api/vehicles/${V1}/tires`);
  const p = o.data.positions.find((x) => x.position === 'VA-L');
  eq(p.last_event, 'wechsel'); eq(p.tread_mm, null, 'Nach Wechsel kein alter Messwert'); eq(p.status, 'unbekannt');
  await users.fleet.post('/api/agent/run');
  ok(!(await users.fleet.get('/api/master')).data.findings.some((f) => f.finding_code === 'TIRE_BELOW_MINIMUM'), 'Befund nach Wechsel erledigt');
  eq((await users.prodFleet.get(`/api/vehicles/${V1}/tires`)).data.history.length, 0, 'Testmessungen nicht im Betrieb');
});

console.log('Ersatzteillager');
let ITEM;
await test('Lagerartikel je Werkstatt; Werkstatt sieht nur eigenes Lager', async () => {
  const r = await users.ws.post('/api/stock', { name: 'Bremsbelagsatz VA', part_number: 'BB-123', min_qty: 2, location: 'Regal A3', unit_price_net: '84,50', initial_qty: 3 });
  eq(r.status, 201); ITEM = r.data.id;
  eq((await users.ws.post('/api/stock', { name: 'Bremsbelagsatz VA', part_number: 'BB-123' })).status, 409, 'Dublette');
  eq((await users.wsMuc.post('/api/stock', { name: 'X', site: 'DORTMUND' })).status, 403, 'Fremdes Lager');
  eq((await users.wsMuc.get(`/api/stock/${ITEM}`)).status, 404);
  eq((await users.driver.get('/api/stock')).status, 403);
  const l = await users.ws.get('/api/stock'); eq(l.data.items.length, 1); eq(l.data.items[0].on_hand, 3);
  eq((await users.prodFleet.get('/api/stock')).data.items.length, 0, 'Testlager nicht im Betrieb');
});
await test('Entnahme aus Vorgang bucht Bestand ab, übernimmt Preis; zu wenig Bestand wird abgewiesen', async () => {
  const c = await users.driver.post('/api/cases', { vehicle_id: V2, description: 'Bremsbeläge verschlissen', priority: 'mittel', driveability: 'eingeschraenkt', workshop_site: 'DORTMUND', request_key: rk() });
  let d = (await users.fleet.get(`/api/cases/${c.data.id}`)).data.case;
  let r = await users.fleet.post(`/api/cases/${d.id}/commands`, { action: 'approve_repair', command_id: rk(), expected_version: d.version, payload: { workshop_site: 'DORTMUND' }, note: 'Beläge tauschen' });
  r = await users.ws.post(`/api/cases/${d.id}/commands`, { action: 'start_repair', command_id: rk(), expected_version: r.data.version });
  const tooMuch = await users.ws.post(`/api/cases/${d.id}/commands`, { action: 'add_part', command_id: rk(), expected_version: r.data.version, payload: { stock_item_id: ITEM, quantity: 5 } });
  eq(tooMuch.status, 400); eq(tooMuch.data.error, 'insufficient_stock');
  const okp = await users.ws.post(`/api/cases/${d.id}/commands`, { action: 'add_part', command_id: rk(), expected_version: r.data.version, payload: { stock_item_id: ITEM, quantity: 2 } });
  eq(okp.status, 200);
  const det = await users.fleet.get(`/api/cases/${d.id}`);
  const part = det.data.parts[0];
  eq(part.name, 'Bremsbelagsatz VA'); eq(part.unit_price_net, 84.5); eq(part.stock_item_id, ITEM);
  const item = await users.ws.get(`/api/stock/${ITEM}`);
  eq(item.data.item.on_hand, 1); ok(item.data.movements.some((m) => m.case_no === det.data.case.case_no), 'Bewegung mit Vorgangsnummer');
});
await test('Mindestbestand unterschritten → Agent-Hinweis; Zugang behebt ihn', async () => {
  await users.fleet.post('/api/agent/run');
  ok((await users.fleet.get('/api/master')).data.findings.some((f) => f.finding_code === 'STOCK_BELOW_MIN'), 'Hinweis vorhanden');
  eq((await users.ws.post(`/api/stock/${ITEM}/movements`, { type: 'korrektur', qty: 1 })).status, 400, 'Korrektur ohne Grund');
  eq((await users.ws.post(`/api/stock/${ITEM}/movements`, { type: 'entnahme', qty: 5 })).status, 400, 'Negativer Bestand');
  const z = await users.ws.post(`/api/stock/${ITEM}/movements`, { type: 'zugang', qty: 4, unit_price_net: 79, supplier: 'Testlieferant', document_ref: 'LS-1' });
  eq(z.status, 201); eq(z.data.on_hand, 5);
  eq((await users.ws.get(`/api/stock/${ITEM}`)).data.item.unit_price_net, 79, 'Letzter Einkaufspreis');
  await users.fleet.post('/api/agent/run');
  ok(!(await users.fleet.get('/api/master')).data.findings.some((f) => f.finding_code === 'STOCK_BELOW_MIN'), 'Hinweis erledigt');
});

console.log('Bußgelder & Zeugenfragebögen');
let FINE;
await test('Erfassung nur durch Fuhrpark; Kennzeichen-Zuordnung; Aktenzeichen-Dublette', async () => {
  const body = { kind: 'anhoerung', authority: 'Stadt Dortmund Bußgeldstelle', reference: 'AZ-4711', offense_type: 'geschwindigkeit', offense_at: new Date().toISOString(), location: 'B1, Dortmund', plate_in_letter: 'SZ YC 5513', amount_eur: 70, response_due: '2026-01-01' };
  eq((await users.driver.post('/api/fines', body)).status, 403);
  const r = await users.fleet.post('/api/fines', body);
  eq(r.status, 201); eq(r.data.vehicle_matched, true); ok(r.data.fine_no.startsWith('TB-'));
  FINE = r.data.id;
  eq((await users.fleet.post('/api/fines', body)).status, 409, 'Dublette');
  const u = await users.fleet.post('/api/fines', { ...body, reference: 'AZ-4712', plate_in_letter: 'DO-XX 1' });
  eq(u.data.vehicle_matched, false);
});
await test('Fahrerermittlung: Kandidat aus Fahrzeugzuordnung, Bestätigung nur mit Nachweis, Fahrer erst nach Information sichtbar', async () => {
  const d = await users.fleet.get(`/api/fines/${FINE}`);
  ok(d.data.candidates.some((c) => c.user_id === users.driver.id && c.basis === 'zuordnung'), 'Zugeordneter Fahrer als Kandidat');
  eq((await users.fleet.post(`/api/fines/${FINE}/commands`, { action: 'confirm_driver', payload: { driver_id: users.driver.id, basis: 'zuordnung' } })).status, 400, 'Ohne Nachweis');
  eq((await users.fleet.post(`/api/fines/${FINE}/commands`, { action: 'confirm_driver', payload: { driver_id: users.driver.id, basis: 'zuordnung', evidence: 'Fahrzeugzuordnung + Tourenplan KW 41' } })).status, 200);
  eq((await users.driver.get(`/api/fines/${FINE}`)).status, 404, 'Noch nicht informiert');
  eq((await users.driver.get('/api/fines')).data.fines.length, 0);
  eq((await users.fleet.post(`/api/fines/${FINE}/commands`, { action: 'inform_driver' })).status, 200);
  const n = await users.driver.get('/api/notifications');
  ok(n.data.notifications.some((x) => x.kind === 'fine' && !x.body.includes('Dortmund')), 'Push ohne Details');
  const dv = await users.driver.get(`/api/fines/${FINE}`);
  eq(dv.status, 200); ok(!('driver_evidence' in dv.data.fine), 'Fahrer sieht keine internen Nachweise');
  eq((await users.driver.post(`/api/fines/${FINE}/commands`, { action: 'driver_ack' })).status, 200);
  eq((await users.ws.get('/api/fines')).status, 403, 'Werkstatt hat keinen Zugriff');
});
await test('Schreiben als PDF anhängen; Fahrer darf es lesen, anderer nicht', async () => {
  const pdf = new TextEncoder().encode('%PDF-1.4 Test');
  const up = await users.fleet.req('POST', `/api/fines/${FINE}/files`, pdf, { 'x-filename': 'anhoerung.pdf' });
  eq(up.status, 201);
  eq((await users.driver.get(`/api/files/${up.data.id}`)).status, 200);
  eq((await users.ws.get(`/api/files/${up.data.id}`)).status, 404);
});
await test('Überschrittene Frist → Agent-Befund; Status erledigt schließt ihn', async () => {
  await users.fleet.post('/api/agent/run');
  ok((await users.fleet.get('/api/master')).data.findings.some((f) => f.finding_code === 'FINE_OVERDUE'), 'Frist überschritten');
  ok((await users.fleet.get('/api/master')).data.findings.some((f) => f.finding_code === 'FINE_VEHICLE_UNKNOWN'), 'Unbekanntes Kennzeichen');
  eq((await users.fleet.post(`/api/fines/${FINE}/commands`, { action: 'set_status', payload: { status: 'beantwortet' } })).status, 400, 'Vermerk Pflicht');
  eq((await users.fleet.post(`/api/fines/${FINE}/commands`, { action: 'set_status', payload: { status: 'beantwortet' }, note: 'Anhörungsbogen mit Fahrerangabe zurückgesandt' })).status, 200);
  await users.fleet.post('/api/agent/run');
  ok(!(await users.fleet.get('/api/master')).data.findings.some((f) => f.finding_code === 'FINE_OVERDUE' && f.subject_key === FINE), 'Befund erledigt');
});

console.log('Kostenbericht');
await test('Kosten je Fahrzeug/Monat stimmen mit der Vorgangsbewertung überein; Rechte; CSV für Excel', async () => {
  const list = (await users.fleet.get('/api/cases')).data.cases;
  let actual = 0; let estimate = 0; let unvalued = 0;
  for (const c of list) { const d = (await users.fleet.get(`/api/cases/${c.id}`)).data; actual += d.costs.actual_net; estimate += d.costs.estimate_net; unvalued += d.costs.unvalued_items; }
  const r = await users.fleet.get('/api/reports/costs?from=2026-01&to=2026-12');
  eq(r.status, 200);
  eq(r.data.totals.actual_net, Math.round(actual * 100) / 100, 'Summe belegt');
  eq(r.data.totals.estimate_net, Math.round(estimate * 100) / 100, 'Summe geschätzt');
  eq(r.data.totals.unvalued_items, unvalued, 'Unbewertete Positionen');
  ok(r.data.rows.length > 0 && r.data.rows.every((x) => x.plate && /^\d{4}-\d{2}$/.test(x.month)), 'Zeilen mit Kennzeichen und Monat');
  eq((await users.driver.get('/api/reports/costs')).status, 403);
  eq((await users.ws.get('/api/reports/costs')).status, 403);
  eq((await users.fleet.get('/api/reports/costs?from=2026-13')).status, 400);
  eq((await users.fleet.get('/api/reports/costs?from=2020-01&to=2026-12')).status, 400, 'max. 36 Monate');
  const csv = await users.fleet.get('/api/reports/costs?from=2026-01&to=2026-12&format=csv');
  eq(csv.status, 200); ok((csv.headers.get('content-type') || '').startsWith('text/csv'));
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(csv.data);
  ok(text.startsWith('﻿Kennzeichen;'), 'BOM + Kopfzeile');
  eq(text.trim().split('\r\n').length, r.data.rows.length + 1);
  const { costReportCsv } = await import('../src/reports.js');
  const inj = costReportCsv({ rows: [{ plate: '=HYPERLINK("x")', vehicle_id: 'VIN:X', site: 'A;B', month: '2026-10', cases_opened: 1, hours: 1.5, work_net: null, parts_actual_net: 10.5, parts_estimate_net: 0, external_actual_net: 0, external_estimate_net: 0, actual_net: 10.5, estimate_net: 0, unvalued_items: 1, complete: false }] });
  ok(inj.includes(`"'=HYPERLINK(""x"")"`), 'Formel neutralisiert'); ok(inj.includes('"A;B"')); ok(inj.includes(';1,5;;10,5;'), 'Dezimalkomma, leere Arbeitszeit ohne Satz');
  const H = { authorization: 'Bearer integration-token-xyz' };
  const api = await anon.req('GET', '/api/integration/v1/costs?environment=test&from=2026-01&to=2026-12', undefined, H);
  eq(api.status, 200); eq(api.data.totals.actual_net, r.data.totals.actual_net);
});

console.log('Datensicherung');
await test('Sicherung nur für Inhaber, ohne Passwörter/Token/Schlüssel, mit allen Fachtabellen', async () => {
  eq((await users.fleet.get('/api/admin/backup')).status, 403);
  const r = await owner.get('/api/admin/backup');
  eq(r.status, 200);
  ok(r.data.counts.vehicles > 0 && r.data.counts.cases > 0 && 'fines' in r.data.data && 'stock_movements' in r.data.data, 'Fachtabellen enthalten');
  const txt = JSON.stringify(r.data);
  ok(!/password_hash|password_salt|token_hash|vapid_private|"p256dh"|"auth":/.test(txt), 'keine Geheimnisse');
  ok(r.data.data.users.every((u) => !('password_hash' in u)), 'keine Hashes');
});

console.log('Oberfläche (statisch)');
await test('CSP-tauglich: keine Inline-Event-Handler/Skripte; alle UI-Texte in DE/UK/EN vorhanden', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  ok(!/\son[a-z]+=["']/i.test(app) && !/\son[a-z]+=["']/i.test(html), 'Inline-Handler verstoßen gegen die CSP (script-src self)');
  ok(!/<script>(?!\s*<\/script>)/.test(html), 'kein Inline-Skript');
  const { STRINGS } = await import('../public/i18n.js');
  const used = new Set([...app.matchAll(/\bt\('([a-z0-9_äöü]+)'\)/gi)].map((m) => m[1]));
  const missing = [...used].filter((k) => !(k in STRINGS.de));
  eq(missing.join(','), '', 'fehlende deutsche Texte');
  for (const lang of ['uk', 'en']) { const miss = Object.keys(STRINGS.de).filter((k) => !(k in STRINGS[lang])); eq(miss.join(','), '', `fehlende Übersetzungen ${lang}`); }
});

console.log('Abfragebudget');
await test('Jeder API-Aufruf der Testsuite bleibt bei ≤ 50 D1-Abfragen (Cloudflare-Grenze je Aufruf, Gratis-Tarif)', async () => {
  // Erster Aufruf spielt einmalig die Schema-Migration ein (live bereits erfolgreich gelaufen) – ausgenommen
  const worst = QSTAT.perRequest.slice(1).sort((a, b) => b.n - a.n).slice(0, 5);
  console.log('     größte Aufrufe: ' + worst.map((w) => `${w.method} ${w.path} = ${w.n}`).join(' · '));
  ok(worst[0].n <= 50, `${worst[0].method} ${worst[0].path} braucht ${worst[0].n} Abfragen`);
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
if (failed) { console.log('Fehlgeschlagen:', failures.join(' | ')); process.exit(1); }
