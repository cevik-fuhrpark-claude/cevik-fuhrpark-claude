// [CLAUDE] CPU-Profil des Fuhrparkagenten (lokal, synthetische Daten, nur In-Memory-DB)
// Aufruf: node --experimental-sqlite scripts/agentprofil.mjs [fahrzeuge] [vorgaenge]
// Misst je Lauf: Gesamtzeit, Anzahl Abfragen und geschriebene Zeilen (D1-Schreibkontingent); listet die teuersten Funktionen.
import { Session } from 'node:inspector/promises';
import worker from '../src/worker.js';
import { makeEnv, Client, QSTAT } from '../test/harness.mjs';

const N_VEH = Number(process.argv[2] || 150);
const N_CASES = Number(process.argv[3] || 3000);
const env = makeEnv();
const owner = new Client(worker, env, 'owner');
const s = await owner.post('/api/setup', { setup_code: 'test-setup-code-123', username: 'profil.inhaber', display_name: 'Profil' });
await owner.post('/api/invite/accept', { token: s.data.invite_token, password: 'Sicheres-Passwort-2026' });
owner.envHeader = 'test';
const csv = ['Kennzeichen / LKW;Standort;Status;Hersteller;Baujahr;FIN;Anhänger Kennzeichen',
  ...Array.from({ length: N_VEH }, (_, i) => `PR-${String(i + 1).padStart(4, '0')};Dortmund;in Betrieb;TEST;2020;PRFX${String(i).padStart(13, '0')};`)].join('\n');
await owner.req('POST', '/api/vehicles/import', csv, { 'content-type': 'text/csv' });
const vehicles = (await owner.get('/api/vehicles')).data.vehicles;
for (let i = 0; i < N_CASES; i++) {
  const v = vehicles[i % vehicles.length];
  await owner.post('/api/cases', { vehicle_id: v.id, description: `Profil ${i}`, priority: ['niedrig', 'mittel', 'kritisch'][i % 3], driveability: 'fahrbereit', workshop_site: 'DORTMUND', request_key: `pr-${i}` });
}
const session = new Session(); session.connect();
await session.post('Profiler.enable'); await session.post('Profiler.setSamplingInterval', { interval: 200 });
const runs = [];
await session.post('Profiler.start');
for (let k = 0; k < 3; k++) {
  const q0 = QSTAT.n; const w0 = QSTAT.written; const t0 = performance.now();
  const r = await owner.post('/api/agent/run');
  runs.push({ ms: performance.now() - t0, q: QSTAT.n - q0, w: QSTAT.written - w0, open: r.data.findings_open, handoffs: r.data.handoffs });
}
const { profile } = await session.post('Profiler.stop');
// Selbstzeit je Funktion
const dt = new Map(); const byId = new Map(profile.nodes.map((n) => [n.id, n]));
for (let i = 0; i < profile.samples.length; i++) { const n = byId.get(profile.samples[i]); const k = `${n.callFrame.functionName || '(anonym)'} ${n.callFrame.url.split('/').slice(-2).join('/')}:${n.callFrame.lineNumber + 1}`; dt.set(k, (dt.get(k) || 0) + (profile.timeDeltas[i] || 0)); }
const total = [...dt.values()].reduce((a, b) => a + b, 0);
console.log(`Fuhrparkagent bei ${N_VEH} Fahrzeugen / ${N_CASES} offenen Vorgängen:`);
for (const [i, r] of runs.entries()) console.log(`  Lauf ${i + 1}: ${r.ms.toFixed(0)} ms, ${r.q} Abfragen, ${r.w} geschriebene Zeilen, ${r.open} offene Befunde, ${r.handoffs} Übergaben`);
console.log('\nTeuerste Funktionen (Selbstzeit, alle 3 Läufe):');
for (const [k, v] of [...dt].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${(v / 1000).toFixed(1).padStart(7)} ms ${(100 * v / total).toFixed(1).padStart(5)} %  ${k}`);
