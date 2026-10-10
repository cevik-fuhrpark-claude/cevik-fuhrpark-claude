// [CLAUDE] Integrations-API für das Unternehmensbetriebssystem und n8n (Bearer-Token aus Cloudflare-Secret)
import { json, readJson, HttpError, nowIso, uuid, normalizeVin, timingSafeEqual, bad } from './util.js';
import { masterPanel } from './agent.js';
import { costReport } from './reports.js';
import { maintenanceOverview } from './maintenance.js';

function checkToken(request, env) {
  if (!env.INTEGRATION_TOKEN) throw new HttpError(503, 'integration_disabled', 'Integrations-API ist nicht aktiviert (Secret INTEGRATION_TOKEN fehlt).');
  const h = request.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!timingSafeEqual(token, env.INTEGRATION_TOKEN)) throw new HttpError(401, 'invalid_token', 'Ungültiges Integrations-Token.');
}

const envParam = (url) => (url.searchParams.get('environment') === 'test' ? 'test' : 'production');

export async function integrationRouter(request, env, ctx, url) {
  checkToken(request, env);
  const p = url.pathname.replace('/api/integration', '');
  const m = request.method;
  if (p === '/v1/vehicles' && m === 'GET') {
    const rows = (await env.DB.prepare(`SELECT v.id, v.vin, v.plate, v.site, v.manufacturer, v.model, v.build_year, v.trailer_plate, v.trailer_vin, v.master_status, v.updated_at
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
    for (const it of items) {
      const ext = String(it.external_id || '').slice(0, 80);
      if (!ext) { res.rejected++; continue; }
      const vin = it.vin ? normalizeVin(it.vin) : null;
      let vehicleId = null; let basis = null;
      const mapped = await env.DB.prepare('SELECT vehicle_id FROM telematics_mappings WHERE provider=? AND external_id=?').bind(provider, ext).first();
      if (mapped) { vehicleId = mapped.vehicle_id; basis = 'confirmed_mapping'; }
      else if (vin) {
        const v = await env.DB.prepare('SELECT id FROM vehicles WHERE vin=?').bind(vin).first();
        if (v) { vehicleId = v.id; basis = 'vin'; }
      }
      const gps = it.gps_time && !Number.isNaN(Date.parse(it.gps_time)) ? new Date(it.gps_time).toISOString() : null;
      const lat = Number.isFinite(Number(it.lat)) && Math.abs(Number(it.lat)) <= 90 ? Number(it.lat) : null;
      const lon = Number.isFinite(Number(it.lon)) && Math.abs(Number(it.lon)) <= 180 ? Number(it.lon) : null;
      const validPos = lat !== null && lon !== null && !(lat === 0 && lon === 0);
      if (!vehicleId) {
        const plate = it.plate ? String(it.plate).toUpperCase().slice(0, 20) : null;
        const cand = plate ? await env.DB.prepare(`SELECT id FROM vehicles WHERE REPLACE(plate,' ','')=REPLACE(?,' ','')`).bind(plate).first() : null;
        await env.DB.prepare(`INSERT INTO telematics_unmatched(provider,external_id,source_plate,source_vin,candidate_vehicle_id,last_seen) VALUES (?,?,?,?,?,?)
          ON CONFLICT(provider,external_id) DO UPDATE SET source_plate=excluded.source_plate, source_vin=excluded.source_vin, candidate_vehicle_id=excluded.candidate_vehicle_id, last_seen=excluded.last_seen`)
          .bind(provider, ext, plate, vin, cand?.id || null, now).run();
        res.unmatched++;
        continue;
      }
      // Keine Rückschritte: ältere GPS-Zeit überschreibt keinen neueren Stand
      const prev = await env.DB.prepare('SELECT gps_time FROM telematics_latest WHERE vehicle_id=? AND provider=?').bind(vehicleId, provider).first();
      if (prev && prev.gps_time && gps && gps < prev.gps_time) { res.rejected++; continue; }
      const km = Number.isFinite(Number(it.km)) && Number(it.km) >= 0 ? Number(it.km) : null;
      await env.DB.prepare(`INSERT INTO telematics_latest(vehicle_id,provider,external_id,match_basis,gps_time,received_at,lat,lon,km,speed,ignition) VALUES (?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(vehicle_id,provider) DO UPDATE SET external_id=excluded.external_id, match_basis=excluded.match_basis, gps_time=excluded.gps_time, received_at=excluded.received_at,
        lat=excluded.lat, lon=excluded.lon, km=excluded.km, speed=excluded.speed, ignition=excluded.ignition`)
        .bind(vehicleId, provider, ext, basis, gps, now, validPos ? lat : null, validPos ? lon : null, km,
          Number.isFinite(Number(it.speed)) ? Number(it.speed) : null, it.ignition === undefined || it.ignition === null ? null : (it.ignition ? 1 : 0)).run();
      if (km !== null && gps) {
        const r = await env.DB.prepare('INSERT OR IGNORE INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at) VALUES (?,?,?,?,?,NULL,?)')
          .bind(uuid(), vehicleId, Math.round(km), gps, `telematik:${provider}`, now).run();
        if (r.meta.changes) res.odometer_written++;
      }
      res.matched++;
    }
    return json({ ok: true, ...res });
  }
  throw new HttpError(404, 'not_found', 'Unbekannter Integrationspfad.');
}
