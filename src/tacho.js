// [CLAUDE] Auslese-Fristen Fahrerkarte und Massenspeicher des Fahrtenschreibers.
// Rechtsgrundlage: § 2 Abs. 5 Fahrpersonalverordnung (FPersV):
//  – Massenspeicher: Daten spätestens 90 Tage nach Aufzeichnung eines Ereignisses im Betrieb kopieren (Satz 1),
//  – Fahrerkarte: spätestens 28 Kalendertage nach Aufzeichnung eines Ereignisses (Satz 2).
// Umsetzung (vorsichtige Lesart): Das früheste nicht kopierte Ereignis liegt unmittelbar nach der letzten Auslesung,
// daher „spätestens fällig“ = letzte erfasste Auslesung + 28 bzw. + 90 Tage. Ohne erfasste Auslesung wird KEINE Frist
// berechnet (Status „keine Auslesung erfasst“). Sichtbarkeit: Inhaber/Fuhrparkleitung; Fahrer nur eigene Fahrerkarte.
import { findingText as fm } from '../public/finding-messages.js';
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, oneOf, berlinDate, parseCsv, normalizeVin, isCalendarDate, normPlate } from './util.js';
import { siteSelection } from './reports.js';
import { audit } from './auth.js';
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
  return { last, due, days: left, status: left < 0 ? 'ueberfaellig' : left <= warnDays ? 'bald' : 'ok' };
}

export async function warnDays(env) {
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
  const without_card = drv.filter((d) => !d.has_card && !d.last).map((d) => ({ id: d.id, display_name: d.display_name, site: d.site }));
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
  if (sel.site) for (const k of ['drivers', 'without_card', 'vehicles']) r[k] = r[k].filter((x) => sel.match(x.site));
  r.site = sel.site; r.site_options = sel.options;
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
  for (const v of ov.vehicles) lines.push(['Massenspeicher', cell(v.plate), '', cell(v.site), v.last || '', v.due || '', v.days ?? '', S[v.status]].join(';'));
  return lines.join('\r\n') + '\r\n';
}

