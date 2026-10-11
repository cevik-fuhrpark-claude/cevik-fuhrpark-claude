// [CLAUDE] Versicherungsfälle je Vorgang (z. B. Unfall, Glasbruch, Sturm): nur Inhaber/Fuhrparkleitung.
// Alle Angaben laut Schadenmeldung bzw. Schreiben/Abrechnung des Versicherers (Pflicht-Nachweis) – die App berechnet nichts außer
// der Dauer seit Meldung und dem Saldo „Kosten des Vorgangs − Erstattung“ (nur wenn beide belegt sind).
import { nowIso, uuid, bad, forbidden, notFound, str, num, oneOf, berlinDate } from './util.js';
import { audit } from './auth.js';
import { csvCell } from './maintenance.js';

export const CLAIM_STATUS = ['gemeldet', 'in_pruefung', 'reguliert', 'abgelehnt', 'zurueckgezogen'];
export const OPEN_STATUS = ['gemeldet', 'in_pruefung'];
const STATUS_DE = { gemeldet: 'gemeldet', in_pruefung: 'in Prüfung', reguliert: 'reguliert', abgelehnt: 'abgelehnt', zurueckgezogen: 'zurückgezogen' };
const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

function day(v, field, required = false) {
  const d = str(v, { max: 10, field, required });
  if (!d) return null;
  if (!ISO.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')) || new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) !== d) throw bad('validation', `${field}: gültiges Datum im Format JJJJ-MM-TT.`);
  if (d < '2000-01-01') throw bad('validation', `${field}: Datum außerhalb des zulässigen Bereichs.`);
  if (d > berlinDate()) throw bad('validation', `${field}: darf nicht in der Zukunft liegen.`);
  return d;
}

function readBody(body, existing = {}) {
  const pick = (k) => (body[k] !== undefined ? body[k] : existing[k]);
  const f = {
    insurer: str(pick('insurer'), { max: 120, field: 'Versicherer' }),
    contract_id: str(pick('contract_id'), { max: 40, field: 'Versicherungsvertrag' }),
    claim_no: str(pick('claim_no'), { max: 60, field: 'Schadennummer' }),
    reported_on: day(pick('reported_on'), 'Gemeldet am', true),
    status: oneOf(pick('status') || 'gemeldet', CLAIM_STATUS, 'Status'),
    deductible_net: num(pick('deductible_net'), { min: 0, max: 1000000, field: 'Selbstbeteiligung', nullable: true }),
    reimbursed_net: num(pick('reimbursed_net'), { min: 0, max: 10000000, field: 'Erstattung', nullable: true }),
    reimbursed_on: day(pick('reimbursed_on'), 'Erstattet am'),
    evidence: str(pick('evidence'), { required: true, max: 300, field: 'Nachweis' }),
    note: str(pick('note'), { max: 1000, field: 'Bemerkung' }),
  };
  if ((f.reimbursed_net === null) !== (f.reimbursed_on === null)) throw bad('validation', 'Erstattung: Betrag und Datum nur zusammen laut Abrechnung des Versicherers angeben.');
  if (f.reimbursed_on && f.reimbursed_on < f.reported_on) throw bad('validation', 'Erstattet am liegt vor dem Meldedatum.');
  if (f.reimbursed_net !== null && ['abgelehnt', 'zurueckgezogen'].includes(f.status)) throw bad('validation', 'Bei „abgelehnt“/„zurückgezogen“ keine Erstattung eintragen.');
  return f;
}

// Versicherungsfall anlegen oder ändern (je Vorgang höchstens einer). Versicherer wird – wenn leer – aus dem gewählten Versicherungsvertrag übernommen.
export async function saveClaim(env, user, envName, caseId, body) {
  if (!isMgr(user)) throw forbidden();
  const c = await env.DB.prepare('SELECT id, case_no, vehicle_id FROM cases WHERE id=? AND environment=?').bind(caseId, envName).first();
  if (!c) throw notFound('Vorgang nicht gefunden.');
  const ex = await env.DB.prepare('SELECT * FROM insurance_claims WHERE case_id=?').bind(c.id).first();
  const f = readBody(body, ex || {});
  if (f.contract_id) {
    const k = await env.DB.prepare(`SELECT id, partner FROM vehicle_contracts WHERE id=? AND vehicle_id=? AND kind='versicherung'`).bind(f.contract_id, c.vehicle_id).first();
    if (!k) throw bad('validation', 'Versicherungsvertrag: bitte einen Versicherungsvertrag dieses Fahrzeugs wählen.');
    if (!f.insurer) f.insurer = k.partner;
  }
  if (!f.insurer) throw bad('validation', 'Versicherer angeben (oder Versicherungsvertrag wählen).');
  const now = nowIso();
  if (!ex) {
    const id = uuid();
    await env.DB.prepare(`INSERT INTO insurance_claims(id,case_id,environment,vehicle_id,contract_id,insurer,claim_no,reported_on,status,deductible_net,reimbursed_net,reimbursed_on,evidence,note,created_by,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, c.id, envName, c.vehicle_id, f.contract_id, f.insurer, f.claim_no, f.reported_on, f.status, f.deductible_net, f.reimbursed_net, f.reimbursed_on, f.evidence, f.note, user.id, now, now).run();
    await audit(env, user.id, 'claim.create', id, { case_no: c.case_no, insurer: f.insurer, status: f.status });
    return { id, created: true };
  }
  const changed = Object.keys(f).filter((k) => f[k] !== ex[k]);
  if (!changed.length) return { id: ex.id, changed: [] };
  await env.DB.prepare(`UPDATE insurance_claims SET contract_id=?,insurer=?,claim_no=?,reported_on=?,status=?,deductible_net=?,reimbursed_net=?,reimbursed_on=?,evidence=?,note=?,updated_at=? WHERE id=?`)
    .bind(f.contract_id, f.insurer, f.claim_no, f.reported_on, f.status, f.deductible_net, f.reimbursed_net, f.reimbursed_on, f.evidence, f.note, now, ex.id).run();
  await audit(env, user.id, 'claim.update', ex.id, { case_no: c.case_no, changed: Object.fromEntries(changed.map((k) => [k, { from: ex[k], to: f[k] }])) });
  return { id: ex.id, changed };
}

const shape = (r, today) => ({ ...r, open: OPEN_STATUS.includes(r.status), days_open: OPEN_STATUS.includes(r.status) ? days(r.reported_on, today) : null });

// Für die Vorgangsansicht (nur Leitung): Versicherungsfall + Versicherungsverträge des Fahrzeugs zur Auswahl (eine Abfrage)
export async function claimForCase(env, caseId, vehicleId) {
  const rows = (await env.DB.prepare(`SELECT 'claim' AS t, ic.id, ic.contract_id, ic.insurer, ic.claim_no, ic.reported_on, ic.status, ic.deductible_net, ic.reimbursed_net, ic.reimbursed_on, ic.evidence, ic.note, ic.updated_at, NULL AS partner, NULL AS contract_no, NULL AS end_date, NULL AS ended_on
      FROM insurance_claims ic WHERE ic.case_id=?1
    UNION ALL SELECT 'contract', k.id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, k.partner, k.contract_no, k.end_date, k.ended_on
      FROM vehicle_contracts k WHERE k.vehicle_id=?2 AND k.kind='versicherung'`).bind(caseId, vehicleId).all()).results;
  const claim = rows.find((r) => r.t === 'claim');
  const today = berlinDate();
  return {
    claim: claim ? shape(Object.fromEntries(Object.entries(claim).filter(([k]) => !['t', 'partner', 'contract_no', 'end_date', 'ended_on'].includes(k))), today) : null,
    insurance_contracts: rows.filter((r) => r.t === 'contract').map((r) => ({ id: r.id, partner: r.partner, contract_no: r.contract_no, end_date: r.end_date, ended_on: r.ended_on })),
  };
}

// Übersicht (Mehr → Versicherungsfälle): offen/alle/Status; Kosten des Vorgangs (nur belegte Ist-Kosten) und Saldo nach Erstattung
export async function claimOverview(env, user, envName, query = {}) {
  if (!isMgr(user)) throw forbidden();
  const filter = ['offen', 'alle', ...CLAIM_STATUS].includes(query.filter) ? query.filter : 'offen';
  const rateRow = await env.DB.prepare(`SELECT value FROM settings WHERE key='workshop_hourly_rate_net'`).first();
  const rate = rateRow && rateRow.value !== '' && Number.isFinite(Number(rateRow.value)) ? Number(rateRow.value) : null;
  const rows = (await env.DB.prepare(`SELECT ic.*, c.case_no, c.status AS case_status, c.description, v.plate,
      (SELECT COALESCE(SUM(w.hours),0) FROM work_entries w WHERE w.case_id=c.id) AS hours,
      (SELECT COUNT(*) FROM parts p WHERE p.case_id=c.id AND (p.unit_price_net IS NULL OR p.valuation<>'actual')) +
      (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id AND (e.amount_net IS NULL OR e.valuation<>'actual')) AS not_actual,
      (SELECT COALESCE(SUM(p.quantity*p.unit_price_net),0) FROM parts p WHERE p.case_id=c.id AND p.valuation='actual' AND p.unit_price_net IS NOT NULL) AS parts_net,
      (SELECT COALESCE(SUM(e.amount_net),0) FROM external_costs e WHERE e.case_id=c.id AND e.valuation='actual' AND e.amount_net IS NOT NULL) AS ext_net,
      (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id AND e.covers_work_and_parts=1) AS covered
    FROM insurance_claims ic JOIN cases c ON c.id=ic.case_id JOIN vehicles v ON v.id=ic.vehicle_id WHERE ic.environment=? ORDER BY ic.reported_on DESC`).bind(envName).all()).results;
  const today = berlinDate();
  const r2 = (x) => Math.round(x * 100) / 100;
  let list = rows.map((r) => {
    // gleiche Regel wie die Vorgangsbewertung: Fremdleistung „ersetzt eigene Arbeit/Teile“ → nur Fremdleistung; ohne Stundensatz oder mit unbewerteten/geschätzten Positionen: keine Summe
    const workNet = r.covered ? 0 : rate === null ? (r.hours ? null : 0) : r.hours * rate;
    const complete = workNet !== null && (r.covered ? true : r.not_actual === 0);
    const cost = complete ? r2(workNet + (r.covered ? 0 : r.parts_net) + r.ext_net) : null;
    const { hours, not_actual, parts_net, ext_net, covered, ...rest } = r;
    return { ...shape(rest, today), case_cost_net: cost, balance_net: cost !== null && r.reimbursed_net !== null ? r2(cost - r.reimbursed_net) : null };
  });
  const counts = { offen: 0, alle: list.length }; for (const s of CLAIM_STATUS) counts[s] = 0;
  for (const c of list) { counts[c.status]++; if (c.open) counts.offen++; }
  if (filter === 'offen') list = list.filter((c) => c.open); else if (filter !== 'alle') list = list.filter((c) => c.status === filter);
  const reimb = list.filter((c) => c.reimbursed_net !== null);
  return { today, filter, counts, claims: list, reimbursed_sum_net: reimb.length ? r2(reimb.reduce((s, c) => s + c.reimbursed_net, 0)) : null };
}

export function claimsCsv(ov) {
  const head = ['Kennzeichen', 'Vorgang', 'Versicherer', 'Schadennummer', 'Gemeldet am', 'Status', 'Tage offen', 'Selbstbeteiligung netto (EUR)', 'Erstattung netto (EUR)', 'Erstattet am',
    'Kosten Vorgang belegt netto (EUR)', 'Saldo nach Erstattung (EUR)', 'Nachweis', 'Bemerkung'];
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const lines = [head.join(';')];
  for (const c of ov.claims) lines.push([c.plate, c.case_no, c.insurer, c.claim_no, c.reported_on, STATUS_DE[c.status], c.days_open ?? '', n(c.deductible_net), n(c.reimbursed_net), c.reimbursed_on,
    n(c.case_cost_net), n(c.balance_net), c.evidence, c.note].map(csvCell).join(';'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
