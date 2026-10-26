// [CLAUDE] Auslese-Fristen Fahrerkarte und Massenspeicher des Fahrtenschreibers.
// Rechtsgrundlage: § 2 Abs. 5 Fahrpersonalverordnung (FPersV):
//  – Massenspeicher: Daten spätestens 90 Tage nach Aufzeichnung eines Ereignisses im Betrieb kopieren (Satz 1),
//  – Fahrerkarte: spätestens 28 Kalendertage nach Aufzeichnung eines Ereignisses (Satz 2).
// Umsetzung (vorsichtige Lesart): Das früheste nicht kopierte Ereignis liegt unmittelbar nach der letzten Auslesung,
// daher „spätestens fällig“ = letzte erfasste Auslesung + 28 bzw. + 90 Tage. Ohne erfasste Auslesung wird KEINE Frist
// berechnet (Status „keine Auslesung erfasst“). Sichtbarkeit: Inhaber/Fuhrparkleitung; Fahrer nur eigene Fahrerkarte.
import { findingText as fm } from '../public/finding-messages.js';
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, oneOf, berlinDate, parseCsv, normalizeVin, isCalendarDate, normPlate } from './util.js';
import { siteSelection, siteKey } from './reports.js';
import { audit } from './auth.js';
import { PLATE_PASSED_ON_SKIP, platePassedOn, PLATE_FORMER_SKIP, plateFormerOther, formerPlatesAll } from './maintenance.js';
import { SETTING_DEFAULTS } from './settings.js';

export const TACHO_RULE = { card_days: 28, vu_days: 90, source: 'FPersV § 2 Abs. 5' };
export const TACHO_KINDS = ['fahrerkarte', 'massenspeicher'];
const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';
const ISO = { test: isCalendarDate }; // echtes Kalenderdatum JJJJ-MM-TT
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

export function warnDaysOf(settings) {
  const v = settings.get('tacho_warn_days'); const n = Number(v);
  return v !== undefined && v !== null && v !== '' && Number.isFinite(n) && n >= 0 ? n : SETTING_DEFAULTS.tacho_warn_days;
}

// Status einer Auslesepflicht aus der letzten erfassten Auslesung
export function tachoStatus(last, periodDays, today, warnDays) {
  if (!last) return { last: null, due: null, days: null, status: 'keine' };
  const due = addDays(last, periodDays);
  const left = daysBetween(today, due);
  // Vorwarnung höchstens Frist − 1 Tag: eine Einstellung ≥ 28 Tage (gilt auch für die 90-Tage-Frist des Massenspeichers) machte jede
  // Fahrerkarte schon am Auslesetag „bald fällig“ (18.10.2026)
  return { last, due, days: left, status: left < 0 ? 'ueberfaellig' : left <= Math.min(warnDays, periodDays - 1) ? 'bald' : 'ok' };
}

export async function warnDays(env) {
  const r = await env.DB.prepare(`SELECT value FROM settings WHERE key='tacho_warn_days'`).first();
  return warnDaysOf(new Map(r ? [['tacho_warn_days', r.value]] : []));
}

// Zwei Sammelabfragen (unabhängig von der Anzahl Fahrer/Fahrzeuge) – auch vom Fuhrparkagenten genutzt
// active = 0: Fahrerliste/CSV „inaktive Fahrer“ – Auslese-Status wie in der Akte (23.10.2026; vorher leer); Übersicht/Agent nur aktive
export async function tachoRows(env, envName, warn, today = berlinDate(), active = 1) {
  const drv = (await env.DB.prepare(`SELECT d.id, d.display_name, d.personnel_no, d.site,
      (SELECT MAX(t.downloaded_on) FROM tacho_downloads t WHERE t.driver_id=d.id AND t.cancelled_at IS NULL) AS last,
      (SELECT x.valid_until FROM driver_documents x WHERE x.driver_id=d.id AND x.kind='fahrerkarte' AND x.superseded=0 ORDER BY x.created_at DESC LIMIT 1) AS card_valid_until,
      (SELECT COUNT(*) FROM driver_documents x WHERE x.driver_id=d.id AND x.kind='fahrerkarte' AND x.superseded=0) AS has_card
    FROM drivers d WHERE d.environment=? AND d.active=? ORDER BY d.display_name`).bind(envName, active ? 1 : 0).all()).results.sort((a, b) => String(a.display_name || '').localeCompare(String(b.display_name || ''), 'de', { sensitivity: 'base' }));
  const veh = (await env.DB.prepare(`SELECT v.id, v.plate, v.site,
      (SELECT MAX(t.downloaded_on) FROM tacho_downloads t WHERE t.vehicle_id=v.id AND t.environment=? AND t.cancelled_at IS NULL) AS last
    FROM vehicles v WHERE v.active=1 AND v.eval_excluded=0 AND v.kind<>'anhaenger' ORDER BY v.plate`).bind(envName).all()).results;
  const drivers = drv.filter((d) => d.has_card || d.last).map((d) => ({ id: d.id, display_name: d.display_name, personnel_no: d.personnel_no, site: d.site,
    card_valid_until: d.card_valid_until, has_card: !!d.has_card, ...tachoStatus(d.last, TACHO_RULE.card_days, today, warn) }));
  const without_card = drv.filter((d) => !d.has_card && !d.last).map((d) => ({ id: d.id, display_name: d.display_name, personnel_no: d.personnel_no, site: d.site }));
  const vehicles = veh.map((v) => ({ id: v.id, plate: v.plate, site: v.site, ...tachoStatus(v.last, TACHO_RULE.vu_days, today, warn) }));
  return { drivers, vehicles, without_card };
}

