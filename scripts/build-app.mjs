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
    'viewNewMulti', // Backlog 594: Mehrfach-Meldung nur Inhaber/Fuhrparkleitung
    'viewDriverGuide'], // Backlog 928: Fahrer-Aushang (Druckblatt wie viewQrSheet) – Reserve im Start-Modul
  fahrzeug: ['viewVehicle', 'viewVehicles', 'viewCheckPaper', 'viewInspection'], // Backlog 1180: Ansicht einer einzelnen Abfahrtskontrolle (nur Route #/inspect/…, async) – Reserve Start-Modul vor neuen Hinweismustern; Backlog 928: leeres Prüfformular zum Ausdrucken (selten, kleinere Gruppe als Verwaltung); Backlog 796: Fahrzeugliste dazu (öffnet die Akte, gleiche Nutzer); Backlog 594: Fahrzeugakte (inkl. Reifen, Verträge, Prüftermine) – größte Einzelansicht, ≈ 26 KB gzip
  schaden: ['claimSection'], // Backlog 939: Versicherungsfall im Vorgang (nur Inhaber/Fuhrparkleitung, async, Aufruf in viewCase mit await) – Reserve im Start-Modul
  konto: ['viewInvite', 'viewSetup', 'loadTotp', 'viewLoginCode', 'loadSessions', 'loadKnown', 'loadNotifyPrefs', 'pushPanel'], // Backlog 1160: Push-Feld (Hinweise, Fahrer-Startseite; async, still in die aufgebaute Seite) – Reserve Start-Modul nach neuen Motor-/Kupplungsmustern; Backlog 1158: Push-Einstellungen in „Hinweise“ (async, still beim Aufklappen); Backlog 1153: Sitzungs-/Geräteliste in „Mehr“ (async, still beim Aufklappen); // Backlog 1148: zweiter Anmeldeschritt viewLoginCode (nur mit Zwei-Faktor, async) – Reserve Start-Modul; Backlog 933: Einladung annehmen / Ersteinrichtung – je Person einmal, Reserve im Start-Modul; Backlog 952: Zwei-Faktor-Einrichtung (loadTotp, async, nur beim Aufklappen in „Mehr“)
  scan: ['viewScan'], // Backlog 1193: Auswahl nach Scan des Fahrzeug-Aufklebers (nur Route #/v/VIN:…, async) – Reserve Start-Modul nach neuen Hinweisregeln (recurTail)
  dispo: ['dispoHome'], // Backlog 968: Startseite der Disposition (Tafel, Hinweise, Ausdruck) – nur Rolle Disposition, async, Aufruf in viewHome vor dem Seitenaufbau
  leitung: ['fleetTodo'], // Backlog 968: Aufgabenliste der Inhaber/Fuhrparkleitung auf der Startseite – nur diese Rollen, async (early() in viewHome vor dem Seitenaufbau)
  suche: ['viewSearch', 'viewHelp', 'viewMore', 'viewInbox', 'viewCases'], // Backlog 1210: Vorgangsliste (Route #/cases, async) – Reserve Start-Modul nach dem Lenkstockhebel-Muster (1209); Backlog 1200: Hinweis-Liste (Route #/inbox, async; Hintergrund-Abruf ruft sie nur auf, wenn sie schon offen ist) – Reserve Start-Modul nach neuen Tür-/Ladungsmustern; Backlog 1196: Menü „Mehr“ (nur Route #/more, async) – Reserve Start-Modul nach neuen Rampen-/Tür-Mustern; // Backlog 1148: Hilfe-Seite viewHelp dazu (Hilfe-Schritte werden ohnehin erst dort nachgeladen) – Reserve Start-Modul; 07.11.2026 (Backlog 1135, Reserve Start-Modul nach neuen Hinweismustern): globale Suche erst beim Öffnen laden (Lupe; async, Aufruf aus route)
  lager: ['viewStock', 'viewStockCount', 'viewReorder', 'viewStockAsOf', 'viewStockJournal', 'viewStockReceipt', 'viewPartsUsage', 'viewStockItem',
    'loadStockSelect'], // Backlog 1166: Lagerauswahl im Formular „Teil buchen“ (async, still in das aufgebaute Formular) – Reserve Start-Modul nach neuen Warnleuchten-/Reifenmustern
};

