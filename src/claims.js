// [CLAUDE] Versicherungsfälle je Vorgang (z. B. Unfall, Glasbruch, Sturm): nur Inhaber/Fuhrparkleitung.
// Alle Angaben laut Schadenmeldung bzw. Schreiben/Abrechnung des Versicherers (Pflicht-Nachweis) – die App berechnet nichts außer
// der Dauer seit Meldung und dem Saldo „Kosten des Vorgangs − Erstattung“ (nur wenn beide belegt sind).
import { findingText as fm } from '../public/finding-messages.js';
import { nowIso, laterIso, conflict, uuid, bad, forbidden, notFound, str, num, oneOf, berlinDate, isCalendarDate, rateOf, roundCents, commaDec } from './util.js';
import { audit } from './auth.js';
import { csvCell, csvText } from './maintenance.js';
import { siteSelection } from './reports.js';

export const CLAIM_STATUS = ['gemeldet', 'in_pruefung', 'reguliert', 'abgelehnt', 'zurueckgezogen'];
export const OPEN_STATUS = ['gemeldet', 'in_pruefung'];
const STATUS_DE = { gemeldet: 'gemeldet', in_pruefung: 'in Prüfung', reguliert: 'reguliert', abgelehnt: 'abgelehnt', zurueckgezogen: 'zurückgezogen' };
const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';
const ISO = { test: isCalendarDate }; // echtes Kalenderdatum JJJJ-MM-TT
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

