// [CLAUDE] Reifenmanagement: Größen je Achse (mit Prüfstatus), Messungen/Wechsel je Position, Grenzwerte
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, num, oneOf, flag, normalizeVin, parseCsv, hideDriverName, berlinDate, intParam, berlinWindowStartIso , commaDec, pointDec } from './util.js';
import { audit } from './auth.js';
import { siteSelection } from './reports.js';

export const AXLES = ['lenkachse', 'liftachse', 'antriebsachse', 'anhaenger'];
// Achse passt zur Fahrzeugart (Anhänger nur „anhaenger“) – nach Artwechsel Lkw → Anhänger bleiben alte Lkw-Achsgrößen gespeichert, gelten aber nicht (21.10.2026)
export const axleFits = (kind, axle) => kind !== 'anhaenger' || axle === 'anhaenger';
export const POSITIONS = ['VA-L', 'VA-R', 'LA-L', 'LA-R', 'HA-L-aussen', 'HA-L-innen', 'HA-R-innen', 'HA-R-aussen',
  'AH1-L', 'AH1-R', 'AH2-L', 'AH2-R', 'AH3-L', 'AH3-R', 'Reserve'];
// Positionen je Fahrzeugart: Lkw ohne Anhängerachsen, Anhänger nur AH-Achsen; Reserve bei beiden (Achszahl bleibt offen, Stammdaten geben sie nicht her)
export function positionsForKind(kind) {
  return kind === 'anhaenger' ? POSITIONS.filter((p) => p.startsWith('AH') || p === 'Reserve') : POSITIONS.filter((p) => !p.startsWith('AH'));
}
export const TIRE_EVENTS = ['messung', 'wechsel', 'reparatur', 'sichtpruefung'];
// Gesetzliche Mindestprofiltiefe in Deutschland (StVZO § 36) für Lkw-Reifen: 1,6 mm
export const LEGAL_MIN_TREAD_MM = 1.6;
// Status eines Profil-Messwerts je Position. Reserverad: das gesetzliche Minimum gilt für montierte Reifen (§ 36 StVZO) –
// ein abgefahrenes Reserverad ist kein Fahrverbot, darf aber nicht montiert werden → eigener Status (wie „Warnung“), kein kritischer Befund (19.10.2026).
export const SPARE_POSITION = 'Reserve';
export function treadStatus(position, tread, warn) {
  if (tread === undefined || tread === null) return 'unbekannt';
  if (tread < LEGAL_MIN_TREAD_MM) return position === SPARE_POSITION ? 'reserve_unter_minimum' : 'unter_minimum';
  return warn !== null && warn !== undefined && tread < warn ? 'warnung' : 'ok';
}
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
  const since = berlinWindowStartIso(WINTER_CLOSED_DAYS); // 60 Berliner Kalendertage einschließlich heute (19.10.2026; vorher 24-h-Blöcke)
  const r = (await env.DB.prepare(`SELECT vehicle_id, id, case_no, status, closed_at FROM cases WHERE environment=? AND tire_order='winter'
    AND (status NOT IN ('fahrzeug_freigegeben','abgelehnt') OR (status='fahrzeug_freigegeben' AND closed_at >= ?))${vehicleId ? ' AND vehicle_id=?' : ''} ORDER BY closed_at DESC`)
    .bind(...(vehicleId ? [envName, since, vehicleId] : [envName, since])).all()).results;
  const open = new Map(); const closed = new Map();
  for (const x of r) {
    if (x.status !== 'fahrzeug_freigegeben') open.set(x.vehicle_id, { id: x.id, case_no: x.case_no });
    else if (!closed.has(x.vehicle_id)) closed.set(x.vehicle_id, { id: x.id, case_no: x.case_no, closed_at: x.closed_at });
  }
  // Hinweis nur bei offener Lage ohne neuen Auftrag
  // events/kind (optional; Ereignisse des Fahrzeugs mit created_at, neueste zuerst): war die Winterlage beim Abschluss oder danach schon
  // einmal erfüllt (z. B. später wieder Sommerreifen montiert), war der Auftrag erledigt – die neue offene Lage gehört nicht mehr zu ihm,
  // der alte Auftrag wird nicht genannt (19.10.2026; vorher „Auftrag abgeschlossen, Lage offen“ mit dem alten, erfüllten Auftrag)
  const closedIfOpen = (vid, status, events = null, kind = null) => {
    const c = ['nicht_erfuellt', 'unbekannt'].includes(status) && !open.has(vid) ? closed.get(vid) || null : null;
    if (c && events && kind) {
      const times = [c.closed_at, ...events.filter((e) => e.created_at > c.closed_at).map((e) => e.created_at)];
      if (times.some((t) => winterStatus(kind, winterMarks(events.filter((e) => e.created_at <= t))).status === 'erfuellt')) return null;
    }
    return c;
  };
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
  const v = await env.DB.prepare('SELECT id, plate, kind, site, active FROM vehicles WHERE id=?').bind(vehicleId).first(); // active: Formulare ausblenden (20.10.2026)
  if (!v) throw notFound();
  const specs = (await env.DB.prepare('SELECT * FROM tire_specs WHERE vehicle_id=?').bind(vehicleId).all()).results.filter((x) => axleFits(v.kind, x.axle)).sort((a, b) => AXLES.indexOf(a.axle) - AXLES.indexOf(b.axle));
  // Verlauf zur Anzeige: die neuesten TIRE_HIST_MAX Ereignisse (eine Zeile mehr gelesen → history_truncated).
  // Der aktuelle Stand je Position (Profil, DOT, Winterkennzeichnung) wird dagegen aus ALLEN Ereignissen bestimmt – vorher nur aus den
  // neuesten 200: Positionen mit älterem letzten Ereignis (z. B. Reserverad, Anhänger) fielen dann aus Akte und Winterstatus heraus,
  // während die Flottenübersicht sie zeigte.
  const [histRows, all] = await Promise.all([
    env.DB.prepare(`SELECT t.*, u.display_name AS recorded_by_name, CASE WHEN u.role='driver' OR u.was_driver=1 THEN 'driver' ELSE u.role END AS recorded_by_role FROM tire_events t JOIN users u ON u.id=t.recorded_by
    WHERE t.environment=? AND t.vehicle_id=? ORDER BY t.created_at DESC LIMIT ?`).bind(envName, vehicleId, TIRE_HIST_MAX + 1).all(),
    env.DB.prepare(`SELECT position, event_type, tread_mm, dot, winter_mark, created_at FROM tire_events WHERE environment=? AND vehicle_id=? ORDER BY created_at DESC`).bind(envName, vehicleId).all(),
  ]);
  const historyTruncated = histRows.results.length > TIRE_HIST_MAX;
  // Fahrer sehen Namen anderer Fahrer nicht (wie im Vorgang; vorher z. B. Vorgänger am Fahrzeug sichtbar, 17.10.2026) – nur den eigenen
  const history = histRows.results.slice(0, TIRE_HIST_MAX).map((e) => {
    const otherDriver = user.role === 'driver' && e.recorded_by_role === 'driver' && e.recorded_by !== user.id;
    hideDriverName(user, e, 'recorded_by_name', 'recorded_by_role');
    if (user.role === 'driver' && e.recorded_by !== user.id) delete e.recorded_by;
    if (otherDriver) { e.recorded_by_name = null; e.recorded_by_name_hidden = true; }
    return e;
  });
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
  // nur Positionen, die zur heutigen Fahrzeugart passen (21.10.2026: nach Artwechsel Lkw ↔ Anhänger blieb ein Altwert „unter Minimum“ stehen, der sich
  // nicht mehr erfassen/klären ließ); die Ereignisse bleiben im Verlauf
  const allowed = positionsForKind(v.kind);
  const positions = Object.entries(latest).filter(([position]) => allowed.includes(position)).map(([position, x]) => ({
    position, winter_mark: wm.marks[position] ?? null, ...dotAge(dots[position], today, ageYears), last_event: x.event.event_type, last_event_at: x.event.created_at, tread_mm: x.tread_mm ?? null, tread_at: x.tread_at || null,
    status: treadStatus(position, x.tread_mm, warn),
  })).sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position));
  return { vehicle: v, specs, positions, allowed_positions: positionsForKind(v.kind), history, history_truncated: historyTruncated, history_max: TIRE_HIST_MAX, legal_min_tread_mm: LEGAL_MIN_TREAD_MM, warn_tread_mm: warn, warn_age_years: ageYears, winter: (() => { const w = winterStatus(v.kind, wm); return { ...w, open_order: wOrder, closed_order: wo ? wo.closedIfOpen(vehicleId, w.status, allEv, v.kind) : null }; })() };
}

