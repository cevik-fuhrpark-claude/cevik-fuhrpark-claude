// [CLAUDE] Integrations-API für das Unternehmensbetriebssystem und n8n (Bearer-Token aus Cloudflare-Secret)
import { json, readJson, HttpError, nowIso, normalizeVin, timingSafeEqual, bad, berlinDate, sha256Hex, normPlate } from './util.js';
import { audit } from './auth.js';
import { masterPanel } from './agent.js';
import { costReport, kpiReport, siteSelection } from './reports.js';
import { maintenanceOverview, maintenanceHistory, defectsWithoutCaseQuery, reinspectionPendingQuery } from './maintenance.js';
import { listVehicles } from './vehicles.js';
import { winterMarks, winterStatus } from './tires.js';
import { dataQuality, CHECKS } from './quality.js';

// Tokens: INTEGRATION_TOKEN (lesen + Telematik schreiben), optional INTEGRATION_TOKEN_NEXT (gleiche Rechte, für Wechsel ohne Ausfall)
// und INTEGRATION_TOKEN_READ (nur lesen, z. B. für Auswertungen). Ergebnis: 'write' oder 'read'.
// Falsche Tokens je Netzadresse begrenzen (wie Login): ab TOKEN_FAIL_LIMIT.max Fehlversuchen im Fenster wird diese Adresse
// für den Rest des Fensters abgewiesen – auch mit gültigem Token, damit Durchprobieren nichts verrät. Einmal im Protokoll vermerkt.
export const TOKEN_FAIL_LIMIT = { max: 30, windowSec: 900 };
async function checkToken(request, env) {
  const full = [env.INTEGRATION_TOKEN, env.INTEGRATION_TOKEN_NEXT].filter(Boolean);
  const read = [env.INTEGRATION_TOKEN_READ].filter(Boolean);
  if (!full.length && !read.length) throw new HttpError(503, 'integration_disabled', 'Integrations-API ist nicht aktiviert (Secret INTEGRATION_TOKEN fehlt).');
  const ip = request.headers.get('cf-connecting-ip') || 'unbekannt';
  const key = 'intfail:' + (await sha256Hex('cfp-ip:' + ip)).slice(0, 24);
  const win = Math.floor(Date.now() / 1000 / TOKEN_FAIL_LIMIT.windowSec) * TOKEN_FAIL_LIMIT.windowSec;
  const row = await env.DB.prepare('SELECT count FROM rate_limits WHERE key = ? AND window_start = ?').bind(key, win).first();
  if (row && row.count >= TOKEN_FAIL_LIMIT.max) throw new HttpError(429, 'rate_limited', 'Zu viele ungültige Token-Versuche von dieser Adresse. Bitte in 15 Minuten erneut versuchen.');
  const h = request.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
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
const PERSON_FINDINGS = ['DRIVER_DOC_EXPIRED', 'DRIVER_DOC_EXPIRES_SOON', 'LICENSE_CHECK_DUE', 'LICENSE_CHECK_FAILED', 'TACHO_CARD_OVERDUE', 'TACHO_CARD_DUE'];
const REDACTED = 'Fahrer/in (Name nur in der App)';
async function personNames(env, environment) {
  const rows = (await env.DB.prepare(`SELECT f.id, d.display_name AS name FROM agent_findings f JOIN drivers d ON d.id = substr(f.subject_key, 1, instr(f.subject_key || '|', '|') - 1)
    WHERE f.environment=? AND f.finding_code IN (SELECT value FROM json_each(?))`).bind(environment, JSON.stringify(PERSON_FINDINGS)).all()).results;
  return new Map(rows.map((r) => [r.id, r.name]));
}
function redactText(text, name) {
  if (text == null) return text;
  let t = String(text);
  if (name) t = t.split(`Fahrer ${name}`).join(REDACTED).split(name).join(REDACTED);
  return t;
}
function redactFinding(f, names) {
  if (!PERSON_FINDINGS.includes(f.finding_code)) return f;
  return { ...f, message: redactText(f.message, names.get(f.id)), next_action: redactText(f.next_action, names.get(f.id)), person_redacted: true };
}
function redactInbox(m, names) {
  const code = m.payload && m.payload.finding_code;
  if (!PERSON_FINDINGS.includes(code)) return m;
  const n = names.get(m.finding_id);
  return { ...m, decision_note: redactText(m.decision_note, n), payload: { ...m.payload, message: redactText(m.payload.message, n), next_action: redactText(m.payload.next_action, n) }, person_redacted: true };
}

const envParam = (url) => (url.searchParams.get('environment') === 'test' ? 'test' : 'production');

export async function integrationRouter(request, env, ctx, url) {
  const scope = await checkToken(request, env);
  const p = url.pathname.replace('/api/integration', '');
  const m = request.method;
  if (m !== 'GET' && scope !== 'write') throw new HttpError(403, 'read_only_token', 'Dieses Token darf nur lesen.');
  if (p === '/v1/vehicles' && m === 'GET') {
    const rows = (await env.DB.prepare(`SELECT v.id, v.vin, v.plate, v.kind, v.site, v.manufacturer, v.model, v.build_year, v.trailer_plate, v.trailer_vin, v.master_status, v.updated_at
      FROM vehicles v WHERE v.active=1 ORDER BY v.plate`).all()).results;
    const sel = siteSelection(rows, url.searchParams.get('site'));
    return json({ schema_version: '1.0', ...(sel.site ? { site: sel.site } : {}), vehicles: sel.site ? rows.filter((v) => sel.match(v.site)) : rows });
  }
  if (p === '/v1/cases' && m === 'GET') {
    const pageSize = Math.min(Math.max(Math.round(Number(url.searchParams.get('limit')) || 1000), 1), 1000);
    const since = url.searchParams.get('since') || '1970-01-01T00:00:00.000Z';
    const rows = (await env.DB.prepare(`SELECT c.id, c.case_no, c.environment, c.vehicle_id, c.status, c.priority, c.reported_priority, c.reported_driveability, c.safety_lock,
      c.workshop_site, c.origin, c.parent_case_id, c.fleet_received_at, c.workshop_ack_at, c.created_at, c.updated_at, c.closed_at, c.version,
      c.planned_date, c.parts_expected_date, c.maintenance_rule_id, c.maintenance_event_id, CASE WHEN c.cost_over_limit_at IS NOT NULL THEN 1 ELSE 0 END AS cost_approval_pending
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
      vehicles: list.map((v) => ({ id: v.id, plate: v.plate, kind: v.kind, site: v.site, availability: v.availability, locked: !!v.locked, open_cases: v.open_cases, in_workshop: v.in_workshop > 0, last_km: v.last_km, next_inspection_due: v.next_due, next_due_km: v.next_due_km ?? null, next_due_km_kind: v.next_due_km_kind ?? null, km_remaining: v.km_remaining ?? null, open_recalls: v.open_recalls ?? 0, last_departure_check_at: v.last_check_at, last_departure_check_result: v.last_check_result, planned_workshop_date: v.planned_workshop_date, planned_inspection_date: v.planned_inspection_date, planned_inspection_kind: v.planned_inspection_kind || null, parts_expected_date: v.parts_expected_date || null, failed_inspection: v.failed_inspection, coupled: v.coupled, ...(notesBy ? { notes: notesBy.get(v.id) || [] } : {}), ...(warrBy ? { warranties: warrBy.get(v.id) || [] } : {}), ...(winterBy ? { winter: winterBy.get(v.id) } : {}) })) /* additiv: Prüfung nicht bestanden, ohne Vorgang seitdem; gekoppeltes Fahrzeug {id, plate, kind, availability} – Information */ });
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
    const [defects, reinspection] = await env.DB.batch([defectsWithoutCaseQuery(env, envParam(url)), reinspectionPendingQuery(env, envParam(url))]);
    const ov = await maintenanceOverview(env, null, null, { site: url.searchParams.get('site') });
    // mit Standortfilter: nur Fahrzeuge des Standorts (jedes aktive Fahrzeug steht in rows oder – ohne Pflichttermin – in gaps)
    const inSite = ov.site ? new Set([...ov.rows, ...ov.gaps].map((x) => x.vehicle_id)) : null;
    const keep = (list) => (inSite ? list.filter((x) => inSite.has(x.vehicle_id)) : list);
    return json({ schema_version: '1.0', ...ov, environment: envParam(url), defects_without_case: keep(defects.results), reinspection_pending: keep(reinspection.results) });
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
    return json({ schema_version: '1.0', generated_at: q.generated_at, environment: q.environment, stale_days: q.stale_days, vehicles_checked: q.vehicles_checked,
      checks: CHECKS, counts: q.counts, by_severity, items });
  }
  if (p === '/v1/master' && m === 'GET') {
    const [mp, names] = await Promise.all([masterPanel(env, envParam(url)), personNames(env, envParam(url))]);
    return json({ schema_version: '1.0', ...mp, findings: mp.findings.map((f) => redactFinding(f, names)), inbox: mp.inbox.map((x) => redactInbox(x, names)) });
  }

  // Telematik-Einspeisung: nur FIN oder bestätigtes Mapping führt zur Zuordnung
  if (p === '/v1/telematics' && m === 'POST') {
    const body = await readJson(request, 2 * 1024 * 1024);
    const items = Array.isArray(body.items) ? body.items : null;
    if (!items) throw bad('validation', 'items[] erforderlich.');
    if (items.length > 500) throw bad('validation', 'Max. 500 Einträge je Aufruf.');
    const provider = String(body.provider || '').toLowerCase();
    if (!['webfleet', 'yellowfox'].includes(provider)) throw bad('validation', 'provider muss webfleet oder yellowfox sein.');
    const now = nowIso();
    const res = { matched: 0, unmatched: 0, rejected: 0, odometer_written: 0 };
    // Abfragebudget: Zuordnungen, Fahrzeuge und letzte Stände gesammelt laden, Schreibzugriffe gesammelt ausführen
    // (vorher bis zu 4 Abfragen je Eintrag – bei 500 Einträgen weit über der Grenze je Aufruf).
    const rows = items.map((it) => {
      const ext = String(it.external_id || '').slice(0, 80);
      return { it, ext, vin: it.vin ? normalizeVin(it.vin) : null, plate: it.plate ? String(it.plate).trim().toUpperCase().slice(0, 20) : null };
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
    // Nur ein eindeutiger Kandidat wird vorgeschlagen (Bestätigung bleibt Pflicht): zuerst aktive, bewertete Fahrzeuge,
    // dann ruhende, dann außer Betrieb – mehrere Fahrzeuge mit gleichem Kennzeichen in derselben Stufe = kein Vorschlag.
    const tierOf = (v) => (v.active ? (v.eval_excluded ? 1 : 0) : 2);
    const plateIdx = new Map();
    for (const v of plates.results) {
      const k = normPlate(v.plate); if (!k) continue;
      const cur = plateIdx.get(k); const t = tierOf(v);
      if (!cur || t < cur.t) plateIdx.set(k, { t, id: v.id, n: 1 });
      else if (t === cur.t) cur.n++;
    }
    const plateCandidate = (p) => { const e = p && plateIdx.get(normPlate(p)); return e && e.n === 1 ? e.id : null; };
    const lastGps = new Map(latest.results.map((r) => [r.vehicle_id, r.gps_time]));
    // Gesammelte Schreibzugriffe: je Tabelle EINE Anweisung über json_each (jede Anweisung zählt zum Abfragebudget)
    const unmatched = new Map(); const latestRows = new Map(); const odo = new Map();
    for (const { it, ext, vin, plate } of rows) {
      if (!ext) { res.rejected++; continue; }
      let vehicleId = null; let basis = null;
      if (mapOf.has(ext)) { vehicleId = mapOf.get(ext); basis = 'confirmed_mapping'; }
      else if (vin && vinOf.has(vin)) { vehicleId = vinOf.get(vin); basis = 'vin'; }
      // GPS-Zeit ohne Zeitzone wird ausdrücklich als UTC gelesen (vorher abhängig von der Laufzeitumgebung) – Quellen senden mit „Z“/Versatz
      const gt = typeof it.gps_time === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(it.gps_time) ? it.gps_time + 'Z' : it.gps_time;
      const gps = gt && !Number.isNaN(Date.parse(gt)) ? new Date(gt).toISOString() : null;
      const lat = Number.isFinite(Number(it.lat)) && Math.abs(Number(it.lat)) <= 90 ? Number(it.lat) : null;
      const lon = Number.isFinite(Number(it.lon)) && Math.abs(Number(it.lon)) <= 180 ? Number(it.lon) : null;
      const validPos = lat !== null && lon !== null && !(lat === 0 && lon === 0);
      if (!vehicleId) {
        unmatched.set(ext, { ext, plate, vin, cand: plateCandidate(plate) });
        res.unmatched++;
        continue;
      }
      // Keine Rückschritte: ältere GPS-Zeit überschreibt keinen neueren Stand (auch innerhalb desselben Aufrufs)
      // GPS-Zeit mehr als 10 Minuten in der Zukunft (Geräteuhr falsch): verwerfen, sonst blockiert sie spätere echte Stände
      if (gps && Date.parse(gps) > Date.now() + 600000) { res.rejected++; continue; }
      const prev = lastGps.get(vehicleId);
      if (prev && gps && gps < prev) { res.rejected++; continue; }
      if (gps) lastGps.set(vehicleId, gps);
      const km = Number.isFinite(Number(it.km)) && Number(it.km) >= 0 ? Number(it.km) : null;
      latestRows.set(vehicleId, { v: vehicleId, ext, basis, gps, lat: validPos ? lat : null, lon: validPos ? lon : null, km,
        speed: Number.isFinite(Number(it.speed)) ? Number(it.speed) : null, ign: it.ignition === undefined || it.ignition === null ? null : (it.ignition ? 1 : 0) });
      if (km !== null && gps) {
        // je Fahrzeug und Tag höchstens ein Telematik-km-Stand (der jüngste) – sonst entstünden bei 5-Minuten-Takt Tausende Zeilen/Tag
        // Tag = Berliner Kalendertag (Fahrt 00:30 Uhr gehört zum neuen Tag, nicht zum UTC-Vortag)
        const day = berlinDate(gps); const key = `${vehicleId}|${day}`; const cur = odo.get(key);
        if (!cur || gps > cur.t) odo.set(key, { id: `tel:${provider}:${vehicleId}:${day}`, v: vehicleId, km: Math.round(km), t: gps });
      }
      res.matched++;
    }
    const X = (k) => `json_extract(value,'$.${k}')`;
    const stmts = [];
    if (unmatched.size) stmts.push(env.DB.prepare(`INSERT INTO telematics_unmatched(provider,external_id,source_plate,source_vin,candidate_vehicle_id,last_seen)
      SELECT ?1, ${X('ext')}, ${X('plate')}, ${X('vin')}, ${X('cand')}, ?2 FROM json_each(?3) WHERE 1
      ON CONFLICT(provider,external_id) DO UPDATE SET source_plate=excluded.source_plate, source_vin=excluded.source_vin, candidate_vehicle_id=excluded.candidate_vehicle_id, last_seen=excluded.last_seen`)
      .bind(provider, now, JSON.stringify([...unmatched.values()])));
    if (latestRows.size) stmts.push(env.DB.prepare(`INSERT INTO telematics_latest(vehicle_id,provider,external_id,match_basis,gps_time,received_at,lat,lon,km,speed,ignition)
      SELECT ${X('v')}, ?1, ${X('ext')}, ${X('basis')}, ${X('gps')}, ?2, ${X('lat')}, ${X('lon')}, ${X('km')}, ${X('speed')}, ${X('ign')} FROM json_each(?3) WHERE 1
      ON CONFLICT(vehicle_id,provider) DO UPDATE SET external_id=excluded.external_id, match_basis=excluded.match_basis, gps_time=excluded.gps_time, received_at=excluded.received_at,
        lat=excluded.lat, lon=excluded.lon, km=excluded.km, speed=excluded.speed, ignition=excluded.ignition`)
      .bind(provider, now, JSON.stringify([...latestRows.values()])));
    const odoPos = stmts.length;
    // Plausibilität: nie kleiner als der zuletzt erfasste km-Stand vor diesem Zeitpunkt (andere Quellen oder Vortage);
    // der Tageswert wird nur durch einen jüngeren, nicht kleineren Wert ersetzt
    if (odo.size) stmts.push(env.DB.prepare(`INSERT INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at)
      SELECT ${X('id')}, ${X('v')}, ${X('km')}, ${X('t')}, ?1, NULL, ?2 FROM json_each(?3)
      WHERE ${X('km')} >= COALESCE((SELECT o.km FROM odometer_readings o WHERE o.vehicle_id=${X('v')} AND o.measured_at <= ${X('t')} AND o.id <> ${X('id')} ORDER BY o.measured_at DESC LIMIT 1), 0)
      ON CONFLICT(id) DO UPDATE SET km=excluded.km, measured_at=excluded.measured_at, created_at=excluded.created_at
        WHERE excluded.measured_at > odometer_readings.measured_at AND excluded.km >= odometer_readings.km
      ON CONFLICT DO NOTHING`).bind(`telematik:${provider}`, now, JSON.stringify([...odo.values()])));
    if (stmts.length) {
      const out = await env.DB.batch(stmts);
      if (odo.size) res.odometer_written = (out[odoPos] && out[odoPos].meta && out[odoPos].meta.changes) || 0;
    }
    return json({ ok: true, ...res });
  }
  throw new HttpError(404, 'not_found', 'Unbekannter Integrationspfad.');
}
