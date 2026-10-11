// [CLAUDE] Prüftermine (HU/SP/UVV/Tachograph …) für den ganzen Fuhrpark: Übersicht, Lückenliste, CSV-Export und belegter CSV-Import.
// Grundsatz: Termine nur aus Belegen. Jede Importzeile braucht einen Nachweis; ein vorhandener späterer Termin wird nie durch einen älteren ersetzt.
import { nowIso, uuid, bad, forbidden, normalizeVin, isValidVin, addMonths, berlinDate, parseCsv, icsCalendar } from './util.js';
import { audit } from './auth.js';
import { syncHuSpDues, loadHuSpInputs, huSpFor } from './inspection_rules.js';
import { MAINT_KINDS, maintEventStmt } from './vehicles.js';

const READ_ROLES = ['owner', 'fleet', 'viewer', 'workshop', 'dispatch'];
const WRITE_ROLES = ['owner', 'fleet'];
// Gesetzliche Pflichtprüfungen für schwere Lkw (StVZO § 29 HU/SP, § 57b Kontrollgerät, DGUV Vorschrift 70 UVV).
// Dient nur der Lückenliste „kein Termin hinterlegt“ – es werden keine Termine daraus berechnet.
export const REQUIRED_KINDS = ['HU', 'SP', 'UVV', 'Tachograph'];
export const REQUIRED_KINDS_TRAILER = ['HU', 'SP']; // Anhänger: kein Kontrollgerät; UVV nur bei eigener Ladetechnik → nicht pauschal gefordert
const MAX_ROWS = 2000;

const KIND_ALIASES = new Map([
  ['hu', 'HU'], ['hauptuntersuchung', 'HU'], ['tüv', 'HU'], ['tuev', 'HU'], ['dekra', 'HU'],
  ['sp', 'SP'], ['sicherheitsprüfung', 'SP'], ['sicherheitspruefung', 'SP'],
  ['uvv', 'UVV'], ['uvv-prüfung', 'UVV'], ['uvv-pruefung', 'UVV'],
  ['tachograph', 'Tachograph'], ['tacho', 'Tachograph'], ['tachoprüfung', 'Tachograph'], ['tachopruefung', 'Tachograph'], ['fahrtenschreiber', 'Tachograph'], ['kontrollgerät', 'Tachograph'],
]);
const normPlate = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');

export function normalizeKind(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const exact = MAINT_KINDS.find((k) => k.toLowerCase() === s.toLowerCase());
  return exact || KIND_ALIASES.get(s.toLowerCase()) || null;
}

function validIso(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const x = new Date(d + 'T00:00:00Z');
  return !Number.isNaN(x.getTime()) && x.toISOString().slice(0, 10) === d;
}

// Datum aus Beleg: JJJJ-MM-TT, TT.MM.JJJJ oder MM/JJJJ bzw. MM.JJJJ (Prüfplakette: fällig bis Monatsende)
export function parseDueDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return { date: null };
  let m;
  if (validIso(s)) return { date: s };
  if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) {
    const d = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return validIso(d) ? { date: d } : { error: `Datum ungültig: ${s}` };
  }
  if ((m = s.match(/^(\d{1,2})[./](\d{4})$/))) {
    const mo = Number(m[1]);
    if (mo < 1 || mo > 12) return { error: `Monat ungültig: ${s}` };
    const last = new Date(Date.UTC(Number(m[2]), mo, 0)).toISOString().slice(0, 10);
    return { date: last, month_only: true };
  }
  return { error: `Datum nicht erkannt: ${s} (JJJJ-MM-TT, TT.MM.JJJJ oder MM/JJJJ)` };
}

export { parseCsv } from './util.js';

