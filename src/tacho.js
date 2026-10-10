// [CLAUDE] Auslese-Fristen Fahrerkarte und Massenspeicher des Fahrtenschreibers.
// Rechtsgrundlage: § 2 Abs. 5 Fahrpersonalverordnung (FPersV):
//  – Massenspeicher: Daten spätestens 90 Tage nach Aufzeichnung eines Ereignisses im Betrieb kopieren (Satz 1),
//  – Fahrerkarte: spätestens 28 Kalendertage nach Aufzeichnung eines Ereignisses (Satz 2).
// Umsetzung (vorsichtige Lesart): Das früheste nicht kopierte Ereignis liegt unmittelbar nach der letzten Auslesung,
// daher „spätestens fällig“ = letzte erfasste Auslesung + 28 bzw. + 90 Tage. Ohne erfasste Auslesung wird KEINE Frist
// berechnet (Status „keine Auslesung erfasst“). Sichtbarkeit: Inhaber/Fuhrparkleitung; Fahrer nur eigene Fahrerkarte.
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, oneOf, berlinDate } from './util.js';
import { audit } from './auth.js';

export const TACHO_RULE = { card_days: 28, vu_days: 90, source: 'FPersV § 2 Abs. 5' };
export const TACHO_KINDS = ['fahrerkarte', 'massenspeicher'];
const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

export function warnDaysOf(settings) {
  const v = settings.get('tacho_warn_days'); const n = Number(v);
  return v !== undefined && v !== null && v !== '' && Number.isFinite(n) && n >= 0 ? n : 7;
}

// Status einer Auslesepflicht aus der letzten erfassten Auslesung
export function tachoStatus(last, periodDays, today, warnDays) {
  if (!last) return { last: null, due: null, days: null, status: 'keine' };
  const due = addDays(last, periodDays);
  const left = daysBetween(today, due);
  return { last, due, days: left, status: left < 0 ? 'ueberfaellig' : left <= warnDays ? 'bald' : 'ok' };
}

async function warnDays(env) {
  const r = await env.DB.prepare(`SELECT value FROM settings WHERE key='tacho_warn_days'`).first();
  return warnDaysOf(new Map(r ? [['tacho_warn_days', r.value]] : []));
}

// Zwei Sammelabfragen (unabhängig von der Anzahl Fahrer/Fahrzeuge) – auch vom Fuhrparkagenten genutzt
export async function tachoRows(env, envName, warn, today = berlinDate()) {
  const drv = (await env.DB.prepare(`SELECT d.id, d.display_name, d.personnel_no, d.site,
      (SELECT MAX(t.downloaded_on) FROM tacho_downloads t WHERE t.driver_id=d.id) AS last,
      (SELECT x.valid_until FROM driver_documents x WHERE x.driver_id=d.id AND x.kind='fahrerkarte' AND x.superseded=0 ORDER BY x.created_at DESC LIMIT 1) AS card_valid_until,
      (SELECT COUNT(*) FROM driver_documents x WHERE x.driver_id=d.id AND x.kind='fahrerkarte' AND x.superseded=0) AS has_card
    FROM drivers d WHERE d.environment=? AND d.active=1 ORDER BY d.display_name`).bind(envName).all()).results;
  const veh = (await env.DB.prepare(`SELECT v.id, v.plate, v.site,
      (SELECT MAX(t.downloaded_on) FROM tacho_downloads t WHERE t.vehicle_id=v.id AND t.environment=?) AS last
    FROM vehicles v WHERE v.active=1 AND v.eval_excluded=0 AND v.kind<>'anhaenger' ORDER BY v.plate`).bind(envName).all()).results;
  const drivers = drv.filter((d) => d.has_card || d.last).map((d) => ({ id: d.id, display_name: d.display_name, personnel_no: d.personnel_no, site: d.site,
    card_valid_until: d.card_valid_until, has_card: !!d.has_card, ...tachoStatus(d.last, TACHO_RULE.card_days, today, warn) }));
  const without_card = drv.filter((d) => !d.has_card && !d.last).map((d) => ({ id: d.id, display_name: d.display_name }));
  const vehicles = veh.map((v) => ({ id: v.id, plate: v.plate, site: v.site, ...tachoStatus(v.last, TACHO_RULE.vu_days, today, warn) }));
  return { drivers, vehicles, without_card };
}

const RANK = { ueberfaellig: 0, bald: 1, keine: 2, ok: 3 };
const byUrgency = (a, b) => RANK[a.status] - RANK[b.status] || (a.due || '9').localeCompare(b.due || '9');

export async function tachoOverview(env, user, envName) {
  if (!isMgr(user)) throw forbidden();
  const warn = await warnDays(env); const today = berlinDate();
  const r = await tachoRows(env, envName, warn, today);
  r.drivers.sort(byUrgency); r.vehicles.sort(byUrgency);
  const count = (list) => ({ ueberfaellig: list.filter((x) => x.status === 'ueberfaellig').length, bald: list.filter((x) => x.status === 'bald').length,
    keine: list.filter((x) => x.status === 'keine').length, ok: list.filter((x) => x.status === 'ok').length });
  return { today, warn_days: warn, rule: TACHO_RULE, ...r, totals: { drivers: count(r.drivers), vehicles: count(r.vehicles) } };
}

