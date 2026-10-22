// [CLAUDE] QR-Code-Erzeugung ohne Fremdbibliothek (Byte-Modus, Fehlerkorrektur M, Version 1–10, bis 213 Bytes).
// Aufbau nach ISO/IEC 18004: Datenbits → Reed-Solomon je Block → Verschachtelung → Platzierung → beste von 8 Masken.
// Rückgabe: quadratische Matrix (true = dunkel). svg() liefert ein eigenständiges SVG mit Ruhezone.

// Version: [EC-Codewörter je Block, [[Anzahl Blöcke, Datencodewörter je Block], …]] für Stufe M
const VERSIONS = [null,
  [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]],
  [16, [[4, 27]]], [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]], [26, [[4, 43], [1, 44]]],
];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

// Galoisfeld GF(256) mit Polynom 0x11D
const EXP = new Uint8Array(512); const LOG = new Uint8Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function rsGenerator(degree) {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { next[j] ^= g[j]; next[j + 1] ^= mul(g[j], EXP[i]); }
    g = next;
  }
  return g; // führender Koeffizient 1
}
function rsRemainder(data, degree) {
  const gen = rsGenerator(degree);
  const res = new Array(degree).fill(0);
  for (const b of data) {
    const factor = b ^ res.shift();
    res.push(0);
    for (let i = 0; i < degree; i++) res[i] ^= mul(gen[i + 1], factor);
  }
  return res;
}

const dataCapacity = (v) => VERSIONS[v][1].reduce((s, [n, k]) => s + n * k, 0);

export function encode(text, { mask: forceMask = null } = {}) {
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  let version = 0;
  for (let v = 1; v <= 10; v++) { const lenBits = v < 10 ? 8 : 16; if (4 + lenBits + bytes.length * 8 <= dataCapacity(v) * 8) { version = v; break; } }
  if (!version) throw new Error('Text zu lang für QR-Code (max. 213 Bytes).');
  const cap = dataCapacity(version);
  // Bitstrom: Modus 0100 (Byte), Länge, Daten, Abschluss, Auffüllen
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4); put(bytes.length, version < 10 ? 8 : 16); for (const b of bytes) put(b, 8);
  put(0, Math.min(4, cap * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; data.length < cap; pad ^= 0xec ^ 0x11) data.push(pad);
  // Blöcke + Fehlerkorrektur, dann verschachteln
  const [ecLen, groups] = VERSIONS[version];
  const blocks = []; let off = 0;
  for (const [n, k] of groups) for (let i = 0; i < n; i++) { const d = data.slice(off, off + k); off += k; blocks.push({ d, ec: rsRemainder(d, ecLen) }); }
  const out = [];
  const maxK = Math.max(...blocks.map((b) => b.d.length));
  for (let i = 0; i < maxK; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
  for (let i = 0; i < ecLen; i++) for (const b of blocks) out.push(b.ec[i]);
  return build(version, out, forceMask);
}

function build(version, codewords, forceMask = null) {
  const size = version * 4 + 17;
  const m = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false)); // Funktionsmodule (nicht maskieren)
  const set = (x, y, dark) => { m[y][x] = dark; fn[y][x] = true; };
  // Positionsmuster mit Trennlinie
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx; const y = cy + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      set(x, y, d !== 2 && d !== 4);
    }
  }
  // Taktlinien
  for (let i = 8; i < size - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  // Ausrichtungsmuster
  const al = ALIGN[version];
  for (const ay of al) for (const ax of al) {
    if ((ax === 6 && ay === 6) || (ax === 6 && ay === al[al.length - 1]) || (ax === al[al.length - 1] && ay === 6)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  // Formatbereiche reservieren, dunkles Modul
  for (let i = 0; i < 9; i++) { fn[8][i] = fn[i][8] = true; }
  for (let i = 0; i < 8; i++) { fn[8][size - 1 - i] = fn[size - 1 - i][8] = true; }
  set(8, size - 8, true);
  // Versionsinformation (ab Version 7)
  if (version >= 7) {
    let rem = version; for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const v = (version << 12) | rem;
    for (let i = 0; i < 18; i++) { const bit = ((v >>> i) & 1) === 1; const a = size - 11 + (i % 3); const b = Math.floor(i / 3); set(a, b, bit); set(b, a, bit); }
  }
  // Daten im Zickzack von rechts unten
  let idx = 0; const total = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j; const upward = ((right + 1) & 2) === 0;
      const y = upward ? size - 1 - vert : vert;
      if (fn[y][x]) continue;
      if (idx < total) m[y][x] = ((codewords[idx >>> 3] >>> (7 - (idx & 7))) & 1) === 1;
      idx++;
    }
  }
  // Beste Maske nach Strafpunkten – intern als flaches Byte-Feld (22.10.2026: vorher je Maske Zeilenkopien und Rückruf-Funktionen,
  // ≈ 3,7 ms je Code; QR-Bogen mit 150 Fahrzeugen am Handy ≈ 2 s). Ergebnis bitgleich (Test vergleicht 400 Zufallstexte).
  const N = size * size; const base = new Uint8Array(N); const fnf = new Uint8Array(N);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { base[y * size + x] = m[y][x] ? 1 : 0; fnf[y * size + x] = fn[y][x] ? 1 : 0; }
  let best = null; let bestScore = Infinity; const c = new Uint8Array(N);
  for (let mask = 0; mask < 8; mask++) {
    if (forceMask !== null && mask !== forceMask) continue;
    c.set(base); applyMask(c, fnf, size, mask); drawFormat(c, size, mask);
    const s = penalty(c, size);
    if (s < bestScore) { bestScore = s; best = c.slice(); }
  }
  return Array.from({ length: size }, (_, y) => Array.from(best.subarray(y * size, (y + 1) * size), (v) => v === 1));
}

