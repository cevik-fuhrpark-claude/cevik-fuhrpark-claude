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
  // naheliegende Passwörter: Name, Firmenname, Allerweltswörter, Tastaturfolgen, Wiederholungen (ohne externe Abfrage)
  for (const pw of ['Passwort123', 'Yilmaz-Cevik-2026', 'Cevik-Mobility-1', 'Fuhrpark2026!', 'qwertz12345', 'aaaaaaaa11', 'Ab1234567890', 'Sommer2026!!']) {
    const x = await owner.post('/api/invite/accept', { token: r.data.invite_token, password: pw });
    eq(x.status, 400, pw); eq(x.data.error, 'common_password', pw);
  }
  const { validatePassword } = await import('../src/auth.js');
  for (const pw of ['Grüne-Tanne-48', 'Kx9#pQ2mZ7', 'Зелена-ялина-48', 'Mein-Fuhrpark-ist-toll-7']) validatePassword(pw, ['yilmaz', 'Yilmaz Cevik']);
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
await test('Agent schreibt unveränderte Befunde nicht neu (D1-Schreibkontingent), Meldung mit Zeitpunkt statt Minuten', async () => {
  await users.fleet.post('/api/agent/run');
  const before = (await users.fleet.get('/api/master')).data.findings;
  const w0 = QSTAT.written;
  const r = await users.fleet.post('/api/agent/run');
  eq(r.data.handoffs, 0);
  ok(QSTAT.written - w0 <= 4, `nur Laufprotokoll geschrieben (${QSTAT.written - w0} Zeilen)`);
  const after = (await users.fleet.get('/api/master')).data.findings;
  eq(after.length, before.length, 'gleiche Befunde');
  ok(after.every((f) => !/\d+ Min\.\)?\s*(nicht|$)|seit \d+ Min\./.test(f.message)), 'keine laufende Minutenzahl im Text');
  const crit = after.find((f) => f.finding_code === 'CRITICAL_UNTRIAGED');
  ok(/seit \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/.test(crit.message), 'Zeitpunkt in Berliner Zeit: ' + crit.message);
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
  for (const V of [V1, V2]) eq((await users.fleet.post(`/api/vehicles/${V}/spec`, { zgm_class: 'ueber_12', spec_source: 'Test: Fahrzeugschein F.2' })).status, 200);
  const r = await users.fleet.post(`/api/vehicles/${V1}/maintenance`, { kind: 'HU', last_done_date: '2025-10-20', interval_months: 12, evidence: 'Prüfbericht TÜV 20.10.2025' });
  eq(r.status, 201); eq(r.data.next_due_date, '2026-10-31', 'HU: 12 Kalendermonate, Fristende Monatsende');
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
  ok(hu && hu.next_due_date === '2026-10-31' && hu.plate === 'SZ-YC 5513', 'HU-Termin mit Kennzeichen');
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
  const ics = await users.fleet.get('/api/maintenance?format=ics');
  eq(ics.status, 200); ok((ics.headers.get('content-type') || '').startsWith('text/calendar'));
  const cal = new TextDecoder().decode(ics.data);
  ok(cal.startsWith('BEGIN:VCALENDAR\r\n') && cal.includes('DTSTART;VALUE=DATE:20261031') && cal.includes('SUMMARY:HU fällig – SZ-YC 5513') && cal.includes('TRIGGER:-P30D'), 'Kalender mit HU-Termin und Erinnerung');
  ok(cal.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75), 'Zeilen auf 75 Oktette gefaltet');
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
await test('Dokumentablage je Fahrzeug: Rechte, Dateityp, Dubletten, Download, Umgebungen getrennt', async () => {
  const pdf = new TextEncoder().encode('%PDF-1.4\n% Testdokument Zulassung\n%%EOF');
  const H = { 'content-type': 'application/pdf', 'x-filename': encodeURIComponent('Zulassung Teil I.pdf') };
  eq((await users.driver.req('POST', `/api/vehicles/${V1}/documents?kind=zulassung`, pdf, H)).status, 403, 'Fahrer');
  eq((await users.fleet.req('POST', `/api/vehicles/${V1}/documents?kind=zulassung`, new TextEncoder().encode('<html>'), H)).status, 400, 'Typprüfung');
  eq((await users.fleet.req('POST', `/api/vehicles/${V1}/documents?kind=ausweis`, pdf, H)).status, 400, 'unbekannte Art');
  const r = await users.fleet.req('POST', `/api/vehicles/${V1}/documents?kind=zulassung&note=${encodeURIComponent('Teil I, Kopie')}`, pdf, H);
  eq(r.status, 201); eq(r.data.duplicate, false);
  eq((await users.ws.req('POST', `/api/vehicles/${V1}/documents?kind=zulassung`, pdf, H)).data.duplicate, true, 'Dublette');
  const d = (await users.dispatch.get(`/api/vehicles/${V1}`)).data;
  eq(d.documents.length, 1); eq(d.documents[0].doc_kind, 'zulassung'); eq(d.documents[0].doc_note, 'Teil I, Kopie'); eq(d.documents[0].filename, 'Zulassung Teil I.pdf');
  const dl = await users.ws.get(`/api/files/${r.data.id}`);
  eq(dl.status, 200); eq(new TextDecoder().decode(dl.data).slice(0, 8), '%PDF-1.4');
  eq((await users.driver.get(`/api/files/${r.data.id}`)).status, 403, 'Fahrer lädt nicht herunter');
  eq((await users.prodFleet.get(`/api/vehicles/${V1}`)).data.documents.length, 0, 'Betrieb sieht Testdokument nicht');
  eq((await users.prodFleet.get(`/api/files/${r.data.id}`)).status, 404);
  // Gültig-bis-Datum: nur angegebene Daten; abgelaufen → Befund; neueres Dokument derselben Art erledigt ihn
  const pdf2 = new TextEncoder().encode('%PDF-1.4\n% Versicherung alt\n%%EOF');
  eq((await users.fleet.req('POST', `/api/vehicles/${V1}/documents?kind=versicherung&valid_until=31.12.2026`, pdf2, H)).status, 400, 'Datumsformat');
  eq((await users.fleet.req('POST', `/api/vehicles/${V1}/documents?kind=versicherung&valid_until=2026-01-31&note=${encodeURIComponent('100% Deckung')}`, pdf2, H)).status, 201);
  eq((await users.fleet.get(`/api/vehicles/${V1}`)).data.documents.find((x) => x.doc_kind === 'versicherung').doc_note, '100% Deckung', 'Bemerkung mit %');
  await users.fleet.post('/api/agent/run');
  ok((await users.fleet.get('/api/master')).data.findings.some((f) => f.finding_code === 'DOCUMENT_EXPIRED'), 'abgelaufen erkannt');
  ok((await users.fleet.get('/api/notifications')).data.notifications.some((n) => n.kind === 'agent_reminder' && /Dokument abgelaufen/.test(n.body)), 'Erinnerung');
  const pdf3 = new TextEncoder().encode('%PDF-1.4\n% Versicherung neu\n%%EOF');
  eq((await users.fleet.req('POST', `/api/vehicles/${V1}/documents?kind=versicherung&valid_until=2099-01-31`, pdf3, H)).status, 201);
  await users.fleet.post('/api/agent/run');
  ok(!(await users.fleet.get('/api/master')).data.findings.some((f) => f.finding_code.startsWith('DOCUMENT_')), 'durch neueres Dokument erledigt');
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
  const av = await anon.req('GET', '/api/integration/v1/availability?environment=test', undefined, H);
  eq(av.status, 200); ok(av.data.vehicles.length > 0 && av.data.vehicles.every((v) => ['gesperrt', 'werkstatt', 'meldung_offen', 'einsatzbereit_lt_system'].includes(v.availability)), 'Verfügbarkeit je Fahrzeug');
  ok(av.data.vehicles.every((v) => 'last_departure_check_at' in v && 'last_departure_check_result' in v && !('performed_by' in v)), 'letzte Abfahrtskontrolle ohne Namen');
  // 500 Einträge in einem Aufruf: Abfragebudget unabhängig von der Menge
  const many = Array.from({ length: 500 }, (_, i) => ({ external_id: `BULK-${i}`, vin: i % 2 ? 'WMA15SZZ2HM722774' : null, plate: `XX-BULK ${i}`, gps_time: new Date(Date.parse('2026-10-10T09:00:00Z') + i * 1000).toISOString(), km: 812600 + i, lat: 51, lon: 7 }));
  const q0 = QSTAT.n;
  const bulk = await anon.req('POST', '/api/integration/v1/telematics', { provider: 'webfleet', items: many }, H);
  eq(bulk.status, 200); eq(bulk.data.matched, 250); eq(bulk.data.unmatched, 250);
  ok(QSTAT.n - q0 <= 20, `≤ 20 Abfragen für 500 Einträge (${QSTAT.n - q0})`);
  eq(bulk.data.odometer_written, 1, 'je Fahrzeug und Tag ein km-Stand (der jüngste)');
  eq((await anon.req('POST', '/api/integration/v1/telematics', { provider: 'webfleet', items: many.slice(1, 2) }, H)).data.odometer_written, 0, 'gleicher Stand nicht doppelt');
  const telRows = async () => (await owner.get(`/api/vehicles/VIN:WMA15SZZ2HM722774`)).data.odometer.filter((o) => o.source === 'telematik:webfleet');
  const day = (await telRows()).filter((o) => o.measured_at.startsWith('2026-10-10'));
  eq(day.length, 1); eq(day[0].km, 812600 + 499, 'jüngster Wert des Tages');
  // jüngere GPS-Zeit, aber kleinerer km-Stand (Gerätefehler/Tausch): nicht übernommen
  const lower = await anon.req('POST', '/api/integration/v1/telematics', { provider: 'webfleet', items: [{ external_id: 'BULK-1', vin: 'WMA15SZZ2HM722774', gps_time: '2026-10-10T12:00:00Z', km: 100 }] }, H);
  eq(lower.data.matched, 1); eq(lower.data.odometer_written, 0, 'kleinerer km-Stand nicht in die Akte');
  // Tagesgrenze und Vortag (zweites Fahrzeug, zurückliegende Tage)
  eq((await owner.post('/api/vehicles', { plate: 'TT-TEL 1', vin: 'WDB96340310777777', site: 'Dortmund' })).status < 300, true, 'Testfahrzeug Telematik');
  const tel = (gps, km) => anon.req('POST', '/api/integration/v1/telematics', { provider: 'webfleet', items: [{ external_id: 'WF-TT', vin: 'WDB96340310777777', gps_time: gps, km }] }, H);
  eq((await tel('2026-10-07T10:00:00Z', 500000)).data.odometer_written, 1);
  eq((await tel('2026-10-08T06:00:00Z', 400)).data.odometer_written, 0, 'am Folgetag nicht kleiner als der Vortag');
  eq((await tel('2026-10-08T07:00:00Z', 500100)).data.odometer_written, 1, 'Folgetag mit größerem Wert');
  eq((await owner.get('/api/vehicles/VIN:WDB96340310777777')).data.odometer.filter((o) => o.source === 'telematik:webfleet' && o.measured_at < '2026-10-09').length, 2, 'zwei Tage → zwei Zeilen');
  // GPS-Zeit in der Zukunft (Uhrfehler am Gerät) wird verworfen
  const fut = await tel(new Date(Date.now() + 3600000).toISOString(), 500200);
  eq(fut.data.rejected, 1, 'Zukunftszeit verworfen'); eq(fut.data.odometer_written, 0);
  // Token-Wechsel und Nur-Lese-Token
  env.INTEGRATION_TOKEN_NEXT = 'integration-token-next-123'; env.INTEGRATION_TOKEN_READ = 'integration-token-read-456';
  try {
    eq((await anon.req('GET', '/api/integration/v1/vehicles', undefined, { authorization: 'Bearer integration-token-next-123' })).status, 200, 'neues Token gilt parallel');
    const R = { authorization: 'Bearer integration-token-read-456' };
    eq((await anon.req('GET', '/api/integration/v1/findings', undefined, R)).status, 200, 'Lesen erlaubt');
    eq((await anon.req('POST', '/api/integration/v1/telematics', { provider: 'webfleet', items: [] }, R)).status, 403, 'Schreiben verboten');
  } finally { delete env.INTEGRATION_TOKEN_NEXT; delete env.INTEGRATION_TOKEN_READ; }
});
await test('Telematik-Prüffälle: Zuordnung nur durch Fuhrpark mit Nachweis; danach werden Daten zugeordnet', async () => {
  const H = { authorization: 'Bearer integration-token-xyz' };
  eq((await users.ws.get('/api/telematics')).status, 403);
  const ov = await users.fleet.get('/api/telematics');
  eq(ov.status, 200);
  const wf2 = ov.data.unmatched.find((u) => u.external_id === 'WF-2');
  ok(wf2 && wf2.source_plate === 'SZ-KC 5515', 'Prüffall mit Kennzeichen aus dem Gerät');
  eq((await users.fleet.post('/api/telematics/mappings', { provider: 'webfleet', external_id: 'WF-2', vehicle_id: V2 })).status, 400, 'Nachweis Pflicht');
  eq((await users.fleet.post('/api/telematics/mappings', { provider: 'webfleet', external_id: 'WF-2', vehicle_id: V2, evidence: 'Webfleet-Objektliste, Abgleich FIN' })).status, 201);
  eq((await users.fleet.post('/api/telematics/mappings', { provider: 'webfleet', external_id: 'WF-2', vehicle_id: V1, evidence: 'x' })).status, 409, 'keine Doppelzuordnung');
  const r = await anon.req('POST', '/api/integration/v1/telematics', { provider: 'webfleet', items: [{ external_id: 'WF-2', gps_time: '2026-10-10T10:00:00Z', lat: 51.5, lon: 7.4 }] }, H);
  eq(r.data.matched, 1, 'jetzt über bestätigtes Mapping zugeordnet');
  const vt = (await users.fleet.get(`/api/vehicles/${V2}`)).data.telematics;
  ok(vt.length === 1 && vt[0].match_basis === 'confirmed_mapping' && vt[0].lat === 51.5, 'Fahrzeugakte zeigt Stand');
  eq((await users.ws.get(`/api/vehicles/${V2}`)).data.telematics.length, 0, 'Werkstatt sieht keine Position');
  const ov2 = (await users.fleet.get('/api/telematics')).data;
  ok(!ov2.unmatched.some((u) => u.external_id === 'WF-2') && ov2.mappings.some((m) => m.external_id === 'WF-2' && m.confirmed_by_name), 'Prüffall erledigt, Mapping mit Person');
  eq((await users.fleet.req('DELETE', '/api/telematics/mappings?provider=webfleet&external_id=WF-2')).status, 200);
  ok((await owner.get('/api/admin/audit?action=telematics.')).data.entries.length >= 2, 'protokolliert');
});
await test('Deaktivierung entwertet Sitzung sofort', async () => {
  const r = await owner.patch(`/api/users/${users.driver2.id}`, { active: false });
  eq(r.status, 200);
  eq((await users.driver2.get('/api/me')).status, 401);
});
await test('Fehlanmeldungen je Netzadresse begrenzt (viele Benutzernamen), andere Adressen unberührt; Aufräumen kurzlebiger Tabellen', async () => {
  const auth = await import('../src/auth.js');
  const saved = auth.IP_FAIL_LIMIT.max; auth.IP_FAIL_LIMIT.max = 3;
  try {
    const H = { 'cf-connecting-ip': '203.0.113.7' };
    const c = new Client(worker, env);
    for (const u of ['gibts.nicht1', 'gibts.nicht2', 'gibts.nicht3']) eq((await c.post('/api/login', { username: u, password: 'falsch-falsch-1' }, H)).status, 401);
    const blocked = await c.post('/api/login', { username: 'test.fahrer', password: 'Sicheres-Passwort-2026' }, H);
    eq(blocked.status, 429, 'gesperrte Adresse'); eq(blocked.data.error, 'locked');
    eq((await new Client(worker, env).post('/api/login', { username: 'test.fahrer', password: 'Sicheres-Passwort-2026' }, { 'cf-connecting-ip': '198.51.100.9' })).status, 200, 'andere Adresse');
    const keys = (await env.DB.prepare("SELECT key FROM rate_limits WHERE key LIKE 'loginfail:%'").all()).results.map((r) => r.key);
    ok(keys.length >= 1 && keys.every((k) => !k.includes('203.0.113')), 'IP nur als Hash gespeichert');
    ok((await owner.get('/api/admin/audit?action=login.ip_limited')).data.entries.length >= 1, 'protokolliert (ohne IP)');
    ok(!JSON.stringify((await owner.get('/api/admin/audit?action=login.ip_limited')).data.entries).includes('203.0.113'), 'Protokoll ohne IP');
  } finally { auth.IP_FAIL_LIMIT.max = saved; }
  // Aufräumen: alte Zählerfenster und alte Fehlversuche ohne Sperre werden gelöscht, aktive Sperren bleiben
  const old = new Date(Date.now() - 3 * 86400000).toISOString();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO rate_limits(key, window_start, count) VALUES (?,?,?)').bind('loginfail:alt', Math.floor(Date.now() / 1000) - 5 * 86400, 9),
    env.DB.prepare('INSERT INTO login_attempts(key,failures,locked_until,updated_at) VALUES (?,?,?,?)').bind('alt.versuch', 2, null, old),
    env.DB.prepare('INSERT INTO login_attempts(key,failures,locked_until,updated_at) VALUES (?,?,?,?)').bind('alt.gesperrt', 0, new Date(Date.now() + 600000).toISOString(), old),
  ]);
  await auth.cleanupShortLived(env);
  eq((await env.DB.prepare("SELECT COUNT(*) AS n FROM rate_limits WHERE key='loginfail:alt'").first()).n, 0);
  eq((await env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE key='alt.versuch'").first()).n, 0);
  eq((await env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE key='alt.gesperrt'").first()).n, 1, 'aktive Sperre bleibt');
  await env.DB.prepare("DELETE FROM login_attempts WHERE key='alt.gesperrt'").run();
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
  const pre = await owner.req('POST', '/api/tires/import?dry_run=1', csv, { 'content-type': 'text/csv' });
  eq(pre.status, 200); ok(pre.data.counts.neu >= 4 && pre.data.imported === 0, 'Vorschau ohne Übernahme');
  eq((await users.fleet.get(`/api/vehicles/${V1}/tires`)).data.specs.length, 0, 'Vorschau schreibt nichts');
  const r = await owner.req('POST', '/api/tires/import', csv, { 'content-type': 'text/csv' });
  eq(r.status, 200); ok(r.data.imported >= 4, 'Größen für Testfahrzeuge übernommen');
  eq((await owner.req('POST', '/api/tires/import?dry_run=1', csv, { 'content-type': 'text/csv' })).data.counts.neu, 0, 'zweite Vorschau: nichts neu'); ok(r.data.skipped_no_vehicle.length > 10, 'Unbekannte FIN übersprungen');
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
  const ft = await users.fleet.get('/api/tires/fleet');
  eq(ft.status, 200);
  const r1 = ft.data.rows.find((x) => x.vehicle_id === V1); const r2 = ft.data.rows.find((x) => x.vehicle_id === V2);
  eq(r1.status, 'unter_minimum'); eq(r1.min_tread_mm, 1.2); eq(r1.below_min, 1); eq(ft.data.rows[0].vehicle_id, V1, 'schlechtester zuerst');
  eq(r2.measured_positions, 0); eq(r2.status, 'unbekannt'); ok(ft.data.totals.never_measured >= 1);
  eq((await users.driver.get('/api/tires/fleet')).status, 403);
  eq((await users.prodFleet.get('/api/tires/fleet')).data.rows.find((x) => x.vehicle_id === V1).measured_positions, 0, 'Umgebungen getrennt');
});
await test('Reifenwechsel nur mit Größe; danach ist der alte Messwert nicht mehr maßgeblich', async () => {
  eq((await users.ws.post(`/api/vehicles/${V1}/tires/events`, { event_type: 'wechsel', position: 'VA-L' })).status, 400);
  eq((await users.ws.post(`/api/vehicles/${V1}/tires/events`, { event_type: 'wechsel', position: 'VA-L', size: '315/70 R22.5', brand: 'Testmarke', dot: '2326', odometer_km: 812600 })).status, 201);
  const o = await users.fleet.get(`/api/vehicles/${V1}/tires`);
  const p = o.data.positions.find((x) => x.position === 'VA-L');
  eq(p.last_event, 'wechsel'); eq(p.tread_mm, null, 'Nach Wechsel kein alter Messwert'); eq(p.status, 'unbekannt');
  eq((await users.fleet.get('/api/tires/fleet')).data.rows.find((x) => x.vehicle_id === V1).status, 'unbekannt', 'Flottenübersicht nach Wechsel');
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
await test('Bestellvorschlag: nur Artikel unter Mindestbestand, Fehlmenge, Verbrauch 90 Tage, Wert nur mit Preis; nur eigenes Lager', async () => {
  const r = await users.ws.get('/api/stock?reorder=1');
  eq(r.status, 200);
  const it = r.data.items.find((i) => i.id === ITEM);
  ok(it, 'Artikel unter Mindestbestand enthalten');
  eq(it.on_hand, 1); eq(it.min_qty, 2); eq(it.shortfall, 1); eq(it.used_90d, 2, 'Entnahme aus dem Vorgang zählt als Verbrauch'); eq(it.shortfall_value_net, 84.5);
  ok(r.data.items.every((i) => i.below_min), 'nur unter Mindestbestand');
  // ohne Preis → kein Wert (nie 0 €); Artikel ohne Mindestbestand erscheint nie
  const np = await users.ws.post('/api/stock', { name: 'Kabelbinder ohne Preis', min_qty: 5, initial_qty: 1 });
  const nm = await users.ws.post('/api/stock', { name: 'Ohne Mindestbestand', initial_qty: 0 });
  const r2 = (await users.ws.get('/api/stock?reorder=1')).data.items;
  eq(r2.find((i) => i.id === np.data.id).shortfall_value_net, null); eq(r2.find((i) => i.id === np.data.id).shortfall, 4);
  ok(!r2.some((i) => i.id === nm.data.id), 'ohne Mindestbestand nicht im Vorschlag');
  eq((await users.wsMuc.get('/api/stock?reorder=1')).data.items.filter((i) => i.site === 'DORTMUND').length, 0, 'fremdes Lager unsichtbar');
  eq((await users.driver.get('/api/stock?reorder=1')).status, 403);
  const csv = await users.ws.get('/api/stock?reorder=1&format=csv');
  const txt = new TextDecoder('utf-8', { ignoreBOM: true }).decode(csv.data);
  ok(txt.startsWith('\ufeffLager;Artikelnummer;Bezeichnung;Einheit;Lagerort;Bestand;Mindestbestand;Fehlmenge bis Mindestbestand'), 'CSV-Kopf');
  ok(txt.includes(';1;2;1;2;84,5;84,5'), 'CSV-Zeile mit Komma-Dezimalen');
  ok(/Kabelbinder ohne Preis;Stk;;1;5;4;0;;\r\n/.test(txt), 'ohne Preis: Wert leer');
  // Testartikel wieder entfernen (deaktivieren), damit spätere Zählungen unverändert bleiben
  for (const id of [np.data.id, nm.data.id]) eq((await users.ws.patch(`/api/stock/${id}`, { active: false })).status, 200);
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

await test('Vorgangssuche: Beschreibung, Nummer, Kennzeichen ohne Leerzeichen; Rechte bleiben; Platzhalter wirkungslos', async () => {
  const all = (await users.fleet.get('/api/cases?limit=500')).data.cases;
  const byText = (await users.fleet.get('/api/cases?q=' + encodeURIComponent('rückleuchte'))).data.cases;
  ok(byText.length >= 1 && byText.every((c) => /rückleuchte/i.test(c.description)), 'Text');
  const no = all[0].case_no;
  eq((await users.fleet.get('/api/cases?q=' + encodeURIComponent(no))).data.cases[0].case_no, no, 'Nummer');
  const byPlate = (await users.fleet.get('/api/cases?q=szyc5513')).data.cases;
  ok(byPlate.length > 0 && byPlate.every((c) => c.plate === 'SZ-YC 5513'), 'Kennzeichen ohne Trennzeichen');
  eq((await users.fleet.get('/api/cases?q=%25%25')).data.cases.length, 0, 'Platzhalter');
  eq((await users.fleet.get('/api/cases?q=--')).data.cases.length, 0, 'nur Trennzeichen');
  const drv = (await users.driver.get('/api/cases?q=szyc')).data.cases.length; const drvAll = (await users.driver.get('/api/cases?limit=500')).data.cases.length;
  ok(drv <= drvAll, 'Fahrer sieht nur eigene');
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

await test('Kennzahlen: Reaktions-/Durchlaufzeiten je Priorität stimmen mit den Vorgängen überein; Rechte', async () => {
  const ym = new Date().toISOString().slice(0, 7);
  const r = await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}`);
  eq(r.status, 200);
  const all = r.data.by_priority.find((x) => x.priority === 'alle');
  const list = (await users.fleet.get('/api/cases?limit=500')).data.cases;
  eq(all.created, list.length, 'Anzahl Vorgänge');
  eq(all.released, list.filter((c) => c.status === 'fahrzeug_freigegeben').length, 'freigegeben');
  eq(all.created, all.released + all.rejected + all.open);
  eq(r.data.by_priority.filter((x) => x.priority !== 'alle').reduce((n, x) => n + x.created, 0), all.created, 'Summe Prioritäten');
  ok(all.triage.n > 0 && all.triage.median_h >= 0 && all.triage.p90_h >= all.triage.median_h, 'Erstbewertung');
  ok(all.created_to_release.n === all.released, 'Durchlaufzeit nur für freigegebene');
  ok(r.data.vehicles.length > 0 && r.data.vehicles.every((v) => v.plate && v.workshop_h >= 0), 'je Fahrzeug');
  eq((await users.driver.get('/api/reports/kpi')).status, 403);
  eq((await users.fleet.get('/api/reports/kpi?from=2026-13')).status, 400);
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
  // Statische Dateien kommen ohne Worker: Sicherheitsheader stehen in public/_headers und müssen zur Worker-CSP passen
  const hdr = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  const { CSP } = await import('../src/worker.js');
  ok(hdr.includes(`Content-Security-Policy: ${CSP}\n`), '_headers-CSP = Worker-CSP');
  for (const h of ['X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Referrer-Policy: same-origin', 'Strict-Transport-Security:']) ok(hdr.includes(h), `_headers: ${h}`);
  ok(/^\/\*$/m.test(hdr), '_headers gilt für alle Pfade');
  ok(/class="seg" role="radiogroup" aria-labelledby="cl_/.test(app), 'Checkliste: Segmentgruppen als benannte Radiogruppe (Tastatur/Screenreader)');
  const { STRINGS } = await import('../public/i18n.js');
  const used = new Set([...app.matchAll(/\bt\('([a-z0-9_äöü]+)'\)/gi)].map((m) => m[1]));
  const missing = [...used].filter((k) => !(k in STRINGS.de));
  eq(missing.join(','), '', 'fehlende deutsche Texte');
  for (const lang of ['uk', 'en']) { const miss = Object.keys(STRINGS.de).filter((k) => !(k in STRINGS[lang])); eq(miss.join(','), '', `fehlende Übersetzungen ${lang}`); }
  // Fest verdrahtete Texte in Beschriftungen/Spaltenköpfen/Elementen (außer Sprachnamen, TEST-Kennzeichnung, Dateiformat- und CSV-Spaltenhinweisen)
  const allow = new Set(['Deutsch', 'English', 'TEST', 'OK', 'Українська']);
  const hard = [...app.matchAll(/<(label|th|td|dt|dd|li|b|a|div|button|h[1-4]|span|p|summary|option|legend)[^>]*>([A-Za-zÄÖÜäöüß][^<>${}]{2,})</g)].map((m) => m[2].trim())
    .filter((x) => !allow.has(x) && !/^(PDF|Quelle;|Kennzeichen;)/.test(x));
  eq(hard.join(' | '), '', 'Texte ohne Übersetzung (t())');
  const i18nSrc = readFileSync(new URL('../public/i18n.js', import.meta.url), 'utf8');
  // je Sprache: Hauptblock in STRINGS + alle Object.assign(STRINGS.<lang>, {...})-Nachträge
  const main = i18nSrc.slice(i18nSrc.indexOf('export const STRINGS = {'), i18nSrc.indexOf('\n};'));
  const perLang = { de: '', uk: '', en: '' };
  main.split(/\n  (de|uk|en): \{/).forEach((part, k, arr) => { if (k % 2 === 1) perLang[part] += arr[k + 1]; });
  for (const m of i18nSrc.matchAll(/Object\.assign\(STRINGS\.(de|uk|en), \{(.*)\}\);/g)) perLang[m[1]] += '\n' + m[2];
  const dupl = Object.entries(perLang).flatMap(([lang, b]) => { const seen = {}; return [...b.matchAll(/(?:^|[\s,{])([a-z0-9_]+): (?=['`])/g)].map((m) => m[1]).filter((k) => (seen[k] = (seen[k] || 0) + 1) > 1).map((k) => `${lang}.${k}`); });
  eq(dupl.join(','), '', 'doppelte Textschlüssel (der spätere überschreibt still den früheren)');
  // Hilfe-Abschnitte werden dynamisch (help_<name>_t/_s) gebildet: jeder genannte Abschnitt muss in allen Sprachen mit gleicher Schrittzahl existieren
  const helpSrc = app.slice(app.indexOf('function viewHelp()'), app.indexOf('// ---------- Reifen über die Flotte'));
  const helpParts = new Set([...helpSrc.matchAll(/'([a-z]+)'/g)].map((m) => m[1]).filter((k) => `help_${k}_t` in STRINGS.de || !['owner', 'fleet', 'workshop', 'dispatch', 'more', 'app_version', 'help'].includes(k)));
  ok(helpParts.has('stock') && helpParts.has('privacy'), 'Hilfe: Lager und Datenauskunft');
  for (const k of helpParts) for (const lang of ['de', 'uk', 'en']) {
    ok(STRINGS[lang][`help_${k}_t`] && STRINGS[lang][`help_${k}_s`], `Hilfe ${k} fehlt in ${lang}`);
    eq(STRINGS[lang][`help_${k}_s`].split('|').length, STRINGS.de[`help_${k}_s`].split('|').length, `Hilfe ${k}: Schrittzahl ${lang}`);
  }
  const attr = [...app.matchAll(/(aria-label|title|placeholder)="([A-Za-zÄÖÜäöüß][^"$]{2,})"/g)].map((m) => m[2]).filter((x) => !/[0-9.…,]/.test(x)); // Beispielwerte (SZ-…, m.mustermann) sind sprachneutral
  eq(attr.join(' | '), '', 'Attribute ohne Übersetzung (aria-label/title/placeholder)');
});

console.log('Protokoll');
await test('Protokoll nur für Inhaber: Anmeldungen, Sperren, Exporte, Filter; keine Geheimnisse', async () => {
  eq((await users.fleet.get('/api/admin/audit')).status, 403);
  // Sperre nach Fehlversuchen wird protokolliert
  const x = new Client(worker, env, 'x');
  for (let i = 0; i < 8; i++) await x.post('/api/login', { username: 'test.dispo', password: 'falsch-falsch-1' });
  const ul = (await owner.get('/api/users')).data.users.find((u) => u.username === 'test.dispo');
  ok(ul.locked_until, 'Benutzerliste zeigt Sperre');
  eq((await users.ws.post(`/api/users/${ul.id}/unlock`)).status, 403);
  eq((await owner.post(`/api/users/${ul.id}/unlock`)).data.unlocked, true);
  ok(!(await owner.get('/api/users')).data.users.find((u) => u.username === 'test.dispo').locked_until, 'Sperre aufgehoben');
  eq((await new Client(worker, env).post('/api/login', { username: 'test.dispo', password: 'Sicheres-Passwort-2026' })).status, 200, 'Anmeldung wieder möglich');
  const r = await owner.get('/api/admin/audit?limit=500');
  eq(r.status, 200);
  const acts = r.data.entries.map((e) => e.action);
  ok(acts.includes('login') && acts.includes('login.locked') && acts.includes('backup.export') && acts.includes('user.create'), 'Ereignisse vorhanden');
  ok(r.data.entries.find((e) => e.action === 'user.create').actor_name, 'Name des Handelnden');
  ok(!/password|token|Sicheres-Passwort/i.test(JSON.stringify(r.data.entries.map((e) => e.detail))), 'keine Passwörter/Token');
  const f = await owner.get('/api/admin/audit?action=maintenance.');
  ok(f.data.entries.length > 0 && f.data.entries.every((e) => e.action.startsWith('maintenance.')), 'Filter nach Aktion');
  eq((await owner.get('/api/admin/audit?action=%25')).data.entries.length, 0, 'Platzhalter werden nicht ausgewertet');
  const older = await owner.get(`/api/admin/audit?limit=1&before=${encodeURIComponent(r.data.entries[0].created_at)}`);
  ok(older.data.entries.length === 1 && older.data.entries[0].created_at <= r.data.entries[0].created_at, 'Blättern');
});

await test('Nutzungsstatistik ohne Personenbezug: nur Inhaber, IDs ersetzt, Fehler gezählt, Umgebungen getrennt', async () => {
  const { featureOf, areaOf } = await import('../src/usage.js');
  eq(featureOf('POST', '/api/cases/0b8c3c1e-1111-4222-8333-944455556666/commands'), 'POST cases/:id/commands');
  eq(featureOf('GET', '/api/vehicles/VIN:WDB96340310123456'), 'GET vehicles/:id');
  eq(areaOf('POST agent/run'), 'master');
  eq(featureOf('POST', '/api/cases/x1/commands', 'add_part'), 'POST cases/:id/commands:add_part');
  eq(featureOf('POST', '/api/cases/x1/commands', 'Freitext mit Inhalt'), 'POST cases/:id/commands', 'freie Texte nie übernehmen');
  eq(areaOf('POST cases/:id/commands:receive'), 'cases');
  eq((await users.fleet.get('/api/admin/usage')).status, 403);
  await users.fleet.get('/api/cases/00000000-0000-4000-8000-000000000000'); // 404 → Fehler gezählt
  const r = await owner.get('/api/admin/usage?days=7', { 'x-cfp-env': 'test' });
  eq(r.status, 200); eq(r.data.environment, 'test');
  const f = (k) => r.data.features.find((x) => x.feature === k);
  ok(f('GET cases') && f('GET cases').calls > 0, 'Vorgangsliste gezählt');
  ok(f('GET cases/:id') && f('GET cases/:id').errors >= 1, 'Fehler gezählt');
  ok(r.data.features.some((x) => x.feature === 'POST cases/:id/commands:receive'), 'Befehle je Aktion');
  ok(r.data.features.every((x) => !/[0-9a-f]{8}-|\d{3,}/.test(x.feature)), 'keine IDs in Funktionsnamen');
  const raw = JSON.stringify((await env.DB.prepare('SELECT * FROM usage_daily').all()).results);
  const ids = (await env.DB.prepare('SELECT id, username FROM users').all()).results;
  ok(ids.every((u) => !raw.includes(u.id) && !raw.includes(u.username)), 'keine Benutzer-ID/-namen gespeichert');
  ok(!(await env.DB.prepare("SELECT 1 FROM pragma_table_info('usage_daily') WHERE name IN ('user_id','role','ip')").first()), 'keine Personenspalten');
  ok(r.data.total_calls === r.data.daily.reduce((s, d) => s + d.calls, 0), 'Summen stimmen');
  const prod = await users.prodFleet.get('/api/cases');
  eq(prod.status, 200);
  const rows = (await env.DB.prepare("SELECT environment, SUM(calls) AS n FROM usage_daily GROUP BY environment").all()).results;
  ok(rows.some((x) => x.environment === 'production') && rows.some((x) => x.environment === 'test'), 'Umgebungen getrennt');
});

await test('Meine Anmeldungen: Geräte anzeigen, einzeln/alle anderen abmelden, fremde Sitzungen unantastbar', async () => {
  const { deviceFromUa } = await import('../src/auth.js');
  eq(deviceFromUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'), 'Safari · iPhone');
  eq(deviceFromUa('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36'), 'Chrome · Android');
  const login = async (ua) => { const c = new Client(worker, env, 'muc'); const r = await c.post('/api/login', { username: 'test.werkstatt.muc', password: 'Sicheres-Passwort-2026' }, { 'user-agent': ua }); eq(r.status, 200); return c; };
  const a = await login('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36');
  const b = await login('Mozilla/5.0 (Linux; Android 14) Chrome/126.0 Mobile Safari/537.36');
  const c = await login('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Safari/604.1');
  const list = (await a.get('/api/me/sessions')).data.sessions;
  ok(list.length >= 3 && list.filter((x) => x.current).length === 1, 'genau eine aktuelle Anmeldung');
  ok(list.some((x) => x.device === 'Chrome · Android') && list.every((x) => /^[0-9a-f]{16}$/.test(x.id) && !('token_hash' in x)), 'Gerät, Kurzkennung, kein Hash');
  const cur = list.find((x) => x.current);
  eq((await a.req('DELETE', `/api/me/sessions/${cur.id}`)).status, 400, 'aktuelle nicht über Geräteliste');
  // fremde Person kann die Sitzung nicht beenden
  const other = list.find((x) => x.device === 'Chrome · Android');
  eq((await users.fleet.req('DELETE', `/api/me/sessions/${other.id}`)).data.revoked, 0);
  eq((await b.get('/api/me')).status, 200);
  eq((await a.req('DELETE', `/api/me/sessions/${other.id}`)).data.revoked, 1);
  eq((await b.get('/api/me')).status, 401, 'Android abgemeldet');
  eq((await c.get('/api/me')).status, 200);
  ok((await a.post('/api/me/sessions/revoke-others')).data.revoked >= 1);
  eq((await c.get('/api/me')).status, 401, 'iPhone abgemeldet');
  eq((await a.get('/api/me')).status, 200, 'aktuelle bleibt');
  users.wsMuc.cookie = a.cookie; // ursprüngliche Testsitzung wurde mit abgemeldet – für spätere Tests weiterverwenden
  const au = (await owner.get('/api/admin/audit?action=session.')).data.entries.map((e) => e.action);
  ok(au.includes('session.revoke') && au.includes('session.revoke_others'), 'protokolliert');
});

await test('Zeitleiste der Fahrzeugakte: chronologisch, Filter, gleiche Rechte wie die Akte', async () => {
  const r = await users.fleet.get(`/api/vehicles/${encodeURIComponent(V1)}/timeline`);
  eq(r.status, 200);
  const it = r.data.items;
  ok(it.length > 3 && it.some((x) => x.type === 'case') && it.some((x) => x.type === 'inspection'), 'Vorgänge und Kontrollen enthalten');
  const k = (x) => (x.at.length === 10 ? x.at + 'T12:00:00.000Z' : x.at);
  ok(it.every((x, i) => i === 0 || k(it[i - 1]) >= k(x)), 'absteigend sortiert');
  const f = await users.fleet.get(`/api/vehicles/${encodeURIComponent(V1)}/timeline?types=case_closed,odometer&limit=5`);
  ok(f.data.items.length <= 5 && f.data.items.every((x) => ['case_closed', 'odometer'].includes(x.type)), 'Filter und Begrenzung');
  eq((await users.driver.get(`/api/vehicles/${encodeURIComponent(V1)}/timeline`)).status, 403, 'Fahrer nicht');
  const ws = await users.ws.get(`/api/vehicles/${encodeURIComponent(V1)}/timeline`);
  eq(ws.status, 200);
  ok(!ws.data.items.some((x) => x.type === 'fine' || (x.type === 'case' && x.status === 'gemeldet')), 'Werkstatt ohne Bußgelder und ohne ungeprüfte Meldungen');
  const prod = await users.prodFleet.get(`/api/vehicles/${encodeURIComponent(V1)}/timeline`);
  ok(!prod.data.items.some((x) => x.type === 'case'), 'Betrieb ohne Testvorgänge');
});

await test('Kilometerstand: Ablesedatum (nicht Zukunft), Plausibilität gegen Nachbarwerte nur mit Begründung', async () => {
  const p = `/api/vehicles/${encodeURIComponent(V2)}/odometer`;
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  eq((await users.fleet.post(p, { km: 500000, measured_on: day(20) })).status, 201);
  eq((await users.fleet.post(p, { km: 501000, measured_on: day(10) })).status, 201);
  const back = await users.fleet.post(p, { km: 500500, measured_on: day(15) });
  eq(back.status, 201, 'Wert dazwischen passt'); eq(back.data.measured_at, day(15) + 'T12:00:00.000Z');
  const low = await users.fleet.post(p, { km: 499000, measured_on: day(5) });
  eq(low.status, 409); eq(low.data.error, 'km_not_plausible'); ok(/501000/.test(low.data.message), 'nennt Vergleichswert');
  const high = await users.fleet.post(p, { km: 600000, measured_on: day(18) });
  eq(high.status, 409, 'größer als späterer Wert');
  const withNote = await users.fleet.post(p, { km: 1200, measured_on: day(5), note: 'Tachotausch laut Werkstattrechnung' });
  eq(withNote.status, 201); ok(withNote.data.warning, 'Hinweis bei Begründung');
  eq((await users.fleet.post(p, { km: 1300, measured_on: day(-1) })).status, 400, 'Zukunft abgewiesen');
  eq((await users.fleet.post(p, { km: 1300, measured_on: '2026-02-30x' })).status, 400);
  eq((await users.fleet.post(p, { km: 1250, measured_on: day(5), note: 'x' })).status, 409, 'Doppelerfassung gleicher Tag/Rolle');
  const d = await users.fleet.get(`/api/vehicles/${encodeURIComponent(V2)}`);
  ok(d.data.odometer.some((o) => o.note === 'Tachotausch laut Werkstattrechnung'), 'Begründung in der Akte');
});

await test('Prüfungen mit Kilometer-Intervall: Fälligkeit aus letztem km-Stand, Vorwarnung nur wenn eingestellt, Agent-Befund', async () => {
  const vp = `/api/vehicles/${encodeURIComponent(V1)}`;
  const cur = (await users.fleet.get(vp)).data.odometer[0].km;
  const r1 = await users.ws.post(`${vp}/maintenance`, { kind: 'Ölwechsel', interval_km: 50000, last_done_km: cur - 60000, evidence: 'Testnachweis km-Intervall' });
  eq(r1.status, 201);
  const r2 = await users.ws.post(`${vp}/maintenance`, { kind: 'Bremsen', interval_km: 50000, last_done_km: cur - 45000, evidence: 'Testnachweis km-Intervall 2' });
  let ov = (await users.fleet.get('/api/maintenance')).data;
  const a = ov.rows.find((x) => x.id === r1.data.id); const b = ov.rows.find((x) => x.id === r2.data.id);
  eq(a.next_due_km, cur - 10000); eq(a.km_remaining, -10000); eq(a.status, 'ueberfaellig', 'km überschritten');
  eq(b.km_status, 'ok', 'ohne eingestellte Vorwarnung keine erfundene Schwelle');
  eq((await owner.put('/api/settings', { maintenance_warn_km: 6000 })).status, 200);
  ov = (await users.fleet.get('/api/maintenance')).data;
  eq(ov.rows.find((x) => x.id === r2.data.id).status, 'faellig', 'Vorwarnung 6000 km');
  ok(/Fällig bei km/.test((await users.fleet.get('/api/maintenance?format=csv')).data instanceof Uint8Array ? new TextDecoder().decode((await users.fleet.get('/api/maintenance?format=csv')).data) : ''), 'CSV-Spalte');
  await users.fleet.post('/api/agent/run');
  const fs = (await users.fleet.get('/api/master')).data.findings;
  const over = fs.find((f) => f.finding_code === 'MAINTENANCE_OVERDUE' && f.subject_key === `${r1.data.id}|km`);
  ok(over && /Ölwechsel war bei .* km fällig/.test(over.message), 'Agent meldet km-Überschreitung');
  ok(fs.some((f) => f.finding_code === 'MAINTENANCE_DUE' && f.subject_key === `${r2.data.id}|km`), 'Agent meldet km-Vorwarnung');
  eq((await users.ws.post(`/api/maintenance/${r1.data.id}/complete`, { done_date: new Date().toISOString().slice(0, 10), evidence: 'Werkstattauftrag Test' })).status, 400, 'km bei Durchführung Pflicht');
  eq((await users.ws.post(`/api/maintenance/${r1.data.id}/complete`, { done_date: new Date().toISOString().slice(0, 10), evidence: 'Werkstattauftrag Test', done_km: cur })).status, 200);
  ov = (await users.fleet.get('/api/maintenance')).data;
  eq(ov.rows.find((x) => x.id === r1.data.id).next_due_km, cur + 50000, 'neuer Zyklus ab Durchführung');
  await owner.put('/api/settings', { maintenance_warn_km: null });
});

await test('Wartungshistorie: jede Durchführung bleibt erhalten (erfasst, erledigt, Import), in Akte und Zeitleiste', async () => {
  const vp = `/api/vehicles/${encodeURIComponent(V2)}`;
  const r = await users.fleet.post(`${vp}/maintenance`, { kind: 'Inspektion', last_done_date: '2025-03-01', interval_months: 6, evidence: 'Werkstattrechnung Test 1' });
  eq(r.status, 201);
  eq((await users.fleet.post(`/api/maintenance/${r.data.id}/complete`, { done_date: '2025-09-02', evidence: 'Werkstattrechnung Test 2' })).status, 200);
  eq((await users.fleet.post(`/api/maintenance/${r.data.id}/complete`, { done_date: '2026-03-03', evidence: 'Werkstattrechnung Test 3' })).status, 200);
  eq((await users.fleet.post(`/api/maintenance/${r.data.id}/complete`, { done_date: '2026-03-03', evidence: 'Werkstattrechnung Test 3 korrigiert' })).status, 200, 'gleiches Datum aktualisiert statt doppelt');
  const d = (await users.fleet.get(vp)).data;
  const h = d.maintenance_history.filter((x) => x.rule_id === r.data.id);
  eq(h.length, 3, 'drei Durchführungen');
  eq(h.map((x) => x.done_date).join(','), '2026-03-03,2025-09-02,2025-03-01');
  eq(h[0].evidence, 'Werkstattrechnung Test 3 korrigiert'); eq(h[2].source, 'erfasst'); eq(h[0].source, 'erledigt');
  const tl = (await users.fleet.get(`${vp}/timeline?types=maintenance`)).data.items.filter((x) => x.maintenance_kind === 'Inspektion');
  eq(tl.length, 3, 'Zeitleiste zeigt alle');
  const vin = V2.slice(4);
  const imp = await users.fleet.req('POST', '/api/maintenance/import', `FIN;Art;Letzte Prüfung;Intervall Monate;Nachweis\n${vin};Inspektion;01.09.2026;6;Importbeleg Test`, { 'content-type': 'text/csv' });
  eq(imp.status, 200);
  const h2 = (await users.fleet.get(vp)).data.maintenance_history.filter((x) => x.rule_id === r.data.id);
  ok(h2.length === 4 && h2[0].source === 'import' && h2[0].done_date === '2026-09-01', 'Import ergänzt Historie');
  const bk = (await owner.get('/api/admin/backup', { 'x-cfp-env': 'test' }));
  const bkj = bk.data instanceof Uint8Array ? JSON.parse(new TextDecoder().decode(bk.data)) : bk.data;
  ok(JSON.stringify(bkj).includes('Werkstattrechnung Test 2'), 'in der Sicherung');
});

await test('Fahrerzuordnung: keine Doppelzuordnung, Fahrzeugwechsel beendet alte Zuordnung, Umgebungen getrennt; „Mein Fahrzeug“', async () => {
  const dup = await users.fleet.post(`/api/vehicles/${V1}/drivers`, { user_id: users.driver.id });
  eq(dup.status, 409, 'bereits zugeordnet');
  const sw = await users.fleet.post(`/api/vehicles/${V2}/drivers`, { user_id: users.driver.id, end_previous: true });
  eq(sw.status, 201); ok(sw.data.ended_previous.length >= 1, 'alte Zuordnung beendet');
  const mine = await users.driver.get('/api/me/vehicles');
  eq(mine.status, 200);
  eq(mine.data.vehicles.length, 1); eq(mine.data.vehicles[0].id, V2);
  ok('locked' in mine.data.vehicles[0] && Array.isArray(mine.data.vehicles[0].my_open_cases) && Array.isArray(mine.data.vehicles[0].next_inspections), 'Felder');
  eq((await users.fleet.get('/api/me/vehicles')).status, 403, 'nur Fahrer');
  // bekannte offene Mängel am eigenen Fahrzeug: auch fremde Meldungen, aber ohne Namen und ohne Link
  const other = await users.fleet.post('/api/cases', { vehicle_id: V2, description: 'Spiegelhalter rechts locker (Fuhrpark)', priority: 'niedrig', request_key: rk() });
  eq(other.status, 201);
  const kd = (await users.driver.get('/api/me/vehicles')).data.vehicles[0].known_defects;
  const k = kd.find((x) => x.case_no === other.data.case_no);
  ok(k && k.id === null && k.mine === false, 'fremde Meldung ohne Link');
  ok(!JSON.stringify(kd).includes('reporter') && !JSON.stringify(kd).includes('display_name'), 'keine Namen');
  ok(!(await users.driver.get('/api/me/vehicles')).data.vehicles[0].my_open_cases.some((c) => c.case_no === other.data.case_no), 'nicht unter eigenen Meldungen');
  const oc = (await users.fleet.get(`/api/cases/${other.data.id}`)).data.case;
  eq((await users.fleet.post(`/api/cases/${oc.id}/commands`, { action: 'reject', command_id: rk(), expected_version: oc.version, note: 'Testdaten' })).status, 200);
  const v2 = (await users.fleet.get(`/api/vehicles/${V2}`)).data.drivers.find((x) => x.user_id === users.driver.id && !x.valid_to);
  eq((await users.prodFleet.req('DELETE', `/api/assignments/${v2.id}`)).status, 404, 'Betrieb kann Test-Zuordnung nicht beenden');
  eq((await users.fleet.req('DELETE', `/api/assignments/${v2.id}`)).status, 200);
  eq((await users.fleet.req('DELETE', `/api/assignments/${v2.id}`)).status, 404, 'bereits beendet');
  eq((await users.driver.get('/api/me/vehicles')).data.vehicles.length, 0);
  // Ausgangszustand für spätere Tests wiederherstellen
  eq((await users.fleet.post(`/api/vehicles/${V1}/drivers`, { user_id: users.driver.id })).status, 201);
});

await test('Datenqualität: Widersprüche und Lücken aus Stammdaten, nur Inhaber/Fuhrparkleitung, ändert nichts', async () => {
  eq((await users.ws.get('/api/admin/data-quality')).status, 403);
  // Lkw mit Anhängerkennzeichen, das es nicht gibt; zweites Fahrzeug mit gleichem Kennzeichen (anders geschrieben)
  eq((await owner.post('/api/vehicles', { plate: 'DQ-XY 1', vin: 'WDB96340310999001', trailer_plate: 'DQ-AH 404' })).status, 201);
  eq((await owner.post('/api/vehicles', { plate: 'DQ XY1', vin: 'WDB96340310999002', site: 'Dortmund' })).status, 201);
  const before = (await env.DB.prepare('SELECT COUNT(*) AS n FROM vehicles').first()).n;
  const r = await users.fleet.get('/api/admin/data-quality');
  eq(r.status, 200);
  const has = (check, vin) => r.data.items.some((i) => i.check === check && (!vin || i.vehicle_id === 'VIN:' + vin));
  ok(has('duplicate_plate', 'WDB96340310999001') && has('duplicate_plate', 'WDB96340310999002'), 'gleiches Kennzeichen');
  ok(has('trailer_unknown', 'WDB96340310999001'), 'unbekannter Anhänger');
  ok(has('missing_site', 'WDB96340310999001') && !has('missing_site', 'WDB96340310999002'), 'fehlender Standort');
  ok(has('no_km', 'WDB96340310999001'), 'kein km-Stand');
  ok(r.data.items.find((i) => i.check === 'missing_inspection' && i.vehicle_id === 'VIN:WDB96340310999001').detail.includes('HU'), 'fehlende Pflichtprüfung');
  eq(r.data.items[0].severity, 'fehler', 'Fehler zuerst');
  eq((await env.DB.prepare('SELECT COUNT(*) AS n FROM vehicles').first()).n, before, 'nichts geändert');
  // Aufräumen: Testfahrzeuge außer Betrieb nehmen, damit spätere Tests unbeeinflusst bleiben
  for (const v of ['WDB96340310999001', 'WDB96340310999002']) eq((await owner.post(`/api/vehicles/VIN:${v}/active`, { active: false, reason: 'Testdaten Datenqualität' })).status, 200);
});

await test('Werkstatt-Auslastung je Standort/Kalenderwoche ohne Personenbezug; Werkstatt sieht nur eigenen Standort', async () => {
  const { isoWeek } = await import('../src/reports.js');
  eq(isoWeek('2026-01-01'), '2026-W01'); eq(isoWeek('2027-01-03'), '2026-W53'); eq(isoWeek('2021-01-04'), '2021-W01');
  const r = await users.fleet.get('/api/reports/workshop-load?weeks=4');
  eq(r.status, 200); eq(r.data.weeks.length, 4);
  const sumHours = r.data.sites.reduce((s, x) => s + x.weeks.reduce((a, w) => a + w.hours, 0), 0);
  const from = r.data.from;
  const db = (await env.DB.prepare(`SELECT COALESCE(SUM(w.hours),0) AS h FROM work_entries w JOIN cases c ON c.id=w.case_id WHERE c.environment='test' AND w.work_date >= ?`).bind(from).first()).h;
  ok(Math.abs(sumHours - db) < 0.01, `Stundensumme stimmt (${sumHours} = ${db})`);
  ok(!JSON.stringify(r.data).includes('user_id') && !JSON.stringify(r.data).includes('display_name'), 'keine Personen');
  const ws = await users.ws.get('/api/reports/workshop-load');
  eq(ws.status, 200); ok(ws.data.sites.every((x) => x.site === 'DORTMUND'), 'nur eigener Standort');
  eq((await users.driver.get('/api/reports/workshop-load')).status, 403);
});

await test('Vorgangsliste als CSV: gleiche Filter/Rechte wie die Liste, Excel-tauglich, Formelschutz, protokolliert', async () => {
  const dec = (r) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(r.data);
  const all = await users.fleet.get('/api/cases?format=csv');
  eq(all.status, 200); ok(/text\/csv/.test(all.headers.get('content-type')));
  const txt = dec(all);
  ok(txt.startsWith('\ufeffVorgang;Kennzeichen'), 'BOM + Kopfzeile');
  const list = (await users.fleet.get('/api/cases?limit=500')).data.cases;
  eq(txt.trim().split('\r\n').length - 1, list.length, 'gleiche Anzahl wie Liste');
  const open = dec(await users.fleet.get('/api/cases?format=csv&status=open'));
  ok(open.split('\r\n').length <= txt.split('\r\n').length, 'Filter wirkt');
  const ws = dec(await users.ws.get('/api/cases?format=csv'));
  eq(ws.trim().split('\r\n').length - 1, (await users.ws.get('/api/cases?limit=500')).data.cases.length, 'Werkstatt nur eigene Sicht');
  eq((await users.driver.get('/api/cases?format=csv')).status, 403);
  // Formelschutz: Beschreibung, die mit = beginnt
  await users.driver.post('/api/cases', { vehicle_id: V1, description: '=HYPERLINK("http://x")', priority: 'niedrig', driveability: 'fahrbereit', request_key: rk() });
  ok(dec(await users.fleet.get('/api/cases?format=csv')).includes(`"'=HYPERLINK(""http://x"")"`), 'Formel entschärft');
  ok((await owner.get('/api/admin/audit?action=reports.cases')).data.entries.length >= 1, 'protokolliert');
});

await test('Push-Einstellungen je Person: nicht dringende Arten stummschaltbar, dringende immer, In-App bleibt', async () => {
  const p0 = await users.driver.get('/api/me/notify-prefs');
  eq(p0.status, 200); ok(p0.data.kinds.includes('received') && !p0.data.kinds.includes('safety_lock'), 'Sicherheitsereignisse nicht stummschaltbar');
  const put = await users.driver.put('/api/me/notify-prefs', { muted: ['received', 'safety_lock', 'quatsch'] });
  eq(put.data.muted.join(','), 'received', 'nur erlaubte Arten');
  const c = await users.driver.post('/api/cases', { vehicle_id: V1, description: 'Push-Test leise', priority: 'niedrig', driveability: 'fahrbereit', request_key: rk() });
  await users.fleet.post(`/api/cases/${c.data.id}/commands`, { action: 'receive', command_id: rk(), expected_version: 1 });
  const n = (await env.DB.prepare(`SELECT push_status FROM notifications WHERE case_id=? AND user_id=? AND kind='received'`).bind(c.data.id, users.driver.id).first());
  eq(n.push_status, 'disabled', 'kein Push, aber In-App gespeichert');
  // dringend: trotz Stummschaltung Push-Versuch
  const u = await users.driver.post('/api/cases', { vehicle_id: V1, description: 'Push-Test dringend', priority: 'kritisch', driveability: 'nicht_fahrbereit', request_key: rk() });
  await users.fleet.post(`/api/cases/${u.data.id}/commands`, { action: 'receive', command_id: rk(), expected_version: 1 });
  const n2 = (await env.DB.prepare(`SELECT push_status, urgent FROM notifications WHERE case_id=? AND user_id=? AND kind='received'`).bind(u.data.id, users.driver.id).first());
  ok(n2 && n2.urgent === 1 && n2.push_status !== 'disabled', 'dringend immer');
  eq((await users.driver.put('/api/me/notify-prefs', { muted: [] })).data.muted.length, 0);
});

await test('Sicherung: jede Tabelle ist gesichert oder bewusst ausgenommen (neue Tabellen werden nicht vergessen)', async () => {
  const { BACKUP_TABLES, EXCLUDED } = await import('../src/backup.js');
  const tables = (await env.DB.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all()).results.map((r) => r.name);
  const missing = tables.filter((t) => !BACKUP_TABLES.includes(t) && !(t in EXCLUDED));
  eq(missing.join(','), '', 'nicht zugeordnete Tabellen');
  ok(BACKUP_TABLES.every((t) => tables.includes(t)), 'alle gesicherten Tabellen existieren');
  const b = await owner.get('/api/admin/backup');
  const j = b.data instanceof Uint8Array ? JSON.parse(new TextDecoder().decode(b.data)) : b.data;
  ok(j.data.audit_log.length > 0 && 'telematics_unmatched' in j.data, 'neue Tabellen enthalten');
  ok(!JSON.stringify(j).includes('password_hash') && !JSON.stringify(j.data.audit_log).includes('Sicheres-Passwort'), 'keine Geheimnisse');
  // Wiederherstellungs-Probe: Sicherung in frische Datenbank einspielen, Zeilenzahl je Tabelle und Fremdschlüssel prüfen
  const { restoreInto } = await import('../scripts/sicherung-probe.mjs');
  const { ensureSchema } = await import('../src/worker.js');
  const fresh = makeEnv(); await ensureSchema(fresh);
  const rr = restoreInto(fresh.DB.db, j);
  eq(rr.tables.filter((x) => !x.ok).map((x) => `${x.table} ${x.restored}/${x.expected}`).join(', '), '', 'alle Tabellen vollständig');
  eq(rr.foreign_key_errors, 0, 'Fremdschlüssel stimmig');
  ok(rr.tables.find((x) => x.table === 'cases').restored > 0 && rr.tables.find((x) => x.table === 'vehicles').restored > 0 && rr.tables.find((x) => x.table === 'users').restored > 0, 'Fachdaten vorhanden');
});

await test('Lager: CSV-Bestandsliste und Inventur (Vorschau, Korrektur mit Grund, nur eigenes Lager)', async () => {
  const csv = await users.ws.get('/api/stock?format=csv');
  eq(csv.status, 200);
  const txt = new TextDecoder('utf-8', { ignoreBOM: true }).decode(csv.data);
  ok(txt.startsWith('\ufeffLager;Artikelnummer') && txt.includes('Bremsbelagsatz VA'), 'CSV mit Artikel');
  const n = await users.ws.post('/api/stock', { name: 'Inventurartikel', unit: 'Stk', initial_qty: 10 });
  eq(n.status, 201);
  const items = (await users.ws.get('/api/stock')).data.items;
  const it = items.find((i) => i.id === n.data.id);
  const pre = await users.ws.post('/api/stock/inventory?dry_run=1', { site: 'DORTMUND', counts: [{ item_id: it.id, counted: 7 }, { item_id: items.find((i) => i.id !== it.id).id, counted: '' }] });
  eq(pre.status, 200); eq(pre.data.differences.length, 1); eq(pre.data.differences[0].delta, -3); eq(pre.data.booked, 0);
  eq((await users.ws.get('/api/stock')).data.items.find((i) => i.id === it.id).on_hand, 10, 'Vorschau bucht nichts');
  const go = await users.ws.post('/api/stock/inventory', { site: 'DORTMUND', counts: [{ item_id: it.id, counted: 7 }], note: 'Jahresinventur' });
  eq(go.data.booked, 1);
  const d = (await users.ws.get(`/api/stock/${it.id}`)).data;
  eq(d.item.on_hand, 7); ok(d.movements.some((m) => m.type === 'korrektur' && /Inventur .*gezählt 7 Stk, Buchbestand 10 Stk – Jahresinventur/.test(m.note)), 'Korrektur mit Grund');
  eq((await users.wsMuc.post('/api/stock/inventory', { site: 'DORTMUND', counts: [{ item_id: it.id, counted: 1 }] })).status, 403, 'fremdes Lager');
  eq((await users.ws.post('/api/stock/inventory', { site: 'DORTMUND', counts: [{ item_id: it.id, counted: -1 }] })).status, 400, 'negativ');
  eq((await users.ws.post('/api/stock/inventory', { site: 'DORTMUND', counts: [{ item_id: it.id, counted: 7 }, { item_id: it.id, counted: 7 }] })).status, 400, 'doppelt');
});

await test('Fahrzeugimport: Vorschau (neu/geändert/unverändert), leere Spalten löschen keine Stammdaten, Anführungszeichen', async () => {
  const H = { 'content-type': 'text/csv' };
  eq((await owner.post('/api/vehicles', { plate: 'IM-P 1', vin: 'WDB96340310888001', site: 'Dortmund', manufacturer: 'Mercedes-Benz', model: 'Actros 1845' })).status, 201);
  const csv = 'Kennzeichen;FIN;Fahrzeugart;Quelle\nIM-P 1;WDB96340310888001;Lkw;"Beleg A; mit Semikolon"\nIM-P 2;WDB96340310888002;Anhänger;Beleg B\nIM-X;UNGUELTIG;Lkw;x';
  const pre = await owner.req('POST', '/api/vehicles/import?dry_run=1', csv, H);
  eq(pre.status, 200); eq(pre.data.dry_run, true);
  eq(pre.data.counts.neu, 1); eq(pre.data.counts.unveraendert, 1); eq(pre.data.skipped.length, 1);
  eq((await owner.get('/api/vehicles/VIN:WDB96340310888002')).status, 404, 'Vorschau legt nichts an');
  const go = await owner.req('POST', '/api/vehicles/import', csv, H);
  eq(go.data.imported, 2);
  const v1 = (await owner.get('/api/vehicles/VIN:WDB96340310888001')).data.vehicle;
  eq(v1.manufacturer, 'Mercedes-Benz', 'Hersteller bleibt'); eq(v1.model, 'Actros 1845', 'Modell bleibt'); eq(v1.site, 'Dortmund', 'Standort bleibt');
  eq(v1.source, 'CSV-Import: Beleg A; mit Semikolon', 'Anführungszeichen korrekt gelesen');
  const ch = await owner.req('POST', '/api/vehicles/import?dry_run=1', 'Kennzeichen;FIN;Standort\nIM-P 1 NEU;WDB96340310888001;München', H);
  const row = ch.data.preview[0];
  eq(row.action, 'geändert'); ok(row.changes.some((c) => c.field === 'plate' && c.to === 'IM-P 1 NEU') && row.changes.some((c) => c.field === 'site' && c.from === 'Dortmund'), 'Änderungen benannt');
  for (const v of ['WDB96340310888001', 'WDB96340310888002']) await owner.post(`/api/vehicles/VIN:${v}/active`, { active: false, reason: 'Testdaten Import' });
});

await test('Bußgelder: CSV (Fahrer nur auf Wunsch) und Fristenkalender ohne Namen; ICS-Text korrekt maskiert', async () => {
  const dec = (r) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(r.data);
  await users.fleet.post('/api/fines', { kind: 'bussgeldbescheid', authority: 'Bußgeldstelle Süd; Abt. 3', reference: 'AZ-ICS-1', offense_type: 'parken', offense_at: new Date().toISOString(), plate_in_letter: 'SZ YC 5513', amount_eur: 35.5, response_due: '2099-03-15' });
  const csv = await users.fleet.get('/api/fines?format=csv');
  eq(csv.status, 200); const t = dec(csv);
  ok(t.startsWith('\ufeffVorgang;Art;Behörde') && !t.includes(';Fahrer') && t.includes('35,5'), 'ohne Fahrer, Komma-Betrag');
  ok(dec(await users.fleet.get('/api/fines?format=csv&with_driver=1')).split('\r\n')[0].endsWith(';Fahrer'), 'mit Fahrer auf Wunsch');
  eq((await users.driver.get('/api/fines?format=csv')).status, 403);
  const ics = dec(await users.fleet.get('/api/fines?format=ics'));
  ok(ics.includes('DTSTART;VALUE=DATE:20990315') && ics.includes('Bußgeldstelle Süd\\; Abt. 3'), 'Frist mit maskiertem Semikolon');
  const { icsEscape } = await import('../src/util.js');
  eq(icsEscape('a;b,c\\d\nx'), 'a\\;b\\,c\\\\d\\nx');
});

await test('Kommentar gezielt benachrichtigen (nur Werkstatt / nur Meldende), Standard alle Beteiligten', async () => {
  const c = await users.driver.post('/api/cases', { vehicle_id: V1, description: 'Kommentartest Spiegel', priority: 'niedrig', driveability: 'fahrbereit', request_key: rk(), workshop_site: 'DORTMUND' });
  await users.fleet.post(`/api/cases/${c.data.id}/commands`, { action: 'receive', command_id: rk(), expected_version: 1 });
  await users.fleet.post(`/api/cases/${c.data.id}/commands`, { action: 'approve_repair', command_id: rk(), expected_version: 2, note: 'Spiegel tauschen', payload: { workshop_site: 'DORTMUND' } });
  const who = async () => new Set((await env.DB.prepare(`SELECT user_id FROM notifications WHERE case_id=? AND kind='comment'`).bind(c.data.id).all()).results.map((r) => r.user_id));
  eq((await users.fleet.post(`/api/cases/${c.data.id}/commands`, { action: 'comment', command_id: rk(), expected_version: 3, note: 'Nur an Werkstatt', payload: { notify: ['workshop'] } })).status, 200);
  let w = await who();
  ok(w.has(users.ws.id) && !w.has(users.driver.id), 'nur Werkstatt');
  const v = (await users.fleet.get(`/api/cases/${c.data.id}`)).data.case.version;
  await users.ws.post(`/api/cases/${c.data.id}/commands`, { action: 'comment', command_id: rk(), expected_version: v, note: 'Rückfrage an alle' });
  w = await who();
  ok(w.has(users.driver.id) && w.has(users.fleet.id), 'Standard: alle Beteiligten');
});

await test('Kosten je km: gefahrene km aus erster/letzter Ablesung im Zeitraum, ohne Rückgang; sonst kein Wert', async () => {
  const r = await users.fleet.get('/api/reports/costs');
  eq(r.status, 200); ok(Array.isArray(r.data.vehicles));
  const v1 = r.data.vehicles.find((v) => v.vehicle_id === V1);
  const rows = (await env.DB.prepare('SELECT km FROM odometer_readings WHERE vehicle_id=? ORDER BY measured_at').bind(V1).all()).results;
  const exp = rows.length >= 2 && rows[rows.length - 1].km >= rows[0].km ? rows[rows.length - 1].km - rows[0].km : null;
  eq(v1.km, exp, 'km = letzte − erste Ablesung');
  if (exp) eq(v1.cost_per_km, Math.round((v1.actual_net / exp) * 1000) / 1000);
  const v2 = r.data.vehicles.find((v) => v.vehicle_id === V2);
  ok(!v2 || v2.km === null, 'Rückgang (Tachotausch) → kein km-Wert');
});

await test('Tätigkeitsvorschläge aus bisherigen Arbeiten der eigenen Werkstatt', async () => {
  const r = await users.ws.get('/api/work-suggestions');
  eq(r.status, 200); ok(Array.isArray(r.data.suggestions) && r.data.suggestions.length > 0, 'Vorschläge vorhanden');
  const own = (await env.DB.prepare(`SELECT DISTINCT w.description AS d FROM work_entries w JOIN cases c ON c.id=w.case_id WHERE c.workshop_site='DORTMUND' AND c.environment='test'`).all()).results.map((x) => x.d);
  ok(r.data.suggestions.every((x) => own.includes(x)), 'nur eigene Werkstatt');
  eq((await users.driver.get('/api/work-suggestions')).status, 403);
  const ps = await users.ws.get('/api/part-suggestions');
  eq(ps.status, 200); ok(ps.data.suggestions.every((x) => 'name' in x && !('unit_price_net' in x)), 'Teile ohne Preise');
});

await test('Fahrzeugliste als CSV (nicht für Fahrer)', async () => {
  const r = await users.fleet.get('/api/vehicles?format=csv');
  eq(r.status, 200);
  const txt = new TextDecoder('utf-8', { ignoreBOM: true }).decode(r.data);
  ok(txt.startsWith('\ufeffKennzeichen;FIN;Fahrzeugart') && txt.trim().split('\r\n').length - 1 === (await users.fleet.get('/api/vehicles')).data.vehicles.length, 'alle Fahrzeuge');
  eq((await users.driver.get('/api/vehicles?format=csv')).status, 403);
});

await test('Mengenbegrenzung je Benutzer für Uploads/Importe (429), Fenster getrennt je Aktion', async () => {
  const { rateLimit, LIMITS } = await import('../src/util.js');
  const saved = LIMITS.import; LIMITS.import = [2, 3600];
  try {
    await rateLimit(env, 'import', 'rl-test'); await rateLimit(env, 'import', 'rl-test');
    let err = null; try { await rateLimit(env, 'import', 'rl-test'); } catch (e) { err = e; }
    ok(err && err.status === 429, '3. Aufruf abgewiesen');
    await rateLimit(env, 'import', 'rl-andere-person');
    await rateLimit(env, 'upload', 'rl-test');
  } finally { LIMITS.import = saved; }
  const r = await users.fleet.req('POST', '/api/maintenance/import?dry_run=1', 'FIN;Art;Letzte Prüfung;Nachweis\nWMA15SZZ2HM722774;HU;01.01.2026;x', { 'content-type': 'text/csv' });
  eq(r.status, 200, 'normaler Betrieb nicht betroffen');
});

console.log('Ruhende Fahrzeuge');
await test('Ruhendes Fahrzeug: bleibt sichtbar, zählt nicht in Kosten/Fahrzeugzahl/Prüfbefunden; nur Fuhrpark/Inhaber, Grund Pflicht', async () => {
  const before = (await users.fleet.get('/api/master')).data.vehicles_total;
  const costsBefore = (await users.fleet.get('/api/reports/costs?from=2026-01&to=2026-12')).data;
  const withCost = costsBefore.rows.find((r) => r.actual_net > 0 || r.unvalued_items > 0);
  ok(withCost, 'Kostenzeile vorhanden');
  const V = withCost.vehicle_id;
  eq((await users.ws.post(`/api/vehicles/${V}/evaluation`, { excluded: true, reason: 'x' })).status, 403);
  eq((await users.fleet.post(`/api/vehicles/${V}/evaluation`, { excluded: true })).status, 400, 'Grund Pflicht');
  eq((await users.fleet.post(`/api/vehicles/${V}/evaluation`, { excluded: true, reason: 'Reparatur oder Verkauf offen' })).status, 200);
  eq((await users.fleet.get('/api/master')).data.vehicles_total, before - 1);
  const costsAfter = (await users.fleet.get('/api/reports/costs?from=2026-01&to=2026-12')).data;
  ok(!costsAfter.rows.some((r) => r.vehicle_id === V), 'nicht im Kostenbericht');
  ok((await users.fleet.get('/api/vehicles')).data.vehicles.some((v) => v.id === V && v.eval_excluded === 1), 'bleibt in der Fahrzeugliste');
  await users.fleet.post('/api/agent/run');
  ok(!(await users.fleet.get('/api/master')).data.findings.some((f) => f.vehicle_id === V && !f.case_id), 'keine fahrzeugbezogenen Befunde');
  eq((await users.fleet.post(`/api/vehicles/${V}/evaluation`, { excluded: false })).status, 200);
  eq((await users.fleet.get('/api/master')).data.vehicles_total, before);
});

console.log('HU/SP nach StVZO Anlage VIII');
{
  const { computeHuSp, zgmClassFromKg } = await import('../src/inspection_rules.js');
  const L = (cls, ez = null) => ({ kind: 'lkw', zgm_class: cls, first_registration: ez });
  const HU = (d) => ({ kind: 'HU', done_date: d, evidence: 'Prüfbericht HU' });
  const SP = (d) => ({ kind: 'SP', done_date: d, evidence: 'Prüfbericht SP' });
  const calc = (v, ev, today, extra = {}) => computeHuSp(v, ev, { today, warnDays: 30, ...extra });

  await test('Halbjährlicher Wechsel: HU 01/2026 → SP 07/2026 → HU 01/2027 → SP 07/2027 (keine zusätzliche SP)', async () => {
    let r = calc(L('ueber_12'), [HU('2026-01-15'), SP('2026-01-15')], '2026-03-01');
    eq(r.hu.due, '2027-01-31', 'HU 12 Monate, Monatsende'); eq(r.sp.due, '2026-07-31', 'SP 6 Monate nach HU (SP i. V. m. HU am HU-Tag zählt nicht als Zyklus-SP)'); eq(r.sp.status, 'ok');
    r = calc(L('ueber_12'), [HU('2026-01-15'), SP('2026-01-15'), SP('2026-07-10')], '2026-08-01');
    eq(r.sp.status, 'ok'); eq(r.sp.due, null, 'nach durchgeführter SP keine weitere SP im selben Zyklus'); eq(r.sp.prognosis, '2027-07-31', 'Prognose: 6 Monate nach nächster HU');
    eq(r.hu.due, '2027-01-31');
    r = calc(L('ueber_12'), [HU('2026-01-15'), SP('2026-07-10'), HU('2027-01-20')], '2027-02-01');
    eq(r.sp.due, '2027-07-31', 'SP folgt der neuen HU'); eq(r.hu.due, '2028-01-31');
    r = calc(L('ueber_12', '2015-03-01'), [HU('2026-01-15')], '2026-08-01');
    eq(r.sp.status, 'ueberfaellig', 'nicht nach „letzte SP + 12“, sondern HU + 6'); eq(r.sp.due, '2026-07-31');
  });
  await test('Erste SP 30 Monate (>12 t) bzw. 42 Monate (7,5–12 t) nach Erstzulassung', async () => {
    let r = calc(L('ueber_12', '2024-01-15'), [HU('2025-01-10')], '2025-03-01');
    eq(r.sp.status, 'erste_sp_kuenftig'); eq(r.sp.prognosis, '2026-07-31', '30 Monate');
    r = calc(L('ueber_12', '2024-01-15'), [HU('2025-01-10'), HU('2026-01-12')], '2026-03-01');
    eq(r.sp.due, '2026-07-31', 'nach HU 24 Monate → SP 6 Monate später = 30 Monate nach EZ'); eq(r.sp.status, 'ok');
    r = calc(L('7_5_12', '2024-01-15'), [HU('2025-01-10'), HU('2026-01-12')], '2026-03-01');
    eq(r.sp.status, 'erste_sp_kuenftig'); eq(r.sp.prognosis, '2027-07-31', '42 Monate');
    r = calc(L('7_5_12', '2024-01-15'), [HU('2025-01-10'), HU('2026-01-12'), HU('2027-01-11')], '2027-03-01');
    eq(r.sp.due, '2027-07-31');
  });
  await test('Gewichtsgrenzen genau 7,5 t und genau 12 t (Anhänger 10 t)', async () => {
    eq(zgmClassFromKg('lkw', 7500), '3_5_7_5'); eq(zgmClassFromKg('lkw', 7501), '7_5_12');
    eq(zgmClassFromKg('lkw', 12000), '7_5_12'); eq(zgmClassFromKg('lkw', 12001), 'ueber_12');
    eq(zgmClassFromKg('anhaenger', 10000), '3_5_10'); eq(zgmClassFromKg('anhaenger', 10001), 'ueber_10');
    eq(calc(L(zgmClassFromKg('lkw', 7500)), [HU('2026-01-15')], '2026-03-01').sp.status, 'nicht_sp_pflichtig', 'genau 7,5 t: keine SP');
    eq(calc(L(zgmClassFromKg('lkw', 12000), '2020-01-01'), [HU('2026-01-15')], '2026-03-01').sp.due, '2026-07-31', 'genau 12 t: SP-pflichtig (42-Monats-Regel)');
    eq(calc({ kind: 'anhaenger', zgm_class: '3_5_10' }, [HU('2026-01-15')], '2026-03-01').sp.status, 'nicht_sp_pflichtig', 'Anhänger bis 10 t: keine SP');
    eq(calc({ kind: 'anhaenger', zgm_class: 'ueber_10', first_registration: '2015-01-01' }, [HU('2026-01-15')], '2026-03-01').sp.due, '2026-07-31', 'Anhänger > 10 t: SP 6 Monate nach HU');
  });
  await test('Zulässig im Vormonat vorgezogene SP verschiebt den Turnus nicht; zu frühe SP → Frist ungeklärt', async () => {
    let r = calc(L('ueber_12'), [HU('2026-01-20'), SP('2026-01-20'), SP('2026-06-03')], '2026-08-15');
    eq(r.sp.status, 'ok', 'SP im Vormonat (Juni) erfüllt die Juli-SP'); eq(r.sp.prognosis, '2027-07-31', 'Turnus bleibt Juli');
    r = calc(L('ueber_12'), [HU('2026-01-20'), SP('2026-01-20'), SP('2026-04-02')], '2026-05-01');
    eq(r.sp.status, 'ungeklaert', 'außerhalb Vormonat'); ok(/vor dem zulässigen Zeitraum/.test(r.sp.notes.join(' ')));
  });
  await test('Fehlende, widersprüchliche und überfällige Prüfdaten; HU erledigt keine offene SP; keine Kulanz', async () => {
    let r = calc(L(null), [HU('2026-01-15')], '2026-03-01');
    eq(r.sp.status, 'ungeklaert', 'zGM fehlt'); eq(r.hu.status, 'ungeklaert');
    r = calc(L('ueber_12'), [], '2026-03-01');
    eq(r.hu.status, 'ungeklaert'); ok(/Keine durchgeführte HU/.test(r.hu.notes.join(' ')));
    // jeder Hinweis hat einen Code mit deutschem Gegenstück in der Oberfläche (UK/EN-Anzeige)
    eq(r.hu.notes.length, r.hu.note_codes.length, 'Code je Hinweis');
    const { STRINGS: TX } = await import('../public/i18n.js');
    const src = (await import('node:fs')).readFileSync(new URL('../src/inspection_rules.js', import.meta.url), 'utf8');
    const codes = [...src.matchAll(/note\((?:hu|sp), '([a-z_]+)'|useDoc\('([a-z_]+)'/g)].map((m) => m[1] || m[2]);
    ok(codes.length >= 19, 'alle Hinweis-Codes gefunden');
    eq(codes.filter((c) => !TX.de['hn_' + c] || !TX.uk['hn_' + c] || !TX.en['hn_' + c]).join(','), '', 'Hinweis-Codes ohne Übersetzung');
    r = calc(L('ueber_12'), [HU('2026-01-15')], '2026-03-01');
    eq(r.sp.status, 'ungeklaert', 'ohne Erstzulassung und ohne SP-Nachweis'); eq(r.sp.prognosis, '2026-07-31');
    r = calc(L('ueber_12'), [HU('2025-01-15'), SP('2025-01-15'), HU('2026-01-15')], '2026-03-01');
    ok(/nicht belegt/.test(r.sp.notes.join(' ')) && r.sp.status === 'ungeklaert', 'SP 07/2025 fehlt – spätere HU ersetzt sie nicht');
    r = calc(L('ueber_12'), [HU('2025-10-20')], '2026-10-31', { documented: { HU: { due: '2026-11-30' } } });
    eq(r.hu.status, 'ungeklaert', 'Widerspruch Nachweis/Berechnung'); eq(r.hu.due, '2026-11-30', 'Nachweis wird nicht überschrieben');
    r = calc(L('ueber_12'), [HU('2025-01-10'), SP('2025-01-10'), SP('2025-07-05')], '2026-02-01');
    eq(r.hu.status, 'ueberfaellig', 'HU 01/2026 überschritten'); eq(r.hu.due, '2026-01-31', 'kein Verschieben, keine Kulanz');
    r = calc(L('ueber_12'), [HU('2026-01-10'), SP('2026-01-10')], '2026-08-01', { planned: { SP: '2026-08-20' } });
    eq(r.sp.status, 'ueberfaellig', 'geplanter Termin ersetzt keine Durchführung'); eq(r.sp.planned_date, '2026-08-20');
    r = calc(L('ueber_12'), [{ ...HU('2026-01-10'), result: 'erhebliche_maengel' }, SP('2026-01-10')], '2026-02-01');
    eq(r.hu.status, 'ungeklaert', 'HU mit erheblichen Mängeln: Nachprüfung belegen');
  });
  await test('Serverseitig: Fahrzeugakte, Übersicht, Befunde und protokollierte Neuberechnung; bestehende Funktionen bleiben', async () => {
    const V3 = 'VIN:WDB9630051L909058';
    eq((await users.fleet.post('/api/vehicles', { vin: 'WDB9630051L909058', plate: 'SZ-YC 5517', site: 'Dortmund', source: 'Test' })).status, 201);
    eq((await users.fleet.post(`/api/vehicles/${V3}/maintenance`, { kind: 'HU', last_done_date: '2025-10-20', evidence: 'HU-Prüfbericht 20.10.2025' })).status, 201);
    const before = (await users.fleet.get(`/api/vehicles/${V3}`)).data;
    ok(before.hu_sp && before.hu_sp.hu && before.hu_sp.sp, 'HU/SP getrennt in der Fahrzeugakte');
    eq((await users.ws.post(`/api/vehicles/${V3}/spec`, { zgm_class: 'ueber_12', spec_source: 'x' })).status, 403);
    eq((await users.fleet.post(`/api/vehicles/${V3}/spec`, { zgm_kg: 12000, zgm_class: 'ueber_12', spec_source: 'Fahrzeugschein' })).status, 400, 'Klasse passt nicht zu kg');
    eq((await users.fleet.post(`/api/vehicles/${V3}/spec`, { zgm_kg: 18000, first_registration: '2016-12-01', spec_source: 'Fahrzeugschein F.2/B' })).status, 200);
    const sp = await users.fleet.post(`/api/vehicles/${V3}/maintenance`, { kind: 'SP', last_done_date: '2025-10-20', evidence: 'SP i. V. m. HU 20.10.2025' });
    eq(sp.status, 201); eq(sp.data.next_due_date, '2026-04-30', 'SP 6 Monate nach HU 10/2025');
    const d = (await users.fleet.get(`/api/vehicles/${V3}`)).data;
    eq(d.hu_sp.sp.due, '2026-04-30'); eq(d.hu_sp.sp.status, 'ueberfaellig');
    const ov = (await users.fleet.get('/api/maintenance')).data;
    const row = ov.rows.find((x) => x.vehicle_id === V3 && x.kind === 'SP');
    eq(row.status, 'ueberfaellig'); eq(row.due_month, '04/2026'); eq(row.due_basis, 'berechnet');
    const audits = (await owner.get('/api/admin/audit?action=maintenance.husp_recalc')).data.entries;
    ok(audits.some((a) => a.target === V3 && a.detail && a.detail.kind === 'SP' && a.detail.to === '2026-04-30'), 'Neuberechnung protokolliert (von/nach)');
    await users.fleet.post('/api/agent/run');
    ok((await users.fleet.get('/api/master')).data.findings.some((f) => f.finding_code === 'MAINTENANCE_OVERDUE' && f.vehicle_id === V3 && /SP überfällig/.test(f.message)), 'Befund SP überfällig');
    const rid = d.hu_sp.rules.SP;
    eq((await users.fleet.post(`/api/maintenance/${rid}/plan`, { planned_date: '2026-10-28' })).status, 200);
    eq((await users.fleet.get(`/api/vehicles/${V3}`)).data.hu_sp.sp.status, 'ueberfaellig', 'Planung erledigt nichts');
    const done = await users.fleet.post(`/api/maintenance/${rid}/complete`, { done_date: '2026-10-10', evidence: 'SP-Prüfbericht 10.10.2026', result: 'ohne_maengel' });
    eq(done.status, 200);
    const after = (await users.fleet.get(`/api/vehicles/${V3}`)).data;
    eq(after.hu_sp.sp.status, 'ok', 'verspätete SP schließt den Zyklus'); eq(after.hu_sp.hu.due, '2026-10-31');
    ok(after.documents !== undefined && after.maintenance_history.length >= before.maintenance_history.length, 'Dokumente und Historie erhalten');
  });
}

console.log('Fahrerakte');
await test('Fahrerakte: nur Fuhrpark/Inhaber anlegen und sehen, Fahrer nur eigene Akte; Nachweise mit Gültig-bis laut Dokument', async () => {
  eq((await users.ws.get('/api/drivers')).status, 403, 'Werkstatt sieht keine Fahrerdaten');
  eq((await users.dispatch.get('/api/drivers')).status, 403, 'Dispo sieht keine Fahrerdaten');
  eq((await users.driver.post('/api/drivers', { display_name: 'X' })).status, 403);
  const a = await users.fleet.post('/api/drivers', { display_name: 'Testfahrer Eins', personnel_no: 'P-1', user_id: users.driver.id });
  eq(a.status, 201);
  const b = await users.fleet.post('/api/drivers', { display_name: 'Fahrer ohne Konto' });
  eq(b.status, 201);
  eq((await users.fleet.post('/api/drivers', { display_name: 'Doppelt', user_id: users.driver.id })).status, 409, 'Konto nur einmal zuordnen');
  eq((await users.fleet.post(`/api/drivers/${a.data.id}/documents`, { kind: 'fahrerkarte', evidence: 'Karte' })).status, 400, 'Fahrerkarte braucht Gültig-bis');
  eq((await users.fleet.post(`/api/drivers/${a.data.id}/documents`, { kind: 'fuehrerschein', valid_until: '2030-01-31' })).status, 400, 'Nachweis Pflicht');
  eq((await users.fleet.post(`/api/drivers/${a.data.id}/documents`, { kind: 'fuehrerschein', license_classes: 'CE', valid_until: '2027-03-31', evidence: 'Führerschein Original gesehen' })).status, 201);
  const soon = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  eq((await users.fleet.post(`/api/drivers/${a.data.id}/documents`, { kind: 'fahrerkarte', valid_until: soon, evidence: 'Fahrerkarte Kopie' })).status, 201);
  eq((await users.fleet.post(`/api/drivers/${b.data.id}/documents`, { kind: 'code95', valid_until: '2025-12-31', evidence: 'Schlüsselzahl 95 im Führerschein' })).status, 201);
  const list = (await users.fleet.get('/api/drivers')).data.drivers;
  const A = list.find((x) => x.id === a.data.id); const B = list.find((x) => x.id === b.data.id);
  eq(A.status.items.find((i) => i.kind === 'fahrerkarte').status, 'laeuft_ab'); eq(B.status.overall, 'kritisch', 'abgelaufener Code 95');
  const own = (await users.driver.get('/api/drivers')).data.drivers;
  eq(own.length, 1); eq(own[0].id, a.data.id, 'Fahrer sieht nur sich');
  eq((await users.driver.get(`/api/drivers/${b.data.id}`)).status, 404, 'fremde Akte nicht sichtbar');
  eq((await users.driver.post(`/api/drivers/${a.data.id}/documents`, { kind: 'sonstiges', evidence: 'x' })).status, 403, 'Fahrer ändert nichts');
});
await test('Führerscheinkontrolle: Vermerk bei Mangel, Intervall nur wenn eingestellt; Befunde und Ersetzen alter Nachweise', async () => {
  const id = (await users.fleet.get('/api/drivers')).data.drivers.find((x) => x.display_name === 'Testfahrer Eins').id;
  eq((await users.fleet.post(`/api/drivers/${id}/license-checks`, { checked_on: '2026-01-10', result: 'nicht_vorgelegt' })).status, 400, 'Vermerk Pflicht');
  eq((await users.fleet.post(`/api/drivers/${id}/license-checks`, { checked_on: '2099-01-10', result: 'in_ordnung' })).status, 400, 'nicht in der Zukunft');
  eq((await users.fleet.post(`/api/drivers/${id}/license-checks`, { checked_on: '2026-01-10', result: 'in_ordnung' })).status, 201);
  let d = (await users.fleet.get(`/api/drivers/${id}`)).data;
  eq(d.status.check.due, null, 'ohne eingestelltes Intervall keine erfundene Frist');
  eq((await owner.put('/api/settings', { license_check_months: 6 })).status, 200);
  d = (await users.fleet.get(`/api/drivers/${id}`)).data;
  eq(d.status.check.due, '2026-07-10'); ok(['faellig', 'bald', 'ok'].includes(d.status.check.status));
  eq((await users.fleet.post(`/api/drivers/${id}/documents`, { kind: 'fahrerkarte', valid_until: '2031-05-31', evidence: 'Neue Fahrerkarte' })).status, 201);
  d = (await users.fleet.get(`/api/drivers/${id}`)).data;
  eq(d.documents.filter((x) => x.kind === 'fahrerkarte' && !x.superseded).length, 1, 'neue Karte ersetzt alte');
  eq(d.documents.filter((x) => x.kind === 'fahrerkarte').length, 2, 'Historie bleibt');
  await users.fleet.post('/api/agent/run');
  const f = (await users.fleet.get('/api/master')).data.findings;
  ok(f.some((x) => x.finding_code === 'DRIVER_DOC_EXPIRED' && /Code 95/.test(x.message)), 'abgelaufener Code 95 gemeldet');
  ok(!f.some((x) => x.finding_code === 'DRIVER_DOC_EXPIRES_SOON' && /Fahrerkarte/.test(x.message) && /Testfahrer Eins/.test(x.message)), 'ersetzte Karte nicht mehr gemeldet');
  ok(f.some((x) => x.finding_code === 'LICENSE_CHECK_DUE'), 'Kontrolle fällig (Intervall 6 Monate eingestellt)');
  eq((await owner.put('/api/settings', { license_check_months: '' })).status, 200);
});

await test('Auslese-Fristen Fahrerkarte (28 Tage) / Massenspeicher (90 Tage) nach FPersV § 2 Abs. 5: nur aus erfassten Auslesungen, Rechte, Befunde', async () => {
  const ago = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const id = (await users.fleet.get('/api/drivers')).data.drivers.find((x) => x.display_name === 'Testfahrer Eins').id;
  const other = (await users.fleet.get('/api/drivers')).data.drivers.find((x) => x.display_name === 'Fahrer ohne Konto').id;
  eq((await users.ws.get('/api/tacho')).status, 403, 'Werkstatt sieht keine Auslesungen');
  eq((await users.driver.post('/api/tacho/downloads', { kind: 'fahrerkarte', driver_id: id, downloaded_on: ago(1), evidence: 'x' })).status, 403, 'Fahrer erfasst nichts');
  let ov = (await users.fleet.get('/api/tacho')).data;
  eq(ov.rule.card_days, 28); eq(ov.rule.vu_days, 90);
  const d0 = ov.drivers.find((x) => x.id === id);
  eq(d0.status, 'keine', 'Fahrerkarte vorhanden, keine Auslesung → keine erfundene Frist'); eq(d0.due, null);
  ok(ov.without_card.some((x) => x.id === other), 'Fahrer ohne Fahrerkarte getrennt aufgeführt');
  ok(ov.vehicles.every((v) => v.status === 'keine'), 'Fahrzeuge ohne Auslesung: keine Frist');
  ok(!ov.vehicles.some((v) => v.id === 'VIN:VAK656EBDG1613170'), 'Anhänger ohne Fahrtenschreiber');
  eq((await users.fleet.post('/api/tacho/downloads', { kind: 'massenspeicher', vehicle_id: 'VIN:VAK656EBDG1613170', downloaded_on: ago(1), evidence: 'x' })).status, 400, 'Anhänger abgewiesen');
  eq((await users.fleet.post('/api/tacho/downloads', { kind: 'fahrerkarte', driver_id: id, downloaded_on: '2099-01-01', evidence: 'x' })).status, 400, 'nicht in der Zukunft');
  eq((await users.fleet.post('/api/tacho/downloads', { kind: 'fahrerkarte', driver_id: id, downloaded_on: ago(30) })).status, 400, 'Nachweis Pflicht');
  eq((await users.fleet.post('/api/tacho/downloads', { kind: 'fahrerkarte', driver_id: id, downloaded_on: ago(30), evidence: 'Auslesesoftware, Datei C_…ddd' })).status, 201);
  eq((await users.fleet.post('/api/tacho/downloads', { kind: 'fahrerkarte', driver_id: id, downloaded_on: ago(30), evidence: 'doppelt' })).status, 409, 'gleicher Tag doppelt');
  eq((await users.fleet.post('/api/tacho/downloads', { kind: 'massenspeicher', vehicle_id: V1, downloaded_on: ago(85), evidence: 'Downloadkey, Datei M_…ddd' })).status, 201);
  ov = (await users.fleet.get('/api/tacho')).data;
  const d1 = ov.drivers.find((x) => x.id === id); const v1 = ov.vehicles.find((x) => x.id === V1);
  eq(d1.last, ago(30)); eq(d1.due, ago(2)); eq(d1.status, 'ueberfaellig', '30 Tage > 28 Tage');
  eq(v1.due, new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)); eq(v1.status, 'bald', 'noch 5 Tage (Vorwarnung 7)');
  eq(ov.drivers[0].status, 'ueberfaellig', 'Dringendes zuerst');
  const csv = await users.fleet.get('/api/tacho?format=csv');
  const ctext = new TextDecoder().decode(csv.data); ok(ctext.includes('Fahrerkarte;Testfahrer Eins;P-1;') && ctext.includes('überfällig'), 'CSV');
  // Fahrer sieht eigene Fahrerkarten-Auslesungen, nicht fremde
  const own = (await users.driver.get(`/api/drivers/${id}`)).data;
  eq(own.tacho.status, 'ueberfaellig'); eq(own.tacho_downloads.length, 1);
  eq((await users.driver.get(`/api/tacho/downloads?driver_id=${other}`)).status, 404);
  eq((await users.driver.get(`/api/tacho/downloads?vehicle_id=${encodeURIComponent(V1)}`)).status, 403);
  eq((await users.fleet.get(`/api/tacho/downloads?vehicle_id=${encodeURIComponent(V1)}`)).data.downloads.length, 1);
  await users.fleet.post('/api/agent/run');
  let f = (await users.fleet.get('/api/master')).data.findings;
  ok(f.some((x) => x.finding_code === 'TACHO_CARD_OVERDUE' && /Testfahrer Eins/.test(x.message)), 'Befund Fahrerkarte überfällig');
  ok(f.some((x) => x.finding_code === 'TACHO_VU_DUE'), 'Befund Massenspeicher bald');
  ok(!f.some((x) => /TACHO/.test(x.finding_code) && /Fahrer ohne Konto/.test(x.message)), 'ohne Auslesung kein Befund');
  // neue Auslesung erledigt den Befund
  eq((await users.fleet.post('/api/tacho/downloads', { kind: 'fahrerkarte', driver_id: id, downloaded_on: ago(0), evidence: 'Auslesung heute' })).status, 201);
  await users.fleet.post('/api/agent/run');
  f = (await users.fleet.get('/api/master')).data.findings;
  ok(!f.some((x) => x.finding_code === 'TACHO_CARD_OVERDUE' && /Testfahrer Eins/.test(x.message)), 'nach Auslesung erledigt');
  eq((await users.driver.get('/api/drivers?format=csv')).status, 403, 'Fahrer: keine Fristenliste');
  const dcsv = new TextDecoder().decode((await users.fleet.get('/api/drivers?format=csv')).data);
  ok(dcsv.includes('Name;Personalnummer;') && /Testfahrer Eins;P-1;;2027-03-31;2031-05-31;;2026-01-10;in_ordnung;;/.test(dcsv) && dcsv.includes(`in_ordnung;;${ago(0)};${ago(-28)};in Ordnung`), dcsv.split('\r\n').find((l) => l.startsWith('Testfahrer')));
  const vd = (await users.fleet.get(`/api/vehicles/${encodeURIComponent(V1)}`)).data;
  eq(vd.tacho.last, ago(85)); eq(vd.tacho.status, 'bald', 'Fahrzeugakte zeigt Massenspeicher-Frist');
  eq((await users.ws.get(`/api/vehicles/${encodeURIComponent(V1)}`)).data.tacho, undefined, 'Werkstatt sieht keine Auslesungen');
  eq((await users.fleet.get('/api/vehicles/VIN:VAK656EBDG1613170')).data.tacho, undefined, 'Anhänger ohne Fahrtenschreiber');
  ok((await users.fleet.get(`/api/vehicles/${encodeURIComponent(V1)}/timeline?types=tacho`)).data.items.some((x) => x.type === 'tacho' && x.at === ago(85)), 'Zeitleiste');
  eq((await owner.put('/api/settings', { tacho_warn_days: 3 })).status, 200);
  eq((await users.fleet.get('/api/tacho')).data.vehicles.find((x) => x.id === V1).status, 'ok', 'Vorwarnung einstellbar');
  eq((await owner.put('/api/settings', { tacho_warn_days: '' })).status, 200);
});

await test('Auslesungen-Sammelimport (CSV): Vorschau, nur eindeutige Treffer, Anhänger/Zukunft/doppelt abgewiesen, idempotent', async () => {
  const ago = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const de = (iso) => iso.split('-').reverse().join('.');
  const csv = ['Art;Personalnummer;Fahrer;Kennzeichen;FIN;Datum;Datei',
    `Fahrerkarte;P-1;;;;${de(ago(3))};C_P1.ddd`,
    `Karte;;fahrer ohne konto;;;${ago(4)};C_X.ddd`,
    `Fahrerkarte;P-999;;;;${ago(3)};C_unbekannt.ddd`,
    `Massenspeicher;;;;${V2.slice(4)};${ago(10)};M_V2.ddd`,
    `VU;;;;VAK656EBDG1613170;${ago(10)};M_anh.ddd`,
    `Fahrerkarte;P-1;;;;2099-01-01;C_zukunft.ddd`,
    `Fahrerkarte;P-1;;;;${de(ago(3))};C_P1_doppelt.ddd`,
    `Irgendwas;P-1;;;;${ago(3)};x`].join('\n');
  eq((await users.ws.req('POST', '/api/tacho/import', csv, { 'content-type': 'text/csv' })).status, 403);
  eq((await users.fleet.req('POST', '/api/tacho/import', 'Art;Datum\nFahrerkarte;2026-01-01', { 'content-type': 'text/csv' })).status, 400, 'Nachweis-Spalte oder Quelle nötig');
  const dry = await users.fleet.req('POST', '/api/tacho/import?dry_run=1', csv, { 'content-type': 'text/csv' });
  eq(dry.status, 200); eq(dry.data.counts.neu, 3); eq(dry.data.counts.uebersprungen, 5);
  const reasons = dry.data.skipped.map((x) => x.reason).join(' | ');
  ok(/Fahrer nicht gefunden: P-999/.test(reasons) && /Anhänger/.test(reasons) && /Zukunft/.test(reasons) && /doppelt/.test(reasons) && /Art unbekannt/.test(reasons), reasons);
  const before = (await users.fleet.get('/api/tacho')).data;
  const run = await users.fleet.req('POST', '/api/tacho/import', csv, { 'content-type': 'text/csv' });
  eq(run.data.counts.neu, 3);
  const after = (await users.fleet.get('/api/tacho')).data;
  eq(after.vehicles.find((v) => v.id === V2).last, ago(10), 'Massenspeicher übernommen');
  ok(after.drivers.find((d) => d.display_name === 'Fahrer ohne Konto').last === ago(4), 'Name eindeutig (Groß/Klein egal)');
  ok(before.drivers.length <= after.drivers.length);
  const again = await users.fleet.req('POST', '/api/tacho/import', csv, { 'content-type': 'text/csv' });
  eq(again.data.counts.neu, 0); eq(again.data.counts.vorhanden, 3, 'idempotent');
  const q = await users.fleet.req('POST', `/api/tacho/import?source=${encodeURIComponent('Export Auslesesoftware')}`, `Art;Kennzeichen;Datum\nM;SZ-KC 5515;${ago(20)}`, { 'content-type': 'text/csv' });
  eq(q.data.counts.neu, 1, 'Kennzeichen + Quelle für alle Zeilen');
  eq((await users.fleet.get(`/api/tacho/downloads?vehicle_id=${encodeURIComponent(V2)}`)).data.downloads.find((x) => x.downloaded_on === ago(20)).evidence, 'Export Auslesesoftware');
});

await test('Datenqualität: Fahrerakte und Auslesungen (ohne Führerschein, Karte ohne Auslesung, Konto ohne Akte, Lkw ohne Auslesung)', async () => {
  eq((await users.dispatch.get('/api/admin/data-quality')).status, 403);
  const r = (await users.fleet.get('/api/admin/data-quality')).data;
  const has = (check, pred) => r.items.some((i) => i.check === check && (!pred || pred(i)));
  ok(has('driver_no_license', (i) => i.driver_name === 'Fahrer ohne Konto' && i.driver_id), 'Fahrer ohne Führerschein-Nachweis');
  ok(!has('driver_no_license', (i) => i.driver_name === 'Testfahrer Eins'), 'mit Führerschein kein Befund');
  ok(!has('driver_card_no_download', (i) => i.driver_name === 'Testfahrer Eins'), 'Karte mit Auslesung');
  ok(!has('vu_no_download', (i) => i.vehicle_id === V1), 'Lkw mit Auslesung');
  ok(!has('vu_no_download', (i) => i.vehicle_id === 'VIN:VAK656EBDG1613170'), 'Anhänger nie');
  const nd = await users.fleet.post('/api/drivers', { display_name: 'Karte ohne Auslesung' });
  await users.fleet.post(`/api/drivers/${nd.data.id}/documents`, { kind: 'fahrerkarte', valid_until: '2030-01-31', evidence: 'Kopie' });
  const r2 = (await users.fleet.get('/api/admin/data-quality')).data;
  ok(r2.items.some((i) => i.check === 'driver_card_no_download' && i.driver_id === nd.data.id), 'Karte ohne Auslesung');
  eq((await users.fleet.patch(`/api/drivers/${nd.data.id}`, { active: false })).status, 200);
});

await test('Anmeldungen eines Benutzers beenden (Geräteverlust): Rechte, Sitzungen + Push-Geräte, Protokoll, Übersicht', async () => {
  const second = new Client(worker, env, 'fahrer2');
  eq((await second.post('/api/login', { username: 'test.fahrer', password: 'Sicheres-Passwort-2026' })).status, 200);
  const list = (await users.fleet.get('/api/users')).data.users;
  const drv = list.find((u) => u.username === 'test.fahrer');
  ok(drv.sessions >= 2 && drv.last_seen, 'Anzahl aktiver Anmeldungen sichtbar');
  eq((await users.ws.post(`/api/users/${drv.id}/revoke-sessions`)).status, 403, 'Werkstatt darf nicht');
  const ownerId = (await owner.get('/api/me')).data.user?.id || (await owner.get('/api/me')).data.id;
  eq((await users.fleet.post(`/api/users/${ownerId}/revoke-sessions`)).status, 403, 'Fuhrparkleitung nicht beim Inhaber');
  eq((await users.fleet.post(`/api/users/${users.fleet.id}/revoke-sessions`)).status, 400, 'nicht sich selbst');
  const r = await users.fleet.post(`/api/users/${drv.id}/revoke-sessions`);
  eq(r.status, 200); ok(r.data.sessions >= 2);
  eq((await second.get('/api/me')).status, 401, 'zweites Gerät abgemeldet');
  eq((await users.driver.get('/api/me')).status, 401, 'erstes Gerät abgemeldet');
  eq((await owner.get('/api/admin/audit?action=user.revoke_sessions')).data.entries.length, 1, 'Protokoll');
  eq((await users.driver.post('/api/login', { username: 'test.fahrer', password: 'Sicheres-Passwort-2026' })).status, 200, 'neu anmelden möglich');
});

await test('Vorgang zeigt Kurzinfo zum Fahrzeug (weitere offene Vorgänge, Prüfungen ≤ 30 Tage, km) – nicht für Fahrer', async () => {
  const a = await users.driver.post('/api/cases', { vehicle_id: V2, description: 'Kurzinfo A: Spiegel', priority: 'niedrig', driveability: 'fahrbereit', request_key: rk() });
  const b = await users.driver.post('/api/cases', { vehicle_id: V2, description: 'Kurzinfo B: Licht', priority: 'mittel', driveability: 'fahrbereit', request_key: rk() });
  eq(a.status, 201); eq(b.status, 201);
  const d = (await users.fleet.get(`/api/cases/${a.data.id}`)).data;
  ok(d.vehicle_info.other_open_cases.some((o) => o.id === b.data.id), 'anderer offener Vorgang');
  ok(!d.vehicle_info.other_open_cases.some((o) => o.id === a.data.id), 'nicht sich selbst');
  ok(Array.isArray(d.vehicle_info.inspections_due));
  eq((await users.driver.get(`/api/cases/${a.data.id}`)).data.vehicle_info, undefined, 'Fahrer: keine Fahrzeug-Kurzinfo');
  const w = (await users.fleet.get(`/api/cases/${a.data.id}`)).data;
  ok(w.vehicle_info.other_open_total >= 1);
  for (const id of [a.data.id, b.data.id]) { const c = (await users.fleet.get(`/api/cases/${id}`)).data.case; eq((await users.fleet.post(`/api/cases/${id}/commands`, { action: 'reject', command_id: rk(), expected_version: c.version, note: 'Testdaten Kurzinfo' })).status, 200, 'Testvorgang abgelehnt'); }
});

await test('QR-Code für Einladungslinks (eigener Encoder): Größe je Länge, Positionsmuster, Referenz (per Decoder geprüft), Grenze 213 Bytes', async () => {
  const { encode, svg } = await import('../public/qr.js');
  const { createHash } = await import('node:crypto');
  const fp = (m) => createHash('sha256').update(m.map((r) => r.map((b) => (b ? 1 : 0)).join('')).join('\n')).digest('hex').slice(0, 16);
  const hello = encode('HELLO'); eq(hello.length, 21);
  // Referenzen: mit OpenCV-QR-Decoder (QRCodeDetectorAruco) erfolgreich gelesen, 10.10.2026
  eq(fp(hello), 'c346c75add569873');
  const link = encode('https://cevik-fuhrpark-claude.y-cevik.workers.dev/#/invite/' + 'a'.repeat(43)); eq(link.length, 41); eq(fp(link), 'e33b459d7087f49f');
  for (const [x, y] of [[0, 0], [link.length - 7, 0], [0, link.length - 7]]) ok(link[y][x] && link[y + 6][x + 6] && !link[y + 1][x + 1] && link[y + 3][x + 3], 'Positionsmuster');
  eq(encode('q'.repeat(213)).length, 57, 'Version 10');
  let threw = false; try { encode('q'.repeat(214)); } catch { threw = true; } ok(threw, 'zu lang → Fehler');
  ok(svg('x<"y', { label: 'a"b' }).includes('aria-label="a&quot;b"'), 'SVG maskiert');
});

await test('Abfahrtskontrolle mit Mangel: Fahrer kann Fotos an den Folgeauftrag hängen', async () => {
  const keys = (await users.driver.get('/api/meta')).data.checklist.map((i) => i.key);
  const items = keys.map((k) => ({ key: k, result: k === 'beleuchtung' || (k === keys[0] && !keys.includes('beleuchtung')) ? 'mangel' : 'ok', note: 'Rücklicht links defekt' }));
  const r = await users.driver.post('/api/inspections', { kind: 'abfahrt', vehicle_id: V1, request_key: rk(), items });
  eq(r.status, 201); eq(r.data.followups.length, 1);
  const png = concatBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), crypto.getRandomValues(new Uint8Array(300)));
  eq((await users.driver.req('POST', `/api/cases/${r.data.followups[0].id}/files`, png, { 'content-type': 'image/png', 'x-filename': 'ruecklicht.png' })).status, 201, 'Foto am Folgeauftrag');
  const c = (await users.fleet.get(`/api/cases/${r.data.followups[0].id}`)).data;
  eq(c.files.length, 1);
  eq((await users.fleet.post(`/api/cases/${c.case.id}/commands`, { action: 'reject', command_id: rk(), expected_version: c.case.version, note: 'Testdaten' })).status, 200);
});

await test('Kontrolle mit km-Stand kleiner als zuletzt erfasst: Kontrolle gespeichert, km nicht in die Fahrzeugakte', async () => {
  const keys = (await users.driver.get('/api/meta')).data.checklist.map((i) => i.key);
  const items = keys.map((k) => ({ key: k, result: 'ok' }));
  const before = (await owner.get(`/api/vehicles/${V1}`)).data.odometer;
  ok(before.length && before[0].km > 1000, 'Ausgangs-km vorhanden');
  const r = await users.driver.post('/api/inspections', { kind: 'abfahrt', vehicle_id: V1, request_key: rk(), items, odometer_km: 1000 });
  eq(r.status, 201);
  eq(r.data.km_rejected && r.data.km_rejected.previous_km, before[0].km, 'Rückmeldung mit letztem km-Stand');
  const after = (await owner.get(`/api/vehicles/${V1}`)).data;
  eq(after.odometer[0].km, before[0].km, 'kein neuer (kleinerer) km-Stand');
  ok((await users.fleet.get(`/api/vehicles/${V1}`)).data.inspections.some((i) => i.odometer_km === 1000), 'km bleibt an der Kontrolle sichtbar');
  // plausibler (größerer) Wert wird übernommen
  const r2 = await users.driver.post('/api/inspections', { kind: 'abfahrt', vehicle_id: V1, request_key: rk(), items, odometer_km: before[0].km + 50 });
  eq(r2.data.km_rejected, null);
  eq((await owner.get(`/api/vehicles/${V1}`)).data.odometer[0].km, before[0].km + 50);
  // Wiederkehrende Mängel: zwei Abfahrtskontrollen mit Mangel am selben Punkt (Folgeaufträge danach ablehnen)
  for (let n = 0; n < 2; n++) {
    const rr = await users.driver.post('/api/inspections', { kind: 'abfahrt', vehicle_id: V1, request_key: rk(), items: keys.map((k, i) => ({ key: k, result: i === 1 ? 'mangel' : 'ok', note: i === 1 ? 'Blinker hinten rechts' : null })) });
    eq(rr.status, 201);
    const fc = (await users.fleet.get(`/api/cases/${rr.data.followups[0].id}`)).data.case;
    await users.fleet.post(`/api/cases/${fc.id}/commands`, { action: 'reject', command_id: rk(), expected_version: fc.version, note: 'Testdaten' });
  }
  const rec = (await users.fleet.get(`/api/vehicles/${V1}`)).data.recurring_defects;
  ok(rec.some((r) => r.item === keys[1] && r.n >= 2), 'wiederkehrender Mangel erkannt');
  eq((await users.prodFleet.get(`/api/vehicles/${V1}`)).data.recurring_defects.length, 0, 'Betrieb sieht Testkontrollen nicht');
  // Gleicher offener Mangel bei der nächsten Abfahrtskontrolle: kein neuer Vorgang, sondern Vermerk im offenen Folgeauftrag
  const chk = (sev) => users.driver.post('/api/inspections', { kind: 'abfahrt', vehicle_id: V1, request_key: rk(), items: keys.map((k, i) => ({ key: k, result: i === 2 ? 'mangel' : 'ok', note: i === 2 ? 'Bremsleuchte links aus' : null, safety_relevant: i === 2 && sev })) });
  const a1 = await chk(false); const a2 = await chk(false);
  eq(a1.data.followups.length, 1); eq(a2.data.followups[0].id, a1.data.followups[0].id, 'derselbe Vorgang');
  eq(a2.data.followups[0].repeat, true);
  const fa = (await users.fleet.get(`/api/cases/${a1.data.followups[0].id}`)).data;
  ok(fa.events.some((e) => e.action === 'repeat_finding' && /Bremsleuchte links aus/.test(e.note)), 'Vermerk im Verlauf');
  ok((await users.fleet.get('/api/cases?status=open')).data.cases.find((x) => x.id === fa.case.id).last_repeat_at, 'Liste kennt letzte Wiederholung (Heute zu tun)');
  eq(fa.case.check_item, keys[2]);
  // Werkstatt sieht die Wiederholung in ihrer Tagesübersicht – nur für Aufträge des eigenen Standorts
  const fav = (await users.fleet.get(`/api/cases/${fa.case.id}`)).data.case;
  eq((await users.fleet.post(`/api/cases/${fa.case.id}/commands`, { action: 'approve_repair', command_id: rk(), expected_version: fav.version, payload: { workshop_site: 'DORTMUND' }, note: 'Bremsleuchte prüfen' })).status, 200);
  ok((await users.ws.get('/api/cases?status=open')).data.cases.find((x) => x.id === fa.case.id)?.last_repeat_at, 'Werkstatt Dortmund sieht „erneut festgestellt“');
  ok(!(await users.wsMuc.get('/api/cases?status=open')).data.cases.some((x) => x.id === fa.case.id), 'andere Werkstatt sieht den Auftrag nicht');
  // Filter „Mangel erneut festgestellt“ (Backlog 52): nur Vorgänge mit Vermerk im Zeitraum, Rollenrechte bleiben
  const rf = (await users.fleet.get('/api/cases?status=open&repeat_days=3')).data.cases;
  ok(rf.some((x) => x.id === fa.case.id) && rf.every((x) => x.last_repeat_at), 'Filter liefert nur wiederholte Mängel');
  ok(rf.length < (await users.fleet.get('/api/cases?status=open')).data.cases.length, 'Filter schränkt ein');
  ok((await users.ws.get('/api/cases?status=open&repeat_days=3')).data.cases.some((x) => x.id === fa.case.id), 'Werkstatt Dortmund: im Filter');
  ok(!(await users.wsMuc.get('/api/cases?status=open&repeat_days=3')).data.cases.some((x) => x.id === fa.case.id), 'Werkstatt München: nicht im Filter');
  for (const bad of ['0', '31', 'x', '1.5']) eq((await users.fleet.get('/api/cases?repeat_days=' + bad)).status, 400, 'ungültiger Zeitraum ' + bad);
  const old = new Date(Date.now() - 5 * 86400000).toISOString();
  const evs = (await env.DB.prepare(`SELECT id, created_at FROM case_events WHERE case_id=? AND action='repeat_finding'`).bind(fa.case.id).all()).results;
  await env.DB.prepare(`UPDATE case_events SET created_at=? WHERE case_id=? AND action='repeat_finding'`).bind(old, fa.case.id).run();
  ok(!(await users.fleet.get('/api/cases?status=open&repeat_days=3')).data.cases.some((x) => x.id === fa.case.id), 'Vermerk vor 5 Tagen: nicht im 3-Tage-Filter');
  ok((await users.fleet.get('/api/cases?status=open&repeat_days=7')).data.cases.some((x) => x.id === fa.case.id), '… aber im 7-Tage-Filter');
  for (const e of evs) await env.DB.prepare('UPDATE case_events SET created_at=? WHERE id=?').bind(e.created_at, e.id).run();
  const rcsv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/cases?format=csv&status=open&repeat_days=3')).data);
  eq(rcsv.trim().split('\r\n').length - 1, rf.length, 'CSV mit gleichem Filter');
  // sicherheitsrelevant, offener Vorgang ohne Sperre → eigener (kritischer, gesperrter) Vorgang
  const a3 = await chk(true);
  ok(a3.data.followups[0].id !== a1.data.followups[0].id, 'sicherheitsrelevant → neuer Vorgang');
  const fc3 = (await users.fleet.get(`/api/cases/${a3.data.followups[0].id}`)).data.case;
  eq(fc3.priority, 'kritisch'); eq(fc3.safety_lock, 1);
  // danach: weiterer sicherheitsrelevanter Befund hängt sich an den gesperrten kritischen Vorgang
  eq((await chk(true)).data.followups[0].id, fc3.id, 'an gesperrten kritischen Vorgang angehängt');
  for (const cc of [fa.case.id, fc3.id]) { const x = (await users.fleet.get(`/api/cases/${cc}`)).data.case; await users.fleet.post(`/api/cases/${cc}/commands`, { action: 'reject', command_id: rk(), expected_version: x.version, note: 'Testdaten' }); }
  const dq = (await users.fleet.get('/api/admin/data-quality')).data;
  ok(dq.items.some((i) => i.check === 'km_inspection_rejected' && i.vehicle_id === V1 && /^1000 km/.test(i.detail)), 'Datenqualität zeigt die Kontrolle mit zu kleinem km-Stand');
  ok(!dq.items.some((i) => i.check === 'km_inspection_rejected' && i.detail.startsWith(`${before[0].km + 50} km`)), 'plausibler Wert nicht gemeldet');
});

await test('Letzte Abfahrtskontrolle je Fahrzeug in Liste, Akte und CSV (nur Information, Umgebung getrennt)', async () => {
  const last = (await env.DB.prepare(`SELECT created_at, result FROM inspections WHERE vehicle_id=? AND environment='test' AND kind='abfahrt' ORDER BY created_at DESC LIMIT 1`).bind(V1).first());
  ok(last, 'Testdaten: Abfahrtskontrolle vorhanden');
  const v = (await users.fleet.get('/api/vehicles')).data.vehicles.find((x) => x.id === V1);
  eq(v.last_check_at, last.created_at); eq(v.last_check_result, last.result);
  ok(!('last_check' in v), 'Hilfsfeld entfernt');
  const d = (await users.fleet.get('/api/vehicles/' + encodeURIComponent(V1))).data;
  eq(d.last_check.created_at, last.created_at); eq(d.last_check.kind, 'abfahrt');
  const dv = (await users.driver.get('/api/vehicles')).data.vehicles.find((x) => x.id === V1);
  ok(dv && !('last_check_at' in dv), 'Fahrerliste ohne Kontrollinfo');
  // Kontrolle nach Reparatur zählt nicht als Abfahrtskontrolle; anderes Fahrzeug ohne Kontrolle → leer
  const other = (await users.fleet.get('/api/vehicles')).data.vehicles.find((x) => x.id !== V1 && !x.last_check_at);
  if (other) eq(other.last_check_result, null);
  const txt = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/vehicles?format=csv')).data);
  const head = txt.split('\r\n')[0].split(';');
  const idx = head.indexOf('Letzte Abfahrtskontrolle'); ok(idx > 0, 'CSV-Spalte vorhanden');
  const row = txt.split('\r\n').find((l) => l.startsWith(v.plate + ';') || l.startsWith('"' + v.plate));
  ok(/^\d\d\.\d\d\.\d{4} \d\d:\d\d$/.test(row.split(';')[idx]), 'Zeitpunkt deutsch formatiert: ' + row.split(';')[idx]);
  eq(row.split(';')[idx + 1], last.result === 'ok' ? 'ohne Mangel' : 'mit Mangel');
});

await test('Datenauskunft je Person: nur Inhaber, vollständig je Bereich, ohne Geheimnisse, protokolliert', async () => {
  const id = users.driver.id;
  eq((await users.fleet.get(`/api/admin/users/${id}/data-export`)).status, 403);
  eq((await owner.get('/api/admin/users/gibt-es-nicht/data-export')).status, 404);
  const r = await owner.get(`/api/admin/users/${id}/data-export`);
  eq(r.status, 200); ok(/attachment; filename="datenauskunft_/.test(r.headers.get('content-disposition')), 'Download');
  const x = r.data;
  eq(x.user.id, id); ok(!('password_hash' in x.user) && !('password_salt' in x.user), 'ohne Passwort-Hash');
  const txt = JSON.stringify(x);
  ok(!/token_hash|p256dh|"endpoint"|"auth":|Sicheres-Passwort/.test(txt), 'ohne Token/Push-Schlüssel');
  const counts = Object.fromEntries(await Promise.all([
    ['reported_cases', 'SELECT COUNT(*) AS n FROM cases WHERE reporter_id=?'], ['inspections', 'SELECT COUNT(*) AS n FROM inspections WHERE performed_by=?'],
    ['vehicle_assignments', 'SELECT COUNT(*) AS n FROM driver_vehicles WHERE user_id=?'], ['notifications', 'SELECT COUNT(*) AS n FROM notifications WHERE user_id=?'],
  ].map(async ([k, sql]) => [k, (await env.DB.prepare(sql).bind(id).first()).n])));
  for (const k of Object.keys(counts)) eq(x[k].length, counts[k], k);
  ok(x.reported_cases.length > 0 && x.inspections.length > 0, 'Testdaten vorhanden');
  ok('driver_record' in x && Array.isArray(x.driver_documents) && Array.isArray(x.audit_about), 'alle Bereiche');
  eq(x.meta.truncated.length, 0);
  const au = (await owner.get('/api/admin/audit?action=privacy.export')).data.entries;
  ok(au.some((e) => e.target === id), 'Abruf protokolliert');
  // Fahrerakte ohne App-Konto: Auskunft nur der Fahrerakte
  const dr = await owner.post('/api/drivers', { display_name: 'Auskunft Ohne Konto', personnel_no: 'AUS-1' });
  eq(dr.status, 201);
  eq((await users.fleet.get(`/api/drivers/${dr.data.id}/data-export`)).status, 403);
  const y = (await owner.get(`/api/drivers/${dr.data.id}/data-export`)).data;
  eq(y.user, null); eq(y.driver_record.display_name, 'Auskunft Ohne Konto'); eq(y.reported_cases.length, 0, 'keine fremden Daten');
  ok(y.audit_about.length >= 1, 'Protokoll zur Fahrerakte enthalten');
});

await test('API-Doku vollständig: jeder /api/-Pfad des Routers steht in docs/API.md', async () => {
  const { readFileSync } = await import('node:fs');
  const w = readFileSync(new URL('../src/worker.js', import.meta.url), 'utf8'); const doc = readFileSync(new URL('../docs/API.md', import.meta.url), 'utf8');
  const lits = [...w.matchAll(/path === '(\/api\/[^']+)'/g)].map((m) => m[1]);
  const rx = [...w.matchAll(/path\.match\(\/\^(\\\/api[^$]*)\$\//g)].map((m) => m[1].replace(/\\\//g, '/').replace(/\([^)]*\)/g, ':id').replace(/\\/g, ''));
  const all = [...new Set([...lits, ...rx])];
  ok(all.length > 60, `Router-Pfade erkannt (${all.length})`);
  const segs = (p) => p.split('/').filter((x) => x && x !== 'api' && !x.startsWith(':'));
  const miss = all.filter((p) => !doc.includes(p) && !(doc.includes('/api/' + segs(p)[0]) && segs(p).slice(1).every((x) => doc.includes(x))));
  eq(miss.join(', '), '', 'undokumentierte Pfade');
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
