// [CLAUDE] Sprachpakete (Backlog 588, 28.10.2026): erzeugt aus public/i18n.js (bleibt die einzige Quelle aller Texte)
//   public/i18n-core.js      – alle Hilfsfunktionen/Tabellen von i18n.js, aber STRINGS/PLURALS leer + loadLang()
//   public/i18n-de.js/-uk.js/-en.js – Texte (STRINGS/PLURALS) je Sprache
// Die App lädt beim Start nur den Kern und das Paket ihrer Sprache statt aller drei Sprachen (i18n.js: 1,6 MB / ≈ 430 KB gzip).
// Jedes Paket ist vollständig: fehlt ein Text in UK/EN, steht dort der deutsche (wie bisher die Rückfallsprache in t()) –
// Deutsch muss daher nicht zusätzlich geladen werden.
//   public/i18n-de-hilfe.js/-uk-/-en- – Schritte der Hilfe-Abschnitte (`help_*_s`, ≈ 45 % eines Pakets), erst beim Öffnen der Hilfe
//   bzw. der Suche geladen (Backlog 597, `loadHelp()`); Titel `help_*_t` bleiben im Hauptpaket.
// Aufruf über scripts/build-schema.mjs (npm run build / npm test / Cloudflare-Build) – nicht von Hand bearbeiten.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const pub = new URL('../public/', import.meta.url);
export const LANGS = ['de', 'uk', 'en'];
const HEAD = '// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-i18n.mjs aus public/i18n.js – nicht von Hand bearbeiten (Texte in i18n.js ändern, dann npm run build)\n';

// Ende einer Anweisung ab Position i (Klammern, Zeichenketten, Vorlagen und Kommentare beachtet): Index nach dem abschließenden „;“
function statementEnd(src, i) {
  let depth = 0;
  const tpl = []; // Klammertiefe je offener ${ … } in Vorlagen
  for (; i < src.length; i++) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) return src.length; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 1; continue; }
    if (c === '"' || c === "'") { for (i++; src[i] !== c; i++) { if (src[i] === '\\') i++; if (i >= src.length) throw new Error('Zeichenkette ohne Ende'); } continue; }
    if (c === '`' || (c === '}' && tpl.length && tpl[tpl.length - 1] === depth)) {
      if (c === '}') tpl.pop();
      for (i++; i < src.length; i++) {
        if (src[i] === '\\') { i++; continue; }
        if (src[i] === '`') break;
        if (src[i] === '$' && src[i + 1] === '{') { i++; tpl.push(depth); break; }
      }
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (c === ';' && depth === 0) return i + 1;
    if (depth < 0) throw new Error('Klammerfehler bei ' + i);
  }
  throw new Error('Anweisung ohne Ende');
}

