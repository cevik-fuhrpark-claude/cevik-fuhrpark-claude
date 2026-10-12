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
// Testdaten relativ zum heutigen Berliner Datum, damit die Suite an jedem Tag gleich läuft (Prüfung: scripts/zeitreise-test.sh)
const BERLIN_TODAY = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
const BERLIN_YM = BERLIN_TODAY.slice(0, 7);
const COST_TO = BERLIN_YM > '2026-12' ? BERLIN_YM : '2026-12'; // Testdaten teils fest auf 10/2026, teils heute gebucht
const HU_LAST = `${Number(BERLIN_TODAY.slice(0, 4)) - 1}${BERLIN_TODAY.slice(4, 8)}01`;
const HU_DUE = (() => { const [y, m] = BERLIN_YM.split('-').map(Number); return `${BERLIN_YM}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`; })();

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

await test('Push-Zustellung: höchstens 3 Schreibanweisungen, egal wie viele Empfänger/Geräte; Status je Hinweis korrekt', async () => {
  const { notifyUsers } = await import('../src/notify.js');
  const key = async () => b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])).publicKey)));
  const auth = () => b64urlEncode(crypto.getRandomValues(new Uint8Array(16)));
  for (let i = 0; i < 6; i++) eq((await users.driver.post('/api/push/subscribe', { endpoint: `https://push.example/ok/many-${i}`, keys: { p256dh: await key(), auth: auth() } })).status, 200);
  await users.driver.post('/api/push/subscribe', { endpoint: 'https://push.example/gone/many', keys: { p256dh: await key(), auth: auth() } });
  await users.driver2.post('/api/push/subscribe', { endpoint: 'https://push.example/fail/many', keys: { p256dh: await key(), auth: auth() } });
  const ids = [users.driver.id, users.driver2.id, users.dispatch.id];
  const q0 = QSTAT.n; const w0 = QSTAT.written;
  const n = await notifyUsers(env, null, 'test', ids, { kind: 'agent', title: 'Mehrgeräte-Test', body: 'x', eventKey: 'many-dev-' + rk(), urgent: true });
  eq(n, 3);
  ok(QSTAT.n - q0 <= 6, `Anweisungen gesamt ${QSTAT.n - q0} (Einfügen 2, Geräte 1, Schreiben ≤ 3)`);
  const rows = env.DB.db.prepare(`SELECT user_id, push_status, push_attempts, push_last_error, push_accepted_at FROM notifications WHERE title='Mehrgeräte-Test'`).all();
  const by = Object.fromEntries(rows.map((r) => [r.user_id, r]));
  eq(by[users.driver.id].push_status, 'accepted'); eq(by[users.driver.id].push_attempts, 1); ok(by[users.driver.id].push_accepted_at, 'Annahmezeit');
  eq(by[users.driver2.id].push_status, 'failed'); ok(/HTTP 500/.test(by[users.driver2.id].push_last_error), 'Fehler sichtbar'); eq(by[users.driver2.id].push_accepted_at, null);
  eq(by[users.dispatch.id].push_status, 'no_subscription'); eq(by[users.dispatch.id].push_attempts, 0);
  const subs = env.DB.db.prepare(`SELECT endpoint, revoked_at, last_success_at FROM push_subscriptions WHERE endpoint LIKE '%many%'`).all();
  ok(subs.filter((x) => /ok\/many/.test(x.endpoint)).every((x) => x.last_success_at && !x.revoked_at), '6 Geräte erfolgreich');
  ok(subs.find((x) => /gone/.test(x.endpoint)).revoked_at, 'abgemeldetes Gerät entwertet');
  ok(!subs.find((x) => /fail/.test(x.endpoint)).revoked_at, 'Fehler ≠ abgemeldet');
  ok(QSTAT.written - w0 >= 3 + 7, 'Zeilen tatsächlich geschrieben');
  // Aufräumen: Mehrgeräte-Abos würden spätere Tests (Pushzählungen) verfälschen
  env.DB.db.prepare(`DELETE FROM push_subscriptions WHERE endpoint LIKE '%many%'`).run();
});

await test('Push-Zustellung: höchstens N Netzaufrufe je Aufruf (Cloudflare-Grenze), Rest bleibt „pending“ und kommt per Cron; dringende zuerst', async () => {
  const { notifyUsers, retryFailedPush } = await import('../src/notify.js');
  const key = async () => b64urlEncode(new Uint8Array(await crypto.subtle.exportKey('raw', (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])).publicKey)));
  const auth = () => b64urlEncode(crypto.getRandomValues(new Uint8Array(16)));
  for (const [u, n] of [[users.driver, 2], [users.driver2, 1]]) for (let i = 0; i < n; i++) eq((await u.post('/api/push/subscribe', { endpoint: `https://push.example/ok/budget-${u.id}-${i}`, keys: { p256dh: await key(), auth: auth() } })).status, 200);
  env.__pushMaxSends = 2;
  try {
    const tag = 'Budget-Test ' + rk();
    // driver2 zuerst (1 Gerät), driver bräuchte 2 weitere → über der Grenze → bleibt pending; dispatch ohne Gerät
    eq(await notifyUsers(env, null, 'test', [users.driver2.id, users.driver.id, users.dispatch.id], { kind: 'agent', title: tag, body: 'x', eventKey: 'budget-' + rk() }), 3);
    let by = Object.fromEntries(env.DB.db.prepare('SELECT user_id, push_status, push_attempts FROM notifications WHERE title=?').all(tag).map((r) => [r.user_id, r]));
    eq(by[users.driver2.id].push_status, 'accepted'); eq(by[users.driver.id].push_status, 'pending', 'verschoben'); eq(by[users.driver.id].push_attempts, 0);
    eq(by[users.dispatch.id].push_status, 'no_subscription');
    // dringender Hinweis wird vorgezogen, auch wenn er später in der Liste steht
    const tag2 = 'Budget-Dringend ' + rk();
    const { deliverPush } = await import('../src/notify.js');
    const mk = (uid, urgent) => { const id = crypto.randomUUID(); env.DB.db.prepare(`INSERT INTO notifications(id,environment,user_id,case_id,event_key,kind,urgent,title,body,created_at,push_status) VALUES (?,?,?,?,?,?,?,?,?,?,'pending')`).run(id, 'test', uid, null, 'b2-' + id, 'agent', urgent ? 1 : 0, tag2, 'x', new Date().toISOString()); return { id, user_id: uid, title: tag2, body: 'x', urgent, case_id: null, kind: 'agent' }; };
    await deliverPush(env, [mk(users.driver2.id, false), mk(users.driver.id, true)]);
    by = Object.fromEntries(env.DB.db.prepare('SELECT user_id, push_status FROM notifications WHERE title=?').all(tag2).map((r) => [r.user_id, r]));
    eq(by[users.driver.id].push_status, 'accepted', 'dringend zuerst'); eq(by[users.driver2.id].push_status, 'pending');
    // Cron holt verschobene Hinweise (pending > 5 Min.) nach
    env.DB.db.prepare(`UPDATE notifications SET created_at=? WHERE title IN (?,?) AND push_status='pending'`).run(new Date(Date.now() - 6 * 60000).toISOString(), tag, tag2);
    env.__pushMaxSends = undefined;
    await retryFailedPush(env);
    ok(env.DB.db.prepare(`SELECT push_status FROM notifications WHERE title IN (?,?)`).all(tag, tag2).every((r) => r.push_status !== 'pending'), 'nachgeholt');
    eq(env.DB.db.prepare('SELECT push_status FROM notifications WHERE title=? AND user_id=?').get(tag, users.driver.id).push_status, 'accepted');
  } finally {
    env.__pushMaxSends = undefined;
    env.DB.db.prepare(`DELETE FROM push_subscriptions WHERE endpoint LIKE '%budget-%'`).run();
  }
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
  { // Ganzes Formular speichern: eine Schreibanweisung, Werte unverändert
    const cur = (await owner.get('/api/settings')).data;
    const all = Object.fromEntries(cur.keys.map((k) => [k, cur.values[k] ?? '']));
    eq((await owner.put('/api/settings', all)).status, 200);
    ok(QSTAT.perRequest.at(-1).n <= 8, `Einstellungen speichern: ${QSTAT.perRequest.at(-1).n} Abfragen für ${cur.keys.length} Felder`);
    const after = (await owner.get('/api/settings')).data.values;
    eq(after.workshop_hourly_rate_net, '95'); ok(cur.keys.every((k) => (after[k] ?? '') === (cur.values[k] ?? '')), 'Werte unverändert');
  }
  const d = await users.fleet.get(`/api/cases/${C1}`);
  eq(d.data.costs.actual_net, 71.25); eq(d.data.costs.unvalued_items, 1, 'Teil weiter unbewertet');
});
await test('Wartungsregel mit Nachweis; Fälligkeit erzeugt Befund', async () => {
  eq((await users.fleet.post(`/api/vehicles/${V1}/maintenance`, { kind: 'HU', next_due_date: '2026-10-20' })).status, 400, 'Nachweis Pflicht');
  for (const V of [V1, V2]) eq((await users.fleet.post(`/api/vehicles/${V}/spec`, { zgm_class: 'ueber_12', spec_source: 'Test: Fahrzeugschein F.2' })).status, 200);
  // HU vor 12 Monaten im laufenden Berliner Monat → fällig zum Monatsende (bald fällig, unabhängig vom Testdatum)
  const r = await users.fleet.post(`/api/vehicles/${V1}/maintenance`, { kind: 'HU', last_done_date: HU_LAST, interval_months: 12, evidence: 'Prüfbericht TÜV (Test)' });
  eq(r.status, 201); eq(r.data.next_due_date, HU_DUE, 'HU: 12 Kalendermonate, Fristende Monatsende');
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
  ok(hu && hu.next_due_date === HU_DUE && hu.plate === 'SZ-YC 5513', 'HU-Termin mit Kennzeichen');
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
  ok(cal.startsWith('BEGIN:VCALENDAR\r\n') && cal.includes('DTSTART;VALUE=DATE:' + HU_DUE.replace(/-/g, '')) && cal.includes('SUMMARY:HU fällig – SZ-YC 5513') && cal.includes('TRIGGER:-P30D'), 'Kalender mit HU-Termin und Erinnerung');
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
  // Standortfilter laut Fahrzeugstamm (Schreibweise egal); Summe über Standorte = alle
  const old = (await env.DB.prepare('SELECT site FROM vehicles WHERE id=?').bind(V1).first()).site;
  try {
    await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind('Reifen-Teststandort', V1).run();
    const all = (await users.fleet.get('/api/tires/fleet')).data;
    ok(all.site_options.includes('Reifen-Teststandort') && all.site === null, 'Auswahl');
    const one = (await users.fleet.get('/api/tires/fleet?site=REIFEN-TESTSTANDORT')).data;
    eq(one.site, 'Reifen-Teststandort'); eq(one.rows.length, 1); eq(one.rows[0].vehicle_id, V1); eq(one.totals.below_min, 1);
    let n = 0; for (const st of all.site_options) n += (await users.fleet.get(`/api/tires/fleet?site=${encodeURIComponent(st)}`)).data.rows.length;
    eq(n, all.rows.length, 'Summe über Standorte');
    eq((await users.fleet.get('/api/tires/fleet?site=GIBTSNICHT')).data.rows.length, 0);
  } finally { await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind(old, V1).run(); }
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
  ok(/Kabelbinder ohne Preis;Stk;;1;5;4;0;;;;\d{4}-\d\d-\d\d\r\n/.test(txt), 'ohne Preis: Wert leer, ohne Lieferant leer, letzter Zugang = Anfangsbestand');
  ok(txt.split('\r\n')[0].endsWith(';Letzter Lieferant;Letzter Zugang'), 'CSV-Kopf mit Lieferant');
  eq(r2.find((i) => i.id === np.data.id).last_supplier, null, 'kein Lieferant erfunden');
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
  { const c = d.data.candidates.find((x) => x.basis === 'zuordnung'); ok(/^\d{4}-\d{2}-\d{2}$/.test(c.since) && c.evidence.startsWith('Fahrzeugzuordnung seit ' + c.since), 'Kandidat: Zuordnungsdatum strukturiert, Nachweistext unverändert deutsch'); }
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
await test('Lesezugriff sieht Bußgelder ohne Fahreridentität und interne Notiz (wie CSV ohne Fahrer)', async () => {
  const viewer = await invite(owner, { username: 'test.lesen.fine', display_name: 'Test Lesezugriff Fine', role: 'viewer', environment: 'test' });
  const mgr = (await users.fleet.get('/api/fines')).data.fines.find((f) => f.id === FINE);
  ok(mgr.driver_id && mgr.driver_name, 'Fuhrparkleitung sieht den Fahrer');
  const l = (await viewer.get('/api/fines')).data.fines.find((f) => f.id === FINE);
  ok(l, 'Lesezugriff sieht das Schreiben');
  for (const k of ['driver_id', 'driver_name', 'driver_name_note', 'driver_evidence', 'driver_confirmed_by', 'note', 'created_by']) ok(!(k in l), `Liste ohne ${k}`);
  eq(l.driver_hidden, true, 'Hinweis „Fahrer ermittelt“'); eq(l.status, mgr.status);
  const d = await viewer.get(`/api/fines/${FINE}`);
  eq(d.status, 200); eq(d.data.driver_name, null); ok(!('driver_evidence' in d.data.fine) && !('driver_id' in d.data.fine));
  ok(!d.data.events && !d.data.candidates, 'kein Verlauf/keine Kandidaten'); eq(d.data.allowed_actions.length, 0);
  ok(!JSON.stringify(d.data).includes(mgr.driver_name), 'Name nirgends in der Antwort');
  const other = (await viewer.get('/api/fines')).data.fines.find((f) => f.id !== FINE);
  eq(other.driver_hidden, false, 'ohne ermittelten Fahrer: kein Hinweis');
  eq((await viewer.post(`/api/fines/${FINE}/commands`, { action: 'update', payload: {} })).status, 403, 'nur lesen');
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
  const r = await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}`);
  eq(r.status, 200);
  eq(r.data.totals.actual_net, Math.round(actual * 100) / 100, 'Summe belegt');
  eq(r.data.totals.estimate_net, Math.round(estimate * 100) / 100, 'Summe geschätzt');
  eq(r.data.totals.unvalued_items, unvalued, 'Unbewertete Positionen');
  ok(r.data.rows.length > 0 && r.data.rows.every((x) => x.plate && /^\d{4}-\d{2}$/.test(x.month)), 'Zeilen mit Kennzeichen und Monat');
  eq((await users.driver.get('/api/reports/costs')).status, 403);
  eq((await users.ws.get('/api/reports/costs')).status, 403);
  eq((await users.fleet.get('/api/reports/costs?from=2026-13')).status, 400);
  eq((await users.fleet.get('/api/reports/costs?from=2020-01&to=2026-12')).status, 400, 'max. 36 Monate');
  const csv = await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}&format=csv`);
  eq(csv.status, 200); ok((csv.headers.get('content-type') || '').startsWith('text/csv'));
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(csv.data);
  ok(text.startsWith('﻿Kennzeichen;'), 'BOM + Kopfzeile');
  eq(text.trim().split('\r\n').length, r.data.rows.length + 1);
  const { costReportCsv } = await import('../src/reports.js');
  const inj = costReportCsv({ rows: [{ plate: '=HYPERLINK("x")', vehicle_id: 'VIN:X', site: 'A;B', month: '2026-10', cases_opened: 1, hours: 1.5, work_net: null, parts_actual_net: 10.5, parts_estimate_net: 0, external_actual_net: 0, external_estimate_net: 0, actual_net: 10.5, estimate_net: 0, unvalued_items: 1, complete: false }] });
  ok(inj.includes(`"'=HYPERLINK(""x"")"`), 'Formel neutralisiert'); ok(inj.includes('"A;B"')); ok(inj.includes(';1,5;;10,5;'), 'Dezimalkomma, leere Arbeitszeit ohne Satz');
  const H = { authorization: 'Bearer integration-token-xyz' };
  const api = await anon.req('GET', `/api/integration/v1/costs?environment=test&from=2026-01&to=${COST_TO}`, undefined, H);
  eq(api.status, 200); eq(api.data.totals.actual_net, r.data.totals.actual_net);
});
await test('Kostenbericht: Summe je Standort = Summe der Zeilen (Standort laut Fahrzeugstamm, ohne = „ohne“)', async () => {
  const r = (await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}`)).data;
  ok(Array.isArray(r.sites) && r.sites.length > 0, 'sites vorhanden');
  const { siteKey, siteLabels } = await import('../src/reports.js');
  const K = (x) => (x === 'ohne' ? 'ohne' : siteKey(x));
  const exp = new Map();
  for (const x of r.rows) { const k = siteKey(x.site); const e = exp.get(k) || { a: 0, e: 0, u: 0, h: 0, v: new Set() }; e.a += x.actual_net; e.e += x.estimate_net; e.u += x.unvalued_items; e.h += x.hours; e.v.add(x.vehicle_id); exp.set(k, e); }
  eq(r.sites.length, exp.size, 'ein Eintrag je Standort');
  const rr = (x) => Math.round(x * 100) / 100;
  for (const s of r.sites) {
    const e = exp.get(K(s.site)); ok(e, `Standort ${s.site} aus den Zeilen`);
    eq(s.actual_net, rr(e.a)); eq(s.estimate_net, rr(e.e)); eq(s.unvalued_items, e.u); eq(s.hours, rr(e.h)); eq(s.vehicles, e.v.size); eq(s.complete, e.u === 0);
  }
  eq(rr(r.sites.reduce((a, s) => a + s.actual_net, 0)), r.totals.actual_net, 'Summe Standorte = Gesamtsumme');
  const iOhne = r.sites.findIndex((s) => s.site === 'ohne'); ok(iOhne === -1 || iOhne === r.sites.length - 1, '„ohne“ zuletzt');
  // Fahrzeugfilter: nur der Standort dieses Fahrzeugs
  const one = r.rows[0];
  const f = (await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}&vehicle_id=${encodeURIComponent(one.vehicle_id)}`)).data;
  eq(f.sites.length, 1); eq(K(f.sites[0].site), siteKey(one.site)); eq(f.sites[0].vehicles, 1);
  // Schreibweisen: Dortmund/DORTMUND/„ dortmund “ = ein Standort, Anzeige der häufigsten Schreibweise; leer = ohne
  const L = siteLabels([{ site: 'Dortmund' }, { site: 'DORTMUND' }, { site: ' Dortmund ' }, { site: null }, { site: '  ' }, { site: 'München' }]);
  eq(L.get('dortmund'), 'Dortmund'); eq(L.get('ohne'), 'ohne'); eq(L.get('münchen'), 'München'); eq(L.size, 3);
  const { STRINGS } = await import('../public/i18n.js');
  ok(['cs_title', 'cs_nosite', 'cs_vehicles', 'cs_rule'].every((k) => ['de', 'uk', 'en'].every((l) => STRINGS[l][k])), 'Texte DE/UK/EN');
});
await test('Fahrzeugliste: Standortauswahl fasst Schreibweisen zusammen (Dortmund/DORTMUND) wie Kostenbericht/Datenqualität', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const src = app.slice(app.indexOf('async function viewVehicles('), app.indexOf('\n}\n', app.indexOf('async function viewVehicles(')));
  ok(src.includes("(!site || sk(v.site) === sk(site))"), 'Filter ohne Groß-/Kleinschreibung');
  ok(src.includes("toLocaleLowerCase('de')"), 'gleicher Schlüssel wie siteKey');
  const { siteKey } = await import('../src/reports.js');
  const sk = (x) => (x ? String(x).trim().toLocaleLowerCase('de') : '');
  for (const x of ['Dortmund', 'DORTMUND', ' dortmund ', 'MÜNCHEN']) eq(sk(x), siteKey(x));
});
await test('Kostenbericht: Standortfilter (site=) wirkt auf Zeilen, Summen und CSV; Auswahlliste aller Standorte', async () => {
  const all = (await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}`)).data;
  const { siteKey } = await import('../src/reports.js');
  const K = (x) => (x === 'ohne' ? 'ohne' : siteKey(x));
  ok(Array.isArray(all.site_options) && all.site_options.length >= 1, 'site_options');
  eq(all.site, null);
  for (const s of all.sites) ok(all.site_options.includes(s.site), `Option ${s.site}`);
  for (const s of all.sites) {
    const f = (await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}&site=${encodeURIComponent(s.site)}`)).data;
    eq(f.site, s.site);
    ok(f.rows.every((x) => siteKey(x.site) === K(s.site)), 'nur Zeilen des Standorts');
    eq(f.totals.actual_net, s.actual_net, `Summe ${s.site}`); eq(f.totals.unvalued_items, s.unvalued_items);
    eq(f.rows.length, all.rows.filter((x) => siteKey(x.site) === K(s.site)).length);
    ok(f.vehicles.every((v) => siteKey(v.site) === K(s.site)), 'km/Fahrzeuge nur des Standorts');
    if (f.contract_costs) ok(f.contract_costs.vehicles.every((v) => siteKey(v.site) === K(s.site)), 'Vertragsraten nur des Standorts');
    eq(JSON.stringify(f.site_options), JSON.stringify(all.site_options), 'Auswahlliste bleibt vollständig');
  }
  const none = (await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}&site=${encodeURIComponent('Gibt-es-nicht')}`)).data;
  eq(none.rows.length, 0); eq(none.totals.actual_net, 0); eq(none.vehicles.length, 0);
  const s0 = all.sites[0];
  const csv = await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}&site=${encodeURIComponent(s0.site)}&format=csv`);
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(csv.data);
  eq(text.trim().split('\r\n').length, all.rows.filter((x) => siteKey(x.site) === K(s0.site)).length + 1, 'CSV nur Standort');
  if (s0.site !== 'ohne') eq((await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}&site=${encodeURIComponent(s0.site.toUpperCase())}`)).data.totals.actual_net, s0.actual_net, 'Filter unabhängig von Groß-/Kleinschreibung');
  console.log(`     Standorte im Testbestand: ${all.sites.map((x) => x.site).join(', ')}`);
  // zweiter Standort: ein Fahrzeug mit Kosten vorübergehend nach „MÜNCHEN“ (Schreibweise abweichend), danach zurück
  const mv = all.rows.find((x) => x.actual_net > 0) || all.rows[0];
  const old = (await env.DB.prepare('SELECT site FROM vehicles WHERE id=?').bind(mv.vehicle_id).first()).site;
  await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind('MÜNCHEN', mv.vehicle_id).run();
  try {
    const two = (await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}`)).data;
    ok(two.sites.length >= 2 && two.site_options.includes('MÜNCHEN'), 'zwei Standorte');
    eq(Math.round(two.sites.reduce((a, x) => a + x.actual_net, 0) * 100) / 100, two.totals.actual_net, 'Summe der Standorte = Gesamt');
    const mu = (await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}&site=m%C3%BCnchen`)).data;
    ok(mu.rows.length > 0 && mu.rows.every((x) => x.vehicle_id === mv.vehicle_id), 'nur das verschobene Fahrzeug');
    eq(mu.totals.actual_net, two.sites.find((x) => x.site === 'MÜNCHEN').actual_net);
    const rest = (await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}&site=${encodeURIComponent(s0.site)}`)).data;
    ok(rest.rows.every((x) => x.vehicle_id !== mv.vehicle_id), 'anderer Standort ohne das Fahrzeug');
  } finally { await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind(old, mv.vehicle_id).run(); }
});

await test('Kennzahlen: Reaktions-/Durchlaufzeiten je Priorität stimmen mit den Vorgängen überein; Rechte', async () => {
  const ym = BERLIN_YM; // Monate nach Berliner Zeit (wie der Bericht)
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
  // Filter je Werkstatt-Standort: Summe der Standorte = alle, unbekannter Standort = leer
  ok(r.data.sites.length >= 1, 'Standorte im Zeitraum');
  let sum = 0;
  for (const st of r.data.sites) { const x = await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}&site=${st}`); eq(x.data.site, st); sum += (x.data.by_priority.find((p) => p.priority === 'alle') || { created: 0 }).created; }
  eq(sum, r.data.by_priority.find((p) => p.priority === 'alle').created, 'Standorte ergeben zusammen alle Meldungen');
  eq((await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}&site=GIBTSNICHT`)).data.by_priority.length, 0, 'unbekannter Standort leer');
  eq((await users.driver.get('/api/reports/kpi')).status, 403);
  eq((await users.fleet.get('/api/reports/kpi?from=2026-13')).status, 400);
});

await test('Kennzahlen: Filter nach Fahrzeug-Standort (Fahrzeugstamm, Schreibweise egal), Summe der Standorte = alle', async () => {
  const ym = BERLIN_YM;
  const base = (await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}`)).data;
  const allN = (x) => (x.by_priority.find((p) => p.priority === 'alle') || { created: 0 }).created;
  const mv = base.vehicles[0]; ok(mv, 'Fahrzeug mit Vorgängen');
  const old = (await env.DB.prepare('SELECT site FROM vehicles WHERE id=?').bind(mv.vehicle_id).first()).site;
  try {
    await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind('KPI-Teststandort', mv.vehicle_id).run();
    const r = (await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}`)).data;
    ok(r.vehicle_sites.includes('KPI-Teststandort') && r.vehicle_sites.length >= 2, 'Standorte laut Fahrzeugstamm zur Auswahl');
    eq(r.vehicle_site, null);
    const one = (await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}&vsite=kpi-teststandort`)).data;
    eq(one.vehicle_site, 'KPI-Teststandort', 'Schreibweise zusammengefasst, Anzeige laut Stamm');
    eq(allN(one), mv.cases, 'nur Vorgänge des Fahrzeugs am Standort');
    ok(one.vehicles.every((v) => v.vehicle_id === mv.vehicle_id), 'je Fahrzeug nur dieser Standort');
    let sum = 0; let insp = 0;
    for (const vs of r.vehicle_sites) { const x = (await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}&vsite=${encodeURIComponent(vs)}`)).data; sum += allN(x); insp += x.inspection_defects.inspections; }
    eq(sum, allN(r), 'Fahrzeug-Standorte ergeben zusammen alle Meldungen');
    eq(insp, r.inspection_defects.inspections, 'Prüfungen ebenfalls nach Fahrzeug-Standort aufgeteilt');
    eq(allN((await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}&vsite=GIBTSNICHT`)).data), 0, 'unbekannter Standort leer');
    // kombinierbar mit Werkstattfilter
    const ws = r.sites[0];
    const both = (await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}&site=${ws}&vsite=KPI-Teststandort`)).data;
    ok(allN(both) <= allN(one), 'Werkstatt- und Fahrzeugfilter zusammen');
    // Integrations-API reicht den Parameter durch
    const ig = await anon.req('GET', `/api/integration/v1/kpi?from=${ym}&to=${ym}&vsite=KPI-Teststandort&environment=${one.environment}`, undefined, { authorization: 'Bearer integration-token-xyz' });
    eq(ig.status, 200); eq(allN(ig.data), mv.cases, 'Integration gleich');
  } finally { await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind(old, mv.vehicle_id).run(); }
});

