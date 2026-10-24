// [CLAUDE] Prüftermine (HU/SP/UVV/Tachograph …) für den ganzen Fuhrpark: Übersicht, Lückenliste, CSV-Export und belegter CSV-Import.
// Grundsatz: Termine nur aus Belegen. Jede Importzeile braucht einen Nachweis; ein vorhandener späterer Termin wird nie durch einen älteren ersetzt.
import { icsLang } from '../public/ics-texts.js';
import { nowIso, uuid, bad, forbidden, berlinWindowStartIso, normalizeVin, isValidVin, addMonths, berlinDate, berlinDaySql, parseCsv, icsCalendar, isCalendarDate, num, normPlate, quoteCell, maxFutureDate, DUE_FAR_MSG, cutText } from './util.js';
import { audit } from './auth.js';
import { syncHuSpDues, loadHuSpInputs, huSpFor, dueMonthEnd } from './inspection_rules.js';
import { MAINT_KINDS, ONE_TIME_KINDS, MULTI_RULE_KINDS, maintEventStmt, HUSP_RULE_EVIDENCE } from './vehicles.js';
import { siteSelection } from './reports.js';
import { CASE_STATUS_DE } from './cases.js';
import { maintenanceWarnDays } from './settings.js';

const READ_ROLES = ['owner', 'fleet', 'viewer', 'workshop', 'dispatch'];
const WRITE_ROLES = ['owner', 'fleet'];
// Gesetzliche Pflichtprüfungen für schwere Lkw (StVZO § 29 HU/SP, § 57b Kontrollgerät, DGUV Vorschrift 70 UVV).
// Dient nur der Lückenliste „kein Termin hinterlegt“ – es werden keine Termine daraus berechnet.
export const REQUIRED_KINDS = ['HU', 'SP', 'UVV', 'Tachograph'];
export const REQUIRED_KINDS_TRAILER = ['HU', 'SP']; // Anhänger: kein Kontrollgerät; UVV nur bei eigener Ladetechnik → nicht pauschal gefordert
const MAX_ROWS = 2000;

const KIND_ALIASES = new Map([
  ['hu', 'HU'], ['hauptuntersuchung', 'HU'], ['tüv', 'HU'], ['tuev', 'HU'], ['dekra', 'HU'],
  ['sp', 'SP'], ['sicherheitsprüfung', 'SP'], ['sicherheitspruefung', 'SP'],
  ['uvv', 'UVV'], ['uvv-prüfung', 'UVV'], ['uvv-pruefung', 'UVV'],
  ['feuerloescher', 'Feuerlöscher'], ['feuerlöscherprüfung', 'Feuerlöscher'], ['verbandskasten', 'Verbandkasten'], ['erste-hilfe-kasten', 'Verbandkasten'], ['spanngurte', 'Ladungssicherung'], ['zurrgurte', 'Ladungssicherung'],
  ['rückrufaktion', 'Rückruf'], ['rueckruf', 'Rückruf'], ['rueckrufaktion', 'Rückruf'], ['werkstattaktion', 'Rückruf'], ['herstelleraktion', 'Rückruf'], ['recall', 'Rückruf'],
  ['tachograph', 'Tachograph'], ['tacho', 'Tachograph'], ['tachoprüfung', 'Tachograph'], ['tachopruefung', 'Tachograph'], ['fahrtenschreiber', 'Tachograph'], ['kontrollgerät', 'Tachograph'], ['kontrollgeraet', 'Tachograph'],
]);

export function normalizeKind(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const exact = MAINT_KINDS.find((k) => k.toLowerCase() === s.toLowerCase());
  return exact || KIND_ALIASES.get(s.toLowerCase()) || null;
}

function validIso(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  if (d < '1900-01-01' || d > '2199-12-31') return false; // wie isCalendarDate: 9999-12-31 ergab ungültige Kalenderdateien (17.10.2026)
  const x = new Date(d + 'T00:00:00Z');
  return !Number.isNaN(x.getTime()) && x.toISOString().slice(0, 10) === d;
}

// Datum aus Beleg: JJJJ-MM-TT, TT.MM.JJJJ oder MM/JJJJ bzw. MM.JJJJ (Prüfplakette: fällig bis Monatsende)
export function parseDueDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return { date: null };
  let m;
  if (validIso(s)) return { date: s };
  if ((m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) {
    const d = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return validIso(d) ? { date: d } : { error: `Datum ungültig: ${s}` };
  }
  if ((m = s.match(/^(\d{1,2})[./](\d{4})$/))) {
    const mo = Number(m[1]);
    if (mo < 1 || mo > 12) return { error: `Monat ungültig: ${s}` };
    if (Number(m[2]) < 1900 || Number(m[2]) > 2199) return { error: `Datum ungültig: ${s}` };
    const last = new Date(Date.UTC(Number(m[2]), mo, 0)).toISOString().slice(0, 10);
    return { date: last, month_only: true };
  }
  return { error: `Datum nicht erkannt: ${s} (JJJJ-MM-TT, TT.MM.JJJJ oder MM/JJJJ)` };
}

export { parseCsv } from './util.js';

// Kilometer-Intervall: fällig bei letzter Durchführung (km) + Intervall; nur wenn beides belegt ist.
// Vorwarnung nur, wenn „maintenance_warn_km“ eingestellt ist (keine erfundene Schwelle) – sonst nur „überfällig“.
// before (ISO, optional): nur Ablesungen vor diesem Zeitpunkt – Stichtag der Vertragsübersicht (Backlog 196), sonst wie bisher die letzte
export async function latestKmByVehicle(env, { withBase = false, before = null } = {}) {
  const cut = before ? ' AND measured_at < ?1' : '';
  // withBase: zusätzlich die früheste Ablesung der 90 Tage vor der letzten (für die Fahrleistungs-Prognose) – gleiche Abfrage, kein Zusatzaufruf
  const base = withBase ? `, (SELECT o3.km FROM odometer_readings o3 WHERE o3.vehicle_id=o.vehicle_id AND o3.measured_at >= date(o.measured_at, '-${KM_RATE_WINDOW_DAYS} days') ORDER BY o3.measured_at LIMIT 1) AS base_km,
    (SELECT o3.measured_at FROM odometer_readings o3 WHERE o3.vehicle_id=o.vehicle_id AND o3.measured_at >= date(o.measured_at, '-${KM_RATE_WINDOW_DAYS} days') ORDER BY o3.measured_at LIMIT 1) AS base_at` : '';
  // drop_at: letzte Ablesung, die kleiner ist als die unmittelbar vorherige (Tachotausch, Korrektur mit Begründung) – gleiche Abfrage
  // drop_rec: wann der (späteste) Rücksprung erfasst wurde – maßgeblich für „Regel danach geändert“ (auch bei nachträglich datierter Ablesung)
  // Rücksprünge gespeichert (km_drop_prev, Migration 0071, Trigger) statt LAG() über die ganze Historie; letzte Ablesung je Fahrzeug per Index
  const rows = (await env.DB.prepare(`WITH d AS (SELECT vehicle_id, MAX(measured_at) AS drop_at, MAX(created_at) AS drop_rec FROM odometer_readings
      WHERE km_drop_prev IS NOT NULL${cut} GROUP BY vehicle_id)
    SELECT o.vehicle_id, o.km, o.measured_at, o.source, d.drop_at, d.drop_rec${base} FROM vehicles v
    JOIN odometer_readings o ON o.rowid = (SELECT o2.rowid FROM odometer_readings o2 WHERE o2.vehicle_id = v.id${before ? ' AND o2.measured_at < ?1' : ''} ORDER BY o2.measured_at DESC, o2.rowid DESC LIMIT 1)
    LEFT JOIN d ON d.vehicle_id = o.vehicle_id`).bind(...(before ? [before] : [])).all()).results;
  return new Map(rows.map((r) => [r.vehicle_id, r]));
}
// SQL-Ausdruck „letzter km-Rücksprung“ eines Fahrzeugs (Parameter = Fahrzeug-ID), gleiche Regel wie latestKmByVehicle:
// Text „Ablesezeitpunkt|Erfassungszeitpunkt“ oder NULL → parseKmDrop
// Rücksprung = km_drop_prev gesetzt (Migration 0071, per Trigger gepflegt; Teilindex idx_odometer_drop)
export const KM_DROP_SQL = (param) => `(SELECT MAX(measured_at) || '|' || MAX(created_at) FROM odometer_readings WHERE vehicle_id=${param} AND km_drop_prev IS NOT NULL)`;
export const parseKmDrop = (x) => { if (!x) return { drop_at: null, drop_rec: null }; const [a, b] = String(x).split('|'); return { drop_at: a || null, drop_rec: b || a || null }; };
// km-Zähler gesunken (z. B. Tachotausch) nach der letzten Änderung der Regel: km bei letzter Durchführung bzw. belegte km-Fälligkeit
// beziehen sich vermutlich auf den alten Zähler → km-Fälligkeit „ungeklärt“ statt einer falschen Restlaufleistung (nie geschätzt).
// Erledigt wird das durch eine Durchführung mit neuem km-Stand oder das Neueintragen der Regel (updated_at nach Erfassung des Rücksprungs).
// Maßgeblich ist die letzte Änderung der km-Grundlage (km_basis_at, Migration 0055) – nicht updated_at (ändert sich auch beim Planen eines Termins)
export const kmCounterDropAfter = (rule, latest) => { const at = rule && (rule.km_basis_at || rule.updated_at); return !!(latest && latest.drop_at && !(at && at > (latest.drop_rec || latest.drop_at))); };
// km-Grundlage einer Durchführung vom `doneDate`: liegt sie vor dem Tag des letzten km-Rücksprungs (Tachotausch), gehören ihre km zum alten
// Zähler – die bisherige Grundlage bleibt (ohne bisherige: Tag der Durchführung, also vor dem Rücksprung → „ungeklärt“). Sonst `now`.
// Gleiche Regel für „erledigt“, Neuanlage und Import (18.10.2026: Import/Neuanlage hoben „ungeklärt“ auf, Rest-km aus gemischten Zählern)
export function kmBasisForDone(drop, doneDate, prevBasis, now) {
  if (!drop || !drop.drop_at || !doneDate) return now;
  const dropDay = String(drop.drop_at).length > 10 ? berlinDate(drop.drop_at) : String(drop.drop_at).slice(0, 10);
  return doneDate < dropDay ? (prevBasis || `${doneDate}T00:00:00.000Z`) : now;
}

