// [CLAUDE] Prüftermine (HU/SP/UVV/Tachograph …) für den ganzen Fuhrpark: Übersicht, Lückenliste, CSV-Export und belegter CSV-Import.
// Grundsatz: Termine nur aus Belegen. Jede Importzeile braucht einen Nachweis; ein vorhandener späterer Termin wird nie durch einen älteren ersetzt.
import { nowIso, uuid, bad, forbidden, normalizeVin, isValidVin, addMonths, berlinDate } from './util.js';
import { audit } from './auth.js';
import { MAINT_KINDS } from './vehicles.js';

const READ_ROLES = ['owner', 'fleet', 'viewer', 'workshop', 'dispatch'];
const WRITE_ROLES = ['owner', 'fleet'];
// Gesetzliche Pflichtprüfungen für schwere Lkw (StVZO § 29 HU/SP, § 57b Kontrollgerät, DGUV Vorschrift 70 UVV).
// Dient nur der Lückenliste „kein Termin hinterlegt“ – es werden keine Termine daraus berechnet.
export const REQUIRED_KINDS = ['HU', 'SP', 'UVV', 'Tachograph'];
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

// CSV mit Anführungszeichen (RFC 4180, Trennzeichen ; oder ,)
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const sep = firstLine.includes(';') ? ';' : ',';
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"' && cell === '') q = true;
    else if (c === sep) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

function daysUntil(due, today) {
  return Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
}

export async function maintenanceOverview(env, user) {
  if (user && !READ_ROLES.includes(user.role)) throw forbidden();
  const warnRow = await env.DB.prepare(`SELECT value FROM settings WHERE key='maintenance_warn_days'`).first();
  const warnDays = Number(warnRow && warnRow.value) || 30;
  const today = berlinDate();
  const vehicles = (await env.DB.prepare('SELECT id, plate, site FROM vehicles WHERE active=1').all()).results;
  const rules = (await env.DB.prepare(`SELECT m.id, m.vehicle_id, m.kind, m.interval_months, m.last_done_date, m.next_due_date, m.evidence, m.updated_at
    FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id WHERE v.active=1`).all()).results;
  const vmap = new Map(vehicles.map((v) => [v.id, v]));
  const rows = rules.map((r) => {
    const v = vmap.get(r.vehicle_id) || {};
    const days = r.next_due_date ? daysUntil(r.next_due_date, today) : null;
    const status = days === null ? 'ohne_termin' : days < 0 ? 'ueberfaellig' : days <= warnDays ? 'faellig' : 'ok';
    return { id: r.id, vehicle_id: r.vehicle_id, plate: v.plate || null, site: v.site || null, kind: r.kind, last_done_date: r.last_done_date,
      next_due_date: r.next_due_date, interval_months: r.interval_months, days, status, evidence: r.evidence, updated_at: r.updated_at };
  }).sort((a, b) => (a.next_due_date === null) - (b.next_due_date === null) || String(a.next_due_date).localeCompare(String(b.next_due_date)) || String(a.plate).localeCompare(String(b.plate)));
  const has = new Set(rules.filter((r) => r.next_due_date).map((r) => `${r.vehicle_id}|${r.kind}`));
  const gaps = [];
  for (const v of vehicles.sort((a, b) => String(a.plate).localeCompare(String(b.plate)))) {
    const missing = REQUIRED_KINDS.filter((k) => !has.has(`${v.id}|${k}`));
    if (missing.length) gaps.push({ vehicle_id: v.id, plate: v.plate, site: v.site, missing });
  }
  const count = (s) => rows.filter((r) => r.status === s).length;
  return { today, warn_days: warnDays, required_kinds: REQUIRED_KINDS, rows, gaps,
    totals: { overdue: count('ueberfaellig'), due: count('faellig'), ok: count('ok'), no_date: count('ohne_termin'), vehicles: vehicles.length, vehicles_with_gaps: gaps.length } };
}

