// [CLAUDE] Zwei-Faktor-Anmeldung (TOTP nach RFC 6238, 30 s, 6 Ziffern, HMAC-SHA1) – freiwillig je Konto, ohne Fremddienst.
// Jede Authenticator-App (z. B. die auf dem Handy vorinstallierte Passwort-App) erzeugt die Codes; die App selbst versendet nichts.
// Ersatzcodes: 10 Einmal-Codes, nur als SHA-256-Hash gespeichert, werden genau einmal angezeigt.
import { nowIso, sha256Hex, randomToken, hashPassword, timingSafeEqual, bad, HttpError } from './util.js';
import { reauthLocked, reauthFailed, reauthOk, pushOrphanStmt } from './auth.js';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const STEP_SEC = 30;
const WINDOW = 1; // ±1 Zeitschritt (Uhrabweichung des Handys)
export const RECOVERY_COUNT = 10;
export const CHALLENGE_MIN = 5;
export const CHALLENGE_TRIES = 5;

export function base32Encode(bytes) {
  let bits = 0; let val = 0; let out = '';
  for (const b of bytes) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
export function base32Decode(s) {
  const clean = String(s || '').toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0; let val = 0; const out = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch); if (i < 0) throw new Error('base32');
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

export function newSecret() { return base32Encode(crypto.getRandomValues(new Uint8Array(20))); }

// HOTP-Wert (RFC 4226) für einen Zähler; digits 6 (App) oder 8 (RFC-Testvektoren)
export async function hotp(secretB32, counter, digits = 6) {
  const key = await crypto.subtle.importKey('raw', base32Decode(secretB32), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const msg = new Uint8Array(8); let c = BigInt(counter);
  for (let i = 7; i >= 0; i--) { msg[i] = Number(c & 255n); c >>= 8n; }
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const o = h[h.length - 1] & 15;
  const bin = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** digits).padStart(digits, '0');
}
export const stepAt = (ms = Date.now()) => Math.floor(ms / 1000 / STEP_SEC);
export async function totpAt(secretB32, ms = Date.now(), digits = 6) { return hotp(secretB32, stepAt(ms), digits); }

// Prüft einen 6-stelligen Code; liefert den getroffenen Zeitschritt oder null. Schritte ≤ lastStep sind verbraucht (kein zweites Mal).
export async function verifyTotp(secretB32, code, lastStep = null, ms = Date.now()) {
  const c = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(c)) return null;
  const now = stepAt(ms);
  for (let d = -WINDOW; d <= WINDOW; d++) {
    const s = now + d;
    if (lastStep !== null && lastStep !== undefined && s <= lastStep) continue;
    if (timingSafeEqual(await hotp(secretB32, s), c)) return s;
  }
  return null;
}

export function otpauthUri(secret, username) {
  const issuer = 'CEVIK Fuhrpark';
  return `otpauth://totp/${encodeURIComponent(issuer + ':' + username)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SEC}`;
}

