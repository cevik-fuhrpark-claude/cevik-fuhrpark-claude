// [CLAUDE] Schadens- und Werkstattvorgänge: Statusmaschine als Befehle (keine freien Status-Updates)
import { nowIso, uuid, sha256Hex, bad, forbidden, notFound, conflict, str, oneOf, num, berlinDate } from './util.js';
import { notifyCaseEvent } from './notify.js';
import { prepareCaseWithdrawal } from './stock.js';
import { canReadFineFile } from './fines.js';

export const PRIORITIES = ['niedrig', 'mittel', 'kritisch'];
export const DRIVEABILITY = ['unbekannt', 'fahrbereit', 'eingeschraenkt', 'nicht_fahrbereit'];
export const STATUSES = ['gemeldet', 'werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle', 'fahrzeug_freigegeben', 'abgelehnt'];
const OPEN_STATUSES = ['gemeldet', 'werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'];
const WORK_STATUSES = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'];
const MAX_FILES = 10;
export const VEHICLE_DOC_READ = ['owner', 'fleet', 'workshop', 'viewer', 'dispatch'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const isManager = (u) => u.role === 'owner' || u.role === 'fleet';
const canSeeCosts = (u) => isManager(u);

// ---------- Lesen & Zugriff ----------

export async function loadCase(env, user, envName, caseId) {
  const c = await env.DB.prepare('SELECT * FROM cases WHERE id=? AND environment=?').bind(caseId, envName).first();
  if (!c) throw notFound('Vorgang nicht gefunden.');
  const access = caseAccess(user, c);
  if (!access) throw notFound('Vorgang nicht gefunden.'); // keine Existenz-Offenlegung
  return { c, access };
}

// Liefert 'full' | 'read' | 'preview' | null
export function caseAccess(user, c) {
  switch (user.role) {
    case 'owner':
    case 'fleet':
      return 'full';
    case 'dispatch':
    case 'viewer':
      return 'read';
    case 'workshop':
      if (c.workshop_site === user.workshop_site && c.status !== 'gemeldet' && c.status !== 'abgelehnt') return 'full';
      if (c.status === 'gemeldet' && (c.suggested_workshop_site === user.workshop_site || c.workshop_site === user.workshop_site)) return 'preview';
      if (c.reporter_id === user.id) return 'read';
      return null;
    case 'driver':
      return c.reporter_id === user.id ? 'read' : null;
    default:
      return null;
  }
}

export async function listCases(env, user, envName, query) {
  const where = ['c.environment = ?'];
  const args = [envName];
  if (user.role === 'driver') { where.push('c.reporter_id = ?'); args.push(user.id); }
  if (user.role === 'workshop') {
    where.push(`((c.workshop_site = ? AND c.status NOT IN ('gemeldet','abgelehnt')) OR (c.status='gemeldet' AND (c.suggested_workshop_site = ? OR c.workshop_site = ?)) OR c.reporter_id = ?)`);
    args.push(user.workshop_site, user.workshop_site, user.workshop_site, user.id);
  }
  if (query.status === 'open') where.push(`c.status IN (${OPEN_STATUSES.map(() => '?').join(',')})`), args.push(...OPEN_STATUSES);
  else if (query.status === 'closed') where.push(`c.status IN ('fahrzeug_freigegeben','abgelehnt')`);
  else if (query.status && STATUSES.includes(query.status)) { where.push('c.status = ?'); args.push(query.status); }
  if (query.vehicle_id) { where.push('c.vehicle_id = ?'); args.push(query.vehicle_id); }
  // Suche: Beschreibung, Vorgangsnummer, Kennzeichen (ohne Leerzeichen/Bindestriche), Platzhalter werden nicht ausgewertet
  const q = String(query.q || '').trim().slice(0, 60);
  if (q.length >= 2) {
    const like = '%' + q.replace(/[\\%_]/g, (ch) => '\\' + ch) + '%';
    const plateKey = q.toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');
    const plateLike = plateKey.length >= 2 ? '%' + plateKey + '%' : '\u0000';
    where.push(`(c.description LIKE ? ESCAPE '\\' OR c.case_no LIKE ? ESCAPE '\\' OR REPLACE(REPLACE(UPPER(v.plate),' ',''),'-','') LIKE ?)`);
    args.push(like, like, plateLike);
  }
  const limit = Math.min(Number(query.limit) || 200, query.__export ? 5000 : 500);
  const rows = (await env.DB.prepare(`
    SELECT c.*, v.plate, v.site AS vehicle_site, u.display_name AS reporter_name,
      (SELECT COUNT(*) FROM open_items oi WHERE oi.case_id=c.id AND oi.status='offen') AS open_items,
      (SELECT COUNT(*) FROM files f WHERE f.case_id=c.id) AS file_count
    FROM cases c JOIN vehicles v ON v.id=c.vehicle_id JOIN users u ON u.id=c.reporter_id
    WHERE ${where.join(' AND ')}
    ORDER BY CASE c.priority WHEN 'kritisch' THEN 0 WHEN 'mittel' THEN 1 ELSE 2 END,
      CASE WHEN c.status IN ('fahrzeug_freigegeben','abgelehnt') THEN 1 ELSE 0 END, c.updated_at DESC
    LIMIT ?`).bind(...args, limit).all()).results;
  return rows.map((r) => ({ ...shapeCase(r, user), access: caseAccess(user, r) }));
}

// CSV-Export der Vorgangsliste (gleiche Filter und Rechte wie die Liste), Excel-tauglich (UTF-8 mit BOM, Semikolon)
const PRIO_DE = { niedrig: 'niedrig', mittel: 'mittel', kritisch: 'kritisch' };
export function casesCsv(rows, csvCell, fmt) {
  const head = ['Vorgang', 'Kennzeichen', 'Standort', 'Priorität', 'Status', 'Sicherheitssperre', 'Fahrbereit laut Meldung', 'Werkstatt', 'Beschreibung', 'Gemeldet am', 'Gemeldet von',
    'Eingang bestätigt', 'Werkstatt übernommen', 'Abgeschlossen', 'Offene Restarbeiten', 'Fotos/Dateien'];
  const lines = [head.join(';')];
  for (const c of rows) lines.push([csvCell(c.case_no), csvCell(c.plate), csvCell(c.vehicle_site), PRIO_DE[c.priority] || c.priority, csvCell(c.status), c.safety_lock ? 'ja' : 'nein',
    csvCell(c.reported_driveability), csvCell(c.workshop_site), csvCell(c.description), fmt(c.created_at), csvCell(c.reporter_name), fmt(c.fleet_received_at), fmt(c.workshop_ack_at), fmt(c.closed_at),
    c.open_items ?? '', c.file_count ?? ''].join(';'));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

function shapeCase(c, user) {
  const out = { ...c };
  delete out.request_key;
  delete out.content_hash;
  if (user.role === 'driver') {
    // Fahrer sehen ihren Status, aber keine internen Zuständigkeiten
    delete out.fleet_received_by;
    delete out.workshop_ack_by;
  }
  return out;
}

export async function getCaseDetail(env, user, envName, caseId) {
  const { c, access } = await loadCase(env, user, envName, caseId);
  const vehicle = await env.DB.prepare('SELECT * FROM vehicles WHERE id=?').bind(c.vehicle_id).first();
  const reporter = await env.DB.prepare('SELECT display_name FROM users WHERE id=?').bind(c.reporter_id).first();
  const events = (await env.DB.prepare(`SELECT e.id, e.action, e.from_status, e.to_status, e.note, e.payload, e.created_at, e.actor_role, u.display_name AS actor_name
    FROM case_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.case_id=? ORDER BY e.created_at`).bind(c.id).all()).results
    .map((e) => ({ ...e, payload: e.payload ? JSON.parse(e.payload) : null }));
  const files = (await env.DB.prepare('SELECT id, filename, content_type, size, created_at, uploaded_by FROM files WHERE case_id=? ORDER BY created_at').bind(c.id).all()).results;
  const openItems = (await env.DB.prepare(`SELECT o.*, u.display_name AS created_by_name FROM open_items o JOIN users u ON u.id=o.created_by WHERE case_id=? ORDER BY created_at`).bind(c.id).all()).results;
  const inspections = (await env.DB.prepare(`SELECT i.id, i.kind, i.result, i.created_at, i.odometer_km, i.items, i.note, u.display_name AS performed_by_name FROM inspections i JOIN users u ON u.id=i.performed_by WHERE i.case_id=? ORDER BY i.created_at`).bind(c.id).all()).results
    .map((i) => ({ ...i, items: JSON.parse(i.items) }));
  const followups = (await env.DB.prepare('SELECT id, case_no, status, priority, description FROM cases WHERE parent_case_id=?').bind(c.id).all()).results;
  const parent = c.parent_case_id ? await env.DB.prepare('SELECT id, case_no FROM cases WHERE id=?').bind(c.parent_case_id).first() : null;
  const detail = {
    case: shapeCase(c, user), access, vehicle, reporter_name: reporter?.display_name || null,
    events: user.role === 'driver' ? events.map(({ actor_name, ...e }) => e) : events,
    files, open_items: openItems, inspections, followups, parent,
    allowed_actions: allowedActions(user, c, access),
  };
  if (user.role !== 'driver' && user.role !== 'viewer' && user.role !== 'dispatch') {
    detail.work = (await env.DB.prepare(`SELECT w.*, u.display_name AS user_name FROM work_entries w JOIN users u ON u.id=w.user_id WHERE case_id=? ORDER BY work_date, created_at`).bind(c.id).all()).results;
    detail.parts = (await env.DB.prepare('SELECT * FROM parts WHERE case_id=? ORDER BY created_at').bind(c.id).all()).results;
  }
  if (canSeeCosts(user)) {
    detail.external_costs = (await env.DB.prepare('SELECT * FROM external_costs WHERE case_id=? ORDER BY created_at').bind(c.id).all()).results;
    detail.costs = await caseCosts(env, c.id);
  }
  return detail;
}

// Kostenbewertung: fehlende Sätze/Preise = unbewertet, niemals 0 €
async function hourlyRate(env) {
  const rateRow = await env.DB.prepare(`SELECT value FROM settings WHERE key='workshop_hourly_rate_net'`).first();
  return rateRow && rateRow.value !== '' ? Number(rateRow.value) : null;
}

// Reine Bewertungslogik (gemeinsam für Vorgang und Fahrzeug): unbewertet ≠ 0 €, Schätzungen getrennt,
// Fremdleistung „ersetzt eigene Stunden/Teile“ verhindert Doppelzählung
export function computeCosts(rate, work, parts, ext) {
  const hours = work.reduce((s, w) => s + w.hours, 0);
  const coveredByExternal = ext.some((e) => e.covers_work_and_parts);
  let valued = 0; let estimate = 0; const unvalued = [];
  if (!coveredByExternal) {
    if (hours > 0) {
      if (rate === null || !Number.isFinite(rate)) unvalued.push({ type: 'arbeitszeit', hours });
      else valued += hours * rate;
    }
    for (const p of parts) {
      if (p.unit_price_net === null || p.valuation === 'unvalued') unvalued.push({ type: 'teil', quantity: p.quantity });
      else if (p.valuation === 'estimate') estimate += p.quantity * p.unit_price_net;
      else valued += p.quantity * p.unit_price_net;
    }
  }
  for (const e of ext) {
    if (e.amount_net === null || e.valuation === 'unvalued') unvalued.push({ type: 'fremdleistung' });
    else if (e.valuation === 'estimate') estimate += e.amount_net;
    else valued += e.amount_net;
  }
  return {
    hours, hourly_rate_net: rate, actual_net: round2(valued), estimate_net: round2(estimate),
    unvalued_items: unvalued.length, unvalued, complete: unvalued.length === 0,
    external_replaces_own: coveredByExternal,
  };
}

export async function caseCosts(env, caseId) {
  const rate = await hourlyRate(env);
  const work = (await env.DB.prepare('SELECT hours FROM work_entries WHERE case_id=?').bind(caseId).all()).results;
  const parts = (await env.DB.prepare('SELECT quantity, unit_price_net, valuation FROM parts WHERE case_id=?').bind(caseId).all()).results;
  const ext = (await env.DB.prepare('SELECT amount_net, valuation, covers_work_and_parts FROM external_costs WHERE case_id=?').bind(caseId).all()).results;
  return computeCosts(rate, work, parts, ext);
}

// Summe über alle Vorgänge eines Fahrzeugs mit 4 Abfragen (statt 4 je Vorgang)
export async function vehicleCosts(env, envName, vehicleId) {
  const rate = await hourlyRate(env);
  const by = async (sql) => {
    const m = new Map();
    for (const r of (await env.DB.prepare(sql).bind(envName, vehicleId).all()).results) { if (!m.has(r.case_id)) m.set(r.case_id, []); m.get(r.case_id).push(r); }
    return m;
  };
  const J = 'JOIN cases c ON c.id=x.case_id WHERE c.environment=? AND c.vehicle_id=?';
  const work = await by(`SELECT x.case_id, x.hours FROM work_entries x ${J}`);
  const parts = await by(`SELECT x.case_id, x.quantity, x.unit_price_net, x.valuation FROM parts x ${J}`);
  const ext = await by(`SELECT x.case_id, x.amount_net, x.valuation, x.covers_work_and_parts FROM external_costs x ${J}`);
  let actual = 0; let estimate = 0; let unvalued = 0;
  for (const id of new Set([...work.keys(), ...parts.keys(), ...ext.keys()])) {
    const k = computeCosts(rate, work.get(id) || [], parts.get(id) || [], ext.get(id) || []);
    actual += k.actual_net; estimate += k.estimate_net; unvalued += k.unvalued_items;
  }
  return { actual_net: round2(actual), estimate_net: round2(estimate), unvalued_items: unvalued, complete: unvalued === 0 };
}
const round2 = (n) => Math.round(n * 100) / 100;

export function allowedActions(user, c, access) {
  const a = [];
  if (!access || access === 'read' || access === 'preview') {
    if (access && ['owner', 'fleet', 'workshop', 'dispatch', 'driver'].includes(user.role)) a.push('comment');
    return a;
  }
  const mgr = isManager(user);
  const ws = user.role === 'workshop' && c.workshop_site === user.workshop_site;
  a.push('comment', 'upload');
  if (mgr) {
    a.push('set_safety_lock');
    if (c.safety_lock) a.push('lift_safety_lock');
    if (OPEN_STATUSES.includes(c.status)) a.push('change_priority');
  }
  switch (c.status) {
    case 'gemeldet':
      if (mgr) { if (!c.fleet_received_at) a.push('receive'); a.push('approve_repair', 'reject'); }
      break;
    case 'werkstatt_freigegeben':
      if (ws || mgr) { if (!c.workshop_ack_at) a.push('acknowledge'); a.push('start_repair'); }
      if (mgr) a.push('reassign_workshop');
      break;
    case 'in_reparatur':
      if (ws || mgr) a.push('wait_parts', 'inspection', 'request_quality_check');
      break;
    case 'wartet_teile':
      if (ws || mgr) a.push('resume_repair');
      break;
    case 'abschlusskontrolle':
      if (mgr) a.push('return_for_rework', 'technical_release');
      break;
  }
  if (WORK_STATUSES.includes(c.status) && (ws || mgr)) a.push('record_work', 'add_part', 'add_open_item', 'resolve_open_item');
  if (WORK_STATUSES.includes(c.status) && mgr) a.push('add_external_cost');
  return a;
}

// ---------- Anlegen ----------

export async function createCase(env, ctx, user, envName, body) {
  if (!['owner', 'fleet', 'workshop', 'dispatch', 'driver'].includes(user.role)) throw forbidden();
  const vehicleId = str(body.vehicle_id, { required: true, max: 40, field: 'Fahrzeug' });
  const vehicle = await env.DB.prepare('SELECT * FROM vehicles WHERE id=? AND active=1').bind(vehicleId).first();
  if (!vehicle) throw bad('validation', 'Fahrzeug unbekannt.');
  const description = str(body.description, { required: true, max: 4000, field: 'Fehlerbeschreibung' });
  if (description.length < 5) throw bad('validation', 'Fehlerbeschreibung ist zu kurz.');
  const reportedPriority = oneOf(body.priority || 'niedrig', PRIORITIES, 'Dringlichkeit');
  const driveability = oneOf(body.driveability || 'unbekannt', DRIVEABILITY, 'Fahrbereitschaft');
  const suggested = body.workshop_site ? str(body.workshop_site, { max: 20 }) : null;
  if (suggested) {
    const ws = await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(suggested).first();
    if (!ws) throw bad('validation', 'Unbekannte Werkstatt.');
  }
  const requestKey = str(body.request_key, { required: true, max: 64, field: 'request_key' });
  const location = str(body.location_note, { max: 300 });
  const origin = body.origin && ['meldung', 'kontrolle'].includes(body.origin) ? body.origin : 'meldung';
  const parentId = body.parent_case_id ? str(body.parent_case_id, { max: 40 }) : null;
  const contentHash = await sha256Hex(JSON.stringify([vehicleId, description, reportedPriority, driveability, suggested, location, parentId]));

  const existing = await env.DB.prepare('SELECT id, case_no, content_hash FROM cases WHERE environment=? AND reporter_id=? AND request_key=?')
    .bind(envName, user.id, requestKey).first();
  if (existing) {
    if (existing.content_hash !== contentHash) throw conflict('request_key_conflict', 'Diese Meldung wurde bereits mit anderem Inhalt gesendet.');
    return { id: existing.id, case_no: existing.case_no, duplicate: true };
  }

  // Sicherheitsrelevant: kritisch oder nicht fahrbereit -> Sperre bis menschliche Fachbewertung
  const safetyLock = reportedPriority === 'kritisch' || driveability === 'nicht_fahrbereit' ? 1 : 0;
  const year = new Date().getUTCFullYear();
  const counter = await env.DB.prepare(`INSERT INTO case_counters(environment, year, last_no) VALUES (?, ?, 1)
    ON CONFLICT(environment, year) DO UPDATE SET last_no = last_no + 1 RETURNING last_no`).bind(envName, year).first();
  const caseNo = `${envName === 'test' ? 'T' : 'S'}-${year}-${String(counter.last_no).padStart(4, '0')}`;
  const id = uuid();
  const now = nowIso();
  const lockReason = safetyLock ? (driveability === 'nicht_fahrbereit' ? 'Fahrer meldet: nicht fahrbereit (ungeprüft)' : 'Fahrer meldet: sicherheitskritisch (ungeprüft)') : null;
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO cases(id,case_no,environment,vehicle_id,reporter_id,reporter_name_note,description,location_note,reported_priority,priority,
        reported_driveability,safety_lock,safety_lock_reason,status,suggested_workshop_site,origin,parent_case_id,request_key,content_hash,version,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'gemeldet',?,?,?,?,?,1,?,?)`).bind(
        id, caseNo, envName, vehicleId, user.id, str(body.reporter_name_note, { max: 120 }), description, location, reportedPriority, reportedPriority,
        driveability, safetyLock, lockReason, suggested, origin, parentId, requestKey, contentHash, now, now),
      env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
        VALUES (?,?,?,?,?,'create',NULL,'gemeldet',NULL,1,NULL,?,?)`).bind(uuid(), id, envName, user.id, user.role,
        JSON.stringify({ priority: reportedPriority, driveability, safety_lock: !!safetyLock, origin, parent_case_id: parentId }), now),
    ]);
  } catch (e) {
    // Paralleler Doppelklick: eindeutiger request_key greift
    const again = await env.DB.prepare('SELECT id, case_no, content_hash FROM cases WHERE environment=? AND reporter_id=? AND request_key=?')
      .bind(envName, user.id, requestKey).first();
    if (again && again.content_hash === contentHash) return { id: again.id, case_no: again.case_no, duplicate: true };
    throw e;
  }
  const c = await env.DB.prepare('SELECT * FROM cases WHERE id=?').bind(id).first();
  await notifyCaseEvent(env, ctx, c, 'created', { actor: user, vehicle });
  return { id, case_no: caseNo, duplicate: false, safety_lock: !!safetyLock };
}

