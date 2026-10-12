// [CLAUDE] Schadens- und Werkstattvorgänge: Statusmaschine als Befehle (keine freien Status-Updates)
import { claimForCase } from './claims.js';
import { nowIso, uuid, sha256Hex, bad, forbidden, notFound, conflict, str, oneOf, num, berlinDate, testMasterReadonly, isCalendarDate, hideDriverName } from './util.js';
import { notifyCaseEvent, notifyCasesCreated } from './notify.js';
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
  // Filter „Mangel erneut festgestellt“: Vermerk der Abfahrtskontrolle in den letzten N Tagen (1–30)
  if (query.repeat_days !== undefined && query.repeat_days !== '') {
    const d = Number(query.repeat_days);
    if (!Number.isInteger(d) || d < 1 || d > 30) throw bad('invalid_repeat_days', 'repeat_days: 1–30 Tage');
    where.push(`EXISTS (SELECT 1 FROM case_events e WHERE e.case_id=c.id AND e.action='repeat_finding' AND e.created_at > ?)`);
    args.push(new Date(Date.now() - d * 86400000).toISOString());
  }
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
    SELECT c.*, v.plate, v.site AS vehicle_site, u.display_name AS reporter_name, u.role AS reporter_role,
      (SELECT COUNT(*) FROM open_items oi WHERE oi.case_id=c.id AND oi.status='offen') AS open_items,
      (SELECT COUNT(*) FROM files f WHERE f.case_id=c.id) AS file_count,
      (SELECT MAX(e.created_at) FROM case_events e WHERE e.case_id=c.id AND e.action='repeat_finding') AS last_repeat_at
    FROM cases c JOIN vehicles v ON v.id=c.vehicle_id JOIN users u ON u.id=c.reporter_id
    WHERE ${where.join(' AND ')}
    ORDER BY CASE c.priority WHEN 'kritisch' THEN 0 WHEN 'mittel' THEN 1 ELSE 2 END,
      CASE WHEN c.status IN ('fahrzeug_freigegeben','abgelehnt') THEN 1 ELSE 0 END, c.updated_at DESC
    LIMIT ?`).bind(...args, limit).all()).results;
  return rows.map((r) => ({ ...hideDriverName(user, shapeCase(r, user), 'reporter_name', 'reporter_role'), access: caseAccess(user, r) }));
}

// Vorschläge für Tätigkeiten: häufigste bisherige Beschreibungen der eigenen Werkstatt (nur Text, keine Personen)
export async function workSuggestions(env, user, envName) {
  if (!['owner', 'fleet', 'workshop'].includes(user.role)) throw forbidden();
  const site = user.role === 'workshop' ? user.workshop_site : null;
  const rows = (await env.DB.prepare(`SELECT w.description AS d, COUNT(*) AS n, MAX(w.created_at) AS last FROM work_entries w JOIN cases c ON c.id=w.case_id
    WHERE c.environment=? ${site ? 'AND c.workshop_site=?' : ''} AND w.created_at > ? GROUP BY w.description ORDER BY n DESC, last DESC LIMIT 40`)
    .bind(...(site ? [envName, site] : [envName]), new Date(Date.now() - 365 * 86400000).toISOString()).all()).results;
  return { suggestions: rows.map((r) => r.d) };
}

// Vorschläge für Teile: bisher erfasste Teile der eigenen Werkstatt (Bezeichnung + Teilenummer, ohne Preise)
export async function partSuggestions(env, user, envName) {
  if (!['owner', 'fleet', 'workshop'].includes(user.role)) throw forbidden();
  const site = user.role === 'workshop' ? user.workshop_site : null;
  const rows = (await env.DB.prepare(`SELECT p.name, p.part_number, COUNT(*) AS n, MAX(p.created_at) AS last FROM parts p JOIN cases c ON c.id=p.case_id
    WHERE c.environment=? ${site ? 'AND c.workshop_site=?' : ''} AND p.created_at > ? GROUP BY p.name, p.part_number ORDER BY n DESC, last DESC LIMIT 60`)
    .bind(...(site ? [envName, site] : [envName]), new Date(Date.now() - 365 * 86400000).toISOString()).all()).results;
  return { suggestions: rows.map((r) => ({ name: r.name, part_number: r.part_number })) };
}

// CSV-Export der Vorgangsliste (gleiche Filter und Rechte wie die Liste), Excel-tauglich (UTF-8 mit BOM, Semikolon)
const PRIO_DE = { niedrig: 'niedrig', mittel: 'mittel', kritisch: 'kritisch' };
// claims (optional, nur Inhaber/Fuhrparkleitung): Map case_id → Versicherungsfall; dann drei zusätzliche Spalten
const ORIGIN_DE = { meldung: 'Meldung', kontrolle: 'Abfahrtskontrolle', wartung: 'Prüfauftrag', agent: 'Fuhrparkagent' };
const CLAIM_DE = { gemeldet: 'gemeldet', in_pruefung: 'in Prüfung', reguliert: 'reguliert', abgelehnt: 'abgelehnt', zurueckgezogen: 'zurückgezogen' };
export function casesCsv(rows, csvCell, fmt, claims = null) {
  const head = ['Vorgang', 'Kennzeichen', 'Standort', 'Priorität', 'Status', 'Sicherheitssperre', 'Fahrbereit laut Meldung', 'Werkstatt', 'Beschreibung', 'Gemeldet am', 'Gemeldet von',
    'Eingang bestätigt', 'Werkstatt übernommen', 'Abgeschlossen', 'Offene Restarbeiten', 'Fotos/Dateien', 'Werkstatttermin', ...(claims ? ['Versicherungsfall', 'Versicherer', 'Schadennummer', 'Kostenfreigabe ausstehend'] : []), 'Herkunft'];
  const lines = [head.join(';')];
  for (const c of rows) {
    const k = claims && claims.get(c.id);
    lines.push([csvCell(c.case_no), csvCell(c.plate), csvCell(c.vehicle_site), PRIO_DE[c.priority] || c.priority, csvCell(c.status), c.safety_lock ? 'ja' : 'nein',
      csvCell(c.reported_driveability), csvCell(c.workshop_site), csvCell(c.description), fmt(c.created_at), csvCell(c.reporter_name_hidden ? 'Fahrer/in (Name ausgeblendet)' : c.reporter_name), fmt(c.fleet_received_at), fmt(c.workshop_ack_at), fmt(c.closed_at),
      c.open_items ?? '', c.file_count ?? '', c.planned_date ? c.planned_date.split('-').reverse().join('.') : '',
      ...(claims ? [k ? CLAIM_DE[k.status] : '', csvCell(k ? k.insurer : ''), csvCell(k ? k.claim_no : ''), c.cost_over_limit_at ? 'ja' : ''] : []), ORIGIN_DE[c.origin] || csvCell(c.origin)].join(';'));
  }
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

function shapeCase(c, user) {
  const out = { ...c };
  delete out.request_key;
  delete out.content_hash;
  if (!canSeeCosts(user)) delete out.cost_approved_net;
  if (user.role === 'driver') delete out.cost_over_limit_at;
  if (user.role === 'viewer') delete out.reporter_name_note; // freier Namensvermerk – Datensparsamkeit Lesezugriff
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
  const reporter = await env.DB.prepare('SELECT display_name, role FROM users WHERE id=?').bind(c.reporter_id).first();
  const events = (await env.DB.prepare(`SELECT e.id, e.action, e.from_status, e.to_status, e.note, e.payload, e.created_at, e.actor_role, u.display_name AS actor_name
    FROM case_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.case_id=? ORDER BY e.created_at`).bind(c.id).all()).results
    .map((e) => ({ ...e, payload: e.payload ? JSON.parse(e.payload) : null }));
  const files = (await env.DB.prepare('SELECT id, filename, content_type, size, created_at, uploaded_by FROM files WHERE case_id=? ORDER BY created_at').bind(c.id).all()).results;
  const openItems = (await env.DB.prepare(`SELECT o.*, u.display_name AS created_by_name, u.role AS created_by_role FROM open_items o JOIN users u ON u.id=o.created_by WHERE case_id=? ORDER BY created_at`).bind(c.id).all()).results
    .map((o) => hideDriverName(user, o, 'created_by_name', 'created_by_role'));
  const inspections = (await env.DB.prepare(`SELECT i.id, i.kind, i.result, i.created_at, i.odometer_km, i.items, i.note, u.display_name AS performed_by_name, u.role AS performed_by_role FROM inspections i JOIN users u ON u.id=i.performed_by WHERE i.case_id=? ORDER BY i.created_at`).bind(c.id).all()).results
    .map((i) => hideDriverName(user, { ...i, items: JSON.parse(i.items) }, 'performed_by_name', 'performed_by_role'));
  const followups = (await env.DB.prepare('SELECT id, case_no, status, priority, description FROM cases WHERE parent_case_id=?').bind(c.id).all()).results;
  const parent = c.parent_case_id ? await env.DB.prepare('SELECT id, case_no FROM cases WHERE id=?').bind(c.parent_case_id).first() : null;
  // Prüfung des Mängelauftrags + jüngste spätere Durchführung derselben Prüfart am Fahrzeug (= eingetragene Nachprüfung)
  const mevent = c.maintenance_event_id ? await env.DB.prepare(`SELECT e.id, e.kind, e.done_date, e.result,
      (SELECT json_object('done_date', n.done_date, 'result', n.result, 'evidence', n.evidence) FROM maintenance_events n WHERE n.vehicle_id=e.vehicle_id AND n.kind=e.kind AND n.id<>e.id
        AND (n.done_date > e.done_date OR (n.done_date = e.done_date AND n.created_at > e.created_at)) ORDER BY n.done_date DESC, n.created_at DESC LIMIT 1) AS reinspection
      FROM maintenance_events e WHERE e.id=?`).bind(c.maintenance_event_id).first() : null;
  if (mevent) mevent.reinspection = mevent.reinspection ? JSON.parse(mevent.reinspection) : null;
  const mrule = c.maintenance_rule_id ? await env.DB.prepare('SELECT id, kind, last_done_date FROM maintenance_rules WHERE id=?').bind(c.maintenance_rule_id).first() : null;
  const detail = {
    case: shapeCase(c, user), access, vehicle, reporter_name: user.role === 'viewer' && reporter?.role === 'driver' ? null : reporter?.display_name || null,
    ...(user.role === 'viewer' && reporter?.role === 'driver' ? { reporter_name_hidden: true } : {}),
    events: (user.role === 'driver' ? events.map(({ actor_name, ...e }) => e) : user.role === 'viewer' ? events.map((e) => (e.actor_role === 'driver' ? { ...e, actor_name: null, actor_name_hidden: true } : e)) : events).map((e) => !canSeeCosts(user) && ['cost_limit_exceeded', 'approve_costs'].includes(e.action) ? { ...e, payload: null } : e),
    files, open_items: openItems, inspections, followups, parent, maintenance_rule: mrule ? { ...mrule, done_since_order: !!(mrule.last_done_date && mrule.last_done_date >= berlinDate(c.created_at)) } : null,
    maintenance_event: mevent || null,
    allowed_actions: allowedActions(user, c, access),
  };
  // Versicherungsfall (nur Inhaber/Fuhrparkleitung) samt Versicherungsverträgen des Fahrzeugs zur Auswahl
  if (user.role === 'owner' || user.role === 'fleet') Object.assign(detail, await claimForCase(env, c.id, c.vehicle_id));
  if (user.role !== 'driver') {
    // Kurzinfo zum Fahrzeug (nur gespeicherte Daten): weitere offene Vorgänge, Prüfungen ≤ 30 Tage/überfällig, letzter km-Stand –
    // damit die Werkstatt z. B. eine fällige Prüfung beim selben Aufenthalt mit erledigen kann
    let others = (await env.DB.prepare(`SELECT id, case_no, status, priority, workshop_site, safety_lock FROM cases WHERE vehicle_id=? AND environment=? AND id<>?
      AND status IN ('gemeldet','werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle') ORDER BY created_at DESC LIMIT 20`).bind(c.vehicle_id, envName, c.id).all()).results;
    if (user.role === 'workshop') others = others.filter((o) => o.workshop_site === user.workshop_site && o.status !== 'gemeldet');
    const soon = berlinDate(new Date(Date.now() + 30 * 86400000).toISOString());
    const due = (await env.DB.prepare(`SELECT kind, next_due_date FROM maintenance_rules WHERE vehicle_id=? AND next_due_date IS NOT NULL AND next_due_date <= ? ORDER BY next_due_date LIMIT 10`).bind(c.vehicle_id, soon).all()).results;
    const km = await env.DB.prepare('SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? ORDER BY measured_at DESC LIMIT 1').bind(c.vehicle_id).first();
    // Gleicher Prüfpunkt an diesem Fahrzeug in den 90 Tagen vor dieser Meldung bereits repariert und freigegeben (Hinweis auf mögliche Nacharbeit)
    let prevSame = [];
    if (c.check_item) {
      prevSame = (await env.DB.prepare(`SELECT id, case_no, closed_at, workshop_site FROM cases WHERE vehicle_id=? AND environment=? AND id<>? AND check_item=?
        AND status='fahrzeug_freigegeben' AND closed_at IS NOT NULL AND closed_at <= ? AND closed_at >= ? ORDER BY closed_at DESC LIMIT 5`)
        .bind(c.vehicle_id, envName, c.id, c.check_item, c.created_at, new Date(Date.parse(c.created_at) - 90 * 86400000).toISOString()).all()).results;
      if (user.role === 'workshop') prevSame = prevSame.filter((o) => o.workshop_site === user.workshop_site);
    }
    detail.vehicle_info = { other_open_cases: others.slice(0, 5), other_open_total: others.length, inspections_due: due, last_km: km || null, previous_same_item: prevSame };
  }
  if (user.role !== 'driver' && user.role !== 'viewer' && user.role !== 'dispatch') {
    detail.work = (await env.DB.prepare(`SELECT w.*, u.display_name AS user_name FROM work_entries w JOIN users u ON u.id=w.user_id WHERE case_id=? ORDER BY work_date, created_at`).bind(c.id).all()).results;
    detail.parts = (await env.DB.prepare('SELECT * FROM parts WHERE case_id=? ORDER BY created_at').bind(c.id).all()).results;
  }
  if (canSeeCosts(user)) {
    detail.external_costs = (await env.DB.prepare('SELECT * FROM external_costs WHERE case_id=? ORDER BY created_at').bind(c.id).all()).results;
    // Kosten aus den bereits geladenen Positionen; Stundensatz und Freigabegrenze in einer Abfrage (vorher 5 Zusatzabfragen)
    const sets = new Map((await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN ('workshop_hourly_rate_net','repair_cost_limit_net')`).all()).results.map((r) => [r.key, r.value]));
    const rate = sets.has('workshop_hourly_rate_net') && sets.get('workshop_hourly_rate_net') !== '' ? Number(sets.get('workshop_hourly_rate_net')) : null;
    detail.costs = detail.work && detail.parts ? computeCosts(rate, detail.work, detail.parts, detail.external_costs) : await caseCosts(env, c.id);
    const limRaw = sets.has('repair_cost_limit_net') && sets.get('repair_cost_limit_net') !== '' ? Number(sets.get('repair_cost_limit_net')) : null;
    const lim = Number.isFinite(limRaw) && limRaw > 0 ? limRaw : null;
    if (lim !== null || c.cost_approved_net !== null || c.cost_over_limit_at) detail.cost_limit = { limit_net: lim, approved_net: c.cost_approved_net ?? null, over_since: c.cost_over_limit_at || null };
  }
  return detail;
}

