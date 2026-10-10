// [CLAUDE] Fahrzeugakten, Fahrerzuordnung, Wartung/Prüftermine, Kilometerstände
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, num, oneOf, normalizeVin, isValidVin, addMonths, berlinDate } from './util.js';
import { audit } from './auth.js';
import { vehicleCosts, sniffType, VEHICLE_DOC_READ } from './cases.js';
import { sha256Hex } from './util.js';

const isManager = (u) => u.role === 'owner' || u.role === 'fleet';
const normPlate = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');
export const MAINT_KINDS = ['HU', 'SP', 'UVV', 'Tachograph', 'Ölwechsel', 'Inspektion', 'Bremsen', 'Reifen', 'Hydraulik/Aufbau', 'Sonstiges'];

export async function listVehicles(env, user, envName, query = {}) {
  const active = query.inactive === '1' && isManager(user) ? 0 : 1;
  const rows = (await env.DB.prepare(`SELECT v.*,
      (SELECT COUNT(*) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS open_cases,
      (SELECT MAX(c.safety_lock) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS locked,
      (SELECT COUNT(*) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status IN ('werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle')) AS in_workshop,
      (SELECT km FROM odometer_readings o WHERE o.vehicle_id=v.id ORDER BY measured_at DESC LIMIT 1) AS last_km,
      (SELECT MIN(next_due_date) FROM maintenance_rules m WHERE m.vehicle_id=v.id AND m.next_due_date IS NOT NULL) AS next_due
    FROM vehicles v WHERE v.active=? ORDER BY v.plate`).bind(envName, envName, envName, active).all()).results;
  const byPlate = new Map(rows.map((v) => [normPlate(v.plate), v]));
  const pulledBy = new Map();
  for (const v of rows) if (v.kind === 'lkw' && v.trailer_plate) { const tr = byPlate.get(normPlate(v.trailer_plate)); if (tr && tr.kind === 'anhaenger') pulledBy.set(tr.id, v); }
  let list = rows.map((v) => ({
    ...v,
    trailer_id: v.kind === 'lkw' && v.trailer_plate && byPlate.get(normPlate(v.trailer_plate))?.kind === 'anhaenger' ? byPlate.get(normPlate(v.trailer_plate)).id : null,
    truck_id: pulledBy.get(v.id)?.id || null, truck_plate: pulledBy.get(v.id)?.plate || null,
    availability: v.locked ? 'gesperrt' : v.in_workshop ? 'werkstatt' : v.open_cases ? 'meldung_offen' : 'einsatzbereit_lt_system',
  }));
  if (user.role === 'driver') {
    const assigned = (await env.DB.prepare(`SELECT vehicle_id FROM driver_vehicles WHERE user_id=? AND (valid_to IS NULL OR valid_to > ?)`).bind(user.id, nowIso()).all()).results.map((r) => r.vehicle_id);
    list = list.map((v) => ({ id: v.id, plate: v.plate, kind: v.kind, site: v.site, manufacturer: v.manufacturer, trailer_plate: v.trailer_plate, truck_plate: v.truck_plate, assigned: assigned.includes(v.id), availability: v.availability }));
    list.sort((a, b) => (b.assigned - a.assigned) || a.plate.localeCompare(b.plate));
  }
  return list;
}

