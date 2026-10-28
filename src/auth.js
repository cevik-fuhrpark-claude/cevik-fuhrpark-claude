// [CLAUDE] Authentifizierung: Einladung -> eigenes Passwort, Sitzungen per HttpOnly-Cookie
import { cutText, cleanText,
  nowIso, uuid, sha256Hex, randomToken, hashPassword, timingSafeEqual, parseCookies,
  bad, forbidden, conflict, laterIso, HttpError, str, oneOf, flag, berlinDayStartIso, berlinDateTime, berlinDateTimeLang, berlinDate, isCalendarDate, likeEsc, caseVariants, intParam, normPlate, PLATE_KEY_SQL } from './util.js';
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
  // last_seen wird nur alle `writeEvery` geschrieben, ist also bis dahin veraltet: abmelden erst nach Leerlauf + writeEvery – sonst endete
  // die Sitzung bis zu ⅓ früher als eingestellt, ohne Vorwarnung der App (18.10.2026: 6 Min. eingestellt, nach 251 s abgemeldet)
  const writeEvery = idleMs ? Math.min(60 * 1000, idleMs / 3) : 10 * 60 * 1000;
  if (row.s_exp < nowIso() || !row.active || (idleMs && idle > idleMs + writeEvery)) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(h).run();
    return null;
  }
  // last_seen höchstens alle 10 Minuten schreiben (bei Leerlauf-Abmeldung häufiger, damit aktive Nutzung zählt)
  // Hintergrund-Abfragen der App (x-cfp-bg: Zahl am Glockensymbol) verlängern die Sitzung nicht – sonst bliebe ein offenes, unbedientes Tablet angemeldet
  if (idle > writeEvery && request.headers.get('x-cfp-bg') !== '1') {
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

// Sitzung nur anlegen, wenn das geprüfte Passwort (pwHash) noch gilt und das Konto aktiv ist (17.10.2026): vorher konnte eine
// Anmeldung mit dem alten Passwort, deren Prüfung (PBKDF2) während eines Passwortwechsels lief, nach dessen „andere Sitzungen beenden“
// eine gültige Sitzung anlegen; ebenso nach Deaktivierung.
// passwordOnly (18.10.2026): Sitzung ohne zweiten Faktor nur, solange die Zwei-Faktor-Anmeldung aus ist – sonst legte eine
// Passwort-Anmeldung, deren Prüfung lief, während die Person die Zwei-Faktor-Anmeldung einschaltete, danach eine Sitzung ohne Code an.
// audit: [action, detail] – Anmelde-Protokoll im selben Stapel wie die Sitzung, nur wenn sie angelegt wurde (22.10.2026, Backlog 127d:
// der Eintrag ist Grundlage für „Letzte Anmeldung“ und „lange nicht angemeldet“)
async function createSession(env, userId, request, pwHash, passwordOnly = false, auditAs = null) {
  const token = randomToken(32);
  const h = await sha256Hex(token);
  const now = new Date();
  const exp = new Date(now.getTime() + SESSION_DAYS * 86400000).toISOString();
  const ins = env.DB.prepare(`INSERT INTO sessions(token_hash,user_id,created_at,expires_at,last_seen,user_agent) SELECT ?,?,?,?,?,?
    WHERE EXISTS (SELECT 1 FROM users WHERE id=? AND active=1 AND password_hash=?${passwordOnly ? ' AND totp_enabled_at IS NULL' : ''})`)
    .bind(h, userId, now.toISOString(), exp, now.toISOString(), (request.headers.get('user-agent') || '').slice(0, 200), userId, pwHash || '');
  const r = auditAs ? (await env.DB.batch([ins, env.DB.prepare(`INSERT INTO audit_log(id,actor_id,action,target,detail,created_at) SELECT ?1, ?2, ?3, ?2, ?4, ?5 WHERE EXISTS (SELECT 1 FROM sessions WHERE token_hash=?6)`)
    .bind(uuid(), userId, auditAs[0], auditAs[1] ? JSON.stringify(auditAs[1]) : null, nowIso(), h)]))[0] : await ins.run();
  if (!r.meta || !r.meta.changes) throw new HttpError(401, 'invalid_login', 'Benutzername oder Passwort falsch.');
  return cookieHeader(token, SESSION_DAYS * 86400);
}

// Geteiltes Gerät (Schichtwechsel 22.10.2026): Meldet sich am selben Browser eine andere Person an (Anmeldung, zweiter Faktor,
// Einladung), ohne dass die vorherige sich abgemeldet hat, bleibt deren Sitzung sonst am Server gültig (steht in „Meine Anmeldungen“,
// ihre Push-Geräte werden nicht abgemeldet). Erst NACH erfolgreicher neuer Anmeldung aufrufen; eigene frühere Sitzung bleibt unberührt.
async function endReplacedSession(env, request, newUserId) {
  const token = parseCookies(request.headers.get('cookie'))[COOKIE];
  if (!token) return;
  const h = await sha256Hex(token);
  const old = await env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash=?').bind(h).first();
  if (!old || old.user_id === newUserId) return;
  await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(h), pushOrphanStmt(env, old.user_id),
    auditStmt(env, old.user_id, 'session.replaced', old.user_id, null)]);
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
  // Passwort ungekürzt prüfen (18.10.2026): Einladung/Passwortwechsel speichern es samt Leerzeichen am Rand – str() kürzte nur hier,
  // ein Passwort mit Leerzeichen am Ende sperrte das Konto aus
  const password = typeof body.password === 'string' && body.password.length > 0 && body.password.length <= 200 ? body.password
    : str(body.password, { required: true, max: 200, field: 'Passwort' });
  const ik = await ipKey(request);
  const win = Math.floor(Date.now() / 1000 / IP_FAIL_LIMIT.windowSec) * IP_FAIL_LIMIT.windowSec;
  // Versuch VOR der (langen) Passwortprüfung reservieren – je Netzadresse und je Konto (18.10.2026): vorher wurden Sperre und
  // IP-Fenster nur vorab gelesen; 50 gleichzeitige falsche Passwörter wurden alle geprüft, ein richtiges im selben Schub hob die Sperre auf.
  await reserveIp(env, ik, win);
  await reserveAttempt(env, username);
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  let ok = false;
  if (user && user.active && user.password_hash) {
    const { hash } = await hashPassword(password, user.password_salt);
    ok = timingSafeEqual(hash, user.password_hash);
  } else {
    await hashPassword(password); // gleiche Laufzeit, keine Benutzer-Enumeration
  }
  if (!ok) {
    await finishFailure(env, username, { userId: user ? user.id : null });
    throw new HttpError(401, 'invalid_login', 'Benutzername oder Passwort falsch.');
  }
  // Zwei-Faktor-Anmeldung eingeschaltet: noch keine Sitzung, nur ein kurzlebiger Anmeldevorgang für den Code.
  // Fehlversuche bleiben stehen, bis der Code stimmt (falsche Codes zählen zur selben Sperre wie falsche Passwörter).
  await releaseIp(env, ik, win);
  if (user.totp_enabled_at) {
    await undoAttempt(env, username);
    return { second_factor: 'totp', challenge: await createChallenge(env, user.id, user.password_hash) };
  }
  await clearAttempts(env, username);
  const cookie = await createSession(env, user.id, request, user.password_hash, true, ['login', null]);
  await endReplacedSession(env, request, user.id);
  await noteLoginDevice(env, ctx, user, request, body.device_id);
  return { user: publicUser(user), cookie };
}

