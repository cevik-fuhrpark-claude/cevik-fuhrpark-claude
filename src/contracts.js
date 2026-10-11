// [CLAUDE] Fahrzeugverträge: Leasing, Miete, Finanzierung, Versicherung, Wartungsvertrag, Sonstiges.
// Grundsätze: Alle Angaben nur laut Vertrag (Pflicht-Nachweis); die App berechnet nur, was sich daraus ergibt
// (spätester Kündigungstag = Vertragsende − Kündigungsfrist; km seit Übernahme; lineare Prognose, deutlich als Prognose gekennzeichnet).
// Sichtbar und änderbar nur für Inhaber/Fuhrparkleitung (Raten sind Geschäftsdaten). Gemeinsame Stammdaten wie Fahrzeuge.
import { nowIso, uuid, bad, forbidden, notFound, str, num, oneOf, addMonths, berlinDate } from './util.js';
import { audit } from './auth.js';
import { latestKmByVehicle, csvCell } from './maintenance.js';

export const CONTRACT_KINDS = ['leasing', 'miete', 'finanzierung', 'versicherung', 'wartung', 'sonstiges'];
export const KIND_DE = { leasing: 'Leasing', miete: 'Miete', finanzierung: 'Finanzierung', versicherung: 'Versicherung', wartung: 'Wartungsvertrag', sonstiges: 'Vertrag' };
export const FORECAST_MIN_DAYS = 30; // Prognose erst nach mindestens 30 Tagen Laufzeit mit km-Stand (sonst zu unsicher)
const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

