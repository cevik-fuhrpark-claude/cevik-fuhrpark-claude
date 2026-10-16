// [CLAUDE] Reifenmanagement: Größen je Achse (mit Prüfstatus), Messungen/Wechsel je Position, Grenzwerte
import { nowIso, uuid, bad, forbidden, notFound, str, num, oneOf, normalizeVin, parseCsv, hideDriverName, berlinDate, intParam } from './util.js';
import { audit } from './auth.js';
import { siteSelection } from './reports.js';

export const AXLES = ['lenkachse', 'liftachse', 'antriebsachse', 'anhaenger'];
export const POSITIONS = ['VA-L', 'VA-R', 'LA-L', 'LA-R', 'HA-L-aussen', 'HA-L-innen', 'HA-R-innen', 'HA-R-aussen',
  'AH1-L', 'AH1-R', 'AH2-L', 'AH2-R', 'AH3-L', 'AH3-R', 'Reserve'];
// Positionen je Fahrzeugart: Lkw ohne Anhängerachsen, Anhänger nur AH-Achsen; Reserve bei beiden (Achszahl bleibt offen, Stammdaten geben sie nicht her)
export function positionsForKind(kind) {
  return kind === 'anhaenger' ? POSITIONS.filter((p) => p.startsWith('AH') || p === 'Reserve') : POSITIONS.filter((p) => !p.startsWith('AH'));
}
export const TIRE_EVENTS = ['messung', 'wechsel', 'reparatur', 'sichtpruefung'];
// Gesetzliche Mindestprofiltiefe in Deutschland (StVZO § 36) für Lkw-Reifen: 1,6 mm
export const LEGAL_MIN_TREAD_MM = 1.6;
// Winterkennzeichnung (StVO § 2 Abs. 3a): bei Glätte/Schnee nur mit Alpine-Symbol (3PMSF); reine M+S-Reifen genügen seit 01.10.2024 nicht mehr.
// Lkw (N2/N3): Antriebsachsen und vordere Lenkachsen; Anhänger sind keine Kfz und nicht betroffen.
export const WINTER_MARKS = ['3pmsf', 'ms', 'keine'];
const WINTER_BASE = ['VA-L', 'VA-R', 'HA-L-aussen', 'HA-R-aussen'];
const WINTER_TWIN = ['HA-L-innen', 'HA-R-innen'];
// DOT-Code: letzte 4 Ziffern = Herstellwoche (01–53) und -jahr (JJ) → Montag dieser ISO-Woche (JJJJ-MM-TT); ungültig → null.
export function dotDate(dot) {
  const d = String(dot || '').replace(/\s/g, '').slice(-4);
  if (!/^\d{4}$/.test(d)) return null;
  const w = Number(d.slice(0, 2)); const y = 2000 + Number(d.slice(2));
  if (w < 1 || w > 53) return null;
  const jan4 = Date.UTC(y, 0, 4);
  const mon = jan4 - ((new Date(jan4).getUTCDay() + 6) % 7) * 86400000 + (w - 1) * 7 * 86400000;
  if (new Date(mon + 3 * 86400000).getUTCFullYear() !== y) return null; // KW 53 gibt es nicht in jedem Jahr
  return new Date(mon).toISOString().slice(0, 10);
}
// Alter in vollen Monaten bis heute (Berliner Kalendertag)
export function ageMonths(isoDay, today = berlinDate()) {
  const [y1, m1, d1] = isoDay.split('-').map(Number); const [y2, m2, d2] = today.split('-').map(Number);
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0));
}
// aktueller DOT je Position (neueste zuerst): letzter Eintrag mit DOT; ein Wechsel ohne DOT = neuer Reifen, Alter unbekannt
export function currentDots(events) {
  const out = {};
  for (const e of events) {
    if (e.position in out) continue;
    if (e.dot && dotDate(e.dot)) out[e.position] = { dot: e.dot, dot_date: dotDate(e.dot) };
    else if (e.event_type === 'wechsel') out[e.position] = null;
  }
  return out;
}
// events: Reifenereignisse EINES Fahrzeugs, neueste zuerst → aktuelle Kennzeichnung je Position (null = nicht erfasst).
// Ein Wechsel ohne Angabe setzt auf „nicht erfasst“ zurück (neuer Reifen, Kennzeichnung unbekannt).
export function winterMarks(events) {
  const marks = {}; const seen = new Set();
  for (const e of events) {
    seen.add(e.position);
    if (e.position in marks) continue;
    if (e.winter_mark) marks[e.position] = e.winter_mark;
    else if (e.event_type === 'wechsel') marks[e.position] = null;
  }
  return { marks, seen };
}
// DOT-Felder je Position: Herstellwoche, Alter in Monaten, über Warnalter (nur wenn Einstellung gesetzt)
function dotAge(d, today, ageYears) {
  if (!d) return { dot: null, dot_date: null, age_months: null, age_warn: false };
  const m = ageMonths(d.dot_date, today);
  return { dot: d.dot, dot_date: d.dot_date, age_months: m, age_warn: ageYears !== null && m >= ageYears * 12 };
}
// Status je Fahrzeug: erfuellt / nicht_erfuellt / unbekannt / nicht_pflichtig (Anhänger). Zwillingsbereifung (innen) nur, wenn dort Ereignisse erfasst sind.
export function winterStatus(kind, { marks, seen }) {
  if (kind === 'anhaenger') return { status: 'nicht_pflichtig', required: [], missing: [], noncompliant: [] };
  const required = [...WINTER_BASE, ...WINTER_TWIN.filter((p) => seen.has(p))].sort((a, b) => POSITIONS.indexOf(a) - POSITIONS.indexOf(b));
  const noncompliant = required.filter((p) => marks[p] === 'ms' || marks[p] === 'keine');
  const missing = required.filter((p) => !marks[p]);
  return { status: noncompliant.length ? 'nicht_erfuellt' : missing.length ? 'unbekannt' : 'erfuellt', required, missing, noncompliant };
}

