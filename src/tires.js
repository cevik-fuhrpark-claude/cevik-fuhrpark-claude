// [CLAUDE] Reifenmanagement: Größen je Achse (mit Prüfstatus), Messungen/Wechsel je Position, Grenzwerte
import { nowIso, uuid, bad, forbidden, notFound, str, num, oneOf, normalizeVin } from './util.js';
import { audit } from './auth.js';

export const AXLES = ['lenkachse', 'liftachse', 'antriebsachse', 'anhaenger'];
export const POSITIONS = ['VA-L', 'VA-R', 'LA-L', 'LA-R', 'HA-L-aussen', 'HA-L-innen', 'HA-R-innen', 'HA-R-aussen',
  'AH1-L', 'AH1-R', 'AH2-L', 'AH2-R', 'AH3-L', 'AH3-R', 'Reserve'];
export const TIRE_EVENTS = ['messung', 'wechsel', 'reparatur', 'sichtpruefung'];
// Gesetzliche Mindestprofiltiefe in Deutschland (StVZO § 36) für Lkw-Reifen: 1,6 mm
export const LEGAL_MIN_TREAD_MM = 1.6;

const canWrite = (u) => ['owner', 'fleet', 'workshop'].includes(u.role);
const canMeasure = (u) => ['owner', 'fleet', 'workshop', 'driver'].includes(u.role);

export async function tireOverview(env, user, envName, vehicleId) {
  if (user.role === 'driver') {
    const a = await env.DB.prepare('SELECT 1 FROM driver_vehicles WHERE user_id=? AND vehicle_id=? AND (valid_to IS NULL OR valid_to > ?)').bind(user.id, vehicleId, nowIso()).first();
    if (!a) throw forbidden('Reifendaten nur für zugeordnete Fahrzeuge.');
  }
  const v = await env.DB.prepare('SELECT id, plate FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const specs = (await env.DB.prepare('SELECT * FROM tire_specs WHERE vehicle_id=?').bind(vehicleId).all()).results.sort((a, b) => AXLES.indexOf(a.axle) - AXLES.indexOf(b.axle));
  const history = (await env.DB.prepare(`SELECT t.*, u.display_name AS recorded_by_name FROM tire_events t JOIN users u ON u.id=t.recorded_by
    WHERE t.environment=? AND t.vehicle_id=? ORDER BY t.created_at DESC LIMIT 200`).bind(envName, vehicleId).all()).results;
  const latest = {};
  for (const e of history) {
    const cur = latest[e.position] || {};
    // letzter Messwert je Position; ein Wechsel setzt den Stand zurück
    if (!cur.event) cur.event = e;
    if (cur.tread_mm === undefined && !cur.reset) {
      if (e.tread_mm !== null) { cur.tread_mm = e.tread_mm; cur.tread_at = e.created_at; }
      else if (e.event_type === 'wechsel') cur.reset = true;
    }
    latest[e.position] = cur;
  }
  const warnRow = await env.DB.prepare(`SELECT value FROM settings WHERE key='tire_warn_tread_mm'`).first();
  const warn = warnRow && warnRow.value !== '' ? Number(warnRow.value) : null;
  const positions = Object.entries(latest).map(([position, x]) => ({
    position, last_event: x.event.event_type, last_event_at: x.event.created_at, tread_mm: x.tread_mm ?? null, tread_at: x.tread_at || null,
    status: x.tread_mm === undefined || x.tread_mm === null ? 'unbekannt' : x.tread_mm < LEGAL_MIN_TREAD_MM ? 'unter_minimum' : warn !== null && x.tread_mm < warn ? 'warnung' : 'ok',
  })).sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position));
  return { vehicle: v, specs, positions, history, legal_min_tread_mm: LEGAL_MIN_TREAD_MM, warn_tread_mm: warn };
}

