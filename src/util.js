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

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
export function bytesToHex(buf) {
  const b = new Uint8Array(buf);
  let out = '';
  for (let i = 0; i < b.length; i++) out += HEX[b[i]];
  return out;
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

// Zahlen aus Formularen: Dezimalkomma; deutsches Format mit Tausenderpunkt und Komma („1.234,50“) wird verstanden.
// Bei ganzzahligen Feldern (grouped: km, km-Kontingent) gilt „120.000“ als 120000. Sonst ist „2.000“ ohne Komma mehrdeutig (2 oder 2000?) und wird abgewiesen, statt still als 2 gespeichert zu werden.
export function num(v, { min = -Infinity, max = Infinity, field = 'Zahl', nullable = false, grouped = false } = {}) {
  if ((v === null || v === undefined || v === '') && nullable) return null;
  let n;
  if (typeof v === 'number') n = v;
  else {
    let t = String(v).trim().replace(/[\s\u00a0]/g, '');
    if ((t === '') && nullable) return null;
    if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, '');
    else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t) && grouped) t = t.replace(/\./g, ''); // ganze Zahlen (km): „120.000“ = 120000
    else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t)) throw bad('validation', `${field}: „${t}“ ist mehrdeutig – bitte ohne Tausenderpunkt (z. B. 2000) bzw. mit Komma für Nachkommastellen (z. B. 2,5) eingeben.`);
    n = Number(t.replace(',', '.'));
  }
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

// echtes Kalenderdatum JJJJ-MM-TT (z. B. 30.02. oder 31.04. abgewiesen – Date.parse nimmt Tage bis 31 an)
export function isCalendarDate(d) {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const x = new Date(d + 'T00:00:00Z');
  return !Number.isNaN(x.getTime()) && x.toISOString().slice(0, 10) === d;
}
export function addMonths(dateStr, months) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
}

// Formatter einmal erzeugen (Intl-Konstruktion ist teuer; Berichte rufen dies tausendfach auf – CPU-Budget je Worker-Aufruf)
let BERLIN_FMT = null;
export function berlinDate(iso = nowIso()) {
  if (!BERLIN_FMT) BERLIN_FMT = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' });
  return BERLIN_FMT.format(new Date(iso));
}

// Zeitpunkt für Agent-Meldungen (stabiler Text statt „seit X Min.“ – unveränderte Befunde müssen nicht neu geschrieben werden)
// Schnell: Zeitzonenversatz je UTC-Stunde zwischenspeichern (Sommer-/Winterzeit wechselt immer zur vollen UTC-Stunde),
// danach reine Rechnung statt Intl je Wert (CSV-Export mit Tausenden Zeitstempeln im CPU-Budget eines Worker-Aufrufs).
let BERLIN_HOUR_FMT = null;
const BERLIN_OFFSET = new Map();
function berlinOffsetMs(ms) {
  const key = Math.floor(ms / 3600000);
  let off = BERLIN_OFFSET.get(key);
  if (off === undefined) {
    if (!BERLIN_HOUR_FMT) BERLIN_HOUR_FMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' });
    const h = Number(BERLIN_HOUR_FMT.format(new Date(key * 3600000)));
    off = (((h - new Date(key * 3600000).getUTCHours()) % 24) + 24) % 24 * 3600000;
    if (BERLIN_OFFSET.size > 50000) BERLIN_OFFSET.clear();
    BERLIN_OFFSET.set(key, off);
  }
  return off;
}
// Beginn eines Berliner Kalendertags als UTC-Zeitpunkt (ISO); Zeitumstellung liegt nie um Mitternacht (01:00/02:00 UTC)
export function berlinDayStartIso(dateStr) {
  const ms = Date.parse(dateStr + 'T00:00:00Z');
  return new Date(ms - berlinOffsetMs(ms - 7200000)).toISOString();
}
const p2 = (n) => (n < 10 ? '0' + n : String(n));
export function berlinDateTime(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms + berlinOffsetMs(ms));
  return `${p2(d.getUTCDate())}.${p2(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
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

// CSV mit Anführungszeichen (RFC 4180, Trennzeichen ; oder ,)
export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0] || '';
  const sep = firstLine.includes(';') ? ';' : ',';
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"' && cell === '') q = true;
    else if (c === sep) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

// iCalendar (RFC 5545): ganztägige Termine mit optionaler Erinnerung; TEXT-Werte maskiert (\\ ; , Zeilenumbruch), Zeilen auf 75 Oktette gefaltet
export function icsEscape(x) {
  return String(x ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
export function icsCalendar(name, events, stamp = new Date().toISOString()) {
  // Byte-Länge je Zeichen ohne TextEncoder (der je Zeichen aufgerufen ≈ 50× langsamer war: 900 Termine ≈ 600 ms CPU)
  const fold = (line) => {
    if (line.length <= 25) return line; // ≤ 3 Byte je UTF-16-Einheit → sicher ≤ 75 Oktette
    if (!/[^\x00-\x7f]/.test(line)) { // nur ASCII: 1 Byte je Zeichen
      if (line.length <= 75) return line;
      const parts = [line.slice(0, 75)];
      for (let i = 75; i < line.length; i += 74) parts.push(' ' + line.slice(i, i + 74));
      return parts.join('\r\n');
    }
    const out = []; let cur = ''; let n = 0;
    for (const ch of line) {
      const c = ch.codePointAt(0); const b = c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
      if (n + b > 75) { out.push(cur); cur = ' '; n = 1; }
      cur += ch; n += b;
    }
    out.push(cur); return out.join('\r\n');
  };
  const d8 = (d) => d.replace(/-/g, '');
  const next = (d) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
  const ts = stamp.replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cevik Mobility//CLAUDE Fuhrpark//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${icsEscape(name)}`];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@cevik-fuhrpark-claude`, `DTSTAMP:${ts}`, `DTSTART;VALUE=DATE:${d8(e.date)}`, `DTEND;VALUE=DATE:${d8(next(e.date))}`,
      `SUMMARY:${icsEscape(e.summary)}`, `DESCRIPTION:${icsEscape(e.description || '')}`, 'TRANSP:TRANSPARENT');
    if (e.alarmDays !== null && e.alarmDays !== undefined) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEscape(e.alarm || e.summary)}`, `TRIGGER:-P${e.alarmDays}D`, 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

// Einstellung des Inhabers: Testkonten dürfen gemeinsame Stammdaten (ohne Test/Betrieb-Trennung) nur lesen
export async function testMasterReadonly(env) {
  const r = await env.DB.prepare(`SELECT value FROM settings WHERE key='test_master_readonly'`).first();
  return !!r && r.value === '1';
}

// Datensparsamkeit Lesezugriff (viewer): Namen von Personen mit Rolle Fahrer werden ausgeblendet
// (wer wann welches Fahrzeug kontrolliert/gemeldet hat, ist personenbeziehbar). Andere Namen (Werkstatt, Leitung) bleiben.
// Setzt `<nameKey>` auf null und `<nameKey>_hidden` auf true; die Rollenspalte wird immer entfernt.
export function hideDriverName(user, row, nameKey, roleKey) {
  if (!row) return row;
  const isDriver = row[roleKey] === 'driver';
  delete row[roleKey];
  if (user.role === 'viewer' && isDriver) { row[nameKey] = null; row[nameKey + '_hidden'] = true; }
  return row;
}