function date(v, field, { notFuture = false } = {}) {
  const d = str(v, { max: 10, field });
  if (!d) return null;
  if (!ISO.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')) || new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) !== d) throw bad('validation', `${field}: gültiges Datum im Format JJJJ-MM-TT.`);
  if (d < '1990-01-01' || d > '2100-12-31') throw bad('validation', `${field}: Datum außerhalb des zulässigen Bereichs.`);
  if (notFuture && d > berlinDate()) throw bad('validation', `${field}: darf nicht in der Zukunft liegen.`);
  return d;
}
const intOrNull = (v, field, max) => { const n = num(v, { min: 0, max, field, nullable: true }); if (n !== null && !Number.isInteger(n)) throw bad('validation', `${field}: ganze Zahl.`); return n; };

export function warnDaysOf(settings) {
  const n = Number(settings && settings.get ? settings.get('contract_warn_days') : null);
  return Number.isFinite(n) && n > 0 ? n : 60;
}

// Status eines Vertrags (reine Funktion, für Akte, Übersicht und Fuhrparkagent gleich)
export function contractStatus(c, latest, today, warnDays) {
  if (c.ended_on) return { overall: 'beendet', end: null, notice: null, km: null };
  let end = null; let notice = null; let km = null;
  if (c.end_date) {
    const d = days(today, c.end_date);
    end = { date: c.end_date, days: d, status: d < 0 ? 'abgelaufen' : d <= warnDays ? 'laeuft_aus' : 'ok' };
    if (c.notice_months) {
      const by = addMonths(c.end_date, -c.notice_months);
      const nd = days(today, by);
      notice = { by, days: nd, status: d < 0 ? null : nd < 0 ? 'verstrichen' : nd <= warnDays ? 'bald' : 'ok' };
    }
  }
  if (c.km_allowance) {
    if (c.start_km === null || c.start_km === undefined) km = { status: 'ohne_start', allowance: c.km_allowance };
    else if (!latest || (c.start_date && latest.measured_at.slice(0, 10) < c.start_date) || latest.km < c.start_km) km = { status: 'ohne_km', allowance: c.km_allowance };
    else {
      const driven = latest.km - c.start_km;
      km = { status: driven > c.km_allowance ? 'ueber' : 'ok', allowance: c.km_allowance, current_km: latest.km, measured_at: latest.measured_at, driven, remaining: c.km_allowance - driven, forecast_driven: null };
      const measuredDay = berlinDate(latest.measured_at);
      if (c.start_date && c.end_date && km.status === 'ok' && measuredDay < c.end_date) {
        const elapsed = days(c.start_date, measuredDay); const total = days(c.start_date, c.end_date);
        if (elapsed >= FORECAST_MIN_DAYS && total > 0) {
          km.forecast_driven = Math.round(driven * total / elapsed);
          if (km.forecast_driven > c.km_allowance) km.status = 'prognose_ueber';
        }
      }
    }
  }
  const handeln = (end && end.status === 'abgelaufen') || (km && km.status === 'ueber');
  const hinweis = (end && end.status === 'laeuft_aus') || (notice && notice.status === 'bald') || (km && km.status === 'prognose_ueber');
  return { overall: handeln ? 'handeln' : hinweis ? 'hinweis' : 'ok', end, notice, km };
}

function readBody(body, existing = {}) {
  const pick = (k) => (body[k] !== undefined ? body[k] : existing[k]);
  const f = {
    kind: oneOf(pick('kind'), CONTRACT_KINDS, 'Vertragsart'),
    partner: str(pick('partner'), { required: true, max: 120, field: 'Vertragspartner' }),
    contract_no: str(pick('contract_no'), { max: 60, field: 'Vertragsnummer' }),
    start_date: date(pick('start_date'), 'Vertragsbeginn'),
    end_date: date(pick('end_date'), 'Vertragsende'),
    notice_months: intOrNull(pick('notice_months'), 'Kündigungsfrist (Monate)', 60),
    km_allowance: intOrNull(pick('km_allowance'), 'km-Kontingent', 5000000),
    start_km: intOrNull(pick('start_km'), 'km bei Übernahme', 9999999),
    monthly_rate_net: num(pick('monthly_rate_net'), { min: 0, max: 1000000, field: 'Monatsrate', nullable: true }),
    evidence: str(pick('evidence'), { required: true, max: 300, field: 'Nachweis' }),
    note: str(pick('note'), { max: 1000, field: 'Bemerkung' }),
  };
  if (f.start_date && f.end_date && f.end_date <= f.start_date) throw bad('validation', 'Vertragsende muss nach dem Vertragsbeginn liegen.');
  if (f.notice_months && !f.end_date) throw bad('validation', 'Kündigungsfrist nur zusammen mit einem Vertragsende (laut Vertrag).');
  if (f.km_allowance && f.start_km === null) throw bad('validation', 'Für ein km-Kontingent bitte den km-Stand bei Übernahme laut Übergabeprotokoll angeben.');
  return f;
}

export async function createContract(env, user, vehicleId, body) {
  if (!isMgr(user)) throw forbidden();
  const v = await env.DB.prepare('SELECT id, plate FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound('Fahrzeug nicht gefunden.');
  const f = readBody(body);
  const id = uuid(); const now = nowIso();
  await env.DB.prepare(`INSERT INTO vehicle_contracts(id,vehicle_id,kind,partner,contract_no,start_date,end_date,notice_months,km_allowance,start_km,monthly_rate_net,evidence,note,created_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, v.id, f.kind, f.partner, f.contract_no, f.start_date, f.end_date, f.notice_months, f.km_allowance, f.start_km, f.monthly_rate_net, f.evidence, f.note, user.id, now, now).run();
  await audit(env, user.id, 'contract.create', id, { vehicle: v.plate, kind: f.kind, partner: f.partner });
  return { id };
}

async function loadContract(env, id) {
  const c = await env.DB.prepare('SELECT c.*, v.plate FROM vehicle_contracts c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.id=?').bind(id).first();
  if (!c) throw notFound('Vertrag nicht gefunden.');
  return c;
}

export async function updateContract(env, user, id, body) {
  if (!isMgr(user)) throw forbidden();
  const c = await loadContract(env, id);
  if (c.ended_on) throw bad('contract_ended', 'Beendete Verträge werden nicht mehr geändert (Nachweis bleibt erhalten).');
  const f = readBody(body, c);
  const changed = Object.keys(f).filter((k) => f[k] !== c[k]);
  if (!changed.length) return { id, changed: [] };
  await env.DB.prepare(`UPDATE vehicle_contracts SET kind=?,partner=?,contract_no=?,start_date=?,end_date=?,notice_months=?,km_allowance=?,start_km=?,monthly_rate_net=?,evidence=?,note=?,updated_at=? WHERE id=?`)
    .bind(f.kind, f.partner, f.contract_no, f.start_date, f.end_date, f.notice_months, f.km_allowance, f.start_km, f.monthly_rate_net, f.evidence, f.note, nowIso(), id).run();
  await audit(env, user.id, 'contract.update', id, { vehicle: c.plate, changed: Object.fromEntries(changed.map((k) => [k, { from: c[k], to: f[k] }])) });
  return { id, changed };
}

// Vertrag als beendet markieren (Rückgabe, Kündigung, Ablösung) – mit Datum und Grund; bleibt in der Akte sichtbar
export async function endContract(env, user, id, body) {
  if (!isMgr(user)) throw forbidden();
  const c = await loadContract(env, id);
  if (c.ended_on) throw bad('contract_ended', 'Vertrag ist bereits beendet.');
  const on = date(body.ended_on, 'Beendet am', { notFuture: true }) || berlinDate();
  const note = str(body.end_note, { required: true, max: 300, field: 'Grund' });
  if (c.start_date && on < c.start_date) throw bad('validation', 'Beendet am liegt vor dem Vertragsbeginn.');
  await env.DB.prepare('UPDATE vehicle_contracts SET ended_on=?, end_note=?, updated_at=? WHERE id=?').bind(on, note, nowIso(), id).run();
  await audit(env, user.id, 'contract.end', id, { vehicle: c.plate, ended_on: on, note });
  return { id, ended_on: on };
}

// Verträge eines Fahrzeugs (Fahrzeugakte); latest = letzter km-Stand der Akte
export async function vehicleContracts(env, vehicleId, latest, settings) {
  const rows = (await env.DB.prepare(`SELECT c.*, u.display_name AS created_by_name FROM vehicle_contracts c LEFT JOIN users u ON u.id=c.created_by
    WHERE c.vehicle_id=? ORDER BY c.ended_on IS NOT NULL, c.ended_on DESC, c.end_date IS NULL, c.end_date`).bind(vehicleId).all()).results;
  const today = berlinDate(); const w = warnDaysOf(settings);
  return rows.map((c) => ({ ...c, status: contractStatus(c, latest, today, w) }));
}

const ORDER = { handeln: 0, hinweis: 1, ok: 2, beendet: 3 };
// Übersicht über alle Fahrzeuge (Mehr → Verträge): Filter offen/aktion/beendet/alle, Vertragsart
export async function contractOverview(env, user, query = {}) {
  if (!isMgr(user)) throw forbidden();
  const filter = ['aktiv', 'aktion', 'beendet', 'alle'].includes(query.filter) ? query.filter : 'aktiv';
  const kind = CONTRACT_KINDS.includes(query.kind) ? query.kind : null;
  const [rows, settingsRows, latestKm] = await Promise.all([
    env.DB.prepare(`SELECT c.*, v.plate, v.kind AS vehicle_kind, v.active AS vehicle_active FROM vehicle_contracts c JOIN vehicles v ON v.id=c.vehicle_id ORDER BY v.plate, c.kind`).all(),
    env.DB.prepare(`SELECT key, value FROM settings WHERE key='contract_warn_days'`).all(),
    latestKmByVehicle(env),
  ]);
  const settings = new Map(settingsRows.results.map((r) => [r.key, r.value]));
  const today = berlinDate(); const w = warnDaysOf(settings);
  let list = rows.results.map((c) => ({ ...c, status: contractStatus(c, latestKm.get(c.vehicle_id), today, w) }));
  const counts = { aktiv: 0, aktion: 0, beendet: 0, alle: list.length };
  for (const c of list) { if (c.ended_on) counts.beendet++; else { counts.aktiv++; if (c.status.overall !== 'ok') counts.aktion++; } }
  if (kind) list = list.filter((c) => c.kind === kind);
  if (filter === 'aktiv') list = list.filter((c) => !c.ended_on);
  else if (filter === 'aktion') list = list.filter((c) => !c.ended_on && c.status.overall !== 'ok');
  else if (filter === 'beendet') list = list.filter((c) => c.ended_on);
  list.sort((a, b) => ORDER[a.status.overall] - ORDER[b.status.overall] || String(a.end_date || '9999').localeCompare(String(b.end_date || '9999')) || a.plate.localeCompare(b.plate));
  // Summe der Monatsraten nur über aktive Verträge mit hinterlegter Rate (fehlende Rate = unbewertet, nie 0 €)
  const active = list.filter((c) => !c.ended_on);
  const rated = active.filter((c) => c.monthly_rate_net !== null);
  return { today, warn_days: w, filter, kind, counts, contracts: list, monthly_rate_sum_net: rated.length ? Math.round(rated.reduce((s, c) => s + c.monthly_rate_net, 0) * 100) / 100 : null, unrated: active.length - rated.length };
}

const ST_DE = { handeln: 'handeln', hinweis: 'Hinweis', ok: 'in Ordnung', beendet: 'beendet' };
export function contractsCsv(ov) {
  const head = ['Kennzeichen', 'Vertragsart', 'Vertragspartner', 'Vertragsnummer', 'Beginn', 'Ende', 'Kündigungsfrist (Monate)', 'Kündigung spätestens', 'Monatsrate netto (EUR)',
    'km-Kontingent', 'km bei Übernahme', 'km gefahren', 'km Prognose bis Ende (linear)', 'Status', 'Beendet am', 'Grund', 'Nachweis', 'Bemerkung'];
  const lines = [head.join(';')];
  for (const c of ov.contracts) {
    const s = c.status;
    lines.push([c.plate, KIND_DE[c.kind], c.partner, c.contract_no, c.start_date, c.end_date, c.notice_months, s.notice ? s.notice.by : '',
      c.monthly_rate_net === null ? '' : String(c.monthly_rate_net).replace('.', ','), c.km_allowance, c.start_km, s.km && s.km.driven !== undefined ? s.km.driven : '',
      s.km && s.km.forecast_driven ? s.km.forecast_driven : '', ST_DE[s.overall], c.ended_on, c.end_note, c.evidence, c.note].map(csvCell).join(';'));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// Für den Fuhrparkagenten (genau eine Abfrage inkl. letztem km-Stand – Abfragebudget je Lauf): Befunde je Vertrag
export async function contractFindings(env, settings) {
  const rows = (await env.DB.prepare(`SELECT c.*, v.plate,
      (SELECT o.km || '|' || o.measured_at FROM odometer_readings o WHERE o.vehicle_id=c.vehicle_id ORDER BY o.measured_at DESC LIMIT 1) AS latest_km
    FROM vehicle_contracts c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.ended_on IS NULL AND (c.end_date IS NOT NULL OR c.km_allowance IS NOT NULL)`).all()).results;
  if (!rows.length) return [];
  const km = new Map(rows.filter((r) => r.latest_km).map((r) => { const [k, at] = r.latest_km.split('|'); return [r.vehicle_id, { km: Number(k), measured_at: at }]; }));
  const today = berlinDate(); const w = warnDaysOf(settings); const out = [];
  const fmt = (n) => n.toLocaleString('de-DE');
  for (const c of rows) {
    const s = contractStatus(c, km.get(c.vehicle_id), today, w);
    const label = `${KIND_DE[c.kind]} (${c.partner}${c.contract_no ? ', Nr. ' + c.contract_no : ''})`;
    const base = { vehicle_id: c.vehicle_id, owner_role: 'fleet' };
    if (s.end && s.end.status === 'abgelaufen') out.push({ ...base, code: 'CONTRACT_ENDED', subject: `${c.id}|end`, severity: 'handeln', requires_decision: 1,
      message: `${c.plate}: ${label} endete laut Eintrag am ${c.end_date} – in der App noch nicht als beendet markiert.`, next_action: 'Rückgabe/Verlängerung klären; Vertrag in der Fahrzeugakte beenden oder mit neuem Nachweis aktualisieren.' });
    else if (s.end && s.end.status === 'laeuft_aus') out.push({ ...base, code: 'CONTRACT_ENDS_SOON', subject: `${c.id}|end`, severity: 'hinweis', requires_decision: 0,
      message: `${c.plate}: ${label} endet am ${c.end_date} (in ${s.end.days} Tag(en)).`, next_action: 'Rückgabe, Verlängerung oder Ersatzfahrzeug klären.' });
    if (s.notice && s.notice.status === 'bald') out.push({ ...base, code: 'CONTRACT_NOTICE_DUE', subject: `${c.id}|notice`, severity: 'hinweis', requires_decision: 1,
      message: `${c.plate}: ${label} – Kündigung laut Vertrag spätestens bis ${s.notice.by} (${c.notice_months} Monat(e) vor Ende ${c.end_date}).`, next_action: 'Entscheiden: kündigen oder verlängern. Frist und Form laut Vertrag prüfen.' });
    if (s.km && s.km.status === 'ueber') out.push({ ...base, code: 'CONTRACT_KM_OVER', subject: `${c.id}|km`, severity: 'hinweis', requires_decision: 0,
      message: `${c.plate}: ${label} – km-Kontingent ${fmt(c.km_allowance)} km überschritten (seit Übernahme ${fmt(s.km.driven)} km).`, next_action: 'Mehrkilometer-Regelung im Vertrag prüfen; ggf. Vertrag anpassen.' });
    else if (s.km && s.km.status === 'prognose_ueber') out.push({ ...base, code: 'CONTRACT_KM_FORECAST', subject: `${c.id}|km`, severity: 'hinweis', requires_decision: 0,
      message: `${c.plate}: ${label} – bei gleicher Fahrleistung voraussichtlich ${fmt(s.km.forecast_driven)} km bis Vertragsende (Kontingent ${fmt(c.km_allowance)} km; Prognose).`, next_action: 'Einsatz des Fahrzeugs bzw. Vertragsanpassung prüfen.' });
  }
  return out;
}
