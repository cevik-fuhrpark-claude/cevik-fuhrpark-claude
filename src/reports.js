// [CLAUDE] Kostenbericht je Fahrzeug und Monat (Controlling). Gleiche Regeln wie caseCosts:
// fehlende Preise = unbewertet (nie 0 €), Schätzungen getrennt, Fremdleistung „ersetzt eigene Stunden/Teile“ ohne Doppelzählung.
// Monatszuordnung nach Buchungsdatum (Arbeitstag bzw. Erfassungszeitpunkt, Zeitzone Europe/Berlin).
import { bad, forbidden, berlinDate } from './util.js';

const READ_ROLES = ['owner', 'fleet', 'viewer'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const r2 = (x) => Math.round(x * 100) / 100;

function monthRange(q) {
  const now = berlinDate().slice(0, 7);
  const to = q.to || now;
  const from = q.from || `${Number(to.slice(0, 4)) - 1}-${to.slice(5, 7)}`;
  if (!MONTH.test(from) || !MONTH.test(to)) throw bad('validation', 'Zeitraum im Format JJJJ-MM angeben.');
  if (from > to) throw bad('validation', '„Von“ liegt nach „Bis“.');
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + Number(to.slice(5, 7)) - Number(from.slice(5, 7)) + 1;
  if (months > 36) throw bad('validation', 'Maximal 36 Monate je Abfrage.');
  return { from, to };
}

export async function costReport(env, user, envName, query = {}) {
  if (user && !READ_ROLES.includes(user.role)) throw forbidden();
  const { from, to } = monthRange(query);
  const vehicleFilter = query.vehicle_id ? String(query.vehicle_id).slice(0, 40) : null;
  const rateRow = await env.DB.prepare(`SELECT value FROM settings WHERE key='workshop_hourly_rate_net'`).first();
  const rate = rateRow && rateRow.value !== '' && Number.isFinite(Number(rateRow.value)) ? Number(rateRow.value) : null;
  // Zeitfenster großzügig in UTC laden, exakte Monatsgrenze danach in Berliner Zeit prüfen
  const lo = new Date(Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, 1) - 86400000).toISOString();
  const hi = new Date(Date.UTC(+to.slice(0, 4), +to.slice(5, 7), 2)).toISOString();
  const vf = vehicleFilter ? ' AND c.vehicle_id=?' : '';
  const bind = (...a) => (vehicleFilter ? [...a, vehicleFilter] : a);
  const covered = new Set((await env.DB.prepare(`SELECT DISTINCT e.case_id FROM external_costs e JOIN cases c ON c.id=e.case_id WHERE c.environment=? AND e.covers_work_and_parts=1${vf}`)
    .bind(...bind(envName)).all()).results.map((x) => x.case_id));
  const work = (await env.DB.prepare(`SELECT w.case_id, w.hours, w.work_date AS d, c.vehicle_id FROM work_entries w JOIN cases c ON c.id=w.case_id
    WHERE c.environment=? AND w.work_date >= ? AND w.work_date <= ?${vf}`).bind(...bind(envName, `${from}-01`, `${to}-31`)).all()).results;
  const parts = (await env.DB.prepare(`SELECT p.case_id, p.quantity, p.unit_price_net, p.valuation, p.created_at AS d, c.vehicle_id FROM parts p JOIN cases c ON c.id=p.case_id
    WHERE c.environment=? AND p.created_at >= ? AND p.created_at < ?${vf}`).bind(...bind(envName, lo, hi)).all()).results;
  const ext = (await env.DB.prepare(`SELECT e.case_id, e.amount_net, e.valuation, e.created_at AS d, c.vehicle_id FROM external_costs e JOIN cases c ON c.id=e.case_id
    WHERE c.environment=? AND e.created_at >= ? AND e.created_at < ?${vf}`).bind(...bind(envName, lo, hi)).all()).results;
  const caseMonths = (await env.DB.prepare(`SELECT c.vehicle_id, c.created_at AS d FROM cases c WHERE c.environment=? AND c.created_at >= ? AND c.created_at < ?${vf}`)
    .bind(...bind(envName, lo, hi)).all()).results;

  const rows = new Map();
  const row = (vehicleId, month) => {
    const k = `${vehicleId}|${month}`;
    if (!rows.has(k)) rows.set(k, { vehicle_id: vehicleId, month, cases_opened: 0, hours: 0, work_net: 0, parts_actual_net: 0, parts_estimate_net: 0, external_actual_net: 0, external_estimate_net: 0, unvalued_items: 0 });
    return rows.get(k);
  };
  const inRange = (m) => m >= from && m <= to;
  const monthOf = (d) => (d.length === 10 ? d.slice(0, 7) : berlinDate(d).slice(0, 7));
  for (const c of caseMonths) { const m = monthOf(c.d); if (inRange(m)) row(c.vehicle_id, m).cases_opened++; }
  for (const w of work) {
    if (covered.has(w.case_id)) continue;
    const m = monthOf(w.d); if (!inRange(m)) continue;
    const r = row(w.vehicle_id, m); r.hours += w.hours;
    if (rate === null) r.unvalued_items++; else r.work_net += w.hours * rate;
  }
  for (const p of parts) {
    if (covered.has(p.case_id)) continue;
    const m = monthOf(p.d); if (!inRange(m)) continue;
    const r = row(p.vehicle_id, m);
    if (p.unit_price_net === null || p.valuation === 'unvalued') r.unvalued_items++;
    else if (p.valuation === 'estimate') r.parts_estimate_net += p.quantity * p.unit_price_net;
    else r.parts_actual_net += p.quantity * p.unit_price_net;
  }
  for (const e of ext) {
    const m = monthOf(e.d); if (!inRange(m)) continue;
    const r = row(e.vehicle_id, m);
    if (e.amount_net === null || e.valuation === 'unvalued') r.unvalued_items++;
    else if (e.valuation === 'estimate') r.external_estimate_net += e.amount_net;
    else r.external_actual_net += e.amount_net;
  }
  const plates = new Map((await env.DB.prepare('SELECT id, plate, site, eval_excluded FROM vehicles').all()).results.map((v) => [v.id, v]));
  // ruhende Fahrzeuge (Inhaberentscheidung) zählen in keiner Auswertung
  for (const [k, r] of rows) if ((plates.get(r.vehicle_id) || {}).eval_excluded) rows.delete(k);
  const out = [...rows.values()].map((r) => {
    const v = plates.get(r.vehicle_id) || {};
    const actual = r.work_net + r.parts_actual_net + r.external_actual_net;
    const estimate = r.parts_estimate_net + r.external_estimate_net;
    return {
      vehicle_id: r.vehicle_id, plate: v.plate || null, site: v.site || null, month: r.month, cases_opened: r.cases_opened,
      hours: r2(r.hours), work_net: rate === null ? null : r2(r.work_net), parts_actual_net: r2(r.parts_actual_net), parts_estimate_net: r2(r.parts_estimate_net),
      external_actual_net: r2(r.external_actual_net), external_estimate_net: r2(r.external_estimate_net),
      actual_net: r2(actual), estimate_net: r2(estimate), unvalued_items: r.unvalued_items, complete: r.unvalued_items === 0,
    };
  }).sort((a, b) => (a.plate || a.vehicle_id).localeCompare(b.plate || b.vehicle_id) || a.month.localeCompare(b.month));
  const totals = out.reduce((t, r) => ({ actual_net: t.actual_net + r.actual_net, estimate_net: t.estimate_net + r.estimate_net, unvalued_items: t.unvalued_items + r.unvalued_items, hours: t.hours + r.hours }),
    { actual_net: 0, estimate_net: 0, unvalued_items: 0, hours: 0 });
  // Kosten je Kilometer: gefahrene km im Zeitraum aus erster und letzter Ablesung (mind. 2 Ablesungen, kein Rückgang); sonst ohne Wert
  const kmRows = (await env.DB.prepare(`SELECT o.vehicle_id, COUNT(*) AS n,
      (SELECT o2.km FROM odometer_readings o2 WHERE o2.vehicle_id=o.vehicle_id AND o2.measured_at >= ?1 AND o2.measured_at < ?2 ORDER BY o2.measured_at ASC LIMIT 1) AS km_first,
      (SELECT o3.km FROM odometer_readings o3 WHERE o3.vehicle_id=o.vehicle_id AND o3.measured_at >= ?1 AND o3.measured_at < ?2 ORDER BY o3.measured_at DESC LIMIT 1) AS km_last
    FROM odometer_readings o WHERE o.measured_at >= ?1 AND o.measured_at < ?2 GROUP BY o.vehicle_id`).bind(lo, hi).all()).results;
  const kmOf = new Map(kmRows.map((k) => [k.vehicle_id, k]));
  const perVehicle = new Map();
  for (const r of out) {
    const v = perVehicle.get(r.vehicle_id) || { vehicle_id: r.vehicle_id, plate: r.plate, site: r.site, actual_net: 0, estimate_net: 0, unvalued_items: 0 };
    v.actual_net += r.actual_net; v.estimate_net += r.estimate_net; v.unvalued_items += r.unvalued_items; perVehicle.set(r.vehicle_id, v);
  }
  for (const k of kmRows) if (!perVehicle.has(k.vehicle_id) && plates.has(k.vehicle_id) && !plates.get(k.vehicle_id).eval_excluded && (!vehicleFilter || k.vehicle_id === vehicleFilter)) {
    const v = plates.get(k.vehicle_id); perVehicle.set(k.vehicle_id, { vehicle_id: k.vehicle_id, plate: v.plate, site: v.site, actual_net: 0, estimate_net: 0, unvalued_items: 0 });
  }
  const vehicles = [...perVehicle.values()].map((v) => {
    const k = kmOf.get(v.vehicle_id);
    const km = k && k.n >= 2 && k.km_last >= k.km_first ? k.km_last - k.km_first : null;
    return { ...v, actual_net: r2(v.actual_net), estimate_net: r2(v.estimate_net), km, cost_per_km: km ? Math.round((v.actual_net / km) * 1000) / 1000 : null, complete: v.unvalued_items === 0 };
  }).sort((a, b) => (a.plate || '').localeCompare(b.plate || ''));
  return { from, to, environment: envName, hourly_rate_net: rate, rows: out, vehicles, totals: { actual_net: r2(totals.actual_net), estimate_net: r2(totals.estimate_net), unvalued_items: totals.unvalued_items, hours: r2(totals.hours) } };
}

