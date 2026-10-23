// [CLAUDE] Hilfsfunktionen ohne externe Abhängigkeiten (Cloudflare Workers / WebCrypto)

export const nowIso = () => new Date().toISOString();
// Zeitstempel für Änderungen mit Vergleich auf den gelesenen Stand (updated_at): immer später als der alte Wert, auch bei gleicher Millisekunde
export const laterIso = (prev) => { const n = Date.now(); const p = Date.parse(prev || ''); return new Date(Number.isFinite(p) && p >= n ? p + 1 : n).toISOString(); };

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
// extra.denied: maschinenlesbarer Grund (App übersetzt danach statt nur „Keine Berechtigung“) – 21.10.2026
export const forbidden = (message = 'Keine Berechtigung für diese Aktion.', extra) => new HttpError(403, 'forbidden', message, extra);
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
    // err.headers: zusätzliche Antwort-Header (z. B. Retry-After bei 429, WWW-Authenticate bei 401 – 22.10.2026)
    return json({ error: err.code, message: err.message, ...(err.extra || {}) }, err.status, err.headers || {});
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

// Synchrones SHA-256 (FIPS 180-4) für kurze Texte – gleiches Ergebnis wie sha256Hex (22.10.2026). Grund: Rechenzeit-Grenze 10 ms je Aufruf;
// crypto.subtle kostet je Aufruf einen eigenen asynchronen Auftrag (lokal ≈ 45 µs), der Fuhrparkagent braucht im ersten Lauf einer
// Worker-Instanz Hunderte Fingerabdrücke. Nur für Fingerabdrücke/Ereigniskennungen, nicht für Geheimnisse (Passwörter: PBKDF2 über crypto.subtle).
const SHA_K = new Uint32Array([0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d,
  0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
const SHA_W = new Uint32Array(64);
export function sha256HexSync(input) {
  const data = typeof input === 'string' ? enc.encode(input) : new Uint8Array(input);
  const len = data.length; const nBlocks = ((len + 9 + 63) >> 6);
  const buf = new Uint8Array(nBlocks << 6); buf.set(data); buf[len] = 0x80;
  const bits = len * 8; const dv = new DataView(buf.buffer);
  dv.setUint32(buf.length - 8, Math.floor(bits / 0x100000000)); dv.setUint32(buf.length - 4, bits >>> 0);
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = SHA_W;
  for (let off = 0; off < buf.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15], b = w[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (h + S1 + ((e & f) ^ (~e & g)) + SHA_K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  let out = '';
  for (const x of [h0, h1, h2, h3, h4, h5, h6, h7]) out += HEX[(x >>> 24) & 255] + HEX[(x >>> 16) & 255] + HEX[(x >>> 8) & 255] + HEX[x & 255];
  return out;
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
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  // Laufzeit hängt nur von der Länge des erwarteten Werts ab, nicht vom Treffer oder der Länge der Eingabe (20.10.2026: vorher Abbruch bei ungleicher Länge)
  let r = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) r |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ b.charCodeAt(i);
  return r === 0;
}

export function normalizeVin(v) {
  // „VIN:…“ = Fahrzeugschlüssel der App (z. B. Spalte „FIN-Schlüssel“ im Prüftermin-Export) – Präfix gehört nicht zur FIN
  return String(v || '').replace(/^\s*VIN:/i, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidVin(v) {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
}

// [CLAUDE] Freitext bereinigen (22.10.2026, Fund „ungewöhnliche Texteingaben“): einheitlich NFC (ein am Mac kopiertes „Ü“ als U + ¨
// traf weder Kennzeichen-Zuordnung noch Suche), Bidi-Steuerzeichen (Überschreiben/Einbetten/Isolieren; „‮AZ-123“ wurde verdreht
// angezeigt, auch die folgenden Angaben der Zeile) und Steuerzeichen außer Tab/Zeilenumbruch entfernen (Null-Byte kürzte still).
const TEXT_CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;
export const cleanText = (s) => String(s).normalize('NFC').replace(TEXT_CTRL, '');
// Text auf n UTF-16-Einheiten kürzen, ohne ein Emoji zu zerteilen (halbes Surrogatpaar → „�“ in Anzeige/CSV)
export const cutText = (s, n) => { const x = String(s ?? ''); if (x.length <= n) return x; const r = x.slice(0, n); return /[\uD800-\uDBFF]$/.test(r) ? r.slice(0, -1) : r; };

export function str(v, { max = 2000, required = false, field = 'Feld' } = {}) {
  if (v === undefined || v === null) {
    if (required) throw bad('validation', `${field} ist erforderlich.`);
    return null;
  }
  // Objekt/Liste statt Text (z. B. {"name": []}) nie als „[object Object]“ speichern
  if (typeof v === 'object') throw bad('validation', `${field}: ungültiger Wert.`);
  const s = cleanText(v).trim();
  if (!s) {
    if (required) throw bad('validation', `${field} ist erforderlich.`);
    return null;
  }
  if (s.length > max) throw bad('validation', `${field} ist zu lang (max. ${max} Zeichen).`);
  return s;
}

// Ja/Nein-Felder: nur true/false (bzw. 1/0, "true"/"false"); Text wie "false"/"nein" galt vorher als „ja“ (17.10.2026:
// Fahrer still reaktiviert, interner Hinweis für Fahrer sichtbar, Restarbeit sicherheitsrelevant). Fehlt der Wert → def.
export function flag(v, field, def = false) {
  if (v === undefined || v === null) return def;
  if (v === true || v === 1 || v === '1' || v === 'true') return true;
  if (v === false || v === 0 || v === '0' || v === 'false' || v === '') return false;
  throw bad('validation', `${field}: ungültiger Wert.`);
}

export function oneOf(v, allowed, field) {
  if (!allowed.includes(v)) throw bad('validation', `${field}: ungültiger Wert.`);
  return v;
}

// Zahlen aus Formularen: Dezimalkomma; deutsches Format mit Tausenderpunkt und Komma („1.234,50“) wird verstanden.
// Bei ganzzahligen Feldern (grouped: km, km-Kontingent) gilt „120.000“ als 120000. Sonst ist „2.000“ ohne Komma mehrdeutig (2 oder 2000?) und wird abgewiesen, statt still als 2 gespeichert zu werden.
// cents: Geldbetrag – höchstens 2 Nachkommastellen (18.10.2026: „100,0051“ wurde ungerundet gespeichert, Summen wichen ab)
// Komma als Dezimalzeichen für Mengenfelder – nicht bei englischer Oberfläche: „1,500“ meint dort 1500 (19.10.2026: wurde still 1,5)
// Sprache des sendenden Geräts (Kopf x-cfp-lang, worker.js) vor der Kontosprache
const numLang = (user) => user && (user.inputLang || user.language);
export const commaDec = (user) => numLang(user) !== 'en';
// Punkt als Dezimalzeichen (englische Oberfläche): „150.555“ ist 150,555 → „höchstens 2 Nachkommastellen“ statt „mehrdeutig“ (19.10.2026)
export const pointDec = (user) => numLang(user) === 'en';
// decimalComma: Mengenfeld (Lager, Teile) – „4,750“ ist 4,75 (3 Nachkommastellen), nicht das englische Tausenderkomma
// km-Stände/-Fälligkeiten: nur ganze Zahlen (21.10.2026: „158,5“ wurde still zu 159 km, „0,4“ zu 0 km gerundet – wer 158.500 meinte, bekam 159);
// Tausenderpunkt „120.000“ bleibt erlaubt. Telematik (Kommawerte vom Gerät) rundet weiter selbst.
// Obergrenze „heute + n Jahre“ (Berliner Tag) für Fälligkeiten/Vertragsdaten – Jahres-Tippfehler 2062 statt 2026 (21.10.2026)
export const maxFutureDate = (years = 20) => { const t = berlinDate(); return String(Number(t.slice(0, 4)) + years) + t.slice(4); };
export const DUE_FAR_MSG = 'Fälligkeit liegt mehr als 20 Jahre in der Zukunft – bitte Jahr prüfen.';
export function kmNum(v, { min = 0, max = 5000000, field = 'Kilometerstand' } = {}) {
  const n = num(v, { min, max, field, grouped: true });
  if (!Number.isInteger(n)) throw bad('validation', `${field}: ganze Zahl.`);
  return n;
}
export function num(v, { min = -Infinity, max = Infinity, field = 'Zahl', nullable = false, grouped = false, cents = false, decimalComma = false, decimalPoint = false } = {}) {
  if ((v === null || v === undefined || v === '') && nullable) return null;
  let n;
  if (typeof v === 'number') n = v;
  else {
    // nur Text oder Zahl (17.10.2026: Liste ['7'] galt als 7, true als 1); leer ohne nullable → 400 statt still 0
    if (typeof v !== 'string') throw bad('validation', `${field}: ungültige Zahl.`);
    let t = v.trim().replace(/[\s\u00a0]/g, '');
    if (t === '') { if (nullable) return null; throw bad('validation', `${field}: ungültige Zahl.`); }
    if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(t)) t = t.replace(/\./g, '');
    // englisches Format mit Tausenderkomma und Dezimalpunkt („1,234.50“) ist eindeutig (19.10.2026: in der EN-Oberfläche abgewiesen)
    else if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(t)) t = t.replace(/,/g, '');
    else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t) && grouped) t = t.replace(/\./g, ''); // ganze Zahlen (km): „120.000“ = 120000
    else if (!decimalPoint && /^-?[1-9]\d{0,2}(\.\d{3})+$/.test(t)) throw bad('validation', `${field}: „${t}“ ist mehrdeutig – bitte ohne Tausenderpunkt (z. B. 2000) bzw. mit Komma für Nachkommastellen (z. B. 2,5) eingeben.`);
    // englisches Tausenderkomma „15,000“/„1,000“ ebenso mehrdeutig (18.10.2026: wurde still als 15 bzw. 1 € gespeichert, km „120,500“ als 121)
    // ganze Zahlen (km): Tausenderkomma ohne Nachkommastellen-Hinweis melden (19.10.2026: „158,500“ km nannte „Punkt für Nachkommastellen“)
    else if (grouped && /^-?[1-9]\d{0,2}(,\d{3})+$/.test(t)) throw bad('validation', `${field}: „${t}“ – bitte ohne Tausendertrennzeichen eingeben (z. B. ${t.replace(/,/g, '')}).`);
    else if (!decimalComma && /^-?[1-9]\d{0,2}(,\d{3})+$/.test(t)) throw bad('validation', `${field}: „${t}“ ist mehrdeutig – bitte ohne Tausendertrennzeichen (z. B. 15000) bzw. mit Komma für Nachkommastellen (z. B. 2,5) eingeben.`);
    // nur Dezimalzahlen (kein „0x1E240“, „0b101“, „1e5“ – Number() verstünde sie)
    if (!/^[-+]?(\d+([.,]\d+)?|[.,]\d+)$/.test(t)) throw bad('validation', `${field}: ungültige Zahl.`);
    n = Number(t.replace(',', '.'));
  }
  if (!Number.isFinite(n)) throw bad('validation', `${field}: ungültige Zahl.`);
  // außerhalb des Bereichs: Grenze nennen (19.10.2026: nur „ungültige Zahl“, z. B. km 9 999 999 oder 30 Stunden)
  if (n < min || n > max) {
    if (Number.isFinite(min) && Number.isFinite(max)) throw bad('validation', `${field}: zulässig von ${min} bis ${max}.`);
    if (Number.isFinite(max)) throw bad('validation', `${field}: höchstens ${max}.`);
    throw bad('validation', `${field}: mindestens ${min}.`);
  }
  if (cents && Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) throw bad('validation', `${field}: höchstens 2 Nachkommastellen.`);
  return n;
}

export async function readJson(request, maxBytes = 64 * 1024) {
  const text = await request.text();
  if (text.length > maxBytes) throw bad('request_too_large', 'Anfrage zu groß.'); // eigener Code: „too_large“ wird in der App als „max. 5 MB“ übersetzt (18.10.2026)
  if (!text) return {};
  let v; try { v = JSON.parse(text); } catch { throw bad('invalid_json', 'Ungültiges JSON.'); }
  // Alle Endpunkte erwarten ein Objekt – „null“, Zahl, Text oder Liste führten sonst zu „Interner Fehler“ (Zugriff auf Felder von null)
  if (v === null || typeof v !== 'object' || Array.isArray(v)) throw bad('invalid_json', 'Ungültiges JSON.');
  return v;
}

// Ganzzahliger Abfrageparameter (limit, days, weeks …): fehlend/ungültig → Vorgabe, Kommazahl abgerundet, in [min, max] begrenzt.
// Vorher führten „limit=2.5“ (SQLite: datatype mismatch) oder „limit=-2“ (LIMIT -1 = unbegrenzt, danach Array-Fehler) zu „Interner Fehler“.
export function intParam(v, def, min, max) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n !== 0 ? Math.min(Math.max(n, min), max) : def;
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const raw = part.slice(i + 1).trim();
    // fremdes Cookie mit ungültiger %-Folge (z. B. „consent=50%off“) → unverändert statt 500 bei jedem Aufruf (17.10.2026)
    try { out[part.slice(0, i).trim()] = decodeURIComponent(raw); } catch { out[part.slice(0, i).trim()] = raw; }
  }
  return out;
}

