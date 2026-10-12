// [CLAUDE] Cevik Fuhrpark – Oberfläche (ohne Framework, mobil zuerst)
import { STRINGS, CHECK_LABELS } from './i18n.js';
import { svg as qrSvg } from './qr.js';
import { dataQualityCsv } from './csv.js';
import { helpMatches } from './help.js';

// Sprache: gespeicherte Wahl, sonst Gerätesprache (Ukrainisch/Englisch), sonst Deutsch
const deviceLang = () => { const l = (navigator.language || 'de').toLowerCase(); return l.startsWith('uk') ? 'uk' : l.startsWith('en') ? 'en' : 'de'; };
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
const MK_KEYS = { Tachograph: 'tacho', 'Ölwechsel': 'oil', Inspektion: 'service', Bremsen: 'brakes', Reifen: 'tires', 'Hydraulik/Aufbau': 'hydraulics', 'Feuerlöscher': 'extinguisher', Verbandkasten: 'firstaid', Ladungssicherung: 'loadsec', Sonstiges: 'other' };
const mk = (k) => (MK_KEYS[k] ? t('mk_' + MK_KEYS[k]) : k);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
const fmtDT = (iso) => (iso ? new Date(iso).toLocaleString(S.lang === 'uk' ? 'uk-UA' : S.lang === 'en' ? 'en-GB' : 'de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '–');
const fmtD = (iso) => (iso ? new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso).toLocaleDateString(S.lang === 'uk' ? 'uk-UA' : S.lang === 'en' ? 'en-GB' : 'de-DE') : '–');
const hrs = (n) => (n === null || n === undefined ? '–' : String(Math.round(n * 100) / 100).replace('.', ','));
const eur = (n) => (n === null || n === undefined ? '–' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n));
// Datei-Links: Inhaber mit umgeschalteter Ansicht (Test/Betrieb) braucht die Umgebung als Parameter, da Links keine Header senden
const fileUrl = (id) => `/api/files/${encodeURIComponent(id)}${S.viewEnv && S.me && S.me.role === 'owner' ? '?env=' + encodeURIComponent(S.viewEnv) : ''}`;
const isMgr = () => S.me && ['owner', 'fleet'].includes(S.me.role);

function plate(p, opts = {}) {
  const txt = esc(p || '—');
  return `<span class="plate${opts.big ? ' big' : ''}${opts.locked ? ' locked' : ''}" aria-label="Kennzeichen ${txt}"><span class="eu">D</span><span class="num">${txt}</span></span>`;
}