// Ersatzcodes: 10 Zeichen aus eindeutigem Alphabet (ohne 0/O/1/I/L), Anzeige xxxxx-xxxxx
const RC_ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789';
export function normRecovery(x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function newRecoveryCode() {
  const b = crypto.getRandomValues(new Uint8Array(10));
  const s = [...b].map((x) => RC_ALPHA[x % RC_ALPHA.length]).join('');
  return s.slice(0, 5) + '-' + s.slice(5);
}
async function recoveryHash(code) { return sha256Hex('cfp-rc:' + normRecovery(code)); }
async function makeRecovery() {
  const codes = Array.from({ length: RECOVERY_COUNT }, newRecoveryCode);
  return { codes, hashes: await Promise.all(codes.map(recoveryHash)) };
}
const parseRc = (x) => { try { const a = JSON.parse(x || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };

async function checkPassword(row, pw) {
  if (!row.password_hash) return false;
  const { hash } = await hashPassword(String(pw || ''), row.password_salt);
  return timingSafeEqual(hash, row.password_hash);
}

// ---- Eigenes Konto ----
export async function totpStatus(env, user) {
  const r = await env.DB.prepare('SELECT totp_enabled_at, totp_recovery FROM users WHERE id=?').bind(user.id).first();
  return { enabled: !!r.totp_enabled_at, enabled_at: r.totp_enabled_at || null, recovery_left: r.totp_enabled_at ? parseRc(r.totp_recovery).length : 0 };
}

// Schritt 1: Passwort bestätigen → neues Geheimnis (noch nicht aktiv) für den QR-Code
export async function totpSetup(env, user, body, auditFn) {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
  if (row.totp_enabled_at) throw bad('totp_already', 'Zwei-Faktor-Anmeldung ist bereits eingeschaltet.');
  await reauthLocked(env, user);
  if (!(await checkPassword(row, body.password))) { await reauthFailed(env, user); throw bad('wrong_password', 'Passwort falsch.'); }
  await reauthOk(env, user);
  const secret = newSecret();
  await env.DB.prepare('UPDATE users SET totp_pending=?, updated_at=? WHERE id=?').bind(secret, nowIso(), user.id).run();
  await auditFn(env, user.id, 'totp.setup_started', user.id, null);
  return { secret, uri: otpauthUri(secret, row.username) };
}

// Schritt 2: ersten Code aus der App eingeben → einschalten, Ersatzcodes einmalig anzeigen, andere Anmeldungen beenden
export async function totpEnable(env, user, body, auditFn) {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
  if (row.totp_enabled_at) throw bad('totp_already', 'Zwei-Faktor-Anmeldung ist bereits eingeschaltet.');
  if (!row.totp_pending) throw bad('totp_no_setup', 'Bitte zuerst „Einrichten“ wählen.');
  const step = await verifyTotp(row.totp_pending, body.code);
  if (step === null) throw bad('totp_invalid', 'Code falsch oder abgelaufen. Bitte den aktuellen Code aus der App eingeben (Uhrzeit des Handys prüfen).');
  const { codes, hashes } = await makeRecovery();
  const now = nowIso();
  // nur einschalten, wenn noch aus und dasselbe Geheimnis vorliegt (Muster cmd_guard): zwei gleichzeitige Aufrufe (Doppelklick, zwei Tabs)
  // lieferten vorher beide Ersatzcodes – gültig blieb nur der zweite Satz (17.10.2026)
  try {
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET totp_secret=totp_pending, totp_pending=NULL, totp_enabled_at=?, totp_last_step=?, totp_recovery=?, updated_at=? WHERE id=? AND totp_enabled_at IS NULL AND totp_pending=?')
        .bind(now, step, JSON.stringify(hashes), now, user.id, row.totp_pending),
      env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()'),
      env.DB.prepare('DELETE FROM cmd_guard'),
      env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash != ?').bind(user.id, user._session),
      env.DB.prepare('DELETE FROM login_challenges WHERE user_id=?').bind(user.id),
      pushOrphanStmt(env, user.id),
    ]);
  } catch (e) {
    if (String(e && e.message).includes('CHECK')) throw bad('totp_already', 'Zwei-Faktor-Anmeldung ist bereits eingeschaltet.');
    throw e;
  }
  await auditFn(env, user.id, 'totp.enable', user.id, null);
  return { ok: true, recovery_codes: codes };
}

// Ausschalten: Passwort + aktueller Code (oder Ersatzcode)
export async function totpDisable(env, user, body, auditFn) {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
  if (!row.totp_enabled_at) throw bad('totp_off', 'Zwei-Faktor-Anmeldung ist nicht eingeschaltet.');
  await reauthLocked(env, user);
  if (!(await checkPassword(row, body.password))) { await reauthFailed(env, user); throw bad('wrong_password', 'Passwort falsch.'); }
  const r = await checkSecondFactor(env, row, body.code);
  if (!r) { await reauthFailed(env, user); throw bad('totp_invalid', 'Code falsch oder abgelaufen.'); }
  await reauthOk(env, user);
  // wie beim Einschalten: andere Anmeldungen und offene Anmeldevorgänge enden (18.10.2026)
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET totp_secret=NULL, totp_pending=NULL, totp_enabled_at=NULL, totp_last_step=NULL, totp_recovery=NULL, updated_at=? WHERE id=?').bind(nowIso(), user.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash != ?').bind(user.id, user._session),
    env.DB.prepare('DELETE FROM login_challenges WHERE user_id=?').bind(user.id),
    pushOrphanStmt(env, user.id),
  ]);
  await auditFn(env, user.id, 'totp.disable', user.id, { by: r.kind });
  return { ok: true };
}