await test('Kennzahlen als CSV: je Fahrzeug (alle, mit Standort) und je Dringlichkeit, Filter, Rechte, Protokoll, Formelschutz', async () => {
  const ym = BERLIN_YM;
  const r = (await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}`)).data;
  const dec = (x) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(x.data);
  const v = await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}&format=csv`);
  eq(v.status, 200); ok((v.headers.get('content-type') || '').startsWith('text/csv'));
  ok((v.headers.get('content-disposition') || '').includes('fuhrpark-kennzahlen-fahrzeuge_'), 'Dateiname');
  const vt = dec(v); ok(vt.startsWith('\ufeffKennzeichen;FIN-Schlüssel;Art;Standort;'), 'BOM + Kopfzeile');
  const vl = vt.trim().split('\r\n');
  eq(vl.length, r.vehicles.length + 1, 'alle Fahrzeuge (nicht nur 20)');
  ok(vl.slice(1).every((l) => l.split(';').length === 9), 'gleiche Spaltenzahl');
  ok(r.vehicles.every((x) => 'site' in x), 'Standort je Fahrzeug in der JSON-Antwort');
  const p = await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}&format=csv&part=priority`);
  const pl = dec(p).trim().split('\r\n');
  ok(pl[0].startsWith('Dringlichkeit;Meldungen;'), 'Kopfzeile Dringlichkeit'); // trim() entfernt das BOM
  eq(pl.length, r.by_priority.length + 1);
  const alle = pl.find((l) => l.startsWith('alle;')).split(';');
  const a = r.by_priority.find((x) => x.priority === 'alle');
  eq(Number(alle[1]), a.created, 'Meldungen wie JSON'); eq(Number(alle[5]), a.triage.n, 'Anzahl Erstbewertung');
  // Filter wirkt auch auf CSV
  const ws = r.sites[0];
  const f = (await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}&site=${ws}`)).data;
  eq(dec(await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}&site=${ws}&format=csv`)).trim().split('\r\n').length, f.vehicles.length + 1, 'Werkstattfilter');
  eq((await users.driver.get(`/api/reports/kpi?from=${ym}&to=${ym}&format=csv`)).status, 403);
  const viewer = await invite(owner, { username: 'test.lesen.kpicsv', display_name: 'Test Lesezugriff KPI', role: 'viewer', environment: 'test' });
  eq((await viewer.get(`/api/reports/kpi?from=${ym}&to=${ym}&format=csv`)).status, 200, 'Lesezugriff darf exportieren (wie Kostenbericht)');
  ok((await owner.get('/api/admin/audit?action=reports.kpi.export')).data.entries.length >= 3, 'protokolliert');
  const { kpiReportCsv } = await import('../src/reports.js');
  const inj = kpiReportCsv({ vehicles: [{ plate: '=X()', vehicle_id: 'VIN:X', kind: 'lkw', site: 'A;B', cases: 2, released: 1, workshop_h: 1.5, parts_wait_h: 0, locked_h: null }] });
  ok(inj.includes("'=X()") && inj.includes('"A;B"') && inj.includes(';2;1;1,5;0;\r\n'), 'Formelschutz, Dezimalkomma, leer statt 0');
});

await test('Standortauswahl (siteSelection): Schreibweisen zusammengefasst, „ohne“ zuletzt, Auswahl ohne Groß-/Kleinschreibung', async () => {
  const { siteSelection } = await import('../src/reports.js');
  const vs = [{ site: 'Dortmund' }, { site: 'DORTMUND' }, { site: ' Dortmund ' }, { site: null }, { site: '' }, { site: 'Hamburg' }];
  const a = siteSelection(vs, null);
  eq(JSON.stringify(a.options), JSON.stringify(['Dortmund', 'Hamburg', 'ohne'])); eq(a.site, null); ok(a.match('irgendwas') && a.match(null), 'ohne Auswahl alles');
  const b = siteSelection(vs, 'dortMUND');
  eq(b.site, 'Dortmund', 'Anzeige in häufigster Schreibweise'); ok(b.match('DORTMUND') && b.match(' dortmund') && !b.match('Hamburg') && !b.match(null));
  const c = siteSelection(vs, 'ohne');
  eq(c.site, 'ohne'); ok(c.match(null) && c.match('  ') && !c.match('Dortmund'), '„ohne“ = leerer Standort');
  const d = siteSelection(vs, 'Berlin');
  eq(d.site, 'Berlin', 'unbekannt wie übergeben'); ok(!vs.some((v) => d.match(v.site)), 'unbekannt trifft nichts');
});

await test('Prüftermine: Standortfilter (Fahrzeugstamm, Schreibweise egal) für Übersicht, CSV, Kalender und Integrations-API', async () => {
  const all = (await users.fleet.get('/api/maintenance')).data;
  eq(all.site, null);
  const mv = all.rows[0]; ok(mv, 'Fahrzeug mit Prüfterminen');
  const old = (await env.DB.prepare('SELECT site FROM vehicles WHERE id=?').bind(mv.vehicle_id).first()).site;
  try {
    await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind('PT-Teststandort', mv.vehicle_id).run();
    const base = (await users.fleet.get('/api/maintenance')).data;
    ok(base.site_options.includes('PT-Teststandort') && base.site_options.length >= 2, 'Auswahl');
    const one = (await users.fleet.get('/api/maintenance?site=pt-teststandort')).data;
    eq(one.site, 'PT-Teststandort');
    ok(one.rows.length > 0 && one.rows.every((r) => r.vehicle_id === mv.vehicle_id), 'nur Fahrzeuge des Standorts');
    ok(one.gaps.every((g) => g.vehicle_id === mv.vehicle_id));
    eq(one.totals.vehicles, 1, 'Fahrzeugzahl gefiltert');
    let rows = 0; let veh = 0; let gaps = 0;
    for (const st of base.site_options) { const x = (await users.fleet.get(`/api/maintenance?site=${encodeURIComponent(st)}`)).data; rows += x.rows.length; veh += x.totals.vehicles; gaps += x.gaps.length; }
    eq(rows, base.rows.length, 'Summe Zeilen'); eq(veh, base.totals.vehicles, 'Summe Fahrzeuge'); eq(gaps, base.gaps.length, 'Summe Lücken');
    ok((one.defects_without_case || []).every((d) => d.vehicle_id === mv.vehicle_id), 'Prüfmängel gefiltert');
    const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/maintenance?site=PT-Teststandort&format=csv')).data).trim().split('\r\n').slice(1);
    ok(csv.length > 0 && csv.every((l) => l.split(';')[1] === mv.vehicle_id), 'CSV nur Standort');
    const ics = new TextDecoder().decode((await users.fleet.get('/api/maintenance?site=PT-Teststandort&format=ics')).data);
    ok(ics.startsWith('BEGIN:VCALENDAR') && !base.rows.filter((r) => r.vehicle_id !== mv.vehicle_id && r.next_due_date).some((r) => ics.includes(r.plate)), 'Kalender ohne andere Fahrzeuge');
    eq((await users.fleet.get('/api/maintenance?site=GIBTSNICHT')).data.rows.length, 0, 'unbekannter Standort leer');
    const ig = await anon.req('GET', '/api/integration/v1/maintenance?site=PT-Teststandort', undefined, { authorization: 'Bearer integration-token-xyz' });
    eq(ig.status, 200); eq(ig.data.rows.length, one.rows.length, 'Integration gleich');
    ok(ig.data.defects_without_case.every((d) => d.vehicle_id === mv.vehicle_id) && ig.data.reinspection_pending.every((d) => d.vehicle_id === mv.vehicle_id), 'Integration: Listen gefiltert');
  } finally { await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind(old, mv.vehicle_id).run(); }
});

await test('Kennzahlen: Sperrzeit je Fahrzeug aus Sperre setzen/aufheben, Überschneidungen einmal', async () => {
  eq((await owner.post('/api/vehicles', { plate: 'KP-SP 1', vin: 'WDB96340310555501', site: 'Dortmund' })).status, 201);
  const VK = 'VIN:WDB96340310555501';
  const mk = async (desc) => (await users.fleet.post('/api/cases', { vehicle_id: VK, description: desc, priority: 'mittel', driveability: 'nicht_fahrbereit', request_key: rk() })).data.id;
  const a = await mk('Sperrzeit-Test A: Bremse'); const b = await mk('Sperrzeit-Test B: Reifen');
  const h = (n) => new Date(Date.now() - n * 3600000).toISOString();
  // A gesperrt seit 5 h, B seit 3 h (überschneidet) → 5 h; A wird vor 1 h aufgehoben, B bleibt offen → weiterhin 5 h
  await env.DB.prepare(`UPDATE case_events SET created_at=? WHERE case_id=? AND action='create'`).bind(h(5), a).run();
  await env.DB.prepare(`UPDATE case_events SET created_at=? WHERE case_id=? AND action='create'`).bind(h(3), b).run();
  const ca = (await users.fleet.get(`/api/cases/${a}`)).data.case;
  eq((await users.fleet.post(`/api/cases/${a}/commands`, { action: 'lift_safety_lock', command_id: rk(), expected_version: ca.version, note: 'Sichtprüfung: Bremse in Ordnung', payload: { confirm: true } })).status, 200);
  await env.DB.prepare(`UPDATE case_events SET created_at=? WHERE case_id=? AND action='lift_safety_lock'`).bind(h(1), a).run();
  const r = (await users.fleet.get(`/api/reports/kpi?from=${BERLIN_YM}&to=${BERLIN_YM}`)).data;
  const v = r.vehicles.find((x) => x.vehicle_id === VK);
  ok(v && Math.abs(v.locked_h - 5) < 0.05, 'Sperrzeit 5 h: ' + (v && v.locked_h));
  ok(r.definitions.locked_h, 'Definition');
  for (const id of [a, b]) { const c = (await users.fleet.get(`/api/cases/${id}`)).data.case; if (c.safety_lock) await users.fleet.post(`/api/cases/${id}/commands`, { action: 'lift_safety_lock', command_id: rk(), expected_version: c.version, note: 'Testende', payload: { confirm: true } }); const c2 = (await users.fleet.get(`/api/cases/${id}`)).data.case; await users.fleet.post(`/api/cases/${id}/commands`, { action: 'reject', command_id: rk(), expected_version: c2.version, note: 'Testdaten' }); }
  eq((await owner.post(`/api/vehicles/${VK}/active`, { active: false, reason: 'Testdaten Sperrzeit' })).status, 200);
});

await test('Abmeldung nach Leerlauf: Standard aus; Werkstatt-Zeit getrennt von anderen Rollen; Aktivität verlängert', async () => {
  const tab = await invite(owner, { username: 'test.tablet', display_name: 'Test Tablet DO', role: 'workshop', environment: 'test', workshop_site: 'DORTMUND' });
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  const setSeen = (id, min) => env.DB.prepare('UPDATE sessions SET last_seen=? WHERE user_id=?').bind(ago(min), id).run();
  await setSeen(tab.id, 120);
  eq((await tab.get('/api/me')).status, 200, 'Standard: keine Leerlauf-Abmeldung');
  eq((await owner.put('/api/settings', { idle_logout_workshop_min: 30 })).status, 200);
  try {
    await setSeen(tab.id, 20);
    eq((await tab.get('/api/me')).status, 200, '20 Min. < 30 Min.');
    const seen = (await env.DB.prepare('SELECT last_seen FROM sessions WHERE user_id=?').bind(tab.id).first()).last_seen;
    ok(Date.now() - Date.parse(seen) < 60000, 'Aktivität setzt Leerlauf zurück');
    await setSeen(tab.id, 31); await setSeen(users.fleet.id, 31);
    eq((await users.fleet.get('/api/me')).status, 200, 'andere Rollen nicht betroffen');
    eq((await tab.get('/api/me')).status, 401, 'Werkstatt nach 31 Min. abgemeldet');
    eq((await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?').bind(tab.id).first()).n, 0, 'Sitzung gelöscht');
  } finally { eq((await owner.put('/api/settings', { idle_logout_workshop_min: null })).status, 200); }
});

await test('Einstellung „Testkonten: Stammdaten nur lesen“: Standard aus; an → Testkonten ändern keine gemeinsamen Stammdaten, km nur an der Kontrolle', async () => {
  const vp = `/api/vehicles/${encodeURIComponent(V1)}`;
  const kmBefore = (await owner.get(vp)).data.odometer[0].km;
  eq((await users.fleet.post(`${vp}/odometer`, { km: kmBefore + 10 })).status, 201, 'Standard: erlaubt (bisheriges Verhalten)');
  eq((await users.fleet.put('/api/settings', { test_master_readonly: '1' })).status, 403, 'nur Inhaber');
  eq((await owner.put('/api/settings', { test_master_readonly: '1' })).status, 200);
  try {
    const r = await users.fleet.post(`${vp}/odometer`, { km: kmBefore + 20 });
    eq(r.status, 403); eq(r.data.error, 'test_readonly');
    eq((await users.fleet.post('/api/vehicles', { plate: 'RO-T 1', vin: 'WDB96340310555503' })).status, 403, 'Fahrzeug anlegen');
    eq((await users.ws.post(`${vp}/maintenance`, { kind: 'Ölwechsel', interval_km: 1000, last_done_km: 1, evidence: 'x' })).status, 403, 'Prüfregel');
    eq((await users.fleet.post(`${vp}/active`, { active: false, reason: 'x' })).status, 403, 'außer Betrieb');
    eq((await users.prodFleet.post(`${vp}/odometer`, { km: kmBefore + 30 })).status, 201, 'Betriebskonto unverändert');
    eq((await owner.post(`${vp}/odometer`, { km: kmBefore + 40 })).status, 201, 'Inhaber unverändert');
    const keys = (await users.driver.get('/api/meta')).data.checklist.map((i) => i.key);
    const ck = await users.driver.post('/api/inspections', { kind: 'abfahrt', vehicle_id: V1, request_key: rk(), items: keys.map((k) => ({ key: k, result: 'ok' })), odometer_km: kmBefore + 50 });
    eq(ck.status, 201, 'Kontrolle selbst geht'); eq(ck.data.km_test_only, true);
    eq((await owner.get(vp)).data.odometer[0].km, kmBefore + 40, 'km aus Testkontrolle nicht in der Akte');
    ok((await users.fleet.get('/api/cases')).status === 200 && (await users.fleet.get(vp)).status === 200, 'Lesen weiter möglich');
  } finally { eq((await owner.put('/api/settings', { test_master_readonly: null })).status, 200); }
  eq((await users.fleet.post(`${vp}/odometer`, { km: kmBefore + 60 })).status, 201, 'aus → wieder erlaubt');
});

await test('Sperre/Aufhebung erreicht die dem Fahrzeug zugeordneten Fahrer (ohne Zugriff auf den fremden Vorgang)', async () => {
  eq((await owner.post('/api/vehicles', { plate: 'ZF-SP 2', vin: 'WDB96340310555502', site: 'Dortmund' })).status, 201);
  const VZ = 'VIN:WDB96340310555502';
  const as = await users.fleet.post(`/api/vehicles/${VZ}/drivers`, { user_id: users.driver.id });
  eq(as.status, 201);
  const cid = (await users.fleet.post('/api/cases', { vehicle_id: VZ, description: 'Spiegel locker (Zuordnungstest)', priority: 'niedrig', driveability: 'fahrbereit', request_key: rk() })).data.id;
  const mine = async (kind) => (await users.driver.get('/api/notifications')).data.notifications.filter((n) => n.kind === kind && /ZF-SP 2/.test(n.body));
  eq((await mine('created')).length, 0, 'ohne Sperre keine Meldung an Fahrer');
  let c = (await users.fleet.get(`/api/cases/${cid}`)).data.case;
  eq((await users.fleet.post(`/api/cases/${cid}/commands`, { action: 'set_safety_lock', command_id: rk(), expected_version: c.version, note: 'Spiegelhalter gebrochen' })).status, 200);
  const lk = await mine('safety_lock');
  eq(lk.length, 1, 'zugeordneter Fahrer erfährt die Sperre'); eq(lk[0].case_id, null, 'ohne Link auf fremden Vorgang'); ok(lk[0].urgent, 'dringend');
  eq((await users.driver.get(`/api/cases/${cid}`)).status, 404, 'Vorgang bleibt für ihn unsichtbar');
  eq((await users.driver.patch('/api/me', { language: 'en' })).status, 200);
  { const nn = (await users.driver.get('/api/notifications')).data.notifications.filter((n) => n.kind === 'safety_lock'); ok(nn.some((n) => n.title === 'Vehicle locked'), 'Titel in der aktuellen Sprache ' + JSON.stringify(nn.map((n) => [n.title, n.case_id]))); }
  eq((await users.driver.patch('/api/me', { language: 'de' })).status, 200);
  c = (await users.fleet.get(`/api/cases/${cid}`)).data.case;
  eq((await users.fleet.post(`/api/cases/${cid}/commands`, { action: 'lift_safety_lock', command_id: rk(), expected_version: c.version, note: 'Halter getauscht', payload: { confirm: true } })).status, 200);
  eq((await mine('safety_lock_lifted')).length, 1, 'Aufhebung ebenfalls');
  c = (await users.fleet.get(`/api/cases/${cid}`)).data.case;
  await users.fleet.post(`/api/cases/${cid}/commands`, { action: 'reject', command_id: rk(), expected_version: c.version, note: 'Testdaten' });
  eq((await users.fleet.req('DELETE', `/api/assignments/${as.data.id}`)).status, 200);
  eq((await owner.post(`/api/vehicles/${VZ}/active`, { active: false, reason: 'Testdaten Zuordnung' })).status, 200);
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
await test('Oberflächen-Skripte sind syntaktisch gültig (ein Tippfehler, z. B. Apostroph in einem Text, legt sonst die ganze App lahm)', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  for (const f of readdirSync(new URL('../public/', import.meta.url)).filter((x) => x.endsWith('.js'))) {
    try { execFileSync(process.execPath, ['--check', new URL('../public/' + f, import.meta.url).pathname], { stdio: 'pipe' }); }
    catch (e) { const out = String(e.stderr || e); throw new Error(`public/${f}: ${(out.split('\n').find((l) => /SyntaxError/.test(l)) || 'Syntaxfehler').slice(0, 200)} (${(out.match(/:(\d+)\n/) || [])[1] ? 'Zeile ' + out.match(/:(\d+)\n/)[1] : ''})`); }
  }
  ok(readFileSync(new URL('../public/i18n.js', import.meta.url), 'utf8').length > 1000);
});
await test('CSP-tauglich: keine Inline-Event-Handler/Skripte; alle UI-Texte in DE/UK/EN vorhanden', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  ok(!/\son[a-z]+=["']/i.test(app) && !/\son[a-z]+=["']/i.test(html), 'Inline-Handler verstoßen gegen die CSP (script-src self)');
  ok(!/<script>(?!\s*<\/script>)/.test(html), 'kein Inline-Skript');
  // Jede direkt verdrahtete Schaltfläche ($('#id').onclick = …) steht in derselben Ansichtsfunktion im HTML (sonst bricht die Ansicht ab)
  const unwired = [];
  for (const c of app.split(/\n(?=(?:async )?function \w+\()/)) {
    const fn = (c.match(/^(?:async )?function (\w+)/) || [])[1] || '(Anfang)';
    for (const m of c.matchAll(/\$\('#([\w-]+)'\)\.on\w+ =/g)) if (!c.includes(`id="${m[1]}"`)) unwired.push(`${fn}: #${m[1]}`);
  }
  eq(unwired.join(', '), '', 'Handler ohne Element in derselben Ansicht');
  // Kalendertage in der Oberfläche nach Berliner Zeit (bDate/bYm), nicht UTC – sonst nachts bis 2 Uhr „gestern“ als Standarddatum
  eq((app.match(/toISOString\(\)\.slice\(0, (7|10)\)/g) || []).length, 1, 'nur bYm darf toISOString().slice für Kalenderdaten nutzen');
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
  const helpSrc = app.slice(app.indexOf('function helpSections('), app.indexOf('\n}\n', app.indexOf('function helpSections(')));
  const helpParts = new Set([...helpSrc.matchAll(/'([a-z]+)'/g)].map((m) => m[1]).filter((k) => `help_${k}_t` in STRINGS.de || !['owner', 'fleet', 'workshop', 'dispatch', 'driver', 'viewer', 'more', 'app_version', 'help'].includes(k)));
  ok(helpParts.has('stock') && helpParts.has('privacy') && helpParts.has('myveh'), 'Hilfe: Lager, Datenauskunft, Mein Fahrzeug');
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
  eq((await users.fleet.post(p, { km: 1300, measured_on: day(-2) })).status, 400, 'Zukunft abgewiesen'); // -2: UTC-Datum liegt nachts hinter Berlin
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
  eq((await users.ws.post(`/api/maintenance/${r1.data.id}/complete`, { done_date: BERLIN_TODAY, evidence: 'Werkstattauftrag Test', done_km: cur })).status, 200);
  ov = (await users.fleet.get('/api/maintenance')).data;
  eq(ov.rows.find((x) => x.id === r1.data.id).next_due_km, cur + 50000, 'neuer Zyklus ab Durchführung');
  // heute erledigt: km-Stand mit jetzigem Zeitpunkt – eine spätere Ablesung desselben Tages ist der neueste Wert (früher 12:00 UTC fest)
  const mk = (await owner.get(vp)).data.odometer.find((o) => o.source === 'wartung:Ölwechsel');
  ok(mk && mk.measured_at <= new Date().toISOString(), 'Durchführung heute nicht in der Zukunft datiert: ' + (mk && mk.measured_at));
  await owner.put('/api/settings', { maintenance_warn_km: null });
});

await test('km-Fälligkeit: Prognose aus gespeicherten km-Ständen (nur Planungshilfe, Status unverändert), Grenzfälle ohne Prognose', async () => {
  const { kmRate, kmForecastDate } = await import('../src/maintenance.js');
  const T = '2026-10-11';
  eq(kmRate({ km: 1000, measured_at: '2026-10-01' }, { km: 900, measured_at: '2026-09-25' }, T), null, '< 14 Tage Abstand');
  eq(kmRate({ km: 1000, measured_at: '2026-10-01' }, { km: 1000, measured_at: '2026-08-01' }, T), null, 'kein Anstieg');
  eq(kmRate({ km: 900, measured_at: '2026-10-01' }, { km: 1000, measured_at: '2026-08-01' }, T), null, 'Rückgang (Tachotausch)');
  eq(kmRate({ km: 5000, measured_at: '2026-06-01' }, { km: 1000, measured_at: '2026-04-01' }, T), null, 'letzte Ablesung > 90 Tage alt');
  eq(kmRate({ km: 1000, measured_at: '2026-10-01T08:00:00.000Z' }, null, T), null, 'nur eine Ablesung');
  const r = kmRate({ km: 3000, measured_at: '2026-10-01T08:00:00.000Z' }, { km: 1000, measured_at: '2026-09-01T12:00:00.000Z' }, T);
  eq(r.days, 30); eq(r.from, '2026-09-01'); eq(r.to, '2026-10-01');
  eq(kmForecastDate(1000, r, '2026-10-01T08:00:00.000Z'), '2026-10-16', '1000 km bei 66,7 km/Tag → 15 Tage (aufgerundet)');
  eq(kmForecastDate(0, r, '2026-10-01'), null, 'bereits fällig/überschritten: keine Prognose');
  eq(kmForecastDate(10000000, r, '2026-10-01'), null, '> 3 Jahre: keine Prognose');
  // Ende zu Ende: neues Fahrzeug, drei Ablesungen, km-Regel
  eq((await owner.post('/api/vehicles', { plate: 'KM-FC 1', vin: 'WDB96340310444401', site: 'Dortmund' })).status, 201);
  const V = 'VIN:WDB96340310444401'; const vp = `/api/vehicles/${encodeURIComponent(V)}`;
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const r0 = await users.fleet.post(`${vp}/maintenance`, { kind: 'Ölwechsel', interval_km: 20000, last_done_km: 100000, evidence: 'Testnachweis Prognose' });
  eq(r0.status, 201);
  const row = async () => (await users.fleet.get('/api/maintenance')).data.rows.find((x) => x.id === r0.data.id);
  eq((await row()).km_forecast, undefined, 'ohne km-Stand keine Prognose');
  eq((await users.fleet.post(`${vp}/odometer`, { km: 106000, measured_on: day(2) })).status, 201);
  eq((await row()).km_forecast, null, 'eine Ablesung: keine Prognose');
  eq((await users.fleet.post(`${vp}/odometer`, { km: 100000, measured_on: day(60) })).status, 201);
  eq((await users.fleet.post(`${vp}/odometer`, { km: 103000, measured_on: day(30) })).status, 201);
  const x = await row();
  eq(x.km_remaining, 14000); eq(x.status, 'ok', 'Status unverändert (Prognose zählt nicht)');
  const exp = new Date(Date.parse(day(2) + 'T00:00:00Z') + Math.ceil(14000 / (6000 / 58)) * 86400000).toISOString().slice(0, 10);
  eq(x.km_forecast.date, exp); eq(x.km_forecast.km_per_day, 103); eq(x.km_forecast.from, day(60)); eq(x.km_forecast.to, day(2));
  const akte = (await users.fleet.get(vp)).data.maintenance.find((m) => m.id === r0.data.id);
  eq(JSON.stringify(akte.km_forecast), JSON.stringify(x.km_forecast), 'Fahrzeugakte = Übersicht');
  const csv = new TextDecoder().decode((await users.fleet.get('/api/maintenance?format=csv')).data);
  ok(/km-Fälligkeit voraussichtlich \(Prognose\)/.test(csv) && csv.split('\r\n').some((l) => l.startsWith('KM-FC 1;') && l.endsWith(';' + exp)), 'CSV-Spalte mit Datum');
  const { STRINGS } = await import('../public/i18n.js');
  for (const lang of ['de', 'uk', 'en']) ok(STRINGS[lang].km_forecast.includes('{d}') && ['{from}', '{to}', '{kpd}'].every((k) => STRINGS[lang].km_forecast_hint.includes(k)), `Texte ${lang}`);
  // Filter „Prognose ≤ 30 Tage“ (Prüftermine): reine Anzeige-Funktion aus der App, Grenzen inklusiv
  const appSrc = (await import('node:fs')).readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const fcLine = appSrc.slice(appSrc.indexOf('const fcSoon = '), appSrc.indexOf('\n', appSrc.indexOf('const fcSoon = ')));
  const fcSoon = new Function(fcLine + '; return fcSoon;')();
  const today = new Date().toISOString().slice(0, 10);
  const inDays = Math.round((Date.parse(exp) - Date.parse(today)) / 86400000);
  eq(fcSoon(x, today, inDays), true, 'Prognose genau am Grenztag zählt');
  eq(fcSoon(x, today, inDays - 1), false, 'Prognose einen Tag nach der Grenze zählt nicht');
  eq(fcSoon({ km_forecast: null }, today), false); eq(fcSoon({}, today), false);
  eq(fcSoon({ km_forecast: { date: '2026-03-01' } }, '2026-01-30'), true, 'Monatswechsel/Februar: 30 Tage bis 01.03.');
  eq(fcSoon({ km_forecast: { date: '2026-03-02' } }, '2026-01-30'), false);
  ok(/f === 'fc30' \? fcSoon\(r, ov\.today\)/.test(appSrc), 'Prüftermine nutzen fcSoon als Filter');
  for (const lang of ['de', 'uk', 'en']) ok(STRINGS[lang].fc30_tab && STRINGS[lang].fc30_hint, `Filtertexte ${lang}`);
  // Standard-Nachweis der Fahrerzuordnung (Server speichert deutsch) wird in der Zeitleiste übersetzt – Texte müssen übereinstimmen
  const vehSrc = (await import('node:fs')).readFileSync(new URL('../src/vehicles.js', import.meta.url), 'utf8');
  const defEv = (vehSrc.match(/\|\| '(Zuordnung durch [^']+)'/) || [])[1];
  ok(defEv && appSrc.includes(`e === '${defEv}' ? t('ev_assign_default')`), 'App kennt den Standard-Nachweis des Servers');
  for (const lang of ['de', 'uk', 'en']) ok(STRINGS[lang].ev_assign_default, `Zuordnungstext ${lang}`);
  eq(STRINGS.de.ev_assign_default, defEv);
  eq((await users.fleet.post(`${vp}/active`, { active: false, reason: 'Testfahrzeug Prognose' })).status, 200, 'Testfahrzeug wieder außer Betrieb');
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
  // Flottenweite Nachweisliste „Durchgeführte Prüfungen“: Zeitraum, Prüfart, CSV mit Formelschutz, Rechte, Protokoll
  const hl = await users.fleet.get('/api/maintenance/history?from=2025-01-01&to=2025-12-31&kind=Inspektion');
  eq(hl.status, 200);
  const mine = hl.data.rows.filter((x) => x.vehicle_id === V2);
  eq(mine.map((x) => x.done_date).join(','), '2025-09-02,2025-03-01', 'nur Zeitraum 2025');
  eq(mine[1].source, 'erfasst'); ok(hl.data.by_kind.Inspektion >= 2);
  ok(!hl.data.rows.some((x) => x.kind !== 'Inspektion'), 'Filter Prüfart');
  eq((await users.fleet.get('/api/maintenance/history?from=2026-01-01&to=2025-01-01')).status, 400, 'von nach bis');
  eq((await users.fleet.get('/api/maintenance/history?from=01.01.2026')).status, 400, 'Datumsformat');
  eq((await users.ws.get('/api/maintenance/history')).status, 403, 'Werkstatt nicht');
  eq((await users.driver.get('/api/maintenance/history')).status, 403, 'Fahrer nicht');
  const hcsv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/maintenance/history?format=csv&from=2025-01-01&to=2026-12-31&kind=Inspektion')).data);
  ok(hcsv.startsWith('﻿Kennzeichen;FIN-Schlüssel;Fahrzeugart'), 'CSV-Kopf');
  ok(hcsv.includes(';2026-09-01;') && hcsv.includes(';Import;') && hcsv.includes(';2025-09-02;'), 'CSV-Zeilen');
  ok((await owner.get('/api/admin/audit?action=maintenance.history_export')).data.entries.length >= 1, 'Export protokolliert');
  const ih = await anon.req('GET', '/api/integration/v1/maintenance/history?from=2025-01-01&to=2025-12-31&kind=Inspektion', undefined, { authorization: 'Bearer integration-token-xyz' });
  eq(ih.status, 200); ok(ih.data.events.some((x) => x.vehicle_id === V2 && x.done_date === '2025-09-02'), 'Integrations-API Historie');
  ok(!('recorded_by_name' in ih.data.events[0]), 'ohne Namen');
  eq((await anon.req('GET', '/api/integration/v1/maintenance/history')).status, 401, 'ohne Token');
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
await test('Gespann: Sperre des gekoppelten Anhängers in Fahrzeugliste, „Mein Fahrzeug“ und /v1/availability (nur Information)', async () => {
  const T = 'VIN:VAK656EBDG1613170'; // Anhänger SZ-YC 5514, laut Stammliste an SZ-YC 5513 (V1) gekoppelt
  const before = (await users.fleet.get('/api/vehicles')).data.vehicles;
  const v1Before = before.find((v) => v.id === V1);
  eq(v1Before.coupled.id, T, 'Lkw kennt Anhänger'); eq(v1Before.coupled.kind, 'anhaenger');
  eq(before.find((v) => v.id === T).coupled.id, V1, 'Anhänger kennt Zugmaschine');
  ok(before.filter((v) => !v.trailer_id && !v.truck_id).every((v) => v.coupled === null), 'ohne Kopplung: null');
  const c = await users.fleet.post('/api/cases', { vehicle_id: T, description: 'Bremsleitung Anhänger undicht (Test Gespann)', priority: 'kritisch', driveability: 'nicht_fahrbereit', request_key: rk() });
  eq(c.status, 201);
  const cs = (await users.fleet.get(`/api/cases/${c.data.id}`)).data.case;
  if (!cs.safety_lock) eq((await users.fleet.post(`/api/cases/${cs.id}/commands`, { action: 'safety_lock', command_id: rk(), expected_version: cs.version, reason: 'Bremse' })).status, 200);
  const list = (await users.fleet.get('/api/vehicles')).data.vehicles;
  const v1 = list.find((v) => v.id === V1);
  eq(v1.coupled.availability, 'gesperrt', 'Lkw zeigt gesperrten Anhänger');
  eq((await users.fleet.get(`/api/vehicles/${V1}`)).data.coupled[0].locked, true, 'Fahrzeugakte: Anhänger gesperrt');
  eq((await users.prodFleet.get(`/api/vehicles/${V1}`)).data.coupled[0].locked, false, 'Fahrzeugakte Betrieb: Test-Sperre nicht sichtbar');
  eq(v1.availability, v1Before.availability, 'eigene Verfügbarkeit des Lkw unverändert');
  ok(/markToggles\(document\.getElementById\('app'\)\)/.test((await import('node:fs')).readFileSync(new URL('../public/app.js', import.meta.url), 'utf8')), 'Filterknöpfe mit aria-pressed');
  ok(/coupled_locked/.test((await import('node:fs')).readFileSync(new URL('../public/app.js', import.meta.url), 'utf8')), 'Fahrzeugliste: Filter „Gespann gesperrt“');
  const vcsv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/vehicles?format=csv')).data).split('\r\n');
  const vh = vcsv[0].replace(/^\ufeff/, '').split(';');
  const ci = vh.indexOf('Gekoppeltes Fahrzeug'), zi = vh.indexOf('Zustand gekoppeltes Fahrzeug');
  ok(ci > 0 && zi === ci + 1, 'CSV-Spalten Gespann');
  const row = (plate) => vcsv.find((l) => l.split(';')[0] === plate)?.split(';');
  eq(row(v1.plate)[ci], 'SZ-YC 5514'); eq(row(v1.plate)[zi], 'gesperrt', 'CSV: Lkw zeigt gesperrten Anhänger');
  eq(row('SZ-YC 5514')[ci], v1.plate, 'CSV: Anhänger nennt Zugfahrzeug');
  ok(vcsv.slice(1).filter((l) => l).every((l) => l.split(';').length === vh.length), 'CSV: gleiche Spaltenzahl je Zeile');
  eq((await users.driver.get('/api/vehicles')).data.vehicles.find((v) => v.id === V1).coupled.availability, 'gesperrt', 'auch für Fahrer');
  const mv = (await users.driver.get('/api/me/vehicles')).data.vehicles.find((v) => v.id === V1);
  eq(mv.coupled.id, T); eq(mv.coupled.plate, 'SZ-YC 5514'); eq(mv.coupled.locked, true, 'Mein Fahrzeug: Anhänger gesperrt');
  eq(mv.locked, v1Before.availability === 'gesperrt', 'Sperre des Lkw selbst unverändert (eigene Vorgänge)');
  ok(!mv.known_defects.some((k) => k.case_no === c.data.case_no), 'Anhänger-Mängel nicht als Mängel des Lkw');
  const av = await anon.req('GET', '/api/integration/v1/availability?environment=test', undefined, { authorization: 'Bearer integration-token-xyz' });
  eq(av.status, 200);
  eq(av.data.vehicles.find((v) => v.id === V1).coupled.availability, 'gesperrt', 'Integrations-API');
  eq((await anon.req('GET', '/api/integration/v1/availability?environment=production', undefined, { authorization: 'Bearer integration-token-xyz' })).data.vehicles.find((v) => v.id === V1).coupled.availability === 'gesperrt', false, 'Betrieb sieht Test-Sperre nicht');
  // Ausgangszustand: Sperre fachlich aufheben, Meldung ablehnen
  let cur = (await users.fleet.get(`/api/cases/${c.data.id}`)).data.case;
  eq((await users.fleet.post(`/api/cases/${cur.id}/commands`, { action: 'lift_safety_lock', command_id: rk(), expected_version: cur.version, note: 'Testdaten', payload: { confirm: true } })).status, 200);
  cur = (await users.fleet.get(`/api/cases/${c.data.id}`)).data.case;
  eq((await users.fleet.post(`/api/cases/${cur.id}/commands`, { action: 'reject', command_id: rk(), expected_version: cur.version, note: 'Testdaten' })).status, 200);
  eq((await users.driver.get('/api/me/vehicles')).data.vehicles.find((v) => v.id === V1).coupled.locked, false, 'nach Ablehnung nicht mehr gesperrt');
});

await test('Datenqualität: Widersprüche und Lücken aus Stammdaten, nur Inhaber/Fuhrparkleitung, ändert nichts', async () => {
  eq((await users.ws.get('/api/admin/data-quality')).status, 403);
  // Lkw mit Anhängerkennzeichen, das es nicht gibt; zweites Fahrzeug mit gleichem Kennzeichen (anders geschrieben)
  eq((await owner.post('/api/vehicles', { plate: 'DQ-XY 1', vin: 'WDB96340310999001', trailer_plate: 'DQ-AH 404' })).status, 201);
  eq((await owner.post('/api/vehicles', { plate: 'DQ XY1', vin: 'WDB96340310999002', site: 'Dortmund' })).status, 201);
  // fest gekoppeltes Gespann mit unterschiedlichem bzw. gleichem Standort
  for (const [plate, vin, site, extra] of [['DQ-GS 1', 'WDB96340310999003', 'Dortmund', { trailer_plate: 'DQ-GA 1' }], ['DQ-GA 1', 'WDB96340310999004', 'Hamm', { kind: 'anhaenger' }],
    ['DQ-GS 2', 'WDB96340310999005', 'Dortmund', { trailer_plate: 'DQ-GA 2' }], ['DQ-GA 2', 'WDB96340310999006', 'dortmund ', { kind: 'anhaenger' }]]) {
    eq((await owner.post('/api/vehicles', { plate, vin, site, ...extra })).status, 201);
  }
  // Prüfung mit erheblichen Mängeln ohne Vorgang danach → Hinweis; nach einer Meldung zum Fahrzeug nicht mehr
  const dqDay = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() - 3 * 86400000));
  const dqRule = await users.fleet.post('/api/vehicles/VIN:WDB96340310999002/maintenance', { kind: 'UVV', last_done_date: '2025-01-10', interval_months: 12, evidence: 'DQ-Test' });
  eq((await users.fleet.post(`/api/maintenance/${dqRule.data.id}/complete`, { done_date: dqDay, evidence: 'UVV-Protokoll DQ', result: 'erhebliche_maengel' })).status, 200);
  const before = (await env.DB.prepare('SELECT COUNT(*) AS n FROM vehicles').first()).n;
  const r = await users.fleet.get('/api/admin/data-quality');
  eq(r.status, 200);
  const has = (check, vin) => r.data.items.some((i) => i.check === check && (!vin || i.vehicle_id === 'VIN:' + vin));
  ok(has('duplicate_plate', 'WDB96340310999001') && has('duplicate_plate', 'WDB96340310999002'), 'gleiches Kennzeichen');
  ok(has('trailer_unknown', 'WDB96340310999001'), 'unbekannter Anhänger');
  const gs = r.data.items.filter((i) => i.check === 'coupled_site_mismatch');
  ok(gs.some((i) => i.vehicle_id === 'VIN:WDB96340310999003' && i.detail === 'Dortmund · DQ-GA 1: Hamm' && i.severity === 'hinweis'), 'Gespann an verschiedenen Standorten');
  ok(!gs.some((i) => i.vehicle_id === 'VIN:WDB96340310999005'), 'gleicher Standort (Groß-/Kleinschreibung egal): kein Hinweis');
  ok(has('missing_site', 'WDB96340310999001') && !has('missing_site', 'WDB96340310999002'), 'fehlender Standort');
  const sp = r.data.items.filter((i) => i.check === 'site_spelling');
  ok(sp.some((i) => i.vehicle_id === 'VIN:WDB96340310999006' && i.detail === 'dortmund → Dortmund' && i.severity === 'hinweis'), 'abweichende Schreibweise des Standorts');
  ok(!sp.some((i) => i.vehicle_id === 'VIN:WDB96340310999005' || i.vehicle_id === 'VIN:WDB96340310999004'), 'häufigste Schreibweise bzw. anderer Standort: kein Hinweis');
  ok(has('no_km', 'WDB96340310999001'), 'kein km-Stand');
  ok(r.data.items.find((i) => i.check === 'inspection_defects_no_case' && i.vehicle_id === 'VIN:WDB96340310999002')?.detail.includes('erhebliche Mängel'), 'Mängel ohne Vorgang');
  const dqc = await users.fleet.post('/api/cases', { vehicle_id: 'VIN:WDB96340310999002', description: 'UVV-Mängel beseitigen (DQ-Test)', priority: 'mittel', driveability: 'fahrbereit', request_key: rk() }); eq(dqc.status, 201);
  ok(!(await users.fleet.get('/api/admin/data-quality')).data.items.some((i) => i.check === 'inspection_defects_no_case' && i.vehicle_id === 'VIN:WDB96340310999002'), 'nach Meldung erledigt');
  eq((await users.fleet.post(`/api/cases/${dqc.data.id}/commands`, { action: 'reject', command_id: rk(), expected_version: 1, note: 'nur Datenqualitäts-Test' })).status, 200, 'Testvorgang schließen');
  ok(r.data.items.find((i) => i.check === 'missing_inspection' && i.vehicle_id === 'VIN:WDB96340310999001').detail.includes('HU'), 'fehlende Pflichtprüfung');
  eq(r.data.items[0].severity, 'fehler', 'Fehler zuerst');
  ok(r.data.items.find((i) => i.check === 'vin_similar' && i.vehicle_id === 'VIN:WDB96340310999001')?.detail === 'DQ XY1 · WDB96340310999002 · #17', 'FIN fast gleich (Stelle 17)');
  const { similarVins } = await import('../src/quality.js');
  const sv = (a, b) => similarVins([{ id: 1, vin: a, plate: 'A' }, { id: 2, vin: b, plate: 'B' }]).map((x) => x[2]);
  eq(sv('WDB96340510318431', 'WDB96300510318431').join(), '7,7', 'eine Stelle (Fall SZ-YC 5539)');
  eq(sv('WDB96340510318431', 'WDB96430510318431').join(), '6,6', 'Zahlendreher');
  eq(sv('WDB96340510318431', 'WDB96340510318499').length, 0, 'zwei Stellen: kein Tippfehler');
  eq(sv('WDB96340510318431', 'WDB96340510318431').length, 0, 'gleiche FIN: dafür gibt es keine zweite Anlage');
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
  // CSV: eine Zeile je Standort × Woche, Stundensumme gleich, offene Aufträge nur in der jüngsten Woche, Werkstatt nur eigener Standort
  const csv = await users.fleet.get('/api/reports/workshop-load?weeks=4&format=csv');
  eq(csv.status, 200); ok((csv.headers.get('content-type') || '').startsWith('text/csv'));
  const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(csv.data);
  ok(text.startsWith('\ufeffStandort;Werkstatt-Code;Kalenderwoche;Stunden;'), 'BOM + Kopfzeile');
  const lines = text.trim().split('\r\n').slice(1).map((l) => l.split(';'));
  eq(lines.length, r.data.sites.length * 4, 'Standort × Woche');
  ok(Math.abs(lines.reduce((a, l) => a + Number(l[3].replace(',', '.')), 0) - sumHours) < 0.01, 'Stundensumme im CSV');
  const lastW = r.data.weeks[3];
  ok(lines.every((l) => (l[2] === lastW) === (l[6] !== '')), 'offene Aufträge nur in der jüngsten Woche');
  for (const s of r.data.sites) eq(Number(lines.find((l) => l[1] === s.site && l[2] === lastW)[7]), s.open.in_reparatur || 0, 'offen in Reparatur');
  const wcsv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.ws.get('/api/reports/workshop-load?format=csv')).data).trim().split('\r\n').slice(1);
  ok(wcsv.length > 0 && wcsv.every((l) => l.split(';')[1] === 'DORTMUND'), 'Werkstatt-CSV nur eigener Standort');
  eq((await users.driver.get('/api/reports/workshop-load?format=csv')).status, 403);
  ok((await owner.get('/api/admin/audit?action=reports.workshop_load.export')).data.entries.length >= 2, 'protokolliert');
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