export async function vehicleDetail(env, user, envName, vehicleId) {
  if (user.role === 'driver') throw forbidden('Fahrzeugakten sind für Fahrer nicht freigegeben.');
  const v = await env.DB.prepare('SELECT * FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound('Fahrzeug nicht gefunden.');
  let caseRows = (await env.DB.prepare(`SELECT id, case_no, status, priority, description, created_at, closed_at, workshop_site, origin, parent_case_id, safety_lock
    FROM cases WHERE vehicle_id=? AND environment=? ORDER BY created_at DESC`).bind(vehicleId, envName).all()).results;
  if (user.role === 'workshop') caseRows = caseRows.filter((c) => c.workshop_site === user.workshop_site && c.status !== 'gemeldet');
  const inspections = (await env.DB.prepare(`SELECT i.id, i.kind, i.result, i.odometer_km, i.created_at, i.case_id, u.display_name AS performed_by_name
    FROM inspections i JOIN users u ON u.id=i.performed_by WHERE i.vehicle_id=? AND i.environment=? ORDER BY i.created_at DESC LIMIT 50`).bind(vehicleId, envName).all()).results;
  const maintenance = (await env.DB.prepare('SELECT * FROM maintenance_rules WHERE vehicle_id=? ORDER BY next_due_date IS NULL, next_due_date').bind(vehicleId).all()).results;
  const maintenanceHistory = (await env.DB.prepare(`SELECT e.rule_id, e.kind, e.done_date, e.done_km, e.evidence, e.source, e.created_at, u.display_name AS recorded_by_name
    FROM maintenance_events e LEFT JOIN users u ON u.id=e.recorded_by WHERE e.vehicle_id=? ORDER BY e.done_date DESC LIMIT 200`).bind(vehicleId).all()).results;
  const odometer = (await env.DB.prepare('SELECT km, measured_at, source, note FROM odometer_readings WHERE vehicle_id=? ORDER BY measured_at DESC LIMIT 20').bind(vehicleId).all()).results;
  const drivers = isManager(user) || user.role === 'dispatch'
    ? (await env.DB.prepare(`SELECT d.id, d.valid_from, d.valid_to, d.evidence, u.display_name, u.id AS user_id FROM driver_vehicles d JOIN users u ON u.id=d.user_id
        WHERE d.vehicle_id=? AND u.environment=? ORDER BY d.valid_from DESC`).bind(vehicleId, envName).all()).results
    : [];
  // Kopplung Lkw ↔ Anhänger laut Stammliste (Spalte „Anhänger Kennzeichen“ des Lkw)
  const all = (await env.DB.prepare('SELECT id, plate, kind, trailer_plate FROM vehicles WHERE active=1').all()).results;
  const coupled = v.kind === 'anhaenger'
    ? all.filter((x) => x.kind === 'lkw' && x.trailer_plate && normPlate(x.trailer_plate) === normPlate(v.plate)).map((x) => ({ id: x.id, plate: x.plate, kind: 'lkw' }))
    : all.filter((x) => x.kind === 'anhaenger' && v.trailer_plate && normPlate(x.plate) === normPlate(v.trailer_plate)).map((x) => ({ id: x.id, plate: x.plate, kind: 'anhaenger' }));
  const documents = VEHICLE_DOC_READ.includes(user.role)
    ? (await env.DB.prepare(`SELECT f.id, f.filename, f.content_type, f.size, f.doc_kind, f.doc_note, f.doc_valid_until, f.created_at, u.display_name AS uploaded_by_name FROM files f JOIN users u ON u.id=f.uploaded_by
        WHERE f.vehicle_id=? AND f.case_id IS NULL AND f.environment=? ORDER BY f.created_at DESC`).bind(vehicleId, envName).all()).results
    : [];
  // Letzter Telematik-Stand (nur Inhaber, Fuhrparkleitung, Disposition – Positionsdaten sind über die Fahrerzuordnung personenbeziehbar)
  const telematics = isManager(user) || user.role === 'dispatch'
    ? (await env.DB.prepare('SELECT provider, match_basis, gps_time, received_at, lat, lon, km, speed, ignition FROM telematics_latest WHERE vehicle_id=? ORDER BY gps_time DESC').bind(vehicleId).all()).results
    : [];
  const out = { vehicle: v, telematics, cases: caseRows, inspections, maintenance, maintenance_history: maintenanceHistory, odometer, drivers, coupled, documents };
  if (isManager(user)) {
    out.costs = await vehicleCosts(env, envName, vehicleId);
  }
  return out;
}

// Zeitleiste der Fahrzeugakte: alle gespeicherten Ereignisse chronologisch (nur vorhandene Daten, gleiche Rechte wie die Akte)
export const TIMELINE_TYPES = ['case', 'case_closed', 'inspection', 'odometer', 'driver_from', 'driver_to', 'document', 'tire', 'maintenance', 'fine'];
export async function vehicleTimeline(env, user, envName, vehicleId, query = {}) {
  const d = await vehicleDetail(env, user, envName, vehicleId);
  const want = new Set(String(query.types || '').split(',').filter((x) => TIMELINE_TYPES.includes(x)));
  const limit = Math.min(Math.max(Number(query.limit) || 300, 1), 1000);
  const items = [];
  const add = (type, at, data) => { if (at && (!want.size || want.has(type))) items.push({ type, at, ...data }); };
  for (const c of d.cases) {
    add('case', c.created_at, { case_id: c.id, case_no: c.case_no, priority: c.priority, status: c.status, text: c.description.slice(0, 140), origin: c.origin });
    if (c.closed_at) add('case_closed', c.closed_at, { case_id: c.id, case_no: c.case_no, status: c.status });
  }
  for (const i of d.inspections) add('inspection', i.created_at, { inspection_kind: i.kind, result: i.result, km: i.odometer_km, case_id: i.case_id, by: i.performed_by_name });
  for (const o of d.odometer) add('odometer', o.measured_at, { km: o.km, source: o.source, note: o.note });
  for (const r of d.drivers) { add('driver_from', r.valid_from, { by: r.display_name, evidence: r.evidence }); add('driver_to', r.valid_to, { by: r.display_name }); }
  for (const f of d.documents) add('document', f.created_at, { doc_kind: f.doc_kind, text: f.filename, file_id: f.id, valid_until: f.doc_valid_until });
  for (const m of d.maintenance_history) add('maintenance', m.done_date, { maintenance_kind: m.kind, km: m.done_km, evidence: m.evidence, by: m.recorded_by_name });
  if (user.role !== 'driver') {
    const tires = (await env.DB.prepare(`SELECT created_at, position, event_type, tread_mm, odometer_km, case_id FROM tire_events WHERE vehicle_id=? AND environment=? ORDER BY created_at DESC LIMIT 300`)
      .bind(vehicleId, envName).all()).results;
    for (const t of tires) add('tire', t.created_at, { position: t.position, tire_event: t.event_type, tread_mm: t.tread_mm, km: t.odometer_km, case_id: t.case_id });
  }
  if (isManager(user)) {
    const fines = (await env.DB.prepare(`SELECT id, fine_no, kind, offense_type, offense_at, status FROM fines WHERE vehicle_id=? AND environment=? ORDER BY offense_at DESC LIMIT 200`)
      .bind(vehicleId, envName).all()).results;
    for (const f of fines) add('fine', f.offense_at, { fine_id: f.id, fine_no: f.fine_no, fine_kind: f.kind, offense_type: f.offense_type, status: f.status });
  }
  // Datum ohne Uhrzeit (z. B. Prüfung „erledigt am“) als Tagesmitte einsortieren
  const key = (x) => (x.at.length === 10 ? x.at + 'T12:00:00.000Z' : x.at);
  items.sort((a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0));
  return { vehicle: { id: d.vehicle.id, plate: d.vehicle.plate, kind: d.vehicle.kind }, types: TIMELINE_TYPES, total: items.length, items: items.slice(0, limit) };
}

// Prüft und normalisiert einen Stammdatensatz (gemeinsam für Einzelpflege und Import)
function vehicleRow(user, body) {
  const vin = normalizeVin(body.vin);
  if (!isValidVin(vin)) throw bad('validation', 'FIN muss 17 Zeichen haben (ohne I, O, Q).');
  const plate = str(body.plate, { required: true, max: 20, field: 'Kennzeichen' }).toUpperCase();
  return {
    id: `VIN:${vin}`, vin, plate, site: str(body.site, { max: 60 }), manufacturer: str(body.manufacturer, { max: 60 }), model: str(body.model, { max: 60 }),
    build_year: body.build_year ? Math.round(num(body.build_year, { min: 1950, max: 2100, field: 'Baujahr' })) : null,
    trailer_plate: str(body.trailer_plate, { max: 20 }), trailer_vin: body.trailer_vin ? normalizeVin(body.trailer_vin) : null,
    master_status: str(body.master_status, { max: 40 }), source: str(body.source, { max: 200 }) || `manuell durch ${user.username}`,
    kind: normalizeVehicleKind(body.kind),
  };
}

// Fahrzeugart: Lkw (Zugmaschine/Motorwagen) oder Anhänger; Werte wie auf Prüfrechnungen (KFZ/ANH) werden verstanden. null = unverändert lassen
export function normalizeVehicleKind(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (['anhaenger', 'anhänger', 'anh', 'trailer', 'auflieger', 'sattelauflieger'].includes(s)) return 'anhaenger';
  if (['lkw', 'kfz', 'truck', 'zugmaschine', 'motorwagen'].includes(s)) return 'lkw';
  throw bad('validation', `Fahrzeugart unbekannt: ${raw} (Lkw oder Anhänger)`);
}

// Sammel-Upsert über json_each: eine Anweisung je 400 Fahrzeuge (Abfragebudget je Aufruf)
async function upsertVehicleRows(env, rows) {
  const now = nowIso();
  if (rows.some((r) => !r.kind)) {
    const known = new Map((await env.DB.prepare('SELECT id, kind FROM vehicles').all()).results.map((v) => [v.id, v.kind]));
    for (const r of rows) if (!r.kind) r.kind = known.get(r.id) || 'lkw';
  }
  const J = (k) => `json_extract(value,'$.${k}')`;
  const stmts = [];
  for (let i = 0; i < rows.length; i += 400) {
    stmts.push(env.DB.prepare(`INSERT INTO vehicles(id,vin,plate,site,manufacturer,model,build_year,trailer_plate,trailer_vin,master_status,source,kind,active,created_at,updated_at)
      SELECT ${J('id')}, ${J('vin')}, ${J('plate')}, ${J('site')}, ${J('manufacturer')}, ${J('model')}, ${J('build_year')}, ${J('trailer_plate')}, ${J('trailer_vin')}, ${J('master_status')}, ${J('source')}, ${J('kind')}, 1, ?1, ?1
      FROM json_each(?2) WHERE 1
      ON CONFLICT(id) DO UPDATE SET plate=excluded.plate, site=excluded.site, manufacturer=excluded.manufacturer, model=excluded.model, build_year=excluded.build_year,
        trailer_plate=excluded.trailer_plate, trailer_vin=excluded.trailer_vin, master_status=excluded.master_status, source=excluded.source, kind=excluded.kind, active=1, updated_at=excluded.updated_at`)
      .bind(now, JSON.stringify(rows.slice(i, i + 400))));
  }
  if (stmts.length) await env.DB.batch(stmts);
}

export async function upsertVehicle(env, user, body) {
  if (!isManager(user)) throw forbidden();
  const row = vehicleRow(user, body);
  await upsertVehicleRows(env, [row]);
  await audit(env, user.id, 'vehicle.upsert', row.id, { plate: row.plate });
  return { id: row.id };
}

// Fahrzeug außer Betrieb nehmen (verkauft, abgemeldet): bleibt mit Historie erhalten, erscheint nicht mehr in Listen/Agent
// Ruhend: im Bestand, aber aus allen Auswertungen (Kosten, Kennzahlen, Prüf-/Reifen-/Dokumentbefunde) herausgenommen
export async function setVehicleEvaluation(env, user, envName, vehicleId, body) {
  if (!isManager(user)) throw forbidden();
  const v = await env.DB.prepare('SELECT id, plate FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const excluded = body.excluded === true || body.excluded === 1;
  const reason = str(body.reason, { required: excluded, max: 300, field: 'Grund' });
  await env.DB.prepare('UPDATE vehicles SET eval_excluded=?, eval_excluded_reason=?, updated_at=? WHERE id=?').bind(excluded ? 1 : 0, excluded ? reason : null, nowIso(), vehicleId).run();
  await audit(env, user.id, excluded ? 'vehicle.eval_exclude' : 'vehicle.eval_include', vehicleId, { plate: v.plate, reason });
  return { ok: true, excluded };
}

export async function setVehicleActive(env, user, envName, vehicleId, body) {
  if (!isManager(user)) throw forbidden();
  const v = await env.DB.prepare('SELECT id, plate, active FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const active = body.active === true || body.active === 1;
  const reason = str(body.reason, { required: !active, max: 300, field: 'Grund' });
  if (!active) {
    const open = await env.DB.prepare(`SELECT COUNT(*) AS n FROM cases WHERE vehicle_id=? AND status NOT IN ('fahrzeug_freigegeben','abgelehnt')`).bind(vehicleId).first();
    if (open.n) throw conflict('open_cases', `Fahrzeug hat noch ${open.n} offene Vorgänge (alle Umgebungen) – zuerst abschließen.`);
  }
  await env.DB.prepare('UPDATE vehicles SET active=?, updated_at=? WHERE id=?').bind(active ? 1 : 0, nowIso(), vehicleId).run();
  await audit(env, user.id, active ? 'vehicle.activate' : 'vehicle.deactivate', vehicleId, { plate: v.plate, reason });
  return { ok: true, active };
}

export async function assignDriver(env, user, envName, vehicleId, body) {
  if (!isManager(user)) throw forbidden();
  const driver = await env.DB.prepare(`SELECT id, display_name FROM users WHERE id=? AND role='driver' AND environment=?`).bind(str(body.user_id, { required: true, max: 40 }), envName).first();
  if (!driver) throw bad('validation', 'Fahrer nicht gefunden (gleiche Umgebung erforderlich).');
  const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const now = nowIso();
  const open = (await env.DB.prepare(`SELECT d.id, d.vehicle_id, v.plate FROM driver_vehicles d JOIN vehicles v ON v.id=d.vehicle_id WHERE d.user_id=? AND (d.valid_to IS NULL OR d.valid_to > ?)`)
    .bind(driver.id, now).all()).results;
  if (open.some((o) => o.vehicle_id === vehicleId)) throw conflict('already_assigned', `${driver.display_name} ist diesem Fahrzeug bereits zugeordnet.`);
  // Fahrzeugwechsel: bisherige offene Zuordnungen des Fahrers beenden, wenn ausdrücklich gewünscht
  const endPrev = body.end_previous === true || body.end_previous === 'on' || body.end_previous === '1';
  const id = uuid();
  const stmts = [];
  if (endPrev && open.length) stmts.push(env.DB.prepare('UPDATE driver_vehicles SET valid_to=? WHERE user_id=? AND (valid_to IS NULL OR valid_to > ?)').bind(now, driver.id, now));
  stmts.push(env.DB.prepare(`INSERT INTO driver_vehicles(id,user_id,vehicle_id,valid_from,valid_to,evidence,created_by,created_at) VALUES (?,?,?,?,NULL,?,?,?)`)
    .bind(id, driver.id, vehicleId, now, str(body.evidence, { max: 300 }) || 'Zuordnung durch Fuhrparkleitung', user.id, now));
  await env.DB.batch(stmts);
  await audit(env, user.id, 'vehicle.assign_driver', vehicleId, { driver: driver.id, ended_previous: endPrev ? open.map((o) => o.plate) : [] });
  return { id, ended_previous: endPrev ? open.map((o) => o.plate) : [], other_open: endPrev ? [] : open.map((o) => o.plate) };
}

export async function endAssignment(env, user, envName, assignmentId) {
  if (!isManager(user)) throw forbidden();
  // nur Zuordnungen von Fahrern der eigenen Umgebung (Test/Betrieb getrennt)
  const r = await env.DB.prepare(`UPDATE driver_vehicles SET valid_to=? WHERE id=? AND valid_to IS NULL AND user_id IN (SELECT id FROM users WHERE environment=?)`).bind(nowIso(), assignmentId, envName).run();
  if (!r.meta.changes) throw notFound('Zuordnung nicht gefunden oder bereits beendet.');
  await audit(env, user.id, 'vehicle.end_assignment', assignmentId, null);
  return { ok: true };
}

// „Mein Fahrzeug“ für Fahrer: zugeordnete Fahrzeuge mit eigenen offenen Meldungen, Sperrstatus, nächsten Prüfterminen und letztem km-Stand
export async function myVehicles(env, user, envName) {
  if (user.role !== 'driver') throw forbidden();
  const now = nowIso();
  const vs = (await env.DB.prepare(`SELECT v.id, v.plate, v.kind, v.site, v.manufacturer, v.model, v.trailer_plate, d.valid_from FROM driver_vehicles d JOIN vehicles v ON v.id=d.vehicle_id
    WHERE d.user_id=? AND (d.valid_to IS NULL OR d.valid_to > ?) AND v.active=1 ORDER BY d.valid_from DESC`).bind(user.id, now).all()).results;
  if (!vs.length) return { vehicles: [] };
  const ids = JSON.stringify(vs.map((v) => v.id));
  const [locks, mine, rules, kms] = await Promise.all([
    env.DB.prepare(`SELECT vehicle_id, MAX(safety_lock) AS locked, COUNT(*) AS open FROM cases WHERE environment=? AND vehicle_id IN (SELECT value FROM json_each(?))
      AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') GROUP BY vehicle_id`).bind(envName, ids).all(),
    env.DB.prepare(`SELECT id, case_no, vehicle_id, status, priority, description, created_at FROM cases WHERE environment=? AND reporter_id=? AND vehicle_id IN (SELECT value FROM json_each(?))
      AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') ORDER BY created_at DESC`).bind(envName, user.id, ids).all(),
    env.DB.prepare(`SELECT vehicle_id, kind, next_due_date FROM maintenance_rules WHERE vehicle_id IN (SELECT value FROM json_each(?)) AND next_due_date IS NOT NULL ORDER BY next_due_date`).bind(ids).all(),
    env.DB.prepare(`SELECT o.vehicle_id, o.km, o.measured_at FROM odometer_readings o WHERE o.vehicle_id IN (SELECT value FROM json_each(?1))
      AND o.measured_at = (SELECT MAX(o2.measured_at) FROM odometer_readings o2 WHERE o2.vehicle_id=o.vehicle_id)`).bind(ids).all(),
  ]);
  const lockMap = new Map(locks.results.map((r) => [r.vehicle_id, r]));
  const kmMap = new Map(kms.results.map((r) => [r.vehicle_id, r]));
  return {
    vehicles: vs.map((v) => ({
      ...v, locked: !!(lockMap.get(v.id) || {}).locked, open_cases_total: (lockMap.get(v.id) || {}).open || 0,
      my_open_cases: mine.results.filter((c) => c.vehicle_id === v.id),
      next_inspections: rules.results.filter((r) => r.vehicle_id === v.id).slice(0, 4).map(({ kind, next_due_date }) => ({ kind, next_due_date })),
      last_km: kmMap.get(v.id) || null,
    })),
  };
}

// Historie: jede Durchführung als eigener Eintrag (gleiche Regel + gleiches Datum nur einmal)
export function maintEventStmt(env, e) {
  return env.DB.prepare(`INSERT INTO maintenance_events(id,rule_id,vehicle_id,kind,done_date,done_km,evidence,source,recorded_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(rule_id, done_date) DO UPDATE SET done_km=COALESCE(excluded.done_km, maintenance_events.done_km), evidence=excluded.evidence`)
    .bind(uuid(), e.rule_id, e.vehicle_id, e.kind, e.done_date, e.done_km ?? null, e.evidence, e.source, e.user_id ?? null, nowIso());
}

export async function addMaintenanceRule(env, user, vehicleId, body) {
  if (!isManager(user) && user.role !== 'workshop') throw forbidden();
  const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const kind = oneOf(body.kind, MAINT_KINDS, 'Art');
  const evidence = str(body.evidence, { required: true, max: 300, field: 'Nachweis/Quelle' });
  const months = body.interval_months ? Math.round(num(body.interval_months, { min: 1, max: 120, field: 'Intervall Monate' })) : null;
  const km = body.interval_km ? Math.round(num(body.interval_km, { min: 100, max: 1000000, field: 'Intervall km' })) : null;
  const lastDate = str(body.last_done_date, { max: 10 });
  const lastKm = body.last_done_km ? Math.round(num(body.last_done_km, { min: 0, max: 5000000, field: 'km' })) : null;
  let nextDue = str(body.next_due_date, { max: 10 });
  if (!nextDue && lastDate && months) nextDue = addMonths(lastDate, months);
  for (const d of [lastDate, nextDue]) if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
  const id = uuid();
  const now = nowIso();
  const stmts = [env.DB.prepare(`INSERT INTO maintenance_rules(id,vehicle_id,kind,interval_months,interval_km,last_done_date,last_done_km,next_due_date,evidence,created_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, vehicleId, kind, months, km, lastDate, lastKm, nextDue, evidence, user.id, now, now)];
  if (lastDate) stmts.push(maintEventStmt(env, { rule_id: id, vehicle_id: vehicleId, kind, done_date: lastDate, done_km: lastKm, evidence, source: 'erfasst', user_id: user.id }));
  await env.DB.batch(stmts);
  return { id, next_due_date: nextDue };
}

export async function completeMaintenance(env, user, ruleId, body) {
  if (!isManager(user) && user.role !== 'workshop') throw forbidden();
  const r = await env.DB.prepare('SELECT * FROM maintenance_rules WHERE id=?').bind(ruleId).first();
  if (!r) throw notFound();
  const date = str(body.done_date, { required: true, max: 10, field: 'Datum' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
  const evidence = str(body.evidence, { required: true, max: 300, field: 'Nachweis' });
  const km = body.done_km ? Math.round(num(body.done_km, { min: 0, max: 5000000, field: 'km' })) : null;
  if (r.interval_km && km === null) throw bad('validation', 'Kilometerstand bei Durchführung angeben – diese Prüfung hat ein Kilometer-Intervall.');
  const next = str(body.next_due_date, { max: 10 }) || (r.interval_months ? addMonths(date, r.interval_months) : null);
  await env.DB.batch([
    env.DB.prepare('UPDATE maintenance_rules SET last_done_date=?, last_done_km=?, next_due_date=?, evidence=?, updated_at=? WHERE id=?').bind(date, km, next, evidence, nowIso(), ruleId),
    maintEventStmt(env, { rule_id: ruleId, vehicle_id: r.vehicle_id, kind: r.kind, done_date: date, done_km: km, evidence, source: 'erledigt', user_id: user.id }),
  ]);
  if (km !== null) {
    await env.DB.prepare('INSERT OR IGNORE INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(uuid(), r.vehicle_id, km, `${date}T12:00:00.000Z`, `wartung:${r.kind}`, user.id, nowIso()).run();
  }
  return { ok: true, next_due_date: next };
}

export async function addOdometer(env, user, vehicleId, body) {
  if (!['owner', 'fleet', 'workshop', 'driver', 'dispatch'].includes(user.role)) throw forbidden();
  const km = Math.round(num(body.km, { min: 0, max: 5000000, field: 'Kilometerstand' }));
  // Ablesedatum optional (nachträgliche Erfassung), nie in der Zukunft; ohne Datum = jetzt
  const now = nowIso();
  let measuredAt = now;
  if (body.measured_on) {
    const d = String(body.measured_on);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)) || d < '2000-01-01') throw bad('validation', 'Ablesedatum ungültig (JJJJ-MM-TT).');
    const today = berlinDate();
    if (d > today) throw bad('validation', 'Ablesedatum darf nicht in der Zukunft liegen.');
    if (d < today) measuredAt = `${d}T12:00:00.000Z`;
  }
  const note = str(body.note, { max: 300 });
  const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound('Fahrzeug nicht gefunden.');
  // Plausibilität gegen die zeitlich benachbarten Werte: davor nicht größer, danach nicht kleiner – sonst nur mit Begründung
  const [prev, next] = await Promise.all([
    env.DB.prepare('SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? AND measured_at <= ? ORDER BY measured_at DESC LIMIT 1').bind(vehicleId, measuredAt).first(),
    env.DB.prepare('SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? AND measured_at > ? ORDER BY measured_at ASC LIMIT 1').bind(vehicleId, measuredAt).first(),
  ]);
  const problems = [];
  const de = (iso) => iso.slice(0, 10).split('-').reverse().join('.');
  if (prev && km < prev.km) problems.push(`kleiner als ${prev.km} km vom ${de(prev.measured_at)}`);
  if (next && km > next.km) problems.push(`größer als ${next.km} km vom ${de(next.measured_at)}`);
  if (problems.length && !note) {
    throw conflict('km_not_plausible', `Kilometerstand ${km} km ist ${problems.join(' und ')}. Bitte prüfen oder Begründung angeben (z. B. Tachotausch).`, { previous: prev, next });
  }
  try {
    await env.DB.prepare('INSERT INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at,note) VALUES (?,?,?,?,?,?,?,?)')
      .bind(uuid(), vehicleId, km, measuredAt, `manuell:${user.role}`, user.id, now, note).run();
  } catch (e) {
    if (/UNIQUE/i.test(String(e && e.message))) throw conflict('km_duplicate', 'Für diesen Tag ist bereits ein Kilometerstand von dieser Rolle erfasst.');
    throw e;
  }
  return { ok: true, measured_at: measuredAt, warning: problems.length ? `Abweichung mit Begründung gespeichert: ${problems.join(' und ')}.` : null };
}

// Stammdatenimport (CSV mit Kopfzeile: Kennzeichen;Standort;Status;Hersteller;Baujahr;FIN;Anhänger)
export async function importVehiclesCsv(env, user, text) {
  if (user.role !== 'owner') throw forbidden('Nur der Inhaber darf Stammdaten importieren.');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw bad('validation', 'CSV leer.');
  const sep = lines[0].includes(';') ? ';' : ',';
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const col = (names) => head.findIndex((h) => names.some((n) => h.startsWith(n)));
  const ci = { plate: col(['kennzeichen']), site: col(['standort']), status: col(['status']), man: col(['hersteller']), year: col(['baujahr']), vin: col(['fin']), trailer: col(['anhänger', 'anhaenger']), kind: col(['fahrzeugart', 'art']), src: col(['quelle', 'nachweis']) };
  if (ci.plate < 0 || ci.vin < 0) throw bad('validation', 'Spalten Kennzeichen und FIN erforderlich.');
  if (head.some((h) => h.startsWith('reifen') || h === 'art' || h.startsWith('letzte'))) throw bad('wrong_file', 'Das ist keine Fahrzeugstamm-Datei (Reifen- oder Prüfterminspalten erkannt). Bitte im passenden Importfeld hochladen.');
  const result = { imported: 0, skipped: [] };
  const rows = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split(sep).map((c) => c.trim());
    const vin = normalizeVin(cells[ci.vin]);
    if (!isValidVin(vin)) { result.skipped.push({ plate: cells[ci.plate], reason: 'FIN ungültig/fehlt' }); continue; }
    try {
      const row = vehicleRow(user, {
        vin, plate: cells[ci.plate], site: ci.site >= 0 ? cells[ci.site] : null, master_status: ci.status >= 0 ? cells[ci.status] : null,
        manufacturer: ci.man >= 0 ? cells[ci.man] : null, build_year: ci.year >= 0 && /^\d{4}(\.0+)?$/.test(cells[ci.year]) ? parseInt(cells[ci.year], 10) : null,
        trailer_plate: ci.trailer >= 0 ? cells[ci.trailer] : null, kind: ci.kind >= 0 ? cells[ci.kind] : null,
        source: ci.kind >= 0 && ci.src >= 0 && cells[ci.src] ? `CSV-Import: ${cells[ci.src].slice(0, 180)}` : 'CSV-Import Fuhrpark Stammliste',
      });
      rows.set(row.id, row); // doppelte FIN: letzte Zeile gilt
    } catch (e) { result.skipped.push({ plate: cells[ci.plate], reason: e.message }); }
  }
  if (rows.size > 5000) throw bad('validation', 'Maximal 5000 Fahrzeuge je Import.');
  await upsertVehicleRows(env, [...rows.values()]);
  result.imported = rows.size;
  await audit(env, user.id, 'vehicles.import', null, { imported: result.imported, skipped: result.skipped.length });
  return result;
}

// KI-gestützte Fehleranalyse (Cloudflare Workers AI). Ergebnis ist ein Vorschlag, keine Diagnose/Freigabe.
export async function aiAnalysis(env, user, envName, vehicleId) {
  if (!isManager(user) && user.role !== 'workshop') throw forbidden();
  if (!env.AI) return { available: false, message: 'KI-Analyse ist in dieser Umgebung nicht aktiviert.' };
  const d = await vehicleDetail(env, user, envName, vehicleId);
  const history = d.cases.slice(0, 30).map((c) => `${c.created_at.slice(0, 10)} [${c.priority}/${c.status}] ${c.description.slice(0, 300)}`).join('\n');
  if (!history) return { available: true, suggestion: null, message: 'Keine Vorgänge zu diesem Fahrzeug.' };
  const prompt = `Du unterstützt eine Lkw-Werkstatt (Autotransporter). Analysiere die Schadenshistorie des Fahrzeugs ${d.vehicle.plate} (${d.vehicle.manufacturer || 'Hersteller unbekannt'}, Baujahr ${d.vehicle.build_year || 'unbekannt'}).
Nenne: 1) wiederkehrende Muster, 2) mögliche gemeinsame Ursachen, 3) konkrete Prüfempfehlungen für die nächste Inspektion.
Erfinde keine Daten, Fristen oder Kosten. Kennzeichne Unsicherheit. Antworte knapp auf Deutsch in Stichpunkten.
Historie:\n${history}`;
  const res = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'user', content: prompt }], max_tokens: 600 });
  return { available: true, suggestion: res.response || null, disclaimer: 'KI-Vorschlag – keine technische Diagnose und keine Freigabe. Bitte fachlich prüfen.' };
}

// Dokumentablage je Fahrzeug: PDF/JPG/PNG/WEBP bis 5 MB, max. 30 je Fahrzeug und Umgebung, Dubletten (SHA-256) werden erkannt
export const DOC_KINDS = ['zulassung', 'pruefbericht', 'rechnung', 'versicherung', 'leasing', 'foto', 'sonstiges'];
const MAX_VEHICLE_DOCS = 30;
export async function uploadVehicleDocument(env, user, envName, vehicleId, request, query = {}) {
  if (!['owner', 'fleet', 'workshop'].includes(user.role)) throw forbidden();
  const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const kind = oneOf(query.kind || 'sonstiges', DOC_KINDS, 'Dokumentart');
  const note = str(query.note || null, { max: 200, field: 'Bemerkung' });
  const validUntil = str(query.valid_until || null, { max: 10 });
  if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) throw bad('validation', 'Gültig bis im Format JJJJ-MM-TT.');
  const buf = new Uint8Array(await request.arrayBuffer());
  if (!buf.length) throw bad('empty', 'Leere Datei.');
  if (buf.length > 5 * 1024 * 1024) throw bad('too_large', 'Datei zu groß (max. 5 MB).');
  const type = sniffType(buf);
  if (!type) throw bad('type', 'Nur PDF, JPG, PNG oder WEBP erlaubt.');
  const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM files WHERE vehicle_id=? AND case_id IS NULL AND environment=?').bind(vehicleId, envName).first();
  if (cnt.n >= MAX_VEHICLE_DOCS) throw bad('too_many', `Maximal ${MAX_VEHICLE_DOCS} Dokumente je Fahrzeug.`);
  const sha = await sha256Hex(buf);
  const dup = await env.DB.prepare('SELECT id FROM files WHERE vehicle_id=? AND case_id IS NULL AND environment=? AND sha256=?').bind(vehicleId, envName, sha).first();
  if (dup) return { id: dup.id, duplicate: true };
  const id = uuid();
  const key = `${envName}/vehicles/${vehicleId}/${id}`;
  await env.FILES.put(key, buf, { metadata: { type, vehicle_id: vehicleId, env: envName } });
  const name = (() => { try { return decodeURIComponent(request.headers.get('x-filename') || 'dokument'); } catch { return 'dokument'; } })().replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || 'dokument';
  await env.DB.prepare(`INSERT INTO files(id,case_id,vehicle_id,doc_kind,doc_note,doc_valid_until,environment,r2_key,filename,content_type,size,sha256,uploaded_by,created_at) VALUES (?,NULL,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, vehicleId, kind, note, validUntil, envName, key, name, type, buf.length, sha, user.id, nowIso()).run();
  await audit(env, user.id, 'vehicle.document', vehicleId, { kind, filename: name, size: buf.length, valid_until: validUntil });
  return { id, duplicate: false };
}

// Für den Fuhrparkagenten: je Fahrzeug und Dokumentart zählt das späteste Gültig-bis-Datum (neueres Dokument ersetzt älteres)
export async function documentFindings(env, environment) {
  return (await env.DB.prepare(`SELECT f.vehicle_id, f.doc_kind, MAX(f.doc_valid_until) AS valid_until, v.plate FROM files f JOIN vehicles v ON v.id=f.vehicle_id
    WHERE f.environment=? AND f.case_id IS NULL AND f.doc_valid_until IS NOT NULL AND v.active=1 GROUP BY f.vehicle_id, f.doc_kind`).bind(environment).all()).results;
}
