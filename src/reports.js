// [CLAUDE] Kostenbericht je Fahrzeug und Monat (Controlling). Gleiche Regeln wie caseCosts:
// fehlende Preise = unbewertet (nie 0 €), Schätzungen getrennt, Fremdleistung „ersetzt eigene Stunden/Teile“ ohne Doppelzählung.
// Monatszuordnung nach Buchungsdatum (Arbeitstag bzw. Erfassungszeitpunkt, Zeitzone Europe/Berlin).
import { icsLang } from '../public/ics-texts.js';
import { bad, forbidden, normPlate, berlinWindowStartIso, berlinDate, berlinDateTime, berlinDayStartIso, addMonths, icsCalendar, intParam, rateOf, roundCents, roundMilli } from './util.js';
import { maintenanceOverview, csvCell } from './maintenance.js';

const READ_ROLES = ['owner', 'fleet', 'viewer'];
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const r2 = roundCents; // kaufmännisch, gegen Gleitkommafehler abgesichert (18.10.2026)

// Standort-Schlüssel: ohne Leerzeichen am Rand, Groß-/Kleinschreibung egal; leer = 'ohne'
// NFC (22.10.2026): zerlegte Umlaute aus API-Aufrufen (z. B. n8n vom Mac, „Mu\u0308nchen“) ergaben einen eigenen Standort
// Leerraum vereinheitlicht (23.10.2026): „Hamburg  Nord“ und „Hamburg\u00a0Nord“ (geschütztes Leerzeichen aus Excel) waren eigene Standorte
export const siteKey = (s) => (s && String(s).trim() ? String(s).normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('de') : 'ohne');
const siteRaw = (s) => String(s).normalize('NFC').replace(/\s+/g, ' ').trim();
// je Schlüssel die häufigste Schreibweise (bei Gleichstand alphabetisch zuerst)
export function siteLabels(vehicles) {
  const cnt = new Map();
  for (const v of vehicles) { const k = siteKey(v.site); const raw = k === 'ohne' ? 'ohne' : siteRaw(v.site); const m = cnt.get(k) || new Map(); m.set(raw, (m.get(raw) || 0) + 1); cnt.set(k, m); }
  return new Map([...cnt].map(([k, m]) => [k, [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))[0][0]]));
}

// Standortauswahl für Berichte: options = Auswahl (häufigste Schreibweise, „ohne“ zuletzt), site = gewählter Standort in Anzeige-Schreibweise
// (unbekannt → wie übergeben), match(site) = gehört ein Stammdaten-Standort zur Auswahl (ohne Auswahl immer true)
export function siteSelection(vehicles, raw) {
  const label = siteLabels(vehicles);
  const options = [...new Set(label.values())].sort((a, b) => (a === 'ohne') - (b === 'ohne') || a.localeCompare(b, 'de'));
  const r = raw && String(raw).trim() ? String(raw).slice(0, 60) : null; // nur Leerzeichen = keine Auswahl (21.10.2026: filterte auf „ohne Standort“)
  const key = r ? siteKey(r === 'ohne' ? null : r) : null;
  return { options, label, site: key ? (label.get(key) || r) : null, match: (s) => !key || siteKey(s) === key };
}

function monthRange(q) {
  const now = berlinDate().slice(0, 7);
  const to = q.to || now;
  // ohne „Von“: 12 Monate vor „Bis“, frühestens 2000-01 (18.10.2026: „Bis 2000-06“ allein → 400)
  const from = q.from || (MONTH.test(to) ? [`${Number(to.slice(0, 4)) - 1}-${to.slice(5, 7)}`, '2000-01'].sort()[1] : to);
  if (!MONTH.test(from) || !MONTH.test(to)) throw bad('validation', 'Zeitraum im Format JJJJ-MM angeben.');
  // Jahr begrenzen (9999-12 ergab beim Monatsende „10000-01-01“ → 500 im Kennzahlenbericht, 17.10.2026)
  if (from < '2000-01' || to > '2100-12') throw bad('validation', 'Zeitraum im Format JJJJ-MM angeben.');
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
  const rate = rateOf(rateRow && rateRow.value);
  // Zeitfenster großzügig in UTC laden, exakte Monatsgrenze danach in Berliner Zeit prüfen
  const lo = new Date(Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, 1) - 86400000).toISOString();
  const hi = new Date(Date.UTC(+to.slice(0, 4), +to.slice(5, 7), 2)).toISOString();
  const vf = vehicleFilter ? ' AND c.vehicle_id=?' : '';
  const bind = (...a) => (vehicleFilter ? [...a, vehicleFilter] : a);
  const covered = new Set((await env.DB.prepare(`SELECT DISTINCT e.case_id FROM external_costs e JOIN cases c ON c.id=e.case_id WHERE c.environment=? AND e.covers_work_and_parts=1${vf}`)
    .bind(...bind(envName)).all()).results.map((x) => x.case_id));
  const work = (await env.DB.prepare(`SELECT w.case_id, w.hours, w.work_date AS d, w.created_at AS rec, c.vehicle_id FROM work_entries w JOIN cases c ON c.id=w.case_id
    WHERE c.environment=? AND w.work_date <= ?${vf} AND w.case_id IN (SELECT w2.case_id FROM work_entries w2 WHERE w2.work_date >= ? AND w2.work_date <= ?)`)
    .bind(...(vehicleFilter ? [envName, `${to}-31`, vehicleFilter, `${from}-01`, `${to}-31`] : [envName, `${to}-31`, `${from}-01`, `${to}-31`])).all()).results; // auch Vormonate dieser Vorgänge (fortlaufende Rundung unten)
  const parts = (await env.DB.prepare(`SELECT p.case_id, p.quantity, p.unit_price_net, p.valuation, p.created_at AS d, c.vehicle_id FROM parts p JOIN cases c ON c.id=p.case_id
    WHERE c.environment=? AND p.created_at >= ? AND p.created_at < ?${vf}`).bind(...bind(envName, lo, hi)).all()).results;
  const ext = (await env.DB.prepare(`SELECT e.case_id, e.amount_net, e.valuation, e.created_at AS d, c.vehicle_id FROM external_costs e JOIN cases c ON c.id=e.case_id
    WHERE c.environment=? AND e.created_at >= ? AND e.created_at < ?${vf}`).bind(...bind(envName, lo, hi)).all()).results;
  const caseMonths = (await env.DB.prepare(`SELECT c.vehicle_id, c.created_at AS d FROM cases c WHERE c.environment=? AND c.created_at >= ? AND c.created_at < ?${vf}`)
    .bind(...bind(envName, lo, hi)).all()).results;

  const rows = new Map();
  const row = (vehicleId, month) => {
    const k = `${vehicleId}|${month}`;
    if (!rows.has(k)) rows.set(k, { vehicle_id: vehicleId, month, cases_opened: 0, late_items: 0, hours: 0, work_net: 0, parts_actual_net: 0, parts_estimate_net: 0, external_actual_net: 0, external_estimate_net: 0, unvalued_items: 0, valued_items: 0, pv: 0, pu: 0, ev: 0, eu: 0 });
    return rows.get(k);
  };
  const inRange = (m) => m >= from && m <= to;
  const monthOf = (d) => (d.length === 10 ? d.slice(0, 7) : berlinDate(d).slice(0, 7));
  for (const c of caseMonths) { const m = monthOf(c.d); if (inRange(m)) row(c.vehicle_id, m).cases_opened++; }
  // Arbeitszeit zählt je Vorgang und Monat als EINE Position (wie computeCosts in Akte/Vorgang) – vorher je Zeiteintrag (17.10.2026)
  // Betrag je Vorgang und Monat fortlaufend gerundet: Monat = rund(Stunden bis Monatsende × Satz) − rund(Stunden davor × Satz) – die Monate
  // eines Vorgangs ergeben zusammen genau den Betrag der Akte/des Vorgangs (computeCosts: rund(alle Stunden × Satz)); vorher je Monat
  // einzeln gerundet → Bericht und Akte wichen um Cent ab (19.10.2026)
  const lateKeys = new Set();
  const workItem = new Set(); const workHours = new Map(); // `${case}|${month}` → { vehicle_id, case_id, m, h } (alle Monate, auch außerhalb des Zeitraums)
  for (const w of work) {
    if (covered.has(w.case_id) || rate === null) continue;
    const m = monthOf(w.d); const wk = `${w.case_id}|${m}`;
    const x = workHours.get(wk) || { vehicle_id: w.vehicle_id, case_id: w.case_id, m, h: 0 }; x.h += w.hours; workHours.set(wk, x);
  }
  for (const w of work) {
    if (covered.has(w.case_id)) continue;
    const m = monthOf(w.d); if (!inRange(m)) continue;
    const r = row(w.vehicle_id, m); r.hours += w.hours;
    // nach Ende des Monats gebucht (z. B. im Januar für Dezember, Backlog 189): je Vorgang/Monat/Buchungstag eine nachträgliche Position –
    // der Monatswert hat sich nach Monatsende geändert; gleiche Gruppierung wie die Einzelpositionen-CSV
    if (w.hours > 0 && w.rec) { const rd = berlinDate(w.rec); if (rd.slice(0, 7) > m) { const lk = `${w.case_id}|${m}|${rd}`; if (!lateKeys.has(lk)) { lateKeys.add(lk); r.late_items++; } } }
    const k = `${w.case_id}|${m}`;
    if (!(w.hours > 0) || workItem.has(k)) continue;
    workItem.add(k);
    if (rate === null) r.unvalued_items++; else r.valued_items++;
  }
  { const cum = new Map(); // je Vorgang: Stunden der Vormonate
    for (const x of [...workHours.values()].sort((a, b) => (a.case_id === b.case_id ? (a.m < b.m ? -1 : 1) : a.case_id < b.case_id ? -1 : 1))) {
      const before = cum.get(x.case_id) || 0; const after = before + x.h; cum.set(x.case_id, after);
      if (inRange(x.m)) row(x.vehicle_id, x.m).work_net += r2(r2(after * rate) - r2(before * rate));
    } }
  for (const p of parts) {
    if (covered.has(p.case_id)) continue;
    const m = monthOf(p.d); if (!inRange(m)) continue;
    const r = row(p.vehicle_id, m);
    if (p.unit_price_net === null || p.valuation === 'unvalued') { r.unvalued_items++; r.pu++; }
    else if (p.valuation === 'estimate') r.parts_estimate_net += r2(p.quantity * p.unit_price_net);
    else { r.parts_actual_net += r2(p.quantity * p.unit_price_net); r.valued_items++; r.pv++; }
  }
  for (const e of ext) {
    const m = monthOf(e.d); if (!inRange(m)) continue;
    const r = row(e.vehicle_id, m);
    if (e.amount_net === null || e.valuation === 'unvalued') { r.unvalued_items++; r.eu++; }
    else if (e.valuation === 'estimate') r.external_estimate_net += r2(e.amount_net);
    else { r.external_actual_net += r2(e.amount_net); r.valued_items++; r.ev++; }
  }
  const allPlates = new Map((await env.DB.prepare('SELECT id, plate, site, eval_excluded, active FROM vehicles').all()).results.map((v) => [v.id, v]));
  // Standortfilter (Standort laut Fahrzeugstamm, 'ohne' = ohne Standort): wirkt auf Zeilen, km, Vertragsraten und Erstattungen
  // Schreibweisen desselben Standorts (Dortmund/DORTMUND) zählen zusammen; angezeigt wird die häufigste Schreibweise
  const sel = siteSelection([...allPlates.values()].filter((v) => !v.eval_excluded), query.site);
  const label = sel.label; const siteOptions = sel.options;
  const siteFilter = query.site ? String(query.site).slice(0, 60) : null;
  const plates = siteFilter ? new Map([...allPlates].filter(([, v]) => sel.match(v.site))) : allPlates;
  // ruhende Fahrzeuge (Inhaberentscheidung) zählen in keiner Auswertung
  for (const [k, r] of rows) if ((plates.get(r.vehicle_id) || {}).eval_excluded || (siteFilter && !plates.has(r.vehicle_id))) rows.delete(k);
  const out = [...rows.values()].map((r) => {
    const v = plates.get(r.vehicle_id) || {};
    // Summe aus den gerundeten Spalten (18.10.2026: Zeile 4,99 + 1 + 0 ergab „Summe belegt“ 6)
    const actual = (rate === null ? 0 : r2(r.work_net)) + r2(r.parts_actual_net) + r2(r.external_actual_net);
    const estimate = r2(r.parts_estimate_net) + r2(r.external_estimate_net);
    return {
      // Standort in Anzeige-Schreibweise wie die Standortsumme (21.10.2026: CSV hatte „DORTMUND“ und „Dortmund“ getrennt)
      vehicle_id: r.vehicle_id, plate: v.plate || null, site: v.site ? (label.get(siteKey(v.site)) || v.site) : null, month: r.month, cases_opened: r.cases_opened,
      // außer Betrieb genommen (z. B. im Jahr verkauft) kennzeichnen – Jahresabschluss (23.10.2026, Teilagent Kostenbericht)
      vehicle_active: v.active === 0 ? false : true,
      hours: r2(r.hours), work_net: rate === null ? null : r2(r.work_net), parts_actual_net: r2(r.parts_actual_net), parts_estimate_net: r2(r.parts_estimate_net),
      external_actual_net: r2(r.external_actual_net), external_estimate_net: r2(r.external_estimate_net),
      actual_net: r2(actual), valued_items: r.valued_items, estimate_net: r2(estimate), unvalued_items: r.unvalued_items, complete: r.unvalued_items === 0, late_items: r.late_items,
      // nur unbewertete Teile/Fremdleistungen in der Zeile → Spalte ohne Betrag (nie „0 €“), wie „–“ in der App (18.10.2026)
      ...(r.pu && !r.pv ? { parts_unvalued_only: true } : {}), ...(r.eu && !r.ev ? { external_unvalued_only: true } : {}),
    };
  }).sort((a, b) => (a.plate || a.vehicle_id).localeCompare(b.plate || b.vehicle_id) || a.month.localeCompare(b.month));
  const totals = out.reduce((t, r) => ({ actual_net: t.actual_net + r.actual_net, valued_items: t.valued_items + r.valued_items, estimate_net: t.estimate_net + r.estimate_net, unvalued_items: t.unvalued_items + r.unvalued_items, hours: t.hours + r.hours }),
    { actual_net: 0, valued_items: 0, estimate_net: 0, unvalued_items: 0, hours: 0 });
  // Summe je Fahrzeug-Standort (Stammdaten; ohne Standort = 'ohne') – nur Zusammenfassung der Zeilen, keine eigene Bewertung
  const siteMap = new Map();
  for (const r of out) {
    const k = siteKey(r.site);
    const s = siteMap.get(k) || { site: label.get(k) || r.site || 'ohne', actual_net: 0, valued_items: 0, estimate_net: 0, unvalued_items: 0, hours: 0, vehicles: new Set() };
    s.actual_net += r.actual_net; s.valued_items += r.valued_items; s.estimate_net += r.estimate_net; s.unvalued_items += r.unvalued_items; s.hours += r.hours; s.vehicles.add(r.vehicle_id);
    siteMap.set(k, s);
  }
  const sites = [...siteMap.values()].map((s) => ({ site: s.site, actual_net: r2(s.actual_net), valued_items: s.valued_items, estimate_net: r2(s.estimate_net), unvalued_items: s.unvalued_items, hours: r2(s.hours), vehicles: s.vehicles.size, complete: s.unvalued_items === 0 }))
    .sort((a, b) => (a.site === 'ohne') - (b.site === 'ohne') || b.actual_net - a.actual_net || a.site.localeCompare(b.site));
  // Kosten je Kilometer: gefahrene km im Zeitraum nach derselben Regel wie „Fahrleistung je Monat“ der Fahrzeugakte (16.10.2026)
  const kmOf = await periodMileage(env, from, to, vehicleFilter);
  for (const r of out) { const k = kmOf.get(r.vehicle_id); r.km = k ? k.months.get(r.month) ?? null : null; }
  const kmRows = [...kmOf.keys()].map((vehicle_id) => ({ vehicle_id }));
  const perVehicle = new Map();
  for (const r of out) {
    const v = perVehicle.get(r.vehicle_id) || { vehicle_id: r.vehicle_id, plate: r.plate, site: r.site, actual_net: 0, valued_items: 0, estimate_net: 0, unvalued_items: 0 };
    v.actual_net += r.actual_net; v.valued_items += r.valued_items; v.estimate_net += r.estimate_net; v.unvalued_items += r.unvalued_items; perVehicle.set(r.vehicle_id, v);
  }
  for (const k of kmRows) if (!perVehicle.has(k.vehicle_id) && plates.has(k.vehicle_id) && !plates.get(k.vehicle_id).eval_excluded && (!vehicleFilter || k.vehicle_id === vehicleFilter)) {
    const v = plates.get(k.vehicle_id); perVehicle.set(k.vehicle_id, { vehicle_id: k.vehicle_id, plate: v.plate, site: v.site ? (label.get(siteKey(v.site)) || v.site) : null, actual_net: 0, valued_items: 0, estimate_net: 0, unvalued_items: 0 });
  }
  const vehicles = [...perVehicle.values()].map((v) => {
    const k = kmOf.get(v.vehicle_id);
    const km = k ? k.km : null;
    const kmInfo = k ? { km_status: k.status, km_basis: k.basis, km_from_at: k.from_at, km_to_at: k.to_at } : { km_status: 'no_reading', km_basis: null, km_from_at: null, km_to_at: null };
    return { ...v, actual_net: r2(v.actual_net), estimate_net: r2(v.estimate_net), km, ...kmInfo, // nur geschätzte/unbewertete Positionen → kein €/km (vorher „0,000 €/km“ ohne Hinweis); Schätzung im Zeitraum → €/km unvollständig (19.10.2026)
    cost_per_km: km && !(v.valued_items === 0 && (v.unvalued_items > 0 || v.estimate_net > 0)) ? roundMilli(v.actual_net / km) : null, complete: v.unvalued_items === 0 && !(v.estimate_net > 0) };
  }).sort((a, b) => (a.plate || '').localeCompare(b.plate || ''));
  // Vertragsraten (Leasing/Miete/…) getrennt von der Instandhaltung – nur Inhaber/Fuhrparkleitung (Raten sind Geschäftsdaten; nicht über die Integrations-API)
  const contract_costs = user && ['owner', 'fleet'].includes(user.role) ? await contractCosts(env, from, to, vehicleFilter, plates) : undefined;
  // Versicherungserstattungen (nur Leitung) getrennt ausgewiesen – werden NICHT von den Instandhaltungskosten abgezogen
  const claim_reimbursements = user && ['owner', 'fleet'].includes(user.role) ? await claimReimbursements(env, envName, from, to, vehicleFilter, plates) : undefined;
  return { from, to, environment: envName, site: siteFilter ? sel.site : null, site_options: siteOptions, hourly_rate_net: rate, rows: out, vehicles, sites, contract_costs, claim_reimbursements, totals: { actual_net: r2(totals.actual_net), valued_items: totals.valued_items, estimate_net: r2(totals.estimate_net), unvalued_items: totals.unvalued_items, hours: r2(totals.hours) },
    // Zuordnungsregeln und Abrufzeitpunkt wie /v1/kpi (Backlog 188, Jahresabschluss): im Januar nachgetragene Dezember-Rechnungen, rückdatierte
    // Arbeitszeit oder eine geänderte Vertragsrate ändern Werte vergangener Monate – Abnehmer (n8n/Buchhaltung) sehen, wann und wonach gerechnet wurde
    generated_at: new Date().toISOString(), definitions: COST_DEFINITIONS };
}