await test('Vorgänge: Filter Fahrzeug-Standort (Schreibweise/Umlaute egal, Summe = alle, vor dem LIMIT), CSV gefiltert, Fahrer ohne Auswahl', async () => {
  const dec = (r) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(r.data);
  const old = (await env.DB.prepare('SELECT site FROM vehicles WHERE id=?').bind(V1).first()).site;
  const other = await env.DB.prepare('SELECT id, site FROM vehicles WHERE id<>? AND id NOT IN (SELECT vehicle_id FROM cases) LIMIT 1').bind(V1).first();
  try {
    await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind(' MÜNCHEN ', V1).run();
    await env.DB.prepare(`UPDATE vehicles SET site='München' WHERE id=?`).bind(other.id).run();
    const all = (await users.fleet.get('/api/cases?limit=500')).data;
    eq(all.site, null);
    ok(all.site_options.includes('München'), 'Auswahl mit häufigster Schreibweise: ' + all.site_options.join(','));
    const m = (await users.fleet.get('/api/cases?limit=500&vsite=münchen')).data;
    eq(m.site, 'München');
    const v1n = all.cases.filter((c) => c.vehicle_id === V1).length; ok(v1n > 0, 'V1 hat Vorgänge');
    eq(m.cases.length, v1n, 'Umlaut-Schreibweise egal (JS statt SQLite-lower)'); ok(m.cases.every((c) => c.vehicle_id === V1));
    const ids = (l) => l.map((c) => c.id).sort();
    const union = [];
    for (const o of all.site_options) union.push(...(await users.fleet.get(`/api/cases?limit=500&vsite=${encodeURIComponent(o)}`)).data.cases.map((c) => c.id));
    eq(JSON.stringify(union.sort()), JSON.stringify(ids(all.cases)), 'Summe über alle Fahrzeug-Standorte = alle');
    eq((await users.fleet.get('/api/cases?vsite=Nirgendwo')).data.cases.length, 0, 'unbekannter Standort leer');
    eq((await users.fleet.get('/api/cases?vsite=M%C3%BCnchen&limit=1')).data.cases[0].vehicle_id, V1, 'Filter vor LIMIT');
    const mo = (await users.fleet.get('/api/cases?vsite=M%C3%BCnchen&status=open&limit=500')).data.cases;
    ok(mo.every((c) => c.vehicle_id === V1 && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)), 'kombinierbar mit Status');
    const csv = dec(await users.fleet.get('/api/cases?format=csv&vsite=M%C3%BCnchen'));
    eq(csv.trim().split('\r\n').length - 1, v1n, 'CSV gefiltert');
    const ws = (await users.ws.get('/api/cases?limit=500&vsite=M%C3%BCnchen')).data.cases;
    ok(ws.every((c) => c.vehicle_id === V1), 'Werkstatt: Filter innerhalb der eigenen Sicht');
    const dr = (await users.driver.get('/api/cases?vsite=Nirgendwo')).data;
    ok(dr.cases.length > 0 && dr.site === null && dr.site_options.length === 0, 'Fahrer: Filter wirkungslos, keine Auswahl');
  } finally {
    await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind(old, V1).run();
    await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind(other.site, other.id).run();
  }
});

await test('Mein Standard-Standort: speichern/leeren, nur Anzeige (keine Rechte), Fahrer nicht; Standortauswahl /api/sites', async () => {
  const sites = (await users.dispatch.get('/api/sites')).data.sites;
  ok(sites.length >= 1 && sites.includes('Dortmund'), 'Auswahl aus dem Fahrzeugstamm: ' + sites.join(','));
  eq((await users.driver.get('/api/sites')).status, 403, 'Fahrer: keine Standortauswahl');
  eq((await users.dispatch.get('/api/me')).data.user.home_site, null, 'Standard: keiner');
  eq((await users.dispatch.req('PATCH', '/api/me', { home_site: '  Dortmund ' })).status, 200);
  eq((await users.dispatch.get('/api/me')).data.user.home_site, 'Dortmund', 'gespeichert (getrimmt)');
  eq((await users.dispatch.req('PATCH', '/api/me', { language: 'uk' })).status, 200);
  eq((await users.dispatch.get('/api/me')).data.user.home_site, 'Dortmund', 'Sprachwechsel lässt Standort unverändert');
  const all = (await users.dispatch.get('/api/cases?limit=500')).data;
  eq(all.site, null, 'keine serverseitige Einschränkung – nur Voreinstellung in der App');
  eq((await users.dispatch.req('PATCH', '/api/me', { home_site: 'x'.repeat(61) })).status, 400, 'zu lang');
  eq((await users.dispatch.req('PATCH', '/api/me', { home_site: '' })).status, 200);
  eq((await users.dispatch.get('/api/me')).data.user.home_site, null, 'geleert');
  eq((await users.dispatch.req('PATCH', '/api/me', { language: 'de' })).status, 200);
  eq((await users.driver.req('PATCH', '/api/me', { home_site: 'Dortmund' })).status, 403, 'Fahrer');
  // App: alle Standortfilter lesen die Voreinstellung über vsDef (keine direkte Verwendung mehr)
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  for (const k of ['costSite', 'defSite', 'fineSite', 'maintSite', 'tireSite', 'vehSite', 'caseVsite', 'kpiVsite', 'planVsite', 'dqSite', 'ctSite', 'claimSite', 'tachoSite', 'drvSite']) {
    const direct = [...src.matchAll(new RegExp('S\\.' + k + '\\b(?! = )', 'g'))].length;
    eq(direct, 0, k + ': nur über vsDef gelesen');
    ok(src.includes(`vsDef('${k}')`), k + ' nutzt vsDef');
  }
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
  // Sammelabfragen liefern exakt dieselben Zeilen wie SELECT * je Tabelle (Werte, Typen, NULL, Sonderzeichen)
  const norm = (rows) => rows.map((r) => JSON.stringify(Object.keys(r).sort().map((k) => [k, r[k]]))).sort();
  const diff = [];
  for (const t of BACKUP_TABLES) {
    if (t === 'audit_log') continue; // der Abruf selbst schreibt einen Protokolleintrag
    const direct = (await env.DB.prepare(`SELECT * FROM ${t}`).all()).results;
    if (JSON.stringify(norm(direct)) !== JSON.stringify(norm(j.data[t]))) diff.push(t);
  }
  eq(diff.join(','), '', 'Sicherung = SELECT * je Tabelle');
  const { TABLE_COLUMNS } = await import('../src/schema.js');
  for (const t of tables) eq((TABLE_COLUMNS[t] || []).join(','), (await env.DB.prepare(`SELECT name FROM pragma_table_info(?)`).bind(t).all()).results.map((c) => c.name).join(','), 'Spalten aus dem Build = Datenbank: ' + t);
  ok(Math.max(...Object.values(TABLE_COLUMNS).map((c) => c.length)) <= 60, 'höchstens 60 Spalten je Tabelle (2 json_array à 30 Argumente)');
  // Rückfall: weicht die Datenbank vom Schema ab (Spalte fehlt), wird die Gruppe je Tabelle mit SELECT * gelesen
  TABLE_COLUMNS.workshops.push('spalte_gibt_es_nicht');
  try {
    const fb = await owner.get('/api/admin/backup');
    const fj = fb.data instanceof Uint8Array ? JSON.parse(new TextDecoder().decode(fb.data)) : fb.data;
    eq(fb.status, 200); eq(JSON.stringify(norm(fj.data.workshops)), JSON.stringify(norm((await env.DB.prepare('SELECT * FROM workshops').all()).results)), 'Rückfall vollständig');
    eq(fj.counts.cases, j.counts.cases, 'übrige Gruppen unverändert');
  } finally { TABLE_COLUMNS.workshops.pop(); }
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

await test('Lagerjournal: Buchungen je Zeitraum (Berliner Datum), Wert nur mit Preis, Summen, nur eigenes Lager, CSV ohne Personen', async () => {
  const def = await users.ws.get('/api/stock/journal');
  eq(def.status, 200); const today = def.data.to; eq(def.data.from, today.slice(0, 8) + '01', 'Standard: laufender Monat');
  const from = new Date(Date.parse(today) - 300 * 86400000).toISOString().slice(0, 10);
  const j = (await users.ws.get(`/api/stock/journal?from=${from}&to=${today}`)).data;
  ok(j.movements.length >= 5, `Buchungen vorhanden (${j.movements.length})`);
  ok(j.movements.every((m) => m.site === 'DORTMUND'), 'nur eigenes Lager');
  ok(j.movements.every((m, i, a) => !i || a[i - 1].created_at <= m.created_at), 'zeitlich aufsteigend');
  // Abgleich mit den Artikelbewegungen: gleiche Anzahl je Artikel
  const items = (await users.ws.get('/api/stock')).data.items;
  for (const it of items) eq(j.movements.filter((m) => m.item_id === it.id).length, (await users.ws.get(`/api/stock/${it.id}`)).data.movements.length, `Anzahl ${it.name}`);
  // Wert: Menge × Preis; ohne Preis null (nie 0)
  for (const m of j.movements) { if (m.unit_price_net === null) eq(m.value_net, null, 'ohne Preis unbewertet'); else eq(m.value_net, Math.round(m.qty * m.unit_price_net * 100) / 100, 'Wert'); }
  ok(j.movements.some((m) => m.unit_price_net === null), 'Beispiel ohne Preis enthalten');
  const withCase = j.movements.find((m) => m.case_no); ok(withCase && withCase.type === 'entnahme' && withCase.plate, 'Entnahme aus Vorgang mit Vorgangsnummer und Kennzeichen');
  for (const t of ['zugang', 'entnahme', 'korrektur']) {
    const xs = j.movements.filter((m) => m.type === t);
    eq(j.summary[t].count, xs.length, `Anzahl ${t}`); eq(j.summary[t].unvalued, xs.filter((m) => m.value_net === null).length, `unbewertet ${t}`);
    eq(j.summary[t].value_net, Math.round(xs.reduce((a, m) => a + (m.value_net || 0), 0) * 100) / 100, `Summe ${t}`);
  }
  ok(!JSON.stringify(j).includes('user_id') && !JSON.stringify(j).includes('display_name'), 'keine Personen');
  const only = (await users.ws.get(`/api/stock/journal?from=${from}&to=${today}&type=entnahme`)).data;
  eq(only.movements.length, j.summary.entnahme.count, 'Filter Buchungsart');
  eq((await users.ws.get(`/api/stock/journal?from=${from}&to=${today}&type=diebstahl`)).status, 400, 'unbekannte Art');
  eq((await users.ws.get('/api/stock/journal?from=2026-02-30&to=2026-03-01')).status, 400, 'kein Kalenderdatum');
  eq((await users.ws.get(`/api/stock/journal?from=${today}&to=${from}`)).status, 400, 'von nach bis');
  eq((await users.ws.get('/api/stock/journal?from=2024-01-01&to=2025-06-01')).status, 400, 'höchstens ein Jahr');
  eq((await users.ws.get(`/api/stock/journal?from=${from}&to=${from}`)).data.movements.length, 0, 'Tag ohne Buchungen');
  eq((await users.wsMuc.get('/api/stock/journal?site=DORTMUND')).status, 403, 'fremdes Lager');
  ok((await users.wsMuc.get(`/api/stock/journal?from=${from}&to=${today}`)).data.movements.every((m) => m.site !== 'DORTMUND'), 'Werkstatt München ohne Dortmunder Buchungen');
  eq((await users.driver.get('/api/stock/journal')).status, 403, 'Fahrer');
  eq((await users.fleet.get(`/api/stock/journal?from=${from}&to=${today}&site=DORTMUND`)).data.movements.length, j.movements.length, 'Fuhrparkleitung mit Lagerfilter');
  eq((await users.prodFleet.get(`/api/stock/journal?from=${from}&to=${today}`)).data.movements.length, 0, 'Testbuchungen nicht im Betrieb');
  const csv = await users.ws.get(`/api/stock/journal?from=${from}&to=${today}&format=csv`);
  eq(csv.status, 200); ok(/lagerjournal_test_/.test(csv.headers.get('content-disposition')), 'Dateiname');
  const txt = new TextDecoder('utf-8', { ignoreBOM: true }).decode(csv.data);
  const lines = txt.replace(/\r\n$/, '').split('\r\n');
  ok(lines[0].startsWith('﻿Datum;Uhrzeit;Lager'), 'Kopfzeile mit BOM'); eq(lines.length - 1, j.movements.length, 'Zeilen = Buchungen');
  const wsName = (await users.ws.get('/api/me')).data.user?.display_name || (await users.ws.get('/api/me')).data.display_name; ok(wsName && !txt.includes(wsName), `kein Name der buchenden Person (${wsName})`);
  ok(txt.includes(';Entnahme;') && txt.includes(withCase.case_no), 'Buchungsart deutsch, Vorgang');
  ok((await owner.get('/api/admin/audit?action=stock.journal')).data.entries.some((e) => e.action === 'stock.journal.export'), 'Export im Protokoll');
  // letzte Entnahme je Artikel (für „ohne Entnahme seit …“): aus dem Journal nachgerechnet
  for (const it of items) { const outs = j.movements.filter((m) => m.item_id === it.id && m.type === 'entnahme'); eq(it.last_out_date, outs.length ? outs.at(-1).date : null, `letzte Entnahme ${it.name}`); }
  ok(items.some((i) => i.last_out_date) && items.some((i) => !i.last_out_date), 'Beispiele mit und ohne Entnahme');
  ok(new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.ws.get('/api/stock?format=csv')).data).split('\r\n')[0].endsWith(';Letzte Entnahme'), 'Bestandsliste-CSV mit letzter Entnahme');
  // Bestellvorschlag: letzter Lieferant aus dem jüngsten Zugang mit Lieferant, sortiert nach Lieferant (ohne zuletzt)
  const a = (await users.ws.post('/api/stock', { name: 'Zz Lieferantentest A', min_qty: 10, initial_qty: 1 })).data.id;
  const b = (await users.ws.post('/api/stock', { name: 'Aa Lieferantentest B', min_qty: 10, initial_qty: 1 })).data.id;
  await users.ws.post(`/api/stock/${a}/movements`, { type: 'zugang', qty: 1, supplier: 'Alt GmbH' });
  await users.ws.post(`/api/stock/${a}/movements`, { type: 'zugang', qty: 1, supplier: 'Neu GmbH' });
  await users.ws.post(`/api/stock/${a}/movements`, { type: 'zugang', qty: 1 });
  const ro = (await users.ws.get('/api/stock?reorder=1')).data.items;
  const ra = ro.find((i) => i.id === a); const rb = ro.find((i) => i.id === b);
  eq(ra.last_supplier, 'Neu GmbH', 'jüngster Zugang mit Lieferant'); eq(ra.last_receipt_date, today, 'letzter Zugang (auch ohne Lieferant)'); eq(rb.last_supplier, null);
  ok(ro.indexOf(ra) < ro.indexOf(rb), 'mit Lieferant vor ohne Lieferant');
  for (const id of [a, b]) eq((await users.ws.patch(`/api/stock/${id}`, { active: false })).status, 200);
});

await test('Lager-Umlagerung: Entnahme hier, Zugang im Ziellager (gleiche Kennung), kein Verbrauch, Zielartikel gefunden/angelegt, Rechte, Journal', async () => {
  const src = (await users.ws.post('/api/stock', { name: 'Umlagerteil', part_number: 'UML-1', unit: 'Stk', min_qty: 1, unit_price_net: 10, initial_qty: 6 })).data.id;
  eq((await users.ws.post(`/api/stock/${src}/transfer`, { to_site: 'DORTMUND', qty: 1 })).status, 400, 'eigenes Lager');
  eq((await users.ws.post(`/api/stock/${src}/transfer`, { to_site: 'NIRGENDWO', qty: 1 })).status, 400, 'unbekannte Werkstatt');
  eq((await users.ws.post(`/api/stock/${src}/transfer`, { to_site: 'MUENCHEN', qty: 7 })).status, 400, 'mehr als Bestand');
  eq((await users.ws.post(`/api/stock/${src}/transfer`, { to_site: 'MUENCHEN', qty: 0 })).status, 400, 'Menge 0');
  eq((await users.wsMuc.post(`/api/stock/${src}/transfer`, { to_site: 'MUENCHEN', qty: 1 })).status, 404, 'fremdes Lager nicht umlagerbar');
  eq((await users.driver.post(`/api/stock/${src}/transfer`, { to_site: 'MUENCHEN', qty: 1 })).status, 403, 'Fahrer');
  const t1 = await users.ws.post(`/api/stock/${src}/transfer`, { to_site: 'MUENCHEN', qty: 2, note: 'Eilbedarf' });
  eq(t1.status, 201); eq(t1.data.on_hand, 4); eq(t1.data.target_created, true, 'Zielartikel angelegt');
  const tgt = (await users.wsMuc.get(`/api/stock/${t1.data.target_item_id}`)).data;
  eq(tgt.item.on_hand, 2); eq(tgt.item.site, 'MUENCHEN'); eq(tgt.item.part_number, 'UML-1'); eq(tgt.item.unit_price_net, 10); eq(tgt.item.min_qty, null, 'kein Mindestbestand erfunden');
  ok(/Umlagerung von DORTMUND – Eilbedarf/.test(tgt.movements[0].note), 'Vermerk im Ziel');
  const t2 = await users.fleet.post(`/api/stock/${src}/transfer`, { to_site: 'MUENCHEN', qty: 1 });
  eq(t2.data.target_item_id, t1.data.target_item_id, 'zweite Umlagerung trifft denselben Zielartikel'); eq(t2.data.target_created, false);
  // Rückweg von München nach Dortmund findet den Quellartikel
  const back = await users.wsMuc.post(`/api/stock/${t1.data.target_item_id}/transfer`, { to_site: 'DORTMUND', qty: 1 });
  eq(back.data.target_item_id, src, 'Rückweg auf Quellartikel');
  const st = (await users.ws.get('/api/stock')).data.items.find((i) => i.id === src);
  eq(st.on_hand, 4); eq(st.used_90d, 0, 'Umlagerung ist kein Verbrauch'); eq(st.last_out_date, null, 'Umlagerung ist keine Entnahme im Sinne von Verbrauch');
  // Gesamtbestand unverändert (Dortmund 4 + München 2 = 6)
  eq((await users.wsMuc.get(`/api/stock/${t1.data.target_item_id}`)).data.item.on_hand, 2);
  // Einheit abweichend → abgewiesen statt falsch zu buchen
  const kg = (await users.ws.post('/api/stock', { name: 'Fett', unit: 'kg', initial_qty: 5 })).data.id;
  eq((await users.wsMuc.post('/api/stock', { name: 'Fett', unit: 'Dose' })).status, 201);
  eq((await users.ws.post(`/api/stock/${kg}/transfer`, { to_site: 'MUENCHEN', qty: 1 })).status, 400, 'Einheit abweichend');
  const today = (await users.ws.get('/api/stock/journal')).data.to;
  const j = (await users.fleet.get(`/api/stock/journal?from=${today}&to=${today}`)).data;
  const tm = j.movements.filter((m) => m.transfer_id);
  eq(tm.length, 6, '3 Umlagerungen × 2 Buchungen'); eq(j.summary.umlagerung.count, 6);
  eq(Math.round(tm.reduce((a, m) => a + m.value_net, 0) * 100) / 100, 0, 'Wert neutral');
  eq((await users.fleet.get(`/api/stock/journal?from=${today}&to=${today}&type=umlagerung`)).data.movements.length, 6, 'Filter Umlagerung');
  ok(!(await users.fleet.get(`/api/stock/journal?from=${today}&to=${today}&type=entnahme`)).data.movements.some((m) => m.transfer_id), 'Entnahme ohne Umlagerung');
  const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get(`/api/stock/journal?from=${today}&to=${today}&format=csv`)).data);
  ok(csv.includes(';Umlagerung nach MUENCHEN;-2;') && csv.includes(';Umlagerung von DORTMUND;2;'), 'CSV-Buchungsart');
  ok((await owner.get('/api/admin/audit?action=stock.transfer')).data.entries.length >= 3, 'protokolliert');
  eq((await users.prodFleet.get('/api/stock')).data.items.filter((i) => i.name === 'Umlagerteil').length, 0, 'Betrieb unberührt');
  for (const id of [src, kg, t1.data.target_item_id]) await (id === t1.data.target_item_id ? users.wsMuc : users.ws).patch(`/api/stock/${id}`, { active: false });
});

