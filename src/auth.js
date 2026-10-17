// [CLAUDE] Authentifizierung: Einladung -> eigenes Passwort, Sitzungen per HttpOnly-Cookie
import {
  nowIso, uuid, sha256Hex, randomToken, hashPassword, timingSafeEqual, parseCookies,
  bad, forbidden, HttpError, str, oneOf, berlinDayStartIso, berlinDateTime, berlinDateTimeLang, berlinDate, isCalendarDate, likeEsc, caseVariants, intParam } from './util.js';
import { createChallenge, redeemChallenge } from './totp.js';
import { notifyUsers, nt } from './notify.js';

export const ROLES = ['owner', 'fleet', 'workshop', 'dispatch', 'driver', 'viewer'];
export const ENVS = ['test', 'production'];
const SESSION_DAYS = 30;
const INVITE_DAYS = 7;
const COOKIE = 'cfp_session';

export async function getSessionUser(env, request) {
  const token = parseCookies(request.headers.get('cookie'))[COOKIE];
  if (!token) return null;
  const h = await sha256Hex(token);
  // Abmeldung nach Leerlauf (Einstellung des Inhabers, leer = aus): je Werkstatt (geteilte Tablets) bzw. alle anderen Rollen.
  // In derselben Abfrage gelesen – keine zusätzliche D1-Abfrage je Aufruf.
  const row = await env.DB.prepare(
    `SELECT u.*, s.expires_at AS s_exp, s.last_seen AS s_seen,
      (SELECT value FROM settings WHERE key = CASE WHEN u.role='workshop' THEN 'idle_logout_workshop_min' ELSE 'idle_logout_other_min' END) AS idle_min
     FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
  ).bind(h).first();
  if (!row) return null;
  const idleMs = Number(row.idle_min) > 0 ? Math.max(Number(row.idle_min), 5) * 60000 : 0;
  const idle = Date.now() - Date.parse(row.s_seen);
  if (row.s_exp < nowIso() || !row.active || (idleMs && idle > idleMs)) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(h).run();
    return null;
  }
  // last_seen höchstens alle 10 Minuten schreiben (bei Leerlauf-Abmeldung häufiger, damit aktive Nutzung zählt)
  // Hintergrund-Abfragen der App (x-cfp-bg: Zahl am Glockensymbol) verlängern die Sitzung nicht – sonst bliebe ein offenes, unbedientes Tablet angemeldet
  if (idle > Math.min(10 * 60 * 1000, idleMs ? idleMs / 3 : Infinity) && request.headers.get('x-cfp-bg') !== '1') {
    await env.DB.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?').bind(nowIso(), h).run();
  }
  // Für die App: gleiche Leerlauf-Grenze, damit sie geteilte Bildschirme selbst leert (ohne auf den nächsten Aufruf zu warten)
  // language: Sprache der Person für serverseitig erzeugte Texte (z. B. Testbenachrichtigung) – fehlte bis 16.10.2026, Test-Push kam immer deutsch
  return { ...publicUser(row, h), language: row.language, idle_logout_min: idleMs ? idleMs / 60000 : null };
}

export function publicUser(row, sessionHash) {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    environment: row.environment,
    workshop_site: row.workshop_site,
    employee_number: row.employee_number,
    active: !!row.active,
    _session: sessionHash,
  };
}

function cookieHeader(token, maxAgeSec) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

async function createSession(env, userId, request) {
  const token = randomToken(32);
  const h = await sha256Hex(token);
  const now = new Date();
  const exp = new Date(now.getTime() + SESSION_DAYS * 86400000).toISOString();
  await env.DB.prepare('INSERT INTO sessions(token_hash,user_id,created_at,expires_at,last_seen,user_agent) VALUES (?,?,?,?,?,?)')
    .bind(h, userId, now.toISOString(), exp, now.toISOString(), (request.headers.get('user-agent') || '').slice(0, 200)).run();
  return cookieHeader(token, SESSION_DAYS * 86400);
}

const LOCK_AFTER = 8;
const LOCK_MINUTES = 15;

// Fehlanmeldungen je Netzadresse (gegen Durchprobieren vieler Benutzernamen): Schlüssel = gekürzter Hash der IP, Fenster 15 Min.
// Grenze großzügig, weil ein Betriebshof oft eine gemeinsame Adresse hat; die Sperre je Benutzer (8 Fehlversuche) bleibt davon unberührt.
export const IP_FAIL_LIMIT = { max: 60, windowSec: 900 };
async function ipKey(request) {
  const ip = request.headers.get('cf-connecting-ip') || 'unbekannt';
  return 'loginfail:' + (await sha256Hex('cfp-ip:' + ip)).slice(0, 24);
}

export async function login(env, request, body, ctx = null) {
  const username = str(body.username, { required: true, max: 64, field: 'Benutzername' }).toLowerCase();
  const password = str(body.password, { required: true, max: 200, field: 'Passwort' });
  const ik = await ipKey(request);
  const win = Math.floor(Date.now() / 1000 / IP_FAIL_LIMIT.windowSec) * IP_FAIL_LIMIT.windowSec;
  const [att, ipRow] = await Promise.all([
    env.DB.prepare('SELECT * FROM login_attempts WHERE key = ?').bind(username).first(),
    env.DB.prepare('SELECT count FROM rate_limits WHERE key = ? AND window_start = ?').bind(ik, win).first(),
  ]);
  if (ipRow && ipRow.count >= IP_FAIL_LIMIT.max) {
    throw new HttpError(429, 'locked', 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.');
  }
  if (att && att.locked_until && att.locked_until > nowIso()) {
    throw new HttpError(429, 'locked', 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.');
  }
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  let ok = false;
  if (user && user.active && user.password_hash) {
    const { hash } = await hashPassword(password, user.password_salt);
    ok = timingSafeEqual(hash, user.password_hash);
  } else {
    await hashPassword(password); // gleiche Laufzeit, keine Benutzer-Enumeration
  }
  if (!ok) {
    const locked = await recordFailure(env, username);
    await recordIpFailure(env, ik, win);
    if (locked) {
      if (user) await env.DB.prepare('DELETE FROM login_challenges WHERE user_id=?').bind(user.id).run();
      await audit(env, null, 'login.locked', user ? user.id : null, { username, minutes: LOCK_MINUTES });
    }
    throw new HttpError(401, 'invalid_login', 'Benutzername oder Passwort falsch.');
  }
  // Zwei-Faktor-Anmeldung eingeschaltet: noch keine Sitzung, nur ein kurzlebiger Anmeldevorgang für den Code.
  // Fehlversuche bleiben stehen, bis der Code stimmt (falsche Codes zählen zur selben Sperre wie falsche Passwörter).
  if (user.totp_enabled_at) {
    return { second_factor: 'totp', challenge: await createChallenge(env, user.id) };
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(username).run();
  const cookie = await createSession(env, user.id, request);
  await audit(env, user.id, 'login', user.id, null);
  await noteLoginDevice(env, ctx, user, request, body.device_id);
  return { user: publicUser(user), cookie };
}

// Fehlversuch zählen (Passwort oder Code); ab LOCK_AFTER Sperre für LOCK_MINUTES. Liefert den Sperrzeitpunkt oder null.
// Atomar in der Datenbank gezählt (17.10.2026): vorher Lesen → +1 → Schreiben; parallele Fehlversuche (lange Passwort-Prüfung)
// lasen alle denselben Stand – 30 gleichzeitige falsche Passwörter ergaben 1 Fehlversuch, keine Sperre. Eine gesetzte Sperre
// wird nie mit NULL überschrieben.
async function recordFailure(env, username) {
  const now = nowIso();
  const r = await env.DB.prepare(`INSERT INTO login_attempts(key,failures,locked_until,updated_at) VALUES (?1,1,NULL,?2)
    ON CONFLICT(key) DO UPDATE SET failures=login_attempts.failures+1, updated_at=?2 RETURNING failures`).bind(username, now).first();
  if (!r || r.failures < LOCK_AFTER) return null;
  const locked = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
  const u = await env.DB.prepare('UPDATE login_attempts SET locked_until=?1, failures=0, updated_at=?2 WHERE key=?3 AND failures>=?4')
    .bind(locked, now, username, LOCK_AFTER).run();
  return u.meta && u.meta.changes ? locked : null;
}
// IP-Fehlversuchsfenster (gilt für Passwort und Zwei-Faktor-Code)
async function ipFailWindow(env, request) {
  const ik = await ipKey(request);
  const win = Math.floor(Date.now() / 1000 / IP_FAIL_LIMIT.windowSec) * IP_FAIL_LIMIT.windowSec;
  return { ik, win };
}
async function ipLimited(env, ik, win) {
  const ipRow = await env.DB.prepare('SELECT count FROM rate_limits WHERE key = ? AND window_start = ?').bind(ik, win).first();
  return !!(ipRow && ipRow.count >= IP_FAIL_LIMIT.max);
}
async function recordIpFailure(env, ik, win) {
  const ipc = await env.DB.prepare(`INSERT INTO rate_limits(key, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END, window_start = excluded.window_start
    RETURNING count`).bind(ik, win).first();
  if (ipc && ipc.count === IP_FAIL_LIMIT.max) await audit(env, null, 'login.ip_limited', null, { failures: ipc.count, minutes: IP_FAIL_LIMIT.windowSec / 60 });
}

// Zweiter Schritt der Anmeldung: Code aus der Authenticator-App oder ein Ersatzcode
export async function loginSecondFactor(env, request, body, ctx = null) {
  // IP-Begrenzung wie bei der Passwort-Anmeldung (fehlte beim Code – 17.10.2026)
  const { ik, win } = await ipFailWindow(env, request);
  if (await ipLimited(env, ik, win)) throw new HttpError(429, 'locked', 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.');
  let res;
  try { res = await redeemChallenge(env, body); }
  catch (e) {
    // falscher Code: zählt zur Fehlversuch-Sperre des Kontos (Anmeldevorgang verrät den Benutzer nur serverseitig) und zum IP-Fenster
    if (e instanceof HttpError && e.userRow) {
      await recordIpFailure(env, ik, win);
      const locked = await recordFailure(env, e.userRow.username);
      if (locked) {
        await env.DB.prepare('DELETE FROM login_challenges WHERE user_id=?').bind(e.userRow.id).run();
        await audit(env, null, 'login.locked', e.userRow.id, { username: e.userRow.username, minutes: LOCK_MINUTES, by: 'totp' });
        throw new HttpError(429, 'locked', 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.');
      }
    }
    throw e;
  }
  const { row, factor } = res;
  const att = await env.DB.prepare('SELECT locked_until FROM login_attempts WHERE key = ?').bind(row.username).first();
  if (att && att.locked_until && att.locked_until > nowIso()) throw new HttpError(429, 'locked', 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.');
  await env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(row.username).run();
  const cookie = await createSession(env, row.id, request);
  await audit(env, row.id, 'login', row.id, { factor: factor.kind, ...(factor.kind === 'recovery' ? { recovery_left: factor.left } : {}) });
  await noteLoginDevice(env, ctx, row, request, body.device_id);
  return { user: publicUser(row), cookie, recovery_left: factor.kind === 'recovery' ? factor.left : undefined };
}

export async function logout(env, user) {
  if (user?._session) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(user._session).run();
  return cookieHeader('', 0);
}

// Naheliegende Bestandteile (lokale Liste, keine externe Abfrage): Allerweltswörter, Firma/App, Jahreszeiten, Tastaturfolgen
const COMMON_WORDS = ['passwort', 'password', 'passwd', 'kennwort', 'geheim', 'secret', 'cevik', 'mobility', 'fuhrpark', 'flotte', 'fleet',
  'werkstatt', 'admin', 'administrator', 'root', 'user', 'benutzer', 'login', 'anmelden', 'welcome', 'willkommen', 'hallo', 'hello',
  'test', 'testtest', 'start', 'sommer', 'winter', 'herbst', 'fruehling', 'frühling', 'summer', 'spring', 'autumn', 'januar', 'februar',
  'iloveyou', 'ichliebedich', 'schatz', 'master', 'monkey', 'dragon', 'letmein', 'football', 'fussball', 'fußball', 'lkw', 'truck',
  'trucker', 'fahrer', 'driver', 'dortmund', 'bayern', 'deutschland', 'germany', 'ukraine', 'europa', 'firma', 'company', 'claude',
  'пароль', 'привіт', 'україна', 'kyiv', 'kiew', 'parol'];
const KEY_ROWS = ['abcdefghijklmnopqrstuvwxyz', 'qwertzuiopüasdfghjklöäyxcvbnm', 'qwertyuiopasdfghjklzxcvbnm', 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя', 'йцукенгшщзхїфівапролджєячсмитьбю'];
const isSeq = (x) => x.length >= 3 && KEY_ROWS.some((r) => r.includes(x) || r.includes([...x].reverse().join('')));
// Buchstabenkern ohne naheliegende Bestandteile; bleiben < 3 Buchstaben übrig, ist das Passwort leicht zu erraten
export function passwordCore(pw, names = []) {
  let core = pw.toLowerCase().replace(/[^a-zäöüßа-яіїєґ]/g, '');
  const parts = [...COMMON_WORDS, ...names.flatMap((n) => String(n || '').toLowerCase().split(/[^a-zäöüßа-яіїєґ]+/)).filter((x) => x.length >= 3)]
    .sort((a, b) => b.length - a.length);
  for (const w of parts) core = core.split(w).join('');
  // Tastatur-/Alphabetfolgen (≥ 3 Zeichen, auch rückwärts) entfernen
  let out = ''; let i = 0;
  while (i < core.length) {
    let j = i + 3;
    if (j <= core.length && isSeq(core.slice(i, j))) { while (j < core.length && isSeq(core.slice(i, j + 1))) j++; i = j; continue; }
    out += core[i]; i++;
  }
  return out;
}

export function validatePassword(pw, names = []) {
  if (typeof pw !== 'string' || pw.length < 10) throw bad('weak_password', 'Passwort muss mindestens 10 Zeichen haben.');
  if (pw.length > 200) throw bad('weak_password', 'Passwort ist zu lang.');
  if (!/[A-Za-zÄÖÜäöüßА-Яа-яІіЇїЄєҐґ]/.test(pw) || !/[0-9]/.test(pw)) {
    throw bad('weak_password', 'Passwort braucht Buchstaben und Ziffern.');
  }
  if (new Set(pw.toLowerCase()).size < 5 || passwordCore(pw, names).length < 3) {
    throw bad('common_password', 'Passwort ist zu leicht zu erraten (z. B. Name, Firmenname, „Passwort123“, Tastaturfolgen, Wiederholungen). Bitte ein eigenes Wort oder einen kurzen Satz wählen.');
  }
}

// Einladung anlegen (für neuen oder bestehenden Benutzer ohne Passwort / Passwort-Reset)
export async function createInvite(env, userId, createdBy) {
  const token = randomToken(24);
  const h = await sha256Hex(token);
  const now = nowIso();
  await env.DB.prepare('UPDATE invites SET used_at = ? WHERE user_id = ? AND used_at IS NULL').bind(now, userId).run();
  await env.DB.prepare('INSERT INTO invites(token_hash,user_id,created_by,created_at,expires_at) VALUES (?,?,?,?,?)')
    .bind(h, userId, createdBy, now, new Date(Date.now() + INVITE_DAYS * 86400000).toISOString()).run();
  return token;
}

export async function inviteInfo(env, token) {
  const h = await sha256Hex(String(token || ''));
  const row = await env.DB.prepare(
    'SELECT i.*, u.username, u.display_name, u.role, u.environment, u.active FROM invites i JOIN users u ON u.id=i.user_id WHERE i.token_hash = ?'
  ).bind(h).first();
  // deaktiviertes Konto: Einladung nicht einlösbar (vorher Passwort gesetzt + „Letzte Anmeldung“ trotz Deaktivierung)
  if (!row || row.used_at || row.expires_at < nowIso() || !row.active) throw new HttpError(410, 'invite_invalid', 'Einladung ungültig oder abgelaufen.');
  return { row, hash: h };
}

export async function acceptInvite(env, request, body, ctx = null) {
  const { row, hash } = await inviteInfo(env, body.token);
  validatePassword(body.password, [row.username, row.display_name]);
  const { hash: ph, salt } = await hashPassword(body.password);
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash=?, password_salt=?, updated_at=? WHERE id=?').bind(ph, salt, now, row.user_id),
    env.DB.prepare('UPDATE invites SET used_at=? WHERE token_hash=?').bind(now, hash),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(row.user_id),
    // neues Passwort gesetzt: eine bestehende Fehlversuch-Sperre aufheben
    env.DB.prepare('DELETE FROM login_attempts WHERE key=(SELECT username FROM users WHERE id=?)').bind(row.user_id),
  ]);
  const user = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(row.user_id).first();
  // Neues Passwort ersetzt nicht den zweiten Faktor: mit eingeschalteter Zwei-Faktor-Anmeldung erst nach dem Code anmelden
  if (user.totp_enabled_at) return { second_factor: 'totp', challenge: await createChallenge(env, user.id) };
  const cookie = await createSession(env, row.user_id, request);
  await audit(env, user.id, 'invite.accept', user.id, null); // zählt als Anmeldung (Benutzerliste „Letzte Anmeldung“)
  await noteLoginDevice(env, ctx, user, request, body.device_id);
  return { user: publicUser(user), cookie };
}

export async function changePassword(env, user, body) {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
  const { hash } = await hashPassword(String(body.old_password || ''), row.password_salt);
  if (!timingSafeEqual(hash, row.password_hash || '')) throw new HttpError(401, 'invalid_login', 'Altes Passwort falsch.');
  validatePassword(body.new_password, [row.username, row.display_name]);
  const { hash: ph, salt } = await hashPassword(body.new_password);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash=?, password_salt=?, updated_at=? WHERE id=?').bind(ph, salt, nowIso(), user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash != ?').bind(user.id, user._session),
  ]);
  await audit(env, user.id, 'password.change', user.id, null);
  return { ok: true };
}

// ---- Eigene Anmeldungen (Geräte): ansehen, einzeln oder alle anderen abmelden ----
export function deviceFromUa(ua = '') {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : null;
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : null;
  return [br, os].filter(Boolean).join(' · ') || 'Unbekanntes Gerät';
}
// ---- Anmelde-Hinweis bei neuem Gerät ----
// Die App erzeugt je Browser eine zufällige Gerätekennung (localStorage, bleibt beim Abmelden erhalten) und sendet sie bei der Anmeldung mit.
// Gespeichert wird nur ihr Hash je Konto. Meldet sich jemand auf einem Gerät an, das für dieses Konto unbekannt ist (oder ohne Kennung),
// und hat das Konto schon mindestens ein bekanntes Gerät, bekommt die Person einen Hinweis (App + Push) und das Protokoll „login.new_device“.
// Erste Anmeldung überhaupt: kein Hinweis. Kein Versand außerhalb der App.
export const KNOWN_DEVICES_MAX = 20;
export const KNOWN_DEVICE_DAYS = 400;
const DEVICE_ID_RE = /^[0-9a-f]{32,64}$/;
async function noteLoginDevice(env, ctx, userRow, request, deviceId) {
  const now = nowIso();
  const h = typeof deviceId === 'string' && DEVICE_ID_RE.test(deviceId) ? await sha256Hex('cfp-dev:' + deviceId) : null;
  const label = deviceFromUa(request.headers.get('user-agent') || '');
  const since = new Date(Date.now() - KNOWN_DEVICE_DAYS * 86400000).toISOString();
  const r = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(device_hash = ?), 0) AS known FROM known_devices WHERE user_id=? AND last_seen >= ?')
    .bind(h, userRow.id, since).first();
  if (h) {
    const st = [env.DB.prepare(`INSERT INTO known_devices(user_id, device_hash, label, first_seen, last_seen) VALUES (?,?,?,?,?)
      ON CONFLICT(user_id, device_hash) DO UPDATE SET last_seen=excluded.last_seen, label=excluded.label`).bind(userRow.id, h, label, now, now)];
    if (!r.known) st.push(env.DB.prepare(`DELETE FROM known_devices WHERE user_id=?1 AND device_hash NOT IN
      (SELECT device_hash FROM known_devices WHERE user_id=?1 ORDER BY last_seen DESC LIMIT ${KNOWN_DEVICES_MAX})`).bind(userRow.id));
    await env.DB.batch(st);
  }
  if (r.known || !r.n) return false;
  const text = (l) => ({ title: nt(l, 'new_login'), body: nt(l, 'new_login_body').replace('{d}', label === 'Unbekanntes Gerät' ? nt(l, 'unknown_device') : label).replace('{t}', berlinDateTimeLang(now, l)) });
  try {
    await notifyUsers(env, ctx, userRow.environment, [userRow.id], { kind: 'new_login', ...text('de'), localize: text, langOf: new Map([[userRow.id, userRow.language]]),
      eventKey: `new_login:${userRow.id}:${now}` });
  } catch (e) { console.error('new_login notify', e); } // Hinweis darf die Anmeldung nie verhindern
  await audit(env, userRow.id, 'login.new_device', userRow.id, { device: label, device_id: h ? 'neu' : 'fehlt' });
  return true;
}
// Sitzung lebt (gleiche Regel wie getSessionUser): nicht abgelaufen und – bei eingestellter Leerlauf-Abmeldung je Rolle,
// mindestens 5 Minuten – zuletzt innerhalb dieser Zeit genutzt. s = sessions, u = users, now = Platzhalter für die aktuelle Zeit (ISO).
// Vorher zählten Benutzerliste/„Meine Geräte“ nach Leerlauf abgemeldete Sitzungen bis zu 30 Tage als aktiv (17.10.2026).
export function sessionAliveSql(now) {
  return `(s.expires_at > ${now} AND NOT EXISTS (SELECT 1 FROM settings st WHERE st.key = CASE WHEN u.role='workshop' THEN 'idle_logout_workshop_min' ELSE 'idle_logout_other_min' END
    AND CAST(st.value AS REAL) > 0 AND s.last_seen < strftime('%Y-%m-%dT%H:%M:%fZ', ${now}, '-' || (MAX(CAST(st.value AS REAL), 5) * 60) || ' seconds')))`;
}
const SID_LEN = 16; // Kurzkennung = Anfang des Token-Hashes (aus ihr lässt sich kein Token ableiten)
export async function listOwnSessions(env, user) {
  const rows = (await env.DB.prepare(`SELECT s.token_hash, s.created_at, s.last_seen, s.expires_at, s.user_agent FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.user_id=?1 AND ${sessionAliveSql('?2')} ORDER BY s.last_seen DESC`).bind(user.id, nowIso()).all()).results;
  return rows.map((r) => ({ id: r.token_hash.slice(0, SID_LEN), device: deviceFromUa(r.user_agent || ''), created_at: r.created_at, last_seen: r.last_seen,
    expires_at: r.expires_at, current: r.token_hash === user._session }));
}
export async function revokeOwnSession(env, user, sid) {
  if (!/^[0-9a-f]{16}$/.test(String(sid))) throw bad('invalid_session', 'Ungültige Anmeldung.');
  if (user._session.startsWith(sid)) throw bad('current_session', 'Die aktuelle Anmeldung bitte über „Abmelden“ beenden.');
  const r = await env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND substr(token_hash,1,16)=?').bind(user.id, sid).run();
  if (r.meta.changes) await audit(env, user.id, 'session.revoke', user.id, { count: r.meta.changes });
  return { ok: true, revoked: r.meta.changes };
}
// ---- Bekannte Geräte (für den Anmelde-Hinweis) – eigene Liste, einzelne vergessen ----
// Kurzkennung = Anfang des Hashes. „Dieses Gerät“ über den Header x-cfp-device (Gerätekennung aus dem Browser, wird nur gehasht verglichen).
// Das aktuelle Gerät kann nicht vergessen werden – sonst bliebe evtl. kein bekanntes Gerät, und die nächste Anmeldung wäre wieder „erste Anmeldung“ (ohne Hinweis).
async function currentDeviceHash(request) {
  const d = request && request.headers.get('x-cfp-device');
  return typeof d === 'string' && DEVICE_ID_RE.test(d) ? sha256Hex('cfp-dev:' + d) : null;
}
export async function listKnownDevices(env, user, request) {
  const cur = await currentDeviceHash(request);
  const since = new Date(Date.now() - KNOWN_DEVICE_DAYS * 86400000).toISOString();
  const rows = (await env.DB.prepare('SELECT device_hash, label, first_seen, last_seen FROM known_devices WHERE user_id=? AND last_seen >= ? ORDER BY last_seen DESC')
    .bind(user.id, since).all()).results;
  return rows.map((r) => ({ id: r.device_hash.slice(0, SID_LEN), device: r.label || 'Unbekanntes Gerät', first_seen: r.first_seen, last_seen: r.last_seen, current: !!cur && r.device_hash === cur }));
}
export async function forgetKnownDevice(env, user, request, did) {
  if (!/^[0-9a-f]{16}$/.test(String(did))) throw bad('invalid_device', 'Ungültiges Gerät.');
  const cur = await currentDeviceHash(request);
  if (cur && cur.startsWith(did)) throw bad('current_device', 'Dieses Gerät kann nicht vergessen werden.');
  const row = await env.DB.prepare('SELECT label FROM known_devices WHERE user_id=? AND substr(device_hash,1,16)=?').bind(user.id, did).first();
  if (!row) throw new HttpError(404, 'not_found', 'Gerät nicht gefunden.');
  const r = await env.DB.prepare('DELETE FROM known_devices WHERE user_id=? AND substr(device_hash,1,16)=?').bind(user.id, did).run();
  await audit(env, user.id, 'user.forget_device', user.id, { device: row.label || null, count: r.meta.changes });
  return { ok: true, forgotten: r.meta.changes };
}
export async function revokeOtherSessions(env, user) {
  const r = await env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash != ?').bind(user.id, user._session).run();
  await audit(env, user.id, 'session.revoke_others', user.id, { count: r.meta.changes });
  return { ok: true, revoked: r.meta.changes };
}

// ---- Benutzerverwaltung (owner; fleet darf driver/workshop/viewer in eigener Umgebung anlegen) ----
const FLEET_MAY_CREATE = ['driver', 'workshop', 'viewer'];

export async function createUser(env, actor, body) {
  const role = oneOf(body.role, ROLES, 'Rolle');
  let environment = oneOf(body.environment || actor.environment, ENVS, 'Umgebung');
  if (actor.role === 'fleet') {
    if (!FLEET_MAY_CREATE.includes(role)) throw forbidden('Fuhrparkleitung darf nur Fahrer, Werkstatt und Leser anlegen.');
    environment = actor.environment;
  } else if (actor.role !== 'owner') {
    throw forbidden();
  }
  const username = str(body.username, { required: true, max: 64, field: 'Benutzername' }).toLowerCase();
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) throw bad('validation', 'Benutzername: 3–64 Zeichen, nur a–z, 0–9, Punkt, Bindestrich, Unterstrich.');
  const display = str(body.display_name, { required: true, max: 120, field: 'Name' });
  let site = null;
  if (role === 'workshop') {
    site = str(body.workshop_site, { required: true, max: 20, field: 'Werkstatt' });
    const ws = await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(site).first();
    if (!ws) throw bad('validation', 'Unbekannte Werkstatt.');
  }
  const exists = await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(username).first();
  if (exists) throw new HttpError(409, 'username_taken', 'Benutzername ist bereits vergeben.');
  const id = uuid();
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO users(id,username,display_name,role,environment,workshop_site,employee_number,active,created_by,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,1,?,?,?)`).bind(id, username, display, role, environment, site, str(body.employee_number, { max: 30 }), actor.id, now, now).run();
  const token = await createInvite(env, id, actor.id);
  await audit(env, actor.id, 'user.create', id, { role, environment, username });
  return { id, username, invite_token: token };
}

export async function updateUser(env, actor, userId, body) {
  const target = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
  if (!target) throw new HttpError(404, 'not_found', 'Benutzer nicht gefunden.');
  if (actor.role === 'fleet') {
    if (target.environment !== actor.environment || !FLEET_MAY_CREATE.includes(target.role)) throw forbidden();
    if (body.role && !FLEET_MAY_CREATE.includes(body.role)) throw forbidden();
    if (body.environment && body.environment !== actor.environment) throw forbidden();
  } else if (actor.role !== 'owner') throw forbidden();
  if (target.id === actor.id && (body.active === false || (body.role && body.role !== actor.role))) {
    throw bad('validation', 'Eigene Rolle/Aktivierung kann nicht selbst geändert werden.');
  }
  const role = body.role ? oneOf(body.role, ROLES, 'Rolle') : target.role;
  const environment = body.environment ? oneOf(body.environment, ENVS, 'Umgebung') : target.environment;
  const active = body.active === undefined ? target.active : (body.active ? 1 : 0);
  const display = body.display_name !== undefined && body.display_name !== null && body.display_name !== '' ? str(body.display_name, { required: true, max: 120, field: 'Name' }) : target.display_name; // nur Leerzeichen/[] → 400 statt NOT-NULL-Fehler
  const site = role === 'workshop' ? (body.workshop_site !== undefined && body.workshop_site !== null ? str(body.workshop_site, { max: 20, field: 'Werkstatt' }) : target.workshop_site) : null;
  if (role === 'workshop' && !site) throw bad('validation', 'Werkstatt ist für Rolle Werkstatt erforderlich.');
  // neue/geänderte Werkstatt wie beim Anlegen prüfen (vorher beliebiger Code gespeichert → Werkstattkonto sah keine Aufträge)
  if (role === 'workshop' && (site !== target.workshop_site || target.role !== 'workshop')
    && !(await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(site).first())) throw bad('validation', 'Unbekannte Werkstatt.');
  const now = nowIso();
  const stmts = [env.DB.prepare('UPDATE users SET role=?, environment=?, active=?, display_name=?, workshop_site=?, updated_at=? WHERE id=?')
    .bind(role, environment, active, display, site, now, userId)];
  // Rollen-/Umgebungswechsel oder Deaktivierung entwertet Sitzungen und Push-Geräte
  if (role !== target.role || environment !== target.environment || !active) {
    stmts.push(env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId));
    stmts.push(env.DB.prepare('UPDATE push_subscriptions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').bind(now, userId));
  }
  // Rollen-/Umgebungswechsel: Hinweise der bisherigen Rolle ausblenden (nicht löschen) – sonst sah z. B. ein neuer Fahrer kritische
  // Leitungs-Hinweise samt Vorgang und bekam fehlgeschlagene Pushs nachgereicht (17.10.2026, Migration 0056)
  if (role !== target.role || environment !== target.environment) stmts.push(env.DB.prepare('UPDATE notifications SET hidden_at=? WHERE user_id=? AND hidden_at IS NULL').bind(now, userId));
  // … sowie laufende Fahrzeugzuordnungen beenden (Verlauf bleibt): sonst galt das Konto in der neuen Umgebung als „zugeordnet“ (Fahrzeugakte,
  // Hinweise, Reifendaten), ein deaktiviertes Konto blieb Fahrer des Fahrzeugs; Fahrerakte der alten Umgebung gibt das Konto frei (17.10.2026)
  if (role !== target.role || environment !== target.environment || !active) stmts.push(env.DB.prepare('UPDATE driver_vehicles SET valid_to=? WHERE user_id=? AND (valid_to IS NULL OR valid_to > ?)').bind(now, userId, now));
  if (role !== target.role || environment !== target.environment) stmts.push(env.DB.prepare(`UPDATE drivers SET user_id=NULL, updated_at=? WHERE user_id=? AND (environment<>? OR ?<>'driver')`).bind(now, userId, environment, role));
  await env.DB.batch(stmts);
  // geänderte Felder als alt → neu (Protokoll-Ansicht zeigt „geändert: Rolle Fahrer → Werkstatt“); Grundfelder bleiben wie bisher
  const changed = {};
  for (const [k, a, b] of [['role', target.role, role], ['environment', target.environment, environment], ['active', !!target.active, !!active], ['display_name', target.display_name, display], ['workshop_site', target.workshop_site || null, site || null]]) if (a !== b) changed[k] = { from: a, to: b };
  await audit(env, actor.id, 'user.update', userId, { role, environment, active, ...(Object.keys(changed).length ? { changed } : {}) });
  return { ok: true, changed: Object.keys(changed), sessions_ended: role !== target.role || environment !== target.environment || !active };
}

