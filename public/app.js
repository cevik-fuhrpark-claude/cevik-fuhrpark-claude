// [CLAUDE] Cevik Fuhrpark – Oberfläche (ohne Framework, mobil zuerst)
import { STRINGS, CHECK_LABELS } from './i18n.js';

const S = { me: null, meta: null, lang: localStorage.getItem('cfp_lang') || 'de', viewEnv: null, unread: 0 };
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = (k) => (STRINGS[S.lang] && STRINGS[S.lang][k]) || STRINGS.de[k] || k;
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
const fmtDT = (iso) => (iso ? new Date(iso).toLocaleString(S.lang === 'uk' ? 'uk-UA' : S.lang === 'en' ? 'en-GB' : 'de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '–');
const fmtD = (iso) => (iso ? new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso).toLocaleDateString(S.lang === 'uk' ? 'uk-UA' : S.lang === 'en' ? 'en-GB' : 'de-DE') : '–');
const eur = (n) => (n === null || n === undefined ? '–' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n));
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
  catch { throw new Error(t('offline')); }
  if (res.status === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/invite')) { S.me = null; location.hash = '#/login'; throw new Error('Bitte anmelden.'); }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.blob();
  if (!res.ok) { const e = new Error((data && data.message) || `${t('error')} ${res.status}`); e.code = data && data.error; e.status = res.status; throw e; }
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
  return `
  <header class="topbar">
    <div class="brand">CEVIK ${esc(t('app'))} <small>[CLAUDE]</small></div>
    <div class="spacer"></div>
    ${S.me.role === 'owner' ? `<select id="envsel" aria-label="${esc(t('env_switch'))}"><option value="production"${env === 'production' ? ' selected' : ''}>${esc(t('env_prod'))}</option><option value="test"${env === 'test' ? ' selected' : ''}>${esc(t('env_testname'))}</option></select>` : ''}
    <a href="#/inbox" aria-label="${esc(t('notifications'))}" style="position:relative;color:#fff;display:flex">${ICON.bell}${S.unread ? `<span class="badge" style="position:absolute;top:-6px;right:-10px">${S.unread}</span>` : ''}</a>
  </header>
  ${env === 'test' ? `<div class="testband">${esc(t('env_test'))}</div>` : ''}
  <nav class="tabbar">${tabs.map(([href, icon, label, key]) => `<a href="${href}" class="${key === active ? 'active' : ''}${key === 'new' ? ' report' : ''}">${key === 'new' ? `<span class="dot">${ICON[icon]}</span>` : ICON[icon]}<span>${esc(label)}</span></a>`).join('')}</nav>
  <main id="main">${content}</main>`;
}

function render(html, active) {
  document.getElementById('app').innerHTML = S.me ? frame(html, active) : `<main>${html}</main>`;
  const es = $('#envsel');
  if (es) es.onchange = () => { S.viewEnv = es.value; localStorage.setItem('cfp_env', es.value); route(); };
  window.scrollTo(0, 0);
}