// ---------- Befehle ----------

export async function runCommand(env, ctx, user, envName, caseId, body) {
  const action = str(body.action, { required: true, max: 40, field: 'Aktion' });
  const commandId = str(body.command_id, { required: true, max: 64, field: 'command_id' });
  const expectedVersion = num(body.expected_version, { min: 1, field: 'Version' });
  const note = str(body.note, { max: 4000 });
  const p = body.payload || {};

  const { c, access } = await loadCase(env, user, envName, caseId);

  // Idempotenz: gleicher Befehl bereits ausgeführt -> aktuellen Stand liefern
  const done = await env.DB.prepare('SELECT id FROM case_events WHERE case_id=? AND command_id=?').bind(c.id, commandId).first();
  if (done) return { ok: true, duplicate: true, version: c.version };

  const allowed = allowedActions(user, c, access);
  if (!allowed.includes(action)) throw forbidden(`Aktion „${action}“ ist für Ihre Rolle bzw. im Status „${c.status}“ nicht erlaubt.`);
  if (c.version !== expectedVersion) throw conflict('version_conflict', 'Der Vorgang wurde zwischenzeitlich geändert. Bitte neu laden.', { current_version: c.version });

  const now = nowIso();
  const set = {};
  let toStatus = c.status;
  let payload = {};
  const extra = []; // zusätzliche Statements in derselben Transaktion
  let notifyKind = null;

  const requireNote = (msg) => { if (!note || note.length < 3) throw bad('note_required', msg); };

  switch (action) {
    case 'comment':
      requireNote('Kommentar ist leer.');
      if (Array.isArray(p.notify)) { const n = [...new Set(p.notify.filter((x) => ['reporter', 'fleet', 'workshop'].includes(x)))]; if (n.length) payload.notify = n; }
      notifyKind = 'comment';
      break;
    case 'receive':
      set.fleet_received_at = now; set.fleet_received_by = user.id;
      notifyKind = 'received';
      break;
    case 'change_priority': {
      const np = oneOf(p.priority, PRIORITIES, 'Priorität');
      if (np === c.priority) throw bad('validation', 'Priorität ist unverändert.');
      requireNote('Bitte Begründung für die Prioritätsänderung angeben.');
      set.priority = np; set.priority_reviewed = 1;
      if (!c.fleet_received_at) { set.fleet_received_at = now; set.fleet_received_by = user.id; }
      payload = { from: c.priority, to: np, safety_lock_unchanged: !!c.safety_lock };
      notifyKind = 'priority_changed';
      break;
    }
    case 'set_safety_lock':
      requireNote('Bitte Grund für die Sperre angeben.');
      if (c.safety_lock) throw bad('validation', 'Fahrzeug ist bereits gesperrt.');
      set.safety_lock = 1; set.safety_lock_reason = note;
      notifyKind = 'safety_lock';
      break;
    case 'lift_safety_lock': {
      requireNote('Bitte fachliche Begründung für die Aufhebung angeben.');
      if (!p.confirm) throw bad('confirm_required', 'Aufhebung muss ausdrücklich bestätigt werden.');
      const safetyOpen = await env.DB.prepare(`SELECT COUNT(*) AS n FROM open_items WHERE case_id=? AND status='offen' AND safety_relevant=1`).bind(c.id).first();
      if (safetyOpen.n > 0) throw bad('safety_items_open', 'Es gibt offene sicherheitsrelevante Restarbeiten.');
      set.safety_lock = 0; set.safety_lock_reason = null;
      notifyKind = 'safety_lock_lifted';
      break;
    }
    case 'approve_repair': {
      const site = str(p.workshop_site, { required: true, max: 20, field: 'Werkstatt' });
      const ws = await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(site).first();
      if (!ws) throw bad('validation', 'Unbekannte Werkstatt.');
      requireNote('Bitte Reparaturumfang/Freigabevermerk angeben.');
      set.workshop_site = site; set.approval_scope = note; set.priority_reviewed = 1;
      if (p.priority) { const np = oneOf(p.priority, PRIORITIES, 'Priorität'); if (np !== c.priority) { set.priority = np; payload.priority_from = c.priority; payload.priority_to = np; } }
      if (!c.fleet_received_at) { set.fleet_received_at = now; set.fleet_received_by = user.id; }
      if (p.planned_date) set.planned_date = str(p.planned_date, { max: 10 });
      toStatus = 'werkstatt_freigegeben';
      payload.workshop_site = site;
      notifyKind = 'approved';
      break;
    }
    case 'reassign_workshop': {
      const site = str(p.workshop_site, { required: true, max: 20, field: 'Werkstatt' });
      const ws = await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(site).first();
      if (!ws) throw bad('validation', 'Unbekannte Werkstatt.');
      requireNote('Bitte Grund für den Werkstattwechsel angeben.');
      set.workshop_site = site; set.workshop_ack_at = null; set.workshop_ack_by = null;
      payload = { from: c.workshop_site, to: site };
      notifyKind = 'approved';
      break;
    }
    case 'reject':
      requireNote('Bitte Ablehnungsgrund angeben.');
      if (c.safety_lock) throw bad('safety_lock_active', 'Vorgang mit aktiver Sicherheitssperre kann nicht abgelehnt werden. Zuerst Sperre fachlich aufheben.');
      if (!c.fleet_received_at) { set.fleet_received_at = now; set.fleet_received_by = user.id; }
      toStatus = 'abgelehnt'; set.closed_at = now;
      notifyKind = 'rejected';
      break;
    case 'acknowledge':
      set.workshop_ack_at = now; set.workshop_ack_by = user.id;
      if (p.planned_date) set.planned_date = str(p.planned_date, { max: 10 });
      notifyKind = 'acknowledged';
      break;
    case 'start_repair':
      if (!c.workshop_ack_at) { set.workshop_ack_at = now; set.workshop_ack_by = user.id; }
      toStatus = 'in_reparatur';
      notifyKind = 'started';
      break;
    case 'wait_parts':
      requireNote('Bitte angeben, auf welche Teile gewartet wird.');
      toStatus = 'wartet_teile';
      notifyKind = 'waiting_parts';
      break;
    case 'resume_repair':
      toStatus = 'in_reparatur';
      notifyKind = 'resumed';
      break;
    case 'record_work': {
      const hours = num(p.hours, { min: 0.05, max: 24, field: 'Stunden' });
      const desc = str(p.description, { required: true, max: 2000, field: 'Tätigkeit' });
      const date = str(p.work_date, { max: 10 }) || berlinDate();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw bad('validation', 'Datum ungültig.');
      const wid = uuid();
      extra.push(env.DB.prepare('INSERT INTO work_entries(id,case_id,user_id,work_date,hours,description,created_at) VALUES (?,?,?,?,?,?,?)')
        .bind(wid, c.id, user.id, date, hours, desc, now));
      payload = { work_entry_id: wid, hours, work_date: date, description: desc };
      break;
    }
    case 'add_part': {
      const qty = num(p.quantity ?? 1, { min: 0.01, max: 100000, field: 'Menge' });
      const pid = uuid();
      let stockItem = null;
      if (p.stock_item_id) {
        const w = await prepareCaseWithdrawal(env, user, envName, c, str(p.stock_item_id, { max: 40 }), qty, pid);
        stockItem = w.item;
        extra.push(w.stmt);
      }
      const name = stockItem ? stockItem.name : str(p.name, { required: true, max: 200, field: 'Teil' });
      const rawPrice = p.unit_price_net === undefined || p.unit_price_net === '' || p.unit_price_net === null ? (stockItem ? stockItem.unit_price_net : null) : p.unit_price_net;
      const price = num(rawPrice, { min: 0, max: 1000000, field: 'Preis', nullable: true });
      const valuation = price === null ? 'unvalued' : oneOf(p.valuation || 'actual', ['actual', 'estimate'], 'Wertart');
      extra.push(env.DB.prepare(`INSERT INTO parts(id,case_id,user_id,name,part_number,quantity,unit,unit_price_net,valuation,supplier,document_ref,stock_item_id,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(pid, c.id, user.id, name, stockItem ? stockItem.part_number : str(p.part_number, { max: 80 }), qty,
        stockItem ? stockItem.unit : (str(p.unit, { max: 20 }) || 'Stk'), price, valuation, stockItem ? `Lager ${stockItem.site}` : str(p.supplier, { max: 120 }),
        str(p.document_ref, { max: 200 }), stockItem ? stockItem.id : null, now));
      payload = { part_id: pid, name, quantity: qty, unit_price_net: price, valuation, stock_item_id: stockItem ? stockItem.id : null };
      break;
    }
    case 'add_open_item': {
      const desc = str(p.description, { required: true, max: 2000, field: 'Restarbeit' });
      const oid = uuid();
      extra.push(env.DB.prepare(`INSERT INTO open_items(id,case_id,description,safety_relevant,status,created_by,created_at) VALUES (?,?,?,?,'offen',?,?)`)
        .bind(oid, c.id, desc, p.safety_relevant ? 1 : 0, user.id, now));
      payload = { open_item_id: oid, description: desc, safety_relevant: !!p.safety_relevant };
      notifyKind = p.safety_relevant ? 'open_item_safety' : null;
      break;
    }
    case 'resolve_open_item': {
      const oid = str(p.open_item_id, { required: true, max: 40, field: 'Restarbeit' });
      const oi = await env.DB.prepare(`SELECT * FROM open_items WHERE id=? AND case_id=? AND status='offen'`).bind(oid, c.id).first();
      if (!oi) throw bad('validation', 'Restarbeit nicht gefunden oder bereits erledigt.');
      requireNote('Bitte Erledigungsvermerk angeben.');
      extra.push(env.DB.prepare(`UPDATE open_items SET status='erledigt', resolved_by=?, resolved_at=?, resolution_note=? WHERE id=?`).bind(user.id, now, note, oid));
      payload = { open_item_id: oid };
      break;
    }
    case 'add_external_cost': {
      const supplier = str(p.supplier, { required: true, max: 120, field: 'Lieferant' });
      const amount = num(p.amount_net, { min: 0, max: 10000000, field: 'Betrag', nullable: true });
      const valuation = amount === null ? 'unvalued' : oneOf(p.valuation || 'actual', ['actual', 'estimate'], 'Wertart');
      const eid = uuid();
      extra.push(env.DB.prepare(`INSERT INTO external_costs(id,case_id,user_id,supplier,invoice_no,amount_net,valuation,covers_work_and_parts,note,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(eid, c.id, user.id, supplier, str(p.invoice_no, { max: 60 }), amount, valuation, p.covers_work_and_parts ? 1 : 0, note, now));
      payload = { external_cost_id: eid, supplier, amount_net: amount, valuation };
      break;
    }
    case 'request_quality_check': {
      const w = await env.DB.prepare('SELECT COUNT(*) AS n FROM work_entries WHERE case_id=?').bind(c.id).first();
      const x = await env.DB.prepare('SELECT COUNT(*) AS n FROM external_costs WHERE case_id=?').bind(c.id).first();
      if (w.n + x.n === 0) throw bad('work_missing', 'Bitte zuerst durchgeführte Arbeiten (Stunden) oder eine Fremdleistung dokumentieren.');
      const insp = await env.DB.prepare(`SELECT result FROM inspections WHERE case_id=? AND kind='nach_reparatur' ORDER BY created_at DESC LIMIT 1`).bind(c.id).first();
      if (!insp) throw bad('inspection_missing', 'Bitte zuerst die Fahrzeugkontrolle nach der Reparatur durchführen.');
      const so = await env.DB.prepare(`SELECT COUNT(*) AS n FROM open_items WHERE case_id=? AND status='offen' AND safety_relevant=1`).bind(c.id).first();
      if (so.n > 0) throw bad('safety_items_open', 'Offene sicherheitsrelevante Restarbeiten verhindern die Abschlusskontrolle.');
      requireNote('Bitte kurz zusammenfassen, was repariert wurde.');
      toStatus = 'abschlusskontrolle';
      notifyKind = 'quality_check';
      break;
    }
    case 'return_for_rework':
      requireNote('Bitte Grund für die Nacharbeit angeben.');
      toStatus = 'in_reparatur';
      notifyKind = 'rework';
      break;
    case 'technical_release': {
      requireNote('Bitte Kontrollnachweis eintragen.');
      if (!p.confirm) throw bad('confirm_required', 'Technische Freigabe muss ausdrücklich bestätigt werden.');
      const so = await env.DB.prepare(`SELECT COUNT(*) AS n FROM open_items WHERE case_id=? AND status='offen' AND safety_relevant=1`).bind(c.id).first();
      if (so.n > 0) throw bad('safety_items_open', 'Offene sicherheitsrelevante Restarbeiten – keine Freigabe möglich.');
      const insp = await env.DB.prepare(`SELECT result FROM inspections WHERE case_id=? AND kind='nach_reparatur' ORDER BY created_at DESC LIMIT 1`).bind(c.id).first();
      if (!insp) throw bad('inspection_missing', 'Fahrzeugkontrolle nach Reparatur fehlt.');
      toStatus = 'fahrzeug_freigegeben'; set.closed_at = now; set.safety_lock = 0; set.safety_lock_reason = null;
      const nonSafety = await env.DB.prepare(`SELECT COUNT(*) AS n FROM open_items WHERE case_id=? AND status='offen'`).bind(c.id).first();
      payload = { remaining_open_items: nonSafety.n };
      notifyKind = 'released';
      break;
    }
    default:
      throw bad('unknown_action', 'Unbekannte Aktion.');
  }

  const newVersion = c.version + 1;
  set.status = toStatus; set.version = newVersion; set.updated_at = now;
  const cols = Object.keys(set);
  const upd = env.DB.prepare(`UPDATE cases SET ${cols.map((k) => `${k}=?`).join(', ')} WHERE id=? AND version=?`)
    .bind(...cols.map((k) => set[k]), c.id, c.version);
  const ev = env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,command_id,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM cases WHERE id=? AND version=?)`)
    .bind(uuid(), c.id, envName, user.id, user.role, action, c.status, toStatus, c.version, newVersion, note, JSON.stringify(payload), commandId, now, c.id, newVersion);
  // Guard: schlägt fehl (CHECK), wenn das UPDATE keine Zeile getroffen hat -> gesamte Transaktion wird zurückgerollt
  const guard = env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()');
  const cleanup = env.DB.prepare('DELETE FROM cmd_guard');
  try {
    await env.DB.batch([upd, guard, cleanup, ev, ...extra]);
  } catch (e) {
    if (String(e && e.message).includes('CHECK')) {
      throw conflict('version_conflict', 'Der Vorgang wurde zwischenzeitlich geändert. Bitte neu laden.');
    }
    if (String(e && e.message).includes('UNIQUE') && String(e.message).includes('command_id')) {
      return { ok: true, duplicate: true };
    }
    throw e;
  }
  const updated = await env.DB.prepare('SELECT * FROM cases WHERE id=?').bind(c.id).first();
  if (notifyKind) await notifyCaseEvent(env, ctx, updated, notifyKind, { actor: user, note, payload, previous: c });
  return { ok: true, version: newVersion, status: toStatus };
}

// ---------- Fahrzeugkontrolle nach Reparatur / Abfahrtskontrolle ----------

export const CHECKLIST_VERSION = '2026-10-v1';
export const CHECKLIST = [
  { key: 'beleuchtung', group: 'Licht & Elektrik' },
  { key: 'blinker_warnblinker', group: 'Licht & Elektrik' },
  { key: 'bremsleuchten', group: 'Licht & Elektrik' },
  { key: 'kontrollleuchten', group: 'Licht & Elektrik' },
  { key: 'bremsen_funktion', group: 'Bremsen' },
  { key: 'bremsluft_dicht', group: 'Bremsen' },
  { key: 'reifen_zustand', group: 'Räder & Reifen' },
  { key: 'reifendruck', group: 'Räder & Reifen' },
  { key: 'radmuttern', group: 'Räder & Reifen' },
  { key: 'lenkung', group: 'Fahrwerk' },
  { key: 'fluessigkeiten', group: 'Motor' },
  { key: 'leckagen', group: 'Motor' },
  { key: 'spiegel_scheiben_wischer', group: 'Sicht' },
  { key: 'ladungssicherung_auffahrten', group: 'Aufbau (Autotransporter)' },
  { key: 'hydraulik_ladeetagen', group: 'Aufbau (Autotransporter)' },
  { key: 'kupplung_anhaenger', group: 'Anhänger' },
  { key: 'sicherheitsausruestung', group: 'Ausrüstung' },
  { key: 'probefahrt', group: 'Abschluss' },
];

export async function submitInspection(env, ctx, user, envName, body) {
  const kind = oneOf(body.kind, ['nach_reparatur', 'abfahrt'], 'Kontrollart');
  let c = null;
  let vehicleId;
  if (kind === 'nach_reparatur') {
    const caseId = str(body.case_id, { required: true, max: 40, field: 'Vorgang' });
    const loaded = await loadCase(env, user, envName, caseId);
    c = loaded.c;
    if (!allowedActions(user, c, loaded.access).includes('inspection')) throw forbidden('Kontrolle nach Reparatur ist nur im Status „in Reparatur“ durch die zuständige Werkstatt möglich.');
    vehicleId = c.vehicle_id;
  } else {
    if (!['driver', 'fleet', 'owner', 'workshop'].includes(user.role)) throw forbidden();
    vehicleId = str(body.vehicle_id, { required: true, max: 40, field: 'Fahrzeug' });
    const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=? AND active=1').bind(vehicleId).first();
    if (!v) throw bad('validation', 'Fahrzeug unbekannt.');
  }
  const keys = new Set(CHECKLIST.map((i) => i.key));
  const items = Array.isArray(body.items) ? body.items : [];
  const byKey = new Map();
  for (const it of items) {
    if (!keys.has(it.key)) throw bad('validation', `Unbekannter Prüfpunkt ${it.key}.`);
    const result = oneOf(it.result, ['ok', 'mangel', 'na'], 'Prüfergebnis');
    const note = str(it.note, { max: 1000 });
    if (result === 'mangel' && (!note || note.length < 3)) throw bad('validation', 'Jeder Mangel braucht eine kurze Beschreibung.');
    byKey.set(it.key, { key: it.key, result, note, safety_relevant: !!it.safety_relevant, followup_priority: it.followup_priority && PRIORITIES.includes(it.followup_priority) ? it.followup_priority : null });
  }
  if (byKey.size !== keys.size) throw bad('incomplete', 'Bitte alle Prüfpunkte bewerten (OK / Mangel / entfällt).');
  const odo = body.odometer_km === undefined || body.odometer_km === null || body.odometer_km === '' ? null : Math.round(num(body.odometer_km, { min: 0, max: 5000000, field: 'Kilometerstand' }));
  const defects = [...byKey.values()].filter((i) => i.result === 'mangel');
  const requestKey = str(body.request_key, { required: true, max: 64, field: 'request_key' });
  const id = 'insp-' + (await sha256Hex(`${user.id}:${requestKey}`)).slice(0, 32);
  const now = nowIso();
  const already = await env.DB.prepare('SELECT id, result FROM inspections WHERE id=?').bind(id).first();
  if (already) return { id, result: already.result, followups: [], duplicate: true };

  // Folgeaufträge für jeden Mangel (eigener Vorgang, mit Bezug)
  const followups = [];
  for (const d of defects) {
    const prio = d.followup_priority || (d.safety_relevant ? 'kritisch' : 'mittel');
    const res = await createCase(env, ctx, user, envName, {
      vehicle_id: vehicleId,
      description: `[Kontrolle ${kind === 'nach_reparatur' ? 'nach Reparatur' : 'Abfahrt'}] ${d.key}: ${d.note}`,
      priority: prio,
      driveability: d.safety_relevant ? 'nicht_fahrbereit' : 'unbekannt',
      workshop_site: c?.workshop_site || user.workshop_site || null,
      request_key: `${requestKey}:${d.key}`,
      origin: 'kontrolle',
      parent_case_id: c?.id || null,
    });
    d.followup_case_id = res.id;
    d.followup_case_no = res.case_no;
    followups.push(res);
  }
  const itemsJson = JSON.stringify(CHECKLIST.map((i) => byKey.get(i.key)));
  {
    const stmts = [env.DB.prepare(`INSERT OR IGNORE INTO inspections(id,environment,vehicle_id,case_id,kind,template_version,performed_by,odometer_km,items,result,note,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, envName, vehicleId, c?.id || null, kind, CHECKLIST_VERSION, user.id, odo, itemsJson,
      defects.length ? 'maengel' : 'ok', str(body.note, { max: 2000 }), now)];
    if (odo !== null) {
      stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at) VALUES (?,?,?,?,?,?,?)`)
        .bind(uuid(), vehicleId, odo, now, `kontrolle:${kind}`, user.id, now));
    }
    if (c) {
      stmts.push(env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
        VALUES (?,?,?,?,?,'inspection',?,?,?,?,?,?,?)`).bind(uuid(), c.id, envName, user.id, user.role, c.status, c.status, c.version, c.version,
        defects.length ? `${defects.length} Mangel/Mängel festgestellt` : 'Kontrolle ohne Mängel',
        JSON.stringify({ inspection_id: id, followups: followups.map((f) => f.case_no) }), now));
    }
    await env.DB.batch(stmts);
  }
  return { id, result: defects.length ? 'maengel' : 'ok', followups };
}

