// [CLAUDE] Lasttest (lokal, synthetische Daten, nur In-Memory-DB): 150 LKW, viele Vorgänge, Messung der Antwortzeiten
// Aufruf: node --experimental-sqlite scripts/lasttest.mjs [fahrzeuge] [vorgaenge] [fahrer] [--check]
// Hinweis: misst die Anwendungslogik auf SQLite; D1 im Betrieb hat zusätzliche Netzlatenz je Abfrage (typisch einige ms).
import worker from '../src/worker.js';
import { makeEnv, Client, QSTAT } from '../test/harness.mjs';

const ARGS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const CHECK = process.argv.includes('--check'); // Abbruch mit Fehlercode, wenn ein Aufruf > 50 D1-Abfragen braucht
const N_VEH = Number(ARGS[0] || 150);
const N_CASES = Number(ARGS[1] || 3000);
const env = makeEnv();
const owner = new Client(worker, env, 'owner');
const must = (r, what) => { if (r.status >= 300) throw new Error(`${what}: ${r.status} ${JSON.stringify(r.data)}`); return r; };

const s = await owner.post('/api/setup', { setup_code: 'test-setup-code-123', username: 'last.inhaber', display_name: 'Lasttest' });
must(await owner.post('/api/invite/accept', { token: s.data.invite_token, password: 'Sicheres-Passwort-2026' }), 'Inhaber');
owner.envHeader = 'test';

const A = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
const vin = (i) => { let x = 'LAST'; let n = i * 7919 + 13; for (let k = 0; k < 13; k++) { x += A[n % A.length]; n = Math.floor(n / A.length) + k * 31 + i; } return x; };
const csv = ['Kennzeichen / LKW;Standort;Status;Hersteller;Baujahr;FIN;Anhänger Kennzeichen',
  ...Array.from({ length: N_VEH }, (_, i) => `LT-${String(i + 1).padStart(4, '0')};${i % 2 ? 'Dortmund' : 'München'};in Betrieb;TEST;2020;${vin(i)};`)].join('\n');
const imp = must(await owner.req('POST', '/api/vehicles/import', csv, { 'content-type': 'text/csv' }), 'Import');
const vehicles = (await owner.get('/api/vehicles')).data.vehicles.filter((v) => v.plate.startsWith('LT-'));
console.log(`Fahrzeuge importiert: ${vehicles.length} (übersprungen: ${(imp.data.skipped || []).length})`);

const timings = {};
const queries = {};
async function timed(label, fn) { const q0 = QSTAT.n; const t0 = performance.now(); const r = await fn(); (timings[label] ||= []).push(performance.now() - t0); (queries[label] ||= []).push(QSTAT.n - q0); return r; }
const prios = ['niedrig', 'mittel', 'niedrig'];
const t0 = performance.now();
const ids = [];
for (let i = 0; i < N_CASES; i++) {
  const v = vehicles[i % vehicles.length];
  const r = await timed('Vorgang anlegen', () => owner.post('/api/cases', { vehicle_id: v.id, description: `Lasttest ${i}`, priority: prios[i % 3], driveability: 'fahrbereit', workshop_site: i % 2 ? 'DORTMUND' : 'MUENCHEN', request_key: `lt-${i}` }));
  must(r, 'Vorgang'); ids.push(r.data.id);
}
console.log(`${N_CASES} Vorgänge in ${((performance.now() - t0) / 1000).toFixed(1)} s angelegt`);

// geplante Werkstatttermine (synthetisch, direkt in der DB): jeder 5. Vorgang freigegeben mit Termin in den nächsten 30 Tagen bzw. überschritten
{ const base = Date.now(); const st = env.DB.prepare(`UPDATE cases SET status='werkstatt_freigegeben', workshop_ack_at=?, planned_date=? WHERE id=?`);
  await env.DB.batch(ids.filter((_, i) => i % 5 === 0).map((id, j) => st.bind(new Date(base).toISOString(), new Date(base + ((j % 40) - 5) * 86400000).toISOString().slice(0, 10), id))); }
