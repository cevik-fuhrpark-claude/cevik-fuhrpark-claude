// [CLAUDE] Schadens- und Werkstattvorgänge: Statusmaschine als Befehle (keine freien Status-Updates)
import { claimForCase, day as pastDay } from './claims.js';
import { caseDescText, checkKeysFor } from '../public/check-labels.js';
import { nowIso, uuid, sha256Hex, berlinWindowStartIso, bad, forbidden, notFound, conflict, str, oneOf, flag, num, berlinDate, testMasterReadonly, isCalendarDate, hideDriverName, addMonths, berlinDayStartIso, berlinDaySql, likeEsc, caseVariants, intParam, PLATE_KEY_SQL, COUPLING_PREFERRED_SQL, rateOf, roundCents, quoteCell , commaDec, pointDec, kmNum, normPlate, cutText, cleanText, berlinLocalToIso, occurredCsv, RATE_PERIODS_SQL, ratePeriods, valueWork } from './util.js';
import { notifyCaseEvent, notifyCasesCreated } from './notify.js';
import { prepareCaseWithdrawal, onHand, deQty } from './stock.js';
import { canReadFineFile, fineVehiclesSql } from './fines.js';
import { siteSelection } from './reports.js';
import { winterMarks, winterStatus } from './tires.js';
import { huSpFor, HUSP_ONE_SQL, huSpInputFromRow } from './inspection_rules.js';
// Laufende Gewährleistungen: Kurzinfo im Vorgang höchstens 20, Fahrzeugakte höchstens 50 (früheste Abläufe zuerst; mehr → *_truncated)
export const WARR_CASE_MAX = 20;
export const WARR_VEH_MAX = 50;