// Anweisungen, die nur Texte setzen (am Zeilenanfang): werden im Kern entfernt bzw. durch leere Objekte ersetzt
const TEXT_STMT = /^(?:Object\.assign\((?:STRINGS|PLURALS)\.(?:de|uk|en), |for \(const l of \['de', 'uk', 'en'\]\) (?:for \(const \[c, v\] of Object\.entries\(FINDING_LABELS\[l\]\)\) )?STRINGS\[l\])/;
const DEF_STMT = /^export const (STRINGS|PLURALS) = \{/;

export function coreSource(src) {
  const out = [];
  let i = 0, removed = 0;
  while (i < src.length) {
    const nl = src.indexOf('\n', i);
    const line = src.slice(i, nl < 0 ? src.length : nl);
    const d = line.match(DEF_STMT);
    if (d || TEXT_STMT.test(line)) {
      const end = statementEnd(src, i);
      if (d) out.push(`export const ${d[1]} = { de: {}, uk: {}, en: {} };`);
      removed++;
      i = end;
      if (src[i] === '\n') i++;
      continue;
    }
    out.push(line);
    i = nl < 0 ? src.length : nl + 1;
  }
  let core = out.join('\n');
  core = core.replace("import { FINDING_LABELS } from './finding-labels.js';\n", ''); // nur für die Texte gebraucht
  if (/FINDING_LABELS/.test(core)) throw new Error('FINDING_LABELS noch im Kern benutzt');
  core += `
// Sprachpaket nachladen (vollständig, deutsche Rückfalltexte sind enthalten); Fehler (z. B. offline ohne Cache) → erneut versuchbar
const LOADING = {}, LOADED = new Set();
export const langLoaded = (l) => LOADED.has(l);
export function loadLang(l) {
  if (!LANGS.includes(l)) l = 'de';
  if (!LOADING[l]) LOADING[l] = import(\`./i18n-\${l}.js\`).then((m) => { Object.assign(STRINGS[l], m.S); Object.assign(PLURALS[l], m.P); LOADED.add(l); }).catch((e) => { delete LOADING[l]; throw e; });
  return LOADING[l];
}
export const LANGS = ['de', 'uk', 'en'];
// Hilfe-Schritte (Backlog 597): eigenes Paket je Sprache; nach einem Fehler neuer Versuch mit „?r=N“ (Browser merkt sich fehlgeschlagene Importe)
const HELP_LOADING = {}, HELP_TRY = {};
export const helpLoaded = (l) => !!HELP_LOADING[l] && HELP_LOADING[l].done === true;
export function loadHelp(l) {
  if (!LANGS.includes(l)) l = 'de';
  if (!HELP_LOADING[l]) {
    const p = import(\`./i18n-\${l}-hilfe.js\${HELP_TRY[l] ? \`?r=\${HELP_TRY[l]}\` : ''}\`).then((m) => { Object.assign(STRINGS[l], m.S); p.done = true; })
      .catch((e) => { delete HELP_LOADING[l]; HELP_TRY[l] = (HELP_TRY[l] || 0) + 1; throw e; });
    HELP_LOADING[l] = p;
  }
  return HELP_LOADING[l];
}
`;
  return { core: HEAD + core, removed };
}

// Texte einer Sprache mit deutscher Rückfalle wie t(): Wert der Sprache, sonst (fehlend/leer) der deutsche
export function allStrings(STRINGS, l) {
  const out = { ...STRINGS[l] };
  if (l !== 'de') for (const [k, v] of Object.entries(STRINGS.de)) if (!out[k] && v) out[k] = v;
  return out;
}
export const isHelpStep = (k) => /^help_[a-z0-9_]+_s$/.test(k);
// Hauptpaket ohne Hilfe-Schritte bzw. nur die Hilfe-Schritte (Backlog 597)
export function packStrings(STRINGS, l) { return Object.fromEntries(Object.entries(allStrings(STRINGS, l)).filter(([k]) => !isHelpStep(k))); }
export function helpStrings(STRINGS, l) { return Object.fromEntries(Object.entries(allStrings(STRINGS, l)).filter(([k]) => isHelpStep(k))); }

export async function buildI18n() {
  const src = readFileSync(new URL('i18n.js', pub), 'utf8');
  const { core, removed } = coreSource(src);
  const M = await import(pathToFileURL(new URL('i18n.js', pub).pathname).href + '?b=' + Date.now());
  writeFileSync(new URL('i18n-core.js', pub), core);
  const sizes = {};
  for (const l of LANGS) {
    const txt = `${HEAD}export const S = ${JSON.stringify(packStrings(M.STRINGS, l))};\nexport const P = ${JSON.stringify(M.PLURALS[l])};\n`;
    writeFileSync(new URL(`i18n-${l}.js`, pub), txt);
    sizes[l] = Math.round(Buffer.byteLength(txt) / 1024);
    const help = `${HEAD}export const S = ${JSON.stringify(helpStrings(M.STRINGS, l))};\n`;
    writeFileSync(new URL(`i18n-${l}-hilfe.js`, pub), help);
    sizes[l + '-hilfe'] = Math.round(Buffer.byteLength(help) / 1024);
  }
  console.log(`i18n: Kern ${Math.round(Buffer.byteLength(core) / 1024)} KB (${removed} Textanweisungen ausgelagert), Pakete ${LANGS.map((l) => `${l} ${sizes[l]} KB + Hilfe ${sizes[l + '-hilfe']} KB`).join(', ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) await buildI18n();