function day(v, field, required = false) {
  const d = str(v, { max: 10, field, required });
  if (!d) return null;
  if (!ISO.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')) || new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) !== d) throw bad('validation', `${field}: gültiges Datum im Format JJJJ-MM-TT.`);
  if (d < '2000-01-01') throw bad('validation', `${field}: Datum außerhalb des zulässigen Bereichs.`);
  if (d > berlinDate()) throw bad('validation', `${field}: darf nicht in der Zukunft liegen.`);
  return d;
}

function readBody(body, existing = {}, user = null) {
  const dc = user ? commaDec(user) : undefined; // Dezimalkomma je Sprache der Person (19.10.2026: „150,555“ in DE hieß „mehrdeutig“ statt „höchstens 2 Nachkommastellen“)
  const pick = (k) => (body[k] !== undefined ? body[k] : existing[k]);
  const f = {
    insurer: str(pick('insurer'), { max: 120, field: 'Versicherer' }),
    contract_id: str(pick('contract_id'), { max: 40, field: 'Versicherungsvertrag' }),
    claim_no: str(pick('claim_no'), { max: 60, field: 'Schadennummer' }),
    reported_on: day(pick('reported_on'), 'Gemeldet am', true),
    // leerer/fehlender Status behält den gespeicherten (18.10.2026: setzte einen regulierten Fall still auf „gemeldet“ zurück)
    status: oneOf(body.status !== undefined && body.status !== null && body.status !== '' ? body.status : (existing.status || 'gemeldet'), CLAIM_STATUS, 'Status'),
    deductible_net: num(pick('deductible_net'), { min: 0, max: 1000000, field: 'Selbstbeteiligung', nullable: true, cents: true, decimalComma: dc }),
    reimbursed_net: num(pick('reimbursed_net'), { min: 0, max: 10000000, field: 'Erstattung', nullable: true, cents: true, decimalComma: dc }),
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
  const c = await env.DB.prepare('SELECT id, case_no, vehicle_id, duplicate_of FROM cases WHERE id=? AND environment=?').bind(caseId, envName).first();
  if (!c) throw notFound('Vorgang nicht gefunden.');
  const ex = await env.DB.prepare('SELECT * FROM insurance_claims WHERE case_id=?').bind(c.id).first();
  // als Dublette abgelehnter Vorgang: neuen Versicherungsfall beim ursprünglichen Vorgang erfassen (19.10.2026: sonst zwei Fälle für einen Schaden,
  // Ursprung blieb „Unfall ohne Versicherungsfall“); ein vorhandener (Altbestand) bleibt bearbeitbar
  if (!ex && c.duplicate_of) throw bad('validation', 'Vorgang ist als Dublette abgelehnt – Versicherungsfall beim ursprünglichen Vorgang erfassen.');
  // Stand beim Öffnen des Formulars (die App sendet ihn; leer = damals noch kein Versicherungsfall) – sonst überschrieb ein veraltetes Formular
  // z. B. Erstattung und Status „reguliert“ (17.10.2026); ohne Feld (ältere Aufrufer) wie bisher
  // Ausnahme: der gesendete Stand ist genau der gespeicherte – Wiederholung nach verlorener Antwort ist dann Erfolg statt Konflikt (18.10.2026)
  const stale = body.expected_updated_at !== undefined && (body.expected_updated_at || null) !== (ex ? ex.updated_at : null);
  const staleErr = () => conflict('version_conflict', ex ? 'Versicherungsfall wurde zwischenzeitlich geändert. Bitte neu laden.' : 'Versicherungsfall wurde zwischenzeitlich angelegt. Bitte neu laden.');
  if (stale && !ex) throw staleErr();
  const f = readBody(body, ex || {}, user);
  if (f.contract_id) {
    const k = await env.DB.prepare(`SELECT id, partner FROM vehicle_contracts WHERE id=? AND vehicle_id=? AND kind='versicherung'`).bind(f.contract_id, c.vehicle_id).first();
    if (!k) throw bad('validation', 'Versicherungsvertrag: bitte einen Versicherungsvertrag dieses Fahrzeugs wählen.');
    // Vertrag gewechselt, Versicherer unverändert mitgesendet (Formular füllt ihn vor) → Partner des neuen Vertrags (17.10.2026)
    if (!f.insurer || (ex && ex.contract_id !== f.contract_id && f.insurer === ex.insurer)) f.insurer = k.partner;
  }
  if (!f.insurer) throw bad('validation', 'Versicherer angeben (oder Versicherungsvertrag wählen).');
  // Schreiben/Abrechnung als Datei desselben Vorgangs verknüpfen (Feld weglassen = unverändert, leer/null = Verknüpfung aufheben)
  if (body.file_id === undefined) f.file_id = ex ? ex.file_id : null;
  else if (body.file_id === null || body.file_id === '') f.file_id = null;
  // unverändert mitgesendet: auch gültig, wenn die Datei an einer Dublette hängt (Fall wurde umgehängt, 18.10.2026)
  else if (ex && ex.file_id && body.file_id === ex.file_id) f.file_id = ex.file_id;
  else {
    const file = await env.DB.prepare('SELECT id FROM files WHERE id=? AND case_id=? AND environment=?').bind(str(body.file_id, { max: 40, field: 'Datei' }), c.id, envName).first();
    if (!file) throw bad('validation', 'Datei: bitte eine Datei dieses Vorgangs wählen.');
    f.file_id = file.id;
  }
  const now = nowIso();
  if (!ex) {
    const id = uuid();
    await env.DB.prepare(`INSERT INTO insurance_claims(id,case_id,environment,vehicle_id,contract_id,insurer,claim_no,reported_on,status,deductible_net,reimbursed_net,reimbursed_on,evidence,note,file_id,created_by,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(case_id) DO NOTHING`).bind(id, c.id, envName, c.vehicle_id, f.contract_id, f.insurer, f.claim_no, f.reported_on, f.status, f.deductible_net, f.reimbursed_net, f.reimbursed_on, f.evidence, f.note, f.file_id, user.id, now, now).run()
      .then((r) => { if (!(r.meta && r.meta.changes)) throw conflict('version_conflict', 'Versicherungsfall wurde zwischenzeitlich angelegt. Bitte neu laden.'); });
    await audit(env, user.id, 'claim.create', id, { case_no: c.case_no, insurer: f.insurer, status: f.status });
    return { id, created: true };
  }
  const changed = Object.keys(f).filter((k) => f[k] !== ex[k]);
  if (!changed.length) return { id: ex.id, changed: [], ...(stale ? { duplicate: true } : {}) };
  if (stale) throw staleErr();
  // nur auf dem gelesenen Stand (parallele Änderungen überschrieben sich sonst still, 17.10.2026)
  const r = await env.DB.prepare(`UPDATE insurance_claims SET contract_id=?,insurer=?,claim_no=?,reported_on=?,status=?,deductible_net=?,reimbursed_net=?,reimbursed_on=?,evidence=?,note=?,file_id=?,updated_at=? WHERE id=? AND updated_at=?`)
    .bind(f.contract_id, f.insurer, f.claim_no, f.reported_on, f.status, f.deductible_net, f.reimbursed_net, f.reimbursed_on, f.evidence, f.note, f.file_id, laterIso(ex.updated_at), ex.id, ex.updated_at).run();
  if (!(r.meta && r.meta.changes)) throw conflict('version_conflict', 'Versicherungsfall wurde zwischenzeitlich geändert. Bitte neu laden.');
  await audit(env, user.id, 'claim.update', ex.id, { case_no: c.case_no, changed: Object.fromEntries(changed.map((k) => [k, { from: ex[k], to: f[k] }])) });
  return { id: ex.id, changed };
}

const shape = (r, today) => ({ ...r, open: OPEN_STATUS.includes(r.status), days_open: OPEN_STATUS.includes(r.status) ? days(r.reported_on, today) : null });

// Für die Vorgangsansicht (nur Leitung): Versicherungsfall + Versicherungsverträge des Fahrzeugs zur Auswahl (eine Abfrage)
export async function claimForCase(env, caseId, vehicleId) {
  const rows = (await env.DB.prepare(`SELECT 'claim' AS t, ic.id, ic.contract_id, ic.insurer, ic.claim_no, ic.reported_on, ic.status, ic.deductible_net, ic.reimbursed_net, ic.reimbursed_on, ic.evidence, ic.note, ic.updated_at, ic.file_id, f.filename AS file_name, NULL AS partner, NULL AS contract_no, NULL AS end_date, NULL AS ended_on
      FROM insurance_claims ic LEFT JOIN files f ON f.id=ic.file_id AND f.environment=ic.environment WHERE ic.case_id=?1
    UNION ALL SELECT 'contract', k.id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, k.partner, k.contract_no, k.end_date, k.ended_on
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
  const sets = new Map((await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN ('workshop_hourly_rate_net','claim_followup_days')`).all()).results.map((r) => [r.key, r.value]));
  const rv = sets.get('workshop_hourly_rate_net');
  const rate = rateOf(rv);
  const fu = Number(sets.get('claim_followup_days'));
  const followupDays = fu > 0 ? fu : null;
  const rows = (await env.DB.prepare(`SELECT ic.*, c.case_no, c.status AS case_status, c.description, v.plate, v.site AS vehicle_site, v.eval_excluded AS vehicle_excluded,
      (SELECT COALESCE(SUM(w.hours),0) FROM work_entries w WHERE w.case_id=c.id) AS hours,
      (SELECT COUNT(*) FROM parts p WHERE p.case_id=c.id AND (p.unit_price_net IS NULL OR p.valuation<>'actual')) +
      (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id AND (e.amount_net IS NULL OR e.valuation<>'actual')) AS not_actual,
      (SELECT COALESCE(SUM(ROUND(p.quantity*p.unit_price_net*100 + 1e-6)/100.0),0) FROM parts p WHERE p.case_id=c.id AND p.valuation='actual' AND p.unit_price_net IS NOT NULL) AS parts_net,
      (SELECT COALESCE(SUM(ROUND(e.amount_net*100 + 1e-6)/100.0),0) FROM external_costs e WHERE e.case_id=c.id AND e.valuation='actual' AND e.amount_net IS NOT NULL) AS ext_net,
      (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id AND (e.amount_net IS NULL OR e.valuation<>'actual')) AS ext_not_actual,
      (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id AND e.covers_work_and_parts=1) AS covered,
      (SELECT COUNT(*) FROM work_entries w WHERE w.case_id=c.id) + (SELECT COUNT(*) FROM parts p WHERE p.case_id=c.id) + (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id) AS items
    FROM insurance_claims ic JOIN cases c ON c.id=ic.case_id JOIN vehicles v ON v.id=ic.vehicle_id WHERE ic.environment=? ORDER BY ic.reported_on DESC`).bind(envName).all()).results;
  const today = berlinDate();
  const r2 = roundCents; // je Position auf Cent wie die Vorgangsbewertung (18.10.2026)
  // Filter „Fahrzeug-Standort“ vor den Zählern (Standort laut Fahrzeugstamm)
  const sel = siteSelection(rows.map((r) => ({ site: r.vehicle_site })), query.site);
  let list = rows.filter((r) => !sel.site || sel.match(r.vehicle_site)).map((r) => {
    // gleiche Regel wie die Vorgangsbewertung: Fremdleistung „ersetzt eigene Arbeit/Teile“ → nur Fremdleistung; ohne Stundensatz oder mit unbewerteten/geschätzten Positionen: keine Summe
    const workNet = r.covered ? 0 : rate === null ? (r.hours ? null : 0) : r2(r.hours * rate);
    // ersetzt eine Fremdleistung eigene Arbeit/Teile, zählen nur die Fremdleistungen – auch deren Bewertung (vorher: unbewertete Fremdrechnung → „0 €“, 17.10.2026)
    // ohne jede Kostenposition: „–“ statt 0 € (wie die Vorgangsansicht; vorher Saldo = −Erstattung, 17.10.2026)
    const complete = r.items > 0 && workNet !== null && (r.covered ? r.ext_not_actual === 0 : r.not_actual === 0);
    const cost = complete ? r2(workNet + (r.covered ? 0 : r.parts_net) + r.ext_net) : null;
    const { hours, not_actual, ext_not_actual, parts_net, ext_net, covered, items, vehicle_excluded, ...rest } = r;
    const sh = shape(rest, today);
    // ruhende Fahrzeuge (Entscheidung 10.10.2026: aus allen Bewertungen ausgenommen) bleiben sichtbar, aber ohne Nachfass-Hinweis und außerhalb der Summe – wie Agent und Kostenbericht (18.10.2026)
    const excluded = !!vehicle_excluded;
    return { ...sh, eval_excluded: excluded, followup_due: !excluded && followupDays !== null && sh.open && sh.days_open >= followupDays, case_cost_net: cost, balance_net: cost !== null && r.reimbursed_net !== null ? r2(cost - r.reimbursed_net) : null };
  });
  const counts = { offen: 0, alle: list.length }; for (const s of CLAIM_STATUS) counts[s] = 0;
  for (const c of list) { counts[c.status]++; if (c.open) counts.offen++; }
  if (filter === 'offen') list = list.filter((c) => c.open); else if (filter !== 'alle') list = list.filter((c) => c.status === filter);
  const reimb = list.filter((c) => c.reimbursed_net !== null && !c.eval_excluded);
  const reimbX = list.filter((c) => c.reimbursed_net !== null && c.eval_excluded);
  const sum = (a) => (a.length ? r2(a.reduce((s, c) => s + c.reimbursed_net, 0)) : null);
  return { today, filter, site: sel.site, site_options: sel.options, followup_days: followupDays, counts, claims: list, reimbursed_sum_net: sum(reimb), reimbursed_sum_excluded_net: sum(reimbX) };
}

export function claimsCsv(ov) {
  const head = ['Kennzeichen', 'Vorgang', 'Versicherer', 'Schadennummer', 'Gemeldet am', 'Status', 'Tage offen', 'Selbstbeteiligung netto (EUR)', 'Erstattung netto (EUR)', 'Erstattet am',
    'Kosten Vorgang belegt netto (EUR)', 'Saldo nach Erstattung (EUR)', 'Nachweis', 'Bemerkung', 'Schreiben verknüpft', 'Fahrzeug ruhend (nicht in Summen)'];
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const lines = [head.join(';')];
  for (const c of ov.claims) lines.push([c.plate, c.case_no, c.insurer, c.claim_no, c.reported_on, STATUS_DE[c.status], c.days_open ?? '', n(c.deductible_net), n(c.reimbursed_net), c.reimbursed_on,
    n(c.case_cost_net), n(c.balance_net), c.evidence, c.note, c.file_id ? 'ja' : 'nein', c.eval_excluded ? 'ja' : 'nein'].map((x, i) => (i === 3 ? csvText(x) : csvCell(x))).join(';'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// Fuhrparkagent: Versicherungsfall länger als die eingestellte Nachfass-Frist offen (Einstellung `claim_followup_days`; leer = aus, keine eigene Frist).
// Bezug ist das Meldedatum an den Versicherer; der Befundtext nennt das Datum (keine laufende Tageszahl → kein tägliches Neuschreiben).
export async function claimFindings(env, environment, settings) {
  const n = Number(settings && settings.get ? settings.get('claim_followup_days') : null);
  if (!(n > 0)) return [];
  const limit = new Date(Date.parse(berlinDate() + 'T00:00:00Z') - n * 86400000).toISOString().slice(0, 10);
  const rows = (await env.DB.prepare(`SELECT ic.id, ic.case_id, ic.vehicle_id, ic.insurer, ic.claim_no, ic.reported_on, ic.status, c.case_no, v.plate
    FROM insurance_claims ic JOIN cases c ON c.id=ic.case_id JOIN vehicles v ON v.id=ic.vehicle_id
    WHERE ic.environment=? AND ic.status IN ('gemeldet','in_pruefung') AND ic.reported_on <= ? AND v.eval_excluded=0`).bind(environment, limit).all()).results; // ruhende Fahrzeuge aus Bewertungen ausgenommen (18.10.2026)
  return rows.map((r) => ({ code: 'CLAIM_OPEN_LONG', subject: r.id, case_id: r.case_id, vehicle_id: r.vehicle_id, severity: 'hinweis', owner_role: 'fleet', requires_decision: 0,
    ...fm('CLAIM_OPEN_LONG', { label: `${r.case_no} (${r.plate})`, insurer: r.insurer, claim_no: r.claim_no || null, date: r.reported_on.split('-').reverse().join('.'), st: r.status, days: n }),
    next_action: 'Beim Versicherer nach dem Stand fragen; Status bzw. Erstattung mit Nachweis im Vorgang eintragen.' }));
}