export async function addTireEvent(env, user, envName, vehicleId, body) {
  const type = oneOf(body.event_type, TIRE_EVENTS, 'Art');
  if (!(type === 'messung' || type === 'sichtpruefung' ? canMeasure(user) : canWrite(user))) throw forbidden();
  if (user.role === 'driver') {
    const a = await env.DB.prepare('SELECT 1 FROM driver_vehicles WHERE user_id=? AND vehicle_id=? AND (valid_to IS NULL OR valid_to > ?)').bind(user.id, vehicleId, nowIso()).first();
    if (!a) throw forbidden('Nur für zugeordnete Fahrzeuge.');
  }
  const v = await env.DB.prepare('SELECT id, kind, active FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound();
  if (!v.active) throw bad('validation', 'Fahrzeug ist außer Betrieb.'); // wie Kontrolle/Meldung (17.10.2026)
  const position = oneOf(body.position, POSITIONS, 'Position');
  // Sammel-Erfassung (z. B. Umrüstung auf Winterreifen): gleiche Angaben für weitere Positionen, atomar in einem Batch
  // `positions` als Text o. Ä. wurde still ignoriert (18.10.2026: nur die erste Position erfasst) – nur Liste oder nichts
  if (body.positions != null && !Array.isArray(body.positions)) throw bad('tire_positions_list', 'Weitere Positionen bitte als Liste angeben.');
  const extra = Array.isArray(body.positions) ? body.positions.map((p) => oneOf(p, POSITIONS, 'Position')) : [];
  const positions = [...new Set([position, ...extra])];
  const allowed = positionsForKind(v.kind);
  const wrong = positions.filter((p) => !allowed.includes(p));
  if (wrong.length) throw bad('validation', v.kind === 'anhaenger' ? 'Position passt nicht zum Anhänger (nur AH-Achsen oder Reserve).' : 'Position passt nicht zum Lkw (Anhängerachsen AH beim Anhänger erfassen).');
  const tread0 = num(body.tread_mm, { min: 0, max: 30, field: 'Profiltiefe', nullable: true, decimalComma: commaDec(user), decimalPoint: pointDec(user) });
  // auf 3 Nachkommastellen wie die Anzeige – sonst „1,6 mm liegt unter dem Minimum von 1,6 mm“ bei 1,5996 (18.10.2026)
  const tread = tread0 === null ? null : Math.round(tread0 * 1000) / 1000;
  const pressure = num(body.pressure_bar, { min: 0, max: 15, field: 'Luftdruck', nullable: true, decimalComma: commaDec(user), decimalPoint: pointDec(user) });
  if (type === 'messung' && tread === null && pressure === null) throw bad('validation', 'Messung braucht Profiltiefe oder Luftdruck.');
  const size = str(body.size, { max: 40, field: 'Reifengröße' });
  if (type === 'wechsel' && !size) throw bad('validation', 'Beim Reifenwechsel ist die Reifengröße Pflicht.');
  if (size && !/\d/.test(size)) throw bad('validation', 'Reifengröße unplausibel (z. B. 315/80 R22.5).');
  const dot = str(body.dot, { max: 20, field: 'DOT' });
  if (dot && !dotDate(dot)) throw bad('validation', 'DOT: letzte 4 Ziffern = Woche und Jahr (z. B. 2324).');
  if (dot && dotDate(dot) > berlinDate()) throw bad('validation', 'DOT: Herstellwoche liegt in der Zukunft.');
  const caseId = body.case_id ? str(body.case_id, { max: 40, field: 'Vorgang' }) : null;
  if (caseId) {
    const c = await env.DB.prepare('SELECT id FROM cases WHERE id=? AND environment=? AND vehicle_id=?').bind(caseId, envName, vehicleId).first();
    if (!c) throw bad('validation', 'Vorgang passt nicht zu diesem Fahrzeug.');
  }
  const winter = body.winter_mark === undefined || body.winter_mark === null || body.winter_mark === '' ? null : oneOf(body.winter_mark, WINTER_MARKS, 'Winterkennzeichnung');
  const odo = body.odometer_km === undefined || body.odometer_km === null || body.odometer_km === '' ? null : Math.round(num(body.odometer_km, { min: 0, max: 5000000, field: 'Kilometerstand', grouped: true }));
  const now = nowIso();
  const brand = str(body.brand, { max: 60, field: 'Marke' }); const note = str(body.note, { max: 1000, field: 'Bemerkung' });
  // Wiederholung mit gleichem request_key (Netzabbruch, erneutes Absenden): keine doppelten Ereignisse, Antwort duplicate (19.10.2026, Migration 0064)
  const rk = str(body.request_key, { max: 80, field: 'request_key' }) || null;
  const known = async () => (rk ? (await env.DB.prepare('SELECT id, position, tread_mm FROM tire_events WHERE vehicle_id=? AND request_key=? AND recorded_by=? AND environment=? ORDER BY created_at, rowid').bind(vehicleId, rk, user.id, envName).all()).results : []);
  { const k = await known(); if (k.length) return { id: k[0].id, ids: k.map((x) => x.id), positions: k.map((x) => x.position), duplicate: true, ...warnOf(k[0].tread_mm, k.map((x) => x.position)) }; }
  const ids = positions.map(() => uuid());
  const res = await env.DB.batch(positions.map((pos, i) => env.DB.prepare(`INSERT INTO tire_events(id,environment,vehicle_id,position,event_type,tread_mm,pressure_bar,size,brand,dot,odometer_km,case_id,note,recorded_by,created_at,winter_mark,request_key)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING`).bind(ids[i], envName, vehicleId, pos, type, tread, pressure, size, brand, dot, odo, caseId, note, user.id, now, winter, rk)));
  if (rk && res.every((r) => !(r.meta && r.meta.changes))) { const k = await known();
    if (!k.length) throw conflict('request_key_reused', 'Dieser Buchungsschlüssel wurde bereits für eine andere Buchung verwendet.'); // fremde Kennung (andere Person/Umgebung)
    return { id: k[0].id, ids: k.map((x) => x.id), positions: k.map((x) => x.position), duplicate: true, ...warnOf(k[0].tread_mm, k.map((x) => x.position)) }; }
  return { id: ids[0], ids, positions, ...warnOf(tread, positions) };
}
// Warnungen zur Profiltiefe – auch bei der Wiederholung mit gleichem request_key aus den gespeicherten Einträgen (21.10.2026: Antwort ging verloren,
// erneutes Senden zeigte nur „✓“ ohne „unter Minimum“)
function warnOf(tread, positions) {
  const warnings = []; const warningItems = [];
  if (tread !== null && tread !== undefined && tread < LEGAL_MIN_TREAD_MM && positions.includes(SPARE_POSITION)) {
    warnings.push(`Reserverad: Profiltiefe ${tread} mm unter ${LEGAL_MIN_TREAD_MM} mm – nicht montieren, Reserverad ersetzen.`);
    warningItems.push({ code: 'spare_below_min', tread_mm: tread, min_mm: LEGAL_MIN_TREAD_MM });
  }
  if (tread !== null && tread !== undefined && tread < LEGAL_MIN_TREAD_MM && positions.some((p) => p !== SPARE_POSITION)) {
    warnings.push(`Profiltiefe ${tread} mm liegt unter dem gesetzlichen Minimum von ${LEGAL_MIN_TREAD_MM} mm.`);
    warningItems.push({ code: 'tread_below_min', tread_mm: tread, min_mm: LEGAL_MIN_TREAD_MM }); // App zeigt den Text in der Oberflächensprache
  }
  return { warnings, warning_items: warningItems };
}

export async function setTireSpec(env, user, vehicleId, body) {
  if (!canWrite(user)) throw forbidden();
  const axle = oneOf(body.axle, AXLES, 'Achse');
  const size = str(body.size, { required: true, max: 40, field: 'Reifengröße' });
  if (!/\d/.test(size)) throw bad('validation', 'Reifengröße unplausibel (z. B. 315/80 R22.5).'); // wie der Import (20.10.2026)
  const verified = flag(body.verified, 'Geprüft') ? 1 : 0;
  // unbekanntes Fahrzeug → 404 (vorher Fremdschlüssel-Fehler = „Interner Fehler“, Fuzz 15.10.2026)
  const veh = await env.DB.prepare('SELECT kind FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!veh) throw notFound();
  // wie der Import: Lenk-/Lift-/Antriebsachse passt nicht zu einem Anhänger (21.10.2026: Einzelerfassung nahm sie „geprüft“ an)
  if (veh.kind === 'anhaenger' && axle !== 'anhaenger') throw bad('validation', 'Achse passt nicht zum Anhänger.');
  const now = nowIso();
  // Ein am Fahrzeug geprüfter Wert wird nur durch eine neue Prüfung ersetzt (wie beim Import); jede Änderung im Protokoll (17.10.2026)
  const prev = await env.DB.prepare('SELECT size, verified FROM tire_specs WHERE vehicle_id=? AND axle=?').bind(vehicleId, axle).first();
  if (prev && prev.verified && !verified && prev.size !== size) throw conflict('spec_verified', 'Die Reifengröße dieser Achse ist am Fahrzeug geprüft – nur mit neuer Prüfung am Fahrzeug änderbar.');
  if (prev && prev.size === size && (!verified || prev.verified)) return { ok: true, unchanged: true };
  const r = await env.DB.prepare(`INSERT INTO tire_specs(vehicle_id,axle,size,source,verified,verified_by,verified_at,updated_at) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(vehicle_id,axle) DO UPDATE SET size=excluded.size, source=excluded.source, verified=excluded.verified, verified_by=excluded.verified_by, verified_at=excluded.verified_at, updated_at=excluded.updated_at
    WHERE excluded.verified=1 OR tire_specs.verified=0`)
    .bind(vehicleId, axle, size, str(body.source, { max: 200, field: 'Quelle' }) || (verified ? `am Fahrzeug geprüft (${user.username})` : `manuell (${user.username})`),
      verified, verified ? user.id : null, verified ? now : null, now).run();
  if (!r.meta || r.meta.changes !== 1) throw conflict('spec_verified', 'Die Reifengröße dieser Achse ist am Fahrzeug geprüft – nur mit neuer Prüfung am Fahrzeug änderbar.');
  await audit(env, user.id, 'tires.spec', vehicleId, { axle, from: prev ? prev.size : null, to: size, verified: !!verified });
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
  // FIN: genauer Name zuerst, sonst Wortanfang ohne Anhänger-/Auflieger-/Finanz-Spalten (21.10.2026: „FIN Anhänger“ vor „FIN“ ordnete die
  // Lkw-Größen dem Anhänger zu, „Finanzierung“ vor „FIN“ ließ alle Zeilen scheitern) – wie der Fahrzeugimport
  const finIdx = (() => { const ex = head.findIndex((h) => ['fin', 'fin (vin)', 'vin', 'fahrgestellnummer'].includes(h)); return ex >= 0 ? ex : head.findIndex((h) => h.startsWith('fin') && !/anh|aufl|trailer|finanz/.test(h)); })();
  const ci = { src: idx('quelle'), fin: finIdx, lenk: idx('reifen lenk'), lift: idx('reifen lift'), antr: idx('reifen antrieb'), anh: idx('reifen anh') };
  if (ci.fin < 0) throw bad('validation', 'Spalte FIN fehlt.');
  const ciPlate = idx('kennzeichen');
  // skipped: Zeilennummer, Kennzeichen/FIN und Grund (wie die anderen Import-Vorschauen); skipped_no_vehicle bleibt für bestehende Aufrufer
  const res = { imported: 0, skipped_no_vehicle: [], skipped: [], kept_verified: 0, dry_run: dryRun };
  // Abfragebudget: Fahrzeuge und geprüfte Werte vorab laden, Schreibvorgang als Sammelanweisung
  const vRows = (await env.DB.prepare('SELECT id, vin, kind FROM vehicles').all()).results;
  const byVin = new Map(vRows.map((v) => [v.vin, v.id])); const kindOf = new Map(vRows.map((v) => [v.id, v.kind]));
  const verified = new Set((await env.DB.prepare('SELECT vehicle_id, axle FROM tire_specs WHERE verified=1').all()).results.map((r) => `${r.vehicle_id}|${r.axle}`));
  const rows = new Map(); const keptVerified = new Set(); // geprüft beibehalten je Fahrzeug/Achse, nicht je Dateizeile (18.10.2026)
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
      // Lenk-/Lift-/Antriebsachse an einem Anhänger: passt nicht zur Fahrzeugart → melden statt speichern (21.10.2026)
      if (kindOf.get(vid) === 'anhaenger' && axle !== 'anhaenger') { res.skipped.push({ line: c.line, plate: (ciPlate >= 0 && String(c[ciPlate] || '').trim()) || vin || '', reason: 'Achse passt nicht zum Anhänger' }); continue; }
      if (verified.has(`${vid}|${axle}`)) { keptVerified.add(`${vid}|${axle}`); res.kept_verified = keptVerified.size; continue; }
      // zu lange Größe: Zeile melden statt still kürzen (17.10.2026; Einzelerfassung weist sie ebenfalls ab)
      if (size.trim().length > 40) { res.skipped.push({ line: c.line, plate: (ciPlate >= 0 && String(c[ciPlate] || '').trim()) || vin || '', reason: `Reifengröße zu lang (max. 40 Zeichen): ${size.trim().slice(0, 60)}` }); continue; }
      // dieselbe FIN/Achse in der Datei mit anderer Größe: spätere Zeile melden statt still überschreiben (18.10.2026)
      const prevRow = rows.get(`${vid}|${axle}`);
      if (prevRow && prevRow.s !== size.trim()) { res.skipped.push({ line: c.line, plate: (ciPlate >= 0 && String(c[ciPlate] || '').trim()) || vin || '', reason: `FIN doppelt in der Datei mit abweichender Größe (Zeile ${prevRow.line}): ${size.trim().slice(0, 40)}` }); continue; }
      if (prevRow) continue;
      rows.set(`${vid}|${axle}`, { line: c.line, v: vid, a: axle, s: size.trim(), src: ['Quelldatei Fuhrpark', ci.src >= 0 ? String(c[ci.src] ?? '').trim() : '', '(ungeprüft)'].filter(Boolean).join(' ') }); // kurze Zeile: nie „undefined“
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
  res.imported = res.counts.neu + res.counts.geaendert; // wie die Vorschau (20.10.2026: „✓ 4“ bei „neu 0 · geändert 1 · unverändert 3“)
  await audit(env, user.id, 'tires.import', null, { imported: res.imported });
  return res;
}

// Für den Fuhrparkagenten: letzte Profilmessung je Position unter Grenzwert
export async function tireFindings(env, environment, settings = null) {
  // Einstellungen vom Agenten durchgereicht (Abfragebudget), sonst einzeln laden
  const warnRow = settings ? { value: settings.get('tire_warn_tread_mm') ?? null } : await env.DB.prepare(`SELECT value FROM settings WHERE key='tire_warn_tread_mm'`).first();
  const warn = warnRow && warnRow.value !== '' ? Number(warnRow.value) : null;
  // Gleiche Regel wie Fahrzeugakte/Flottenübersicht: letzter MESSWERT je Position (Sichtprüfung/Luftdruck ohne Profil verdrängt ihn nicht;
  // ein Wechsel ohne Messung setzt ihn zurück). Vorher zählte nur das neueste Ereignis – eine Sichtprüfung nach 1,2 mm ließ den
  // kritischen Befund verschwinden, während Akte und Übersicht „unter Minimum“ zeigten (17.10.2026). Nur aktive Fahrzeuge wie die Übersicht.
  const rows = (await env.DB.prepare(`SELECT x.vehicle_id, x.position, x.tread_mm, x.created_at, v.plate, v.kind FROM (
      SELECT t.vehicle_id, t.position, t.tread_mm, t.created_at, ROW_NUMBER() OVER (PARTITION BY t.vehicle_id, t.position ORDER BY t.created_at DESC, t.id DESC) AS rn
      FROM tire_events t WHERE t.environment=? AND (t.tread_mm IS NOT NULL OR t.event_type='wechsel')) x
    JOIN vehicles v ON v.id=x.vehicle_id WHERE x.rn=1 AND v.active=1 AND v.eval_excluded=0`) // ruhende Fahrzeuge aus allen Bewertungen ausgenommen (Entscheidung 10.10.2026), wie die Flottenübersicht
    .bind(environment).all()).results;
  const out = [];
  for (const { kind, ...r } of rows) {
    if (r.tread_mm === null || !positionsForKind(kind).includes(r.position)) continue; // Position passt nicht (mehr) zur Fahrzeugart (21.10.2026)
    if (r.tread_mm < LEGAL_MIN_TREAD_MM) out.push({ severity: r.position === SPARE_POSITION ? 'handeln' : 'kritisch', spare: r.position === SPARE_POSITION, ...r, limit: LEGAL_MIN_TREAD_MM });
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
  const rank = { unter_minimum: 3, warnung: 2, reserve_unter_minimum: 2, ok: 1, unbekannt: 0 };
  const rows = vehicles.map((v) => {
    const allowed = positionsForKind(v.kind); // wie Fahrzeugakte/Agent: nur zur Fahrzeugart passende Positionen (21.10.2026)
    const pos = [...latest.values()].filter((x) => x.vehicle_id === v.id && x.tread_mm !== null && allowed.includes(x.position));
    let status = 'unbekannt'; let minTread = null; let oldest = null; let below = 0; let warned = 0; let spareBelow = 0;
    for (const p of pos) {
      const st = treadStatus(p.position, p.tread_mm, warn);
      if (st === 'unter_minimum') below++; if (st === 'warnung') warned++; if (st === 'reserve_unter_minimum') spareBelow++;
      // Fahrzeugstatus: abgefahrenes Reserverad zählt wie „Warnung“ (Fahrzeug fahrbereit, Reserverad ersetzen)
      const vst = st === 'reserve_unter_minimum' ? 'warnung' : st;
      if (rank[vst] > rank[status]) status = vst;
      // kleinste Profiltiefe der montierten Reifen (Reserverad nur, wenn sonst nichts gemessen ist)
      if (p.position !== SPARE_POSITION && (minTread === null || p.tread_mm < minTread)) minTread = p.tread_mm;
      if (!oldest || p.at < oldest) oldest = p.at;
    }
    if (minTread === null) for (const p of pos) if (minTread === null || p.tread_mm < minTread) minTread = p.tread_mm;
    const ageDays = oldest ? Math.round((Date.parse(today) - Date.parse(berlinDate(new Date(oldest)))) / 86400000) : null; // Berliner Kalendertage (18.10.2026: vorher 24-h-Blöcke – Messung 23:59 galt einen Tag jünger)
    const w = winterStatus(v.kind, winterMarks(evByV.get(v.id) || []));
    // Reifenalter laut DOT (nur erfasste DOT-Codes): ältester Reifen, Anzahl über Warnalter
    // nur passende Positionen (nach Artwechsel Lkw → Anhänger zählte ein DOT der Lenkachse weiter, Akte zeigte ihn nicht; 21.10.2026)
    const ages = Object.entries(currentDots(evByV.get(v.id) || [])).filter(([p, d]) => d && allowed.includes(p)).map(([, d]) => dotAge(d, today, ageYears));
    const oldestDot = ages.reduce((o, a) => (!o || a.dot_date < o.dot_date ? a : o), null);
    return { vehicle_id: v.id, plate: v.plate, kind: v.kind, site: v.site, status, winter: w.status, winter_missing: w.missing, winter_noncompliant: w.noncompliant, winter_order: v.kind === 'anhaenger' ? null : wo.open.get(v.id) || null, winter_closed_order: v.kind === 'anhaenger' ? null : wo.closedIfOpen(v.id, w.status, evByV.get(v.id) || [], v.kind),
      dot_positions: ages.length, oldest_dot_date: oldestDot ? oldestDot.dot_date : null, oldest_dot_months: oldestDot ? oldestDot.age_months : null, age_warn: ages.filter((a) => a.age_warn).length, measured_positions: pos.length, min_tread_mm: minTread, below_min: below, below_warn: warned, spare_below_min: spareBelow, oldest_measure_at: oldest, oldest_age_days: ageDays, stale: ageDays === null || ageDays > staleDays };
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
  const ev = (await env.DB.prepare('SELECT vehicle_id, position, event_type, winter_mark, created_at FROM tire_events WHERE environment=? ORDER BY created_at DESC').bind(envName).all()).results;
  const wo = await winterOrders(env, envName);
  const byV = new Map();
  for (const e of ev) { if (!byV.has(e.vehicle_id)) byV.set(e.vehicle_id, []); byV.get(e.vehicle_id).push(e); }
  const rows = trucks.map((v) => { const w = winterStatus(v.kind, winterMarks(byV.get(v.id) || [])); return { vehicle_id: v.id, plate: v.plate, site: v.site, status: w.status, noncompliant: w.noncompliant, missing: w.missing, open_order: wo.open.get(v.id) || null, closed_order: wo.closedIfOpen(v.id, w.status, byV.get(v.id) || [], v.kind) }; });
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
    'Älteste letzte Messung', 'Alter (Tage)', `Messung älter als ${ov.stale_days} ${ov.stale_days === 1 ? 'Tag' : 'Tage'}`, ...AXLES.map((a) => `Größe ${AXLE_DE[a]}`), 'Größen geprüft', 'Winterreifen (Alpine-Symbol)', 'Winter: Positionen ohne Alpine-Symbol', 'Winter: Positionen nicht erfasst', 'Winter: offener Werkstattauftrag', 'Ältester Reifen (Herstellwoche laut DOT)', 'Ältester Reifen (Monate)', 'Reifen über Warnalter', 'Winter: Auftrag abgeschlossen, Lage offen', `Reserverad unter ${mm(ov.legal_min_tread_mm)} mm`];
  const lines = [head.join(';')];
  for (const r of ov.rows) {
    const sp = Object.fromEntries(Object.entries(byV.get(r.vehicle_id) || {}).filter(([a]) => axleFits(r.kind, a)));
    const list = Object.values(sp);
    const checked = !list.length ? '' : list.every((s) => s.verified) ? 'ja' : list.some((s) => s.verified) ? 'teilweise' : 'nein (Quellwerte)';
    lines.push([csvCell(r.plate), r.kind === 'anhaenger' ? 'Anhänger' : 'Lkw', csvCell(r.site), r.status === 'warnung' && !r.below_warn && r.spare_below_min ? 'Reserverad abgefahren' : TS_DE[r.status], mm(r.min_tread_mm), r.measured_positions, r.below_min, r.below_warn,
      r.oldest_measure_at ? berlinDate(r.oldest_measure_at) : '', r.oldest_age_days ?? '', r.measured_positions ? (r.stale ? 'ja' : 'nein') : '',
      ...AXLES.map((a) => (sp[a] ? csvCell(sp[a].size) : '')), checked, WS_DE[r.winter], (r.winter_noncompliant || []).join(' '), (r.winter_missing || []).join(' '), r.winter_order ? r.winter_order.case_no : '', r.oldest_dot_date || '', r.oldest_dot_months ?? '', ov.warn_age_years === null ? '' : r.age_warn, r.winter_closed_order ? r.winter_closed_order.case_no : '', r.spare_below_min ? 'ja' : ''].join(';'));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}
const AXLE_DE = { lenkachse: 'Lenkachse', liftachse: 'Liftachse', antriebsachse: 'Antriebsachse', anhaenger: 'Anhänger' };