// Backlog 953 (Funkloch/langsames Netz): ausgelagerte Hilfsfunktionen, die in eine bereits aufgebaute Seite schreiben (z. B. beim
// Aufklappen eines Bereichs). Ihr Platzhalter lädt das Modul „still“ – ohne den Ladehinweis aus Backlog 595, der nach 300 ms die ganze
// Seite durch „Lädt…“ ersetzt (sonst blieb „Mehr“ leer, weil das Ziel #tfabox fehlte). Ansichten und Funktionen, die vor dem Neuaufbau
// der Seite laufen (claimSection in viewCase), behalten den Hinweis. Test „Backlog 953“ verlangt, dass jede neue Nicht-Ansicht hier
// oder in BEFORE_RENDER eingeordnet wird.
export const INPLACE = new Set(['loadTotp', 'loadSessions', 'loadKnown', 'loadNotifyPrefs', 'pushPanel', 'loadStockSelect']);
export const BEFORE_RENDER = new Set(['claimSection', 'dispoHome', 'fleetTodo']);

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
    if (stubs.has(d.names[0])) main += `async function ${d.names[0]}(...a) { return (await lazyModule('${g}'${INPLACE.has(d.names[0]) ? ', 1' : ''})).${d.names[0]}(...a); }`;
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
// Backlog 953: quiet = Aufruf schreibt in die bestehende Seite (INPLACE in scripts/build-app.mjs) – kein seitenfüllender Ladehinweis.
function lazyModule(g, quiet) {
  if (!LAZY_MODULES[g]) LAZY_MODULES[g] = import(\`./app-\${g}.js\${LAZY_TRY[g] ? \`?r=\${LAZY_TRY[g]}\` : ''}\`).then((m) => { LAZY_READY[g] = true; return m; }).catch((e) => { delete LAZY_MODULES[g]; LAZY_TRY[g] = (LAZY_TRY[g] || 0) + 1; console.error(e); throw new Error(t('lazy_load_failed')); });
  if (!LAZY_READY[g] && !quiet) { const gen = S.routeGen, h = location.hash, p = LAZY_MODULES[g]; setTimeout(() => { if (!LAZY_READY[g] && LAZY_MODULES[g] === p && S.routeGen === gen && location.hash === h) render(\`<p class="muted">\${esc(t('loading'))}</p>\`); }, LAZY_HINT_MS); }
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
  for (const f of Object.keys(out)) out[f] = stripComments(lookbehindSafe(out[f], src).code);
  return { files: out, stubs, sizes, moved: owner.size };
}

// Backlog 794 (Blickwinkel „Fahrer mit älterem Handy/Browser“, 31.10.2026): Regex-Literale mit Lookbehind `(?<=…)`/`(?<!…)` sind in
// Safari/iOS < 16.4 ein Syntaxfehler beim Laden – das ganze Modul (app-main.js) startete dort nicht (nur „Die App konnte nicht vollständig
// geladen werden“). Die erzeugten Module enthalten solche Literale daher als `lbRx(String.raw`…`, 'flags'[, 1])`: neue Browser bauen
// denselben Ausdruck, alte eine Fassung ohne Lookbehind (`lbFallback`). Die Quelle app.js bleibt unverändert (Tests lesen die Literale dort).
// Drittes Argument 1 = Ausdruck wird nur mit `.test()` (bzw. `fastHint(NAME);`, Backlog 1103 – ersetzt nur `.test`) benutzt (ohne g/y): dann wird ein Lookbehind am Anfang einer Alternative exakt
// nachgebildet; sonst (replace, .source, g) entfällt er – der Ausdruck trifft dann eher mehr (Hinweis öfter), nie weniger.
// lbFallback: `at` = Position am Anfang einer obersten Alternative (Startpunkt der Suche frei wählbar). Nur dort ist ein Lookbehind exakt
// nachbildbar (ein Zeichen davor bzw. Textanfang wird mitgelesen – für .test() gleichwertig); sonst entfällt die Bedingung (trifft eher mehr,
// nie weniger). Backlog 1300: Ein Lookbehind innerhalb eines negativen Lookaheads (z. B. Reparatur-Ausschluss „(?![^.;!?]*(?<![a-z])neu)“)
// darf nicht einfach entfallen – der Ausschluss griffe dann öfter und der Ausdruck träfe weniger; dort wird die Alternative stattdessen
// unerfüllbar `(?!)` (Ausschluss greift seltener, Ausdruck trifft eher mehr). Kommentare stehen hier außerhalb der Funktionen, weil toString() sie sonst ins Start-Modul übernimmt (Größengrenze 66 %).
export function lbRx(src, flags, testOnly) {
  if (lbRx.ok === undefined) { try { lbRx.ok = !!new RegExp('(?<=a)b'); } catch (e) { lbRx.ok = false; } }
  return new RegExp(lbRx.ok ? src : lbFallback(src, !!testOnly), flags);
}
export function lbFallback(src, exact) {
  const classEnd = (i) => { for (let j = i + 1; j < src.length; j++) { if (src[j] === '\\') j++; else if (src[j] === ']') return j + 1; } return src.length; };
  const groupEnd = (i) => { let d = 0; for (let j = i; j < src.length; j++) { const c = src[j]; if (c === '\\') j++; else if (c === '[') j = classEnd(j) - 1; else if (c === '(') d++; else if (c === ')' && --d === 0) return j + 1; } return src.length; };
  const negOne = (x) => { const m = /^\[(\^?)((?:\\.|[^\]\\])*)\]$/.exec(x); if (m) return m[1] ? '[' + m[2] + ']' : '[^' + m[2] + ']';
    if (/^\\[wdsWDS]$/.test(x)) return '\\' + (x[1] === x[1].toLowerCase() ? x[1].toUpperCase() : x[1].toLowerCase());
    if (x.length === 1 && !/[\\^$.|?*+()[\]{}/]/.test(x)) return '[^' + (x === '-' ? '\\-' : x) + ']';
    return null; };
  let out = ''; const st = [true], pol = [1]; let at = true;
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (c === '\\') { out += src.slice(i, i + 2); i += 2; at = false; continue; }
    if (c === '[') { const e = classEnd(i); out += src.slice(i, e); i = e; at = false; continue; }
    if (c === '(' && (src.startsWith('(?<=', i) || src.startsWith('(?<!', i))) {
      const e = groupEnd(i), inner = src.slice(i + 4, e - 1);
      if (exact && at) {
        if (src[i + 3] === '=') { out += '(?:' + lbFallback(inner, false) + ')'; at = false; }
        else { const one = negOne(inner); if (one) { out += '(?:^|' + one + ')'; at = false; } }
      } else if (pol[pol.length - 1] < 0) out += '(?!)';
      i = e; continue;
    }
    if (c === '(') { const look = src.startsWith('(?=', i) || src.startsWith('(?!', i); const h = look || src.startsWith('(?:', i) ? 3 : src.startsWith('(?<', i) ? src.indexOf('>', i) + 1 - i : 1;
      st.push(at && !look); pol.push(pol[pol.length - 1] * (src.startsWith('(?!', i) ? -1 : 1)); out += src.slice(i, i + h); i += h; at = at && !look; continue; }
    if (c === ')') { st.pop(); pol.pop(); out += c; i++; at = false; continue; }
    if (c === '|') { out += c; i++; at = st[st.length - 1]; continue; }
    if (c === '^') { out += c; i++; continue; }
    out += c; i++; at = false;
  }
  return out;
}
export const LB_HELPER = `
// [CLAUDE] Backlog 794: Lookbehind-Ausdrücke auch in Safari/iOS < 16.4 (eingesetzt von scripts/build-app.mjs, Erklärung dort)
${lbRx.toString()}
${lbFallback.toString()}
`;
const LB_RE = /\(\?<[=!]/;
export function lookbehindSafe(code, full = code) {
  if (!LB_RE.test(code)) return { code, n: 0, testOnly: 0 };
  const toks = tokens(code);
  let out = '', last = 0, n = 0, testOnly = 0;
  for (let k = 0; k < toks.length; k++) {
    const t = toks[k];
    if (t.t !== 'r') continue;
    const lit = code.slice(t.s, t.e);
    if (!LB_RE.test(lit)) continue;
    const j = lit.lastIndexOf('/'), body = lit.slice(1, j), flags = lit.slice(j + 1);
    if (body.includes('`') || body.includes('${')) throw new Error(`build-app: Lookbehind-Ausdruck mit \` bzw. \${ bei ${t.s} – lbRx nicht möglich`);
    let only = false;
    const p1 = toks[k - 1], p2 = toks[k - 2], p3 = toks[k - 3];
    if (!/[gy]/.test(flags) && p1 && p1.v === '=' && p2 && p2.t === 'w' && p3 && p3.v === 'const') {
      const name = p2.v; const uses = [...full.matchAll(new RegExp(`(?<![\\w$.])${name}(?![\\w$])`, 'g'))];
      only = uses.length > 1 && uses.every((m) => full.startsWith('.test(', m.index + name.length) || full.startsWith(' = /', m.index + name.length) || (full.startsWith('fastHint(', m.index - 9) && full.startsWith(');', m.index + name.length)));
    }
    out += code.slice(last, t.s) + `lbRx(String.raw\`${body}\`, '${flags}'${only ? ', 1' : ''})`; last = t.e; n++; if (only) testOnly++;
  }
  out += code.slice(last);
  if (LB_RE.test(tokens(out).filter((t) => t.t === 'r').map((t) => out.slice(t.s, t.e)).join('\n'))) throw new Error('build-app: Lookbehind-Literal übrig');
  const dd = dedupeLooks(out);
  // Helfer hinter die Kopfzeilen (Funktionsdeklarationen werden ohnehin vorgezogen; die Bausteinliste __RX steht vor dem ersten lbRx-Aufruf)
  return { code: dd.code.replace(/\n\n/, '\n' + LB_HELPER + dd.def + '\n'), n, testOnly, shared: dd.n };
}

// Backlog 1254 (Reserve Start-Modul, 10.11.2026): Die Hinweismuster enthalten hunderte gleichlautende Ausschlüsse als negative Vorschau
// (meist der Reparaturvermerk `(?![^.;!?]*(?:repariert|…))`, je 200–400 Zeichen). In den erzeugten Modulen steht jeder mehrfach
// vorkommende Ausschluss (≥ RX_MIN Zeichen) nur noch einmal in `const __RX = [String.raw`…`, …]`; die lbRx-Quelle setzt ihn per
// `${__RX[k]}` ein (String.raw übernimmt den Text unverändert). Der Build prüft, dass jeder Ausdruck danach Zeichen für Zeichen der
// Quelle entspricht (Test „Backlog 794“ vergleicht zusätzlich jedes Literal mit app.js). Nur Ausdrücke mit Lookbehind (lbRx) – reine
// Regex-Literale bleiben unverändert.
const RX_MIN = 60;
function rxGroups(body) {
  const classEnd = (i) => { for (let j = i + 1; j < body.length; j++) { if (body[j] === '\\') j++; else if (body[j] === ']') return j + 1; } return body.length; };
  const groupEnd = (i) => { let d = 0; for (let j = i; j < body.length; j++) { const c = body[j]; if (c === '\\') j++; else if (c === '[') j = classEnd(j) - 1; else if (c === '(') d++; else if (c === ')' && --d === 0) return j + 1; } return -1; };
  const res = [];
  for (let i = 0; i < body.length;) {
    const c = body[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '[') { i = classEnd(i); continue; }
    if (body.startsWith('(?!', i)) { const e = groupEnd(i); if (e > 0 && e - i >= RX_MIN) { res.push([i, e]); i = e; continue; } }
    i++;
  }
  return res;
}
const RX_CALL = /lbRx\(String\.raw`((?:[^`\\]|\\.)*)`/g;
export function expandRx(code) {
  const t = /^const __T = \[(.*)\];$/m.exec(code);
  if (t) { const tp = [...t[1].matchAll(/String\.raw`((?:[^`\\]|\\.)*)`/g)].map((x) => x[1]); code = code.replace(t[0] + '\n', '').replace(/\$\{__T\[(\d+)\]\}/g, (_, k) => tp[+k]); }
  const m = /^const __RX = \[(.*)\];$/m.exec(code); if (!m) return code;
  const parts = [...m[1].matchAll(/String\.raw`((?:[^`\\]|\\.)*)`/g)].map((x) => x[1]);
  return code.replace(m[0], '').replace(/\$\{__RX\[(\d+)\]\}/g, (_, k) => parts[+k]);
}
// Backlog 1277 (Reserve Start-Modul nach 1276: 46,96 % ≤ 47 %): kurze, hundertfach wiederkehrende Wortgrenzen der Hinweismuster
// (z. B. `(?![a-zäöüß])` über 1000×) stehen in `const __T = [String.raw`…`, …]` und werden in lbRx-Quellen per `${__T[k]}` (9 Byte)
// eingesetzt – nur Bausteine, die in UTF-8 länger als der Platzhalter sind. Index 0–9 einstellig; ab Backlog 1296 auch zweistellig (nur für Bausteine > 10 Byte).
// Backlog 1288 (Reserve Start-Modul nach 1287: 46,09 % > 46 %): zusätzlich die häufigsten Wortlücken `\s+(?:\S+\s+)?` (≈ 1170×),
// `(?:\S+\s+){0,2}?` (≈ 560×) und `(?:\S+\s+){0,3}?` (≈ 350×) – Index 7–9, damit bleibt die Liste bei 10 Einträgen.
// Backlog 1296 (Reserve Start-Modul nach 1295: 45,84 % > 45,8 %): Index 10–12 (Platzhalter `${__T[10]}` = 10 Byte) für die häufigsten Anfänge
// verschiedener Reparatur-Ausschlüsse (`(?![^.;!?]*(?:repariert|…|gewechselt|` ≈ 40×, RU/UK-Reparaturwörter ≈ 17× bzw. 36×), die __RX nicht
// erfasst, weil die Ausschlüsse als Ganzes verschieden sind. Reihenfolge wichtig: längerer RU/UK-Baustein vor dem kürzeren.
// Backlog 1301 (Reserve Start-Modul nach 1299/1300: 45,69 % bei Ziel 45,7 %): Index 13 = Verneinung `nicht\s+(?:mehr\s+)?` (≈ 130×).
// Backlog 1303 (Reserve Start-Modul nach 1302: 45,68 % bei Ziel 45,7 %): Index 14 = RU/UK-Aufbauwörter `(?:фургон|будк|прицеп|…|кузов|` (≈ 11×, je 106 Byte),
// Index 15 = `|не\s+працю\S*|не\s+работа\S*|` (≈ 17×) – per Häufigkeitsanalyse (Anfang an `|`/`(`, Ende an `|`/`)`, Ersparnis n × (Länge − 10)).
// Backlog 1305 (Reserve nach 1305: 45,72 % > 45,7 %): Index 16–18 = `(?:auflieger|anh(?:ä|ae)nger|` (≈ 29×), `|сломал\S*|сломан\S*|` (≈ 25×), `(?:won['’]?t|will\s+not|doesn['’]?t|` (≈ 18×).
// Backlog 1307 (Reserve nach 1306: 45,68 % bei Ziel 45,7 %): Index 19–24 per Häufigkeitsanalyse – RU/UK-Reifenwörter (5×, je 120 Byte), DE-Defektliste (5×),
// RU/UK-Aufbautüren (5×), `|більше\s+не|больше\s+не))` (16×), `|fixed|repaired|replaced|` (34×), `(?![a-z])|(?<![a-z])` (50×).
const RX_TOK = ['(?![a-zäöüß])', '(?<![a-zäöüß-])', '(?<![а-яіїєґё])', '(?<![a-zäöüß])', '(?<![а-яіїєґ])', '(?<![a-z-])', '(?![а-яіїєґё])', String.raw`\s+(?:\S+\s+)?`, String.raw`(?:\S+\s+){0,2}?`, String.raw`(?:\S+\s+){0,3}?`,
  '(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|', String.raw`|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|`, String.raw`|відремонт\S*|замінил\S*|`,
  String.raw`nicht\s+(?:mehr\s+)?`, '(?:фургон|будк|прицеп|полуприцеп|причеп|напівпричеп|кузов|', String.raw`|не\s+працю\S*|не\s+работа\S*|`,
  '(?:auflieger|anh(?:ä|ae)nger|', String.raw`|сломал\S*|сломан\S*|`, String.raw`(?:won['’]?t|will\s+not|doesn['’]?t|`,
  String.raw`(?:колес\S*|колiс\S*|коліс\S*|шин\S*|покрышк\S*|покришк\S*|резин\S*|гум[аиуі]|баллон\S*|балон\S*)`, '(?:ab(?:gebrochen|gerissen)?|gebrochen|durchgebrochen|kaputt|defekt|lose|locker|wackelt|wackelig|klemmt|h(?:ä|ae)ngt|',
  String.raw`|реф)\S*|(?:задн\S*|задні)\s+(?:ворота|двер\S*)|(?:боков\S*|бічн\S*)\s+двер\S*|`, String.raw`|більше\s+не|больше\s+не))`, '|fixed|repaired|replaced|', '(?![a-z])|(?<![a-z])',
  // Backlog 1311 (Reserve Start-Modul nach 1310: 45,70 %): häufige Alternativen-Folgen (Häufigkeitsanalyse über alle lbRx-Ausdrücke in app-main.js)
  '|auflieger|anh(?:ä|', String.raw`|funktioniert\s+wieder|wieder\s+(?:ok|`, String.raw`|geht\s+nicht|funktioniert\s+nicht|`, String.raw`|злама[вл]\S*|сломал\S*|`, String.raw`|отремонт\S*|заменил\S*|`, String.raw`|злама[внл]\S*|сломан\S*|`,
  // Backlog 1316 (Reserve Start-Modul nach 1315: 45,68 % > 45,65 %): weitere Folgen laut Häufigkeitsanalyse (je 4–7×) – RU/UK-Defektverben, „während der Fahrt“ RU/UK,
  // DE-Kühlaufbauten, DE-Reifenarten, DE-Spiegelarten.
  String.raw`|оторва\S*|тріснув\S*|треснул\S*|теліпа\S*|болта\S*|хита\S*|шата\S*|заклин\S*|`, String.raw`|під\s+час\s+руху|во\s+время\s+движения|в\s+дороге|в\s+дорозі|`,
  '|kühlanhänger|kühlkoffer|kuehlkoffer|kühler|kuehler|kofferaufbau|aufbau|sattelauflieger|', '|pneu|zwillingsreifen|vorderreifen|hinterreifen|aufliegerreifen|anh(?:ä|',
  '|ss)en|haupt|weitwinkel|rampen|front|fahrer|beifahrer|',
  // Backlog 1318 (Reserve Start-Modul nach 1317: 45,66 % > 45,65 %): drei weitere Folgen laut Häufigkeitsanalyse (je 13–17×) – „немає/нема/нет“, „відсутн/отсутств“, EN „won’t/doesn’t/does“.
  '(?:немає|нема|нет', String.raw`|відсутн\S*|отсутств`, "(?:won['’]?t|doesn['’]?t|does",
  // Backlog 1320 (Reserve Start-Modul nach 1319: 45,654 % > 45,65 %): drei weitere Folgen laut Häufigkeitsanalyse – EN-Wortanfang nach „|“ (116×), RU/UK-Rad/Reifen (4×), EN-Reparaturvermerk nach Wortende (9×).
  '|(?<![a-z])(?:', '(?:колес|колiс|коліс|шин|покрышк|покришк|резин|баллон|балон)', '(?![a-z])(?![^.;!?]*(?:fixed|repaired|replaced',
  // Backlog 1324 (Reserve Start-Modul nach 1323: 45,657 % > 45,65 %): DE-Reparaturvermerk „funktioniert wieder|wieder (ok|in ordnung“ (41×) laut Häufigkeitsanalyse.
  String.raw`funktioniert\s+wieder|wieder\s+(?:ok|in\s+ordnung`,
  // Backlog 1326 (Reserve Start-Modul nach 1325: 45,648 % ≈ Grenze 45,65 %): RU/UK „не працю…/не работа…“ ohne umgebende „|“ (19×) und „\s+(?:\S+\s+){0,4}?(?:“ (33×) laut Häufigkeitsanalyse.
  String.raw`не\s+працю\S*|не\s+работа\S*`, String.raw`\s+(?:\S+\s+){0,4}?(?:`,
  // Backlog 1328 (Reserve Start-Modul nach 1327: 45,625 % ≈ Grenze 45,63 %): Laderaum-Wörter EN/RU/UK am Ende eines Ausschlusses (3×, je 129 Byte) und DE-Türarten (4×) laut Häufigkeitsanalyse.
  String.raw`|load(?![a-z])|trailer|box\s+body|curtain|вантаж\S*|кузов\S*|причіп\S*|прицеп\S*|напівпричіп\S*|полуприцеп\S*|тент\S*|фургон\S*)[^.;!?]*)`,
  String.raw`(?:fahrer|beifahrer|heck|seiten|schiebe|kabinen|fahrerhaus|koffer|aufbau|hinter|vorder|fl(?:ü|ue)gel)?[\s-]?t(?:ü|ue)r(?:en)`,
  // Backlog 1330 (Reserve Start-Modul nach 1329: 45,631 % > 45,60 %): Ausnahmeliste Handy/Sitz/Spiegel vor einem Wort (3×), Verneinungsliste DE/EN/RU/UK mit Wortabstand (3×), RU/UK „geöffnet“ (4×) laut Häufigkeitsanalyse.
  String.raw`(?<!(?:handy|telefon|smartphone|tablet|sitz|fahrersitz|uhr|phone|seat|телефон|сидіння|сиденье|spiegel|mirror|дзеркало|зеркало)\s+)`, String.raw`(?:niemand|keiner|keine|kein|nicht|nichts|ohne|nobody|no\s+one|noone|not|no|never|without|ніхто\s+не|никто\s+не|не|без)\s+(?:\S+\s+){0,2})`, String.raw`(?:открыл|відкрил|відчинил|распахнул|розчинил|розчахнул)`,
  // Backlog 1333 (Reserve Start-Modul nach 1332: 45,61 % > 45,60 %): DE-Liste fester Hindernisse (Schranke … Blumenkübel) samt Endung, 3× in einem Ausdruck (≈ 1,5 KB) laut Häufigkeitsanalyse.
  '(?:schranke|poller|(?:stra(?:ß|ss)en)?laterne|laternen(?:pfahl|mast)|(?:licht|strom|beleuchtungs|ampel)mast|leitpfosten|absperrpfosten|pfosten|pfahl|z(?:a|ä|ae)un|(?:verkehrs|stra(?:ß|ss)en|park)?schild|schilder|verkehrszeichen|(?:leit|schutz)planke|(?:baustellen)?absperrung|bake|ampel|(?:zapf|tank)s(?:ä|ae)ule|(?:hof|hallen|einfahrts|garagen|werks|firmen|grundst(?:ü|ue)cks|sektional|lager|rampen|kipp)?tor|toreinfahrt|(?:b(?:ü|ue)ro|hallen|lager|werkstatt|eingangs|haus|glas)t(?:ü|ue)r|mauer|(?:haus|hallen|geb(?:ä|ae)ude)wand|hausecke|geb(?:ä|ae)ude|vordach|carport|(?:strom|verteiler|schalt)kasten|hydrant|briefkasten|fahrradst(?:ä|ae)nder|park(?:schein)?automat|wartenh(?:ä|ae)uschen|wareh(?:ä|ae)uschen|blumenk(?:ü|ue)bel)(?:n|en|e|s|es|er)',
  // Backlog 1339 (Reserve Start-Modul nach 1338: 45,591 % bei Grenze 45,60 %): RU/UK-Bedienelemente (Griff/Knopf/Hebel …) vor Heizung/Warnblinker/Handbremse/Lenkrad-/Spiegelverstellung/Differentialsperre, 2× je ≈ 0,7 KB laut Häufigkeitsanalyse; Index 52 = DE-Ladeboden-/Wandliste (3×), 53 = Alarm-Verben DE/EN (2×), 54 = DE-Anfahr-/Beschädigungsverben (3×) → 45,50 %.
  String.raw`(?:ручк\S*|кнопк\S*|регулятор\S*|перемикач\S*|переключател\S*|рычаг\S*|ричаг\S*|важ(?:і|е)л\S*|крутилк\S*)\s+(?:печк\S*|пічк\S*|отопител\S*|обігрівач\S*|вентилятор\S*\s+печ\S*|аварийк\S*|аварійк\S*|ручник\S*|стояночн\S*\s+тормоз\S*|стоянков\S*\s+гальм\S*|регулировк\S*\s+рул\S*|регулюванн\S*\s+керм\S*|регулировк\S*\s+зеркал\S*|регулюванн\S*\s+дзеркал\S*|блокировк\S*\s+диф\S*|блокуванн\S*\s+диф\S*`,
  String.raw`koffer|aufbau|holz|siebdruck)boden|ladefl(?:ä|ae)che|bodenplatten?|bodenbretter|bodenbrett|(?:seiten)?bordw(?:a|ä|ae)nd(?:e)?|seitenw(?:a|ä|ae)nd(?:e)?|stirnw(?:a|ä|ae)nd(?:e)?|r(?:ü|ue)ckw(?:a|ä|ae)nd(?:e)?|(?:koffer|aufbau)w(?:a|ä|ae)nd(?:e)?`,
  String.raw`ging|gehen|losgeh\S*|losgegangen|l(?:ö|oe)st|ausgel(?:ö|oe)st|ausl(?:ö|oe)s\S*|heult|hupt|piep\S*|schrillt|spinnt|dauernd|st(?:ä|ae)ndig|grundlos|von\s+(?:allein|selbst)|ohne\s+grund|go(?:es|ing)?\s+off|went\s+off|keeps?|kept|triggered|sound(?:s|ing|ed)|won['’]?t\s+stop|going|beep\S*|for\s+no\s+reason|спрацьов\S*|спрацювал\S*|срабатыва\S*|сработал\S*|вмика\S*|включа\S*|вил\S*|орет|кричить|верещ\S*`,
  String.raw`?:gestreift|angefahren|erwischt|touchiert|gerammt|abgefahren|abgerissen|(?:rein|hinein|drauf|hinten\s+drauf)\s?gefahren|reingekracht|reingeknallt|geschrammt|eingedr(?:ü|ue)ckt|eingedellt|demoliert|besch(?:ä|ae)digt|zerkratzt|aufgefahren`,
  // Backlog 1347 (Reserve Start-Modul nach dem Pannen-Hinweis: 45,601 % > 45,60 %): Index 55 = Ausnahme Standheizung/Kühlgerät/Gebläse vor „springt nicht an“ (3×),
  // 56 = DE-Türarten/Ladeklappe (3×), 57 = RU/UK-Kühlgerätestörungen (2×), 58 = DE-Ladungssicherungsmittel (2×) laut Häufigkeitsanalyse.
  String.raw`|(?<!(?:stand|park)?(?:heizung|klima(?:anlage|ger(?:ä|ae)t)?|k(?:ü|ue)hl(?:aggregat|maschine|ger(?:ä|ae)t|ung)|aggregat|reefer|thermo\s?king|carrier|l(?:ü|ue)fter|gebl(?:ä|ae)se|webasto|ebersp(?:ä|ae|a)cher|espar)(?:es|s)?\s+(`, String.raw`(?:(?:kühlauflieger|kuehlauflieger|kühlkoffer|kuehlkoffer|kofferaufbau|aufbau|heck|seiten|lade|koffer|kühl|kuehl|auflieger|anhänger|fahrer|beifahrer|schiebe|flügel|fluegel)?(?:tür|tuer)(?:en|e)?|ladeklappe|bordwand|`, String.raw`|пищ\S*|только\s+от\s+(?:сети|розетки)|тільки\s+від\s+(?:мережі|розетки)|обмерз\S*|обледен\S*|льду|льоду|лед|лід|замерз\S*|сел\s+акк\S*|сів\s+акум\S*|разряд\S*|розрядж\S*|закончил\S*|закінчил\S*|пуст\S*|порван\S*|порвал\S*|порвав\S*|сгорел\S*|згорі\S*|ошибк\S*|`, String.raw`(?:(?:zurr|spann|ratschen|lade|ladungs)gurt(?:e|en|s)?|gurte|rungen?|steckrungen?|einstecklatten|kantensch(?:ü|ue|u)tz(?:e|er)?|kantenschoner|ecksch(?:ü|ue|u)tz(?:e|er)?|antirutschmatten?|rutschhemmende\s+matten|ladungssicherungsmittel|sicherungsmittel|ladungssicherung|sperrbalken|sperrstangen?|klemmbretter|klemmbalken|ladungssicherungsnetze?|zurrketten?|(?:spann|zurr)?ratschen?|zurrpunkte?|zurr(?:ö|`,
  // Backlog 1350 (Reserve Start-Modul nach 1349: 45,584 % bei Grenze 45,60 %): Index 59 = DE-Fahrsituationen (3×), 60 = DE-Fahrzeugarten (3×),
  // 61 = RU/UK-Wortende ohne „ё“ (≈ 37×), 62 = DE-Ordnungszahlen (3×) laut Häufigkeitsanalyse.
  String.raw`(?:fahrt|fahren|fahre|fuhr|rollen|ampel|kreuzung|autobahn|stra(?:ß|ss)e|unterwegs|leerlauf|anfahren|bremsen|berg|immer|st(?:ä|ae|a)ndig|pl(?:ö|oe|o)tzlich|einfach|selbst|zwischendurch|mehrmals|grundlos)`, String.raw`(?:auto|pkw|lkw|wagen|fahrzeug|transporter|kleintransporter|bus|reisebus|linienbus|sprinter|kleinwagen|laster|sattelzug|motorrad|traktor|trecker|lieferwagen|kastenwagen|wohnmobil|wohnwagen|taxi|suv)`, String.raw`(?![а-яіїєґ])`, String.raw`(?:\d+\.?|erste[nm]?|zweite[nm]?|dritte[nm]?|vierte[nm]?|f(?:ü|ue)nfte[nm]?|sechste[nm]?|siebte[nm]?|achte[nm]?|neunte[nm]?|zehnte[nm]?|elfte[nm]?|zw(?:ö|oe)lfte[nm]?)`,
  // Backlog 1351 (Reserve Start-Modul nach 1354: 45,595 % bei Grenze 45,60 %): Index 63 = DE-Bedienelemente (Heizung … Liftachse, 2×),
  // 64 = RU/UK-Unterfahrschutz (2×), 65 = DE-Konturmarkierung/Rückstrahler (2×), 66 = EN-Verneinung + „snapped off … does nothing“ (2×) laut Häufigkeitsanalyse.
  String.raw`(?:heizung\S*|heiz|gebl(?:ä|ae)se|l(?:ü|ue)ftung|licht|warnblink\S*|hand\s?brems\S*|feststell\s?brems\S*|park\s?brems\S*|lenk(?:rad|s(?:ä|ae)ulen)(?:verstell|einstell)\S*|spiegel(?:verstell|einstell)\S*|tempomat\S*|(?:differen[tz]ial|l(?:ä|ae)ngs|quer)sperr\S*|k(?:ü|ue)hl(?:aggregat|ger(?:ä|ae)t)\S*|achslift\S*|liftachse\S*)`, String.raw`(?:(?:(?:протипідкатн|противоподкатн|противопідкатн|підкатн|подкатн|відбійн|отбойн)\S*|(?:бічн|бокова|бокової|боков)\S*\s+(?:захист\S*|защит\S*|огорож\S*|ограждени\S*))(?:\s+(?:брус\S*|балк\S*|рам\S*))?)`, String.raw`(?:kontur(?:markierung|markierungsstreifen|streifen|folie)(?:en)?|warnmarkierung(?:en)?|reflex(?:streifen|folie|folien)|reflektor(?:streifen|folie|folien|en)?|r(?:ü|ue|u)ckstrahler(?:n|s)?|seitenr(?:ü|ue|u)ckstrahler(?:n|s)?|katzenaugen?|(?:park-?)?warntafel(?:n)?|heckmarkierung(?:en|stafel|stafeln)?|markierungstafel(?:n)?)`, String.raw`(?:(?!(?:not|isn['’]?t|never|no)(?![a-z]))\S+\s+){0,3}?(?:snapped(?:\s+off)?|broken(?:\s+off)?|broke(?:\s+off)?|came\s+off|come\s+off|fell\s+off|fallen\s+off|ripped\s+off|hanging\s+off|loose|missing|stuck|jammed|cracked|not\s+working|doesn['’]?t\s+work|won['’]?t\s+(?:open|work)|does\s+nothing)(?![a-z])|`,
  // Backlog 1355 (Reserve Start-Modul nach 1359: 45,59 % bei Grenze 45,60 %): Index 67 = DE-Durchfahrtshindernisse (Brücke … Torbogen, 2×),
  // 68 = RU/UK-Verlust-/Abfallverben (2×), 69 = EN-Ladeboden/Bordwände (2×) laut Häufigkeitsanalyse.
  String.raw`(?:(?:eisenbahn|bahn|autobahn|fu(?:ß|ss)g(?:ä|ae)nger|stra(?:ß|ss)en|beton|stahl)?br(?:ü|ue)cke|unterf(?:ü|ue)hrung|parkhaus(?:einfahrt)?|tiefgarage(?:neinfahrt)?|tankstellendach|tankstellen(?:ü|ue)berdachung|(?:ü|ue)berdachung|vordach|h(?:ö|oe)henbegrenzung|h(?:ö|oe)henbalken|torbogen)(?:n|en|s)`, String.raw`(?:загуби\S*|загубл\S*|втрати\S*|втрачен\S*|потеря\S*|потерял\S*|відпа\S*|отпа\S*|відвали\S*|отвали\S*|вкрал\S*|вкрад\S*|украл\S*|украд\S*|зняли|сняли|відкрути\S*|открути\S*|немає|нема|`, String.raw`(?:(?:trailer|load(?:ing)?|cargo|box|body|wooden)\s+floor|floor\s?boards?|floor\s+(?:of|in)\s+the\s+(?:trailer|box|body|load\s+space|truck)|side\s?(?:boards?|walls?|panels?)|drop\s?sides?|tail\s?boards?|headboards?|bulkheads?|front\s+walls?|stanchions?|trailer\s+(?:walls?|sides?|body))(?![a-z])`,
  // Backlog 1360 (Reserve Start-Modul nach 1355/1362: 45,58 % bei Grenze 45,60 %): Index 70–79 laut Häufigkeitsanalyse (je 2–11×) – RU/UK-Abreiß-/Bruchverben (2 Folgen),
  // RU/UK-Anfahrverben, RU/UK-Spiegel, RU/UK-Bedienelemente/Lenkstockschalter, DE-Ladebühnen, DE-Anbauteile (Reserverad … Radlauf), RU/UK-Gebäude, EN-Lenkstockschalter, RU/UK-Anhänger.
  String.raw`(?:злама\S*|зломал\S*|відірва\S*|відірван\S*|обірва\S*|порва\S*|`, String.raw`(?:помяли|пом['’ʼ]?яли|поцарапали|подряпали|разбили|розбили|задели|зачепили|ударили|вдарили|пошкодили|повредили|въехали|в['’ʼ]?їхали|врезались|врізались)`, String.raw`(?:дзеркал\S*|зеркал\S*)`, String.raw`(?:поворот\S*|світл\S*|свет\S*|двірник\S*|дворник\S*|склоочисник\S*|стеклоочистит\S*|ретардер\S*|інтардер\S*|интардер\S*|моторн\S+\s+(?:гальм|тормоз)\S*|круїз\S*|круиз\S*)`, String.raw`|lbw|hebeb(?:ü|ue)hne|hubladeb(?:ü|ue)hne|ladeb(?:ü|ue)hne)`, String.raw`|ersatzrad|reserverad|radkappe|radzierblende|dachspoiler|seitenspoiler|frontspoiler|spoiler|windleitblech|windabweiser|radlauf|radlaufverkleidung|radlaufabdeckung|radhausschale|radhausverkleidung|kennzeichenhalter|kennzeichen|teil|teile|abdeckung|blech)(?:e|en|n|s|es)`, String.raw`(?:офіс\S*|офис\S*|склад\S*|цех\S*|ангар\S*|туалет\S*|будівл\S*|здани\S*|приміщенн\S*|помещени\S*|роздягальн\S*|раздевалк\S*|їдальн\S*|столов\S*|прохідн\S*|проходн\S*)`, String.raw`(?:indicator|turn[\s-]?signal|signal|blinker|light|headlight|combination|combi|multi-?function|steering\s+column|(?:windscreen\s+|windshield\s+)?wipers?|retarder|intarder|engine\s+brake|exhaust\s+brake|cruise(?:\s+control)?)\s+(?:stalk|lever|switch)(?:es|s)?(?![a-z])`, String.raw`(?:причеп\S*|причіп\S*|напівпричеп\S*|`, String.raw`|оборва\S*|розірва\S*|пошкодж\S*|перерізан\S*|розрізан\S*)`,
  // Backlog 1363 (Reserve Start-Modul nach 1367: 45,63 % bei Grenze 45,60 %): Index 80–83 laut Häufigkeitsanalyse – RU/UK-Warnleuchten-/Fehlerwörter (3×),
  // DE-Tankdeckel (2×), RU/UK-Betriebsstoffe Öl … Harnstoff (2×), RU/UK-Achse/Getriebe/Lenkhilfe/Nabe (2×),
  // 84 = RU/UK-Motor-Anfang (9×), 85 = DE-Kontrolle/Bußgeld-Folgen (3×).
  String.raw`|неисправ\S*|червон\S*|красн\S*|помилк\S*|ошибк\S*|пищ\S*|пікає|вимкн\S*|выключ\S*|`, String.raw`(?:(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?tank(?:deckel|verschlu(?:ss|ß)|klappe|schloss)|(?:diesel|adblue|harnstoff|kraftstoff)[\s-]?deckel|deckel\s+(?:vom|von\s+dem|des|am)\s+(?:(?:diesel|adblue|harnstoff|kraftstoff)-?)?(?:tank\S*|diesel|adblue))`, String.raw`(?:олив|масл|пальн|палив|дизел|антифриз|тосол|охолодж|охлажд|топлив|солярк|гідравлік|гидравлик|гідроборт|гидроборт|адбл|мочевин|сечовин)`, String.raw`(?:редуктор\S*|мост|моста|мосту|міст|мосту|коробк\S*|кпп|сальник\S*|гур|гпк|гидроусилител\S*|гідропідсилювач\S*|ретардер\S*|ступиц\S*|маточин\S*)`, String.raw`(?:двигун\S*|двигател\S*|`, String.raw`(?:\S+\s+){0,8}?(?:bem(?:ä|ae|a)ngelt|beanstandet|verwarn|bußgeld|bussgeld|weiterfahrt|stillgelegt|untersagt|festgehalten)|`, String.raw`(?:въехал|в['’ʼ]?їхал|в['’ʼ]?їхав|врезал|врізал|врізав|влетел|влетів|`, String.raw`(?:горить|горит|загор(?:ел|ів|іл)\S*|світиться|светится|мига\S*|блима\S*)`, String.raw`(?:в|у)\s+(?:причеп\S*|причіп\S*|прицеп\S*|напівпричеп\S*|напівпричіп\S*|полуприцеп\S*|рефрижератор\S*|холодильник\S*|будц\S*|будк\S*|кузов\S*)`, String.raw`(?:вантажівк|машин|авто|тягач|грузовик|двигун|мотор|причіп|прицеп)`, String.raw`(?:світловідбивн|светоотражающ|световозвращающ|катафот|світлоповертач|контурн\S*\s+(?:маркуван|маркировк))(?!\S*\s+(?:жилет|желет))`, String.raw`(?:руль|руля|рулем|руле|кермо|керма|кермом|кермі|рулев\S*|рульов\S*)`, String.raw`(?:датчик\S*|сенсор\S*|індикатор\S*|индикатор\S*|лампочк\S*|значок\S*)\s+(?:тиску|давлени\S*)\s+(?:(?:в|у)\s+)?(?:шин\S*|колес\S*|колiс\S*|коліс\S*)`, String.raw`(?:ad[\s-]?blue|адблю\S*|адблу\S*|сечовин\S*|мочевин\S*)`,
  // [CLAUDE] Backlog 1372 (Reserve Start-Modul nach 1373: 45,63 % bei Grenze 45,60 %): Index 94–98 laut Häufigkeitsanalyse – EN/DE-Verursacher unbekannt (2×),
  // RU/UK-Ladung (5×), RU/UK-Hebel/Schalter (2×), DE-Bruch-/Lose-Wörter (2×), EN-„not working“-Anfang (5×).
  String.raw`(?:(?:don['’]?t|do\s+not|dont|didn['’]?t|did\s+not)\s+(?:know|see)\s+who|no\s+idea\s+who|(?:someone|somebody)\s+must\s+have\s+(?:hit|scraped|clipped|damaged|dented|reversed\s+into|backed\s+into|bumped)|(?:wei(?:ß|ss)|wissen)\s+(?:ich\s+|wir\s+)?nicht,?\s+wer|keine\s+ahnung,?\s+wer)`, String.raw`(?:груз|вантаж|палет|паллет|поддон|`, String.raw`(?:важ(?:і|е)л\S*|рыча\S*|ручк\S*|перемикач\S*|переключат\S*|підрульов\S+\s+(?:важ\S*|перемикач\S*)|подрулев\S+\s+(?:рыча\S*|переключат\S*))`, String.raw`(?:abgebrochen|abgerissen|ausgerissen|rausgerissen|gebrochen|ab(?=\s*(?:$|[.,;!?]))|kaputt|defekt|lose|locker|wackelt|wackelig|klemmt|h(?:ä|ae)ngt\s+(?:lose|runter|schief)|fehlt|funktioniert\s+nicht|geht\s+nicht)`, String.raw`(?:not\s+working|doesn['’]?t\s+work|isn['’]?t\s+working|`,
  // [CLAUDE] Backlog 1374 (Reserve Start-Modul nach 1375: 45,68 % bei Grenze 45,60 %): Index 99–108 laut Häufigkeitsanalyse – DE-Anfahr-/Schadenverben, EN-Konturmarkierung,
  // RU/UK-Anhänger, RU/UK-Kühlmittel, DE-Aufstieg/Tritt, Verneinungs-Lookbehind (4×), DE-Aufbauteile, EN-Bauteile Tür … Heizung, RU/UK-Airbag-Verben, EN-Fahrzeugwörter (10×).
  String.raw`(?:angefahren|umgefahren|weggefahren|abgefahren|gestreift|touchiert|gerammt|mitgenommen|erwischt|umgeknickt|umgerissen|abgerissen|eingedr(?:ü|ue)ckt|verbogen|besch(?:ä|ae|a)digt|kaputt\s?gefahren|demoliert)`, String.raw`(?:conspicuity\s+(?:tape|markings?|strips?)|reflective\s+(?:tape|strips?|markings?)|reflector\s+(?:tape|strips?)|reflectors?|rear\s+marker\s+(?:boards?|plates?)|marker\s+boards?|warning\s+(?:boards?|plates?))`, String.raw`(?:причіп|причеп|напівпричіп|напівпричеп|прицеп|полуприцеп)`, String.raw`|охолоджувальн\S*\s+рідин\S*|охлаждающ\S*\s+жидкост\S*|антифриз\S*|`, String.raw`(?:aufstiegstritt|einstiegstritt|aufstiegsstufe|trittstufe|trittbrett|tritt|stufe|aufstieg|einstieg|einstiegsstufe|aufstiegsleiter|leiter|haltegriff|griffstange|einstiegsgriff|handlauf|griff)(?:e|en|n|s|es)`, String.raw`(?<!(?:kein|keine|keiner|ohne|nicht|no|without|без|немає|нет)\s)`, String.raw`|palettenk(?:a|ä|ae)sten(?:klappe|deckel|schloss|tür)?|ladebordwand|hebebühne|hubladebühne|ladebühne|`, String.raw`(?:doors?|gates?|lights?|lamps?|lighting|windows?|heating|heaters?|radiators?|air\s*-?con|socket|sockets)`, String.raw`(?<!не\s)(?:спрацювал[аио]?|вистрілил[аио]?|розкрил(?:ась|ися|ася)|сработал[аио]?|выстрелил[аио]?|раскрыл(?:ась|ись|ся))`, String.raw`(?:car|van|truck|lorry|vehicle|`,
  // Backlog 1374, zweite Runde: Index 109–113 – RU/UK-Anhänger kurz (4×), RU/UK-Bruchverben (4×), DE-Anbauteile Unterfahrschutz … Stoßstange, EN-Anzeige/Display (4×), RU/UK-Werkzeug-/Palettenkasten.
  String.raw`(?:причіп|напівпричіп|прицеп|полуприцеп)`, String.raw`(?:зламав\S*|зламан\S*|злама[лн]\S*|відлама\S*|`, String.raw`|unterfahrschutz|seitenschutz|seitenverkleidung|verkleidung|sto(?:ß|ss)stange|sto(?:ß|ss)f(?:ä|ae|a)nger|auspuff|auspuffrohr|endtopf|trittstufe|trittbrett|staukasten|werkzeugkasten|palettenkasten|`, String.raw`(?:dash|dashboard|display|screen|cluster|instrument\s+(?:cluster|panel))`, String.raw`(?:для\s+|під\s+|под\s+)?(?:інструмент|инструмент|палет)|(?:інструментальн|инструментальн|палетн|паллетн)\S*\s+ящик|`,
  // Backlog 1376 (Reserve Start-Modul nach 1378: 45,64 % > 45,60 %): Index 114–123 laut Häufigkeitsanalyse vom 12.11.2026 05:30 (Tankdeckel EN, RU/UK-Bruchverben, RU/UK-Kraftstoff, DE-Lenkstockhebel, RU/UK-steigt, DE/EN-Anhänger, DE-Ort Büro, RU/UK-Riemen, RU/UK-Gebäude/Gerät, EN-Umweltzone).
  String.raw`(?:(?:fuel|diesel|tank|adblue|def|gas|petrol)\s+(?:tank\s+)?(?:filler\s+)?(?:cap|lid|flap)s?)(?![a-z])`, String.raw`|відірвал\S*|зламал\S*|зламан\S*|болта\S*|теліпа\S*|заел\S*|заклин\S*|запада\S*|не\s+работа\S*|не\s+працю\S*|не\s+крути\S*)`, String.raw`(?:в|у)\s+(?:паливі|пальному|дизелі|баку|паливному\s+фільтрі|топливе|солярке|дизеле|баке|топливном\s+фильтре)`, String.raw`(?:blink(?:er)?|lenkstock|kombi|kombinations|multifunktions|licht|fernlicht|(?:scheiben)?wischer|retarder|intarder|dauerbrems|motorbrems|(?:abstands)?tempomat)[\s-]?(?:hebel|schalter)(?:s|n)`, String.raw`(?:піднімається|підіймається|піднялас[ья]|росте|зростає|виросла|поднимается|поднялась|растет|выросла)`, String.raw`(?:anh(?:ä|ae)nger|h(?:ä|ae)nger|auflieger|sattelauflieger|trailer)`, String.raw`(?:vom|von\s+(?:der|dem|unserer|unserem)|im|in\s+(?:der|dem|unserer|unserem)|zum|zur|ins|der|des|am|an\s+der|beim|bei\s+der|auf\s+(?:der|dem))\s+(?:b(?:ü|ue)ro(?:s|container|raum)?|`, String.raw`(?:ремін\S*|ремен\S*|`, String.raw`|цех|здани|будівл|душев|ванн|квартир|приложени|програм|додат|телефон|планшет|сайт|браузер)[^.;!?]*)`, String.raw`(?:emissions?|environmental|low[- ]emission(?:\s+zone)?|clean[- ]air(?:\s+zone)?|green|inspection|mot|roadworthiness|t(?:ü|u)v|hu)\s+(?:stickers?|badges?|vignettes?|discs?))`,
  // Backlog 1379 (Reserve Start-Modul nach 1381: 45,625 % > 45,60 %): Index 124–133 laut Häufigkeitsanalyse vom 12.11.2026 06:40 (DE-Aufbau/Runge/Boden, RU/UK-Tür/Licht/Fenster, RU/UK-aufdrehen, ABS/EBS, DE-während der Fahrt, RU/UK-abgerissen, RU/UK-Auspuff, RU/UK-Anhänger, EN-Unterfahrschutz, AdBlue/Harnstoff).
  String.raw`|aufbau)dach|(?:mittel|eck|steck)?runge(?:n)?|boden\s+(?:im|vom|des|der|in\s+(?:der|dem|den))`, String.raw`(?:двер\S*|ворот\S*|світл\S*|свет(?:а|у)?|ламп\S*|вікн\S*|вікно|окн\S*|окно|опаленн\S*|отоплени\S*|розетк\S*)`, String.raw`(?:откручива\S*|откручу\S*|відкручу\S*|отворачива\S*|поддают\S*|піддают\S*|раскручива\S*|розкручу\S*)|`, String.raw`(?:abs|ebs|абс|ебс)(?![a-zа-яіїєґё])`, String.raw`(?:w(?:ä|ae)hrend\s+der\s+fahrt|beim\s+fahren|unterwegs|auf\s+der\s+(?:autobahn|landstra(?:ß|ss)e|stra(?:ß|ss)e)|in\s+der\s+kurve|von\s+(?:selbst|allein|alleine))`, String.raw`(?:злетів|злетел|слетел|відлетів|зірвало|сорвало|лопнув|лопнул|порвався|порвался|тріснув|`, String.raw`(?:вихлоп|выхлоп|глушник|глушител)`, String.raw`|причіп|причеп|прицеп|`, String.raw`(?:(?:(?:rear|front|side)\s+)?underr(?:un|ide)\s+(?:bar|protection|guard|protector)s?|side\s+guards?|side\s+(?:impact\s+)?protection\s+(?:bar|rail)s?)(?![a-z])`, String.raw`|(?:adblue|адбл(?:ю|у)\S*|бензин\S*|сечовин\S*|мочевин\S*)`,
  // Backlog 1382 (Reserve Start-Modul nach 1383: 45,66 % > 45,60 %): Index 134–143 laut Häufigkeitsanalyse vom 12.11.2026 08:00 (EN-Klimaanlage, DE-Ortsangaben, RU/UK-Reifen-Ausschluss, RU/UK-Kraftstoff, EN-Ladung, DE-Aufbau, RU/UK-steht, DE-abgelehnt, RU/UK-Airbag, EN-Gebäude)
  String.raw`(?:a\/?c|aircon|air\s*con(?:ditioning)?)`, String.raw`(?:(?:hinten|vorne|vorn|links|rechts|total|ganz|sehr|etwas|leicht|richtig|so|zu)\s+)`, String.raw`(?!(?:[^.;!?]*[^а-яіїєґё.;!?])?(?:шин|колес|`, String.raw`(?:пальне|паливо|солярк\S*|дизел\S*|`, String.raw`(?:load|cargo|freight|goods|pallets?|boxes|crates?|stillages?|cages?|roll\s+cages?)`, String.raw`|koffer|trailer|aufbau|k(?:ü|ue)hlkoffer|k(?:ü|ue)hlauflieger)|dach\s+(?:vom|des)`, String.raw`(?:стою|стоїть|стоит|стоїмо|стоим|заглох\S*|заглух\S*|не\s+заводит\S*|застряг\S*|застрял\S*)`, String.raw`(?:(?:wird|wurde|ist|war|immer|schon|wieder)\s+){0,2}(?:abgelehnt|gesperrt|nicht\s+(?:angenommen|akzeptiert|gelesen)|geht\s+nicht|funktioniert\s+nicht)`, String.raw`(?:подушк[аиі]\s+безпеки|подушк[аи]\s+безопасности|ейрбег\S*|аірбег\S*|эйрбег\S*|айрбег\S*|`, String.raw`|toilet|bathroom|restroom|washroom|canteen|break\s*room|locker\s*room|gatehouse|`,
  // Backlog 1382, zweite Runde (nach Index 134–143 noch 45,604 %): Index 144–153 (Schadenswörter DE/EN, RU/UK-Fehler, RU/UK-Scheinwerfer, DE-Kühlaufbau/Laderaum, DE-Unterfahrschutz, RU/UK-Bremse, DE-abgerissen, RU/UK-Leuchten, RU/UK-Hupe, EN-verneint)
  String.raw`(?:dent\S*|scratch\S*|damag\S*|scrap\S*|bashed|smashed|delle\S*|kratzer\S*|schaden|besch(?:ä|ae)digt\S*|eingedr(?:ü|ue)ckt\S*|eingedellt|zerkratzt)`, String.raw`(?:помилк\S*|ошибк\S*|`, String.raw`(?:фар[аиыуеі]?|фарой|фарою|фарами|фарах|фонар\S*|ліхтар\S*|стекл\S*\s+фар\S*|скло\s+фар\S*)`, String.raw`(?:k(?:ü|ue)hl(?:aggregat|auflieger|koffer|ger(?:ä|ae)t|raum|box)|laderaum|ladung|reefer|fridge|рефрижератор\S*|холодильн\S*)`, String.raw`(?:(?:heck|front|seiten)?unterfahrschutz(?:es)?|seitenschutz(?:vorrichtung)?(?:es|en)?|seitliche[nrs]?\s+schutzvorrichtung(?:en)?|rammschutz(?:es)?)`, String.raw`(?:тормоз\S*|гальм\S*)`, String.raw`(?:raus|rein|auf|zu|runter|hoch)|abgerissen|abgebrochen|runtergefallen|heruntergefallen|abgerutscht|abgesackt|verbogen|klemmt|hakt|kaputt|gerissen)`, String.raw`|фар[аиуіы]?|габарит\S*|стоп(?:[- ]?сигнал\S*|(?![-]))|поворотник\S*|ліхтар\S*|фонар\S*|світло|`, String.raw`(?:звуков\S*\s+сигнал\S*|клаксон\S*|гудок|гудк[а-яіїєґ]*|бибикалк\S*|бібікалк\S*|пищалк\S*)`, String.raw`|isn['’]?t\s+working|doesn['’]?t\s+work|`,
  // Backlog 1384 (Reserve Start-Modul nach 1385: 45,61 % > 45,60 %): Index 154–163 laut Häufigkeitsanalyse vom 12.11.2026 07:50 (EN-kann nicht, RU/UK-bremst, DE-beschädigt, RU/UK-beim Beschleunigen, RU/UK-abgerissen, DE-Tür/Licht, RU/UK-läuft aus, RU/UK-Reparaturvermerk, DE-Fenster, RU/UK-abgeschlossen)
  String.raw`(?:can['’]?t|cannot|can\s+not|unable\s+to)`, String.raw`(?:тормозит|подтормажива\S*|притормажива\S*|гальмує|підгальмову\S*|пригальмову\S*)`, String.raw`(?:besch(?:ä|ae|a)digt|angefahren|gerammt|`, String.raw`(?:при|під\s+час|во\s+время)\s+(?:розгон|разгон|`, String.raw`(?:обірван\S*|обірвал\S*|оборван\S*|оборвал\S*|`, String.raw`(?:t(?:ü|ue)r(?:e|en)?|tor(?:e)?|licht(?:er)?|lampe(?:n)?|beleuchtung|fenster|heizung|heizk(?:ö|oe)rper|klima(?:anlage)?|steckdose(?:n)?)`, String.raw`(?:тече|теч[еёу]т|протіка|підтіка|протека|`, String.raw`|усунул\S*|устранил\S*|почистил\S*|зачистил\S*|затянул\S*|подтянул\S*|підтягнул\S*))`, String.raw`(?:(?:fahrer|beifahrer|seiten)?fenster|(?:fahrer|beifahrer|seiten)scheibe)`, String.raw`|замкнув\S*|закрив\S*|закрыл\S*|захлопнул\S*|залишив\S*|оставил\S*|забув\S*|забыл\S*)`, String.raw`(?:кабін\S*|кабин\S*)`, String.raw`|ausgefallen|f(?:ä|ae|a)llt\s+aus|`, String.raw`|rundumleuchte|rundumlicht|blitzleuchte|arbeitsscheinwerfer|arbeitsleuchte|arbeitslicht|zusatzscheinwerfer|scheinwerfer|abblendlicht|`, String.raw`|geht\s+nicht|gehen\s+nicht|funktioniert\s+nicht|funktionieren\s+nicht|`, String.raw`|бризковик|бризговик|брызговик|бампер|`, String.raw`(?<!(?:автономк|вебаст|webasto|печк|пічк|отопител|опалювач|реф|холодильн)\S*\s+)`, String.raw`(?:kfz-)?(?:kennzeichen(?:schild|tafel)?|nummernschild)(?:s|e|er|n|en)`, String.raw`(?:(?:ремен|ремін)\S*\s+(?:кріплен|креплен)\S*|стяжн\S*\s+(?:ремен|ремін)\S*|стяжк\S*|`, String.raw`|umkleide(?:raum)?|aufenthaltsraum(?:es)?|sozialraum(?:es)?|pausenraum(?:es)?|kantine|(?:firmen|b(?:ü|ue)ro)?geb(?:ä|ae)ude(?:s)`, String.raw`(?:знак\s+оклику|окличн\S*\s+знак|восклицательн\S*\s+знак|жовт\S*\s+трикутник|`,
  // Backlog 1390 (Reserve Start-Modul nach 1391: 45,69 % > 45,60 %): Index 174–183 laut Häufigkeitsanalyse vom 12.11.2026 09:50 (EN-Kühlaggregat, EN-von selbst, RU/UK-läuft aus, RU/UK-Gang, RU/UK-Heizung, RU/UK-Fahrzeugschein, EN-Fahrzeug, DE-Motorraum, RU/UK-Kühler/Motor, RU/UK-Kabel).
  String.raw`(?:fridge|reefer|cooler|fridge\s+unit|reefer\s+unit|thermo\s?king|`, String.raw`(?:by\s+itself|on\s+its\s+own)`, String.raw`(?:теч[еёу]т|тече|потек\S*|потік|протека\S*|протіка\S*|подтека\S*|підтіка\S*)`, String.raw`(?:передач\S*|скорост\S*)`, String.raw`(?<!(?:автономн|стоянков|додатков|дополнительн)\S*\s+)(?:пічк|печк|обігрів|`, String.raw`(?:свідоцтв\S*\s+(?:про\s+)?реєстраці\S*|свидетельств\S*\s+(?:о\s+)?регистраци\S*)`, String.raw`(?:truck|lorry|vehicle|trailer|rig|tractor|unit|artic|wagon|van|it)`, String.raw`(?:motor(?:raum|haube|abdeckung)?|haube|k(?:ü|ue)hler|luftfilter(?:kasten)?|ansaug\S*|batterie(?:kasten)?|auspuff|getriebe)`, String.raw`(?:радиатор|радіатор|двигател|двигун|`, String.raw`(?:дріт|дроти|провід|проводи|провод\S*|`,
  // Backlog 1390, zweite Runde (nach Index 174–183 noch 45,646 %): Index 184–193 laut erneuter Häufigkeitsanalyse.
  String.raw`|(?:екологічн|экологическ|зелен)\S*\s+(?:наклейк|стикер|значок|плакетк)`, String.raw`(?:lade[\s-]?(?:bord|bort|board)`, String.raw`(?:(?:паливн\S*|топливн\S*|заправн\S*|заправочн\S*)\s+карт\S*|карт\S*\s+(?:dkv|uta)`, String.raw`(?:водоотделител|водовідокремлювач|`, String.raw`(?:авто|машин|вантажівк|фур|причіп|причеп|напівпричіп|полуприцеп|`, String.raw`|lade|seiten|schiebe|flügel|fluegel|fahrer|beifahrer|koffer|kühl|kuehl|auflieger|anhänger)?(?:tür|tuer|tur)(?:en|e)`, String.raw`(?:горить|горит|загорі\S*|загоре\S*|світить\S*|светит\S*|блима\S*|мига\S*)`, String.raw`|coach|taxi|motorbike|motorcycle|trailer|pick-?up|suv)(?![a-z])|`, String.raw`(?:топливн|паливн|дизельн)`, String.raw`|протіка\S*|протека\S*|`,
  // Backlog 1390, dritte Runde (nach Index 184–193 noch 45,610 %): Index 194–203.
  String.raw`(?:сцеплени|зчепленн)`, String.raw`(?:на|при)\s+(?:заправц\S*|заправк\S*|АЗС)`, String.raw`(?:verbogen|abgerissen|abgefahren|lose|locker|kaputt|besch(?:ä|ae)digt|eingedr(?:ü|ue)ckt|gebrochen|h(?:ä|ae)ngt)`, String.raw`(?:кабін\S*|кабин\S*|`, String.raw`|не\s+вмика\S*|не\s+включа\S*|`, String.raw`|kaputt|defekt|besch(?:ä|ae|a)digt|`, String.raw`(?:горить|горит|загорів|загорілас|`, String.raw`(?:im|auf\s+dem|am)\s+(?:display|bildschirm|`, String.raw`|k(?:ü|ue)hlt|heizt|startet|schlie(?:ß|ss)t|(?:ö|oe)ffnet|`, String.raw`(?:камень|камінь|камінець|камешек|`,
  // Backlog 1392 (Reserve nach Backlog 1394: 45,614 % > 45,60 %): Index 204–213 per Häufigkeitsanalyse.
  String.raw`(?:won['’]?t|wont|doesn['’]?t|`, String.raw`|відпа|отпа|відвали|отвали|звиса|висить|висит|бовтає|болтает|`, String.raw`|(?<![^.;!?\n]*(?:reifen|flanke|lauffl|karkasse|lack|tyre|tire|шин|покришк|покрышк)[^.;!?\n]*)`, String.raw`(?:загуби\S*|втрати\S*|`, String.raw`(?<!(?:kein|keine|keinen|ohne)`, String.raw`(?:(?:funk)?schl(?:ü|ue)ssel|fernbedienung|taschenlampe|funkger(?:ä|ae)t|handy|tablet|(?:hand)?scanner)(?:s)`, String.raw`|кипит|закипа\S*|закипі\S*|закипе\S*)`, String.raw`(?:stuck|stranded|stopped|broke\s+down|broken\s+down|won['’]?t\s+start|died|cut\s+out|conked\s+out)(?![a-z])`, String.raw`(?:t|en)\s+(?:(?:jetzt|seitdem|seither)\s+)`, String.raw`(?:(?:k(?:ü|ue)hl)?aggregat(?:s|es)?|k(?:ü|ue)hlger(?:ä|ae)t(?:s|es)?|k(?:ü|ue)hlmaschine|thermo\s?king|`,
  // Backlog 1398 (Reserve nach Backlog 1397: 45,613 % > 45,60 %): Index 214–223 per Häufigkeitsanalyse.
  String.raw`(?<!не\s)(?:р[ао]зби[лв]\S*|отлом\S*|відл[ао]м\S*|погнул\S*|в[ыи]рвал\S*|`, String.raw`(?![\s\S]*(?:repariert|erneuert|getauscht|ersetzt|behoben|`, String.raw`(?:rear|back|side|cargo|trailer|barn|box|load(?:ing)?)\s+)`, String.raw`(?:can['’]?t|cannot|unable\s+to)`, String.raw`(?:пуст\S*|порожн\S*|треснул\S*|тріснув\S*|лопнул\S*|лопнув|теч\S*|`, String.raw`(?:steht|stehe|steh|stehen|stand|stehen\s?geblieben|liegen\s?geblieben|ausgegangen|geht\s+aus|ging\s+aus|`, String.raw`|(?<![^.;!?]*(?:laderaum|ladefl(?:ä|ae)che|koffer|plane|`, String.raw`(?<!не\s)(?:порвал\S*|разорвал\S*|розірвал\S*|розірвало|порвало|`, String.raw`(?:кабель|кабел\S*|провід|провод\S*|роз[\'’ʼ]?єм\S*|разъ[её]м\S*|`, String.raw`|несправн\S*|неисправ\S*|`];
export function dedupeLooks(code) {
  const calls = [...code.matchAll(RX_CALL)], count = new Map();
  for (const c of calls) for (const [a, e] of rxGroups(c[1])) { const g = c[1].slice(a, e); count.set(g, (count.get(g) || 0) + 1); }
  const idx = new Map(); for (const [g, k] of count) if (k > 1 && !g.includes('`') && !g.includes('${')) idx.set(g, idx.size);
  if (!idx.size) return { code, def: '', n: 0 };
  let out = code.replace(RX_CALL, (all, body) => {
    let b = '', last = 0;
    for (const [a, e] of rxGroups(body)) { const g = body.slice(a, e); if (idx.has(g)) { b += body.slice(last, a) + '${__RX[' + idx.get(g) + ']}'; last = e; } }
    return 'lbRx(String.raw`' + b + body.slice(last) + '`';
  });
  let def = 'const __RX = [' + [...idx.keys()].map((g) => 'String.raw`' + g + '`').join(', ') + '];\n';
  let used = false;
  const out2 = out.replace(RX_CALL, (all, body) => 'lbRx(String.raw`' + RX_TOK.reduce((b, tk, k) => { if (!b.includes(tk)) return b; used = true; return b.split(tk).join('${__T[' + k + ']}'); }, body) + '`');
  if (used) { def = 'const __T = [' + RX_TOK.map((g) => 'String.raw`' + g + '`').join(', ') + '];\n' + def; out = out2; }
  if (expandRx(def + out).slice(1) !== code) throw new Error('build-app: Bausteinliste __RX verändert einen Ausdruck');
  return { code: out, def, n: idx.size };
}

// Backlog 1213 (Reserve Start-Modul, 09.11.2026): Kommentare stehen nur in der Quelle app.js – die erzeugten Module enthalten sie nicht
// (≈ 17 % von app-main.js waren Kommentarzeilen, die jedes Gerät beim Start mitlud). Zeilenumbrüche bleiben erhalten (Zeilennummern in
// Fehlermeldungen stimmen mit dem unveränderten Modul überein, automatische Semikolons unverändert); die Kopfzeile (HEAD) bleibt stehen.
// Zeichenketten, Vorlagen und Regex-Literale erkennt tokens() – „//“ darin (z. B. https://) bleibt unberührt.
export function stripComments(code) {
  const nl = code.indexOf('\n') + 1, head = code.slice(0, nl), body = code.slice(nl);
  const toks = tokens(body);
  let out = '', last = 0;
  const gap = (g) => g.replace(/\/\*[\s\S]*?\*\//g, (m) => (m.includes('\n') ? m.replace(/[^\n]+/g, '') : ' ')).replace(/\/\/[^\n]*/g, '').replace(/[ \t]+\n/g, '\n');
  for (const t of toks) { out += gap(body.slice(last, t.s)) + body.slice(t.s, t.e); last = t.e; }
  out += gap(body.slice(last));
  if (tokens(out).length !== toks.length) throw new Error('build-app: Kommentarentfernung verändert den Code');
  return head + out;
}

// Wörter einer Deklaration (aus der Tokenliste, ohne Zeichenketten – Vorlagen-Ausdrücke separat)
function tokensRefs(src, toks, d) {
  return wordsOf(src.slice(d.start, d.end));
}

// Backlog 596 (29.10.2026): Alle beim Start statisch importierten Module als <link rel="modulepreload"> in index.html – der Browser
// lädt sie sonst erst, nachdem app-main.js (bzw. i18n-core.js) angekommen ist (je eine Latenz mehr, Slow 3G ≈ 2 s je Stufe).
// Das Sprachpaket der gemerkten Sprache ergänzt boot.js (Sprache steht erst im Browser fest).
export function startModules(mainTxt, read = (f) => readFileSync(new URL(f, pub), 'utf8')) {
  const seen = new Set(), todo = [['app-main.js', mainTxt]];
  while (todo.length) {
    const [f, txt] = todo.shift(); if (seen.has(f)) continue; seen.add(f);
    for (const m of txt.matchAll(/^import [^;]*? from '\.\/([^']+)';?$/gm)) if (!seen.has(m[1])) todo.push([m[1], read(m[1])]);
  }
  seen.delete('app-main.js');
  return [...seen].sort();
}
const PRE_A = '<!-- modulepreload: erzeugt durch scripts/build-app.mjs -->', PRE_E = '<!-- /modulepreload -->';
export function withPreloads(html, mods) {
  const block = PRE_A + '\n' + mods.map((f) => `<link rel="modulepreload" href="/${f}">`).join('\n') + '\n' + PRE_E;
  const a = html.indexOf(PRE_A), e = html.indexOf(PRE_E);
  if (a >= 0 && e > a) return html.slice(0, a) + block + html.slice(e + PRE_E.length);
  return html.replace('<link rel="stylesheet" href="/styles.css">', '<link rel="stylesheet" href="/styles.css">\n' + block);
}

export function buildApp() {
  const src = readFileSync(new URL('app.js', pub), 'utf8');
  const { files, stubs, moved } = splitApp(src);
  for (const [f, txt] of Object.entries(files)) writeFileSync(new URL(f, pub), txt);
  const idx = readFileSync(new URL('index.html', pub), 'utf8'), idx2 = withPreloads(idx, startModules(files['app-main.js']));
  if (idx2 !== idx) writeFileSync(new URL('index.html', pub), idx2);
  const kb = (f) => Math.round(Buffer.byteLength(files[f]) / 1024);
  console.log(`app: app.js ${Math.round(Buffer.byteLength(src) / 1024)} KB → app-main ${kb('app-main.js')} KB + ${Object.keys(GROUPS).map((g) => `app-${g} ${kb(`app-${g}.js`)} KB`).join(' + ')} (${moved} Deklarationen ausgelagert, ${stubs.size} Platzhalter)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) buildApp();
