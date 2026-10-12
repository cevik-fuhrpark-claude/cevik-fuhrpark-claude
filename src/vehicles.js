// [CLAUDE] Fahrzeugakten, Fahrerzuordnung, Wartung/Prüftermine, Kilometerstände
import { tachoStatus, warnDaysOf, TACHO_RULE } from './tacho.js';
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, num, oneOf, normalizeVin, isValidVin, addMonths, berlinDate, parseCsv, isCalendarDate } from './util.js';
import { audit } from './auth.js';
import { syncHuSpDues, huSpFor, loadHuSpInputs, ZGM_CLASSES_LKW, ZGM_CLASSES_TRAILER, zgmClassFromKg } from './inspection_rules.js';
import { vehicleCosts, sniffType, VEHICLE_DOC_READ, planDate } from './cases.js';
import { sha256Hex, berlinDateTime, hideDriverName } from './util.js';
import { vehicleContracts } from './contracts.js';
import { notifyUsers } from './notify.js';
import { REQUIRED_KINDS, kmDue, KM_RATE_WINDOW_DAYS } from './maintenance.js';

const isManager = (u) => u.role === 'owner' || u.role === 'fleet';
const normPlate = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');
// Feuerlöscher/Verbandkasten/Ladungssicherung: Intervall bzw. Ablaufdatum trägt die Fuhrparkleitung selbst ein (keine Vorgabe der App)
export const MAINT_KINDS = ['HU', 'SP', 'UVV', 'Tachograph', 'Ölwechsel', 'Inspektion', 'Bremsen', 'Reifen', 'Hydraulik/Aufbau', 'Feuerlöscher', 'Verbandkasten', 'Ladungssicherung', 'Sonstiges'];

export async function listVehicles(env, user, envName, query = {}) {
  const active = query.inactive === '1' && isManager(user) ? 0 : 1;
  const today = berlinDate(); // geplante Termine: nur heute oder später (überschrittene zeigt der Werkstattplan)
  const rows = (await env.DB.prepare(`SELECT v.*,
      (SELECT COUNT(*) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS open_cases,
      (SELECT MAX(c.safety_lock) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS locked,
      (SELECT COUNT(*) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status IN ('werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle')) AS in_workshop,
      (SELECT km FROM odometer_readings o WHERE o.vehicle_id=v.id ORDER BY measured_at DESC LIMIT 1) AS last_km,
      (SELECT MIN(next_due_date) FROM maintenance_rules m WHERE m.vehicle_id=v.id AND m.next_due_date IS NOT NULL) AS next_due,
      (SELECT i.created_at || '|' || i.result FROM inspections i WHERE i.vehicle_id=v.id AND i.environment=? AND i.kind='abfahrt' ORDER BY i.created_at DESC LIMIT 1) AS last_check,
      (SELECT MIN(c.planned_date) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status IN ('werkstatt_freigegeben','in_reparatur','wartet_teile') AND c.planned_date >= ?) AS planned_workshop_date,
      (SELECT m.planned_date || '|' || group_concat(m.kind, ', ') FROM maintenance_rules m WHERE m.vehicle_id=v.id AND m.planned_date = (SELECT MIN(m2.planned_date) FROM maintenance_rules m2 WHERE m2.vehicle_id=v.id AND m2.planned_date >= ?)) AS planned_inspection,
      (SELECT MAX(c.parts_expected_date) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status='wartet_teile') AS parts_expected_date,
      -- jüngste Prüfung (≤ 365 Tage) mit gefährlichen Mängeln/verkehrsunsicher, keine neuere derselben Art, kein Vorgang seitdem (wie „Prüfmangel ohne Auftrag“)
      (SELECT e.kind || '|' || e.done_date || '|' || e.result FROM maintenance_events e WHERE e.vehicle_id=v.id AND v.eval_excluded=0 AND e.done_date >= ?
        AND e.result IN ('gefaehrliche_maengel','verkehrsunsicher')
        AND NOT EXISTS (SELECT 1 FROM maintenance_events e2 WHERE e2.vehicle_id=e.vehicle_id AND e2.kind=e.kind AND e2.id<>e.id
          AND (e2.done_date > e.done_date OR (e2.done_date = e.done_date AND e2.created_at > e.created_at)))
        AND NOT EXISTS (SELECT 1 FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status<>'abgelehnt' AND c.created_at >= e.done_date)
        ORDER BY e.result='verkehrsunsicher' DESC, e.done_date DESC LIMIT 1) AS failed_insp,
      (SELECT COUNT(*) FROM vehicle_notes n WHERE n.vehicle_id=v.id AND n.environment=? AND n.archived_at IS NULL AND (n.valid_until IS NULL OR n.valid_until >= ?)) AS notes_active
    FROM vehicles v WHERE v.active=? ORDER BY v.plate`).bind(envName, envName, envName, envName, envName, today, today, envName, addMonths(today, -12), envName, envName, today, active).all()).results;
  // letzte Abfahrtskontrolle je Fahrzeug – nur Information (ohne Einsatzplan keine Pflichtbewertung)
  for (const v of rows) { const [at, result] = v.last_check ? v.last_check.split('|') : [null, null]; v.last_check_at = at; v.last_check_result = result; delete v.last_check;
    // nächster geplanter Prüftermin ab heute + Prüfart(en) an diesem Tag
    const [pd, pk] = v.planned_inspection ? v.planned_inspection.split('|') : [null, null]; v.planned_inspection_date = pd; v.planned_inspection_kind = pk || null; delete v.planned_inspection;
    const fi = v.failed_insp ? v.failed_insp.split('|') : null; v.failed_inspection = fi ? { kind: fi[0], done_date: fi[1], result: fi[2] } : null; delete v.failed_insp; }
  const byPlate = new Map(rows.map((v) => [normPlate(v.plate), v]));
  const pulledBy = new Map();
  for (const v of rows) if (v.kind === 'lkw' && v.trailer_plate) { const tr = byPlate.get(normPlate(v.trailer_plate)); if (tr && tr.kind === 'anhaenger') pulledBy.set(tr.id, v); }
  let list = rows.map((v) => ({
    ...v,
    trailer_id: v.kind === 'lkw' && v.trailer_plate && byPlate.get(normPlate(v.trailer_plate))?.kind === 'anhaenger' ? byPlate.get(normPlate(v.trailer_plate)).id : null,
    truck_id: pulledBy.get(v.id)?.id || null, truck_plate: pulledBy.get(v.id)?.plate || null,
    availability: v.locked ? 'gesperrt' : v.in_workshop ? 'werkstatt' : v.open_cases ? 'meldung_offen' : 'einsatzbereit_lt_system',
  }));
  // Gespann (Kopplung laut Stammliste ist fest): Zustand des gekoppelten Fahrzeugs je Zeile – nur Information, ändert availability nicht
  const byId = new Map(list.map((v) => [v.id, v]));
  for (const v of list) {
    const p = byId.get(v.trailer_id || v.truck_id);
    v.coupled = p ? { id: p.id, plate: p.plate, kind: p.kind, availability: p.availability } : null;
  }
  if (user.role === 'driver') {
    const assigned = (await env.DB.prepare(`SELECT vehicle_id FROM driver_vehicles WHERE user_id=? AND (valid_to IS NULL OR valid_to > ?)`).bind(user.id, nowIso()).all()).results.map((r) => r.vehicle_id);
    list = list.map((v) => ({ id: v.id, plate: v.plate, kind: v.kind, site: v.site, manufacturer: v.manufacturer, trailer_plate: v.trailer_plate, truck_plate: v.truck_plate, assigned: assigned.includes(v.id), availability: v.availability, coupled: v.coupled }));
    list.sort((a, b) => (b.assigned - a.assigned) || a.plate.localeCompare(b.plate));
  }
  return list;
}