await test('Oberfläche: Attribut hidden blendet auch Listenzeilen mit display:grid/flex aus (Such-/Lagerfilter)', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
  ok(/\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/.test(css), 'globale Regel [hidden] { display: none !important }');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  ok(app.includes("$('#sf').onchange = applyStock") && app.includes("stock_idle"), 'Lagerfilter vorhanden');
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

await test('Bußgelder: Filter Fahrzeug-Standort (Schreibweise egal, ohne Fahrzeug = „ohne“, Summe = alle), CSV und Kalender gefiltert', async () => {
  const dec = (r) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(r.data);
  eq((await users.fleet.post('/api/fines', { kind: 'verwarnung', authority: 'Ordnungsamt Standorttest', reference: 'AZ-SITE-UNBEKANNT', offense_type: 'parken', offense_at: new Date().toISOString(), plate_in_letter: 'XX-ZZ 9999', response_due: '2099-04-01' })).status, 201);
  const all = (await users.fleet.get('/api/fines')).data;
  eq(all.site, null);
  ok(all.site_options.includes('ohne'), '„ohne“ für Schreiben ohne erkanntes Fahrzeug');
  const known = all.fines.find((f) => f.reference === 'AZ-ICS-1'); ok(known && known.vehicle_site, 'Schreiben mit Fahrzeug-Standort');
  const ids = (l) => l.map((f) => f.id).sort();
  const union = [];
  for (const o of all.site_options) union.push(...(await users.fleet.get(`/api/fines?site=${encodeURIComponent(o)}`)).data.fines.map((f) => f.id));
  eq(JSON.stringify(union.sort()), JSON.stringify(ids(all.fines)), 'Summe über alle Standorte = alle Schreiben');
  const k = (await users.fleet.get(`/api/fines?site=${encodeURIComponent(known.vehicle_site.toUpperCase())}`)).data;
  ok(k.fines.some((f) => f.id === known.id) && !k.fines.some((f) => f.reference === 'AZ-SITE-UNBEKANNT'), 'Schreibweise egal, nur dieser Standort');
  ok((await users.fleet.get('/api/fines?site=ohne')).data.fines.some((f) => f.reference === 'AZ-SITE-UNBEKANNT'), 'ohne Fahrzeug unter „ohne“');
  eq((await users.fleet.get('/api/fines?site=Nirgendwo')).data.fines.length, 0, 'unbekannter Standort leer');
  const open = (await users.fleet.get('/api/fines?status=open&site=ohne')).data.fines;
  ok(open.length >= 1 && open.every((f) => !f.vehicle_site), 'kombinierbar mit „offen“');
  const csv = dec(await users.fleet.get('/api/fines?format=csv&site=ohne'));
  ok(csv.includes('AZ-SITE-UNBEKANNT') && !csv.includes('AZ-ICS-1'), 'CSV gefiltert');
  const ics = dec(await users.fleet.get(`/api/fines?format=ics&site=${encodeURIComponent(known.vehicle_site)}`));
  ok(ics.includes('20990315') && !ics.includes('20990401') && ics.includes('Behördenfristen – '), 'Kalender gefiltert und benannt');
  const viewer = await invite(owner, { username: 'test.lesen.finesite', display_name: 'Test Lesezugriff Standort', role: 'viewer', environment: 'test' });
  const vw = (await viewer.get('/api/fines?site=ohne')).data;
  ok(vw.fines.length >= 1 && vw.fines.every((f) => !('driver_id' in f)), 'Lesezugriff: Filter, weiterhin ohne Fahrer');
  const dr = (await users.driver.get('/api/fines?site=ohne')).data;
  eq(JSON.stringify(dr.site_options), '[]', 'Fahrer: keine Standortauswahl'); eq(dr.site, null);
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
  const costsBefore = (await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}`)).data;
  const withCost = costsBefore.rows.find((r) => r.actual_net > 0 || r.unvalued_items > 0);
  ok(withCost, 'Kostenzeile vorhanden');
  const V = withCost.vehicle_id;
  eq((await users.ws.post(`/api/vehicles/${V}/evaluation`, { excluded: true, reason: 'x' })).status, 403);
  eq((await users.fleet.post(`/api/vehicles/${V}/evaluation`, { excluded: true })).status, 400, 'Grund Pflicht');
  eq((await users.fleet.post(`/api/vehicles/${V}/evaluation`, { excluded: true, reason: 'Reparatur oder Verkauf offen' })).status, 200);
  eq((await users.fleet.get('/api/master')).data.vehicles_total, before - 1);
  const costsAfter = (await users.fleet.get(`/api/reports/costs?from=2026-01&to=${COST_TO}`)).data;
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
  eq((await users.fleet.post(`/api/drivers/${a.data.id}/documents`, { kind: 'fuehrerschein', license_classes: 'CE', valid_until: '2035-03-31', evidence: 'Führerschein Original gesehen' })).status, 201);
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
  ok(dcsv.includes('Name;Personalnummer;') && /Testfahrer Eins;P-1;;2035-03-31;2031-05-31;;2026-01-10;in_ordnung;;/.test(dcsv) && dcsv.includes(`in_ordnung;;${ago(0)};${ago(-28)};in Ordnung`), dcsv.split('\r\n').find((l) => l.startsWith('Testfahrer')));
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

await test('Abfahrtskontrolle mit vielen Mängeln: Abfragezahl fest (vorher ≈ 14 je Mangel → ab 3 Mängeln über 50), je Person ein Push, Wiederholung idempotent', async () => {
  const keys = (await users.driver.get('/api/meta')).data.checklist.map((i) => i.key);
  const items = keys.map((k, i) => ({ key: k, result: 'mangel', note: 'Sammelmangel ' + i, safety_relevant: i === 0 }));
  eq((await owner.post('/api/vehicles', { vin: 'WDB96340310888888', plate: 'VT-MM 18', site: 'Dortmund' })).status, 201);
  const VM = 'VIN:WDB96340310888888';
  const key = rk();
  env.pushLog.length = 0;
  const r = await users.driver.post('/api/inspections', { kind: 'abfahrt', vehicle_id: VM, request_key: key, items });
  const q = QSTAT.perRequest.at(-1).n;
  eq(r.status, 201);
  ok(q <= 30, `${keys.length} Mängel: ${q} Abfragen`);
  const fresh = r.data.followups.filter((f) => !f.duplicate);
  ok(fresh.length >= keys.length - 2, 'Folgeaufträge angelegt'); // ggf. offene Vorgänge aus früheren Tests als Vermerk
  const nos = fresh.map((f) => Number(f.case_no.split('-')[2]));
  ok(nos.every((n, i) => i === 0 || n === nos[i - 1] + 1) && new Set(nos).size === nos.length, 'fortlaufende, eindeutige Vorgangsnummern');
  const first = (await users.fleet.get(`/api/cases/${fresh[0].id}`)).data.case;
  eq(first.safety_lock, 1, 'sicherheitsrelevanter Mangel sperrt'); eq(first.check_item, keys[0]); eq(first.origin, 'kontrolle');
  const nCount = env.DB.db.prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND kind='created' AND case_id IN (SELECT value FROM json_each(?))`).get(users.fleet.id, JSON.stringify(fresh.map((f) => f.id))).n;
  eq(nCount, fresh.length, 'Fuhrparkleitung: je Folgeauftrag ein Hinweis in der App');
  const pushes = env.pushLog.filter((p) => p.url === 'https://push.example/ok/1').length;
  eq(pushes, 1, 'aber nur ein Push je Gerät');
  const st = env.DB.db.prepare(`SELECT DISTINCT push_status FROM notifications WHERE user_id=? AND case_id IN (SELECT value FROM json_each(?))`).all(users.fleet.id, JSON.stringify(fresh.map((f) => f.id))).map((x) => x.push_status);
  eq(st.join(), 'accepted', 'alle Hinweise teilen den Zustellstatus');
  // Erneut senden (Funkloch): gleiche Folgeaufträge, nichts doppelt
  const again = await users.driver.post('/api/inspections', { kind: 'abfahrt', vehicle_id: VM, request_key: key, items });
  eq(again.data.duplicate, true);
  // Zweite Kontrolle: alle Punkte bereits offen → nur Vermerke, keine neuen Vorgänge
  const r2 = await users.driver.post('/api/inspections', { kind: 'abfahrt', vehicle_id: VM, request_key: rk(), items });
  ok(QSTAT.perRequest.at(-1).n <= 30, 'Vermerke ebenfalls gesammelt');
  ok(r2.data.followups.every((f) => f.repeat), 'nur Vermerke');
  const ev = env.DB.db.prepare(`SELECT COUNT(*) AS n FROM case_events WHERE action='repeat_finding' AND case_id=?`).get(fresh[0].id).n;
  eq(ev, 1, 'Vermerk am offenen Vorgang');
  // Aufräumen: Folgeaufträge ablehnen
  for (const f of fresh) {
    let c = (await users.fleet.get(`/api/cases/${f.id}`)).data;
    if (c.case.safety_lock) { await users.fleet.post(`/api/cases/${f.id}/commands`, { action: 'lift_safety_lock', command_id: rk(), expected_version: c.case.version, note: 'Testende', payload: { confirm: true } }); c = (await users.fleet.get(`/api/cases/${f.id}`)).data; }
    const rj = await users.fleet.post(`/api/cases/${f.id}/commands`, { action: 'reject', command_id: rk(), expected_version: c.case.version, note: 'Testdaten' });
    eq(rj.status, 200, JSON.stringify(rj.data));
  }
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

await test('Mängelstatistik der Kontrollen: Summen wie gespeichert, Filter, Rechte, Umgebung, ruhende Fahrzeuge ausgenommen', async () => {
  for (const u of [users.driver, users.ws, users.dispatch]) eq((await u.get('/api/reports/defects')).status, 403);
  for (const q of ['days=3', 'days=1000', 'days=x', 'kind=sonstwas']) eq((await users.fleet.get('/api/reports/defects?' + q)).status, 400, q);
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const db = async (kind) => {
    const kf = kind ? ' AND i.kind=?' : ''; const a = kind ? ['test', since, kind] : ['test', since];
    const c = await env.DB.prepare(`SELECT COUNT(*) AS n, SUM(i.result='maengel') AS m FROM inspections i JOIN vehicles v ON v.id=i.vehicle_id AND v.eval_excluded=0 WHERE i.environment=? AND i.created_at>=?${kf}`).bind(...a).first();
    const d = await env.DB.prepare(`SELECT COUNT(*) AS n FROM inspections i JOIN vehicles v ON v.id=i.vehicle_id AND v.eval_excluded=0, json_each(i.items) j WHERE i.environment=? AND i.created_at>=?${kf} AND json_extract(j.value,'$.result')='mangel'`).bind(...a).first();
    return { checks: c.n, with: c.m || 0, defects: d.n };
  };
  const r = (await users.fleet.get('/api/reports/defects')).data;
  const x = await db();
  ok(x.defects > 0, 'Testdaten: Mängel vorhanden');
  eq(r.days, 90); eq(r.totals.checks, x.checks); eq(r.totals.checks_with_defects, x.with); eq(r.totals.defect_items, x.defects);
  eq(r.items.reduce((s, i) => s + i.defects, 0), x.defects, 'Summe je Prüfpunkt');
  eq(r.vehicles.reduce((s, v) => s + v.defect_items, 0), x.defects, 'Summe je Fahrzeug');
  const keys = (await users.driver.get('/api/meta')).data.checklist.map((i) => i.key);
  ok(r.items.find((i) => i.item === keys[2])?.vehicles.some((v) => v.vehicle_id === V1), 'Bremsleuchten-Mangel an V1');
  for (let k = 1; k < r.items.length; k++) ok(r.items[k - 1].defects >= r.items[k].defects, 'sortiert nach Häufigkeit');
  ok(!/display_name|performed_by|reporter/.test(JSON.stringify(r)), 'ohne Personen');
  for (const kind of ['abfahrt', 'nach_reparatur']) { const k = (await users.fleet.get('/api/reports/defects?kind=' + kind)).data; const y = await db(kind); eq(k.totals.checks, y.checks, kind); eq(k.totals.defect_items, y.defects, kind); }
  const p = (await users.prodFleet.get('/api/reports/defects')).data;
  ok(!p.vehicles.some((v) => v.vehicle_id === V1 && v.checks === r.vehicles.find((w) => w.vehicle_id === V1).checks) || p.totals.checks !== r.totals.checks, 'Betrieb getrennt von Test');
  // Standortfilter: V1 vorübergehend an eigenem Standort → nur V1; Summe über Standorte = alle
  const oldSite = (await env.DB.prepare('SELECT site FROM vehicles WHERE id=?').bind(V1).first()).site;
  try {
    await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind('Mängel-Teststandort', V1).run();
    const all = (await users.fleet.get('/api/reports/defects')).data;
    ok(all.site_options.includes('Mängel-Teststandort') && all.site === null);
    const one = (await users.fleet.get('/api/reports/defects?site=' + encodeURIComponent('MÄNGEL-teststandort'))).data;
    eq(one.site, 'Mängel-Teststandort'); ok(one.vehicles.length === 1 && one.vehicles[0].vehicle_id === V1, 'nur V1');
    ok(one.items.every((i) => i.vehicles.every((v) => v.vehicle_id === V1)), 'Prüfpunkte nur V1');
    let c = 0; let d = 0; let ag = 0;
    for (const st of all.site_options) { const z = (await users.fleet.get('/api/reports/defects?site=' + encodeURIComponent(st))).data; c += z.totals.checks; d += z.totals.defect_items; ag += z.totals.again_after_repair; }
    eq(c, all.totals.checks, 'Kontrollen'); eq(d, all.totals.defect_items, 'Mängel'); eq(ag, all.totals.again_after_repair, 'erneut nach Reparatur');
    eq((await users.fleet.get('/api/reports/defects?site=GIBTSNICHT')).data.totals.checks, 0);
  } finally { await env.DB.prepare('UPDATE vehicles SET site=? WHERE id=?').bind(oldSite, V1).run(); }
  await env.DB.prepare('UPDATE vehicles SET eval_excluded=1 WHERE id=?').bind(V1).run();
  try { ok(!(await users.fleet.get('/api/reports/defects')).data.vehicles.some((v) => v.vehicle_id === V1), 'ruhendes Fahrzeug ausgenommen'); }
  finally { await env.DB.prepare('UPDATE vehicles SET eval_excluded=0 WHERE id=?').bind(V1).run(); }
});

await test('Vorgang + Mängelstatistik: gleicher Prüfpunkt an diesem Fahrzeug in den 90 Tagen davor bereits repariert (nicht für Fahrer)', async () => {
  const keys = (await users.driver.get('/api/meta')).data.checklist.map((i) => i.key);
  const chk = () => users.driver.post('/api/inspections', { kind: 'abfahrt', vehicle_id: V1, request_key: rk(), items: keys.map((k, i) => ({ key: k, result: i === 4 ? 'mangel' : 'ok', note: i === 4 ? 'Wischer schmiert' : null })) });
  const first = (await chk()).data.followups[0].id;
  // als repariert und freigegeben markieren (Ablauf selbst ist in T02 ff. geprüft)
  const closed = new Date(Date.now() - 10 * 86400000).toISOString();
  await env.DB.prepare(`UPDATE cases SET status='fahrzeug_freigegeben', closed_at=?, workshop_site='DORTMUND' WHERE id=?`).bind(closed, first).run();
  const second = (await chk()).data.followups[0];
  ok(second.id !== first && !second.repeat, 'neuer Vorgang, da der alte abgeschlossen ist');
  const d = (await users.fleet.get(`/api/cases/${second.id}`)).data;
  eq(d.vehicle_info.previous_same_item.map((x) => x.id).join(), first, 'früherer Vorgang mit gleichem Prüfpunkt');
  eq(d.vehicle_info.previous_same_item[0].closed_at, closed);
  ok(!('vehicle_info' in (await users.driver.get(`/api/cases/${second.id}`)).data), 'Fahrer ohne Fahrzeug-Kurzinfo');
  // anderer Prüfpunkt → kein Hinweis
  const other = (await users.driver.post('/api/inspections', { kind: 'abfahrt', vehicle_id: V1, request_key: rk(), items: keys.map((k, i) => ({ key: k, result: i === 5 ? 'mangel' : 'ok', note: i === 5 ? 'anderes' : null })) })).data.followups[0].id;
  eq((await users.fleet.get(`/api/cases/${other}`)).data.vehicle_info.previous_same_item.length, 0, 'anderer Prüfpunkt');
  const ds = (await users.fleet.get('/api/reports/defects')).data;
  eq(ds.items.find((i) => i.item === keys[4]).again_after_repair, 1, 'Mängelstatistik: erneut nach Reparatur');
  eq(ds.items.find((i) => i.item === keys[5]).again_after_repair, 0);
  eq(ds.totals.again_after_repair, ds.items.reduce((x, i) => x + i.again_after_repair, 0));
  // älter als 90 Tage vor der Meldung → kein Hinweis
  await env.DB.prepare('UPDATE cases SET closed_at=? WHERE id=?').bind(new Date(Date.now() - 100 * 86400000).toISOString(), first).run();
  eq((await users.fleet.get(`/api/cases/${second.id}`)).data.vehicle_info.previous_same_item.length, 0, 'älter als 90 Tage');
  eq((await users.fleet.get('/api/reports/defects')).data.items.find((i) => i.item === keys[4]).again_after_repair, 0, 'Statistik: älter als 90 Tage');
  for (const cc of [second.id, other]) { const x = (await users.fleet.get(`/api/cases/${cc}`)).data.case; await users.fleet.post(`/api/cases/${cc}/commands`, { action: 'reject', command_id: rk(), expected_version: x.version, note: 'Testdaten' }); }
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

await test('Werkstattplan: Termine je Tag, überfällig geplant, ohne Termin; Termin setzen/verschieben nur gültig; Werkstatt nur eigener Standort', async () => {
  eq((await owner.post('/api/vehicles', { plate: 'WP-LN 1', vin: 'WDB96340310555504', site: 'Dortmund' })).status, 201);
  const VP = 'VIN:WDB96340310555504';
  const day = (n) => new Date(Date.parse(BERLIN_TODAY + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const cid = (await users.fleet.post('/api/cases', { vehicle_id: VP, description: 'Werkstattplan-Test: Bremsbeläge', priority: 'mittel', driveability: 'fahrbereit', request_key: rk() })).data.id;
  const cmd = async (u, action, payload = {}, note = null) => { const c = (await u.get(`/api/cases/${cid}`)).data.case; return u.post(`/api/cases/${cid}/commands`, { action, command_id: rk(), expected_version: c.version, note, payload }); };
  eq((await cmd(users.fleet, 'approve_repair', { workshop_site: 'DORTMUND', planned_date: '2026-02-30' }, 'Beläge vorne')).status, 400, 'ungültiges Datum');
  eq((await cmd(users.fleet, 'approve_repair', { workshop_site: 'DORTMUND', planned_date: day(3) }, 'Beläge vorne')).status, 200);
  ok(!(await users.ws.get(`/api/cases/${cid}`)).data.allowed_actions.includes('set_planned_date'), 'vor Übernahme kein Verschieben');
  eq((await cmd(users.ws, 'acknowledge')).status, 200);
  let p = (await users.ws.get('/api/workshop/plan?days=14')).data;
  ok(p.days.find((d) => d.date === day(3))?.items.some((i) => i.id === cid), 'am geplanten Tag');
  eq(p.site, 'DORTMUND');
  ok(!(await users.wsMuc.get('/api/workshop/plan')).data.days.some((d) => d.items.some((i) => i.id === cid)), 'fremde Werkstatt sieht ihn nicht');
  eq((await cmd(users.ws, 'set_planned_date', { planned_date: day(3) })).status, 400, 'unverändert');
  eq((await cmd(users.ws, 'set_planned_date', { planned_date: day(-1) })).status, 200);
  p = (await users.fleet.get('/api/workshop/plan')).data;
  ok(p.overdue.some((i) => i.id === cid), 'überfällig geplant');
  const csvT = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/cases?format=csv&q=Werkstattplan-Test')).data);
  ok(csvT.split('\r\n')[0].includes(';Werkstatttermin;Versicherungsfall') && csvT.includes(';' + day(-1).split('-').reverse().join('.') + ';;;;;Meldung\r\n'), 'CSV-Spalte Werkstatttermin (Leitung: danach Versicherungsfall-Spalten)');
  eq((await cmd(users.ws, 'set_planned_date', { planned_date: '' })).status, 200);
  p = (await users.dispatch.get('/api/workshop/plan')).data;
  ok(p.unplanned.some((i) => i.id === cid), 'ohne Termin');
  eq(p.unplanned.find((i) => i.id === cid).can_plan, false, 'Disposition darf nicht direkt planen');
  // Termin direkt aus dem Plan setzen (Backlog 60): Version und can_plan aus dem Plan genügen
  const up = (await users.ws.get('/api/workshop/plan')).data.unplanned.find((i) => i.id === cid);
  eq(up.can_plan, true, 'Werkstatt darf planen');
  eq(up.version, (await users.ws.get(`/api/cases/${cid}`)).data.case.version, 'Version im Plan');
  eq((await users.ws.post(`/api/cases/${cid}/commands`, { action: 'set_planned_date', command_id: rk(), expected_version: up.version, payload: { planned_date: day(2) } })).status, 200);
  eq((await users.ws.post(`/api/cases/${cid}/commands`, { action: 'set_planned_date', command_id: rk(), expected_version: up.version, payload: { planned_date: day(4) } })).status, 409, 'veraltete Version aus dem Plan');
  ok((await users.ws.get('/api/workshop/plan')).data.days.find((d) => d.date === day(2))?.items.some((i) => i.id === cid), 'direkt gesetzter Termin am Tag');
  // Fahrer sieht den geplanten Werkstatttermin seines Fahrzeugs („Mein Fahrzeug“), ohne zusätzliche Abfrage
  const asg = await users.fleet.post(`/api/vehicles/${VP}/drivers`, { user_id: users.driver.id, end_previous: false });
  eq(asg.status, 201);
  const myV = async () => (await users.driver.get('/api/me/vehicles')).data.vehicles.find((v) => v.id === VP);
  let mv = await myV();
  eq(mv.planned_workshop_date, day(2), 'Mein Fahrzeug: Werkstatttermin');
  eq(mv.known_defects.find((k) => k.description.includes('Bremsbeläge')).planned_date, day(2), 'Termin am bekannten Mangel');
  eq(mv.planned_inspection, null);
  ok(!JSON.stringify(mv.my_open_cases).includes('planned_date'), 'eigene Meldungen unverändert');
  const vrow = async (u) => (await u.get('/api/vehicles')).data.vehicles.find((v) => v.id === VP);
  eq((await vrow(users.dispatch)).planned_workshop_date, day(2), 'Fahrzeugliste zeigt Werkstatttermin');
  const avl = await anon.req('GET', '/api/integration/v1/availability?environment=test', undefined, { authorization: 'Bearer integration-token-xyz' });
  eq(avl.data.vehicles.find((v) => v.id === VP).planned_workshop_date, day(2), 'Integrations-API: Werkstatttermin');
  eq((await anon.req('GET', '/api/integration/v1/availability?environment=production', undefined, { authorization: 'Bearer integration-token-xyz' })).data.vehicles.find((v) => v.id === VP).planned_workshop_date, null, 'Umgebung getrennt');
  eq((await cmd(users.ws, 'set_planned_date', { planned_date: '' })).status, 200);
  // noch nicht übernommener Auftrag: im Plan „ohne Termin“, aber nicht direkt planbar
  const cid2 = (await users.fleet.post('/api/cases', { vehicle_id: VP, description: 'Werkstattplan-Test: Spiegel', priority: 'niedrig', driveability: 'fahrbereit', request_key: rk() })).data.id;
  const c2 = (await users.fleet.get(`/api/cases/${cid2}`)).data.case;
  eq((await users.fleet.post(`/api/cases/${cid2}/commands`, { action: 'approve_repair', command_id: rk(), expected_version: c2.version, note: 'Spiegel', payload: { workshop_site: 'DORTMUND' } })).status, 200);
  eq((await users.fleet.get('/api/workshop/plan')).data.unplanned.find((i) => i.id === cid2)?.can_plan, false, 'vor Übernahme nicht planbar');
  const ev = (await users.fleet.get(`/api/cases/${cid}`)).data.events.filter((e) => e.action === 'set_planned_date');
  eq(ev.length, 4, 'im Verlauf');
  eq((await users.driver.get('/api/workshop/plan')).status, 403, 'Fahrer');
  // geplanter Prüftermin erscheint am Tag
  const rule = await users.fleet.post(`/api/vehicles/${VP}/maintenance`, { kind: 'UVV', last_done_date: day(-300), interval_months: 12, evidence: 'Werkstattplan-Test' });
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/plan`, { planned_date: '2026-02-30' })).status, 400, 'Prüftermin: ungültiges Datum');
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/plan`, { planned_date: day(900) })).status, 400, 'Prüftermin: zu weit in der Zukunft');
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/plan`, { planned_date: day(5) })).status, 200);
  ok((await users.ws.get('/api/workshop/plan')).data.days.find((d) => d.date === day(5))?.items.some((i) => i.type === 'maintenance' && i.kind === 'UVV'), 'Prüftermin am Tag');
  const vr = await vrow(users.fleet);
  eq(vr.planned_inspection_date, day(5), 'Fahrzeugliste zeigt geplanten Prüftermin');
  eq(vr.planned_inspection_kind, 'UVV', 'Fahrzeugliste nennt die Prüfart');
  {
    const r2 = await users.fleet.post(`/api/vehicles/${VP}/maintenance`, { kind: 'Tachograph', last_done_date: day(-300), interval_months: 24, evidence: 'Werkstattplan-Test' });
    eq((await users.fleet.post(`/api/maintenance/${r2.data.id}/plan`, { planned_date: day(5) })).status, 200);
    const r3 = await users.fleet.post(`/api/vehicles/${VP}/maintenance`, { kind: 'Bremsen', last_done_date: day(-30), interval_months: 12, evidence: 'Werkstattplan-Test' });
    eq((await users.fleet.post(`/api/maintenance/${r3.data.id}/plan`, { planned_date: day(9) })).status, 200);
    const a = (await anon.req('GET', '/api/integration/v1/availability?environment=test', undefined, { authorization: 'Bearer integration-token-xyz' })).data.vehicles.find((v) => v.id === VP);
    eq(a.planned_inspection_date, day(5), 'Integrations-API: nächster Prüftermin');
    eq(a.planned_inspection_kind.split(', ').sort().join(', '), 'Tachograph, UVV', 'Integrations-API: alle Prüfarten des Tages, spätere nicht');
    eq((await users.fleet.post(`/api/maintenance/${r2.data.id}/plan`, { planned_date: '' })).status, 200);
    eq((await users.fleet.post(`/api/maintenance/${r3.data.id}/plan`, { planned_date: '' })).status, 200);
    eq((await vrow(users.fleet)).planned_inspection_kind, 'UVV', 'nach Entfernen wieder nur UVV');
  }
  // Hinweis „Fahrzeug auch geplant am“: Auftrag an Tag 2 und Prüfung an Tag 5 desselben Fahrzeugs
  eq((await cmd(users.ws, 'set_planned_date', { planned_date: day(2) })).status, 200);
  let pl = (await users.ws.get('/api/workshop/plan')).data;
  eq(JSON.stringify(pl.days.find((d) => d.date === day(2)).items.find((i) => i.id === cid).other_dates), JSON.stringify([day(5)]), 'Auftrag: weiterer Tag');
  eq(JSON.stringify(pl.days.find((d) => d.date === day(5)).items.find((i) => i.type === 'maintenance' && i.vehicle_id === VP).other_dates), JSON.stringify([day(2)]), 'Prüfung: weiterer Tag');
  eq(JSON.stringify(pl.unplanned.find((i) => i.id === cid2).other_dates), JSON.stringify([day(2), day(5)]), 'ohne Termin: alle geplanten Tage');
  eq((await cmd(users.ws, 'set_planned_date', { planned_date: '' })).status, 200);
  pl = (await users.ws.get('/api/workshop/plan')).data;
  eq(pl.days.find((d) => d.date === day(5)).items.find((i) => i.type === 'maintenance' && i.vehicle_id === VP).other_dates.length, 0, 'nur ein Tag → kein Hinweis');
  eq(vr.planned_workshop_date, null, 'entfernter Werkstatttermin nicht mehr angezeigt');
  eq((await users.fleet.get('/api/maintenance')).data.rows.find((r) => r.id === rule.data.id).planned_date, day(5), 'Prüftermin-Übersicht: geplanter Termin auch für UVV');
  mv = await myV();
  eq(mv.planned_workshop_date, null, 'Mein Fahrzeug: entfernter Termin weg');
  eq(JSON.stringify(mv.planned_inspection), JSON.stringify({ kind: 'UVV', planned_date: day(5) }), 'Mein Fahrzeug: geplanter Prüftermin');
  eq(mv.next_inspections.find((r) => r.kind === 'UVV').planned_date, day(5));
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/plan`, { planned_date: day(-2) })).status, 200);
  mv = await myV();
  eq(mv.planned_inspection, null, 'vergangener Plan-Termin nicht als geplant');
  eq(mv.next_inspections.find((r) => r.kind === 'UVV').planned_date, null);
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/plan`, { planned_date: day(5) })).status, 200);
  eq((await users.fleet.req('DELETE', `/api/assignments/${asg.data.id}`)).status, 200);
  const ics = new TextDecoder().decode((await users.ws.get('/api/workshop/plan?format=ics')).data);
  ok(ics.startsWith('BEGIN:VCALENDAR') && ics.includes('DTSTART;VALUE=DATE:' + day(5).replace(/-/g, '')) && ics.includes('SUMMARY:Prüfung UVV – WP-LN 1'), 'Kalenderdatei');
  ok(!/Bremsbeläge|Werkstattplan-Test/.test(ics), 'ohne Beschreibung/Nachweis');
  const mcal = new TextDecoder().decode((await users.fleet.get('/api/maintenance?format=ics')).data);
  ok(mcal.includes(`UID:${rule.data.id}-plan@`) && mcal.includes('SUMMARY:Werkstatttermin UVV – WP-LN 1'), 'Prüftermin-Kalender enthält geplanten Werkstatttermin');
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/plan`, { planned_date: day(-2) })).status, 200);
  ok(!new TextDecoder().decode((await users.fleet.get('/api/maintenance?format=ics')).data).includes(`UID:${rule.data.id}-plan@`), 'vergangener Plan-Termin nicht im Kalender');
});

