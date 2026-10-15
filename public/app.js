// [CLAUDE] Cevik Fuhrpark – Oberfläche (ohne Framework, mobil zuerst)
import { STRINGS, CHECK_LABELS, translateValidation, translateImportReason, translateNextAction, translateLockReason, auditActionLabel, auditDetailText } from './i18n.js';
import { findingMessage } from './finding-messages.js';
import { svg as qrSvg } from './qr.js';
import { dataQualityCsv, dqDetailText, defectItemsCsv, defectVehiclesCsv, agentFindingsCsv, usersCsv, sortUsers, filterUsers, isUnusedUser, inviteExpired, readCsvFile } from './csv.js';
import { helpMatches, helpNorm } from './help.js';

// Sprache: gespeicherte Wahl, sonst Gerätesprache (Ukrainisch/Englisch), sonst Deutsch
const deviceLang = () => { const l = (navigator.language || 'de').toLowerCase(); return l.startsWith('uk') ? 'uk' : l.startsWith('en') ? 'en' : 'de'; };
// Sortierwahl je Gerät/Tab merken (nur erlaubte Werte, sonst Standard; Speicher kann fehlen oder werfen)
const sortPref = (key, allowed, def, set) => { const k = 'cfp_sort_' + key; if (set !== undefined) { try { sessionStorage.setItem(k, set); } catch {} return set; } let v = ''; try { v = sessionStorage.getItem(k) || ''; } catch {} return allowed.includes(v) ? v : def; };
const CASE_SORTS = ['priority', 'oldest', 'updated'], VEH_SORTS = ['plate', 'next_due', 'km_due', 'check_oldest', 'km_desc', 'findings'];
let lastActivity = Date.now(), lastApiAt = 0, idleBusy = false; // Leerlauf-Abmeldung (siehe noteActivity)
const S = { me: null, meta: null, lang: (() => { try { return localStorage.getItem('cfp_lang') || deviceLang(); } catch { return deviceLang(); } })(), viewEnv: null, unread: 0 };
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
// Name einer Person; für Lesezugriff ausgeblendete Fahrernamen (Server setzt <feld>_hidden) als Hinweistext
const pnm = (name, hidden) => (hidden ? t('name_hidden_driver') : name);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// [CLAUDE] Kalenderdatum in Berlin wie der Server („heute“, Fristen, Monate) – nicht UTC (nachts bis 2 Uhr Vortag) und nicht Gerätezeitzone
const BERLIN_FMT = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' });
const bDate = (days = 0) => BERLIN_FMT.format(new Date(Date.now() + days * 86400000));
const bYm = (back = 0) => { const [y, m] = bDate().slice(0, 7).split('-').map(Number); return new Date(Date.UTC(y, m - 1 - back, 1)).toISOString().slice(0, 7); };
const t = (k) => (STRINGS[S.lang] && STRINGS[S.lang][k]) || STRINGS.de[k] || k;
// Prüf-/Wartungsarten: gespeichert wird der deutsche Name (Server, CSV, Agent); angezeigt in der App-Sprache. HU/SP/UVV sind Fachkürzel.
const MK_KEYS = { Tachograph: 'tacho', 'Ölwechsel': 'oil', Inspektion: 'service', Bremsen: 'brakes', Reifen: 'tires', 'Hydraulik/Aufbau': 'hydraulics', 'Feuerlöscher': 'extinguisher', Verbandkasten: 'firstaid', Ladungssicherung: 'loadsec', 'Rückruf': 'recall', Sonstiges: 'other' };
const mk = (k) => (MK_KEYS[k] ? t('mk_' + MK_KEYS[k]) : k);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
// Zeitpunkte immer in Berliner Zeit wie Server, Fristen und CSV (ein Gerät auf Kyjiwer Zeit zeigte sonst eine Stunde mehr –
// z. B. Tatzeit im Bußgeld ≠ Schreiben). Formatierer je Sprache einmal erzeugt (Listen mit Hunderten Zeitstempeln).
const DT_FMT = {};
// Zahlen, Beträge und Datumsangaben im Format der Oberflächensprache (Eingabefelder akzeptieren weiter Komma und Punkt)
const locOf = (l) => (l === 'uk' ? 'uk-UA' : l === 'en' ? 'en-GB' : 'de-DE');
const uiLoc = () => locOf(S.lang);
const fmtNum = (x, o) => Number(x).toLocaleString(uiLoc(), o);
const dtFmt = (kind) => { const loc = uiLoc(); const k = kind + loc; return DT_FMT[k] || (DT_FMT[k] = new Intl.DateTimeFormat(loc, kind === 'dt' ? { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Berlin' } : { timeZone: kind === 'd' ? 'Europe/Berlin' : 'UTC' })); };
const fmtDT = (iso) => { if (!iso) return '–'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? '–' : dtFmt('dt').format(d); };
// Kalenderdatum „JJJJ-MM-TT“ bleibt dieser Tag; Zeitstempel → Berliner Kalendertag
const fmtD = (iso) => { if (!iso) return '–'; const d = new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso); return Number.isNaN(d.getTime()) ? '–' : dtFmt(iso.length === 10 ? 'd10' : 'd').format(d); };
const dqDetail = (i) => dqDetailText(i, t, fmtD);
const hrs = (n) => (n === null || n === undefined ? '–' : fmtNum(Math.round(n * 100) / 100, { maximumFractionDigits: 2 }));
const EUR_FMT = {};
const eur = (n) => { if (n === null || n === undefined) return '–'; const l = uiLoc(); return (EUR_FMT[l] || (EUR_FMT[l] = new Intl.NumberFormat(l, { style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol' }))).format(n); };
// Ist-Kosten: ohne belegte Position, aber mit unbewerteten Positionen ist „0 €“ keine Aussage → „–“ (unbewertet ≠ 0 €)
const eurIst = (o) => (o && o.valued_items === 0 && o.unvalued_items > 0 ? '–' : eur(o.actual_net));
// Datei-Links: Inhaber mit umgeschalteter Ansicht (Test/Betrieb) braucht die Umgebung als Parameter, da Links keine Header senden
const fileUrl = (id) => `/api/files/${encodeURIComponent(id)}${S.viewEnv && S.me && S.me.role === 'owner' ? '?env=' + encodeURIComponent(S.viewEnv) : ''}`;
const isMgr = () => S.me && ['owner', 'fleet'].includes(S.me.role);

function plate(p, opts = {}) {
  const txt = esc(p || '—');
  return `<span class="plate${opts.big ? ' big' : ''}${opts.locked ? ' locked' : ''}" aria-label="Kennzeichen ${txt}"><span class="eu">D</span><span class="num">${txt}</span></span>`;
}

// ---------- API ----------
async function api(method, path, body, extra = {}) {
  const headers = { 'x-cfp': '1', ...(extra.headers || {}), ...(extra.bg ? { 'x-cfp-bg': '1' } : {}) };
  if (S.viewEnv && S.me && S.me.role === 'owner') headers['x-cfp-env'] = S.viewEnv;
  let b = body;
  if (body !== undefined && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && typeof body !== 'string') { b = JSON.stringify(body); headers['content-type'] = 'application/json'; }
  let res;
  if (!extra.bg) lastApiAt = Date.now(); // Hintergrund-Abfragen (Zahl am Glockensymbol) zählen nicht als Bedienung – auch serverseitig nicht (x-cfp-bg)
  try { res = await fetch(path, { method, headers, body: b, credentials: 'same-origin' }); }
  catch { const e = new Error(t('offline')); e.offline = true; throw e; }
  if (res.status === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/invite') && !path.startsWith('/api/setup')) { resetUserState(); try { localStorage.removeItem('cfp_offline_session'); } catch {} location.hash = '#/login'; const e = new Error(t('err_unauthenticated')); e.status = 401; throw e; }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.blob();
  // Exporte mit Zeilengrenze melden die Begrenzung per Header (z. B. Vorgangs-CSV)
  if (data instanceof Blob && res.headers.get('x-cfp-truncated')) data.cfpTruncated = Number(res.headers.get('x-cfp-truncated')) || true;
  if (!res.ok) {
    // Häufige Fehler in der gewählten Sprache (Server-Texte sind deutsch); unbekannte Codes: Server-Text
    const code = data && data.error;
    const tr = code && S.lang !== 'de' && ((STRINGS[S.lang] && STRINGS[S.lang]['err_' + code]) || (code === 'validation' && translateValidation(S.lang, data.message)));
    const e = new Error(tr || (data && data.message) || `${t('error')} ${res.status}`); e.code = code; e.status = res.status; throw e;
  }
  return data;
}

// [CLAUDE] Zeilenhinweise der Import-Vorschauen in der App-Sprache (Server liefert Deutsch)
const reasonText = (r) => translateImportReason(S.lang, r);
// Lange Import-Vorschauen zeigen nur die ersten Zeilen – dann ausdrücklich sagen, wie viele es insgesamt sind (nie still abschneiden)
const impMore = (total, shown) => (total > shown ? `<p class="small" role="note" data-impmore>${esc(t('imp_first_n').replace('{n}', fmtNum(shown)).replace('{m}', fmtNum(total)))}</p>` : '');
function toast(msg, err = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.setAttribute('role', err ? 'alert' : 'status');
  el.textContent = msg;
  // Fehler: nur einer gleichzeitig (keine übereinanderliegenden Meldungen), Anzeigedauer nach Textlänge (6–20 s, WCAG 2.2.1),
  // pausiert solange Finger/Maus darauf liegt, Antippen schließt
  if (err) document.querySelectorAll('.toast.err').forEach((x) => x.remove());
  const ms = err ? Math.min(20000, Math.max(6000, 2500 + String(msg).length * 60)) : 3000;
  let timer = setTimeout(() => el.remove(), ms);
  if (err) {
    el.title = t('tap_to_close');
    el.addEventListener('click', () => el.remove());
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => { clearTimeout(timer); timer = setTimeout(() => el.remove(), 4000); });
  }
  document.body.appendChild(el);
}

// ---------- Rahmen ----------
const ICON = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  cases: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 6h11v10H2zM13 9h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
};

function frame(content, active) {
  const env = S.me ? (S.viewEnv && S.me.role === 'owner' ? S.viewEnv : S.me.environment) : null;
  const tabs = [];
  tabs.push(['#/', 'home', t('nav_home'), 'home']);
  tabs.push(['#/cases', 'cases', t('nav_cases'), 'cases']);
  if (S.me.role !== 'viewer') tabs.push(['#/new', 'plus', t('nav_new'), 'new']);
  if (isMgr()) tabs.push(['#/master', 'chart', t('nav_master'), 'master']);
  else if (S.me.role !== 'driver') tabs.push(['#/vehicles', 'truck', t('nav_vehicles'), 'vehicles']);
  else tabs.push(['#/check', 'truck', t('nav_check'), 'check']);
  tabs.push(['#/more', 'more', t('nav_more'), 'more']);
  return `<a class="skip" href="#main">${esc(t('skip_to_content'))}</a>
  <header class="topbar">
    <div class="brand">CEVIK ${esc(t('app'))} <small>[CLAUDE]</small></div>
    <div class="spacer"></div>
    ${S.me.role === 'owner' ? `<select id="envsel" aria-label="${esc(t('env_switch'))}"><option value="production"${env === 'production' ? ' selected' : ''}>${esc(t('env_prod'))}</option><option value="test"${env === 'test' ? ' selected' : ''}>${esc(t('env_testname'))}</option></select>` : ''}
    ${S.me.role !== 'driver' ? `<a href="#/search" aria-label="${esc(t('search_title'))}" style="color:#fff;display:flex">${ICON.search}</a>` : ''}
    <a href="#/inbox" aria-label="${esc(t('notifications'))}" style="position:relative;color:#fff;display:flex">${ICON.bell}${S.unread ? `<span class="badge" style="position:absolute;top:-6px;right:-10px">${S.unread}</span>` : ''}</a>
  </header>
  ${env === 'test' ? `<div class="testband">${esc(t('env_test'))}</div>` : ''}
  <nav class="tabbar" aria-label="${esc(t('navigation'))}">${tabs.map(([href, icon, label, key]) => `<a href="${href}" class="${key === active ? 'active' : ''}${key === 'new' ? ' report' : ''}">${key === 'new' ? `<span class="dot">${ICON[icon]}</span>` : ICON[icon]}<span>${esc(label)}</span></a>`).join('')}</nav>
  <main id="main" tabindex="-1">${content}</main>`;
}

function render(html, active) {
  // Dieselbe Seite wird neu aufgebaut (z. B. km-Stand in der Fahrzeugakte gespeichert): Eingaben in anderen Formularen, aufgeklappte
  // Bereiche und die Scrollposition bleiben erhalten. Ladehinweis zwischendurch („Lädt …“) zählt nicht als fertiger Aufbau.
  const same = !!(S.me && S.lastHash && (location.hash || '#/').replace(/%3A/gi, ':') === S.lastHash);
  const interim = html === `<p class="muted">${esc(t('loading'))}</p>`;
  if (same) keepCapture(); else { S.keep = null; S.actSince = []; }
  document.getElementById('app').innerHTML = S.me ? frame(html, active) : `<main>${html}</main>`;
  const sk = $('.skip'); if (sk) sk.onclick = (e) => { e.preventDefault(); $('#main').focus(); };
  const es = $('#envsel');
  if (es) es.onchange = () => { S.viewEnv = es.value; localStorage.setItem('cfp_env', es.value); route(); };
  stackTables(document.getElementById('app'));
  markToggles(document.getElementById('app'));
  if (same && interim) return;
  if (same && S.keep) keepRestore(); else window.scrollTo(0, 0);
}

// Filterknöpfe (gelb = aktiv, „secondary“ = inaktiv): Zustand auch für Screenreader (aria-pressed), sofern nicht schon als Tab/Schalter ausgezeichnet
const TOGGLE_ATTRS = ['av', 'clf', 'cf', 'qk', 'tt', 'tf', 'af', 'wl', 'dq', 'ud', 'mf'];
function markToggles(root) {
  for (const b of root.querySelectorAll(TOGGLE_ATTRS.map((a) => `button.btn[data-${a}]`).join(','))) {
    if (b.hasAttribute('aria-pressed') || b.hasAttribute('aria-selected')) continue;
    b.setAttribute('aria-pressed', String(!b.classList.contains('secondary')));
  }
}

// Tabellen mit Klasse „stack“ werden auf dem Handy als Karten dargestellt: Spaltenüberschrift je Zelle als data-label
function stackTables(root) {
  for (const tb of root.querySelectorAll('table.stack')) {
    const heads = [...tb.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    for (const tr of tb.querySelectorAll('tbody tr')) [...tr.children].forEach((td, i) => { if (heads[i] && !td.dataset.label) td.dataset.label = heads[i]; });
  }
}

// Barrierefreiheit: Beschriftungen, die als vorangehendes <label> ohne for-Bezug geschrieben sind, programmatisch verknüpfen;
// Felder ohne Beschriftung erhalten den Platzhalter als zugänglichen Namen. Läuft nach jeder DOM-Änderung in #app.
let fieldSeq = 0;
function labelFix(root) {
  for (const el of root.querySelectorAll('input:not([type=hidden]),select,textarea')) {
    if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.closest('label')) continue;
    if (el.id && root.querySelector(`label[for="${CSS.escape(el.id)}"]`)) continue;
    const prev = el.previousElementSibling;
    if (prev && prev.tagName === 'LABEL' && !prev.htmlFor) { if (!el.id) el.id = `f${++fieldSeq}`; prev.htmlFor = el.id; continue; }
    if (el.placeholder) el.setAttribute('aria-label', el.placeholder);
  }
}
{
  let queued = false;
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') new MutationObserver(() => { if (queued) return; queued = true; queueMicrotask(() => { queued = false; labelFix(app); }); }).observe(app, { childList: true, subtree: true });
}

// ---------- Router ----------
const routes = [
  [/^#\/login$/, viewLogin], [/^#\/setup$/, viewSetup], [/^#\/invite\/(.+)$/, viewInvite],
  [/^#\/?$/, viewHome], [/^#\/cases(?:\?f=\w+)?$/, viewCases], [/^#\/cases\/([\w-]+)$/, viewCase], [/^#\/new$/, viewNew], [/^#\/new\/(VIN:[A-Z0-9]+)$/, viewNew], [/^#\/vehicles\/qr$/, viewQrSheet], [/^#\/v\/(VIN:[A-Z0-9]+)$/, viewScan], [/^#\/check\/(VIN:[A-Z0-9]+)$/, viewDepartureCheck], [/^#\/vehicles\/qr\/(VIN:[A-Z0-9]+)$/, viewQrSheet],
  [/^#\/vehicles(?:\?f=\w+)?$/, viewVehicles], [/^#\/vehicles\/(VIN:[A-Z0-9]+)$/, viewVehicle], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\?ev=([\w-]+)$/, viewVehicle], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\/timeline(?:\?f=(\w+))?$/, viewTimeline], [/^#\/inbox$/, viewInbox],
  [/^#\/master(?:\?q=([^&]*))?$/, (q) => viewMaster(q)], [/^#\/plan(?:\?s=(mdue))?$/, (sec) => viewPlan(sec)], [/^#\/users$/, viewUsers], [/^#\/settings$/, viewSettings], [/^#\/more(?:\?o=(sess))?$/, (o) => viewMore(o)],
  [/^#\/check$/, viewDepartureCheck], [/^#\/check\/paper$/, viewCheckPaper], [/^#\/guide(?:\?l=(de|uk|en))?$/, (l) => viewDriverGuide(l)], [/^#\/stock$/, viewStock], [/^#\/stock\/reorder$/, viewReorder], [/^#\/stock\/journal$/, viewStockJournal], [/^#\/stock\/count$/, viewStockCount], [/^#\/stock\/asof$/, viewStockAsOf], [/^#\/fines$/, viewFines], [/^#\/drivers$/, viewDrivers], [/^#\/tacho$/, viewTacho], [/^#\/contracts$/, viewContracts], [/^#\/claims$/, viewClaims], [/^#\/drivers\/([\w-]+)$/, viewDriver], [/^#\/costs$/, viewCosts], [/^#\/kpi$/, viewKpi], [/^#\/defects$/, viewDefects], [/^#\/audit(?:\?u=([\w-]+))?$/, (u) => viewAudit(false, u)], [/^#\/audit\?v=(VIN:[A-Z0-9]+)$/, (v) => viewAudit(false, undefined, v)], [/^#\/usage$/, viewUsage], [/^#\/quality(?:\?f=(\w+))?$/, viewQuality], [/^#\/wsload$/, viewWsLoad], [/^#\/telematics$/, viewTelematics], [/^#\/help(?:\?s=([\w-]+))?(?:[?&]q=([^&#]*))?$/, viewHelp], [/^#\/search$/, viewSearch], [/^#\/emergency(?:\?v=(VIN:[A-Z0-9]+))?$/, viewEmergency], [/^#\/emergency\/edit$/, viewEmergencyEdit], [/^#\/tires(?:\?f=\w+)?$/, viewFleetTires], [/^#\/maintenance$/, viewMaint], [/^#\/fines\/([\w-]+)$/, viewFine], [/^#\/stock\/([\w-]+)$/, viewStockItem], [/^#\/inspect\/([\w-]+)$/, viewInspection],
];
const routeArg = (x) => { if (x === undefined) return undefined; try { return decodeURIComponent(x); } catch { return x; } };

async function route() {
  // Links mit encodeURIComponent(Fahrzeug-ID) enthalten „VIN%3A…“ – vor dem Abgleich mit den Routen auf „VIN:“ zurückführen
  const h = (location.hash || '#/').replace(/%3A/gi, ':');
  const pub = /^#\/(login|setup|invite\/)/.test(h);
  // Seitenwechsel während eine Seite noch lädt (langsames Netz, schnelles Tippen): die ältere Seite darf die neuere nicht überschreiben
  const gen = S.routeGen = (S.routeGen || 0) + 1;
  try {
    if (!S.me && !pub) {
      try { const r = await api('GET', '/api/me'); S.me = r.user; lastActivity = Date.now(); S.lang = r.user.language || S.lang; S.offlineStart = false; }
      catch (err) {
        // Funkloch beim App-Start: mit zuletzt gespeichertem Konto weiterarbeiten (Meldungen gehen in den Offline-Ausgang)
        const cached = err.offline ? offlineSession() : null;
        if (!cached) { const st = await api('GET', '/api/setup/status').catch(() => ({})); if (!st.needs_setup && /^#\/((new|check|v)\/VIN:[A-Z0-9]+|cases\/[\w-]+|fines\/[\w-]+)$/.test(h)) { try { sessionStorage.setItem('cfp_after_login', h); } catch {} } location.hash = st.needs_setup ? '#/setup' : '#/login'; return; }
        S.me = cached.me; S.meta = cached.meta; S.lang = S.me.language || S.lang; S.offlineStart = true;
      }
      if (S.me.role === 'owner') S.viewEnv = localStorage.getItem('cfp_env') || null;
      if (!S.offlineStart) {
        S.meta = await api('GET', '/api/meta');
        saveOfflineSession();
        refreshUnread();
      }
    }
    for (const [re, fn] of routes) {
      const m = h.match(re);
      if (!m) continue;
      // Optionale Gruppen ohne Treffer bleiben undefined (decodeURIComponent(undefined) ergäbe die Zeichenkette „undefined“), kaputte %-Folgen roh
      await fn(...m.slice(1).map(routeArg));
      // Inzwischen wurde eine neuere Seite aufgerufen: war sie schon fertig, hat diese (ältere) Seite sie überschrieben → neu aufbauen
      if (gen !== S.routeGen) { if ((S.routeDone || 0) > gen) route(); return; }
      S.routeDone = gen;
      // Screenreader/Tastatur: nach Seitenwechsel Fokus auf die Überschrift (nicht bei Neuaufbau derselben Seite)
      // – außer die Ansicht hat selbst ein Feld fokussiert (z. B. Direktsprung ?ev= zum Formular „Prüfergebnis nachtragen“)
      const ae = document.activeElement;
      if (S.lastHash && S.lastHash !== h && !(ae && ae !== document.body && ae.matches('input, select, textarea, [data-keepfocus]') && ae.closest('#main, main'))) { const h1 = document.querySelector('#main h1, main h1'); if (h1) { h1.tabIndex = -1; h1.focus({ preventScroll: true }); } }
      S.lastHash = h;
      if (S.me && navigator.onLine !== false) flushOutbox();
      return;
    }
    location.hash = '#/';
  } catch (e) {
    if (gen !== S.routeGen) return; // Fehler einer überholten Seite nicht über die aktuelle legen
    render(`<div class="panel alert"><p>${esc(e.message)}</p><button class="btn" id="rl">${esc(t('retry'))}</button></div>`);
    const rl = document.getElementById('rl'); if (rl) rl.onclick = () => location.reload();
  }
}
window.addEventListener('hashchange', route);
// Neuaufbau derselben Seite nach einer Aktion: merken, welcher Bereich die Aktion ausgelöst hat (Formular bzw. Abschnitt des Knopfs) –
// dessen Felder wurden gerade gesendet und werden danach nicht wiederhergestellt (siehe keepCapture). Aufruf aus den Sperren unten.
function noteAction(el) {
  const scope = el && el.closest && (el.closest('form') || el.closest('details, section, .panel, .row, .actions, li, tr') || el);
  if (scope) S.actSince = [...(S.actSince || []).slice(-19), scope];
}
// Doppeltes Absenden verhindern (Doppelklick, zweimal Enter, langsames Netz): Alle Formulare der App setzen den Handler als Eigenschaft (onsubmit).
// Ein Zuhörer in der Einfangphase führt diesen Handler selbst aus und sperrt das Formular, bis er fertig ist – ein zweites Absenden in
// der Zwischenzeit wird verworfen (sonst z. B. Fahrer, Artikel, Bußgeld, Vertrag oder Lagerbewegung doppelt angelegt). Knöpfe werden
// nicht deaktiviert (das steuern einzelne Handler selbst), nur per aria-busy als „wird gesendet“ dargestellt.
document.addEventListener('submit', (e) => {
  const form = e.target, h = form && form.onsubmit;
  if (typeof noteAction === 'function') noteAction(form);
  if (typeof h !== 'function') return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (form.cfpBusy) return;
  form.cfpBusy = true; form.setAttribute('aria-busy', 'true');
  let p; try { p = h.call(form, e); } catch (err) { p = Promise.reject(err); }
  Promise.resolve(p).catch((err) => { if (!onUnhandledApiError(err)) throw err; }).finally(() => { form.cfpBusy = false; form.removeAttribute('aria-busy'); });
}, true);
// Dasselbe für Knöpfe/Links mit asynchronem Klick-Handler (`el.onclick = async …`, z. B. Quittieren, Ausbuchen, Entscheidung,
// Bestandsbuchung): Vor dem ersten Klick wird der Handler umhüllt; liefert er ein Promise, sind weitere Klicks bis zum Ende wirkungslos.
// Synchrone Handler (Navigation, Aufklappen) bleiben unverändert.
document.addEventListener('click', (e) => {
  const el = e.target && e.target.closest ? e.target.closest('button, a, [role="button"]') : null;
  if (el && typeof noteAction === 'function') noteAction(el);
  const h = el && el.onclick;
  if (typeof h !== 'function' || h.cfpGuard) return;
  const g = function (ev) {
    if (el.cfpBusy) { ev.preventDefault(); return false; }
    const r = h.call(this, ev);
    if (r && typeof r.then === 'function') {
      el.cfpBusy = true; el.setAttribute('aria-busy', 'true');
      Promise.resolve(r).catch((err) => { if (!onUnhandledApiError(err)) throw err; }).finally(() => { el.cfpBusy = false; el.removeAttribute('aria-busy'); });
    }
    return r;
  };
  g.cfpGuard = true; el.onclick = g;
}, true);
// Sicherheitsnetz: Lädt eine Ansicht nach einer Aktion neu (z. B. `viewVehicle(id)` außerhalb von route()) und bricht dabei das Netz
// ab, ging der Fehler bisher still verloren – die Seite blieb veraltet stehen. Jetzt: Meldung (nur Fehler der eigenen API, nicht 401 –
// dort leitet api() schon zur Anmeldung um; gleiche Meldung höchstens einmal je 3 s).
let lastRejectMsg = '', lastRejectAt = 0;
function onUnhandledApiError(err) {
  if (!err || !(err.offline || err.status) || err.status === 401) return false;
  const now = Date.now();
  if (err.message === lastRejectMsg && now - lastRejectAt < 3000) return true;
  lastRejectMsg = err.message; lastRejectAt = now;
  toast(err.message, true);
  return true;
}
window.addEventListener('unhandledrejection', (e) => { if (onUnhandledApiError(e.reason)) e.preventDefault(); });

// Offline-Start: nur Anzeige-Daten des Kontos (keine Zugangsdaten – die Anmeldung bleibt im HttpOnly-Cookie); beim Abmelden gelöscht
const OFFLINE_KEY = 'cfp_offline_session';
function saveOfflineSession() {
  try {
    const { id, username, display_name, role, environment, workshop_site, language } = S.me;
    localStorage.setItem(OFFLINE_KEY, JSON.stringify({ me: { id, username, display_name, role, environment, workshop_site, language }, meta: S.meta, saved_at: new Date().toISOString() }));
  } catch {}
}
function offlineSession() { try { const x = JSON.parse(localStorage.getItem(OFFLINE_KEY) || 'null'); return x && x.me && x.meta ? x : null; } catch { return null; } }
// Ansichtszustand der vorherigen Person verwerfen (geteilte Werkstatt-Tablets): Suchtexte, Filter, Sortierung, Zwischenspeicher.
// Bleibt: Sprache, App-Version, Stammdaten-Meta (wird bei der nächsten Anmeldung ohnehin neu geladen; laufende Ansichten
// lesen sie evtl. noch nach einem 401) und das Sprungziel nach der Anmeldung.
const KEEP_STATE = ['lang', 'appVersion', 'meta'];
function resetUserState() {
  for (const k of Object.keys(S)) if (!KEEP_STATE.includes(k)) delete S[k];
  S.me = null; S.viewEnv = null; S.unread = 0;
  try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('cfp_') && k !== 'cfp_after_login') sessionStorage.removeItem(k); } catch {}
}
function clearOfflineData() {
  try { for (const k of Object.keys(localStorage)) if (k === OFFLINE_KEY || k.startsWith('cfp_veh_') || k.startsWith('cfp_myveh_') || k.startsWith('cfp_emerg_') || k.startsWith('cfp_inv_')) localStorage.removeItem(k); } catch {}
}
// Leerlauf-Abmeldung auch in der App (Einstellung des Inhabers, Wert kommt vom Server mit /api/me): Der Server meldet erst beim
// nächsten Aufruf ab – bis dahin stünde auf einem geteilten Tablet die Ansicht der vorherigen Person. Die App leert den Bildschirm
// nach derselben Zeit ohne Bedienung selbst. Umgekehrt hält Bedienung ohne Serveraufruf (z. B. langes Tippen) die Anmeldung wach.
const idleLimitMs = () => { const m = S.me ? Number(S.me.idle_logout_min) : 0; return m > 0 ? m * 60000 : 0; };
function noteActivity(ev) {
  const ms = idleLimitMs(), now = Date.now();
  if (ms && now - lastActivity > ms) { checkIdle(); return; } // abgelaufen: nicht mehr verlängern
  lastActivity = now; if (ms && !(ev && ev.target && ev.target.closest && ev.target.closest('#idlebar'))) idleWarn(null); // Leiste selbst: Knopf soll klickbar bleiben
  if (ms && !S.offlineStart && navigator.onLine !== false && now - lastApiAt > Math.min(10 * 60000, ms / 3)) api('GET', '/api/me').catch(() => {});
}
// Vorwarnung 60 s vor der Abmeldung mit „Angemeldet bleiben“ (WCAG 2.2.1: Zeitbegrenzung ankündigen und verlängern lassen)
function idleWarn(left) {
  let bar = document.getElementById('idlebar');
  if (left === null) { if (bar) bar.remove(); return; }
  if (!bar) {
    bar = document.createElement('div'); bar.id = 'idlebar'; bar.className = 'update-bar'; bar.setAttribute('role', 'alert');
    bar.innerHTML = `<span></span><button type="button" class="btn">${esc(t('idle_stay'))}</button>`;
    bar.querySelector('button').onclick = () => { lastActivity = Date.now(); idleWarn(null); noteActivity(); };
    document.body.appendChild(bar);
  }
  bar.querySelector('span').textContent = t('idle_warn').replace('{s}', Math.max(1, Math.ceil(left / 1000)));
}
async function checkIdle() {
  const ms = idleLimitMs();
  const left = ms ? ms - (Date.now() - lastActivity) : Infinity;
  idleWarn(left > 0 && left <= 60000 && !idleBusy ? left : null);
  if (!ms || idleBusy || left > 0) return;
  idleBusy = true;
  try { if (!S.offlineStart && navigator.onLine !== false) await api('POST', '/api/logout').catch(() => {}); } catch {}
  clearOfflineData(); resetUserState(); idleBusy = false;
  location.hash = '#/login'; toast(t('idle_signed_out'));
}
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, noteActivity, { passive: true, capture: true }));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkIdle(); });
setInterval(checkIdle, 5000); // nur Zeitvergleich, ohne Serveraufruf
// Netz wieder da nach Offline-Start: Seite nur neu aufbauen, wenn nichts eingegeben ist – sonst (z. B. halb ausgefüllte Schadensmeldung im Funkloch)
// Sitzung und Stammdaten im Hintergrund auffrischen, die Eingaben bleiben stehen
window.addEventListener('online', async () => {
  if (!S.offlineStart) return;
  if (!viewDirty()) { S.offlineStart = false; S.me = null; route(); return; }
  try {
    const r = await api('GET', '/api/me'); S.me = r.user; S.offlineStart = false;
    S.meta = await api('GET', '/api/meta'); saveOfflineSession(); refreshUnread(true); flushOutbox();
  } catch {}
});
// Hat die Person in der aktuellen Ansicht etwas eingegeben oder ausgewählt? (vorsichtig: im Zweifel ja)
function viewDirty() {
  const m = document.getElementById('main') || document.querySelector('main'); if (!m) return false;
  return [...m.querySelectorAll('input, textarea, select')].some((el) => {
    if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button') return false;
    if (el.type === 'file') return !!el.value;
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked;
    if (el.tagName === 'SELECT') { const d = [...el.options].findIndex((o) => o.defaultSelected); return el.selectedIndex !== (d < 0 ? (el.multiple ? -1 : 0) : d); }
    return el.value !== el.defaultValue;
  });
}

// ---------- Neuaufbau derselben Seite ohne Verlust fremder Eingaben ----------
// Bisher baute jede Aktion die Seite komplett neu auf: Wer in der Fahrzeugakte einen km-Stand tippte und zwischendurch eine Wartung
// speicherte, verlor die km-Eingabe, aufgeklappte Bereiche klappten zu, die Seite sprang nach oben.
// Regeln: Felder des Bereichs, der die Aktion ausgelöst hat (gesendetes Formular, Abschnitt des Knopfs), werden nie zurückgeschrieben
// (sonst stünde z. B. ein gesendeter Kommentar erneut da). Ein Formular wird nur wiederhergestellt, wenn sich seine Vorgabewerte nicht
// geändert haben (sonst hat die Aktion die Daten dahinter geändert, z. B. anderer Eintrag zum Bearbeiten geladen) – dann gilt der neue Stand.
// Dateiauswahl und Passwörter werden nie übernommen. Umgebungswechsel Test/Betrieb verwirft alles.
const KEEP_SKIP_TYPES = ['hidden', 'submit', 'button', 'reset', 'image', 'file', 'password'];
const fieldDefault = (el) => (el.type === 'checkbox' || el.type === 'radio') ? String(el.defaultChecked) : el.tagName === 'SELECT' ? [...el.options].map((o) => (o.defaultSelected ? 1 : 0)).join('') + ':' + [...el.options].map((o) => o.value).join('\u0001') : el.defaultValue;
const fieldValue = (el) => (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.tagName === 'SELECT' ? [...el.options].filter((o) => o.selected).map((o) => o.value) : el.value;
function fieldDirty(el) {
  if (el.type === 'checkbox' || el.type === 'radio') return el.checked !== el.defaultChecked;
  if (el.tagName === 'SELECT') { const d = [...el.options].findIndex((o) => o.defaultSelected); return el.selectedIndex !== (d < 0 ? (el.multiple ? -1 : 0) : d); }
  return el.value !== el.defaultValue;
}
function keepScan(root) {
  const groups = {}, details = new Map(), formKey = new Map(), occ = {};
  let fi = 0;
  const once = (k) => { occ[k] = (occ[k] || 0) + 1; return occ[k] > 1 ? `${k}~${occ[k]}` : k; };
  for (const el of root.querySelectorAll('input, textarea, select')) {
    if (KEEP_SKIP_TYPES.includes(el.type)) continue;
    const f = el.closest('form');
    if (f && !formKey.has(f)) formKey.set(f, once('F:' + (f.id || [...f.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `${a.name}=${a.value}`).join('&') || `#${fi++}`)));
    const fk = once(`${f ? formKey.get(f) : ''}|${el.name || el.id || ''}|${el.tagName}:${el.type}`);
    const gk = f ? formKey.get(f) : 'E:' + fk;
    const g = groups[gk] || (groups[gk] = { sig: [], els: {} });
    g.sig.push(fieldDefault(el)); g.els[fk] = el;
  }
  for (const g of Object.values(groups)) g.sig = g.sig.join('\u0002');
  for (const d of root.querySelectorAll('details')) { const s = d.querySelector('summary'); details.set(once('D:' + (d.id || (s ? s.textContent.trim().slice(0, 80) : ''))), d); }
  return { groups, details };
}
function keepCapture() {
  if (S.keep) return; // Ladehinweis dazwischen: es gilt der Stand vor dem Ladehinweis
  const m = document.getElementById('main');
  if (!m) return;
  const skip = (S.actSince || []).filter(Boolean);
  const { groups, details } = keepScan(m);
  const keep = { env: S.viewEnv || null, y: window.scrollY || 0, groups: {}, open: [] };
  for (const [gk, g] of Object.entries(groups)) {
    const fields = {};
    for (const [fk, el] of Object.entries(g.els)) if (fieldDirty(el) && !skip.some((c) => c === el || (c.contains && c.contains(el)))) fields[fk] = fieldValue(el);
    if (Object.keys(fields).length) keep.groups[gk] = { sig: g.sig, fields };
  }
  for (const [k, d] of details) if (d.open) keep.open.push(k);
  S.keep = keep;
}
function keepRestore() {
  const k = S.keep; S.keep = null; S.actSince = [];
  if (k.env !== (S.viewEnv || null)) { window.scrollTo(0, 0); return; }
  const m = document.getElementById('main');
  if (!m) return;
  const { groups, details } = keepScan(m);
  const changed = [];
  for (const [gk, g] of Object.entries(k.groups)) {
    const ng = groups[gk];
    if (!ng || ng.sig !== g.sig) continue;
    for (const [fk, v] of Object.entries(g.fields)) {
      const el = ng.els[fk];
      if (!el) continue;
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked === v) continue; el.checked = v; }
      else if (el.tagName === 'SELECT') { if (!v.every((x) => [...el.options].some((o) => o.value === x))) continue; [...el.options].forEach((o) => { o.selected = v.includes(o.value); }); }
      else { if (el.value === v) continue; el.value = v; }
      changed.push(el);
      for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true;
    }
  }
  for (const key of k.open) { const d = details.get(key); if (d) d.open = true; }
  window.scrollTo(0, k.y);
  // Abhängige Anzeigen (z. B. ein-/ausgeblendete Felder) erst nach dem Binden der Handler durch die Ansicht aktualisieren
  setTimeout(() => {
    for (const el of changed) { if (!el.isConnected) continue; el.dispatchEvent(new Event('input', { bubbles: true })); if (el.closest('form')) el.dispatchEvent(new Event('change', { bubbles: true })); }
    if (Math.abs((window.scrollY || 0) - k.y) > 2) window.scrollTo(0, k.y);
  }, 0);
}

async function refreshUnread(bg = false) {
  try { const n = await api('GET', '/api/notifications?count=1', undefined, { bg }); S.unread = n.unread; lastUnreadAt = Date.now(); paintBadge(); } catch {}
}
// Zahl am Glockensymbol an Ort und Stelle aktualisieren – ohne die Seite neu aufzubauen (halb ausgefüllte Formulare bleiben erhalten)
function paintBadge() {
  const a = document.querySelector('.topbar a[href="#/inbox"]'); if (!a) return;
  let b = a.querySelector('.badge');
  if (!S.unread) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('span'); b.className = 'badge'; b.style.cssText = 'position:absolute;top:-6px;right:-10px'; a.appendChild(b); }
  b.textContent = S.unread;
}
// Ohne Push (z. B. nicht erlaubt) bliebe die Zahl stehen: beim Zurückkehren in die App und alle 2 Min. (nur sichtbar, angemeldet, online) nachfragen
let lastUnreadAt = 0;
function pollUnread() {
  if (!S.me || S.offlineStart || navigator.onLine === false || document.visibilityState !== 'visible' || Date.now() - lastUnreadAt < 30000) return;
  lastUnreadAt = Date.now(); refreshUnread(true);
}
document.addEventListener('visibilitychange', pollUnread);
setInterval(pollUnread, 120000);

// ---------- Öffentliche Ansichten ----------
function viewLogin() {
  render(`<div class="center"><form id="f" class="narrow panel">
    <h1>CEVIK ${esc(t('app'))}</h1><p class="muted small">[CLAUDE]</p>
    <label for="u">${esc(t('username'))}</label><input id="u" autocomplete="username" required autocapitalize="none">
    <label for="p">${esc(t('password'))}</label><input id="p" type="password" autocomplete="current-password" required>
    <div class="actions"><button class="btn block">${esc(t('login'))}</button></div>
    <details class="small" style="margin-top:8px"><summary>${esc(t('forgot_pw'))}</summary><p class="muted">${esc(t('forgot_pw_hint'))}</p></details>
    ${langSelect()}
  </form></div>`);
  bindLang();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('POST', '/api/login', { username: $('#u').value.trim(), password: $('#p').value, device_id: deviceId() });
      if (r.second_factor) { viewLoginCode(r.challenge); return; }
      afterLogin();
    } catch (err) { toast(err.message, true); }
  };
}
// Gerätekennung für den Anmelde-Hinweis bei neuem Gerät: zufällig, nur in diesem Browser, bleibt beim Abmelden erhalten (keine Zugangsdaten)
function deviceId() {
  try {
    let d = localStorage.getItem('cfp_device');
    if (!/^[0-9a-f]{32}$/.test(d || '')) { d = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem('cfp_device', d); }
    return d;
  } catch { return undefined; }
}
function afterLogin() { S.me = null; let next = '#/'; try { next = sessionStorage.getItem('cfp_after_login') || '#/'; sessionStorage.removeItem('cfp_after_login'); } catch {} location.hash = next; route(); }
// Zweiter Schritt: Code aus der Authenticator-App oder Ersatzcode (Passwort bleibt nicht im Speicher der Seite)
function viewLoginCode(challenge) {
  render(`<div class="center"><form id="f2" class="narrow panel">
    <h1>${esc(t('tf_title'))}</h1><p class="small">${esc(t('tf_login_hint'))}</p>
    <label for="tc">${esc(t('tf_code_or_rc'))}</label><input id="tc" autocomplete="one-time-code" inputmode="text" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="14" required>
    <div class="actions"><button class="btn block">${esc(t('tf_confirm'))}</button></div>
    <p class="small"><a href="#/login" id="tback">${esc(t('tf_back'))}</a></p>
  </form></div>`);
  const inp = $('#tc'); inp.focus();
  $('#tback').onclick = (e) => { e.preventDefault(); viewLogin(); };
  $('#f2').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('POST', '/api/login/totp', { challenge, code: inp.value.trim(), device_id: deviceId() });
      if (r.recovery_left !== undefined) toast(t('tf_rc_used').replace('{n}', r.recovery_left));
      afterLogin();
    } catch (err) {
      toast(err.message, true);
      if (err.code === 'totp_expired' || err.code === 'locked') viewLogin(); else { inp.value = ''; inp.focus(); }
    }
  };
}
function langSelect() {
  return `<label for="lang">${esc(t('language'))}</label><select id="lang"><option value="de"${S.lang === 'de' ? ' selected' : ''}>Deutsch</option><option value="uk"${S.lang === 'uk' ? ' selected' : ''}>Українська</option><option value="en"${S.lang === 'en' ? ' selected' : ''}>English</option></select>`;
}
function bindLang(save = false) {
  const l = $('#lang');
  if (l) l.onchange = async () => { S.lang = l.value; localStorage.setItem('cfp_lang', l.value); if (save) await api('PATCH', '/api/me', { language: l.value }).catch(() => {}); route(); };
}
async function viewSetup() {
  const st = await api('GET', '/api/setup/status');
  if (!st.needs_setup) { location.hash = '#/login'; return; }
  render(`<div class="center"><form id="f" class="narrow panel"><h1>${esc(t('setup'))}</h1>
    <label for="c">${esc(t('setup_code'))}</label><input id="c" required autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false">
    <label for="u">${esc(t('username'))}<span class="hint">${esc(t('username_rule'))}</span></label><input id="u" required autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="y.cevik">
    <label for="n">${esc(t('display_name'))}</label><input id="n" required>
    <div class="actions"><button class="btn block">${esc(t('create_owner'))}</button></div><p class="small muted">${esc(t('setup_next'))}</p></form></div>`);
  $('#u').oninput = () => { const el = $('#u'); const v = el.value.toLowerCase().replace(/\s+/g, '.').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9._-]/g, ''); if (v !== el.value) el.value = v; };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await api('POST', '/api/setup', { setup_code: $('#c').value.trim(), username: $('#u').value.trim().toLowerCase(), display_name: $('#n').value.trim() }); location.hash = '#/invite/' + r.invite_token; }
    catch (err) { toast(err.message, true); }
  };
}
async function viewInvite(token) {
  let info;
  try { info = await api('GET', '/api/invite/' + encodeURIComponent(token)); }
  catch (e) { render(`<div class="center"><div class="panel narrow alert"><p>${esc(e.message)}</p></div></div>`); return; }
  render(`<div class="center"><form id="f" class="narrow panel"><h1>${esc(t('welcome'))}, ${esc(info.display_name)}</h1>
    <p class="muted">${esc(t('username'))}: <b>${esc(info.username)}</b> · ${esc(t('role_' + info.role))}${info.environment === 'test' ? ' · <span class="chip test">TEST</span>' : ''}</p>
    <label for="p">${esc(t('new_password'))}<span class="hint">${esc(t('pw_rule'))}</span></label><input id="p" type="password" autocomplete="new-password" minlength="10" required>
    <div class="actions"><button class="btn block">${esc(t('set_password'))}</button></div>${langSelect()}</form></div>`);
  bindLang();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await api('POST', '/api/invite/accept', { token, password: $('#p').value, device_id: deviceId() }); if (r.second_factor) { viewLoginCode(r.challenge); return; } await api('PATCH', '/api/me', { language: S.lang }).catch(() => {}); S.me = null; location.hash = '#/'; }
    catch (err) { toast(err.message, true); }
  };
}

// ---------- Übersicht ----------
// Teile-Liefertermin laut Werkstatt (nur bei „wartet auf Teile“); überschritten = markiert
const partsEta = (c, sep = ' · ', label = true) => c.status === 'wartet_teile' && c.parts_expected_date ? `${sep}<b>${label ? esc(t('parts_eta')) + ' ' : ''}${fmtD(c.parts_expected_date)}</b>${c.parts_expected_date < bDate() ? ` <span class="chip kritisch">${esc(t('parts_eta_passed'))}</span>` : ''}` : '';
// Werkstatt-Tagesübersicht: Aufträge des eigenen Standorts nach Arbeitsschritt, dazu Prüftermine der nächsten 14 Tage
async function workshopBoard() {
  const open = (await api('GET', '/api/cases?status=open&limit=500')).cases;
  const lanes = [
    ['ws_to_ack', open.filter((c) => c.status === 'werkstatt_freigegeben' && !c.workshop_ack_at)],
    ['ws_to_start', open.filter((c) => c.status === 'werkstatt_freigegeben' && c.workshop_ack_at)],
    ['st_in_reparatur', open.filter((c) => c.status === 'in_reparatur')],
    ['st_wartet_teile', open.filter((c) => c.status === 'wartet_teile')],
    ['st_abschlusskontrolle', open.filter((c) => c.status === 'abschlusskontrolle')],
    ['ws_preview', open.filter((c) => c.status === 'gemeldet')],
  ];
  // Mangel bei der Abfahrtskontrolle erneut festgestellt (letzte 3 Tage) – zuerst, damit die Werkstatt ihn vorzieht
  // Heute geplant und Termin überschritten (nicht begonnen) – oben, nur gespeicherte Termine
  const today = bDate();
  const passed = open.filter((c) => c.status === 'werkstatt_freigegeben' && c.planned_date && c.planned_date < today);
  const todayL = open.filter((c) => ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'].includes(c.status) && c.planned_date === today);
  if (todayL.length) lanes.unshift(['ws_planned_today', todayL]);
  // Mängelbeseitigung aus Prüfung (HU/SP/UVV mit erheblichen Mängeln) – Nachprüfung folgt, daher hervorgehoben
  const fromInsp = open.filter((c) => c.maintenance_event_id && ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'].includes(c.status));
  if (fromInsp.length) lanes.unshift(['ws_from_inspection', fromInsp]);
  // Teile heute/morgen erwartet (oder Liefertermin überschritten) – Wareneingang prüfen, dann „Reparatur fortsetzen“
  // Kosten über der Freigabegrenze: vor größeren weiteren Arbeiten Freigabe der Fuhrparkleitung abwarten
  const costWait = open.filter((c) => c.cost_over_limit_at);
  if (costWait.length) lanes.unshift(['cost_approval_pending', costWait]);
  const partsDue = open.filter((c) => c.status === 'wartet_teile' && c.parts_expected_date && c.parts_expected_date <= bDate(1));
  if (partsDue.length) lanes.unshift(['ws_parts_due', partsDue]);
  if (passed.length) lanes.unshift(['todo_plan_passed', passed]);
  const rep = open.filter((c) => c.status !== 'gemeldet' && recentRepeat(c));
  if (rep.length) lanes.unshift(['ws_repeat', rep]);
  let html = lanes.filter(([, l]) => l.length).map(([k, l]) => `<h2>${esc(t(k))} <span class="chip">${l.length}</span></h2>${caseList(l)}${k === 'ws_repeat' ? `<p class="small"><a href="#/cases?f=repeat">${esc(t('show_in_list'))} ›</a></p>` : ''}`).join('') || `<p class="muted">${esc(t('no_cases'))}</p>`;
  try {
    const ov = await api('GET', '/api/maintenance');
    // ≤ 14 Tage nach Datum oder nach km fällig/überschritten (Warnschwelle aus den Einstellungen) – gleiche Status wie die Prüftermin-Übersicht
    const kmDueNow = (r) => ['ueberfaellig', 'faellig'].includes(r.km_status);
    const soon = ov.rows.filter((r) => (r.days !== null && r.days <= 14) || kmDueNow(r));
    if (soon.length) html += `<h2>${esc(t('inspections_due'))} (≤ 14 ${esc(t('days'))}${soon.some(kmDueNow) ? ' ' + esc(t('ws_due_km_suffix')) : ''})</h2><div class="list">${soon.map((r) => `<a class="row ${r.status === 'ueberfaellig' ? 'p-kritisch' : 'p-mittel'}" href="#/vehicles/${encodeURIComponent(r.vehicle_id)}">${plate(r.plate)}<span class="title">${esc(mk(r.kind))}${r.days !== null && r.days <= 14 ? ' · ' + fmtD(r.next_due_date) : ''}${kmDueNow(r) ? ` · ${esc(t('due_at_km'))} ${fmtKm(r.next_due_km)} (${r.km_remaining < 0 ? esc(t('km_over')) + ' ' + fmtKm(-r.km_remaining) : esc(t('km_left')) + ' ' + fmtKm(r.km_remaining)})` : ''}</span><span class="chip ${r.status === 'ueberfaellig' ? 'kritisch' : 'mittel'}">${esc(t('ms_' + r.status))}</span></a>`).join('')}</div><p class="small" style="margin-top:8px"><a href="#/plan?s=mdue">${esc(t('wplan'))}: ${esc(t('wplan_mdue'))} ›</a> <span class="muted">${esc(t('ws_mdue_link_hint'))}</span></p>`;
    // Prüfung mit erheblichen/gefährlichen Mängeln bzw. verkehrsunsicher, noch kein Auftrag: nur zur Info – die Fuhrparkleitung entscheidet
    const dw = ov.defects_without_case || [];
    if (dw.length) html += `<h2>${esc(t('ws_defects_pending'))} <span class="chip">${dw.length}</span></h2><p class="small muted">${esc(t('ws_defects_hint'))}</p><div class="list">${dw.map((x) => `<a class="row p-kritisch" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title">${esc(mk(x.kind))} · ${fmtD(x.done_date)}</span><span class="chip kritisch">${esc(t('res_' + x.result))}</span></a>`).join('')}</div>`;
  } catch {}
  // selbst erfasste Pflichtprüfungen ohne Ergebnis (≤ 180 Tage, neueste ihrer Art) – Sprung direkt zum Formular in der Fahrzeugakte
  try {
    const nr = (await api('GET', '/api/me/inspections-without-result')).items;
    if (nr.length) html += `<h2>${esc(t('res_missing_mine'))} <span class="chip">${nr.length}</span></h2><p class="small muted">${esc(t('res_missing_hint'))}</p><div class="list">${nr.map((r) => `<a class="row" href="#/vehicles/${encodeURIComponent(r.vehicle_id)}?ev=${encodeURIComponent(r.id)}">${plate(r.plate)}<span class="title">${esc(mk(r.kind))} · ${fmtD(r.done_date)}</span><span class="chip">${esc(t('res_add_go'))} ›</span></a>`).join('')}</div>`;
  } catch {}
  // Winterreifen: Lkw ohne Alpine-Symbol laut Erfassung als Arbeitsvorrat (umrüsten bzw. Erfassung nachholen) – nur Information, keine Sperre
  html += await wsWinter(vsDef('tireSite'));
  return html + `<p><a href="#/cases">${esc(t('all'))}</a> · <a href="#/plan">${esc(t('wplan'))} ›</a></p>${helpLink('ws')}`;
}
async function viewHome() {
  render(`<p class="muted">${esc(t('loading'))}</p>`, 'home');
  let d, cases;
  try {
    d = await api('GET', '/api/dashboard');
    cases = (await api('GET', '/api/cases?status=open&limit=8')).cases;
  } catch (err) {
    if (!err.offline || S.me.role !== 'driver') throw err;
    d = {}; cases = null; // Fahrer ohne Netz: Startseite mit zuletzt gespeicherten Fahrzeugdaten
  }
  let html = `<h1>${esc(t('welcome'))}, ${esc(S.me.display_name)}</h1>${outboxBanner()}`;
  if (S.me.role === 'driver') {
    html += `<a class="btn block" href="#/new" style="margin:8px 0 12px">${esc(t('report_damage'))}</a><a class="btn secondary block" href="#/check">${esc(t('departure_check'))}</a><a class="btn secondary block" href="#/emergency" id="emhome" style="margin-top:8px">☎ ${esc(t('em_title'))}</a><p style="margin-top:8px"><a href="#/help">${esc(t('help'))} ›</a></p>`;
    const mvKey = `cfp_myveh_${S.me.id}_${S.me.environment}`;
    let mv = null; let mvOffline = false;
    try { mv = (await api('GET', '/api/me/vehicles')).vehicles; try { localStorage.setItem(mvKey, JSON.stringify({ at: new Date().toISOString(), vehicles: mv })); } catch {} }
    catch { try { const c = JSON.parse(localStorage.getItem(mvKey) || 'null'); if (c) { mv = c.vehicles; mvOffline = c.at; } } catch {} }
    if (mvOffline || cases === null) html += `<div class="panel alert">${esc(t('offline_view'))}${mvOffline ? ` (${esc(t('as_of'))} ${fmtDT(mvOffline)})` : ''}</div>`;
    if (mv && mv.length) html += `<h2>${esc(t('my_vehicle'))}</h2>${mv.map((v) => `<section class="panel ${v.locked || v.coupled?.locked ? 'alert' : ''}"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${plate(v.plate, { locked: v.locked })}${coupledLockedChip(v.coupled)}${v.locked ? `<span class="chip kritisch">${esc(t('locked'))} – ${esc(t('do_not_drive'))}</span>` : v.open_cases_total ? `<span class="chip mittel">${v.open_cases_total} ${esc(t('open'))}</span>` : `<span class="chip ok">${esc(t('no_open_reports'))}</span>`}</div>
      ${(v.notes || []).filter((n) => !n.valid_until || n.valid_until >= bDate()).length ? `<div class="vnotes-drv" role="note">${v.notes.filter((n) => !n.valid_until || n.valid_until >= bDate()).map((n) => `<p><b>ⓘ ${esc(n.text)}</b> <span class="small muted">${fmtD(n.created_at)}${n.valid_until ? ' · ' + esc(t('vnote_until').replace('{d}', fmtD(n.valid_until))) : ''}</span></p>`).join('')}</div>` : ''}
      ${v.winter ? `<p class="small" role="note" data-drvwinter><b>❄ ${esc(t('drv_winter').replace('{p}', v.winter.noncompliant.join(', ')))}</b></p>` : ''}
      <dl class="kv" style="margin-top:8px">${v.trailer_plate ? `<dt>${esc(t('trailer'))}</dt><dd>${esc(v.trailer_plate)}</dd>` : ''}<dt>${esc(t('km'))}</dt><dd>${v.last_km ? `${fmtKm(v.last_km.km)} <span class="small muted">(${fmtD(v.last_km.measured_at)})</span>` : '–'}</dd>${myPlanned(v)}${v.next_inspections.map((r) => `<dt>${esc(mk(r.kind))}</dt><dd>${fmtD(r.next_due_date)}${r.next_due_date < bDate() ? ` <span class="chip kritisch">${esc(t('drv_overdue'))}</span>` : ''}${r.planned_date ? ` <span class="small">· ${esc(t('planned'))} ${fmtD(r.planned_date)}${r.planned_date === bDate() ? ' (' + esc(t('today')) + ')' : ''}</span>` : ''}</dd>`).join('')}${(v.km_due || []).map((r) => `<dt>${esc(mk(r.kind))}</dt><dd>${esc(t('due_at_km'))} ${fmtKm(r.next_due_km)}${r.km_remaining < 0 ? ` <span class="chip kritisch">${esc(t('drv_overdue'))}</span>` : ` <span class="small">(${esc(t('km_left'))} ${fmtKm(r.km_remaining)})</span>`}${r.planned_date ? ` <span class="small">· ${esc(t('planned'))} ${fmtD(r.planned_date)}${r.planned_date === bDate() ? ' (' + esc(t('today')) + ')' : ''}</span>` : ''}</dd>`).join('')}</dl>${knownDefects(v.known_defects)}</section>`).join('')}`;
    if (cases) html += `<h2>${esc(t('nav_cases'))}</h2>${caseList(cases, t('no_cases_driver'))}`;
  } else {
    if (d.vehicles) {
      const v = d.vehicles; const tot = Math.max(v.total, 1);
      const seg = [['gesperrt', v.gesperrt, 'var(--stop)'], ['werkstatt', v.werkstatt, 'var(--mid)'], ['meldung_offen', v.meldung_offen, 'var(--signal)'], ['einsatzbereit_lt_system', v.einsatzbereit, 'var(--go)']];
      html += `<section class="panel"><h2 style="margin-top:0">${esc(t('vehicles'))}: ${v.total}</h2>
        <div class="fleetbar" role="img" aria-label="${esc(t('fleet_state'))}">${seg.map(([, n, c]) => `<span style="width:${(n / tot) * 100}%;background:${c}"></span>`).join('')}</div>
        <div class="legend">${seg.map(([k, n, c]) => `<span><i style="background:${c}"></i>${esc(t('av_' + k))}: <b>${n}</b></span>`).join('')}</div></section>`;
    }
    html += `<div class="stats"><div><b>${d.open_cases}${d.open_cases_truncated ? '+' : ''}</b>${esc(t('open'))}</div><div><b style="color:var(--stop)">${d.critical}</b>${esc(t('prio_kritisch'))}</div><div><b>${d.locked}</b>${esc(t('locked'))}</div>
      ${S.me.role === 'workshop' ? `<div><b>${d.inbox}</b>${esc(t('act_acknowledge'))}</div><div><b>${d.in_progress}</b>${esc(t('st_in_reparatur'))}</div>` : ''}</div>`;
    if (d.findings && d.findings.length) {
      const n = d.findings.filter((f) => ['kritisch', 'handeln'].includes(f.severity)).reduce((s, f) => s + f.n, 0);
      if (n) html += `<a class="panel alert" style="display:block;text-decoration:none" href="#/master"><b>${esc(t('not_clear'))}</b>: ${n} ${esc(t('findings'))}</a>`;
    }
    if (S.me.role === 'workshop') html += await workshopBoard();
    else {
      if (isMgr()) html += await fleetTodo();
      if (S.me.role === 'dispatch') {
        // Standard-Standort aus „Mein Konto“: Tafel nur für diesen Standort – sichtbar vermerkt und jederzeit auf „alle“ umschaltbar
        const hs = S.me.home_site && !S.dispoAll ? S.me.home_site : '';
        const hq = hs ? encodeURIComponent(hs) : '';
        if (S.me.home_site) html += `<p class="small muted noprint" id="dsitebar">${esc(t('kpi_vsite'))}: <b>${esc(hs ? (hs === 'ohne' ? t('cs_nosite') : hs) : t('filter_all'))}</b> · <a href="#/" id="dsitetoggle">${esc(hs ? t('dispo_all_sites') : t('dispo_my_site'))}</a></p>`;
        const [dcs, dmo, dvs] = await Promise.all([cases === null ? [] : api('GET', '/api/cases?status=open&limit=500' + (hq ? '&vsite=' + hq : '')).then((r) => r.cases).catch(() => []), cases === null ? null : api('GET', '/api/maintenance' + (hq ? '?site=' + hq : '')).catch(() => null),
          cases === null ? [] : api('GET', '/api/vehicles').then((r) => r.vehicles).catch(() => [])]);
        html += dispoBoard(dcs, dmo && dmo.defects_without_case ? dmo.defects_without_case : [], new Map(dvs.filter((v) => v.coupled).map((v) => [v.id, v.coupled])));
        // Fahrzeuge mit aktiven Hinweisen (z. B. „Ladebordwand nur manuell“) – Link auf die gefilterte Fahrzeugliste; Standortregel wie oben
        const nk = (x) => (x && String(x).trim() ? String(x).trim().toLocaleLowerCase('de') : 'ohne');
        const wn = dvs.filter((v) => v.notes_active > 0 && (!hs || nk(v.site) === nk(hs === 'ohne' ? null : hs))).length;
        if (wn) html += `<p class="noprint"><a href="#/vehicles?f=with_notes" id="dnotes">${esc(t('vnotes_with_veh'))} (${wn})</a></p>`;
        if (cases !== null) html += await dispoWinter(hs);
        html += helpLink('dispo');
      }
      if (S.me.role === 'dispatch' && cases !== null) html += await dispoPlanned(S.me.home_site && !S.dispoAll ? S.me.home_site : '');
      // Disposition mit Standard-Standort: offene Vorgänge ebenfalls nur dieses Standorts (gleiche Regel wie Server: getrimmt, ohne Groß-/Kleinschreibung)
      const dk = (x) => (x && String(x).trim() ? String(x).trim().toLocaleLowerCase('de') : 'ohne');
      const shown = S.me.role === 'dispatch' && S.me.home_site && !S.dispoAll && cases ? cases.filter((c) => dk(c.vehicle_site) === dk(S.me.home_site === 'ohne' ? null : S.me.home_site)) : cases;
      html += `<h2>${esc(t('open'))}</h2>${caseList(shown)}<p><a href="#/cases">${esc(t('all'))}</a></p>`;
      if (S.me.role === 'viewer') html += helpLink('viewer');
    }
  }
  render(html, 'home');
  const dtg = $('#dsitetoggle'); if (dtg) dtg.onclick = (e) => { e.preventDefault(); S.dispoAll = !S.dispoAll; route(); };
}

// Disposition: nicht einplanbare Fahrzeuge (gesperrt / in Werkstatt / wartet auf Teile) mit Status und „seit“ – nur gespeicherte Angaben
// Prüfung mit gefährlichen Mängeln bzw. verkehrsunsicher, zu der noch kein Vorgang existiert (sonst greift die Sperre/der Auftrag oben)
const DISPO_DEFECTS = ['gefaehrliche_maengel', 'verkehrsunsicher'];
function dispoBoard(cs, defects = [], coupled = new Map()) {
  const insp = defects.filter((x) => DISPO_DEFECTS.includes(x.result)).sort((a, b) => (a.result === 'verkehrsunsicher' ? -1 : 0) - (b.result === 'verkehrsunsicher' ? -1 : 0) || a.plate.localeCompare(b.plate));
  const inspHtml = insp.length ? `<h2>${esc(t('dispo_insp_defects'))}</h2><div class="list">${insp.map((x) => `<a class="row p-kritisch" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('res_' + x.result))}${x.result === 'verkehrsunsicher' ? ' – ' + esc(t('do_not_drive')) : ''}</span><span class="chip kritisch">${esc(mk(x.kind))} ${fmtD(x.done_date)}</span><span class="sub">${esc(t('dispo_insp_hint'))}</span></a>`).join('')}</div>` : '';
  return inspHtml + dispoCases(cs, !!insp.length, coupled);
}
function dispoCases(cs, hasOther = false, coupled = new Map()) {
  const byV = new Map();
  const rank = (c) => (c.safety_lock ? 3 : c.status === 'wartet_teile' ? 2 : ['werkstatt_freigegeben', 'in_reparatur', 'abschlusskontrolle'].includes(c.status) ? 1 : 0);
  for (const c of cs) { const r = rank(c); if (!r) continue; const cur = byV.get(c.vehicle_id); if (!cur || r > cur.r) byV.set(c.vehicle_id, { r, c }); }
  const list = [...byV.values()].sort((a, b) => b.r - a.r || a.c.plate.localeCompare(b.c.plate));
  if (!list.length) return hasOther ? '' : `<section class="panel good"><b>${esc(t('dispo_all_ok'))}</b></section>`;
  return `<h2>${esc(t('dispo_not_plannable'))}</h2><div class="list">${list.map(({ r, c }) => `<a class="row ${r === 3 ? 'p-kritisch' : 'p-mittel'}" href="#/cases/${esc(c.id)}">${plate(c.plate, { locked: c.safety_lock })}<span class="title" style="white-space:normal">${esc(r === 3 ? t('locked') + ' – ' + t('do_not_drive') : t('st_' + c.status))}</span><span class="chip ${r === 3 ? 'kritisch' : 'mittel'}">${esc(t('since'))} ${fmtDT(r === 3 ? c.created_at : c.updated_at)}</span><span class="sub">${esc(c.case_no)}${coupled.has(c.vehicle_id) ? ` · <b>${esc(t(coupled.get(c.vehicle_id).kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(coupled.get(c.vehicle_id).plate)}</b>` : ''}${c.workshop_site ? ' · ' + esc(wsName(c.workshop_site)) : ''}${c.planned_date && c.status !== 'abschlusskontrolle' ? ' · ' + esc(t('planned_ws_short')) + ' ' + fmtD(c.planned_date) : ''}${partsEta(c)}</span></a>`).join('')}</div>`;
}

// Werkstatt-Startseite: Winterreifen-Arbeitsvorrat (gleiche Daten wie Disposition, Standort wie Reifen – Flotte); Sprung in die passenden Reiter
async function wsWinter(vsite = '') {
  const r = await api('GET', '/api/tires/winter' + (vsite ? '?site=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || (!r.totals.nicht_erfuellt && !r.totals.unbekannt)) return '';
  const rows = r.noncompliant.map((x) => `<a class="row p-mittel" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('winter_bad').replace('{p}', x.noncompliant.join(', ')))}</span><span class="chip mittel">${esc(t('ws_nicht_erfuellt'))}</span>${x.missing.length || x.open_order || x.closed_order ? `<span class="sub">${[x.missing.length && esc(t('winter_missing').replace('{p}', x.missing.join(', '))), x.open_order && `🔧 ${esc(t('mo_open'))} ${esc(x.open_order.case_no)}`, x.closed_order && `⚠ ${esc(t('wo_closed_short').replace('{no}', x.closed_order.case_no))}`].filter(Boolean).join(' · ')}</span>` : ''}</a>`).join('');
  return `<section id="wswinter"><h2>${esc(t('ws_winter'))}${r.totals.nicht_erfuellt ? ` <span class="chip">${r.totals.nicht_erfuellt}</span>` : ''}</h2><p class="small muted">${esc(t('ws_winter_hint'))}</p>${rows ? `<div class="list">${rows}</div><p class="small noprint"><a href="#/tires?f=winter_bad" id="wswbad">${esc(t('ws_winter_show'))} ›</a></p>` : ''}${r.noncompliant.some((x) => x.closed_order) ? `<p class="small noprint"><a href="#/tires?f=winter_closed" id="wswclosed">${esc(t('tires_winter_closed'))} ›</a></p>` : ''}${r.totals.unbekannt ? `<p class="small noprint"><a href="#/tires?f=winter_unknown" id="wswunk">${esc(t('ws_winter_unknown').replace('{n}', r.totals.unbekannt))} ›</a></p>` : ''}</section>`;
}

// Disposition: Lkw ohne ausreichende Winterkennzeichnung (laut Erfasstem) – nur Information, keine Sperre (situative Pflicht bei Glätte)
async function dispoWinter(vsite = '') {
  const r = await api('GET', '/api/tires/winter' + (vsite ? '?site=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || (!r.totals.nicht_erfuellt && !r.totals.unbekannt)) return '';
  const rows = r.noncompliant.map((x) => `<a class="row p-mittel" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('winter_bad').replace('{p}', x.noncompliant.join(', ')))}</span><span class="chip mittel">${esc(t('ws_nicht_erfuellt'))}</span>${x.missing.length || x.open_order || x.closed_order ? `<span class="sub">${[x.missing.length && esc(t('winter_missing').replace('{p}', x.missing.join(', '))), x.open_order && `🔧 ${esc(t('mo_open'))} ${esc(x.open_order.case_no)}`, x.closed_order && `⚠ ${esc(t('wo_closed_short').replace('{no}', x.closed_order.case_no))}`].filter(Boolean).join(' · ')}</span>` : ''}</a>`).join('');
  return `<section id="dwinter"><h2>${esc(t('dispo_winter'))}</h2>${rows ? `<div class="list">${rows}</div>` : ''}${r.totals.unbekannt ? `<p class="small">${esc(t('dispo_winter_unknown').replace('{n}', r.totals.unbekannt))}</p>` : ''}<p class="small muted">${esc(t('dispo_winter_hint'))}</p></section>`;
}

// Kennzeichnung „Winterreifen“ für Aufträge aus der Fahrzeugakte → Reifen (Beschreibung ist deutsch, das Etikett übersetzt)
function woTag(i) { return i.tire_order === 'winter' ? `<span class="chip mittel wotag">❄ ${esc(t('wo_tag'))}</span> ` : ''; }

// Unterzeile: Auftrag/Werkstatt und weitere geplante Tage desselben Fahrzeugs (Fahrzeug fällt dann mehrfach aus – Hinweis zum Zusammenlegen)
function dispoSub(i) {
  const parts = i.type === 'case' ? [esc(i.case_no), esc(wsName(i.workshop_site))] : [];
  if (i.other_dates && i.other_dates.length) parts.push(`<b>${esc(t('plan_other_dates'))}: ${i.other_dates.map(fmtD).join(', ')}</b>`);
  return parts.length ? `<span class="sub">${parts.join(' · ')}</span>` : '';
}

// Disposition: geplante Werkstatt- und Prüftermine der nächsten 7 Tage (aus dem Werkstattplan, nur gespeicherte Termine)
async function dispoPlanned(vsite = '') {
  const r = await api('GET', '/api/workshop/plan?days=7' + (vsite ? '&vsite=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || !r.days.length) return '';
  const rows = r.days.flatMap((d) => d.items.map((i) => `<a class="row ${i.type === 'case' ? 'p-' + esc(i.priority) : ''}" href="${i.type === 'case' ? '#/cases/' + esc(i.id) : '#/vehicles/' + encodeURIComponent(i.vehicle_id)}">${plate(i.plate, { locked: !!i.safety_lock })}<span class="title" style="white-space:normal">${i.type === 'case' ? woTag(i) + esc(t('planned_ws_short')) + ' · ' + esc(t('st_' + i.status)) : esc(t('planned_inspection')) + ': ' + esc(mk(i.kind))}</span><span class="chip${d.date === r.today ? ' ok' : ''}">${d.date === r.today ? esc(t('today')) : fmtD(d.date)}</span>${dispoSub(i)}</a>`));
  return `<h2>${esc(t('dispo_planned'))}</h2><p class="small muted">${esc(t('dispo_planned_hint'))}</p><div class="list">${rows.join('')}</div><p><a href="#/plan">${esc(t('wplan'))}</a></p>`;
}

// Fuhrparkleitung: „Heute zu tun“ – nur aus gespeicherten Daten, mit direkten Links
async function fleetTodo() {
  const [cs, ov, fs, tc, dr, ct, cl, wi, af] = await Promise.all([
    api('GET', '/api/cases?status=open&limit=500').then((r) => r.cases).catch(() => []),
    api('GET', '/api/maintenance').catch(() => null),
    api('GET', '/api/fines?status=open').then((r) => r.fines).catch(() => []),
    isMgr() ? api('GET', '/api/tacho').catch(() => null) : null,
    isMgr() ? api('GET', '/api/drivers').then((r) => r.drivers).catch(() => []) : [],
    isMgr() ? api('GET', '/api/contracts?filter=aktion').then((r) => r.contracts).catch(() => []) : [],
    isMgr() ? api('GET', '/api/claims?filter=offen').then((r) => r.claims.filter((c) => c.followup_due)).catch(() => []) : [],
    // Lkw ohne Alpine-Symbol laut Erfassung – Entscheidung zur Umrüstung liegt bei der Fuhrparkleitung (nur Information, keine Sperre)
    isMgr() ? api('GET', '/api/tires/winter').then((r) => r.noncompliant).catch(() => []) : [],
    // Fahrzeuge mit kritischen offenen Agentenbefunden (Felder nur für Inhaber/Fuhrparkleitung, Umgebung der Person)
    isMgr() ? api('GET', '/api/vehicles').then((r) => r.vehicles.filter((v) => v.agent_findings_critical > 0)).catch(() => []) : [],
  ]);
  af.sort((a, b) => b.agent_findings_critical - a.agent_findings_critical || b.agent_findings_open - a.agent_findings_open || String(a.plate).localeCompare(String(b.plate), 'de'));
  const today = bDate();
  const in7 = bDate(7);
  const groups = [
    ['todo_receive', cs.filter((c) => c.status === 'gemeldet' && !c.fleet_received_at), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}`, 'kritisch'],
    ['todo_vfind_crit', af, (v) => `#/vehicles/${encodeURIComponent(v.id)}`, (v) => `${v.plate} · ${t('vfind_crit').replace('{n}', v.agent_findings_critical)} · ${t('vfind_n').replace('{n}', v.agent_findings_open)}`, 'kritisch'],
    ['todo_followup', cs.filter((c) => c.followup_on && c.followup_on <= today), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${fmtD(c.followup_on)}${c.followup_note ? ' · ' + c.followup_note : ''}`, 'mittel'],
    ['todo_repeat', cs.filter(recentRepeat), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${fmtD(c.last_repeat_at)}`, 'mittel'],
    ['todo_cost_approval', cs.filter((c) => c.cost_over_limit_at), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''} · ${fmtD(c.cost_over_limit_at)}`, 'mittel'],
    ['todo_qc', cs.filter((c) => c.status === 'abschlusskontrolle'), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}`, 'mittel'],
    ['todo_plan_passed', cs.filter((c) => c.status === 'werkstatt_freigegeben' && c.planned_date && c.planned_date < today), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${fmtD(c.planned_date)}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''}`, 'mittel'],
    ['todo_parts_passed', cs.filter((c) => c.status === 'wartet_teile' && c.parts_expected_date && c.parts_expected_date < today), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${t('parts_eta')} ${fmtD(c.parts_expected_date)}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''}`, 'mittel'],
    ['todo_parts', cs.filter((c) => c.status === 'wartet_teile' && !(c.parts_expected_date && c.parts_expected_date < today)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}${c.parts_expected_date ? ' · ' + t('parts_eta') + ' ' + fmtD(c.parts_expected_date) : ''}`, ''],
    ['todo_defects_no_case', ov && ov.defects_without_case ? ov.defects_without_case : [], (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}`, (x) => `${x.plate} · ${mk(x.kind)} ${fmtD(x.done_date)} · ${t('res_' + x.result)}`, 'kritisch'],
    ['todo_reinspection', ov && ov.reinspection_pending ? ov.reinspection_pending : [], (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}`, (x) => `${x.plate} · ${mk(x.kind)} ${fmtD(x.done_date)} · ${t('res_' + x.result)} · ${x.case_no} ${t('released_short')} ${fmtD(x.closed_at)}`, 'mittel'],
    ['todo_result_missing', ov && ov.result_missing ? ov.result_missing : [], (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}?ev=${encodeURIComponent(x.id)}`, (x) => `${x.plate} · ${mk(x.kind)} ${fmtD(x.done_date)}`, ''],
    ['todo_maint_unrecorded', ov ? ov.rows.filter((r) => r.unrecorded_order) : [], (r) => `#/vehicles/${encodeURIComponent(r.vehicle_id)}`, (r) => `${r.plate} · ${mk(r.kind)} · ${r.unrecorded_order.case_no} ${t('released_short')} ${fmtD(r.unrecorded_order.closed_at)}`, 'mittel'],
    ['todo_inspections', ov ? ov.rows.filter((r) => r.status === 'ueberfaellig' || (r.next_due_date && r.next_due_date <= in7)) : [], (r) => `#/vehicles/${encodeURIComponent(r.vehicle_id)}`, (r) => `${r.plate} · ${mk(r.kind)} · ${r.km_status === 'ueberfaellig' ? `${t('due_at_km')} ${fmtKm(r.next_due_km)} (${t('km_over')} ${fmtKm(-r.km_remaining)})` : r.next_due_date ? fmtD(r.next_due_date) : (r.next_due_km ? fmtKm(r.next_due_km) : '')} · ${r.planned_date && r.planned_date >= today ? t('planned') + ' ' + fmtD(r.planned_date) : t('no_planned_date')}`, 'mittel'],
    ['todo_tacho', tc ? [...tc.drivers.map((x) => ({ ...x, label: x.display_name, href: '#/drivers/' + x.id })), ...tc.vehicles.map((x) => ({ ...x, label: x.plate, href: '#/tacho' }))].filter((x) => x.status === 'ueberfaellig' || x.status === 'bald') : [], (x) => x.href, (x) => `${x.label} · ${fmtD(x.due)}${x.status === 'ueberfaellig' ? ' !' : ''}`, 'mittel'],
    ['todo_driver_docs', dr.filter((d) => d.status.overall === 'kritisch'), (d) => `#/drivers/${d.id}`, (d) => `${d.display_name} · ${[...d.status.items.filter((i) => i.status === 'abgelaufen').map((i) => t('dk2_' + i.kind)), d.status.check.status === 'mangel' ? t('license_check') : ''].filter(Boolean).join(', ')}`, 'kritisch'],
    ['todo_contracts', ct.filter((c) => (c.status.end && (c.status.end.status === 'abgelaufen' || c.end_date <= in7)) || (c.status.notice && c.status.notice.status === 'bald' && c.status.notice.by <= in7)), (c) => `#/vehicles/${encodeURIComponent(c.vehicle_id)}`,
      (c) => `${c.plate} · ${t('ck_' + c.kind)} · ${c.status.notice && c.status.notice.status === 'bald' && c.status.notice.by <= in7 ? t('ct_notice_by') + ' ' + fmtD(c.status.notice.by) : t('ct_end') + ' ' + fmtD(c.end_date)}${c.end_date < today ? ' !' : ''}`, 'mittel'],
    ['todo_claims', cl, (c) => `#/cases/${c.case_id}`, (c) => `${c.case_no} · ${c.plate} · ${c.insurer} · ${t('claim_days_open').replace('{n}', c.days_open)}`, ''],
    ['todo_winter', wi, (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}`, (x) => `${x.plate} · ${t('winter_bad').replace('{p}', x.noncompliant.join(', '))}${x.open_order ? ` · 🔧 ${t('mo_open')} ${x.open_order.case_no}` : ''}${x.closed_order ? ` · ⚠ ${t('wo_closed_short').replace('{no}', x.closed_order.case_no)}` : ''}`, ''],
    ['todo_fines', fs.filter((f) => f.response_due && f.response_due <= in7), (f) => `#/fines/${f.id}`, (f) => `${f.fine_no} · ${f.plate || f.plate_in_letter} · ${fmtD(f.response_due)}${f.response_due < today ? ' !' : ''}`, 'mittel'],
  ].filter(([, list]) => list.length);
  if (!groups.length) return `<section class="panel good"><b>${esc(t('todo_none'))}</b></section>`;
  return `<h2>${esc(t('todo_today'))}</h2>${groups.map(([k, list, href, label, cls]) => `<details class="panel"${cls === 'kritisch' ? ' open' : ''}><summary><b>${esc(t(k))}</b> <span class="chip ${cls}">${list.length}</span></summary><div class="list" style="margin-top:8px">${list.slice(0, 8).map((x) => `<a class="row" href="${href(x)}"><span class="title" style="white-space:normal">${esc(label(x))}</span></a>`).join('')}</div>${list.length > 8 ? `<p class="small muted">+${list.length - 8}</p>` : ''}${k === 'todo_vfind_crit' ? `<p class="small"><a href="#/vehicles?f=with_findings" id="todovfind">${esc(t('show_in_vlist'))} ›</a> · <a href="#/master">${esc(t('nav_master'))} ›</a></p>` : ''}${k === 'todo_repeat' ? `<p class="small"><a href="#/cases?f=repeat">${esc(t('show_in_list'))} ›</a></p>` : ''}${k === 'todo_plan_passed' ? `<p class="small"><a href="#/plan">${esc(t('wplan'))} ›</a></p>` : ''}${k === 'todo_inspections' ? `<p class="small"><a href="#/plan?s=mdue">${esc(t('wplan'))}: ${esc(t('wplan_mdue'))} ›</a></p>` : ''}${k === 'todo_winter' ? `<p class="small"><a href="#/tires?f=winter_bad" id="todowinter">${esc(t('ws_winter_show'))} ›</a></p>${list.some((x) => x.closed_order) ? `<p class="small"><a href="#/tires?f=winter_closed" id="todowclosed">${esc(t('tires_winter_closed'))} ›</a></p>` : ''}` : ''}${k === 'todo_result_missing' ? `<p class="small"><a href="#/quality?f=inspection_no_result">${esc(t('show_in_dq'))} ›</a></p>` : ''}</details>`).join('')}`;
}

const recentRepeat = (c) => c.last_repeat_at && Date.now() - Date.parse(c.last_repeat_at) < 3 * 86400000;
function caseList(list, empty) {
  if (!list.length) return `<p class="muted">${esc(empty || t('no_cases'))}</p>`;
  return `<div class="list">${list.map((c) => `<a class="row p-${esc(c.priority)}" href="#/cases/${esc(c.id)}">
    ${plate(c.plate, { locked: c.safety_lock })}
    <span class="title">${woTag(c)}${esc(c.description)}</span>
    <span class="chip ${esc(c.status === 'fahrzeug_freigegeben' ? 'ok' : c.priority)}">${esc(t('st_' + c.status))}</span>
    <span class="sub">${esc(c.case_no)} · ${esc(t('prio_' + c.priority))}${c.safety_lock ? ' · ' + esc(t('locked')) : ''}${c.access === 'preview' ? ' · ' + esc(t('preview_hint')) : ''}${c.planned_date && ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'].includes(c.status) ? ` · <b>${esc(t('planned'))} ${fmtD(c.planned_date)}</b>` : ''} · ${fmtDT(c.updated_at)}${recentRepeat(c) ? ` · <b>${esc(t('act_repeat_finding'))} ${fmtDT(c.last_repeat_at)}</b>` : ''}${partsEta(c)}${c.cost_over_limit_at ? ` · <span class="chip mittel">${esc(t('cost_approval_pending'))}</span>` : ''}${c.maintenance_event_id ? ` · <b>${esc(t('md_case'))}</b>` : ''}${c.duplicate_of_no ? ` · ${esc(t('dup_of'))} ${esc(c.duplicate_of_no)}` : ''}${c.followup_on && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) ? ` · <span class="chip${c.followup_on <= bDate() ? ' mittel' : ''}">${esc(t('followup'))} ${fmtD(c.followup_on)}</span>` : ''}</span></a>`).join('')}</div>`;
}

// Filter der Vorgangsliste: offen/abgeschlossen/alle bzw. „Mangel erneut festgestellt“ (offen, letzte 3 Tage)
const caseFilterQ = (f) => (f === 'repeat' ? 'status=open&repeat_days=3' : f === 'warranty' ? 'status=open&warranty=1' : f === 'stale' ? 'status=open&stale=1' : f === 'followup' ? 'status=open&followup=1' : `status=${f === 'all' ? '' : f}`);
async function viewCases() {
  const hf = new URLSearchParams(location.hash.split('?')[1] || '').get('f');
  if (hf) try { sessionStorage.setItem('cfp_cf', hf); } catch {}
  let f = hf || sessionStorage.getItem('cfp_cf') || 'open';
  if (!['open', 'closed', 'all', 'repeat', 'warranty', 'stale', 'followup'].includes(f) || (['repeat', 'warranty', 'stale'].includes(f) && S.me.role === 'driver') || (f === 'followup' && ['driver', 'workshop'].includes(S.me.role))) f = 'open';
  const q = S.caseQ || '';
  const vq = () => (vsDef('caseVsite') && S.me.role !== 'driver' ? '&vsite=' + encodeURIComponent(vsDef('caseVsite')) : '');
  const lq = () => (S.caseLimit ? '&limit=' + S.caseLimit : '') + sq();
  if (!S.caseSort) S.caseSort = sortPref('cases', CASE_SORTS, 'priority');
  const sq = () => (S.caseSort && S.caseSort !== 'priority' && f !== 'followup' ? '&sort=' + S.caseSort : '');
  // Liste ist begrenzt (Server: 200, „weitere laden“ bis 500) – sonst fehlten ältere Vorgänge ohne Hinweis
  const trunc = (r) => (r.truncated ? `<p class="small muted">${esc(t('list_truncated').replace('{n}', r.limit))}${r.limit < 500 ? ` <button type="button" class="btn secondary" id="cmore">${esc(t('cases_upto500'))}</button>` : ''}</p>` : '');
  const bindMore = () => { const b = $('#cmore'); if (b) b.onclick = () => { S.caseLimit = 500; viewCases(); }; };
  const res = await api('GET', `/api/cases?${caseFilterQ(f)}${q.length >= 2 ? '&q=' + encodeURIComponent(q) : ''}${vq()}${lq()}`);
  // Ausdruck: gewählte Auswahl, Suche, Standort, Sortierung und Anzahl im Kopf (wie Prüftermine)
  const fLabel = t(f === 'repeat' ? 'filter_repeat' : f === 'warranty' ? 'filter_warranty' : f === 'stale' ? 'filter_stale' : f === 'followup' ? 'filter_followup' : f);
  const cPrint = (l, qq) => printHead([`${t('print_filter')}: ${fLabel}`, qq && qq.length >= 2 ? `${t('print_search')}: „${qq}“` : '',
    res.site ? `${t('kpi_vsite')}: ${res.site === 'ohne' ? t('cs_nosite') : res.site}` : '', f !== 'followup' && S.me.role !== 'driver' ? `${t('sort_by')}: ${t('csort_' + (S.caseSort || 'priority'))}` : '', t('print_count').replace('{n}', l.length)]);
  const list = f === 'followup' ? res.cases.slice().sort((x, y) => (x.followup_on < y.followup_on ? -1 : x.followup_on > y.followup_on ? 1 : 0)) : res.cases;
  const vsel = S.me.role !== 'driver' && ((res.site_options || []).length > 1 || res.site) ? `<div class="noprint" style="margin-bottom:12px">${siteSelect('cvsite', '', res.site_options, res.site, t('kpi_vsite'), t('filter_all'))}</div>` : '';
  render(`<h1>${esc(t('nav_cases'))}</h1>
    <input id="cq" class="noprint" type="search" value="${esc(q)}" placeholder="${esc(t('case_search'))}" aria-label="${esc(t('case_search'))}" style="margin-bottom:12px" autocomplete="off">${vsel}
    <div class="seg-tabs noprint">${['open', 'closed', 'all', ...(S.me.role === 'driver' ? [] : ['repeat', 'warranty', ...(res.stale_days || f === 'stale' ? ['stale'] : []), ...(S.me.role === 'workshop' ? [] : ['followup'])])].map((k) => `<a href="#/cases" data-f="${k}" class="${k === f ? 'on' : ''}">${esc(t(k === 'repeat' ? 'filter_repeat' : k === 'warranty' ? 'filter_warranty' : k === 'stale' ? 'filter_stale' : k === 'followup' ? 'filter_followup' : k))}</a>`).join('')}</div>${f === 'stale' ? `<p class="small muted">${esc(res.stale_days ? t('filter_stale_hint').replace('{n}', res.stale_days) : t('filter_stale_off'))}</p>` : ''}
    ${f !== 'followup' ? `<select id="csort" class="noprint" aria-label="${esc(t('sort_by'))}" style="max-width:420px;margin-bottom:12px">${CASE_SORTS.map((k) => `<option value="${k}"${(S.caseSort || 'priority') === k ? ' selected' : ''}>${esc(t('sort_by'))}: ${esc(t('csort_' + k))}</option>`).join('')}</select>` : ''}
    <div id="cl">${cPrint(list, q)}${caseList(list)}${trunc(res)}</div>
    <div class="actions">${S.me.role !== 'driver' ? `<button type="button" class="btn secondary" id="ccsv">${esc(t('export_csv'))}</button>${f === 'followup' ? `<button type="button" class="btn secondary" id="cics">${esc(t('followup_ics'))}</button>` : ''}` : ''}<button type="button" class="btn secondary" id="cprl">${esc(t('print'))}</button></div>`, 'cases');
  $('#cprl').onclick = () => window.print();
  const ci = $('#cics'); if (ci) ci.onclick = async () => { try { download(await api('GET', `/api/cases?format=ics${vq()}`), `fuhrpark-wiedervorlagen_${bDate()}.ics`); } catch (err) { toast(err.message, true); } };
  const cc = $('#ccsv'); if (cc) cc.onclick = async () => { try { const blob = await api('GET', `/api/cases?format=csv&${caseFilterQ(f)}${(S.caseQ || '').length >= 2 ? '&q=' + encodeURIComponent(S.caseQ) : ''}${vq()}${sq()}`); download(blob, `fuhrpark-vorgaenge_${bDate()}.csv`); if (blob.cfpTruncated) toast(t('csv_truncated').replace('{n}', blob.cfpTruncated), true); } catch (err) { toast(err.message, true); } };
  $$('.seg-tabs a').forEach((a) => (a.onclick = (e) => { e.preventDefault(); sessionStorage.setItem('cfp_cf', a.dataset.f); S.caseLimit = null; viewCases(); }));
  const cvs = $('#cvsite'); if (cvs) cvs.onchange = () => { S.caseVsite = cvs.value; S.caseLimit = null; viewCases(); };
  const cso = $('#csort'); if (cso) cso.onchange = () => { S.caseSort = sortPref('cases', CASE_SORTS, 'priority', CASE_SORTS.includes(cso.value) ? cso.value : 'priority'); viewCases(); };
  bindMore();
  let timer = null;
  const cq = $('#cq');
  cq.oninput = () => { clearTimeout(timer); timer = setTimeout(async () => {
    S.caseQ = cq.value.trim();
    try { const r = await api('GET', `/api/cases?${caseFilterQ(f)}${S.caseQ.length >= 2 ? '&q=' + encodeURIComponent(S.caseQ) : ''}${vq()}${lq()}`); const l2 = f === 'followup' ? r.cases.slice().sort((x, y) => (x.followup_on < y.followup_on ? -1 : x.followup_on > y.followup_on ? 1 : 0)) : r.cases; $('#cl').innerHTML = cPrint(l2, S.caseQ) + caseList(l2) + trunc(r); bindMore(); } catch (err) { toast(err.message, true); }
  }, 300); };
}

// Kopfzeile für Ausdrucke von Listen: Zeitpunkt, Person, gewählte Auswahl (leere Teile entfallen)
function printHead(parts) {
  return `<p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)}${parts.filter(Boolean).map((x) => ' · ' + esc(x)).join('')} · CEVIK ${esc(t('app'))} [CLAUDE]</p>`;
}

// ---------- Offline-Ausgang für Schadensmeldungen (Funkloch) ----------
// Meldungen werden nur auf diesem Gerät für genau diesen Benutzer/diese Umgebung zwischengespeichert und mit demselben
// request_key gesendet, sobald wieder Verbindung besteht – der Server legt sie dadurch höchstens einmal an.
const outboxKey = () => `cfp_outbox_${S.me.id}_${S.me.environment}`;
function outboxGet() { try { return JSON.parse(localStorage.getItem(outboxKey()) || '[]'); } catch { return []; } }
function outboxSet(list) { try { localStorage.setItem(outboxKey(), JSON.stringify(list)); } catch {} }
// Fotos für den Offline-Ausgang in IndexedDB (Blobs; localStorage wäre zu klein)
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('cfp_outbox', 1); r.onupgradeneeded = () => r.result.createObjectStore('photos'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbDo(mode, fn) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('photos', mode); const st = tx.objectStore('photos'); const out = fn(st); tx.oncomplete = () => res(out && 'result' in out ? out.result : undefined); tx.onerror = () => rej(tx.error); }); }
const photosPut = (key, list) => idbDo('readwrite', (st) => st.put(list, key));
const photosGet = (key) => idbDo('readonly', (st) => st.get(key));
const photosDel = (key) => idbDo('readwrite', (st) => st.delete(key));
async function uploadCasePhotos(caseId, list) {
  let failed = 0;
  for (const p of list) { try { await api('POST', `/api/cases/${caseId}/files`, p.blob, { headers: { 'x-filename': encodeURIComponent(p.name), 'content-type': p.blob.type || 'application/octet-stream' } }); } catch (err) { if (err.offline) throw err; failed++; } }
  return failed;
}
let flushing = false;
async function flushOutbox() {
  if (!S.me || flushing) return;
  const list = outboxGet(); if (!list.length) return;
  flushing = true;
  const rest = [];
  try {
    for (const item of list) {
      try {
        const r = await api('POST', item.path || '/api/cases', item.body);
        let failed = 0;
        if (item.photos) {
          const list = await photosGet(item.body.request_key).catch(() => null);
          const target = r.id || (r.followups && r.followups[0] && r.followups[0].id); // Meldung bzw. Folgeauftrag der Abfahrtskontrolle
          if (list && list.length && target) failed = await uploadCasePhotos(target, list);
          await photosDel(item.body.request_key).catch(() => {});
        }
        toast(item.path === '/api/inspections' ? `${t('check_saved')}${failed ? ' · ' + t('photos_failed').replace('{n}', failed) : ''}` : `${t('report_sent')}: ${r.case_no}${failed ? ' · ' + t('photos_failed').replace('{n}', failed) : ''}`, !!failed);
      }
      catch (err) { if (err.offline) { rest.push(item); continue; } toast(`${t('outbox_failed')}: ${err.message}`, true); }
    }
  } finally { outboxSet(rest); flushing = false; }
  const b = document.getElementById('outbox'); if (b && !rest.length) b.remove();
}
window.addEventListener('online', () => flushOutbox());
function outboxBanner() {
  const n = S.me ? outboxGet().length : 0;
  return n ? `<div class="panel alert" id="outbox" role="status">${esc(t('outbox_pending').replace('{n}', n))}</div>` : '';
}

async function vehiclesCached() {
  const vkey = `cfp_veh_${S.me.id}_${S.me.environment}`;
  try { const vs = (await api('GET', '/api/vehicles')).vehicles; try { localStorage.setItem(vkey, JSON.stringify(vs.map((v) => ({ id: v.id, plate: v.plate, kind: v.kind, site: v.site, assigned: v.assigned, availability: v.availability, coupled: v.coupled || null })))); } catch {} return vs; }
  catch (err) { if (!err.offline) throw err; let vs = null; try { vs = JSON.parse(localStorage.getItem(vkey) || 'null'); } catch {} if (!vs) throw err; return vs; }
}
function outboxAdd(path, body, photos = 0) { const list = outboxGet(); if (!list.some((x) => x.body.request_key === body.request_key)) list.push({ path, body, photos, saved_at: new Date().toISOString() }); outboxSet(list); }

// ---------- Neue Meldung ----------
async function viewNew(preId) {
  const vs = await vehiclesCached();
  const mine = vs.filter((v) => v.assigned);
  const others = vs.filter((v) => !v.assigned);
  const pick = (arr) => `<div class="vehpick">${arr.map((v) => `<label><input type="radio" name="veh" value="${esc(v.id)}" required>${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="small muted">${v.kind === 'anhaenger' ? esc(t('vk_anhaenger')) + ' · ' : ''}${esc(v.site || '')}</span></label>`).join('')}</div>`;
  const ws = S.meta.workshops;
  render(`<h1>${esc(t('report_damage'))}</h1>${outboxBanner()}${helpLink('report')}<form id="f" novalidate>
    <label for="vq">${esc(t('choose_vehicle'))}</label><input id="vq" placeholder="SZ-…" autocomplete="off" style="margin-bottom:8px">
    ${mine.length ? `<h3>${esc(t('my_vehicles'))}</h3>${pick(mine)}<details><summary>${esc(t('other_vehicles'))}</summary>${pick(others)}</details>` : pick(vs)}
    <div id="known"></div><label for="d">${esc(t('what_wrong'))}<span class="hint">${esc(t('what_wrong_hint'))}</span></label><textarea id="d" required minlength="5" maxlength="4000"></textarea>
    <div id="acc" class="panel" hidden role="status"><b>${esc(t('acc_title'))}</b><ul class="small" style="margin:6px 0 0;padding-left:18px">${t('acc_steps').split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <label>${esc(t('urgency'))}</label><div class="choices">${['niedrig', 'mittel', 'kritisch'].map((p, i) => `<label class="choice c-${p}"><input type="radio" name="prio" value="${p}"${i === 0 ? ' checked' : ''}><span><b>${esc(t('prio_' + p))}</b><span class="small muted">${esc(t('prio_' + p + '_d'))}</span></span></label>`).join('')}</div>
    <label>${esc(t('driveable'))}</label><div class="choices">${['fahrbereit', 'eingeschraenkt', 'nicht_fahrbereit', 'unbekannt'].map((p) => `<label class="choice${p === 'nicht_fahrbereit' ? ' c-kritisch' : ''}"><input type="radio" name="drv" value="${p}"${p === 'unbekannt' ? ' checked' : ''}><b>${esc(t('drv_' + p))}</b></label>`).join('')}</div>
    <label for="w">${esc(t('workshop'))}</label><select id="w"><option value="">–</option>${ws.map((w) => `<option value="${esc(w.code)}">${esc(w.name)}</option>`).join('')}</select>
    <label for="l">${esc(t('location'))}</label><input id="l" maxlength="300">
    <label for="ph">${esc(t('photos_now'))}<span class="hint">${esc(t('photos_now_hint'))}</span></label><input type="file" id="ph" accept="image/jpeg,image/png,image/webp" multiple>
    <div class="actions"><button class="btn block" id="sb">${esc(t('send_report'))}</button></div></form>`, 'new');
  // Genau ein zugeordnetes Fahrzeug: vorauswählen (Fahrer kann jederzeit ein anderes wählen)
  if (mine.length === 1) { const r = $(`input[name=veh][value="${CSS.escape(mine[0].id)}"]`); if (r) r.checked = true; }
  // Aufruf über Fahrzeug-QR-Aufkleber: dieses Fahrzeug vorauswählen
  if (preId) { const r = $(`input[name=veh][value="${CSS.escape(preId)}"]`); if (r) { r.checked = true; const det = r.closest('details'); if (det) det.open = true; r.closest('label').scrollIntoView({ block: 'center' }); } else toast(t('qr_vehicle_unknown'), true); }
  // Bekannte Mängel des gewählten (eigenen) Fahrzeugs anzeigen, damit nichts doppelt gemeldet wird
  if (S.me.role === 'driver' && mine.length) {
    let known = null;
    const showKnown = () => { const sel = $('input[name=veh]:checked'); const box = $('#known'); if (!box) return; const v = known && sel && known.find((x) => x.id === sel.value); box.innerHTML = v ? coupledAlert(v.coupled) + knownDefects(v.known_defects) : ''; };
    api('GET', '/api/me/vehicles').then((r) => { known = r.vehicles; showKnown(); }).catch(() => {});
    $$('input[name=veh]').forEach((r) => r.addEventListener('change', showKnown));
  }
  // Beschreibung nennt einen Unfall: kurze Hinweise für vollständige Unterlagen (Fotos, Unfallstelle, Fuhrparkleitung informieren)
  const ACC = /unfall|accident|дтп|авар/i;
  $('#d').addEventListener('input', () => { $('#acc').hidden = !ACC.test($('#d').value); });
  photoLimitWatch($('#ph'));
  const key = uid();
  $('#vq').oninput = () => { const q = $('#vq').value.toLowerCase().replace(/[\s-]/g, ''); $$('.vehpick label').forEach((l) => (l.hidden = q && !l.textContent.toLowerCase().replace(/[\s-]/g, '').includes(q))); if (q) $$('details').forEach((d) => (d.open = true)); };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const veh = $('input[name=veh]:checked');
    // Prüfung in der App-Sprache (Browser-Meldungen wären in der Gerätesprache)
    if (!veh) { toast(t('choose_vehicle'), true); $('#vq').focus(); return; }
    if ($('#d').value.trim().length < 5) { toast(t('desc_too_short'), true); $('#d').focus(); return; }
    $('#sb').disabled = true;
    const body = { vehicle_id: veh.value, description: $('#d').value, priority: $('input[name=prio]:checked').value,
      driveability: $('input[name=drv]:checked').value, workshop_site: $('#w').value || null, location_note: $('#l').value || null, request_key: key };
    try {
      const r = await api('POST', '/api/cases', body);
      const files = [...($('#ph').files || [])].slice(0, PHOTO_MAX);
      let failed = 0;
      for (const [i, file] of files.entries()) {
        $('#sb').textContent = `${t('uploading')} ${i + 1}/${files.length}`;
        try { failed += await uploadCasePhotos(r.id, [{ blob: await prepareUpload(file), name: file.name }]); } catch { failed++; }
      }
      toast(`${t('report_sent')}: ${r.case_no}${failed ? ' · ' + t('photos_failed').replace('{n}', failed) : ''}`, !!failed);
      location.hash = '#/cases/' + r.id;
    } catch (err) {
      if (err.offline) {
        const files = [...($('#ph').files || [])].slice(0, PHOTO_MAX);
        let stored = 0;
        if (files.length) { try { const list = []; for (const f of files) list.push({ blob: await prepareUpload(f), name: f.name }); await photosPut(key, list); stored = list.length; } catch {} }
        outboxAdd('/api/cases', body, stored);
        render(`<h1>${esc(t('report_damage'))}</h1><div class="panel alert" role="alert"><p><b>${esc(t('outbox_saved'))}</b></p>${files.length && !stored ? `<p>${esc(t('photos_offline'))}</p>` : stored ? `<p>${esc(t('photos_stored').replace('{n}', stored))}</p>` : ''}${body.priority === 'kritisch' || body.driveability === 'nicht_fahrbereit' ? `<p><b>${esc(t('outbox_call'))}</b></p>` : ''}</div><div class="actions"><a class="btn secondary" href="#/">${esc(t('back'))}</a></div>`, 'new');
        return;
      }
      toast(err.message, true); $('#sb').disabled = false;
    }
  };
}

// Geplanter Werkstatttermin/Prüftermin am eigenen Fahrzeug (nur gespeicherte Termine, ab heute)
function myPlanned(v) {
  let h = '';
  if (v.planned_workshop_date) h += `<dt>${esc(t('planned_ws_short'))}</dt><dd><b>${fmtD(v.planned_workshop_date)}</b>${v.planned_workshop_date === bDate() ? ' (' + esc(t('today')) + ')' : ''} <span class="small muted">${esc(t('my_ws_hint'))}</span></dd>`;
  const pi = v.planned_inspection;
  if (pi && ![...(v.next_inspections || []), ...(v.km_due || [])].some((r) => r.kind === pi.kind && r.planned_date)) h += `<dt>${esc(mk(pi.kind))}</dt><dd>${esc(t('planned'))} ${fmtD(pi.planned_date)}${pi.planned_date === bDate() ? ' (' + esc(t('today')) + ')' : ''}</dd>`;
  return h;
}

// Bekannte (offene) Mängel am eigenen Fahrzeug – Fahrer sieht, was schon gemeldet ist (ohne Namen); eigene Meldungen verlinkt
function knownDefects(list) {
  if (!list || !list.length) return '';
  return `<details class="known"${list.length <= 3 ? ' open' : ''}><summary>${esc(t('known_defects'))} (${list.length})</summary><ul class="small">${list.map((k) => {
    const txt = `${k.check_item ? checkLabel(k.check_item) + ': ' : ''}${k.description.replace(/^\[Kontrolle [^\]]*\]\s*[a-z_]+:\s*/, '')}`;
    return `<li><span class="chip ${esc(k.priority)}">${esc(t('prio_' + k.priority))}</span> ${k.id ? `<a href="#/cases/${esc(k.id)}">${esc(txt)}</a>` : esc(txt)} <span class="muted">· ${esc(t('st_' + k.status))} · ${fmtD(k.created_at)}${k.planned_date ? ' · ' + esc(t('planned_ws_short')) + ' ' + fmtD(k.planned_date) : ''}${k.parts_expected_date ? ' · ' + esc(t('parts_eta')) + ' ' + fmtD(k.parts_expected_date) : ''}</span></li>`; }).join('')}</ul></details>`;
}

// ---------- Vorgang ----------
async function viewCase(id) {
  const d = await api('GET', '/api/cases/' + id);
  const c = d.case;
  const A = d.allowed_actions;
  const prioLine = c.reported_priority !== c.priority ? ` <span class="muted small">(${esc(t('reported_prio'))}: ${esc(t('prio_' + c.reported_priority))})</span>` : '';
  let html = `<p class="noprint"><a href="#/cases">‹ ${esc(t('back'))}</a></p>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${plate(d.vehicle.plate, { big: true, locked: c.safety_lock })}<span class="chip ${c.status === 'fahrzeug_freigegeben' ? 'ok' : esc(c.priority)}">${esc(t('st_' + c.status))}</span>${c.environment === 'test' ? '<span class="chip test">TEST</span>' : ''}</div>
    <h1 style="margin-top:12px">${esc(c.case_no)}</h1>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="actions noprint"><button type="button" class="btn secondary" id="cprt">${esc(t('print'))}</button></div>
    ${c.safety_lock ? `<div class="panel alert"><b>${esc(t('locked'))}</b> – ${esc(translateLockReason(S.lang, c.safety_lock_reason || ''))}</div>` : ''}
    ${d.access === 'preview' ? `<div class="panel">${esc(t('preview_hint'))}</div>` : ''}
    ${d.maintenance_event ? (() => { const me = d.maintenance_event; const ri = me.reinspection; const good = ri && !DEFECT_RESULTS.includes(ri.result); return `<div class="panel ${good ? 'good' : ''}"><b>${esc(t('md_case'))}: ${esc(mk(me.kind))} ${fmtD(me.done_date)}</b> · ${esc(t('res_' + me.result))} – ${ri ? `${esc(t('reinsp_done'))} ${fmtD(ri.done_date)}${ri.result ? ' · ' + esc(t('res_' + ri.result)) : ''} (${esc(ri.evidence)})` : `${c.status === 'fahrzeug_freigegeben' ? `<span class="chip mittel">${esc(t('todo_reinspection'))}</span> ` : ''}${esc(t('md_case_hint'))}`} <a href="#/vehicles/${esc(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></div>`; })() : ''}
    ${d.maintenance_rule ? `<div class="panel ${d.maintenance_rule.done_since_order ? 'good' : ''}"><b>${esc(t('mo_case'))}: ${esc(mk(d.maintenance_rule.kind))}</b> – ${d.maintenance_rule.done_since_order ? `${esc(t('mo_done'))} ${fmtD(d.maintenance_rule.last_done_date)}` : esc(t('mo_case_hint'))} <a href="#/vehicles/${esc(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></div>` : ''}
    ${d.tire_winter ? (() => { const w = d.tire_winter; const good = w.status === 'erfuellt'; return `<div class="panel ${good ? 'good' : ''}" id="cwinter"><b>${esc(t('wo_case'))}</b> <span class="chip ${good ? 'ok' : w.status === 'nicht_erfuellt' ? 'kritisch' : 'mittel'}">${esc(t('ws_' + w.status))}</span>${w.noncompliant.length ? ` – ${esc(t('winter_bad').replace('{p}', w.noncompliant.join(', ')))}` : ''}${w.missing.length ? ` – ${esc(t('winter_missing').replace('{p}', w.missing.join(', ')))}` : ''}${good ? '' : `<p class="small" id="cwhint">${esc(t(['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) ? 'wo_case_hint_closed' : 'wo_case_hint'))}</p>`} <a href="#/vehicles/${esc(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></div>`; })() : ''}
    ${c.cost_over_limit_at ? `<div class="panel warn"><b>${esc(t('cost_approval_pending'))}</b> – ${esc(t(isMgr() ? 'cost_approval_hint_mgr' : 'cost_approval_hint_ws'))} <span class="small muted">(${fmtDT(c.cost_over_limit_at)})</span></div>` : ''}
    <section class="panel"><p style="white-space:pre-wrap;font-size:1.05rem">${esc(c.description)}</p>
    <dl class="kv">
      <dt>${esc(t('urgency'))}</dt><dd><span class="chip ${esc(c.priority)}">${esc(t('prio_' + c.priority))}</span>${prioLine}</dd>
      <dt>${esc(t('driveable'))}</dt><dd>${esc(t('drv_' + c.reported_driveability))}</dd>
      ${d.reporter_name || d.reporter_name_hidden ? `<dt>${esc(t('reported_by'))}</dt><dd>${esc(pnm(d.reporter_name, d.reporter_name_hidden))} · ${fmtDT(c.created_at)}</dd>` : `<dt>${esc(t('date'))}</dt><dd>${fmtDT(c.created_at)}</dd>`}
      <dt>${esc(t('received'))}</dt><dd>${c.fleet_received_at ? fmtDT(c.fleet_received_at) : esc(t('not_yet'))}</dd>
      <dt>${esc(t('workshop'))}</dt><dd>${esc(wsName(c.workshop_site || c.suggested_workshop_site))}${c.planned_date ? ' · ' + esc(t('planned')) + ' ' + fmtD(c.planned_date) : ''}</dd>${c.followup_on && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status) ? `<dt>${esc(t('followup'))}</dt><dd><span class="chip${c.followup_on <= bDate() ? ' mittel' : ''}">${fmtD(c.followup_on)}</span>${c.followup_note ? ' ' + esc(c.followup_note) : ''}</dd>` : ''}
      ${c.status === 'wartet_teile' ? `<dt>${esc(t('parts_eta'))}</dt><dd>${c.parts_expected_date ? partsEta(c, '', false) : `<span class="muted">${esc(t('parts_eta_none'))}</span>`}</dd>` : ''}
      ${c.status !== 'gemeldet' ? `<dt>${esc(t('workshop_ack'))}</dt><dd>${c.workshop_ack_at ? fmtDT(c.workshop_ack_at) : esc(t('not_yet'))}</dd>` : ''}
      ${c.location_note ? `<dt>${esc(t('location'))}</dt><dd>${esc(c.location_note)}</dd>` : ''}
      ${d.parent ? `<dt>${esc(t('parent'))}</dt><dd><a href="#/cases/${esc(d.parent.id)}">${esc(d.parent.case_no)}</a></dd>` : ''}
      ${d.duplicate_of ? `<dt>${esc(t('dup_of'))}</dt><dd>${S.me.role === 'driver' ? esc(d.duplicate_of.case_no) : `<a href="#/cases/${esc(d.duplicate_of.id)}">${esc(d.duplicate_of.case_no)}</a>`}</dd>` : ''}${d.duplicates && d.duplicates.length ? `<dt>${esc(t('duplicates'))}</dt><dd>${d.duplicates.map((x) => `<a href="#/cases/${esc(x.id)}">${esc(x.case_no)}</a>`).join(', ')}</dd>` : ''}
      ${!['driver'].includes(S.me.role) ? `<dt>${esc(t('vehicle_file'))}</dt><dd><a href="#/vehicles/${esc(d.vehicle.id)}">${esc(d.vehicle.plate)}</a></dd>` : ''}
    </dl>${vehInfo(d.vehicle_info, c)}</section>`;

  // Aktionen
  const main = A.filter((a) => !['comment', 'upload', 'inspection', 'resolve_open_item'].includes(a));
  if (main.length || A.includes('inspection')) {
    html += `<div class="actions">${A.includes('inspection') ? `<a class="btn" href="#/inspect/${esc(c.id)}">${esc(t('act_inspection'))}</a>` : ''}${main.map((a) => `<button class="btn ${['reject', 'set_safety_lock'].includes(a) ? 'danger' : a === 'technical_release' ? 'go' : ['record_work', 'add_part', 'add_open_item', 'add_external_cost', 'change_priority', 'reassign_workshop', 'lift_safety_lock', 'return_for_rework', 'set_planned_date', 'set_parts_eta', 'set_followup'].includes(a) ? 'secondary' : ''}" data-act="${esc(a)}">${esc(t('act_' + a))}</button>`).join('')}</div><div id="actform"></div>`;
  } else html += `<div id="actform"></div>`;

  // Dateien
  html += `<h2>${esc(t('files'))}</h2><div class="thumbs">${d.files.map((f) => f.content_type.startsWith('image/') ? `<a href="${fileUrl(f.id)}" target="_blank" rel="noopener"><img loading="lazy" src="${fileUrl(f.id)}" alt="${esc(f.filename)}"></a>` : `<a href="${fileUrl(f.id)}" target="_blank" rel="noopener">PDF<br>${esc(f.filename.slice(0, 14))}</a>`).join('')}</div>`;
  const canUpload = A.includes('upload') || (c.reporter_id === S.me.id && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status));
  // Höchstzahl je Vorgang (wie Server MAX_FILES): voll → Hinweis statt Knopf; sonst freie Plätze nennen, wenn weniger als die Hälfte frei
  const filesFree = Math.max(0, PHOTO_MAX - d.files.length);
  if (canUpload && filesFree) html += `<label class="btn secondary" style="margin-top:8px;display:inline-flex">${esc(t('add_photos'))}<input id="file" type="file" accept="image/*,application/pdf" capture="environment" multiple hidden></label>${filesFree < PHOTO_MAX / 2 ? ` <span class="small muted" id="filesfree">${esc(t('files_free').replace('{n}', filesFree).replace('{max}', PHOTO_MAX))}</span>` : ''}`;
  else if (canUpload) html += `<p class="small muted" id="filesfull">${esc(t('files_full').replace('{max}', PHOTO_MAX))}</p>`;

  // Restarbeiten
  if (d.open_items.length) {
    html += `<h2>${esc(t('open_items'))}</h2><div class="list">${d.open_items.map((o) => `<div class="row ${o.safety_relevant ? 'p-kritisch' : ''}"><span class="chip ${o.status === 'offen' ? (o.safety_relevant ? 'kritisch' : 'mittel') : 'ok'}">${esc(o.status)}</span><span class="title" style="white-space:normal">${esc(o.description)}</span>${o.status === 'offen' && A.includes('resolve_open_item') ? `<button class="btn secondary" data-resolve="${esc(o.id)}">${esc(t('done'))}</button>` : '<span></span>'}<span class="sub">${o.safety_relevant ? esc(t('safety_relevant')) + ' · ' : ''}${esc(pnm(o.created_by_name, o.created_by_name_hidden))} · ${fmtDT(o.created_at)}${o.resolution_note ? ' · ' + esc(o.resolution_note) : ''}</span></div>`).join('')}</div>`;
  }
  if (d.followups.length) html += `<h2>${esc(t('followups'))}</h2><div class="list">${d.followups.map((f) => `<a class="row p-${esc(f.priority)}" href="#/cases/${esc(f.id)}"><span class="chip">${esc(f.case_no)}</span><span class="title">${esc(f.description)}</span><span class="chip">${esc(t('st_' + f.status))}</span></a>`).join('')}</div>`;
  if (d.inspections.length) html += `<h2>${esc(t('inspections'))}</h2>${d.inspections.map((i) => `<details class="panel"><summary>${fmtDT(i.created_at)} · ${esc(pnm(i.performed_by_name, i.performed_by_name_hidden))} · <span class="chip ${i.result === 'ok' ? 'ok' : 'kritisch'}">${i.result === 'ok' ? 'OK' : esc(t('defect'))}</span>${i.odometer_km ? ' · ' + fmtNum(i.odometer_km) + ' km' : ''}</summary><table>${i.items.map((it) => `<tr><td>${esc(checkLabel(it.key))}</td><td><span class="chip ${it.result === 'mangel' ? 'kritisch' : it.result === 'ok' ? 'ok' : ''}">${esc(t(it.result === 'mangel' ? 'defect' : it.result))}</span>${it.note ? ' ' + esc(it.note) : ''}${it.followup_case_no ? ` → <a href="#/cases/${esc(it.followup_case_id)}">${esc(it.followup_case_no)}</a>` : ''}</td></tr>`).join('')}</table></details>`).join('')}`;

  // Arbeiten, Teile, Kosten
  if (d.work) {
    html += `<h2>${esc(t('work'))} & ${esc(t('parts'))}</h2><div class="scroll"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('activity'))}</th><th>${esc(t('hours'))}</th></tr></thead><tbody>${d.work.map((w) => `<tr><td>${fmtD(w.work_date)}</td><td>${esc(w.description)}<br><span class="small muted">${esc(w.user_name)}</span></td><td>${hrs(w.hours)}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table>
      <table style="margin-top:8px"><thead><tr><th>${esc(t('part_name'))}</th><th>${esc(t('qty'))}</th><th>€</th></tr></thead><tbody>${d.parts.map((p) => `<tr><td>${esc(p.name)}${p.part_number ? ` <span class="small muted">${esc(p.part_number)}</span>` : ''}${warrChip(p.warranty_until)}</td><td>${p.quantity} ${esc(p.unit)}</td><td>${p.unit_price_net === null ? `<span class="chip mittel">${esc(t('unvalued'))}</span>` : eur(p.unit_price_net) + (p.valuation === 'estimate' ? ' (' + esc(t('estimate')) + ')' : '')}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table></div>`;
  }
  if (d.costs) {
    const k = d.costs;
    html += `<section class="panel ${k.complete ? '' : ''}"><h3>${esc(t('costs'))}</h3><dl class="kv"><dt>${esc(t('actual_cost'))}</dt><dd>${eurIst(k)}</dd><dt>${esc(t('estimate'))}</dt><dd>${eur(k.estimate_net)}</dd><dt>${esc(t('unvalued'))}</dt><dd>${k.unvalued_items ? `<span class="chip mittel">${k.unvalued_items}</span>` : '0'}</dd><dt>${esc(t('hours'))}</dt><dd>${hrs(k.hours)}${k.hourly_rate_net === null ? ` <span class="small muted">(${esc(t('hourly_rate'))}: –)</span>` : ''}</dd>${d.cost_limit ? `<dt>${esc(t('cost_limit'))}</dt><dd>${d.cost_limit.limit_net !== null ? eur(d.cost_limit.limit_net) : '–'}${d.cost_limit.approved_net !== null ? ` · ${esc(t('cost_approved_upto'))} ${eur(d.cost_limit.approved_net)}` : ''}${d.cost_limit.over_since ? ` <span class="chip mittel">${esc(t('cost_approval_pending'))}</span>` : ''}</dd>` : ''}</dl>
      ${d.external_costs && d.external_costs.length ? `<table>${d.external_costs.map((x) => `<tr><td>${esc(x.supplier)} ${esc(x.invoice_no || '')}${warrChip(x.warranty_until)}</td><td>${x.amount_net === null ? esc(t('unvalued')) : eur(x.amount_net)}</td></tr>`).join('')}</table>` : ''}</section>`;
  }

  if (d.insurance_contracts) html += claimSection(d.claim, d.insurance_contracts, d.files || []);
  // Dauer je Status (aus dem Verlauf: gespeicherte Statuswechsel, aktueller Status bis jetzt)
  {
    const spans = []; let cur = 'gemeldet'; let since = c.created_at;
    for (const e of d.events) if (e.to_status && e.to_status !== cur) { spans.push([cur, Date.parse(e.created_at) - Date.parse(since)]); cur = e.to_status; since = e.created_at; }
    const closed = ['fahrzeug_freigegeben', 'abgelehnt'].includes(cur);
    if (!closed) spans.push([cur, Date.now() - Date.parse(since)]);
    const sum = {}; for (const [st, ms] of spans) sum[st] = (sum[st] || 0) + Math.max(0, ms);
    const dur = (ms) => { const h = ms / 3600000; return h < 1 ? `${Math.round(ms / 60000)} ${t('min_short')}` : h < 48 ? `${fmtNum(Math.round(h * 10) / 10)} ${t('h_short')}` : `${(Math.round((h / 24) * 10) / 10).tofmtNum()} ${t('days')}`; };
    if (Object.keys(sum).length > 1 || closed) html += `<h2>${esc(t('time_per_status'))}</h2><dl class="kv">${Object.entries(sum).map(([st, ms]) => `<dt>${esc(t('st_' + st))}${!closed && st === cur ? ` (${esc(t('current'))})` : ''}</dt><dd>${dur(ms)}</dd>`).join('')}</dl>`;
  }
  // Verlauf + Kommentar
  html += `<h2>${esc(t('history'))}</h2><ol class="timeline">${d.events.map((e) => `<li><time>${fmtDT(e.created_at)}</time> · <b>${esc(t('act_' + e.action) !== 'act_' + e.action ? t('act_' + e.action) : e.action === 'create' ? t('report_sent') : e.action)}</b>${e.actor_name || e.actor_name_hidden ? ' · ' + esc(pnm(e.actor_name, e.actor_name_hidden)) : ''}${e.to_status && e.from_status !== e.to_status ? ` → ${esc(t('st_' + e.to_status))}` : ''}${e.note ? `<div style="white-space:pre-wrap">${esc(e.note)}</div>` : ''}${e.action === 'cost_limit_exceeded' && e.payload ? `<div class="small muted">${esc(t('costs'))} ${eur(e.payload.total_net)} > ${esc(t('cost_limit'))} ${eur(Math.max(e.payload.limit_net, e.payload.approved_net || 0))}</div>` : ''}${e.action === 'approve_costs' && e.payload ? `<div class="small muted">${esc(t('cost_approved_upto'))} ${eur(e.payload.approved_net)}</div>` : ''}${e.action === 'set_parts_eta' && e.payload ? `<div class="small muted">${e.payload.from ? fmtD(e.payload.from) : '–'} → ${e.payload.to ? fmtD(e.payload.to) : '–'}</div>` : e.payload && e.payload.from && e.payload.to ? `<div class="small muted">${esc(e.payload.from)} → ${esc(e.payload.to)}</div>` : ''}${e.payload && e.payload.parts_expected_date ? `<div class="small muted">${esc(t('parts_eta'))} ${fmtD(e.payload.parts_expected_date)}</div>` : ''}${e.payload && e.payload.winter_open_confirmed ? `<div class="small muted wqev">❄ ${esc(t('wq_ev_open'))}${[...(e.payload.noncompliant || []), ...(e.payload.missing || [])].length ? ': ' + esc([...(e.payload.noncompliant || []), ...(e.payload.missing || [])].join(', ')) : ''}</div>` : ''}</li>`).join('')}</ol>`;
  if (A.includes('comment')) html += `<form id="cf"><label for="ct">${esc(t('act_comment'))}</label><textarea id="ct" required></textarea>${S.me.role !== 'driver' ? `<fieldset style="border:0;padding:0;margin:8px 0"><legend class="small muted">${esc(t('notify_only'))}</legend><div style="display:flex;gap:14px;flex-wrap:wrap">${[['fleet', t('role_fleet')], ['workshop', t('role_workshop')], ['reporter', t('reported_by')]].map(([k, l]) => `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-nt="${k}"> ${esc(l)}</label>`).join('')}</div></fieldset>` : ''}<div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form>`;
  render(html, 'cases');
  $('#cprt').onclick = () => window.print();

  const cmd = async (action, note, payload = {}) => {
    try { await api('POST', `/api/cases/${c.id}/commands`, { action, command_id: uid(), expected_version: c.version, note, payload }); toast('✓'); viewCase(c.id); }
    catch (err) { toast(err.message, true); if (err.code === 'version_conflict') viewCase(c.id); }
  };
  $$('[data-act]').forEach((b) => (b.onclick = () => actionForm(b.dataset.act, c, cmd, {}, d)));
  $$('[data-resolve]').forEach((b) => (b.onclick = () => actionForm('resolve_open_item', c, cmd, { open_item_id: b.dataset.resolve })));
  const clf = $('#clf'); if (clf) clf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(clf)); for (const k of Object.keys(b)) if (b[k] === '') b[k] = null; try { await api('PUT', `/api/cases/${c.id}/claim`, b); toast('✓'); viewCase(c.id); } catch (err) { toast(err.message, true); } };
  const cf = $('#cf'); if (cf) cf.onsubmit = (e) => { e.preventDefault(); const notify = $$('[data-nt]', cf).filter((x) => x.checked).map((x) => x.dataset.nt); cmd('comment', $('#ct').value, notify.length ? { notify } : {}); };
  // Mehr gewählt als noch frei: nur die ersten freien hochladen, der Rest wird vorher genannt (kein Serverfehler je Datei);
  // Fehler gesammelt in einer Meldung nach dem Neuaufbau (sonst überdeckt eine Meldung die andere)
  const fi = $('#file'); if (fi) fi.onchange = async () => {
    const all = [...fi.files]; const take = all.slice(0, filesFree); const skipped = all.slice(filesFree); const errs = [];
    for (const file of take) {
      try { const blob = await prepareUpload(file); await api('POST', `/api/cases/${c.id}/files`, blob, { headers: { 'x-filename': encodeURIComponent(file.name), 'content-type': blob.type || 'application/octet-stream' } }); }
      catch (err) { errs.push(`${file.name}: ${err.message}`); }
    }
    await viewCase(c.id);
    if (skipped.length) errs.unshift(t('files_skipped').replace('{n}', skipped.length).replace('{max}', PHOTO_MAX).replace('{names}', skipped.map((f) => f.name).join(', ')));
    if (errs.length) toast(errs.join(' · '), true); else if (take.length) toast('✓');
  };
}

// ---------- Versicherungsfälle (je Vorgang; nur Inhaber/Fuhrparkleitung) ----------
const CLAIM_ST = ['gemeldet', 'in_pruefung', 'reguliert', 'abgelehnt', 'zurueckgezogen'];
const CLAIM_CLS = { gemeldet: 'mittel', in_pruefung: 'mittel', reguliert: 'ok', abgelehnt: 'kritisch', zurueckgezogen: '' };
const claimChip = (st) => `<span class="chip ${CLAIM_CLS[st]}">${esc(t('cls_' + st))}</span>`;
function claimSection(cl, contracts, files = []) {
  const v = (k) => (cl && cl[k] !== null && cl[k] !== undefined ? esc(String(cl[k])) : '');
  const money = (k) => (cl && cl[k] !== null && cl[k] !== undefined ? esc(String(cl[k]).replace('.', ',')) : '');
  const info = cl ? `<p style="margin-top:0">${claimChip(cl.status)} ${esc(cl.insurer)}${cl.claim_no ? ` · ${esc(t('claim_no'))} ${esc(cl.claim_no)}` : ''}</p>
    <dl class="kv"><dt>${esc(t('claim_reported'))}</dt><dd>${fmtD(cl.reported_on)}${cl.days_open !== null ? ` · ${esc(t('claim_days_open').replace('{n}', cl.days_open))}` : ''}</dd>${cl.deductible_net !== null ? `<dt>${esc(t('claim_deductible'))}</dt><dd>${eur(cl.deductible_net)}</dd>` : ''}${cl.reimbursed_net !== null ? `<dt>${esc(t('claim_reimbursed'))}</dt><dd>${eur(cl.reimbursed_net)} · ${fmtD(cl.reimbursed_on)}</dd>` : ''}</dl>
    <p class="small muted">${esc(t('evidence'))}: ${esc(cl.evidence)}${cl.note ? ' · ' + esc(cl.note) : ''}</p>${cl.file_id && cl.file_name ? `<p class="small">📎 ${esc(t('claim_file'))}: <a href="${fileUrl(cl.file_id)}" target="_blank" rel="noopener">${esc(cl.file_name)}</a></p>` : ''}` : `<p class="muted small" style="margin-top:0">${esc(t('claim_none'))}</p>`;
  return `<section class="panel"><h3 style="margin-top:0">${esc(t('claim_title'))}</h3>${info}<details class="noprint"><summary>${esc(t(cl ? 'claim_edit' : 'claim_add'))}</summary><form id="clf">
    <p class="small muted">${esc(t('claim_hint'))}</p>
    <label>${esc(t('claim_contract'))}</label><select name="contract_id"><option value="">${esc(t('claim_no_contract'))}</option>${contracts.map((k) => `<option value="${esc(k.id)}"${cl && cl.contract_id === k.id ? ' selected' : ''}>${esc(k.partner)}${k.contract_no ? ' · ' + esc(k.contract_no) : ''}${k.ended_on ? ` (${esc(t('cs_beendet'))})` : ''}</option>`).join('')}</select>
    <label>${esc(t('claim_insurer'))}<span class="hint">${esc(t('claim_insurer_hint'))}</span></label><input name="insurer" maxlength="120" value="${v('insurer')}">
    <label>${esc(t('claim_no'))}</label><input name="claim_no" maxlength="60" value="${v('claim_no')}">
    <label>${esc(t('claim_reported'))}</label><input type="date" name="reported_on" required max="${bDate()}" value="${cl ? v('reported_on') : bDate()}">
    <label>${esc(t('status_label'))}</label><select name="status">${CLAIM_ST.map((x) => `<option value="${x}"${(cl ? cl.status : 'gemeldet') === x ? ' selected' : ''}>${esc(t('cls_' + x))}</option>`).join('')}</select>
    <label>${esc(t('claim_deductible'))}</label><input name="deductible_net" inputmode="decimal" value="${money('deductible_net')}">
    <label>${esc(t('claim_reimbursed'))}</label><input name="reimbursed_net" inputmode="decimal" value="${money('reimbursed_net')}">
    <label>${esc(t('claim_reimbursed_on'))}</label><input type="date" name="reimbursed_on" max="${bDate()}" value="${v('reimbursed_on')}">
    <label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" value="${v('evidence')}"><label>${esc(t('note'))}</label><input name="note" maxlength="1000" value="${v('note')}">
    <label>${esc(t('claim_file'))}<span class="hint">${esc(t('claim_file_hint'))}</span></label><select name="file_id"><option value="">–</option>${files.map((f) => `<option value="${esc(f.id)}"${cl && cl.file_id === f.id ? ' selected' : ''}>${esc(f.filename)}</option>`).join('')}</select>
    <div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details></section>`;
}
async function viewClaims() {
  const f = S.clFilter || 'offen';
  const cs = vsDef('claimSite') || ''; const csq = cs ? '&site=' + encodeURIComponent(cs) : '';
  const r = await api('GET', `/api/claims?filter=${f}${csq}`);
  const tabs = ['offen', 'alle', 'reguliert', 'abgelehnt'];
  const fLabel = f === 'offen' ? t('claim_f_open') : f === 'alle' ? t('filter_all') : t('cls_' + f);
  let html = `<h1>${esc(t('claims'))}</h1>${printHead([`${t('print_filter')}: ${fLabel}`, r.site ? `${t('kpi_vsite')}: ${r.site === 'ohne' ? t('cs_nosite') : r.site}` : '', t('print_count').replace('{n}', r.claims.length)])}${helpLink('claims')}<p class="small muted">${esc(t('claims_hint'))}</p>
    <div class="actions noprint" style="flex-wrap:wrap">${tabs.map((x) => `<button type="button" class="btn ${f === x ? '' : 'secondary'}" data-clf="${x}">${esc(x === 'offen' ? t('claim_f_open') : x === 'alle' ? t('filter_all') : t('cls_' + x))} (${r.counts[x] || 0})</button>`).join('')}</div>
    ${(r.site_options || []).length > 1 || r.site ? `<div class="actions noprint" style="margin-top:0"><div>${siteSelect('clsite', '', r.site_options, r.site, t('kpi_vsite'), t('filter_all'))}</div></div>` : ''}
    ${r.reimbursed_sum_net !== null ? `<section class="panel"><dl class="kv"><dt>${esc(t('claim_sum'))}</dt><dd><b>${eur(r.reimbursed_sum_net)}</b></dd></dl></section>` : ''}
    <div class="list">${r.claims.length ? r.claims.map((c) => `<a class="row${c.followup_due ? ' p-mittel' : ''}" href="#/cases/${encodeURIComponent(c.case_id)}">${plate(c.plate)}<span class="title">${esc(c.insurer)}${c.claim_no ? ' · ' + esc(c.claim_no) : ''}</span>${claimChip(c.status)}<span class="sub" style="white-space:normal">${c.followup_due ? `<b>${esc(t('todo_claims'))}</b> · ` : ''}${esc(c.case_no)} · ${esc(t('claim_reported'))} ${fmtD(c.reported_on)}${c.days_open !== null ? ` · ${esc(t('claim_days_open').replace('{n}', c.days_open))}` : ''}${c.deductible_net !== null ? ` · ${esc(t('claim_deductible_short'))} ${eur(c.deductible_net)}` : ''}${c.reimbursed_net !== null ? ` · ${esc(t('claim_reimbursed_short'))} ${eur(c.reimbursed_net)}` : ''}${c.case_cost_net !== null ? ` · ${esc(t('claim_case_cost'))} ${eur(c.case_cost_net)}` : ''}${c.balance_net !== null ? ` · <b>${esc(t('claim_balance'))} ${eur(c.balance_net)}</b>` : ''}</span></a>`).join('') : `<p class="muted">${esc(t('claims_none'))}</p>`}</div>
    <div class="actions noprint"><button type="button" class="btn secondary" id="clcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="clprt">${esc(t('print'))}</button></div>`;
  render(html, 'more');
  $$('[data-clf]').forEach((b) => (b.onclick = () => { S.clFilter = b.dataset.clf; viewClaims(); }));
  const cls = $('#clsite'); if (cls) cls.onchange = () => { S.claimSite = cls.value; viewClaims(); };
  $('#clprt').onclick = () => window.print();
  $('#clcsv').onclick = async () => { try { download(await api('GET', `/api/claims?format=csv&filter=${f}${csq}`), `fuhrpark-versicherungsfaelle_${r.today}${r.site ? '_' + fnPart(r.site) : ''}.csv`); } catch (err) { toast(err.message, true); } };
}

const wsName = (code) => (S.meta.workshops.find((w) => w.code === code) || {}).name || code || '–';
const checkLabel = (k) => (CHECK_LABELS[S.lang] || CHECK_LABELS.de)[k] || k;

// Bilder vor dem Hochladen verkleinern (max. 1600 px, JPEG) – spart Datenvolumen unterwegs
// Mehr als 10 Fotos gewählt: nur die ersten 10 werden angehängt (Server-Grenze je Vorgang) – sofort sichtbar sagen statt still weglassen
const PHOTO_MAX = 10;
function photoLimitWatch(input) {
  if (!input) return;
  const note = document.createElement('p'); note.className = 'panel warn small'; note.setAttribute('role', 'status'); note.hidden = true; note.dataset.photomax = '';
  input.insertAdjacentElement('afterend', note);
  input.onchange = () => {
    const n = (input.files || []).length;
    note.hidden = n <= PHOTO_MAX;
    note.textContent = n > PHOTO_MAX ? t('photos_over_max').replace('{n}', n).replace('{max}', PHOTO_MAX) : '';
  };
}
async function prepareUpload(file) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * scale); cv.height = Math.round(bmp.height * scale);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise((res) => cv.toBlob((b) => res(b || file), 'image/jpeg', 0.82));
  } catch { return file; }
}

// Ablehnen als Dublette: alle offenen Vorgänge desselben Fahrzeugs (neueste Meldung zuerst, ohne diesen und ohne Dubletten) –
// Auswahl bleibt erhalten; schlägt das Nachladen fehl, bleiben die 5 neuesten mit Hinweis auf die Fahrzeugakte
async function loadDupOptions(c) {
  const hint = () => $('#dupmore');
  try {
    const r = await api('GET', `/api/cases?vehicle_id=${encodeURIComponent(c.vehicle_id)}&status=open&sort=oldest&limit=500`);
    const sel = $('#dupsel'); if (!sel || !hint()) return;
    const list = (r.cases || []).filter((o) => o.id !== c.id && !o.duplicate_of).reverse();
    const keep = sel.value;
    sel.innerHTML = `<option value="">${esc(t('dup_none'))}</option>${list.map((o) => `<option value="${esc(o.id)}">${esc(o.case_no)} · ${esc(t('st_' + o.status))}</option>`).join('')}`;
    if (list.some((o) => o.id === keep)) sel.value = keep;
    hint().textContent = r.truncated ? t('dup_more_fail') : t('dup_all').replace('{n}', list.length);
  } catch { if (hint()) hint().textContent = t('dup_more_fail'); }
}

function actionForm(action, c, cmd, preset = {}, d = null) {
  const box = $('#actform');
  const f = [];
  const needsNote = ['change_priority', 'set_safety_lock', 'lift_safety_lock', 'approve_repair', 'reassign_workshop', 'reject', 'wait_parts', 'resolve_open_item', 'request_quality_check', 'return_for_rework', 'technical_release', 'approve_costs'];
  const wsOpts = S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${(c.workshop_site || c.suggested_workshop_site) === w.code ? ' selected' : ''}>${esc(w.name)}</option>`).join('');
  const prioOpts = (sel) => ['niedrig', 'mittel', 'kritisch'].map((p) => `<option value="${p}"${p === sel ? ' selected' : ''}>${esc(t('prio_' + p))}</option>`).join('');
  switch (action) {
    case 'change_priority': f.push(`<label>${esc(t('new_priority'))}</label><select name="priority">${prioOpts(c.priority)}</select>`); break;
    case 'approve_repair': f.push(`<label>${esc(t('workshop'))}</label><select name="workshop_site">${wsOpts}</select><label>${esc(t('urgency'))}</label><select name="priority">${prioOpts(c.priority)}</select><label>${esc(t('planned'))}</label><input type="date" name="planned_date">`); break;
    case 'reassign_workshop': f.push(`<label>${esc(t('workshop'))}</label><select name="workshop_site">${wsOpts}</select>`); break;
    case 'reject': {
      // Kurzinfo liefert nur die 5 neuesten anderen offenen Vorgänge; gibt es mehr, wird die vollständige Liste nachgeladen (unten)
      const vi = (d && d.vehicle_info) || {}; const oc = vi.other_open_cases || []; const more = Math.max(0, (vi.other_open_total || 0) - oc.length);
      if (oc.length) f.push(`<label for="dupsel">${esc(t('dup_select'))}<span class="hint">${esc(t('dup_hint'))}</span></label><select id="dupsel" name="duplicate_of"><option value="">${esc(t('dup_none'))}</option>${oc.map((o) => `<option value="${esc(o.id)}">${esc(o.case_no)} · ${esc(t('st_' + o.status))}</option>`).join('')}</select>${more ? `<p class="small muted" id="dupmore">${esc(t('dup_loading').replace('{n}', more))}</p>` : ''}`);
      break;
    }
    case 'approve_costs': f.push(`<p class="small muted">${esc(t('cost_approve_hint'))}</p>`); break;
    case 'acknowledge': f.push(`<label>${esc(t('planned'))}</label><input type="date" name="planned_date">`); break;
    case 'wait_parts': f.push(`<label>${esc(t('parts_eta'))}<span class="hint">${esc(t('parts_eta_hint'))}</span></label><input type="date" name="parts_expected_date" min="${bDate()}">`); break;
    case 'set_parts_eta': f.push(`<label>${esc(t('parts_eta'))}<span class="hint">${esc(t('parts_eta_hint'))} (${esc(t('planned_clear_hint'))})</span></label><input type="date" name="parts_expected_date" min="${bDate()}" value="${esc(c.parts_expected_date || '')}">`); break;
    case 'set_followup': f.push(`<p class="small muted">${esc(t('followup_hint'))}</p><label>${esc(t('followup'))}<span class="hint">${esc(t('planned_clear_hint'))}</span></label><input type="date" name="followup_on" min="${bDate()}" value="${esc(c.followup_on || '')}">`); break;
    case 'set_planned_date': f.push(`<label>${esc(t('planned'))}<span class="hint">${esc(t('planned_clear_hint'))}</span></label><input type="date" name="planned_date" value="${esc(c.planned_date || '')}">`); break;
    case 'record_work': f.push(`<label>${esc(t('hours'))}</label><input name="hours" inputmode="decimal" required><label>${esc(t('activity'))}</label><input name="description" required list="worksugg" autocomplete="off"><datalist id="worksugg"></datalist><label>${esc(t('date'))}</label><input type="date" name="work_date" value="${bDate()}">`); break;
    case 'add_part': f.push(`<div id="stocksel"></div><div id="freepart">`); f.push(`<label>${esc(t('part_name'))}</label><input name="name" required list="partsugg" autocomplete="off"><datalist id="partsugg"></datalist><label>${esc(t('part_number'))}</label><input name="part_number"><label>${esc(t('qty'))}</label><input name="quantity" inputmode="decimal" value="1"><label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label>${esc(t('supplier'))}</label><input name="supplier"></div><label>${esc(t('warranty_until'))}<span class="hint">${esc(t('warranty_hint'))}</span></label><input type="date" name="warranty_until" style="max-width:220px">`); break;
    case 'add_open_item': f.push(`<label>${esc(t('open_items'))}</label><input name="description" required><label class="check"><input type="checkbox" name="safety_relevant"> ${esc(t('safety_relevant'))}</label>`); break;
    case 'add_external_cost': f.push(`<label>${esc(t('supplier'))}</label><input name="supplier" required><label>${esc(t('invoice_no'))}</label><input name="invoice_no"><label>${esc(t('amount_net'))}</label><input name="amount_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label class="check"><input type="checkbox" name="covers_work_and_parts"> ${esc(t('covers_all'))}</label><label>${esc(t('warranty_until'))}<span class="hint">${esc(t('warranty_hint'))}</span></label><input type="date" name="warranty_until" style="max-width:220px">`); break;
  }
  // Winterreifen-Auftrag: Lage noch nicht erfüllt → Hinweis + ausdrückliche Bestätigung (Server verlangt sie ebenfalls)
  if (action === 'request_quality_check' && d && d.tire_winter && d.tire_winter.status !== 'erfuellt') f.push(`<p class="panel small" id="wqopen">${esc(t('wq_open_hint'))}</p><label class="check"><input type="checkbox" name="confirm_winter_open" required> ${esc(t('wq_open_confirm'))}</label>`);
  if (['technical_release', 'lift_safety_lock'].includes(action)) f.push(`<label class="check"><input type="checkbox" name="confirm" required> ${esc(t('confirm'))}</label>`);
  const noteLabel = action === 'approve_repair' ? t('scope') : ['technical_release'].includes(action) ? t('evidence') : needsNote.includes(action) ? t('reason') : t('note');
  f.push(`<label>${esc(noteLabel)}</label><textarea name="note"${needsNote.includes(action) ? ' required' : ''}></textarea>`);
  if (action === 'add_part') api('GET', '/api/part-suggestions').then((r) => {
    const dl = $('#partsugg'); if (!dl) return;
    dl.innerHTML = r.suggestions.map((x) => `<option value="${esc(x.name)}">${esc(x.part_number || '')}</option>`).join('');
    const nm = $('#af input[name=name]'); const pn = $('#af input[name=part_number]');
    if (nm && pn) nm.addEventListener('change', () => { const hit = r.suggestions.find((x) => x.name === nm.value); if (hit && hit.part_number && !pn.value) pn.value = hit.part_number; });
  }).catch(() => {});
  if (action === 'record_work') api('GET', '/api/work-suggestions').then((r) => { const dl = $('#worksugg'); if (dl) dl.innerHTML = r.suggestions.map((x) => `<option value="${esc(x)}">`).join(''); }).catch(() => {});
  box.innerHTML = `<form class="panel" id="af"><h3>${esc(t('act_' + action))}</h3>${f.join('')}<div class="actions"><button class="btn">${esc(t('save'))}</button><button type="button" class="btn secondary" id="ac">${esc(t('cancel'))}</button></div></form>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#ac').onclick = () => (box.innerHTML = '');
  if (action === 'reject' && $('#dupmore')) loadDupOptions(c);
  if (action === 'add_part') loadStockSelect(c);
  if ($('#dupsel')) $('#dupsel').onchange = () => { const ta = $('#af textarea[name=note]'); const o = $('#dupsel').selectedOptions[0]; if (ta && !ta.value && $('#dupsel').value) ta.value = `${t('dup_of')} ${o.textContent.split(' · ')[0]}`; };
  $('#af').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const p = { ...preset };
    for (const [k, v] of fd.entries()) if (k !== 'note' && v !== '') p[k] = v;
    for (const k of ['confirm', 'confirm_winter_open', 'safety_relevant', 'covers_work_and_parts']) if (k in p) p[k] = true;
    if (p.estimate) { p.valuation = 'estimate'; delete p.estimate; }
    for (const k of ['hours', 'quantity', 'unit_price_net', 'amount_net']) if (k in p) p[k] = String(p[k]).replace(',', '.');
    if (p.stock_item_id) { delete p.name; delete p.part_number; delete p.supplier; if (!fd.get('unit_price_net')) delete p.unit_price_net; } else delete p.stock_item_id;
    cmd(action, fd.get('note') || null, p);
  };
}

// ---------- Kontrollen ----------
function checklistHtml() {
  return S.meta.checklist.map((i) => `<div class="checkitem" data-key="${esc(i.key)}"><span id="cl_${esc(i.key)}">${esc(checkLabel(i.key))}</span>
    <span class="seg" role="radiogroup" aria-labelledby="cl_${esc(i.key)}"><label><input type="radio" name="${esc(i.key)}" value="ok" required>${esc(t('ok'))}</label><label class="bad"><input type="radio" name="${esc(i.key)}" value="mangel">${esc(t('defect'))}</label><label><input type="radio" name="${esc(i.key)}" value="na">${esc(t('na'))}</label></span>
    <div class="detail" hidden><input name="${esc(i.key)}__note" minlength="3" maxlength="1000" placeholder="${esc(t('defect_note'))}"><label class="check"><input type="checkbox" name="${esc(i.key)}__safety"> ${esc(t('safety_relevant'))}</label></div></div>`).join('');
}
const kmWarn = (r) => (r.km_rejected ? ' · ' + t('km_not_taken').replace('{km}', r.km_rejected.km).replace('{prev}', r.km_rejected.previous_km) : r.km_test_only ? ' · ' + t('km_test_only') : '');
function bindChecklist(form) {
  $$('.checkitem', form).forEach((row) => {
    $$('input[type=radio]', row).forEach((r) => (r.onchange = () => { row.classList.remove('missing'); const bad = r.value === 'mangel' && r.checked; $('.detail', row).hidden = !bad; $('.detail input', row).required = bad; }));
  });
  // Unbeantwortete Punkte in der App-Sprache melden (statt Browser-Hinweis am unsichtbaren Radio in der Gerätesprache)
  let shown = false;
  form.addEventListener('invalid', (e) => {
    const row = e.target.closest('.checkitem');
    // Mangelbeschreibung (Pflicht, ≥ 3 Zeichen wie der Server) und km-Stand ebenfalls in der App-Sprache statt Browser-/Server-Text
    if ((row && e.target.name && e.target.name.endsWith('__note')) || e.target.id === 'km') {
      e.preventDefault();
      if (shown) return;
      shown = true; setTimeout(() => (shown = false), 0);
      e.target.scrollIntoView({ block: 'center' }); e.target.focus({ preventScroll: true });
      toast(t(e.target.id === 'km' ? 'km_invalid' : 'defect_note_missing'), true);
      return;
    }
    if (!row || e.target.type !== 'radio') return;
    e.preventDefault();
    row.classList.add('missing');
    if (shown) return;
    shown = true; setTimeout(() => (shown = false), 0);
    const open = $$('.checkitem', form).filter((r) => !$('input[type=radio]:checked', r)).length;
    row.scrollIntoView({ block: 'center' });
    $('input[type=radio]', row).focus({ preventScroll: true });
    toast(t('check_missing').replace('{n}', open), true);
  }, true);
}
function collectChecklist(form) {
  const fd = new FormData(form);
  return S.meta.checklist.map((i) => ({ key: i.key, result: fd.get(i.key), note: fd.get(i.key + '__note') || null, safety_relevant: !!fd.get(i.key + '__safety') }));
}
async function viewInspection(caseId) {
  const d = await api('GET', '/api/cases/' + caseId);
  render(`<p><a href="#/cases/${esc(caseId)}">‹ ${esc(t('back'))}</a></p><h1>${esc(t('inspection'))}</h1><p>${plate(d.vehicle.plate)} ${esc(d.case.case_no)}</p>
    <form id="f">${checklistHtml()}<label for="km">${esc(t('km'))}</label><input id="km" name="km" inputmode="numeric" pattern=" *[0-9][0-9 .]*" maxlength="12"><label for="n">${esc(t('note'))}</label><textarea id="n" name="n"></textarea>
    <div class="actions"><button class="btn block">${esc(t('submit_inspection'))}</button></div></form>`, 'cases');
  const form = $('#f'); bindChecklist(form);
  const key = uid();
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('POST', '/api/inspections', { kind: 'nach_reparatur', case_id: caseId, request_key: key, items: collectChecklist(form), odometer_km: $('#km').value || null, note: $('#n').value || null });
      toast(`${t('check_saved')}${r.followups.length ? ' · ' + r.followups.map((f) => f.case_no).join(', ') : ''}${kmWarn(r)}`, !!r.km_rejected);
      location.hash = '#/cases/' + caseId;
    } catch (err) { toast(err.message, true); }
  };
}
async function viewDepartureCheck(preId) {
  const vs = await vehiclesCached();
  render(`<h1>${esc(t('departure_check'))}</h1>${outboxBanner()}${helpLink('check')}<form id="f"><label for="v">${esc(t('vehicle'))}</label><select id="v" required><option value="">–</option>${vs.map((v) => `<option value="${esc(v.id)}"${v.assigned ? ' selected' : ''}>${esc(v.plate)}${v.kind === 'anhaenger' ? ' (' + esc(t('vk_anhaenger')) + ')' : ''}</option>`).join('')}</select><div id="known"></div>
    ${checklistHtml()}<label for="km">${esc(t('km'))}</label><input id="km" inputmode="numeric" pattern=" *[0-9][0-9 .]*" maxlength="12">
    <label for="ph">${esc(t('photos_now'))}<span class="hint">${esc(t('check_photos_hint'))}</span></label><input type="file" id="ph" accept="image/jpeg,image/png,image/webp" multiple>
    <div class="actions"><button class="btn block" id="sb">${esc(t('submit_inspection'))}</button></div></form><p class="small"><a href="#/check/paper">${esc(t('paper_form'))}</a> – ${esc(t('paper_hint'))}</p>`, 'check');
  const form = $('#f'); bindChecklist(form);
  if (preId) { if (vs.some((v) => v.id === preId)) $('#v').value = preId; else toast(t('qr_vehicle_unknown'), true); }
  if (S.me.role === 'driver') {
    let known = null;
    const showKnown = () => { const box = $('#known'); if (!box) return; const v = known && known.find((x) => x.id === $('#v').value); box.innerHTML = v ? coupledAlert(v.coupled) + knownDefects(v.known_defects) : ''; };
    api('GET', '/api/me/vehicles').then((r) => { known = r.vehicles; showKnown(); }).catch(() => {});
    $('#v').addEventListener('change', showKnown);
  }
  photoLimitWatch($('#ph'));
  const key = uid();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const body = { kind: 'abfahrt', vehicle_id: $('#v').value, request_key: key, items: collectChecklist(form), odometer_km: $('#km').value || null };
    const files = [...($('#ph').files || [])].slice(0, PHOTO_MAX);
    const hasDefect = body.items.some((i) => i.result === 'mangel');
    try {
      $('#sb').disabled = true;
      const r = await api('POST', '/api/inspections', body);
      // Fotos gehören zum Mangel: an den (ersten) Folgeauftrag hängen; ohne Mangel wird nichts hochgeladen
      let failed = 0;
      if (files.length && r.followups.length) for (const [i, file] of files.entries()) {
        $('#sb').textContent = `${t('uploading')} ${i + 1}/${files.length}`;
        try { failed += await uploadCasePhotos(r.followups[0].id, [{ blob: await prepareUpload(file), name: file.name }]); } catch { failed++; }
      }
      toast(`${t('check_saved')}${files.length && !r.followups.length ? ' · ' + t('check_photos_skipped') : ''}${failed ? ' · ' + t('photos_failed').replace('{n}', failed) : ''}${kmWarn(r)}`, !!failed || !!r.km_rejected);
      location.hash = r.followups.length ? '#/cases/' + r.followups[0].id : '#/';
    } catch (err) {
      $('#sb').disabled = false;
      if (err.offline) {
        let stored = 0;
        if (files.length && hasDefect) { try { const list = []; for (const f of files) list.push({ blob: await prepareUpload(f), name: f.name }); await photosPut(key, list); stored = list.length; } catch {} }
        outboxAdd('/api/inspections', body, stored);
        const critical = body.items.some((i) => i.result === 'mangel' && i.safety_relevant);
        render(`<h1>${esc(t('departure_check'))}</h1><div class="panel alert" role="alert"><p><b>${esc(t('outbox_saved'))}</b></p>${critical ? `<p><b>${esc(t('outbox_call'))}</b></p>` : ''}</div><div class="actions"><a class="btn secondary" href="#/">${esc(t('back'))}</a></div>`, 'check');
        return;
      }
      toast(err.message, true);
    }
  };
}

// Papiervordruck der Abfahrtskontrolle (Notfall: Handy leer/defekt) – gleiche Prüfpunkte wie in der App
function viewCheckPaper() {
  const line = (l) => `<div class="paper-field"><span>${esc(l)}</span><i></i></div>`;
  render(`<p class="noprint"><a href="#/check">‹ ${esc(t('back'))}</a></p><h1>${esc(t('departure_check'))} – ${esc(t('paper_form'))}</h1>
    <p class="small noprint">${esc(t('paper_hint'))}</p><div class="actions noprint"><button type="button" class="btn" id="pprt">${esc(t('print'))}</button></div>
    <div class="paper-head">${[t('plate_label'), t('date'), t('km'), t('driver_name')].map(line).join('')}</div>
    <div class="scroll"><table class="paper"><thead><tr><th>${esc(t('check_item'))}</th><th>${esc(t('ok'))}</th><th>${esc(t('defect'))}</th><th>${esc(t('na'))}</th><th>${esc(t('defect_note'))}</th></tr></thead>
    <tbody>${S.meta.checklist.map((i) => `<tr><td>${esc(checkLabel(i.key))}</td><td class="box">☐</td><td class="box">☐</td><td class="box">☐</td><td></td></tr>`).join('')}</tbody></table></div>
    <p class="small">☐ ${esc(t('safety_relevant'))} – ${esc(t('outbox_call'))}</p>
    <div class="paper-head">${line(t('signature'))}</div>
    <p class="small muted">${esc(t('paper_footer'))} · CEVIK ${esc(t('app'))} [CLAUDE]</p>`, 'check');
  $('#pprt').onclick = () => window.print();
}

// ---------- Fahrzeuge ----------
function vehicleForm(v = {}) {
  const f = (name, label, val, extra = '') => `<label>${esc(label)}</label><input name="${name}" value="${esc(val ?? '')}" ${extra}>`;
  return `${v.trailer_vin ? `<input type="hidden" name="trailer_vin" value="${esc(v.trailer_vin)}">` : ''}${v.vin ? `<input type="hidden" name="vin" value="${esc(v.vin)}">` : f('vin', t('vin'), '', 'required minlength="17" maxlength="17" autocapitalize="characters"')}
    ${f('plate', t('plate_label'), v.plate, 'required maxlength="20" autocapitalize="characters"')}
    <label>${esc(t('vehicle_kind'))}</label><select name="kind">${['lkw', 'anhaenger'].map((k) => `<option value="${k}"${(v.kind || 'lkw') === k ? ' selected' : ''}>${esc(t('vk_' + k))}</option>`).join('')}</select>
    ${f('site', t('site'), v.site)}${f('manufacturer', t('manufacturer'), v.manufacturer)}${f('model', t('model_label'), v.model)}${f('build_year', t('year'), v.build_year, 'inputmode="numeric" maxlength="4"')}
    ${f('trailer_plate', t('trailer') + ' (' + t('plate_label') + ')', v.trailer_plate, 'maxlength="20" autocapitalize="characters"')}${f('master_status', t('master_status'), v.master_status)}
    ${f('source', t('evidence'), v.vin ? '' : '', 'maxlength="200"')}`;
}
async function saveVehicleForm(form) {
  const b = Object.fromEntries(new FormData(form));
  for (const k in b) if (b[k] === '') delete b[k];
  const r = await api('POST', '/api/vehicles', b);
  // Hinweis, wenn dasselbe Kennzeichen schon an einem anderen Fahrzeug steht (gespeichert wird trotzdem – Mensch entscheidet)
  const d = r && r.duplicate_plates;
  if (d && d.length) {
    const lst = d.slice(0, 3).map((x) => String(x.id).replace(/^VIN:/, '') + (!x.active ? ' (' + t('inactive_vehicles') + ')' : x.eval_excluded ? ' (' + t('eval_excluded') + ')' : '')).join(', ') + (d.length > 3 ? ` +${d.length - 3}` : '');
    setTimeout(() => toast(t('dup_plate_warn').replace('{p}', String(b.plate || '').toUpperCase()).replace('{list}', lst), true), 400);
  }
  return r;
}
// Direktsprung mit Filter (z. B. „Heute zu tun“ → #/vehicles?f=with_findings): Filter übernehmen, Adresse ohne Parameter
// ersetzen (sonst setzt jeder Neuaufbau den Filter zurück); „Mit Agentenbefunden“ sortiert dabei nur für diese Sitzung nach Befunden
const VEH_AV_LINK = ['gesperrt', 'werkstatt', 'meldung_offen', 'einsatzbereit_lt_system', 'coupled_locked', 'with_notes', 'maint_overdue', 'recall_open', 'with_findings'];
async function viewVehicles() {
  const hf = new URLSearchParams(location.hash.split('?')[1] || '').get('f');
  if (hf !== null) {
    if (VEH_AV_LINK.includes(hf) && (hf !== 'with_findings' || isMgr())) { S.vehAvail = hf; if (hf === 'with_findings') S.vehSort = 'findings'; }
    try { history.replaceState(null, '', '#/vehicles'); } catch {}
  }
  const inact = !!S.vehInactive && isMgr();
  const vs = (await api('GET', '/api/vehicles' + (inact ? '?inactive=1' : ''))).vehicles;
  const f = S.vehKind || 'all';
  const av = S.vehAvail || 'all';
  const site = vsDef('vehSite') || '';
  // Schreibweisen desselben Standorts (Dortmund/DORTMUND) als ein Eintrag – wie Kostenbericht und Datenqualität; angezeigt die häufigste
  const sk = (x) => (x ? String(x).trim().toLocaleLowerCase('de') : '');
  const siteCnt = new Map(); for (const v of vs) if (sk(v.site)) { const m = siteCnt.get(sk(v.site)) || new Map(); const raw = String(v.site).trim(); m.set(raw, (m.get(raw) || 0) + 1); siteCnt.set(sk(v.site), m); }
  const sites = [...siteCnt.values()].map((m) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))[0][0]).sort((a, b) => a.localeCompare(b, 'de'));
  const base = vs.filter((v) => (!site || sk(v.site) === sk(site)) && (f === 'all' || v.kind === f));
  // „Gespann gesperrt“: eigenes Fahrzeug nicht gesperrt, aber gekoppelter Anhänger/Lkw gesperrt (nur Information, Kopplung laut Stammliste)
  const cLocked = (v) => v.availability !== 'gesperrt' && v.coupled && v.coupled.availability === 'gesperrt';
  const nCL = base.filter(cLocked).length;
  const nN = base.filter((v) => v.notes_active > 0).length; // aktive Hinweise zum Fahrzeug (nicht für Fahrer)
  // Prüfung/Wartung überfällig: frühester Termin vor heute oder km-Fälligkeit überschritten (gespeicherte Werte, nur Anzeige)
  const mOver = (v) => (v.next_due && v.next_due < bDate()) || (v.km_remaining !== null && v.km_remaining !== undefined && v.km_remaining < 0);
  const nMO = base.filter(mOver).length;
  const nRC = base.filter((v) => v.open_recalls > 0).length; // offene Herstellerrückrufe (noch nicht durchgeführt)
  const nAF = base.filter((v) => v.agent_findings_open > 0).length; // offene Agentenbefunde (nur Inhaber/Fuhrparkleitung bekommen das Feld)
  const shown = base.filter((v) => av === 'all' || (av === 'coupled_locked' ? cLocked(v) : av === 'with_notes' ? v.notes_active > 0 : av === 'maint_overdue' ? mOver(v) : av === 'recall_open' ? v.open_recalls > 0 : av === 'with_findings' ? v.agent_findings_open > 0 : v.availability === av));
  // Sortierung (nur Anzeige, gespeicherte Werte; fehlende Werte zuletzt bzw. bei „Abfahrtskontrolle“ zuerst – nie kontrolliert ist am ältesten)
  const so = S.vehSort || (S.vehSort = sortPref('vehicles', VEH_SORTS, 'plate'));
  const cmpStr = (a, b) => (a === b ? 0 : !a ? 1 : !b ? -1 : a < b ? -1 : 1);
  const SORTS = { plate: (a, b) => String(a.plate).localeCompare(String(b.plate), 'de'), next_due: (a, b) => cmpStr(a.next_due, b.next_due),
    check_oldest: (a, b) => (a.last_check_at || '') < (b.last_check_at || '') ? -1 : (a.last_check_at || '') > (b.last_check_at || '') ? 1 : 0,
    km_desc: (a, b) => (b.last_km ?? -1) - (a.last_km ?? -1),
    // wenigste Rest-km zuerst (überschritten = negativ); ohne km-Fälligkeit oder ohne km-Stand ans Ende
    km_due: (a, b) => (a.km_remaining ?? Infinity) - (b.km_remaining ?? Infinity) || 0,
    // meiste offene Agentenbefunde zuerst (kritische vor allen anderen) – Felder gibt es nur für Inhaber/Fuhrparkleitung
    findings: (a, b) => (b.agent_findings_critical || 0) - (a.agent_findings_critical || 0) || (b.agent_findings_open || 0) - (a.agent_findings_open || 0) };
  if (S.me.role !== 'driver' && SORTS[so]) shown.sort((a, b) => SORTS[so](a, b) || String(a.plate).localeCompare(String(b.plate), 'de'));
  const nT = vs.filter((v) => v.kind === 'anhaenger').length;
  const AV = ['gesperrt', 'werkstatt', 'meldung_offen', 'einsatzbereit_lt_system'];
  render(`<h1>${esc(t('vehicles'))}${inact ? ` · ${esc(t('inactive_vehicles'))}` : ''}</h1>${isMgr() ? `<details class="panel"><summary>${esc(t('new_vehicle'))}</summary><form id="nvf">${vehicleForm()}<div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    <p class="noprint"><label style="display:inline-flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="inact" ${inact ? 'checked' : ''} style="width:auto"> ${esc(t('inactive_vehicles'))}</label></p>` : ''}<input id="q" class="noprint" type="search" autocomplete="off" placeholder="${esc(S.me.role === 'driver' ? 'SZ-…' : t('veh_search_ph'))}" aria-label="${esc(t('search_label'))}" style="margin-bottom:12px"><div id="vprl"></div>
    ${nT ? `<div class="actions" role="tablist" style="margin-top:0">${[['all', t('filter_all'), vs.length], ['lkw', t('vk_lkw'), vs.length - nT], ['anhaenger', t('vk_anhaenger'), nT]].map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-vk="${k}" role="tab" aria-selected="${f === k}">${esc(l)} (${n})</button>`).join('')}</div>` : ''}
    ${S.me.role !== 'driver' ? `<div class="actions" style="flex-wrap:wrap;margin-top:0">${sites.length > 1 ? `<select id="vsite" aria-label="${esc(t('site'))}" style="max-width:220px"><option value="">${esc(t('site'))}: ${esc(t('filter_all'))}</option>${sites.map((x) => `<option${sk(x) === sk(site) ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>` : ''}
      ${[['all', t('filter_all'), base.length], ...AV.map((k) => [k, t('av_' + k), base.filter((v) => v.availability === k).length]), ...(nCL || av === 'coupled_locked' ? [['coupled_locked', t('av_coupled_locked'), nCL]] : []), ...(nN || av === 'with_notes' ? [['with_notes', t('vnotes_with'), nN]] : []), ...(nMO || av === 'maint_overdue' ? [['maint_overdue', t('av_maint_overdue'), nMO]] : []), ...(nRC || av === 'recall_open' ? [['recall_open', t('av_recall_open'), nRC]] : []), ...(nAF || av === 'with_findings' ? [['with_findings', t('av_with_findings'), nAF]] : [])].map(([k, l, n]) => `<button type="button" class="btn ${av === k ? '' : 'secondary'}" data-av="${k}">${esc(l)} (${n})</button>`).join('')}</div>` : ''}
    ${S.me.role !== 'driver' ? `<div class="actions" style="margin-top:0;flex-wrap:wrap"><select id="vsort" aria-label="${esc(t('sort_by'))}" style="flex:1 1 100%;max-width:420px">${VEH_SORTS.filter((k) => k !== 'findings' || isMgr()).map((k) => `<option value="${k}"${so === k ? ' selected' : ''}>${esc(t('sort_by'))}: ${esc(t('vsort_' + k))}</option>`).join('')}</select><button type="button" class="btn secondary" id="vcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="vprt">${esc(t('print'))}</button>${isMgr() ? `<a class="btn secondary" href="#/vehicles/qr">${esc(t('qr_sheet'))}</a>` : ''}</div>` : ''}
    <div class="list" id="vl">${shown.map((v) => `<a class="row ${v.availability === 'gesperrt' ? 'p-kritisch' : v.availability === 'werkstatt' ? 'p-mittel' : ''}" href="#/vehicles/${esc(v.id)}" data-s="${esc((v.plate + ' ' + (v.site || '') + ' ' + (v.vin || '') + ' ' + (v.trailer_plate || '') + ' ' + (v.truck_plate || '') + ' ' + (v.manufacturer || '') + ' ' + (v.model || '')).toLowerCase())}">${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="title">${v.kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${v.eval_excluded ? `<span class="chip">${esc(t('eval_excluded'))}</span> ` : ''}${esc([v.manufacturer, v.model, v.build_year].filter(Boolean).join(' '))}</span><span class="chip ${v.availability === 'gesperrt' ? 'gesperrt' : ''}">${esc(t('av_' + v.availability))}</span><span class="sub">${coupledChip(v.coupled)}${v.failed_inspection ? `<b class="chip kritisch">${esc(t('insp_failed_chip'))}: ${esc(mk(v.failed_inspection.kind))} – ${esc(t('res_' + v.failed_inspection.result))}</b><br>` : ''}${[v.site && esc(v.site), v.trailer_plate && esc(t('trailer')) + ' ' + esc(v.trailer_plate), v.truck_plate && esc(t('truck')) + ' ' + esc(v.truck_plate), v.next_due && (v.next_due < bDate() ? `<b class="chip kritisch">${esc(t('next_due'))} ${fmtD(v.next_due)}</b>` : esc(t('next_due')) + ' ' + fmtD(v.next_due)), v.next_due_km !== null && v.next_due_km !== undefined && (v.km_remaining !== null && v.km_remaining < 0 ? `<b class="chip kritisch">${esc(mk(v.next_due_km_kind))} ${esc(t('km_over'))} ${fmtKm(-v.km_remaining)}</b>` : `${esc(mk(v.next_due_km_kind))} ${esc(t('due_at_km'))} ${fmtKm(v.next_due_km)}`), v.last_km && fmtNum(v.last_km) + ' km', v.last_check_at && esc(t('departure_check')) + ' ' + fmtD(v.last_check_at) + (v.last_check_result === 'maengel' ? ' (' + esc(t('defect')) + ')' : ''), v.planned_workshop_date && esc(t('planned_ws_short')) + ' ' + fmtD(v.planned_workshop_date), v.planned_inspection_date && esc(t('planned_inspection')) + (v.planned_inspection_kind ? ' ' + esc(v.planned_inspection_kind) : '') + ' ' + fmtD(v.planned_inspection_date), v.parts_expected_date && esc(t('parts_eta')) + ' ' + fmtD(v.parts_expected_date), v.notes_active && `<span class="chip">${esc(t('vnotes_n').replace('{n}', v.notes_active))}</span>`, v.open_recalls > 0 && `<span class="chip mittel">${esc(t('recall_open_n').replace('{n}', v.open_recalls))}</span>`, v.agent_findings_open > 0 && `<span class="chip ${v.agent_findings_critical > 0 ? 'kritisch' : 'mittel'}" data-af="${v.agent_findings_open}">${esc(t('vfind_n').replace('{n}', v.agent_findings_open))}${v.agent_findings_critical > 0 ? ' · ' + esc(t('vfind_crit').replace('{n}', v.agent_findings_critical)) : ''}</span>`].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>`, 'vehicles');
  $$('[data-vk]').forEach((b) => (b.onclick = () => { S.vehKind = b.dataset.vk; viewVehicles(); }));
  $$('[data-av]').forEach((b) => (b.onclick = () => { S.vehAvail = b.dataset.av; viewVehicles(); }));
  const vcsv = $('#vcsv'); if (vcsv) vcsv.onclick = async () => { try { download(await api('GET', '/api/vehicles?format=csv' + (inact ? '&inactive=1' : '')), `fuhrpark-fahrzeuge_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
  const vsite = $('#vsite'); if (vsite) vsite.onchange = () => { S.vehSite = vsite.value; viewVehicles(); };
  const vsort = $('#vsort'); if (vsort) vsort.onchange = () => { S.vehSort = sortPref('vehicles', VEH_SORTS, 'plate', VEH_SORTS.includes(vsort.value) ? vsort.value : 'plate'); viewVehicles(); };
  const ia = $('#inact'); if (ia) ia.onchange = () => { S.vehInactive = ia.checked; viewVehicles(); };
  const nvf = $('#nvf'); if (nvf) nvf.onsubmit = async (e) => { e.preventDefault(); try { const r = await saveVehicleForm(nvf); toast('✓'); location.hash = '#/vehicles/' + encodeURIComponent(r.id); } catch (err) { toast(err.message, true); } };
  // Ausdruck: gewählte Auswahl (Art, Verfügbarkeit, Standort, außer Betrieb), Suche, Sortierung und Anzahl sichtbarer Fahrzeuge
  const avLabel = av === 'all' ? '' : av === 'coupled_locked' ? t('av_coupled_locked') : av === 'with_notes' ? t('vnotes_with') : av === 'maint_overdue' ? t('av_maint_overdue') : av === 'recall_open' ? t('av_recall_open') : t('av_' + av);
  const vPrint = () => { const qq = $('#q').value.trim(); $('#vprl').innerHTML = printHead([
    `${t('print_filter')}: ${[inact ? t('inactive_vehicles') : '', f !== 'all' ? t('vk_' + f) : '', avLabel, site ? `${t('site')} ${site}` : ''].filter(Boolean).join(', ') || t('filter_all')}`,
    qq ? `${t('print_search')}: „${qq}“` : '', S.me.role !== 'driver' ? `${t('sort_by')}: ${t('vsort_' + so)}` : '', t('print_count').replace('{n}', $$('#vl a').filter((a) => !a.hidden).length)]); };
  vPrint();
  const vprt = $('#vprt'); if (vprt) vprt.onclick = () => window.print();
  $('#q').oninput = () => { const q = $('#q').value.toLowerCase().replace(/\s/g, ''); $$('#vl a').forEach((a) => (a.hidden = q && !a.dataset.s.replace(/\s/g, '').includes(q))); vPrint(); };
}
// Gespann (feste Kopplung laut Stammliste): Sperre/Werkstatt des gekoppelten Fahrzeugs anzeigen – nur Information
const coupledLockedText = (c) => `${t(c.kind === 'anhaenger' ? 'trailer' : 'truck')} ${c.plate}: ${t('locked')} – ${t('do_not_drive')}`;
function coupledLockedChip(c) {
  if (!c || !c.locked) return '';
  return `<span class="chip kritisch">${esc(coupledLockedText(c))}</span>`;
}
// Melde-/Kontrollformular: gesperrter Anhänger bzw. gesperrtes Zugfahrzeug des gewählten eigenen Fahrzeugs
const coupledAlert = (c) => (c && c.locked ? `<div class="alert" role="alert" style="margin-bottom:8px">${esc(coupledLockedText(c))}</div>` : '');
function coupledChip(c) {
  if (!c || !['gesperrt', 'werkstatt'].includes(c.availability)) return '';
  return `<span class="chip ${c.availability === 'gesperrt' ? 'kritisch' : 'mittel'}">${esc(t(c.kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(c.plate)}: ${esc(t('av_' + c.availability))}</span> `;
}
// Fälligkeit nach Kilometern: belegter Wert (due_km) oder letzte Durchführung in km + Intervall (gleiche Regel wie Server)
const fmtKm = (n) => fmtNum(n) + ' km';
const ruleDueKm = (m) => (m.due_km !== null && m.due_km !== undefined ? m.due_km : m.interval_km && m.last_done_km !== null && m.last_done_km !== undefined ? m.last_done_km + m.interval_km : null);
function kmDueHtml(m, latest) {
  const next = ruleDueKm(m);
  if (next === null) return '';
  const rest = latest ? next - latest.km : null;
  return `<div class="small" style="margin-top:4px">${esc(t('due_at_km'))} ${fmtKm(next)}${rest === null ? '' : `<br><b style="${rest < 0 ? 'color:var(--stop)' : ''}">${rest < 0 ? esc(t('km_over')) + ' ' + fmtKm(-rest) : esc(t('km_left')) + ' ' + fmtKm(rest)}</b>`}${m.km_forecast ? `<br>${kmFcHtml(m.km_forecast, true)}` : ''}</div>`;
}
// Prognose der km-Fälligkeit (Server: aus gespeicherten km-Ständen, nur Planungshilfe) – Begründung als Tooltip und für Screenreader
const kmFcHint = (fc) => t('km_forecast_hint').replace('{from}', fmtD(fc.from)).replace('{to}', fmtD(fc.to)).replace('{kpd}', fmtNum(fc.km_per_day));
// Listen: Begründung als Tooltip und für Screenreader; Fahrzeugakte (short): Begründung steht sichtbar in der Nachweiszeile darunter
const kmFcHtml = (fc, short = false) => `<span class="km-fc" title="${esc(kmFcHint(fc))}">${esc(t('km_forecast').replace('{d}', fmtD(fc.date)))}${short ? '' : `<span class="sr-only"> – ${esc(kmFcHint(fc))}</span>`}</span>`;

// HU/SP getrennt: letzte Prüfung, Fälligkeit (verbindlich/Prognose), Status, Nachweis, geplanter Termin (StVZO Anlage VIII, serverseitig berechnet)
const HS_CLS = { ok: 'ok', bald_faellig: 'mittel', ueberfaellig: 'kritisch', ungeklaert: 'mittel', nicht_sp_pflichtig: '', erste_sp_kuenftig: '' };
const mY = (d) => (d ? `${d.slice(5, 7)}/${d.slice(0, 4)}` : '–');
// HU/SP-Hinweis in der App-Sprache (Server liefert deutschen Text + Code mit Werten; Deutsch = Servertext)
function huNote(x, i) {
  const c = (x.note_codes || [])[i];
  if (!c || S.lang === 'de') return x.notes[i];
  const k = 'hn_' + c.code; const s = t(k);
  return s === k ? x.notes[i] : s.replace(/\{(\w+)\}/g, (m, n) => (n in (c.p || {}) ? String(c.p[n]) : m));
}
// Werkstattauftrag „Winterreifen“ (nur Leitung) im Reifenbereich der Fahrzeugakte: offener Auftrag als Link, sonst Formular
function winterOrderHtml(d) {
  const w = d.winter;
  if (w.open_order) return `<p class="small" id="wolink">🔧 <a href="#/cases/${esc(w.open_order.id)}">${esc(t('mo_open'))} ${esc(w.open_order.case_no)}</a></p>`;
  // Auftrag abgeschlossen, Winterlage laut Erfassung weiter offen (Server liefert closed_order nur dann)
  const closed = w.closed_order ? `<p class="panel warn small" id="woclosed">⚠ ${t('wo_closed_open').split(/(\{no\}|\{d\})/).map((x) => (x === '{no}' ? `<a href="#/cases/${esc(w.closed_order.id)}">${esc(w.closed_order.case_no)}</a>` : x === '{d}' ? fmtD(w.closed_order.closed_at) : esc(x))).join('')}</p>` : '';
  if (!isMgr() || !['nicht_erfuellt', 'unbekannt'].includes(w.status)) return closed;
  const site = (S.meta.workshops.find((x) => d.vehicle.site && x.name.toLowerCase().includes(String(d.vehicle.site).toLowerCase())) || {}).code;
  return `${closed}<details class="noprint" id="wodet"><summary>${esc(t(w.status === 'nicht_erfuellt' ? 'wo_create' : 'wo_create_check'))}</summary><form id="woform"><label>${esc(t('workshop'))}</label><select name="workshop_site">${S.meta.workshops.map((x) => `<option value="${esc(x.code)}"${x.code === site ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select><label>${esc(t('wo_date'))}</label><input type="date" name="planned_date" min="${bDate()}"><label>${esc(t('urgency'))}</label><select name="priority"><option value="niedrig">${esc(t('prio_niedrig'))}</option><option value="mittel">${esc(t('prio_mittel'))}</option></select><label>${esc(t('note'))}</label><input name="note" maxlength="300"><p class="small muted">${esc(t('wo_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('mo_create'))}</button></div></form></details>`;
}
// Werkstattauftrag aus Prüftermin (nur Leitung): offener Auftrag als Link, sonst Formular
function maintOrderHtml(rid, kind, orders, v) {
  if (!isMgr() || !rid) return '';
  const o = orders && orders.get(rid);
  if (o) return `<p class="small">🔧 <a href="#/cases/${esc(o.id)}">${esc(t('mo_open'))} ${esc(o.case_no)}</a> · ${esc(t('st_' + o.status))}</p>`;
  const site = (S.meta.workshops.find((w) => v && v.site && w.name.toLowerCase().includes(String(v.site).toLowerCase())) || {}).code;
  return `<details class="noprint"><summary>${esc(t('mo_create'))}</summary><form data-mord="${esc(rid)}"><label>${esc(t('workshop'))} (${esc(mk(kind))})</label><select name="workshop_site">${S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}</select><label>${esc(t('urgency'))}</label><select name="priority"><option value="niedrig">${esc(t('prio_niedrig'))}</option><option value="mittel">${esc(t('prio_mittel'))}</option></select><label>${esc(t('note'))}</label><input name="note" maxlength="300"><p class="small muted">${esc(t('mo_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('mo_create'))}</button></div></form></details>`;
}
const DEFECT_RESULTS = ['erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'];
// Durchführung einer Prüfregel (nicht HU/SP) erfassen; bei km-Intervall ist der km-Stand Pflicht (wie serverseitig)
function maintDoneForm(m) {
  return `<form data-mdone="${esc(m.id)}" hidden class="panel noprint"><h3 style="margin-top:0">${esc(t('done'))}: ${esc(mk(m.kind))}</h3><label>${esc(t('date'))} (${esc(mk(m.kind))})</label><input type="date" name="done_date" required value="${esc(bDate())}" max="${esc(bDate())}">${m.interval_km || ruleDueKm(m) !== null ? `<label>${esc(t('last_done_km'))}</label><input name="done_km" inputmode="numeric"${m.interval_km ? ' required' : ''}>` : ''}<label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" placeholder="${esc(t('evidence_ph'))}"><label>${esc(t('result'))}</label><select name="result"><option value="">–</option>${['ohne_maengel', 'geringe_maengel', 'erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'].map((r) => `<option value="${r}">${esc(t('res_' + r))}</option>`).join('')}</select><label>${esc(t('documented_due'))}</label><input type="date" name="next_due_date">${['HU', 'SP'].includes(m.kind) ? '' : `<label>${esc(t('due_km_doc'))}</label><input name="next_due_km" inputmode="numeric">`}<p class="small muted">${esc(t('mdone_hint'))}</p><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form>`;
}
// Werkstattauftrag zur Mängelbeseitigung aus einer Prüfung mit erheblichen/gefährlichen Mängeln (nur Inhaber/Fuhrparkleitung)
function defectOrderHtml(h, orders, v, sinceCase, released, superseded) {
  if (!isMgr() || !DEFECT_RESULTS.includes(h.result)) return '';
  const o = orders.get(h.id);
  if (!o && superseded) return ''; // neuere Durchführung derselben Prüfart eingetragen → Nachprüfung erledigt bzw. die neuere zählt
  if (o) return `<p class="small">🔧 <a href="#/cases/${esc(o.id)}">${esc(t('md_open'))} ${esc(o.case_no)}</a> · ${esc(t('st_' + o.status))}</p>`;
  if (released) return `<p class="small"><span class="chip mittel">${esc(t('todo_reinspection'))}</span> <a href="#/cases/${esc(released.id)}" style="white-space:nowrap">${esc(released.case_no)}</a> ${esc(t('released_short'))} ${fmtD(released.closed_at)}</p><p class="small muted">${esc(t('reinsp_hint'))}</p>`;
  const site = (S.meta.workshops.find((w) => v && v.site && w.name.toLowerCase().includes(String(v.site).toLowerCase())) || {}).code;
  const prio = h.result === 'erhebliche_maengel' ? 'mittel' : 'kritisch';
  const drv = h.result === 'verkehrsunsicher' ? 'nicht_fahrbereit' : 'unbekannt';
  return `<details class="noprint"${sinceCase ? '' : ' open'}><summary>${esc(t('md_create'))}</summary>${sinceCase ? '' : `<p class="small"><span class="chip mittel">${esc(t('md_no_case'))}</span></p>`}<form data-mdef="${esc(h.id)}"><label>${esc(t('workshop'))}</label><select name="workshop_site">${S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}</select><label>${esc(t('urgency'))}</label><select name="priority">${['niedrig', 'mittel', 'kritisch'].map((p) => `<option value="${p}"${p === prio ? ' selected' : ''}>${esc(t('prio_' + p))}</option>`).join('')}</select><label>${esc(t('driveable'))}</label><select name="driveability">${['unbekannt', 'fahrbereit', 'eingeschraenkt', 'nicht_fahrbereit'].map((p) => `<option value="${p}"${p === drv ? ' selected' : ''}>${esc(t('drv_' + p))}</option>`).join('')}</select><label>${esc(t('note'))}</label><input name="note" maxlength="300" placeholder="${esc(t('md_note_ph'))}"><p class="small muted">${esc(t('md_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('md_create'))}</button></div></form></details>`;
}
function huSpHtml(h, v, canEdit, orders) {
  const card = (k, x) => {
    const rid = h.rules[k];
    return `<section class="panel"><h3 style="margin-top:0">${k === 'HU' ? esc(t('hu_long')) : esc(t('sp_long'))} <span class="chip ${HS_CLS[x.status] || ''}">${esc(t('hs_' + x.status))}</span></h3>
      <dl class="kv"><dt>${esc(t('last_done'))}</dt><dd>${fmtD(x.last_done)}${x.last_result ? ` · ${esc(t('res_' + x.last_result))}` : ''}</dd>
      <dt>${esc(t('next_due'))}</dt><dd>${x.due ? `<b>${esc(t('due_until_end'))} ${mY(x.due)}</b> <span class="small muted">(${esc(t('db_' + x.due_basis))})</span>` : '–'}</dd>
      ${x.prognosis ? `<dt>${esc(t('prognosis'))}</dt><dd>${mY(x.prognosis)} <span class="small muted">(${esc(t('not_binding'))})</span></dd>` : ''}
      ${x.planned_date ? `<dt>${esc(t('planned_appt'))}</dt><dd>${fmtD(x.planned_date)}</dd>` : ''}
      <dt>${esc(t('evidence'))}</dt><dd>${esc(x.last_evidence || '–')}</dd></dl>
      ${x.notes && x.notes.length ? `<ul class="small" style="margin:8px 0 0 18px">${x.notes.map((n, i) => `<li>${esc(huNote(x, i))}</li>`).join('')}</ul>` : ''}
      ${canEdit && rid && x.status !== 'nicht_sp_pflichtig' ? `<details><summary>${esc(t('record_done'))}</summary><form data-hsdone="${esc(rid)}"><label>${esc(t('date'))}</label><input type="date" name="done_date" required max="${esc(bDate())}"><label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('evidence_ph'))}">
        <label>${esc(t('result'))}</label><select name="result"><option value="">–</option>${['ohne_maengel', 'geringe_maengel', 'erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'].map((r) => `<option value="${r}">${esc(t('res_' + r))}</option>`).join('')}</select>
        <label>${esc(t('documented_due'))}</label><input type="date" name="next_due_date"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
        <details><summary>${esc(t('plan_appt'))}</summary><form data-hsplan="${esc(rid)}"><label>${esc(t('planned_appt'))}</label><input type="date" name="planned_date" value="${esc(x.planned_date || '')}"><p class="small muted">${esc(t('plan_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>${maintOrderHtml(rid, k, orders, v)}` : ''}</section>`;
  };
  const clsList = v.kind === 'anhaenger' ? ['bis_3_5', '3_5_10', 'ueber_10'] : ['bis_3_5', '3_5_7_5', '7_5_12', 'ueber_12'];
  return `<h2>${esc(t('hu_sp'))}</h2><div class="grid2">${card('HU', h.hu)}${card('SP', h.sp)}</div>
    <p class="small muted">${esc(t('zgm'))}: ${v.zgm_kg ? `${fmtNum(v.zgm_kg)} kg` : v.zgm_class ? esc(t('zc_' + v.zgm_class)) : '–'} · ${esc(t('first_reg'))}: ${fmtD(v.first_registration)}${v.spec_source ? ` · ${esc(t('evidence'))}: ${esc(v.spec_source)}` : ''} · ${esc(h.rule_version)}</p>
    ${isMgr() ? `<details class="panel"><summary>${esc(t('edit_spec'))}</summary><form id="specf"><label>${esc(t('zgm'))} (kg, F.2)</label><input name="zgm_kg" inputmode="numeric" value="${esc(v.zgm_kg || '')}">
      <label>${esc(t('zgm_class'))}</label><select name="zgm_class"><option value="">–</option>${clsList.map((c) => `<option value="${c}"${v.zgm_class === c ? ' selected' : ''}>${esc(t('zc_' + c))}</option>`).join('')}</select>
      <label>${esc(t('first_reg'))} (B)</label><input type="date" name="first_registration" value="${esc(v.first_registration || '')}"><label>${esc(t('evidence'))}</label><input name="spec_source" required placeholder="${esc(t('spec_src_ph'))}">
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}`;
}
const VNOTES_MAX = 20; // wie Server NOTES_MAX_ACTIVE (src/vnotes.js)
// Hinweise zum Fahrzeug (angeheftet): eigene Abfrage nach dem Aufbau der Akte, Archiv auf Wunsch
async function loadVehicleNotes(vid, showArchive = false) {
  const box = $('#vnotes'); if (!box) return;
  const base = '/api/vehicles/' + encodeURIComponent(vid) + '/notes';
  let r; try { r = await api('GET', base); } catch { box.hidden = true; return; }
  const arr = showArchive ? await api('GET', base + '?archived=1').catch(() => ({ notes: [] })) : null; const ar = arr ? arr.notes : null;
  if (!box.isConnected) return; // Ansicht inzwischen gewechselt (z. B. Link angeklickt, während das Archiv lud)
  const nMax = r.max_active || VNOTES_MAX; // Höchstzahl aktiver Hinweise (Server NOTES_MAX_ACTIVE): voll → Hinweis statt Formular
  box.innerHTML = `<h3 style="margin-top:0">${esc(t('vnotes'))}${r.notes.length ? ` <span class="chip mittel">${r.notes.length}</span>` : ''}</h3>
    ${r.notes.length ? `<ul class="vnotes">${r.notes.map((n) => `<li><b>${esc(n.text)}</b>${n.for_driver ? ` <span class="chip">${esc(t('vnote_driver_chip'))}</span>` : ''}${n.valid_until ? ` <span class="chip">${esc(t('vnote_until').replace('{d}', fmtD(n.valid_until)))}</span>` : ''}<div class="small muted">${esc(pnm(n.created_by_name, n.created_by_name_hidden))} · ${fmtDT(n.created_at)}</div>${r.can_write ? `<button type="button" class="linkbtn noprint" data-arch="${esc(n.id)}">${esc(t('vnote_archive'))}</button>` : ''}</li>`).join('')}</ul>` : `<p class="small muted">${esc(t('vnotes_none'))}</p>`}
    ${r.can_write && r.notes.length >= nMax ? `<p class="small muted noprint" id="vnfull">${esc(t('vnotes_full').replace('{max}', nMax))}</p>` : ''}${r.can_write && r.notes.length < nMax ? `<details class="noprint"><summary>${esc(t('vnote_add'))}${r.notes.length >= nMax / 2 ? ` <span class="small muted" id="vnfree">(${esc(t('vnotes_free').replace('{n}', nMax - r.notes.length).replace('{max}', nMax))})</span>` : ''}</summary><form id="vnf"><label for="vnt">${esc(t('vnote_text'))}</label><textarea id="vnt" name="text" maxlength="500" required></textarea>
      <label class="check"><input type="checkbox" name="for_driver"> ${esc(t('vnote_for_driver'))}</label><label for="vnv">${esc(t('vnote_valid'))}<span class="hint">${esc(t('vnote_valid_hint'))}</span></label><input type="date" id="vnv" name="valid_until" style="max-width:220px"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}
    <p class="noprint"><button type="button" class="linkbtn" id="vnar">${esc(showArchive ? t('vnote_hide_archive') : t('vnote_show_archive'))}</button></p>
    ${ar ? (ar.length ? `<ul class="vnotes small muted">${ar.map((n) => `<li><s>${esc(n.text)}</s> · ${fmtDT(n.created_at)} – ${n.archived_at ? `${esc(t('vnote_archived'))} ${fmtDT(n.archived_at)}${n.archived_by_name ? ' · ' + esc(n.archived_by_name) : ''}` : esc(t('vnote_expired').replace('{d}', fmtD(n.valid_until)))}</li>`).join('')}</ul>${arr.truncated ? `<p class="small muted" id="vnartrunc">${esc(t('vnote_arch_truncated').replace('{n}', ar.length))} <a href="${tlHash(encodeURIComponent(vid), 'note')}">${esc(t('timeline'))}</a></p>` : ''}` : `<p class="small muted">–</p>`) : ''}`;
  $$('[data-arch]', box).forEach((b) => (b.onclick = async () => { try { await api('POST', `${base}/${b.dataset.arch}/archive`); loadVehicleNotes(vid, showArchive); } catch (err) { toast(err.message, true); } }));
  $('#vnar', box).onclick = () => loadVehicleNotes(vid, !showArchive);
  if ($('#vnf', box)) $('#vnf', box).onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.target);
    try { await api('POST', base, { text: fd.get('text'), for_driver: fd.get('for_driver') === 'on', valid_until: fd.get('valid_until') || null }); loadVehicleNotes(vid, showArchive); } catch (err) { toast(err.message, true); } };
}

async function viewVehicle(id, focusEv = null) {
  const d = await api('GET', '/api/vehicles/' + encodeURIComponent(id));
  const v = d.vehicle;
  const canMaint = isMgr() || S.me.role === 'workshop';
  const fi = d.failed_inspection; const fiHtml = fi ? `<div class="panel alert" role="alert" id="vfi"><b>${esc(t('dispo_insp_defects'))}</b><div>${esc(mk(fi.kind))} · ${fmtD(fi.done_date)} · <span class="chip kritisch">${esc(t('res_' + fi.result))}</span></div><div class="small">${esc(t('dispo_insp_hint'))}</div>${isMgr() ? `<div class="actions noprint"><button type="button" class="btn secondary" id="vfi-go">${esc(t('md_create'))}</button></div>` : ''}</div>` : '';
  // Offene Agentenbefunde dieses Fahrzeugs (Server liefert sie nur Inhaber/Fuhrparkleitung); bei kritischen aufgeklappt
  const AFS = { kritisch: 'kritisch', handeln: 'mittel', hinweis: '', info: '' };
  const af = d.agent_findings || [];
  const afHtml = af.length ? `<details class="panel" id="vaf"${af.some((f) => f.severity === 'kritisch') ? ' open' : ''}><summary><b>${esc(t('veh_findings'))}</b> <span class="chip ${AFS[af[0].severity]}">${af.length}</span></summary><div class="list" style="margin-top:8px">${af.map((f) => `<div class="row ${f.severity === 'kritisch' ? 'p-kritisch' : f.severity === 'handeln' ? 'p-mittel' : ''}"><span class="chip ${AFS[f.severity]}">${esc(t('asev_' + f.severity))}</span><span class="title" style="white-space:normal">${fcLabel(f.finding_code)}${esc(fMsg(f.message_args, f.message))}</span><span>${f.case_id ? `<a href="#/cases/${esc(f.case_id)}">${esc(t('details'))}</a>` : ''}</span><span class="sub" style="white-space:normal">${esc(translateNextAction(S.lang, f.next_action))} · ${esc(t('open_since'))} ${fmtDT(f.first_seen)}</span></div>`).join('')}</div><p class="small muted">${esc(t('veh_findings_hint'))} <a class="noprint" href="#/master?q=${encodeURIComponent(v.plate)}" id="vafm">${esc(t('nav_master'))} ›</a></p></details>` : '';
  // Prüfergebnis fehlt (in der App erfasste Pflichtprüfung ohne Ergebnis) – Knopf öffnet das Formular in „Bisherige Durchführungen“
  const rmHtml = (d.result_missing || []).length ? `<div class="panel" id="vrm"><b>${esc(t('dq_inspection_no_result'))}</b><div>${d.result_missing.map((r) => `${esc(mk(r.kind))} · ${fmtD(r.done_date)}`).join(' · ')}</div>${canMaint ? `<div class="actions noprint">${d.result_missing.map((r) => `<button type="button" class="btn secondary" data-rmgo="${esc(r.event_id)}">${esc(t('res_add_go'))}: ${esc(mk(r.kind))}</button>`).join('')}</div>` : ''}</div>` : '';
  let html = `<p class="noprint"><a href="#/vehicles">‹ ${esc(t('back'))}</a></p><div>${plate(v.plate, { big: true, locked: d.cases.some((c) => c.safety_lock && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)) })}</div>
    <h1 style="margin-top:12px">${esc(t('vehicle_file'))}</h1>${fiHtml}${rmHtml}${afHtml}<section class="panel"><dl class="kv"><dt>${esc(t('vin'))}</dt><dd>${esc(v.vin)}</dd><dt>${esc(t('manufacturer'))}</dt><dd>${esc(v.manufacturer || '–')} ${esc(v.model || '')}</dd><dt>${esc(t('year'))}</dt><dd>${esc(v.build_year || '–')}</dd><dt>${esc(t('site'))}</dt><dd>${esc(v.site || '–')}</dd><dt>${esc(t('vehicle_kind'))}</dt><dd>${esc(t('vk_' + (v.kind || 'lkw')))}</dd>${v.kind === 'anhaenger' ? `<dt>${esc(t('truck'))}</dt><dd>${(d.coupled || []).map((c) => `<a href="#/vehicles/${encodeURIComponent(c.id)}">${esc(c.plate)}</a>${c.locked ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}`).join(', ') || '–'}</dd>` : `<dt>${esc(t('trailer'))}</dt><dd>${(d.coupled || []).length ? d.coupled.map((c) => `<a href="#/vehicles/${encodeURIComponent(c.id)}">${esc(c.plate)}</a>${c.locked ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}`).join(', ') : esc(v.trailer_plate || '–')}</dd>`}<dt>${esc(t('km'))}</dt><dd>${d.odometer[0] ? fmtNum(d.odometer[0].km) + ' km · ' + fmtD(d.odometer[0].measured_at) : '–'}</dd>${v.kind !== 'anhaenger' ? `<dt>${esc(t('last_check'))}</dt><dd>${d.last_check ? `${fmtDT(d.last_check.created_at)} <span class="chip ${d.last_check.result === 'ok' ? 'ok' : 'kritisch'}">${d.last_check.result === 'ok' ? 'OK' : esc(t('defect'))}</span> <span class="small muted">${esc(pnm(d.last_check.performed_by_name, d.last_check.performed_by_name_hidden))}</span>` : esc(t('last_check_none'))}<div class="small muted">${esc(t('last_check_info'))}</div></dd>` : ''}</dl></section>`;
  if (!v.active) { const ia = d.inactive_info; html += `<div class="panel alert" data-inactive>${esc(t('vehicle_inactive'))}${ia ? `<div class="small">${esc(t('inactive_since'))} ${fmtDT(ia.since)}${ia.by_name ? ' · ' + esc(ia.by_name) : ''}${ia.reason ? ` · ${esc(t('inactive_reason'))}: ${esc(ia.reason)}` : ''}</div>` : ''}</div>`; }
  if (S.me.role !== 'driver') html += `<section class="panel" id="vnotes" aria-live="polite"></section>`;
  if (v.eval_excluded) html += `<div class="panel alert"><b>${esc(t('eval_excluded'))}</b> – ${esc(t('eval_excluded_hint'))}${v.eval_excluded_reason ? `<div class="small">${esc(v.eval_excluded_reason)}</div>` : ''}</div>`;
  html += `<p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · CEVIK ${esc(t('app'))} [CLAUDE]</p><div class="actions noprint"><a class="btn secondary" href="#/vehicles/${esc(v.id)}/timeline">${esc(t('timeline'))}</a><a class="btn secondary" href="#/emergency?v=${esc(v.id)}">☎ ${esc(t('em_title'))}</a>${isMgr() ? `<a class="btn secondary" href="#/vehicles/qr/${esc(v.id)}">${esc(t('qr_sticker'))}</a>` : ''}${S.me.role === 'owner' ? `<a class="btn secondary" href="#/audit?v=${esc(v.id)}" title="${esc(t('audit_veh_hint'))}">${esc(t('audit'))}</a>` : ''}<button type="button" class="btn secondary" id="prt">${esc(t('print'))}</button></div>`;
  if (isMgr()) html += `<details class="panel"><summary>${esc(t('edit_master'))}</summary><form id="evf">${vehicleForm(v)}<div class="actions"><button class="btn">${esc(t('save'))}</button>${v.active ? `<button type="button" class="btn secondary" id="deact">${esc(t('deactivate_vehicle'))}</button>` : `<button type="button" class="btn secondary" id="react">${esc(t('activate_vehicle'))}</button>`}<button type="button" class="btn secondary" id="evx">${esc(v.eval_excluded ? t('eval_include') : t('eval_exclude'))}</button></div></form></details>`;
  if (d.telematics && d.telematics.length) html += `<section class="panel"><h3 style="margin-top:0">${esc(t('tm_live'))}</h3>${d.telematics.map((x) => `${x.reported_plate ? `<p class="small" style="color:var(--stop)" data-tmmism>⚠ ${esc(t('dq_telematics_plate_mismatch'))}: ${esc(x.provider)} ${esc(x.external_id || '')} → ${esc(t('tm_reports'))} <b>${esc(x.reported_plate)}</b> · <a href="#/quality?f=telematics_plate_mismatch">${esc(t('show_in_dq'))} ›</a></p>` : ''}<dl class="kv"><dt>${esc(t('tm_source'))}</dt><dd>${esc(x.provider)} (${esc(x.match_basis === 'vin' ? 'FIN' : t('tm_mappings'))})</dd><dt>${esc(t('tm_time'))}</dt><dd>${fmtDT(x.gps_time || x.received_at)}${x.gps_time && tmAge(x.gps_time) ? ` <span class="chip">${esc(tmAge(x.gps_time))}</span>` : ''}</dd>${x.km !== null ? `<dt>${esc(t('km'))}</dt><dd>${fmtKm(x.km)}${x.km_rejected_below !== null && x.km_rejected_below !== undefined ? ` <span class="small" style="color:var(--mid)" data-tmkm>⚠ ${esc(t('tm_km_rejected').replace('{km}', fmtKm(x.km_rejected_below)))} · <a href="#/quality?f=telematics_km_rejected">${esc(t('show_in_dq'))} ›</a></span>` : ''}</dd>` : ''}${x.ignition !== null ? `<dt>${esc(t('tm_ignition'))}</dt><dd>${esc(t(x.ignition ? 'tm_on' : 'tm_off'))}</dd>` : ''}${x.lat !== null && x.lon !== null ? `<dt>${esc(t('tm_position'))}</dt><dd><a href="https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lon}#map=14/${x.lat}/${x.lon}" target="_blank" rel="noopener noreferrer">${x.lat.toFixed(4)}, ${x.lon.toFixed(4)}</a></dd>` : ''}</dl>`).join('')}</section>`;
  if (d.tacho) html += `<section class="panel"><h3 style="margin-top:0">${esc(t('tacho_vu'))}</h3><dl class="kv"><dt>${esc(t('tacho_last'))}</dt><dd>${d.tacho.last ? fmtD(d.tacho.last) : '–'}</dd><dt>${esc(t('tacho_due'))}</dt><dd>${d.tacho.due ? fmtD(d.tacho.due) + ' ' : ''}<span class="chip ${TST[d.tacho.status]}">${esc(t('tst_' + d.tacho.status))}</span></dd></dl>
    <form id="tvf" class="actions" style="flex-wrap:wrap;align-items:flex-end"><div><label>${esc(t('tacho_date'))}</label><input type="date" name="downloaded_on" required value="${bDate()}"></div><div style="flex:1;min-width:200px"><label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('tacho_ev_ph'))}"></div><button class="btn secondary">${esc(t('tacho_record'))}</button></form></section>`;
  if (d.costs) html += `<section class="panel"><h3>${esc(t('costs'))}</h3><dl class="kv"><dt>${esc(t('actual_cost'))}</dt><dd>${eurIst(d.costs)}</dd><dt>${esc(t('estimate'))}</dt><dd>${eur(d.costs.estimate_net)}</dd><dt>${esc(t('unvalued'))}</dt><dd>${d.costs.unvalued_items}</dd>${d.claims_summary && d.claims_summary.total ? `<dt>${esc(t('claims'))}</dt><dd>${d.claims_summary.total}${d.claims_summary.open ? ` · <a href="#/claims">${esc(t('claim_f_open'))}: ${d.claims_summary.open}</a>` : ''}${d.claims_summary.reimbursed_net !== null ? ` · ${esc(t('claim_reimbursed_short'))} ${eur(d.claims_summary.reimbursed_net)}` : ''}</dd>` : ''}</dl>${d.claims_summary && d.claims_summary.reimbursed_net !== null ? `<p class="small muted">${esc(t('vc_claims_rule'))}</p>` : ''}</section>`;
  if (d.warranties && d.warranties.length) html += `<section class="panel"><h3>${esc(t('vi_warranty'))}</h3><ul class="vnotes">${d.warranties.map((w) => `<li><a href="#/cases/${esc(w.case_id)}">${esc(w.case_no)}</a> · ${esc(w.item)}${w.item_kind === 'part' && w.supplier ? ` <span class="small muted">(${esc(w.supplier)})</span>` : ''}${warrChip(w.warranty_until)}</li>`).join('')}</ul>${d.warranties_truncated ? `<p class="small" role="note" data-warrmore>${esc(t('warr_more').replace('{n}', d.warranties_max))}</p>` : ''}</section>`;
  const mOrders = new Map(d.cases.filter((c) => c.maintenance_rule_id && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)).map((c) => [c.maintenance_rule_id, c]));
  if (d.hu_sp) html += huSpHtml(d.hu_sp, v, canMaint, mOrders);
  html += `<h2>${esc(t('maintenance'))}</h2>${d.maintenance.length ? `<div class="scroll"><table><thead><tr><th>${esc(t('kind'))}</th><th>${esc(t('last_done'))}</th><th>${esc(t('next_due'))}</th>${canMaint ? '<th></th>' : ''}</tr></thead><tbody>${d.maintenance.map((m) => { const rcDone = m.kind === 'Rückruf' && !!m.last_done_date; const rcOpen = m.kind === 'Rückruf' && !m.last_done_date; const days = m.next_due_date ? Math.round((Date.parse(m.next_due_date) - Date.now()) / 86400000) : null; return `<tr><td>${esc(mk(m.kind))}</td><td>${m.last_done_date || m.last_done_km === null || m.last_done_km === undefined ? fmtD(m.last_done_date) : ''}${m.last_done_km !== null && m.last_done_km !== undefined && !['HU', 'SP'].includes(m.kind) ? `${m.last_done_date ? '<br>' : ''}<span class="small">${fmtKm(m.last_done_km)}</span>` : ''}</td><td>${m.next_due_date ? `<span class="chip ${days < 0 ? 'kritisch' : days < 30 ? 'mittel' : ''}">${fmtD(m.next_due_date)}</span>` : rcDone ? `<span class="chip">${esc(t('ms_erledigt'))}</span>` : rcOpen ? `<span class="chip mittel">${esc(t('vi_recall_open'))}</span>` : (ruleDueKm(m) !== null ? '' : '–')}${kmDueHtml(m, d.odometer[0])}</td>${canMaint ? `<td>${rcDone ? '' : `<button class="btn secondary" data-done="${esc(m.id)}" aria-expanded="false">${esc(t('done'))}</button>`}</td>` : ''}</tr><tr><td colspan="${canMaint ? 4 : 3}" class="small muted" style="border-top:0;padding-top:0">${esc(t('evidence'))}: ${esc(m.evidence)}${m.km_forecast ? `<br>${esc(kmFcHint(m.km_forecast))}` : ''}${m.planned_date ? ` · <b>${esc(t('planned_appt'))} ${fmtD(m.planned_date)}</b>` : ''}${canMaint && !rcDone && !['HU', 'SP'].includes(m.kind) ? `<details class="noprint"><summary>${esc(t('plan_appt'))}</summary><form data-hsplan="${esc(m.id)}"><label>${esc(t('planned_appt'))} (${esc(mk(m.kind))})</label><input type="date" name="planned_date" value="${esc(m.planned_date || '')}"><p class="small muted">${esc(t('plan_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>` : ''}${!rcDone && !['HU', 'SP'].includes(m.kind) ? maintOrderHtml(m.id, m.kind, mOrders, v) : ''}</td></tr>`; }).join('')}</tbody></table></div>${canMaint ? d.maintenance.filter((m) => !(m.kind === 'Rückruf' && m.last_done_date)).map(maintDoneForm).join('') : ''}` : '<p class="muted">–</p>'}`;
  if (d.maintenance_history && d.maintenance_history.length) {
    const evOrders = new Map(d.cases.filter((c) => c.maintenance_event_id && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)).map((c) => [c.maintenance_event_id, c]));
    const yearAgo = bDate(-365);
    const caseSince = (h) => d.cases.some((c) => c.status !== 'abgelehnt' && c.created_at >= h.done_date);
    // Mängelauftrag freigegeben, aber keine neuere Durchführung derselben Prüfart → Nachprüfung eintragen (gleiche Regel wie der Server)
    const releasedFor = (h) => {
      if (!DEFECT_RESULTS.includes(h.result) || h.done_date < yearAgo || evOrders.has(h.id)) return null;
      if (d.maintenance_history.some((e) => e.id !== h.id && e.kind === h.kind && (e.done_date > h.done_date || (e.done_date === h.done_date && e.created_at > h.created_at)))) return null;
      return d.cases.filter((c) => c.maintenance_event_id === h.id && c.status === 'fahrzeug_freigegeben').sort((a, b) => String(b.closed_at).localeCompare(String(a.closed_at)))[0] || null;
    };
    // Nachprüfung = nächste spätere Durchführung derselben Prüfart (gleiche Regel wie Nachweisliste/Server); umgekehrt: vorherige Prüfung mit Mängeln
    const later = (a, b) => b.done_date > a.done_date || (b.done_date === a.done_date && b.created_at > a.created_at);
    const nextOf = (h) => d.maintenance_history.filter((e) => e.id !== h.id && e.kind === h.kind && later(h, e)).sort((a, b) => (later(a, b) ? -1 : 1))[0] || null;
    const prevOf = (h) => d.maintenance_history.filter((e) => e.id !== h.id && e.kind === h.kind && later(e, h)).sort((a, b) => (later(a, b) ? 1 : -1))[0] || null;
    const resChip = (r) => `<span class="chip ${DEFECT_RESULTS.includes(r) ? 'kritisch' : r === 'ohne_maengel' ? 'ok' : ''}">${esc(t('res_' + r))}</span>`;
    const reinspHtml = (h) => {
      if (DEFECT_RESULTS.includes(h.result)) {
        const n = nextOf(h);
        return `<p class="small" data-reinsp="${esc(h.id)}">${esc(t('mh_reinsp'))}: ${n ? `${fmtD(n.done_date)}${n.result ? ' ' + resChip(n.result) : ` <span class="muted">(${esc(t('res_none'))})</span>`}${n.result && DEFECT_RESULTS.includes(n.result) ? ` <span class="chip kritisch">${esc(t('reinsp_again'))}</span>` : ''}` : `<span class="muted">${esc(t('mh_reinsp_none'))}</span>`}</p>`;
      }
      const p = prevOf(h);
      return p && DEFECT_RESULTS.includes(p.result) ? `<p class="small muted" data-reinsp-of="${esc(p.id)}">${esc(t('reinsp_of'))} ${fmtD(p.done_date)}</p>` : '';
    };
    // Prüfergebnis nachtragen: nur an der neuesten Durchführung ihrer Art ohne Ergebnis (wird serverseitig nie überschrieben)
    const resAddHtml = (h) => canMaint && !h.result && !nextOf(h) ? `<details class="noprint"><summary>${esc(t('res_add'))}</summary><form data-resadd="${esc(h.id)}"><label>${esc(t('result'))} (${esc(mk(h.kind))} ${fmtD(h.done_date)})</label><select name="result" required><option value="">–</option>${['ohne_maengel', 'geringe_maengel', 'erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'].map((r) => `<option value="${r}">${esc(t('res_' + r))}</option>`).join('')}</select><label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('res_add_ph'))}"><p class="small muted">${esc(t('res_add_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>` : '';
    const pending = d.maintenance_history.some((h) => DEFECT_RESULTS.includes(h.result) && h.done_date >= yearAgo && ((!caseSince(h) && !nextOf(h)) || releasedFor(h)));

    html += `<details class="panel" id="mhist"${pending && isMgr() ? ' open' : ''}><summary>${esc(t('maint_history'))} (${d.maintenance_history.length}${d.maintenance_history_truncated ? '+' : ''})</summary>${d.maintenance_history_truncated ? `<p class="small muted" id="mhisttrunc">${esc(t('maint_hist_truncated').replace('{n}', d.maintenance_history.length))} <a href="${tlHash(v.id, 'maintenance')}">${esc(t('timeline'))}</a></p>` : ''}<div class="list">${d.maintenance_history.map((h) => `<div class="row"><span class="chip">${fmtD(h.done_date)}</span><span class="title">${esc(mk(h.kind))}${h.done_km !== null ? ' · ' + fmtKm(h.done_km) : ''}</span>${h.result ? `<span class="chip ${DEFECT_RESULTS.includes(h.result) ? 'kritisch' : h.result === 'ohne_maengel' ? 'ok' : ''}">${esc(t('res_' + h.result))}</span>` : '<span></span>'}<span class="sub" style="white-space:normal">${esc(h.evidence)}${h.recorded_by_name ? ' · ' + esc(h.recorded_by_name) : ''}</span></div>${reinspHtml(h)}${resAddHtml(h)}${defectOrderHtml(h, evOrders, v, caseSince(h), releasedFor(h), !!nextOf(h))}`).join('')}</div></details>`;
  }
  if (canMaint) html += `<details class="panel"><summary>${esc(t('add_rule'))}</summary><form id="mf"><label>${esc(t('kind'))}</label><select name="kind">${S.meta.maintenance_kinds.map((k) => `<option value="${esc(k)}">${esc(mk(k))}</option>`).join('')}</select><label>${esc(t('last_done'))}</label><input type="date" name="last_done_date" max="${esc(bDate())}"><label>${esc(t('interval_months'))}</label><input name="interval_months" inputmode="numeric"><label>${esc(t('next_due'))}</label><input type="date" name="next_due_date"><label>${esc(t('last_done_km'))}</label><input name="last_done_km" inputmode="numeric"><label>${esc(t('interval_km'))}</label><input name="interval_km" inputmode="numeric"><label>${esc(t('due_km_doc'))}</label><input name="due_km" inputmode="numeric"><label>${esc(t('evidence'))}</label><input name="evidence" required><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
  if (d.documents) {
    const canDoc = ['owner', 'fleet', 'workshop'].includes(S.me.role);
    html += `<h2>${esc(t('documents'))}</h2>${d.documents.length ? `<div class="list">${d.documents.map((f) => `<a class="row" href="${fileUrl(f.id)}" target="_blank" rel="noopener"><span class="chip">${esc(t('dk_' + (f.doc_kind || 'sonstiges')))}</span><span class="title">${esc(f.filename)}</span><span class="small muted">${Math.max(1, Math.round(f.size / 1024))} KB</span><span class="sub">${[f.doc_valid_until && `${esc(t('valid_until'))} ${fmtD(f.doc_valid_until)}`, f.doc_note && esc(f.doc_note), fmtD(f.created_at), esc(f.uploaded_by_name)].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>` : `<p class="muted">–</p>`}
      ${canDoc && d.documents.length >= VEH_DOCS_MAX ? `<p class="small muted noprint" id="docfull">${esc(t('docs_full').replace('{max}', VEH_DOCS_MAX))}</p>` : ''}${canDoc && d.documents.length < VEH_DOCS_MAX ? `<details class="panel noprint"><summary>${esc(t('add_document'))}${d.documents.length >= VEH_DOCS_MAX / 2 ? ` <span class="small muted" id="docfree">(${esc(t('files_free').replace('{n}', VEH_DOCS_MAX - d.documents.length).replace('{max}', VEH_DOCS_MAX))})</span>` : ''}</summary><form id="docf"><label>${esc(t('doc_kind'))}</label><select name="kind">${(S.meta.doc_kinds || []).map((k) => `<option value="${k}">${esc(t('dk_' + k))}</option>`).join('')}</select><label>${esc(t('note'))}</label><input name="note" maxlength="200"><label>${esc(t('valid_until'))}<span class="hint">${esc(t('valid_until_hint'))}</span></label><input type="date" name="valid_until"><label>${esc(t('file'))}<span class="hint">PDF, JPG, PNG, WEBP · max. 5 MB</span></label><input type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp" required><div class="actions"><button class="btn">${esc(t('upload'))}</button></div></form></details>` : ''}`;
  }
  if (d.contracts) html += ctSection(d.contracts, d.documents || null);
  html += `<h2>${esc(t('tires'))}</h2><div id="tires"><p class="muted">${esc(t('loading'))}</p></div>`;
  html += `<h2>${esc(t('nav_cases'))}</h2>${caseList(d.cases.map((c) => ({ ...c, plate: v.plate })))}`;
  if (d.recurring_defects && d.recurring_defects.length) html += `<section class="panel"><h2 style="margin-top:0">${esc(t('recurring_defects'))}</h2><p class="small muted">${esc(t('recurring_hint'))}</p><ul>${d.recurring_defects.map((r) => `<li><b>${esc(checkLabel(r.item))}</b>: ${r.n}× · ${esc(t('last_used'))} ${fmtD(r.last_at)}</li>`).join('')}</ul></section>`;
  if (d.inspections.length) html += `<h2>${esc(t('inspections'))}</h2><div class="list">${d.inspections.map((i) => `<div class="row"><span class="chip ${i.result === 'ok' ? 'ok' : 'kritisch'}">${i.result === 'ok' ? 'OK' : esc(t('defect'))}</span><span class="title">${esc(i.kind === 'abfahrt' ? t('departure_check') : t('inspection'))}</span><span>${i.odometer_km ? fmtNum(i.odometer_km) + ' km' : ''}</span><span class="sub">${fmtDT(i.created_at)} · ${esc(pnm(i.performed_by_name, i.performed_by_name_hidden))}</span></div>`).join('')}</div>${d.inspections_truncated ? `<p class="small muted" id="insptrunc">${esc(t('insp_truncated').replace('{n}', d.inspections.length))} <a href="${tlHash(v.id, 'inspection')}">${esc(t('timeline'))}</a></p>` : ''}`;
  if (isMgr()) {
    html += `<h2>${esc(t('drivers'))}</h2>${d.drivers.length ? `<div class="list">${d.drivers.map((r) => `<div class="row"><span>${esc(r.display_name)}</span><span class="small muted">${fmtD(r.valid_from)} – ${r.valid_to ? fmtD(r.valid_to) : ''}</span>${!r.valid_to ? `<button class="btn secondary" data-end="${esc(r.id)}" data-name="${esc(r.display_name)}">${esc(t('end'))}</button>` : '<span></span>'}</div>`).join('')}</div>` : ''}
      <form id="df"><div class="actions"><select name="user_id" id="drvsel" style="max-width:300px" aria-label="${esc(t('assign_driver'))}"></select><button class="btn secondary">${esc(t('assign_driver'))}</button></div><label class="small"><input type="checkbox" id="endprev" checked> ${esc(t('end_previous'))}</label></form>`;
  }
  html += `<details class="panel"><summary>${esc(t('add_km'))}</summary><form id="kf"><label>${esc(t('km'))}</label><input name="km" inputmode="numeric" required style="max-width:200px"><label>${esc(t('km_date'))}<span class="hint">${esc(t('km_date_hint'))}</span></label><input type="date" name="measured_on" max="${bDate()}" style="max-width:200px"><div id="kmnote" hidden><label>${esc(t('km_reason'))}</label><input name="note" maxlength="300"></div><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>`;
  if (canMaint) html += `<section class="panel noprint"><h3>${esc(t('ai'))}</h3><div id="ai"></div><button class="btn secondary" id="aib">${esc(t('ai_run'))}</button></section>`;
  render(html, isMgr() ? 'master' : 'vehicles');
  if ($('#vnotes')) loadVehicleNotes(v.id);

  renderTires(id, $('#tires'));
  if (d.contracts) bindCtSection(id, () => viewVehicle(id));
  const prt = $('#prt'); if (prt) prt.onclick = () => window.print();
  const docf = $('#docf'); if (docf) docf.onsubmit = async (e) => {
    e.preventDefault(); const file = docf.file.files[0]; if (!file) return;
    try { const blob = file.type === 'application/pdf' ? file : await prepareUpload(file); const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/documents?kind=${encodeURIComponent(docf.kind.value)}&note=${encodeURIComponent(docf.note.value)}${docf.valid_until.value ? '&valid_until=' + docf.valid_until.value : ''}`, blob, { headers: { 'x-filename': encodeURIComponent(file.name), 'content-type': blob.type || 'application/octet-stream' } }); toast(r.duplicate ? t('doc_duplicate') : '✓'); viewVehicle(id); } catch (err) { toast(err.message, true); }
  };
  const evf = $('#evf'); if (evf) evf.onsubmit = async (e) => { e.preventDefault(); try { await saveVehicleForm(evf); toast('✓'); viewVehicle(id); } catch (err) { toast(err.message, true); } };
  // Sprung von der Startseite „Prüfergebnis fehlt“ bzw. Knopf in der Akte: Prüfhistorie und Formular „Ergebnis nachtragen“ der Durchführung öffnen
  const openResAdd = (evId, smooth) => { const rf = document.querySelector(`[data-resadd="${CSS.escape(evId)}"]`); const mh = $('#mhist'); if (rf && mh) { mh.open = true; const dt = rf.closest('details'); dt.open = true; dt.style.scrollMarginTop = '90px'; dt.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' }); const sel = rf.querySelector('select'); if (sel) sel.focus({ preventScroll: true }); } };
  if (focusEv) openResAdd(focusEv, false);
  $$('[data-rmgo]').forEach((b) => (b.onclick = () => openResAdd(b.dataset.rmgo, true)));
  const vfiGo = $('#vfi-go'); if (vfiGo) vfiGo.onclick = () => { const mh = $('#mhist'); if (mh) { mh.open = true; mh.style.scrollMarginTop = '90px'; mh.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  const evx = $('#evx'); if (evx) evx.onclick = async () => { let reason = null; if (!v.eval_excluded) { reason = prompt(t('deactivate_reason')); if (!reason) return; } try { await api('POST', `/api/vehicles/${encodeURIComponent(id)}/evaluation`, { excluded: !v.eval_excluded, reason }); toast('✓'); viewVehicle(id); } catch (err) { toast(err.message, true); } };
  const deact = $('#deact'); if (deact) deact.onclick = async () => { const reason = prompt(t('deactivate_reason')); if (!reason) return; try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/active`, { active: false, reason }); const hints = [r.running_contracts ? t('ct_running_deact').replace('{n}', r.running_contracts) : '', r.telematics_devices ? t('tm_devices_deact').replace('{n}', r.telematics_devices) : ''].filter(Boolean); if (hints.length) toast(hints.join(' · '), true); else toast('✓'); viewVehicle(id); } catch (err) { toast(err.message, true); } };
  const react = $('#react'); if (react) react.onclick = async () => { try { await api('POST', `/api/vehicles/${encodeURIComponent(id)}/active`, { active: true }); toast('✓'); viewVehicle(id); } catch (err) { toast(err.message, true); } };
  const mf = $('#mf'); if (mf) mf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(mf)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; try { await api('POST', `/api/vehicles/${encodeURIComponent(id)}/maintenance`, b); viewVehicle(id); } catch (err) { toast(err.message, true); } };
  // Erledigt (UVV, Tachograph, Ausrüstung …): Formular statt Browser-Abfragen – Datum, ggf. km, Nachweis, optional Ergebnis und belegte nächste Fälligkeit
  $$('[data-done]').forEach((b) => (b.onclick = () => {
    const fm = $(`form[data-mdone="${b.dataset.done}"]`); if (!fm) return;
    fm.hidden = !fm.hidden; b.setAttribute('aria-expanded', String(!fm.hidden)); if (!fm.hidden) { fm.scrollIntoView({ block: 'nearest' }); fm.done_date.focus(); }
  }));
  $$('form[data-mdone]').forEach((fm) => (fm.onsubmit = async (e) => {
    e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k];
    fm.querySelector('button.btn').disabled = true;
    try { await api('POST', `/api/maintenance/${fm.dataset.mdone}/complete`, b); toast('✓'); viewVehicle(id); } catch (err) { fm.querySelector('button.btn').disabled = false; toast(err.message, true); }
  }));
  // HU/SP: Durchführung mit Prüfergebnis, Werkstatttermin planen, Fahrzeugdaten (zGM/Erstzulassung)
  $$('form[data-hsdone]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; try { await api('POST', `/api/maintenance/${fm.dataset.hsdone}/complete`, b); toast('✓'); viewVehicle(id); } catch (err) { toast(err.message, true); } }));
  $$('form[data-resadd]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); fm.querySelector('button').disabled = true; try { await api('POST', `/api/maintenance/events/${fm.dataset.resadd}/result`, b); toast('✓'); viewVehicle(id); } catch (err) { fm.querySelector('button').disabled = false; toast(err.message, true); } }));
  $$('form[data-mdef]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); fm.querySelector('button').disabled = true; try { const r = await api('POST', `/api/maintenance/events/${fm.dataset.mdef}/order`, { ...b, request_key: fm.dataset.key || (fm.dataset.key = uid()) }); toast('✓ ' + r.case_no); location.hash = '#/cases/' + r.id; } catch (err) { fm.querySelector('button').disabled = false; toast(err.message, true); } }));
  $$('form[data-mord]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); fm.querySelector('button').disabled = true; try { const r = await api('POST', `/api/maintenance/${fm.dataset.mord}/order`, { ...b, request_key: fm.dataset.key || (fm.dataset.key = uid()) }); toast('✓ ' + r.case_no); location.hash = '#/cases/' + r.id; } catch (err) { fm.querySelector('button').disabled = false; toast(err.message, true); } }));
  $$('form[data-hsplan]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); try { await api('POST', `/api/maintenance/${fm.dataset.hsplan}/plan`, { planned_date: fm.planned_date.value || null }); toast('✓'); viewVehicle(id); } catch (err) { toast(err.message, true); } }));
  const spf = $('#specf'); if (spf) spf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(spf)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; try { await api('POST', `/api/vehicles/${encodeURIComponent(id)}/spec`, b); toast('✓'); viewVehicle(id); } catch (err) { toast(err.message, true); } };
  const kf = $('#kf'); if (kf) kf.onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/odometer`, { km: kf.km.value, measured_on: kf.measured_on.value || null, note: kf.note.value || null }); if (r.warning) toast(r.warning, true); viewVehicle(id); }
    catch (err) { toast(err.message, true); if (err.code === 'km_not_plausible') { $('#kmnote').hidden = false; kf.note.required = true; kf.note.focus(); } }
  };
  const tvf = $('#tvf'); if (tvf) tvf.onsubmit = async (e) => { e.preventDefault(); try { await api('POST', '/api/tacho/downloads', { kind: 'massenspeicher', vehicle_id: id, ...Object.fromEntries(new FormData(tvf)) }); toast('✓'); viewVehicle(id); } catch (err) { toast(err.message, true); } };
  const df = $('#df');
  if (df) {
    const us = (await api('GET', '/api/users')).users.filter((u) => u.role === 'driver' && u.active);
    $('#drvsel').innerHTML = us.map((u) => `<option value="${esc(u.id)}">${esc(u.display_name)}</option>`).join('');
    df.onsubmit = async (e) => { e.preventDefault(); try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/drivers`, { user_id: $('#drvsel').value, end_previous: $('#endprev').checked }); if (r.ended_previous.length) toast(`${t('ended_assignment')}: ${r.ended_previous.join(', ')}`); else if (r.other_open.length) toast(`${t('also_assigned')}: ${r.other_open.join(', ')}`, true); viewVehicle(id); } catch (err) { toast(err.message, true); } };
  }
  // Zuordnung beenden wirkt auf die Fahrerermittlung (Bußgelder) – nachfragen
  $$('[data-end]').forEach((b) => (b.onclick = async () => { if (!confirm(t('end_assign_confirm').replace('{name}', b.dataset.name).replace('{plate}', d.vehicle.plate))) return; try { await api('DELETE', '/api/assignments/' + b.dataset.end); viewVehicle(id); } catch (err) { toast(err.message, true); } }));
  const aib = $('#aib'); if (aib) aib.onclick = async () => {
    aib.disabled = true; $('#ai').innerHTML = `<p class="muted">${esc(t('loading'))}</p>`;
    try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/ai`); $('#ai').innerHTML = r.suggestion ? `<p style="white-space:pre-wrap">${esc(r.suggestion)}</p><p class="small muted">${esc(r.disclaimer)}</p>` : `<p class="muted">${esc(r.message || '–')}</p>`; }
    catch (err) { $('#ai').innerHTML = `<p class="muted">${esc(err.message)}</p>`; }
    aib.disabled = false;
  };
}


// ---------- Fahrzeugverträge (Leasing/Miete/…; nur Inhaber/Fuhrparkleitung) ----------
const CT_KINDS = ['leasing', 'miete', 'finanzierung', 'versicherung', 'wartung', 'sonstiges'];
const CT_CLS = { handeln: 'kritisch', hinweis: 'mittel', ok: 'ok', beendet: '' };
const ctChip = (s) => `<span class="chip ${CT_CLS[s.overall]}">${esc(t('cs_' + s.overall))}</span>`;
function ctLines(c) {
  const s = c.status; const out = [];
  if (c.start_date || c.end_date) out.push(`${c.start_date ? `${esc(t('ct_start'))}: ${fmtD(c.start_date)} · ` : ''}${esc(t('ct_end'))}: ${c.end_date ? `<b>${fmtD(c.end_date)}</b>` : '–'}${s.end && s.end.status === 'abgelaufen' ? ` <span class="chip kritisch" style="white-space:normal">${esc(t('ct_overdue'))}</span>` : s.end && s.end.status === 'laeuft_aus' ? ` <span class="chip mittel">${esc(t('cs_hinweis'))}</span>` : ''}`);
  if (s.notice) out.push(`${esc(t('ct_notice_by'))}: <b>${fmtD(s.notice.by)}</b> · ${esc(t('ct_notice'))}: ${esc(String(c.notice_months))}${s.notice.status === 'bald' ? ` <span class="chip mittel">${esc(t('cs_hinweis'))}</span>` : s.notice.status === 'verstrichen' ? ` <span class="chip">${esc(t('ct_notice_passed'))}</span>` : ''}`);
  if (s.km) {
    if (s.km.driven !== undefined) out.push(`${esc(t('ct_km_allow'))}: ${fmtKm(c.km_allowance)} · ${esc(t('ct_driven'))}: ${fmtKm(s.km.driven)} · ${esc(t('ct_left'))}: ${fmtKm(Math.max(0, s.km.remaining))}${s.km.status === 'ueber' ? ` <span class="chip kritisch">${esc(t('ct_km_over'))}</span>` : ''}${s.km.forecast_driven ? `<br>${esc(t('ct_forecast'))}: <span class="chip ${s.km.status === 'prognose_ueber' ? 'mittel' : ''}">≈ ${fmtKm(s.km.forecast_driven)}</span> <span class="small muted">(${esc(t('ct_forecast_hint'))})</span>` : ''}`);
    else out.push(`${esc(t('ct_km_allow'))}: ${fmtKm(c.km_allowance)} · <span class="muted">${esc(t('ct_km_none'))}</span>`);
  }
  if (c.monthly_rate_net !== null) out.push(`${esc(t('ct_rate'))}: ${eur(c.monthly_rate_net)}`);
  out.push(`<span class="small muted">${esc(t('evidence'))}: ${esc(c.evidence)}${c.note ? ' · ' + esc(c.note) : ''}</span>`);
  if (c.ended_on) out.push(`<span class="small">${esc(t('ct_ended_on'))} ${fmtD(c.ended_on)}${c.end_note ? ' · ' + esc(c.end_note) : ''}</span>`);
  return out;
}
function ctForm(c = {}, docs = null) {
  const v = (k) => (c[k] === null || c[k] === undefined ? '' : esc(String(c[k])));
  // Vertragsdokument: Auswahl aus der Dokumentablage des Fahrzeugs (nur angezeigte Umgebung); liegt die Verknüpfung in der anderen Umgebung, bleibt sie unverändert (Feld fehlt)
  const docSel = docs && !c.file_other_env ? `<label>${esc(t('ct_doc'))}<span class="hint">${esc(t('ct_doc_hint'))}</span></label><select name="file_id"><option value="">${esc(t('ct_doc_none'))}</option>${docs.map((f) => `<option value="${esc(f.id)}"${c.file_id === f.id ? ' selected' : ''}>${esc(t('dk_' + (f.doc_kind || 'sonstiges')))} · ${esc(f.filename)} · ${fmtD(f.created_at)}</option>`).join('')}</select>` : '';
  return `<label>${esc(t('ct_kind'))}</label><select name="kind">${CT_KINDS.map((k) => `<option value="${k}"${c.kind === k ? ' selected' : ''}>${esc(t('ck_' + k))}</option>`).join('')}</select>
    <label>${esc(t('ct_partner'))}</label><input name="partner" required maxlength="120" value="${v('partner')}"><label>${esc(t('ct_no'))}</label><input name="contract_no" maxlength="60" value="${v('contract_no')}">
    <label>${esc(t('ct_start'))}</label><input type="date" name="start_date" value="${v('start_date')}"><label>${esc(t('ct_end'))}</label><input type="date" name="end_date" value="${v('end_date')}">
    <label>${esc(t('ct_notice'))}</label><input name="notice_months" inputmode="numeric" value="${v('notice_months')}"><label>${esc(t('ct_km_allow'))}</label><input name="km_allowance" inputmode="numeric" value="${v('km_allowance')}">
    <label>${esc(t('ct_start_km'))}<span class="hint">${esc(t('ct_start_km_hint'))}</span></label><input name="start_km" inputmode="numeric" value="${v('start_km')}"><label>${esc(t('ct_rate'))}</label><input name="monthly_rate_net" inputmode="decimal" value="${c.monthly_rate_net === null || c.monthly_rate_net === undefined ? '' : esc(String(c.monthly_rate_net).replace('.', ','))}">
    <label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" value="${v('evidence')}"><label>${esc(t('note'))}</label><input name="note" maxlength="1000" value="${v('note')}">${docSel}`;
}
const ctDocLine = (c) => (c.file_id ? `<div><a href="${fileUrl(c.file_id)}" target="_blank" rel="noopener">📎 ${esc(t('ct_doc'))}: ${esc(c.file_name)}</a></div>` : c.file_other_env ? `<div class="small muted">📎 ${esc(t('ct_doc_other_env'))}</div>` : c.ended_on ? '' : `<div class="small muted">${esc(t('ct_doc_missing'))}</div>`);
const ctBody = (fm) => { const b = Object.fromEntries(new FormData(fm)); for (const k of Object.keys(b)) if (b[k] === '') b[k] = null; return b; };
function ctSection(list, docs = null) {
  return `<h2>${esc(t('ct_title'))}</h2>${list.length ? list.map((c) => `<section class="panel ${c.status.overall === 'handeln' ? 'p-kritisch' : ''}"><p style="margin-top:0"><b>${esc(t('ck_' + c.kind))}</b> · ${esc(c.partner)}${c.contract_no ? ' · ' + esc(c.contract_no) : ''} ${ctChip(c.status)}</p>${ctLines(c).map((x) => `<div>${x}</div>`).join('')}${ctDocLine(c)}
    ${c.ended_on ? '' : `<details class="noprint"><summary>${esc(t('ct_edit'))}</summary><form data-ctedit="${esc(c.id)}">${ctForm(c, docs)}<div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>
    <details class="noprint"><summary>${esc(t('ct_end_btn'))}</summary><form data-ctend="${esc(c.id)}"><label>${esc(t('ct_ended_on'))}</label><input type="date" name="ended_on" max="${bDate()}" value="${bDate()}"><label>${esc(t('ct_end_reason'))}</label><input name="end_note" required maxlength="300"><p class="small muted">${esc(t('ct_ended_note'))}</p><div class="actions"><button class="btn secondary">${esc(t('ct_end_btn'))}</button></div></form></details>`}</section>`).join('') : `<p class="muted">${esc(t('ct_none'))}</p>`}
    <details class="panel noprint"><summary>${esc(t('ct_add'))}</summary><p class="small muted">${esc(t('ct_hint'))}</p><form id="ctf">${ctForm({}, docs)}<div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
}
function bindCtSection(id, reload) {
  const f = $('#ctf'); if (f) f.onsubmit = async (e) => { e.preventDefault(); try { await api('POST', `/api/vehicles/${encodeURIComponent(id)}/contracts`, ctBody(f)); toast('✓'); reload(); } catch (err) { toast(err.message, true); } };
  $$('form[data-ctedit]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); try { await api('PATCH', `/api/contracts/${fm.dataset.ctedit}`, ctBody(fm)); toast('✓'); reload(); } catch (err) { toast(err.message, true); } }));
  $$('form[data-ctend]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); try { await api('POST', `/api/contracts/${fm.dataset.ctend}/end`, ctBody(fm)); toast('✓'); reload(); } catch (err) { toast(err.message, true); } }));
}
async function viewContracts() {
  const f = S.ctFilter || 'aktiv'; const k = S.ctKind || '';
  const cts = vsDef('ctSite') || ''; const sq = cts ? '&site=' + encodeURIComponent(cts) : '';
  const r = await api('GET', `/api/contracts?filter=${f}${k ? '&kind=' + k : ''}${sq}`);
  render(`<h1>${esc(t('ct_title'))}</h1>${helpLink('contracts')}<p class="small muted">${esc(t('ct_hint'))}</p>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · ${esc(t('cf_' + f))}${k ? ' · ' + esc(t('ck_' + k)) : ''}${r.site ? ' · ' + esc(r.site === 'ohne' ? t('cs_nosite') : r.site) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="actions noprint" style="flex-wrap:wrap">${['aktiv', 'aktion', 'beendet', 'alle'].map((x) => `<button type="button" class="btn ${f === x ? '' : 'secondary'}" data-cf="${x}">${esc(t('cf_' + x))} (${r.counts[x]})</button>`).join('')}</div>
    <div class="actions noprint" style="margin-top:0"><select id="ctk" aria-label="${esc(t('ct_kind'))}" style="max-width:260px"><option value="">${esc(t('ct_all_kinds'))}</option>${CT_KINDS.map((x) => `<option value="${x}"${k === x ? ' selected' : ''}>${esc(t('ck_' + x))}</option>`).join('')}</select></div>
    ${(r.site_options || []).length > 1 || r.site ? `<div class="actions noprint" style="margin-top:0"><div>${siteSelect('ctsite', '', r.site_options, r.site, t('kpi_vsite'), t('filter_all'))}</div></div>` : ''}
    ${f !== 'beendet' ? `<p>${esc(t('ct_rate_sum'))}: <b>${eur(r.monthly_rate_sum_net)}</b>${r.unrated ? ` <span class="small muted">· ${r.unrated} ${esc(t('ct_unrated'))}</span>` : ''}</p>` : ''}
    <div class="list">${r.contracts.length ? r.contracts.map((c) => `<a class="row ${c.status.overall === 'handeln' ? 'p-kritisch' : c.status.overall === 'hinweis' ? 'p-mittel' : ''}" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${plate(c.plate)}<span class="title">${esc(t('ck_' + c.kind))} · ${esc(c.partner)}</span>${ctChip(c.status)}<span class="sub" style="white-space:normal">${ctLines(c).slice(0, -1).join(' · ').replace(/<br>/g, ' · ')}${c.file_id ? ` · 📎 ${esc(t('ct_doc_linked'))}` : ''}</span></a>`).join('') : `<p class="muted">${esc(t('ct_none'))}</p>`}</div>
    <div class="actions noprint"><button type="button" class="btn secondary" id="ctcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="ctics" title="${esc(t('ct_ics_hint'))}">${esc(t('export_ics'))}</button><button type="button" class="btn secondary" id="ctprt">${esc(t('print'))}</button></div>
    <details class="panel noprint"><summary>${esc(t('ct_import'))}</summary><p class="small muted">${esc(t('ct_import_hint'))}</p>
      <label for="ctsrc">${esc(t('ct_import_src'))}</label><input id="ctsrc" maxlength="300"><input type="file" id="ctimp" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('ct_import'))}" style="margin-top:8px"><div id="ctimpr"></div></details>`, 'more');
  $$('[data-cf]').forEach((b) => (b.onclick = () => { S.ctFilter = b.dataset.cf; viewContracts(); }));
  $('#ctk').onchange = () => { S.ctKind = $('#ctk').value; viewContracts(); };
  const ctsEl = $('#ctsite'); if (ctsEl) ctsEl.onchange = () => { S.ctSite = ctsEl.value; viewContracts(); };
  $('#ctprt').onclick = () => window.print();
  const inp = $('#ctimp');
  inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    const text = await readCsvFile(file); const src = $('#ctsrc').value.trim(); const q = src ? `&source=${encodeURIComponent(src)}` : '';
    const show = (x, applied) => {
      const box = $('#ctimpr'); if (!box) return;
      box.innerHTML = `<p><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(t('ia_neu'))}: ${x.counts.neu} · ${esc(t('ct_known'))}: ${x.counts.vorhanden} · ${esc(t('skipped'))}: ${x.counts.uebersprungen}</p>
        ${x.rows.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('line'))}</th><th>${esc(t('vehicle'))}</th><th>${esc(t('ct_kind'))}</th><th>${esc(t('ct_partner'))}</th><th>${esc(t('ct_end'))}</th><th></th></tr></thead><tbody>${x.rows.map((r) => `<tr><td>${r.line}</td><td style="white-space:nowrap">${esc(r.plate)}</td><td>${esc(t('ck_' + r.kind))}</td><td>${esc(r.partner)}${r.contract_no ? ' · ' + esc(r.contract_no) : ''}</td><td>${fmtD(r.end_date)}</td><td><span class="chip ${r.status === 'neu' ? 'ok' : ''}">${esc(r.status === 'neu' ? t('ia_neu') : t('ct_known'))}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${x.skipped.length ? `<details ${applied ? '' : 'open'}><summary>${esc(t('skipped'))} (${x.skipped.length})</summary><ul class="small">${x.skipped.map((y) => `<li>${esc(t('line'))} ${y.line}: ${esc(reasonText(y.reason))}</li>`).join('')}</ul></details>` : ''}
        ${!applied && x.counts.neu ? `<div class="actions"><button type="button" class="btn" id="ctapply">${esc(t('apply_import'))}</button></div>` : ''}`;
      stackTables(box);
      const ap = $('#ctapply');
      if (ap) ap.onclick = async () => { ap.disabled = true; try { const done = await api('POST', '/api/contracts/import' + (q ? '?' + q.slice(1) : ''), text, { headers: { 'content-type': 'text/csv' } }); toast('✓'); await viewContracts(); const d = $('#ctimpr'); if (d) { d.closest('details').open = true; show(done, true); } } catch (err) { ap.disabled = false; toast(err.message, true); } };
    };
    try { show(await api('POST', '/api/contracts/import?dry_run=1' + q, text, { headers: { 'content-type': 'text/csv' } }), false); } catch (err) { toast(err.message, true); }
  };
  $('#ctics').onclick = async () => { try { download(await api('GET', `/api/contracts?format=ics&filter=aktiv${k ? '&kind=' + k : ''}${sq}`), `fuhrpark-vertraege_${r.today}${r.site ? '_' + fnPart(r.site) : ''}.ics`); } catch (err) { toast(err.message, true); } };
  $('#ctcsv').onclick = async () => { try { download(await api('GET', `/api/contracts?format=csv&filter=${f}${k ? '&kind=' + k : ''}${sq}`), `fuhrpark-vertraege_${r.today}${r.site ? '_' + fnPart(r.site) : ''}.csv`); } catch (err) { toast(err.message, true); } };
}

// Reifenalter in Monaten → „6 J. 9 Mon.“ bzw. „9 Mon.“
const tireAge = (m) => (m === null || m === undefined ? '' : m >= 12 ? t('tire_age_years').replace('{y}', Math.floor(m / 12)).replace('{m}', m % 12) : t('tire_age_months').replace('{n}', m));
async function renderTires(id, el) {
  let d;
  try { d = await api('GET', `/api/vehicles/${encodeURIComponent(id)}/tires`); } catch (e) { el.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
  const canWrite = ['owner', 'fleet', 'workshop'].includes(S.me.role);
  const stCls = { ok: 'ok', warnung: 'mittel', unter_minimum: 'kritisch', unbekannt: '' };
  const wCls = { erfuellt: 'ok', nicht_erfuellt: 'kritisch', unbekannt: 'mittel' };
  el.innerHTML = `<section class="panel"><h3>${esc(t('tire_sizes'))}</h3>${d.specs.length ? d.specs.map((s) => `<div class="specrow"><div><span class="muted">${esc(t('axle_' + s.axle))}</span> <b>${esc(s.size)}</b></div><div>${s.verified ? `<span class="chip ok">${esc(t('verified'))}</span>` : `<span class="chip mittel">${esc(t('source_unverified'))}</span>`}${canWrite && !s.verified ? ` <button class="btn secondary small" data-ver="${esc(s.axle)}" data-size="${esc(s.size)}">${esc(t('mark_verified'))}</button>` : ''}</div></div>`).join('') : '<p class="muted">–</p>'}</section>
    ${d.winter && d.winter.status !== 'nicht_pflichtig' ? `<section class="panel" id="twinter"><h3>${esc(t('winter_title'))} <span class="chip ${wCls[d.winter.status]}">${esc(t('ws_' + d.winter.status))}</span></h3>${d.winter.noncompliant.length ? `<p><b>${esc(t('winter_bad').replace('{p}', d.winter.noncompliant.join(', ')))}</b></p>` : ''}${d.winter.missing.length ? `<p>${esc(t('winter_missing').replace('{p}', d.winter.missing.join(', ')))}</p>` : ''}<p class="small muted">${esc(t('winter_rule'))}</p>${winterOrderHtml(d)}</section>` : ''}
    <section class="panel"><h3>${esc(t('positions'))}</h3>${d.positions.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('position'))}</th><th>${esc(t('tread'))}</th><th></th></tr></thead><tbody>${d.positions.map((p) => `<tr><td><b>${esc(p.position)}</b><div class="small muted">${esc(t('te_' + p.last_event))} · ${fmtD(p.last_event_at)}</div>${p.dot ? `<div class="small${p.age_warn ? '' : ' muted'}">DOT ${esc(p.dot)} · ${esc(t('tire_age'))} ${esc(tireAge(p.age_months))}${p.age_warn ? ` <span class="chip mittel">${esc(t('tire_age_warn').replace('{y}', d.warn_age_years))}</span>` : ''}</div>` : ''}</td><td>${p.tread_mm === null ? '–' : esc(fmtNum(p.tread_mm))}</td><td><span class="chip ${stCls[p.status]}">${esc(t('ts_' + p.status))}</span>${p.winter_mark ? `<div style="margin-top:4px"><span class="chip ${p.winter_mark === '3pmsf' ? 'ok' : 'kritisch'}" style="white-space:normal" title="${esc(t('winter_mark'))}">❄ ${esc(t('wm_' + p.winter_mark))}</span></div>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">–</p>'}
    <details><summary>${esc(t('record_tire'))}</summary><form id="tf">
      <label>${esc(t('kind'))}</label><select name="event_type">${S.meta.tire_events.filter((e) => canWrite || ['messung', 'sichtpruefung'].includes(e)).map((e) => `<option value="${e}">${esc(t('te_' + e))}</option>`).join('')}</select>
      <label>${esc(t('position'))}</label><select name="position">${(d.allowed_positions || S.meta.tire_positions).map((p) => `<option>${esc(p)}</option>`).join('')}</select>
      <details id="tfmore"><summary class="small">${esc(t('tire_more_pos'))}</summary><p class="small muted">${esc(t('tire_more_pos_hint'))}</p><div class="tfpos">${(d.allowed_positions || S.meta.tire_positions).map((p) => `<label class="check"><input type="checkbox" name="positions" value="${esc(p)}"> ${esc(p)}</label>`).join('')}</div></details>
      <label>${esc(t('tread'))}</label><input name="tread_mm" inputmode="decimal"><label>${esc(t('pressure'))}</label><input name="pressure_bar" inputmode="decimal">
      <label>${esc(t('tire_sizes'))}</label><input name="size" placeholder="315/70 R22.5"><label>${esc(t('brand'))}</label><input name="brand"><label>${esc(t('dot'))}</label><input name="dot" inputmode="numeric">
      <label>${esc(t('winter_mark'))}</label><select name="winter_mark"><option value="">${esc(t('wm_none'))}</option>${(S.meta.tire_winter_marks || []).map((w) => `<option value="${w}">${esc(t('wm_' + w))}</option>`).join('')}</select>
      <label>${esc(t('km'))}</label><input name="odometer_km" inputmode="numeric"><label>${esc(t('note'))}</label><input name="note">
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details></section>
    ${d.history.length ? `<details class="panel"><summary>${esc(t('history'))} (${d.history.length}${d.history_truncated ? '+' : ''})</summary>${d.history_truncated ? `<p class="small muted" id="tiretrunc">${esc(t('tire_hist_truncated').replace('{n}', d.history.length))} <a href="${tlHash(id, 'tire')}">${esc(t('timeline'))}</a></p>` : ''}<table>${d.history.map((h) => `<tr><td class="small">${fmtDT(h.created_at)}</td><td>${esc(h.position)}</td><td>${esc(t('te_' + h.event_type))}${h.tread_mm !== null ? ' · ' + esc(fmtNum(h.tread_mm)) + ' mm' : ''}${h.pressure_bar !== null ? ' · ' + esc(fmtNum(h.pressure_bar)) + ' bar' : ''}${h.size ? ' · ' + esc(h.size) : ''}${h.brand ? ' · ' + esc(h.brand) : ''}${h.winter_mark ? ' · ' + esc(t('wm_' + h.winter_mark)) : ''}${h.note ? '<br><span class="small muted">' + esc(h.note) + '</span>' : ''}</td><td class="small">${esc(pnm(h.recorded_by_name, h.recorded_by_name_hidden))}</td></tr>`).join('')}</table></details>` : ''}`;
  stackTables(el);
  const tf = $('#tf', el);
  tf.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(tf); const b = Object.fromEntries(fd);
    for (const k of Object.keys(b)) if (b[k] === '') delete b[k];
    b.positions = fd.getAll('positions'); if (!b.positions.length) delete b.positions;
    try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/tires/events`, b); (r.warnings || []).forEach((w) => toast(w, true)); if (!r.warnings || !r.warnings.length) toast(r.positions && r.positions.length > 1 ? '✓ ' + r.positions.join(', ') : '✓'); renderTires(id, el); }
    catch (err) { toast(err.message, true); }
  };
  if ($('#woform', el)) $('#woform', el).onsubmit = async (e) => { e.preventDefault(); const fm = e.target; const b = Object.fromEntries(new FormData(fm)); if (!b.planned_date) delete b.planned_date; fm.querySelector('button').disabled = true;
    try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/tires/winter-order`, { ...b, request_key: fm.dataset.key || (fm.dataset.key = uid()) }); toast('✓ ' + r.case_no); renderTires(id, el); } catch (err) { fm.querySelector('button').disabled = false; toast(err.message, true); } };
  $$('[data-ver]', el).forEach((b) => (b.onclick = async () => { try { await api('POST', `/api/vehicles/${encodeURIComponent(id)}/tires/specs`, { axle: b.dataset.ver, size: b.dataset.size, verified: true }); renderTires(id, el); } catch (err) { toast(err.message, true); } }));
}


async function loadStockSelect(c) {
  const el = $('#stocksel'); if (!el) return;
  let items = [];
  try { items = (await api('GET', `/api/stock?site=${encodeURIComponent(c.workshop_site || '')}`)).items.filter((i) => i.site === c.workshop_site && i.on_hand > 0); } catch { return; }
  if (!items.length) return;
  el.innerHTML = `<label>${esc(t('from_stock'))}</label><select name="stock_item_id"><option value="">${esc(t('without_stock'))}</option>${items.map((i) => `<option value="${esc(i.id)}">${esc(i.name)}${i.part_number ? ' · ' + esc(i.part_number) : ''} (${i.on_hand} ${esc(i.unit)})</option>`).join('')}</select>`;
  const sel = $('select', el);
  sel.onchange = () => { const fp = $('#freepart'); fp.querySelector('[name=name]').required = !sel.value; $$('[name=name],[name=part_number],[name=supplier]', fp).forEach((x) => { x.disabled = !!sel.value; }); };
}

async function viewStock() {
  try { sessionStorage.removeItem('cfp_sj_item'); } catch { /* egal */ } // Artikelfilter des Journals gilt nur für den Weg aus der Artikelakte
  const stockResp = await api('GET', '/api/stock'); const items = stockResp.items; const lastInv = stockResp.last_inventory || {};
  const sites = S.me.role === 'workshop' ? S.meta.workshops.filter((w) => w.code === S.me.workshop_site) : S.meta.workshops;
  // Ausdruck der Lagerliste: genau die angezeigten Artikel (Suche/Filter) samt Lagerwert-Zeile; Auswahl im Vermerk (#sprsel)
  render(`<h1>${esc(t('stock'))}</h1>${printHead([S.me.role === 'workshop' ? `${t('workshop')}: ${wsName(S.me.workshop_site)}` : ''])}<p class="print-only small" id="sprsel"></p>${helpLink('stock')}
    <details class="panel noprint"><summary>${esc(t('new_item'))}</summary><form id="nf">
      ${sites.length > 1 ? `<label>${esc(t('workshop'))}</label><select name="site">${sites.map((w) => `<option value="${esc(w.code)}">${esc(w.name)}</option>`).join('')}</select>` : ''}
      <label>${esc(t('part_name'))}</label><input name="name" required><label>${esc(t('part_number'))}</label><input name="part_number">
      <label>${esc(t('unit'))}</label><input name="unit" value="Stk"><label>${esc(t('initial_qty'))}</label><input name="initial_qty" inputmode="decimal">
      <label>${esc(t('min_qty'))}</label><input name="min_qty" inputmode="decimal"><label>${esc(t('storage'))}</label><input name="location">
      <label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    <div class="actions"><button type="button" class="btn secondary" id="scsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="sprt">${esc(t('print'))}</button><a class="btn secondary" href="#/stock/journal">${esc(t('stock_journal'))}</a><a class="btn secondary" href="#/stock/asof" id="sasof">${esc(t('asof_title'))}</a><a class="btn secondary" href="#/stock/reorder">${esc(t('reorder'))}${items.some((i) => i.below_min) ? ` <span class="chip mittel">${items.filter((i) => i.below_min).length}</span>` : ''}</a></div>
    ${items.length ? `<details class="panel noprint" id="inv"><summary>${esc(t('inventory'))}</summary><p class="small muted">${esc(t('inventory_hint'))}</p>
      ${sites.length > 1 ? `<label for="invsite">${esc(t('workshop'))}</label><select id="invsite">${sites.map((w) => `<option value="${esc(w.code)}">${esc(w.name)}</option>`).join('')}</select>` : ''}
      <p class="small" id="invlast"></p><p class="noprint actions"><a class="btn secondary" href="#/stock/count" id="invsheet">${esc(t('count_sheet'))}</a><a class="btn secondary" href="#/stock/journal" id="invdiffs">${esc(t('inventory_diffs'))}</a></p><div id="invdraft"></div><div id="invlist"></div><label for="invnote">${esc(t('note'))}</label><input id="invnote" maxlength="300">
      <div class="actions"><button type="button" class="btn secondary" id="invchk">${esc(t('inventory_check'))}</button><button type="button" class="btn" id="invbook" disabled>${esc(t('inventory_book'))}</button></div><div id="invres"></div></details>` : ''}
    <div class="noprint"><input id="q" placeholder="${esc(t('part_name'))} / ${esc(t('part_number'))}" aria-label="${esc(t('part_name'))} / ${esc(t('part_number'))}" style="margin-bottom:8px">
    <label for="sf">${esc(t('stock_filter'))}</label><select id="sf"><option value="">${esc(t('all'))}</option><option value="min">${esc(t('below_min'))}</option><option value="180">${esc(t('stock_idle').replace('{d}', 180))}</option><option value="365">${esc(t('stock_idle').replace('{d}', 365))}</option><option value="c365">${esc(t('count_age_n').replace('{n}', 365))}</option></select></div>
    <p class="small muted" id="sfsum" hidden></p>
    <div class="list" id="sl">${items.map((i) => `<a class="row ${i.below_min ? 'p-mittel' : ''}" href="#/stock/${esc(i.id)}" data-s="${esc(helpNorm(i.name + ' ' + (i.part_number || '')))}" data-id="${esc(i.id)}"><span class="chip">${esc(i.site)}</span><span class="title">${esc(i.name)}</span><b>${i.on_hand} ${esc(i.unit)}</b><span class="sub">${[i.part_number && esc(i.part_number), i.location && esc(i.location), i.below_min && esc(t('below_min')) + ' (' + i.min_qty + ')', i.unit_price_net !== null && eur(i.unit_price_net), esc(t('last_out')) + ': ' + (i.last_out_date ? esc(fmtD(i.last_out_date)) : esc(t('never')))].filter(Boolean).join(' · ')}</span></a>`).join('') || `<p class="muted">–</p>`}</div>`, 'more');
  // Filter: unter Mindestbestand bzw. „ohne Entnahme seit N Tagen“ (nur Artikel mit Bestand; nie entnommen zählt mit) bzw. „nicht gezählt seit 365 Tagen“ – nur Anzeige
  const byId = new Map(items.map((i) => [i.id, i]));
  const applyStock = () => {
    const q = helpNorm($('#q').value); const f = $('#sf').value; // Umlaute/ue gleich: „bremsbelaege“ findet „Bremsbeläge“
    const cut = /^\d+$/.test(f) ? bDate(-Number(f)) : null;
    const hit = (i) => (!f || (f === 'min' ? i.below_min : f === 'c365' ? !i.last_counted_date || i.last_counted_date <= bDate(-365) : i.on_hand > 0 && (!i.last_out_date || i.last_out_date < cut)));
    const shown = [];
    $$('#sl a').forEach((a) => { const i = byId.get(a.dataset.id); a.hidden = !!((q && !a.dataset.s.includes(q)) || !hit(i)); if (!a.hidden) shown.push(i); });
    // Summe der angezeigten Artikel: Bestand × hinterlegter Artikelpreis (netto); Artikel mit Bestand ohne Preis = unbewertet (nie 0 €), ohne bewertbaren Artikel „–“
    const sum = $('#sfsum'); sum.hidden = !shown.length;
    const stocked = shown.filter((i) => i.on_hand > 0); const priced = stocked.filter((i) => i.unit_price_net !== null);
    const v = priced.length ? eur(Math.round(priced.reduce((a, i) => a + i.on_hand * i.unit_price_net, 0) * 100) / 100) : '–';
    const unv = stocked.length - priced.length ? ` (${stocked.length - priced.length} ${t('unvalued_short')})` : '';
    const qv = $('#q').value.trim(); const sfo = $('#sf').selectedOptions[0];
    $('#sprsel').textContent = [`${t('print_filter')}: ${f && sfo ? sfo.textContent : t('all')}`, qv ? `${t('print_search')}: „${qv}“` : ''].filter(Boolean).join(' · ');
    sum.textContent = cut ? t('stock_idle_sum').replace('{n}', shown.length).replace('{v}', v) + unv : t('stock_value_sum').replace('{n}', shown.length).replace('{v}', v) + unv;
  };
  $('#q').oninput = applyStock; $('#sf').onchange = applyStock; applyStock(); // Lagerwert gleich beim Öffnen
  $('#sprt').onclick = () => window.print();
  $('#scsv').onclick = async () => { try { download(await api('GET', '/api/stock?format=csv'), `fuhrpark-lager_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
  if ($('#inv')) {
    // „Inventurdifferenzen“: Lagerjournal mit Auswahl Inventur, letzte 12 Monate, aktuelles Inventurlager
    $('#invdiffs').onclick = () => { try { sessionStorage.setItem('cfp_sj_type', 'inventur'); sessionStorage.setItem('cfp_sj_from', bDate(-364)); sessionStorage.setItem('cfp_sj_to', bDate()); sessionStorage.setItem('cfp_sj_site', $('#invsite') ? $('#invsite').value : ''); } catch { /* ohne Speicher: Standardzeitraum */ } };
    const invSite = () => ($('#invsite') ? $('#invsite').value : sites[0] && sites[0].code);
    const fill = () => { const li = lastInv[invSite()]; $('#invlast').textContent = li ? t('inventory_last').replace('{d}', fmtDT(li.at)).replace('{c}', li.counted ?? '–').replace('{x}', li.differences ?? '–') : t('inventory_last_none');
      $('#invbook').textContent = t('inventory_book');
      $('#invlist').innerHTML = `<div class="scroll"><table><thead><tr><th>${esc(t('part_name'))}</th><th>${esc(t('inventory_book_qty'))}</th><th>${esc(t('inventory_counted'))}</th></tr></thead><tbody>${items.filter((i) => i.site === invSite()).map((i) => `<tr><td>${esc(i.name)}${i.location ? `<div class="small muted">${esc(i.location)}</div>` : ''}<div class="small muted" data-lc>${esc(i.last_counted_date ? t('last_counted') + ': ' + fmtD(i.last_counted_date) : t('never_counted'))}</div></td><td>${i.on_hand} ${esc(i.unit)}</td><td><input data-inv="${esc(i.id)}" inputmode="decimal" style="max-width:110px" aria-label="${esc(t('inventory_counted'))} ${esc(i.name)}"></td></tr>`).join('')}</tbody></table></div>`; $('#invbook').disabled = true; $('#invres').innerHTML = ''; invPrev = null;
      // Zählmengen nach der Prüfung geändert → erst erneut prüfen (gebucht wird nur, was geprüft wurde)
      // Entwurf der Zählmengen auf diesem Gerät (je Person/Umgebung/Lager, 14 Tage): Wegklicken oder Neuladen verliert keine Zählung
      const dr = invDraft.load(); let restored = 0;
      if (dr) for (const x of $$('[data-inv]')) if (typeof dr.counts[x.dataset.inv] === 'string' && dr.counts[x.dataset.inv] !== '') { x.value = dr.counts[x.dataset.inv]; restored++; }
      if (dr && dr.note && !$('#invnote').value) $('#invnote').value = dr.note;
      $('#invdraft').innerHTML = restored ? `<div class="panel" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span class="small" style="flex:1 1 200px">${esc(t('inventory_draft').replace('{n}', restored).replace('{d}', fmtDT(dr.at)))}</span><button type="button" class="btn secondary" id="invdx">${esc(t('inventory_draft_discard'))}</button></div>` : '';
      const dx = $('#invdx'); if (dx) dx.onclick = () => { if (!confirm(t('inventory_draft_discard_confirm'))) return; invDraft.clear(); $('#invnote').value = ''; fill(); };
      $$('[data-inv]').forEach((x) => (x.oninput = () => { invDraft.save(); if (invPrev) { invPrev = null; $('#invbook').disabled = true; $('#invres').innerHTML = `<p class="small muted">${esc(t('inventory_recheck'))}</p>`; } })); };
    let invPrev = null;
    const invDraft = {
      key: () => `cfp_inv_${S.me.id}_${S.viewEnv && S.me.role === 'owner' ? S.viewEnv : S.me.environment}_${invSite()}`,
      load() { try { const d = JSON.parse(localStorage.getItem(this.key()) || 'null'); return d && d.counts && Date.now() - Date.parse(d.at) < 14 * 86400000 ? d : null; } catch { return null; } },
      save() { try { const counts = {}; for (const x of $$('[data-inv]')) if (x.value.trim() !== '') counts[x.dataset.inv] = x.value.trim(); if (Object.keys(counts).length) localStorage.setItem(this.key(), JSON.stringify({ at: new Date().toISOString(), note: $('#invnote').value, counts })); else localStorage.removeItem(this.key()); } catch {} },
      clear() { try { localStorage.removeItem(this.key()); } catch {} },
    };
    $('#invnote').oninput = () => invDraft.save();
    fill(); if ($('#invsite')) $('#invsite').onchange = fill;
    const body = () => ({ site: invSite(), note: $('#invnote').value || null, counts: $$('[data-inv]').map((x) => ({ item_id: x.dataset.inv, counted: x.value.trim() === '' ? '' : x.value.replace(',', '.') })) });
    const show = (r, booked) => { $('#invres').innerHTML = r.differences.length ? `<div class="list">${r.differences.map((d) => `<div class="row ${booked ? '' : 'p-mittel'}"><span class="title">${esc(d.name)}</span><b>${d.delta > 0 ? '+' : ''}${d.delta} ${esc(d.unit)}</b><span class="sub" style="white-space:normal">${esc(t('inventory_book_qty'))} ${d.book} → ${esc(t('inventory_counted'))} ${d.counted}</span></div>`).join('')}</div>` : `<p>${esc(t('inventory_no_diff'))}</p>`; };
    $('#invchk').onclick = async () => { try { const r = await api('POST', '/api/stock/inventory?dry_run=1', body()); show(r, false); invPrev = r.differences; $('#invbook').disabled = !(r.counted > 0); $('#invbook').textContent = t(r.differences.length ? 'inventory_book' : 'inventory_close'); } catch (err) { toast(err.message, true); } };
    $('#invbook').onclick = async () => {
      if (!invPrev) return;
      if (!confirm(invPrev.length ? t('inventory_book_confirm').replace('{n}', invPrev.length) : t('inventory_close_confirm'))) return;
      try { const r = await api('POST', '/api/stock/inventory', { ...body(), preview: invPrev.map((d) => ({ item_id: d.item_id, book: d.book, counted: d.counted })) }); invDraft.clear(); toast(r.booked ? `✓ ${r.booked}` : t('inventory_closed')); viewStock(); }
      catch (err) { toast(err.message, true); if (err.code === 'inventory_changed') { invPrev = null; $('#invbook').disabled = true; $('#invres').innerHTML = `<p class="small muted">${esc(t('inventory_recheck'))}</p>`; } }
    };
  }
  $('#nf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k of Object.keys(b)) { if (b[k] === '') delete b[k]; else if (['initial_qty', 'min_qty', 'unit_price_net'].includes(k)) b[k] = b[k].replace(',', '.'); } try { await api('POST', '/api/stock', b); viewStock(); } catch (err) { toast(err.message, true); } };
}

// Zählliste für die Inventur (Ausdruck zum Ausfüllen): je Lager nach Lagerort/Artikel, standardmäßig ohne Buchbestand (Blindzählung)
async function viewStockCount() {
  const sites = S.me.role === 'workshop' ? S.meta.workshops.filter((w) => w.code === S.me.workshop_site) : S.meta.workshops;
  const site = S.countSite && sites.some((w) => w.code === S.countSite) ? S.countSite : (sites[0] && sites[0].code) || '';
  const withBook = !!S.countBook;
  const sr = site ? await api('GET', '/api/stock?site=' + encodeURIComponent(site)) : { items: [], last_inventory: {} };
  const li = (sr.last_inventory || {})[site];
  // Rollierende Inventur: nur Artikel, die seit N Tagen nicht (oder noch nie) gezählt wurden
  const age = ['90', '180', '365'].includes(S.countAge) ? Number(S.countAge) : 0;
  const items = age ? sr.items.filter((i) => !i.last_counted_date || i.last_counted_date <= bDate(-age)) : sr.items;
  const ageLabel = age ? t('count_age_n').replace('{n}', age) : '';
  const coll = new Intl.Collator(S.lang === 'uk' ? 'uk' : S.lang === 'en' ? 'en' : 'de', { numeric: true, sensitivity: 'base' });
  items.sort((a, b) => (a.location ? 0 : 1) - (b.location ? 0 : 1) || coll.compare(a.location || '', b.location || '') || coll.compare(a.name, b.name));
  const n = (x) => fmtNum(x);
  render(`<p class="noprint"><a href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('count_sheet_title'))}</h1>${helpLink('stock')}
    <p class="small muted noprint">${esc(t('count_sheet_hint'))}</p>
    ${printHead([t('count_sheet_title'), site ? `${t('workshop')}: ${wsName(site)}` : '', withBook ? t('count_with_book') : t('count_blind'), ageLabel, t('print_count').replace('{n}', items.length), li ? t('inventory_last').replace('{d}', fmtDT(li.at)).replace('{c}', li.counted ?? '–').replace('{x}', li.differences ?? '–') : t('inventory_last_none')])}
    <div class="actions noprint" style="flex-wrap:wrap;align-items:flex-end;margin-top:0">
      ${sites.length > 1 ? `<div style="flex:1 1 200px"><label for="csite">${esc(t('workshop'))}</label><select id="csite">${sites.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}</select></div>` : ''}
      <div style="flex:1 1 200px"><label for="cage">${esc(t('count_age'))}</label><select id="cage"><option value="">${esc(t('count_age_all'))}</option>${[90, 180, 365].map((x) => `<option value="${x}"${x === age ? ' selected' : ''}>${esc(t('count_age_n').replace('{n}', x))}</option>`).join('')}</select></div>
      <label style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="cbook"${withBook ? ' checked' : ''} style="width:auto">${esc(t('count_with_book'))}</label>
      <button type="button" class="btn secondary" id="cprt"${items.length ? '' : ' disabled'}>${esc(t('print'))}</button></div>
    ${items.length ? `<div class="scroll"><table class="printsm" id="ctab"><thead><tr><th>${esc(t('storage'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('unit'))}</th><th>${esc(t('last_counted'))}</th>${withBook ? `<th>${esc(t('inventory_book_qty'))}</th>` : ''}<th style="min-width:90px">${esc(t('inventory_counted'))}</th></tr></thead><tbody>
      ${items.map((i) => `<tr><td>${esc(i.location || '–')}</td><td>${esc(i.name)}${i.part_number ? `<div class="small muted">${esc(i.part_number)}</div>` : ''}</td><td>${esc(i.unit)}</td><td>${i.last_counted_date ? esc(fmtD(i.last_counted_date)) : '–'}</td>${withBook ? `<td>${n(i.on_hand)}</td>` : ''}<td style="border-bottom:1px solid currentColor">&nbsp;</td></tr>`).join('')}
      </tbody></table></div><p style="margin-top:24px">${esc(t('count_sign'))}: ______________________________</p>` : `<p class="muted" id="cnone">${esc(age && sr.items.length ? t('count_age_none') : t('count_none'))}</p>`}`, 'more');
  const cs = $('#csite'); if (cs) cs.onchange = () => { S.countSite = cs.value; viewStockCount(); };
  $('#cbook').onchange = () => { S.countBook = $('#cbook').checked; viewStockCount(); };
  $('#cage').onchange = () => { S.countAge = $('#cage').value; viewStockCount(); };
  $('#cprt').onclick = () => window.print();
}

// Bestellvorschlag: Artikel unter Mindestbestand mit Fehlmenge – es wird nichts bestellt (Liste für den Einkauf)
async function viewReorder() {
  const sites = S.me.role === 'workshop' ? [] : S.meta.workshops;
  const site = sessionStorage.getItem('cfp_reorder_site') || '';
  const q = site && sites.some((w) => w.code === site) ? `&site=${encodeURIComponent(site)}` : '';
  const items = (await api('GET', '/api/stock?reorder=1' + q)).items;
  const valued = items.filter((i) => i.shortfall_value_net !== null);
  const sum = Math.round(valued.reduce((a, i) => a + i.shortfall_value_net, 0) * 100) / 100;
  const n = (x) => fmtNum(x);
  render(`<p class="noprint"><a href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('reorder'))}</h1>
    <p class="small muted">${esc(t('reorder_hint'))}</p>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    ${sites.length > 1 ? `<div class="noprint"><label for="rsite">${esc(t('workshop'))}</label><select id="rsite"><option value="">${esc(t('all'))}</option>${sites.map((w) => `<option value="${esc(w.code)}"${q && w.code === site ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}</select></div>` : ''}
    <div class="actions noprint"><button type="button" class="btn secondary" id="rcsv"${items.length ? '' : ' disabled'}>${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="rprt">${esc(t('print'))}</button></div>
    ${items.length ? `<div class="scroll"><table class="stack printsm"><thead><tr><th>${esc(t('workshop'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('on_hand'))}</th><th>${esc(t('min_qty'))}</th><th>${esc(t('shortfall'))}</th><th>${esc(t('used_90d'))}</th><th>${esc(t('shortfall_value'))}</th><th>${esc(t('last_supplier'))}</th></tr></thead><tbody>
      ${items.map((i) => `<tr><td>${esc(wsName(i.site))}</td><td><a href="#/stock/${esc(i.id)}">${esc(i.name)}</a>${i.part_number || i.location ? `<div class="small muted">${[i.part_number, i.location].filter(Boolean).map(esc).join(' · ')}</div>` : ''}</td><td>${n(i.on_hand)} ${esc(i.unit)}</td><td>${n(i.min_qty)}</td><td><b>${n(i.shortfall)} ${esc(i.unit)}</b>${i.ordered_on ? `<div class="small">${esc(t('ordered_line').replace('{q}', n(i.ordered_qty)).replace('{u}', i.unit).replace('{d}', fmtD(i.ordered_on)))}${i.ordered_eta ? ` · ${esc(t('ordered_eta'))}: ${esc(fmtD(i.ordered_eta))}` : ''}</div><div class="small muted">${esc(t('open_after_order'))}: ${n(i.open_after_order)} ${esc(i.unit)}</div>` : ''}</td><td>${n(i.used_90d)}</td><td>${i.shortfall_value_net === null ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : eur(i.shortfall_value_net)}</td><td>${i.last_supplier ? esc(i.last_supplier) : '–'}${i.last_receipt_date ? `<div class="small muted">${esc(t('last_receipt'))}: ${esc(fmtD(i.last_receipt_date))}</div>` : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <p id="rosum"><b>${esc(t('reorder_sum'))}:</b> ${valued.length ? eur(sum) : '–'}${valued.length < items.length ? ` <span class="small muted">(${items.length - valued.length} ${esc(t('unvalued_positions'))})</span>` : ''}</p>` : `<p class="muted">${esc(t('reorder_none'))}</p>`}`, 'more');
  if ($('#rsite')) $('#rsite').onchange = () => { try { sessionStorage.setItem('cfp_reorder_site', $('#rsite').value); } catch {} viewReorder(); };
  $('#rprt').onclick = () => window.print();
  $('#rcsv').onclick = async () => { try { download(await api('GET', '/api/stock?reorder=1&format=csv' + q), `fuhrpark-bestellvorschlag_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
}

// Bestand zum Stichtag (Jahresabschluss): Menge aus allen Buchungen bis Tagesende, zwei Preisangaben, Bewertung legt die Buchhaltung fest
async function viewStockAsOf() {
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k) || ''; sessionStorage.setItem(k, v); } catch { return ''; } return ''; };
  const sites = S.me.role === 'workshop' ? [] : S.meta.workshops;
  const today = bDate();
  const date = ss('cfp_sa_date') || `${Number(today.slice(0, 4)) - 1}-12-31`;
  const site = sites.some((w) => w.code === ss('cfp_sa_site')) ? ss('cfp_sa_site') : '';
  const qs = `date=${encodeURIComponent(date)}${site ? '&site=' + encodeURIComponent(site) : ''}`;
  let rep;
  try { rep = await api('GET', '/api/stock/asof?' + qs); } catch (err) { ss('cfp_sa_date', ''); toast(err.message, true); rep = null; }
  const n = (x) => (x === null || x === undefined ? '' : fmtNum(x));
  const val = (x) => (x === null ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : eur(x));
  const sm = (k) => `${rep.summary[k].unvalued === rep.summary.count ? '–' : eur(rep.summary[k].value_net)}${rep.summary[k].unvalued ? ` <span class="small muted">(${rep.summary[k].unvalued} ${esc(t('unvalued_short'))})</span>` : ''}`;
  render(`<p class="noprint"><a href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('asof_title'))}</h1>
    <p class="small muted">${esc(t('asof_hint'))}</p>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · ${esc(t('asof_date'))} ${esc(fmtD(date))}${site ? ' · ' + esc(wsName(site)) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <form id="saf" class="panel noprint"><label for="sadate">${esc(t('asof_date'))}</label><input type="date" id="sadate" value="${esc(date)}" max="${esc(today)}" required>
      ${sites.length > 1 ? `<label for="sasite">${esc(t('workshop'))}</label><select id="sasite"><option value="">${esc(t('all'))}</option>${sites.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}</select>` : ''}
      <div class="actions"><button class="btn">${esc(t('show'))}</button><button type="button" class="btn secondary" id="sacsv"${rep && rep.items.length ? '' : ' disabled'}>${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="saprt">${esc(t('print'))}</button></div></form>
    ${rep && rep.items.length ? `<ul class="small" id="sasum"><li>${esc(t('asof_count').replace('{n}', rep.summary.count).replace('{d}', fmtD(rep.date)))}</li><li>${esc(t('asof_val_purchase'))}: ${sm('purchase')}</li><li>${esc(t('asof_val_today'))}: ${sm('today')}</li></ul>
      ${rep.summary.negative ? `<p class="panel warn">${esc(t('asof_negative').replace('{n}', rep.summary.negative))}</p>` : ''}
      <div class="scroll"><table class="stack printsm" id="satab"><thead><tr><th>${esc(t('workshop'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('asof_qty'))}</th><th>${esc(t('asof_last_purchase'))}</th><th>${esc(t('asof_val_purchase'))}</th><th>${esc(t('inv_item_price'))}</th><th>${esc(t('asof_val_today'))}</th></tr></thead><tbody>
      ${rep.items.map((i) => `<tr><td>${esc(wsName(i.site))}</td><td><a href="#/stock/${esc(i.id)}">${esc(i.name)}</a>${i.part_number || i.location ? `<div class="small muted">${[i.part_number, i.location].filter(Boolean).map(esc).join(' · ')}</div>` : ''}${i.active ? '' : ` <span class="chip">${esc(t('asof_inactive'))}</span>`}</td><td><b>${n(i.qty)}</b> ${esc(i.unit)}</td><td>${val(i.last_purchase_price)}</td><td>${i.value_purchase_net === null ? '–' : eur(i.value_purchase_net)}</td><td>${val(i.price_today)}</td><td>${i.value_today_net === null ? '–' : eur(i.value_today_net)}</td></tr>`).join('')}
      </tbody></table></div>` : rep ? `<p class="muted">${esc(t('asof_none'))}</p>` : ''}`, 'more');
  $('#saf').onsubmit = (e) => { e.preventDefault(); ss('cfp_sa_date', $('#sadate').value); if ($('#sasite')) ss('cfp_sa_site', $('#sasite').value); viewStockAsOf(); };
  $('#saprt').onclick = () => window.print();
  $('#sacsv').onclick = async () => { try { download(await api('GET', '/api/stock/asof?format=csv&' + qs), `fuhrpark-lagerbestand-stichtag_${date}${site ? '_' + site : ''}.csv`); } catch (err) { toast(err.message, true); } };
}

// Lagerjournal: alle Buchungen eines Zeitraums (Berliner Datum), Wert nur mit Preis, ohne buchende Person
async function viewStockJournal() {
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k) || ''; sessionStorage.setItem(k, v); } catch { return ''; } return ''; };
  const sites = S.me.role === 'workshop' ? [] : S.meta.workshops;
  const today = bDate();
  const from = ss('cfp_sj_from') || today.slice(0, 8) + '01'; const to = ss('cfp_sj_to') || today;
  const site = sites.some((w) => w.code === ss('cfp_sj_site')) ? ss('cfp_sj_site') : ''; const type = ss('cfp_sj_type');
  const itemId = ss('cfp_sj_item'); // gesetzt aus der Artikelakte („Im Lagerjournal anzeigen“)
  const qs = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${site ? '&site=' + encodeURIComponent(site) : ''}${type ? '&type=' + encodeURIComponent(type) : ''}${itemId ? '&item=' + encodeURIComponent(itemId) : ''}`;
  let rep;
  try { rep = await api('GET', '/api/stock/journal?' + qs); } catch (err) { ss('cfp_sj_from', ''); ss('cfp_sj_to', ''); ss('cfp_sj_item', ''); toast(err.message, true); rep = null; }
  const n = (x) => (x === null || x === undefined ? '' : fmtNum(x));
  const TYPES = ['zugang', 'entnahme', 'korrektur', 'umlagerung'];
  const inv = type === 'inventur' && rep && rep.summary.inventur; const is = inv ? rep.summary.inventur : null;
  const sumRow = rep ? TYPES.map((k) => { const x = rep.summary[k]; return x.count ? `<li>${esc(t('mv_' + k))}: ${x.count} · ${x.unvalued === x.count ? '–' : eur(x.value_net)}${x.unvalued ? ` <span class="small muted">(${x.unvalued} ${esc(t('unvalued_short'))})</span>` : ''}</li>` : ''; }).join('') : '';
  render(`<p class="noprint"><a href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t(inv ? 'inventory_diffs' : 'stock_journal'))}</h1>
    <p class="small muted">${esc(t(inv ? 'inv_hint' : 'journal_hint'))}</p>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · ${esc(from)} – ${esc(to)}${site ? ' · ' + esc(wsName(site)) : ''}${rep && rep.item ? ' · ' + esc(rep.item.name) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <form id="jf" class="panel noprint"><div class="grid2"><div><label for="jfrom">${esc(t('from'))}</label><input type="date" id="jfrom" value="${esc(from)}" max="${esc(today)}"></div><div><label for="jto">${esc(t('to'))}</label><input type="date" id="jto" value="${esc(to)}" max="${esc(today)}"></div></div>
      ${sites.length > 1 ? `<label for="jsite">${esc(t('workshop'))}</label><select id="jsite"><option value="">${esc(t('all'))}</option>${sites.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}</select>` : ''}
      <label for="jtype">${esc(t('kind'))}</label><select id="jtype"><option value="">${esc(t('all'))}</option>${[...TYPES, 'inventur'].map((k) => `<option value="${k}"${k === type ? ' selected' : ''}>${esc(t('mv_' + k))}</option>`).join('')}</select>
      ${rep && rep.item ? `<p id="jitem" style="margin-top:12px"><span class="chip">${esc(t('part_name'))}: ${esc(rep.item.name)}${rep.item.part_number ? ' · ' + esc(rep.item.part_number) : ''}</span> <button type="button" class="btn secondary" id="jitemclr">${esc(t('journal_item_all'))}</button></p>` : ''}
      <div class="actions"><button class="btn">${esc(t('show'))}</button><button type="button" class="btn secondary" id="jcsv"${rep && rep.movements.length ? '' : ' disabled'}>${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="jprt">${esc(t('print'))}</button></div></form>
    ${rep && rep.truncated ? `<p class="panel warn">${esc(t('journal_truncated').replaceAll('{n}', rep.max))}</p>` : ''}
    ${inv ? (rep.movements.length ? `<p class="small" id="invsum">${esc(t('inv_sum').replace('{n}', is.count).replace('{p}', is.plus).replace('{pv}', rep.movements.some((m) => m.qty > 0 && m.diff_value_net !== null) ? eur(is.plus_value_net) : '–').replace('{m}', is.minus).replace('{mv}', rep.movements.some((m) => m.qty < 0 && m.diff_value_net !== null) ? eur(is.minus_value_net) : '–'))}${is.unvalued ? ` <span class="muted">(${is.unvalued} ${esc(t('unvalued_short'))})</span>` : ''}</p><div class="scroll"><table class="stack printsm" id="invtab"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('workshop'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('inv_book_before'))}</th><th>${esc(t('inventory_counted'))}</th><th>${esc(t('inv_diff'))}</th><th>${esc(t('inv_item_price'))}</th><th>${esc(t('inv_diff_value'))}</th><th>${esc(t('note'))}</th></tr></thead><tbody>
      ${rep.movements.map((m) => `<tr><td class="small">${fmtDT(m.created_at)}</td><td>${esc(wsName(m.site))}</td><td><a href="#/stock/${esc(m.item_id)}">${esc(m.name)}</a>${m.part_number ? `<div class="small muted">${esc(m.part_number)}</div>` : ''}</td><td>${n(m.book)} ${esc(m.unit)}</td><td>${n(m.counted)} ${esc(m.unit)}</td><td><b>${m.qty > 0 ? '+' : ''}${n(m.qty)}</b> ${esc(m.unit)}</td><td>${m.item_price_net === null ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : eur(m.item_price_net)}</td><td>${m.diff_value_net === null ? '–' : eur(m.diff_value_net)}</td><td class="small">${esc(m.document_ref || '')}</td></tr>`).join('')}
      </tbody></table></div>` : `<p class="muted">${esc(t('inv_none'))}</p>`) : rep && rep.movements.length ? `<ul class="small">${sumRow}</ul><div class="scroll"><table class="stack printsm"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('workshop'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('kind'))}</th><th>${esc(t('qty'))}</th><th>${esc(t('price_net'))}</th><th>${esc(t('value_net'))}</th><th>${esc(t('vehicle'))}</th><th>${esc(t('note'))}</th></tr></thead><tbody>
      ${rep.movements.map((m) => `<tr><td class="small">${fmtDT(m.created_at)}</td><td>${esc(wsName(m.site))}</td><td><a href="#/stock/${esc(m.item_id)}">${esc(m.name)}</a>${m.part_number ? `<div class="small muted">${esc(m.part_number)}</div>` : ''}</td><td>${m.transfer_id ? `${esc(t('mv_umlagerung'))} ${m.qty < 0 ? '→' : '←'} ${esc(wsName(m.transfer_site))}` : esc(t('mv_' + m.type))}</td><td><b>${m.qty > 0 ? '+' : ''}${n(m.qty)}</b> ${esc(m.unit)}</td><td>${m.unit_price_net === null ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : eur(m.unit_price_net)}</td><td>${m.value_net === null ? '–' : eur(m.value_net)}</td><td>${m.case_no ? `<a href="#/cases/${esc(m.case_id)}">${esc(m.case_no)}</a>${m.plate ? ' · ' + esc(m.plate) : ''}` : '–'}</td><td class="small">${[m.supplier, m.document_ref, m.note].filter(Boolean).map(esc).join(' · ') || '–'}</td></tr>`).join('')}
      </tbody></table></div>` : rep ? `<p class="muted">${esc(t('journal_none'))}</p>` : ''}`, 'more');
  $('#jf').onsubmit = (e) => { e.preventDefault(); ss('cfp_sj_from', $('#jfrom').value); ss('cfp_sj_to', $('#jto').value); if ($('#jsite')) ss('cfp_sj_site', $('#jsite').value); ss('cfp_sj_type', $('#jtype').value); viewStockJournal(); };
  $('#jprt').onclick = () => window.print();
  if ($('#jitemclr')) $('#jitemclr').onclick = () => { ss('cfp_sj_item', ''); viewStockJournal(); };
  $('#jcsv').onclick = async () => { try { download(await api('GET', '/api/stock/journal?format=csv&' + qs), `fuhrpark-${inv ? 'inventurdifferenzen' : 'lagerjournal'}_${from}_${to}${site ? '_' + site : ''}${rep && rep.item && rep.item.part_number ? '_' + rep.item.part_number.replace(/[^\w-]/g, '') : ''}.csv`); } catch (err) { toast(err.message, true); } };
}

async function viewStockItem(id) {
  const d = await api('GET', '/api/stock/' + id);
  const it = d.item;
  const others = (S.meta.workshops || []).filter((w) => w.code !== it.site);
  render(`<p class="noprint"><a href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(it.name)}</h1>${printHead([`${t('workshop')}: ${wsName(it.site)}`, it.part_number ? `${t('part_number')}: ${it.part_number}` : ''])}
    <section class="panel"><dl class="kv"><dt>${esc(t('on_hand'))}</dt><dd><b style="font-size:1.4rem">${it.on_hand} ${esc(it.unit)}</b></dd><dt>${esc(t('part_number'))}</dt><dd>${esc(it.part_number || '–')}</dd><dt>${esc(t('workshop'))}</dt><dd>${esc(wsName(it.site))}</dd><dt>${esc(t('storage'))}</dt><dd>${esc(it.location || '–')}</dd><dt>${esc(t('min_qty'))}</dt><dd>${it.min_qty ?? '–'}</dd><dt>€</dt><dd>${eur(it.unit_price_net)}</dd><dt>${esc(t('last_counted'))}</dt><dd id="lcnt">${it.last_counted_at ? `${esc(fmtD(it.last_counted_at))} · ${fmtNum(it.last_counted_qty)} ${esc(it.unit)}` : esc(t('never_counted'))}</dd></dl></section>
    <form id="mf" class="panel"><h3>${esc(t('book'))}</h3><label>${esc(t('kind'))}</label><select name="type"><option value="zugang">${esc(t('mv_zugang'))}</option><option value="entnahme">${esc(t('mv_entnahme'))}</option><option value="korrektur">${esc(t('mv_korrektur'))}</option></select>
      <label>${esc(t('qty'))}</label><input name="qty" inputmode="decimal" required><label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><label>${esc(t('supplier'))}</label><input name="supplier"><label>${esc(t('doc_ref'))}</label><input name="document_ref"><label>${esc(t('note'))}</label><input name="note">
      <div class="actions"><button class="btn">${esc(t('book'))}</button></div></form>
    ${it.ordered_on ? `<section class="panel" id="ordp"><h3>${esc(t('ordered'))}</h3><p>${esc(t('ordered_line').replace('{q}', fmtNum(it.ordered_qty)).replace('{u}', it.unit).replace('{d}', fmtD(it.ordered_on)))}${it.ordered_eta ? ` · ${esc(t('ordered_eta'))}: ${esc(fmtD(it.ordered_eta))}` : ''}${it.ordered_note ? ` · ${esc(it.ordered_note)}` : ''}</p>
      <p class="small muted">${esc(t('ordered_hint'))}</p><div class="actions"><button type="button" class="btn secondary" id="ordclr">${esc(t('ordered_clear'))}</button></div></section>`
    : it.active ? `<details class="panel" id="ordp"><summary>${esc(t('order_mark'))}</summary><form id="of"><p class="small muted">${esc(t('ordered_hint'))}</p>
      <label for="oqty">${esc(t('qty'))}</label><input id="oqty" name="qty" inputmode="decimal" required><label for="oeta">${esc(t('ordered_eta'))}</label><input id="oeta" name="eta" type="date">
      <label for="onote">${esc(t('note'))}</label><input id="onote" name="note" maxlength="200"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}
    ${others.length && it.active && it.on_hand > 0 ? `<details class="panel" id="trp"><summary>${esc(t('transfer'))}</summary><form id="tf"><p class="small muted">${esc(t('transfer_hint'))}</p>
      <label for="tsite">${esc(t('transfer_to'))}</label><select id="tsite" name="to_site" required>${others.map((w) => `<option value="${esc(w.code)}">${esc(w.name)}</option>`).join('')}</select>
      <label for="tqty">${esc(t('qty'))} (${esc(t('on_hand'))} ${it.on_hand} ${esc(it.unit)})</label><input id="tqty" name="qty" inputmode="decimal" required><label for="tnote">${esc(t('note'))}</label><input id="tnote" name="note" maxlength="300">
      <div class="actions"><button class="btn">${esc(t('transfer'))}</button></div></form></details>` : ''}
    <h2>${esc(t('history'))}</h2>${d.movements_truncated ? `<p class="panel warn small" id="histtrunc">${esc(t('item_history_truncated').replaceAll('{n}', d.movements_max))}</p>` : ''}<p class="noprint"><button type="button" class="btn secondary" id="histjournal">${esc(t('item_in_journal'))}</button> <button type="button" class="btn secondary" id="itemprt">${esc(t('print'))}</button></p><div class="scroll"><table class="stack"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('kind'))}</th><th>${esc(t('qty'))}</th><th>${esc(t('note'))}</th></tr></thead><tbody>${d.movements.map((m) => `<tr><td class="small">${fmtDT(m.created_at)}</td><td>${m.transfer_id ? `${esc(t('mv_umlagerung'))} ${m.qty < 0 ? '→' : '←'} ${esc(wsName(m.transfer_site))}` : esc(t('mv_' + m.type))}</td><td><b>${m.qty > 0 ? '+' : ''}${m.qty}</b></td><td class="small">${m.case_no ? `<a href="#/cases/${esc(m.case_id)}">${esc(m.case_no)}</a> · ` : ''}${esc(m.supplier || '')} ${m.document_ref && !(m.note || '').startsWith(m.document_ref) ? esc(m.document_ref) : ''} ${esc(m.note || '')}<br>${esc(m.user_name)}</td></tr>`).join('')}</tbody></table></div>`, 'more');
  // Artikelakte drucken (Stammdaten + Verlauf; Buchungs-/Bestell-/Umlagerungsformulare erscheinen im Ausdruck nicht)
  $('#itemprt').onclick = () => window.print();
  // Lagerjournal auf diesen Artikel eingrenzen, Zeitraum: letzte 12 Monate (Höchstspanne des Journals), Buchungsart: alle
  $('#histjournal').onclick = () => { try { const today = bDate(); const f = bDate(-365);
    sessionStorage.setItem('cfp_sj_item', id); sessionStorage.setItem('cfp_sj_from', f); sessionStorage.setItem('cfp_sj_to', today); sessionStorage.setItem('cfp_sj_type', ''); sessionStorage.setItem('cfp_sj_site', ''); } catch { /* ohne Sitzungsspeicher: Journal ungefiltert */ } location.hash = '#/stock/journal'; };
  $('#mf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k of Object.keys(b)) { if (b[k] === '') delete b[k]; else if (['qty', 'unit_price_net'].includes(k)) b[k] = b[k].replace(',', '.'); } try { await api('POST', `/api/stock/${id}/movements`, b); viewStockItem(id); } catch (err) { toast(err.message, true); } };
  if ($('#of')) $('#of').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); b.qty = String(b.qty).replace(',', '.'); for (const k of ['eta', 'note']) if (!b[k]) delete b[k];
    try { await api('PUT', `/api/stock/${id}/order`, b); viewStockItem(id); } catch (err) { toast(err.message, true); } };
  if ($('#ordclr')) $('#ordclr').onclick = async () => { try { await api('DELETE', `/api/stock/${id}/order`); viewStockItem(id); } catch (err) { toast(err.message, true); } };
  if ($('#tf')) $('#tf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); b.qty = String(b.qty).replace(',', '.'); if (!b.note) delete b.note;
    try { const r = await api('POST', `/api/stock/${id}/transfer`, b); toast(t('transfer_done').replace('{q}', fmtNum(String(b.qty).replace(',', '.'))).replace('{u}', it.unit).replace('{w}', wsName(b.to_site)) + (r.target_created ? ' · ' + t('transfer_created') : '')); viewStockItem(id); } catch (err) { toast(err.message, true); } };
}


async function viewFines() {
  const fsite = S.me.role === 'driver' ? '' : (vsDef('fineSite') || '');
  const fq = fsite ? `site=${encodeURIComponent(fsite)}` : '';
  const fr = await api('GET', '/api/fines' + (fq ? '?' + fq : ''));
  const list = fr.fines;
  const mgr = isMgr();
  const today = bDate();
  let html = `<h1>${esc(mgr ? t('fines') : t('my_fines'))}</h1>${helpLink(mgr ? 'fines' : 'myfines')}`;
  const fsiteSel = (fr.site_options || []).length > 1 || fr.site ? `<div class="panel noprint" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end"><div>${siteSelect('fsite', '', fr.site_options, fr.site, t('kpi_vsite'), t('filter_all'))}</div></div>` : '';
  if (mgr) html += `<details class="panel"><summary>${esc(t('new_fine'))}</summary><form id="nf">
    <label>${esc(t('kind'))}</label><select name="kind">${S.meta.fine_kinds.map((k) => `<option value="${k}">${esc(t('fk_' + k))}</option>`).join('')}</select>
    <label>${esc(t('authority'))}</label><input name="authority" required><label>${esc(t('reference'))}</label><input name="reference">
    <label>${esc(t('offense'))}</label><select name="offense_type">${S.meta.fine_offenses.map((k) => `<option value="${k}">${esc(t('of_' + k))}</option>`).join('')}</select>
    <label>${esc(t('offense_at'))}</label><input type="datetime-local" name="offense_at" required aria-describedby="nf-tz"><p class="small muted" id="nf-tz" style="margin:2px 0 8px">${esc(t('offense_at_tz'))}</p><label>${esc(t('offense_place'))}</label><input name="location">
    <label>${esc(t('plate_letter'))}</label><input name="plate_in_letter" required placeholder="SZ-YC 5513"><label>${esc(t('amount'))}</label><input name="amount_eur" inputmode="decimal">
    <label>${esc(t('response_due'))}</label><input type="date" name="response_due"><label>${esc(t('note'))}</label><textarea name="note"></textarea>
    <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
  html += fsiteSel;
  html += printHead([fr.site ? `${t('kpi_vsite')}: ${fr.site === 'ohne' ? t('cs_nosite') : fr.site}` : '', t('print_count').replace('{n}', list.length)]);
  if (fr.truncated) html += `<p class="small muted">${esc(t('fines_truncated'))}</p>`;
  html += `<div class="list">${list.map((f) => { const over = f.response_due && f.response_due < today && ['eingegangen', 'fahrer_ermittelt', 'fahrer_informiert'].includes(f.status); return `<a class="row ${over ? 'p-kritisch' : ''}" href="#/fines/${esc(f.id)}">${plate(f.plate || f.plate_in_letter)}<span class="title">${esc(t('fk_' + f.kind))} · ${esc(t('of_' + f.offense_type))}</span><span class="chip ${over ? 'kritisch' : ['bezahlt', 'eingestellt', 'erledigt', 'beantwortet'].includes(f.status) ? 'ok' : ''}">${esc(t('fs_' + f.status))}</span><span class="sub">${esc(f.fine_no)} · ${fmtDT(f.offense_at)}${f.authority ? ' · ' + esc(f.authority) : ''}${f.response_due ? ' · ' + esc(t('response_due')) + ' ' + fmtD(f.response_due) : ''}${f.driver_name ? ' · ' + esc(f.driver_name) : ''}</span></a>`; }).join('') || `<p class="muted">–</p>`}</div>`;
  if (['owner', 'fleet', 'viewer'].includes(S.me.role)) html += `<div class="actions" style="flex-wrap:wrap"><button type="button" class="btn secondary" id="fcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="fics">${esc(t('export_ics'))}</button><button type="button" class="btn secondary" id="fprt">${esc(t('print'))}</button>${mgr ? `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="fdrv"> ${esc(t('with_driver_names'))}</label>` : ''}</div>`;
  render(html, 'more');
  const day = bDate();
  const fc = $('#fcsv'); if (fc) fc.onclick = async () => { try { downloadChecked(await api('GET', `/api/fines?format=csv${$('#fdrv') && $('#fdrv').checked ? '&with_driver=1' : ''}${fq ? '&' + fq : ''}`), `fuhrpark-bussgelder_${day}.csv`); } catch (err) { toast(err.message, true); } };
  const fi = $('#fics'); if (fi) fi.onclick = async () => { try { downloadChecked(await api('GET', '/api/fines?format=ics' + (fq ? '&' + fq : '')), `fuhrpark-behoerdenfristen_${day}.ics`); } catch (err) { toast(err.message, true); } };
  const fs = $('#fsite'); if (fs) fs.onchange = () => { S.fineSite = fs.value; viewFines(); };
  const fp = $('#fprt'); if (fp) fp.onclick = () => window.print();
  const nf = $('#nf');
  if (nf) nf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(nf)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; if (b.amount_eur) b.amount_eur = b.amount_eur.replace(',', '.'); try { const r = await api('POST', '/api/fines', b); if (!r.vehicle_matched) toast(t(r.vehicle_ambiguous ? 'fine_vehicle_ambiguous' : 'vehicle_unknown'), true); location.hash = '#/fines/' + r.id; } catch (err) { toast(err.message, true); } };
}

const FINE_EV = { create: 'new_fine', confirm_driver: 'confirm_driver', inform_driver: 'inform_driver', set_status: 'set_status', driver_ack: 'ack_fine', update: 'fine_updated', upload: 'upload' };
async function viewFine(id) {
  const d = await api('GET', '/api/fines/' + id);
  const f = d.fine; const A = d.allowed_actions;
  let html = `<p><a href="#/fines">‹ ${esc(t('back'))}</a></p><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${plate(f.plate || f.plate_in_letter, { big: true })}<span class="chip">${esc(t('fs_' + f.status))}</span>${f.environment === 'test' ? '<span class="chip test">TEST</span>' : ''}</div>
    <h1 style="margin-top:12px">${esc(f.fine_no)} · ${esc(t('fk_' + f.kind))}</h1>${printHead([t('fines'), f.fine_no])}
    <div class="actions noprint"><button type="button" class="btn secondary" id="fdprt">${esc(t('print'))}</button></div>
    ${!f.vehicle_id ? `<div class="panel alert">${esc(t('vehicle_unknown'))}: ${esc(f.plate_in_letter)}</div>` : ''}
    <section class="panel"><dl class="kv"><dt>${esc(t('offense'))}</dt><dd>${esc(t('of_' + f.offense_type))}</dd><dt>${esc(t('offense_at'))}</dt><dd>${fmtDT(f.offense_at)}</dd><dt>${esc(t('offense_place'))}</dt><dd>${esc(f.location || '–')}</dd>
      <dt>${esc(t('authority'))}</dt><dd>${esc(f.authority)}</dd><dt>${esc(t('reference'))}</dt><dd>${esc(f.reference || '–')}</dd><dt>${esc(t('amount'))}</dt><dd>${eur(f.amount_eur)}</dd>
      <dt>${esc(t('response_due'))}</dt><dd>${f.response_due ? fmtD(f.response_due) : '–'}</dd><dt>${esc(t('role_driver'))}</dt><dd>${f.driver_hidden ? esc(t('fine_driver_hidden')) : esc(d.driver_name || '–')}${f.driver_basis ? ' · ' + esc(t('fb_' + f.driver_basis)) : ''}${f.driver_evidence ? `<div class="small muted">${esc(f.driver_evidence)}</div>` : ''}</dd></dl>
      ${f.note ? `<p style="white-space:pre-wrap;margin-top:8px">${esc(f.note)}</p>` : ''}</section>`;
  html += `<h2>${esc(t('files'))}</h2><div class="thumbs">${d.files.map((x) => `<a href="${fileUrl(x.id)}" target="_blank" rel="noopener">${x.content_type.startsWith('image/') ? `<img src="${fileUrl(x.id)}" alt="">` : 'PDF<br>' + esc(x.filename.slice(0, 14))}</a>`).join('')}</div>`;
  // Höchstzahl je Bußgeldvorgang wie Server (MAX_FINE_FILES): voll → Hinweis statt Knopf
  if (A.includes('upload') && d.files.length < FINE_FILES_MAX) html += `<label class="btn secondary" style="margin-top:8px;display:inline-flex">${esc(t('upload'))}<input id="ff" type="file" accept="application/pdf,image/jpeg,image/png" hidden></label>`;
  else if (A.includes('upload')) html += `<p class="small muted" id="ffull">${esc(t('files_full').replace('{max}', FINE_FILES_MAX))}</p>`;
  if (A.includes('confirm_driver')) {
    html += `<div class="noprint"><h2>${esc(t('candidates'))}</h2>${d.candidates.length ? `<div class="list">${d.candidates.map((c, i) => `<label class="row"><input type="radio" name="cand" value="${i}"><span class="title">${esc(c.display_name)}</span><span class="chip">${esc(t('fb_' + c.basis))}</span><span class="sub" style="white-space:normal">${esc(candEv(c))}</span></label>`).join('')}</div>` : `<p class="muted">${esc(t('no_candidates'))}</p>`}</div>
      <form id="cf" class="panel"><h3>${esc(t('confirm_driver'))}</h3><label>${esc(t('role_driver'))}</label><select name="driver_id" id="drv"><option value="">–</option></select>
      <label>${esc(t('driver_without_account'))}</label><input name="driver_name_note"><label>${esc(t('basis'))}</label><select name="basis">${['zuordnung', 'tourenplan', 'telematik', 'fahrerangabe', 'manuell'].map((b) => `<option value="${b}">${esc(t('fb_' + b))}</option>`).join('')}</select>
      <label>${esc(t('evidence'))}</label><input name="evidence" required><div class="actions"><button class="btn">${esc(t('confirm_driver'))}</button></div></form>`;
  }
  const acts = [];
  if (A.includes('inform_driver')) acts.push(`<button class="btn" id="inf">${esc(t('inform_driver'))}</button>`);
  if (A.includes('driver_ack')) acts.push(`<button class="btn" id="ack">${esc(t('ack_fine'))}</button>`);
  if (acts.length) html += `<div class="actions">${acts.join('')}</div>`;
  if (A.includes('set_status')) html += `<details class="panel"><summary>${esc(t('set_status'))}</summary><form id="sf"><label>${esc(t('status'))}</label><select name="status">${['beantwortet', 'bezahlt', 'eingestellt', 'erledigt', 'eingegangen'].map((x) => `<option value="${x}">${esc(t('fs_' + x))}</option>`).join('')}</select><label>${esc(t('note'))}</label><input name="note" required><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>`;
  if (d.events) html += `<h2>${esc(t('history'))}</h2><ol class="timeline">${d.events.map((e) => `<li><time>${fmtDT(e.created_at)}</time> · <b>${esc(FINE_EV[e.action] ? t(FINE_EV[e.action]) : e.action)}</b>${e.actor_name ? ' · ' + esc(e.actor_name) : ''}${e.note ? `<div>${esc(e.note)}</div>` : ''}</li>`).join('')}</ol>`;
  render(html, 'more');
  $('#fdprt').onclick = () => window.print();
  const cmd = async (action, payload = {}, note = null) => { try { await api('POST', `/api/fines/${id}/commands`, { action, payload, note, expected_version: f.version }); toast('✓'); viewFine(id); } catch (err) { toast(err.message, true); } };
  const cf = $('#cf');
  if (cf) {
    try { const us = (await api('GET', '/api/users')).users.filter((u) => u.role === 'driver' && u.active); $('#drv').innerHTML = `<option value="">–</option>` + us.map((u) => `<option value="${esc(u.id)}">${esc(u.display_name)}</option>`).join(''); } catch {}
    $$('input[name=cand]').forEach((r) => (r.onchange = () => { const c = d.candidates[r.value]; $('#drv').value = c.user_id; cf.basis.value = c.basis; cf.evidence.value = c.evidence; }));
    cf.onsubmit = (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(cf)); if (!b.driver_id) delete b.driver_id; if (!b.driver_name_note) delete b.driver_name_note; cmd('confirm_driver', b); };
  }
  const inf = $('#inf'); if (inf) inf.onclick = () => cmd('inform_driver');
  const ack = $('#ack'); if (ack) ack.onclick = () => cmd('driver_ack');
  const sf = $('#sf'); if (sf) sf.onsubmit = (e) => { e.preventDefault(); cmd('set_status', { status: sf.status.value }, sf.note.value); };
  const ff = $('#ff'); if (ff) ff.onchange = async () => { const file = ff.files[0]; if (!file) return; try { const blob = await prepareUpload(file); await api('POST', `/api/fines/${id}/files`, blob, { headers: { 'x-filename': encodeURIComponent(file.name), 'content-type': blob.type || 'application/octet-stream' } }); viewFine(id); } catch (err) { toast(err.message, true); } };
}

// Standortauswahl (Standort laut Fahrzeugstamm; Server liefert options in häufigster Schreibweise, 'ohne' = ohne Standort)
// Filter „Fahrzeug-Standort“: in dieser Sitzung gewählter Wert (auch „Alle“ = ''), sonst der Standard-Standort aus „Mein Konto“
// Standort als Teil eines Dateinamens (Umlaute bleiben, sonst Bindestrich)
function fnPart(x) { return String(x).replace(/[^\wÄÖÜäöüß-]+/g, '-'); }
function vsDef(k) { return S[k] !== undefined ? S[k] : (S.me && S.me.role !== 'driver' && S.me.home_site) || ''; }
function siteSelect(id, name, options, cur, label = t('site'), allLabel = t('all')) {
  return `<label for="${id}">${esc(label)}</label><select id="${id}"${name ? ` name="${name}"` : ''}><option value="">${esc(allLabel)}</option>${[...new Set([...(options || []), ...(cur ? [cur] : [])])].map((x) => `<option value="${esc(x)}"${x === cur ? ' selected' : ''}>${esc(x === 'ohne' ? t('cs_nosite') : x)}</option>`).join('')}</select>`;
}
// ---------- Kosten je Fahrzeug/Monat ----------
async function viewCosts() {
  const to = S.costTo || bYm(); const from = S.costFrom || bYm(11); const site = vsDef('costSite') || '';
  const siteQ = site ? `&site=${encodeURIComponent(site)}` : '';
  let rep;
  try { rep = await api('GET', `/api/reports/costs?from=${from}&to=${to}${siteQ}`); } catch (err) { render(`<h1>${esc(t('costs_report'))}</h1><div class="panel alert">${esc(err.message)}</div>`, 'more'); return; }
  const byV = new Map();
  for (const r of rep.rows) { const v = byV.get(r.vehicle_id) || { plate: r.plate, site: r.site, actual: 0, valued: 0, estimate: 0, unvalued: 0, hours: 0, months: [] }; v.actual += r.actual_net; v.valued += r.valued_items || 0; v.estimate += r.estimate_net; v.unvalued += r.unvalued_items; v.hours += r.hours; v.months.push(r); byV.set(r.vehicle_id, v); }
  const vs = [...byV.entries()].sort((a, b) => b[1].actual - a[1].actual);
  const kmBy = new Map((rep.vehicles || []).map((v) => [v.vehicle_id, v]));
  // Ausdruck (Besprechung/Ablage): Zeitraum und Standort im Vermerk, weil das Formular nicht mitgedruckt wird
  let html = `<h1>${esc(t('costs_report'))}</h1>${printHead([`${t('period')}: ${from} – ${to}`, site ? `${t('site')}: ${site === 'ohne' ? t('cs_nosite') : site}` : ''])}${helpLink('costs')}<form id="cr" class="panel" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
    <div><label>${esc(t('from'))}</label><input type="month" name="from" value="${esc(from)}" required></div><div><label>${esc(t('to'))}</label><input type="month" name="to" value="${esc(to)}" required></div>
    ${(rep.site_options || []).length > 1 || site ? `<div>${siteSelect('crsite', 'site', rep.site_options, site)}</div>` : ''}
    <div class="actions" style="margin:0"><button class="btn secondary">${esc(t('show'))}</button><button type="button" class="btn" id="csv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="costprt">${esc(t('print'))}</button></div></form>
    <section class="panel"><dl class="kv"><dt>${esc(t('cost_actual'))}</dt><dd><b>${eurIst(rep.totals)}</b></dd><dt>${esc(t('cost_estimate'))}</dt><dd>${eur(rep.totals.estimate_net)}</dd>
    <dt>${esc(t('hours'))}</dt><dd>${esc(fmtNum(rep.totals.hours))}</dd><dt>${esc(t('unvalued_positions'))}</dt><dd>${rep.totals.unvalued_items ? `<span class="chip kritisch">${rep.totals.unvalued_items}</span>` : '0'}</dd></dl>
    <p class="small muted" style="margin-top:8px">${esc(t('cost_rules'))}${rep.hourly_rate_net === null ? ' ' + esc(t('no_rate')) : ''} ${esc(t('cost_per_km_rule'))}</p></section>`;
  const sites = rep.sites || [];
  if (sites.length > 1) html += `<section class="panel" id="costsites"><h3>${esc(t('cs_title'))}</h3><dl class="kv">${sites.map((s) => `<dt>${esc(s.site === 'ohne' ? t('cs_nosite') : s.site)}</dt><dd><b>${eurIst(s)}</b>${s.estimate_net ? ' · ' + esc(t('estimate')) + ' ' + eur(s.estimate_net) : ''}${s.unvalued_items ? ` · <span class="chip kritisch">${s.unvalued_items} ${esc(t('unvalued_short'))}</span>` : ''} · ${esc(t('cs_vehicles').replace('{n}', s.vehicles))}</dd>`).join('')}</dl><p class="small muted" style="margin-top:8px">${esc(t('cs_rule'))}</p></section>`;
  html += `<div class="list print-summary">${vs.map(([id, v]) => `<details class="row" style="display:block"><summary style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;cursor:pointer">${plate(v.plate || id)}<span class="title">${eurIst({ actual_net: Math.round(v.actual * 100) / 100, valued_items: v.valued, unvalued_items: v.unvalued })}</span>${v.estimate ? `<span class="chip">${esc(t('estimate'))}: ${eur(Math.round(v.estimate * 100) / 100)}</span>` : ''}${v.unvalued ? `<span class="chip kritisch">${v.unvalued} ${esc(t('unvalued_short'))}</span>` : ''}${(() => { const k = kmBy.get(id); return k && k.km ? `<span class="chip">${fmtKm(k.km)} · ${k.cost_per_km !== null ? fmtNum(k.cost_per_km, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' €/km' : '–'}${k.complete ? '' : ' (' + esc(t('incomplete')) + ')'}</span>` : ''; })()}</summary>
    <dl class="kv" style="margin-top:8px">${v.months.map((m) => `<dt>${esc(m.month)}</dt><dd>${eurIst(m)}${m.estimate_net ? ' · ' + esc(t('estimate')) + ' ' + eur(m.estimate_net) : ''}${m.unvalued_items ? ' · ' + m.unvalued_items + ' ' + esc(t('unvalued_short')) : ''} · ${esc(fmtNum(m.hours))} h</dd>`).join('')}</dl>
    <p><a href="#/vehicles/${encodeURIComponent(id)}">${esc(t('vehicle'))} ›</a></p></details>`).join('') || `<p class="muted">${esc(t('no_costs'))}</p>`}</div>`;
  const cc = rep.contract_costs;
  if (cc) html += `<h2>${esc(t('cc_title'))}</h2><section class="panel"><dl class="kv"><dt>${esc(t('cc_total'))}</dt><dd><b>${cc.total_net === null ? '–' : eur(cc.total_net)}</b></dd></dl>
    ${cc.without_start ? `<p class="small"><span class="chip mittel" style="white-space:normal">${esc(t('cc_without_start').replace('{n}', cc.without_start))}</span></p>` : ''}${cc.without_rate ? `<p class="small"><span class="chip mittel" style="white-space:normal">${esc(t('cc_without_rate').replace('{n}', cc.without_rate))}</span></p>` : ''}
    <p class="small muted">${esc(t('cc_rule').replace('{m}', cc.until_month))}</p></section>
    <div class="list">${cc.vehicles.length ? cc.vehicles.map((v) => `<a class="row" href="#/vehicles/${encodeURIComponent(v.vehicle_id)}">${plate(v.plate || v.vehicle_id)}<span class="title">${eur(v.net)}</span><span></span><span class="sub" style="white-space:normal">${v.contracts.map((c) => `${esc(t('ck_' + c.kind))} · ${esc(c.partner)}: ${c.months} × ${eur(c.monthly_rate_net)}`).join(' · ')}</span></a>`).join('') : `<p class="muted">${esc(t('cc_none'))}</p>`}</div>`;
  const cl = rep.claim_reimbursements;
  if (cl) html += `<h2>${esc(t('cr_title'))}</h2><section class="panel"><dl class="kv"><dt>${esc(t('cr_sum'))}</dt><dd><b>${cl.total_net === null ? '–' : eur(cl.total_net)}</b></dd></dl><p class="small muted">${esc(t('cr_rule'))}</p></section>
    <div class="list">${cl.items.length ? cl.items.map((x) => `<a class="row" href="#/cases/${encodeURIComponent(x.case_id)}">${plate(x.plate || x.vehicle_id)}<span class="title">${eur(x.reimbursed_net)}</span><span class="chip">${fmtD(x.reimbursed_on)}</span><span class="sub" style="white-space:normal">${esc(x.case_no)} · ${esc(x.insurer)}${x.claim_no ? ' · ' + esc(x.claim_no) : ''}</span></a>`).join('') : `<p class="muted">${esc(t('cr_none'))}</p>`}</div>`;
  render(html, 'more');
  const cr = $('#cr');
  $('#costprt').onclick = () => window.print();
  cr.onsubmit = (e) => { e.preventDefault(); S.costFrom = cr.from.value; S.costTo = cr.to.value; S.costSite = cr.site ? cr.site.value : ''; viewCosts(); };
  $('#csv').onclick = async () => { try { const blob = await api('GET', `/api/reports/costs?from=${cr.from.value}&to=${cr.to.value}${cr.site && cr.site.value ? '&site=' + encodeURIComponent(cr.site.value) : ''}&format=csv`); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fuhrpark-kosten_${cr.from.value}_${cr.to.value}.csv`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } catch (err) { toast(err.message, true); } };
}

// ---------- Fahrerakte (personenbezogen: nur Inhaber/Fuhrparkleitung, Fahrer nur eigene Akte) ----------
const DST = { ok: 'ok', hinweis: 'mittel', kritisch: 'kritisch', laeuft_ab: 'mittel', abgelaufen: 'kritisch', faellig: 'kritisch', bald: 'mittel', fehlt: 'mittel', mangel: 'kritisch' };
async function viewDrivers() {
  const dsite = isMgr() ? vsDef('drvSite') || '' : '';
  const dq = [S.drvInactive ? 'inactive=1' : '', dsite ? 'site=' + encodeURIComponent(dsite) : ''].filter(Boolean).join('&');
  const dr = await api('GET', '/api/drivers' + (dq ? '?' + dq : '')); const list = dr.drivers;
  if (!isMgr()) { if (list.length) { location.hash = '#/drivers/' + list[0].id; return; } render(`<h1>${esc(t('my_driver_file'))}</h1><p class="muted">${esc(t('no_driver_file'))}</p>`, 'more'); return; }
  let users = [];
  try { users = (await api('GET', '/api/users')).users.filter((u) => u.role === 'driver' && u.active); } catch {}
  const html = `<h1>${esc(t('drivers'))}</h1>${helpLink('drivers')}<p class="small muted">${esc(t('driver_privacy'))}</p>
    <details class="panel"><summary>${esc(t('new_driver'))}</summary><form id="ndf"><label>${esc(t('display_name'))}</label><input name="display_name" required><label>${esc(t('personnel_no'))}</label><input name="personnel_no"><label>${esc(t('site'))}</label><input name="site">
      <label>${esc(t('app_account'))}</label><select name="user_id"><option value="">${esc(t('no_account'))}</option>${users.map((u) => `<option value="${esc(u.id)}">${esc(u.display_name)} (${esc(u.username)})</option>`).join('')}</select>
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    <div class="actions" style="margin-top:0"><button type="button" class="btn secondary" id="dcsv">${esc(t('driver_csv'))}</button><button type="button" class="btn secondary" id="dprl">${esc(t('print'))}</button></div>
    ${printHead([S.drvInactive ? t('inactive_drivers') : '', dr.site ? `${t('site')}: ${dr.site === 'ohne' ? t('cs_nosite') : dr.site}` : '', t('print_count').replace('{n}', list.length)])}
    <p class="noprint"><label style="display:inline-flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="dinact" ${S.drvInactive ? 'checked' : ''} style="width:auto"> ${esc(t('inactive_drivers'))}</label></p>
    ${(dr.site_options || []).length > 1 || dr.site ? `<div class="actions noprint" style="margin-top:0"><div>${siteSelect('dsite', '', dr.site_options, dr.site, t('site'), t('filter_all'))}</div></div>` : ''}
    <div class="list">${list.map((d) => { const crit = d.status.items.filter((i) => i.status !== 'ok'); return `<a class="row ${d.status.overall === 'kritisch' ? 'p-kritisch' : d.status.overall === 'hinweis' ? 'p-mittel' : ''}" href="#/drivers/${esc(d.id)}"><span>🪪</span><span class="title">${esc(d.display_name)}${d.personnel_no ? ` <span class="small muted">${esc(d.personnel_no)}</span>` : ''}</span><span class="chip ${DST[d.status.overall]}">${esc(t('dov_' + d.status.overall))}</span><span class="sub">${[...crit.map((i) => `${t('dk2_' + i.kind)}: ${t('dst_' + i.status)} (${fmtD(i.valid_until)})`), d.status.check.status !== 'ok' ? `${t('license_check')}: ${t('dck_' + d.status.check.status)}` : '', !d.status.has_license ? t('no_license_doc') : '', d.username ? t('app_account') + ': ' + d.username : ''].filter(Boolean).map(esc).join(' · ')}</span></a>`; }).join('') || `<p class="muted">–</p>`}</div>`;
  render(html, 'more');
  const ia = $('#dinact'); if (ia) ia.onchange = () => { S.drvInactive = ia.checked; viewDrivers(); };
  const dse = $('#dsite'); if (dse) dse.onchange = () => { S.drvSite = dse.value; viewDrivers(); };
  $('#dprl').onclick = () => window.print();
  $('#dcsv').onclick = async () => { try { download(await api('GET', '/api/drivers?format=csv' + (dsite ? '&site=' + encodeURIComponent(dsite) : '')), `fuhrpark-fahrer-fristen_${bDate()}${dr.site ? '_' + fnPart(dr.site) : ''}.csv`); } catch (err) { toast(err.message, true); } };
  const f = $('#ndf'); f.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(f)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; try { const r = await api('POST', '/api/drivers', b); location.hash = '#/drivers/' + r.id; } catch (err) { toast(err.message, true); } };
}
async function viewDriver(id) {
  const x = await api('GET', '/api/drivers/' + id);
  const d = x.driver; const st = x.status; const mgr = isMgr();
  const cur = x.documents.filter((o) => !o.superseded); const old = x.documents.filter((o) => o.superseded);
  const docRow = (o) => { const it = st.items.find((i) => i.id === o.id); return `<tr><td>${esc(t('dk2_' + o.kind))}${o.title ? `<div class="small muted">${esc(o.title)}</div>` : ''}</td><td>${o.license_classes ? esc(o.license_classes) + '<br>' : ''}${o.number ? `<span class="small">${esc(o.number)}</span>` : ''}</td><td>${o.valid_until ? `<span class="chip ${it ? DST[it.status] : ''}">${fmtD(o.valid_until)}</span>` : '–'}</td><td class="small">${esc(o.evidence)}<div class="muted">${fmtD(o.created_at)} · ${esc(o.created_by_name || '')}</div></td></tr>`; };
  let html = `${mgr ? `<p><a href="#/drivers">‹ ${esc(t('back'))}</a></p>` : ''}<h1>🪪 ${esc(d.display_name)}</h1>${printHead([t('driver_file'), d.display_name])}
    <section class="panel"><dl class="kv"><dt>${esc(t('personnel_no'))}</dt><dd>${esc(d.personnel_no || '–')}</dd><dt>${esc(t('site'))}</dt><dd>${esc(d.site || '–')}</dd>
    <dt>${esc(t('status'))}</dt><dd><span class="chip ${DST[st.overall]}">${esc(t('dov_' + st.overall))}</span></dd>
    <dt>${esc(t('license_check'))}</dt><dd>${st.check.last ? `${fmtD(st.check.last)} · ${esc(t('lcr_' + st.check.result))}` : '–'}${st.check.due ? ` · ${esc(t('next_due'))} ${fmtD(st.check.due)}` : ''} <span class="chip ${DST[st.check.status]}">${esc(t('dck_' + st.check.status))}</span></dd>
    ${x.vehicles.length ? `<dt>${esc(t('vehicles'))}</dt><dd>${x.vehicles.map((v) => plate(v.plate)).join(' ')}</dd>` : ''}</dl>
    ${!d.active ? `<p class="chip">${esc(t('inactive_drivers'))}</p>` : ''}${!st.has_license ? `<div class="alert small" style="margin-top:8px">${esc(t('no_license_doc'))}</div>` : ''}${S.me.role === 'owner' ? `<div class="actions"><button type="button" class="btn secondary" id="ddex" title="${esc(t('data_export_hint'))}">${esc(t('data_export'))}</button></div>` : ''}<div class="actions noprint"><button type="button" class="btn secondary" id="ddprt">${esc(t('print'))}</button></div></section>
    <h2>${esc(t('driver_docs'))}</h2>${cur.length ? `<div class="scroll"><table><thead><tr><th>${esc(t('kind'))}</th><th></th><th>${esc(t('valid_until'))}</th><th>${esc(t('evidence'))}</th></tr></thead><tbody>${cur.map(docRow).join('')}</tbody></table></div>` : '<p class="muted">–</p>'}
    ${old.length ? `<details id="ddhist"><summary>${esc(t('history'))} (${old.length})</summary><div class="scroll"><table><tbody>${old.map(docRow).join('')}</tbody></table></div></details>` : ''}`;
  if (x.tacho) html += `<h2>${esc(t('tacho_card'))}</h2><section class="panel"><dl class="kv"><dt>${esc(t('tacho_last'))}</dt><dd>${x.tacho.last ? fmtD(x.tacho.last) : '–'}</dd><dt>${esc(t('tacho_due'))}</dt><dd>${x.tacho.due ? fmtD(x.tacho.due) + ' ' : ''}<span class="chip ${TST[x.tacho.status]}">${esc(t('tst_' + x.tacho.status))}</span></dd></dl>
    ${x.tacho_downloads.length ? `<details id="dthist"><summary>${esc(t('history'))} (${x.tacho_downloads.length}${x.tacho_downloads_truncated ? '+' : ''})</summary><ul class="small">${x.tacho_downloads.map((o) => `<li>${fmtD(o.downloaded_on)} · ${esc(o.evidence)}${o.note ? ' – ' + esc(o.note) : ''}${o.created_by_name ? ` <span class="muted">(${esc(o.created_by_name)})</span>` : ''}</li>`).join('')}</ul>${x.tacho_downloads_truncated ? `<p class="small muted dtrunc">${esc(t('hist_truncated').replace('{n}', x.tacho_downloads.length))}</p>` : ''}</details>` : ''}
    ${mgr ? `<form id="tdf" class="actions" style="flex-wrap:wrap;align-items:flex-end"><div><label>${esc(t('tacho_date'))}</label><input type="date" name="downloaded_on" required value="${bDate()}"></div><div style="flex:1;min-width:200px"><label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('tacho_ev_ph'))}"></div><button class="btn secondary">${esc(t('tacho_record'))}</button></form>` : ''}</section>`;
  if (mgr) {
    html += `<details class="panel"><summary>${esc(t('add_driver_doc'))}</summary><form id="ddf"><label>${esc(t('kind'))}</label><select name="kind">${['fuehrerschein', 'fahrerkarte', 'code95', 'unterweisung', 'sonstiges'].map((k) => `<option value="${k}">${esc(t('dk2_' + k))}</option>`).join('')}</select>
      <label>${esc(t('doc_title'))}</label><input name="title" placeholder="${esc(t('doc_title_ph'))}"><label>${esc(t('license_classes'))}</label><input name="license_classes" placeholder="C, CE"><label>${esc(t('doc_number'))}</label><input name="number">
      <label>${esc(t('issued_on'))}</label><input type="date" name="issued_on"><label>${esc(t('valid_until'))} <span class="hint">${esc(t('driver_valid_until_hint'))}</span></label><input type="date" name="valid_until">
      <label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('driver_ev_ph'))}"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
      <details class="panel"><summary>${esc(t('record_license_check'))}</summary><form id="lcf"><label>${esc(t('date'))}</label><input type="date" name="checked_on" required value="${bDate()}">
      <label>${esc(t('result'))}</label><select name="result">${['in_ordnung', 'maengel', 'nicht_vorgelegt'].map((r) => `<option value="${r}">${esc(t('lcr_' + r))}</option>`).join('')}</select><label>${esc(t('note'))}</label><input name="note"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
    if (x.license_checks.length) html += `<details id="dlchist"><summary>${esc(t('license_check'))} – ${esc(t('history'))} (${x.license_checks.length}${x.license_checks_truncated ? '+' : ''})</summary><ul class="small">${x.license_checks.map((c) => `<li>${fmtD(c.checked_on)} · ${esc(t('lcr_' + c.result))} · ${esc(c.checked_by_name || '')}${c.note ? ' – ' + esc(c.note) : ''}</li>`).join('')}</ul>${x.license_checks_truncated ? `<p class="small muted dtrunc">${esc(t('hist_truncated').replace('{n}', x.license_checks.length))}</p>` : ''}</details>`;
    html += `<details class="panel"><summary>${esc(t('edit_master'))}</summary><form id="edf"><label>${esc(t('display_name'))}</label><input name="display_name" required value="${esc(d.display_name)}"><label>${esc(t('personnel_no'))}</label><input name="personnel_no" value="${esc(d.personnel_no || '')}"><label>${esc(t('site'))}</label><input name="site" value="${esc(d.site || '')}">
      <label class="check"><input type="checkbox" name="active" ${d.active ? 'checked' : ''}> ${esc(t('active'))}</label><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>`;
  }
  render(html, 'more');
  $('#ddprt').onclick = () => window.print();
  const dx = $('#ddex'); if (dx) dx.onclick = async () => { if (!confirm(t('data_export_hint'))) return; try { const r = await api('GET', `/api/drivers/${id}/data-export`); download(r instanceof Blob ? r : new Blob([JSON.stringify(r, null, 1)], { type: 'application/json' }), `datenauskunft_fahrer_${bDate()}.json`); } catch (err) { toast(err.message, true); } };
  const post = async (path, b) => { for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; try { await api('POST', path, b); toast('✓'); viewDriver(id); } catch (err) { toast(err.message, true); } };
  const ddf = $('#ddf'); if (ddf) ddf.onsubmit = (e) => { e.preventDefault(); post(`/api/drivers/${id}/documents`, Object.fromEntries(new FormData(ddf))); };
  const tdf = $('#tdf'); if (tdf) tdf.onsubmit = (e) => { e.preventDefault(); post('/api/tacho/downloads', { kind: 'fahrerkarte', driver_id: id, ...Object.fromEntries(new FormData(tdf)) }); };
  const lcf = $('#lcf'); if (lcf) lcf.onsubmit = (e) => { e.preventDefault(); post(`/api/drivers/${id}/license-checks`, Object.fromEntries(new FormData(lcf))); };
  const edf = $('#edf'); if (edf) edf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(edf)); b.active = !!edf.active.checked; try { await api('PATCH', `/api/drivers/${id}`, b); toast('✓'); viewDriver(id); } catch (err) { toast(err.message, true); } };
}

// Gewährleistung an Teil/Fremdleistung: „Gewährleistung bis …“ (abgelaufen gedämpft)
function warrChip(d) { return d ? ` <span class="chip${d >= bDate() ? ' ok' : ''}">${esc(t('warranty_until_d').replace('{d}', fmtD(d)))}</span>` : ''; }
// Kurzinfo zum Fahrzeug im Vorgang: weitere offene Vorgänge, bald fällige Prüfungen, letzter km-Stand (nur gespeicherte Daten)
function vehInfo(vi, c) {
  const prev = (vi && vi.previous_same_item) || [];
  const vn = (vi && vi.notes) || [];
  const wr = (vi && vi.warranties) || [];
  if (!vi || (!vi.other_open_total && !vi.inspections_due.length && !vi.last_km && !prev.length && !vn.length && !wr.length)) return '';
  const today = bDate();
  const parts = [];
  if (vi.other_open_total) parts.push(`<dt>${esc(t('vi_other_cases'))}</dt><dd>${vi.other_open_cases.map((o) => `<a href="#/cases/${esc(o.id)}">${esc(o.case_no)}</a> <span class="chip ${esc(o.priority)}">${esc(t('st_' + o.status))}</span>${o.safety_lock ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}`).join('<br>')}${vi.other_open_total > vi.other_open_cases.length ? `<br><span class="small muted">+${vi.other_open_total - vi.other_open_cases.length}</span>` : ''}</dd>`);
  if (vi.inspections_due.length) parts.push(`<dt>${esc(t('vi_due'))}${vi.inspections_due.some((m) => m.recall_ref) ? ' · ' + esc(t('vi_recalls')) : ''}</dt><dd>${vi.inspections_due.map((m) => `${esc(mk(m.kind))} ${m.next_due_date ? fmtD(m.next_due_date) : esc(t('vi_recall_open'))}${m.next_due_date && m.next_due_date < today ? ` <span class="chip kritisch">${esc(t('ms_ueberfaellig'))}</span>` : ''}${m.recall_ref ? ` <span class="small muted">(${esc(m.recall_ref)})</span>` : ''}`).join('<br>')}${(vi.inspections_due_total || 0) > vi.inspections_due.length ? `<br><span class="small muted" id="vidmore">+${vi.inspections_due_total - vi.inspections_due.length} · <a href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${esc(t('vi_due_all'))} ›</a></span>` : ''}</dd>`);
  if (prev.length) parts.unshift(`<dt>${esc(t('vi_prev_same'))}</dt><dd>${prev.map((o) => `<a href="#/cases/${esc(o.id)}">${esc(o.case_no)}</a> · ${esc(t('st_fahrzeug_freigegeben'))} ${fmtD(o.closed_at)}`).join('<br>')}<div class="small muted">${esc(t('vi_prev_same_hint'))}</div></dd>`);
  if (wr.length) parts.unshift(`<dt>${esc(t('vi_warranty'))}</dt><dd>${wr.map((w) => `<a href="#/cases/${esc(w.case_id)}">${esc(w.case_no)}</a> · ${esc(w.item)}${w.item_kind === 'part' && w.supplier ? ` <span class="small muted">(${esc(w.supplier)})</span>` : ''} · ${esc(t('warranty_until_d').replace('{d}', fmtD(w.warranty_until)))}`).join('<br>')}${vi.warranties_truncated ? `<div class="small" role="note" data-warrmore>${esc(t('warr_more').replace('{n}', vi.warranties_max))}</div>` : ''}<div class="small muted">${esc(t('vi_warranty_hint'))}</div></dd>`);
  if (vn.length) parts.unshift(`<dt>${esc(t('vnotes'))}</dt><dd>${vn.map((n) => `<b>ⓘ ${esc(n.text)}</b>${n.valid_until ? ` <span class="small muted">${esc(t('vnote_until').replace('{d}', fmtD(n.valid_until)))}</span>` : ''}`).join('<br>')}</dd>`);
  if (vi.last_km) parts.push(`<dt>${esc(t('km'))}</dt><dd>${fmtKm(vi.last_km.km)} <span class="small muted">(${fmtD(vi.last_km.measured_at)})</span></dd>`);
  return `<details class="small" style="margin-top:8px"${vi.other_open_total || prev.length || vn.length || wr.length || vi.inspections_due.some((m) => m.recall_ref || (m.next_due_date && m.next_due_date < today)) ? ' open' : ''}><summary><b>${esc(t('vi_title'))}</b></summary><dl class="kv">${parts.join('')}</dl></details>`;
}

// Nach Scan des Fahrzeug-Aufklebers: Auswahl „Schaden melden“ / „Abfahrtskontrolle“ für dieses Fahrzeug
async function viewScan(id) {
  const vs = await vehiclesCached();
  const v = vs.find((x) => x.id === id);
  if (!v) { toast(t('qr_vehicle_unknown'), true); location.hash = '#/new'; return; }
  render(`<div>${plate(v.plate, { big: true, locked: v.availability === 'gesperrt' })}</div><h1 style="margin-top:12px">${esc(t('scan_title'))}</h1>
    ${v.availability === 'gesperrt' ? `<div class="panel alert" role="alert"><b>${esc(t('scan_locked'))}</b></div>` : ''}
    ${v.coupled && v.coupled.availability === 'gesperrt' ? `<div class="panel alert" role="alert"><b>${esc(coupledLockedText(v.coupled))}</b></div>` : ''}
    <div class="list"><a class="row" href="#/new/${esc(v.id)}"><span>⚠</span><span class="title">${esc(t('report_damage'))}</span><span></span></a>
    <a class="row" href="#/check/${esc(v.id)}"><span>✓</span><span class="title">${esc(t('departure_check'))}</span><span></span></a>
    <a class="row" href="#/emergency?v=${esc(v.id)}"><span>☎</span><span class="title">${esc(t('em_title'))}</span><span></span></a>
    ${S.me.role !== 'driver' ? `<a class="row" href="#/vehicles/${esc(v.id)}"><span>${ICON.truck}</span><span class="title">${esc(t('vehicle_file'))}</span><span></span></a>` : ''}</div>`, 'new');
}

// ---------- Panne & Notfall: Rufnummern für unterwegs (vom Betrieb eingetragen; fest nur Notruf 112) ----------
const telHref = (p) => 'tel:' + String(p).replace(/[^\d+]/g, '');
const emScope = (c) => (c.scope === 'vehicle' ? (c.plate || t('em_scope_vehicle')) : c.scope === 'site' ? `${t('site')}: ${c.site}` : t('em_scope_all'));
function emRows(list) {
  return `<div class="list">${list.map((c) => `<div class="row emrow"><span aria-hidden="true">☎</span><span class="title"><b>${esc(c.label)}</b> <span class="chip">${esc(t('em_kind_' + c.kind))}</span>${c.note ? `<br><span class="small">${esc(c.note)}</span>` : ''}</span><a class="btn" href="${esc(telHref(c.phone))}" aria-label="${esc(t('em_call_x').replace('{x}', c.label))}">${esc(c.phone)}</a></div>`).join('')}</div>`;
}
async function viewEmergency(vid) {
  render(`<p class="muted">${esc(t('loading'))}</p>`, 'more');
  const key = `cfp_emerg_${S.me.id}_${S.me.environment}_${vid || ''}`;
  let d = null; let cachedAt = null;
  try { d = await api('GET', '/api/emergency' + (vid ? `?vehicle_id=${encodeURIComponent(vid)}` : '')); try { localStorage.setItem(key, JSON.stringify({ at: new Date().toISOString(), d })); } catch {} }
  catch (err) { if (!err.offline) throw err; try { const c = JSON.parse(localStorage.getItem(key) || 'null'); if (c) { d = c.d; cachedAt = c.at; } } catch {} }
  let html = `<p class="noprint"><a href="${vid ? `#/v/${esc(vid)}` : '#/'}">‹ ${esc(t('back'))}</a></p><h1>${esc(t('em_title'))}</h1>
    <section class="panel alert" role="note"><p style="margin-top:0"><b>${esc(t('em_112'))}</b></p><a class="btn danger block" href="tel:112" id="em112">${esc(t('em_112_btn'))}</a></section>`;
  if (!d) html += `<div class="panel alert">${esc(t('offline_view'))}</div><p class="muted">${esc(t('em_offline_none'))}</p>`;
  else {
    if (cachedAt) html += `<div class="panel alert">${esc(t('offline_view'))} (${esc(t('as_of'))} ${fmtDT(cachedAt)})</div>`;
    for (const v of d.vehicles) if (v.contacts.length) html += `<h2>${plate(v.plate)} <span class="small muted">${esc(t('em_for_vehicle'))}</span></h2>${emRows(v.contacts)}`;
    if (d.general.length) html += `<h2>${esc(t('em_general'))}</h2>${emRows(d.general)}`;
    if (!d.general.length && !d.vehicles.some((v) => v.contacts.length)) html += `<p class="muted" id="emnone">${esc(t(d.can_edit ? 'em_none_mgr' : 'em_none'))}</p>`;
    if (d.can_edit && !cachedAt) html += `<div class="actions noprint"><a class="btn secondary" href="#/emergency/edit">${esc(t('em_manage'))}</a></div>`;
  }
  html += `<p style="margin-top:16px"><a href="${vid ? `#/new/${esc(vid)}` : '#/new'}">${esc(t('report_damage'))} ›</a> · <a href="#/help?s=accident">${esc(t('help_accident_t'))} ›</a></p>`;
  render(html, 'more');
}
async function viewEmergencyEdit() {
  render(`<p class="muted">${esc(t('loading'))}</p>`, 'more');
  const showArch = !!S.emArch;
  const [d, vs, sites] = await Promise.all([api('GET', '/api/emergency/contacts' + (showArch ? '?archived=1' : '')), vehiclesCached(), api('GET', '/api/sites').then((r) => r.sites.filter((x) => x !== 'ohne')).catch(() => [])]);
  const edit = S.emEdit ? d.contacts.find((c) => c.id === S.emEdit) : null;
  const e = edit || { kind: 'dispo', scope: 'all' };
  const opt = (v, cur, label) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const emFull = !edit && d.contacts.length >= d.max_active; // voll: nur Bearbeiten/Archivieren, kein neues Formular (Server lehnt ab)
  const form = showArch ? '' : emFull ? `<p class="panel small" id="emfull" role="note">${esc(t('em_full').replace('{m}', d.max_active))}</p>` : `<section class="panel"><h2 style="margin-top:0">${esc(t(edit ? 'em_edit' : 'em_add'))}</h2><form id="emf">
    <label>${esc(t('em_kind'))}</label><select name="kind">${d.kinds.map((k) => opt(k, e.kind, t('em_kind_' + k))).join('')}</select>
    <label>${esc(t('em_label'))}</label><input name="label" maxlength="60" required value="${esc(e.label || '')}">
    <label>${esc(t('em_phone'))}</label><input name="phone" type="tel" inputmode="tel" maxlength="30" required value="${esc(e.phone || '')}">
    <label>${esc(t('em_note'))}</label><input name="note" maxlength="200" value="${esc(e.note || '')}">
    <label>${esc(t('em_scope'))}</label><select name="scope" id="emscope">${['all', 'site', 'vehicle'].map((k) => opt(k, e.scope, t('em_scope_' + k))).join('')}</select>
    <div id="emsite"${e.scope === 'site' ? '' : ' hidden'}><label>${esc(t('site'))}</label><select name="site">${[...new Set([...sites, ...(e.site ? [e.site] : [])])].map((x) => opt(x, e.site, x)).join('')}</select></div>
    <div id="emveh"${e.scope === 'vehicle' ? '' : ' hidden'}><label>${esc(t('vehicle'))}</label><select name="vehicle_id">${vs.slice().sort((a, b) => a.plate.localeCompare(b.plate, 'de')).map((v) => opt(v.id, e.vehicle_id, v.plate)).join('')}</select></div>
    <div class="actions"><button class="btn">${esc(t('save'))}</button>${edit ? `<button type="button" class="btn secondary" id="emcancel">${esc(t('cancel'))}</button>` : ''}</div></form></section>`;
  const rows = d.contacts.map((c) => `<div class="row emman"><span class="title"><b>${esc(c.label)}</b> · <a class="emphone" href="${esc(telHref(c.phone))}">${esc(c.phone)}</a> <span class="chip">${esc(t('em_kind_' + c.kind))}</span><br><span class="small">${esc(t('em_scope'))}: ${esc(emScope(c))}${c.note ? ' · ' + esc(c.note) : ''}</span><br><span class="small muted">${showArch ? `${esc(t('em_archived_at'))} ${fmtDT(c.archived_at)} · ${esc(c.archived_by_name || '')}` : `${fmtDT(c.updated_at)} · ${esc(c.changed_by_name || '')}`}</span></span>${showArch ? '' : `<span class="actions" style="margin:0"><button type="button" class="btn secondary" data-emedit="${esc(c.id)}">${esc(t('em_edit'))}</button><button type="button" class="btn secondary" data-emarch="${esc(c.id)}">${esc(t('em_archive'))}</button></span>`}</div>`).join('');
  render(`<p class="noprint"><a href="#/emergency">‹ ${esc(t('back'))}</a></p><h1>${esc(t('em_manage'))}</h1><p class="small muted">${esc(t('em_manage_hint'))}</p>
    <div class="actions" role="group" aria-label="${esc(t('em_manage'))}"><button type="button" class="btn ${showArch ? 'secondary' : ''}" data-emtab="0" aria-pressed="${!showArch}">${esc(t('em_active'))}</button><button type="button" class="btn ${showArch ? '' : 'secondary'}" data-emtab="1" aria-pressed="${showArch}">${esc(t('em_archive_list'))}</button></div>
    ${form}${showArch ? '' : `<p class="small muted" id="emcount">${esc(t('em_count').replace('{n}', d.contacts.length).replace('{m}', d.max_active))}</p>`}
    ${showArch && d.truncated ? `<p class="small muted" id="emartrunc">${esc(t('em_arch_truncated').replace('{n}', d.contacts.length))}</p>` : ''}<div class="list" id="emlist">${rows || `<p class="muted">–</p>`}</div>`, 'more');
  $$('[data-emtab]').forEach((b) => (b.onclick = () => { S.emArch = b.dataset.emtab === '1'; S.emEdit = null; viewEmergencyEdit(); }));
  const f = $('#emf');
  if (f) {
    $('#emscope').onchange = () => { const sc = $('#emscope').value; $('#emsite').hidden = sc !== 'site'; $('#emveh').hidden = sc !== 'vehicle'; };
    const cc = $('#emcancel'); if (cc) cc.onclick = () => { S.emEdit = null; viewEmergencyEdit(); };
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const b = Object.fromEntries(new FormData(f));
      if (b.scope !== 'site') delete b.site; if (b.scope !== 'vehicle') delete b.vehicle_id;
      try { if (edit) await api('PATCH', `/api/emergency/contacts/${edit.id}`, b); else await api('POST', '/api/emergency/contacts', b); toast(t('em_saved')); S.emEdit = null; viewEmergencyEdit(); } catch (err) { toast(err.message, true); }
    };
  }
  $$('[data-emedit]').forEach((b) => (b.onclick = async () => { S.emEdit = b.dataset.emedit; await viewEmergencyEdit(); window.scrollTo(0, 0); }));
  $$('[data-emarch]').forEach((b) => (b.onclick = async () => { if (!confirm(t('em_archive_confirm'))) return; try { await api('POST', `/api/emergency/contacts/${b.dataset.emarch}/archive`); if (S.emEdit === b.dataset.emarch) S.emEdit = null; toast(t('em_saved')); viewEmergencyEdit(); } catch (err) { toast(err.message, true); } }));
}

// ---------- QR-Aufkleber je Fahrzeug: Scan öffnet „Schaden melden“ mit vorausgewähltem Fahrzeug ----------
async function viewQrSheet(oneId) {
  if (!isMgr()) { location.hash = '#/'; return; }
  const all = (await api('GET', '/api/vehicles')).vehicles;
  const k = S.qrKind || 'lkw';
  const list = oneId ? all.filter((v) => v.id === oneId) : all.filter((v) => k === 'all' || v.kind === k).sort((a, b) => a.plate.localeCompare(b.plate));
  const card = (v) => { const link = `${location.origin}/#/v/${v.id}`; return `<div class="qrcard"><div class="qr">${qrSvg(link, { label: `${t('report_damage')} ${v.plate}` })}</div><div>${plate(v.plate)}<p class="small"><b>${esc(t('qr_sticker_text'))}</b></p><p class="small muted">${esc(t('qr_sticker_sub'))}</p></div></div>`; };
  render(`<div class="noprint">${oneId ? `<p><a href="#/vehicles/${esc(oneId)}">‹ ${esc(t('back'))}</a></p>` : `<p><a href="#/vehicles">‹ ${esc(t('back'))}</a></p>`}<h1>${esc(t('qr_sheet'))}</h1><p class="small muted">${esc(t('qr_sheet_hint'))}</p>
    ${oneId ? '' : `<div class="actions" style="flex-wrap:wrap">${[['lkw', t('vk_lkw')], ['anhaenger', t('vk_anhaenger')], ['all', t('filter_all')]].map(([key, l]) => `<button type="button" class="btn ${k === key ? '' : 'secondary'}" data-qk="${key}">${esc(l)}</button>`).join('')}</div>`}
    <div class="actions"><button type="button" class="btn" id="qprt">${esc(t('print'))} (${list.length})</button></div></div>
    <div class="qrsheet">${list.map(card).join('') || '<p class="muted">–</p>'}</div>`, 'more');
  $$('[data-qk]').forEach((b) => (b.onclick = () => { S.qrKind = b.dataset.qk; viewQrSheet(); }));
  $('#qprt').onclick = () => window.print();
}

// ---------- Kurzanleitung für Fahrer (Aushang): druckbar in DE/UK/EN, Knopfnamen aus denselben Texten wie die App ----------
// {key} = App-Text in der Sprache des Aushangs (fett), {=key} = ohne Hervorhebung. Keine Namen, keine Telefonnummern (Linien zum Ausfüllen).
const GUIDE_SECTIONS = ['access', 'install', 'report', 'check', 'crit', 'offline', 'status'];
function guideFill(lang, s) {
  const get = (k) => (STRINGS[lang] && STRINGS[lang][k]) || STRINGS.de[k] || k;
  return String(s).split(/(\{=?\w+\})/).map((p) => { const m = p.match(/^\{(=?)(\w+)\}$/); return m ? (m[1] ? esc(get(m[2])) : `<b>${esc(get(m[2]))}</b>`) : esc(p); }).join('');
}
function viewDriverGuide(l) {
  const g = ['de', 'uk', 'en'].includes(l) ? l : S.guideLang || S.lang || 'de';
  S.guideLang = g;
  const gt = (k) => (STRINGS[g] && STRINGS[g][k]) || STRINGS.de[k] || k;
  const addr = `${location.origin}/`;
  const field = (k) => `<div class="paper-field"><span>${esc(gt(k))}</span><i></i></div>`;
  const sec = (k, i) => {
    const parts = gt('g_' + k).split('|');
    const body = parts.length > 1 ? `<ol>${parts.map((x) => `<li>${guideFill(g, x)}</li>`).join('')}</ol>` : `<p>${guideFill(g, parts[0])}</p>`;
    return `<section class="guide-sec${k === 'crit' ? ' alert' : ''}"><h2>${i + 1}. ${esc(gt('g_' + k + '_t'))}</h2>${body}${k === 'crit' ? `<div class="paper-head">${field('g_phone_dispo')}${field('g_phone_fleet')}</div>` : ''}</section>`;
  };
  render(`<div class="noprint">${isMgr() ? `<p><a href="#/more">‹ ${esc(t('back'))}</a></p>` : ''}<h1>${esc(t('guide'))}</h1><p class="small muted">${esc(t('guide_hint'))}</p>
    <p class="small" id="glabel">${esc(t('guide_lang'))}</p><div class="actions" role="group" aria-labelledby="glabel" style="flex-wrap:wrap">${[['de', 'Deutsch', '#/guide?l=de'], ['uk', 'Українська', '#/guide?l=uk'], ['en', 'English', '#/guide?l=en']].map(([k, n, href]) => `<a class="btn ${k === g ? '' : 'secondary'}" href="${href}" lang="${k}"${k === g ? ' aria-current="true"' : ''}>${n}</a>`).join('')}</div>
    <div class="actions"><button type="button" class="btn" id="gprt">${esc(t('print'))}</button></div></div>
    <article class="guide" lang="${g}"><h1>${esc(gt('g_title'))}</h1>
    <div class="guide-top"><div class="qr">${(() => { try { return qrSvg(addr, { label: gt('g_addr') }); } catch { return ''; } })()}</div><div><p class="small"><b>${esc(gt('g_addr'))}</b></p><p class="guide-addr">${esc(addr)}</p></div></div>
    ${GUIDE_SECTIONS.map(sec).join('')}
    <p class="small muted">${esc(gt('g_printed'))}: ${esc(new Intl.DateTimeFormat(locOf(g), { timeZone: 'UTC' }).format(new Date(bDate() + 'T12:00:00Z')))} · CEVIK ${esc(gt("app"))} [CLAUDE]</p></article>`, 'more');
  $('#gprt').onclick = () => window.print();
}

// ---------- Auslese-Fristen Fahrerkarte / Massenspeicher ----------
const TST = { ueberfaellig: 'kritisch', bald: 'mittel', keine: '', ok: 'ok' };
async function viewTacho() {
  const ts = vsDef('tachoSite') || ''; const tsq = ts ? 'site=' + encodeURIComponent(ts) : '';
  const r = await api('GET', '/api/tacho' + (tsq ? '?' + tsq : ''));
  const tab = S.tachoTab || 'drivers'; const f = S.tachoFilter || 'attention';
  const list = r[tab];
  const sel = (x) => f === 'all' || (f === 'attention' ? ['ueberfaellig', 'bald'].includes(x.status) : x.status === f);
  const rows = list.filter(sel); const tot = r.totals[tab];
  const filters = [['attention', `${t('tst_ueberfaellig')} / ${t('tst_bald')}`, tot.ueberfaellig + tot.bald], ['keine', t('tst_keine'), tot.keine], ['all', t('filter_all'), list.length]];
  const opts = list.map((x) => `<option value="${esc(x.id)}">${esc(tab === 'drivers' ? x.display_name : x.plate)}</option>`).join('');
  // Ausdruck (Nachweis/Ablage): Reiter, Auswahl, Standort und Anzahl im Vermerk – Erfassen/Import erscheinen nicht
  const fl = (filters.find(([k]) => k === f) || [])[1] || '';
  render(`<h1>${esc(t('tacho'))}</h1>${printHead([tab === 'drivers' ? t('tacho_cards') : t('tacho_vus'), `${t('print_filter')}: ${fl}`, r.site ? `${t('site')}: ${r.site === 'ohne' ? t('cs_nosite') : r.site}` : '', t('print_count').replace('{n}', rows.length)])}<p class="small muted">${esc(t('tacho_rule'))}</p>
    <div class="actions" style="flex-wrap:wrap"><button type="button" class="btn ${tab === 'drivers' ? '' : 'secondary'}" data-tt="drivers">${esc(t('tacho_cards'))} (${r.drivers.length})</button><button type="button" class="btn ${tab === 'vehicles' ? '' : 'secondary'}" data-tt="vehicles">${esc(t('tacho_vus'))} (${r.vehicles.length})</button></div>
    <div class="actions" style="flex-wrap:wrap;margin-top:0">${filters.map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-tf="${k}">${esc(l)} (${n})</button>`).join('')}</div>
    ${(r.site_options || []).length > 1 || r.site ? `<div class="actions noprint" style="margin-top:0"><div>${siteSelect('tsite', '', r.site_options, r.site, t('site'), t('filter_all'))}</div></div>` : ''}
    <div class="list">${rows.map((x) => `<a class="row ${x.status === 'ueberfaellig' ? 'p-kritisch' : x.status === 'bald' ? 'p-mittel' : ''}" href="${tab === 'drivers' ? '#/drivers/' + esc(x.id) : '#/vehicles/' + encodeURIComponent(x.id)}">${tab === 'drivers' ? '<span>🪪</span>' : plate(x.plate)}<span class="title">${tab === 'drivers' ? esc(x.display_name) : x.due ? `${esc(t('tacho_due'))} ${fmtD(x.due)}` : '–'}</span><span class="chip ${TST[x.status]}">${esc(t('tst_' + x.status))}</span><span class="sub">${[tab === 'drivers' && x.due && `${esc(t('tacho_due'))} ${fmtD(x.due)}`, `${esc(t('tacho_last'))}: ${x.last ? fmtD(x.last) : '–'}`, x.site && esc(x.site), tab === 'drivers' && x.personnel_no && esc(x.personnel_no)].filter(Boolean).join(' · ')}</span></a>`).join('') || `<p class="muted">–</p>`}</div>
    ${tab === 'drivers' && r.without_card.length ? `<p class="small muted">${esc(t('tacho_without_card'))}: ${r.without_card.map((d) => esc(d.display_name)).join(', ')}</p>` : ''}
    ${list.length ? `<details class="panel"><summary>${esc(t('tacho_record'))}</summary><form id="tnf"><label>${esc(tab === 'drivers' ? t('role_driver') : t('vehicle'))}</label><select name="target" required>${opts}</select>
      <label>${esc(t('tacho_date'))}</label><input type="date" name="downloaded_on" required value="${bDate()}"><label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('tacho_ev_ph'))}"><label>${esc(t('note'))}</label><input name="note">
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}
    <div class="actions"><button type="button" class="btn secondary" id="tcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="tprt">${esc(t('print'))}</button></div>
    <section class="panel noprint"><h2 style="margin-top:0">${esc(t('tacho_import'))}</h2><p class="small muted">${esc(t('tacho_import_hint'))}</p>
      <label for="tsrc">${esc(t('tacho_import_src'))}</label><input id="tsrc" placeholder="${esc(t('tacho_ev_ph'))}"><input type="file" id="timp" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('tacho_import'))}" style="margin-top:8px"><div id="timpr"></div></section>`, 'more');
  $$('[data-tt]').forEach((b) => (b.onclick = () => { S.tachoTab = b.dataset.tt; viewTacho(); }));
  $$('[data-tf]').forEach((b) => (b.onclick = () => { S.tachoFilter = b.dataset.tf; viewTacho(); }));
  const tse = $('#tsite'); if (tse) tse.onchange = () => { S.tachoSite = tse.value; viewTacho(); };
  $('#tprt').onclick = () => window.print();
  $('#tcsv').onclick = async () => { try { download(await api('GET', '/api/tacho?format=csv' + (tsq ? '&' + tsq : '')), `fuhrpark-auslesungen_${r.today}${r.site ? '_' + fnPart(r.site) : ''}.csv`); } catch (err) { toast(err.message, true); } };
  const inp = $('#timp');
  inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    const text = await readCsvFile(file); const q = $('#tsrc').value.trim() ? `&source=${encodeURIComponent($('#tsrc').value.trim())}` : '';
    const show = (r, applied) => {
      const box = $('#timpr'); if (!box) return;
      box.innerHTML = `<p><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(t('ia_neu'))}: ${r.counts.neu} · ${esc(t('tacho_known'))}: ${r.counts.vorhanden} · ${esc(t('skipped'))}: ${r.counts.uebersprungen}</p>
        ${r.rows.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('line'))}</th><th>${esc(t('kind'))}</th><th>${esc(t('tacho_target'))}</th><th>${esc(t('tacho_date'))}</th><th></th></tr></thead><tbody>${r.rows.map((x) => `<tr><td>${x.line}</td><td>${esc(t(x.kind === 'fahrerkarte' ? 'dk2_fahrerkarte' : 'tacho_vu'))}</td><td style="white-space:nowrap">${esc(x.label)}</td><td>${fmtD(x.downloaded_on)}</td><td><span class="chip ${x.status === 'neu' ? 'ok' : ''}">${esc(x.status === 'neu' ? t('ia_neu') : t('tacho_known'))}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${r.skipped.length ? `<details ${applied ? '' : 'open'}><summary>${esc(t('skipped'))} (${r.skipped.length})</summary><ul class="small">${r.skipped.map((x) => `<li>${esc(t('line'))} ${x.line}: ${esc(reasonText(x.reason))}</li>`).join('')}</ul></details>` : ''}
        ${!applied && r.counts.neu ? `<div class="actions"><button type="button" class="btn" id="tapply">${esc(t('apply_import'))}</button></div>` : ''}`;
      stackTables(box);
      const ap = $('#tapply');
      if (ap) ap.onclick = async () => { ap.disabled = true; try { const done = await api('POST', '/api/tacho/import' + (q ? '?' + q.slice(1) : ''), text, { headers: { 'content-type': 'text/csv' } }); toast('✓'); await viewTacho(); show(done, true); } catch (err) { ap.disabled = false; toast(err.message, true); } };
    };
    try { show(await api('POST', '/api/tacho/import?dry_run=1' + q, text, { headers: { 'content-type': 'text/csv' } }), false); } catch (err) { toast(err.message, true); }
  };
  const nf = $('#tnf'); if (nf) nf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(nf)); const body = { kind: tab === 'drivers' ? 'fahrerkarte' : 'massenspeicher', downloaded_on: b.downloaded_on, evidence: b.evidence };
    body[tab === 'drivers' ? 'driver_id' : 'vehicle_id'] = b.target; if (b.note) body.note = b.note;
    try { await api('POST', '/api/tacho/downloads', body); toast('✓'); viewTacho(); } catch (err) { toast(err.message, true); } };
}

// ---------- Hinweise & Push ----------
async function viewInbox() {
  // Filter: alle / ungelesen (weder geöffnet noch quittiert) / dringend – serverseitig, Zähler über ALLE Hinweise (nicht nur die neuesten 100)
  const NF = { all: () => true, unread: (x) => !x.opened_at && !x.acknowledged_at, urgent: (x) => !!x.urgent };
  // Gewählter Filter gilt für die App-Sitzung; ohne Wahl: „Ungelesen“, solange es ungelesene gibt, sonst „Alle“
  let n = await api('GET', '/api/notifications' + (NF[S.inboxF] && S.inboxF !== 'all' ? '?filter=' + S.inboxF : ''));
  const nf = NF[S.inboxF] ? S.inboxF : n.counts.unread ? 'unread' : 'all';
  if (nf !== n.filter) n = await api('GET', '/api/notifications?filter=' + nf);
  S.unread = n.counts.unread;
  const shown = n.notifications;
  render(`<h1>${esc(t('notifications'))}</h1>${n.quiet ? `<p class="small muted" id="qinfo">${esc(t('quiet_on').replace('{f}', n.quiet.from).replace('{t}', n.quiet.to))} – ${esc(t('quiet_short'))}</p>` : ''}<section class="panel" id="push"></section>
    <details class="panel" id="np"><summary>${esc(t('push_prefs'))}</summary><p class="small muted">${esc(t('push_prefs_hint'))}</p><div id="npl"></div></details>
    ${n.counts.all ? `<div class="actions"><button class="btn secondary" id="ra">${esc(t('mark_read'))}</button></div>
    <div class="seg-tabs" id="nfil">${Object.keys(NF).map((k) => `<a href="#/inbox" data-nf="${k}" class="${k === nf ? 'on' : ''}"${k === nf ? ' aria-current="true"' : ''}>${esc(t(k === 'all' ? 'all' : 'nf_' + k))} (${n.counts[k]})</a>`).join('')}</div>` : ''}
    ${n.truncated ? `<p class="small panel" id="ntrunc">${esc(t('nf_truncated').replace('{max}', n.max).replace('{n}', n.counts[nf]))}</p>` : ''}
    <div class="list">${shown.map((x) => `<div class="row note ${x.urgent ? 'p-kritisch' : ''}" style="${x.opened_at || x.acknowledged_at ? 'opacity:.7' : ''}"><span class="chip ${x.urgent ? 'kritisch' : ''}">${fmtDT(x.created_at)}</span><a class="title" style="white-space:normal" href="${x.case_id ? '#/cases/' + esc(x.case_id) : x.kind === 'new_login' ? '#/more?o=sess' : S.me.role === 'driver' ? '#/' : isMgr() ? '#/master' : '#/'}" data-open="${esc(x.id)}">${esc(x.title)}</a>${x.acknowledged_at ? '<span class="chip ok">✓</span>' : `<button class="btn secondary" data-ack="${esc(x.id)}">${esc(t('ack'))}</button>`}<span class="sub" style="white-space:normal">${esc(x.body)} · Push: ${esc(x.push_status === 'pending' && x.push_hold_until && Date.parse(x.push_hold_until) > Date.now() ? t('pst_held').replace('{t}', fmtDT(x.push_hold_until)) : t('pst_' + x.push_status) === 'pst_' + x.push_status ? x.push_status : t('pst_' + x.push_status))}</span></div>`).join('') || `<p class="muted">${esc(t(n.counts.all ? 'nf_none' : 'no_notifications'))}</p>`}</div>`, '');
  pushPanel($('#push'));
  const np = $('#np');
  np.ontoggle = async () => {
    if (!np.open || np.dataset.loaded) return;
    try {
      const pr = await api('GET', '/api/me/notify-prefs'); np.dataset.loaded = '1';
      const q = pr.quiet;
      $('#npl').innerHTML = pr.kinds.map((k) => `<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-pk="${esc(k)}"${pr.muted.includes(k) ? '' : ' checked'}> ${esc(t('pk_' + k))}</label>`).join('')
        + `<h3 style="margin-top:14px">${esc(t('quiet_title'))}</h3><p class="small muted">${esc(t('quiet_hint'))}</p>
        <p id="qst"><b>${esc(q ? t('quiet_on').replace('{f}', q.from).replace('{t}', q.to) : t('quiet_none'))}</b></p>
        <form id="qf" class="grid2"><div><label for="qfrom">${esc(t('quiet_from'))}</label><input id="qfrom" type="time" step="60" required value="${esc(q ? q.from : '')}"></div>
        <div><label for="qto">${esc(t('quiet_to'))}</label><input id="qto" type="time" step="60" required value="${esc(q ? q.to : '')}"></div>
        <div class="actions" style="grid-column:1/-1"><button class="btn secondary">${esc(t('quiet_save'))}</button>${q ? `<button type="button" class="btn secondary" id="qoff">${esc(t('quiet_off'))}</button>` : ''}</div></form>`;
      const qsave = async (quiet) => {
        try { await api('PUT', '/api/me/notify-prefs', { quiet }); toast('✓'); await viewInbox(); const d = $('#np'); if (d) d.open = true; } catch (err) { toast(err.message, true); }
      };
      $('#qf').onsubmit = (e) => { e.preventDefault(); qsave({ from: $('#qfrom').value.slice(0, 5), to: $('#qto').value.slice(0, 5) }); };
      const qoff = $('#qoff'); if (qoff) qoff.onclick = () => qsave(null);
      $$('[data-pk]', np).forEach((cb) => (cb.onchange = async () => {
        const muted = $$('[data-pk]', np).filter((x) => !x.checked).map((x) => x.dataset.pk);
        try { await api('PUT', '/api/me/notify-prefs', { muted }); toast('✓'); } catch (err) { toast(err.message, true); }
      }));
    } catch (err) { toast(err.message, true); }
  };
  // Nach Quittieren/„Alle gelesen“/Filterwechsel: aufgeklappter Bereich „Push für diese Hinweise“ bleibt offen; Fehler (z. B. kein Netz) als Meldung statt stillem Abbruch
  const again = async () => { const o = np.open; await viewInbox(); const d = $('#np'); if (d && o) d.open = true; };
  $$('[data-ack]').forEach((b) => (b.onclick = async () => { try { await api('POST', `/api/notifications/${b.dataset.ack}/ack`); await refreshUnread(); again(); } catch (err) { toast(err.message, true); } }));
  $$('[data-open]').forEach((a) => a.addEventListener('click', () => api('POST', `/api/notifications/${a.dataset.open}/opened`).catch(() => {})));
  const ra = $('#ra'); if (ra) ra.onclick = async () => { try { await api('POST', '/api/notifications/read-all'); S.unread = 0; paintBadge(); again(); } catch (err) { toast(err.message, true); } };
  $$('[data-nf]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); S.inboxF = a.dataset.nf; again().catch((err) => toast(err.message, true)); }));
}

// Push bei geöffneten Hinweisen: Liste nur neu aufbauen, wenn nichts eingegeben und „Push für diese Hinweise“ zugeklappt ist –
// sonst gingen Ruhezeit-Eingaben bzw. der aufgeklappte Bereich verloren; stattdessen Hinweis mit Knopf „Liste aktualisieren“
function inboxPush() {
  if (!S.me || !/^#\/inbox/.test(location.hash)) return;
  const np = $('#np');
  if (!viewDirty() && !(np && np.open)) { route(); return; }
  if ($('#nnew')) return;
  const h = $('#main h1') || document.querySelector('main h1'); if (!h) return;
  h.insertAdjacentHTML('afterend', `<p class="panel small" id="nnew" role="status">${esc(t('nf_new'))} <button type="button" class="btn secondary" id="nnewb">${esc(t('nf_reload'))}</button></p>`);
  $('#nnewb').onclick = () => route();
}

async function pushPanel(el) {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const ios = /iPhone|iPad/.test(navigator.userAgent) && !window.navigator.standalone;
  if (!supported) { el.innerHTML = `<h3>${esc(t('push_title'))}</h3><p class="muted">${esc(ios ? t('push_ios') : t('push_unsupported'))}</p>`; return; }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  el.innerHTML = `<h3>${esc(t('push_title'))}</h3><p>${sub ? `<span class="chip ok">${esc(t('push_on'))}</span>` : `<span class="chip">${esc(t('push_off'))}</span>`}${Notification.permission === 'denied' ? ` <span class="chip kritisch">${esc(t('push_denied'))}</span>` : ''}</p>
    <div class="actions">${sub ? `<button class="btn secondary" id="pt">${esc(t('push_test'))}</button>` : `<button class="btn" id="pe">${esc(t('push_enable'))}</button>`}</div>`;
  const pe = $('#pe', el);
  if (pe) pe.onclick = async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { toast(t('push_denied'), true); return; }
      const key = S.meta.vapid_public_key;
      const raw = Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((key.length + 3) % 4)), (c) => c.charCodeAt(0));
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: raw });
      const j = s.toJSON();
      await api('POST', '/api/push/subscribe', { endpoint: j.endpoint, keys: j.keys, device_label: deviceLabel() });
      pushPanel(el);
    } catch (err) { toast(err.message, true); }
  };
  const pt = $('#pt', el);
  if (pt) pt.onclick = async () => { pt.disabled = true; try { const r = await api('POST', '/api/push/test'); toast(`Push: ${r.push_status}${r.error ? ' – ' + r.error : ''}`, r.push_status !== 'accepted'); } catch (err) { toast(err.message, true); } finally { pt.disabled = false; } };
}
const deviceLabel = () => (/Android/.test(navigator.userAgent) ? 'Android' : /iPhone/.test(navigator.userAgent) ? 'iPhone' : /iPad/.test(navigator.userAgent) ? 'iPad' : /Windows/.test(navigator.userAgent) ? 'Windows-PC' : /Mac/.test(navigator.userAgent) ? 'Mac' : t('device'));

// ---------- Management ----------
// Fuhrparkagent läuft planmäßig alle 15 (Betrieb) bzw. 30 Min. (Test): > 75 Min. ohne Lauf, offener Lauf oder Fehler → Hinweis
const agentStale = (r) => !r || !!r.error || Date.now() - Date.parse(r.finished_at || r.started_at) > 75 * 60000 || (!r.finished_at && Date.now() - Date.parse(r.started_at) > 10 * 60000);
// Kurzbezeichnung des Befundcodes in der Oberflächensprache (Meldungstext selbst kommt deutsch vom Server)
// Meldungstext eines Agentenbefunds in der App-Sprache (Vorlagen public/finding-messages.js); HU/SP-Hinweis „Frist ungeklärt“
// nutzt dieselben Übersetzungen wie die Fahrzeugakte (hn_<code>), sonst bleibt der deutsche Hinweistext.
function fMsg(stored, fallback) {
  let o = stored;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { return fallback; } }
  if (o && o.k === 'INSPECTION_UNCLEAR' && o.a && o.a.nc && S.lang !== 'de') {
    const k = 'hn_' + o.a.nc.code; const s = t(k);
    if (s !== k) o = { ...o, a: { ...o.a, note: s.replace(/\{(\w+)\}/g, (m, n) => (n in (o.a.nc.p || {}) ? String(o.a.nc.p[n]) : m)) } };
  }
  return findingMessage(o, fallback, S.lang);
}
const fcLabel = (code) => (code && STRINGS.de['fc_' + code] ? `<b style="display:block">${esc(t('fc_' + code))}</b>` : '');
async function viewMaster(q) {
  // Direktsprung #/master?q=<Kennzeichen> (z. B. aus der Fahrzeugakte): Suche vorbelegen, alle Schweregrade, Adresse ohne Parameter
  if (q !== undefined) { S.afQ = String(q).slice(0, 80); S.afSev = 'all'; try { history.replaceState(null, '', '#/master'); } catch {} }
  const p = await api('GET', '/api/master');
  // Befunde filtern (nur Anzeige im Browser): Schweregrad + Freitext über den angezeigten Zeilentext; CSV exportiert die angezeigte Auswahl
  if (p.findings.length <= 1) { S.afSev = 'all'; S.afQ = ''; } // Filterknöpfe/Suchfeld gibt es erst ab zwei Befunden
  const afSev = ['all', 'kritisch', 'handeln', 'hinweis', 'info'].includes(S.afSev) ? S.afSev : 'all';
  const sev = { kritisch: 'kritisch', handeln: 'mittel', hinweis: '', info: '' };
  let html = `<h1>${esc(t('master_title'))}</h1>
    <div class="panel ${p.all_clear && !agentStale(p.last_agent_run) ? 'good' : 'alert'}"><b>${esc(p.all_clear ? t('all_clear') : t('not_clear'))}</b>${p.decisions_open ? ` · ${p.decisions_open} ${esc(t('decisions'))}` : ''}<div class="small muted">${esc(t('last_run'))}: ${p.last_agent_run ? fmtDT(p.last_agent_run.finished_at || p.last_agent_run.started_at) + (p.last_agent_run.error ? ' · ' + esc(p.last_agent_run.error) : '') : '–'}</div>${agentStale(p.last_agent_run) ? `<div class="alert small" style="margin-top:6px">${esc(t('agent_stale'))}</div>` : ''}</div>
    <div class="stats"><div><b>${p.vehicles_total}</b>${esc(t('total'))}</div><div><b style="color:var(--stop)">${p.vehicles_locked}</b>${esc(t('locked_vehicles'))}</div><div><b>${p.vehicles_in_workshop}</b>${esc(t('in_workshop'))}</div></div>
    <div class="actions"><button class="btn secondary" id="ra">${esc(t('run_agent'))}</button><a class="btn secondary" href="#/vehicles">${esc(t('vehicles'))}</a>${p.findings.length ? `<button class="btn secondary noprint" id="afcsv">${esc(t('export_csv'))}</button>` : ''}<button type="button" class="btn secondary noprint" id="mprt">${esc(t('print'))}</button></div>
    ${printHead([t(p.environment === 'test' ? 'env_testname' : 'env_prod'), `${t('findings')}: ${p.findings.length}`, ...(afSev !== 'all' || (S.afQ || '').trim() ? [`${t('af_filter')}: ${afSev !== 'all' ? t('asev_' + afSev) : ''}${(S.afQ || '').trim() ? ` „${S.afQ.trim()}“` : ''}`] : []), `${t('decisions')}: ${p.decisions_open}`])}
    <h2>${esc(t('decisions'))}</h2><div class="list">${p.inbox.filter((m) => ['offen', 'gesehen'].includes(m.decision_status)).map((m) => `<div class="row ${m.severity === 'kritisch' ? 'p-kritisch' : 'p-mittel'}"><span class="chip ${sev[m.severity]}">${esc(t('asev_' + m.severity))}</span><span class="title" style="white-space:normal">${fcLabel(m.payload.finding_code)}${esc(fMsg(m.payload.message_args, m.payload.message))}</span><span>${m.case_id ? `<a href="#/cases/${esc(m.case_id)}">${esc(t('details'))}</a>` : ''}</span><span class="sub" style="white-space:normal">${esc(translateNextAction(S.lang, m.payload.next_action))}${!m.case_id && m.vehicle_id ? ` · <a href="#/vehicles/${esc(m.vehicle_id)}">${esc(t('vehicle_file'))}</a>` : ''} · ${fmtDT(m.received_at)}${m.finding_status === 'erledigt' ? ' · ✓ ' + esc(t('resolved')) : ''} · <a href="#" data-dec="${esc(m.event_id)}" data-st="gesehen">${esc(t('seen'))}</a> · <a href="#" data-dec="${esc(m.event_id)}" data-st="erledigt">${esc(t('resolved'))}</a></span></div>`).join('') || `<p class="muted">–</p>`}</div>
    <h2>${esc(t('findings'))}</h2>${p.findings.length > 1 ? `<div class="actions noprint" style="flex-wrap:wrap;margin-top:0">${[['all', t('filter_all'), p.findings.length], ...['kritisch', 'handeln', 'hinweis', 'info'].map((k) => [k, t('asev_' + k), p.findings.filter((f) => f.severity === k).length]).filter(([k, , n]) => n || afSev === k)].map(([k, l, n]) => `<button type="button" class="btn ${afSev === k ? '' : 'secondary'}" data-afsev="${k}">${esc(l)} (${n})</button>`).join('')}</div><input id="afq" class="noprint" placeholder="${esc(t('search_label'))}" aria-label="${esc(t('search_label'))}" style="margin-bottom:8px" value="${esc(S.afQ || '')}"><p class="small muted noprint" id="afcnt" aria-live="polite"></p>` : ''}<div class="list" id="afl">${p.findings.map((f, i) => `<div class="row ${f.severity === 'kritisch' ? 'p-kritisch' : f.severity === 'handeln' ? 'p-mittel' : ''}" data-afi="${i}" data-sev="${esc(f.severity)}"><span class="chip ${sev[f.severity]}">${esc(t('asev_' + f.severity))}</span><span class="title" style="white-space:normal">${fcLabel(f.finding_code)}${esc(fMsg(f.message_args, f.message))}</span><span>${f.case_id ? `<a href="#/cases/${esc(f.case_id)}">${esc(t('details'))}</a>` : ''}</span><span class="sub" style="white-space:normal">${esc(translateNextAction(S.lang, f.next_action))}${!f.case_id && f.vehicle_id ? ` · <a href="#/vehicles/${esc(f.vehicle_id)}" data-afv>${esc(t('vehicle_file'))}</a>` : ''} · ${esc(t('role_' + f.owner_role))} · ${esc(t('open_since'))} ${fmtDT(f.first_seen)}</span></div>`).join('') || `<p class="muted">–</p>`}</div>
    <h2>${esc(t('nav_cases'))}</h2><div class="scroll"><table class="stack mtab"><thead><tr><th></th><th>${esc(t('case_no'))}</th><th>${esc(t('urgency'))}</th><th>${esc(t('status_label'))}</th><th>${esc(t('workshop'))}</th><th>${esc(t('received'))}</th><th>${esc(t('workshop_ack'))}</th><th>${esc(t('open_items'))}</th></tr></thead><tbody>
    ${p.cases.map((c) => `<tr><td>${plate(c.plate, { locked: c.safety_lock })}</td><td><a href="#/cases/${esc(c.id)}" style="white-space:nowrap">${esc(c.case_no)}</a><div class="small muted">${esc(c.description.slice(0, 60))}</div></td><td><span class="chip ${esc(c.priority)}">${esc(t('prio_' + c.priority))}</span></td><td>${esc(t('st_' + c.status))}</td><td>${esc(wsName(c.workshop_site))}</td><td>${c.fleet_received_at ? fmtDT(c.fleet_received_at) : '–'}</td><td>${c.workshop_ack_at ? fmtDT(c.workshop_ack_at) : '–'}</td><td>${c.open_items || ''}</td></tr>`).join('')}</tbody></table></div>${p.cases_truncated ? `<p class="small muted" id="mctrunc">${esc(t('master_cases_truncated').replace('{n}', p.cases.length))} <a href="#/cases">${esc(t('nav_cases'))} ›</a></p>` : ''}`;
  render(html, 'master');
  $('#mprt').onclick = () => window.print();
  const afRows = $$('#afl [data-afi]');
  const afShown = () => afRows.filter((r) => r.style.display !== 'none').map((r) => p.findings[Number(r.dataset.afi)]);
  const applyAf = () => {
    const q = $('#afq') ? (S.afQ || '').trim().toLocaleLowerCase() : ''; // ohne Suchfeld (≤ 1 Befund) nie unsichtbar filtern
    for (const r of afRows) r.style.display = (afSev === 'all' || r.dataset.sev === afSev) && (!q || r.textContent.toLocaleLowerCase().includes(q)) ? '' : 'none';
    const c = $('#afcnt'); if (c) { const n = afShown().length; c.textContent = n === p.findings.length ? '' : t('af_shown').replace('{n}', n).replace('{m}', p.findings.length); }
  };
  applyAf();
  $$('[data-afsev]').forEach((b) => (b.onclick = () => { S.afSev = b.dataset.afsev; viewMaster(); }));
  const afq = $('#afq'); if (afq) afq.oninput = () => { S.afQ = afq.value; applyAf(); };
  const afc = $('#afcsv'); if (afc) afc.onclick = () => download(new Blob([agentFindingsCsv(afShown(), t, (f) => fMsg(f.message_args, f.message), (x) => translateNextAction(S.lang, x), fmtDT)], { type: 'text/csv;charset=utf-8' }), `fuhrpark-agentenbefunde_${p.environment}_${bDate()}.csv`);
  $('#ra').onclick = async () => { try { const r = await api('POST', '/api/agent/run'); toast(`${r.findings_open} ${t('findings')}`); viewMaster(); } catch (err) { toast(err.message, true); } };
  // Entscheidung im Master-Eingang: ohne Netz Meldung statt stillem Abbruch; Doppeltippen sendet nicht zweimal
  $$('[data-dec]').forEach((a) => (a.onclick = async (e) => { e.preventDefault(); if (a.dataset.busy) return; a.dataset.busy = '1'; a.setAttribute('aria-disabled', 'true');
    try { await api('POST', `/api/master/${a.dataset.dec}/decision`, { decision_status: a.dataset.st }); await viewMaster(); } catch (err) { toast(err.message, true); } finally { delete a.dataset.busy; a.removeAttribute('aria-disabled'); } }));
}

// ---------- Prüftermine (Fuhrpark gesamt) ----------
// Druck/PDF: Prüfhistorie der Fahrzeugakte („Bisherige Durchführungen“) und „Offene Agentenbefunde“ immer mitdrucken, danach wieder zuklappen
const PRINT_OPEN = '#mhist, #vaf, #ddhist, #dthist, #dlchist';
window.addEventListener('beforeprint', () => { for (const d of document.querySelectorAll(PRINT_OPEN)) if (!d.open) { d.open = true; d.dataset.printOpened = '1'; } });
window.addEventListener('afterprint', () => { for (const d of document.querySelectorAll(PRINT_OPEN)) if (d.dataset.printOpened) { d.open = false; delete d.dataset.printOpened; } });
// Download mit Hinweis, wenn der Server die Datei begrenzt hat (Header x-cfp-truncated)
function downloadChecked(blob, name) { download(blob, name); if (blob.cfpTruncated) toast(t('export_truncated').replace('{n}', blob.cfpTruncated), true); }
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
// Gespeicherter Standard-Nachweis der Fahrerzuordnung (Server, deutsch) in der App-Sprache anzeigen; eigene Nachweise bleiben wörtlich
const evTr = (e) => (e === 'Zuordnung durch Fuhrparkleitung' ? t('ev_assign_default') : e || '');
// Fahrerkandidat (Bußgeld): Begründung in der App-Sprache; übernommen wird weiter der gespeicherte deutsche Nachweis
const candEv = (c) => (c.since ? t('cand_since').replace('{d}', fmtD(c.since)) + (c.assign_evidence ? ` (${evTr(c.assign_evidence)})` : '') : c.check_at ? t('cand_check').replace('{t}', fmtDT(c.check_at)) : c.evidence || '');
// Planungshilfe: km-Prognose fällt in die nächsten 30 Tage (ändert keinen Status, nur Anzeige)
const fcSoon = (r, today, days = 30) => !!(r.km_forecast && r.km_forecast.date && Date.parse(r.km_forecast.date) - Date.parse(today) <= days * 86400000);
async function viewMaint() {
  let ov;
  const msQ = vsDef('maintSite') ? '&site=' + encodeURIComponent(vsDef('maintSite')) : '';
  try { ov = await api('GET', '/api/maintenance' + (msQ ? '?' + msQ.slice(1) : '')); } catch (err) { render(`<h1>${esc(t('inspections_due'))}</h1><div class="panel alert">${esc(err.message)}</div>`, 'more'); return; }
  const f = S.maintFilter || 'due';
  // „fällig ohne Termin“: überfällig/bald fällig und kein geplanter Werkstatttermin ab heute – was noch eingeplant werden muss
  const noPlan = (r) => (r.status === 'ueberfaellig' || r.status === 'faellig') && !(r.planned_date && r.planned_date >= ov.today);
  const fcN = ov.rows.filter((r) => fcSoon(r, ov.today)).length;
  // „nach km fällig“: km-Regel überschritten bzw. innerhalb der Warnschwelle (gleiche km_status wie Status/Werkstatt-Startseite)
  const kmDue = (r) => r.km_status === 'ueberfaellig' || r.km_status === 'faellig';
  const kmN = ov.rows.filter(kmDue).length;
  const sel = (r) => (f === 'all' ? true : f === 'due' ? r.status === 'ueberfaellig' || r.status === 'faellig' : f === 'noplan' ? noPlan(r) : f === 'fc30' ? fcSoon(r, ov.today) : f === 'km' ? kmDue(r) : r.status === f);
  const rows = ov.rows.filter(sel);
  if (f === 'km') rows.sort((a, b) => (a.km_remaining ?? 0) - (b.km_remaining ?? 0) || String(a.plate).localeCompare(String(b.plate)));
  if (f === 'fc30') rows.sort((a, b) => (a.km_forecast.date < b.km_forecast.date ? -1 : a.km_forecast.date > b.km_forecast.date ? 1 : 0));
  const cls = { ueberfaellig: 'kritisch', faellig: 'mittel', ok: 'ok', ohne_termin: '', erledigt: 'ok', ungeklaert: 'mittel', nicht_pflichtig: '', erste_sp: '' };
  const tabs = [['due', `${t('ms_ueberfaellig')} + ${t('ms_faellig')}`, ov.totals.overdue + ov.totals.due], ['noplan', t('due_no_plan'), ov.rows.filter(noPlan).length], ['ueberfaellig', t('ms_ueberfaellig'), ov.totals.overdue], ['ungeklaert', t('ms_ungeklaert'), ov.totals.unclear || 0], ...(kmN || f === 'km' ? [['km', t('km_due_tab'), kmN]] : []), ...(fcN || f === 'fc30' ? [['fc30', t('fc30_tab'), fcN]] : []), ['all', t('filter_all'), ov.rows.length], ['gaps', t('gaps'), ov.totals.vehicles_with_gaps]];
  let html = `<h1>${esc(t('inspections_due'))}</h1>${helpLink('dates')}
    <section class="panel"><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip ${ov.totals.overdue ? 'kritisch' : ''}">${esc(t('ms_ueberfaellig'))}: ${ov.totals.overdue}</span><span class="chip ${ov.totals.due ? 'mittel' : ''}">${esc(t('ms_faellig'))} (≤ ${ov.warn_days} ${esc(t('days'))}): ${ov.totals.due}</span><span class="chip ok">${esc(t('ms_ok'))}: ${ov.totals.ok}</span><span class="chip ${ov.totals.vehicles_with_gaps ? 'mittel' : ''}">${esc(t('gaps'))}: ${ov.totals.vehicles_with_gaps} / ${ov.totals.vehicles}</span></div>
    ${(ov.site_options || []).length > 1 || ov.site ? `<div class="noprint" style="margin-top:10px">${siteSelect('msite', '', ov.site_options, ov.site)}</div>` : ''}
    <div class="actions"><button type="button" class="btn secondary" id="mcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="mics">${esc(t('export_ics'))}</button><button type="button" class="btn secondary" id="mprt">${esc(t('print'))}</button></div></section>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)}${ov.site ? ' · ' + esc(t('site')) + ': ' + esc(ov.site === 'ohne' ? t('cs_nosite') : ov.site) : ''}${(tabs.find(([k]) => k === f) || [])[1] ? ' · ' + esc(t('print_filter')) + ': ' + esc(tabs.find(([k]) => k === f)[1]) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="actions" role="tablist" style="flex-wrap:wrap">${tabs.map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-mf="${k}" role="tab" aria-selected="${f === k}">${esc(l)} (${n})</button>`).join('')}</div>`;
  if (f === 'fc30') html += `<p class="small muted">${esc(t('fc30_hint'))}</p>`;
  if (f === 'km') html += `<p class="small muted">${esc(t('km_due_tab_hint'))}</p>`;
  if (f === 'gaps') {
    html += `<p class="small muted">${esc(t('gaps_hint'))}</p><div class="list">${ov.gaps.map((g) => `<a class="row" href="#/vehicles/${encodeURIComponent(g.vehicle_id)}">${plate(g.plate)}<span class="title">${g.vehicle_kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${esc(g.site || '')}</span><span></span><span class="sub" style="white-space:normal">${g.missing.map((k) => `<span class="chip">${esc(mk(k))}</span>`).join(' ')}</span></a>`).join('') || `<p class="muted">–</p>`}</div>`;
  } else {
    html += `<div class="list">${rows.map((r) => `<a class="row ${r.status === 'ueberfaellig' ? 'p-kritisch' : r.status === 'faellig' ? 'p-mittel' : ''}" href="#/vehicles/${encodeURIComponent(r.vehicle_id)}">${plate(r.plate)}<span class="title">${esc(mk(r.kind))}${r.due_month || r.next_due_date || r.prognosis || !r.next_due_km ? ' · ' : ''}${r.due_month ? `${esc(t('due_until_end'))} ${esc(r.due_month)}${r.due_basis ? ` <span class="small muted">(${esc(t('db_' + r.due_basis))})</span>` : ''}` : r.next_due_date ? fmtD(r.next_due_date) : r.prognosis ? `${esc(t('prognosis'))} ${mY(r.prognosis)}` : r.next_due_km ? '' : r.status === 'erledigt' && r.last_done_date ? `${esc(t('done_on'))} ${fmtD(r.last_done_date)}` : '–'}${r.planned_date ? ` · ${esc(t('planned_appt'))} ${fmtD(r.planned_date)}` : ''}${r.open_order ? ` · 🔧 ${esc(r.open_order.case_no)}` : ''}${r.next_due_km ? ` · ${esc(t('due_at_km'))} ${fmtKm(r.next_due_km)}${r.km_remaining !== null ? ` (${r.km_remaining < 0 ? esc(t('km_over')) + ' ' + fmtKm(-r.km_remaining) : esc(t('km_left')) + ' ' + fmtKm(r.km_remaining)})` : ''}` : ''}</span><span class="chip ${cls[r.status]}">${esc(t('ms_' + r.status))}${r.days !== null ? ` (${r.days})` : ''}</span><span class="sub">${r.km_forecast ? kmFcHtml(r.km_forecast) + ' · ' : ''}${r.notes && r.notes.length && ['ungeklaert', 'ueberfaellig'].includes(r.status) ? esc(huNote(r, r.notes.length - 1)) + ' · ' : ''}${esc(r.evidence)}${r.site ? ' · ' + esc(r.site) : ''}</span></a>`).join('') || `<p class="muted">${esc(t('none_due'))}</p>`}</div>`;
  }
  // Durchgeführte Prüfungen (Wartungshistorie der Flotte) – Inhaber, Fuhrparkleitung, Lesezugriff
  if (['owner', 'fleet', 'viewer'].includes(S.me.role)) html += `<details class="panel noprint" id="mhist"><summary>${esc(t('mh_title'))}</summary><p class="small muted">${esc(t('mh_hint'))}</p>
    <form id="mhf" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end"><div><label>${esc(t('from'))}</label><input type="date" name="from" value="${esc(ov.today.slice(0, 4))}-01-01" required></div><div><label>${esc(t('to'))}</label><input type="date" name="to" value="${esc(ov.today)}" required></div>
    <div><label>${esc(t('kind'))}</label><select name="kind"><option value="">${esc(t('filter_all'))}</option>${(S.meta.maintenance_kinds || []).map((k) => `<option value="${esc(k)}">${esc(mk(k))}</option>`).join('')}</select></div>
    <div class="actions" style="margin:0"><button class="btn secondary">${esc(t('show'))}</button><button type="button" class="btn secondary" id="mhcsv">${esc(t('export_csv'))}</button></div></form><div id="mhres"></div></details>`;
  if (isMgr()) html += `<section class="panel noprint"><h2 style="margin-top:0">${esc(t('import_maint'))}</h2><p class="small muted">${esc(t('import_maint_hint'))}</p><input type="file" id="mimp" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('import_maint'))}"><div id="mimpr"></div></section>
    <section class="panel noprint"><h2 style="margin-top:0">${esc(t('import_recalls'))}</h2><p class="small muted">${esc(t('import_recalls_hint'))}</p><input type="file" id="rimp" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('import_recalls'))}"><div id="rimpr"></div></section>`;
  render(html, 'more');
  $$('[data-mf]').forEach((b) => (b.onclick = () => { S.maintFilter = b.dataset.mf; viewMaint(); }));
  const msel = $('#msite'); if (msel) msel.onchange = () => { S.maintSite = msel.value; viewMaint(); };
  $('#mics').onclick = async () => { try { download(await api('GET', '/api/maintenance?format=ics' + msQ), `fuhrpark-prueftermine_${ov.today}.ics`); } catch (err) { toast(err.message, true); } };
  $('#mprt').onclick = () => window.print();
  // Mängelauftrag und Nachprüfung zu Prüfungen mit erheblichen Mängeln (nur gespeicherte Daten; ohne Nachprüfung „noch nicht eingetragen“)
  const mhDefect = (r) => DEFECT_RESULTS.includes(r.result) ? `<br><span class="small">${esc(t('mh_order'))}: ${r.defect_case_no ? `${esc(r.defect_case_no)} (${esc(t('st_' + r.defect_case_status))})` : esc(t('mh_no_order'))} · ${esc(t('mh_reinsp'))}: ${r.reinspection_date ? `${fmtD(r.reinspection_date)}${r.reinspection_result ? ' – ' + esc(t('res_' + r.reinspection_result)) : ''}` : esc(t('mh_reinsp_none'))}</span>` : '';
  const mhf = $('#mhf');
  if (mhf) {
    const mhq = () => `from=${encodeURIComponent(mhf.from.value)}&to=${encodeURIComponent(mhf.to.value)}${mhf.kind.value ? '&kind=' + encodeURIComponent(mhf.kind.value) : ''}`;
    mhf.onsubmit = async (e) => { e.preventDefault(); try {
      const h = await api('GET', '/api/maintenance/history?' + mhq());
      $('#mhres').innerHTML = `${h.truncated ? `<p class="panel warn">${esc(t('mh_truncated').replaceAll('{n}', h.max))}</p>` : ''}<p><b>${h.rows.length}</b> ${esc(t('mh_count'))}${Object.keys(h.by_kind).length ? ' · ' + Object.entries(h.by_kind).map(([k, n]) => `${esc(mk(k))} ${n}`).join(' · ') : ''}</p>${h.rows.length ? `<div class="list">${h.rows.slice(0, 50).map((r) => { const go = r.result_addable && isMgr(); const vhref = `#/vehicles/${encodeURIComponent(r.vehicle_id)}` + (go ? `?ev=${encodeURIComponent(r.event_id)}` : ''); return `<a class="row" href="${vhref}">${plate(r.plate)}<span class="title">${esc(mk(r.kind))}</span><span class="chip">${fmtD(r.done_date)}</span>${go ? `<span class="chip mittel">${esc(t('res_add_go'))} ›</span>` : ''}<span class="sub" style="white-space:normal">${[r.done_km !== null ? fmtNum(r.done_km) + ' km' : '', r.result ? t('res_' + r.result) : '', r.evidence].filter(Boolean).map(esc).join(' · ')}${mhDefect(r)}</span></a>`; }).join('')}</div>${h.rows.length > 50 ? `<p class="small muted">${esc(t('mh_more'))}</p>` : ''}` : ''}`;
    } catch (err) { toast(err.message, true); } };
    $('#mhcsv').onclick = async () => { if (!mhf.reportValidity()) return; try { const blob = await api('GET', '/api/maintenance/history?format=csv&' + mhq()); download(blob, `fuhrpark-durchgefuehrte-pruefungen_${mhf.from.value}_${mhf.to.value}.csv`); if (blob.cfpTruncated) toast(t('mh_truncated').replaceAll('{n}', blob.cfpTruncated), true); } catch (err) { toast(err.message, true); } };
  }
  $('#mcsv').onclick = async () => { try { download(await api('GET', '/api/maintenance?format=csv' + msQ), `fuhrpark-prueftermine_${ov.today}.csv`); } catch (err) { toast(err.message, true); } };
  const inp = $('#mimp');
  // Lückenzeilen aus dem eigenen Export (nicht ausgefüllt) getrennt und zugeklappt – sonst verdecken sie die echten Hinweise
  const GAP_ROW = 'Kein Termin eingetragen – Zeile bleibt unverändert';
  const skipList = (list, title, open) => (list.length ? `<details ${open ? 'open' : ''}><summary>${esc(title)} (${list.length})</summary><ul class="small">${list.map((x) => `<li>${esc(t('line'))} ${x.line}${x.plate ? ' · ' + esc(x.plate) : ''}: ${esc(reasonText(x.reason))}</li>`).join('')}</ul></details>` : '');
  if (inp) inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    const text = await readCsvFile(file);
    const show = (r, applied) => {
      const box = $('#mimpr'); if (!box) return;
      box.innerHTML = `<p><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(t('ia_neu'))}: ${r.created} · ${esc(t('ia_aktualisiert'))}: ${r.updated} · ${esc(t('ia_unverändert'))}: ${r.unchanged} · ${esc(t('skipped'))}: ${r.skipped.length}</p>
        ${r.rows.length ? `<div class="scroll"><table><thead><tr><th>${esc(t('line'))}</th><th></th><th>${esc(t('kind'))}</th><th>${esc(t('next_due'))}</th><th></th></tr></thead><tbody>${r.rows.map((x) => `<tr><td>${x.line}</td><td style="white-space:nowrap">${esc(x.plate)}</td><td>${esc(mk(x.kind))}</td><td>${x.next_due_date || !x.next_due_km ? fmtD(x.next_due_date) : ''}${x.previous_due_date && x.previous_due_date !== x.next_due_date ? ` <span class="small muted">(${fmtD(x.previous_due_date)})</span>` : ''}${x.next_due_km ? `${x.next_due_date ? '<br>' : ''}<span>${esc(t('due_at_km'))} ${fmtKm(x.next_due_km)}</span>${x.previous_due_km && x.previous_due_km !== x.next_due_km ? ` <span class="small muted">(${fmtKm(x.previous_due_km)})</span>` : ''}` : ''}</td><td><span class="chip ${x.action === 'neu' ? 'ok' : x.action === 'aktualisiert' ? 'mittel' : ''}">${esc(t('ia_' + x.action))}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${skipList(r.skipped.filter((x) => x.reason !== GAP_ROW), t('skipped'), !applied)}${skipList(r.skipped.filter((x) => x.reason === GAP_ROW), t('imp_gap_rows'), false)}
        ${!applied && (r.created || r.updated) ? `<div class="actions"><button type="button" class="btn" id="mapply">${esc(t('apply_import'))}</button></div>` : ''}`;
      const ap = $('#mapply');
      if (ap) ap.onclick = async () => { ap.disabled = true; try { const done = await api('POST', '/api/maintenance/import', text, { headers: { 'content-type': 'text/csv' } }); toast('✓'); await viewMaint(); show(done, true); } catch (err) { ap.disabled = false; toast(err.message, true); } };
    };
    try { show(await api('POST', '/api/maintenance/import?dry_run=1', text, { headers: { 'content-type': 'text/csv' } }), false); } catch (err) { toast(err.message, true); }
  };
  // Rückruf-Import (Hersteller-/KBA-Liste): Vorschau, dann Übernehmen; Frist nur laut Liste, vorhandene Frist wird nie überschrieben
  const rinp = $('#rimp');
  if (rinp) rinp.onchange = async () => {
    const file = rinp.files[0]; if (!file) return;
    const text = await readCsvFile(file);
    const show = (r, applied) => {
      const box = $('#rimpr'); if (!box) return;
      const act = (a) => (a === 'erledigt' ? t('ms_erledigt') : t('ia_' + a));
      box.innerHTML = `<p><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(t('ia_neu'))}: ${r.created} · ${esc(t('ia_aktualisiert'))}: ${r.updated} · ${esc(t('ia_unverändert'))}: ${r.unchanged} · ${esc(t('skipped'))}: ${r.skipped.length}</p>
        ${r.rows.length ? `<div class="scroll"><table><thead><tr><th>${esc(t('line'))}</th><th></th><th>${esc(t('recall_ref'))}</th><th>${esc(t('next_due'))}</th><th></th></tr></thead><tbody>${r.rows.map((x) => `<tr><td>${x.line}</td><td style="white-space:nowrap">${esc(x.plate)}</td><td>${esc(x.reference)}${x.note ? `<br><span class="small muted">${esc(reasonText(x.note))}</span>` : ''}</td><td>${x.next_due_date ? fmtD(x.next_due_date) : esc(t('vi_recall_open'))}</td><td><span class="chip ${x.action === 'neu' ? 'ok' : x.action === 'aktualisiert' ? 'mittel' : ''}">${esc(act(x.action))}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${skipList(r.skipped, t('skipped'), !applied)}
        ${!applied && (r.created || r.updated) ? `<div class="actions"><button type="button" class="btn" id="rapply">${esc(t('apply_import'))}</button></div>` : ''}`;
      const ap = $('#rapply');
      if (ap) ap.onclick = async () => { ap.disabled = true; try { const done = await api('POST', '/api/maintenance/recalls/import', text, { headers: { 'content-type': 'text/csv' } }); toast('✓'); await viewMaint(); show(done, true); } catch (err) { ap.disabled = false; toast(err.message, true); } };
    };
    try { show(await api('POST', '/api/maintenance/recalls/import?dry_run=1', text, { headers: { 'content-type': 'text/csv' } }), false); } catch (err) { toast(err.message, true); }
  };
}

// ---------- Kennzahlen Instandhaltung ----------
const KPI_VEH_MAX = 20;
const FINE_FILES_MAX = 20;
const VEH_DOCS_MAX = 30; // wie Server MAX_VEHICLE_DOCS (src/vehicles.js)
const dur = (h) => (h === null || h === undefined ? '–' : h < 48 ? `${fmtNum(h)} h` : `${fmtNum(Math.round(h / 2.4) / 10)} ${t('days')}`);
async function viewKpi() {
  const to = S.kpiTo || bYm(); const from = S.kpiFrom || bYm(2);
  let r;
  try { r = await api('GET', `/api/reports/kpi?from=${from}&to=${to}${S.kpiSite ? '&site=' + encodeURIComponent(S.kpiSite) : ''}${vsDef('kpiVsite') ? '&vsite=' + encodeURIComponent(vsDef('kpiVsite')) : ''}`); } catch (err) { render(`<h1>${esc(t('kpi'))}</h1><div class="panel alert">${esc(err.message)}</div>`, 'more'); return; }
  const st = (x) => (x.n ? `${dur(x.median_h)} <span class="small muted">(P90 ${dur(x.p90_h)}, n=${x.n})</span>` : '–');
  let html = `<h1>${esc(t('kpi'))}</h1>${printHead([`${t('period')}: ${from} – ${to}`, r.site ? `${t('workshop')}: ${r.site === 'ohne' ? t('cs_nosite') : wsName(r.site)}` : '', r.vehicle_site ? `${t('kpi_vsite')}: ${r.vehicle_site === 'ohne' ? t('cs_nosite') : r.vehicle_site}` : ''])}${helpLink('kpi')}<form id="kf2" class="panel" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
    <div><label>${esc(t('from'))}</label><input type="month" name="from" value="${esc(from)}" required></div><div><label>${esc(t('to'))}</label><input type="month" name="to" value="${esc(to)}" required></div>
    ${r.sites.length > 1 || r.site ? `<div><label>${esc(t('workshop'))}</label><select name="site"><option value="">${esc(t('filter_all'))}</option>${[...new Set([...r.sites, ...(r.site ? [r.site] : [])])].map((x) => `<option value="${esc(x)}"${x === r.site ? ' selected' : ''}>${esc(x === 'ohne' ? t('kpi_no_site') : wsName(x))}</option>`).join('')}</select></div>` : ''}
    ${(r.vehicle_sites || []).length > 1 || r.vehicle_site ? `<div>${siteSelect('kvsite', 'vsite', r.vehicle_sites, r.vehicle_site, t('kpi_vsite'), t('filter_all'))}</div>` : ''}
    <div class="actions" style="margin:0"><button class="btn secondary">${esc(t('show'))}</button><button type="button" class="btn secondary" id="kpiprt">${esc(t('print'))}</button></div></form>${r.site ? `<p class="small muted">${esc(t('kpi_site_hint'))}</p>` : ''}${r.vehicle_site ? `<p class="small muted">${esc(t('kpi_vsite_hint'))}</p>` : ''}${r.by_priority.length ? `<div class="actions" style="margin-top:0"><button type="button" class="btn secondary" id="kcsvv">${esc(t('kpi_csv_veh'))}</button><button type="button" class="btn secondary" id="kcsvp">${esc(t('kpi_csv_prio'))}</button></div>` : ''}`;
  html += r.by_priority.length ? r.by_priority.map((p) => `<section class="panel ${p.priority === 'kritisch' ? 'alert' : ''}"><h3>${esc(p.priority === 'alle' ? t('filter_all') : t('prio_' + p.priority))}</h3><dl class="kv">
    <dt>${esc(t('kpi_reports'))}</dt><dd>${p.created} · ${esc(t('kpi_released'))} ${p.released} · ${esc(t('kpi_open'))} ${p.open}${p.rejected ? ` · ${esc(t('kpi_rejected'))} ${p.rejected}${p.duplicates ? ` (${esc(t('kpi_dupes').replace('{n}', p.duplicates))})` : ''}` : ''}</dd>
    <dt>${esc(t('kpi_triage'))}</dt><dd>${st(p.triage)}</dd><dt>${esc(t('kpi_ack'))}</dt><dd>${st(p.workshop_ack)}</dd><dt>${esc(t('kpi_total'))}</dt><dd>${st(p.created_to_release)}</dd><dt>${esc(t('kpi_parts'))}</dt><dd>${dur(p.parts_wait_h)}</dd></dl></section>`).join('') : `<p class="muted">–</p>`;
  // Fahrzeugliste: meiste Werkstattzeit zuerst, die ersten KPI_VEH_MAX; Gesamtzahl und „Alle anzeigen“ statt stillem Abschneiden (Druck zeigt alle)
  const kvAll = !!S.kpiVehAll || r.vehicles.length <= KPI_VEH_MAX; const kvShown = kvAll ? r.vehicles : r.vehicles.slice(0, KPI_VEH_MAX);
  if (r.vehicles.length) html += `<h2 id="kpiveh">${esc(t('kpi_vehicles'))} <span class="chip">${r.vehicles.length}</span></h2>${kvAll ? '' : `<div id="kpivmore" role="status"><p class="small muted">${esc(t('kpi_veh_more').replace('{n}', KPI_VEH_MAX).replace('{m}', r.vehicles.length))}</p><div class="actions" style="margin-top:0"><button type="button" class="btn secondary" id="kpivall">${esc(t('kpi_veh_all').replace('{m}', r.vehicles.length))}</button></div></div>`}<div class="list" id="kpivl">${kvShown.map((v) => `<a class="row" href="#/vehicles/${encodeURIComponent(v.vehicle_id)}">${plate(v.plate || v.vehicle_id)}<span class="title">${esc(t('kpi_workshop'))}: ${dur(v.workshop_h)}</span><span class="chip">${v.cases}</span><span class="sub">${esc(t('kpi_parts'))}: ${dur(v.parts_wait_h)} · ${esc(t('kpi_released'))} ${v.released}${v.duplicates ? ` · ${esc(t('kpi_dupes').replace('{n}', v.duplicates))}` : ''}${v.locked_h ? ` · <b style="color:var(--stop)">${esc(t('kpi_locked'))}: ${dur(v.locked_h)}</b>` : ''}</span></a>`).join('')}</div>`;
  // Termintreue Teile-Liefertermine (nur Abschnitte „wartet auf Teile“ aus dem Zeitraum; Termin laut Werkstatt)
  const pe = r.parts_eta;
  const peLine = (x) => `${esc(t('kpi_pe_kept'))} ${x.kept} · ${esc(t('kpi_pe_late'))} ${x.late}${x.on_time_pct !== null ? ` (${x.on_time_pct} % ${esc(t('kpi_pe_on_time'))})` : ''}${x.late_days_median !== null ? ` · ${esc(t('kpi_pe_median'))} ${fmtNum(x.late_days_median)} ${esc(t('days'))}` : ''}${x.open_overdue ? ` · <b style="color:var(--stop)">${esc(t('kpi_pe_open'))} ${x.open_overdue}</b>` : ''}${x.without_eta ? ` · ${esc(t('kpi_pe_without'))} ${x.without_eta}` : ''}`;
  if (pe && (pe.kept + pe.late + pe.without_eta + pe.open_overdue)) html += `<section class="panel" id="kpipe"><h3>${esc(t('kpi_pe'))}</h3><p>${peLine(pe)}</p>${pe.by_site.length > 1 ? `<dl class="kv">${pe.by_site.map((x) => `<dt>${esc(x.site === 'ohne' ? t('kpi_pe_nosite') : wsName(x.site))}</dt><dd>${peLine(x)}</dd>`).join('')}</dl>` : ''}<p class="small muted">${esc(t('kpi_pe_rule'))}</p></section>`;
  // Kostenfreigaben (nur Anzahl und Dauer bis zur Freigabe, keine Beträge)
  const ca = r.cost_approvals;
  if (ca && ca.exceeded) html += `<section class="panel" id="kpica"><h3>${esc(t('kpi_ca'))}</h3><dl class="kv">
    <dt>${esc(t('kpi_ca_exceeded'))}</dt><dd>${ca.exceeded}</dd><dt>${esc(t('kpi_ca_cases'))}</dt><dd>${ca.cases}</dd>
    <dt>${esc(t('kpi_ca_approved'))}</dt><dd>${ca.approved}</dd>
    <dt>${esc(t('kpi_ca_wait'))}</dt><dd>${st(ca.to_approval)}</dd>
    ${ca.pending ? `<dt>${esc(t('kpi_ca_pending'))}</dt><dd><b style="color:var(--stop)">${ca.pending}</b></dd>` : ''}
    ${ca.closed_without ? `<dt>${esc(t('kpi_ca_closed'))}</dt><dd>${ca.closed_without}</dd>` : ''}</dl><p class="small muted">${esc(t('kpi_ca_rule'))}</p></section>`;
  // Mängelbeseitigung aus Prüfungen (Prüfdatum im Zeitraum; Dauer in Tagen bis zur technischen Freigabe des Mängelauftrags)
  const idf = r.inspection_defects;
  const dD = (v) => `${fmtNum(v)} ${esc(t('days'))}`;
  const stD = (x) => (x.n ? `${dD(x.median_d)} <span class="small muted">(P90 ${dD(x.p90_d)}, n=${x.n})</span>` : '–');
  if (idf && idf.inspections) html += `<section class="panel" id="kpiid"><h3>${esc(t('kpi_id'))}</h3><dl class="kv">
    <dt>${esc(t('kpi_id_insp'))}</dt><dd>${idf.inspections}</dd>
    <dt>${esc(t('kpi_id_ordered'))}</dt><dd>${idf.ordered}${idf.without_order ? ` · <b style="color:var(--stop)">${esc(t('kpi_id_without'))} ${idf.without_order}</b>` : ''}</dd>
    <dt>${esc(t('kpi_released'))}</dt><dd>${idf.released}${idf.open ? ` · ${esc(t('kpi_open'))} ${idf.open}` : ''}</dd>
    <dt>${esc(t('kpi_id_days'))}</dt><dd>${stD(idf.to_release_days)}</dd>
    <dt>${esc(t('kpi_id_reinsp'))}</dt><dd>${idf.reinspected}${idf.defects_again ? ` · <b style="color:var(--stop)">${esc(t('kpi_id_again'))} ${idf.defects_again}</b>` : ''}</dd></dl><p class="small muted">${esc(t('kpi_id_rule'))}</p></section>`;
  html += `<p class="small muted">${esc(t('kpi_rules'))}</p>`;
  render(html, 'more');
  $('#kpiprt').onclick = async () => { if (!kvAll) { S.kpiVehAll = true; await viewKpi(); } window.print(); };
  const kva = $('#kpivall'); if (kva) kva.onclick = async () => { S.kpiVehAll = true; await viewKpi(); };
  const f = $('#kf2'); f.onsubmit = (e) => { e.preventDefault(); S.kpiVehAll = false; S.kpiFrom = f.from.value; S.kpiTo = f.to.value; S.kpiSite = f.site ? f.site.value : ''; S.kpiVsite = f.vsite ? f.vsite.value : ''; viewKpi(); };
  const kq = `/api/reports/kpi?from=${from}&to=${to}${r.site ? '&site=' + encodeURIComponent(r.site) : ''}${r.vehicle_site ? '&vsite=' + encodeURIComponent(r.vehicle_site) : ''}&format=csv`;
  for (const [id, part, name] of [['#kcsvv', 'vehicles', 'fahrzeuge'], ['#kcsvp', 'priority', 'dringlichkeit']]) {
    const b = $(id); if (b) b.onclick = async () => { try { download(await api('GET', `${kq}&part=${part}`), `fuhrpark-kennzahlen-${name}_${from}_${to}.csv`); } catch (err) { toast(err.message, true); } };
  }
}

// ---------- Protokoll (Inhaber) ----------
async function viewAudit(more, uArg, vArg) {
  // Person (handelnd oder betroffen) aus dem Direktsprung #/audit?u=<id> (Benutzer → „Protokoll“), Fahrzeug aus #/audit?v=<VIN:…>
  // (Fahrzeugakte → „Protokoll“); Adresse danach bereinigt. Ein Direktsprung ersetzt die jeweils andere Auswahl nicht.
  if (uArg) { S.auditUser = uArg; S.auditUserName = null; }
  if (vArg) { S.auditVeh = vArg; S.auditVehName = null; }
  if (uArg || vArg) { history.replaceState(null, '', '#/audit'); S.lastHash = '#/audit'; }
  const pv = S.auditVeh || '';
  const f = S.auditFilter || '';
  const pu = S.auditUser || '';
  const before = more ? S.auditBefore : null;
  const aq = S.auditQ || ''; const au = S.auditUntil || '';
  const extra = `${aq.length >= 2 ? '&q=' + encodeURIComponent(aq) : ''}${au ? '&until=' + encodeURIComponent(au) : ''}${pu ? '&user=' + encodeURIComponent(pu) : ''}${pv ? '&vehicle=' + encodeURIComponent(pv) : ''}`;
  let r;
  try { r = await api('GET', `/api/admin/audit?limit=100${f ? '&action=' + encodeURIComponent(f) : ''}${before ? '&before=' + encodeURIComponent(before) : ''}${extra}`); }
  catch (err) { if ((pu || pv) && err.status === 404) { S.auditUser = null; S.auditVeh = null; toast(err.message, true); return viewAudit(); } throw err; }
  if (r.person) S.auditUserName = r.person.display_name || r.person.username;
  if (r.vehicle) S.auditVehName = r.vehicle.plate || r.vehicle.id;
  S.auditRows = more ? [...(S.auditRows || []), ...r.entries] : r.entries;
  S.auditBefore = r.entries.length ? r.entries[r.entries.length - 1].created_at : null;
  const groups = [['', t('filter_all')], ['login', t('au_login')], ['user.', t('users')], ['vehicle', t('vehicles')], ['maintenance.', t('inspections_due')], ['backup.', t('backup')], ['reports.', t('export_csv')], ['stock.', t('stock')], ['contract', t('ct_title')], ['claim', t('claims')], ['driver', t('drivers')], ['tacho.', t('tacho')], ['privacy.', t('data_export')], ['admin.', t('audit')], ['settings.', t('settings')], ['invite.,password.,session.,totp.,setup.,integration.', t('au_access')], ['tires.', t('tires')], ['telematics.', t('telematics')], ['emergency.', t('em_title')]];
  const det = (d, refs) => auditDetailText(S.lang, d, refs); // Schlüssel in der Oberflächensprache, Werte unverändert (Rohtext in CSV/Suche)
  const gl = (groups.find(([k]) => k === f) || [])[1];
  // Betrifft: anderes Konto → Protokoll dieser Person, Fahrzeug → Fahrzeugakte (Ausdruck zeigt den Namen ohne Link)
  const auTarget = (e) => (e.target_plate ? ` · ${esc(t('au_target'))}: <a class="autgt" href="#/vehicles/${esc(e.target)}">${esc(e.target_plate)}</a>`
    : (e.target_name || e.target_username) && e.target !== e.actor_id ? ` · ${esc(t('au_target'))}: <a class="autgt" href="#/audit?u=${esc(e.target)}">${esc(e.target_name || e.target_username)}</a>` : '');
  render(`<h1>${esc(t('audit'))}</h1>${helpLink('access')}<p class="small muted">${esc(t('audit_hint'))}</p>
    ${printHead([t('audit'), f ? `${t('audit_area')}: ${gl || f}` : '', aq.length >= 2 ? `${t('print_search')}: „${aq}“` : '', au ? `${t('audit_until')} ${fmtD(au)}` : '', pu ? `${t('audit_person')}: ${S.auditUserName || ''}` : '', pv ? `${t('vehicle')}: ${S.auditVehName || ''}` : '', t('print_count').replace('{n}', S.auditRows.length)])}
    <form id="aqf" class="actions noprint" style="flex-wrap:wrap;align-items:flex-end;margin-top:0"><div style="flex:1 1 200px"><label for="afsel">${esc(t('audit_area'))}</label><select id="afsel">${groups.map(([k, l]) => `<option value="${esc(k)}"${f === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div style="flex:1 1 200px"><label for="aqs">${esc(t('audit_search'))}</label><input id="aqs" name="q" type="search" value="${esc(aq)}" maxlength="60" placeholder="${esc(t('audit_search_ph'))}"></div>
      <div><label for="auntil">${esc(t('audit_until'))}</label><input id="auntil" name="until" type="date" value="${esc(au)}" max="${esc(bDate())}"></div><button class="btn secondary">${esc(t('show'))}</button><button type="button" class="btn secondary" id="aprt">${esc(t('print'))}</button></form>
    ${pu ? `<div class="panel" id="aupers" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span><b>${esc(t('audit_person'))}:</b> ${esc(S.auditUserName || '')}</span><span class="small muted" style="flex:1 1 200px">${esc(t('audit_person_hint'))}</span><button type="button" class="btn secondary noprint" id="aupx">${esc(t('audit_person_all'))}</button></div>` : ''}
    ${pv ? `<div class="panel" id="auveh" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span><b>${esc(t('vehicle'))}:</b> <a href="#/vehicles/${esc(pv)}">${esc(S.auditVehName || '')}</a></span><span class="small muted" style="flex:1 1 200px">${esc(t('audit_veh_hint'))}</span><button type="button" class="btn secondary noprint" id="auvx">${esc(t('audit_veh_all'))}</button></div>` : ''}
    <details class="panel noprint"><summary>${esc(t('audit_csv'))}</summary><form id="auf" class="actions" style="flex-wrap:wrap;align-items:flex-end"><div><label>${esc(t('from'))}</label><input type="date" name="from" required value="${esc(S.auditFrom || bDate().slice(0, 8) + '01')}" max="${esc(bDate())}"></div><div><label>${esc(t('to'))}</label><input type="date" name="to" required value="${esc(S.auditTo || bDate())}" max="${esc(bDate())}"></div><button class="btn secondary">${esc(t('export_csv'))}</button></form><p class="small muted">${esc(t('audit_csv_hint'))}</p></details>
    <div class="list">${S.auditRows.map((e) => `<div class="row ${['login.locked', 'login.ip_limited', 'integration.token_limited'].includes(e.action) ? 'p-kritisch' : e.action === 'login.new_device' ? 'p-mittel' : ''}"><span class="chip">${fmtDT(e.created_at)}</span><span class="title" style="white-space:normal">${auditActionLabel(S.lang, e.action) ? `${esc(auditActionLabel(S.lang, e.action))} <span class="small muted">${esc(e.action)}</span>` : esc(e.action)}</span><span></span><span class="sub" style="white-space:normal">${esc(e.actor_name || t('au_system'))}${e.detail ? ' · ' + esc(det(e.detail, e.refs)) : ''}${auTarget(e)}</span></div>`).join('') || '<p class="muted">–</p>'}</div>
    ${r.entries.length === 100 ? `<div class="actions noprint"><button type="button" class="btn secondary" id="amore">${esc(t('load_more'))}</button></div>` : ''}`, 'more');
  $('#afsel').onchange = (e) => { S.auditFilter = e.target.value; viewAudit(); };
  $('#aqf').onsubmit = (e) => { e.preventDefault(); S.auditQ = $('#aqs').value.trim(); S.auditUntil = $('#auntil').value; viewAudit(); };
  const am = $('#amore'); if (am) am.onclick = () => viewAudit(true);
  const apx = $('#aupx'); if (apx) apx.onclick = () => { S.auditUser = null; S.auditUserName = null; viewAudit(); };
  $('#aprt').onclick = () => window.print();
  const avx = $('#auvx'); if (avx) avx.onclick = () => { S.auditVeh = null; S.auditVehName = null; viewAudit(); };
  const af = $('#auf');
  af.onsubmit = async (e) => { e.preventDefault(); S.auditFrom = af.from.value; S.auditTo = af.to.value;
    if (af.from.value > af.to.value) { toast(t('err_from_after_to'), true); return; }
    try { const blob = await api('GET', `/api/admin/audit?format=csv&from=${encodeURIComponent(af.from.value)}&to=${encodeURIComponent(af.to.value)}${f ? '&action=' + encodeURIComponent(f) : ''}${aq.length >= 2 ? '&q=' + encodeURIComponent(aq) : ''}${pu ? '&user=' + encodeURIComponent(pu) : ''}${pv ? '&vehicle=' + encodeURIComponent(pv) : ''}`); download(blob, `fuhrpark-protokoll_${af.from.value}_${af.to.value}.csv`); if (blob.cfpTruncated) toast(t('audit_csv_truncated').replace('{n}', blob.cfpTruncated), true); } catch (err) { toast(err.message, true); } };
}

// ---------- Zeitleiste der Fahrzeugakte ----------
// Filter steht in der Adresse (#/vehicles/<id>/timeline?f=<Bereich>): „Zurück“ aus einem Vorgang zeigt dieselbe Auswahl,
// Links können direkt gefiltert öffnen; unbekannte oder für die Rolle nicht sichtbare Bereiche → „Alle“
const TL_GROUPS = { '': [], case: ['case', 'case_closed'], inspection: ['inspection'], tire: ['tire'], maintenance: ['maintenance', 'odometer'], document: ['document'], driver: ['driver_from', 'driver_to'], fine: ['fine'], tacho: ['tacho'], contract: ['contract'], claim: ['claim'], note: ['note'] };
const TL_MGR_ONLY = ['fine', 'tacho', 'contract', 'claim'];
const tlHash = (id, f) => '#/vehicles/' + id + '/timeline' + (f ? '?f=' + f : '');
async function viewTimeline(id, fArg) {
  const groups = TL_GROUPS;
  const f = fArg && Object.prototype.hasOwnProperty.call(groups, fArg) && (!TL_MGR_ONLY.includes(fArg) || isMgr()) ? fArg : '';
  const r = await api('GET', `/api/vehicles/${encodeURIComponent(id)}/timeline?limit=500${f ? '&types=' + groups[f].join(',') : ''}`);
  const km = (n) => (n === null || n === undefined ? '' : ` · ${fmtNum(n)} km`);
  const caseLink = (x) => (x.case_id ? ` · <a href="#/cases/${esc(x.case_id)}">${esc(x.case_no || t('details'))}</a>` : '');
  const line = (x) => {
    switch (x.type) {
      case 'case': return [x.priority === 'kritisch' ? 'p-kritisch' : '', `${esc(t('tl_case'))}: ${esc(x.text)}`, `<span class="chip ${esc(x.priority)}">${esc(t('prio_' + x.priority))}</span> ${esc(t('st_' + x.status))}${caseLink(x)}`];
      case 'case_closed': return ['', `${esc(t('tl_case_closed'))}`, `${esc(t('st_' + x.status))}${caseLink(x)}`];
      case 'inspection': return [x.result === 'maengel' ? 'p-mittel' : '', `${esc(t(x.inspection_kind === 'abfahrt' ? 'departure_check' : 'inspection'))}: ${esc(t(x.result === 'ok' ? 'ok' : 'defect'))}`, `${esc(pnm(x.by, x.by_hidden) || '')}${km(x.km)}${caseLink(x)}`];
      case 'odometer': return [x.note ? 'p-mittel' : '', `${esc(t('km'))}${km(x.km)}`, `${esc(x.source || '')}${x.note ? ' · ' + esc(x.note) : ''}`];
      case 'driver_from': return ['', `${esc(t('tl_driver_from'))}: ${esc(x.by)}`, esc(evTr(x.evidence))];
      case 'driver_to': return ['', `${esc(t('tl_driver_to'))}: ${esc(x.by)}`, ''];
      case 'document': return ['', `${esc(t('dk_' + (x.doc_kind || 'sonstiges')))}: <a href="${fileUrl(x.file_id)}" target="_blank" rel="noopener">${esc(x.text)}</a>`, x.valid_until ? `${esc(t('valid_until'))} ${fmtD(x.valid_until)}` : ''];
      case 'tire': return [x.tread_mm !== null && x.tread_mm < 1.6 ? 'p-kritisch' : '', `${esc(t('tires'))} ${esc(x.position)}: ${esc(t('te_' + x.tire_event))}${x.tread_mm !== null ? ' · ' + esc(fmtNum(x.tread_mm)) + ' mm' : ''}`, `${km(x.km).replace(/^ · /, '')}${caseLink(x)}`];
      case 'maintenance': return [DEFECT_RESULTS.includes(x.result) ? 'p-kritisch' : '', `${esc(mk(x.maintenance_kind))} ${esc(t('tl_done'))}${x.result ? ` <span class="chip ${DEFECT_RESULTS.includes(x.result) ? 'kritisch' : x.result === 'ohne_maengel' ? 'ok' : ''}">${esc(t('res_' + x.result))}</span>` : ''}`, `${esc(x.evidence || '')}${km(x.km)}${x.by ? ' · ' + esc(x.by) : ''}`];
      case 'tacho': return ['', esc(t('tl_tacho')), `${esc(x.evidence || '')}${x.by ? ' · ' + esc(x.by) : ''}`];
      case 'contract': return ['', `${esc(t('ck_' + x.contract_kind))}: ${esc(t(x.contract_event === 'end' ? 'tl_contract_end' : 'tl_contract_start'))}`, `${esc(x.partner)}${x.evidence ? ' · ' + esc(x.evidence) : ''}`];
      case 'claim': return ['', `${esc(t('claim_title'))}: ${esc(t(x.claim_event === 'reimbursed' ? 'tl_claim_reimbursed' : 'tl_claim_reported'))}${x.claim_event === 'reimbursed' && x.reimbursed_net !== null ? ' · ' + eur(x.reimbursed_net) : ''}`, `${esc(x.insurer)}${x.claim_no ? ' · ' + esc(t('claim_no')) + ' ' + esc(x.claim_no) : ''}${x.claim_event === 'reported' ? ' · ' + esc(t('cls_' + x.status)) : ''}${caseLink(x)}`];
      case 'note': { const gone = x.note_event === 'archive' || x.note_event === 'expire';
        const meta = x.note_event === 'archive' ? [t('vnote_archived')] : x.note_event === 'expire' ? [t('vnote_expired').replace('{d}', fmtD(x.valid_until))] : [x.for_driver ? t('vnote_driver_chip') : '', x.valid_until ? t('vnote_until').replace('{d}', fmtD(x.valid_until)) : ''];
        return ['', `${esc(t('vnotes'))}: ${gone ? `<s>${esc(x.text)}</s>` : esc(x.text)}`, esc(meta.filter(Boolean).join(' · '))]; }
      case 'fine': return ['', `${esc(t('fk_' + x.fine_kind))}: <a href="#/fines/${esc(x.fine_id)}">${esc(x.fine_no)}</a>`, esc(t('fs_' + x.status))];
      default: return ['', esc(x.type), ''];
    }
  };
  const labels = { '': t('filter_all'), case: t('nav_cases'), inspection: t('inspections'), tire: t('tires'), maintenance: t('maintenance'), document: t('documents'), driver: t('drivers'), fine: t('fines'), tacho: t('tacho'), contract: t('ct_title'), claim: t('claims'), note: t('vnotes') };
  const visible = Object.keys(groups).filter((k) => !TL_MGR_ONLY.includes(k) || isMgr()).filter((k) => k !== 'tacho' || r.vehicle.kind !== 'anhaenger');
  // Ausdruck (z. B. Fahrzeughistorie für Verkauf/Rückgabe): Kennzeichen, Auswahl und Anzahl im Vermerk
  render(`<p class="noprint"><a href="#/vehicles/${esc(id)}">‹ ${esc(t('back'))}</a></p><div>${plate(r.vehicle.plate, { big: true })}</div>
    <h1 style="margin-top:12px">${esc(t('timeline'))}</h1>${printHead([r.vehicle.plate, `${t('print_filter')}: ${labels[f]}`, t('print_count').replace('{n}', r.items.length) + (r.truncated ? ' · ' + t('tl_trunc_short') : '')])}<p class="small muted">${esc(t('timeline_hint'))}</p>${r.truncated ? `<p class="small" id="tltrunc">⚠ ${esc(t('tl_truncated').replace('{n}', r.items.length))}</p>` : ''}
    <div class="actions noprint"><button type="button" class="btn secondary" id="tlprt">${esc(t('print'))}</button></div>
    <div class="actions" style="flex-wrap:wrap">${visible.map((k) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" aria-pressed="${f === k}" data-tl="${esc(k)}">${esc(labels[k])}</button>`).join('')}</div>
    <div class="list">${r.items.map((x) => { const [cls, title, sub] = line(x); return `<div class="row ${cls}"><span class="chip">${x.at.length === 10 ? fmtD(x.at) : fmtDT(x.at)}</span><span class="title" style="white-space:normal">${title}</span><span></span>${sub ? `<span class="sub" style="white-space:normal">${sub}</span>` : ''}</div>`; }).join('') || `<p class="muted">–</p>`}</div>
`, 'vehicles');
  $('#tlprt').onclick = () => window.print();
  // Filterwechsel ersetzt nur den Verlaufseintrag (kein neuer Eintrag je Klick), Fokus bleibt auf dem gewählten Knopf
  $$('[data-tl]').forEach((b) => (b.onclick = async () => {
    const k = b.dataset.tl;
    try { history.replaceState(history.state, '', tlHash(id, k)); } catch { /* z. B. eingeschränkte Vorschau */ }
    S.lastHash = (location.hash || '').replace(/%3A/gi, ':');
    await viewTimeline(id, k);
    const nb = document.querySelector(`[data-tl="${k}"]`); if (nb) nb.focus({ preventScroll: true });
  }));
}

// ---------- Werkstatt-Auslastung (je Standort und Kalenderwoche, ohne Personenbezug) ----------
// ---------- Werkstattplan (geplante Termine je Tag) ----------
async function viewPlan(sec) {
  const days = S.planDays || 14;
  const mgr = S.me.role !== 'workshop';
  const site = mgr ? (S.planSite || '') : '';
  const vsite = vsDef('planVsite') || '';
  const pq = `${site ? '&site=' + encodeURIComponent(site) : ''}${vsite ? '&vsite=' + encodeURIComponent(vsite) : ''}`;
  const r = await api('GET', `/api/workshop/plan?days=${days}${pq}`);
  const loc = uiLoc();
  const wd = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString(loc, { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  // weiterer geplanter Tag desselben Fahrzeugs → Hinweis zum Zusammenlegen (nur Anzeige)
  const other = (i) => i.other_dates && i.other_dates.length ? `<span class="otherdates">${esc(t('plan_other_dates'))}: ${i.other_dates.map(fmtD).join(', ')}</span>` : '';
  const subs = (...xs) => { const x = xs.filter(Boolean); return x.length ? `<span class="sub" style="white-space:normal">${x.join(' · ')}</span>` : ''; };
  const row = (i) => i.type === 'case'
    ? `<a class="row p-${esc(i.priority)}" href="#/cases/${esc(i.id)}">${plate(i.plate, { locked: i.safety_lock })}<span class="title">${esc(i.case_no)} · ${woTag(i)}${esc(i.description)}</span><span class="chip">${esc(t('st_' + i.status))}</span>${subs(mgr && !site && esc(wsName(i.workshop_site)), partsEta(i, '', true), i.status === 'wartet_teile' && i.parts_expected_date && i.planned_date && i.planned_date < i.parts_expected_date && `<span class="chip mittel">${esc(t('plan_before_parts'))}</span>`, other(i))}</a>`
    : `<a class="row" href="#/vehicles/${encodeURIComponent(i.vehicle_id)}">${plate(i.plate)}<span class="title">${esc(t('planned_inspection'))}: ${esc(mk(i.kind))}</span><span class="chip">${i.next_due_date ? esc(t('next_due')) + ' ' + fmtD(i.next_due_date) : ''}</span>${subs(i.order && `🔧 ${esc(t('mo_open'))} ${esc(i.order.case_no)}`, kmTxt(i), other(i))}</a>`;
  // km-Fälligkeit als Text (Rest bzw. überschritten); ohne km-Regel leer
  function kmTxt(i) {
    if (i.next_due_km === null || i.next_due_km === undefined) return '';
    const rest = i.km_remaining === null || i.km_remaining === undefined ? '' : ` (${i.km_remaining < 0 ? esc(t('km_over')) + ' ' + fmtKm(-i.km_remaining) : esc(t('km_left')) + ' ' + fmtKm(i.km_remaining)})`;
    return `${esc(t('due_at_km'))} ${fmtKm(i.next_due_km)}${rest}`;
  }
  // Fällig ohne Termin (nach Datum oder km): Sprung in die Fahrzeugakte, dort Termin planen oder Werkstattauftrag anlegen
  const drow = (i) => `<a class="row ${i.status === 'ueberfaellig' ? 'p-kritisch' : 'p-mittel'}" href="#/vehicles/${encodeURIComponent(i.vehicle_id)}">${plate(i.plate)}<span class="title">${esc(mk(i.kind))}${i.next_due_date ? ' · ' + esc(t('next_due')) + ' ' + fmtD(i.next_due_date) : ''}</span><span class="chip ${i.status === 'ueberfaellig' ? 'kritisch' : 'mittel'}">${esc(i.status === 'ohne_termin' && i.recall_ref ? t('vi_recall_open') : t('ms_' + i.status))}${i.by_km ? ' · km' : ''}</span>${subs(kmTxt(i), i.recall_ref && esc(i.recall_ref), i.past_planned_date && `${esc(t('wplan_mdue_past'))} ${fmtD(i.past_planned_date)}`, other(i))}</a>`;
  let html = `<h1>${esc(t('wplan'))}</h1><p class="small muted noprint">${esc(t('wplan_hint'))}</p>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · ${site || r.site ? esc(wsName(site || r.site)) + ' · ' : ''}${r.vehicle_site ? esc(t('kpi_vsite')) + ': ' + esc(r.vehicle_site === 'ohne' ? t('cs_nosite') : r.vehicle_site) + ' · ' : ''}${fmtD(r.from)} – ${fmtD(r.to)} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="panel noprint" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
      ${mgr ? `<div><label for="psite">${esc(t('workshop'))}</label><select id="psite"><option value="">${esc(t('all'))}</option>${S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}</select></div>` : ''}
      ${(r.vehicle_sites || []).length > 1 || r.vehicle_site ? `<div>${siteSelect('pvsite', '', r.vehicle_sites, r.vehicle_site, t('kpi_vsite'), t('filter_all'))}</div>` : ''}
      <div><label for="pdays">${esc(t('period'))}</label><select id="pdays">${[7, 14, 30].map((n) => `<option value="${n}"${n === days ? ' selected' : ''}>${n} ${esc(t('days'))}</option>`).join('')}</select></div>
      <button type="button" class="btn secondary" id="plprt">${esc(t('print'))}</button><button type="button" class="btn secondary" id="pics">${esc(t('export_ics'))}</button></div>`;
  // Termin direkt im Plan setzen (Backlog 60): nur für Aufträge, die der Vorgangsbefehl set_planned_date zulässt.
  // „Vorschlag“ füllt nur das Feld (Werktag mit den wenigsten geplanten Aufträgen) – gespeichert wird erst mit „Termin setzen“.
  const canEdit = ['owner', 'fleet', 'workshop'].includes(S.me.role);
  const setForm = (i) => i.can_plan
    ? `<div class="planset noprint"><label for="pd-${esc(i.id)}">${esc(t('planned'))}</label><input type="date" id="pd-${esc(i.id)}" min="${esc(r.today)}" value=""><button type="button" class="btn secondary" data-psug="${esc(i.id)}" title="${esc(t('plan_suggest_hint'))}">${esc(t('plan_suggest'))}</button><button type="button" class="btn" data-pset="${esc(i.id)}">${esc(t('plan_set'))}</button></div>`
    : canEdit ? `<p class="small muted noprint planset">${esc(t('plan_need_ack'))}</p>` : '';
  const prow = (i, base) => i.type === 'case' && canEdit ? `<div class="planitem">${base}${setForm(i)}</div>` : base;
  if (r.overdue.length) html += `<h2>${esc(t('wplan_overdue'))} <span class="chip kritisch">${r.overdue.length}</span></h2><div class="list">${r.overdue.map((i) => prow(i, row(i).replace('<span class="chip">', `<span class="chip kritisch">${fmtD(i.planned_date)} · `))).join('')}</div>`;
  html += r.days.length ? r.days.map((d) => `<h2>${esc(wd(d.date))}${d.date === r.today ? ` <span class="chip ok">${esc(t('today'))}</span>` : ''}</h2><div class="list">${d.items.map(row).join('')}</div>`).join('') : `<div class="panel">${esc(t('wplan_empty'))}</div>`;
  if (r.unplanned.length) html += `<h2>${esc(t('wplan_unplanned'))} <span class="chip mittel">${r.unplanned.length}</span></h2><p class="small muted noprint">${esc(t('wplan_unplanned_hint'))}</p><div class="list">${r.unplanned.map((i) => prow(i, row(i))).join('')}</div>`;
  const md = r.maintenance_due || [];
  if (md.length) html += `<h2 id="wp-mdue" tabindex="-1" data-keepfocus>${esc(t('wplan_mdue'))} <span class="chip ${md.some((i) => i.status === 'ueberfaellig') ? 'kritisch' : 'mittel'}">${md.length}</span></h2><p class="small muted noprint">${esc(t('wplan_mdue_hint'))}</p><div class="list">${md.map((i) => { const f = !['HU', 'SP'].includes(i.kind) ? maintOrderHtml(i.id, i.kind, null, { site: i.vehicle_site }) : ''; return f ? `<div class="planitem">${drow(i)}${f}</div>` : drow(i); }).join('')}</div>`;
  render(html, 'more');
  // Direktsprung aus Startseite/„Heute zu tun“ (#/plan?s=mdue): Abschnitt „Fällig – ohne Termin“ zeigen; fehlt er, bleibt der Plan oben
  if (sec === 'mdue') { const h = $('#wp-mdue'); if (h) { h.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true }); } }
  const all = [...r.overdue, ...r.unplanned];
  const suggest = (i) => {
    // Wartet der Auftrag auf Teile mit Liefertermin: frühestens an diesem Tag (Termin laut Werkstatt, die App schätzt nichts).
    const minD = i.status === 'wartet_teile' && i.parts_expected_date > r.today ? i.parts_expected_date : '';
    // Hat dasselbe Fahrzeug ab morgen schon einen Termin (anderer Auftrag oder Prüfung) an einem Werktag: diesen vorschlagen –
    // das Fahrzeug fällt dann nur einmal aus. Sonst Werktag ab morgen mit den wenigsten geplanten Aufträgen derselben Werkstatt.
    const same = r.days.filter((d) => d.date > r.today && d.date >= minD && ![0, 6].includes(new Date(d.date + 'T12:00:00Z').getUTCDay())
      && d.items.some((x) => x.vehicle_id === i.vehicle_id && x.id !== i.id && (x.type === 'maintenance' || x.workshop_site === i.workshop_site)))[0];
    if (same) return same.date;
    // Auslastung vom Server (alle Aufträge der Werkstatt, auch bei Fahrzeug-Standortfilter); ältere Antwort: aus den angezeigten Tagen
    const load = r.case_load ? new Map(Object.entries(r.case_load).map(([d, m]) => [d, m[i.workshop_site] || 0])) : new Map(r.days.map((d) => [d.date, d.items.filter((x) => x.type === 'case' && x.workshop_site === i.workshop_site).length]));
    let best = null;
    for (let n = 1; n <= days + 7 + (minD ? Math.max(0, Math.round((Date.parse(minD) - Date.parse(r.today)) / 86400000)) : 0); n++) {
      const d = new Date(Date.parse(r.today + 'T00:00:00Z') + n * 86400000);
      if ([0, 6].includes(d.getUTCDay())) continue;
      const ds = [d.getUTCFullYear(), String(d.getUTCMonth() + 1).padStart(2, '0'), String(d.getUTCDate()).padStart(2, '0')].join('-'); const c = load.get(ds) || 0;
      if (ds < minD) continue;
      if (!best || c < best.c) best = { ds, c };
      if (ds >= r.to && ds >= minD && best) break;
    }
    return best && best.ds;
  };
  // Werkstattauftrag aus „Fällig – ohne Termin“ (nur Leitung, nicht HU/SP): bleibt im Plan, der Auftrag erscheint danach unter „Ohne Termin“
  $$('form[data-mord]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); fm.querySelector('button').disabled = true; try { const x = await api('POST', `/api/maintenance/${fm.dataset.mord}/order`, { ...b, request_key: fm.dataset.key || (fm.dataset.key = uid()) }); toast('✓ ' + x.case_no); viewPlan(); } catch (err) { fm.querySelector('button').disabled = false; toast(err.message, true); } }));
  $$('[data-psug]').forEach((b) => (b.onclick = () => { const i = all.find((x) => x.id === b.dataset.psug); const f = $('#pd-' + CSS.escape(i.id)); f.value = suggest(i) || ''; f.focus(); }));
  $$('[data-pset]').forEach((b) => (b.onclick = async () => {
    const i = all.find((x) => x.id === b.dataset.pset); const f = $('#pd-' + CSS.escape(i.id));
    if (!f.value) { toast(t('plan_pick_date'), true); f.focus(); return; }
    b.disabled = true;
    try { await api('POST', `/api/cases/${i.id}/commands`, { action: 'set_planned_date', command_id: uid(), expected_version: i.version, note: null, payload: { planned_date: f.value } }); toast('✓'); viewPlan(); }
    catch (err) { b.disabled = false; toast(err.message, true); if (err.code === 'version_conflict') viewPlan(); }
  }));
  const ps = $('#psite'); if (ps) ps.onchange = () => { S.planSite = ps.value; viewPlan(); };
  const pvs = $('#pvsite'); if (pvs) pvs.onchange = () => { S.planVsite = pvs.value; viewPlan(); };
  $('#pdays').onchange = () => { S.planDays = Number($('#pdays').value); viewPlan(); };
  $('#plprt').onclick = () => window.print();
  $('#pics').onclick = async () => { try { download(await api('GET', `/api/workshop/plan?days=${days}&format=ics${pq}`), `werkstattplan_${bDate()}.ics`); } catch (err) { toast(err.message, true); } };
}

async function viewWsLoad() {
  const weeks = S.wlWeeks || 8;
  const r = await api('GET', `/api/reports/workshop-load?weeks=${weeks}`);
  const n = (x) => fmtNum(x);
  render(`<h1>${esc(t('ws_load'))}</h1>${printHead([`${weeks} ${t('weeks')}`])}<p class="small muted">${esc(t('ws_load_hint'))}</p>
    <div class="actions" style="flex-wrap:wrap">${[4, 8, 13, 26].map((w) => `<button type="button" class="btn ${w === weeks ? '' : 'secondary'}" data-wl="${w}">${w} ${esc(t('weeks'))}</button>`).join('')}<button type="button" class="btn secondary" id="wlcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="wlprt">${esc(t('print'))}</button></div>
    ${r.sites.map((s) => { const max = Math.max(1, ...s.weeks.map((w) => w.hours)); return `<section class="panel"><h2 style="margin-top:0">${esc(s.name === 'ohne' ? t('no_workshop') : s.name)}</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${r.open_statuses.map((st) => `<span class="chip ${s.open[st] ? 'mittel' : ''}">${esc(t('st_' + st))}: ${s.open[st] || 0}</span>`).join('')}</div>
      <div class="scroll"><table style="font-size:.85rem"><thead><tr><th>${esc(t('week'))}</th><th>${esc(t('hours'))}</th><th>${esc(t('ws_acknowledged'))}</th><th>${esc(t('ws_released'))}</th></tr></thead><tbody>
      ${s.weeks.slice().reverse().map((w) => `<tr><td style="white-space:nowrap" title="${esc(w.week)}">${esc(t('cw'))} ${esc(w.week.slice(6))}</td><td><div style="display:flex;align-items:center;gap:6px"><span aria-hidden="true" style="display:inline-block;height:10px;width:${Math.round((w.hours / max) * 40)}px;background:var(--steel);border-radius:2px"></span>${n(w.hours)}</div></td><td>${w.acknowledged}</td><td>${w.released}</td></tr>`).join('')}</tbody></table></div></section>`; }).join('') || '<p class="muted">–</p>'}`, 'more');
  $$('[data-wl]').forEach((b) => (b.onclick = () => { S.wlWeeks = Number(b.dataset.wl); viewWsLoad(); }));
  $('#wlprt').onclick = () => window.print();
  $('#wlcsv').onclick = async () => { try { download(await api('GET', `/api/reports/workshop-load?weeks=${weeks}&format=csv`), `werkstatt-auslastung_${r.from}_${weeks}kw.csv`); } catch (err) { toast(err.message, true); } };
}

// ---------- Telematik-Prüffälle und Zuordnungen ----------
// Letzter Stand je Fahrzeug: ohne Daten zuerst, dann ältester; nur Alter anzeigen, keine Bewertung (kein Grenzwert vorgegeben)
function tmAge(iso) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (!(h >= 0)) return '';
  return h >= 48 ? t('tm_age_d').replace('{n}', Math.floor(h / 24)) : t('tm_age_h').replace('{n}', h);
}
function tmPositions(list, r) {
  const none = list.filter((x) => !x.gps_time).length;
  const kmr = list.filter((x) => (x.km_rejected || []).length).length;
  return `<details class="panel" id="tmpos"${r.site || S.tmSite !== undefined ? ' open' : ''}><summary><b>${esc(t('tm_positions'))}</b> <span class="chip">${list.length}</span>${none ? ` <span class="chip mittel">${esc(t('tm_no_data'))}: ${none}</span>` : ''}${kmr ? ` <span class="chip mittel" data-tmkmsum>⚠ km: ${kmr}</span>` : ''}</summary>
    <p class="small muted">${esc(t('tm_positions_hint'))}</p><div class="actions noprint" style="margin-top:0;flex-wrap:wrap;align-items:end">${(r.site_options || []).length > 1 || r.site ? `<div>${siteSelect('tmsite', '', r.site_options, r.site, t('site'), t('filter_all'))}</div>` : ''}<button type="button" class="btn secondary" id="tmcsv">${esc(t('export_csv'))}</button></div><div class="list">${list.map((x) => `<a class="row${x.gps_time ? '' : ' p-mittel'}" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}"${x.kind === 'anhaenger' ? ' data-tmtrailer' : ''}>${plate(x.plate)}<span class="title" style="white-space:normal">${x.gps_time ? `${fmtDT(x.gps_time)} <span class="chip">${esc(tmAge(x.gps_time))}</span>` : esc(t('tm_no_data'))}</span><span class="sub">${x.kind === 'anhaenger' ? esc(t('trailer')) + (x.site ? ' · ' : '') : ''}${esc(x.site || '')}${x.providers.length ? ' · ' + esc(x.providers.join(', ')) : ''}</span>${(x.km_rejected || []).map((k) => `<span class="sub" style="color:var(--mid);white-space:normal" data-tmkm>⚠ ${esc(k.provider)} ${esc(k.external_id || '')}: ${fmtKm(k.km)} ${esc(t('tm_km_rejected').replace('{km}', fmtKm(k.recorded_km)))}</span>`).join('')}</a>`).join('') || '<p class="muted">–</p>'}</div>${kmr ? `<p class="small noprint" style="margin:10px 0 0"><a href="#/quality?f=telematics_km_rejected">${esc(t('dq_telematics_km_rejected'))} – ${esc(t('show_in_dq'))} ›</a></p>` : ''}</details>`;
}
const TM_PROV = { webfleet: 'Webfleet', yellowfox: 'YellowFox' };
async function viewTelematics() {
  const tsq = S.tmSite ? '?site=' + encodeURIComponent(S.tmSite) : '';
  const r = await api('GET', '/api/telematics' + tsq);
  const vs = await vehiclesCached();
  const opts = (sel) => vs.map((v) => `<option value="${esc(v.id)}"${v.id === sel ? ' selected' : ''}>${esc(v.plate)}${v.kind === 'anhaenger' ? ' (' + esc(t('vk_anhaenger')) + ')' : ''}</option>`).join('');
  render(`<h1>${esc(t('telematics'))}</h1><p class="small muted">${esc(t('telematics_hint'))}</p>
    <div class="stats"><div><b>${r.latest.vehicles}</b>${esc(t('tm_with_data'))}</div><div><b style="${r.unmatched.length ? 'color:var(--mid)' : ''}">${r.unmatched.length}</b>${esc(t('tm_unmatched'))}</div><div><b>${r.mappings.length}</b>${esc(t('tm_mappings'))}</div></div>
    ${r.latest.last_received ? `<p class="small muted">${esc(t('tm_last'))}: ${fmtDT(r.latest.last_received)}</p>${(r.by_provider || []).length ? `<p class="small muted" id="tmprov">${r.by_provider.map((x) => `<b>${esc(TM_PROV[x.provider] || x.provider)}</b>: ${x.last_received ? `${fmtDT(x.last_received)} · ${esc(t('tm_devices').replace('{n}', x.devices))}${x.inactive_vehicle_reports ? ` · <a href="#/quality?f=telematics_vehicle_inactive" class="tm-inact">⚠ ${esc(t('tm_inact_reports').replace('{n}', x.inactive_vehicle_reports))}</a>` : ''}` : '–'}`).join(' · ')}</p>` : ''}` : r.unmatched.length ? '' : `<div class="panel">${esc(t('tm_none'))}</div>`}
    <div class="actions noprint" style="margin-top:0"><button type="button" class="btn secondary" id="tmprt">${esc(t('print'))}</button></div>
    ${printHead([r.site ? `${t('site')}: ${r.site}` : '', r.latest.vehicles ? t('print_count').replace('{n}', (r.positions || []).length) : ''])}
    ${(r.plate_mismatches || []).length ? `<section class="panel" id="tmmism"><h2 style="margin-top:0">${esc(t('dq_telematics_plate_mismatch'))} <span class="chip kritisch">${r.plate_mismatches.length}</span></h2><p class="small muted">${esc(t('tm_mismatch_hint'))}</p><div class="list">${r.plate_mismatches.map((x) => `<a class="row p-kritisch" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(x.provider)} · ${esc(x.external_id || '')} → ${esc(t('tm_reports'))} <b>${esc(x.source_plate)}</b></span><span class="sub">${fmtDT(x.received_at)}</span></a>`).join('')}</div><p class="small"><a href="#/quality?f=telematics_plate_mismatch">${esc(t('show_in_dq'))} ›</a></p></section>` : ''}
    ${r.latest.vehicles ? tmPositions(r.positions || [], r) : ''}
    <h2>${esc(t('tm_unmatched'))}</h2><div class="list">${r.unmatched.map((u, i) => `<div class="row p-mittel"><span class="chip">${esc(u.provider)}</span><span class="title" style="white-space:normal">${esc(u.external_id)}${u.source_plate ? ' · ' + esc(u.source_plate) : ''}${u.source_vin ? ' · FIN ' + esc(u.source_vin) : ''}</span><span></span>
      <form class="sub" data-map="${i}" style="white-space:normal;display:grid;gap:6px;margin-top:6px"><label>${esc(t('vehicle'))}</label><select name="vehicle_id" required><option value="">–</option>${opts(null)}</select>${u.candidate_plate ? `<span class="small muted">${esc(t('tm_candidate'))}: ${esc(u.candidate_plate)}</span>` : ''}<label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" placeholder="${esc(t('tm_evidence_ph'))}"><button class="btn secondary">${esc(t('tm_confirm'))}</button></form></div>`).join('') || `<p class="muted">–</p>`}</div>
    <h2>${esc(t('tm_mappings'))}</h2><div class="list">${r.mappings.map((m) => `<div class="row">${plate(m.plate)}<span class="title" style="white-space:normal">${esc(m.provider)} · ${esc(m.external_id)}</span><button type="button" class="btn secondary" data-unmap="${esc(m.provider)}|${esc(m.external_id)}">${esc(t('tm_remove'))}</button><span class="sub" style="white-space:normal">${esc(m.evidence)} · ${esc(m.confirmed_by_name || '')} · ${fmtDT(m.confirmed_at)}</span></div>`).join('') || `<p class="muted">–</p>`}</div>`, 'more');
  // Ausdruck: „Letzter Stand je Fahrzeug“ immer mitdrucken (zugeklappte Bereiche blendet das Druck-CSS aus)
  $('#tmprt').onclick = () => { const d = $('#tmpos'); if (d) d.open = true; window.print(); };
  const tms = $('#tmsite'); if (tms) tms.onchange = () => { S.tmSite = tms.value; viewTelematics(); };
  const tmc = $('#tmcsv'); if (tmc) tmc.onclick = async () => { try { download(await api('GET', '/api/telematics?format=csv' + (r.site ? '&site=' + encodeURIComponent(r.site) : '')), `fuhrpark-telematik-stand_${bDate()}${r.site ? '_' + fnPart(r.site) : ''}.csv`); } catch (err) { toast(err.message, true); } };
  $$('[data-map]').forEach((f) => (f.onsubmit = async (e) => {
    e.preventDefault(); const u = r.unmatched[Number(f.dataset.map)];
    try { await api('POST', '/api/telematics/mappings', { provider: u.provider, external_id: u.external_id, vehicle_id: f.vehicle_id.value, evidence: f.evidence.value }); toast('✓'); viewTelematics(); } catch (err) { toast(err.message, true); }
  }));
  $$('[data-unmap]').forEach((b) => (b.onclick = async () => {
    if (!confirm(t('tm_remove') + '?')) return;
    const [provider, ext] = b.dataset.unmap.split('|');
    try { await api('DELETE', `/api/telematics/mappings?provider=${encodeURIComponent(provider)}&external_id=${encodeURIComponent(ext)}`); viewTelematics(); } catch (err) { toast(err.message, true); }
  }));
}

// ---------- Datenqualität (Inhaber/Fuhrparkleitung) ----------
async function viewQuality(pre) {
  // Direktsprung mit Prüffilter (#/quality?f=<Prüfung>, z. B. aus „Heute zu tun“): Schweregrad-Filter zurücksetzen
  if (pre && pre !== S.dqPre) { S.dqFilter = pre; S.dqSev = ''; }
  S.dqPre = pre || '';
  const r = await api('GET', '/api/admin/data-quality' + (vsDef('dqSite') ? '?site=' + encodeURIComponent(vsDef('dqSite')) : ''));
  const sevCls = { fehler: 'kritisch', luecke: 'mittel', hinweis: '' };
  // Filter nach Schweregrad (fehler/luecke/hinweis) und darin nach Prüfung; ein Prüffilter außerhalb des Schweregrads wird verworfen
  const sevOf = Object.fromEntries(r.items.map((i) => [i.check, i.severity]));
  const sev = ['fehler', 'luecke', 'hinweis'].includes(S.dqSev) ? S.dqSev : '';
  const sevCount = (s) => r.items.filter((i) => i.severity === s).length;
  if (S.dqFilter && (!r.counts[S.dqFilter] || (sev && sevOf[S.dqFilter] !== sev))) S.dqFilter = '';
  const f = S.dqFilter || '';
  const items = r.items.filter((i) => (!sev || i.severity === sev) && (!f || i.check === f));
  const checks = Object.keys(r.counts).filter((c) => !sev || sevOf[c] === sev);
  // Ausdruck (Arbeitsliste zum Abarbeiten): Schweregrad, Prüfung, Standort und Anzahl im Vermerk
  render(`<h1>${esc(t('dq'))}</h1>${printHead([sev ? `${t('dq_col_severity')}: ${t('dq_sev_' + sev)}` : '', f ? `${t('dq_col_check')}: ${t('dq_' + f)}` : '', r.site ? `${t('kpi_vsite')}: ${r.site === 'ohne' ? t('cs_nosite') : r.site}` : '', t('print_count').replace('{n}', items.length)])}${helpLink('dates')}<p class="small muted">${esc(t('dq_hint'))}</p>
    ${(r.site_options || []).length > 1 || r.site ? `<div class="panel noprint">${siteSelect('dqsite', '', r.site_options, r.site, t('kpi_vsite'), t('filter_all'))}${r.other_hidden ? `<p class="small muted" style="margin-bottom:0">${esc(t('dq_other_hidden').replace('{n}', r.other_hidden))}</p>` : ''}</div>` : ''}
    ${(r.truncated_checks || []).length ? `<p class="panel warn small" id="dqtrunc">${esc(t('dq_truncated').replaceAll('{n}', r.check_max))} ${r.truncated_checks.map((c) => esc(t('dq_' + c))).join(' · ')}</p>` : ''}
    <div class="stats"><div><b>${r.vehicles_checked}</b>${esc(t('vehicles'))}</div><div><b style="${r.items.some((i) => i.severity === 'fehler') ? 'color:var(--stop)' : ''}">${r.items.filter((i) => i.severity === 'fehler').length}</b>${esc(t('dq_sev_fehler'))}</div><div><b>${r.items.filter((i) => i.severity !== 'fehler').length}</b>${esc(t('dq_sev_luecke'))} / ${esc(t('dq_sev_hinweis'))}</div></div>
    ${r.items.length ? `<div class="actions noprint"><button type="button" class="btn secondary" id="dqcsv">${esc(t('export_csv'))}${f ? ' (' + esc(t('dq_' + f)) + ')' : sev ? ' (' + esc(t('dq_sev_' + sev)) + ')' : ''}</button><button type="button" class="btn secondary" id="dqprt">${esc(t('print'))}</button></div>` : ''}
    ${r.items.length ? `<div class="actions" style="flex-wrap:wrap" role="group" aria-label="${esc(t('dq_col_severity'))}"><span class="small muted" style="align-self:center">${esc(t('dq_col_severity'))}:</span><button type="button" class="btn ${sev ? 'secondary' : ''}" data-dqsev="" aria-pressed="${!sev}">${esc(t('filter_all'))} (${r.items.length})</button>${['fehler', 'luecke', 'hinweis'].filter((x) => sevCount(x)).map((x) => `<button type="button" class="btn ${sev === x ? '' : 'secondary'}" data-dqsev="${x}" aria-pressed="${sev === x}">${esc(t('dq_sev_' + x))} (${sevCount(x)})</button>`).join('')}</div>` : ''}
    ${r.items.length ? `<div class="actions" style="flex-wrap:wrap" role="group" aria-label="${esc(t('dq_col_check'))}"><span class="small muted" style="align-self:center">${esc(t('dq_col_check'))}:</span><button type="button" class="btn ${f ? 'secondary' : ''}" data-dq="">${esc(t('filter_all'))} (${sev ? sevCount(sev) : r.items.length})</button>${checks.map((c) => `<button type="button" class="btn ${f === c ? '' : 'secondary'}" data-dq="${esc(c)}">${esc(t('dq_' + c))} (${r.counts[c]}${(r.truncated_checks || []).includes(c) ? '+' : ''})</button>`).join('')}</div>` : `<div class="panel good"><b>${esc(t('dq_ok'))}</b></div>`}
    <div class="list">${items.map((i) => { const href = i.case_id ? `#/cases/${esc(i.case_id)}` : i.vehicle_id && i.check === 'inspection_no_result' && i.event_id ? `#/vehicles/${esc(i.vehicle_id)}?ev=${esc(i.event_id)}` : i.vehicle_id ? `#/vehicles/${esc(i.vehicle_id)}` : i.driver_id ? `#/drivers/${esc(i.driver_id)}` : null; return `${href ? `<a class="row ${i.severity === 'fehler' ? 'p-kritisch' : i.severity === 'luecke' ? 'p-mittel' : ''}" href="${href}">` : `<div class="row">`}${i.plate ? plate(i.plate) : i.driver_id ? `<span class="chip">${esc(i.driver_name)}</span>` : `<span class="chip">${esc(t('users'))}</span>`}<span class="title" style="white-space:normal">${esc(t('dq_' + i.check))}</span><span class="chip ${sevCls[i.severity]}">${esc(t('dq_sev_' + i.severity))}</span>${i.detail ? `<span class="sub" style="white-space:normal">${esc(dqDetail(i))}</span>` : ''}${href ? '</a>' : '</div>'}`; }).join('')}</div>`, 'more');
  $$('[data-dq]').forEach((b) => (b.onclick = () => { S.dqFilter = b.dataset.dq; viewQuality(); }));
  $$('[data-dqsev]').forEach((b) => (b.onclick = () => { S.dqSev = b.dataset.dqsev; viewQuality(); }));
  const dqs = $('#dqsite'); if (dqs) dqs.onchange = () => { S.dqSite = dqs.value; viewQuality(); };
  const dp = $('#dqprt'); if (dp) dp.onclick = () => window.print();
  const dc = $('#dqcsv'); if (dc) dc.onclick = () => download(new Blob([dataQualityCsv(items, t, fmtD)], { type: 'text/csv;charset=utf-8' }), `fuhrpark-datenqualitaet_${r.environment}_${bDate()}.csv`);
}

// ---------- Nutzungsstatistik (Inhaber, ohne Personenbezug) ----------
async function viewUsage() {
  const days = S.usageDays || 30;
  const r = await api('GET', `/api/admin/usage?days=${days}`);
  const AREA = { cases: 'nav_cases', vehicles: 'vehicles', tires: 'fleet_tires', stock: 'stock', fines: 'fines', maintenance: 'inspections_due', reports: 'area_reports',
    master: 'nav_master', notifications: 'notifications', admin: 'area_admin', account: 'nav_profile', dashboard: 'nav_home', checks: 'departure_check', other: 'area_other' };
  const max = Math.max(1, ...r.daily.map((d) => d.calls));
  render(`<h1>${esc(t('usage'))}</h1><p class="small muted">${esc(t('usage_hint'))}</p>
    <div class="actions" style="flex-wrap:wrap">${[7, 30, 90, 365].map((d) => `<button type="button" class="btn ${d === days ? '' : 'secondary'}" data-ud="${d}">${d} ${esc(t('days'))}</button>`).join('')}</div>
    <div class="stats"><div><b>${r.total_calls}</b>${esc(t('calls'))}</div><div><b>${r.daily.length}</b>${esc(t('days_used'))}</div><div><b${r.areas.some((a) => a.errors) ? ' style="color:var(--stop)"' : ''}>${r.areas.reduce((s, a) => s + a.errors, 0)}</b>${esc(t('errors_count'))}</div></div>
    ${r.daily.length ? `<div class="panel" aria-hidden="true" style="display:flex;align-items:flex-end;gap:2px;height:70px;padding:8px">${r.daily.map((d) => `<span title="${esc(fmtD(d.day))}: ${d.calls}" style="flex:1;min-width:2px;max-width:28px;background:var(--steel);height:${Math.max(4, Math.round((d.calls / max) * 100))}%"></span>`).join('')}</div>` : ''}
    <div class="scroll"><table><thead><tr><th>${esc(t('area_col'))}</th><th>${esc(t('calls'))}</th><th>${esc(t('errors_count'))}</th></tr></thead><tbody>
    ${r.areas.map((a) => `<tr><td><b>${esc(t(AREA[a.area] || 'area_other'))}</b></td><td>${a.calls}</td><td>${a.errors ? `<span class="chip kritisch">${a.errors}</span>` : '0'}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table></div>
    <details><summary>${esc(t('functions_detail'))} (${r.features.length})</summary><div class="scroll"><table class="stack"><thead><tr><th>${esc(t('function_col'))}</th><th>${esc(t('calls'))}</th><th>${esc(t('errors_count'))}</th><th>${esc(t('last_used'))}</th></tr></thead><tbody>
    ${r.features.map((f) => `<tr><td><code>${esc(f.feature)}</code></td><td>${f.calls}</td><td>${f.errors}</td><td>${fmtD(f.last_day)}</td></tr>`).join('')}</tbody></table></div></details>`, 'more');
  $$('[data-ud]').forEach((b) => (b.onclick = () => { S.usageDays = Number(b.dataset.ud); viewUsage(); }));
}

// ---------- Suche (Kennzeichen/FIN/Anhänger und Vorgänge) ----------
async function viewSearch() {
  if (S.me.role === 'driver') { location.hash = '#/'; return; }
  render(`<h1>${esc(t('search_title'))}</h1><input id="gq" type="search" autocomplete="off" aria-label="${esc(t('search_title'))}" placeholder="${esc(t('search_ph'))}" value="${esc(S.lastSearch || '')}"><div id="gr"></div>`, '');
  let vehicles = null; let fineList = null; let stockList = null; let timer = null; let seq = 0;
  // Bußgelder nur Inhaber/Fuhrparkleitung/Lesezugriff, Lager nur Inhaber/Fuhrparkleitung/Werkstatt (eigenes Lager) – wie die Server-Rechte
  const canFines = ['owner', 'fleet', 'viewer'].includes(S.me.role); const canStock = ['owner', 'fleet', 'workshop'].includes(S.me.role);
  const norm = (x) => String(x || '').toLowerCase().replace(/[\s-]/g, '');
  const run = async () => {
    const q = $('#gq').value.trim(); S.lastSearch = q; const my = ++seq; const box = $('#gr');
    if (q.length < 2) { box.innerHTML = `<p class="muted small">${esc(t('search_hint'))}</p>`; return; }
    try {
      if (!vehicles) vehicles = (await api('GET', '/api/vehicles')).vehicles;
      const n = norm(q);
      // Treffer je Bereich höchstens 10 (Vorgänge 20) – Gesamtzahl und Hinweis „Suche genauer eingeben“ statt stillem Abschneiden
      const vAll = vehicles.filter((v) => [v.plate, v.vin, v.trailer_plate, v.truck_plate, v.manufacturer, v.model].some((x) => norm(x).includes(n))); const vs = vAll.slice(0, 10);
      const cr = await api('GET', '/api/cases?status=&limit=20&q=' + encodeURIComponent(q)); const cs = cr.cases;
      if (canFines && !fineList) fineList = (await api('GET', '/api/fines')).fines;
      if (canStock && !stockList) stockList = (await api('GET', '/api/stock')).items;
      if (my !== seq) return;
      const lq = q.toLowerCase();
      const fAll = canFines ? fineList.filter((f) => [f.plate, f.plate_in_letter].some((x) => norm(x).includes(n)) || [f.fine_no, f.reference, f.authority].some((x) => String(x || '').toLowerCase().includes(lq))) : []; const fs = fAll.slice(0, 10);
      const hq = helpNorm(q); // Lager: Umlaute/ue gleich (wie Lagerliste und Hilfe)
      const sAll = canStock ? stockList.filter((i) => [i.name, i.part_number, i.location].some((x) => helpNorm(x).includes(hq))) : []; const ss = sAll.slice(0, 10);
      const more = (shown, all) => (all > shown ? `<p class="small muted" data-more>${esc(t('search_more').replace('{n}', shown).replace('{m}', all))}</p>` : '');
      // Hilfe-Abschnitte der eigenen Rolle (gleiche Suche wie auf der Hilfeseite)
      const hs = (helpMatches(helpSections(S.me.role).map((h) => ({ name: h, title: t(`help_${h}_t`), steps: t(`help_${h}_s`).split('|') })), q) || []).sort((a, b) => b.title_hit - a.title_hit).slice(0, 5);
      box.innerHTML = `<h2>${esc(t('nav_vehicles'))} <span class="chip">${vAll.length}</span></h2>${more(vs.length, vAll.length)}${vs.length ? `<div class="list">${vs.map((v) => `<a class="row" href="#/vehicles/${encodeURIComponent(v.id)}">${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="title">${v.kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${esc(v.manufacturer || '')} ${esc(v.site || '')}</span><span class="chip">${esc(t('av_' + v.availability))}</span><span class="sub">${esc(v.vin || '')}</span></a>`).join('')}</div>` : `<p class="muted">–</p>`}
        <h2>${esc(t('nav_cases'))} <span class="chip">${cs.length}${cr.truncated ? '+' : ''}</span></h2>${cr.truncated ? `<p class="small muted" data-more>${esc(t('search_more_cases').replace('{n}', cs.length))} <a href="#/cases" id="gcases">${esc(t('search_all_cases'))}</a></p>` : ''}${caseList(cs, '–')}`
        + (fs.length ? `<h2>${esc(t('fines'))} <span class="chip">${fAll.length}</span></h2>${more(fs.length, fAll.length)}<div class="list" id="gfines">${fs.map((f) => `<a class="row" href="#/fines/${esc(f.id)}">${plate(f.plate || f.plate_in_letter)}<span class="title">${esc(t('fk_' + f.kind))}</span><span class="chip">${esc(t('fs_' + f.status))}</span><span class="sub">${esc(f.fine_no)}${f.reference ? ' · ' + esc(f.reference) : ''}${f.authority ? ' · ' + esc(f.authority) : ''}</span></a>`).join('')}</div>` : '')
        + (ss.length ? `<h2>${esc(t('stock'))} <span class="chip">${sAll.length}</span></h2>${more(ss.length, sAll.length)}<div class="list" id="gstock">${ss.map((i) => `<a class="row ${i.below_min ? 'p-mittel' : ''}" href="#/stock/${esc(i.id)}"><span class="chip">${esc(i.site)}</span><span class="title">${esc(i.name)}</span><b>${i.on_hand} ${esc(i.unit)}</b><span class="sub">${[i.part_number && esc(i.part_number), i.location && esc(i.location), i.below_min && esc(t('below_min'))].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>` : '')
        + (hs.length ? `<h2>${esc(t('help'))} <span class="chip">${hs.length}</span></h2><div class="list" id="ghelp">${hs.map((h) => `<a class="row" href="#/help?s=${h.name}&q=${encodeURIComponent(q)}"><span>?</span><span class="title">${esc(t(`help_${h.name}_t`))}</span><span></span></a>`).join('')}</div>` : '');
      const gc = $('#gcases'); if (gc) gc.onclick = () => { S.caseQ = q; try { sessionStorage.setItem('cfp_cf', 'all'); } catch {} };
    } catch (err) { if (my === seq) box.innerHTML = `<div class="panel alert">${esc(err.message)}</div>`; }
  };
  $('#gq').oninput = () => { clearTimeout(timer); timer = setTimeout(run, 300); };
  $('#gq').focus();
  run();
}

// ---------- Hilfe (Schritt für Schritt, DE/UK/EN) ----------
// want = Abschnitt (?s=), q = Suchbegriff (&q=, z. B. aus der globalen Suche – Treffer bleiben markiert)
function viewHelp(want, q) {
  const sec = (n) => `<section class="panel helpsec" id="help-${n}"><h2 style="margin-top:0">${esc(t(`help_${n}_t`))}</h2><ol>${t(`help_${n}_s`).split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ol></section>`;
  const parts = helpSections(S.me.role);
  render(`<h1>${esc(t('help'))}</h1><div class="panel"><label for="hq">${esc(t('help_search'))}</label><input id="hq" type="search" autocomplete="off">${helpToc(parts)}</div>`
    + parts.map(sec).join('') + `<p class="small muted">${esc(t('app_version'))}: ${esc(S.appVersion || '–')}</p>`, 'more');
  if (q) $('#hq').value = q.slice(0, 100);
  const run = helpWire(parts, want);
  let timer;
  // Suchbegriff in die Adresse übernehmen (ohne neuen Verlaufseintrag, ohne Neuaufbau): „Zurück“ aus einem Treffer behält ihn
  const keepQ = () => { const v = $('#hq').value.trim().slice(0, 100); try { history.replaceState(history.state, '', helpHash(v)); } catch { /* z. B. eingeschränkte Vorschau */ } };
  $('#hq').oninput = () => { clearTimeout(timer); timer = setTimeout(() => { run(); keepQ(); }, 150); };
}
const helpHash = (q) => '#/help' + (q ? '?q=' + encodeURIComponent(q) : '');

// Hilfe-Abschnitte je Rolle (Reihenfolge = Anzeige)
function helpSections(r) {
  // Lesezugriff meldet nichts und macht keine Kontrollen; Mängelstatistik nur Inhaber/Fuhrparkleitung (Server) – nur Kennzahlen und Benachrichtigungen
  if (r === 'viewer') return ['viewer', 'kpi', 'costs', 'exports', 'push', 'login2fa'];
  const parts = ['report', 'accident', 'prio', 'check', 'push', 'offline', 'login2fa'];
  if (r === 'workshop') parts.unshift('ws', 'costlimit', 'stock');
  if (r === 'workshop') parts.splice(parts.indexOf('stock') + 1, 0, 'tires');
  if (['owner', 'fleet'].includes(r)) parts.unshift('fleet', 'release', 'costlimit', 'dates', 'defects', 'kpi', 'costs', 'drivers', 'contracts', 'claims', 'fines', 'tires', 'stock');
  if (r === 'owner') parts.splice(parts.indexOf('stock') + 1, 0, 'privacy');
  // Benutzer, Zugänge & Protokoll: Benutzerverwaltung hat Inhaber und Fuhrparkleitung (Protokoll nur Inhaber – im Text vermerkt)
  if (['owner', 'fleet'].includes(r)) parts.splice(parts.indexOf('stock') + 1, 0, 'access');
  // Ausdrucke & Exporte: Rollen mit CSV-/Druck-Funktionen (Fahrer/Dispo nur Vorgangsliste drucken – dort genügt der Knopf)
  if (['owner', 'fleet', 'workshop'].includes(r)) parts.splice(parts.indexOf('stock') + 1, 0, 'exports');
  if (r === 'dispatch') parts.unshift('dispo');
  if (r === 'driver') parts.unshift('myveh', 'myfines');
  return parts;
}

// Link „Hilfe zu dieser Seite“ – nur wenn die Rolle den Abschnitt sieht
const helpLink = (n) => (S.me && helpSections(S.me.role).includes(n) ? `<p class="small noprint" style="margin:4px 0 12px"><a href="#/help?s=${n}">${esc(t('help_page'))} ›</a></p>` : '');

// Hilfe: Trefferzeile + Inhaltsverzeichnis (Sprungmarken als Knöpfe – die Raute gehört dem Router)
function helpToc(parts) {
  return `<p id="hres" class="small muted" aria-live="polite" style="margin:6px 0 0"></p>
    <details id="htoc"${innerWidth >= 700 ? " open" : ""}><summary>${esc(t('help_toc'))} (${parts.length})</summary><ul class="helptoc">${parts.map((n) => `<li data-hn="${n}"><button type="button" class="linkbtn" data-hgo="${n}">${esc(t(`help_${n}_t`))}</button></li>`).join('')}</ul></details>`;
}

function helpWire(parts, want) {
  const sections = parts.map((n) => ({ name: n, title: t(`help_${n}_t`), steps: t(`help_${n}_s`).split('|') }));
  const go = (n) => {
    const el = document.getElementById(`help-${n}`); if (!el) return;
    const h = el.querySelector('h2'); h.tabIndex = -1; h.dataset.keepfocus = '1';
    el.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true });
    el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600);
  };
  $$('[data-hgo]').forEach((b) => (b.onclick = () => go(b.dataset.hgo)));
  const run = () => {
    const res = helpMatches(sections, document.getElementById('hq').value);
    for (const s of sections) {
      const m = res && res.find((x) => x.name === s.name);
      const el = document.getElementById(`help-${s.name}`);
      el.hidden = !!res && !m;
      $$('li', el).forEach((li, i) => li.classList.toggle('hit', !!m && m.steps.includes(i)));
      const tl = $(`[data-hn="${s.name}"]`); if (tl) tl.hidden = el.hidden;
    }
    $('#hres').textContent = !res ? '' : res.length === 1 ? t('help_hits1') : res.length ? t('help_hits').replace('{n}', res.length) : t('help_none');
  };
  if (document.getElementById('hq').value) run(); // vorbelegter Suchbegriff: erst filtern, dann zum Abschnitt springen
  if (want && parts.includes(want)) go(want);
  return run;
}

// ---------- Mängelstatistik der Kontrollen ----------
async function viewDefects() {
  const days = S.defDays || 90; const kind = S.defKind || '';
  const r = await api('GET', `/api/reports/defects?days=${days}${kind ? '&kind=' + kind : ''}${vsDef('defSite') ? '&site=' + encodeURIComponent(vsDef('defSite')) : ''}`);
  const veh = (id, p) => `<a href="#/vehicles/${encodeURIComponent(id)}">${esc(p)}</a>`;
  const vlist = r.vehicles.filter((v) => v.defect_items > 0);
  render(`<h1>${esc(t('defect_stats'))}</h1>${helpLink('defects')}<p class="small muted">${esc(t('defect_stats_hint'))}</p>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · ${days} ${esc(t('days'))}${kind ? ' · ' + esc(kind === 'abfahrt' ? t('nav_check') : t('inspection')) : ''}${r.site ? ' · ' + esc(r.site === 'ohne' ? t('cs_nosite') : r.site) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="panel noprint" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
      <div><label for="dd">${esc(t('period'))}</label><select id="dd">${[30, 90, 180, 365].map((d) => `<option value="${d}"${d === days ? ' selected' : ''}>${d} ${esc(t('days'))}</option>`).join('')}</select></div>
      <div><label for="dk">${esc(t('check_kind'))}</label><select id="dk">${[['', t('all')], ['abfahrt', t('nav_check')], ['nach_reparatur', t('inspection')]].map(([k, l]) => `<option value="${k}"${k === kind ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      ${(r.site_options || []).length > 1 || r.site ? `<div>${siteSelect('dsite', '', r.site_options, r.site)}</div>` : ''}
      <button type="button" class="btn secondary" id="dprt">${esc(t('print'))}</button>
      ${r.totals.checks ? `<button type="button" class="btn secondary" id="dcsvi">${esc(t('def_csv_item'))}</button><button type="button" class="btn secondary" id="dcsvv">${esc(t('kpi_csv_veh'))}</button>` : ''}
    </div>
    <div class="stats"><div><b>${r.totals.checks}</b>${esc(t('checks_done'))}</div><div><b>${r.totals.checks_with_defects}</b>${esc(t('checks_with_defects'))}</div><div><b style="${r.totals.defect_items ? 'color:var(--mid)' : ''}">${r.totals.defect_items}</b>${esc(t('defect_items'))}</div></div>
    <h2>${esc(t('defects_by_item'))}</h2>
    ${r.items.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('check_item'))}</th><th>${esc(t('defect_items'))}</th><th>${esc(t('again_after_repair'))}</th><th>${esc(t('nav_vehicles'))}</th><th>${esc(t('last_used'))}</th></tr></thead><tbody>
      ${r.items.map((i) => `<tr><td><b>${esc(checkLabel(i.item))}</b></td><td>${i.defects}</td><td>${i.again_after_repair ? `<b style="color:var(--mid)">${i.again_after_repair}</b>` : '0'}</td><td>${i.vehicles.map((v) => `${veh(v.vehicle_id, v.plate)} (${v.n})`).join(', ')}${i.vehicle_count > i.vehicles.length ? ` +${i.vehicle_count - i.vehicles.length}` : ''}</td><td>${i.last_at ? fmtD(i.last_at) : '–'}</td></tr>`).join('')}</tbody></table></div><p class="small muted">${esc(t('again_after_repair_hint'))}</p>` : `<p class="muted">${esc(t('no_defects_period'))}</p>`}
    <h2>${esc(t('defects_by_vehicle'))}</h2>
    ${vlist.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('vehicle'))}</th><th>${esc(t('checks_done'))}</th><th>${esc(t('checks_with_defects'))}</th><th>${esc(t('defect_items'))}</th><th>${esc(t('last_check_any'))}</th></tr></thead><tbody>
      ${vlist.map((v) => `<tr><td>${veh(v.vehicle_id, v.plate)}</td><td>${v.checks}</td><td>${v.checks_with_defects}</td><td><b>${v.defect_items}</b></td><td>${fmtD(v.last_check_at)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(t('no_defects_period'))}</p>`}
    <p class="small muted">${esc(t('defect_stats_rule'))}</p>`, 'more');
  $('#dd').onchange = () => { S.defDays = Number($('#dd').value); viewDefects(); };
  $('#dk').onchange = () => { S.defKind = $('#dk').value; viewDefects(); };
  const dsel = $('#dsite'); if (dsel) dsel.onchange = () => { S.defSite = dsel.value; viewDefects(); };
  $('#dprt').onclick = () => window.print();
  // CSV im Browser (Beschriftungen in der App-Sprache), Dateiname mit Zeitraum, Kontrollart und Standort
  const dn = (part) => `fuhrpark-maengel-${part}_${r.environment}_${days}t${kind ? '_' + kind : ''}${r.site ? '_' + fnPart(r.site) : ''}_${bDate()}.csv`;
  const dd = (iso) => fmtD(iso);
  const ci = $('#dcsvi'); if (ci) ci.onclick = () => download(new Blob([defectItemsCsv(r, t, checkLabel, dd)], { type: 'text/csv;charset=utf-8' }), dn('pruefpunkte'));
  const cv = $('#dcsvv'); if (cv) cv.onclick = () => download(new Blob([defectVehiclesCsv(r, t, dd)], { type: 'text/csv;charset=utf-8' }), dn('fahrzeuge'));
}

// ---------- Reifen über die Flotte ----------
async function viewFleetTires() {
  const r = await api('GET', '/api/tires/fleet' + (vsDef('tireSite') ? '?site=' + encodeURIComponent(vsDef('tireSite')) : ''));
  // Direktsprung von der Werkstatt-Startseite (#/tires?f=winter_bad|winter_unknown): Reiter übernehmen, danach normale Bedienung
  const hf = new URLSearchParams(location.hash.split('?')[1] || '').get('f');
  if (hf && ['attention', 'stale', 'never', 'winter_bad', 'winter_unknown', 'winter_closed', 'age', 'all'].includes(hf)) S.tireFilter = hf;
  if (hf) try { history.replaceState(null, '', '#/tires'); } catch {} // Reiterwechsel danach nicht vom Link überschrieben
  const f = S.tireFilter || 'attention';
  const sel = { attention: (x) => x.status === 'unter_minimum' || x.status === 'warnung', never: (x) => x.measured_positions === 0, stale: (x) => x.stale && x.measured_positions > 0, winter_bad: (x) => x.winter === 'nicht_erfuellt', winter_unknown: (x) => x.winter === 'unbekannt', winter_closed: (x) => !!x.winter_closed_order, age: (x) => x.age_warn > 0, all: () => true }[f] || (() => true);
  const rows = r.rows.filter(sel);
  const wf = f === 'winter_bad' || f === 'winter_unknown' || f === 'winter_closed'; // Winter-Reiter: Positionen und Aufträge in der Zeile
  const cls = { unter_minimum: 'kritisch', warnung: 'mittel', ok: 'ok', unbekannt: '' };
  const tabs = [['attention', `${t('ts_unter_minimum')} / ${t('ts_warnung')}`, r.totals.below_min + r.totals.warn], ['stale', t('tires_stale').replace('{d}', r.stale_days), r.totals.stale], ['never', t('tires_never'), r.totals.never_measured], ['winter_bad', t('tires_winter_bad'), r.totals.winter_noncompliant], ['winter_unknown', t('tires_winter_unknown'), r.totals.winter_unknown], ['winter_closed', t('tires_winter_closed'), r.rows.filter((x) => x.winter_closed_order).length], ...(r.warn_age_years !== null ? [['age', t('tires_age_tab').replace('{y}', r.warn_age_years), r.totals.age_warn]] : []), ['all', t('filter_all'), r.totals.vehicles]].filter(([k, , n]) => n || k === f || !(k.startsWith('winter') || k === 'age'));
  render(`<h1>${esc(t('fleet_tires'))}</h1>${helpLink('tires')}<p class="small muted">${esc(t('tires_rule').replace('{min}', fmtNum(r.legal_min_tread_mm)).replace('{warn}', r.warn_tread_mm === null ? '–' : fmtNum(r.warn_tread_mm)))}</p>
    ${(r.site_options || []).length > 1 || r.site ? `<div class="panel noprint">${siteSelect('tsite', '', r.site_options, r.site)}</div>` : ''}
    <div class="actions noprint" style="flex-wrap:wrap">${tabs.map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-tf="${k}" aria-pressed="${f === k}">${esc(l)} (${n})</button>`).join('')}</div>
    <div class="actions noprint"><button type="button" class="btn secondary" id="trcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="trprt">${esc(t('print'))}</button></div>
    ${printHead([`${t('print_filter')}: ${(tabs.find(([k]) => k === f) || [, t('filter_all')])[1]}`, r.site ? `${t('site')}: ${r.site === 'ohne' ? t('cs_nosite') : r.site}` : '', t('print_count').replace('{n}', rows.length)])}
    <div class="list">${rows.map((x) => `<a class="row ${x.status === 'unter_minimum' ? 'p-kritisch' : x.status === 'warnung' ? 'p-mittel' : ''}" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title">${x.min_tread_mm === null ? '–' : esc(fmtNum(x.min_tread_mm)) + ' mm'}</span><span class="chip ${cls[x.status]}">${esc(t('ts_' + x.status))}</span>${x.winter === 'nicht_erfuellt' ? `<span class="chip kritisch">${esc(t('ws_nicht_erfuellt'))}</span>` : ''}<span class="sub">${[x.kind === 'anhaenger' && esc(t('vk_anhaenger')), x.site && esc(x.site), `${x.measured_positions} ${esc(t('positions'))}`, x.below_min && `${x.below_min}× < ${fmtNum(r.legal_min_tread_mm)} mm`, x.oldest_measure_at && `${esc(t('tires_oldest'))} ${fmtD(x.oldest_measure_at)}`, x.oldest_dot_months !== null && `${esc(t('tires_oldest_dot'))} ${esc(tireAge(x.oldest_dot_months))}${x.age_warn ? ` (${x.age_warn}× ${esc(t('tire_age_warn').replace('{y}', r.warn_age_years))})` : ''}`, wf && x.winter_noncompliant.length && esc(t('winter_bad').replace('{p}', x.winter_noncompliant.join(', '))), wf && x.winter_missing.length && esc(t('winter_missing').replace('{p}', x.winter_missing.join(', '))), wf && x.winter_order && `🔧 ${esc(t('mo_open'))} ${esc(x.winter_order.case_no)}`, wf && x.winter_closed_order && `⚠ ${esc(t('wo_closed_short').replace('{no}', x.winter_closed_order.case_no))}`].filter(Boolean).join(' · ')}</span></a>`).join('') || `<p class="muted">–</p>`}</div>${wf ? `<p class="small muted">${esc(t('winter_rule'))}</p>` : ''}`, 'more');
  $$('[data-tf]').forEach((b) => (b.onclick = () => { S.tireFilter = b.dataset.tf; viewFleetTires(); }));
  // CSV: alle Fahrzeuge (gewählter Standort) mit Status und Reifengrößen je Achse – unabhängig vom Filterknopf
  $('#trcsv').onclick = async () => { try { download(await api('GET', '/api/tires/fleet?format=csv' + (r.site ? '&site=' + encodeURIComponent(r.site) : '')), `fuhrpark-reifen_${bDate()}${r.site ? '_' + fnPart(r.site) : ''}.csv`); } catch (err) { toast(err.message, true); } };
  const ts = $('#tsite'); if (ts) ts.onchange = () => { S.tireSite = ts.value; viewFleetTires(); };
  $('#trprt').onclick = () => window.print();
}

// ---------- Mehr / Benutzer / Einstellungen ----------
function viewMore(open) {
  render(`<h1>${esc(t('nav_more'))}</h1><div class="list">
    ${S.me.role !== 'driver' ? `<a class="row" href="#/vehicles"><span>${ICON.truck}</span><span class="title">${esc(t('vehicles'))}</span><span></span></a>` : ''}
    <a class="row" href="#/check"><span>✓</span><span class="title">${esc(t('departure_check'))}</span><span></span></a>
    <a class="row" href="#/inbox"><span>${ICON.bell}</span><span class="title">${esc(t('notifications'))}</span><span></span></a>
    <a class="row" href="#/help"><span>?</span><span class="title">${esc(t('help'))}</span><span></span></a>
    <a class="row" href="#/emergency"><span>☎</span><span class="title">${esc(t('em_title'))}</span><span></span></a>
    ${isMgr() || S.me.role === 'dispatch' ? `<a class="row" href="#/guide"><span>▤</span><span class="title">${esc(t('guide'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/drivers"><span>🪪</span><span class="title">${esc(t('drivers'))}</span><span></span></a>` : S.me.role === 'driver' ? `<a class="row" href="#/drivers"><span>🪪</span><span class="title">${esc(t('my_driver_file'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/contracts"><span>📄</span><span class="title">${esc(t('ct_title'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/claims"><span>🛡️</span><span class="title">${esc(t('claims'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/tacho"><span>⏏</span><span class="title">${esc(t('tacho'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'viewer'].includes(S.me.role) ? `<a class="row" href="#/fines"><span>§</span><span class="title">${esc(t('fines'))}</span><span></span></a>` : S.me.role === 'driver' ? `<a class="row" href="#/fines"><span>§</span><span class="title">${esc(t('my_fines'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'workshop', 'viewer'].includes(S.me.role) ? `<a class="row" href="#/tires"><span>◎</span><span class="title">${esc(t('fleet_tires'))}</span><span></span></a>` : ''}
    ${S.me.role !== 'driver' ? `<a class="row" href="#/maintenance"><span>📅</span><span class="title">${esc(t('inspections_due'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'viewer', 'workshop', 'dispatch'].includes(S.me.role) ? `<a class="row" href="#/plan"><span>🗓</span><span class="title">${esc(t('wplan'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'viewer', 'workshop'].includes(S.me.role) ? `<a class="row" href="#/wsload"><span>⚒</span><span class="title">${esc(t('ws_load'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/defects"><span>⚠</span><span class="title">${esc(t('defect_stats'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'viewer'].includes(S.me.role) ? `<a class="row" href="#/kpi"><span>⏱</span><span class="title">${esc(t('kpi'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'viewer'].includes(S.me.role) ? `<a class="row" href="#/costs"><span>€</span><span class="title">${esc(t('costs_report'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'workshop'].includes(S.me.role) ? `<a class="row" href="#/stock"><span>▦</span><span class="title">${esc(t('stock'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/users"><span>👤</span><span class="title">${esc(t('users'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/telematics"><span>⌖</span><span class="title">${esc(t('telematics'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/quality"><span>✓</span><span class="title">${esc(t('dq'))}</span><span></span></a>` : ''}
    ${S.me.role === 'owner' ? `<a class="row" href="#/usage"><span>📊</span><span class="title">${esc(t('usage'))}</span><span></span></a>` : ''}
    ${S.me.role === 'owner' ? `<a class="row" href="#/audit"><span>🔒</span><span class="title">${esc(t('audit'))}</span><span></span></a>` : ''}
    ${S.me.role === 'owner' ? `<a class="row" href="#/settings"><span>⚙</span><span class="title">${esc(t('settings'))}</span><span></span></a>` : ''}
  </div>
  <h2>${esc(t('nav_profile'))}</h2><section class="panel"><p><b>${esc(S.me.display_name)}</b> · ${esc(S.me.username)} · ${esc(t('role_' + S.me.role))}${S.me.environment === 'test' ? ' · <span class="chip test">TEST</span>' : ''}</p>${langSelect()}
  ${S.me.role !== 'driver' ? `<div id="hsbox"><label for="homesite">${esc(t('home_site'))}</label><select id="homesite"><option value="">${esc(t('filter_all'))}</option>${S.me.home_site ? `<option selected>${esc(S.me.home_site)}</option>` : ''}</select><p class="small muted">${esc(t('home_site_hint'))}</p></div>` : ''}
  <details><summary>${esc(t('change_password'))}</summary><form id="pw"><label>${esc(t('old_password'))}</label><input type="password" name="old_password" required autocomplete="current-password"><label>${esc(t('new_password'))}<span class="hint">${esc(t('pw_rule'))}</span></label><input type="password" name="new_password" required minlength="10" autocomplete="new-password"><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>
  <details id="tfa"><summary>${esc(t('tf_title'))}${S.me.totp_enabled ? ` <span class="chip ok">${esc(t('tf_chip'))}</span>` : ''}</summary><div id="tfabox"><p class="muted">${esc(t('loading'))}</p></div></details>
  <details id="sess"><summary>${esc(t('my_sessions'))}</summary><p class="small muted">${esc(t('new_login_hint'))}</p><div id="sesslist" class="list"><p class="muted">${esc(t('loading'))}</p></div><h3>${esc(t('kd_title'))}</h3><p class="small muted">${esc(t('kd_hint'))}</p><div id="kdlist" class="list"></div></details>
  <div class="actions"><button class="btn secondary" id="lo">${esc(t('logout'))}</button></div></section>`, 'more');
  bindLang(true);
  const hs = $('#homesite');
  if (hs) {
    api('GET', '/api/sites').then((r) => {
      const cur = S.me.home_site || '';
      hs.innerHTML = `<option value="">${esc(t('filter_all'))}</option>` + [...new Set([...r.sites, ...(cur ? [cur] : [])])].map((x) => `<option value="${esc(x)}"${x === cur ? ' selected' : ''}>${esc(x === 'ohne' ? t('cs_nosite') : x)}</option>`).join('');
    }).catch(() => {});
    hs.onchange = async () => {
      try {
        await api('PATCH', '/api/me', { home_site: hs.value });
        S.me.home_site = hs.value || null;
        // neue Voreinstellung gilt sofort für alle Standortfilter dieser Sitzung
        for (const k of ['costSite', 'defSite', 'fineSite', 'maintSite', 'tireSite', 'vehSite', 'caseVsite', 'kpiVsite', 'planVsite', 'dqSite']) delete S[k];
        toast('✓');
      } catch (err) { toast(err.message, true); }
    };
  }
  const sess = $('#sess');
  const loadSessions = async () => {
    const box = $('#sesslist'); if (!box) return;
    const list = (await api('GET', '/api/me/sessions')).sessions;
    box.innerHTML = list.map((x) => `<div class="row"><span>${x.current ? '●' : '○'}</span><span class="title">${esc(x.device === 'Unbekanntes Gerät' ? t('unknown_device_l') : x.device)}${x.current ? ` <span class="chip ok">${esc(t('this_device'))}</span>` : ''}</span>${x.current ? '<span></span>' : `<button type="button" class="btn secondary" data-sid="${esc(x.id)}">${esc(t('sign_out_device'))}</button>`}<span class="sub" style="white-space:normal">${esc(t('last_active'))}: ${fmtDT(x.last_seen)} · ${esc(t('signed_in_at'))}: ${fmtDT(x.created_at)}</span></div>`).join('')
      + (list.length > 1 ? `<div class="actions"><button type="button" class="btn secondary" id="sessall">${esc(t('sign_out_others'))}</button></div>` : '');
    $$('[data-sid]', box).forEach((b) => (b.onclick = async () => { try { await api('DELETE', `/api/me/sessions/${b.dataset.sid}`); toast('✓'); await loadSessions(); } catch (err) { toast(err.message, true); } }));
    const all = $('#sessall', box); if (all) all.onclick = async () => { try { const r = await api('POST', '/api/me/sessions/revoke-others'); toast(`✓ ${r.revoked}`); await loadSessions(); } catch (err) { toast(err.message, true); } };
    await loadKnown();
  };
  // Bekannte Geräte: „dieses Gerät“ über die Gerätekennung (Header, wird serverseitig nur gehasht verglichen); dieses Gerät kann nicht vergessen werden
  const loadKnown = async () => {
    const box = $('#kdlist'); if (!box) return;
    const list = (await api('GET', '/api/me/known-devices', undefined, { headers: { 'x-cfp-device': deviceId() } })).devices;
    const dev = (x) => (x.device === 'Unbekanntes Gerät' ? t('unknown_device_l') : x.device);
    box.innerHTML = list.length ? list.map((x) => `<div class="row"><span>${x.current ? '●' : '○'}</span><span class="title">${esc(dev(x))}${x.current ? ` <span class="chip ok">${esc(t('this_device'))}</span>` : ''}</span>${x.current ? '<span></span>' : `<button type="button" class="btn secondary" data-kd="${esc(x.id)}" data-dev="${esc(dev(x))}">${esc(t('kd_forget'))}</button>`}<span class="sub" style="white-space:normal">${esc(t('kd_last'))}: ${fmtDT(x.last_seen)} · ${esc(t('kd_first'))}: ${fmtDT(x.first_seen)}</span></div>`).join('')
      : `<p class="muted">${esc(t('kd_none'))}</p>`;
    $$('[data-kd]', box).forEach((b) => (b.onclick = async () => { if (!confirm(t('kd_forget_confirm').replace('{d}', b.dataset.dev))) return; try { await api('DELETE', `/api/me/known-devices/${b.dataset.kd}`, undefined, { headers: { 'x-cfp-device': deviceId() } }); toast('✓'); await loadKnown(); } catch (err) { toast(err.message, true); } }));
  };
  sess.ontoggle = () => { if (sess.open) loadSessions().catch((err) => toast(err.message, true)); };
  // Sprung aus dem Hinweis „Neue Anmeldung auf einem anderen Gerät“: Geräteliste gleich öffnen
  if (open === 'sess') { sess.open = true; sess.scrollIntoView({ block: 'start' }); }
  const tfa = $('#tfa');
  tfa.ontoggle = () => { if (tfa.open) loadTotp().catch((err) => toast(err.message, true)); };
  // Abmelden ohne Netz: Meldung statt stillem Abbruch (Sitzung bliebe sonst unbemerkt bestehen – geteilte Tablets); bereits abgelaufen (401): trotzdem aufräumen
  $('#lo').onclick = async () => { try { await api('POST', '/api/logout'); } catch (err) { if (err.status !== 401) { toast(err.message, true); return; } } clearOfflineData(); resetUserState(); location.hash = '#/login'; };
  $('#pw').onsubmit = async (e) => { e.preventDefault(); try { await api('POST', '/api/me/password', Object.fromEntries(new FormData(e.target))); toast('✓'); } catch (err) { toast(err.message, true); } };
}

// Mein Konto → Zwei-Faktor-Anmeldung: Status, Einrichten (QR + Schlüssel), Ersatzcodes einmalig, neue Ersatzcodes, Ausschalten
const rcBlock = (codes, extra = '') => `<div class="panel good" id="rcbox"><h3>${esc(t('tf_rc_title'))}</h3><p class="small">${esc(t('tf_rc_hint'))}${extra ? ' ' + esc(extra) : ''}</p>
  <ul class="rclist" style="font-family:monospace;font-size:1.1em;columns:2;list-style:none;padding:0">${codes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  <div class="actions noprint"><button type="button" class="btn secondary" id="rccp">${esc(t('copy'))}</button></div></div>`;
function wireRc(codes) {
  const cp = $('#rccp'); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(codes.join('\n')); toast(t('copied')); } catch { toast(codes.join(' ')); } };
}
async function loadTotp() {
  const box = $('#tfabox'); if (!box) return;
  const st = await api('GET', '/api/me/totp');
  S.me.totp_enabled = st.enabled;
  if (!box.isConnected) return; // Ansicht inzwischen gewechselt
  if (!st.enabled) {
    box.innerHTML = `<p class="small">${esc(t('tf_intro'))}</p><p><span class="chip">${esc(t('tf_off'))}</span></p>
      <form id="tfs"><label for="tfpw">${esc(t('tf_pw'))}</label><input id="tfpw" type="password" autocomplete="current-password" required><div class="actions"><button class="btn secondary">${esc(t('tf_start'))}</button></div></form><div id="tfstep"></div>`;
    $('#tfs').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const r = await api('POST', '/api/me/totp/setup', { password: $('#tfpw').value });
        $('#tfpw').value = ''; $('#tfs').hidden = true;
        const key = r.secret.replace(/(.{4})/g, '$1 ').trim();
        $('#tfstep').innerHTML = `<p class="small">${esc(t('tf_scan'))}</p><div class="qr">${(() => { try { return qrSvg(r.uri, { label: t('tf_title') }); } catch { return ''; } })()}</div>
          <p class="small">${esc(t('tf_key'))}: <code style="word-break:break-all">${esc(key)}</code></p>
          <form id="tfe"><label for="tfc">${esc(t('tf_code'))}</label><input id="tfc" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required><div class="actions"><button class="btn">${esc(t('tf_enable'))}</button><button type="button" class="btn secondary" id="tfx">${esc(t('tf_cancel'))}</button></div></form>`;
        $('#tfx').onclick = () => loadTotp();
        $('#tfe').onsubmit = async (ev) => {
          ev.preventDefault();
          try {
            const x = await api('POST', '/api/me/totp/enable', { code: $('#tfc').value.trim() });
            S.me.totp_enabled = true;
            box.innerHTML = rcBlock(x.recovery_codes, t('tf_others_ended')) + `<div class="actions"><button type="button" class="btn" id="tfdone">OK</button></div>`;
            wireRc(x.recovery_codes);
            $('#tfdone').onclick = () => loadTotp();
          } catch (err) { toast(err.message, true); }
        };
      } catch (err) { toast(err.message, true); }
    };
    return;
  }
  box.innerHTML = `<p><span class="chip ok">${esc(t('tf_on').replace('{d}', fmtDT(st.enabled_at)))}</span> <span class="small ${st.recovery_left <= 2 ? '' : 'muted'}">${esc(t('tf_rc_left').replace('{n}', st.recovery_left))}</span></p>
    <details><summary>${esc(t('tf_rc_new'))}</summary><form id="tfr"><p class="small muted">${esc(t('tf_rc_new_hint'))}</p><label for="tfrc">${esc(t('tf_code'))}</label><input id="tfrc" inputmode="numeric" autocomplete="one-time-code" maxlength="7" required><div class="actions"><button class="btn secondary">${esc(t('tf_rc_new'))}</button></div></form></details>
    <details><summary>${esc(t('tf_disable'))}</summary><form id="tfd"><label for="tfdpw">${esc(t('tf_pw'))}</label><input id="tfdpw" type="password" autocomplete="current-password" required><label for="tfdc">${esc(t('tf_code_or_rc'))}</label><input id="tfdc" autocomplete="one-time-code" autocapitalize="none" maxlength="14" required><div class="actions"><button class="btn danger">${esc(t('tf_disable'))}</button></div></form></details>
    <div id="tfout"></div>`;
  $('#tfr').onsubmit = async (e) => {
    e.preventDefault();
    try { const x = await api('POST', '/api/me/totp/recovery-codes', { code: $('#tfrc').value.trim() }); $('#tfout').innerHTML = rcBlock(x.recovery_codes); wireRc(x.recovery_codes); $('#tfrc').value = ''; }
    catch (err) { toast(err.message, true); }
  };
  $('#tfd').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('POST', '/api/me/totp/disable', { password: $('#tfdpw').value, code: $('#tfdc').value.trim() }); S.me.totp_enabled = false; toast('✓'); loadTotp(); }
    catch (err) { toast(err.message, true); }
  };
}

const USER_SORTS = ['role', 'name', 'login_oldest'];
const USER_ROLES = ['owner', 'fleet', 'workshop', 'dispatch', 'driver', 'viewer'];
const USER_FILTERS = ['all', 'active', 'inactive', 'invite', 'locked', 'unused', ...USER_ROLES.map((r) => 'r_' + r)];
async function viewUsers() {
  const ures = await api('GET', '/api/users');
  const all = ures.users;
  // Einstellung „lange nicht angemeldet“ (Tage, leer = aus): nur dann Hinweis, Kennzeichnung und Auswahl „unused“
  const ud = ures.unused_days > 0 ? ures.unused_days : null;
  // Sortierung und Auswahl nur in der Ansicht (Server liefert Umgebung → Rolle → Name), siehe sortUsers()/filterUsers() in csv.js
  const uso = S.userSort || (S.userSort = sortPref('users', USER_SORTS, 'role'));
  let ufi = S.userFilter || (S.userFilter = sortPref('users_filter', USER_FILTERS, 'all'));
  if (ufi === 'unused' && !ud) ufi = 'all'; // Einstellung inzwischen aus
  const us = sortUsers(filterUsers(all, ufi, ud), uso);
  const roles = S.me.role === 'owner' ? USER_ROLES : ['driver', 'workshop', 'viewer'];
  // Bearbeiten (Name, Rolle, Werkstatt, Umgebung): Inhaber alle anderen Konten; Fuhrparkleitung nur Fahrer/Werkstatt/Leser der eigenen Umgebung (wie Server)
  const mayEdit = (u) => u.id !== S.me.id && (S.me.role === 'owner' || (roles.includes(u.role) && u.environment === S.me.environment));
  const ufLabel = (k) => (k.startsWith('r_') ? t('role_' + k.slice(2)) : t('ufilter_' + k).replace('{d}', ud));
  // Hinweise immer über alle Konten (unabhängig von der Auswahl)
  // Hinweis (nur Anzeige, keine Pflicht): aktive Verwaltungskonten im Betrieb ohne Zwei-Faktor-Anmeldung
  const no2fa = all.filter((u) => u.active && u.has_password && u.environment === 'production' && ['owner', 'fleet'].includes(u.role) && !u.has_totp);
  // Hinweis (nur Anzeige): aktive Betriebskonten ohne angemeldetes Push-Gerät – dringende Hinweise (z. B. Fahrzeugsperre) nur in der App
  const noPush = all.filter((u) => u.active && u.has_password && u.environment === 'production' && u.role !== 'viewer' && !u.push_devices);
  // Hinweis (nur Anzeige, nichts wird automatisch deaktiviert): aktive Konten ohne Anmeldung seit über ud Tagen
  const unused = ud ? all.filter((u) => isUnusedUser(u, ud)) : [];
  render(`<h1>${esc(t('users'))}</h1>${helpLink('access')}${no2fa.length ? `<div class="panel warn small" role="note">${esc(t('tf_admin_hint').replace('{n}', no2fa.length))} <a href="#/help?s=login2fa">${esc(t('help_login2fa_t'))} ›</a></div>` : ''}${noPush.length ? `<div class="panel warn small" role="note" id="nopush">${esc(t('push_admin_hint').replace('{n}', noPush.length))} <a href="#/help?s=push">${esc(t('help_push_t'))} ›</a></div>` : ''}${unused.length ? `<div class="panel warn small" role="note" id="unusedhint">${esc(t('unused_admin_hint').replace('{n}', unused.length).replace('{d}', ud))}${ufi !== 'unused' ? `<div class="actions"><button type="button" class="btn secondary" id="ushowunused">${esc(t('unused_show'))}</button></div>` : ''}</div>` : ''}<div id="inv"></div>
    <details class="panel"><summary>${esc(t('new_user'))}</summary><form id="nf">
      <label>${esc(t('display_name'))}</label><input name="display_name" required><label>${esc(t('username'))}</label><input name="username" required autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="m.mustermann">
      <label>${esc(t('role'))}</label><select name="role" id="rs">${roles.map((r) => `<option value="${r}">${esc(t('role_' + r))}</option>`).join('')}</select>
      <div id="wsrow" hidden><label>${esc(t('workshop'))}</label><select name="workshop_site">${S.meta.workshops.map((w) => `<option value="${esc(w.code)}">${esc(w.name)}</option>`).join('')}</select></div>
      ${S.me.role === 'owner' ? `<label>${esc(t('environment'))}</label><select name="environment"><option value="test">${esc(t('env_testname'))}</option><option value="production">${esc(t('env_prod'))}</option></select>` : ''}
      <div class="actions"><button class="btn">${esc(t('new_user'))}</button></div></form></details>
    <div class="actions" style="flex-wrap:wrap"><select id="usort" aria-label="${esc(t('sort_by'))}" style="flex:1 1 100%;max-width:420px">${USER_SORTS.map((k) => `<option value="${k}"${uso === k ? ' selected' : ''}>${esc(t('sort_by'))}: ${esc(t('usort_' + k))}</option>`).join('')}</select><select id="ufilt" aria-label="${esc(t('ufilter'))}" style="flex:1 1 100%;max-width:420px"><optgroup label="${esc(t('status'))}">${USER_FILTERS.filter((k) => !k.startsWith('r_') && (k !== 'unused' || ud)).map((k) => `<option value="${k}"${ufi === k ? ' selected' : ''}>${esc(t('ufilter'))}: ${esc(ufLabel(k))}</option>`).join('')}</optgroup><optgroup label="${esc(t('role'))}">${USER_FILTERS.filter((k) => k.startsWith('r_') && (S.me.role === 'owner' || roles.includes(k.slice(2)) || all.some((u) => u.role === k.slice(2)))).map((k) => `<option value="${k}"${ufi === k ? ' selected' : ''}>${esc(t('ufilter'))}: ${esc(ufLabel(k))}</option>`).join('')}</optgroup></select><button type="button" class="btn secondary" id="ucsv" title="${esc(t('uc_hint'))}">${esc(t('uc_btn'))}</button><button type="button" class="btn secondary" id="uprt" title="${esc(t('uc_hint'))}">${esc(t('print'))}</button></div>
    ${ufi !== 'all' ? `<p class="small muted noprint" id="ufcount">${esc(t('ufilter_shown').replace('{n}', us.length).replace('{m}', all.length))}</p>` : ''}
    ${printHead([t('uc_print'), ufi !== 'all' ? `${t('ufilter')}: ${ufLabel(ufi)}` : '', `${t('sort_by')}: ${t('usort_' + uso)}`, t('print_count').replace('{n}', us.length)])}
    <div class="scroll"><table class="stack printsm"><thead><tr><th>${esc(t('display_name'))}</th><th>${esc(t('role'))}</th><th>${esc(t('environment'))}</th><th class="noprint"></th></tr></thead><tbody>
    ${us.map((u) => `<tr><td>${esc(u.display_name)}<div class="small muted">${esc(u.username)}${u.has_password ? '' : ' · ' + esc(t('dq_invite_pending'))}</div>${!u.has_password && u.invite_expires_at ? (inviteExpired(u) ? `<span class="chip mittel" title="${esc(t('inv_expired_hint'))}">${esc(t('inv_expired'))}</span> ` : `<div class="small muted">${esc(t('inv_valid_until'))} ${fmtDT(u.invite_expires_at)}</div>`) : ''}${u.has_password && !u.active ? `<span class="chip">${esc(t('inactive'))}</span> ` : ''}${u.locked_until ? `<span class="chip kritisch">${esc(t('locked_until'))} ${fmtDT(u.locked_until)}</span>` : ''}${ud && isUnusedUser(u, ud) ? ` <span class="chip mittel">${esc(t('unused_chip').replace('{d}', ud))}</span>` : ''}${u.has_totp ? ` <span class="chip ok" title="${esc(t('tf_title'))}">${esc(t('tf_chip'))}</span>` : ''}${u.sessions ? `<div class="small muted">${esc(t('active_sessions').replace('{n}', u.sessions))} · ${fmtDT(u.last_seen)}</div>` : ''}${u.active && u.has_password && u.role !== 'viewer' ? (u.push_devices ? `<div class="small muted">${esc(t('push_dev_n').replace('{n}', u.push_devices))}</div>` : ` <span class="chip mittel">${esc(t('push_dev_none'))}</span>`) : ''}${u.known_devices ? `<div class="small muted">${esc(t('kd_n').replace('{n}', u.known_devices))}</div>` : ''}${u.has_password ? `<div class="small muted">${u.last_login ? `${esc(t('last_login'))}: ${fmtDT(u.last_login)}` : esc(t('last_login_none'))}</div>` : ''}</td><td>${esc(t('role_' + u.role))}${u.workshop_site ? ' · ' + esc(wsName(u.workshop_site)) : ''}</td><td>${u.environment === 'test' ? '<span class="chip test">TEST</span>' : esc(t('env_prod'))}</td><td class="noprint">${u.id !== S.me.id ? `${u.locked_until ? `<button class="btn secondary" data-unlock="${esc(u.id)}">${esc(t('unlock'))}</button> ` : ''}${u.sessions ? `<button class="btn secondary" data-revoke="${esc(u.id)}" data-name="${esc(u.display_name)}">${esc(t('revoke_sessions'))}</button> ` : ''}<button class="btn secondary" data-inv="${esc(u.id)}" data-name="${esc(u.display_name)}"${u.has_password ? ' data-haspw="1"' : ''}>${esc(t('new_invite'))}</button> <button class="btn secondary" data-act="${esc(u.id)}" data-on="${u.active ? 0 : 1}" data-name="${esc(u.display_name)}">${esc(u.active ? t('deactivate') : t('activate'))}</button>${mayEdit(u) ? ` <button class="btn secondary" data-ue="${esc(u.id)}">${esc(t('ue_edit'))}</button>` : ''}` : ''}${S.me.role === 'owner' && u.has_totp && u.id !== S.me.id ? ` <button class="btn secondary" data-tfr="${esc(u.id)}" data-name="${esc(u.display_name)}">${esc(t('tf_reset'))}</button>` : ''}${S.me.role === 'owner' ? ` <a class="btn secondary" href="#/audit?u=${esc(u.id)}" title="${esc(t('audit_person_hint'))}">${esc(t('audit'))}</a>` : ''}${S.me.role === 'owner' ? ` <button class="btn secondary" data-dex="${esc(u.id)}" data-user="${esc(u.username)}" title="${esc(t('data_export_hint'))}">${esc(t('data_export'))}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`, 'more');
  if ($('#ushowunused')) $('#ushowunused').onclick = () => { S.userFilter = sortPref('users_filter', USER_FILTERS, 'all', 'unused'); viewUsers(); };
  $('#ufilt').onchange = () => { const v = $('#ufilt').value; S.userFilter = sortPref('users_filter', USER_FILTERS, 'all', USER_FILTERS.includes(v) ? v : 'all'); viewUsers(); };
  $('#usort').onchange = () => { const v = $('#usort').value; S.userSort = sortPref('users', USER_SORTS, 'role', USER_SORTS.includes(v) ? v : 'role'); viewUsers(); };
  $('#uprt').onclick = () => window.print();
  $('#ucsv').onclick = () => download(new Blob([usersCsv(us, t, wsName, fmtDT)], { type: 'text/csv;charset=utf-8' }), `fuhrpark-benutzer_${bDate()}.csv`);
  $$('[data-revoke]').forEach((b) => (b.onclick = async () => { if (!confirm(t('revoke_sessions_confirm').replace('{name}', b.dataset.name))) return; try { const r = await api('POST', `/api/users/${b.dataset.revoke}/revoke-sessions`); toast(t('revoked_n').replace('{n}', r.sessions).replace('{p}', r.push_devices)); viewUsers(); } catch (err) { toast(err.message, true); } }));
  $$('[data-dex]').forEach((b) => (b.onclick = async () => { if (!confirm(t('data_export_hint'))) return; try { const x = await api('GET', `/api/admin/users/${b.dataset.dex}/data-export`); download(x instanceof Blob ? x : new Blob([JSON.stringify(x, null, 1)], { type: 'application/json' }), `datenauskunft_${b.dataset.user}_${bDate()}.json`); } catch (err) { toast(err.message, true); } }));
  $$('[data-tfr]').forEach((b) => (b.onclick = async () => { if (!confirm(t('tf_reset_confirm').replace('{name}', b.dataset.name))) return; try { await api('POST', `/api/users/${b.dataset.tfr}/totp-reset`); toast('✓'); viewUsers(); } catch (err) { toast(err.message, true); } }));
  $$('[data-unlock]').forEach((b) => (b.onclick = async () => { try { await api('POST', `/api/users/${b.dataset.unlock}/unlock`); toast('✓'); viewUsers(); } catch (err) { toast(err.message, true); } }));
  const showInvite = (token) => { const link = `${location.origin}/#/invite/${token}`; $('#inv').innerHTML = `<div class="panel good"><p>${esc(t('invite_link'))}</p><input readonly value="${esc(link)}" id="il"><div class="actions"><button class="btn" id="cp">${esc(t('copy'))}</button></div><p class="small muted">${esc(t('invite_qr_hint'))}</p><div class="qr">${(() => { try { return qrSvg(link, { label: t('invite_link') }); } catch { return ''; } })()}</div></div>`; $('#cp').onclick = async () => { try { await navigator.clipboard.writeText(link); toast(t('copied')); } catch { $('#il').select(); } }; window.scrollTo(0, 0); };
  $('#rs').onchange = () => ($('#wsrow').hidden = $('#rs').value !== 'workshop');
  $('#nf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); if (b.role !== 'workshop') delete b.workshop_site; b.username = b.username.toLowerCase(); try { const r = await api('POST', '/api/users', b); await viewUsers(); showInvite(r.invite_token); } catch (err) { toast(err.message, true); } };
  // Konto mit Passwort: Rückfrage (frühere Links werden ungültig; Einlösen setzt ein neues Passwort und beendet alle Anmeldungen)
  $$('[data-inv]').forEach((b) => (b.onclick = async () => { if (b.dataset.haspw && !confirm(t('reinvite_confirm').replace('{name}', b.dataset.name))) return; try { const r = await api('POST', `/api/users/${b.dataset.inv}/invite`); showInvite(r.invite_token); } catch (err) { toast(err.message, true); } }));
  $$('[data-ue]').forEach((b) => (b.onclick = () => {
    const u = all.find((x) => x.id === b.dataset.ue); if (!u) return;
    $('#inv').innerHTML = `<form class="panel" id="uef" style="scroll-margin-top:84px"><h2 style="margin-top:0">${esc(t('ue_title').replace('{name}', u.display_name))}</h2>
      <label for="uen">${esc(t('display_name'))}</label><input id="uen" name="display_name" required maxlength="120" value="${esc(u.display_name)}">
      <label for="uer">${esc(t('role'))}</label><select id="uer" name="role">${roles.map((r) => `<option value="${r}"${u.role === r ? ' selected' : ''}>${esc(t('role_' + r))}</option>`).join('')}</select>
      <div id="uewsrow"${u.role === 'workshop' ? '' : ' hidden'}><label for="uews">${esc(t('workshop'))}</label><select id="uews" name="workshop_site">${S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${u.workshop_site === w.code ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}</select></div>
      ${S.me.role === 'owner' ? `<label for="uee">${esc(t('environment'))}</label><select id="uee" name="environment"><option value="test"${u.environment === 'test' ? ' selected' : ''}>${esc(t('env_testname'))}</option><option value="production"${u.environment === 'production' ? ' selected' : ''}>${esc(t('env_prod'))}</option></select>` : ''}
      <div class="actions"><button class="btn">${esc(t('save'))}</button><button type="button" class="btn secondary" id="uex">${esc(t('cancel'))}</button></div></form>`;
    $('#uer').onchange = () => ($('#uewsrow').hidden = $('#uer').value !== 'workshop');
    $('#uex').onclick = () => ($('#inv').innerHTML = '');
    $('#uef').onsubmit = async (e) => {
      e.preventDefault();
      const body = { display_name: $('#uen').value.trim(), role: $('#uer').value };
      if (body.role === 'workshop') body.workshop_site = $('#uews').value;
      if ($('#uee')) body.environment = $('#uee').value;
      const roleEnvChange = body.role !== u.role || (body.environment && body.environment !== u.environment);
      if (!roleEnvChange && body.display_name === u.display_name && (body.role !== 'workshop' || body.workshop_site === u.workshop_site)) { toast(t('ue_none')); return; }
      if (roleEnvChange && !confirm(t('ue_confirm').replace('{name}', u.display_name))) return;
      try { const r = await api('PATCH', `/api/users/${u.id}`, body); toast(r.sessions_ended && roleEnvChange ? t('ue_saved_ended') : '✓'); viewUsers(); } catch (err) { toast(err.message, true); }
    };
    $('#uen').focus({ preventScroll: true }); $('#uef').scrollIntoView({ block: 'start' });
  }));
  // Deaktivieren beendet sofort alle Anmeldungen (z. B. am geteilten Tablet) – deshalb nachfragen; Aktivieren ohne Rückfrage
  $$('[data-act]').forEach((b) => (b.onclick = async () => { if (b.dataset.on !== '1' && !confirm(t('deactivate_confirm').replace('{name}', b.dataset.name))) return; try { await api('PATCH', `/api/users/${b.dataset.act}`, { active: b.dataset.on === '1' }); viewUsers(); } catch (err) { toast(err.message, true); } }));
}

async function viewSettings() {
  const s = await api('GET', '/api/settings');
  const v = s.values;
  const field = (k, label) => `<label for="${k}">${esc(label)}</label><input id="${k}" name="${k}" inputmode="decimal" value="${esc(v[k] ?? '')}">`;
  const slaRows = ['test', 'production'].map((e) => `<h3>${esc(e === 'test' ? t('env_testname') : t('env_prod'))}</h3><div class="scroll"><table><tr><th></th>${['niedrig', 'mittel', 'kritisch'].map((p) => `<th>${esc(t('prio_' + p))}</th>`).join('')}</tr>${['triage', 'ack'].map((k) => `<tr><td>${esc(k === 'triage' ? t('act_receive') : t('act_acknowledge'))}</td>${['niedrig', 'mittel', 'kritisch'].map((p) => `<td><input name="sla_${e}_${k}_${p}_min" inputmode="numeric" value="${esc(v[`sla_${e}_${k}_${p}_min`] ?? '')}" aria-label="${esc((e === 'test' ? t('env_testname') : t('env_prod')) + ' · ' + (k === 'triage' ? t('act_receive') : t('act_acknowledge')) + ' · ' + t('prio_' + p) + ' (min)')}"></td>`).join('')}</tr>`).join('')}</table></div>`).join('');
  render(`<h1>${esc(t('settings'))}</h1><form id="sf" class="panel"><label class="check"><input type="checkbox" id="tmr"${v.test_master_readonly === '1' ? ' checked' : ''}> ${esc(t('test_master_readonly'))}</label><p class="small muted">${esc(t('test_master_readonly_hint'))}</p>${field('idle_logout_workshop_min', t('idle_ws'))}${field('idle_logout_other_min', t('idle_other'))}<p class="small muted">${esc(t('idle_hint'))}</p>${field('workshop_hourly_rate_net', t('hourly_rate'))}${field('maintenance_warn_days', t('warn_days'))}${field('maintenance_warn_km', t('warn_km'))}${field('tire_warn_tread_mm', t('tire_warn'))}${field('tire_warn_age_years', t('tire_warn_age'))}<p class="small muted">${esc(t('tire_age_hint'))}</p>${field('fine_warn_days', t('response_due') + ' – ' + t('warn_days'))}${field('driver_doc_warn_days', t('driver_doc_warn'))}${field('license_check_months', t('license_check_months'))}${field('tacho_warn_days', t('tacho_warn'))}${field('contract_warn_days', t('ct_warn'))}${field('claim_followup_days', t('claim_followup'))}${field('case_stale_days', t('case_stale_setting'))}${field('user_unused_days', t('unused_setting'))}<p class="small muted">${esc(t('unused_setting_hint'))}</p>${field('repair_cost_limit_net', t('cost_limit_setting'))}<p class="small muted">${esc(t('cost_limit_setting_hint'))}</p><h2>${esc(t('sla'))}</h2>${slaRows}<div class="actions"><button class="btn">${esc(t('save'))}</button></div></form>
    <section class="panel"><h2 style="margin-top:0">${esc(t('import_csv'))}</h2><p class="small muted">Kennzeichen;Standort;Status;Hersteller;Baujahr;FIN;Anhänger · ${esc(t('import_trailer_hint'))}</p><input type="file" id="csv" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('import_csv'))}"><div id="csvr"></div></section>
    <section class="panel"><h2 style="margin-top:0">${esc(t('import_tires'))}</h2><p class="small muted">Quelle;Kennzeichen;FIN;Reifen Lenkachse;Reifen Liftachse;Reifen Antriebsachse;Reifen Anhänger</p><input type="file" id="tcsv" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('import_tires'))}"><div id="tcsvr"></div></section>
    <section class="panel"><h2 style="margin-top:0">${esc(t('backup'))}</h2><p class="small muted">${esc(t('backup_hint'))}</p><button type="button" class="btn secondary" id="bkp">${esc(t('backup_download'))}</button></section>`, 'more');
  $('#bkp').onclick = async () => { try { const blob = await api('GET', '/api/admin/backup'); const b = blob instanceof Blob ? blob : new Blob([JSON.stringify(blob)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `fuhrpark-sicherung_${bDate()}.json`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } catch (err) { toast(err.message, true); } };
  $('#tcsv').onchange = async () => {
    const f = $('#tcsv').files[0]; if (!f) return;
    const text = await readCsvFile(f);
    try {
      const r = await api('POST', '/api/tires/import?dry_run=1', text, { headers: { 'content-type': 'text/csv' } });
      $('#tcsvr').innerHTML = `<p><b>${esc(t('preview'))}:</b> ${r.counts.neu} ${esc(t('imp_new'))} · ${r.counts.geaendert} ${esc(t('imp_changed'))} · ${r.counts.unveraendert} ${esc(t('imp_same'))} · ${r.kept_verified} ${esc(t('tires_kept_verified'))} · ${r.skipped_no_vehicle.length} ${esc(t('tires_no_vehicle'))}</p>${(r.skipped || []).length ? `<details open><summary>${esc(t('skipped'))} (${r.skipped.length})</summary><ul class="small">${r.skipped.slice(0, 300).map((x) => `<li>${esc(t('line'))} ${x.line}${x.plate ? ' · ' + esc(x.plate) : ''}: ${esc(reasonText(x.reason))}</li>`).join('')}</ul>${impMore(r.skipped.length, 300)}</details>` : ''}<div class="actions"><button type="button" class="btn" id="tgo"${r.counts.neu + r.counts.geaendert ? '' : ' disabled'}>${esc(t('apply_import'))}</button></div>`;
      $('#tgo').onclick = async () => { try { const g = await api('POST', '/api/tires/import', text, { headers: { 'content-type': 'text/csv' } }); $('#tcsvr').innerHTML = `<p>✓ ${g.imported}</p>`; } catch (err) { toast(err.message, true); } };
    } catch (err) { toast(err.message, true); }
  };
  $('#sf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k in b) b[k] = b[k] === '' ? null : b[k].replace(',', '.'); b.test_master_readonly = $('#tmr').checked ? '1' : null; try { await api('PUT', '/api/settings', b); toast('✓'); } catch (err) { toast(err.message, true); } };
  $('#csv').onchange = async () => {
    const f = $('#csv').files[0]; if (!f) return;
    const text = await readCsvFile(f);
    const skipped = (r) => (r.skipped.length ? `<p class="small">${r.skipped.length} ${esc(t('skipped'))}: ${esc(r.skipped.map((x) => `${t('line')} ${x.line} ${x.plate || ''} (${reasonText(x.reason)})`).join(', '))}</p>` : '');
    const FL = { plate: t('plate_label'), site: t('site'), manufacturer: t('manufacturer'), model: t('model_label'), build_year: t('year'), trailer_plate: t('trailer'), master_status: t('status_label'), kind: t('vehicle_kind') };
    try {
      const r = await api('POST', '/api/vehicles/import?dry_run=1', text, { headers: { 'content-type': 'text/csv' } });
      const changed = r.preview.filter((x) => x.action !== 'unverändert' || x.plate_conflict);
      const pc = r.preview.filter((x) => x.plate_conflict);
      const pcHtml = pc.length ? `<p class="small" role="note">⚠ ${esc(t('imp_plate_conflict').replace('{n}', pc.length))}: ${esc(pc.slice(0, 50).map((x) => `${t('line')} ${x.line} ${x.plate} (${t('vin')} ${x.plate_conflict.join(', ')})`).join(' · '))}${pc.length > 50 ? ' …' : ''}</p>` : '';
      $('#csvr').innerHTML = `<p><b>${esc(t('preview'))}:</b> ${r.counts.neu} ${esc(t('imp_new'))} · ${r.counts.geaendert} ${esc(t('imp_changed'))} · ${r.counts.unveraendert} ${esc(t('imp_same'))}</p>${skipped(r)}${pcHtml}
        ${changed.length ? `<div class="list">${changed.slice(0, 200).map((x) => `<div class="row ${x.action === 'neu' ? '' : 'p-mittel'}"><span class="chip">${esc(t('line'))} ${x.line}</span><span class="title">${esc(x.plate)}</span><span class="chip">${esc(x.action === 'neu' ? t('imp_new') : x.action === 'unverändert' ? t('imp_same') : t('imp_changed'))}</span>${(x.changes && x.changes.length) || x.plate_conflict ? `<span class="sub" style="white-space:normal">${[...(x.plate_conflict ? [`⚠ ${esc(t('dq_duplicate_plate'))}`] : []), ...(x.changes || []).map((c) => `${esc(FL[c.field] || c.field)}: ${esc(c.from ?? '–')} → ${esc(c.to)}`)].join(' · ')}</span>` : ''}</div>`).join('')}</div>${impMore(changed.length, 200)}` : ''}
        <p class="small muted">${esc(t('imp_keep_hint'))}</p><div class="actions"><button type="button" class="btn" id="csvgo"${r.preview.length ? '' : ' disabled'}>${esc(t('apply_import'))}</button></div>`;
      $('#csvgo').onclick = async () => { try { const g = await api('POST', '/api/vehicles/import', text, { headers: { 'content-type': 'text/csv' } }); $('#csvr').innerHTML = `<p>✓ ${g.imported}</p>${skipped(g)}`; S.vehCache = null; } catch (err) { toast(err.message, true); } };
    } catch (err) { toast(err.message, true); }
  };
}

// ---------- Aktualisierung: neue App-Fassung erkennen ----------
// Lange geöffnete Apps (Werkstatt-Tablet, Handy im Hintergrund) laden neue Fassungen sonst erst beim nächsten Neustart.
// Kein automatisches Neuladen – ein halb ausgefülltes Formular darf nicht verloren gehen; die Person entscheidet.
async function fetchVersion() {
  try { const r = await fetch('/version.json', { cache: 'no-store' }); if (!r.ok) return null; return (await r.json()).version || null; } catch { return null; }
}
async function checkVersion() {
  const v = await fetchVersion();
  if (!v) return;
  if (!S.appVersion) { S.appVersion = v; return; }
  if (v === S.appVersion || document.getElementById('upd')) return;
  const el = document.createElement('div');
  el.id = 'upd'; el.className = 'update-bar'; el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(t('update_available'))}</span><button type="button" class="btn">${esc(t('update_now'))}</button><button type="button" class="btn secondary" aria-label="${esc(t('later'))}">×</button>`;
  const [now, later] = el.querySelectorAll('button');
  now.onclick = () => location.reload();
  later.onclick = () => el.remove();
  document.body.appendChild(el);
}
checkVersion();
// Browser-Prüfhinweise (Pflichtfeld, Mindestlänge, Format, Bereich) in der App-Sprache statt in der Gerätesprache.
// Eigene Meldungen (setCustomValidity, z. B. „mehrdeutig“) bleiben unangetastet; nach der nächsten Eingabe wird neu geprüft.
function nativeValidityText(el) {
  const v = el.validity; if (!v || v.valid || v.customError) return '';
  const isDate = el.type === 'date' || el.type === 'month';
  const lim = (x) => (isDate && /^\d{4}-\d{2}-\d{2}$/.test(x) ? fmtD(x) : x);
  if (v.valueMissing) return t(el.type === 'checkbox' ? 'v_check' : el.type === 'file' ? 'v_file' : el.type === 'radio' || el.tagName === 'SELECT' ? 'v_choose' : 'v_required');
  if (v.tooShort) return t('v_too_short').replace('{n}', el.minLength).replace('{c}', el.value.length);
  if (v.tooLong) return t('v_too_long').replace('{n}', el.maxLength);
  if (v.badInput) return t('v_bad');
  if (v.typeMismatch) return t(el.type === 'email' ? 'v_type_email' : 'v_type');
  if (v.patternMismatch) return t('v_pattern');
  if (v.rangeUnderflow) return t(isDate ? 'v_min_date' : 'v_min').replace('{n}', () => lim(el.min));
  if (v.rangeOverflow) return t(isDate ? 'v_max_date' : 'v_max').replace('{n}', () => lim(el.max));
  if (v.stepMismatch) return t('v_step').replace('{n}', () => el.step);
  return '';
}
document.addEventListener('invalid', (e) => {
  const el = e.target; if (!el || typeof el.setCustomValidity !== 'function') return;
  const msg = nativeValidityText(el); if (!msg) return;
  el.setCustomValidity(msg); el.dataset.cfpNv = '1';
}, true);
// Jede Eingabe im selben Formular hebt alle so gesetzten Hinweise auf (Radiogruppen, per Skript ausgeblendete Pflichtfelder) – beim nächsten Absenden prüft der Browser neu
const clearNativeValidity = (e) => {
  const el = e.target; if (!el || !el.dataset) return;
  const scope = el.form || (el.closest && el.closest('form'));
  for (const x of scope ? scope.querySelectorAll('[data-cfp-nv]') : el.dataset.cfpNv ? [el] : []) { delete x.dataset.cfpNv; x.setCustomValidity(''); }
};
// Erfassungsphase: läuft vor den Feld-Prüfungen unten (sonst würde z. B. „mehrdeutig“ wieder gelöscht)
document.addEventListener('input', clearNativeValidity, true);
document.addEventListener('change', clearNativeValidity, true);
// Zahlenfelder (Preise, Mengen, Stunden): „2.000“ ist mehrdeutig (2 oder 2000?) – der Server weist es ab; hier schon am Feld in der App-Sprache melden
const AMBIG_NUM = /^-?[1-9]\d{0,2}(\.\d{3})+$/;
document.addEventListener('input', (e) => { const el = e.target; if (el instanceof HTMLInputElement && el.inputMode === 'decimal') el.setCustomValidity(AMBIG_NUM.test(el.value.trim()) ? t('num_ambiguous') : ''); });
document.addEventListener('change', (e) => { const el = e.target; if (el instanceof HTMLInputElement && el.inputMode === 'decimal' && AMBIG_NUM.test(el.value.trim())) el.reportValidity(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
setInterval(checkVersion, 30 * 60 * 1000);

// ---------- Start ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'navigate') location.hash = e.data.hash; if (e.data && e.data.type === 'push') refreshUnread(true).then(inboxPush); });
}
document.documentElement.lang = S.lang;
route();
