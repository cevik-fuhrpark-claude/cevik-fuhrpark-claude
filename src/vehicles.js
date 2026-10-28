// [CLAUDE] Fahrzeugakten, Fahrerzuordnung, Wartung/Prüftermine, Kilometerstände
import { tachoStatus, warnDaysOf, TACHO_RULE } from './tacho.js';
import { caseDescText } from '../public/check-labels.js';
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, num, oneOf, flag, normalizeVin, isValidVin, addMonths, berlinDate, berlinDayStartIso, parseCsv, isCalendarDate, normPlate, intParam, kmNum, maxFutureDate, DUE_FAR_MSG, plateCmp, cutText } from './util.js';
import { audit, auditStmt } from './auth.js';
import { syncHuSpDues, huSpFor, loadHuSpInputs, ZGM_CLASSES_LKW, ZGM_CLASSES_TRAILER, zgmClassFromKg } from './inspection_rules.js';
import { vehicleCosts, sniffType, VEHICLE_DOC_READ, planDate, WARR_VEH_MAX, caseAccess } from './cases.js';
import { sha256Hex, sha256HexSync, berlinWindowStartIso, berlinDateTime, hideDriverName, dateLang, berlinDaySql, HttpError } from './util.js';
import { vehicleContracts } from './contracts.js';
import { notifyUsers, nt, maintKindLang } from './notify.js';
import { REQUIRED_KINDS, kmDue, ruleDueKm, KM_RATE_WINDOW_DAYS, KM_DROP_SQL, parseKmDrop, kmCounterDropAfter, kmBasisForDone, FIXING_CASE_SQL, defectCase } from './maintenance.js';
import { winterMarks, winterStatus } from './tires.js';
import { lockIntervalsOf, workshopIntervalOf, downtimeByMonth, FIRST_ACK_SQL } from './reports.js';
import { maintenanceWarnDays } from './settings.js';
import { kmRejection } from './telematics.js';

const isManager = (u) => u.role === 'owner' || u.role === 'fleet';
// Feuerlöscher/Verbandkasten/Ladungssicherung: Intervall bzw. Ablaufdatum trägt die Fuhrparkleitung selbst ein (keine Vorgabe der App)
// Rückruf: einmalige Hersteller-/Werkstattaktion (Schreiben bzw. KBA-Referenz als Nachweis), Frist nur laut Schreiben, kein Intervall
export const MAINT_KINDS = ['HU', 'SP', 'UVV', 'Tachograph', 'Ölwechsel', 'Inspektion', 'Bremsen', 'Reifen', 'Hydraulik/Aufbau', 'Feuerlöscher', 'Verbandkasten', 'Ladungssicherung', 'Rückruf', 'Sonstiges'];
export const ONE_TIME_KINDS = ['Rückruf'];
// Arten, die je Fahrzeug mehrfach vorkommen dürfen (mehrere Rückrufe, verschiedene sonstige Prüfungen)
export const MULTI_RULE_KINDS = ['Rückruf', 'Sonstiges'];

// Kennzeichenverlauf (Backlog 256, Migration 0082): je Wechsel das bisherige Kennzeichen; eine Anweisung für alle Zeilen
async function platesInsert(env, list, actorId, source) {
  await env.DB.prepare(`INSERT INTO vehicle_plates(id, vehicle_id, plate, valid_until, changed_by, source)
    SELECT lower(hex(randomblob(16))), json_extract(value,'$.id'), json_extract(value,'$.plate_old'), ?1, ?2, ?3 FROM json_each(?4)
    WHERE EXISTS (SELECT 1 FROM vehicles v WHERE v.id = json_extract(value,'$.id'))`).bind(nowIso(), actorId || null, source, JSON.stringify(list)).run();
}

export async function listVehicles(env, user, envName, query = {}) {
  const active = query.inactive === '1' && isManager(user) ? 0 : 1;
  const today = berlinDate(); // geplante Termine: nur heute oder später (überschrittene zeigt der Werkstattplan)
  const rows = (await env.DB.prepare(`SELECT v.*,
      (SELECT COUNT(*) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS open_cases,
      (SELECT MAX(c.safety_lock) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS locked,
      (SELECT COUNT(*) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status IN ('werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle')) AS in_workshop,
      (SELECT km FROM odometer_readings o WHERE o.vehicle_id=v.id ORDER BY measured_at DESC LIMIT 1) AS last_km,
      (SELECT MAX(measured_at) FROM odometer_readings o WHERE o.vehicle_id=v.id) AS last_km_at,
      (SELECT MIN(next_due_date) FROM maintenance_rules m WHERE m.vehicle_id=v.id AND m.next_due_date IS NOT NULL AND m.kind NOT IN ('HU','SP') AND NOT (m.kind='Rückruf' AND m.last_done_date IS NOT NULL)) AS next_due, -- erledigter Rückruf hat keine Frist (wie Übersicht/Agent, 20.10.2026)
      -- nächste km-Fälligkeit (belegter Wert vor „km bei letzter Durchführung + Intervall“, wie ruleDueKm; HU/SP nur nach Datum)
      -- + Zeitpunkt der km-Grundlage dieser Regel und letzter km-Rücksprung (Tachotausch) – wie kmDue: danach kein Rest aus gemischten Zählern
      (SELECT x.k || '|' || x.kb || '|' || x.ldk || '|' || x.ldd || '|' || x.kind FROM (SELECT COALESCE(m.due_km, m.last_done_km + NULLIF(m.interval_km, 0)) AS k, COALESCE(m.km_basis_at, m.updated_at, '') AS kb,
          COALESCE(m.last_done_km, '') AS ldk, COALESCE(m.last_done_date, '') AS ldd, m.kind FROM maintenance_rules m
        WHERE m.vehicle_id=v.id AND m.kind NOT IN ('HU','SP') AND NOT (m.kind='Rückruf' AND m.last_done_date IS NOT NULL)) x WHERE x.k IS NOT NULL ORDER BY x.k, x.kind LIMIT 1) AS next_km,
      ${KM_DROP_SQL('v.id')} AS km_drop,
      (SELECT i.created_at || '|' || i.result FROM inspections i WHERE i.vehicle_id=v.id AND i.environment=? AND i.kind='abfahrt' ORDER BY i.created_at DESC LIMIT 1) AS last_check,
      (SELECT MIN(c.planned_date) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status IN ('werkstatt_freigegeben','in_reparatur','wartet_teile') AND c.planned_date >= ?) AS planned_workshop_date,
      (SELECT m.planned_date || '|' || group_concat(m.kind, ', ') FROM maintenance_rules m WHERE m.vehicle_id=v.id AND m.planned_date = (SELECT MIN(m2.planned_date) FROM maintenance_rules m2 WHERE m2.vehicle_id=v.id AND m2.planned_date >= ?)) AS planned_inspection,
      (SELECT MAX(c.parts_expected_date) FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status='wartet_teile') AS parts_expected_date,
      -- jüngste Prüfung (≤ 12 Monate) mit gefährlichen Mängeln/verkehrsunsicher, keine neuere derselben Art, kein Vorgang seitdem (wie „Prüfmangel ohne Auftrag“)
      (SELECT e.kind || '|' || e.done_date || '|' || e.result FROM maintenance_events e WHERE e.vehicle_id=v.id AND v.eval_excluded=0 AND e.done_date >= ?
        AND e.result IN ('gefaehrliche_maengel','verkehrsunsicher')
        AND NOT EXISTS (SELECT 1 FROM maintenance_events e2 WHERE e2.vehicle_id=e.vehicle_id AND e2.kind=e.kind AND e2.id<>e.id
          AND (e2.done_date > e.done_date OR (e2.done_date = e.done_date AND e2.created_at > e.created_at)))
        AND NOT EXISTS (SELECT 1 FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.status<>'abgelehnt' AND ${berlinDaySql('c.created_at')} >= e.done_date AND ${FIXING_CASE_SQL})
        ORDER BY e.result='verkehrsunsicher' DESC, e.done_date DESC LIMIT 1) AS failed_insp,
      (SELECT COUNT(*) FROM vehicle_notes n WHERE n.vehicle_id=v.id AND n.environment=? AND n.archived_at IS NULL AND (n.valid_until IS NULL OR n.valid_until >= ?)) AS notes_active,
      -- offene Herstellerrückrufe (noch nicht durchgeführt; gleiche Regel wie Vorgangs-Kurzinfo „Zum Fahrzeug“), Frist nur laut Schreiben
      (SELECT COUNT(*) FROM maintenance_rules m WHERE m.vehicle_id=v.id AND m.kind='Rückruf' AND m.last_done_date IS NULL) AS open_recalls,
      -- offene Befunde des Fuhrparkagenten (Umgebung der Person) über idx_findings_vehicle; nur Inhaber/Fuhrparkleitung bekommen die Zahlen
      (SELECT COUNT(*) || '|' || COALESCE(SUM(f.severity='kritisch'), 0) FROM agent_findings f WHERE f.vehicle_id=v.id AND f.environment=? AND f.status='offen') AS af,
      -- frühere Kennzeichen (Backlog 256): Suche nach dem alten Kennzeichen findet das Fahrzeug
      (SELECT group_concat(p.plate, '|') FROM (SELECT plate FROM vehicle_plates p WHERE p.vehicle_id=v.id ORDER BY p.valid_until DESC LIMIT 10) p) AS fp
    FROM vehicles v WHERE v.active=? ORDER BY v.plate`).bind(envName, envName, envName, envName, envName, today, today, envName, addMonths(today, -12), envName, envName, today, envName, active).all()).results;
  // letzte Abfahrtskontrolle je Fahrzeug – nur Information (ohne Einsatzplan keine Pflichtbewertung)
  for (const v of rows) { const [at, result] = v.last_check ? v.last_check.split('|') : [null, null]; v.last_check_at = at; v.last_check_result = result; delete v.last_check;
    v.former_plates = v.fp ? [...new Set(String(v.fp).split('|').filter((x) => x && x !== v.plate))] : []; delete v.fp;
    // nächster geplanter Prüftermin ab heute + Prüfart(en) an diesem Tag
    const [pd, pk] = v.planned_inspection ? v.planned_inspection.split('|') : [null, null]; v.planned_inspection_date = pd; v.planned_inspection_kind = pk || null; delete v.planned_inspection;
    // km-Fälligkeit: Rest-km nur mit erfasstem km-Stand (keine Schätzung)
    const nkp = v.next_km ? String(v.next_km).split('|') : null;
    const [nk, nkb, nldk, nldd, nkk] = nkp ? [Number(nkp[0]), nkp[1] || null, nkp[2] === '' ? null : Number(nkp[2]), nkp[3] || null, nkp.slice(4).join('|')] : [null, null, null, null, null];
    // wie kmDue: belegter km-Stand der letzten Durchführung zählt, wenn die letzte Ablesung älter ist (18.10.2026)
    const curKm = v.last_km !== null && v.last_km !== undefined && nldk !== null && nldk > v.last_km && nldd && v.last_km_at && berlinDate(v.last_km_at) <= nldd ? nldk : v.last_km;
    v.next_due_km = nk; v.next_due_km_kind = nkk; v.km_remaining = nk !== null && curKm !== null && curKm !== undefined ? nk - curKm : null; delete v.next_km;
    // km-Zähler nach der letzten Änderung der km-Grundlage gesunken (Tachotausch): Rest wäre aus gemischten Zählern → kein Wert, Kennzeichen
    const drop = parseKmDrop(v.km_drop); delete v.km_drop;
    if (nk !== null && kmCounterDropAfter({ km_basis_at: nkb }, drop)) { v.km_remaining = null; v.km_unclear = 'counter_drop'; v.km_drop_at = drop.drop_at; }
    // Agentenbefunde je Fahrzeug: nur für Inhaber/Fuhrparkleitung (gleiche Sichtbarkeit wie Management-Panel und Fahrzeugakte)
    if (isManager(user)) { const [an, ac] = String(v.af || '0|0').split('|'); v.agent_findings_open = Number(an) || 0; v.agent_findings_critical = Number(ac) || 0; }
    delete v.af;
    const fi = v.failed_insp ? v.failed_insp.split('|') : null; v.failed_inspection = fi ? { kind: fi[0], done_date: fi[1], result: fi[2] } : null; delete v.failed_insp; }
  // HU/SP ohne eigenen Eintrag mit berechenbarer Frist (z. B. SP aus HU + Erstzulassung) zählt für „nächste Prüfung“ mit – wie Übersicht,
  // Akte, Agent und Fahrer-Startseite (21.10.2026: Fahrzeugliste „Prüfung überfällig“ und /v1/availability übersahen eine überfällige berechnete SP)
  if (rows.length) {
    const hin = await loadHuSpInputs(env, rows.map((v) => v.id));
    const wd = maintenanceWarnDays((await env.DB.prepare(`SELECT value FROM settings WHERE key='maintenance_warn_days'`).first() || {}).value);
    const byId = new Map(rows.map((v) => [v.id, v]));
    for (const [vid, x] of hin) {
      const v = byId.get(vid); if (!v) continue;
      const h = huSpFor(x, today, wd);
      for (const kind of ['HU', 'SP']) {
        const y = kind === 'HU' ? h.hu : h.sp;
        // HU/SP immer nach der zentralen Regel (wie Übersicht/Agent/Akte): ein gespeicherter Rohwert galt sonst auch nach „nicht SP-pflichtig“ (21.10.2026)
        if (!y || !y.due || y.status === 'nicht_sp_pflichtig') continue;
        if (!v.next_due || y.due < v.next_due) v.next_due = y.due;
      }
    }
  }
  // gleiches Kennzeichen (ruhendes Doppel mit FIN-Tippfehler): das bewertete Fahrzeug gilt für die Kopplung (wie pickVehicleByPlate;
  // vorher gewann die zuletzt gelesene Zeile – das ruhende Doppel stand als „einsatzbereit“ im Gespann, die Sperre fehlte, 18.10.2026)
  const byPlate = new Map();
  for (const v of rows) { const k = normPlate(v.plate); const p = byPlate.get(k); if (!p || (p.eval_excluded && !v.eval_excluded)) byPlate.set(k, v); }
  const pulledBy = new Map();
  for (const v of rows) if (v.kind === 'lkw' && v.trailer_plate) { const tr = byPlate.get(normPlate(v.trailer_plate)); const p = tr && pulledBy.get(tr.id); if (tr && tr.kind === 'anhaenger' && (!p || (p.eval_excluded && !v.eval_excluded))) pulledBy.set(tr.id, v); }
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
    // Prüfstand des gekoppelten Fahrzeugs (25.10.2026, Teilagent „Disposition sucht Ersatzfahrzeug“): Lkw-Zeile zeigte „Keine offenen Meldungen“,
    // obwohl der Anhänger HU/SP überfällig oder „verkehrsunsicher“ war – nur Information, availability bleibt unverändert
    v.coupled = p ? { id: p.id, plate: p.plate, kind: p.kind, availability: p.availability, eval_excluded: p.eval_excluded ? 1 : 0, next_due: p.next_due || null,
      km_remaining: p.km_remaining ?? null, failed_inspection: p.failed_inspection || null } : null;
  }
  if (user.role === 'driver') {
    const assigned = (await env.DB.prepare(`SELECT vehicle_id FROM driver_vehicles WHERE user_id=? AND (valid_to IS NULL OR valid_to > ?)`).bind(user.id, nowIso()).all()).results.map((r) => r.vehicle_id);
    list = list.map((v) => ({ id: v.id, plate: v.plate, kind: v.kind, site: v.site, manufacturer: v.manufacturer, trailer_plate: v.trailer_plate, truck_plate: v.truck_plate, assigned: assigned.includes(v.id), availability: v.availability, coupled: v.coupled && { id: v.coupled.id, plate: v.coupled.plate, kind: v.coupled.kind, availability: v.coupled.availability } })); // Fahrer: Prüfstand des Gespanns wie bisher nicht in der Liste
    list.sort((a, b) => (b.assigned - a.assigned) || plateCmp(a.plate, b.plate));
  } else list.sort((a, b) => plateCmp(a.plate, b.plate)); // Auswahllisten (Melden, Kontrolle) übernehmen diese Reihenfolge
  return list;
}

// „Prüfung nicht bestanden“ für die Fahrzeugakte – gleiche Regel wie die Unterabfrage in listVehicles:
// jüngste Prüfung (≤ 12 Monate) mit gefährlichen Mängeln/verkehrsunsicher, keine neuere derselben Art, kein passender Vorgang (FIXING_CASE_SQL, außer abgelehnt) seitdem;
// verkehrsunsicher vor gefährlichen Mängeln, dann neueste. Nur Information – ändert keine Verfügbarkeit.
export function failedInspectionOf(v, events, cases, since) {
  if (v.eval_excluded) return null;
  const newer = (e2, e) => e2.kind === e.kind && e2.id !== e.id && (e2.done_date > e.done_date || (e2.done_date === e.done_date && e2.created_at > e.created_at));
  const hits = events.filter((e) => e.done_date >= since && ['gefaehrliche_maengel', 'verkehrsunsicher'].includes(e.result)
    && !events.some((e2) => newer(e2, e)) && !cases.some((c) => c.status !== 'abgelehnt' && berlinDate(c.created_at) >= e.done_date && defectCase(c, e))); // Berliner Tag wie SQL (17.10.2026)
  hits.sort((a, b) => (b.result === 'verkehrsunsicher') - (a.result === 'verkehrsunsicher') || (b.done_date > a.done_date ? 1 : b.done_date < a.done_date ? -1 : 0));
  return hits[0] ? { kind: hits[0].kind, done_date: hits[0].done_date, result: hits[0].result, event_id: hits[0].id } : null;
}