await test('Werkstattplan: Filter „Fahrzeug-Standort“ (Schreibweise egal, Summe über Standorte = alle, Terminvorschlag-Auslastung ungefiltert)', async () => {
  const VP = 'VIN:WDB96340310555504';
  const day = (n) => new Date(Date.parse(BERLIN_TODAY + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const rule = (await users.fleet.get('/api/maintenance')).data.rows.find((r) => r.vehicle_id === VP && r.kind === 'UVV');
  eq((await users.fleet.post(`/api/maintenance/${rule.id}/plan`, { planned_date: day(5) })).status, 200);
  const cid = (await users.fleet.post('/api/cases', { vehicle_id: VP, description: 'Standortfilter Werkstattplan', priority: 'mittel', driveability: 'fahrbereit', request_key: rk() })).data.id;
  let c = (await users.fleet.get(`/api/cases/${cid}`)).data.case;
  eq((await users.fleet.post(`/api/cases/${cid}/commands`, { action: 'approve_repair', command_id: rk(), expected_version: c.version, note: 'Spiegel links', payload: { workshop_site: 'DORTMUND' } })).status, 200);
  c = (await users.ws.get(`/api/cases/${cid}`)).data.case;
  eq((await users.ws.post(`/api/cases/${cid}/commands`, { action: 'acknowledge', command_id: rk(), expected_version: c.version, payload: {} })).status, 200);
  c = (await users.ws.get(`/api/cases/${cid}`)).data.case;
  eq((await users.ws.post(`/api/cases/${cid}/commands`, { action: 'set_planned_date', command_id: rk(), expected_version: c.version, payload: { planned_date: day(3) } })).status, 200);
  const ids = (p) => [...p.overdue, ...p.unplanned, ...p.days.flatMap((d) => d.items)].map((i) => `${i.type}:${i.id}`).sort();
  const all = (await users.fleet.get('/api/workshop/plan?days=14')).data;
  eq(all.vehicle_site, null);
  ok(all.vehicle_sites.includes('Dortmund'), 'Auswahl enthält Standort des Fahrzeugs');
  ok(all.days.find((d) => d.date === day(3)).items.some((i) => i.id === cid) && all.days.find((d) => d.date === day(5)).items.some((i) => i.type === 'maintenance' && i.vehicle_id === VP));
  const dm = (await users.fleet.get('/api/workshop/plan?days=14&vsite=dORTmund')).data;
  eq(dm.vehicle_site, 'Dortmund', 'Schreibweise egal');
  ok(dm.days.find((d) => d.date === day(3))?.items.some((i) => i.id === cid) && dm.days.find((d) => d.date === day(5))?.items.some((i) => i.type === 'maintenance' && i.vehicle_id === VP), 'Auftrag und Prüftermin im Filter');
  ok([...dm.overdue, ...dm.unplanned, ...dm.days.flatMap((d) => d.items)].every((i) => (i.vehicle_site || '').trim().toLowerCase() === 'dortmund'), 'nur Fahrzeuge des Standorts');
  const union = [];
  for (const o of all.vehicle_sites) union.push(...ids((await users.fleet.get(`/api/workshop/plan?days=14&vsite=${encodeURIComponent(o)}`)).data));
  eq(JSON.stringify(union.sort()), JSON.stringify(ids(all)), 'Summe über alle Fahrzeug-Standorte = alle Einträge');
  const unk = (await users.fleet.get('/api/workshop/plan?days=14&vsite=Nirgendwo')).data;
  eq(ids(unk).length, 0, 'unbekannter Standort: leer');
  eq(JSON.stringify(unk.case_load), JSON.stringify(all.case_load), 'Auslastung für Terminvorschlag unabhängig vom Fahrzeugfilter');
  ok(all.case_load[day(3)].DORTMUND >= 1, 'Auslastung je Tag und Werkstatt');
  const ws = (await users.ws.get('/api/workshop/plan?vsite=Nirgendwo')).data;
  eq(ws.site, 'DORTMUND'); eq(ids(ws).length, 0, 'Werkstatt kann ebenfalls nach Fahrzeug-Standort filtern');
  const ics = new TextDecoder().decode((await users.fleet.get('/api/workshop/plan?days=14&vsite=dortmund&format=ics')).data);
  ok(ics.includes('Fahrzeuge Dortmund') && ics.includes('WP-LN 1'), 'Kalender gefiltert und benannt');
  ok(!new TextDecoder().decode((await users.fleet.get('/api/workshop/plan?days=14&vsite=Nirgendwo&format=ics')).data).includes('WP-LN 1'), 'Kalender: unbekannter Standort leer');
  c = (await users.ws.get(`/api/cases/${cid}`)).data.case;
  eq((await users.ws.post(`/api/cases/${cid}/commands`, { action: 'set_planned_date', command_id: rk(), expected_version: c.version, payload: { planned_date: '' } })).status, 200);
  eq((await users.fleet.post(`/api/maintenance/${rule.id}/plan`, { planned_date: day(-2) })).status, 200);
});

await test('Fahrzeugverträge: nur laut Vertrag, Kündigungstag, km-Kontingent mit Prognose, Agent-Befunde, Rechte, Beenden, CSV', async () => {
  eq((await owner.post('/api/vehicles', { plate: 'VT-LS 1', vin: 'WDB96340310555601', site: 'Dortmund' })).status, 201);
  const V = 'VIN:WDB96340310555601';
  const day = (n) => new Date(Date.parse(BERLIN_TODAY + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  // Pflichtangaben und Plausibilität
  eq((await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'leasing', partner: 'Muster-Leasing' })).status, 400, 'Nachweis Pflicht');
  eq((await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'kauf', partner: 'X', evidence: 'V1' })).status, 400, 'unbekannte Art');
  eq((await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'leasing', partner: 'X', evidence: 'V1', start_date: day(10), end_date: day(5) })).status, 400, 'Ende vor Beginn');
  eq((await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'leasing', partner: 'X', evidence: 'V1', end_date: '2027-02-30' })).status, 400, 'ungültiges Datum');
  eq((await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'leasing', partner: 'X', evidence: 'V1', notice_months: 3 })).status, 400, 'Frist ohne Ende');
  eq((await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'leasing', partner: 'X', evidence: 'V1', km_allowance: 100000 })).status, 400, 'Kontingent ohne Übernahme-km');
  for (const u of [users.ws, users.dispatch, users.driver]) eq((await u.post(`/api/vehicles/${V}/contracts`, { kind: 'leasing', partner: 'X', evidence: 'V1' })).status, 403, 'nur Leitung');
  // Leasing: Beginn vor 100 Tagen, Ende in 300 Tagen, Kontingent 100 000 km, Übernahme bei 10 000 km; Kündigung 9 Monate vor Ende → in wenigen Tagen
  const c1 = await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'leasing', partner: 'Muster-Leasing GmbH', contract_no: 'L-4711', start_date: day(-100), end_date: day(300),
    notice_months: 9, km_allowance: 100000, start_km: 10000, monthly_rate_net: '1234,5', evidence: 'Leasingvertrag L-4711 (Ordner Verträge)' });
  eq(c1.status, 201);
  // Versicherung: endet in 10 Tagen; Miete: seit gestern abgelaufen
  const c2 = (await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'versicherung', partner: 'Muster-Versicherung', end_date: day(10), evidence: 'Police 99' })).data.id;
  const c3 = (await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'miete', partner: 'Mietpartner', start_date: day(-60), end_date: day(-1), evidence: 'Mietvertrag' })).data.id;
  let d = (await users.fleet.get(`/api/vehicles/${V}`)).data;
  eq(d.contracts.length, 3);
  let lea = d.contracts.find((c) => c.id === c1.data.id);
  eq(lea.monthly_rate_net, 1234.5, 'Rate mit Dezimalkomma');
  eq(lea.status.km.status, 'ohne_km', 'ohne km-Stand keine Auswertung');
  ok(lea.status.notice.by < day(300) && lea.status.notice.status === 'bald', 'Kündigungstag bald');
  eq(d.contracts.find((c) => c.id === c3).status.overall, 'handeln', 'abgelaufen');
  ok(!(await users.ws.get(`/api/vehicles/${V}`)).data.contracts, 'Werkstatt sieht keine Verträge');
  ok(!(await users.dispatch.get(`/api/vehicles/${V}`)).data.contracts, 'Disposition sieht keine Verträge');
  // km: 40 000 km in 99 Tagen seit Übernahme → Prognose 40 000 × 400/99 ≈ 161 616 > 100 000
  eq((await users.fleet.post(`/api/vehicles/${V}/odometer`, { km: 50000, measured_on: day(-1) })).status, 201);
  lea = (await users.fleet.get(`/api/vehicles/${V}`)).data.contracts.find((c) => c.id === c1.data.id);
  eq(lea.status.km.driven, 40000); eq(lea.status.km.remaining, 60000);
  eq(lea.status.km.forecast_driven, Math.round(40000 * 400 / 99), 'lineare Prognose');
  eq(lea.status.km.status, 'prognose_ueber');
  const { contractStatus } = await import('../src/contracts.js');
  eq(contractStatus({ km_allowance: 1000, start_km: 0, start_date: '2026-01-01', end_date: '2027-01-01' }, { km: 500, measured_at: '2026-01-20T10:00:00Z' }, '2026-01-21', 60).km.forecast_driven, null, 'keine Prognose vor 30 Tagen');
  eq(contractStatus({ km_allowance: 1000, start_km: 0 }, { km: 1200, measured_at: '2026-03-01T10:00:00Z' }, '2026-03-02', 60).km.status, 'ueber');
  eq(contractStatus({ km_allowance: 1000, start_km: 5000, start_date: '2026-02-01' }, { km: 6000, measured_at: '2026-01-15T10:00:00Z' }, '2026-03-02', 60).km.status, 'ohne_km', 'km-Stand vor Vertragsbeginn zählt nicht');
  eq(contractStatus({ end_date: '2026-03-01', ended_on: '2026-02-20' }, null, '2026-03-05', 60).overall, 'beendet');
  // Agent-Befunde
  eq((await users.fleet.post('/api/agent/run')).status, 200);
  const codes = (await users.fleet.get('/api/master')).data.findings.filter((f) => f.vehicle_id === V).map((f) => f.finding_code);
  for (const c of ['CONTRACT_ENDED', 'CONTRACT_ENDS_SOON', 'CONTRACT_NOTICE_DUE', 'CONTRACT_KM_FORECAST']) ok(codes.includes(c), c);
  // Ändern (Audit, Nachweis Pflicht bleibt), Beenden mit Grund, danach keine Änderung mehr
  eq((await users.fleet.patch(`/api/contracts/${c2}`, { end_date: day(375), evidence: 'Police 99, Verlängerung' })).status, 200);
  eq((await users.fleet.patch(`/api/contracts/${c2}`, { evidence: '' })).status, 400, 'Nachweis bleibt Pflicht');
  eq((await users.ws.patch(`/api/contracts/${c2}`, { partner: 'Y' })).status, 403);
  eq((await users.fleet.post(`/api/contracts/${c3}/end`, {})).status, 400, 'Grund Pflicht');
  eq((await users.fleet.post(`/api/contracts/${c3}/end`, { ended_on: day(1), end_note: 'x' })).status, 400, 'nicht in der Zukunft');
  eq((await users.fleet.post(`/api/contracts/${c3}/end`, { ended_on: day(-1), end_note: 'Fahrzeug zurückgegeben' })).status, 200);
  eq((await users.fleet.patch(`/api/contracts/${c3}`, { partner: 'Y' })).status, 400, 'beendet → keine Änderung');
  eq((await users.fleet.post('/api/agent/run')).status, 200);
  const codes2 = (await users.fleet.get('/api/master')).data.findings.filter((f) => f.vehicle_id === V).map((f) => f.finding_code);
  ok(!codes2.includes('CONTRACT_ENDED') && !codes2.includes('CONTRACT_ENDS_SOON'), 'erledigte Befunde geschlossen');
  // Übersicht und CSV
  const ov = (await users.fleet.get('/api/contracts?filter=aktion')).data;
  ok(ov.contracts.some((c) => c.id === c1.data.id) && !ov.contracts.some((c) => c.id === c2 || c.id === c3), 'Filter Handlungsbedarf');
  eq((await users.fleet.get('/api/contracts?filter=beendet')).data.contracts.filter((c) => c.vehicle_id === V).length, 1);
  const all = (await users.fleet.get('/api/contracts')).data;
  eq(all.unrated >= 1, true, 'Verträge ohne Rate gezählt'); ok(all.monthly_rate_sum_net >= 1234.5, 'Summe nur bewerteter Raten');
  eq((await users.ws.get('/api/contracts')).status, 403);
  const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await owner.get('/api/contracts?format=csv&filter=alle')).data);
  ok(csv.startsWith('﻿Kennzeichen;Vertragsart;') && csv.includes('VT-LS 1;Leasing;Muster-Leasing GmbH;L-4711;') && csv.includes(';1234,5;'), 'CSV');
  ok((await owner.get('/api/admin/audit?action=contract')).data.entries.some((e) => e.action === 'contract.end'), 'Protokoll');
  // Kalenderdatei: Kündigungstag + Ende laufender Verträge ab heute, ohne Rate/Vertragsnummer; beendete fehlen
  const icsR = await users.fleet.get('/api/contracts?format=ics');
  eq(icsR.status, 200); ok((icsR.headers.get('content-type') || '').startsWith('text/calendar'));
  const ics = new TextDecoder().decode(icsR.data).replace(/\r\n /g, '');
  ok(ics.includes(`UID:contract-${c1.data.id}-notice@`) && ics.includes(`DTSTART;VALUE=DATE:${lea.status.notice.by.replace(/-/g, '')}`), 'Kündigungstag');
  ok(ics.includes(`UID:contract-${c1.data.id}-end@`) && ics.includes(`UID:contract-${c2}-end@`), 'Vertragsenden');
  ok(!ics.includes(`contract-${c3}-`), 'beendeter Vertrag fehlt');
  // Zeitstempel (DTSTAMP/UID) ausgenommen: um 12:34 Uhr enthielt DTSTAMP „1234“ (Test schlug uhrzeitabhängig fehl)
  const icsBody = ics.split('\r\n').filter((l) => !/^(DTSTAMP|UID):/.test(l)).join('\n');
  ok(!icsBody.includes('L-4711') && !icsBody.includes('1234'), 'ohne Vertragsnummer und Rate');
  ok(ics.includes('TRIGGER:-P60D'), 'Erinnerung = Vorwarnung');
  eq((await users.ws.get('/api/contracts?format=ics')).status, 403);
  const tl = (await users.fleet.get(`/api/vehicles/${V}/timeline?types=contract`)).data.items;
  ok(tl.some((x) => x.contract_event === 'end' && x.at === day(-1)) && tl.filter((x) => x.contract_event === 'start').length === 3, 'Zeitleiste Verträge');
  eq((await users.ws.get(`/api/vehicles/${V}/timeline?types=contract`)).data.items.length, 0, 'Werkstatt: keine Verträge in der Zeitleiste');
  // Datenqualität: Kontingent ohne km-Stand, laufender Vertrag an Fahrzeug außer Betrieb
  eq((await owner.post('/api/vehicles', { plate: 'VT-LS 2', vin: 'WDB96340310555602', site: 'Dortmund' })).status, 201);
  const V2 = 'VIN:WDB96340310555602';
  eq((await users.fleet.post(`/api/vehicles/${V2}/contracts`, { kind: 'miete', partner: 'Miet-AG', start_date: day(-10), km_allowance: 50000, start_km: 0, evidence: 'MV 1' })).status, 201);
  let dq = (await users.fleet.get('/api/admin/data-quality')).data.items;
  ok(dq.some((i) => i.check === 'contract_km_no_reading' && i.vehicle_id === V2), 'Kontingent ohne km-Stand');
  ok(!dq.some((i) => i.check === 'contract_km_no_reading' && i.vehicle_id === V), 'mit km-Stand kein Befund');
  const deact = await owner.post(`/api/vehicles/${V2}/active`, { active: false, reason: 'Test Vertrag' });
  eq(deact.status, 200); eq(deact.data.running_contracts, 1, 'Hinweis laufende Verträge');
  dq = (await users.fleet.get('/api/admin/data-quality')).data.items;
  ok(dq.some((i) => i.check === 'contract_vehicle_inactive' && i.vehicle_id === V2 && i.severity === 'fehler'), 'Vertrag an Fahrzeug außer Betrieb');
  eq((await owner.post(`/api/vehicles/${V2}/active`, { active: true })).status, 200);
  // Sammelimport mit Vorschau: deutsche Zahlen/Daten, nur eindeutige Fahrzeuge, vorhandene bleiben, Fehler mit Zeilennummer
  const csvIn = '\ufeffKennzeichen;FIN;Vertragsart;Vertragspartner;Vertragsnummer;Beginn;Ende;Kündigungsfrist (Monate);km-Kontingent;km bei Übernahme;Monatsrate;Nachweis\r\n'
    + 'VT-LS 2;;Leasing;Import-Leasing;IL-1;01.02.2026;31.01.2030;3;"200.000";12.345;"1.099,90";Leasingvertrag IL-1\r\n'
    + 'VT-LS 1;;Leasing;Muster-Leasing GmbH;L-4711;;;;;;;Doppelt\r\n'
    + ';WDB96340310555602;Versicherung;Import-Versicherung;;;31.12.2026;;;;;\r\n'
    + 'XX-NIX 9;;Leasing;Y;;;;;;;;Z\r\n'
    + 'VT-LS 2;;Kauf;Y;;;;;;;;Z\r\n'
    + 'VT-LS 2;;Miete;Y;;31.02.2026;;;;;;Z\r\n'
    + 'VT-LS 2;;Miete;Y;;;;;100000;;;Z\r\n';
  const imp = (q) => users.prodFleet.req('POST', '/api/contracts/import' + q, csvIn, { 'content-type': 'text/csv' });
  let ir = await imp('?dry_run=1');
  eq(ir.status, 200); eq(JSON.stringify(ir.data.counts), JSON.stringify({ neu: 1, vorhanden: 1, uebersprungen: 5 }), 'Vorschau');
  const r2 = ir.data.rows.find((x) => x.line === 2);
  eq(r2.start_date, '2026-02-01'); eq(r2.end_date, '2030-01-31'); eq(r2.km_allowance, 200000); eq(r2.start_km, 12345); eq(r2.monthly_rate_net, 1099.9); eq(r2.notice_months, 3);
  eq(JSON.stringify(ir.data.skipped.map((x) => x.line)), JSON.stringify([4, 5, 6, 7, 8]), 'übersprungene Zeilen');
  eq((await users.fleet.get(`/api/vehicles/${V2}`)).data.contracts.length, 1, 'Vorschau ändert nichts');
  ir = await imp('?source=' + encodeURIComponent('Ordner Verträge 2026')); if (ir.status !== 200) throw new Error(JSON.stringify(ir.data));
  eq(JSON.stringify(ir.data.counts), JSON.stringify({ neu: 2, vorhanden: 1, uebersprungen: 4 }), 'Übernahme mit Quelle für leere Nachweise');
  const v2c = (await users.fleet.get(`/api/vehicles/${V2}`)).data.contracts;
  ok(v2c.some((c) => c.kind === 'versicherung' && c.evidence === 'Ordner Verträge 2026') && v2c.some((c) => c.contract_no === 'IL-1' && c.monthly_rate_net === 1099.9), 'importiert');
  eq((await imp('?source=x')).data.counts.neu, 0, 'idempotent');
  eq((await users.ws.req('POST', '/api/contracts/import?dry_run=1', csvIn, { 'content-type': 'text/csv' })).status, 403);
  const { parseDeNum } = await import('../src/contracts.js');
  eq(parseDeNum('1.234,50 €'), 1234.5); eq(parseDeNum('100.000'), 100000); eq(parseDeNum('12,5'), 12.5); eq(parseDeNum(''), null); ok(Number.isNaN(parseDeNum('-5')) && Number.isNaN(parseDeNum('abc')), 'ungültig');
  // Testkonten nur lesen (Schalter des Inhabers) gilt auch für Verträge
  eq((await owner.put('/api/settings', { test_master_readonly: '1' })).status, 200);
  try { eq((await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'sonstiges', partner: 'Z', evidence: 'Z' })).status, 403, 'test_readonly'); }
  finally { eq((await owner.put('/api/settings', { test_master_readonly: null })).status, 200); }
});
console.log('Abfragebudget');
await test('Vertragsdokument: nur Dokument desselben Fahrzeugs und derselben Umgebung, bleibt beim Ändern ohne Feld, CSV-Spalte', async () => {
  eq((await owner.post('/api/vehicles', { plate: 'VT-DOC 1', vin: 'WDB96340310555611', site: 'Dortmund' })).status, 201);
  eq((await owner.post('/api/vehicles', { plate: 'VT-DOC 2', vin: 'WDB96340310555612', site: 'Dortmund' })).status, 201);
  const V = 'VIN:WDB96340310555611'; const W = 'VIN:WDB96340310555612';
  const H = { 'content-type': 'application/pdf', 'x-filename': encodeURIComponent('Leasingvertrag VT-DOC 1.pdf') };
  const f1 = (await users.fleet.req('POST', `/api/vehicles/${V}/documents?kind=leasing`, new TextEncoder().encode('%PDF-1.4\n% Leasing DOC1\n%%EOF'), H)).data.id;
  const f2 = (await users.fleet.req('POST', `/api/vehicles/${W}/documents?kind=leasing`, new TextEncoder().encode('%PDF-1.4\n% Leasing DOC2\n%%EOF'), H)).data.id;
  const fp = (await users.prodFleet.req('POST', `/api/vehicles/${V}/documents?kind=leasing`, new TextEncoder().encode('%PDF-1.4\n% Leasing Betrieb\n%%EOF'), H)).data.id;
  ok(f1 && f2 && fp, 'Dokumente hochgeladen');
  const base = { kind: 'leasing', partner: 'Doc-Leasing', evidence: 'Leasingvertrag D-1' };
  eq((await users.fleet.post(`/api/vehicles/${V}/contracts`, { ...base, file_id: f2 })).status, 400, 'Dokument eines anderen Fahrzeugs');
  eq((await users.fleet.post(`/api/vehicles/${V}/contracts`, { ...base, file_id: fp })).status, 400, 'Dokument der anderen Umgebung');
  eq((await users.fleet.post(`/api/vehicles/${V}/contracts`, { ...base, file_id: 'gibt-es-nicht' })).status, 400, 'unbekanntes Dokument');
  const c = await users.fleet.post(`/api/vehicles/${V}/contracts`, { ...base, file_id: f1 });
  eq(c.status, 201);
  let k = (await users.fleet.get(`/api/vehicles/${V}`)).data.contracts.find((x) => x.id === c.data.id);
  eq(k.file_id, f1); eq(k.file_name, 'Leasingvertrag VT-DOC 1.pdf'); eq(k.file_other_env, false);
  // Betriebsansicht: Dokument liegt in Test → nicht verlinkt, nur Hinweis
  k = (await users.prodFleet.get(`/api/vehicles/${V}`)).data.contracts.find((x) => x.id === c.data.id);
  eq(k.file_id, null, 'kein Link in anderer Umgebung'); eq(k.file_other_env, true);
  // Ändern ohne Feld lässt die Verknüpfung, leer hebt sie auf (Dokument bleibt in der Ablage)
  eq((await users.prodFleet.patch(`/api/contracts/${c.data.id}`, { contract_no: 'D-1' })).status, 200);
  eq((await users.fleet.get(`/api/vehicles/${V}`)).data.contracts.find((x) => x.id === c.data.id).file_id, f1, 'bleibt verknüpft');
  ok((await users.fleet.get('/api/contracts')).data.contracts.find((x) => x.id === c.data.id).file_id, 'Übersicht kennt Verknüpfung');
  const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/contracts?format=csv&filter=alle')).data);
  ok(csv.split('\r\n')[0].endsWith(';Vertragsdokument verknüpft') && csv.split('\r\n').some((l) => l.startsWith('VT-DOC 1;Leasing;Doc-Leasing;D-1;') && l.endsWith(';ja')), 'CSV-Spalte');
  let dq = (await users.fleet.get('/api/admin/data-quality')).data.items;
  ok(!dq.some((i) => i.check === 'contract_no_document' && i.vehicle_id === V), 'mit Dokument kein Hinweis');
  eq((await users.fleet.patch(`/api/contracts/${c.data.id}`, { file_id: null })).status, 200);
  dq = (await users.fleet.get('/api/admin/data-quality')).data.items;
  ok(dq.some((i) => i.check === 'contract_no_document' && i.vehicle_id === V && i.severity === 'hinweis'), 'Hinweis: Vertrag ohne Dokument');
  eq((await users.fleet.get(`/api/vehicles/${V}`)).data.contracts.find((x) => x.id === c.data.id).file_id, null, 'Verknüpfung aufgehoben');
  eq((await users.fleet.get(`/api/vehicles/${V}`)).data.documents.filter((x) => x.id === f1).length, 1, 'Dokument bleibt');
  const au = (await owner.get('/api/admin/audit?action=contract')).data.entries.find((e) => e.action === 'contract.update' && e.target === c.data.id && /file_id/.test(JSON.stringify(e.detail)));
  ok(au, 'Änderung der Verknüpfung im Protokoll');
});
await test('Kostenbericht: Vertragsraten getrennt (je angefangenem Monat bis heute), ohne Beginn/Rate nur gezählt, nur Leitung', async () => {
  eq((await owner.post('/api/vehicles', { plate: 'VT-CC 1', vin: 'WDB96340310555621', site: 'Dortmund' })).status, 201);
  const V = 'VIN:WDB96340310555621';
  const ym = (n) => { const d = new Date(Date.UTC(+BERLIN_TODAY.slice(0, 4), +BERLIN_TODAY.slice(5, 7) - 1 + n, 15)); return d.toISOString().slice(0, 7); };
  const now = ym(0);
  const mk = (b) => users.fleet.post(`/api/vehicles/${V}/contracts`, { partner: 'CC-Partner', evidence: 'Vertrag CC', ...b });
  eq((await mk({ kind: 'leasing', start_date: ym(-3) + '-20', monthly_rate_net: 1000 })).status, 201); // läuft: 4 Monate (−3 … 0)
  const ended = (await mk({ kind: 'miete', start_date: ym(-5) + '-01', end_date: ym(6) + '-28', monthly_rate_net: 300 })).data.id;
  eq((await users.fleet.post(`/api/contracts/${ended}/end`, { ended_on: ym(-1) + '-10', end_note: 'zurückgegeben' })).status, 200); // im Zeitraum −2 … −1 = 2 Monate
  eq((await mk({ kind: 'versicherung', monthly_rate_net: 50 })).status, 201); // ohne Beginn
  eq((await mk({ kind: 'wartung', start_date: ym(-1) + '-01' })).status, 201); // ohne Rate
  eq((await mk({ kind: 'sonstiges', start_date: ym(2) + '-01', monthly_rate_net: 999 })).status, 201); // beginnt künftig → nicht gezählt
  const r = await users.fleet.get(`/api/reports/costs?from=${ym(-2)}&to=${ym(3)}&vehicle_id=${encodeURIComponent(V)}`);
  eq(r.status, 200);
  const cc = r.data.contract_costs;
  eq(cc.until_month, now, 'höchstens bis zum laufenden Monat');
  const v = cc.vehicles.find((x) => x.vehicle_id === V);
  eq(v.contracts.find((c) => c.kind === 'leasing').months, 3, 'Leasing im Zeitraum −2 … 0');
  eq(v.contracts.find((c) => c.kind === 'miete').months, 2, 'beendet: bis „Beendet am“');
  eq(v.net, 3 * 1000 + 2 * 300); eq(cc.total_net, 3600);
  ok(!v.contracts.some((c) => c.kind === 'sonstiges'), 'künftige Raten nicht');
  eq(cc.without_start, 1); eq(cc.without_rate, 1);
  eq(r.data.totals.actual_net, 0, 'nicht in den Instandhaltungskosten');
  const full = (await users.fleet.get(`/api/reports/costs?from=${ym(-12)}&to=${now}&vehicle_id=${encodeURIComponent(V)}`)).data.contract_costs.vehicles[0];
  eq(full.contracts.find((c) => c.kind === 'leasing').months, 4, 'angebrochener Startmonat zählt voll');
  const viewer = await invite(owner, { username: 'test.lesen.cc', display_name: 'Test Lesezugriff', role: 'viewer', environment: 'test' });
  const vr = await viewer.get(`/api/reports/costs?from=${now}&to=${now}`);
  eq(vr.status, 200); eq(vr.data.contract_costs, undefined, 'Lesezugriff ohne Vertragsraten');
  const integ = await anon.req('GET', `/api/integration/v1/costs?environment=test&from=${now}&to=${now}`, undefined, { authorization: 'Bearer integration-token-xyz' });
  eq(integ.status, 200); eq(integ.data.contract_costs, undefined, 'Integrations-API ohne Vertragsraten');
});
await test('Versicherungsfall je Vorgang: nur laut Nachweis, Vertrag desselben Fahrzeugs, Erstattung mit Datum, Saldo, Rechte, Umgebung, CSV', async () => {
  eq((await owner.post('/api/vehicles', { plate: 'VT-IC 1', vin: 'WDB96340310555631', site: 'Dortmund' })).status, 201);
  eq((await owner.post('/api/vehicles', { plate: 'VT-IC 2', vin: 'WDB96340310555632', site: 'Dortmund' })).status, 201);
  const V = 'VIN:WDB96340310555631'; const W = 'VIN:WDB96340310555632';
  const day = (n) => new Date(Date.parse(BERLIN_TODAY + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
  const kv = (await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'versicherung', partner: 'Muster-Versicherung AG', contract_no: 'P-1', evidence: 'Police P-1' })).data.id;
  const kw = (await users.fleet.post(`/api/vehicles/${W}/contracts`, { kind: 'versicherung', partner: 'Andere AG', evidence: 'Police W' })).data.id;
  const kl = (await users.fleet.post(`/api/vehicles/${V}/contracts`, { kind: 'leasing', partner: 'Leasing AG', evidence: 'LV' })).data.id;
  const cid = (await users.fleet.post('/api/cases', { vehicle_id: V, description: 'Unfall: Spiegel und Tür links beschädigt', priority: 'mittel', driveability: 'fahrbereit', request_key: rk() })).data.id;
  const cmd = async (u, action, payload = {}, note = null) => { const c = (await u.get(`/api/cases/${cid}`)).data.case; return u.post(`/api/cases/${cid}/commands`, { action, command_id: rk(), expected_version: c.version, note, payload }); };
  eq((await cmd(users.fleet, 'approve_repair', { workshop_site: 'DORTMUND' }, 'Unfallschaden')).status, 200);
  eq((await cmd(users.ws, 'acknowledge')).status, 200);
  eq((await cmd(users.fleet, 'add_external_cost', { supplier: 'Karosserie Muster', amount_net: 2500, covers_work_and_parts: true })).status, 200);
  let d = (await users.fleet.get(`/api/cases/${cid}`)).data;
  eq(d.claim, null); ok(d.insurance_contracts.some((k) => k.id === kv) && !d.insurance_contracts.some((k) => k.id === kl || k.id === kw), 'nur Versicherungsverträge des Fahrzeugs');
  ok(!('claim' in (await users.ws.get(`/api/cases/${cid}`)).data), 'Werkstatt sieht keinen Versicherungsfall');
  const P = `/api/cases/${cid}/claim`;
  for (const u of [users.ws, users.dispatch, users.driver]) eq((await u.put(P, { insurer: 'X', reported_on: day(0), evidence: 'x' })).status, 403, 'nur Leitung');
  eq((await users.fleet.put(P, { insurer: 'X', reported_on: day(0) })).status, 400, 'Nachweis Pflicht');
  eq((await users.fleet.put(P, { insurer: 'X', evidence: 'x' })).status, 400, 'Meldedatum Pflicht');
  eq((await users.fleet.put(P, { insurer: 'X', reported_on: day(1), evidence: 'x' })).status, 400, 'nicht Zukunft');
  eq((await users.fleet.put(P, { reported_on: day(0), evidence: 'x' })).status, 400, 'Versicherer oder Vertrag');
  eq((await users.fleet.put(P, { contract_id: kw, reported_on: day(0), evidence: 'x' })).status, 400, 'Vertrag eines anderen Fahrzeugs');
  eq((await users.fleet.put(P, { contract_id: kl, reported_on: day(0), evidence: 'x' })).status, 400, 'kein Versicherungsvertrag');
  eq((await users.fleet.put(P, { contract_id: kv, reported_on: day(-2), evidence: 'x', reimbursed_net: 100 })).status, 400, 'Erstattung nur mit Datum');
  const c1 = await users.fleet.put(P, { contract_id: kv, claim_no: 'S-2026-77', reported_on: day(-2), deductible_net: '500,00', evidence: 'Schadenmeldung per Portal' });
  eq(c1.status, 200); eq(c1.data.created, true);
  d = (await users.fleet.get(`/api/cases/${cid}`)).data;
  eq(d.claim.insurer, 'Muster-Versicherung AG', 'Versicherer aus Vertrag'); eq(d.claim.deductible_net, 500); eq(d.claim.status, 'gemeldet'); eq(d.claim.days_open, 2); eq(d.claim.open, true);
  let ov = (await users.fleet.get('/api/claims')).data;
  let r = ov.claims.find((x) => x.case_id === cid);
  ok(r && r.plate === 'VT-IC 1', 'Übersicht offen'); eq(r.case_cost_net, 2500, 'Kosten aus belegter Fremdleistung'); eq(r.balance_net, null, 'ohne Erstattung kein Saldo');
  eq((await users.prodFleet.get('/api/claims')).data.claims.some((x) => x.case_id === cid), false, 'Betrieb sieht Testfall nicht');
  eq((await users.prodFleet.put(P, { insurer: 'X', reported_on: day(0), evidence: 'x' })).status, 404, 'fremde Umgebung');
  eq((await users.ws.get('/api/claims')).status, 403);
  // Regulierung: Erstattung mit Datum, nicht vor Meldung; abgelehnt ohne Erstattung
  eq((await users.fleet.put(P, { status: 'reguliert', reimbursed_net: 2000, reimbursed_on: day(-3) })).status, 400, 'Erstattung vor Meldung');
  eq((await users.fleet.put(P, { status: 'abgelehnt', reimbursed_net: 2000, reimbursed_on: day(0) })).status, 400, 'abgelehnt mit Erstattung');
  eq((await users.fleet.put(P, { status: 'reguliert', reimbursed_net: '2.000', reimbursed_on: day(0) })).status, 400, 'Tausenderpunkt ist keine Zahl');
  eq((await users.fleet.put(P, { status: 'reguliert', reimbursed_net: '2000', reimbursed_on: day(0), evidence: 'Abrechnung vom ' + day(0) })).status, 200);
  ov = (await users.fleet.get('/api/claims?filter=alle')).data; r = ov.claims.find((x) => x.case_id === cid);
  eq(r.balance_net, 500, 'Saldo = Kosten − Erstattung'); eq(r.days_open, null); ok(ov.reimbursed_sum_net >= 2000);
  ok(!(await users.fleet.get('/api/claims')).data.claims.some((x) => x.case_id === cid), 'reguliert nicht mehr offen');
  eq((await users.fleet.get('/api/claims?filter=reguliert')).data.counts.reguliert >= 1, true);
  const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/claims?format=csv&filter=alle')).data);
  ok(csv.startsWith('﻿Kennzeichen;Vorgang;Versicherer;') && csv.includes(';Muster-Versicherung AG;S-2026-77;') && csv.includes(';500;2000;') && csv.includes(';2500;500;'), 'CSV');
  const au = (await owner.get('/api/admin/audit?action=claim')).data.entries;
  ok(au.some((e) => e.action === 'claim.create') && au.some((e) => e.action === 'claim.update') && au.some((e) => e.action === 'claim.export'), 'Protokoll');
  // Zeitleiste der Fahrzeugakte: Meldung und Erstattung (nur Leitung, nur eigene Umgebung)
  const tl = (await users.fleet.get(`/api/vehicles/${V}/timeline?types=claim`)).data.items;
  ok(tl.some((x) => x.claim_event === 'reported' && x.at === day(-2) && x.case_id === cid && x.claim_no === 'S-2026-77'), 'Zeitleiste: Meldung');
  ok(tl.some((x) => x.claim_event === 'reimbursed' && x.at === day(0) && x.reimbursed_net === 2000), 'Zeitleiste: Erstattung');
  eq((await users.ws.get(`/api/vehicles/${V}/timeline?types=claim`)).data.items.length, 0, 'Werkstatt: keine Versicherungsfälle');
  eq((await users.prodFleet.get(`/api/vehicles/${V}/timeline?types=claim`)).data.items.length, 0, 'Betrieb sieht Testfall nicht');
  // Vorgänge-CSV: Versicherungsfall-Spalten nur für die Leitung
  const vcsv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/cases?format=csv&q=VT-IC')).data);
  ok(vcsv.split('\r\n')[0].endsWith(';Versicherungsfall;Versicherer;Schadennummer;Kostenfreigabe ausstehend;Herkunft') && vcsv.includes(';reguliert;Muster-Versicherung AG;S-2026-77'), 'CSV mit Versicherungsfall');
  const vcsvV = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.dispatch.get('/api/cases?format=csv&q=VT-IC')).data);
  ok(!vcsvV.includes('Versicherer'), 'Disposition ohne Versicherungsspalten');
  ok(!vcsvV.includes('Kostenfreigabe') && vcsvV.split('\r\n')[0].endsWith(';Werkstatttermin;Herkunft'), 'Disposition ohne Kostenspalte, mit Herkunft');
  // Fahrzeugakte: Zusammenfassung Versicherungsfälle (nur Leitung)
  const akte = (await users.fleet.get(`/api/vehicles/${V}`)).data;
  eq(akte.claims_summary.total, 1); eq(akte.claims_summary.open, 0); eq(akte.claims_summary.reimbursed_net, 2000);
  ok(!('claims_summary' in (await users.ws.get(`/api/vehicles/${V}`)).data), 'Werkstatt ohne Versicherungsfälle');
  eq((await users.prodFleet.get(`/api/vehicles/${V}`)).data.claims_summary.total, 0, 'Umgebung');
  // Kostenbericht: Erstattungen getrennt, nicht von den Instandhaltungskosten abgezogen; nur Leitung
  const m = day(0).slice(0, 7);
  const rep = (await users.fleet.get(`/api/reports/costs?from=${m}&to=${m}&vehicle_id=${V}`)).data;
  eq(rep.claim_reimbursements.total_net, 2000, 'Erstattung im Zeitraum'); eq(rep.claim_reimbursements.items[0].case_no, (await users.fleet.get(`/api/cases/${cid}`)).data.case.case_no);
  eq(rep.vehicles[0].actual_net, 2500, 'Instandhaltungskosten unverändert');
  const prev = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 2, 1)).toISOString().slice(0, 7);
  eq((await users.fleet.get(`/api/reports/costs?from=${prev}&to=${prev}&vehicle_id=${V}`)).data.claim_reimbursements.total_net, null, 'außerhalb des Zeitraums');
  const viewer = await invite(owner, { username: 'test.lesen.ic', display_name: 'Test Lesezugriff IC', role: 'viewer', environment: 'test' });
  eq((await viewer.get(`/api/reports/costs?from=${m}&to=${m}`)).data.claim_reimbursements, undefined, 'Lesezugriff ohne Erstattungen');
  eq((await users.prodFleet.get(`/api/reports/costs?from=${m}&to=${m}`)).data.claim_reimbursements.items.some((x) => x.case_id === cid), false, 'Umgebung');
  // Datenqualität: Vorgang nennt „Unfall“ (auch Ukrainisch), aber kein Versicherungsfall → Hinweis mit Link auf den Vorgang
  const c2 = (await users.fleet.post('/api/cases', { vehicle_id: W, description: 'Невелике ДТП на парковці, бампер', priority: 'niedrig', driveability: 'fahrbereit', request_key: rk() })).data.id;
  const c3 = (await users.fleet.post('/api/cases', { vehicle_id: W, description: 'Ölwechsel fällig', priority: 'niedrig', driveability: 'fahrbereit', request_key: rk() })).data.id;
  const dq = (await users.fleet.get('/api/admin/data-quality')).data.items.filter((i) => i.check === 'accident_no_claim');
  ok(dq.some((i) => i.case_id === c2 && i.severity === 'hinweis' && i.plate === 'VT-IC 2'), 'Hinweis bei Unfall ohne Versicherungsfall');
  ok(!dq.some((i) => i.case_id === cid || i.case_id === c3), 'mit Versicherungsfall bzw. ohne Unfall kein Hinweis');
  eq((await users.prodFleet.get('/api/admin/data-quality')).data.items.some((i) => i.case_id === c2), false, 'Umgebung');
  // Fuhrparkagent: Nachfassen nur mit eingestellter Frist (leer = aus), Bezug Meldedatum, nur offene Fälle
  eq((await users.fleet.put(`/api/cases/${c2}/claim`, { insurer: 'Andere AG', reported_on: day(-10), evidence: 'Meldung per Telefon, Vermerk' })).status, 200);
  const claimCodes = async () => { eq((await users.fleet.post('/api/agent/run')).status, 200); return (await users.fleet.get('/api/master')).data.findings.filter((f) => f.finding_code === 'CLAIM_OPEN_LONG').map((f) => f.case_id); };
  eq((await claimCodes()).length, 0, 'ohne Einstellung kein Befund');
  eq((await owner.put('/api/settings', { claim_followup_days: '7' })).status, 200);
  const fc = await claimCodes();
  ok(fc.includes(c2) && !fc.includes(cid), 'offen seit 10 Tagen → Befund; regulierter Fall nicht');
  ov = (await users.fleet.get('/api/claims')).data; eq(ov.followup_days, 7); ok(ov.claims.find((x) => x.case_id === c2).followup_due === true, 'Übersicht: nachfassen');
  eq((await owner.put('/api/settings', { claim_followup_days: '14' })).status, 200);
  ok(!(await claimCodes()).includes(c2), '10 Tage < 14 → kein Befund');
  eq((await users.fleet.get('/api/claims')).data.claims.find((x) => x.case_id === c2).followup_due, false);
  eq((await owner.put('/api/settings', { claim_followup_days: null })).status, 200);
  // Schreiben/Abrechnung als Datei des Vorgangs verknüpfen (nur Dateien dieses Vorgangs; weglassen = unverändert; null = aufheben)
  const pdf = concatBytes(new TextEncoder().encode('%PDF-1.4\n'), crypto.getRandomValues(new Uint8Array(300)));
  const fid = (await users.fleet.req('POST', `/api/cases/${cid}/files`, pdf, { 'content-type': 'application/pdf', 'x-filename': 'abrechnung.pdf' })).data.id;
  const fOther = (await users.fleet.req('POST', `/api/cases/${c2}/files`, concatBytes(new TextEncoder().encode('%PDF-1.4\n'), crypto.getRandomValues(new Uint8Array(300))), { 'content-type': 'application/pdf', 'x-filename': 'x.pdf' })).data.id;
  eq((await users.fleet.put(P, { file_id: fOther })).status, 400, 'Datei eines anderen Vorgangs');
  eq((await users.fleet.put(P, { file_id: fid })).status, 200);
  let cd = (await users.fleet.get(`/api/cases/${cid}`)).data.claim; eq(cd.file_id, fid); eq(cd.file_name, 'abrechnung.pdf');
  eq((await users.fleet.put(P, { note: 'Rückfrage erledigt' })).status, 200);
  eq((await users.fleet.get(`/api/cases/${cid}`)).data.claim.file_id, fid, 'ohne Feld unverändert');
  ok(new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/claims?format=csv&filter=alle')).data).includes(';Schreiben verknüpft\r\n'), 'CSV-Spalte');
  eq((await users.fleet.put(P, { file_id: null })).status, 200);
  eq((await users.fleet.get(`/api/cases/${cid}`)).data.claim.file_id, null, 'Verknüpfung aufgehoben');
  eq((await users.fleet.put(P, { file_id: fid })).status, 200);
});
await test('Zahlen aus Formularen: „2.000“ nie still als 2; deutsches Format „1.234,50“; km „120.000“ = 120000', async () => {
  const { num } = await import('../src/util.js');
  eq(num('1.234,50'), 1234.5); eq(num('2,5'), 2.5); eq(num('1.5'), 1.5); eq(num(' 300 '), 300); eq(num(12), 12); eq(num('0.250'), 0.25);
  let e = null; try { num('2.000', { field: 'Preis' }); } catch (x) { e = x; } ok(e && /mehrdeutig/.test(e.message), 'mehrdeutig abgewiesen');
  eq(num('120.000', { grouped: true }), 120000); eq(num('1.250.300', { grouped: true }), 1250300);
  eq(num('', { nullable: true }), null);
  // Oberfläche meldet dasselbe Muster schon am Feld (gleicher Ausdruck wie der Server)
  const fs = await import('node:fs'); const appSrc = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8'); const utilSrc = fs.readFileSync(new URL('../src/util.js', import.meta.url), 'utf8');
  ok(appSrc.includes('const AMBIG_NUM = /^-?[1-9]\\d{0,2}(\\.\\d{3})+$/;') && utilSrc.includes('/^-?[1-9]\\d{0,2}(\\.\\d{3})+$/.test(t)'), 'gleiches Muster App/Server');
  // Ende-zu-Ende: km-Stand mit Tausenderpunkt wird richtig übernommen
  eq((await owner.post('/api/vehicles', { plate: 'VT-NUM 1', vin: 'WDB96340310555641', site: 'Dortmund' })).status, 201);
  eq((await users.fleet.post('/api/vehicles/VIN:WDB96340310555641/odometer', { km: '123.456' })).status, 201);
  eq((await users.fleet.get('/api/vehicles/VIN:WDB96340310555641')).data.odometer[0].km, 123456);
});
await test('Prüfarten Ausrüstung: Feuerlöscher, Verbandkasten, Ladungssicherung (Intervall/Termin nur laut Eingabe), Aliase im Import', async () => {
  const { normalizeKind } = await import('../src/maintenance.js');
  eq(normalizeKind('Feuerloescher'), 'Feuerlöscher'); eq(normalizeKind('Verbandskasten'), 'Verbandkasten'); eq(normalizeKind('Spanngurte'), 'Ladungssicherung'); eq(normalizeKind('feuerlöscher'), 'Feuerlöscher');
  ok((await users.fleet.get('/api/meta')).data.maintenance_kinds.includes('Feuerlöscher'), 'Meta');
  eq((await owner.post('/api/vehicles', { plate: 'VT-FL 1', vin: 'WDB96340310555651', site: 'Dortmund' })).status, 201);
  const r = await users.fleet.post('/api/vehicles/VIN:WDB96340310555651/maintenance', { kind: 'Feuerlöscher', last_done_date: '2025-11-03', interval_months: 24, evidence: 'Prüfplakette Feuerlöscher' });
  eq(r.status, 201); eq(r.data.next_due_date, '2027-11-03', 'Termin aus eingetragenem Intervall');
  const v = (await users.fleet.get('/api/vehicles/VIN:WDB96340310555651')).data;
  ok(v.maintenance.some((m) => m.kind === 'Feuerlöscher'), 'in der Fahrzeugakte');
  ok(!(await users.fleet.get('/api/admin/data-quality')).data.items.some((i) => i.plate === 'VT-FL 1' && i.check === 'missing_inspection' && /Feuer/.test(i.detail)), 'keine Pflichtprüfung');
});
await test('Kalenderdatei: Zeilen ≤ 75 Oktette (auch Umlaute/Kyrillisch/Emoji), Entfalten ergibt Original; 900 Termine schnell', async () => {
  const { icsCalendar } = await import('../src/util.js');
  const long = 'Werkstatttermin Ölwechsel – SZ-YC 5513 · Привіт світ 😀 '.repeat(4); const ascii = 'A'.repeat(200);
  const out = icsCalendar('Kalender', [{ uid: 'a', date: '2026-02-28', summary: long, description: ascii, alarmDays: 3 }], '2026-10-11T06:00:00Z');
  const enc = new TextEncoder();
  ok(out.split('\r\n').every((l) => enc.encode(l).length <= 75), 'max. 75 Oktette je Zeile');
  const unfolded = out.replace(/\r\n /g, '');
  ok(unfolded.includes('SUMMARY:' + long.replace(/,/g, '\\,')) && unfolded.includes('DESCRIPTION:' + ascii) && unfolded.includes('DTEND;VALUE=DATE:20260301'), 'Entfalten ergibt Original');
  const ev = Array.from({ length: 900 }, (_, i) => ({ uid: 'x' + i, date: '2026-10-01', summary: long, description: 'Status: freigegeben · Werkstatt Dortmund', alarmDays: 3 }));
  const t0 = performance.now(); icsCalendar('Last', ev); const ms = performance.now() - t0;
  ok(ms < 250, `900 Termine in ${ms.toFixed(0)} ms (vorher ≈ 600 ms)`);
});
await test('Teile-Liefertermin: optional bei „wartet auf Teile“, nicht in der Vergangenheit, änderbar, sichtbar für Disposition/Liste/API, beim Fortsetzen geleert', async () => {
  const VM = 'VIN:WDB96340310888888';
  const tomorrow = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + 86400000));
  const later = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + 5 * 86400000));
  const yesterday = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() - 86400000));
  const c = await users.driver.post('/api/cases', { vehicle_id: VM, description: 'Luftfederbalg hinten undicht', priority: 'mittel', request_key: rk() });
  eq(c.status, 201);
  const cmd = async (u, action, payload = {}, note = null) => {
    const cur = (await users.fleet.get(`/api/cases/${c.data.id}`)).data.case;
    return u.post(`/api/cases/${c.data.id}/commands`, { action, command_id: rk(), expected_version: cur.version, payload, note });
  };
  eq((await cmd(users.fleet, 'approve_repair', { workshop_site: 'DORTMUND' }, 'Balg tauschen')).status, 200);
  eq((await cmd(users.ws, 'start_repair')).status, 200);
  const past = await cmd(users.ws, 'wait_parts', { parts_expected_date: yesterday }, 'Luftfederbalg bestellt');
  eq(past.status, 400); eq(past.data.error, 'parts_eta_past');
  eq((await cmd(users.ws, 'wait_parts', { parts_expected_date: tomorrow }, 'Luftfederbalg bestellt')).status, 200);
  let cs = (await users.fleet.get(`/api/cases/${c.data.id}`)).data;
  eq(cs.case.status, 'wartet_teile'); eq(cs.case.parts_expected_date, tomorrow);
  ok(cs.allowed_actions.includes('set_parts_eta'), 'Fuhrparkleitung darf ändern');
  eq((await cmd(users.ws, 'set_parts_eta', { parts_expected_date: tomorrow })).status, 400, 'unverändert');
  eq((await cmd(users.driver, 'set_parts_eta', { parts_expected_date: later })).status === 200, false, 'Fahrer nicht');
  eq((await cmd(users.ws, 'set_parts_eta', { parts_expected_date: later })).status, 200);
  cs = (await users.fleet.get(`/api/cases/${c.data.id}`)).data;
  eq(cs.case.parts_expected_date, later);
  const ev = cs.events.find((e) => e.action === 'set_parts_eta');
  ok(ev && ev.payload.from === tomorrow && ev.payload.to === later, 'Verlauf von → nach');
  ok((await users.dispatch.get('/api/cases?status=open')).data.cases.some((x) => x.id === c.data.id && x.parts_expected_date === later), 'Disposition sieht Termin');
  eq((await users.fleet.get('/api/vehicles')).data.vehicles.find((v) => v.id === VM).parts_expected_date, later, 'Fahrzeugliste');
  const av = await anon.req('GET', '/api/integration/v1/availability?environment=test', undefined, { authorization: 'Bearer integration-token-xyz' });
  eq(av.data.vehicles.find((v) => v.id === VM).parts_expected_date, later, 'Integrations-API');
  const pi = (await users.ws.get('/api/workshop/plan')).data.unplanned.find((x) => x.id === c.data.id);
  eq(pi.parts_expected_date, later, 'Werkstattplan liefert Liefertermin');
  // Fahrer des Fahrzeugs sieht den Liefertermin am bekannten Mangel („Mein Fahrzeug“)
  const asg = await users.fleet.post(`/api/vehicles/${VM}/drivers`, { user_id: users.driver.id, end_previous: false });
  eq(asg.status, 201);
  const kd = (await users.driver.get('/api/me/vehicles')).data.vehicles.find((v) => v.id === VM).known_defects.find((k) => k.case_no === c.data.case_no);
  eq(kd.parts_expected_date, later, 'Fahrer sieht Liefertermin');
  eq((await users.fleet.req('DELETE', `/api/assignments/${asg.data.id}`)).status, 200);
  eq((await cmd(users.ws, 'set_parts_eta', {})).status, 200, 'entfernen');
  eq((await users.fleet.get(`/api/cases/${c.data.id}`)).data.case.parts_expected_date, null);
  eq((await cmd(users.ws, 'set_parts_eta', { parts_expected_date: tomorrow })).status, 200);
  eq((await cmd(users.ws, 'resume_repair')).status, 200);
  cs = (await users.fleet.get(`/api/cases/${c.data.id}`)).data.case;
  eq(cs.status, 'in_reparatur'); eq(cs.parts_expected_date, null, 'Teile da → Liefertermin erledigt');
  eq((await users.fleet.get('/api/vehicles')).data.vehicles.find((v) => v.id === VM).parts_expected_date, null);
  // Ohne Liefertermin bleibt alles wie bisher
  eq((await cmd(users.ws, 'wait_parts', {}, 'Schrauben fehlen')).status, 200);
  eq((await users.fleet.get(`/api/cases/${c.data.id}`)).data.case.parts_expected_date, null);
  // Kennzahl Termintreue: erster Abschnitt eingehalten (fortgesetzt vor dem Termin), offener ohne Termin nur gezählt
  const bm = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date()).slice(0, 7);
  const kpi = async () => (await users.fleet.get(`/api/reports/kpi?from=${bm}&to=${bm}`)).data.parts_eta;
  const k0 = await kpi();
  ok(k0.kept >= 1 && k0.without_eta >= 1, 'eingehalten + ohne Termin gezählt');
  ok(k0.by_site.some((x) => x.site === 'DORTMUND' && x.kept >= 1), 'je Werkstatt');
  // Termin liegt (laut Verlauf) 3 Tage zurück → offen überschritten; nach Fortsetzen: überschritten um 3 Tage
  eq((await cmd(users.ws, 'set_parts_eta', { parts_expected_date: tomorrow })).status, 200);
  const past3 = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() - 3 * 86400000));
  env.DB.db.prepare(`UPDATE case_events SET payload=? WHERE case_id=? AND action='set_parts_eta' AND created_at=(SELECT MAX(created_at) FROM case_events WHERE case_id=? AND action='set_parts_eta')`)
    .run(JSON.stringify({ from: null, to: past3 }), c.data.id, c.data.id);
  const k1 = await kpi();
  eq(k1.open_overdue, k0.open_overdue + 1, 'offen überschritten'); eq(k1.without_eta, k0.without_eta - 1);
  eq((await cmd(users.ws, 'resume_repair')).status, 200);
  const k2 = await kpi();
  eq(k2.late, k0.late + 1, 'überschritten'); eq(k2.open_overdue, k0.open_overdue);
  ok(k2.late_days_median >= 3, 'Verspätung in Tagen'); ok(k2.on_time_pct < 100 && k2.on_time_pct > 0, 'Quote');
});
await test('Kosten-Freigabegrenze: aus ohne Einstellung; Überschreiten markiert einmal und informiert Leitung; Werkstatt ohne Beträge; Freigabe gilt bis zum Betrag', async () => {
  const VM = 'VIN:WDB96340310888888';
  const c = await users.fleet.post('/api/cases', { vehicle_id: VM, description: 'Kostengrenze-Test: Kupplung', priority: 'niedrig', driveability: 'fahrbereit', request_key: rk() });
  eq(c.status, 201);
  const id = c.data.id;
  const cmd = async (u, action, payload = {}, note = null) => {
    const cur = (await users.fleet.get(`/api/cases/${id}`)).data.case;
    return u.post(`/api/cases/${id}/commands`, { action, command_id: rk(), expected_version: cur.version, payload, note });
  };
  eq((await cmd(users.fleet, 'approve_repair', { workshop_site: 'DORTMUND' }, 'Kupplung tauschen')).status, 200);
  eq((await cmd(users.ws, 'start_repair')).status, 200);
  // ohne Einstellung: keine Grenze, keine Markierung
  eq((await owner.put('/api/settings', { repair_cost_limit_net: '' })).status, 200);
  const r0 = await cmd(users.ws, 'add_part', { name: 'Kupplungsscheibe', quantity: 1, unit_price_net: 900 });
  eq(r0.status, 200); ok(!r0.data.cost_limit_exceeded, 'ohne Grenze nichts');
  let d = (await users.fleet.get(`/api/cases/${id}`)).data;
  eq(d.case.cost_over_limit_at, null); eq(d.cost_limit, undefined, 'ohne Einstellung keine Angabe');
  ok(!d.allowed_actions.includes('approve_costs'));
  // Grenze 1000 €: nächste Buchung über 1000 → markiert
  eq((await owner.put('/api/settings', { repair_cost_limit_net: 1000 })).status, 200);
  const nBefore = (await users.fleet.get('/api/notifications')).data.notifications.filter((n) => n.kind === 'cost_limit' && n.case_id === id).length;
  const r1 = await cmd(users.ws, 'add_part', { name: 'Ausrücklager', quantity: 1, unit_price_net: 150, valuation: 'estimate' });
  eq(r1.status, 200); eq(r1.data.cost_limit_exceeded, true, 'Schätzung zählt mit');
  d = (await users.fleet.get(`/api/cases/${id}`)).data;
  ok(d.case.cost_over_limit_at, 'markiert');
  eq(d.cost_limit.limit_net, 1000); eq(d.cost_limit.approved_net, null);
  ok(d.allowed_actions.includes('approve_costs'), 'Leitung darf freigeben');
  const ev = d.events.find((e) => e.action === 'cost_limit_exceeded');
  ok(ev && ev.payload.total_net === 1050 && ev.payload.limit_net === 1000, 'Verlauf mit Beträgen für die Leitung');
  const nl = (await users.fleet.get('/api/notifications')).data.notifications.filter((n) => n.kind === 'cost_limit' && n.case_id === id);
  eq(nl.length, nBefore + 1, 'Leitung informiert'); eq(nl[0].urgent, 0, 'nicht dringend');
  ok(!(await users.ws.get('/api/notifications')).data.notifications.some((n) => n.kind === 'cost_limit'), 'Werkstatt nicht');
  // weitere Buchung: keine zweite Markierung/Benachrichtigung
  const r2 = await cmd(users.ws, 'add_part', { name: 'Schrauben', quantity: 4, unit_price_net: 2.5 });
  ok(!r2.data.cost_limit_exceeded, 'nur einmal');
  eq((await users.fleet.get(`/api/cases/${id}`)).data.events.filter((e) => e.action === 'cost_limit_exceeded').length, 1);
  // Werkstatt: sieht Markierung, aber keine Beträge, kann nicht freigeben
  const dw = (await users.ws.get(`/api/cases/${id}`)).data;
  ok(dw.case.cost_over_limit_at, 'Werkstatt sieht „ausstehend“');
  eq(dw.case.cost_approved_net, undefined); eq(dw.cost_limit, undefined); eq(dw.costs, undefined);
  eq(dw.events.find((e) => e.action === 'cost_limit_exceeded').payload, null, 'keine Beträge im Verlauf');
  ok(!dw.allowed_actions.includes('approve_costs'));
  eq((await cmd(users.ws, 'approve_costs', {}, 'selbst freigeben')).status, 403, 'Werkstatt darf nicht freigeben');
  ok((await users.fleet.get('/api/cases?status=open')).data.cases.some((x) => x.id === id && x.cost_over_limit_at), 'Liste zeigt Markierung');
  // Freigabe braucht Vermerk, gilt für den aktuellen Betrag
  eq((await cmd(users.fleet, 'approve_costs', {}, '')).status, 400);
  const ap = await cmd(users.fleet, 'approve_costs', {}, 'Rücksprache Werkstatt, Kupplung komplett');
  eq(ap.status, 200);
  d = (await users.fleet.get(`/api/cases/${id}`)).data;
  eq(d.case.cost_over_limit_at, null); eq(d.case.cost_approved_net, 1060); eq(d.cost_limit.approved_net, 1060);
  eq((await cmd(users.fleet, 'approve_costs', {}, 'nochmal')).status, 403, 'nichts mehr freizugeben');
  ok((await users.ws.get('/api/notifications')).data.notifications.some((n) => n.kind === 'cost_approved' && n.case_id === id), 'Werkstatt informiert');
  // bis zum freigegebenen Betrag keine neue Markierung, darüber erneut
  ok(!(await cmd(users.ws, 'add_part', { name: 'Dichtung', quantity: 1, unit_price_net: 0 })).data.cost_limit_exceeded, '≤ freigegebener Betrag');
  eq((await cmd(users.fleet, 'add_external_cost', { supplier: 'Getriebedienst', amount_net: 300, valuation: 'estimate' }, 'Angebot')).data.cost_limit_exceeded, true, 'über freigegebenem Betrag erneut');
  d = (await users.fleet.get(`/api/cases/${id}`)).data;
  ok(d.case.cost_over_limit_at); eq(d.events.filter((e) => e.action === 'cost_limit_exceeded').length, 2);
  // Fahrer (Meldender) sieht nichts davon
  const drv = await users.driver.get(`/api/cases/${id}`);
  if (drv.status === 200) { eq(drv.data.case.cost_over_limit_at, undefined); eq(drv.data.case.cost_approved_net, undefined); }
  eq((await owner.put('/api/settings', { repair_cost_limit_net: '' })).status, 200);
  ok(!(await cmd(users.ws, 'add_part', { name: 'Fett', quantity: 1, unit_price_net: 5 })).data.cost_limit_exceeded, 'Grenze aus');
  const kcsv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/cases?format=csv&q=Kostengrenze-Test')).data);
  ok(kcsv.split('\r\n')[1].endsWith(';ja;Meldung'), 'CSV: Kostenfreigabe ausstehend');
  eq((await anon.req('GET', '/api/integration/v1/cases?environment=test', undefined, { authorization: 'Bearer integration-token-xyz' })).data.cases.find((c) => c.id === id).cost_approval_pending, 1, 'Integrations-API: Kostenfreigabe offen');
  // Fuhrparkagent: offene Kostenfreigabe als Befund (ohne Beträge), verschwindet nach Freigabe
  eq((await users.fleet.post('/api/agent/run')).status, 200);
  const fnd = (await users.fleet.get('/api/master')).data.findings.find((f) => f.finding_code === 'COST_APPROVAL_PENDING' && f.case_id === id);
  ok(fnd && !/€|\d+[,.]\d\d/.test(fnd.message.replace(/\d{2}\.\d{2}\.\d{4}/g, '')), 'Befund ohne Beträge: ' + (fnd && fnd.message));
  // Kennzahl Kostenfreigaben: 2 Überschreitungen, 1 Freigabe, 1 ausstehend – nur Anzahl/Dauer, keine Beträge
  const ym = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date()).slice(0, 7);
  const kp = await users.fleet.get(`/api/reports/kpi?from=${ym}&to=${ym}`);
  eq(kp.status, 200);
  const ca = kp.data.cost_approvals;
  ok(ca.exceeded >= 2 && ca.approved >= 1 && ca.pending >= 1 && ca.cases >= 1, 'Kostenfreigaben gezählt: ' + JSON.stringify(ca));
  eq(ca.exceeded, ca.approved + ca.pending + ca.closed_without, 'jede Überschreitung genau einmal eingeordnet');
  ok(ca.to_approval.n === ca.approved && ca.to_approval.median_h >= 0, 'Dauer bis Freigabe');
  ok(!/net|eur|amount/i.test(Object.keys(ca).join(',')), 'keine Beträge');
  ok(kp.data.definitions.cost_approvals, 'Definition');
  eq((await users.ws.get(`/api/reports/kpi?from=${ym}&to=${ym}`)).status, 403, 'Werkstatt keine Kennzahlen');
});