// Werkstattaufträge „Winterreifen“ (cases.tire_order='winter') je Fahrzeug, eine Abfrage; nur Auftragsnummer, keine Personen.
// open: offene Aufträge (vehicle_id → {id, case_no}); closed: zuletzt freigegebener Auftrag der letzten 60 Tage (→ {id, case_no, closed_at}) –
// nur aussagekräftig, solange die Winterlage danach nicht erfüllt ist und kein neuer Auftrag offen ist („Auftrag abgeschlossen, Lage offen“).
export const WINTER_CLOSED_DAYS = 60;
export async function winterOrders(env, envName, vehicleId = null) {
  const since = new Date(Date.now() - WINTER_CLOSED_DAYS * 86400000).toISOString();
  const r = (await env.DB.prepare(`SELECT vehicle_id, id, case_no, status, closed_at FROM cases WHERE environment=? AND tire_order='winter'
    AND (status NOT IN ('fahrzeug_freigegeben','abgelehnt') OR (status='fahrzeug_freigegeben' AND closed_at > ?))${vehicleId ? ' AND vehicle_id=?' : ''} ORDER BY closed_at DESC`)
    .bind(...(vehicleId ? [envName, since, vehicleId] : [envName, since])).all()).results;
  const open = new Map(); const closed = new Map();
  for (const x of r) {
    if (x.status !== 'fahrzeug_freigegeben') open.set(x.vehicle_id, { id: x.id, case_no: x.case_no });
    else if (!closed.has(x.vehicle_id)) closed.set(x.vehicle_id, { id: x.id, case_no: x.case_no, closed_at: x.closed_at });
  }
  // Hinweis nur bei offener Lage ohne neuen Auftrag
  const closedIfOpen = (vid, status) => (['nicht_erfuellt', 'unbekannt'].includes(status) && !open.has(vid) ? closed.get(vid) || null : null);
  return { open, closedIfOpen };
}
const canWrite = (u) => ['owner', 'fleet', 'workshop'].includes(u.role);
const canMeasure = (u) => ['owner', 'fleet', 'workshop', 'driver'].includes(u.role);

