// [CLAUDE] App-Module (Backlog 593, 29.10.2026): erzeugt aus public/app.js (bleibt die einzige Quelle der Oberfläche)
//   public/app-main.js        – alles, was beim Start gebraucht wird (Anmeldung, Startseite, Meldung, Vorgang, Abfahrtskontrolle …)
//   public/app-<gruppe>.js    – selten genutzte Bereiche, erst beim ersten Aufruf per import() geladen (siehe GROUPS)
// In app-main.js steht für jede ausgelagerte Ansicht, die von außerhalb ihrer Gruppe aufgerufen wird, ein gleichnamiger Platzhalter
// `async function viewX(...a)`, der das Modul lädt und die echte Funktion aufruft. Hilfsfunktionen/Konstanten, die NUR von
// ausgelagertem Code benutzt werden, wandern automatisch mit. Das Gruppenmodul importiert alles Übrige aus app-main.js.
// Aufruf über scripts/build-schema.mjs (npm run build / npm test / Cloudflare-Build) – Ergebnisse nicht von Hand bearbeiten.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const pub = new URL('../public/', import.meta.url);
const HEAD = '// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)\n';

// Ausgelagerte Bereiche: Einstiegsfunktionen je Gruppe (Ansichten für Verwaltung/Auswertung, Lager, Fahrzeugakte). Nie hierher: alles, was
// Fahrer/Werkstatt beim Start brauchen (Startseite, Meldung, Vorgang, Abfahrtskontrolle, Notfall). Jede Gruppe steht in der Offline-Hülle
// (SHELL in public/sw.js), ist also nach der ersten Installation auch ohne Netz und ohne vorherigen Aufruf verfügbar.
export const GROUPS = {
  verwaltung: ['viewSettings', 'viewUsers', 'viewAudit', 'viewKpi', 'viewCosts', 'viewQuality', 'viewMaster', 'viewClaims', 'viewContracts',
    'viewEmergencyEdit', 'viewFines', 'viewFine', 'viewTacho', 'viewTachoHistory', 'viewDriverRecords', 'viewDrivers', 'viewDriver', 'viewUsage',
    'viewReadiness', 'viewWsLoad', 'viewTelematics', 'viewQrSheet', 'viewDefects', 'viewFleetTires', 'viewPlan', 'viewMaint', 'viewMaintMulti', 'viewTimeline',
    'viewNewMulti'], // Backlog 594: Mehrfach-Meldung nur Inhaber/Fuhrparkleitung
  fahrzeug: ['viewVehicle'], // Backlog 594: Fahrzeugakte (inkl. Reifen, Verträge, Prüftermine) – größte Einzelansicht, ≈ 26 KB gzip
  lager: ['viewStock', 'viewStockCount', 'viewReorder', 'viewStockAsOf', 'viewStockJournal', 'viewStockReceipt', 'viewPartsUsage', 'viewStockItem'],
};

const KW_BEFORE_REGEX = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do', 'instanceof', 'yield', 'await']);
const isId = (c) => /[\w$]/.test(c || '');

