// [CLAUDE] Integrations-API für das Unternehmensbetriebssystem und n8n (Bearer-Token aus Cloudflare-Secret)
import { json, readJson, HttpError, nowIso, normalizeVin, timingSafeEqual, bad, berlinDate, berlinDayStartIso, sha256Hex, pickVehicleByPlate, isCalendarDate } from './util.js';
import { audit } from './auth.js';
import { masterPanel } from './agent.js';
import { costReport, kpiReport, siteSelection } from './reports.js';
import { maintenanceOverview, maintenanceHistory, maintenanceEventLists } from './maintenance.js';
import { listVehicles } from './vehicles.js';
import { winterMarks, winterStatus } from './tires.js';
import { dataQuality, CHECKS } from './quality.js';
import { telematicsOverview } from './telematics.js';
import { renderFindingMessage } from '../public/finding-messages.js';

// Tokens: INTEGRATION_TOKEN (lesen + Telematik schreiben), optional INTEGRATION_TOKEN_NEXT (gleiche Rechte, für Wechsel ohne Ausfall)
// und INTEGRATION_TOKEN_READ (nur lesen, z. B. für Auswertungen). Ergebnis: 'write' oder 'read'.
// Falsche Tokens je Netzadresse begrenzen (wie Login): ab TOKEN_FAIL_LIMIT.max Fehlversuchen im Fenster wird diese Adresse
// für den Rest des Fensters abgewiesen – auch mit gültigem Token, damit Durchprobieren nichts verrät. Einmal im Protokoll vermerkt.
export const TOKEN_FAIL_LIMIT = { max: 30, windowSec: 900 };
async function checkToken(request, env) {
  // Secrets unter 16 Zeichen passen nie (Mindestlänge) – wie nicht gesetzt behandeln: 503 statt 401 + Sperre der Adresse nach 30 Versuchen (22.10.2026)
  const usable = (t) => typeof t === 'string' && t.length >= 16;
  const full = [env.INTEGRATION_TOKEN, env.INTEGRATION_TOKEN_NEXT].filter(usable);
  const read = [env.INTEGRATION_TOKEN_READ].filter(usable);
  if (!full.length && !read.length) throw new HttpError(503, 'integration_disabled', 'Integrations-API ist nicht aktiviert (Secret INTEGRATION_TOKEN fehlt oder ist kürzer als 16 Zeichen).');
  const ip = request.headers.get('cf-connecting-ip') || 'unbekannt';
  const key = 'intfail:' + (await sha256Hex('cfp-ip:' + ip)).slice(0, 24);
  const win = Math.floor(Date.now() / 1000 / TOKEN_FAIL_LIMIT.windowSec) * TOKEN_FAIL_LIMIT.windowSec;
  const row = await env.DB.prepare('SELECT count FROM rate_limits WHERE key = ? AND window_start = ?').bind(key, win).first();
  if (row && row.count >= TOKEN_FAIL_LIMIT.max) throw new HttpError(429, 'rate_limited', 'Zu viele ungültige Token-Versuche von dieser Adresse. Bitte in 15 Minuten erneut versuchen.');
  const h = request.headers.get('authorization') || '';
  const token = (/^Bearer\s+(.+)$/i.exec(h) || [])[1] || ''; // Schema ohne Groß-/Kleinschreibung (RFC 7235, 20.10.2026)
  // alle Vergleiche ausführen (gleiche Laufzeit unabhängig vom Treffer)
  let scope = null;
  for (const t of full) if (timingSafeEqual(token, t)) scope = 'write';
  for (const t of read) if (timingSafeEqual(token, t) && !scope) scope = 'read';
  if (!scope || token.length < 16) {
    const c = await env.DB.prepare(`INSERT INTO rate_limits(key, window_start, count) VALUES (?, ?, 1)
      ON CONFLICT(key) DO UPDATE SET count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END, window_start = excluded.window_start
      RETURNING count`).bind(key, win).first();
    if (c && c.count === TOKEN_FAIL_LIMIT.max) await audit(env, null, 'integration.token_limited', null, { failures: c.count, minutes: TOKEN_FAIL_LIMIT.windowSec / 60 });
    throw new HttpError(401, 'invalid_token', 'Ungültiges Integrations-Token.');
  }
  return scope;
}