export const TIRE_HIST_MAX = 200;
export async function tireOverview(env, user, envName, vehicleId) {
  if (user.role === 'driver') {
    const a = await env.DB.prepare('SELECT 1 FROM driver_vehicles WHERE user_id=? AND vehicle_id=? AND (valid_to IS NULL OR valid_to > ?)').bind(user.id, vehicleId, nowIso()).first();
    if (!a) throw forbidden('Reifendaten nur für zugeordnete Fahrzeuge.');
  }
  const v = await env.DB.prepare('SELECT id, plate, kind, site FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const specs = (await env.DB.prepare('SELECT * FROM tire_specs WHERE vehicle_id=?').bind(vehicleId).all()).results.sort((a, b) => AXLES.indexOf(a.axle) - AXLES.indexOf(b.axle));
  // Verlauf zur Anzeige: die neuesten TIRE_HIST_MAX Ereignisse (eine Zeile mehr gelesen → history_truncated).
  // Der aktuelle Stand je Position (Profil, DOT, Winterkennzeichnung) wird dagegen aus ALLEN Ereignissen bestimmt – vorher nur aus den
  // neuesten 200: Positionen mit älterem letzten Ereignis (z. B. Reserverad, Anhänger) fielen dann aus Akte und Winterstatus heraus,
  // während die Flottenübersicht sie zeigte.
  const [histRows, all] = await Promise.all([
    env.DB.prepare(`SELECT t.*, u.display_name AS recorded_by_name, u.role AS recorded_by_role FROM tire_events t JOIN users u ON u.id=t.recorded_by
    WHERE t.environment=? AND t.vehicle_id=? ORDER BY t.created_at DESC LIMIT ?`).bind(envName, vehicleId, TIRE_HIST_MAX + 1).all(),
    env.DB.prepare(`SELECT position, event_type, tread_mm, dot, winter_mark, created_at FROM tire_events WHERE environment=? AND vehicle_id=? ORDER BY created_at DESC`).bind(envName, vehicleId).all(),
  ]);
  const historyTruncated = histRows.results.length > TIRE_HIST_MAX;
  const history = histRows.results.slice(0, TIRE_HIST_MAX).map((e) => hideDriverName(user, e, 'recorded_by_name', 'recorded_by_role'));
  const allEv = all.results;
  const latest = {};
  for (const e of allEv) {
    const cur = latest[e.position] || {};
    // letzter Messwert je Position; ein Wechsel setzt den Stand zurück
    if (!cur.event) cur.event = e;
    if (cur.tread_mm === undefined && !cur.reset) {
      if (e.tread_mm !== null) { cur.tread_mm = e.tread_mm; cur.tread_at = e.created_at; }
      else if (e.event_type === 'wechsel') cur.reset = true;
    }
    latest[e.position] = cur;
  }
  const sRows = (await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN ('tire_warn_tread_mm','tire_warn_age_years')`).all()).results;
  const setting = (k) => { const r = sRows.find((x) => x.key === k); return r && r.value !== '' ? Number(r.value) : null; };
  const warn = setting('tire_warn_tread_mm'); const ageYears = setting('tire_warn_age_years') > 0 ? setting('tire_warn_age_years') : null;
  const wm = winterMarks(allEv);
  const wo = v.kind === 'anhaenger' ? null : await winterOrders(env, envName, vehicleId);
  const wOrder = wo ? wo.open.get(vehicleId) || null : null;
  const dots = currentDots(allEv); const today = berlinDate();
  const positions = Object.entries(latest).map(([position, x]) => ({
    position, winter_mark: wm.marks[position] ?? null, ...dotAge(dots[position], today, ageYears), last_event: x.event.event_type, last_event_at: x.event.created_at, tread_mm: x.tread_mm ?? null, tread_at: x.tread_at || null,
    status: x.tread_mm === undefined || x.tread_mm === null ? 'unbekannt' : x.tread_mm < LEGAL_MIN_TREAD_MM ? 'unter_minimum' : warn !== null && x.tread_mm < warn ? 'warnung' : 'ok',
  })).sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position));
  return { vehicle: v, specs, positions, allowed_positions: positionsForKind(v.kind), history, history_truncated: historyTruncated, history_max: TIRE_HIST_MAX, legal_min_tread_mm: LEGAL_MIN_TREAD_MM, warn_tread_mm: warn, warn_age_years: ageYears, winter: (() => { const w = winterStatus(v.kind, wm); return { ...w, open_order: wOrder, closed_order: wo ? wo.closedIfOpen(vehicleId, w.status) : null }; })() };
}

export async function addTireEvent(env, user, envName, vehicleId, body) {
  const type = oneOf(body.event_type, TIRE_EVENTS, 'Art');
  if (!(type === 'messung' || type === 'sichtpruefung' ? canMeasure(user) : canWrite(user))) throw forbidden();
  if (user.role === 'driver') {
    const a = await env.DB.prepare('SELECT 1 FROM driver_vehicles WHERE user_id=? AND vehicle_id=? AND (valid_to IS NULL OR valid_to > ?)').bind(user.id, vehicleId, nowIso()).first();
    if (!a) throw forbidden('Nur für zugeordnete Fahrzeuge.');
  }
  const v = await env.DB.prepare('SELECT id, kind FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  const position = oneOf(body.position, POSITIONS, 'Position');
  // Sammel-Erfassung (z. B. Umrüstung auf Winterreifen): gleiche Angaben für weitere Positionen, atomar in einem Batch
  const extra = Array.isArray(body.positions) ? body.positions.map((p) => oneOf(p, POSITIONS, 'Position')) : [];
  const positions = [...new Set([position, ...extra])];
  const allowed = positionsForKind(v.kind);
  const wrong = positions.filter((p) => !allowed.includes(p));
  if (wrong.length) throw bad('validation', v.kind === 'anhaenger' ? 'Position passt nicht zum Anhänger (nur AH-Achsen oder Reserve).' : 'Position passt nicht zum Lkw (Anhängerachsen AH beim Anhänger erfassen).');
  const tread = num(body.tread_mm, { min: 0, max: 30, field: 'Profiltiefe', nullable: true });
  const pressure = num(body.pressure_bar, { min: 0, max: 15, field: 'Luftdruck', nullable: true });
  if (type === 'messung' && tread === null && pressure === null) throw bad('validation', 'Messung braucht Profiltiefe oder Luftdruck.');
  const size = str(body.size, { max: 40 });
  if (type === 'wechsel' && !size) throw bad('validation', 'Beim Reifenwechsel ist die Reifengröße Pflicht.');
  const dot = str(body.dot, { max: 20 });
  if (dot && !dotDate(dot)) throw bad('validation', 'DOT: letzte 4 Ziffern = Woche und Jahr (z. B. 2324).');
  if (dot && dotDate(dot) > berlinDate()) throw bad('validation', 'DOT: Herstellwoche liegt in der Zukunft.');
  const caseId = body.case_id ? str(body.case_id, { max: 40 }) : null;
  if (caseId) {
    const c = await env.DB.prepare('SELECT id FROM cases WHERE id=? AND environment=? AND vehicle_id=?').bind(caseId, envName, vehicleId).first();
    if (!c) throw bad('validation', 'Vorgang passt nicht zu diesem Fahrzeug.');
  }
  const winter = body.winter_mark === undefined || body.winter_mark === null || body.winter_mark === '' ? null : oneOf(body.winter_mark, WINTER_MARKS, 'Winterkennzeichnung');
  const odo = body.odometer_km === undefined || body.odometer_km === null || body.odometer_km === '' ? null : Math.round(num(body.odometer_km, { min: 0, max: 5000000, field: 'Kilometerstand', grouped: true }));
  const now = nowIso();
  const brand = str(body.brand, { max: 60 }); const note = str(body.note, { max: 1000 });
  const ids = positions.map(() => uuid());
  await env.DB.batch(positions.map((pos, i) => env.DB.prepare(`INSERT INTO tire_events(id,environment,vehicle_id,position,event_type,tread_mm,pressure_bar,size,brand,dot,odometer_km,case_id,note,recorded_by,created_at,winter_mark)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(ids[i], envName, vehicleId, pos, type, tread, pressure, size, brand, dot, odo, caseId, note, user.id, now, winter)));
  const id = ids[0];
  const warnings = [];
  if (tread !== null && tread < LEGAL_MIN_TREAD_MM) warnings.push(`Profiltiefe ${tread} mm liegt unter dem gesetzlichen Minimum von ${LEGAL_MIN_TREAD_MM} mm.`);
  return { id, ids, positions, warnings };
}