// Teile-Abschnitte (synthetisch, direkt in die DB) für die Kennzahl „Termintreue Teile“: jeder 3. Vorgang 1–3× „wartet auf Teile“
// mit/ohne Liefertermin, teils verschoben, Fortsetzung pünktlich oder verspätet; Ereignisse innerhalb der letzten 300 Tage
{ const st = env.DB.prepare(`INSERT INTO case_events (id, case_id, environment, action, from_status, to_status, payload, created_at) VALUES (?,?,?,?,?,?,?,?)`);
  const iso = (ms) => new Date(ms).toISOString(); const ymd = (ms) => iso(ms).slice(0, 10);
  const batch = []; let n = 0;
  for (const [i, id] of ids.entries()) {
    if (i % 3) continue;
    let t = Date.now() - (10 + (i % 280)) * 86400000;
    for (let k = 0; k < 1 + (i % 3); k++) {
      const eta = i % 7 === 0 ? null : t + (2 + (i % 5)) * 86400000;
      batch.push(st.bind(`lt-ev-${n++}`, id, 'test', 'wait_parts', 'in_reparatur', 'wartet_teile', eta ? JSON.stringify({ parts_expected_date: ymd(eta) }) : null, iso(t)));
      if (eta && i % 4 === 0) batch.push(st.bind(`lt-ev-${n++}`, id, 'test', 'set_parts_eta', null, null, JSON.stringify({ from: ymd(eta), to: ymd(eta + 2 * 86400000) }), iso(t + 3600000)));
      t += (1 + ((i + k) % 9)) * 86400000;
      batch.push(st.bind(`lt-ev-${n++}`, id, 'test', 'resume_repair', 'wartet_teile', 'in_reparatur', null, iso(t)));
      t += 86400000;
    }
  }
  await env.DB.batch(batch); console.log(`${n} Teile-Ereignisse (synthetisch) für die Kennzahl Termintreue`); }