// Fahrleistungs-Prognose für km-Fälligkeiten – nur Planungshilfe, nie verbindlich und ohne Einfluss auf Status/Agent.
// Grundlage ausschließlich gespeicherte km-Stände: früheste und letzte Ablesung innerhalb von 90 Tagen, mindestens 14 Tage auseinander,
// km gestiegen; letzte Ablesung höchstens 90 Tage alt (sonst veraltet). Ergebnis: Ø km/Tag und voraussichtliches Datum.
export const KM_RATE_WINDOW_DAYS = 90;
export const KM_RATE_MIN_SPAN_DAYS = 14;
// Kalendertag: reines Datum bleibt, Zeitstempel → Berliner Tag (Ablesung um 00:30 Uhr zählt zum selben Tag wie in der Akte)
const calDay = (x) => (String(x).length > 10 ? berlinDate(x) : String(x).slice(0, 10));
const dayOf = (x) => Date.parse(calDay(x) + 'T00:00:00Z');
export function kmRate(latest, base, today) {
  if (!latest || !base || base.km === null || base.km === undefined || !base.measured_at) return null;
  const span = Math.round((dayOf(latest.measured_at) - dayOf(base.measured_at)) / 86400000);
  if (!(span >= KM_RATE_MIN_SPAN_DAYS) || !(latest.km > base.km)) return null;
  if (today && Math.round((dayOf(today) - dayOf(latest.measured_at)) / 86400000) > KM_RATE_WINDOW_DAYS) return null;
  return { km_per_day: (latest.km - base.km) / span, from: calDay(base.measured_at), to: calDay(latest.measured_at), days: span };
}
export function kmForecastDate(remaining, rate, latestAt) {
  if (!rate || !(remaining > 0)) return null;
  const days = Math.ceil(remaining / rate.km_per_day);
  if (days > 3 * 365) return null; // zu weit weg für eine belastbare Hochrechnung
  return new Date(dayOf(latestAt) + days * 86400000).toISOString().slice(0, 10);
}
// km-Fälligkeit: belegter Wert (due_km) vor „km bei letzter Durchführung + Intervall km“; sonst keine
export function ruleDueKm(rule) {
  if (!rule) return null;
  // HU/SP richten sich nur nach der Zeit (StVZO Anl. VIII) – auch ein altes km-Intervall ergibt keine km-Fälligkeit (vorher: Agent meldete „HU bei … km fällig“, 17.10.2026)
  if (rule.kind === 'HU' || rule.kind === 'SP') return null;
  // durchgeführter Rückruf hat keine Folgefrist (auch nicht aus älteren Einträgen; 20.10.2026)
  if (ONE_TIME_KINDS.includes(rule.kind) && rule.last_done_date) return null;
  if (rule.due_km !== null && rule.due_km !== undefined) return rule.due_km;
  if (!rule.interval_km || rule.last_done_km === null || rule.last_done_km === undefined) return null;
  return rule.last_done_km + rule.interval_km;
}
export function kmDue(rule, latest, warnKm, today = null) {
  const next = ruleDueKm(rule);
  if (next === null) return null;
  if (!latest) return { next_due_km: next, current_km: null, km_measured_at: null, km_remaining: null, km_status: 'ohne_km' };
  if (kmCounterDropAfter(rule, latest)) {
    return { next_due_km: next, current_km: latest.km, km_measured_at: latest.measured_at, km_remaining: null, km_status: 'ungeklaert', km_unclear: 'counter_drop', km_drop_at: latest.drop_at,
      ...('base_km' in latest ? { km_forecast: null } : {}) };
  }
  // belegter km-Stand der letzten Durchführung zählt mit (18.10.2026: alte Ablesung 200 000, Durchführung bei 290 000 → Rest 120 000 > Intervall)
  // nur, wenn die Ablesung älter ist als die Durchführung – eine spätere kleinere Ablesung ist ein Zähler-Rücksprung (bisherige Regel)
  const useDone = rule.last_done_km !== null && rule.last_done_km !== undefined && rule.last_done_km > latest.km && !!rule.last_done_date && calDay(latest.measured_at) <= rule.last_done_date;
  const curKm = useDone ? rule.last_done_km : latest.km;
  const remaining = next - curKm;
  // Rest 0 = fällig (wie der Fälligkeitstag beim Datum; 18.10.2026 vorher „in Ordnung“ genau bei „fällig bei km“)
  const st = remaining < 0 ? 'ueberfaellig' : remaining === 0 || (warnKm && remaining <= warnKm) ? 'faellig' : 'ok';
  const out = { next_due_km: next, current_km: curKm, km_measured_at: useDone ? (rule.last_done_date || latest.measured_at) : latest.measured_at, km_remaining: remaining, km_status: st };
  if ('base_km' in latest) {
    // Prognose nie über einen km-Rücksprung hinweg (Ablesungen alter und neuer Zähler wären nicht vergleichbar)
    const rate = latest.drop_at && latest.base_at && latest.base_at < latest.drop_at ? null : kmRate(latest, { km: latest.base_km, measured_at: latest.base_at }, today);
    // Anker = Zeitpunkt des Rest-km-Stands (bei belegter Durchführung deren Datum, sonst die Ablesung; 18.10.2026 vorher stets die Ablesung → Prognose um die Lücke zu früh)
    const fc = kmForecastDate(remaining, rate, out.km_measured_at);
    out.km_forecast = fc ? { date: fc, km_per_day: Math.round(rate.km_per_day), from: rate.from, to: rate.to } : null;
  }
  return out;
}
const RANK = { ueberfaellig: 4, ungeklaert: 3, faellig: 2, ok: 1, erste_sp: 1, nicht_pflichtig: 0, ohne_termin: 0, erledigt: 0 };

function daysUntil(due, today) {
  return Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
}

// Pflichtprüfung in der App erfasst/erledigt (≤ 180 Tage), neueste ihrer Art, ohne Prüfergebnis (Importe/Bestand bewusst ausgenommen).
// Mit recordedBy: nur selbst erfasste Durchführungen (Startseite „Prüfergebnis fehlt“).
// limit: Datenqualität liest 201 (eine Zeile mehr), um eine Kappung zu erkennen
export function noResultQuery(env, recordedBy = null, limit = 200, vf = null) {
  const [sql, params] = noResultSql(recordedBy, limit, vf);
  return env.DB.prepare(sql).bind(...params);
}
// vf: JSON-Liste der Fahrzeug-IDs (Standortfilter) – vor dem LIMIT angewandt (vorher erst danach: Standort mit älteren Fällen leer, 18.10.2026)
function noResultSql(recordedBy = null, limit = 200, vf = null) {
  return [`SELECT e.id, e.vehicle_id, v.plate, e.kind, e.done_date FROM maintenance_events e JOIN vehicles v ON v.id=e.vehicle_id
      WHERE v.active=1 AND v.eval_excluded=0 ${vf ? 'AND v.id IN (SELECT value FROM json_each(?))' : ''} AND e.result IS NULL AND e.source IN ('erfasst','erledigt') AND e.kind IN (${REQUIRED_KINDS.map(() => '?').join(',')}) AND e.done_date >= ?
      ${recordedBy ? 'AND e.recorded_by = ?' : ''}
      AND NOT EXISTS (SELECT 1 FROM maintenance_events x WHERE x.vehicle_id=e.vehicle_id AND x.kind=e.kind AND x.id<>e.id
        AND (x.done_date > e.done_date OR (x.done_date = e.done_date AND x.created_at > e.created_at)))
      ORDER BY e.done_date DESC LIMIT ${Number(limit)}`, [...(vf ? [vf] : []), ...REQUIRED_KINDS, berlinDate(new Date(Date.now() - 180 * 86400000).toISOString()), ...(recordedBy ? [recordedBy] : [])]];
}

// Prüfungen der letzten 12 Monate (wie Fahrzeugliste/Akte, 22.10.2026) mit Ergebnis erhebliche/gefährliche Mängel bzw. verkehrsunsicher, zu denen seit dem Prüfdatum kein
// (nicht abgelehnter) Vorgang zum Fahrzeug angelegt wurde – Grundlage für Datenqualität und „Heute zu tun“. Keine Frist angenommen.
// Ist danach bereits eine neuere Durchführung derselben Prüfart eingetragen (Nachprüfung, z. B. nach Reparatur außerhalb der App), gilt
// die ältere als überholt: Zeigt die neuere erneut Mängel, erscheint stattdessen sie selbst.
export const DEFECT_RESULTS = ['erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'];
// Welcher Vorgang erledigt „Prüfmangel ohne Auftrag“/„Prüfung nicht bestanden“ (Backlog 208, Teilagent „HU-Tag in der Werkstatt“): der Auftrag
// zu genau dieser Prüfung (maintenance_event_id), ein Vorgang mit Dringlichkeit kritisch oder Sperre, oder einer der Leitung/Werkstatt – vorher
// jeder Vorgang seit dem Prüftag, z. B. „Innenlicht defekt“ eines Fahrers ließ „verkehrsunsicher“ verschwinden. Gleiche Regel in JS und SQL.
// Ein von Leitung/Werkstatt/Disposition selbst angelegter Vorgang zählt weiter (manueller Mängelauftrag), die Meldung eines Fahrers nur, wenn kritisch/gesperrt.
export const FIXING_CASE_SQL = "(c.maintenance_event_id=e.id OR c.priority='kritisch' OR c.safety_lock=1 OR c.reporter_id IN (SELECT u.id FROM users u WHERE u.role<>'driver'))";
export const defectCase = (c, e) => c.maintenance_event_id === e.id || c.priority === 'kritisch' || !!c.safety_lock || (!!c.reporter_role && c.reporter_role !== 'driver');
export function defectsWithoutCaseQuery(env, envName, limit = 200, vf = null) {
  const [sql, params] = defectsWithoutCaseSql(envName, limit, vf);
  return env.DB.prepare(sql).bind(...params);
}
function defectsWithoutCaseSql(envName, limit = 200, vf = null) {
  return [`SELECT e.id, e.vehicle_id, v.plate, e.kind, e.done_date, e.result, e.evidence FROM maintenance_events e JOIN vehicles v ON v.id=e.vehicle_id
      WHERE v.active=1 AND v.eval_excluded=0 ${vf ? 'AND v.id IN (SELECT value FROM json_each(?))' : ''} AND e.done_date >= ? AND e.result IN ('erhebliche_maengel','gefaehrliche_maengel','verkehrsunsicher')
      AND NOT EXISTS (SELECT 1 FROM cases c WHERE c.vehicle_id=e.vehicle_id AND c.environment=? AND c.status<>'abgelehnt' AND ${berlinDaySql('c.created_at')} >= e.done_date AND ${FIXING_CASE_SQL}) -- Berliner Tag (Auftrag 00:30 Uhr am Prüftag zählt, 17.10.2026)
      AND NOT EXISTS (SELECT 1 FROM maintenance_events e2 WHERE e2.vehicle_id=e.vehicle_id AND e2.kind=e.kind AND e2.id<>e.id
        AND (e2.done_date > e.done_date OR (e2.done_date = e.done_date AND e2.created_at > e.created_at)))
      ORDER BY e.done_date DESC LIMIT ${Number(limit)}`, [...(vf ? [vf] : []), addMonths(berlinDate(), -12), envName]];
}

// Mängelauftrag aus Prüfung technisch freigegeben (≤ 12 Monate nach der Prüfung), kein weiterer offener Auftrag dazu und seitdem keine neuere
// Durchführung derselben Prüfart am Fahrzeug eingetragen → Nachprüfung/Wiedervorführung mit Nachweis in der Akte eintragen. Keine Frist angenommen
// (sie steht im Prüfbericht). Je Prüfung nur der zuletzt freigegebene Auftrag.
export function reinspectionPendingQuery(env, envName) {
  const [sql, params] = reinspectionPendingSql(envName);
  return env.DB.prepare(sql).bind(...params);
}
function reinspectionPendingSql(envName, limit = 200, vf = null) {
  return [`SELECT e.id, e.vehicle_id, v.plate, e.kind, e.done_date, e.result, e.evidence, c.id AS case_id, c.case_no, c.closed_at
      FROM maintenance_events e JOIN vehicles v ON v.id=e.vehicle_id
      JOIN cases c ON c.maintenance_event_id=e.id AND c.environment=? AND c.status='fahrzeug_freigegeben'
      WHERE v.active=1 AND v.eval_excluded=0 ${vf ? 'AND v.id IN (SELECT value FROM json_each(?))' : ''} AND e.done_date >= ? AND e.result IN ('erhebliche_maengel','gefaehrliche_maengel','verkehrsunsicher')
      AND c.closed_at = (SELECT MAX(c3.closed_at) FROM cases c3 WHERE c3.maintenance_event_id=e.id AND c3.environment=c.environment AND c3.status='fahrzeug_freigegeben')
      AND NOT EXISTS (SELECT 1 FROM cases c2 WHERE c2.maintenance_event_id=e.id AND c2.environment=c.environment AND c2.status NOT IN ('fahrzeug_freigegeben','abgelehnt'))
      AND NOT EXISTS (SELECT 1 FROM maintenance_events e2 WHERE e2.vehicle_id=e.vehicle_id AND e2.kind=e.kind AND e2.id<>e.id
        AND (e2.done_date > e.done_date OR (e2.done_date = e.done_date AND e2.created_at > e.created_at)))
      ORDER BY c.closed_at DESC LIMIT ${Number(limit)}`, [envName, ...(vf ? [vf] : []), addMonths(berlinDate(), -12)]];
}