export async function resetInvite(env, actor, userId) {
  const target = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
  if (!target) throw new HttpError(404, 'not_found', 'Benutzer nicht gefunden.');
  if (actor.role === 'fleet' && (target.environment !== actor.environment || !FLEET_MAY_CREATE.includes(target.role))) throw forbidden();
  if (!['owner', 'fleet'].includes(actor.role)) throw forbidden();
  const token = await createInvite(env, userId, actor.id);
  await audit(env, actor.id, 'user.invite_reset', userId, null);
  return { invite_token: token };
}

export async function listUsers(env, actor) {
  if (!['owner', 'fleet'].includes(actor.role)) throw forbidden();
  const kdSince = new Date(Date.now() - KNOWN_DEVICE_DAYS * 86400000).toISOString();
  const cols = `u.id,u.username,u.display_name,u.role,u.environment,u.workshop_site,u.employee_number,u.active,u.created_at,(u.password_hash IS NOT NULL) AS has_password, (u.totp_enabled_at IS NOT NULL) AS has_totp,
    CASE WHEN la.locked_until > ?1 THEN la.locked_until END AS locked_until,
    (SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id AND ${sessionAliveSql('?1')}) AS sessions, (SELECT MAX(s.last_seen) FROM sessions s WHERE s.user_id=u.id) AS last_seen,
    (SELECT COUNT(*) FROM push_subscriptions p WHERE p.user_id=u.id AND p.revoked_at IS NULL) AS push_devices,
    (SELECT COUNT(*) FROM known_devices k WHERE k.user_id=u.id AND k.last_seen >= ?3) AS known_devices,
    (SELECT MAX(a.created_at) FROM audit_log a WHERE a.target=u.id AND a.action IN ('login', 'invite.accept')) AS last_login,
    CASE WHEN u.password_hash IS NULL THEN (SELECT MAX(i.expires_at) FROM invites i WHERE i.user_id=u.id AND i.used_at IS NULL) END AS invite_expires_at`;
  const q = actor.role === 'owner'
    ? env.DB.prepare(`SELECT ${cols} FROM users u LEFT JOIN login_attempts la ON la.key=u.username ORDER BY u.environment, u.role, u.display_name`).bind(nowIso(), null, kdSince)
    : env.DB.prepare(`SELECT ${cols} FROM users u LEFT JOIN login_attempts la ON la.key=u.username WHERE u.environment=?2 ORDER BY u.role, u.display_name`).bind(nowIso(), actor.environment, kdSince);
  return (await q.all()).results;
}