// „Prüfung nicht bestanden“ für die Fahrzeugakte – gleiche Regel wie die Unterabfrage in listVehicles:
// jüngste Prüfung (≤ 12 Monate) mit gefährlichen Mängeln/verkehrsunsicher, keine neuere derselben Art, kein Vorgang (außer abgelehnt) seitdem;
// verkehrsunsicher vor gefährlichen Mängeln, dann neueste. Nur Information – ändert keine Verfügbarkeit.
export function failedInspectionOf(v, events, cases, since) {
  if (v.eval_excluded) return null;
  const newer = (e2, e) => e2.kind === e.kind && e2.id !== e.id && (e2.done_date > e.done_date || (e2.done_date === e.done_date && e2.created_at > e.created_at));
  const hits = events.filter((e) => e.done_date >= since && ['gefaehrliche_maengel', 'verkehrsunsicher'].includes(e.result)
    && !events.some((e2) => newer(e2, e)) && !cases.some((c) => c.status !== 'abgelehnt' && c.created_at >= e.done_date));
  hits.sort((a, b) => (b.result === 'verkehrsunsicher') - (a.result === 'verkehrsunsicher') || (b.done_date > a.done_date ? 1 : b.done_date < a.done_date ? -1 : 0));
  return hits[0] ? { kind: hits[0].kind, done_date: hits[0].done_date, result: hits[0].result, event_id: hits[0].id } : null;
}

