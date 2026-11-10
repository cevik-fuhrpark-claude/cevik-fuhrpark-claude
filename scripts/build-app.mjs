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
const RX_TOK = ['(?![a-zäöüß])', '(?<![a-zäöüß-])', '(?<![а-яіїєґё])', '(?<![a-zäöüß])', '(?<![а-яіїєґ])', '(?<![a-z-])', '(?![а-яіїєґё])', String.raw`\s+(?:\S+\s+)?`, String.raw`(?:\S+\s+){0,2}?`, String.raw`(?:\S+\s+){0,3}?`,
  '(?![^.;!?]*(?:repariert|erneuert|getauscht|ersetzt|behoben|gewechselt|', String.raw`|відремонт\S*|замінил\S*|замінен\S*|отремонт\S*|`, String.raw`|відремонт\S*|замінил\S*|`];
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
