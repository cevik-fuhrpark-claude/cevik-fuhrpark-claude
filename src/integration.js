// [CLAUDE] Integrations-API für das Unternehmensbetriebssystem und n8n (Bearer-Token aus Cloudflare-Secret)
import { json, readJson, HttpError, nowIso, uuid, normalizeVin, timingSafeEqual, bad } from './util.js';
import { masterPanel } from './agent.js';
import { costReport } from './reports.js';
import { maintenanceOverview } from './maintenance.js';

// Tokens: INTEGRATION_TOKEN (lesen + Telematik schreiben), optional INTEGRATION_TOKEN_NEXT (gleiche Rechte, für Wechsel ohne Ausfall)
// und INTEGRATION_TOKEN_READ (nur lesen, z. B. für Auswertungen). Ergebnis: 'write' oder 'read'.
function checkToken(request, env) {
  const full = [env.INTEGRATION_TOKEN, env.INTEGRATION_TOKEN_NEXT].filter(Boolean);
  const read = [env.INTEGRATION_TOKEN_READ].filter(Boolean);
  if (!full.length && !read.length) throw new HttpError(503, 'integration_disabled', 'Integrations-API ist nicht aktiviert (Secret INTEGRATION_TOKEN fehlt).');
  const h = request.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  // alle Vergleiche ausführen (gleiche Laufzeit unabhängig vom Treffer)
  let scope = null;
  for (const t of full) if (timingSafeEqual(token, t)) scope = 'write';
  for (const t of read) if (timingSafeEqual(token, t) && !scope) scope = 'read';
  if (!scope || token.length < 16) throw new HttpError(401, 'invalid_token', 'Ungültiges Integrations-Token.');
  return scope;
}

const envParam = (url) => (url.searchParams.get('environment') === 'test' ? 'test' : 'production');