// Sammelimport aus dem Export der Auslesesoftware (CSV, „;“ oder „,“). Spalten (Groß/Klein egal, Anfang genügt):
// Art (Fahrerkarte/Karte/C bzw. Massenspeicher/Fahrzeug/VU/M), Personalnummer und/oder Fahrer/Name, Kennzeichen und/oder FIN,
// Datum (JJJJ-MM-TT oder TT.MM.JJJJ), Nachweis/Datei (sonst Pflichtangabe `source` für alle Zeilen).
// Zuordnung nur eindeutig: Fahrer über Personalnummer, sonst exakt gleicher Name; Fahrzeug über FIN, sonst eindeutiges Kennzeichen.
const MAX_IMPORT = 2000;
const normName = (n) => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
function parseDay(raw) {
  const t = String(raw || '').trim(); let m;
  const iso = (d) => (ISO.test(d) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d ? d : null);
  if (ISO.test(t)) return iso(t);
  if ((m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s.*)?$/))) return iso(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  // Zeitstempel mit Zeitzone (Z oder ±hh:mm): Berliner Kalendertag (22:30Z am 31.03. = 01.04. in Berlin); ohne Zone der Datumsteil
  if ((m = t.match(/^(\d{4}-\d{2}-\d{2})[T\s]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})$/i)) && iso(m[1])) {
    const d = new Date(t.replace(' ', 'T').replace(/\s+/g, '').replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
    return Number.isNaN(d.getTime()) ? null : berlinDate(d.toISOString());
  }
  if ((m = t.match(/^(\d{4}-\d{2}-\d{2})[T\s]/))) return iso(m[1]);
  return null;
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
  const head = table[0].map((h) => h.toLowerCase());
  const col = (names) => head.findIndex((h) => names.some((n) => h.startsWith(n)));
  // Namensspalte: „Name“/„Fahrername“ vor „Fahrer…“; „Fahrerkartennummer“, „Fahrer-Nr.“ o. Ä. sind keine Namen
  const nameCol = (hd) => { const notName = (h) => /karte|nr|nummer|kennung|id\b/.test(h); const exact = hd.findIndex((h) => ['name', 'fahrername', 'fahrer', 'name fahrer', 'fahrer name'].includes(h.trim()));
    return exact >= 0 ? exact : hd.findIndex((h) => (h.startsWith('fahrer') || h.startsWith('name')) && !notName(h)); };
  const ci = { kind: col(['art', 'typ', 'quelle der daten']), pno: col(['personalnummer', 'personal-nr', 'pers']), name: nameCol(head),
    plate: col(['kennzeichen']), vin: col(['fin', 'fahrgestell']), day: col(['datum', 'auslesedatum', 'ausgelesen']), ev: col(['nachweis', 'datei', 'beleg']) };
  const fallbackEv = str(source, { max: 200 }) || ''; // keine Quelle angegeben: leer statt null (leere Nachweis-Zelle ergab sonst 500)
  if (ci.kind < 0) throw bad('validation', 'Spalte „Art“ (Fahrerkarte/Massenspeicher) erforderlich.');
  // Eigene Übersicht der App (Export „Auslesungen“: Letzte Auslesung/Spätestens fällig) ist kein Beleg einer Auslesung
  if (ci.day < 0 && head.some((h) => h.startsWith('letzte auslesung') || h.startsWith('spätestens fällig'))) throw bad('wrong_file_tacho', 'Das ist die Fristen-Übersicht dieser App, kein Export der Auslesesoftware. Bitte die Datei der Auslesesoftware mit Spalte „Datum“ hochladen.');
  if (ci.day < 0) throw bad('validation', 'Spalte „Datum“ erforderlich.');
  if (ci.ev < 0 && !fallbackEv) throw bad('validation', 'Spalte „Nachweis“/„Datei“ oder Angabe „Quelle“ für alle Zeilen erforderlich.');
  if (ci.pno < 0 && ci.name < 0 && ci.plate < 0 && ci.vin < 0) throw bad('validation', 'Spalte Personalnummer/Fahrer oder Kennzeichen/FIN erforderlich.');

  const drivers = (await env.DB.prepare('SELECT id, display_name, personnel_no FROM drivers WHERE environment=? AND active=1').bind(envName).all()).results;
  const vehicles = (await env.DB.prepare(`SELECT id, vin, plate, kind, eval_excluded FROM vehicles WHERE active=1`).all()).results;
  const existing = new Set((await env.DB.prepare(`SELECT COALESCE(driver_id, vehicle_id) || '|' || downloaded_on AS k FROM tacho_downloads WHERE environment=?`).bind(envName).all()).results.map((r) => r.k));
  const uniq = (list, keyFn) => { const m = new Map(); for (const x of list) { const k = keyFn(x); if (!k) continue; m.set(k, m.has(k) ? 'mehrdeutig' : x); } return m; };
  const byPno = uniq(drivers, (d) => (d.personnel_no ? d.personnel_no.trim().toLowerCase() : null));
  const byName = uniq(drivers, (d) => normName(d.display_name));
  const byVin = new Map(vehicles.map((v) => [v.vin, v]));
  // Kennzeichen doppelt, aber nur eines bewertet (ruhendes Doppel, z. B. Tippfehler-FIN): das bewertete Fahrzeug – wie die Fristen-Übersicht
  const byPlate = uniq(vehicles, (v) => normPlate(v.plate));
  const byPlateEval = uniq(vehicles.filter((v) => !v.eval_excluded), (v) => normPlate(v.plate));
  for (const [k, v] of byPlate) if (v === 'mehrdeutig' && byPlateEval.get(k) && byPlateEval.get(k) !== 'mehrdeutig') byPlate.set(k, byPlateEval.get(k));
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
      const pno = get(cells, ci.pno).toLowerCase(); const nm = normName(get(cells, ci.name));
      target = pno ? byPno.get(pno) : nm ? byName.get(nm) : undefined;
      if (target === 'mehrdeutig') return skip(`Fahrer nicht eindeutig: ${get(cells, ci.pno) || get(cells, ci.name)}`);
      if (!target) return skip(`Fahrer nicht gefunden: ${get(cells, ci.pno) || get(cells, ci.name) || '–'}`);
      label = target.display_name;
    } else {
      const vin = get(cells, ci.vin) ? normalizeVin(get(cells, ci.vin)) : '';
      target = vin ? byVin.get(vin) : get(cells, ci.plate) ? byPlate.get(normPlate(get(cells, ci.plate))) : undefined;
      if (target === 'mehrdeutig') return skip(`Kennzeichen nicht eindeutig: ${get(cells, ci.plate)}`);
      if (!target) return skip(`Fahrzeug nicht gefunden: ${get(cells, ci.vin) || get(cells, ci.plate) || '–'}`);
      if (target.kind === 'anhaenger') return skip(`Anhänger ohne Fahrtenschreiber: ${target.plate}`);
      label = target.plate;
    }
    const key = `${target.id}|${day}`;
    if (seen.has(key)) return skip('doppelt in der Datei');
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
  await env.DB.batch(stmts);
  await audit(env, user.id, 'tacho.import', null, { ...result.counts, environment: envName });
  return result;
}
