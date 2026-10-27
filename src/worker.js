// [CLAUDE] Cevik Fuhrpark – Worker-Einstieg: Router, Sicherheit, Selbstmigration, Cron
import { icsLang } from '../public/ics-texts.js';
import { plateCmp, b64urlDecode, json, errorResponse, readJson, HttpError, forbidden, bad, notFound, nowIso, str, timingSafeEqual, uuid, rateLimit, berlinDateTime, berlinDate, icsCalendar, csvResponseDatesDe, testMasterReadonly, QUIET_TIME, siteSuffix, pointDec, cleanText } from './util.js';
import * as auth from './auth.js';
import * as totp from './totp.js';
import { personExport } from './privacy.js';
import { SETTINGS_KEYS, SETTING_DEFAULTS, settingPairs, storedInvalid } from './settings.js';
import * as cases from './cases.js';
import * as veh from './vehicles.js';
import * as vnotes from './vnotes.js';
import * as emergency from './emergency.js';
import { runFleetAgent, masterPanel, decideMasterItem } from './agent.js';
import { getVapid } from './push.js';
import { retryFailedPush, releaseQuietPush, PUSH_MAX_SENDS, notifyUsers, mutableKindsFor, parseMuted, currentLangText, nt } from './notify.js';
import { MIGRATIONS } from './schema.js';
import { integrationRouter } from './integration.js';
import * as tires from './tires.js';
import * as stock from './stock.js';
import * as fines from './fines.js';
import * as drivers from './drivers.js';
import * as tacho from './tacho.js';
import * as reports from './reports.js';
import { exportBackup } from './backup.js';
// Hinweisliste: neueste 100 je Abruf (eine Zeile mehr gelesen → truncated); Zähler immer über alle
export const NOTIF_MAX = 100;
import * as maint from './maintenance.js';
// Lager-CSV: Auswahl der Liste in angezeigter Reihenfolge (unbekannte Kennungen werden übergangen)
const stockCsvResponse = (items, envName) => new Response(stock.stockCsv(items, maint.csvCell), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-lager_${envName}_${berlinDate()}.csv"` } });
const stockSel = (items, ids) => { const pos = new Map(ids.slice(0, 5000).map((x, i) => [x, i])); return items.filter((i) => pos.has(i.id)).sort((a, b) => pos.get(a.id) - pos.get(b.id)); };
import { recordUsage, usageReport } from './usage.js';
import { readiness } from './readiness.js';
import * as rates from './rates.js';
import { dataQuality, myInspectionsWithoutResult } from './quality.js';
import * as telem from './telematics.js';
import * as contracts from './contracts.js';
import * as claims from './claims.js';

// Höchstzahl Zeilen der Vorgangs-CSV (bei Erreichen: Header x-cfp-truncated)
const CASES_CSV_MAX = 5000;
// Bußgelder: CSV/Fristenkalender aus den jüngsten 5000 Schreiben (Liste: 500)
const FINES_EXPORT_MAX = 5000;

// Angemeldete API-Aufrufe für die Nutzungsstatistik (nur Umgebung, keine Person)
const usageEnv = new WeakMap();
const usageAction = new WeakMap(); // Befehlsname bei …/commands (z. B. receive, add_part) – keine Inhalte

const migratedDbs = new WeakSet();
export async function ensureSchema(env) {
  if (migratedDbs.has(env.DB)) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)').run();
  const done = new Set((await env.DB.prepare('SELECT id FROM _migrations').all()).results.map((r) => r.id));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    try {
      await env.DB.batch([
        ...m.statements.map((s) => env.DB.prepare(s)),
        env.DB.prepare('INSERT INTO _migrations(id, applied_at) VALUES (?, ?)').bind(m.id, nowIso()),
      ]);
    } catch (e) {
      // gleichzeitig hat eine andere Instanz dieselbe Migration eingespielt (Stapel ist atomar; hier z. B. „duplicate column“ oder
      // UNIQUE _migrations.id) – dann weiter statt 500 für diesen Aufruf (17.10.2026); sonst echter Fehler
      if (!(await env.DB.prepare('SELECT 1 AS x FROM _migrations WHERE id=?').bind(m.id).first())) throw e;
    }
  }
  migratedDbs.add(env.DB);
}

// gleiche CSP wie in public/_headers (statische Dateien werden ohne Worker ausgeliefert)
export const CSP = "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'geolocation=(), microphone=()',
  'strict-transport-security': 'max-age=31536000',
};

function withHeaders(res, extra = {}) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries({ ...SECURITY_HEADERS, ...extra })) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

// Schutz gegen CSRF: schreibende API-Aufrufe brauchen eigenen Header und gleiche Herkunft
function checkCsrf(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  if (request.headers.get('x-cfp') !== '1') throw forbidden('Ungültige Anfrage (CSRF-Schutz).');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw forbidden('Ungültige Herkunft.');
}

function requireRole(user, roles) {
  if (!roles.includes(user.role)) throw forbidden();
}


// Gemeinsame Stammdaten ohne Trennung Test/Betrieb (Fahrzeuge, Prüftermine, km-Stände, Reifengrößen, Telematik-Zuordnung).
// Mit Einstellung „test_master_readonly“ = 1 dürfen Testkonten (außer Inhaber) sie nur lesen. Standard: aus (bisheriges Verhalten).
const SHARED_WRITE = [/^\/api\/vehicles$/, /^\/api\/vehicles\/import$/, /^\/api\/vehicles\/VIN:[A-Z0-9]+\/(spec|evaluation|active|maintenance|odometer|tires\/specs)$/,
  /^\/api\/maintenance\/import$/, /^\/api\/maintenance\/plan-batch$/, /^\/api\/maintenance\/create-batch$/, /^\/api\/maintenance\/recalls\/import$/, /^\/api\/maintenance\/[\w-]+\/(complete|plan)$/, /^\/api\/vehicles\/VIN:[A-Z0-9]+\/husp\/(HU|SP)\/(complete|plan|order)$/, /^\/api\/maintenance\/events\/[\w-]+\/result$/, /^\/api\/tires\/import$/, /^\/api\/telematics\/mappings$/,
  /^\/api\/vehicles\/VIN:[A-Z0-9]+\/contracts$/, /^\/api\/contracts\/[\w-]+(\/end)?$/, /^\/api\/odometer\/[\w-]+\/note$/];
async function guardSharedWrite(env, user, path, m) {
  if (m === 'GET' || user.role === 'owner' || user.environment !== 'test' || !SHARED_WRITE.some((r) => r.test(path))) return;
  if (await testMasterReadonly(env)) throw new HttpError(403, 'test_readonly', 'Testkonto: gemeinsame Stammdaten (Fahrzeuge, Prüftermine, km-Stände, Reifen, Verträge) sind nur lesbar – Einstellung des Inhabers.');
}