export async function setTireSpec(env, user, vehicleId, body) {
  if (!canWrite(user)) throw forbidden();
  const axle = oneOf(body.axle, AXLES, 'Achse');
  const size = str(body.size, { required: true, max: 40, field: 'Reifengröße' });
  const verified = body.verified ? 1 : 0;
  // unbekanntes Fahrzeug → 404 (vorher Fremdschlüssel-Fehler = „Interner Fehler“, Fuzz 15.10.2026)
  if (!(await env.DB.prepare('SELECT 1 FROM vehicles WHERE id=?').bind(vehicleId).first())) throw notFound();
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO tire_specs(vehicle_id,axle,size,source,verified,verified_by,verified_at,updated_at) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(vehicle_id,axle) DO UPDATE SET size=excluded.size, source=excluded.source, verified=excluded.verified, verified_by=excluded.verified_by, verified_at=excluded.verified_at, updated_at=excluded.updated_at`)
    .bind(vehicleId, axle, size, str(body.source, { max: 200 }) || (verified ? `am Fahrzeug geprüft (${user.username})` : `manuell (${user.username})`),
      verified, verified ? user.id : null, verified ? now : null, now).run();
  return { ok: true };
}

// Import Quelldatei (CSV: Quelle;Kennzeichen;FIN;Reifen Lenkachse;Reifen Liftachse;Reifen Antriebsachse;Reifen Anhänger)
// Nur FIN-Treffer werden übernommen; bereits geprüfte Werte werden nicht überschrieben.
export async function importTireSpecs(env, user, text, { dryRun = false } = {}) {
  if (user.role !== 'owner') throw forbidden('Nur der Inhaber darf importieren.');
  const lines = parseCsv(text);
  if (lines.length < 2) throw bad('validation', 'CSV leer.');
  const head = lines.shift().map((h) => h.trim().toLowerCase());
  const idx = (n) => head.findIndex((h) => h.startsWith(n));
  const ci = { src: idx('quelle'), fin: idx('fin'), lenk: idx('reifen lenk'), lift: idx('reifen lift'), antr: idx('reifen antrieb'), anh: idx('reifen anh') };
  if (ci.fin < 0) throw bad('validation', 'Spalte FIN fehlt.');
  const ciPlate = idx('kennzeichen');
  // skipped: Zeilennummer, Kennzeichen/FIN und Grund (wie die anderen Import-Vorschauen); skipped_no_vehicle bleibt für bestehende Aufrufer
  const res = { imported: 0, skipped_no_vehicle: [], skipped: [], kept_verified: 0, dry_run: dryRun };
  // Abfragebudget: Fahrzeuge und geprüfte Werte vorab laden, Schreibvorgang als Sammelanweisung
  const byVin = new Map((await env.DB.prepare('SELECT id, vin FROM vehicles').all()).results.map((v) => [v.vin, v.id]));
  const verified = new Set((await env.DB.prepare('SELECT vehicle_id, axle FROM tire_specs WHERE verified=1').all()).results.map((r) => `${r.vehicle_id}|${r.axle}`));
  const rows = new Map();
  for (const c of lines) {
    if (c.every((x) => !String(x || '').trim())) continue; // Leerzeile (z. B. am Dateiende)
    const vin = normalizeVin(c[ci.fin]);
    const vid = byVin.get(vin);
    if (!vid) {
      res.skipped_no_vehicle.push(vin || '(leer)');
      res.skipped.push({ line: c.line, plate: (ciPlate >= 0 && String(c[ciPlate] || '').trim()) || vin || '', reason: vin ? 'FIN nicht im Fahrzeugstamm' : 'FIN ungültig/fehlt' });
      continue;
    }
    for (const [axle, k] of [['lenkachse', 'lenk'], ['liftachse', 'lift'], ['antriebsachse', 'antr'], ['anhaenger', 'anh']]) {
      const size = ci[k] >= 0 ? c[ci[k]] : '';
      if (!size || !/\d/.test(size)) continue;
      if (verified.has(`${vid}|${axle}`)) { res.kept_verified++; continue; }
      rows.set(`${vid}|${axle}`, { v: vid, a: axle, s: size.slice(0, 40), src: `Quelldatei Fuhrpark ${ci.src >= 0 ? c[ci.src] : ''} (ungeprüft)`.trim() });
    }
  }
  const list = [...rows.values()];
  // Vorschau: neu / geändert / unverändert gegenüber vorhandenen (ungeprüften) Größen
  const current = new Map((await env.DB.prepare('SELECT vehicle_id, axle, size FROM tire_specs').all()).results.map((r) => [`${r.vehicle_id}|${r.axle}`, r.size]));
  res.counts = { neu: 0, geaendert: 0, unveraendert: 0 };
  for (const r of list) { const cur = current.get(`${r.v}|${r.a}`); if (cur === undefined) res.counts.neu++; else if (cur !== r.s) res.counts.geaendert++; else res.counts.unveraendert++; }
  if (dryRun) { res.imported = 0; return res; }
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
export async function tireFindings(env, environment, settings = null) {
  // Einstellungen vom Agenten durchgereicht (Abfragebudget), sonst einzeln laden
  const warnRow = settings ? { value: settings.get('tire_warn_tread_mm') ?? null } : await env.DB.prepare(`SELECT value FROM settings WHERE key='tire_warn_tread_mm'`).first();
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

// Flottenübersicht Reifen: je aktivem Fahrzeug schlechtester Status, kleinste Profiltiefe, Alter der ältesten letzten Messung.
// Nur gemessene Werte; ohne Messung = „kein Messwert“ (nie geschätzt).
export async function fleetTires(env, user, envName, query = {}) {
  if (!['owner', 'fleet', 'workshop', 'viewer'].includes(user.role)) throw forbidden();
  const staleDays = intParam(query.stale_days, 90, 1, 3650);
  const sRows = (await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN ('tire_warn_tread_mm','tire_warn_age_years')`).all()).results;
  const setting = (k) => { const r = sRows.find((x) => x.key === k); return r && r.value !== '' ? Number(r.value) : null; };
  const warn = setting('tire_warn_tread_mm'); const ageYears = setting('tire_warn_age_years') > 0 ? setting('tire_warn_age_years') : null; const today = berlinDate();
  const allVehicles = (await env.DB.prepare('SELECT id, plate, kind, site FROM vehicles WHERE active=1 AND eval_excluded=0 ORDER BY plate').all()).results;
  // optional nur ein Standort laut Fahrzeugstamm (Schreibweise egal, 'ohne' = ohne Standort)
  const sel = siteSelection(allVehicles, query.site);
  const vehicles = sel.site !== null ? allVehicles.filter((v) => sel.match(v.site)) : allVehicles;
  // je Fahrzeug+Position letzte Profilmessung (Wechsel ohne Messung setzt den Messwert zurück)
  const ev = (await env.DB.prepare(`SELECT vehicle_id, position, event_type, tread_mm, winter_mark, dot, created_at FROM tire_events WHERE environment=? ORDER BY created_at DESC`).bind(envName).all()).results;
  const latest = new Map();
  for (const e of ev) {
    const k = `${e.vehicle_id}|${e.position}`;
    if (latest.has(k)) continue;
    if (e.tread_mm !== null) latest.set(k, { vehicle_id: e.vehicle_id, position: e.position, tread_mm: e.tread_mm, at: e.created_at });
    else if (e.event_type === 'wechsel') latest.set(k, { vehicle_id: e.vehicle_id, position: e.position, tread_mm: null, at: e.created_at });
  }
  // Winterkennzeichnung je Fahrzeug (gleiche Regel wie Fahrzeugakte)
  const evByV = new Map();
  for (const e of ev) { if (!evByV.has(e.vehicle_id)) evByV.set(e.vehicle_id, []); evByV.get(e.vehicle_id).push(e); }
  const wo = await winterOrders(env, envName);
  const now = Date.now();
  const rank = { unter_minimum: 3, warnung: 2, ok: 1, unbekannt: 0 };
  const rows = vehicles.map((v) => {
    const pos = [...latest.values()].filter((x) => x.vehicle_id === v.id && x.tread_mm !== null);
    let status = 'unbekannt'; let minTread = null; let oldest = null; let below = 0; let warned = 0;
    for (const p of pos) {
      const st = p.tread_mm < LEGAL_MIN_TREAD_MM ? 'unter_minimum' : warn !== null && p.tread_mm < warn ? 'warnung' : 'ok';
      if (st === 'unter_minimum') below++; if (st === 'warnung') warned++;
      if (rank[st] > rank[status]) status = st;
      if (minTread === null || p.tread_mm < minTread) minTread = p.tread_mm;
      if (!oldest || p.at < oldest) oldest = p.at;
    }
    const ageDays = oldest ? Math.floor((now - Date.parse(oldest)) / 86400000) : null;
    const w = winterStatus(v.kind, winterMarks(evByV.get(v.id) || []));
    // Reifenalter laut DOT (nur erfasste DOT-Codes): ältester Reifen, Anzahl über Warnalter
    const ages = Object.values(currentDots(evByV.get(v.id) || [])).filter(Boolean).map((d) => dotAge(d, today, ageYears));
    const oldestDot = ages.reduce((o, a) => (!o || a.dot_date < o.dot_date ? a : o), null);
    return { vehicle_id: v.id, plate: v.plate, kind: v.kind, site: v.site, status, winter: w.status, winter_missing: w.missing, winter_noncompliant: w.noncompliant, winter_order: v.kind === 'anhaenger' ? null : wo.open.get(v.id) || null, winter_closed_order: v.kind === 'anhaenger' ? null : wo.closedIfOpen(v.id, w.status),
      dot_positions: ages.length, oldest_dot_date: oldestDot ? oldestDot.dot_date : null, oldest_dot_months: oldestDot ? oldestDot.age_months : null, age_warn: ages.filter((a) => a.age_warn).length, measured_positions: pos.length, min_tread_mm: minTread, below_min: below, below_warn: warned, oldest_measure_at: oldest, oldest_age_days: ageDays, stale: ageDays === null || ageDays > staleDays };
  }).sort((a, b) => rank[b.status] - rank[a.status] || (a.min_tread_mm ?? 99) - (b.min_tread_mm ?? 99) || String(a.plate).localeCompare(String(b.plate)));
  const count = (f) => rows.filter(f).length;
  return { legal_min_tread_mm: LEGAL_MIN_TREAD_MM, warn_tread_mm: warn, warn_age_years: ageYears, stale_days: staleDays, site: sel.site, site_options: sel.options, rows,
    totals: { vehicles: rows.length, below_min: count((r) => r.status === 'unter_minimum'), warn: count((r) => r.status === 'warnung'), never_measured: count((r) => r.measured_positions === 0), stale: count((r) => r.stale && r.measured_positions > 0),
      winter_noncompliant: count((r) => r.winter === 'nicht_erfuellt'), winter_unknown: count((r) => r.winter === 'unbekannt'), winter_ok: count((r) => r.winter === 'erfuellt'), age_warn: count((r) => r.age_warn > 0) } };
}