export const MAINT_HIST_MAX = 200; // Prüf-/Wartungsverlauf in der Fahrzeugakte (ältere: Zeitleiste)
// opts.timeline: nur die Teile laden, die die Zeitleiste braucht (gleiche Rechte, weniger D1-Abfragen)
export async function vehicleDetail(env, user, envName, vehicleId, opts = {}) {
  const tl = !!opts.timeline;
  // Zeitleiste: je Quelle bis zu `cap` Einträge (Anzeige-Grenze + 1) – sonst fehlten ältere Kontrollen/km-Stände ohne Hinweis
  const cap = tl ? Math.min(Math.max(Number(opts.cap) || 0, 0), 1001) : 0;
  const inspCap = cap || 51; // Akte: 50 anzeigen, eine mehr lesen → inspections_truncated (Hinweis + Link zur Zeitleiste)
  if (user.role === 'driver') throw forbidden('Fahrzeugakten sind für Fahrer nicht freigegeben.');
  // Kennzeichenverlauf (Backlog 256) in derselben Abfrage (Abfragebudget der Akte)
  const v = await env.DB.prepare(`SELECT v.*, (SELECT json_group_array(json_object('plate', p.plate, 'valid_until', p.valid_until)) FROM (SELECT plate, valid_until FROM vehicle_plates p
      WHERE p.vehicle_id=v.id ORDER BY valid_until DESC LIMIT 20) p) AS fp_json FROM vehicles v WHERE v.id=?`).bind(vehicleId).first();
  if (!v) throw notFound('Fahrzeug nicht gefunden.');
  let formerPlates = []; try { formerPlates = JSON.parse(v.fp_json || '[]').filter((x) => x.plate !== v.plate); } catch { formerPlates = []; }
  delete v.fp_json;
  // außer Betrieb: Zeitpunkt (und für Inhaber/Fuhrparkleitung Grund und Person) laut letztem Protokolleintrag – ohne Eintrag (z. B. Import) null
  const deact = !v.active && !tl ? await env.DB.prepare(`SELECT a.created_at, a.detail, u.display_name FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id
    WHERE a.target=? AND a.action='vehicle.deactivate' ORDER BY a.created_at DESC LIMIT 1`).bind(vehicleId).first() : null;
  let inactiveInfo = null;
  if (deact) {
    let reason = null; try { reason = JSON.parse(deact.detail || '{}').reason || null; } catch { reason = null; }
    inactiveInfo = isManager(user) ? { since: deact.created_at, reason, by_name: deact.display_name || null } : { since: deact.created_at };
  }
  let caseRows = (await env.DB.prepare(`SELECT id, case_no, status, priority, description, created_at, closed_at, workshop_ack_at, ${FIRST_ACK_SQL('cases')}, workshop_site, origin, parent_case_id, safety_lock, maintenance_rule_id, maintenance_event_id, reporter_id, (SELECT u.role FROM users u WHERE u.id=cases.reporter_id) AS reporter_role, suggested_workshop_site, vehicle_location, vehicle_location_at, tow_service, towed_on, handover_keys, handover_papers, pickup_note
    FROM cases WHERE vehicle_id=? AND environment=? ORDER BY created_at DESC`).bind(vehicleId, envName).all()).results;
  const allCases = caseRows; // ungefiltert – für „Prüfung nicht bestanden“ (gleiche Regel wie Fahrzeugliste)
  // Vorgänge, die die Person öffnen darf – Verweise (Kontrolle, Reifenereignis) nur darauf verlinken (22.10.2026: Werkstatt sah in Akte/Zeitleiste
  // „Details“-Links auf Vorgänge einer anderen Werkstatt → „Vorgang nicht gefunden“)
  const okCase = ['owner', 'fleet', 'dispatch', 'viewer'].includes(user.role) ? null : new Set(allCases.filter((c) => caseAccess(user, c)).map((c) => c.id));
  if (user.role === 'workshop') caseRows = caseRows.filter((c) => c.workshop_site === user.workshop_site && c.status !== 'gemeldet');
  caseRows = caseRows.map(({ reporter_id: _r, reporter_role: _rr, suggested_workshop_site: _s, ...c }) => c);
  const inspections = (await env.DB.prepare(`SELECT i.id, i.kind, i.result, i.odometer_km, i.created_at, i.received_at, i.case_id, u.display_name AS performed_by_name, CASE WHEN u.role='driver' OR u.was_driver=1 THEN 'driver' ELSE u.role END AS performed_by_role
    FROM inspections i JOIN users u ON u.id=i.performed_by WHERE i.vehicle_id=? AND i.environment=? ORDER BY i.created_at DESC LIMIT ?`).bind(vehicleId, envName, inspCap).all()).results;
  // letzte Abfahrtskontrolle (nur Information); meist in den letzten 50 Kontrollen enthalten, sonst gezielt nachladen
  const lastCheck = inspections.find((i) => i.kind === 'abfahrt') || (inspections.length < inspCap ? null
    : await env.DB.prepare(`SELECT i.id, i.kind, i.result, i.odometer_km, i.created_at, i.received_at, i.case_id, u.display_name AS performed_by_name, CASE WHEN u.role='driver' OR u.was_driver=1 THEN 'driver' ELSE u.role END AS performed_by_role
        FROM inspections i JOIN users u ON u.id=i.performed_by WHERE i.vehicle_id=? AND i.environment=? AND i.kind='abfahrt' ORDER BY i.created_at DESC LIMIT 1`).bind(vehicleId, envName).first());
  const inspectionsTruncated = !tl && inspections.length > 50; if (inspectionsTruncated) inspections.length = 50;
  for (const i of inspections) hideDriverName(user, i, 'performed_by_name', 'performed_by_role');
  if (lastCheck && !inspections.includes(lastCheck)) hideDriverName(user, lastCheck, 'performed_by_name', 'performed_by_role');
  if (okCase) for (const i of [...inspections, ...(lastCheck ? [lastCheck] : [])]) if (i.case_id && !okCase.has(i.case_id)) i.case_id = null;
  // Wiederkehrende Mängel: gleicher Prüfpunkt mindestens 2× als Mangel in Kontrollen der letzten 90 Tage
  const recurring = tl ? [] : (await env.DB.prepare(`SELECT json_extract(j.value,'$.key') AS item, COUNT(*) AS n, MAX(i.created_at) AS last_at
    FROM inspections i, json_each(i.items) j WHERE i.vehicle_id=? AND i.environment=? AND i.created_at >= ? AND json_extract(j.value,'$.result')='mangel'
    GROUP BY item HAVING COUNT(*) >= 2 ORDER BY n DESC, last_at DESC`).bind(vehicleId, envName, berlinWindowStartIso(90)).all()).results;
  const maintenance = (await env.DB.prepare('SELECT * FROM maintenance_rules WHERE vehicle_id=? ORDER BY next_due_date IS NULL, next_due_date').bind(vehicleId).all()).results;
  const maintenanceHistory = (await env.DB.prepare(`SELECT e.id, e.rule_id, e.kind, e.done_date, e.done_km, e.evidence, e.source, e.result, e.created_at, u.display_name AS recorded_by_name
    FROM maintenance_events e LEFT JOIN users u ON u.id=e.recorded_by WHERE e.vehicle_id=? ORDER BY e.done_date DESC, e.created_at DESC LIMIT ?`).bind(vehicleId, Math.max(cap, MAINT_HIST_MAX + 1)).all()).results;
  // Akte: dieselbe Abfrage liefert auch die Ablesungen für „Fahrleistung je Monat“ (Fenster + letzte davor) – kein Zusatzaufruf (Abfragebudget)
  const mileageLo = tl ? null : berlinDayStartIso(`${addMonths(`${berlinDate().slice(0, 7)}-01`, -(MILEAGE_MONTHS - 1)).slice(0, 7)}-01`);
  const odoRows = tl
    ? (await env.DB.prepare('SELECT id, km, measured_at, source, note, km_drop_prev IS NOT NULL AS km_drop FROM odometer_readings WHERE vehicle_id=? ORDER BY measured_at DESC LIMIT ?').bind(vehicleId, cap || 20).all()).results
    : (await env.DB.prepare(`SELECT id, km, measured_at, source, note, km_drop_prev IS NOT NULL AS km_drop, ${KM_DROP_SQL('?1')} AS drop_at FROM odometer_readings WHERE vehicle_id=?1 AND (measured_at >= ?2
        OR rowid IN (SELECT rowid FROM odometer_readings WHERE vehicle_id=?1 ORDER BY measured_at DESC, created_at DESC LIMIT 20)
        OR rowid IN (SELECT rowid FROM odometer_readings WHERE vehicle_id=?1 AND measured_at < ?2 ORDER BY measured_at DESC, created_at DESC LIMIT 1))
      ORDER BY measured_at DESC, created_at DESC`).bind(vehicleId, mileageLo).all()).results;
  // letzter km-Rücksprung (Tachotausch o. Ä.; gleiche Regel wie Prüftermin-Übersicht) – Spalte derselben Abfrage, nicht je Ablesung ausgeben
  const kmDrop = parseKmDrop(odoRows.length ? odoRows[0].drop_at : null);
  for (const o of odoRows) delete o.drop_at;
  const odometer = odoRows.slice(0, cap || 20);
  const drivers = isManager(user) || user.role === 'dispatch'
    ? (await env.DB.prepare(`SELECT d.id, d.valid_from, d.valid_to, d.evidence, u.display_name, u.id AS user_id FROM driver_vehicles d JOIN users u ON u.id=d.user_id
        WHERE d.vehicle_id=? AND d.environment=? ORDER BY d.valid_from DESC`).bind(vehicleId, envName).all()).results
      // Nachweistext der Zuordnung (frei, z. B. „Personalakte 12“) nur für Inhaber/Leitung – Disposition sieht Name und Zeitraum (23.10.2026,
      // Teilagent „Disposition erster Tag“: Zeitleiste zeigte ihn, die Akte nicht)
      .map((r) => (isManager(user) ? r : { ...r, evidence: null }))
    : [];
  // Kopplung Lkw ↔ Anhänger laut Stammliste (Spalte „Anhänger Kennzeichen“ des Lkw)
  // locked: Sicherheitssperre eines offenen Vorgangs des gekoppelten Fahrzeugs in dieser Umgebung (nur Information)
  const all = tl ? [] : (await env.DB.prepare(`SELECT v.id, v.plate, v.kind, v.trailer_plate, EXISTS (SELECT 1 FROM cases c WHERE c.vehicle_id=v.id AND c.environment=? AND c.safety_lock=1
    AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS locked, v.eval_excluded FROM vehicles v WHERE v.active=1`).bind(envName).all()).results;
  // ruhende Doppel nur, wenn es kein bewertetes Fahrzeug mit dem Kennzeichen gibt (18.10.2026)
  const preferEval = (xs) => (xs.some((x) => !x.eval_excluded) ? xs.filter((x) => !x.eval_excluded) : xs);
  const coupled = v.kind === 'anhaenger'
    ? preferEval(all.filter((x) => x.kind === 'lkw' && x.trailer_plate && normPlate(x.trailer_plate) === normPlate(v.plate))).map((x) => ({ id: x.id, plate: x.plate, kind: 'lkw', locked: !!x.locked }))
    : preferEval(all.filter((x) => x.kind === 'anhaenger' && v.trailer_plate && normPlate(x.plate) === normPlate(v.trailer_plate))).map((x) => ({ id: x.id, plate: x.plate, kind: 'anhaenger', locked: !!x.locked }));
  const documents = VEHICLE_DOC_READ.includes(user.role)
    ? (await env.DB.prepare(`SELECT f.id, f.filename, f.content_type, f.size, f.doc_kind, f.doc_note, f.doc_valid_until, f.created_at, u.display_name AS uploaded_by_name FROM files f JOIN users u ON u.id=f.uploaded_by
        WHERE f.vehicle_id=? AND f.case_id IS NULL AND f.environment=? ORDER BY f.created_at DESC`).bind(vehicleId, envName).all()).results
    : [];
  // Letzter Telematik-Stand (nur Inhaber, Fuhrparkleitung, Disposition – Positionsdaten sind über die Fahrerzuordnung personenbeziehbar)
  const telematics = !tl && (isManager(user) || user.role === 'dispatch')
    ? (await env.DB.prepare(`SELECT t.provider, t.external_id, t.match_basis, t.gps_time, COALESCE(t.km_at, t.gps_time) AS km_time, t.received_at, t.lat, t.lon, t.km, t.speed, t.ignition, t.source_plate,
        (SELECT o.km FROM odometer_readings o WHERE o.vehicle_id=t.vehicle_id AND o.measured_at <= COALESCE(t.km_at, t.gps_time) ORDER BY o.measured_at DESC LIMIT 1) AS prev_km,
        (SELECT json_object('km', o.km, 'at', o.measured_at, 'note', o.note) FROM odometer_readings o WHERE o.vehicle_id=t.vehicle_id AND o.measured_at > COALESCE(t.km_at, t.gps_time) ORDER BY o.measured_at ASC LIMIT 1) AS next_json
        FROM telematics_latest t WHERE t.vehicle_id=? ORDER BY t.gps_time DESC`).bind(vehicleId).all()).results
      // Gerät meldet ein anderes Kennzeichen (gleiche Regel wie Datenqualität telematics_plate_mismatch) – nur Hinweis, keine Korrektur;
      // km kleiner als der zuvor erfasste Stand (gleiche Regel wie telematics_km_rejected) → km_rejected_below = erfasster Stand
      // oder größer als ein später erfasster Stand ohne Begründung → km_rejected_above = { km, at } (seit 18.10.2026, wie Datenqualität)
      .map(({ source_plate, prev_km, next_json, km_time, ...x }) => { const rej = kmRejection({ ...x, km_time, prev_km, next_json });
        return { ...x, reported_plate: source_plate && normPlate(source_plate) !== normPlate(v.plate) ? source_plate : null,
          km_rejected_below: rej && rej.direction === 'below' ? rej.recorded_km : null,
          km_rejected_above: rej && rej.direction === 'above' ? { km: rej.recorded_km, at: rej.recorded_at } : null }; })
    : [];
  const sets = new Map((await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN ('maintenance_warn_days','tacho_warn_days','contract_warn_days')`).all()).results.map((r) => [r.key, r.value]));
  const husp = tl ? null : huSpFor((await loadHuSpInputs(env, [vehicleId])).get(vehicleId), berlinDate(), maintenanceWarnDays(sets.get('maintenance_warn_days')));
  const failedInspection = failedInspectionOf(v, maintenanceHistory, allCases, addMonths(berlinDate(), -12));
  // Pflichtprüfung in der App erfasst (≤ 180 Tage, neueste ihrer Art) ohne Prüfergebnis – gleiche Regel wie Datenqualität `inspection_no_result`, ohne Zusatzabfrage
  const sinceNr = berlinDate(new Date(Date.now() - 180 * 86400000).toISOString()); // Berliner Tag wie noResultSql (Datenqualität/„Heute zu tun“, 20.10.2026)
  const newer = (a, b) => b.done_date > a.done_date || (b.done_date === a.done_date && b.created_at > a.created_at);
  const resultMissing = v.active && !v.eval_excluded ? maintenanceHistory.filter((e) => e.result === null && ['erfasst', 'erledigt'].includes(e.source) && REQUIRED_KINDS.includes(e.kind)
    && e.done_date >= sinceNr && !maintenanceHistory.some((x) => x.id !== e.id && x.kind === e.kind && newer(e, x))).map((e) => ({ event_id: e.id, kind: e.kind, done_date: e.done_date })) : [];
  // Fahrleistungs-Prognose für km-Fälligkeiten (nur Planungshilfe, gleiche Regel wie die Prüftermin-Übersicht) – Abfrage nur bei km-Regeln
  if (!tl && odometer[0] && maintenance.some((m) => ruleDueKm(m) !== null)) {
    const b = await env.DB.prepare(`SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? AND measured_at >= date(?, '-${KM_RATE_WINDOW_DAYS} days') ORDER BY measured_at LIMIT 1`).bind(vehicleId, odometer[0].measured_at).first();
    const latest = { km: odometer[0].km, measured_at: odometer[0].measured_at, ...kmDrop, base_km: b ? b.km : null, base_at: b ? b.measured_at : null };
    const today = berlinDate();
    for (const m of maintenance) if (ruleDueKm(m) !== null) {
      const k = kmDue(m, latest, null, today); m.km_forecast = k ? k.km_forecast || null : null;
      if (k && k.km_unclear) { m.km_unclear = k.km_unclear; m.km_drop_at = k.km_drop_at; }
    }
  }
  // Akte: Verlauf höchstens MAINT_HIST_MAX (eine Zeile mehr gelesen → maintenance_history_truncated, App verlinkt die Zeitleiste „Prüfungen“).
  // Erst nach failedInspection/resultMissing kürzen – die Hinweise nutzen alle gelesenen Ereignisse.
  const maintTruncated = !tl && maintenanceHistory.length > MAINT_HIST_MAX; if (maintTruncated) maintenanceHistory.length = MAINT_HIST_MAX;
  // Sicherheitssperre aus allen Vorgängen (Werkstatt sieht nur eigene/übernommene – Kennzeichen zeigte dort sonst kein Schloss, 20.10.2026)
  const locked = allCases.some((c) => c.safety_lock && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status));
  // Kennzeichenverlauf (Backlog 256): bisherige Kennzeichen mit „bis“ (Zeitpunkt der Änderung in der App)
  const out = { former_plates: tl ? [] : formerPlates, locked, inactive_info: inactiveInfo, failed_inspection: failedInspection, result_missing: resultMissing, vehicle: v, telematics, cases: caseRows, inspections, ...(tl ? {} : { inspections_truncated: inspectionsTruncated }), last_check: lastCheck || null, recurring_defects: recurring, maintenance, maintenance_history: maintenanceHistory, ...(tl ? {} : { maintenance_history_truncated: maintTruncated, maintenance_history_max: MAINT_HIST_MAX }), odometer, drivers, coupled, documents, hu_sp: husp };
  if (okCase) Object.defineProperty(out, '_okCase', { value: okCase, enumerable: false });
  if (isManager(user)) {
    if (!tl) {
    out.costs = await vehicleCosts(env, envName, vehicleId);
    out.warranties = out.costs.warranties; out.warranties_truncated = out.costs.warranties_truncated; out.warranties_max = WARR_VEH_MAX; delete out.costs.warranties; delete out.costs.warranties_truncated; // laufende Gewährleistungen (nur Leitung, wie die Kosten)
    // Versicherungsfälle des Fahrzeugs (Umgebung wie die Vorgänge): Anzahl, offen, Summe eingetragener Erstattungen – nicht mit den Kosten verrechnet
    out.claims_summary = await env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ('gemeldet','in_pruefung') THEN 1 ELSE 0 END) AS open,
      SUM(reimbursed_net) AS reimbursed_net FROM insurance_claims WHERE vehicle_id=? AND environment=?`).bind(vehicleId, envName).first();
    out.claims_summary = { total: out.claims_summary.total, open: out.claims_summary.open || 0, reimbursed_net: out.claims_summary.reimbursed_net === null ? null : Math.round(out.claims_summary.reimbursed_net * 100) / 100 };
    // Offene Befunde des Fuhrparkagenten zu diesem Fahrzeug (Umgebung der Person; gleiche Sichtbarkeit wie das Management-Panel) – schwerste zuerst
    // Ausfall je Berliner Monat (letzte 12): Werkstatt-Übernahme → Freigabe/Ablehnung (offen bis jetzt) ∪ Sicherheitssperre – gleiche Regel wie Kennzahlen
    out.downtime = await vehicleDowntime(env, envName, vehicleId, allCases, v.created_at);
    out.agent_findings = (await env.DB.prepare(`SELECT id, finding_code, subject_key, severity, message, message_args, next_action, owner_role, case_id, first_seen FROM agent_findings
      WHERE vehicle_id=? AND environment=? AND status='offen'
      ORDER BY CASE severity WHEN 'kritisch' THEN 0 WHEN 'handeln' THEN 1 WHEN 'hinweis' THEN 2 ELSE 3 END, first_seen`).bind(vehicleId, envName).all()).results;
    }
    // Verträge (Leasing/Miete/…): km-Auswertung mit dem letzten km-Stand der Akte
    out.contracts = await vehicleContracts(env, vehicleId, odometer[0] ? { ...odometer[0], ...kmDrop } : null, sets, envName);
    if (v.kind !== 'anhaenger') {
      // Massenspeicher-Auslesungen (FPersV § 2 Abs. 5: spätestens alle 90 Tage) – Frist nur ab erfasster Auslesung
      // Verlauf wie in der Fahrerakte: eine Zeile mehr lesen und Kürzung melden (20.10.2026: still bei 20 abgeschnitten)
      const dlMax = cap || 100;
      out.tacho_downloads = (await env.DB.prepare(`SELECT t.id, t.downloaded_on, t.evidence, t.note, t.cancelled_at, t.cancel_reason, u.display_name AS created_by_name FROM tacho_downloads t LEFT JOIN users u ON u.id=t.created_by
        WHERE t.vehicle_id=? AND t.environment=?${tl ? ' AND t.cancelled_at IS NULL' : ''} ORDER BY t.downloaded_on DESC LIMIT ?`).bind(vehicleId, envName, dlMax + 1).all()).results;
      out.tacho_downloads_truncated = out.tacho_downloads.length > dlMax; if (out.tacho_downloads_truncated) out.tacho_downloads.length = dlMax;
      // letzte gültige Auslesung unabhängig vom angezeigten Ausschnitt (stornierte zählen nicht, 18.10.2026)
      const validVu = out.tacho_downloads.find((x) => !x.cancelled_at) || (out.tacho_downloads_truncated ? await env.DB.prepare('SELECT MAX(downloaded_on) AS downloaded_on FROM tacho_downloads WHERE vehicle_id=? AND environment=? AND cancelled_at IS NULL').bind(vehicleId, envName).first() : null);
      out.tacho = { ...tachoStatus(validVu && validVu.downloaded_on ? validVu.downloaded_on : null, TACHO_RULE.vu_days, berlinDate(), warnDaysOf(sets)), rule: TACHO_RULE };
    }
  }
  // Fahrleistung je Monat (16.10.2026) – nur aus gespeicherten Kilometerständen, keine Schätzung (alle, die die Akte sehen)
  if (!tl) out.mileage = vehicleMileage(odoRows, mileageLo);
  // Vorwarnung Prüftermine (Tage) für die Fälligkeitsfarbe der Akte – gleiche Einstellung wie Übersicht/Server (18.10.2026; vorher fest 30)
  if (!tl) out.maintenance_warn_days = maintenanceWarnDays(sets.get('maintenance_warn_days'));
  // Gültigkeit je Dokument wie der Agent (DOCUMENT_EXPIRED/…_EXPIRES_SOON, gleiche Vorwarnung): maßgeblich ist je Art (bei „sonstiges“ je Thema)
  // das Dokument mit dem spätesten „gültig bis“; ältere derselben Art gelten als abgelöst (19.10.2026: Akte zeigte Ablauf nicht an)
  if (documents.length) {
    const today = berlinDate(); const w = maintenanceWarnDays(sets.get('maintenance_warn_days'));
    const keyOf = (f) => `${f.doc_kind || 'sonstiges'}|${f.doc_kind === 'sonstiges' ? String(f.doc_note || '').replace(/^ +| +$/g, '').replace(/[A-Z]/g, (c) => c.toLowerCase()) : ''}`; // wie SQLite lower()/trim() im Agenten (nur ASCII, 20.10.2026)
    const maxBy = new Map();
    for (const f of documents) if (f.doc_valid_until && (!maxBy.has(keyOf(f)) || f.doc_valid_until > maxBy.get(keyOf(f)))) maxBy.set(keyOf(f), f.doc_valid_until);
    for (const f of documents) {
      if (!f.doc_valid_until) { f.doc_status = null; continue; }
      if (f.doc_valid_until < maxBy.get(keyOf(f))) { f.doc_status = 'abgeloest'; continue; }
      const days = Math.round((Date.parse(f.doc_valid_until) - Date.parse(today)) / 86400000);
      f.doc_status = (!v.active || v.eval_excluded) ? null : days < 0 ? 'abgelaufen' : days <= w ? 'laeuft_ab' : 'gueltig';
    }
  }
  return out;
}

// [CLAUDE] Fahrleistung je Berliner Monat (letzte 12, neuester zuerst) aus gespeicherten Ablesungen – keine Interpolation:
// km des Monats = letzte Ablesung im Monat − letzte Ablesung vor dem Monat. Liegt diese vor dem Vormonat, umfasst der Wert
// mehrere Monate (`spans`, mit `from_at`). Rückgang (z. B. Tachotausch mit Begründung) → kein Wert (`decrease`). Ohne Ablesung im Monat → km null.
export const MILEAGE_MONTHS = 12;
export function mileageByMonth(readings, months) {
  // readings: [{km, measured_at}] aufsteigend nach measured_at; months: ['JJJJ-MM', …] neuester zuerst
  const r = readings.map((x) => ({ km: x.km, at: x.measured_at, m: berlinDate(x.measured_at).slice(0, 7) }));
  const rows = months.map((month) => {
    let end = null; let start = null;
    for (const x of r) { if (x.m === month) end = x; else if (x.m < month) start = x; }
    const readingsIn = r.filter((x) => x.m === month).length;
    if (!end) return { month, km: null, readings: 0, status: 'no_reading' };
    if (!start) return { month, km: null, readings: readingsIn, to_km: end.km, to_at: end.at, status: 'no_previous' };
    const prevMonth = addMonths(`${month}-01`, -1).slice(0, 7);
    const base = { month, readings: readingsIn, from_km: start.km, from_at: start.at, to_km: end.km, to_at: end.at, spans: start.m < prevMonth };
    // Rückgang irgendwo zwischen den beiden Ablesungen (auch innerhalb des Monats) → kein Wert
    const seg = r.filter((x) => x.at >= start.at && x.at <= end.at);
    if (seg.some((x, i) => i > 0 && x.km < seg[i - 1].km)) return { ...base, km: null, status: 'decrease' };
    return { ...base, km: end.km - start.km, status: 'ok' };
  });
  return rows;
}
function vehicleMileage(rowsDesc, lo) {
  // rowsDesc: Ablesungen absteigend (Fenster ab lo, die letzte davor und die neuesten 20) → nur Fenster + Ausgangswert, aufsteigend
  const asc = [...rowsDesc].reverse(); const i0 = asc.findIndex((x) => x.measured_at >= lo);
  const rows = i0 < 0 ? asc.slice(-1) : asc.slice(Math.max(0, i0 - 1));
  const cur = berlinDate().slice(0, 7);
  const months = Array.from({ length: MILEAGE_MONTHS }, (_, i) => addMonths(`${cur}-01`, -i).slice(0, 7));
  const list = mileageByMonth(rows, months);
  const ok = list.filter((x) => x.status === 'ok');
  const decrease = list.some((x) => x.status === 'decrease');
  return { months: list, total_km: ok.length && !decrease ? ok.reduce((a, x) => a + x.km, 0) : null, max_months: MILEAGE_MONTHS };
}