// Die drei Prüfungs-Listen (Prüfmängel ohne Auftrag, ausstehende Nachprüfung, Pflichtprüfung ohne Ergebnis) in EINER D1-Abfrage –
// Cloudflare begrenzt die Abfragen je Aufruf (Agent, Übersicht). Gleiche SQL-Bausteine wie die Einzelabfragen; je Teil ein JSON-Array.
// Die Reihenfolge innerhalb eines Aggregats ist in SQLite nicht zugesichert – daher nach dem Lesen wie in der Einzelabfrage sortiert.
const EVENT_LISTS = {
  defects_without_case: [defectsWithoutCaseSql, ['id', 'vehicle_id', 'plate', 'kind', 'done_date', 'result', 'evidence'], (a, b) => String(b.done_date).localeCompare(String(a.done_date))],
  reinspection_pending: [reinspectionPendingSql, ['id', 'vehicle_id', 'plate', 'kind', 'done_date', 'result', 'evidence', 'case_id', 'case_no', 'closed_at'], (a, b) => String(a.closed_at).localeCompare(String(b.closed_at))],
  result_missing: [(envName, limit, vf) => noResultSql(null, limit, vf), ['id', 'vehicle_id', 'plate', 'kind', 'done_date'], (a, b) => String(b.done_date).localeCompare(String(a.done_date))],
};
// vehicleIds: nur diese Fahrzeuge (Standortfilter, vor dem LIMIT); je Liste höchstens 200, eine Zeile mehr gelesen →
// out.truncated = Namen der gekappten Listen (vorher still gekappt, 18.10.2026)
export async function maintenanceEventLists(env, envName, vehicleIds = null) {
  const names = Object.keys(EVENT_LISTS);
  const vf = vehicleIds ? JSON.stringify([...vehicleIds]) : null;
  const parts = names.map((n) => { const [mk, cols] = EVENT_LISTS[n]; const [sql, params] = mk(envName, 201, vf); return { sql: `SELECT ${names.indexOf(n)} AS k, (SELECT json_group_array(json_object(${cols.map((c) => `'${c}', ${c}`).join(', ')})) FROM (${sql})) AS j`, params }; });
  const rows = (await env.DB.prepare(parts.map((x) => x.sql).join(' UNION ALL ')).bind(...parts.flatMap((x) => x.params)).all()).results;
  const out = {};
  const truncated = [];
  for (const r of rows) { const n = names[r.k]; const list = JSON.parse(r.j || '[]');
    // zuerst die jüngsten 200 behalten (Abfrage absteigend), dann wie gewohnt sortieren
    if (list.length > 200) { const key = n === 'reinspection_pending' ? 'closed_at' : 'done_date';
      truncated.push(n); list.sort((a, b) => String(b[key]).localeCompare(String(a[key]))); list.length = 200; }
    out[n] = list.sort(EVENT_LISTS[n][2]); }
  for (const n of names) out[n] = out[n] || [];
  out.truncated = truncated;
  return out;
}