export async function addTireEvent(env, user, envName, vehicleId, body) {
  const type = oneOf(body.event_type, TIRE_EVENTS, 'Art');
  if (!(type === 'messung' || type === 'sichtpruefung' ? canMeasure(user) : canWrite(user))) throw forbidden();
  if (user.role === 'driver') {
    const a = await env.DB.prepare('SELECT 1 FROM driver_vehicles WHERE user_id=? AND vehicle_id=? AND (valid_to IS NULL OR valid_to > ?)').bind(user.id, vehicleId, nowIso()).first();
    if (!a) throw forbidden('Nur für zugeordnete Fahrzeuge.');
  }
  const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const position = oneOf(body.position, POSITIONS, 'Position');
  const tread = num(body.tread_mm, { min: 0, max: 30, field: 'Profiltiefe', nullable: true });
  const pressure = num(body.pressure_bar, { min: 0, max: 15, field: 'Luftdruck', nullable: true });
  if (type === 'messung' && tread === null && pressure === null) throw bad('validation', 'Messung braucht Profiltiefe oder Luftdruck.');
  const size = str(body.size, { max: 40 });
  if (type === 'wechsel' && !size) throw bad('validation', 'Beim Reifenwechsel ist die Reifengröße Pflicht.');
  const dot = str(body.dot, { max: 20 });
  if (dot && !/^[0-9]{4}$/.test(dot.replace(/\s/g, '').slice(-4))) throw bad('validation', 'DOT: letzte 4 Ziffern = Woche und Jahr (z. B. 2324).');
  const caseId = body.case_id ? str(body.case_id, { max: 40 }) : null;
  if (caseId) {
    const c = await env.DB.prepare('SELECT id FROM cases WHERE id=? AND environment=? AND vehicle_id=?').bind(caseId, envName, vehicleId).first();
    if (!c) throw bad('validation', 'Vorgang passt nicht zu diesem Fahrzeug.');
  }
  const odo = body.odometer_km === undefined || body.odometer_km === null || body.odometer_km === '' ? null : Math.round(num(body.odometer_km, { min: 0, max: 5000000, field: 'Kilometerstand' }));
  const id = uuid();
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO tire_events(id,environment,vehicle_id,position,event_type,tread_mm,pressure_bar,size,brand,dot,odometer_km,case_id,note,recorded_by,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, envName, vehicleId, position, type, tread, pressure, size, str(body.brand, { max: 60 }), dot, odo, caseId,
    str(body.note, { max: 1000 }), user.id, now).run();
  const warnings = [];
  if (tread !== null && tread < LEGAL_MIN_TREAD_MM) warnings.push(`Profiltiefe ${tread} mm liegt unter dem gesetzlichen Minimum von ${LEGAL_MIN_TREAD_MM} mm.`);
  return { id, warnings };
}