// Datensparsamkeit: Befunde aus Fahrerakte/Fahrerkarte nennen in der App den Fahrernamen (Sichtbarkeit laut Freigabe nur Inhaber/
// Fuhrparkleitung). Über die technische Schnittstelle wird der Name ersetzt; Code, Schweregrad, Frist und subject_key (Fahrer-ID) bleiben.
const PERSON_FINDINGS = ['DRIVER_DOC_EXPIRED', 'DRIVER_DOC_EXPIRES_SOON', 'LICENSE_CHECK_DUE', 'LICENSE_CHECK_DUE_SOON', 'LICENSE_CHECK_FAILED', 'TACHO_CARD_OVERDUE', 'TACHO_CARD_DUE'];
const REDACTED = 'Fahrer/in (Name nur in der App)';
async function personNames(env, environment) {
  const rows = (await env.DB.prepare(`SELECT f.id, d.display_name AS name FROM agent_findings f JOIN drivers d ON d.id = substr(f.subject_key, 1, instr(f.subject_key || '|', '|') - 1)
    WHERE f.environment=? AND f.finding_code IN (SELECT value FROM json_each(?))`).bind(environment, JSON.stringify(PERSON_FINDINGS)).all()).results;
  return new Map(rows.map((r) => [r.id, r.name]));
}
// name: ein Name oder eine Liste (aktueller Name + Name zum Zeitpunkt des Befunds aus message_args – nach einer Umbenennung
// stand sonst der alte Name ungeschwärzt im Master-Eingang, 17.10.2026)
function redactText(text, name) {
  if (text == null) return text;
  let t = String(text);
  for (const n of [...new Set([].concat(name || []).filter((x) => typeof x === 'string' && x.trim()))].sort((a, b) => b.length - a.length)) {
    t = t.split(`Fahrer ${n}`).join(REDACTED).split(n).join(REDACTED);
  }
  return t;
}
// Zündung: nur eindeutige Werte – Text „false“/„0“ galt vorher als „an“ (17.10.2026); Unbekanntes = nicht geliefert
function ignOf(v) {
  if (v === true || v === 1) return 1; if (v === false || v === 0) return 0;
  if (typeof v === 'string') { const x = v.trim().toLowerCase(); if (['true', '1', 'an', 'on', 'ein'].includes(x)) return 1; if (['false', '0', 'aus', 'off'].includes(x)) return 0; }
  return null;
}
function argName(args) {
  let a = args;
  if (typeof a === 'string') { try { a = JSON.parse(a); } catch { a = null; } }
  // gespeichert als {k, a: {name, …}} (findingText) – bis 19.10.2026 nur flach gelesen, der Name eines umbenannten Fahrers blieb so ungeschwärzt
  const v = a && typeof a === 'object' ? (a.a && typeof a.a === 'object' ? a.a.name : a.name) : null;
  return typeof v === 'string' ? v : null;
}
// `message_args` (Vorlagenwerte für die Oberflächensprache, public/finding-messages.js) bleibt in der App – die Schnittstelle liefert
// den deutschen Text `message` wie bisher (Datensparsamkeit: keine zusätzlichen Einzelwerte, Schwärzung greift nur auf `message`).
// Wiedervorlage-Vermerk (Freitext der Leitung) bleibt in der App – wie /v1/cases (Backlog 76, 17.10.2026: ging über Befunde/Master-Eingang hinaus)
// ebenso der Sperrgrund (Vermerk der Leitung bei „Fahrzeug sperren“, z. B. Namen/Gesundheitsangaben) – Befund ohne Grund (18.10.2026)
function withoutFollowupNote(code, message, args) {
  if (code !== 'CASE_FOLLOWUP_DUE' && code !== 'VEHICLE_LOCKED') return message;
  let a = args; if (typeof a === 'string') { try { a = JSON.parse(a); } catch { a = null; } }
  if (code === 'VEHICLE_LOCKED') return a && a.a && a.a.reason ? renderFindingMessage('VEHICLE_LOCKED_DEFAULT', { ...a.a, reason: null }, 'de') : message;
  return a && a.a && a.a.note ? renderFindingMessage(a.k || code, { ...a.a, note: null }, 'de') : message;
}
function redactFinding(row, names) {
  const { message_args, ...f } = row;
  f.message = withoutFollowupNote(f.finding_code, f.message, message_args);
  if (!PERSON_FINDINGS.includes(f.finding_code)) return f;
  const n = [names.get(f.id), argName(message_args)];
  return { ...f, message: redactText(f.message, n), next_action: redactText(f.next_action, n), person_redacted: true };
}
function redactInbox(row, names) {
  const { message_args, ...payload } = row.payload || {};
  const code = payload && payload.finding_code;
  if (row.payload) payload.message = withoutFollowupNote(code, payload.message, (row.payload || {}).message_args);
  const m = row.payload ? { ...row, payload } : row;
  if (!PERSON_FINDINGS.includes(code)) return m;
  const n = [names.get(m.finding_id), argName((row.payload || {}).message_args)];
  return { ...m, decision_note: redactText(m.decision_note, n), payload: { ...m.payload, message: redactText(m.payload.message, n), next_action: redactText(m.payload.next_action, n) }, person_redacted: true };
}

// Umgebung: test | production (Groß-/Kleinschreibung egal), fehlend = production; anderes → 400 (18.10.2026: „tset“ lieferte still Betriebsdaten)
// ISO-Zeitpunkt mit echtem Kalendertag und gültiger Uhrzeit (Date.parse rechnet 30.02. bzw. 24:00 still auf den Folgetag um, 18.10.2026)
// verankert (20.10.2026: „2026-10-17 08:00 PST“ wurde über Date.parse still angenommen); nur ISO mit optionalen Sekunden/Bruchteilen und Zeitzone
const validStamp = (x) => { const mm = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/i.exec(String(x)); return !!mm && isCalendarDate(mm[1]) && (mm[2] === undefined || (+mm[2] < 24 && +mm[3] < 60 && (mm[4] === undefined || +mm[4] < 60))); };
const envParam = (url) => {
  const raw = url.searchParams.get('environment'); if (raw === null || raw.trim() === '') return 'production';
  const v = raw.trim().toLowerCase(); if (v === 'test' || v === 'production') return v;
  throw bad('validation', 'environment muss test oder production sein.');
};