// opts.timeline: nur die Teile laden, die die Zeitleiste braucht (gleiche Rechte, weniger D1-Abfragen)
export async function vehicleDetail(env, user, envName, vehicleId, opts = {}) {
  const tl = !!opts.timeline;
  if (user.role === 'driver') throw forbidden('Fahrzeugakten sind für Fahrer nicht freigegeben.');
  const v = await env.DB.prepare('SELECT * FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound('Fahrzeug nicht gefunden.');
  let caseRows = (await env.DB.prepare(`SELECT id, case_no, status, priority, description, created_at, closed_at, workshop_site, origin, parent_case_id, safety_lock, maintenance_rule_id, maintenance_event_id
    FROM cases WHERE vehicle_id=? AND environment=? ORDER BY created_at DESC`).bind(vehicleId, envName).all()).results;
  const allCases = caseRows; // ungefiltert – für „Prüfung nicht bestanden“ (gleiche Regel wie Fahrzeugliste)
  if (user.role === 'workshop') caseRows = caseRows.filter((c) => c.workshop_site === user.workshop_site && c.status !== 'gemeldet');
  const inspections = (await env.DB.prepare(`SELECT i.id, i.kind, i.result, i.odometer_km, i.created_at, i.case_id, u.display_name AS performed_by_name, u.role AS performed_by_role
    FROM inspections i JOIN users u ON u.id=i.performed_by WHERE i.vehicle_id=? AND i.environment=? ORDER BY i.created_at DESC LIMIT 50`).bind(vehicleId, envName).all()).results;
  // letzte Abfahrtskontrolle (nur Information); meist in den letzten 50 Kontrollen enthalten, sonst gezielt nachladen
  const lastCheck = inspections.find((i) => i.kind === 'abfahrt') || (inspections.length < 50 ? null
    : await env.DB.prepare(`SELECT i.id, i.kind, i.result, i.odometer_km, i.created_at, i.case_id, u.display_name AS performed_by_name, u.role AS performed_by_role
        FROM inspections i JOIN users u ON u.id=i.performed_by WHERE i.vehicle_id=? AND i.environment=? AND i.kind='abfahrt' ORDER BY i.created_at DESC LIMIT 1`).bind(vehicleId, envName).first());
  for (const i of inspections) hideDriverName(user, i, 'performed_by_name', 'performed_by_role');
  if (lastCheck && !inspections.includes(lastCheck)) hideDriverName(user, lastCheck, 'performed_by_name', 'performed_by_role');
  // Wiederkehrende Mängel: gleicher Prüfpunkt mindestens 2× als Mangel in Kontrollen der letzten 90 Tage
  const recurring = tl ? [] : (await env.DB.prepare(`SELECT json_extract(j.value,'$.key') AS item, COUNT(*) AS n, MAX(i.created_at) AS last_at
    FROM inspections i, json_each(i.items) j WHERE i.vehicle_id=? AND i.environment=? AND i.created_at >= ? AND json_extract(j.value,'$.result')='mangel'
    GROUP BY item HAVING COUNT(*) >= 2 ORDER BY n DESC, last_at DESC`).bind(vehicleId, envName, new Date(Date.now() - 90 * 86400000).toISOString()).all()).results;
  const maintenance = (await env.DB.prepare('SELECT * FROM maintenance_rules WHERE vehicle_id=? ORDER BY next_due_date IS NULL, next_due_date').bind(vehicleId).all()).results;
  const maintenanceHistory = (await env.DB.prepare(`SELECT e.id, e.rule_id, e.kind, e.done_date, e.done_km, e.evidence, e.source, e.result, e.created_at, u.display_name AS recorded_by_name
    FROM maintenance_events e LEFT JOIN users u ON u.id=e.recorded_by WHERE e.vehicle_id=? ORDER BY e.done_date DESC LIMIT 200`).bind(vehicleId).all()).results;
  const odometer = (await env.DB.prepare('SELECT km, measured_at, source, note FROM odometer_readings WHERE vehicle_id=? ORDER BY measured_at DESC LIMIT 20').bind(vehicleId).all()).results;
  const drivers = isManager(user) || user.role === 'dispatch'
    ? (await env.DB.prepare(`SELECT d.id, d.valid_from, d.valid_to, d.evidence, u.display_name, u.id AS user_id FROM driver_vehicles d JOIN users u ON u.id=d.user_id
        WHERE d.vehicle_id=? AND u.environment=? ORDER BY d.valid_from DESC`).bind(vehicleId, envName).all()).results
    : [];
  // Kopplung Lkw ↔ Anhänger laut Stammliste (Spalte „Anhänger Kennzeichen“ des Lkw)
  // locked: Sicherheitssperre eines offenen Vorgangs des gekoppelten Fahrzeugs in dieser Umgebung (nur Information)
  const all = tl ? [] : (await env.DB.prepare(`SELECT v.id, v.plate, v.kind, v.trailer_plate, EXISTS (SELECT 1 FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.safety_lock=1
    AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS locked FROM vehicles v WHERE v.active=1`).bind(envName).all()).results;
  const coupled = v.kind === 'anhaenger'
    ? all.filter((x) => x.kind === 'lkw' && x.trailer_plate && normPlate(x.trailer_plate) === normPlate(v.plate)).map((x) => ({ id: x.id, plate: x.plate, kind: 'lkw', locked: !!x.locked }))
    : all.filter((x) => x.kind === 'anhaenger' && v.trailer_plate && normPlate(x.plate) === normPlate(v.trailer_plate)).map((x) => ({ id: x.id, plate: x.plate, kind: 'anhaenger', locked: !!x.locked }));
  const documents = VEHICLE_DOC_READ.includes(user.role)
    ? (await env.DB.prepare(`SELECT f.id, f.filename, f.content_type, f.size, f.doc_kind, f.doc_note, f.doc_valid_until, f.created_at, u.display_name AS uploaded_by_name FROM files f JOIN users u ON u.id=f.uploaded_by
        WHERE f.vehicle_id=? AND f.case_id IS NULL AND f.environment=? ORDER BY f.created_at DESC`).bind(vehicleId, envName).all()).results
    : [];
  // Letzter Telematik-Stand (nur Inhaber, Fuhrparkleitung, Disposition – Positionsdaten sind über die Fahrerzuordnung personenbeziehbar)
  const telematics = !tl && (isManager(user) || user.role === 'dispatch')
    ? (await env.DB.prepare('SELECT provider, match_basis, gps_time, received_at, lat, lon, km, speed, ignition FROM telematics_latest WHERE vehicle_id=? ORDER BY gps_time DESC').bind(vehicleId).all()).results
    : [];
  const sets = new Map((await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN ('maintenance_warn_days','tacho_warn_days','contract_warn_days')`).all()).results.map((r) => [r.key, r.value]));
  const husp = tl ? null : huSpFor((await loadHuSpInputs(env, [vehicleId])).get(vehicleId), berlinDate(), Number(sets.get('maintenance_warn_days')) || 30);
  const failedInspection = failedInspectionOf(v, maintenanceHistory, allCases, addMonths(berlinDate(), -12));
  // Pflichtprüfung in der App erfasst (≤ 180 Tage, neueste ihrer Art) ohne Prüfergebnis – gleiche Regel wie Datenqualität `inspection_no_result`, ohne Zusatzabfrage
  const sinceNr = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
  const newer = (a, b) => b.done_date > a.done_date || (b.done_date === a.done_date && b.created_at > a.created_at);
  const resultMissing = v.active && !v.eval_excluded ? maintenanceHistory.filter((e) => e.result === null && ['erfasst', 'erledigt'].includes(e.source) && REQUIRED_KINDS.includes(e.kind)
    && e.done_date >= sinceNr && !maintenanceHistory.some((x) => x.id !== e.id && x.kind === e.kind && newer(e, x))).map((e) => ({ event_id: e.id, kind: e.kind, done_date: e.done_date })) : [];
  // Fahrleistungs-Prognose für km-Fälligkeiten (nur Planungshilfe, gleiche Regel wie die Prüftermin-Übersicht) – Abfrage nur bei km-Regeln
  if (!tl && odometer[0] && maintenance.some((m) => m.interval_km && m.last_done_km !== null)) {
    const b = await env.DB.prepare(`SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? AND measured_at >= date(?, '-${KM_RATE_WINDOW_DAYS} days') ORDER BY measured_at LIMIT 1`).bind(vehicleId, odometer[0].measured_at).first();
    const latest = { km: odometer[0].km, measured_at: odometer[0].measured_at, base_km: b ? b.km : null, base_at: b ? b.measured_at : null };
    const today = berlinDate();
    for (const m of maintenance) if (m.interval_km && m.last_done_km !== null) { const k = kmDue(m, latest, null, today); m.km_forecast = k ? k.km_forecast || null : null; }
  }
  const out = { failed_inspection: failedInspection, result_missing: resultMissing, vehicle: v, telematics, cases: caseRows, inspections, last_check: lastCheck || null, recurring_defects: recurring, maintenance, maintenance_history: maintenanceHistory, odometer, drivers, coupled, documents, hu_sp: husp };
  if (isManager(user)) {
    if (!tl) {
    out.costs = await vehicleCosts(env, envName, vehicleId);
    out.warranties = out.costs.warranties; delete out.costs.warranties; // laufende Gewährleistungen (nur Leitung, wie die Kosten)
    // Versicherungsfälle des Fahrzeugs (Umgebung wie die Vorgänge): Anzahl, offen, Summe eingetragener Erstattungen – nicht mit den Kosten verrechnet
    out.claims_summary = await env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ('gemeldet','in_pruefung') THEN 1 ELSE 0 END) AS open,
      SUM(reimbursed_net) AS reimbursed_net FROM insurance_claims WHERE vehicle_id=? AND environment=?`).bind(vehicleId, envName).first();
    out.claims_summary = { total: out.claims_summary.total, open: out.claims_summary.open || 0, reimbursed_net: out.claims_summary.reimbursed_net === null ? null : Math.round(out.claims_summary.reimbursed_net * 100) / 100 };
    }
    // Verträge (Leasing/Miete/…): km-Auswertung mit dem letzten km-Stand der Akte
    out.contracts = await vehicleContracts(env, vehicleId, odometer[0] || null, sets, envName);
    if (v.kind !== 'anhaenger') {
      // Massenspeicher-Auslesungen (FPersV § 2 Abs. 5: spätestens alle 90 Tage) – Frist nur ab erfasster Auslesung
      out.tacho_downloads = (await env.DB.prepare(`SELECT t.id, t.downloaded_on, t.evidence, t.note, u.display_name AS created_by_name FROM tacho_downloads t LEFT JOIN users u ON u.id=t.created_by
        WHERE t.vehicle_id=? AND t.environment=? ORDER BY t.downloaded_on DESC LIMIT 20`).bind(vehicleId, envName).all()).results;
      out.tacho = { ...tachoStatus(out.tacho_downloads[0] ? out.tacho_downloads[0].downloaded_on : null, TACHO_RULE.vu_days, berlinDate(), warnDaysOf(sets)), rule: TACHO_RULE };
    }
  }
  return out;
}