await test('Werkstattauftrag aus Prüftermin: Leitung legt an und gibt frei, geplanter Termin übernommen, kein zweiter offener Auftrag, Erledigung erkannt', async () => {
  const VM = 'VIN:WDB96340310888888';
  const day = (n) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + n * 86400000));
  const rule = await users.fleet.post(`/api/vehicles/${VM}/maintenance`, { kind: 'Bremsen', last_done_date: day(-400), interval_months: 12, evidence: 'Auftragstest' });
  eq(rule.status, 201);
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/plan`, { planned_date: day(3) })).status, 200);
  eq((await users.ws.post(`/api/maintenance/${rule.data.id}/order`, { workshop_site: 'DORTMUND' })).status, 403, 'Werkstatt legt keinen Auftrag an');
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/order`, { workshop_site: 'GIBTSNICHT' })).status, 400);
  eq((await users.fleet.post('/api/maintenance/gibtsnicht/order', { workshop_site: 'DORTMUND' })).status, 404);
  const o = await users.fleet.post(`/api/maintenance/${rule.data.id}/order`, { workshop_site: 'DORTMUND', note: 'Bremsprüfstand', request_key: rk() });
  eq(o.status, 201); eq(o.data.status, 'werkstatt_freigegeben'); eq(o.data.planned_date, day(3), 'geplanter Prüftermin als Werkstatttermin');
  let d = (await users.fleet.get(`/api/cases/${o.data.id}`)).data;
  eq(d.case.origin, 'wartung'); eq(d.case.workshop_site, 'DORTMUND'); eq(d.case.planned_date, day(3));
  { const ce = d.events.find((e) => e.action === 'create'); const pl = typeof ce.payload === 'string' ? JSON.parse(ce.payload) : ce.payload;
    eq(pl.origin, 'wartung', 'Anlage-Ereignis nennt Herkunft Wartung (Verknüpfung im selben Batch)'); }
  ok(QSTAT.perRequest.filter((w) => w.path === '/api/maintenance/:id/order').every((w) => w.n <= 25), 'Auftrag aus Prüftermin ≤ 25 Abfragen');
  { // Anfragedaten können Herkunft/Verknüpfung nicht setzen
    const fake = await users.fleet.post('/api/cases', { vehicle_id: rule.data.vehicle_id || V1, description: 'Test Herkunft fremd gesetzt', origin: 'wartung', maintenance_rule_id: rule.data.id, request_key: rk() });
    eq(fake.status, 201); const fc = (await users.fleet.get(`/api/cases/${fake.data.id}`)).data;
    eq(fc.case.origin, 'meldung'); eq(fc.case.maintenance_rule_id ?? null, null, 'keine Verknüpfung aus Anfragedaten');
    eq((await users.fleet.post(`/api/cases/${fake.data.id}/commands`, { action: 'reject', command_id: rk(), expected_version: fc.case.version, note: 'Testdaten' })).status, 200); }
  ok(d.case.description.includes('Bremsen') && d.case.description.includes('Bremsprüfstand'), 'Beschreibung');
  eq(d.maintenance_rule.kind, 'Bremsen'); eq(d.maintenance_rule.done_since_order, false);
  ok((await users.ws.get('/api/notifications')).data.notifications.some((n) => n.case_id === o.data.id && n.kind === 'approved'), 'Werkstatt informiert');
  const dup = await users.fleet.post(`/api/maintenance/${rule.data.id}/order`, { workshop_site: 'DORTMUND', request_key: rk() });
  eq(dup.status, 409); eq(dup.data.error, 'order_exists');
  eq((await users.fleet.get('/api/maintenance')).data.rows.find((r) => r.id === rule.data.id).open_order.case_no, o.data.case_no, 'Übersicht zeigt offenen Auftrag');
  const plan = (await users.ws.get('/api/workshop/plan')).data;
  const d3 = plan.days.find((x) => x.date === day(3));
  ok(d3.items.some((i) => i.type === 'case' && i.id === o.data.id), 'Werkstattplan: Auftrag am Tag');
  ok(!d3.items.some((i) => i.type === 'maintenance' && i.id === rule.data.id), 'Werkstattplan: Prüftermin nicht doppelt');
  ok((await users.fleet.get(`/api/vehicles/${VM}`)).data.cases.some((c) => c.id === o.data.id && c.maintenance_rule_id === rule.data.id), 'Fahrzeugakte kennt Verknüpfung');
  // Integrations-API bleibt unverändert (keine Auftragsdaten)
  const im = await anon.req('GET', '/api/integration/v1/maintenance', undefined, { authorization: 'Bearer integration-token-xyz' });
  eq(im.data.rows.find((r) => r.id === rule.data.id).open_order, undefined);
  eq((await anon.req('GET', '/api/integration/v1/cases?environment=test', undefined, { authorization: 'Bearer integration-token-xyz' })).data.cases.find((c) => c.id === o.data.id).maintenance_rule_id, rule.data.id, 'Integrations-API: Verknüpfung');
  // Prüfung in der Akte erledigt → am Auftrag erkannt
  eq((await users.ws.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(0), evidence: 'Prüfbericht Auftragstest' })).status, 200);
  d = (await users.fleet.get(`/api/cases/${o.data.id}`)).data;
  eq(d.maintenance_rule.done_since_order, true);
  // Auftrag ablehnen (schließen) → neuer Auftrag möglich
  const cur = d.case;
  eq((await users.fleet.post(`/api/cases/${o.data.id}/commands`, { action: 'comment', command_id: rk(), expected_version: cur.version, note: 'erledigt laut Prüfbericht' })).status, 200);
  eq((await users.fleet.get('/api/maintenance')).data.rows.find((r) => r.id === rule.data.id).open_order.id, o.data.id);
  eq((await users.fleet.get('/api/maintenance')).data.rows.find((r) => r.id === rule.data.id).unrecorded_order, null, 'offener Auftrag: kein Hinweis');
});

await test('Werkstattauftrag aus Prüftermin: nach technischer Freigabe ohne Eintragung in der Akte erscheint der Hinweis, nach Eintragung nicht mehr', async () => {
  const VM = 'VIN:WDB96340310888888';
  const day = (n) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + n * 86400000));
  const rule = await users.fleet.post(`/api/vehicles/${VM}/maintenance`, { kind: 'Hydraulik/Aufbau', last_done_date: day(-400), interval_months: 12, evidence: 'Auftragstest 2' });
  const o = await users.fleet.post(`/api/maintenance/${rule.data.id}/order`, { workshop_site: 'DORTMUND', request_key: rk() });
  eq(o.status, 201);
  const id = o.data.id;
  const cmd = async (u, action, payload = {}, note = null) => {
    const cur = (await users.fleet.get(`/api/cases/${id}`)).data.case;
    return u.post(`/api/cases/${id}/commands`, { action, command_id: rk(), expected_version: cur.version, payload, note });
  };
  eq((await cmd(users.ws, 'start_repair')).status, 200);
  eq((await cmd(users.ws, 'record_work', { hours: 1, description: 'Hydraulik geprüft' })).status, 200);
  const items = (await users.ws.get('/api/meta')).data.checklist.map((c) => ({ key: c.key, result: 'ok' }));
  eq((await users.ws.post('/api/inspections', { kind: 'nach_reparatur', case_id: id, request_key: rk(), items })).status, 201);
  eq((await cmd(users.ws, 'request_quality_check', {}, 'Hydraulik geprüft, dicht')).status, 200);
  eq((await cmd(users.fleet, 'technical_release', { confirm: true }, 'Kontrolle ok')).status, 200);
  const row = async () => (await users.fleet.get('/api/maintenance')).data.rows.find((r) => r.id === rule.data.id);
  let r = await row();
  eq(r.open_order, null); eq(r.unrecorded_order && r.unrecorded_order.id, id, 'Hinweis: Prüfung noch nicht eingetragen');
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(0), evidence: 'Prüfprotokoll Hydraulik' })).status, 200);
  r = await row();
  eq(r.unrecorded_order, null, 'nach Eintragung kein Hinweis');
});

await test('Werkstattauftrag aus Prüfmangel: nur bei erheblichen/gefährlichen Mängeln, Vorbelegung aus Ergebnis, kein zweiter offener Auftrag, Hinweis in Übersicht/Datenqualität entfällt', async () => {
  const VD = 'VIN:WDB96340310777777';
  const day = (n) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + n * 86400000));
  eq((await owner.post('/api/vehicles', { plate: 'MD-XY 77', vin: 'WDB96340310777777', site: 'Dortmund' })).status, 201);
  const rule = await users.fleet.post(`/api/vehicles/${VD}/maintenance`, { kind: 'UVV', last_done_date: day(-400), interval_months: 12, evidence: 'MD-Test' });
  eq(rule.status, 201);
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(-20), evidence: 'UVV-Protokoll 4711', result: 'geringe_maengel' })).status, 200);
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(-2), evidence: 'UVV-Protokoll 4712', result: 'verkehrsunsicher' })).status, 200);
  const akte = (await users.fleet.get(`/api/vehicles/${VD}`)).data;
  const evMinor = akte.maintenance_history.find((h) => h.result === 'geringe_maengel');
  const evBad = akte.maintenance_history.find((h) => h.result === 'verkehrsunsicher');
  ok(evMinor?.id && evBad?.id, 'Durchführungen mit id in der Akte');
  const ov = await users.fleet.get('/api/maintenance');
  ok(ov.data.defects_without_case.some((x) => x.id === evBad.id && x.plate === 'MD-XY 77' && x.evidence === 'UVV-Protokoll 4712'), 'Übersicht: Mangel ohne Vorgang');
  ok(!ov.data.defects_without_case.some((x) => x.id === evMinor.id), 'geringe Mängel nicht');
  ok((await users.ws.get('/api/maintenance')).data.defects_without_case.some((x) => x.id === evBad.id), 'Werkstatt-Startseite: sieht Prüfmangel ohne Auftrag (nur lesend)');
  ok((await users.fleet.get('/api/admin/data-quality')).data.items.some((i) => i.check === 'inspection_defects_no_case' && i.event_id === evBad.id), 'Datenqualität mit event_id');
  eq((await users.fleet.post('/api/agent/run')).status, 200);
  const agentF = () => users.fleet.get('/api/master').then((x) => x.data.findings.filter((f) => f.finding_code === 'INSPECTION_DEFECTS_NO_CASE' && f.vehicle_id === VD && f.status !== 'resolved'));
  const fd = await agentF();
  ok(fd.length === 1 && fd[0].severity === 'kritisch' && fd[0].message.includes('verkehrsunsicher'), 'Agent-Befund: ' + JSON.stringify(fd[0] || null));
  eq((await users.ws.post(`/api/maintenance/events/${evBad.id}/order`, { workshop_site: 'DORTMUND' })).status, 403, 'Werkstatt nicht');
  eq((await users.fleet.post(`/api/maintenance/events/${evMinor.id}/order`, { workshop_site: 'DORTMUND' })).status, 400, 'geringe Mängel → kein Auftrag');
  eq((await users.fleet.post('/api/maintenance/events/gibtsnicht/order', { workshop_site: 'DORTMUND' })).status, 404);
  eq((await users.fleet.post(`/api/maintenance/events/${evBad.id}/order`, { workshop_site: 'GIBTSNICHT' })).status, 400);
  const o = await users.fleet.post(`/api/maintenance/events/${evBad.id}/order`, { workshop_site: 'DORTMUND', note: 'Bremsleitung' });
  eq(o.status, 201);
  eq(o.data.status, 'werkstatt_freigegeben'); eq(o.data.priority, 'kritisch'); eq(o.data.driveability, 'nicht_fahrbereit');
  const c = (await users.fleet.get(`/api/cases/${o.data.id}`)).data;
  eq(c.case.origin, 'wartung'); eq(c.case.maintenance_event_id, evBad.id, 'Verknüpfung gespeichert');
  ok(QSTAT.perRequest.filter((w) => w.path === '/api/maintenance/events/:id/order').every((w) => w.n <= 27), 'Auftrag aus Prüfung ≤ 27 Abfragen');
  console.log('     Auftrag aus Prüftermin/Prüfung max. ' + Math.max(...QSTAT.perRequest.filter((w) => w.path === '/api/maintenance/:id/order').map((w) => w.n)) + ' / ' + Math.max(...QSTAT.perRequest.filter((w) => w.path === '/api/maintenance/events/:id/order').map((w) => w.n)) + ' Abfragen');
  ok(c.case.description.includes('Mängel aus UVV vom') && c.case.description.includes('verkehrsunsicher') && c.case.description.includes('UVV-Protokoll 4712') && c.case.description.includes('Bremsleitung'), 'Beschreibung mit Herkunft/Nachweis');
  eq(c.maintenance_event?.id, evBad.id, 'Vorgang zeigt Prüfung');
  eq(c.case.safety_lock, 1, 'verkehrsunsicher → gesperrt'); eq(c.case.safety_lock_reason, 'Meldung Fuhrparkleitung: nicht fahrbereit (ungeprüft)', 'Sperrgrund nennt die Rolle');
  ok(!c.maintenance_rule, 'kein Prüftermin-Auftrag (Prüfung selbst ist erledigt)');
  const dup = await users.fleet.post(`/api/maintenance/events/${evBad.id}/order`, { workshop_site: 'DORTMUND' });
  eq(dup.status, 409); eq(dup.data.error, 'order_exists');
  ok(!(await users.fleet.get('/api/maintenance')).data.defects_without_case.some((x) => x.id === evBad.id), 'Übersicht: Hinweis entfällt');
  ok(!(await users.ws.get('/api/maintenance')).data.defects_without_case.some((x) => x.id === evBad.id), 'Werkstatt-Startseite: Hinweis entfällt, Auftrag steht in der Werkstattliste');
  { const app = (await import('node:fs')).readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
    ok(/ov\.defects_without_case \|\| \[\][\s\S]{0,200}ws_defects_pending/.test(app.slice(app.indexOf('async function workshopBoard'))), 'Werkstatt-Startseite zeigt Prüfmängel ohne Auftrag');
    ok(!/ws_defects_pending[\s\S]{0,600}(data-order|\/order)/.test(app), 'ohne Auftragsknopf (nur lesend)'); }
  eq((await users.fleet.post('/api/agent/run')).status, 200);
  eq((await agentF()).length, 0, 'Agent-Befund erledigt nach Auftrag');
  ok((await users.fleet.get(`/api/vehicles/${VD}`)).data.cases.some((x) => x.maintenance_event_id === evBad.id), 'Akte: Vorgang verknüpft');
  // Werkstatt sieht den Auftrag
  ok((await users.ws.get(`/api/cases/${o.data.id}`)).status === 200, 'Werkstatt sieht Auftrag');
  // weitere Prüfung mit erheblichen Mängeln: eigener Auftrag möglich, Vorbelegung mittel/unbekannt
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(-1), evidence: 'UVV-Nachprüfung 4713', result: 'erhebliche_maengel' })).status, 200);
  const ev3 = (await users.fleet.get(`/api/vehicles/${VD}`)).data.maintenance_history.find((h) => h.evidence === 'UVV-Nachprüfung 4713');
  const o2 = await users.fleet.post(`/api/maintenance/events/${ev3.id}/order`, { workshop_site: 'DORTMUND' });
  eq(o2.status, 201); eq(o2.data.priority, 'mittel'); eq(o2.data.driveability, 'unbekannt');
  eq((await users.fleet.post(`/api/maintenance/events/${evMinor.id}/order`, { workshop_site: 'DORTMUND', priority: 'egal' })).status, 400, 'Validierung');
});

await test('Nachprüfung nach Mängelauftrag: nach technischer Freigabe Hinweis (Übersicht, Agent), nach Eintragung der Nachprüfung erledigt; Fahrer ohne Zugriff', async () => {
  const VR = 'VIN:WDB96340310666666';
  const day = (n) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + n * 86400000));
  eq((await owner.post('/api/vehicles', { plate: 'NP-XY 66', vin: 'WDB96340310666666', site: 'Dortmund' })).status, 201);
  const rule = await users.fleet.post(`/api/vehicles/${VR}/maintenance`, { kind: 'UVV', last_done_date: day(-400), interval_months: 12, evidence: 'NP-Test' });
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(-5), evidence: 'UVV-Protokoll 5501', result: 'erhebliche_maengel' })).status, 200);
  const ev = (await users.fleet.get(`/api/vehicles/${VR}`)).data.maintenance_history.find((h) => h.evidence === 'UVV-Protokoll 5501');
  const o = await users.fleet.post(`/api/maintenance/events/${ev.id}/order`, { workshop_site: 'DORTMUND', request_key: rk() });
  eq(o.status, 201);
  const id = o.data.id;
  const pend = async () => (await users.fleet.get('/api/maintenance')).data.reinspection_pending.filter((x) => x.id === ev.id);
  eq((await pend()).length, 0, 'offener Auftrag → noch kein Hinweis');
  const cmd = async (u, action, payload = {}, note = null) => {
    const cur = (await users.fleet.get(`/api/cases/${id}`)).data.case;
    return u.post(`/api/cases/${id}/commands`, { action, command_id: rk(), expected_version: cur.version, payload, note });
  };
  eq((await cmd(users.ws, 'start_repair')).status, 200);
  eq((await cmd(users.ws, 'record_work', { hours: 2, description: 'Mängel laut UVV beseitigt' })).status, 200);
  const items = (await users.ws.get('/api/meta')).data.checklist.map((c) => ({ key: c.key, result: 'ok' }));
  eq((await users.ws.post('/api/inspections', { kind: 'nach_reparatur', case_id: id, request_key: rk(), items })).status, 201);
  eq((await cmd(users.ws, 'request_quality_check', {}, 'Mängel beseitigt')).status, 200);
  eq((await cmd(users.fleet, 'technical_release', { confirm: true }, 'Kontrolle ok')).status, 200);
  eq((await users.fleet.get(`/api/cases/${id}`)).data.maintenance_event.reinspection, null, 'Vorgang: noch keine Nachprüfung');
  let p = await pend();
  eq(p.length, 1, 'Hinweis nach Freigabe');
  eq(p[0].case_id, id); eq(p[0].plate, 'NP-XY 66'); eq(p[0].result, 'erhebliche_maengel'); ok(p[0].closed_at, 'Freigabezeitpunkt');
  eq((await users.driver.get('/api/maintenance')).status, 403, 'Fahrer kein Zugriff');
  // Nachweisliste „Durchgeführte Prüfungen“: Mängelauftrag und Stand der Nachprüfung je Prüfung (nur bei erheblichen Mängeln, je Umgebung)
  const histRow = async (u, hdr) => (await u.get(`/api/maintenance/history?from=${day(-30)}&to=${day(0)}&kind=UVV`, hdr)).data.rows.find((x) => x.event_id === ev.id);
  let hr = await histRow(users.fleet);
  eq(hr.defect_case_no, o.data.case_no, 'Liste: Mängelauftrag'); eq(hr.defect_case_id, id); eq(hr.defect_case_status, 'fahrzeug_freigegeben'); eq(hr.reinspection_date, null, 'Liste: Nachprüfung offen');
  eq((await histRow(owner, { 'x-cfp-env': 'production' })).defect_case_no, null, 'Betrieb sieht Auftrag der Testumgebung nicht');
  eq((await users.fleet.post('/api/agent/run')).status, 200);
  const agentF = () => users.fleet.get('/api/master').then((x) => x.data.findings.filter((f) => f.finding_code === 'REINSPECTION_PENDING' && f.vehicle_id === VR && f.status !== 'resolved'));
  const fd = await agentF();
  ok(fd.length === 1 && fd[0].severity === 'handeln' && fd[0].message.includes(o.data.case_no) && fd[0].next_action.includes('Nachweis'), 'Agent-Befund: ' + JSON.stringify(fd[0] || null));
  ok(!/\d+ Tage|Monat/.test(fd[0].next_action.replace('Prüfbericht', '')), 'keine erfundene Frist');
  // Nachprüfung eintragen (gleiche Prüfart, späteres Datum) → erledigt
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(0), evidence: 'UVV-Nachprüfung 5502', result: 'ohne_maengel' })).status, 200);
  eq((await pend()).length, 0, 'nach Nachprüfung kein Hinweis');
  const ri = (await users.fleet.get(`/api/cases/${id}`)).data.maintenance_event.reinspection;
  eq(ri && ri.done_date, day(0)); eq(ri.result, 'ohne_maengel'); eq(ri.evidence, 'UVV-Nachprüfung 5502');
  hr = await histRow(users.fleet);
  eq(hr.reinspection_date, day(0), 'Liste: Nachprüfung eingetragen'); eq(hr.reinspection_result, 'ohne_maengel');
  const hrAll = (await users.fleet.get(`/api/maintenance/history?from=${day(-30)}&to=${day(0)}&kind=UVV`)).data.rows.filter((x) => x.vehicle_id === VR);
  const nach = hrAll.find((x) => x.evidence === 'UVV-Nachprüfung 5502');
  ok(nach && nach.defect_case_no === null && nach.reinspection_date === null, 'Prüfung ohne Mängel: keine Auftrags-/Nachprüfungsangaben');
  const hc = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get(`/api/maintenance/history?format=csv&from=${day(-30)}&to=${day(0)}&kind=UVV`)).data);
  ok(hc.split('\r\n')[0].endsWith(';Mängelauftrag;Status Mängelauftrag;Nachprüfung am;Ergebnis Nachprüfung'), 'CSV-Kopf erweitert');
  ok(hc.split('\r\n').some((l) => l.includes('UVV-Protokoll 5501') && l.endsWith(`;${o.data.case_no};fahrzeug_freigegeben;${day(0)};ohne Mängel`)), 'CSV-Zeile mit Auftrag und Nachprüfung');
  const H = { authorization: 'Bearer integration-token-xyz' };
  const iev = async (q) => (await anon.req('GET', `/api/integration/v1/maintenance/history?from=${day(-30)}&to=${day(0)}&kind=UVV${q}`, undefined, H)).data;
  const ip = await iev('&environment=test');
  eq(ip.environment, 'test'); eq(ip.events.find((x) => x.event_id === ev.id).defect_case_no, o.data.case_no, 'Integrations-API: Auftrag');
  eq((await iev('')).events.find((x) => x.event_id === ev.id).defect_case_no, null, 'Integrations-API: Betrieb getrennt');
  eq((await users.fleet.post('/api/agent/run')).status, 200);
  eq((await agentF()).length, 0, 'Agent-Befund erledigt');
  ok(!(await users.fleet.get('/api/maintenance')).data.defects_without_case.some((x) => x.id === ev.id), 'kein Mangel-ohne-Auftrag-Hinweis');
  const dqAgain = async () => (await users.fleet.get('/api/admin/data-quality')).data.items.filter((i) => i.check === 'reinspection_defects_again' && i.vehicle_id === VR);
  eq((await dqAgain()).length, 0, 'Nachprüfung ohne Mängel → kein Wiederholungsmangel');
  // zweite Runde: neue Prüfung mit Mängeln → Auftrag → Freigabe → Nachprüfung erneut mit gefährlichen Mängeln → Datenqualität
  const VR2 = 'VIN:WDB96340310666667';
  eq((await owner.post('/api/vehicles', { plate: 'NP-XY 67', vin: 'WDB96340310666667', site: 'Dortmund' })).status, 201);
  const rule2 = await users.fleet.post(`/api/vehicles/${VR2}/maintenance`, { kind: 'UVV', last_done_date: day(-400), interval_months: 12, evidence: 'NP-Test 2' });
  eq((await users.fleet.post(`/api/maintenance/${rule2.data.id}/complete`, { done_date: day(-4), evidence: 'UVV-Protokoll 5503', result: 'erhebliche_maengel' })).status, 200);
  const ev3 = (await users.fleet.get(`/api/vehicles/${VR2}`)).data.maintenance_history.find((h) => h.evidence === 'UVV-Protokoll 5503');
  const o3 = await users.fleet.post(`/api/maintenance/events/${ev3.id}/order`, { workshop_site: 'DORTMUND', request_key: rk() });
  eq(o3.status, 201);
  const cmd3 = async (u, action, payload = {}, note = null) => {
    const cur = (await users.fleet.get(`/api/cases/${o3.data.id}`)).data.case;
    return u.post(`/api/cases/${o3.data.id}/commands`, { action, command_id: rk(), expected_version: cur.version, payload, note });
  };
  { const r = await cmd3(users.ws, 'start_repair'); eq(r.status, 200, JSON.stringify(r.data)); }
  eq((await cmd3(users.ws, 'record_work', { hours: 1, description: 'Mängel laut UVV beseitigt' })).status, 200);
  eq((await users.ws.post('/api/inspections', { kind: 'nach_reparatur', case_id: o3.data.id, request_key: rk(), items })).status, 201);
  { const r = await cmd3(users.ws, 'request_quality_check', {}, 'erledigt'); eq(r.status, 200, JSON.stringify(r.data)); }
  { const r = await cmd3(users.fleet, 'technical_release', { confirm: true }, 'Kontrolle ok'); eq(r.status, 200, JSON.stringify(r.data)); }
  eq((await users.fleet.get('/api/admin/data-quality')).data.items.filter((i) => i.check === 'reinspection_defects_again' && i.vehicle_id === VR2).length, 0, 'vor der Nachprüfung kein Befund');
  { const r = await users.fleet.post(`/api/maintenance/${rule2.data.id}/complete`, { done_date: day(0), evidence: 'UVV-Nachprüfung 5504', result: 'gefaehrliche_maengel' }); eq(r.status, 200, JSON.stringify(r.data)); }
  const ag = (await users.fleet.get('/api/admin/data-quality')).data.items.filter((i) => i.check === 'reinspection_defects_again' && i.vehicle_id === VR2);
  ok(ag.length === 1 && ag[0].severity === 'luecke' && ag[0].detail.includes('gefährliche Mängel') && ag[0].detail.includes(o3.data.case_no), 'Wiederholungsmangel: ' + JSON.stringify(ag));
  eq((await owner.get('/api/admin/data-quality', { 'x-cfp-env': 'production' })).data.items.filter((i) => i.check === 'reinspection_defects_again' && i.vehicle_id === VR2).length, 0, 'Betrieb sieht Testauftrag nicht');
  // Kennzahlen: Mängelbeseitigung aus Prüfungen (Zeitraum deckt alle Prüfdaten dieses Tests ab)
  const kq = `/api/reports/kpi?from=${day(-5).slice(0, 7)}&to=${day(0).slice(0, 7)}`;
  const kd = (await users.fleet.get(kq)).data.inspection_defects;
  ok(kd.inspections >= 3 && kd.ordered + kd.without_order === kd.inspections && kd.released + kd.open === kd.ordered, 'Summen stimmen: ' + JSON.stringify(kd));
  ok(kd.released >= 2 && kd.to_release_days.n === kd.released && kd.to_release_days.median_d >= 0 && kd.to_release_days.p90_d <= 5, 'Dauer in Tagen');
  ok(kd.reinspected >= 2 && kd.defects_again >= 1 && kd.without_order >= 1, 'Nachprüfung/erneut Mängel/ohne Auftrag');
  const kdp = (await owner.get(kq, { 'x-cfp-env': 'production' })).data.inspection_defects;
  eq(kdp.inspections, kd.inspections, 'Prüfungen sind gemeinsame Stammdaten'); ok(kdp.ordered <= kd.ordered - 2, 'Aufträge je Umgebung');
  const kds = (await users.fleet.get(kq + '&site=DORTMUND')).data.inspection_defects;
  const ik = await anon.req('GET', `/api/integration/v1/kpi?from=${day(-5).slice(0, 7)}&to=${day(0).slice(0, 7)}&environment=test`, undefined, { authorization: 'Bearer integration-token-xyz' });
  eq(ik.status, 200); eq(ik.data.schema_version, '1.0'); eq(JSON.stringify(ik.data.inspection_defects), JSON.stringify(kd), 'Integrations-API /v1/kpi = App');
  eq((await anon.req('GET', '/api/integration/v1/kpi')).status, 401, 'ohne Token');
  eq((await anon.req('GET', '/api/integration/v1/kpi?from=2026-13', undefined, { authorization: 'Bearer integration-token-xyz' })).status, 400);
  eq(kds.without_order, null, 'mit Standortfilter keine Angabe ohne Auftrag'); ok(kds.ordered >= 2 && kds.inspections === kds.ordered, 'Standortfilter nur Prüfungen mit Auftrag dort');
});