// Fehlversuche je Konto (Passwort oder Code), ab LOCK_AFTER Sperre für LOCK_MINUTES. Ablauf seit 18.10.2026:
// reserveAttempt() zählt den Versuch VOR der Prüfung atomar (während einer Sperre wird nicht weitergezählt) und weist ab, wenn das
// Konto gesperrt ist oder schon LOCK_AFTER Versuche offen sind – so werden je Sperrfenster höchstens LOCK_AFTER Versuche geprüft,
// auch bei gleichzeitigen Anfragen. Danach: falsch → finishFailure() (Sperre ab LOCK_AFTER), richtig → clearAttempts() (Zähler weg,
// eine inzwischen gesetzte Sperre bleibt und gilt) bzw. undoAttempt() (nur diese Reservierung zurück, z. B. Passwort richtig, Code folgt).
const lockedErr = () => new HttpError(429, 'locked', 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.');
// Sperre und ihre Folgen (Anmeldevorgänge, ggf. Sitzungen/Push-Geräte, Protokoll) in EINEM Stapel (22.10.2026): vorher getrennt – brach der
// Aufruf nach dem Sperren ab, blieb z. B. die übernommene Sitzung trotz Sperre bestehen und jeder weitere Versuch lieferte nur 429 ohne Folgen.
// Die Folgen greifen nur, wenn DIESER Aufruf die Sperre gesetzt hat (Bedingung: locked_until/updated_at genau dieses Aufrufs).
// opt: { userId, sessions: true (alle Anmeldungen beenden), detail: Protokoll-Zusatz }
async function lockAccount(env, username, minFailures, opt = {}) {
  const now = nowIso(); const locked = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
  const mine = 'EXISTS (SELECT 1 FROM login_attempts WHERE key=?1 AND locked_until=?2 AND updated_at=?3)';
  const uid = opt.userId || null;
  const stmts = [env.DB.prepare('UPDATE login_attempts SET locked_until=?1, failures=0, updated_at=?2 WHERE key=?3 AND failures>=?4 AND (locked_until IS NULL OR locked_until<=?2)')
    .bind(locked, now, username, minFailures)];
  if (uid) stmts.push(env.DB.prepare(`DELETE FROM login_challenges WHERE user_id=?4 AND ${mine}`).bind(username, locked, now, uid));
  if (uid && opt.sessions) stmts.push(env.DB.prepare(`DELETE FROM sessions WHERE user_id=?4 AND ${mine}`).bind(username, locked, now, uid), pushOrphanStmt(env, uid));
  stmts.push(env.DB.prepare(`INSERT INTO audit_log(id,actor_id,action,target,detail,created_at) SELECT ?4, NULL, 'login.locked', ?5, ?6, ?3 WHERE ${mine}`)
    .bind(username, locked, now, uuid(), uid, JSON.stringify({ username, minutes: LOCK_MINUTES, ...(opt.detail || {}) })));
  const r = await env.DB.batch(stmts);
  return r[0] && r[0].meta && r[0].meta.changes ? locked : null;
}
async function reserveAttempt(env, username, opt = {}) {
  const now = nowIso();
  const r = await env.DB.prepare(`INSERT INTO login_attempts(key,failures,locked_until,updated_at) VALUES (?1,1,NULL,?2)
    ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN login_attempts.locked_until > ?2 THEN login_attempts.failures ELSE login_attempts.failures+1 END, updated_at=?2
    RETURNING failures, locked_until`).bind(username, now).first();
  if (r && r.locked_until && r.locked_until > now) throw lockedErr();
  if (r && r.failures > LOCK_AFTER) {
    // mehr gleichzeitige Versuche als erlaubt: sofort sperren (sonst bliebe der Zähler ohne Sperre stehen)
    const u = await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(username).first();
    if (await lockAccount(env, username, LOCK_AFTER + 1, { userId: u ? u.id : null, sessions: !!opt.sessions })) {
      const e = lockedErr(); e.newLock = true; throw e; // Sperre entsteht durch diesen Aufruf
    }
    throw lockedErr();
  }
}
async function finishFailure(env, username, opt = {}) { return lockAccount(env, username, LOCK_AFTER, opt); }
async function undoAttempt(env, username) {
  const now = nowIso();
  await env.DB.prepare('UPDATE login_attempts SET failures=MAX(failures-1,0), updated_at=?2 WHERE key=?1 AND (locked_until IS NULL OR locked_until<=?2)').bind(username, now).run();
}
async function clearAttempts(env, username) {
  const now = nowIso();
  const r = await env.DB.batch([
    env.DB.prepare('DELETE FROM login_attempts WHERE key=?1 AND (locked_until IS NULL OR locked_until<=?2)').bind(username, now),
    env.DB.prepare('SELECT locked_until FROM login_attempts WHERE key=?1 AND locked_until>?2').bind(username, now),
  ]);
  if (r[1] && r[1].results && r[1].results.length) throw lockedErr(); // gleichzeitiger Schub hat inzwischen gesperrt
}
// Push-Geräte beendeter Anmeldungen abmelden (18.10.2026, Migration 0059) – im selben Stapel NACH dem Löschen der Sitzungen ausführen.
// Geräte ohne bekannte Anmeldung (Bestand vor 0059) bleiben unverändert.
export function pushOrphanStmt(env, userId) {
  return env.DB.prepare(`UPDATE push_subscriptions SET revoked_at=?1 WHERE user_id=?2 AND revoked_at IS NULL AND session_hash IS NOT NULL
    AND session_hash NOT IN (SELECT token_hash FROM sessions WHERE user_id=?2)`).bind(nowIso(), userId);
}
const LOCKED_MSG = 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.';
// Bestätigung im angemeldeten Zustand (altes Passwort, Passwort/Code bei Zwei-Faktor): Fehlversuche zählen zur Anmeldesperre (18.10.2026 –
// vorher unbegrenzt: wer eine offene Sitzung übernahm, konnte Passwort/Code durchprobieren). Bei Sperre: alle Anmeldungen enden.
// Seit 18.10.2026 reserviert reauthLocked() den Versuch vor der Prüfung (wie die Anmeldung); bei Erfolg reauthOk(), bei Fehler reauthFailed().
async function usernameOf(env, user) {
  const row = await env.DB.prepare('SELECT username FROM users WHERE id=?').bind(user.id).first();
  return row ? row.username : null;
}
export async function reauthLocked(env, user) {
  const username = await usernameOf(env, user);
  if (username) await reauthReserve(env, user, username);
  return username;
}
async function reauthReserve(env, user, username) {
  try { await reserveAttempt(env, username, { sessions: true }); } catch (e) {
    // Sperre durch zu viele gleichzeitige Versuche: wie bei reauthFailed alle Anmeldungen beenden – nur wenn DIESER Aufruf die Sperre auslöst.
    // Eine schon bestehende Sperre (z. B. von Fremden per Fehlanmeldungen ausgelöst) beendet keine Sitzungen (21.10.2026: sonst warf jeder
    // Passwortwechsel-/Zwei-Faktor-Versuch während einer fremden Sperre die Person von allen Geräten)
    // (Sitzungen enden im Stapel der Sperre, lockAccount mit sessions: true)
    throw e;
  }
}
export async function reauthOk(env, user) {
  const username = await usernameOf(env, user);
  if (username) await undoAttempt(env, username);
}
export async function reauthFailed(env, user) {
  const username = await usernameOf(env, user);
  if (!username) return;
  const locked = await finishFailure(env, username, { userId: user.id, sessions: true });
  if (!locked) return;
  throw new HttpError(429, 'locked', LOCKED_MSG);
}
// IP-Fehlversuchsfenster (gilt für Passwort und Zwei-Faktor-Code)
async function ipFailWindow(env, request) {
  const ik = await ipKey(request);
  const win = Math.floor(Date.now() / 1000 / IP_FAIL_LIMIT.windowSec) * IP_FAIL_LIMIT.windowSec;
  return { ik, win };
}
async function recordIpFailure(env, ik, win) {
  const ipc = await env.DB.prepare(`INSERT INTO rate_limits(key, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END, window_start = excluded.window_start
    RETURNING count`).bind(ik, win).first();
  if (ipc && ipc.count === IP_FAIL_LIMIT.max) await audit(env, null, 'login.ip_limited', null, { failures: ipc.count, minutes: IP_FAIL_LIMIT.windowSec / 60 });
  return ipc ? ipc.count : 0;
}
// IP-Versuch vor der Prüfung zählen (18.10.2026); bei Erfolg wieder abziehen
async function reserveIp(env, ik, win) {
  if (await recordIpFailure(env, ik, win) > IP_FAIL_LIMIT.max) throw lockedErr();
}
async function releaseIp(env, ik, win) {
  await env.DB.prepare('UPDATE rate_limits SET count=MAX(count-1,0) WHERE key=? AND window_start=?').bind(ik, win).run();
}

// Zweiter Schritt der Anmeldung: Code aus der Authenticator-App oder ein Ersatzcode
export async function loginSecondFactor(env, request, body, ctx = null) {
  // IP-Begrenzung wie bei der Passwort-Anmeldung (fehlte beim Code – 17.10.2026)
  const { ik, win } = await ipFailWindow(env, request);
  await reserveIp(env, ik, win);
  // Konto-Versuch VOR der Code-Prüfung reservieren (18.10.2026): vorher wurde die Sperre erst nach einem richtigen Code geprüft –
  // viele parallele Anmeldevorgänge mit je 5 Versuchen ließen hunderte Codes prüfen
  const owner = await env.DB.prepare('SELECT u.username FROM login_challenges c JOIN users u ON u.id=c.user_id WHERE c.token_hash=?').bind(await sha256Hex(String(body.challenge || ''))).first();
  if (owner) await reserveAttempt(env, owner.username);
  let res;
  try { res = await redeemChallenge(env, body); }
  catch (e) {
    // falscher Code: zählt zur Fehlversuch-Sperre des Kontos (Anmeldevorgang verrät den Benutzer nur serverseitig) und zum IP-Fenster
    if (e instanceof HttpError && e.userRow) {
      const locked = await finishFailure(env, e.userRow.username, { userId: e.userRow.id, detail: { by: 'totp' } });
      if (locked) {
        throw new HttpError(429, 'locked', 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.');
      }
    } else if (owner) {
      // abgelaufener Anmeldevorgang (kein Code geprüft): Reservierungen zurück; unbekannte Vorgänge zählen im IP-Fenster
      await undoAttempt(env, owner.username);
      await releaseIp(env, ik, win);
    }
    throw e;
  }
  const { row, factor } = res;
  await releaseIp(env, ik, win);
  await clearAttempts(env, row.username);
  const cookie = await createSession(env, row.id, request, row.password_hash, false, ['login', { factor: factor.kind, ...(factor.kind === 'recovery' ? { recovery_left: factor.left } : {}) }]);
  await endReplacedSession(env, request, row.id);
  await noteLoginDevice(env, ctx, row, request, body.device_id);
  return { user: publicUser(row), cookie, recovery_left: factor.kind === 'recovery' ? factor.left : undefined };
}

export async function logout(env, user, body = {}) {
  // Sitzung beenden und Push-Geräte beendeter Anmeldungen abmelden – auch wenn die App keinen Endpunkt mitsenden konnte (18.10.2026)
  if (user?._session) await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(user._session), pushOrphanStmt(env, user.id)]);
  // Push-Gerät dieses Browsers mit abmelden (die App sendet den Endpunkt mit) – 17.10.2026
  const ep = body && typeof body.push_endpoint === 'string' ? body.push_endpoint.slice(0, 1000) : '';
  if (user && ep) await env.DB.prepare('UPDATE push_subscriptions SET revoked_at=? WHERE endpoint=? AND user_id=? AND revoked_at IS NULL').bind(nowIso(), ep, user.id).run();
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
  if (pw.length > 200) throw bad('password_too_long', 'Passwort ist zu lang (höchstens 200 Zeichen).');
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
  // in einem Stapel: neue Einladung anlegen, alle anderen offenen entwerten – zwei gleichzeitige „Neue Einladung“ ergaben sonst zwei gültige
  // Links (17.10.2026); der zuletzt ausgeführte Stapel gilt
  // nur für ein aktives Konto (21.10.2026: ein gleichzeitig mit „Deaktivieren“ erzeugter Link galt nach Reaktivierung wieder) – Muster cmd_guard
  try {
    await env.DB.batch([
      env.DB.prepare('INSERT INTO invites(token_hash,user_id,created_by,created_at,expires_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM users WHERE id=? AND active=1)')
        .bind(h, userId, createdBy, now, new Date(Date.now() + INVITE_DAYS * 86400000).toISOString(), userId),
      env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()'),
      env.DB.prepare('DELETE FROM cmd_guard'),
      env.DB.prepare('UPDATE invites SET used_at = ? WHERE user_id = ? AND used_at IS NULL AND token_hash <> ?').bind(now, userId, h),
    ]);
  } catch (e) {
    if (String(e && e.message).includes('CHECK')) throw bad('user_inactive', 'Konto ist deaktiviert – erst aktivieren, dann neuen Einladungslink erzeugen.');
    throw e;
  }
  return token;
}

