// [CLAUDE] Fahrerakte: Fahrer (auch ohne App-Konto), Nachweise mit Gültig-bis laut Dokument, Führerscheinkontrollen, Erinnerungen.
// Grundsätze: Fristen nur aus Dokumenten (nichts berechnet/erfunden). Personenbezogene Daten: Inhaber und Fuhrparkleitung sehen alles,
// ein Fahrer nur seine eigene Akte (über verknüpftes Konto), alle anderen Rollen nichts. Jede Änderung im Audit-Log.
import { findingText as fm } from '../public/finding-messages.js';
import { nowIso, laterIso, uuid, bad, forbidden, notFound, conflict, str, oneOf, flag, berlinDate, berlinDaySql, isCalendarDate, cutText } from './util.js';
import { audit } from './auth.js';
import { tachoStatus, warnDaysOf, TACHO_RULE, pnoKey, normName } from './tacho.js';
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
  // Jahres-Tippfehler (2062 statt 2026, 1026): Nachweis galt sonst Jahrzehnte als gültig bzw. sofort als abgelaufen (18.10.2026).
  // Untergrenze 1950 (alte Führerscheine), Obergrenze heute + 20 Jahre (Führerschein 15, Fahrerkarte/Code 95 5 Jahre)
  const max = String(Number(berlinDate().slice(0, 4)) + 20) + berlinDate().slice(4);
  if (d < '1950-01-01' || d > max) throw bad('validation', `${field}: Datum außerhalb des zulässigen Bereichs.`);
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