await test('Integrations-API /v1/maintenance: additiv Prüfmängel ohne Auftrag und ausstehende Nachprüfungen je Umgebung; /v1/cases mit maintenance_event_id', async () => {
  const VI = 'VIN:WDB96340310555555';
  const day = (n) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + n * 86400000));
  const H = { authorization: 'Bearer integration-token-xyz' };
  eq((await owner.post('/api/vehicles', { plate: 'IA-XY 55', vin: 'WDB96340310555555', site: 'Dortmund' })).status, 201);
  const rule = await users.fleet.post(`/api/vehicles/${VI}/maintenance`, { kind: 'UVV', last_done_date: day(-400), interval_months: 12, evidence: 'IA-Test' });
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(-3), evidence: 'UVV-Protokoll 6601', result: 'gefaehrliche_maengel' })).status, 200);
  const ev = (await users.fleet.get(`/api/vehicles/${VI}`)).data.maintenance_history.find((h) => h.evidence === 'UVV-Protokoll 6601');
  let im = await anon.req('GET', '/api/integration/v1/maintenance?environment=test', undefined, H);
  eq(im.status, 200); eq(im.data.environment, 'test');
  ok(im.data.defects_without_case.some((x) => x.id === ev.id && x.plate === 'IA-XY 55'), 'Mangel ohne Auftrag (test)');
  ok(Array.isArray(im.data.reinspection_pending) && Array.isArray(im.data.rows), 'Felder vorhanden, Bestand unverändert');
  eq(im.data.rows.find((r) => r.id === rule.data.id)?.open_order, undefined, 'keine Auftragsdaten in rows');
  const o = await users.fleet.post(`/api/maintenance/events/${ev.id}/order`, { workshop_site: 'DORTMUND', request_key: rk() });
  eq(o.status, 201);
  im = await anon.req('GET', '/api/integration/v1/maintenance?environment=test', undefined, H);
  ok(!im.data.defects_without_case.some((x) => x.id === ev.id), 'nach Auftrag entfällt');
  im = await anon.req('GET', '/api/integration/v1/maintenance', undefined, H);
  eq(im.data.environment, 'production');
  ok(im.data.defects_without_case.some((x) => x.id === ev.id), 'Betrieb: Auftrag lag in Test → Hinweis bleibt (Umgebungen getrennt)');
  ok(!JSON.stringify(im.data.defects_without_case).includes('recorded_by'), 'keine Personennamen');
  const ic = await anon.req('GET', '/api/integration/v1/cases?environment=test', undefined, H);
  eq(ic.data.cases.find((c) => c.id === o.data.id).maintenance_event_id, ev.id, '/v1/cases kennt Prüfung');
});

await test('Prüfmangel ohne Auftrag ist überholt, sobald eine neuere Durchführung derselben Prüfart eingetragen ist (Nachprüfung außerhalb der App); erneute Mängel zählen an der neueren', async () => {
  const VD = 'VIN:WDB96340310888881';
  const day = (n) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + n * 86400000));
  eq((await owner.post('/api/vehicles', { plate: 'UH-XY 81', vin: 'WDB96340310888881', site: 'Dortmund' })).status, 201);
  const uvv = await users.fleet.post(`/api/vehicles/${VD}/maintenance`, { kind: 'UVV', last_done_date: day(-400), interval_months: 12, evidence: 'UH-Test' });
  const tacho = await users.fleet.post(`/api/vehicles/${VD}/maintenance`, { kind: 'Tachograph', last_done_date: day(-400), interval_months: 24, evidence: 'UH-Test' });
  eq((await users.fleet.post(`/api/maintenance/${uvv.data.id}/complete`, { done_date: day(-30), evidence: 'UH-UVV 1', result: 'erhebliche_maengel' })).status, 200);
  eq((await users.fleet.post(`/api/maintenance/${tacho.data.id}/complete`, { done_date: day(-30), evidence: 'UH-Tacho 1', result: 'erhebliche_maengel' })).status, 200);
  const hist = async () => (await users.fleet.get(`/api/vehicles/${VD}`)).data.maintenance_history;
  const evU1 = (await hist()).find((h) => h.evidence === 'UH-UVV 1');
  const evT1 = (await hist()).find((h) => h.evidence === 'UH-Tacho 1');
  const dwc = async () => (await users.fleet.get('/api/maintenance')).data.defects_without_case.map((x) => x.id);
  let ids = await dwc();
  ok(ids.includes(evU1.id) && ids.includes(evT1.id), 'beide Prüfungen zunächst ohne Auftrag');
  // UVV: Nachprüfung ohne Mängel eingetragen → erledigt; andere Prüfart (Tachograph) bleibt
  eq((await users.fleet.post(`/api/maintenance/${uvv.data.id}/complete`, { done_date: day(-10), evidence: 'UH-UVV 2', result: 'ohne_maengel' })).status, 200);
  ids = await dwc();
  ok(!ids.includes(evU1.id), 'UVV überholt durch Nachprüfung');
  ok(ids.includes(evT1.id), 'Tachograph (andere Prüfart) bleibt');
  ok(!(await users.fleet.get('/api/admin/data-quality')).data.items.some((i) => i.check === 'inspection_defects_no_case' && i.event_id === evU1.id), 'Datenqualität ebenso');
  // Tachograph: Nachprüfung erneut mit Mängeln → Hinweis wandert zur neueren Prüfung
  eq((await users.fleet.post(`/api/maintenance/${tacho.data.id}/complete`, { done_date: day(-5), evidence: 'UH-Tacho 2', result: 'gefaehrliche_maengel' })).status, 200);
  const evT2 = (await hist()).find((h) => h.evidence === 'UH-Tacho 2');
  ids = await dwc();
  ok(!ids.includes(evT1.id) && ids.includes(evT2.id), 'erneute Mängel: neuere Prüfung zählt');
  eq((await users.fleet.post('/api/agent/run')).status, 200);
  const f = (await users.fleet.get('/api/master')).data.findings.filter((x) => x.finding_code === 'INSPECTION_DEFECTS_NO_CASE' && x.vehicle_id === VD && x.status !== 'resolved');
  eq(f.length, 1, 'Agent: genau ein Befund (neuere Tachograph-Prüfung)');
  eq(f[0].severity, 'kritisch');
});

await test('Prüfung mit gefährlichen Mängeln/verkehrsunsicher: sofortiger dringender Hinweis an Leitung/Dispo (nicht an Erfassende, nicht für alte Berichte), Datum nicht in der Zukunft; Dispo sieht „Prüfung nicht bestanden“', async () => {
  const VD = 'VIN:WDB96340310888882';
  const day = (n) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + n * 86400000));
  eq((await owner.post('/api/vehicles', { plate: 'GM-XY 82', vin: 'WDB96340310888882', site: 'Dortmund' })).status, 201);
  const rule = await users.fleet.post(`/api/vehicles/${VD}/maintenance`, { kind: 'UVV', last_done_date: day(-400), interval_months: 12, evidence: 'GM-Test' });
  const fut = await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(2), evidence: 'GM 0' });
  eq(fut.status, 400, 'Zukunftsdatum abgewiesen');
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: '2026-02-30', evidence: 'GM 0' })).status, 400, 'ungültiges Datum');
  eq((await users.fleet.post(`/api/vehicles/${VD}/maintenance`, { kind: 'UVV', last_done_date: day(3), interval_months: 12, evidence: 'GM-Zukunft' })).status, 400, 'Regel: letzte Durchführung nicht in der Zukunft');
  const notes = async (u) => (await u.get('/api/notifications')).data.notifications.filter((n) => n.kind === 'inspection_defect' && n.body.includes('GM-XY 82'));
  // alter Bericht nachgetragen → kein Alarm
  const old = await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(-60), evidence: 'GM 1', result: 'verkehrsunsicher' });
  eq(old.status, 200); eq(old.data.notified, 0, 'alter Bericht: kein Alarm');
  eq((await notes(users.dispatch)).length, 0);
  const cur = await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(-1), evidence: 'GM 2', result: 'verkehrsunsicher' });
  eq(cur.status, 200); ok(cur.data.notified >= 1, 'Alarm versendet');
  const nd = await notes(users.dispatch);
  ok(nd.length === 1 && nd[0].urgent && nd[0].body.includes('verkehrsunsicher') && nd[0].body.includes('nicht einplanen'), 'Dispo dringend informiert: ' + JSON.stringify(nd[0] || null));
  eq((await notes(users.fleet)).length, 0, 'Erfassende Person nicht');
  eq((await notes(users.driver)).length, 0, 'Fahrer nicht');
  eq((await notes(users.ws)).length, 0, 'Werkstatt nicht');
  // erneutes Speichern derselben Prüfung → kein zweiter Hinweis
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(-1), evidence: 'GM 2b', result: 'verkehrsunsicher' })).status, 200);
  eq((await notes(users.dispatch)).length, 1, 'idempotent');
  // Dispo liest die Prüfmängel ohne Auftrag (Startseite „Prüfung nicht bestanden“)
  const dm = await users.dispatch.get('/api/maintenance');
  eq(dm.status, 200);
  ok(dm.data.defects_without_case.some((x) => x.vehicle_id === VD && x.result === 'verkehrsunsicher'), 'Dispo sieht Prüfmangel ohne Auftrag');
  // erhebliche Mängel: kein Sofort-Alarm (Heute zu tun genügt)
  const rule2 = await users.fleet.post(`/api/vehicles/${VD}/maintenance`, { kind: 'Tachograph', last_done_date: day(-400), interval_months: 24, evidence: 'GM-Test' });
  const er = await users.fleet.post(`/api/maintenance/${rule2.data.id}/complete`, { done_date: day(0), evidence: 'GM 3', result: 'erhebliche_maengel' });
  eq(er.data.notified, 0, 'erhebliche Mängel ohne Sofort-Alarm');
  // Push-Einstellungen: nicht abschaltbar
  const pr = await users.dispatch.get('/api/me/notify-prefs');
  ok(!JSON.stringify(pr.data).includes('inspection_defect'), 'nicht in den abschaltbaren Arten');
  // Integrations-API /v1/availability: additiv failed_inspection (Information), Umgebungen getrennt
  const H = { authorization: 'Bearer integration-token-xyz' };
  const av = (await anon.req('GET', '/api/integration/v1/availability?environment=test', undefined, H)).data.vehicles;
  const fi = av.find((v) => v.id === VD).failed_inspection;
  ok(fi && fi.result === 'verkehrsunsicher' && fi.kind === 'UVV' && fi.done_date === day(-1), 'failed_inspection: ' + JSON.stringify(fi));
  ok(av.filter((v) => v.id !== VD).every((v) => 'failed_inspection' in v), 'Feld bei allen Fahrzeugen');
  const dl = (await users.dispatch.get('/api/vehicles')).data.vehicles.find((v) => v.id === VD);
  eq(JSON.stringify(dl.failed_inspection), JSON.stringify(fi), 'Fahrzeugliste (Dispo) gleich wie API');
  ok(!('failed_inspection' in ((await users.driver.get('/api/vehicles')).data.vehicles[0] || {})), 'Fahrer: Feld nicht enthalten');
  // Fahrzeugakte: gleiche Aussage wie Liste/API (Warnung im Kopf), auch für Werkstatt/Dispo
  for (const who of ['fleet', 'dispatch']) {
    const fd = (await users[who].get(`/api/vehicles/${VD}`)).data.failed_inspection;
    ok(fd && fd.kind === fi.kind && fd.done_date === fi.done_date && fd.result === fi.result && fd.event_id, who + ': Akte failed_inspection ' + JSON.stringify(fd));
  }
  eq((await users.fleet.get(`/api/vehicles/${(av.find((v) => v.id !== VD && !v.failed_inspection) || {}).id}`)).data.failed_inspection, null, 'andere Akte ohne Warnung');
  const o = await users.fleet.post(`/api/maintenance/events/${(await users.fleet.get(`/api/vehicles/${VD}`)).data.maintenance_history.find((h) => h.evidence === 'GM 2b').id}/order`, { workshop_site: 'DORTMUND', request_key: rk() });
  eq(o.status, 201);
  const av2 = (await anon.req('GET', '/api/integration/v1/availability?environment=test', undefined, H)).data.vehicles.find((v) => v.id === VD);
  eq(av2.failed_inspection, null, 'nach Auftrag: Sperre/Werkstatt statt Hinweis');
  eq(av2.availability, 'gesperrt', 'Auftrag aus verkehrsunsicher sperrt');
  eq((await users.fleet.get(`/api/vehicles/${VD}`)).data.failed_inspection, null, 'Akte nach Auftrag ohne Warnung');
});

await test('Prüfergebnis nachtragen (nie überschreiben, Sofort-Hinweis wie beim Erfassen) und Datenqualität „Pflichtprüfung ohne Prüfergebnis“', async () => {
  const VD = 'VIN:WDB96340310888884';
  const day = (n) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + n * 86400000));
  eq((await owner.post('/api/vehicles', { plate: 'NR-XY 84', vin: 'WDB96340310888884', site: 'Dortmund' })).status, 201);
  const rule = await users.fleet.post(`/api/vehicles/${VD}/maintenance`, { kind: 'UVV', last_done_date: day(-400), interval_months: 12, evidence: 'NR-Test' });
  eq((await users.fleet.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(-2), evidence: 'NR 1' })).status, 200);
  const dq = async () => (await users.fleet.get('/api/admin/data-quality')).data.items.filter((i) => i.check === 'inspection_no_result' && i.vehicle_id === VD);
  const hits = await dq();
  eq(hits.length, 1, 'nur die neueste Durchführung ohne Ergebnis: ' + JSON.stringify(hits));
  eq(hits[0].severity, 'hinweis');
  ok(hits[0].detail.startsWith('UVV ' + day(-2).split('-').reverse().join('.')), hits[0].detail);
  const hist = (await users.fleet.get(`/api/vehicles/${VD}`)).data.maintenance_history;
  const ev = hist.find((h) => h.evidence === 'NR 1'); const evOld = hist.find((h) => h.id !== ev.id);
  eq(hits[0].event_id, ev.id);
  const url = `/api/maintenance/events/${ev.id}/result`;
  eq((await users.driver.post(url, { result: 'ohne_maengel', evidence: 'x' })).status, 403, 'Fahrer nicht');
  eq((await users.dispatch.post(url, { result: 'ohne_maengel', evidence: 'x' })).status, 403, 'Dispo nicht');
  eq((await users.fleet.post(url, { result: 'ohne_maengel' })).status, 400, 'Nachweis Pflicht');
  eq((await users.fleet.post(url, { result: 'kaputt', evidence: 'x' })).status, 400, 'nur bekannte Ergebnisse');
  eq((await users.fleet.post('/api/maintenance/events/gibt-es-nicht/result', { result: 'ohne_maengel', evidence: 'x' })).status, 404);
  const r = await users.fleet.post(url, { result: 'gefaehrliche_maengel', evidence: 'Bericht 4711' });
  eq(r.status, 200); ok(r.data.notified >= 1, 'aktuelle Prüfung: Sofort-Hinweis');
  ok((await users.dispatch.get('/api/notifications')).data.notifications.some((n) => n.kind === 'inspection_defect' && n.body.includes('NR-XY 84')), 'Dispo informiert');
  const again = await users.fleet.post(url, { result: 'ohne_maengel', evidence: 'Bericht 4712' });
  eq(again.status, 409, 'nie überschreiben'); eq(again.data.error, 'result_exists');
  const d = (await users.fleet.get(`/api/vehicles/${VD}`)).data;
  eq(d.maintenance_history.find((h) => h.id === ev.id).result, 'gefaehrliche_maengel');
  eq(d.failed_inspection && d.failed_inspection.event_id, ev.id, 'Akte: Prüfung nicht bestanden');
  eq((await dq()).length, 0, 'Datenqualität erledigt');
  eq((await users.fleet.get(`/api/vehicles/${VD}/timeline?types=maintenance`)).data.items.find((x) => x.evidence === 'NR 1').result, 'gefaehrliche_maengel', 'Zeitleiste mit Ergebnis');
  // ältere Durchführung: Nachtragen erlaubt, aber kein Alarm (nicht die neueste)
  const ro = await users.fleet.post(`/api/maintenance/events/${evOld.id}/result`, { result: 'verkehrsunsicher', evidence: 'Altbericht' });
  eq(ro.status, 200); eq(ro.data.notified, 0, 'alte Prüfung: kein Alarm');
  ok((await owner.get('/api/admin/audit?action=maintenance.result_add')).data.entries.length >= 2, 'Protokoll');
});