// Kilometer-Intervall: fällig bei letzter Durchführung (km) + Intervall; nur wenn beides belegt ist.
// Vorwarnung nur, wenn „maintenance_warn_km“ eingestellt ist (keine erfundene Schwelle) – sonst nur „überfällig“.
export async function latestKmByVehicle(env) {
  const rows = (await env.DB.prepare(`SELECT o.vehicle_id, o.km, o.measured_at FROM odometer_readings o
    WHERE o.measured_at = (SELECT MAX(o2.measured_at) FROM odometer_readings o2 WHERE o2.vehicle_id = o.vehicle_id)`).all()).results;
  return new Map(rows.map((r) => [r.vehicle_id, r]));
}
export function kmDue(rule, latest, warnKm) {
  if (!rule.interval_km || rule.last_done_km === null || rule.last_done_km === undefined) return null;
  const next = rule.last_done_km + rule.interval_km;
  if (!latest) return { next_due_km: next, current_km: null, km_measured_at: null, km_remaining: null, km_status: 'ohne_km' };
  const remaining = next - latest.km;
  const st = remaining < 0 ? 'ueberfaellig' : warnKm && remaining <= warnKm ? 'faellig' : 'ok';
  return { next_due_km: next, current_km: latest.km, km_measured_at: latest.measured_at, km_remaining: remaining, km_status: st };
}
const RANK = { ueberfaellig: 4, ungeklaert: 3, faellig: 2, ok: 1, erste_sp: 1, nicht_pflichtig: 0, ohne_termin: 0 };

function daysUntil(due, today) {
  return Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
}