export const DOWNTIME_MONTHS = 12;
async function vehicleDowntime(env, envName, vehicleId, cases, createdAt) {
  const now = Date.now(); const cur = berlinDate().slice(0, 7);
  const months = Array.from({ length: DOWNTIME_MONTHS }, (_, i) => addMonths(`${cur}-01`, -i).slice(0, 7));
  const since = Date.parse(`${months[months.length - 1]}-01T00:00:00Z`) - 86400000;
  // nur Vorgänge, die in den Zeitraum hineinreichen (offen oder nach Beginn abgeschlossen)
  const rel = cases.filter((c) => !c.closed_at || Date.parse(c.closed_at) >= since);
  const ivs = [];
  for (const c of rel) { const iv = workshopIntervalOf(c, now); if (iv) ivs.push(iv); }
  const evs = rel.length ? (await env.DB.prepare(`SELECT case_id, action, to_status, created_at, CASE WHEN action='create' THEN payload END AS create_payload FROM case_events
    WHERE case_id IN (SELECT value FROM json_each(?)) AND (action IN ('create','set_safety_lock','lift_safety_lock') OR to_status IN ('fahrzeug_freigegeben','abgelehnt')) ORDER BY case_id, created_at`)
    .bind(JSON.stringify(rel.map((c) => c.id))).all()).results : [];
  const by = new Map(); for (const e of evs) { if (!by.has(e.case_id)) by.set(e.case_id, []); by.get(e.case_id).push(e); }
  for (const list of by.values()) ivs.push(...lockIntervalsOf(list, now));
  // Verfügbarkeit je Monat (16.10.2026): Ausfall gegen die Stunden des Monats ab Anlage des Fahrzeugs bis Monatsende bzw. jetzt; davor null
  const c0 = Date.parse(createdAt);
  const rows = downtimeByMonth(ivs, months, now).map((r) => {
    const y = +r.month.slice(0, 4); const mo = +r.month.slice(5, 7);
    const lo = Math.max(Date.parse(berlinDayStartIso(`${r.month}-01`)), Number.isFinite(c0) ? c0 : 0);
    const hi = Math.min(now, Date.parse(berlinDayStartIso(mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`)));
    return { ...r, pct: hi > lo ? Math.max(0, Math.round(1000 * (1 - (r.hours * 3600000) / (hi - lo))) / 10) : null };
  });
  return { months: rows, total_h: Math.round(rows.reduce((x, r) => x + r.hours, 0) * 10) / 10, max_months: DOWNTIME_MONTHS };
}

// Zeitleiste der Fahrzeugakte:// Zeitleiste der Fahrzeugakte: alle gespeicherten Ereignisse chronologisch (nur vorhandene Daten, gleiche Rechte wie die Akte)
export const TIMELINE_TYPES = ['case', 'case_closed', 'inspection', 'odometer', 'driver_from', 'driver_to', 'document', 'tire', 'maintenance', 'fine', 'tacho', 'contract', 'claim', 'note', 'status'];
export async function vehicleTimeline(env, user, envName, vehicleId, query = {}) {
  const limit = intParam(query.limit, 300, 1, 1000);
  // Jede Quelle liefert bis zu limit + 1 Einträge: die neuesten `limit` Einträge der Gesamtliste stammen je Quelle aus deren
  // neuesten `limit` – die Auswahl ist damit exakt; ein Eintrag mehr zeigt an, dass ältere Einträge nicht angezeigt werden (truncated)
  const cap = limit + 1;
  const d = await vehicleDetail(env, user, envName, vehicleId, { timeline: true, cap });
  const want = new Set(String(query.types || '').split(',').filter((x) => TIMELINE_TYPES.includes(x)));
  const items = [];
  const add = (type, at, data) => { if (at && (!want.size || want.has(type))) items.push({ type, at, ...data }); };
  for (const c of d.cases) {
    add('case', c.created_at, { case_id: c.id, case_no: c.case_no, priority: c.priority, status: c.status, text: cutText(c.description, 300), origin: c.origin });
    if (c.closed_at) add('case_closed', c.closed_at, { case_id: c.id, case_no: c.case_no, status: c.status });
  }
  for (const i of d.inspections) add('inspection', i.created_at, { inspection_kind: i.kind, result: i.result, km: i.odometer_km, case_id: i.case_id, ...(i.received_at ? { received_at: i.received_at } : {}), by: i.performed_by_name, ...(i.performed_by_name_hidden ? { by_hidden: true } : {}) });
  // Kennung und Rücksprung-Kennzeichen: „Begründung nachtragen“ an Rücksprüngen ohne Begründung (Inhaber/Leitung, 22.10.2026)
  for (const o of d.odometer) add('odometer', o.measured_at, { km: o.km, source: o.source, note: o.note, ...(isManager(user) ? { odometer_id: o.id, km_drop: !!o.km_drop } : {}) });
  for (const r of d.drivers) { add('driver_from', r.valid_from, { by: r.display_name, evidence: r.evidence }); add('driver_to', r.valid_to, { by: r.display_name }); }
  for (const f of d.documents) add('document', f.created_at, { doc_kind: f.doc_kind, text: f.filename, file_id: f.id, valid_until: f.doc_valid_until });
  for (const m of d.maintenance_history) add('maintenance', m.done_date, { maintenance_kind: m.kind, km: m.done_km, evidence: m.evidence, by: m.recorded_by_name, result: m.result || null });
  if (user.role !== 'driver') {
    const tires = (await env.DB.prepare(`SELECT created_at, position, event_type, tread_mm, odometer_km, case_id FROM tire_events WHERE vehicle_id=? AND environment=? ORDER BY created_at DESC LIMIT ?`)
      .bind(vehicleId, envName, cap).all()).results;
    for (const t of tires) add('tire', t.created_at, { position: t.position, tire_event: t.event_type, tread_mm: t.tread_mm, km: t.odometer_km, case_id: d._okCase && !d._okCase.has(t.case_id) ? null : t.case_id });
    // Hinweise zum Fahrzeug: angelegt und archiviert (nur wenn der Bereich gewünscht ist – spart sonst die Abfrage)
    if (!want.size || want.has('note')) {
      const today = berlinDate();
      // nach dem jüngsten Ereignis je Hinweis (Anlage, Archivierung, Ablauf) – eine Archivierung eines älteren Hinweises fehlte sonst (17.10.2026)
      const notes = (await env.DB.prepare(`SELECT text, for_driver, created_at, archived_at, valid_until FROM vehicle_notes WHERE vehicle_id=? AND environment=?
        ORDER BY MAX(created_at, COALESCE(archived_at, ''), CASE WHEN valid_until < ?4 THEN valid_until ELSE '' END) DESC LIMIT ?3`).bind(vehicleId, envName, cap, today).all()).results;
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
    const fines = (await env.DB.prepare(`SELECT id, fine_no, kind, offense_type, offense_at, status FROM fines WHERE vehicle_id=? AND environment=? ORDER BY offense_at DESC LIMIT ?`)
      .bind(vehicleId, envName, cap).all()).results;
    for (const x of (d.tacho_downloads || []).filter((y) => !y.cancelled_at)) add('tacho', x.downloaded_on, { evidence: x.evidence, by: x.created_by_name });
    for (const c of d.contracts || []) {
      // künftiger Vertragsbeginn erst ab dem Tag selbst (stand sonst über heutigen Ereignissen; Hinweis-Ablauf ebenso nur vergangen)
      if (!c.start_date || c.start_date <= berlinDate()) add('contract', c.start_date || c.created_at, { contract_event: 'start', contract_kind: c.kind, partner: c.partner, evidence: c.evidence });
      add('contract', c.ended_on, { contract_event: 'end', contract_kind: c.kind, partner: c.partner, evidence: c.end_note });
    }
    // Versicherungsfälle (nur Leitung): Meldung an den Versicherer und Erstattung laut Abrechnung – nur gespeicherte Daten
    const claims = (await env.DB.prepare(`SELECT ic.case_id, c.case_no, ic.insurer, ic.claim_no, ic.reported_on, ic.status, ic.reimbursed_net, ic.reimbursed_on, ic.appraiser, ic.appraisal_on, ic.appraisal_received_on, ic.appraisal_net
      FROM insurance_claims ic JOIN cases c ON c.id=ic.case_id WHERE ic.vehicle_id=? AND ic.environment=? ORDER BY MAX(COALESCE(ic.reported_on, ''), COALESCE(ic.reimbursed_on, ''), COALESCE(ic.appraisal_received_on, '')) DESC LIMIT ?`).bind(vehicleId, envName, cap).all()).results; // jüngstes Ereignis (Meldung oder Erstattung) zählt für die Grenze
    for (const c of claims) {
      add('claim', c.reported_on, { claim_event: 'reported', case_id: c.case_id, case_no: c.case_no, insurer: c.insurer, claim_no: c.claim_no, status: c.status });
      add('claim', c.reimbursed_on, { claim_event: 'reimbursed', case_id: c.case_id, case_no: c.case_no, insurer: c.insurer, claim_no: c.claim_no, reimbursed_net: c.reimbursed_net });
      // Gutachter (Backlog 210): Besichtigung erst ab dem Tag selbst (geplante Termine stehen nicht als Ereignis in der Zeitleiste), Eingang des Gutachtens mit Schadenhöhe
      if (c.appraisal_on && c.appraisal_on <= berlinDate()) add('claim', c.appraisal_on, { claim_event: 'appraisal', case_id: c.case_id, case_no: c.case_no, insurer: c.insurer, claim_no: c.claim_no, appraiser: c.appraiser });
      add('claim', c.appraisal_received_on, { claim_event: 'appraisal_received', case_id: c.case_id, case_no: c.case_no, insurer: c.insurer, claim_no: c.claim_no, appraiser: c.appraiser, appraisal_net: c.appraisal_net });
    }
    for (const f of fines) add('fine', f.offense_at, { fine_id: f.id, fine_no: f.fine_no, fine_kind: f.kind, offense_type: f.offense_type, status: f.status });
    // Standzeit nachvollziehbar (Backlog 205, Teilagent „Wiederinbetriebnahme“): ruhend/außer Betrieb und Rückkehr aus dem Protokoll mit Grund
    // und Person – beim Wiederaufnehmen wird der Grund am Fahrzeug geleert, die Akte zeigte danach keine Spur der Standzeit
    if (!want.size || want.has('status')) {
      const st = (await env.DB.prepare(`SELECT a.action, a.detail, a.created_at, u.display_name FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id
        WHERE a.target=? AND (a.action IN ('vehicle.eval_exclude','vehicle.eval_include','vehicle.deactivate','vehicle.activate')
          OR (a.action='vehicle.upsert' AND CASE WHEN json_valid(a.detail) THEN json_type(a.detail,'$.site')='object' OR json_type(a.detail,'$.changed.site')='object' ELSE 0 END)) ORDER BY a.created_at DESC, a.rowid DESC LIMIT ?`).bind(vehicleId, cap).all()).results;
      for (const a of st) {
        let det = {}; try { det = JSON.parse(a.detail || '{}') || {}; } catch {}
        // Standortwechsel (Backlog 272): Stammdaten (`site`) bzw. CSV-Import (`changed.site`) – seit wann der Lkw wo eingesetzt ist
        if (a.action === 'vehicle.upsert') { const sc = (det.site && typeof det.site === 'object' ? det.site : det.changed && det.changed.site) || {}; add('status', a.created_at, { status_event: 'site', site_from: sc.from ?? null, site_to: sc.to ?? null, by: a.display_name || null }); continue; }
        add('status', a.created_at, { status_event: a.action.slice(8), status_reason: typeof det.reason === 'string' ? det.reason : null, by: a.display_name || null });
      }
    }
  }
  // Datum ohne Uhrzeit (z. B. Prüfung „erledigt am“) als Tagesmitte einsortieren
  const key = (x) => (x.at.length === 10 ? x.at + 'T12:00:00.000Z' : x.at);
  items.sort((a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0));
  return { vehicle: { id: d.vehicle.id, plate: d.vehicle.plate, kind: d.vehicle.kind }, types: TIMELINE_TYPES, total: items.length, truncated: items.length > limit, limit, items: items.slice(0, limit) };
}

// Fahrzeugliste als CSV (Excel): Stammdaten + Verfügbarkeit laut System
const AV_DE = { gesperrt: 'gesperrt', werkstatt: 'in Werkstatt', meldung_offen: 'Meldung offen', einsatzbereit_lt_system: 'keine offenen Meldungen' };
const FAILED_DE = { erhebliche_maengel: 'erhebliche Mängel', gefaehrliche_maengel: 'gefährliche Mängel', verkehrsunsicher: 'verkehrsunsicher' };
const failedCell = (fi, csvCell) => (fi ? csvCell(`${fi.kind} ${fi.done_date || ''} ${FAILED_DE[fi.result] || fi.result || ''}`.replace(/\s+/g, ' ').trim()) : '');
export function vehiclesCsv(list, csvCell) {
  const head = ['Kennzeichen', 'FIN', 'Fahrzeugart', 'Standort', 'Hersteller', 'Modell', 'Baujahr', 'Anhänger', 'Status Stammliste', 'Verfügbarkeit laut System', 'Offene Vorgänge', 'Letzter km-Stand', 'Nächste Prüfung', 'Letzte Abfahrtskontrolle', 'Ergebnis Abfahrtskontrolle', 'Gekoppeltes Fahrzeug', 'Zustand gekoppeltes Fahrzeug', 'Nächste km-Fälligkeit', 'Art km-Fälligkeit', 'Rest-km', 'Offene Rückrufe'];
  // Inhaber/Fuhrparkleitung: offene Agentenbefunde (Anzahl, davon kritisch) – nur wenn die Liste die Felder trägt (gleiche Sichtbarkeit wie die Liste)
  const withAF = list.some((v) => 'agent_findings_open' in v);
  if (withAF) head.push('Offene Agentenbefunde', 'davon kritisch');
  // ruhend/außer Betrieb sichtbar (sonst „keine offenen Meldungen“ ohne Kennzeichnung, 18.10.2026) – am Ende, Spaltenpositionen bleiben
  head.push('Bewertung/Betrieb');
  // Prüfung nicht bestanden (erhebliche/gefährliche Mängel, verkehrsunsicher) wie Listen-Chip und /v1/availability – exportierte Liste „Keine offenen Meldungen“ zeigte sie nicht (25.10.2026)
  head.push('Prüfung nicht bestanden', 'Prüfung gekoppeltes Fahrzeug');
  // Backlog 485 (Blickwinkel „Disposition plant abends den nächsten Tag“): Termine und Hinweise wie in der Listenzeile – am Ende, Spaltenpositionen bleiben
  head.push('Geplanter Werkstatttermin', 'Geplante Prüfung', 'Art geplante Prüfung', 'Teile erwartet am', 'Aktive Hinweise');
  const lines = [head.join(';')];
  for (const v of list) lines.push([csvCell(v.plate), csvCell(v.vin), v.kind === 'anhaenger' ? 'Anhänger' : 'Lkw', csvCell(v.site), csvCell(v.manufacturer), csvCell(v.model), v.build_year ?? '',
    csvCell(v.trailer_plate), csvCell(v.master_status), AV_DE[v.availability] || v.availability, v.open_cases ?? '', v.last_km ?? '', v.next_due || '',
    v.last_check_at ? berlinDateTime(v.last_check_at) : '', v.last_check_result === 'ok' ? 'ohne Mangel' : v.last_check_result === 'maengel' ? 'mit Mangel' : '',
    // Gespann laut Stammliste: Kennzeichen + Verfügbarkeit des gekoppelten Fahrzeugs (nur Information)
    v.coupled ? csvCell(v.coupled.plate) : '', v.coupled ? (AV_DE[v.coupled.availability] || v.coupled.availability) : '',
    // km-Fälligkeit am Ende angehängt (bestehende Spaltenpositionen bleiben); Rest-km negativ = überschritten
    v.next_due_km ?? '', csvCell(v.next_due_km_kind), v.km_remaining ?? '',
    // offene Herstellerrückrufe (Anzahl) – ebenfalls am Ende angehängt
    v.open_recalls ?? 0, ...(withAF ? [v.agent_findings_open ?? 0, v.agent_findings_critical ?? 0] : []),
    v.active === 0 || v.active === false ? 'außer Betrieb' : v.eval_excluded ? 'ruhend (nicht in Bewertungen)' : 'aktiv', failedCell(v.failed_inspection, csvCell), failedCell(v.coupled && v.coupled.failed_inspection, csvCell),
    v.planned_workshop_date || '', v.planned_inspection_date || '', csvCell(v.planned_inspection_kind), v.parts_expected_date || '', v.notes_active ?? 0].join(';'));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

// Prüft und normalisiert einen Stammdatensatz (gemeinsam für Einzelpflege und Import)
function vehicleRow(user, body) {
  const vin = normalizeVin(body.vin);
  if (!isValidVin(vin)) throw bad('validation', 'FIN muss 17 Zeichen haben (ohne I, O, Q).');
  const plate = str(body.plate, { required: true, max: 20, field: 'Kennzeichen' }).toUpperCase();
  // nur lateinische Buchstaben (kyrillisches „С“/„А“ von ukrainischer Tastatur sieht gleich aus, Kopplung und Dublettenprüfung griffen still nicht, 18.10.2026)
  // mindestens ein Buchstabe/eine Ziffer, kein Tabulator (20.10.2026: „-“ wurde angelegt, alle solchen galten als gleiches Kennzeichen)
  const plateOk = (x) => /^[A-Z0-9ÄÖÜ \-.\/_\u00a0\u202f\u2010\u2011\u2013\u2014]+$/.test(x) && /[A-Z0-9ÄÖÜ]/.test(x);
  if (!plateOk(plate)) throw bad('validation', 'Kennzeichen enthält unzulässige Zeichen (nur lateinische Buchstaben, Ziffern, Leerzeichen und Bindestrich).');
  if (body.trailer_plate && typeof body.trailer_plate === 'string' && body.trailer_plate.trim() && !plateOk(body.trailer_plate.trim().toUpperCase())) throw bad('validation', 'Anhänger-Kennzeichen enthält unzulässige Zeichen (nur lateinische Buchstaben, Ziffern, Leerzeichen und Bindestrich).');
  return {
    id: `VIN:${vin}`, vin, plate, site: str(body.site, { max: 60, field: 'Standort' }), manufacturer: str(body.manufacturer, { max: 60, field: 'Hersteller' }), model: str(body.model, { max: 60, field: 'Modell' }),
    build_year: body.build_year ? Math.round(num(body.build_year, { min: 1950, max: 2100, field: 'Baujahr' })) : null,
    trailer_plate: str(body.trailer_plate, { max: 20, field: 'Anhänger-Kennzeichen' })?.toUpperCase() ?? null, trailer_vin: (() => { // geprüft wie die FIN (17.10.2026: Objekt wurde „OBJECTOBJECT“, beliebige Länge gespeichert)
      const t = str(body.trailer_vin, { max: 30, field: 'Anhänger-FIN' }); if (!t) return null;
      const n = normalizeVin(t); if (!isValidVin(n)) throw bad('validation', 'Anhänger-FIN muss 17 Zeichen haben (ohne I, O, Q).'); return n; })(),
    master_status: str(body.master_status, { max: 40, field: 'Stammstatus' }), source: str(body.source, { max: 200, field: 'Quelle' }) || `manuell durch ${user.username}`,
    kind: normalizeVehicleKind(body.kind),
  };
}

// Fahrzeugart: Lkw (Zugmaschine/Motorwagen) oder Anhänger; Werte wie auf Prüfrechnungen (KFZ/ANH) werden verstanden. null = unverändert lassen
export function normalizeVehicleKind(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const s = String(raw).trim().toLowerCase();
  if (['anhaenger', 'anhänger', 'anh', 'trailer', 'auflieger', 'sattelauflieger'].includes(s)) return 'anhaenger';
  if (['lkw', 'kfz', 'truck', 'zugmaschine', 'motorwagen', 'sattelzugmaschine', 'sattelzug', 'sattelschlepper', 'lastkraftwagen'].includes(s)) return 'lkw';
  throw bad('validation', `Fahrzeugart unbekannt: ${raw} (Lkw oder Anhänger)`);
}

// Sammel-Upsert über json_each: eine Anweisung je 400 Fahrzeuge (Abfragebudget je Aufruf)
// keepExisting (Import): leere/fehlende Felder überschreiben vorhandene Werte nicht – ein Import löscht nie Stammdaten
// Wechsel der Fahrzeugart (Lkw ↔ Anhänger): die Gewichtsklasse gehört zur alten Art (andere Klassen/SP-Pflicht) – sie wird aus der
// belegten Gesamtmasse neu bestimmt bzw. ohne Masse „unbekannt“ (SP-Frist dann „ungeklärt“ statt still entfallen), HU/SP neu berechnet (17.10.2026)
async function upsertVehicleRows(env, rows, { keepExisting = false, keepActive = false, reactivate = false, actorId = null, guard = null } = {}) {
  const now = nowIso();
  const known = new Map((await env.DB.prepare('SELECT id, kind, zgm_class, zgm_kg FROM vehicles WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(rows.map((r) => r.id))).all()).results.map((v) => [v.id, v]));
  for (const r of rows) if (!r.kind) r.kind = known.get(r.id)?.kind || 'lkw';
  const kindChanged = rows.filter((r) => known.has(r.id) && known.get(r.id).kind !== r.kind).map((r) => {
    const b = known.get(r.id);
    return { id: r.id, plate: r.plate, from_kind: b.kind, to_kind: r.kind, from: b.zgm_class, to: zgmClassFromKg(r.kind, b.zgm_kg) };
  });
  const J = (k) => `json_extract(value,'$.${k}')`;
  const stmts = [];
  // gelesener Stand (Formular „Stammdaten bearbeiten“): nur speichern, wenn das Fahrzeug seitdem unverändert ist (Muster cmd_guard, 21.10.2026)
  if (guard) stmts.push(env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT CASE WHEN EXISTS (SELECT 1 FROM vehicles WHERE id=? AND updated_at=?) THEN 1 ELSE 0 END').bind(guard.id, guard.updated_at),
    env.DB.prepare('DELETE FROM cmd_guard'));
  for (let i = 0; i < rows.length; i += 400) {
    stmts.push(env.DB.prepare(`INSERT INTO vehicles(id,vin,plate,site,manufacturer,model,build_year,trailer_plate,trailer_vin,master_status,source,kind,active,created_at,updated_at)
      SELECT ${J('id')}, ${J('vin')}, ${J('plate')}, ${J('site')}, ${J('manufacturer')}, ${J('model')}, ${J('build_year')}, ${J('trailer_plate')}, ${J('trailer_vin')}, ${J('master_status')}, ${J('source')}, ${J('kind')}, 1, ?1, ?1
      FROM json_each(?2) WHERE 1
      ON CONFLICT(id) DO UPDATE SET ${['plate', 'site', 'manufacturer', 'model', 'build_year', 'trailer_plate', 'trailer_vin', 'master_status', 'source', 'kind']
        .map((f) => (keepExisting ? `${f}=COALESCE(excluded.${f}, vehicles.${f})` : `${f}=excluded.${f}`)).join(', ')}, active=${reactivate ? '1' : keepExisting || keepActive ? 'vehicles.active' : '1'}, updated_at=excluded.updated_at`)
      .bind(now, JSON.stringify(rows.slice(i, i + 400))));
  }
  if (kindChanged.length) stmts.push(env.DB.prepare(`UPDATE vehicles SET zgm_class=json_extract(value,'$.to') FROM json_each(?) WHERE vehicles.id=json_extract(value,'$.id')`).bind(JSON.stringify(kindChanged)));
  // Protokoll der Klassenwechsel in EINER Anweisung im selben Stapel (21.10.2026: vorher eine Abfrage je Fahrzeug – 75 Artwechsel = 88 D1-Abfragen;
  // brach nach dem Speichern ab, ohne Protokoll/HU-SP-Neuberechnung, und ein erneuter Import holte das nicht nach)
  const specLog = kindChanged.filter((k) => k.from !== k.to).map((k) => ({ id: k.id, detail: JSON.stringify({ plate: k.plate, vehicle_kind: { from: k.from_kind, to: k.to_kind }, zgm_class: { from: k.from, to: k.to } }) }));
  if (specLog.length) stmts.push(env.DB.prepare(`INSERT INTO audit_log(id,actor_id,action,target,detail,created_at)
    SELECT lower(hex(randomblob(16))), ?1, 'vehicle.spec', json_extract(value,'$.id'), json_extract(value,'$.detail'), ?2 FROM json_each(?3)`).bind(actorId, now, JSON.stringify(specLog)));
  if (stmts.length) {
    try { await env.DB.batch(stmts); } catch (e) {
      if (guard && String(e && e.message).includes('CHECK')) throw conflict('version_conflict', 'Inzwischen von jemand anderem geändert – bitte neu laden.');
      throw e;
    }
  }
  if (kindChanged.length) {
    await syncHuSpDues(env, { today: berlinDate(), actorId, vehicleIds: kindChanged.map((k) => k.id) });
  }
  return kindChanged;
}

export async function upsertVehicle(env, user, body) {
  if (!isManager(user)) throw forbidden();
  const row = vehicleRow(user, body);
  // „Stammdaten bearbeiten“ (keep_active) lässt außer Betrieb genommene außer Betrieb; erneutes Anlegen mit vorhandener FIN nimmt es wieder
  // in Betrieb – dann mit Protokoll `vehicle.activate` (vorher still, 17.10.2026)
  const before = await env.DB.prepare('SELECT * FROM vehicles WHERE id=?').bind(row.id).first();
  const createOnly = flag(body.create_only, 'Nur anlegen');
  const keepActive = flag(body.keep_active, 'Aktiv lassen'); // einmal auswerten (18.10.2026: "0"/"false" nahm still ohne Protokoll in Betrieb)
  // „Fahrzeug anlegen“ mit der FIN eines Fahrzeugs in Betrieb: abweisen statt still alle leeren Felder (Standort, Hersteller, Anhänger …) zu
  // überschreiben (20.10.2026). Wieder-in-Betrieb-Nahme eines außer Betrieb genommenen Fahrzeugs: leere Felder behalten die bisherigen Werte.
  // nur für das Formular „Fahrzeug anlegen“ (`create_only`); andere Aufrufer nutzen den Endpunkt weiter als Upsert
  if (before && before.active && !keepActive && createOnly) throw conflict('vin_exists', `Fahrzeug mit dieser FIN besteht bereits (${before.plate}) – bitte in der Fahrzeugakte „Stammdaten bearbeiten“ verwenden.`, { id: row.id });
  const recreate = !!(before && !before.active && !keepActive && createOnly);
  // „Stammdaten bearbeiten“ sendet den gelesenen Stand (`expected_updated_at`): zwischenzeitliche Änderung → 409 statt still überschreiben (21.10.2026)
  const expected = keepActive && before && body.expected_updated_at ? str(body.expected_updated_at, { max: 40, field: 'Stand' }) : null;
  if (expected && expected !== before.updated_at) throw conflict('version_conflict', 'Inzwischen von jemand anderem geändert – bitte neu laden.');
  await upsertVehicleRows(env, [row], recreate ? { keepExisting: true, reactivate: true, actorId: user.id } : { keepActive, actorId: user.id, guard: expected ? { id: row.id, updated_at: expected } : null });
  // geänderte Felder alt → neu ins Protokoll (vorher nur das Kennzeichen – Änderungen waren nachträglich nicht erkennbar, 21.10.2026)
  const FIELDS = ['plate', 'site', 'manufacturer', 'model', 'build_year', 'trailer_plate', 'trailer_vin', 'master_status', 'kind'];
  // Schlüssel wie im übrigen Protokoll (alt → neu je Feld); Kennzeichen-Änderung als `plate_old` (`plate` bleibt das aktuelle), Fahrzeugart als `vehicle_kind`
  const KEY = { plate: 'plate_old', kind: 'vehicle_kind' };
  const changes = before ? Object.fromEntries(FIELDS.filter((f) => row[f] !== null && row[f] !== undefined ? row[f] !== before[f] : (!recreate && before[f] !== null && f !== 'kind'))
    .map((f) => [KEY[f] || f, f === 'plate' ? before.plate : { from: before[f] ?? null, to: row[f] ?? (recreate ? before[f] : null) }])) : null;
  if (before && !before.active && !keepActive) await audit(env, user.id, 'vehicle.activate', row.id, { plate: row.plate, recreated: true });
  // Hinweis (keine Sperre): dasselbe Kennzeichen an einem anderen Fahrzeug (Schreibweise egal) – Tippfehler in der FIN oder Doppelanlage?
  // Gesperrt wird nicht, weil es berechtigte Fälle gibt (z. B. ruhendes Altfahrzeug mit gleichem Kennzeichen); entscheiden muss der Mensch.
  const k = normPlate(row.plate);
  const duplicates = (await env.DB.prepare('SELECT id, plate, active, eval_excluded FROM vehicles WHERE id<>?').bind(row.id).all()).results
    .filter((v) => normPlate(v.plate) === k).map((v) => ({ id: v.id, plate: v.plate, active: !!v.active, eval_excluded: !!v.eval_excluded }));
  await audit(env, user.id, 'vehicle.upsert', row.id, { plate: row.plate, ...(duplicates.length ? { duplicate_plate_of: duplicates.map((d) => d.id) } : {}), ...(changes || {}), ...(before ? {} : { created: true }) });
  // Kennzeichenverlauf (Backlog 256): bisheriges Kennzeichen mit Zeitpunkt der Änderung – Akte, Suche, Vorgangssuche
  if (changes && changes.plate_old) await platesInsert(env, [{ id: row.id, plate_old: changes.plate_old }], user.id, 'stammdaten');
  // Anhänger umgekennzeichnet: Zugmaschinen koppeln über das Anhänger-Kennzeichen (Stammliste) – ohne Nachtrag dort ist das Gespann gelöst
  // (Sperre am Anhänger erreicht den Fahrer der Zugmaschine nicht mehr). Nicht automatisch geändert (offene Frage), aber deutlich gemeldet (21.10.2026)
  const trailerOf = before && before.kind === 'anhaenger' && normPlate(before.plate) && normPlate(before.plate) !== k
    ? (await env.DB.prepare(`SELECT id, plate, trailer_plate FROM vehicles WHERE kind='lkw' AND active=1 AND trailer_plate IS NOT NULL`).all()).results
      .filter((v) => normPlate(v.trailer_plate) === normPlate(before.plate)).map((v) => ({ id: v.id, plate: v.plate })) : [];
  // Standort geändert (22.10.2026, Fund Teilagent „Standortwechsel“): offene Werkstattaufträge bleiben bei der bisherigen Werkstatt, geplante
  // Prüftermine bleiben eingeplant, das gekoppelte Fahrzeug steht ggf. noch am alten Standort – vorher still (erst die Datenqualität meldete das Gespann).
  // Reine Information, nichts wird geändert; Zähler über alle Umgebungen wie bei „außer Betrieb nehmen“, eine Abfrage (Abfragebudget).
  let siteHints = {};
  const sk = (x) => (x && String(x).trim() ? String(x).trim().toLocaleLowerCase('de') : '');
  if (changes && changes.site && before.active && sk(before.site) !== sk(row.site)) {
    const h = await env.DB.prepare(`SELECT
        (SELECT json_group_array(json_object('site', s, 'n', n)) FROM (SELECT COALESCE(workshop_site, suggested_workshop_site) AS s, COUNT(*) AS n FROM cases
          WHERE vehicle_id=?1 AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') AND COALESCE(workshop_site, suggested_workshop_site) IS NOT NULL GROUP BY s ORDER BY s)) AS ws,
        (SELECT COUNT(*) FROM maintenance_rules WHERE vehicle_id=?1 AND planned_date >= ?2) AS p,
        (SELECT json_group_array(json_object('plate', plate, 'site', site, 'tp', trailer_plate)) FROM vehicles WHERE active=1 AND id<>?1
          AND ((?3 IS NOT NULL AND kind='anhaenger') OR (?4='anhaenger' AND kind='lkw' AND trailer_plate IS NOT NULL))) AS cpl,
        (SELECT json_group_array(json_object('name', name, 'site', site)) FROM (SELECT DISTINCT u.display_name AS name, dr.site AS site FROM driver_vehicles dv JOIN users u ON u.id=dv.user_id
          JOIN drivers dr ON dr.user_id=u.id WHERE dv.vehicle_id=?1 AND (dv.valid_to IS NULL OR dv.valid_to > ?5) AND dr.site IS NOT NULL AND trim(dr.site)<>'')) AS drv`)
      .bind(row.id, berlinDate(), row.kind !== 'anhaenger' ? (row.trailer_plate ?? before.trailer_plate ?? null) : null, row.kind || before.kind, nowIso()).first();
    const ws = JSON.parse(h.ws || '[]');
    const own = normPlate(row.kind !== 'anhaenger' ? (row.trailer_plate ?? before.trailer_plate) : null);
    const coupled = JSON.parse(h.cpl || '[]').filter((v) => (own ? normPlate(v.plate) === own : normPlate(v.tp) === k) && sk(v.site) !== sk(row.site))
      .map((v) => ({ plate: v.plate, site: v.site || null }));
    // Backlog 271 (Teilagent „Lkw wechselt dauerhaft den Standort“): zugeordnete Fahrer, deren Fahrerakte einen anderen Standort nennt –
    // sie bleiben sonst still zugeordnet und bekommen Sperren/Hinweise des versetzten Lkw (nichts wird automatisch geändert)
    const drvOther = JSON.parse(h.drv || '[]').filter((x) => sk(x.site) !== sk(row.site)).map((x) => ({ name: x.name, site: x.site }));
    siteHints = { site_changed: true, open_workshop_cases: ws.reduce((a, x) => a + x.n, 0), open_workshop_sites: ws.map((x) => x.site), planned_appointments: h.p || 0, coupled_other_site: coupled, drivers_other_site: drvOther };
  }
  return { id: row.id, duplicate_plates: duplicates, ...(trailerOf.length ? { trailer_of_trucks: trailerOf, trailer_plate_old: before.plate } : {}), ...siteHints };
}

// Fahrzeug außer Betrieb nehmen (verkauft, abgemeldet): bleibt mit Historie erhalten, erscheint nicht mehr in Listen/Agent
// Ruhend: im Bestand, aber aus allen Auswertungen (Kosten, Kennzahlen, Prüf-/Reifen-/Dokumentbefunde) herausgenommen
// Rückkehr nach Standzeit (wieder in Betrieb / wieder in Auswertungen, Backlog 204, Teilagent „Wiederinbetriebnahme“): was vor der ersten
// Fahrt zu klären ist – überfällige Prüftermine (HU/SP nach der zentralen Regel), HU/SP mit ungeklärter Frist, offene Sperren dieser Umgebung,
// abgelaufene, nicht beendete Verträge und der letzte km-Stand. Nur Zähler (vorher nur „✓“; Agent-Befunde folgen erst im nächsten Lauf).
async function returnCheck(env, envName, vehicleId) {
  const today = berlinDate();
  const row = await env.DB.prepare(`SELECT
      (SELECT COUNT(*) FROM maintenance_rules WHERE vehicle_id=?1 AND kind NOT IN ('HU','SP') AND next_due_date < ?2 AND NOT (kind='Rückruf' AND last_done_date IS NOT NULL)) AS o,
      (SELECT COUNT(*) FROM cases WHERE vehicle_id=?1 AND environment=?3 AND safety_lock=1 AND status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS l,
      (SELECT COUNT(*) FROM vehicle_contracts WHERE vehicle_id=?1 AND ended_on IS NULL AND end_date IS NOT NULL AND end_date < ?2) AS c,
      (SELECT MAX(measured_at) FROM odometer_readings WHERE vehicle_id=?1) AS k,
      -- Backlog 401: Versicherung erfasst, aber keine läuft (beendet oder Ende überschritten) – beim Abmelden meist beendet
      (EXISTS (SELECT 1 FROM vehicle_contracts WHERE vehicle_id=?1 AND kind='versicherung') AND NOT EXISTS (SELECT 1 FROM vehicle_contracts WHERE vehicle_id=?1 AND kind='versicherung'
        AND (ended_on IS NULL OR ended_on >= ?2) AND (end_date IS NULL OR end_date >= ?2))) AS ni,
      -- Backlog 469 (Blickwinkel „Teil aus einem ruhenden Lkw in einen anderen umbauen“): aktive Fahrzeughinweise (z. B. „Anlasser ausgebaut“) und
      -- offene Restarbeiten dieser Umgebung – beim Außer-Betrieb-Nehmen schon genannt (Backlog 370), bei der Rückkehr fehlten sie
      (SELECT COUNT(*) FROM vehicle_notes WHERE vehicle_id=?1 AND environment=?3 AND archived_at IS NULL AND (valid_until IS NULL OR valid_until >= ?2)) AS n,
      (SELECT COUNT(*) FROM open_items oi JOIN cases c ON c.id=oi.case_id WHERE c.vehicle_id=?1 AND c.environment=?3 AND oi.status='offen') AS oi,
      (SELECT COUNT(*) FROM open_items oi JOIN cases c ON c.id=oi.case_id WHERE c.vehicle_id=?1 AND c.environment=?3 AND oi.status='offen' AND oi.safety_relevant=1) AS ois`).bind(vehicleId, today, envName).first();
  let overdue = row.o || 0; let unclear = 0;
  const x = (await loadHuSpInputs(env, [vehicleId])).get(vehicleId);
  if (x) {
    const h = huSpFor(x, today, maintenanceWarnDays((await env.DB.prepare(`SELECT value FROM settings WHERE key='maintenance_warn_days'`).first() || {}).value));
    for (const y of [h.hu, h.sp]) { if (!y) continue; if (y.status === 'ueberfaellig') overdue++; else if (y.status === 'ungeklaert') unclear++; }
  }
  return { overdue_inspections: overdue, unclear_inspections: unclear, locked_cases: row.l || 0, expired_contracts: row.c || 0, insurance_none_running: !!row.ni, active_notes: row.n || 0, open_items: row.oi || 0, open_items_safety: row.ois || 0, last_km_at: row.k || null };
}

export async function setVehicleEvaluation(env, user, envName, vehicleId, body) {
  if (!isManager(user)) throw forbidden();
  const v = await env.DB.prepare('SELECT id, plate, eval_excluded FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const excluded = flag(body.excluded, 'Ausgenommen');
  const reason = str(body.reason, { required: excluded, max: 300, field: 'Grund' });
  // schon im gewünschten Zustand (Doppelklick, zweite Leitung mit veralteter Akte): nichts überschreiben, kein zweiter Protokolleintrag (Backlog 204)
  const already = () => conflict(excluded ? 'already_excluded' : 'already_included', excluded ? 'Fahrzeug ist bereits ruhend (aus Auswertungen ausgenommen).' : 'Fahrzeug ist bereits in den Auswertungen.');
  if (Number(v.eval_excluded || 0) === (excluded ? 1 : 0)) throw already();
  const r = await env.DB.prepare('UPDATE vehicles SET eval_excluded=?, eval_excluded_reason=?, updated_at=? WHERE id=? AND COALESCE(eval_excluded,0)<>?').bind(excluded ? 1 : 0, excluded ? reason : null, nowIso(), vehicleId, excluded ? 1 : 0).run();
  if (!r.meta || !r.meta.changes) throw already();
  await audit(env, user.id, excluded ? 'vehicle.eval_exclude' : 'vehicle.eval_include', vehicleId, { plate: v.plate, reason });
  return { ok: true, excluded, ...(excluded ? {} : { return_check: await returnCheck(env, envName, vehicleId) }) };
}

export async function setVehicleActive(env, user, envName, vehicleId, body) {
  if (!isManager(user)) throw forbidden();
  const v = await env.DB.prepare('SELECT id, plate, active, kind FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const active = flag(body.active, 'Aktiv');
  const reason = str(body.reason, { required: !active, max: 300, field: 'Grund' });
  if (!active) {
    const open = await env.DB.prepare(`SELECT COUNT(*) AS n FROM cases WHERE vehicle_id=? AND status NOT IN ('fahrzeug_freigegeben','abgelehnt')`).bind(vehicleId).first();
    if (open.n) throw conflict('open_cases', `Fahrzeug hat noch offene Vorgänge (${open.n}, alle Umgebungen) – zuerst abschließen.`);
  }
  // schon im gewünschten Zustand (z. B. zweite Leitung mit veralteter Akte): nichts überschreiben – vorher ersetzten Datum, Grund und
  // Person der Außer-Betrieb-Nahme in der Akte die ursprünglichen Angaben (21.10.2026)
  const already = () => conflict(active ? 'already_active' : 'already_inactive', active ? 'Fahrzeug ist bereits in Betrieb.' : 'Fahrzeug ist bereits außer Betrieb.');
  if (Number(v.active) === (active ? 1 : 0)) throw already();
  const now = nowIso();
  // Backlog 266 (Teilagent „Kurzfristiges Mietfahrzeug“): Fahrer, deren Zuordnung jetzt endet, in der Antwort nennen – nach Rückgabe eines
  // Ersatz-/Mietfahrzeugs hatten sie sonst kein Fahrzeug mehr, ohne dass die Leitung daran erinnert wurde (nur diese Umgebung)
  const endedDrivers = active ? [] : (await env.DB.prepare(`SELECT DISTINCT u.id, u.display_name FROM driver_vehicles dv JOIN users u ON u.id=dv.user_id
    WHERE dv.vehicle_id=? AND dv.environment=? AND (dv.valid_to IS NULL OR dv.valid_to > ?) ORDER BY u.display_name`).bind(vehicleId, envName, now).all()).results;
  // Außer Betrieb nehmen beendet laufende Fahrerzuordnungen (Verlauf bleibt) – sonst galt der Fahrer weiter als zugeordnet und die
  // Zuordnung lebte bei Wieder-in-Betrieb-Nahme auf (17.10.2026)
  // offene Vorgänge zusätzlich im selben Stapel geprüft (18.10.2026: gleichzeitig angelegte Meldung blieb sonst offen am außer Betrieb genommenen Fahrzeug)
  const openGuard = `FROM cases WHERE vehicle_id=? AND status NOT IN ('fahrzeug_freigegeben','abgelehnt')`;
  try {
    // gleichzeitiger Wechsel: nur der erste ändert den Zustand (Guard im selben Stapel), der zweite erhält 409
    await env.DB.batch([
      env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT CASE WHEN COUNT(*)=1 THEN 1 ELSE 0 END FROM vehicles WHERE id=? AND active<>?').bind(vehicleId, active ? 1 : 0), env.DB.prepare('DELETE FROM cmd_guard'),
      ...(active ? [] : [env.DB.prepare(`INSERT INTO cmd_guard(ok) SELECT CASE WHEN COUNT(*)=0 THEN 1 ELSE 0 END ${openGuard}`).bind(vehicleId), env.DB.prepare('DELETE FROM cmd_guard')]),
      env.DB.prepare('UPDATE vehicles SET active=?, updated_at=? WHERE id=?').bind(active ? 1 : 0, now, vehicleId),
      ...(active ? [] : [env.DB.prepare('UPDATE driver_vehicles SET valid_to=? WHERE vehicle_id=? AND (valid_to IS NULL OR valid_to > ?)').bind(now, vehicleId, now)]),
      // Protokoll im selben Stapel: Grund/Datum/Person der Außer-Betrieb-Nahme liest die Akte daraus (22.10.2026; vorher getrennt – nach Abbruch fehlte der Grund dauerhaft)
      auditStmt(env, user.id, active ? 'vehicle.activate' : 'vehicle.deactivate', vehicleId, { plate: v.plate, reason })]);
  } catch (e) {
    if (String(e && e.message).includes('CHECK') && Number((await env.DB.prepare('SELECT active FROM vehicles WHERE id=?').bind(vehicleId).first() || {}).active) === (active ? 1 : 0)) throw already();
    if (!active && String(e && e.message).includes('CHECK')) { const open = await env.DB.prepare(`SELECT COUNT(*) AS n ${openGuard}`).bind(vehicleId).first(); throw conflict('open_cases', `Fahrzeug hat noch offene Vorgänge (${open.n}, alle Umgebungen) – zuerst abschließen.`); }
    throw e;
  }
  // Hinweis: laufende Verträge (Leasing/Miete/Versicherung …) bleiben bestehen – Rückgabe/Kündigung separat klären
  // Hinweis: Telematik-Geräte bleiben zugeordnet und liefern ggf. weiter Daten (FIN/Zuordnung) – Gerät ausbauen bzw. Zuordnung lösen separat
  // Hinweis: geplante Prüftermine (ab heute) verschwinden aus Werkstattplan/Kalender – Termin bei der Werkstatt absagen (22.10.2026; vorher still)
  // alle drei Zähler in einer Abfrage (Abfragebudget)
  // Backlog 370 (Teilagent „Lkw wird verkauft“): offene Restarbeiten (davon sicherheitsrelevant), offene Versicherungsfälle und aktive
  // Fahrzeughinweise dieser Umgebung nennen – der Agent prüft außer Betrieb genommene Fahrzeuge nicht mehr, sie waren danach nirgends sichtbar.
  // Nur Hinweis: nichts wird geschlossen oder archiviert.
  const hint = active ? { r: 0, d: 0, p: 0, o: 0, os: 0, cl: 0, n: 0 } : await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM vehicle_contracts WHERE vehicle_id=?1 AND ended_on IS NULL) AS r,
      (SELECT COUNT(*) FROM telematics_latest WHERE vehicle_id=?1) AS d, (SELECT COUNT(*) FROM maintenance_rules WHERE vehicle_id=?1 AND planned_date >= ?2) AS p,
      (SELECT COUNT(*) FROM open_items oi JOIN cases c ON c.id=oi.case_id WHERE c.vehicle_id=?1 AND c.environment=?3 AND oi.status='offen') AS o,
      (SELECT COUNT(*) FROM open_items oi JOIN cases c ON c.id=oi.case_id WHERE c.vehicle_id=?1 AND c.environment=?3 AND oi.status='offen' AND oi.safety_relevant=1) AS os,
      (SELECT COUNT(*) FROM insurance_claims WHERE vehicle_id=?1 AND environment=?3 AND status IN ('gemeldet','in_pruefung')) AS cl,
      (SELECT COUNT(*) FROM vehicle_notes WHERE vehicle_id=?1 AND environment=?3 AND archived_at IS NULL) AS n`).bind(vehicleId, berlinDate(), envName).first();
  // Wieder in Betrieb: dasselbe Kennzeichen an einem anderen aktiven Fahrzeug (Nachfolger) – Hinweis wie beim Anlegen, Bußgelder/Importe sind sonst „mehrdeutig“ (23.10.2026)
  const duplicates = active ? (await env.DB.prepare('SELECT id, plate, active, eval_excluded FROM vehicles WHERE id<>? AND active=1').bind(vehicleId).all()).results
    .filter((x) => normPlate(x.plate) === normPlate(v.plate)).map((x) => ({ id: x.id, plate: x.plate, active: true, eval_excluded: !!x.eval_excluded })) : [];
  // Anhänger außer Betrieb: Zugmaschinen tragen sein Kennzeichen weiter in der Stammliste (feste Kopplung) – Hinweis wie beim Umkennzeichnen (23.10.2026)
  const trailerOf = !active && v.kind === 'anhaenger' && normPlate(v.plate)
    ? (await env.DB.prepare(`SELECT id, plate, trailer_plate FROM vehicles WHERE kind='lkw' AND active=1 AND trailer_plate IS NOT NULL`).all()).results
      .filter((x) => normPlate(x.trailer_plate) === normPlate(v.plate)).map((x) => ({ id: x.id, plate: x.plate })) : [];
  return { ok: true, active, ...(endedDrivers.length ? { ended_drivers: endedDrivers.map((d) => ({ id: d.id, display_name: d.display_name })) } : {}), running_contracts: hint.r, telematics_devices: hint.d, planned_appointments: hint.p, ...(active ? {} : { open_items: hint.o, open_items_safety: hint.os, open_claims: hint.cl, active_notes: hint.n }), ...(active ? { duplicate_plates: duplicates, return_check: await returnCheck(env, envName, vehicleId) } : {}),
    ...(trailerOf.length ? { trailer_of_trucks: trailerOf } : {}) };
}

export async function assignDriver(env, user, envName, vehicleId, body) {
  if (!isManager(user)) throw forbidden();
  // rec_active: Fahrerakte des Kontos (0 = ausgeschieden → Warnhinweis, Backlog 250; Sperre erst nach Antwort auf „Ausgeschiedene Fahrer“)
  const driver = await env.DB.prepare(`SELECT id, display_name, (SELECT d.active FROM drivers d WHERE d.user_id=users.id) AS rec_active FROM users WHERE id=? AND role='driver' AND environment=? AND active=1`).bind(str(body.user_id, { required: true, max: 40, field: 'Fahrer' }), envName).first();
  if (!driver) throw bad('validation', 'Fahrer nicht gefunden (gleiche Umgebung erforderlich).');
  const v = await env.DB.prepare('SELECT id, active FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  if (!v.active) throw bad('validation', 'Fahrzeug ist außer Betrieb.');
  const now = nowIso();
  const open = (await env.DB.prepare(`SELECT d.id, d.vehicle_id, v.plate FROM driver_vehicles d JOIN vehicles v ON v.id=d.vehicle_id WHERE d.user_id=? AND (d.valid_to IS NULL OR d.valid_to > ?)`)
    .bind(driver.id, now).all()).results;
  if (open.some((o) => o.vehicle_id === vehicleId)) throw conflict('already_assigned', `${driver.display_name} ist diesem Fahrzeug bereits zugeordnet.`);
  // Fahrzeugwechsel: bisherige offene Zuordnungen des Fahrers beenden, wenn ausdrücklich gewünscht
  const endPrev = body.end_previous === 'on' || flag(body.end_previous, 'Bisherige Zuordnung beenden');
  const id = uuid();
  const stmts = [];
  // atomar (17.10.2026): bisherige immer im selben Stapel beenden (nicht nur, wenn beim Lesen welche offen waren) und nur einfügen, wenn
  // keine offene Zuordnung Fahrer↔Fahrzeug besteht – zwei gleichzeitige Zuordnungen ergaben sonst doppelte bzw. zwei „aktuelle“ Fahrzeuge
  if (endPrev) stmts.push(env.DB.prepare('UPDATE driver_vehicles SET valid_to=? WHERE user_id=? AND (valid_to IS NULL OR valid_to > ?)').bind(now, driver.id, now));
  // Umgebung der Zuordnung festhalten (Migration 0075): ein späterer Umgebungswechsel des Kontos macht sie nicht zu Daten der anderen Umgebung
  stmts.push(env.DB.prepare(`INSERT INTO driver_vehicles(id,user_id,vehicle_id,valid_from,valid_to,evidence,created_by,created_at,environment) SELECT ?1,?2,?3,?4,NULL,?5,?6,?7,?8
    WHERE NOT EXISTS (SELECT 1 FROM driver_vehicles WHERE user_id=?2 AND vehicle_id=?3 AND (valid_to IS NULL OR valid_to > ?4))
      AND EXISTS (SELECT 1 FROM vehicles WHERE id=?3 AND active=1)`)
    .bind(id, driver.id, vehicleId, now, str(body.evidence, { max: 300, field: 'Nachweis' }) || 'Zuordnung durch Fuhrparkleitung', user.id, now, envName),
    env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()'), env.DB.prepare('DELETE FROM cmd_guard'));
  try { await env.DB.batch(stmts); } catch (e) {
    if (String(e && e.message).includes('CHECK')) {
      // gleichzeitig außer Betrieb genommen (18.10.2026: Zuordnung blieb sonst offen und lebte bei Wieder-in-Betrieb-Nahme auf)
      const va = await env.DB.prepare('SELECT active FROM vehicles WHERE id=?').bind(vehicleId).first();
      if (!va || !va.active) throw bad('validation', 'Fahrzeug ist außer Betrieb.');
      throw conflict('already_assigned', `${driver.display_name} ist diesem Fahrzeug bereits zugeordnet.`);
    }
    throw e;
  }
  await audit(env, user.id, 'vehicle.assign_driver', vehicleId, { driver: driver.id, ended_previous: endPrev ? open.map((o) => o.plate) : [] });
  // Fahrzeugwechsel: Ende auch im Protokoll des bisherigen Fahrzeugs (23.10.2026 – Springer mit täglichem Wechsel wirkte dort dauerhaft zugeordnet)
  if (endPrev) for (const o of open) await audit(env, user.id, 'vehicle.end_assignment', o.vehicle_id, { driver: driver.id, assignment: o.id, vehicle_change: true });
  // Bußgeld mit Fahrverbot laut Schreiben (Backlog 365): Warnhinweis, solange das Schreiben nicht erledigt/eingestellt ist – keine Sperre,
  // weil der Verbotszeitraum (Abgabe des Führerscheins) nicht im Schreiben steht; nur Inhaber/Fuhrparkleitung (sehen die Bußgelder ohnehin)
  const bans = (await env.DB.prepare(`SELECT fine_no, driving_ban_months AS months FROM fines WHERE environment=? AND driver_id=? AND driving_ban_months IS NOT NULL
    AND status NOT IN ('eingestellt','erledigt') ORDER BY offense_at DESC`).bind(envName, driver.id).all()).results;
  return { id, ended_previous: endPrev ? open.map((o) => o.plate) : [], other_open: endPrev ? [] : open.map((o) => o.plate), ...(driver.rec_active === 0 ? { driver_record_left: true } : {}),
    ...(bans.length ? { driving_ban_fines: bans } : {}) };
}

export async function endAssignment(env, user, envName, assignmentId) {
  if (!isManager(user)) throw forbidden();
  // nur Zuordnungen von Fahrern der eigenen Umgebung (Test/Betrieb getrennt)
  const row = await env.DB.prepare(`SELECT vehicle_id, user_id FROM driver_vehicles WHERE id=?`).bind(assignmentId).first();
  const r = await env.DB.prepare(`UPDATE driver_vehicles SET valid_to=? WHERE id=? AND valid_to IS NULL AND environment=?`).bind(nowIso(), assignmentId, envName).run();
  if (!r.meta.changes) throw notFound('Zuordnung nicht gefunden oder bereits beendet.');
  // Ziel = Fahrzeug (wie vehicle.assign_driver) → erscheint im Protokoll je Fahrzeug; Person und Zuordnung im Detail
  await audit(env, user.id, 'vehicle.end_assignment', row.vehicle_id, { driver: row.user_id, assignment: assignmentId });
  return { ok: true };
}

// „Mein Fahrzeug“ für Fahrer: zugeordnete Fahrzeuge mit eigenen offenen Meldungen, Sperrstatus, nächsten Prüfterminen und letztem km-Stand
export async function myVehicles(env, user, envName) {
  if (user.role !== 'driver') throw forbidden();
  const now = nowIso();
  const vs = (await env.DB.prepare(`SELECT v.id, v.plate, v.kind, v.site, v.manufacturer, v.model, v.trailer_plate, COALESCE(v.eval_excluded,0) AS eval_excluded, d.valid_from FROM driver_vehicles d JOIN vehicles v ON v.id=d.vehicle_id
    WHERE d.user_id=? AND (d.valid_to IS NULL OR d.valid_to > ?) AND v.active=1 ORDER BY d.valid_from DESC`).bind(user.id, now).all()).results;
  if (!vs.length) return { vehicles: [] };
  // Gespann: gekoppelter Anhänger bzw. Zugmaschine laut Stammliste (fest gekoppelt) – deren Sperre betrifft die Fahrt ebenfalls
  // bewertete vor ruhenden Fahrzeugen (ruhendes Doppel mit gleichem Kennzeichen verdeckte sonst Sperre und Hinweise des echten Anhängers, 18.10.2026)
  const pool = (await env.DB.prepare(`SELECT id, plate, kind, trailer_plate, COALESCE(eval_excluded,0) AS eval_excluded FROM vehicles WHERE active=1 AND (kind='anhaenger' OR (kind='lkw' AND trailer_plate IS NOT NULL AND trailer_plate<>'')) ORDER BY COALESCE(eval_excluded,0), created_at`).all()).results;
  const coupledOf = new Map();
  for (const v of vs) {
    const p = v.kind === 'anhaenger'
      ? pool.find((x) => x.kind === 'lkw' && normPlate(x.trailer_plate) === normPlate(v.plate))
      : v.trailer_plate ? pool.find((x) => x.kind === 'anhaenger' && normPlate(x.plate) === normPlate(v.trailer_plate)) : null;
    if (p && p.id !== v.id) coupledOf.set(v.id, p);
  }
  const ids = JSON.stringify([...new Set([...vs.map((v) => v.id), ...[...coupledOf.values()].map((p) => p.id)])]);
  const [locks, mine, rules, kms, notes, warnKmRow, tireEv, relItems] = await Promise.all([
    env.DB.prepare(`SELECT vehicle_id, MAX(safety_lock) AS locked, COUNT(*) AS open FROM cases WHERE environment=? AND vehicle_id IN (SELECT value FROM json_each(?))
      AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') GROUP BY vehicle_id`).bind(envName, ids).all(),
    // alle offenen Vorgänge der eigenen Fahrzeuge (ohne Namen der Meldenden): Fahrer sieht bekannte Mängel und meldet sie nicht doppelt
    env.DB.prepare(`SELECT id, case_no, vehicle_id, status, priority, substr(description,1,300) AS description, created_at, check_item, safety_lock, planned_date, planned_note, parts_expected_date, vehicle_location, tow_service, towed_on, vehicle_location_at, workshop_site, reported_driveability, reporter_id=? AS mine
      FROM cases WHERE environment=? AND vehicle_id IN (SELECT value FROM json_each(?))
      AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') ORDER BY created_at DESC LIMIT 200`).bind(user.id, envName, ids).all(),
    env.DB.prepare(`SELECT vehicle_id, kind, next_due_date, planned_date, due_km, interval_km, last_done_km, last_done_date, km_basis_at, updated_at FROM maintenance_rules WHERE vehicle_id IN (SELECT value FROM json_each(?))
      AND (next_due_date IS NOT NULL OR planned_date IS NOT NULL OR (kind NOT IN ('HU','SP') AND (due_km IS NOT NULL OR (interval_km > 0 AND last_done_km IS NOT NULL)))) ORDER BY next_due_date IS NULL, next_due_date`).bind(ids).all(),
    // letzter km-Rücksprung (Tachotausch) je Fahrzeug – gleiche Regel wie Übersicht/Fahrzeugliste (kmDue → „ungeklärt“, nie ein Rest aus gemischten Zählern)
    env.DB.prepare(`SELECT o.vehicle_id, o.km, o.measured_at, ${KM_DROP_SQL('o.vehicle_id')} AS km_drop FROM odometer_readings o WHERE o.vehicle_id IN (SELECT value FROM json_each(?1))
      AND o.measured_at = (SELECT MAX(o2.measured_at) FROM odometer_readings o2 WHERE o2.vehicle_id=o.vehicle_id)`).bind(ids).all(),
    // Hinweise zum Fahrzeug, die ausdrücklich für Fahrer freigegeben sind (ohne Verfasser)
    env.DB.prepare(`SELECT vehicle_id, text, created_at, valid_until FROM vehicle_notes WHERE environment=? AND for_driver=1 AND archived_at IS NULL AND (valid_until IS NULL OR valid_until >= ?) AND vehicle_id IN (SELECT value FROM json_each(?)) ORDER BY created_at DESC, rowid DESC`).bind(envName, berlinDate(), ids).all(),
    env.DB.prepare(`SELECT value FROM settings WHERE key='maintenance_warn_km'`).first(),
    // Winterkennzeichnung der Reifen (nur eigene Lkw, ohne Personen) – gleiche Regel wie Fahrzeugakte
    env.DB.prepare(`SELECT vehicle_id, position, event_type, winter_mark FROM tire_events WHERE environment=? AND vehicle_id IN (SELECT value FROM json_each(?)) ORDER BY created_at DESC`).bind(envName, JSON.stringify(vs.map((v) => v.id))).all(),
    // Backlog 464 (Blickwinkel „Fahrer holt den Lkw nach der Reparatur ab“): offene (nicht sicherheitsrelevante) Restarbeiten technisch
    // freigegebener Vorgänge – der Vorgang ist geschlossen, die Restarbeit steht sonst nirgends beim Fahrer (ohne Personen, ohne Link)
    env.DB.prepare(`SELECT c.vehicle_id, substr(o.description,1,300) AS description, o.created_at, c.case_no, c.closed_at FROM open_items o JOIN cases c ON c.id=o.case_id
      WHERE c.environment=? AND c.vehicle_id IN (SELECT value FROM json_each(?)) AND c.status='fahrzeug_freigegeben' AND o.status='offen' ORDER BY o.created_at DESC LIMIT 100`).bind(envName, ids).all(),
  ]);
  const relOf = (vid) => relItems.results.filter((r) => r.vehicle_id === vid).map(({ vehicle_id, ...r }) => r);
  // HU/SP ohne eigenen Eintrag, deren Frist sich berechnen lässt (z. B. SP aus HU + Erstzulassung): wie Übersicht/Akte als Zeile ohne Regel
  // (20.10.2026: überfällige berechnete SP fehlte auf der Fahrer-Startseite). Es wird nichts angelegt.
  const virtBy = new Map(); const unclearBy = new Map();
  {
    // auch der fest gekoppelte Anhänger bzw. die Zugmaschine (Backlog 202, Teilagent „Straßenkontrolle“: überfällige HU des Anhängers fehlte)
    const hin = await loadHuSpInputs(env, JSON.parse(ids));
    const wd = maintenanceWarnDays((await env.DB.prepare(`SELECT value FROM settings WHERE key='maintenance_warn_days'`).first() || {}).value);
    const today0 = berlinDate();
    for (const [vid, x] of hin) {
      const h = huSpFor(x, today0, wd);
      for (const kind of ['HU', 'SP']) {
        const y = kind === 'HU' ? h.hu : h.sp;
        // Frist ungeklärt (kein Nachweis, nicht berechenbar): nicht still weglassen, sondern ohne Datum melden (Backlog 202; Regel „fehlend = ungeklärt“)
        // auch mit Datum, wenn die Frist laut Regel ungeklärt ist (z. B. letzte HU/SP mit erheblichen Mängeln – Nachprüfung offen; Backlog 207:
        // Fahrer sah „HU 31.10.2027“ nach einer nicht bestandenen HU)
        if (y && y.status === 'ungeklaert') { if (!unclearBy.has(vid)) unclearBy.set(vid, []); unclearBy.get(vid).push(kind); continue; }
        if (!y || !y.due || y.status === 'nicht_sp_pflichtig') continue;
        // HU/SP immer nach der zentralen Regel (wie Akte/Fahrzeugliste/Übersicht) – der gespeicherte Rohwert zeigte z. B. eine alte SP-Plakette
        // eines nicht SP-pflichtigen Lkw als „überfällig“ (22.10.2026)
        if (!virtBy.has(vid)) virtBy.set(vid, []);
        virtBy.get(vid).push({ vehicle_id: vid, kind, next_due_date: y.due, planned_date: y.planned_date || null });
      }
    }
  }
  const tiresBy = new Map();
  for (const e of tireEv.results) { if (!tiresBy.has(e.vehicle_id)) tiresBy.set(e.vehicle_id, []); tiresBy.get(e.vehicle_id).push(e); }
  // Wartung nach km für den Fahrer: nur überschritten bzw. innerhalb der eingestellten Vorwarnung (ohne Schwelle nur überschritten),
  // gerechnet ab dem letzten erfassten km-Stand – gleiche Regel wie die Prüftermin-Übersicht (kmDue); ohne km-Stand nichts
  const warnKm = Number(warnKmRow && warnKmRow.value) > 0 ? Number(warnKmRow.value) : null;
  const lockMap = new Map(locks.results.map((r) => [r.vehicle_id, r]));
  const kmMap = new Map(kms.results.map(({ km_drop, ...r }) => [r.vehicle_id, { ...r, ...parseKmDrop(km_drop) }]));
  // geplante Termine (nur gespeicherte, ab heute nach Berliner Datum): Fahrer weiß, wann das Fahrzeug in die Werkstatt soll
  const today = berlinDate();
  const minDate = (arr) => arr.filter((d) => d && d >= today).sort()[0] || null;
  const WS = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'];
  const PRIO_RANK = { kritisch: 0, mittel: 1, niedrig: 2 };
  // offene Vorgänge (bekannte Mängel) und Prüftermine je Fahrzeug – für eigene und den gekoppelten Anhänger/die Zugmaschine (Backlog 202)
  const defects = (vid) => mine.results.filter((c) => c.vehicle_id === vid).sort((a, b) => (b.safety_lock ? 1 : 0) - (a.safety_lock ? 1 : 0) || (PRIO_RANK[a.priority] ?? 3) - (PRIO_RANK[b.priority] ?? 3) || String(b.created_at).localeCompare(String(a.created_at))).map((c) => ({ id: c.mine ? c.id : null, case_no: c.case_no, status: c.status, priority: c.priority,
        description: c.description, created_at: c.created_at, check_item: c.check_item, safety_lock: !!c.safety_lock, mine: !!c.mine,
        // Backlog 465: wo das Fahrzeug laut Vorgang steht bzw. wer es abgeschleppt hat (wie Disposition; nur Angaben aus dem Vorgang, mit Stand)
        vehicle_location: c.vehicle_location || null, tow_service: c.tow_service || null, towed_on: c.tow_service ? c.towed_on || null : null, vehicle_location_at: c.vehicle_location || c.tow_service ? c.vehicle_location_at || null : null,
        planned_date: WS.includes(c.status) && c.planned_date >= today ? c.planned_date : null,
        // Backlog 472 (Blickwinkel „Überführungsfahrt zur Werkstatt“): beauftragte Werkstatt (nur nach Auftrag – der Vorschlag der Meldung kann
        // noch geändert werden) und Fahrbereitschaft laut Meldung, wenn eingeschränkt/nicht fahrbereit (der überführende Fahrer sah beides nirgends)
        workshop_site: c.status !== 'gemeldet' && c.workshop_site ? c.workshop_site : null,
        driveability: ['eingeschraenkt', 'nicht_fahrbereit'].includes(c.reported_driveability) ? c.reported_driveability : null,
        // Teile-Liefertermin laut Werkstatt (nur ab heute – ein überschrittener Termin ist Sache der Werkstatt/Leitung)
        parts_expected_date: c.status === 'wartet_teile' && c.parts_expected_date >= today ? c.parts_expected_date : null }));
  // Fahrtenschreiber-Prüfung (§ 57b StVZO) beim Lkw ohne Frist: wie HU/SP „fehlend = ungeklärt“ statt still weglassen (Backlog 436,
  // Blickwinkel „Kalibrierung läuft ab“ – bei der Straßenkontrolle wird das Einbauschild geprüft). Nicht bei Anhängern und ruhenden Fahrzeugen
  // (gleiche Pflichtliste wie Lückenliste/Datenqualität); eine Frist wird nicht angenommen.
  {
    const kindOf = new Map([...vs.map((v) => [v.id, v]), ...[...coupledOf.values()].map((p) => [p.id, p])]);
    for (const [vid, v] of kindOf) {
      if (v.kind === 'anhaenger' || Number(v.eval_excluded) || !REQUIRED_KINDS.includes('Tachograph')) continue;
      if (rules.results.some((r) => r.vehicle_id === vid && r.kind === 'Tachograph' && r.next_due_date)) continue;
      if (!unclearBy.has(vid)) unclearBy.set(vid, []);
      unclearBy.get(vid).push('Tachograph');
    }
  }
  const nextInsp = (vid) => [...rules.results.filter((r) => r.vehicle_id === vid && r.next_due_date && !['HU', 'SP'].includes(r.kind) && !(r.kind === 'Rückruf' && r.last_done_date)), ...(virtBy.get(vid) || [])].sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)).slice(0, 4).map(({ kind, next_due_date, planned_date }) => ({ kind, next_due_date, planned_date: planned_date >= today ? planned_date : null }));
  return {
    vehicles: vs.map((v) => ({
      // Backlog 403: ruhend → Hinweis an den Fahrer
      ...v, eval_excluded: !!v.eval_excluded, locked: !!(lockMap.get(v.id) || {}).locked, open_cases_total: (lockMap.get(v.id) || {}).open || 0,
      my_open_cases: mine.results.filter((c) => c.vehicle_id === v.id && c.mine).map(({ mine: _m, check_item: _c, safety_lock: _s, planned_date: _p, planned_note: _n, parts_expected_date: _e, vehicle_location: _l, tow_service: _t, towed_on: _o, vehicle_location_at: _a, workshop_site: _w, reported_driveability: _d, ...c }) => c),
      // alle offenen (vorher still 10 – ältere sicherheitsrelevante verdrängt, 20.10.2026); gesperrte/kritische zuerst
      known_defects: defects(v.id), open_items_after_release: relOf(v.id),
      next_inspections: nextInsp(v.id), inspections_unclear: unclearBy.get(v.id) || [],
      planned_workshop_date: minDate(mine.results.filter((c) => c.vehicle_id === v.id && WS.includes(c.status)).map((c) => c.planned_date)),
      // Hinweis zum Termin (Backlog 438, z. B. „Abgabe 7 Uhr bei Fa. …, Abholung 13 Uhr“) – der Fahrer bringt den Lkw oft selbst hin
      // Backlog 472: Werkstatt(en) des nächsten Termins – der Fahrer bringt den Lkw oft selbst hin (z. B. Überführung nach Dortmund)
      planned_workshop_sites: (() => { const d = minDate(mine.results.filter((c) => c.vehicle_id === v.id && WS.includes(c.status)).map((c) => c.planned_date)); return d ? [...new Set(mine.results.filter((c) => c.vehicle_id === v.id && WS.includes(c.status) && c.planned_date === d && c.workshop_site).map((c) => c.workshop_site))] : []; })(),
      planned_workshop_note: (() => { const d = minDate(mine.results.filter((c) => c.vehicle_id === v.id && WS.includes(c.status)).map((c) => c.planned_date)); return d ? mine.results.filter((c) => c.vehicle_id === v.id && WS.includes(c.status) && c.planned_date === d && c.planned_note).map((c) => c.planned_note).join(' · ') || null : null; })(),
      planned_inspection: (() => { const r = rules.results.filter((x) => x.vehicle_id === v.id && x.planned_date >= today).sort((a, b) => a.planned_date.localeCompare(b.planned_date))[0]; return r ? { kind: r.kind, planned_date: r.planned_date } : null; })(),
      last_km: (({ vehicle_id, km, measured_at }) => (vehicle_id ? { vehicle_id, km, measured_at } : null))(kmMap.get(v.id) || {}),
      km_due: rules.results.filter((r) => r.vehicle_id === v.id && !['HU', 'SP'].includes(r.kind)).map((r) => ({ r, k: kmDue(r, kmMap.get(v.id), warnKm) }))
        .filter((x) => x.k && ['ueberfaellig', 'faellig'].includes(x.k.km_status)).sort((a, b) => a.k.km_remaining - b.k.km_remaining).slice(0, 4)
        .map(({ r, k }) => ({ kind: r.kind, next_due_km: k.next_due_km, km_remaining: k.km_remaining, status: k.km_status, planned_date: r.planned_date >= today ? r.planned_date : null })),
      // eigene Hinweise und die des fest gekoppelten Anhängers bzw. der Zugmaschine (mit Kennzeichen); „gültig bis“ mitgeben – die App blendet
      // abgelaufene auch im Offline-Stand aus (vorher fehlte das Feld, Gespann-Hinweise wurden gelesen, aber nie gezeigt – 17.10.2026)
      // eigene Hinweise vor denen des gekoppelten Fahrzeugs, ohne Kappung (je Fahrzeug höchstens 20 aktive; vorher verdrängten 8 neuere Anhänger-Hinweise
      // die eigenen bis auf 2 – ohne Hinweis, 20.10.2026)
      notes: notes.results.filter((n) => n.vehicle_id === v.id || (coupledOf.has(v.id) && n.vehicle_id === coupledOf.get(v.id).id)).sort((a, b) => (a.vehicle_id === v.id ? 0 : 1) - (b.vehicle_id === v.id ? 0 : 1))
        .map(({ vehicle_id, text, created_at, valid_until }) => ({ text, created_at, valid_until: valid_until || null, ...(vehicle_id !== v.id ? { plate: coupledOf.get(v.id).plate } : {}) })),
      // Winterreifen: nur „nicht erfüllt“ laut Erfassung (Information für die Fahrt bei Glätte, StVO § 2 Abs. 3a); nicht erfasst = null (kein Rauschen)
      winter: v.kind === 'anhaenger' ? null : (({ status, noncompliant }) => (status === 'nicht_erfuellt' ? { status, noncompliant } : null))(winterStatus(v.kind, winterMarks(tiresBy.get(v.id) || []))),
      // gekoppeltes Fahrzeug: Sperre, offene Vorgänge, bekannte Mängel (Verweis nur auf eigene Meldungen) und HU/SP-/Prüftermine – bei der Straßenkontrolle zählt das
      // ganze Gespann (Backlog 202, Teilagent „Straßenkontrolle“: überfällige HU des Anhängers und dessen Mängel waren für den Fahrer unsichtbar)
      coupled: coupledOf.has(v.id) ? (({ id, plate, kind }) => ({ id, plate, kind, locked: !!(lockMap.get(id) || {}).locked, open_cases_total: (lockMap.get(id) || {}).open || 0,
        known_defects: defects(id), open_items_after_release: relOf(id), next_inspections: nextInsp(id), inspections_unclear: unclearBy.get(id) || [] }))(coupledOf.get(v.id)) : null,
    })),
  };
}

// Historie: jede Durchführung als eigener Eintrag (gleiche Regel + gleiches Datum nur einmal)
// ifRule: nur, wenn die Regel existiert (Import legt sie im selben Stapel ggf. nicht an – gleichzeitiger Import)
export function maintEventStmt(env, e, { ifRule = false } = {}) {
  return env.DB.prepare(`INSERT INTO maintenance_events(id,rule_id,vehicle_id,kind,done_date,done_km,evidence,source,recorded_by,created_at) SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10
    WHERE ${ifRule ? 'EXISTS (SELECT 1 FROM maintenance_rules WHERE id=?2)' : '1'}
    ON CONFLICT(rule_id, done_date) DO UPDATE SET
      done_km=CASE WHEN excluded.source='import' AND maintenance_events.source<>'import' THEN COALESCE(maintenance_events.done_km, excluded.done_km) ELSE COALESCE(excluded.done_km, maintenance_events.done_km) END,
      evidence=CASE WHEN excluded.source='import' AND maintenance_events.source<>'import' AND COALESCE(maintenance_events.evidence,'')<>'' THEN maintenance_events.evidence ELSE excluded.evidence END,
      -- in der App erfasste Durchführung am Tag einer importierten: Herkunft/erfassende Person übernehmen (19.10.2026: blieb „import“ –
      -- fehlte dann bei „Prüfergebnis fehlt“ und auf der Startseite der erfassenden Person)
      source=CASE WHEN excluded.source<>'import' THEN excluded.source ELSE maintenance_events.source END,
      recorded_by=CASE WHEN excluded.source<>'import' THEN COALESCE(excluded.recorded_by, maintenance_events.recorded_by) ELSE maintenance_events.recorded_by END`)
    // Import ersetzt nie den Nachweis/km-Stand einer erfassten Durchführung am selben Tag (17.10.2026: „DEKRA-Prüfbericht 4711“ → Listentext)
    .bind(uuid(), e.rule_id, e.vehicle_id, e.kind, e.done_date, e.done_km ?? null, e.evidence, e.source, e.user_id ?? null, nowIso());
}

export async function addMaintenanceRule(env, user, vehicleId, body) {
  if (!isManager(user) && user.role !== 'workshop') throw forbidden();
  const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const kind = oneOf(body.kind, MAINT_KINDS, 'Art');
  const evidence = str(body.evidence, { required: true, max: 300, field: 'Nachweis/Quelle' });
  // ganze Zahlen (19.10.2026: „1,5“ Monate wurde still zu 2 – Frist verschoben; der Import weist das schon ab)
  const months = body.interval_months ? num(body.interval_months, { min: 1, max: 120, field: 'Intervall Monate' }) : null;
  const km = body.interval_km ? num(body.interval_km, { min: 100, max: 1000000, field: 'Intervall km', grouped: true }) : null;
  if ((months !== null && !Number.isInteger(months)) || (km !== null && !Number.isInteger(km))) throw bad('validation', 'Intervall als ganze Zahl angeben.');
  const lastDate = str(body.last_done_date, { max: 10, field: 'Letzte Prüfung' });
  const lastKm = body.last_done_km != null && String(body.last_done_km).trim() !== '' ? kmNum(body.last_done_km, { field: 'km' }) : null;
  const husp = kind === 'HU' || kind === 'SP';
  if (ONE_TIME_KINDS.includes(kind) && (months || km)) throw bad('validation', 'Rückruf ist eine einmalige Aktion – kein Intervall angeben.');
  // bereits durchgeführter Rückruf: keine Frist (sonst überfällig/fällig, aber weder erledigbar noch planbar – Dauerbefund; 20.10.2026)
  if (ONE_TIME_KINDS.includes(kind) && body.last_done_date && String(body.last_done_date).trim() && ((body.next_due_date && String(body.next_due_date).trim()) || (body.due_km && String(body.due_km).trim()))) throw bad('validation', 'Rückruf ist bereits durchgeführt – keine Frist angeben.');
  // Belegte km-Fälligkeit (Serviceanzeige/Wartungsheft); HU/SP richten sich nur nach der Zeit
  let dueKm = body.due_km ? kmNum(body.due_km, { min: 1, field: 'km' }) : null;
  if (husp && (dueKm !== null || km !== null)) throw bad('validation', 'HU/SP sind zeitabhängig – keine km-Fälligkeit angeben.');
  if (dueKm !== null && lastKm !== null && dueKm <= lastKm) throw bad('validation', 'Fällig bei km liegt nicht nach dem km-Stand der letzten Prüfung.');
  if (dueKm !== null && km && lastKm !== null && dueKm === lastKm + km) dueKm = null; // ergibt sich ohnehin aus Intervall
  let nextDue = str(body.next_due_date, { max: 10, field: 'Nächster Termin' });
  const dueSource = nextDue ? 'nachweis' : 'berechnet';
  // HU/SP: kein pauschales Intervall – Fälligkeit zentral nach StVZO Anlage VIII (inspection_rules.js) oder laut Nachweis
  // erst prüfen, dann rechnen (ungültiges Datum wie „0000-00-00“ ließ addMonths mit „Invalid time value“ abbrechen – Fuzz 15.10.2026)
  for (const d of [lastDate, nextDue]) if (d && !isCalendarDate(d)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
  if (nextDue && nextDue > maxFutureDate()) throw bad('validation', DUE_FAR_MSG); // 2062 statt 2026 → Frist „in Ordnung“ für Jahrzehnte
  if (!nextDue && lastDate && months && !husp) nextDue = addMonths(lastDate, months);
  // wie beim Import (17.10.2026): nächster Termin nicht vor der letzten Durchführung
  if (nextDue && lastDate && nextDue < lastDate) throw bad('validation', 'Nächster Termin liegt vor der letzten Durchführung.');
  if (lastDate && lastDate > berlinDate()) throw bad('validation', 'Letzte Durchführung liegt in der Zukunft – geplante Termine über „Werkstatttermin planen“ eintragen.');
  const id = uuid();
  const now = nowIso();
  // Je Fahrzeug höchstens ein Prüftermin derselben Art (außer Rückruf/Sonstiges): ein zweiter HU-/UVV-Eintrag ergab zwei Fälligkeiten,
  // von denen eine nie erledigt wurde (Dauerbefund). Prüfung im selben Stapel (Muster cmd_guard) – auch bei zwei gleichzeitigen Klicks (17.10.2026)
  const single = !MULTI_RULE_KINDS.includes(kind);
  const ruleExists = async () => {
    const r = await env.DB.prepare('SELECT id FROM maintenance_rules WHERE vehicle_id=? AND kind=? AND id<>? ORDER BY created_at LIMIT 1').bind(vehicleId, kind, id).first();
    return conflict('rule_exists', 'Für dieses Fahrzeug gibt es bereits einen Prüftermin dieser Art – bitte den vorhandenen bearbeiten bzw. „erledigt“ erfassen.', r ? { rule_id: r.id } : undefined);
  };
  if (single && await env.DB.prepare('SELECT 1 FROM maintenance_rules WHERE vehicle_id=? AND kind=? LIMIT 1').bind(vehicleId, kind).first()) throw await ruleExists();
  const stmts = [env.DB.prepare(`INSERT INTO maintenance_rules(id,vehicle_id,kind,interval_months,interval_km,last_done_date,last_done_km,due_km,next_due_date,evidence,created_by,created_at,updated_at,due_source,km_basis_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, vehicleId, kind, husp ? null : months, km, lastDate, lastKm, dueKm, nextDue, evidence, user.id, now, now, dueSource,
      // letzte Durchführung vor einem km-Rücksprung (Tachotausch): km vom alten Zähler → km-Fälligkeit bleibt „ungeklärt“ (18.10.2026)
      lastDate ? kmBasisForDone(parseKmDrop((await env.DB.prepare(`SELECT ${KM_DROP_SQL('?')} AS d`).bind(vehicleId).first() || {}).d), lastDate, null, now) : now)];
  if (single) stmts.push(env.DB.prepare(`INSERT INTO cmd_guard(ok) SELECT CASE WHEN COUNT(*) <= 1 THEN 1 ELSE 0 END FROM maintenance_rules WHERE vehicle_id=? AND kind=?`).bind(vehicleId, kind), env.DB.prepare('DELETE FROM cmd_guard'));
  if (lastDate) stmts.push(maintEventStmt(env, { rule_id: id, vehicle_id: vehicleId, kind, done_date: lastDate, done_km: lastKm, evidence, source: 'erfasst', user_id: user.id }));
  try { await env.DB.batch(stmts); } catch (e) { if (single && String(e && e.message).includes('CHECK')) throw await ruleExists(); throw e; }
  if (husp) await syncHuSpDues(env, { today: berlinDate(), actorId: user.id, vehicleIds: [vehicleId] });
  return { id, next_due_date: husp ? (await env.DB.prepare('SELECT next_due_date FROM maintenance_rules WHERE id=?').bind(id).first()).next_due_date : nextDue };
}

// Geplanter Werkstatttermin für eine Prüfung (ersetzt keine Durchführung, verschiebt keine Frist)
export async function planMaintenance(env, user, ruleId, body) {
  if (!isManager(user) && user.role !== 'workshop') throw forbidden();
  const r = await env.DB.prepare('SELECT m.id, m.vehicle_id, m.kind, m.last_done_date, v.active FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id WHERE m.id=?').bind(ruleId).first();
  if (!r) throw notFound();
  // gleiche Prüfung wie Werkstatttermine: echtes Kalenderdatum, nicht mehr als 1 Jahr zurück / 2 Jahre voraus
  const d = body.planned_date ? planDate(str(body.planned_date, { max: 10, field: 'Termin' })) : null;
  // Termin setzen nur für aktive Fahrzeuge und nicht für erledigte Rückrufe (wie „Werkstattauftrag erstellen“; 18.10.2026 – Termin stand
  // sonst im Plan/Kalender); Termin entfernen bleibt immer möglich
  if (d && !r.active) throw bad('validation', 'Fahrzeug ist außer Betrieb.');
  if (d && ONE_TIME_KINDS.includes(r.kind) && r.last_done_date) throw conflict('already_done', 'Dieser Rückruf ist bereits durchgeführt.');
  await env.DB.prepare('UPDATE maintenance_rules SET planned_date=?, updated_at=? WHERE id=?').bind(d, nowIso(), ruleId).run();
  await audit(env, user.id, 'maintenance.plan', r.vehicle_id, { kind: r.kind, planned_date: d });
  return { ok: true, planned_date: d };
}

// Sammeltermin (Backlog 235, Blickwinkel „Fuhrparkleitung plant die UVV aller Fahrzeuge an einem Tag“): denselben Termin für mehrere
// Prüftermin-Einträge auf einmal setzen – gleiche Regeln wie `planMaintenance` je Eintrag, aber mit fester Abfragezahl (Auswahl, Änderung
// und Protokoll je Fahrzeug in einem Stapel). Nicht übernommen und einzeln gemeldet: außer Betrieb, erledigter Rückruf, unbekannt sowie ein
// anderer Termin ab heute (nur mit `replace` ersetzt – vorher überschrieb ein Sammeltermin bestehende Absprachen still). HU/SP ohne eigenen
// Eintrag (`husp:…`) einzeln in der Fahrzeugakte einplanen (Eintrag wird dort erst angelegt). Kein Termin entfernen über diesen Weg.
export const PLAN_BATCH_MAX = 200;
export async function planMaintenanceBatch(env, user, body) {
  if (!isManager(user) && user.role !== 'workshop') throw forbidden();
  const d = planDate(str(body.planned_date, { required: true, max: 10, field: 'Termin' }));
  const raw = Array.isArray(body.ids) ? body.ids : null;
  if (!raw || !raw.length || raw.length > PLAN_BATCH_MAX || raw.some((x) => typeof x !== 'string' || !x || x.length > 80)) throw bad('validation', 'Bitte 1 bis 200 Prüftermine auswählen.');
  const ids = [...new Set(raw)];
  const replace = flag(body.replace);
  const today = berlinDate();
  const rows = (await env.DB.prepare(`SELECT m.id, m.vehicle_id, m.kind, m.last_done_date, m.planned_date, v.active, v.plate FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id
    WHERE m.id IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(ids.filter((x) => !x.startsWith('husp:')))).all()).results || [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const skipped = []; const planned = []; let unchanged = 0;
  for (const id of ids) {
    if (id.startsWith('husp:')) { const p = id.split(':'); skipped.push({ id, ...(p.length === 4 ? { vehicle_id: `${p[1]}:${p[2]}`, kind: p[3] } : {}), code: 'husp_virtual' }); continue; }
    const r = byId.get(id);
    if (!r) { skipped.push({ id, code: 'not_found' }); continue; }
    const base = { id, vehicle_id: r.vehicle_id, plate: r.plate, kind: r.kind };
    if (!r.active) { skipped.push({ ...base, code: 'inactive' }); continue; }
    if (ONE_TIME_KINDS.includes(r.kind) && r.last_done_date) { skipped.push({ ...base, code: 'already_done' }); continue; }
    if (r.planned_date === d) { unchanged++; continue; }
    if (r.planned_date && r.planned_date >= today && !replace) { skipped.push({ ...base, code: 'planned_other', planned_date: r.planned_date }); continue; }
    planned.push({ ...base, previous: r.planned_date || null });
  }
  if (planned.length) {
    const now = nowIso();
    await env.DB.batch([
      env.DB.prepare('UPDATE maintenance_rules SET planned_date=?, updated_at=? WHERE id IN (SELECT value FROM json_each(?))').bind(d, now, JSON.stringify(planned.map((p) => p.id))),
      // Protokoll je Eintrag wie `planMaintenance` (Ziel = Fahrzeug), zusätzlich `batch` und ein ersetzter Termin
      env.DB.prepare(`INSERT INTO audit_log(id,actor_id,action,target,detail,created_at) SELECT json_extract(j.value,'$[0]'), ?, 'maintenance.plan', json_extract(j.value,'$[1]'), json_extract(j.value,'$[2]'), ? FROM json_each(?) j`)
        .bind(user.id, now, JSON.stringify(planned.map((p) => [uuid(), p.vehicle_id, JSON.stringify({ kind: p.kind, planned_date: d, batch: true, ...(p.previous ? { replaced: p.previous } : {}) })]))),
    ]);
  }
  return { ok: true, planned_date: d, planned: planned.map(({ previous, ...p }) => (previous ? { ...p, replaced: previous } : p)), unchanged, skipped };
}

// Sammelanlage (Backlog 405, Blickwinkel „Wintercheck vor der Saison für alle Lkw“): denselben Prüftermin (Art, Nachweis/Bezeichnung, optional
// Intervall und Fälligkeit laut Leitung) für mehrere Fahrzeuge in einem Schritt anlegen – vorher eine Fahrzeugakte nach der anderen oder ein
// CSV-Import. Nur Inhaber/Fuhrparkleitung (wie der Import). Keine Durchführung/km je Fahrzeug (die sind fahrzeugbezogene Belege → „erledigt“
// in der Fahrzeugakte bzw. Werkstattplan). Nicht für HU/SP (Frist rechnet die App je Fahrzeug nach Anl. VIII) und Rückrufe (Referenz je
// Schreiben → Rückruf-Import). Feste Abfragezahl: Auswahl, ein Stapel (Anlage mit Doppelschutz im selben INSERT + Protokoll), Nachlese.
// Übersprungen und einzeln gemeldet: unbekannt, außer Betrieb, ruhend (aus Bewertungen ausgenommen), Art schon vorhanden (je Fahrzeug nur
// ein Eintrag dieser Art). Bei „Sonstiges“ gilt derselbe Nachweistext am selben Fahrzeug als bereits angelegt (erneutes Senden → unverändert).
export const CREATE_BATCH_MAX = 200;
export async function addMaintenanceRuleBatch(env, user, body) {
  if (!isManager(user)) throw forbidden();
  const kind = oneOf(body.kind, MAINT_KINDS, 'Art');
  if (kind === 'HU' || kind === 'SP' || ONE_TIME_KINDS.includes(kind)) throw bad('validation', 'HU/SP und Rückrufe bitte je Fahrzeug bzw. über „Rückrufe importieren“ anlegen.');
  const evidence = str(body.evidence, { required: true, max: 300, field: 'Nachweis/Quelle' });
  const months = body.interval_months ? num(body.interval_months, { min: 1, max: 120, field: 'Intervall Monate' }) : null;
  const km = body.interval_km ? num(body.interval_km, { min: 100, max: 1000000, field: 'Intervall km', grouped: true }) : null;
  if ((months !== null && !Number.isInteger(months)) || (km !== null && !Number.isInteger(km))) throw bad('validation', 'Intervall als ganze Zahl angeben.');
  const nextDue = str(body.next_due_date, { max: 10, field: 'Nächster Termin' });
  if (nextDue && !isCalendarDate(nextDue)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
  if (nextDue && nextDue > maxFutureDate()) throw bad('validation', DUE_FAR_MSG);
  const raw = Array.isArray(body.vehicle_ids) ? body.vehicle_ids : null;
  if (!raw || !raw.length || raw.length > CREATE_BATCH_MAX || raw.some((x) => typeof x !== 'string' || !x || x.length > 40)) throw bad('validation', 'Bitte 1 bis 200 Fahrzeuge auswählen.');
  const ids = [...new Set(raw)];
  const single = !MULTI_RULE_KINDS.includes(kind);
  // vorhandener Eintrag: bei Einzelarten jede gleiche Art, bei „Sonstiges“ nur derselbe Nachweistext (gleiche Aktion)
  const SAME = `SELECT 1 FROM maintenance_rules m WHERE m.vehicle_id=%V AND m.kind=?${single ? '' : ' AND m.evidence=?'}`;
  const sameArgs = single ? [kind] : [kind, evidence];
  const rows = (await env.DB.prepare(`SELECT v.id, v.plate, v.active, v.eval_excluded, EXISTS(${SAME.replace('%V', 'v.id')}) AS has FROM vehicles v WHERE v.id IN (SELECT value FROM json_each(?))`)
    .bind(...sameArgs, JSON.stringify(ids)).all()).results || [];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const skipped = []; const todo = []; let unchanged = 0;
  for (const id of ids) {
    const r = byId.get(id);
    if (!r) { skipped.push({ vehicle_id: id, code: 'not_found' }); continue; }
    const base = { vehicle_id: id, plate: r.plate };
    if (!r.active) { skipped.push({ ...base, code: 'inactive' }); continue; }
    if (r.eval_excluded) { skipped.push({ ...base, code: 'dormant' }); continue; }
    if (r.has) { if (single) skipped.push({ ...base, code: 'rule_exists' }); else unchanged++; continue; }
    todo.push({ ...base, id: uuid() });
  }
  const created = [];
  if (todo.length) {
    const now = nowIso();
    const j = (k) => `json_extract(j.value,'$.${k}')`;
    await env.DB.batch([
      // Doppelschutz im selben INSERT (zwei gleichzeitige Klicks/Tabs): nur Fahrzeuge ohne passenden Eintrag
      env.DB.prepare(`INSERT INTO maintenance_rules(id,vehicle_id,kind,interval_months,interval_km,last_done_date,last_done_km,due_km,next_due_date,evidence,created_by,created_at,updated_at,due_source,km_basis_at)
        SELECT ${j('id')}, ${j('vehicle_id')}, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ? FROM json_each(?) j WHERE NOT EXISTS (${SAME.replace('%V', j('vehicle_id'))})`)
        .bind(kind, months, km, nextDue || null, evidence, user.id, now, now, nextDue ? 'nachweis' : 'berechnet', now, JSON.stringify(todo.map(({ id, vehicle_id }) => ({ id, vehicle_id }))), ...sameArgs),
      // Protokoll je angelegtem Eintrag (Ziel = Fahrzeug)
      env.DB.prepare(`INSERT INTO audit_log(id,actor_id,action,target,detail,created_at) SELECT ${j('a')}, ?, 'maintenance.rule_add', ${j('vehicle_id')}, json_object('kind', ?, 'rule_id', ${j('id')}, 'batch', json('true')${nextDue ? ", 'next_due_date', ?" : ''}), ?
        FROM json_each(?) j WHERE EXISTS (SELECT 1 FROM maintenance_rules m WHERE m.id=${j('id')})`)
        .bind(user.id, kind, ...(nextDue ? [nextDue] : []), now, JSON.stringify(todo.map(({ id, vehicle_id }) => ({ id, vehicle_id, a: uuid() })))),
    ]);
    const made = new Set(((await env.DB.prepare('SELECT id FROM maintenance_rules WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(todo.map((x) => x.id))).all()).results || []).map((r) => r.id));
    for (const x of todo) { if (made.has(x.id)) created.push(x); else if (single) skipped.push({ vehicle_id: x.vehicle_id, plate: x.plate, code: 'rule_exists' }); else unchanged++; }
  }
  return { ok: true, kind, created: created.map(({ id, vehicle_id, plate }) => ({ id, vehicle_id, plate })), unchanged, skipped };
}

// HU/SP ohne eigenen Eintrag (Frist nur berechnet, Zeile `virtual` in der Prüftermin-Übersicht, Backlog 93): erst wenn jemand in der
// Fahrzeugakte eine Durchführung erfasst, einen Termin plant oder einen Auftrag erstellt, wird der Eintrag angelegt (19.10.2026) – nie
// automatisch. Ohne Nachweis-Datum/Fälligkeit: die Frist rechnet danach genauso wie vorher (syncHuSpDues). Vorhandener Eintrag → dessen id.
export const HUSP_RULE_EVIDENCE = 'Frist nach StVZO Anlage VIII berechnet (aus der Fahrzeugakte angelegt)';
export async function ensureHuSpRule(env, user, vehicleId, kind, { allowInactive = false } = {}) {
  if (!isManager(user) && user.role !== 'workshop') throw forbidden();
  if (kind !== 'HU' && kind !== 'SP') throw notFound();
  const existing = async () => (await env.DB.prepare('SELECT id FROM maintenance_rules WHERE vehicle_id=? AND kind=? ORDER BY created_at LIMIT 1').bind(vehicleId, kind).first() || {}).id || null;
  const v = await env.DB.prepare('SELECT id, active FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const found = await existing();
  if (found) return { id: found, created: false };
  // Durchführung vor dem Abgang nachtragen bleibt möglich (wie bei vorhandenem Eintrag, 23.10.2026); Termin/Auftrag nur in Betrieb
  if (!v.active && !allowInactive) throw bad('validation', 'Fahrzeug ist außer Betrieb.');
  const x = (await loadHuSpInputs(env, [vehicleId])).get(vehicleId);
  const st = x ? huSpFor(x, berlinDate(), 0)[kind === 'HU' ? 'hu' : 'sp'] : null;
  if (st && st.status === 'nicht_sp_pflichtig') throw bad('validation', 'Für dieses Fahrzeug ist keine SP vorgeschrieben.');
  try {
    const id = (await addMaintenanceRule(env, user, vehicleId, { kind, evidence: HUSP_RULE_EVIDENCE })).id;
    await audit(env, user.id, 'maintenance.husp_rule', vehicleId, { kind });
    return { id, created: true };
  } catch (e) {
    // gleichzeitig angelegt (zweiter Klick/zweite Person) → den vorhandenen Eintrag verwenden
    if (e instanceof HttpError && e.code === 'rule_exists') { const id = await existing(); if (id) return { id, created: false }; }
    throw e;
  }
}

// Gegenstück zu ensureHuSpRule: nur einen unbenutzten Eintrag (keine Durchführung, kein Termin, kein Auftrag) löschen, mit Protokoll
export async function dropUnusedHuSpRule(env, user, ruleId, vehicleId, kind) {
  const r = await env.DB.prepare(`DELETE FROM maintenance_rules WHERE id=? AND planned_date IS NULL AND last_done_date IS NULL
    AND NOT EXISTS (SELECT 1 FROM maintenance_events WHERE rule_id=?1) AND NOT EXISTS (SELECT 1 FROM cases WHERE maintenance_rule_id=?1)`).bind(ruleId).run();
  if (r && r.meta && r.meta.changes) await audit(env, user.id, 'maintenance.husp_rule_undo', vehicleId, { kind });
}

// Prüfrelevante Fahrzeugdaten: zulässige Gesamtmasse (F.2), Erstzulassung (B) – nur mit Nachweis
export async function setVehicleSpec(env, user, vehicleId, body) {
  if (!isManager(user)) throw forbidden();
  const v = await env.DB.prepare('SELECT id, plate, kind, zgm_class, zgm_kg, first_registration FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const source = str(body.spec_source, { required: true, max: 200, field: 'Nachweis (z. B. Fahrzeugschein)' });
  const kg = body.zgm_kg === undefined || body.zgm_kg === null || body.zgm_kg === '' ? null : Math.round(num(body.zgm_kg, { min: 500, max: 60000, field: 'zulässige Gesamtmasse (kg)', grouped: true }));
  const allowed = v.kind === 'anhaenger' ? ZGM_CLASSES_TRAILER : ZGM_CLASSES_LKW;
  let cls = body.zgm_class ? oneOf(body.zgm_class, allowed, 'Gewichtsklasse') : null;
  if (kg !== null) {
    const fromKg = zgmClassFromKg(v.kind, kg);
    if (cls && cls !== fromKg) throw bad('validation', 'Gewichtsklasse passt nicht zur angegebenen Gesamtmasse.');
    cls = fromKg;
  }
  const ez = body.first_registration ? str(body.first_registration, { max: 10, field: 'Erstzulassung' }) : null;
  if (ez && (!isCalendarDate(ez) || ez > berlinDate())) throw bad('validation', 'Erstzulassung im Format JJJJ-MM-TT, nicht in der Zukunft.');
  // Untergrenze wie Baujahr (23.10.2026: 1900-01-01 wurde angenommen und trieb die SP-Prognose)
  if (ez && ez < '1950-01-01') throw bad('validation', 'Erstzulassung vor 1950 ist nicht plausibel.');
  // gelesener Stand (Formular sendet `expected_updated_at`): zwischenzeitliche Änderung → 409 statt still überschreiben (21.10.2026, Backlog 105)
  const expected = body.expected_updated_at ? str(body.expected_updated_at, { max: 40, field: 'Stand' }) : null;
  const up = await env.DB.prepare('UPDATE vehicles SET zgm_class=?, zgm_kg=?, first_registration=?, spec_source=?, updated_at=? WHERE id=? AND (? IS NULL OR updated_at=?)').bind(cls, kg, ez, source, nowIso(), vehicleId, expected, expected).run();
  if (expected && !(up.meta && up.meta.changes)) throw conflict('version_conflict', 'Inzwischen von jemand anderem geändert – bitte neu laden.');
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
  const us = (await env.DB.prepare(`SELECT id, language FROM users WHERE active=1 AND password_hash IS NOT NULL AND environment=? AND role IN ('owner','fleet','dispatch') AND id<>?`)
    .bind(envName, user.id).all()).results;
  if (!us.length) return 0;
  const text = (l) => ({ title: nt(l, 'inspection_defect'), body: `${v.plate} · ${maintKindLang(kind, l)} ${dateLang(date, l)}: ${nt(l, 'res_' + result)}${result === 'verkehrsunsicher' ? ' – ' + nt(l, 'do_not_plan') : ''}${envName === 'test' ? ' · TEST' : ''}` });
  return notifyUsers(env, ctx, envName, us.map((x) => x.id), { kind: 'inspection_defect', ...text('de'), urgent: true, localize: text, langOf: new Map(us.map((x) => [x.id, x.language])),
    eventKey: `inspdef:${key}:${date}:${result}`, ref: `vehicle:${vehicleId}` });
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
  const km = body.done_km != null && String(body.done_km).trim() !== '' ? kmNum(body.done_km, { field: 'km' }) : null;
  if (r.interval_km && km === null && r.kind !== 'HU' && r.kind !== 'SP') throw bad('validation', 'Kilometerstand bei Durchführung angeben – diese Prüfung hat ein Kilometer-Intervall.');
  // Plausibilität wie „Kilometerstand erfassen“: nicht kleiner als der zuletzt davor erfasste km-Stand (Tippfehler würde km-Fälligkeiten
  // und €/km verfälschen). Tachotausch: zuerst den km-Stand des neuen Zählers mit Begründung in der Fahrzeugakte erfassen.
  const drop = parseKmDrop((await env.DB.prepare(`SELECT ${KM_DROP_SQL('?')} AS d`).bind(r.vehicle_id).first() || {}).d);
  if (km !== null) {
    const at = date >= berlinDate() ? nowIso() : `${date}T12:00:00.000Z`;
    const prev = await env.DB.prepare('SELECT km FROM odometer_readings WHERE vehicle_id=? AND measured_at <= ? ORDER BY measured_at DESC, rowid DESC LIMIT 1').bind(r.vehicle_id, at).first();
    if (prev && km < prev.km) throw bad('validation', 'Kilometerstand bei Durchführung ist kleiner als ein zuvor erfasster km-Stand. Bitte prüfen; bei Tachotausch zuerst den neuen km-Stand mit Begründung in der Fahrzeugakte erfassen.');
    // auch nicht größer als ein später erfasster, unbegründeter Stand (nachgetragene Prüfung mit Tippfehler machte sonst die spätere
    // Ablesung zum Rücksprung und verfälschte Fahrleistung/km-Fälligkeiten – wie „Kilometerstand erfassen“, 17.10.2026)
    const nextR = await env.DB.prepare('SELECT km, note FROM odometer_readings WHERE vehicle_id=? AND measured_at > ? ORDER BY measured_at ASC, rowid ASC LIMIT 1').bind(r.vehicle_id, at).first();
    if (nextR && km > nextR.km && !(nextR.note && String(nextR.note).trim())) throw bad('validation', 'Kilometerstand bei Durchführung ist größer als ein später erfasster km-Stand. Bitte prüfen.');
  }
  // nicht kleiner als der km-Stand der letzten Durchführung dieser Regel (ohne Ablesungen am Fahrzeug griff die Prüfung oben nicht: Tippfehler
  // 30 000 statt 330 000 → km-Fälligkeit viel zu früh, 19.10.2026); nach einem km-Rücksprung (Tachotausch) gilt der alte Stand nicht
  if (km !== null && r.last_done_km !== null && r.last_done_km !== undefined && km < r.last_done_km && (!r.last_done_date || date >= r.last_done_date) && !kmCounterDropAfter(r, drop))
    throw bad('validation', 'Kilometerstand bei Durchführung ist kleiner als der km-Stand der letzten Durchführung. Bitte prüfen; bei Tachotausch zuerst den neuen km-Stand mit Begründung in der Fahrzeugakte erfassen.');
  const husp = r.kind === 'HU' || r.kind === 'SP';
  const docNext = str(body.next_due_date, { max: 10, field: 'Nächster Termin' });
  // wie beim Anlegen: nur echtes Kalenderdatum (sonst „31.12.2027“ gespeichert → Tage NaN, Status „in Ordnung“, nie überfällig; 17.10.2026)
  if (docNext && !isCalendarDate(docNext)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
  if (docNext && docNext > maxFutureDate()) throw bad('validation', DUE_FAR_MSG);
  if (docNext && docNext < date) throw bad('validation', 'Nächster Termin liegt vor der letzten Durchführung.');
  // einmalige Aktion (Rückruf): nur einmal durchführbar, keine Folgefrist (sonst stünde sie nie auf „erledigt“)
  const oneTime = ONE_TIME_KINDS.includes(r.kind);
  if (oneTime && r.last_done_date) throw conflict('already_done', 'Dieser Rückruf ist bereits durchgeführt.');
  if (oneTime && (docNext || (body.next_due_km && String(body.next_due_km).trim()))) throw bad('validation', 'Rückruf ist eine einmalige Aktion – keine Folgefrist angeben.');
  // neue km-Fälligkeit laut Beleg (z. B. Serviceanzeige nach dem Ölwechsel); ohne Angabe gilt „km + Intervall km“
  let docKm = body.next_due_km ? kmNum(body.next_due_km, { min: 1, field: 'km' }) : null;
  if (husp && docKm !== null) throw bad('validation', 'HU/SP sind zeitabhängig – keine km-Fälligkeit angeben.');
  if (docKm !== null && km !== null && docKm <= km) throw bad('validation', 'Fällig bei km liegt nicht nach dem km-Stand der letzten Prüfung.');
  if (docKm !== null && km !== null && r.interval_km && docKm === km + r.interval_km) docKm = null;
  const next = docNext || (!husp && r.interval_months ? addMonths(date, r.interval_months) : null);
  const result = body.result ? oneOf(body.result, INSPECTION_RESULTS, 'Prüfergebnis') : null;
  // Atomar (17.10.2026):
  // - Regel (letzte Durchführung, Fälligkeit) nur ändern, wenn diese Durchführung nicht älter ist als die gespeicherte – ein nachgetragener
  //   alter Bericht (oder die langsamere von zwei gleichzeitigen Erfassungen) verschob sonst die Fälligkeit zurück. Die Durchführung selbst
  //   wird immer gespeichert (Verlauf). Rückruf: nur, solange noch nicht durchgeführt (sonst 409, auch bei gleichzeitiger Erfassung).
  // - Ein vorhandenes, abweichendes Prüfergebnis derselben Durchführung wird nie überschrieben (wie „Prüfergebnis nachtragen“).
  const guard = (sql, ...a) => [env.DB.prepare(`INSERT INTO cmd_guard(ok) ${sql}`).bind(...a), env.DB.prepare('DELETE FROM cmd_guard')];
  // km-Grundlage nur erneuern, wenn die Durchführung nicht vor dem letzten km-Rücksprung (Tachotausch) liegt (18.10.2026: nachgetragene
  // Durchführung vom alten Zähler hob „ungeklärt“ auf, danach Rest-km aus gemischten Zählern)
  const basisAt = kmBasisForDone(drop, date, r.km_basis_at, nowIso());
  const stmts = [
    ...(result ? guard('SELECT CASE WHEN COUNT(*)=0 THEN 1 ELSE 0 END FROM maintenance_events WHERE rule_id=? AND done_date=? AND result IS NOT NULL AND result<>?', ruleId, date, result) : []),
    env.DB.prepare(`UPDATE maintenance_rules SET last_done_date=?, last_done_km=?, due_km=?, next_due_date=?, evidence=?, updated_at=?, km_basis_at=?, due_source=?, planned_date=NULL
      WHERE id=? AND ${oneTime ? 'last_done_date IS NULL' : '(last_done_date IS NULL OR last_done_date <= ?)'}`)
      // ohne Beleg berechnet (19.10.2026: Herkunft „Nachweis“ der alten Plakette blieb – Import des eigenen Exports mit neuerer Prüfung griff dann nicht)
      .bind(date, km, docKm, next, oneTime ? `${r.evidence} · Durchführung: ${evidence}` : evidence, nowIso(), basisAt, docNext ? 'nachweis' : (husp || next ? 'berechnet' : null), ruleId, ...(oneTime ? [] : [date])),
    ...(oneTime ? guard('SELECT changes()') : []),
    maintEventStmt(env, { rule_id: ruleId, vehicle_id: r.vehicle_id, kind: r.kind, done_date: date, done_km: km, evidence, source: 'erledigt', user_id: user.id }),
    ...(result ? [env.DB.prepare('UPDATE maintenance_events SET result=? WHERE rule_id=? AND done_date=? AND result IS NULL').bind(result, ruleId, date)] : []),
  ];
  // km-Stand der Durchführung im selben Stapel und mit derselben Plausibilität wie „Kilometerstand erfassen“ (18.10.2026: eine zwischen Prüfung
  // und Einfügen erfasste höhere Ablesung machte die Wartungs-Ablesung zum unbegründeten Rücksprung → alle km-Fälligkeiten „ungeklärt“).
  // Gleiche Ablesung (Fahrzeug/Zeitpunkt/Quelle) schon vorhanden → wie bisher nichts Neues; sonst muss sie eingefügt worden sein (Wächter).
  const kmAt = date >= berlinDate() ? nowIso() : `${date}T12:00:00.000Z`; // heute → jetzt (12:00 UTC läge morgens in der Zukunft)
  if (km !== null) {
    stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at)
      SELECT ?1,?2,?3,?4,?5,?6,?7 WHERE COALESCE((SELECT km FROM odometer_readings WHERE vehicle_id=?2 AND measured_at <= ?4 ORDER BY measured_at DESC, rowid DESC LIMIT 1), -1) <= ?3
        AND NOT EXISTS (SELECT 1 FROM (SELECT km, note FROM odometer_readings WHERE vehicle_id=?2 AND measured_at > ?4 ORDER BY measured_at ASC, rowid ASC LIMIT 1) n WHERE n.km < ?3 AND TRIM(COALESCE(n.note,''))='')`)
      .bind(uuid(), r.vehicle_id, km, kmAt, `wartung:${r.kind}`, user.id, nowIso()),
    ...guard('SELECT CASE WHEN EXISTS (SELECT 1 FROM odometer_readings WHERE vehicle_id=? AND measured_at=? AND source=?) THEN 1 ELSE 0 END', r.vehicle_id, kmAt, `wartung:${r.kind}`));
  }
  // Dieselbe Durchführung (Prüfart, Tag) hat eine andere Person schon in der App mit anderem Nachweis erfasst: nicht still überschreiben
  // (Backlog 207, Teilagent „HU-Tag in der Werkstatt“: „DEKRA-Bericht 770“ stand danach nur noch im Protokoll). Korrektur durch dieselbe
  // Person und gleicher Nachweis (Wiederholung) bleiben erlaubt; eine importierte Durchführung darf die App weiterhin ergänzen.
  const same = await env.DB.prepare('SELECT evidence, source, recorded_by FROM maintenance_events WHERE rule_id=? AND done_date=?').bind(ruleId, date).first();
  if (same && same.source !== 'import' && same.recorded_by && same.recorded_by !== user.id && String(same.evidence || '').trim() && String(same.evidence || '').trim() !== String(evidence || '').trim()) {
    throw conflict('evidence_exists', `Für diese Durchführung am ${date.split('-').reverse().join('.')} ist bereits ein anderer Nachweis erfasst („${cutText(String(same.evidence).trim(), 80)}“) – bitte Datum und Bericht prüfen.`);
  }
  const ruleIdx = result ? 2 : 0;
  let out;
  try { out = await env.DB.batch(stmts); } catch (e) {
    if (String(e && e.message).includes('CHECK')) {
      if (km !== null && !(await env.DB.prepare('SELECT 1 FROM odometer_readings WHERE vehicle_id=? AND measured_at=? AND source=?').bind(r.vehicle_id, kmAt, `wartung:${r.kind}`).first())) {
        const p2 = await env.DB.prepare('SELECT km FROM odometer_readings WHERE vehicle_id=? AND measured_at <= ? ORDER BY measured_at DESC, rowid DESC LIMIT 1').bind(r.vehicle_id, kmAt).first();
        const n2 = await env.DB.prepare('SELECT km, note FROM odometer_readings WHERE vehicle_id=? AND measured_at > ? ORDER BY measured_at ASC, rowid ASC LIMIT 1').bind(r.vehicle_id, kmAt).first();
        if ((p2 && p2.km > km) || (n2 && n2.km < km && !(n2.note && String(n2.note).trim()))) throw conflict('km_changed', 'Inzwischen wurde ein anderer Kilometerstand erfasst. Bitte neu laden und prüfen.');
      }
      if (oneTime && (await env.DB.prepare('SELECT last_done_date FROM maintenance_rules WHERE id=?').bind(ruleId).first() || {}).last_done_date) throw conflict('already_done', 'Dieser Rückruf ist bereits durchgeführt.');
      throw conflict('result_exists', 'Für diese Durchführung ist bereits ein Prüfergebnis eingetragen – es wird nicht überschrieben.');
    }
    throw e;
  }
  const older = !oneTime && !(out[ruleIdx] && out[ruleIdx].meta && out[ruleIdx].meta.changes);
  await audit(env, user.id, 'maintenance.done', r.vehicle_id, { kind: r.kind, done_date: date, result, evidence });
  if (husp) await syncHuSpDues(env, { today: berlinDate(), actorId: user.id, vehicleIds: [r.vehicle_id] });
  // Gefährliche Mängel / verkehrsunsicher: sofort Leitung, Inhaber und Disposition der aktiven Umgebung informieren – nur für aktuelle
  // Prüfungen (≤ 30 Tage, neueste dieser Prüfart), nicht beim Nachtragen alter Berichte. Einmal je Prüfung und Person (event_key).
  const notified = await notifyInspectionDefect(env, ctx, envName, user, { vehicleId: r.vehicle_id, kind: r.kind, date, result, key: ruleId });
  // older: Durchführung liegt vor der gespeicherten letzten – nur im Verlauf, Fälligkeit unverändert (Antwort nennt die gültige)
  if (older) return { ok: true, notified, older_than_last: true, last_done_date: (await env.DB.prepare('SELECT last_done_date FROM maintenance_rules WHERE id=?').bind(ruleId).first()).last_done_date,
    next_due_date: (await env.DB.prepare('SELECT next_due_date FROM maintenance_rules WHERE id=?').bind(ruleId).first()).next_due_date };
  return { ok: true, notified, next_due_date: husp ? (await env.DB.prepare('SELECT next_due_date FROM maintenance_rules WHERE id=?').bind(ruleId).first()).next_due_date : next };
}

// Begründung zu einer km-Ablesung nachtragen (nur wenn noch keine vorhanden; km-Wert und Zeitpunkt bleiben unverändert): Datenqualität
// „Rücksprung ohne Begründung“ ließ sich vorher nicht auflösen (22.10.2026). Inhaber/Leitung, protokolliert.
export async function addOdometerNote(env, user, readingId, body) {
  if (!isManager(user)) throw forbidden();
  const note = str(body.note, { max: 300, field: 'Begründung', required: true });
  const o = await env.DB.prepare('SELECT id, vehicle_id, km, measured_at, note FROM odometer_readings WHERE id=?').bind(readingId).first();
  if (!o) throw notFound('km-Stand nicht gefunden.');
  if (o.note && String(o.note).trim()) throw conflict('note_exists', 'Zu diesem km-Stand ist bereits eine Begründung erfasst.');
  const r = await env.DB.prepare(`UPDATE odometer_readings SET note=? WHERE id=? AND (note IS NULL OR trim(note)='')`).bind(note, readingId).run();
  if (!r.meta || r.meta.changes !== 1) throw conflict('note_exists', 'Zu diesem km-Stand ist bereits eine Begründung erfasst.');
  await audit(env, user.id, 'vehicle.odometer_note', o.vehicle_id, { km: o.km, measured_at: o.measured_at, note });
  return { ok: true };
}

export async function addOdometer(env, user, vehicleId, body) {
  if (!['owner', 'fleet', 'workshop', 'driver', 'dispatch'].includes(user.role)) throw forbidden();
  const km = kmNum(body.km);
  // Ablesedatum optional (nachträgliche Erfassung), nie in der Zukunft; ohne Datum = jetzt
  const now = nowIso();
  let measuredAt = now;
  const mOn = typeof body.measured_on === 'string' ? body.measured_on.trim() : body.measured_on; // Leerzeichen wie bei den anderen Datumsfeldern
  if (mOn) {
    const d = String(mOn);
    if (!isCalendarDate(d) || d < '2000-01-01') throw bad('validation', 'Ablesedatum ungültig (JJJJ-MM-TT).');
    const today = berlinDate();
    if (d > today) throw bad('validation', 'Ablesedatum darf nicht in der Zukunft liegen.');
    if (d < today) measuredAt = `${d}T12:00:00.000Z`;
  }
  const note = str(body.note, { max: 300, field: 'Bemerkung' });
  const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound('Fahrzeug nicht gefunden.');
  // Plausibilität gegen die zeitlich benachbarten Werte: davor nicht größer, danach nicht kleiner – sonst nur mit Begründung
  const [prev, next] = await Promise.all([
    env.DB.prepare('SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? AND measured_at <= ? ORDER BY measured_at DESC LIMIT 1').bind(vehicleId, measuredAt).first(),
    env.DB.prepare('SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? AND measured_at > ? ORDER BY measured_at ASC LIMIT 1').bind(vehicleId, measuredAt).first(),
  ]);
  const problems = [];
  const de = (iso) => berlinDate(iso).split('-').reverse().join('.'); // Berliner Tag (Ablesung kurz nach Mitternacht ≠ UTC-Vortag)
  if (prev && km < prev.km) problems.push(`kleiner als ${prev.km} km vom ${de(prev.measured_at)}`);
  if (next && km > next.km) problems.push(`größer als ${next.km} km vom ${de(next.measured_at)}`);
  // Werte für die Anzeige in der Oberflächensprache (19.10.2026: Hinweis kam in UK/EN deutsch)
  const warningItems = [...(prev && km < prev.km ? [{ dir: 'below', km: prev.km, at: prev.measured_at }] : []), ...(next && km > next.km ? [{ dir: 'above', km: next.km, at: next.measured_at }] : [])];
  if (problems.length && !note) {
    throw conflict('km_not_plausible', `Kilometerstand ${km} km ist ${problems.join(' und ')}. Bitte prüfen oder Begründung angeben (z. B. Tachotausch).`, { previous: prev, next });
  }
  // Gleicher Stand derselben Person am selben Berliner Tag (doppelt gesendet) → keine zweite Zeile (17.10.2026)
  const day = berlinDate(measuredAt);
  if (await env.DB.prepare(`SELECT 1 FROM odometer_readings WHERE vehicle_id=? AND recorded_by=? AND km=? AND ${berlinDaySql('measured_at')}=? LIMIT 1`).bind(vehicleId, user.id, km, day).first()) {
    return { ok: true, duplicate: true, measured_at: measuredAt, warning: null };
  }
  // Nachgetragener Stand (Ablesedatum vor heute = 12:00 UTC): eindeutig je Fahrzeug/Zeitpunkt/Quelle (`manuell:<Rolle>`). Erfasst eine
  // zweite Person derselben Rolle für denselben Tag, rückt ihr Zeitpunkt um Millisekunden weiter statt 409 (17.10.2026);
  // dieselbe Person mit anderem Stand am selben Tag bleibt 409 `km_duplicate` (Korrektur statt zweiter Zeile).
  let at = measuredAt;
  for (let attempt = 0; ; attempt++) {
    try {
      // Plausibilität und Dublette im Einfügen selbst geprüft: zwei gleichzeitige Erfassungen (100 000 und 90 000 km) umgingen sonst
      // die Prüfung und erzeugten einen unbegründeten Rücksprung bzw. doppelte Zeilen (17.10.2026)
      const r = await env.DB.prepare(`INSERT INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at,note)
        SELECT ?1,?2,?3,?4,?5,?6,?7,?8 WHERE NOT EXISTS (SELECT 1 FROM odometer_readings WHERE vehicle_id=?2 AND recorded_by=?6 AND km=?3 AND ${berlinDaySql('measured_at')}=?9)
          AND (?8 IS NOT NULL OR (COALESCE((SELECT km FROM odometer_readings WHERE vehicle_id=?2 AND measured_at <= ?4 ORDER BY measured_at DESC LIMIT 1), -1) <= ?3
            AND COALESCE((SELECT km FROM odometer_readings WHERE vehicle_id=?2 AND measured_at > ?4 ORDER BY measured_at ASC LIMIT 1), 9999999999) >= ?3))`)
        .bind(uuid(), vehicleId, km, at, `manuell:${user.role}`, user.id, now, note, day).run();
      if (!r.meta || r.meta.changes !== 1) {
        if (await env.DB.prepare(`SELECT 1 FROM odometer_readings WHERE vehicle_id=? AND recorded_by=? AND km=? AND ${berlinDaySql('measured_at')}=? LIMIT 1`).bind(vehicleId, user.id, km, day).first()) {
          return { ok: true, duplicate: true, measured_at: at, warning: null };
        }
        throw conflict('km_changed', 'Inzwischen wurde ein anderer Kilometerstand erfasst. Bitte neu laden und prüfen.');
      }
      break;
    } catch (e) {
      if (e instanceof HttpError) throw e;
      if (!/UNIQUE/i.test(String(e && e.message))) throw e;
      const other = await env.DB.prepare('SELECT recorded_by FROM odometer_readings WHERE vehicle_id=? AND measured_at=? AND source=?').bind(vehicleId, at, `manuell:${user.role}`).first();
      if (attempt >= 20 || !other || other.recorded_by === user.id) throw conflict('km_duplicate', 'Für diesen Tag ist bereits ein Kilometerstand von dieser Rolle erfasst.');
      at = new Date(Date.parse(at) + 1).toISOString();
    }
  }
  measuredAt = at;
  return { ok: true, measured_at: measuredAt, warning: problems.length ? `Abweichung mit Begründung gespeichert: ${problems.join(' und ')}.` : null, ...(warningItems.length ? { warning_items: warningItems } : {}) };
}

// Stammdatenimport (CSV mit Kopfzeile: Kennzeichen;Standort;Status;Hersteller;Baujahr;FIN;Anhänger)
export async function importVehiclesCsv(env, user, text, { dryRun = false } = {}) {
  if (user.role !== 'owner') throw forbidden('Nur der Inhaber darf Stammdaten importieren.');
  const table = parseCsv(text);
  if (table.length < 2) throw bad('validation', 'CSV leer.');
  const head = table[0].map((h) => h.trim().toLowerCase());
  // exakte Spalte vor Wortanfang (18.10.2026: „Statusdatum“ vor „Status“ wurde Status, „Finanzierung“ vor „FIN“ wurde FIN)
  const col = (names, skip = () => false) => { const x = head.findIndex((h) => names.includes(h) && !skip(h)); return x >= 0 ? x : head.findIndex((h) => !skip(h) && names.some((n) => h.startsWith(n))); };
  // Kennzeichen-/Anhänger-/Art-Spalte nicht über den Anfang allein (18.10.2026: „Kennzeichen Anhänger“ wurde Fahrzeugkennzeichen bzw. ging
  // still verloren, „Art km-Fälligkeit“ des eigenen Exports galt ohne Spalte „Fahrzeugart“ als Fahrzeugart)
  const isTrailerHead = (h) => /anh(ä|ae)nger|auflieger/.test(h) && !/fin|fahrgestell|gekoppelt/.test(h) && !h.startsWith('fahrzeugart'); // „Fahrzeugart (Lkw/Anhänger)“ aus dem Hinweis ist die Art-Spalte
  const plateIdx = head.findIndex((h) => h.startsWith('kennzeichen') && !isTrailerHead(h));
  const kindIdx = head.findIndex((h) => h.startsWith('fahrzeugart')) >= 0 ? head.findIndex((h) => h.startsWith('fahrzeugart')) : head.findIndex((h) => h.startsWith('art') && !/km|f(ä|ae)llig|prüf|pruef/.test(h));
  const ci = { plate: plateIdx, site: col(['standort']), status: col(['status']), man: col(['hersteller']), model: col(['modell', 'typ']), year: col(['baujahr']), vin: col(['fin', 'fahrgestellnummer', 'fahrgestell', 'vin'], (h) => /anh(ä|ae)nger|auflieger|finanz/.test(h)), trailer: head.findIndex(isTrailerHead), kind: kindIdx, src: col(['quelle', 'nachweis']) };
  if (ci.plate < 0 || ci.vin < 0) throw bad('validation', 'Spalten Kennzeichen und FIN erforderlich.');
  // Reifen-/Prüftermin-Dateien abweisen; der eigene Fahrzeug-Export („Letzter km-Stand“, „Letzte Abfahrtskontrolle“) bleibt importierbar
  if (head.some((h) => h.startsWith('reifen') || h === 'art' || /^(prüfart|pruefart|letzte prüf|letzte pruef|nächster termin|naechster termin)/.test(h))) throw bad('wrong_file', 'Das ist keine Fahrzeugstamm-Datei (Reifen- oder Prüfterminspalten erkannt). Bitte im passenden Importfeld hochladen.');
  const result = { imported: 0, skipped: [], dry_run: dryRun, preview: [] };
  // Backlog 372 (Teilagent „Neuer Lkw kommt in den Bestand“): Spalten Erstzulassung/zGM werden nicht übernommen (HU/SP-Grundlagen brauchen je
  // Fahrzeug einen Nachweis) – vorher still ignoriert, alle Neuzugänge standen ohne Hinweis auf „SP ungeklärt“. Jetzt in Vorschau und Ergebnis genannt.
  const ignoredCols = table[0].map((h) => String(h).trim()).filter((h) => /^(erstzulassung|datum (der )?erstzulassung|ez( |$|\.|\()|zgm|zul(ä|ae)ssige gesamtmasse|zul\. ?gesamtmasse|gesamtmasse|zul(ä|ae)ssiges gesamtgewicht|zul\. ?gesamtgewicht|gesamtgewicht)/i.test(h));
  if (ignoredCols.length) result.ignored_columns = ignoredCols.map((h) => h.slice(0, 60));
  const rows = new Map();
  const cell = (cells, i) => (i >= 0 && cells[i] !== undefined && cells[i] !== '' ? cells[i] : null);
  table.slice(1).forEach((raw, idx) => {
    const line = raw.line || idx + 2;
    // Formelschutz des eigenen Exports zurücknehmen ('- → -, '+ Reserve → + Reserve), sonst änderte die Rundreise die Stammdaten (17.10.2026)
    const cells = raw.map((x) => (typeof x === 'string' ? x.replace(/^'(?=[=+\-@\t\r])/, '') : x));
    const vin = normalizeVin(cells[ci.vin]);
    if (!isValidVin(vin)) { result.skipped.push({ line, plate: cells[ci.plate], reason: 'FIN ungültig/fehlt' }); return; }
    try {
      const yearRaw = cell(cells, ci.year);
      // Baujahr nicht erkannt (Text, außerhalb 1950–2100): Fahrzeug trotzdem übernehmen, Baujahr leer lassen und in der Vorschau nennen
      // (vorher still leer bzw. ganze Zeile übersprungen, 17.10.2026)
      const yNum = yearRaw && /^\d{4}(\.0+)?$/.test(String(yearRaw).trim()) ? parseInt(yearRaw, 10) : null;
      const yearOk = yNum !== null && yNum >= 1950 && yNum <= 2100;
      const row = vehicleRow(user, {
        vin, plate: cells[ci.plate], site: cell(cells, ci.site), master_status: cell(cells, ci.status),
        manufacturer: cell(cells, ci.man), model: cell(cells, ci.model), build_year: yearOk ? yNum : null,
        trailer_plate: cell(cells, ci.trailer), kind: cell(cells, ci.kind),
        source: ci.src >= 0 && cell(cells, ci.src) ? `CSV-Import: ${cell(cells, ci.src).slice(0, 180)}` : 'CSV-Import Fuhrpark Stammliste',
      });
      row._line = line;
      if (yearRaw && !yearOk) row._yearBad = String(yearRaw).slice(0, 40);
      // doppelte FIN: letzte Zeile gilt – die frühere wird als übersprungen gemeldet (vorher still verworfen, 17.10.2026)
      const prev = rows.get(row.id);
      if (prev) result.skipped.push({ line: prev._line, plate: prev.plate, reason: `FIN doppelt in der Datei (Zeile ${line} gilt)` });
      rows.set(row.id, row);
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
    // außer Betrieb genommene Fahrzeuge bleiben außer Betrieb (Wieder-in-Betrieb-Nahme nur in der Fahrzeugakte mit Protokoll; vorher stellte
    // eine alte Stammliste verkaufte Lkw still wieder in Betrieb – 17.10.2026)
    result.preview.push({ line: r._line, vin: r.vin, plate: r.plate, action: changes.length ? 'geändert' : 'unverändert', changes, ...(ex.active ? {} : { inactive_kept: true }) });
  }
  for (const pv of result.preview) { const r = rows.get('VIN:' + pv.vin); if (r && r._yearBad) pv.year_unrecognized = r._yearBad; }
  // Neue Zeile ohne Fahrzeugart wird als Lkw angelegt – in der Vorschau nennen, besonders wenn das Kennzeichen in einer anderen Zeile als Anhänger
  // steht (Teilagent „Fahrzeug-Neuzugang“, 23.10.2026: Anhänger wurde still Lkw, Kopplung blieb leer, Datenqualität „Anhänger unbekannt“)
  const trailerKeys = new Set([...rows.values()].map((r) => normPlate(r.trailer_plate)).filter(Boolean));
  for (const pv of result.preview) { const r = rows.get('VIN:' + pv.vin); if (pv.action === 'neu' && r && !r.kind) { pv.kind_defaulted = true; if (trailerKeys.has(normPlate(r.plate))) pv.kind_maybe_trailer = true; } }
  result.preview.sort((a, b) => a.line - b.line); result.skipped.sort((a, b) => a.line - b.line);
  result.inactive_kept = result.preview.filter((p) => p.inactive_kept).map((p) => p.plate);
  // Hinweis (keine Automatik): Stammstatus „verkauft/abgemeldet/stillgelegt/verschrottet/ausgemustert“, Fahrzeug wird aber aktiv angelegt bzw. bleibt aktiv –
  // außer Betrieb nehmen nur bewusst in der Fahrzeugakte (mit Datum/Grund im Protokoll). 19.10.2026
  const GONE = /verkauft|abgemeldet|stillgelegt|verschrottet|ausgemustert|außer betrieb|ausser betrieb/i;
  for (const pv of result.preview) { const r = rows.get('VIN:' + pv.vin); const ex = existing.get('VIN:' + pv.vin); if (r && GONE.test(String(r.master_status || '').normalize('NFC')) && (!ex || ex.active)) pv.status_says_inactive = r.master_status; }
  result.status_says_inactive = result.preview.filter((p) => p.status_says_inactive).map((p) => p.plate);
  // Hinweis (keine Sperre): Kennzeichen nach dem Import an mehreren Fahrzeugen (Schreibweise egal) – meist Tippfehler in der FIN
  // oder Doppelanlage (vgl. SZ-YC 5539). Maßgeblich ist das Kennzeichen nach dem Import: Datei vor Bestand.
  const effPlate = new Map((await env.DB.prepare('SELECT id, plate FROM vehicles').all()).results.map((v) => [v.id, v.plate]));
  for (const r of rows.values()) effPlate.set(r.id, r.plate);
  const byKey = new Map();
  for (const [id, pl] of effPlate) { const k = normPlate(pl); if (k) byKey.set(k, [...(byKey.get(k) || []), id]); }
  for (const pv of result.preview) {
    const others = (byKey.get(normPlate(pv.plate)) || []).filter((id) => id !== 'VIN:' + pv.vin);
    if (others.length) pv.plate_conflict = others.map((id) => id.replace(/^VIN:/, ''));
  }
  result.counts = { neu: result.preview.filter((p) => p.action === 'neu').length, geaendert: result.preview.filter((p) => p.action === 'geändert').length, unveraendert: result.preview.filter((p) => p.action === 'unverändert').length, plate_conflict: result.preview.filter((p) => p.plate_conflict).length, year_unrecognized: result.preview.filter((p) => p.year_unrecognized).length };
  if (dryRun) return result;
  for (const r of rows.values()) { delete r._line; delete r._yearBad; }
  await upsertVehicleRows(env, [...rows.values()], { keepExisting: true, actorId: user.id });
  result.imported = rows.size;
  await audit(env, user.id, 'vehicles.import', null, { imported: result.imported, skipped: result.skipped.length, ...result.counts });
  // Kennzeichenwechsel je Fahrzeug ins Protokoll wie bei „Stammdaten bearbeiten“ (`plate_old`) – sonst war das alte Kennzeichen nach dem Import
  // nirgends mehr erkennbar (spätes Bußgeld zum alten Kennzeichen nicht zurückführbar; 21.10.2026); eine Anweisung für alle
  // 22.10.2026: alle geänderten Stammfelder je Fahrzeug als alt → neu (Standort, Anhänger-Kennzeichen = Gespann-Kopplung, Stammstatus …) –
  // vorher nur der Kennzeichenwechsel, der Rest nur als Zähler
  const plateLog = result.preview.filter((pv) => pv.action === 'geändert' && (pv.changes || []).length).map((pv) => {
    const pc = pv.changes.find((c) => c.field === 'plate');
    const changed = Object.fromEntries(pv.changes.filter((c) => c.field !== 'plate').map((c) => [c.field, { from: c.from ?? null, to: c.to ?? null }]));
    return { id: 'VIN:' + pv.vin, detail: JSON.stringify({ plate: pv.plate, ...(pc ? { plate_old: pc.from } : {}), ...(Object.keys(changed).length ? { changed, source: 'CSV-Import' } : {}) }) };
  });
  const plChanged = result.preview.filter((pv) => pv.action === 'geändert').map((pv) => ({ id: 'VIN:' + pv.vin, plate_old: ((pv.changes || []).find((c) => c.field === 'plate') || {}).from })).filter((x) => x.plate_old);
  if (plChanged.length) await platesInsert(env, plChanged, user.id, 'csv-import');
  if (plateLog.length) await env.DB.prepare(`INSERT INTO audit_log(id,actor_id,action,target,detail,created_at)
    SELECT lower(hex(randomblob(16))), ?1, 'vehicle.upsert', json_extract(value,'$.id'), json_extract(value,'$.detail'), ?2 FROM json_each(?3)`).bind(user.id, nowIso(), JSON.stringify(plateLog)).run();
  // Backlog 273 (Teilagent „Lkw wechselt dauerhaft den Standort“): Standortwechsel per Import → Hinweise wie bei „Stammdaten bearbeiten“
  // (offene Werkstattaufträge, geplante Prüftermine, zugeordnete Fahrer mit Fahrerakte an einem anderen Standort) – eine Abfrage für alle
  const skx = (x) => (x && String(x).trim() ? String(x).trim().toLocaleLowerCase('de') : '');
  const moved = result.preview.filter((pv) => pv.action === 'geändert' && (pv.changes || []).some((c) => c.field === 'site' && skx(c.from) !== skx(c.to)))
    .map((pv) => ({ id: 'VIN:' + pv.vin, plate: pv.plate, to: (pv.changes.find((c) => c.field === 'site') || {}).to ?? null }));
  if (moved.length) {
    const hs = (await env.DB.prepare(`SELECT json_extract(j.value,'$.id') AS id,
        (SELECT COUNT(*) FROM cases c WHERE c.vehicle_id=json_extract(j.value,'$.id') AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt') AND COALESCE(c.workshop_site, c.suggested_workshop_site) IS NOT NULL) AS ws,
        (SELECT group_concat(s, ', ') FROM (SELECT DISTINCT COALESCE(c.workshop_site, c.suggested_workshop_site) AS s FROM cases c WHERE c.vehicle_id=json_extract(j.value,'$.id')
          AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt') AND COALESCE(c.workshop_site, c.suggested_workshop_site) IS NOT NULL ORDER BY s)) AS wsl,
        (SELECT COUNT(*) FROM maintenance_rules m WHERE m.vehicle_id=json_extract(j.value,'$.id') AND m.planned_date >= ?2) AS p,
        (SELECT json_group_array(json_object('name', name, 'site', site)) FROM (SELECT DISTINCT u.display_name AS name, dr.site AS site FROM driver_vehicles dv JOIN users u ON u.id=dv.user_id
          JOIN drivers dr ON dr.user_id=u.id WHERE dv.vehicle_id=json_extract(j.value,'$.id') AND (dv.valid_to IS NULL OR dv.valid_to > ?3) AND dr.site IS NOT NULL AND trim(dr.site)<>'')) AS drv
      FROM json_each(?1) j`).bind(JSON.stringify(moved), berlinDate(), nowIso()).all()).results;
    const byId = new Map(hs.map((h) => [h.id, h]));
    result.site_changes = moved.map((m) => { const h = byId.get(m.id) || {}; let drv = []; try { drv = JSON.parse(h.drv || '[]'); } catch { drv = []; }
      return { plate: m.plate, site: m.to, open_workshop_cases: h.ws || 0, open_workshop_sites: h.wsl ? String(h.wsl).split(', ') : [], planned_appointments: h.p || 0, drivers_other_site: drv.filter((x) => skx(x.site) !== skx(m.to)).map((x) => ({ name: x.name, site: x.site })) }; })
      .filter((x) => x.open_workshop_cases || x.planned_appointments || x.drivers_other_site.length);
  }
  return result;
}

// KI-gestützte Fehleranalyse (Cloudflare Workers AI). Ergebnis ist ein Vorschlag, keine Diagnose/Freigabe.
export async function aiAnalysis(env, user, envName, vehicleId) {
  if (!isManager(user) && user.role !== 'workshop') throw forbidden();
  if (!env.AI) return { available: false, code: 'ai_disabled', message: 'KI-Analyse ist in dieser Umgebung nicht aktiviert.' }; // code: Text in der Oberflächensprache (17.10.2026)
  const d = await vehicleDetail(env, user, envName, vehicleId);
  const history = d.cases.slice(0, 30).map((c) => `${berlinDate(c.created_at)} [${c.priority}/${c.status}] ${caseDescText(c.description, 'de').slice(0, 300)}`).join('\n');
  if (!history) return { available: true, suggestion: null, code: 'ai_no_cases', message: 'Keine Vorgänge zu diesem Fahrzeug.' };
  const prompt = `Du unterstützt eine Lkw-Werkstatt (Autotransporter). Analysiere die Schadenshistorie des Fahrzeugs ${d.vehicle.plate} (${d.vehicle.manufacturer || 'Hersteller unbekannt'}, Baujahr ${d.vehicle.build_year || 'unbekannt'}).
Nenne: 1) wiederkehrende Muster, 2) mögliche gemeinsame Ursachen, 3) konkrete Prüfempfehlungen für die nächste Inspektion.
Erfinde keine Daten, Fristen oder Kosten. Kennzeichne Unsicherheit. Antworte knapp ${({ uk: 'auf Ukrainisch', en: 'auf Englisch' })[user.language] || 'auf Deutsch'} in Stichpunkten.
Historie:\n${history}`;
  const res = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'user', content: prompt }], max_tokens: 600 });
  return { available: true, suggestion: res.response || null, disclaimer: 'KI-Vorschlag – keine technische Diagnose und keine Freigabe. Bitte fachlich prüfen.', disclaimer_code: 'ai_disclaimer' };
}

// Dokumentablage je Fahrzeug: PDF/JPG/PNG/WEBP bis 5 MB, max. 30 je Fahrzeug und Umgebung, Dubletten (SHA-256) werden erkannt
export const DOC_KINDS = ['zulassung', 'pruefbericht', 'rechnung', 'versicherung', 'leasing', 'rueckruf', 'foto', 'sonstiges'];
export const MAX_VEHICLE_DOCS = 30;
// „gültig bis“ plausibel: 1990 bis heute + 20 Jahre (20.10.2026: 2199-12-31 löste ein abgelaufenes Dokument ab und blendete den Ablauf dauerhaft aus)
function docValidRange(d) {
  if (!d) return;
  if (d < '1990-01-01') throw bad('validation', '„Gültig bis“ liegt vor 1990 – bitte Jahr prüfen.');
  const today = berlinDate();
  if (d > String(Number(today.slice(0, 4)) + 20) + today.slice(4)) throw bad('validation', '„Gültig bis“ liegt mehr als 20 Jahre in der Zukunft – bitte Jahr prüfen.');
}
export async function uploadVehicleDocument(env, user, envName, vehicleId, request, query = {}) {
  if (!['owner', 'fleet', 'workshop'].includes(user.role)) throw forbidden();
  const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const kind = oneOf(query.kind || 'sonstiges', DOC_KINDS, 'Dokumentart');
  const note = str(query.note || null, { max: 200, field: 'Bemerkung' });
  const validUntil = str(query.valid_until || null, { max: 10, field: 'Gültig bis' });
  if (validUntil && !isCalendarDate(validUntil)) throw bad('validation', 'Gültig bis im Format JJJJ-MM-TT.');
  docValidRange(validUntil);
  const buf = new Uint8Array(await request.arrayBuffer());
  if (!buf.length) throw bad('empty', 'Leere Datei.');
  if (buf.length > 5 * 1024 * 1024) throw bad('too_large', 'Datei zu groß (max. 5 MB).');
  const type = sniffType(buf);
  if (!type) throw bad('type', 'Nur PDF, JPG, PNG oder WEBP erlaubt.');
  const sha = await sha256Hex(buf);
  // gleiche Datei schon vorhanden: nichts ändern; `differs` = Art/Bemerkung/„gültig bis“ weichen ab (Oberfläche öffnet die Korrektur, 19.10.2026)
  const dupOut = (d) => ({ id: d.id, duplicate: true, differs: (d.doc_kind || 'sonstiges') !== kind || (d.doc_note || null) !== (note || null) || (d.doc_valid_until || null) !== (validUntil || null) });
  const dup = await env.DB.prepare('SELECT id, doc_kind, doc_note, doc_valid_until FROM files WHERE vehicle_id=? AND case_id IS NULL AND environment=? AND sha256=?').bind(vehicleId, envName, sha).first();
  if (dup) return dupOut(dup);
  const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM files WHERE vehicle_id=? AND case_id IS NULL AND environment=?').bind(vehicleId, envName).first();
  if (cnt.n >= MAX_VEHICLE_DOCS) throw bad('too_many', `Maximal ${MAX_VEHICLE_DOCS} Dokumente je Fahrzeug.`);
  const id = uuid();
  const key = `${envName}/vehicles/${vehicleId}/${id}`;
  await env.FILES.put(key, buf, { metadata: { type, vehicle_id: vehicleId, env: envName } });
  const name = (() => { try { return decodeURIComponent(request.headers.get('x-filename') || 'dokument'); } catch { return 'dokument'; } })().replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || 'dokument';
  // Höchstzahl und Dublette im Einfügen geprüft (17.10.2026: parallele Uploads ergaben Dubletten und mehr als 30 Dokumente)
  const ins = await env.DB.prepare(`INSERT INTO files(id,case_id,vehicle_id,doc_kind,doc_note,doc_valid_until,environment,r2_key,filename,content_type,size,sha256,uploaded_by,created_at)
    SELECT ?1,NULL,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13
    WHERE (SELECT COUNT(*) FROM files WHERE vehicle_id=?2 AND case_id IS NULL AND environment=?6) < ?14
      AND NOT EXISTS (SELECT 1 FROM files WHERE vehicle_id=?2 AND case_id IS NULL AND environment=?6 AND sha256=?11)`)
    .bind(id, vehicleId, kind, note, validUntil, envName, key, name, type, buf.length, sha, user.id, nowIso(), MAX_VEHICLE_DOCS).run()
    .catch(async (e) => { await env.FILES.delete(key); throw e; }); // keine verwaiste Datei bei D1-Fehler (wie Vorgangsdateien, 20.10.2026)
  if (!ins.meta || !ins.meta.changes) {
    await env.FILES.delete(key);
    const d2 = await env.DB.prepare('SELECT id, doc_kind, doc_note, doc_valid_until FROM files WHERE vehicle_id=? AND case_id IS NULL AND environment=? AND sha256=?').bind(vehicleId, envName, sha).first();
    if (d2) return dupOut(d2);
    throw bad('too_many', `Maximal ${MAX_VEHICLE_DOCS} Dokumente je Fahrzeug.`);
  }
  await audit(env, user.id, 'vehicle.document', vehicleId, { kind, filename: name, size: buf.length, valid_until: validUntil });
  return { id, duplicate: false };
}

// Angaben eines Fahrzeugdokuments korrigieren (Art, Bemerkung, „gültig bis“) – vorher nur durch Löschen/neu Hochladen möglich, und das
// erneute Hochladen derselben Datei wurde als Dublette erkannt (falsches „gültig bis“ blieb, Agent meldete Ablauf falsch – 17.10.2026).
// Nur auf gelesenem Stand (expected: bisherige Werte) → 409 doc_changed; Änderung im Protokoll (vorher/nachher).
export async function updateVehicleDocument(env, user, envName, vehicleId, fileId, body) {
  if (!['owner', 'fleet', 'workshop'].includes(user.role)) throw forbidden();
  const f = await env.DB.prepare('SELECT id, filename, doc_kind, doc_note, doc_valid_until FROM files WHERE id=? AND vehicle_id=? AND case_id IS NULL AND environment=?').bind(fileId, vehicleId, envName).first();
  if (!f) throw notFound();
  const kind = 'kind' in body ? oneOf(body.kind || 'sonstiges', DOC_KINDS, 'Dokumentart') : (f.doc_kind || 'sonstiges');
  const note = 'note' in body ? str(body.note || null, { max: 200, field: 'Bemerkung' }) : f.doc_note;
  const validUntil = 'valid_until' in body ? str(body.valid_until || null, { max: 10, field: 'Gültig bis' }) : f.doc_valid_until;
  if (validUntil && !isCalendarDate(validUntil)) throw bad('validation', 'Gültig bis im Format JJJJ-MM-TT.');
  if (validUntil !== f.doc_valid_until) docValidRange(validUntil);
  const before = { kind: f.doc_kind || 'sonstiges', note: f.doc_note ?? null, valid_until: f.doc_valid_until ?? null };
  const after = { kind, note: note ?? null, valid_until: validUntil ?? null };
  if (JSON.stringify(before) === JSON.stringify(after)) return { ok: true, unchanged: true };
  const exp = body.expected && typeof body.expected === 'object' ? body.expected : before;
  // erwartete Werte nur Text oder leer (Objekt/Liste → 400 statt 500, 17.10.2026)
  for (const k of ['kind', 'note', 'valid_until']) if (exp[k] !== undefined && exp[k] !== null && typeof exp[k] !== 'string') throw bad('validation', 'expected: ungültiger Wert.');
  // Dokument, Umschlüsseln des Befunds und Protokoll in EINEM Stapel (22.10.2026, Backlog 127a: vorher getrennt – nach Abbruch dazwischen
  // schloss der Agent den alten Befund und übergab/pushte ihn neu, eine Wiederholung war „unverändert“)
  const stmts = [env.DB.prepare(`UPDATE files SET doc_kind=?, doc_note=?, doc_valid_until=? WHERE id=? AND COALESCE(doc_kind,'sonstiges')=? AND doc_note IS ? AND doc_valid_until IS ?`)
    .bind(kind, after.note, after.valid_until, f.id, String(exp.kind || 'sonstiges'), exp.note ?? null, exp.valid_until ?? null),
  env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT CASE WHEN changes() = 1 THEN 1 ELSE 0 END'), env.DB.prepare('DELETE FROM cmd_guard')];
  // Bemerkung eines „sonstigen“ Dokuments korrigiert (Thema = Befundschlüssel): offenen/erledigten Befund mit umschlüsseln, statt ihn zu schließen
  // und als neuen Fall erneut zu übergeben und zu pushen (22.10.2026, Fund „Flattern“) – nur wenn kein anderes Dokument im alten Thema bleibt
  // und unter dem neuen Schlüssel noch kein Befund besteht; Schlüssel exakt wie documentFindings (lower(trim()))
  if (before.kind === 'sonstiges' && after.kind === 'sonstiges' && before.note !== after.note) {
    const key = (n) => `?1 || '|sonstiges' || CASE WHEN lower(trim(COALESCE(${n},''))) <> '' THEN '|' || lower(trim(COALESCE(${n},''))) ELSE '' END`;
    const hit = (await env.DB.prepare(`SELECT id, finding_code, subject_key, severity, requires_decision, ${key('?4')} AS nk FROM agent_findings WHERE environment=?2 AND finding_code IN ('DOCUMENT_EXPIRED','DOCUMENT_EXPIRES_SOON')
        AND subject_key = ${key('?3')} AND lower(trim(COALESCE(?3,''))) <> lower(trim(COALESCE(?4,'')))
        AND NOT EXISTS (SELECT 1 FROM agent_findings x WHERE x.environment=?2 AND x.finding_code=agent_findings.finding_code AND x.subject_key = ${key('?4')})
        AND NOT EXISTS (SELECT 1 FROM files o WHERE o.vehicle_id=?1 AND o.environment=?2 AND o.case_id IS NULL AND o.id<>?5 AND COALESCE(o.doc_kind,'sonstiges')='sonstiges'
          AND o.doc_valid_until IS NOT NULL AND lower(trim(COALESCE(o.doc_note,''))) = lower(trim(COALESCE(?3,''))))`)
      .bind(vehicleId, envName, before.note, after.note, f.id).all()).results;
    // Fingerabdruck wie der Agent (`code|subject|severity|requires_decision`) – sonst gälte der umgeschlüsselte Befund als geändert (neue Übergabe)
    for (const h of hit) stmts.push(env.DB.prepare('UPDATE agent_findings SET subject_key=?, fingerprint=?, fp_src=NULL WHERE id=? AND subject_key=?')
      .bind(h.nk, sha256HexSync(`${h.finding_code}|${h.nk}|${h.severity}|${h.requires_decision}`), h.id, h.subject_key));
  }
  const diff = {}; for (const [k, dk] of [['kind', 'doc_kind'], ['valid_until', 'valid_until'], ['note', 'note']]) if (before[k] !== after[k]) diff[dk] = { from: before[k], to: after[k] };
  stmts.push(auditStmt(env, user.id, 'vehicle.document_update', vehicleId, { filename: f.filename, ...diff }));
  try { await env.DB.batch(stmts); } catch (e) {
    if (String(e && e.message).includes('CHECK')) throw conflict('doc_changed', 'Die Dokumentangaben wurden zwischenzeitlich geändert. Bitte neu laden.');
    throw e;
  }
  return { ok: true };
}

// Für den Fuhrparkagenten: je Fahrzeug und Dokumentart zählt das späteste Gültig-bis-Datum (neueres Dokument ersetzt älteres).
// „Sonstiges“ fasst verschiedenartige Dokumente zusammen (z. B. ADR-Bescheinigung und Gemeinschaftslizenz): dort gilt die Bemerkung
// als Thema – je Thema das späteste Datum (vorher verdeckte ein gültiges Dokument ein abgelaufenes anderes, 18.10.2026).
// `topic` = Bemerkung (für den Befundtext), `topic_key` = Gruppierungsschlüssel (getrimmt, ASCII-klein); ohne Bemerkung wie bisher eine Gruppe.
export async function documentFindings(env, environment) {
  return (await env.DB.prepare(`SELECT f.vehicle_id, f.doc_kind, MAX(f.doc_valid_until) AS valid_until, v.plate,
      CASE WHEN f.doc_kind='sonstiges' THEN lower(trim(COALESCE(f.doc_note,''))) ELSE '' END AS topic_key,
      CASE WHEN f.doc_kind='sonstiges' THEN MAX(NULLIF(trim(COALESCE(f.doc_note,'')),'')) END AS topic
    FROM files f JOIN vehicles v ON v.id=f.vehicle_id
    WHERE f.environment=? AND f.case_id IS NULL AND f.doc_valid_until IS NOT NULL AND v.active=1 GROUP BY f.vehicle_id, f.doc_kind, topic_key`).bind(environment).all()).results;
}