// Winterreifen-Lage je Lkw (Disposition-Startseite): nur Erfasstes, gleiche Regel wie Fahrzeugakte; Anhänger nicht betroffen.
// Reine Information – situative Pflicht (StVO § 2 Abs. 3a), keine Sperre. Keine Personen, keine Messwerte.
export async function winterFleet(env, user, envName, query = {}) {
  if (!['owner', 'fleet', 'workshop', 'viewer', 'dispatch'].includes(user.role)) throw forbidden();
  const all = (await env.DB.prepare(`SELECT id, plate, kind, site FROM vehicles WHERE active=1 AND eval_excluded=0 ORDER BY plate`).all()).results;
  const sel = siteSelection(all, query.site);
  const trucks = all.filter((v) => v.kind !== 'anhaenger' && sel.match(v.site));
  const ev = (await env.DB.prepare('SELECT vehicle_id, position, event_type, winter_mark FROM tire_events WHERE environment=? ORDER BY created_at DESC').bind(envName).all()).results;
  const wo = await winterOrders(env, envName);
  const byV = new Map();
  for (const e of ev) { if (!byV.has(e.vehicle_id)) byV.set(e.vehicle_id, []); byV.get(e.vehicle_id).push(e); }
  const rows = trucks.map((v) => { const w = winterStatus(v.kind, winterMarks(byV.get(v.id) || [])); return { vehicle_id: v.id, plate: v.plate, site: v.site, status: w.status, noncompliant: w.noncompliant, missing: w.missing, open_order: wo.open.get(v.id) || null, closed_order: wo.closedIfOpen(v.id, w.status) }; });
  const count = (s) => rows.filter((r) => r.status === s).length;
  return { site: sel.site, totals: { vehicles: rows.length, nicht_erfuellt: count('nicht_erfuellt'), unbekannt: count('unbekannt'), erfuellt: count('erfuellt') },
    noncompliant: rows.filter((r) => r.status === 'nicht_erfuellt') };
}

