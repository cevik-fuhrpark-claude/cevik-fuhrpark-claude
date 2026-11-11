// [CLAUDE] Backlog 1360: Häufigkeitsanalyse für Start-Modul-Bausteine (__T in scripts/build-app.mjs). Kein Test, nur Werkzeug.
// Aufruf nach npm run build:  node scripts/bausteine-analyse.mjs   (optional OUT=<datei.json> schreibt die 10 besten, sich nicht überschneidenden Folgen)
import { readFileSync } from 'node:fs';
const main = readFileSync('public/app-main.js', 'utf8');
const bodies = [...main.matchAll(/lbRx\(String\.raw`([^`]*)`/g)].map((m) => m[1]);
const outside = main.replace(/lbRx\(String\.raw`[^`]*`/g, '\u0000');
const B = (x) => Buffer.byteLength(x);
const all = bodies.join('\u0000');
console.error('bodies', bodies.length, 'bytes', B(all));
const P = 24, groups = new Map();
for (let i = 0; i < all.length - P; i++) { const c = all[i]; if (c !== '|' && c !== '(') continue; const k = all.slice(i, i + P); if (k.includes('${') || k.includes('\u0000')) continue; let g = groups.get(k); if (!g) groups.set(k, g = []); g.push(i); }
const cands = new Set();
for (const [, g] of groups) { if (g.length < 2) continue; const gg = g.slice(0, 12);
  for (let a = 0; a < gg.length; a++) for (let b = a + 1; b < gg.length; b++) { const i = gg[a], j = gg[b]; let l = 0; while (i + l < j && all[i + l] === all[j + l] && all[i + l] !== '\u0000' && !(all[i + l] === '$' && all[i + l + 1] === '{')) l++;
    for (let e = l; e >= 20; e--) { const ch = all[i + e - 1]; if (ch === '|' || ch === ')') { cands.add(all.slice(i, i + e)); } } } }
console.error('cands', cands.size);
const res = [];
for (const c of cands) { if (B(c) < 30 || c.includes('`')) continue; if (outside.includes(c)) continue; const n = all.split(c).length - 1; if (n < 2) continue; const sv = n * (B(c) - 10) - B(c) - 14; if (sv > 50) res.push([sv, n, B(c), c]); }
res.sort((a, b) => b[0] - a[0]);
for (const r of res.slice(0, 15)) console.log(r[0], r[1], r[2], r[3].slice(0, 160));
const pick = [];
const share = (a, b) => { for (let i = 0; i + 16 <= a.length; i += 4) if (b.includes(a.slice(i, i + 16))) return true; return false; };
for (const r of res) { if (pick.length >= 10) break; if (pick.some((p) => share(p[3], r[3]) || share(r[3], p[3]))) continue; pick.push(r); }
import { writeFileSync } from 'node:fs';
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(pick.map((p) => p[3])));
for (const p of pick) console.error('PICK', p[0], p[1], p[3].slice(0, 80));