const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
function applyMask(c, fnf, size, mask) {
  const f = MASKS[mask];
  for (let y = 0, i = 0; y < size; y++) for (let x = 0; x < size; x++, i++) if (!fnf[i] && f(x, y)) c[i] ^= 1;
}
function drawFormat(c, size, mask) {
  const data = (0b00 << 3) | mask; // Stufe M = 00
  let rem = data; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const b = (i) => (bits >>> i) & 1;
  const put = (y, x, v) => { c[y * size + x] = v; };
  for (let i = 0; i <= 5; i++) put(i, 8, b(i));
  put(7, 8, b(6)); put(8, 8, b(7)); put(8, 7, b(8));
  for (let i = 9; i < 15; i++) put(8, 14 - i, b(i));
  for (let i = 0; i < 8; i++) put(8, size - 1 - i, b(i));
  for (let i = 8; i < 15; i++) put(size - 15 + i, 8, b(i));
  put(size - 8, 8, 1);
}
// Strafpunkte nach ISO/IEC 18004 (Regeln 1–4) wie bisher: c[y*n+x]; Zeilen (step 1) und Spalten (step n) mit derselben Schleife
function penalty(c, n) {
  let s = 0; const L = new Uint8Array(n);
  for (let dir = 0; dir < 2; dir++) {
    const outer = dir ? 1 : n; const inner = dir ? n : 1; // dir 0: Zeilen, dir 1: Spalten
    for (let i = 0; i < n; i++) {
      for (let j = 0, o = i * outer; j < n; j++, o += inner) L[j] = c[o];
      let len = 1;
      for (let j = 1; j <= n; j++) {
        if (j < n && L[j] === L[j - 1]) len++;
        else { if (len >= 5) s += len - 2; len = 1; }
      }
      // Muster 1:1:3:1:1 mit 4 hellen Modulen davor oder danach
      for (let j = 0; j + 7 <= n; j++) {
        if (!(L[j] && !L[j + 1] && L[j + 2] && L[j + 3] && L[j + 4] && !L[j + 5] && L[j + 6])) continue;
        const before = j >= 4 && !L[j - 1] && !L[j - 2] && !L[j - 3] && !L[j - 4];
        const after = j + 11 <= n && !L[j + 7] && !L[j + 8] && !L[j + 9] && !L[j + 10];
        if (before || after) s += 40;
      }
    }
  }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const i = y * n + x; const v = c[i]; if (v === c[i + 1] && v === c[i + n] && v === c[i + n + 1]) s += 3; }
  let dark = 0; for (let i = 0; i < n * n; i++) dark += c[i];
  s += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
  return s;
}

// SVG mit 4 Modulen Ruhezone; Farben fest (Scanner brauchen Kontrast, unabhängig vom Farbschema)
export function svg(text, { label = 'QR-Code' } = {}) {
  const m = encode(text); const n = m.length; const q = 4;
  let d = '';
  // zusammenhängende dunkle Module einer Zeile als ein Rechteck (≈ 3× kürzerer Pfad, schnellere Darstellung vieler Codes)
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { if (!m[y][x]) continue; let w = 1; while (x + w < n && m[y][x + w]) w++; d += `M${x + q},${y + q}h${w}v1h-${w}z`; x += w - 1; }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" shape-rendering="crispEdges" role="img" aria-label="${esc(label)}"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