// Neue Ersatzcodes (alte werden ungültig): aktueller Code aus der App
export async function totpNewRecovery(env, user, body, auditFn) {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
  if (!row.totp_enabled_at) throw bad('totp_off', 'Zwei-Faktor-Anmeldung ist nicht eingeschaltet.');
  await reauthLocked(env, user);
  const step = await verifyTotp(row.totp_secret, body.code, row.totp_last_step);
  if (step === null) { await reauthFailed(env, user); throw bad('totp_invalid', 'Code falsch oder abgelaufen.'); }
  await reauthOk(env, user);
  const { codes, hashes } = await makeRecovery();
  // Code nur einmal verbrauchen (wie bei der Anmeldung): parallel mit demselben Code lieferten vorher beide neue Ersatzcodes (17.10.2026)
  const u = await env.DB.prepare('UPDATE users SET totp_last_step=?, totp_recovery=?, updated_at=? WHERE id=? AND totp_enabled_at IS NOT NULL AND (totp_last_step IS NULL OR totp_last_step < ?)')
    .bind(step, JSON.stringify(hashes), nowIso(), user.id, step).run();
  if (!u.meta || !u.meta.changes) throw bad('totp_invalid', 'Code falsch oder abgelaufen.');
  await auditFn(env, user.id, 'totp.recovery_renewed', user.id, null);
  return { ok: true, recovery_codes: codes };
}

// Code (6 Ziffern) oder Ersatzcode prüfen und verbrauchen. Liefert { kind: 'totp'|'recovery', left } oder null.
// Verbrauch atomar: Zeitschritt bzw. Ersatzcode-Liste wird nur geschrieben, wenn sie seit dem Lesen unverändert ist.
export async function checkSecondFactor(env, row, code) {
  const c = String(code || '').trim();
  if (/^\d{3}\s?\d{3}$/.test(c)) {
    const step = await verifyTotp(row.totp_secret, c, row.totp_last_step);
    if (step === null) return null;
    const r = await env.DB.prepare('UPDATE users SET totp_last_step=? WHERE id=? AND (totp_last_step IS NULL OR totp_last_step < ?)').bind(step, row.id, step).run();
    return r.meta.changes ? { kind: 'totp' } : null;
  }
  const n = normRecovery(c);
  if (n.length !== 10) return null;
  const list = parseRc(row.totp_recovery); const h = await recoveryHash(n);
  const idx = list.findIndex((x) => timingSafeEqual(x, h));
  if (idx < 0) return null;
  // genau diesen Code atomar aus der gespeicherten Liste entfernen (18.10.2026): vorher nur, wenn die ganze Liste seit dem Lesen gleich war –
  // zwei verschiedene gültige Ersatzcodes gleichzeitig: einer galt als „falsch“ und zählte als Fehlversuch
  const r = await env.DB.prepare(`UPDATE users SET totp_recovery=(SELECT json_group_array(value) FROM json_each(users.totp_recovery) WHERE value<>?1)
    WHERE id=?2 AND json_valid(totp_recovery) AND EXISTS (SELECT 1 FROM json_each(users.totp_recovery) WHERE value=?1) RETURNING totp_recovery`).bind(h, row.id).first();
  return r ? { kind: 'recovery', left: parseRc(r.totp_recovery).length } : null;
}