// Zeitleiste der Fahrzeugakte: alle gespeicherten Ereignisse chronologisch (nur vorhandene Daten, gleiche Rechte wie die Akte)
export const TIMELINE_TYPES = ['case', 'case_closed', 'inspection', 'odometer', 'driver_from', 'driver_to', 'document', 'tire', 'maintenance', 'fine', 'tacho', 'contract', 'claim', 'note'];
export async function vehicleTimeline(env, user, envName, vehicleId, query = {}) {
  const d = await vehicleDetail(env, user, envName, vehicleId, { timeline: true });
  const want = new Set(String(query.types || '').split(',').filter((x) => TIMELINE_TYPES.includes(x)));
  const limit = Math.min(Math.max(Number(query.limit) || 300, 1), 1000);
  const items = [];
  const add = (type, at, data) => { if (at && (!want.size || want.has(type))) items.push({ type, at, ...data }); };
  for (const c of d.cases) {
    add('case', c.created_at, { case_id: c.id, case_no: c.case_no, priority: c.priority, status: c.status, text: c.description.slice(0, 140), origin: c.origin });
    if (c.closed_at) add('case_closed', c.closed_at, { case_id: c.id, case_no: c.case_no, status: c.status });
  }
  for (const i of d.inspections) add('inspection', i.created_at, { inspection_kind: i.kind, result: i.result, km: i.odometer_km, case_id: i.case_id, by: i.performed_by_name, ...(i.performed_by_name_hidden ? { by_hidden: true } : {}) });
  for (const o of d.odometer) add('odometer', o.measured_at, { km: o.km, source: o.source, note: o.note });
  for (const r of d.drivers) { add('driver_from', r.valid_from, { by: r.display_name, evidence: r.evidence }); add('driver_to', r.valid_to, { by: r.display_name }); }
  for (const f of d.documents) add('document', f.created_at, { doc_kind: f.doc_kind, text: f.filename, file_id: f.id, valid_until: f.doc_valid_until });
  for (const m of d.maintenance_history) add('maintenance', m.done_date, { maintenance_kind: m.kind, km: m.done_km, evidence: m.evidence, by: m.recorded_by_name, result: m.result || null });
  if (user.role !== 'driver') {
    const tires = (await env.DB.prepare(`SELECT created_at, position, event_type, tread_mm, odometer_km, case_id FROM tire_events WHERE vehicle_id=? AND environment=? ORDER BY created_at DESC LIMIT 300`)
      .bind(vehicleId, envName).all()).results;
    for (const t of tires) add('tire', t.created_at, { position: t.position, tire_event: t.event_type, tread_mm: t.tread_mm, km: t.odometer_km, case_id: t.case_id });
    // Hinweise zum Fahrzeug: angelegt und archiviert (nur wenn der Bereich gewünscht ist – spart sonst die Abfrage)
    if (!want.size || want.has('note')) {
      const notes = (await env.DB.prepare(`SELECT text, for_driver, created_at, archived_at, valid_until FROM vehicle_notes WHERE vehicle_id=? AND environment=? ORDER BY created_at DESC LIMIT 200`).bind(vehicleId, envName).all()).results;
      const today = berlinDate();
      for (const n of notes) {
        add('note', n.created_at, { note_event: 'add', text: n.text, for_driver: !!n.for_driver, valid_until: n.valid_until || null });
        // Abgelaufen („gültig bis“ überschritten), sofern nicht schon vorher archiviert – Datum laut Eintrag, nichts geschätzt
        const expired = n.valid_until && n.valid_until < today && !(n.archived_at && berlinDate(n.archived_at) <= n.valid_until);
        if (expired) add('note', n.valid_until, { note_event: 'expire', text: n.text, valid_until: n.valid_until });
        if (!expired || n.archived_at) add('note', n.archived_at, { note_event: 'archive', text: n.text });
      }
    }
  }
  if (isManager(user)) {
    const fines = (await env.DB.prepare(`SELECT id, fine_no, kind, offense_type, offense_at, status FROM fines WHERE vehicle_id=? AND environment=? ORDER BY offense_at DESC LIMIT 200`)
      .bind(vehicleId, envName).all()).results;
    for (const x of d.tacho_downloads || []) add('tacho', x.downloaded_on, { evidence: x.evidence, by: x.created_by_name });
    for (const c of d.contracts || []) {
      add('contract', c.start_date || c.created_at, { contract_event: 'start', contract_kind: c.kind, partner: c.partner, evidence: c.evidence });
      add('contract', c.ended_on, { contract_event: 'end', contract_kind: c.kind, partner: c.partner, evidence: c.end_note });
    }
    // Versicherungsfälle (nur Leitung): Meldung an den Versicherer und Erstattung laut Abrechnung – nur gespeicherte Daten
    const claims = (await env.DB.prepare(`SELECT ic.case_id, c.case_no, ic.insurer, ic.claim_no, ic.reported_on, ic.status, ic.reimbursed_net, ic.reimbursed_on
      FROM insurance_claims ic JOIN cases c ON c.id=ic.case_id WHERE ic.vehicle_id=? AND ic.environment=? ORDER BY ic.reported_on DESC LIMIT 200`).bind(vehicleId, envName).all()).results;
    for (const c of claims) {
      add('claim', c.reported_on, { claim_event: 'reported', case_id: c.case_id, case_no: c.case_no, insurer: c.insurer, claim_no: c.claim_no, status: c.status });
      add('claim', c.reimbursed_on, { claim_event: 'reimbursed', case_id: c.case_id, case_no: c.case_no, insurer: c.insurer, claim_no: c.claim_no, reimbursed_net: c.reimbursed_net });
    }
    for (const f of fines) add('fine', f.offense_at, { fine_id: f.id, fine_no: f.fine_no, fine_kind: f.kind, offense_type: f.offense_type, status: f.status });
  }
  // Datum ohne Uhrzeit (z. B. Prüfung „erledigt am“) als Tagesmitte einsortieren
  const key = (x) => (x.at.length === 10 ? x.at + 'T12:00:00.000Z' : x.at);
  items.sort((a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0));
  return { vehicle: { id: d.vehicle.id, plate: d.vehicle.plate, kind: d.vehicle.kind }, types: TIMELINE_TYPES, total: items.length, items: items.slice(0, limit) };
}