// Fehlversuch-Sperre vorzeitig aufheben (gleiche Rechte wie neue Einladung)
export async function unlockUser(env, actor, userId) {
  const target = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
  if (!target) throw new HttpError(404, 'not_found', 'Benutzer nicht gefunden.');
  if (!['owner', 'fleet'].includes(actor.role)) throw forbidden();
  if (actor.role === 'fleet' && (target.environment !== actor.environment || !FLEET_MAY_CREATE.includes(target.role))) throw forbidden();
  const r = await env.DB.prepare('DELETE FROM login_attempts WHERE key=?').bind(target.username).run();
  await audit(env, actor.id, 'user.unlock', userId, null);
  return { ok: true, unlocked: r.meta.changes > 0 };
}

// Alle Anmeldungen eines Benutzers beenden (z. B. Gerät verloren): Sitzungen löschen und Push-Geräte abmelden,
// damit keine Hinweise mehr auf dem verlorenen Gerät erscheinen. Gleiche Rechte wie „Sperre aufheben“; eigene Sitzungen über „Mein Konto“.
export async function revokeUserSessions(env, actor, userId) {
  const target = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
  if (!target) throw new HttpError(404, 'not_found', 'Benutzer nicht gefunden.');
  if (!['owner', 'fleet'].includes(actor.role)) throw forbidden();
  if (target.id === actor.id) throw bad('validation', 'Eigene Anmeldungen bitte unter „Mein Konto“ beenden.');
  if (actor.role === 'fleet' && (target.environment !== actor.environment || !FLEET_MAY_CREATE.includes(target.role))) throw forbidden();
  const now = nowIso();
  const [s, p] = await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId),
    env.DB.prepare('UPDATE push_subscriptions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').bind(now, userId),
  ]);
  await audit(env, actor.id, 'user.revoke_sessions', userId, { sessions: s.meta.changes, push_devices: p.meta.changes });
  return { ok: true, sessions: s.meta.changes, push_devices: p.meta.changes };
}