export async function integrationRouter(request, env, ctx, url) {
  const scope = await checkToken(request, env);
  const p = url.pathname.replace('/api/integration', '');
  const m = request.method;
  if (m !== 'GET' && scope !== 'write') throw new HttpError(403, 'read_only_token', 'Dieses Token darf nur lesen.');
  if (p === '/v1/vehicles' && m === 'GET') {
    envParam(url); // Wert prüfen wie überall (Stammdaten sind gemeinsam; 18.10.2026 wurde „tset“ angenommen)
    // eval_excluded: ruhend (aus allen Bewertungen ausgenommen, z. B. Reparatur/Verkauf offen) – additiv, sonst nicht von einsatzbereiten unterscheidbar
    const rows = (await env.DB.prepare(`SELECT v.id, v.vin, v.plate, v.kind, v.site, v.manufacturer, v.model, v.build_year, v.trailer_plate, v.trailer_vin, v.master_status, v.updated_at, CASE WHEN v.eval_excluded THEN 1 ELSE 0 END AS eval_excluded
      FROM vehicles v WHERE v.active=1 ORDER BY v.plate`).all()).results.map((v) => ({ ...v, eval_excluded: !!v.eval_excluded }));
    const sel = siteSelection(rows, url.searchParams.get('site'));
    return json({ schema_version: '1.0', ...(sel.site ? { site: sel.site } : {}), vehicles: sel.site ? rows.filter((v) => sel.match(v.site)) : rows });
  }
  if (p === '/v1/cases' && m === 'GET') {
    const pageSize = Math.min(Math.max(Math.round(Number(url.searchParams.get('limit')) || 1000), 1), 1000);
    // since als Zeitpunkt lesen (auch mit Zeitzone, z. B. +02:00) und in UTC vergleichen – Textvergleich ließ Vorgänge stumm aus (17.10.2026)
    // ohne Zeitzone: Uhrzeit = UTC (wie Telematik), reines Datum = Beginn des Berliner Kalendertags (19.10.2026: hing von der Laufzeitumgebung ab bzw.
    // ein Datum galt als 00:00 UTC = 02:00 Berlin – Vorgänge zwischen 00:00 und 02:00 fehlten)
    // unkodiertes „+02:00“ kommt als Leerzeichen an (curl/Handaufruf) – als „+“ lesen (21.10.2026: 400)
    const sinceIn = (url.searchParams.get('since') || '').replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?) (\d{2}:?\d{2})$/, '$1+$2') || null;
    const sinceRaw = sinceIn && /^\d{4}-\d{2}-\d{2}$/.test(sinceIn) && isCalendarDate(sinceIn) ? berlinDayStartIso(sinceIn)
      : sinceIn && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(sinceIn) ? sinceIn + 'Z' : sinceIn;
    const sinceMs = sinceRaw ? Date.parse(sinceRaw) : 0;
    if (!Number.isFinite(sinceMs) || (sinceRaw && !validStamp(sinceRaw))) throw bad('validation', 'since: Zeitpunkt nach ISO 8601 (z. B. 2026-10-17T08:00:00Z).');
    const since = new Date(sinceMs).toISOString();
    const rows = (await env.DB.prepare(`SELECT c.id, c.case_no, c.environment, c.vehicle_id, c.status, c.priority, c.reported_priority, c.reported_driveability, c.safety_lock,
      c.workshop_site, c.origin, c.parent_case_id, c.fleet_received_at, c.workshop_ack_at, c.created_at, c.updated_at, c.closed_at, c.version,
      c.planned_date, c.parts_expected_date, c.maintenance_rule_id, c.maintenance_event_id, CASE WHEN c.cost_over_limit_at IS NOT NULL AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt') THEN 1 ELSE 0 END AS cost_approval_pending
      FROM cases c WHERE c.environment=?1 AND (c.updated_at > ?2 OR (?3 IS NOT NULL AND c.updated_at = ?2 AND c.id > ?3)) ORDER BY c.updated_at, c.id LIMIT ?4`)
      .bind(envParam(url), since, url.searchParams.get('after_id') ? String(url.searchParams.get('after_id')).slice(0, 64) : null, pageSize + 1).all()).results;
    // Blättern ohne Lücken: gleiche updated_at (Sammeländerungen) über after_id = id der letzten Zeile; additiv (ohne after_id wie bisher)
    const more = rows.length > pageSize; if (more) rows.length = pageSize;
    const last = rows[rows.length - 1];
    return json({ schema_version: '1.0', cases: rows, has_more: more, ...(more ? { next: { since: last.updated_at, after_id: last.id } } : {}) });
  }
  // Verfügbarkeit für Tourenplanung: gesperrt / Werkstatt / Meldung offen / laut System einsatzbereit (keine Freigabe-Aussage)
  if (p === '/v1/availability' && m === 'GET') {
    // optional ?site= (Standort laut Fahrzeugstamm, Schreibweise egal, 'ohne' = ohne Standort) – z. B. Disposition Bayern
    let list = await listVehicles(env, { role: 'owner' }, envParam(url));
    const sel = siteSelection(list, url.searchParams.get('site'));
    if (sel.site) list = list.filter((v) => sel.match(v.site));
    // optional ?include=notes: aktive, für Fahrer freigegebene Hinweise zum Fahrzeug (nur Text + Zeitpunkt, ohne Verfasser – Datensparsamkeit)
    const inc = new Set(String(url.searchParams.get('include') || '').split(',').map((x) => x.trim()).filter(Boolean));
    let notesBy = null;
    if (inc.has('notes')) {
      notesBy = new Map();
      const nr = (await env.DB.prepare('SELECT vehicle_id, text, created_at, valid_until FROM vehicle_notes WHERE environment=? AND archived_at IS NULL AND (valid_until IS NULL OR valid_until >= ?) AND for_driver=1 ORDER BY created_at DESC, rowid DESC')
        .bind(envParam(url), berlinDate()).all()).results;
      for (const n of nr) { if (!notesBy.has(n.vehicle_id)) notesBy.set(n.vehicle_id, []); notesBy.get(n.vehicle_id).push({ text: n.text, created_at: n.created_at, valid_until: n.valid_until }); }
    }
    // optional ?include=warranties: heute laufende Gewährleistungen (Teile/Fremdleistungen laut Rechnung) – nur Bezeichnung, Art, Datum, Vorgangsnummer;
    // keine Preise, keine Personen. Mehrere Angaben kommagetrennt: include=notes,warranties
    let warrBy = null;
    if (inc.has('warranties')) {
      warrBy = new Map();
      const wr = (await env.DB.prepare(`SELECT c.vehicle_id, c.case_no, g.item, g.item_kind, g.warranty_until FROM cases c JOIN
        (SELECT case_id, name AS item, 'part' AS item_kind, warranty_until, created_at FROM parts WHERE warranty_until >= ?2
         UNION ALL SELECT case_id, supplier AS item, 'external' AS item_kind, warranty_until, created_at FROM external_costs WHERE warranty_until >= ?2) g ON g.case_id=c.id
        WHERE c.environment=?1 ORDER BY g.warranty_until, g.created_at`).bind(envParam(url), berlinDate()).all()).results;
      for (const w of wr) { if (!warrBy.has(w.vehicle_id)) warrBy.set(w.vehicle_id, []); warrBy.get(w.vehicle_id).push({ item: w.item, item_kind: w.item_kind, warranty_until: w.warranty_until, case_no: w.case_no }); }
    }
    // optional ?include=winter: Winterreifen-Status je Fahrzeug (StVO § 2 Abs. 3a, nur aus Erfasstem; Anhänger nicht_pflichtig) – keine Personen
    let winterBy = null;
    if (inc.has('winter')) {
      winterBy = new Map();
      const te = (await env.DB.prepare('SELECT vehicle_id, position, event_type, winter_mark FROM tire_events WHERE environment=? ORDER BY created_at DESC').bind(envParam(url)).all()).results;
      const byV = new Map(); for (const e of te) { if (!byV.has(e.vehicle_id)) byV.set(e.vehicle_id, []); byV.get(e.vehicle_id).push(e); }
      for (const v of list) { const w = winterStatus(v.kind, winterMarks(byV.get(v.id) || [])); winterBy.set(v.id, { status: w.status, missing: w.missing, noncompliant: w.noncompliant }); }
    }
    return json({ schema_version: '1.0', environment: envParam(url), ...(sel.site ? { site: sel.site } : {}), generated_at: nowIso(),
      note: 'einsatzbereit_lt_system = keine offene Meldung im System; ersetzt keine Abfahrtskontrolle.',
      vehicles: list.map((v) => ({ id: v.id, plate: v.plate, kind: v.kind, site: v.site, availability: v.availability, eval_excluded: !!v.eval_excluded, locked: !!v.locked, open_cases: v.open_cases, in_workshop: v.in_workshop > 0, last_km: v.last_km, next_inspection_due: v.next_due, next_due_km: v.next_due_km ?? null, next_due_km_kind: v.next_due_km_kind ?? null, km_remaining: v.km_remaining ?? null, km_unclear: v.km_unclear || null, open_recalls: v.open_recalls ?? 0, last_departure_check_at: v.last_check_at, last_departure_check_result: v.last_check_result, planned_workshop_date: v.planned_workshop_date, planned_inspection_date: v.planned_inspection_date, planned_inspection_kind: v.planned_inspection_kind || null, parts_expected_date: v.parts_expected_date || null, failed_inspection: v.failed_inspection, coupled: v.coupled, ...(notesBy ? { notes: notesBy.get(v.id) || [] } : {}), ...(warrBy ? { warranties: warrBy.get(v.id) || [] } : {}), ...(winterBy ? { winter: winterBy.get(v.id) } : {}) })) /* additiv: Prüfung nicht bestanden, ohne Vorgang seitdem; gekoppeltes Fahrzeug {id, plate, kind, availability} – Information */ });
  }
  if (p === '/v1/findings' && m === 'GET') {
    const [rows, names] = await Promise.all([env.DB.prepare(`SELECT * FROM agent_findings WHERE environment=? AND status='offen'`).bind(envParam(url)).all().then((r) => r.results), personNames(env, envParam(url))]);
    return json({ schema_version: '1.0', findings: rows.map((f) => redactFinding(f, names)) });
  }
  // Kennzahlen Instandhaltung (nur Anzahlen/Dauern, keine Personen) – gleiche Berechnung wie in der App
  if (p === '/v1/kpi' && m === 'GET') return json({ schema_version: '1.0', ...(await kpiReport(env, { role: 'owner' }, envParam(url), Object.fromEntries(url.searchParams))) });
  if (p === '/v1/costs' && m === 'GET') return json({ schema_version: '1.0', ...(await costReport(env, null, envParam(url), Object.fromEntries(url.searchParams))) });
  // Prüftermine (ohne Auftragsdaten) + additiv: Prüfmängel ohne Auftrag und ausstehende Nachprüfungen der gewählten Umgebung (ohne Personennamen)
  if (p === '/v1/maintenance' && m === 'GET') {
    const ov = await maintenanceOverview(env, null, null, { site: url.searchParams.get('site') });
    // mit Standortfilter: nur Fahrzeuge des Standorts (jedes aktive Fahrzeug steht in rows oder – ohne Pflichttermin – in gaps);
    // Filter vor der Begrenzung auf 200 (vorher danach – Standort mit älteren Fällen leer, 18.10.2026); `lists_truncated` nennt gekappte Listen
    const inSite = ov.site ? new Set([...ov.rows, ...ov.gaps].map((x) => x.vehicle_id)) : null;
    const lists = await maintenanceEventLists(env, envParam(url), inSite);
    return json({ schema_version: '1.0', ...ov, environment: envParam(url), defects_without_case: lists.defects_without_case, reinspection_pending: lists.reinspection_pending,
      lists_truncated: lists.truncated.filter((n) => n !== 'result_missing') });
  }
  if (p === '/v1/maintenance/history' && m === 'GET') { const h = await maintenanceHistory(env, { role: 'owner' }, Object.fromEntries(url.searchParams), envParam(url)); return json({ schema_version: '1.0', from: h.from, to: h.to, kind: h.kind, environment: envParam(url), truncated: h.truncated, events: h.rows.map(({ recorded_by_name, result_addable, ...r }) => r) }); }
  // Datenqualität: Anzahlen je Prüfung/Schweregrad + fahrzeugbezogene Befunde – ohne Personennamen (Fahrer-, Konto- und Einladungsbefunde nur als Anzahl)
  if (p === '/v1/data-quality' && m === 'GET') {
    const q = await dataQuality(env, { role: 'owner' }, envParam(url), Object.fromEntries(url.searchParams));
    const by_severity = { fehler: 0, luecke: 0, hinweis: 0 };
    for (const i of q.items) by_severity[i.severity]++;
    const NAMED = new Set(['assignment_inactive_user']);
    const items = q.items.filter((i) => i.vehicle_id).map((i) => ({ check: i.check, severity: i.severity, vehicle_id: i.vehicle_id, plate: i.plate,
      event_id: i.event_id || null, case_id: i.case_id || null, detail: NAMED.has(i.check) ? null : i.detail }));
    // site/site_options/other_hidden wie in der App (22.10.2026: fehlten – ein Tippfehler im Standort lieferte still eine leere Liste)
    return json({ schema_version: '1.0', generated_at: q.generated_at, environment: q.environment, stale_days: q.stale_days, vehicles_checked: q.vehicles_checked,
      site: q.site ?? null, site_options: q.site_options || [], other_hidden: q.other_hidden ?? 0, checks: CHECKS, counts: q.counts, by_severity, check_max: q.check_max, truncated_checks: q.truncated_checks, items });
  }
  if (p === '/v1/master' && m === 'GET') {
    const [mp, names] = await Promise.all([masterPanel(env, envParam(url)), personNames(env, envParam(url))]);
    // Auslöser eines manuellen Agentenlaufs („manuell:<Benutzername>“) ohne Person – Datensparsamkeit (16.10.2026: Benutzername kam durch)
    const run = mp.last_agent_run ? { ...mp.last_agent_run, trigger: String(mp.last_agent_run.trigger || '').startsWith('manuell:') ? 'manuell' : mp.last_agent_run.trigger } : mp.last_agent_run;
    // Fälle ohne freie Schadensbeschreibung (wie /v1/cases: Freitext kann Namen/Gesundheitsangaben enthalten – Datensparsamkeit, 17.10.2026)
    return json({ schema_version: '1.0', ...mp, cases: mp.cases.map(({ description, ...c }) => c), last_agent_run: run, findings: mp.findings.map((f) => redactFinding(f, names)), inbox: mp.inbox.map(({ decided_by_name, ...x }) => redactInbox(x, names)) }); // ohne Namen der Entscheidenden (19.10.2026)
  }

  // Telematik-Zustand für die Überwachung der Einspeisung (z. B. n8n): nur Zähler und Zeitpunkte je Anbieter –
  // keine Positionen, keine Geräte-IDs, keine Kennzeichen (Datensparsamkeit). Reine Information, kein Grenzwert.
  if (p === '/v1/telematics/status' && m === 'GET') {
    envParam(url);
    const ov = await telematicsOverview(env, { role: 'owner' });
    const cnt = (list, prov) => list.filter((x) => x.provider === prov).length;
    return json({ schema_version: '1.0', generated_at: nowIso(),
      providers: ov.by_provider.map((r) => ({ ...r, unmatched: ov.unmatched_by_provider[r.provider] || 0, mappings: cnt(ov.mappings, r.provider),
        plate_mismatches: cnt(ov.plate_mismatches, r.provider), km_rejected: cnt(ov.km_rejected, r.provider) })),
      // Zählung wie bisher nur Kraftfahrzeuge; Anhänger mit eigenem Gerät additiv
      vehicles_total: ov.positions.filter((x) => x.kind !== 'anhaenger').length, vehicles_without_data: ov.positions.filter((x) => x.kind !== 'anhaenger' && !x.gps_time).length,
      trailers_with_data: ov.positions.filter((x) => x.kind === 'anhaenger').length,
      unmatched_truncated: ov.unmatched_truncated });
  }

  // Telematik-Einspeisung: nur FIN oder bestätigtes Mapping führt zur Zuordnung
  if (p === '/v1/telematics' && m === 'POST') {
    envParam(url);
    const body = await readJson(request, 2 * 1024 * 1024);
    const items = Array.isArray(body.items) ? body.items : null;
    if (!items) throw bad('validation', 'items[] erforderlich.');
    if (items.length > 500) throw bad('validation', 'Max. 500 Einträge je Aufruf.');
    const provider = String(body.provider || '').toLowerCase();
    if (!['webfleet', 'yellowfox'].includes(provider)) throw bad('validation', 'provider muss webfleet oder yellowfox sein.');
    const now = nowIso();
    const res = { matched: 0, unmatched: 0, rejected: 0, position_outdated: 0, odometer_written: 0, odometer_rejected: 0 };
    // Abfragebudget: Zuordnungen, Fahrzeuge und letzte Stände gesammelt laden, Schreibzugriffe gesammelt ausführen
    // (vorher bis zu 4 Abfragen je Eintrag – bei 500 Einträgen weit über der Grenze je Aufruf).
    // Einträge, die kein Objekt sind (null, Zahl, Text, Liste), werden wie leere Einträge abgewiesen statt die ganze Lieferung mit „Interner Fehler“ zu beenden
    // Zahlenwerte: null, "", Wahrheitswerte und Unsinn gelten als „nicht geliefert“ (Number(null) = 0 schrieb vorher 0 km bzw. Breite 0
    // in Akte und Position, 17.10.2026); km nur im Bereich der App-Erfassung (0–5 000 000), sonst blockierte ein Ausreißer alle späteren Stände
    // Text nur als einfache Dezimalzahl mit Punkt (18.10.2026: „0x1D4C0“ wurde als 120 000 km, „0x33“ als Breite 51 übernommen)
    const numOf = (x) => (typeof x === 'number' ? (Number.isFinite(x) ? x : null) : typeof x === 'string' && /^-?\d+(\.\d+)?$/.test(x.trim()) ? Number(x.trim()) : null);
    // km als Text mit Tausenderpunkt („120.500“) ist mehrdeutig (120,5 oder 120 500) – nicht übernommen wie in der App (18.10.2026: Akte 121 km)
    const kmOf = (x) => (typeof x === 'string' && /^\d{1,3}(\.\d{3})+$/.test(x.trim()) ? null : numOf(x));
    const rows = items.map((x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {})).map((it) => {
      // Kennungen nur als Text/Zahl (18.10.2026: Objekte wurden als „[object Object]“ gespeichert), Geräte-ID gekürzt wie bei der Bestätigung
      // Zahlen nur als sichere Ganzzahl (20.10.2026: 9007199254740993 wurde beim JSON-Lesen zu …992 und traf ein fremdes Gerät) – größere IDs als Text senden
      const txt = (x) => (typeof x === 'string' ? x.trim() : typeof x === 'number' && Number.isSafeInteger(x) ? String(x) : x === undefined || x === null ? '' : null);
      const e0 = txt(it.external_id); const v0 = txt(it.vin); const p0 = txt(it.plate);
      if (e0 === null || v0 === null || p0 === null) return { it, ext: '', vin: null, plate: null };
      // Geräte-ID länger als 80 Zeichen: abgewiesen statt still gekürzt (zwei lange IDs mit gleichem Anfang galten sonst als ein Gerät, 20.10.2026)
      if (e0.length > 80) return { it, ext: '', vin: null, plate: null };
      // FIN länger als 40 Zeichen (bereinigt): abgewiesen statt in beliebiger Länge gespeichert (Prüffall-Liste wuchs unbegrenzt, 20.10.2026)
      const vn = v0 ? normalizeVin(v0) : null;
      if (vn && vn.length > 40) return { it, ext: '', vin: null, plate: null };
      return { it, ext: e0, vin: vn, plate: p0 ? p0.toUpperCase().slice(0, 20) : null };
    });
    const J = (a) => JSON.stringify([...new Set(a.filter(Boolean))]);
    const [maps, byVin, plates, latest] = await Promise.all([
      env.DB.prepare('SELECT external_id, vehicle_id FROM telematics_mappings WHERE provider=? AND external_id IN (SELECT value FROM json_each(?))').bind(provider, J(rows.map((r) => r.ext))).all(),
      env.DB.prepare('SELECT id, vin FROM vehicles WHERE vin IN (SELECT value FROM json_each(?))').bind(J(rows.map((r) => r.vin))).all(),
      // Kennzeichen-Kandidat: Vergleich in JS (UPPER in SQL nur A–Z; „SZ YC 5517“ = „SZ-YC5517“, Umlaut-Kennzeichen wie „TÜ-…“)
      rows.some((r) => r.plate) ? env.DB.prepare('SELECT id, plate, active, eval_excluded FROM vehicles').all() : { results: [] },
      env.DB.prepare('SELECT vehicle_id, gps_time FROM telematics_latest WHERE provider=?').bind(provider).all(),
    ]);
    const mapOf = new Map(maps.results.map((r) => [r.external_id, r.vehicle_id]));
    const vinOf = new Map(byVin.results.map((r) => [r.vin, r.id]));
    // Nur ein eindeutiger Kandidat wird vorgeschlagen (Bestätigung bleibt Pflicht): gemeinsame Regel `pickVehicleByPlate`
    const plateCandidate = (p) => { const r = p ? pickVehicleByPlate(plates.results, p) : null; return r && r.vehicle ? r.vehicle.id : null; };
    const lastGps = new Map(latest.results.map((r) => [r.vehicle_id, r.gps_time]));
    // Gesammelte Schreibzugriffe: je Tabelle EINE Anweisung über json_each (jede Anweisung zählt zum Abfragebudget)
    const unmatched = new Map(); const matchedExt = new Set(); const latestRows = new Map(); const odo = new Map();
    // Alle km-Einträge je Fahrzeug und Tag gehen an die Datenbank; dort zählt je Tag der jüngste plausible Eintrag, der nicht kleiner ist als
    // ein früherer plausibler desselben Tages (Backlog 108, 21.10.2026 – vorher nur der jüngste: war er unplausibel, entstand kein Tageswert).
    // Mehrere Tage eines Fahrzeugs prüft die Datenbank in Runden (n-ter Tag = Runde n, siehe unten) – jede Runde sieht die geschriebenen Werte
    // der vorigen (Backlog 103, 20.10.2026)
    const kmMaxInCall = new Map(); let kmRejectedInCall = 0;
    // Nachlieferung mehrerer Tage in beliebiger Reihenfolge (19.10.2026: neueste zuerst → ältere Tage samt km-Stand verworfen):
    // Einträge nach GPS-Zeit aufsteigend verarbeiten (stabil; ohne lesbare Zeit am Ende, wie bisher nach einem Stand mit Zeit abgewiesen)
    const gpsKey = (it) => { const g = typeof it.gps_time === 'string' ? Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(it.gps_time) ? it.gps_time : it.gps_time + 'Z') : NaN; return Number.isFinite(g) ? g : Infinity; };
    const ordered = rows.map((r, i) => ({ r, i, k: gpsKey(r.it) })).sort((a, b) => (a.k === b.k ? a.i - b.i : a.k < b.k ? -1 : 1)).map((x) => x.r);
    for (const { it, ext, vin, plate } of ordered) {
      if (!ext) { res.rejected++; continue; }
      let vehicleId = null; let basis = null;
      if (mapOf.has(ext)) { vehicleId = mapOf.get(ext); basis = 'confirmed_mapping'; }
      else if (vin && vinOf.has(vin)) { vehicleId = vinOf.get(vin); basis = 'vin'; }
      // GPS-Zeit ohne Zeitzone wird ausdrücklich als UTC gelesen (vorher abhängig von der Laufzeitumgebung) – Quellen senden mit „Z“/Versatz
      const gt = typeof it.gps_time === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(it.gps_time) ? it.gps_time + 'Z' : it.gps_time;
      // nur ISO-Datum mit Uhrzeit ab 2000 (18.10.2026: „1“ wurde als 2001-01-01 gelesen und als km-Stand gespeichert, Epochenzahlen still verworfen)
      const gtOk = typeof gt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i.test(gt) && gt >= '2000' && !Number.isNaN(Date.parse(gt)) && validStamp(gt);
      const gps = gtOk ? new Date(gt).toISOString() : null;
      const lat = numOf(it.lat) !== null && Math.abs(numOf(it.lat)) <= 90 ? numOf(it.lat) : null;
      const lon = numOf(it.lon) !== null && Math.abs(numOf(it.lon)) <= 180 ? numOf(it.lon) : null;
      const validPos = lat !== null && lon !== null && !(lat === 0 && lon === 0);
      if (!vehicleId) {
        unmatched.set(ext, { ext, plate, vin, cand: plateCandidate(plate) });
        res.unmatched++;
        continue;
      }
      // Gerät ist über FIN/bestätigte Zuordnung erkannt: Prüffall erledigt, auch wenn dieser Stand gleich wegen der Zeit abgewiesen wird
      // (vorher blieb der Prüffall stehen und bot weiter „Zuordnung bestätigen“ an, 20.10.2026)
      matchedExt.add(ext);
      const gpsGiven = it.gps_time !== undefined && it.gps_time !== null && it.gps_time !== '';
      if (gpsGiven && !gps) { res.rejected++; continue; } // ungültige GPS-Zeit: nicht ohne Zeit speichern
      // Keine Rückschritte: ältere GPS-Zeit überschreibt keinen neueren Stand (auch innerhalb desselben Aufrufs)
      // GPS-Zeit mehr als 10 Minuten in der Zukunft (Geräteuhr falsch): verwerfen, sonst blockiert sie spätere echte Stände
      if (gps && Date.parse(gps) > Date.now() + 600000) { res.rejected++; continue; }
      const prev = lastGps.get(vehicleId);
      // älter als der vorhandene Stand: Position/letzter Stand bleiben, der Tages-km-Stand wird trotzdem geprüft und übernommen
      // (Nachlieferung nach Funkloch; Plausibilität gegen frühere/spätere Stände wie unten in SQL)
      const outdated = !!(prev && gps && gps < prev);
      const km = kmOf(it.km) !== null && kmOf(it.km) >= 0 && kmOf(it.km) <= 5000000 ? kmOf(it.km) : null;
      if (outdated) {
        if (km === null) { res.rejected++; continue; }
        res.position_outdated++;
      }
      // ohne gültige GPS-Zeit keinen vorhandenen Stand überschreiben (vorher: Position/km gelöscht, Fahrzeug „ohne Daten“, 17.10.2026)
      // gilt auch, wenn der vorhandene Stand selbst keine GPS-Zeit hat (18.10.2026: zweiter zeitloser Stand überschrieb den ersten, auch im selben Aufruf)
      if (!gps && lastGps.has(vehicleId)) { res.rejected++; continue; }
      if (!outdated) {
      lastGps.set(vehicleId, gps || prev || null);
      latestRows.set(vehicleId, { v: vehicleId, ext, basis, sp: plate, gps, lat: validPos ? lat : null, lon: validPos ? lon : null, km,
        speed: numOf(it.speed) !== null && numOf(it.speed) >= 0 && numOf(it.speed) <= 300 ? numOf(it.speed) : null /* > 300 km/h unplausibel (19.10.2026: 1e300 gespeichert) */, ign: ignOf(it.ignition) });
      }
      if (km !== null && gps) {
        // je Fahrzeug und Tag höchstens ein Telematik-km-Stand (der jüngste) – sonst entstünden bei 5-Minuten-Takt Tausende Zeilen/Tag
        // Tag = Berliner Kalendertag (Fahrt 00:30 Uhr gehört zum neuen Tag, nicht zum UTC-Vortag)
        const day = berlinDate(gps); const key = `${vehicleId}|${day}`;
        if (!odo.has(key)) odo.set(key, { id: `tel:${provider}:${vehicleId}:${day}`, v: vehicleId, day, list: [] });
        odo.get(key).list.push({ id: `tel:${provider}:${vehicleId}:${day}`, v: vehicleId, km: Math.round(km), t: gps });
      }
      res.matched++;
    }
    const X = (k) => `json_extract(value,'$.${k}')`;
    const stmts = [];
    if (unmatched.size) stmts.push(env.DB.prepare(`INSERT INTO telematics_unmatched(provider,external_id,source_plate,source_vin,candidate_vehicle_id,last_seen)
      SELECT ?1, ${X('ext')}, ${X('plate')}, ${X('vin')}, ${X('cand')}, ?2 FROM json_each(?3) WHERE 1
      ON CONFLICT(provider,external_id) DO UPDATE SET source_plate=excluded.source_plate, source_vin=excluded.source_vin, candidate_vehicle_id=excluded.candidate_vehicle_id, last_seen=excluded.last_seen`)
      .bind(provider, now, JSON.stringify([...unmatched.values()])));
    // zugeordnet (FIN/Mapping): früheren Prüffall derselben Geräte-ID bereinigen – wie beim Bestätigen in der App (vorher blieb er stehen)
    if (matchedExt.size) stmts.push(env.DB.prepare('DELETE FROM telematics_unmatched WHERE provider=? AND external_id IN (SELECT value FROM json_each(?))').bind(provider, JSON.stringify([...matchedExt])));
    // gleichzeitige Lieferungen: älterer Stand überschreibt nie den neueren (Prüfung oben las den Stand vor dem Stapel, 17.10.2026)
    const latePos = stmts.length;
    if (latestRows.size) stmts.push(env.DB.prepare(`SELECT COUNT(*) AS n FROM json_each(?2) j JOIN telematics_latest t ON t.vehicle_id=json_extract(j.value,'$.v') AND t.provider=?1
      WHERE t.gps_time IS NOT NULL AND (json_extract(j.value,'$.gps') IS NULL OR json_extract(j.value,'$.gps') < t.gps_time)`).bind(provider, JSON.stringify([...latestRows.values()])));
    if (latestRows.size) stmts.push(env.DB.prepare(`INSERT INTO telematics_latest(vehicle_id,provider,external_id,match_basis,source_plate,gps_time,received_at,lat,lon,km,speed,ignition,km_at)
      SELECT ${X('v')}, ?1, ${X('ext')}, ${X('basis')}, ${X('sp')}, ${X('gps')}, ?2, ${X('lat')}, ${X('lon')}, ${X('km')}, ${X('speed')}, ${X('ign')}, CASE WHEN ${X('km')} IS NOT NULL THEN ${X('gps')} END FROM json_each(?3) WHERE 1
      ON CONFLICT(vehicle_id,provider) DO UPDATE SET external_id=excluded.external_id, match_basis=excluded.match_basis, source_plate=excluded.source_plate, gps_time=excluded.gps_time, received_at=excluded.received_at,
        lat=excluded.lat, lon=excluded.lon, km=COALESCE(excluded.km, telematics_latest.km), km_at=CASE WHEN excluded.km IS NOT NULL THEN excluded.gps_time ELSE telematics_latest.km_at END /* Vergleichszeitpunkt des km-Werts (21.10.2026) */, speed=excluded.speed, ignition=excluded.ignition /* Meldung ohne km: letzter km-Wert bleibt – sonst verschwand der Hinweis „km abgewiesen“ ohne plausiblen Stand (20.10.2026) */
      WHERE excluded.gps_time IS NOT NULL AND (telematics_latest.gps_time IS NULL OR excluded.gps_time >= telematics_latest.gps_time)`)
      .bind(provider, now, JSON.stringify([...latestRows.values()])));
    // Kandidaten je Runde (CTE): c = alle Einträge, p = plausibel (nicht kleiner als der zuvor erfasste km-Stand, nicht größer als ein späterer
    // unbegründeter – gleiche Regel wie die Erfassung in der App, 17.10.2026 –, vorhandener Tageswert: nicht kleiner bei jüngerer Zeit, nicht
    // größer bei älterer), ok = plausibel und nicht kleiner als ein früherer plausibler Eintrag desselben Tages, best = je Tag der jüngste aus ok.
    // Zähler odometer_rejected = Einträge außerhalb von ok (gleiche Transaktion, vor dem Schreiben); odometer_written = geschriebene Tageswerte.
    const CAND = `c AS (SELECT ${X('id')} AS id, ${X('v')} AS v, ${X('km')} AS km, ${X('t')} AS t FROM json_each(?1)),
      p AS MATERIALIZED (SELECT * FROM c WHERE c.km >= COALESCE((SELECT o.km FROM odometer_readings o WHERE o.vehicle_id=c.v AND o.measured_at <= c.t AND o.id <> c.id ORDER BY o.measured_at DESC LIMIT 1), 0)
        AND NOT COALESCE((SELECT o.km < c.km AND (o.note IS NULL OR trim(o.note) = '') FROM odometer_readings o WHERE o.vehicle_id=c.v AND o.measured_at > c.t AND o.id <> c.id ORDER BY o.measured_at ASC LIMIT 1), 0)
        AND NOT EXISTS (SELECT 1 FROM odometer_readings d WHERE d.id=c.id AND d.measured_at < c.t AND d.km > c.km)
        AND NOT EXISTS (SELECT 1 FROM odometer_readings d WHERE d.id=c.id AND d.measured_at > c.t AND d.km < c.km AND (d.note IS NULL OR trim(d.note)=''))),
      ok AS MATERIALIZED (SELECT * FROM p WHERE NOT EXISTS (SELECT 1 FROM p e WHERE e.id=p.id AND e.t < p.t AND e.km > p.km)),
      best AS (SELECT * FROM ok WHERE NOT EXISTS (SELECT 1 FROM ok l WHERE l.id=ok.id AND (l.t > ok.t OR (l.t = ok.t AND l.km > ok.km))))`;
    // Runden: je Fahrzeug der n-te Tag (zeitlich) in Runde n, höchstens ODO_ROUNDS (Backlog 108: 12 statt 4); weitere Tage in der letzten Runde
    // mit Prüfung im Speicher (Einträge nie kleiner als der höchste Eintrag früherer Tage dieser Runde). Je Runde eine Zähl- und eine Einfügeanweisung.
    const ODO_ROUNDS = 12; const rounds = []; const perV = new Map();
    for (const o of [...odo.values()].sort((x, y) => (x.day < y.day ? -1 : x.day > y.day ? 1 : 0))) {
      const n = perV.get(o.v) || 0; perV.set(o.v, n + 1); const k = Math.min(n, ODO_ROUNDS - 1);
      let list = o.list;
      if (n >= ODO_ROUNDS - 1) {
        const mk = 'last|' + o.v; const mx = kmMaxInCall.get(mk);
        if (mx !== undefined) { const keep = list.filter((x) => x.km >= mx); kmRejectedInCall += list.length - keep.length; list = keep; }
        if (list.length) kmMaxInCall.set(mk, Math.max(mx ?? 0, ...list.map((x) => x.km)));
      }
      if (list.length) (rounds[k] ||= []).push(...list);
    }
    const roundPos = [];
    for (const r of rounds.filter(Boolean)) {
      const rejPos = stmts.length;
      stmts.push(env.DB.prepare(`WITH ${CAND} SELECT (SELECT COUNT(*) FROM c) - (SELECT COUNT(*) FROM ok) AS n`).bind(JSON.stringify(r)));
      const odoPos = stmts.length;
      // Der Tageswert wird nur durch einen jüngeren, nicht kleineren Wert ersetzt
      stmts.push(env.DB.prepare(`INSERT INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at)
      WITH ${CAND} SELECT id, v, km, t, ?2, NULL, ?3 FROM best WHERE 1
      ON CONFLICT(id) DO UPDATE SET km=excluded.km, measured_at=excluded.measured_at, created_at=excluded.created_at
        WHERE excluded.measured_at > odometer_readings.measured_at AND excluded.km >= odometer_readings.km
      ON CONFLICT DO NOTHING`).bind(JSON.stringify(r), `telematik:${provider}`, now));
      roundPos.push([rejPos, odoPos]);
    }
    if (stmts.length) {
      const out = await env.DB.batch(stmts);
      if (latestRows.size) { const late = (out[latePos] && out[latePos].results && out[latePos].results[0] && out[latePos].results[0].n) || 0; res.rejected += late; res.matched -= late; }
      for (const [rejPos, odoPos] of roundPos) {
        res.odometer_written = (res.odometer_written || 0) + ((out[odoPos] && out[odoPos].meta && out[odoPos].meta.changes) || 0);
        res.odometer_rejected = (res.odometer_rejected || 0) + ((out[rejPos] && out[rejPos].results && out[rejPos].results[0] && out[rejPos].results[0].n) || 0);
      }
    }
    res.odometer_rejected = (res.odometer_rejected || 0) + kmRejectedInCall;
    return json({ ok: true, ...res });
  }
  throw new HttpError(404, 'not_found', 'Unbekannter Integrationspfad.');
}