const csvCell = (x) => {
  let s = x === null || x === undefined ? '' : String(x);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const STATUS_DE = { ueberfaellig: 'überfällig', faellig: 'bald fällig', ok: 'in Ordnung', ohne_termin: 'ohne Termin' };

export function maintenanceCsv(ov) {
  const lines = [['Kennzeichen', 'FIN-Schlüssel', 'Standort', 'Prüfart', 'Letzte Prüfung', 'Nächster Termin', 'Tage bis Termin', 'Status', 'Nachweis'].join(';')];
  for (const r of ov.rows) lines.push([csvCell(r.plate), csvCell(r.vehicle_id), csvCell(r.site), csvCell(r.kind), r.last_done_date || '', r.next_due_date || '', r.days ?? '', STATUS_DE[r.status], csvCell(r.evidence)].join(';'));
  for (const g of ov.gaps) for (const k of g.missing) lines.push([csvCell(g.plate), csvCell(g.vehicle_id), csvCell(g.site), csvCell(k), '', '', '', 'kein Termin hinterlegt', ''].join(';'));
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
  const existing = (await env.DB.prepare('SELECT id, vehicle_id, kind, next_due_date, last_done_date, interval_months, evidence FROM maintenance_rules ORDER BY created_at').all()).results;
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
    let next = due.date;
    if (!next && last.date && interval) next = addMonths(last.date, interval);
    if (!next) return skip('Kein Termin: „Nächster Termin“ oder „Letzte Prüfung“ + Intervall angeben');
    if (last.date && last.date > next) return skip('Letzte Prüfung liegt nach dem nächsten Termin');
    const ev = due.month_only ? `${evidence} (Plakette ${get(cells, ci.due)}: fällig bis Monatsende)` : evidence;
    const key = `${v.id}|${kind}`;
    const prev = planned.get(key);
    if (prev && prev.next >= next) return skip(`Doppelt in der Datei (Zeile ${prev.line} hat gleichen oder späteren Termin)`);
    planned.set(key, { line, vehicle_id: v.id, plate: v.plate, kind, next, last: last.date, interval, evidence: ev, matchedBy });
  });

  const now = nowIso();
  const stmts = [];
  for (const p of [...planned.values()].sort((a, b) => a.line - b.line)) {
    const cur = ruleOf.get(`${p.vehicle_id}|${p.kind}`);
    let action;
    if (!cur) action = 'neu';
    else if (cur.next_due_date && cur.next_due_date > p.next) { result.skipped.push({ line: p.line, plate: p.plate, reason: `Vorhandener Termin ${cur.next_due_date} ist neuer – nicht überschrieben` }); continue; }
    else if (cur.next_due_date === p.next) action = 'unverändert';
    else action = 'aktualisiert';
    result.rows.push({ line: p.line, plate: p.plate, vehicle_id: p.vehicle_id, kind: p.kind, next_due_date: p.next, previous_due_date: cur ? cur.next_due_date : null, matched_by: p.matchedBy, action });
    if (action === 'neu') {
      result.created++;
      stmts.push(env.DB.prepare(`INSERT INTO maintenance_rules(id,vehicle_id,kind,interval_months,interval_km,last_done_date,last_done_km,next_due_date,evidence,created_by,created_at,updated_at)
        VALUES (?,?,?,?,NULL,?,NULL,?,?,?,?,?)`).bind(uuid(), p.vehicle_id, p.kind, p.interval, p.last, p.next, p.evidence, user.id, now, now));
    } else if (action === 'aktualisiert') {
      result.updated++;
      stmts.push(env.DB.prepare(`UPDATE maintenance_rules SET next_due_date=?, last_done_date=COALESCE(?, last_done_date), interval_months=COALESCE(?, interval_months), evidence=?, updated_at=? WHERE id=?`)
        .bind(p.next, p.last, p.interval, p.evidence, now, cur.id));
    } else result.unchanged++;
  }
  result.skipped.sort((a, b) => a.line - b.line);
  if (!dryRun) {
    for (let i = 0; i < stmts.length; i += 200) await env.DB.batch(stmts.slice(i, i + 200));
    await audit(env, user.id, 'maintenance.import', null, { created: result.created, updated: result.updated, unchanged: result.unchanged, skipped: result.skipped.length });
  }
  return result;
}