export async function setTireSpec(env, user, vehicleId, body) {
  if (!canWrite(user)) throw forbidden();
  const axle = oneOf(body.axle, AXLES, 'Achse');
  const size = str(body.size, { required: true, max: 40, field: 'Reifengröße' });
  const verified = body.verified ? 1 : 0;
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO tire_specs(vehicle_id,axle,size,source,verified,verified_by,verified_at,updated_at) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(vehicle_id,axle) DO UPDATE SET size=excluded.size, source=excluded.source, verified=excluded.verified, verified_by=excluded.verified_by, verified_at=excluded.verified_at, updated_at=excluded.updated_at`)
    .bind(vehicleId, axle, size, str(body.source, { max: 200 }) || (verified ? `am Fahrzeug geprüft (${user.username})` : `manuell (${user.username})`),
      verified, verified ? user.id : null, verified ? now : null, now).run();
  return { ok: true };
}

// Import Quelldatei (CSV: Quelle;Kennzeichen;FIN;Reifen Lenkachse;Reifen Liftachse;Reifen Antriebsachse;Reifen Anhänger)
// Nur FIN-Treffer werden übernommen; bereits geprüfte Werte werden nicht überschrieben.
export async function importTireSpecs(env, user, text) {
  if (user.role !== 'owner') throw forbidden('Nur der Inhaber darf importieren.');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const head = lines.shift().split(';').map((h) => h.trim().toLowerCase());
  const idx = (n) => head.findIndex((h) => h.startsWith(n));
  const ci = { src: idx('quelle'), fin: idx('fin'), lenk: idx('reifen lenk'), lift: idx('reifen lift'), antr: idx('reifen antrieb'), anh: idx('reifen anh') };
  if (ci.fin < 0) throw bad('validation', 'Spalte FIN fehlt.');
  const res = { imported: 0, skipped_no_vehicle: [], kept_verified: 0 };
  // Abfragebudget: Fahrzeuge und geprüfte Werte vorab laden, Schreibvorgang als Sammelanweisung
  const byVin = new Map((await env.DB.prepare('SELECT id, vin FROM vehicles').all()).results.map((v) => [v.vin, v.id]));
  const verified = new Set((await env.DB.prepare('SELECT vehicle_id, axle FROM tire_specs WHERE verified=1').all()).results.map((r) => `${r.vehicle_id}|${r.axle}`));
  const rows = new Map();
  for (const line of lines) {
    const c = line.split(';').map((x) => x.trim());
    const vin = normalizeVin(c[ci.fin]);
    const vid = byVin.get(vin);
    if (!vid) { res.skipped_no_vehicle.push(vin || '(leer)'); continue; }
    for (const [axle, k] of [['lenkachse', 'lenk'], ['liftachse', 'lift'], ['antriebsachse', 'antr'], ['anhaenger', 'anh']]) {
      const size = ci[k] >= 0 ? c[ci[k]] : '';
      if (!size || !/\d/.test(size)) continue;
      if (verified.has(`${vid}|${axle}`)) { res.kept_verified++; continue; }
      rows.set(`${vid}|${axle}`, { v: vid, a: axle, s: size.slice(0, 40), src: `Quelldatei Fuhrpark ${ci.src >= 0 ? c[ci.src] : ''} (ungeprüft)`.trim() });
    }
  }
  const list = [...rows.values()];
  const stmts = [];
  for (let i = 0; i < list.length; i += 400) {
    stmts.push(env.DB.prepare(`INSERT INTO tire_specs(vehicle_id,axle,size,source,verified,updated_at)
      SELECT json_extract(value,'$.v'), json_extract(value,'$.a'), json_extract(value,'$.s'), json_extract(value,'$.src'), 0, ?1 FROM json_each(?2) WHERE 1
      ON CONFLICT(vehicle_id,axle) DO UPDATE SET size=excluded.size, source=excluded.source, updated_at=excluded.updated_at WHERE tire_specs.verified=0`)
      .bind(nowIso(), JSON.stringify(list.slice(i, i + 400))));
  }
  if (stmts.length) await env.DB.batch(stmts);
  res.imported = list.length;
  await audit(env, user.id, 'tires.import', null, { imported: res.imported });
  return res;
}

// Für den Fuhrparkagenten: letzte Profilmessung je Position unter Grenzwert
export async function tireFindings(env, environment) {
  const warnRow = await env.DB.prepare(`SELECT value FROM settings WHERE key='tire_warn_tread_mm'`).first();
  const warn = warnRow && warnRow.value !== '' ? Number(warnRow.value) : null;
  const rows = (await env.DB.prepare(`SELECT t.vehicle_id, t.position, t.tread_mm, t.created_at, v.plate FROM tire_events t JOIN vehicles v ON v.id=t.vehicle_id
    WHERE t.environment=? AND t.created_at = (SELECT MAX(t2.created_at) FROM tire_events t2 WHERE t2.environment=t.environment AND t2.vehicle_id=t.vehicle_id AND t2.position=t.position)`)
    .bind(environment).all()).results;
  const out = [];
  for (const r of rows) {
    if (r.tread_mm === null) continue;
    if (r.tread_mm < LEGAL_MIN_TREAD_MM) out.push({ severity: 'kritisch', ...r, limit: LEGAL_MIN_TREAD_MM });
    else if (warn !== null && r.tread_mm < warn) out.push({ severity: 'hinweis', ...r, limit: warn });
  }
  return out;
}