export const GROUPED_KINDS = ['unterweisung', 'sonstiges'];
// Erfassungstag als Berliner Kalendertag (20.10.2026: UTC-Tag – nach 00:00 Berlin galt der Vortag, ein am selben Tag nachgetragener
// älterer Nachweis löste den neuen ab)
export const byName = (a, b) => String(a.display_name || '').localeCompare(String(b.display_name || ''), 'de', { sensitivity: 'base' });
const entryDay = (iso) => (iso ? berlinDate(String(iso)) : '');
// Status je Fahrer aus aktuellen Nachweisen und letzter Führerscheinkontrolle
export function driverStatus(docs, lastCheck, today, { warnDays, checkMonths }) {
  const items = [];
  // Unterweisung/Sonstiges ersetzen ältere Nachweise beim Erfassen nicht (mehrere Themen nebeneinander). Bewertet wird je Art + Titel
  // (Groß-/Kleinschreibung, Leerzeichen egal) nur der Nachweis mit dem spätesten „gültig bis“; ältere derselben Gruppe gelten als
  // durch den neueren abgelöst (`replaced`). Vorher blieb eine abgelaufene Unterweisung trotz neuer gültiger dauerhaft „kritisch“ (17.10.2026).
  // ohne Bezeichnung keine Gruppe (18.10.2026): zwei unbenannte Nachweise (ADR-Schein, Staplerschein) lösten sich gegenseitig ab, der abgelaufene verschwand
  const groupKey = (x) => { const t = String(x.title || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase(); return t ? `${x.kind}|${t}` : `${x.kind}|#${x.id}`; };
  // Neuester je Gruppe: beide mit „gültig bis“ → spätestes; sonst nach Ausstellungsdatum (ohne: Erfassungstag) – eine erneute Unterweisung
  // ohne „gültig bis“ löst die abgelaufene ab (17.10.2026), ein nachgetragener älterer Nachweis nicht
  const newer = (a, b) => {
    if (a.valid_until && b.valid_until && a.valid_until !== b.valid_until) return a.valid_until > b.valid_until;
    const da = a.issued_on || entryDay(a.created_at); const db = b.issued_on || entryDay(b.created_at);
    if (da !== db) return da > db;
    if (!!a.valid_until !== !!b.valid_until) return !!a.valid_until;
    return String(a.created_at || '') > String(b.created_at || '');
  };
  const newest = new Map();
  for (const x of docs) {
    if (x.superseded || !GROUPED_KINDS.includes(x.kind)) continue;
    const k = groupKey(x); const cur = newest.get(k);
    if (!cur || newer(x, cur)) newest.set(k, x);
  }
  const replaced = [];
  for (const d of docs.filter((x) => !x.superseded && x.valid_until)) {
    if (GROUPED_KINDS.includes(d.kind)) { const n = newest.get(groupKey(d)); if (n && n.id !== d.id) { replaced.push({ id: d.id, by: n.id, by_valid_until: n.valid_until || null, ...(n.valid_until ? {} : { by_issued_on: n.issued_on || entryDay(n.created_at) || null }) }); continue; } }
    const left = days(today, d.valid_until);
    const topic = GROUPED_KINDS.includes(d.kind) ? groupKey(d).slice(d.kind.length + 1) : '';
    items.push({ type: 'doc', kind: d.kind, id: d.id, valid_until: d.valid_until, days: left, status: left < 0 ? 'abgelaufen' : left <= warnDays ? 'laeuft_ab' : 'ok', ...(topic ? { topic, ...(String(d.title || '').trim() ? { title: shortTitle(d.title) } : {}) } : {}) });
  }
  let check = { last: lastCheck ? lastCheck.checked_on : null, result: lastCheck ? lastCheck.result : null, due: null, status: lastCheck ? 'ok' : 'fehlt' };
  if (lastCheck && lastCheck.result !== 'in_ordnung') check.status = 'mangel';
  else if (lastCheck && checkMonths) {
    check.due = addMonthsIso(lastCheck.checked_on, checkMonths);
    const left = days(today, check.due);
    // Vorwarnung höchstens Kontrollabstand − 1 Tag (wie Auslesungen, tachoStatus): sonst stand die Akte bei Vorwarnung ≥ Abstand schon am Kontrolltag auf „bald fällig“ (19.10.2026)
    check.days = left;
    check.status = left < 0 ? 'faellig' : left <= Math.min(warnDays, days(lastCheck.checked_on, check.due) - 1) ? 'bald' : 'ok';
  }
  const hasLicense = docs.some((x) => !x.superseded && x.kind === 'fuehrerschein');
  const worst = items.some((i) => i.status === 'abgelaufen') || check.status === 'mangel' ? 'kritisch'
    : items.some((i) => i.status === 'laeuft_ab') || ['faellig', 'fehlt', 'bald'].includes(check.status) || !hasLicense ? 'hinweis' : 'ok'; // „bald“ wie bald ablaufende Nachweise (18.10.2026)
  return { items, replaced, check, has_license: hasLicense, overall: worst };
}

async function loadDriver(env, user, envName, id) {
  const d = await env.DB.prepare('SELECT * FROM drivers WHERE id=? AND environment=?').bind(id, envName).first();
  if (!d) throw notFound('Fahrer nicht gefunden.');
  if (!isMgr(user) && !(user.role === 'driver' && d.user_id === user.id)) throw notFound('Fahrer nicht gefunden.');
  // Fahrer sieht die eigenen Stammdaten ohne internen Vermerk der Leitung (18.10.2026; Datenauskunft des Inhabers enthält ihn weiter)
  if (!isMgr(user)) { const { note, created_by, ...own } = d; return own; }
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
  const docs = (await env.DB.prepare(`SELECT x.id, x.driver_id, x.kind, x.title, x.valid_until, x.issued_on, x.created_at, x.superseded FROM driver_documents x JOIN drivers d ON d.id=x.driver_id WHERE d.environment=? AND x.superseded=0`).bind(envName).all()).results;
  const checks = (await env.DB.prepare(`SELECT c.driver_id, c.checked_on, c.result FROM driver_license_checks c JOIN drivers d ON d.id=c.driver_id
    WHERE d.environment=? AND c.cancelled_at IS NULL AND c.checked_on = (SELECT MAX(c2.checked_on) FROM driver_license_checks c2 WHERE c2.driver_id=c.driver_id AND c2.cancelled_at IS NULL)
    ORDER BY c.created_at, c.rowid`).bind(envName).all()).results; // mehrere am selben Tag: die zuletzt erfasste gilt (Map übernimmt die letzte Zeile)
  const c = cfg(settings || await settingsMap(env)); const today = berlinDate();
  const byD = new Map(); for (const x of docs) { if (!byD.has(x.driver_id)) byD.set(x.driver_id, []); byD.get(x.driver_id).push(x); }
  const chk = new Map(checks.map((x) => [x.driver_id, x]));
  // Namen nach deutscher Sortierung (20.10.2026: ORDER BY sortierte „Özdemir“, „von Berg“ hinter „Zimmer“)
  drivers.sort(byName);
  return drivers.map((d) => ({ ...d, status: driverStatus(byD.get(d.id) || [], chk.get(d.id) || null, today, c) }));
}

// Verläufe in der Fahrerakte (Auslesungen Fahrerkarte, Führerscheinkontrollen): neueste 100 (≈ 7 Jahre bei 28-Tage-Takt);
// eine Zeile mehr gelesen → *_truncated, die App weist darauf hin (vorher 20 Auslesungen ≈ 1,5 Jahre bzw. 50 Kontrollen ohne Hinweis)
export const DRIVER_HIST_MAX = 100;
export async function driverDetail(env, user, envName, id) {
  const d = await loadDriver(env, user, envName, id);
  const docs = (await env.DB.prepare(`SELECT x.*, u.display_name AS created_by_name FROM driver_documents x LEFT JOIN users u ON u.id=x.created_by WHERE x.driver_id=? ORDER BY x.superseded, x.kind, x.valid_until DESC`).bind(id).all()).results;
  const checks = (await env.DB.prepare(`SELECT c.*, u.display_name AS checked_by_name FROM driver_license_checks c LEFT JOIN users u ON u.id=c.checked_by WHERE c.driver_id=? ORDER BY c.checked_on DESC, c.created_at DESC, c.rowid DESC LIMIT ?`).bind(id, DRIVER_HIST_MAX + 1).all()).results;
  const checksTruncated = checks.length > DRIVER_HIST_MAX; if (checksTruncated) checks.length = DRIVER_HIST_MAX;
  // stornierte Kontrollen bleiben im Verlauf, zählen aber nicht (Migration 0065); gültige auch außerhalb der angezeigten 100 suchen
  const validCheck = checks.find((x) => !x.cancelled_at) || (checks.length && checksTruncated ? await env.DB.prepare('SELECT * FROM driver_license_checks WHERE driver_id=? AND cancelled_at IS NULL ORDER BY checked_on DESC, created_at DESC, rowid DESC LIMIT 1').bind(id).first() : null);
  const sm = await settingsMap(env); const c = cfg(sm);
  const downloads = (await env.DB.prepare(`SELECT t.id, t.downloaded_on, t.evidence, t.note, t.cancelled_at, t.cancel_reason, u.display_name AS created_by_name FROM tacho_downloads t LEFT JOIN users u ON u.id=t.created_by WHERE t.driver_id=? ORDER BY t.downloaded_on DESC LIMIT ?`).bind(id, DRIVER_HIST_MAX + 1).all()).results;
  const downloadsTruncated = downloads.length > DRIVER_HIST_MAX; if (downloadsTruncated) downloads.length = DRIVER_HIST_MAX;
  const hasCard = docs.some((x) => !x.superseded && x.kind === 'fahrerkarte');
  // stornierte Auslesungen bleiben im Verlauf, zählen aber nicht für die Frist (18.10.2026) – und nicht als „Auslesung vorhanden“ (wie Übersicht)
  const valid = downloads.find((x) => !x.cancelled_at);
  const tacho = hasCard || valid ? { ...tachoStatus(valid ? valid.downloaded_on : null, TACHO_RULE.card_days, berlinDate(), warnDaysOf(sm)), rule: TACHO_RULE } : null;
  const vehicles = d.user_id ? (await env.DB.prepare(`SELECT v.id, v.plate FROM driver_vehicles dv JOIN vehicles v ON v.id=dv.vehicle_id WHERE dv.user_id=? AND (dv.valid_to IS NULL OR dv.valid_to > ?)`).bind(d.user_id, nowIso()).all()).results : [];
  // Fahrer selbst: Kontrollverlauf ohne Vermerk/Prüfende der Leitung (wie der interne Vermerk der Akte; App zeigt ihn nur der Leitung, 19.10.2026)
  const checksOut = isMgr(user) ? checks : checks.map(({ note, checked_by, checked_by_name, ...r }) => r);
  // ebenso Bemerkung/Erfassende der Auslesungen und Erfassende der Nachweise (20.10.2026: Fahrer sah den Vermerk der Leitung)
  const dlOut = isMgr(user) ? downloads : downloads.map(({ note, created_by_name, ...r }) => r);
  const docsOut = isMgr(user) ? docs : docs.map(({ created_by, created_by_name, ...r }) => r);
  return { driver: d, documents: docsOut, license_checks: checksOut, license_checks_truncated: checksTruncated, vehicles, tacho, tacho_downloads: dlOut, tacho_downloads_truncated: downloadsTruncated, history_max: DRIVER_HIST_MAX, status: withTacho(driverStatus(docs, validCheck, berlinDate(), c), tacho), settings: c };
}

export async function createDriver(env, user, envName, body) {
  if (!isMgr(user)) throw forbidden();
  const name = str(body.display_name, { required: true, max: 120, field: 'Name' });
  const userId = await validLinkedUser(env, envName, body.user_id);
  const id = uuid(); const now = nowIso();
  const pno = str(body.personnel_no, { max: 40, field: 'Personalnummer' });
  // Personalnummer je Umgebung unter aktiven Fahrern eindeutig (Schreibweise wie beim Auslesungen-Import) – Doppelklick/parallel ergab
  // sonst zwei Fahrer, und der Import übersprang danach jede Zeile „Fahrer nicht eindeutig“ (17.10.2026)
  // Vorprüfung mit derselben Vergleichsregel wie der Auslesungen-Import (`pnoKey`: ohne führende Nullen, Groß-/Kleinschreibung auch Ä/Д);
  // die SQL-Bedingung unten bleibt als Schutz gegen gleichzeitiges Anlegen (23.10.2026: „123“/„00123“ und „ä-7“/„Ä-7“ wurden zwei Fahrer)
  const others = (await env.DB.prepare('SELECT id, display_name, personnel_no FROM drivers WHERE environment=? AND active=1').bind(envName).all()).results;
  if (pno && others.some((x) => x.personnel_no && pnoKey(x.personnel_no) === pnoKey(pno))) throw conflict('duplicate_personnel_no', 'Diese Personalnummer ist bereits einem aktiven Fahrer zugeordnet.');
  // gleichnamige aktive Fahrer nur als Hinweis (gleiche Namen sind möglich) – wie `duplicate_plates` bei Fahrzeugen
  const duplicateNames = others.filter((x) => normName(x.display_name) === normName(name)).map((x) => ({ id: x.id, display_name: x.display_name, personnel_no: x.personnel_no }));
  // Wiedereinstellung (Backlog 191): ausgeschiedene Akte mit gleicher Personalnummer (pnoKey) oder gleichem Namen – die App fragt nach
  // (`check_inactive`), damit nicht still eine zweite Akte entsteht (Führerschein-Nachweise/Auslesungen blieben in der alten, die danach
  // wegen der Personalnummer nicht mehr reaktivierbar war); ohne Schalter (Import, Integrationen) wie bisher
  if (body.check_inactive && !body.confirm_inactive) {
    const inact = (await env.DB.prepare('SELECT id, display_name, personnel_no FROM drivers WHERE environment=? AND active=0').bind(envName).all()).results
      .filter((x) => (pno && x.personnel_no && pnoKey(x.personnel_no) === pnoKey(pno)) || normName(x.display_name) === normName(name));
    if (inact.length) throw conflict('inactive_match', 'Es gibt eine ausgeschiedene Fahrerakte mit gleicher Personalnummer oder gleichem Namen – bei Wiedereinstellung besser diese reaktivieren.', { matches: inact.slice(0, 5) });
  }
  let r;
  try {
    r = await env.DB.prepare(`INSERT INTO drivers(id,environment,display_name,personnel_no,site,user_id,active,note,created_by,created_at,updated_at) SELECT ?1,?2,?3,?4,?5,?6,1,?7,?8,?9,?10
      WHERE ?4 IS NULL OR NOT EXISTS (SELECT 1 FROM drivers x WHERE x.environment=?2 AND x.active=1 AND lower(trim(x.personnel_no))=lower(?4))`)
      .bind(id, envName, name, pno, str(body.site, { max: 60, field: 'Standort' }), userId, str(body.note, { max: 1000, field: 'Bemerkung' }), user.id, now, now).run();
  } catch (e) { if (String(e.message).includes('UNIQUE')) throw await linkedConflict(env, userId); throw e; }
  if (!r.meta || r.meta.changes !== 1) throw conflict('duplicate_personnel_no', 'Diese Personalnummer ist bereits einem aktiven Fahrer zugeordnet.');
  await audit(env, user.id, 'driver.create', id, { name, environment: envName, ...(pno ? { personnel_no: pno } : {}), ...(duplicateNames.length ? { duplicate_names: duplicateNames.length } : {}) });
  return { id, duplicate_names: duplicateNames };
}

// Konten, die schon einer Fahrerakte zugeordnet sind (alle Umgebungen, aktiv/inaktiv – der eindeutige Index idx_drivers_user gilt global);
// die App blendet sie in der Kontoauswahl aus, sonst endete das Speichern mit 409 (Backlog 101, 20.10.2026)
export async function linkedUserIds(env) {
  return (await env.DB.prepare('SELECT user_id FROM drivers WHERE user_id IS NOT NULL').all()).results.map((r) => r.user_id);
}

// Konto schon verknüpft: welche Akte (oft eine ausgeschiedene, Backlog 191) – App nennt sie, statt nur „bereits zugeordnet“
async function linkedConflict(env, userId) {
  const d = userId ? await env.DB.prepare('SELECT id, display_name, active, environment FROM drivers WHERE user_id=?').bind(userId).first() : null;
  return conflict('duplicate', 'Dieses App-Konto ist bereits einem Fahrer zugeordnet.', d ? { linked_driver: { id: d.id, display_name: d.display_name, active: !!d.active, environment: d.environment } } : undefined);
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
  // Formular aus älterer Ansicht: nur auf dem gelesenen Stand speichern (17.10.2026: machte eine zwischenzeitliche Deaktivierung still rückgängig)
  const expected = body.expected_updated_at !== undefined && body.expected_updated_at !== null && body.expected_updated_at !== '' ? str(body.expected_updated_at, { max: 40, field: 'Stand' }) : null;
  if (expected && expected !== d.updated_at) throw conflict('version_conflict', 'Fahrerakte wurde zwischenzeitlich geändert. Bitte neu laden.');
  const f = {
    display_name: body.display_name !== undefined ? str(body.display_name, { required: true, max: 120, field: 'Name' }) : d.display_name,
    personnel_no: body.personnel_no !== undefined ? str(body.personnel_no, { max: 40, field: 'Personalnummer' }) : d.personnel_no,
    site: body.site !== undefined ? str(body.site, { max: 60, field: 'Standort' }) : d.site,
    user_id: body.user_id !== undefined ? await validLinkedUser(env, envName, body.user_id) : d.user_id,
    active: body.active === undefined ? d.active : (flag(body.active, 'Aktiv', !!d.active) ? 1 : 0),
    note: body.note !== undefined ? str(body.note, { max: 1000, field: 'Bemerkung' }) : d.note,
  };
  // Personalnummer: gleiche Vergleichsregel wie beim Anlegen (pnoKey), vor dem Schreiben (23.10.2026)
  if ((body.personnel_no !== undefined || body.active !== undefined) && f.active === 1 && f.personnel_no) {
    const others = (await env.DB.prepare('SELECT personnel_no FROM drivers WHERE environment=? AND active=1 AND id<>? AND personnel_no IS NOT NULL').bind(d.environment || envName, id).all()).results;
    if (others.some((x) => pnoKey(x.personnel_no) === pnoKey(f.personnel_no))) throw conflict('duplicate_personnel_no', 'Diese Personalnummer ist bereits einem aktiven Fahrer zugeordnet.');
  }
  try {
    // nur mitgesendete Felder schreiben (17.10.2026: gleichzeitige Änderungen verschiedener Felder gingen sonst verloren)
    const cols = Object.keys(f).filter((k) => body[k] !== undefined && k !== 'expected_updated_at');
    // Personalnummer bleibt unter aktiven Fahrern eindeutig (auch beim Wieder-Aktivieren), Prüfung in derselben Anweisung
    const pnoCheck = cols.includes('personnel_no') || cols.includes('active');
    if (cols.length) {
      // WHERE sieht die alten Spaltenwerte – neue Werte daher als Parameter (unveränderte Spalte: aktueller Wert)
      const nAct = cols.includes('active') ? String(f.active) : 'drivers.active';
      const nPno = cols.includes('personnel_no') ? '?' : 'drivers.personnel_no';
      const pBind = cols.includes('personnel_no') ? [f.personnel_no, f.personnel_no] : [];
      const r = await env.DB.prepare(`UPDATE drivers SET ${cols.map((k) => `${k}=?`).join(', ')}, updated_at=? WHERE id=? ${expected ? 'AND updated_at=?' : ''}
        ${pnoCheck ? `AND NOT (${nAct}=1 AND ${nPno} IS NOT NULL AND EXISTS (SELECT 1 FROM drivers x WHERE x.environment=drivers.environment AND x.active=1 AND x.id<>drivers.id AND lower(trim(x.personnel_no))=lower(trim(${nPno}))))` : ''}`)
        .bind(...cols.map((k) => f[k]), laterIso(d.updated_at), id, ...(expected ? [d.updated_at] : []), ...pBind).run();
      if (expected && (!r.meta || r.meta.changes !== 1)) {
        const now2 = await env.DB.prepare('SELECT updated_at FROM drivers WHERE id=?').bind(id).first();
        if (!now2 || now2.updated_at !== d.updated_at) throw conflict('version_conflict', 'Fahrerakte wurde zwischenzeitlich geändert. Bitte neu laden.');
      }
      if (pnoCheck && (!r.meta || r.meta.changes !== 1)) throw conflict('duplicate_personnel_no', 'Diese Personalnummer ist bereits einem aktiven Fahrer zugeordnet.');
    }
  } catch (e) { if (String(e.message).includes('UNIQUE')) throw await linkedConflict(env, f.user_id); throw e; }
  // alt → neu nur der tatsächlich geänderten Felder (22.10.2026: vorher nur Feldnamen inkl. expected_updated_at – alte Werte verloren);
  // verknüpftes App-Konto als Name (eine Abfrage nur bei Kontowechsel), Bemerkung gekürzt
  const changed = {};
  for (const k of Object.keys(f)) {
    if (body[k] === undefined) continue;
    let a0 = d[k] ?? null; let b0 = f[k] ?? null;
    if (k === 'active') { a0 = !!a0; b0 = !!b0; }
    if (a0 === b0) continue;
    if (k === 'note') { a0 = a0 && cutText(a0, 200); b0 = b0 && cutText(b0, 200); }
    changed[k === 'user_id' ? 'account' : k] = { from: a0, to: b0 };
  }
  if (changed.account) {
    const ids = [changed.account.from, changed.account.to].filter(Boolean);
    const names = new Map((await env.DB.prepare('SELECT id, display_name FROM users WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids)).all()).results.map((r) => [r.id, r.display_name]));
    changed.account = { from: changed.account.from ? names.get(changed.account.from) || changed.account.from : null, to: changed.account.to ? names.get(changed.account.to) || changed.account.to : null };
  }
  if (Object.keys(changed).length) await audit(env, user.id, 'driver.update', id, { changed });
  // Akte auf „ausgeschieden“ gesetzt, verknüpftes App-Konto aber weiter aktiv bzw. Fahrzeug weiter zugeordnet (Backlog 190, Teilagent
  // „Fahrer verlässt das Unternehmen“): Hinweis statt stiller Weiterarbeit (Push, Kontrollen, Meldungen gingen weiter); nichts automatisch geändert
  if (changed.active && changed.active.to === false && f.user_id) {
    const u = await env.DB.prepare(`SELECT u.display_name, u.active, (SELECT COUNT(*) FROM driver_vehicles dv WHERE dv.user_id=u.id AND (dv.valid_to IS NULL OR dv.valid_to > ?)) AS n FROM users u WHERE u.id=?`).bind(nowIso(), f.user_id).first();
    if (u && (u.active || u.n)) return { ok: true, ...(u.active ? { account_still_active: { name: u.display_name } } : {}), ...(u.n ? { open_assignments: u.n } : {}) };
  }
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
  // Neuer Nachweis gleicher Art (außer Unterweisung/Sonstiges) ersetzt den bisherigen – Historie bleibt erhalten. Ein nachgetragener **älterer**
  // Nachweis (früheres „gültig bis“ bzw. – ohne – früheres Ausstellungsdatum als ein aktueller) wird nur als Verlauf gespeichert (17.10.2026;
  // vorher löste die alte Karte die neue ab → Akte „abgelaufen“, Agent „Nicht einsetzen“). Prüfung und Schreiben in einem Stapel.
  const single = ['fuehrerschein', 'fahrerkarte', 'code95'].includes(kind);
  const newerExists = `EXISTS (SELECT 1 FROM driver_documents x WHERE x.driver_id=?2 AND x.kind=?3 AND x.superseded=0 AND (
      (x.valid_until IS NOT NULL AND ?8 IS NOT NULL AND x.valid_until > ?8)
      OR ((x.valid_until IS NULL OR ?8 IS NULL) AND ?7 IS NOT NULL AND COALESCE(x.issued_on, ${berlinDaySql('x.created_at')}) > ?7)))`;
  stmts.push(env.DB.prepare(`INSERT INTO driver_documents(id,driver_id,kind,title,number,license_classes,issued_on,valid_until,evidence,superseded,created_by,created_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,${single ? `CASE WHEN ${newerExists} THEN 1 ELSE 0 END` : '0'},?10,?11)`)
    .bind(docId, id, kind, (str(body.title, { max: 120, field: 'Bezeichnung' }) || null)?.normalize('NFC') ?? null, str(body.number, { max: 40, field: 'Nummer' }), kind === 'fuehrerschein' ? str(body.license_classes, { max: 60, field: 'Klassen' }) : null, issued, valid, evidence, user.id, now));
  if (single) stmts.push(env.DB.prepare(`UPDATE driver_documents SET superseded=1 WHERE driver_id=?1 AND kind=?2 AND superseded=0 AND id<>?3
      AND (SELECT superseded FROM driver_documents WHERE id=?3)=0`).bind(id, kind, docId));
  await env.DB.batch(stmts);
  const older = single && (await env.DB.prepare('SELECT superseded FROM driver_documents WHERE id=?').bind(docId).first()).superseded === 1;
  await audit(env, user.id, 'driver.document', id, { kind, valid_until: valid, ...(older ? { history_only: true } : {}) });
  return { id: docId, ...(older ? { older_than_current: true } : {}) };
}

// Nachweis stornieren (Tippfehler, falsche Person): bleibt mit Begründung im Verlauf, zählt nicht mehr. War er der gültige Nachweis einer
// Einzelart (Führerschein/Fahrerkarte/Code 95), gilt wieder der neueste verbliebene – im selben Stapel (19.10.2026).
export async function cancelDriverDocument(env, user, envName, id, docId, body = {}) {
  if (!isMgr(user)) throw forbidden();
  await loadDriver(env, user, envName, id);
  const reason = str(body.reason, { required: true, max: 300, field: 'Begründung' });
  if (reason.length < 3) throw bad('validation', 'Begründung ist zu kurz.');
  const d = await env.DB.prepare('SELECT id, kind, valid_until, superseded, cancelled_at FROM driver_documents WHERE id=? AND driver_id=?').bind(str(docId, { max: 40 }), id).first();
  if (!d) throw notFound('Nachweis nicht gefunden.');
  if (d.cancelled_at) return { ok: true, duplicate: true };
  const now = nowIso();
  const single = ['fuehrerschein', 'fahrerkarte', 'code95'].includes(d.kind);
  // Nachfolger nach derselben Regel wie beim Erfassen (newerExists): beide mit „gültig bis“ → späteres; sonst späteres Ausstellungsdatum
  // (ohne: Berliner Erfassungstag). Vorher zog die Sortierung jeden Nachweis mit Ablaufdatum vor – nach dem Storno galt wieder der alte
  // Führerschein statt des neueren ohne Ablaufdatum (20.10.2026).
  let pick = null;
  if (single) {
    const rest = (await env.DB.prepare('SELECT id, valid_until, issued_on, created_at FROM driver_documents WHERE driver_id=? AND kind=? AND cancelled_at IS NULL AND id<>?').bind(id, d.kind, d.id).all()).results;
    const day = (x) => x.issued_on || berlinDate(x.created_at);
    const newer = (a, b) => (a.valid_until && b.valid_until && a.valid_until !== b.valid_until ? a.valid_until > b.valid_until
      : day(a) !== day(b) ? day(a) > day(b) : String(a.created_at) > String(b.created_at));
    pick = rest.reduce((m, x) => (!m || newer(x, m) ? x : m), null);
  }
  const [r] = await env.DB.batch([
    env.DB.prepare('UPDATE driver_documents SET superseded=2, cancelled_at=?, cancelled_by=?, cancel_reason=? WHERE id=? AND cancelled_at IS NULL').bind(now, user.id, reason, d.id),
    ...(pick ? [env.DB.prepare(`UPDATE driver_documents SET superseded=0 WHERE id=?3 AND cancelled_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM driver_documents WHERE driver_id=?1 AND kind=?2 AND superseded=0)`).bind(id, d.kind, pick.id)] : []),
  ]);
  if (!(r.meta && r.meta.changes)) return { ok: true, duplicate: true };
  await audit(env, user.id, 'driver.document_cancel', id, { kind: d.kind, valid_until: d.valid_until, reason });
  return { ok: true };
}

// Führerscheinkontrolle stornieren (Tippfehler im Datum/Ergebnis): bleibt im Verlauf mit Begründung, zählt nicht mehr; danach gilt die
// neueste verbliebene Kontrolle (20.10.2026, Backlog 99 – wie Nachweise/Auslesungen)
export async function cancelLicenseCheck(env, user, envName, id, checkId, body = {}) {
  if (!isMgr(user)) throw forbidden();
  await loadDriver(env, user, envName, id);
  const reason = str(body.reason, { required: true, max: 300, field: 'Begründung' });
  if (reason.length < 3) throw bad('validation', 'Begründung ist zu kurz.');
  const c = await env.DB.prepare('SELECT id, checked_on, result, cancelled_at FROM driver_license_checks WHERE id=? AND driver_id=?').bind(str(checkId, { max: 40 }), id).first();
  if (!c) throw notFound('Kontrolle nicht gefunden.');
  if (c.cancelled_at) return { ok: true, duplicate: true };
  const r = await env.DB.prepare('UPDATE driver_license_checks SET cancelled_at=?, cancelled_by=?, cancel_reason=? WHERE id=? AND cancelled_at IS NULL').bind(nowIso(), user.id, reason, c.id).run();
  if (!(r.meta && r.meta.changes)) return { ok: true, duplicate: true };
  await audit(env, user.id, 'driver.license_check_cancel', id, { checked_on: c.checked_on, result: c.result, reason });
  return { ok: true };
}

export async function addLicenseCheck(env, user, envName, id, body) {
  if (!isMgr(user)) throw forbidden();
  await loadDriver(env, user, envName, id);
  const on = date(body.checked_on, 'Kontrolldatum', { required: true, notFuture: true });
  const result = oneOf(body.result, CHECK_RESULTS, 'Ergebnis');
  const note = str(body.note, { max: 500, field: 'Bemerkung' });
  if (result !== 'in_ordnung' && !note) throw bad('validation', 'Bei Mängeln oder nicht vorgelegtem Führerschein bitte Vermerk angeben.');
  const cid = uuid();
  // gleiche Kontrolle (Tag, Ergebnis, Vermerk) nur einmal – Doppelklick/parallel ergab zwei Zeilen (17.10.2026); verglichen wird nur mit der
  // neuesten Kontrolle desselben Tages (20.10.2026: „in Ordnung“ nach „nicht vorgelegt“ am selben Tag wurde als Dublette abgewiesen)
  const r = await env.DB.prepare(`INSERT INTO driver_license_checks(id,driver_id,checked_on,result,checked_by,note,created_at) SELECT ?1,?2,?3,?4,?5,?6,?7
    WHERE NOT EXISTS (SELECT 1 FROM (SELECT result, note FROM driver_license_checks WHERE driver_id=?2 AND checked_on=?3 AND cancelled_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT 1) x
      WHERE x.result=?4 AND x.note IS ?6)`).bind(cid, id, on, result, user.id, note, nowIso()).run();
  if (!r.meta || r.meta.changes !== 1) throw conflict('duplicate', 'Diese Kontrolle ist bereits erfasst.');
  await audit(env, user.id, 'driver.license_check', id, { checked_on: on, result });
  return { id: cid };
}

// Befundschlüssel je Thema: bis 80 Zeichen unverändert (bestehende Befunde behalten ihren Schlüssel); längere Titel (bis 120) mit
// Prüfsumme über den vollen Titel – vorher fielen zwei Themen mit gleichem Anfang in einen Befund (Backlog 100, 20.10.2026)
export function topicKey(topic) {
  const t = String(topic || '');
  if (t.length <= 80) return t;
  let h = 0x811c9dc5; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return t.slice(0, 71) + '#' + h.toString(16).padStart(8, '0');
}
// Anzeige: höchstens 80 Zeichen, gekürzt mit „…“ (vorher ohne Kennzeichnung abgeschnitten)
export function shortTitle(title) {
  const t = String(title || '').trim().replace(/\s+/g, ' ');
  return t.length > 80 ? cutText(t, 79).trimEnd() + '…' : t;
}

// Für den Fuhrparkagenten: abgelaufene/ablaufende Nachweise, fällige/fehlerhafte Führerscheinkontrollen (nur aktive Fahrer)
export async function driverFindings(env, environment, settings = null) {
  const list = await listDrivers(env, { role: 'owner' }, environment, {}, settings);
  const out = [];
  const L = { fuehrerschein: 'Führerschein', fahrerkarte: 'Fahrerkarte', code95: 'Code 95 / Weiterbildung', unterweisung: 'Unterweisung', sonstiges: 'Nachweis' };
  for (const d of list) {
    for (const i of d.status.items) {
      // je Thema ein Befund (Unterweisung/Sonstiges mit Titel; vorher fasste der Schlüssel Fahrer|Art mehrere abgelaufene Themen zu einem zusammen, 17.10.2026)
      const subject = `${d.id}|${i.kind}${i.topic ? '|' + topicKey(i.topic) : ''}`;
      if (i.status === 'abgelaufen') out.push({ code: 'DRIVER_DOC_EXPIRED', subject, severity: i.kind === 'fuehrerschein' || i.kind === 'fahrerkarte' ? 'kritisch' : 'handeln', requires_decision: 1,
        ...fm('DRIVER_DOC_EXPIRED', { name: d.display_name, ddoc: L[i.kind] ? i.kind : 'sonstiges', topic: i.title || null, date: i.valid_until }), next_action: 'Nicht einsetzen, bis ein gültiger Nachweis vorliegt; neuen Nachweis erfassen.' });
      else if (i.status === 'laeuft_ab') out.push({ code: 'DRIVER_DOC_EXPIRES_SOON', subject, severity: 'hinweis', requires_decision: 0,
        ...fm('DRIVER_DOC_EXPIRES_SOON', { name: d.display_name, ddoc: L[i.kind] ? i.kind : 'sonstiges', topic: i.title || null, date: i.valid_until, days: i.days }), next_action: 'Verlängerung rechtzeitig veranlassen.' });
    }
    if (d.status.check.status === 'faellig') out.push({ code: 'LICENSE_CHECK_DUE', subject: `${d.id}|fs_kontrolle`, severity: 'handeln', requires_decision: 0,
      ...fm('LICENSE_CHECK_DUE', { name: d.display_name, last: d.status.check.last }), next_action: 'Original-Führerschein vorlegen lassen und Kontrolle erfassen.' });
    // Vorwarnung wie in der Fahrerakte („bald fällig“ = Hinweis) – bis 22.10.2026 meldete der Agent erst ab Fälligkeit
    else if (d.status.check.status === 'bald') out.push({ code: 'LICENSE_CHECK_DUE_SOON', subject: `${d.id}|fs_kontrolle`, severity: 'hinweis', requires_decision: 0,
      ...fm('LICENSE_CHECK_DUE_SOON', { name: d.display_name, last: d.status.check.last, date: d.status.check.due, days: d.status.check.days }), next_action: 'Termin für die Führerscheinkontrolle vereinbaren.' });
    else if (d.status.check.status === 'mangel') out.push({ code: 'LICENSE_CHECK_FAILED', subject: `${d.id}|fs_kontrolle`, severity: 'kritisch', requires_decision: 1,
      ...fm('LICENSE_CHECK_FAILED', { name: d.display_name, last: d.status.check.last }), next_action: 'Einsatz klären; Führerschein prüfen.' });
  }
  return out;
}

// Gesamtstatus schließt die Auslese-Frist der Fahrerkarte ein – einheitlich für CSV, Liste, Akte und Startseite (20.10.2026: Liste/Akte
// zeigten „in Ordnung“, die CSV „kritisch · Auslesung: überfällig“). `overall_docs` = Stand ohne Auslesung (Agent meldet die Auslesung getrennt).
const RANK = { ok: 0, hinweis: 1, kritisch: 2 };
export function tachoOverall(base, tc) {
  const t = tc && tc.status === 'ueberfaellig' ? 'kritisch' : tc && (tc.status === 'bald' || tc.status === 'keine') ? 'hinweis' : 'ok';
  return RANK[t] > (RANK[base] ?? 0) ? t : base;
}
export function withTacho(status, tc) {
  return { ...status, overall_docs: status.overall, overall: tachoOverall(status.overall, tc), tacho_status: tc ? tc.status : null };
}

// Fristenliste als CSV (nur Inhaber/Fuhrparkleitung; Aufruf wird protokolliert). Nur gespeicherte Daten, leere Zelle = nicht erfasst.
export function driversCsv(list, tachoByDriver, cell) {
  const DOV = { ok: 'in Ordnung', hinweis: 'Hinweis', kritisch: 'kritisch' };
  const DCK = { ok: 'aktuell', faellig: 'fällig', bald: 'bald fällig', fehlt: 'keine erfasst', mangel: 'Mangel' };
  const TST = { ueberfaellig: 'überfällig', bald: 'bald fällig', ok: 'in Ordnung', keine: 'keine erfasst' };
  const DL = { fuehrerschein: 'Führerschein', fahrerkarte: 'Fahrerkarte', code95: 'Code 95', unterweisung: 'Unterweisung', sonstiges: 'Nachweis' };
  // Status mit allen Gründen (19.10.2026: „Hinweis“ ohne Grund, z. B. kein Führerschein erfasst oder Nachweis läuft ab)
  const reasons = (d, tc) => [
    ...d.status.items.filter((i) => i.status === 'abgelaufen' || i.status === 'laeuft_ab').map((i) => `${DL[i.kind] || 'Nachweis'}${i.title ? ' ' + i.title : ''} ${i.status === 'abgelaufen' ? 'abgelaufen' : 'läuft ab'}`),
    ...(d.status.has_license ? [] : ['kein Führerschein erfasst']),
    ...(d.status.check.status !== 'ok' ? ['Kontrolle ' + DCK[d.status.check.status]] : []),
    ...(tc && tc.status !== 'ok' ? ['Auslesung: ' + TST[tc.status]] : []),
  ];
  const overall = (d, tc) => tachoOverall(d.status.overall_docs || d.status.overall, tc);
  const lines = ['﻿Name;Personalnummer;Standort;Führerschein gültig bis;Fahrerkarte gültig bis;Code 95 gültig bis;Letzte Führerscheinkontrolle;Ergebnis;Kontrolle fällig;Letzte Auslesung Fahrerkarte;Auslesung spätestens;Status'];
  for (const d of list) {
    const v = (k) => (d.status.items.find((i) => i.kind === k) || {}).valid_until || '';
    const tc = tachoByDriver.get(d.id);
    lines.push([cell(d.display_name), cell(d.personnel_no), cell(d.site), v('fuehrerschein'), v('fahrerkarte'), v('code95'), d.status.check.last || '', CHECK_RESULT_DE[d.status.check.result] || d.status.check.result || '',
      d.status.check.due || '', tc ? tc.last || '' : '', tc ? tc.due || '' : '', cell([DOV[overall(d, tc)], ...reasons(d, tc)].join(' · '))].join(';'));
  }
  return lines.join('\r\n') + '\r\n';
}