// CSV für Excel (DE): Semikolon, Dezimalkomma, UTF-8 mit BOM; Formel-Injektion wird neutralisiert
export function costReportCsv(rep) {
  const num = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const cell = (x) => {
    let s = x === null || x === undefined ? '' : String(x);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Kennzeichen', 'FIN-Schlüssel', 'Standort', 'Monat', 'Neue Vorgänge', 'Stunden', 'Arbeitszeit netto', 'Teile netto', 'Teile geschätzt netto',
    'Fremdleistung netto', 'Fremdleistung geschätzt netto', 'Summe belegt netto', 'Summe geschätzt netto', 'Unbewertete Positionen', 'Vollständig bewertet'];
  const lines = [head.join(';')];
  for (const r of rep.rows) {
    lines.push([cell(r.plate), cell(r.vehicle_id), cell(r.site), r.month, r.cases_opened, num(r.hours), num(r.work_net), num(r.parts_actual_net), num(r.parts_estimate_net),
      num(r.external_actual_net), num(r.external_estimate_net), num(r.actual_net), num(r.estimate_net), r.unvalued_items, r.complete ? 'ja' : 'nein'].join(';'));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// [CLAUDE] Kennzahlen Instandhaltung: Reaktions- und Durchlaufzeiten je Priorität, Teile-Wartezeit, Werkstattzeit je Fahrzeug.
// Grundlage sind ausschließlich gespeicherte Zeitstempel (Vorgang + Ereignisprotokoll); fehlende Zeitstempel = nicht gezählt, nie geschätzt.
const H = 3600000;
const r1 = (x) => (x === null ? null : Math.round(x * 10) / 10);
function quantile(arr, q) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const pos = (s.length - 1) * q; const lo = Math.floor(pos); const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
const stat = (arr) => ({ n: arr.length, median_h: r1(quantile(arr, 0.5)), p90_h: r1(quantile(arr, 0.9)) });

export async function kpiReport(env, user, envName, query = {}) {
  if (!READ_ROLES.includes(user.role)) throw forbidden();
  const { from, to } = monthRange(query);
  const lo = new Date(Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, 1) - 86400000).toISOString();
  const hi = new Date(Date.UTC(+to.slice(0, 4), +to.slice(5, 7), 2)).toISOString();
  const cases = (await env.DB.prepare(`SELECT c.id, c.vehicle_id, c.priority, c.status, c.created_at, c.fleet_received_at, c.workshop_ack_at, c.closed_at FROM cases c
    JOIN vehicles v ON v.id=c.vehicle_id AND v.eval_excluded=0
    WHERE c.environment=? AND c.created_at >= ? AND c.created_at < ?`).bind(envName, lo, hi).all()).results
    .filter((c) => { const m = berlinDate(c.created_at).slice(0, 7); return m >= from && m <= to; });
  const ids = cases.map((c) => c.id);
  const events = ids.length ? (await env.DB.prepare(`SELECT case_id, action, to_status, created_at, CASE WHEN action='create' THEN payload END AS create_payload FROM case_events WHERE case_id IN (SELECT value FROM json_each(?)) ORDER BY case_id, created_at`)
    .bind(JSON.stringify(ids)).all()).results : [];
  const evBy = new Map();
  for (const e of events) { if (!evBy.has(e.case_id)) evBy.set(e.case_id, []); evBy.get(e.case_id).push(e); }
  const now = Date.now();
  const groups = {}; const byVehicle = new Map();
  const locks = new Map(); // je Fahrzeug Sperrabschnitte; überlappende Sperren mehrerer Vorgänge zählen einmal
  const addLock = (vid, a, b) => { if (b > a) { if (!locks.has(vid)) locks.set(vid, []); locks.get(vid).push([a, b]); } };
  const g = (k) => groups[k] || (groups[k] = { created: 0, released: 0, rejected: 0, open: 0, triage: [], ack: [], total: [], parts_wait_h: 0 });
  for (const c of cases) {
    const evs = evBy.get(c.id) || [];
    const t0 = Date.parse(c.created_at);
    const approved = evs.find((e) => e.to_status === 'werkstatt_freigegeben');
    // Teile-Wartezeit: Summe der Abschnitte im Status „wartet_teile“ (offener Abschnitt bis jetzt)
    let wait = 0; let since = null;
    for (const e of evs) {
      if (e.to_status === 'wartet_teile' && since === null) since = Date.parse(e.created_at);
      else if (since !== null && e.to_status && e.to_status !== 'wartet_teile') { wait += Date.parse(e.created_at) - since; since = null; }
    }
    if (since !== null) wait += now - since;
    // Sicherheitssperre: ab Meldung mit Sperre bzw. „Sperre setzen“ bis „Sperre aufheben“ oder technische Freigabe (offen bis jetzt)
    let lockFrom = null;
    for (const e of evs) {
      const at = Date.parse(e.created_at);
      if (e.action === 'create') { try { if (JSON.parse(e.create_payload || '{}').safety_lock) lockFrom = at; } catch { /* altes Format */ } }
      else if (e.action === 'set_safety_lock' && lockFrom === null) lockFrom = at;
      else if (lockFrom !== null && (e.action === 'lift_safety_lock' || e.to_status === 'fahrzeug_freigegeben' || e.to_status === 'abgelehnt')) { addLock(c.vehicle_id, lockFrom, at); lockFrom = null; }
    }
    if (lockFrom !== null) addLock(c.vehicle_id, lockFrom, now);
    const workshop = approved && c.closed_at && c.status === 'fahrzeug_freigegeben' ? Date.parse(c.closed_at) - Date.parse(approved.created_at) : null;
    for (const k of [c.priority, 'alle']) {
      const x = g(k); x.created++;
      if (c.status === 'fahrzeug_freigegeben') x.released++; else if (c.status === 'abgelehnt') x.rejected++; else x.open++;
      if (c.fleet_received_at) x.triage.push((Date.parse(c.fleet_received_at) - t0) / H);
      if (approved && c.workshop_ack_at) x.ack.push((Date.parse(c.workshop_ack_at) - Date.parse(approved.created_at)) / H);
      if (c.status === 'fahrzeug_freigegeben' && c.closed_at) x.total.push((Date.parse(c.closed_at) - t0) / H);
      x.parts_wait_h += wait / H;
    }
    const v = byVehicle.get(c.vehicle_id) || { vehicle_id: c.vehicle_id, cases: 0, released: 0, workshop_h: 0, parts_wait_h: 0, locked_h: 0 };
    v.cases++; if (c.status === 'fahrzeug_freigegeben') v.released++;
    if (workshop !== null) v.workshop_h += workshop / H;
    v.parts_wait_h += wait / H;
    byVehicle.set(c.vehicle_id, v);
  }
  for (const [vid, list] of locks) {
    list.sort((x, y) => x[0] - y[0]);
    let sum = 0; let [a, b] = list[0];
    for (const [x, y] of list.slice(1)) { if (x <= b) b = Math.max(b, y); else { sum += b - a; a = x; b = y; } }
    sum += b - a;
    byVehicle.get(vid).locked_h = sum / H;
  }
  const plates = new Map((await env.DB.prepare('SELECT id, plate, kind FROM vehicles').all()).results.map((v) => [v.id, v]));
  const order = ['kritisch', 'mittel', 'niedrig', 'alle'];
  const by_priority = order.filter((k) => groups[k]).map((k) => {
    const x = groups[k];
    return { priority: k, created: x.created, released: x.released, rejected: x.rejected, open: x.open, triage: stat(x.triage), workshop_ack: stat(x.ack), created_to_release: stat(x.total), parts_wait_h: r1(x.parts_wait_h) };
  });
  const vehicles = [...byVehicle.values()].map((v) => ({ ...v, plate: plates.get(v.vehicle_id)?.plate || null, kind: plates.get(v.vehicle_id)?.kind || null, workshop_h: r1(v.workshop_h), parts_wait_h: r1(v.parts_wait_h), locked_h: r1(v.locked_h) }))
    .sort((a, b) => b.workshop_h - a.workshop_h || b.cases - a.cases);
  return { from, to, environment: envName, by_priority, vehicles,
    definitions: { triage: 'Meldung → Eingang bestätigt (Fuhrparkleitung)', workshop_ack: 'Werkstattfreigabe → Übernahme durch Werkstatt', created_to_release: 'Meldung → technische Freigabe (nur freigegebene)', workshop_h: 'Werkstattfreigabe → technische Freigabe je Fahrzeug', parts_wait_h: 'Zeit im Status „wartet auf Teile“', locked_h: 'Zeit mit Sicherheitssperre je Fahrzeug (Meldung bzw. Sperre → Aufhebung/Freigabe; Überschneidungen einmal), Vorgänge aus dem Zeitraum' } };
}

// ---- Werkstatt-Auslastung je Standort und Kalenderwoche (ohne Auswertung je Person) ----
// Stunden = Summe erfasster Arbeitszeit der Aufträge des Standorts (Arbeitstag), übernommen = workshop_ack_at, freigegeben = closed_at.
export function isoWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7; // Mo=0
  d.setUTCDate(d.getUTCDate() - day + 3); // Donnerstag der Woche
  const y = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const w = 1 + Math.round(((d - jan4) / 86400000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
const OPEN_WS = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'];
export async function workshopLoad(env, user, envName, query = {}) {
  if (!['owner', 'fleet', 'viewer', 'workshop'].includes(user.role)) throw forbidden();
  const weeks = Math.min(Math.max(Number(query.weeks) || 8, 1), 52);
  const today = berlinDate();
  const startDate = new Date(Date.parse(today + 'T00:00:00Z') - ((new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7) * 86400000 - (weeks - 1) * 7 * 86400000).toISOString().slice(0, 10);
  const siteFilter = user.role === 'workshop' ? user.workshop_site : null;
  const sf = siteFilter ? ' AND c.workshop_site=?' : '';
  const args = (extra) => (siteFilter ? [envName, extra, siteFilter] : [envName, extra]);
  const [hours, acks, closed, open, sites] = await Promise.all([
    env.DB.prepare(`SELECT c.workshop_site AS site, w.work_date AS d, SUM(w.hours) AS h FROM work_entries w JOIN cases c ON c.id=w.case_id
      WHERE c.environment=? AND w.work_date >= ?${sf} GROUP BY c.workshop_site, w.work_date`).bind(...args(startDate)).all(),
    env.DB.prepare(`SELECT c.workshop_site AS site, c.workshop_ack_at AS t FROM cases c WHERE c.environment=? AND c.workshop_ack_at >= ?${sf}`).bind(...args(startDate)).all(),
    env.DB.prepare(`SELECT c.workshop_site AS site, c.closed_at AS t FROM cases c WHERE c.environment=? AND c.status='fahrzeug_freigegeben' AND c.closed_at >= ?${sf} AND c.workshop_site IS NOT NULL`).bind(...args(startDate)).all(),
    env.DB.prepare(`SELECT c.workshop_site AS site, c.status, COUNT(*) AS n FROM cases c WHERE c.environment=? AND c.status IN (${OPEN_WS.map(() => '?').join(',')})${sf} GROUP BY c.workshop_site, c.status`)
      .bind(envName, ...OPEN_WS, ...(siteFilter ? [siteFilter] : [])).all(),
    env.DB.prepare('SELECT code, name FROM workshops WHERE active=1').all(),
  ]);
  const weekList = []; for (let i = 0; i < weeks; i++) weekList.push(isoWeek(new Date(Date.parse(startDate + 'T00:00:00Z') + i * 7 * 86400000).toISOString().slice(0, 10)));
  const bySite = new Map();
  const site = (code) => { const k = code || 'ohne'; if (!bySite.has(k)) bySite.set(k, { site: k, weeks: Object.fromEntries(weekList.map((w) => [w, { hours: 0, acknowledged: 0, released: 0 }])), open: {} }); return bySite.get(k); };
  for (const s of sites.results) if (!siteFilter || s.code === siteFilter) site(s.code);
  for (const r of hours.results) { const w = site(r.site).weeks[isoWeek(r.d)]; if (w) w.hours = Math.round((w.hours + r.h) * 100) / 100; }
  for (const r of acks.results) { const w = site(r.site).weeks[isoWeek(berlinDate(r.t))]; if (w) w.acknowledged++; }
  for (const r of closed.results) { const w = site(r.site).weeks[isoWeek(berlinDate(r.t))]; if (w) w.released++; }
  for (const r of open.results) site(r.site).open[r.status] = r.n;
  const names = new Map(sites.results.map((s) => [s.code, s.name]));
  return { environment: envName, from: startDate, weeks: weekList, open_statuses: OPEN_WS,
    sites: [...bySite.values()].map((s) => ({ ...s, name: names.get(s.site) || s.site, weeks: weekList.map((w) => ({ week: w, ...s.weeks[w] })) })) };
}

// Mängelstatistik der Kontrollen (Abfahrt / nach Reparatur): welche Prüfpunkte wie oft und an welchen Fahrzeugen als Mangel
// erfasst wurden – nur gespeicherte Kontrollen, ruhende Fahrzeuge (eval_excluded) ausgenommen, Umgebung getrennt, ohne Personen.
export async function defectReport(env, user, envName, query = {}) {
  if (!['owner', 'fleet'].includes(user.role)) throw forbidden();
  const days = query.days === undefined || query.days === '' ? 90 : Number(query.days);
  if (!Number.isInteger(days) || days < 7 || days > 730) throw bad('invalid_days', 'days: 7–730 Tage');
  const kind = query.kind || '';
  if (kind && !['abfahrt', 'nach_reparatur'].includes(kind)) throw bad('invalid_kind', 'kind: abfahrt oder nach_reparatur');
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const kf = kind ? ' AND i.kind=?' : '';
  const args = kind ? [envName, since, kind] : [envName, since];
  const [checks, items, again] = await Promise.all([
    env.DB.prepare(`SELECT i.vehicle_id, v.plate, v.kind AS vehicle_kind, COUNT(*) AS checks, SUM(i.result='maengel') AS with_defects, MAX(i.created_at) AS last_at
      FROM inspections i JOIN vehicles v ON v.id=i.vehicle_id AND v.eval_excluded=0
      WHERE i.environment=? AND i.created_at >= ?${kf} GROUP BY i.vehicle_id`).bind(...args).all(),
    env.DB.prepare(`SELECT json_extract(j.value,'$.key') AS item, i.vehicle_id, COUNT(*) AS n, MAX(i.created_at) AS last_at
      FROM inspections i JOIN vehicles v ON v.id=i.vehicle_id AND v.eval_excluded=0, json_each(i.items) j
      WHERE i.environment=? AND i.created_at >= ?${kf} AND json_extract(j.value,'$.result')='mangel' GROUP BY item, i.vehicle_id`).bind(...args).all(),
    // Vorgänge aus Kontrollen (alle Kontrollarten) im Zeitraum, deren Prüfpunkt am selben Fahrzeug in den 90 Tagen davor repariert und freigegeben wurde
    env.DB.prepare(`SELECT c.check_item AS item, COUNT(*) AS n FROM cases c JOIN vehicles v ON v.id=c.vehicle_id AND v.eval_excluded=0
      WHERE c.environment=? AND c.created_at >= ? AND c.origin='kontrolle' AND c.check_item IS NOT NULL AND EXISTS (SELECT 1 FROM cases p
        WHERE p.vehicle_id=c.vehicle_id AND p.environment=c.environment AND p.check_item=c.check_item AND p.id<>c.id AND p.status='fahrzeug_freigegeben'
        AND p.closed_at <= c.created_at AND p.closed_at >= strftime('%Y-%m-%dT%H:%M:%fZ', c.created_at, '-90 days')) GROUP BY c.check_item`).bind(envName, since).all(),
  ]);
  const againBy = new Map(again.results.map((r) => [r.item, r.n]));
  const plates = new Map(checks.results.map((c) => [c.vehicle_id, c.plate]));
  const byItem = new Map(); const byVeh = new Map();
  for (const r of items.results) {
    if (!byItem.has(r.item)) byItem.set(r.item, { item: r.item, defects: 0, vehicles: [], last_at: null });
    const it = byItem.get(r.item);
    it.defects += r.n; it.vehicles.push({ vehicle_id: r.vehicle_id, plate: plates.get(r.vehicle_id) || r.vehicle_id, n: r.n });
    if (!it.last_at || r.last_at > it.last_at) it.last_at = r.last_at;
    byVeh.set(r.vehicle_id, (byVeh.get(r.vehicle_id) || 0) + r.n);
  }
  for (const [item, n] of againBy) if (!byItem.has(item)) byItem.set(item, { item, defects: 0, vehicles: [], last_at: null, again_after_repair: n });
  const itemsOut = [...byItem.values()].map((it) => ({ ...it, again_after_repair: againBy.get(it.item) || 0, vehicle_count: it.vehicles.length, vehicles: it.vehicles.sort((a, b) => b.n - a.n || a.plate.localeCompare(b.plate)).slice(0, 10) }))
    .sort((a, b) => b.defects - a.defects || a.item.localeCompare(b.item));
  const vehicles = checks.results.map((c) => ({ vehicle_id: c.vehicle_id, plate: c.plate, vehicle_kind: c.vehicle_kind, checks: c.checks, checks_with_defects: c.with_defects || 0, defect_items: byVeh.get(c.vehicle_id) || 0, last_check_at: c.last_at }))
    .sort((a, b) => b.defect_items - a.defect_items || b.checks_with_defects - a.checks_with_defects || a.plate.localeCompare(b.plate));
  const total = vehicles.reduce((s, v) => s + v.checks, 0);
  return { environment: envName, days, kind: kind || null, since,
    totals: { checks: total, checks_with_defects: vehicles.reduce((s, v) => s + v.checks_with_defects, 0), defect_items: itemsOut.reduce((s, i) => s + i.defects, 0), again_after_repair: itemsOut.reduce((s, i) => s + i.again_after_repair, 0), vehicles_checked: vehicles.length },
    items: itemsOut, vehicles };
}

// ---- Werkstattplan: geplante Termine je Tag (Vorgänge mit Termin, geplante Prüftermine), überfällig geplant, ohne Termin ----
// Nur gespeicherte Termine; die App plant nichts selbst. Werkstattrolle sieht nur den eigenen Standort.
const PLAN_STATUSES = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'];
export async function workshopPlan(env, user, envName, query = {}) {
  if (!['owner', 'fleet', 'viewer', 'workshop', 'dispatch'].includes(user.role)) throw forbidden();
  const days = Math.min(Math.max(Number(query.days) || 14, 1), 60);
  const today = berlinDate();
  const to = new Date(Date.parse(today + 'T00:00:00Z') + (days - 1) * 86400000).toISOString().slice(0, 10);
  const site = user.role === 'workshop' ? user.workshop_site : (query.site ? String(query.site).slice(0, 20) : null);
  const sf = site ? ' AND c.workshop_site=?' : '';
  const [cs, mt] = await Promise.all([
    env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate, c.status, c.priority, c.safety_lock, c.workshop_site, c.planned_date, c.workshop_ack_at, substr(c.description,1,80) AS description
      FROM cases c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.environment=? AND c.status IN (${PLAN_STATUSES.map(() => '?').join(',')})${sf}
      ORDER BY c.planned_date, c.priority='kritisch' DESC, c.created_at`).bind(envName, ...PLAN_STATUSES, ...(site ? [site] : [])).all(),
    env.DB.prepare(`SELECT m.id, m.vehicle_id, v.plate, v.kind AS vehicle_kind, m.kind, m.planned_date, m.next_due_date FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id
      WHERE v.active=1 AND v.eval_excluded=0 AND m.planned_date IS NOT NULL AND m.planned_date >= ? AND m.planned_date <= ? ORDER BY m.planned_date, v.plate`).bind(today, to).all(),
  ]);
  const byDay = new Map();
  const put = (d, item) => { if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(item); };
  const overdue = []; const unplanned = [];
  for (const c of cs.results) {
    const item = { type: 'case', ...c, safety_lock: !!c.safety_lock };
    if (!c.planned_date) unplanned.push(item);
    else if (c.planned_date < today) overdue.push(item);
    else if (c.planned_date <= to) put(c.planned_date, item);
  }
  for (const m of mt.results) put(m.planned_date, { type: 'maintenance', ...m });
  return { today, from: today, to, site, days: [...byDay.keys()].sort().map((d) => ({ date: d, items: byDay.get(d) })), overdue, unplanned };
}