export async function listDownloads(env, user, envName, q = {}) {
  if (q.driver_id) {
    const d = await env.DB.prepare('SELECT id, user_id FROM drivers WHERE id=? AND environment=?').bind(str(q.driver_id, { max: 40 }), envName).first();
    if (!d || (!isMgr(user) && !(user.role === 'driver' && d.user_id === user.id))) throw notFound('Fahrer nicht gefunden.');
    return (await env.DB.prepare(`SELECT t.id, t.kind, t.downloaded_on, t.evidence, t.note, t.created_at, u.display_name AS created_by_name FROM tacho_downloads t
      LEFT JOIN users u ON u.id=t.created_by WHERE t.driver_id=? ORDER BY t.downloaded_on DESC LIMIT 100`).bind(d.id).all()).results;
  }
  if (!isMgr(user)) throw forbidden();
  if (!q.vehicle_id) throw bad('validation', 'driver_id oder vehicle_id angeben.');
  return (await env.DB.prepare(`SELECT t.id, t.kind, t.downloaded_on, t.evidence, t.note, t.created_at, u.display_name AS created_by_name FROM tacho_downloads t
    LEFT JOIN users u ON u.id=t.created_by WHERE t.vehicle_id=? AND t.environment=? ORDER BY t.downloaded_on DESC LIMIT 100`).bind(str(q.vehicle_id, { max: 60 }), envName).all()).results;
}

export async function addDownload(env, user, envName, body) {
  if (!isMgr(user)) throw forbidden();
  const kind = oneOf(body.kind, TACHO_KINDS, 'Art');
  const on = str(body.downloaded_on, { required: true, max: 10, field: 'Auslesedatum' });
  if (!ISO.test(on) || Number.isNaN(Date.parse(on + 'T00:00:00Z'))) throw bad('validation', 'Auslesedatum im Format JJJJ-MM-TT.');
  if (on > berlinDate()) throw bad('validation', 'Auslesedatum darf nicht in der Zukunft liegen.');
  const evidence = str(body.evidence, { required: true, max: 300, field: 'Nachweis' });
  const note = str(body.note, { max: 500 });
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

// Für den Fuhrparkagenten: nur Fahrer/Fahrzeuge mit mindestens einer erfassten Auslesung (keine erfundenen Fristen)
export async function tachoFindings(env, environment, settings) {
  const r = await tachoRows(env, environment, warnDaysOf(settings));
  const out = [];
  for (const d of r.drivers) {
    if (d.status === 'ueberfaellig') out.push({ code: 'TACHO_CARD_OVERDUE', subject: `${d.id}|fahrerkarte`, severity: 'handeln', requires_decision: 0,
      message: `Fahrer ${d.display_name}: Fahrerkarte seit ${d.due} nicht ausgelesen (letzte Auslesung ${d.last}; Frist 28 Tage, FPersV § 2 Abs. 5).`, next_action: 'Fahrerkarte auslesen und Auslesung erfassen.' });
    else if (d.status === 'bald') out.push({ code: 'TACHO_CARD_DUE', subject: `${d.id}|fahrerkarte`, severity: 'hinweis', requires_decision: 0,
      message: `Fahrer ${d.display_name}: Fahrerkarte spätestens am ${d.due} auslesen.`, next_action: 'Auslesung einplanen.' });
  }
  for (const v of r.vehicles) {
    if (v.status === 'ueberfaellig') out.push({ code: 'TACHO_VU_OVERDUE', vehicle_id: v.id, subject: `${v.id}|massenspeicher`, severity: 'handeln', requires_decision: 0,
      message: `${v.plate}: Massenspeicher seit ${v.due} nicht ausgelesen (letzte Auslesung ${v.last}; Frist 90 Tage, FPersV § 2 Abs. 5).`, next_action: 'Fahrtenschreiber auslesen und Auslesung erfassen.' });
    else if (v.status === 'bald') out.push({ code: 'TACHO_VU_DUE', vehicle_id: v.id, subject: `${v.id}|massenspeicher`, severity: 'hinweis', requires_decision: 0,
      message: `${v.plate}: Massenspeicher spätestens am ${v.due} auslesen.`, next_action: 'Auslesung einplanen.' });
  }
  return out;
}

export function tachoCsv(ov, cell) {
  const S = { ueberfaellig: 'überfällig', bald: 'bald fällig', ok: 'in Ordnung', keine: 'keine Auslesung erfasst' };
  const lines = ['﻿Art;Fahrer/Kennzeichen;Personalnummer;Standort;Letzte Auslesung;Spätestens fällig;Tage;Status'];
  for (const d of ov.drivers) lines.push(['Fahrerkarte', cell(d.display_name), cell(d.personnel_no), cell(d.site), d.last || '', d.due || '', d.days ?? '', S[d.status]].join(';'));
  for (const v of ov.vehicles) lines.push(['Massenspeicher', cell(v.plate), '', cell(v.site), v.last || '', v.due || '', v.days ?? '', S[v.status]].join(';'));
  return lines.join('\r\n') + '\r\n';
}