export const PRIORITIES = ['niedrig', 'mittel', 'kritisch'];
export const DRIVEABILITY = ['unbekannt', 'fahrbereit', 'eingeschraenkt', 'nicht_fahrbereit'];
export const STATUSES = ['gemeldet', 'werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle', 'fahrzeug_freigegeben', 'abgelehnt'];
const OPEN_STATUSES = ['gemeldet', 'werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'];
const WORK_STATUSES = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'];
const MAX_FILES = 10;
export const VEHICLE_DOC_READ = ['owner', 'fleet', 'workshop', 'viewer', 'dispatch'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const isManager = (u) => u.role === 'owner' || u.role === 'fleet';
const canSeeCosts = (u) => isManager(u);

// ---------- Lesen & Zugriff ----------

export async function loadCase(env, user, envName, caseId) {
  const c = await env.DB.prepare('SELECT * FROM cases WHERE id=? AND environment=?').bind(caseId, envName).first();
  if (!c) throw notFound('Vorgang nicht gefunden.');
  const access = caseAccess(user, c);
  if (!access) throw notFound('Vorgang nicht gefunden.'); // keine Existenz-Offenlegung
  return { c, access };
}

// Liefert 'full' | 'read' | 'preview' | null
export function caseAccess(user, c) {
  switch (user.role) {
    case 'owner':
    case 'fleet':
      return 'full';
    case 'dispatch':
    case 'viewer':
      return 'read';
    case 'workshop':
      if (c.workshop_site === user.workshop_site && c.status !== 'gemeldet' && c.status !== 'abgelehnt') return 'full';
      if (c.status === 'gemeldet' && (c.suggested_workshop_site === user.workshop_site || c.workshop_site === user.workshop_site)) return 'preview';
      if (c.reporter_id === user.id) return 'read';
      return null;
    case 'driver':
      return c.reporter_id === user.id ? 'read' : null;
    default:
      return null;
  }
}

// Vorgang ohne Bewegung (Einstellung `case_stale_days`, leer = aus): bewertet/übernommen/in Reparatur und letzte Änderung vor dem
// Berliner Tag „heute − N“ + 1 – gleiche Regel für Fuhrparkagent (CASE_STALE) und Vorgangsfilter „Ohne Bewegung“
export const STALE_SQL = `(c.status IN ('in_reparatur','wartet_teile') OR (c.status='gemeldet' AND c.fleet_received_at IS NOT NULL) OR (c.status='werkstatt_freigegeben' AND c.workshop_ack_at IS NOT NULL))`;
export function staleBefore(days) {
  const n = Number(days);
  if (!(n > 0)) return null;
  const limit = new Date(Date.parse(berlinDate() + 'T00:00:00Z') - (n - 1) * 86400000).toISOString().slice(0, 10);
  return berlinDayStartIso(limit);
}

// Sortierung der Liste (vor dem LIMIT, damit z. B. „älteste zuerst“ auch bei vielen Vorgängen stimmt); Standard: Dringlichkeit
const CASE_SORTS = {
  // gesperrter offener Vorgang („nicht fahrbereit“ mit Dringlichkeit „niedrig“) wie kritisch vorn (Backlog 193, Teilagent „Frostmorgen“:
  // stand hinter 11 ungesperrten „mittel“-Vorgängen und fiel bei der 500er-Kappung der Startseiten-Zähler als erster heraus)
  priority: `CASE WHEN c.priority='kritisch' OR (c.safety_lock=1 AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) THEN 0 WHEN c.priority='mittel' THEN 1 ELSE 2 END,
      CASE WHEN c.status IN ('fahrzeug_freigegeben','abgelehnt') THEN 1 ELSE 0 END, c.updated_at DESC`,
  oldest: 'c.created_at ASC, c.id',
  updated: 'c.updated_at DESC, c.id',
};
// meta (optional): erhält site/site_options für den Filter „Fahrzeug-Standort“ (vsite) – nicht für Fahrer
export async function listCases(env, user, envName, query, meta = null) {
  // query.__counts: nur Begrenzung melden (meta.truncated), ohne Standort-/Nachfass-Angaben (spart zwei Abfragen, z. B. Startseite)
  const fullMeta = meta && !query.__counts;
  const where = ['c.environment = ?'];
  const args = [envName];
  // Fahrzeug-Standort laut Fahrzeugstamm (Schreibweise egal): passende Schreibweisen in JS bestimmen (Umlaute, wie Berichte),
  // dann exakt per IN filtern – so greift das LIMIT erst nach dem Filter
  if (user.role !== 'driver' && (fullMeta || query.vsite)) {
    const vs = (await env.DB.prepare('SELECT site FROM vehicles').all()).results;
    const sel = siteSelection(vs, query.vsite);
    if (fullMeta) { meta.site = sel.site; meta.site_options = sel.options; }
    if (sel.site) {
      if (sel.site === 'ohne') where.push(`(v.site IS NULL OR trim(v.site) = '')`);
      else {
        const raws = [...new Set(vs.map((v) => v.site).filter((x) => x && sel.match(x)))];
        if (raws.length) { where.push(`v.site IN (${raws.map(() => '?').join(',')})`); args.push(...raws); } else where.push('0');
      }
    }
  }
  if (user.role === 'driver') { where.push('c.reporter_id = ?'); args.push(user.id); }
  if (user.role === 'workshop') {
    where.push(`((c.workshop_site = ? AND c.status NOT IN ('gemeldet','abgelehnt')) OR (c.status='gemeldet' AND (c.suggested_workshop_site = ? OR c.workshop_site = ?)) OR c.reporter_id = ?)`);
    args.push(user.workshop_site, user.workshop_site, user.workshop_site, user.id);
  }
  if (query.status === 'open') where.push(`c.status IN (${OPEN_STATUSES.map(() => '?').join(',')})`), args.push(...OPEN_STATUSES);
  else if (query.status === 'closed') where.push(`c.status IN ('fahrzeug_freigegeben','abgelehnt')`);
  else if (query.status && STATUSES.includes(query.status)) { where.push('c.status = ?'); args.push(query.status); }
  if (query.vehicle_id) { where.push('c.vehicle_id = ?'); args.push(query.vehicle_id); }
  // Werkstatt-Filter (Backlog 264, Teilagent „Werkstatt fällt eine Woche aus“): Aufträge der Werkstatt bzw. Meldungen mit diesem Vorschlag
  // (noch ohne Werkstatt) – Überblick, was bei einem Ausfall umzuverteilen ist; Werkstattkonten sehen ohnehin nur den eigenen Standort
  if (query.ws !== undefined && query.ws !== '' && user.role !== 'driver') {
    const ws = str(query.ws, { max: 20, field: 'Werkstatt' });
    where.push('(c.workshop_site = ? OR (c.workshop_site IS NULL AND c.suggested_workshop_site = ?))'); args.push(ws, ws);
  }
  // Filter „Mangel erneut festgestellt“: Vermerk der Abfahrtskontrolle in den letzten N Tagen (1–30)
  if (query.repeat_days !== undefined && query.repeat_days !== '') {
    const d = Number(query.repeat_days);
    if (!Number.isInteger(d) || d < 1 || d > 30) throw bad('invalid_repeat_days', 'repeat_days: 1–30 Tage');
    where.push(`EXISTS (SELECT 1 FROM case_events e WHERE e.case_id=c.id AND e.action='repeat_finding' AND e.created_at >= ?)`);
    args.push(berlinWindowStartIso(d));
  }
  // Schalter-Filter nur bei „1“/„true“/„ja“ (17.10.2026: ?warranty=0 schaltete den Filter EIN, weil nur der Rohwert geprüft wurde)
  const on = (v) => typeof v === 'string' && /^(1|true|ja|yes)$/i.test(v.trim());
  const qWarranty = on(query.warranty); const qFollowup = on(query.followup); const qStale = on(query.stale);
  // Filter „kritisch“/„gesperrt“ (Backlog 238): gleiche Regel wie die Zähler der Startseite (priority='kritisch' bzw. safety_lock)
  if (query.priority !== undefined && query.priority !== '') {
    if (!PRIORITIES.includes(query.priority)) throw bad('validation', 'Priorität: niedrig, mittel oder kritisch.');
    where.push('c.priority = ?'); args.push(query.priority);
  }
  if (on(query.locked)) where.push('c.safety_lock = 1');
  // „Eingang nicht bestätigt“ (Backlog 278, Teilagent „Sturmnacht“): gleiche Regel wie „Heute zu tun → Eingang bestätigen“ der Startseite
  if (on(query.unreceived)) where.push(user.role === 'driver' ? '0' : `c.status = 'gemeldet' AND c.fleet_received_at IS NULL`);
  // „Kostenfreigabe ausstehend“ (Backlog 239): gleiche Regel wie „Heute zu tun“ (offen und `cost_over_limit_at` gesetzt; Fahrer nie)
  if (on(query.cost_approval)) where.push(user.role === 'driver' ? '0' : `c.cost_over_limit_at IS NOT NULL AND c.status IN (${OPEN_STATUSES.map((x) => `'${x}'`).join(',')})`);
  // Filter „Gewährleistung prüfen“: frühere Vorgänge desselben Fahrzeugs mit Teil/Fremdleistung, deren Gewährleistung am Meldetag
  // noch lief (Meldetag = Berliner Kalendertag wie im Vorgang angezeigt); Werkstatt nur eigener Standort
  let withSql = '';
  if (qWarranty && user.role !== 'driver') {
    const own = user.role === 'workshop' ? ' AND x.workshop_site = ?' : '';
    // Leistung (22.10.2026, 15 000 Vorgänge: 587 → 10 ms): Positionen mit Gewährleistung einmal sammeln (wenige), statt je Vorgang
    // alle früheren Vorgänge des Fahrzeugs samt Teilen/Fremdleistungen zu durchsuchen
    withSql = `WITH wp AS MATERIALIZED (SELECT x.id, x.vehicle_id, x.environment, x.created_at, x.workshop_site, g.warranty_until AS wu
      FROM (SELECT case_id, warranty_until FROM parts WHERE warranty_until IS NOT NULL UNION ALL SELECT case_id, warranty_until FROM external_costs WHERE warranty_until IS NOT NULL) g
      JOIN cases x ON x.id=g.case_id) `;
    where.push(`EXISTS (SELECT 1 FROM wp x WHERE x.vehicle_id=c.vehicle_id AND x.environment=c.environment AND x.id<>c.id AND x.created_at < c.created_at${own}
      AND x.wu >= ${berlinDaySql('c.created_at')})`);
    if (own) args.push(user.workshop_site);
  }
  // Filter „Wiedervorlage“ (nur Inhaber/Fuhrparkleitung/Lesende): offene Vorgänge mit Wiedervorlage, fällige zuerst (Sortierung in der Oberfläche)
  if (qFollowup && !['driver', 'workshop'].includes(user.role)) where.push(`c.followup_on IS NOT NULL AND c.status IN (${OPEN_STATUSES.map((x) => `'${x}'`).join(',')})`);
  else if (qFollowup) where.push('0');
  // Filter „Ohne Bewegung“ (nur wenn eingestellt; sonst leere Liste statt einer erfundenen Frist)
  if (fullMeta || qStale) {
    const days = user.role === 'driver' ? null : Number((await env.DB.prepare(`SELECT value FROM settings WHERE key='case_stale_days'`).first())?.value) || null;
    if (fullMeta && user.role !== 'driver') meta.stale_days = days;
    if (qStale && user.role !== 'driver') {
      const before = staleBefore(days);
      if (!before) where.push('0'); else { where.push(STALE_SQL, 'c.updated_at < ?'); args.push(before); }
    }
  }
  // Suche: Beschreibung, Vorgangsnummer, Kennzeichen (ohne Leerzeichen/Bindestriche), Platzhalter werden nicht ausgewertet
  const q = cutText(cleanText(query.q || '').trim(), 60);
  if (q.length >= 2) {
    const plateKey = normPlate(q); // gleiche Regel wie Zuordnungen (Punkt, Schrägstrich, geschützte Leerzeichen, Gedankenstrich; 21.10.2026)
    // LIKE in SQLite/D1 ignoriert Groß-/Kleinschreibung nur für A–Z: „гальма“ fände „Гальма …“ nicht, „öl“ nicht „Ölwechsel“.
    // Deshalb je Suchwort Schreibweisen-Varianten (wie eingegeben, klein, GROSS, Wortanfang groß); mehrere Wörter: alle müssen
    // in der Beschreibung vorkommen (Reihenfolge egal, höchstens 5) – eine Abfrage, keine Schemaänderung.
    const words = [...new Set(q.split(/\s+/).filter(Boolean))].slice(0, 5);
    const wordSql = []; const wordArgs = [];
    for (const w of words) {
      // aus Kontrollen erzeugte Vorgänge speichern den Prüfpunkt-Schlüssel („… blinker_warnblinker: …“) und zeigen die Bezeichnung je Sprache:
      // passt das Suchwort (ab 3 Zeichen) zu einer Bezeichnung in DE/UK/EN, wird der Schlüssel mitgesucht (höchstens 3)
      const vs = [...caseVariants(w), ...checkKeysFor(w)];
      // instr statt LIKE (D1: Muster über 50 Byte → Fehler, 19.10.2026); lower() wie LIKE für A–Z, Varianten für andere Buchstaben
      wordSql.push(`(${vs.map(() => `instr(lower(c.description), lower(?)) > 0`).join(' OR ')})`); wordArgs.push(...vs);
    }
    // früheres Kennzeichen des Fahrzeugs (Backlog 256): Rechnung/Gutachten nennt nach einer Umkennzeichnung oft noch das alte
    where.push(`((${wordSql.join(' AND ')}) OR instr(lower(c.case_no), lower(?)) > 0 OR instr(${PLATE_KEY_SQL('v.plate')}, ?) > 0
      OR EXISTS (SELECT 1 FROM vehicle_plates vp WHERE vp.vehicle_id=c.vehicle_id AND instr(${PLATE_KEY_SQL('vp.plate')}, ?) > 0))`);
    args.push(...wordArgs, q, plateKey.length >= 2 ? plateKey : '\u0000', plateKey.length >= 2 ? plateKey : '\u0000');
  }
  const limit = intParam(query.limit, 200, 1, query.__export ? 5000 : 500);
  const rows = (await env.DB.prepare(`${withSql}
    SELECT c.*, v.plate, v.site AS vehicle_site, u.display_name AS reporter_name, CASE WHEN u.role='driver' OR u.was_driver=1 THEN 'driver' ELSE u.role END AS reporter_role,
      (SELECT COUNT(*) FROM open_items oi WHERE oi.case_id=c.id AND oi.status='offen') AS open_items,
      (SELECT COUNT(*) FROM files f WHERE f.case_id=c.id) AS file_count,
      (SELECT MAX(e.created_at) FROM case_events e WHERE e.case_id=c.id AND e.action='repeat_finding') AS last_repeat_at,
      -- Disposition „seit“: Beginn der aktuellen Sperre bzw. des aktuellen Status (20.10.2026, Backlog 98; vorher Meldezeitpunkt/letzte Änderung)
      CASE WHEN c.safety_lock=1 THEN COALESCE((SELECT MAX(e.created_at) FROM case_events e WHERE e.case_id=c.id AND e.action='set_safety_lock'), c.created_at) END AS lock_since,
      (SELECT MAX(e.created_at) FROM case_events e WHERE e.case_id=c.id AND e.to_status=c.status AND (e.from_status IS NULL OR e.from_status<>e.to_status)) AS status_since,
      (SELECT d.case_no FROM cases d WHERE d.id=c.duplicate_of) AS duplicate_of_no
    FROM cases c JOIN vehicles v ON v.id=c.vehicle_id JOIN users u ON u.id=c.reporter_id
    WHERE ${where.join(' AND ')}
    ORDER BY ${Object.hasOwn(CASE_SORTS, query.sort) ? CASE_SORTS[query.sort] : CASE_SORTS.priority}
    LIMIT ?`).bind(...args, limit + 1).all()).results;
  // eine Zeile mehr gelesen: zeigt an, dass die Liste begrenzt ist (Oberfläche: „weitere laden“ bzw. Suche/CSV)
  if (rows.length > limit) { rows.length = limit; if (meta) meta.truncated = true; }
  return rows.map((r) => shapeCaseRow(r, user));
}

// Vorschläge für Tätigkeiten: häufigste bisherige Beschreibungen der eigenen Werkstatt (nur Text, keine Personen)
export async function workSuggestions(env, user, envName) {
  if (!['owner', 'fleet', 'workshop'].includes(user.role)) throw forbidden();
  const site = user.role === 'workshop' ? user.workshop_site : null;
  const rows = (await env.DB.prepare(`SELECT w.description AS d, COUNT(*) AS n, MAX(w.created_at) AS last FROM work_entries w JOIN cases c ON c.id=w.case_id
    WHERE c.environment=? ${site ? 'AND c.workshop_site=?' : ''} AND w.created_at > ? GROUP BY w.description ORDER BY n DESC, last DESC LIMIT 40`)
    .bind(...(site ? [envName, site] : [envName]), new Date(Date.now() - 365 * 86400000).toISOString()).all()).results;
  return { suggestions: rows.map((r) => r.d) };
}

// Eigene Arbeitszeit eines Tages (Backlog 419, Blickwinkel „Mechaniker bucht Arbeitszeit für zwei Aufträge am selben Tag“):
// Summe über alle Vorgänge wie die 24-h-Tagesgrenze, Aufteilung je Auftrag nur für die aktuelle Umgebung; nur das eigene Konto,
// keine Auswertung anderer Personen.
export async function myWorkDay(env, user, envName, q = {}) {
  if (!['owner', 'fleet', 'workshop'].includes(user.role)) throw forbidden();
  const date = str(q.date, { max: 10 }) || berlinDate();
  if (!isCalendarDate(date)) throw bad('validation', 'Datum ungültig.');
  const rows = (await env.DB.prepare(`SELECT w.case_id, c.case_no, v.plate, c.environment AS e, SUM(w.hours) AS h, COUNT(*) AS n FROM work_entries w
    JOIN cases c ON c.id=w.case_id LEFT JOIN vehicles v ON v.id=c.vehicle_id WHERE w.user_id=? AND w.work_date=? GROUP BY w.case_id ORDER BY MIN(w.created_at)`)
    .bind(user.id, date).all()).results;
  const r2 = (x) => Math.round(x * 100) / 100;
  const total = rows.reduce((a, r) => a + (Number(r.h) || 0), 0);
  const mine = rows.filter((r) => r.e === envName);
  const other = rows.filter((r) => r.e !== envName).reduce((a, r) => a + (Number(r.h) || 0), 0);
  return { date, hours: r2(total), remaining: r2(Math.max(0, 24 - total)), other_environment_hours: r2(other),
    cases: mine.map((r) => ({ case_id: r.case_id, case_no: r.case_no, plate: r.plate || null, hours: r2(Number(r.h) || 0), entries: r.n })) };
}

// Vorschläge für Teile: bisher erfasste Teile der eigenen Werkstatt (Bezeichnung + Teilenummer, ohne Preise)
export async function partSuggestions(env, user, envName) {
  if (!['owner', 'fleet', 'workshop'].includes(user.role)) throw forbidden();
  const site = user.role === 'workshop' ? user.workshop_site : null;
  const rows = (await env.DB.prepare(`SELECT p.name, p.part_number, COUNT(*) AS n, MAX(p.created_at) AS last FROM parts p JOIN cases c ON c.id=p.case_id
    WHERE c.environment=? ${site ? 'AND c.workshop_site=?' : ''} AND p.created_at > ? GROUP BY p.name, p.part_number ORDER BY n DESC, last DESC LIMIT 60`)
    .bind(...(site ? [envName, site] : [envName]), new Date(Date.now() - 365 * 86400000).toISOString()).all()).results;
  return { suggestions: rows.map((r) => ({ name: r.name, part_number: r.part_number })) };
}

// CSV-Export der Vorgangsliste (gleiche Filter und Rechte wie die Liste), Excel-tauglich (UTF-8 mit BOM, Semikolon)
const PRIO_DE = { niedrig: 'niedrig', mittel: 'mittel', kritisch: 'kritisch' };
// Status als Bezeichnung wie in der App (bis 16.10.2026 stand in der CSV der Code, z. B. „werkstatt_freigegeben“); Test prüft Gleichheit mit i18n.js
export const CASE_STATUS_DE = { gemeldet: 'Gemeldet', werkstatt_freigegeben: 'Werkstatt freigegeben', in_reparatur: 'In Reparatur', wartet_teile: 'Wartet auf Teile', abschlusskontrolle: 'Abschlusskontrolle', fahrzeug_freigegeben: 'Fahrzeug freigegeben', abgelehnt: 'Abgelehnt' };
// claims (optional, nur Inhaber/Fuhrparkleitung): Map case_id → Versicherungsfall; dann drei zusätzliche Spalten
const ORIGIN_DE = { meldung: 'Meldung', kontrolle: 'Abfahrtskontrolle', wartung: 'Prüfauftrag', agent: 'Fuhrparkagent' };
// Fahrbereit laut Meldung als Bezeichnung wie in der App (20.10.2026: CSV zeigte Codes wie „nicht_fahrbereit“)
export const DRV_DE = { unbekannt: 'Weiß nicht', fahrbereit: 'Ja, fahrbereit', eingeschraenkt: 'Eingeschränkt', nicht_fahrbereit: 'Nein, nicht fahrbereit' };
const CLAIM_DE = { gemeldet: 'gemeldet', in_pruefung: 'in Prüfung', reguliert: 'reguliert', abgelehnt: 'abgelehnt', zurueckgezogen: 'zurückgezogen' };
// workshopNames (optional): Map Werkstatt-Code → Name (20.10.2026: CSV zeigte „MUENCHEN“ statt „Werkstatt München“)
export function casesCsv(rows, csvCell, fmt, claims = null, workshopNames = null) {
  const head = ['Vorgang', 'Kennzeichen', 'Standort', 'Priorität', 'Status', 'Sicherheitssperre', 'Fahrbereit laut Meldung', 'Werkstatt', 'Beschreibung', 'Gemeldet am', 'Gemeldet von',
    'Eingang bestätigt', 'Werkstatt übernommen', 'Abgeschlossen', 'Offene Restarbeiten', 'Fotos/Dateien', 'Werkstatttermin', ...(claims ? ['Versicherungsfall', 'Versicherer', 'Schadennummer', 'Kostenfreigabe ausstehend'] : []), 'Herkunft', 'Dublette von', 'Wiedervorlage', 'Schadenzeitpunkt laut Meldung'];
  const lines = [head.join(';')];
  for (const c of rows) {
    const k = claims && claims.get(c.id);
    lines.push([csvCell(c.case_no), csvCell(c.plate), csvCell(c.vehicle_site), PRIO_DE[c.priority] || c.priority, CASE_STATUS_DE[c.status] || csvCell(c.status), c.safety_lock ? 'ja' : 'nein',
      DRV_DE[c.reported_driveability] || csvCell(c.reported_driveability), csvCell((workshopNames && workshopNames.get(c.workshop_site)) || c.workshop_site), csvCell(caseDescText(c.description, 'de')), fmt(c.created_at), csvCell(c.reporter_name_hidden ? 'Fahrer/in (Name ausgeblendet)' : c.reporter_name), fmt(c.fleet_received_at), fmt(c.workshop_ack_at), fmt(c.closed_at),
      c.open_items ?? '', c.file_count ?? '', c.planned_date ? c.planned_date.split('-').reverse().join('.') : '',
      ...(claims ? [k ? CLAIM_DE[k.status] : '', csvCell(k ? k.insurer : ''), quoteCell(csvCell(k ? k.claim_no : '')), c.cost_over_limit_at && OPEN_STATUSES.includes(c.status) ? 'ja' : ''] : []), ORIGIN_DE[c.origin] || csvCell(c.origin), csvCell(c.duplicate_of_no), c.followup_on ? csvCell(c.followup_on.split('-').reverse().join('.') + (c.followup_note ? ' – ' + c.followup_note : '')) : '', csvCell(occurredCsv(c.occurred_at))].join(';'));
  }
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

// Ausgeblendete Felder je Rolle einmal bestimmen; Kopie in einem Durchlauf statt Spread + delete (delete schaltet V8-Objekte in den
// langsamen Wörterbuchmodus – Vorgangsliste/CSV ≈ 30 µs je Zeile, Rechenzeit-Grenze 10 ms je Aufruf; 22.10.2026). Ergebnis und Feldreihenfolge wie vorher.
const SHAPE_OMIT = new Map();
function shapeOmit(user) {
  const key = `${user.role}|${canSeeCosts(user) ? 1 : 0}`;
  let o = SHAPE_OMIT.get(key);
  if (!o) {
    o = new Set(['request_key', 'content_hash']);
    if (!canSeeCosts(user)) o.add('cost_approved_net');
    if (user.role === 'driver') { o.add('cost_over_limit_at'); o.add('fleet_received_by'); o.add('workshop_ack_by'); } // Fahrer: keine internen Zuständigkeiten
    if (user.role === 'viewer') o.add('reporter_name_note'); // freier Namensvermerk – Datensparsamkeit Lesezugriff
    if (user.role === 'driver' || user.role === 'workshop') { o.add('followup_on'); o.add('followup_note'); } // Wiedervorlage = Arbeitsmittel der Leitung
    SHAPE_OMIT.set(key, o);
  }
  return o;
}
// extraOmit: zusätzlich weggelassene Schlüssel (Liste: reporter_role nach hideDriverName-Regel)
export function shapeCase(c, user, extraOmit = null) {
  const omit = shapeOmit(user); const out = {};
  // Kostenfreigabe „ausstehend“ nur an offenen Vorgängen (abgelehnt/abgeschlossen: Verlauf behält cost_limit_exceeded)
  const open = OPEN_STATUSES.includes(c.status);
  for (const k in c) {
    if (omit.has(k) || k === extraOmit) continue;
    out[k] = k === 'cost_over_limit_at' && !open ? null : c[k];
  }
  return out;
}
// Listenzeile: wie hideDriverName(user, shapeCase(r, user), 'reporter_name', 'reporter_role') + access, in einem Durchlauf
export function shapeCaseRow(r, user) {
  const out = shapeCase(r, user, 'reporter_role');
  if (user.role === 'viewer' && r.reporter_role === 'driver') { out.reporter_name = null; out.reporter_name_hidden = true; }
  out.access = caseAccess(user, r);
  return out;
}

// Backlog 378 (Blickwinkel „Werkstatt bekommt Teile falsch geliefert“): Zusammenfassung des laufenden Wartens auf Teile aus dem Verlauf –
// Vermerk von „Warten auf Teile“ (worauf gewartet wird), ursprünglich genannter Liefertermin, Anzahl der Verschiebungen (später oder entfernt)
// und der letzte Vermerk zu einer Terminänderung. Nur Angaben der Werkstatt/Leitung, nichts geschätzt.
export function partsWaitOf(events) {
  let i = -1;
  for (let k = events.length - 1; k >= 0; k--) if (events[k].action === 'wait_parts') { i = k; break; }
  if (i < 0) return null;
  const w = events[i];
  const moves = events.slice(i + 1).filter((e) => e.action === 'set_parts_eta' && e.payload);
  const postponed = moves.filter((e) => e.payload.from && (!e.payload.to || e.payload.to > e.payload.from)).length;
  const firstEta = (w.payload && w.payload.parts_expected_date) || (moves[0] && moves[0].payload.to) || null;
  const lastNoted = [...moves].reverse().find((e) => e.note);
  return { note: w.note || null, since: w.created_at, first_eta: firstEta, changes: moves.length, postponed, ...(lastNoted ? { last_change_note: lastNoted.note, last_change_at: lastNoted.created_at } : {}) };
}

export async function getCaseDetail(env, user, envName, caseId) {
  const { c, access } = await loadCase(env, user, envName, caseId);
  const vehicle = await env.DB.prepare('SELECT * FROM vehicles WHERE id=?').bind(c.vehicle_id).first();
  // reach: 0 = deaktiviert, 1 = erreichbar, 2 = aktiv, aber nicht benachrichtigbar (ohne Passwort/andere Umgebung; Regel wie candidateUsers.reporter_ok)
  const reporter = await env.DB.prepare(`SELECT display_name, CASE WHEN role='driver' OR was_driver=1 THEN 'driver' ELSE role END AS role,
    CASE WHEN active<>1 THEN 0 WHEN password_hash IS NOT NULL AND (environment=? OR role='owner') THEN 1 ELSE 2 END AS reach FROM users WHERE id=?`).bind(c.environment, c.reporter_id).first();
  const receivedBy = isManager(user) && c.fleet_received_by ? await env.DB.prepare(`SELECT display_name AS name, CASE WHEN active=1 AND role IN ('owner','fleet') THEN 1 ELSE 0 END AS current FROM users WHERE id=?`).bind(c.fleet_received_by).first() : null;
  const events = (await env.DB.prepare(`SELECT e.id, e.action, e.from_status, e.to_status, e.note, e.payload, e.created_at, e.actor_role, u.display_name AS actor_name
    FROM case_events e LEFT JOIN users u ON u.id=e.actor_id WHERE e.case_id=? ORDER BY e.created_at`).bind(c.id).all()).results
    .map((e) => ({ ...e, payload: e.payload ? JSON.parse(e.payload) : null }))
    .filter((e) => e.action !== 'set_followup' || !['driver', 'workshop'].includes(user.role)) // Wiedervorlage nur für Leitung/Lesende
    // Kosten-Ereignisse sind interne Abläufe der Leitung/Werkstatt – Fahrer sehen sie nicht (wie cost_over_limit_at; 20.10.2026)
    .filter((e) => user.role !== 'driver' || !['cost_limit_exceeded', 'cost_limit_cleared', 'approve_costs', 'add_external_cost'].includes(e.action));
  // Fahrer sehen wie im Verlauf keine Namen anderer Personen, nur deren Rolle (17.10.2026: Restarbeiten/Kontrollen zeigten Namen von Werkstatt/Leitung)
  const ownName = (o, by, nameK) => (user.role === 'driver' && o[by] !== user.id ? { ...o, [nameK]: null, [nameK + '_role']: o[nameK.replace('_name', '_role')] } : o);
  // Dateien mit Name/Rolle der hochladenden Person (Backlog 223, 24.10.2026: Werkstatt konnte Schadensfotos des Fahrers nicht von eigenen
  // Reparaturfotos unterscheiden); gleiche Namensregeln wie Restarbeiten/Kontrollen
  const files = (await env.DB.prepare(`SELECT f.id, f.filename, f.content_type, f.size, f.created_at, f.uploaded_by, u.display_name AS uploaded_by_name, CASE WHEN u.role='driver' OR u.was_driver=1 THEN 'driver' ELSE u.role END AS uploaded_by_role
    FROM files f LEFT JOIN users u ON u.id=f.uploaded_by WHERE f.case_id=? ORDER BY f.created_at`).bind(c.id).all()).results
    .map((f) => {
      const role = f.uploaded_by_role || null;
      const r = hideDriverName(user, ownName(f, 'uploaded_by', 'uploaded_by_name'), 'uploaded_by_name', 'uploaded_by_role');
      delete r.uploaded_by_name_role;
      if (user.role === 'driver' && f.uploaded_by !== user.id) delete r.uploaded_by;
      return { ...r, uploader_role: role };
    });
  const openItems = (await env.DB.prepare(`SELECT o.*, u.display_name AS created_by_name, CASE WHEN u.role='driver' OR u.was_driver=1 THEN 'driver' ELSE u.role END AS created_by_role FROM open_items o JOIN users u ON u.id=o.created_by WHERE case_id=? ORDER BY created_at`).bind(c.id).all()).results
    .map((o) => hideDriverName(user, ownName(o, 'created_by', 'created_by_name'), 'created_by_name', 'created_by_role'));
  const inspections = (await env.DB.prepare(`SELECT i.id, i.kind, i.result, i.created_at, i.odometer_km, i.items, i.note, i.performed_by, u.display_name AS performed_by_name, CASE WHEN u.role='driver' OR u.was_driver=1 THEN 'driver' ELSE u.role END AS performed_by_role FROM inspections i JOIN users u ON u.id=i.performed_by WHERE i.case_id=? ORDER BY i.created_at`).bind(c.id).all()).results
    .map(({ performed_by, ...i }) => hideDriverName(user, ownName({ ...i, items: JSON.parse(i.items), performed_by }, 'performed_by', 'performed_by_name'), 'performed_by_name', 'performed_by_role'))
    .map(({ performed_by, ...i }) => i);
  // Folgeauftrag je Prüfpunkt nur verlinken, wenn die Person ihn öffnen darf – sonst nur die Nummer (21.10.2026: Fahrer/Werkstatt sahen
  // die Kennung eines an eine andere Werkstatt übergebenen bzw. fremden Vorgangs, Link → 404; Regel wie bei Folgeaufträgen/Dubletten)
  if (!['owner', 'fleet', 'dispatch', 'viewer'].includes(user.role)) {
    const fids = [...new Set(inspections.flatMap((i) => (Array.isArray(i.items) ? i.items : []).map((it) => it && it.followup_case_id).filter(Boolean)))];
    if (fids.length) {
      const okIds = new Set((await env.DB.prepare(`SELECT id, status, reporter_id, workshop_site, suggested_workshop_site FROM cases WHERE environment=? AND id IN (SELECT value FROM json_each(?))`).bind(c.environment, JSON.stringify(fids)).all()).results
        .filter((x) => caseAccess(user, x)).map((x) => x.id));
      for (const i of inspections) for (const it of (Array.isArray(i.items) ? i.items : [])) if (it && it.followup_case_id && !okIds.has(it.followup_case_id)) delete it.followup_case_id;
    }
  }
  // Folgeaufträge und als Dublette geschlossene Meldungen zu diesem Vorgang in einer Abfrage
  // nur Vorgänge, die die Person selbst öffnen darf (17.10.2026: Fahrer sah Beschreibung fremder Folgeaufträge der Werkstatt, Link → 404)
  const linked = (await env.DB.prepare('SELECT id, case_no, status, priority, description, created_at, parent_case_id, reporter_id, workshop_site, suggested_workshop_site, environment FROM cases WHERE parent_case_id=?1 OR duplicate_of=?1 ORDER BY created_at').bind(c.id).all()).results
    .filter((x) => caseAccess(user, x)).map(({ reporter_id, workshop_site, suggested_workshop_site, environment, ...x }) => x);
  const followups = linked.filter((x) => x.parent_case_id === c.id).map(({ created_at, parent_case_id, ...x }) => x);
  const duplicates = linked.filter((x) => x.parent_case_id !== c.id).map((x) => ({ id: x.id, case_no: x.case_no, created_at: x.created_at }));
  // Original ohne Zugriff (z. B. Meldung eines anderen Fahrers): nur die Nummer, weder Kennung noch Status (17.10.2026, wie Folgeaufträge)
  const dupRow = c.duplicate_of ? await env.DB.prepare('SELECT id, case_no, status, reporter_id, workshop_site, suggested_workshop_site, environment FROM cases WHERE id=?').bind(c.duplicate_of).first() : null;
  const duplicateOf = dupRow ? (caseAccess(user, dupRow) ? { id: dupRow.id, case_no: dupRow.case_no, status: dupRow.status } : { case_no: dupRow.case_no }) : null;
  // Ursprungsvorgang ohne Zugriff (z. B. bei einer anderen Werkstatt): nur die Nummer, keine Kennung (21.10.2026, wie duplicate_of)
  const parentRow = c.parent_case_id ? await env.DB.prepare('SELECT id, case_no, status, reporter_id, workshop_site, suggested_workshop_site FROM cases WHERE id=? AND environment=?').bind(c.parent_case_id, c.environment).first() : null;
  const parent = parentRow ? (caseAccess(user, parentRow) ? { id: parentRow.id, case_no: parentRow.case_no } : { case_no: parentRow.case_no }) : null;
  // Prüfung des Mängelauftrags + jüngste spätere Durchführung derselben Prüfart am Fahrzeug (= eingetragene Nachprüfung)
  const mevent = c.maintenance_event_id ? await env.DB.prepare(`SELECT e.id, e.kind, e.done_date, e.result,
      (SELECT json_object('done_date', n.done_date, 'result', n.result, 'evidence', n.evidence) FROM maintenance_events n WHERE n.vehicle_id=e.vehicle_id AND n.kind=e.kind AND n.id<>e.id
        AND (n.done_date > e.done_date OR (n.done_date = e.done_date AND n.created_at > e.created_at)) ORDER BY n.done_date DESC, n.created_at DESC LIMIT 1) AS reinspection
      FROM maintenance_events e WHERE e.id=?`).bind(c.maintenance_event_id).first() : null;
  if (mevent) mevent.reinspection = mevent.reinspection ? JSON.parse(mevent.reinspection) : null;
  const mrule = c.maintenance_rule_id ? await env.DB.prepare('SELECT id, kind, last_done_date FROM maintenance_rules WHERE id=?').bind(c.maintenance_rule_id).first() : null;
  // Auftrag „Winterreifen“: aktuelle Winterlage laut Reifenerfassung (erledigt erst mit Erfassung inkl. Winterkennzeichnung)
  const tireWinter = c.tire_order === 'winter' ? await caseWinter(env, c, vehicle?.kind) : null;
  // Verlauf: Beträge/Stunden nur für Rollen, die sie auch in der Akte sehen (Kosten: Leitung; Arbeiten/Teile: Leitung + ausführende Werkstatt)
  const seesWork = user.role !== 'driver' && user.role !== 'viewer' && user.role !== 'dispatch' && (user.role !== 'workshop' || access === 'full');
  // Vermerke zu Kosten-Aktionen enthalten oft Beträge („Freigabe bis 1.450 €“) – ohne Kostenrecht ausgeblendet (17.10.2026)
  const hiddenNotes = canSeeCosts(user) ? [] : ['cost_limit_exceeded', 'cost_limit_cleared', 'approve_costs', 'add_external_cost'];
  const hiddenPayloads = [...(canSeeCosts(user) ? [] : ['cost_limit_exceeded', 'cost_limit_cleared', 'approve_costs', 'add_external_cost']), ...(seesWork ? [] : ['add_part', 'record_work'])];
  const detail = {
    // Fahrer: nur die Fahrzeugangaben der Fahrer-Fahrzeugliste (21.10.2026: Vorgang lieferte den ganzen Stammsatz inkl. FIN und Vermerken der Leitung)
    case: shapeCase(c, user), access, vehicle: user.role === 'driver' && vehicle ? { id: vehicle.id, plate: vehicle.plate, kind: vehicle.kind, site: vehicle.site, manufacturer: vehicle.manufacturer, trailer_plate: vehicle.trailer_plate, active: vehicle.active } : vehicle, reporter_name: user.role === 'viewer' && reporter?.role === 'driver' ? null : reporter?.display_name || null,
    ...(user.role === 'viewer' && reporter?.role === 'driver' ? { reporter_name_hidden: true } : {}),
    // Kommentar „nur Gemeldet von“ an einen deaktivierten/nicht erreichbaren Melder erreicht niemanden (Backlog 249) – Fahrer erhalten das Feld nicht
    ...(user.role !== 'driver' && reporter && reporter.reach !== 1 ? { reporter_unreachable: reporter.reach === 0 ? 'inactive' : 'other' } : {}),
    // Eingang bestätigt von (Backlog 258b, Leitungswechsel): Leitung sieht Name und ob das Konto noch Leitung ist
    ...(isManager(user) && receivedBy ? { received_by: receivedBy } : {}),
    events: (user.role === 'driver' ? events.map(({ actor_name, ...e }) => e) : user.role === 'viewer' ? events.map((e) => (e.actor_role === 'driver' ? { ...e, actor_name: null, actor_name_hidden: true } : e)) : events).map((e) => (hiddenPayloads.includes(e.action) ? { ...e, payload: null, ...(hiddenNotes.includes(e.action) && e.note ? { note: null, note_hidden: true } : {}) } : e)),
    files, open_items: openItems, inspections, followups, parent, duplicates, duplicate_of: duplicateOf, maintenance_rule: mrule ? { ...mrule, done_since_order: !!(mrule.last_done_date && mrule.last_done_date >= berlinDate(c.created_at)) } : null,
    maintenance_event: mevent || null,
    tire_winter: tireWinter,
    allowed_actions: allowedActions(user, c, access),
  };
  // Versicherungsfall (nur Inhaber/Fuhrparkleitung) samt Versicherungsverträgen des Fahrzeugs zur Auswahl
  if (user.role === 'owner' || user.role === 'fleet') Object.assign(detail, await claimForCase(env, c.id, c.vehicle_id));
  // Fahrer laut Zuordnung/Abfahrtskontrolle zum Schadenzeitpunkt (Backlog 285) – nur Leitung (Fahrerdaten), nur wenn angegeben
  if (isManager(user) && c.occurred_at) detail.occurred_drivers = await driversAtOccurrence(env, envName, c);
  if (user.role !== 'driver') {
    // Kurzinfo zum Fahrzeug (nur gespeicherte Daten): weitere offene Vorgänge, Prüfungen ≤ 30 Tage/überfällig, letzter km-Stand –
    // damit die Werkstatt z. B. eine fällige Prüfung beim selben Aufenthalt mit erledigen kann
    // Werkstatt-Einschränkung im SQL (vorher nach dem LIMIT gefiltert → Zähler zu klein); Gesamtzahl per Fensterfunktion, angezeigt werden die neuesten 5
    const wsOnly = user.role === 'workshop' ? user.workshop_site : null;
    // + Kurzbeschreibung/Prüfpunkt/Meldezeit (Backlog 279, Teilagent „Sturmnacht“): Dublette erkennbar, ohne jeden Vorgang zu öffnen
    const othersRows = (await env.DB.prepare(`SELECT id, case_no, status, priority, workshop_site, safety_lock, substr(description, 1, 120) AS description, check_item, created_at, COUNT(*) OVER () AS total FROM cases WHERE vehicle_id=? AND environment=? AND id<>?
      AND status IN ('gemeldet','werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle') ${wsOnly ? "AND workshop_site=? AND status<>'gemeldet'" : ''} ORDER BY created_at DESC LIMIT 5`)
      .bind(...[c.vehicle_id, envName, c.id, ...(wsOnly ? [wsOnly] : [])]).all()).results;
    const othersTotal = othersRows.length ? othersRows[0].total : 0;
    const others = othersRows.map(({ total, ...o }) => o);
    // Backlog 398 (Blickwinkel „Getriebetausch – Fahrtenschreiber“): Fenster wie die Vorwarnung der Prüftermine, mindestens 30 Tage
    // (vorher fest 30 – bei Vorwarnung 60 meldete der Agent „fällig in 45 Tagen“, der Vorgang in der Werkstatt zeigte nichts)
    // Einstellung im selben SQL (Abfragebudget Vorgangsdetail): leer/ungültig → 30, kleiner als 30 → 30
    // + offene Herstellerrückrufe auch ohne Frist (mit Referenz laut Nachweis) – typischer Fall „beim selben Werkstattaufenthalt mit erledigen“
    const dueRows = (await env.DB.prepare(`WITH w AS (SELECT MAX(30, COALESCE((SELECT CAST(value AS INTEGER) FROM settings WHERE key='maintenance_warn_days' AND trim(value)<>''), 30)) AS d)
      SELECT kind, next_due_date, CASE WHEN kind='Rückruf' THEN evidence END AS recall_ref, w.d AS warn_d FROM maintenance_rules, w WHERE vehicle_id=?
      AND ((next_due_date IS NOT NULL AND next_due_date <= date(?, '+' || w.d || ' days') AND NOT (kind='Rückruf' AND last_done_date IS NOT NULL)) OR (kind='Rückruf' AND last_done_date IS NULL)) ORDER BY next_due_date IS NULL, next_due_date LIMIT 10`).bind(c.vehicle_id, berlinDate()).all()).results;
    const dueDays = dueRows.length ? dueRows[0].warn_d : null;
    const due = dueRows.map(({ recall_ref, warn_d, ...m }) => (recall_ref ? { ...m, recall_ref } : m));
    const soon = berlinDate(new Date(Date.now() + (dueDays || 30) * 86400000).toISOString()); // berechnete HU/SP und Nachzählung im selben Fenster
    // mehr als 10 fällige Prüfungen/Rückrufe: Gesamtzahl nur dann nachzählen (seltener Fall, keine Zusatzabfrage im Normalfall)
    let dueTotal = due.length < 10 ? due.length : (await env.DB.prepare(`SELECT COUNT(*) AS n FROM maintenance_rules WHERE vehicle_id=?
      AND ((next_due_date IS NOT NULL AND next_due_date <= ? AND NOT (kind='Rückruf' AND last_done_date IS NOT NULL)) OR (kind='Rückruf' AND last_done_date IS NULL))`).bind(c.vehicle_id, soon).first()).n;
    // letzter km-Stand und aktive Hinweise zum Fahrzeug (ohne Verfasser) in einer Abfrage – Vorgangsdetail bleibt im Abfragebudget
    const kmn = await env.DB.prepare(`SELECT o.km, o.measured_at,
        (SELECT json_group_array(json_object('text', n.text, 'for_driver', n.for_driver, 'created_at', n.created_at, 'valid_until', n.valid_until)) FROM
          (SELECT text, for_driver, created_at, valid_until FROM vehicle_notes WHERE vehicle_id=?1 AND environment=?2 AND archived_at IS NULL AND (valid_until IS NULL OR valid_until >= ?3) ORDER BY created_at DESC, rowid DESC LIMIT 20) n) AS notes,
        (SELECT json_group_array(json_object('case_id', w.case_id, 'case_no', w.case_no, 'status', w.status, 'workshop_site', w.workshop_site, 'item', w.item, 'item_kind', w.item_kind, 'supplier', w.supplier, 'warranty_until', w.warranty_until)) FROM
          (SELECT x.id AS case_id, x.case_no, x.status, x.workshop_site, g.item, g.item_kind, g.supplier, g.warranty_until, g.created_at FROM cases x JOIN
            (SELECT case_id, name AS item, 'part' AS item_kind, supplier, warranty_until, created_at FROM parts WHERE warranty_until >= ?5
             UNION ALL SELECT case_id, supplier AS item, 'external' AS item_kind, supplier, warranty_until, created_at FROM external_costs WHERE warranty_until >= ?5) g ON g.case_id=x.id
           WHERE x.vehicle_id=?1 AND x.environment=?2 AND x.id<>?4 AND x.created_at < ?6 AND (?7 IS NULL OR x.workshop_site=?7) ORDER BY g.warranty_until, g.created_at LIMIT ${WARR_CASE_MAX + 1}) w) AS warranties,
        -- Backlog 290 (Leasing-/Mietfahrzeug beschädigt): am Meldetag laufende Leasing-/Mietverträge – nur für die Leitung (?8), Verträge sind Geschäftsdaten;
        -- Backlog 414 (Full-Service-/Wartungsvertrag): laufende Wartungsverträge ebenso (Leistungsumfang prüfen, bevor die eigene Werkstatt auf eigene Kosten repariert)
        (SELECT json_group_array(json_object('kind', k.kind, 'partner', k.partner, 'contract_no', k.contract_no, 'end_date', k.end_date)) FROM
          (SELECT kind, partner, contract_no, end_date FROM vehicle_contracts WHERE ?8=1 AND vehicle_id=?1 AND kind IN ('leasing','miete','wartung') AND (ended_on IS NULL OR ended_on >= ?5)
            AND (start_date IS NULL OR start_date <= ?5) ORDER BY kind='wartung', end_date IS NULL, end_date LIMIT 5) k) AS leases,
        ${HUSP_ONE_SQL}
      FROM (SELECT 1) one LEFT JOIN (SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=?1 ORDER BY measured_at DESC LIMIT 1) o ON 1`).bind(c.vehicle_id, envName, berlinDate(), c.id, berlinDate(c.created_at), c.created_at, wsOnly, isManager(user) ? 1 : 0).first();
    const km = kmn && kmn.km !== null && kmn.km !== undefined ? { km: kmn.km, measured_at: kmn.measured_at } : null;
    // HU/SP ohne eigenen Eintrag mit berechenbarer Frist (z. B. SP aus HU + Erstzulassung) wie Übersicht/Werkstattplan/Fahrer-Startseite
    // (21.10.2026: überfällige berechnete SP fehlte im Vorgang – Werkstatt erfuhr nicht, dass sie beim selben Aufenthalt fällig ist). Nichts angelegt;
    // Eingaben aus derselben Abfrage (Abfragebudget Vorgangsdetail)
    {
      const x = huSpInputFromRow(kmn);
      if (x && x.v.active && !x.v.eval_excluded) {
        const h = huSpFor(x, berlinDate(), 0); let added = false;
        for (const kind of ['HU', 'SP']) {
          const y = kind === 'HU' ? h.hu : h.sp;
          if (!y || !y.due || y.status === 'nicht_sp_pflichtig' || y.due > soon) continue;
          if (x.rules.some((r) => r.kind === kind && r.next_due_date)) continue;
          due.push({ kind, next_due_date: y.due, computed: true }); dueTotal++; added = true;
        }
        if (added) due.sort((a, b) => (a.next_due_date == null) - (b.next_due_date == null) || String(a.next_due_date).localeCompare(String(b.next_due_date)));
      }
    }
    const vnotes = kmn && kmn.notes ? JSON.parse(kmn.notes).map((n) => ({ ...n, for_driver: !!n.for_driver })) : [];
    // Laufende Gewährleistung aus früheren Vorgängen dieses Fahrzeugs (am Meldedatum noch gültig) – Hinweis: Rückgriff beim Lieferanten prüfen
    const warranties = kmn && kmn.warranties ? JSON.parse(kmn.warranties) : [];
    // eine Zeile mehr gelesen: mehr als WARR_CASE_MAX laufende Gewährleistungen → nur die mit dem frühesten Ablauf, Hinweis in der App (nie still kappen)
    const warrantiesTruncated = warranties.length > WARR_CASE_MAX; if (warrantiesTruncated) warranties.length = WARR_CASE_MAX; // Werkstatt: nur eigene (im SQL, vor dem LIMIT)
    // Gleicher Prüfpunkt an diesem Fahrzeug in den 90 Tagen vor dieser Meldung bereits repariert und freigegeben (Hinweis auf mögliche Nacharbeit)
    let prevSame = [];
    if (c.check_item) {
      prevSame = (await env.DB.prepare(`SELECT id, case_no, closed_at, workshop_site FROM cases WHERE vehicle_id=? AND environment=? AND id<>? AND check_item=?
        AND status='fahrzeug_freigegeben' AND closed_at IS NOT NULL AND closed_at <= ? AND closed_at >= ? ${wsOnly ? 'AND workshop_site=?' : ''} ORDER BY closed_at DESC LIMIT 5`)
        .bind(...[c.vehicle_id, envName, c.id, c.check_item, c.created_at, new Date(Date.parse(c.created_at) - 90 * 86400000).toISOString(), ...(wsOnly ? [wsOnly] : [])]).all()).results;
    }
    detail.vehicle_info = { other_open_cases: others, other_open_total: othersTotal, inspections_due: due, inspections_due_total: dueTotal, inspections_due_days: dueDays, last_km: km || null, previous_same_item: prevSame, notes: vnotes, warranties, warranties_truncated: warrantiesTruncated, warranties_max: WARR_CASE_MAX };
    if (isManager(user)) detail.vehicle_info.lease_contracts = kmn && kmn.leases ? JSON.parse(kmn.leases) : [];
  }
  if (seesWork) {
    detail.work = (await env.DB.prepare(`SELECT w.*, u.display_name AS user_name FROM work_entries w JOIN users u ON u.id=w.user_id WHERE case_id=? ORDER BY work_date, created_at`).bind(c.id).all()).results;
    detail.parts = (await env.DB.prepare('SELECT * FROM parts WHERE case_id=? ORDER BY created_at').bind(c.id).all()).results;
  }
  if (canSeeCosts(user)) {
    detail.external_costs = (await env.DB.prepare('SELECT x.*, f.filename AS file_name, f.content_type AS file_type FROM external_costs x LEFT JOIN files f ON f.id=x.file_id WHERE x.case_id=? ORDER BY x.created_at').bind(c.id).all()).results;
    // Kosten aus den bereits geladenen Positionen; Stundensatz und Freigabegrenze in einer Abfrage (vorher 5 Zusatzabfragen)
    // + Stundensatz-Verlauf (Backlog 412) in derselben Abfrage
    const sets = new Map((await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN ('workshop_hourly_rate_net','repair_cost_limit_net')
      UNION ALL SELECT '__rp', json_group_array(json_object('u', valid_until, 'r', rate_net)) FROM hourly_rate_periods`).all()).results.map((r) => [r.key, r.value]));
    const rate = rateOf(sets.get('workshop_hourly_rate_net'));
    detail.costs = detail.work && detail.parts ? computeCosts(rate, detail.work, detail.parts, detail.external_costs, ratePeriods(sets.get('__rp'))) : await caseCosts(env, c.id);
    const limRaw = sets.has('repair_cost_limit_net') && sets.get('repair_cost_limit_net') !== '' ? Number(sets.get('repair_cost_limit_net')) : null;
    const lim = Number.isFinite(limRaw) && limRaw > 0 ? limRaw : null;
    const overSince = c.cost_over_limit_at && OPEN_STATUSES.includes(c.status) ? c.cost_over_limit_at : null;
    if (lim !== null || c.cost_approved_net !== null || overSince) detail.cost_limit = { limit_net: lim, approved_net: c.cost_approved_net ?? null, over_since: overSince };
  }
  // Backlog 378: worauf gewartet wird und wie oft der Liefertermin verschoben wurde (z. B. Teile falsch geliefert) – sonst nur im Verlauf
  if (c.status === 'wartet_teile') { const pw = partsWaitOf(events); if (pw) detail.parts_wait = pw; }
  return detail;
}

// Kostenbewertung (computeCosts unten): fehlende Sätze/Preise = unbewertet, niemals 0 €
// Kosten-Freigabegrenze (Einstellung `repair_cost_limit_net`, netto; leer/0 = aus – die App setzt keine eigene Grenze)
export async function costLimit(env) {
  const r = await env.DB.prepare(`SELECT value FROM settings WHERE key='repair_cost_limit_net'`).first();
  const n = r && r.value !== '' ? Number(r.value) : null;
  return Number.isFinite(n) && n > 0 ? n : null;
}
const COST_ACTIONS = ['record_work', 'add_part', 'add_external_cost'];
// „Gewährleistung bis“ (optional, nur laut Rechnung/Lieferant): Kalenderdatum, höchstens 10 Jahre voraus – keine Vorgabe der App
export function warrantyDate(v) {
  if (v === undefined || v === null || v === '') return null;
  const d = String(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !isCalendarDate(d)) throw bad('validation', 'Gewährleistung bis: bitte gültiges Datum (JJJJ-MM-TT) angeben.');
  if (d > addMonths(berlinDate(), 120)) throw bad('validation', 'Gewährleistung bis: höchstens 10 Jahre voraus.');
  return d;
}
// Nach einer Kostenbuchung: übersteigen die bewerteten Kosten (Ist + Schätzung; unbewertete Positionen zählen nicht) die Grenze bzw.
// den zuletzt freigegebenen Betrag, wird der Auftrag einmalig markiert, im Verlauf vermerkt und die Fuhrparkleitung informiert.
// Kein Statuswechsel, keine Sperre – die Werkstatt sieht „Kostenfreigabe ausstehend“ (ohne Beträge).
// Kontrolle nach Reparatur: jüngste überhaupt (latest) und ob sie nach der letzten Rückgabe zur Nacharbeit erfasst wurde (current).
// Nach „Nacharbeit“ wurde erneut am Fahrzeug gearbeitet – die alte Kontrolle belegt diesen Stand nicht mehr.
// Weiterer offener, gesperrter Vorgang am Fahrzeug oder am fest gekoppelten Gespann (Kopplung laut Stammliste) – Vorgangsnummer oder null
async function otherLockCaseNo(env, c) {
  const PK = PLATE_KEY_SQL;
  const r = await env.DB.prepare(`SELECT x.case_no FROM cases x WHERE x.environment=?1 AND x.id<>?2 AND x.safety_lock=1 AND x.status NOT IN ('fahrzeug_freigegeben','abgelehnt')
    AND (x.vehicle_id=?3 OR x.vehicle_id IN (SELECT o.id FROM vehicles o JOIN vehicles v ON v.id=?3 WHERE o.active=1 AND o.id<>v.id AND ${COUPLING_PREFERRED_SQL('v')} AND ${COUPLING_PREFERRED_SQL('o')} AND (
      (v.kind='anhaenger' AND o.kind='lkw' AND ${PK('o.trailer_plate')}<>'' AND ${PK('o.trailer_plate')}=${PK('v.plate')})
      OR (v.kind='lkw' AND o.kind='anhaenger' AND ${PK('v.trailer_plate')}<>'' AND ${PK('o.plate')}=${PK('v.trailer_plate')}))))
    ORDER BY x.created_at LIMIT 1`).bind(c.environment, c.id, c.vehicle_id).first();
  return r ? r.case_no : null;
}

async function repairInspection(env, caseId) {
  const r = await env.DB.prepare(`SELECT
      (SELECT MAX(created_at) FROM inspections WHERE case_id=?1 AND kind='nach_reparatur') AS latest,
      (SELECT MAX(created_at) FROM case_events WHERE case_id=?1 AND action='return_for_rework') AS rework`).bind(caseId).first();
  return { latest: r.latest || null, current: !!r.latest && (!r.rework || r.latest > r.rework) };
}
// Markierung „Kostenfreigabe ausstehend“ nach Änderung der Einstellungen neu bewerten (19.10.2026: Grenze entfernt/erhöht bzw. Stundensatz
// gesenkt – die Freigabe blieb blockiert): liegen die bewerteten Kosten nicht mehr über max(Grenze, freigegebener Betrag) bzw. ist die
// Grenze aus, wird die Markierung aufgehoben und im Verlauf vermerkt. Nur offene Vorgänge; ohne erteilte Freigabe (kein Betrag erfunden).
export async function revalidateCostMarks(env, actorId, caseIds = null) {
  // Sammelweg (20.10.2026): vorher je markiertem Vorgang eine Kostenabfrage + ein Stapel – 30 Markierungen = 96 D1-Abfragen beim Speichern
  // der Einstellungen (Budget 50). Jetzt: eine Abfrage (Vorgänge + Positionen), ein Stapel (Ereignisse + Freigabe mit Stand-Prüfung).
  const limit = await costLimit(env);
  const r = await env.DB.prepare(`WITH m AS (SELECT id, environment, status, cost_over_limit_at, cost_approved_net FROM cases WHERE cost_over_limit_at IS NOT NULL
      AND status NOT IN ('fahrzeug_freigegeben','abgelehnt')${caseIds ? ' AND id IN (SELECT value FROM json_each(?1))' : ''} LIMIT 200)
    SELECT (SELECT value FROM settings WHERE key='workshop_hourly_rate_net') AS rate, ${RATE_PERIODS_SQL},
      (SELECT json_group_array(json_object('id', id, 'environment', environment, 'status', status, 'at', cost_over_limit_at, 'approved', cost_approved_net)) FROM m) AS c,
      (SELECT json_group_array(json_object('case_id', x.case_id, 'hours', x.hours, 'work_date', x.work_date)) FROM work_entries x WHERE x.case_id IN (SELECT id FROM m)) AS w,
      (SELECT json_group_array(json_object('case_id', x.case_id, 'quantity', x.quantity, 'unit_price_net', x.unit_price_net, 'valuation', x.valuation)) FROM parts x WHERE x.case_id IN (SELECT id FROM m)) AS p,
      (SELECT json_group_array(json_object('case_id', x.case_id, 'amount_net', x.amount_net, 'valuation', x.valuation, 'covers_work_and_parts', x.covers_work_and_parts)) FROM external_costs x WHERE x.case_id IN (SELECT id FROM m)) AS e`)
    .bind(...(caseIds ? [JSON.stringify(caseIds)] : [])).first();
  const rows = JSON.parse(r.c || '[]');
  if (!rows.length) return [];
  const rate = rateOf(r.rate); const periods = ratePeriods(r.rp);
  const by = (txt) => { const m = new Map(); for (const x of JSON.parse(txt || '[]')) { if (!m.has(x.case_id)) m.set(x.case_id, []); m.get(x.case_id).push(x); } return m; };
  const work = by(r.w); const parts = by(r.p); const ext = by(r.e);
  const clear = [];
  for (const c of rows) {
    const k = computeCosts(rate, work.get(c.id) || [], parts.get(c.id) || [], ext.get(c.id) || [], periods);
    const total = round2(k.actual_net + k.estimate_net);
    if (limit !== null && total > Math.max(limit, c.approved || 0)) continue;
    // Fremdleistung „ersetzt eigene Arbeit/Teile“ noch ohne Betrag: die eigenen Kosten fallen heraus, der Ersatz ist aber unbewertet –
    // die Markierung bleibt, bis ein Betrag vorliegt (23.10.2026: Rechnung folgt → Kostenfreigabe still aufgehoben, Freigabe ohne „Kosten freigeben“)
    if (k.external_replaces_own && (ext.get(c.id) || []).some((e) => e.covers_work_and_parts && (e.amount_net === null || e.valuation === 'unvalued'))) continue;
    clear.push({ id: c.id, at: c.at, ev: uuid(), env: c.environment, status: c.status, payload: JSON.stringify({ total_net: total, limit_net: limit, approved_net: c.approved ?? null }) });
  }
  if (!clear.length) return [];
  const now = nowIso();
  const J = JSON.stringify(clear);
  // nur Vorgänge, deren Markierung noch dieselbe ist (gleichzeitige Änderung → unverändert); Ereignis und Freigabe im selben Stapel
  const MATCH = `SELECT json_extract(j.value, '$.id') AS id, json_extract(j.value, '$.at') AS at FROM json_each(?1) j`;
  const res = await env.DB.batch([
    env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,note,payload,created_at)
      SELECT json_extract(j.value, '$.ev'), c.id, c.environment, ?2, NULL, 'cost_limit_cleared', c.status, c.status, NULL, json_extract(j.value, '$.payload'), ?3
      FROM json_each(?1) j JOIN cases c ON c.id = json_extract(j.value, '$.id') AND c.cost_over_limit_at = json_extract(j.value, '$.at')`).bind(J, actorId, now),
    env.DB.prepare(`UPDATE cases SET cost_over_limit_at=NULL, updated_at=?2, version=version+1
      WHERE id IN (SELECT id FROM (${MATCH}) WHERE id = cases.id AND at = cases.cost_over_limit_at) RETURNING id`).bind(J, now),
  ]);
  return (res[1].results || []).map((x) => x.id);
}
async function checkCostLimit(env, ctx, user, envName, c) {
  if (c.cost_over_limit_at) return false;
  const limit = await costLimit(env);
  if (limit === null) return false;
  const k = await caseCosts(env, c.id);
  const total = round2(k.actual_net + k.estimate_net);
  const threshold = Math.max(limit, c.cost_approved_net || 0);
  if (total <= threshold) return false;
  const now = nowIso();
  const payload = { total_net: total, limit_net: limit, approved_net: c.cost_approved_net ?? null, unvalued_items: k.unvalued_items };
  const r = await env.DB.batch([
    // Version erhöhen (18.10.2026): eine gleichzeitig auf dem Stand vor der Markierung gelesene technische Freigabe scheitert dann am
    // Versions-Guard; ein schon freigegebener Vorgang wird nicht mehr markiert (kein Hinweis „Kostenfreigabe nötig“ zu einem abgeschlossenen)
    env.DB.prepare(`UPDATE cases SET cost_over_limit_at=?, updated_at=?, version=version+1 WHERE id=? AND cost_over_limit_at IS NULL
      AND status NOT IN ('fahrzeug_freigegeben','abgelehnt')`).bind(now, now, c.id),
    env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,note,payload,created_at)
      SELECT ?,?,?,?,?,'cost_limit_exceeded',?,?,NULL,?,? WHERE (SELECT cost_over_limit_at FROM cases WHERE id=?)=?`)
      .bind(uuid(), c.id, envName, user.id, user.role, c.status, c.status, JSON.stringify(payload), now, c.id, now),
  ]);
  if (!r[0].meta || !r[0].meta.changes) return false; // parallel bereits markiert
  await notifyCaseEvent(env, ctx, { ...c, cost_over_limit_at: now }, 'cost_limit', { actor: user, payload });
  return true;
}

// Reine Bewertungslogik (gemeinsam für Vorgang und Fahrzeug): unbewertet ≠ 0 €, Schätzungen getrennt,
// Fremdleistung „ersetzt eigene Stunden/Teile“ verhindert Doppelzählung
// periods (Backlog 412): frühere Stundensätze mit Gültigkeit (ratePeriods); Arbeitszeit dann je Arbeitsdatum mit dem damals gültigen Satz
export function computeCosts(rate, work, parts, ext, periods = null) {
  const hours = work.reduce((s, w) => s + w.hours, 0);
  const coveredByExternal = ext.some((e) => e.covers_work_and_parts);
  // valuedItems: Anzahl belegter Positionen – ohne belegte Position ist „Ist 0 €“ keine Aussage (Anzeige „–“)
  let valued = 0; let valuedItems = 0; let estimate = 0; const unvalued = [];
  if (!coveredByExternal) {
    if (hours > 0) {
      // je Position auf Cent (18.10.2026: Bericht/Akte wichen um Cent ab); mit Satz-Verlauf je Satz-Abschnitt (valueWork)
      const vw = valueWork(rate, periods, work);
      if (vw.valued) { valued += vw.net; valuedItems++; }
      if (vw.unvalued_hours > 0) unvalued.push({ type: 'arbeitszeit', hours: vw.unvalued_hours });
    }
    for (const p of parts) {
      if (p.unit_price_net === null || p.valuation === 'unvalued') unvalued.push({ type: 'teil', quantity: p.quantity });
      else if (p.valuation === 'estimate') estimate += round2(p.quantity * p.unit_price_net);
      else { valued += round2(p.quantity * p.unit_price_net); valuedItems++; }
    }
  }
  for (const e of ext) {
    if (e.amount_net === null || e.valuation === 'unvalued') unvalued.push({ type: 'fremdleistung' });
    else if (e.valuation === 'estimate') estimate += round2(e.amount_net);
    else { valued += round2(e.amount_net); valuedItems++; }
  }
  return {
    hours, hourly_rate_net: rate, ...(periods && periods.length && work.length ? { hourly_rate_periods: true } : {}), actual_net: round2(valued), valued_items: valuedItems, estimate_net: round2(estimate),
    unvalued_items: unvalued.length, unvalued, complete: unvalued.length === 0,
    external_replaces_own: coveredByExternal,
  };
}

// Eine Abfrage statt vier (Stundensatz + Stunden + Teile + Fremdleistungen); Ergebnis wie computeCosts über die Einzelabfragen
export async function caseCosts(env, caseId) {
  const r = await env.DB.prepare(`SELECT (SELECT value FROM settings WHERE key='workshop_hourly_rate_net') AS rate, ${RATE_PERIODS_SQL},
    (SELECT json_group_array(json_object('hours', hours, 'work_date', work_date)) FROM work_entries WHERE case_id=?1) AS w,
    (SELECT json_group_array(json_object('quantity', quantity, 'unit_price_net', unit_price_net, 'valuation', valuation)) FROM parts WHERE case_id=?1) AS p,
    (SELECT json_group_array(json_object('amount_net', amount_net, 'valuation', valuation, 'covers_work_and_parts', covers_work_and_parts)) FROM external_costs WHERE case_id=?1) AS e`).bind(caseId).first();
  const rate = rateOf(r.rate);
  return computeCosts(rate, JSON.parse(r.w || '[]'), JSON.parse(r.p || '[]'), JSON.parse(r.e || '[]'), ratePeriods(r.rp));
}

// Summe über alle Vorgänge eines Fahrzeugs mit 4 Abfragen (statt 4 je Vorgang)
export async function vehicleCosts(env, envName, vehicleId) {
  // Eine Sammelabfrage (Stundensatz + Stunden/Teile/Fremdleistungen aller Vorgänge des Fahrzeugs) statt vier
  const J = 'JOIN cases c ON c.id=x.case_id WHERE c.environment=?1 AND c.vehicle_id=?2';
  const r = await env.DB.prepare(`SELECT (SELECT value FROM settings WHERE key='workshop_hourly_rate_net') AS rate, ${RATE_PERIODS_SQL},
    (SELECT json_group_array(json_object('case_id', x.case_id, 'hours', x.hours, 'work_date', x.work_date)) FROM work_entries x ${J}) AS w,
    (SELECT json_group_array(json_object('case_id', x.case_id, 'quantity', x.quantity, 'unit_price_net', x.unit_price_net, 'valuation', x.valuation)) FROM parts x ${J}) AS p,
    (SELECT json_group_array(json_object('case_id', x.case_id, 'amount_net', x.amount_net, 'valuation', x.valuation, 'covers_work_and_parts', x.covers_work_and_parts)) FROM external_costs x ${J}) AS e,
    (SELECT json_group_array(json_object('case_id', g.case_id, 'case_no', g.case_no, 'item', g.item, 'item_kind', g.item_kind, 'supplier', g.supplier, 'warranty_until', g.warranty_until)) FROM
      (SELECT x.case_id, c.case_no, x.name AS item, 'part' AS item_kind, x.supplier, x.warranty_until FROM parts x ${J} AND x.warranty_until >= ?3
       UNION ALL SELECT x.case_id, c.case_no, x.supplier AS item, 'external' AS item_kind, x.supplier, x.warranty_until FROM external_costs x ${J} AND x.warranty_until >= ?3
       ORDER BY 6, 2 LIMIT ${WARR_VEH_MAX + 1}) g) AS g`)
    .bind(envName, vehicleId, berlinDate()).first();
  const rate = rateOf(r.rate); const periods = ratePeriods(r.rp);
  const by = (txt) => {
    const m = new Map();
    for (const x of JSON.parse(txt || '[]')) { if (!m.has(x.case_id)) m.set(x.case_id, []); m.get(x.case_id).push(x); }
    return m;
  };
  const work = by(r.w); const parts = by(r.p); const ext = by(r.e);
  let actual = 0; let valuedItems = 0; let estimate = 0; let unvalued = 0;
  for (const id of new Set([...work.keys(), ...parts.keys(), ...ext.keys()])) {
    const k = computeCosts(rate, work.get(id) || [], parts.get(id) || [], ext.get(id) || [], periods);
    actual += k.actual_net; valuedItems += k.valued_items; estimate += k.estimate_net; unvalued += k.unvalued_items;
  }
  // laufende Gewährleistungen (heute noch gültig) aus Teilen/Fremdleistungen der Vorgänge – getrennt von der Kostensumme
  const warranties = JSON.parse(r.g || '[]');
  const warrantiesTruncated = warranties.length > WARR_VEH_MAX; if (warrantiesTruncated) warranties.length = WARR_VEH_MAX;
  return { warranties_truncated: warrantiesTruncated, actual_net: round2(actual), valued_items: valuedItems, estimate_net: round2(estimate), unvalued_items: unvalued, complete: unvalued === 0, warranties };
}
const round2 = roundCents; // kaufmännisch, gegen Gleitkommafehler abgesichert (18.10.2026)

// Werkstatttermin: JJJJ-MM-TT, gültiges Datum, nicht mehr als 1 Jahr in der Vergangenheit/2 Jahre in der Zukunft
export function planDate(v) {
  const d = String(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')) || new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) !== d) throw bad('validation', 'Termin im Format JJJJ-MM-TT.');
  const today = berlinDate();
  const lo = new Date(Date.parse(today) - 366 * 86400000).toISOString().slice(0, 10); const hi = new Date(Date.parse(today) + 731 * 86400000).toISOString().slice(0, 10);
  if (d < lo || d > hi) throw bad('validation', 'Termin liegt außerhalb des zulässigen Zeitraums.');
  return d;
}

// Gleicher Kalendertag im Vorjahr (29.02. → 28.02.) – „höchstens ein Jahr zurück“ (Abschleppdatum, Migration 0079)
export function oneYearBack(day) {
  const y = Number(day.slice(0, 4)) - 1; const md = day.slice(5);
  return md === '02-29' ? `${y}-02-28` : `${y}-${md}`;
}
// Gleicher Kalendertag im Folgejahr (29.02. → 28.02.) – „höchstens ein Jahr“ (vorher heute + 366 Tage: ein Tag zu viel, 21.10.2026)
export function oneYearAhead(day) {
  const y = Number(day.slice(0, 4)) + 1; const md = day.slice(5);
  return md === '02-29' ? `${y}-02-28` : `${y}-${md}`;
}

// Schadenzeitpunkt laut Meldung (Backlog 285, Migration 0084): leer → null; „JJJJ-MM-TT“ = Tag ohne Uhrzeit (Berliner Kalender);
// „JJJJ-MM-TTTHH:MM“ = deutsche Uhrzeit (wie die Tatzeit bei Bußgeldern) bzw. ISO mit Zeitzone → UTC-ISO. Nicht nach `latest`
// (Meldezeit; 10 Min. Toleranz für Geräteuhren), höchstens ein Jahr zurück. Nie geschätzt oder aus der Meldezeit abgeleitet.
export function occurredAt(v, latest = nowIso()) {
  const s = str(v, { max: 40, field: 'Schadenzeitpunkt' });
  if (!s) return null;
  const lim = berlinDate(latest);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    if (!isCalendarDate(s)) throw bad('validation', 'Schadenzeitpunkt: ungültiges Datum.');
    if (s > lim) throw bad('validation', 'Schadenzeitpunkt liegt in der Zukunft.');
    if (s < oneYearBack(lim)) throw bad('validation', 'Schadenzeitpunkt liegt mehr als ein Jahr zurück.');
    return s;
  }
  const iso = berlinLocalToIso(s);
  const ms = iso ? Date.parse(iso) : NaN;
  if (!iso || !/^\d{4}-\d{2}-\d{2}T/.test(s) || !Number.isFinite(ms)) throw bad('validation', 'Schadenzeitpunkt: ungültiges Datum.');
  if (ms > Date.parse(latest) + 10 * 60000) throw bad('validation', 'Schadenzeitpunkt liegt in der Zukunft.');
  if (berlinDate(new Date(ms).toISOString()) < oneYearBack(lim)) throw bad('validation', 'Schadenzeitpunkt liegt mehr als ein Jahr zurück.');
  return new Date(ms).toISOString();
}

// Fahrer laut Fahrzeugzuordnung bzw. Abfahrtskontrolle (Fahrerrolle) zum Schadenzeitpunkt – nur Hinweis für die Leitung, keine Zuordnung.
// Tag ohne Uhrzeit: alle Zuordnungen, die an diesem Berliner Tag galten. Anhänger: auch über die fest gekoppelte Zugmaschine (wie Bußgelder).
export async function driversAtOccurrence(env, envName, c) {
  if (!c.occurred_at) return null;
  const dayOnly = c.occurred_at.length === 10;
  const day = dayOnly ? c.occurred_at : berlinDate(c.occurred_at);
  const from = dayOnly ? berlinDayStartIso(day) : c.occurred_at;
  const next = new Date(Date.parse(day + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
  const to = dayOnly ? berlinDayStartIso(next) : c.occurred_at;
  const rows = (await env.DB.prepare(`SELECT 'zuordnung' AS basis, d.user_id, u.display_name, d.valid_from AS at, d.valid_to AS until, vv.plate, d.vehicle_id FROM driver_vehicles d
      JOIN users u ON u.id=d.user_id JOIN vehicles vv ON vv.id=d.vehicle_id
      WHERE d.vehicle_id IN (${fineVehiclesSql('?1')}) AND d.environment=?2 AND d.valid_from <= ?4 AND (d.valid_to IS NULL OR d.valid_to > ?3)
    UNION ALL SELECT 'kontrolle' AS basis, i.performed_by, u.display_name, i.created_at, NULL, vv.plate, i.vehicle_id FROM inspections i
      JOIN users u ON u.id=i.performed_by JOIN vehicles vv ON vv.id=i.vehicle_id
      WHERE i.vehicle_id IN (${fineVehiclesSql('?1')}) AND i.environment=?2 AND u.environment=?2 AND i.kind='abfahrt' AND u.role='driver' AND i.created_at >= ?5 AND i.created_at < ?6
    ORDER BY at LIMIT 21`).bind(c.vehicle_id, envName, from, dayOnly ? to : from, berlinDayStartIso(day), berlinDayStartIso(next)).all()).results;
  const out = [];
  for (const r of rows.slice(0, 20)) {
    if (out.some((o) => o.user_id === r.user_id && o.basis === r.basis)) continue;
    out.push({ user_id: r.user_id, display_name: r.display_name, basis: r.basis, at: r.at, until: r.until || null, ...(r.vehicle_id !== c.vehicle_id ? { via_plate: r.plate } : {}) });
  }
  return { day_only: dayOnly, drivers: out, truncated: rows.length > 20 };
}

// Wiedervorlage: Kalenderdatum ab heute (Berlin), höchstens 1 Jahr voraus
export function followupDate(v) {
  const d = String(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')) || new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) !== d) throw bad('validation', 'Wiedervorlage im Format JJJJ-MM-TT.');
  const today = berlinDate();
  if (d < today) throw bad('followup_past', 'Wiedervorlage liegt in der Vergangenheit.');
  if (d > oneYearAhead(today)) throw bad('validation', 'Wiedervorlage liegt mehr als ein Jahr in der Zukunft.');
  return d;
}

// Liefertermin Teile: gültiges Datum, nicht in der Vergangenheit (Berliner Kalender), höchstens 1 Jahr voraus
export function partsDate(v) {
  const d = String(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')) || new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) !== d) throw bad('validation', 'Liefertermin im Format JJJJ-MM-TT.');
  const today = berlinDate();
  if (d < today) throw bad('parts_eta_past', 'Liefertermin liegt in der Vergangenheit.');
  if (d > oneYearAhead(today)) throw bad('validation', 'Liefertermin liegt mehr als ein Jahr in der Zukunft.');
  return d;
}

export function allowedActions(user, c, access) {
  const a = [];
  if (!access || access === 'read' || access === 'preview') {
    if (access && ['owner', 'fleet', 'workshop', 'dispatch', 'driver'].includes(user.role)) a.push('comment');
    return a;
  }
  const mgr = isManager(user);
  const ws = user.role === 'workshop' && c.workshop_site === user.workshop_site;
  a.push('comment', 'upload');
  if (mgr) {
    // Sperre nur an offenen Vorgängen – an abgeschlossenen/abgelehnten wirkte sie nirgends (Fahrzeugliste, Disposition, Agent zählen nur offene),
    // obwohl dringende Pushs „gesperrt“ verschickt wurden (17.10.2026). Neue Sperre: neuen Vorgang melden.
    if (OPEN_STATUSES.includes(c.status) && !c.safety_lock) a.push('set_safety_lock'); // schon gesperrt: Server weist ab (20.10.2026: Knopf ohne Wirkung)
    if (c.safety_lock) a.push('lift_safety_lock');
    if (OPEN_STATUSES.includes(c.status)) a.push('change_priority', 'set_followup');
  }
  // Standort/Abschleppung (Migration 0079, Teilagent „Fahrzeug wird abgeschleppt“): Leitung an offenen Vorgängen, Werkstatt solange sie
  // das Fahrzeug holt bzw. repariert (nicht mehr in der Abschlusskontrolle); Disposition/Lesende sehen den Eintrag
  if (OPEN_STATUSES.includes(c.status) && (mgr || (ws && c.status !== 'abschlusskontrolle'))) a.push('set_vehicle_location');
  // Schadenzeitpunkt (Backlog 285): Leitung trägt ihn nach bzw. berichtigt ihn – auch nach dem Abschluss (Versicherer/Gutachter fragen später nach)
  if (mgr && c.origin === 'meldung' && c.status !== 'abgelehnt') a.push('set_occurred_at');
  switch (c.status) {
    case 'gemeldet':
      if (mgr) { if (!c.fleet_received_at) a.push('receive'); a.push('approve_repair', 'reject'); }
      // Meldung am falschen Fahrzeug (Backlog 254): solange noch keiner Werkstatt freigegeben und nicht aus Kontrolle/Prüftermin/Reifen entstanden
      if (mgr && (c.origin === 'meldung' || (c.origin === 'kontrolle' && c.check_item)) && !c.workshop_site && !c.maintenance_rule_id && !c.tire_order && !c.parent_case_id && !c.duplicate_of) a.push('correct_vehicle');
      break;
    case 'werkstatt_freigegeben':
      if (ws || mgr) { if (!c.workshop_ack_at) a.push('acknowledge'); a.push('start_repair'); }
      if ((ws || mgr) && c.workshop_ack_at) a.push('set_planned_date');
      if (mgr) a.push('reassign_workshop');
      break;
    case 'in_reparatur':
      if (ws || mgr) a.push('wait_parts', 'inspection', 'request_quality_check', 'set_planned_date');
      break;
    case 'wartet_teile':
      if (ws || mgr) a.push('resume_repair', 'set_planned_date', 'set_parts_eta');
      break;
    case 'abschlusskontrolle':
      if (mgr) a.push('return_for_rework', 'technical_release');
      break;
  }
  if (WORK_STATUSES.includes(c.status) && (ws || mgr)) a.push('record_work', 'add_part', 'add_open_item', 'resolve_open_item');
  // Nicht sicherheitsrelevante Restarbeiten nach der Freigabe noch erledigen (sonst blieben sie und der Agentenbefund „Restarbeiten planen“ für immer offen)
  if (c.status === 'fahrzeug_freigegeben' && (ws || mgr)) a.push('resolve_open_item');
  if (WORK_STATUSES.includes(c.status) && mgr) a.push('add_external_cost');
  // Werkstattauftrag ohne Reparatur beenden (Totalschaden, Verkauf, Reparatur unwirtschaftlich – 23.10.2026): vorher blieb nur
  // Scheinreparatur mit Kontrolle und Freigabe, sonst ließ sich das Fahrzeug nie außer Betrieb nehmen
  if (WORK_STATUSES.includes(c.status) && mgr) a.push('withdraw_order');
  if (mgr && c.cost_over_limit_at && OPEN_STATUSES.includes(c.status)) a.push('approve_costs');
  return a;
}

// ---------- Anlegen ----------

// Werkstattauftrag aus einem Prüftermin bzw. einer Wartungsregel (Inhaber/Fuhrparkleitung): legt eine Meldung mit Herkunft „wartung“ an
// und gibt sie direkt an die gewählte Werkstatt frei (normaler Befehl approve_repair, inkl. Hinweis an die Werkstatt). Geplanter Prüftermin
// (ab heute) wird als Werkstatttermin übernommen. Je Regel und Umgebung höchstens ein offener Auftrag. Erledigt wird die Prüfung weiterhin
// in der Fahrzeugakte mit Nachweis – der Auftrag ersetzt keinen Prüfnachweis.
// Werkstatt-Code für die Sammelabfrage (Prüfung auf Pflicht/Länge erfolgt danach wie bisher mit str())
const wsParam = (body) => String(body.workshop_site ?? '').trim().slice(0, 20);
export async function orderFromMaintenance(env, ctx, user, envName, ruleId, body = {}) {
  if (!isManager(user)) throw forbidden();
  // Prüftermin, offener Auftrag und Werkstatt in einer Abfrage (Abfragebudget je Aufruf); Prüfreihenfolge der Fehler unverändert
  const rule = await env.DB.prepare(`SELECT m.id, m.kind, m.vehicle_id, m.planned_date, m.last_done_date, m.evidence, v.active, v.plate,
      (SELECT json_object('id', c.id, 'case_no', c.case_no, 'request_key', c.request_key, 'reporter_id', c.reporter_id) FROM cases c WHERE c.maintenance_rule_id=m.id AND c.environment=?2 AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt') LIMIT 1) AS open_case,
      (SELECT code FROM workshops WHERE code=?3 AND active=1) AS ws_code
    FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id WHERE m.id=?1`).bind(ruleId, envName, wsParam(body)).first();
  if (!rule) throw notFound('Prüftermin nicht gefunden.');
  if (!rule.active) throw bad('validation', 'Fahrzeug ist außer Betrieb.');
  const open = rule.open_case ? JSON.parse(rule.open_case) : null;
  // Wiederholung desselben Absendens (Doppelklick/Netzabbruch) → derselbe Auftrag statt 409 (wie Winterreifen; 19.10.2026)
  if (open && body.request_key && open.request_key === String(body.request_key) && open.reporter_id === user.id) return { id: open.id, case_no: open.case_no, duplicate: true };
  if (rule.kind === 'Rückruf' && rule.last_done_date) throw conflict('already_done', 'Dieser Rückruf ist bereits durchgeführt.');
  if (open) throw conflict('order_exists', `Für diese Prüfung gibt es bereits den offenen Auftrag ${open.case_no}.`, { case_id: open.id, case_no: open.case_no });
  const site = str(body.workshop_site, { required: true, max: 20, field: 'Werkstatt' });
  if (!rule.ws_code) throw bad('validation', 'Unbekannte Werkstatt.');
  const priority = oneOf(body.priority || 'niedrig', PRIORITIES, 'Priorität');
  const note = str(body.note, { max: 1000, field: 'Bemerkung' });
  // Rückruf: Referenz laut Schreiben in den Auftrag, damit die Werkstatt die richtige Aktion durchführt
  const description = rule.kind === 'Rückruf' ? `Herstellerrückruf durchführen (Referenz: ${String(rule.evidence || '')})${note ? ' – ' + note : ''}` : `Prüfung/Wartung ${rule.kind} durchführen${note ? ' – ' + note : ''}`;
  const requestKey = str(body.request_key, { max: 64, field: 'request_key' }) || uuid();
  // Verknüpfung mit dem Prüftermin im selben atomaren Batch wie die Meldung (vorher eigenes UPDATE danach)
  const [created] = await createCases(env, ctx, user, envName, [{ vehicle_id: rule.vehicle_id, description, priority, driveability: 'fahrbereit', workshop_site: site, request_key: requestKey }],
    { origin: 'wartung', maintenance_rule_id: rule.id, site_checked: true });
  const planned = rule.planned_date && rule.planned_date >= berlinDate() ? rule.planned_date : null;
  const r = await runCommand(env, ctx, user, envName, created.id, { action: 'approve_repair', command_id: ('mo-' + requestKey).slice(0, 64), expected_version: 1,
    note: `Auftrag aus Prüftermin ${rule.kind}${note ? ': ' + note : ''}`, payload: { workshop_site: site, ...(planned ? { planned_date: planned } : {}) } });
  return { id: created.id, case_no: created.case_no, status: r.status, planned_date: planned };
}


// Werkstattauftrag zur Mängelbeseitigung aus einer gespeicherten Prüfung (Ergebnis erhebliche/gefährliche Mängel bzw. verkehrsunsicher).
// Wie der Auftrag aus Prüftermin: Meldung mit Herkunft „wartung“, direkt an die gewählte Werkstatt freigegeben. Je Durchführung und Umgebung
// höchstens ein offener Auftrag. Fahrbereitschaft: bei „verkehrsunsicher“ ohne Angabe „nicht fahrbereit“ (StVZO Anl. VIIIa: Fahrzeug ist aus dem
// Verkehr zu ziehen), sonst wie angegeben bzw. „unbekannt“ – es wird keine Einschätzung erfunden. Die Wiedervorführung/Nachprüfung ersetzt der Auftrag nicht.
const ROLE_DE = { owner: 'Inhaber', fleet: 'Fuhrparkleitung', workshop: 'Werkstatt', dispatch: 'Disposition' };
const DEFECT_RES = { erhebliche_maengel: 'erhebliche Mängel', gefaehrliche_maengel: 'gefährliche Mängel', verkehrsunsicher: 'verkehrsunsicher' };
export async function orderFromInspectionDefect(env, ctx, user, envName, eventId, body = {}) {
  if (!isManager(user)) throw forbidden();
  const ev = await env.DB.prepare(`SELECT e.id, e.kind, e.done_date, e.result, e.evidence, e.vehicle_id, v.active, v.plate,
      (SELECT json_object('id', c.id, 'case_no', c.case_no, 'request_key', c.request_key, 'reporter_id', c.reporter_id) FROM cases c WHERE c.maintenance_event_id=e.id AND c.environment=?2 AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt') LIMIT 1) AS open_case,
      (SELECT code FROM workshops WHERE code=?3 AND active=1) AS ws_code
    FROM maintenance_events e JOIN vehicles v ON v.id=e.vehicle_id WHERE e.id=?1`).bind(eventId, envName, wsParam(body)).first();
  if (!ev) throw notFound('Prüfung nicht gefunden.');
  if (!DEFECT_RES[ev.result]) throw bad('validation', 'Die Prüfung hat kein Ergebnis mit erheblichen/gefährlichen Mängeln.');
  if (!ev.active) throw bad('validation', 'Fahrzeug ist außer Betrieb.');
  const open = ev.open_case ? JSON.parse(ev.open_case) : null;
  if (open && body.request_key && open.request_key === String(body.request_key) && open.reporter_id === user.id) return { id: open.id, case_no: open.case_no, duplicate: true };
  if (open) throw conflict('order_exists', `Für diese Prüfung gibt es bereits den offenen Auftrag ${open.case_no}.`, { case_id: open.id, case_no: open.case_no });
  const site = str(body.workshop_site, { required: true, max: 20, field: 'Werkstatt' });
  if (!ev.ws_code) throw bad('validation', 'Unbekannte Werkstatt.');
  const priority = oneOf(body.priority || (ev.result === 'erhebliche_maengel' ? 'mittel' : 'kritisch'), PRIORITIES, 'Priorität');
  const driveability = oneOf(body.driveability || (ev.result === 'verkehrsunsicher' ? 'nicht_fahrbereit' : 'unbekannt'), DRIVEABILITY, 'Fahrbereitschaft');
  const note = str(body.note, { max: 1000, field: 'Bemerkung' });
  const date = ev.done_date.split('-').reverse().join('.');
  const description = `Mängel aus ${ev.kind} vom ${date} beseitigen (Ergebnis: ${DEFECT_RES[ev.result]}; Nachweis: ${ev.evidence})${note ? ' – ' + note : ''}`;
  const requestKey = str(body.request_key, { max: 64, field: 'request_key' }) || uuid();
  const [created] = await createCases(env, ctx, user, envName, [{ vehicle_id: ev.vehicle_id, description, priority, driveability, workshop_site: site, request_key: requestKey }],
    { origin: 'wartung', maintenance_event_id: ev.id, site_checked: true });
  const r = await runCommand(env, ctx, user, envName, created.id, { action: 'approve_repair', command_id: ('md-' + requestKey).slice(0, 64), expected_version: 1,
    note: `Mängelbeseitigung aus ${ev.kind} vom ${date}${note ? ': ' + note : ''}`, payload: { workshop_site: site, priority } });
  return { id: created.id, case_no: created.case_no, status: r.status, priority, driveability };
}

// Werkstattauftrag „Umrüstung Winterreifen“ (Inhaber/Fuhrparkleitung) aus der Winterlage eines Lkw laut Reifenerfassung:
// „nicht erfüllt“ → Umrüstung der Positionen ohne Alpine-Symbol; „nicht vollständig erfasst“ → Winterkennzeichnung prüfen und erfassen.
// Wie Auftrag aus Prüftermin: Meldung mit Herkunft „wartung“, direkt an die gewählte Werkstatt freigegeben, fahrbereit (Information,
// keine Sperre – situative Pflicht StVO § 2 Abs. 3a). Je Fahrzeug und Umgebung höchstens ein offener Auftrag. Erledigt ist die Lage erst,
// wenn die Werkstatt die Reifen mit Winterkennzeichnung erfasst – der Auftrag ersetzt die Erfassung nicht.
export async function orderWinterTires(env, ctx, user, envName, vehicleId, body = {}) {
  if (!isManager(user)) throw forbidden();
  const v = await env.DB.prepare(`SELECT v.id, v.plate, v.kind, v.active,
      (SELECT json_object('id', c.id, 'case_no', c.case_no, 'request_key', c.request_key, 'reporter_id', c.reporter_id) FROM cases c WHERE c.vehicle_id=v.id AND c.tire_order='winter' AND c.environment=?2 AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt') LIMIT 1) AS open_case,
      (SELECT code FROM workshops WHERE code=?3 AND active=1) AS ws_code
    FROM vehicles v WHERE v.id=?1`).bind(vehicleId, envName, wsParam(body)).first();
  if (!v) throw notFound();
  if (!v.active) throw bad('validation', 'Fahrzeug ist außer Betrieb.');
  if (v.kind === 'anhaenger') throw bad('validation', 'Anhänger sind von der Winterreifenpflicht nicht betroffen.');
  const open = v.open_case ? JSON.parse(v.open_case) : null;
  // Wiederholung desselben Absendens (Doppelklick/Netzabbruch) → derselbe Auftrag statt Fehler
  if (open && body.request_key && open.request_key === String(body.request_key) && open.reporter_id === user.id) return { id: open.id, case_no: open.case_no, duplicate: true };
  if (open) throw conflict('order_exists', `Für die Winterreifen dieses Fahrzeugs gibt es bereits den offenen Auftrag ${open.case_no}.`, { case_id: open.id, case_no: open.case_no });
  const ev = (await env.DB.prepare('SELECT position, event_type, winter_mark FROM tire_events WHERE environment=? AND vehicle_id=? ORDER BY created_at DESC').bind(envName, vehicleId).all()).results;
  const w = winterStatus(v.kind, winterMarks(ev));
  if (w.status === 'erfuellt') throw conflict('winter_ok', 'Winterreifen laut Erfassung bereits erfüllt – kein Auftrag nötig.');
  const site = str(body.workshop_site, { required: true, max: 20, field: 'Werkstatt' });
  if (!v.ws_code) throw bad('validation', 'Unbekannte Werkstatt.');
  const priority = oneOf(body.priority || 'niedrig', PRIORITIES, 'Priorität');
  const note = str(body.note, { max: 1000, field: 'Bemerkung' });
  // Termin vor dem Anlegen prüfen (sonst bliebe bei ungültigem Termin eine nicht freigegebene Meldung zurück)
  const planned = body.planned_date ? planDate(body.planned_date) : null;
  if (planned && planned < berlinDate()) throw bad('validation', 'Werkstatttermin darf nicht in der Vergangenheit liegen.');
  const parts = [];
  if (w.noncompliant.length) parts.push(`ohne Alpine-Symbol: ${w.noncompliant.join(', ')}`);
  if (w.missing.length) parts.push(`nicht erfasst: ${w.missing.join(', ')}`);
  const description = (w.status === 'nicht_erfuellt' ? 'Umrüstung auf Winterreifen (Alpine-Symbol)' : 'Winterreifen prüfen und Winterkennzeichnung erfassen')
    + ` – Positionen laut Reifenerfassung ${parts.join('; ')}. Wechsel mit Winterkennzeichnung in der Fahrzeugakte → Reifen erfassen.${note ? ' – ' + note : ''}`;
  const requestKey = str(body.request_key, { max: 64, field: 'request_key' }) || uuid();
  const [created] = await createCases(env, ctx, user, envName, [{ vehicle_id: vehicleId, description, priority, driveability: 'fahrbereit', workshop_site: site, request_key: requestKey }],
    { origin: 'wartung', tire_order: 'winter', site_checked: true });
  if (created.duplicate) return { id: created.id, case_no: created.case_no, duplicate: true };
  const r = await runCommand(env, ctx, user, envName, created.id, { action: 'approve_repair', command_id: ('mw-' + requestKey).slice(0, 64), expected_version: 1,
    note: `Auftrag Winterreifen${note ? ': ' + note : ''}`, payload: { workshop_site: site, ...(planned ? { planned_date: planned } : {}) } });
  return { id: created.id, case_no: created.case_no, status: r.status, winter: w.status };
}

// Aktuelle Winterlage laut Reifenerfassung für einen Winterreifen-Auftrag (Vorgangsansicht, Abschlussprüfung)
async function caseWinter(env, c, kind) {
  const k = kind || (await env.DB.prepare('SELECT kind FROM vehicles WHERE id=?').bind(c.vehicle_id).first())?.kind || 'lkw';
  const ev = (await env.DB.prepare('SELECT position, event_type, winter_mark FROM tire_events WHERE environment=? AND vehicle_id=? ORDER BY created_at DESC').bind(c.environment, c.vehicle_id).all()).results;
  const { status, noncompliant, missing } = winterStatus(k, winterMarks(ev));
  return { status, noncompliant, missing };
}

export async function createCase(env, ctx, user, envName, body) {
  return (await createCases(env, ctx, user, envName, [body]))[0];
}

// Backlog 404 (26.10.2026, Blickwinkel „Hagelschaden an mehreren Lkw auf dem Hof“): gleicher Schaden an mehreren Fahrzeugen in einem
// Schritt melden (nur Inhaber/Fuhrparkleitung). Je Fahrzeug ein eigener Vorgang (eigene Werkstatt, Kosten, Versicherungsfall), alle im
// selben atomaren Stapel wie createCases. request_key je Fahrzeug aus dem Schlüssel des Formulars abgeleitet – erneutes Senden (Funkloch)
// liefert dieselben Vorgänge. Fotos ergänzt die Leitung danach im jeweiligen Vorgang (Bilder gehören zu einem Fahrzeug).
// Höchstens 12 je Aufruf: Empfängerermittlung je Fahrzeug (1 Abfrage) – 25 Fahrzeuge kamen mit Push-Geräten auf 45 von 50 Abfragen.
// Die App teilt größere Auswahlen in Blöcke mit demselben Schlüssel (je Fahrzeug abgeleitet → erneutes Senden bleibt wiederholbar).
export const BATCH_MAX = 12;
export async function createCaseBatch(env, ctx, user, envName, body) {
  if (!isManager(user)) throw forbidden();
  body = body && typeof body === 'object' ? body : {};
  const key = str(body.request_key, { required: true, max: 64, field: 'request_key' });
  if (!Array.isArray(body.vehicle_ids)) throw bad('validation', 'Bitte mindestens zwei Fahrzeuge wählen.');
  const ids = body.vehicle_ids.map((x) => str(x, { required: true, max: 40, field: 'Fahrzeug' }));
  if (new Set(ids).size !== ids.length) throw bad('validation', 'Fahrzeug doppelt gewählt.');
  if (ids.length < 2) throw bad('validation', 'Bitte mindestens zwei Fahrzeuge wählen.');
  if (ids.length > BATCH_MAX) throw bad('validation', 'Höchstens 12 Fahrzeuge je Aufruf.');
  const keys = await Promise.all(ids.map((id) => sha256Hex(`${key}|${id}`)));
  const common = { description: body.description, priority: body.priority, driveability: body.driveability, workshop_site: body.workshop_site,
    location_note: body.location_note, occurred_at: body.occurred_at, origin: 'meldung' };
  const res = await createCases(env, ctx, user, envName, ids.map((id, i) => ({ ...common, vehicle_id: id, request_key: 'b' + keys[i].slice(0, 40) })));
  return { count: res.length, cases: res.map((r, i) => ({ vehicle_id: ids[i], ...r })) };
}

// Mehrere Meldungen in einem Aufruf anlegen (z. B. Folgeaufträge einer Kontrolle mit mehreren Mängeln).
// Abfragebudget: feste Zahl an Anweisungen unabhängig von der Anzahl – vorher ≈ 14 je Meldung, d. h. eine
// Abfahrtskontrolle mit 3 Mängeln überschritt bereits die Cloudflare-Grenze von 50 Abfragen je Aufruf.
// internal: nur für serverseitige Aufrufer (Aufträge aus Prüftermin/Prüfung) – nie aus Anfragedaten befüllen
export async function createCases(env, ctx, user, envName, bodies, internal = {}) {
  if (!['owner', 'fleet', 'workshop', 'dispatch', 'driver'].includes(user.role)) throw forbidden();
  if (!bodies.length) return [];
  const specs = [];
  for (const body of bodies) {
    const vehicleId = str(body.vehicle_id, { required: true, max: 40, field: 'Fahrzeug' });
    const description = str(body.description, { required: true, max: 4000, field: 'Fehlerbeschreibung' });
    if (description.length < 5) throw bad('validation', 'Fehlerbeschreibung ist zu kurz.');
    const reportedPriority = oneOf(body.priority || 'niedrig', PRIORITIES, 'Dringlichkeit');
    const driveability = oneOf(body.driveability || 'unbekannt', DRIVEABILITY, 'Fahrbereitschaft');
    const suggested = body.workshop_site ? str(body.workshop_site, { max: 20, field: 'Werkstatt' }) : null;
    const requestKey = str(body.request_key, { required: true, max: 64, field: 'request_key' });
    const location = str(body.location_note, { max: 300, field: 'Ort' });
    const origin = body.origin && ['meldung', 'kontrolle'].includes(body.origin) ? body.origin : 'meldung';
    const parentId = body.parent_case_id ? str(body.parent_case_id, { max: 40 }) : null;
    const checkItem = origin === 'kontrolle' && body.check_item ? str(body.check_item, { max: 60, field: 'Prüfpunkt' }) : null;
    // Schadenzeitpunkt laut Meldung (Backlog 285): optional, nur bei Meldungen (Kontrolle/Prüftermin haben ihren eigenen Zeitpunkt)
    const occurred = origin === 'meldung' && !internal.origin ? occurredAt(body.occurred_at) : null;
    specs.push({ vehicleId, description, reportedPriority, driveability, suggested, requestKey, location, origin, parentId, checkItem, occurred,
      reporterNote: str(body.reporter_name_note, { max: 120, field: 'Name' }) });
    if (internal.origin) specs.at(-1).origin = internal.origin;
  }
  const J = (a) => JSON.stringify([...new Set(a)]);
  const vehicles = new Map((await env.DB.prepare('SELECT * FROM vehicles WHERE active=1 AND id IN (SELECT value FROM json_each(?))').bind(J(specs.map((x) => x.vehicleId))).all()).results.map((v) => [v.id, v]));
  // außer Betrieb genommen (z. B. Offline-Meldung nach Stilllegung): eigene Meldung statt „unbekannt“ (19.10.2026)
  if (specs.some((x) => !vehicles.has(x.vehicleId))) {
    const known = await env.DB.prepare('SELECT 1 FROM vehicles WHERE active=0 AND id IN (SELECT value FROM json_each(?))').bind(J(specs.map((x) => x.vehicleId).filter((id) => !vehicles.has(id)))).first();
    throw bad('validation', known ? 'Fahrzeug ist außer Betrieb.' : 'Fahrzeug unbekannt.');
  }
  // Ursprungsvorgang (Folgeauftrag): muss in derselben Umgebung zum selben Fahrzeug existieren – sonst würde die Akte fremde Vorgangsnummern zeigen
  const parentIds = specs.map((x) => x.parentId).filter(Boolean);
  if (parentIds.length) {
    const parents = new Map((await env.DB.prepare('SELECT id, vehicle_id FROM cases WHERE environment=? AND id IN (SELECT value FROM json_each(?))').bind(envName, J(parentIds)).all()).results.map((r) => [r.id, r.vehicle_id]));
    if (specs.some((x) => x.parentId && parents.get(x.parentId) !== x.vehicleId)) throw bad('validation', 'Ursprünglicher Vorgang nicht gefunden.');
  }
  const sites = specs.map((x) => x.suggested).filter(Boolean);
  if (sites.length && !internal.site_checked) {
    const known = (await env.DB.prepare('SELECT code, active FROM workshops WHERE code IN (SELECT value FROM json_each(?))').bind(J(sites)).all()).results;
    const ok = new Set(known.filter((r) => r.active).map((r) => r.code)); const closed = new Set(known.filter((r) => !r.active).map((r) => r.code));
    // inzwischen geschlossene Werkstatt (App/Postausgang noch mit alter Werkstattliste): Vorschlag entfällt statt die ganze Meldung abzuweisen –
    // vorher 400 bei jedem „Erneut senden“, nur „Verwerfen“ (Fotos weg) blieb (Backlog 190, Teilagent „Werkstatt schließt“)
    for (const x of specs) if (x.suggested && closed.has(x.suggested)) x.suggested = null;
    if (specs.some((x) => x.suggested && !ok.has(x.suggested))) throw bad('validation', 'Unbekannte Werkstatt.');
  }
  const hashes = await Promise.all(specs.map((x) => sha256Hex(JSON.stringify([x.vehicleId, x.description, x.reportedPriority, x.driveability, x.suggested, x.location, x.parentId, ...(x.occurred ? [x.occurred] : [])]))));
  specs.forEach((x, i) => { x.contentHash = hashes[i]; });
  const byKey = async () => new Map((await env.DB.prepare('SELECT id, case_no, content_hash, request_key FROM cases WHERE environment=? AND reporter_id=? AND request_key IN (SELECT value FROM json_each(?))')
    .bind(envName, user.id, J(specs.map((x) => x.requestKey))).all()).results.map((r) => [r.request_key, r]));
  const existing = await byKey();
  const results = new Array(specs.length);
  const fresh = [];
  const seenKeys = new Set();
  specs.forEach((x, i) => {
    const e = existing.get(x.requestKey);
    if (e) {
      if (e.content_hash !== x.contentHash) throw conflict('request_key_conflict', 'Diese Meldung wurde bereits mit anderem Inhalt gesendet.');
      results[i] = { id: e.id, case_no: e.case_no, duplicate: true };
    } else if (seenKeys.has(x.requestKey)) {
      throw bad('validation', 'request_key doppelt.');
    } else { seenKeys.add(x.requestKey); fresh.push([i, x]); }
  });
  if (!fresh.length) return results;

  // Sicherheitsrelevant: kritisch oder nicht fahrbereit -> Sperre bis menschliche Fachbewertung
  // Berliner Kalenderjahr aus demselben Zeitpunkt wie created_at (22.10.2026: vorher Jahr vor, Zeitpunkt nach dem Zählerzugriff bestimmt –
  // an Silvester 23:59:59 Berlin entstand S-2026-… mit Anlage am 01.01.2027)
  const now = nowIso();
  const year = Number(berlinDate(now).slice(0, 4));
  const k = fresh.length;
  const counter = await env.DB.prepare(`INSERT INTO case_counters(environment, year, last_no) VALUES (?, ?, ?)
    ON CONFLICT(environment, year) DO UPDATE SET last_no = last_no + ? RETURNING last_no`).bind(envName, year, k, k).first();
  const rows = []; const events = [];
  fresh.forEach(([i, x], n) => {
    // Winterreifen-Auftrag: Information, nie Sperre (auch nicht mit Priorität „kritisch“ über die API – 18.10.2026)
    const safetyLock = !internal.tire_order && (x.reportedPriority === 'kritisch' || x.driveability === 'nicht_fahrbereit') ? 1 : 0;
    const caseNo = `${envName === 'test' ? 'T' : 'S'}-${year}-${String(counter.last_no - k + 1 + n).padStart(4, '0')}`;
    const id = uuid();
    // Text nennt die meldende Rolle zutreffend (vorher stand auch bei Meldungen der Leitung/Werkstatt „Fahrer meldet“)
    const by = user.role === 'driver' ? 'Fahrer meldet' : `Meldung ${ROLE_DE[user.role] || ''}`.trim();
    // Auftrag der Leitung aus Prüftermin/Prüfmangel ist bereits fachlich bewertet – kein „(ungeprüft)“ (18.10.2026)
    const by2 = internal.origin === 'wartung' ? `Auftrag ${ROLE_DE[user.role] || ''}`.trim() : by; const unchecked = internal.origin === 'wartung' ? '' : ' (ungeprüft)';
    const lockReason = safetyLock ? (x.driveability === 'nicht_fahrbereit' ? `${by2}: nicht fahrbereit${unchecked}` : `${by2}: sicherheitskritisch${unchecked}`) : null;
    rows.push({ id, case_no: caseNo, vehicle_id: x.vehicleId, reporter_name_note: x.reporterNote, description: x.description, location_note: x.location, occurred_at: x.occurred,
      priority: x.reportedPriority, driveability: x.driveability, safety_lock: safetyLock, lock_reason: lockReason, site: x.suggested, origin: x.origin,
      parent_case_id: x.parentId, check_item: x.checkItem, request_key: x.requestKey, content_hash: x.contentHash,
      maintenance_rule_id: internal.maintenance_rule_id || null, maintenance_event_id: internal.maintenance_event_id || null, tire_order: internal.tire_order || null });
    events.push({ id: uuid(), case_id: id, payload: JSON.stringify({ priority: x.reportedPriority, driveability: x.driveability, safety_lock: !!safetyLock, origin: x.origin, parent_case_id: x.parentId }) });
    results[i] = { id, case_no: caseNo, duplicate: false, safety_lock: !!safetyLock };
  });
  const v = (key) => `json_extract(value,'$.${key}')`;
  // Aufträge aus Prüftermin/Prüfmangel/Winterreifen: „höchstens ein offener“ im selben Stapel geprüft (Muster cmd_guard) – zwei gleichzeitige
  // Klicks verschiedener Personen legten sonst zwei freigegebene Aufträge an (Vorabprüfung per SELECT, 17.10.2026)
  const oneOpen = internal.tire_order ? ["tire_order='winter' AND vehicle_id=?2", rows[0] && rows[0].vehicle_id] : internal.maintenance_rule_id ? ['maintenance_rule_id=?2', internal.maintenance_rule_id]
    : internal.maintenance_event_id ? ['maintenance_event_id=?2', internal.maintenance_event_id] : null;
  const openSql = oneOpen ? `FROM cases WHERE environment=?1 AND ${oneOpen[0]} AND status NOT IN ('fahrzeug_freigegeben','abgelehnt')` : '';
  const guard = oneOpen ? [env.DB.prepare(`INSERT INTO cmd_guard(ok) SELECT CASE WHEN COUNT(*) <= 1 THEN 1 ELSE 0 END ${openSql}`).bind(envName, oneOpen[1]), env.DB.prepare('DELETE FROM cmd_guard')] : [];
  // Abfahrtskontrolle (Backlog 106, 21.10.2026): zwei gleichzeitig eingehende Kontrollen mit demselben Mangel legten zwei Vorgänge an – die
  // Vorabprüfung „offener Vorgang desselben Prüfpunkts“ las den Stand vor dem Stapel. Gleiche Regel wie in submitInspection im Stapel geprüft;
  // trifft sie jetzt zu, rollt der Stapel zurück und die Kontrolle wird einmal neu bewertet (dann Vermerk „erneut festgestellt“).
  const kg = internal.kontrolle_guard;
  const kgRows = kg ? rows.filter((r) => r.origin === 'kontrolle' && r.check_item && kg.has(r.check_item)).map((r) => ({ v: r.vehicle_id, item: r.check_item, ...kg.get(r.check_item) })) : [];
  if (kgRows.length) guard.push(env.DB.prepare(`INSERT INTO cmd_guard(ok) SELECT CASE WHEN EXISTS (SELECT 1 FROM json_each(?2) j JOIN cases o ON o.environment=?1
      AND o.vehicle_id=json_extract(j.value,'$.v') AND o.origin='kontrolle' AND o.check_item=json_extract(j.value,'$.item') AND o.status NOT IN ('fahrzeug_freigegeben','abgelehnt')
      AND o.id NOT IN (SELECT value FROM json_each(?3))
      AND (json_extract(j.value,'$.cmp')=0 OR (CASE o.priority WHEN 'kritisch' THEN 2 WHEN 'mittel' THEN 1 ELSE 0 END) >= json_extract(j.value,'$.rank'))
      AND (json_extract(j.value,'$.safety')=0 OR o.safety_lock=1)) THEN 0 ELSE 1 END`).bind(envName, JSON.stringify(kgRows), JSON.stringify(rows.map((r) => r.id))), env.DB.prepare('DELETE FROM cmd_guard'));
  // Zusätzliche Anweisungen des Aufrufers im selben atomaren Stapel (22.10.2026, Abfahrtskontrolle: Kontrolle + km + Verlauf zusammen mit den
  // Mangel-Vorgängen – vorher getrennt; brach der Aufruf dazwischen ab, gab es den gesperrten Vorgang ohne Kontrolle, und erneutes Senden
  // vermerkte am eigenen Vorgang „erneut festgestellt“). Ergebnisse dieser Anweisungen in internal.extraResults.
  const extra = internal.extra ? internal.extra(results) : [];
  let batchRes;
  try {
    batchRes = await env.DB.batch([
      env.DB.prepare(`INSERT INTO cases(id,case_no,environment,vehicle_id,reporter_id,reporter_name_note,description,location_note,reported_priority,priority,
        reported_driveability,safety_lock,safety_lock_reason,status,suggested_workshop_site,origin,parent_case_id,check_item,request_key,content_hash,maintenance_rule_id,maintenance_event_id,tire_order,occurred_at,version,created_at,updated_at)
        SELECT ${v('id')}, ${v('case_no')}, ?1, ${v('vehicle_id')}, ?2, ${v('reporter_name_note')}, ${v('description')}, ${v('location_note')}, ${v('priority')}, ${v('priority')},
          ${v('driveability')}, ${v('safety_lock')}, ${v('lock_reason')}, 'gemeldet', ${v('site')}, ${v('origin')}, ${v('parent_case_id')}, ${v('check_item')}, ${v('request_key')}, ${v('content_hash')}, ${v('maintenance_rule_id')}, ${v('maintenance_event_id')}, ${v('tire_order')}, ${v('occurred_at')}, 1, ?3, ?3
        FROM json_each(?4) WHERE EXISTS (SELECT 1 FROM vehicles WHERE id=${v('vehicle_id')} AND active=1)`).bind(envName, user.id, now, JSON.stringify(rows)),
      // Fahrzeug gleichzeitig außer Betrieb genommen (18.10.2026: offener Vorgang an außer Betrieb genommenem Fahrzeug) → ganzer Stapel zurück
      env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT CASE WHEN changes() = ? THEN 1 ELSE 0 END').bind(rows.length), env.DB.prepare('DELETE FROM cmd_guard'),
      env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
        SELECT ${v('id')}, ${v('case_id')}, ?1, ?2, ?3, 'create', NULL, 'gemeldet', NULL, 1, NULL, ${v('payload')}, ?4 FROM json_each(?5)`)
        .bind(envName, user.id, user.role, now, JSON.stringify(events)),
      ...guard,
      ...extra,
    ]);
    if (extra.length) { internal.extraDone = true; internal.extraResults = batchRes.slice(batchRes.length - extra.length); }
  } catch (e) {
    // nichts angelegt (409-Wege wie order_exists/inspection_race, Doppelklick, Fehler): gezogene Nummern zurückgeben, solange niemand danach
    // eine gezogen hat – sonst Nummernlücken (22.10.2026, Backlog 127b)
    // Nur zurückgeben, wenn wirklich keine der Nummern gespeichert ist: meldet D1 einen Fehler, obwohl der Stapel geschrieben wurde (z. B.
    // „Network connection lost“), lieferte die nächste Anlage sonst dieselbe Nummer → UNIQUE-Fehler → erneute Rückgabe → jede Meldung bis
    // Silvester 500 (Fund Teilagent „Jahreswechsel“, 22.10.2026)
    await env.DB.prepare(`UPDATE case_counters SET last_no=last_no-? WHERE environment=? AND year=? AND last_no=?
      AND NOT EXISTS (SELECT 1 FROM cases WHERE case_no IN (SELECT value FROM json_each(?)))`).bind(k, envName, year, counter.last_no, J(rows.map((r) => r.case_no))).run().catch(() => null);
    if (/case_no/.test(String(e && e.message))) {
      const prefix = `${envName === 'test' ? 'T' : 'S'}-${year}-`;
      await env.DB.prepare(`UPDATE case_counters SET last_no=MAX(last_no, COALESCE((SELECT MAX(CAST(substr(case_no, length(?3) + 1) AS INTEGER))
        FROM cases WHERE environment=?1 AND substr(case_no, 1, length(?3))=?3), 0)) WHERE environment=?1 AND year=?2`).bind(envName, year, prefix).run().catch(() => null);
    }
    if (String(e && e.message).includes('CHECK')) {
      const act = (await env.DB.prepare('SELECT COUNT(*) AS n FROM vehicles WHERE active=1 AND id IN (SELECT value FROM json_each(?))').bind(J(specs.map((x) => x.vehicleId))).first()).n;
      if (act < new Set(specs.map((x) => x.vehicleId)).size) {
        // gleichzeitig außer Betrieb genommen: dieselbe Meldung wie in der Vorprüfung (19.10.2026)
        const off = await env.DB.prepare('SELECT 1 FROM vehicles WHERE active=0 AND id IN (SELECT value FROM json_each(?))').bind(J(specs.map((x) => x.vehicleId))).first();
        throw bad('validation', off ? 'Fahrzeug ist außer Betrieb.' : 'Fahrzeug unbekannt.');
      }
    }
    if (kgRows.length && String(e && e.message).includes('CHECK')) {
      const again0 = await byKey();
      if (!specs.every((x) => again0.get(x.requestKey)?.content_hash === x.contentHash)) throw conflict('inspection_race', 'Ein gleichartiger Mangel wurde gerade gemeldet. Bitte die Kontrolle erneut senden.');
    }
    if (oneOpen && String(e && e.message).includes('CHECK')) {
      const o = await env.DB.prepare(`SELECT id, case_no ${openSql} ORDER BY created_at LIMIT 1`).bind(envName, oneOpen[1]).first();
      throw conflict('order_exists', `Es gibt bereits den offenen Auftrag ${o ? o.case_no : ''}.`, o ? { case_id: o.id, case_no: o.case_no } : undefined);
    }
    // Paralleler Doppelklick: eindeutiger request_key greift (Batch ist atomar – entweder alle oder keine angelegt)
    const again = await byKey();
    if (specs.every((x) => again.get(x.requestKey)?.content_hash === x.contentHash)) return specs.map((x) => ({ id: again.get(x.requestKey).id, case_no: again.get(x.requestKey).case_no, duplicate: true }));
    throw e;
  }
  const created = (await env.DB.prepare('SELECT * FROM cases WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(rows.map((r) => r.id))).all()).results;
  const order = new Map(rows.map((r, n) => [r.id, n]));
  created.sort((a, b) => order.get(a.id) - order.get(b.id));
  // Interne Aufträge (Herkunft „wartung“) werden sofort freigegeben – die Freigabe benachrichtigt; vorher bekam die Werkstatt zusätzlich
  // „KRITISCH: neue Meldung (ungeprüft)“ (zwei dringende Pushs je Auftrag, 18.10.2026)
  if (internal.origin !== 'wartung') await notifyCasesCreated(env, ctx, created, { actor: user, vehicles });
  // Backlog 284 (Teilagent „Sonntag 03:00“): dringende Meldung – wie viele benachrichtigte Personen (außer der meldenden) haben ein aktives
  // Push-Gerät? Bei 0 bittet die App den Fahrer, anzurufen (vorher merkte das erst der Agent am Morgen). Eine Abfrage, nur bei dringenden.
  const urgentIds = internal.origin !== 'wartung' ? created.filter((c) => c.safety_lock || c.priority === 'kritisch').map((c) => c.id) : [];
  if (urgentIds.length) {
    const reach = new Map((await env.DB.prepare(`SELECT n.case_id AS id, COUNT(DISTINCT n.user_id) AS k FROM notifications n
      WHERE n.case_id IN (SELECT value FROM json_each(?1)) AND n.kind='created' AND n.user_id<>?2
        AND EXISTS (SELECT 1 FROM push_subscriptions p WHERE p.user_id=n.user_id AND p.revoked_at IS NULL) GROUP BY n.case_id`).bind(JSON.stringify(urgentIds), user.id).all()).results.map((r) => [r.id, r.k]));
    for (const r of results) if (r && urgentIds.includes(r.id)) r.urgent_push_recipients = reach.get(r.id) || 0;
  }
  return results;
}

// Backlog 260 (25.10.2026, Folge aus Teilagent „Zusatzbefund in der Reparatur“): offene Restarbeit in einen Folgeauftrag umwandeln (nur
// Inhaber/Fuhrparkleitung). Neuer Vorgang am selben Fahrzeug mit Bezug auf den Ursprungsvorgang; Dringlichkeit wählt die Leitung
// (Vorbelegung in der App wie bei Kontroll-Mängeln: sicherheitsrelevant → kritisch + nicht fahrbereit = Sperre bis zur Bewertung).
// Restarbeit wird im selben Stapel „erledigt“ mit Verweis auf den Folgeauftrag – so kann der Ursprungsvorgang abgeschlossen werden,
// ohne dass der Zusatzbefund verloren geht. Wiederholung (gleiche Restarbeit) liefert denselben Folgeauftrag.
export async function openItemToCase(env, ctx, user, envName, caseId, oid, body) {
  if (!isManager(user)) throw forbidden();
  const c = await env.DB.prepare('SELECT id, case_no, vehicle_id, version, status FROM cases WHERE id=? AND environment=?').bind(caseId, envName).first();
  if (!c) throw notFound();
  const oi = await env.DB.prepare('SELECT * FROM open_items WHERE id=? AND case_id=?').bind(String(oid).slice(0, 40), c.id).first();
  if (!oi) throw bad('validation', 'Restarbeit nicht gefunden oder bereits erledigt.');
  const requestKey = 'oi-' + oi.id;
  if (oi.status !== 'offen') {
    // schon umgewandelt (Doppelklick/Netzwiederholung): denselben Folgeauftrag nennen
    const prev = await env.DB.prepare('SELECT id, case_no FROM cases WHERE environment=? AND reporter_id=? AND request_key=?').bind(envName, user.id, requestKey).first();
    if (prev) return { id: prev.id, case_no: prev.case_no, duplicate: true };
    throw bad('validation', 'Restarbeit nicht gefunden oder bereits erledigt.');
  }
  const priority = oneOf(body.priority, PRIORITIES, 'Dringlichkeit');
  const driveability = oneOf(body.driveability || (oi.safety_relevant ? 'nicht_fahrbereit' : 'unbekannt'), DRIVEABILITY, 'Fahrbereitschaft');
  const note = str(body.note, { max: 1000, field: 'Bemerkung' });
  const now = nowIso();
  const description = cutText(`[Restarbeit aus ${c.case_no}] ${oi.description}${note ? ' – ' + note : ''}`, 4000);
  const internal = {
    extra: (results) => {
      const r = results[0]; if (!r || r.duplicate) return [];
      return [
        env.DB.prepare(`UPDATE open_items SET status='erledigt', resolved_by=?, resolved_at=?, resolution_note=? WHERE id=? AND status='offen'`).bind(user.id, now, `Folgeauftrag ${r.case_no}`, oi.id),
        env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()'), env.DB.prepare('DELETE FROM cmd_guard'),
        env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
          SELECT ?,?,?,?,?,'open_item_to_case',status,status,version,version,?,?,? FROM cases WHERE id=?`).bind(uuid(), c.id, envName, user.id, user.role, `Folgeauftrag ${r.case_no}`,
          JSON.stringify({ open_item_id: oi.id, case_id: r.id, case_no: r.case_no, safety_relevant: !!oi.safety_relevant }), now, c.id),
        env.DB.prepare('UPDATE cases SET updated_at=? WHERE id=?').bind(now, c.id),
      ];
    },
  };
  let res;
  try {
    [res] = await createCases(env, ctx, user, envName, [{ vehicle_id: c.vehicle_id, description, priority, driveability, parent_case_id: c.id, request_key: requestKey }], internal);
  } catch (e) {
    // gleichzeitig erledigt (Werkstatt hakt ab, während die Leitung umwandelt): ganzer Stapel zurück
    const again = await env.DB.prepare('SELECT status FROM open_items WHERE id=?').bind(oi.id).first();
    if (again && again.status !== 'offen') throw conflict('version_conflict', 'Der Vorgang wurde zwischenzeitlich geändert. Bitte neu laden.');
    throw e;
  }
  return { id: res.id, case_no: res.case_no, ...(res.duplicate ? { duplicate: true } : {}) };
}

// ---------- Befehle ----------

const hideSuggestedSite = (env, now, c) => env.DB.prepare(`UPDATE notifications SET hidden_at=? WHERE case_id=? AND hidden_at IS NULL AND user_id<>?
  AND user_id IN (SELECT id FROM users WHERE role='workshop' AND workshop_site=?)`).bind(now, c.id, c.reporter_id || '', c.suggested_workshop_site);

export async function runCommand(env, ctx, user, envName, caseId, body) {
  const action = str(body.action, { required: true, max: 40, field: 'Aktion' });
  const commandId = str(body.command_id, { required: true, max: 64, field: 'command_id' });
  const expectedVersion = num(body.expected_version, { min: 1, field: 'Version' });
  let note = str(body.note, { max: 4000, field: 'Bemerkung' });
  const p = body.payload || {};

  const { c, access } = await loadCase(env, user, envName, caseId);

  // Idempotenz: gleicher Befehl bereits ausgeführt -> aktuellen Stand liefern
  const done = await env.DB.prepare('SELECT id, action, command_hash FROM case_events WHERE case_id=? AND command_id=?').bind(c.id, commandId).first();
  // dieselbe Kennung für eine andere Aktion: nicht still „duplicate“ (sonst glaubt ein Schnittstellen-Client, die Aktion sei ausgeführt) – 18.10.2026
  if (done && done.action !== action) throw conflict('command_id_reused', 'Diese Befehlskennung wurde bereits für eine andere Aktion verwendet.');
  // … ebenso mit anderem Inhalt (21.10.2026, Migration 0068: 8 h statt 2 h bzw. anderes Datum mit derselben Kennung → still „duplicate“)
  const commandHash = await sha256Hex(JSON.stringify([action, p, note || null]));
  if (done && done.command_hash && done.command_hash !== commandHash) throw conflict('command_id_reused', 'Diese Befehlskennung wurde bereits mit anderem Inhalt verwendet.');
  if (done) return { ok: true, duplicate: true, version: c.version };

  // Version zuerst (20.10.2026): veraltete Seite bekommt „bitte neu laden“ statt „nicht erlaubt“ (Status hat sich inzwischen geändert)
  if (c.version !== expectedVersion) throw conflict('version_conflict', 'Der Vorgang wurde zwischenzeitlich geändert. Bitte neu laden.', { current_version: c.version });
  const allowed = allowedActions(user, c, access);
  if (!allowed.includes(action)) throw forbidden(`Aktion „${action}“ ist für Ihre Rolle bzw. im Status „${c.status}“ nicht erlaubt.`, { denied: 'action_not_allowed', action, status: c.status });

  const now = nowIso();
  const set = {};
  let toStatus = c.status;
  let payload = {};
  let workGuard = null; // Arbeitszeit-Tagesgrenze im Stapel geprüft
  let noWorkshopUser = false; let externalWs = false; // Backlog 386: Werkstatt „EXTERN“ ohne Konto – Hinweis statt Warnung // Reparatur an eine Werkstatt ohne aktives Konto freigegeben (Antwort-Hinweis, 23.10.2026)
  let stockGuardItem = null; // Lagerentnahme mit Bestandsprüfung im Stapel (Fehlerbild unterscheiden)
  const extra = []; // zusätzliche Statements in derselben Transaktion
  let notifyKind = null;

  const requireNote = (msg) => { if (!note || note.length < 3) throw bad('note_required', msg); };

  switch (action) {
    case 'comment':
      requireNote('Kommentar ist leer.');
      if (Array.isArray(p.notify)) { const n = [...new Set(p.notify.filter((x) => ['reporter', 'fleet', 'workshop'].includes(x)))]; if (n.length) payload.notify = n; }
      notifyKind = 'comment';
      break;
    case 'receive':
      set.fleet_received_at = now; set.fleet_received_by = user.id;
      notifyKind = 'received';
      break;
    case 'change_priority': {
      const np = oneOf(p.priority, PRIORITIES, 'Priorität');
      if (np === c.priority) throw bad('validation', 'Priorität ist unverändert.');
      requireNote('Bitte Begründung für die Prioritätsänderung angeben.');
      set.priority = np; set.priority_reviewed = 1;
      if (!c.fleet_received_at) { set.fleet_received_at = now; set.fleet_received_by = user.id; }
      payload = { from: c.priority, to: np, safety_lock_unchanged: !!c.safety_lock };
      notifyKind = 'priority_changed';
      break;
    }
    case 'set_safety_lock':
      requireNote('Bitte Grund für die Sperre angeben.');
      if (c.safety_lock) throw bad('validation', 'Fahrzeug ist bereits gesperrt.');
      set.safety_lock = 1; set.safety_lock_reason = note;
      notifyKind = 'safety_lock';
      break;
    case 'lift_safety_lock': {
      requireNote('Bitte fachliche Begründung für die Aufhebung angeben.');
      if (!flag(p.confirm, 'Bestätigung')) throw bad('confirm_required', 'Aufhebung muss ausdrücklich bestätigt werden.');
      const safetyOpen = await env.DB.prepare(`SELECT COUNT(*) AS n FROM open_items WHERE case_id=? AND status='offen' AND safety_relevant=1`).bind(c.id).first();
      if (safetyOpen.n > 0) throw bad('safety_items_open', 'Es gibt offene sicherheitsrelevante Restarbeiten.');
      set.safety_lock = 0; set.safety_lock_reason = null;
      // begründete Aufhebung ist eine Bewertung: „nicht fahrbereit“ laut Melder macht spätere Hinweise nicht mehr dringend (18.10.2026)
      set.priority_reviewed = 1;
      notifyKind = 'safety_lock_lifted';
      break;
    }
    case 'approve_repair': {
      const site = str(p.workshop_site, { required: true, max: 20, field: 'Werkstatt' });
      const ws = await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(site).first();
      if (!ws) throw bad('validation', 'Unbekannte Werkstatt.');
      requireNote('Bitte Reparaturumfang/Freigabevermerk angeben.');
      set.workshop_site = site; set.approval_scope = note; set.priority_reviewed = 1;
      if (p.priority) { const np = oneOf(p.priority, PRIORITIES, 'Priorität'); if (np !== c.priority) { set.priority = np; payload.priority_from = c.priority; payload.priority_to = np; } }
      if (!c.fleet_received_at) { set.fleet_received_at = now; set.fleet_received_by = user.id; }
      if (p.planned_date) { set.planned_date = planDate(p.planned_date); if (set.planned_date !== (c.planned_date || null)) { payload.planned_from = c.planned_date || null; payload.planned_to = set.planned_date; } }
      toStatus = 'werkstatt_freigegeben';
      payload.workshop_site = site;
      // wie der Agentenbefund NO_WORKSHOP_RECIPIENT, aber sofort: niemand kann den Auftrag dort übernehmen (vorher erst beim nächsten Lauf)
      noWorkshopUser = !(await env.DB.prepare(`SELECT 1 AS x FROM users WHERE environment=? AND role='workshop' AND active=1 AND password_hash IS NOT NULL AND workshop_site=? LIMIT 1`).bind(envName, site).first()); externalWs = site === 'EXTERN';
      // vorgeschlagene Werkstatt bekommt den Auftrag nicht: ihre Hinweise zum Vorgang ausblenden (18.10.2026: Link → 404; Melder ausgenommen)
      if (c.suggested_workshop_site && c.suggested_workshop_site !== site) extra.push(hideSuggestedSite(env, now, c));
      notifyKind = 'approved';
      break;
    }
    case 'set_planned_date': {
      // Werkstatttermin setzen/verschieben/entfernen (leer); ohne Statuswechsel und ohne Push
      const d = p.planned_date ? planDate(p.planned_date) : null;
      if (d === (c.planned_date || null)) throw bad('validation', 'Termin ist unverändert.');
      set.planned_date = d; payload = { from: c.planned_date || null, to: d };
      // Auftrag aus Prüftermin verschoben: der vom Auftrag übernommene Prüftermin (gleicher Tag) zieht mit – sonst stand das Fahrzeug im Plan an
      // zwei Tagen (23.10.2026). Nur im Betrieb: Prüftermine gelten für beide Umgebungen, ein Testauftrag ändert keine Betriebsplanung.
      if (d && c.planned_date && c.maintenance_rule_id && envName === 'production') extra.push(env.DB.prepare('UPDATE maintenance_rules SET planned_date=?, updated_at=? WHERE id=? AND planned_date=?').bind(d, now, c.maintenance_rule_id, c.planned_date));
      break;
    }
    case 'set_followup': {
      // Wiedervorlage setzen/ändern/entfernen (leer) – ohne Statuswechsel, ohne Push; nur Inhaber/Fuhrparkleitung, nur offene Vorgänge
      // Unveränderter (inzwischen fälliger) Termin bleibt zulässig – sonst ließ sich nur der Vermerk nicht ändern (19.10.2026)
      const d = !p.followup_on ? null : String(p.followup_on) === (c.followup_on || '') ? c.followup_on : followupDate(p.followup_on);
      // Ohne mitgeschickten Vermerk bleibt der bisherige (Datum verschieben löschte ihn still – 19.10.2026)
      const fnote = d ? (body.note === undefined ? (c.followup_note || null) : (note || null)) : null;
      if (d === (c.followup_on || null) && fnote === (c.followup_note || null)) throw bad('validation', 'Wiedervorlage ist unverändert.');
      if (fnote && fnote.length > 300) throw bad('validation', 'Vermerk der Wiedervorlage ist zu lang (max. 300 Zeichen).'); // vorher still gekürzt
      set.followup_on = d; set.followup_note = fnote || null; payload = { from: c.followup_on || null, to: d };
      break;
    }
    case 'set_vehicle_location': {
      // Wo steht das Fahrzeug jetzt, wer hat es abgeschleppt (Migration 0079)? Nur Angaben laut Meldung/Beleg; alles leer = entfernen.
      // Ohne Statuswechsel und ohne Push (wie Werkstatttermin); der Verlauf zeigt alt → neu.
      const loc = str(p.vehicle_location, { max: 300, field: 'Standort des Fahrzeugs' });
      const svc = str(p.tow_service, { max: 120, field: 'Abschleppdienst' });
      const on = pastDay(p.towed_on, 'Abgeschleppt am');
      if (on && !svc) throw bad('validation', 'Abschleppdatum nur zusammen mit dem Abschleppdienst angeben.');
      if (on && on < oneYearBack(berlinDate())) throw bad('validation', 'Abgeschleppt am: liegt mehr als ein Jahr zurück.');
      const from = { location: c.vehicle_location || null, service: c.tow_service || null, on: c.towed_on || null };
      const to = { location: loc, service: svc, on };
      if (from.location === to.location && from.service === to.service && from.on === to.on) throw bad('validation', 'Standort ist unverändert.');
      set.vehicle_location = loc; set.tow_service = svc; set.towed_on = on;
      payload = { from: from.location || from.service || from.on ? from : null, to: loc || svc || on ? to : null };
      break;
    }
    case 'set_occurred_at': {
      // Schadenzeitpunkt laut Meldung/Rückfrage (Backlog 285): Tag oder Tag + deutsche Uhrzeit, nicht nach der Meldung; leer = entfernen.
      // Ohne Statuswechsel und ohne Push; der Verlauf zeigt alt → neu.
      const at = occurredAt(p.occurred_at, c.created_at);
      if (at === (c.occurred_at || null)) throw bad('validation', 'Schadenzeitpunkt ist unverändert.');
      set.occurred_at = at; payload = { from: c.occurred_at || null, to: at };
      break;
    }
    case 'correct_vehicle': {
      // Meldung am falschen Fahrzeug (Backlog 254, 25.10.2026, Teilagent „Meldung am falschen Fahrzeug“): Leitung hängt eine noch nicht
      // freigegebene Meldung mit Begründung an das richtige Fahrzeug um – vorher nur Ablehnen + neu melden (Melder, Fotos, Sperre gingen verloren;
      // der wirklich defekte Lkw blieb bis dahin ungesperrt). Nur ohne Folge-/Dublettenbezug und ohne Versicherungsfall (wandern sonst nicht mit).
      const vid = str(p.vehicle_id, { required: true, max: 80, field: 'Fahrzeug' });
      requireNote('Bitte Grund für die Korrektur angeben (z. B. Kennzeichen verwechselt).');
      if (vid === c.vehicle_id) throw bad('validation', 'Fahrzeug ist unverändert.');
      // Backlog 255 (25.10.2026): Mangel aus einer Abfahrtskontrolle → die ganze Kontrolle hängt um (Kontrolle, alle daraus angelegten
      // Vorgänge, km-Stand nur wenn am richtigen Fahrzeug plausibel – sonst nur noch an der Kontrolle). Ohne gefundene Kontrolle
      // (z. B. Papierkontrolle über /api/cases) wie eine Meldung nur dieser Vorgang.
      const insp = c.origin === 'kontrolle' && c.check_item && !c.parent_case_id ? await env.DB.prepare(`SELECT id, items, odometer_km, created_at FROM inspections
        WHERE environment=?1 AND vehicle_id=?2 AND kind='abfahrt' AND case_id IS NULL AND EXISTS (SELECT 1 FROM json_each(items) j
          WHERE json_extract(j.value,'$.followup_case_id')=?3 AND json_extract(j.value,'$.repeat') IS NULL) ORDER BY created_at DESC LIMIT 1`).bind(envName, c.vehicle_id, c.id).first() : null;
      let ids = [c.id];
      if (insp) {
        let items = []; try { items = (JSON.parse(insp.items || '[]') || []).filter((i) => i && typeof i === 'object'); } catch { items = []; }
        if (items.some((i) => i.repeat)) throw bad('correct_vehicle_repeat', 'Diese Kontrolle hat Mängel an bereits offenen Vorgängen erneut festgestellt – Fahrzeug lässt sich nicht korrigieren. Bitte ablehnen und am richtigen Fahrzeug neu melden.');
        ids = [...new Set([c.id, ...items.filter((i) => typeof i.followup_case_id === 'string').map((i) => i.followup_case_id)])];
      }
      const idsJson = JSON.stringify(ids);
      const IN = '(SELECT value FROM json_each(?1))';
      const [nv, ov, rel, sibs] = await Promise.all([
        env.DB.prepare('SELECT id, plate FROM vehicles WHERE id=? AND active=1').bind(vid).first(),
        env.DB.prepare('SELECT plate FROM vehicles WHERE id=?').bind(c.vehicle_id).first(),
        env.DB.prepare(`SELECT (SELECT COUNT(*) FROM cases WHERE duplicate_of IN ${IN} OR parent_case_id IN ${IN}) AS linked, (SELECT COUNT(*) FROM insurance_claims WHERE case_id IN ${IN}) AS claims,
          (SELECT COUNT(*) FROM case_events WHERE case_id IN ${IN} AND action='repeat_finding') AS repeated`).bind(idsJson).first(),
        insp ? env.DB.prepare(`SELECT id, case_no, status, version, vehicle_id, workshop_site, duplicate_of, safety_lock FROM cases WHERE id IN ${IN} AND id<>?2`).bind(idsJson, c.id).all().then((r) => r.results) : [],
      ]);
      if (!nv) throw bad('validation', 'Fahrzeug nicht gefunden oder außer Betrieb.');
      if (rel.linked > 0) throw bad('correct_vehicle_linked', 'Zu dieser Meldung gibt es Dubletten oder Folgeaufträge – Fahrzeug lässt sich nicht korrigieren. Bitte ablehnen und am richtigen Fahrzeug neu melden.');
      if (rel.claims > 0) throw bad('correct_vehicle_claim', 'Zu dieser Meldung gibt es einen Versicherungsfall – Fahrzeug lässt sich nicht korrigieren. Bitte ablehnen und am richtigen Fahrzeug neu melden.');
      if (insp && rel.repeated > 0) throw bad('correct_vehicle_repeat', 'Diese Kontrolle hat Mängel an bereits offenen Vorgängen erneut festgestellt – Fahrzeug lässt sich nicht korrigieren. Bitte ablehnen und am richtigen Fahrzeug neu melden.');
      // weitere Mängel derselben Kontrolle: nur solange keiner Werkstatt freigegeben (gemeldet oder ohne Dublette abgelehnt)
      const busy = sibs.filter((x) => x.vehicle_id !== c.vehicle_id || x.workshop_site || x.duplicate_of || !['gemeldet', 'abgelehnt'].includes(x.status));
      if (busy.length) throw bad('correct_vehicle_busy', `Weitere Mängel dieser Kontrolle sind bereits in Bearbeitung (${busy.map((x) => x.case_no).join(', ')}) – Fahrzeug lässt sich nicht korrigieren. Bitte ablehnen und am richtigen Fahrzeug neu melden.`);
      set.vehicle_id = nv.id;
      if (!c.fleet_received_at) { set.fleet_received_at = now; set.fleet_received_by = user.id; }
      payload = { from: ov ? ov.plate : c.vehicle_id, to: nv.plate, from_vehicle_id: c.vehicle_id, to_vehicle_id: nv.id, safety_lock: !!c.safety_lock };
      // im Stapel: Ziel weiterhin aktiv, weiterhin ohne Bezug/Versicherungsfall (gleichzeitige Änderung → „Vorgang geändert“)
      extra.push(env.DB.prepare(`INSERT INTO cmd_guard(ok) SELECT CASE WHEN EXISTS (SELECT 1 FROM vehicles WHERE id=?2 AND active=1)
        AND NOT EXISTS (SELECT 1 FROM cases WHERE duplicate_of IN ${IN} OR parent_case_id IN ${IN}) AND NOT EXISTS (SELECT 1 FROM insurance_claims WHERE case_id IN ${IN}) THEN 1 ELSE 0 END`).bind(idsJson, nv.id),
        env.DB.prepare('DELETE FROM cmd_guard'));
      if (insp) {
        payload.inspection_id = insp.id;
        if (sibs.length) {
          payload.moved_cases = sibs.map((x) => x.case_no);
          const sJson = JSON.stringify(sibs.map((x) => x.id));
          // weitere Vorgänge der Kontrolle: Fahrzeug, Version +1, je ein Verlaufseintrag (zwei Anweisungen unabhängig von der Anzahl)
          extra.push(env.DB.prepare(`UPDATE cases SET vehicle_id=?2, version=version+1, updated_at=?3 WHERE id IN ${IN} AND vehicle_id=?4 AND workshop_site IS NULL
            AND duplicate_of IS NULL AND status IN ('gemeldet','abgelehnt')`).bind(sJson, nv.id, now, c.vehicle_id),
            env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()=?').bind(sibs.length), env.DB.prepare('DELETE FROM cmd_guard'),
            env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
              SELECT lower(hex(randomblob(16))), id, ?2, ?3, ?4, 'correct_vehicle', status, status, version-1, version, ?5, ?6, ?7 FROM cases WHERE id IN ${IN}`)
              .bind(sJson, envName, user.id, user.role, note, JSON.stringify({ ...payload, moved_cases: undefined, with_case_no: c.case_no, safety_lock: undefined }), now));
        }
        // Kontrolle selbst
        extra.push(env.DB.prepare('UPDATE inspections SET vehicle_id=? WHERE id=? AND vehicle_id=?').bind(nv.id, insp.id, c.vehicle_id),
          env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()'), env.DB.prepare('DELETE FROM cmd_guard'));
        // km-Stand: nur der von dieser Kontrolle in die Akte übernommene Eintrag; am Ziel nur, wenn er dort zwischen die vorhandenen passt
        const odo = insp.odometer_km;
        const reading = odo !== null && odo !== undefined ? await env.DB.prepare(`SELECT id FROM odometer_readings WHERE vehicle_id=? AND measured_at=? AND source='kontrolle:abfahrt' AND km=? LIMIT 1`)
          .bind(c.vehicle_id, insp.created_at, odo).first() : null;
        if (reading) {
          const [last, later] = await Promise.all([
            env.DB.prepare('SELECT km FROM odometer_readings WHERE vehicle_id=? AND measured_at <= ? ORDER BY measured_at DESC LIMIT 1').bind(nv.id, insp.created_at).first(),
            env.DB.prepare('SELECT km FROM odometer_readings WHERE vehicle_id=? AND measured_at > ? ORDER BY measured_at ASC LIMIT 1').bind(nv.id, insp.created_at).first(),
          ]);
          if ((!last || odo >= last.km) && (!later || odo <= later.km)) {
            payload.km = { km: odo, moved: true };
            extra.push(env.DB.prepare(`UPDATE odometer_readings SET vehicle_id=?1 WHERE id=?2
              AND COALESCE((SELECT km FROM odometer_readings WHERE vehicle_id=?1 AND measured_at <= ?3 ORDER BY measured_at DESC LIMIT 1), -1) <= ?4
              AND COALESCE((SELECT km FROM odometer_readings WHERE vehicle_id=?1 AND measured_at > ?3 ORDER BY measured_at ASC LIMIT 1), 9999999999) >= ?4`).bind(nv.id, reading.id, insp.created_at, odo),
              env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()'), env.DB.prepare('DELETE FROM cmd_guard'));
          } else {
            // passt nicht zum richtigen Fahrzeug: aus der Akte des falschen Fahrzeugs entfernt, bleibt an der Kontrolle (Verlauf nennt ihn)
            payload.km = { km: odo, moved: false, ...(last && odo < last.km ? { previous_km: last.km } : { next_km: later.km }) };
            extra.push(env.DB.prepare('DELETE FROM odometer_readings WHERE id=?').bind(reading.id));
          }
        }
        // „Abfahrtskontrolle trotz Sicherheitssperre“: an Vorgängen des falschen Fahrzeugs Hinweis „gehörte zu …“, am richtigen neu prüfen
        extra.push(env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
          SELECT lower(hex(randomblob(16))), x.id, ?1, ?2, ?3, 'inspection_moved', x.status, x.status, x.version, x.version, ?4, ?5, ?6 FROM cases x
          WHERE x.environment=?1 AND x.vehicle_id=?7 AND EXISTS (SELECT 1 FROM case_events e WHERE e.case_id=x.id AND e.action='checked_while_locked' AND json_extract(e.payload,'$.inspection_id')=?8)`)
          .bind(envName, user.id, user.role, `Abfahrtskontrolle gehörte zu ${nv.plate} (Fahrzeug korrigiert)`, JSON.stringify({ inspection_id: insp.id, code: 'inspection_moved', to: nv.plate }), now, c.vehicle_id, insp.id),
          checkedWhileLockedStmt(env, envName, user, insp.id, insp.created_at, odo, nv.id, now, { moved: true }));
      }
      // Agent-Befunde rechnet der nächste Lauf neu (Fahrzeug am Befund folgt dem Vorgang)
      // gesperrt: Sperre wirkt jetzt am richtigen Fahrzeug (Push dorthin), am falschen gilt sie als aufgehoben (Push unten)
      notifyKind = c.safety_lock ? 'safety_lock' : null;
      // nur ein weiterer Mangel der Kontrolle sperrt: Pushs mit diesem Vorgang (unten, ein Paar je Korrektur)
      if (!c.safety_lock) { const lk = sibs.find((x) => x.safety_lock && x.status === 'gemeldet'); if (lk) { payload.lock_case_id = lk.id; payload.safety_lock = true; } }
      break;
    }
    case 'reassign_workshop': {
      const site = str(p.workshop_site, { required: true, max: 20, field: 'Werkstatt' });
      const ws = await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(site).first();
      if (!ws) throw bad('validation', 'Unbekannte Werkstatt.');
      requireNote('Bitte Grund für den Werkstattwechsel angeben.');
      if (site === c.workshop_site) throw bad('validation', 'Werkstatt ist unverändert.');
      // Termin gehörte zur bisherigen Werkstatt – die neue legt ihren eigenen bei der Übernahme fest (bleibt im Verlauf)
      set.workshop_site = site; set.workshop_ack_at = null; set.workshop_ack_by = null; set.planned_date = null;
      // Backlog 263 (Teilagent „Werkstatt fällt eine Woche aus“): vom Auftrag übernommener Prüftermin (gleicher Tag) entfällt mit – sonst stand
      // das Fahrzeug im Werkstattplan weiter am alten Tag der bisherigen Werkstatt (wie set_planned_date, nur im Betrieb)
      if (c.planned_date && c.maintenance_rule_id && envName === 'production') extra.push(env.DB.prepare('UPDATE maintenance_rules SET planned_date=NULL, updated_at=? WHERE id=? AND planned_date=?').bind(now, c.maintenance_rule_id, c.planned_date));
      // Wechsel an eine Werkstatt ohne aktives Konto: Hinweis in der Antwort wie bei der Freigabe (vorher still bis zum nächsten Agentenlauf)
      noWorkshopUser = !(await env.DB.prepare(`SELECT 1 AS x FROM users WHERE environment=? AND role='workshop' AND active=1 AND password_hash IS NOT NULL AND workshop_site=? LIMIT 1`).bind(envName, site).first()); externalWs = site === 'EXTERN';
      // prev_ack_at: Übernahme der bisherigen Werkstatt (zählt in deren Auslastung weiter, Backlog 90)
      payload = { from: c.workshop_site, to: site, ...(c.planned_date ? { planned_date_before: c.planned_date } : {}), ...(c.workshop_ack_at ? { prev_ack_at: c.workshop_ack_at } : {}) };
      // bisherige Werkstatt: alte Hinweise zum Auftrag ausblenden (Link → 404, zurückgehaltener Push ging nach der Ruhezeit noch raus – 17.10.2026);
      // der Hinweis „an andere Werkstatt übergeben“ entsteht danach neu
      if (c.workshop_site) extra.push(env.DB.prepare(`UPDATE notifications SET hidden_at=? WHERE case_id=? AND hidden_at IS NULL
        AND user_id IN (SELECT id FROM users WHERE role='workshop' AND workshop_site=?) AND user_id<>?`).bind(now, c.id, c.workshop_site, c.reporter_id || '')); // Melder behält seine Hinweise (Lesezugriff)
      notifyKind = 'reassigned';
      break;
    }
    case 'reject':
      if (c.suggested_workshop_site && !c.workshop_site) extra.push(hideSuggestedSite(env, now, c));
      // optional als Dublette eines anderen Vorgangs desselben Fahrzeugs (gleiche Umgebung); Grund wird dann vorbelegt
      if (p.duplicate_of) {
        const o = await env.DB.prepare('SELECT id, case_no, vehicle_id, duplicate_of, status FROM cases WHERE id=? AND environment=?').bind(String(p.duplicate_of).slice(0, 40), envName).first();
        if (!o || o.id === c.id) throw bad('validation', 'Ursprünglicher Vorgang nicht gefunden.');
        if (o.vehicle_id !== c.vehicle_id) throw bad('validation', 'Dublette nur zu einem Vorgang desselben Fahrzeugs.');
        if (o.duplicate_of) throw bad('validation', `Vorgang ${o.case_no} ist selbst eine Dublette – bitte den ursprünglichen Vorgang wählen.`);
        // nur zu einem offenen Vorgang (wie die Auswahl der App; 21.10.2026: Dublette eines abgeschlossenen Vorgangs schloss den Mangel, er war nirgends mehr offen)
        if (['fahrzeug_freigegeben', 'abgelehnt'].includes(o.status)) throw bad('duplicate_closed', `Vorgang ${o.case_no} ist bereits abgeschlossen – Dublette nur zu einem offenen Vorgang.`);
        set.duplicate_of = o.id; payload.duplicate_of = o.id; payload.duplicate_of_no = o.case_no;
        // im selben Stapel prüfen, dass das Original weiterhin keine Dublette ist (gleichzeitiges Ablehnen ergab sonst Kette/Ring, 17.10.2026)
        extra.push(env.DB.prepare("INSERT INTO cmd_guard(ok) SELECT CASE WHEN duplicate_of IS NULL AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') THEN 1 ELSE 0 END FROM cases WHERE id=?").bind(o.id), env.DB.prepare('DELETE FROM cmd_guard'));
        // Dubletten, die bisher auf diesen Vorgang zeigten, auf das neue Original umhängen (keine Kette Dublette → Dublette)
        const moved = (await env.DB.prepare('SELECT case_no FROM cases WHERE duplicate_of=? AND environment=? ORDER BY created_at').bind(c.id, envName).all()).results.map((x) => x.case_no);
        if (moved.length) {
          payload.moved_duplicates = moved;
          extra.push(env.DB.prepare('UPDATE cases SET duplicate_of=?, updated_at=? WHERE duplicate_of=? AND environment=?').bind(o.id, now, c.id, envName));
        }
        // Versicherungsfall der Dublette auf das Original umhängen (18.10.2026: blieb an der abgelehnten Dublette offen, Datenqualität meldete
        // das Original als „Unfall ohne Versicherungsfall“ → zweiter Fall für denselben Schaden); haben beide einen, erst klären
        const cl = (await env.DB.prepare('SELECT case_id FROM insurance_claims WHERE case_id IN (?, ?) AND environment=?').bind(c.id, o.id, envName).all()).results;
        if (cl.length === 2) throw conflict('claim_on_both', 'Beide Vorgänge haben einen Versicherungsfall – bitte zuerst klären, welcher gilt.');
        // gelesener Stand im Stapel geprüft (20.10.2026): ein gleichzeitig angelegter Fall hätte das Umhängen still verhindert („moved_claim“ trotzdem gemeldet)
        const nO = cl.filter((x) => x.case_id === o.id).length; const nC = cl.length - nO;
        extra.push(env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT CASE WHEN (SELECT COUNT(*) FROM insurance_claims WHERE case_id=?)=? AND (SELECT COUNT(*) FROM insurance_claims WHERE case_id=?)=? THEN 1 ELSE 0 END').bind(o.id, nO, c.id, nC), env.DB.prepare('DELETE FROM cmd_guard'));
        if (cl.length === 1 && cl[0].case_id === c.id) {
          payload.moved_claim = true;
          extra.push(env.DB.prepare('UPDATE insurance_claims SET case_id=?, updated_at=? WHERE case_id=? AND environment=? AND NOT EXISTS (SELECT 1 FROM insurance_claims x WHERE x.case_id=?)').bind(o.id, now, c.id, envName, o.id));
        }
        if (!note || note.length < 3) note = `Dublette von ${o.case_no}`;
      }
      requireNote('Bitte Ablehnungsgrund angeben.');
      if (c.safety_lock) throw bad('safety_lock_active', 'Vorgang mit aktiver Sicherheitssperre kann nicht abgelehnt werden. Zuerst Sperre fachlich aufheben.');
      if (!c.fleet_received_at) { set.fleet_received_at = now; set.fleet_received_by = user.id; }
      toStatus = 'abgelehnt'; set.closed_at = now;
      notifyKind = 'rejected';
      break;
    case 'withdraw_order': {
      // Werkstattauftrag ohne Reparatur beenden (Teilagent „Totalschaden“, 23.10.2026): Status „abgelehnt“ (abgeschlossen, keine technische Freigabe),
      // Grund Pflicht; Sperre und sicherheitsrelevante Restarbeiten zuerst fachlich klären (wie „Ablehnen“) – sonst führe das Fahrzeug ohne Sperre weiter.
      // Gebuchte Arbeitszeit/Teile/Fremdleistungen bleiben (Kostenbericht); offene, nicht sicherheitsrelevante Restarbeiten bleiben im Verlauf sichtbar.
      requireNote('Bitte Grund angeben, warum der Auftrag ohne Reparatur endet (z. B. Totalschaden, Verkauf).');
      if (c.safety_lock) throw bad('withdraw_locked', 'Vorgang mit aktiver Sicherheitssperre kann nicht ohne Reparatur beendet werden. Zuerst Sperre fachlich aufheben (z. B. „Fahrzeug wird außer Betrieb genommen“).');
      const safetyOpenW = await env.DB.prepare(`SELECT COUNT(*) AS n FROM open_items WHERE case_id=? AND status='offen' AND safety_relevant=1`).bind(c.id).first();
      if (safetyOpenW.n > 0) throw bad('safety_items_open', 'Es gibt offene sicherheitsrelevante Restarbeiten.');
      const openRest = await env.DB.prepare(`SELECT COUNT(*) AS n FROM open_items WHERE case_id=? AND status='offen'`).bind(c.id).first();
      payload = { from_status: c.status, open_items_left: openRest.n };
      toStatus = 'abgelehnt'; set.closed_at = now;
      notifyKind = 'withdrawn';
      break;
    }
    case 'acknowledge':
      set.workshop_ack_at = now; set.workshop_ack_by = user.id;
      // Terminänderung bei Übernahme im Verlauf festhalten (20.10.2026; vorher nur bei „Termin setzen/verschieben“)
      if (p.planned_date) { set.planned_date = planDate(p.planned_date); if (set.planned_date !== (c.planned_date || null)) payload = { planned_from: c.planned_date || null, planned_to: set.planned_date }; }
      // Backlog 263: Termin bei Übernahme verschoben → übernommener Prüftermin (gleicher Tag) zieht mit (wie set_planned_date, nur im Betrieb)
      if (set.planned_date && c.planned_date && set.planned_date !== c.planned_date && c.maintenance_rule_id && envName === 'production') extra.push(env.DB.prepare('UPDATE maintenance_rules SET planned_date=?, updated_at=? WHERE id=? AND planned_date=?').bind(set.planned_date, now, c.maintenance_rule_id, c.planned_date));
      notifyKind = 'acknowledged';
      break;
    case 'start_repair':
      if (!c.workshop_ack_at) { set.workshop_ack_at = now; set.workshop_ack_by = user.id; }
      toStatus = 'in_reparatur';
      notifyKind = 'started';
      break;
    case 'wait_parts': {
      requireNote('Bitte angeben, auf welche Teile gewartet wird.');
      // Liefertermin nur laut Lieferant/Werkstatt (optional) – die App schätzt nichts
      const eta = p.parts_expected_date ? partsDate(p.parts_expected_date) : null;
      set.parts_expected_date = eta;
      if (eta) payload = { parts_expected_date: eta };
      toStatus = 'wartet_teile';
      notifyKind = 'waiting_parts';
      break;
    }
    case 'set_parts_eta': {
      // Liefertermin setzen/verschieben/entfernen (leer); ohne Statuswechsel und ohne Push
      const eta = p.parts_expected_date ? partsDate(p.parts_expected_date) : null;
      if (eta === (c.parts_expected_date || null)) throw bad('validation', 'Liefertermin ist unverändert.');
      set.parts_expected_date = eta; payload = { from: c.parts_expected_date || null, to: eta };
      break;
    }
    case 'resume_repair':
      set.parts_expected_date = null; // Teile da – Liefertermin erledigt (bleibt im Verlauf)
      toStatus = 'in_reparatur';
      notifyKind = 'resumed';
      break;
    case 'record_work': {
      const hours = num(p.hours, { min: 0.05, max: 24, field: 'Stunden', decimalPoint: pointDec(user), decimalComma: commaDec(user) });
      const desc = str(p.description, { required: true, max: 2000, field: 'Tätigkeit' });
      const date = str(p.work_date, { max: 10 }) || berlinDate();
      if (!isCalendarDate(date)) throw bad('validation', 'Datum ungültig.');
      // Tippfehler im Jahr (2062/1926) fielen sonst aus dem Monats-Kostenbericht: nicht in der Zukunft, höchstens 1 Jahr vor der Meldung
      const earliest = addMonths(berlinDate(c.created_at), -12);
      if (date > berlinDate() || date < earliest) throw bad('validation', `Arbeitsdatum: nicht in der Zukunft und nicht vor dem ${earliest.split('-').reverse().join('.')}.`);
      // höchstens 24 Stunden je Benutzerkonto und Arbeitstag über alle Vorgänge (vorher 3 × 24 h am selben Tag möglich, 17.10.2026) – Vorprüfung
      // für die verständliche Meldung, Prüfung im Stapel gegen gleichzeitige Buchungen
      const dayH = await workHoursOn(env, user.id, date);
      if (dayH + hours > 24 + 1e-9) throw bad('validation', workDayMsg(date, dayH));
      const wid = uuid();
      // Standort zum Buchungszeitpunkt (Werkstatt-Auslastung bleibt nach einem Werkstattwechsel bei der buchenden Werkstatt, Migration 0060)
      extra.push(env.DB.prepare('INSERT INTO work_entries(id,case_id,user_id,work_date,hours,description,created_at,site) VALUES (?,?,?,?,?,?,?,?)')
        .bind(wid, c.id, user.id, date, hours, desc, now, c.workshop_site || null),
        env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT CASE WHEN COALESCE(SUM(hours),0) <= 24.000000001 THEN 1 ELSE 0 END FROM work_entries WHERE user_id=? AND work_date=?').bind(user.id, date),
        env.DB.prepare('DELETE FROM cmd_guard'));
      workGuard = { date, hours };
      payload = { work_entry_id: wid, hours, work_date: date, description: desc };
      break;
    }
    case 'add_part': {
      const qty = Math.round(num(p.quantity ?? 1, { min: 0.001, max: 100000, field: 'Menge', decimalComma: commaDec(user), decimalPoint: pointDec(user) }) * 1000) / 1000; // 3 Nachkommastellen wie das Lager
      const pid = uuid();
      let stockItem = null;
      // Preis aus dem Lager: hinterlegter Artikelpreis gilt für Teil und Lagerbuchung; nur ohne Artikelpreis der eingegebene – für beide
      // (18.10.2026: Eingabe landete nur im Teil, Journal blieb „unbewertet“ bzw. beim Artikelpreis; Regel wie die Entnahme im Lager)
      const inPrice = num(p.unit_price_net === '' ? null : p.unit_price_net, { min: 0, max: 1000000, field: 'Preis', nullable: true, decimalComma: commaDec(user), decimalPoint: pointDec(user) });
      if (p.stock_item_id) {
        const w = await prepareCaseWithdrawal(env, user, envName, c, str(p.stock_item_id, { max: 40 }), qty, pid, inPrice, now);
        stockItem = w.item;
        extra.push(w.stmt, ...w.guard); stockGuardItem = { id: w.item.id, qty, unit: w.item.unit };
      }
      const name = stockItem ? stockItem.name : str(p.name, { required: true, max: 200, field: 'Teil' });
      const price = stockItem && stockItem.unit_price_net !== null && stockItem.unit_price_net !== undefined ? stockItem.unit_price_net : inPrice;
      // Lagerartikel mit hinterlegtem Preis: Wert steht fest (Lagerjournal bucht ihn als tatsächlich) – nie „Schätzung“
      // (22.10.2026: Teil zählte als Schätzung, die Entnahme im Lagerjournal als tatsächlicher Wert)
      const stockPriced = !!stockItem && stockItem.unit_price_net !== null && stockItem.unit_price_net !== undefined;
      const valuation = price === null ? 'unvalued' : stockPriced ? (oneOf(p.valuation || 'actual', ['actual', 'estimate'], 'Wertart'), 'actual') : oneOf(p.valuation || 'actual', ['actual', 'estimate'], 'Wertart');
      const warranty = warrantyDate(p.warranty_until);
      extra.push(env.DB.prepare(`INSERT INTO parts(id,case_id,user_id,name,part_number,quantity,unit,unit_price_net,valuation,supplier,document_ref,stock_item_id,created_at,warranty_until)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(pid, c.id, user.id, name, stockItem ? stockItem.part_number : str(p.part_number, { max: 80 }), qty,
        stockItem ? stockItem.unit : (str(p.unit, { max: 20 }) || 'Stk'), price, valuation, stockItem ? `Lager ${stockItem.site}` : str(p.supplier, { max: 120 }),
        str(p.document_ref, { max: 200 }), stockItem ? stockItem.id : null, now, warranty));
      payload = { part_id: pid, name, quantity: qty, unit_price_net: price, valuation, stock_item_id: stockItem ? stockItem.id : null, ...(warranty ? { warranty_until: warranty } : {}) };
      break;
    }
    case 'add_open_item': {
      const desc = str(p.description, { required: true, max: 2000, field: 'Restarbeit' });
      const oid = uuid();
      // Foto/PDF zum Befund (Backlog 261): optional eine Datei dieses Vorgangs derselben Umgebung
      let oiFile = null;
      if (p.file_id !== undefined && p.file_id !== null && p.file_id !== '') {
        oiFile = await env.DB.prepare('SELECT id FROM files WHERE id=? AND case_id=? AND environment=?').bind(str(p.file_id, { max: 40, field: 'Datei' }), c.id, envName).first();
        if (!oiFile) throw bad('validation', 'Datei: bitte eine Datei dieses Vorgangs wählen.');
      }
      extra.push(env.DB.prepare(`INSERT INTO open_items(id,case_id,description,safety_relevant,status,created_by,created_at,file_id) VALUES (?,?,?,?,'offen',?,?,?)`)
        .bind(oid, c.id, desc, flag(p.safety_relevant, 'Sicherheitsrelevant') ? 1 : 0, user.id, now, oiFile ? oiFile.id : null));
      payload = { open_item_id: oid, description: desc, safety_relevant: flag(p.safety_relevant, 'Sicherheitsrelevant'), ...(oiFile ? { file_id: oiFile.id } : {}) };
      // Hinweis nach dem geprüften Wert (17.10.2026: „false“/„0“ wurden als nicht sicherheitsrelevant gespeichert, lösten aber den Sicherheits-Push aus)
      // Backlog 259 (Blickwinkel „Werkstatt findet bei der Reparatur einen zusätzlichen Schaden“): auch ein nicht dringender Zusatzbefund der
      // Werkstatt erreicht die Leitung (abschaltbar) – vorher erfuhr sie davon erst beim Öffnen des Vorgangs
      notifyKind = payload.safety_relevant ? 'open_item_safety' : user.role === 'workshop' ? 'open_item' : null;
      break;
    }
    case 'resolve_open_item': {
      const oid = str(p.open_item_id, { required: true, max: 40, field: 'Restarbeit' });
      const oi = await env.DB.prepare(`SELECT * FROM open_items WHERE id=? AND case_id=? AND status='offen'`).bind(oid, c.id).first();
      if (!oi) throw bad('validation', 'Restarbeit nicht gefunden oder bereits erledigt.');
      requireNote('Bitte Erledigungsvermerk angeben.');
      extra.push(env.DB.prepare(`UPDATE open_items SET status='erledigt', resolved_by=?, resolved_at=?, resolution_note=? WHERE id=?`).bind(user.id, now, note, oid));
      payload = { open_item_id: oid, ...(oi.safety_relevant ? { safety_relevant: true, description: cutText(oi.description, 200) } : {}) };
      // Backlog 259: sicherheitsrelevante Restarbeit von der Werkstatt erledigt → Leitung erfährt es (nicht abschaltbar; sie gibt danach frei)
      if (oi.safety_relevant && user.role === 'workshop') notifyKind = 'open_item_safety_resolved';
      break;
    }
    case 'add_external_cost': {
      const supplier = str(p.supplier, { required: true, max: 120, field: 'Lieferant' });
      const amount = num(p.amount_net, { min: 0, max: 10000000, field: 'Betrag', nullable: true, cents: true, decimalPoint: pointDec(user), decimalComma: commaDec(user) });
      const valuation = amount === null ? 'unvalued' : oneOf(p.valuation || 'actual', ['actual', 'estimate'], 'Wertart');
      const eid = uuid();
      const warranty = warrantyDate(p.warranty_until);
      // Doppelte Rechnung (Backlog 233): gleiche Rechnungsnummer schon als Fremdleistung gebucht (dieser oder ein anderer Vorgang derselben
      // Umgebung) → Hinweis mit Fundstellen, Buchung nur nach ausdrücklicher Bestätigung (Sammelrechnung für mehrere Fahrzeuge ist zulässig).
      // Fremdleistungen buchen nur Inhaber/Fuhrparkleitung (sehen alle Vorgänge und Kosten).
      const invNo0 = str(p.invoice_no, { max: 60 });
      const dupConfirmed = flag(p.confirm_duplicate_invoice, 'Bestätigung');
      if (invNo0 && !dupConfirmed) {
        const rows = (await env.DB.prepare(`SELECT c.id AS case_id, c.case_no, e.supplier, e.amount_net, e.created_at FROM external_costs e JOIN cases c ON c.id=e.case_id
          WHERE e.invoice_no = ?1 COLLATE NOCASE AND c.environment=?2 ORDER BY e.created_at LIMIT 10`).bind(invNo0, envName).all()).results;
        if (rows.length) {
          const matches = rows.map((r) => ({ case_no: r.case_no, case_id: r.case_id, supplier: r.supplier, amount_net: r.amount_net, booked_at: r.created_at, same_case: r.case_id === c.id }));
          throw bad('duplicate_invoice', 'Diese Rechnungsnummer ist bereits als Fremdleistung erfasst. Bitte prüfen (doppelte Buchung?) und nur bei Bedarf ausdrücklich bestätigen, z. B. bei einer Sammelrechnung für mehrere Fahrzeuge.', { invoice_no: invNo0, matches });
        }
      }
      // Beleg (Backlog 224): optional eine Datei dieses Vorgangs derselben Umgebung (Kostenvoranschlag/Rechnung als PDF oder Foto)
      let ecFile = null;
      if (p.file_id !== undefined && p.file_id !== null && p.file_id !== '') {
        ecFile = await env.DB.prepare('SELECT id, filename FROM files WHERE id=? AND case_id=? AND environment=?').bind(str(p.file_id, { max: 40, field: 'Datei' }), c.id, envName).first();
        if (!ecFile) throw bad('validation', 'Datei: bitte eine Datei dieses Vorgangs wählen.');
      }
      extra.push(env.DB.prepare(`INSERT INTO external_costs(id,case_id,user_id,supplier,invoice_no,amount_net,valuation,covers_work_and_parts,note,created_at,warranty_until,file_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(eid, c.id, user.id, supplier, str(p.invoice_no, { max: 60 }), amount, valuation, flag(p.covers_work_and_parts, 'Ersetzt eigene Arbeit/Teile') ? 1 : 0, note, now, warranty, ecFile ? ecFile.id : null));
      const covers = flag(p.covers_work_and_parts, 'Ersetzt eigene Arbeit/Teile');
      // Verlauf nennt Schalter und Rechnungsnummer: nachvollziehbar, ab wann eigene Stunden/Teile nicht mehr zählen (23.10.2026)
      const invNo = str(p.invoice_no, { max: 60 });
      payload = { external_cost_id: eid, supplier, amount_net: amount, valuation, ...(warranty ? { warranty_until: warranty } : {}), ...(covers ? { covers_work_and_parts: true } : {}), ...(invNo ? { invoice_no: invNo } : {}), ...(invNo && dupConfirmed ? { duplicate_invoice_confirmed: true } : {}), ...(ecFile ? { file_id: ecFile.id, file_name: ecFile.filename } : {}) };
      break;
    }
    case 'approve_costs': {
      // Kostenfreigabe über der eingestellten Grenze: gilt für den aktuellen Betrag; steigen die Kosten darüber, ist erneut eine Freigabe nötig
      if (!c.cost_over_limit_at) throw bad('validation', 'Keine Kostenfreigabe ausstehend.');
      requireNote('Bitte Freigabevermerk angeben (z. B. Umfang, Rücksprache).');
      const k = await caseCosts(env, c.id);
      const total = round2(k.actual_net + k.estimate_net);
      set.cost_approved_net = total; set.cost_over_limit_at = null;
      payload = { approved_net: total, limit_net: await costLimit(env), unvalued_items: k.unvalued_items };
      notifyKind = 'cost_approved';
      break;
    }
    case 'request_quality_check': {
      const w = await env.DB.prepare('SELECT COUNT(*) AS n FROM work_entries WHERE case_id=?').bind(c.id).first();
      const x = await env.DB.prepare('SELECT COUNT(*) AS n FROM external_costs WHERE case_id=?').bind(c.id).first();
      if (w.n + x.n === 0) throw bad('work_missing', 'Bitte zuerst durchgeführte Arbeiten (Stunden) oder eine Fremdleistung dokumentieren.');
      const insp = await repairInspection(env, c.id);
      if (!insp.latest) throw bad('inspection_missing', 'Bitte zuerst die Fahrzeugkontrolle nach der Reparatur durchführen.');
      if (!insp.current) throw bad('inspection_after_rework_missing', 'Nach der Nacharbeit ist eine neue Fahrzeugkontrolle nach der Reparatur nötig.');
      const so = await env.DB.prepare(`SELECT COUNT(*) AS n FROM open_items WHERE case_id=? AND status='offen' AND safety_relevant=1`).bind(c.id).first();
      if (so.n > 0) throw bad('safety_items_open', 'Offene sicherheitsrelevante Restarbeiten verhindern die Abschlusskontrolle.');
      requireNote('Bitte kurz zusammenfassen, was repariert wurde.');
      // Winterreifen-Auftrag: Winterlage laut Reifenerfassung noch nicht erfüllt → nur mit ausdrücklicher Bestätigung (keine Sperre, Grund steht im Vermerk)
      if (c.tire_order === 'winter') {
        const w = await caseWinter(env, c);
        // keine Winterpflicht (z. B. Fahrzeugart inzwischen Anhänger): nichts zu bestätigen (21.10.2026: 400 winter_open trotz fehlender Pflicht)
        if (!['erfuellt', 'nicht_pflichtig'].includes(w.status) && !flag(p.confirm_winter_open, 'Bestätigung')) throw bad('winter_open', 'Winterreifen laut Reifenerfassung noch nicht erfüllt. Bitte zuerst die Reifen mit Winterkennzeichnung erfassen – oder ausdrücklich bestätigen, dass ohne vollständige Erfassung abgeschlossen wird (Grund im Vermerk).');
        payload = { winter_status: w.status, ...(!['erfuellt', 'nicht_pflichtig'].includes(w.status) ? { winter_open_confirmed: true, noncompliant: w.noncompliant, missing: w.missing } : {}) };
      }
      toStatus = 'abschlusskontrolle';
      notifyKind = 'quality_check';
      break;
    }
    case 'return_for_rework':
      requireNote('Bitte Grund für die Nacharbeit angeben.');
      toStatus = 'in_reparatur';
      notifyKind = 'rework';
      break;
    case 'technical_release': {
      requireNote('Bitte Kontrollnachweis eintragen.');
      if (!flag(p.confirm, 'Bestätigung')) throw bad('confirm_required', 'Technische Freigabe muss ausdrücklich bestätigt werden.');
      // Grenze erst nach der letzten Buchung überschritten (Stundensatz erhöht, Grenze gesenkt, Satz nachgetragen – 18.10.2026: Freigabe
      // ohne Kostenfreigabe möglich): jetzt markieren (Hinweis an die Leitung) und die Freigabe abweisen
      // Markierung aus einer früheren Grenze/einem höheren Stundensatz: erst neu bewerten (Versions-Guard: neu laden, dann freigeben)
      if (c.cost_over_limit_at && (await revalidateCostMarks(env, user.id, [c.id])).length) throw conflict('version_conflict', 'Kostenfreigabe nicht mehr nötig – bitte neu laden und erneut freigeben.');
      if (c.cost_over_limit_at || await checkCostLimit(env, ctx, user, envName, c)) throw bad('cost_approval_open', 'Kostenfreigabe ausstehend – bitte zuerst „Kosten freigeben“ (oder mit der Werkstatt klären), dann das Fahrzeug freigeben.');
      const so = await env.DB.prepare(`SELECT COUNT(*) AS n FROM open_items WHERE case_id=? AND status='offen' AND safety_relevant=1`).bind(c.id).first();
      if (so.n > 0) throw bad('safety_items_open', 'Offene sicherheitsrelevante Restarbeiten – keine Freigabe möglich.');
      const insp = await repairInspection(env, c.id);
      if (!insp.latest) throw bad('inspection_missing', 'Fahrzeugkontrolle nach Reparatur fehlt.');
      if (!insp.current) throw bad('inspection_after_rework_missing', 'Nach der Nacharbeit ist eine neue Fahrzeugkontrolle nach der Reparatur nötig.');
      toStatus = 'fahrzeug_freigegeben'; set.closed_at = now; set.safety_lock = 0; set.safety_lock_reason = null;
      const nonSafety = await env.DB.prepare(`SELECT COUNT(*) AS n FROM open_items WHERE case_id=? AND status='offen'`).bind(c.id).first();
      payload = { remaining_open_items: nonSafety.n };
      notifyKind = 'released';
      break;
    }
    default:
      throw bad('unknown_action', 'Unbekannte Aktion.');
  }
  // Werkstatt bucht vor „Übernehmen“ (Arbeitszeit/Teil/Restarbeit): gilt als übernommen – sonst blieb der Auftrag unter „Neu – bitte
  // übernehmen“ und der Agent meldete „nicht übernommen“ (bei kritisch als Eskalation), obwohl schon gearbeitet wird (20.10.2026)
  if (user.role === 'workshop' && c.status === 'werkstatt_freigegeben' && !c.workshop_ack_at && ['record_work', 'add_part', 'add_open_item'].includes(action) && !set.workshop_ack_at) {
    set.workshop_ack_at = now; set.workshop_ack_by = user.id; payload = { ...(payload || {}), implicit_ack: true };
    if (!notifyKind) notifyKind = 'acknowledged';
  }

  const newVersion = c.version + 1;
  // abgeschlossen/abgelehnt: Wiedervorlage endet (blieb sonst in API/CSV stehen und war nicht mehr entfernbar, 17.10.2026)
  if (!OPEN_STATUSES.includes(toStatus) && (c.followup_on || c.followup_note)) { set.followup_on = null; set.followup_note = null; }
  set.status = toStatus; set.version = newVersion; set.updated_at = now;
  const cols = Object.keys(set);
  const upd = env.DB.prepare(`UPDATE cases SET ${cols.map((k) => `${k}=?`).join(', ')} WHERE id=? AND version=?`)
    .bind(...cols.map((k) => set[k]), c.id, c.version);
  const ev = env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,command_id,created_at,command_hash)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM cases WHERE id=? AND version=?)`)
    .bind(uuid(), c.id, envName, user.id, user.role, action, c.status, toStatus, c.version, newVersion, note, JSON.stringify(payload), commandId, now, commandHash, c.id, newVersion);
  // Guard: schlägt fehl (CHECK), wenn das UPDATE keine Zeile getroffen hat -> gesamte Transaktion wird zurückgerollt
  const guard = env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()');
  const cleanup = env.DB.prepare('DELETE FROM cmd_guard');
  try {
    await env.DB.batch([upd, guard, cleanup, ev, ...extra]);
  } catch (e) {
    // gleiche command_id gleichzeitig (Netzwiederholung): der erste Stapel hat die Version schon erhöht, der zweite scheitert am
    // Versions-Guard vor dem UNIQUE der command_id → als Wiederholung melden, nicht als Konflikt/Bestand/Tagesgrenze (18.10.2026)
    if (commandId && String(e && e.message).includes('CHECK')
      && await env.DB.prepare('SELECT 1 FROM case_events WHERE case_id=? AND command_id=? AND action=?').bind(c.id, commandId, action).first()) return { ok: true, duplicate: true };
    // Lagerentnahme im selben Stapel: parallel anderweitig entnommen → Bestand reicht nicht (statt „Vorgang geändert“)
    if (String(e && e.message).includes('CHECK') && stockGuardItem && (await onHand(env, stockGuardItem.id)) < stockGuardItem.qty) {
      { const av = await onHand(env, stockGuardItem.id); throw bad('insufficient_stock', `Bestand reicht nicht (verfügbar: ${deQty(av)} ${stockGuardItem.unit}). Zugang buchen oder Teil ohne Lager erfassen.`, { available: av, unit: stockGuardItem.unit, no_stock_hint: true }); }
    }
    if (String(e && e.message).includes('CHECK') && workGuard) {
      const dayH = await workHoursOn(env, user.id, workGuard.date);
      if (dayH + workGuard.hours > 24 + 1e-9) throw bad('validation', workDayMsg(workGuard.date, dayH));
    }
    if (String(e && e.message).includes('CHECK')) {
      throw conflict('version_conflict', 'Der Vorgang wurde zwischenzeitlich geändert. Bitte neu laden.');
    }
    if (String(e && e.message).includes('UNIQUE') && String(e.message).includes('command_id')) {
      return { ok: true, duplicate: true };
    }
    throw e;
  }
  // Kennzeichen gleich mitladen: spart der Benachrichtigung eine eigene Abfrage
  const updated = await env.DB.prepare('SELECT c.*, v.plate AS v_plate FROM cases c LEFT JOIN vehicles v ON v.id=c.vehicle_id WHERE c.id=?').bind(c.id).first();
  const vPlate = updated.v_plate; delete updated.v_plate;
  // Freigabe/Aufhebung: sperrt ein weiterer offener Vorgang das Fahrzeug oder das fest gekoppelte Gespann, keine „freigegeben“-Meldung
  const still_locked = ['released', 'safety_lock_lifted'].includes(notifyKind) ? await otherLockCaseNo(env, updated) : null;
  const sent = notifyKind ? await notifyCaseEvent(env, ctx, updated, notifyKind, { actor: user, note, payload, previous: c, vehicle: { plate: vPlate }, still_locked }) : null;
  // Fahrzeug korrigiert (Backlog 254): Fahrer/Disposition des falschen Fahrzeugs erfahren, dass die Sperre dort nicht mehr gilt
  // (außer ein anderer offener Vorgang sperrt es weiter – dann „bleibt gesperrt“)
  if (action === 'correct_vehicle' && (c.safety_lock || payload.lock_case_id)) {
    // Backlog 255: sperrt nur ein weiterer Mangel derselben Kontrolle, gehen beide Pushs mit diesem Vorgang
    const lc = payload.lock_case_id ? await env.DB.prepare('SELECT * FROM cases WHERE id=?').bind(payload.lock_case_id).first() : null;
    if (lc) await notifyCaseEvent(env, ctx, lc, 'safety_lock', { actor: user, note, payload, previous: { ...lc, vehicle_id: c.vehicle_id }, vehicle: { plate: payload.to } });
    const base = lc || updated;
    const old = { ...base, vehicle_id: c.vehicle_id, safety_lock: 0 };
    await notifyCaseEvent(env, ctx, old, 'safety_lock_lifted', { actor: user, note, payload, previous: lc ? { ...lc, vehicle_id: c.vehicle_id } : c, vehicle: { plate: payload.from }, still_locked: await otherLockCaseNo(env, old) });
  }
  // Kommentar ohne jeden Empfänger (z. B. nur „Gemeldet von“ an einen deaktivierten Melder): gespeichert, aber niemand informiert (Backlog 249)
  const noRecipients = action === 'comment' && sent === 0;
  const cost_limit_exceeded = COST_ACTIONS.includes(action) ? await checkCostLimit(env, ctx, user, envName, updated) : undefined;
  // schon markiert und Kosten jetzt nicht mehr über der Schwelle (z. B. Fremdleistung „ersetzt eigene Arbeit/Teile“): Markierung aufheben
  // (21.10.2026: „Kostenfreigabe ausstehend“ blieb stehen, technische Freigabe endete mit 409)
  const cost_limit_cleared = COST_ACTIONS.includes(action) && updated.cost_over_limit_at ? (await revalidateCostMarks(env, user.id, [c.id])).length > 0 : false;
  // Kostengrenze überschritten bzw. Markierung aufgehoben → Version um 1 erhöht; Antwort nennt diese (18.10.2026: sonst 409 beim nächsten Befehl)
  const version = cost_limit_exceeded || cost_limit_cleared ? newVersion + 1 : newVersion;
  return { ok: true, version, status: toStatus, ...(cost_limit_exceeded ? { cost_limit_exceeded: true } : {}), ...(cost_limit_cleared ? { cost_limit_cleared: true } : {}), ...(noWorkshopUser && !externalWs ? { no_workshop_user: true } : {}), ...(noWorkshopUser && externalWs ? { external_workshop: true } : {}), ...(noRecipients ? { no_recipients: true } : {}) };
}

// Verlaufseintrag „Abfahrtskontrolle trotz Sicherheitssperre“ an jedem zum Zeitpunkt `performedAt` gesperrten Vorgang des Fahrzeugs (Backlog 252);
// auch beim Umhängen einer Kontrolle an das richtige Fahrzeug (Backlog 255, `extra` z. B. { moved: true })
function checkedWhileLockedStmt(env, envName, user, inspId, performedAt, odo, vehicleId, now, extra = {}) {
  return env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
    SELECT lower(hex(randomblob(16))), x.id, ?1, ?2, ?3, 'checked_while_locked', x.status, x.status, x.version, x.version, ?4, ?5, ?6 FROM (
      SELECT c.id, c.status, c.version, (SELECT MAX(e.created_at) FROM case_events e WHERE e.case_id=c.id AND e.created_at <= ?7
        AND (e.action='set_safety_lock' OR (e.action='create' AND json_extract(e.payload,'$.safety_lock')))) AS s
      FROM cases c WHERE c.environment=?1 AND c.vehicle_id=?8 AND c.created_at < ?7) x
    WHERE x.s IS NOT NULL AND NOT EXISTS (SELECT 1 FROM case_events e WHERE e.case_id=x.id AND e.created_at > x.s AND e.created_at <= ?7
      AND (e.action='lift_safety_lock' OR e.to_status IN ('fahrzeug_freigegeben','abgelehnt')))`)
    .bind(envName, user.id, user.role, `Abfahrtskontrolle trotz Sicherheitssperre${odo !== null && odo !== undefined ? ` · km-Stand ${odo}` : ''}`,
      JSON.stringify({ inspection_id: inspId, code: 'departure_check_while_locked', performed_at: performedAt, ...(odo !== null && odo !== undefined ? { km: odo } : {}), ...extra }), now, performedAt, vehicleId);
}

// gebuchte Arbeitsstunden einer Person an einem Tag über alle Vorgänge (Tagesgrenze 24 h)
async function workHoursOn(env, userId, date) {
  const r = await env.DB.prepare('SELECT COALESCE(SUM(hours),0) AS h FROM work_entries WHERE user_id=? AND work_date=?').bind(userId, date).first();
  // ungerundet: Vorprüfung und Stapel-Guard müssen dieselbe Summe vergleichen (23.10.2026: 8,002 + 8,002 + 8 h → endloser „Vorgang geändert“)
  return r ? Number(r.h) || 0 : 0;
}
// je Benutzerkonto (ein geteiltes Werkstatt-Tablet = ein Konto für mehrere Mechaniker, 23.10.2026) – gerundet nur für den Text
const workDayMsg = (date, h) => `Höchstens 24 Stunden je Benutzerkonto und Arbeitstag – am ${date.split('-').reverse().join('.')} sind bereits ${String(Math.round(h * 100) / 100).replace('.', ',')} h erfasst.`;

// ---------- Fahrzeugkontrolle nach Reparatur / Abfahrtskontrolle ----------

export const CHECKLIST_VERSION = '2026-10-v1';
export const CHECKLIST = [
  { key: 'beleuchtung', group: 'Licht & Elektrik' },
  { key: 'blinker_warnblinker', group: 'Licht & Elektrik' },
  { key: 'bremsleuchten', group: 'Licht & Elektrik' },
  { key: 'kontrollleuchten', group: 'Licht & Elektrik' },
  { key: 'bremsen_funktion', group: 'Bremsen' },
  { key: 'bremsluft_dicht', group: 'Bremsen' },
  { key: 'reifen_zustand', group: 'Räder & Reifen' },
  { key: 'reifendruck', group: 'Räder & Reifen' },
  { key: 'radmuttern', group: 'Räder & Reifen' },
  { key: 'lenkung', group: 'Fahrwerk' },
  { key: 'fluessigkeiten', group: 'Motor' },
  { key: 'leckagen', group: 'Motor' },
  { key: 'spiegel_scheiben_wischer', group: 'Sicht' },
  { key: 'ladungssicherung_auffahrten', group: 'Aufbau (Autotransporter)' },
  { key: 'hydraulik_ladeetagen', group: 'Aufbau (Autotransporter)' },
  { key: 'kupplung_anhaenger', group: 'Anhänger' },
  { key: 'sicherheitsausruestung', group: 'Ausrüstung' },
  { key: 'probefahrt', group: 'Abschluss' },
];

export async function submitInspection(env, ctx, user, envName, body, retried = false) {
  const kind = oneOf(body.kind, ['nach_reparatur', 'abfahrt'], 'Kontrollart');
  const requestKey = str(body.request_key, { required: true, max: 64, field: 'request_key' });
  const id = 'insp-' + (await sha256Hex(`${user.id}:${requestKey}`)).slice(0, 32);
  // Wiederholung (Antwort ging verloren, Postausgang sendet erneut): dieselben Folgeaufträge wie beim ersten Senden zurückgeben –
  // sonst ließen sich die Fotos nicht mehr anhängen (17.10.2026). Vor allen Zustandsprüfungen: eine bereits gespeicherte Kontrolle wurde
  // sonst abgewiesen, wenn das Fahrzeug inzwischen außer Betrieb war, die Durchführung > 7 Tage zurücklag oder der Vorgang weiter war (20.10.2026)
  // Fahrer: erneut festgestellter Mangel am Vorgang eines anderen Fahrers → nur Nummer und „bereits gemeldet“, keine Kennung (21.10.2026)
  const fuForUser = (f) => (f && user.role === 'driver' && f.repeat && !f.own ? { case_no: f.case_no, duplicate: true, repeat: true } : f);
  const asDuplicate = (already) => {
    let its = []; try { its = JSON.parse(already.items || '[]') || []; } catch { its = []; }
    const fu = its.filter((i) => i && i.result === 'mangel' && i.followup_case_id).map((i) => ({ id: i.followup_case_id, case_no: i.followup_case_no, duplicate: true, ...(i.repeat ? { repeat: true } : {}), ...(i.repeat_own ? { own: true } : {}) }));
    return { id, result: already.result, followups: fu.map(fuForUser), duplicate: true };
  };
  {
    const already = await env.DB.prepare('SELECT id, result, items FROM inspections WHERE id=?').bind(id).first();
    if (already) return asDuplicate(already);
  }
  let c = null;
  let vehicleId;
  if (kind === 'nach_reparatur') {
    const caseId = str(body.case_id, { required: true, max: 40, field: 'Vorgang' });
    const loaded = await loadCase(env, user, envName, caseId);
    c = loaded.c;
    if (!allowedActions(user, c, loaded.access).includes('inspection')) throw forbidden('Kontrolle nach Reparatur ist nur im Status „in Reparatur“ durch die zuständige Werkstatt möglich.', { denied: 'inspection_not_allowed', status: c.status });
    vehicleId = c.vehicle_id;
  } else {
    if (!['driver', 'fleet', 'owner', 'workshop'].includes(user.role)) throw forbidden();
    vehicleId = str(body.vehicle_id, { required: true, max: 40, field: 'Fahrzeug' });
    const v = await env.DB.prepare('SELECT id, active FROM vehicles WHERE id=?').bind(vehicleId).first();
    // inzwischen außer Betrieb genommen (Offline-Kontrolle): eigene Meldung wie bei Schadensmeldungen (19.10.2026)
    if (!v || !v.active) throw bad('validation', v ? 'Fahrzeug ist außer Betrieb.' : 'Fahrzeug unbekannt.');
  }
  const keys = new Set(CHECKLIST.map((i) => i.key));
  const items = Array.isArray(body.items) ? body.items : [];
  // Offline erfasste Kontrolle mit älterer Prüfliste (App-Fassung gewechselt, bevor sie gesendet wurde): eigener Grund statt
  // „Bitte alle Prüfpunkte bewerten“ – der Fahrer hatte alle Punkte bewertet (22.10.2026). Nur wenn die Punkte wirklich nicht passen.
  if (typeof body.checklist_version === 'string' && body.checklist_version !== CHECKLIST_VERSION) {
    const sent = new Set(items.map((it) => it && it.key));
    if (sent.size !== keys.size || [...sent].some((k) => !keys.has(k))) throw bad('checklist_changed', 'Die Prüfliste wurde inzwischen geändert – bitte die Kontrolle neu durchführen.');
  }
  const byKey = new Map();
  for (const it of items) {
    if (!it || typeof it !== 'object') throw bad('validation', 'Ungültiger Prüfpunkt.'); // null/Zahl → 400 statt 500 (17.10.2026)
    if (!keys.has(it.key)) throw bad('validation', `Unbekannter Prüfpunkt ${it.key}.`);
    const result = oneOf(it.result, ['ok', 'mangel', 'na'], 'Prüfergebnis');
    const note = str(it.note, { max: 1000 });
    if (result === 'mangel' && (!note || note.length < 3)) throw bad('validation', 'Jeder Mangel braucht eine kurze Beschreibung.');
    byKey.set(it.key, { key: it.key, result, note, safety_relevant: flag(it.safety_relevant, 'Sicherheitsrelevant'), followup_priority: it.followup_priority && PRIORITIES.includes(it.followup_priority) ? it.followup_priority : null });
  }
  if (byKey.size !== keys.size) throw bad('incomplete', 'Bitte alle Prüfpunkte bewerten (OK / Mangel / entfällt).');
  const odo = body.odometer_km === undefined || body.odometer_km === null || body.odometer_km === '' ? null : kmNum(body.odometer_km);
  const defects = [...byKey.values()].filter((i) => i.result === 'mangel');
  // Vermerk vor dem Anlegen der Folgeaufträge prüfen (17.10.2026: zu langer Vermerk → 400 erst nach dem Anlegen; gesperrter Folgeauftrag ohne Kontrolle)
  const inspNote = str(body.note, { max: 2000, field: 'Bemerkung' });
  const now = nowIso();
  // Offline gespeicherte Abfahrtskontrolle (17.10.2026): Postausgang sendet den Zeitpunkt der Durchführung mit (`performed_at`).
  // Übernommen, wenn plausibel: nicht in der Zukunft (Uhr des Geräts vorgehend → jetzt), höchstens 7 Tage alt (älter → 400,
  // die Kontrolle ist dann nicht mehr aussagekräftig). Kontrolle und km-Stand tragen dann diesen Zeitpunkt.
  let performedAt = now;
  if (kind === 'abfahrt' && body.performed_at !== undefined && body.performed_at !== null && body.performed_at !== '') {
    const raw = String(body.performed_at);
    let ms = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) ? Date.parse(raw) : NaN;
    if (!Number.isFinite(ms)) throw bad('validation', 'Durchführungszeitpunkt ungültig.');
    const nowMs = Date.parse(now);
    // Uhr des Geräts geht falsch (22.10.2026): Postausgang sendet zusätzlich die Gerätezeit beim Senden (`client_now`). Die
    // Abweichung zur Serverzeit wird herausgerechnet – sonst wurde eine Kontrolle bei nachgehender Uhr zurückdatiert (richtiger
    // km-Stand als „größer als später erfasst“ abgewiesen, „letzte Kontrolle“ gestern) bzw. bei > 7 Tagen dauerhaft abgewiesen.
    // Abweichungen unter 2 Min. (Übertragungszeit) bleiben unberücksichtigt; danach gelten dieselben Grenzen.
    let skewMs = 0;
    if (body.client_now !== undefined && body.client_now !== null && body.client_now !== '') {
      const cr = String(body.client_now);
      const cms = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(cr) ? Date.parse(cr) : NaN;
      if (!Number.isFinite(cms)) throw bad('validation', 'Gerätezeit ungültig.');
      if (Math.abs(nowMs - cms) > 120000) skewMs = nowMs - cms;
    }
    if (skewMs) ms += skewMs;
    if (ms < nowMs - 7 * 86400000) throw bad('validation', 'Die Kontrolle liegt mehr als 7 Tage zurück und wird nicht mehr übernommen. Bitte neu durchführen.');
    if (ms < nowMs) performedAt = new Date(ms).toISOString();
  }

  // Folgeaufträge für jeden Mangel (eigener Vorgang, mit Bezug) – gesammelt angelegt (Abfragezahl unabhängig von der Mängelzahl)
  const followups = [];
  const repeats = [];
  const RANK = { niedrig: 0, mittel: 1, kritisch: 2 };
  // Abfahrtskontrolle: derselbe Prüfpunkt hat bereits einen offenen Folgeauftrag → kein neuer Vorgang, sondern Vermerk dort.
  // Nur wenn der offene Vorgang mindestens so dringend ist; ein sicherheitsrelevanter Mangel braucht dort eine aktive Sperre.
  const openByItem = new Map(); // Prüfpunkt → offene Vorgänge (jüngste zuerst)
  if (kind === 'abfahrt' && defects.length) {
    // + offenes Original eines als Dublette abgelehnten Kontroll-Vorgangs desselben Prüfpunkts (21.10.2026: nach „Dublette“ legte jede weitere
    // Kontrolle wieder einen neuen – ggf. gesperrten – Vorgang an)
    for (const r of (await env.DB.prepare(`SELECT * FROM (SELECT id, case_no, priority, safety_lock, status, version, check_item, reporter_id=?1 AS own, created_at FROM cases WHERE vehicle_id=?2 AND environment=?3 AND origin='kontrolle'
      AND check_item IN (SELECT value FROM json_each(?4)) AND status NOT IN ('fahrzeug_freigegeben','abgelehnt')
      UNION SELECT o.id, o.case_no, o.priority, o.safety_lock, o.status, o.version, d.check_item, o.reporter_id=?1 AS own, o.created_at FROM cases d JOIN cases o ON o.id=d.duplicate_of
      WHERE d.vehicle_id=?2 AND d.environment=?3 AND d.origin='kontrolle' AND d.status='abgelehnt' AND d.check_item IN (SELECT value FROM json_each(?4))
      AND o.environment=?3 AND o.vehicle_id=?2 AND o.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) ORDER BY created_at DESC`).bind(user.id, vehicleId, envName, JSON.stringify(defects.map((d) => d.key))).all()).results) {
      if (!openByItem.has(r.check_item)) openByItem.set(r.check_item, []); openByItem.get(r.check_item).push(r);
    }
  }
  // Kontrolle nach Reparatur (z. B. neue Pflicht-Kontrolle nach Nacharbeit): offener Folgeauftrag desselben Ursprungsvorgangs und Prüfpunkts
  // → Vermerk dort statt zweitem Folgeauftrag (21.10.2026: Nebenmangel ergab nach Nacharbeit T-0002 und T-0003)
  if (kind === 'nach_reparatur' && c && defects.length) {
    for (const r of (await env.DB.prepare(`SELECT id, case_no, priority, safety_lock, status, version, check_item, 0 AS own FROM cases WHERE parent_case_id=? AND environment=? AND origin='kontrolle'
      AND check_item IN (SELECT value FROM json_each(?)) AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') ORDER BY created_at DESC`).bind(c.id, envName, JSON.stringify(defects.map((d) => d.key))).all()).results) {
      if (!openByItem.has(r.check_item)) openByItem.set(r.check_item, []); openByItem.get(r.check_item).push(r);
    }
  }
  const toCreate = [];
  const slots = [];
  const kGuard = new Map(); // Prüfpunkt → Bedingung „wäre ein offener Vorgang wiederverwendet worden?“ (Backlog 106, Stapelprüfung in createCases)
  for (const d of defects) {
    const prio = d.followup_priority || (d.safety_relevant ? 'kritisch' : 'mittel');
    // Priorität nur vergleichen, wenn sie ausdrücklich gewählt oder sicherheitsrelevant ist – sonst gilt jeder offene Vorgang des Prüfpunkts
    // (21.10.2026: von der Leitung auf „niedrig“ herabgestufter Vorgang führte bei jeder Kontrolle zu einem neuen „mittel“-Vorgang)
    const cmpPrio = !!d.followup_priority || !!d.safety_relevant;
    const open = (openByItem.get(d.key) || []).find((o) => (!cmpPrio || RANK[o.priority] >= RANK[prio]) && (!d.safety_relevant || o.safety_lock));
    if (open) {
      repeats.push({ open, d });
      // eigener offener Vorgang: Fahrer darf dort Fotos anhängen (20.10.2026: Fotos zum erneut festgestellten eigenen Mangel wurden verworfen)
      d.followup_case_id = open.id; d.followup_case_no = open.case_no; d.repeat = true; if (open.own) d.repeat_own = true;
      followups.push({ id: open.id, case_no: open.case_no, duplicate: true, repeat: true, ...(open.own ? { own: true } : {}) });
      continue;
    }
    slots.push({ d, at: followups.length });
    followups.push(null);
    if (kind === 'abfahrt') kGuard.set(d.key, { cmp: cmpPrio ? 1 : 0, rank: RANK[prio], safety: d.safety_relevant ? 1 : 0 });
    toCreate.push({
      vehicle_id: vehicleId,
      description: `[Kontrolle ${kind === 'nach_reparatur' ? 'nach Reparatur' : 'Abfahrt'}] ${d.key}: ${d.note}`,
      priority: prio,
      driveability: d.safety_relevant ? 'nicht_fahrbereit' : 'unbekannt',
      workshop_site: c?.workshop_site || user.workshop_site || null,
      // abgeleiteter Schlüssel ≤ 64 Zeichen: lange (erlaubte) request_keys ließen sonst die ganze Kontrolle mit 400 scheitern (17.10.2026);
      // kurze Schlüssel unverändert wie bisher, lange deterministisch gehasht (Wiederholung bleibt idempotent)
      request_key: `${requestKey}:${d.key}`.length <= 64 ? `${requestKey}:${d.key}` : 'kf-' + (await sha256Hex(`${requestKey}:${d.key}`)).slice(0, 48),
      origin: 'kontrolle',
      check_item: d.key,
      parent_case_id: c?.id || null,
    });
  }
  // km-Stand aus der Kontrolle nur in die Fahrzeugakte, wenn er nicht kleiner als der letzte erfasste ist (Tippfehler würden
  // km-Fälligkeiten und €/km verfälschen). Er bleibt an der Kontrolle gespeichert; Korrektur mit Begründung über die Fahrzeugakte.
  let kmRejected = null;
  // Zeitlich eingeordnet (offline gespeicherte Kontrolle): nicht kleiner als der Stand davor, nicht größer als ein später erfasster.
  if (odo !== null) {
    const [last, later] = await Promise.all([
      env.DB.prepare('SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? AND measured_at <= ? ORDER BY measured_at DESC LIMIT 1').bind(vehicleId, performedAt).first(),
      performedAt < now ? env.DB.prepare('SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? AND measured_at > ? ORDER BY measured_at ASC LIMIT 1').bind(vehicleId, performedAt).first() : null,
    ]);
    if (last && odo < last.km) kmRejected = { km: odo, previous_km: last.km, previous_at: last.measured_at };
    else if (later && odo > later.km) kmRejected = { km: odo, next_km: later.km, next_at: later.measured_at };
  }
  // Testumgebung mit „Stammdaten nur lesen“: km bleibt an der Kontrolle, nicht in der gemeinsamen Fahrzeugakte
  const kmTestOnly = odo !== null && !kmRejected && envName === 'test' && user.role !== 'owner' && await testMasterReadonly(env);
  // Anweisungen der Kontrolle (Kontrolle, km, Verlauf) – im Stapel der Mangel-Vorgänge (createCases, internal.extra) oder allein
  let kmIdx = -1;
  const assignSlots = (created) => slots.forEach(({ d, at }, n) => {
    const res = created[n];
    d.followup_case_id = res.id;
    d.followup_case_no = res.case_no;
    followups[at] = res;
  });
  const buildStmts = () => {
    const itemsJson = JSON.stringify(CHECKLIST.map((i) => byKey.get(i.key)));
    // ohne OR IGNORE (17.10.2026): gleichzeitig zweimal gesendet → zweiter Stapel rollt vollständig zurück (vorher doppelte km-Stände/Verlaufseinträge)
    const stmts = [env.DB.prepare(`INSERT INTO inspections(id,environment,vehicle_id,case_id,kind,template_version,performed_by,odometer_km,items,result,note,created_at,received_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, envName, vehicleId, c?.id || null, kind, CHECKLIST_VERSION, user.id, odo, itemsJson,
      defects.length ? 'maengel' : 'ok', inspNote, performedAt, performedAt !== now ? now : null)];
    if (odo !== null && !kmRejected && !kmTestOnly) {
      // Plausibilität auch im Einfügen selbst (wie „Kilometerstand erfassen“): eine zwischen Prüfung und Stapel erfasste Ablesung machte den
      // km-Stand der Kontrolle sonst zum unbegründeten Rücksprung (19.10.2026)
      kmIdx = stmts.length;
      stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO odometer_readings(id,vehicle_id,km,measured_at,source,recorded_by,created_at) SELECT ?1,?2,?3,?4,?5,?6,?7
        WHERE COALESCE((SELECT km FROM odometer_readings WHERE vehicle_id=?2 AND measured_at <= ?4 ORDER BY measured_at DESC LIMIT 1), -1) <= ?3
          AND COALESCE((SELECT km FROM odometer_readings WHERE vehicle_id=?2 AND measured_at > ?4 ORDER BY measured_at ASC LIMIT 1), 9999999999) >= ?3`)
        .bind(uuid(), vehicleId, odo, performedAt, `kontrolle:${kind}`, user.id, now));
    }
    if (c) {
      stmts.push(env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
        VALUES (?,?,?,?,?,'inspection',?,?,?,?,?,?,?)`).bind(uuid(), c.id, envName, user.id, user.role, c.status, c.status, c.version, c.version,
        (defects.length ? `${defects.length} Mangel/Mängel festgestellt` : 'Kontrolle ohne Mängel') + (kmRejected ? (kmRejected.next_km !== undefined ? ` · km-Stand ${odo} größer als später erfasst (${kmRejected.next_km}) – nicht in die Fahrzeugakte übernommen` : ` · km-Stand ${odo} kleiner als zuletzt erfasst (${kmRejected.previous_km}) – nicht in die Fahrzeugakte übernommen`) : ''),
        // Backlog 89 (18.10.2026): Vermerk zusätzlich als Code/Werte, damit die App ihn ohne Textmuster übersetzt (note bleibt für Suche/CSV/Protokoll)
        JSON.stringify({ inspection_id: id, followups: followups.map((f) => f.case_no), code: defects.length ? 'inspection_defects' : 'inspection_ok', defects: defects.length,
          ...(kmRejected ? { km_rejected: kmRejected.next_km !== undefined ? { km: odo, next_km: kmRejected.next_km } : { km: odo, previous_km: kmRejected.previous_km } } : {}) }), now));
      // Kontrolle ist Bewegung am Vorgang („Ohne Bewegung“, Sortierung „zuletzt geändert“) – vorher blieb updated_at stehen (20.10.2026)
      stmts.push(env.DB.prepare('UPDATE cases SET updated_at=? WHERE id=?').bind(now, c.id));
    }
    // Abfahrtskontrolle an einem zum Durchführungszeitpunkt gesperrten Fahrzeug (Backlog 252, 25.10.2026): Verlaufseintrag an jedem damals
    // gesperrten Vorgang des Fahrzeugs – Sperre zum Zeitpunkt `performedAt` (offline nachgereicht: auch wenn inzwischen freigegeben), sonst sah
    // die Leitung nur die Antwort an den Fahrer. Kein updated_at (keine Arbeit am Vorgang); Fuhrparkagent meldet VEHICLE_USED_WHILE_LOCKED.
    if (kind === 'abfahrt') stmts.push(checkedWhileLockedStmt(env, envName, user, id, performedAt, odo, vehicleId, now));
    if (repeats.length) { // zwei Anweisungen unabhängig von der Anzahl
      const rk2 = kind === 'nach_reparatur' ? ['Kontrolle nach Reparatur', 'repeat_repair_check'] : ['Abfahrtskontrolle', 'repeat_departure_check'];
      const rep = repeats.map(({ open, d }) => ({ id: uuid(), case_id: open.id, status: open.status, version: open.version, note: `Erneut festgestellt (${rk2[0]}): ${d.note}`,
        payload: JSON.stringify({ inspection_id: id, code: rk2[1], defect_note: d.note }) }));
      const x = (k) => `json_extract(value,'$.${k}')`;
      stmts.push(env.DB.prepare(`INSERT INTO case_events(id,case_id,environment,actor_id,actor_role,action,from_status,to_status,from_version,to_version,note,payload,created_at)
        SELECT ${x('id')}, ${x('case_id')}, ?1, ?2, ?3, 'repeat_finding', ${x('status')}, ${x('status')}, ${x('version')}, ${x('version')}, ${x('note')}, ${x('payload')}, ?4 FROM json_each(?5)`)
        .bind(envName, user.id, user.role, now, JSON.stringify(rep)));
      stmts.push(env.DB.prepare('UPDATE cases SET updated_at=? WHERE id IN (SELECT value FROM json_each(?))').bind(now, JSON.stringify(rep.map((r) => r.case_id))));
    }
    return stmts;
  };
  const cInt = { ...(kGuard.size ? { kontrolle_guard: kGuard } : {}), extra: (results) => { assignSlots(results); return buildStmts(); } };
  let created;
  try { created = await createCases(env, ctx, user, envName, toCreate, cInt); } catch (e) {
    // gleichzeitig eingegangene Kontrolle hat denselben Mangel angelegt: einmal neu bewerten (findet jetzt den offenen Vorgang)
    if (e && e.code === 'inspection_race' && !retried) return submitInspection(env, ctx, user, envName, body, true);
    throw e;
  }
  assignSlots(created);
  {
    let batchRes;
    // im Stapel der Mangel-Vorgänge schon geschrieben; sonst (keine neuen Vorgänge, Wiederholung/Doppelklick) allein
    if (cInt.extraDone) batchRes = cInt.extraResults;
    else try { batchRes = await env.DB.batch(buildStmts()); } catch (e) {
      if (String(e && e.message).includes('UNIQUE')) { const a2 = await env.DB.prepare('SELECT id, result, items FROM inspections WHERE id=?').bind(id).first(); if (a2) return asDuplicate(a2); }
      throw e;
    }
    if (kmIdx >= 0 && batchRes && batchRes[kmIdx] && batchRes[kmIdx].meta && batchRes[kmIdx].meta.changes === 0
      && !(await env.DB.prepare('SELECT 1 AS x FROM odometer_readings WHERE vehicle_id=? AND measured_at=? AND km=? LIMIT 1').bind(vehicleId, performedAt, odo).first())) {
      // inzwischen anderer Stand erfasst: km bleibt an der Kontrolle, Antwort meldet die Abweichung wie bei der Vorabprüfung
      const [last, later] = await Promise.all([
        env.DB.prepare('SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? AND measured_at <= ? ORDER BY measured_at DESC LIMIT 1').bind(vehicleId, performedAt).first(),
        env.DB.prepare('SELECT km, measured_at FROM odometer_readings WHERE vehicle_id=? AND measured_at > ? ORDER BY measured_at ASC LIMIT 1').bind(vehicleId, performedAt).first(),
      ]);
      kmRejected = last && odo < last.km ? { km: odo, previous_km: last.km, previous_at: last.measured_at } : later && odo > later.km ? { km: odo, next_km: later.km, next_at: later.measured_at } : { km: odo };
    }
  }
  // Abfahrtskontrolle an einem gesperrten Fahrzeug (z. B. Springer an einem fremden Lkw): Antwort meldet die Sperre, damit die App
  // „nicht fahren“ zeigt – die Kontrolle selbst bleibt gespeichert (23.10.2026)
  const vehicleLocked = kind === 'abfahrt' && !!(await env.DB.prepare(`SELECT 1 AS x FROM cases WHERE environment=? AND vehicle_id=? AND safety_lock=1
    AND status NOT IN ('fahrzeug_freigegeben','abgelehnt') LIMIT 1`).bind(envName, vehicleId).first());
  // fest gekoppeltes Gespann gesperrt (z. B. Anhänger): ebenfalls „nicht fahren“ – sonst fehlte der Hinweis beim Nachsenden aus dem
  // Postausgang, wenn die Sperre erst nach der Offline-Kontrolle kam (23.10.2026)
  let coupledLocked = null;
  if (kind === 'abfahrt') {
    const PK = PLATE_KEY_SQL;
    coupledLocked = await env.DB.prepare(`SELECT o.plate, o.kind FROM vehicles o JOIN vehicles v ON v.id=?2 WHERE o.active=1 AND o.id<>v.id AND ${COUPLING_PREFERRED_SQL('v')} AND ${COUPLING_PREFERRED_SQL('o')} AND (
        (v.kind='anhaenger' AND o.kind='lkw' AND ${PK('o.trailer_plate')}<>'' AND ${PK('o.trailer_plate')}=${PK('v.plate')})
        OR (v.kind='lkw' AND o.kind='anhaenger' AND ${PK('v.trailer_plate')}<>'' AND ${PK('o.plate')}=${PK('v.trailer_plate')}))
      AND EXISTS (SELECT 1 FROM cases x WHERE x.environment=?1 AND x.vehicle_id=o.id AND x.safety_lock=1 AND x.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) LIMIT 1`).bind(envName, vehicleId).first() || null;
  }
  return { id, result: defects.length ? 'maengel' : 'ok', followups: followups.map(fuForUser), km_rejected: kmRejected, km_test_only: kmTestOnly, performed_at: performedAt, vehicle_locked: vehicleLocked,
    coupled_locked: coupledLocked ? { plate: coupledLocked.plate, kind: coupledLocked.kind } : null };
}

// ---------- Dateien ----------

export function sniffType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return 'image/webp';
  return null;
}

export async function uploadFile(env, user, envName, caseId, request) {
  const { c, access } = await loadCase(env, user, envName, caseId);
  // Fahrer dürfen Fotos an eigene offene Meldungen hängen
  const driverOwn = user.role === 'driver' && c.reporter_id === user.id && OPEN_STATUSES.includes(c.status);
  const reporterOwn = c.reporter_id === user.id && OPEN_STATUSES.includes(c.status);
  if (!(allowedActions(user, c, access).includes('upload') || driverOwn || reporterOwn)) throw forbidden();
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_FILE_BYTES) throw bad('too_large', 'Datei zu groß (max. 5 MB).');
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.length === 0) throw bad('empty', 'Leere Datei.');
  if (buf.length > MAX_FILE_BYTES) throw bad('too_large', 'Datei zu groß (max. 5 MB).');
  const type = sniffType(buf);
  if (!type) throw bad('type', 'Nur JPG, PNG, WEBP oder PDF erlaubt.');
  // Dublette vor der Höchstzahl: erneut gesendetes Foto (Postausgang nach Netzabbruch) bei vollem Vorgang ist „schon da“, nicht „zu viele“ (20.10.2026)
  const sha = await sha256Hex(buf);
  const dupe = await env.DB.prepare('SELECT id FROM files WHERE case_id=? AND sha256=?').bind(c.id, sha).first();
  if (dupe) return { id: dupe.id, duplicate: true };
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM files WHERE case_id=?').bind(c.id).first();
  if (count.n >= MAX_FILES) throw bad('too_many', 'Maximal 10 Dateien pro Vorgang.');
  const rawName = (() => { try { return decodeURIComponent(request.headers.get('x-filename') || 'datei'); } catch { return 'datei'; } })(); // ungültige %-Folge: Ersatzname statt 500
  const filename = rawName.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || 'datei';
  const id = uuid();
  const key = `${envName}/${c.id}/${id}`;
  await env.FILES.put(key, buf, { metadata: { type, case_id: c.id, env: envName } });
  try {
    // Höchstzahl und Dublette in derselben Anweisung geprüft – parallele Uploads (zwei Geräte, Offline-Postausgang) überschritten sonst die 10
    // „zuletzt geändert“ im selben Stapel, nur wenn die Datei eingetragen wurde (22.10.2026, Backlog 127e)
    const [ins] = await env.DB.batch([env.DB.prepare(`INSERT INTO files(id,case_id,environment,r2_key,filename,content_type,size,sha256,uploaded_by,created_at)
      SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10 WHERE (SELECT COUNT(*) FROM files WHERE case_id=?2) < ?11 AND NOT EXISTS (SELECT 1 FROM files WHERE case_id=?2 AND sha256=?8)`)
      .bind(id, c.id, envName, key, filename, type, buf.length, sha, user.id, nowIso(), MAX_FILES),
    // neue Datei ist Bewegung am Vorgang („Ohne Bewegung“, „zuletzt geändert“ – 20.10.2026)
    env.DB.prepare('UPDATE cases SET updated_at=? WHERE id=? AND EXISTS (SELECT 1 FROM files WHERE id=?)').bind(nowIso(), c.id, id)]);
    if (!(ins.meta && ins.meta.changes)) {
      await env.FILES.delete(key);
      const d2 = await env.DB.prepare('SELECT id FROM files WHERE case_id=? AND sha256=?').bind(c.id, sha).first();
      if (d2) return { id: d2.id, duplicate: true };
      throw bad('too_many', 'Maximal 10 Dateien pro Vorgang.');
    }
  } catch (e) {
    if (e && e.status) throw e;
    await env.FILES.delete(key);
    throw e;
  }
  return { id, duplicate: false, content_type: type, size: buf.length };
}

export async function downloadFile(env, user, envName, fileId) {
  const f = await env.DB.prepare('SELECT * FROM files WHERE id=? AND environment=?').bind(fileId, envName).first();
  if (!f) throw notFound();
  if (f.fine_id) await canReadFineFile(env, user, envName, f.fine_id);
  else if (f.vehicle_id && !f.case_id) { if (!VEHICLE_DOC_READ.includes(user.role)) throw forbidden(); }
  else await loadCase(env, user, envName, f.case_id); // gleiche Rollen-/Umgebungsprüfung wie beim Vorgang
  const data = await env.FILES.get(f.r2_key, { type: 'arrayBuffer' });
  if (!data) throw notFound('Datei nicht im Speicher.');
  return new Response(data, {
    headers: {
      'content-type': f.content_type,
      'content-disposition': `${f.content_type === 'application/pdf' ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      // Behördenschreiben (Bußgeld/Anhörung) sind personenbezogen: auf geteilten Tablets nicht im Browser-Cache ablegen
      'cache-control': f.fine_id ? 'private, no-store' : 'private, max-age=300',
      'x-content-type-options': 'nosniff',
    },
  });
}
