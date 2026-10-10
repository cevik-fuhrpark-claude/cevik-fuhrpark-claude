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
  const plates = new Map((await env.DB.prepare('SELECT id, plate, site FROM vehicles').all()).results.map((v) => [v.id, v]));
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
  return { from, to, environment: envName, hourly_rate_net: rate, rows: out, totals: { actual_net: r2(totals.actual_net), estimate_net: r2(totals.estimate_net), unvalued_items: totals.unvalued_items, hours: r2(totals.hours) } };
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