// ---------- Router ----------
const routes = [
  [/^#\/login$/, viewLogin], [/^#\/setup$/, viewSetup], [/^#\/invite\/(.+)$/, viewInvite],
  [/^#\/?$/, viewHome], [/^#\/cases$/, viewCases], [/^#\/cases\/([\w-]+)$/, viewCase], [/^#\/new$/, viewNew],
  [/^#\/vehicles$/, viewVehicles], [/^#\/vehicles\/(VIN:[A-Z0-9]+)$/, viewVehicle], [/^#\/inbox$/, viewInbox],
  [/^#\/master$/, viewMaster], [/^#\/users$/, viewUsers], [/^#\/settings$/, viewSettings], [/^#\/more$/, viewMore],
  [/^#\/check$/, viewDepartureCheck], [/^#\/stock$/, viewStock], [/^#\/fines$/, viewFines], [/^#\/costs$/, viewCosts], [/^#\/fines\/([\w-]+)$/, viewFine], [/^#\/stock\/([\w-]+)$/, viewStockItem], [/^#\/inspect\/([\w-]+)$/, viewInspection],
];
async function route() {
  const h = location.hash || '#/';
  const pub = /^#\/(login|setup|invite\/)/.test(h);
  try {
    if (!S.me && !pub) {
      try { const r = await api('GET', '/api/me'); S.me = r.user; S.lang = r.user.language || S.lang; }
      catch { const st = await api('GET', '/api/setup/status').catch(() => ({})); location.hash = st.needs_setup ? '#/setup' : '#/login'; return; }
      if (S.me.role === 'owner') S.viewEnv = localStorage.getItem('cfp_env') || null;
      S.meta = await api('GET', '/api/meta');
      refreshUnread();
    }
    for (const [re, fn] of routes) { const m = h.match(re); if (m) return await fn(...m.slice(1).map(decodeURIComponent)); }
    location.hash = '#/';
  } catch (e) {
    render(`<div class="panel alert"><p>${esc(e.message)}</p><button class="btn" id="rl">${esc(t('retry'))}</button></div>`);
    const rl = document.getElementById('rl'); if (rl) rl.onclick = () => location.reload();
  }
}
window.addEventListener('hashchange', route);

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
    ${langSelect()}
  </form></div>`);
  bindLang();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await api('POST', '/api/login', { username: $('#u').value.trim(), password: $('#p').value }); S.me = null; location.hash = '#/'; route(); }
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
    <label for="c">${esc(t('setup_code'))}</label><input id="c" required autocomplete="off">
    <label for="u">${esc(t('username'))}</label><input id="u" required autocapitalize="none" pattern="[a-z0-9._-]{3,64}">
    <label for="n">${esc(t('display_name'))}</label><input id="n" required>
    <div class="actions"><button class="btn block">${esc(t('create_owner'))}</button></div></form></div>`);
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await api('POST', '/api/setup', { setup_code: $('#c').value, username: $('#u').value.trim().toLowerCase(), display_name: $('#n').value }); location.hash = '#/invite/' + r.invite_token; }
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
async function viewHome() {
  render(`<p class="muted">${esc(t('loading'))}</p>`, 'home');
  const d = await api('GET', '/api/dashboard');
  const cases = (await api('GET', '/api/cases?status=open&limit=8')).cases;
  let html = `<h1>${esc(t('welcome'))}, ${esc(S.me.display_name)}</h1>`;
  if (S.me.role === 'driver') {
    html += `<a class="btn block" href="#/new" style="margin:8px 0 12px">${esc(t('report_damage'))}</a><a class="btn secondary block" href="#/check">${esc(t('departure_check'))}</a>`;
    html += `<h2>${esc(t('nav_cases'))}</h2>${caseList(cases, t('no_cases_driver'))}`;
  } else {
    if (d.vehicles) {
      const v = d.vehicles; const tot = Math.max(v.total, 1);
      const seg = [['gesperrt', v.gesperrt, 'var(--stop)'], ['werkstatt', v.werkstatt, 'var(--mid)'], ['meldung_offen', v.meldung_offen, 'var(--signal)'], ['einsatzbereit_lt_system', v.einsatzbereit, 'var(--go)']];
      html += `<section class="panel"><h2 style="margin-top:0">${esc(t('vehicles'))}: ${v.total}</h2>
        <div class="fleetbar" role="img" aria-label="Flottenzustand">${seg.map(([, n, c]) => `<span style="width:${(n / tot) * 100}%;background:${c}"></span>`).join('')}</div>
        <div class="legend">${seg.map(([k, n, c]) => `<span><i style="background:${c}"></i>${esc(t('av_' + k))}: <b>${n}</b></span>`).join('')}</div></section>`;
    }
    html += `<div class="stats"><div><b>${d.open_cases}</b>${esc(t('open'))}</div><div><b style="color:var(--stop)">${d.critical}</b>${esc(t('prio_kritisch'))}</div><div><b>${d.locked}</b>${esc(t('locked'))}</div>
      ${S.me.role === 'workshop' ? `<div><b>${d.inbox}</b>${esc(t('act_acknowledge'))}</div><div><b>${d.in_progress}</b>${esc(t('st_in_reparatur'))}</div>` : ''}</div>`;
    if (d.findings && d.findings.length) {
      const n = d.findings.filter((f) => ['kritisch', 'handeln'].includes(f.severity)).reduce((s, f) => s + f.n, 0);
      if (n) html += `<a class="panel alert" style="display:block;text-decoration:none" href="#/master"><b>${esc(t('not_clear'))}</b>: ${n} ${esc(t('findings'))}</a>`;
    }
    html += `<h2>${esc(t('open'))}</h2>${caseList(cases)}<p><a href="#/cases">${esc(t('all'))}</a></p>`;
  }
  render(html, 'home');
}

function caseList(list, empty) {
  if (!list.length) return `<p class="muted">${esc(empty || t('no_cases'))}</p>`;
  return `<div class="list">${list.map((c) => `<a class="row p-${esc(c.priority)}" href="#/cases/${esc(c.id)}">
    ${plate(c.plate, { locked: c.safety_lock })}
    <span class="title">${esc(c.description)}</span>
    <span class="chip ${esc(c.status === 'fahrzeug_freigegeben' ? 'ok' : c.priority)}">${esc(t('st_' + c.status))}</span>
    <span class="sub">${esc(c.case_no)} · ${esc(t('prio_' + c.priority))}${c.safety_lock ? ' · ' + esc(t('locked')) : ''}${c.access === 'preview' ? ' · ' + esc(t('preview_hint')) : ''} · ${fmtDT(c.updated_at)}</span></a>`).join('')}</div>`;
}

async function viewCases() {
  const f = new URLSearchParams(location.hash.split('?')[1] || '').get('f') || sessionStorage.getItem('cfp_cf') || 'open';
  const list = (await api('GET', `/api/cases?status=${f === 'all' ? '' : f}`)).cases;
  render(`<h1>${esc(t('nav_cases'))}</h1>
    <div class="seg-tabs">${['open', 'closed', 'all'].map((k) => `<a href="#/cases" data-f="${k}" class="${k === f ? 'on' : ''}">${esc(t(k))}</a>`).join('')}</div>
    ${caseList(list)}`, 'cases');
  $$('.seg-tabs a').forEach((a) => (a.onclick = (e) => { e.preventDefault(); sessionStorage.setItem('cfp_cf', a.dataset.f); viewCases(); }));
}

// ---------- Neue Meldung ----------
async function viewNew() {
  const vs = (await api('GET', '/api/vehicles')).vehicles;
  const mine = vs.filter((v) => v.assigned);
  const others = vs.filter((v) => !v.assigned);
  const pick = (arr) => `<div class="vehpick">${arr.map((v) => `<label><input type="radio" name="veh" value="${esc(v.id)}" required>${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="small muted">${esc(v.site || '')}</span></label>`).join('')}</div>`;
  const ws = S.meta.workshops;
  render(`<h1>${esc(t('report_damage'))}</h1><form id="f">
    <label for="vq">${esc(t('choose_vehicle'))}</label><input id="vq" placeholder="SZ-…" autocomplete="off" style="margin-bottom:8px">
    ${mine.length ? `<h3>${esc(t('my_vehicles'))}</h3>${pick(mine)}<details><summary>${esc(t('other_vehicles'))}</summary>${pick(others)}</details>` : pick(vs)}
    <label for="d">${esc(t('what_wrong'))}<span class="hint">${esc(t('what_wrong_hint'))}</span></label><textarea id="d" required minlength="5" maxlength="4000"></textarea>
    <label>${esc(t('urgency'))}</label><div class="choices">${['niedrig', 'mittel', 'kritisch'].map((p, i) => `<label class="choice c-${p}"><input type="radio" name="prio" value="${p}"${i === 0 ? ' checked' : ''}><span><b>${esc(t('prio_' + p))}</b><span class="small muted">${esc(t('prio_' + p + '_d'))}</span></span></label>`).join('')}</div>
    <label>${esc(t('driveable'))}</label><div class="choices">${['fahrbereit', 'eingeschraenkt', 'nicht_fahrbereit', 'unbekannt'].map((p) => `<label class="choice${p === 'nicht_fahrbereit' ? ' c-kritisch' : ''}"><input type="radio" name="drv" value="${p}"${p === 'unbekannt' ? ' checked' : ''}><b>${esc(t('drv_' + p))}</b></label>`).join('')}</div>
    <label for="w">${esc(t('workshop'))}</label><select id="w"><option value="">–</option>${ws.map((w) => `<option value="${esc(w.code)}">${esc(w.name)}</option>`).join('')}</select>
    <label for="l">${esc(t('location'))}</label><input id="l" maxlength="300">
    <p class="small muted" style="margin-top:12px">${esc(t('photos_after'))}</p>
    <div class="actions"><button class="btn block" id="sb">${esc(t('send_report'))}</button></div></form>`, 'new');
  const key = uid();
  $('#vq').oninput = () => { const q = $('#vq').value.toLowerCase().replace(/[\s-]/g, ''); $$('.vehpick label').forEach((l) => (l.hidden = q && !l.textContent.toLowerCase().replace(/[\s-]/g, '').includes(q))); if (q) $$('details').forEach((d) => (d.open = true)); };
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const veh = $('input[name=veh]:checked');
    if (!veh) { toast(t('choose_vehicle'), true); return; }
    $('#sb').disabled = true;
    try {
      const r = await api('POST', '/api/cases', { vehicle_id: veh.value, description: $('#d').value, priority: $('input[name=prio]:checked').value,
        driveability: $('input[name=drv]:checked').value, workshop_site: $('#w').value || null, location_note: $('#l').value || null, request_key: key });
      toast(`${t('report_sent')}: ${r.case_no}`);
      location.hash = '#/cases/' + r.id;
    } catch (err) { toast(err.message, true); $('#sb').disabled = false; }
  };
}

// ---------- Vorgang ----------
async function viewCase(id) {
  const d = await api('GET', '/api/cases/' + id);
  const c = d.case;
  const A = d.allowed_actions;
  const prioLine = c.reported_priority !== c.priority ? ` <span class="muted small">(${esc(t('reported_prio'))}: ${esc(t('prio_' + c.reported_priority))})</span>` : '';
  let html = `<p><a href="#/cases">‹ ${esc(t('back'))}</a></p>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${plate(d.vehicle.plate, { big: true, locked: c.safety_lock })}<span class="chip ${c.status === 'fahrzeug_freigegeben' ? 'ok' : esc(c.priority)}">${esc(t('st_' + c.status))}</span>${c.environment === 'test' ? '<span class="chip test">TEST</span>' : ''}</div>
    <h1 style="margin-top:12px">${esc(c.case_no)}</h1>
    ${c.safety_lock ? `<div class="panel alert"><b>${esc(t('locked'))}</b> – ${esc(c.safety_lock_reason || '')}</div>` : ''}
    ${d.access === 'preview' ? `<div class="panel">${esc(t('preview_hint'))}</div>` : ''}
    <section class="panel"><p style="white-space:pre-wrap;font-size:1.05rem">${esc(c.description)}</p>
    <dl class="kv">
      <dt>${esc(t('urgency'))}</dt><dd><span class="chip ${esc(c.priority)}">${esc(t('prio_' + c.priority))}</span>${prioLine}</dd>
      <dt>${esc(t('driveable'))}</dt><dd>${esc(t('drv_' + c.reported_driveability))}</dd>
      ${d.reporter_name ? `<dt>${esc(t('reported_by'))}</dt><dd>${esc(d.reporter_name)} · ${fmtDT(c.created_at)}</dd>` : `<dt>${esc(t('date'))}</dt><dd>${fmtDT(c.created_at)}</dd>`}
      <dt>${esc(t('received'))}</dt><dd>${c.fleet_received_at ? fmtDT(c.fleet_received_at) : esc(t('not_yet'))}</dd>
      <dt>${esc(t('workshop'))}</dt><dd>${esc(wsName(c.workshop_site || c.suggested_workshop_site))}${c.planned_date ? ' · ' + esc(t('planned')) + ' ' + fmtD(c.planned_date) : ''}</dd>
      ${c.status !== 'gemeldet' ? `<dt>${esc(t('workshop_ack'))}</dt><dd>${c.workshop_ack_at ? fmtDT(c.workshop_ack_at) : esc(t('not_yet'))}</dd>` : ''}
      ${c.location_note ? `<dt>${esc(t('location'))}</dt><dd>${esc(c.location_note)}</dd>` : ''}
      ${d.parent ? `<dt>${esc(t('parent'))}</dt><dd><a href="#/cases/${esc(d.parent.id)}">${esc(d.parent.case_no)}</a></dd>` : ''}
      ${!['driver'].includes(S.me.role) ? `<dt>${esc(t('vehicle_file'))}</dt><dd><a href="#/vehicles/${esc(d.vehicle.id)}">${esc(d.vehicle.plate)}</a></dd>` : ''}
    </dl></section>`;

  // Aktionen
  const main = A.filter((a) => !['comment', 'upload', 'inspection', 'resolve_open_item'].includes(a));
  if (main.length || A.includes('inspection')) {
    html += `<div class="actions">${A.includes('inspection') ? `<a class="btn" href="#/inspect/${esc(c.id)}">${esc(t('act_inspection'))}</a>` : ''}${main.map((a) => `<button class="btn ${['reject', 'set_safety_lock'].includes(a) ? 'danger' : a === 'technical_release' ? 'go' : ['record_work', 'add_part', 'add_open_item', 'add_external_cost', 'change_priority', 'reassign_workshop', 'lift_safety_lock', 'return_for_rework'].includes(a) ? 'secondary' : ''}" data-act="${esc(a)}">${esc(t('act_' + a))}</button>`).join('')}</div><div id="actform"></div>`;
  } else html += `<div id="actform"></div>`;

  // Dateien
  html += `<h2>${esc(t('files'))}</h2><div class="thumbs">${d.files.map((f) => f.content_type.startsWith('image/') ? `<a href="/api/files/${esc(f.id)}" target="_blank" rel="noopener"><img loading="lazy" src="/api/files/${esc(f.id)}" alt="${esc(f.filename)}"></a>` : `<a href="/api/files/${esc(f.id)}" target="_blank" rel="noopener">PDF<br>${esc(f.filename.slice(0, 14))}</a>`).join('')}</div>`;
  const canUpload = A.includes('upload') || (c.reporter_id === S.me.id && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status));
  if (canUpload && d.files.length < 10) html += `<label class="btn secondary" style="margin-top:8px;display:inline-flex">${esc(t('add_photos'))}<input id="file" type="file" accept="image/*,application/pdf" capture="environment" multiple hidden></label>`;

  // Restarbeiten
  if (d.open_items.length) {
    html += `<h2>${esc(t('open_items'))}</h2><div class="list">${d.open_items.map((o) => `<div class="row ${o.safety_relevant ? 'p-kritisch' : ''}"><span class="chip ${o.status === 'offen' ? (o.safety_relevant ? 'kritisch' : 'mittel') : 'ok'}">${esc(o.status)}</span><span class="title" style="white-space:normal">${esc(o.description)}</span>${o.status === 'offen' && A.includes('resolve_open_item') ? `<button class="btn secondary" data-resolve="${esc(o.id)}">${esc(t('done'))}</button>` : '<span></span>'}<span class="sub">${o.safety_relevant ? esc(t('safety_relevant')) + ' · ' : ''}${esc(o.created_by_name)} · ${fmtDT(o.created_at)}${o.resolution_note ? ' · ' + esc(o.resolution_note) : ''}</span></div>`).join('')}</div>`;
  }
  if (d.followups.length) html += `<h2>${esc(t('followups'))}</h2><div class="list">${d.followups.map((f) => `<a class="row p-${esc(f.priority)}" href="#/cases/${esc(f.id)}"><span class="chip">${esc(f.case_no)}</span><span class="title">${esc(f.description)}</span><span class="chip">${esc(t('st_' + f.status))}</span></a>`).join('')}</div>`;
  if (d.inspections.length) html += `<h2>${esc(t('inspections'))}</h2>${d.inspections.map((i) => `<details class="panel"><summary>${fmtDT(i.created_at)} · ${esc(i.performed_by_name)} · <span class="chip ${i.result === 'ok' ? 'ok' : 'kritisch'}">${i.result === 'ok' ? 'OK' : esc(t('defect'))}</span>${i.odometer_km ? ' · ' + i.odometer_km.toLocaleString('de-DE') + ' km' : ''}</summary><table>${i.items.map((it) => `<tr><td>${esc(checkLabel(it.key))}</td><td><span class="chip ${it.result === 'mangel' ? 'kritisch' : it.result === 'ok' ? 'ok' : ''}">${esc(t(it.result === 'mangel' ? 'defect' : it.result))}</span>${it.note ? ' ' + esc(it.note) : ''}${it.followup_case_no ? ` → <a href="#/cases/${esc(it.followup_case_id)}">${esc(it.followup_case_no)}</a>` : ''}</td></tr>`).join('')}</table></details>`).join('')}`;

  // Arbeiten, Teile, Kosten
  if (d.work) {
    html += `<h2>${esc(t('work'))} & ${esc(t('parts'))}</h2><div class="scroll"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('activity'))}</th><th>${esc(t('hours'))}</th></tr></thead><tbody>${d.work.map((w) => `<tr><td>${fmtD(w.work_date)}</td><td>${esc(w.description)}<br><span class="small muted">${esc(w.user_name)}</span></td><td>${w.hours}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table>
      <table style="margin-top:8px"><thead><tr><th>${esc(t('part_name'))}</th><th>${esc(t('qty'))}</th><th>€</th></tr></thead><tbody>${d.parts.map((p) => `<tr><td>${esc(p.name)}${p.part_number ? ` <span class="small muted">${esc(p.part_number)}</span>` : ''}</td><td>${p.quantity} ${esc(p.unit)}</td><td>${p.unit_price_net === null ? `<span class="chip mittel">${esc(t('unvalued'))}</span>` : eur(p.unit_price_net) + (p.valuation === 'estimate' ? ' (' + esc(t('estimate')) + ')' : '')}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table></div>`;
  }
  if (d.costs) {
    const k = d.costs;
    html += `<section class="panel ${k.complete ? '' : ''}"><h3>${esc(t('costs'))}</h3><dl class="kv"><dt>Ist</dt><dd>${eur(k.actual_net)}</dd><dt>${esc(t('estimate'))}</dt><dd>${eur(k.estimate_net)}</dd><dt>${esc(t('unvalued'))}</dt><dd>${k.unvalued_items ? `<span class="chip mittel">${k.unvalued_items}</span>` : '0'}</dd><dt>${esc(t('hours'))}</dt><dd>${k.hours}${k.hourly_rate_net === null ? ` <span class="small muted">(${esc(t('hourly_rate'))}: –)</span>` : ''}</dd></dl>
      ${d.external_costs && d.external_costs.length ? `<table>${d.external_costs.map((x) => `<tr><td>${esc(x.supplier)} ${esc(x.invoice_no || '')}</td><td>${x.amount_net === null ? esc(t('unvalued')) : eur(x.amount_net)}</td></tr>`).join('')}</table>` : ''}</section>`;
  }

  // Verlauf + Kommentar
  html += `<h2>${esc(t('history'))}</h2><ol class="timeline">${d.events.map((e) => `<li><time>${fmtDT(e.created_at)}</time> · <b>${esc(t('act_' + e.action) !== 'act_' + e.action ? t('act_' + e.action) : e.action === 'create' ? t('report_sent') : e.action)}</b>${e.actor_name ? ' · ' + esc(e.actor_name) : ''}${e.to_status && e.from_status !== e.to_status ? ` → ${esc(t('st_' + e.to_status))}` : ''}${e.note ? `<div style="white-space:pre-wrap">${esc(e.note)}</div>` : ''}${e.payload && e.payload.from && e.payload.to ? `<div class="small muted">${esc(e.payload.from)} → ${esc(e.payload.to)}</div>` : ''}</li>`).join('')}</ol>`;
  if (A.includes('comment')) html += `<form id="cf"><label for="ct">${esc(t('act_comment'))}</label><textarea id="ct" required></textarea><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form>`;
  render(html, 'cases');

  const cmd = async (action, note, payload = {}) => {
    try { await api('POST', `/api/cases/${c.id}/commands`, { action, command_id: uid(), expected_version: c.version, note, payload }); toast('✓'); viewCase(c.id); }
    catch (err) { toast(err.message, true); if (err.code === 'version_conflict') viewCase(c.id); }
  };
  $$('[data-act]').forEach((b) => (b.onclick = () => actionForm(b.dataset.act, c, cmd)));
  $$('[data-resolve]').forEach((b) => (b.onclick = () => actionForm('resolve_open_item', c, cmd, { open_item_id: b.dataset.resolve })));
  const cf = $('#cf'); if (cf) cf.onsubmit = (e) => { e.preventDefault(); cmd('comment', $('#ct').value); };
  const fi = $('#file'); if (fi) fi.onchange = async () => {
    for (const file of fi.files) {
      try { const blob = await prepareUpload(file); await api('POST', `/api/cases/${c.id}/files`, blob, { headers: { 'x-filename': encodeURIComponent(file.name), 'content-type': blob.type || 'application/octet-stream' } }); }
      catch (err) { toast(`${file.name}: ${err.message}`, true); }
    }
    viewCase(c.id);
  };
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
  const needsNote = ['change_priority', 'set_safety_lock', 'lift_safety_lock', 'approve_repair', 'reassign_workshop', 'reject', 'wait_parts', 'resolve_open_item', 'request_quality_check', 'return_for_rework', 'technical_release'];
  const wsOpts = S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${(c.workshop_site || c.suggested_workshop_site) === w.code ? ' selected' : ''}>${esc(w.name)}</option>`).join('');
  const prioOpts = (sel) => ['niedrig', 'mittel', 'kritisch'].map((p) => `<option value="${p}"${p === sel ? ' selected' : ''}>${esc(t('prio_' + p))}</option>`).join('');
  switch (action) {
    case 'change_priority': f.push(`<label>${esc(t('new_priority'))}</label><select name="priority">${prioOpts(c.priority)}</select>`); break;
    case 'approve_repair': f.push(`<label>${esc(t('workshop'))}</label><select name="workshop_site">${wsOpts}</select><label>${esc(t('urgency'))}</label><select name="priority">${prioOpts(c.priority)}</select><label>${esc(t('planned'))}</label><input type="date" name="planned_date">`); break;
    case 'reassign_workshop': f.push(`<label>${esc(t('workshop'))}</label><select name="workshop_site">${wsOpts}</select>`); break;
    case 'acknowledge': f.push(`<label>${esc(t('planned'))}</label><input type="date" name="planned_date">`); break;
    case 'record_work': f.push(`<label>${esc(t('hours'))}</label><input name="hours" inputmode="decimal" required><label>${esc(t('activity'))}</label><input name="description" required><label>${esc(t('date'))}</label><input type="date" name="work_date" value="${new Date().toISOString().slice(0, 10)}">`); break;
    case 'add_part': f.push(`<div id="stocksel"></div><div id="freepart">`); f.push(`<label>${esc(t('part_name'))}</label><input name="name" required><label>Teilenummer</label><input name="part_number"><label>${esc(t('qty'))}</label><input name="quantity" inputmode="decimal" value="1"><label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label>${esc(t('supplier'))}</label><input name="supplier"></div>`); break;
    case 'add_open_item': f.push(`<label>${esc(t('open_items'))}</label><input name="description" required><label class="check"><input type="checkbox" name="safety_relevant"> ${esc(t('safety_relevant'))}</label>`); break;
    case 'add_external_cost': f.push(`<label>${esc(t('supplier'))}</label><input name="supplier" required><label>${esc(t('invoice_no'))}</label><input name="invoice_no"><label>${esc(t('amount_net'))}</label><input name="amount_net" inputmode="decimal"><label class="check"><input type="checkbox" name="estimate"> ${esc(t('estimate'))}</label><label class="check"><input type="checkbox" name="covers_work_and_parts"> ${esc(t('covers_all'))}</label>`); break;
  }
  if (['technical_release', 'lift_safety_lock'].includes(action)) f.push(`<label class="check"><input type="checkbox" name="confirm" required> ${esc(t('confirm'))}</label>`);
  const noteLabel = action === 'approve_repair' ? t('scope') : ['technical_release'].includes(action) ? t('evidence') : needsNote.includes(action) ? t('reason') : t('note');
  f.push(`<label>${esc(noteLabel)}</label><textarea name="note"${needsNote.includes(action) ? ' required' : ''}></textarea>`);
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
  return S.meta.checklist.map((i) => `<div class="checkitem" data-key="${esc(i.key)}"><span>${esc(checkLabel(i.key))}</span>
    <span class="seg"><label><input type="radio" name="${esc(i.key)}" value="ok" required>${esc(t('ok'))}</label><label class="bad"><input type="radio" name="${esc(i.key)}" value="mangel">${esc(t('defect'))}</label><label><input type="radio" name="${esc(i.key)}" value="na">${esc(t('na'))}</label></span>
    <div class="detail" hidden><input name="${esc(i.key)}__note" placeholder="${esc(t('defect_note'))}"><label class="check"><input type="checkbox" name="${esc(i.key)}__safety"> ${esc(t('safety_relevant'))}</label></div></div>`).join('');
}
function bindChecklist(form) {
  $$('.checkitem', form).forEach((row) => {
    $$('input[type=radio]', row).forEach((r) => (r.onchange = () => { const bad = r.value === 'mangel' && r.checked; $('.detail', row).hidden = !bad; $('.detail input', row).required = bad; }));
  });
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
      toast(`${t('check_saved')}${r.followups.length ? ' · ' + r.followups.map((f) => f.case_no).join(', ') : ''}`);
      location.hash = '#/cases/' + caseId;
    } catch (err) { toast(err.message, true); }
  };
}
async function viewDepartureCheck() {
  const vs = (await api('GET', '/api/vehicles')).vehicles;
  render(`<h1>${esc(t('departure_check'))}</h1><form id="f"><label for="v">${esc(t('vehicle'))}</label><select id="v" required><option value="">–</option>${vs.map((v) => `<option value="${esc(v.id)}"${v.assigned ? ' selected' : ''}>${esc(v.plate)}</option>`).join('')}</select>
    ${checklistHtml()}<label for="km">${esc(t('km'))}</label><input id="km" inputmode="numeric"><div class="actions"><button class="btn block">${esc(t('submit_inspection'))}</button></div></form>`, 'check');
  const form = $('#f'); bindChecklist(form);
  const key = uid();
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const r = await api('POST', '/api/inspections', { kind: 'abfahrt', vehicle_id: $('#v').value, request_key: key, items: collectChecklist(form), odometer_km: $('#km').value || null });
      toast(t('check_saved'));
      location.hash = r.followups.length ? '#/cases/' + r.followups[0].id : '#/';
    } catch (err) { toast(err.message, true); }
  };
}

// ---------- Fahrzeuge ----------
async function viewVehicles() {
  const vs = (await api('GET', '/api/vehicles')).vehicles;
  render(`<h1>${esc(t('vehicles'))}</h1><input id="q" placeholder="SZ-…" aria-label="Suche" style="margin-bottom:12px">
    <div class="list" id="vl">${vs.map((v) => `<a class="row ${v.availability === 'gesperrt' ? 'p-kritisch' : v.availability === 'werkstatt' ? 'p-mittel' : ''}" href="#/vehicles/${esc(v.id)}" data-s="${esc((v.plate + ' ' + (v.site || '') + ' ' + (v.vin || '')).toLowerCase())}">${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="title">${esc(v.manufacturer || '')} ${esc(v.build_year || '')}</span><span class="chip ${v.availability === 'gesperrt' ? 'gesperrt' : ''}">${esc(t('av_' + v.availability))}</span><span class="sub">${esc(v.site || '')}${v.trailer_plate ? ' · ' + esc(t('trailer')) + ' ' + esc(v.trailer_plate) : ''}${v.next_due ? ' · ' + esc(t('next_due')) + ' ' + fmtD(v.next_due) : ''}${v.last_km ? ' · ' + Number(v.last_km).toLocaleString('de-DE') + ' km' : ''}</span></a>`).join('')}</div>`, 'vehicles');
  $('#q').oninput = () => { const q = $('#q').value.toLowerCase().replace(/\s/g, ''); $$('#vl a').forEach((a) => (a.hidden = q && !a.dataset.s.replace(/\s/g, '').includes(q))); };
}
async function viewVehicle(id) {
  const d = await api('GET', '/api/vehicles/' + encodeURIComponent(id));
  const v = d.vehicle;
  const canMaint = isMgr() || S.me.role === 'workshop';
  let html = `<p><a href="#/vehicles">‹ ${esc(t('back'))}</a></p><div>${plate(v.plate, { big: true, locked: d.cases.some((c) => c.safety_lock && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)) })}</div>
    <h1 style="margin-top:12px">${esc(t('vehicle_file'))}</h1><section class="panel"><dl class="kv"><dt>${esc(t('vin'))}</dt><dd>${esc(v.vin)}</dd><dt>${esc(t('manufacturer'))}</dt><dd>${esc(v.manufacturer || '–')} ${esc(v.model || '')}</dd><dt>${esc(t('year'))}</dt><dd>${esc(v.build_year || '–')}</dd><dt>${esc(t('site'))}</dt><dd>${esc(v.site || '–')}</dd><dt>${esc(t('trailer'))}</dt><dd>${esc(v.trailer_plate || '–')}</dd><dt>${esc(t('km'))}</dt><dd>${d.odometer[0] ? Number(d.odometer[0].km).toLocaleString('de-DE') + ' km · ' + fmtD(d.odometer[0].measured_at) : '–'}</dd></dl></section>`;
  if (d.costs) html += `<section class="panel"><h3>${esc(t('costs'))}</h3><dl class="kv"><dt>Ist</dt><dd>${eur(d.costs.actual_net)}</dd><dt>${esc(t('estimate'))}</dt><dd>${eur(d.costs.estimate_net)}</dd><dt>${esc(t('unvalued'))}</dt><dd>${d.costs.unvalued_items}</dd></dl></section>`;
  html += `<h2>${esc(t('maintenance'))}</h2>${d.maintenance.length ? `<div class="scroll"><table><thead><tr><th>${esc(t('kind'))}</th><th>${esc(t('last_done'))}</th><th>${esc(t('next_due'))}</th><th>${esc(t('evidence'))}</th>${canMaint ? '<th></th>' : ''}</tr></thead><tbody>${d.maintenance.map((m) => { const days = m.next_due_date ? Math.round((Date.parse(m.next_due_date) - Date.now()) / 86400000) : null; return `<tr><td>${esc(m.kind)}</td><td>${fmtD(m.last_done_date)}</td><td>${m.next_due_date ? `<span class="chip ${days < 0 ? 'kritisch' : days < 30 ? 'mittel' : ''}">${fmtD(m.next_due_date)}</span>` : '–'}</td><td class="small">${esc(m.evidence)}</td>${canMaint ? `<td><button class="btn secondary" data-done="${esc(m.id)}">${esc(t('done'))}</button></td>` : ''}</tr>`; }).join('')}</tbody></table></div>` : '<p class="muted">–</p>'}`;
  if (canMaint) html += `<details class="panel"><summary>${esc(t('add_rule'))}</summary><form id="mf"><label>${esc(t('kind'))}</label><select name="kind">${S.meta.maintenance_kinds.map((k) => `<option>${esc(k)}</option>`).join('')}</select><label>${esc(t('last_done'))}</label><input type="date" name="last_done_date"><label>${esc(t('interval_months'))}</label><input name="interval_months" inputmode="numeric"><label>${esc(t('next_due'))}</label><input type="date" name="next_due_date"><label>${esc(t('evidence'))}</label><input name="evidence" required><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
  html += `<h2>${esc(t('tires'))}</h2><div id="tires"><p class="muted">${esc(t('loading'))}</p></div>`;
  html += `<h2>${esc(t('nav_cases'))}</h2>${caseList(d.cases.map((c) => ({ ...c, plate: v.plate })))}`;
  if (d.inspections.length) html += `<h2>${esc(t('inspections'))}</h2><div class="list">${d.inspections.map((i) => `<div class="row"><span class="chip ${i.result === 'ok' ? 'ok' : 'kritisch'}">${i.result === 'ok' ? 'OK' : esc(t('defect'))}</span><span class="title">${esc(i.kind === 'abfahrt' ? t('departure_check') : t('inspection'))}</span><span>${i.odometer_km ? Number(i.odometer_km).toLocaleString('de-DE') + ' km' : ''}</span><span class="sub">${fmtDT(i.created_at)} · ${esc(i.performed_by_name)}</span></div>`).join('')}</div>`;
  if (isMgr()) {
    html += `<h2>${esc(t('drivers'))}</h2>${d.drivers.length ? `<div class="list">${d.drivers.map((r) => `<div class="row"><span>${esc(r.display_name)}</span><span class="small muted">${fmtD(r.valid_from)} – ${r.valid_to ? fmtD(r.valid_to) : ''}</span>${!r.valid_to ? `<button class="btn secondary" data-end="${esc(r.id)}">${esc(t('end'))}</button>` : '<span></span>'}</div>`).join('')}</div>` : ''}
      <form id="df" class="actions"><select name="user_id" id="drvsel" style="max-width:300px"></select><button class="btn secondary">${esc(t('assign_driver'))}</button></form>`;
  }
  html += `<details class="panel"><summary>${esc(t('add_km'))}</summary><form id="kf" class="actions"><input name="km" inputmode="numeric" required style="max-width:200px"><button class="btn secondary">${esc(t('save'))}</button></form></details>`;
  if (canMaint) html += `<section class="panel"><h3>${esc(t('ai'))}</h3><div id="ai"></div><button class="btn secondary" id="aib">${esc(t('ai_run'))}</button></section>`;
  render(html, isMgr() ? 'master' : 'vehicles');

  renderTires(id, $('#tires'));
  const mf = $('#mf'); if (mf) mf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(mf)); try { await api('POST', `/api/vehicles/${encodeURIComponent(id)}/maintenance`, b); viewVehicle(id); } catch (err) { toast(err.message, true); } };
  $$('[data-done]').forEach((b) => (b.onclick = async () => {
    const date = prompt(t('date') + ' (JJJJ-MM-TT)', new Date().toISOString().slice(0, 10)); if (!date) return;
    const ev = prompt(t('evidence')); if (!ev) return;
    try { await api('POST', `/api/maintenance/${b.dataset.done}/complete`, { done_date: date, evidence: ev }); viewVehicle(id); } catch (err) { toast(err.message, true); }
  }));
  const kf = $('#kf'); if (kf) kf.onsubmit = async (e) => { e.preventDefault(); try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/odometer`, { km: kf.km.value }); if (r.warning) toast(r.warning, true); viewVehicle(id); } catch (err) { toast(err.message, true); } };
  const df = $('#df');
  if (df) {
    const us = (await api('GET', '/api/users')).users.filter((u) => u.role === 'driver' && u.active);
    $('#drvsel').innerHTML = us.map((u) => `<option value="${esc(u.id)}">${esc(u.display_name)}</option>`).join('');
    df.onsubmit = async (e) => { e.preventDefault(); try { await api('POST', `/api/vehicles/${encodeURIComponent(id)}/drivers`, { user_id: $('#drvsel').value }); viewVehicle(id); } catch (err) { toast(err.message, true); } };
  }
  $$('[data-end]').forEach((b) => (b.onclick = async () => { await api('DELETE', '/api/assignments/' + b.dataset.end); viewVehicle(id); }));
  const aib = $('#aib'); if (aib) aib.onclick = async () => {
    aib.disabled = true; $('#ai').innerHTML = `<p class="muted">${esc(t('loading'))}</p>`;
    try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/ai`); $('#ai').innerHTML = r.suggestion ? `<p style="white-space:pre-wrap">${esc(r.suggestion)}</p><p class="small muted">${esc(r.disclaimer)}</p>` : `<p class="muted">${esc(r.message || '–')}</p>`; }
    catch (err) { $('#ai').innerHTML = `<p class="muted">${esc(err.message)}</p>`; }
    aib.disabled = false;
  };
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
    ${d.history.length ? `<details class="panel"><summary>${esc(t('history'))} (${d.history.length})</summary><table>${d.history.map((h) => `<tr><td class="small">${fmtDT(h.created_at)}</td><td>${esc(h.position)}</td><td>${esc(t('te_' + h.event_type))}${h.tread_mm !== null ? ' · ' + esc(String(h.tread_mm).replace('.', ',')) + ' mm' : ''}${h.pressure_bar !== null ? ' · ' + esc(String(h.pressure_bar).replace('.', ',')) + ' bar' : ''}${h.size ? ' · ' + esc(h.size) : ''}${h.brand ? ' · ' + esc(h.brand) : ''}${h.note ? '<br><span class="small muted">' + esc(h.note) + '</span>' : ''}</td><td class="small">${esc(h.recorded_by_name)}</td></tr>`).join('')}</table></details>` : ''}`;
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
  render(`<h1>${esc(t('stock'))}</h1>
    <details class="panel"><summary>${esc(t('new_item'))}</summary><form id="nf">
      ${sites.length > 1 ? `<label>${esc(t('workshop'))}</label><select name="site">${sites.map((w) => `<option value="${esc(w.code)}">${esc(w.name)}</option>`).join('')}</select>` : ''}
      <label>${esc(t('part_name'))}</label><input name="name" required><label>${esc(t('part_number'))}</label><input name="part_number">
      <label>${esc(t('unit'))}</label><input name="unit" value="Stk"><label>${esc(t('initial_qty'))}</label><input name="initial_qty" inputmode="decimal">
      <label>${esc(t('min_qty'))}</label><input name="min_qty" inputmode="decimal"><label>${esc(t('storage'))}</label><input name="location">
      <label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    <input id="q" placeholder="${esc(t('part_name'))} / ${esc(t('part_number'))}" style="margin-bottom:12px">
    <div class="list" id="sl">${items.map((i) => `<a class="row ${i.below_min ? 'p-mittel' : ''}" href="#/stock/${esc(i.id)}" data-s="${esc((i.name + ' ' + (i.part_number || '')).toLowerCase())}"><span class="chip">${esc(i.site)}</span><span class="title">${esc(i.name)}</span><b>${i.on_hand} ${esc(i.unit)}</b><span class="sub">${[i.part_number && esc(i.part_number), i.location && esc(i.location), i.below_min && esc(t('below_min')) + ' (' + i.min_qty + ')', i.unit_price_net !== null && eur(i.unit_price_net)].filter(Boolean).join(' · ')}</span></a>`).join('') || `<p class="muted">–</p>`}</div>`, 'more');
  $('#q').oninput = () => { const q = $('#q').value.toLowerCase(); $$('#sl a').forEach((a) => (a.hidden = q && !a.dataset.s.includes(q))); };
  $('#nf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k of Object.keys(b)) { if (b[k] === '') delete b[k]; else if (['initial_qty', 'min_qty', 'unit_price_net'].includes(k)) b[k] = b[k].replace(',', '.'); } try { await api('POST', '/api/stock', b); viewStock(); } catch (err) { toast(err.message, true); } };
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
  const today = new Date().toISOString().slice(0, 10);
  let html = `<h1>${esc(mgr ? t('fines') : t('my_fines'))}</h1>`;
  if (mgr) html += `<details class="panel"><summary>${esc(t('new_fine'))}</summary><form id="nf">
    <label>${esc(t('kind'))}</label><select name="kind">${S.meta.fine_kinds.map((k) => `<option value="${k}">${esc(t('fk_' + k))}</option>`).join('')}</select>
    <label>${esc(t('authority'))}</label><input name="authority" required><label>${esc(t('reference'))}</label><input name="reference">
    <label>${esc(t('offense'))}</label><select name="offense_type">${S.meta.fine_offenses.map((k) => `<option value="${k}">${esc(t('of_' + k))}</option>`).join('')}</select>
    <label>${esc(t('offense_at'))}</label><input type="datetime-local" name="offense_at" required><label>${esc(t('offense_place'))}</label><input name="location">
    <label>${esc(t('plate_letter'))}</label><input name="plate_in_letter" required placeholder="SZ-YC 5513"><label>${esc(t('amount'))}</label><input name="amount_eur" inputmode="decimal">
    <label>${esc(t('response_due'))}</label><input type="date" name="response_due"><label>${esc(t('note'))}</label><textarea name="note"></textarea>
    <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
  html += `<div class="list">${list.map((f) => { const over = f.response_due && f.response_due < today && ['eingegangen', 'fahrer_ermittelt', 'fahrer_informiert'].includes(f.status); return `<a class="row ${over ? 'p-kritisch' : ''}" href="#/fines/${esc(f.id)}">${plate(f.plate || f.plate_in_letter)}<span class="title">${esc(t('fk_' + f.kind))} · ${esc(t('of_' + f.offense_type))}</span><span class="chip ${over ? 'kritisch' : ['bezahlt', 'eingestellt', 'erledigt', 'beantwortet'].includes(f.status) ? 'ok' : ''}">${esc(t('fs_' + f.status))}</span><span class="sub">${esc(f.fine_no)} · ${fmtDT(f.offense_at)}${f.authority ? ' · ' + esc(f.authority) : ''}${f.response_due ? ' · ' + esc(t('response_due')) + ' ' + fmtD(f.response_due) : ''}${f.driver_name ? ' · ' + esc(f.driver_name) : ''}</span></a>`; }).join('') || `<p class="muted">–</p>`}</div>`;
  render(html, 'more');
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
      <dt>${esc(t('response_due'))}</dt><dd>${f.response_due ? fmtD(f.response_due) : '–'}</dd><dt>${esc(t('role_driver'))}</dt><dd>${esc(d.driver_name || '–')}${f.driver_basis ? ' · ' + esc(t('fb_' + f.driver_basis)) : ''}${f.driver_evidence ? `<div class="small muted">${esc(f.driver_evidence)}</div>` : ''}</dd></dl>
      ${f.note ? `<p style="white-space:pre-wrap;margin-top:8px">${esc(f.note)}</p>` : ''}</section>`;
  html += `<h2>${esc(t('files'))}</h2><div class="thumbs">${d.files.map((x) => `<a href="/api/files/${esc(x.id)}" target="_blank" rel="noopener">${x.content_type.startsWith('image/') ? `<img src="/api/files/${esc(x.id)}" alt="">` : 'PDF<br>' + esc(x.filename.slice(0, 14))}</a>`).join('')}</div>`;
  if (A.includes('upload')) html += `<label class="btn secondary" style="margin-top:8px;display:inline-flex">${esc(t('upload'))}<input id="ff" type="file" accept="application/pdf,image/*" hidden></label>`;
  if (A.includes('confirm_driver')) {
    html += `<h2>${esc(t('candidates'))}</h2>${d.candidates.length ? `<div class="list">${d.candidates.map((c, i) => `<label class="row"><input type="radio" name="cand" value="${i}"><span class="title">${esc(c.display_name)}</span><span class="chip">${esc(t('fb_' + c.basis))}</span><span class="sub">${esc(c.evidence)}</span></label>`).join('')}</div>` : `<p class="muted">${esc(t('no_candidates'))}</p>`}
      <form id="cf" class="panel"><h3>${esc(t('confirm_driver'))}</h3><label>${esc(t('role_driver'))}</label><select name="driver_id" id="drv"><option value="">–</option></select>
      <label>${esc(t('driver_without_account'))}</label><input name="driver_name_note"><label>${esc(t('basis'))}</label><select name="basis">${['zuordnung', 'tourenplan', 'telematik', 'fahrerangabe', 'manuell'].map((b) => `<option value="${b}">${esc(t('fb_' + b))}</option>`).join('')}</select>
      <label>${esc(t('evidence'))}</label><input name="evidence" required><div class="actions"><button class="btn">${esc(t('confirm_driver'))}</button></div></form>`;
  }
  const acts = [];
  if (A.includes('inform_driver')) acts.push(`<button class="btn" id="inf">${esc(t('inform_driver'))}</button>`);
  if (A.includes('driver_ack')) acts.push(`<button class="btn" id="ack">${esc(t('ack_fine'))}</button>`);
  if (acts.length) html += `<div class="actions">${acts.join('')}</div>`;
  if (A.includes('set_status')) html += `<details class="panel"><summary>${esc(t('set_status'))}</summary><form id="sf"><select name="status">${['beantwortet', 'bezahlt', 'eingestellt', 'erledigt', 'eingegangen'].map((x) => `<option value="${x}">${esc(t('fs_' + x))}</option>`).join('')}</select><label>${esc(t('note'))}</label><input name="note" required><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>`;
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
  const now = new Date(); const ym = (d) => d.toISOString().slice(0, 7);
  const to = S.costTo || ym(now); const from = S.costFrom || ym(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1)));
  let rep;
  try { rep = await api('GET', `/api/reports/costs?from=${from}&to=${to}`); } catch (err) { render(`<h1>${esc(t('costs_report'))}</h1><div class="panel alert">${esc(err.message)}</div>`, 'more'); return; }
  const byV = new Map();
  for (const r of rep.rows) { const v = byV.get(r.vehicle_id) || { plate: r.plate, site: r.site, actual: 0, estimate: 0, unvalued: 0, hours: 0, months: [] }; v.actual += r.actual_net; v.estimate += r.estimate_net; v.unvalued += r.unvalued_items; v.hours += r.hours; v.months.push(r); byV.set(r.vehicle_id, v); }
  const vs = [...byV.entries()].sort((a, b) => b[1].actual - a[1].actual);
  let html = `<h1>${esc(t('costs_report'))}</h1><form id="cr" class="panel" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
    <div><label>${esc(t('from'))}</label><input type="month" name="from" value="${esc(from)}" required></div><div><label>${esc(t('to'))}</label><input type="month" name="to" value="${esc(to)}" required></div>
    <div class="actions" style="margin:0"><button class="btn secondary">${esc(t('show'))}</button><button type="button" class="btn" id="csv">${esc(t('export_csv'))}</button></div></form>
    <section class="panel"><dl class="kv"><dt>${esc(t('cost_actual'))}</dt><dd><b>${eur(rep.totals.actual_net)}</b></dd><dt>${esc(t('cost_estimate'))}</dt><dd>${eur(rep.totals.estimate_net)}</dd>
    <dt>${esc(t('hours'))}</dt><dd>${esc(String(rep.totals.hours).replace('.', ','))}</dd><dt>${esc(t('unvalued_positions'))}</dt><dd>${rep.totals.unvalued_items ? `<span class="chip kritisch">${rep.totals.unvalued_items}</span>` : '0'}</dd></dl>
    <p class="small muted" style="margin-top:8px">${esc(t('cost_rules'))}${rep.hourly_rate_net === null ? ' ' + esc(t('no_rate')) : ''}</p></section>`;
  html += `<div class="list">${vs.map(([id, v]) => `<details class="row" style="display:block"><summary style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;cursor:pointer">${plate(v.plate || id)}<span class="title">${eur(Math.round(v.actual * 100) / 100)}</span>${v.estimate ? `<span class="chip">${esc(t('estimate'))}: ${eur(Math.round(v.estimate * 100) / 100)}</span>` : ''}${v.unvalued ? `<span class="chip kritisch">${v.unvalued} ${esc(t('unvalued_short'))}</span>` : ''}</summary>
    <dl class="kv" style="margin-top:8px">${v.months.map((m) => `<dt>${esc(m.month)}</dt><dd>${eur(m.actual_net)}${m.estimate_net ? ' · ' + esc(t('estimate')) + ' ' + eur(m.estimate_net) : ''}${m.unvalued_items ? ' · ' + m.unvalued_items + ' ' + esc(t('unvalued_short')) : ''} · ${esc(String(m.hours).replace('.', ','))} h</dd>`).join('')}</dl>
    <p><a href="#/vehicles/${encodeURIComponent(id)}">${esc(t('vehicle'))} ›</a></p></details>`).join('') || `<p class="muted">${esc(t('no_costs'))}</p>`}</div>`;
  render(html, 'more');
  const cr = $('#cr');
  cr.onsubmit = (e) => { e.preventDefault(); S.costFrom = cr.from.value; S.costTo = cr.to.value; viewCosts(); };
  $('#csv').onclick = async () => { try { const blob = await api('GET', `/api/reports/costs?from=${cr.from.value}&to=${cr.to.value}&format=csv`); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fuhrpark-kosten_${cr.from.value}_${cr.to.value}.csv`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } catch (err) { toast(err.message, true); } };
}