// echtes Kalenderdatum JJJJ-MM-TT (z. B. 30.02. oder 31.04. abgewiesen – Date.parse nimmt Tage bis 31 an)
export function isCalendarDate(d) {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  // plausibler Bereich (17.10.2026: „9999-12-31“ als „unbefristet“ ergab Folgetag +010000 → ungültige Kalenderdatei)
  if (d < '1900-01-01' || d > '2199-12-31') return false;
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
// 22.10.2026: zwischen 1900 und 2199 über den je UTC-Stunde zwischengespeicherten Versatz (gleiches Ergebnis, ohne Intl je Aufruf –
// im Fuhrparkagenten ≈ 2 % der Rechenzeit); sonst wie bisher über Intl
const BD_LO = Date.UTC(1900, 0, 1); const BD_HI = Date.UTC(2200, 0, 1);
export function berlinDate(iso = nowIso()) {
  const ms = new Date(iso).getTime();
  if (ms >= BD_LO && ms < BD_HI) return new Date(ms + berlinOffsetMs(ms)).toISOString().slice(0, 10);
  if (!BERLIN_FMT) BERLIN_FMT = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' });
  return BERLIN_FMT.format(new Date(iso));
}

// Zeitpunkt für Agent-Meldungen (stabiler Text statt „seit X Min.“ – unveränderte Befunde müssen nicht neu geschrieben werden)
// Schnell: Zeitzonenversatz je UTC-Stunde zwischenspeichern (Sommer-/Winterzeit wechselt immer zur vollen UTC-Stunde),
// danach reine Rechnung statt Intl je Wert (CSV-Export mit Tausenden Zeitstempeln im CPU-Budget eines Worker-Aufrufs).
let BERLIN_HOUR_FMT = null;
const BERLIN_OFFSET = new Map();
function berlinOffsetHourIntl(key) {
  if (!BERLIN_HOUR_FMT) BERLIN_HOUR_FMT = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' });
  const h = Number(BERLIN_HOUR_FMT.format(new Date(key * 3600000)));
  return (((h - new Date(key * 3600000).getUTCHours()) % 24) + 24) % 24 * 3600000;
}
// 22.10.2026 (Rechenzeit): je Kalenderjahr die Umstellungszeitpunkte nach EU-Regel (letzter Sonntag im März/Oktober, 01:00 UTC) vorhersagen und
// mit 4 Intl-Abfragen an den Grenzen bestätigen; bestätigt → Versatz für das ganze Jahr ohne Intl (vorher je UTC-Stunde eine Intl-Abfrage:
// Fuhrparkagent im ersten Lauf einer Instanz ≈ 25 ms nur dafür). Nicht bestätigt (andere Jahre/Regeln, z. B. vor 1996 oder nach einer
// künftigen Abschaffung der Zeitumstellung in der Zeitzonendatenbank) → wie bisher je Stunde über Intl. Ergebnis immer gleich Intl.
const BERLIN_YEAR = new Map();
function lastSundayUtc1(year, month) { const d = new Date(Date.UTC(year, month + 1, 0, 1)); d.setUTCDate(d.getUTCDate() - d.getUTCDay()); return d.getTime(); }
function berlinYearRule(year) {
  let r = BERLIN_YEAR.get(year);
  if (r === undefined) {
    const start = lastSundayUtc1(year, 2); const end = lastSundayUtc1(year, 9); const H = 3600000;
    const ok = berlinOffsetHourIntl(start / H - 1) === H && berlinOffsetHourIntl(start / H) === 2 * H && berlinOffsetHourIntl(end / H - 1) === 2 * H && berlinOffsetHourIntl(end / H) === H
      && berlinOffsetHourIntl(Date.UTC(year, 0, 1) / H) === H && berlinOffsetHourIntl(Date.UTC(year, 11, 31, 23) / H) === H;
    r = ok ? { start, end } : null;
    BERLIN_YEAR.set(year, r);
  }
  return r;
}
function berlinOffsetMs(ms) {
  const rule = berlinYearRule(new Date(ms).getUTCFullYear());
  if (rule) return ms >= rule.start && ms < rule.end ? 7200000 : 3600000;
  const key = Math.floor(ms / 3600000);
  let off = BERLIN_OFFSET.get(key);
  if (off === undefined) {
    off = berlinOffsetHourIntl(key);
    if (BERLIN_OFFSET.size > 50000) BERLIN_OFFSET.clear();
    BERLIN_OFFSET.set(key, off);
  }
  return off;
}
// Berliner Kalendertag eines gespeicherten UTC-Zeitstempels direkt in SQL (SQLite/D1 kennt keine Zeitzonen):
// Sommerzeit (+2 h) vom letzten Sonntag im März 01:00 UTC bis zum letzten Sonntag im Oktober 01:00 UTC, sonst +1 h (EU-Regel).
// datetime() vereinheitlicht „2026-10-12T22:30:00.000Z“ zu „2026-10-12 22:30:00“, damit der Textvergleich stimmt.
export function berlinDaySql(col) {
  const t = `datetime(${col})`; const y = `substr(${t},1,4)`;
  return `date(${t}, CASE WHEN ${t} >= datetime(${y}||'-03-25','weekday 0','+1 hour') AND ${t} < datetime(${y}||'-10-25','weekday 0','+1 hour') THEN '+2 hours' ELSE '+1 hour' END)`;
}
// Beginn eines Berliner Kalendertags als UTC-Zeitpunkt (ISO); Zeitumstellung liegt nie um Mitternacht (01:00/02:00 UTC)
// Beginn des Fensters „letzte N Tage“ in Berliner Kalendertagen einschließlich heute (00:00 Berlin vor N−1 Tagen) – statt
// N × 24 h ab jetzt (Ergebnis hing von der Uhrzeit ab; Zeitumstellung), 18.10.2026
export function berlinWindowStartIso(days) {
  return berlinDayStartIso(new Date(Date.parse(berlinDate() + 'T00:00:00Z') - (days - 1) * 86400000).toISOString().slice(0, 10));
}
export function berlinDayStartIso(dateStr) {
  const ms = Date.parse(dateStr + 'T00:00:00Z');
  return new Date(ms - berlinOffsetMs(ms - 7200000)).toISOString();
}
// Wanduhrzeit in Berlin ohne Zeitzone („2026-07-01T08:30“, z. B. Tatzeit aus einem Behördenschreiben) → UTC-ISO.
// Unabhängig von der Zeitzone des Geräts bzw. des Servers. Angaben mit Zeitzone (Z, +02:00) bleiben unverändert;
// ungültiges Kalenderdatum/Uhrzeit (30.02., 24:00) → null. Zeitumstellung: Uhrzeit in der übersprungenen Stunde (02:30 im März)
// wird wie 03:30 Sommerzeit gelesen, die doppelte Stunde im Oktober als Winterzeit (zweites Auftreten).
// auch mit Leerzeichen statt „T“ und Sekundenbruchteilen (wurden vorher als UTC gelesen – Tatzeit 2 h verschoben, 17.10.2026)
const NAIVE_LOCAL = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?$/;
export function berlinLocalToIso(v) {
  const s = String(v ?? '').trim();
  const m = NAIVE_LOCAL.exec(s);
  if (!m) return s;
  const [y, mo, d, h, mi, se] = m.slice(1).map((x) => Number(x || 0));
  const ms = Date.UTC(y, mo - 1, d, h, mi, se);
  const c = new Date(ms);
  if (c.getUTCFullYear() !== y || c.getUTCMonth() !== mo - 1 || c.getUTCDate() !== d || h > 23 || mi > 59 || se > 59) return null;
  return new Date(ms - berlinOffsetMs(ms - berlinOffsetMs(ms))).toISOString();
}
// Persönliche Ruhezeit (Wanduhrzeit Berlin „HH:MM“–„HH:MM“, auch über Mitternacht, z. B. 22:00–06:00):
// liegt nowMs darin → Ende der Ruhezeit als UTC-ISO, sonst null. Gleiche oder fehlende Zeiten = keine Ruhezeit.
export const QUIET_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export function quietHoldUntil(from, to, nowMs = Date.now()) {
  if (!QUIET_TIME.test(from || '') || !QUIET_TIME.test(to || '') || from === to) return null;
  const mins = (x) => Number(x.slice(0, 2)) * 60 + Number(x.slice(3, 5));
  const f = mins(from); const t = mins(to);
  const curOf = (ms) => { const l = new Date(ms + berlinOffsetMs(ms)); return l.getUTCHours() * 60 + l.getUTCMinutes(); };
  const inQuiet = (ms) => { const c = curOf(ms); return f < t ? c >= f && c < t : c >= f || c < t; };
  if (!inQuiet(nowMs)) return null;
  const local = new Date(nowMs + berlinOffsetMs(nowMs)); const cur = curOf(nowMs);
  const day = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + (cur < t ? 0 : 1))).toISOString().slice(0, 10);
  const cand = Date.parse(berlinLocalToIso(`${day}T${to}`));
  // Nacht der Zeitumstellung (18.10.2026): Ende 02:xx gibt es im Frühjahr nicht bzw. im Herbst doppelt – maßgeblich ist die erste Minute,
  // deren Wanduhrzeit außerhalb der Ruhezeit liegt (Frühjahr 03:00 MESZ, Herbst das erste 02:xx). Sonst ist das der berechnete Zeitpunkt.
  if (curOf(cand) === t && !inQuiet(cand) && (cand - 60000 <= nowMs || inQuiet(cand - 60000))) {
    // Herbst: erste Minute außerhalb ist evtl. eine Stunde früher (erstes Auftreten der doppelten Uhrzeit)
    const early = cand - 3600000;
    if (early > nowMs && curOf(early) === t && !inQuiet(early)) return new Date(early).toISOString();
    return new Date(cand).toISOString();
  }
  let ms = Math.floor((Math.max(nowMs, cand - 3 * 3600000)) / 60000) * 60000; if (ms < nowMs || !inQuiet(ms)) ms = Math.ceil(nowMs / 60000) * 60000;
  // Ende = erste Minute außerhalb der Ruhezeit oder in der die Wanduhrzeit das Ende überspringt (Frühjahr: 01:59 → 03:00)
  for (let i = 0, prev = curOf(ms); i < 6 * 60; i++) { const c = curOf(ms); if (!inQuiet(ms) || (prev < t && c > t)) return new Date(ms).toISOString(); prev = c; ms += 60000; }
  return new Date(cand).toISOString();
}
const p2 = (n) => (n < 10 ? '0' + n : String(n));
export function berlinDateTime(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms + berlinOffsetMs(ms));
  return `${p2(d.getUTCDate())}.${p2(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}
// Datum + Uhrzeit (Berliner Zeit) in der Schreibweise der Sprache – für Hinweistexte (Sperrbildschirm), z. B. Anmelde-Hinweis
const EN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function berlinDateTimeLang(iso, lang) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms + berlinOffsetMs(ms));
  const hm = `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
  const dmy = `${p2(d.getUTCDate())}.${p2(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
  if (lang === 'en') return `${d.getUTCDate()} ${EN_MON[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${hm}`;
  if (lang === 'uk') return `${dmy} о ${hm}`;
  return `${dmy}, ${hm} Uhr`;
}

// Kalenderdatum (JJJJ-MM-TT) in der Schreibweise der Sprache wie in der Oberfläche: DE/UK 05.01.2027, EN 05/01/2027 (sonst unverändert)
export function dateLang(ymd, lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) return String(ymd ?? '');
  return lang === 'en' ? `${m[3]}/${m[2]}/${m[1]}` : `${m[3]}.${m[2]}.${m[1]}`;
}

// Mengenbegrenzung: höchstens `max` Aufrufe je `windowSec` und Schlüssel (eine Abfrage, atomar per UPSERT … RETURNING)
// Importe: Übernehmen 20/Std.; Vorschauen (dry_run, schreiben nichts) eigenes Fenster 120/Std. – Datei korrigieren und erneut prüfen
// soll die Übernahme nicht aufbrauchen (5 Importarten × mehrere Vorschauen je Datei)
export const LIMITS = { upload: [60, 600], import: [20, 3600], preview: [120, 3600] };
export async function rateLimit(env, action, userId) {
  const [max, windowSec] = LIMITS[action];
  const win = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  const row = await env.DB.prepare(`INSERT INTO rate_limits(key, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET count = CASE WHEN rate_limits.window_start = excluded.window_start THEN rate_limits.count + 1 ELSE 1 END, window_start = excluded.window_start
    RETURNING count`).bind(`${action}:${userId}`, win).first();
  if (row && row.count > max) throw new HttpError(429, 'rate_limited', `Zu viele Vorgänge in kurzer Zeit (max. ${max} je ${Math.round(windowSec / 60)} Min.). Bitte später erneut versuchen.`);
}

// CSV mit Anführungszeichen (RFC 4180, Trennzeichen ; oder ,)
// Jede Zeile trägt die physische Zeilennummer der Datei als nicht aufzählbare Eigenschaft `line` (Kopfzeile = 1) –
// Leerzeilen und Zeilenumbrüche in Anführungszeichen verschieben so die Zeilenangaben der Import-Vorschauen nicht.
// [CLAUDE] CSV-Exporte: reine Kalendertage (JJJJ-MM-TT) als TT.MM.JJJJ wie in der App und in den übrigen Spalten
// (Zeitpunkte kommen bereits als „TT.MM.JJJJ HH:MM“). Nur ganze, nicht in Anführungszeichen stehende Felder;
// Monatswerte (JJJJ-MM), Kalenderwochen und Freitext bleiben unverändert. Ungültige Tage (2026-02-30) bleiben wie sie sind.
// Kennungen (Schadennummer, Aktenzeichen, Vertrags-/Teilenummer, Beleg), die wie JJJJ-MM-TT aussehen, in Anführungszeichen setzen –
// `csvDatesDe` schreibt nur unquotierte Daten um (Schadennummer „2026-10-01“ wurde „01.10.2026“, 18.10.2026); sonst unverändert
export const quoteCell = (cell) => (/^\d{4}-\d{2}-\d{2}$/.test(cell) ? `"${cell}"` : cell);
export function csvDatesDe(text) {
  const s = String(text); let out = ''; let field = ''; let q = false; let quoted = false;
  const flush = () => {
    const m = !quoted && /^(\d{4})-(\d{2})-(\d{2})$/.exec(field);
    out += m && isCalendarDate(field) ? `${m[3]}.${m[2]}.${m[1]}` : field; field = ''; quoted = false;
  };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { field += c; if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else q = false; } continue; }
    if (c === '"' && field === '') { q = true; quoted = true; field += c; continue; }
    if (c === ';' || c === '\n' || c === '\r') { flush(); out += c; continue; }
    field += c;
  }
  flush();
  return out;
}

// Zentral im Worker auf jede API-Antwort angewandt: nur erfolgreiche CSV-Exporte werden umgeschrieben, BOM (Excel) bleibt erhalten.
export async function csvResponseDatesDe(res) {
  if (res.status !== 200 || !(res.headers.get('content-type') || '').startsWith('text/csv')) return res;
  return new Response(csvDatesDe(new TextDecoder('utf-8', { ignoreBOM: true }).decode(await res.arrayBuffer())), res);
}

export function parseCsv(text) {
  // NFC: zerlegte Umlaute (z. B. Mac-Export „Ku\u0308ndigungsfrist“) wie zusammengesetzte behandeln – Spalten/Werte/Dubletten (19.10.2026)
  let src = String(text || '').replace(/^\uFEFF/, '').normalize('NFC');
  // Excel-Hinweiszeile „sep=;“ am Dateianfang: Trenner übernehmen, Zeile entfernen (21.10.2026: sonst galt sie als Kopfzeile → „Spalte fehlt“)
  const sepLine = /^sep=(.)\r?(?:\n|$)/i.exec(src);
  if (sepLine) src = src.slice(sepLine[0].length);
  // Trenner aus der ersten nicht-leeren Zeile (22.10.2026: Leerzeile vor der Kopfzeile ergab Komma statt Semikolon → „Spalten erforderlich“)
  const firstLine = src.split(/\r\n|\r|\n/).find((l) => l.trim() !== '') || '';
  // Trenner aus der Kopfzeile: Semikolon (Excel DE), Tabulator (Excel „Unicode-Text“), sonst Komma
  const sep = sepLine ? sepLine[1] : firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
  const rows = []; let row = []; let cell = ''; let q = false; let lineNo = 1; let start = 1;
  const pushRow = () => { if (row.some((x) => x !== '')) { Object.defineProperty(row, 'line', { value: start, enumerable: false }); rows.push(row); } };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else { cell += c; if (c === '\n') lineNo++; }
    } else if (c === '"' && cell.trim() === '') { q = true; cell = ''; } // auch nach Leerzeichen hinter dem Trenner („a, \"Köln, Nord\"“; 21.10.2026 verschob es die Spalten)
    else if (c === sep) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      pushRow();
      row = []; lineNo++; start = lineNo;
    } else cell += c;
  }
  // Anführungszeichen bis zum Dateiende offen: Rest der Datei stünde sonst still in einer Zelle (21.10.2026: Zeilen fehlten ohne Meldung)
  if (q) throw bad('csv_quote', `Zeile ${start}: Anführungszeichen nicht geschlossen – bitte die Datei prüfen.`);
  row.push(cell.trim());
  pushRow();
  // mehr Werte als Spalten in der Kopfzeile: Trennzeichen im Wert (z. B. Dezimalkomma „12,50“ in einer Komma-Datei) – Spalten wären still
  // verschoben bzw. der Rest abgeschnitten (22.10.2026: Preis 12 statt 12,50 €, Nachweis gekürzt). Ganze Datei abweisen, Zeilen nennen.
  const width = rows.length ? rows[0].length : 0;
  const over = rows.slice(1).filter((r) => r.slice(width).some((x) => x !== '')).map((r) => r.line);
  if (over.length) throw bad('csv_columns', `Zeile ${over.slice(0, 5).join(', ')}${over.length > 5 ? ' …' : ''}: mehr Werte als Spalten in der Kopfzeile – Trennzeichen im Wert? Werte mit Komma in Anführungszeichen setzen oder als CSV mit Semikolon speichern.`);
  return rows;
}

// iCalendar (RFC 5545): ganztägige Termine mit optionaler Erinnerung; TEXT-Werte maskiert (\\ ; , Zeilenumbruch), Zeilen auf 75 Oktette gefaltet
export function icsEscape(x) {
  // Zeilenumbrüche aller Arten (auch einzelnes CR) → \\n; übrige Steuerzeichen sind in iCalendar-Text unzulässig (RFC 5545 3.3.11) → entfernt
  return String(x ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
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
  // Ohne Termine (z. B. Standortfilter ohne Treffer) braucht der Kalender laut RFC 5545 §3.6 trotzdem eine Komponente – feste Zeitzone
  // Europe/Berlin (EU-Sommerzeitregel, keine Fachdaten); strenge Importe meldeten sonst „ungültige Datei“ (22.10.2026)
  if (!events.length) lines.push('BEGIN:VTIMEZONE', 'TZID:Europe/Berlin', 'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST',
    'DTSTART:19810329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT', 'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET',
    'DTSTART:19961027T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE');
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

// Kennzeichen-Vergleichsschlüssel: Groß-/Kleinschreibung, Leerzeichen und Bindestriche egal, Umlaute (TÜ, LÖ, MÜ …) bleiben erhalten.
// In SQL ist UPPER() nur für A–Z wirksam – Kennzeichen daher in JS vergleichen, nicht per UPPER() in der Abfrage.
// SQL-Gegenstück zu normPlate für übliche Schreibweisen (Leerzeichen, Bindestrich, Punkt, Schrägstrich, Unterstrich; ä/ö/ü → Ä/Ö/Ü)
// 17.10.2026: auch geschütztes/schmales Leerzeichen, Tab, Gedanken-/Geviertstrich und geschützter Bindestrich (kopierte Kennzeichen) – sonst
// erreichte z. B. die Sperre am Anhänger „SZ–AH 200“ den Fahrer der Zugmaschine nicht, obwohl normPlate das Gespann erkannte
const PLATE_STRIP = [' ', '-', '.', '/', '_', '\u00a0', '\u202f', '\t', '\u2013', '\u2014', '\u2011', '\u2010'];
export const PLATE_KEY_SQL = (x) => PLATE_STRIP.reduce((acc, ch) => `REPLACE(${acc},'${ch}','')`, `UPPER(COALESCE(${x},''))`)
  .replace(/^/, "REPLACE(REPLACE(REPLACE(").concat(",'ä','Ä'),'ö','Ö'),'ü','Ü')");
// Gespann-Kopplung in SQL: ein Fahrzeug zählt nur, wenn es bewertet ist oder es kein bewertetes aktives Fahrzeug gleicher Art mit dem
// Kennzeichen gibt (ruhendes Doppel mit FIN-Tippfehler, wie pickVehicleByPlate/„Mein Fahrzeug“; 18.10.2026)
export const COUPLING_PREFERRED_SQL = (a) => `(COALESCE(${a}.eval_excluded,0)=0 OR NOT EXISTS (SELECT 1 FROM vehicles y WHERE y.active=1 AND y.kind=${a}.kind AND COALESCE(y.eval_excluded,0)=0 AND ${PLATE_KEY_SQL('y.plate')}=${PLATE_KEY_SQL(a + '.plate')}))`;
// Kyrillische Buchstaben, die wie lateinische aussehen (ukrainische Tastatur), werden umgesetzt; bleibt danach ein anderer Buchstabe übrig
// (z. B. „Ж“), gilt das Kennzeichen als nicht vergleichbar ('') – vorher wurde er still gestrichen: „SZ YС 5501“ (С kyrillisch) traf
// „SZ-Y 5501“ statt „SZ-YC 5501“ (21.10.2026)
const PLATE_CYR = { 'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'У': 'Y', 'Х': 'X', 'І': 'I' };
export const normPlate = (p) => {
  const t = String(p || '').normalize('NFC').toUpperCase().replace(/[АВЕКМНОРСТУХІ]/g, (c) => PLATE_CYR[c]);
  return /[^\P{L}A-ZÄÖÜ]/u.test(t) ? '' : t.replace(/[^A-Z0-9ÄÖÜ]/g, '');
};
// Fahrzeug zu einem Kennzeichen aus einem Schreiben/Gerät: zuerst aktive bewertete, dann ruhende (eval_excluded), dann außer Betrieb.
// Mehrere Treffer in derselben Stufe = mehrdeutig → kein Fahrzeug (lieber manuell klären als falscher Fahrer/falsche Position).
// Kennzeichen-Reihenfolge: deutsch (Ö nicht hinter Z) und Ziffern als Zahl („SZ-YC 9“ < „SZ-YC 10“ < „SZ-YC 5501“; 21.10.2026)
export const plateCmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'de', { numeric: true });
export function pickVehicleByPlate(vehicles, plate) {
  const k = normPlate(plate); if (!k) return { vehicle: null, ambiguous: false };
  const hits = vehicles.filter((v) => normPlate(v.plate) === k);
  const tier = (v) => (v.active === 0 || v.active === false ? 2 : v.eval_excluded ? 1 : 0);
  const best = Math.min(...hits.map(tier));
  const top = hits.filter((v) => tier(v) === best);
  return top.length === 1 ? { vehicle: top[0], ambiguous: false } : { vehicle: null, ambiguous: top.length > 1 };
}

// LIKE in SQLite/D1 ignoriert Groß-/Kleinschreibung nur für A–Z („гальма“ ≠ „Гальма“, „öl“ ≠ „Öl“). Für Suchen daher
// Schreibweisen-Varianten: wie eingegeben, klein, GROSS, Anfang groß – als LIKE-Muster '%…%' mit maskierten Platzhaltern (ESCAPE '\\').
export const likeEsc = (x) => '%' + String(x).replace(/[\\%_]/g, (ch) => '\\' + ch) + '%';
export function caseVariants(w) {
  const lo = w.toLocaleLowerCase('de');
  const cap = (x) => x.charAt(0).toLocaleUpperCase('de') + x.slice(1);
  // „AUSSEN“ (ß hat keine Großform im Alltag) soll „Außenspiegel“ finden: zusätzlich ss → ß (19.10.2026)
  const sz = lo.includes('ss') ? lo.replace(/ss/g, 'ß') : null;
  return [...new Set([w, lo, w.toLocaleUpperCase('de'), cap(lo), ...(sz ? [sz, cap(sz)] : [])])];
}

// Dateinamen-Teil (Content-Disposition, nur ASCII): Umlaute ausgeschrieben, Akzente entfernt, sonst nur Buchstaben/Ziffern/_/-.
// Vorher wurden Nicht-ASCII-Zeichen ersatzlos gestrichen („München“ → „Mnchen“). Nichts Lesbares übrig → '' (Teil entfällt).
export function fileSlug(s) {
  return String(s ?? '').replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/Ł/g, 'L').replace(/ł/g, 'l').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]/g, '').slice(0, 60);
}
export const siteSuffix = (site) => { const s = site ? fileSlug(site) : ''; return s ? '_' + s : ''; };

// Stundensatz aus den Einstellungen: nur eine positive Zahl gilt (18.10.2026: Altwert „0“ aus einer Sicherung ergab belegte 0 € statt „unbewertet“)
export const rateOf = (v) => { if (v === undefined || v === null || String(v).trim() === '') return null; const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };
// Kaufmännisch auf Cent runden, gegen Gleitkommafehler abgesichert (1,005 → 1,01; vorher 1,00) und symmetrisch für negative Beträge
export const roundCents = (n) => { const x = Number(n); if (!Number.isFinite(x)) return x; return Math.sign(x) * Math.round(Number((Math.abs(x) * 100).toFixed(6))) / 100 + 0; };
// drei Nachkommastellen (z. B. Kosten je km) mit derselben Absicherung: 0,5005 → 0,501 (vorher Math.round(x*1000)/1000 → 0,5; 22.10.2026)
export const roundMilli = (n) => { const x = Number(n); if (!Number.isFinite(x)) return x; return Math.sign(x) * Math.round(Number((Math.abs(x) * 1000).toFixed(6))) / 1000 + 0; };