const RANK = { ueberfaellig: 0, bald: 1, keine: 2, ok: 3 };
const byUrgency = (a, b) => RANK[a.status] - RANK[b.status] || (a.due || '9').localeCompare(b.due || '9');

export async function tachoOverview(env, user, envName, query = {}) {
  if (!isMgr(user)) throw forbidden();
  const warn = await warnDays(env); const today = berlinDate();
  const r = await tachoRows(env, envName, warn, today);
  // Filter „Standort“: Fahrer nach Standort der Fahrerakte, Fahrzeuge nach Fahrzeugstamm (Schreibweisen zusammengefasst)
  const sel = siteSelection([...r.drivers, ...r.without_card, ...r.vehicles].map((x) => ({ site: x.site })), query.site);
  // Fahrer ohne Standort, die der Filter ausblendet (Standard-Standort), zählen – Hinweis „mit Alle sichtbar“ (22.10.2026)
  const noSiteHidden = sel.site && sel.site !== 'ohne' ? [...r.drivers, ...r.without_card].filter((x) => siteKey(x.site) === 'ohne').length : 0;
  if (sel.site) for (const k of ['drivers', 'without_card', 'vehicles']) r[k] = r[k].filter((x) => sel.match(x.site));
  r.site = sel.site; r.site_options = sel.options; r.no_site_hidden = noSiteHidden;
  r.drivers.sort(byUrgency); r.vehicles.sort(byUrgency);
  const count = (list) => ({ ueberfaellig: list.filter((x) => x.status === 'ueberfaellig').length, bald: list.filter((x) => x.status === 'bald').length,
    keine: list.filter((x) => x.status === 'keine').length, ok: list.filter((x) => x.status === 'ok').length });
  return { today, warn_days: warn, rule: TACHO_RULE, ...r, totals: { drivers: count(r.drivers), vehicles: count(r.vehicles) } };
}

export async function listDownloads(env, user, envName, q = {}) {
  if (q.driver_id) {
    const d = await env.DB.prepare('SELECT id, user_id FROM drivers WHERE id=? AND environment=?').bind(str(q.driver_id, { max: 40 }), envName).first();
    if (!d || (!isMgr(user) && !(user.role === 'driver' && d.user_id === user.id))) throw notFound('Fahrer nicht gefunden.');
    const rows = (await env.DB.prepare(`SELECT t.id, t.kind, t.downloaded_on, t.evidence, t.note, t.created_at, t.cancelled_at, t.cancel_reason, u.display_name AS created_by_name FROM tacho_downloads t
      LEFT JOIN users u ON u.id=t.created_by WHERE t.driver_id=? ORDER BY t.downloaded_on DESC LIMIT 100`).bind(d.id).all()).results;
    // Fahrer selbst: ohne Bemerkung/Erfassende der Leitung (wie Fahrerakte, 20.10.2026)
    return isMgr(user) ? rows : rows.map(({ note, created_by_name, ...r }) => r);
  }
  if (!isMgr(user)) throw forbidden();
  if (!q.vehicle_id) throw bad('validation', 'driver_id oder vehicle_id angeben.');
  return (await env.DB.prepare(`SELECT t.id, t.kind, t.downloaded_on, t.evidence, t.note, t.created_at, t.cancelled_at, t.cancel_reason, u.display_name AS created_by_name FROM tacho_downloads t
    LEFT JOIN users u ON u.id=t.created_by WHERE t.vehicle_id=? AND t.environment=? ORDER BY t.downloaded_on DESC LIMIT 100`).bind(str(q.vehicle_id, { max: 60 }), envName).all()).results;
}