// ---------- Hinweise & Push ----------
async function viewInbox() {
  const n = await api('GET', '/api/notifications');
  render(`<h1>${esc(t('notifications'))}</h1><section class="panel" id="push"></section>
    ${n.notifications.length ? `<div class="actions"><button class="btn secondary" id="ra">${esc(t('mark_read'))}</button></div>` : ''}
    <div class="list">${n.notifications.map((x) => `<div class="row ${x.urgent ? 'p-kritisch' : ''}" style="${x.opened_at || x.acknowledged_at ? 'opacity:.7' : ''}"><span class="chip ${x.urgent ? 'kritisch' : ''}">${fmtDT(x.created_at)}</span><a class="title" href="${x.case_id ? '#/cases/' + esc(x.case_id) : '#/master'}" data-open="${esc(x.id)}">${esc(x.title)}</a>${x.acknowledged_at ? '<span class="chip ok">✓</span>' : `<button class="btn secondary" data-ack="${esc(x.id)}">${esc(t('ack'))}</button>`}<span class="sub">${esc(x.body)} · Push: ${esc(x.push_status)}</span></div>`).join('') || `<p class="muted">${esc(t('no_notifications'))}</p>`}</div>`, '');
  pushPanel($('#push'));
  $$('[data-ack]').forEach((b) => (b.onclick = async () => { await api('POST', `/api/notifications/${b.dataset.ack}/ack`); await refreshUnread(); viewInbox(); }));
  $$('[data-open]').forEach((a) => a.addEventListener('click', () => api('POST', `/api/notifications/${a.dataset.open}/opened`).catch(() => {})));
  const ra = $('#ra'); if (ra) ra.onclick = async () => { await api('POST', '/api/notifications/read-all'); S.unread = 0; viewInbox(); };
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
const deviceLabel = () => (/Android/.test(navigator.userAgent) ? 'Android' : /iPhone/.test(navigator.userAgent) ? 'iPhone' : /iPad/.test(navigator.userAgent) ? 'iPad' : /Windows/.test(navigator.userAgent) ? 'Windows-PC' : /Mac/.test(navigator.userAgent) ? 'Mac' : 'Gerät');

// ---------- Management ----------
async function viewMaster() {
  const p = await api('GET', '/api/master');
  const sev = { kritisch: 'kritisch', handeln: 'mittel', hinweis: '', info: '' };
  let html = `<h1>${esc(t('master_title'))}</h1>
    <div class="panel ${p.all_clear ? 'good' : 'alert'}"><b>${esc(p.all_clear ? t('all_clear') : t('not_clear'))}</b>${p.decisions_open ? ` · ${p.decisions_open} ${esc(t('decisions'))}` : ''}<div class="small muted">${esc(t('last_run'))}: ${p.last_agent_run ? fmtDT(p.last_agent_run.finished_at || p.last_agent_run.started_at) + (p.last_agent_run.error ? ' · ' + esc(p.last_agent_run.error) : '') : '–'}</div></div>
    <div class="stats"><div><b>${p.vehicles_total}</b>${esc(t('total'))}</div><div><b style="color:var(--stop)">${p.vehicles_locked}</b>${esc(t('locked_vehicles'))}</div><div><b>${p.vehicles_in_workshop}</b>${esc(t('in_workshop'))}</div></div>
    <div class="actions"><button class="btn secondary" id="ra">${esc(t('run_agent'))}</button><a class="btn secondary" href="#/vehicles">${esc(t('vehicles'))}</a></div>
    <h2>${esc(t('decisions'))}</h2><div class="list">${p.inbox.filter((m) => ['offen', 'gesehen'].includes(m.decision_status)).map((m) => `<div class="row ${m.severity === 'kritisch' ? 'p-kritisch' : 'p-mittel'}"><span class="chip ${sev[m.severity]}">${esc(m.severity)}</span><span class="title" style="white-space:normal">${esc(m.payload.message)}</span><span>${m.case_id ? `<a href="#/cases/${esc(m.case_id)}">${esc(t('details'))}</a>` : ''}</span><span class="sub">${esc(m.payload.next_action)} · ${fmtDT(m.received_at)}${m.finding_status === 'erledigt' ? ' · ✓ ' + esc(t('resolved')) : ''} · <a href="#" data-dec="${esc(m.event_id)}" data-st="gesehen">${esc(t('seen'))}</a> · <a href="#" data-dec="${esc(m.event_id)}" data-st="erledigt">${esc(t('resolved'))}</a></span></div>`).join('') || `<p class="muted">–</p>`}</div>
    <h2>${esc(t('findings'))}</h2><div class="list">${p.findings.map((f) => `<div class="row ${f.severity === 'kritisch' ? 'p-kritisch' : f.severity === 'handeln' ? 'p-mittel' : ''}"><span class="chip ${sev[f.severity]}">${esc(f.severity)}</span><span class="title" style="white-space:normal">${esc(f.message)}</span><span>${f.case_id ? `<a href="#/cases/${esc(f.case_id)}">${esc(t('details'))}</a>` : ''}</span><span class="sub">${esc(f.next_action)} · ${esc(t('role_' + f.owner_role))} · ${fmtDT(f.last_seen)}</span></div>`).join('') || `<p class="muted">–</p>`}</div>
    <h2>${esc(t('nav_cases'))}</h2><div class="scroll"><table><thead><tr><th></th><th>Nr.</th><th>${esc(t('urgency'))}</th><th>Status</th><th>${esc(t('workshop'))}</th><th>${esc(t('received'))}</th><th>${esc(t('workshop_ack'))}</th><th>${esc(t('open_items'))}</th></tr></thead><tbody>
    ${p.cases.map((c) => `<tr><td>${plate(c.plate, { locked: c.safety_lock })}</td><td><a href="#/cases/${esc(c.id)}">${esc(c.case_no)}</a><div class="small muted">${esc(c.description.slice(0, 60))}</div></td><td><span class="chip ${esc(c.priority)}">${esc(t('prio_' + c.priority))}</span></td><td>${esc(t('st_' + c.status))}</td><td>${esc(wsName(c.workshop_site))}</td><td>${c.fleet_received_at ? fmtDT(c.fleet_received_at) : '–'}</td><td>${c.workshop_ack_at ? fmtDT(c.workshop_ack_at) : '–'}</td><td>${c.open_items || ''}</td></tr>`).join('')}</tbody></table></div>`;
  render(html, 'master');
  $('#ra').onclick = async () => { try { const r = await api('POST', '/api/agent/run'); toast(`${r.findings_open} ${t('findings')}`); viewMaster(); } catch (err) { toast(err.message, true); } };
  $$('[data-dec]').forEach((a) => (a.onclick = async (e) => { e.preventDefault(); await api('POST', `/api/master/${a.dataset.dec}/decision`, { decision_status: a.dataset.st }); viewMaster(); }));
}

// ---------- Mehr / Benutzer / Einstellungen ----------
function viewMore() {
  render(`<h1>${esc(t('nav_more'))}</h1><div class="list">
    ${S.me.role !== 'driver' ? `<a class="row" href="#/vehicles"><span>${ICON.truck}</span><span class="title">${esc(t('vehicles'))}</span><span></span></a>` : ''}
    <a class="row" href="#/check"><span>✓</span><span class="title">${esc(t('departure_check'))}</span><span></span></a>
    <a class="row" href="#/inbox"><span>${ICON.bell}</span><span class="title">${esc(t('notifications'))}</span><span></span></a>
    ${['owner', 'fleet', 'viewer'].includes(S.me.role) ? `<a class="row" href="#/fines"><span>§</span><span class="title">${esc(t('fines'))}</span><span></span></a>` : S.me.role === 'driver' ? `<a class="row" href="#/fines"><span>§</span><span class="title">${esc(t('my_fines'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'viewer'].includes(S.me.role) ? `<a class="row" href="#/costs"><span>€</span><span class="title">${esc(t('costs_report'))}</span><span></span></a>` : ''}
    ${['owner', 'fleet', 'workshop'].includes(S.me.role) ? `<a class="row" href="#/stock"><span>▦</span><span class="title">${esc(t('stock'))}</span><span></span></a>` : ''}
    ${isMgr() ? `<a class="row" href="#/users"><span>👤</span><span class="title">${esc(t('users'))}</span><span></span></a>` : ''}
    ${S.me.role === 'owner' ? `<a class="row" href="#/settings"><span>⚙</span><span class="title">${esc(t('settings'))}</span><span></span></a>` : ''}
  </div>
  <h2>${esc(t('nav_profile'))}</h2><section class="panel"><p><b>${esc(S.me.display_name)}</b> · ${esc(S.me.username)} · ${esc(t('role_' + S.me.role))}${S.me.environment === 'test' ? ' · <span class="chip test">TEST</span>' : ''}</p>${langSelect()}
  <details><summary>${esc(t('change_password'))}</summary><form id="pw"><label>${esc(t('old_password'))}</label><input type="password" name="old_password" required autocomplete="current-password"><label>${esc(t('new_password'))}<span class="hint">${esc(t('pw_rule'))}</span></label><input type="password" name="new_password" required minlength="10" autocomplete="new-password"><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>
  <div class="actions"><button class="btn secondary" id="lo">${esc(t('logout'))}</button></div></section>`, 'more');
  bindLang(true);
  $('#lo').onclick = async () => { await api('POST', '/api/logout'); S.me = null; location.hash = '#/login'; };
  $('#pw').onsubmit = async (e) => { e.preventDefault(); try { await api('POST', '/api/me/password', Object.fromEntries(new FormData(e.target))); toast('✓'); } catch (err) { toast(err.message, true); } };
}

async function viewUsers() {
  const us = (await api('GET', '/api/users')).users;
  const roles = S.me.role === 'owner' ? ['owner', 'fleet', 'workshop', 'dispatch', 'driver', 'viewer'] : ['driver', 'workshop', 'viewer'];
  render(`<h1>${esc(t('users'))}</h1><div id="inv"></div>
    <details class="panel"><summary>${esc(t('new_user'))}</summary><form id="nf">
      <label>${esc(t('display_name'))}</label><input name="display_name" required><label>${esc(t('username'))}</label><input name="username" required pattern="[a-z0-9._-]{3,64}" autocapitalize="none">
      <label>${esc(t('role'))}</label><select name="role" id="rs">${roles.map((r) => `<option value="${r}">${esc(t('role_' + r))}</option>`).join('')}</select>
      <div id="wsrow" hidden><label>${esc(t('workshop'))}</label><select name="workshop_site">${S.meta.workshops.map((w) => `<option value="${esc(w.code)}">${esc(w.name)}</option>`).join('')}</select></div>
      ${S.me.role === 'owner' ? `<label>${esc(t('environment'))}</label><select name="environment"><option value="test">${esc(t('env_testname'))}</option><option value="production">${esc(t('env_prod'))}</option></select>` : ''}
      <div class="actions"><button class="btn">${esc(t('new_user'))}</button></div></form></details>
    <div class="scroll"><table><thead><tr><th>${esc(t('display_name'))}</th><th>${esc(t('role'))}</th><th>${esc(t('environment'))}</th><th></th></tr></thead><tbody>
    ${us.map((u) => `<tr><td>${esc(u.display_name)}<div class="small muted">${esc(u.username)}${u.has_password ? '' : ' · Einladung offen'}</div></td><td>${esc(t('role_' + u.role))}${u.workshop_site ? ' · ' + esc(wsName(u.workshop_site)) : ''}</td><td>${u.environment === 'test' ? '<span class="chip test">TEST</span>' : esc(t('env_prod'))}</td><td>${u.id !== S.me.id ? `<button class="btn secondary" data-inv="${esc(u.id)}">${esc(t('new_invite'))}</button> <button class="btn secondary" data-act="${esc(u.id)}" data-on="${u.active ? 0 : 1}">${esc(u.active ? t('deactivate') : t('activate'))}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`, 'more');
  const showInvite = (token) => { const link = `${location.origin}/#/invite/${token}`; $('#inv').innerHTML = `<div class="panel good"><p>${esc(t('invite_link'))}</p><input readonly value="${esc(link)}" id="il"><div class="actions"><button class="btn" id="cp">${esc(t('copy'))}</button></div></div>`; $('#cp').onclick = async () => { try { await navigator.clipboard.writeText(link); toast(t('copied')); } catch { $('#il').select(); } }; window.scrollTo(0, 0); };
  $('#rs').onchange = () => ($('#wsrow').hidden = $('#rs').value !== 'workshop');
  $('#nf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); if (b.role !== 'workshop') delete b.workshop_site; b.username = b.username.toLowerCase(); try { const r = await api('POST', '/api/users', b); await viewUsers(); showInvite(r.invite_token); } catch (err) { toast(err.message, true); } };
  $$('[data-inv]').forEach((b) => (b.onclick = async () => { try { const r = await api('POST', `/api/users/${b.dataset.inv}/invite`); showInvite(r.invite_token); } catch (err) { toast(err.message, true); } }));
  $$('[data-act]').forEach((b) => (b.onclick = async () => { try { await api('PATCH', `/api/users/${b.dataset.act}`, { active: b.dataset.on === '1' }); viewUsers(); } catch (err) { toast(err.message, true); } }));
}

async function viewSettings() {
  const s = await api('GET', '/api/settings');
  const v = s.values;
  const field = (k, label) => `<label for="${k}">${esc(label)}</label><input id="${k}" name="${k}" inputmode="decimal" value="${esc(v[k] ?? '')}">`;
  const slaRows = ['test', 'production'].map((e) => `<h3>${esc(e === 'test' ? t('env_testname') : t('env_prod'))}</h3><div class="scroll"><table><tr><th></th>${['niedrig', 'mittel', 'kritisch'].map((p) => `<th>${esc(t('prio_' + p))}</th>`).join('')}</tr>${['triage', 'ack'].map((k) => `<tr><td>${esc(k === 'triage' ? t('act_receive') : t('act_acknowledge'))}</td>${['niedrig', 'mittel', 'kritisch'].map((p) => `<td><input name="sla_${e}_${k}_${p}_min" inputmode="numeric" value="${esc(v[`sla_${e}_${k}_${p}_min`] ?? '')}"></td>`).join('')}</tr>`).join('')}</table></div>`).join('');
  render(`<h1>${esc(t('settings'))}</h1><form id="sf" class="panel">${field('workshop_hourly_rate_net', t('hourly_rate'))}${field('maintenance_warn_days', t('warn_days'))}${field('tire_warn_tread_mm', t('tire_warn'))}${field('fine_warn_days', t('response_due') + ' – ' + t('warn_days'))}<h2>${esc(t('sla'))}</h2>${slaRows}<div class="actions"><button class="btn">${esc(t('save'))}</button></div></form>
    <section class="panel"><h2 style="margin-top:0">${esc(t('import_csv'))}</h2><p class="small muted">Kennzeichen;Standort;Status;Hersteller;Baujahr;FIN;Anhänger</p><input type="file" id="csv" accept=".csv,text/csv"><div id="csvr"></div></section>
    <section class="panel"><h2 style="margin-top:0">${esc(t('import_tires'))}</h2><p class="small muted">Quelle;Kennzeichen;FIN;Reifen Lenkachse;Reifen Liftachse;Reifen Antriebsachse;Reifen Anhänger</p><input type="file" id="tcsv" accept=".csv,text/csv"><div id="tcsvr"></div></section>`, 'more');
  $('#tcsv').onchange = async () => { const f = $('#tcsv').files[0]; if (!f) return; try { const r = await api('POST', '/api/tires/import', await f.text(), { headers: { 'content-type': 'text/csv' } }); $('#tcsvr').innerHTML = `<p>✓ ${r.imported} · ${r.skipped_no_vehicle.length} ohne passendes Fahrzeug · ${r.kept_verified} geprüft behalten</p>`; } catch (err) { toast(err.message, true); } };
  $('#sf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k in b) b[k] = b[k] === '' ? null : b[k].replace(',', '.'); try { await api('PUT', '/api/settings', b); toast('✓'); } catch (err) { toast(err.message, true); } };
  $('#csv').onchange = async () => { const f = $('#csv').files[0]; if (!f) return; try { const r = await api('POST', '/api/vehicles/import', await f.text(), { headers: { 'content-type': 'text/csv' } }); $('#csvr').innerHTML = `<p>✓ ${r.imported}${r.skipped.length ? ` · ${r.skipped.length} übersprungen: ${esc(r.skipped.map((s) => s.plate + ' (' + s.reason + ')').join(', '))}` : ''}</p>`; } catch (err) { toast(err.message, true); } };
}

// ---------- Start ----------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'navigate') location.hash = e.data.hash; if (e.data && e.data.type === 'push') refreshUnread().then(() => { if (S.me) { const b = document.querySelector('.topbar .badge'); if (!b) route(); } }); });
}
document.documentElement.lang = S.lang;
route();
