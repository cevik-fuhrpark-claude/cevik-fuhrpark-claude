// [CLAUDE] Fahrzeugakten, Fahrerzuordnung, Wartung/Prüftermine, Kilometerstände
import { nowIso, uuid, bad, forbidden, notFound, str, num, oneOf, normalizeVin, isValidVin, addMonths } from './util.js';
import { audit } from './auth.js';
import { caseCosts } from './cases.js';

const isManager = (u) => u.role === 'owner' || u.role === 'fleet';
export const MAINT_KINDS = ['HU', 'SP', 'UVV', 'Tachograph', 'Ölwechsel', 'Inspektion', 'Bremsen', 'Reifen', 'Hydraulik/Aufbau', 'Sonstiges'];

export async function listVehicles(env, user, envName) {
  const rows = (await env.DB.prepare(`SELECT v.*,
      (SELECT COUNT(*) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS open_cases,
      (SELECT MAX(c.safety_lock) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS locked,
      (SELECT COUNT(*) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status IN ('werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle')) AS in_workshop,
      (SELECT km FROM odometer_readings o WHERE o.vehicle_id=v.id ORDER BY measured_at DESC LIMIT 1) AS last_km,
      (SELECT MIN(next_due_date) FROM maintenance_rules m WHERE m.vehicle_id=v.id AND m.next_due_date IS NOT NULL) AS next_due
    FROM vehicles v WHERE v.active=1 ORDER BY v.plate`).bind(envName, envName, envName).all()).results;
  let list = rows.map((v) => ({
    ...v,
    availability: v.locked ? 'gesperrt' : v.in_workshop ? 'werkstatt' : v.open_cases ? 'meldung_offen' : 'einsatzbereit_lt_system',
  }));
  if (user.role === 'driver') {
    const assigned = (await env.DB.prepare(`SELECT vehicle_id FROM driver_vehicles WHERE user_id=? AND (valid_to IS NULL OR valid_to > ?)`).bind(user.id, nowIso()).all()).results.map((r) => r.vehicle_id);
    list = list.map((v) => ({ id: v.id, plate: v.plate, site: v.site, manufacturer: v.manufacturer, trailer_plate: v.trailer_plate, assigned: assigned.includes(v.id), availability: v.availability }));
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
  const odometer = (await env.DB.prepare('SELECT km, measured_at, source FROM odometer_readings WHERE vehicle_id=? ORDER BY measured_at DESC LIMIT 20').bind(vehicleId).all()).results;
  const drivers = isManager(user) || user.role === 'dispatch'
    ? (await env.DB.prepare(`SELECT d.id, d.valid_from, d.valid_to, d.evidence, u.display_name, u.id AS user_id FROM driver_vehicles d JOIN users u ON u.id=d.user_id
        WHERE d.vehicle_id=? AND u.environment=? ORDER BY d.valid_from DESC`).bind(vehicleId, envName).all()).results
    : [];
  const out = { vehicle: v, cases: caseRows, inspections, maintenance, odometer, drivers };
  if (isManager(user)) {
    let actual = 0, estimate = 0, unvalued = 0;
    for (const c of caseRows) {
      const k = await caseCosts(env, c.id);
      actual += k.actual_net; estimate += k.estimate_net; unvalued += k.unvalued_items;
    }
    out.costs = { actual_net: Math.round(actual * 100) / 100, estimate_net: Math.round(estimate * 100) / 100, unvalued_items: unvalued, complete: unvalued === 0 };
  }
  return out;
}

export async function upsertVehicle(env, user, body) {
  if (!isManager(user)) throw forbidden();
  const vin = normalizeVin(body.vin);
  if (!isValidVin(vin)) throw bad('validation', 'FIN muss 17 Zeichen haben (ohne I, O, Q).');
  const plate = str(body.plate, { required: true, max: 20, field: 'Kennzeichen' }).toUpperCase();
  const id = `VIN:${vin}`;
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO vehicles(id,vin,plate,site,manufacturer,model,build_year,trailer_plate,trailer_vin,master_status,source,active,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)
    ON CONFLICT(id) DO UPDATE SET plate=excluded.plate, site=excluded.site, manufacturer=excluded.manufacturer, model=excluded.model, build_year=excluded.build_year,
      trailer_plate=excluded.trailer_plate, trailer_vin=excluded.trailer_vin, master_status=excluded.master_status, source=excluded.source, active=1, updated_at=excluded.updated_at`)
    .bind(id, vin, plate, str(body.site, { max: 60 }), str(body.manufacturer, { max: 60 }), str(body.model, { max: 60 }),
      body.build_year ? Math.round(num(body.build_year, { min: 1950, max: 2100, field: 'Baujahr' })) : null,
      str(body.trailer_plate, { max: 20 }), body.trailer_vin ? normalizeVin(body.trailer_vin) : null, str(body.master_status, { max: 40 }),
      str(body.source, { max: 200 }) || `manuell durch ${user.username}`, now, now).run();
  await audit(env, user.id, 'vehicle.upsert', id, { plate });
  return { id };
}

export async function assignDriver(env, user, envName, vehicleId, body) {
  if (!isManager(user)) throw forbidden();
  const driver = await env.DB.prepare(`SELECT id FROM users WHERE id=? AND role='driver' AND environment=?`).bind(str(body.user_id, { required: true, max: 40 }), envName).first();
  if (!driver) throw bad('validation', 'Fahrer nicht gefunden (gleiche Umgebung erforderlich).');
  const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const now = nowIso();
  const id = uuid();
  await env.DB.prepare(`INSERT INTO driver_vehicles(id,user_id,vehicle_id,valid_from,valid_to,evidence,created_by,created_at) VALUES (?,?,?,?,NULL,?,?,?)`)
    .bind(id, driver.id, vehicleId, now, str(body.evidence, { max: 300 }) || 'Zuordnung durch Fuhrparkleitung', user.id, now).run();
  return { id };
}

export async function endAssignment(env, user, assignmentId) {
  if (!isManager(user)) throw forbidden();
  await env.DB.prepare('UPDATE driver_vehicles SET valid_to=? WHERE id=? AND valid_to IS NULL').bind(nowIso(), assignmentId).run();
  return { ok: true };
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
  await env.DB.prepare(`INSERT INTO maintenance_rules(id,vehicle_id,kind,interval_months,interval_km,last_done_date,last_done_km,next_due_date,evidence,created_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, vehicleId, kind, months, km, lastDate, lastKm, nextDue, evidence, user.id, now, now).run();
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
  const next = str(body.next_due_date, { max: 10 }) || (r.interval_months ? addMonths(date, r.interval_months) : null);
  await env.DB.prepare('UPDATE maintenance_rules SET last_done_date=?, last_done_km=?, next_due_date=?, evidence=?, updated_at=? WHERE id=?')
    .bind(date, km, next, evidence, nowIso(), ruleId).run();
  if (km !== null) {
    await env.DB.prepare('INSERT OR IGNORE INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at) VALUES (?,?,?,?,?,?,?)')
      .bind(uuid(), r.vehicle_id, km, `${date}T12:00:00.000Z`, `wartung:${r.kind}`, user.id, nowIso()).run();
  }
  return { ok: true, next_due_date: next };
}

export async function addOdometer(env, user, vehicleId, body) {
  if (!['owner', 'fleet', 'workshop', 'driver', 'dispatch'].includes(user.role)) throw forbidden();
  const km = Math.round(num(body.km, { min: 0, max: 5000000, field: 'Kilometerstand' }));
  const last = await env.DB.prepare('SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? ORDER BY measured_at DESC LIMIT 1').bind(vehicleId).first();
  const warning = last && km < last.km ? `Kilometerstand kleiner als letzter Wert (${last.km} km) – bitte prüfen (Zählerwechsel?).` : null;
  const now = nowIso();
  await env.DB.prepare('INSERT INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at) VALUES (?,?,?,?,?,?,?)')
    .bind(uuid(), vehicleId, km, now, `manuell:${user.role}`, user.id, now).run();
  return { ok: true, warning };
}

// Stammdatenimport (CSV mit Kopfzeile: Kennzeichen;Standort;Status;Hersteller;Baujahr;FIN;Anhänger)
export async function importVehiclesCsv(env, user, text) {
  if (user.role !== 'owner') throw forbidden('Nur der Inhaber darf Stammdaten importieren.');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw bad('validation', 'CSV leer.');
  const sep = lines[0].includes(';') ? ';' : ',';
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const col = (names) => head.findIndex((h) => names.some((n) => h.startsWith(n)));
  const ci = { plate: col(['kennzeichen']), site: col(['standort']), status: col(['status']), man: col(['hersteller']), year: col(['baujahr']), vin: col(['fin']), trailer: col(['anhänger', 'anhaenger']) };
  if (ci.plate < 0 || ci.vin < 0) throw bad('validation', 'Spalten Kennzeichen und FIN erforderlich.');
  const result = { imported: 0, skipped: [] };
  for (const line of lines.slice(1)) {
    const cells = line.split(sep).map((c) => c.trim());
    const vin = normalizeVin(cells[ci.vin]);
    if (!isValidVin(vin)) { result.skipped.push({ plate: cells[ci.plate], reason: 'FIN ungültig/fehlt' }); continue; }
    await upsertVehicle(env, user, {
      vin, plate: cells[ci.plate], site: ci.site >= 0 ? cells[ci.site] : null, master_status: ci.status >= 0 ? cells[ci.status] : null,
      manufacturer: ci.man >= 0 ? cells[ci.man] : null, build_year: ci.year >= 0 && /^\d{4}(\.0+)?$/.test(cells[ci.year]) ? parseInt(cells[ci.year], 10) : null,
      trailer_plate: ci.trailer >= 0 ? cells[ci.trailer] : null, source: 'CSV-Import Fuhrpark Stammliste',
    });
    result.imported++;
  }
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