await test('Datenqualität als CSV (Browser): Formelschutz, BOM, alle Prüfungen in DE/UK/EN beschriftet', async () => {
  const { dataQualityCsv, csvCell } = await import('../public/csv.js');
  const { STRINGS } = await import('../public/i18n.js');
  const { CHECKS } = await import('../src/quality.js');
  for (const lang of ['de', 'uk', 'en']) {
    const missing = [...Object.keys(CHECKS).map((c) => 'dq_' + c), 'dq_sev_fehler', 'dq_sev_luecke', 'dq_sev_hinweis', 'dq_col_severity', 'dq_col_check', 'dq_col_object', 'dq_col_detail'].filter((k) => !STRINGS[lang][k]);
    eq(missing.join(','), '', lang + ': fehlende Beschriftungen');
  }
  eq(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"', 'Formelschutz + Maskierung');
  eq(csvCell('-5'), "'-5"); eq(csvCell('a;b'), '"a;b"'); eq(csvCell(null), '');
  const items = (await users.fleet.get('/api/admin/data-quality')).data.items;
  ok(items.length > 0, 'Befunde vorhanden');
  const tr = (k) => STRINGS.de[k] || k;
  const csv = dataQualityCsv(items, tr);
  ok(csv.startsWith('\ufeffSchweregrad;Prüfung;Fahrzeug / Person;Detail\r\n'), 'Kopfzeile/BOM');
  eq(csv.trim().split('\r\n').length, items.length + 1, 'eine Zeile je Befund');
  ok(!/;dq_/.test(csv), 'keine unübersetzten Schlüssel');
});

await test('Mängelstatistik als CSV (Browser): je Prüfpunkt und je Fahrzeug, Beschriftungen DE/UK/EN, Zeilen = Bericht', async () => {
  const { defectItemsCsv, defectVehiclesCsv } = await import('../public/csv.js');
  const { STRINGS, CHECK_LABELS } = await import('../public/i18n.js');
  const { CHECKLIST } = await import('../src/cases.js');
  for (const lang of ['de', 'uk', 'en']) {
    const miss = ['check_item', 'defect_items', 'again_after_repair', 'nav_vehicles', 'last_used', 'vehicle', 'checks_done', 'checks_with_defects', 'last_check_any', 'def_csv_item', 'kpi_csv_veh'].filter((k) => !STRINGS[lang][k]);
    eq(miss.join(','), '', lang + ': fehlende Beschriftungen');
    eq(CHECKLIST.filter((c) => !CHECK_LABELS[lang][c.key]).map((c) => c.key).join(','), '', lang + ': Prüfpunkt-Bezeichnungen');
  }
  const r = (await users.fleet.get('/api/reports/defects?days=365')).data;
  ok(r.totals.checks > 0 && r.items.length > 0, 'Kontrollen mit Mängeln vorhanden');
  const tr = (k) => STRINGS.de[k] || k; const lab = (k) => CHECK_LABELS.de[k] || k; const d = (iso) => iso.slice(0, 10);
  const ci = defectItemsCsv(r, tr, lab, d); const li = ci.trim().split('\r\n');
  ok(ci.startsWith('\ufeffPrüfpunkt;'), 'BOM + Kopfzeile: ' + li[0]);
  eq(li.length, r.items.length + 1, 'eine Zeile je Prüfpunkt');
  eq(li.slice(1).reduce((s, l) => s + Number(l.split(';')[1]), 0), r.totals.defect_items, 'Summe Mängel = Bericht');
  ok(!li.slice(1).some((l) => CHECKLIST.some((c) => l.startsWith(c.key + ';'))), 'Bezeichnungen statt Schlüssel');
  const cv = defectVehiclesCsv(r, tr, d); const lv = cv.trim().split('\r\n');
  eq(lv.length, r.vehicles.length + 1, 'alle kontrollierten Fahrzeuge (auch ohne Mangel)');
  eq(lv.slice(1).reduce((s, l) => s + Number(l.split(';')[1]), 0), r.totals.checks, 'Summe Kontrollen = Bericht');
  const inj = defectVehiclesCsv({ vehicles: [{ plate: '=X()', checks: 1, checks_with_defects: 0, defect_items: 0, last_check_at: null }] }, tr, d);
  ok(inj.includes("'=X();1;0;0;\r\n"), 'Formelschutz, leeres Datum');
});

await test('Datenqualität: Filter Fahrzeug-Standort (nur fahrzeugbezogene Befunde, Personenbefunde gezählt), Integrations-API', async () => {
  const all = (await users.fleet.get('/api/admin/data-quality')).data;
  eq(all.site, null); eq(all.other_hidden, 0);
  ok(all.site_options.length >= 1, 'Auswahl');
  const veh = all.items.filter((i) => i.vehicle_id); const pers = all.items.filter((i) => !i.vehicle_id);
  let sum = 0; let checked = 0;
  for (const o of all.site_options) {
    const r = (await users.fleet.get(`/api/admin/data-quality?site=${encodeURIComponent(o)}`)).data;
    eq(r.site, o); ok(r.items.every((i) => i.vehicle_id), o + ': nur Fahrzeugbefunde');
    eq(r.other_hidden, pers.length, o + ': Personenbefunde gezählt');
    eq(Object.values(r.counts).reduce((a, b) => a + b, 0), r.items.length, o + ': Zähler passen');
    sum += r.items.length; checked += r.vehicles_checked;
  }
  // Befunde zu inaktiven Fahrzeugen (z. B. Vertrag an stillgelegtem Fahrzeug) haben ggf. keinen auswählbaren Standort
  const inactive = veh.filter((i) => i.check === 'contract_vehicle_inactive').length;
  ok(sum <= veh.length && sum >= veh.length - inactive, `Summe über Standorte (${sum}) = Fahrzeugbefunde (${veh.length})`);
  eq(checked, all.vehicles_checked, 'geprüfte Fahrzeuge verteilt');
  const up = all.site_options.find((o) => o !== 'ohne');
  if (up) eq((await users.fleet.get(`/api/admin/data-quality?site=${encodeURIComponent(up.toUpperCase())}`)).data.site, up, 'Schreibweise egal');
  eq((await users.fleet.get('/api/admin/data-quality?site=Nirgendwo')).data.items.length, 0, 'unbekannt leer');
  const i = await anon.req('GET', '/api/integration/v1/data-quality?environment=test&site=Nirgendwo', undefined, { authorization: 'Bearer integration-token-xyz' });
  eq(i.status, 200); eq(i.data.items.length, 0, 'Integrations-API gefiltert');
});

await test('Verträge und Versicherungsfälle: Filter Fahrzeug-Standort (Zähler, CSV, Kalender, Schreibweise, Rechte)', async () => {
  // eigener Vertrag an einem Fahrzeug mit Standort in abweichender Schreibweise
  const VS = 'VIN:WDB96340310777771';
  eq((await owner.post('/api/vehicles', { plate: 'SF-XY 71', vin: 'WDB96340310777771', site: 'SÜDHAFEN' })).status, 201);
  eq((await users.fleet.post(`/api/vehicles/${VS}/contracts`, { kind: 'miete', partner: 'Standort-Test', start_date: '2026-01-01', end_date: '2030-01-31', evidence: 'ST-1' })).status, 201);
  const all = (await users.fleet.get('/api/contracts?filter=alle')).data;
  eq(all.site, null); ok(all.site_options.includes('SÜDHAFEN'), 'Standort in Auswahl');
  let sum = 0;
  for (const o of all.site_options) {
    const r = (await users.fleet.get(`/api/contracts?filter=alle&site=${encodeURIComponent(o)}`)).data;
    eq(r.site, o); eq(r.counts.alle, r.contracts.length, o + ': Zähler = Liste');
    ok(r.contracts.every((c) => (o === 'ohne' ? !c.vehicle_site : String(c.vehicle_site).toLowerCase() === o.toLowerCase())), o + ': nur Fahrzeuge des Standorts');
    sum += r.contracts.length;
  }
  eq(sum, all.contracts.length, 'Summe über Standorte = alle Verträge');
  const sh = (await users.fleet.get('/api/contracts?filter=alle&site=s%C3%BCdhafen')).data;
  eq(sh.site, 'SÜDHAFEN', 'Schreibweise egal (Umlaut)'); eq(sh.contracts.length, 1);
  eq((await users.fleet.get('/api/contracts?site=Nirgendwo')).data.contracts.length, 0, 'unbekannt leer');
  const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/contracts?format=csv&filter=alle&site=S%C3%BCdhafen')).data);
  eq(csv.trim().split('\r\n').length, 2, 'CSV: Kopf + 1 Zeile'); ok(csv.includes('SF-XY 71'));
  const ics = new TextDecoder().decode((await users.fleet.get('/api/contracts?format=ics&site=S%C3%BCdhafen')).data);
  ok(ics.includes('Fuhrpark Verträge – SÜDHAFEN'), 'Kalendername mit Standort'); ok(!ics.includes('KD-XY'), 'nur Standort');
  eq((await users.ws.get('/api/contracts?site=S%C3%BCdhafen')).status, 403, 'Werkstatt weiterhin nicht');
  // Versicherungsfälle (Umgebung Test)
  const ca = (await users.fleet.get('/api/claims?filter=alle')).data;
  eq(ca.site, null); ok(Array.isArray(ca.site_options));
  let csum = 0;
  for (const o of ca.site_options) {
    const r = (await users.fleet.get(`/api/claims?filter=alle&site=${encodeURIComponent(o)}`)).data;
    eq(r.site, o); eq(r.counts.alle, r.claims.length, o + ': Zähler = Liste'); csum += r.claims.length;
  }
  eq(csum, ca.claims.length, 'Summe über Standorte = alle Fälle');
  eq((await users.fleet.get('/api/claims?filter=alle&site=Nirgendwo')).data.claims.length, 0);
  const ccsv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/claims?format=csv&filter=alle&site=Nirgendwo')).data);
  eq(ccsv.trim().split('\r\n').length, 1, 'CSV nur Kopf');
  eq((await users.ws.get('/api/claims?site=x')).status, 403);
});

await test('Auslesungen (Tachograph): Filter Standort – Fahrer nach Fahrerakte, Fahrzeuge nach Fahrzeugstamm, Zähler und CSV', async () => {
  const all = (await users.fleet.get('/api/tacho')).data;
  eq(all.site, null); ok(all.site_options.length >= 1, 'Auswahl');
  let dv = 0; let vv = 0; let wc = 0;
  for (const o of all.site_options) {
    const r = (await users.fleet.get(`/api/tacho?site=${encodeURIComponent(o)}`)).data;
    eq(r.site, o);
    const okSite = (x) => (o === 'ohne' ? !x.site : String(x.site).toLowerCase() === o.toLowerCase());
    ok(r.drivers.every(okSite) && r.vehicles.every(okSite) && r.without_card.every(okSite), o + ': nur Standort');
    eq(Object.values(r.totals.vehicles).reduce((a, b) => a + b, 0), r.vehicles.length, o + ': Zähler Fahrzeuge');
    eq(Object.values(r.totals.drivers).reduce((a, b) => a + b, 0), r.drivers.length, o + ': Zähler Fahrer');
    dv += r.drivers.length; vv += r.vehicles.length; wc += r.without_card.length;
  }
  eq(vv, all.vehicles.length, 'Summe Fahrzeuge'); eq(dv, all.drivers.length, 'Summe Fahrer'); eq(wc, all.without_card.length, 'Summe ohne Karte');
  const csvAll = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/tacho?format=csv')).data).trim().split('\r\n').length;
  const csvNone = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/tacho?format=csv&site=Nirgendwo')).data).trim().split('\r\n').length;
  eq(csvAll, 1 + all.drivers.length + all.vehicles.length); eq(csvNone, 1, 'CSV gefiltert');
  eq((await users.ws.get('/api/tacho?site=x')).status, 403);
});

await test('Fahrerakte: Filter Standort (Liste, CSV), nur Leitung; Fahrer sieht weiter nur die eigene Akte', async () => {
  for (const [n, site] of [['Standort Fahrer A', 'Bremen'], ['Standort Fahrer B', 'BREMEN'], ['Standort Fahrer C', 'Kiel']]) eq((await users.fleet.post('/api/drivers', { display_name: n, site })).status, 201);
  const all = (await users.fleet.get('/api/drivers')).data;
  eq(all.site, null); ok(all.site_options.includes('Kiel'), 'Auswahl');
  ok(all.site_options.filter((o) => o.toLowerCase() === 'bremen').length === 1, 'Schreibweisen zusammengefasst');
  let sum = 0;
  for (const o of all.site_options) { const r = (await users.fleet.get(`/api/drivers?site=${encodeURIComponent(o)}`)).data; eq(r.site, o); sum += r.drivers.length; }
  eq(sum, all.drivers.length, 'Summe über Standorte');
  const br = (await users.fleet.get('/api/drivers?site=bremen')).data;
  eq(br.drivers.filter((d) => d.display_name.startsWith('Standort Fahrer')).length, 2, 'Bremen/BREMEN');
  const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode((await users.fleet.get('/api/drivers?format=csv&site=Kiel')).data);
  ok(csv.includes('Standort Fahrer C') && !csv.includes('Standort Fahrer A'), 'CSV gefiltert');
  const dv = (await users.driver.get('/api/drivers?site=Kiel')).data;
  ok(dv.site === undefined && dv.site_options === undefined, 'Fahrer: keine Standortauswahl');
});

await test('Integrations-API: /v1/vehicles und /v1/availability mit optionalem Standortfilter (additiv)', async () => {
  const H = { authorization: 'Bearer integration-token-xyz' };
  const all = (await anon.req('GET', '/api/integration/v1/availability?environment=test', undefined, H)).data;
  ok(all.site === undefined, 'ohne Filter unverändert');
  const sh = (await anon.req('GET', '/api/integration/v1/availability?environment=test&site=s%C3%BCdhafen', undefined, H)).data;
  eq(sh.site, 'SÜDHAFEN'); eq(sh.vehicles.map((v) => v.plate).join(','), 'SF-XY 71', 'nur Standort');
  const vs = (await anon.req('GET', '/api/integration/v1/vehicles?site=S%C3%9CDHAFEN', undefined, H)).data;
  eq(vs.vehicles.length, 1); eq(vs.site, 'SÜDHAFEN');
  const allV = (await anon.req('GET', '/api/integration/v1/vehicles', undefined, H)).data.vehicles.length;
  const sites = [...new Set((await anon.req('GET', '/api/integration/v1/vehicles', undefined, H)).data.vehicles.map((v) => (v.site || '').toLowerCase()))];
  let sum = 0; for (const x of sites) sum += (await anon.req('GET', '/api/integration/v1/vehicles?site=' + encodeURIComponent(x || 'ohne'), undefined, H)).data.vehicles.length;
  eq(sum, allV, 'Summe über Standorte');
  eq((await anon.req('GET', '/api/integration/v1/availability?site=Nirgendwo', undefined, H)).data.vehicles.length, 0);
});

await test('Datumsfelder: nur echte Kalenderdaten (31.04./30.02. abgewiesen) in Verträgen, km-Ständen, Nachweisliste', async () => {
  const VD = 'VIN:WDB96340310888883';
  eq((await owner.post('/api/vehicles', { plate: 'KD-XY 83', vin: 'WDB96340310888883', site: 'Dortmund' })).status, 201);
  eq((await users.fleet.post(`/api/vehicles/${VD}/contracts`, { kind: 'leasing', partner: 'KD', start_date: '2026-01-01', end_date: '2027-04-31', evidence: 'KD' })).status, 400, 'Vertrag 31.04.');
  eq((await users.fleet.post(`/api/vehicles/${VD}/contracts`, { kind: 'leasing', partner: 'KD', start_date: '2026-01-01', end_date: '2027-04-30', evidence: 'KD' })).status, 201, 'gültiges Datum');
  eq((await users.fleet.post(`/api/vehicles/${VD}/odometer`, { km: 1000, measured_on: '2026-02-30' })).status, 400, 'km-Stand 30.02.');
  eq((await users.fleet.get('/api/maintenance/history?from=2026-02-30')).status, 400, 'Nachweisliste 30.02.');
});

await test('Startseite Werkstatt „Prüfergebnis fehlt“: nur selbst erfasste Pflichtprüfungen ohne Ergebnis, verschwindet nach Nachtragen', async () => {
  const VD = 'VIN:WDB96340310888886';
  const day = (n) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(Date.now() + n * 86400000));
  eq((await owner.post('/api/vehicles', { plate: 'NR-XY 86', vin: 'WDB96340310888886', site: 'Dortmund' })).status, 201);
  const mine = async (u) => (await u.get('/api/me/inspections-without-result')).data.items.filter((i) => i.vehicle_id === VD);
  const rule = await users.fleet.post(`/api/vehicles/${VD}/maintenance`, { kind: 'SP', last_done_date: day(-200), interval_months: 6, evidence: 'NR86' });
  eq(rule.status, 201, JSON.stringify(rule.data));
  const done = await users.ws.post(`/api/maintenance/${rule.data.id}/complete`, { done_date: day(-1), evidence: 'SP-Bericht 86' });
  eq(done.status, 200, JSON.stringify(done.data));
  const hits = await mine(users.ws);
  eq(hits.length, 1, 'Werkstatt sieht eigene Prüfung'); eq(hits[0].kind, 'SP'); eq(hits[0].done_date, day(-1));
  eq((await mine(users.fleet)).length, 0, 'andere Person sieht sie nicht als eigene');
  const akte = (await users.ws.get(`/api/vehicles/${VD}`)).data.result_missing;
  eq(JSON.stringify(akte), JSON.stringify([{ event_id: hits[0].id, kind: 'SP', done_date: day(-1) }]), 'Fahrzeugakte zeigt fehlendes Ergebnis');
  eq(JSON.stringify((await users.fleet.get('/api/admin/data-quality')).data.items.filter((i) => i.check === 'inspection_no_result' && i.vehicle_id === VD).map((i) => i.event_id)), JSON.stringify([hits[0].id]), 'gleiche Regel wie Datenqualität');
  const ovMissing = async () => ((await users.fleet.get('/api/maintenance')).data.result_missing || []).filter((x) => x.vehicle_id === VD).map((x) => x.id);
  eq(JSON.stringify(await ovMissing()), JSON.stringify([hits[0].id]), '„Heute zu tun“ der Leitung: Übersicht liefert result_missing (gleiche Regel)');
  const histAdd = async () => (await users.fleet.get(`/api/maintenance/history?from=${day(-400)}&to=${day(0)}&kind=SP`)).data.rows.filter((x) => x.vehicle_id === VD).map((x) => [x.done_date, x.result_addable]);
  eq(JSON.stringify(await histAdd()), JSON.stringify([[day(-1), 1], [day(-200), 0]]), 'Nachweisliste: nur neueste Durchführung ohne Ergebnis ist nachtragbar');
  eq((await users.fleet.post('/api/agent/run')).status, 200);
  const agentRM = () => users.fleet.get('/api/master').then((x) => x.data.findings.filter((f) => f.finding_code === 'INSPECTION_RESULT_MISSING' && f.vehicle_id === VD && f.status !== 'resolved'));
  const rmF = await agentRM();
  ok(rmF.length === 1 && rmF[0].severity === 'hinweis' && rmF[0].message.includes('SP vom') && rmF[0].next_action.includes('Prüfbericht'), 'Agent-Befund: ' + JSON.stringify(rmF[0] || null));
  eq((await users.driver.get('/api/me/inspections-without-result')).status, 403, 'Fahrer nicht');
  eq((await users.dispatch.get('/api/me/inspections-without-result')).status, 403, 'Dispo nicht');
  eq((await users.ws.post(`/api/maintenance/events/${hits[0].id}/result`, { result: 'ohne_maengel', evidence: 'SP-Bericht 86' })).status, 200);
  eq((await mine(users.ws)).length, 0, 'nach Nachtragen erledigt');
  eq((await users.ws.get(`/api/vehicles/${VD}`)).data.result_missing.length, 0, 'Akte nach Nachtragen leer');
  eq((await ovMissing()).length, 0, 'Übersicht nach Nachtragen leer');
  eq((await users.fleet.post('/api/agent/run')).status, 200);
  eq((await agentRM()).length, 0, 'Agent-Befund nach Nachtragen erledigt');
  eq(JSON.stringify(await histAdd()), JSON.stringify([[day(-1), 0], [day(-200), 0]]), 'Nachweisliste nach Nachtragen ohne Direktsprung');
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  ok(/'todo_result_missing', ov && ov\.result_missing/.test(app) && app.includes('#/quality?f=inspection_no_result'), '„Heute zu tun“: Gruppe mit Link auf Datenqualität-Filter');
  ok(/ae\.matches\('input, select, textarea[^']*'\)/.test(app), 'Seitenwechsel: Fokus auf Überschrift überschreibt nicht das Ergebnisfeld beim Direktsprung ?ev=');
  ok(/\[\/\^#\\\/quality\(\?:\\\?f=\(\\w\+\)\)\?\$\/, viewQuality\]/.test(app), 'Route #/quality?f=<Prüfung>');
});

await test('Hilfe: Suche (alle Wörter, ü/ue/ß gleich, DE/UK/EN), Inhaltsverzeichnis, „Hilfe zu dieser Seite“ nur mit passendem Abschnitt', async () => {
  const { helpMatches, helpNorm } = await import('../public/help.js');
  const { STRINGS } = await import('../public/i18n.js');
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  eq(helpNorm('  Straße  PRÜFUNG '), 'strasse prufung'); eq(helpNorm('Pruefung'), 'prufung');
  const secs = [{ name: 'a', title: 'Prüftermine', steps: ['HU alle 12 Monate', 'SP nach der HU', 'Nachweis hochladen'] }, { name: 'b', title: 'Lager', steps: ['Mindestbestand pflegen', 'Bestellvorschlag'] }];
  eq(helpMatches(secs, '   '), null, 'leere Suche = alles zeigen');
  eq(JSON.stringify(helpMatches(secs, 'hu')), JSON.stringify([{ name: 'a', title_hit: false, steps: [0, 1] }]), 'Treffer je Schritt');
  eq(JSON.stringify(helpMatches(secs, 'prueftermine')), JSON.stringify([{ name: 'a', title_hit: true, steps: [] }]), 'ue-Schreibweise findet ü');
  eq(JSON.stringify(helpMatches(secs, 'PRUFTERMINE nachweis')), JSON.stringify([{ name: 'a', title_hit: true, steps: [2] }]), 'alle Wörter, Titel zählt für den Abschnitt');
  eq(JSON.stringify(helpMatches(secs, 'hu lager')), '[]', 'Wörter aus verschiedenen Abschnitten → kein Treffer');
  // echte Texte: jede Sprache findet ihren Abschnitt „Prüftermine“ über ein Wort aus dem eigenen Titel
  const sections = (lang) => ['dates', 'stock', 'report'].map((n) => ({ name: n, title: STRINGS[lang][`help_${n}_t`], steps: STRINGS[lang][`help_${n}_s`].split('|') }));
  for (const lang of ['de', 'uk', 'en']) {
    const w = STRINGS[lang].help_stock_t.split(/[\s:&,]+/).filter((x) => x.length > 4).pop();
    ok(helpMatches(sections(lang), w).some((m) => m.name === 'stock'), `Suche ${lang}: ${w}`);
    for (const k of ['help_search', 'help_toc', 'help_hits', 'help_none', 'help_page']) ok(STRINGS[lang][k], `${k} ${lang}`);
    ok(STRINGS[lang].help_hits.includes('{n}'), 'Platzhalter {n}');
  }
  // „Hilfe zu dieser Seite“: jeder genannte Abschnitt existiert in den Hilfetexten; Route mit ?s=
  const links = [...app.matchAll(/helpLink\('([a-z]+)'\)/g)].map((m) => m[1]);
  ok(links.length >= 8, 'Seitenhilfe-Links: ' + links.length);
  for (const n of links) ok(STRINGS.de[`help_${n}_t`], `Abschnitt ${n} fehlt`);
  ok(/helpSections\(S\.me\.role\)\.includes\(n\)/.test(app), 'Link nur, wenn die Rolle den Abschnitt sieht');
  ok(/if \(r === 'viewer'\) return \['viewer', 'kpi', 'costs', 'push'\];/.test(app), 'Lesezugriff: eigener Abschnitt „Was Sie sehen“, keine Hilfe zu Melden/Kontrolle (darf beides nicht)');
  for (const lang of ['de', 'uk', 'en']) ok(STRINGS[lang].help_viewer_t && STRINGS[lang].help_viewer_s.split('|').length === 8, `help_viewer ${lang}`);
  ok(app.includes('[/^#\\/help(?:\\?s=([\\w-]+))?(?:[?&]q=([^&#]*))?$/, viewHelp]'), 'Route #/help?s=<Abschnitt>&q=<Suchbegriff>');
  {
    const start = app.indexOf('const routes = [');
    const routes = new Function(app.slice(start, app.indexOf('\n];', start) + 3).replace(/,\s*view\w+\]/g, ', null]') + '; return routes;')();
    const re = routes.find(([r]) => r.test('#/help'))[0];
    eq(JSON.stringify([...'#/help?s=dates&q=pr%C3%BCf%20hu'.match(re)].slice(1)), JSON.stringify(['dates', 'pr%C3%BCf%20hu']), 'Abschnitt + Suchbegriff');
    eq('#/help?q=lager'.match(re)[2], 'lager', 'nur Suchbegriff');
    eq('#/help'.match(re)[1], undefined, 'ohne Parameter');
    // Router übergibt fehlende optionale Gruppen als undefined (nicht „undefined“) und kaputte %-Folgen roh
    const routeArg = new Function(app.slice(app.indexOf('const routeArg = '), app.indexOf('\n', app.indexOf('const routeArg = '))) + '; return routeArg;')();
    eq(routeArg(undefined), undefined); eq(routeArg('pr%C3%BCf'), 'prüf'); eq(routeArg('%E0%A4%A'), '%E0%A4%A');
    ok(/await fn\(\.\.\.m\.slice\(1\)\.map\(routeArg\)\)/.test(app), 'route() nutzt routeArg');
  }
  ok(/#\/help\?s=\$\{h\.name\}&q=\$\{encodeURIComponent\(q\)\}/.test(app), 'Globale Suche übergibt den Suchbegriff an die Hilfe');
  const searchSrc = app.slice(app.indexOf('async function viewSearch('), app.indexOf('\n}\n', app.indexOf('async function viewSearch(')));
  ok(/helpMatches\(helpSections\(S\.me\.role\)/.test(searchSrc) && searchSrc.includes('id="ghelp"'), 'Globale Suche findet Hilfe-Abschnitte der eigenen Rolle');
  ok(searchSrc.includes('b.title_hit - a.title_hit'), 'Suche: Titeltreffer zuerst');
  ok(/'\/help\.js'/.test(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')), 'help.js im Offline-Cache');
});

await test('Oberfläche: jeder interne Link (href="#/…") passt auf eine Route – auch mit encodeURIComponent(Fahrzeug-ID)', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const start = src.indexOf('const routes = [');
  const routes = new Function(src.slice(start, src.indexOf('\n];', start) + 3).replace(/,\s*view\w+\]/g, ', null]') + '; return routes;')();
  ok(/const h = \(location\.hash \|\| '#\/'\)\.replace\(\/%3A\/gi, ':'\)/.test(src), 'route() normalisiert %3A');
  // href="#/…" sowie Sprungziele als Zeichenkette/Vorlage (`#/…`, '#/…' bzw. '#/cases/' + id), z. B. in „Heute zu tun“ oder location.hash
  const strs = [...src.matchAll(/[`'](#\/[^`'"]*)[`'](\s*\+)?/g)].map((m) => m[1] + (m[2] && m[1].endsWith('/') ? '${id}' : ''));
  ok(strs.length > 20, 'Sprungziele als Zeichenkette gefunden: ' + strs.length);
  const tpls = [...new Set([...[...src.matchAll(/href="(#\/[^"]*)"/g)].map((m) => m[1]), ...strs])];
  ok(tpls.length > 60, 'Links gefunden: ' + tpls.length);
  const sample = (tpl, norm) => {
    const vinCtx = /^#\/(vehicles|new|check|v|vehicles\/qr)\/\$\{/.test(tpl);
    let first = true;
    const h = tpl.replace(/\$\{([^}]*)\}/g, (_, e) => { const vin = vinCtx && first; first = false; return vin ? (e.includes('encodeURIComponent') ? 'VIN%3AWDB96340310123456' : 'VIN:WDB96340310123456') : 'abc-123'; });
    return norm ? h.replace(/%3A/gi, ':') : h;
  };
  const bad = tpls.filter((tpl) => !routes.some(([re]) => re.test(sample(tpl, true))));
  eq(bad.join(' | '), '', 'Links ohne Route');
  ok(tpls.some((tpl) => !routes.some(([re]) => re.test(sample(tpl, false)))), 'Gegenprobe: ohne Normalisierung passen kodierte Fahrzeuglinks nicht');
});

await test('Integrations-API /v1/data-quality: gleiche Anzahlen wie die App, ohne Personennamen, nur lesend', async () => {
  const H = { authorization: 'Bearer integration-token-xyz' };
  const app = (await users.fleet.get('/api/admin/data-quality')).data;
  const r = await anon.req('GET', '/api/integration/v1/data-quality?environment=test', undefined, H);
  eq(r.status, 200); eq(r.data.environment, 'test');
  eq(JSON.stringify(r.data.counts), JSON.stringify(app.counts), 'Anzahlen wie in der App');
  eq(r.data.by_severity.fehler + r.data.by_severity.luecke + r.data.by_severity.hinweis, app.items.length, 'Summe Schweregrade');
  eq(r.data.items.length, app.items.filter((i) => i.vehicle_id).length, 'nur fahrzeugbezogene Befunde');
  ok(r.data.items.every((i) => !('driver_name' in i)), 'kein Fahrername-Feld');
  const names = ['Test Fahrer 1', 'Test Fahrer 2', 'Test Fuhrparkleitung', 'Test Werkstatt DO', 'Test Dispo'];
  const body = JSON.stringify(r.data);
  ok(names.every((n) => !body.includes(n)), 'keine Personennamen in der Antwort');
  eq((await anon.req('GET', '/api/integration/v1/data-quality')).status, 401, 'ohne Token');
  eq((await anon.req('POST', '/api/integration/v1/data-quality', {}, H)).status, 404, 'nur GET');
});

await test('Sammelabfrage Prüfungs-Listen (Agent, Übersicht) liefert dasselbe wie die drei Einzelabfragen – je Umgebung, gleiche Reihenfolge', async () => {
  const m = await import('../src/maintenance.js');
  for (const envName of ['test', 'production']) {
    const c = await m.maintenanceEventLists(env, envName);
    const single = {
      defects_without_case: (await m.defectsWithoutCaseQuery(env, envName).all()).results,
      reinspection_pending: (await m.reinspectionPendingQuery(env, envName).all()).results,
      result_missing: (await m.noResultQuery(env).all()).results,
    };
    for (const k of Object.keys(single)) {
      const key = (r) => JSON.stringify(Object.keys(single[k][0] || r).map((f) => r[f] ?? null));
      eq(JSON.stringify(c[k].map(key)), JSON.stringify(single[k].map(key)), `${envName}/${k}`);
    }
    ok(Object.values(single).some((l) => l.length), `${envName}: Testdaten vorhanden`);
  }
});

await test('Hinweise: Filter alle/ungelesen/dringend mit Anzahlen (nur Anzeige), Texte DE/UK/EN', async () => {
  const { readFileSync } = await import('node:fs');
  const { STRINGS } = await import('../public/i18n.js');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const m = app.match(/const NF = (\{[^\n]*\});/);
  ok(m, 'Filterdefinition');
  const NF = new Function('return ' + m[1])();
  const list = [{ urgent: 1 }, { opened_at: 'x' }, { acknowledged_at: 'x', urgent: 1 }, {}];
  eq(list.filter(NF.all).length, 4); eq(list.filter(NF.unread).length, 2, 'ungelesen = weder geöffnet noch quittiert'); eq(list.filter(NF.urgent).length, 2);
  for (const lang of ['de', 'uk', 'en']) ok(STRINGS[lang].nf_unread && STRINGS[lang].nf_urgent && STRINGS[lang].nf_none, `Texte ${lang}`);
  ok(/NF\[S\.inboxF\] \? S\.inboxF : n\.notifications\.some\(NF\.unread\) \? 'unread' : 'all'/.test(app), 'ohne Wahl: Ungelesen, solange vorhanden; gewählter Filter bleibt');
  const n = await users.fleet.get('/api/notifications');
  eq(n.data.unread, n.data.notifications.filter(NF.unread).length, 'gleiche Regel wie der Zähler am Glockensymbol');
});

await test('Lesezugriff: Fahrernamen in Vorgängen, Fahrzeugakte, Zeitleiste und Reifen ausgeblendet; Werkstatt-/Leitungsnamen bleiben', async () => {
  const viewer = await invite(owner, { username: 'test.lesen.names', display_name: 'Test Lesezugriff Namen', role: 'viewer', environment: 'test' });
  const name = 'Test Fahrer 1';
  // Leitung sieht den Fahrer weiterhin
  const fv = await users.fleet.get(`/api/vehicles/${encodeURIComponent(V1)}`);
  ok(fv.data.inspections.some((i) => i.performed_by_name === name), 'Leitung sieht, wer kontrolliert hat');
  ok(fv.data.inspections.every((i) => !('performed_by_role' in i)), 'Rollenspalte nicht ausgeliefert');
  eq((await users.fleet.get(`/api/cases/${C1}`)).data.reporter_name, name);
  // Lesezugriff: Fahrzeugakte
  const vv = await viewer.get(`/api/vehicles/${encodeURIComponent(V1)}`);
  eq(vv.status, 200);
  ok(vv.data.inspections.some((i) => i.performed_by_name_hidden === true && i.performed_by_name === null), 'Kontrolle ohne Fahrernamen');
  ok(!vv.data.last_check || vv.data.last_check.performed_by_name === null, 'letzte Abfahrtskontrolle ohne Namen');
  ok(!JSON.stringify(vv.data).includes(name), 'Fahrername nirgends in der Fahrzeugakte');
  // Zeitleiste
  const tl = await viewer.get(`/api/vehicles/${encodeURIComponent(V1)}/timeline`);
  eq(tl.status, 200);
  ok(tl.data.items.some((x) => x.type === 'inspection' && x.by_hidden === true), 'Zeitleiste markiert ausgeblendet');
  ok(!JSON.stringify(tl.data).includes(name), 'Fahrername nicht in der Zeitleiste');
  // Vorgänge: Liste, CSV, Detail
  const lv = (await viewer.get('/api/cases?status=all')).data.cases.find((c) => c.id === C1);
  ok(lv && lv.reporter_name === null && lv.reporter_name_hidden === true && !('reporter_role' in lv), 'Liste ohne Melder');
  ok(!('reporter_name_note' in lv), 'kein freier Namensvermerk');
  const csv = await viewer.get('/api/cases?format=csv&status=all');
  eq(csv.status, 200); ok(!new TextDecoder().decode(csv.data).includes(name), 'CSV ohne Fahrernamen');
  ok(new TextDecoder().decode(csv.data).includes('Fahrer/in (Name ausgeblendet)'), 'CSV: Hinweis statt leerer Zelle');
  ok(new TextDecoder().decode((await users.fleet.get('/api/cases?format=csv&status=all')).data).includes(name), 'CSV der Leitung mit Melder');
  const dv = await viewer.get(`/api/cases/${C1}`);
  eq(dv.data.reporter_name, null); eq(dv.data.reporter_name_hidden, true);
  ok(dv.data.events.some((e) => e.actor_role === 'driver' && e.actor_name === null && e.actor_name_hidden), 'Verlauf: Fahrer ausgeblendet');
  ok(dv.data.events.some((e) => e.actor_role !== 'driver' && e.actor_name), 'Verlauf: andere Namen bleiben');
  ok(!JSON.stringify(dv.data).includes(name), 'Fahrername nirgends im Vorgang');
  // Reifen
  const tv = await viewer.get(`/api/vehicles/${encodeURIComponent(V1)}/tires`);
  eq(tv.status, 200); ok(!JSON.stringify(tv.data).includes(name), 'Reifenverlauf ohne Fahrernamen');
  ok((await users.fleet.get(`/api/vehicles/${encodeURIComponent(V1)}/tires`)).data.history.some((h) => h.recorded_by_name === name), 'Leitung sieht, wer gemessen hat');
  // Disposition (Rolle mit Fahrerzuordnung) sieht Namen weiterhin
  eq((await users.dispatch.get(`/api/cases/${C1}`)).data.reporter_name, name, 'Disposition unverändert');
  const { STRINGS } = await import('../public/i18n.js');
  for (const lang of ['de', 'uk', 'en']) ok(STRINGS[lang].name_hidden_driver, `name_hidden_driver ${lang}`);
});
await test('Hilfe: Suchbegriff wird beim Tippen in die Adresse übernommen (replaceState, kein Verlaufseintrag)', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const m = app.match(/const helpHash = (\(q\) => [^\n]*);/);
  ok(m, 'helpHash vorhanden');
  const helpHash = new Function('return ' + m[1])();
  eq(helpHash(''), '#/help'); eq(helpHash('hu nachweis'), '#/help?q=hu%20nachweis'); eq(helpHash('a&s=x#'), '#/help?q=a%26s%3Dx%23', 'Sonderzeichen kodiert');
  ok(/history\.replaceState\(history\.state, '', helpHash\(v\)\)/.test(app) && !/pushState/.test(app), 'ersetzt nur den Eintrag');
});
await test('Zeitleiste: Filter steht in der Adresse (?f=), unbekannte/für die Rolle verborgene Bereiche → „Alle“', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const start = app.indexOf('const routes = [');
  const routes = new Function(app.slice(start, app.indexOf('\n];', start) + 3).replace(/,\s*(view\w+)\]/g, ", '$1']") + '; return routes;')();
  const hit = (h) => { for (const [re, fn] of routes) { const m = h.match(re); if (m) return JSON.stringify([fn, ...m.slice(1).map((x) => x ?? '-')]); } return null; };
  const V = 'VIN:WDB96340310123456';
  eq(hit(`#/vehicles/${V}/timeline`), JSON.stringify(['viewTimeline', V, '-']), 'ohne Filter');
  eq(hit(`#/vehicles/${V}/timeline?f=case`), JSON.stringify(['viewTimeline', V, 'case']), 'mit Filter');
  eq(hit(`#/vehicles/${V}/timeline?f=a&b`), null, 'keine fremden Zeichen');
  const m = app.match(/const tlHash = (\(id, f\) => [^\n]*);/);
  ok(m, 'tlHash vorhanden');
  const tlHash = new Function('return ' + m[1])();
  eq(tlHash(V, ''), `#/vehicles/${V}/timeline`); eq(tlHash(V, 'fine'), `#/vehicles/${V}/timeline?f=fine`);
  ok(/history\.replaceState\(history\.state, '', tlHash\(id, k\)\)/.test(app), 'Filterwechsel ersetzt nur den Verlaufseintrag');
  ok(!/S\.tlFilter/.test(app), 'kein globaler Filter mehr (galt sonst auch für andere Fahrzeuge)');
  // Bereichsprüfung in viewTimeline: nur bekannte Schlüssel, Leitungs-Bereiche nur für isMgr()
  ok(/hasOwnProperty\.call\(groups, fArg\) && \(!TL_MGR_ONLY\.includes\(fArg\) \|\| isMgr\(\)\)/.test(app), 'Filterprüfung');
});
await test('Prüf-/Wartungsarten werden in der App-Sprache angezeigt (gespeichert bleibt der deutsche Name)', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const { MAINT_KINDS } = await import('../src/vehicles.js');
  const { STRINGS } = await import('../public/i18n.js');
  const m = app.match(/const MK_KEYS = (\{[^\n]*\});/);
  ok(m, 'MK_KEYS vorhanden');
  const keys = new Function('return ' + m[1])();
  for (const k of MAINT_KINDS.filter((x) => !['HU', 'SP', 'UVV'].includes(x))) {
    ok(keys[k], `Übersetzungsschlüssel für ${k}`);
    for (const lang of ['de', 'uk', 'en']) ok(STRINGS[lang]['mk_' + keys[k]], `mk_${keys[k]} ${lang}`);
    eq(STRINGS.de['mk_' + keys[k]], k, 'Deutsch = gespeicherter Name');
  }
  // Auswahllisten senden weiterhin den deutschen Namen (value), zeigen aber die Übersetzung
  ok(!/maintenance_kinds[^\n]{0,40}<option>\$\{esc\(k\)\}/.test(app), 'keine Option ohne value');
  // keine Anzeige der Prüfart ohne mk() in Prüfterminen/Fahrzeugakte
  ok(!/\$\{esc\(((m|r|h|x|me|fi|pi|i)\.)?kind\)\}/.test(app.replace(/esc\(t\([^)]*\)\)/g, '')), 'Prüfart überall übersetzt');
});
await test('Empfängerermittlung: eine D1-Abfrage je Ereignis, gleiches Ergebnis wie die bisherigen Einzelabfragen', async () => {
  const { recipientsFor } = await import('../src/notify.js');
  const db = env.DB;
  const byRole = async (e, roles, extra = '', args = []) => (await db.prepare(`SELECT id FROM users WHERE active=1 AND password_hash IS NOT NULL AND environment=? AND role IN (${roles.map(() => '?').join(',')}) ${extra}`).bind(e, ...roles, ...args).all()).results.map((r) => r.id);
  const cases = (await db.prepare(`SELECT * FROM cases ORDER BY created_at LIMIT 40`).all()).results;
  ok(cases.length >= 10, 'genügend Vorgänge');
  const kinds = ['created', 'received', 'priority_changed', 'approved', 'rework', 'acknowledged', 'waiting_parts', 'cost_limit', 'cost_approved', 'released', 'safety_lock', 'comment'];
  let compared = 0; let withDrivers = 0;
  for (const c of cases) {
    const site = c.workshop_site || c.suggested_workshop_site;
    const reporter = (await db.prepare('SELECT id FROM users WHERE id=? AND active=1').bind(c.reporter_id).all()).results.map((r) => r.id);
    const ws = site ? await byRole(c.environment, ['workshop'], 'AND workshop_site=?', [site]) : [];
    const lead = await byRole(c.environment, ['fleet', 'owner']); const dispo = await byRole(c.environment, ['dispatch']);
    const drv = (await db.prepare(`SELECT u.id FROM driver_vehicles d JOIN users u ON u.id=d.user_id WHERE d.vehicle_id=? AND (d.valid_to IS NULL OR d.valid_to > ?) AND u.active=1 AND u.password_hash IS NOT NULL AND u.environment=? AND u.role='driver' AND u.id<>?`).bind(c.vehicle_id, new Date().toISOString(), c.environment, c.reporter_id).all()).results.map((r) => r.id);
    const urgent = c.priority === 'kritisch' || c.reported_driveability === 'nicht_fahrbereit' || !!c.safety_lock;
    const expect = {
      created: [...lead, ...(urgent ? [...dispo, ...ws] : []), ...(c.safety_lock ? drv : [])],
      received: reporter, priority_changed: [...reporter, ...(c.status !== 'gemeldet' ? ws : [])],
      approved: [...ws, ...reporter], rework: ws, acknowledged: lead, waiting_parts: [...lead, ...dispo], cost_limit: lead, cost_approved: ws,
      released: [...reporter, ...dispo, ...lead, ...ws, ...drv], safety_lock: [...reporter, ...dispo, ...lead, ...ws, ...drv],
      comment: [...reporter, ...lead, ...(c.status !== 'gemeldet' ? ws : [])],
    };
    if (drv.length) withDrivers++;
    for (const k of kinds) {
      const q0 = QSTAT.n;
      const { list } = await recipientsFor(env, c, k, {});
      eq(QSTAT.n - q0, 1, `${k}: genau eine Abfrage`);
      eq([...new Set(list.map((u) => u.id))].sort().join(','), [...new Set(expect[k])].sort().join(','), `${c.case_no} ${k}: gleiche Empfänger`);
      for (const u of list) eq(!!u.assigned, drv.includes(u.id) && !reporter.includes(u.id) && !lead.includes(u.id), `${k}: assigned nur für zugeordnete Fahrer`);
      ok(list.every((u) => Object.keys(u).every((x) => ['id', 'language', 'role', 'assigned'].includes(x))), 'nur id/Sprache/Rolle');
      compared++;
    }
  }
  console.log(`     ${compared} Vergleiche, ${withDrivers} Vorgänge mit zugeordneten Fahrern`);
});

await test('Vorgangsdetail: Kosten aus geladenen Positionen = eigenständige Kostenberechnung (alle Testvorgänge)', async () => {
  const { caseCosts } = await import('../src/cases.js');
  const ids = (await env.DB.prepare(`SELECT id FROM cases WHERE environment='test' AND id IN (SELECT case_id FROM work_entries UNION SELECT case_id FROM parts UNION SELECT case_id FROM external_costs)`).all()).results.map((r) => r.id);
  ok(ids.length >= 3, `Vorgänge mit Kostenpositionen: ${ids.length}`);
  for (const id of ids) eq(JSON.stringify((await users.fleet.get(`/api/cases/${id}`)).data.costs), JSON.stringify(await caseCosts(env, id)), `Kosten ${id}`);
  // Referenz: Einzelabfragen wie vor dem 12.10. (eine Sammelabfrage in caseCosts)
  const { computeCosts } = await import('../src/cases.js');
  const rr = await env.DB.prepare(`SELECT value FROM settings WHERE key='workshop_hourly_rate_net'`).first();
  const rate = rr && rr.value !== '' ? Number(rr.value) : null;
  for (const id of ids) {
    const q = async (sql) => (await env.DB.prepare(sql).bind(id).all()).results;
    const ref = computeCosts(rate, await q('SELECT hours FROM work_entries WHERE case_id=?'), await q('SELECT quantity, unit_price_net, valuation FROM parts WHERE case_id=?'),
      await q('SELECT amount_net, valuation, covers_work_and_parts FROM external_costs WHERE case_id=?'));
    eq(JSON.stringify(await caseCosts(env, id)), JSON.stringify(ref), `Sammelabfrage = Einzelabfragen ${id}`);
  }
  // Fahrzeugkosten (Akte): Sammelabfrage = Summe der Vorgangskosten je Fahrzeug
  const { vehicleCosts } = await import('../src/cases.js');
  const vids = (await env.DB.prepare(`SELECT DISTINCT vehicle_id FROM cases WHERE id IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)).all()).results.map((x) => x.vehicle_id);
  for (const vid of vids) {
    const cs = (await env.DB.prepare(`SELECT id FROM cases WHERE environment='test' AND vehicle_id=?`).bind(vid).all()).results;
    let a = 0, e = 0, u = 0; for (const c of cs) { const k = await caseCosts(env, c.id); a += k.actual_net; e += k.estimate_net; u += k.unvalued_items; }
    const vc = await vehicleCosts(env, 'test', vid);
    eq(vc.actual_net, Math.round(a * 100) / 100, `Fahrzeug ${vid} belegt`); eq(vc.estimate_net, Math.round(e * 100) / 100, 'geschätzt'); eq(vc.unvalued_items, u, 'unbewertet');
  }
});

await test('Jeder API-Aufruf der Testsuite bleibt bei ≤ 50 D1-Abfragen (Cloudflare-Grenze je Aufruf, Gratis-Tarif)', async () => {
  // Erster Aufruf spielt einmalig die Schema-Migration ein (live bereits erfolgreich gelaufen) – ausgenommen
  const worst = QSTAT.perRequest.slice(1).sort((a, b) => b.n - a.n).slice(0, 5);
  console.log('     größte Aufrufe: ' + worst.map((w) => `${w.method} ${w.path} = ${w.n}`).join(' · '));
  if (process.env.CFP_PATH) { const w = QSTAT.perRequest.filter((x) => x.path === process.env.CFP_PATH).sort((a, b) => b.n - a.n)[0]; if (w && w.sql) console.log(w.sql.map((q, i) => `       ${i + 1}. ${q.slice(0, 160)}`).join('\n')); }
  if (worst[0].sql) console.log(worst[0].sql.map((q, i) => `       ${i + 1}. ${q}`).join('\n')); // CFP_QTRACE=1 npm test
  ok(worst[0].n <= 50, `${worst[0].method} ${worst[0].path} braucht ${worst[0].n} Abfragen`);
  // Fuhrparkagent: Reserve für neue Prüfungen halten (Backlog 74; Ausgangslisten seit 12.10. in einer Abfrage)
  const agentMax = Math.max(...QSTAT.perRequest.slice(1).filter((w) => w.path === '/api/agent/run').map((w) => w.n));
  ok(agentMax <= 40, `Fuhrparkagent braucht ${agentMax} Abfragen (Ziel ≤ 40, Reserve für neue Prüfungen)`);
  const per = (re) => QSTAT.perRequest.slice(1).filter((w) => re.test(w.path)).map((w) => w.n);
  // Vorgangsdetail: Kosten aus bereits geladenen Positionen (12.10.: 24 → 20)
  const caseMax = Math.max(...per(/^\/api\/cases\/:id$/));
  console.log(`     Vorgangsdetail max. ${caseMax} Abfragen`);
  ok(caseMax <= 20, `Vorgangsdetail braucht ${caseMax} Abfragen`);
  // Zeitleiste lädt nur die nötigen Teile der Akte (12.10.: vorher 28)
  const tlMax = Math.max(...per(/^\/api\/vehicles\/[^/]+\/timeline$/)), akteMax = Math.max(...per(/^\/api\/vehicles\/(:vin|VIN[^/]+)$/));
  if (process.env.CFP_TOP) { const m = new Map(); for (const w of QSTAT.perRequest.slice(1)) { const k = w.method + " " + w.path; m.set(k, Math.max(m.get(k) || 0, w.n)); } console.log([...m].sort((a, b) => b[1] - a[1]).slice(0, 15).map((x) => x.join(" = ")).join("\n")); }
  console.log(`     Fahrzeugakte max. ${akteMax}, Zeitleiste max. ${tlMax} Abfragen`);
  ok(akteMax <= 23, `Fahrzeugakte braucht ${akteMax} Abfragen`);
  ok(tlMax < akteMax && tlMax <= 18, `Zeitleiste braucht ${tlMax} Abfragen`);
  // Cron am Ende der Suite (alle Testdaten vorhanden): Agent + Push-Wiederholung bzw. Bereinigung in einem Aufruf
  const cronN = [];
  for (const cron of ['*/15 * * * *', '7,37 * * * *']) {
    const p = []; const q0 = QSTAT.n;
    await worker.scheduled({ cron }, env, { waitUntil: (x) => p.push(x) });
    await Promise.all(p);
    cronN.push(QSTAT.n - q0);
    ok(QSTAT.n - q0 <= 50, `Cron ${cron}: ${QSTAT.n - q0} Abfragen > 50`);
  }
  console.log(`     Cron mit vollem Datenbestand: Betrieb ${cronN[0]}, Test ${cronN[1]} Abfragen`);
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
if (failed) { console.log('Fehlgeschlagen:', failures.join(' | ')); process.exit(1); }
