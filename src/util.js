// [CLAUDE] Hilfsfunktionen ohne externe Abhängigkeiten (Cloudflare Workers / WebCrypto)

export const nowIso = () => new Date().toISOString();

export function uuid() {
  return crypto.randomUUID();
}

export class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const bad = (code, message, extra) => new HttpError(400, code, message, extra);
export const forbidden = (message = 'Keine Berechtigung für diese Aktion.') => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Nicht gefunden.') => new HttpError(404, 'not_found', message);
export const conflict = (code, message, extra) => new HttpError(409, code, message, extra);

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function errorResponse(err) {
  if (err instanceof HttpError) {
    return json({ error: err.code, message: err.message, ...(err.extra || {}) }, err.status);
  }
  console.error('Unerwarteter Fehler', err && err.stack ? err.stack : err);
  return json({ error: 'internal', message: 'Interner Fehler. Bitte erneut versuchen.' }, 500);
}

const enc = new TextEncoder();

export function bytesToHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(input) {
  const data = typeof input === 'string' ? enc.encode(input) : input;
  return bytesToHex(await crypto.subtle.digest('SHA-256', data));
}

export function randomToken(bytes = 32) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return b64urlEncode(b);
}

export function b64urlEncode(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function concatBytes(...arrs) {
  const len = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

// Passwort-Hash: PBKDF2-SHA256 (Workers erlauben max. 100.000 Iterationen)
const PBKDF2_ITER = 100000;
export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? b64urlDecode(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITER }, key, 256);
  return { hash: b64urlEncode(bits), salt: b64urlEncode(salt) };
}

export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function normalizeVin(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidVin(v) {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
}

export function str(v, { max = 2000, required = false, field = 'Feld' } = {}) {
  if (v === undefined || v === null) {
    if (required) throw bad('validation', `${field} ist erforderlich.`);
    return null;
  }
  const s = String(v).trim();
  if (!s) {
    if (required) throw bad('validation', `${field} ist erforderlich.`);
    return null;
  }
  if (s.length > max) throw bad('validation', `${field} ist zu lang (max. ${max} Zeichen).`);
  return s;
}

export function oneOf(v, allowed, field) {
  if (!allowed.includes(v)) throw bad('validation', `${field}: ungültiger Wert.`);
  return v;
}

export function num(v, { min = -Infinity, max = Infinity, field = 'Zahl', nullable = false } = {}) {
  if ((v === null || v === undefined || v === '') && nullable) return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < min || n > max) throw bad('validation', `${field}: ungültige Zahl.`);
  return n;
}

export async function readJson(request, maxBytes = 64 * 1024) {
  const text = await request.text();
  if (text.length > maxBytes) throw bad('too_large', 'Anfrage zu groß.');
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw bad('invalid_json', 'Ungültiges JSON.'); }
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

export function berlinDate(iso = nowIso()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date(iso));
}

// Mengenbegrenzung: höchstens `max` Aufrufe je `windowSec` und Schlüssel (eine Abfrage, atomar per UPSERT … RETURNING)
export const LIMITS = { upload: [60, 600], import: [20, 3600] };
export async function rateLimit(env, action, userId) {
  const [max, windowSec] = LIMITS[action];
  const win = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  const row = await env.DB.prepare(`INSERT INTO rate_limits(key, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END, window_start = excluded.window_start
    RETURNING count`).bind(`${action}:${userId}`, win).first();
  if (row && row.count > max) throw new HttpError(429, 'rate_limited', `Zu viele Vorgänge in kurzer Zeit (max. ${max} je ${Math.round(windowSec / 60)} Min.). Bitte später erneut versuchen.`);
}