// Zerlegt JS-Quelltext in Wörter/Zeichen mit Klammertiefe; überspringt Zeichenketten, Vorlagen (inkl. ${…}), Kommentare, Regex-Literale
export function tokens(src) {
  const out = [];
  let depth = 0;
  const tpl = []; // Klammertiefe je offener ${ … }
  let prev = null; // letztes bedeutsames Token
  const regexAllowed = () => !prev || (prev.t === 'p' && prev.v !== ')' && prev.v !== ']') || (prev.t === 'w' && KW_BEFORE_REGEX.has(prev.v));
  const push = (t, v, s, e, d) => { const tok = { t, v, s, e, d }; out.push(tok); prev = tok; };
  const tplBody = (i) => { // i zeigt hinter ` bzw. hinter } eines ${…}; liefert Index nach dem Ende bzw. öffnet ${
    for (; i < src.length; i++) {
      if (src[i] === '\\') { i++; continue; }
      if (src[i] === '`') return { end: i + 1, open: false };
      if (src[i] === '$' && src[i + 1] === '{') return { end: i + 2, open: true };
    }
    throw new Error('Vorlage ohne Ende');
  };
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { const n = src.indexOf('\n', i); i = n < 0 ? src.length : n; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
    if (c === '"' || c === "'") {
      const s = i;
      for (i++; src[i] !== c; i++) { if (src[i] === '\\') i++; if (i >= src.length) throw new Error('Zeichenkette ohne Ende bei ' + s); }
      i++; push('s', '', s, i, depth); continue;
    }
    if (c === '`' || (c === '}' && tpl.length && tpl[tpl.length - 1] === depth)) {
      const s = i;
      if (c === '}') tpl.pop();
      const r = tplBody(i + 1);
      i = r.end;
      if (r.open) tpl.push(depth);
      push('s', '', s, i, depth); continue;
    }
    if (c === '/' && regexAllowed()) {
      const s = i;
      let cls = false;
      for (i++; i < src.length; i++) {
        if (src[i] === '\\') { i++; continue; }
        if (src[i] === '\n') throw new Error('Regex ohne Ende bei ' + s);
        if (cls) { if (src[i] === ']') cls = false; continue; }
        if (src[i] === '[') cls = true;
        else if (src[i] === '/') break;
      }
      for (i++; isId(src[i]);) i++;
      push('r', '', s, i, depth); continue;
    }
    if (isId(c)) { const s = i; while (isId(src[i])) i++; push('w', src.slice(s, i), s, i, depth); continue; }
    if (c === '(' || c === '[' || c === '{') { push('p', c, i, i + 1, depth); depth++; i++; continue; }
    if (c === ')' || c === ']' || c === '}') { depth--; if (depth < 0) throw new Error('Klammerfehler bei ' + i); push('p', c, i, i + 1, depth); i++; continue; }
    push('p', c, i, i + 1, depth); i++;
  }
  if (depth !== 0 || tpl.length) throw new Error('Klammern nicht ausgeglichen');
  return out;
}

// Oberste Deklarationen: [{ names, kind, start, end }] (function/async function bzw. const/let mit allen Namen)
export function topDecls(src, toks = tokens(src)) {
  const decls = [];
  for (let k = 0; k < toks.length; k++) {
    const tk = toks[k];
    if (tk.d !== 0 || tk.t !== 'w') continue;
    if (tk.v === 'function' || (tk.v === 'async' && toks[k + 1] && toks[k + 1].v === 'function')) {
      if (k > 0 && toks[k - 1].d === 0 && !(toks[k - 1].t === 'p' && /[;}]/.test(toks[k - 1].v))) continue; // Ausdruck, keine Deklaration
      const start = tk.s;
      let j = tk.v === 'async' ? k + 2 : k + 1;
      if (toks[j].v === '*') j++;
      const name = toks[j].v;
      // Parameterliste überspringen, dann Rumpf bis zur schließenden Klammer auf Tiefe 0
      while (!(toks[j].t === 'p' && toks[j].v === '{' && toks[j].d === 0)) j++;
      j++;
      while (!(toks[j].t === 'p' && toks[j].v === '}' && toks[j].d === 0)) j++;
      decls.push({ names: [name], kind: tk.v === 'async' ? 'async' : 'function', start, end: toks[j].e });
      k = j;
    } else if (tk.v === 'const' || tk.v === 'let') {
      const names = [];
      let j = k + 1, expect = true;
      for (; j < toks.length && !(toks[j].d === 0 && toks[j].t === 'p' && toks[j].v === ';'); j++) {
        if (toks[j].d !== 0) continue;
        if (expect && toks[j].t === 'w') { names.push(toks[j].v); expect = false; }
        else if (toks[j].t === 'p' && toks[j].v === ',') expect = true;
      }
      if (j >= toks.length) throw new Error(`${tk.v} ohne ; bei ${tk.s}`);
      decls.push({ names, kind: tk.v, start: tk.s, end: toks[j].e });
      k = j;
    }
  }
  return decls;
}

// Kommentarzeilen direkt über einer Deklaration gehören zu ihr (wandern mit)
function leadStart(src, start) {
  let ls = src.lastIndexOf('\n', start - 1) + 1;
  if (src.slice(ls, start).trim() !== '') return start; // Deklaration beginnt mitten in einer Zeile
  for (;;) {
    if (ls === 0) return ls;
    const ps = src.lastIndexOf('\n', ls - 2) + 1;
    if (!/^\/\/(?! -{3,})/.test(src.slice(ps, ls - 1))) return ls;
    ls = ps;
  }
}