// Reifen-Übersicht als CSV (Excel DE): je Fahrzeug Status aus gemessenen Werten und hinterlegte Reifengrößen je Achse
// (z. B. für den Reifendienst). Größen „ungeprüft“ = Quellwert, nicht am Fahrzeug bestätigt. Spalten „Größe …“ statt „Reifen …“:
// die Datei ist eine Auswertung und soll nicht versehentlich den Reifengrößen-Import (Quelldatei) überschreiben.
const WS_DE = { erfuellt: 'erfüllt', nicht_erfuellt: 'nicht erfüllt', unbekannt: 'nicht vollständig erfasst', nicht_pflichtig: 'nicht betroffen (Anhänger)' };
const TS_DE = { unter_minimum: 'unter gesetzlichem Minimum', warnung: 'unter Warnschwelle', ok: 'in Ordnung', unbekannt: 'kein Messwert' };
export async function fleetTiresCsv(env, ov, csvCell) {
  const specs = (await env.DB.prepare('SELECT vehicle_id, axle, size, verified FROM tire_specs WHERE vehicle_id IN (SELECT value FROM json_each(?))')
    .bind(JSON.stringify(ov.rows.map((r) => r.vehicle_id))).all()).results;
  const byV = new Map();
  for (const s of specs) { if (!byV.has(s.vehicle_id)) byV.set(s.vehicle_id, {}); byV.get(s.vehicle_id)[s.axle] = s; }
  const mm = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const head = ['Kennzeichen', 'Fahrzeugart', 'Standort', 'Status', 'Kleinste Profiltiefe (mm)', 'Gemessene Positionen', `Unter ${mm(ov.legal_min_tread_mm)} mm`, 'Unter Warnschwelle',
    'Älteste letzte Messung', 'Alter (Tage)', `Messung älter als ${ov.stale_days} ${ov.stale_days === 1 ? 'Tag' : 'Tage'}`, ...AXLES.map((a) => `Größe ${AXLE_DE[a]}`), 'Größen geprüft', 'Winterreifen (Alpine-Symbol)', 'Winter: Positionen ohne Alpine-Symbol', 'Winter: Positionen nicht erfasst', 'Winter: offener Werkstattauftrag', 'Ältester Reifen (Herstellwoche laut DOT)', 'Ältester Reifen (Monate)', 'Reifen über Warnalter', 'Winter: Auftrag abgeschlossen, Lage offen'];
  const lines = [head.join(';')];
  for (const r of ov.rows) {
    const sp = byV.get(r.vehicle_id) || {};
    const list = Object.values(sp);
    const checked = !list.length ? '' : list.every((s) => s.verified) ? 'ja' : list.some((s) => s.verified) ? 'teilweise' : 'nein (Quellwerte)';
    lines.push([csvCell(r.plate), r.kind === 'anhaenger' ? 'Anhänger' : 'Lkw', csvCell(r.site), TS_DE[r.status], mm(r.min_tread_mm), r.measured_positions, r.below_min, r.below_warn,
      r.oldest_measure_at ? berlinDate(r.oldest_measure_at) : '', r.oldest_age_days ?? '', r.measured_positions ? (r.stale ? 'ja' : 'nein') : '',
      ...AXLES.map((a) => (sp[a] ? csvCell(sp[a].size) : '')), checked, WS_DE[r.winter], (r.winter_noncompliant || []).join(' '), (r.winter_missing || []).join(' '), r.winter_order ? r.winter_order.case_no : '', r.oldest_dot_date || '', r.oldest_dot_months ?? '', ov.warn_age_years === null ? '' : r.age_warn, r.winter_closed_order ? r.winter_closed_order.case_no : ''].join(';'));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}
const AXLE_DE = { lenkachse: 'Lenkachse', liftachse: 'Liftachse', antriebsachse: 'Antriebsachse', anhaenger: 'Anhänger' };
