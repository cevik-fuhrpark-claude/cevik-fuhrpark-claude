// [CLAUDE] Authentifizierung: Einladung -> eigenes Passwort, Sitzungen per HttpOnly-Cookie
import {
  nowIso, uuid, sha256Hex, randomToken, hashPassword, timingSafeEqual, parseCookies,
  bad, forbidden, HttpError, str, oneOf,
} from './util.js';

export const ROLES = ['owner', 'fleet', 'workshop', 'dispatch', 'driver', 'viewer'];
export const ENVS = ['test', 'production'];
const SESSION_DAYS = 30;
const INVITE_DAYS = 7;
const COOKIE = 'cfp_session';

export async function getSessionUser(env, request) {
  const token = parseCookies(request.headers.get('cookie'))[COOKIE];
  if (!token) return null;
  const h = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT u.*, s.expires_at AS s_exp, s.last_seen AS s_seen FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`
  ).bind(h).first();
  if (!row) return null;
  if (row.s_exp < nowIso() || !row.active) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(h).run();
    return null;
  }
  // last_seen höchstens alle 10 Minuten schreiben
  if (Date.now() - Date.parse(row.s_seen) > 10 * 60 * 1000) {
    await env.DB.prepare('UPDATE sessions SET last_seen = ? WHERE token_hash = ?').bind(nowIso(), h).run();
  }
  return publicUser(row, h);
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

export async function login(env, request, body) {
  const username = str(body.username, { required: true, max: 64, field: 'Benutzername' }).toLowerCase();
  const password = str(body.password, { required: true, max: 200, field: 'Passwort' });
  const att = await env.DB.prepare('SELECT * FROM login_attempts WHERE key = ?').bind(username).first();
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
    const failures = (att?.failures || 0) + 1;
    const locked = failures >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null;
    await env.DB.prepare(`INSERT INTO login_attempts(key,failures,locked_until,updated_at) VALUES (?,?,?,?)
      ON CONFLICT(key) DO UPDATE SET failures=excluded.failures, locked_until=excluded.locked_until, updated_at=excluded.updated_at`)
      .bind(username, locked ? 0 : failures, locked, nowIso()).run();
    if (locked) await audit(env, null, 'login.locked', user ? user.id : null, { username, minutes: LOCK_MINUTES });
    throw new HttpError(401, 'invalid_login', 'Benutzername oder Passwort falsch.');
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(username).run();
  const cookie = await createSession(env, user.id, request);
  await audit(env, user.id, 'login', user.id, null);
  return { user: publicUser(user), cookie };
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
    'SELECT i.*, u.username, u.display_name, u.role, u.environment FROM invites i JOIN users u ON u.id=i.user_id WHERE i.token_hash = ?'
  ).bind(h).first();
  if (!row || row.used_at || row.expires_at < nowIso()) throw new HttpError(410, 'invite_invalid', 'Einladung ungültig oder abgelaufen.');
  return { row, hash: h };
}

export async function acceptInvite(env, request, body) {
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
  const cookie = await createSession(env, row.user_id, request);
  const user = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(row.user_id).first();
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
const SID_LEN = 16; // Kurzkennung = Anfang des Token-Hashes (aus ihr lässt sich kein Token ableiten)
export async function listOwnSessions(env, user) {
  const rows = (await env.DB.prepare('SELECT token_hash, created_at, last_seen, expires_at, user_agent FROM sessions WHERE user_id=? AND expires_at > ? ORDER BY last_seen DESC')
    .bind(user.id, nowIso()).all()).results;
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
  const display = body.display_name ? str(body.display_name, { max: 120 }) : target.display_name;
  const site = role === 'workshop' ? (body.workshop_site ?? target.workshop_site) : null;
  if (role === 'workshop' && !site) throw bad('validation', 'Werkstatt ist für Rolle Werkstatt erforderlich.');
  const now = nowIso();
  const stmts = [env.DB.prepare('UPDATE users SET role=?, environment=?, active=?, display_name=?, workshop_site=?, updated_at=? WHERE id=?')
    .bind(role, environment, active, display, site, now, userId)];
  // Rollen-/Umgebungswechsel oder Deaktivierung entwertet Sitzungen und Push-Geräte
  if (role !== target.role || environment !== target.environment || !active) {
    stmts.push(env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId));
    stmts.push(env.DB.prepare('UPDATE push_subscriptions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').bind(now, userId));
  }
  await env.DB.batch(stmts);
  await audit(env, actor.id, 'user.update', userId, { role, environment, active });
  return { ok: true };
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
  const cols = `u.id,u.username,u.display_name,u.role,u.environment,u.workshop_site,u.employee_number,u.active,u.created_at,(u.password_hash IS NOT NULL) AS has_password,
    CASE WHEN la.locked_until > ?1 THEN la.locked_until END AS locked_until,
    (SELECT COUNT(*) FROM sessions s WHERE s.user_id=u.id AND s.expires_at > ?1) AS sessions, (SELECT MAX(s.last_seen) FROM sessions s WHERE s.user_id=u.id AND s.expires_at > ?1) AS last_seen`;
  const q = actor.role === 'owner'
    ? env.DB.prepare(`SELECT ${cols} FROM users u LEFT JOIN login_attempts la ON la.key=u.username ORDER BY u.environment, u.role, u.display_name`).bind(nowIso())
    : env.DB.prepare(`SELECT ${cols} FROM users u LEFT JOIN login_attempts la ON la.key=u.username WHERE u.environment=?2 ORDER BY u.role, u.display_name`).bind(nowIso(), actor.environment);
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
export async function listAudit(env, user, query = {}) {
  if (user.role !== 'owner') throw new HttpError(403, 'forbidden', 'Nur der Inhaber sieht das Protokoll.');
  const limit = Math.min(Math.max(Number(query.limit) || 200, 1), 1000);
  const prefix = query.action ? String(query.action).slice(0, 40) : null;
  const before = query.before && /^\d{4}-\d{2}-\d{2}T/.test(query.before) ? query.before : '9999';
  const rows = (await env.DB.prepare(`SELECT a.id, a.action, a.target, a.detail, a.created_at, a.actor_id, u.display_name AS actor_name, u.username AS actor_username
    FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id WHERE a.created_at < ? ${prefix ? "AND a.action LIKE ? ESCAPE '\\'" : ''} ORDER BY a.created_at DESC LIMIT ?`)
    .bind(...(prefix ? [before, prefix.replace(/[%_\\]/g, (c) => '\\' + c) + '%', limit] : [before, limit])).all()).results;
  return rows.map((r) => { let detail = null; try { detail = r.detail ? JSON.parse(r.detail) : null; } catch { detail = r.detail; } return { ...r, detail }; });
}