for (let k = 0; k < 20; k++) {
  await timed('Werkstattplan 30 Tage', () => owner.get('/api/workshop/plan?days=30'));
  await timed('Vorgangsliste', () => owner.get('/api/cases'));
  await timed('Startseite (Zähler, 500 offene)', () => owner.get('/api/dashboard'));
  await timed('Vorgangsdetail', () => owner.get(`/api/cases/${ids[(k * 97) % ids.length]}`));
  await timed('Fahrzeugliste', () => owner.get('/api/vehicles'));
  await timed('Fahrzeugdetail', () => owner.get(`/api/vehicles/${vehicles[k % vehicles.length].id}`));
  await timed('Management-Panel', () => owner.get('/api/master'));
  await timed('Kostenbericht 12 Monate', () => owner.get('/api/reports/costs'));
  await timed('Kennzahlen 12 Monate', () => owner.get('/api/reports/kpi?from=' + new Date(Date.now() - 330 * 86400000).toISOString().slice(0, 7)));
  if (!globalThis.__ltInsp) { globalThis.__ltInsp = true; // synthetische Kontrollen direkt in die DB (100 je Fahrzeug über 365 Tage, 18 Prüfpunkte, jede 10. mit Mangel) für die Mängelstatistik
    const me = (await owner.get('/api/me')).data.user.id; const keys = (await owner.get('/api/meta')).data.checklist.map((c) => c.key);
    const st = env.DB.prepare(`INSERT INTO inspections (id, environment, vehicle_id, kind, template_version, performed_by, items, result, created_at) VALUES (?,?,?,?,?,?,?,?,?)`);
    const batch = [];
    for (const [vi, v] of vehicles.entries()) for (let n = 0; n < 100; n++) {
      const bad = (vi + n) % 10 === 0;
      batch.push(st.bind(`lt-insp-${vi}-${n}`, 'test', v.id, 'abfahrt', 'v1', me, JSON.stringify(keys.map((k, j) => ({ key: k, result: bad && j === n % keys.length ? 'mangel' : 'ok' }))), bad ? 'maengel' : 'ok', new Date(Date.now() - n * 3.6 * 86400000).toISOString()));
    }
    await env.DB.batch(batch);
  }
  await timed('Mängelstatistik 365 Tage', () => owner.get('/api/reports/defects?days=365'));
  await timed('Prüftermine Übersicht', () => owner.get('/api/maintenance'));
  await timed('Reifen Flotte', () => owner.get('/api/tires/fleet'));
  await timed('Vorgangssuche', () => owner.get('/api/cases?q=LT'));
  await timed('Fahrzeug-Zeitleiste', () => owner.get(`/api/vehicles/${vehicles[k % vehicles.length].id}/timeline`));
  await timed('Datenqualität', () => owner.get('/api/admin/data-quality'));
  await timed('Werkstatt-Auslastung 26 Wo.', () => owner.get('/api/reports/workshop-load?weeks=26'));
  await timed('Nutzungsstatistik', () => owner.get('/api/admin/usage?days=365'));
  if (k < 3) await timed('Vorgänge CSV-Export', () => owner.get('/api/cases?format=csv'));
}
// Fahrerakte + Auslesungen (synthetisch): Fahrer mit Fahrerkarte, Führerschein, Kontrolle, Auslesungen; Massenspeicher je Lkw
const N_DRV = Number(ARGS[2] || 200);
const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const drvIds = [];
for (let i = 0; i < N_DRV; i++) {
  const d = must(await owner.post('/api/drivers', { display_name: `Lastfahrer ${i}`, personnel_no: `LT-${i}` }), 'Fahrer');
  drvIds.push(d.data.id);
  must(await owner.post(`/api/drivers/${d.data.id}/documents`, { kind: 'fahrerkarte', valid_until: day(-(i % 60) * 20), evidence: 'Lasttest' }), 'Fahrerkarte');
  must(await owner.post(`/api/drivers/${d.data.id}/documents`, { kind: 'fuehrerschein', valid_until: day(-(i % 50) * 30 + 10), evidence: 'Lasttest' }), 'Führerschein');
  must(await owner.post(`/api/drivers/${d.data.id}/license-checks`, { checked_on: day(i % 200), result: 'in_ordnung' }), 'Kontrolle');
  if (i % 4) must(await owner.post('/api/tacho/downloads', { kind: 'fahrerkarte', driver_id: d.data.id, downloaded_on: day(i % 40), evidence: 'Lasttest' }), 'Auslesung Karte');
}
for (const [i, v] of vehicles.entries()) must(await owner.post('/api/tacho/downloads', { kind: 'massenspeicher', vehicle_id: v.id, downloaded_on: day(i % 100), evidence: 'Lasttest' }), 'Auslesung Massenspeicher');
must(await owner.put('/api/settings', { license_check_months: 6 }), 'Einstellung');
console.log(`${N_DRV} Fahrer mit Nachweisen und Auslesungen angelegt`);
for (let k = 0; k < 10; k++) {
  await timed('Fahrerliste', () => owner.get('/api/drivers'));
  await timed('Fahrerakte', () => owner.get(`/api/drivers/${drvIds[(k * 37) % drvIds.length]}`));
  await timed('Auslesungen Übersicht', () => owner.get('/api/tacho'));
  await timed('Auslesungen Standort', () => owner.get('/api/tacho?site=M%C3%BCnchen'));
  await timed('Fahrerliste Standort', () => owner.get('/api/drivers?site=ohne'));
}
// Fahrzeugverträge (synthetisch): je Fahrzeug Leasing mit km-Kontingent + Versicherung; Enddaten so gestreut, dass viele Agent-Befunde
// (abgelaufen, läuft aus, Kündigungstag, km über/Prognose) gleichzeitig entstehen – Worst Case für das Abfragebudget des Fuhrparkagenten.
{ const st = env.DB.prepare(`INSERT INTO odometer_readings (id, vehicle_id, km, measured_at, source, recorded_by, created_at) VALUES (?,?,?,?,?,?,?)`);
  const me = (await owner.get('/api/me')).data.user.id;
  await env.DB.batch(vehicles.map((v, i) => st.bind(`lt-km-${i}`, v.id, 100000 + i * 900, new Date(Date.now() - 86400000).toISOString(), 'manual', me, new Date().toISOString())));
  for (const [i, v] of vehicles.entries()) {
    await timed('Vertrag anlegen', () => owner.post(`/api/vehicles/${v.id}/contracts`, { kind: 'leasing', partner: 'Lasttest Leasing', start_date: day(400), end_date: day(-((i % 30) * 10 - 40)), notice_months: 3, km_allowance: 100000 + (i % 3) * 20000, start_km: i % 2 ? 50000 : 100000, monthly_rate_net: 1000 + i, evidence: 'Lasttest' }).then((r) => must(r, 'Vertrag')));
    await timed('Vertrag anlegen', () => owner.post(`/api/vehicles/${v.id}/contracts`, { kind: 'versicherung', partner: 'Lasttest Versicherung', start_date: day(300), end_date: day(-(i % 90)), evidence: 'Lasttest' }).then((r) => must(r, 'Vertrag')));
  }
  console.log(`${vehicles.length * 2} Verträge angelegt`);
}
const contractCsv = ['Kennzeichen;Vertragsart;Vertragspartner;Beginn;Ende;Nachweis',
  ...vehicles.map((v, i) => `${v.plate};Wartungsvertrag;Lasttest Service;01.01.2026;31.12.2027;Lasttest ${i}`)].join('\n');