// ---- Anmeldung, zweiter Schritt ----
// pwHash: das eben geprüfte Passwort – Anmeldevorgang nur, wenn es noch gilt (gleichzeitiger Passwortwechsel, 17.10.2026)
export async function createChallenge(env, userId, pwHash) {
  const token = randomToken(24);
  const now = Date.now();
  const r = await env.DB.prepare(`INSERT INTO login_challenges(token_hash,user_id,created_at,expires_at,attempts) SELECT ?,?,?,?,0
    WHERE EXISTS (SELECT 1 FROM users WHERE id=? AND active=1 AND password_hash=?)`)
    .bind(await sha256Hex(token), userId, new Date(now).toISOString(), new Date(now + CHALLENGE_MIN * 60000).toISOString(), userId, pwHash || '').run();
  if (!r.meta || !r.meta.changes) throw new HttpError(401, 'invalid_login', 'Benutzername oder Passwort falsch.');
  return token;
}
// Liefert die Benutzerzeile bei Erfolg; sonst HttpError. Fehlversuche zählen je Anmeldevorgang (höchstens 5, dann neu mit Passwort).
export async function redeemChallenge(env, body) {
  const h = await sha256Hex(String(body.challenge || ''));
  const ch = await env.DB.prepare('SELECT c.*, u.* FROM login_challenges c JOIN users u ON u.id=c.user_id WHERE c.token_hash=?').bind(h).first();
  if (!ch || ch.expires_at < nowIso() || !ch.active || !ch.totp_enabled_at) {
    if (ch) await env.DB.prepare('DELETE FROM login_challenges WHERE token_hash=?').bind(h).run();
    throw new HttpError(401, 'totp_expired', 'Anmeldung abgelaufen. Bitte Benutzername und Passwort erneut eingeben.');
  }
  // Versuch VOR der Prüfung atomar reservieren (17.10.2026): vorher gelesen und nach der Prüfung absolut geschrieben –
  // parallel gesendete Codes wurden alle geprüft, die Grenze von CHALLENGE_TRIES je Anmeldevorgang griff nicht.
  const slot = await env.DB.prepare('UPDATE login_challenges SET attempts=attempts+1 WHERE token_hash=? AND attempts<? RETURNING attempts').bind(h, CHALLENGE_TRIES).first();
  if (!slot) {
    await env.DB.prepare('DELETE FROM login_challenges WHERE token_hash=?').bind(h).run();
    throw new HttpError(401, 'totp_expired', 'Zu viele falsche Codes. Bitte Benutzername und Passwort erneut eingeben.');
  }
  const r = await checkSecondFactor(env, ch, body.code);
  if (!r) {
    const tries = slot.attempts;
    if (tries >= CHALLENGE_TRIES) await env.DB.prepare('DELETE FROM login_challenges WHERE token_hash=?').bind(h).run();
    const e = new HttpError(401, tries >= CHALLENGE_TRIES ? 'totp_expired' : 'totp_invalid', tries >= CHALLENGE_TRIES
      ? 'Zu viele falsche Codes. Bitte Benutzername und Passwort erneut eingeben.' : 'Code falsch oder abgelaufen.');
    e.userRow = { id: ch.id, username: ch.username }; // für die Fehlversuch-Sperre des Kontos (nicht an die App)
    throw e;
  }
  await env.DB.prepare('DELETE FROM login_challenges WHERE token_hash=?').bind(h).run();
  return { row: ch, factor: r };
}

// ---- Verwaltung: Inhaber setzt die Zwei-Faktor-Anmeldung zurück (Handy verloren) ----
export async function totpReset(env, actor, userId, auditFn) {
  if (actor.role !== 'owner') throw new HttpError(403, 'forbidden', 'Nur der Inhaber darf die Zwei-Faktor-Anmeldung zurücksetzen.');
  if (actor.id === userId) throw bad('validation', 'Eigene Zwei-Faktor-Anmeldung bitte unter „Mein Konto“ ausschalten.');
  const t = await env.DB.prepare('SELECT id, totp_enabled_at FROM users WHERE id=?').bind(userId).first();
  if (!t) throw new HttpError(404, 'not_found', 'Benutzer nicht gefunden.');
  if (!t.totp_enabled_at) throw bad('totp_off', 'Zwei-Faktor-Anmeldung ist nicht eingeschaltet.');
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET totp_secret=NULL, totp_pending=NULL, totp_enabled_at=NULL, totp_last_step=NULL, totp_recovery=NULL, updated_at=? WHERE id=?').bind(nowIso(), userId),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId),
    pushOrphanStmt(env, userId), // verlorenes Handy bekommt keine Pushs mehr (18.10.2026)
    env.DB.prepare('DELETE FROM login_challenges WHERE user_id=?').bind(userId),
  ]);
  await auditFn(env, actor.id, 'totp.reset', userId, null);
  return { ok: true };
}