const wordsOf = (txt) => new Set(tokens(txt).filter((t) => t.t === 'w').map((t) => t.v)); // Vorlagen-Ausdrücke ${…} sind normale Tokens

export function splitApp(src) {
  const toks = tokens(src);
  const decls = topDecls(src, toks);
  const byName = new Map();
  for (const d of decls) for (const n of d.names) byName.set(n, d);
  // Importierte Namen (oberste import-Anweisungen) gehören auch zu app-main
  const imported = [...src.matchAll(/^import \{([^}]*)\} from '[^']+';$/gm)].flatMap((m) => m[1].split(',').map((x) => x.trim().split(/\s+as\s+/).pop()).filter(Boolean));
  const topNames = new Set([...byName.keys(), ...imported]);
  // Verweise je Deklaration (Wörter, auch in Vorlagen-Ausdrücken)
  const refsOf = new Map(decls.map((d) => [d, tokensRefs(src, toks, d)]));
  // Gruppen inkl. Hilfen, die nur von der Gruppe benutzt werden (Fixpunkt)
  const owner = new Map(); // Deklaration -> Gruppe
  for (const [g, names] of Object.entries(GROUPS)) for (const n of names) {
    const d = byName.get(n);
    if (!d || d.kind === 'const' || d.kind === 'let') throw new Error(`build-app: ${n} ist keine oberste Funktion in app.js`);
    owner.set(d, g);
  }
  const users = new Map(decls.map((d) => [d, []]));
  const restRefs = new Set(); // Namen, die von Anweisungen außerhalb aller Deklarationen benutzt werden
  for (const d of decls) for (const n of refsOf.get(d)) { const t = byName.get(n); if (t && t !== d) users.get(t).push(d); }
  { // Code außerhalb oberster Deklarationen (Ereignisse, Start, Blöcke)
    let last = 0; const parts = [];
    for (const d of decls) { parts.push(src.slice(last, d.start)); last = d.end; }
    parts.push(src.slice(last));
    for (const w of wordsOf(parts.join('\n'))) restRefs.add(w);
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const d of decls) {
      if (owner.has(d) || d.names.some((n) => restRefs.has(n))) continue;
      const us = users.get(d);
      const gs = new Set(us.map((u) => owner.get(u)));
      if (us.length && gs.size === 1 && !gs.has(undefined)) { owner.set(d, [...gs][0]); changed = true; }
    }
  }
  // let-Variablen dürfen von ausgelagertem Code nicht neu zugewiesen werden (Importe sind schreibgeschützt)
  const lets = new Set(decls.filter((d) => d.kind === 'let' && !owner.has(d)).flatMap((d) => d.names));
  for (const [d, g] of owner) {
    const txt = src.slice(d.start, d.end);
    for (const n of lets) if (new RegExp(`(?<![\\w$.])${n.replace(/\$/g, '\\$')}\\s*(?:[-+*/%|&]?=(?!=)|\\+\\+|--)`).test(txt)) throw new Error(`build-app: ${d.names[0]} (${g}) weist ${n} aus app-main zu`);
  }
  // Platzhalter für ausgelagerte Funktionen, die von außerhalb der eigenen Gruppe benutzt werden
  const stubs = new Map(); // Name -> Gruppe
  for (const [d, g] of owner) {
    const outside = restRefs.has(d.names[0]) || users.get(d).some((u) => owner.get(u) !== g);
    if (!outside) continue;
    if (d.kind === 'const' || d.kind === 'let') throw new Error(`build-app: ${d.names.join(',')} (${g}) wird außerhalb der Gruppe benutzt`);
    if (d.kind !== 'async') throw new Error(`build-app: ${d.names[0]} (${g}) ist nicht async – Platzhalter würde das Ergebnis ändern`);
    stubs.set(d.names[0], g);
  }
  // app-main: ausgelagerte Deklarationen entfernen (Platzhalter an ihrer Stelle)
  const ranges = [...owner.keys()].map((d) => ({ d, s: leadStart(src, d.start), e: d.end })).sort((a, b) => a.s - b.s);
  let main = '', last = 0;
  const modParts = {};
  for (const { d, s, e } of ranges) {
    main += src.slice(last, s);
    const g = owner.get(d);
    (modParts[g] ||= []).push(src.slice(s, e));
    if (stubs.has(d.names[0])) main += `async function ${d.names[0]}(...a) { return (await lazyModule('${g}')).${d.names[0]}(...a); }`;
    last = e;
  }
  main += src.slice(last);
  main += `
// Ausgelagerte Bereiche (Backlog 593): einmal laden; Fehler (z. B. offline ohne Cache) → beim nächsten Aufruf erneut versuchen.
// Backlog 595: dauert das erste Laden länger als 300 ms (langsames Netz), zeigt die Seite „Lädt…“ statt still die vorige Seite –
// nur solange noch dieselbe Seite aufgerufen ist (kein Überschreiben einer inzwischen geöffneten anderen Seite).
// Erneuter Versuch nach einem Fehler mit „?r=N“: der Browser merkt sich ein fehlgeschlagenes import() je Adresse und lieferte sonst
// bis zum Neuladen immer wieder denselben Fehler (UI-Test 29.10.2026); die App-Hülle im Service Worker findet die Datei trotzdem (ignoreSearch).
const LAZY_MODULES = {}, LAZY_READY = {}, LAZY_TRY = {}, LAZY_HINT_MS = 300;
function lazyModule(g) {
  if (!LAZY_MODULES[g]) LAZY_MODULES[g] = import(\`./app-\${g}.js\${LAZY_TRY[g] ? \`?r=\${LAZY_TRY[g]}\` : ''}\`).then((m) => { LAZY_READY[g] = true; return m; }).catch((e) => { delete LAZY_MODULES[g]; LAZY_TRY[g] = (LAZY_TRY[g] || 0) + 1; console.error(e); throw new Error(t('lazy_load_failed')); });
  if (!LAZY_READY[g]) { const gen = S.routeGen, h = location.hash, p = LAZY_MODULES[g]; setTimeout(() => { if (!LAZY_READY[g] && LAZY_MODULES[g] === p && S.routeGen === gen && location.hash === h) render(\`<p class="muted">\${esc(t('loading'))}</p>\`); }, LAZY_HINT_MS); }
  return LAZY_MODULES[g];
}
`;
  const out = { 'app-main.js': null };
  const exportNames = new Set();
  const sizes = {};
  for (const g of Object.keys(GROUPS)) {
    const body = (modParts[g] || []).join('\n');
    const own = new Set([...owner].filter(([, gg]) => gg === g).flatMap(([d]) => d.names));
    const need = [...wordsOf(body)].filter((w) => topNames.has(w) && !own.has(w)).sort();
    need.forEach((n) => exportNames.add(n));
    const exp = [...own].filter((n) => stubs.has(n) && stubs.get(n) === g).sort();
    out[`app-${g}.js`] = `${HEAD}import { ${need.join(', ')} } from './app-main.js';\n\n${body}\n\nexport { ${exp.join(', ')} };\n`;
    sizes[g] = Buffer.byteLength(out[`app-${g}.js`]);
  }
  out['app-main.js'] = `${HEAD}${main}\nexport { ${[...exportNames].sort().join(', ')} };\n`;
  return { files: out, stubs, sizes, moved: owner.size };
}

// Wörter einer Deklaration (aus der Tokenliste, ohne Zeichenketten – Vorlagen-Ausdrücke separat)
function tokensRefs(src, toks, d) {
  return wordsOf(src.slice(d.start, d.end));
}

export function buildApp() {
  const src = readFileSync(new URL('app.js', pub), 'utf8');
  const { files, stubs, moved } = splitApp(src);
  for (const [f, txt] of Object.entries(files)) writeFileSync(new URL(f, pub), txt);
  const kb = (f) => Math.round(Buffer.byteLength(files[f]) / 1024);
  console.log(`app: app.js ${Math.round(Buffer.byteLength(src) / 1024)} KB → app-main ${kb('app-main.js')} KB + ${Object.keys(GROUPS).map((g) => `app-${g} ${kb(`app-${g}.js`)} KB`).join(' + ')} (${moved} Deklarationen ausgelagert, ${stubs.size} Platzhalter)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) buildApp();