// opts.site: nur Fahrzeuge dieses Standorts laut Fahrzeugstamm (Schreibweise egal, 'ohne' = ohne Standort); site_options = Auswahl
export async function maintenanceOverview(env, user, envName = null, opts = {}) {
  if (user && !READ_ROLES.includes(user.role)) throw forbidden();
  const cfg = new Map((await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN ('maintenance_warn_days','maintenance_warn_km')`).all()).results.map((r) => [r.key, r.value]));
  const warnDays = maintenanceWarnDays(cfg.get('maintenance_warn_days'));
  const warnKm = Number(cfg.get('maintenance_warn_km')) > 0 ? Number(cfg.get('maintenance_warn_km')) : null;
  const today = berlinDate();
  const latestKm = await latestKmByVehicle(env, { withBase: true });
  const allVehicles = (await env.DB.prepare('SELECT id, plate, site, kind FROM vehicles WHERE active=1 AND eval_excluded=0').all()).results;
  const sel = siteSelection(allVehicles, opts.site);
  const siteOptions = sel.options; const siteSel = sel.site; const sKey = sel.site !== null;
  const vehicles = sKey ? allVehicles.filter((v) => sel.match(v.site)) : allVehicles;
  const vIds = new Set(vehicles.map((v) => v.id));
  const rules = (await env.DB.prepare(`SELECT m.id, m.vehicle_id, m.kind, m.interval_months, m.interval_km, m.last_done_km, m.due_km, m.last_done_date, m.next_due_date, m.planned_date, m.evidence, m.updated_at, m.km_basis_at
    FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id WHERE v.active=1 AND v.eval_excluded=0`).all()).results.filter((r) => vIds.has(r.vehicle_id));
  const vmap = new Map(vehicles.map((v) => [v.id, v]));
  // HU/SP zentral nach StVZO Anlage VIII (inspection_rules.js)
  const huspIn = await loadHuSpInputs(env);
  const huspBy = new Map();
  for (const [vid, x] of huspIn) if (vmap.has(vid)) huspBy.set(vid, huSpFor(x, today, warnDays));
  const HUSP_MAP = { ok: 'ok', bald_faellig: 'faellig', ueberfaellig: 'ueberfaellig', ungeklaert: 'ungeklaert', nicht_sp_pflichtig: 'nicht_pflichtig', erste_sp_kuenftig: 'erste_sp' };
  // HU/SP ohne eigenen Eintrag, deren Frist sich berechnen lässt (z. B. SP aus HU bzw. Erstzulassung): als Zeile ohne Regel (`virtual`) wie in der
  // Fahrzeugakte und beim Agenten (19.10.2026, Backlog 93: überfällige SP fehlte in Übersicht, Werkstattplan und Kalender). Es wird nichts angelegt.
  const ruleKeys = new Set(rules.map((r) => `${r.vehicle_id}|${r.kind}`));
  const virt = [];
  for (const [vid, h] of huspBy) for (const kind of ['HU', 'SP']) {
    const x = kind === 'HU' ? h.hu : h.sp;
    if (!ruleKeys.has(`${vid}|${kind}`) && x && x.due && x.status !== 'nicht_sp_pflichtig') virt.push({ id: `husp:${vid}:${kind}`, vehicle_id: vid, kind, virtual: true, evidence: null, updated_at: null, last_done_km: null });
  }
  const rows = [...rules, ...virt].map((r) => {
    const v = vmap.get(r.vehicle_id) || {};
    const hs = (r.kind === 'HU' || r.kind === 'SP') && huspBy.get(r.vehicle_id) ? huspBy.get(r.vehicle_id)[r.kind === 'HU' ? 'hu' : 'sp'] : null;
    if (hs) {
      const due = hs.due || null;
      return { id: r.id, vehicle_id: r.vehicle_id, plate: v.plate || null, site: v.site || null, vehicle_kind: v.kind || null, kind: r.kind, last_done_date: hs.last_done || r.last_done_date,
        next_due_date: due, due_month: due ? `${due.slice(5, 7)}/${due.slice(0, 4)}` : null, due_basis: hs.due_basis, prognosis: hs.prognosis || null, planned_date: hs.planned_date,
        interval_months: r.kind === 'HU' ? hs.interval_months : null, days: due ? daysUntil(due, today) : null, status: HUSP_MAP[hs.status] || 'ungeklaert', husp_status: hs.status, notes: hs.notes, note_codes: hs.note_codes, prev_cycle_open: hs.prev_cycle_open || null,
        // Datumsstufe getrennt: „Frist ungeklärt“ (z. B. SP-Vorzyklus ohne Beleg) mit bekanntem Termin bleibt einzuplanen (18.10.2026: fehlte im Werkstattplan bis zur Überfälligkeit)
        date_status: !due ? 'ohne_termin' : daysUntil(due, today) < 0 ? 'ueberfaellig' : daysUntil(due, today) <= warnDays ? 'faellig' : 'ok',
        evidence: r.evidence, updated_at: r.updated_at, interval_km: null, last_done_km: r.last_done_km, next_due_km: null, km_remaining: null, km_status: null, ...(r.virtual ? { virtual: true } : {}) };
    }
    // durchgeführter Rückruf: eine (früher mögliche) gespeicherte Frist zählt nicht mehr (20.10.2026)
    const days = r.next_due_date && !(r.last_done_date && ONE_TIME_KINDS.includes(r.kind)) ? daysUntil(r.next_due_date, today) : null;
    // Einmalige Aktion (Rückruf) erledigt und keine neue Frist laut Schreiben → „erledigt“ statt „ohne Termin“
    const dateStatus = days === null && r.last_done_date && ONE_TIME_KINDS.includes(r.kind) ? 'erledigt' : days === null ? 'ohne_termin' : days < 0 ? 'ueberfaellig' : days <= warnDays ? 'faellig' : 'ok';
    const kmd = kmDue(r, latestKm.get(r.vehicle_id), warnKm, today);
    // Gesamtstatus: das Strengere aus Datum und Kilometern; date_status bleibt getrennt sichtbar (km „ungeklärt“ überdeckt sonst „bald fällig“ nach Datum)
    const status = kmd && kmd.km_status !== 'ohne_km' && RANK[kmd.km_status] > RANK[dateStatus] ? kmd.km_status : dateStatus;
    return { id: r.id, vehicle_id: r.vehicle_id, plate: v.plate || null, site: v.site || null, vehicle_kind: v.kind || null, kind: r.kind, last_done_date: r.last_done_date,
      next_due_date: r.next_due_date, planned_date: r.planned_date || null, interval_months: r.interval_months, days, status, date_status: dateStatus, evidence: r.evidence, updated_at: r.updated_at,
      interval_km: r.interval_km, last_done_km: r.last_done_km, due_km: r.due_km ?? null, ...(kmd || { next_due_km: null, km_remaining: null, km_status: null }) };
  }).sort((a, b) => (RANK[b.status] >= 3 ? RANK[b.status] : 0) - (RANK[a.status] >= 3 ? RANK[a.status] : 0) || (a.next_due_date === null) - (b.next_due_date === null) || String(a.next_due_date).localeCompare(String(b.next_due_date)) || String(a.plate).localeCompare(String(b.plate)));
  const has = new Set([...rules.filter((r) => r.next_due_date || r.kind === 'HU' || r.kind === 'SP'), ...virt].map((r) => `${r.vehicle_id}|${r.kind}`));
  // Nicht SP-pflichtige Fahrzeuge brauchen keinen SP-Eintrag
  // erste SP künftig (Neufahrzeug mit EZ/zGM, Prognose in der Akte) ist keine Lücke (23.10.2026, Teilagent „Fahrzeug-Neuzugang“)
  for (const [vid, h] of huspBy) if (h.sp.status === 'nicht_sp_pflichtig' || h.sp.status === 'erste_sp_kuenftig') has.add(`${vid}|SP`);
  const gaps = [];
  for (const v of vehicles.sort((a, b) => String(a.plate).localeCompare(String(b.plate)))) {
    const missing = (v.kind === 'anhaenger' ? REQUIRED_KINDS_TRAILER : REQUIRED_KINDS).filter((k) => !has.has(`${v.id}|${k}`));
    if (missing.length) gaps.push({ vehicle_id: v.id, plate: v.plate, site: v.site, vehicle_kind: v.kind, missing });
  }
  // offene Werkstattaufträge aus Prüfterminen (nur App-Ansicht mit Umgebung; Integrations-API unverändert)
  if (envName) {
    // + technisch freigegebene Aufträge der letzten 60 Tage, deren Prüfung danach nicht in der Akte eingetragen wurde (Nachweis fehlt)
    const all = (await env.DB.prepare(`SELECT maintenance_rule_id AS rid, id, case_no, status, created_at, closed_at FROM cases WHERE maintenance_rule_id IS NOT NULL AND environment=?
      AND (status NOT IN ('fahrzeug_freigegeben','abgelehnt') OR (status='fahrzeug_freigegeben' AND closed_at > ?)) ORDER BY closed_at DESC`).bind(envName, berlinWindowStartIso(60)).all()).results; // Berliner Kalendertage wie Winteraufträge (20.10.2026)
    const orders = new Map(); const released = new Map();
    for (const o of all) {
      if (o.status !== 'fahrzeug_freigegeben') orders.set(o.rid, { id: o.id, case_no: o.case_no, status: o.status });
      else if (!released.has(o.rid)) released.set(o.rid, o);
    }
    for (const r of rows) {
      r.open_order = orders.get(r.id) || null;
      const o = released.get(r.id);
      r.unrecorded_order = o && !r.open_order && !(r.last_done_date && r.last_done_date >= berlinDate(o.created_at)) ? { id: o.id, case_no: o.case_no, closed_at: o.closed_at } : null;
    }
  }
  // Prüfmängel ohne Folgevorgang (nur App-Ansicht mit Umgebung; Lesezugriff ohne Nachweistext nicht nötig – gleiche Rechte wie die Übersicht)
  // + Pflichtprüfung ohne Prüfergebnis (gleiche Regel wie Datenqualität `inspection_no_result`) – für „Heute zu tun“ der Leitung; eine Abfrage
  const lists = envName ? await maintenanceEventLists(env, envName, sKey ? vIds : null) : null;
  const defects = lists ? lists.defects_without_case : undefined;
  const reinspection = lists ? lists.reinspection_pending : undefined;
  const noResult = lists ? lists.result_missing : undefined;
  const count = (s) => rows.filter((r) => r.status === s).length;
  return { today, site: siteSel, site_options: siteOptions, warn_days: warnDays, warn_km: warnKm, required_kinds: REQUIRED_KINDS, required_kinds_trailer: REQUIRED_KINDS_TRAILER, rows, gaps, ...(defects ? { defects_without_case: defects } : {}), ...(reinspection ? { reinspection_pending: reinspection } : {}), ...(noResult ? { result_missing: noResult } : {}), ...(lists ? { lists_truncated: lists.truncated } : {}),
    totals: { overdue: count('ueberfaellig'), due: count('faellig'), ok: count('ok'), no_date: count('ohne_termin'), unclear: count('ungeklaert'), vehicles: vehicles.length, vehicles_with_gaps: gaps.length } };
}

export const csvCell = (x) => {
  // Bidi-Steuerzeichen/Null-Byte aus älteren Einträgen nicht weitergeben (Excel zeigte „‮AZ-123“ verdreht; 22.10.2026)
  let s = x === null || x === undefined ? '' : String(x).replace(/[\u0000\u202A-\u202E\u2066-\u2069]/g, '');
  // Formelschutz (CSV-Injection); reine Zahlen (auch negativ, Dezimalkomma) bleiben Zahlen – z. B. Saldo „-150,5“ statt Text „'-150,5“
  if (/^[=+\-@\t\r]/.test(s) && !/^-\d+(?:[.,]\d+)?$/.test(s)) s = "'" + s;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
// Kennungen/Freitext, die nie als Datum umgeschrieben werden dürfen (Schadennummer, Aktenzeichen, Vertrags-/Teilenummer, Beleg):
// in Anführungszeichen – `csvDatesDe` wandelt nur unquotierte JJJJ-MM-TT um (Schadennummer „2026-10-01“ wurde „01.10.2026“, 18.10.2026)
export const csvText = (x) => quoteCell(csvCell(x));
const STATUS_DE = { ueberfaellig: 'überfällig', faellig: 'bald fällig', ok: 'in Ordnung', ohne_termin: 'ohne Termin', ungeklaert: 'Frist ungeklärt', erledigt: 'erledigt', nicht_pflichtig: 'nicht SP-pflichtig', erste_sp: 'erste SP künftig fällig' };

export function maintenanceCsv(ov) {
  const lines = [['Kennzeichen', 'FIN-Schlüssel', 'Standort', 'Prüfart', 'Letzte Prüfung', 'Nächster Termin', 'Tage bis Termin', 'Status', 'Nachweis', 'Fahrzeugart', 'Fällig bei km', 'Aktueller km-Stand', 'Rest-km', 'km-Fälligkeit voraussichtlich (Prognose)', 'km bei letzter Prüfung', 'Intervall km'].join(';')];
  for (const r of ov.rows) lines.push([csvCell(r.plate), csvCell(r.vehicle_id), csvCell(r.site), csvCell(r.kind), r.last_done_date || '', r.next_due_date || '', r.days ?? '', STATUS_DE[r.status], csvCell(r.evidence), r.vehicle_kind === 'anhaenger' ? 'Anhänger' : 'Lkw', r.next_due_km ?? '', r.current_km ?? '', r.km_remaining ?? '', r.km_forecast ? r.km_forecast.date : '', r.kind === 'HU' || r.kind === 'SP' ? '' : r.last_done_km ?? '', r.interval_km ?? ''].join(';'));
  for (const g of ov.gaps) for (const k of g.missing) lines.push([csvCell(g.plate), csvCell(g.vehicle_id), csvCell(g.site), csvCell(k), '', '', '', 'kein Termin hinterlegt', '', g.vehicle_kind === 'anhaenger' ? 'Anhänger' : 'Lkw', '', '', '', '', '', ''].join(';'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// Import: Kopfzeile mit Kennzeichen und/oder FIN, Art, Nächster Termin (oder Letzte Prüfung + Intervall), Nachweis.
// Spalte nach Namensliste: zuerst exakter Name, dann Anfang des Namens – jeweils in der Reihenfolge der Liste (wie `pick` in tacho.js)
const headCol = (head, names, ok = () => true) => {
  for (const n of names) { const i = head.findIndex((h) => h.trim() === n && ok(h)); if (i >= 0) return i; }
  for (const n of names) { const i = head.findIndex((h) => h.trim().startsWith(n) && ok(h)); if (i >= 0) return i; }
  return -1;
};
const notDateHead = (h) => !/datum|\bvom\b|\bam\b|\bdate\b/.test(h);
export async function importMaintenanceCsv(env, user, text, { dryRun = false } = {}) {
  if (!WRITE_ROLES.includes(user.role)) throw forbidden('Nur Inhaber und Fuhrparkleitung dürfen Prüftermine importieren.');
  const table = parseCsv(text);
  if (table.length < 2) throw bad('validation', 'CSV leer.');
  if (table.length - 1 > MAX_ROWS) throw bad('validation', `Maximal ${MAX_ROWS} Zeilen je Import.`);
  const head = table[0].map((h) => h.toLowerCase());
  // Datums-/Monatsspalten nie aus km-Spalten lesen („Fällig bei km“, „Intervall km“, „km bei letzter Prüfung“)
  // Vorrang nach Namensliste (erst exakter Name, dann Anfang), nicht nach Spaltenposition – „Belegdatum“ vor „Nachweis“ wurde sonst als
  // Nachweis gelesen (21.10.2026); Nachweis/Quelle/Beleg nie aus Datumsspalten
  const col = (names, ok = () => true) => headCol(head, names, (h) => !h.includes('km') && ok(h));
  const kmCol = (test) => head.findIndex((h) => h.includes('km') && test(h));
  const ck = { due: kmCol((h) => /f(ä|ae)llig/.test(h) && !/prognose|voraussichtlich|rest/.test(h)),
    last: kmCol((h) => /letzte|zuletzt/.test(h) && h !== 'letzter km-stand'), // „Letzter km-Stand“ = aktueller Zählerstand, nicht die Prüfung
    interval: kmCol((h) => h.startsWith('intervall')) };
  const ci = { plate: col(['kennzeichen']), vin: col(['fin', 'fahrgestell']), kind: col(['art', 'prüfart', 'pruefart', 'prüfung', 'pruefung']),
    due: col(['nächste', 'naechste', 'fällig', 'faellig', 'termin']), last: col(['letzte', 'zuletzt']), interval: col(['intervall']), evidence: col(['nachweis', 'quelle', 'beleg'], notDateHead) };
  if (ci.plate < 0 && ci.vin < 0) throw bad('validation', 'Spalte Kennzeichen oder FIN erforderlich.');
  if (ci.kind < 0 || ci.evidence < 0) throw bad('validation', 'Spalten Art und Nachweis erforderlich.');
  if (ci.due < 0 && ci.last < 0 && ck.due < 0 && ck.last < 0) throw bad('validation', 'Spalte „Nächster Termin“ oder „Letzte Prüfung“ erforderlich.');

  // km_drop: letzter km-Rücksprung je Fahrzeug (km-Grundlage einer Durchführung vor dem Tachotausch bleibt „ungeklärt“, kmBasisForDone)
  const vehicles = (await env.DB.prepare(`SELECT v.id, v.plate, v.eval_excluded, v.created_at, ${KM_DROP_SQL('v.id')} AS km_drop FROM vehicles v WHERE v.active=1`).all()).results;
  const offOf = await inactiveIndex(env); // außer Betrieb genommene Fahrzeuge: eigener Grund statt „nicht im Fahrzeugstamm“ (20.10.2026)
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const byPlate = plateIndex(vehicles);
  const existing = (await env.DB.prepare('SELECT id, vehicle_id, kind, next_due_date, last_done_date, interval_months, interval_km, last_done_km, due_km, evidence, due_source, km_basis_at, planned_date FROM maintenance_rules ORDER BY created_at').all()).results;
  const ruleOf = new Map(); const ruleCount = new Map();
  for (const r of existing) { const k = `${r.vehicle_id}|${r.kind}`; if (!ruleOf.has(k)) ruleOf.set(k, r); ruleCount.set(k, (ruleCount.get(k) || 0) + 1); }
  // „Sonstiges“ darf es je Fahrzeug mehrfach geben (Kran-, Tankprüfung …): der Import kennt nur eine Zeile je Fahrzeug+Art und schrieb
  // beim unveränderten Wiedereinlesen des eigenen Exports den zweiten Termin auf den ersten (17.10.2026) – dann nur einzeln in der Akte
  const MULTI_SKIP = 'Mehrere Prüftermine „Sonstiges“ an diesem Fahrzeug – einzeln in der Fahrzeugakte pflegen';
  const multiLines = new Map();

  const result = { dry_run: !!dryRun, created: 0, updated: 0, unchanged: 0, skipped: [], rows: [] };
  const planned = new Map(); // je Fahrzeug+Art gilt der späteste belegte Termin der Datei
  const get = (cells, i) => (i >= 0 ? cells[i] || '' : '');
  table.slice(1).forEach((cells, idx) => {
    const line = cells.line || idx + 2;
    const plateRaw = get(cells, ci.plate);
    const skip = (reason) => result.skipped.push({ line, plate: plateRaw || get(cells, ci.vin), reason });
    let v = null; let matchedBy = null;
    const vinRaw = normalizeVin(get(cells, ci.vin));
    if (vinRaw) {
      if (!isValidVin(vinRaw)) return skip('FIN ungültig');
      v = byId.get(`VIN:${vinRaw}`);
      if (!v) return skip(offOf.vins.has(vinRaw) ? INACTIVE_SKIP : 'FIN nicht im Fahrzeugstamm');
      matchedBy = 'FIN';
    } else {
      const hit = byPlate.get(normPlate(plateRaw));
      if (!plateRaw || !hit) return skip(plateRaw && offOf.plates.has(normPlate(plateRaw)) ? INACTIVE_SKIP : 'Kennzeichen nicht im Fahrzeugstamm');
      if (hit === 'mehrdeutig') return skip('Kennzeichen mehrdeutig – FIN angeben');
      v = hit; matchedBy = 'Kennzeichen';
    }
    const kind = normalizeKind(get(cells, ci.kind));
    if (!kind) return skip(`Prüfart unbekannt: ${get(cells, ci.kind) || '–'}`);
    // mehrere Rückrufe je Fahrzeug möglich – der Import kennt nur eine Zeile je Fahrzeug+Art und würde einen offenen Rückruf überschreiben
    if (ONE_TIME_KINDS.includes(kind)) return skip('Rückrufe über „Rückrufe importieren“ oder einzeln in der Fahrzeugakte erfassen');
    const evidence = get(cells, ci.evidence);
    // Lückenzeile aus dem eigenen Export („kein Termin hinterlegt“), nicht ausgefüllt: ruhiger Hinweis statt „Nachweis fehlt“
    const kmRaw = [ck.due, ck.last, ck.interval].map((i) => get(cells, i).trim());
    if (!evidence && !get(cells, ci.due).trim() && !get(cells, ci.last).trim() && !kmRaw.some(Boolean)) return skip('Kein Termin eingetragen – Zeile bleibt unverändert');
    if (!evidence) return skip('Nachweis/Quelle fehlt');
    if (evidence.length > 300) return skip('Nachweis zu lang (max. 300 Zeichen)');
    const due = parseDueDate(get(cells, ci.due));
    if (due.error) return skip(due.error);
    if (due.date && due.date > maxFutureDate()) return skip(DUE_FAR_MSG);
    const last = parseDueDate(get(cells, ci.last));
    if (last.error) return skip(last.error);
    if (last.month_only) return skip('Letzte Prüfung bitte taggenau (JJJJ-MM-TT oder TT.MM.JJJJ)');
    // wie Einzelerfassung/„erledigt“: keine Durchführung in der Zukunft (sonst verdeckte eine erfundene Folgefrist einen fälligen Termin, 17.10.2026)
    if (last.date && last.date > berlinDate()) return skip('Letzte Prüfung liegt in der Zukunft');
    if (matchedBy === 'Kennzeichen' && platePassedOn(offOf.plates, v, last.date)) return skip(PLATE_PASSED_ON_SKIP);
    if (matchedBy === 'Kennzeichen' && plateFormerOther(offOf.former, v, last.date)) return skip(PLATE_FORMER_SKIP);
    let interval = null;
    const husp = kind === 'HU' || kind === 'SP';
    const ir = husp ? '' : get(cells, ci.interval); // HU/SP: Intervall spielt keine Rolle (Zeile mit „12 Monate“ fiel sonst weg, 18.10.2026)
    if (ir) { interval = Number(ir.replace(',', '.')); if (!Number.isInteger(interval) || interval < 1 || interval > 120) return skip(`Intervall ungültig: ${ir}`); }
    // HU/SP: Fälligkeit nur aus Nachweis (Plakette/Beleg) oder zentral nach StVZO Anlage VIII – nie aus einem pauschalen Intervall
    if (husp) interval = null;
    // Kilometer (nicht HU/SP – dort zählt nur die Zeit): belegte Fälligkeit, km bei letzter Prüfung, Intervall km
    let dueKm = null, lastKm = null, intervalKm = null;
    if (!husp) {
      const kmNum = (raw, min, max) => { if (!raw) return null; let n; try { n = num(raw, { min, max, field: 'km', grouped: true }); } catch { return NaN; } return Number.isInteger(n) ? n : NaN; };
      dueKm = kmNum(kmRaw[0], 1, 5000000); if (Number.isNaN(dueKm)) return skip(`km ungültig: ${kmRaw[0]}`);
      lastKm = kmNum(kmRaw[1], 0, 5000000); if (Number.isNaN(lastKm)) return skip(`km ungültig: ${kmRaw[1]}`);
      intervalKm = kmNum(kmRaw[2], 100, 1000000); if (Number.isNaN(intervalKm)) return skip(`km ungültig: ${kmRaw[2]}`);
      // „Fällig bei km ≤ km letzte Prüfung“ erst nach dem Abgleich mit dem gespeicherten Termin (zweite Schleife): im eigenen Export ist die
      // km-Fälligkeit abgeleitet – eine verspätet nachgetragene Durchführung wurde sonst abgewiesen (20.10.2026)
    }
    let next = due.date;
    if (!next && last.date && interval) next = addMonths(last.date, interval);
    if (!next && !last.date && dueKm === null && lastKm === null) return skip('Kein Datum: „Nächster Termin“ oder „Letzte Prüfung“ angeben');
    // „Letzte Prüfung nach dem nächsten Termin“ erst nach dem Abgleich mit dem gespeicherten (berechneten) Termin prüfen – sonst wurde
    // eine verspätet erledigte Prüfung im eigenen Export abgewiesen (20.10.2026)
    const ev = due.month_only ? `${evidence} (Plakette ${get(cells, ci.due)}: fällig bis Monatsende)` : evidence;
    const key = `${v.id}|${kind}`;
    if (MULTI_RULE_KINDS.includes(kind)) {
      if ((ruleCount.get(key) || 0) > 1) return skip(MULTI_SKIP);
      const firstLine = multiLines.get(key);
      if (firstLine !== undefined) { // zweite Zeile derselben Art in der Datei: beide nicht übernehmen
        if (firstLine !== null) { const pr = planned.get(key); planned.delete(key); result.skipped.push({ line: pr.line, plate: pr.plate, reason: MULTI_SKIP }); multiLines.set(key, null); }
        return skip(MULTI_SKIP);
      }
      multiLines.set(key, line);
    }
    const sortKey = next || last.date || '';
    const sortKm = dueKm ?? lastKm ?? -1;
    const prev = planned.get(key);
    // Zeilen mit sich ergänzenden Angaben zusammenführen (18.10.2026): eine Zeile nur mit der Durchführung (Rechnung) und eine nur mit dem
    // Termin laut Plakette – vorher verdrängte die Plakettenzeile die Durchführung (Termin mit Durchführungsdatum verglichen), die HU fehlte
    if (prev && dueKm === null && lastKm === null && prev.dueKm === null && prev.lastKm === null) {
      const docOnly = (x) => x.dueSource === 'nachweis' && !x.last; const doneOnly = (x) => !!x.last && x.dueSource !== 'nachweis';
      const cur0 = { last: last.date, dueSource: due.date ? 'nachweis' : 'berechnet' };
      const pair = docOnly(prev) && doneOnly(cur0) ? { last: last.date, next: prev.next, interval: interval || prev.interval }
        : doneOnly(prev) && docOnly(cur0) ? { last: prev.last, next, interval: prev.interval || interval } : null;
      // Durchführung nach dem Termin laut Plakette: alte Plakette – keine Zusammenführung, die normale Regel (neuerer Beleg gilt) entscheidet
      // (vorher fiel die neuere Durchführung weg, wenn die alte Plakette in der Datei zuerst stand, 18.10.2026)
      if (pair && !(pair.last > pair.next)) {
        Object.assign(prev, { next: pair.next, last: pair.last, interval: pair.interval, evidence: prev.evidence === ev ? ev : cutText(`${prev.evidence}; ${ev}`, 500), sortKey: pair.next, dueSource: 'nachweis' });
        return;
      }
    }
    if (prev && (prev.sortKey > sortKey || (prev.sortKey === sortKey && prev.sortKm >= sortKm))) return skip(`Doppelt in der Datei (Zeile ${prev.line} ist gleich oder neuer)`);
    if (prev) result.skipped.push({ line: prev.line, plate: prev.plate, reason: `Ersetzt durch Zeile ${line} (neuerer Beleg)` });
    planned.set(key, { line, vehicle_id: v.id, plate: v.plate, kind, next, last: last.date, interval, evidence: ev, matchedBy, sortKey, sortKm, husp, dueKm, lastKm, intervalKm, dueSource: due.date ? 'nachweis' : 'berechnet' });
  });

  const now = nowIso();
  const stmts = []; const creates = []; const updates = []; const rowOf = new Map(); const impLog = new Map(); // Anweisung → Zeile der Vorschau (gleichzeitig geändert)
  const huspSim = []; // HU/SP-Zeilen: Termin der Vorschau nach StVZO Anl. VIII aus den neuen Angaben (21.10.2026)
  // HU/SP ohne eigenen Eintrag: der eigene Export schreibt die nur berechnete Frist (Zeile „virtual“) in „Nächster Termin“. Entspricht der Wert
  // genau dieser Berechnung, ist er kein Nachweis (21.10.2026: wurde als Nachweis gespeichert und später nie neu berechnet → „Frist ungeklärt“
  // nach der nächsten HU bzw. verspätete SP als „Letzte Prüfung nach dem Termin“ abgewiesen)
  const virtCand = [...planned.values()].filter((p) => p.husp && p.next && !ruleOf.get(`${p.vehicle_id}|${p.kind}`));
  if (virtCand.length) {
    const hin = await loadHuSpInputs(env, [...new Set(virtCand.map((p) => p.vehicle_id))]); const today0 = berlinDate();
    for (const p of virtCand) {
      const x = hin.get(p.vehicle_id); if (!x) continue;
      const h = huSpFor(x, today0, 0); const y = p.kind === 'HU' ? h.hu : h.sp;
      if (y && y.due === p.next && y.due_basis === 'berechnet') { p.next = null; p.dueSource = 'berechnet'; }
    }
  }
  for (const p of [...planned.values()].sort((a, b) => a.line - b.line)) {
    const cur = ruleOf.get(`${p.vehicle_id}|${p.kind}`);
    const skipRow = (reason) => result.skipped.push({ line: p.line, plate: p.plate, reason });
    // eigener Export mit neuer „Letzte Prüfung“, aber unverändertem berechnetem „Nächster Termin“: der alte Termin ist kein Nachweis,
    // sondern folgt aus der neuen Durchführung (wurde sonst als Nachweis gespeichert, 18.10.2026)
    if (cur && p.next && p.next === cur.next_due_date && p.last && (!cur.last_done_date || p.last > cur.last_done_date)
      && (cur.due_source === 'berechnet' || (cur.due_source == null && cur.interval_months && cur.last_done_date && addMonths(cur.last_done_date, cur.interval_months) === cur.next_due_date))) {
      p.next = null; p.dueSource = 'berechnet';
    }
    // dasselbe für km: unveränderte (abgeleitete) km-Fälligkeit bei neuerer Durchführung gilt nicht als Beleg
    if (cur && !p.husp && p.dueKm !== null && p.lastKm !== null && cur.last_done_km !== null && p.lastKm > cur.last_done_km && p.dueKm === ruleDueKm(cur)) p.dueKm = null;
    if (p.next && p.last && p.last > p.next) { skipRow('Letzte Prüfung liegt nach dem nächsten Termin'); continue; }
    let action; let next = p.next; let last = p.last;
    let keepDoc = false;
    if (!cur) action = 'neu';
    else if (!p.next && !p.last) { next = cur.next_due_date; last = cur.last_done_date; action = 'unverändert'; } // nur km-Angaben
    else if (p.next) {
      if (cur.next_due_date && cur.next_due_date > p.next) { skipRow(`Vorhandener Termin ${cur.next_due_date} ist neuer – nicht überschrieben`); continue; }
      // gespeicherte letzte Durchführung nach dem belegten Termin: alte Plakette (Einzelerfassung lehnt das ab, 17.10.2026)
      if (cur.last_done_date && cur.last_done_date > p.next) { skipRow(`Vorhandene letzte Prüfung ${cur.last_done_date} liegt nach dem Termin – nicht überschrieben`); continue; }
      if (cur.last_done_date && p.last && cur.last_done_date > p.last) last = cur.last_done_date;
      action = cur.next_due_date === p.next && (!p.last || cur.last_done_date === last) ? 'unverändert' : 'aktualisiert';
    } else {
      // Nur letzte Prüfung belegt: Termin ergibt sich ausschließlich aus einem bereits hinterlegten Intervall
      if (cur.last_done_date && cur.last_done_date > p.last) { skipRow(`Vorhandene letzte Prüfung ${cur.last_done_date} ist neuer – nicht überschrieben`); continue; }
      const iv = p.husp ? null : (p.interval || cur.interval_months);
      next = iv ? addMonths(p.last, iv) : p.husp ? null : (cur.next_due_date && cur.next_due_date > p.last ? cur.next_due_date : null);
      // HU/SP: ältere Rechnung als die belegte Plakette – Termin laut Nachweis bleibt, die Durchführung kommt nur in den Verlauf
      // (wurde sonst durch die Rechnung als „berechnet“ ersetzt und überfällig, 18.10.2026)
      if (p.husp && cur.due_source === 'nachweis' && cur.next_due_date && dueMonthEnd(p.last, p.kind === 'HU' ? 12 : 6).slice(0, 7) <= cur.next_due_date.slice(0, 7)) { // gleicher Monat: Rechnung bestätigt die Plakette, Nachweis bleibt (19.10.2026)
        next = cur.next_due_date; keepDoc = true;
      }
      // dieselbe Durchführung wie gespeichert: deren Termin bleibt (ein späterer Termin laut Nachweis wurde sonst durch „letzte + Intervall“ ersetzt, 17.10.2026)
      if (cur.last_done_date === p.last && cur.next_due_date && !(p.interval && !p.husp && p.interval !== cur.interval_months)) next = cur.next_due_date;
      action = cur.last_done_date === p.last && cur.next_due_date === next ? 'unverändert' : 'aktualisiert';
    }
    // geändertes Intervall (Monate) aus der Datei gilt auch ohne geänderte Daten (ging sonst als „unverändert“ still verloren, 17.10.2026)
    if (cur && action === 'unverändert' && !p.husp && p.interval && p.interval !== cur.interval_months) action = 'aktualisiert';
    // km-Teil: nie einen höheren vorhandenen km-Stand/eine spätere km-Fälligkeit überschreiben; belegter Wert nur, wenn er von „letzte + Intervall“ abweicht
    const km = { last: cur ? cur.last_done_km : null, interval: cur ? cur.interval_km : null, due: cur ? cur.due_km : null };
    if (!p.husp && (p.dueKm !== null || p.lastKm !== null || p.intervalKm !== null)) {
      if (p.lastKm !== null && km.last !== null && p.lastKm < km.last) { skipRow(`Vorhandener km-Stand der letzten Prüfung ${km.last} ist höher – nicht überschrieben`); continue; }
      // neuere Durchführung: höherer km-Stand als bisher bzw. (ohne bisherigen km-Stand) am/nach der belegten Fälligkeit
      // oder mit späterer Fälligkeit aus „letzte + Intervall“ (wie bei Daten: der spätere Beleg gilt)
      const ivNew = p.intervalKm ?? km.interval;
      const advanced = p.lastKm !== null && (km.last !== null ? p.lastKm > km.last : km.due !== null && (p.lastKm >= km.due || (!!ivNew && p.lastKm + ivNew > km.due)));
      const curEff = ruleDueKm(cur);
      if (p.dueKm !== null && !advanced && curEff !== null && p.dueKm < curEff) { skipRow(`Vorhandene km-Fälligkeit ${curEff} ist höher – nicht überschrieben`); continue; }
      const nl = p.lastKm ?? km.last; const ni = p.intervalKm ?? km.interval;
      const derived = nl !== null && ni ? nl + ni : null;
      let explicit = p.dueKm !== null ? p.dueKm : advanced ? null : km.due; // neuere Durchführung: alter Beleg gilt nicht mehr
      if (explicit !== null && explicit === derived) explicit = null;
      if (explicit !== null && nl !== null && explicit <= nl) { skipRow('Fällig bei km liegt nicht nach dem km-Stand der letzten Prüfung'); continue; }
      if (!p.next && !p.last && explicit === null && derived === null) { skipRow('km-Intervall fehlt: „Intervall km“ oder „Fällig bei km“ angeben'); continue; }
      const changed = nl !== km.last || ni !== km.interval || explicit !== km.due;
      Object.assign(km, { last: nl, interval: ni, due: explicit });
      if (cur && changed && action === 'unverändert') action = 'aktualisiert';
    }
    const dueKmEff = p.husp ? null : ruleDueKm({ due_km: km.due, last_done_km: km.last, interval_km: km.interval });
    // Grundlage des Termins wie unten gespeichert (für die HU/SP-Berechnung der Vorschau)
    const dsrc = !cur ? p.dueSource : (p.next && p.dueSource === 'nachweis') || keepDoc ? 'nachweis' : (p.husp || (!p.next && next !== cur.next_due_date) ? 'berechnet' : cur.due_source || null);
    if (p.husp && action !== 'unverändert') huspSim.push({ vehicle_id: p.vehicle_id, kind: p.kind, next, last, dsrc, evidence: p.evidence, row: result.rows.length });
    result.rows.push({ line: p.line, plate: p.plate, vehicle_id: p.vehicle_id, kind: p.kind, last_done_date: last, next_due_date: next, previous_due_date: cur ? cur.next_due_date : null, next_due_km: dueKmEff, previous_due_km: cur && !p.husp ? ruleDueKm(cur) : null, last_done_km: p.husp ? null : km.last, interval_km: p.husp ? null : km.interval, matched_by: p.matchedBy, action });
    if (action === 'neu') {
      result.created++;
      const ruleId = uuid();
      // nur, wenn es die Prüfart am Fahrzeug noch nicht gibt (zwei gleichzeitige Importe legten sonst jede Regel doppelt an, 17.10.2026)
      creates.push(stmts.length); rowOf.set(stmts.length, result.rows.length - 1);
      stmts.push(env.DB.prepare(`INSERT INTO maintenance_rules(id,vehicle_id,kind,interval_months,interval_km,last_done_date,last_done_km,due_km,next_due_date,evidence,created_by,created_at,updated_at,due_source,km_basis_at)
        SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15 WHERE NOT EXISTS (SELECT 1 FROM maintenance_rules WHERE vehicle_id=?2 AND kind=?3)`)
        .bind(ruleId, p.vehicle_id, p.kind, p.interval, km.interval, last, km.last, km.due, next, p.evidence, user.id, now, now, p.dueSource,
          kmBasisForDone(parseKmDrop((byId.get(p.vehicle_id) || {}).km_drop), last, null, now)));
      if (last) stmts.push(maintEventStmt(env, { rule_id: ruleId, vehicle_id: p.vehicle_id, kind: p.kind, done_date: last, done_km: p.lastKm, evidence: p.evidence, source: 'import', user_id: user.id }, { ifRule: true }));
    } else if (action === 'aktualisiert') {
      result.updated++;
      // nur auf dem gelesenen Stand (17.10.2026): eine gleichzeitig erfasste Durchführung („erledigt“) wurde sonst mit den alten Werten überschrieben
      updates.push(stmts.length); rowOf.set(stmts.length, result.rows.length - 1);
      // Protokoll je geänderter Regel mit alt → neu (22.10.2026: vorher nur Zähler – überschriebene Fälligkeit/Nachweis nicht mehr nachvollziehbar)
      {
        const newEv = keepDoc && cur.evidence && cur.evidence !== p.evidence ? cutText(`${cur.evidence}; ${p.evidence}`, 500) : p.evidence;
        const ch = {};
        for (const [k, a0, b0] of [['next_due_date', cur.next_due_date, next], ['last_done_date', cur.last_done_date, last || cur.last_done_date],
          ['interval_months', cur.interval_months, p.husp ? null : (p.interval ?? cur.interval_months)], ['interval_km', cur.interval_km, km.interval], ['last_done_km', cur.last_done_km, km.last],
          ['due_km', cur.due_km, km.due], ['evidence', cur.evidence, newEv], ['planned_date', cur.planned_date, p.last && (!cur.last_done_date || p.last > cur.last_done_date) ? null : cur.planned_date]]) {
          if ((a0 ?? null) !== (b0 ?? null)) ch[k] = { from: a0 ?? null, to: b0 ?? null };
        }
        impLog.set(stmts.length, { vehicle_id: p.vehicle_id, detail: { plate: p.plate, kind: p.kind, changed: ch } });
      }
      stmts.push(env.DB.prepare(`UPDATE maintenance_rules SET next_due_date=?, last_done_date=?, interval_months=CASE WHEN ? THEN NULL ELSE COALESCE(?, interval_months) END, interval_km=?, last_done_km=?, due_km=?, evidence=?, updated_at=?, km_basis_at=CASE WHEN ? THEN ? ELSE km_basis_at END, due_source=?, planned_date=CASE WHEN ? THEN NULL ELSE planned_date END WHERE id=?
        AND next_due_date IS ? AND last_done_date IS ? AND last_done_km IS ? AND due_km IS ? AND interval_km IS ?`)
        // km-Grundlage nur neu, wenn sich km-Werte ändern (nur „Nächster Termin“ geändert: ein Tachotausch blieb sonst unerkannt, 17.10.2026)
        .bind(next, last || cur.last_done_date, p.husp ? 1 : 0, p.interval, km.interval, km.last, km.due, keepDoc && cur.evidence && cur.evidence !== p.evidence ? cutText(`${cur.evidence}; ${p.evidence}`, 500) : p.evidence, now,
          (km.interval ?? null) !== (cur.interval_km ?? null) || (km.last ?? null) !== (cur.last_done_km ?? null) || (km.due ?? null) !== (cur.due_km ?? null) ? 1 : 0,
          kmBasisForDone(parseKmDrop((byId.get(p.vehicle_id) || {}).km_drop), p.last, cur.km_basis_at, now), (p.next && p.dueSource === 'nachweis') || keepDoc ? 'nachweis' : (p.husp || (!p.next && next !== cur.next_due_date) ? 'berechnet' : cur.due_source || null),
          // neue Durchführung erledigt den geplanten Werkstatttermin (wie „erledigt“ in der Akte; 18.10.2026 stand er weiter im Werkstattplan)
          p.last && (!cur.last_done_date || p.last > cur.last_done_date) ? 1 : 0, cur.id,
          cur.next_due_date ?? null, cur.last_done_date ?? null, cur.last_done_km ?? null, cur.due_km ?? null, cur.interval_km ?? null));
      // Protokoll alt → neu direkt hinter der Änderung, nur wenn sie gegriffen hat (changes() der vorigen Anweisung) – im selben Stapel (22.10.2026)
      { const lg = impLog.get(stmts.length - 1); stmts.push(env.DB.prepare(`INSERT INTO audit_log(id,actor_id,action,target,detail,created_at) SELECT ?1, ?2, 'maintenance.import_update', ?3, ?4, ?5 WHERE changes() > 0`)
        .bind(uuid(), user.id, lg.vehicle_id, JSON.stringify(lg.detail), now)); }
      if (p.last) stmts.push(maintEventStmt(env, { rule_id: cur.id, vehicle_id: p.vehicle_id, kind: p.kind, done_date: p.last, done_km: p.lastKm, evidence: p.evidence, source: 'import', user_id: user.id }));
    } else result.unchanged++;
  }
  result.skipped.sort((a, b) => a.line - b.line);
  // HU/SP ohne belegten Termin: Vorschau (und Antwort nach dem Übernehmen) zeigt den Termin, der sich aus der neuen Durchführung berechnet
  // (21.10.2026: vorher „–“, erst syncHuSpDues rechnete ihn nach dem Übernehmen aus). Nur Anzeige – gespeichert wird weiter über syncHuSpDues.
  if (huspSim.some((h) => !h.next)) {
    const hin = await loadHuSpInputs(env, [...new Set(huspSim.map((h) => h.vehicle_id))]); const todayS = berlinDate();
    for (const h of huspSim) {
      const x = hin.get(h.vehicle_id); if (!x) continue;
      const r0 = x.rules.find((q) => q.kind === h.kind);
      if (r0) Object.assign(r0, { next_due_date: h.next, last_done_date: h.last, due_source: h.dsrc });
      else x.rules.push({ id: null, vehicle_id: h.vehicle_id, kind: h.kind, next_due_date: h.next, due_source: h.dsrc, planned_date: null, last_done_date: h.last, evidence: h.evidence });
      if (h.last && !x.events.some((e) => e.kind === h.kind && e.done_date === h.last)) x.events.push({ vehicle_id: h.vehicle_id, kind: h.kind, done_date: h.last, evidence: h.evidence, result: null });
    }
    for (const h of huspSim) {
      if (h.next) continue;
      const x = hin.get(h.vehicle_id); if (!x) continue;
      const y = huSpFor(x, todayS, 0)[h.kind === 'HU' ? 'hu' : 'sp'];
      const row = result.rows[h.row];
      if (row && y && y.due && y.due_basis === 'berechnet') { row.next_due_date = y.due; row.next_due_basis = 'berechnet'; }
    }
  }
  if (!dryRun) {
    const { missed, missedUpd, missedIdx } = await runBatchesCounting(env, stmts, creates, updates, [...creates, ...updates]);
    for (const i of missedIdx) if (rowOf.has(i)) result.rows[rowOf.get(i)].action = 'unverändert'; // Zeilenliste wie die Zähler
    if (missed) { result.created -= missed; result.unchanged += missed; result.concurrent = missed; }
    if (missedUpd) { result.updated -= missedUpd; result.unchanged += missedUpd; result.concurrent = (result.concurrent || 0) + missedUpd; }
    await audit(env, user.id, 'maintenance.import', null, { created: result.created, updated: result.updated, unchanged: result.unchanged, skipped: result.skipped.length });
    const hv = [...new Set(result.rows.filter((r) => r.kind === 'HU' || r.kind === 'SP').map((r) => r.vehicle_id))];
    if (hv.length) result.husp_recalc = (await syncHuSpDues(env, { today: berlinDate(), actorId: user.id, vehicleIds: hv })).changed;
  }
  return result;
}

// Kennzeichen → Fahrzeug; doppeltes Kennzeichen wegen ruhendem Doppel (Fall SZ-YC 5539) → das bewertete Fahrzeug, wie beim
// Auslesungen-Import und bei Bußgeldern (17.10.2026); sonst „mehrdeutig“
const INACTIVE_SKIP = 'Fahrzeug außer Betrieb – nicht übernommen';
// Kennzeichen weitergegeben (Fahrzeugverkauf, Backlog 188): Nachweis nur mit Kennzeichen, datiert vor der Anlage des heutigen Fahrzeugs,
// während ein außer Betrieb genommenes Fahrzeug dasselbe Kennzeichen trägt → gehört vermutlich zum Altfahrzeug; FIN verlangen
// (vorher: HU vom 15.09. des verkauften Lkw am Nachfolger → dessen fällige HU nirgends gemeldet). Ohne Datum oder nach der Anlage: Nachfolger.
export const PLATE_PASSED_ON_SKIP = 'Kennzeichen auch an außer Betrieb genommenem Fahrzeug, Datum vor Anlage dieses Fahrzeugs – bitte FIN angeben';
export const platePassedOn = (offPlates, v, day) => !!(day && v && v.created_at && offPlates.has(normPlate(v.plate)) && day < berlinDate(v.created_at));
// Kennzeichenwechsel (Backlog 257a, Migration 0082): Zeile nur mit Kennzeichen, datiert vor dem Wechsel, während das Kennzeichen damals einem
// ANDEREN Fahrzeug gehörte (umgekennzeichneter Lkw, Neuzugang trägt das alte Kennzeichen) → FIN verlangen (wie Backlog 188)
export const PLATE_FORMER_SKIP = 'Kennzeichen gehörte zu diesem Datum einem anderen Fahrzeug (Kennzeichenwechsel) – bitte FIN angeben';
export const plateFormerOther = (former, v, day) => !!(day && v && (former || []).some((r) => r.vehicle_id !== v.id && normPlate(r.plate) === normPlate(v.plate) && day < berlinDate(r.valid_until)));
export async function formerPlatesAll(env) { return (await env.DB.prepare('SELECT vehicle_id, plate, valid_until FROM vehicle_plates').all()).results; }
async function inactiveIndex(env) {
  const [rows, former] = await Promise.all([env.DB.prepare('SELECT id, plate FROM vehicles WHERE active=0').all(), formerPlatesAll(env)]);
  return { vins: new Set(rows.results.filter((r) => String(r.id).startsWith('VIN:')).map((r) => r.id.slice(4))), plates: new Set(rows.results.map((r) => normPlate(r.plate))), former };
}
function plateIndex(vehicles) {
  const byPlate = new Map(); const evalOnly = new Map();
  for (const v of vehicles) {
    const k = normPlate(v.plate); byPlate.set(k, byPlate.has(k) ? 'mehrdeutig' : v);
    if (!v.eval_excluded) evalOnly.set(k, evalOnly.has(k) ? 'mehrdeutig' : v);
  }
  for (const [k, v] of byPlate) if (v === 'mehrdeutig' && evalOnly.get(k) && evalOnly.get(k) !== 'mehrdeutig') byPlate.set(k, evalOnly.get(k));
  return byPlate;
}

// Anweisungen in Stapeln zu 200 ausführen; zählt, wie viele der Anlage-Anweisungen (Indizes `creates`) nichts eingefügt haben
// (inzwischen von einem gleichzeitigen Import angelegt)
// rowStarts (22.10.2026): Stapelgrenzen nur zwischen Importzeilen – Regel und zugehörige Durchführung/Protokoll einer Zeile immer im selben
// atomaren Stapel (vorher blind je 200: Abbruch zwischen zwei Stapeln ließ eine aktualisierte Regel ohne ihre Durchführung zurück, und eine
// Wiederholung meldete „unverändert“ – die Durchführung fehlte dauerhaft)
async function runBatchesCounting(env, stmts, creates, updates = [], rowStarts = null) {
  const idx = new Set(creates); const uidx = new Set(updates); let missed = 0; let missedUpd = 0; const missedIdx = [];
  const starts = rowStarts ? new Set(rowStarts) : null;
  for (let i = 0; i < stmts.length;) {
    let end = Math.min(i + 200, stmts.length);
    if (starts && end < stmts.length && !starts.has(end)) { let b = end; while (b > i && !starts.has(b)) b--; if (b > i) end = b; }
    const res = await env.DB.batch(stmts.slice(i, end));
    res.forEach((r, n) => { const hit = r && r.meta && r.meta.changes > 0; if (idx.has(i + n) && !hit) { missed++; missedIdx.push(i + n); } if (uidx.has(i + n) && !hit) { missedUpd++; missedIdx.push(i + n); } });
    i = end;
  }
  return { missed, missedUpd, missedIdx };
}

// Rückruf-Import (z. B. Hersteller-/KBA-Liste je FIN): je Zeile ein einmaliger Rückruf (Prüfart „Rückruf“) mit Referenz als Nachweis.
// Frist nur, wenn sie in der Liste steht (nie erfunden). Idempotent: gleiche Referenz am selben Fahrzeug wird nicht doppelt angelegt;
// eine fehlende Frist wird ergänzt, eine abweichende nie überschrieben (Hinweis), ein bereits durchgeführter Rückruf bleibt unverändert.
const RECALL_DORMANT_NOTE = 'Fahrzeug ruhend – Rückruf erscheint nicht in Prüftermin-Übersicht, Werkstattplan und Fuhrparkagent (nur in der Fahrzeugakte)';
export async function importRecallsCsv(env, user, text, { dryRun = false } = {}) {
  if (!WRITE_ROLES.includes(user.role)) throw forbidden('Nur Inhaber und Fuhrparkleitung dürfen Rückrufe importieren.');
  const table = parseCsv(text);
  if (table.length < 2) throw bad('validation', 'CSV leer.');
  if (table.length - 1 > MAX_ROWS) throw bad('validation', `Maximal ${MAX_ROWS} Zeilen je Import.`);
  const head = table[0].map((h) => h.toLowerCase());
  const col = (names, ok) => headCol(head, names, ok); // Vorrang nach Namensliste; Referenz nie aus „Rückrufdatum“ o. Ä. (21.10.2026)
  const ci = { plate: col(['kennzeichen']), vin: col(['fin', 'fahrgestell', 'vin']), ref: col(['referenz', 'rückruf', 'rueckruf', 'aktion', 'kba', 'nachweis'], notDateHead),
    due: col(['frist', 'fällig', 'faellig', 'nächster', 'naechster', 'termin']), note: col(['bemerkung', 'beschreibung', 'maßnahme', 'massnahme']) };
  if (ci.plate < 0 && ci.vin < 0) throw bad('validation', 'Spalte Kennzeichen oder FIN erforderlich.');
  if (ci.ref < 0) throw bad('validation', 'Spalte „Referenz“ (Rückrufnummer laut Schreiben) erforderlich.');
  const vehicles = (await env.DB.prepare('SELECT id, plate, eval_excluded FROM vehicles WHERE active=1').all()).results;
  const offOf = await inactiveIndex(env); // außer Betrieb genommene Fahrzeuge: eigener Grund statt „nicht im Fahrzeugstamm“ (20.10.2026)
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const byPlate = plateIndex(vehicles);
  // vorhandene Rückrufe: Nachweis = Referenz (offen) bzw. „Referenz · Durchführung: …“ (erledigt)
  const existing = (await env.DB.prepare(`SELECT id, vehicle_id, next_due_date, last_done_date, evidence FROM maintenance_rules WHERE kind='Rückruf'`).all()).results;
  // Referenz = Text vor „ – Bemerkung“ bzw. „ · Durchführung: …“ (Groß-/Kleinschreibung egal)
  const refOf = (e) => String(e || '').split(' · Durchführung: ')[0].split(' – ')[0].trim().toLowerCase();
  const known = new Map(existing.map((x) => [`${x.vehicle_id}|${refOf(x.evidence)}`, x]));
  const result = { dry_run: !!dryRun, created: 0, updated: 0, unchanged: 0, skipped: [], rows: [] };
  const seen = new Set();
  const stmts = []; const creates = []; const now = nowIso();
  const get = (cells, i) => (i >= 0 ? String(cells[i] || '').trim() : '');
  table.slice(1).forEach((cells, idx) => {
    const line = cells.line || idx + 2;
    const plateRaw = get(cells, ci.plate);
    const skip = (reason) => result.skipped.push({ line, plate: plateRaw || get(cells, ci.vin), reason });
    if (cells.every((c) => !String(c || '').trim())) return;
    let v = null; let matchedBy = null;
    const vinRaw = normalizeVin(get(cells, ci.vin));
    if (vinRaw) {
      if (!isValidVin(vinRaw)) return skip('FIN ungültig');
      v = byId.get(`VIN:${vinRaw}`);
      if (!v) return skip(offOf.vins.has(vinRaw) ? INACTIVE_SKIP : 'FIN nicht im Fahrzeugstamm');
      matchedBy = 'FIN';
    } else {
      const hit = byPlate.get(normPlate(plateRaw));
      if (!plateRaw || !hit) return skip(plateRaw && offOf.plates.has(normPlate(plateRaw)) ? INACTIVE_SKIP : 'Kennzeichen nicht im Fahrzeugstamm');
      if (hit === 'mehrdeutig') return skip('Kennzeichen mehrdeutig – FIN angeben');
      v = hit; matchedBy = 'Kennzeichen';
    }
    const ref = get(cells, ci.ref);
    if (!ref) return skip('Referenz fehlt');
    const note = get(cells, ci.note);
    const evidence = note ? `${ref} – ${note}` : ref;
    if (evidence.length > 250) return skip('Referenz/Bemerkung zu lang (max. 250 Zeichen)');
    const due = parseDueDate(get(cells, ci.due));
    if (due.error) return skip(due.error);
    if (due.date && due.date > maxFutureDate()) return skip(DUE_FAR_MSG);
    const key = `${v.id}|${refOf(ref)}`;
    if (seen.has(key)) return skip('doppelt in der Datei');
    seen.add(key);
    const cur = known.get(`${v.id}|${refOf(ref)}`);
    let action; const row = { line, plate: v.plate, vehicle_id: v.id, reference: ref, next_due_date: due.date, matched_by: matchedBy };
    if (!cur) {
      action = 'neu'; result.created++;
      // gleiche Referenz am Fahrzeug nur einmal – auch bei zwei gleichzeitigen Importen (17.10.2026)
      // roh binden und in SQL beidseitig lower(): SQLite-lower() wandelt nur A–Z, JS-toLowerCase auch Ä/Ü – „ÄB-4711“ entstand bei zwei
      // gleichzeitigen Importen doppelt (23.10.2026)
      const r = String(ref).split(' · Durchführung: ')[0].split(' – ')[0].trim();
      creates.push(stmts.length);
      stmts.push(env.DB.prepare(`INSERT INTO maintenance_rules(id,vehicle_id,kind,interval_months,interval_km,last_done_date,last_done_km,due_km,next_due_date,evidence,created_by,created_at,updated_at,due_source)
        SELECT ?1,?2,'Rückruf',NULL,NULL,NULL,NULL,NULL,?3,?4,?5,?6,?7,?8 WHERE NOT EXISTS (SELECT 1 FROM maintenance_rules WHERE vehicle_id=?2 AND kind='Rückruf'
          AND (lower(evidence)=lower(?9) OR instr(lower(evidence), lower(?9) || ' – ')=1 OR instr(lower(evidence), lower(?9) || ' · durchführung: ')=1))`)
        .bind(uuid(), v.id, due.date, evidence, user.id, now, now, due.date ? 'nachweis' : null, r));
    } else if (cur.last_done_date) {
      action = 'erledigt'; result.unchanged++; row.done_on = cur.last_done_date; // bereits durchgeführt – bleibt unverändert
    } else if (due.date && !cur.next_due_date) {
      action = 'aktualisiert'; result.updated++;
      stmts.push(env.DB.prepare(`UPDATE maintenance_rules SET next_due_date=?, due_source='nachweis', updated_at=? WHERE id=? AND last_done_date IS NULL`).bind(due.date, now, cur.id));
    } else {
      action = 'unverändert'; result.unchanged++;
      if (due.date && cur.next_due_date && due.date !== cur.next_due_date) { row.note = `Frist in der Liste (${due.date}) weicht ab – vorhandene Frist ${cur.next_due_date} bleibt; in der Fahrzeugakte prüfen`; row.previous_due_date = cur.next_due_date; }
    }
    // ruhendes Fahrzeug (aus Bewertungen ausgenommen): Rückruf wird angelegt, erscheint aber nicht in Übersicht/Werkstattplan/Agent (23.10.2026)
    if (v.eval_excluded && action === 'neu') { row.note = RECALL_DORMANT_NOTE; row.dormant = true; }
    row.action = action; result.rows.push(row);
  });
  result.skipped.sort((a, b) => a.line - b.line);
  if (!dryRun) {
    const { missed } = await runBatchesCounting(env, stmts, creates);
    if (missed) { result.created -= missed; result.unchanged += missed; result.concurrent = missed; }
    await audit(env, user.id, 'maintenance.recall_import', null, { created: result.created, updated: result.updated, unchanged: result.unchanged, skipped: result.skipped.length });
  }
  return result;
}

// Kalenderdatei (iCalendar, RFC 5545) mit allen belegten Prüfterminen als ganztägige Termine + Erinnerung (Vorlauf = maintenance_warn_days)
// Texte in der Sprache der Person (lang; DE/UK/EN, sonst Deutsch) – Nachweis bleibt wie gespeichert
export function maintenanceIcs(ov, stamp = new Date().toISOString(), lang = 'de') {
  const I = icsLang(lang);
  // vom System erzeugte Zusätze im Nachweis je Sprache wie in der App (mEv; 21.10.2026: Plaketten-Hinweis stand im UK/EN-Kalender deutsch)
  const icsEv = (e) => (e ? String(e).replace(' · Durchführung: ', ' · ' + I.tx('ev_done_label') + ': ').replace(/\(Plakette ([^():]+): fällig bis Monatsende\)/, (_, m) => I.tx('ev_plaque_month', { m })) : '–');
  // HU/SP: fachliche UID je Fahrzeug und Prüfart – eine berechnete Zeile (ohne Eintrag) behält beim späteren Anlegen des Eintrags ihre UID,
  // ein erneuter Import ersetzt den Termin statt ihn zu verdoppeln; berechnete Zeile ohne leeren „Nachweis:“ (20.10.2026)
  // erledigter Rückruf: gespeicherte Frist zählt nicht mehr (wie Übersicht/Agent; 20.10.2026)
  const uidOf = (r) => (r.kind === 'HU' || r.kind === 'SP' ? `husp-${r.vehicle_id}-${r.kind}` : r.id);
  const events = ov.rows.filter((r) => r.next_due_date && r.date_status !== 'erledigt').map((r) => ({ uid: uidOf(r), date: r.next_due_date, summary: I.tx('maint_due', { kind: I.kind(r.kind), plate: r.plate || r.vehicle_id }),
    description: (r.virtual ? I.tx('maint_desc_calc') : I.tx('maint_desc', { evidence: r.evidence === HUSP_RULE_EVIDENCE ? I.tx('ev_husp_rule') : icsEv(r.evidence) })) + (r.last_done_date ? ' · ' + I.tx('maint_last', { d: I.d(r.last_done_date) }) : ''), alarm: `${I.kind(r.kind)} ${r.plate || ''}`, alarmDays: ov.warn_days }));
  // geplante Werkstatttermine (ab heute) als eigene Termine ohne Erinnerung – nur gespeicherte Plan-Daten, nichts berechnet
  const today = ov.today || berlinDate();
  for (const r of ov.rows) if (r.planned_date && r.planned_date >= today) events.push({ uid: `${uidOf(r)}-plan`, date: r.planned_date, summary: I.tx('maint_plan', { kind: I.kind(r.kind), plate: r.plate || r.vehicle_id }),
    description: I.tx('maint_plan_desc') + (r.next_due_date ? ' · ' + I.tx('maint_plan_due', { d: I.d(r.next_due_date) }) : '') });
  // gewählter Standort im Kalendernamen (wie Verträge/Werkstattplan) – sonst zwei gleichnamige Kalender beim Import (20.10.2026)
  return icsCalendar(`${I.tx('cal_maint')}${ov.site ? ' – ' + (ov.site === 'ohne' ? I.tx('no_site') : ov.site) : ''}`, events, stamp);
}

// [CLAUDE] Durchgeführte Prüfungen/Wartungen über die ganze Flotte (Nachweis z. B. für Prüfungen durch Behörden/Versicherer):
// nur gespeicherte Durchführungen aus der Wartungshistorie, Zeitraum nach Durchführungsdatum, optional Prüfart. Ändert nichts.
const RESULT_DE = { ohne_maengel: 'ohne Mängel', geringe_maengel: 'geringe Mängel', erhebliche_maengel: 'erhebliche Mängel', gefaehrliche_maengel: 'gefährliche Mängel', verkehrsunsicher: 'verkehrsunsicher' };
const SOURCE_DE = { bestand: 'Bestand (Übernahme)', erfasst: 'erfasst', erledigt: 'als erledigt eingetragen', import: 'Import' };
// Mängelauftrag und Nachprüfung je Durchführung (nur bei erheblichen/gefährlichen Mängeln bzw. verkehrsunsicher): jüngster nicht abgelehnter
// Auftrag der Umgebung mit Verknüpfung auf diese Durchführung; Nachprüfung = nächste spätere Durchführung derselben Prüfart am Fahrzeug.
// result_addable: ohne Ergebnis und neueste ihrer Art am Fahrzeug – wie das Formular „Prüfergebnis nachtragen“ in der Fahrzeugakte (Direktsprung ?ev=).
const DEFECT_SQL = `e.result IN ('erhebliche_maengel','gefaehrliche_maengel','verkehrsunsicher')`;
const NEXT_EVENT_SQL = (col) => `CASE WHEN ${DEFECT_SQL} THEN (SELECT e2.${col} FROM maintenance_events e2 WHERE e2.vehicle_id=e.vehicle_id AND e2.kind=e.kind AND e2.id<>e.id
      AND (e2.done_date > e.done_date OR (e2.done_date = e.done_date AND e2.created_at > e.created_at)) ORDER BY e2.done_date, e2.created_at LIMIT 1) END`;
const DEFECT_CASE_SQL = (col) => `CASE WHEN ${DEFECT_SQL} THEN (SELECT c.${col} FROM cases c WHERE c.maintenance_event_id=e.id AND c.environment=?1 AND c.status<>'abgelehnt' ORDER BY c.created_at DESC LIMIT 1) END`;

export const HISTORY_MAX = 5000;
export async function maintenanceHistory(env, user, query = {}, envName = 'production') {
  if (!['owner', 'fleet', 'viewer'].includes(user.role)) throw forbidden();
  const today = berlinDate();
  // ohne „Von“: Jahresbeginn des „Bis“-Jahres (21.10.2026: „bis 2025-06-30“ allein → 400 „Von liegt nach bis“)
  const to = query.to || today; const from = query.from || (isCalendarDate(to) ? `${to.slice(0, 4)}-01-01` : `${today.slice(0, 4)}-01-01`);
  for (const d of [from, to]) if (!isCalendarDate(d)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
  if (from > to) throw bad('validation', '„Von“ liegt nach „bis“.');
  // Prüfart ohne Groß-/Kleinschreibung (z. B. „hu“ → „HU“, 22.10.2026: lieferte still 0 Ereignisse); unbekannte Art unverändert
  const kindRaw = query.kind ? String(query.kind).slice(0, 40) : null;
  const kind = kindRaw ? MAINT_KINDS.find((k) => k.toLowerCase() === kindRaw.toLowerCase()) || kindRaw : null;
  const rows = (await env.DB.prepare(`SELECT e.id AS event_id, e.vehicle_id, v.plate, v.kind AS vehicle_kind, v.site, e.kind, e.done_date, e.done_km, e.result, e.evidence, e.source, u.display_name AS recorded_by_name, e.created_at,
      ${DEFECT_CASE_SQL('id')} AS defect_case_id, ${DEFECT_CASE_SQL('case_no')} AS defect_case_no, ${DEFECT_CASE_SQL('status')} AS defect_case_status,
      ${NEXT_EVENT_SQL('done_date')} AS reinspection_date, ${NEXT_EVENT_SQL('result')} AS reinspection_result,
      CASE WHEN e.result IS NULL AND NOT EXISTS (SELECT 1 FROM maintenance_events e3 WHERE e3.vehicle_id=e.vehicle_id AND e3.kind=e.kind AND e3.id<>e.id
        AND (e3.done_date > e.done_date OR (e3.done_date = e.done_date AND e3.created_at > e.created_at))) THEN 1 ELSE 0 END AS result_addable
    FROM maintenance_events e JOIN vehicles v ON v.id=e.vehicle_id LEFT JOIN users u ON u.id=e.recorded_by
    WHERE e.done_date >= ?2 AND e.done_date <= ?3 ${kind ? 'AND e.kind = ?4' : ''} ORDER BY e.done_date DESC, v.plate LIMIT 5001`)
    .bind(...(kind ? [envName, from, to, kind] : [envName, from, to])).all()).results;
  // eine Zeile mehr gelesen: genau 5000 Treffer gelten nicht als begrenzt
  const truncated = rows.length > HISTORY_MAX; if (truncated) rows.length = HISTORY_MAX;
  const by_kind = {};
  for (const r of rows) by_kind[r.kind] = (by_kind[r.kind] || 0) + 1;
  return { from, to, kind, rows, by_kind, truncated, max: HISTORY_MAX };
}
export function maintenanceHistoryCsv(h) {
  const lines = [['Kennzeichen', 'FIN-Schlüssel', 'Fahrzeugart', 'Standort', 'Prüfart', 'Durchgeführt am', 'km bei Durchführung', 'Ergebnis', 'Nachweis', 'Herkunft', 'Erfasst von', 'Erfasst am', 'Mängelauftrag', 'Status Mängelauftrag', 'Nachprüfung am', 'Ergebnis Nachprüfung'].join(';')];
  for (const r of h.rows) lines.push([csvCell(r.plate), csvCell(r.vehicle_id), r.vehicle_kind === 'anhaenger' ? 'Anhänger' : 'Lkw', csvCell(r.site), csvCell(r.kind), r.done_date, r.done_km ?? '',
    RESULT_DE[r.result] || '', csvCell(r.evidence), SOURCE_DE[r.source] || csvCell(r.source), csvCell(r.recorded_by_name), r.created_at ? berlinDate(r.created_at) : '', // Berliner Kalendertag (nicht UTC)
    csvCell(r.defect_case_no), CASE_STATUS_DE[r.defect_case_status] || csvCell(r.defect_case_status), r.reinspection_date || '', RESULT_DE[r.reinspection_result] || (r.reinspection_date ? 'ohne Angabe' : '')].join(';'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