await timed('Verträge-Import Vorschau', () => owner.req('POST', '/api/contracts/import?dry_run=1', contractCsv, { 'content-type': 'text/csv' }).then((r) => must(r, 'Vertragsimport')));
for (let k = 0; k < 10; k++) {
  await timed('Verträge Übersicht', () => owner.get('/api/contracts'));
  await timed('Verträge Handlungsbedarf', () => owner.get('/api/contracts?filter=aktion'));
  await timed('Verträge Standort', () => owner.get('/api/contracts?site=Dortmund'));
}
await timed('Verträge CSV-Export', () => owner.get('/api/contracts?format=csv'));
// Prüfregeln mit geplantem Werkstatttermin (synthetisch, direkt in der DB): je Lkw UVV und Tachograph, fällig in −10 … +80 Tagen, jede zweite eingeplant
{ const me = (await owner.get('/api/me')).data.user.id; const now = new Date().toISOString();
  const st = env.DB.prepare(`INSERT INTO maintenance_rules (id, vehicle_id, kind, interval_months, next_due_date, planned_date, evidence, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  await env.DB.batch(vehicles.flatMap((v, i) => ['UVV', 'Tachograph'].map((kind, j) => st.bind(`lt-mr-${i}-${j}`, v.id, kind, kind === 'UVV' ? 12 : 24, day(10 - ((i * 7 + j * 13) % 90)), (i + j) % 2 ? day(-((i % 30) + 1)) : null, 'Lasttest', me, now, now)))); }
for (let k = 0; k < 5; k++) {
  await timed('Prüftermin-Kalender (.ics)', () => owner.get('/api/maintenance?format=ics'));
  await timed('Werkstattplan-Kalender (.ics)', () => owner.get('/api/workshop/plan?days=60&format=ics'));
  await timed('Prüftermine mit Plan', () => owner.get('/api/maintenance'));
}
// Werkstattaufträge aus Prüfterminen (60) und Kosten-Freigabegrenze: je Auftrag zwei Fremdleistungs-Schätzungen (zweite überschreitet),
// jede zweite Überschreitung wird freigegeben – prüft Abfragebudget von Auftrag, Kostenprüfung und Kennzahl „Kostenfreigaben“
await owner.put('/api/settings', { repair_cost_limit_net: 500 });
for (let i = 0; i < 60; i++) {
  const o = must(await timed('Auftrag aus Prüftermin', () => owner.post(`/api/maintenance/lt-mr-${i}-0/order`, { workshop_site: i % 2 ? 'DORTMUND' : 'MUENCHEN', request_key: `lt-mo-${i}` })), 'Auftrag aus Prüftermin').data;
  const cmd = async (label, action, payload, note) => { const v = (await owner.get(`/api/cases/${o.id}`)).data.case.version;
    return must(await timed(label, () => owner.post(`/api/cases/${o.id}/commands`, { action, command_id: `lt-c-${i}-${action}-${Math.random()}`, expected_version: v, payload, note })), action); };
  await cmd('Kostenbuchung mit Grenze', 'add_external_cost', { supplier: 'Lasttest', amount_net: 400, valuation: 'estimate' }, 'Angebot');
  await cmd('Kostenbuchung mit Grenze', 'add_external_cost', { supplier: 'Lasttest', amount_net: 300, valuation: 'estimate' }, 'Nachtrag');
  if (i % 2) await cmd('Kosten freigeben', 'approve_costs', {}, 'Lasttest Freigabe');
}
for (let k = 0; k < 5; k++) await timed('Kennzahlen + Kostenfreig.', () => owner.get('/api/reports/kpi?from=' + new Date(Date.now() - 330 * 86400000).toISOString().slice(0, 7)));
{ const ca = (await owner.get('/api/reports/kpi')).data.cost_approvals || {};
  console.log(`Kostenfreigaben (synthetisch): ${JSON.stringify({ exceeded: ca.exceeded, approved: ca.approved, pending: ca.pending })}`);
  if (CHECK && !(ca.exceeded >= 60 && ca.approved >= 30)) { console.error('Kennzahl Kostenfreigaben unvollständig – Lasttest prüfen'); process.exitCode = 1; } }
await owner.put('/api/settings', { repair_cost_limit_net: '' });
// Versicherungsfälle (synthetisch): 600 Vorgänge mit Fall, Meldedatum über 200 Tage gestreut, jeder zweite mit Erstattung
for (const [i, id] of ids.slice(0, 600).entries()) {
  const rep = i % 200; const body = { insurer: 'Lasttest Versicherung', claim_no: `LT-S-${i}`, reported_on: day(rep), deductible_net: 500, evidence: 'Lasttest' };
  if (i % 2) Object.assign(body, { status: 'reguliert', reimbursed_net: 1000 + i, reimbursed_on: day(Math.max(0, rep - 30)) });
  await timed('Versicherungsfall erfassen', () => owner.put(`/api/cases/${id}/claim`, body).then((r) => must(r, 'Versicherungsfall')));
}
for (let k = 0; k < 10; k++) {
  await timed('Versicherungsfälle Übersicht', () => owner.get('/api/claims?filter=alle'));
  await timed('Versicherungsfälle Standort', () => owner.get('/api/claims?filter=alle&site=Dortmund'));
  await timed('Kostenbericht inkl. Erstatt.', () => owner.get('/api/reports/costs'));
  await timed('Zeitleiste inkl. Vers.-Fälle', () => owner.get(`/api/vehicles/${vehicles[k % vehicles.length].id}/timeline`));
}
await timed('Versicherungsfälle CSV', () => owner.get('/api/claims?format=csv&filter=alle'));
await timed('Datenqualität inkl. Unfall', () => owner.get('/api/admin/data-quality'));
// Durchführungen mit Ergebnis (synthetisch, direkt in der DB): je Prüfregel 4 Durchführungen über 360 Tage, jede 3. mit erheblichen/gefährlichen
// Mängeln, die Hälfte davon mit verknüpftem Mängelauftrag (teils freigegeben) – prüft Nachweisliste mit Unterabfragen, Prüfmängel ohne Auftrag,
// ausstehende Nachprüfungen, Kennzahl „Mängelbeseitigung“ und die Integrations-API (/v1/kpi, /v1/maintenance/history)
{ const me = (await owner.get('/api/me')).data.user.id; const now = new Date().toISOString();
  const res = ['ohne_maengel', 'geringe_maengel', 'erhebliche_maengel', 'ohne_maengel', 'gefaehrliche_maengel', 'geringe_maengel'];
  const st = env.DB.prepare(`INSERT INTO maintenance_events (id, rule_id, vehicle_id, kind, done_date, done_km, evidence, source, recorded_by, created_at, result) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  const link = env.DB.prepare(`UPDATE cases SET maintenance_event_id=?, status=?, closed_at=? WHERE id=?`);
  const ev = []; const links = []; let n = 0; let d = 0;
  for (const [i, v] of vehicles.entries()) for (const [j, kind] of ['UVV', 'Tachograph'].entries()) for (let k = 0; k < 4; k++) {
    const id = `lt-me-${i}-${j}-${k}`; const r = res[(i + j + k) % res.length];
    ev.push(st.bind(id, `lt-mr-${i}-${j}`, v.id, kind, day(20 + k * 90 + (i % 30)), null, 'Lasttest', 'erfasst', me, now, r)); n++;
    if (['erhebliche_maengel', 'gefaehrliche_maengel'].includes(r) && (d++ % 2) === 0) {
      const cid = ids[600 + (links.length % (ids.length - 600))]; const rel = links.length % 3 === 0;
      links.push(link.bind(id, rel ? 'fahrzeug_freigegeben' : 'werkstatt_freigegeben', rel ? new Date(Date.now() - (i % 20) * 86400000).toISOString() : null, cid));
    }
  }
  await env.DB.batch(ev); await env.DB.batch(links);
  console.log(`${n} Durchführungen (synthetisch), ${d} mit erheblichen Mängeln, ${links.length} mit Mängelauftrag`);
}
const kpiFrom = new Date(Date.now() - 330 * 86400000).toISOString().slice(0, 7);
const IH = { authorization: 'Bearer integration-token-xyz' };
const integ = (path) => owner.req('GET', '/api/integration' + path, undefined, IH).then((r) => must(r, path));
for (let k = 0; k < 5; k++) {
  await timed('Nachweisliste 12 Monate', () => owner.get('/api/maintenance/history?from=' + day(365)).then((r) => must(r, 'Nachweisliste')));
  await timed('Nachweisliste CSV', () => owner.get('/api/maintenance/history?format=csv&from=' + day(365)).then((r) => must(r, 'Nachweisliste CSV')));
  await timed('Prüftermine inkl. Mängel', () => owner.get('/api/maintenance'));
  await timed('Kennzahlen inkl. Mängel', () => owner.get('/api/reports/kpi?from=' + kpiFrom));
  await timed('API /v1/kpi', () => integ('/v1/kpi?environment=test&from=' + kpiFrom));
  await timed('API /v1/maintenance/history', () => integ('/v1/maintenance/history?environment=test&from=' + day(365)));
  await timed('API /v1/maintenance', () => integ('/v1/maintenance?environment=test'));
}
// Telematik (synthetisch): je Fahrzeug ein Gerät bei beiden Anbietern, zwei Einspeisungsrunden; 10 Fahrzeuge außer Betrieb genommen,
// danach liefern deren Geräte weiter (Worst Case für telematics_vehicle_inactive / inactive_vehicle_reports)
{ const post = (body) => owner.req('POST', '/api/integration/v1/telematics', body, IH).then((r) => must(r, 'Telematik-Einspeisung'));
  const feed = async (round) => { for (const provider of ['webfleet', 'yellowfox']) for (let i = 0; i < vehicles.length; i += 500) {
    const items = vehicles.slice(i, i + 500).map((v, j) => ({ external_id: `${provider}-${i + j}`, vin: v.vin, lat: 51 + j / 1000, lon: 7 + j / 1000,
      km: 100000 + (i + j) * 10 + round * 50, gps_time: new Date(round ? Date.now() + 1000 + j * 100 : Date.now() - 3600000 + j * 100).toISOString() }));
    await timed('Telematik-Einspeisung (≤500)', () => post({ provider, items })); } };
  await feed(0);
  // direkt in der DB (die Lasttest-Fahrzeuge haben offene Vorgänge; „außer Betrieb nehmen“ lehnt das ab) – mit Protokolleintrag wie die App
  { const at = new Date().toISOString(); const off = vehicles.slice(0, 10);
    await env.DB.batch([...off.map((v) => env.DB.prepare('UPDATE vehicles SET active=0 WHERE id=?').bind(v.id)),
      ...off.map((v, j) => env.DB.prepare('INSERT INTO audit_log(id,actor_id,action,target,detail,created_at) VALUES (?,?,?,?,?,?)').bind(`lt-deact-${j}`, null, 'vehicle.deactivate', v.id, '{"reason":"Lasttest"}', at))]); }
  await feed(1);
  for (let k = 0; k < 5; k++) {
    await timed('Telematik-Übersicht', () => owner.get('/api/telematics').then((r) => must(r, 'Telematik-Übersicht')));
    await timed('Telematik CSV', () => owner.get('/api/telematics?format=csv').then((r) => must(r, 'Telematik CSV')));
    await timed('API /v1/telematics/status', () => integ('/v1/telematics/status'));
  }
  const st = await integ('/v1/telematics/status');
  console.log(`Telematik (synthetisch): ${st.data.providers.map((p) => `${p.provider} ${p.devices} Geräte, außer Betrieb sendet weiter ${p.inactive_vehicle_reports}`).join(' · ')}`);
  if (CHECK && st.data.providers.some((p) => p.inactive_vehicle_reports !== 10)) { console.error('Telematik: inactive_vehicle_reports ≠ 10 – Lasttest-Daten prüfen'); process.exitCode = 1; }
  await env.DB.batch(vehicles.slice(0, 10).map((v) => env.DB.prepare('UPDATE vehicles SET active=1 WHERE id=?').bind(v.id)));
}
await timed('Datenqualität inkl. Prüfmängel', () => owner.get('/api/admin/data-quality'));
await timed('API /v1/data-quality', () => integ('/v1/data-quality?environment=test'));
await timed('Eigene Prüfungen ohne Ergebnis', () => owner.get('/api/me/inspections-without-result').then((r) => must(r, 'me/inspections-without-result')));
{ const idk = (await owner.get('/api/reports/kpi?from=' + kpiFrom)).data.inspection_defects || {};
  console.log(`Mängelbeseitigung (synthetisch): ${JSON.stringify(idk).slice(0, 200)}`); }
await owner.put('/api/settings', { claim_followup_days: '30' }); // Worst Case: Nachfass-Befunde für Versicherungsfälle aktiv
for (let k = 0; k < 3; k++) await timed('Fuhrparkagent (Cron-Lauf)', () => owner.post('/api/agent/run'));

const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
{ const pe = (await owner.get('/api/reports/kpi?from=' + new Date(Date.now() - 330 * 86400000).toISOString().slice(0, 7))).data.parts_eta || {};
  const tot = pe.total || pe; console.log(`Termintreue Teile (synthetisch): ${JSON.stringify({ kept: tot.kept, late: tot.late, without_eta: tot.without_eta, open_overdue: tot.open_overdue })}`);
  if (CHECK && !((tot.kept || 0) + (tot.late || 0))) { console.error('Kennzahl Termintreue ohne Abschnitte – Lasttest-Daten prüfen'); process.exitCode = 1; } }
console.log('\nAntwortzeiten (ms)          n     p50     p95     max   SQL max');
for (const [k, a] of Object.entries(timings)) console.log(`${k.padEnd(26)} ${String(a.length).padStart(5)} ${pct(a, 0.5).toFixed(1).padStart(7)} ${pct(a, 0.95).toFixed(1).padStart(7)} ${Math.max(...a).toFixed(1).padStart(7)} ${String(Math.max(...queries[k])).padStart(9)}`);
const list = (await owner.get('/api/cases')).data.cases;
console.log(`\nVorgangsliste liefert ${list.length} Einträge (Begrenzung beachten).`);
if (CHECK) {
  const over = Object.entries(queries).filter(([, a]) => Math.max(...a) > 50).map(([k, a]) => `${k} (${Math.max(...a)})`);
  if (over.length) { console.error(`\nPRÜFUNG FEHLGESCHLAGEN – über 50 D1-Abfragen je Aufruf: ${over.join(', ')}`); process.exit(1); }
  console.log('\nPrüfung bestanden: alle Aufrufe ≤ 50 D1-Abfragen.');
}