// Kostenbewertung (computeCosts unten): fehlende Sätze/Preise = unbewertet, niemals 0 €
// Kosten-Freigabegrenze (Einstellung `repair_cost_limit_net`, netto; leer/0 = aus – die App setzt keine eigene Grenze)
export async function costLimit(env) {
  const r = await env.DB.prepare(`SELECT value FROM settings WHERE key='repair_cost_limit_net'`).first();
  const n = r && r.value !== '' ? Number(r.value) : null;
  return Number.isFinite(n) && n > 0 ? n : null;
}
const COST_ACTIONS = ['record_work', 'add_part', 'add_external_cost'];
// Nach einer Kostenbuchung: übersteigen die bewerteten Kosten (Ist + Schätzung; unbewertete Positionen zählen nicht) die Grenze bzw.
// den zuletzt freigegebenen Betrag, wird der Auftrag einmalig markiert, im Verlauf vermerkt und die Fuhrparkleitung informiert.
// Kein Statuswechsel, keine Sperre – die Werkstatt sieht „Kostenfreigabe ausstehend“ (ohne Beträge).
async function checkCostLimit(env, ctx, user, envName, c) {
  if (c.cost_over_limit_at) return false;
  const limit = await costLimit(env);
  if (limit === null) return false;
  const k = await caseCosts(env, c.id);
  const total = round2(k.actual_net + k.estimate_net);
  const threshold = Math.max(limit, c.cost_approved_net || 0);
  if (total <= threshold) return false;
  const now = nowIso();
  const payload = { total_net: total, limit_net: limit, approved_net: c.cost_approved_net ?? null, unvalued_items: k.unvalued_items };
  const r = await env.DB.batch([
    env.DB.prepare('UPDATE cases SET cost_over_limit_at=?, updated_at=? WHERE id=? AND cost_over_limit_at IS NULL').bind(now, now, c.id),
    env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,note,payload,created_at)
      SELECT ?,?,?,?,?,'cost_limit_exceeded',?,?,NULL,?,? WHERE (SELECT cost_over_limit_at FROM cases WHERE id=?)=?`)
      .bind(uuid(), c.id, envName, user.id, user.role, c.status, c.status, JSON.stringify(payload), now, c.id, now),
  ]);
  if (!r[0].meta || !r[0].meta.changes) return false; // parallel bereits markiert
  await notifyCaseEvent(env, ctx, { ...c, cost_over_limit_at: now }, 'cost_limit', { actor: user, payload });
  return true;
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

// Eine Abfrage statt vier (Stundensatz + Stunden + Teile + Fremdleistungen); Ergebnis wie computeCosts über die Einzelabfragen
export async function caseCosts(env, caseId) {
  const r = await env.DB.prepare(`SELECT (SELECT value FROM settings WHERE key='workshop_hourly_rate_net') AS rate,
    (SELECT json_group_array(json_object('hours', hours)) FROM work_entries WHERE case_id=?1) AS w,
    (SELECT json_group_array(json_object('quantity', quantity, 'unit_price_net', unit_price_net, 'valuation', valuation)) FROM parts WHERE case_id=?1) AS p,
    (SELECT json_group_array(json_object('amount_net', amount_net, 'valuation', valuation, 'covers_work_and_parts', covers_work_and_parts)) FROM external_costs WHERE case_id=?1) AS e`).bind(caseId).first();
  const rate = r.rate === null || r.rate === '' ? null : Number(r.rate);
  return computeCosts(rate, JSON.parse(r.w || '[]'), JSON.parse(r.p || '[]'), JSON.parse(r.e || '[]'));
}

// Summe über alle Vorgänge eines Fahrzeugs mit 4 Abfragen (statt 4 je Vorgang)
export async function vehicleCosts(env, envName, vehicleId) {
  // Eine Sammelabfrage (Stundensatz + Stunden/Teile/Fremdleistungen aller Vorgänge des Fahrzeugs) statt vier
  const J = 'JOIN cases c ON c.id=x.case_id WHERE c.environment=?1 AND c.vehicle_id=?2';
  const r = await env.DB.prepare(`SELECT (SELECT value FROM settings WHERE key='workshop_hourly_rate_net') AS rate,
    (SELECT json_group_array(json_object('case_id', x.case_id, 'hours', x.hours)) FROM work_entries x ${J}) AS w,
    (SELECT json_group_array(json_object('case_id', x.case_id, 'quantity', x.quantity, 'unit_price_net', x.unit_price_net, 'valuation', x.valuation)) FROM parts x ${J}) AS p,
    (SELECT json_group_array(json_object('case_id', x.case_id, 'amount_net', x.amount_net, 'valuation', x.valuation, 'covers_work_and_parts', x.covers_work_and_parts)) FROM external_costs x ${J}) AS e`)
    .bind(envName, vehicleId).first();
  const rate = r.rate === null || r.rate === '' ? null : Number(r.rate);
  const by = (txt) => {
    const m = new Map();
    for (const x of JSON.parse(txt || '[]')) { if (!m.has(x.case_id)) m.set(x.case_id, []); m.get(x.case_id).push(x); }
    return m;
  };
  const work = by(r.w); const parts = by(r.p); const ext = by(r.e);
  let actual = 0; let estimate = 0; let unvalued = 0;
  for (const id of new Set([...work.keys(), ...parts.keys(), ...ext.keys()])) {
    const k = computeCosts(rate, work.get(id) || [], parts.get(id) || [], ext.get(id) || []);
    actual += k.actual_net; estimate += k.estimate_net; unvalued += k.unvalued_items;
  }
  return { actual_net: round2(actual), estimate_net: round2(estimate), unvalued_items: unvalued, complete: unvalued === 0 };
}
const round2 = (n) => Math.round(n * 100) / 100;

// Werkstatttermin: JJJJ-MM-TT, gültiges Datum, nicht mehr als 1 Jahr in der Vergangenheit/2 Jahre in der Zukunft
export function planDate(v) {
  const d = String(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')) || new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) !== d) throw bad('validation', 'Termin im Format JJJJ-MM-TT.');
  const today = berlinDate();
  const lo = new Date(Date.parse(today) - 366 * 86400000).toISOString().slice(0, 10); const hi = new Date(Date.parse(today) + 731 * 86400000).toISOString().slice(0, 10);
  if (d < lo || d > hi) throw bad('validation', 'Termin liegt außerhalb des zulässigen Zeitraums.');
  return d;
}

// Liefertermin Teile: gültiges Datum, nicht in der Vergangenheit (Berliner Kalender), höchstens 1 Jahr voraus
export function partsDate(v) {
  const d = String(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')) || new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) !== d) throw bad('validation', 'Liefertermin im Format JJJJ-MM-TT.');
  const today = berlinDate();
  if (d < today) throw bad('parts_eta_past', 'Liefertermin liegt in der Vergangenheit.');
  if (d > new Date(Date.parse(today) + 366 * 86400000).toISOString().slice(0, 10)) throw bad('validation', 'Liefertermin liegt mehr als ein Jahr in der Zukunft.');
  return d;
}

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
      if ((ws || mgr) && c.workshop_ack_at) a.push('set_planned_date');
      if (mgr) a.push('reassign_workshop');
      break;
    case 'in_reparatur':
      if (ws || mgr) a.push('wait_parts', 'inspection', 'request_quality_check', 'set_planned_date');
      break;
    case 'wartet_teile':
      if (ws || mgr) a.push('resume_repair', 'set_planned_date', 'set_parts_eta');
      break;
    case 'abschlusskontrolle':
      if (mgr) a.push('return_for_rework', 'technical_release');
      break;
  }
  if (WORK_STATUSES.includes(c.status) && (ws || mgr)) a.push('record_work', 'add_part', 'add_open_item', 'resolve_open_item');
  if (WORK_STATUSES.includes(c.status) && mgr) a.push('add_external_cost');
  if (mgr && c.cost_over_limit_at && OPEN_STATUSES.includes(c.status)) a.push('approve_costs');
  return a;
}

// ---------- Anlegen ----------

// Werkstattauftrag aus einem Prüftermin bzw. einer Wartungsregel (Inhaber/Fuhrparkleitung): legt eine Meldung mit Herkunft „wartung“ an
// und gibt sie direkt an die gewählte Werkstatt frei (normaler Befehl approve_repair, inkl. Hinweis an die Werkstatt). Geplanter Prüftermin
// (ab heute) wird als Werkstatttermin übernommen. Je Regel und Umgebung höchstens ein offener Auftrag. Erledigt wird die Prüfung weiterhin
// in der Fahrzeugakte mit Nachweis – der Auftrag ersetzt keinen Prüfnachweis.
export async function orderFromMaintenance(env, ctx, user, envName, ruleId, body = {}) {
  if (!isManager(user)) throw forbidden();
  const rule = await env.DB.prepare(`SELECT m.id, m.kind, m.vehicle_id, m.planned_date, v.active, v.plate FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id WHERE m.id=?`).bind(ruleId).first();
  if (!rule) throw notFound('Prüftermin nicht gefunden.');
  if (!rule.active) throw bad('validation', 'Fahrzeug ist außer Betrieb.');
  const open = await env.DB.prepare(`SELECT id, case_no FROM cases WHERE maintenance_rule_id=? AND environment=? AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') LIMIT 1`).bind(rule.id, envName).first();
  if (open) throw conflict('order_exists', `Für diese Prüfung gibt es bereits den offenen Auftrag ${open.case_no}.`, { case_id: open.id, case_no: open.case_no });
  const site = str(body.workshop_site, { required: true, max: 20, field: 'Werkstatt' });
  const ws = await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(site).first();
  if (!ws) throw bad('validation', 'Unbekannte Werkstatt.');
  const priority = oneOf(body.priority || 'niedrig', PRIORITIES, 'Priorität');
  const note = str(body.note, { max: 1000 });
  const description = `Prüfung/Wartung ${rule.kind} durchführen${note ? ' – ' + note : ''}`;
  const requestKey = str(body.request_key, { max: 64 }) || uuid();
  // Verknüpfung mit dem Prüftermin im selben atomaren Batch wie die Meldung (vorher eigenes UPDATE danach)
  const [created] = await createCases(env, ctx, user, envName, [{ vehicle_id: rule.vehicle_id, description, priority, driveability: 'fahrbereit', workshop_site: site, request_key: requestKey }],
    { origin: 'wartung', maintenance_rule_id: rule.id, site_checked: true });
  const planned = rule.planned_date && rule.planned_date >= berlinDate() ? rule.planned_date : null;
  const r = await runCommand(env, ctx, user, envName, created.id, { action: 'approve_repair', command_id: 'mo-' + requestKey, expected_version: 1,
    note: `Auftrag aus Prüftermin ${rule.kind}${note ? ': ' + note : ''}`, payload: { workshop_site: site, ...(planned ? { planned_date: planned } : {}) } });
  return { id: created.id, case_no: created.case_no, status: r.status, planned_date: planned };
}


// Werkstattauftrag zur Mängelbeseitigung aus einer gespeicherten Prüfung (Ergebnis erhebliche/gefährliche Mängel bzw. verkehrsunsicher).
// Wie der Auftrag aus Prüftermin: Meldung mit Herkunft „wartung“, direkt an die gewählte Werkstatt freigegeben. Je Durchführung und Umgebung
// höchstens ein offener Auftrag. Fahrbereitschaft: bei „verkehrsunsicher“ ohne Angabe „nicht fahrbereit“ (StVZO Anl. VIIIa: Fahrzeug ist aus dem
// Verkehr zu ziehen), sonst wie angegeben bzw. „unbekannt“ – es wird keine Einschätzung erfunden. Die Wiedervorführung/Nachprüfung ersetzt der Auftrag nicht.
const ROLE_DE = { owner: 'Inhaber', fleet: 'Fuhrparkleitung', workshop: 'Werkstatt', dispatch: 'Disposition' };
const DEFECT_RES = { erhebliche_maengel: 'erhebliche Mängel', gefaehrliche_maengel: 'gefährliche Mängel', verkehrsunsicher: 'verkehrsunsicher' };
export async function orderFromInspectionDefect(env, ctx, user, envName, eventId, body = {}) {
  if (!isManager(user)) throw forbidden();
  const ev = await env.DB.prepare(`SELECT e.id, e.kind, e.done_date, e.result, e.evidence, e.vehicle_id, v.active, v.plate FROM maintenance_events e JOIN vehicles v ON v.id=e.vehicle_id WHERE e.id=?`).bind(eventId).first();
  if (!ev) throw notFound('Prüfung nicht gefunden.');
  if (!DEFECT_RES[ev.result]) throw bad('validation', 'Die Prüfung hat kein Ergebnis mit erheblichen/gefährlichen Mängeln.');
  if (!ev.active) throw bad('validation', 'Fahrzeug ist außer Betrieb.');
  const open = await env.DB.prepare(`SELECT id, case_no FROM cases WHERE maintenance_event_id=? AND environment=? AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') LIMIT 1`).bind(ev.id, envName).first();
  if (open) throw conflict('order_exists', `Für diese Prüfung gibt es bereits den offenen Auftrag ${open.case_no}.`, { case_id: open.id, case_no: open.case_no });
  const site = str(body.workshop_site, { required: true, max: 20, field: 'Werkstatt' });
  const ws = await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(site).first();
  if (!ws) throw bad('validation', 'Unbekannte Werkstatt.');
  const priority = oneOf(body.priority || (ev.result === 'erhebliche_maengel' ? 'mittel' : 'kritisch'), PRIORITIES, 'Priorität');
  const driveability = oneOf(body.driveability || (ev.result === 'verkehrsunsicher' ? 'nicht_fahrbereit' : 'unbekannt'), DRIVEABILITY, 'Fahrbereitschaft');
  const note = str(body.note, { max: 1000 });
  const date = ev.done_date.split('-').reverse().join('.');
  const description = `Mängel aus ${ev.kind} vom ${date} beseitigen (Ergebnis: ${DEFECT_RES[ev.result]}; Nachweis: ${ev.evidence})${note ? ' – ' + note : ''}`;
  const requestKey = str(body.request_key, { max: 64 }) || uuid();
  const [created] = await createCases(env, ctx, user, envName, [{ vehicle_id: ev.vehicle_id, description, priority, driveability, workshop_site: site, request_key: requestKey }],
    { origin: 'wartung', maintenance_event_id: ev.id, site_checked: true });
  const r = await runCommand(env, ctx, user, envName, created.id, { action: 'approve_repair', command_id: 'md-' + requestKey, expected_version: 1,
    note: `Mängelbeseitigung aus ${ev.kind} vom ${date}${note ? ': ' + note : ''}`, payload: { workshop_site: site, priority } });
  return { id: created.id, case_no: created.case_no, status: r.status, priority, driveability };
}

export async function createCase(env, ctx, user, envName, body) {
  return (await createCases(env, ctx, user, envName, [body]))[0];
}

// Mehrere Meldungen in einem Aufruf anlegen (z. B. Folgeaufträge einer Kontrolle mit mehreren Mängeln).
// Abfragebudget: feste Zahl an Anweisungen unabhängig von der Anzahl – vorher ≈ 14 je Meldung, d. h. eine
// Abfahrtskontrolle mit 3 Mängeln überschritt bereits die Cloudflare-Grenze von 50 Abfragen je Aufruf.
// internal: nur für serverseitige Aufrufer (Aufträge aus Prüftermin/Prüfung) – nie aus Anfragedaten befüllen
export async function createCases(env, ctx, user, envName, bodies, internal = {}) {
  if (!['owner', 'fleet', 'workshop', 'dispatch', 'driver'].includes(user.role)) throw forbidden();
  if (!bodies.length) return [];
  const specs = [];
  for (const body of bodies) {
    const vehicleId = str(body.vehicle_id, { required: true, max: 40, field: 'Fahrzeug' });
    const description = str(body.description, { required: true, max: 4000, field: 'Fehlerbeschreibung' });
    if (description.length < 5) throw bad('validation', 'Fehlerbeschreibung ist zu kurz.');
    const reportedPriority = oneOf(body.priority || 'niedrig', PRIORITIES, 'Dringlichkeit');
    const driveability = oneOf(body.driveability || 'unbekannt', DRIVEABILITY, 'Fahrbereitschaft');
    const suggested = body.workshop_site ? str(body.workshop_site, { max: 20 }) : null;
    const requestKey = str(body.request_key, { required: true, max: 64, field: 'request_key' });
    const location = str(body.location_note, { max: 300 });
    const origin = body.origin && ['meldung', 'kontrolle'].includes(body.origin) ? body.origin : 'meldung';
    const parentId = body.parent_case_id ? str(body.parent_case_id, { max: 40 }) : null;
    const checkItem = origin === 'kontrolle' && body.check_item ? str(body.check_item, { max: 60 }) : null;
    specs.push({ vehicleId, description, reportedPriority, driveability, suggested, requestKey, location, origin, parentId, checkItem,
      reporterNote: str(body.reporter_name_note, { max: 120 }) });
    if (internal.origin) specs.at(-1).origin = internal.origin;
  }
  const J = (a) => JSON.stringify([...new Set(a)]);
  const vehicles = new Map((await env.DB.prepare('SELECT * FROM vehicles WHERE active=1 AND id IN (SELECT value FROM json_each(?))').bind(J(specs.map((x) => x.vehicleId))).all()).results.map((v) => [v.id, v]));
  if (specs.some((x) => !vehicles.has(x.vehicleId))) throw bad('validation', 'Fahrzeug unbekannt.');
  const sites = specs.map((x) => x.suggested).filter(Boolean);
  if (sites.length && !internal.site_checked) {
    const ok = new Set((await env.DB.prepare('SELECT code FROM workshops WHERE active=1 AND code IN (SELECT value FROM json_each(?))').bind(J(sites)).all()).results.map((r) => r.code));
    if (sites.some((x) => !ok.has(x))) throw bad('validation', 'Unbekannte Werkstatt.');
  }
  const hashes = await Promise.all(specs.map((x) => sha256Hex(JSON.stringify([x.vehicleId, x.description, x.reportedPriority, x.driveability, x.suggested, x.location, x.parentId]))));
  specs.forEach((x, i) => { x.contentHash = hashes[i]; });
  const byKey = async () => new Map((await env.DB.prepare('SELECT id, case_no, content_hash, request_key FROM cases WHERE environment=? AND reporter_id=? AND request_key IN (SELECT value FROM json_each(?))')
    .bind(envName, user.id, J(specs.map((x) => x.requestKey))).all()).results.map((r) => [r.request_key, r]));
  const existing = await byKey();
  const results = new Array(specs.length);
  const fresh = [];
  const seenKeys = new Set();
  specs.forEach((x, i) => {
    const e = existing.get(x.requestKey);
    if (e) {
      if (e.content_hash !== x.contentHash) throw conflict('request_key_conflict', 'Diese Meldung wurde bereits mit anderem Inhalt gesendet.');
      results[i] = { id: e.id, case_no: e.case_no, duplicate: true };
    } else if (seenKeys.has(x.requestKey)) {
      throw bad('validation', 'request_key doppelt.');
    } else { seenKeys.add(x.requestKey); fresh.push([i, x]); }
  });
  if (!fresh.length) return results;

  // Sicherheitsrelevant: kritisch oder nicht fahrbereit -> Sperre bis menschliche Fachbewertung
  const year = new Date().getUTCFullYear();
  const k = fresh.length;
  const counter = await env.DB.prepare(`INSERT INTO case_counters(environment, year, last_no) VALUES (?, ?, ?)
    ON CONFLICT(environment, year) DO UPDATE SET last_no = last_no + ? RETURNING last_no`).bind(envName, year, k, k).first();
  const now = nowIso();
  const rows = []; const events = [];
  fresh.forEach(([i, x], n) => {
    const safetyLock = x.reportedPriority === 'kritisch' || x.driveability === 'nicht_fahrbereit' ? 1 : 0;
    const caseNo = `${envName === 'test' ? 'T' : 'S'}-${year}-${String(counter.last_no - k + 1 + n).padStart(4, '0')}`;
    const id = uuid();
    // Text nennt die meldende Rolle zutreffend (vorher stand auch bei Meldungen der Leitung/Werkstatt „Fahrer meldet“)
    const by = user.role === 'driver' ? 'Fahrer meldet' : `Meldung ${ROLE_DE[user.role] || ''}`.trim();
    const lockReason = safetyLock ? (x.driveability === 'nicht_fahrbereit' ? `${by}: nicht fahrbereit (ungeprüft)` : `${by}: sicherheitskritisch (ungeprüft)`) : null;
    rows.push({ id, case_no: caseNo, vehicle_id: x.vehicleId, reporter_name_note: x.reporterNote, description: x.description, location_note: x.location,
      priority: x.reportedPriority, driveability: x.driveability, safety_lock: safetyLock, lock_reason: lockReason, site: x.suggested, origin: x.origin,
      parent_case_id: x.parentId, check_item: x.checkItem, request_key: x.requestKey, content_hash: x.contentHash,
      maintenance_rule_id: internal.maintenance_rule_id || null, maintenance_event_id: internal.maintenance_event_id || null });
    events.push({ id: uuid(), case_id: id, payload: JSON.stringify({ priority: x.reportedPriority, driveability: x.driveability, safety_lock: !!safetyLock, origin: x.origin, parent_case_id: x.parentId }) });
    results[i] = { id, case_no: caseNo, duplicate: false, safety_lock: !!safetyLock };
  });
  const v = (key) => `json_extract(value,'$.${key}')`;
  try {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO cases(id,case_no,environment,vehicle_id,reporter_id,reporter_name_note,description,location_note,reported_priority,priority,
        reported_driveability,safety_lock,safety_lock_reason,status,suggested_workshop_site,origin,parent_case_id,check_item,request_key,content_hash,maintenance_rule_id,maintenance_event_id,version,created_at,updated_at)
        SELECT ${v('id')}, ${v('case_no')}, ?1, ${v('vehicle_id')}, ?2, ${v('reporter_name_note')}, ${v('description')}, ${v('location_note')}, ${v('priority')}, ${v('priority')},
          ${v('driveability')}, ${v('safety_lock')}, ${v('lock_reason')}, 'gemeldet', ${v('site')}, ${v('origin')}, ${v('parent_case_id')}, ${v('check_item')}, ${v('request_key')}, ${v('content_hash')}, ${v('maintenance_rule_id')}, ${v('maintenance_event_id')}, 1, ?3, ?3
        FROM json_each(?4)`).bind(envName, user.id, now, JSON.stringify(rows)),
      env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
        SELECT ${v('id')}, ${v('case_id')}, ?1, ?2, ?3, 'create', NULL, 'gemeldet', NULL, 1, NULL, ${v('payload')}, ?4 FROM json_each(?5)`)
        .bind(envName, user.id, user.role, now, JSON.stringify(events)),
    ]);
  } catch (e) {
    // Paralleler Doppelklick: eindeutiger request_key greift (Batch ist atomar – entweder alle oder keine angelegt)
    const again = await byKey();
    if (specs.every((x) => again.get(x.requestKey)?.content_hash === x.contentHash)) return specs.map((x) => ({ id: again.get(x.requestKey).id, case_no: again.get(x.requestKey).case_no, duplicate: true }));
    throw e;
  }
  const created = (await env.DB.prepare('SELECT * FROM cases WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(rows.map((r) => r.id))).all()).results;
  const order = new Map(rows.map((r, n) => [r.id, n]));
  created.sort((a, b) => order.get(a.id) - order.get(b.id));
  await notifyCasesCreated(env, ctx, created, { actor: user, vehicles });
  return results;
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
      if (p.planned_date) set.planned_date = planDate(p.planned_date);
      toStatus = 'werkstatt_freigegeben';
      payload.workshop_site = site;
      notifyKind = 'approved';
      break;
    }
    case 'set_planned_date': {
      // Werkstatttermin setzen/verschieben/entfernen (leer); ohne Statuswechsel und ohne Push
      const d = p.planned_date ? planDate(p.planned_date) : null;
      if (d === (c.planned_date || null)) throw bad('validation', 'Termin ist unverändert.');
      set.planned_date = d; payload = { from: c.planned_date || null, to: d };
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
      if (p.planned_date) set.planned_date = planDate(p.planned_date);
      notifyKind = 'acknowledged';
      break;
    case 'start_repair':
      if (!c.workshop_ack_at) { set.workshop_ack_at = now; set.workshop_ack_by = user.id; }
      toStatus = 'in_reparatur';
      notifyKind = 'started';
      break;
    case 'wait_parts': {
      requireNote('Bitte angeben, auf welche Teile gewartet wird.');
      // Liefertermin nur laut Lieferant/Werkstatt (optional) – die App schätzt nichts
      const eta = p.parts_expected_date ? partsDate(p.parts_expected_date) : null;
      set.parts_expected_date = eta;
      if (eta) payload = { parts_expected_date: eta };
      toStatus = 'wartet_teile';
      notifyKind = 'waiting_parts';
      break;
    }
    case 'set_parts_eta': {
      // Liefertermin setzen/verschieben/entfernen (leer); ohne Statuswechsel und ohne Push
      const eta = p.parts_expected_date ? partsDate(p.parts_expected_date) : null;
      if (eta === (c.parts_expected_date || null)) throw bad('validation', 'Liefertermin ist unverändert.');
      set.parts_expected_date = eta; payload = { from: c.parts_expected_date || null, to: eta };
      break;
    }
    case 'resume_repair':
      set.parts_expected_date = null; // Teile da – Liefertermin erledigt (bleibt im Verlauf)
      toStatus = 'in_reparatur';
      notifyKind = 'resumed';
      break;
    case 'record_work': {
      const hours = num(p.hours, { min: 0.05, max: 24, field: 'Stunden' });
      const desc = str(p.description, { required: true, max: 2000, field: 'Tätigkeit' });
      const date = str(p.work_date, { max: 10 }) || berlinDate();
      if (!isCalendarDate(date)) throw bad('validation', 'Datum ungültig.');
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
    case 'approve_costs': {
      // Kostenfreigabe über der eingestellten Grenze: gilt für den aktuellen Betrag; steigen die Kosten darüber, ist erneut eine Freigabe nötig
      if (!c.cost_over_limit_at) throw bad('validation', 'Keine Kostenfreigabe ausstehend.');
      requireNote('Bitte Freigabevermerk angeben (z. B. Umfang, Rücksprache).');
      const k = await caseCosts(env, c.id);
      const total = round2(k.actual_net + k.estimate_net);
      set.cost_approved_net = total; set.cost_over_limit_at = null;
      payload = { approved_net: total, limit_net: await costLimit(env), unvalued_items: k.unvalued_items };
      notifyKind = 'cost_approved';
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
  const cost_limit_exceeded = COST_ACTIONS.includes(action) ? await checkCostLimit(env, ctx, user, envName, updated) : undefined;
  return { ok: true, version: newVersion, status: toStatus, ...(cost_limit_exceeded ? { cost_limit_exceeded: true } : {}) };
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
  const odo = body.odometer_km === undefined || body.odometer_km === null || body.odometer_km === '' ? null : Math.round(num(body.odometer_km, { min: 0, max: 5000000, field: 'Kilometerstand', grouped: true }));
  const defects = [...byKey.values()].filter((i) => i.result === 'mangel');
  const requestKey = str(body.request_key, { required: true, max: 64, field: 'request_key' });
  const id = 'insp-' + (await sha256Hex(`${user.id}:${requestKey}`)).slice(0, 32);
  const now = nowIso();
  const already = await env.DB.prepare('SELECT id, result FROM inspections WHERE id=?').bind(id).first();
  if (already) return { id, result: already.result, followups: [], duplicate: true };

  // Folgeaufträge für jeden Mangel (eigener Vorgang, mit Bezug) – gesammelt angelegt (Abfragezahl unabhängig von der Mängelzahl)
  const followups = [];
  const repeats = [];
  const RANK = { niedrig: 0, mittel: 1, kritisch: 2 };
  // Abfahrtskontrolle: derselbe Prüfpunkt hat bereits einen offenen Folgeauftrag → kein neuer Vorgang, sondern Vermerk dort.
  // Nur wenn der offene Vorgang mindestens so dringend ist; ein sicherheitsrelevanter Mangel braucht dort eine aktive Sperre.
  const openByItem = new Map();
  if (kind === 'abfahrt' && defects.length) {
    for (const r of (await env.DB.prepare(`SELECT id, case_no, priority, safety_lock, status, version, check_item FROM cases WHERE vehicle_id=? AND environment=? AND origin='kontrolle'
      AND check_item IN (SELECT value FROM json_each(?)) AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') ORDER BY created_at DESC`).bind(vehicleId, envName, JSON.stringify(defects.map((d) => d.key))).all()).results) {
      if (!openByItem.has(r.check_item)) openByItem.set(r.check_item, r); // jüngster offener je Prüfpunkt
    }
  }
  const toCreate = [];
  const slots = [];
  for (const d of defects) {
    const prio = d.followup_priority || (d.safety_relevant ? 'kritisch' : 'mittel');
    const open = openByItem.get(d.key);
    if (open && RANK[open.priority] >= RANK[prio] && (!d.safety_relevant || open.safety_lock)) {
      repeats.push({ open, d });
      d.followup_case_id = open.id; d.followup_case_no = open.case_no; d.repeat = true;
      followups.push({ id: open.id, case_no: open.case_no, duplicate: true, repeat: true });
      continue;
    }
    slots.push({ d, at: followups.length });
    followups.push(null);
    toCreate.push({
      vehicle_id: vehicleId,
      description: `[Kontrolle ${kind === 'nach_reparatur' ? 'nach Reparatur' : 'Abfahrt'}] ${d.key}: ${d.note}`,
      priority: prio,
      driveability: d.safety_relevant ? 'nicht_fahrbereit' : 'unbekannt',
      workshop_site: c?.workshop_site || user.workshop_site || null,
      request_key: `${requestKey}:${d.key}`,
      origin: 'kontrolle',
      check_item: d.key,
      parent_case_id: c?.id || null,
    });
  }
  const created = await createCases(env, ctx, user, envName, toCreate);
  slots.forEach(({ d, at }, n) => {
    const res = created[n];
    d.followup_case_id = res.id;
    d.followup_case_no = res.case_no;
    followups[at] = res;
  });
  const itemsJson = JSON.stringify(CHECKLIST.map((i) => byKey.get(i.key)));
  // km-Stand aus der Kontrolle nur in die Fahrzeugakte, wenn er nicht kleiner als der letzte erfasste ist (Tippfehler würden
  // km-Fälligkeiten und €/km verfälschen). Er bleibt an der Kontrolle gespeichert; Korrektur mit Begründung über die Fahrzeugakte.
  let kmRejected = null;
  if (odo !== null) {
    const last = await env.DB.prepare('SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? ORDER BY measured_at DESC LIMIT 1').bind(vehicleId).first();
    if (last && odo < last.km) kmRejected = { km: odo, previous_km: last.km, previous_at: last.measured_at };
  }
  // Testumgebung mit „Stammdaten nur lesen“: km bleibt an der Kontrolle, nicht in der gemeinsamen Fahrzeugakte
  const kmTestOnly = odo !== null && !kmRejected && envName === 'test' && user.role !== 'owner' && await testMasterReadonly(env);
  {
    const stmts = [env.DB.prepare(`INSERT OR IGNORE INTO inspections(id,environment,vehicle_id,case_id,kind,template_version,performed_by,odometer_km,items,result,note,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, envName, vehicleId, c?.id || null, kind, CHECKLIST_VERSION, user.id, odo, itemsJson,
      defects.length ? 'maengel' : 'ok', str(body.note, { max: 2000 }), now)];
    if (odo !== null && !kmRejected && !kmTestOnly) {
      stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at) VALUES (?,?,?,?,?,?,?)`)
        .bind(uuid(), vehicleId, odo, now, `kontrolle:${kind}`, user.id, now));
    }
    if (c) {
      stmts.push(env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
        VALUES (?,?,?,?,?,'inspection',?,?,?,?,?,?,?)`).bind(uuid(), c.id, envName, user.id, user.role, c.status, c.status, c.version, c.version,
        (defects.length ? `${defects.length} Mangel/Mängel festgestellt` : 'Kontrolle ohne Mängel') + (kmRejected ? ` · km-Stand ${odo} kleiner als zuletzt erfasst (${kmRejected.previous_km}) – nicht in die Fahrzeugakte übernommen` : ''),
        JSON.stringify({ inspection_id: id, followups: followups.map((f) => f.case_no) }), now));
    }
    if (repeats.length) { // zwei Anweisungen unabhängig von der Anzahl
      const rep = repeats.map(({ open, d }) => ({ id: uuid(), case_id: open.id, status: open.status, version: open.version, note: `Erneut festgestellt (Abfahrtskontrolle): ${d.note}` }));
      const x = (k) => `json_extract(value,'$.${k}')`;
      stmts.push(env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
        SELECT ${x('id')}, ${x('case_id')}, ?1, ?2, ?3, 'repeat_finding', ${x('status')}, ${x('status')}, ${x('version')}, ${x('version')}, ${x('note')}, ?4, ?5 FROM json_each(?6)`)
        .bind(envName, user.id, user.role, JSON.stringify({ inspection_id: id }), now, JSON.stringify(rep)));
      stmts.push(env.DB.prepare('UPDATE cases SET updated_at=? WHERE id IN (SELECT value FROM json_each(?))').bind(now, JSON.stringify(rep.map((r) => r.case_id))));
    }
    await env.DB.batch(stmts);
  }
  return { id, result: defects.length ? 'maengel' : 'ok', followups, km_rejected: kmRejected, km_test_only: kmTestOnly };
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
