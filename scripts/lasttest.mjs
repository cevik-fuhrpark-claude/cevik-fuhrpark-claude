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

for (let k = 0; k < 20; k++) {
  await timed('Vorgangsliste', () => owner.get('/api/cases'));
  await timed('Vorgangsdetail', () => owner.get(`/api/cases/${ids[(k * 97) % ids.length]}`));
  await timed('Fahrzeugliste', () => owner.get('/api/vehicles'));
  await timed('Fahrzeugdetail', () => owner.get(`/api/vehicles/${vehicles[k % vehicles.length].id}`));
  await timed('Management-Panel', () => owner.get('/api/master'));
  await timed('Kostenbericht 12 Monate', () => owner.get('/api/reports/costs'));
  await timed('Kennzahlen 12 Monate', () => owner.get('/api/reports/kpi?from=' + new Date(Date.now() - 330 * 86400000).toISOString().slice(0, 7)));
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
}
for (let k = 0; k < 3; k++) await timed('Fuhrparkagent (Cron-Lauf)', () => owner.post('/api/agent/run'));

const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))];
console.log('\nAntwortzeiten (ms)          n     p50     p95     max   SQL max');
for (const [k, a] of Object.entries(timings)) console.log(`${k.padEnd(26)} ${String(a.length).padStart(5)} ${pct(a, 0.5).toFixed(1).padStart(7)} ${pct(a, 0.95).toFixed(1).padStart(7)} ${Math.max(...a).toFixed(1).padStart(7)} ${String(Math.max(...queries[k])).padStart(9)}`);
const list = (await owner.get('/api/cases')).data.cases;
console.log(`\nVorgangsliste liefert ${list.length} Einträge (Begrenzung beachten).`);
if (CHECK) {
  const over = Object.entries(queries).filter(([, a]) => Math.max(...a) > 50).map(([k, a]) => `${k} (${Math.max(...a)})`);
  if (over.length) { console.error(`\nPRÜFUNG FEHLGESCHLAGEN – über 50 D1-Abfragen je Aufruf: ${over.join(', ')}`); process.exit(1); }
  console.log('\nPrüfung bestanden: alle Aufrufe ≤ 50 D1-Abfragen.');
}