export async function addDownload(env, user, envName, body) {
  if (!isMgr(user)) throw forbidden();
  const kind = oneOf(body.kind, TACHO_KINDS, 'Art');
  const on = str(body.downloaded_on, { required: true, max: 10, field: 'Auslesedatum' });
  if (!ISO.test(on) || Number.isNaN(Date.parse(on + 'T00:00:00Z'))) throw bad('validation', 'Auslesedatum im Format JJJJ-MM-TT.');
  if (on > berlinDate()) throw bad('validation', 'Auslesedatum darf nicht in der Zukunft liegen.');
  const evidence = str(body.evidence, { required: true, max: 300, field: 'Nachweis' });
  const note = str(body.note, { max: 500, field: 'Bemerkung' });
  let driverId = null; let vehicleId = null; let label;
  if (kind === 'fahrerkarte') {
    const d = await env.DB.prepare('SELECT id, display_name FROM drivers WHERE id=? AND environment=?').bind(str(body.driver_id, { required: true, max: 40, field: 'Fahrer' }), envName).first();
    if (!d) throw notFound('Fahrer nicht gefunden.');
    driverId = d.id; label = d.display_name;
  } else {
    const v = await env.DB.prepare(`SELECT id, plate, kind FROM vehicles WHERE id=?`).bind(str(body.vehicle_id, { required: true, max: 60, field: 'Fahrzeug' })).first();
    if (!v) throw notFound('Fahrzeug nicht gefunden.');
    if (v.kind === 'anhaenger') throw bad('validation', 'Anhänger haben keinen Fahrtenschreiber.');
    vehicleId = v.id; label = v.plate;
  }
  const id = uuid();
  try {
    await env.DB.prepare(`INSERT INTO tacho_downloads(id,environment,kind,driver_id,vehicle_id,downloaded_on,evidence,note,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .bind(id, envName, kind, driverId, vehicleId, on, evidence, note, user.id, nowIso()).run();
  } catch (e) { if (String(e.message).includes('UNIQUE')) throw conflict('duplicate', 'Für diesen Tag ist bereits eine Auslesung erfasst.'); throw e; }
  await audit(env, user.id, 'tacho.download', driverId || vehicleId, { kind, downloaded_on: on, environment: envName });
  return { id, label };
}

// Auslesung stornieren (Tippfehler im Datum, falscher Fahrer/Fahrzeug): bleibt mit Begründung im Verlauf, zählt nicht mehr für Fristen.
// Atomar nur einmal; danach kann der richtige Tag neu erfasst werden (18.10.2026).
export async function cancelDownload(env, user, envName, id, body = {}) {
  if (!isMgr(user)) throw forbidden();
  const reason = str(body.reason, { required: true, max: 300, field: 'Begründung' });
  if (reason.length < 3) throw bad('validation', 'Begründung ist zu kurz.');
  const t = await env.DB.prepare('SELECT id, kind, driver_id, vehicle_id, downloaded_on, cancelled_at FROM tacho_downloads WHERE id=? AND environment=?').bind(str(id, { max: 40 }), envName).first();
  if (!t) throw notFound('Auslesung nicht gefunden.');
  if (t.cancelled_at) return { ok: true, duplicate: true };
  const now = nowIso();
  const r = await env.DB.prepare('UPDATE tacho_downloads SET cancelled_at=?, cancelled_by=?, cancel_reason=? WHERE id=? AND cancelled_at IS NULL').bind(now, user.id, reason, t.id).run();
  if (!(r.meta && r.meta.changes)) return { ok: true, duplicate: true };
  await audit(env, user.id, 'tacho.cancel', t.driver_id || t.vehicle_id, { kind: t.kind, downloaded_on: t.downloaded_on, reason, environment: envName });
  return { ok: true };
}

// Für den Fuhrparkagenten: nur Fahrer/Fahrzeuge mit mindestens einer erfassten Auslesung (keine erfundenen Fristen)
export async function tachoFindings(env, environment, settings) {
  const r = await tachoRows(env, environment, warnDaysOf(settings));
  const out = [];
  for (const d of r.drivers) {
    if (d.status === 'ueberfaellig') out.push({ code: 'TACHO_CARD_OVERDUE', subject: `${d.id}|fahrerkarte`, severity: 'handeln', requires_decision: 0,
      ...fm('TACHO_CARD_OVERDUE', { name: d.display_name, due: d.due, last: d.last }), next_action: 'Fahrerkarte auslesen und Auslesung erfassen.' });
    else if (d.status === 'bald') out.push({ code: 'TACHO_CARD_DUE', subject: `${d.id}|fahrerkarte`, severity: 'hinweis', requires_decision: 0,
      ...fm('TACHO_CARD_DUE', { name: d.display_name, due: d.due }), next_action: 'Auslesung einplanen.' });
  }
  for (const v of r.vehicles) {
    if (v.status === 'ueberfaellig') out.push({ code: 'TACHO_VU_OVERDUE', vehicle_id: v.id, subject: `${v.id}|massenspeicher`, severity: 'handeln', requires_decision: 0,
      ...fm('TACHO_VU_OVERDUE', { plate: v.plate, due: v.due, last: v.last }), next_action: 'Fahrtenschreiber auslesen und Auslesung erfassen.' });
    else if (v.status === 'bald') out.push({ code: 'TACHO_VU_DUE', vehicle_id: v.id, subject: `${v.id}|massenspeicher`, severity: 'hinweis', requires_decision: 0,
      ...fm('TACHO_VU_DUE', { plate: v.plate, due: v.due }), next_action: 'Auslesung einplanen.' });
  }
  return out;
}

export function tachoCsv(ov, cell) {
  const S = { ueberfaellig: 'überfällig', bald: 'bald fällig', ok: 'in Ordnung', keine: 'keine Auslesung erfasst' };
  const lines = ['﻿Art;Fahrer/Kennzeichen;Personalnummer;Standort;Letzte Auslesung;Spätestens fällig;Tage;Status'];
  for (const d of ov.drivers) lines.push(['Fahrerkarte', cell(d.display_name), cell(d.personnel_no), cell(d.site), d.last || '', d.due || '', d.days ?? '', S[d.status]].join(';'));
  // Backlog 383 (Blickwinkel „Betriebskontrolle“): aktive Fahrer ohne erfasste Fahrerkarte und ohne Auslesung fehlten im Export ganz
  for (const d of ov.without_card || []) lines.push(['Fahrerkarte', cell(d.display_name), cell(d.personnel_no), cell(d.site), '', '', '', 'keine Fahrerkarte erfasst'].join(';'));
  for (const v of ov.vehicles) lines.push(['Massenspeicher', cell(v.plate), '', cell(v.site), v.last || '', v.due || '', v.days ?? '', S[v.status]].join(';'));
  return lines.join('\r\n') + '\r\n';
}

// Verlauf für einen Zeitraum (24.10.2026, Backlog 245 – Blickwinkel „Betriebsprüfung durch BAG/Gewerbeaufsicht“): alle erfassten
// Auslesungen je Fahrer/Fahrzeug im Zeitraum und die Fristüberschreitungen („Lücken“) nach derselben Regel wie die Übersicht:
// spätestens fällig = vorherige erfasste Auslesung + 28 bzw. 90 Tage; Lücke = Tage nach dieser Frist bis zur nächsten Auslesung
// (bzw. bis heute, solange keine folgt). Vor der ersten erfassten Auslesung wird keine Frist berechnet (wie überall, keine Annahme).
// Enthält auch deaktivierte Fahrer, außer Betrieb genommene und ruhende Fahrzeuge, sofern sie Auslesungen haben. Stornierte zählen nicht.
// Zeitraum für Prüfungsnachweise: ohne „Bis“ heute, ohne „Von“ 12 Monate bis einschließlich „Bis“ (z. B. 25.10.2025–24.10.2026)
export function periodOf(query = {}, today = berlinDate()) {
  const to = query.to ? String(query.to).slice(0, 10) : today;
  if (!ISO.test(to)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
  let from = query.from ? String(query.from).slice(0, 10) : null;
  if (!from) { const prev = `${Number(to.slice(0, 4)) - 1}${to.slice(4)}`; from = addDays(ISO.test(prev) ? prev : `${Number(to.slice(0, 4)) - 1}-02-28`, 1); }
  if (!ISO.test(from)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
  if (from > to) throw bad('validation', '„Von“ liegt nach „bis“.');
  return { from, to };
}
export const TACHO_HISTORY_MAX = 5000;
export async function tachoHistory(env, user, envName, query = {}) {
  if (!isMgr(user)) throw forbidden();
  const today = berlinDate();
  const { from, to } = periodOf(query, today);
  const end = to < today ? to : today; // offene Lücke läuft bis heute bzw. bis „Bis“
  const rows = (await env.DB.prepare(`SELECT kind, driver_id, vehicle_id, downloaded_on FROM tacho_downloads
    WHERE environment=? AND cancelled_at IS NULL AND downloaded_on >= ? AND downloaded_on <= ? ORDER BY downloaded_on LIMIT ${TACHO_HISTORY_MAX + 1}`).bind(envName, from, to).all()).results;
  const truncated = rows.length > TACHO_HISTORY_MAX; if (truncated) rows.length = TACHO_HISTORY_MAX;
  // letzte Auslesung vor dem Zeitraum: Frist, die in den Zeitraum hineinläuft
  const before = (await env.DB.prepare(`SELECT kind, driver_id, vehicle_id, MAX(downloaded_on) AS last FROM tacho_downloads
    WHERE environment=? AND cancelled_at IS NULL AND downloaded_on < ? GROUP BY kind, driver_id, vehicle_id`).bind(envName, from).all()).results;
  const subj = new Map();
  const keyOf = (r) => (r.kind === 'fahrerkarte' ? 'd|' + r.driver_id : 'v|' + r.vehicle_id);
  const get = (r) => { const k = keyOf(r); if (!subj.has(k)) subj.set(k, { kind: r.kind, id: r.driver_id || r.vehicle_id, prev: null, dates: [] }); return subj.get(k); };
  for (const b of before) if (b.driver_id || b.vehicle_id) get(b).prev = b.last;
  for (const r of rows) if (r.driver_id || r.vehicle_id) get(r).dates.push(r.downloaded_on);
  const dIds = [...subj.values()].filter((x) => x.kind === 'fahrerkarte').map((x) => x.id);
  const vIds = [...subj.values()].filter((x) => x.kind !== 'fahrerkarte').map((x) => x.id);
  const drv = new Map(dIds.length ? (await env.DB.prepare(`SELECT d.id, d.display_name, d.personnel_no, d.site, d.active FROM drivers d JOIN json_each(?) j ON j.value=d.id WHERE d.environment=?`)
    .bind(JSON.stringify(dIds), envName).all()).results.map((d) => [d.id, d]) : []);
  const veh = new Map(vIds.length ? (await env.DB.prepare(`SELECT v.id, v.plate, v.site, v.active, v.eval_excluded FROM vehicles v JOIN json_each(?) j ON j.value=v.id`)
    .bind(JSON.stringify(vIds)).all()).results.map((v) => [v.id, v]) : []);
  const out = { drivers: [], vehicles: [] };
  for (const x of subj.values()) {
    const period = x.kind === 'fahrerkarte' ? TACHO_RULE.card_days : TACHO_RULE.vu_days;
    const gaps = []; let last = x.prev;
    // open: bis heute keine weitere Auslesung; cut: Zeitraum endet in der Vergangenheit, Lücke bis „Bis“ gezählt (spätere Auslesung außerhalb)
    const gap = (lastOn, until, tail) => { const due = addDays(lastOn, period); if (until <= due) return;
      const g = { last: lastOn, due, overdue_from: addDays(due, 1), until, days: daysBetween(due, until), open: tail && to >= today, cut: tail && to < today };
      if (g.until >= from && g.overdue_from <= to) gaps.push(g); };
    for (const d of x.dates) { if (last) gap(last, d, false); last = d; }
    if (last && !truncated) gap(last, end, true);
    const base = { id: x.id, downloads: x.dates, count: x.dates.length, last_before: x.prev, gaps, gap_days: gaps.reduce((a, g) => a + g.days, 0) };
    if (x.kind === 'fahrerkarte') { const d = drv.get(x.id); if (!d) continue; out.drivers.push({ ...base, display_name: d.display_name, personnel_no: d.personnel_no, site: d.site, active: !!d.active }); }
    else { const v = veh.get(x.id); if (!v) continue; out.vehicles.push({ ...base, plate: v.plate, site: v.site, active: !!v.active && !v.eval_excluded }); }
  }
  // Backlog 384 (Blickwinkel „Betriebskontrolle“): aktive Fahrer (mit oder ohne erfasste Fahrerkarte) und aktive Lkw ohne jede erfasste
  // Auslesung bis Zeitraumende fehlten – der Ausdruck wirkte vollständig. Jetzt als Zeile mit 0 Auslesungen und `none_recorded`
  // („keine Auslesung erfasst – Frist ungeklärt“); keine Lückentage berechnet (keine Annahme vor der ersten Auslesung).
  const cur = await tachoRows(env, envName, 0, today);
  for (const d of [...cur.drivers.map((x) => ({ ...x, no_card: false })), ...cur.without_card.map((x) => ({ ...x, no_card: true }))]) {
    if (subj.has('d|' + d.id)) continue;
    out.drivers.push({ id: d.id, downloads: [], count: 0, last_before: null, gaps: [], gap_days: 0, none_recorded: true, ...(d.no_card ? { no_card: true } : {}), display_name: d.display_name, personnel_no: d.personnel_no || null, site: d.site, active: true });
  }
  for (const v of cur.vehicles) if (!subj.has('v|' + v.id)) out.vehicles.push({ id: v.id, downloads: [], count: 0, last_before: null, gaps: [], gap_days: 0, none_recorded: true, plate: v.plate, site: v.site, active: true });
  // Fahrzeuge/Fahrer mit Lücke zuerst, dann alphabetisch
  const sortBy = (name) => (a, b) => (b.gaps.length ? 1 : 0) - (a.gaps.length ? 1 : 0) || (b.none_recorded ? 1 : 0) - (a.none_recorded ? 1 : 0) || String(a[name] || '').localeCompare(String(b[name] || ''), 'de', { sensitivity: 'base' });
  out.drivers.sort(sortBy('display_name')); out.vehicles.sort(sortBy('plate'));
  const cnt = (l) => ({ subjects: l.length, downloads: l.reduce((a, x) => a + x.count, 0), with_gaps: l.filter((x) => x.gaps.length).length, gaps: l.reduce((a, x) => a + x.gaps.length, 0), none_recorded: l.filter((x) => x.none_recorded).length });
  return { from, to, today, rule: TACHO_RULE, ...out, totals: { drivers: cnt(out.drivers), vehicles: cnt(out.vehicles) }, truncated, max: TACHO_HISTORY_MAX };
}

export function tachoHistoryCsv(h, cell) {
  const lines = ['﻿Art;Fahrer/Kennzeichen;Personalnummer;Standort;Aktiv;Auslesungen im Zeitraum;Auslesedaten;Letzte Auslesung vor dem Zeitraum;Fristüberschreitungen;Tage überfällig gesamt;Fristüberschreitungen (überfällig ab – bis, Tage)'];
  // Sammelfelder (mehrere Tage in einer Zelle) gleich als TT.MM.JJJJ – die zentrale Umschreibung erfasst nur ganze Datumsfelder
  const de = (d) => d.split('-').reverse().join('.');
  const g = (x) => x.gaps.map((y) => `${de(y.overdue_from)} – ${y.open ? 'offen (' + de(y.until) + ')' : y.cut ? 'Zeitraumende (' + de(y.until) + ')' : de(y.until)} (${y.days})`).join(' | ');
  const nr = (x) => (x.none_recorded ? (x.no_card ? 'keine Fahrerkarte erfasst, ' : '') + 'keine Auslesung erfasst – Frist ungeklärt' : g(x));
  for (const d of h.drivers) lines.push(['Fahrerkarte', cell(d.display_name), cell(d.personnel_no), cell(d.site), d.active ? 'ja' : 'nein', d.count, d.downloads.map(de).join(', '), d.last_before || '', d.gaps.length, d.gap_days, cell(nr(d))].join(';'));
  for (const v of h.vehicles) lines.push(['Massenspeicher', cell(v.plate), '', cell(v.site), v.active ? 'ja' : 'nein', v.count, v.downloads.map(de).join(', '), v.last_before || '', v.gaps.length, v.gap_days, cell(nr(v))].join(';'));
  return lines.join('\r\n') + '\r\n';
}

// Sammelimport aus dem Export der Auslesesoftware (CSV, „;“ oder „,“). Spalten (Groß/Klein egal, Anfang genügt):
// Art (Fahrerkarte/Karte/C bzw. Massenspeicher/Fahrzeug/VU/M), Personalnummer und/oder Fahrer/Name, Kennzeichen und/oder FIN,
// Datum (JJJJ-MM-TT oder TT.MM.JJJJ), Nachweis/Datei (sonst Pflichtangabe `source` für alle Zeilen).
// Zuordnung nur eindeutig: Fahrer über Personalnummer, sonst exakt gleicher Name; Fahrzeug über FIN, sonst eindeutiges Kennzeichen.
const MAX_IMPORT = 2000;
// Personalnummer ohne führende Nullen vergleichen (Excel macht aus „00123“ die Zahl 123, 18.10.2026), Groß-/Kleinschreibung auch außerhalb A–Z;
// gilt für Auslesungen-Import und seit 23.10.2026 auch für Anlegen/Ändern der Fahrerakte (dort vorher SQL-lower nur ASCII, ohne Nullen)
export const pnoKey = (x) => { const k = String(x || '').normalize('NFC').trim().toLowerCase(); return /^\d+$/.test(k) ? k.replace(/^0+(?=\d)/, '') : k || null; };
export const normName = (n) => String(n || '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' '); // NFC: Namen vom Mac (zerlegte Umlaute)
function parseDay(raw) {
  const t = String(raw || '').trim(); let m;
  const iso = (d) => (ISO.test(d) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d ? d : null);
  if (ISO.test(t)) return iso(t);
  if ((m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:,?\s.*)?$/))) return iso(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  // Zeitstempel mit Zeitzone (Z oder ±hh:mm): Berliner Kalendertag (22:30Z am 31.03. = 01.04. in Berlin); ohne Zone der Datumsteil
  if ((m = t.match(/^(\d{4}-\d{2}-\d{2})[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})$/i)) && iso(m[1])) {
    const d = new Date(t.replace(' ', 'T').replace(/\s+/g, '').replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
    return Number.isNaN(d.getTime()) ? null : berlinDate(d.toISOString());
  }
  if ((m = t.match(/^(\d{4}-\d{2}-\d{2})[T\s]/))) return iso(m[1]);
  return null;
}
// Spalte mit dem Auslesedatum (18.10.2026: „Downloaddatum“/„Datum der Auslesung“ neben „Datum letzte Aktivität“/„Datum Kartenablauf“
// – der Anfangstreffer „datum“ nahm still die erste Datumsspalte; „Ausgelesen von“ (Person) galt als Datum). Reihenfolge: exakte Namen,
// dann Spalten mit „auslese“/„auslesung“/„download“ (ohne Personenangabe; „Auslesung vom“ wurde bis 18.10.2026 übersehen und still „Datum letzte Aktivität“ genommen), dann genau eine Spalte „Datum…“; mehrere → -2 (nicht eindeutig)
const DAY_EXACT = ['auslesedatum', 'datum der auslesung', 'datum auslesung', 'auslesung', 'ausgelesen am', 'downloaddatum', 'download-datum', 'download datum', 'download', 'datum'];
// `exclude`: schon als Art/Nachweis erkannte Spalten (21.10.2026: „Art der Auslesung“/„Download-Datei“ wurden als Datumsspalte genommen)
export function dayCol(head, exclude = []) {
  const hd = head.map((h, i) => (exclude.includes(i) ? '' : String(h || '').trim().toLowerCase()));
  for (const n of DAY_EXACT) { const i = hd.indexOf(n); if (i >= 0) return i; }
  const isFile = /datei|\bfile/;
  const person = /\b(von|durch|person|benutzer|user|mitarbeiter|name)\b/;
  // Fälligkeits-/Planspalten („Nächster Download“, „Download fällig am“, „Auslesefrist“) sind kein Auslesedatum (18.10.2026: Fälligkeitstag
  // wurde als Auslesung gespeichert → Frist 28 Tage später „ok“ statt überfällig)
  const planned = /n(ä|ae)chst|f(ä|ae)llig|frist|\bsoll|geplant|\bplan/;
  const hits = hd.map((h, i) => (/auslese|auslesung|ausgelesen|download/.test(h) && !person.test(h) && !planned.test(h) && !isFile.test(h) && !h.startsWith('letzte auslesung') ? i : -1)).filter((i) => i >= 0);
  if (hits.length === 1) return hits[0];
  if (hits.length > 1) return -2;
  const dates = hd.map((h, i) => (h.startsWith('datum') && !planned.test(h) ? i : -1)).filter((i) => i >= 0);
  if (dates.length === 1) return dates[0];
  return dates.length > 1 ? -2 : -1;
}
function kindOf(raw) {
  const k = String(raw || '').trim().toLowerCase();
  if (['fahrerkarte', 'karte', 'c', 'card', 'driver card', 'fahrer'].includes(k)) return 'fahrerkarte';
  if (['massenspeicher', 'fahrzeug', 'vu', 'm', 'fahrtenschreiber', 'kontrollgerät', 'kontrollgeraet', 'vehicle unit'].includes(k)) return 'massenspeicher';
  return null;
}

export async function importDownloads(env, user, envName, text, { dryRun = false, source = '' } = {}) {
  if (!isMgr(user)) throw forbidden();
  const table = parseCsv(text);
  if (table.length < 2) throw bad('validation', 'CSV leer.');
  if (table.length - 1 > MAX_IMPORT) throw bad('validation', `Maximal ${MAX_IMPORT} Zeilen je Import.`);
  const head = table[0].map((h) => h.normalize('NFC').toLowerCase());
  // Vorrang nach der Namensliste, nicht nach der Spaltenposition (18.10.2026: „Datum letzte Aktivität“ vor „Auslesedatum“ wurde still als
  // Auslesedatum genommen – Frist falsch): erst exakte Treffer in Listenreihenfolge, dann Anfangstreffer in Listenreihenfolge
  const pick = (hd, names, ok = () => true) => { for (const n of names) { const i = hd.findIndex((h) => h.trim() === n && ok(h)); if (i >= 0) return i; }
    for (const n of names) { const i = hd.findIndex((h) => h.trim().startsWith(n) && ok(h)); if (i >= 0) return i; } return -1; };
  const col = (names) => pick(head, names);
  // Namensspalte: „Name“/„Fahrername“ vor „Fahrer…“; „Fahrerkartennummer“, „Fahrer-Nr.“ o. Ä. sind keine Namen
  const nameCol = (hd) => { const notName = (h) => /karte|nr|nummer|kennung|id\b/.test(h);
    return pick(hd, ['name', 'fahrername', 'name fahrer', 'fahrer name', 'fahrer'], (h) => !notName(h)); };
  const kindCi = col(['art', 'typ', 'quelle der daten']); const evCi = col(['nachweis', 'datei', 'beleg']);
  const ci = { kind: kindCi, pno: col(['personalnummer', 'personal-nr', 'pers']), name: nameCol(head),
    plate: col(['kennzeichen']), vin: col(['fin', 'fahrgestell']), day: dayCol(head, [kindCi, evCi].filter((i) => i >= 0)), ev: evCi };
  if (ci.day === -2) throw bad('tacho_day_ambiguous', 'Datumsspalte nicht eindeutig – bitte die Spalte mit dem Auslesedatum „Auslesedatum“ nennen.');
  const fallbackEv = str(source, { max: 300, field: 'Quelle' }) || ''; // keine Quelle angegeben: leer statt null (leere Nachweis-Zelle ergab sonst 500)
  if (ci.kind < 0) throw bad('validation', 'Spalte „Art“ (Fahrerkarte/Massenspeicher) erforderlich.');
  // Eigene Übersicht der App (Export „Auslesungen“: Letzte Auslesung/Spätestens fällig) ist kein Beleg einer Auslesung
  if (ci.day < 0 && head.some((h) => h.startsWith('letzte auslesung') || h.startsWith('spätestens fällig'))) throw bad('wrong_file_tacho', 'Das ist die Fristen-Übersicht dieser App, kein Export der Auslesesoftware. Bitte die Datei der Auslesesoftware mit Spalte „Datum“ hochladen.');
  if (ci.day < 0) throw bad('validation', 'Spalte „Datum“ erforderlich.');
  if (ci.ev < 0 && !fallbackEv) throw bad('validation', 'Spalte „Nachweis“/„Datei“ oder Angabe „Quelle“ für alle Zeilen erforderlich.');
  if (ci.pno < 0 && ci.name < 0 && ci.plate < 0 && ci.vin < 0) throw bad('validation', 'Spalte Personalnummer/Fahrer oder Kennzeichen/FIN erforderlich.');

  const allDrivers = (await env.DB.prepare('SELECT id, display_name, personnel_no, active FROM drivers WHERE environment=?').bind(envName).all()).results;
  const drivers = allDrivers.filter((d) => d.active);
  // ausgeschiedene Akten (Backlog 250): nur für einen klaren Überspring-Grund – Einzelerfassung in der Akte bleibt möglich (Nachweis nach Austritt)
  const offDrivers = allDrivers.filter((d) => !d.active);
  // auch außer Betrieb genommene (Backlog 188): Massenspeicher am Verkaufstag ausgelesen, Export erst danach importiert – FIN trifft das
  // Altfahrzeug (vorher „Fahrzeug nicht gefunden“, Einzelerfassung ging); Kennzeichen zuerst an aktiven, sonst eindeutig am außer Betrieb genommenen
  const allVehicles = (await env.DB.prepare(`SELECT id, vin, plate, kind, eval_excluded, active, created_at FROM vehicles`).all()).results;
  const vehicles = allVehicles.filter((v) => v.active);
  const offPlates = new Set(allVehicles.filter((v) => !v.active).map((v) => normPlate(v.plate)));
  const formerPl = await formerPlatesAll(env); // Kennzeichenwechsel (Backlog 257a)
  const existingRows = (await env.DB.prepare(`SELECT COALESCE(driver_id, vehicle_id) || '|' || downloaded_on AS k, evidence, cancelled_at FROM tacho_downloads WHERE environment=?`).bind(envName).all()).results;
  const existing = new Set(existingRows.filter((r) => !r.cancelled_at).map((r) => r.k));
  // stornierte Auslesung (z. B. falscher Fahrer/Tag): derselbe Export (gleicher Nachweis) erneut importiert bringt sie nicht still zurück;
  // ein anderer Nachweis für den Tag bleibt importierbar (Tag nach Storno neu erfassbar) – 19.10.2026
  const cancelled = new Set(existingRows.filter((r) => r.cancelled_at).map((r) => `${r.k}|${String(r.evidence || '').trim().toLowerCase()}`));
  const uniq = (list, keyFn) => { const m = new Map(); for (const x of list) { const k = keyFn(x); if (!k) continue; m.set(k, m.has(k) ? 'mehrdeutig' : x); } return m; };
  // Personalnummer ohne führende Nullen vergleichen (Excel macht aus „00123“ die Zahl 123, 18.10.2026); zwei Nummern, die dadurch gleich werden → mehrdeutig
  const byPno = uniq(drivers, (d) => (d.personnel_no ? pnoKey(d.personnel_no) : null));
  const byName = uniq(drivers, (d) => normName(d.display_name));
  const byPnoOff = uniq(offDrivers, (d) => (d.personnel_no ? pnoKey(d.personnel_no) : null));
  const byNameOff = uniq(offDrivers, (d) => normName(d.display_name));
  const byVin = new Map(allVehicles.map((v) => [v.vin, v]));
  // Kennzeichen doppelt, aber nur eines bewertet (ruhendes Doppel, z. B. Tippfehler-FIN): das bewertete Fahrzeug – wie die Fristen-Übersicht
  const byPlate = uniq(vehicles, (v) => normPlate(v.plate));
  const byPlateEval = uniq(vehicles.filter((v) => !v.eval_excluded), (v) => normPlate(v.plate));
  for (const [k, v] of byPlate) if (v === 'mehrdeutig' && byPlateEval.get(k) && byPlateEval.get(k) !== 'mehrdeutig') byPlate.set(k, byPlateEval.get(k));
  const byPlateOff = uniq(allVehicles.filter((v) => !v.active), (v) => normPlate(v.plate));
  const today = berlinDate();
  const get = (cells, i) => (i >= 0 ? String(cells[i] || '').trim() : '');
  const rows = []; const skipped = []; const seen = new Set();
  table.slice(1).forEach((cells, idx) => {
    const line = cells.line || idx + 2;
    if (cells.every((c) => !String(c || '').trim())) return;
    const skip = (reason) => skipped.push({ line, reason });
    const kind = kindOf(get(cells, ci.kind));
    if (!kind) return skip(`Art unbekannt: ${get(cells, ci.kind) || '–'}`);
    const day = parseDay(get(cells, ci.day));
    if (!day) return skip(`Datum nicht erkannt: ${get(cells, ci.day) || '–'}`);
    if (day > today) return skip('Datum liegt in der Zukunft');
    const evidence = get(cells, ci.ev) || fallbackEv;
    if (!evidence) return skip('Nachweis/Quelle fehlt');
    if (evidence.length > 300) return skip('Nachweis zu lang (max. 300 Zeichen)'); // vorher still gekürzt (17.10.2026)
    let target; let label;
    if (kind === 'fahrerkarte') {
      const pno = get(cells, ci.pno).normalize('NFC').toLowerCase(); const nm = normName(get(cells, ci.name));
      target = pno ? byPno.get(pnoKey(pno)) : nm ? byName.get(nm) : undefined;
      // Personalnummer unbekannt, Name eindeutig und in der App ohne Personalnummer erfasst → über den Namen (keine widersprüchliche Nummer)
      if (pno && !target && nm) { const n = byName.get(nm); if (n && n !== 'mehrdeutig' && !n.personnel_no) target = n; }
      // Nummer nur ohne führende Nullen mehrdeutig („0123“/„123“): eindeutiger Name mit passender Nummer entscheidet (19.10.2026: beide Fahrer
      // dauerhaft übersprungen). Nicht die exakte Schreibweise – Excel entfernt führende Nullen, „123“ kann „0123“ meinen.
      if (target === 'mehrdeutig' && nm) { const n = byName.get(nm); if (n && n !== 'mehrdeutig' && n.personnel_no && pnoKey(n.personnel_no) === pnoKey(pno)) target = n; }
      if (target === 'mehrdeutig') return skip(`Fahrer nicht eindeutig: ${get(cells, ci.pno) || get(cells, ci.name)}`);
      if (!target) {
        const off = pno ? byPnoOff.get(pnoKey(pno)) : nm ? byNameOff.get(nm) : undefined;
        if (off && off !== 'mehrdeutig') return skip(`Fahrerakte ausgeschieden – Auslesung in der Akte erfassen: ${off.display_name}`);
        return skip(`Fahrer nicht gefunden: ${get(cells, ci.pno) || get(cells, ci.name) || '–'}`);
      }
      label = target.display_name;
    } else {
      const vin = get(cells, ci.vin) ? normalizeVin(get(cells, ci.vin)) : '';
      const pk = normPlate(get(cells, ci.plate));
      target = vin ? byVin.get(vin) : pk ? (byPlate.get(pk) || byPlateOff.get(pk)) : undefined;
      if (target === 'mehrdeutig') return skip(`Kennzeichen nicht eindeutig: ${get(cells, ci.plate)}`);
      if (!vin && target && target.active && platePassedOn(offPlates, target, day)) return skip(PLATE_PASSED_ON_SKIP);
      if (!vin && target && target !== 'mehrdeutig' && plateFormerOther(formerPl, target, day)) return skip(PLATE_FORMER_SKIP);
      if (!target) return skip(`Fahrzeug nicht gefunden: ${get(cells, ci.vin) || get(cells, ci.plate) || '–'}`);
      if (target.kind === 'anhaenger') return skip(`Anhänger ohne Fahrtenschreiber: ${target.plate}`);
      label = target.plate;
    }
    const key = `${target.id}|${day}`;
    if (seen.has(key)) return skip('doppelt in der Datei');
    if (cancelled.has(`${key}|${evidence.trim().toLowerCase()}`) && !existing.has(key)) return skip('Auslesung wurde storniert – nicht erneut übernommen (bei Bedarf einzeln erfassen)');
    seen.add(key);
    rows.push({ line, kind, target_id: target.id, label, downloaded_on: day, evidence, status: existing.has(key) ? 'vorhanden' : 'neu' });
  });
  const fresh = rows.filter((r) => r.status === 'neu');
  const result = { dry_run: dryRun, counts: { neu: fresh.length, vorhanden: rows.length - fresh.length, uebersprungen: skipped.length }, rows, skipped }; // alle Zeilen (höchstens MAX_IMPORT) – vorher nach 300 ohne Hinweis gekürzt (17.10.2026)
  if (dryRun || !fresh.length) return result;
  const now = nowIso();
  const items = fresh.map((r) => ({ id: uuid(), kind: r.kind, d: r.kind === 'fahrerkarte' ? r.target_id : null, v: r.kind === 'massenspeicher' ? r.target_id : null, on: r.downloaded_on, ev: r.evidence }));
  const J = (k) => `json_extract(value,'$.${k}')`;
  const stmts = [];
  for (let i = 0; i < items.length; i += 1000) {
    stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO tacho_downloads(id,environment,kind,driver_id,vehicle_id,downloaded_on,evidence,note,created_by,created_at)
      SELECT ${J('id')}, ?1, ${J('kind')}, ${J('d')}, ${J('v')}, ${J('on')}, ${J('ev')}, 'Import', ?2, ?3 FROM json_each(?4)`).bind(envName, user.id, now, JSON.stringify(items.slice(i, i + 1000))));
  }
  const res = await env.DB.batch(stmts);
  // tatsächlich geschrieben (gleichzeitiger zweiter Import meldete sonst ebenfalls „neu“, 17.10.2026) – Rest gilt als „vorhanden“
  const written = res.reduce((n, r) => n + ((r && r.meta && r.meta.changes) || 0), 0);
  if (written < result.counts.neu) {
    const missed = result.counts.neu - written; result.counts.neu = written; result.counts.vorhanden += missed; result.concurrent = missed;
    const have = new Set((await env.DB.prepare(`SELECT kind, COALESCE(driver_id, vehicle_id) AS t, downloaded_on FROM tacho_downloads WHERE environment=? AND created_at=? AND created_by=?`).bind(envName, now, user.id).all()).results.map((x) => `${x.t}|${x.downloaded_on}`));
    for (const r of fresh) if (!have.has(`${r.target_id}|${r.downloaded_on}`)) r.status = 'vorhanden';
  }
  await audit(env, user.id, 'tacho.import', null, { ...result.counts, environment: envName });
  return result;
}