// Rohwerte je Fahrzeug und Monat (n, dec, last_km/at, first_km/at nur im ersten Monat mit Ablesung, base = letzte Ablesung vor „Von“) –
// getrennt, damit der Test sie gegen die frühere Fensterfunktion vergleichen kann (Test „Leistung 21.10. Kostenbericht“)
export async function periodMileageRows(env, from, to, vehicleFilter = null) {
  const loX = berlinDayStartIso(`${from}-01`);
  // Monate mit Berliner Grenzen als UTC-Zeitpunkte; je Fahrzeug × Monat Index-Suchen (idx_odometer_vehicle_time, Teilindex idx_odometer_drop)
  // statt Fensterfunktion über alle Ablesungen des Zeitraums (Lastmessung 21.10.2026: 12 Monate, 150 Lkw, 220 000 km-Stände ≈ 400 ms).
  // „Rückgang“ = gespeicherter Rücksprung (km_drop_prev, Migration 0071) – ohne den der ersten Ablesung des Zeitraums (Vergleich mit dem
  // Ausgangswert prüft die Auswertung unten selbst, wie bisher).
  const months = [];
  for (let m = from; m <= to; m = addMonths(`${m}-01`, 1).slice(0, 7)) months.push([m, berlinDayStartIso(`${m}-01`), berlinDayStartIso(addMonths(`${m}-01`, 1))]);
  const vf = vehicleFilter ? ' WHERE v.id=?3' : '';
  const binds = vehicleFilter ? [JSON.stringify(months), loX, vehicleFilter] : [JSON.stringify(months), loX];
  const R = (dir) => `ORDER BY o.measured_at ${dir}, o.created_at ${dir}, o.rowid ${dir} LIMIT 1`;
  const IN = 'o.vehicle_id=g.vid AND o.measured_at >= g.lo AND o.measured_at < g.hi';
  const IN0 = 'o.vehicle_id=v.id AND o.measured_at >= mo.lo AND o.measured_at < mo.hi';
  const rows = (await env.DB.prepare(`WITH mo AS (SELECT json_extract(value,'$[0]') AS m, json_extract(value,'$[1]') AS lo, json_extract(value,'$[2]') AS hi FROM json_each(?1)),
    g AS (SELECT v.id AS vid, mo.m, mo.lo, mo.hi, (SELECT COUNT(*) FROM odometer_readings o WHERE ${IN0}) AS n FROM vehicles v CROSS JOIN mo${vf})
    SELECT g.vid AS vehicle_id, g.m, g.n,
      (SELECT COUNT(*) FROM odometer_readings o WHERE ${IN} AND o.km_drop_prev IS NOT NULL) AS dec,
      (SELECT o.km || '|' || o.measured_at FROM odometer_readings o WHERE ${IN} ${R('DESC')}) AS last,
      (SELECT o.km || '|' || o.measured_at || '|' || (o.km_drop_prev IS NOT NULL) FROM odometer_readings o WHERE ${IN} ${R('ASC')}) AS first,
      (SELECT o.km || '|' || o.measured_at FROM odometer_readings o WHERE o.vehicle_id=g.vid AND o.measured_at < ?2 ORDER BY o.measured_at DESC, o.created_at DESC, o.rowid DESC LIMIT 1) AS base
    FROM g WHERE g.n > 0 ORDER BY g.vid, g.m`).bind(...binds).all()).results;
  const split = (x) => (x ? String(x).split('|') : []);
  let curVid = null;
  for (const r of rows) {
    const [lk, la] = split(r.last); const [fk, fa, ff] = split(r.first);
    r.last_km = Number(lk); r.last_at = la;
    const isFirst = r.vehicle_id !== curVid; curVid = r.vehicle_id;
    r.first_km = isFirst ? Number(fk) : null; r.first_at = isFirst ? fa : null;
    if (isFirst && ff === '1') r.dec -= 1; // erste Ablesung des Zeitraums: Vorwert liegt davor
  }
  return rows;
}

// [CLAUDE] Gefahrene km je Fahrzeug im Zeitraum (Berliner Monatsgrenzen, exakt) – dieselbe Regel wie „Fahrleistung je Monat“ der Fahrzeugakte
// (`mileageByMonth`), nur aus gespeicherten Ablesungen, keine Interpolation:
// - Zeitraum: letzte Ablesung im Zeitraum − letzte Ablesung davor (`basis` 'previous'), sofern diese im Monat vor „Von“ liegt.
//   Fehlt sie oder ist sie älter (würde Fahrten vor dem Zeitraum mitzählen), ab der ersten Ablesung im Zeitraum (`basis` 'first_in_period', mind. 2 Ablesungen).
// - Monat (Zeilen/CSV): letzte Ablesung im Monat − letzte Ablesung im Vormonat; sonst kein Wert (wie Akte ohne „seit Ablesung vom …“-Zeiträume).
// - Rückgang irgendwo im betrachteten Abschnitt (z. B. Tachotausch) → kein Wert (`decrease`). Eine Abfrage (Index-Suchen je Fahrzeug und Monat).
export async function periodMileage(env, from, to, vehicleFilter = null) {
  const prevOfFrom = addMonths(`${from}-01`, -1).slice(0, 7);
  const rows = await periodMileageRows(env, from, to, vehicleFilter);
  const by = new Map();
  for (const r of rows) { const a = by.get(r.vehicle_id) || []; a.push(r); by.set(r.vehicle_id, a); }
  const out = new Map();
  for (const [vid, ms] of by) {
    let base = null;
    if (ms[0].base) { const i = ms[0].base.indexOf('|'); const at = ms[0].base.slice(i + 1); base = { km: Number(ms[0].base.slice(0, i)), at, m: berlinDate(at).slice(0, 7) }; }
    const first = ms.find((x) => x.first_at !== null); const last = ms[ms.length - 1];
    const n = ms.reduce((s, x) => s + x.n, 0); const decIn = ms.reduce((s, x) => s + x.dec, 0);
    const useBase = base && base.m >= prevOfFrom;
    let res;
    if (useBase) {
      const dec = decIn > 0 || first.first_km < base.km;
      res = { km: dec ? null : last.last_km - base.km, status: dec ? 'decrease' : 'ok', basis: 'previous', from_at: base.at, to_at: last.last_at };
    } else if (n >= 2) {
      res = { km: decIn > 0 ? null : last.last_km - first.first_km, status: decIn > 0 ? 'decrease' : 'ok', basis: 'first_in_period', from_at: first.first_at, to_at: last.last_at };
    } else res = { km: null, status: 'insufficient', basis: null, from_at: null, to_at: last.last_at };
    // je Monat: Vorwert = letzte Ablesung im Vormonat (im Zeitraum bzw. Ausgangswert vor dem Zeitraum)
    const months = new Map(); const lastOf = new Map(ms.map((x) => [x.m, x]));
    for (const x of ms) {
      const pm = addMonths(`${x.m}-01`, -1).slice(0, 7);
      const p = lastOf.get(pm);
      const start = p ? { km: p.last_km } : (x.m === ms[0].m && base && base.m === pm ? { km: base.km } : null);
      const dec = x.dec > 0 || (x.m === ms[0].m && start && x.first_km < start.km);
      months.set(x.m, start && !dec ? x.last_km - start.km : null);
    }
    out.set(vid, { ...res, months, readings: n });
  }
  return out;
}