// ---------- Dateien ----------

export function sniffType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
  return null;
}

export async function uploadFile(env, user, envName, caseId, request) {
  const { c, access } = await loadCase(env, user, envName, caseId);
  // Fahrer dürfen Fotos an eigene offene Meldungen hängen
  const driverOwn = user.role === 'driver' && c.reporter_id === user.id && OPEN_STATUSES.includes(c.status);
  const reporterOwn = c.reporter_id === user.id && OPEN_STATUSES.includes(c.status);
  if (!(allowedActions(user, c, access).includes('upload') || driverOwn || reporterOwn)) throw forbidden();
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_FILE_BYTES) throw bad('too_large', 'Datei zu groß (max. 5 MB).');
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.length === 0) throw bad('empty', 'Leere Datei.');
  if (buf.length > MAX_FILE_BYTES) throw bad('too_large', 'Datei zu groß (max. 5 MB).');
  const type = sniffType(buf);
  if (!type) throw bad('type', 'Nur JPG, PNG, WEBP oder PDF erlaubt.');
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM files WHERE case_id=?').bind(c.id).first();
  if (count.n >= MAX_FILES) throw bad('too_many', 'Maximal 10 Dateien pro Vorgang.');
  const sha = await sha256Hex(buf);
  const dupe = await env.DB.prepare('SELECT id FROM files WHERE case_id=? AND sha256=?').bind(c.id, sha).first();
  if (dupe) return { id: dupe.id, duplicate: true };
  const rawName = decodeURIComponent(request.headers.get('x-filename') || 'datei');
  const filename = rawName.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || 'datei';
  const id = uuid();
  const key = `${envName}/${c.id}/${id}`;
  await env.FILES.put(key, buf, { metadata: { type, case_id: c.id, env: envName } });
  try {
    await env.DB.prepare(`INSERT INTO files(id,case_id,environment,r2_key,filename,content_type,size,sha256,uploaded_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, c.id, envName, key, filename, type, buf.length, sha, user.id, nowIso()).run();
  } catch (e) {
    await env.FILES.delete(key);
    throw e;
  }
  return { id, duplicate: false, content_type: type, size: buf.length };
}

export async function downloadFile(env, user, envName, fileId) {
  const f = await env.DB.prepare('SELECT * FROM files WHERE id=? AND environment=?').bind(fileId, envName).first();
  if (!f) throw notFound();
  if (f.fine_id) await canReadFineFile(env, user, envName, f.fine_id);
  else if (f.vehicle_id && !f.case_id) { if (!VEHICLE_DOC_READ.includes(user.role)) throw forbidden(); }
  else await loadCase(env, user, envName, f.case_id); // gleiche Rollen-/Umgebungsprüfung wie beim Vorgang
  const data = await env.FILES.get(f.r2_key, { type: 'arrayBuffer' });
  if (!data) throw notFound('Datei nicht im Speicher.');
  return new Response(data, {
    headers: {
      'content-type': f.content_type,
      'content-disposition': `${f.content_type === 'application/pdf' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      'cache-control': 'private, max-age=300',
      'x-content-type-options': 'nosniff',
    },
  });
}