// Fahrzeugliste als CSV (Excel): Stammdaten + Verfügbarkeit laut System
const AV_DE = { gesperrt: 'gesperrt', werkstatt: 'in Werkstatt', meldung_offen: 'Meldung offen', einsatzbereit_lt_system: 'keine offenen Meldungen' };
export function vehiclesCsv(list, csvCell) {
  const head = ['Kennzeichen', 'FIN', 'Fahrzeugart', 'Standort', 'Hersteller', 'Modell', 'Baujahr', 'Anhänger', 'Status Stammliste', 'Verfügbarkeit laut System', 'Offene Vorgänge', 'Letzter km-Stand', 'Nächste Prüfung', 'Letzte Abfahrtskontrolle', 'Ergebnis Abfahrtskontrolle', 'Gekoppeltes Fahrzeug', 'Zustand gekoppeltes Fahrzeug'];
  const lines = [head.join(';')];
  for (const v of list) lines.push([csvCell(v.plate), csvCell(v.vin), v.kind === 'anhaenger' ? 'Anhänger' : 'Lkw', csvCell(v.site), csvCell(v.manufacturer), csvCell(v.model), v.build_year ?? '',
    csvCell(v.trailer_plate), csvCell(v.master_status), AV_DE[v.availability] || v.availability, v.open_cases ?? '', v.last_km ?? '', v.next_due || '',
    v.last_check_at ? berlinDateTime(v.last_check_at) : '', v.last_check_result === 'ok' ? 'ohne Mangel' : v.last_check_result === 'maengel' ? 'mit Mangel' : '',
    // Gespann laut Stammliste: Kennzeichen + Verfügbarkeit des gekoppelten Fahrzeugs (nur Information)
    v.coupled ? csvCell(v.coupled.plate) : '', v.coupled ? (AV_DE[v.coupled.availability] || v.coupled.availability) : ''].join(';'));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
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
// keepExisting (Import): leere/fehlende Felder überschreiben vorhandene Werte nicht – ein Import löscht nie Stammdaten
async function upsertVehicleRows(env, rows, { keepExisting = false } = {}) {
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
      ON CONFLICT(id) DO UPDATE SET ${['plate', 'site', 'manufacturer', 'model', 'build_year', 'trailer_plate', 'trailer_vin', 'master_status', 'source', 'kind']
        .map((f) => (keepExisting ? `${f}=COALESCE(excluded.${f}, vehicles.${f})` : `${f}=excluded.${f}`)).join(', ')}, active=1, updated_at=excluded.updated_at`)
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
  // Hinweis: laufende Verträge (Leasing/Miete/Versicherung …) bleiben bestehen – Rückgabe/Kündigung separat klären
  const running = active ? 0 : (await env.DB.prepare('SELECT COUNT(*) AS n FROM vehicle_contracts WHERE vehicle_id=? AND ended_on IS NULL').bind(vehicleId).first()).n;
  return { ok: true, active, running_contracts: running };
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
  // Gespann: gekoppelter Anhänger bzw. Zugmaschine laut Stammliste (fest gekoppelt) – deren Sperre betrifft die Fahrt ebenfalls
  const pool = (await env.DB.prepare(`SELECT id, plate, kind, trailer_plate FROM vehicles WHERE active=1 AND (kind='anhaenger' OR (kind='lkw' AND trailer_plate IS NOT NULL AND trailer_plate<>''))`).all()).results;
  const coupledOf = new Map();
  for (const v of vs) {
    const p = v.kind === 'anhaenger'
      ? pool.find((x) => x.kind === 'lkw' && normPlate(x.trailer_plate) === normPlate(v.plate))
      : v.trailer_plate ? pool.find((x) => x.kind === 'anhaenger' && normPlate(x.plate) === normPlate(v.trailer_plate)) : null;
    if (p && p.id !== v.id) coupledOf.set(v.id, p);
  }
  const ids = JSON.stringify([...new Set([...vs.map((v) => v.id), ...[...coupledOf.values()].map((p) => p.id)])]);
  const [locks, mine, rules, kms, notes] = await Promise.all([
    env.DB.prepare(`SELECT vehicle_id, MAX(safety_lock) AS locked, COUNT(*) AS open FROM cases WHERE environment=? AND vehicle_id IN (SELECT value FROM json_each(?))
      AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') GROUP BY vehicle_id`).bind(envName, ids).all(),
    // alle offenen Vorgänge der eigenen Fahrzeuge (ohne Namen der Meldenden): Fahrer sieht bekannte Mängel und meldet sie nicht doppelt
    env.DB.prepare(`SELECT id, case_no, vehicle_id, status, priority, substr(description,1,300) AS description, created_at, check_item, safety_lock, planned_date, parts_expected_date, reporter_id=? AS mine
      FROM cases WHERE environment=? AND vehicle_id IN (SELECT value FROM json_each(?))
      AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') ORDER BY created_at DESC LIMIT 200`).bind(user.id, envName, ids).all(),
    env.DB.prepare(`SELECT vehicle_id, kind, next_due_date, planned_date FROM maintenance_rules WHERE vehicle_id IN (SELECT value FROM json_each(?)) AND (next_due_date IS NOT NULL OR planned_date IS NOT NULL) ORDER BY next_due_date IS NULL, next_due_date`).bind(ids).all(),
    env.DB.prepare(`SELECT o.vehicle_id, o.km, o.measured_at FROM odometer_readings o WHERE o.vehicle_id IN (SELECT value FROM json_each(?1))
      AND o.measured_at = (SELECT MAX(o2.measured_at) FROM odometer_readings o2 WHERE o2.vehicle_id=o.vehicle_id)`).bind(ids).all(),
    // Hinweise zum Fahrzeug, die ausdrücklich für Fahrer freigegeben sind (ohne Verfasser)
    env.DB.prepare(`SELECT vehicle_id, text, created_at, valid_until FROM vehicle_notes WHERE environment=? AND for_driver=1 AND archived_at IS NULL AND (valid_until IS NULL OR valid_until >= ?) AND vehicle_id IN (SELECT value FROM json_each(?)) ORDER BY created_at DESC, rowid DESC`).bind(envName, berlinDate(), ids).all(),
  ]);
  const lockMap = new Map(locks.results.map((r) => [r.vehicle_id, r]));
  const kmMap = new Map(kms.results.map((r) => [r.vehicle_id, r]));
  // geplante Termine (nur gespeicherte, ab heute nach Berliner Datum): Fahrer weiß, wann das Fahrzeug in die Werkstatt soll
  const today = berlinDate();
  const minDate = (arr) => arr.filter((d) => d && d >= today).sort()[0] || null;
  const WS = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'];
  return {
    vehicles: vs.map((v) => ({
      ...v, locked: !!(lockMap.get(v.id) || {}).locked, open_cases_total: (lockMap.get(v.id) || {}).open || 0,
      my_open_cases: mine.results.filter((c) => c.vehicle_id === v.id && c.mine).map(({ mine: _m, check_item: _c, safety_lock: _s, planned_date: _p, parts_expected_date: _e, ...c }) => c),
      known_defects: mine.results.filter((c) => c.vehicle_id === v.id).slice(0, 10).map((c) => ({ id: c.mine ? c.id : null, case_no: c.case_no, status: c.status, priority: c.priority,
        description: c.description, created_at: c.created_at, check_item: c.check_item, safety_lock: !!c.safety_lock, mine: !!c.mine,
        planned_date: WS.includes(c.status) && c.planned_date >= today ? c.planned_date : null,
        // Teile-Liefertermin laut Werkstatt (nur ab heute – ein überschrittener Termin ist Sache der Werkstatt/Leitung)
        parts_expected_date: c.status === 'wartet_teile' && c.parts_expected_date >= today ? c.parts_expected_date : null })),
      next_inspections: rules.results.filter((r) => r.vehicle_id === v.id && r.next_due_date).slice(0, 4).map(({ kind, next_due_date, planned_date }) => ({ kind, next_due_date, planned_date: planned_date >= today ? planned_date : null })),
      planned_workshop_date: minDate(mine.results.filter((c) => c.vehicle_id === v.id && WS.includes(c.status)).map((c) => c.planned_date)),
      planned_inspection: (() => { const r = rules.results.filter((x) => x.vehicle_id === v.id && x.planned_date >= today).sort((a, b) => a.planned_date.localeCompare(b.planned_date))[0]; return r ? { kind: r.kind, planned_date: r.planned_date } : null; })(),
      last_km: kmMap.get(v.id) || null,
      notes: notes.results.filter((n) => n.vehicle_id === v.id).slice(0, 10).map(({ text, created_at }) => ({ text, created_at })),
      coupled: coupledOf.has(v.id) ? (({ id, plate, kind }) => ({ id, plate, kind, locked: !!(lockMap.get(id) || {}).locked }))(coupledOf.get(v.id)) : null,
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
  const km = body.interval_km ? Math.round(num(body.interval_km, { min: 100, max: 1000000, field: 'Intervall km', grouped: true })) : null;
  const lastDate = str(body.last_done_date, { max: 10 });
  const lastKm = body.last_done_km ? Math.round(num(body.last_done_km, { min: 0, max: 5000000, field: 'km', grouped: true })) : null;
  const husp = kind === 'HU' || kind === 'SP';
  let nextDue = str(body.next_due_date, { max: 10 });
  const dueSource = nextDue ? 'nachweis' : 'berechnet';
  // HU/SP: kein pauschales Intervall – Fälligkeit zentral nach StVZO Anlage VIII (inspection_rules.js) oder laut Nachweis
  if (!nextDue && lastDate && months && !husp) nextDue = addMonths(lastDate, months);
  for (const d of [lastDate, nextDue]) if (d && !isCalendarDate(d)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
  if (lastDate && lastDate > berlinDate()) throw bad('validation', 'Letzte Durchführung liegt in der Zukunft – geplante Termine über „Werkstatttermin planen“ eintragen.');
  const id = uuid();
  const now = nowIso();
  const stmts = [env.DB.prepare(`INSERT INTO maintenance_rules(id,vehicle_id,kind,interval_months,interval_km,last_done_date,last_done_km,next_due_date,evidence,created_by,created_at,updated_at,due_source)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, vehicleId, kind, husp ? null : months, km, lastDate, lastKm, nextDue, evidence, user.id, now, now, dueSource)];
  if (lastDate) stmts.push(maintEventStmt(env, { rule_id: id, vehicle_id: vehicleId, kind, done_date: lastDate, done_km: lastKm, evidence, source: 'erfasst', user_id: user.id }));
  await env.DB.batch(stmts);
  if (husp) await syncHuSpDues(env, { today: berlinDate(), actorId: user.id, vehicleIds: [vehicleId] });
  return { id, next_due_date: husp ? (await env.DB.prepare('SELECT next_due_date FROM maintenance_rules WHERE id=?').bind(id).first()).next_due_date : nextDue };
}

// Geplanter Werkstatttermin für eine Prüfung (ersetzt keine Durchführung, verschiebt keine Frist)
export async function planMaintenance(env, user, ruleId, body) {
  if (!isManager(user) && user.role !== 'workshop') throw forbidden();
  const r = await env.DB.prepare('SELECT id, vehicle_id, kind FROM maintenance_rules WHERE id=?').bind(ruleId).first();
  if (!r) throw notFound();
  // gleiche Prüfung wie Werkstatttermine: echtes Kalenderdatum, nicht mehr als 1 Jahr zurück / 2 Jahre voraus
  const d = body.planned_date ? planDate(str(body.planned_date, { max: 10 })) : null;
  await env.DB.prepare('UPDATE maintenance_rules SET planned_date=?, updated_at=? WHERE id=?').bind(d, nowIso(), ruleId).run();
  await audit(env, user.id, 'maintenance.plan', r.vehicle_id, { kind: r.kind, planned_date: d });
  return { ok: true, planned_date: d };
}

// Prüfrelevante Fahrzeugdaten: zulässige Gesamtmasse (F.2), Erstzulassung (B) – nur mit Nachweis
export async function setVehicleSpec(env, user, vehicleId, body) {
  if (!isManager(user)) throw forbidden();
  const v = await env.DB.prepare('SELECT id, plate, kind, zgm_class, zgm_kg, first_registration FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const source = str(body.spec_source, { required: true, max: 200, field: 'Nachweis (z. B. Fahrzeugschein)' });
  const kg = body.zgm_kg === undefined || body.zgm_kg === null || body.zgm_kg === '' ? null : Math.round(num(body.zgm_kg, { min: 500, max: 60000, field: 'zulässige Gesamtmasse (kg)' }));
  const allowed = v.kind === 'anhaenger' ? ZGM_CLASSES_TRAILER : ZGM_CLASSES_LKW;
  let cls = body.zgm_class ? oneOf(body.zgm_class, allowed, 'Gewichtsklasse') : null;
  if (kg !== null) {
    const fromKg = zgmClassFromKg(v.kind, kg);
    if (cls && cls !== fromKg) throw bad('validation', 'Gewichtsklasse passt nicht zur angegebenen Gesamtmasse.');
    cls = fromKg;
  }
  const ez = body.first_registration ? str(body.first_registration, { max: 10 }) : null;
  if (ez && (!isCalendarDate(ez) || ez > berlinDate())) throw bad('validation', 'Erstzulassung im Format JJJJ-MM-TT, nicht in der Zukunft.');
  await env.DB.prepare('UPDATE vehicles SET zgm_class=?, zgm_kg=?, first_registration=?, spec_source=?, updated_at=? WHERE id=?').bind(cls, kg, ez, source, nowIso(), vehicleId).run();
  await audit(env, user.id, 'vehicle.spec', vehicleId, { plate: v.plate, from: { zgm_class: v.zgm_class, zgm_kg: v.zgm_kg, first_registration: v.first_registration }, to: { zgm_class: cls, zgm_kg: kg, first_registration: ez }, source });
  const sync = await syncHuSpDues(env, { today: berlinDate(), actorId: user.id, vehicleIds: [vehicleId] });
  return { ok: true, zgm_class: cls, husp_recalc: sync.changed };
}

// Prüfergebnisse, bei denen Fuhrparkleitung, Inhaber und Disposition sofort (dringend, nicht abschaltbar) informiert werden
const URGENT_RESULTS = { gefaehrliche_maengel: 'gefährliche Mängel', verkehrsunsicher: 'verkehrsunsicher' };
// Gefährliche Mängel / verkehrsunsicher: sofort Leitung, Inhaber und Disposition der aktiven Umgebung informieren – nur für aktuelle
// Prüfungen (≤ 1 Monat, neueste dieser Prüfart), nicht beim Nachtragen alter Berichte. Einmal je Prüfung und Person (event_key).
async function notifyInspectionDefect(env, ctx, envName, user, { vehicleId, kind, date, result, key }) {
  if (!result || !URGENT_RESULTS[result] || !envName || date < addMonths(berlinDate(), -1)) return 0;
  const v = await env.DB.prepare(`SELECT v.plate, (SELECT COUNT(*) FROM maintenance_events e WHERE e.vehicle_id=v.id AND e.kind=? AND e.done_date > ?) AS newer
    FROM vehicles v WHERE v.id=?`).bind(kind, date, vehicleId).first();
  if (!v || v.newer) return 0;
  const ids = (await env.DB.prepare(`SELECT id FROM users WHERE active=1 AND password_hash IS NOT NULL AND environment=? AND role IN ('owner','fleet','dispatch') AND id<>?`)
    .bind(envName, user.id).all()).results.map((x) => x.id);
  if (!ids.length) return 0;
  return notifyUsers(env, ctx, envName, ids, { kind: 'inspection_defect', title: 'Prüfung mit gefährlichen Mängeln', urgent: true,
    body: `${v.plate} · ${kind} ${date}: ${URGENT_RESULTS[result]}${result === 'verkehrsunsicher' ? ' – nicht einplanen' : ''}${envName === 'test' ? ' · TEST' : ''}`, eventKey: `inspdef:${key}:${date}:${result}` });
}

export const INSPECTION_RESULTS = ['ohne_maengel', 'geringe_maengel', 'erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'];
// Prüfergebnis an einer gespeicherten Durchführung nachtragen (z. B. Bericht kam später) – nur wenn noch keines eingetragen ist, nie überschreiben.
export async function addMaintenanceResult(env, user, eventId, body, { ctx = null, envName = null } = {}) {
  if (!isManager(user) && user.role !== 'workshop') throw forbidden();
  const e = await env.DB.prepare('SELECT id, rule_id, vehicle_id, kind, done_date, result FROM maintenance_events WHERE id=?').bind(eventId).first();
  if (!e) throw notFound('Durchführung nicht gefunden.');
  const result = oneOf(body.result, INSPECTION_RESULTS, 'Prüfergebnis');
  const evidence = str(body.evidence, { required: true, max: 300, field: 'Nachweis (z. B. Prüfbericht-Nr.)' });
  if (e.result) throw conflict('result_exists', 'Für diese Durchführung ist bereits ein Prüfergebnis eingetragen – es wird nicht überschrieben.');
  const upd = await env.DB.prepare('UPDATE maintenance_events SET result=? WHERE id=? AND result IS NULL').bind(result, e.id).run();
  if (!upd.meta || !upd.meta.changes) throw conflict('result_exists', 'Für diese Durchführung ist bereits ein Prüfergebnis eingetragen – es wird nicht überschrieben.');
  await audit(env, user.id, 'maintenance.result_add', e.vehicle_id, { kind: e.kind, done_date: e.done_date, result, evidence });
  if (e.kind === 'HU' || e.kind === 'SP') await syncHuSpDues(env, { today: berlinDate(), actorId: user.id, vehicleIds: [e.vehicle_id] });
  const notified = await notifyInspectionDefect(env, ctx, envName, user, { vehicleId: e.vehicle_id, kind: e.kind, date: e.done_date, result, key: e.rule_id || e.id });
  return { ok: true, result, notified };
}

export async function completeMaintenance(env, user, ruleId, body, { ctx = null, envName = null } = {}) {
  if (!isManager(user) && user.role !== 'workshop') throw forbidden();
  const r = await env.DB.prepare('SELECT * FROM maintenance_rules WHERE id=?').bind(ruleId).first();
  if (!r) throw notFound();
  const date = str(body.done_date, { required: true, max: 10, field: 'Datum' });
  if (!isCalendarDate(date)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
  if (date > berlinDate()) throw bad('validation', 'Durchführungsdatum liegt in der Zukunft – geplante Termine über „Werkstatttermin planen“ eintragen.');
  const evidence = str(body.evidence, { required: true, max: 300, field: 'Nachweis' });
  const km = body.done_km ? Math.round(num(body.done_km, { min: 0, max: 5000000, field: 'km', grouped: true })) : null;
  if (r.interval_km && km === null) throw bad('validation', 'Kilometerstand bei Durchführung angeben – diese Prüfung hat ein Kilometer-Intervall.');
  const husp = r.kind === 'HU' || r.kind === 'SP';
  const docNext = str(body.next_due_date, { max: 10 });
  const next = docNext || (!husp && r.interval_months ? addMonths(date, r.interval_months) : null);
  const result = body.result ? oneOf(body.result, INSPECTION_RESULTS, 'Prüfergebnis') : null;
  await env.DB.batch([
    env.DB.prepare('UPDATE maintenance_rules SET last_done_date=?, last_done_km=?, next_due_date=?, evidence=?, updated_at=?, due_source=?, planned_date=NULL WHERE id=?')
      .bind(date, km, next, evidence, nowIso(), docNext ? 'nachweis' : (husp ? 'berechnet' : r.due_source || null), ruleId),
    maintEventStmt(env, { rule_id: ruleId, vehicle_id: r.vehicle_id, kind: r.kind, done_date: date, done_km: km, evidence, source: 'erledigt', user_id: user.id }),
    ...(result ? [env.DB.prepare('UPDATE maintenance_events SET result=? WHERE rule_id=? AND done_date=?').bind(result, ruleId, date)] : []),
  ]);
  await audit(env, user.id, 'maintenance.done', r.vehicle_id, { kind: r.kind, done_date: date, result, evidence });
  if (husp) await syncHuSpDues(env, { today: berlinDate(), actorId: user.id, vehicleIds: [r.vehicle_id] });
  if (km !== null) {
    await env.DB.prepare('INSERT OR IGNORE INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at) VALUES (?,?,?,?,?,?,?)')
      // heute erledigt → jetziger Zeitpunkt (12:00 UTC läge morgens in der Zukunft und überdeckte spätere Ablesungen desselben Tages)
      .bind(uuid(), r.vehicle_id, km, date >= berlinDate() ? nowIso() : `${date}T12:00:00.000Z`, `wartung:${r.kind}`, user.id, nowIso()).run();
  }
  // Gefährliche Mängel / verkehrsunsicher: sofort Leitung, Inhaber und Disposition der aktiven Umgebung informieren – nur für aktuelle
  // Prüfungen (≤ 30 Tage, neueste dieser Prüfart), nicht beim Nachtragen alter Berichte. Einmal je Prüfung und Person (event_key).
  const notified = await notifyInspectionDefect(env, ctx, envName, user, { vehicleId: r.vehicle_id, kind: r.kind, date, result, key: ruleId });
  return { ok: true, notified, next_due_date: husp ? (await env.DB.prepare('SELECT next_due_date FROM maintenance_rules WHERE id=?').bind(ruleId).first()).next_due_date : next };
}

export async function addOdometer(env, user, vehicleId, body) {
  if (!['owner', 'fleet', 'workshop', 'driver', 'dispatch'].includes(user.role)) throw forbidden();
  const km = Math.round(num(body.km, { min: 0, max: 5000000, field: 'Kilometerstand', grouped: true }));
  // Ablesedatum optional (nachträgliche Erfassung), nie in der Zukunft; ohne Datum = jetzt
  const now = nowIso();
  let measuredAt = now;
  if (body.measured_on) {
    const d = String(body.measured_on);
    if (!isCalendarDate(d) || d < '2000-01-01') throw bad('validation', 'Ablesedatum ungültig (JJJJ-MM-TT).');
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
export async function importVehiclesCsv(env, user, text, { dryRun = false } = {}) {
  if (user.role !== 'owner') throw forbidden('Nur der Inhaber darf Stammdaten importieren.');
  const table = parseCsv(text);
  if (table.length < 2) throw bad('validation', 'CSV leer.');
  const head = table[0].map((h) => h.trim().toLowerCase());
  const col = (names) => head.findIndex((h) => names.some((n) => h.startsWith(n)));
  const ci = { plate: col(['kennzeichen']), site: col(['standort']), status: col(['status']), man: col(['hersteller']), model: col(['modell', 'typ']), year: col(['baujahr']), vin: col(['fin']), trailer: col(['anhänger', 'anhaenger']), kind: col(['fahrzeugart', 'art']), src: col(['quelle', 'nachweis']) };
  if (ci.plate < 0 || ci.vin < 0) throw bad('validation', 'Spalten Kennzeichen und FIN erforderlich.');
  if (head.some((h) => h.startsWith('reifen') || h === 'art' || h.startsWith('letzte'))) throw bad('wrong_file', 'Das ist keine Fahrzeugstamm-Datei (Reifen- oder Prüfterminspalten erkannt). Bitte im passenden Importfeld hochladen.');
  const result = { imported: 0, skipped: [], dry_run: dryRun, preview: [] };
  const rows = new Map();
  const cell = (cells, i) => (i >= 0 && cells[i] !== undefined && cells[i] !== '' ? cells[i] : null);
  table.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const vin = normalizeVin(cells[ci.vin]);
    if (!isValidVin(vin)) { result.skipped.push({ line, plate: cells[ci.plate], reason: 'FIN ungültig/fehlt' }); return; }
    try {
      const yearRaw = cell(cells, ci.year);
      const row = vehicleRow(user, {
        vin, plate: cells[ci.plate], site: cell(cells, ci.site), master_status: cell(cells, ci.status),
        manufacturer: cell(cells, ci.man), model: cell(cells, ci.model), build_year: yearRaw && /^\d{4}(\.0+)?$/.test(yearRaw) ? parseInt(yearRaw, 10) : null,
        trailer_plate: cell(cells, ci.trailer), kind: cell(cells, ci.kind),
        source: ci.kind >= 0 && cell(cells, ci.src) ? `CSV-Import: ${cell(cells, ci.src).slice(0, 180)}` : 'CSV-Import Fuhrpark Stammliste',
      });
      row._line = line;
      rows.set(row.id, row); // doppelte FIN: letzte Zeile gilt
    } catch (e) { result.skipped.push({ line, plate: cells[ci.plate], reason: e.message }); }
  });
  if (rows.size > 5000) throw bad('validation', 'Maximal 5000 Fahrzeuge je Import.');
  // Vorschau: neu / geändert (welche Felder) / unverändert – gleiche Regel wie beim Übernehmen (leere Felder behalten den Bestand)
  const existing = new Map((await env.DB.prepare('SELECT * FROM vehicles WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify([...rows.keys()])).all()).results.map((v) => [v.id, v]));
  const FIELDS = ['plate', 'site', 'manufacturer', 'model', 'build_year', 'trailer_plate', 'master_status', 'kind'];
  for (const r of rows.values()) {
    const ex = existing.get(r.id);
    if (!ex) { result.preview.push({ line: r._line, vin: r.vin, plate: r.plate, action: 'neu' }); continue; }
    const changes = FIELDS.filter((f) => r[f] !== null && r[f] !== undefined && String(r[f]) !== String(ex[f] ?? '')).map((f) => ({ field: f, from: ex[f], to: r[f] }));
    result.preview.push({ line: r._line, vin: r.vin, plate: r.plate, action: changes.length || !ex.active ? 'geändert' : 'unverändert', changes, reactivated: !ex.active });
  }
  result.preview.sort((a, b) => a.line - b.line);
  result.counts = { neu: result.preview.filter((p) => p.action === 'neu').length, geaendert: result.preview.filter((p) => p.action === 'geändert').length, unveraendert: result.preview.filter((p) => p.action === 'unverändert').length };
  if (dryRun) return result;
  for (const r of rows.values()) delete r._line;
  await upsertVehicleRows(env, [...rows.values()], { keepExisting: true });
  result.imported = rows.size;
  await audit(env, user.id, 'vehicles.import', null, { imported: result.imported, skipped: result.skipped.length, ...result.counts });
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
  if (validUntil && !isCalendarDate(validUntil)) throw bad('validation', 'Gültig bis im Format JJJJ-MM-TT.');
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