// ---------- API ----------
async function api(method, path, body, extra = {}) {
  const headers = { 'x-cfp': '1', ...(extra.headers || {}) };
  if (S.viewEnv && S.me && S.me.role === 'owner') headers['x-cfp-env'] = S.viewEnv;
  let b = body;
  if (body !== undefined && !(body instanceof Blob) && !(body instanceof ArrayBuffer) && typeof body !== 'string') { b = JSON.stringify(body); headers['content-type'] = 'application/json'; }
  let res;
  try { res = await fetch(path, { method, headers, body: b, credentials: 'same-origin' }); }
  catch { const e = new Error(t('offline')); e.offline = true; throw e; }
  if (res.status === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/invite') && !path.startsWith('/api/setup')) { S.me = null; try { localStorage.removeItem('cfp_offline_session'); } catch {} location.hash = '#/login'; throw new Error('Bitte anmelden.'); }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.blob();
  if (!res.ok) {
    // Häufige Fehler in der gewählten Sprache (Server-Texte sind deutsch); unbekannte Codes: Server-Text
    const code = data && data.error;
    const tr = code && S.lang !== 'de' && STRINGS[S.lang] && STRINGS[S.lang]['err_' + code];
    const e = new Error(tr || (data && data.message) || `${t('error')} ${res.status}`); e.code = code; e.status = res.status; throw e;
  }
  return data;
}

function toast(msg, err = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.setAttribute('role', err ? 'alert' : 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), err ? 6000 : 3000);
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
  document.getElementById('app').innerHTML = S.me ? frame(html, active) : `<main>${html}</main>`;
  const sk = $('.skip'); if (sk) sk.onclick = (e) => { e.preventDefault(); $('#main').focus(); };
  const es = $('#envsel');
  if (es) es.onchange = () => { S.viewEnv = es.value; localStorage.setItem('cfp_env', es.value); route(); };
  stackTables(document.getElementById('app'));
  window.scrollTo(0, 0);
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
  [/^#\/vehicles$/, viewVehicles], [/^#\/vehicles\/(VIN:[A-Z0-9]+)$/, viewVehicle], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\?ev=([\w-]+)$/, viewVehicle], [/^#\/vehicles\/(VIN:[A-Z0-9]+)\/timeline(?:\?f=(\w+))?$/, viewTimeline], [/^#\/inbox$/, viewInbox],
  [/^#\/master$/, viewMaster], [/^#\/plan$/, viewPlan], [/^#\/users$/, viewUsers], [/^#\/settings$/, viewSettings], [/^#\/more$/, viewMore],
  [/^#\/check$/, viewDepartureCheck], [/^#\/check\/paper$/, viewCheckPaper], [/^#\/stock$/, viewStock], [/^#\/stock\/reorder$/, viewReorder], [/^#\/fines$/, viewFines], [/^#\/drivers$/, viewDrivers], [/^#\/tacho$/, viewTacho], [/^#\/contracts$/, viewContracts], [/^#\/claims$/, viewClaims], [/^#\/drivers\/([\w-]+)$/, viewDriver], [/^#\/costs$/, viewCosts], [/^#\/kpi$/, viewKpi], [/^#\/defects$/, viewDefects], [/^#\/audit$/, viewAudit], [/^#\/usage$/, viewUsage], [/^#\/quality(?:\?f=(\w+))?$/, viewQuality], [/^#\/wsload$/, viewWsLoad], [/^#\/telematics$/, viewTelematics], [/^#\/help(?:\?s=([\w-]+))?(?:[?&]q=([^&#]*))?$/, viewHelp], [/^#\/search$/, viewSearch], [/^#\/tires$/, viewFleetTires], [/^#\/maintenance$/, viewMaint], [/^#\/fines\/([\w-]+)$/, viewFine], [/^#\/stock\/([\w-]+)$/, viewStockItem], [/^#\/inspect\/([\w-]+)$/, viewInspection],
];
const routeArg = (x) => { if (x === undefined) return undefined; try { return decodeURIComponent(x); } catch { return x; } };

async function route() {
  // Links mit encodeURIComponent(Fahrzeug-ID) enthalten „VIN%3A…“ – vor dem Abgleich mit den Routen auf „VIN:“ zurückführen
  const h = (location.hash || '#/').replace(/%3A/gi, ':');
  const pub = /^#\/(login|setup|invite\/)/.test(h);
  try {
    if (!S.me && !pub) {
      try { const r = await api('GET', '/api/me'); S.me = r.user; S.lang = r.user.language || S.lang; S.offlineStart = false; }
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
    render(`<div class="panel alert"><p>${esc(e.message)}</p><button class="btn" id="rl">${esc(t('retry'))}</button></div>`);
    const rl = document.getElementById('rl'); if (rl) rl.onclick = () => location.reload();
  }
}
window.addEventListener('hashchange', route);

// Offline-Start: nur Anzeige-Daten des Kontos (keine Zugangsdaten – die Anmeldung bleibt im HttpOnly-Cookie); beim Abmelden gelöscht
const OFFLINE_KEY = 'cfp_offline_session';
function saveOfflineSession() {
  try {
    const { id, username, display_name, role, environment, workshop_site, language } = S.me;
    localStorage.setItem(OFFLINE_KEY, JSON.stringify({ me: { id, username, display_name, role, environment, workshop_site, language }, meta: S.meta, saved_at: new Date().toISOString() }));
  } catch {}
}
function offlineSession() { try { const x = JSON.parse(localStorage.getItem(OFFLINE_KEY) || 'null'); return x && x.me && x.meta ? x : null; } catch { return null; } }
function clearOfflineData() {
  try { for (const k of Object.keys(localStorage)) if (k === OFFLINE_KEY || k.startsWith('cfp_veh_') || k.startsWith('cfp_myveh_')) localStorage.removeItem(k); } catch {}
}
window.addEventListener('online', () => { if (S.offlineStart) { S.offlineStart = false; S.me = null; route(); } });

async function refreshUnread() {
  try { const n = await api('GET', '/api/notifications'); S.unread = n.unread; } catch {}
}

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
    try { const r = await api('POST', '/api/login', { username: $('#u').value.trim(), password: $('#p').value }); S.me = null; let next = '#/'; try { next = sessionStorage.getItem('cfp_after_login') || '#/'; sessionStorage.removeItem('cfp_after_login'); } catch {} location.hash = next; route(); }
    catch (err) { toast(err.message, true); }
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
    try { await api('POST', '/api/invite/accept', { token, password: $('#p').value }); await api('PATCH', '/api/me', { language: S.lang }).catch(() => {}); S.me = null; location.hash = '#/'; }
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
    const soon = ov.rows.filter((r) => r.days !== null && r.days <= 14);
    if (soon.length) html += `<h2>${esc(t('inspections_due'))} (≤ 14 ${esc(t('days'))})</h2><div class="list">${soon.map((r) => `<a class="row ${r.days < 0 ? 'p-kritisch' : 'p-mittel'}" href="#/vehicles/${encodeURIComponent(r.vehicle_id)}">${plate(r.plate)}<span class="title">${esc(mk(r.kind))} · ${fmtD(r.next_due_date)}</span><span class="chip ${r.days < 0 ? 'kritisch' : 'mittel'}">${esc(t('ms_' + r.status))}</span></a>`).join('')}</div>`;
    // Prüfung mit erheblichen/gefährlichen Mängeln bzw. verkehrsunsicher, noch kein Auftrag: nur zur Info – die Fuhrparkleitung entscheidet
    const dw = ov.defects_without_case || [];
    if (dw.length) html += `<h2>${esc(t('ws_defects_pending'))} <span class="chip">${dw.length}</span></h2><p class="small muted">${esc(t('ws_defects_hint'))}</p><div class="list">${dw.map((x) => `<a class="row p-kritisch" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title">${esc(mk(x.kind))} · ${fmtD(x.done_date)}</span><span class="chip kritisch">${esc(t('res_' + x.result))}</span></a>`).join('')}</div>`;
  } catch {}
  // selbst erfasste Pflichtprüfungen ohne Ergebnis (≤ 180 Tage, neueste ihrer Art) – Sprung direkt zum Formular in der Fahrzeugakte
  try {
    const nr = (await api('GET', '/api/me/inspections-without-result')).items;
    if (nr.length) html += `<h2>${esc(t('res_missing_mine'))} <span class="chip">${nr.length}</span></h2><p class="small muted">${esc(t('res_missing_hint'))}</p><div class="list">${nr.map((r) => `<a class="row" href="#/vehicles/${encodeURIComponent(r.vehicle_id)}?ev=${encodeURIComponent(r.id)}">${plate(r.plate)}<span class="title">${esc(mk(r.kind))} · ${fmtD(r.done_date)}</span><span class="chip">${esc(t('res_add_go'))} ›</span></a>`).join('')}</div>`;
  } catch {}
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
    html += `<a class="btn block" href="#/new" style="margin:8px 0 12px">${esc(t('report_damage'))}</a><a class="btn secondary block" href="#/check">${esc(t('departure_check'))}</a><p style="margin-top:8px"><a href="#/help">${esc(t('help'))} ›</a></p>`;
    const mvKey = `cfp_myveh_${S.me.id}_${S.me.environment}`;
    let mv = null; let mvOffline = false;
    try { mv = (await api('GET', '/api/me/vehicles')).vehicles; try { localStorage.setItem(mvKey, JSON.stringify({ at: new Date().toISOString(), vehicles: mv })); } catch {} }
    catch { try { const c = JSON.parse(localStorage.getItem(mvKey) || 'null'); if (c) { mv = c.vehicles; mvOffline = c.at; } } catch {} }
    if (mvOffline || cases === null) html += `<div class="panel alert">${esc(t('offline_view'))}${mvOffline ? ` (${esc(t('as_of'))} ${fmtDT(mvOffline)})` : ''}</div>`;
    if (mv && mv.length) html += `<h2>${esc(t('my_vehicle'))}</h2>${mv.map((v) => `<section class="panel ${v.locked || v.coupled?.locked ? 'alert' : ''}"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${plate(v.plate, { locked: v.locked })}${coupledLockedChip(v.coupled)}${v.locked ? `<span class="chip kritisch">${esc(t('locked'))} – ${esc(t('do_not_drive'))}</span>` : v.open_cases_total ? `<span class="chip mittel">${v.open_cases_total} ${esc(t('open'))}</span>` : `<span class="chip ok">${esc(t('no_open_reports'))}</span>`}</div>
      <dl class="kv" style="margin-top:8px">${v.trailer_plate ? `<dt>${esc(t('trailer'))}</dt><dd>${esc(v.trailer_plate)}</dd>` : ''}<dt>${esc(t('km'))}</dt><dd>${v.last_km ? `${fmtKm(v.last_km.km)} <span class="small muted">(${fmtD(v.last_km.measured_at)})</span>` : '–'}</dd>${myPlanned(v)}${v.next_inspections.map((r) => `<dt>${esc(mk(r.kind))}</dt><dd>${fmtD(r.next_due_date)}${r.next_due_date < bDate() ? ` <span class="chip kritisch">${esc(t('drv_overdue'))}</span>` : ''}${r.planned_date ? ` <span class="small">· ${esc(t('planned'))} ${fmtD(r.planned_date)}${r.planned_date === bDate() ? ' (' + esc(t('today')) + ')' : ''}</span>` : ''}</dd>`).join('')}</dl>${knownDefects(v.known_defects)}</section>`).join('')}`;
    if (cases) html += `<h2>${esc(t('nav_cases'))}</h2>${caseList(cases, t('no_cases_driver'))}`;
  } else {
    if (d.vehicles) {
      const v = d.vehicles; const tot = Math.max(v.total, 1);
      const seg = [['gesperrt', v.gesperrt, 'var(--stop)'], ['werkstatt', v.werkstatt, 'var(--mid)'], ['meldung_offen', v.meldung_offen, 'var(--signal)'], ['einsatzbereit_lt_system', v.einsatzbereit, 'var(--go)']];
      html += `<section class="panel"><h2 style="margin-top:0">${esc(t('vehicles'))}: ${v.total}</h2>
        <div class="fleetbar" role="img" aria-label="${esc(t('fleet_state'))}">${seg.map(([, n, c]) => `<span style="width:${(n / tot) * 100}%;background:${c}"></span>`).join('')}</div>
        <div class="legend">${seg.map(([k, n, c]) => `<span><i style="background:${c}"></i>${esc(t('av_' + k))}: <b>${n}</b></span>`).join('')}</div></section>`;
    }
    html += `<div class="stats"><div><b>${d.open_cases}</b>${esc(t('open'))}</div><div><b style="color:var(--stop)">${d.critical}</b>${esc(t('prio_kritisch'))}</div><div><b>${d.locked}</b>${esc(t('locked'))}</div>
      ${S.me.role === 'workshop' ? `<div><b>${d.inbox}</b>${esc(t('act_acknowledge'))}</div><div><b>${d.in_progress}</b>${esc(t('st_in_reparatur'))}</div>` : ''}</div>`;
    if (d.findings && d.findings.length) {
      const n = d.findings.filter((f) => ['kritisch', 'handeln'].includes(f.severity)).reduce((s, f) => s + f.n, 0);
      if (n) html += `<a class="panel alert" style="display:block;text-decoration:none" href="#/master"><b>${esc(t('not_clear'))}</b>: ${n} ${esc(t('findings'))}</a>`;
    }
    if (S.me.role === 'workshop') html += await workshopBoard();
    else {
      if (isMgr()) html += await fleetTodo();
      if (S.me.role === 'dispatch') {
        const [dcs, dmo, dvs] = await Promise.all([cases === null ? [] : api('GET', '/api/cases?status=open&limit=500').then((r) => r.cases).catch(() => []), cases === null ? null : api('GET', '/api/maintenance').catch(() => null),
          cases === null ? [] : api('GET', '/api/vehicles').then((r) => r.vehicles).catch(() => [])]);
        html += dispoBoard(dcs, dmo && dmo.defects_without_case ? dmo.defects_without_case : [], new Map(dvs.filter((v) => v.coupled).map((v) => [v.id, v.coupled])));
        html += helpLink('dispo');
      }
      if (S.me.role === 'dispatch' && cases !== null) html += await dispoPlanned();
      html += `<h2>${esc(t('open'))}</h2>${caseList(cases)}<p><a href="#/cases">${esc(t('all'))}</a></p>`;
      if (S.me.role === 'viewer') html += helpLink('viewer');
    }
  }
  render(html, 'home');
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

// Unterzeile: Auftrag/Werkstatt und weitere geplante Tage desselben Fahrzeugs (Fahrzeug fällt dann mehrfach aus – Hinweis zum Zusammenlegen)
function dispoSub(i) {
  const parts = i.type === 'case' ? [esc(i.case_no), esc(wsName(i.workshop_site))] : [];
  if (i.other_dates && i.other_dates.length) parts.push(`<b>${esc(t('plan_other_dates'))}: ${i.other_dates.map(fmtD).join(', ')}</b>`);
  return parts.length ? `<span class="sub">${parts.join(' · ')}</span>` : '';
}

// Disposition: geplante Werkstatt- und Prüftermine der nächsten 7 Tage (aus dem Werkstattplan, nur gespeicherte Termine)
async function dispoPlanned() {
  const r = await api('GET', '/api/workshop/plan?days=7').catch(() => null);
  if (!r || !r.days.length) return '';
  const rows = r.days.flatMap((d) => d.items.map((i) => `<a class="row ${i.type === 'case' ? 'p-' + esc(i.priority) : ''}" href="${i.type === 'case' ? '#/cases/' + esc(i.id) : '#/vehicles/' + encodeURIComponent(i.vehicle_id)}">${plate(i.plate, { locked: !!i.safety_lock })}<span class="title" style="white-space:normal">${i.type === 'case' ? esc(t('planned_ws_short')) + ' · ' + esc(t('st_' + i.status)) : esc(t('planned_inspection')) + ': ' + esc(mk(i.kind))}</span><span class="chip${d.date === r.today ? ' ok' : ''}">${d.date === r.today ? esc(t('today')) : fmtD(d.date)}</span>${dispoSub(i)}</a>`));
  return `<h2>${esc(t('dispo_planned'))}</h2><p class="small muted">${esc(t('dispo_planned_hint'))}</p><div class="list">${rows.join('')}</div><p><a href="#/plan">${esc(t('wplan'))}</a></p>`;
}

// Fuhrparkleitung: „Heute zu tun“ – nur aus gespeicherten Daten, mit direkten Links
async function fleetTodo() {
  const [cs, ov, fs, tc, dr, ct, cl] = await Promise.all([
    api('GET', '/api/cases?status=open&limit=500').then((r) => r.cases).catch(() => []),
    api('GET', '/api/maintenance').catch(() => null),
    api('GET', '/api/fines?status=open').then((r) => r.fines).catch(() => []),
    isMgr() ? api('GET', '/api/tacho').catch(() => null) : null,
    isMgr() ? api('GET', '/api/drivers').then((r) => r.drivers).catch(() => []) : [],
    isMgr() ? api('GET', '/api/contracts?filter=aktion').then((r) => r.contracts).catch(() => []) : [],
    isMgr() ? api('GET', '/api/claims?filter=offen').then((r) => r.claims.filter((c) => c.followup_due)).catch(() => []) : [],
  ]);
  const today = bDate();
  const in7 = bDate(7);
  const groups = [
    ['todo_receive', cs.filter((c) => c.status === 'gemeldet' && !c.fleet_received_at), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}`, 'kritisch'],
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
    ['todo_inspections', ov ? ov.rows.filter((r) => r.status === 'ueberfaellig' || (r.next_due_date && r.next_due_date <= in7)) : [], (r) => `#/vehicles/${encodeURIComponent(r.vehicle_id)}`, (r) => `${r.plate} · ${mk(r.kind)} · ${r.next_due_date ? fmtD(r.next_due_date) : (r.next_due_km ? fmtKm(r.next_due_km) : '')} · ${r.planned_date && r.planned_date >= today ? t('planned') + ' ' + fmtD(r.planned_date) : t('no_planned_date')}`, 'mittel'],
    ['todo_tacho', tc ? [...tc.drivers.map((x) => ({ ...x, label: x.display_name, href: '#/drivers/' + x.id })), ...tc.vehicles.map((x) => ({ ...x, label: x.plate, href: '#/tacho' }))].filter((x) => x.status === 'ueberfaellig' || x.status === 'bald') : [], (x) => x.href, (x) => `${x.label} · ${fmtD(x.due)}${x.status === 'ueberfaellig' ? ' !' : ''}`, 'mittel'],
    ['todo_driver_docs', dr.filter((d) => d.status.overall === 'kritisch'), (d) => `#/drivers/${d.id}`, (d) => `${d.display_name} · ${[...d.status.items.filter((i) => i.status === 'abgelaufen').map((i) => t('dk2_' + i.kind)), d.status.check.status === 'mangel' ? t('license_check') : ''].filter(Boolean).join(', ')}`, 'kritisch'],
    ['todo_contracts', ct.filter((c) => (c.status.end && (c.status.end.status === 'abgelaufen' || c.end_date <= in7)) || (c.status.notice && c.status.notice.status === 'bald' && c.status.notice.by <= in7)), (c) => `#/vehicles/${encodeURIComponent(c.vehicle_id)}`,
      (c) => `${c.plate} · ${t('ck_' + c.kind)} · ${c.status.notice && c.status.notice.status === 'bald' && c.status.notice.by <= in7 ? t('ct_notice_by') + ' ' + fmtD(c.status.notice.by) : t('ct_end') + ' ' + fmtD(c.end_date)}${c.end_date < today ? ' !' : ''}`, 'mittel'],
    ['todo_claims', cl, (c) => `#/cases/${c.case_id}`, (c) => `${c.case_no} · ${c.plate} · ${c.insurer} · ${t('claim_days_open').replace('{n}', c.days_open)}`, ''],
    ['todo_fines', fs.filter((f) => f.response_due && f.response_due <= in7), (f) => `#/fines/${f.id}`, (f) => `${f.fine_no} · ${f.plate || f.plate_in_letter} · ${fmtD(f.response_due)}${f.response_due < today ? ' !' : ''}`, 'mittel'],
  ].filter(([, list]) => list.length);
  if (!groups.length) return `<section class="panel good"><b>${esc(t('todo_none'))}</b></section>`;
  return `<h2>${esc(t('todo_today'))}</h2>${groups.map(([k, list, href, label, cls]) => `<details class="panel"${cls === 'kritisch' ? ' open' : ''}><summary><b>${esc(t(k))}</b> <span class="chip ${cls}">${list.length}</span></summary><div class="list" style="margin-top:8px">${list.slice(0, 8).map((x) => `<a class="row" href="${href(x)}"><span class="title" style="white-space:normal">${esc(label(x))}</span></a>`).join('')}</div>${list.length > 8 ? `<p class="small muted">+${list.length - 8}</p>` : ''}${k === 'todo_repeat' ? `<p class="small"><a href="#/cases?f=repeat">${esc(t('show_in_list'))} ›</a></p>` : ''}${k === 'todo_plan_passed' ? `<p class="small"><a href="#/plan">${esc(t('wplan'))} ›</a></p>` : ''}${k === 'todo_result_missing' ? `<p class="small"><a href="#/quality?f=inspection_no_result">${esc(t('show_in_dq'))} ›</a></p>` : ''}</details>`).join('')}`;
}

const recentRepeat = (c) => c.last_repeat_at && Date.now() - Date.parse(c.last_repeat_at) < 3 * 86400000;
function caseList(list, empty) {
  if (!list.length) return `<p class="muted">${esc(empty || t('no_cases'))}</p>`;
  return `<div class="list">${list.map((c) => `<a class="row p-${esc(c.priority)}" href="#/cases/${esc(c.id)}">
    ${plate(c.plate, { locked: c.safety_lock })}
    <span class="title">${esc(c.description)}</span>
    <span class="chip ${esc(c.status === 'fahrzeug_freigegeben' ? 'ok' : c.priority)}">${esc(t('st_' + c.status))}</span>
    <span class="sub">${esc(c.case_no)} · ${esc(t('prio_' + c.priority))}${c.safety_lock ? ' · ' + esc(t('locked')) : ''}${c.access === 'preview' ? ' · ' + esc(t('preview_hint')) : ''}${c.planned_date && ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile'].includes(c.status) ? ` · <b>${esc(t('planned'))} ${fmtD(c.planned_date)}</b>` : ''} · ${fmtDT(c.updated_at)}${recentRepeat(c) ? ` · <b>${esc(t('act_repeat_finding'))} ${fmtDT(c.last_repeat_at)}</b>` : ''}${partsEta(c)}${c.cost_over_limit_at ? ` · <span class="chip mittel">${esc(t('cost_approval_pending'))}</span>` : ''}${c.maintenance_event_id ? ` · <b>${esc(t('md_case'))}</b>` : ''}</span></a>`).join('')}</div>`;
}

// Filter der Vorgangsliste: offen/abgeschlossen/alle bzw. „Mangel erneut festgestellt“ (offen, letzte 3 Tage)
const caseFilterQ = (f) => (f === 'repeat' ? 'status=open&repeat_days=3' : `status=${f === 'all' ? '' : f}`);
async function viewCases() {
  const hf = new URLSearchParams(location.hash.split('?')[1] || '').get('f');
  if (hf) try { sessionStorage.setItem('cfp_cf', hf); } catch {}
  let f = hf || sessionStorage.getItem('cfp_cf') || 'open';
  if (!['open', 'closed', 'all', 'repeat'].includes(f) || (f === 'repeat' && S.me.role === 'driver')) f = 'open';
  const q = S.caseQ || '';
  const list = (await api('GET', `/api/cases?${caseFilterQ(f)}${q.length >= 2 ? '&q=' + encodeURIComponent(q) : ''}`)).cases;
  render(`<h1>${esc(t('nav_cases'))}</h1>
    <input id="cq" type="search" value="${esc(q)}" placeholder="${esc(t('case_search'))}" aria-label="${esc(t('case_search'))}" style="margin-bottom:12px" autocomplete="off">
    <div class="seg-tabs">${['open', 'closed', 'all', ...(S.me.role === 'driver' ? [] : ['repeat'])].map((k) => `<a href="#/cases" data-f="${k}" class="${k === f ? 'on' : ''}">${esc(t(k === 'repeat' ? 'filter_repeat' : k))}</a>`).join('')}</div>
    <div id="cl">${caseList(list)}</div>
    ${S.me.role !== 'driver' ? `<div class="actions"><button type="button" class="btn secondary" id="ccsv">${esc(t('export_csv'))}</button></div>` : ''}`, 'cases');
  const cc = $('#ccsv'); if (cc) cc.onclick = async () => { try { download(await api('GET', `/api/cases?format=csv&${caseFilterQ(f)}${(S.caseQ || '').length >= 2 ? '&q=' + encodeURIComponent(S.caseQ) : ''}`), `fuhrpark-vorgaenge_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
  $$('.seg-tabs a').forEach((a) => (a.onclick = (e) => { e.preventDefault(); sessionStorage.setItem('cfp_cf', a.dataset.f); viewCases(); }));
  let timer = null;
  const cq = $('#cq');
  cq.oninput = () => { clearTimeout(timer); timer = setTimeout(async () => {
    S.caseQ = cq.value.trim();
    try { const l = (await api('GET', `/api/cases?${caseFilterQ(f)}${S.caseQ.length >= 2 ? '&q=' + encodeURIComponent(S.caseQ) : ''}`)).cases; $('#cl').innerHTML = caseList(l); } catch (err) { toast(err.message, true); }
  }, 300); };
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
      const files = [...($('#ph').files || [])].slice(0, 10);
      let failed = 0;
      for (const [i, file] of files.entries()) {
        $('#sb').textContent = `${t('uploading')} ${i + 1}/${files.length}`;
        try { failed += await uploadCasePhotos(r.id, [{ blob: await prepareUpload(file), name: file.name }]); } catch { failed++; }
      }
      toast(`${t('report_sent')}: ${r.case_no}${failed ? ' · ' + t('photos_failed').replace('{n}', failed) : ''}`, !!failed);
      location.hash = '#/cases/' + r.id;
    } catch (err) {
      if (err.offline) {
        const files = [...($('#ph').files || [])].slice(0, 10);
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
  if (pi && !(v.next_inspections || []).some((r) => r.kind === pi.kind && r.planned_date)) h += `<dt>${esc(mk(pi.kind))}</dt><dd>${esc(t('planned'))} ${fmtD(pi.planned_date)}${pi.planned_date === bDate() ? ' (' + esc(t('today')) + ')' : ''}</dd>`;
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
    ${c.safety_lock ? `<div class="panel alert"><b>${esc(t('locked'))}</b> – ${esc(c.safety_lock_reason || '')}</div>` : ''}
    ${d.access === 'preview' ? `<div class="panel">${esc(t('preview_hint'))}</div>` : ''}
    ${d.maintenance_event ? (() => { const me = d.maintenance_event; const ri = me.reinspection; const good = ri && !DEFECT_RESULTS.includes(ri.result); return `<div class="panel ${good ? 'good' : ''}"><b>${esc(t('md_case'))}: ${esc(mk(me.kind))} ${fmtD(me.done_date)}</b> · ${esc(t('res_' + me.result))} – ${ri ? `${esc(t('reinsp_done'))} ${fmtD(ri.done_date)}${ri.result ? ' · ' + esc(t('res_' + ri.result)) : ''} (${esc(ri.evidence)})` : `${c.status === 'fahrzeug_freigegeben' ? `<span class="chip mittel">${esc(t('todo_reinspection'))}</span> ` : ''}${esc(t('md_case_hint'))}`} <a href="#/vehicles/${esc(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></div>`; })() : ''}
    ${d.maintenance_rule ? `<div class="panel ${d.maintenance_rule.done_since_order ? 'good' : ''}"><b>${esc(t('mo_case'))}: ${esc(mk(d.maintenance_rule.kind))}</b> – ${d.maintenance_rule.done_since_order ? `${esc(t('mo_done'))} ${fmtD(d.maintenance_rule.last_done_date)}` : esc(t('mo_case_hint'))} <a href="#/vehicles/${esc(c.vehicle_id)}">${esc(t('vehicle_file'))} ›</a></div>` : ''}
    ${c.cost_over_limit_at ? `<div class="panel warn"><b>${esc(t('cost_approval_pending'))}</b> – ${esc(t(isMgr() ? 'cost_approval_hint_mgr' : 'cost_approval_hint_ws'))} <span class="small muted">(${fmtDT(c.cost_over_limit_at)})</span></div>` : ''}
    <section class="panel"><p style="white-space:pre-wrap;font-size:1.05rem">${esc(c.description)}</p>
    <dl class="kv">
      <dt>${esc(t('urgency'))}</dt><dd><span class="chip ${esc(c.priority)}">${esc(t('prio_' + c.priority))}</span>${prioLine}</dd>
      <dt>${esc(t('driveable'))}</dt><dd>${esc(t('drv_' + c.reported_driveability))}</dd>
      ${d.reporter_name || d.reporter_name_hidden ? `<dt>${esc(t('reported_by'))}</dt><dd>${esc(pnm(d.reporter_name, d.reporter_name_hidden))} · ${fmtDT(c.created_at)}</dd>` : `<dt>${esc(t('date'))}</dt><dd>${fmtDT(c.created_at)}</dd>`}
      <dt>${esc(t('received'))}</dt><dd>${c.fleet_received_at ? fmtDT(c.fleet_received_at) : esc(t('not_yet'))}</dd>
      <dt>${esc(t('workshop'))}</dt><dd>${esc(wsName(c.workshop_site || c.suggested_workshop_site))}${c.planned_date ? ' · ' + esc(t('planned')) + ' ' + fmtD(c.planned_date) : ''}</dd>
      ${c.status === 'wartet_teile' ? `<dt>${esc(t('parts_eta'))}</dt><dd>${c.parts_expected_date ? partsEta(c, '', false) : `<span class="muted">${esc(t('parts_eta_none'))}</span>`}</dd>` : ''}
      ${c.status !== 'gemeldet' ? `<dt>${esc(t('workshop_ack'))}</dt><dd>${c.workshop_ack_at ? fmtDT(c.workshop_ack_at) : esc(t('not_yet'))}</dd>` : ''}
      ${c.location_note ? `<dt>${esc(t('location'))}</dt><dd>${esc(c.location_note)}</dd>` : ''}
      ${d.parent ? `<dt>${esc(t('parent'))}</dt><dd><a href="#/cases/${esc(d.parent.id)}">${esc(d.parent.case_no)}</a></dd>` : ''}
      ${!['driver'].includes(S.me.role) ? `<dt>${esc(t('vehicle_file'))}</dt><dd><a href="#/vehicles/${esc(d.vehicle.id)}">${esc(d.vehicle.plate)}</a></dd>` : ''}
    </dl>${vehInfo(d.vehicle_info, c)}</section>`;

  // Aktionen
  const main = A.filter((a) => !['comment', 'upload', 'inspection', 'resolve_open_item'].includes(a));
  if (main.length || A.includes('inspection')) {
    html += `<div class="actions">${A.includes('inspection') ? `<a class="btn" href="#/inspect/${esc(c.id)}">${esc(t('act_inspection'))}</a>` : ''}${main.map((a) => `<button class="btn ${['reject', 'set_safety_lock'].includes(a) ? 'danger' : a === 'technical_release' ? 'go' : ['record_work', 'add_part', 'add_open_item', 'add_external_cost', 'change_priority', 'reassign_workshop', 'lift_safety_lock', 'return_for_rework', 'set_planned_date', 'set_parts_eta'].includes(a) ? 'secondary' : ''}" data-act="${esc(a)}">${esc(t('act_' + a))}</button>`).join('')}</div><div id="actform"></div>`;
  } else html += `<div id="actform"></div>`;

  // Dateien
  html += `<h2>${esc(t('files'))}</h2><div class="thumbs">${d.files.map((f) => f.content_type.startsWith('image/') ? `<a href="${fileUrl(f.id)}" target="_blank" rel="noopener"><img loading="lazy" src="${fileUrl(f.id)}" alt="${esc(f.filename)}"></a>` : `<a href="${fileUrl(f.id)}" target="_blank" rel="noopener">PDF<br>${esc(f.filename.slice(0, 14))}</a>`).join('')}</div>`;
  const canUpload = A.includes('upload') || (c.reporter_id === S.me.id && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status));
  if (canUpload && d.files.length < 10) html += `<label class="btn secondary" style="margin-top:8px;display:inline-flex">${esc(t('add_photos'))}<input id="file" type="file" accept="image/*,application/pdf" capture="environment" multiple hidden></label>`;

  // Restarbeiten
  if (d.open_items.length) {
    html += `<h2>${esc(t('open_items'))}</h2><div class="list">${d.open_items.map((o) => `<div class="row ${o.safety_relevant ? 'p-kritisch' : ''}"><span class="chip ${o.status === 'offen' ? (o.safety_relevant ? 'kritisch' : 'mittel') : 'ok'}">${esc(o.status)}</span><span class="title" style="white-space:normal">${esc(o.description)}</span>${o.status === 'offen' && A.includes('resolve_open_item') ? `<button class="btn secondary" data-resolve="${esc(o.id)}">${esc(t('done'))}</button>` : '<span></span>'}<span class="sub">${o.safety_relevant ? esc(t('safety_relevant')) + ' · ' : ''}${esc(pnm(o.created_by_name, o.created_by_name_hidden))} · ${fmtDT(o.created_at)}${o.resolution_note ? ' · ' + esc(o.resolution_note) : ''}</span></div>`).join('')}</div>`;
  }
  if (d.followups.length) html += `<h2>${esc(t('followups'))}</h2><div class="list">${d.followups.map((f) => `<a class="row p-${esc(f.priority)}" href="#/cases/${esc(f.id)}"><span class="chip">${esc(f.case_no)}</span><span class="title">${esc(f.description)}</span><span class="chip">${esc(t('st_' + f.status))}</span></a>`).join('')}</div>`;
  if (d.inspections.length) html += `<h2>${esc(t('inspections'))}</h2>${d.inspections.map((i) => `<details class="panel"><summary>${fmtDT(i.created_at)} · ${esc(pnm(i.performed_by_name, i.performed_by_name_hidden))} · <span class="chip ${i.result === 'ok' ? 'ok' : 'kritisch'}">${i.result === 'ok' ? 'OK' : esc(t('defect'))}</span>${i.odometer_km ? ' · ' + i.odometer_km.toLocaleString('de-DE') + ' km' : ''}</summary><table>${i.items.map((it) => `<tr><td>${esc(checkLabel(it.key))}</td><td><span class="chip ${it.result === 'mangel' ? 'kritisch' : it.result === 'ok' ? 'ok' : ''}">${esc(t(it.result === 'mangel' ? 'defect' : it.result))}</span>${it.note ? ' ' + esc(it.note) : ''}${it.followup_case_no ? ` → <a href="#/cases/${esc(it.followup_case_id)}">${esc(it.followup_case_no)}</a>` : ''}</td></tr>`).join('')}</table></details>`).join('')}`;

  // Arbeiten, Teile, Kosten
  if (d.work) {
    html += `<h2>${esc(t('work'))} & ${esc(t('parts'))}</h2><div class="scroll"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('activity'))}</th><th>${esc(t('hours'))}</th></tr></thead><tbody>${d.work.map((w) => `<tr><td>${fmtD(w.work_date)}</td><td>${esc(w.description)}<br><span class="small muted">${esc(w.user_name)}</span></td><td>${hrs(w.hours)}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table>
      <table style="margin-top:8px"><thead><tr><th>${esc(t('part_name'))}</th><th>${esc(t('qty'))}</th><th>€</th></tr></thead><tbody>${d.parts.map((p) => `<tr><td>${esc(p.name)}${p.part_number ? ` <span class="small muted">${esc(p.part_number)}</span>` : ''}</td><td>${p.quantity} ${esc(p.unit)}</td><td>${p.unit_price_net === null ? `<span class="chip mittel">${esc(t('unvalued'))}</span>` : eur(p.unit_price_net) + (p.valuation === 'estimate' ? ' (' + esc(t('estimate')) + ')' : '')}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table></div>`;
  }
  if (d.costs) {
    const k = d.costs;
    html += `<section class="panel ${k.complete ? '' : ''}"><h3>${esc(t('costs'))}</h3><dl class="kv"><dt>${esc(t('actual_cost'))}</dt><dd>${eur(k.actual_net)}</dd><dt>${esc(t('estimate'))}</dt><dd>${eur(k.estimate_net)}</dd><dt>${esc(t('unvalued'))}</dt><dd>${k.unvalued_items ? `<span class="chip mittel">${k.unvalued_items}</span>` : '0'}</dd><dt>${esc(t('hours'))}</dt><dd>${hrs(k.hours)}${k.hourly_rate_net === null ? ` <span class="small muted">(${esc(t('hourly_rate'))}: –)</span>` : ''}</dd>${d.cost_limit ? `<dt>${esc(t('cost_limit'))}</dt><dd>${d.cost_limit.limit_net !== null ? eur(d.cost_limit.limit_net) : '–'}${d.cost_limit.approved_net !== null ? ` · ${esc(t('cost_approved_upto'))} ${eur(d.cost_limit.approved_net)}` : ''}${d.cost_limit.over_since ? ` <span class="chip mittel">${esc(t('cost_approval_pending'))}</span>` : ''}</dd>` : ''}</dl>
      ${d.external_costs && d.external_costs.length ? `<table>${d.external_costs.map((x) => `<tr><td>${esc(x.supplier)} ${esc(x.invoice_no || '')}</td><td>${x.amount_net === null ? esc(t('unvalued')) : eur(x.amount_net)}</td></tr>`).join('')}</table>` : ''}</section>`;
  }

  if (d.insurance_contracts) html += claimSection(d.claim, d.insurance_contracts, d.files || []);
  // Dauer je Status (aus dem Verlauf: gespeicherte Statuswechsel, aktueller Status bis jetzt)
  {
    const spans = []; let cur = 'gemeldet'; let since = c.created_at;
    for (const e of d.events) if (e.to_status && e.to_status !== cur) { spans.push([cur, Date.parse(e.created_at) - Date.parse(since)]); cur = e.to_status; since = e.created_at; }
    const closed = ['fahrzeug_freigegeben', 'abgelehnt'].includes(cur);
    if (!closed) spans.push([cur, Date.now() - Date.parse(since)]);
    const sum = {}; for (const [st, ms] of spans) sum[st] = (sum[st] || 0) + Math.max(0, ms);
    const dur = (ms) => { const h = ms / 3600000; return h < 1 ? `${Math.round(ms / 60000)} ${t('min_short')}` : h < 48 ? `${(Math.round(h * 10) / 10).toString().replace('.', ',')} ${t('h_short')}` : `${(Math.round((h / 24) * 10) / 10).toString().replace('.', ',')} ${t('days')}`; };
    if (Object.keys(sum).length > 1 || closed) html += `<h2>${esc(t('time_per_status'))}</h2><dl class="kv">${Object.entries(sum).map(([st, ms]) => `<dt>${esc(t('st_' + st))}${!closed && st === cur ? ` (${esc(t('current'))})` : ''}</dt><dd>${dur(ms)}</dd>`).join('')}</dl>`;
  }
  // Verlauf + Kommentar
  html += `<h2>${esc(t('history'))}</h2><ol class="timeline">${d.events.map((e) => `<li><time>${fmtDT(e.created_at)}</time> · <b>${esc(t('act_' + e.action) !== 'act_' + e.action ? t('act_' + e.action) : e.action === 'create' ? t('report_sent') : e.action)}</b>${e.actor_name || e.actor_name_hidden ? ' · ' + esc(pnm(e.actor_name, e.actor_name_hidden)) : ''}${e.to_status && e.from_status !== e.to_status ? ` → ${esc(t('st_' + e.to_status))}` : ''}${e.note ? `<div style="white-space:pre-wrap">${esc(e.note)}</div>` : ''}${e.action === 'cost_limit_exceeded' && e.payload ? `<div class="small muted">${esc(t('costs'))} ${eur(e.payload.total_net)} > ${esc(t('cost_limit'))} ${eur(Math.max(e.payload.limit_net, e.payload.approved_net || 0))}</div>` : ''}${e.action === 'approve_costs' && e.payload ? `<div class="small muted">${esc(t('cost_approved_upto'))} ${eur(e.payload.approved_net)}</div>` : ''}${e.action === 'set_parts_eta' && e.payload ? `<div class="small muted">${e.payload.from ? fmtD(e.payload.from) : '–'} → ${e.payload.to ? fmtD(e.payload.to) : '–'}</div>` : e.payload && e.payload.from && e.payload.to ? `<div class="small muted">${esc(e.payload.from)} → ${esc(e.payload.to)}</div>` : ''}${e.payload && e.payload.parts_expected_date ? `<div class="small muted">${esc(t('parts_eta'))} ${fmtD(e.payload.parts_expected_date)}</div>` : ''}</li>`).join('')}</ol>`;
  if (A.includes('comment')) html += `<form id="cf"><label for="ct">${esc(t('act_comment'))}</label><textarea id="ct" required></textarea>${S.me.role !== 'driver' ? `<fieldset style="border:0;padding:0;margin:8px 0"><legend class="small muted">${esc(t('notify_only'))}</legend><div style="display:flex;gap:14px;flex-wrap:wrap">${[['fleet', t('role_fleet')], ['workshop', t('role_workshop')], ['reporter', t('reported_by')]].map(([k, l]) => `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-nt="${k}"> ${esc(l)}</label>`).join('')}</div></fieldset>` : ''}<div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form>`;
  render(html, 'cases');
  $('#cprt').onclick = () => window.print();

  const cmd = async (action, note, payload = {}) => {
    try { await api('POST', `/api/cases/${c.id}/commands`, { action, command_id: uid(), expected_version: c.version, note, payload }); toast('✓'); viewCase(c.id); }
    catch (err) { toast(err.message, true); if (err.code === 'version_conflict') viewCase(c.id); }
  };
  $$('[data-act]').forEach((b) => (b.onclick = () => actionForm(b.dataset.act, c, cmd)));
  $$('[data-resolve]').forEach((b) => (b.onclick = () => actionForm('resolve_open_item', c, cmd, { open_item_id: b.dataset.resolve })));
  const clf = $('#clf'); if (clf) clf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(clf)); for (const k of Object.keys(b)) if (b[k] === '') b[k] = null; try { await api('PUT', `/api/cases/${c.id}/claim`, b); toast('✓'); viewCase(c.id); } catch (err) { toast(err.message, true); } };
  const cf = $('#cf'); if (cf) cf.onsubmit = (e) => { e.preventDefault(); const notify = $$('[data-nt]', cf).filter((x) => x.checked).map((x) => x.dataset.nt); cmd('comment', $('#ct').value, notify.length ? { notify } : {}); };
  const fi = $('#file'); if (fi) fi.onchange = async () => {
    for (const file of fi.files) {
      try { const blob = await prepareUpload(file); await api('POST', `/api/cases/${c.id}/files`, blob, { headers: { 'x-filename': encodeURIComponent(file.name), 'content-type': blob.type || 'application/octet-stream' } }); }
      catch (err) { toast(`${file.name}: ${err.message}`, true); }
    }
    viewCase(c.id);
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
  const r = await api('GET', `/api/claims?filter=${f}`);
  const tabs = ['offen', 'alle', 'reguliert', 'abgelehnt'];
  let html = `<h1>${esc(t('claims'))}</h1>${helpLink('claims')}<p class="small muted">${esc(t('claims_hint'))}</p>
    <div class="actions noprint" style="flex-wrap:wrap">${tabs.map((x) => `<button type="button" class="btn ${f === x ? '' : 'secondary'}" data-clf="${x}">${esc(x === 'offen' ? t('claim_f_open') : x === 'alle' ? t('filter_all') : t('cls_' + x))} (${r.counts[x] || 0})</button>`).join('')}</div>
    ${r.reimbursed_sum_net !== null ? `<section class="panel"><dl class="kv"><dt>${esc(t('claim_sum'))}</dt><dd><b>${eur(r.reimbursed_sum_net)}</b></dd></dl></section>` : ''}
    <div class="list">${r.claims.length ? r.claims.map((c) => `<a class="row${c.followup_due ? ' p-mittel' : ''}" href="#/cases/${encodeURIComponent(c.case_id)}">${plate(c.plate)}<span class="title">${esc(c.insurer)}${c.claim_no ? ' · ' + esc(c.claim_no) : ''}</span>${claimChip(c.status)}<span class="sub" style="white-space:normal">${c.followup_due ? `<b>${esc(t('todo_claims'))}</b> · ` : ''}${esc(c.case_no)} · ${esc(t('claim_reported'))} ${fmtD(c.reported_on)}${c.days_open !== null ? ` · ${esc(t('claim_days_open').replace('{n}', c.days_open))}` : ''}${c.deductible_net !== null ? ` · ${esc(t('claim_deductible_short'))} ${eur(c.deductible_net)}` : ''}${c.reimbursed_net !== null ? ` · ${esc(t('claim_reimbursed_short'))} ${eur(c.reimbursed_net)}` : ''}${c.case_cost_net !== null ? ` · ${esc(t('claim_case_cost'))} ${eur(c.case_cost_net)}` : ''}${c.balance_net !== null ? ` · <b>${esc(t('claim_balance'))} ${eur(c.balance_net)}</b>` : ''}</span></a>`).join('') : `<p class="muted">${esc(t('claims_none'))}</p>`}</div>
    <div class="actions noprint"><button type="button" class="btn secondary" id="clcsv">${esc(t('export_csv'))}</button></div>`;
  render(html, 'more');
  $$('[data-clf]').forEach((b) => (b.onclick = () => { S.clFilter = b.dataset.clf; viewClaims(); }));
  $('#clcsv').onclick = async () => { try { download(await api('GET', `/api/claims?format=csv&filter=${f}`), `fuhrpark-versicherungsfaelle_${r.today}.csv`); } catch (err) { toast(err.message, true); } };
}

const wsName = (code) => (S.meta.workshops.find((w) => w.code === code) || {}).name || code || '–';
const checkLabel = (k) => (CHECK_LABELS[S.lang] || CHECK_LABELS.de)[k] || k;

// Bilder vor dem Hochladen verkleinern (max. 1600 px, JPEG) – spart Datenvolumen unterwegs
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

function actionForm(action, c, cmd, preset = {}) {
  const box = $('#actform');
  const f = [];
  const needsNote = ['change_priority', 'set_safety_lock', 'lift_safety_lock', 'approve_repair', 'reassign_workshop', 'reject', 'wait_parts', 'resolve_open_item', 'request_quality_check', 'return_for_rework', 'technical_release', 'approve_costs'];
  const wsOpts = S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${(c.workshop_site || c.suggested_workshop_site) === w.code ? ' selected' : ''}>${esc(w.name)}</option>`).join('');
  const prioOpts = (sel) => ['niedrig', 'mittel', 'kritisch'].map((p) => `<option value="${p}"${p === sel ? ' selected' : ''}>${esc(t('prio_' + p))}</option>`).join('');
  switch (action) {
    case 'change_priority': f.push(`<label>${esc(t('new_priority'))}</label><select name="priority">${prioOpts(c.priority)}</select>`); break;
    case 'approve_repair': f.push(`<label>${esc(t('workshop'))}</label><select name="workshop_site">${wsOpts}</select><label>${esc(t('urgency'))}</label><select name="priority">${prioOpts(c.priority)}</select><label>${esc(t('planned'))}</label><input type="date" name="planned_date">`); break;
    case 'reassign_workshop': f.push(`<label>${esc(t('workshop'))}</label><select name="workshop_site">${wsOpts}</select>`); break;
    case 'approve_costs': f.push(`<p class="small muted">${esc(t('cost_approve_hint'))}</p>`); break;
    case 'acknowledge': f.push(`<label>${esc(t('planned'))}</label><input type="date" name="planned_date">`); break;
    case 'wait_parts': f.push(`<label>${esc(t('parts_eta'))}<span class="hint">${esc(t('parts_eta_hint'))}</span></label><input type="date" name="parts_expected_date" min="${bDate()}">`); break;
    case 'set_parts_eta': f.push(`<label>${esc(t('parts_eta'))}<span class="hint">${esc(t('parts_eta_hint'))} (${esc(t('planned_clear_hint'))})</span></label><input type="date" name="parts_expected_date" min="${bDate()}" value="${esc(c.parts_expected_date || '')}">`); break;
    case 'set_planned_date': f.push(`<label>${esc(t('planned'))}<span class="hint">${esc(t('planned_clear_hint'))}</span></label><input type="date" name="planned_date" value="${esc(c.planned_date || '')}">`); break;
    case 'record_work': f.push(`<label>${esc(t('hours'))}</label><input name="hours" inputmode="decimal" required><label>${esc(t('activity'))}</label><input name="description" required list="worksugg" autocomplete="off"><datalist id="worksugg"></datalist><label>${esc(t('date'))}</label><input type="date" name="work_date" value="${bDate()}">`); break;
    case 'add_part': f.push(`<div id="stocksel"></div><div id="freepart">`); f.push(`<label>${esc(t('part_name'))}</label><input name="name" required list="partsugg" autocomplete="off"><datalist id="partsugg"></datalist><label>${esc(t('part_number'))}</label><input name="part_number"><label>${esc(t('qty'))}</label><input name="quantity" inputmode="decimal" value="1"><label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label>${esc(t('supplier'))}</label><input name="supplier"></div>`); break;
    case 'add_open_item': f.push(`<label>${esc(t('open_items'))}</label><input name="description" required><label class="check"><input type="checkbox" name="safety_relevant"> ${esc(t('safety_relevant'))}</label>`); break;
    case 'add_external_cost': f.push(`<label>${esc(t('supplier'))}</label><input name="supplier" required><label>${esc(t('invoice_no'))}</label><input name="invoice_no"><label>${esc(t('amount_net'))}</label><input name="amount_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label class="check"><input type="checkbox" name="covers_work_and_parts"> ${esc(t('covers_all'))}</label>`); break;
  }
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
  if (action === 'add_part') loadStockSelect(c);
  $('#af').onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const p = { ...preset };
    for (const [k, v] of fd.entries()) if (k !== 'note' && v !== '') p[k] = v;
    for (const k of ['confirm', 'safety_relevant', 'covers_work_and_parts']) if (k in p) p[k] = true;
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
    <div class="detail" hidden><input name="${esc(i.key)}__note" placeholder="${esc(t('defect_note'))}"><label class="check"><input type="checkbox" name="${esc(i.key)}__safety"> ${esc(t('safety_relevant'))}</label></div></div>`).join('');
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
    <form id="f">${checklistHtml()}<label for="km">${esc(t('km'))}</label><input id="km" name="km" inputmode="numeric"><label for="n">${esc(t('note'))}</label><textarea id="n" name="n"></textarea>
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
    ${checklistHtml()}<label for="km">${esc(t('km'))}</label><input id="km" inputmode="numeric">
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
  const key = uid();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const body = { kind: 'abfahrt', vehicle_id: $('#v').value, request_key: key, items: collectChecklist(form), odometer_km: $('#km').value || null };
    const files = [...($('#ph').files || [])].slice(0, 10);
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
  return api('POST', '/api/vehicles', b);
}
async function viewVehicles() {
  const inact = !!S.vehInactive && isMgr();
  const vs = (await api('GET', '/api/vehicles' + (inact ? '?inactive=1' : ''))).vehicles;
  const f = S.vehKind || 'all';
  const av = S.vehAvail || 'all';
  const site = S.vehSite || '';
  const sites = [...new Set(vs.map((v) => v.site).filter(Boolean))].sort();
  const base = vs.filter((v) => (!site || v.site === site) && (f === 'all' || v.kind === f));
  // „Gespann gesperrt“: eigenes Fahrzeug nicht gesperrt, aber gekoppelter Anhänger/Lkw gesperrt (nur Information, Kopplung laut Stammliste)
  const cLocked = (v) => v.availability !== 'gesperrt' && v.coupled && v.coupled.availability === 'gesperrt';
  const nCL = base.filter(cLocked).length;
  const shown = base.filter((v) => av === 'all' || (av === 'coupled_locked' ? cLocked(v) : v.availability === av));
  const nT = vs.filter((v) => v.kind === 'anhaenger').length;
  const AV = ['gesperrt', 'werkstatt', 'meldung_offen', 'einsatzbereit_lt_system'];
  render(`<h1>${esc(t('vehicles'))}${inact ? ` · ${esc(t('inactive_vehicles'))}` : ''}</h1>${isMgr() ? `<details class="panel"><summary>${esc(t('new_vehicle'))}</summary><form id="nvf">${vehicleForm()}<div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    <p><label style="display:inline-flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="inact" ${inact ? 'checked' : ''} style="width:auto"> ${esc(t('inactive_vehicles'))}</label></p>` : ''}<input id="q" placeholder="SZ-…" aria-label="${esc(t('search_label'))}" style="margin-bottom:12px">
    ${nT ? `<div class="actions" role="tablist" style="margin-top:0">${[['all', t('filter_all'), vs.length], ['lkw', t('vk_lkw'), vs.length - nT], ['anhaenger', t('vk_anhaenger'), nT]].map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-vk="${k}" role="tab" aria-selected="${f === k}">${esc(l)} (${n})</button>`).join('')}</div>` : ''}
    ${S.me.role !== 'driver' ? `<div class="actions" style="flex-wrap:wrap;margin-top:0">${sites.length > 1 ? `<select id="vsite" aria-label="${esc(t('site'))}" style="max-width:220px"><option value="">${esc(t('site'))}: ${esc(t('filter_all'))}</option>${sites.map((x) => `<option${x === site ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>` : ''}
      ${[['all', t('filter_all'), base.length], ...AV.map((k) => [k, t('av_' + k), base.filter((v) => v.availability === k).length]), ...(nCL || av === 'coupled_locked' ? [['coupled_locked', t('av_coupled_locked'), nCL]] : [])].map(([k, l, n]) => `<button type="button" class="btn ${av === k ? '' : 'secondary'}" data-av="${k}">${esc(l)} (${n})</button>`).join('')}</div>` : ''}
    ${S.me.role !== 'driver' ? `<div class="actions" style="margin-top:0"><button type="button" class="btn secondary" id="vcsv">${esc(t('export_csv'))}</button>${isMgr() ? `<a class="btn secondary" href="#/vehicles/qr">${esc(t('qr_sheet'))}</a>` : ''}</div>` : ''}
    <div class="list" id="vl">${shown.map((v) => `<a class="row ${v.availability === 'gesperrt' ? 'p-kritisch' : v.availability === 'werkstatt' ? 'p-mittel' : ''}" href="#/vehicles/${esc(v.id)}" data-s="${esc((v.plate + ' ' + (v.site || '') + ' ' + (v.vin || '') + ' ' + (v.trailer_plate || '') + ' ' + (v.truck_plate || '')).toLowerCase())}">${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="title">${v.kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${v.eval_excluded ? `<span class="chip">${esc(t('eval_excluded'))}</span> ` : ''}${esc(v.manufacturer || '')} ${esc(v.build_year || '')}</span><span class="chip ${v.availability === 'gesperrt' ? 'gesperrt' : ''}">${esc(t('av_' + v.availability))}</span><span class="sub">${coupledChip(v.coupled)}${v.failed_inspection ? `<b class="chip kritisch">${esc(t('insp_failed_chip'))}: ${esc(mk(v.failed_inspection.kind))} – ${esc(t('res_' + v.failed_inspection.result))}</b><br>` : ''}${[v.site && esc(v.site), v.trailer_plate && esc(t('trailer')) + ' ' + esc(v.trailer_plate), v.truck_plate && esc(t('truck')) + ' ' + esc(v.truck_plate), v.next_due && esc(t('next_due')) + ' ' + fmtD(v.next_due), v.last_km && Number(v.last_km).toLocaleString('de-DE') + ' km', v.last_check_at && esc(t('departure_check')) + ' ' + fmtD(v.last_check_at) + (v.last_check_result === 'maengel' ? ' (' + esc(t('defect')) + ')' : ''), v.planned_workshop_date && esc(t('planned_ws_short')) + ' ' + fmtD(v.planned_workshop_date), v.planned_inspection_date && esc(t('planned_inspection')) + (v.planned_inspection_kind ? ' ' + esc(v.planned_inspection_kind) : '') + ' ' + fmtD(v.planned_inspection_date), v.parts_expected_date && esc(t('parts_eta')) + ' ' + fmtD(v.parts_expected_date)].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>`, 'vehicles');
  $$('[data-vk]').forEach((b) => (b.onclick = () => { S.vehKind = b.dataset.vk; viewVehicles(); }));
  $$('[data-av]').forEach((b) => (b.onclick = () => { S.vehAvail = b.dataset.av; viewVehicles(); }));
  const vcsv = $('#vcsv'); if (vcsv) vcsv.onclick = async () => { try { download(await api('GET', '/api/vehicles?format=csv' + (inact ? '&inactive=1' : '')), `fuhrpark-fahrzeuge_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
  const vsite = $('#vsite'); if (vsite) vsite.onchange = () => { S.vehSite = vsite.value; viewVehicles(); };
  const ia = $('#inact'); if (ia) ia.onchange = () => { S.vehInactive = ia.checked; viewVehicles(); };
  const nvf = $('#nvf'); if (nvf) nvf.onsubmit = async (e) => { e.preventDefault(); try { const r = await saveVehicleForm(nvf); toast('✓'); location.hash = '#/vehicles/' + encodeURIComponent(r.id); } catch (err) { toast(err.message, true); } };
  $('#q').oninput = () => { const q = $('#q').value.toLowerCase().replace(/\s/g, ''); $$('#vl a').forEach((a) => (a.hidden = q && !a.dataset.s.replace(/\s/g, '').includes(q))); };
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
// Fälligkeit nach Kilometern (nur wenn Intervall und letzte Durchführung in km belegt sind)
const fmtKm = (n) => Number(n).toLocaleString('de-DE') + ' km';
function kmDueHtml(m, latest) {
  if (!m.interval_km || m.last_done_km === null || m.last_done_km === undefined) return '';
  const next = m.last_done_km + m.interval_km;
  const rest = latest ? next - latest.km : null;
  return `<div class="small" style="margin-top:4px">${esc(t('due_at_km'))} ${fmtKm(next)}${rest === null ? '' : `<br><b style="${rest < 0 ? 'color:var(--stop)' : ''}">${rest < 0 ? esc(t('km_over')) + ' ' + fmtKm(-rest) : esc(t('km_left')) + ' ' + fmtKm(rest)}</b>`}${m.km_forecast ? `<br>${kmFcHtml(m.km_forecast, true)}` : ''}</div>`;
}
// Prognose der km-Fälligkeit (Server: aus gespeicherten km-Ständen, nur Planungshilfe) – Begründung als Tooltip und für Screenreader
const kmFcHint = (fc) => t('km_forecast_hint').replace('{from}', fmtD(fc.from)).replace('{to}', fmtD(fc.to)).replace('{kpd}', Number(fc.km_per_day).toLocaleString('de-DE'));
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
  return `<form data-mdone="${esc(m.id)}" hidden class="panel noprint"><h3 style="margin-top:0">${esc(t('done'))}: ${esc(mk(m.kind))}</h3><label>${esc(t('date'))} (${esc(mk(m.kind))})</label><input type="date" name="done_date" required value="${esc(bDate())}" max="${esc(bDate())}">${m.interval_km ? `<label>${esc(t('last_done_km'))}</label><input name="done_km" inputmode="numeric" required>` : ''}<label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" placeholder="${esc(t('evidence_ph'))}"><label>${esc(t('result'))}</label><select name="result"><option value="">–</option>${['ohne_maengel', 'geringe_maengel', 'erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'].map((r) => `<option value="${r}">${esc(t('res_' + r))}</option>`).join('')}</select><label>${esc(t('documented_due'))}</label><input type="date" name="next_due_date"><p class="small muted">${esc(t('mdone_hint'))}</p><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form>`;
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
    <p class="small muted">${esc(t('zgm'))}: ${v.zgm_kg ? `${Number(v.zgm_kg).toLocaleString('de-DE')} kg` : v.zgm_class ? esc(t('zc_' + v.zgm_class)) : '–'} · ${esc(t('first_reg'))}: ${fmtD(v.first_registration)}${v.spec_source ? ` · ${esc(t('evidence'))}: ${esc(v.spec_source)}` : ''} · ${esc(h.rule_version)}</p>
    ${isMgr() ? `<details class="panel"><summary>${esc(t('edit_spec'))}</summary><form id="specf"><label>${esc(t('zgm'))} (kg, F.2)</label><input name="zgm_kg" inputmode="numeric" value="${esc(v.zgm_kg || '')}">
      <label>${esc(t('zgm_class'))}</label><select name="zgm_class"><option value="">–</option>${clsList.map((c) => `<option value="${c}"${v.zgm_class === c ? ' selected' : ''}>${esc(t('zc_' + c))}</option>`).join('')}</select>
      <label>${esc(t('first_reg'))} (B)</label><input type="date" name="first_registration" value="${esc(v.first_registration || '')}"><label>${esc(t('evidence'))}</label><input name="spec_source" required placeholder="${esc(t('spec_src_ph'))}">
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}`;
}
async function viewVehicle(id, focusEv = null) {
  const d = await api('GET', '/api/vehicles/' + encodeURIComponent(id));
  const v = d.vehicle;
  const canMaint = isMgr() || S.me.role === 'workshop';
  const fi = d.failed_inspection; const fiHtml = fi ? `<div class="panel alert" role="alert" id="vfi"><b>${esc(t('dispo_insp_defects'))}</b><div>${esc(mk(fi.kind))} · ${fmtD(fi.done_date)} · <span class="chip kritisch">${esc(t('res_' + fi.result))}</span></div><div class="small">${esc(t('dispo_insp_hint'))}</div>${isMgr() ? `<div class="actions noprint"><button type="button" class="btn secondary" id="vfi-go">${esc(t('md_create'))}</button></div>` : ''}</div>` : '';
  // Prüfergebnis fehlt (in der App erfasste Pflichtprüfung ohne Ergebnis) – Knopf öffnet das Formular in „Bisherige Durchführungen“
  const rmHtml = (d.result_missing || []).length ? `<div class="panel" id="vrm"><b>${esc(t('dq_inspection_no_result'))}</b><div>${d.result_missing.map((r) => `${esc(mk(r.kind))} · ${fmtD(r.done_date)}`).join(' · ')}</div>${canMaint ? `<div class="actions noprint">${d.result_missing.map((r) => `<button type="button" class="btn secondary" data-rmgo="${esc(r.event_id)}">${esc(t('res_add_go'))}: ${esc(mk(r.kind))}</button>`).join('')}</div>` : ''}</div>` : '';
  let html = `<p class="noprint"><a href="#/vehicles">‹ ${esc(t('back'))}</a></p><div>${plate(v.plate, { big: true, locked: d.cases.some((c) => c.safety_lock && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)) })}</div>
    <h1 style="margin-top:12px">${esc(t('vehicle_file'))}</h1>${fiHtml}${rmHtml}<section class="panel"><dl class="kv"><dt>${esc(t('vin'))}</dt><dd>${esc(v.vin)}</dd><dt>${esc(t('manufacturer'))}</dt><dd>${esc(v.manufacturer || '–')} ${esc(v.model || '')}</dd><dt>${esc(t('year'))}</dt><dd>${esc(v.build_year || '–')}</dd><dt>${esc(t('site'))}</dt><dd>${esc(v.site || '–')}</dd><dt>${esc(t('vehicle_kind'))}</dt><dd>${esc(t('vk_' + (v.kind || 'lkw')))}</dd>${v.kind === 'anhaenger' ? `<dt>${esc(t('truck'))}</dt><dd>${(d.coupled || []).map((c) => `<a href="#/vehicles/${encodeURIComponent(c.id)}">${esc(c.plate)}</a>${c.locked ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}`).join(', ') || '–'}</dd>` : `<dt>${esc(t('trailer'))}</dt><dd>${(d.coupled || []).length ? d.coupled.map((c) => `<a href="#/vehicles/${encodeURIComponent(c.id)}">${esc(c.plate)}</a>${c.locked ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}`).join(', ') : esc(v.trailer_plate || '–')}</dd>`}<dt>${esc(t('km'))}</dt><dd>${d.odometer[0] ? Number(d.odometer[0].km).toLocaleString('de-DE') + ' km · ' + fmtD(d.odometer[0].measured_at) : '–'}</dd>${v.kind !== 'anhaenger' ? `<dt>${esc(t('last_check'))}</dt><dd>${d.last_check ? `${fmtDT(d.last_check.created_at)} <span class="chip ${d.last_check.result === 'ok' ? 'ok' : 'kritisch'}">${d.last_check.result === 'ok' ? 'OK' : esc(t('defect'))}</span> <span class="small muted">${esc(pnm(d.last_check.performed_by_name, d.last_check.performed_by_name_hidden))}</span>` : esc(t('last_check_none'))}<div class="small muted">${esc(t('last_check_info'))}</div></dd>` : ''}</dl></section>`;
  if (!v.active) html += `<div class="panel alert">${esc(t('vehicle_inactive'))}</div>`;
  if (v.eval_excluded) html += `<div class="panel alert"><b>${esc(t('eval_excluded'))}</b> – ${esc(t('eval_excluded_hint'))}${v.eval_excluded_reason ? `<div class="small">${esc(v.eval_excluded_reason)}</div>` : ''}</div>`;
  html += `<p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · CEVIK ${esc(t('app'))} [CLAUDE]</p><div class="actions noprint"><a class="btn secondary" href="#/vehicles/${esc(v.id)}/timeline">${esc(t('timeline'))}</a>${isMgr() ? `<a class="btn secondary" href="#/vehicles/qr/${esc(v.id)}">${esc(t('qr_sticker'))}</a>` : ''}<button type="button" class="btn secondary" id="prt">${esc(t('print'))}</button></div>`;
  if (isMgr()) html += `<details class="panel"><summary>${esc(t('edit_master'))}</summary><form id="evf">${vehicleForm(v)}<div class="actions"><button class="btn">${esc(t('save'))}</button>${v.active ? `<button type="button" class="btn secondary" id="deact">${esc(t('deactivate_vehicle'))}</button>` : `<button type="button" class="btn secondary" id="react">${esc(t('activate_vehicle'))}</button>`}<button type="button" class="btn secondary" id="evx">${esc(v.eval_excluded ? t('eval_include') : t('eval_exclude'))}</button></div></form></details>`;
  if (d.telematics && d.telematics.length) html += `<section class="panel"><h3 style="margin-top:0">${esc(t('tm_live'))}</h3>${d.telematics.map((x) => `<dl class="kv"><dt>${esc(t('tm_source'))}</dt><dd>${esc(x.provider)} (${esc(x.match_basis === 'vin' ? 'FIN' : t('tm_mappings'))})</dd><dt>${esc(t('tm_time'))}</dt><dd>${fmtDT(x.gps_time || x.received_at)}</dd>${x.km !== null ? `<dt>${esc(t('km'))}</dt><dd>${fmtKm(x.km)}</dd>` : ''}${x.ignition !== null ? `<dt>${esc(t('tm_ignition'))}</dt><dd>${esc(t(x.ignition ? 'tm_on' : 'tm_off'))}</dd>` : ''}${x.lat !== null && x.lon !== null ? `<dt>${esc(t('tm_position'))}</dt><dd><a href="https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lon}#map=14/${x.lat}/${x.lon}" target="_blank" rel="noopener noreferrer">${x.lat.toFixed(4)}, ${x.lon.toFixed(4)}</a></dd>` : ''}</dl>`).join('')}</section>`;
  if (d.tacho) html += `<section class="panel"><h3 style="margin-top:0">${esc(t('tacho_vu'))}</h3><dl class="kv"><dt>${esc(t('tacho_last'))}</dt><dd>${d.tacho.last ? fmtD(d.tacho.last) : '–'}</dd><dt>${esc(t('tacho_due'))}</dt><dd>${d.tacho.due ? fmtD(d.tacho.due) + ' ' : ''}<span class="chip ${TST[d.tacho.status]}">${esc(t('tst_' + d.tacho.status))}</span></dd></dl>
    <form id="tvf" class="actions" style="flex-wrap:wrap;align-items:flex-end"><div><label>${esc(t('tacho_date'))}</label><input type="date" name="downloaded_on" required value="${bDate()}"></div><div style="flex:1;min-width:200px"><label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('tacho_ev_ph'))}"></div><button class="btn secondary">${esc(t('tacho_record'))}</button></form></section>`;
  if (d.costs) html += `<section class="panel"><h3>${esc(t('costs'))}</h3><dl class="kv"><dt>${esc(t('actual_cost'))}</dt><dd>${eur(d.costs.actual_net)}</dd><dt>${esc(t('estimate'))}</dt><dd>${eur(d.costs.estimate_net)}</dd><dt>${esc(t('unvalued'))}</dt><dd>${d.costs.unvalued_items}</dd>${d.claims_summary && d.claims_summary.total ? `<dt>${esc(t('claims'))}</dt><dd>${d.claims_summary.total}${d.claims_summary.open ? ` · <a href="#/claims">${esc(t('claim_f_open'))}: ${d.claims_summary.open}</a>` : ''}${d.claims_summary.reimbursed_net !== null ? ` · ${esc(t('claim_reimbursed_short'))} ${eur(d.claims_summary.reimbursed_net)}` : ''}</dd>` : ''}</dl>${d.claims_summary && d.claims_summary.reimbursed_net !== null ? `<p class="small muted">${esc(t('vc_claims_rule'))}</p>` : ''}</section>`;
  const mOrders = new Map(d.cases.filter((c) => c.maintenance_rule_id && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)).map((c) => [c.maintenance_rule_id, c]));
  if (d.hu_sp) html += huSpHtml(d.hu_sp, v, canMaint, mOrders);
  html += `<h2>${esc(t('maintenance'))}</h2>${d.maintenance.length ? `<div class="scroll"><table><thead><tr><th>${esc(t('kind'))}</th><th>${esc(t('last_done'))}</th><th>${esc(t('next_due'))}</th>${canMaint ? '<th></th>' : ''}</tr></thead><tbody>${d.maintenance.map((m) => { const days = m.next_due_date ? Math.round((Date.parse(m.next_due_date) - Date.now()) / 86400000) : null; return `<tr><td>${esc(mk(m.kind))}</td><td>${fmtD(m.last_done_date)}</td><td>${m.next_due_date ? `<span class="chip ${days < 0 ? 'kritisch' : days < 30 ? 'mittel' : ''}">${fmtD(m.next_due_date)}</span>` : (m.interval_km && m.last_done_km !== null ? '' : '–')}${kmDueHtml(m, d.odometer[0])}</td>${canMaint ? `<td><button class="btn secondary" data-done="${esc(m.id)}" aria-expanded="false">${esc(t('done'))}</button></td>` : ''}</tr><tr><td colspan="${canMaint ? 4 : 3}" class="small muted" style="border-top:0;padding-top:0">${esc(t('evidence'))}: ${esc(m.evidence)}${m.km_forecast ? `<br>${esc(kmFcHint(m.km_forecast))}` : ''}${m.planned_date ? ` · <b>${esc(t('planned_appt'))} ${fmtD(m.planned_date)}</b>` : ''}${canMaint && !['HU', 'SP'].includes(m.kind) ? `<details class="noprint"><summary>${esc(t('plan_appt'))}</summary><form data-hsplan="${esc(m.id)}"><label>${esc(t('planned_appt'))} (${esc(mk(m.kind))})</label><input type="date" name="planned_date" value="${esc(m.planned_date || '')}"><p class="small muted">${esc(t('plan_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>` : ''}${!['HU', 'SP'].includes(m.kind) ? maintOrderHtml(m.id, m.kind, mOrders, v) : ''}</td></tr>`; }).join('')}</tbody></table></div>${canMaint ? d.maintenance.map(maintDoneForm).join('') : ''}` : '<p class="muted">–</p>'}`;
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

    html += `<details class="panel" id="mhist"${pending && isMgr() ? ' open' : ''}><summary>${esc(t('maint_history'))} (${d.maintenance_history.length})</summary><div class="list">${d.maintenance_history.map((h) => `<div class="row"><span class="chip">${fmtD(h.done_date)}</span><span class="title">${esc(mk(h.kind))}${h.done_km !== null ? ' · ' + fmtKm(h.done_km) : ''}</span>${h.result ? `<span class="chip ${DEFECT_RESULTS.includes(h.result) ? 'kritisch' : h.result === 'ohne_maengel' ? 'ok' : ''}">${esc(t('res_' + h.result))}</span>` : '<span></span>'}<span class="sub" style="white-space:normal">${esc(h.evidence)}${h.recorded_by_name ? ' · ' + esc(h.recorded_by_name) : ''}</span></div>${reinspHtml(h)}${resAddHtml(h)}${defectOrderHtml(h, evOrders, v, caseSince(h), releasedFor(h), !!nextOf(h))}`).join('')}</div></details>`;
  }
  if (canMaint) html += `<details class="panel"><summary>${esc(t('add_rule'))}</summary><form id="mf"><label>${esc(t('kind'))}</label><select name="kind">${S.meta.maintenance_kinds.map((k) => `<option value="${esc(k)}">${esc(mk(k))}</option>`).join('')}</select><label>${esc(t('last_done'))}</label><input type="date" name="last_done_date" max="${esc(bDate())}"><label>${esc(t('interval_months'))}</label><input name="interval_months" inputmode="numeric"><label>${esc(t('next_due'))}</label><input type="date" name="next_due_date"><label>${esc(t('last_done_km'))}</label><input name="last_done_km" inputmode="numeric"><label>${esc(t('interval_km'))}</label><input name="interval_km" inputmode="numeric"><label>${esc(t('evidence'))}</label><input name="evidence" required><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
  if (d.documents) {
    const canDoc = ['owner', 'fleet', 'workshop'].includes(S.me.role);
    html += `<h2>${esc(t('documents'))}</h2>${d.documents.length ? `<div class="list">${d.documents.map((f) => `<a class="row" href="${fileUrl(f.id)}" target="_blank" rel="noopener"><span class="chip">${esc(t('dk_' + (f.doc_kind || 'sonstiges')))}</span><span class="title">${esc(f.filename)}</span><span class="small muted">${Math.max(1, Math.round(f.size / 1024))} KB</span><span class="sub">${[f.doc_valid_until && `${esc(t('valid_until'))} ${fmtD(f.doc_valid_until)}`, f.doc_note && esc(f.doc_note), fmtD(f.created_at), esc(f.uploaded_by_name)].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>` : `<p class="muted">–</p>`}
      ${canDoc ? `<details class="panel noprint"><summary>${esc(t('add_document'))}</summary><form id="docf"><label>${esc(t('doc_kind'))}</label><select name="kind">${(S.meta.doc_kinds || []).map((k) => `<option value="${k}">${esc(t('dk_' + k))}</option>`).join('')}</select><label>${esc(t('note'))}</label><input name="note" maxlength="200"><label>${esc(t('valid_until'))}<span class="hint">${esc(t('valid_until_hint'))}</span></label><input type="date" name="valid_until"><label>${esc(t('file'))}<span class="hint">PDF, JPG, PNG, WEBP · max. 5 MB</span></label><input type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp" required><div class="actions"><button class="btn">${esc(t('upload'))}</button></div></form></details>` : ''}`;
  }
  if (d.contracts) html += ctSection(d.contracts, d.documents || null);
  html += `<h2>${esc(t('tires'))}</h2><div id="tires"><p class="muted">${esc(t('loading'))}</p></div>`;
  html += `<h2>${esc(t('nav_cases'))}</h2>${caseList(d.cases.map((c) => ({ ...c, plate: v.plate })))}`;
  if (d.recurring_defects && d.recurring_defects.length) html += `<section class="panel"><h2 style="margin-top:0">${esc(t('recurring_defects'))}</h2><p class="small muted">${esc(t('recurring_hint'))}</p><ul>${d.recurring_defects.map((r) => `<li><b>${esc(checkLabel(r.item))}</b>: ${r.n}× · ${esc(t('last_used'))} ${fmtD(r.last_at)}</li>`).join('')}</ul></section>`;
  if (d.inspections.length) html += `<h2>${esc(t('inspections'))}</h2><div class="list">${d.inspections.map((i) => `<div class="row"><span class="chip ${i.result === 'ok' ? 'ok' : 'kritisch'}">${i.result === 'ok' ? 'OK' : esc(t('defect'))}</span><span class="title">${esc(i.kind === 'abfahrt' ? t('departure_check') : t('inspection'))}</span><span>${i.odometer_km ? Number(i.odometer_km).toLocaleString('de-DE') + ' km' : ''}</span><span class="sub">${fmtDT(i.created_at)} · ${esc(pnm(i.performed_by_name, i.performed_by_name_hidden))}</span></div>`).join('')}</div>`;
  if (isMgr()) {
    html += `<h2>${esc(t('drivers'))}</h2>${d.drivers.length ? `<div class="list">${d.drivers.map((r) => `<div class="row"><span>${esc(r.display_name)}</span><span class="small muted">${fmtD(r.valid_from)} – ${r.valid_to ? fmtD(r.valid_to) : ''}</span>${!r.valid_to ? `<button class="btn secondary" data-end="${esc(r.id)}">${esc(t('end'))}</button>` : '<span></span>'}</div>`).join('')}</div>` : ''}
      <form id="df"><div class="actions"><select name="user_id" id="drvsel" style="max-width:300px" aria-label="${esc(t('assign_driver'))}"></select><button class="btn secondary">${esc(t('assign_driver'))}</button></div><label class="small"><input type="checkbox" id="endprev" checked> ${esc(t('end_previous'))}</label></form>`;
  }
  html += `<details class="panel"><summary>${esc(t('add_km'))}</summary><form id="kf"><label>${esc(t('km'))}</label><input name="km" inputmode="numeric" required style="max-width:200px"><label>${esc(t('km_date'))}<span class="hint">${esc(t('km_date_hint'))}</span></label><input type="date" name="measured_on" max="${bDate()}" style="max-width:200px"><div id="kmnote" hidden><label>${esc(t('km_reason'))}</label><input name="note" maxlength="300"></div><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>`;
  if (canMaint) html += `<section class="panel noprint"><h3>${esc(t('ai'))}</h3><div id="ai"></div><button class="btn secondary" id="aib">${esc(t('ai_run'))}</button></section>`;
  render(html, isMgr() ? 'master' : 'vehicles');

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
  const deact = $('#deact'); if (deact) deact.onclick = async () => { const reason = prompt(t('deactivate_reason')); if (!reason) return; try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/active`, { active: false, reason }); if (r.running_contracts) toast(t('ct_running_deact').replace('{n}', r.running_contracts), true); else toast('✓'); viewVehicle(id); } catch (err) { toast(err.message, true); } };
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
  $$('[data-end]').forEach((b) => (b.onclick = async () => { try { await api('DELETE', '/api/assignments/' + b.dataset.end); viewVehicle(id); } catch (err) { toast(err.message, true); } }));
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
  const r = await api('GET', `/api/contracts?filter=${f}${k ? '&kind=' + k : ''}`);
  render(`<h1>${esc(t('ct_title'))}</h1>${helpLink('contracts')}<p class="small muted">${esc(t('ct_hint'))}</p>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · ${esc(t('cf_' + f))}${k ? ' · ' + esc(t('ck_' + k)) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="actions noprint" style="flex-wrap:wrap">${['aktiv', 'aktion', 'beendet', 'alle'].map((x) => `<button type="button" class="btn ${f === x ? '' : 'secondary'}" data-cf="${x}">${esc(t('cf_' + x))} (${r.counts[x]})</button>`).join('')}</div>
    <div class="actions noprint" style="margin-top:0"><select id="ctk" aria-label="${esc(t('ct_kind'))}" style="max-width:260px"><option value="">${esc(t('ct_all_kinds'))}</option>${CT_KINDS.map((x) => `<option value="${x}"${k === x ? ' selected' : ''}>${esc(t('ck_' + x))}</option>`).join('')}</select></div>
    ${f !== 'beendet' ? `<p>${esc(t('ct_rate_sum'))}: <b>${eur(r.monthly_rate_sum_net)}</b>${r.unrated ? ` <span class="small muted">· ${r.unrated} ${esc(t('ct_unrated'))}</span>` : ''}</p>` : ''}
    <div class="list">${r.contracts.length ? r.contracts.map((c) => `<a class="row ${c.status.overall === 'handeln' ? 'p-kritisch' : c.status.overall === 'hinweis' ? 'p-mittel' : ''}" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${plate(c.plate)}<span class="title">${esc(t('ck_' + c.kind))} · ${esc(c.partner)}</span>${ctChip(c.status)}<span class="sub" style="white-space:normal">${ctLines(c).slice(0, -1).join(' · ').replace(/<br>/g, ' · ')}${c.file_id ? ` · 📎 ${esc(t('ct_doc_linked'))}` : ''}</span></a>`).join('') : `<p class="muted">${esc(t('ct_none'))}</p>`}</div>
    <div class="actions noprint"><button type="button" class="btn secondary" id="ctcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="ctics" title="${esc(t('ct_ics_hint'))}">${esc(t('export_ics'))}</button><button type="button" class="btn secondary" id="ctprt">${esc(t('print'))}</button></div>
    <details class="panel noprint"><summary>${esc(t('ct_import'))}</summary><p class="small muted">${esc(t('ct_import_hint'))}</p>
      <label for="ctsrc">${esc(t('ct_import_src'))}</label><input id="ctsrc" maxlength="300"><input type="file" id="ctimp" accept=".csv,text/csv" aria-label="${esc(t('ct_import'))}" style="margin-top:8px"><div id="ctimpr"></div></details>`, 'more');
  $$('[data-cf]').forEach((b) => (b.onclick = () => { S.ctFilter = b.dataset.cf; viewContracts(); }));
  $('#ctk').onchange = () => { S.ctKind = $('#ctk').value; viewContracts(); };
  $('#ctprt').onclick = () => window.print();
  const inp = $('#ctimp');
  inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    const text = await file.text(); const src = $('#ctsrc').value.trim(); const q = src ? `&source=${encodeURIComponent(src)}` : '';
    const show = (x, applied) => {
      const box = $('#ctimpr'); if (!box) return;
      box.innerHTML = `<p><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(t('ia_neu'))}: ${x.counts.neu} · ${esc(t('ct_known'))}: ${x.counts.vorhanden} · ${esc(t('skipped'))}: ${x.counts.uebersprungen}</p>
        ${x.rows.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('line'))}</th><th>${esc(t('vehicle'))}</th><th>${esc(t('ct_kind'))}</th><th>${esc(t('ct_partner'))}</th><th>${esc(t('ct_end'))}</th><th></th></tr></thead><tbody>${x.rows.map((r) => `<tr><td>${r.line}</td><td style="white-space:nowrap">${esc(r.plate)}</td><td>${esc(t('ck_' + r.kind))}</td><td>${esc(r.partner)}${r.contract_no ? ' · ' + esc(r.contract_no) : ''}</td><td>${fmtD(r.end_date)}</td><td><span class="chip ${r.status === 'neu' ? 'ok' : ''}">${esc(r.status === 'neu' ? t('ia_neu') : t('ct_known'))}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${x.skipped.length ? `<details ${applied ? '' : 'open'}><summary>${esc(t('skipped'))} (${x.skipped.length})</summary><ul class="small">${x.skipped.map((y) => `<li>${esc(t('line'))} ${y.line}: ${esc(y.reason)}</li>`).join('')}</ul></details>` : ''}
        ${!applied && x.counts.neu ? `<div class="actions"><button type="button" class="btn" id="ctapply">${esc(t('apply_import'))}</button></div>` : ''}`;
      stackTables(box);
      const ap = $('#ctapply');
      if (ap) ap.onclick = async () => { ap.disabled = true; try { const done = await api('POST', '/api/contracts/import' + (q ? '?' + q.slice(1) : ''), text, { headers: { 'content-type': 'text/csv' } }); toast('✓'); await viewContracts(); const d = $('#ctimpr'); if (d) { d.closest('details').open = true; show(done, true); } } catch (err) { ap.disabled = false; toast(err.message, true); } };
    };
    try { show(await api('POST', '/api/contracts/import?dry_run=1' + q, text, { headers: { 'content-type': 'text/csv' } }), false); } catch (err) { toast(err.message, true); }
  };
  $('#ctics').onclick = async () => { try { download(await api('GET', `/api/contracts?format=ics&filter=aktiv${k ? '&kind=' + k : ''}`), `fuhrpark-vertraege_${r.today}.ics`); } catch (err) { toast(err.message, true); } };
  $('#ctcsv').onclick = async () => { try { download(await api('GET', `/api/contracts?format=csv&filter=${f}${k ? '&kind=' + k : ''}`), `fuhrpark-vertraege_${r.today}.csv`); } catch (err) { toast(err.message, true); } };
}

async function renderTires(id, el) {
  let d;
  try { d = await api('GET', `/api/vehicles/${encodeURIComponent(id)}/tires`); } catch (e) { el.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
  const canWrite = ['owner', 'fleet', 'workshop'].includes(S.me.role);
  const stCls = { ok: 'ok', warnung: 'mittel', unter_minimum: 'kritisch', unbekannt: '' };
  el.innerHTML = `<section class="panel"><h3>${esc(t('tire_sizes'))}</h3>${d.specs.length ? d.specs.map((s) => `<div class="specrow"><div><span class="muted">${esc(t('axle_' + s.axle))}</span> <b>${esc(s.size)}</b></div><div>${s.verified ? `<span class="chip ok">${esc(t('verified'))}</span>` : `<span class="chip mittel">${esc(t('source_unverified'))}</span>`}${canWrite && !s.verified ? ` <button class="btn secondary small" data-ver="${esc(s.axle)}" data-size="${esc(s.size)}">${esc(t('mark_verified'))}</button>` : ''}</div></div>`).join('') : '<p class="muted">–</p>'}</section>
    <section class="panel"><h3>${esc(t('positions'))}</h3>${d.positions.length ? `<div class="scroll"><table><thead><tr><th>${esc(t('position'))}</th><th>${esc(t('tread'))}</th><th></th></tr></thead><tbody>${d.positions.map((p) => `<tr><td><b>${esc(p.position)}</b><div class="small muted">${esc(t('te_' + p.last_event))} · ${fmtD(p.last_event_at)}</div></td><td>${p.tread_mm === null ? '–' : esc(String(p.tread_mm).replace('.', ','))}</td><td><span class="chip ${stCls[p.status]}">${esc(t('ts_' + p.status))}</span></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">–</p>'}
    <details><summary>${esc(t('record_tire'))}</summary><form id="tf">
      <label>${esc(t('kind'))}</label><select name="event_type">${S.meta.tire_events.filter((e) => canWrite || ['messung', 'sichtpruefung'].includes(e)).map((e) => `<option value="${e}">${esc(t('te_' + e))}</option>`).join('')}</select>
      <label>${esc(t('position'))}</label><select name="position">${S.meta.tire_positions.map((p) => `<option>${esc(p)}</option>`).join('')}</select>
      <label>${esc(t('tread'))}</label><input name="tread_mm" inputmode="decimal"><label>${esc(t('pressure'))}</label><input name="pressure_bar" inputmode="decimal">
      <label>${esc(t('tire_sizes'))}</label><input name="size" placeholder="315/70 R22.5"><label>${esc(t('brand'))}</label><input name="brand"><label>${esc(t('dot'))}</label><input name="dot" inputmode="numeric">
      <label>${esc(t('km'))}</label><input name="odometer_km" inputmode="numeric"><label>${esc(t('note'))}</label><input name="note">
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details></section>
    ${d.history.length ? `<details class="panel"><summary>${esc(t('history'))} (${d.history.length})</summary><table>${d.history.map((h) => `<tr><td class="small">${fmtDT(h.created_at)}</td><td>${esc(h.position)}</td><td>${esc(t('te_' + h.event_type))}${h.tread_mm !== null ? ' · ' + esc(String(h.tread_mm).replace('.', ',')) + ' mm' : ''}${h.pressure_bar !== null ? ' · ' + esc(String(h.pressure_bar).replace('.', ',')) + ' bar' : ''}${h.size ? ' · ' + esc(h.size) : ''}${h.brand ? ' · ' + esc(h.brand) : ''}${h.note ? '<br><span class="small muted">' + esc(h.note) + '</span>' : ''}</td><td class="small">${esc(pnm(h.recorded_by_name, h.recorded_by_name_hidden))}</td></tr>`).join('')}</table></details>` : ''}`;
  const tf = $('#tf', el);
  tf.onsubmit = async (e) => {
    e.preventDefault();
    const b = Object.fromEntries(new FormData(tf));
    for (const k of Object.keys(b)) if (b[k] === '') delete b[k];
    try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/tires/events`, b); (r.warnings || []).forEach((w) => toast(w, true)); if (!r.warnings || !r.warnings.length) toast('✓'); renderTires(id, el); }
    catch (err) { toast(err.message, true); }
  };
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
  const items = (await api('GET', '/api/stock')).items;
  const sites = S.me.role === 'workshop' ? S.meta.workshops.filter((w) => w.code === S.me.workshop_site) : S.meta.workshops;
  render(`<h1>${esc(t('stock'))}</h1>${helpLink('stock')}
    <details class="panel"><summary>${esc(t('new_item'))}</summary><form id="nf">
      ${sites.length > 1 ? `<label>${esc(t('workshop'))}</label><select name="site">${sites.map((w) => `<option value="${esc(w.code)}">${esc(w.name)}</option>`).join('')}</select>` : ''}
      <label>${esc(t('part_name'))}</label><input name="name" required><label>${esc(t('part_number'))}</label><input name="part_number">
      <label>${esc(t('unit'))}</label><input name="unit" value="Stk"><label>${esc(t('initial_qty'))}</label><input name="initial_qty" inputmode="decimal">
      <label>${esc(t('min_qty'))}</label><input name="min_qty" inputmode="decimal"><label>${esc(t('storage'))}</label><input name="location">
      <label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    <div class="actions"><button type="button" class="btn secondary" id="scsv">${esc(t('export_csv'))}</button><a class="btn secondary" href="#/stock/reorder">${esc(t('reorder'))}${items.some((i) => i.below_min) ? ` <span class="chip mittel">${items.filter((i) => i.below_min).length}</span>` : ''}</a></div>
    ${items.length ? `<details class="panel" id="inv"><summary>${esc(t('inventory'))}</summary><p class="small muted">${esc(t('inventory_hint'))}</p>
      ${sites.length > 1 ? `<label for="invsite">${esc(t('workshop'))}</label><select id="invsite">${sites.map((w) => `<option value="${esc(w.code)}">${esc(w.name)}</option>`).join('')}</select>` : ''}
      <div id="invlist"></div><label for="invnote">${esc(t('note'))}</label><input id="invnote" maxlength="300">
      <div class="actions"><button type="button" class="btn secondary" id="invchk">${esc(t('inventory_check'))}</button><button type="button" class="btn" id="invbook" disabled>${esc(t('inventory_book'))}</button></div><div id="invres"></div></details>` : ''}
    <input id="q" placeholder="${esc(t('part_name'))} / ${esc(t('part_number'))}" style="margin-bottom:12px">
    <div class="list" id="sl">${items.map((i) => `<a class="row ${i.below_min ? 'p-mittel' : ''}" href="#/stock/${esc(i.id)}" data-s="${esc((i.name + ' ' + (i.part_number || '')).toLowerCase())}"><span class="chip">${esc(i.site)}</span><span class="title">${esc(i.name)}</span><b>${i.on_hand} ${esc(i.unit)}</b><span class="sub">${[i.part_number && esc(i.part_number), i.location && esc(i.location), i.below_min && esc(t('below_min')) + ' (' + i.min_qty + ')', i.unit_price_net !== null && eur(i.unit_price_net)].filter(Boolean).join(' · ')}</span></a>`).join('') || `<p class="muted">–</p>`}</div>`, 'more');
  $('#q').oninput = () => { const q = $('#q').value.toLowerCase(); $$('#sl a').forEach((a) => (a.hidden = q && !a.dataset.s.includes(q))); };
  $('#scsv').onclick = async () => { try { download(await api('GET', '/api/stock?format=csv'), `fuhrpark-lager_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
  if ($('#inv')) {
    const invSite = () => ($('#invsite') ? $('#invsite').value : sites[0] && sites[0].code);
    const fill = () => { $('#invlist').innerHTML = `<div class="scroll"><table><thead><tr><th>${esc(t('part_name'))}</th><th>${esc(t('inventory_book_qty'))}</th><th>${esc(t('inventory_counted'))}</th></tr></thead><tbody>${items.filter((i) => i.site === invSite()).map((i) => `<tr><td>${esc(i.name)}${i.location ? `<div class="small muted">${esc(i.location)}</div>` : ''}</td><td>${i.on_hand} ${esc(i.unit)}</td><td><input data-inv="${esc(i.id)}" inputmode="decimal" style="max-width:110px" aria-label="${esc(t('inventory_counted'))} ${esc(i.name)}"></td></tr>`).join('')}</tbody></table></div>`; $('#invbook').disabled = true; $('#invres').innerHTML = ''; };
    fill(); if ($('#invsite')) $('#invsite').onchange = fill;
    const body = () => ({ site: invSite(), note: $('#invnote').value || null, counts: $$('[data-inv]').map((x) => ({ item_id: x.dataset.inv, counted: x.value.trim() === '' ? '' : x.value.replace(',', '.') })) });
    const show = (r, booked) => { $('#invres').innerHTML = r.differences.length ? `<div class="list">${r.differences.map((d) => `<div class="row ${booked ? '' : 'p-mittel'}"><span class="title">${esc(d.name)}</span><b>${d.delta > 0 ? '+' : ''}${d.delta} ${esc(d.unit)}</b><span class="sub" style="white-space:normal">${esc(t('inventory_book_qty'))} ${d.book} → ${esc(t('inventory_counted'))} ${d.counted}</span></div>`).join('')}</div>` : `<p>${esc(t('inventory_no_diff'))}</p>`; };
    $('#invchk').onclick = async () => { try { const r = await api('POST', '/api/stock/inventory?dry_run=1', body()); show(r, false); $('#invbook').disabled = !r.differences.length; } catch (err) { toast(err.message, true); } };
    $('#invbook').onclick = async () => { try { const r = await api('POST', '/api/stock/inventory', body()); toast(`✓ ${r.booked}`); viewStock(); } catch (err) { toast(err.message, true); } };
  }
  $('#nf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k of Object.keys(b)) { if (b[k] === '') delete b[k]; else if (['initial_qty', 'min_qty', 'unit_price_net'].includes(k)) b[k] = b[k].replace(',', '.'); } try { await api('POST', '/api/stock', b); viewStock(); } catch (err) { toast(err.message, true); } };
}

// Bestellvorschlag: Artikel unter Mindestbestand mit Fehlmenge – es wird nichts bestellt (Liste für den Einkauf)
async function viewReorder() {
  const sites = S.me.role === 'workshop' ? [] : S.meta.workshops;
  const site = sessionStorage.getItem('cfp_reorder_site') || '';
  const q = site && sites.some((w) => w.code === site) ? `&site=${encodeURIComponent(site)}` : '';
  const items = (await api('GET', '/api/stock?reorder=1' + q)).items;
  const valued = items.filter((i) => i.shortfall_value_net !== null);
  const sum = Math.round(valued.reduce((a, i) => a + i.shortfall_value_net, 0) * 100) / 100;
  const n = (x) => String(x).replace('.', ',');
  render(`<p class="noprint"><a href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('reorder'))}</h1>
    <p class="small muted">${esc(t('reorder_hint'))}</p>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    ${sites.length > 1 ? `<div class="noprint"><label for="rsite">${esc(t('workshop'))}</label><select id="rsite"><option value="">${esc(t('all'))}</option>${sites.map((w) => `<option value="${esc(w.code)}"${q && w.code === site ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}</select></div>` : ''}
    <div class="actions noprint"><button type="button" class="btn secondary" id="rcsv"${items.length ? '' : ' disabled'}>${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="rprt">${esc(t('print'))}</button></div>
    ${items.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('workshop'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('on_hand'))}</th><th>${esc(t('min_qty'))}</th><th>${esc(t('shortfall'))}</th><th>${esc(t('used_90d'))}</th><th>${esc(t('shortfall_value'))}</th></tr></thead><tbody>
      ${items.map((i) => `<tr><td>${esc(wsName(i.site))}</td><td><a href="#/stock/${esc(i.id)}">${esc(i.name)}</a>${i.part_number || i.location ? `<div class="small muted">${[i.part_number, i.location].filter(Boolean).map(esc).join(' · ')}</div>` : ''}</td><td>${n(i.on_hand)} ${esc(i.unit)}</td><td>${n(i.min_qty)}</td><td><b>${n(i.shortfall)} ${esc(i.unit)}</b></td><td>${n(i.used_90d)}</td><td>${i.shortfall_value_net === null ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : eur(i.shortfall_value_net)}</td></tr>`).join('')}
      </tbody></table></div>
      <p><b>${esc(t('reorder_sum'))}:</b> ${eur(sum)}${valued.length < items.length ? ` <span class="small muted">(${items.length - valued.length} ${esc(t('unvalued_positions'))})</span>` : ''}</p>` : `<p class="muted">${esc(t('reorder_none'))}</p>`}`, 'more');
  if ($('#rsite')) $('#rsite').onchange = () => { try { sessionStorage.setItem('cfp_reorder_site', $('#rsite').value); } catch {} viewReorder(); };
  $('#rprt').onclick = () => window.print();
  $('#rcsv').onclick = async () => { try { download(await api('GET', '/api/stock?reorder=1&format=csv' + q), `fuhrpark-bestellvorschlag_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
}

async function viewStockItem(id) {
  const d = await api('GET', '/api/stock/' + id);
  const it = d.item;
  render(`<p><a href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(it.name)}</h1>
    <section class="panel"><dl class="kv"><dt>${esc(t('on_hand'))}</dt><dd><b style="font-size:1.4rem">${it.on_hand} ${esc(it.unit)}</b></dd><dt>${esc(t('part_number'))}</dt><dd>${esc(it.part_number || '–')}</dd><dt>${esc(t('workshop'))}</dt><dd>${esc(wsName(it.site))}</dd><dt>${esc(t('storage'))}</dt><dd>${esc(it.location || '–')}</dd><dt>${esc(t('min_qty'))}</dt><dd>${it.min_qty ?? '–'}</dd><dt>€</dt><dd>${eur(it.unit_price_net)}</dd></dl></section>
    <form id="mf" class="panel"><h3>${esc(t('book'))}</h3><label>${esc(t('kind'))}</label><select name="type"><option value="zugang">${esc(t('mv_zugang'))}</option><option value="entnahme">${esc(t('mv_entnahme'))}</option><option value="korrektur">${esc(t('mv_korrektur'))}</option></select>
      <label>${esc(t('qty'))}</label><input name="qty" inputmode="decimal" required><label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><label>${esc(t('supplier'))}</label><input name="supplier"><label>${esc(t('doc_ref'))}</label><input name="document_ref"><label>${esc(t('note'))}</label><input name="note">
      <div class="actions"><button class="btn">${esc(t('book'))}</button></div></form>
    <h2>${esc(t('history'))}</h2><div class="scroll"><table>${d.movements.map((m) => `<tr><td class="small">${fmtDT(m.created_at)}</td><td>${esc(t('mv_' + m.type))}</td><td><b>${m.qty > 0 ? '+' : ''}${m.qty}</b></td><td class="small">${m.case_no ? `<a href="#/cases/${esc(m.case_id)}">${esc(m.case_no)}</a> · ` : ''}${esc(m.supplier || '')} ${esc(m.document_ref || '')} ${esc(m.note || '')}<br>${esc(m.user_name)}</td></tr>`).join('')}</table></div>`, 'more');
  $('#mf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k of Object.keys(b)) { if (b[k] === '') delete b[k]; else if (['qty', 'unit_price_net'].includes(k)) b[k] = b[k].replace(',', '.'); } try { await api('POST', `/api/stock/${id}/movements`, b); viewStockItem(id); } catch (err) { toast(err.message, true); } };
}


async function viewFines() {
  const list = (await api('GET', '/api/fines')).fines;
  const mgr = isMgr();
  const today = bDate();
  let html = `<h1>${esc(mgr ? t('fines') : t('my_fines'))}</h1>${helpLink(mgr ? 'fines' : 'myfines')}`;
  if (mgr) html += `<details class="panel"><summary>${esc(t('new_fine'))}</summary><form id="nf">
    <label>${esc(t('kind'))}</label><select name="kind">${S.meta.fine_kinds.map((k) => `<option value="${k}">${esc(t('fk_' + k))}</option>`).join('')}</select>
    <label>${esc(t('authority'))}</label><input name="authority" required><label>${esc(t('reference'))}</label><input name="reference">
    <label>${esc(t('offense'))}</label><select name="offense_type">${S.meta.fine_offenses.map((k) => `<option value="${k}">${esc(t('of_' + k))}</option>`).join('')}</select>
    <label>${esc(t('offense_at'))}</label><input type="datetime-local" name="offense_at" required><label>${esc(t('offense_place'))}</label><input name="location">
    <label>${esc(t('plate_letter'))}</label><input name="plate_in_letter" required placeholder="SZ-YC 5513"><label>${esc(t('amount'))}</label><input name="amount_eur" inputmode="decimal">
    <label>${esc(t('response_due'))}</label><input type="date" name="response_due"><label>${esc(t('note'))}</label><textarea name="note"></textarea>
    <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
  html += `<div class="list">${list.map((f) => { const over = f.response_due && f.response_due < today && ['eingegangen', 'fahrer_ermittelt', 'fahrer_informiert'].includes(f.status); return `<a class="row ${over ? 'p-kritisch' : ''}" href="#/fines/${esc(f.id)}">${plate(f.plate || f.plate_in_letter)}<span class="title">${esc(t('fk_' + f.kind))} · ${esc(t('of_' + f.offense_type))}</span><span class="chip ${over ? 'kritisch' : ['bezahlt', 'eingestellt', 'erledigt', 'beantwortet'].includes(f.status) ? 'ok' : ''}">${esc(t('fs_' + f.status))}</span><span class="sub">${esc(f.fine_no)} · ${fmtDT(f.offense_at)}${f.authority ? ' · ' + esc(f.authority) : ''}${f.response_due ? ' · ' + esc(t('response_due')) + ' ' + fmtD(f.response_due) : ''}${f.driver_name ? ' · ' + esc(f.driver_name) : ''}</span></a>`; }).join('') || `<p class="muted">–</p>`}</div>`;
  if (['owner', 'fleet', 'viewer'].includes(S.me.role)) html += `<div class="actions" style="flex-wrap:wrap"><button type="button" class="btn secondary" id="fcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="fics">${esc(t('export_ics'))}</button>${mgr ? `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="fdrv"> ${esc(t('with_driver_names'))}</label>` : ''}</div>`;
  render(html, 'more');
  const day = bDate();
  const fc = $('#fcsv'); if (fc) fc.onclick = async () => { try { download(await api('GET', `/api/fines?format=csv${$('#fdrv') && $('#fdrv').checked ? '&with_driver=1' : ''}`), `fuhrpark-bussgelder_${day}.csv`); } catch (err) { toast(err.message, true); } };
  const fi = $('#fics'); if (fi) fi.onclick = async () => { try { download(await api('GET', '/api/fines?format=ics'), `fuhrpark-behoerdenfristen_${day}.ics`); } catch (err) { toast(err.message, true); } };
  const nf = $('#nf');
  if (nf) nf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(nf)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; if (b.amount_eur) b.amount_eur = b.amount_eur.replace(',', '.'); b.offense_at = new Date(b.offense_at).toISOString(); try { const r = await api('POST', '/api/fines', b); if (!r.vehicle_matched) toast(t('vehicle_unknown'), true); location.hash = '#/fines/' + r.id; } catch (err) { toast(err.message, true); } };
}

const FINE_EV = { create: 'new_fine', confirm_driver: 'confirm_driver', inform_driver: 'inform_driver', set_status: 'set_status', driver_ack: 'ack_fine', update: 'fine_updated', upload: 'upload' };
async function viewFine(id) {
  const d = await api('GET', '/api/fines/' + id);
  const f = d.fine; const A = d.allowed_actions;
  let html = `<p><a href="#/fines">‹ ${esc(t('back'))}</a></p><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${plate(f.plate || f.plate_in_letter, { big: true })}<span class="chip">${esc(t('fs_' + f.status))}</span>${f.environment === 'test' ? '<span class="chip test">TEST</span>' : ''}</div>
    <h1 style="margin-top:12px">${esc(f.fine_no)} · ${esc(t('fk_' + f.kind))}</h1>
    ${!f.vehicle_id ? `<div class="panel alert">${esc(t('vehicle_unknown'))}: ${esc(f.plate_in_letter)}</div>` : ''}
    <section class="panel"><dl class="kv"><dt>${esc(t('offense'))}</dt><dd>${esc(t('of_' + f.offense_type))}</dd><dt>${esc(t('offense_at'))}</dt><dd>${fmtDT(f.offense_at)}</dd><dt>${esc(t('offense_place'))}</dt><dd>${esc(f.location || '–')}</dd>
      <dt>${esc(t('authority'))}</dt><dd>${esc(f.authority)}</dd><dt>${esc(t('reference'))}</dt><dd>${esc(f.reference || '–')}</dd><dt>${esc(t('amount'))}</dt><dd>${eur(f.amount_eur)}</dd>
      <dt>${esc(t('response_due'))}</dt><dd>${f.response_due ? fmtD(f.response_due) : '–'}</dd><dt>${esc(t('role_driver'))}</dt><dd>${f.driver_hidden ? esc(t('fine_driver_hidden')) : esc(d.driver_name || '–')}${f.driver_basis ? ' · ' + esc(t('fb_' + f.driver_basis)) : ''}${f.driver_evidence ? `<div class="small muted">${esc(f.driver_evidence)}</div>` : ''}</dd></dl>
      ${f.note ? `<p style="white-space:pre-wrap;margin-top:8px">${esc(f.note)}</p>` : ''}</section>`;
  html += `<h2>${esc(t('files'))}</h2><div class="thumbs">${d.files.map((x) => `<a href="${fileUrl(x.id)}" target="_blank" rel="noopener">${x.content_type.startsWith('image/') ? `<img src="${fileUrl(x.id)}" alt="">` : 'PDF<br>' + esc(x.filename.slice(0, 14))}</a>`).join('')}</div>`;
  if (A.includes('upload')) html += `<label class="btn secondary" style="margin-top:8px;display:inline-flex">${esc(t('upload'))}<input id="ff" type="file" accept="application/pdf,image/*" hidden></label>`;
  if (A.includes('confirm_driver')) {
    html += `<h2>${esc(t('candidates'))}</h2>${d.candidates.length ? `<div class="list">${d.candidates.map((c, i) => `<label class="row"><input type="radio" name="cand" value="${i}"><span class="title">${esc(c.display_name)}</span><span class="chip">${esc(t('fb_' + c.basis))}</span><span class="sub" style="white-space:normal">${esc(candEv(c))}</span></label>`).join('')}</div>` : `<p class="muted">${esc(t('no_candidates'))}</p>`}
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

// ---------- Kosten je Fahrzeug/Monat ----------
async function viewCosts() {
  const to = S.costTo || bYm(); const from = S.costFrom || bYm(11);
  let rep;
  try { rep = await api('GET', `/api/reports/costs?from=${from}&to=${to}`); } catch (err) { render(`<h1>${esc(t('costs_report'))}</h1><div class="panel alert">${esc(err.message)}</div>`, 'more'); return; }
  const byV = new Map();
  for (const r of rep.rows) { const v = byV.get(r.vehicle_id) || { plate: r.plate, site: r.site, actual: 0, estimate: 0, unvalued: 0, hours: 0, months: [] }; v.actual += r.actual_net; v.estimate += r.estimate_net; v.unvalued += r.unvalued_items; v.hours += r.hours; v.months.push(r); byV.set(r.vehicle_id, v); }
  const vs = [...byV.entries()].sort((a, b) => b[1].actual - a[1].actual);
  const kmBy = new Map((rep.vehicles || []).map((v) => [v.vehicle_id, v]));
  let html = `<h1>${esc(t('costs_report'))}</h1><form id="cr" class="panel" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
    <div><label>${esc(t('from'))}</label><input type="month" name="from" value="${esc(from)}" required></div><div><label>${esc(t('to'))}</label><input type="month" name="to" value="${esc(to)}" required></div>
    <div class="actions" style="margin:0"><button class="btn secondary">${esc(t('show'))}</button><button type="button" class="btn" id="csv">${esc(t('export_csv'))}</button></div></form>
    <section class="panel"><dl class="kv"><dt>${esc(t('cost_actual'))}</dt><dd><b>${eur(rep.totals.actual_net)}</b></dd><dt>${esc(t('cost_estimate'))}</dt><dd>${eur(rep.totals.estimate_net)}</dd>
    <dt>${esc(t('hours'))}</dt><dd>${esc(String(rep.totals.hours).replace('.', ','))}</dd><dt>${esc(t('unvalued_positions'))}</dt><dd>${rep.totals.unvalued_items ? `<span class="chip kritisch">${rep.totals.unvalued_items}</span>` : '0'}</dd></dl>
    <p class="small muted" style="margin-top:8px">${esc(t('cost_rules'))}${rep.hourly_rate_net === null ? ' ' + esc(t('no_rate')) : ''} ${esc(t('cost_per_km_rule'))}</p></section>`;
  html += `<div class="list">${vs.map(([id, v]) => `<details class="row" style="display:block"><summary style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;cursor:pointer">${plate(v.plate || id)}<span class="title">${eur(Math.round(v.actual * 100) / 100)}</span>${v.estimate ? `<span class="chip">${esc(t('estimate'))}: ${eur(Math.round(v.estimate * 100) / 100)}</span>` : ''}${v.unvalued ? `<span class="chip kritisch">${v.unvalued} ${esc(t('unvalued_short'))}</span>` : ''}${(() => { const k = kmBy.get(id); return k && k.km ? `<span class="chip">${fmtKm(k.km)} · ${k.cost_per_km !== null ? Number(k.cost_per_km).toLocaleString('de-DE', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' €/km' : '–'}${k.complete ? '' : ' (' + esc(t('incomplete')) + ')'}</span>` : ''; })()}</summary>
    <dl class="kv" style="margin-top:8px">${v.months.map((m) => `<dt>${esc(m.month)}</dt><dd>${eur(m.actual_net)}${m.estimate_net ? ' · ' + esc(t('estimate')) + ' ' + eur(m.estimate_net) : ''}${m.unvalued_items ? ' · ' + m.unvalued_items + ' ' + esc(t('unvalued_short')) : ''} · ${esc(String(m.hours).replace('.', ','))} h</dd>`).join('')}</dl>
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
  cr.onsubmit = (e) => { e.preventDefault(); S.costFrom = cr.from.value; S.costTo = cr.to.value; viewCosts(); };
  $('#csv').onclick = async () => { try { const blob = await api('GET', `/api/reports/costs?from=${cr.from.value}&to=${cr.to.value}&format=csv`); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fuhrpark-kosten_${cr.from.value}_${cr.to.value}.csv`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } catch (err) { toast(err.message, true); } };
}

// ---------- Fahrerakte (personenbezogen: nur Inhaber/Fuhrparkleitung, Fahrer nur eigene Akte) ----------
const DST = { ok: 'ok', hinweis: 'mittel', kritisch: 'kritisch', laeuft_ab: 'mittel', abgelaufen: 'kritisch', faellig: 'kritisch', bald: 'mittel', fehlt: 'mittel', mangel: 'kritisch' };
async function viewDrivers() {
  const list = (await api('GET', '/api/drivers' + (S.drvInactive ? '?inactive=1' : ''))).drivers;
  if (!isMgr()) { if (list.length) { location.hash = '#/drivers/' + list[0].id; return; } render(`<h1>${esc(t('my_driver_file'))}</h1><p class="muted">${esc(t('no_driver_file'))}</p>`, 'more'); return; }
  let users = [];
  try { users = (await api('GET', '/api/users')).users.filter((u) => u.role === 'driver' && u.active); } catch {}
  const html = `<h1>${esc(t('drivers'))}</h1>${helpLink('drivers')}<p class="small muted">${esc(t('driver_privacy'))}</p>
    <details class="panel"><summary>${esc(t('new_driver'))}</summary><form id="ndf"><label>${esc(t('display_name'))}</label><input name="display_name" required><label>${esc(t('personnel_no'))}</label><input name="personnel_no"><label>${esc(t('site'))}</label><input name="site">
      <label>${esc(t('app_account'))}</label><select name="user_id"><option value="">${esc(t('no_account'))}</option>${users.map((u) => `<option value="${esc(u.id)}">${esc(u.display_name)} (${esc(u.username)})</option>`).join('')}</select>
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    <div class="actions" style="margin-top:0"><button type="button" class="btn secondary" id="dcsv">${esc(t('driver_csv'))}</button></div>
    <p><label style="display:inline-flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="dinact" ${S.drvInactive ? 'checked' : ''} style="width:auto"> ${esc(t('inactive_drivers'))}</label></p>
    <div class="list">${list.map((d) => { const crit = d.status.items.filter((i) => i.status !== 'ok'); return `<a class="row ${d.status.overall === 'kritisch' ? 'p-kritisch' : d.status.overall === 'hinweis' ? 'p-mittel' : ''}" href="#/drivers/${esc(d.id)}"><span>🪪</span><span class="title">${esc(d.display_name)}${d.personnel_no ? ` <span class="small muted">${esc(d.personnel_no)}</span>` : ''}</span><span class="chip ${DST[d.status.overall]}">${esc(t('dov_' + d.status.overall))}</span><span class="sub">${[...crit.map((i) => `${t('dk2_' + i.kind)}: ${t('dst_' + i.status)} (${fmtD(i.valid_until)})`), d.status.check.status !== 'ok' ? `${t('license_check')}: ${t('dck_' + d.status.check.status)}` : '', !d.status.has_license ? t('no_license_doc') : '', d.username ? t('app_account') + ': ' + d.username : ''].filter(Boolean).map(esc).join(' · ')}</span></a>`; }).join('') || `<p class="muted">–</p>`}</div>`;
  render(html, 'more');
  const ia = $('#dinact'); if (ia) ia.onchange = () => { S.drvInactive = ia.checked; viewDrivers(); };
  $('#dcsv').onclick = async () => { try { download(await api('GET', '/api/drivers?format=csv'), `fuhrpark-fahrer-fristen_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
  const f = $('#ndf'); f.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(f)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; try { const r = await api('POST', '/api/drivers', b); location.hash = '#/drivers/' + r.id; } catch (err) { toast(err.message, true); } };
}
async function viewDriver(id) {
  const x = await api('GET', '/api/drivers/' + id);
  const d = x.driver; const st = x.status; const mgr = isMgr();
  const cur = x.documents.filter((o) => !o.superseded); const old = x.documents.filter((o) => o.superseded);
  const docRow = (o) => { const it = st.items.find((i) => i.id === o.id); return `<tr><td>${esc(t('dk2_' + o.kind))}${o.title ? `<div class="small muted">${esc(o.title)}</div>` : ''}</td><td>${o.license_classes ? esc(o.license_classes) + '<br>' : ''}${o.number ? `<span class="small">${esc(o.number)}</span>` : ''}</td><td>${o.valid_until ? `<span class="chip ${it ? DST[it.status] : ''}">${fmtD(o.valid_until)}</span>` : '–'}</td><td class="small">${esc(o.evidence)}<div class="muted">${fmtD(o.created_at)} · ${esc(o.created_by_name || '')}</div></td></tr>`; };
  let html = `${mgr ? `<p><a href="#/drivers">‹ ${esc(t('back'))}</a></p>` : ''}<h1>🪪 ${esc(d.display_name)}</h1>
    <section class="panel"><dl class="kv"><dt>${esc(t('personnel_no'))}</dt><dd>${esc(d.personnel_no || '–')}</dd><dt>${esc(t('site'))}</dt><dd>${esc(d.site || '–')}</dd>
    <dt>${esc(t('status'))}</dt><dd><span class="chip ${DST[st.overall]}">${esc(t('dov_' + st.overall))}</span></dd>
    <dt>${esc(t('license_check'))}</dt><dd>${st.check.last ? `${fmtD(st.check.last)} · ${esc(t('lcr_' + st.check.result))}` : '–'}${st.check.due ? ` · ${esc(t('next_due'))} ${fmtD(st.check.due)}` : ''} <span class="chip ${DST[st.check.status]}">${esc(t('dck_' + st.check.status))}</span></dd>
    ${x.vehicles.length ? `<dt>${esc(t('vehicles'))}</dt><dd>${x.vehicles.map((v) => plate(v.plate)).join(' ')}</dd>` : ''}</dl>
    ${!d.active ? `<p class="chip">${esc(t('inactive_drivers'))}</p>` : ''}${!st.has_license ? `<div class="alert small" style="margin-top:8px">${esc(t('no_license_doc'))}</div>` : ''}${S.me.role === 'owner' ? `<div class="actions"><button type="button" class="btn secondary" id="ddex" title="${esc(t('data_export_hint'))}">${esc(t('data_export'))}</button></div>` : ''}</section>
    <h2>${esc(t('driver_docs'))}</h2>${cur.length ? `<div class="scroll"><table><thead><tr><th>${esc(t('kind'))}</th><th></th><th>${esc(t('valid_until'))}</th><th>${esc(t('evidence'))}</th></tr></thead><tbody>${cur.map(docRow).join('')}</tbody></table></div>` : '<p class="muted">–</p>'}
    ${old.length ? `<details><summary>${esc(t('history'))} (${old.length})</summary><div class="scroll"><table><tbody>${old.map(docRow).join('')}</tbody></table></div></details>` : ''}`;
  if (x.tacho) html += `<h2>${esc(t('tacho_card'))}</h2><section class="panel"><dl class="kv"><dt>${esc(t('tacho_last'))}</dt><dd>${x.tacho.last ? fmtD(x.tacho.last) : '–'}</dd><dt>${esc(t('tacho_due'))}</dt><dd>${x.tacho.due ? fmtD(x.tacho.due) + ' ' : ''}<span class="chip ${TST[x.tacho.status]}">${esc(t('tst_' + x.tacho.status))}</span></dd></dl>
    ${x.tacho_downloads.length ? `<details><summary>${esc(t('history'))} (${x.tacho_downloads.length})</summary><ul class="small">${x.tacho_downloads.map((o) => `<li>${fmtD(o.downloaded_on)} · ${esc(o.evidence)}${o.note ? ' – ' + esc(o.note) : ''}${o.created_by_name ? ` <span class="muted">(${esc(o.created_by_name)})</span>` : ''}</li>`).join('')}</ul></details>` : ''}
    ${mgr ? `<form id="tdf" class="actions" style="flex-wrap:wrap;align-items:flex-end"><div><label>${esc(t('tacho_date'))}</label><input type="date" name="downloaded_on" required value="${bDate()}"></div><div style="flex:1;min-width:200px"><label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('tacho_ev_ph'))}"></div><button class="btn secondary">${esc(t('tacho_record'))}</button></form>` : ''}</section>`;
  if (mgr) {
    html += `<details class="panel"><summary>${esc(t('add_driver_doc'))}</summary><form id="ddf"><label>${esc(t('kind'))}</label><select name="kind">${['fuehrerschein', 'fahrerkarte', 'code95', 'unterweisung', 'sonstiges'].map((k) => `<option value="${k}">${esc(t('dk2_' + k))}</option>`).join('')}</select>
      <label>${esc(t('doc_title'))}</label><input name="title" placeholder="${esc(t('doc_title_ph'))}"><label>${esc(t('license_classes'))}</label><input name="license_classes" placeholder="C, CE"><label>${esc(t('doc_number'))}</label><input name="number">
      <label>${esc(t('issued_on'))}</label><input type="date" name="issued_on"><label>${esc(t('valid_until'))} <span class="hint">${esc(t('driver_valid_until_hint'))}</span></label><input type="date" name="valid_until">
      <label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('driver_ev_ph'))}"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
      <details class="panel"><summary>${esc(t('record_license_check'))}</summary><form id="lcf"><label>${esc(t('date'))}</label><input type="date" name="checked_on" required value="${bDate()}">
      <label>${esc(t('result'))}</label><select name="result">${['in_ordnung', 'maengel', 'nicht_vorgelegt'].map((r) => `<option value="${r}">${esc(t('lcr_' + r))}</option>`).join('')}</select><label>${esc(t('note'))}</label><input name="note"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
    if (x.license_checks.length) html += `<details><summary>${esc(t('license_check'))} – ${esc(t('history'))} (${x.license_checks.length})</summary><ul class="small">${x.license_checks.map((c) => `<li>${fmtD(c.checked_on)} · ${esc(t('lcr_' + c.result))} · ${esc(c.checked_by_name || '')}${c.note ? ' – ' + esc(c.note) : ''}</li>`).join('')}</ul></details>`;
    html += `<details class="panel"><summary>${esc(t('edit_master'))}</summary><form id="edf"><label>${esc(t('display_name'))}</label><input name="display_name" required value="${esc(d.display_name)}"><label>${esc(t('personnel_no'))}</label><input name="personnel_no" value="${esc(d.personnel_no || '')}"><label>${esc(t('site'))}</label><input name="site" value="${esc(d.site || '')}">
      <label class="check"><input type="checkbox" name="active" ${d.active ? 'checked' : ''}> ${esc(t('active'))}</label><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>`;
  }
  render(html, 'more');
  const dx = $('#ddex'); if (dx) dx.onclick = async () => { if (!confirm(t('data_export_hint'))) return; try { const r = await api('GET', `/api/drivers/${id}/data-export`); download(r instanceof Blob ? r : new Blob([JSON.stringify(r, null, 1)], { type: 'application/json' }), `datenauskunft_fahrer_${bDate()}.json`); } catch (err) { toast(err.message, true); } };
  const post = async (path, b) => { for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; try { await api('POST', path, b); toast('✓'); viewDriver(id); } catch (err) { toast(err.message, true); } };
  const ddf = $('#ddf'); if (ddf) ddf.onsubmit = (e) => { e.preventDefault(); post(`/api/drivers/${id}/documents`, Object.fromEntries(new FormData(ddf))); };
  const tdf = $('#tdf'); if (tdf) tdf.onsubmit = (e) => { e.preventDefault(); post('/api/tacho/downloads', { kind: 'fahrerkarte', driver_id: id, ...Object.fromEntries(new FormData(tdf)) }); };
  const lcf = $('#lcf'); if (lcf) lcf.onsubmit = (e) => { e.preventDefault(); post(`/api/drivers/${id}/license-checks`, Object.fromEntries(new FormData(lcf))); };
  const edf = $('#edf'); if (edf) edf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(edf)); b.active = !!edf.active.checked; try { await api('PATCH', `/api/drivers/${id}`, b); toast('✓'); viewDriver(id); } catch (err) { toast(err.message, true); } };
}

// Kurzinfo zum Fahrzeug im Vorgang: weitere offene Vorgänge, bald fällige Prüfungen, letzter km-Stand (nur gespeicherte Daten)
function vehInfo(vi, c) {
  const prev = (vi && vi.previous_same_item) || [];
  if (!vi || (!vi.other_open_total && !vi.inspections_due.length && !vi.last_km && !prev.length)) return '';
  const today = bDate();
  const parts = [];
  if (vi.other_open_total) parts.push(`<dt>${esc(t('vi_other_cases'))}</dt><dd>${vi.other_open_cases.map((o) => `<a href="#/cases/${esc(o.id)}">${esc(o.case_no)}</a> <span class="chip ${esc(o.priority)}">${esc(t('st_' + o.status))}</span>${o.safety_lock ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}`).join('<br>')}${vi.other_open_total > vi.other_open_cases.length ? `<br><span class="small muted">+${vi.other_open_total - vi.other_open_cases.length}</span>` : ''}</dd>`);
  if (vi.inspections_due.length) parts.push(`<dt>${esc(t('vi_due'))}</dt><dd>${vi.inspections_due.map((m) => `${esc(mk(m.kind))} ${fmtD(m.next_due_date)}${m.next_due_date < today ? ` <span class="chip kritisch">${esc(t('ms_ueberfaellig'))}</span>` : ''}`).join('<br>')}</dd>`);
  if (prev.length) parts.unshift(`<dt>${esc(t('vi_prev_same'))}</dt><dd>${prev.map((o) => `<a href="#/cases/${esc(o.id)}">${esc(o.case_no)}</a> · ${esc(t('st_fahrzeug_freigegeben'))} ${fmtD(o.closed_at)}`).join('<br>')}<div class="small muted">${esc(t('vi_prev_same_hint'))}</div></dd>`);
  if (vi.last_km) parts.push(`<dt>${esc(t('km'))}</dt><dd>${fmtKm(vi.last_km.km)} <span class="small muted">(${fmtD(vi.last_km.measured_at)})</span></dd>`);
  return `<details class="small" style="margin-top:8px"${vi.other_open_total || prev.length || vi.inspections_due.some((m) => m.next_due_date < today) ? ' open' : ''}><summary><b>${esc(t('vi_title'))}</b></summary><dl class="kv">${parts.join('')}</dl></details>`;
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
    ${S.me.role !== 'driver' ? `<a class="row" href="#/vehicles/${esc(v.id)}"><span>${ICON.truck}</span><span class="title">${esc(t('vehicle_file'))}</span><span></span></a>` : ''}</div>`, 'new');
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

// ---------- Auslese-Fristen Fahrerkarte / Massenspeicher ----------
const TST = { ueberfaellig: 'kritisch', bald: 'mittel', keine: '', ok: 'ok' };
async function viewTacho() {
  const r = await api('GET', '/api/tacho');
  const tab = S.tachoTab || 'drivers'; const f = S.tachoFilter || 'attention';
  const list = r[tab];
  const sel = (x) => f === 'all' || (f === 'attention' ? ['ueberfaellig', 'bald'].includes(x.status) : x.status === f);
  const rows = list.filter(sel); const tot = r.totals[tab];
  const filters = [['attention', `${t('tst_ueberfaellig')} / ${t('tst_bald')}`, tot.ueberfaellig + tot.bald], ['keine', t('tst_keine'), tot.keine], ['all', t('filter_all'), list.length]];
  const opts = list.map((x) => `<option value="${esc(x.id)}">${esc(tab === 'drivers' ? x.display_name : x.plate)}</option>`).join('');
  render(`<h1>${esc(t('tacho'))}</h1><p class="small muted">${esc(t('tacho_rule'))}</p>
    <div class="actions" style="flex-wrap:wrap"><button type="button" class="btn ${tab === 'drivers' ? '' : 'secondary'}" data-tt="drivers">${esc(t('tacho_cards'))} (${r.drivers.length})</button><button type="button" class="btn ${tab === 'vehicles' ? '' : 'secondary'}" data-tt="vehicles">${esc(t('tacho_vus'))} (${r.vehicles.length})</button></div>
    <div class="actions" style="flex-wrap:wrap;margin-top:0">${filters.map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-tf="${k}">${esc(l)} (${n})</button>`).join('')}</div>
    <div class="list">${rows.map((x) => `<a class="row ${x.status === 'ueberfaellig' ? 'p-kritisch' : x.status === 'bald' ? 'p-mittel' : ''}" href="${tab === 'drivers' ? '#/drivers/' + esc(x.id) : '#/vehicles/' + encodeURIComponent(x.id)}">${tab === 'drivers' ? '<span>🪪</span>' : plate(x.plate)}<span class="title">${tab === 'drivers' ? esc(x.display_name) : x.due ? `${esc(t('tacho_due'))} ${fmtD(x.due)}` : '–'}</span><span class="chip ${TST[x.status]}">${esc(t('tst_' + x.status))}</span><span class="sub">${[tab === 'drivers' && x.due && `${esc(t('tacho_due'))} ${fmtD(x.due)}`, `${esc(t('tacho_last'))}: ${x.last ? fmtD(x.last) : '–'}`, x.site && esc(x.site), tab === 'drivers' && x.personnel_no && esc(x.personnel_no)].filter(Boolean).join(' · ')}</span></a>`).join('') || `<p class="muted">–</p>`}</div>
    ${tab === 'drivers' && r.without_card.length ? `<p class="small muted">${esc(t('tacho_without_card'))}: ${r.without_card.map((d) => esc(d.display_name)).join(', ')}</p>` : ''}
    ${list.length ? `<details class="panel"><summary>${esc(t('tacho_record'))}</summary><form id="tnf"><label>${esc(tab === 'drivers' ? t('role_driver') : t('vehicle'))}</label><select name="target" required>${opts}</select>
      <label>${esc(t('tacho_date'))}</label><input type="date" name="downloaded_on" required value="${bDate()}"><label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('tacho_ev_ph'))}"><label>${esc(t('note'))}</label><input name="note">
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}
    <div class="actions"><button type="button" class="btn secondary" id="tcsv">${esc(t('export_csv'))}</button></div>
    <section class="panel"><h2 style="margin-top:0">${esc(t('tacho_import'))}</h2><p class="small muted">${esc(t('tacho_import_hint'))}</p>
      <label for="tsrc">${esc(t('tacho_import_src'))}</label><input id="tsrc" placeholder="${esc(t('tacho_ev_ph'))}"><input type="file" id="timp" accept=".csv,text/csv" aria-label="${esc(t('tacho_import'))}" style="margin-top:8px"><div id="timpr"></div></section>`, 'more');
  $$('[data-tt]').forEach((b) => (b.onclick = () => { S.tachoTab = b.dataset.tt; viewTacho(); }));
  $$('[data-tf]').forEach((b) => (b.onclick = () => { S.tachoFilter = b.dataset.tf; viewTacho(); }));
  $('#tcsv').onclick = async () => { try { download(await api('GET', '/api/tacho?format=csv'), `fuhrpark-auslesungen_${r.today}.csv`); } catch (err) { toast(err.message, true); } };
  const inp = $('#timp');
  inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    const text = await file.text(); const q = $('#tsrc').value.trim() ? `&source=${encodeURIComponent($('#tsrc').value.trim())}` : '';
    const show = (r, applied) => {
      const box = $('#timpr'); if (!box) return;
      box.innerHTML = `<p><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(t('ia_neu'))}: ${r.counts.neu} · ${esc(t('tacho_known'))}: ${r.counts.vorhanden} · ${esc(t('skipped'))}: ${r.counts.uebersprungen}</p>
        ${r.rows.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('line'))}</th><th>${esc(t('kind'))}</th><th>${esc(t('tacho_target'))}</th><th>${esc(t('tacho_date'))}</th><th></th></tr></thead><tbody>${r.rows.map((x) => `<tr><td>${x.line}</td><td>${esc(t(x.kind === 'fahrerkarte' ? 'dk2_fahrerkarte' : 'tacho_vu'))}</td><td style="white-space:nowrap">${esc(x.label)}</td><td>${fmtD(x.downloaded_on)}</td><td><span class="chip ${x.status === 'neu' ? 'ok' : ''}">${esc(x.status === 'neu' ? t('ia_neu') : t('tacho_known'))}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${r.skipped.length ? `<details ${applied ? '' : 'open'}><summary>${esc(t('skipped'))} (${r.skipped.length})</summary><ul class="small">${r.skipped.map((x) => `<li>${esc(t('line'))} ${x.line}: ${esc(x.reason)}</li>`).join('')}</ul></details>` : ''}
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
  const n = await api('GET', '/api/notifications');
  // Filter (nur Anzeige): alle / ungelesen (weder geöffnet noch quittiert) / dringend
  const NF = { all: () => true, unread: (x) => !x.opened_at && !x.acknowledged_at, urgent: (x) => !!x.urgent };
  // Gewählter Filter gilt für die App-Sitzung; ohne Wahl: „Ungelesen“, solange es ungelesene gibt, sonst „Alle“
  const nf = NF[S.inboxF] ? S.inboxF : n.notifications.some(NF.unread) ? 'unread' : 'all';
  const shown = n.notifications.filter(NF[nf]);
  render(`<h1>${esc(t('notifications'))}</h1><section class="panel" id="push"></section>
    <details class="panel" id="np"><summary>${esc(t('push_prefs'))}</summary><p class="small muted">${esc(t('push_prefs_hint'))}</p><div id="npl"></div></details>
    ${n.notifications.length ? `<div class="actions"><button class="btn secondary" id="ra">${esc(t('mark_read'))}</button></div>
    <div class="seg-tabs" id="nfil">${Object.keys(NF).map((k) => `<a href="#/inbox" data-nf="${k}" class="${k === nf ? 'on' : ''}"${k === nf ? ' aria-current="true"' : ''}>${esc(t(k === 'all' ? 'all' : 'nf_' + k))} (${n.notifications.filter(NF[k]).length})</a>`).join('')}</div>` : ''}
    <div class="list">${shown.map((x) => `<div class="row note ${x.urgent ? 'p-kritisch' : ''}" style="${x.opened_at || x.acknowledged_at ? 'opacity:.7' : ''}"><span class="chip ${x.urgent ? 'kritisch' : ''}">${fmtDT(x.created_at)}</span><a class="title" style="white-space:normal" href="${x.case_id ? '#/cases/' + esc(x.case_id) : S.me.role === 'driver' ? '#/' : isMgr() ? '#/master' : '#/'}" data-open="${esc(x.id)}">${esc(x.title)}</a>${x.acknowledged_at ? '<span class="chip ok">✓</span>' : `<button class="btn secondary" data-ack="${esc(x.id)}">${esc(t('ack'))}</button>`}<span class="sub" style="white-space:normal">${esc(x.body)} · Push: ${esc(t('pst_' + x.push_status) === 'pst_' + x.push_status ? x.push_status : t('pst_' + x.push_status))}</span></div>`).join('') || `<p class="muted">${esc(t(n.notifications.length ? 'nf_none' : 'no_notifications'))}</p>`}</div>`, '');
  pushPanel($('#push'));
  const np = $('#np');
  np.ontoggle = async () => {
    if (!np.open || np.dataset.loaded) return;
    try {
      const pr = await api('GET', '/api/me/notify-prefs'); np.dataset.loaded = '1';
      $('#npl').innerHTML = pr.kinds.map((k) => `<label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" data-pk="${esc(k)}"${pr.muted.includes(k) ? '' : ' checked'}> ${esc(t('pk_' + k))}</label>`).join('');
      $$('[data-pk]', np).forEach((cb) => (cb.onchange = async () => {
        const muted = $$('[data-pk]', np).filter((x) => !x.checked).map((x) => x.dataset.pk);
        try { await api('PUT', '/api/me/notify-prefs', { muted }); toast('✓'); } catch (err) { toast(err.message, true); }
      }));
    } catch (err) { toast(err.message, true); }
  };
  $$('[data-ack]').forEach((b) => (b.onclick = async () => { await api('POST', `/api/notifications/${b.dataset.ack}/ack`); await refreshUnread(); viewInbox(); }));
  $$('[data-open]').forEach((a) => a.addEventListener('click', () => api('POST', `/api/notifications/${a.dataset.open}/opened`).catch(() => {})));
  const ra = $('#ra'); if (ra) ra.onclick = async () => { await api('POST', '/api/notifications/read-all'); S.unread = 0; viewInbox(); };
  $$('[data-nf]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); S.inboxF = a.dataset.nf; viewInbox(); }));
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
  if (pt) pt.onclick = async () => { const r = await api('POST', '/api/push/test'); toast(`Push: ${r.push_status}${r.error ? ' – ' + r.error : ''}`, r.push_status !== 'accepted'); };
}
const deviceLabel = () => (/Android/.test(navigator.userAgent) ? 'Android' : /iPhone/.test(navigator.userAgent) ? 'iPhone' : /iPad/.test(navigator.userAgent) ? 'iPad' : /Windows/.test(navigator.userAgent) ? 'Windows-PC' : /Mac/.test(navigator.userAgent) ? 'Mac' : t('device'));

// ---------- Management ----------
// Fuhrparkagent läuft planmäßig alle 15 (Betrieb) bzw. 30 Min. (Test): > 75 Min. ohne Lauf, offener Lauf oder Fehler → Hinweis
const agentStale = (r) => !r || !!r.error || Date.now() - Date.parse(r.finished_at || r.started_at) > 75 * 60000 || (!r.finished_at && Date.now() - Date.parse(r.started_at) > 10 * 60000);
async function viewMaster() {
  const p = await api('GET', '/api/master');
  const sev = { kritisch: 'kritisch', handeln: 'mittel', hinweis: '', info: '' };
  let html = `<h1>${esc(t('master_title'))}</h1>
    <div class="panel ${p.all_clear && !agentStale(p.last_agent_run) ? 'good' : 'alert'}"><b>${esc(p.all_clear ? t('all_clear') : t('not_clear'))}</b>${p.decisions_open ? ` · ${p.decisions_open} ${esc(t('decisions'))}` : ''}<div class="small muted">${esc(t('last_run'))}: ${p.last_agent_run ? fmtDT(p.last_agent_run.finished_at || p.last_agent_run.started_at) + (p.last_agent_run.error ? ' · ' + esc(p.last_agent_run.error) : '') : '–'}</div>${agentStale(p.last_agent_run) ? `<div class="alert small" style="margin-top:6px">${esc(t('agent_stale'))}</div>` : ''}</div>
    <div class="stats"><div><b>${p.vehicles_total}</b>${esc(t('total'))}</div><div><b style="color:var(--stop)">${p.vehicles_locked}</b>${esc(t('locked_vehicles'))}</div><div><b>${p.vehicles_in_workshop}</b>${esc(t('in_workshop'))}</div></div>
    <div class="actions"><button class="btn secondary" id="ra">${esc(t('run_agent'))}</button><a class="btn secondary" href="#/vehicles">${esc(t('vehicles'))}</a></div>
    <h2>${esc(t('decisions'))}</h2><div class="list">${p.inbox.filter((m) => ['offen', 'gesehen'].includes(m.decision_status)).map((m) => `<div class="row ${m.severity === 'kritisch' ? 'p-kritisch' : 'p-mittel'}"><span class="chip ${sev[m.severity]}">${esc(m.severity)}</span><span class="title" style="white-space:normal">${esc(m.payload.message)}</span><span>${m.case_id ? `<a href="#/cases/${esc(m.case_id)}">${esc(t('details'))}</a>` : ''}</span><span class="sub" style="white-space:normal">${esc(m.payload.next_action)} · ${fmtDT(m.received_at)}${m.finding_status === 'erledigt' ? ' · ✓ ' + esc(t('resolved')) : ''} · <a href="#" data-dec="${esc(m.event_id)}" data-st="gesehen">${esc(t('seen'))}</a> · <a href="#" data-dec="${esc(m.event_id)}" data-st="erledigt">${esc(t('resolved'))}</a></span></div>`).join('') || `<p class="muted">–</p>`}</div>
    <h2>${esc(t('findings'))}</h2><div class="list">${p.findings.map((f) => `<div class="row ${f.severity === 'kritisch' ? 'p-kritisch' : f.severity === 'handeln' ? 'p-mittel' : ''}"><span class="chip ${sev[f.severity]}">${esc(f.severity)}</span><span class="title" style="white-space:normal">${esc(f.message)}</span><span>${f.case_id ? `<a href="#/cases/${esc(f.case_id)}">${esc(t('details'))}</a>` : ''}</span><span class="sub" style="white-space:normal">${esc(f.next_action)} · ${esc(t('role_' + f.owner_role))} · ${esc(t('open_since'))} ${fmtDT(f.first_seen)}</span></div>`).join('') || `<p class="muted">–</p>`}</div>
    <h2>${esc(t('nav_cases'))}</h2><div class="scroll"><table class="stack"><thead><tr><th></th><th>${esc(t('case_no'))}</th><th>${esc(t('urgency'))}</th><th>${esc(t('status_label'))}</th><th>${esc(t('workshop'))}</th><th>${esc(t('received'))}</th><th>${esc(t('workshop_ack'))}</th><th>${esc(t('open_items'))}</th></tr></thead><tbody>
    ${p.cases.map((c) => `<tr><td>${plate(c.plate, { locked: c.safety_lock })}</td><td><a href="#/cases/${esc(c.id)}" style="white-space:nowrap">${esc(c.case_no)}</a><div class="small muted">${esc(c.description.slice(0, 60))}</div></td><td><span class="chip ${esc(c.priority)}">${esc(t('prio_' + c.priority))}</span></td><td>${esc(t('st_' + c.status))}</td><td>${esc(wsName(c.workshop_site))}</td><td>${c.fleet_received_at ? fmtDT(c.fleet_received_at) : '–'}</td><td>${c.workshop_ack_at ? fmtDT(c.workshop_ack_at) : '–'}</td><td>${c.open_items || ''}</td></tr>`).join('')}</tbody></table></div>`;
  render(html, 'master');
  $('#ra').onclick = async () => { try { const r = await api('POST', '/api/agent/run'); toast(`${r.findings_open} ${t('findings')}`); viewMaster(); } catch (err) { toast(err.message, true); } };
  $$('[data-dec]').forEach((a) => (a.onclick = async (e) => { e.preventDefault(); await api('POST', `/api/master/${a.dataset.dec}/decision`, { decision_status: a.dataset.st }); viewMaster(); }));
}

// ---------- Prüftermine (Fuhrpark gesamt) ----------
// Druck/PDF: Prüfhistorie der Fahrzeugakte („Bisherige Durchführungen“) immer mitdrucken, danach wieder zuklappen
window.addEventListener('beforeprint', () => { const mh = document.querySelector('#mhist'); if (mh && !mh.open) { mh.open = true; mh.dataset.printOpened = '1'; } });
window.addEventListener('afterprint', () => { const mh = document.querySelector('#mhist'); if (mh && mh.dataset.printOpened) { mh.open = false; delete mh.dataset.printOpened; } });
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
// Gespeicherter Standard-Nachweis der Fahrerzuordnung (Server, deutsch) in der App-Sprache anzeigen; eigene Nachweise bleiben wörtlich
const evTr = (e) => (e === 'Zuordnung durch Fuhrparkleitung' ? t('ev_assign_default') : e || '');
// Fahrerkandidat (Bußgeld): Begründung in der App-Sprache; übernommen wird weiter der gespeicherte deutsche Nachweis
const candEv = (c) => (c.since ? t('cand_since').replace('{d}', fmtD(c.since)) + (c.assign_evidence ? ` (${evTr(c.assign_evidence)})` : '') : c.check_at ? t('cand_check').replace('{t}', fmtDT(c.check_at)) : c.evidence || '');
// Planungshilfe: km-Prognose fällt in die nächsten 30 Tage (ändert keinen Status, nur Anzeige)
const fcSoon = (r, today, days = 30) => !!(r.km_forecast && r.km_forecast.date && Date.parse(r.km_forecast.date) - Date.parse(today) <= days * 86400000);
async function viewMaint() {
  let ov;
  try { ov = await api('GET', '/api/maintenance'); } catch (err) { render(`<h1>${esc(t('inspections_due'))}</h1><div class="panel alert">${esc(err.message)}</div>`, 'more'); return; }
  const f = S.maintFilter || 'due';
  // „fällig ohne Termin“: überfällig/bald fällig und kein geplanter Werkstatttermin ab heute – was noch eingeplant werden muss
  const noPlan = (r) => (r.status === 'ueberfaellig' || r.status === 'faellig') && !(r.planned_date && r.planned_date >= ov.today);
  const fcN = ov.rows.filter((r) => fcSoon(r, ov.today)).length;
  const sel = (r) => (f === 'all' ? true : f === 'due' ? r.status === 'ueberfaellig' || r.status === 'faellig' : f === 'noplan' ? noPlan(r) : f === 'fc30' ? fcSoon(r, ov.today) : r.status === f);
  const rows = ov.rows.filter(sel);
  if (f === 'fc30') rows.sort((a, b) => (a.km_forecast.date < b.km_forecast.date ? -1 : a.km_forecast.date > b.km_forecast.date ? 1 : 0));
  const cls = { ueberfaellig: 'kritisch', faellig: 'mittel', ok: 'ok', ohne_termin: '', ungeklaert: 'mittel', nicht_pflichtig: '', erste_sp: '' };
  const tabs = [['due', `${t('ms_ueberfaellig')} + ${t('ms_faellig')}`, ov.totals.overdue + ov.totals.due], ['noplan', t('due_no_plan'), ov.rows.filter(noPlan).length], ['ueberfaellig', t('ms_ueberfaellig'), ov.totals.overdue], ['ungeklaert', t('ms_ungeklaert'), ov.totals.unclear || 0], ...(fcN || f === 'fc30' ? [['fc30', t('fc30_tab'), fcN]] : []), ['all', t('filter_all'), ov.rows.length], ['gaps', t('gaps'), ov.totals.vehicles_with_gaps]];
  let html = `<h1>${esc(t('inspections_due'))}</h1>${helpLink('dates')}
    <section class="panel"><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip ${ov.totals.overdue ? 'kritisch' : ''}">${esc(t('ms_ueberfaellig'))}: ${ov.totals.overdue}</span><span class="chip ${ov.totals.due ? 'mittel' : ''}">${esc(t('ms_faellig'))} (≤ ${ov.warn_days} ${esc(t('days'))}): ${ov.totals.due}</span><span class="chip ok">${esc(t('ms_ok'))}: ${ov.totals.ok}</span><span class="chip ${ov.totals.vehicles_with_gaps ? 'mittel' : ''}">${esc(t('gaps'))}: ${ov.totals.vehicles_with_gaps} / ${ov.totals.vehicles}</span></div>
    <div class="actions"><button type="button" class="btn secondary" id="mcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="mics">${esc(t('export_ics'))}</button><button type="button" class="btn secondary" id="mprt">${esc(t('print'))}</button></div></section>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="actions" role="tablist" style="flex-wrap:wrap">${tabs.map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-mf="${k}" role="tab" aria-selected="${f === k}">${esc(l)} (${n})</button>`).join('')}</div>`;
  if (f === 'fc30') html += `<p class="small muted">${esc(t('fc30_hint'))}</p>`;
  if (f === 'gaps') {
    html += `<p class="small muted">${esc(t('gaps_hint'))}</p><div class="list">${ov.gaps.map((g) => `<a class="row" href="#/vehicles/${encodeURIComponent(g.vehicle_id)}">${plate(g.plate)}<span class="title">${g.vehicle_kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${esc(g.site || '')}</span><span></span><span class="sub" style="white-space:normal">${g.missing.map((k) => `<span class="chip">${esc(mk(k))}</span>`).join(' ')}</span></a>`).join('') || `<p class="muted">–</p>`}</div>`;
  } else {
    html += `<div class="list">${rows.map((r) => `<a class="row ${r.status === 'ueberfaellig' ? 'p-kritisch' : r.status === 'faellig' ? 'p-mittel' : ''}" href="#/vehicles/${encodeURIComponent(r.vehicle_id)}">${plate(r.plate)}<span class="title">${esc(mk(r.kind))}${r.due_month || r.next_due_date || r.prognosis || !r.next_due_km ? ' · ' : ''}${r.due_month ? `${esc(t('due_until_end'))} ${esc(r.due_month)}${r.due_basis ? ` <span class="small muted">(${esc(t('db_' + r.due_basis))})</span>` : ''}` : r.next_due_date ? fmtD(r.next_due_date) : r.prognosis ? `${esc(t('prognosis'))} ${mY(r.prognosis)}` : r.next_due_km ? '' : '–'}${r.planned_date ? ` · ${esc(t('planned_appt'))} ${fmtD(r.planned_date)}` : ''}${r.open_order ? ` · 🔧 ${esc(r.open_order.case_no)}` : ''}${r.next_due_km ? ` · ${esc(t('due_at_km'))} ${fmtKm(r.next_due_km)}${r.km_remaining !== null ? ` (${r.km_remaining < 0 ? esc(t('km_over')) + ' ' + fmtKm(-r.km_remaining) : esc(t('km_left')) + ' ' + fmtKm(r.km_remaining)})` : ''}` : ''}</span><span class="chip ${cls[r.status]}">${esc(t('ms_' + r.status))}${r.days !== null ? ` (${r.days})` : ''}</span><span class="sub">${r.km_forecast ? kmFcHtml(r.km_forecast) + ' · ' : ''}${r.notes && r.notes.length && ['ungeklaert', 'ueberfaellig'].includes(r.status) ? esc(huNote(r, r.notes.length - 1)) + ' · ' : ''}${esc(r.evidence)}${r.site ? ' · ' + esc(r.site) : ''}</span></a>`).join('') || `<p class="muted">${esc(t('none_due'))}</p>`}</div>`;
  }
  // Durchgeführte Prüfungen (Wartungshistorie der Flotte) – Inhaber, Fuhrparkleitung, Lesezugriff
  if (['owner', 'fleet', 'viewer'].includes(S.me.role)) html += `<details class="panel noprint" id="mhist"><summary>${esc(t('mh_title'))}</summary><p class="small muted">${esc(t('mh_hint'))}</p>
    <form id="mhf" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end"><div><label>${esc(t('from'))}</label><input type="date" name="from" value="${esc(ov.today.slice(0, 4))}-01-01" required></div><div><label>${esc(t('to'))}</label><input type="date" name="to" value="${esc(ov.today)}" required></div>
    <div><label>${esc(t('kind'))}</label><select name="kind"><option value="">${esc(t('filter_all'))}</option>${(S.meta.maintenance_kinds || []).map((k) => `<option value="${esc(k)}">${esc(mk(k))}</option>`).join('')}</select></div>
    <div class="actions" style="margin:0"><button class="btn secondary">${esc(t('show'))}</button><button type="button" class="btn secondary" id="mhcsv">${esc(t('export_csv'))}</button></div></form><div id="mhres"></div></details>`;
  if (isMgr()) html += `<section class="panel noprint"><h2 style="margin-top:0">${esc(t('import_maint'))}</h2><p class="small muted">${esc(t('import_maint_hint'))}</p><input type="file" id="mimp" accept=".csv,text/csv" aria-label="${esc(t('import_maint'))}"><div id="mimpr"></div></section>`;
  render(html, 'more');
  $$('[data-mf]').forEach((b) => (b.onclick = () => { S.maintFilter = b.dataset.mf; viewMaint(); }));
  $('#mics').onclick = async () => { try { download(await api('GET', '/api/maintenance?format=ics'), `fuhrpark-prueftermine_${ov.today}.ics`); } catch (err) { toast(err.message, true); } };
  $('#mprt').onclick = () => window.print();
  // Mängelauftrag und Nachprüfung zu Prüfungen mit erheblichen Mängeln (nur gespeicherte Daten; ohne Nachprüfung „noch nicht eingetragen“)
  const mhDefect = (r) => DEFECT_RESULTS.includes(r.result) ? `<br><span class="small">${esc(t('mh_order'))}: ${r.defect_case_no ? `${esc(r.defect_case_no)} (${esc(t('st_' + r.defect_case_status))})` : esc(t('mh_no_order'))} · ${esc(t('mh_reinsp'))}: ${r.reinspection_date ? `${fmtD(r.reinspection_date)}${r.reinspection_result ? ' – ' + esc(t('res_' + r.reinspection_result)) : ''}` : esc(t('mh_reinsp_none'))}</span>` : '';
  const mhf = $('#mhf');
  if (mhf) {
    const mhq = () => `from=${encodeURIComponent(mhf.from.value)}&to=${encodeURIComponent(mhf.to.value)}${mhf.kind.value ? '&kind=' + encodeURIComponent(mhf.kind.value) : ''}`;
    mhf.onsubmit = async (e) => { e.preventDefault(); try {
      const h = await api('GET', '/api/maintenance/history?' + mhq());
      $('#mhres').innerHTML = `<p><b>${h.rows.length}</b> ${esc(t('mh_count'))}${Object.keys(h.by_kind).length ? ' · ' + Object.entries(h.by_kind).map(([k, n]) => `${esc(mk(k))} ${n}`).join(' · ') : ''}</p>${h.rows.length ? `<div class="list">${h.rows.slice(0, 50).map((r) => { const go = r.result_addable && isMgr(); const vhref = `#/vehicles/${encodeURIComponent(r.vehicle_id)}` + (go ? `?ev=${encodeURIComponent(r.event_id)}` : ''); return `<a class="row" href="${vhref}">${plate(r.plate)}<span class="title">${esc(mk(r.kind))}</span><span class="chip">${fmtD(r.done_date)}</span>${go ? `<span class="chip mittel">${esc(t('res_add_go'))} ›</span>` : ''}<span class="sub" style="white-space:normal">${[r.done_km !== null ? r.done_km.toLocaleString('de-DE') + ' km' : '', r.result ? t('res_' + r.result) : '', r.evidence].filter(Boolean).map(esc).join(' · ')}${mhDefect(r)}</span></a>`; }).join('')}</div>${h.rows.length > 50 ? `<p class="small muted">${esc(t('mh_more'))}</p>` : ''}` : ''}`;
    } catch (err) { toast(err.message, true); } };
    $('#mhcsv').onclick = async () => { if (!mhf.reportValidity()) return; try { download(await api('GET', '/api/maintenance/history?format=csv&' + mhq()), `fuhrpark-durchgefuehrte-pruefungen_${mhf.from.value}_${mhf.to.value}.csv`); } catch (err) { toast(err.message, true); } };
  }
  $('#mcsv').onclick = async () => { try { download(await api('GET', '/api/maintenance?format=csv'), `fuhrpark-prueftermine_${ov.today}.csv`); } catch (err) { toast(err.message, true); } };
  const inp = $('#mimp');
  if (inp) inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    const text = await file.text();
    const show = (r, applied) => {
      const box = $('#mimpr'); if (!box) return;
      box.innerHTML = `<p><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(t('ia_neu'))}: ${r.created} · ${esc(t('ia_aktualisiert'))}: ${r.updated} · ${esc(t('ia_unverändert'))}: ${r.unchanged} · ${esc(t('skipped'))}: ${r.skipped.length}</p>
        ${r.rows.length ? `<div class="scroll"><table><thead><tr><th>${esc(t('line'))}</th><th></th><th>${esc(t('kind'))}</th><th>${esc(t('next_due'))}</th><th></th></tr></thead><tbody>${r.rows.map((x) => `<tr><td>${x.line}</td><td style="white-space:nowrap">${esc(x.plate)}</td><td>${esc(mk(x.kind))}</td><td>${fmtD(x.next_due_date)}${x.previous_due_date && x.previous_due_date !== x.next_due_date ? ` <span class="small muted">(${fmtD(x.previous_due_date)})</span>` : ''}</td><td><span class="chip ${x.action === 'neu' ? 'ok' : x.action === 'aktualisiert' ? 'mittel' : ''}">${esc(t('ia_' + x.action))}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${r.skipped.length ? `<details ${applied ? '' : 'open'}><summary>${esc(t('skipped'))} (${r.skipped.length})</summary><ul class="small">${r.skipped.map((x) => `<li>${esc(t('line'))} ${x.line}${x.plate ? ' · ' + esc(x.plate) : ''}: ${esc(x.reason)}</li>`).join('')}</ul></details>` : ''}
        ${!applied && (r.created || r.updated) ? `<div class="actions"><button type="button" class="btn" id="mapply">${esc(t('apply_import'))}</button></div>` : ''}`;
      const ap = $('#mapply');
      if (ap) ap.onclick = async () => { ap.disabled = true; try { const done = await api('POST', '/api/maintenance/import', text, { headers: { 'content-type': 'text/csv' } }); toast('✓'); await viewMaint(); show(done, true); } catch (err) { ap.disabled = false; toast(err.message, true); } };
    };
    try { show(await api('POST', '/api/maintenance/import?dry_run=1', text, { headers: { 'content-type': 'text/csv' } }), false); } catch (err) { toast(err.message, true); }
  };
}

// ---------- Kennzahlen Instandhaltung ----------
const dur = (h) => (h === null || h === undefined ? '–' : h < 48 ? `${String(h).replace('.', ',')} h` : `${String(Math.round(h / 2.4) / 10).replace('.', ',')} ${t('days')}`);
async function viewKpi() {
  const to = S.kpiTo || bYm(); const from = S.kpiFrom || bYm(2);
  let r;
  try { r = await api('GET', `/api/reports/kpi?from=${from}&to=${to}${S.kpiSite ? '&site=' + encodeURIComponent(S.kpiSite) : ''}`); } catch (err) { render(`<h1>${esc(t('kpi'))}</h1><div class="panel alert">${esc(err.message)}</div>`, 'more'); return; }
  const st = (x) => (x.n ? `${dur(x.median_h)} <span class="small muted">(P90 ${dur(x.p90_h)}, n=${x.n})</span>` : '–');
  let html = `<h1>${esc(t('kpi'))}</h1>${helpLink('kpi')}<form id="kf2" class="panel" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
    <div><label>${esc(t('from'))}</label><input type="month" name="from" value="${esc(from)}" required></div><div><label>${esc(t('to'))}</label><input type="month" name="to" value="${esc(to)}" required></div>
    ${r.sites.length > 1 || r.site ? `<div><label>${esc(t('workshop'))}</label><select name="site"><option value="">${esc(t('filter_all'))}</option>${[...new Set([...r.sites, ...(r.site ? [r.site] : [])])].map((x) => `<option value="${esc(x)}"${x === r.site ? ' selected' : ''}>${esc(x === 'ohne' ? t('kpi_no_site') : wsName(x))}</option>`).join('')}</select></div>` : ''}
    <div class="actions" style="margin:0"><button class="btn secondary">${esc(t('show'))}</button></div></form>${r.site ? `<p class="small muted">${esc(t('kpi_site_hint'))}</p>` : ''}`;
  html += r.by_priority.length ? r.by_priority.map((p) => `<section class="panel ${p.priority === 'kritisch' ? 'alert' : ''}"><h3>${esc(p.priority === 'alle' ? t('filter_all') : t('prio_' + p.priority))}</h3><dl class="kv">
    <dt>${esc(t('kpi_reports'))}</dt><dd>${p.created} · ${esc(t('kpi_released'))} ${p.released} · ${esc(t('kpi_open'))} ${p.open}${p.rejected ? ` · ${esc(t('kpi_rejected'))} ${p.rejected}` : ''}</dd>
    <dt>${esc(t('kpi_triage'))}</dt><dd>${st(p.triage)}</dd><dt>${esc(t('kpi_ack'))}</dt><dd>${st(p.workshop_ack)}</dd><dt>${esc(t('kpi_total'))}</dt><dd>${st(p.created_to_release)}</dd><dt>${esc(t('kpi_parts'))}</dt><dd>${dur(p.parts_wait_h)}</dd></dl></section>`).join('') : `<p class="muted">–</p>`;
  if (r.vehicles.length) html += `<h2>${esc(t('kpi_vehicles'))}</h2><div class="list">${r.vehicles.slice(0, 20).map((v) => `<a class="row" href="#/vehicles/${encodeURIComponent(v.vehicle_id)}">${plate(v.plate || v.vehicle_id)}<span class="title">${esc(t('kpi_workshop'))}: ${dur(v.workshop_h)}</span><span class="chip">${v.cases}</span><span class="sub">${esc(t('kpi_parts'))}: ${dur(v.parts_wait_h)} · ${esc(t('kpi_released'))} ${v.released}${v.locked_h ? ` · <b style="color:var(--stop)">${esc(t('kpi_locked'))}: ${dur(v.locked_h)}</b>` : ''}</span></a>`).join('')}</div>`;
  // Termintreue Teile-Liefertermine (nur Abschnitte „wartet auf Teile“ aus dem Zeitraum; Termin laut Werkstatt)
  const pe = r.parts_eta;
  const peLine = (x) => `${esc(t('kpi_pe_kept'))} ${x.kept} · ${esc(t('kpi_pe_late'))} ${x.late}${x.on_time_pct !== null ? ` (${x.on_time_pct} % ${esc(t('kpi_pe_on_time'))})` : ''}${x.late_days_median !== null ? ` · ${esc(t('kpi_pe_median'))} ${String(x.late_days_median).replace('.', ',')} ${esc(t('days'))}` : ''}${x.open_overdue ? ` · <b style="color:var(--stop)">${esc(t('kpi_pe_open'))} ${x.open_overdue}</b>` : ''}${x.without_eta ? ` · ${esc(t('kpi_pe_without'))} ${x.without_eta}` : ''}`;
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
  const dD = (v) => `${String(v).replace('.', ',')} ${esc(t('days'))}`;
  const stD = (x) => (x.n ? `${dD(x.median_d)} <span class="small muted">(P90 ${dD(x.p90_d)}, n=${x.n})</span>` : '–');
  if (idf && idf.inspections) html += `<section class="panel" id="kpiid"><h3>${esc(t('kpi_id'))}</h3><dl class="kv">
    <dt>${esc(t('kpi_id_insp'))}</dt><dd>${idf.inspections}</dd>
    <dt>${esc(t('kpi_id_ordered'))}</dt><dd>${idf.ordered}${idf.without_order ? ` · <b style="color:var(--stop)">${esc(t('kpi_id_without'))} ${idf.without_order}</b>` : ''}</dd>
    <dt>${esc(t('kpi_released'))}</dt><dd>${idf.released}${idf.open ? ` · ${esc(t('kpi_open'))} ${idf.open}` : ''}</dd>
    <dt>${esc(t('kpi_id_days'))}</dt><dd>${stD(idf.to_release_days)}</dd>
    <dt>${esc(t('kpi_id_reinsp'))}</dt><dd>${idf.reinspected}${idf.defects_again ? ` · <b style="color:var(--stop)">${esc(t('kpi_id_again'))} ${idf.defects_again}</b>` : ''}</dd></dl><p class="small muted">${esc(t('kpi_id_rule'))}</p></section>`;
  html += `<p class="small muted">${esc(t('kpi_rules'))}</p>`;
  render(html, 'more');
  const f = $('#kf2'); f.onsubmit = (e) => { e.preventDefault(); S.kpiFrom = f.from.value; S.kpiTo = f.to.value; S.kpiSite = f.site ? f.site.value : ''; viewKpi(); };
}

// ---------- Protokoll (Inhaber) ----------
async function viewAudit(more) {
  const f = S.auditFilter || '';
  const before = more ? S.auditBefore : null;
  const r = await api('GET', `/api/admin/audit?limit=100${f ? '&action=' + encodeURIComponent(f) : ''}${before ? '&before=' + encodeURIComponent(before) : ''}`);
  S.auditRows = more ? [...(S.auditRows || []), ...r.entries] : r.entries;
  S.auditBefore = r.entries.length ? r.entries[r.entries.length - 1].created_at : null;
  const groups = [['', t('filter_all')], ['login', t('au_login')], ['user.', t('users')], ['vehicle', t('vehicles')], ['maintenance.', t('inspections_due')], ['backup.', t('backup')], ['reports.', t('export_csv')], ['settings.', t('settings')]];
  const det = (d) => (d && typeof d === 'object' ? Object.entries(d).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') : d || '');
  render(`<h1>${esc(t('audit'))}</h1><p class="small muted">${esc(t('audit_hint'))}</p>
    <div class="actions" style="flex-wrap:wrap">${groups.map(([k, l]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-af="${esc(k)}">${esc(l)}</button>`).join('')}</div>
    <div class="list">${S.auditRows.map((e) => `<div class="row ${['login.locked', 'login.ip_limited'].includes(e.action) ? 'p-kritisch' : ''}"><span class="chip">${fmtDT(e.created_at)}</span><span class="title">${esc(e.action)}</span><span></span><span class="sub" style="white-space:normal">${esc(e.actor_name || t('au_system'))}${e.detail ? ' · ' + esc(det(e.detail)) : ''}</span></div>`).join('') || '<p class="muted">–</p>'}</div>
    ${r.entries.length === 100 ? `<div class="actions"><button type="button" class="btn secondary" id="amore">${esc(t('load_more'))}</button></div>` : ''}`, 'more');
  $$('[data-af]').forEach((b) => (b.onclick = () => { S.auditFilter = b.dataset.af; viewAudit(); }));
  const am = $('#amore'); if (am) am.onclick = () => viewAudit(true);
}

// ---------- Zeitleiste der Fahrzeugakte ----------
// Filter steht in der Adresse (#/vehicles/<id>/timeline?f=<Bereich>): „Zurück“ aus einem Vorgang zeigt dieselbe Auswahl,
// Links können direkt gefiltert öffnen; unbekannte oder für die Rolle nicht sichtbare Bereiche → „Alle“
const TL_GROUPS = { '': [], case: ['case', 'case_closed'], inspection: ['inspection'], tire: ['tire'], maintenance: ['maintenance', 'odometer'], document: ['document'], driver: ['driver_from', 'driver_to'], fine: ['fine'], tacho: ['tacho'], contract: ['contract'], claim: ['claim'] };
const TL_MGR_ONLY = ['fine', 'tacho', 'contract', 'claim'];
const tlHash = (id, f) => '#/vehicles/' + id + '/timeline' + (f ? '?f=' + f : '');
async function viewTimeline(id, fArg) {
  const groups = TL_GROUPS;
  const f = fArg && Object.prototype.hasOwnProperty.call(groups, fArg) && (!TL_MGR_ONLY.includes(fArg) || isMgr()) ? fArg : '';
  const r = await api('GET', `/api/vehicles/${encodeURIComponent(id)}/timeline?limit=500${f ? '&types=' + groups[f].join(',') : ''}`);
  const km = (n) => (n === null || n === undefined ? '' : ` · ${Number(n).toLocaleString('de-DE')} km`);
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
      case 'tire': return [x.tread_mm !== null && x.tread_mm < 1.6 ? 'p-kritisch' : '', `${esc(t('tires'))} ${esc(x.position)}: ${esc(t('te_' + x.tire_event))}${x.tread_mm !== null ? ' · ' + esc(String(x.tread_mm).replace('.', ',')) + ' mm' : ''}`, `${km(x.km).replace(/^ · /, '')}${caseLink(x)}`];
      case 'maintenance': return [DEFECT_RESULTS.includes(x.result) ? 'p-kritisch' : '', `${esc(mk(x.maintenance_kind))} ${esc(t('tl_done'))}${x.result ? ` <span class="chip ${DEFECT_RESULTS.includes(x.result) ? 'kritisch' : x.result === 'ohne_maengel' ? 'ok' : ''}">${esc(t('res_' + x.result))}</span>` : ''}`, `${esc(x.evidence || '')}${km(x.km)}${x.by ? ' · ' + esc(x.by) : ''}`];
      case 'tacho': return ['', esc(t('tl_tacho')), `${esc(x.evidence || '')}${x.by ? ' · ' + esc(x.by) : ''}`];
      case 'contract': return ['', `${esc(t('ck_' + x.contract_kind))}: ${esc(t(x.contract_event === 'end' ? 'tl_contract_end' : 'tl_contract_start'))}`, `${esc(x.partner)}${x.evidence ? ' · ' + esc(x.evidence) : ''}`];
      case 'claim': return ['', `${esc(t('claim_title'))}: ${esc(t(x.claim_event === 'reimbursed' ? 'tl_claim_reimbursed' : 'tl_claim_reported'))}${x.claim_event === 'reimbursed' && x.reimbursed_net !== null ? ' · ' + eur(x.reimbursed_net) : ''}`, `${esc(x.insurer)}${x.claim_no ? ' · ' + esc(t('claim_no')) + ' ' + esc(x.claim_no) : ''}${x.claim_event === 'reported' ? ' · ' + esc(t('cls_' + x.status)) : ''}${caseLink(x)}`];
      case 'fine': return ['', `${esc(t('fk_' + x.fine_kind))}: <a href="#/fines/${esc(x.fine_id)}">${esc(x.fine_no)}</a>`, esc(t('fs_' + x.status))];
      default: return ['', esc(x.type), ''];
    }
  };
  const labels = { '': t('filter_all'), case: t('nav_cases'), inspection: t('inspections'), tire: t('tires'), maintenance: t('maintenance'), document: t('documents'), driver: t('drivers'), fine: t('fines'), tacho: t('tacho'), contract: t('ct_title'), claim: t('claims') };
  const visible = Object.keys(groups).filter((k) => !TL_MGR_ONLY.includes(k) || isMgr()).filter((k) => k !== 'tacho' || r.vehicle.kind !== 'anhaenger');
  render(`<p><a href="#/vehicles/${esc(id)}">‹ ${esc(t('back'))}</a></p><div>${plate(r.vehicle.plate, { big: true })}</div>
    <h1 style="margin-top:12px">${esc(t('timeline'))}</h1><p class="small muted">${esc(t('timeline_hint'))}</p>
    <div class="actions" style="flex-wrap:wrap">${visible.map((k) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" aria-pressed="${f === k}" data-tl="${esc(k)}">${esc(labels[k])}</button>`).join('')}</div>
    <div class="list">${r.items.map((x) => { const [cls, title, sub] = line(x); return `<div class="row ${cls}"><span class="chip">${x.at.length === 10 ? fmtD(x.at) : fmtDT(x.at)}</span><span class="title" style="white-space:normal">${title}</span><span></span>${sub ? `<span class="sub" style="white-space:normal">${sub}</span>` : ''}</div>`; }).join('') || `<p class="muted">–</p>`}</div>
    ${r.total > r.items.length ? `<p class="small muted">${r.items.length} / ${r.total}</p>` : ''}`, 'vehicles');
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
async function viewPlan() {
  const days = S.planDays || 14;
  const mgr = S.me.role !== 'workshop';
  const site = mgr ? (S.planSite || '') : '';
  const r = await api('GET', `/api/workshop/plan?days=${days}${site ? '&site=' + encodeURIComponent(site) : ''}`);
  const loc = S.lang === 'uk' ? 'uk-UA' : S.lang === 'en' ? 'en-GB' : 'de-DE';
  const wd = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString(loc, { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  // weiterer geplanter Tag desselben Fahrzeugs → Hinweis zum Zusammenlegen (nur Anzeige)
  const other = (i) => i.other_dates && i.other_dates.length ? `<span class="otherdates">${esc(t('plan_other_dates'))}: ${i.other_dates.map(fmtD).join(', ')}</span>` : '';
  const subs = (...xs) => { const x = xs.filter(Boolean); return x.length ? `<span class="sub" style="white-space:normal">${x.join(' · ')}</span>` : ''; };
  const row = (i) => i.type === 'case'
    ? `<a class="row p-${esc(i.priority)}" href="#/cases/${esc(i.id)}">${plate(i.plate, { locked: i.safety_lock })}<span class="title">${esc(i.case_no)} · ${esc(i.description)}</span><span class="chip">${esc(t('st_' + i.status))}</span>${subs(mgr && !site && esc(wsName(i.workshop_site)), partsEta(i, '', true), i.status === 'wartet_teile' && i.parts_expected_date && i.planned_date && i.planned_date < i.parts_expected_date && `<span class="chip mittel">${esc(t('plan_before_parts'))}</span>`, other(i))}</a>`
    : `<a class="row" href="#/vehicles/${encodeURIComponent(i.vehicle_id)}">${plate(i.plate)}<span class="title">${esc(t('planned_inspection'))}: ${esc(mk(i.kind))}</span><span class="chip">${i.next_due_date ? esc(t('next_due')) + ' ' + fmtD(i.next_due_date) : ''}</span>${subs(i.order && `🔧 ${esc(t('mo_open'))} ${esc(i.order.case_no)}`, other(i))}</a>`;
  let html = `<h1>${esc(t('wplan'))}</h1><p class="small muted noprint">${esc(t('wplan_hint'))}</p>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · ${site || r.site ? esc(wsName(site || r.site)) + ' · ' : ''}${fmtD(r.from)} – ${fmtD(r.to)} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="panel noprint" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
      ${mgr ? `<div><label for="psite">${esc(t('workshop'))}</label><select id="psite"><option value="">${esc(t('all'))}</option>${S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(w.name)}</option>`).join('')}</select></div>` : ''}
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
  render(html, 'more');
  const all = [...r.overdue, ...r.unplanned];
  const suggest = (i) => {
    // Wartet der Auftrag auf Teile mit Liefertermin: frühestens an diesem Tag (Termin laut Werkstatt, die App schätzt nichts).
    const minD = i.status === 'wartet_teile' && i.parts_expected_date > r.today ? i.parts_expected_date : '';
    // Hat dasselbe Fahrzeug ab morgen schon einen Termin (anderer Auftrag oder Prüfung) an einem Werktag: diesen vorschlagen –
    // das Fahrzeug fällt dann nur einmal aus. Sonst Werktag ab morgen mit den wenigsten geplanten Aufträgen derselben Werkstatt.
    const same = r.days.filter((d) => d.date > r.today && d.date >= minD && ![0, 6].includes(new Date(d.date + 'T12:00:00Z').getUTCDay())
      && d.items.some((x) => x.vehicle_id === i.vehicle_id && x.id !== i.id && (x.type === 'maintenance' || x.workshop_site === i.workshop_site)))[0];
    if (same) return same.date;
    const load = new Map(r.days.map((d) => [d.date, d.items.filter((x) => x.type === 'case' && x.workshop_site === i.workshop_site).length]));
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
  $$('[data-psug]').forEach((b) => (b.onclick = () => { const i = all.find((x) => x.id === b.dataset.psug); const f = $('#pd-' + CSS.escape(i.id)); f.value = suggest(i) || ''; f.focus(); }));
  $$('[data-pset]').forEach((b) => (b.onclick = async () => {
    const i = all.find((x) => x.id === b.dataset.pset); const f = $('#pd-' + CSS.escape(i.id));
    if (!f.value) { toast(t('plan_pick_date'), true); f.focus(); return; }
    b.disabled = true;
    try { await api('POST', `/api/cases/${i.id}/commands`, { action: 'set_planned_date', command_id: uid(), expected_version: i.version, note: null, payload: { planned_date: f.value } }); toast('✓'); viewPlan(); }
    catch (err) { b.disabled = false; toast(err.message, true); if (err.code === 'version_conflict') viewPlan(); }
  }));
  const ps = $('#psite'); if (ps) ps.onchange = () => { S.planSite = ps.value; viewPlan(); };
  $('#pdays').onchange = () => { S.planDays = Number($('#pdays').value); viewPlan(); };
  $('#plprt').onclick = () => window.print();
  $('#pics').onclick = async () => { try { download(await api('GET', `/api/workshop/plan?days=${days}&format=ics${site ? '&site=' + encodeURIComponent(site) : ''}`), `werkstattplan_${bDate()}.ics`); } catch (err) { toast(err.message, true); } };
}

async function viewWsLoad() {
  const weeks = S.wlWeeks || 8;
  const r = await api('GET', `/api/reports/workshop-load?weeks=${weeks}`);
  const n = (x) => String(x).replace('.', ',');
  render(`<h1>${esc(t('ws_load'))}</h1><p class="small muted">${esc(t('ws_load_hint'))}</p>
    <div class="actions" style="flex-wrap:wrap">${[4, 8, 13, 26].map((w) => `<button type="button" class="btn ${w === weeks ? '' : 'secondary'}" data-wl="${w}">${w} ${esc(t('weeks'))}</button>`).join('')}</div>
    ${r.sites.map((s) => { const max = Math.max(1, ...s.weeks.map((w) => w.hours)); return `<section class="panel"><h2 style="margin-top:0">${esc(s.name === 'ohne' ? t('no_workshop') : s.name)}</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${r.open_statuses.map((st) => `<span class="chip ${s.open[st] ? 'mittel' : ''}">${esc(t('st_' + st))}: ${s.open[st] || 0}</span>`).join('')}</div>
      <div class="scroll"><table style="font-size:.85rem"><thead><tr><th>${esc(t('week'))}</th><th>${esc(t('hours'))}</th><th>${esc(t('ws_acknowledged'))}</th><th>${esc(t('ws_released'))}</th></tr></thead><tbody>
      ${s.weeks.slice().reverse().map((w) => `<tr><td style="white-space:nowrap" title="${esc(w.week)}">${esc(t('cw'))} ${esc(w.week.slice(6))}</td><td><div style="display:flex;align-items:center;gap:6px"><span aria-hidden="true" style="display:inline-block;height:10px;width:${Math.round((w.hours / max) * 40)}px;background:var(--steel);border-radius:2px"></span>${n(w.hours)}</div></td><td>${w.acknowledged}</td><td>${w.released}</td></tr>`).join('')}</tbody></table></div></section>`; }).join('') || '<p class="muted">–</p>'}`, 'more');
  $$('[data-wl]').forEach((b) => (b.onclick = () => { S.wlWeeks = Number(b.dataset.wl); viewWsLoad(); }));
}

// ---------- Telematik-Prüffälle und Zuordnungen ----------
async function viewTelematics() {
  const r = await api('GET', '/api/telematics');
  const vs = await vehiclesCached();
  const opts = (sel) => vs.map((v) => `<option value="${esc(v.id)}"${v.id === sel ? ' selected' : ''}>${esc(v.plate)}${v.kind === 'anhaenger' ? ' (' + esc(t('vk_anhaenger')) + ')' : ''}</option>`).join('');
  render(`<h1>${esc(t('telematics'))}</h1><p class="small muted">${esc(t('telematics_hint'))}</p>
    <div class="stats"><div><b>${r.latest.vehicles}</b>${esc(t('tm_with_data'))}</div><div><b style="${r.unmatched.length ? 'color:var(--mid)' : ''}">${r.unmatched.length}</b>${esc(t('tm_unmatched'))}</div><div><b>${r.mappings.length}</b>${esc(t('tm_mappings'))}</div></div>
    ${r.latest.last_received ? `<p class="small muted">${esc(t('tm_last'))}: ${fmtDT(r.latest.last_received)}</p>` : r.unmatched.length ? '' : `<div class="panel">${esc(t('tm_none'))}</div>`}
    <h2>${esc(t('tm_unmatched'))}</h2><div class="list">${r.unmatched.map((u, i) => `<div class="row p-mittel"><span class="chip">${esc(u.provider)}</span><span class="title" style="white-space:normal">${esc(u.external_id)}${u.source_plate ? ' · ' + esc(u.source_plate) : ''}${u.source_vin ? ' · FIN ' + esc(u.source_vin) : ''}</span><span></span>
      <form class="sub" data-map="${i}" style="white-space:normal;display:grid;gap:6px;margin-top:6px"><label>${esc(t('vehicle'))}</label><select name="vehicle_id" required><option value="">–</option>${opts(null)}</select>${u.candidate_plate ? `<span class="small muted">${esc(t('tm_candidate'))}: ${esc(u.candidate_plate)}</span>` : ''}<label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" placeholder="${esc(t('tm_evidence_ph'))}"><button class="btn secondary">${esc(t('tm_confirm'))}</button></form></div>`).join('') || `<p class="muted">–</p>`}</div>
    <h2>${esc(t('tm_mappings'))}</h2><div class="list">${r.mappings.map((m) => `<div class="row">${plate(m.plate)}<span class="title" style="white-space:normal">${esc(m.provider)} · ${esc(m.external_id)}</span><button type="button" class="btn secondary" data-unmap="${esc(m.provider)}|${esc(m.external_id)}">${esc(t('tm_remove'))}</button><span class="sub" style="white-space:normal">${esc(m.evidence)} · ${esc(m.confirmed_by_name || '')} · ${fmtDT(m.confirmed_at)}</span></div>`).join('') || `<p class="muted">–</p>`}</div>`, 'more');
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
  const r = await api('GET', '/api/admin/data-quality');
  const sevCls = { fehler: 'kritisch', luecke: 'mittel', hinweis: '' };
  // Filter nach Schweregrad (fehler/luecke/hinweis) und darin nach Prüfung; ein Prüffilter außerhalb des Schweregrads wird verworfen
  const sevOf = Object.fromEntries(r.items.map((i) => [i.check, i.severity]));
  const sev = ['fehler', 'luecke', 'hinweis'].includes(S.dqSev) ? S.dqSev : '';
  const sevCount = (s) => r.items.filter((i) => i.severity === s).length;
  if (S.dqFilter && (!r.counts[S.dqFilter] || (sev && sevOf[S.dqFilter] !== sev))) S.dqFilter = '';
  const f = S.dqFilter || '';
  const items = r.items.filter((i) => (!sev || i.severity === sev) && (!f || i.check === f));
  const checks = Object.keys(r.counts).filter((c) => !sev || sevOf[c] === sev);
  render(`<h1>${esc(t('dq'))}</h1>${helpLink('dates')}<p class="small muted">${esc(t('dq_hint'))}</p>
    <div class="stats"><div><b>${r.vehicles_checked}</b>${esc(t('vehicles'))}</div><div><b style="${r.items.some((i) => i.severity === 'fehler') ? 'color:var(--stop)' : ''}">${r.items.filter((i) => i.severity === 'fehler').length}</b>${esc(t('dq_sev_fehler'))}</div><div><b>${r.items.filter((i) => i.severity !== 'fehler').length}</b>${esc(t('dq_sev_luecke'))} / ${esc(t('dq_sev_hinweis'))}</div></div>
    ${r.items.length ? `<div class="actions noprint"><button type="button" class="btn secondary" id="dqcsv">${esc(t('export_csv'))}${f ? ' (' + esc(t('dq_' + f)) + ')' : sev ? ' (' + esc(t('dq_sev_' + sev)) + ')' : ''}</button></div>` : ''}
    ${r.items.length ? `<div class="actions" style="flex-wrap:wrap" role="group" aria-label="${esc(t('dq_col_severity'))}"><span class="small muted" style="align-self:center">${esc(t('dq_col_severity'))}:</span><button type="button" class="btn ${sev ? 'secondary' : ''}" data-dqsev="" aria-pressed="${!sev}">${esc(t('filter_all'))} (${r.items.length})</button>${['fehler', 'luecke', 'hinweis'].filter((x) => sevCount(x)).map((x) => `<button type="button" class="btn ${sev === x ? '' : 'secondary'}" data-dqsev="${x}" aria-pressed="${sev === x}">${esc(t('dq_sev_' + x))} (${sevCount(x)})</button>`).join('')}</div>` : ''}
    ${r.items.length ? `<div class="actions" style="flex-wrap:wrap" role="group" aria-label="${esc(t('dq_col_check'))}"><span class="small muted" style="align-self:center">${esc(t('dq_col_check'))}:</span><button type="button" class="btn ${f ? 'secondary' : ''}" data-dq="">${esc(t('filter_all'))} (${sev ? sevCount(sev) : r.items.length})</button>${checks.map((c) => `<button type="button" class="btn ${f === c ? '' : 'secondary'}" data-dq="${esc(c)}">${esc(t('dq_' + c))} (${r.counts[c]})</button>`).join('')}</div>` : `<div class="panel good"><b>${esc(t('dq_ok'))}</b></div>`}
    <div class="list">${items.map((i) => { const href = i.case_id ? `#/cases/${esc(i.case_id)}` : i.vehicle_id && i.check === 'inspection_no_result' && i.event_id ? `#/vehicles/${esc(i.vehicle_id)}?ev=${esc(i.event_id)}` : i.vehicle_id ? `#/vehicles/${esc(i.vehicle_id)}` : i.driver_id ? `#/drivers/${esc(i.driver_id)}` : null; return `${href ? `<a class="row ${i.severity === 'fehler' ? 'p-kritisch' : i.severity === 'luecke' ? 'p-mittel' : ''}" href="${href}">` : `<div class="row">`}${i.plate ? plate(i.plate) : i.driver_id ? `<span class="chip">${esc(i.driver_name)}</span>` : `<span class="chip">${esc(t('users'))}</span>`}<span class="title" style="white-space:normal">${esc(t('dq_' + i.check))}</span><span class="chip ${sevCls[i.severity]}">${esc(t('dq_sev_' + i.severity))}</span>${i.detail ? `<span class="sub" style="white-space:normal">${esc(i.check === 'km_stale' ? fmtD(i.detail) : i.detail)}</span>` : ''}${href ? '</a>' : '</div>'}`; }).join('')}</div>`, 'more');
  $$('[data-dq]').forEach((b) => (b.onclick = () => { S.dqFilter = b.dataset.dq; viewQuality(); }));
  $$('[data-dqsev]').forEach((b) => (b.onclick = () => { S.dqSev = b.dataset.dqsev; viewQuality(); }));
  const dc = $('#dqcsv'); if (dc) dc.onclick = () => download(new Blob([dataQualityCsv(items, t)], { type: 'text/csv;charset=utf-8' }), `fuhrpark-datenqualitaet_${r.environment}_${bDate()}.csv`);
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
      const vs = vehicles.filter((v) => [v.plate, v.vin, v.trailer_plate, v.truck_plate].some((x) => norm(x).includes(n))).slice(0, 10);
      const cs = (await api('GET', '/api/cases?limit=20&q=' + encodeURIComponent(q))).cases;
      if (canFines && !fineList) fineList = (await api('GET', '/api/fines')).fines;
      if (canStock && !stockList) stockList = (await api('GET', '/api/stock')).items;
      if (my !== seq) return;
      const lq = q.toLowerCase();
      const fs = canFines ? fineList.filter((f) => [f.plate, f.plate_in_letter].some((x) => norm(x).includes(n)) || [f.fine_no, f.reference, f.authority].some((x) => String(x || '').toLowerCase().includes(lq))).slice(0, 10) : [];
      const ss = canStock ? stockList.filter((i) => [i.name, i.part_number, i.location].some((x) => String(x || '').toLowerCase().includes(lq))).slice(0, 10) : [];
      // Hilfe-Abschnitte der eigenen Rolle (gleiche Suche wie auf der Hilfeseite)
      const hs = (helpMatches(helpSections(S.me.role).map((h) => ({ name: h, title: t(`help_${h}_t`), steps: t(`help_${h}_s`).split('|') })), q) || []).sort((a, b) => b.title_hit - a.title_hit).slice(0, 5);
      box.innerHTML = `<h2>${esc(t('nav_vehicles'))} <span class="chip">${vs.length}</span></h2>${vs.length ? `<div class="list">${vs.map((v) => `<a class="row" href="#/vehicles/${encodeURIComponent(v.id)}">${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="title">${v.kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${esc(v.manufacturer || '')} ${esc(v.site || '')}</span><span class="chip">${esc(t('av_' + v.availability))}</span><span class="sub">${esc(v.vin || '')}</span></a>`).join('')}</div>` : `<p class="muted">–</p>`}
        <h2>${esc(t('nav_cases'))} <span class="chip">${cs.length}</span></h2>${caseList(cs, '–')}`
        + (fs.length ? `<h2>${esc(t('fines'))} <span class="chip">${fs.length}</span></h2><div class="list" id="gfines">${fs.map((f) => `<a class="row" href="#/fines/${esc(f.id)}">${plate(f.plate || f.plate_in_letter)}<span class="title">${esc(t('fk_' + f.kind))}</span><span class="chip">${esc(t('fs_' + f.status))}</span><span class="sub">${esc(f.fine_no)}${f.reference ? ' · ' + esc(f.reference) : ''}${f.authority ? ' · ' + esc(f.authority) : ''}</span></a>`).join('')}</div>` : '')
        + (ss.length ? `<h2>${esc(t('stock'))} <span class="chip">${ss.length}</span></h2><div class="list" id="gstock">${ss.map((i) => `<a class="row ${i.below_min ? 'p-mittel' : ''}" href="#/stock/${esc(i.id)}"><span class="chip">${esc(i.site)}</span><span class="title">${esc(i.name)}</span><b>${i.on_hand} ${esc(i.unit)}</b><span class="sub">${[i.part_number && esc(i.part_number), i.location && esc(i.location), i.below_min && esc(t('below_min'))].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>` : '')
        + (hs.length ? `<h2>${esc(t('help'))} <span class="chip">${hs.length}</span></h2><div class="list" id="ghelp">${hs.map((h) => `<a class="row" href="#/help?s=${h.name}&q=${encodeURIComponent(q)}"><span>?</span><span class="title">${esc(t(`help_${h.name}_t`))}</span><span></span></a>`).join('')}</div>` : '');
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
  if (r === 'viewer') return ['viewer', 'kpi', 'push'];
  const parts = ['report', 'accident', 'prio', 'check', 'push', 'offline'];
  if (r === 'workshop') parts.unshift('ws', 'costlimit', 'stock');
  if (r === 'workshop') parts.splice(parts.indexOf('stock') + 1, 0, 'tires');
  if (['owner', 'fleet'].includes(r)) parts.unshift('fleet', 'release', 'costlimit', 'dates', 'defects', 'kpi', 'drivers', 'contracts', 'claims', 'fines', 'tires', 'stock');
  if (r === 'owner') parts.splice(parts.indexOf('stock') + 1, 0, 'privacy');
  if (r === 'dispatch') parts.unshift('dispo');
  if (r === 'driver') parts.unshift('myveh', 'myfines');
  return parts;
}

// Link „Hilfe zu dieser Seite“ – nur wenn die Rolle den Abschnitt sieht
const helpLink = (n) => (S.me && helpSections(S.me.role).includes(n) ? `<p class="small" style="margin:4px 0 12px"><a href="#/help?s=${n}">${esc(t('help_page'))} ›</a></p>` : '');

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
    $('#hres').textContent = !res ? '' : res.length ? t('help_hits').replace('{n}', res.length) : t('help_none');
  };
  if (document.getElementById('hq').value) run(); // vorbelegter Suchbegriff: erst filtern, dann zum Abschnitt springen
  if (want && parts.includes(want)) go(want);
  return run;
}

// ---------- Mängelstatistik der Kontrollen ----------
async function viewDefects() {
  const days = S.defDays || 90; const kind = S.defKind || '';
  const r = await api('GET', `/api/reports/defects?days=${days}${kind ? '&kind=' + kind : ''}`);
  const veh = (id, p) => `<a href="#/vehicles/${encodeURIComponent(id)}">${esc(p)}</a>`;
  const vlist = r.vehicles.filter((v) => v.defect_items > 0);
  render(`<h1>${esc(t('defect_stats'))}</h1>${helpLink('defects')}<p class="small muted">${esc(t('defect_stats_hint'))}</p>
    <p class="print-only small">${esc(t('printed_at'))}: ${fmtDT(new Date().toISOString())} · ${esc(S.me.display_name)} · ${days} ${esc(t('days'))}${kind ? ' · ' + esc(kind === 'abfahrt' ? t('nav_check') : t('inspection')) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="panel noprint" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
      <div><label for="dd">${esc(t('period'))}</label><select id="dd">${[30, 90, 180, 365].map((d) => `<option value="${d}"${d === days ? ' selected' : ''}>${d} ${esc(t('days'))}</option>`).join('')}</select></div>
      <div><label for="dk">${esc(t('check_kind'))}</label><select id="dk">${[['', t('all')], ['abfahrt', t('nav_check')], ['nach_reparatur', t('inspection')]].map(([k, l]) => `<option value="${k}"${k === kind ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <button type="button" class="btn secondary" id="dprt">${esc(t('print'))}</button>
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
  $('#dprt').onclick = () => window.print();
}

// ---------- Reifen über die Flotte ----------
async function viewFleetTires() {
  const r = await api('GET', '/api/tires/fleet');
  const f = S.tireFilter || 'attention';
  const sel = { attention: (x) => x.status === 'unter_minimum' || x.status === 'warnung', never: (x) => x.measured_positions === 0, stale: (x) => x.stale && x.measured_positions > 0, all: () => true }[f];
  const rows = r.rows.filter(sel);
  const cls = { unter_minimum: 'kritisch', warnung: 'mittel', ok: 'ok', unbekannt: '' };
  const tabs = [['attention', `${t('ts_unter_minimum')} / ${t('ts_warnung')}`, r.totals.below_min + r.totals.warn], ['stale', t('tires_stale').replace('{d}', r.stale_days), r.totals.stale], ['never', t('tires_never'), r.totals.never_measured], ['all', t('filter_all'), r.totals.vehicles]];
  render(`<h1>${esc(t('fleet_tires'))}</h1>${helpLink('tires')}<p class="small muted">${esc(t('tires_rule').replace('{min}', String(r.legal_min_tread_mm).replace('.', ',')).replace('{warn}', r.warn_tread_mm === null ? '–' : String(r.warn_tread_mm).replace('.', ',')))}</p>
    <div class="actions" style="flex-wrap:wrap">${tabs.map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-tf="${k}">${esc(l)} (${n})</button>`).join('')}</div>
    <div class="list">${rows.map((x) => `<a class="row ${x.status === 'unter_minimum' ? 'p-kritisch' : x.status === 'warnung' ? 'p-mittel' : ''}" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title">${x.min_tread_mm === null ? '–' : esc(String(x.min_tread_mm).replace('.', ',')) + ' mm'}</span><span class="chip ${cls[x.status]}">${esc(t('ts_' + x.status))}</span><span class="sub">${[x.kind === 'anhaenger' && esc(t('vk_anhaenger')), x.site && esc(x.site), `${x.measured_positions} ${esc(t('positions'))}`, x.below_min && `${x.below_min}× < ${String(r.legal_min_tread_mm).replace('.', ',')} mm`, x.oldest_measure_at && `${esc(t('tires_oldest'))} ${fmtD(x.oldest_measure_at)}`].filter(Boolean).join(' · ')}</span></a>`).join('') || `<p class="muted">–</p>`}</div>`, 'more');
  $$('[data-tf]').forEach((b) => (b.onclick = () => { S.tireFilter = b.dataset.tf; viewFleetTires(); }));
}

// ---------- Mehr / Benutzer / Einstellungen ----------
function viewMore() {
  render(`<h1>${esc(t('nav_more'))}</h1><div class="list">
    ${S.me.role !== 'driver' ? `<a class="row" href="#/vehicles"><span>${ICON.truck}</span><span class="title">${esc(t('vehicles'))}</span><span></span></a>` : ''}
    <a class="row" href="#/check"><span>✓</span><span class="title">${esc(t('departure_check'))}</span><span></span></a>
    <a class="row" href="#/inbox"><span>${ICON.bell}</span><span class="title">${esc(t('notifications'))}</span><span></span></a>
    <a class="row" href="#/help"><span>?</span><span class="title">${esc(t('help'))}</span><span></span></a>
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
  <details><summary>${esc(t('change_password'))}</summary><form id="pw"><label>${esc(t('old_password'))}</label><input type="password" name="old_password" required autocomplete="current-password"><label>${esc(t('new_password'))}<span class="hint">${esc(t('pw_rule'))}</span></label><input type="password" name="new_password" required minlength="10" autocomplete="new-password"><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>
  <details id="sess"><summary>${esc(t('my_sessions'))}</summary><div id="sesslist" class="list"><p class="muted">${esc(t('loading'))}</p></div></details>
  <div class="actions"><button class="btn secondary" id="lo">${esc(t('logout'))}</button></div></section>`, 'more');
  bindLang(true);
  const sess = $('#sess');
  const loadSessions = async () => {
    const box = $('#sesslist'); if (!box) return;
    const list = (await api('GET', '/api/me/sessions')).sessions;
    box.innerHTML = list.map((x) => `<div class="row"><span>${x.current ? '●' : '○'}</span><span class="title">${esc(x.device)}${x.current ? ` <span class="chip ok">${esc(t('this_device'))}</span>` : ''}</span>${x.current ? '<span></span>' : `<button type="button" class="btn secondary" data-sid="${esc(x.id)}">${esc(t('sign_out_device'))}</button>`}<span class="sub" style="white-space:normal">${esc(t('last_active'))}: ${fmtDT(x.last_seen)} · ${esc(t('signed_in_at'))}: ${fmtDT(x.created_at)}</span></div>`).join('')
      + (list.length > 1 ? `<div class="actions"><button type="button" class="btn secondary" id="sessall">${esc(t('sign_out_others'))}</button></div>` : '');
    $$('[data-sid]', box).forEach((b) => (b.onclick = async () => { try { await api('DELETE', `/api/me/sessions/${b.dataset.sid}`); toast('✓'); loadSessions(); } catch (err) { toast(err.message, true); } }));
    const all = $('#sessall', box); if (all) all.onclick = async () => { try { const r = await api('POST', '/api/me/sessions/revoke-others'); toast(`✓ ${r.revoked}`); loadSessions(); } catch (err) { toast(err.message, true); } };
  };
  sess.ontoggle = () => { if (sess.open) loadSessions().catch((err) => toast(err.message, true)); };
  $('#lo').onclick = async () => { await api('POST', '/api/logout'); clearOfflineData(); S.me = null; location.hash = '#/login'; };
  $('#pw').onsubmit = async (e) => { e.preventDefault(); try { await api('POST', '/api/me/password', Object.fromEntries(new FormData(e.target))); toast('✓'); } catch (err) { toast(err.message, true); } };
}

async function viewUsers() {
  const us = (await api('GET', '/api/users')).users;
  const roles = S.me.role === 'owner' ? ['owner', 'fleet', 'workshop', 'dispatch', 'driver', 'viewer'] : ['driver', 'workshop', 'viewer'];
  render(`<h1>${esc(t('users'))}</h1><div id="inv"></div>
    <details class="panel"><summary>${esc(t('new_user'))}</summary><form id="nf">
      <label>${esc(t('display_name'))}</label><input name="display_name" required><label>${esc(t('username'))}</label><input name="username" required autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="m.mustermann">
      <label>${esc(t('role'))}</label><select name="role" id="rs">${roles.map((r) => `<option value="${r}">${esc(t('role_' + r))}</option>`).join('')}</select>
      <div id="wsrow" hidden><label>${esc(t('workshop'))}</label><select name="workshop_site">${S.meta.workshops.map((w) => `<option value="${esc(w.code)}">${esc(w.name)}</option>`).join('')}</select></div>
      ${S.me.role === 'owner' ? `<label>${esc(t('environment'))}</label><select name="environment"><option value="test">${esc(t('env_testname'))}</option><option value="production">${esc(t('env_prod'))}</option></select>` : ''}
      <div class="actions"><button class="btn">${esc(t('new_user'))}</button></div></form></details>
    <div class="scroll"><table class="stack"><thead><tr><th>${esc(t('display_name'))}</th><th>${esc(t('role'))}</th><th>${esc(t('environment'))}</th><th></th></tr></thead><tbody>
    ${us.map((u) => `<tr><td>${esc(u.display_name)}<div class="small muted">${esc(u.username)}${u.has_password ? '' : ' · ' + esc(t('dq_invite_pending'))}</div>${u.locked_until ? `<span class="chip kritisch">${esc(t('locked_until'))} ${fmtDT(u.locked_until)}</span>` : ''}${u.sessions ? `<div class="small muted">${esc(t('active_sessions').replace('{n}', u.sessions))} · ${fmtDT(u.last_seen)}</div>` : ''}</td><td>${esc(t('role_' + u.role))}${u.workshop_site ? ' · ' + esc(wsName(u.workshop_site)) : ''}</td><td>${u.environment === 'test' ? '<span class="chip test">TEST</span>' : esc(t('env_prod'))}</td><td>${u.id !== S.me.id ? `${u.locked_until ? `<button class="btn secondary" data-unlock="${esc(u.id)}">${esc(t('unlock'))}</button> ` : ''}${u.sessions ? `<button class="btn secondary" data-revoke="${esc(u.id)}" data-name="${esc(u.display_name)}">${esc(t('revoke_sessions'))}</button> ` : ''}<button class="btn secondary" data-inv="${esc(u.id)}">${esc(t('new_invite'))}</button> <button class="btn secondary" data-act="${esc(u.id)}" data-on="${u.active ? 0 : 1}">${esc(u.active ? t('deactivate') : t('activate'))}</button>` : ''}${S.me.role === 'owner' ? ` <button class="btn secondary" data-dex="${esc(u.id)}" data-user="${esc(u.username)}" title="${esc(t('data_export_hint'))}">${esc(t('data_export'))}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`, 'more');
  $$('[data-revoke]').forEach((b) => (b.onclick = async () => { if (!confirm(t('revoke_sessions_confirm').replace('{name}', b.dataset.name))) return; try { const r = await api('POST', `/api/users/${b.dataset.revoke}/revoke-sessions`); toast(t('revoked_n').replace('{n}', r.sessions).replace('{p}', r.push_devices)); viewUsers(); } catch (err) { toast(err.message, true); } }));
  $$('[data-dex]').forEach((b) => (b.onclick = async () => { if (!confirm(t('data_export_hint'))) return; try { const x = await api('GET', `/api/admin/users/${b.dataset.dex}/data-export`); download(x instanceof Blob ? x : new Blob([JSON.stringify(x, null, 1)], { type: 'application/json' }), `datenauskunft_${b.dataset.user}_${bDate()}.json`); } catch (err) { toast(err.message, true); } }));
  $$('[data-unlock]').forEach((b) => (b.onclick = async () => { try { await api('POST', `/api/users/${b.dataset.unlock}/unlock`); toast('✓'); viewUsers(); } catch (err) { toast(err.message, true); } }));
  const showInvite = (token) => { const link = `${location.origin}/#/invite/${token}`; $('#inv').innerHTML = `<div class="panel good"><p>${esc(t('invite_link'))}</p><input readonly value="${esc(link)}" id="il"><div class="actions"><button class="btn" id="cp">${esc(t('copy'))}</button></div><p class="small muted">${esc(t('invite_qr_hint'))}</p><div class="qr">${(() => { try { return qrSvg(link, { label: t('invite_link') }); } catch { return ''; } })()}</div></div>`; $('#cp').onclick = async () => { try { await navigator.clipboard.writeText(link); toast(t('copied')); } catch { $('#il').select(); } }; window.scrollTo(0, 0); };
  $('#rs').onchange = () => ($('#wsrow').hidden = $('#rs').value !== 'workshop');
  $('#nf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); if (b.role !== 'workshop') delete b.workshop_site; b.username = b.username.toLowerCase(); try { const r = await api('POST', '/api/users', b); await viewUsers(); showInvite(r.invite_token); } catch (err) { toast(err.message, true); } };
  $$('[data-inv]').forEach((b) => (b.onclick = async () => { try { const r = await api('POST', `/api/users/${b.dataset.inv}/invite`); showInvite(r.invite_token); } catch (err) { toast(err.message, true); } }));
  $$('[data-act]').forEach((b) => (b.onclick = async () => { try { await api('PATCH', `/api/users/${b.dataset.act}`, { active: b.dataset.on === '1' }); viewUsers(); } catch (err) { toast(err.message, true); } }));
}

async function viewSettings() {
  const s = await api('GET', '/api/settings');
  const v = s.values;
  const field = (k, label) => `<label for="${k}">${esc(label)}</label><input id="${k}" name="${k}" inputmode="decimal" value="${esc(v[k] ?? '')}">`;
  const slaRows = ['test', 'production'].map((e) => `<h3>${esc(e === 'test' ? t('env_testname') : t('env_prod'))}</h3><div class="scroll"><table><tr><th></th>${['niedrig', 'mittel', 'kritisch'].map((p) => `<th>${esc(t('prio_' + p))}</th>`).join('')}</tr>${['triage', 'ack'].map((k) => `<tr><td>${esc(k === 'triage' ? t('act_receive') : t('act_acknowledge'))}</td>${['niedrig', 'mittel', 'kritisch'].map((p) => `<td><input name="sla_${e}_${k}_${p}_min" inputmode="numeric" value="${esc(v[`sla_${e}_${k}_${p}_min`] ?? '')}" aria-label="${esc((e === 'test' ? t('env_testname') : t('env_prod')) + ' · ' + (k === 'triage' ? t('act_receive') : t('act_acknowledge')) + ' · ' + t('prio_' + p) + ' (min)')}"></td>`).join('')}</tr>`).join('')}</table></div>`).join('');
  render(`<h1>${esc(t('settings'))}</h1><form id="sf" class="panel"><label class="check"><input type="checkbox" id="tmr"${v.test_master_readonly === '1' ? ' checked' : ''}> ${esc(t('test_master_readonly'))}</label><p class="small muted">${esc(t('test_master_readonly_hint'))}</p>${field('idle_logout_workshop_min', t('idle_ws'))}${field('idle_logout_other_min', t('idle_other'))}<p class="small muted">${esc(t('idle_hint'))}</p>${field('workshop_hourly_rate_net', t('hourly_rate'))}${field('maintenance_warn_days', t('warn_days'))}${field('maintenance_warn_km', t('warn_km'))}${field('tire_warn_tread_mm', t('tire_warn'))}${field('fine_warn_days', t('response_due') + ' – ' + t('warn_days'))}${field('driver_doc_warn_days', t('driver_doc_warn'))}${field('license_check_months', t('license_check_months'))}${field('tacho_warn_days', t('tacho_warn'))}${field('contract_warn_days', t('ct_warn'))}${field('claim_followup_days', t('claim_followup'))}${field('repair_cost_limit_net', t('cost_limit_setting'))}<p class="small muted">${esc(t('cost_limit_setting_hint'))}</p><h2>${esc(t('sla'))}</h2>${slaRows}<div class="actions"><button class="btn">${esc(t('save'))}</button></div></form>
    <section class="panel"><h2 style="margin-top:0">${esc(t('import_csv'))}</h2><p class="small muted">Kennzeichen;Standort;Status;Hersteller;Baujahr;FIN;Anhänger · ${esc(t('import_trailer_hint'))}</p><input type="file" id="csv" accept=".csv,text/csv" aria-label="${esc(t('import_csv'))}"><div id="csvr"></div></section>
    <section class="panel"><h2 style="margin-top:0">${esc(t('import_tires'))}</h2><p class="small muted">Quelle;Kennzeichen;FIN;Reifen Lenkachse;Reifen Liftachse;Reifen Antriebsachse;Reifen Anhänger</p><input type="file" id="tcsv" accept=".csv,text/csv" aria-label="${esc(t('import_tires'))}"><div id="tcsvr"></div></section>
    <section class="panel"><h2 style="margin-top:0">${esc(t('backup'))}</h2><p class="small muted">${esc(t('backup_hint'))}</p><button type="button" class="btn secondary" id="bkp">${esc(t('backup_download'))}</button></section>`, 'more');
  $('#bkp').onclick = async () => { try { const blob = await api('GET', '/api/admin/backup'); const b = blob instanceof Blob ? blob : new Blob([JSON.stringify(blob)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `fuhrpark-sicherung_${bDate()}.json`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } catch (err) { toast(err.message, true); } };
  $('#tcsv').onchange = async () => {
    const f = $('#tcsv').files[0]; if (!f) return;
    const text = await f.text();
    try {
      const r = await api('POST', '/api/tires/import?dry_run=1', text, { headers: { 'content-type': 'text/csv' } });
      $('#tcsvr').innerHTML = `<p><b>${esc(t('preview'))}:</b> ${r.counts.neu} ${esc(t('imp_new'))} · ${r.counts.geaendert} ${esc(t('imp_changed'))} · ${r.counts.unveraendert} ${esc(t('imp_same'))} · ${r.kept_verified} ${esc(t('tires_kept_verified'))} · ${r.skipped_no_vehicle.length} ${esc(t('tires_no_vehicle'))}</p><div class="actions"><button type="button" class="btn" id="tgo"${r.counts.neu + r.counts.geaendert ? '' : ' disabled'}>${esc(t('apply_import'))}</button></div>`;
      $('#tgo').onclick = async () => { try { const g = await api('POST', '/api/tires/import', text, { headers: { 'content-type': 'text/csv' } }); $('#tcsvr').innerHTML = `<p>✓ ${g.imported}</p>`; } catch (err) { toast(err.message, true); } };
    } catch (err) { toast(err.message, true); }
  };
  $('#sf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k in b) b[k] = b[k] === '' ? null : b[k].replace(',', '.'); b.test_master_readonly = $('#tmr').checked ? '1' : null; try { await api('PUT', '/api/settings', b); toast('✓'); } catch (err) { toast(err.message, true); } };
  $('#csv').onchange = async () => {
    const f = $('#csv').files[0]; if (!f) return;
    const text = await f.text();
    const skipped = (r) => (r.skipped.length ? `<p class="small">${r.skipped.length} ${esc(t('skipped'))}: ${esc(r.skipped.map((x) => `${t('line')} ${x.line} ${x.plate || ''} (${x.reason})`).join(', '))}</p>` : '');
    const FL = { plate: t('plate_label'), site: t('site'), manufacturer: t('manufacturer'), model: t('model_label'), build_year: t('year'), trailer_plate: t('trailer'), master_status: t('status_label'), kind: t('vehicle_kind') };
    try {
      const r = await api('POST', '/api/vehicles/import?dry_run=1', text, { headers: { 'content-type': 'text/csv' } });
      const changed = r.preview.filter((x) => x.action !== 'unverändert');
      $('#csvr').innerHTML = `<p><b>${esc(t('preview'))}:</b> ${r.counts.neu} ${esc(t('imp_new'))} · ${r.counts.geaendert} ${esc(t('imp_changed'))} · ${r.counts.unveraendert} ${esc(t('imp_same'))}</p>${skipped(r)}
        ${changed.length ? `<div class="list">${changed.slice(0, 200).map((x) => `<div class="row ${x.action === 'neu' ? '' : 'p-mittel'}"><span class="chip">${esc(t('line'))} ${x.line}</span><span class="title">${esc(x.plate)}</span><span class="chip">${esc(x.action === 'neu' ? t('imp_new') : t('imp_changed'))}</span>${x.changes && x.changes.length ? `<span class="sub" style="white-space:normal">${x.changes.map((c) => `${esc(FL[c.field] || c.field)}: ${esc(c.from ?? '–')} → ${esc(c.to)}`).join(' · ')}</span>` : ''}</div>`).join('')}</div>` : ''}
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
// Zahlenfelder (Preise, Mengen, Stunden): „2.000“ ist mehrdeutig (2 oder 2000?) – der Server weist es ab; hier schon am Feld in der App-Sprache melden
const AMBIG_NUM = /^-?[1-9]\d{0,2}(\.\d{3})+$/;
document.addEventListener('input', (e) => { const el = e.target; if (el instanceof HTMLInputElement && el.inputMode === 'decimal') el.setCustomValidity(AMBIG_NUM.test(el.value.trim()) ? t('num_ambiguous') : ''); });
document.addEventListener('change', (e) => { const el = e.target; if (el instanceof HTMLInputElement && el.inputMode === 'decimal' && AMBIG_NUM.test(el.value.trim())) el.reportValidity(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
setInterval(checkVersion, 30 * 60 * 1000);

// ---------- Start ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'navigate') location.hash = e.data.hash; if (e.data && e.data.type === 'push') refreshUnread().then(() => { if (S.me) { const b = document.querySelector('.topbar .badge'); if (!b) route(); } }); });
}
document.documentElement.lang = S.lang;
route();