export async function maintenanceOverview(env, user) {
  if (user && !READ_ROLES.includes(user.role)) throw forbidden();
  const cfg = new Map((await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN ('maintenance_warn_days','maintenance_warn_km')`).all()).results.map((r) => [r.key, r.value]));
  const warnDays = Number(cfg.get('maintenance_warn_days')) || 30;
  const warnKm = Number(cfg.get('maintenance_warn_km')) > 0 ? Number(cfg.get('maintenance_warn_km')) : null;
  const latestKm = await latestKmByVehicle(env);
  const today = berlinDate();
  const vehicles = (await env.DB.prepare('SELECT id, plate, site, kind FROM vehicles WHERE active=1 AND eval_excluded=0').all()).results;
  const rules = (await env.DB.prepare(`SELECT m.id, m.vehicle_id, m.kind, m.interval_months, m.interval_km, m.last_done_km, m.last_done_date, m.next_due_date, m.planned_date, m.evidence, m.updated_at
    FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id WHERE v.active=1 AND v.eval_excluded=0`).all()).results;
  const vmap = new Map(vehicles.map((v) => [v.id, v]));
  // HU/SP zentral nach StVZO Anlage VIII (inspection_rules.js)
  const huspIn = await loadHuSpInputs(env);
  const huspBy = new Map();
  for (const [vid, x] of huspIn) if (vmap.has(vid)) huspBy.set(vid, huSpFor(x, today, warnDays));
  const HUSP_MAP = { ok: 'ok', bald_faellig: 'faellig', ueberfaellig: 'ueberfaellig', ungeklaert: 'ungeklaert', nicht_sp_pflichtig: 'nicht_pflichtig', erste_sp_kuenftig: 'erste_sp' };
  const rows = rules.map((r) => {
    const v = vmap.get(r.vehicle_id) || {};
    const hs = (r.kind === 'HU' || r.kind === 'SP') && huspBy.get(r.vehicle_id) ? huspBy.get(r.vehicle_id)[r.kind === 'HU' ? 'hu' : 'sp'] : null;
    if (hs) {
      const due = hs.due || null;
      return { id: r.id, vehicle_id: r.vehicle_id, plate: v.plate || null, site: v.site || null, vehicle_kind: v.kind || null, kind: r.kind, last_done_date: hs.last_done || r.last_done_date,
        next_due_date: due, due_month: due ? `${due.slice(5, 7)}/${due.slice(0, 4)}` : null, due_basis: hs.due_basis, prognosis: hs.prognosis || null, planned_date: hs.planned_date,
        interval_months: r.kind === 'HU' ? hs.interval_months : null, days: due ? daysUntil(due, today) : null, status: HUSP_MAP[hs.status] || 'ungeklaert', husp_status: hs.status, notes: hs.notes, note_codes: hs.note_codes,
        evidence: r.evidence, updated_at: r.updated_at, interval_km: null, last_done_km: r.last_done_km, next_due_km: null, km_remaining: null, km_status: null };
    }
    const days = r.next_due_date ? daysUntil(r.next_due_date, today) : null;
    const dateStatus = days === null ? 'ohne_termin' : days < 0 ? 'ueberfaellig' : days <= warnDays ? 'faellig' : 'ok';
    const kmd = kmDue(r, latestKm.get(r.vehicle_id), warnKm);
    // Gesamtstatus: das Strengere aus Datum und Kilometern
    const status = kmd && kmd.km_status !== 'ohne_km' && RANK[kmd.km_status] > RANK[dateStatus] ? kmd.km_status : dateStatus;
    return { id: r.id, vehicle_id: r.vehicle_id, plate: v.plate || null, site: v.site || null, vehicle_kind: v.kind || null, kind: r.kind, last_done_date: r.last_done_date,
      next_due_date: r.next_due_date, planned_date: r.planned_date || null, interval_months: r.interval_months, days, status, evidence: r.evidence, updated_at: r.updated_at,
      interval_km: r.interval_km, last_done_km: r.last_done_km, ...(kmd || { next_due_km: null, km_remaining: null, km_status: null }) };
  }).sort((a, b) => (RANK[b.status] >= 3 ? RANK[b.status] : 0) - (RANK[a.status] >= 3 ? RANK[a.status] : 0) || (a.next_due_date === null) - (b.next_due_date === null) || String(a.next_due_date).localeCompare(String(b.next_due_date)) || String(a.plate).localeCompare(String(b.plate)));
  const has = new Set(rules.filter((r) => r.next_due_date || r.kind === 'HU' || r.kind === 'SP').map((r) => `${r.vehicle_id}|${r.kind}`));
  // Nicht SP-pflichtige Fahrzeuge brauchen keinen SP-Eintrag
  for (const [vid, h] of huspBy) if (h.sp.status === 'nicht_sp_pflichtig') has.add(`${vid}|SP`);
  const gaps = [];
  for (const v of vehicles.sort((a, b) => String(a.plate).localeCompare(String(b.plate)))) {
    const missing = (v.kind === 'anhaenger' ? REQUIRED_KINDS_TRAILER : REQUIRED_KINDS).filter((k) => !has.has(`${v.id}|${k}`));
    if (missing.length) gaps.push({ vehicle_id: v.id, plate: v.plate, site: v.site, vehicle_kind: v.kind, missing });
  }
  const count = (s) => rows.filter((r) => r.status === s).length;
  return { today, warn_days: warnDays, warn_km: warnKm, required_kinds: REQUIRED_KINDS, required_kinds_trailer: REQUIRED_KINDS_TRAILER, rows, gaps,
    totals: { overdue: count('ueberfaellig'), due: count('faellig'), ok: count('ok'), no_date: count('ohne_termin'), unclear: count('ungeklaert'), vehicles: vehicles.length, vehicles_with_gaps: gaps.length } };
}

export const csvCell = (x) => {
  let s = x === null || x === undefined ? '' : String(x);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const STATUS_DE = { ueberfaellig: 'überfällig', faellig: 'bald fällig', ok: 'in Ordnung', ohne_termin: 'ohne Termin', ungeklaert: 'Frist ungeklärt', nicht_pflichtig: 'nicht SP-pflichtig', erste_sp: 'erste SP künftig fällig' };

export function maintenanceCsv(ov) {
  const lines = [['Kennzeichen', 'FIN-Schlüssel', 'Standort', 'Prüfart', 'Letzte Prüfung', 'Nächster Termin', 'Tage bis Termin', 'Status', 'Nachweis', 'Fahrzeugart', 'Fällig bei km', 'Aktueller km-Stand', 'Rest-km'].join(';')];
  for (const r of ov.rows) lines.push([csvCell(r.plate), csvCell(r.vehicle_id), csvCell(r.site), csvCell(r.kind), r.last_done_date || '', r.next_due_date || '', r.days ?? '', STATUS_DE[r.status], csvCell(r.evidence), r.vehicle_kind === 'anhaenger' ? 'Anhänger' : 'Lkw', r.next_due_km ?? '', r.current_km ?? '', r.km_remaining ?? ''].join(';'));
  for (const g of ov.gaps) for (const k of g.missing) lines.push([csvCell(g.plate), csvCell(g.vehicle_id), csvCell(g.site), csvCell(k), '', '', '', 'kein Termin hinterlegt', '', g.vehicle_kind === 'anhaenger' ? 'Anhänger' : 'Lkw', '', '', ''].join(';'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// Import: Kopfzeile mit Kennzeichen und/oder FIN, Art, Nächster Termin (oder Letzte Prüfung + Intervall), Nachweis.
export async function importMaintenanceCsv(env, user, text, { dryRun = false } = {}) {
  if (!WRITE_ROLES.includes(user.role)) throw forbidden('Nur Inhaber und Fuhrparkleitung dürfen Prüftermine importieren.');
  const table = parseCsv(text);
  if (table.length < 2) throw bad('validation', 'CSV leer.');
  if (table.length - 1 > MAX_ROWS) throw bad('validation', `Maximal ${MAX_ROWS} Zeilen je Import.`);
  const head = table[0].map((h) => h.toLowerCase());
  const col = (names) => head.findIndex((h) => names.some((n) => h.startsWith(n)));
  const ci = { plate: col(['kennzeichen']), vin: col(['fin', 'fahrgestell']), kind: col(['art', 'prüfart', 'pruefart', 'prüfung', 'pruefung']),
    due: col(['nächster', 'naechster', 'fällig', 'faellig', 'termin']), last: col(['letzte', 'zuletzt']), interval: col(['intervall']), evidence: col(['nachweis', 'quelle', 'beleg']) };
  if (ci.plate < 0 && ci.vin < 0) throw bad('validation', 'Spalte Kennzeichen oder FIN erforderlich.');
  if (ci.kind < 0 || ci.evidence < 0) throw bad('validation', 'Spalten Art und Nachweis erforderlich.');
  if (ci.due < 0 && ci.last < 0) throw bad('validation', 'Spalte „Nächster Termin“ oder „Letzte Prüfung“ erforderlich.');

  const vehicles = (await env.DB.prepare('SELECT id, plate FROM vehicles WHERE active=1').all()).results;
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const byPlate = new Map();
  for (const v of vehicles) { const k = normPlate(v.plate); byPlate.set(k, byPlate.has(k) ? 'mehrdeutig' : v); }
  const existing = (await env.DB.prepare('SELECT id, vehicle_id, kind, next_due_date, last_done_date, interval_months, evidence, due_source FROM maintenance_rules ORDER BY created_at').all()).results;
  const ruleOf = new Map();
  for (const r of existing) if (!ruleOf.has(`${r.vehicle_id}|${r.kind}`)) ruleOf.set(`${r.vehicle_id}|${r.kind}`, r);

  const result = { dry_run: !!dryRun, created: 0, updated: 0, unchanged: 0, skipped: [], rows: [] };
  const planned = new Map(); // je Fahrzeug+Art gilt der späteste belegte Termin der Datei
  const get = (cells, i) => (i >= 0 ? cells[i] || '' : '');
  table.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const plateRaw = get(cells, ci.plate);
    const skip = (reason) => result.skipped.push({ line, plate: plateRaw || get(cells, ci.vin), reason });
    let v = null; let matchedBy = null;
    const vinRaw = normalizeVin(get(cells, ci.vin));
    if (vinRaw) {
      if (!isValidVin(vinRaw)) return skip('FIN ungültig');
      v = byId.get(`VIN:${vinRaw}`);
      if (!v) return skip('FIN nicht im Fahrzeugstamm');
      matchedBy = 'FIN';
    } else {
      const hit = byPlate.get(normPlate(plateRaw));
      if (!plateRaw || !hit) return skip('Kennzeichen nicht im Fahrzeugstamm');
      if (hit === 'mehrdeutig') return skip('Kennzeichen mehrdeutig – FIN angeben');
      v = hit; matchedBy = 'Kennzeichen';
    }
    const kind = normalizeKind(get(cells, ci.kind));
    if (!kind) return skip(`Prüfart unbekannt: ${get(cells, ci.kind) || '–'}`);
    const evidence = get(cells, ci.evidence);
    if (!evidence) return skip('Nachweis/Quelle fehlt');
    if (evidence.length > 300) return skip('Nachweis zu lang (max. 300 Zeichen)');
    const due = parseDueDate(get(cells, ci.due));
    if (due.error) return skip(due.error);
    const last = parseDueDate(get(cells, ci.last));
    if (last.error) return skip(last.error);
    if (last.month_only) return skip('Letzte Prüfung bitte taggenau (JJJJ-MM-TT oder TT.MM.JJJJ)');
    let interval = null;
    const ir = get(cells, ci.interval);
    if (ir) { interval = Number(ir.replace(',', '.')); if (!Number.isInteger(interval) || interval < 1 || interval > 120) return skip(`Intervall ungültig: ${ir}`); }
    const husp = kind === 'HU' || kind === 'SP';
    // HU/SP: Fälligkeit nur aus Nachweis (Plakette/Beleg) oder zentral nach StVZO Anlage VIII – nie aus einem pauschalen Intervall
    if (husp) interval = null;
    let next = due.date;
    if (!next && last.date && interval) next = addMonths(last.date, interval);
    if (!next && !last.date) return skip('Kein Datum: „Nächster Termin“ oder „Letzte Prüfung“ angeben');
    if (next && last.date && last.date > next) return skip('Letzte Prüfung liegt nach dem nächsten Termin');
    const ev = due.month_only ? `${evidence} (Plakette ${get(cells, ci.due)}: fällig bis Monatsende)` : evidence;
    const key = `${v.id}|${kind}`;
    const sortKey = next || last.date;
    const prev = planned.get(key);
    if (prev && prev.sortKey >= sortKey) return skip(`Doppelt in der Datei (Zeile ${prev.line} ist gleich oder neuer)`);
    if (prev) result.skipped.push({ line: prev.line, plate: prev.plate, reason: `Ersetzt durch Zeile ${line} (neuerer Beleg)` });
    planned.set(key, { line, vehicle_id: v.id, plate: v.plate, kind, next, last: last.date, interval, evidence: ev, matchedBy, sortKey, husp, dueSource: due.date ? 'nachweis' : 'berechnet' });
  });

  const now = nowIso();
  const stmts = [];
  for (const p of [...planned.values()].sort((a, b) => a.line - b.line)) {
    const cur = ruleOf.get(`${p.vehicle_id}|${p.kind}`);
    const skipRow = (reason) => result.skipped.push({ line: p.line, plate: p.plate, reason });
    let action; let next = p.next; let last = p.last;
    if (!cur) action = 'neu';
    else if (p.next) {
      if (cur.next_due_date && cur.next_due_date > p.next) { skipRow(`Vorhandener Termin ${cur.next_due_date} ist neuer – nicht überschrieben`); continue; }
      if (cur.last_done_date && p.last && cur.last_done_date > p.last) last = cur.last_done_date;
      action = cur.next_due_date === p.next && (!p.last || cur.last_done_date === last) ? 'unverändert' : 'aktualisiert';
    } else {
      // Nur letzte Prüfung belegt: Termin ergibt sich ausschließlich aus einem bereits hinterlegten Intervall
      if (cur.last_done_date && cur.last_done_date > p.last) { skipRow(`Vorhandene letzte Prüfung ${cur.last_done_date} ist neuer – nicht überschrieben`); continue; }
      const iv = p.husp ? null : (p.interval || cur.interval_months);
      next = iv ? addMonths(p.last, iv) : p.husp ? null : (cur.next_due_date && cur.next_due_date > p.last ? cur.next_due_date : null);
      action = cur.last_done_date === p.last && cur.next_due_date === next ? 'unverändert' : 'aktualisiert';
    }
    result.rows.push({ line: p.line, plate: p.plate, vehicle_id: p.vehicle_id, kind: p.kind, last_done_date: last, next_due_date: next, previous_due_date: cur ? cur.next_due_date : null, matched_by: p.matchedBy, action });
    if (action === 'neu') {
      result.created++;
      const ruleId = uuid();
      stmts.push(env.DB.prepare(`INSERT INTO maintenance_rules(id,vehicle_id,kind,interval_months,interval_km,last_done_date,last_done_km,next_due_date,evidence,created_by,created_at,updated_at,due_source)
        VALUES (?,?,?,?,NULL,?,NULL,?,?,?,?,?,?)`).bind(ruleId, p.vehicle_id, p.kind, p.interval, last, next, p.evidence, user.id, now, now, p.dueSource));
      if (last) stmts.push(maintEventStmt(env, { rule_id: ruleId, vehicle_id: p.vehicle_id, kind: p.kind, done_date: last, evidence: p.evidence, source: 'import', user_id: user.id }));
    } else if (action === 'aktualisiert') {
      result.updated++;
      stmts.push(env.DB.prepare(`UPDATE maintenance_rules SET next_due_date=?, last_done_date=?, interval_months=CASE WHEN ? THEN NULL ELSE COALESCE(?, interval_months) END, evidence=?, updated_at=?, due_source=? WHERE id=?`)
        .bind(next, last || cur.last_done_date, p.husp ? 1 : 0, p.interval, p.evidence, now, p.next && p.dueSource === 'nachweis' ? 'nachweis' : (p.husp ? 'berechnet' : cur.due_source || null), cur.id));
      if (p.last) stmts.push(maintEventStmt(env, { rule_id: cur.id, vehicle_id: p.vehicle_id, kind: p.kind, done_date: p.last, evidence: p.evidence, source: 'import', user_id: user.id }));
    } else result.unchanged++;
  }
  result.skipped.sort((a, b) => a.line - b.line);
  if (!dryRun) {
    for (let i = 0; i < stmts.length; i += 200) await env.DB.batch(stmts.slice(i, i + 200));
    await audit(env, user.id, 'maintenance.import', null, { created: result.created, updated: result.updated, unchanged: result.unchanged, skipped: result.skipped.length });
    const hv = [...new Set(result.rows.filter((r) => r.kind === 'HU' || r.kind === 'SP').map((r) => r.vehicle_id))];
    if (hv.length) result.husp_recalc = (await syncHuSpDues(env, { today: berlinDate(), actorId: user.id, vehicleIds: hv })).changed;
  }
  return result;
}

// Kalenderdatei (iCalendar, RFC 5545) mit allen belegten Prüfterminen als ganztägige Termine + Erinnerung (Vorlauf = maintenance_warn_days)
export function maintenanceIcs(ov, stamp = new Date().toISOString()) {
  const events = ov.rows.filter((r) => r.next_due_date).map((r) => ({ uid: r.id, date: r.next_due_date, summary: `${r.kind} fällig – ${r.plate || r.vehicle_id}`,
    description: `Nachweis: ${r.evidence}${r.last_done_date ? ` · letzte Prüfung ${r.last_done_date}` : ''}`, alarm: `${r.kind} ${r.plate || ''}`, alarmDays: ov.warn_days }));
  return icsCalendar('Fuhrpark Prüftermine', events, stamp);
}
