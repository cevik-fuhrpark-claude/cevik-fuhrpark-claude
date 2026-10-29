// [CLAUDE] Versicherungsfälle je Vorgang (z. B. Unfall, Glasbruch, Sturm): nur Inhaber/Fuhrparkleitung.
// Alle Angaben laut Schadenmeldung bzw. Schreiben/Abrechnung des Versicherers (Pflicht-Nachweis) – die App berechnet nichts außer
// der Dauer seit Meldung und dem Saldo „Kosten des Vorgangs − Erstattung“ (nur wenn beide belegt sind).
import { findingText as fm } from '../public/finding-messages.js';
import { occurredCsv, nowIso, laterIso, conflict, uuid, bad, forbidden, notFound, str, num, oneOf, berlinDate, isCalendarDate, rateOf, roundCents, commaDec, pointDec, normPlate, ratePeriods, valueWork } from './util.js';
import { audit } from './auth.js';
import { csvCell, csvText } from './maintenance.js';
import { siteSelection } from './reports.js';

// Backlog 393: Gegner-Kennzeichen ohne einen einzigen Buchstaben/Ziffer („???“, „-“) abweisen – Format sonst frei (ausländische Kennzeichen)
const plateText = (v) => { if (v && !/[\p{L}\p{N}]/u.test(v)) throw bad('validation', 'Kennzeichen Unfallgegner: bitte Buchstaben/Ziffern laut Unfallbericht angeben oder leer lassen.'); return v; };
export const CLAIM_STATUS = ['gemeldet', 'in_pruefung', 'reguliert', 'abgelehnt', 'zurueckgezogen'];
export const OPEN_STATUS = ['gemeldet', 'in_pruefung'];
const STATUS_DE = { gemeldet: 'gemeldet', in_pruefung: 'in Prüfung', reguliert: 'reguliert', abgelehnt: 'abgelehnt', zurueckgezogen: 'zurückgezogen' };
const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';
const ISO = { test: isCalendarDate }; // echtes Kalenderdatum JJJJ-MM-TT
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