// Erst-Einrichtung: nur solange noch kein Benutzer existiert und mit SETUP_CODE (Cloudflare-Secret)
export async function setupFirstOwner(env, body) {
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first();
  if (count.n > 0) throw new HttpError(410, 'setup_done', 'Einrichtung bereits abgeschlossen.');
  if (!env.SETUP_CODE || !timingSafeEqual(String(body.setup_code || '').trim(), env.SETUP_CODE)) {
    throw new HttpError(401, 'invalid_setup_code', 'Einrichtungscode falsch.');
  }
  const username = str(body.username, { required: true, max: 64, field: 'Benutzername' }).toLowerCase();
  if (!/^[a-z0-9._-]{3,64}$/.test(username)) throw bad('validation', 'Ungültiger Benutzername.');
  const id = uuid();
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO users(id,username,display_name,role,environment,active,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)`)
    .bind(id, username, str(body.display_name, { required: true, max: 120, field: 'Name' }), 'owner', 'production', now, now).run();
  const token = await createInvite(env, id, null);
  await audit(env, null, 'setup.owner', id, { username });
  return { invite_token: token };
}

export async function audit(env, actorId, action, target, detail) {
  await env.DB.prepare('INSERT INTO audit_log(id,actor_id,action,target,detail,created_at) VALUES (?,?,?,?,?,?)')
    .bind(uuid(), actorId, action, target, detail ? JSON.stringify(detail) : null, nowIso()).run();
}

// Umgebung, in der der Benutzer arbeitet. Nur owner darf per Header/Parameter in 'test' schauen.
export function effectiveEnv(user, request) {
  if (user.role === 'owner') {
    const want = request.headers.get('x-cfp-env') || new URL(request.url).searchParams.get('env');
    if (want === 'test' || want === 'production') return want;
  }
  return user.environment;
}

// Protokoll (nur Inhaber): wer hat wann was geändert/exportiert; Details ohne Geheimnisse

// Protokoll-Suche: Kennung, Details, Name/Benutzername der handelnden Person; Groß-/Kleinschreibung auch bei Kyrillisch/Umlauten egal
// Protokoll je Person: Einträge, die sie ausgelöst hat (actor_id) oder die ihr Konto betreffen (target, z. B. Anmeldung, Rollenänderung)
function auditUser(query, where, args) {
  if (query.user === undefined || query.user === '') return null;
  const id = String(query.user);
  if (!/^[\w-]{1,64}$/.test(id)) throw bad('validation', 'Unbekannte Person.');
  // zusätzlich Fahrerzuordnungen der Person (Ziel = Fahrzeug, Person im Detail „driver“) – über idx_dv_user und idx_audit_target_action
  where.push(`(a.actor_id = ? OR a.target = ? OR (a.target IN (SELECT vehicle_id FROM driver_vehicles WHERE user_id = ?) AND a.action IN ('vehicle.assign_driver', 'vehicle.end_assignment') AND CASE WHEN json_valid(a.detail) THEN json_extract(a.detail, '$.driver') END = ?))`);
  args.push(id, id, id, id);
  return id;
}
// Protokoll je Fahrzeug: Einträge mit dem Fahrzeug als Ziel (Stammdaten, Status, Bewertung, Prüftermine, Fahrerzuordnung, Hinweise, Telematik)
function auditVehicle(query, where, args) {
  if (query.vehicle === undefined || query.vehicle === '') return null;
  const id = String(query.vehicle);
  if (!/^VIN:[A-Z0-9]{1,40}$/.test(id)) throw bad('validation', 'Unbekanntes Fahrzeug.');
  where.push('a.target = ?'); args.push(id);
  return id;
}
async function auditVehicleRow(env, id) {
  if (!id) return null;
  const v = await env.DB.prepare('SELECT id, plate FROM vehicles WHERE id=?').bind(id).first();
  if (!v) throw new HttpError(404, 'not_found', 'Unbekanntes Fahrzeug.');
  return v;
}
async function auditPerson(env, id) {
  if (!id) return null;
  const p = await env.DB.prepare('SELECT id, display_name, username FROM users WHERE id=?').bind(id).first();
  if (!p) throw new HttpError(404, 'not_found', 'Unbekannte Person.');
  return p;
}
function auditQ(qs, where, args) {
  const vs = caseVariants(qs);
  // auch im betroffenen Konto (Name/Benutzername) und Fahrzeug (Kennzeichen) – z. B. HU/SP-Neuberechnung ohne Kennzeichen im Detail
  where.push('(' + vs.map(() => "a.target LIKE ? ESCAPE '\\' OR a.detail LIKE ? ESCAPE '\\' OR u.username LIKE ? ESCAPE '\\' OR u.display_name LIKE ? ESCAPE '\\' OR tu.username LIKE ? ESCAPE '\\' OR tu.display_name LIKE ? ESCAPE '\\' OR tv.plate LIKE ? ESCAPE '\\'").join(' OR ') + ')');
  for (const v of vs) args.push(...Array(7).fill(likeEsc(v)));
}
// Bereich: ein Aktions-Präfix oder mehrere, durch Komma getrennt (z. B. „invite.,password.,totp.“ für Zugang & Sicherheit), höchstens 8 × 40 Zeichen
function auditPrefix(query) {
  if (!query.action) return null;
  const list = [...new Set(String(query.action).slice(0, 400).split(',').map((x) => x.trim().slice(0, 40)).filter(Boolean))].slice(0, 8);
  return list.length ? list.join(',') : null;
}
function auditPrefixWhere(prefix, where, args, esc) {
  const list = prefix.split(',');
  where.push('(' + list.map(() => "a.action LIKE ? ESCAPE '\\'").join(' OR ') + ')');
  for (const p of list) args.push(esc(p) + '%');
}
export async function listAudit(env, user, query = {}) {
  if (user.role !== 'owner') throw new HttpError(403, 'forbidden', 'Nur der Inhaber sieht das Protokoll.');
  const limit = intParam(query.limit, 200, 1, 1000);
  const prefix = auditPrefix(query);
  let before = query.before && /^\d{4}-\d{2}-\d{2}T/.test(query.before) ? query.before : '9999';
  // „bis Datum“ (Berliner Kalendertag einschließlich) – nur wenn kein späterer Blätter-Zeitpunkt gesetzt ist
  if (query.until !== undefined && query.until !== '') {
    if (!isCalendarDate(query.until)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
    const end = berlinDayStartIso(new Date(Date.parse(query.until + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10));
    if (end < before) before = end;
  }
  // Suche in Kennung (target), Details und handelnder Person (Name/Benutzername), z. B. Kennzeichen, FIN; Platzhalter wirkungslos
  const qs = String(query.q || '').trim().slice(0, 60);
  const esc = (x) => x.replace(/[%_\\]/g, (c) => '\\' + c);
  const where = ['a.created_at < ?']; const args = [before];
  if (prefix) auditPrefixWhere(prefix, where, args, esc);
  if (qs.length >= 2) auditQ(qs, where, args);
  const person = await auditPerson(env, auditUser(query, where, args));
  const vehicle = await auditVehicleRow(env, auditVehicle(query, where, args));
  // Betroffenes Konto bzw. Fahrzeug (target) zur Anzeige auflösen – je Eintrag zwei Primärschlüssel-Zugriffe, keine Zusatzabfrage
  const rows = (await env.DB.prepare(`SELECT a.id, a.action, a.target, a.detail, a.created_at, a.actor_id, u.display_name AS actor_name, u.username AS actor_username,
    tu.display_name AS target_name, tu.username AS target_username, tv.plate AS target_plate
    FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN users tu ON tu.id=a.target LEFT JOIN vehicles tv ON tv.id=a.target WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC LIMIT ?`)
    .bind(...args, limit).all()).results;
  const entries = rows.map((r) => { let detail = null; try { detail = r.detail ? JSON.parse(r.detail) : null; } catch { detail = r.detail; } return { ...r, detail }; });
  await auditDetailRefs(env, entries);
  return { entries, person, vehicle };
}

// Kennungen in Details (Fahrer/Person = Konto-ID, Fahrzeug = Fahrzeug-ID) zur Anzeige auflösen: je Eintrag `refs` {Schlüssel: Name bzw. Kennzeichen}.
// Nur oberste Ebene, nur wenn die Kennung existiert (z. B. „vehicle“ mit Kennzeichen statt ID bleibt unverändert). Gesammelt in höchstens
// wenigen Abfragen (je 90 Kennungen eine, als Stapel); Detail selbst bleibt unverändert (CSV/Suche = Rohtext).
export const AUDIT_REF_KEYS = { driver: 'u', user: 'u', vehicle: 'v', vehicle_id: 'v' };
async function auditDetailRefs(env, entries) {
  const ids = { u: new Set(), v: new Set() };
  for (const e of entries) {
    if (!e.detail || typeof e.detail !== 'object' || Array.isArray(e.detail)) continue;
    for (const [k, kind] of Object.entries(AUDIT_REF_KEYS)) { const v = e.detail[k]; if (typeof v === 'string' && v && v.length <= 80) ids[kind].add(v); }
  }
  const stmts = [];
  for (const [kind, sql] of [['u', 'SELECT id, COALESCE(NULLIF(display_name, \'\'), username) AS l FROM users WHERE id IN'], ['v', 'SELECT id, plate AS l FROM vehicles WHERE id IN']]) {
    const list = [...ids[kind]];
    for (let i = 0; i < list.length; i += 90) { const part = list.slice(i, i + 90); stmts.push([kind, env.DB.prepare(`${sql} (${part.map(() => '?').join(',')})`).bind(...part)]); }
  }
  if (!stmts.length) return;
  const res = await env.DB.batch(stmts.map((s) => s[1]));
  const map = { u: new Map(), v: new Map() };
  res.forEach((r, i) => { for (const row of r.results || []) if (row.l) map[stmts[i][0]].set(row.id, row.l); });
  for (const e of entries) {
    if (!e.detail || typeof e.detail !== 'object' || Array.isArray(e.detail)) continue;
    const refs = {};
    for (const [k, kind] of Object.entries(AUDIT_REF_KEYS)) { const v = e.detail[k]; if (typeof v === 'string' && map[kind].has(v)) refs[k] = map[kind].get(v); }
    if (Object.keys(refs).length) e.refs = refs;
  }
}

// Protokoll als CSV (nur Inhaber): Zeitraum nach Berliner Kalendertagen (max. 366 Tage), optional Bereich (Präfix wie in der Ansicht),
// älteste zuerst, höchstens AUDIT_CSV_MAX Zeilen (eine mehr gelesen → truncated). Details unverändert als Text (enthalten keine Geheimnisse).
export const AUDIT_CSV_MAX = 20000;
export async function auditCsv(env, user, query, csvCell) {
  if (user.role !== 'owner') throw new HttpError(403, 'forbidden', 'Nur der Inhaber sieht das Protokoll.');
  const today = berlinDate();
  const from = query.from || today.slice(0, 8) + '01'; const to = query.to || today;
  if (!isCalendarDate(from) || !isCalendarDate(to)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
  if (from > to) throw bad('validation', '„Von“ liegt nach „bis“.');
  const next = new Date(Date.parse(to + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
  if ((Date.parse(next) - Date.parse(from)) / 86400000 > 366) throw bad('validation', 'Höchstens ein Jahr je Export.');
  const lo = berlinDayStartIso(from); const hi = berlinDayStartIso(next);
  const prefix = auditPrefix(query);
  const qs = String(query.q || '').trim().slice(0, 60);
  const esc = (x) => x.replace(/[%_\\]/g, (c) => '\\' + c);
  const where = ['a.created_at >= ?', 'a.created_at < ?']; const args = [lo, hi];
  if (prefix) auditPrefixWhere(prefix, where, args, esc);
  if (qs.length >= 2) auditQ(qs, where, args);
  const person = await auditPerson(env, auditUser(query, where, args));
  const vehicle = await auditVehicleRow(env, auditVehicle(query, where, args));
  const rows = (await env.DB.prepare(`SELECT a.action, a.target, a.detail, a.created_at, u.display_name AS actor_name, u.username AS actor_username,
    COALESCE(tv.plate, tu.display_name, tu.username) AS target_label
    FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN users tu ON tu.id=a.target LEFT JOIN vehicles tv ON tv.id=a.target WHERE ${where.join(' AND ')}
    ORDER BY a.created_at, a.rowid LIMIT ?`).bind(...args, AUDIT_CSV_MAX + 1).all()).results;
  const truncated = rows.length > AUDIT_CSV_MAX; if (truncated) rows.length = AUDIT_CSV_MAX;
  const lines = [['Zeitpunkt', 'Aktion', 'Person', 'Benutzername', 'Betrifft (Kennung)', 'Betrifft', 'Details'].join(';')];
  for (const r of rows) lines.push([berlinDateTime(r.created_at), csvCell(r.action), csvCell(r.actor_name || (r.actor_username ? '' : 'System')), csvCell(r.actor_username), csvCell(r.target), csvCell(r.target_label), csvCell(r.detail)].join(';'));
  return { csv: '\uFEFF' + lines.join('\r\n') + '\r\n', rows: rows.length, truncated, from, to, prefix, q: qs.length >= 2, person, vehicle };
}

// Kurzlebige Tabellen aufräumen (Cron): abgelaufene Sitzungen, alte Zählerfenster, alte Fehlversuche ohne aktive Sperre
export async function cleanupShortLived(env) {
  const now = nowIso();
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    // nach Leerlauf abgemeldete Sitzungen (sonst erst nach 30 Tagen weg)
    env.DB.prepare(`DELETE FROM sessions WHERE token_hash IN (SELECT s.token_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE NOT ${sessionAliveSql('?1')})`).bind(now),
    env.DB.prepare('DELETE FROM rate_limits WHERE window_start < ?').bind(Math.floor(Date.now() / 1000) - 2 * 86400),
    env.DB.prepare('DELETE FROM login_attempts WHERE updated_at < ? AND (locked_until IS NULL OR locked_until < ?)').bind(dayAgo, now),
    env.DB.prepare('DELETE FROM login_challenges WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM known_devices WHERE last_seen < ?').bind(new Date(Date.now() - KNOWN_DEVICE_DAYS * 86400000).toISOString()),
  ]);
}