// Monatsraten laut Vertrag je Fahrzeug im Zeitraum: je Kalendermonat, der ganz oder teilweise in der Laufzeit liegt
// (Beginn bis „Beendet am“ bzw. Vertragsende; ohne Ende bis heute), höchstens bis zum laufenden Monat – keine Abgrenzung angebrochener Monate,
// keine künftigen Raten. Ohne Vertragsbeginn oder ohne Rate wird nichts gerechnet (nur gezählt) – nie 0 €.
export const monthsBetween = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7)) + 1;
export const COST_DEFINITIONS = {
  month_basis: 'Monatszuordnung (Berliner Kalender): Arbeitszeit nach Arbeitsdatum; Teile und Fremdleistungen nach Erfassungszeitpunkt (nicht Rechnungs- oder Leistungsdatum); Vorgänge nach Meldedatum; Versicherungserstattungen nach Erstattungsdatum; Vertragsraten je vollem Monat der Laufzeit',
  hourly_rate: 'Arbeitszeit mit dem heute eingestellten Stundensatz bewertet (hourly_rate_net) – eine Satzänderung bewertet auch vergangene Monate neu; je Vorgang fortlaufend auf Cent gerundet',
  contract_rate: 'Vertragsraten mit der aktuell hinterlegten Monatsrate für alle Monate der Laufzeit (keine Abgrenzung je Ratenänderung) – bei Ratenänderung Vertrag zum Stichtag beenden und Folgevertrag anlegen',
  retroactive: 'Spätere Erfassungen mit früherem Arbeitsdatum, ersetzte Schätzungen und Ratenänderungen ändern Werte bereits vergangener Monate; Stand zum Abrufzeitpunkt (generated_at)',
  late_items: 'Je Zeile: Arbeitszeit-Positionen (je Vorgang, Monat und Buchungstag), die erst nach Ende des Monats gebucht wurden (Berliner Kalender); in den Einzelpositionen je Buchungstag eigene Zeile (`late`)',
  estimates: 'Geschätzte Positionen getrennt (estimate_net), fehlender Preis/Satz = unbewertet (unvalued_items), nie 0 €',
};
export async function contractCosts(env, from, to, vehicleFilter, plates) {
  const rows = (await env.DB.prepare(`SELECT id, vehicle_id, kind, partner, start_date, end_date, ended_on, monthly_rate_net FROM vehicle_contracts${vehicleFilter ? ' WHERE vehicle_id=?' : ''}`)
    .bind(...(vehicleFilter ? [vehicleFilter] : [])).all()).results;
  const today = berlinDate(); const nowM = today.slice(0, 7);
  const hiM = to < nowM ? to : nowM;
  const per = new Map(); let without_start = 0; let without_rate = 0; let total = 0;
  for (const c of rows) {
    const v = plates.get(c.vehicle_id);
    if (!v || v.eval_excluded) continue;
    // vor Beginn beendet (Storno) – keine Rate (18.10.2026: im selben Monat zählte sonst eine volle Monatsrate)
    if (c.ended_on && c.start_date && c.ended_on < c.start_date) continue;
    // Beginn erst nach heute (z. B. am 25. des laufenden Monats) – noch keine Rate (19.10.2026: zählte bisher eine volle Monatsrate)
    if (c.start_date && c.start_date > today) continue;
    const endM = (c.ended_on || c.end_date || nowM).slice(0, 7);
    if (c.start_date && (c.start_date.slice(0, 7) > hiM || endM < from)) continue; // Laufzeit außerhalb des Zeitraums
    if (!c.start_date) { if (endM >= from) without_start++; continue; }
    if (c.monthly_rate_net === null) { without_rate++; continue; }
    const a = c.start_date.slice(0, 7) > from ? c.start_date.slice(0, 7) : from;
    const b = endM < hiM ? endM : hiM;
    const n = a <= b ? monthsBetween(a, b) : 0;
    if (!n) continue;
    const e = per.get(c.vehicle_id) || { vehicle_id: c.vehicle_id, plate: v.plate, site: v.site, net: 0, contracts: [] };
    e.net += n * c.monthly_rate_net; e.contracts.push({ id: c.id, kind: c.kind, partner: c.partner, months: n, monthly_rate_net: c.monthly_rate_net, net: r2(n * c.monthly_rate_net) });
    per.set(c.vehicle_id, e); total += n * c.monthly_rate_net;
  }
  const vehicles = [...per.values()].map((e) => ({ ...e, net: r2(e.net) })).sort((a, b) => (a.plate || '').localeCompare(b.plate || ''));
  return { until_month: hiM, total_net: vehicles.length ? r2(total) : null, vehicles, without_start, without_rate };
}

// Erstattungen laut Abrechnung des Versicherers, deren Erstattungsdatum im Zeitraum liegt (Monat nach Berliner Kalender = Datum ohne Uhrzeit).
// Nur eingetragene Beträge mit Datum; ruhende Fahrzeuge ausgenommen; Umgebung wie der Vorgang.
export async function claimReimbursements(env, envName, from, to, vehicleFilter, plates) {
  const rows = (await env.DB.prepare(`SELECT ic.case_id, c.case_no, ic.vehicle_id, ic.insurer, ic.claim_no, ic.reimbursed_net, ic.reimbursed_on
    FROM insurance_claims ic JOIN cases c ON c.id=ic.case_id WHERE ic.environment=? AND ic.reimbursed_on >= ? AND ic.reimbursed_on <= ? AND ic.reimbursed_net IS NOT NULL${vehicleFilter ? ' AND ic.vehicle_id=?' : ''}
    ORDER BY ic.reimbursed_on`).bind(...[envName, `${from}-01`, `${to}-31`, ...(vehicleFilter ? [vehicleFilter] : [])]).all()).results;
  const items = rows.filter((r) => { const v = plates.get(r.vehicle_id); return v && !v.eval_excluded; })
    .map((r) => ({ ...r, plate: plates.get(r.vehicle_id).plate }));
  return { total_net: items.length ? r2(items.reduce((a, r) => a + r.reimbursed_net, 0)) : null, items };
}

