// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { $, $$, CASE_SORTS, FORM_DRAFT_MS, ICON, S, SEND_TIMEOUT_MS, announceHits, api, bDate, bindLang, caseFilterQ, caseList, clearOfflineData, ctChip, download, envFn, esc, flushOutbox, fmtD, fmtDT, fmtHM, fmtNum, helpLoaded, helpMatches, helpNorm, helpSections, isCasesHash, isMgr, langSelect, loadHelp, loadNotifyPrefs, loadSessions, loadTotp, markSession, mayCheck, nDays, noTr, noneP, notifHref, nowMs, otherEnvOutbox, outboxGet, ownerT, paintBadge, plate, printHead, pushOffForLogout, pushPanel, refreshUnread, render, resetUserState, searchKey, siteKeyUi, siteSelect, sortPref, stockHit, t, tn, toast, unitL, vinOf, vsDef, wsAll, wsLabel, wsName } from './app-main.js';


const plateNoCountry = (p) => { const x = String(p || '').trim(); const y = x.replace(/^\(?(?:D|DE|DEU)\)?[\s\-–:/.]+(?=\S)/i, '').replace(/(\S)[\s\-–/,]+\(?(?:D|DE|DEU)\)?$/i, '$1').replace(/(\S)\((?:D|DE|DEU)\)$/i, '$1').trim(); return y !== x && searchKey(y).length >= 4 ? y : null; };
const CF_LABEL = { unreceived: 'todo_receive', received_open: 'todo_untriaged', limited: 'dispo_limited_new', open_items: 'filter_open_items', repeat: 'filter_repeat', warranty: 'filter_warranty', stale: 'filter_stale', followup: 'filter_followup', critical: 'prio_kritisch', locked: 'locked_cases', cost_approval: 'todo_cost_approval', q_open: 'q_open', q_answered: 'q_answered', mine: 'filter_mine', paused: 'todo_paused', ready_overdue: 'todo_ready_overdue' };
async function viewCases() {
  const hf = new URLSearchParams(location.hash.split('?')[1] || '').get('f');
  if (hf) try { sessionStorage.setItem('cfp_cf', hf); } catch {}

  if (hf) S.caseQ = '';
  let f = hf || sessionStorage.getItem('cfp_cf') || 'open';
  if (!['open', 'closed', 'all', 'repeat', 'warranty', 'stale', 'followup', 'critical', 'locked', 'cost_approval', 'unreceived', 'received_open', 'limited', 'open_items', 'q_open', 'q_answered', 'mine', 'paused', 'ready_overdue'].includes(f) || (['repeat', 'warranty', 'stale', 'critical', 'locked', 'cost_approval', 'unreceived', 'received_open', 'limited', 'open_items', 'mine', 'paused', 'ready_overdue'].includes(f) && S.me.role === 'driver') || (f === 'followup' && ['driver', 'workshop'].includes(S.me.role))) f = 'open';
  const q = S.caseQ || '';
  const vq = () => (vsDef('caseVsite') && S.me.role !== 'driver' ? '&vsite=' + encodeURIComponent(vsDef('caseVsite')) : '') + (S.caseWs && wsFilterOk() ? '&ws=' + encodeURIComponent(S.caseWs) : '');
  const lq = () => (S.caseLimit ? '&limit=' + S.caseLimit : '') + sq();
  if (!S.caseSort) S.caseSort = sortPref('cases', CASE_SORTS, 'priority');

  const sq = () => (S.caseSort && S.caseSort !== 'priority' && f !== 'followup' && f !== 'cost_approval' ? '&sort=' + S.caseSort : '');

  const trunc = (r) => (r.truncated ? `<p class="small muted">${esc(t('list_truncated').replace('{n}', r.limit))}${r.limit < 500 ? ` <button type="button" class="btn secondary" id="cmore">${esc(t('cases_upto500'))}</button>` : ''}</p>` : '');
  const bindMore = () => { const b = $('#cmore'); if (b) b.onclick = () => { S.caseLimit = 500; viewCases(); }; };
  const res = await api('GET', `/api/cases?${caseFilterQ(f)}${q.length >= 2 ? '&q=' + encodeURIComponent(q) : ''}${vq()}${lq()}`);

  const fLabel = t(f === 'unreceived' && !isMgr() ? 'dispo_unreceived' : CF_LABEL[f] || f);
  const cPrint = (l, qq) => printHead([`${t('print_filter')}: ${fLabel}`, qq && qq.length >= 2 ? `${t('print_search')}: „${qq}“` : '',
    res.site ? `${t('kpi_vsite')}: ${res.site === 'ohne' ? t('cs_nosite') : res.site}` : '', S.caseWs && wsFilterOk() ? `${t('workshop')}: ${wsName(S.caseWs)}` : '', f !== 'followup' && S.me.role !== 'driver' ? `${t('sort_by')}: ${t(f === 'cost_approval' ? 'ca_sort_wait' : 'csort_' + (S.caseSort || 'priority'))}` : '', t('print_count').replace('{n}', l.length)]);

  const cExtra = f === 'cost_approval' ? (c) => (c.workshop_site ? `<span data-caws>${esc(wsName(c.workshop_site))}</span> · ` : '') : undefined;
  const list = f === 'followup' ? res.cases.slice().sort((x, y) => (x.followup_on < y.followup_on ? -1 : x.followup_on > y.followup_on ? 1 : 0)) : res.cases;
  const vsel = S.me.role !== 'driver' && ((res.site_options || []).length > 1 || res.site) ? `<div class="noprint" style="margin-bottom:12px">${siteSelect('cvsite', '', res.site_options, res.site, t('kpi_vsite'), t('filter_all'))}</div>` : '';

  const wsel = wsFilterOk() && wsAll().length > 1 ? `<div class="noprint" style="margin-bottom:12px"><label for="cws">${esc(t('workshop'))}</label><select id="cws"><option value="">${esc(t('filter_all'))}</option>${wsAll().map((w) => `<option value="${esc(w.code)}"${S.caseWs === w.code ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}</select></div>` : '';


  const asof = () => `${esc(t('home_asof').replace('{t}', fmtHM(new Date(nowMs()).toISOString())))} · <a href="#/cases" id="casesreload" title="${esc(t('cases_asof_hint'))}">${esc(t('update_now'))}</a>`;
  render(`<h1>${esc(t('nav_cases'))}</h1>${S.me.role !== 'driver' ? `<p class="small muted noprint" id="casesasof" style="margin:-6px 0 8px">${asof()}</p>` : ''}
    <input id="cq" class="noprint" type="search" value="${esc(q)}" placeholder="${esc(t(isMgr() ? 'case_search_mgr' : S.me.role === 'workshop' ? 'case_search_ws' : 'case_search'))}" aria-label="${esc(t(isMgr() ? 'case_search_mgr' : S.me.role === 'workshop' ? 'case_search_ws' : 'case_search'))}" style="margin-bottom:12px" autocomplete="off">${vsel}${wsel}
    <div class="seg-tabs noprint">${['open', 'closed', 'all', ...(S.me.role === 'driver' ? [] : ['repeat', 'warranty', ...(res.stale_days || f === 'stale' ? ['stale'] : []), ...(S.me.role === 'workshop' ? ['mine'] : ['followup']), ...(['critical', 'locked', 'cost_approval', 'unreceived', 'received_open', 'limited', 'open_items', 'paused', 'ready_overdue'].includes(f) || (f === 'mine' && S.me.role !== 'workshop') ? [f] : [])])].map((k) => `<a href="#/cases" data-f="${k}" class="${k === f ? 'on' : ''}"${k === f ? ' aria-current="true"' : ''}>${esc(t(k === 'unreceived' && !isMgr() ? 'dispo_unreceived' : CF_LABEL[k] || k))}</a>`).join('')}</div>${f === 'stale' ? `<p class="small muted">${esc(res.stale_days ? t('filter_stale_hint').replace('{n}', nDays(res.stale_days)) : ownerT('filter_stale_off'))}</p>` : ''}
    ${f === 'cost_approval' ? `<p class="small muted noprint" id="casort">${esc(t('sort_by'))}: ${esc(t('ca_sort_wait'))}</p>` : ''}${f !== 'followup' && f !== 'cost_approval' ? `<select id="csort" class="noprint" aria-label="${esc(t('sort_by'))}" style="max-width:420px;margin-bottom:12px">${CASE_SORTS.map((k) => `<option value="${k}"${(S.caseSort || 'priority') === k ? ' selected' : ''}>${esc(t('sort_by'))}: ${esc(t('csort_' + k))}</option>`).join('')}</select>` : ''}
    <div id="cl">${cPrint(list, q)}${caseList(list, null, cExtra)}${trunc(res)}</div>
    <div class="actions">${S.me.role !== 'driver' ? `<button type="button" class="btn secondary" id="ccsv">${esc(t('export_csv'))}</button>${f === 'followup' ? `<button type="button" class="btn secondary" id="cics">${esc(t('followup_ics'))}</button>` : ''}` : ''}<button type="button" class="btn secondary" id="cprl">${esc(t('print'))}</button></div>`, 'cases');
  $('#cprl').onclick = () => window.print();
  const ci = $('#cics'); if (ci) ci.onclick = async () => { try { download(await api('GET', `/api/cases?format=ics${vq()}`), `fuhrpark-wiedervorlagen_${envFn()}_${bDate()}.ics`); } catch (err) { toast(err.message, true); } };
  const cc = $('#ccsv'); if (cc) cc.onclick = async () => { try { const blob = await api('GET', `/api/cases?format=csv&${caseFilterQ(f)}${(S.caseQ || '').length >= 2 ? '&q=' + encodeURIComponent(S.caseQ) : ''}${vq()}${sq()}`); download(blob, `fuhrpark-vorgaenge_${envFn()}_${bDate()}.csv`); if (blob.cfpTruncated) toast(t('csv_truncated').replace('{n}', blob.cfpTruncated), true); } catch (err) { toast(err.message, true); } };

  $$('.seg-tabs a').forEach((a) => (a.onclick = (e) => { e.preventDefault(); sessionStorage.setItem('cfp_cf', a.dataset.f); S.caseLimit = null; if (location.hash.includes('?')) history.replaceState(history.state, '', '#/cases'); viewCases(); }));
  const cvs = $('#cvsite'); if (cvs) cvs.onchange = () => { S.caseVsite = cvs.value; S.caseLimit = null; viewCases(); };
  const cws = $('#cws'); if (cws) cws.onchange = () => { S.caseWs = cws.value || null; S.caseLimit = null; viewCases(); };
  const cso = $('#csort'); if (cso) cso.onchange = () => { S.caseSort = sortPref('cases', CASE_SORTS, 'priority', CASE_SORTS.includes(cso.value) ? cso.value : 'priority'); viewCases(); };
  bindMore();

  const quiet = async () => {
    const r = await api('GET', `/api/cases?${caseFilterQ(f)}${(S.caseQ || '').length >= 2 ? '&q=' + encodeURIComponent(S.caseQ) : ''}${vq()}${lq()}`, undefined, { bg: true });
    if (!S.casesQuiet || S.casesQuiet.fn !== quiet || !isCasesHash()) return;
    const l2 = f === 'followup' ? r.cases.slice().sort((x, y) => (x.followup_on < y.followup_on ? -1 : x.followup_on > y.followup_on ? 1 : 0)) : r.cases;
    const cl = $('#cl'); if (!cl) return;
    cl.innerHTML = cPrint(l2, S.caseQ) + caseList(l2, null, cExtra) + trunc(r); bindMore();
    const ao = $('#casesasof'); if (ao) ao.innerHTML = asof(); bindCasesReload();
    S.casesQuiet.at = Date.now();
  };
  const bindCasesReload = () => { const a = $('#casesreload'); if (a) a.onclick = (e) => { e.preventDefault(); viewCases(); }; };
  bindCasesReload();
  S.casesQuiet = S.me.role !== 'driver' ? { fn: quiet, at: Date.now() } : null;
  let timer = null;
  const cq = $('#cq');
  cq.oninput = () => { clearTimeout(timer); timer = setTimeout(async () => {
    S.caseQ = cq.value.trim();
    try { const r = await api('GET', `/api/cases?${caseFilterQ(f)}${S.caseQ.length >= 2 ? '&q=' + encodeURIComponent(S.caseQ) : ''}${vq()}${lq()}`); const l2 = f === 'followup' ? r.cases.slice().sort((x, y) => (x.followup_on < y.followup_on ? -1 : x.followup_on > y.followup_on ? 1 : 0)) : r.cases; $('#cl').innerHTML = cPrint(l2, S.caseQ) + caseList(l2, null, cExtra) + trunc(r); bindMore(); announceHits(l2.length); } catch (err) { toast(err.message, true); }
  }, 300); };
}

async function logoutOutboxOk() {
  if (outboxGet().some((x) => !x.failed) && navigator.onLine !== false) await flushOutbox().catch(() => {});
  const pend = outboxGet().filter((x) => !x.failed).length;
  if (pend && !confirm(tn('logout_outbox_confirm', pend))) return false;

  const bad = outboxGet().filter((x) => x.failed).length + otherEnvOutbox().length;
  if (bad && !confirm(tn('logout_failed_confirm', bad))) return false;


  const dr = logoutDraftCount();
  return !dr || confirm(tn('logout_drafts_confirm', dr));
}
function logoutDraftCount() {
  if (!S.me) return 0;
  const mid = `_${S.me.id}_`; let n = 0;
  try { for (const k of Object.keys(sessionStorage)) if (k.startsWith('cfp_fd_') && k.includes(mid)) { const x = JSON.parse(sessionStorage.getItem(k) || 'null'); if (x && x.v && Object.keys(x.v).length && Date.now() - Date.parse(x.at) < FORM_DRAFT_MS) n++; } } catch {}
  try { for (const k of Object.keys(localStorage)) if (k.startsWith(`cfp_inv_${S.me.id}_`)) { const x = JSON.parse(localStorage.getItem(k) || 'null'); if (x && x.counts && Date.now() - Date.parse(x.at) < 14 * 86400000) n++; } } catch {}
  return n;
}

const wsFilterOk = () => S.me && ['owner', 'fleet', 'dispatch', 'viewer'].includes(S.me.role);

const nRow = (x) => `<div class="row note ${x.urgent ? 'p-kritisch' : ''}" style="${x.opened_at || x.acknowledged_at || x.own_device ? 'opacity:.7' : ''}"${x.own_device ? ' data-owndev' : ''}><span class="chip ${x.urgent ? 'kritisch' : ''}">${fmtDT(x.created_at)}</span><a class="title" style="white-space:normal" href="${esc(notifHref(x))}" data-open="${esc(x.id)}">${esc(x.title)}${x.own_device ? ` <span class="chip ok">${esc(t('nl_own_device'))}</span>` : ''}</a>${x.acknowledged_at ? '<span class="chip ok">✓</span>' : `<button class="btn secondary" data-ack="${esc(x.id)}">${esc(t('ack'))}</button>`}<span class="sub" style="white-space:normal">${x.coupled_locked ? `<b class="chip kritisch" data-ncoupled>${esc(t('notif_coupled_locked').replace('{v}', `${t(x.coupled_locked.kind === 'anhaenger' ? 'trailer' : 'truck')} ${x.coupled_locked.plate}`))}</b> ` : ''}${esc(x.body)} · Push: ${esc(x.push_status === 'pending' && x.push_hold_until && Date.parse(x.push_hold_until) > Date.now() ? t('pst_held').replace('{t}', fmtDT(x.push_hold_until)) : x.push_status === 'pending' && x.push_hold_until && x.push_hold_until >= '0001' && (x.opened_at || x.acknowledged_at) ? t('pst_held_opened') : t('pst_' + x.push_status) === 'pst_' + x.push_status ? x.push_status : t('pst_' + x.push_status))}</span></div>`;
async function viewInbox() {

  const NF = { all: () => true, unread: (x) => !x.opened_at && !x.acknowledged_at, urgent: (x) => !!x.urgent };


  let n = await api('GET', '/api/notifications?filter=' + (NF[S.inboxF] ? S.inboxF : 'unread'));
  const nf = NF[S.inboxF] ? S.inboxF : n.counts.unread ? 'unread' : 'all';
  if (nf !== n.filter) n = await api('GET', '/api/notifications' + (nf === 'all' ? '' : '?filter=' + nf));
  if (S.quietBg && (location.hash || '') !== '#/inbox') return;
  S.unread = n.counts.unread;
  const shown = n.notifications;
  render(`<h1>${esc(t('notifications'))}</h1>${n.quiet ? `<p class="small muted" id="qinfo">${esc(t('quiet_on').replace('{f}', n.quiet.from).replace('{t}', n.quiet.to))} – ${esc(t('quiet_short'))}</p>` : ''}<section class="panel" id="push"></section>
    <details class="panel" id="np"><summary>${esc(t('push_prefs'))}</summary><p class="small muted">${esc(t('push_prefs_hint'))}</p><div id="npl"></div></details>
    ${n.counts.all ? `<div class="actions"><button class="btn secondary" id="ra">${esc(t('mark_read'))}</button></div>
    <div class="seg-tabs" id="nfil">${Object.keys(NF).map((k) => `<a href="#/inbox" data-nf="${k}" class="${k === nf ? 'on' : ''}"${k === nf ? ' aria-current="true"' : ''}>${esc(t(k === 'all' ? 'all' : 'nf_' + k))} (${n.counts[k]})</a>`).join('')}</div>` : ''}
    ${n.truncated ? `<p class="small panel" id="ntrunc">${esc(t('nf_truncated').replace('{max}', n.max).replace('{n}', n.counts[nf]))}</p>` : ''}
    <div class="list" id="nlist">${shown.map((x) => nRow(x)).join('') || `<p class="muted">${esc(t(n.counts.all ? 'nf_none' : 'no_notifications'))}</p>`}</div>
    ${n.truncated ? `<div class="actions"><button type="button" class="btn secondary" id="nmore">${esc(t('nf_more'))}</button></div>` : ''}`, '');

  pushPanel($('#push'));
  const np = $('#np');

  np.ontoggle = () => { if (np.open && !np.dataset.loaded) loadNotifyPrefs(np).catch((err) => toast(err.message, true)); };

  const again = async () => { const o = np.open; await viewInbox(); const d = $('#np'); if (d && o) d.open = true; };
  const bindRows = (root) => {
    $$('[data-ack]', root).forEach((b) => (b.onclick = async () => { try { await api('POST', `/api/notifications/${b.dataset.ack}/ack`, undefined, { timeoutMs: SEND_TIMEOUT_MS });   await refreshUnread(); again(); } catch (err) { toast(err.message, true); } }));
    $$('[data-open]', root).forEach((a) => a.addEventListener('click', () => api('POST', `/api/notifications/${a.dataset.open}/opened`).then(() => refreshUnread(true)).catch(() => {})));
  };
  bindRows(document);

  let last = shown.length ? shown[shown.length - 1].id : null;
  const more = $('#nmore');
  if (more) more.onclick = async () => {
    try {
      const m = await api('GET', `/api/notifications?${nf === 'all' ? '' : 'filter=' + nf + '&'}before=${encodeURIComponent(last)}`);
      const box = document.createElement('div'); box.innerHTML = m.notifications.map((x) => nRow(x)).join(''); bindRows(box);
      $('#nlist').append(...box.children); $('#nlist').dataset.more = '1';
      if (m.notifications.length) last = m.notifications[m.notifications.length - 1].id;
      if (!m.truncated) more.parentElement.remove();
    } catch (err) { toast(err.message, true); }
  };
  const ra = $('#ra'); if (ra) ra.onclick = async () => { try { await api('POST', '/api/notifications/read-all', n.as_of ? { before: n.as_of } : {}); S.unread = 0; paintBadge(); refreshUnread(true); again(); } catch (err) { toast(err.message, true); } };
  $$('[data-nf]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); S.inboxF = a.dataset.nf; again().catch((err) => toast(err.message, true)); }));
}
async function viewSearch() {
  if (S.me.role === 'driver') { location.hash = '#/'; return; }
  render(`<h1>${esc(t('search_title'))}</h1><input id="gq" type="search" autocomplete="off" aria-label="${esc(t('search_title'))}" placeholder="${esc(t('search_ph'))}" value="${esc(S.lastSearch || '')}"><div id="gr"></div>`, '');
  let vehicles = null; let fineList = null; let fineTrunc = false; let stockList = null; let ctList = null; let timer = null; let seq = 0;

  const canFines = ['owner', 'fleet', 'viewer'].includes(S.me.role); const canStock = ['owner', 'fleet', 'workshop'].includes(S.me.role);
  const norm = searchKey;
  const run = async () => {
    const q = $('#gq').value.trim(); S.lastSearch = q; const my = ++seq; const box = $('#gr');
    if (q.length < 2) { box.innerHTML = `<p class="muted small">${esc(t('search_hint'))}</p>${matchMedia('(hover: hover) and (pointer: fine)').matches ? `<p class="muted small" data-kbd>${esc(t('search_kbd'))}</p>` : ''}`; return; }
    try {

      if (!vehicles) {
        const [va, vi] = await Promise.all([api('GET', '/api/vehicles'), isMgr() ? api('GET', '/api/vehicles?inactive=1') : null]);
        vehicles = va.vehicles.concat(vi ? vi.vehicles.map((v) => ({ ...v, __inactive: true })) : []);
      }
      const n = norm(q);

      const vHit = (k) => vehicles.filter((v) => [v.plate, v.vin, v.trailer_plate, v.truck_plate, v.manufacturer, v.model].some((x) => norm(x).includes(k)) || (v.former_plates || []).some((x) => norm(x).includes(k)));
      const ncq = plateNoCountry(q); let vAll = vHit(n); if (!vAll.length && ncq) vAll = vHit(norm(ncq)); if (!vAll.length) { const fv = vinOf(q); if (fv && fv.v) vAll = vHit(norm(fv.v)); }   const vs = vAll.slice(0, 10);
      const cr = await api('GET', '/api/cases?status=&limit=20&q=' + encodeURIComponent(q)); const cs = cr.cases;

      if (canFines && !fineList) { const fr = await api('GET', '/api/fines'); fineList = fr.fines; fineTrunc = !!fr.truncated; }
      if (canStock && !stockList) stockList = (await api('GET', '/api/stock')).items;


      if (isMgr() && !ctList) ctList = (await api('GET', '/api/contracts?filter=alle')).contracts;
      const clr = isMgr() ? await api('GET', '/api/claims?filter=alle&q=' + encodeURIComponent(q.slice(0, 60))) : null;
      await loadHelp(S.lang).catch(() => {});
      if (my !== seq) return;
      const lq = q.toLowerCase(); const hq = helpNorm(q);
      const refQ = q.toUpperCase().replace(/[ ./-]/g, '').replace(/^(AZ|AKTENZEICHEN):?/, ''); const fAll = canFines ? fineList.filter((f) => [f.plate, f.plate_in_letter].some((x) => norm(x).includes(n)) || [f.fine_no, f.reference, f.authority].some((x) => String(x || '').toLowerCase().includes(lq)) || (hq.length >= 3 && helpNorm(f.authority).includes(hq)) || (refQ.length >= 4 && String(f.reference || '').toUpperCase().replace(/[ ./-]/g, '').includes(refQ))) : [];   const fs = fAll.slice(0, 10);


      const sAll = canStock && hq ? stockList.filter((i) => stockHit(i, q)) : [];
      const ss = sAll.slice(0, 10);
      const nk = (x) => norm(x).replace(/[\s\-./]/g, ''); const nq = nk(q);
      const kAll = ctList && nq ? ctList.filter((c) => (c.contract_no && nk(c.contract_no).includes(nq)) || norm(c.partner).includes(n) || (hq.length >= 3 && helpNorm(c.partner).includes(hq))) : []; const ks = kAll.slice(0, 10);
      const clAll = clr ? clr.claims : []; const cls = clAll.slice(0, 10);
      const more = (shown, all) => (all > shown ? `<p class="small muted" data-more>${esc(t('search_more').replace('{n}', shown).replace('{m}', all))}</p>` : '');

      const hs = !helpLoaded(S.lang) ? [] : (helpMatches(helpSections(S.me.role).map((h) => ({ name: h, title: t(`help_${h}_t`), steps: t(`help_${h}_s`).split('|') })), q) || []).sort((a, b) => b.title_hit - a.title_hit).slice(0, 5);
      box.innerHTML = `<h2>${esc(t('nav_vehicles'))} <span class="chip">${vAll.length}</span></h2>${more(vs.length, vAll.length)}${vs.length ? `<div class="list">${vs.map((v) => `<a class="row" href="#/vehicles/${encodeURIComponent(v.id)}">${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="title">${v.kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${esc(v.manufacturer || '')} ${esc(v.site || '')}</span><span class="chip">${esc(v.__inactive ? t('inactive_vehicles') : t('av_' + v.availability))}</span><span class="sub">${esc(v.vin || '')}${((x) => (x ? ` · <b data-formerhit>${esc(t('former_plate_hit').replace('{p}', x))}</b>` : ''))((v.former_plates || []).find((x) => norm(x).includes(n) && !norm(v.plate).includes(n)))}</span></a>`).join('')}</div>` : noneP()}
        <h2>${esc(t('nav_cases'))} <span class="chip">${cs.length}${cr.truncated ? '+' : ''}</span></h2>${cr.truncated ? `<p class="small muted" data-more>${esc(t('search_more_cases').replace('{n}', cs.length))} <a href="#/cases" id="gcases">${esc(t('search_all_cases'))}</a></p>` : ''}${caseList(cs, '–')}`
        + (canFines && fineTrunc ? `<p class="small muted" id="gftrunc">${esc(t('fines'))}: ${esc(t('fines_truncated'))}</p>` : '')
        + (fs.length ? `<h2>${esc(t('fines'))} <span class="chip">${fAll.length}</span></h2>${more(fs.length, fAll.length)}<div class="list" id="gfines">${fs.map((f) => `<a class="row" href="#/fines/${esc(f.id)}">${plate(f.plate || f.plate_in_letter)}<span class="title">${esc(t('fk_' + f.kind))}</span><span class="chip">${esc(t('fs_' + f.status))}</span><span class="sub">${noTr(f.fine_no)}${f.reference ? ' · ' + noTr(f.reference) : ''}${f.authority ? ' · ' + esc(f.authority) : ''}</span></a>`).join('')}</div>` : '')
        + (ks.length ? `<h2>${esc(t('ct_title'))} <span class="chip">${kAll.length}</span></h2>${more(ks.length, kAll.length)}<div class="list" id="gcontracts">${ks.map((c) => `<a class="row" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${plate(c.plate)}<span class="title">${esc(t('ck_' + c.kind))} · ${esc(c.partner)}${c.contract_no ? ' · ' + noTr(c.contract_no) : ''}</span>${ctChip(c.status)}</a>`).join('')}</div>` : '')
        + (cls.length ? `<h2>${esc(t('claims'))} <span class="chip">${clAll.length}</span></h2>${more(cls.length, clAll.length)}<div class="list" id="gclaims">${cls.map((c) => `<a class="row" href="#/cases/${encodeURIComponent(c.case_id)}">${plate(c.plate)}<span class="title">${esc(c.insurer)}${c.claim_no ? ' · ' + noTr(c.claim_no) : ''}${c.opponent_claim_no ? ` · ${esc(t('co_claim_no'))} ${noTr(c.opponent_claim_no)}` : ''}</span><span class="chip">${esc(t('cls_' + c.status))}</span><span class="sub"><span translate="no">${esc(c.case_no)}</span> · ${esc(t('claim_reported'))} ${fmtD(c.reported_on)}</span></a>`).join('')}</div>` : '')
        + (ss.length ? `<h2>${esc(t('stock'))} <span class="chip">${sAll.length}</span></h2>${more(ss.length, sAll.length)}<div class="list" id="gstock">${ss.map((i) => `<a class="row ${i.below_min ? 'p-mittel' : ''}" href="#/stock/${esc(i.id)}"><span class="chip">${esc(wsName(i.site))}</span><span class="title">${esc(i.name)}</span><b>${fmtNum(i.on_hand)} ${esc(unitL(i.unit))}</b><span class="sub">${[i.part_number && esc(i.part_number), i.location && esc(i.location), i.below_min && esc(t('below_min'))].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>` : '')
        + (hs.length ? `<h2>${esc(t('help'))} <span class="chip">${hs.length}</span></h2><div class="list" id="ghelp">${hs.map((h) => `<a class="row" href="#/help?s=${h.name}&q=${encodeURIComponent(q)}"><span>?</span><span class="title">${esc(t(`help_${h.name}_t`))}</span><span></span></a>`).join('')}</div>` : '');
      const gc = $('#gcases'); if (gc) gc.onclick = () => { S.caseQ = q; try { sessionStorage.setItem('cfp_cf', 'all'); } catch {} };
      announceHits(vAll.length + cs.length + fAll.length + kAll.length + clAll.length + sAll.length + hs.length);
    } catch (err) { if (my === seq) box.innerHTML = `<div class="panel alert" role="alert">${esc(err.message)}</div>`; }
  };
  $('#gq').oninput = () => { clearTimeout(timer); timer = setTimeout(run, 300); };
  $('#gq').focus();
  run();
}

async function viewHelp(want, q) {

  try { await loadHelp(S.lang); } catch (e) { console.error(e); throw new Error(t('lazy_load_failed')); }
  const sec = (n) => `<section class="panel helpsec" id="help-${n}"><h2 style="margin-top:0">${esc(t(`help_${n}_t`))}</h2><ol>${t(`help_${n}_s`).split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ol></section>`;
  const parts = helpSections(S.me.role);
  render(`<h1>${esc(t('help'))}</h1><div class="panel"><label for="hq">${esc(t('help_search'))}</label><input id="hq" type="search" autocomplete="off">${helpToc(parts)}</div>`
    + parts.map(sec).join('') + `<p class="small muted">${esc(t('app_version'))}: ${esc(S.appVersion || '–')}</p>`, 'more');
  if (q) $('#hq').value = q.slice(0, 100);
  const run = helpWire(parts, want);
  let timer;

  const keepQ = () => { const v = $('#hq').value.trim().slice(0, 100); try { history.replaceState(history.state, '', helpHash(v)); } catch {   } };
  $('#hq').oninput = () => { clearTimeout(timer); timer = setTimeout(() => { run(); keepQ(); }, 150); };
}
const helpHash = (q) => '#/help' + (q ? '?q=' + encodeURIComponent(q) : '');

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
    $('#hres').textContent = !res ? '' : res.length === 1 ? t('help_hits1') : res.length ? tn('help_hits', res.length) : t('help_none');
  };
  if (document.getElementById('hq').value) run();
  if (want && parts.includes(want)) go(want);
  return run;
}
async function viewMore(open) {
  render(`<h1>${esc(t('nav_more'))}</h1><div class="list morelist">
    ${S.me.role !== 'driver' ? `<a class="row" href="#/vehicles"><span>${ICON.truck}</span><span class="title">${esc(t('vehicles'))}</span><span></span></a>` : ''}
    ${mayCheck() ? `<a class="row" href="#/check"><span>✓</span><span class="title">${esc(t('departure_check'))}</span><span></span></a>` : ''}
    <a class="row" href="#/inbox"><span>${ICON.bell}</span><span class="title">${esc(t('notifications'))}</span><span></span></a>
    <a class="row" href="#/help"><span>?</span><span class="title">${esc(t('help'))}</span><span></span></a>
    <a class="row" href="#/emergency"><span>☎</span><span class="title">${esc(t('em_title'))}</span><span></span></a>
    ${isMgr() || S.me.role === 'dispatch' || S.me.role === 'workshop' ? `<a class="row" href="#/guide"><span>▤</span><span class="title">${esc(t('guide'))}</span><span></span></a>` : ''}
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
    ${S.me.role === 'owner' ? `<a class="row" href="#/readiness"><span>☑</span><span class="title">${esc(t('rd_title'))}</span><span></span></a>` : ''}
    ${S.me.role === 'owner' ? `<a class="row" href="#/usage"><span>📊</span><span class="title">${esc(t('usage'))}</span><span></span></a>` : ''}
    ${S.me.role === 'owner' ? `<a class="row" href="#/audit"><span>🔒</span><span class="title">${esc(t('audit'))}</span><span></span></a>` : ''}
    ${S.me.role === 'owner' ? `<a class="row" href="#/settings"><span>⚙</span><span class="title">${esc(t('settings'))}</span><span></span></a>` : ''}
  </div>
  <h2>${esc(t('nav_profile'))}</h2><section class="panel"><p><b>${esc(S.me.display_name)}</b> · ${esc(S.me.username)} · ${esc(t('role_' + S.me.role))}${S.me.role === 'workshop' && S.me.workshop_site ? ` · <span data-mysite>${esc(t('ws_site_lbl'))} ${esc(wsName(S.me.workshop_site))}</span>` : ''}${S.me.environment === 'test' ? ' · <span class="chip test">TEST</span>' : ''}</p>${langSelect()}
  ${S.me.role !== 'driver' ? `<div id="hsbox"><label for="homesite">${esc(t('home_site'))}</label><select id="homesite"><option value="">${esc(t('filter_all'))}</option>${S.me.home_site ? `<option selected>${esc(S.me.home_site)}</option>` : ''}</select><p class="small muted">${esc(t(S.me.role === 'workshop' ? 'home_site_hint_ws' : S.me.role === 'dispatch' ? 'home_site_hint_dispo' : 'home_site_hint'))}</p></div>` : ''}
  <details><summary>${esc(t('change_password'))}</summary><form id="pw"><label>${esc(t('old_password'))}</label><input type="password" name="old_password" required autocomplete="current-password"><label>${esc(t('new_password'))}<span class="hint">${esc(t('pw_rule'))}</span></label><input type="password" name="new_password" required minlength="10" maxlength="200" autocomplete="new-password"><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>
  <details id="tfa"><summary>${esc(t('tf_title'))} <span class="chip ok" id="tfchip"${S.me.totp_enabled ? '' : ' hidden'}>${esc(t('tf_chip'))}</span></summary><div id="tfabox"><p class="muted">${esc(t('loading'))}</p></div></details>
  <details id="sess"><summary>${esc(t('my_sessions'))}</summary><p class="small muted">${esc(t('new_login_hint'))}</p><div id="sesslist" class="list"><p class="muted">${esc(t('loading'))}</p></div><h3>${esc(t('kd_title'))}</h3><p class="small muted">${esc(t('kd_hint'))}</p><div id="kdlist" class="list"></div></details>
  <div class="actions"><button class="btn secondary" id="lo">${esc(t('logout'))}</button></div></section>`, 'more');
  bindLang(true);
  const hs = $('#homesite');
  if (hs) {
    api('GET', '/api/sites').then((r) => {

      const cur0 = S.me.home_site || ''; const cur = (cur0 && r.sites.find((x) => siteKeyUi(x) === siteKeyUi(cur0))) || cur0;
      hs.innerHTML = `<option value="">${esc(t('filter_all'))}</option>` + [...new Set([...r.sites, ...(cur ? [cur] : [])])].map((x) => `<option value="${esc(x)}"${x === cur ? ' selected' : ''}>${esc(x === 'ohne' ? t('cs_nosite') : x)}</option>`).join('');
    }).catch(() => {});
    hs.onchange = async () => {
      try {
        await api('PATCH', '/api/me', { home_site: hs.value }, { timeoutMs: SEND_TIMEOUT_MS });
        S.me.home_site = hs.value || null;

        for (const k of ['costSite', 'defSite', 'fineSite', 'maintSite', 'tireSite', 'vehSite', 'caseVsite', 'kpiVsite', 'planVsite', 'dqSite', 'claimSite', 'ctSite', 'drvSite', 'tachoSite']) delete S[k];
        toast('✓');
      } catch (err) { toast(err.message, true); }
    };
  }
  const sess = $('#sess');
  sess.ontoggle = () => { if (sess.open) loadSessions().catch((err) => toast(err.message, true)); };

  if (open === 'sess') { sess.open = true; sess.scrollIntoView({ block: 'start' }); }
  const tfa = $('#tfa');
  tfa.ontoggle = () => { if (tfa.open) loadTotp().catch((err) => toast(err.message, true)); };


  $('#lo').onclick = async () => { if (!(await logoutOutboxOk())) return; try { await api('POST', '/api/logout', { push_endpoint: await pushOffForLogout() }); } catch (err) { if (err.status !== 401) { if (err.offline) { const box = $('#lo_off') || Object.assign(document.createElement('p'), { id: 'lo_off', className: 'small alert' }); box.setAttribute('role', 'alert'); box.textContent = t('logout_offline'); $('#lo').closest('.actions').after(box); return; } toast(err.message, true); return; } } clearOfflineData(); resetUserState(); markSession(''); location.hash = '#/login'; };
  $('#pw').onsubmit = async (e) => { e.preventDefault(); try { const r = await api('POST', '/api/me/password', Object.fromEntries(new FormData(e.target)), { timeoutMs: SEND_TIMEOUT_MS });


    e.target.reset(); const dd = e.target.closest('details'); if (dd) dd.open = false; toast(r && r.duplicate ? t('saved_before') : '✓ ' + t('pw_changed_others')); } catch (err) { toast(err.message, true); } };
}

export { viewCases, viewHelp, viewInbox, viewMore, viewSearch };