// auch für das Abschleppdatum am Vorgang (src/cases.js, Migration 0079) – gleiche Prüftexte
export function day(v, field, required = false, future = false) {
  const d = str(v, { max: 10, field, required });
  if (!d) return null;
  if (!ISO.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')) || new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) !== d) throw bad('validation', `${field}: gültiges Datum im Format JJJJ-MM-TT.`);
  if (d < '2000-01-01') throw bad('validation', `${field}: Datum außerhalb des zulässigen Bereichs.`);
  // Besichtigungstermin darf geplant sein (höchstens ein Jahr voraus), alle übrigen Daten nicht in der Zukunft
  if (future) { if (d > new Date(Date.parse(berlinDate() + 'T00:00:00Z') + 366 * 86400000).toISOString().slice(0, 10)) throw bad('validation', 'Besichtigung am: höchstens ein Jahr im Voraus.'); }
  else if (d > berlinDate()) throw bad('validation', `${field}: darf nicht in der Zukunft liegen.`);
  return d;
}

function readBody(body, existing = {}, user = null) {
  const dc = user ? commaDec(user) : undefined; const dp = pointDec(user); // Dezimalkomma je Sprache der Person (19.10.2026: „150,555“ in DE hieß „mehrdeutig“ statt „höchstens 2 Nachkommastellen“)
  const pick = (k) => (body[k] !== undefined ? body[k] : existing[k]);
  const f = {
    insurer: str(pick('insurer'), { max: 120, field: 'Versicherer' }),
    contract_id: str(pick('contract_id'), { max: 40, field: 'Versicherungsvertrag' }),
    claim_no: str(pick('claim_no'), { max: 60, field: 'Schadennummer' }),
    reported_on: day(pick('reported_on'), 'Gemeldet am', true),
    // leerer/fehlender Status behält den gespeicherten (18.10.2026: setzte einen regulierten Fall still auf „gemeldet“ zurück)
    status: oneOf(body.status !== undefined && body.status !== null && body.status !== '' ? body.status : (existing.status || 'gemeldet'), CLAIM_STATUS, 'Status'),
    deductible_net: num(pick('deductible_net'), { min: 0, max: 1000000, field: 'Selbstbeteiligung', nullable: true, cents: true, decimalComma: dc, decimalPoint: dp }),
    reimbursed_net: num(pick('reimbursed_net'), { min: 0, max: 10000000, field: 'Erstattung', nullable: true, cents: true, decimalComma: dc, decimalPoint: dp }),
    reimbursed_on: day(pick('reimbursed_on'), 'Erstattet am'),
    evidence: str(pick('evidence'), { required: true, max: 300, field: 'Nachweis' }),
    note: str(pick('note'), { max: 1000, field: 'Bemerkung' }),
    // Gutachter (Teilagent „Versicherungsschaden mit Gutachter“, 23.10.2026): alles optional, nur laut Schreiben/Termin des Gutachters bzw. Versicherers
    appraiser: str(pick('appraiser'), { max: 120, field: 'Gutachter' }),
    appraisal_on: day(pick('appraisal_on'), 'Besichtigung am', false, true),
    appraisal_received_on: day(pick('appraisal_received_on'), 'Gutachten eingegangen am'),
    appraisal_net: num(pick('appraisal_net'), { min: 0, max: 10000000, field: 'Schadenhöhe laut Gutachten', nullable: true, cents: true, decimalComma: dc, decimalPoint: dp }),
    // Unfallgegner (Teilagent „Unfall mit fremdem Fahrzeug“, 24.10.2026): alles optional und nur laut Unfallbericht/Schreiben.
    // Kein Namens-/Adressfeld (Datenschutz-Frage offen) – wer Namen braucht, trägt sie wie bisher unter „Bemerkung“ ein.
    opponent_plate: plateText(str(pick('opponent_plate'), { max: 20, field: 'Kennzeichen Unfallgegner' })),
    opponent_insurer: str(pick('opponent_insurer'), { max: 120, field: 'Versicherer Unfallgegner' }),
    opponent_claim_no: str(pick('opponent_claim_no'), { max: 60, field: 'Schadennummer Unfallgegner' }),
    // Polizeiliche Anzeige (Teilagent „Kraftstoffdiebstahl am Rastplatz“, 24.10.2026): optional, nur laut Anzeigebestätigung bzw. Angabe des Fahrers
    police_station: str(pick('police_station'), { max: 120, field: 'Polizeidienststelle' }),
    police_ref: str(pick('police_ref'), { max: 60, field: 'Polizeiliches Aktenzeichen' }),
    police_reported_on: day(pick('police_reported_on'), 'Anzeige erstattet am'),
  };
  if (f.police_ref && !f.police_station) throw bad('validation', 'Polizeiliches Aktenzeichen nur zusammen mit der Dienststelle angeben.');
  if (f.opponent_claim_no && !f.opponent_insurer) throw bad('validation', 'Schadennummer Unfallgegner nur zusammen mit dem Versicherer der Gegenseite angeben.');
  if (f.appraisal_net !== null && !f.appraisal_received_on) throw bad('validation', 'Schadenhöhe laut Gutachten nur mit dem Eingangsdatum des Gutachtens angeben.');
  if (f.appraisal_on && f.appraisal_received_on && f.appraisal_received_on < f.appraisal_on) throw bad('validation', 'Gutachten eingegangen am liegt vor der Besichtigung.');
  if ((f.reimbursed_net === null) !== (f.reimbursed_on === null)) throw bad('validation', 'Erstattung: Betrag und Datum nur zusammen laut Abrechnung des Versicherers angeben.');
  if (f.reimbursed_on && f.reimbursed_on < f.reported_on) throw bad('validation', 'Erstattet am liegt vor dem Meldedatum.');
  if (f.reimbursed_net !== null && ['abgelehnt', 'zurueckgezogen'].includes(f.status)) throw bad('validation', 'Bei „abgelehnt“/„zurückgezogen“ keine Erstattung eintragen.');
  return f;
}

// Versicherungsfall anlegen oder ändern (je Vorgang höchstens einer). Versicherer wird – wenn leer – aus dem gewählten Versicherungsvertrag übernommen.
export async function saveClaim(env, user, envName, caseId, body) {
  if (!isMgr(user)) throw forbidden();
  const c = await env.DB.prepare('SELECT id, case_no, vehicle_id, duplicate_of, occurred_at, created_at FROM cases WHERE id=? AND environment=?').bind(caseId, envName).first();
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
  let warning = null;
  if (f.contract_id) {
    const k = await env.DB.prepare(`SELECT id, partner, start_date, end_date, ended_on FROM vehicle_contracts WHERE id=? AND vehicle_id=? AND kind='versicherung'`).bind(f.contract_id, c.vehicle_id).first();
    if (!k) throw bad('validation', 'Versicherungsvertrag: bitte einen Versicherungsvertrag dieses Fahrzeugs wählen.');
    // Backlog 621 (Blickwinkel „Versichererwechsel zum 01.01.“): Vertrag galt am Schadentag (Schadenzeitpunkt, sonst Meldetag) nicht – nur Warnung,
    // nicht blockierend (Laufzeit im System kann unvollständig sein); vorher wurde der Fall still dem falschen Versicherer zugeordnet
    const day = occurrenceDay(c);
    const end = k.ended_on || k.end_date || null;
    if (day && ((k.start_date && k.start_date > day) || (end && end < day))) warning = { code: 'contract_not_valid_at_occurrence', day, start_date: k.start_date || null, end_date: end };
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
    await env.DB.prepare(`INSERT INTO insurance_claims(id,case_id,environment,vehicle_id,contract_id,insurer,claim_no,reported_on,status,deductible_net,reimbursed_net,reimbursed_on,evidence,note,file_id,appraiser,appraisal_on,appraisal_received_on,appraisal_net,opponent_plate,opponent_insurer,opponent_claim_no,police_station,police_ref,police_reported_on,created_by,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(case_id) DO NOTHING`).bind(id, c.id, envName, c.vehicle_id, f.contract_id, f.insurer, f.claim_no, f.reported_on, f.status, f.deductible_net, f.reimbursed_net, f.reimbursed_on, f.evidence, f.note, f.file_id, f.appraiser, f.appraisal_on, f.appraisal_received_on, f.appraisal_net, f.opponent_plate, f.opponent_insurer, f.opponent_claim_no, f.police_station, f.police_ref, f.police_reported_on, user.id, now, now).run()
      .then((r) => { if (!(r.meta && r.meta.changes)) throw conflict('version_conflict', 'Versicherungsfall wurde zwischenzeitlich angelegt. Bitte neu laden.'); });
    await audit(env, user.id, 'claim.create', id, { case_no: c.case_no, insurer: f.insurer, status: f.status, ...(warning ? { warning: warning.code } : {}) });
    return { id, created: true, ...(warning ? { warning } : {}) };
  }
  const changed = Object.keys(f).filter((k) => f[k] !== ex[k]);
  if (!changed.length) return { id: ex.id, changed: [], ...(stale ? { duplicate: true } : {}), ...(warning ? { warning } : {}) };
  if (stale) throw staleErr();
  // nur auf dem gelesenen Stand (parallele Änderungen überschrieben sich sonst still, 17.10.2026)
  const r = await env.DB.prepare(`UPDATE insurance_claims SET contract_id=?,insurer=?,claim_no=?,reported_on=?,status=?,deductible_net=?,reimbursed_net=?,reimbursed_on=?,evidence=?,note=?,file_id=?,appraiser=?,appraisal_on=?,appraisal_received_on=?,appraisal_net=?,opponent_plate=?,opponent_insurer=?,opponent_claim_no=?,police_station=?,police_ref=?,police_reported_on=?,updated_at=? WHERE id=? AND updated_at=?`)
    .bind(f.contract_id, f.insurer, f.claim_no, f.reported_on, f.status, f.deductible_net, f.reimbursed_net, f.reimbursed_on, f.evidence, f.note, f.file_id, f.appraiser, f.appraisal_on, f.appraisal_received_on, f.appraisal_net, f.opponent_plate, f.opponent_insurer, f.opponent_claim_no, f.police_station, f.police_ref, f.police_reported_on, laterIso(ex.updated_at), ex.id, ex.updated_at).run();
  if (!(r.meta && r.meta.changes)) throw conflict('version_conflict', 'Versicherungsfall wurde zwischenzeitlich geändert. Bitte neu laden.');
  await audit(env, user.id, 'claim.update', ex.id, { case_no: c.case_no, changed: Object.fromEntries(changed.map((k) => [k, { from: ex[k], to: f[k] }])) });
  return { id: ex.id, changed, ...(warning ? { warning } : {}) };
}

// Schadentag eines Vorgangs (Berliner Kalendertag): Schadenzeitpunkt (Tag oder Zeitpunkt), sonst Meldezeit
export function occurrenceDay(c) {
  const o = c && (c.occurred_at || c.created_at);
  if (!o) return null;
  return String(o).length === 10 ? String(o) : berlinDate(o);
}

// „Gutachten ausstehend“: Besichtigung eingetragen, noch kein Eingang des Gutachtens, Fall offen (keine eigene Frist – nur Zustand)
const shape = (r, today) => ({ ...r, open: OPEN_STATUS.includes(r.status), days_open: OPEN_STATUS.includes(r.status) ? days(r.reported_on, today) : null,
  appraisal_pending: OPEN_STATUS.includes(r.status) && !!r.appraisal_on && !r.appraisal_received_on, opponent: !!(r.opponent_plate || r.opponent_insurer || r.opponent_claim_no), police: !!(r.police_station || r.police_ref || r.police_reported_on), appraisal_upcoming: !!r.appraisal_on && !r.appraisal_received_on && r.appraisal_on >= today });

// Für die Vorgangsansicht (nur Leitung): Versicherungsfall + Versicherungsverträge des Fahrzeugs zur Auswahl (eine Abfrage)
export async function claimForCase(env, caseId, vehicleId) {
  const rows = (await env.DB.prepare(`SELECT 'claim' AS t, ic.id, ic.contract_id, ic.insurer, ic.claim_no, ic.reported_on, ic.status, ic.deductible_net, ic.reimbursed_net, ic.reimbursed_on, ic.evidence, ic.note, ic.updated_at, ic.file_id, ic.appraiser, ic.appraisal_on, ic.appraisal_received_on, ic.appraisal_net, ic.opponent_plate, ic.opponent_insurer, ic.opponent_claim_no, ic.police_station, ic.police_ref, ic.police_reported_on, f.filename AS file_name, NULL AS partner, NULL AS contract_no, NULL AS end_date, NULL AS ended_on, NULL AS start_date
      FROM insurance_claims ic LEFT JOIN files f ON f.id=ic.file_id AND f.environment=ic.environment WHERE ic.case_id=?1
    UNION ALL SELECT 'contract', k.id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, k.partner, k.contract_no, k.end_date, k.ended_on, k.start_date
      FROM vehicle_contracts k WHERE k.vehicle_id=?2 AND k.kind='versicherung'`).bind(caseId, vehicleId).all()).results;
  const claim = rows.find((r) => r.t === 'claim');
  const today = berlinDate();
  return {
    claim: claim ? shape(Object.fromEntries(Object.entries(claim).filter(([k]) => !['t', 'partner', 'contract_no', 'end_date', 'ended_on', 'start_date'].includes(k))), today) : null,
    insurance_contracts: rows.filter((r) => r.t === 'contract').map((r) => ({ id: r.id, partner: r.partner, contract_no: r.contract_no, start_date: r.start_date || null, end_date: r.end_date, ended_on: r.ended_on })),
  };
}

// Übersicht (Mehr → Versicherungsfälle): offen/alle/Status; Kosten des Vorgangs (nur belegte Ist-Kosten) und Saldo nach Erstattung
export async function claimOverview(env, user, envName, query = {}) {
  if (!isMgr(user)) throw forbidden();
  // Backlog 527/531 (Blickwinkel „Quartalsende: offene Versicherungsfälle“): Filter „nachfassen“ (Frist aus `claim_followup_days`) und
  // „ohne_erstattung“ (reguliert, aber keine Erstattung eingetragen – neutral, eine Regulierung ohne Zahlung bleibt möglich)
  const filter = ['offen', 'gutachten', 'nachfassen', 'ohne_erstattung', 'alle', ...CLAIM_STATUS].includes(query.filter) ? query.filter : 'offen';
  const sets = new Map((await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN ('workshop_hourly_rate_net','claim_followup_days')
    UNION ALL SELECT '__rp', json_group_array(json_object('u', valid_until, 'r', rate_net)) FROM hourly_rate_periods`).all()).results.map((r) => [r.key, r.value]));
  const rv = sets.get('workshop_hourly_rate_net');
  const rate = rateOf(rv); const periods = ratePeriods(sets.get('__rp')); // Stundensatz-Verlauf (Backlog 412)
  const fu = Number(sets.get('claim_followup_days'));
  const followupDays = fu > 0 ? fu : null;
  const rows = (await env.DB.prepare(`SELECT ic.*, c.case_no, c.status AS case_status, c.description, c.created_at AS case_created_at, c.occurred_at AS case_occurred_at, k.contract_no, v.plate,
      -- Kennzeichen zum Meldedatum (Backlog 276): früheres Kennzeichen, das an dem Tag noch galt, sonst das heutige
      COALESCE((SELECT vp.plate FROM vehicle_plates vp WHERE vp.vehicle_id=ic.vehicle_id AND vp.valid_until > ic.reported_on ORDER BY vp.valid_until LIMIT 1), v.plate) AS plate_at_report, v.site AS vehicle_site, v.eval_excluded AS vehicle_excluded,
      (SELECT COALESCE(SUM(w.hours),0) FROM work_entries w WHERE w.case_id=c.id) AS hours,
      (SELECT json_group_array(json_object('hours', w.hours, 'work_date', w.work_date)) FROM work_entries w WHERE w.case_id=c.id) AS wj,
      (SELECT COUNT(*) FROM parts p WHERE p.case_id=c.id AND (p.unit_price_net IS NULL OR p.valuation<>'actual')) +
      (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id AND (e.amount_net IS NULL OR e.valuation<>'actual')) AS not_actual,
      (SELECT COALESCE(SUM(ROUND(p.quantity*p.unit_price_net*100 + 1e-6)/100.0),0) FROM parts p WHERE p.case_id=c.id AND p.valuation='actual' AND p.unit_price_net IS NOT NULL) AS parts_net,
      (SELECT COALESCE(SUM(ROUND(e.amount_net*100 + 1e-6)/100.0),0) FROM external_costs e WHERE e.case_id=c.id AND e.valuation='actual' AND e.amount_net IS NOT NULL) AS ext_net,
      (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id AND (e.amount_net IS NULL OR e.valuation<>'actual')) AS ext_not_actual,
      (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id AND e.covers_work_and_parts=1) AS covered,
      (SELECT COUNT(*) FROM work_entries w WHERE w.case_id=c.id) + (SELECT COUNT(*) FROM parts p WHERE p.case_id=c.id) + (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id) AS items,
      -- frühere Kennzeichen des Fahrzeugs (Backlog 257c): Suche über das alte Kennzeichen (Gutachten/Versicherer nennen es oft)
      (SELECT group_concat(vp.plate, '|') FROM vehicle_plates vp WHERE vp.vehicle_id=ic.vehicle_id) AS fp_search
    FROM insurance_claims ic JOIN cases c ON c.id=ic.case_id JOIN vehicles v ON v.id=ic.vehicle_id LEFT JOIN vehicle_contracts k ON k.id=ic.contract_id WHERE ic.environment=? ORDER BY ic.reported_on DESC`).bind(envName).all()).results;
  const today = berlinDate();
  const r2 = roundCents; // je Position auf Cent wie die Vorgangsbewertung (18.10.2026)
  // Filter „Fahrzeug-Standort“ vor den Zählern (Standort laut Fahrzeugstamm)
  const sel = siteSelection(rows.map((r) => ({ site: r.vehicle_site })), query.site);
  // Backlog 274 (Teilagent „Versicherer verlangt eine Schadenaufstellung“): Zeitraum nach Meldedatum (von/bis) und Versicherer (genau,
  // nur eigene Seite – die Suche findet auch den Versicherer des Unfallgegners); wirken vor den Zählern wie der Standort
  const day = (x) => { if (x === undefined || x === null || x === '') return null; const v = String(x).slice(0, 12); if (!isCalendarDate(v)) throw bad('validation', 'Zeitraum: Datum im Format JJJJ-MM-TT angeben.'); return v; };
  const from = day(query.from); const to = day(query.to);
  if (from && to && from > to) throw bad('validation', 'Zeitraum: „von“ liegt nach „bis“.');
  const insurerOptions = [...new Set(rows.filter((r) => !sel.site || sel.match(r.vehicle_site)).map((r) => r.insurer).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'de'));
  const insurer = query.insurer ? str(query.insurer, { max: 120, field: 'Versicherer' }) : null;
  let list = rows.filter((r) => (!sel.site || sel.match(r.vehicle_site)) && (!from || r.reported_on >= from) && (!to || r.reported_on <= to) && (!insurer || r.insurer === insurer)).map((r) => {
    // gleiche Regel wie die Vorgangsbewertung: Fremdleistung „ersetzt eigene Arbeit/Teile“ → nur Fremdleistung; ohne Stundensatz oder mit unbewerteten/geschätzten Positionen: keine Summe
    // mit Stundensatz-Verlauf je Arbeitsdatum der damals gültige Satz (Backlog 412); ohne Verlauf wie bisher rund(Stunden × Satz)
    const vw = periods.length ? valueWork(rate, periods, JSON.parse(r.wj || '[]')) : null;
    const workNet = r.covered ? 0 : vw ? (vw.unvalued_hours > 0 ? null : vw.net) : rate === null ? (r.hours ? null : 0) : r2(r.hours * rate);
    // ersetzt eine Fremdleistung eigene Arbeit/Teile, zählen nur die Fremdleistungen – auch deren Bewertung (vorher: unbewertete Fremdrechnung → „0 €“, 17.10.2026)
    // ohne jede Kostenposition: „–“ statt 0 € (wie die Vorgangsansicht; vorher Saldo = −Erstattung, 17.10.2026)
    const complete = r.items > 0 && workNet !== null && (r.covered ? r.ext_not_actual === 0 : r.not_actual === 0);
    const cost = complete ? r2(workNet + (r.covered ? 0 : r.parts_net) + r.ext_net) : null;
    const { hours, wj, not_actual, ext_not_actual, parts_net, ext_net, covered, items, vehicle_excluded, fp_search, ...rest } = r;
    const sh = shape(rest, today);
    // ruhende Fahrzeuge (Entscheidung 10.10.2026: aus allen Bewertungen ausgenommen) bleiben sichtbar, aber ohne Nachfass-Hinweis und außerhalb der Summe – wie Agent und Kostenbericht (18.10.2026)
    const excluded = !!vehicle_excluded;
    return { fp_search, ...sh, eval_excluded: excluded, followup_due: !excluded && followupDays !== null && sh.open && sh.days_open >= followupDays, case_cost_net: cost, cost_incomplete: items > 0 && !complete, balance_net: cost !== null && r.reimbursed_net !== null ? r2(cost - r.reimbursed_net) : null };
  });
  const noReimb = (c) => c.status === 'reguliert' && (c.reimbursed_net === null || c.reimbursed_net === undefined);
  const counts = { offen: 0, gutachten: 0, nachfassen: 0, ohne_erstattung: 0, alle: list.length }; for (const s of CLAIM_STATUS) counts[s] = 0;
  for (const c of list) { counts[c.status]++; if (c.open) counts.offen++; if (c.appraisal_pending) counts.gutachten++; if (c.followup_due) counts.nachfassen++; if (noReimb(c)) counts.ohne_erstattung++; }
  if (filter === 'offen') list = list.filter((c) => c.open); else if (filter === 'gutachten') list = list.filter((c) => c.appraisal_pending);
  else if (filter === 'nachfassen') list = list.filter((c) => c.followup_due); else if (filter === 'ohne_erstattung') list = list.filter(noReimb);
  else if (filter !== 'alle') list = list.filter((c) => c.status === filter);
  // Backlog 528: bei „offen“/„nachfassen“ die am längsten offenen Fälle zuerst (vorher neueste zuerst – die dringendsten standen im Ausdruck hinten)
  if (filter === 'offen' || filter === 'nachfassen') list.sort((a, b) => String(a.reported_on || '').localeCompare(String(b.reported_on || '')) || String(a.case_no).localeCompare(String(b.case_no)));
  // Suche (24.10.2026, Backlog 219): Der Versicherer der Gegenseite nennt am Telefon nur „seine“ Schadennummer oder das Kennzeichen.
  // Gesucht wird in dem, was die Leitung selbst eingetragen hat – ohne neue Datenbankabfrage (die Liste liegt bereits vor):
  // Kennzeichen (auch ohne Trennzeichen), Vorgangsnummer, Versicherer/Schadennummer beider Seiten und Gutachter. Kein Freitext-Vermerk.
  const q = str(query.q, { max: 60, field: 'Suche' });
  if (q) {
    // Backlog 392 (Blickwinkel „Unfall in Polen“): Akzente/ł egal („Wrzesnia“ findet „KPP Września“), Kennzeichen mit vorangestellter
    // Länderkennung („PL PO 12345“) findet das gespeicherte „PO 12345“ (gespeichertes Kennzeichen ab 5 Zeichen im Suchtext enthalten)
    const fold = (x) => String(x).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ł/g, 'l').replace(/ß/g, 'ss');
    const low = fold(q);
    const pk = normPlate(q);
    const plateHit = (x) => { if (!pk) return false; const n = normPlate(x); return !!n && (n.includes(pk) || (n.length >= 5 && pk.endsWith(n))); };
    list = list.filter((c) => [c.case_no, c.insurer, c.claim_no, c.opponent_insurer, c.opponent_claim_no, c.appraiser, c.police_station, c.police_ref].some((x) => x && fold(x).includes(low))
      || [c.plate, c.opponent_plate, ...(c.fp_search ? String(c.fp_search).split('|') : [])].some((x) => x && (fold(x).includes(low) || plateHit(x))));
  }
  for (const c of list) delete c.fp_search;
  const reimb = list.filter((c) => c.reimbursed_net !== null && !c.eval_excluded);
  const reimbX = list.filter((c) => c.reimbursed_net !== null && c.eval_excluded);
  const sum = (a) => (a.length ? r2(a.reduce((s, c) => s + c.reimbursed_net, 0)) : null);
  // Summen je Meldejahr und gesamt (Backlog 275): nur Werte, die eingetragen bzw. belegt sind; Fälle ruhender Fahrzeuge außerhalb (wie die Erstattungssumme);
  // Kosten mit unbewerteten/geschätzten Positionen zählen nicht in die Summe, sondern als „unvollständig“
  // *_n = Anzahl Fälle mit eingetragenem Wert (0 → Anzeige „–“ statt 0 €)
  const acc = () => ({ n: 0, deductible_net: 0, deductible_n: 0, appraisal_net: 0, appraisal_n: 0, reimbursed_net: 0, reimbursed_n: 0, case_cost_net: 0, cost_n: 0, cost_incomplete: 0, cost_missing: 0 });
  const years = new Map(); const total = acc();
  for (const c of list) {
    if (c.eval_excluded) continue;
    const y = String(c.reported_on || '').slice(0, 4); if (!years.has(y)) years.set(y, acc());
    for (const a of [years.get(y), total]) {
      a.n++;
      if (c.deductible_net !== null && c.deductible_net !== undefined) { a.deductible_net = r2(a.deductible_net + c.deductible_net); a.deductible_n++; }
      if (c.appraisal_net !== null && c.appraisal_net !== undefined) { a.appraisal_net = r2(a.appraisal_net + c.appraisal_net); a.appraisal_n++; }
      if (c.reimbursed_net !== null && c.reimbursed_net !== undefined) { a.reimbursed_net = r2(a.reimbursed_net + c.reimbursed_net); a.reimbursed_n++; }
      if (c.case_cost_net !== null) { a.case_cost_net = r2(a.case_cost_net + c.case_cost_net); a.cost_n++; } else if (c.cost_incomplete) a.cost_incomplete++; else a.cost_missing++;
    }
  }
  const sums = { total, by_year: [...years.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([year, v]) => ({ year, ...v })) };
  return { today, filter, q: q || null, from, to, insurer, insurer_options: insurerOptions, site: sel.site, site_options: sel.options, followup_days: followupDays, counts, claims: list, sums, reimbursed_sum_net: sum(reimb), reimbursed_sum_excluded_net: sum(reimbX) };
}

// thirdParty (Backlog 277): Export für Dritte (z. B. Versicherer) ohne Freitexte „Nachweis“/„Bemerkung“ (dort stehen u. a. Namen von Unfallgegnern)
export function claimsCsv(ov, { thirdParty = false } = {}) {
  const head = ['Kennzeichen', 'Vorgang', 'Versicherer', 'Schadennummer', 'Gemeldet am', 'Status', 'Tage offen', 'Selbstbeteiligung netto (EUR)', 'Erstattung netto (EUR)', 'Erstattet am',
    'Kosten Vorgang belegt netto (EUR)', 'Saldo nach Erstattung (EUR)', 'Nachweis', 'Bemerkung',
    'Gutachter', 'Besichtigung am', 'Gutachten eingegangen am', 'Schadenhöhe laut Gutachten netto (EUR)', 'Gutachten ausstehend', 'Kennzeichen Unfallgegner', 'Versicherer Unfallgegner', 'Schadennummer Unfallgegner', 'Polizeidienststelle', 'Polizeiliches Aktenzeichen', 'Anzeige erstattet am', 'Schreiben verknüpft', 'Fahrzeug ruhend (nicht in Summen)', 'Kosten vollständig bewertet', 'Vertragsnummer', 'Vorgang angelegt am', 'Kennzeichen zum Meldedatum', 'Schadenzeitpunkt laut Meldung',
    // Backlog 529: am Ende angehängt (bestehende Spaltenpositionen bleiben)
    'Fahrzeug-Standort', 'Nachfassen fällig'];
  const drop = thirdParty ? new Set([12, 13]) : new Set(); const keep = (_, i) => !drop.has(i);
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const lines = [head.filter(keep).join(';')];
  for (const c of ov.claims) lines.push([c.plate, c.case_no, c.insurer, c.claim_no, c.reported_on, STATUS_DE[c.status], c.days_open ?? '', n(c.deductible_net), n(c.reimbursed_net), c.reimbursed_on,
    n(c.case_cost_net), n(c.balance_net), c.evidence, c.note, c.appraiser, c.appraisal_on, c.appraisal_received_on, n(c.appraisal_net), c.appraisal_pending ? 'ja' : 'nein', c.opponent_plate, c.opponent_insurer, c.opponent_claim_no, c.police_station, c.police_ref, c.police_reported_on,
    c.file_id ? 'ja' : 'nein', c.eval_excluded ? 'ja' : 'nein', c.cost_incomplete ? 'nein' : c.case_cost_net !== null ? 'ja' : '', c.contract_no, c.case_created_at ? berlinDate(c.case_created_at) : '', c.plate_at_report || c.plate, occurredCsv(c.case_occurred_at),
    c.vehicle_site || '', c.followup_due ? 'ja' : c.open && ov.followup_days ? 'nein' : ''].map((x, i) => ([3, 21, 23, 28].includes(i) ? csvText(x) : csvCell(x))).filter(keep).join(';'));
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