// CSV für Excel (DE): Semikolon, Dezimalkomma, UTF-8 mit BOM; Formel-Injektion wird neutralisiert
export function costReportCsv(rep) {
  const num = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const cell = csvCell; // gemeinsame Regel: Formelschutz, Anführungszeichen auch bei CR
  const head = ['Kennzeichen', 'FIN-Schlüssel', 'Standort', 'Monat', 'Neue Vorgänge', 'Stunden', 'Arbeitszeit netto', 'Teile netto', 'Teile geschätzt netto',
    'Fremdleistung netto', 'Fremdleistung geschätzt netto', 'Summe belegt netto', 'Summe geschätzt netto', 'Unbewertete Positionen', 'Vollständig bewertet', 'Gefahrene km (Monat)', 'Fahrzeugstatus'];
  const lines = [head.join(';')];
  for (const r of rep.rows) {
    // unbewertet nie als 0: ohne belegte Position bleibt „Summe belegt“ leer (wie „–“ in der App), ebenso Teile/Fremdleistung nur unbewertet
    const ist = r.valued_items === 0 && r.unvalued_items > 0 ? '' : num(r.actual_net);
    lines.push([cell(r.plate), cell(r.vehicle_id), cell(r.site), r.month, r.cases_opened, num(r.hours), num(r.work_net), r.parts_unvalued_only ? '' : num(r.parts_actual_net), num(r.parts_estimate_net),
      r.external_unvalued_only ? '' : num(r.external_actual_net), num(r.external_estimate_net), ist, num(r.estimate_net), r.unvalued_items, r.complete ? 'ja' : 'nein', num(r.km), r.vehicle_active === false ? 'außer Betrieb' : 'aktiv'].join(';'));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// Einzelpositionen des Kostenberichts (Jahresabschluss/Steuerberater, 23.10.2026): je Teil und Fremdleistung eine Zeile mit Lieferant und
// Rechnungsnummer bzw. Beleg, Arbeitszeit je Vorgang und Monat (Betrag fortlaufend gerundet wie im Bericht). Gleiche Monats-, Standort- und
// Ruhend-Regeln wie costReport; „Zählt in Summe“ = nein bei eigenen Stunden/Teilen, die eine Fremdleistung „ersetzt eigene Arbeit/Teile“ abdeckt.
// Unbewertet = leerer Betrag (nie 0). Keine Personen.
export const COST_ITEMS_MAX = 20000;
export async function costItems(env, user, envName, query = {}) {
  if (user && !READ_ROLES.includes(user.role)) throw forbidden();
  const { from, to } = monthRange(query);
  const rate = rateOf((await env.DB.prepare(`SELECT value FROM settings WHERE key='workshop_hourly_rate_net'`).first() || {}).value);
  const lo = new Date(Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, 1) - 86400000).toISOString();
  const hi = new Date(Date.UTC(+to.slice(0, 4), +to.slice(5, 7), 2)).toISOString();
  const covered = new Set((await env.DB.prepare(`SELECT DISTINCT e.case_id FROM external_costs e JOIN cases c ON c.id=e.case_id WHERE c.environment=? AND e.covers_work_and_parts=1`).bind(envName).all()).results.map((x) => x.case_id));
  const work = (await env.DB.prepare(`SELECT w.case_id, c.case_no, c.vehicle_id, w.hours, w.work_date AS d, w.created_at AS rec FROM work_entries w JOIN cases c ON c.id=w.case_id
    WHERE c.environment=? AND w.work_date <= ? AND w.case_id IN (SELECT w2.case_id FROM work_entries w2 WHERE w2.work_date >= ? AND w2.work_date <= ?)`).bind(envName, `${to}-31`, `${from}-01`, `${to}-31`).all()).results;
  const parts = (await env.DB.prepare(`SELECT p.case_id, c.case_no, c.vehicle_id, p.name, p.part_number, p.quantity, p.unit, p.unit_price_net, p.valuation, p.supplier, p.document_ref, p.created_at AS d
    FROM parts p JOIN cases c ON c.id=p.case_id WHERE c.environment=? AND p.created_at >= ? AND p.created_at < ?`).bind(envName, lo, hi).all()).results;
  const ext = (await env.DB.prepare(`SELECT e.case_id, c.case_no, c.vehicle_id, e.supplier, e.invoice_no, e.amount_net, e.valuation, e.covers_work_and_parts, e.note, e.created_at AS d
    FROM external_costs e JOIN cases c ON c.id=e.case_id WHERE c.environment=? AND e.created_at >= ? AND e.created_at < ?`).bind(envName, lo, hi).all()).results;
  const allV = (await env.DB.prepare('SELECT id, plate, site, eval_excluded, active FROM vehicles').all()).results;
  const vmap = new Map(allV.map((v) => [v.id, v]));
  const sel = siteSelection(allV.filter((v) => !v.eval_excluded), query.site);
  const keep = (vid) => { const v = vmap.get(vid); return !!v && !v.eval_excluded && (!query.site || sel.match(v.site)); };
  const inRange = (m) => m >= from && m <= to;
  const dayOf = (d) => (d.length === 10 ? d : berlinDate(d));
  const items = [];
  const base = (x, day) => { const v = vmap.get(x.vehicle_id); return { date: day, month: day.slice(0, 7), case_no: x.case_no, plate: v.plate, site: v.site ? (sel.label.get(siteKey(v.site)) || v.site) : null, vehicle_active: v.active !== 0 }; };
  // Arbeitszeit: je Vorgang und Monat eine Position, Betrag fortlaufend gerundet (Monate eines Vorgangs ergeben den Betrag der Akte)
  const wm = new Map();
  // nach Monatsende gebuchte Arbeitszeit als eigene Position je Buchungstag (Backlog 189: vorher 2 h aus Dezember + im Februar nachgebuchte 3 h
  // als eine Zeile „Erfasst am <Februar>“ – die Dezember-Buchung war nicht mehr zu erkennen); fortlaufende Rundung je Vorgang bleibt
  for (const w of work) { const day = dayOf(w.d); const m = day.slice(0, 7); const rd = w.rec ? berlinDate(w.rec) : ''; const late = !!rd && rd.slice(0, 7) > m;
    const k = `${w.case_id}|${m}|${late ? rd : ''}`; const x = wm.get(k) || { ...w, m, sub: late ? rd : '', late, last: day, h: 0, rec: null }; x.h += w.hours; if (day > x.last) x.last = day; if (w.rec && (!x.rec || w.rec > x.rec)) x.rec = w.rec; wm.set(k, x); }
  const cum = new Map();
  for (const x of [...wm.values()].sort((a, b) => (a.case_id !== b.case_id ? (a.case_id < b.case_id ? -1 : 1) : a.m !== b.m ? (a.m < b.m ? -1 : 1) : a.sub < b.sub ? -1 : a.sub > b.sub ? 1 : 0))) {
    const before = cum.get(x.case_id) || 0; const after = before + x.h; cum.set(x.case_id, after);
    if (!inRange(x.m) || !keep(x.vehicle_id) || !(x.h > 0)) continue;
    // recorded_at: Erfassungszeitpunkt (Arbeitszeit: jüngste Buchung der Position) – nachgereichte Belege erkennbar (23.10.2026)
    items.push({ ...base(x, x.last), recorded_at: x.rec || null, ...(x.late ? { late: true } : {}), type: 'arbeitszeit', description: null, supplier: null, document: null, quantity: r2(x.h), unit: 'h', unit_price_net: rate,
      amount_net: rate === null ? null : r2(r2(after * rate) - r2(before * rate)), valuation: rate === null ? 'unvalued' : 'actual', counted: !covered.has(x.case_id) });
  }
  for (const p of parts) {
    const day = dayOf(p.d); if (!inRange(day.slice(0, 7)) || !keep(p.vehicle_id)) continue;
    const unv = p.unit_price_net === null || p.valuation === 'unvalued';
    items.push({ ...base(p, day), recorded_at: p.d, type: 'teil', description: [p.name, p.part_number].filter(Boolean).join(' · '), supplier: p.supplier || null, document: p.document_ref || null, quantity: p.quantity, unit: p.unit,
      unit_price_net: unv ? null : p.unit_price_net, amount_net: unv ? null : r2(p.quantity * p.unit_price_net), valuation: unv ? 'unvalued' : p.valuation, counted: !covered.has(p.case_id) });
  }
  for (const e of ext) {
    const day = dayOf(e.d); if (!inRange(day.slice(0, 7)) || !keep(e.vehicle_id)) continue;
    const unv = e.amount_net === null || e.valuation === 'unvalued';
    items.push({ ...base(e, day), recorded_at: e.d, type: 'fremdleistung', description: e.covers_work_and_parts ? 'ersetzt eigene Arbeit/Teile' : null, supplier: e.supplier, document: e.invoice_no || null, quantity: null, unit: null,
      unit_price_net: null, amount_net: unv ? null : r2(e.amount_net), valuation: unv ? 'unvalued' : e.valuation, counted: true });
  }
  items.sort((a, b) => a.date.localeCompare(b.date) || String(a.plate).localeCompare(String(b.plate)) || String(a.case_no).localeCompare(String(b.case_no)) || a.type.localeCompare(b.type));
  const truncated = items.length > COST_ITEMS_MAX;
  return { from, to, site: sel.site, items: truncated ? items.slice(0, COST_ITEMS_MAX) : items, truncated };
}

export function costItemsCsv(rep) {
  const num = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const cell = csvCell;
  const ART = { arbeitszeit: 'Arbeitszeit', teil: 'Teil', fremdleistung: 'Fremdleistung' };
  const WERT = { actual: 'belegt', estimate: 'geschätzt', unvalued: 'unbewertet' };
  const lines = [['Datum', 'Monat', 'Vorgang', 'Kennzeichen', 'Standort', 'Fahrzeugstatus', 'Art', 'Bezeichnung', 'Lieferant', 'Rechnung/Beleg', 'Menge', 'Einheit', 'Einzelpreis netto', 'Betrag netto', 'Wertart', 'Zählt in Summe belegt', 'Erfasst am'].join(';')];
  for (const i of rep.items) lines.push([i.date.split('-').reverse().join('.'), i.month, cell(i.case_no), cell(i.plate), cell(i.site), i.vehicle_active ? 'aktiv' : 'außer Betrieb', ART[i.type], cell(i.description), cell(i.supplier), cell(i.document),
    num(i.quantity), cell(i.unit), num(i.unit_price_net), num(i.amount_net), WERT[i.valuation], i.counted ? (i.valuation === 'actual' && i.amount_net !== null ? 'ja' : 'nein') : 'nein (durch Fremdleistung ersetzt)', i.recorded_at ? berlinDateTime(i.recorded_at) : ''].join(';'));
  if (rep.truncated) lines.push(`Gekürzt: nur die ersten ${COST_ITEMS_MAX} Positionen – Zeitraum verkleinern.`);
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

// Kennzahlen als CSV (Excel DE): part=vehicles (je Fahrzeug, alle – die App zeigt nur die ersten 20) oder part=priority (je Dringlichkeit).
// Nur Anzahlen und Dauern in Stunden, keine Personen; leere Zelle = kein Wert (nicht 0).
export function kpiReportCsv(rep, part = 'vehicles') {
  const num = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const cell = csvCell; // gemeinsame Regel: Formelschutz, Anführungszeichen auch bei CR
  const lines = [];
  if (part === 'priority') {
    const st = (x) => [x.n, num(x.median_h), num(x.p90_h)];
    lines.push(['Dringlichkeit', 'Meldungen', 'Freigegeben', 'Abgelehnt', 'Offen', 'Erstbewertung Anzahl', 'Erstbewertung Median h', 'Erstbewertung P90 h',
      'Werkstatt-Übernahme Anzahl', 'Werkstatt-Übernahme Median h', 'Werkstatt-Übernahme P90 h', 'Meldung bis Freigabe Anzahl', 'Meldung bis Freigabe Median h', 'Meldung bis Freigabe P90 h', 'Wartezeit Teile h', 'davon Dubletten', 'davon interne Aufträge', 'davon ohne Reparatur beendet'].join(';'));
    const PL = { niedrig: 'Niedrig', mittel: 'Mittel', kritisch: 'Kritisch', alle: 'Alle' }; // Bezeichnung statt Code (wie die übrigen CSVs)
    for (const p of rep.by_priority) lines.push([PL[p.priority] || p.priority, p.created, p.released, p.rejected, p.open, ...st(p.triage), ...st(p.workshop_ack), ...st(p.created_to_release), num(p.parts_wait_h), p.duplicates || 0, p.internal || 0, p.withdrawn || 0].join(';'));
  } else {
    lines.push(['Kennzeichen', 'FIN-Schlüssel', 'Art', 'Standort', 'Vorgänge', 'Freigegeben', 'Werkstattzeit h', 'Wartezeit Teile h', 'Sperrzeit h', 'davon Dubletten', 'Ausfallzeit h', 'Verfügbarkeit %', 'Ausfall h (Verfügbarkeit)'].join(';'));
    for (const v of rep.vehicles) lines.push([cell(v.plate), cell(v.vehicle_id), v.kind === 'anhaenger' ? 'Anhänger' : 'Lkw', cell(v.site), v.cases, v.released, num(v.workshop_h), num(v.parts_wait_h), num(v.locked_h), v.duplicates || 0, num(v.downtime_h), num(v.availability_pct), num(v.availability_downtime_h)].join(';'));
  }
  return '\ufeff' + lines.join('\r\n') + '\r\n';
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
// Gesamtdauer einer Menge von Zeitabschnitten [a, b] in ms; Überschneidungen zählen einmal
export function unionMs(list) {
  if (!list.length) return 0;
  const s = [...list].sort((x, y) => x[0] - y[0]);
  let sum = 0; let [a, b] = s[0];
  for (const [x, y] of s.slice(1)) { if (x <= b) b = Math.max(b, y); else { sum += b - a; a = x; b = y; } }
  return sum + (b - a);
}
// Sicherheitssperre eines Vorgangs als Zeitabschnitte: ab Meldung mit Sperre bzw. „Sperre setzen“ bis „Sperre aufheben“ oder
// technische Freigabe/Ablehnung (offen bis jetzt). evs: Ereignisse des Vorgangs zeitlich sortiert (action, to_status, created_at, create_payload).
export function lockIntervalsOf(evs, now = Date.now()) {
  const out = []; let lockFrom = null;
  for (const e of evs) {
    const at = Date.parse(e.created_at);
    if (e.action === 'create') { try { if (JSON.parse(e.create_payload || '{}').safety_lock) lockFrom = at; } catch { /* altes Format */ } }
    else if (e.action === 'set_safety_lock' && lockFrom === null) lockFrom = at;
    else if (lockFrom !== null && (e.action === 'lift_safety_lock' || e.to_status === 'fahrzeug_freigegeben' || e.to_status === 'abgelehnt')) { if (at > lockFrom) out.push([lockFrom, at]); lockFrom = null; }
  }
  if (lockFrom !== null && now > lockFrom) out.push([lockFrom, now]);
  return out;
}
// Ausfall eines Vorgangs in der Werkstatt: Übernahme → technische Freigabe/Ablehnung (offen bis jetzt); ohne Übernahme-Zeitstempel keiner
// Beginn = erste Übernahme (auch vor einem Werkstattwechsel – der setzt workshop_ack_at zurück; 18.10.2026: Ausfall sank dadurch auf 0 h)
// 21.10.2026: auch Übernahme durch Buchung (Arbeitszeit/Teil/Restarbeit vor „Übernehmen“, payload.implicit_ack) und die beim Werkstattwechsel
// festgehaltene Übernahme der bisherigen Werkstatt (prev_ack_at) – vorher galt erst das spätere „Reparatur beginnen“ (Ausfall 0 h statt 48 h)
export const FIRST_ACK_SQL = (a) => `COALESCE((SELECT MIN(x) FROM (SELECT e.created_at AS x FROM case_events e WHERE e.case_id=${a}.id AND (e.action IN ('acknowledge','start_repair') OR json_extract(e.payload,'$.implicit_ack'))
    UNION ALL SELECT json_extract(e.payload,'$.prev_ack_at') FROM case_events e WHERE e.case_id=${a}.id AND e.action='reassign_workshop' AND json_extract(e.payload,'$.prev_ack_at') IS NOT NULL
    UNION ALL SELECT ${a}.workshop_ack_at WHERE ${a}.workshop_ack_at IS NOT NULL)), ${a}.workshop_ack_at) AS first_ack_at`;
export function workshopIntervalOf(c, now = Date.now()) {
  const ack = c.first_ack_at || c.workshop_ack_at;
  if (!ack) return null;
  const a = Date.parse(ack);
  const b = c.status === 'fahrzeug_freigegeben' || c.status === 'abgelehnt' ? (c.closed_at ? Date.parse(c.closed_at) : NaN) : now;
  return Number.isFinite(a) && Number.isFinite(b) && b > a ? [a, b] : null;
}
// Ausfallstunden je Berliner Kalendermonat (months: ['JJJJ-MM', …]); Abschnitte an Monatsgrenzen geteilt, Überschneidungen einmal
export function downtimeByMonth(intervals, months, now = Date.now()) {
  return months.map((m) => {
    const y = +m.slice(0, 4); const mo = +m.slice(5, 7);
    const lo = Date.parse(berlinDayStartIso(`${m}-01`));
    const hi = Math.min(now, Date.parse(berlinDayStartIso(mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`)));
    const clipped = intervals.map(([a, b]) => [Math.max(a, lo), Math.min(b, hi)]).filter(([a, b]) => b > a);
    return { month: m, hours: r1(unionMs(clipped) / H) };
  });
}
// [CLAUDE] Technische Verfügbarkeit der Flotte im Zeitraum (16.10.2026): Fahrzeugstunden gegen Ausfallstunden aus gespeicherten Zeitstempeln.
// Anders als die Ausfallzeit je Fahrzeug (Vorgänge, die im Zeitraum gemeldet wurden) zählen hier alle Vorgänge, die in den Zeitraum
// hineinreichen – zugeschnitten auf den Zeitraum, damit die Quote nie über den Zeitraum hinaus rechnet. Nichts geschätzt.
export async function fleetAvailability(env, envName, from, to, vehicles, now = Date.now()) {
  const y = +to.slice(0, 4); const mo = +to.slice(5, 7);
  const lo = Date.parse(berlinDayStartIso(`${from}-01`));
  const hi = Math.min(now, Date.parse(berlinDayStartIso(mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`)));
  if (!(hi > lo) || !vehicles.length) return null;
  const vStart = new Map(); const vEnd = new Map();
  // außer Betrieb genommene Fahrzeuge (Backlog 188, Fahrzeugverkauf): bis zur Außerbetriebnahme (`ended_ms`) – vorher fielen sie auch aus
  // vergangenen Zeiträumen heraus (Ausfall im September verschwand nach dem Verkauf im Oktober aus der Septemberquote)
  for (const v of vehicles) { const c = Date.parse(v.created_at); const a = Number.isFinite(c) ? Math.max(lo, c) : lo; const z = Number.isFinite(v.ended_ms) ? Math.min(hi, v.ended_ms) : hi; if (z > a) { vStart.set(v.id, a); vEnd.set(v.id, z); } }
  if (!vStart.size) return null;
  const loIso = new Date(lo).toISOString(); const hiIso = new Date(hi).toISOString();
  const cs = (await env.DB.prepare(`SELECT id, vehicle_id, status, workshop_ack_at, ${FIRST_ACK_SQL('cases')}, closed_at FROM cases WHERE environment=? AND vehicle_id IN (SELECT value FROM json_each(?))
    AND created_at < ? AND (closed_at IS NULL OR closed_at > ? OR status NOT IN ('fahrzeug_freigegeben','abgelehnt'))`).bind(envName, JSON.stringify([...vStart.keys()]), hiIso, loIso).all()).results;
  const evs = cs.length ? (await env.DB.prepare(`SELECT case_id, action, to_status, created_at, CASE WHEN action='create' THEN payload END AS create_payload FROM case_events
    WHERE case_id IN (SELECT value FROM json_each(?)) AND (action IN ('create','set_safety_lock','lift_safety_lock') OR to_status IN ('fahrzeug_freigegeben','abgelehnt')) ORDER BY case_id, created_at`)
    .bind(JSON.stringify(cs.map((c) => c.id))).all()).results : [];
  const evBy = new Map();
  for (const e of evs) { if (!evBy.has(e.case_id)) evBy.set(e.case_id, []); evBy.get(e.case_id).push(e); }
  const ivs = new Map();
  for (const c of cs) {
    const a0 = vStart.get(c.vehicle_id);
    const list = [...lockIntervalsOf(evBy.get(c.id) || [], now)]; const w = workshopIntervalOf(c, now); if (w) list.push(w);
    for (const [a, b] of list) { const x = Math.max(a, a0); const z = Math.min(b, vEnd.get(c.vehicle_id)); if (z > x) { if (!ivs.has(c.vehicle_id)) ivs.set(c.vehicle_id, []); ivs.get(c.vehicle_id).push([x, z]); } }
  }
  let vh = 0; let dh = 0; const by_vehicle = [];
  for (const v of vehicles) {
    if (!vStart.has(v.id)) continue;
    const span = (vEnd.get(v.id) - vStart.get(v.id)) / H; const d = unionMs(ivs.get(v.id) || []) / H;
    vh += span; dh += d;
    by_vehicle.push({ vehicle_id: v.id, plate: v.plate || null, downtime_h: r1(d), pct: Math.round(1000 * (1 - d / span)) / 10 });
  }
  by_vehicle.sort((a, b) => a.pct - b.pct || b.downtime_h - a.downtime_h || String(a.plate).localeCompare(String(b.plate)));
  return { vehicles: by_vehicle.length, vehicle_h: r1(vh), downtime_h: r1(dh), pct: Math.round(1000 * (1 - dh / vh)) / 10, by_vehicle };
}
const stat = (arr) => ({ n: arr.length, median_h: r1(quantile(arr, 0.5)), p90_h: r1(quantile(arr, 0.9)) });

export async function kpiReport(env, user, envName, query = {}) {
  if (!READ_ROLES.includes(user.role)) throw forbidden();
  const { from, to } = monthRange(query);
  const lo = new Date(Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, 1) - 86400000).toISOString();
  const hi = new Date(Date.UTC(+to.slice(0, 4), +to.slice(5, 7), 2)).toISOString();
  // Fahrzeugstamm einmal laden (Kennzeichen, Art, Standort laut Stamm) – auch für den Fahrzeug-Standortfilter
  const plates = new Map((await env.DB.prepare('SELECT id, plate, kind, site, eval_excluded, active, created_at FROM vehicles').all()).results.map((v) => [v.id, v]));
  const vSel = siteSelection([...plates.values()].filter((v) => !v.eval_excluded), query.vsite);
  const vehicle_sites = vSel.options; const vehicle_site = vSel.site;
  const vOk = (vid) => vSel.match((plates.get(vid) || {}).site);
  const allCases = (await env.DB.prepare(`SELECT c.id, c.vehicle_id, c.priority, c.status, c.duplicate_of, c.origin, c.workshop_site, c.created_at, c.fleet_received_at, c.workshop_ack_at, ${FIRST_ACK_SQL('c')}, c.closed_at FROM cases c
    JOIN vehicles v ON v.id=c.vehicle_id AND v.eval_excluded=0
    WHERE c.environment=? AND c.created_at >= ? AND c.created_at < ?`).bind(envName, lo, hi).all()).results
    .filter((c) => { const m = berlinDate(c.created_at).slice(0, 7); return m >= from && m <= to && vOk(c.vehicle_id); });
  // optional je Werkstatt-Standort (Werkstatt des Vorgangs; „ohne“ = noch keiner Werkstatt zugeordnet) – Standorte des Zeitraums zur Auswahl
  const sites = [...new Set(allCases.map((c) => c.workshop_site || 'ohne'))].sort();
  const site = query.site ? String(query.site).slice(0, 20) : null;
  const cases = site ? allCases.filter((c) => (c.workshop_site || 'ohne') === site) : allCases;
  const ids = cases.map((c) => c.id);
  const events = ids.length ? (await env.DB.prepare(`SELECT case_id, action, to_status, created_at, CASE WHEN action='create' THEN payload END AS create_payload, CASE WHEN action IN ('wait_parts','set_parts_eta') THEN payload END AS parts_payload FROM case_events WHERE case_id IN (SELECT value FROM json_each(?)) ORDER BY case_id, created_at`)
    .bind(JSON.stringify(ids)).all()).results : [];
  const evBy = new Map();
  for (const e of events) { if (!evBy.has(e.case_id)) evBy.set(e.case_id, []); evBy.get(e.case_id).push(e); }
  const now = Date.now();
  const groups = {}; const byVehicle = new Map();
  const today = berlinDate();
  const pNew = () => ({ kept: 0, late: 0, without_eta: 0, open_overdue: 0, late_days: [] });
  const parts = pNew(); const partsSites = new Map();
  const partsBy = (site) => { const k = site || 'ohne'; if (!partsSites.has(k)) partsSites.set(k, pNew()); return partsSites.get(k); };
  const locks = new Map(); // je Fahrzeug Sperrabschnitte; überlappende Sperren mehrerer Vorgänge zählen einmal
  // Sperr-/Ausfallzeit je Fahrzeug höchstens bis Zeitraumende (20.10.2026: offener Vorgang aus September zeigte „Ausfall 20,8 Tage“
  // neben „Verfügbarkeit 95,1 %“ – Ausfall lief bis heute weiter)
  const periodEnd = Date.parse(berlinDayStartIso(addMonths(to + '-01', 1)));
  const clipEnd = (b) => Math.min(b, periodEnd);
  const addLock = (vid, a, b0) => { const b = clipEnd(b0); if (b > a) { if (!locks.has(vid)) locks.set(vid, []); locks.get(vid).push([a, b]); } };
  // Werkstattzeit (freigegebene Aufträge) und Ausfallzeit (Werkstatt-Übernahme → Freigabe/Ablehnung, offen bis jetzt, plus Sperrzeit) je Fahrzeug
  // als Zeitabschnitte – parallele Aufträge am selben Fahrzeug zählen einmal (16.10.2026: Werkstattzeit wurde vorher je Auftrag addiert)
  const shop = new Map(); const down = new Map(); const pwait = new Map();
  const addIv = (m, vid, a, b) => { if (Number.isFinite(a) && Number.isFinite(b) && b > a) { if (!m.has(vid)) m.set(vid, []); m.get(vid).push([a, b]); } };
  // Kostenfreigaben: je Überschreitung (Ereignis „cost_limit_exceeded“) bis „Kosten freigeben“ – nur Anzahl und Dauer, keine Beträge
  const ca = { exceeded: 0, approved: 0, pending: 0, closed_without: 0, cleared: 0, cases: 0, wait: [] };
  const g = (k) => groups[k] || (groups[k] = { created: 0, internal: 0, released: 0, rejected: 0, duplicates: 0, withdrawn: 0, open: 0, triage: [], ack: [], total: [], parts_wait_h: 0 });
  for (const c of cases) {
    const evs = evBy.get(c.id) || [];
    const t0 = Date.parse(c.created_at);
    const approved = evs.find((e) => e.to_status === 'werkstatt_freigegeben');
    // Teile-Wartezeit: Summe der Abschnitte im Status „wartet_teile“ (offener Abschnitt bis jetzt)
    // je Fahrzeug zusätzlich als Abschnitte (parallele Aufträge desselben Fahrzeugs zählen dort einmal, wie Werkstatt-/Ausfallzeit; 18.10.2026)
    let wait = 0; let since = null;
    for (const e of evs) {
      if (e.to_status === 'wartet_teile' && since === null) since = Date.parse(e.created_at);
      else if (since !== null && e.to_status && e.to_status !== 'wartet_teile') { const b = clipEnd(Date.parse(e.created_at)); if (b > since) wait += b - since; addIv(pwait, c.vehicle_id, since, b); since = null; }
    }
    // höchstens bis Zeitraumende wie Ausfall-/Sperrzeit (20.10.2026: offener Abschnitt aus September zählte 960 h Teile-Wartezeit im 720-h-Monat)
    if (since !== null) { const b = clipEnd(now); if (b > since) wait += b - since; addIv(pwait, c.vehicle_id, since, b); }
    // Termintreue Teile: je Abschnitt „wartet auf Teile“ der zuletzt gesetzte Liefertermin (laut Werkstatt) gegen das Ende des Abschnitts
    // (Reparatur fortgesetzt) nach Berliner Datum. Ohne Liefertermin nur gezählt; offener Abschnitt nur, wenn der Termin schon vorbei ist.
    let seg = null;
    const closeSeg = (endAt) => {
      const pw = partsBy(c.workshop_site);
      for (const x of [parts, pw]) {
        if (!seg.eta) { x.without_eta++; continue; }
        if (endAt === null) { if (seg.eta < today) x.open_overdue++; continue; }
        const late = Math.round((Date.parse(berlinDate(endAt)) - Date.parse(seg.eta)) / 86400000);
        if (late <= 0) x.kept++; else { x.late++; x.late_days.push(late); }
      }
      seg = null;
    };
    for (const e of evs) {
      let pl = null; if (e.parts_payload) { try { pl = JSON.parse(e.parts_payload); } catch { pl = null; } }
      if (e.to_status === 'wartet_teile' && seg === null) seg = { eta: (pl && pl.parts_expected_date) || null };
      else if (seg && e.action === 'set_parts_eta') seg.eta = (pl && pl.to) || null;
      else if (seg && e.to_status && e.to_status !== 'wartet_teile') closeSeg(e.created_at);
    }
    if (seg) closeSeg(null);
    for (const [a, b] of lockIntervalsOf(evs, now)) addLock(c.vehicle_id, a, b);
    let costFrom = null; let costHit = false;
    for (const e of evs) {
      if (e.action === 'cost_limit_exceeded') { if (costFrom === null) { costFrom = Date.parse(e.created_at); ca.exceeded++; costHit = true; } }
      else if (e.action === 'approve_costs' && costFrom !== null) { ca.approved++; ca.wait.push((Date.parse(e.created_at) - costFrom) / H); costFrom = null; }
      // Markierung aufgehoben (Grenze angehoben/gelöscht, revalidateCostMarks) – keine offene Freigabe mehr (21.10.2026: blieb „ausstehend“)
      else if (e.action === 'cost_limit_cleared' && costFrom !== null) { ca.cleared++; costFrom = null; }
    }
    if (costFrom !== null) { if (c.status === 'fahrzeug_freigegeben' || c.status === 'abgelehnt') ca.closed_without++; else ca.pending++; }
    if (costHit) ca.cases++;
    const workshop = approved && c.closed_at && c.status === 'fahrzeug_freigegeben' ? Date.parse(c.closed_at) - Date.parse(approved.created_at) : null;
    for (const k of [c.priority, 'alle']) {
      const x = g(k); x.created++;
      if (c.status === 'fahrzeug_freigegeben') x.released++; else if (c.status === 'abgelehnt') { x.rejected++; if (c.duplicate_of) x.duplicates++; if (c.workshop_site) x.withdrawn++; } else x.open++; // abgelehnt mit Werkstatt = „ohne Reparatur beendet“ (Backlog 211; „Ablehnen“ gibt es nur vor der Freigabe)
      // interne Aufträge (Prüftermin, Prüfmangel, Winterreifen) legt die Leitung selbst an und gibt sie sofort frei: keine Erstbewertung,
      // Vorlauf bis zum Termin ist keine Durchlaufzeit (zogen den Median sonst auf 0 h, 18.10.2026)
      const internal = c.origin === 'wartung'; if (internal) x.internal++;
      if (c.fleet_received_at && !internal) x.triage.push((Date.parse(c.fleet_received_at) - t0) / H);
      // erste Übernahme (wie Ausfallzeit; 18.10.2026: nach Werkstattwechsel zählte die Zeit der ersten Werkstatt der zweiten zu bzw. fiel weg)
      if (approved && c.first_ack_at) x.ack.push((Date.parse(c.first_ack_at) - Date.parse(approved.created_at)) / H);
      if (c.status === 'fahrzeug_freigegeben' && c.closed_at && !internal) x.total.push((Date.parse(c.closed_at) - t0) / H);
      x.parts_wait_h += wait / H;
    }
    const v = byVehicle.get(c.vehicle_id) || { vehicle_id: c.vehicle_id, cases: 0, released: 0, duplicates: 0, workshop_h: 0, parts_wait_h: 0, locked_h: 0, downtime_h: 0 };
    v.cases++; if (c.status === 'fahrzeug_freigegeben') v.released++; if (c.status === 'abgelehnt' && c.duplicate_of) v.duplicates++;
    if (workshop !== null) addIv(shop, c.vehicle_id, Date.parse(approved.created_at), clipEnd(Date.parse(c.closed_at))); // höchstens bis Zeitraumende wie Ausfall/Sperre (20.10.2026: 959 h in einem 720-h-Monat)
    { const iv = workshopIntervalOf(c, now); if (iv) addIv(down, c.vehicle_id, iv[0], clipEnd(iv[1])); }
    byVehicle.set(c.vehicle_id, v);
  }
  for (const [vid, list] of locks) { byVehicle.get(vid).locked_h = unionMs(list) / H; for (const iv of list) addIv(down, vid, iv[0], iv[1]); }
  for (const [vid, list] of shop) byVehicle.get(vid).workshop_h = unionMs(list) / H;
  for (const [vid, list] of down) byVehicle.get(vid).downtime_h = unionMs(list) / H;
  for (const [vid, list] of pwait) byVehicle.get(vid).parts_wait_h = unionMs(list) / H;
  // außer Betrieb genommene: Ende = letzte Außerbetriebnahme laut Protokoll (wie `inactive_info`); ohne Protokolleintrag weiter nicht gezählt
  const offIds = [...plates.values()].filter((v) => !v.active && !v.eval_excluded && vOk(v.id)).map((v) => v.id);
  const offEnd = new Map(offIds.length && !site ? (await env.DB.prepare(`SELECT target, MAX(created_at) AS at FROM audit_log WHERE action='vehicle.deactivate' AND target IN (SELECT value FROM json_each(?)) GROUP BY target`)
    .bind(JSON.stringify(offIds)).all()).results.map((r) => [r.target, Date.parse(r.at)]) : []);
  const availability = site ? null : await fleetAvailability(env, envName, from, to, [...plates.values()].filter((v) => !v.eval_excluded && vOk(v.id) && (v.active || offEnd.has(v.id)))
    .map((v) => (v.active ? v : { ...v, ended_ms: offEnd.get(v.id) })), now);
  const avBy = new Map(availability ? availability.by_vehicle.map((x) => [x.vehicle_id, x]) : []);
  // Fahrzeuge, die nur mit Ausfall aus früheren Vorgängen in den Zeitraum reichen (z. B. seit dem Vormonat in der Werkstatt), als eigene Zeile –
  // sonst fehlten sie in Liste/CSV und die Ausfallstunden der Zeilen ergaben nicht die Flottenquote (22.10.2026, Fund Teilagent „Nachrechnung“)
  for (const x of avBy.values()) if ((x.downtime_h > 0 || x.pct < 100) && !byVehicle.has(x.vehicle_id)) byVehicle.set(x.vehicle_id, { vehicle_id: x.vehicle_id, cases: 0, released: 0, duplicates: 0, workshop_h: 0, parts_wait_h: 0, locked_h: 0, downtime_h: 0 });
  const order = ['kritisch', 'mittel', 'niedrig', 'alle'];
  const by_priority = order.filter((k) => groups[k]).map((k) => {
    const x = groups[k];
    return { priority: k, created: x.created, internal: x.internal, released: x.released, rejected: x.rejected, duplicates: x.duplicates, withdrawn: x.withdrawn, open: x.open, triage: stat(x.triage), workshop_ack: stat(x.ack), created_to_release: stat(x.total), parts_wait_h: r1(x.parts_wait_h) };
  });
  // Zeile „alle“ = Summe der gerundeten Dringlichkeiten (sonst 0 + 0 = 0,1 durch Rundung, 18.10.2026)
  { const all = by_priority.find((x) => x.priority === 'alle'); if (all) all.parts_wait_h = r1(by_priority.filter((x) => x.priority !== 'alle').reduce((a, x) => a + x.parts_wait_h, 0)); }
  const vehicles = [...byVehicle.values()].map((v) => ({ ...v, plate: plates.get(v.vehicle_id)?.plate || null, kind: plates.get(v.vehicle_id)?.kind || null, site: plates.get(v.vehicle_id)?.site ? (vSel.label.get(siteKey(plates.get(v.vehicle_id).site)) || plates.get(v.vehicle_id).site) : null, workshop_h: r1(v.workshop_h), parts_wait_h: r1(v.parts_wait_h), locked_h: r1(v.locked_h), downtime_h: r1(v.downtime_h), availability_pct: avBy.has(v.vehicle_id) ? avBy.get(v.vehicle_id).pct : null,
    // Ausfallstunden der Verfügbarkeit (alle Vorgänge, die in den Zeitraum hineinreichen) – „Ausfallzeit h“ zählt nur Vorgänge aus dem Zeitraum (20.10.2026)
    availability_downtime_h: avBy.has(v.vehicle_id) ? avBy.get(v.vehicle_id).downtime_h : null }))
    .sort((a, b) => b.workshop_h - a.workshop_h || b.cases - a.cases || (b.availability_downtime_h || 0) - (a.availability_downtime_h || 0));
  const pOut = (x) => ({ kept: x.kept, late: x.late, without_eta: x.without_eta, open_overdue: x.open_overdue,
    on_time_pct: x.kept + x.late ? Math.round((100 * x.kept) / (x.kept + x.late)) : null, late_days_median: x.late_days.length ? r1(quantile(x.late_days, 0.5)) : null });
  const parts_eta = { ...pOut(parts), by_site: [...partsSites.entries()].map(([site, x]) => ({ site, ...pOut(x) })).sort((a, b) => a.site.localeCompare(b.site)) };
  const cost_approvals = { exceeded: ca.exceeded, approved: ca.approved, pending: ca.pending, closed_without: ca.closed_without, cleared: ca.cleared, cases: ca.cases, to_approval: stat(ca.wait) };
  // Mängelbeseitigung aus Prüfungen: Prüfungen des Zeitraums (Prüfdatum, Berliner Monat) mit erheblichen/gefährlichen Mängeln bzw. verkehrsunsicher;
  // je Prüfung jüngster nicht abgelehnter Mängelauftrag der Umgebung und nächste spätere Durchführung derselben Prüfart. Dauer in Tagen (Prüfdatum → Freigabe).
  const DEF = `('erhebliche_maengel','gefaehrliche_maengel','verkehrsunsicher')`;
  const cSub = (col) => `(SELECT c.${col} FROM cases c WHERE c.maintenance_event_id=e.id AND c.environment=?1 AND c.status<>'abgelehnt' ORDER BY c.created_at DESC LIMIT 1)`;
  const nSub = (col) => `(SELECT x.${col} FROM maintenance_events x WHERE x.vehicle_id=e.vehicle_id AND x.kind=e.kind AND x.id<>e.id AND (x.done_date > e.done_date OR (x.done_date = e.done_date AND x.created_at > e.created_at)) ORDER BY x.done_date, x.created_at LIMIT 1)`;
  const dRows = (await env.DB.prepare(`SELECT e.vehicle_id, e.done_date, ${cSub('status')} AS c_status, ${cSub('closed_at')} AS c_closed, ${cSub('workshop_site')} AS c_site, ${nSub('done_date')} AS n_date, ${nSub('result')} AS n_result, v.active AS v_active
    FROM maintenance_events e JOIN vehicles v ON v.id=e.vehicle_id AND v.eval_excluded=0 WHERE e.result IN ${DEF} AND e.done_date >= ?2 AND e.done_date <= ?3`)
    .bind(envName, `${from}-01`, `${to}-31`).all()).results.filter((r) => vOk(r.vehicle_id) && (!site || (r.c_status && (r.c_site || 'ohne') === site)));
  // ohne Auftrag, aber überholt (spätere Durchführung derselben Prüfart, z. B. extern behoben und nachgeprüft) bzw. Fahrzeug außer Betrieb:
  // nicht „ohne Auftrag“ (rot), sondern eigene Zahl – wie Datenqualität/„Heute zu tun“ (18.10.2026)
  const settled = (r) => !r.c_status && (!!r.n_date || !r.v_active);
  const dd = { inspections: dRows.length, without_order: site ? null : dRows.filter((r) => !r.c_status && !settled(r)).length, settled_without_order: site ? null : dRows.filter(settled).length, ordered: dRows.filter((r) => r.c_status).length,
    released: 0, open: 0, reinspected: 0, defects_again: 0, days: [] };
  for (const r of dRows) {
    if (r.n_date) { dd.reinspected++; if (DEF.includes(`'${r.n_result}'`)) dd.defects_again++; } // Nachprüfung auch ohne Auftrag zählen
    if (!r.c_status) continue;
    if (r.c_status === 'fahrzeug_freigegeben' && r.c_closed) { dd.released++; dd.days.push(Math.max(0, Math.round((Date.parse(berlinDate(r.c_closed)) - Date.parse(r.done_date)) / 86400000))); } else dd.open++;
  }
  const inspection_defects = { inspections: dd.inspections, without_order: dd.without_order, settled_without_order: dd.settled_without_order, ordered: dd.ordered, released: dd.released, open: dd.open, reinspected: dd.reinspected, defects_again: dd.defects_again,
    to_release_days: { n: dd.days.length, median_d: r1(quantile(dd.days, 0.5)), p90_d: r1(quantile(dd.days, 0.9)) } };
  return { from, to, environment: envName, site, sites, vehicle_site, vehicle_sites, by_priority, vehicles, generated_at: new Date().toISOString(), availability: availability ? { ...availability, by_vehicle: undefined, lowest: availability.by_vehicle.filter((x) => x.downtime_h > 0 || x.pct < 100).slice(0, 5) } : null, parts_eta, cost_approvals, inspection_defects,
    definitions: { status_basis: 'Vorgänge nach Meldemonat; Status (offen/freigegeben/abgelehnt), Dauern, ausstehende Kostenfreigaben und überschrittene Liefertermine zum Abrufzeitpunkt (generated_at) – spätere Freigaben ändern auch Werte vergangener Monate', duplicates: 'Teilmenge von „abgelehnt“: als Dublette eines anderen Vorgangs abgelehnte Meldungen (keine echte Ablehnung)', triage: 'Meldung → Eingang bestätigt (Fuhrparkleitung); ohne interne Aufträge (Prüftermin, Prüfmangel, Winterreifen – von der Leitung selbst angelegt)', internal: 'Teilmenge von „Vorgänge“: interne Aufträge der Leitung (Prüftermin, Prüfmangel, Winterreifen); nicht in Erstbewertung und „Meldung → Freigabe“', workshop_ack: 'Werkstattfreigabe → erste Übernahme durch eine Werkstatt', created_to_release: 'Meldung → technische Freigabe (nur freigegebene, ohne interne Aufträge)', workshop_h: 'Werkstattfreigabe → technische Freigabe je Fahrzeug (nur freigegebene Aufträge, höchstens bis Zeitraumende; parallele Aufträge am selben Fahrzeug zählen einmal)', availability_downtime_h: 'Ausfallstunden der technischen Verfügbarkeit je Fahrzeug (alle Vorgänge, die in den Zeitraum hineinreichen; Grundlage von „Verfügbarkeit %“)', downtime_h: 'Ausfallzeit je Fahrzeug: Werkstatt-Übernahme → technische Freigabe bzw. Ablehnung (offen bis jetzt, höchstens bis Zeitraumende) und Zeit mit Sicherheitssperre zusammen, Überschneidungen einmal; Vorgänge aus dem Zeitraum, ohne Übernahme-Zeitstempel nicht gezählt', parts_wait_h: 'Zeit im Status „wartet auf Teile“', locked_h: 'Zeit mit Sicherheitssperre je Fahrzeug (Meldung bzw. Sperre → Aufhebung/Freigabe, höchstens bis Zeitraumende; Überschneidungen einmal), Vorgänge aus dem Zeitraum', parts_eta: 'Je Abschnitt „wartet auf Teile“: zuletzt gesetzter Liefertermin gegen „Reparatur fortgesetzt“ (Berliner Datum); eingehalten = am oder vor dem Termin; ohne Termin nur gezählt; offen mit vergangenem Termin = überschritten (offen)', cost_approvals: 'Je Überschreitung der Kosten-Freigabegrenze bis „Kosten freigeben“ (Stunden); ausstehend = Vorgang offen ohne Freigabe; ohne Freigabe abgeschlossen = Vorgang freigegeben/abgelehnt ohne Kostenfreigabe; keine Beträge', inspection_defects: 'Prüfungen mit Prüfdatum im Zeitraum und erheblichen/gefährlichen Mängeln bzw. verkehrsunsicher; Mängelauftrag = jüngster nicht abgelehnter Auftrag zur Prüfung; Dauer = Prüfdatum → technische Freigabe des Auftrags (Tage, Berliner Datum); Nachprüfung = nächste spätere Durchführung derselben Prüfart; ohne Auftrag erledigt = ohne Mängelauftrag, aber später erneut durchgeführt oder Fahrzeug außer Betrieb (nicht „ohne Auftrag“); mit Standortfilter nur Prüfungen mit Auftrag an diesen Standort', availability: 'Technische Verfügbarkeit: 100 % minus Ausfallstunden (Werkstatt-Übernahme → technische Freigabe/Ablehnung, offen bis jetzt, und Sicherheitssperre; je Fahrzeug Überschneidungen einmal) durch Fahrzeugstunden im Zeitraum (Monatsbeginn bis Monatsende bzw. jetzt, Berliner Zeit; frühestens ab Anlage des Fahrzeugs). Alle Vorgänge, die in den Zeitraum hineinreichen, auf den Zeitraum zugeschnitten. Aktive Fahrzeuge laut Stamm, außer Betrieb genommene bis zur Außerbetriebnahme (Protokoll), ohne von der Bewertung ausgenommene; Werkstattaufenthalte ohne Vorgang in der App sind nicht erfasst. Mit Werkstattfilter nicht berechnet', vehicle_site: 'Standort laut Fahrzeugstamm (aktueller Stand, Schreibweisen zusammengefasst); wirkt auf Vorgänge und Prüfungen; kombinierbar mit dem Werkstattfilter' } };
}

// Werkstatt-Auslastung als CSV (Excel DE): eine Zeile je Standort und Kalenderwoche (älteste zuerst), offene Aufträge je Status
// als aktueller Stand nur in der jüngsten Woche (sonst leer – es gibt keinen gespeicherten Wochenstand). Keine Personen.
const OPEN_DE = { werkstatt_freigegeben: 'Offen: zur Übernahme', in_reparatur: 'Offen: in Reparatur', wartet_teile: 'Offen: wartet auf Teile', abschlusskontrolle: 'Offen: Abschlusskontrolle' };
export function workshopLoadCsv(rep) {
  const num = (x) => String(x).replace('.', ',');
  const cell = csvCell; // gemeinsame Regel: Formelschutz, Anführungszeichen auch bei CR
  const last = rep.weeks[rep.weeks.length - 1];
  const lines = [['Standort', 'Werkstatt-Code', 'Kalenderwoche', 'Stunden', 'Übernommen', 'Freigegeben', ...rep.open_statuses.map((st) => OPEN_DE[st] || st)].join(';')];
  for (const s of rep.sites) for (const w of s.weeks) {
    lines.push([cell(s.site === 'ohne' ? 'ohne Werkstatt' : s.name), cell(s.site), w.week, num(w.hours), w.acknowledged, w.released, ...rep.open_statuses.map((st) => (w.week === last ? s.open[st] || 0 : ''))].join(';'));
  }
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

// ---- Werkstatt-Auslastung je Standort und Kalenderwoche (ohne Auswertung je Person) ----
// Stunden = Summe erfasster Arbeitszeit, gebucht für den Standort (Arbeitstag), übernommen = workshop_ack_at (+ Übernahmen vor einem Werkstattwechsel), freigegeben = closed_at.
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
  const weeks = intParam(query.weeks, 8, 1, 52);
  const today = berlinDate();
  const startDate = new Date(Date.parse(today + 'T00:00:00Z') - ((new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7) * 86400000 - (weeks - 1) * 7 * 86400000).toISOString().slice(0, 10);
  const siteFilter = user.role === 'workshop' ? user.workshop_site : null;
  const sf = siteFilter ? ' AND c.workshop_site=?' : '';
  const args = (extra) => (siteFilter ? [envName, extra, siteFilter] : [envName, extra]);
  // Stunden beim Standort der Buchung (w.site, Migration 0060; ältere Buchungen beim Auftragsstandort) – nach einem Werkstattwechsel
  // zählten sie sonst bei der neuen Werkstatt (18.10.2026); Übernahmen der bisherigen Werkstatt aus dem Wechsel-Ereignis (prev_ack_at)
  const wsf = siteFilter ? ' AND COALESCE(w.site, c.workshop_site)=?' : '';
  const [hours, acks, closed, open, sites, prevAcks] = await Promise.all([
    env.DB.prepare(`SELECT COALESCE(w.site, c.workshop_site) AS site, w.work_date AS d, SUM(w.hours) AS h FROM work_entries w JOIN cases c ON c.id=w.case_id
      WHERE c.environment=? AND w.work_date >= ?${wsf} GROUP BY COALESCE(w.site, c.workshop_site), w.work_date`).bind(...args(startDate)).all(),
    // Zeitpunkte (UTC) ab Beginn des Berliner Montags – vorher fehlten Übernahmen/Freigaben Mo 00:00–02:00 der ersten Woche (17.10.2026)
    env.DB.prepare(`SELECT c.workshop_site AS site, c.workshop_ack_at AS t FROM cases c WHERE c.environment=? AND c.workshop_ack_at >= ?${sf}`).bind(...args(berlinDayStartIso(startDate))).all(),
    env.DB.prepare(`SELECT c.workshop_site AS site, c.closed_at AS t FROM cases c WHERE c.environment=? AND c.status='fahrzeug_freigegeben' AND c.closed_at >= ?${sf} AND c.workshop_site IS NOT NULL`).bind(...args(berlinDayStartIso(startDate))).all(),
    env.DB.prepare(`SELECT c.workshop_site AS site, c.status, COUNT(*) AS n FROM cases c WHERE c.environment=? AND c.status IN (${OPEN_WS.map(() => '?').join(',')})${sf} GROUP BY c.workshop_site, c.status`)
      .bind(envName, ...OPEN_WS, ...(siteFilter ? [siteFilter] : [])).all(),
    env.DB.prepare('SELECT code, name FROM workshops WHERE active=1').all(),
    env.DB.prepare(`SELECT json_extract(e.payload,'$.from') AS site, json_extract(e.payload,'$.prev_ack_at') AS t FROM case_events e
      WHERE e.environment=? AND e.action='reassign_workshop' AND json_extract(e.payload,'$.prev_ack_at') >= ?${siteFilter ? " AND json_extract(e.payload,'$.from')=?" : ''}`).bind(...args(berlinDayStartIso(startDate))).all(),
  ]);
  const weekList = []; for (let i = 0; i < weeks; i++) weekList.push(isoWeek(new Date(Date.parse(startDate + 'T00:00:00Z') + i * 7 * 86400000).toISOString().slice(0, 10)));
  const bySite = new Map();
  const site = (code) => { const k = code || 'ohne'; if (!bySite.has(k)) bySite.set(k, { site: k, weeks: Object.fromEntries(weekList.map((w) => [w, { hours: 0, acknowledged: 0, released: 0 }])), open: {} }); return bySite.get(k); };
  for (const s of sites.results) if (!siteFilter || s.code === siteFilter) site(s.code);
  for (const r of hours.results) { const w = site(r.site).weeks[isoWeek(r.d)]; if (w) w.hours = Math.round((w.hours + r.h) * 100) / 100; }
  for (const r of [...acks.results, ...prevAcks.results]) { const w = site(r.site).weeks[isoWeek(berlinDate(r.t))]; if (w) w.acknowledged++; }
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
  // letzte N Berliner Kalendertage einschließlich heute (wie `staleBefore`) – vorher 24-h-Schritte ab jetzt: Zahlen hingen von der Uhrzeit ab,
  // am Tag der Zeitumstellung fiel ein Kalendertag halb heraus (18.10.2026)
  const since = berlinWindowStartIso(days);
  const kf = kind ? ' AND i.kind=?' : '';
  const args = kind ? [envName, since, kind] : [envName, since];
  const [checks, items, again] = await Promise.all([
    env.DB.prepare(`SELECT i.vehicle_id, v.plate, v.kind AS vehicle_kind, v.site, COUNT(*) AS checks, SUM(i.result='maengel') AS with_defects, MAX(i.created_at) AS last_at
      FROM inspections i JOIN vehicles v ON v.id=i.vehicle_id AND v.eval_excluded=0
      WHERE i.environment=? AND i.created_at >= ?${kf} GROUP BY i.vehicle_id`).bind(...args).all(),
    env.DB.prepare(`SELECT json_extract(j.value,'$.key') AS item, i.vehicle_id, v.site, COUNT(*) AS n, MAX(i.created_at) AS last_at
      FROM inspections i JOIN vehicles v ON v.id=i.vehicle_id AND v.eval_excluded=0, json_each(i.items) j
      WHERE i.environment=? AND i.created_at >= ?${kf} AND json_extract(j.value,'$.result')='mangel' GROUP BY item, i.vehicle_id`).bind(...args).all(),
    // Vorgänge aus Kontrollen (alle Kontrollarten) im Zeitraum, deren Prüfpunkt am selben Fahrzeug in den 90 Tagen davor repariert und freigegeben wurde
    env.DB.prepare(`SELECT c.check_item AS item, v.site, COUNT(*) AS n FROM cases c JOIN vehicles v ON v.id=c.vehicle_id AND v.eval_excluded=0
      WHERE c.environment=? AND c.created_at >= ? AND c.origin='kontrolle' AND c.check_item IS NOT NULL AND c.status<>'abgelehnt' AND c.duplicate_of IS NULL AND EXISTS (SELECT 1 FROM cases p
        WHERE p.vehicle_id=c.vehicle_id AND p.environment=c.environment AND p.check_item=c.check_item AND p.id<>c.id AND p.status='fahrzeug_freigegeben'
        AND p.closed_at <= c.created_at AND p.closed_at >= strftime('%Y-%m-%dT%H:%M:%fZ', c.created_at, '-90 days')) GROUP BY c.check_item, v.site`).bind(envName, since).all(),
  ]);
  // optional nur ein Standort laut Fahrzeugstamm (Auswahl aus Fahrzeugen mit Kontrollen bzw. Wiederholungsmängeln im Zeitraum)
  const sel = siteSelection([...checks.results, ...again.results], query.site);
  if (sel.site !== null) for (const res of [checks, items, again]) res.results = res.results.filter((r) => sel.match(r.site));
  const againBy = new Map();
  for (const r of again.results) againBy.set(r.item, (againBy.get(r.item) || 0) + r.n);
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
  return { environment: envName, days, kind: kind || null, since, site: sel.site, site_options: sel.options,
    totals: { checks: total, checks_with_defects: vehicles.reduce((s, v) => s + v.checks_with_defects, 0), defect_items: itemsOut.reduce((s, i) => s + i.defects, 0), again_after_repair: itemsOut.reduce((s, i) => s + i.again_after_repair, 0), vehicles_checked: vehicles.length },
    items: itemsOut, vehicles };
}

// ---- Werkstattplan: geplante Termine je Tag (Vorgänge mit Termin, geplante Prüftermine), überfällig geplant, ohne Termin ----
// Nur gespeicherte Termine; die App plant nichts selbst. Werkstattrolle sieht nur den eigenen Standort.
const PLAN_STATUSES = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'];
export async function workshopPlan(env, user, envName, query = {}) {
  if (!['owner', 'fleet', 'viewer', 'workshop', 'dispatch'].includes(user.role)) throw forbidden();
  const days = intParam(query.days, 14, 1, 60);
  const today = berlinDate();
  const to = new Date(Date.parse(today + 'T00:00:00Z') + (days - 1) * 86400000).toISOString().slice(0, 10);
  const site = user.role === 'workshop' ? user.workshop_site : (query.site ? String(query.site).slice(0, 20) : null);
  const sf = site ? ' AND c.workshop_site=?' : '';
  const canPlan = ['owner', 'fleet', 'workshop'].includes(user.role);
  const [cs, mt, vs, mo] = await Promise.all([
    env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate, v.site AS vehicle_site, v.eval_excluded, c.status, c.priority, c.safety_lock, c.workshop_site, c.planned_date, c.parts_expected_date, c.workshop_ack_at, c.version, substr(c.description,1,300) AS description, c.maintenance_rule_id, c.tire_order
      FROM cases c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.environment=? AND c.status IN (${PLAN_STATUSES.map(() => '?').join(',')})${sf}
      ORDER BY c.planned_date, c.priority='kritisch' DESC, c.created_at`).bind(envName, ...PLAN_STATUSES, ...(site ? [site] : [])).all(),
    // ruhende Fahrzeuge mit eingetragenem Termin erscheinen gekennzeichnet (wie ihre Aufträge) – vorher war ihr Prüftermin unsichtbar (23.10.2026)
    env.DB.prepare(`SELECT m.id, m.vehicle_id, v.plate, v.site AS vehicle_site, v.kind AS vehicle_kind, v.eval_excluded, m.kind, m.planned_date, m.next_due_date FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id
      WHERE v.active=1 AND m.planned_date IS NOT NULL AND m.planned_date >= ? AND m.planned_date <= ? ORDER BY m.planned_date, v.plate`).bind(today, to).all(),
    env.DB.prepare(`SELECT id, plate, kind, trailer_plate, site, eval_excluded FROM vehicles WHERE active=1`).all(),
    // offene Aufträge aus Prüfterminen ALLER Werkstätten (ohne Standortfilter): ein Termin, dessen Auftrag bei einer anderen Werkstatt liegt,
    // erschien sonst bei der eigenen Werkstatt als offener Prüftermin ohne Auftrag (Gefahr doppelter Prüfung, 19.10.2026)
    env.DB.prepare(`SELECT id, case_no, planned_date, workshop_site, maintenance_rule_id FROM cases WHERE environment=? AND maintenance_rule_id IS NOT NULL AND status IN (${PLAN_STATUSES.map(() => '?').join(',')})`).bind(envName, ...PLAN_STATUSES).all(),
  ]);
  // Fahrzeug-Standort (laut Fahrzeugstamm, Schreibweise egal) – unabhängig vom Werkstatt-Standort; wirkt auf Aufträge und Prüftermine
  // Auslastung je Tag und Werkstatt aus ALLEN Aufträgen (vor dem Fahrzeug-Standortfilter) – Grundlage für den Terminvorschlag
  const case_load = {};
  for (const c of cs.results) if (c.planned_date && c.planned_date >= today && c.planned_date <= to) { const d = (case_load[c.planned_date] ||= {}); d[c.workshop_site] = (d[c.workshop_site] || 0) + 1; }
  // Gespann laut Stammliste (Kopplung fest, wie Fahrzeugliste): Zugmaschine ↔ Anhänger je Termin nennen (nur Anzeige, 23.10.2026)
  const byPlate = new Map(); for (const v of vs.results) if (v.plate) byPlate.set(normPlate(v.plate), v);
  const coupledOf = new Map();
  for (const v of vs.results) if (v.kind === 'lkw' && v.trailer_plate) { const tr = byPlate.get(normPlate(v.trailer_plate)); if (!tr || tr.kind !== 'anhaenger') continue; const p = coupledOf.get(tr.id); if (!p || (p.eval_excluded && !v.eval_excluded)) coupledOf.set(tr.id, v); coupledOf.set(v.id, tr); }
  const coupled = (vid) => { const p = coupledOf.get(vid); return p ? { id: p.id, plate: p.plate, kind: p.kind } : null; };
  const vSel = siteSelection(vs.results.filter((v) => !v.eval_excluded), query.vsite);
  if (vSel.site) { cs.results = cs.results.filter((c) => vSel.match(c.vehicle_site)); mt.results = mt.results.filter((m) => vSel.match(m.vehicle_site)); }
  const byDay = new Map();
  const put = (d, item) => { if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(item); };
  const overdue = []; const unplanned = [];
  for (const c of cs.results) {
    // can_plan: Termin direkt aus dem Plan setzbar – gleiche Regel wie Vorgangsbefehl set_planned_date (nach Übernahme)
    const item = { type: 'case', ...c, eval_excluded: !!c.eval_excluded, coupled: coupled(c.vehicle_id), safety_lock: !!c.safety_lock, can_plan: canPlan && (c.status !== 'werkstatt_freigegeben' || !!c.workshop_ack_at) };
    if (!c.planned_date) unplanned.push(item);
    else if (c.planned_date < today) overdue.push(item);
    else if (c.planned_date <= to) put(c.planned_date, item);
  }
  // Werkstattauftrag aus diesem Prüftermin am selben Tag: nur der Auftrag erscheint (sonst doppelt); an anderem Tag Hinweis auf den Auftrag
  // Auftrag einer anderen Werkstatt am selben Tag: Termin hier nicht zeigen (Werkstatt sieht nur Aufträge ihres Standorts); an anderem Tag mit Hinweis
  const orders = new Map(mo.results.map((c) => [c.maintenance_rule_id, c]));
  for (const m of mt.results) {
    const o = orders.get(m.id);
    if (o && o.planned_date === m.planned_date) continue;
    put(m.planned_date, { type: 'maintenance', ...m, eval_excluded: !!m.eval_excluded, coupled: coupled(m.vehicle_id), order: o ? { id: o.id, case_no: o.case_no, workshop_site: o.workshop_site } : null });
  }
  // weitere geplante Tage desselben Fahrzeugs (ab heute, im Zeitraum): Hinweis zum Zusammenlegen – das Fahrzeug fiele sonst mehrfach aus
  const vDates = new Map();
  for (const [d, items] of byDay) for (const i of items) { if (!vDates.has(i.vehicle_id)) vDates.set(i.vehicle_id, new Set()); vDates.get(i.vehicle_id).add(d); }
  const others = (i, own) => [...(vDates.get(i.vehicle_id) || [])].filter((d) => d !== own).sort();
  for (const [d, items] of byDay) for (const i of items) i.other_dates = others(i, d);
  for (const i of [...overdue, ...unplanned]) i.other_dates = others(i, null);
  // Fällige Prüfungen/Wartung ohne Termin (nach Datum ODER nach km überschritten/bald fällig – gleiche Status wie die Prüftermin-Übersicht,
  // km-Vorwarnung nur mit eingestellter Schwelle). Ohne kommenden Plan-Termin und ohne offenen Werkstattauftrag (der steht oben als Auftrag).
  // Nur Anzeige: die App plant nichts selbst. Geplante Prüftermine im Zeitraum erhalten die km-Fälligkeit zur Anzeige.
  const ov = await maintenanceOverview(env, null, envName, { site: query.vsite });
  const ovById = new Map(ov.rows.map((r) => [r.id, r]));
  for (const [, items] of byDay) for (const i of items) if (i.type === 'maintenance') {
    const o = ovById.get(i.id);
    if (o) Object.assign(i, { status: o.status, next_due_km: o.next_due_km ?? null, km_remaining: o.km_remaining ?? null, km_status: o.km_status ?? null, ...(o.km_unclear ? { km_unclear: o.km_unclear, km_drop_at: o.km_drop_at || null } : {}) });
  }
  const DUE = ['ueberfaellig', 'faellig'];
  // + offene Herstellerrückrufe ohne Frist (noch nicht durchgeführt): keine erfundene Frist, aber Werkstattarbeit, die eingeplant werden kann;
  // Referenz laut Nachweis (Schreiben/KBA-Nr.) wie in der Vorgangs-Kurzinfo – sonst kein Nachweistext
  const openRecall = (r) => r.kind === 'Rückruf' && r.status === 'ohne_termin' && !r.last_done_date;
  // „ungeklärt“ (km-Zähler gesunken bzw. HU/SP-Frist ungeklärt) überdeckt im Gesamtstatus „bald fällig“ nach Datum – die Datumsfälligkeit bleibt aber einzuplanen
  const kmUnclearDateDue = (r) => r.status === 'ungeklaert' && DUE.includes(r.date_status);
  // Termin nach Fristende UND außerhalb des Plan-Zeitraums: bleibt hier mit Hinweis (vorher fehlte die überfällige Prüfung dann ganz im Plan, 18.10.2026)
  // SP des Vorzyklus nicht belegt (spätere HU ersetzt sie nicht): Gesamtstatus „ungeklärt“, Datumsstufe nach dem aktuellen Zyklus oft „ok“ –
  // fehlte damit im Plan, obwohl Nachweis oder SP fällig sind (19.10.2026). Anzeige mit Monat der offenen SP, nichts wird verschoben.
  const prevOpen = (r) => !!r.prev_cycle_open;
  const lateBeyond = (r) => !!(r.planned_date && r.planned_date > to && r.next_due_date && r.planned_date > r.next_due_date);
  const maintenance_due = ov.rows.filter((r) => (DUE.includes(r.status) || kmUnclearDateDue(r) || openRecall(r) || prevOpen(r)) && (!(r.planned_date && r.planned_date >= today) || lateBeyond(r)) && !r.open_order)
    .map((r) => ({ type: 'maintenance_due', id: r.id, vehicle_id: r.vehicle_id, plate: r.plate, vehicle_site: r.site, vehicle_kind: r.vehicle_kind, kind: r.kind, status: kmUnclearDateDue(r) ? r.date_status : r.status,
      next_due_date: r.next_due_date, days: r.days, next_due_km: r.next_due_km ?? null, km_remaining: r.km_remaining ?? null, km_status: r.km_status ?? null,
      ...(r.km_unclear ? { km_unclear: r.km_unclear, km_drop_at: r.km_drop_at || null } : {}),
      by_km: DUE.includes(r.km_status), past_planned_date: r.planned_date && r.planned_date < today ? r.planned_date : null, planned_after_due: lateBeyond(r) ? r.planned_date : null,
      ...(r.kind === 'Rückruf' && !r.last_done_date ? { recall_ref: r.evidence } : {}), ...(prevOpen(r) ? { prev_cycle_open: r.prev_cycle_open } : {}) }))
    .sort((a, b) => (b.status === 'ueberfaellig') - (a.status === 'ueberfaellig') || String(a.next_due_date || '9999').localeCompare(String(b.next_due_date || '9999')) || String(a.plate).localeCompare(String(b.plate)));
  for (const i of maintenance_due) i.other_dates = others(i, null);
  // Fahrzeug-Standort je Zeile in Anzeige-Schreibweise (23.10.2026, Teilagent Monatsplanung: Plan/Ausdruck für „alle Standorte“ zeigte nicht,
  // woher ein Fahrzeug kommt)
  const vLab = (x) => (x && String(x).trim() ? vSel.label.get(siteKey(x)) || String(x).trim() : 'ohne');
  for (const [, items] of byDay) for (const i of items) i.vehicle_site_label = vLab(i.vehicle_site);
  for (const i of [...overdue, ...unplanned, ...maintenance_due]) i.vehicle_site_label = vLab(i.vehicle_site);
  return { today, from: today, to, site, vehicle_site: vSel.site, vehicle_sites: vSel.options, case_load, days: [...byDay.keys()].sort().map((d) => ({ date: d, items: byDay.get(d) })), overdue, unplanned, maintenance_due, warn_km: ov.warn_km };
}

// Kalenderdatei des Werkstattplans: nur Vorgangsnummer, Kennzeichen, Status/Prüfart – keine Beschreibung, keine Namen
// (Kalender werden oft in fremde Clouds synchronisiert).
// Texte in der Sprache der Person (lang; DE/UK/EN, sonst Deutsch); Status als Bezeichnung (bis 16.10.2026 roher Code, z. B. „in_reparatur“)
export function workshopPlanIcs(plan, envName, lang = 'de') {
  const I = icsLang(lang);
  const ev = [];
  for (const d of plan.days) for (const i of d.items) {
    ev.push(i.type === 'case'
      ? { uid: `plan-case-${i.id}`, date: d.date, summary: I.tx('plan_case', { no: i.case_no, plate: i.plate }) + (envName === 'test' ? ` (${I.tx('test_tag')})` : ''),
        description: I.tx('plan_status', { status: I.status(i.status) }) + (i.tire_order === 'winter' ? ' · ' + I.label('wo_tag') : '') + (i.safety_lock ? ' · ' + I.label('locked') : '') }
      : { uid: `plan-maint-${i.id}`, date: d.date, summary: I.tx('plan_maint', { kind: I.kind(i.kind), plate: i.plate }), description: i.next_due_date ? I.tx('plan_due_by', { d: I.d(i.next_due_date) }) : '' });
  }
  return icsCalendar(`${I.tx('cal_plan')}${plan.site ? ' ' + plan.site : ''}${plan.vehicle_site ? ' – ' + I.tx('plan_vsite', { site: plan.vehicle_site === 'ohne' ? I.tx('no_site') : plan.vehicle_site }) : ''}`, ev);
}