async function handleApi(request, env, ctx, url) {
  let path = url.pathname;
  try { path = decodeURIComponent(url.pathname); } catch { throw new HttpError(400, "bad_path", "Ungültiger Pfad."); }
  const m = request.method;
  // Integrations-API: nur Bearer-Token, keine Cookies – CSRF-Schutz entfällt dort (vorher lehnte er Aufrufe nach API.md ohne x-cfp mit 403 ab)
  if (!path.startsWith('/api/integration/')) checkCsrf(request);

  // schema = Nummer der letzten angewandten Migration (ensureSchema lief vorher) – zum Prüfen eines Deployments ohne Anmeldung
  if (path === '/api/health') {
    // Betriebsüberwachung ohne Anmeldung (22.10.2026): läuft der Fuhrparkagent im Betrieb (Cron alle 15 Min.)? Gleiche Regel wie die Anzeige
    // im Management-Panel: letzter Lauf ohne Fehler, beendet vor höchstens 75 Min., kein Lauf seit über 10 Min. unbeendet. Nur Zeitpunkte, keine Inhalte.
    const r = await env.DB.prepare("SELECT started_at, finished_at, error FROM agent_runs WHERE environment='production' ORDER BY started_at DESC LIMIT 1").first();
    const now = Date.now();
    const agentOk = !!r && !r.error && (r.finished_at ? now - Date.parse(r.finished_at) <= 75 * 60000 : now - Date.parse(r.started_at) <= 10 * 60000);
    return json({ ok: true, time: nowIso(), schema: MIGRATIONS[MIGRATIONS.length - 1].id.slice(0, 4), agent_ok: agentOk, agent_last_run: r ? (r.finished_at || r.started_at) : null });
  }

  // ---- Integration (Unternehmensbetriebssystem, n8n) per Bearer-Token ----
  if (path.startsWith('/api/integration/')) return integrationRouter(request, env, ctx, url);

  // ---- Öffentlich: Einrichtung, Einladung, Login ----
  if (path === '/api/setup/status' && m === 'GET') {
    const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first()).n;
    return json({ needs_setup: n === 0, setup_code_configured: !!env.SETUP_CODE });
  }
  if (path === '/api/setup' && m === 'POST') return json(await auth.setupFirstOwner(env, await readJson(request)));
  if (path.startsWith('/api/invite/') && m === 'GET') {
    const { row } = await auth.inviteInfo(env, path.split('/')[3]); // path ist bereits dekodiert (zweites decodeURIComponent → 500 bei „%“)
    // Backlog 381: Sprache der Person, wenn die Leitung sie beim Anlegen gewählt hat bzw. die Person eine andere als Deutsch eingestellt hat
    // (neuer Link nach vergessenem Passwort); sonst entscheidet wie bisher die Handysprache
    return json({ username: row.username, display_name: row.display_name, role: row.role, environment: row.environment, ...(row.language && (row.chosen_language || row.language !== 'de') ? { language: row.language } : {}) });
  }
  if (path === '/api/invite/accept' && m === 'POST') {
    const r = await auth.acceptInvite(env, request, await readJson(request), ctx);
    if (r.second_factor) return json({ second_factor: r.second_factor, challenge: r.challenge });
    return json({ user: r.user }, 200, { 'set-cookie': r.cookie });
  }
  if (path === '/api/login' && m === 'POST') {
    const r = await auth.login(env, request, await readJson(request), ctx);
    if (r.second_factor) return json({ second_factor: r.second_factor, challenge: r.challenge });
    return json({ user: r.user }, 200, { 'set-cookie': r.cookie });
  }
  if (path === '/api/login/totp' && m === 'POST') {
    const r = await auth.loginSecondFactor(env, request, await readJson(request), ctx);
    return json({ user: r.user, ...(r.recovery_left !== undefined ? { recovery_left: r.recovery_left } : {}) }, 200, { 'set-cookie': r.cookie });
  }

  // ---- Ab hier: angemeldet ----
  const user = await auth.getSessionUser(env, request);
  if (!user) throw new HttpError(401, 'unauthenticated', 'Bitte anmelden.');
  // Gerät mit mehreren Tabs: die App nennt bei Änderungen die Person, für die das Formular/der Postausgang gilt. Ist inzwischen eine andere
  // Person angemeldet, nichts unter deren Namen anlegen (18.10.2026: Meldungen von Anna gingen unter Bernds Namen raus)
  const claimedUser = request.headers.get('x-cfp-user');
  if (claimedUser && m !== 'GET' && m !== 'HEAD' && path !== '/api/logout' && claimedUser !== user.id) {
    throw new HttpError(409, 'user_mismatch', 'Auf diesem Gerät ist inzwischen eine andere Person angemeldet – nichts gespeichert. Bitte Seite neu laden.');
  }
  // Umgebung des Kontos inzwischen geändert (Test → Betrieb), Seite/Postausgang noch mit altem Stand: nichts in der neuen Umgebung anlegen
  // (21.10.2026: ein veralteter Tab sandte eine Test-Meldung nach dem Umstellen in den Betrieb). Inhaber wählt die Umgebung je Anfrage (x-cfp-env).
  const claimedEnv = request.headers.get('x-cfp-env-of');
  if (claimedEnv && m !== 'GET' && m !== 'HEAD' && path !== '/api/logout' && user.role !== 'owner' && claimedEnv !== user.environment) {
    throw new HttpError(409, 'env_mismatch', 'Die Umgebung dieses Kontos wurde inzwischen geändert – nichts gespeichert. Bitte Seite neu laden.');
  }
  // Zahlenformat der Eingabe nach der Oberflächensprache des sendenden Geräts, nicht nach der Kontosprache (23.10.2026: geteiltes
  // Werkstatt-Konto – ein Tablet stellt auf EN um, das andere zeigt DE, „1.250“ wurde still 1,25 €). Nicht aufzählbar: erscheint nicht in /api/me.
  const inputLang = request.headers.get('x-cfp-lang');
  if (['de', 'uk', 'en'].includes(inputLang)) Object.defineProperty(user, 'inputLang', { value: inputLang, enumerable: false });
  const envName = auth.effectiveEnv(user, request);
  usageEnv.set(request, envName);
  await guardSharedWrite(env, user, path, m);
  const { _session, ...me } = user;

  if (path === '/api/logout' && m === 'POST') return json({ ok: true }, 200, { 'set-cookie': await auth.logout(env, user, await readJson(request).catch(() => ({}))) });
  if (path === '/api/me' && m === 'GET') {
    const row = await env.DB.prepare('SELECT language, home_site, totp_enabled_at FROM users WHERE id=?').bind(user.id).first();
    return json({ user: { ...me, language: row.language, home_site: user.role === 'driver' ? null : row.home_site || null, totp_enabled: !!row.totp_enabled_at,
      // Testkonto mit „gemeinsame Stammdaten nur lesen“: App zeigt den Hinweis an der Akte (22.10.2026; vorher erst die Fehlermeldung beim Speichern)
      shared_readonly: user.role !== 'owner' && user.environment === 'test' && await testMasterReadonly(env) }, active_environment: envName });
  }
  if (path === '/api/me' && m === 'PATCH') {
    const b = await readJson(request);
    if (b.language && ['de', 'uk', 'en'].includes(b.language)) await env.DB.prepare('UPDATE users SET language=?, updated_at=? WHERE id=?').bind(b.language, nowIso(), user.id).run();
    // Standard-Standort (nur Anzeige-Voreinstellung der Filter, keine Berechtigung); Fahrer haben keine Standortfilter
    if (b.home_site !== undefined) {
      if (user.role === 'driver') throw forbidden();
      if (b.home_site !== null && typeof b.home_site !== 'string') throw bad('validation', 'Standort: ungültiger Wert.'); // Objekt → „[object Object]“ (17.10.2026)
      const hs = b.home_site === null ? '' : cleanText(b.home_site).trim(); // NFC wie alle Freitexte (22.10.2026: „Mu\u0308nchen“ passte zu keinem Standort)
      if (hs.length > 60) throw bad('validation', 'Standort: höchstens 60 Zeichen.');
      await env.DB.prepare('UPDATE users SET home_site=?, updated_at=? WHERE id=?').bind(hs || null, nowIso(), user.id).run();
    }
    return json({ ok: true });
  }
  // Auswahl „Standort“ (Fahrzeugstamm, Schreibweisen zusammengefasst) – z. B. für den Standard-Standort in „Mein Konto“
  if (path === '/api/sites' && m === 'GET') {
    if (user.role === 'driver') throw forbidden();
    return json({ sites: reports.siteSelection((await env.DB.prepare('SELECT site FROM vehicles').all()).results, null).options });
  }
  if (path === '/api/me/notify-prefs' && m === 'GET') {
    const row = await env.DB.prepare('SELECT push_muted, push_quiet_from, push_quiet_to FROM users WHERE id=?').bind(user.id).first();
    const kinds = mutableKindsFor(user.role);
    return json({ kinds, muted: parseMuted(row && row.push_muted).filter((k) => kinds.includes(k)), quiet: row && row.push_quiet_from ? { from: row.push_quiet_from, to: row.push_quiet_to } : null });
  }
  if (path === '/api/me/notify-prefs' && m === 'PUT') {
    // muted und quiet getrennt änderbar: fehlt ein Feld, bleibt der gespeicherte Wert (Häkchen ändern nicht die Ruhezeit und umgekehrt)
    const b = await readJson(request);
    const row = await env.DB.prepare('SELECT push_muted, push_quiet_from, push_quiet_to FROM users WHERE id=?').bind(user.id).first();
    // nur die Arten der eigenen Rolle ändern; gespeicherte andere (z. B. aus einer früheren Rolle) bleiben
    const kinds = mutableKindsFor(user.role); const stored = parseMuted(row && row.push_muted);
    const muted = 'muted' in b ? [...new Set([...(Array.isArray(b.muted) ? b.muted.filter((k) => kinds.includes(k)) : []), ...stored.filter((k) => !kinds.includes(k))])] : stored;
    let qf = row ? row.push_quiet_from : null; let qt = row ? row.push_quiet_to : null;
    if ('quiet' in b) {
      if (b.quiet === null || (b.quiet && !b.quiet.from && !b.quiet.to)) { qf = null; qt = null; } else {
        const q = b.quiet || {};
        if (!QUIET_TIME.test(String(q.from || '')) || !QUIET_TIME.test(String(q.to || ''))) throw bad('validation', 'Ruhezeit: Uhrzeit im Format HH:MM angeben (von und bis).');
        if (q.from === q.to) throw bad('validation', 'Ruhezeit: Beginn und Ende dürfen nicht gleich sein.');
        qf = q.from; qt = q.to;
      }
    }
    // nur die mitgesendeten Spalten schreiben (17.10.2026): die App sendet Häkchen und Ruhezeit getrennt – gleichzeitig gesendet ging sonst eine
    // Änderung verloren (beide Spalten aus dem gelesenen Stand zurückgeschrieben)
    const set = []; const vals = [];
    if ('muted' in b) { set.push('push_muted=?'); vals.push(muted.length ? JSON.stringify(muted) : null); }
    if ('quiet' in b) { set.push('push_quiet_from=?', 'push_quiet_to=?'); vals.push(qf, qt); }
    const after = set.length ? await env.DB.prepare(`UPDATE users SET ${set.join(', ')}, updated_at=? WHERE id=? RETURNING push_muted, push_quiet_from, push_quiet_to`).bind(...vals, nowIso(), user.id).first() : row;
    if ('quiet' in b && (qf !== (row && row.push_quiet_from) || qt !== (row && row.push_quiet_to))) {
      await auth.audit(env, user.id, 'user.push_quiet', user.id, { from: qf, to: qt });
      // Ruhezeit aus-/umgestellt: zurückgehaltene Pushs nicht bis zum alten Ende warten lassen (17.10.2026) – jetzt freigeben;
      // liegt „jetzt“ in der neuen Ruhezeit, hält die Zustellung sie bis zu deren Ende zurück
      const nowMs = env.__nowMs || Date.now(); const ni = new Date(nowMs).toISOString();
      const r = await env.DB.prepare(`UPDATE notifications SET push_hold_until=? WHERE user_id=? AND push_status='pending' AND push_hold_until > ?`).bind(ni, user.id, ni).run();
      if (r.meta && r.meta.changes) { const job = releaseQuietPush(env, nowMs, user.id); if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job; }
    }
    return json({ kinds, muted: parseMuted(after && after.push_muted), quiet: after && after.push_quiet_from ? { from: after.push_quiet_from, to: after.push_quiet_to } : null });
  }
  if (path === '/api/me/inspections-without-result' && m === 'GET') return json(await myInspectionsWithoutResult(env, user));
  if (path === '/api/me/vehicles' && m === 'GET') return json(await veh.myVehicles(env, user, envName));
  if (path === '/api/me/sessions' && m === 'GET') return json({ sessions: await auth.listOwnSessions(env, user), orphan_push_devices: await auth.orphanPushCount(env, user) });
  if (path === '/api/me/sessions/revoke-others' && m === 'POST') return json(await auth.revokeOtherSessions(env, user));
  if (path === '/api/me/known-devices' && m === 'GET') return json({ devices: await auth.listKnownDevices(env, user, request) });
  const kdm = path.match(/^\/api\/me\/known-devices\/([0-9a-f]{16})$/);
  if (kdm && m === 'DELETE') return json(await auth.forgetKnownDevice(env, user, request, kdm[1]));
  const sm = path.match(/^\/api\/me\/sessions\/([0-9a-f]{16})$/);
  if (sm && m === 'DELETE') return json(await auth.revokeOwnSession(env, user, sm[1]));
  // Zwei-Faktor-Anmeldung (freiwillig, eigenes Konto); Zurücksetzen nur durch den Inhaber
  if (path === '/api/me/totp' && m === 'GET') return json(await totp.totpStatus(env, user));
  if (path === '/api/me/totp/setup' && m === 'POST') return json(await totp.totpSetup(env, user, await readJson(request), auth.audit));
  if (path === '/api/me/totp/enable' && m === 'POST') return json(await totp.totpEnable(env, user, await readJson(request), auth.audit));
  if (path === '/api/me/totp/disable' && m === 'POST') return json(await totp.totpDisable(env, user, await readJson(request), auth.audit));
  if (path === '/api/me/totp/recovery-codes' && m === 'POST') return json(await totp.totpNewRecovery(env, user, await readJson(request), auth.audit));
  if (path === '/api/me/password' && m === 'POST') return json(await auth.changePassword(env, user, await readJson(request)));

  if (path === '/api/meta' && m === 'GET') {
    // workshops = aktive (Auswahl für Neues); workshops_all additiv mit `active` – Namen/Filter geschlossener Werkstätten (Backlog 192)
    const workshopsAll = (await env.DB.prepare('SELECT code, name, active FROM workshops').all()).results;
    const workshops = workshopsAll.filter((w) => w.active).map(({ code, name }) => ({ code, name }));
    let vapid = null;
    try { vapid = (await getVapid(env)).publicKey; } catch {}
    return json({ workshops, workshops_all: workshopsAll.map((w) => ({ code: w.code, name: w.name, active: !!w.active })), checklist: cases.CHECKLIST, checklist_version: cases.CHECKLIST_VERSION, priorities: cases.PRIORITIES,
      driveability: cases.DRIVEABILITY, statuses: cases.STATUSES, maintenance_kinds: veh.MAINT_KINDS, doc_kinds: veh.DOC_KINDS, tire_positions: tires.POSITIONS, tire_axles: tires.AXLES, tire_events: tires.TIRE_EVENTS, tire_winter_marks: tires.WINTER_MARKS, legal_min_tread_mm: tires.LEGAL_MIN_TREAD_MM, fine_kinds: fines.FINE_KINDS, fine_offenses: fines.OFFENSES, fine_statuses: fines.FINE_STATUSES, vapid_public_key: vapid, app_name: env.APP_NAME });
  }

  // Benutzer
  // unused_days = Einstellung „Konten ohne Anmeldung seit … Tagen melden“ (leer = aus, keine eigene Vorgabe) – nur für den Hinweis in der Ansicht
  if (path === '/api/users' && m === 'GET') {
    const list = await auth.listUsers(env, user);
    const ud = Math.floor(Number((await env.DB.prepare(`SELECT value FROM settings WHERE key='user_unused_days'`).first())?.value));
    return json({ users: list, unused_days: ud > 0 ? ud : null });
  }
  if (path === '/api/users' && m === 'POST') return json(await auth.createUser(env, user, await readJson(request)), 201);
  let mm;
  if ((mm = path.match(/^\/api\/users\/([\w-]+)$/)) && m === 'PATCH') return json(await auth.updateUser(env, user, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/users\/([\w-]+)\/invite$/)) && m === 'POST') return json(await auth.resetInvite(env, user, mm[1]));
  if ((mm = path.match(/^\/api\/users\/([\w-]+)\/totp-reset$/)) && m === 'POST') return json(await totp.totpReset(env, user, mm[1], auth.audit));
  if ((mm = path.match(/^\/api\/users\/([\w-]+)\/unlock$/)) && m === 'POST') return json(await auth.unlockUser(env, user, mm[1]));
  if ((mm = path.match(/^\/api\/users\/([\w-]+)\/revoke-sessions$/)) && m === 'POST') return json(await auth.revokeUserSessions(env, user, mm[1]));

  // Fahrzeuge
  if (path === '/api/vehicles' && m === 'GET') {
    const list = await veh.listVehicles(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv') {
      if (user.role === 'driver') throw forbidden();
      // Auswahl der Liste (Standort/Art/Verfügbarkeit/Suche) in angezeigter Reihenfolge – wie Druck und Vorgangs-CSV
      // (20.10.2026: Export enthielt bei Filter „Hamburg“ alle Fahrzeuge); ohne „ids“ der ganze Bestand
      const ids = url.searchParams.get('ids');
      const rows = ids === null ? [...list].sort((a, b) => plateCmp(a.plate, b.plate)) /* wie die Liste (Umlaute nicht ans Ende) */ : (() => { const pos = new Map(ids.split(',').slice(0, 2000).map((x, i) => [x, i]));
        return list.filter((v) => pos.has(v.id)).sort((a, b) => pos.get(a.id) - pos.get(b.id)); })();
      return new Response(veh.vehiclesCsv(rows, maint.csvCell), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-fahrzeuge_${envName}_${berlinDate()}.csv"` } });
    }
    return json({ vehicles: list });
  }
  if (path === '/api/vehicles' && m === 'POST') return json(await veh.upsertVehicle(env, user, await readJson(request)), 201);
  if (path === '/api/vehicles/import' && m === 'POST') {
    await rateLimit(env, url.searchParams.get('dry_run') === '1' ? 'preview' : 'import', user.id);
    const text = await request.text();
    if (text.length > 500000) throw new HttpError(413, 'csv_too_large', 'Datei zu groß (max. 500 KB).');
    return json(await veh.importVehiclesCsv(env, user, text, { dryRun: url.searchParams.get('dry_run') === '1' }));
  }
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)$/)) && m === 'GET') return json(await veh.vehicleDetail(env, user, envName, mm[1]));
  // Panne & Notfall: Anzeige für alle Rollen, Pflege Inhaber/Fuhrparkleitung/Disposition (je Umgebung)
  if (path === '/api/emergency' && m === 'GET') return json(await emergency.emergencyView(env, user, envName, Object.fromEntries(url.searchParams)));
  if (path === '/api/emergency/contacts' && m === 'GET') return json(await emergency.listContacts(env, user, envName, Object.fromEntries(url.searchParams)));
  if (path === '/api/emergency/contacts' && m === 'POST') return json(await emergency.addContact(env, user, envName, await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/emergency\/contacts\/([\w-]+)$/)) && m === 'PATCH') return json(await emergency.updateContact(env, user, envName, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/emergency\/contacts\/([\w-]+)\/archive$/)) && m === 'POST') return json(await emergency.archiveContact(env, user, envName, mm[1]));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/notes$/)) && m === 'GET') return json(await vnotes.listNotes(env, user, envName, mm[1], Object.fromEntries(url.searchParams)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/notes$/)) && m === 'POST') return json(await vnotes.addNote(env, user, envName, mm[1], await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/notes\/([\w-]+)\/archive$/)) && m === 'POST') return json(await vnotes.archiveNote(env, user, envName, mm[1], mm[2]));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/timeline$/)) && m === 'GET') return json(await veh.vehicleTimeline(env, user, envName, mm[1], Object.fromEntries(url.searchParams)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/spec$/)) && m === 'POST') return json(await veh.setVehicleSpec(env, user, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/evaluation$/)) && m === 'POST') return json(await veh.setVehicleEvaluation(env, user, envName, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/active$/)) && m === 'POST') return json(await veh.setVehicleActive(env, user, envName, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/documents$/)) && m === 'POST') { await rateLimit(env, 'upload', user.id); return json(await veh.uploadVehicleDocument(env, user, envName, mm[1], request, Object.fromEntries(url.searchParams)), 201); }
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/documents\/([\w-]+)$/)) && m === 'PATCH') return json(await veh.updateVehicleDocument(env, user, envName, mm[1], mm[2], await readJson(request)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/drivers$/)) && m === 'POST') return json(await veh.assignDriver(env, user, envName, mm[1], await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/assignments\/([\w-]+)$/)) && m === 'DELETE') return json(await veh.endAssignment(env, user, envName, mm[1]));
  // Fahrzeugverträge (Leasing/Miete/Finanzierung/Versicherung/Wartung) – nur Inhaber/Fuhrparkleitung
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/contracts$/)) && m === 'POST') return json(await contracts.createContract(env, user, mm[1], await readJson(request), envName), 201);
  if (path === '/api/contracts' && m === 'GET') {
    const ov = await contracts.contractOverview(env, user, Object.fromEntries(url.searchParams), envName);
    if (url.searchParams.get('format') === 'csv') {
      await auth.audit(env, user.id, 'contract.export', null, { rows: ov.contracts.length, filter: ov.filter, site: ov.site, ...(ov.as_of ? { as_of: ov.as_of } : {}), ...(ov.ends_by ? { ends_by: ov.ends_by } : {}) });
      return new Response(contracts.contractsCsv(ov), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-vertraege_${ov.as_of ? 'stichtag-' + ov.as_of : ov.today}${ov.ends_by ? '_bis-' + ov.ends_by : ''}.csv"` } });
    }
    if (url.searchParams.get('format') === 'ics') return new Response(contracts.contractsIcs(ov, user.language), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-vertraege_${ov.today}.ics"` } });
    return json(ov);
  }
  if (path === '/api/contracts/import' && m === 'POST') {
    await rateLimit(env, url.searchParams.get('dry_run') === '1' ? 'preview' : 'import', user.id);
    const text = await request.text();
    if (text.length > 300000) throw new HttpError(413, 'csv_too_large', 'Datei zu groß (max. 300 KB).');
    return json(await contracts.importContracts(env, user, text, { dryRun: url.searchParams.get('dry_run') === '1', source: url.searchParams.get('source') || '' }));
  }
  if ((mm = path.match(/^\/api\/contracts\/([\w-]+)$/)) && m === 'PATCH') return json(await contracts.updateContract(env, user, mm[1], await readJson(request), envName));
  if ((mm = path.match(/^\/api\/contracts\/([\w-]+)\/end$/)) && m === 'POST') return json(await contracts.endContract(env, user, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/maintenance$/)) && m === 'POST') return json(await veh.addMaintenanceRule(env, user, mm[1], await readJson(request)), 201);
  if (path === '/api/maintenance' && m === 'GET') {
    const ov = await maint.maintenanceOverview(env, user, envName, { site: url.searchParams.get('site') });
    if (url.searchParams.get('format') === 'ics') {
      await auth.audit(env, user.id, 'maintenance.export_ics', null, { rows: ov.rows.length, site: ov.site });
      return new Response(maint.maintenanceIcs(ov, undefined, user.language), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-prueftermine_${ov.today}.ics"` } });
    }
    if (url.searchParams.get('format') === 'csv') {
      await auth.audit(env, user.id, 'maintenance.export', null, { rows: ov.rows.length, gaps: ov.gaps.length, site: ov.site });
      return new Response(maint.maintenanceCsv(ov, await maint.latestResults(env)), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-prueftermine_${ov.today}.csv"` } });
    }
    return json(ov);
  }
  if (path === '/api/maintenance/history' && m === 'GET') {
    const h = await maint.maintenanceHistory(env, user, Object.fromEntries(url.searchParams), envName);
    if (url.searchParams.get('format') !== 'csv') return json(h);
    await auth.audit(env, user.id, 'maintenance.history_export', null, { rows: h.rows.length, from: h.from, to: h.to, kind: h.kind, ...(h.truncated ? { truncated: true } : {}) });
    return new Response(maint.maintenanceHistoryCsv(h), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-durchgefuehrte-pruefungen_${h.from}_${h.to}.csv"`, ...(h.truncated ? { 'x-cfp-truncated': String(h.max) } : {}) } });
  }
  if (path === '/api/maintenance/recalls/import' && m === 'POST') {
    await rateLimit(env, url.searchParams.get('dry_run') === '1' ? 'preview' : 'import', user.id);
    const text = await request.text();
    if (text.length > 500000) throw new HttpError(413, 'csv_too_large', 'Datei zu groß (max. 500 KB).');
    return json(await maint.importRecallsCsv(env, user, text, { dryRun: url.searchParams.get('dry_run') === '1' }));
  }
  if (path === '/api/maintenance/import' && m === 'POST') {
    await rateLimit(env, url.searchParams.get('dry_run') === '1' ? 'preview' : 'import', user.id);
    const text = await request.text();
    if (text.length > 500000) throw new HttpError(413, 'csv_too_large', 'Datei zu groß (max. 500 KB).');
    return json(await maint.importMaintenanceCsv(env, user, text, { dryRun: url.searchParams.get('dry_run') === '1' }));
  }
  if ((mm = path.match(/^\/api\/maintenance\/([\w-]+)\/complete$/)) && m === 'POST') return json(await veh.completeMaintenance(env, user, mm[1], await readJson(request), { ctx, envName }));
  if ((mm = path.match(/^\/api\/maintenance\/([\w-]+)\/order$/)) && m === 'POST') return json(await cases.orderFromMaintenance(env, ctx, user, envName, mm[1], await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/maintenance\/events\/([\w-]+)\/result$/)) && m === 'POST') return json(await veh.addMaintenanceResult(env, user, mm[1], await readJson(request), { ctx, envName }));
  if ((mm = path.match(/^\/api\/maintenance\/events\/([\w-]+)\/order$/)) && m === 'POST') return json(await cases.orderFromInspectionDefect(env, ctx, user, envName, mm[1], await readJson(request)), 201);
  if (path === '/api/maintenance/create-batch' && m === 'POST') return json(await veh.addMaintenanceRuleBatch(env, user, await readJson(request)));
  if (path === '/api/maintenance/plan-batch' && m === 'POST') return json(await veh.planMaintenanceBatch(env, user, await readJson(request)));
  if ((mm = path.match(/^\/api\/maintenance\/([\w-]+)\/plan$/)) && m === 'POST') return json(await veh.planMaintenance(env, user, mm[1], await readJson(request)));
  // HU/SP ohne eigenen Eintrag (nur berechnete Frist): Eintrag erst bei der Aktion anlegen, dann wie beim vorhandenen Eintrag (19.10.2026)
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/husp\/(HU|SP)\/(complete|plan|order)$/)) && m === 'POST') {
    const body = await readJson(request);
    if (mm[3] === 'order' && user.role !== 'owner' && user.role !== 'fleet') throw forbidden();
    // Pflichtangaben vorab prüfen, damit ein abgewiesenes Formular keinen Eintrag hinterlässt
    if (mm[3] === 'complete' && (!String(body.done_date || '').trim() || !String(body.evidence || '').trim())) throw new HttpError(400, 'validation', 'Datum und Nachweis angeben.');
    if (mm[3] === 'plan' && !String(body.planned_date || '').trim()) throw new HttpError(400, 'validation', 'Termin angeben.');
    const rule = await veh.ensureHuSpRule(env, user, mm[1], mm[2], { allowInactive: mm[3] === 'complete' });
    try {
      if (mm[3] === 'complete') return json({ ...(await veh.completeMaintenance(env, user, rule.id, body, { ctx, envName })), rule_id: rule.id });
      if (mm[3] === 'plan') return json({ ...(await veh.planMaintenance(env, user, rule.id, body)), rule_id: rule.id });
      return json({ ...(await cases.orderFromMaintenance(env, ctx, user, envName, rule.id, body)), rule_id: rule.id }, 201);
    } catch (e) {
      // Aktion abgewiesen (z. B. Termin/Datum in ferner Zukunft, unbekannte Werkstatt): soeben angelegten, noch unbenutzten Eintrag wieder
      // entfernen – sonst stand HU/SP danach als echter Eintrag „Frist ungeklärt“ in der Übersicht (21.10.2026)
      if (rule.created && e instanceof HttpError && e.status < 500) await veh.dropUnusedHuSpRule(env, user, rule.id, mm[1], mm[2]);
      throw e;
    }
  }
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/odometer$/)) && m === 'POST') return json(await veh.addOdometer(env, user, mm[1], await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/odometer\/([\w-]+)\/note$/)) && m === 'POST') return json(await veh.addOdometerNote(env, user, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/ai$/)) && m === 'POST') return json(await veh.aiAnalysis(env, user, envName, mm[1]));

  // Reifen
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/tires$/)) && m === 'GET') return json(await tires.tireOverview(env, user, envName, mm[1]));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/tires\/events$/)) && m === 'POST') return json(await tires.addTireEvent(env, user, envName, mm[1], await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/tires\/specs$/)) && m === 'POST') return json(await tires.setTireSpec(env, user, mm[1], await readJson(request)));
  if (path === '/api/tires/fleet' && m === 'GET') {
    const ov = await tires.fleetTires(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv') return new Response(await tires.fleetTiresCsv(env, ov, maint.csvCell), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-reifen_${envName}_${berlinDate()}${siteSuffix(ov.site)}.csv"` } });
    return json(ov);
  }
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/tires\/winter-order$/)) && m === 'POST') return json(await cases.orderWinterTires(env, ctx, user, envName, mm[1], await readJson(request)), 201);
  if (path === '/api/tires/winter' && m === 'GET') return json(await tires.winterFleet(env, user, envName, Object.fromEntries(url.searchParams)));
  if (path === '/api/tires/import' && m === 'POST') {
    await rateLimit(env, url.searchParams.get('dry_run') === '1' ? 'preview' : 'import', user.id);
    const text = await request.text();
    if (text.length > 500000) throw new HttpError(413, 'csv_too_large', 'Datei zu groß (max. 500 KB).');
    return json(await tires.importTireSpecs(env, user, text, { dryRun: url.searchParams.get('dry_run') === '1' }));
  }

  if (path === '/api/telematics' && m === 'GET') {
    const ov = await telem.telematicsOverview(env, user, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv') return new Response(telem.positionsCsv(ov, maint.csvCell), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-telematik-stand_${berlinDate()}${siteSuffix(ov.site)}.csv"` } });
    return json(ov);
  }
  if (path === '/api/telematics/mappings' && m === 'POST') return json(await telem.confirmMapping(env, user, await readJson(request)), 201);
  if (path === '/api/telematics/mappings' && m === 'DELETE') return json(await telem.removeMapping(env, user, Object.fromEntries(url.searchParams)));
  if (path === '/api/admin/data-quality' && m === 'GET') return json(await dataQuality(env, user, envName, Object.fromEntries(url.searchParams)));
  if (path === '/api/admin/readiness' && m === 'GET') return json(await readiness(env, user));
  if (path === '/api/admin/usage' && m === 'GET') return json(await usageReport(env, user, envName, Object.fromEntries(url.searchParams)));
  if (path === '/api/admin/audit' && m === 'GET') {
    if (url.searchParams.get('format') === 'csv') {
      const r = await auth.auditCsv(env, user, Object.fromEntries(url.searchParams), maint.csvCell);
      await auth.audit(env, user.id, 'admin.audit_export', null, { from: r.from, to: r.to, action: r.prefix, ...(r.q ? { q: '(Suche)' } : {}), ...(r.person ? { user: r.person.id } : {}), ...(r.vehicle ? { vehicle: r.vehicle.id } : {}), rows: r.rows, ...(r.truncated ? { truncated: true } : {}) });
      return new Response(r.csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-protokoll_${r.from}_${r.to}${r.person ? '_' + r.person.username.replace(/[^\w.-]/g, '_') : ''}${r.vehicle ? '_' + String(r.vehicle.plate || r.vehicle.id).replace(/[^\w.-]/g, '_') : ''}.csv"`, ...(r.truncated ? { 'x-cfp-truncated': String(auth.AUDIT_CSV_MAX) } : {}) } });
    }
    const r = await auth.listAudit(env, user, Object.fromEntries(url.searchParams));
    return json({ entries: r.entries, ...(r.person ? { person: r.person } : {}), ...(r.vehicle ? { vehicle: r.vehicle } : {}) });
  }

  // Datenauskunft je Person (Inhaber, Vorbereitung Art. 15 DSGVO)
  if ((mm = path.match(/^\/api\/admin\/users\/([\w-]+)\/data-export$/)) && m === 'GET') {
    const x = await personExport(env, user, { userId: mm[1] });
    return new Response(JSON.stringify(x, null, 1), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="datenauskunft_${x.user.username.replace(/[^\w.-]/g, '_')}_${berlinDate(x.meta.generated_at)}.json"` } });
  }
  if ((mm = path.match(/^\/api\/drivers\/([\w-]+)\/data-export$/)) && m === 'GET') {
    const x = await personExport(env, user, { driverId: mm[1] });
    return new Response(JSON.stringify(x, null, 1), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="datenauskunft_fahrer_${driverFileTag(x.driver_record)}_${berlinDate(x.meta.generated_at)}.json"` } });
  }
  // Datensicherung (Inhaber)
  if (path === '/api/admin/backup' && m === 'GET') {
    const b = await exportBackup(env, user);
    return new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-sicherung_${berlinDate(b.created_at)}.json"` } });
  }

  // Kostenbericht: Einzelpositionen (Jahresabschluss, 23.10.2026) – nur als CSV
  if (path === '/api/reports/costs' && m === 'GET' && url.searchParams.get('part') === 'items') {
    const rep = await reports.costItems(env, user, envName, Object.fromEntries(url.searchParams));
    await auth.audit(env, user.id, 'reports.costs.items_export', null, { from: rep.from, to: rep.to, environment: envName, site: rep.site, ...(rep.vehicle_id ? { vehicle_id: rep.vehicle_id } : {}), items: rep.items.length });
    return new Response(reports.costItemsCsv(rep), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-kostenpositionen_${envName}_${rep.from}_${rep.to}_${reports.standTag()}.csv"` } });
  }
  // Kostenbericht je Fahrzeug/Monat
  if (path === '/api/reports/costs' && m === 'GET') {
    const rep = await reports.costReport(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv') {
      await auth.audit(env, user.id, 'reports.costs.export', null, { from: rep.from, to: rep.to, environment: envName, site: rep.site });
      return new Response(reports.costReportCsv(rep), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-kosten_${envName}_${rep.from}_${rep.to}_${reports.standTag(rep.generated_at)}.csv"` } });
    }
    return json(rep);
  }

  if (path === '/api/workshop/plan' && m === 'GET') {
    const plan = await reports.workshopPlan(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'ics') {
      // Kalendername mit Werkstattname statt Code („Werkstattplan Werkstatt München“ statt „MUENCHEN“, 20.10.2026)
      const ws = plan.site ? await env.DB.prepare('SELECT name FROM workshops WHERE code=?').bind(plan.site).first() : null;
      return new Response(reports.workshopPlanIcs({ ...plan, site: (ws && ws.name) || plan.site }, envName, user.language), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="werkstattplan_${envName}_${berlinDate()}.ics"` } });
    }
    return json(plan);
  }
  if (path === '/api/reports/workshop-load' && m === 'GET') {
    const rep = await reports.workshopLoad(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv') {
      await auth.audit(env, user.id, 'reports.workshop_load.export', null, { weeks: rep.weeks.length, environment: envName });
      return new Response(reports.workshopLoadCsv(rep), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="werkstatt-auslastung_${envName}_${rep.from}_${rep.weeks.length}kw.csv"` } });
    }
    return json(rep);
  }
  if (path === '/api/reports/defects' && m === 'GET') return json(await reports.defectReport(env, user, envName, Object.fromEntries(url.searchParams)));
  if (path === '/api/reports/kpi' && m === 'GET') {
    const rep = await reports.kpiReport(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv') {
      const part = url.searchParams.get('part') === 'priority' ? 'priority' : 'vehicles';
      await auth.audit(env, user.id, 'reports.kpi.export', null, { from: rep.from, to: rep.to, environment: envName, site: rep.site, vehicle_site: rep.vehicle_site, part });
      return new Response(reports.kpiReportCsv(rep, part), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-kennzahlen-${part === 'priority' ? 'dringlichkeit' : 'fahrzeuge'}_${envName}_${rep.from}_${rep.to}.csv"` } });
    }
    return json(rep);
  }

  // Ersatzteillager
  // Lager-CSV mit Auswahl als POST (viele Artikel: Kennungen sprengen sonst die URL-Länge; 20.10.2026)
  if (path === '/api/stock/export' && m === 'POST') {
    const body = await readJson(request);
    if (!Array.isArray(body.ids) || body.ids.length > 5000) throw bad('validation', 'Auswahl ungültig.');
    const items = await stock.listStock(env, user, envName, {});
    return stockCsvResponse(stockSel(items, body.ids.map(String)), envName);
  }
  if (path === '/api/stock' && m === 'GET') {
    const items = await stock.listStock(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv' && url.searchParams.get('reorder') === '1') return new Response(stock.reorderCsv(items, maint.csvCell), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-bestellvorschlag_${envName}_${berlinDate()}.csv"` } });
    // Auswahl der Liste (Filter/Suche) wie der Druck (20.10.2026); ohne „ids“ alle Artikel
    const sids = url.searchParams.get('ids');
    const sel = sids === null ? items : stockSel(items, sids.split(','));
    if (url.searchParams.get('format') === 'csv') return stockCsvResponse(sel, envName);
    if (url.searchParams.get('reorder') === '1') return json({ items });
    return json({ items, last_inventory: await stock.lastInventories(env, envName, [...new Set(items.map((i) => i.site))]) });
  }
  if (path === '/api/stock/import' && m === 'POST') {
    await rateLimit(env, url.searchParams.get('dry_run') === '1' ? 'preview' : 'import', user.id);
    const text = await request.text();
    if (text.length > 500000) throw new HttpError(413, 'csv_too_large', 'Datei zu groß (max. 500 KB).');
    return json(await stock.importStockCsv(env, user, envName, text, { dryRun: url.searchParams.get('dry_run') === '1', site: url.searchParams.get('site') }));
  }
  if (path === '/api/stock/asof' && m === 'GET') {
    const rep = await stock.stockAsOf(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv') return new Response(stock.stockAsOfCsv(rep, maint.csvCell), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-lagerbestand-stichtag_${envName}_${rep.date}${siteSuffix(rep.site)}.csv"` } });
    return json(rep);
  }
  if (path === '/api/stock/journal' && m === 'GET') {
    const rep = await stock.journal(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv') {
      await auth.audit(env, user.id, 'stock.journal.export', null, { from: rep.from, to: rep.to, site: rep.site, type: rep.type, ...(rep.item ? { item: rep.item.id } : {}), rows: rep.movements.length, environment: envName });
      return new Response(rep.type === 'inventur' ? stock.inventoryDiffCsv(rep, maint.csvCell) : stock.journalCsv(rep, maint.csvCell), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', ...(rep.truncated ? { 'x-cfp-truncated': String(stock.JOURNAL_MAX) } : {}), 'content-disposition': `attachment; filename="fuhrpark-${rep.type === 'inventur' ? 'inventurdifferenzen' : 'lagerjournal'}_${envName}_${rep.from}_${rep.to}${siteSuffix(rep.site)}${rep.item ? '_' + String(rep.item.part_number || 'artikel').replace(/[^\w-]/g, '').slice(0, 40) : ''}.csv"` } });
    }
    return json(rep);
  }
  if (path === '/api/stock/inventory' && m === 'POST') return json(await stock.inventory(env, user, envName, await readJson(request, 512 * 1024), { dryRun: url.searchParams.get('dry_run') === '1' }));
  if (path === '/api/stock' && m === 'POST') return json(await stock.createItem(env, user, envName, await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/stock\/([\w-]+)$/)) && m === 'GET') return json(await stock.itemDetail(env, user, envName, mm[1]));
  if ((mm = path.match(/^\/api\/stock\/([\w-]+)$/)) && m === 'PATCH') return json(await stock.updateItem(env, user, envName, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/stock\/([\w-]+)\/order$/)) && (m === 'PUT' || m === 'DELETE')) return json(await stock.setOrder(env, user, envName, mm[1], m === 'DELETE' ? null : await readJson(request), url.searchParams.get('expected')));
  if ((mm = path.match(/^\/api\/stock\/([\w-]+)\/transfer$/)) && m === 'POST') return json(await stock.transfer(env, user, envName, mm[1], await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/stock\/([\w-]+)\/movements$/)) && m === 'POST') return json(await stock.addMovement(env, user, envName, mm[1], await readJson(request)), 201);

  // Fahrerakte
  if (path === '/api/drivers' && m === 'GET') {
    const q = Object.fromEntries(url.searchParams);
    let list = await drivers.listDrivers(env, user, envName, q);
    // Filter „Standort“ (Standort der Fahrerakte, Schreibweisen zusammengefasst) – nur Leitung; Fahrer sehen ohnehin nur die eigene Akte
    const dsel = ['owner', 'fleet'].includes(user.role) ? reports.siteSelection(list, q.site) : null;
    // Fahrer ohne Standort, die der Filter ausblendet, zählen (22.10.2026: Standard-Standort der Leitung zeigte still eine leere Liste)
    const noSiteHidden = dsel && dsel.site && dsel.site !== 'ohne' ? list.filter((d) => reports.siteKey(d.site) === 'ohne').length : 0;
    if (dsel && dsel.site) list = list.filter((d) => dsel.match(d.site));
    // Leitung: Gesamtstatus mit Auslese-Frist wie CSV und Akte (Fahrer: listDrivers liefert die eigene Akte schon so)
    const tr = ['owner', 'fleet'].includes(user.role) ? await tacho.tachoRows(env, envName, await tacho.warnDays(env), undefined, q.inactive === '1' ? 0 : 1) : null;
    if (tr) { const tb = new Map(tr.drivers.map((x) => [x.id, x])); list = list.map((d) => ({ ...d, status: drivers.withTacho(d.status, tb.get(d.id)) })); }
    if (q.format === 'csv') {
      if (!['owner', 'fleet'].includes(user.role)) throw forbidden();
      await auth.audit(env, user.id, 'reports.drivers.export', null, { rows: list.length, environment: envName, site: dsel ? dsel.site : null });
      return new Response(drivers.driversCsv(list, new Map(tr.drivers.map((x) => [x.id, x])), maint.csvCell), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-fahrer-fristen_${envName}_${berlinDate()}.csv"` } });
    }
    return json({ drivers: list, ...(dsel ? { site: dsel.site, site_options: dsel.options, no_site_hidden: noSiteHidden, linked_user_ids: await drivers.linkedUserIds(env) } : {}) });
  }
  if (path === '/api/drivers' && m === 'POST') return json(await drivers.createDriver(env, user, envName, await readJson(request)), 201);
  // Nachweise/Führerscheinkontrollen aller Fahrer für einen Zeitraum (Backlog 246, Betriebsprüfung) – vor /api/drivers/:id
  if (path === '/api/drivers/license-checks' && m === 'POST') return json(await drivers.addLicenseCheckBatch(env, user, envName, await readJson(request)), 201); // Backlog 411
  if (path === '/api/drivers/trainings' && m === 'POST') return json(await drivers.addTrainingBatch(env, user, envName, await readJson(request)), 201); // Backlog 410, vor /api/drivers/:id
  if (path === '/api/drivers/records' && m === 'GET') {
    const r = await drivers.driverRecords(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') !== 'csv') return json(r);
    const part = url.searchParams.get('part') === 'checks' ? 'checks' : 'documents';
    await auth.audit(env, user.id, 'reports.drivers.records_export', null, { environment: envName, part, from: r.from, to: r.to, rows: part === 'checks' ? r.checks.length : r.documents.length, ...(r.truncated ? { truncated: true } : {}) });
    return new Response(drivers.driverRecordsCsv(r, part, maint.csvCell), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-fahrer-${part === 'checks' ? 'kontrollen' : 'nachweise'}_${envName}_${r.from}_${r.to}.csv"`, ...(r.truncated ? { 'x-cfp-truncated': String(r.max) } : {}) } });
  }
  if ((mm = path.match(/^\/api\/drivers\/([\w-]+)$/)) && m === 'GET') {
    const dd = await drivers.driverDetail(env, user, envName, mm[1]);
    // Leitung: Konten anderer Akten für die Kontoauswahl „Stammdaten ändern“ (Backlog 101)
    if (['owner', 'fleet'].includes(user.role)) dd.linked_user_ids = (await drivers.linkedUserIds(env)).filter((u) => u !== dd.driver.user_id);
    return json(dd);
  }
  if ((mm = path.match(/^\/api\/drivers\/([\w-]+)$/)) && m === 'PATCH') return json(await drivers.updateDriver(env, user, envName, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/drivers\/([\w-]+)\/documents$/)) && m === 'POST') return json(await drivers.addDriverDocument(env, user, envName, mm[1], await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/drivers\/([\w-]+)\/documents\/([\w-]+)\/cancel$/)) && m === 'POST') return json(await drivers.cancelDriverDocument(env, user, envName, mm[1], mm[2], await readJson(request)));
  if ((mm = path.match(/^\/api\/drivers\/([\w-]+)\/license-checks\/([\w-]+)\/cancel$/)) && m === 'POST') return json(await drivers.cancelLicenseCheck(env, user, envName, mm[1], mm[2], await readJson(request)));
  if ((mm = path.match(/^\/api\/drivers\/([\w-]+)\/license-checks$/)) && m === 'POST') return json(await drivers.addLicenseCheck(env, user, envName, mm[1], await readJson(request)), 201);

  // Auslese-Fristen Fahrerkarte / Massenspeicher (FPersV § 2 Abs. 5)
  if (path === '/api/tacho' && m === 'GET') {
    const ov = await tacho.tachoOverview(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv') {
      await auth.audit(env, user.id, 'reports.tacho.export', null, { environment: envName, site: ov.site });
      return new Response(tacho.tachoCsv(ov, maint.csvCell), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-auslesungen_${envName}_${ov.today}.csv"` } });
    }
    return json(ov);
  }
  if (path === '/api/tacho/history' && m === 'GET') {
    const h = await tacho.tachoHistory(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') !== 'csv') return json(h);
    await auth.audit(env, user.id, 'reports.tacho.history_export', null, { environment: envName, from: h.from, to: h.to, ...(h.truncated ? { truncated: true } : {}) });
    return new Response(tacho.tachoHistoryCsv(h, maint.csvCell), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-auslesungen-verlauf_${envName}_${h.from}_${h.to}.csv"`, ...(h.truncated ? { 'x-cfp-truncated': String(h.max) } : {}) } });
  }
  if (path === '/api/tacho/import' && m === 'POST') {
    await rateLimit(env, url.searchParams.get('dry_run') === '1' ? 'preview' : 'import', user.id);
    const text = await request.text();
    if (text.length > 500000) throw new HttpError(413, 'csv_too_large', 'Datei zu groß (max. 500 KB).');
    return json(await tacho.importDownloads(env, user, envName, text, { dryRun: url.searchParams.get('dry_run') === '1', source: url.searchParams.get('source') || '' }));
  }
  if (path === '/api/tacho/downloads' && m === 'GET') return json({ downloads: await tacho.listDownloads(env, user, envName, Object.fromEntries(url.searchParams)) });
  if (path === '/api/tacho/downloads' && m === 'POST') return json(await tacho.addDownload(env, user, envName, await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/tacho\/downloads\/([\w-]+)\/cancel$/)) && m === 'POST') return json(await tacho.cancelDownload(env, user, envName, mm[1], await readJson(request)));

  // Bußgelder & Zeugenfragebögen
  if (path === '/api/fines' && m === 'GET') {
    const q = Object.fromEntries(url.searchParams);
    const exp = q.format === 'csv' || q.format === 'ics';
    const sel = await fines.listFinesSel(env, user, envName, q, exp ? FINES_EXPORT_MAX : 500); const list = sel.rows;
    if (exp) {
      const trunc = sel.truncated ? { 'x-cfp-truncated': String(FINES_EXPORT_MAX) } : {};
      if (!['owner', 'fleet', 'viewer'].includes(user.role)) throw forbidden();
      const day = berlinDate();
      if (q.format === 'ics') {
        const w = await env.DB.prepare(`SELECT value FROM settings WHERE key='fine_warn_days'`).first();
        const warn = w && w.value !== '' && Number(w.value) >= 0 ? Number(w.value) : null; // wie Agent: 0 = Erinnerung am Fristtag, leer = keine
        return new Response(fines.finesIcs(list, warn, icsCalendar, sel.site, user.language, envName), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-behoerdenfristen_${envName}_${day}.ics"`, ...trunc } });
      }
      const withDriver = q.with_driver === '1' && ['owner', 'fleet'].includes(user.role);
      await auth.audit(env, user.id, 'reports.fines.export', null, { rows: list.length, with_driver: withDriver, environment: envName, site: sel.site, ...(sel.truncated ? { truncated: true } : {}) });
      return new Response(fines.finesCsv(list, maint.csvCell, withDriver), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-bussgelder_${envName}_${day}${siteSuffix(sel.site)}.csv"`, ...trunc } });
    }
    return json({ fines: list, site: sel.site, site_options: sel.site_options, truncated: !!sel.truncated });
  }
  if (path === '/api/fines' && m === 'POST') return json(await fines.createFine(env, user, envName, await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/fines\/([\w-]+)$/)) && m === 'GET') return json(await fines.fineDetail(env, user, envName, mm[1]));
  if ((mm = path.match(/^\/api\/fines\/([\w-]+)\/commands$/)) && m === 'POST') { const b = await readJson(request); usageAction.set(request, b && b.action); return json(await fines.fineCommand(env, ctx, user, envName, mm[1], b)); }
  if ((mm = path.match(/^\/api\/fines\/([\w-]+)\/files$/)) && m === 'POST') { await rateLimit(env, 'upload', user.id); return json(await fines.uploadFineFile(env, user, envName, mm[1], request), 201); }

  // Vorgänge
  if (path === '/api/cases' && m === 'GET') {
    // interne Schalter (__export, __counts) nie aus der Adresse übernehmen
    const q = Object.fromEntries([...url.searchParams].filter(([k]) => !k.startsWith('__')));
    // Wiedervorlagen als Kalender (.ics): nur Vorgangsnummer, Kennzeichen, Status – ohne Vermerk/Beschreibung/Namen (Kalender werden oft geteilt)
    if (q.format === 'ics') {
      if (['driver', 'workshop'].includes(user.role)) throw forbidden();
      const rows = await cases.listCases(env, user, envName, { status: 'open', followup: '1', vsite: q.vsite, limit: 5000, __export: true });
      // Texte in der Sprache der Person (DE/UK/EN), Status als Bezeichnung
      const I = icsLang(user.language);
      const ev = rows.filter((c) => c.followup_on).map((c) => ({ uid: `case-followup-${c.id}`, date: c.followup_on, summary: I.tx('followup', { no: c.case_no, plate: c.plate }), description: I.tx('followup_desc', { no: c.case_no, status: I.status(c.status) }) }));
      return new Response(icsCalendar(`${I.tx('cal_followup')}${q.vsite ? ' – ' + (q.vsite === 'ohne' ? I.tx('no_site') : String(q.vsite).slice(0, 60)) : ''}${envName === 'test' ? ` (${I.tx('test_env')})` : ''}`, ev.sort((x, y) => x.date.localeCompare(y.date))), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-wiedervorlagen_${envName}_${berlinDate()}.ics"` } });
    }
    if (q.format === 'csv') {
      if (user.role === 'driver') throw forbidden();
      const cmeta = {};
      const rows = await cases.listCases(env, user, envName, { ...q, limit: CASES_CSV_MAX, __export: true }, cmeta);
      await auth.audit(env, user.id, 'reports.cases.export', null, { status: q.status || null, q: q.q ? '(Suche)' : null, vsite: q.vsite || null, ...Object.fromEntries(['warranty', 'followup', 'stale', 'repeat_days', 'vehicle_id', 'sort'].filter((k) => q[k]).map((k) => [k, String(q[k]).slice(0, 60)])), rows: rows.length, ...(cmeta.truncated ? { truncated: true } : {}), environment: envName });
      const fmt = (iso) => (iso ? berlinDateTime(iso) : '');
      // Versicherungsfall-Spalten nur für Inhaber/Fuhrparkleitung (eine Abfrage)
      const claimMap = ['owner', 'fleet'].includes(user.role)
        ? new Map((await env.DB.prepare('SELECT case_id, status, insurer, claim_no FROM insurance_claims WHERE environment=?').bind(envName).all()).results.map((r) => [r.case_id, r]))
        : null;
      const wsNames = new Map((await env.DB.prepare('SELECT code, name FROM workshops').all()).results.map((r) => [r.code, r.name]));
      // Begrenzung sichtbar machen (wie die Vorgangsliste): Antwort-Header, die Oberfläche zeigt einen Hinweis
      return new Response(cases.casesCsv(rows, maint.csvCell, fmt, claimMap, wsNames), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-vorgaenge_${envName}_${berlinDate()}.csv"`, ...(cmeta.truncated ? { 'x-cfp-truncated': String(CASES_CSV_MAX) } : {}) } });
    }
    const meta = {}; const list = await cases.listCases(env, user, envName, q, meta);
    return json({ cases: list, site: meta.site ?? null, site_options: meta.site_options || [], ...(user.role === 'driver' ? {} : { stale_days: meta.stale_days ?? null }), truncated: !!meta.truncated, limit: Math.min(Number(q.limit) || 200, 500) });
  }
  if (path === '/api/work-suggestions' && m === 'GET') return json(await cases.workSuggestions(env, user, envName));
  if (path === '/api/work-day' && m === 'GET') return json(await cases.myWorkDay(env, user, envName, Object.fromEntries(url.searchParams)));
  if (path === '/api/part-suggestions' && m === 'GET') return json(await cases.partSuggestions(env, user, envName));
  if (path === '/api/cases/batch' && m === 'POST') return json(await cases.createCaseBatch(env, ctx, user, envName, await readJson(request)), 201);
  if (path === '/api/cases' && m === 'POST') return json(await cases.createCase(env, ctx, user, envName, await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/cases\/([\w-]+)$/)) && m === 'GET') return json(await cases.getCaseDetail(env, user, envName, mm[1]));
  if ((mm = path.match(/^\/api\/cases\/([\w-]+)\/commands$/)) && m === 'POST') { const b = await readJson(request); usageAction.set(request, b && b.action); return json(await cases.runCommand(env, ctx, user, envName, mm[1], b)); }
  if ((mm = path.match(/^\/api\/cases\/([\w-]+)\/open-items\/([\w-]+)\/followup$/)) && m === 'POST') return json(await cases.openItemToCase(env, ctx, user, envName, mm[1], mm[2], await readJson(request)), 201);
  // Versicherungsfall je Vorgang (nur Inhaber/Fuhrparkleitung)
  if ((mm = path.match(/^\/api\/cases\/([\w-]+)\/claim$/)) && m === 'PUT') return json(await claims.saveClaim(env, user, envName, mm[1], await readJson(request)));
  if (path === '/api/claims' && m === 'GET') {
    const ov = await claims.claimOverview(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv') {
      await auth.audit(env, user.id, 'claim.export', null, { rows: ov.claims.length, filter: ov.filter, site: ov.site, ...(ov.from ? { from: ov.from } : {}), ...(ov.to ? { to: ov.to } : {}), ...(ov.insurer ? { insurer: ov.insurer } : {}), ...(url.searchParams.get('third_party') === '1' ? { third_party: true } : {}) });
      return new Response(claims.claimsCsv(ov, { thirdParty: url.searchParams.get('third_party') === '1' }), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-versicherungsfaelle_${envName}_${ov.today}.csv"` } });
    }
    return json(ov);
  }
  if ((mm = path.match(/^\/api\/cases\/([\w-]+)\/files$/)) && m === 'POST') { await rateLimit(env, 'upload', user.id); return json(await cases.uploadFile(env, user, envName, mm[1], request), 201); }
  if ((mm = path.match(/^\/api\/files\/([\w-]+)$/)) && m === 'GET') return cases.downloadFile(env, user, envName, mm[1]);
  if (path === '/api/inspections' && m === 'POST') return json(await cases.submitInspection(env, ctx, user, envName, await readJson(request)), 201);

  // Benachrichtigungen & Push
  if (path === '/api/notifications' && m === 'GET') {
    // Zähler immer über ALLE Hinweise der Person (nicht nur die angezeigten) – sonst fehlt im Zähler/Reiter, was älter als die neuesten NOTIF_MAX ist.
    // ?filter=unread|urgent filtert serverseitig (ältere ungelesene erscheinen so auch bei vielen Hinweisen); ?count=1 nur die Zähler (Kennzahl am Menü).
    // nur Hinweise der aktuellen Umgebung der Person (nach Wechsel Test→Betrieb erschienen sonst Test-Hinweise, 17.10.2026)
    // Sicherheitshinweis „Neue Anmeldung“ betrifft das Konto, nicht die Umgebung: in Test- und Betriebsansicht (20.10.2026: Inhaber in „Test“ sah ihn nicht)
    // Anmelde-Hinweis dieses Geräts (Backlog 226): hier nicht „ungelesen“ (Person hat sich gerade selbst angemeldet); andere Geräte unverändert
    const ownRef = (await auth.loginRefOf(request)) || '-';
    const UNREAD = `n.opened_at IS NULL AND n.acknowledged_at IS NULL AND NOT (n.kind='new_login' AND n.ref IS '${ownRef.replace(/[^a-z0-9:-]/g, '')}')`;
    const c = await env.DB.prepare(`SELECT COUNT(*) AS all_n, COALESCE(SUM(CASE WHEN ${UNREAD} THEN 1 ELSE 0 END), 0) AS unread_n, COALESCE(SUM(CASE WHEN n.urgent=1 THEN 1 ELSE 0 END), 0) AS urgent_n
      FROM notifications n WHERE n.user_id=? AND (n.environment=? OR n.kind='new_login') AND n.hidden_at IS NULL`).bind(user.id, envName).first();
    const listAsOf = nowIso(); // „Alle gelesen“ markiert nur bis zu diesem Stand (danach eingetroffene bleiben ungelesen)
    const counts = { all: c.all_n, unread: c.unread_n, urgent: c.urgent_n };
    if (url.searchParams.get('count') === '1') return json({ unread: counts.unread, counts });
    const filter = { unread: UNREAD, urgent: 'n.urgent=1' }[url.searchParams.get('filter') || ''] || null;
    // „Ältere laden“: weiter nach dem letzten angezeigten Eintrag (before = Kennung), gleiche Sortierung – vorher waren nach den neuesten
    // 100 ältere ungelesene unerreichbar (23.10.2026, Rückkehr aus dem Urlaub mit 300 Hinweisen)
    const beforeId = url.searchParams.get('before');
    const cur = beforeId ? await env.DB.prepare('SELECT created_at, rowid AS r FROM notifications WHERE id=? AND user_id=?').bind(String(beforeId).slice(0, 64), user.id).first() : null;
    if (beforeId && !cur) throw new HttpError(400, 'validation', 'Liste veraltet – bitte neu laden.');
    const rows = (await env.DB.prepare(`SELECT n.id, n.case_id, n.kind, n.urgent, n.title, n.body, n.created_at, n.push_status, n.push_hold_until, n.device_received_at, n.opened_at, n.acknowledged_at, n.ref, u.language AS lang
      FROM notifications n JOIN users u ON u.id=n.user_id WHERE n.user_id=? AND (n.environment=? OR n.kind='new_login') AND n.hidden_at IS NULL ${filter ? 'AND ' + filter : ''}
      ${cur ? 'AND (n.created_at < ? OR (n.created_at = ? AND n.rowid < ?))' : ''} ORDER BY n.created_at DESC, n.rowid DESC LIMIT ?`)
      .bind(user.id, envName, ...(cur ? [cur.created_at, cur.created_at, cur.r] : []), NOTIF_MAX + 1).all()).results;
    const truncated = rows.length > NOTIF_MAX; if (truncated) rows.length = NOTIF_MAX;
    for (const r of rows) { Object.assign(r, currentLangText(r)); delete r.lang; if (r.kind === 'new_login') { if (r.ref && r.ref === ownRef) r.own_device = true; r.ref = null; } }
    const q = await env.DB.prepare('SELECT push_quiet_from, push_quiet_to FROM users WHERE id=?').bind(user.id).first();
    return json({ as_of: listAsOf, notifications: rows, unread: counts.unread, counts, filter: filter ? url.searchParams.get('filter') : 'all', truncated, max: NOTIF_MAX, quiet: q && q.push_quiet_from ? { from: q.push_quiet_from, to: q.push_quiet_to } : null });
  }
  if ((mm = path.match(/^\/api\/notifications\/([\w-]+)\/(received|opened|ack)$/)) && m === 'POST') {
    const col = { received: 'device_received_at', opened: 'opened_at', ack: 'acknowledged_at' }[mm[2]];
    const now = nowIso();
    const extra = mm[2] === 'ack' ? ', opened_at=COALESCE(opened_at, ?)' : '';
    const st = env.DB.prepare(`UPDATE notifications SET ${col}=COALESCE(${col}, ?)${extra} WHERE id=? AND user_id=?`);
    await (mm[2] === 'ack' ? st.bind(now, now, mm[1], user.id) : st.bind(now, mm[1], user.id)).run();
    return json({ ok: true });
  }
  if (path === '/api/notifications/read-all' && m === 'POST') {
    // nur die angezeigte Umgebung (wie Liste/Zähler) – vorher wurden aus der Test-Ansicht auch kritische Betriebs-Hinweise „gelesen“ (17.10.2026)
    // optional `before` (Stand der angezeigten Liste, `as_of`): später eingetroffene – z. B. eine Sperre – bleiben ungelesen,
    // sonst endete auch die Eskalation „dringend nicht geöffnet“ des Agenten, ohne dass der Hinweis gesehen wurde (20.10.2026)
    const rb = await readJson(request).catch(() => ({}));
    const before = rb && typeof rb.before === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(rb.before) && Number.isFinite(Date.parse(rb.before)) ? rb.before : null;
    await env.DB.prepare(`UPDATE notifications SET opened_at=COALESCE(opened_at, ?) WHERE user_id=? AND (environment=? OR kind='new_login') AND hidden_at IS NULL${before ? ' AND created_at <= ?' : ''}`)
      .bind(...[nowIso(), user.id, envName, ...(before ? [before] : [])]).run();
    return json({ ok: true });
  }
  if (path === '/api/push/subscribe' && m === 'POST') {
    const b = await readJson(request);
    const endpoint = str(b.endpoint, { required: true, max: 1000, field: 'endpoint' });
    if (!/^https:\/\//.test(endpoint)) throw new HttpError(400, 'validation', 'Ungültiger Push-Endpunkt.');
    const p256dh = str(b.keys?.p256dh, { required: true, max: 200 });
    const authKey = str(b.keys?.auth, { required: true, max: 100 });
    // Schlüssel prüfen (17.10.2026): ein unbrauchbares Abo ließ die Verschlüsselung werfen und brach die Zustellung an alle Empfänger ab
    const keyLen = (v) => { try { return b64urlDecode(v); } catch { return null; } };
    const pk = keyLen(p256dh); const ak = keyLen(authKey);
    if (!pk || pk.length !== 65 || pk[0] !== 4 || !ak || ak.length !== 16) throw new HttpError(400, 'validation', 'Ungültige Push-Schlüssel.');
    const now = nowIso();
    // Gerät einer anderen Person übernommen: Zeitstempel der Vorperson nicht weitergeben (20.10.2026)
    // an die aktuelle Anmeldung gebunden (Migration 0059): endet sie (Passwortwechsel, „andere beenden“ …), wird das Gerät abgemeldet
    await env.DB.prepare(`INSERT INTO push_subscriptions(id,user_id,endpoint,p256dh,auth,device_label,created_at,session_hash) VALUES (?,?,?,?,?,?,?,?)
      ON CONFLICT(endpoint) DO UPDATE SET created_at=CASE WHEN user_id<>excluded.user_id THEN excluded.created_at ELSE created_at END,
        last_success_at=CASE WHEN user_id<>excluded.user_id THEN NULL ELSE last_success_at END, user_id=excluded.user_id, p256dh=excluded.p256dh, auth=excluded.auth, device_label=excluded.device_label, revoked_at=NULL, session_hash=excluded.session_hash`)
      .bind(uuid(), user.id, endpoint, p256dh, authKey, str(b.device_label, { max: 80 }), now, user._session || null).run();
    return json({ ok: true });
  }
  if (path === '/api/push/unsubscribe' && m === 'POST') {
    const b = await readJson(request);
    await env.DB.prepare('UPDATE push_subscriptions SET revoked_at=? WHERE endpoint=? AND user_id=?').bind(nowIso(), String(b.endpoint || ''), user.id).run();
    return json({ ok: true });
  }
  if (path === '/api/push/devices' && m === 'GET') {
    return json({ devices: (await env.DB.prepare('SELECT id, device_label, created_at, last_success_at FROM push_subscriptions WHERE user_id=? AND revoked_at IS NULL').bind(user.id).all()).results });
  }
  if (path === '/api/push/test' && m === 'POST') {
    // optional: Endpunkt des eigenen Geräts – dann nur an dieses Gerät (fehlt es am Server, Status no_subscription)
    const tb = await readJson(request);
    const onlyEndpoint = str(tb && tb.endpoint, { max: 1000, field: 'endpoint' }) || null;
    // Test an ein bestimmtes Gerät: eigener Schlüssel „testdev:“ – nie wiederholen/nach der Ruhezeit nachholen (ginge an alle Geräte, 21.10.2026)
    const ek = `${onlyEndpoint ? 'testdev' : 'test'}:${user.id}:${Date.now()}:${uuid().slice(0, 8)}`;
    const n = await notifyUsers(env, null, envName, [user.id], { onlyEndpoint, kind: 'test', title: nt(user.language, 'test'), body: nt(user.language, 'test_body'), eventKey: ek, langOf: new Map([[user.id, user.language]]) });
    // genau dieser Testhinweis (vorher der neueste Hinweis der Person – ein gleichzeitig entstandener anderer lieferte dessen Status, 20.10.2026)
    const row = await env.DB.prepare('SELECT push_status, push_last_error, push_hold_until FROM notifications WHERE user_id=? AND event_key=?').bind(user.id, ek).first();
    // hold_until: wegen persönlicher Ruhezeit zurückgehalten; device_gone: Gerät vom Push-Dienst abgemeldet (keine Wiederholung) – die App zeigt beides übersetzt (19.10.2026)
    const hold = row?.push_status === 'pending' && row.push_hold_until && Date.parse(row.push_hold_until) > (env.__nowMs || Date.now()) ? row.push_hold_until : null;
    return json({ created: n, push_status: row?.push_status, error: row?.push_last_error, hold_until: hold, device_gone: /^Gerät abgemeldet/.test(row?.push_last_error || '') });
  }

  // Dashboard / Management / Agent
  if (path === '/api/dashboard' && m === 'GET') return json(await dashboard(env, user, envName, url.searchParams.get('vsite')));
  if (path === '/api/master' && m === 'GET') { requireRole(user, ['owner', 'fleet']); return json(await masterPanel(env, envName)); }
  if ((mm = path.match(/^\/api\/master\/([a-f0-9]{64})\/decision$/)) && m === 'POST') {
    requireRole(user, ['owner', 'fleet']);
    return json(await decideMasterItem(env, user, envName, mm[1], await readJson(request)));
  }
  if (path === '/api/agent/run' && m === 'POST') { requireRole(user, ['owner', 'fleet']); return json(await runFleetAgent(env, ctx, envName, `manuell:${user.username}`)); }

  // Einstellungen (nur Inhaber)
  if (path === '/api/settings' && m === 'GET') {
    requireRole(user, ['owner']);
    const rows = (await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN (${SETTINGS_KEYS.map(() => '?').join(',')})`).bind(...SETTINGS_KEYS).all()).results;
    const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    // frühere Stundensätze mit Gültigkeit (Backlog 412)
    return json({ keys: SETTINGS_KEYS, values, defaults: SETTING_DEFAULTS, invalid: storedInvalid(values), hourly_rate_periods: await rates.listRatePeriods(env) });
  }
  // früheren Stundensatz entfernen (Korrektur; Backlog 412) – Arbeitszeit bis dahin wird mit dem nächsten Satz bewertet
  if ((mm = path.match(/^\/api\/settings\/hourly-rate-periods\/(\d{4}-\d{2}-\d{2})$/)) && m === 'DELETE') {
    requireRole(user, ['owner']);
    const r = await rates.removeRatePeriod(env, mm[1]);
    await auth.audit(env, user.id, 'settings.hourly_rate_period_removed', null, { valid_until: r.valid_until, rate_net: r.rate_net });
    const costs_revalidated = (await cases.revalidateCostMarks(env, user.id)).length;
    return json({ ok: true, removed: r, ...(costs_revalidated ? { costs_revalidated } : {}) });
  }
  if (path === '/api/settings' && m === 'PUT') {
    requireRole(user, ['owner']);
    const b = await readJson(request);
    // Eine Anweisung für alle Schlüssel (vorher eine je Schlüssel – das volle Formular hat > 30 Felder); erst alle Werte prüfen (src/settings.js)
    const pairs = settingPairs(b, { decimalPoint: pointDec(user) });
    // Backlog 412: bisherigen Stundensatz für Arbeit bis einschließlich Datum behalten (vor dem Speichern prüfen, im selben Stapel anlegen)
    const keep = await rates.keepRateStatement(env, user, b, pairs);
    let kept = null;
    if (pairs.length) {
      const up = env.DB.prepare(`INSERT INTO settings(key,value,updated_by,updated_at) SELECT json_extract(value,'$[0]'), json_extract(value,'$[1]'), ?1, ?2 FROM json_each(?3) WHERE 1
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at`).bind(user.id, nowIso(), JSON.stringify(pairs));
      if (keep) { const res = await env.DB.batch([keep.stmt, up]); if (res[0].meta && res[0].meta.changes) kept = { valid_until: keep.until, rate_net: keep.rate }; }
      else await up.run();
    }
    if (pairs.length) await auth.audit(env, user.id, 'settings.update', null, Object.fromEntries(pairs)); // nur geprüfte, gespeicherte Werte (unbekannte Schlüssel nicht ins Protokoll)
    if (kept) await auth.audit(env, user.id, 'settings.hourly_rate_period', null, kept);
    // Grenze/Stundensatz geändert: offene Markierungen „Kostenfreigabe ausstehend“ neu bewerten (19.10.2026)
    const costs_revalidated = pairs.some(([k]) => k === 'repair_cost_limit_net' || k === 'workshop_hourly_rate_net') ? (await cases.revalidateCostMarks(env, user.id)).length : 0;
    return json({ ok: true, ...(costs_revalidated ? { costs_revalidated } : {}), ...(kept ? { hourly_rate_period: kept } : {}) });
  }

  throw notFound('Unbekannter API-Pfad.');
}

async function dashboard(env, user, envName, vsiteRaw = null) {
  // Fahrzeug-Standort (optional, nicht Fahrer/Werkstatt): Zähler und Fahrzeugleiste nur für diesen Standort – Disposition mit
  // Standard-Standort sah sonst flottenweite Zahlen über der Standort-Tafel (19.10.2026); Agentenbefunde bleiben flottenweit
  const vsite = vsiteRaw && !['driver', 'workshop'].includes(user.role) ? String(vsiteRaw).slice(0, 60) : null;
  // Zähler aus höchstens 500 offenen Vorgängen (kritische zuerst); darüber Kennzeichnung statt stiller Kappung (vorher 200 ohne Hinweis)
  const om = {}; const all = await cases.listCases(env, user, envName, { status: 'open', limit: 500, __counts: true, ...(vsite ? { vsite } : {}) }, om);
  // Werkstatt: Zähler nur über ihren Arbeitsvorrat (eigene Meldung an einen Auftrag einer anderen Werkstatt zählte als „kritisch/gesperrt“ – 19.10.2026)
  const open = user.role === 'workshop' ? all.filter((c) => c.access !== 'read') : all;
  const out = {
    environment: envName,
    open_cases: open.length,
    open_cases_truncated: !!om.truncated,
    critical: open.filter((c) => c.priority === 'kritisch').length,
    locked: open.filter((c) => c.safety_lock).length,
    by_status: open.reduce((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {}),
  };
  if (user.role === 'workshop') {
    out.inbox = open.filter((c) => c.access === 'full' && c.status === 'werkstatt_freigegeben' && !c.workshop_ack_at).length;
    // „In Reparatur“ und „Wartet auf Teile“ getrennt (bis 19.10.2026 zählte in_progress beide – Kennzahl hieß aber „In Reparatur“)
    out.in_progress = open.filter((c) => c.access === 'full' && c.status === 'in_reparatur').length;
    out.waiting_parts = open.filter((c) => c.access === 'full' && c.status === 'wartet_teile').length;
    out.preview = open.filter((c) => c.access === 'preview').length;
  }
  if (['owner', 'fleet', 'dispatch'].includes(user.role)) {
    let vs = await veh.listVehicles(env, user, envName);
    if (vsite) { const sel = reports.siteSelection(vs, vsite); out.site = sel.site; vs = vs.filter((v) => sel.match(v.site)); }
    // ruhende Fahrzeuge nicht in der Leiste (wie Management-Panel; Entscheidung 10.10.2026), nur als Anzahl daneben (20.10.2026)
    const dormant = vs.filter((v) => v.eval_excluded).length; vs = vs.filter((v) => !v.eval_excluded);
    out.vehicles = { total: vs.length, ruhend: dormant, gesperrt: vs.filter((v) => v.availability === 'gesperrt').length, werkstatt: vs.filter((v) => v.availability === 'werkstatt').length,
      meldung_offen: vs.filter((v) => v.availability === 'meldung_offen').length, einsatzbereit: vs.filter((v) => v.availability === 'einsatzbereit_lt_system').length };
  }
  if (['owner', 'fleet'].includes(user.role)) {
    out.findings = (await env.DB.prepare(`SELECT severity, COUNT(*) AS n FROM agent_findings WHERE environment=? AND status='offen' GROUP BY severity`).bind(envName).all()).results;
  }
  return out;
}

const CRON_TEST = '7,37 * * * *';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      await ensureSchema(env);
      if (url.pathname === '/healthz') return withHeaders(json({ ok: true }));
      if (url.pathname.startsWith('/api/')) {
        let res;
        try { res = await handleApi(request, env, ctx, url); } catch (e) { res = errorResponse(e); }
        res = await csvResponseDatesDe(res); // CSV-Exporte: Kalendertage einheitlich TT.MM.JJJJ
        if (usageEnv.has(request)) recordUsage(env, ctx, usageEnv.get(request), request.method, url.pathname, res.status, usageAction.get(request));
        return withHeaders(res);
      }
      if (env.ASSETS) return withHeaders(await env.ASSETS.fetch(request), { 'content-security-policy': CSP });
      return withHeaders(json({ error: 'not_found' }, 404));
    } catch (e) {
      return withHeaders(errorResponse(e));
    }
  },
  async scheduled(event, env0, ctx) {
    // eigene Sicht je Aufruf mit gemeinsamer Push-Sendegrenze (env selbst wird zwischen Aufrufen geteilt)
    const env = Object.create(env0); env.__sendBudget = { left: env0.__pushMaxSends || PUSH_MAX_SENDS };
    await ensureSchema(env);
    // Abfragebudget je Aufruf: Betrieb und Test laufen in getrennten Cron-Aufrufen (siehe wrangler.toml)
    const testRun = event && event.cron === CRON_TEST;
    try { await runFleetAgent(env, ctx, testRun ? 'test' : 'production', 'cron'); } catch (err) { console.error('Agent', err); }
    if (!testRun) {
      try { await retryFailedPush(env); } catch (err) { console.error('Push-Retry', err); }
    } else {
      await auth.cleanupShortLived(env);
    }
  },
};

// Dateiname der Fahrer-Datenauskunft mit Personenbezug (Personalnummer bzw. Name ohne Sonderzeichen) – sonst hießen alle Auskünfte eines Tages gleich (19.10.2026)
function driverFileTag(d) {
  const raw = String((d && (d.personnel_no || d.display_name)) || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
  return raw || String((d && d.id) || 'fahrer').slice(0, 8);
}
