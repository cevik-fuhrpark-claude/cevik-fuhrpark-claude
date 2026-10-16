// [CLAUDE] Fahrerakte: Fahrer (auch ohne App-Konto), Nachweise mit Gültig-bis laut Dokument, Führerscheinkontrollen, Erinnerungen.
// Grundsätze: Fristen nur aus Dokumenten (nichts berechnet/erfunden). Personenbezogene Daten: Inhaber und Fuhrparkleitung sehen alles,
// ein Fahrer nur seine eigene Akte (über verknüpftes Konto), alle anderen Rollen nichts. Jede Änderung im Audit-Log.
import { findingText as fm } from '../public/finding-messages.js';
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, oneOf, berlinDate, isCalendarDate } from './util.js';
import { audit } from './auth.js';
import { tachoStatus, warnDaysOf, TACHO_RULE } from './tacho.js';
import { SETTING_DEFAULTS } from './settings.js';

export const DOC_KINDS = ['fuehrerschein', 'fahrerkarte', 'code95', 'unterweisung', 'sonstiges'];
export const CHECK_RESULTS = ['in_ordnung', 'maengel', 'nicht_vorgelegt'];
// Ergebnis der Führerscheinkontrolle als Bezeichnung wie in der App (CSV; bis 16.10.2026 Code); Test prüft Gleichheit mit i18n.js
export const CHECK_RESULT_DE = { in_ordnung: 'in Ordnung', maengel: 'Mängel', nicht_vorgelegt: 'nicht vorgelegt' };
const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';
const ISO = { test: isCalendarDate }; // echtes Kalenderdatum JJJJ-MM-TT
const date = (v, field, { required = false, notFuture = false } = {}) => {
  const d = str(v, { max: 10, required, field });
  if (!d) return null;
  if (!ISO.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z'))) throw bad('validation', `${field}: Datum im Format JJJJ-MM-TT.`);
  if (notFuture && d > berlinDate()) throw bad('validation', `${field}: darf nicht in der Zukunft liegen.`);
  return d;
};
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

async function settingsMap(env) {
  return new Map((await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN ('driver_doc_warn_days','license_check_months','tacho_warn_days')`).all()).results.map((r) => [r.key, r.value]));
}
function cfg(map) {
  // Regel = Wirkung (SETTING_RULES: 0–365): 0 = keine Vorwarnung (nur „abgelaufen“), leer = Standard 30 – vorher wurde 0 still zu 30
  const wv = map.get('driver_doc_warn_days'); const warn = wv === undefined || wv === null || wv === '' ? NaN : Number(wv);
  const months = Number(map.get('license_check_months'));
  return { warnDays: Number.isFinite(warn) && warn >= 0 ? warn : SETTING_DEFAULTS.driver_doc_warn_days, checkMonths: Number.isInteger(months) && months > 0 ? months : null };
}
function addMonthsIso(d, m) {
  const [y, mo, da] = d.split('-').map(Number);
  const last = new Date(Date.UTC(y, mo - 1 + m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, mo - 1 + m, Math.min(da, last))).toISOString().slice(0, 10);
}

// Status je Fahrer aus aktuellen Nachweisen und letzter Führerscheinkontrolle
export function driverStatus(docs, lastCheck, today, { warnDays, checkMonths }) {
  const items = [];
  for (const d of docs.filter((x) => !x.superseded && x.valid_until)) {
    const left = days(today, d.valid_until);
    items.push({ type: 'doc', kind: d.kind, id: d.id, valid_until: d.valid_until, days: left, status: left < 0 ? 'abgelaufen' : left <= warnDays ? 'laeuft_ab' : 'ok' });
  }
  let check = { last: lastCheck ? lastCheck.checked_on : null, result: lastCheck ? lastCheck.result : null, due: null, status: lastCheck ? 'ok' : 'fehlt' };
  if (lastCheck && lastCheck.result !== 'in_ordnung') check.status = 'mangel';
  else if (lastCheck && checkMonths) {
    check.due = addMonthsIso(lastCheck.checked_on, checkMonths);
    const left = days(today, check.due);
    check.status = left < 0 ? 'faellig' : left <= warnDays ? 'bald' : 'ok';
  }
  const hasLicense = docs.some((x) => !x.superseded && x.kind === 'fuehrerschein');
  const worst = items.some((i) => i.status === 'abgelaufen') || check.status === 'mangel' ? 'kritisch'
    : items.some((i) => i.status === 'laeuft_ab') || ['faellig', 'fehlt'].includes(check.status) || !hasLicense ? 'hinweis' : 'ok';
  return { items, check, has_license: hasLicense, overall: worst };
}

async function loadDriver(env, user, envName, id) {
  const d = await env.DB.prepare('SELECT * FROM drivers WHERE id=? AND environment=?').bind(id, envName).first();
  if (!d) throw notFound('Fahrer nicht gefunden.');
  if (!isMgr(user) && !(user.role === 'driver' && d.user_id === user.id)) throw notFound('Fahrer nicht gefunden.');
  return d;
}

export async function listDrivers(env, user, envName, query = {}, settings = null) {
  if (!isMgr(user)) {
    if (user.role !== 'driver') throw forbidden();
    const own = await env.DB.prepare('SELECT id FROM drivers WHERE user_id=? AND environment=?').bind(user.id, envName).first();
    return own ? [await driverDetail(env, user, envName, own.id)].map((x) => ({ ...x.driver, status: x.status })) : [];
  }
  const active = query.inactive === '1' ? 0 : 1;
  const drivers = (await env.DB.prepare(`SELECT d.*, u.username FROM drivers d LEFT JOIN users u ON u.id=d.user_id WHERE d.environment=? AND d.active=? ORDER BY d.display_name`).bind(envName, active).all()).results;
  const docs = (await env.DB.prepare(`SELECT x.id, x.driver_id, x.kind, x.valid_until, x.superseded FROM driver_documents x JOIN drivers d ON d.id=x.driver_id WHERE d.environment=? AND x.superseded=0`).bind(envName).all()).results;
  const checks = (await env.DB.prepare(`SELECT c.driver_id, c.checked_on, c.result FROM driver_license_checks c JOIN drivers d ON d.id=c.driver_id
    WHERE d.environment=? AND c.checked_on = (SELECT MAX(c2.checked_on) FROM driver_license_checks c2 WHERE c2.driver_id=c.driver_id)`).bind(envName).all()).results;
  const c = cfg(settings || await settingsMap(env)); const today = berlinDate();
  const byD = new Map(); for (const x of docs) { if (!byD.has(x.driver_id)) byD.set(x.driver_id, []); byD.get(x.driver_id).push(x); }
  const chk = new Map(checks.map((x) => [x.driver_id, x]));
  return drivers.map((d) => ({ ...d, status: driverStatus(byD.get(d.id) || [], chk.get(d.id) || null, today, c) }));
}

// Verläufe in der Fahrerakte (Auslesungen Fahrerkarte, Führerscheinkontrollen): neueste 100 (≈ 7 Jahre bei 28-Tage-Takt);
// eine Zeile mehr gelesen → *_truncated, die App weist darauf hin (vorher 20 Auslesungen ≈ 1,5 Jahre bzw. 50 Kontrollen ohne Hinweis)
export const DRIVER_HIST_MAX = 100;
export async function driverDetail(env, user, envName, id) {
  const d = await loadDriver(env, user, envName, id);
  const docs = (await env.DB.prepare(`SELECT x.*, u.display_name AS created_by_name FROM driver_documents x LEFT JOIN users u ON u.id=x.created_by WHERE x.driver_id=? ORDER BY x.superseded, x.kind, x.valid_until DESC`).bind(id).all()).results;
  const checks = (await env.DB.prepare(`SELECT c.*, u.display_name AS checked_by_name FROM driver_license_checks c LEFT JOIN users u ON u.id=c.checked_by WHERE c.driver_id=? ORDER BY c.checked_on DESC LIMIT ?`).bind(id, DRIVER_HIST_MAX + 1).all()).results;
  const checksTruncated = checks.length > DRIVER_HIST_MAX; if (checksTruncated) checks.length = DRIVER_HIST_MAX;
  const sm = await settingsMap(env); const c = cfg(sm);
  const downloads = (await env.DB.prepare(`SELECT t.id, t.downloaded_on, t.evidence, t.note, u.display_name AS created_by_name FROM tacho_downloads t LEFT JOIN users u ON u.id=t.created_by WHERE t.driver_id=? ORDER BY t.downloaded_on DESC LIMIT ?`).bind(id, DRIVER_HIST_MAX + 1).all()).results;
  const downloadsTruncated = downloads.length > DRIVER_HIST_MAX; if (downloadsTruncated) downloads.length = DRIVER_HIST_MAX;
  const hasCard = docs.some((x) => !x.superseded && x.kind === 'fahrerkarte');
  const tacho = hasCard || downloads.length ? { ...tachoStatus(downloads[0] ? downloads[0].downloaded_on : null, TACHO_RULE.card_days, berlinDate(), warnDaysOf(sm)), rule: TACHO_RULE } : null;
  const vehicles = d.user_id ? (await env.DB.prepare(`SELECT v.id, v.plate FROM driver_vehicles dv JOIN vehicles v ON v.id=dv.vehicle_id WHERE dv.user_id=? AND (dv.valid_to IS NULL OR dv.valid_to > ?)`).bind(d.user_id, nowIso()).all()).results : [];
  return { driver: d, documents: docs, license_checks: checks, license_checks_truncated: checksTruncated, vehicles, tacho, tacho_downloads: downloads, tacho_downloads_truncated: downloadsTruncated, history_max: DRIVER_HIST_MAX, status: driverStatus(docs, checks[0] || null, berlinDate(), c), settings: c };
}

export async function createDriver(env, user, envName, body) {
  if (!isMgr(user)) throw forbidden();
  const name = str(body.display_name, { required: true, max: 120, field: 'Name' });
  const userId = await validLinkedUser(env, envName, body.user_id);
  const id = uuid(); const now = nowIso();
  try {
    await env.DB.prepare(`INSERT INTO drivers(id,environment,display_name,personnel_no,site,user_id,active,note,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?,?,?)`)
      .bind(id, envName, name, str(body.personnel_no, { max: 40 }), str(body.site, { max: 60 }), userId, str(body.note, { max: 1000 }), user.id, now, now).run();
  } catch (e) { if (String(e.message).includes('UNIQUE')) throw conflict('duplicate', 'Dieses App-Konto ist bereits einem Fahrer zugeordnet.'); throw e; }
  await audit(env, user.id, 'driver.create', id, { name, environment: envName });
  return { id };
}

async function validLinkedUser(env, envName, raw) {
  if (!raw) return null;
  const u = await env.DB.prepare(`SELECT id FROM users WHERE id=? AND role='driver' AND environment=?`).bind(str(raw, { max: 40 }), envName).first();
  if (!u) throw bad('validation', 'App-Konto nicht gefunden (Rolle Fahrer, gleiche Umgebung).');
  return u.id;
}

export async function updateDriver(env, user, envName, id, body) {
  if (!isMgr(user)) throw forbidden();
  const d = await loadDriver(env, user, envName, id);
  const f = {
    display_name: body.display_name !== undefined ? str(body.display_name, { required: true, max: 120, field: 'Name' }) : d.display_name,
    personnel_no: body.personnel_no !== undefined ? str(body.personnel_no, { max: 40 }) : d.personnel_no,
    site: body.site !== undefined ? str(body.site, { max: 60 }) : d.site,
    user_id: body.user_id !== undefined ? await validLinkedUser(env, envName, body.user_id) : d.user_id,
    active: body.active === undefined ? d.active : (body.active ? 1 : 0),
    note: body.note !== undefined ? str(body.note, { max: 1000 }) : d.note,
  };
  try {
    await env.DB.prepare('UPDATE drivers SET display_name=?, personnel_no=?, site=?, user_id=?, active=?, note=?, updated_at=? WHERE id=?')
      .bind(f.display_name, f.personnel_no, f.site, f.user_id, f.active, f.note, nowIso(), id).run();
  } catch (e) { if (String(e.message).includes('UNIQUE')) throw conflict('duplicate', 'Dieses App-Konto ist bereits einem Fahrer zugeordnet.'); throw e; }
  await audit(env, user.id, 'driver.update', id, { changed: Object.keys(body) });
  return { ok: true };
}

export async function addDriverDocument(env, user, envName, id, body) {
  if (!isMgr(user)) throw forbidden();
  await loadDriver(env, user, envName, id);
  const kind = oneOf(body.kind, DOC_KINDS, 'Art');
  const evidence = str(body.evidence, { required: true, max: 300, field: 'Nachweis' });
  const issued = date(body.issued_on, 'Ausgestellt am', { notFuture: true });
  const valid = date(body.valid_until, 'Gültig bis');
  if (issued && valid && valid < issued) throw bad('validation', 'Gültig bis liegt vor dem Ausstellungsdatum.');
  if (['fahrerkarte', 'code95'].includes(kind) && !valid) throw bad('validation', 'Gültig bis laut Dokument angeben.');
  const docId = uuid(); const now = nowIso();
  const stmts = [];
  // Neuer Nachweis gleicher Art (außer Unterweisung/Sonstiges) ersetzt den bisherigen – Historie bleibt erhalten
  if (['fuehrerschein', 'fahrerkarte', 'code95'].includes(kind)) stmts.push(env.DB.prepare('UPDATE driver_documents SET superseded=1 WHERE driver_id=? AND kind=? AND superseded=0').bind(id, kind));
  stmts.push(env.DB.prepare(`INSERT INTO driver_documents(id,driver_id,kind,title,number,license_classes,issued_on,valid_until,evidence,superseded,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)`)
    .bind(docId, id, kind, str(body.title, { max: 120 }), str(body.number, { max: 40 }), kind === 'fuehrerschein' ? str(body.license_classes, { max: 60 }) : null, issued, valid, evidence, user.id, now));
  await env.DB.batch(stmts);
  await audit(env, user.id, 'driver.document', id, { kind, valid_until: valid });
  return { id: docId };
}

export async function addLicenseCheck(env, user, envName, id, body) {
  if (!isMgr(user)) throw forbidden();
  await loadDriver(env, user, envName, id);
  const on = date(body.checked_on, 'Kontrolldatum', { required: true, notFuture: true });
  const result = oneOf(body.result, CHECK_RESULTS, 'Ergebnis');
  const note = str(body.note, { max: 500 });
  if (result !== 'in_ordnung' && !note) throw bad('validation', 'Bei Mängeln oder nicht vorgelegtem Führerschein bitte Vermerk angeben.');
  const cid = uuid();
  await env.DB.prepare('INSERT INTO driver_license_checks(id,driver_id,checked_on,result,checked_by,note,created_at) VALUES (?,?,?,?,?,?,?)').bind(cid, id, on, result, user.id, note, nowIso()).run();
  await audit(env, user.id, 'driver.license_check', id, { checked_on: on, result });
  return { id: cid };
}

// Für den Fuhrparkagenten: abgelaufene/ablaufende Nachweise, fällige/fehlerhafte Führerscheinkontrollen (nur aktive Fahrer)
export async function driverFindings(env, environment, settings = null) {
  const list = await listDrivers(env, { role: 'owner' }, environment, {}, settings);
  const out = [];
  const L = { fuehrerschein: 'Führerschein', fahrerkarte: 'Fahrerkarte', code95: 'Code 95 / Weiterbildung', unterweisung: 'Unterweisung', sonstiges: 'Nachweis' };
  for (const d of list) {
    for (const i of d.status.items) {
      if (i.status === 'abgelaufen') out.push({ code: 'DRIVER_DOC_EXPIRED', subject: `${d.id}|${i.kind}`, severity: i.kind === 'fuehrerschein' || i.kind === 'fahrerkarte' ? 'kritisch' : 'handeln', requires_decision: 1,
        ...fm('DRIVER_DOC_EXPIRED', { name: d.display_name, ddoc: L[i.kind] ? i.kind : 'sonstiges', date: i.valid_until }), next_action: 'Nicht einsetzen, bis ein gültiger Nachweis vorliegt; neuen Nachweis erfassen.' });
      else if (i.status === 'laeuft_ab') out.push({ code: 'DRIVER_DOC_EXPIRES_SOON', subject: `${d.id}|${i.kind}`, severity: 'hinweis', requires_decision: 0,
        ...fm('DRIVER_DOC_EXPIRES_SOON', { name: d.display_name, ddoc: L[i.kind] ? i.kind : 'sonstiges', date: i.valid_until, days: i.days }), next_action: 'Verlängerung rechtzeitig veranlassen.' });
    }
    if (d.status.check.status === 'faellig') out.push({ code: 'LICENSE_CHECK_DUE', subject: `${d.id}|fs_kontrolle`, severity: 'handeln', requires_decision: 0,
      ...fm('LICENSE_CHECK_DUE', { name: d.display_name, last: d.status.check.last }), next_action: 'Original-Führerschein vorlegen lassen und Kontrolle erfassen.' });
    else if (d.status.check.status === 'mangel') out.push({ code: 'LICENSE_CHECK_FAILED', subject: `${d.id}|fs_kontrolle`, severity: 'kritisch', requires_decision: 1,
      ...fm('LICENSE_CHECK_FAILED', { name: d.display_name, last: d.status.check.last }), next_action: 'Einsatz klären; Führerschein prüfen.' });
  }
  return out;
}

// Fristenliste als CSV (nur Inhaber/Fuhrparkleitung; Aufruf wird protokolliert). Nur gespeicherte Daten, leere Zelle = nicht erfasst.
export function driversCsv(list, tachoByDriver, cell) {
  const DOV = { ok: 'in Ordnung', hinweis: 'Hinweis', kritisch: 'kritisch' };
  const DCK = { ok: 'aktuell', faellig: 'fällig', bald: 'bald fällig', fehlt: 'keine erfasst', mangel: 'Mangel' };
  const TST = { ueberfaellig: 'überfällig', bald: 'bald fällig', ok: 'in Ordnung', keine: 'keine Auslesung erfasst' };
  const lines = ['﻿Name;Personalnummer;Standort;Führerschein gültig bis;Fahrerkarte gültig bis;Code 95 gültig bis;Letzte Führerscheinkontrolle;Ergebnis;Kontrolle fällig;Letzte Auslesung Fahrerkarte;Auslesung spätestens;Status'];
  for (const d of list) {
    const v = (k) => (d.status.items.find((i) => i.kind === k) || {}).valid_until || '';
    const tc = tachoByDriver.get(d.id);
    lines.push([cell(d.display_name), cell(d.personnel_no), cell(d.site), v('fuehrerschein'), v('fahrerkarte'), v('code95'), d.status.check.last || '', CHECK_RESULT_DE[d.status.check.result] || d.status.check.result || '',
      d.status.check.due || '', tc ? tc.last || '' : '', tc ? tc.due || '' : '', `${DOV[d.status.overall]}${d.status.check.status !== 'ok' ? ' · Kontrolle ' + DCK[d.status.check.status] : ''}${tc && tc.status !== 'ok' ? ' · Auslesung ' + TST[tc.status] : ''}`].join(';'));
  }
  return lines.join('\r\n') + '\r\n';
}