export async function integrationRouter(request, env, ctx, url) {
  const scope = checkToken(request, env);
  const p = url.pathname.replace('/api/integration', '');
  const m = request.method;
  if (m !== 'GET' && scope !== 'write') throw new HttpError(403, 'read_only_token', 'Dieses Token darf nur lesen.');
  if (p === '/v1/vehicles' && m === 'GET') {
    const rows = (await env.DB.prepare(`SELECT v.id, v.vin, v.plate, v.kind, v.site, v.manufacturer, v.model, v.build_year, v.trailer_plate, v.trailer_vin, v.master_status, v.updated_at
      FROM vehicles v WHERE v.active=1 ORDER BY v.plate`).all()).results;
    return json({ schema_version: '1.0', vehicles: rows });
  }
  if (p === '/v1/cases' && m === 'GET') {
    const since = url.searchParams.get('since') || '1970-01-01T00:00:00.000Z';
    const rows = (await env.DB.prepare(`SELECT c.id, c.case_no, c.environment, c.vehicle_id, c.status, c.priority, c.reported_priority, c.reported_driveability, c.safety_lock,
      c.workshop_site, c.origin, c.parent_case_id, c.fleet_received_at, c.workshop_ack_at, c.created_at, c.updated_at, c.closed_at, c.version
      FROM cases c WHERE c.environment=? AND c.updated_at > ? ORDER BY c.updated_at LIMIT 1000`).bind(envParam(url), since).all()).results;
    return json({ schema_version: '1.0', cases: rows });
  }
  if (p === '/v1/findings' && m === 'GET') {
    const rows = (await env.DB.prepare(`SELECT * FROM agent_findings WHERE environment=? AND status='offen'`).bind(envParam(url)).all()).results;
    return json({ schema_version: '1.0', findings: rows });
  }
  if (p === '/v1/costs' && m === 'GET') return json({ schema_version: '1.0', ...(await costReport(env, null, envParam(url), Object.fromEntries(url.searchParams))) });
  if (p === '/v1/maintenance' && m === 'GET') return json({ schema_version: '1.0', ...(await maintenanceOverview(env, null)) });
  if (p === '/v1/master' && m === 'GET') return json({ schema_version: '1.0', ...(await masterPanel(env, envParam(url))) });

  // Telematik-Einspeisung: nur FIN oder bestätigtes Mapping führt zur Zuordnung
  if (p === '/v1/telematics' && m === 'POST') {
    const body = await readJson(request, 2 * 1024 * 1024);
    const items = Array.isArray(body.items) ? body.items : null;
    if (!items) throw bad('validation', 'items[] erforderlich.');
    if (items.length > 500) throw bad('validation', 'Max. 500 Einträge je Aufruf.');
    const provider = String(body.provider || '').toLowerCase();
    if (!['webfleet', 'yellowfox'].includes(provider)) throw bad('validation', 'provider muss webfleet oder yellowfox sein.');
    const now = nowIso();
    const res = { matched: 0, unmatched: 0, rejected: 0, odometer_written: 0 };
    // Abfragebudget: Zuordnungen, Fahrzeuge und letzte Stände gesammelt laden, Schreibzugriffe gesammelt ausführen
    // (vorher bis zu 4 Abfragen je Eintrag – bei 500 Einträgen weit über der Grenze je Aufruf).
    const rows = items.map((it) => {
      const ext = String(it.external_id || '').slice(0, 80);
      return { it, ext, vin: it.vin ? normalizeVin(it.vin) : null, plate: it.plate ? String(it.plate).toUpperCase().slice(0, 20) : null };
    });
    const J = (a) => JSON.stringify([...new Set(a.filter(Boolean))]);
    const [maps, byVin, plates, latest] = await Promise.all([
      env.DB.prepare('SELECT external_id, vehicle_id FROM telematics_mappings WHERE provider=? AND external_id IN (SELECT value FROM json_each(?))').bind(provider, J(rows.map((r) => r.ext))).all(),
      env.DB.prepare('SELECT id, vin FROM vehicles WHERE vin IN (SELECT value FROM json_each(?))').bind(J(rows.map((r) => r.vin))).all(),
      env.DB.prepare(`SELECT id, REPLACE(UPPER(plate),' ','') AS k FROM vehicles WHERE REPLACE(UPPER(plate),' ','') IN (SELECT value FROM json_each(?))`).bind(J(rows.map((r) => r.plate && r.plate.replace(/ /g, '')))).all(),
      env.DB.prepare('SELECT vehicle_id, gps_time FROM telematics_latest WHERE provider=?').bind(provider).all(),
    ]);
    const mapOf = new Map(maps.results.map((r) => [r.external_id, r.vehicle_id]));
    const vinOf = new Map(byVin.results.map((r) => [r.vin, r.id]));
    const plateOf = new Map(plates.results.map((r) => [r.k, r.id]));
    const lastGps = new Map(latest.results.map((r) => [r.vehicle_id, r.gps_time]));
    // Gesammelte Schreibzugriffe: je Tabelle EINE Anweisung über json_each (jede Anweisung zählt zum Abfragebudget)
    const unmatched = new Map(); const latestRows = new Map(); const odo = [];
    for (const { it, ext, vin, plate } of rows) {
      if (!ext) { res.rejected++; continue; }
      let vehicleId = null; let basis = null;
      if (mapOf.has(ext)) { vehicleId = mapOf.get(ext); basis = 'confirmed_mapping'; }
      else if (vin && vinOf.has(vin)) { vehicleId = vinOf.get(vin); basis = 'vin'; }
      const gps = it.gps_time && !Number.isNaN(Date.parse(it.gps_time)) ? new Date(it.gps_time).toISOString() : null;
      const lat = Number.isFinite(Number(it.lat)) && Math.abs(Number(it.lat)) <= 90 ? Number(it.lat) : null;
      const lon = Number.isFinite(Number(it.lon)) && Math.abs(Number(it.lon)) <= 180 ? Number(it.lon) : null;
      const validPos = lat !== null && lon !== null && !(lat === 0 && lon === 0);
      if (!vehicleId) {
        unmatched.set(ext, { ext, plate, vin, cand: plate ? plateOf.get(plate.replace(/ /g, '')) || null : null });
        res.unmatched++;
        continue;
      }
      // Keine Rückschritte: ältere GPS-Zeit überschreibt keinen neueren Stand (auch innerhalb desselben Aufrufs)
      const prev = lastGps.get(vehicleId);
      if (prev && gps && gps < prev) { res.rejected++; continue; }
      if (gps) lastGps.set(vehicleId, gps);
      const km = Number.isFinite(Number(it.km)) && Number(it.km) >= 0 ? Number(it.km) : null;
      latestRows.set(vehicleId, { v: vehicleId, ext, basis, gps, lat: validPos ? lat : null, lon: validPos ? lon : null, km,
        speed: Number.isFinite(Number(it.speed)) ? Number(it.speed) : null, ign: it.ignition === undefined || it.ignition === null ? null : (it.ignition ? 1 : 0) });
      if (km !== null && gps) odo.push({ id: uuid(), v: vehicleId, km: Math.round(km), t: gps });
      res.matched++;
    }
    const X = (k) => `json_extract(value,'$.${k}')`;
    const stmts = [];
    if (unmatched.size) stmts.push(env.DB.prepare(`INSERT INTO telematics_unmatched(provider,external_id,source_plate,source_vin,candidate_vehicle_id,last_seen)
      SELECT ?1, ${X('ext')}, ${X('plate')}, ${X('vin')}, ${X('cand')}, ?2 FROM json_each(?3) WHERE 1
      ON CONFLICT(provider,external_id) DO UPDATE SET source_plate=excluded.source_plate, source_vin=excluded.source_vin, candidate_vehicle_id=excluded.candidate_vehicle_id, last_seen=excluded.last_seen`)
      .bind(provider, now, JSON.stringify([...unmatched.values()])));
    if (latestRows.size) stmts.push(env.DB.prepare(`INSERT INTO telematics_latest(vehicle_id,provider,external_id,match_basis,gps_time,received_at,lat,lon,km,speed,ignition)
      SELECT ${X('v')}, ?1, ${X('ext')}, ${X('basis')}, ${X('gps')}, ?2, ${X('lat')}, ${X('lon')}, ${X('km')}, ${X('speed')}, ${X('ign')} FROM json_each(?3) WHERE 1
      ON CONFLICT(vehicle_id,provider) DO UPDATE SET external_id=excluded.external_id, match_basis=excluded.match_basis, gps_time=excluded.gps_time, received_at=excluded.received_at,
        lat=excluded.lat, lon=excluded.lon, km=excluded.km, speed=excluded.speed, ignition=excluded.ignition`)
      .bind(provider, now, JSON.stringify([...latestRows.values()])));
    const odoPos = stmts.length;
    if (odo.length) stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at)
      SELECT ${X('id')}, ${X('v')}, ${X('km')}, ${X('t')}, ?1, NULL, ?2 FROM json_each(?3)`).bind(`telematik:${provider}`, now, JSON.stringify(odo)));
    if (stmts.length) {
      const out = await env.DB.batch(stmts);
      if (odo.length) res.odometer_written = (out[odoPos] && out[odoPos].meta && out[odoPos].meta.changes) || 0;
    }
    return json({ ok: true, ...res });
  }
  throw new HttpError(404, 'not_found', 'Unbekannter Integrationspfad.');
}