export async function inviteInfo(env, token) {
  const h = await sha256Hex(String(token || ''));
  const row = await env.DB.prepare(
    // Aussteller muss noch aktive Leitung/Inhaber sein: Links einer ausgeschiedenen bzw. herabgestuften Fuhrparkleitung verfallen (19.10.2026:
    // sonst konnte sie Fahrerkonten mit zuvor erzeugten Links übernehmen); Ersteinrichtung ohne Aussteller bleibt gültig
    // 20.10.2026: Link der Fuhrparkleitung nur für Rollen/Umgebung, die sie selbst anlegen darf (FLEET_MAY_CREATE) – sonst ergab ein gleichzeitiges
    // „neuer Link“ (Leitung) + Hochstufen zum Inhaber einen einlösbaren Inhaber-Link
    `SELECT i.*, u.username, u.display_name, u.role, u.environment, u.active, u.language,
      (SELECT json_extract(a.detail, '$.language') FROM audit_log a WHERE a.target=u.id AND a.action='user.create' LIMIT 1) AS chosen_language FROM invites i JOIN users u ON u.id=i.user_id WHERE i.token_hash = ?
      AND (i.created_by IS NULL OR EXISTS (SELECT 1 FROM users c WHERE c.id=i.created_by AND c.active=1 AND (c.role='owner' OR (c.role='fleet' AND u.role IN ('driver','workshop','viewer') AND u.environment=c.environment))))`
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
  // Einladung zuerst und nur, wenn noch unbenutzt, einlösen (Muster cmd_guard): zwei gleichzeitige Einlösungen setzten vorher beide ein
  // Passwort und bekamen beide eine Sitzung (17.10.2026)
  try {
    await env.DB.batch([
      // Ausstellerregel wie inviteInfo auch beim Einlösen (Rolle kann sich dazwischen geändert haben, 20.10.2026)
      env.DB.prepare(`UPDATE invites SET used_at=? WHERE token_hash=? AND used_at IS NULL AND (created_by IS NULL OR EXISTS (SELECT 1 FROM users c, users u
        WHERE c.id=invites.created_by AND u.id=invites.user_id AND c.active=1 AND u.active=1 AND (c.role='owner' OR (c.role='fleet' AND u.role IN ('driver','workshop','viewer') AND u.environment=c.environment))))`).bind(now, hash),
      env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()'),
      env.DB.prepare('DELETE FROM cmd_guard'),
      env.DB.prepare('UPDATE users SET password_hash=?, password_salt=?, updated_at=? WHERE id=?').bind(ph, salt, now, row.user_id),
      env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(row.user_id),
      // Push-Geräte der damit beendeten Anmeldungen abmelden (18.10.2026: Zurücksetzen-Link ließ das verlorene Handy weiter Pushs bekommen)
      pushOrphanStmt(env, row.user_id),
      env.DB.prepare('DELETE FROM login_challenges WHERE user_id=?').bind(row.user_id),
    // neues Passwort gesetzt: eine bestehende Fehlversuch-Sperre aufheben
      env.DB.prepare('DELETE FROM login_attempts WHERE key=(SELECT username FROM users WHERE id=?)').bind(row.user_id),
    ]);
  } catch (e) {
    if (String(e && e.message).includes('CHECK')) throw new HttpError(410, 'invite_invalid', 'Einladung ungültig oder abgelaufen.');
    throw e;
  }
  const user = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(row.user_id).first();
  // Neues Passwort ersetzt nicht den zweiten Faktor: mit eingeschalteter Zwei-Faktor-Anmeldung erst nach dem Code anmelden
  // Passwort ist schon gesetzt und alle Anmeldungen beendet – auch ohne eingegebenen Code protokollieren (vorher fehlte der Eintrag, 20.10.2026);
  // eigene Aktion, weil invite.accept als Anmeldung zählt
  if (user.totp_enabled_at) {
    await audit(env, user.id, 'password.set_by_invite', user.id, null);
    return { second_factor: 'totp', challenge: await createChallenge(env, user.id, ph) };
  }
  const cookie = await createSession(env, row.user_id, request, ph, true, ['invite.accept', null]); // zählt als Anmeldung (Benutzerliste „Letzte Anmeldung“)
  await endReplacedSession(env, request, row.user_id);
  await noteLoginDevice(env, ctx, user, request, body.device_id);
  return { user: publicUser(user), cookie };
}

export async function changePassword(env, user, body) {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
  await reauthLocked(env, user);
  const { hash } = await hashPassword(String(body.old_password || ''), row.password_salt);
  if (!timingSafeEqual(hash, row.password_hash || '')) { await reauthFailed(env, user); throw bad('wrong_password', 'Altes Passwort falsch.'); } // 400 statt 401: die App wertete 401 als abgelaufene Sitzung und meldete ab (19.10.2026)
  await reauthOk(env, user);
  validatePassword(body.new_password, [row.username, row.display_name]);
  const { hash: ph, salt } = await hashPassword(body.new_password);
  // nur, wenn das geprüfte alte Passwort noch gilt, das Konto aktiv ist und diese Anmeldung noch besteht (21.10.2026: ein gleichzeitig
  // eingelöster Zurücksetzen-Link wurde sonst von einer bereits beendeten, kopierten Sitzung überschrieben) – Muster cmd_guard
  try {
    await env.DB.batch([
      env.DB.prepare(`UPDATE users SET password_hash=?, password_salt=?, updated_at=? WHERE id=? AND active=1 AND password_hash=?
        AND EXISTS (SELECT 1 FROM sessions WHERE token_hash=? AND user_id=?)`).bind(ph, salt, nowIso(), user.id, row.password_hash, user._session, user.id),
      env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()'),
      env.DB.prepare('DELETE FROM cmd_guard'),
      env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash != ?').bind(user.id, user._session),
      // begonnene Anmeldungen mit dem alten Passwort (Zwei-Faktor-Schritt offen) verfallen ebenfalls
      env.DB.prepare('DELETE FROM login_challenges WHERE user_id=?').bind(user.id),
      // offener Einladungs-/Zurücksetzen-Link verfällt (18.10.2026: ließ sich danach noch einlösen und überschrieb das neue Passwort)
      env.DB.prepare('UPDATE invites SET used_at=? WHERE user_id=? AND used_at IS NULL').bind(nowIso(), user.id),
      pushOrphanStmt(env, user.id),
    ]);
  } catch (e) {
    if (String(e && e.message).includes('CHECK')) throw new HttpError(401, 'unauthenticated', 'Bitte anmelden.');
    throw e;
  }
  await audit(env, user.id, 'password.change', user.id, null);
  return { ok: true };
}

// ---- Eigene Anmeldungen (Geräte): ansehen, einzeln oder alle anderen abmelden ----
// Backlog 509: Android ohne „Mobile“ im User-Agent = Tablet (Chrome/Samsung/Firefox setzen „Mobile“ nur am Handy) – Diensthandy und Lkw-Tablet
// desselben Kontos waren in „Meine Anmeldungen“, „Bekannte Geräte“ und im Anmelde-Hinweis nicht zu unterscheiden
export function deviceFromUa(ua = '') {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android' : 'Android-Tablet') : /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : null;
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
    // ref = Kurzkennung des anmeldenden Geräts (Backlog 226): dort heißt der Hinweis „auf diesem Gerät“ und zählt nicht als ungelesen –
    // auf allen anderen Geräten bleibt er unverändert ungelesen (Sicherheitshinweis; das neue Gerät quittiert ihn nicht für die anderen)
    await notifyUsers(env, ctx, userRow.environment, [userRow.id], { kind: 'new_login', ...text('de'), localize: text, langOf: new Map([[userRow.id, userRow.language]]),
      eventKey: `new_login:${userRow.id}:${now}`, ref: h ? 'login:' + h.slice(0, SID_LEN) : null });
  } catch (e) { console.error('new_login notify', e); } // Hinweis darf die Anmeldung nie verhindern
  await audit(env, userRow.id, 'login.new_device', userRow.id, { device: label, device_id: h ? 'neu' : 'fehlt' });
  return true;
}
// Sitzung lebt (gleiche Regel wie getSessionUser): nicht abgelaufen und – bei eingestellter Leerlauf-Abmeldung je Rolle,
// mindestens 5 Minuten – zuletzt innerhalb dieser Zeit genutzt. s = sessions, u = users, now = Platzhalter für die aktuelle Zeit (ISO).
// Vorher zählten Benutzerliste/„Meine Geräte“ nach Leerlauf abgemeldete Sitzungen bis zu 30 Tage als aktiv (17.10.2026).
export function sessionAliveSql(now) {
  return `(s.expires_at > ${now} AND NOT EXISTS (SELECT 1 FROM settings st WHERE st.key = CASE WHEN u.role='workshop' THEN 'idle_logout_workshop_min' ELSE 'idle_logout_other_min' END
    AND CAST(st.value AS REAL) > 0 AND s.last_seen < strftime('%Y-%m-%dT%H:%M:%fZ', ${now}, '-' || (MAX(CAST(st.value AS REAL), 5) * 60 + 60) || ' seconds')))`;
  // + 60 s = Schreibabstand von last_seen (wie getSessionUser: Leerlauf + writeEvery, bei ≥ 5 Min. immer 60 s) – sonst löschte der Cron
  // eine noch gültige Sitzung bis zu ⅓ zu früh und die Benutzerliste zählte sie nicht (19.10.2026)
}
const SID_LEN = 16; // Kurzkennung = Anfang des Token-Hashes (aus ihr lässt sich kein Token ableiten)
export async function listOwnSessions(env, user) {
  const rows = (await env.DB.prepare(`SELECT s.token_hash, s.created_at, s.last_seen, s.expires_at, s.user_agent FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.user_id=?1 AND ${sessionAliveSql('?2')} ORDER BY s.last_seen DESC`).bind(user.id, nowIso()).all()).results;
  return rows.map((r) => ({ id: r.token_hash.slice(0, SID_LEN), device: deviceFromUa(r.user_agent || ''), created_at: r.created_at, last_seen: r.last_seen,
    expires_at: r.expires_at, current: r.token_hash === user._session }));
}
// Backlog 225 (Teilagent „Fahrer wechselt sein Handy“): Push-Geräte, deren Anmeldung nicht mehr lebt (abgelaufen, Leerlauf, vom Cron gelöscht),
// erhalten weiter Hinweise – „Meine Anmeldungen“ zeigte dann nur „dieses Gerät“ und keinen Knopf. Zählt nur Geräte mit bekannter Anmeldung
// (wie pushOrphanStmt; „auf allen anderen Geräten abmelden“ meldet genau diese ab), nie das Gerät der aktuellen Anmeldung.
export async function orphanPushCount(env, user) {
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM push_subscriptions p WHERE p.user_id=?1 AND p.revoked_at IS NULL AND p.session_hash IS NOT NULL
    AND p.session_hash != ?3 AND NOT EXISTS (SELECT 1 FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.user_id=?1 AND s.token_hash=p.session_hash AND ${sessionAliveSql('?2')})`)
    .bind(user.id, nowIso(), user._session || '').first();
  return r ? r.n : 0;
}
export async function revokeOwnSession(env, user, sid) {
  if (!/^[0-9a-f]{16}$/.test(String(sid))) throw bad('invalid_session', 'Ungültige Anmeldung.');
  if (user._session.startsWith(sid)) throw bad('current_session', 'Die aktuelle Anmeldung bitte über „Abmelden“ beenden.');
  const [r] = await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND substr(token_hash,1,16)=?').bind(user.id, sid), pushOrphanStmt(env, user.id),
    // offene 2FA-Anmeldungen lassen sich keinem Gerät zuordnen – alle beenden (Passwort wird erneut verlangt; 21.10.2026)
    env.DB.prepare('DELETE FROM login_challenges WHERE user_id=?').bind(user.id)]);
  if (r.meta.changes) await audit(env, user.id, 'session.revoke', user.id, { count: r.meta.changes });
  return { ok: true, revoked: r.meta.changes };
}
// ---- Bekannte Geräte (für den Anmelde-Hinweis) – eigene Liste, einzelne vergessen ----
// Kurzkennung = Anfang des Hashes. „Dieses Gerät“ über den Header x-cfp-device (Gerätekennung aus dem Browser, wird nur gehasht verglichen).
// Das aktuelle Gerät kann nicht vergessen werden – sonst bliebe evtl. kein bekanntes Gerät, und die nächste Anmeldung wäre wieder „erste Anmeldung“ (ohne Hinweis).
// Bezug des Anmelde-Hinweises für das anfragende Gerät (Backlog 226), sonst null
export async function loginRefOf(request) {
  const h = await currentDeviceHash(request);
  return h ? 'login:' + h.slice(0, SID_LEN) : null;
}
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
  const [r, pr] = await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash != ?').bind(user.id, user._session), pushOrphanStmt(env, user.id),
    env.DB.prepare('DELETE FROM login_challenges WHERE user_id=?').bind(user.id)]); // begonnene 2FA-Anmeldungen anderer Geräte ebenso (21.10.2026)
  const pushN = (pr && pr.meta && pr.meta.changes) || 0;
  await audit(env, user.id, 'session.revoke_others', user.id, { count: r.meta.changes, ...(pushN ? { push_devices: pushN } : {}) });
  return { ok: true, revoked: r.meta.changes, push_devices: pushN };
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
  // Backlog 381: Sprache der Person optional beim Anlegen (Einladungsseite und App starten darin; leer = Standard Deutsch bzw. Handysprache)
  const language = body.language === undefined || body.language === null || body.language === '' ? null : oneOf(body.language, ['de', 'uk', 'en'], 'Sprache');
  const exists = await env.DB.prepare('SELECT id FROM users WHERE username=?').bind(username).first();
  if (exists) throw new HttpError(409, 'username_taken', 'Benutzername ist bereits vergeben.');
  const id = uuid();
  const now = nowIso();
  // gleichzeitiges Anlegen desselben Namens: 409 statt 500 (UNIQUE) – 17.10.2026
  const ins = await env.DB.prepare(`INSERT INTO users(id,username,display_name,role,environment,workshop_site,employee_number,active,created_by,created_at,updated_at,language)
    VALUES (?,?,?,?,?,?,?,1,?,?,?,?) ON CONFLICT(username) DO NOTHING`).bind(id, username, display, role, environment, site, str(body.employee_number, { max: 30, field: 'Personalnummer' }), actor.id, now, now, language || 'de').run();
  if (!ins.meta || !ins.meta.changes) throw new HttpError(409, 'username_taken', 'Benutzername ist bereits vergeben.');
  const token = await createInvite(env, id, actor.id);
  await audit(env, actor.id, 'user.create', id, { role, environment, username, ...(language ? { language } : {}) });
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
  const activeIn = body.active === undefined ? undefined : flag(body.active, 'Aktiv', !!target.active);
  if (target.id === actor.id && (activeIn === false || (body.role && body.role !== actor.role))) {
    throw bad('validation', 'Eigene Rolle/Aktivierung kann nicht selbst geändert werden.');
  }
  const role = body.role ? oneOf(body.role, ROLES, 'Rolle') : target.role;
  const environment = body.environment ? oneOf(body.environment, ENVS, 'Umgebung') : target.environment;
  const active = activeIn === undefined ? target.active : (activeIn ? 1 : 0);
  const display = body.display_name !== undefined && body.display_name !== null && body.display_name !== '' ? str(body.display_name, { required: true, max: 120, field: 'Name' }) : target.display_name; // nur Leerzeichen/[] → 400 statt NOT-NULL-Fehler
  const site = role === 'workshop' ? (body.workshop_site !== undefined && body.workshop_site !== null ? str(body.workshop_site, { max: 20, field: 'Werkstatt' }) : target.workshop_site) : null;
  if (role === 'workshop' && !site) throw bad('validation', 'Werkstatt ist für Rolle Werkstatt erforderlich.');
  // neue/geänderte Werkstatt wie beim Anlegen prüfen (vorher beliebiger Code gespeichert → Werkstattkonto sah keine Aufträge)
  if (role === 'workshop' && (site !== target.workshop_site || target.role !== 'workshop')
    && !(await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(site).first())) throw bad('validation', 'Unbekannte Werkstatt.');
  // nichts geändert (z. B. leerer Aufruf an ein deaktiviertes Konto): kein Protokoll, keine erneute Entwertung von Sitzungen/Einladungen (19.10.2026)
  if (role === target.role && environment === target.environment && !!active === !!target.active && display === target.display_name && (site || null) === (target.workshop_site || null)) return { ok: true, changed: [], sessions_ended: false };
  const now = nowIso();
  // nur auf dem gelesenen Stand schreiben (Muster cmd_guard): vorher machte eine gleichzeitige Namensänderung eine Deaktivierung oder einen
  // Rollenwechsel still rückgängig (alle Felder absolut aus dem alten Stand zurückgeschrieben) – 17.10.2026
  const stmts = [env.DB.prepare('UPDATE users SET was_driver=CASE WHEN role=\'driver\' OR ?=\'driver\' THEN 1 ELSE was_driver END, role=?, environment=?, active=?, display_name=?, workshop_site=?, updated_at=? WHERE id=? AND updated_at=?')
    .bind(role, role, environment, active, display, site, laterIso(target.updated_at), userId, target.updated_at),
  env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()'), env.DB.prepare('DELETE FROM cmd_guard')];
  // Inhaber deaktivieren/herabstufen: Handelnde Person muss noch aktiv in ihrer Rolle sein und danach mindestens ein aktiver Inhaber
  // übrig bleiben (19.10.2026: zwei Inhaber, die sich gleichzeitig gegenseitig deaktivierten, ließen keinen Inhaber zurück)
  if (target.role === 'owner' && (role !== 'owner' || !active)) stmts.push(
    env.DB.prepare(`INSERT INTO cmd_guard(ok) SELECT EXISTS (SELECT 1 FROM users WHERE id=? AND active=1 AND role=?) AND EXISTS (SELECT 1 FROM users WHERE role='owner' AND active=1)`).bind(actor.id, actor.role),
    env.DB.prepare('DELETE FROM cmd_guard'));
  // Rollen-/Umgebungswechsel oder Deaktivierung entwertet Sitzungen und Push-Geräte
  // Werkstatt-Standortwechsel wie Rollenwechsel: alte Hinweise/Pushs betrafen Vorgänge des bisherigen Standorts (17.10.2026)
  const siteChanged = role === 'workshop' && target.role === 'workshop' && (site || null) !== (target.workshop_site || null);
  if (role !== target.role || environment !== target.environment || !active || siteChanged) {
    stmts.push(env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId));
    stmts.push(env.DB.prepare('UPDATE push_subscriptions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').bind(now, userId));
  }
  // Rollen-/Umgebungswechsel: Hinweise der bisherigen Rolle ausblenden (nicht löschen) – sonst sah z. B. ein neuer Fahrer kritische
  // Leitungs-Hinweise samt Vorgang und bekam fehlgeschlagene Pushs nachgereicht (17.10.2026, Migration 0056)
  if (role !== target.role || environment !== target.environment || siteChanged) stmts.push(env.DB.prepare('UPDATE notifications SET hidden_at=? WHERE user_id=? AND hidden_at IS NULL').bind(now, userId));
  // … sowie laufende Fahrzeugzuordnungen beenden (Verlauf bleibt): sonst galt das Konto in der neuen Umgebung als „zugeordnet“ (Fahrzeugakte,
  // Hinweise, Reifendaten), ein deaktiviertes Konto blieb Fahrer des Fahrzeugs; Fahrerakte der alten Umgebung gibt das Konto frei (17.10.2026)
  // Backlog 248 (Blickwinkel „Fahrer verlässt das Unternehmen“): beendete Zuordnungen vorher lesen – Ende steht dann auch im Protokoll des
  // Fahrzeugs (wie beim Fahrzeugwechsel) und die Oberfläche nennt die Fahrzeuge, die jetzt ohne Fahrer sind
  let endedAssign = [];
  if (role !== target.role || environment !== target.environment || !active) {
    endedAssign = (await env.DB.prepare(`SELECT dv.id, dv.vehicle_id, v.plate FROM driver_vehicles dv LEFT JOIN vehicles v ON v.id=dv.vehicle_id
      WHERE dv.user_id=? AND (dv.valid_to IS NULL OR dv.valid_to > ?) ORDER BY v.plate`).bind(userId, now).all()).results;
    stmts.push(env.DB.prepare('UPDATE driver_vehicles SET valid_to=? WHERE user_id=? AND (valid_to IS NULL OR valid_to > ?)').bind(now, userId, now));
  }
  if (role !== target.role || environment !== target.environment) stmts.push(env.DB.prepare(`UPDATE drivers SET user_id=NULL, updated_at=? WHERE user_id=? AND (environment<>? OR ?<>'driver')`).bind(now, userId, environment, role));
  if (!active) stmts.push(env.DB.prepare('DELETE FROM login_challenges WHERE user_id=?').bind(userId));
  // offene Einladungs-/Zurücksetzen-Links entwerten: bei Deaktivierung immer (galt nach Reaktivierung wieder), bei Rollen-/Umgebungswechsel
  // nur für eingerichtete Konten (Zurücksetzen-Link der alten Rolle gab sonst Zugang mit der neuen; Erst-Einladung bleibt gültig) – 18.10.2026
  if (!active || role !== target.role || environment !== target.environment) stmts.push(env.DB.prepare(`UPDATE invites SET used_at=?1 WHERE user_id=?2 AND used_at IS NULL
    AND (?3 = 1 OR EXISTS (SELECT 1 FROM users WHERE id=?2 AND password_hash IS NOT NULL))`).bind(now, userId, active ? 0 : 1));
  // Deaktivierung: von diesem Konto ausgestellte offene Einladungen entwerten (Backlog 193, Teilagent „Urlaubsvertretung“) – sie galten
  // schon als ungültig (Aussteller inaktiv), lebten aber nach der Reaktivierung wieder auf; Anzahl als Hinweis an die Oberfläche
  let invitesVoided = 0;
  if (target.active && !active) {
    invitesVoided = (await env.DB.prepare('SELECT COUNT(*) AS n FROM invites WHERE created_by=? AND used_at IS NULL AND expires_at > ?').bind(userId, now).first()).n || 0;
    stmts.push(env.DB.prepare('UPDATE invites SET used_at=? WHERE created_by=? AND used_at IS NULL').bind(now, userId));
  }
  // Erst-Einladung der Fuhrparkleitung nach Rollen-/Umgebungswechsel: gilt weiter, solange die Leitung diese Rolle/Umgebung selbst anlegen
  // dürfte – geprüft beim Einlösen (inviteInfo) und in der Benutzerliste (20.10.2026; vorher verfiel sie still auch bei Fahrer → Lesezugriff)
  try { await env.DB.batch(stmts); } catch (e) {
    if (String(e && e.message).includes('CHECK')) throw conflict('version_conflict', 'Der Benutzer wurde zwischenzeitlich geändert. Bitte neu laden.');
    throw e;
  }
  // geänderte Felder als alt → neu (Protokoll-Ansicht zeigt „geändert: Rolle Fahrer → Werkstatt“); Grundfelder bleiben wie bisher
  const changed = {};
  for (const [k, a, b] of [['role', target.role, role], ['environment', target.environment, environment], ['active', !!target.active, !!active], ['display_name', target.display_name, display], ['workshop_site', target.workshop_site || null, site || null]]) if (a !== b) changed[k] = { from: a, to: b };
  await audit(env, actor.id, 'user.update', userId, { role, environment, active: !!active, ...(Object.keys(changed).length ? { changed } : {}) });
  for (const a of endedAssign) await audit(env, actor.id, 'vehicle.end_assignment', a.vehicle_id, { driver: userId, assignment: a.id, ...(!active ? { account_deactivated: true } : { account_changed: true }) });
  // Hinweise beim Ausscheiden/Versetzen (22.10.2026, nur Anzeige): verknüpfte Fahrerakte bleibt aktiv (Agent meldet weiter ablaufende Nachweise);
  // letzter Werkstatt-Zugang eines Standorts mit offenen Aufträgen – eine Abfrage
  const deact = !!target.active && !active;
  const oldSite = target.role === 'workshop' && target.workshop_site && (!active || role !== 'workshop' || siteChanged || environment !== target.environment) ? target.workshop_site : null;
  let driverFile = null; let orphaned = 0;
  if (deact || oldSite) {
    const h = await env.DB.prepare(`SELECT CASE WHEN ?4 = 1 THEN (SELECT json_object('id', id, 'name', display_name) FROM drivers WHERE user_id=?1 AND active=1) END AS df,
        CASE WHEN ?2 IS NULL THEN 0 ELSE (SELECT COUNT(*) FROM cases c WHERE c.environment=?3 AND c.workshop_site=?2 AND c.status IN ('werkstatt_freigegeben','in_reparatur','wartet_teile')
          AND NOT EXISTS (SELECT 1 FROM users u WHERE u.role='workshop' AND u.active=1 AND u.environment=?3 AND u.workshop_site=?2)) END AS orphan`)
      .bind(userId, oldSite, target.environment, deact ? 1 : 0).first();
    driverFile = h && h.df ? JSON.parse(h.df) : null; orphaned = (h && h.orphan) || 0;
  }
  // Leitungswechsel (Backlog 258d, nur Anzeige): scheidet eine Fuhrparkleitung aus bzw. wechselt Rolle/Umgebung – was hängt noch an ihr?
  // Meldungen mit ihrem Eingang, die nie bewertet wurden; von ihr angelegte aktive Fahrzeughinweise/Notfallnummern (oft ihre Handynummer);
  // letzte aktive Fuhrparkleitung dieser Umgebung (Meldungen gehen dann nur noch an den Inhaber) – eine Abfrage
  let handover = null;
  if (target.role === 'fleet' && (deact || role !== 'fleet' || environment !== target.environment)) {
    const h = await env.DB.prepare(`SELECT
        (SELECT COUNT(*) FROM cases WHERE environment=?2 AND status='gemeldet' AND fleet_received_by=?1) AS received_untriaged,
        (SELECT COUNT(*) FROM vehicle_notes WHERE created_by=?1 AND environment=?2 AND archived_at IS NULL AND (valid_until IS NULL OR valid_until >= ?3)) AS notes,
        (SELECT COUNT(*) FROM emergency_contacts WHERE created_by=?1 AND environment=?2 AND archived_at IS NULL) AS emergency,
        -- Backlog 552: Kennzeichen der Fahrzeuge mit diesen Hinweisen (vorher nur die Anzahl – an welchen Fahrzeugen suchen?)
        (SELECT group_concat(p, '|') FROM (SELECT DISTINCT v.plate AS p FROM vehicle_notes n JOIN vehicles v ON v.id=n.vehicle_id WHERE n.created_by=?1 AND n.environment=?2 AND n.archived_at IS NULL AND (n.valid_until IS NULL OR n.valid_until >= ?3) ORDER BY v.plate LIMIT 30)) AS notes_plates,
        NOT EXISTS (SELECT 1 FROM users WHERE id<>?1 AND role='fleet' AND active=1 AND environment=?2) AS last_fleet,
        -- Backlog 563: offene Rückfragen dieses Kontos (letzte Rückfrage von ihm, Melder hat seither nicht geantwortet) und von ihm gesetzte Wiedervorlagen
        (SELECT COUNT(*) FROM cases c WHERE c.environment=?2 AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')
          AND (SELECT e.actor_id FROM case_events e WHERE e.case_id=c.id AND e.action='comment' AND json_extract(e.payload,'$.question')=1 ORDER BY e.created_at DESC LIMIT 1)=?1
          AND MAX(COALESCE((SELECT MAX(e.created_at) FROM case_events e WHERE e.case_id=c.id AND e.action='comment' AND e.actor_id=c.reporter_id),''),
            COALESCE((SELECT MAX(f.created_at) FROM files f WHERE f.case_id=c.id AND f.uploaded_by=c.reporter_id),''))
            <= (SELECT MAX(e.created_at) FROM case_events e WHERE e.case_id=c.id AND e.action='comment' AND json_extract(e.payload,'$.question')=1)) AS questions_open,
        (SELECT COUNT(*) FROM cases c WHERE c.environment=?2 AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt') AND c.followup_on IS NOT NULL
          AND (SELECT e.actor_id FROM case_events e WHERE e.case_id=c.id AND e.action='set_followup' ORDER BY e.created_at DESC LIMIT 1)=?1) AS followups`).bind(userId, target.environment, berlinDate()).first();
    if (h && (h.received_untriaged || h.notes || h.emergency || h.last_fleet || h.questions_open || h.followups)) handover = { received_untriaged: h.received_untriaged, notes: h.notes, ...(h.notes ? { notes_plates: String(h.notes_plates || '').split('|').filter(Boolean) } : {}), emergency: h.emergency, last_fleet: !!h.last_fleet, questions_open: h.questions_open || 0, followups: h.followups || 0 };
  }
  return { ok: true, changed: Object.keys(changed), sessions_ended: role !== target.role || environment !== target.environment || !active || siteChanged,
    ...(driverFile ? { driver_file_active: driverFile } : {}), ...(orphaned ? { workshop_orphaned_cases: orphaned, workshop_site: oldSite } : {}), ...(invitesVoided ? { invites_voided: invitesVoided } : {}),
    ...(endedAssign.length ? { ended_assignments: [...new Set(endedAssign.map((a) => a.plate || a.vehicle_id))] } : {}), ...(handover ? { fleet_handover: handover } : {}) };
}

export async function resetInvite(env, actor, userId) {
  const target = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
  if (!target) throw new HttpError(404, 'not_found', 'Benutzer nicht gefunden.');
  if (actor.role === 'fleet' && (target.environment !== actor.environment || !FLEET_MAY_CREATE.includes(target.role))) throw forbidden();
  if (!['owner', 'fleet'].includes(actor.role)) throw forbidden();
  // deaktiviertes Konto: Link wäre nicht einlösbar (inviteInfo → 410) – nicht erzeugen (19.10.2026: App zeigte Link + QR eines toten Links)
  if (!target.active) throw bad('user_inactive', 'Konto ist deaktiviert – erst aktivieren, dann neuen Einladungslink erzeugen.');
  const token = await createInvite(env, userId, actor.id);
  await audit(env, actor.id, 'user.invite_reset', userId, null);
  return { invite_token: token };
}

export async function listUsers(env, actor) {
  if (!['owner', 'fleet'].includes(actor.role)) throw forbidden();
  const kdSince = new Date(Date.now() - KNOWN_DEVICE_DAYS * 86400000).toISOString();
  const cols = `u.id,u.username,u.display_name,u.role,u.environment,u.workshop_site,u.employee_number,u.active,u.created_at,(u.password_hash IS NOT NULL) AS has_password, (u.totp_enabled_at IS NOT NULL) AS has_totp,
    (SELECT d.active FROM drivers d WHERE d.user_id=u.id) AS driver_record_active,
    CASE WHEN la.locked_until > ?1 THEN la.locked_until END AS locked_until,
    (SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id AND ${sessionAliveSql('?1')}) AS sessions, (SELECT MAX(s.last_seen) FROM sessions s WHERE s.user_id=u.id) AS last_seen,
    (SELECT COUNT(*) FROM push_subscriptions p WHERE p.user_id=u.id AND p.revoked_at IS NULL) AS push_devices,
    (SELECT COUNT(*) FROM known_devices k WHERE k.user_id=u.id AND k.last_seen >= ?3) AS known_devices,
    (SELECT MAX(a.created_at) FROM audit_log a WHERE a.target=u.id AND a.action IN ('login', 'invite.accept')) AS last_login,
    CASE WHEN u.password_hash IS NULL THEN (SELECT MAX(i.expires_at) FROM invites i WHERE i.user_id=u.id AND i.used_at IS NULL
      AND (i.created_by IS NULL OR EXISTS (SELECT 1 FROM users c WHERE c.id=i.created_by AND c.active=1 AND (c.role='owner' OR (c.role='fleet' AND u.role IN ('driver','workshop','viewer') AND u.environment=c.environment))))) END AS invite_expires_at`;
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
    // begonnene Zwei-Faktor-Anmeldungen (Passwort schon eingegeben) ebenso beenden – sonst ergab der Code danach eine neue Sitzung (21.10.2026)
    env.DB.prepare('DELETE FROM login_challenges WHERE user_id=?').bind(userId),
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
  // nur wenn weiterhin kein Benutzer existiert (17.10.2026: zwei gleichzeitige Einrichtungen ergaben zwei Inhaberkonten)
  const ins = await env.DB.prepare(`INSERT INTO users(id,username,display_name,role,environment,active,created_at,updated_at) SELECT ?,?,?,?,?,1,?,?
    WHERE NOT EXISTS (SELECT 1 FROM users) ON CONFLICT(username) DO NOTHING`)
    .bind(id, username, str(body.display_name, { required: true, max: 120, field: 'Name' }), 'owner', 'production', now, now).run();
  if (!ins.meta || !ins.meta.changes) throw new HttpError(410, 'setup_done', 'Einrichtung bereits abgeschlossen.');
  const token = await createInvite(env, id, null);
  await audit(env, null, 'setup.owner', id, { username });
  return { invite_token: token };
}

export async function audit(env, actorId, action, target, detail) {
  await auditStmt(env, actorId, action, target, detail).run();
}
// Protokolleintrag als Anweisung für einen Stapel (22.10.2026): funktional gelesene Einträge (z. B. Grund der Außer-Betrieb-Nahme,
// „Letzte Inventur“) im selben atomaren Stapel wie die Änderung – sonst fehlt der Eintrag nach einem Abbruch dazwischen dauerhaft
export function auditStmt(env, actorId, action, target, detail) {
  return env.DB.prepare('INSERT INTO audit_log(id,actor_id,action,target,detail,created_at) VALUES (?,?,?,?,?,?)')
    .bind(uuid(), actorId, action, target, detail ? JSON.stringify(detail) : null, nowIso());
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
  where.push(`(a.actor_id = ? OR a.target = ? OR a.target IN (SELECT id FROM drivers WHERE user_id = ?) OR (a.target IN (SELECT vehicle_id FROM driver_vehicles WHERE user_id = ?) AND a.action IN ('vehicle.assign_driver', 'vehicle.end_assignment') AND CASE WHEN json_valid(a.detail) THEN json_extract(a.detail, '$.driver') END = ?))`);
  args.push(id, id, id, id, id); // + Einträge zur Fahrerakte der Person (Kontrollen, Nachweise, Auslesungen; 20.10.2026)
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
  // instr statt LIKE: D1 lehnt LIKE-Muster über 50 Byte ab (Suchfeld 60 Zeichen → 500, 19.10.2026); lower() = LIKE-Verhalten für A–Z,
  // Varianten (caseVariants) für andere Buchstaben
  const IN = (col) => `instr(lower(${col}), lower(?)) > 0`;
  // Backlog 491: Kennzeichen des betroffenen Fahrzeugs auch normalisiert („SZYC5513“, „sz yc 5513“ wie die Vorgangssuche) – ein Platzhalter mehr
  const pk = normPlate(qs);
  where.push('(' + vs.map(() => ['a.target', 'a.detail', 'u.username', 'u.display_name', 'tu.username', 'tu.display_name', 'tv.plate', 'td.display_name'].map(IN).join(' OR ')).join(' OR ') + ` OR instr(${PLATE_KEY_SQL('tv.plate')}, ?) > 0)`);
  for (const v of vs) args.push(...Array(8).fill(v)); // td = Fahrerakte (Ziel der Fahrerakte-Einträge, 20.10.2026)
  args.push(pk.length >= 2 ? pk : '\u0000');
}
// Bereich: ein Aktions-Präfix oder mehrere, durch Komma getrennt (z. B. „invite.,password.,totp.“ für Zugang & Sicherheit), höchstens 8 × 40 Zeichen
function auditPrefix(query) {
  if (!query.action) return null;
  const list = [...new Set(String(query.action).slice(0, 400).split(',').map((x) => x.trim().slice(0, 40)).filter(Boolean))].slice(0, 8);
  return list.length ? list.join(',') : null;
}
function auditPrefixWhere(prefix, where, args, esc) {
  const list = prefix.split(',');
  // Präfix ohne LIKE (D1-Grenze 50 Byte für Muster; Unterstriche in Aktionen mussten sonst maskiert werden)
  where.push('(' + list.map(() => 'substr(a.action, 1, length(?)) = ?').join(' OR ') + ')');
  for (const p of list) args.push(p, p);
}
export async function listAudit(env, user, query = {}) {
  if (user.role !== 'owner') throw new HttpError(403, 'forbidden', 'Nur der Inhaber sieht das Protokoll.');
  const limit = intParam(query.limit, 200, 1, 1000);
  const prefix = auditPrefix(query);
  let before = query.before && /^\d{4}-\d{2}-\d{2}T/.test(query.before) ? query.before : '9999';
  // „bis Datum“ (Berliner Kalendertag einschließlich) – nur wenn kein späterer Blätter-Zeitpunkt gesetzt ist
  // Blättern mit eindeutigem Gleichstand-Kriterium (before_id): Sammel-Einträge mit gleichem Zeitpunkt (z. B. HU/SP-Neuberechnung der Flotte)
  // gingen sonst jenseits der Seitengrenze verloren (19.10.2026)
  let beforeId = before !== '9999' && typeof query.before_id === 'string' && query.before_id ? query.before_id.slice(0, 64) : null;
  if (query.until !== undefined && query.until !== '') {
    if (!isCalendarDate(query.until)) throw bad('validation', 'Datum im Format JJJJ-MM-TT.');
    const end = berlinDayStartIso(new Date(Date.parse(query.until + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10));
    if (end < before) { before = end; beforeId = null; }
  }
  // Suche in Kennung (target), Details und handelnder Person (Name/Benutzername), z. B. Kennzeichen, FIN; Platzhalter wirkungslos
  const qs = cutText(cleanText(query.q || '').trim(), 60);
  const esc = (x) => x.replace(/[%_\\]/g, (c) => '\\' + c);
  const where = [beforeId ? '(a.created_at < ? OR (a.created_at = ? AND a.id < ?))' : 'a.created_at < ?']; const args = beforeId ? [before, before, beforeId] : [before];
  if (prefix) auditPrefixWhere(prefix, where, args, esc);
  if (qs.length >= 2) auditQ(qs, where, args);
  const person = await auditPerson(env, auditUser(query, where, args));
  const vehicle = await auditVehicleRow(env, auditVehicle(query, where, args));
  // Betroffenes Konto bzw. Fahrzeug (target) zur Anzeige auflösen – je Eintrag zwei Primärschlüssel-Zugriffe, keine Zusatzabfrage
  const rows = (await env.DB.prepare(`SELECT a.id, a.action, a.target, a.detail, a.created_at, a.actor_id, u.display_name AS actor_name, u.username AS actor_username,
    tu.display_name AS target_name, tu.username AS target_username, tv.plate AS target_plate, td.display_name AS target_driver_name
    FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN users tu ON tu.id=a.target LEFT JOIN vehicles tv ON tv.id=a.target LEFT JOIN drivers td ON td.id=a.target WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC, a.id DESC LIMIT ?`)
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
  const qs = cutText(cleanText(query.q || '').trim(), 60);
  const esc = (x) => x.replace(/[%_\\]/g, (c) => '\\' + c);
  const where = ['a.created_at >= ?', 'a.created_at < ?']; const args = [lo, hi];
  if (prefix) auditPrefixWhere(prefix, where, args, esc);
  if (qs.length >= 2) auditQ(qs, where, args);
  const person = await auditPerson(env, auditUser(query, where, args));
  const vehicle = await auditVehicleRow(env, auditVehicle(query, where, args));
  const rows = (await env.DB.prepare(`SELECT a.action, a.target, a.detail, a.created_at, u.display_name AS actor_name, u.username AS actor_username,
    COALESCE(tv.plate, tu.display_name, tu.username, td.display_name) AS target_label
    FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id LEFT JOIN users tu ON tu.id=a.target LEFT JOIN vehicles tv ON tv.id=a.target LEFT JOIN drivers td ON td.id=a.target WHERE ${where.join(' AND ')}
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
