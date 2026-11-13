// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { BERLIN_FMT, S, WST_ST, api, bDate, cDesc, clipTxt, comboClearV, dispoDayBefore, esc, federalHoliday, fmtD, fmtDT, fmtDue, helpLink, hj, hoMissing, langAttr, ltxt, mk, nextWorkdayAfter, partsEta, planVehTag, plate, plateCmp, posL, rdyOf, rdyTxt, siteKeyUi, stTxt, t, tn, todayMark, translateLockReason, vOverdue, vlAt, woApptTxt, woTag, wsName } from './app-main.js';




const dispoReturnKnown = (c) => {
  if (c.status === 'abschlusskontrolle') return true;
  if (c.ready_expected_on && rdyOf(c) && c.ready_expected_on > bDate()) return true;
  if (c.status === 'in_reparatur') return false;
  const d = c.status === 'wartet_teile' ? c.parts_expected_date : c.planned_date;
  return !!d && d > bDate();
};


async function dispoHome(cases) {
  let html = '';

  const hs = S.me.home_site && !S.dispoAll ? S.me.home_site : '';
  const hq = hs ? encodeURIComponent(hs) : '';
  const [dcs, dmo, dvs] = await Promise.all([cases === null ? [] : api('GET', '/api/cases?status=open&limit=500' + (hq ? '&vsite=' + hq : '')).then((r) => r.cases).catch(() => []), cases === null ? null : api('GET', '/api/maintenance' + (hq ? '?site=' + hq : '')).catch(() => null),
    cases === null ? [] : api('GET', '/api/vehicles').then((r) => r.vehicles).catch(() => [])]);
  html += dispoBoard(dcs, dmo && dmo.defects_without_case ? dmo.defects_without_case : [], new Map(dvs.filter((v) => v.coupled).map((v) => [v.id, v.coupled])), new Set(dvs.filter((v) => v.eval_excluded).map((v) => v.id)));
  if (cases !== null) html += await dispoBack(dcs, hq, new Map(dvs.filter((v) => v.coupled).map((v) => [v.id, v.coupled])));
  html += dispoApw(dcs);


  const nu = dcs.filter((c) => c.status === 'gemeldet' && !c.fleet_received_at).length;
  if (nu) html += `<p class="noprint"><a href="${hj('#/cases?f=unreceived')}" class="tap" id="dunrec" data-site="${esc(hs)}"><b>${esc(t('dispo_unreceived'))} (${nu})</b></a></p>`;


  const nlL = dcs.filter((c) => c.status === 'gemeldet' && !c.safety_lock && c.reported_driveability === 'eingeschraenkt'); const nl = nlL.length;
  if (nl) html += `<p class="noprint"><a href="${hj('#/cases?f=limited')}" id="dlimited"><b>${esc(t('dispo_limited_new'))} (${nl})</b></a></p>${dispoPrintLine('limited', t('dispo_limited_new'), nlL.map((c) => c.plate))}`;



  const nk = siteKeyUi;
  const wn = dvs.filter((v) => v.notes_active > 0 && (!hs || nk(v.site) === nk(hs === 'ohne' ? null : hs))).length;
  if (wn) html += `<p class="noprint"><a href="${hj('#/vehicles?f=with_notes')}" id="dnotes">${esc(t('vnotes_with_veh'))} (${wn})</a></p>`;

  const inSite = (v) => !hs || nk(v.site) === nk(hs === 'ohne' ? null : hs);
  const moL = dvs.filter((v) => inSite(v) && vOverdue(v)); const mo = moL.length;
  if (mo) html += `<p class="noprint"><a class="panel alert" style="display:block;text-decoration:none" href="${hj('#/vehicles?f=maint_overdue')}" id="dmover"><b>${esc(t('av_maint_overdue'))} (${mo})</b></a></p>${dispoPrintLine('mover', t('av_maint_overdue'), moL.map((v) => v.plate + (v.next_due && v.next_due < bDate() ? ` (${v.next_due_kind ? mk(v.next_due_kind) + ' ' : ''}${fmtD(v.next_due)})` : '')), true)}`;
  html += dispoDueSoon(dvs, (v) => !hs || nk(v.site) === nk(hs === 'ohne' ? null : hs), dmo && Array.isArray(dmo.rows) ? dmo.rows : null);


  const clL = dvs.filter((v) => !v.eval_excluded && v.availability !== 'gesperrt' && v.coupled && v.coupled.availability === 'gesperrt' && (!hs || nk(v.site) === nk(hs === 'ohne' ? null : hs))); const cl = clL.length;
  if (cl) html += `<p class="noprint"><a class="panel alert" style="display:block;text-decoration:none" href="${hj('#/vehicles?f=coupled_locked')}" id="dcoupled"><b>${esc(t('av_coupled_locked'))} (${cl})</b></a></p>${dispoPrintLine('coupled', t('av_coupled_locked'), clL.map((v) => `${v.plate} (🔗 ${t('vk_' + v.coupled.kind)} ${v.coupled.plate})`), true)}`;


  const ccAll = dvs.filter((v) => v.kind === 'lkw' && v.coupled && v.coupled.kind === 'anhaenger' && !v.eval_excluded && inSite(v));
  const ccL = ccAll.filter(comboClearV);
  if (ccAll.length) html += `<p class="noprint"><a href="${hj('#/vehicles?f=combo_clear')}" id="dcombo" data-n="${ccL.length}" title="${esc(t('av_combo_clear_t'))}">${esc(t('av_combo_clear'))} (${ccL.length})</a></p>${dispoPrintLine('combo', t('av_combo_clear'), ccL.map((v) => `${v.plate} + ${v.coupled.plate}`))}`;
  if (cases !== null) html += await dispoWinter(hs);
  html += `<p class="noprint"><button type="button" class="btn secondary" id="dprint">${esc(t('print'))}</button></p>`;
  html += helpLink('dispo');
  if (cases !== null) html += await dispoPlanned(S.me.home_site && !S.dispoAll ? S.me.home_site : '');
  return html;
}



function dispoApw(cs) {
  const byV = new Map();
  for (const c of cs) { if (!c.appraisal_wait_on) continue; const x = byV.get(c.vehicle_id); if (!x || c.appraisal_wait_on < x.appraisal_wait_on) byV.set(c.vehicle_id, c); }
  const list = [...byV.values()].sort((a, b) => a.appraisal_wait_on.localeCompare(b.appraisal_wait_on) || plateCmp(a.plate, b.plate));
  if (!list.length) return '';
  return `<h2 id="dapw">🔍 ${esc(t('dispo_apw'))} <span class="chip mittel">${list.length}</span></h2><p class="small muted">${esc(t('apw_hint_dispo'))}</p><div class="list">${list.map((c) => `<a class="row p-mittel" href="#/cases/${esc(c.id)}" data-dapw>${plate(c.plate, { locked: c.safety_lock })}<span class="title" style="white-space:normal">${esc(stTxt(c))}</span><span class="chip mittel" style="white-space:nowrap" data-dapwon>${fmtD(c.appraisal_wait_on)}${todayMark(c.appraisal_wait_on)}</span><span class="sub wrap">${esc(c.case_no)}</span></a>`).join('')}</div>${dispoPrintLine('apw', t('dispo_apw'), list.map((c) => `${c.plate} (${fmtD(c.appraisal_wait_on)})`))}`;
}

function dispoPrintLine(key, label, items, alert = false) {
  if (!items.length) return '';
  const sorted = [...items].sort(plateCmp);
  return `<div class="print-only panel small${alert ? ' alert' : ''}" data-dprint="${esc(key)}"><b>${esc(label)} (${items.length})</b>: ${sorted.map(esc).join(', ')}</div>`;
}


const DISPO_DEFECTS = ['gefaehrliche_maengel', 'verkehrsunsicher'];
function dispoBoard(cs, defects = [], coupled = new Map(), dormant = new Set()) {
  const insp = defects.filter((x) => DISPO_DEFECTS.includes(x.result)).sort((a, b) => (a.result === 'verkehrsunsicher' ? -1 : 0) - (b.result === 'verkehrsunsicher' ? -1 : 0) || plateCmp(a.plate, b.plate));
  const inspHtml = insp.length ? `<h2>${esc(t('dispo_insp_defects'))}</h2><div class="list">${insp.map((x) => `<a class="row p-kritisch" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('res_' + x.result))}${x.result === 'verkehrsunsicher' ? ' – ' + esc(t('do_not_drive')) : ''}</span><span class="chip kritisch">${esc(mk(x.kind))} ${fmtD(x.done_date)}</span><span class="sub wrap" data-inspsub>${esc(t('dispo_insp_hint'))}${coupled.has(x.vehicle_id) ? ` · <b data-inspcoupled>${esc(t(coupled.get(x.vehicle_id).kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(coupled.get(x.vehicle_id).plate)}</b>` : ''}</span></a>`).join('')}</div>` : '';
  return inspHtml + dispoCases(cs, !!insp.length, coupled, dormant);
}



const DISPO_BLOCK_ST = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'];
const DISPO_BACK_LIMIT = 200;
function lastWorkdayBefore(iso) {

  const ymd = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  let d = new Date(Date.parse(iso + 'T12:00:00Z'));
  for (let i = 0; i < 10; i++) { d = new Date(d.getTime() - 86400000); const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6 && !federalHoliday(ymd(d))) return ymd(d); }
  return ymd(new Date(Date.parse(iso + 'T12:00:00Z') - 86400000));
}


function dispoDueSoon(dvs, inSite, mrows = null) {
  const today = bDate(); const nwd = nextWorkdayAfter(today);
  const byV = new Map(dvs.map((v) => [v.id, v])); const g = new Map();



  const put = (v, kind, due, r = null) => { if (!v || v.eval_excluded || !inSite(v) || !due || due < today || due > nwd) return; const x = g.get(v.id) || { v, d: [] }; x.d.push({ kind, due, r }); g.set(v.id, x); };
  if (Array.isArray(mrows)) for (const r of mrows) { if (!['erledigt', 'nicht_pflichtig'].includes(r.status)) put(byV.get(r.vehicle_id), r.kind, r.next_due_date, r); }
  else for (const v of dvs) put(v, v.next_due_kind, v.next_due);
  const list = [...g.values()].map((x) => ({ ...x, d: x.d.sort((a, b) => a.due.localeCompare(b.due) || String(a.kind).localeCompare(String(b.kind))) }))
    .sort((a, b) => a.d[0].due.localeCompare(b.d[0].due) || plateCmp(a.v.plate, b.v.plate));
  if (!list.length) return '';
  const dueTxt = (d) => (d === today ? t('today') : fmtDue(d));
  return `<h2 id="dduesoon">${esc(t('dispo_due_soon').replace('{d}', fmtDue(nwd)))} <span class="chip mittel">${list.length}</span></h2><p class="small muted">${esc(t('dispo_due_soon_hint'))}</p><div class="list">${list.map(({ v, d }) => `<a class="row p-mittel" href="#/vehicles/${encodeURIComponent(v.id)}" data-dduesoon>${plate(v.plate)}<span class="title" style="white-space:normal">${d.length > 1 ? d.map((x) => `${esc(x.kind ? mk(x.kind) : t('next_due'))} (${esc(dueTxt(x.due))})`).join(' · ') : esc(d[0].kind ? mk(d[0].kind) : t('next_due'))}</span><span class="chip mittel" style="white-space:nowrap">${esc(dueTxt(d[0].due))}</span>${d.some((x) => x.r) ? `<span class="sub wrap" data-ddueplan>${d.filter((x) => x.r).map((x) => (d.length > 1 ? esc(x.kind ? mk(x.kind) : t('next_due')) + ': ' : '') + dueSoonPlan(x.r, x.due, today)).join(' · ')}</span>` : ''}${v.coupled ? `<span class="sub wrap" data-dduecoupled>🔗 ${esc(t('vk_' + v.coupled.kind))} ${esc(v.coupled.plate)}</span>` : ''}</a>`).join('')}</div>`;
}


function dueSoonPlan(r, due, today) {
  const pd = r.planned_date && r.planned_date >= today ? r.planned_date : null;
  if (pd && pd > due) return `<b style="color:var(--stop)" data-dplate>⚠ ${esc(t('dispo_ds_late').replace('{d}', fmtD(pd)))}</b>`;
  if (pd) return `<span data-dplan>📅 ${esc(t('dispo_ds_plan').replace('{d}', fmtD(pd)))}${todayMark(pd)}</span>`;
  if (r.open_order) return `<span data-dplanord>🔧 ${esc(t('mo_open'))} ${esc(r.open_order.case_no)}</span>`;
  return `<b data-dnoplan>${esc(t('dispo_ds_noplan'))}</b>`;
}




const cpState = (cp) => (cp && ['werkstatt', 'gesperrt'].includes(cp.availability) ? `<b data-cpstate>⚠ 🔗 ${esc(t('vk_' + cp.kind))} ${esc(cp.plate)}: ${esc(t('av_' + cp.availability))}</b>` : '');
async function dispoBack(open, hq = '', cpl = new Map()) {
  let rows;
  try { rows = (await api('GET', `/api/cases?status=fahrzeug_freigegeben&sort=updated&limit=${DISPO_BACK_LIMIT}${hq ? '&vsite=' + hq : ''}`)).cases; } catch { return ''; }


  const from = lastWorkdayBefore(bDate());
  const blocked = new Set(open.filter((c) => c.safety_lock || DISPO_BLOCK_ST.includes(c.status)).map((c) => c.vehicle_id));
  const byV = new Map();
  for (const c of rows) {
    if (!c.closed_at || BERLIN_FMT.format(new Date(c.closed_at)) < from || blocked.has(c.vehicle_id)) continue;
    const cur = byV.get(c.vehicle_id); if (!cur || c.closed_at > cur.closed_at) byV.set(c.vehicle_id, c);
  }

  const more = rows.length >= DISPO_BACK_LIMIT && rows.length && BERLIN_FMT.format(new Date(rows[rows.length - 1].updated_at)) >= from;
  const list = [...byV.values()].sort((a, b) => String(b.closed_at).localeCompare(String(a.closed_at)));
  if (!list.length) return '';
  return `<h2 id="dback">${esc(from === bDate(-1) ? t('dispo_back') : t('dispo_back_since').replace('{d}', fmtD(from)))} <span class="chip ok">${list.length}${more ? '+' : ''}</span></h2><p class="small muted">${esc(t('dispo_back_hint'))}</p><div class="list">${list.map((c) => `<a class="row p-niedrig" href="#/cases/${esc(c.id)}" data-dback>${plate(c.plate)}<span class="title" style="white-space:normal">${ltxt(clipTxt(cDesc(c.description), 80))}</span><span class="chip ok" style="white-space:nowrap">${esc(t('dispo_back_at'))} ${fmtDT(c.closed_at)}</span><span class="sub wrap">${esc(c.case_no)}${c.workshop_site ? ' · ' + esc(wsName(c.workshop_site)) : ''}${cpState(cpl.get(c.vehicle_id)) ? ' · ' + cpState(cpl.get(c.vehicle_id)) : ''}${c.open_items > 0 ? ` · <b data-dbitems style="white-space:nowrap">${esc(tn('rc_open_items', c.open_items))}</b> (${esc(t('dback_ns'))})` : ''}${c.pickup_note ? ` · <b data-dbpickup>${esc(t('pu_title'))}:</b> <span${langAttr(c.pickup_note)}>${esc(clipTxt(c.pickup_note, 120))}</span>` : ''}</span></a>`).join('')}</div>`;
}




function dispoUpcoming(c, today) {
  return c.status === 'werkstatt_freigegeben' && !c.safety_lock && !!c.planned_date && c.planned_date > today && !c.vehicle_location && !c.tow_service && c.reported_driveability !== 'nicht_fahrbereit';
}

function dispoWeekEnd(d) { const [y, m, dd] = String(d).split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, dd)); const add = (7 - x.getUTCDay()) % 7; const e = new Date(Date.UTC(y, m - 1, dd + add)); return `${e.getUTCFullYear()}-${String(e.getUTCMonth() + 1).padStart(2, '0')}-${String(e.getUTCDate()).padStart(2, '0')}`; }


const dispoWst = (cs, c) => { const w = [c, ...cs.filter((x) => x.vehicle_id === c.vehicle_id && x !== c)].find((x) => x.work_state_note && WST_ST.includes(x.status)); return w ? ` · <span data-dwst>⏸ <b>${esc(t('wst_short'))}</b>: ${ltxt(clipTxt(w.work_state_note, 80))}${w !== c ? ` (${esc(w.case_no)})` : ''}</span>` : ''; };
function dispoCases(cs, hasOther = false, coupled = new Map(), dormant = new Set()) {
  const byV = new Map(); const upc = new Map(); const today0 = bDate();
  const rank = (c) => (c.safety_lock ? 3 : c.status === 'wartet_teile' && c.parts_drive_at ? 0 : c.status === 'wartet_teile' ? 2 : dispoUpcoming(c, today0) ? 0 : ['werkstatt_freigegeben', 'in_reparatur', 'abschlusskontrolle'].includes(c.status) ? 1 : 0);
  for (const c of cs) if (dispoUpcoming(c, today0)) { const u = upc.get(c.vehicle_id); if (!u || c.planned_date < u.planned_date) upc.set(c.vehicle_id, c); }

  const since = (r, c) => String(r === 3 ? c.lock_since || c.created_at : c.status_since || c.updated_at || '');
  for (const c of cs) { const r = rank(c); if (!r) continue; const cur = byV.get(c.vehicle_id); if (!cur || r > cur.r || (r === cur.r && since(r, c) < since(cur.r, cur.c))) byV.set(c.vehicle_id, { r, c }); }
  const list = [...byV.values()].sort((a, b) => b.r - a.r || plateCmp(a.c.plate, b.c.plate));
  const up = [...upc.values()].filter((c) => !byV.has(c.vehicle_id)).sort((a, b) => String(a.planned_date).localeCompare(String(b.planned_date)) || plateCmp(a.plate, b.plate));

  const upHtml = up.length ? `<h2 id="dupc">${esc(t('dispo_upcoming'))} <span class="chip">${up.length}</span></h2><p class="small muted">${esc(t('dispo_upcoming_hint').replace('{w}', t('av_werkstatt')))}</p><div class="list">${up.map((c) => `<a class="row p-niedrig" href="#/cases/${esc(c.id)}" data-dupc>${plate(c.plate)}<span class="title" style="white-space:normal">${esc(t('dispo_upcoming_on').replace('{d}', fmtDue(c.planned_date)))}</span><span class="chip ok" style="overflow-wrap:normal" data-dupcuntil>${esc(t('dispo_upcoming_until').replace('{d}', fmtD(dispoDayBefore(c.planned_date))))}</span>${dormant.has(c.vehicle_id) ? ` <span class="chip" data-dormant>${esc(t('eval_excluded'))}</span>` : ''}<span class="sub wrap">${esc(c.case_no)}${c.workshop_site ? ' · ' + esc(wsName(c.workshop_site)) : ''}${coupled.has(c.vehicle_id) ? ` · <b>${esc(t(coupled.get(c.vehicle_id).kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(coupled.get(c.vehicle_id).plate)}</b>${cpState(coupled.get(c.vehicle_id)) ? ' ' + cpState(coupled.get(c.vehicle_id)) : ''}` : ''}${c.reported_driveability === 'eingeschraenkt' ? ` · <b data-dupclim>${esc(t('dispo_upcoming_limited'))}</b>` : ''}${c.planned_note ? ` · <span data-plannote>${esc(clipTxt(c.planned_note, 80))}</span>` : ''} · ${ltxt(clipTxt(cDesc(c.description), 80))}</span></a>`).join('')}</div>` : '';

  const pd = new Map(); for (const c of cs) if (c.status === 'wartet_teile' && c.parts_drive_at && !c.safety_lock && !byV.has(c.vehicle_id)) { const x = pd.get(c.vehicle_id); if (!x || String(c.parts_expected_date || '9') < String(x.parts_expected_date || '9')) pd.set(c.vehicle_id, c); }




  const pdRet = (c) => (c.planned_date || c.parts_expected_date || null);
  const pdL = [...pd.values()].sort((a, b) => String(pdRet(a) || '9').localeCompare(String(pdRet(b) || '9')) || plateCmp(a.plate, b.plate));
  const wkEnd = dispoWeekEnd(today0); const pdWeek = pdL.filter((c) => pdRet(c) && pdRet(c) <= wkEnd).length;


  const pdLate = pdL.filter((c) => c.parts_expected_date && c.parts_expected_date <= today0).length;
  const pdHtml = pdL.length ? `<h2 id="dpdrive">${esc(t('dispo_pdrive'))} <span class="chip">${pdL.length}</span>${pdWeek ? ` <span class="chip mittel" data-dpdrweek title="${esc(t('dispo_pdrive_week_t'))}">${esc(t('dispo_pdrive_week').replace('{n}', pdWeek))}</span>` : ''}${pdLate ? ` <span class="chip kritisch" data-dpdrlaten>${esc(t('dispo_pdrive_n').replace('{n}', pdLate))}</span>` : ''}</h2><p class="small muted">${esc(t('dispo_pdrive_hint'))}</p><div class="list">${pdL.map((c) => `<a class="row p-niedrig" href="#/cases/${esc(c.id)}" data-dpdr>${plate(c.plate)}<span class="title" style="white-space:normal">🚚 ${esc(t('pdr_short'))}</span><span class="sub wrap" data-dpdreta>${c.parts_expected_date ? partsEta(c, '') : esc(t('parts_eta_none'))}${c.parts_expected_date === today0 ? ` <span class="chip mittel" data-dpdrtoday>${esc(t('dispo_pdrive_today'))}</span>` : ''}${c.workshop_site ? ` · ${esc(wsName(c.workshop_site))}` : ''}${c.planned_date && c.planned_date >= today0 ? `<br><b data-dpdrplan>🔧 ${esc(t('dispo_pdrive_back').replace('{d}', () => fmtDue(c.planned_date)))}</b>${c.planned_note ? ` <span data-plannote>(${esc(clipTxt(c.planned_note, 80))})</span>` : ''}${c.parts_expected_date && c.planned_date < c.parts_expected_date ? ` <span class="chip mittel" data-planeta>${esc(t('plan_before_parts'))}</span>` : ''}` : c.planned_date ? `<br><b data-dpdrmissed>⚠ ${esc(t('dispo_pdrive_missed').replace('{d}', () => fmtD(c.planned_date)))}</b>` : `<br><span data-dpdrnoplan>${esc(t('dispo_pdrive_noplan'))}</span>`}${c.parts_expected_date && c.parts_expected_date <= today0 ? `<br><b data-dpdrlate>⚠ ${esc(t(c.parts_expected_date < today0 ? 'dispo_pdrive_late' : 'dispo_pdrive_due'))}</b>` : ''}</span></a>`).join('')}</div>` : '';
  if (!list.length) return (hasOther ? '' : `<section class="panel good"><b>${esc(t('dispo_all_ok'))}</b></section>`) + pdHtml + upHtml;

  return `<h2>${esc(t('dispo_not_plannable'))}</h2><div class="list">${list.map(({ r, c }) => `<a class="row ${r === 3 ? 'p-kritisch' : 'p-mittel'}" href="#/cases/${esc(c.id)}">${plate(c.plate, { locked: c.safety_lock })}<span class="title" style="white-space:normal">${esc(r === 3 ? t('locked') + ' – ' + t('do_not_drive') : t('st_' + c.status))}</span><span class="chip ${r === 3 ? 'kritisch' : 'mittel'}">${esc(t('since'))} ${fmtDT(r === 3 ? c.lock_since || c.created_at : c.status_since || c.updated_at)}</span>${dormant.has(c.vehicle_id) ? ` <span class="chip" data-dormant>${esc(t('eval_excluded'))}</span>` : ''}<span class="sub wrap" data-dnpsub>${esc(c.case_no)}${r === 3 && c.safety_lock_reason ? ` · <span data-lockreason>${esc(translateLockReason(S.lang, c.safety_lock_reason))}</span>` : ''}${coupled.has(c.vehicle_id) ? ` · <b>${esc(t(coupled.get(c.vehicle_id).kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(coupled.get(c.vehicle_id).plate)}</b>` : ''}${c.workshop_site ? ' · ' + esc(wsName(c.workshop_site)) : ''}${r !== 3 && c.reported_driveability === 'eingeschraenkt' ? ` · <b data-dupclim>${esc(t('dispo_upcoming_limited'))}</b>` : ''}${hoMissing(c).length ? ` · <b data-hodispo>${esc(hoMissing(c).join(', '))}</b>` : ''}${c.tow_service || c.vehicle_location ? ` · <span data-vloc>${c.tow_service ? `<b>${esc(t('vl_towed_chip'))}</b>` : ''}${c.tow_service && c.vehicle_location ? ': ' : ''}${esc(c.vehicle_location || '')}${vlAt(c)}</span>` : ''}${c.planned_date && c.status !== 'abschlusskontrolle' ? ' · ' + esc(t('planned_ws_short')) + ' ' + fmtD(c.planned_date) + (c.planned_note ? ` <span data-plannote>(${esc(clipTxt(c.planned_note, 80))})</span>` : '') : ''}${dispoWst(cs, c)}${partsEta(c)}${c.ready_expected_on && rdyOf(c) ? ` · <span data-dprdy>${rdyTxt(c.ready_expected_on)}</span>` : ''}${!dispoReturnKnown(c) ? ` · <b data-retunk>${esc(t('dispo_return_unknown'))}</b>` : ''}</span></a>`).join('')}</div>` + pdHtml + upHtml;
}

async function dispoWinter(vsite = '') {
  const r = await api('GET', '/api/tires/winter' + (vsite ? '?site=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || (!r.totals.nicht_erfuellt && !r.totals.unbekannt)) return '';
  const rows = r.noncompliant.map((x) => `<a class="row p-mittel" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}?sec=tires">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('winter_bad').replace('{p}', x.noncompliant.map(posL).join(', ')))}</span><span class="chip mittel">${esc(t('ws_nicht_erfuellt'))}</span>${x.missing.length || x.open_order || x.closed_order ? `<span class="sub wrap">${[x.missing.length && esc(t('winter_missing').replace('{p}', x.missing.map(posL).join(', '))), x.open_order && woApptTxt(x.open_order), x.closed_order && `⚠ ${esc(t('wo_closed_short').replace('{no}', x.closed_order.case_no))}`].filter(Boolean).join(' · ')}</span>` : ''}</a>`).join('');

  return `<section id="dwinter"><h2>${esc(t(r.totals.nicht_erfuellt ? 'dispo_winter' : 'dispo_winter_incomplete'))}</h2>${rows ? `<div class="list">${rows}</div>` : ''}${r.totals.unbekannt ? `<p class="small">${esc(t('dispo_winter_unknown').replace('{n}', r.totals.unbekannt))}</p>` : ''}<p class="small muted">${esc(t('dispo_winter_hint'))}</p></section>`;
}
function dispoSub(i) {
  const parts = i.type === 'case' ? [esc(i.case_no), esc(wsName(i.workshop_site))] : [];


  if (i.type === 'case' && i.reported_driveability === 'eingeschraenkt' && !i.safety_lock) parts.push(`<b data-dupclim>${esc(t('dispo_upcoming_limited'))}</b>`);

  if (i.type === 'case' && i.safety_lock) parts.push(`<b data-dplock>${esc(t('locked'))}</b>`);
  if (i.type === 'case' && i.status === 'werkstatt_freigegeben' && (i.tow_service || i.reported_driveability === 'nicht_fahrbereit')) parts.push(`<b data-dpdrv>${esc(t(i.tow_service ? 'vl_towed_chip' : 'cl_not_drivable'))}</b>`);
  if (i.type === 'case' && i.planned_note) parts.push(`<b data-plannote>📝 ${esc(clipTxt(i.planned_note, 120))}</b>`);
  if (planVehTag(i)) parts.push(planVehTag(i));
  if (i.other_dates && i.other_dates.length) parts.push(`<b>${esc(t('plan_other_dates'))}: ${i.other_dates.map(fmtD).join(', ')}</b>`);

  return parts.length ? `<span class="sub wrap">${parts.join(' · ')}</span>` : '';
}

async function dispoPlanned(vsite = '') {
  const r = await api('GET', '/api/workshop/plan?days=7' + (vsite ? '&vsite=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || !r.days.length) return '';
  const rows = r.days.flatMap((d) => d.items.map((i) => `<a class="row ${i.type === 'case' ? 'p-' + esc(i.priority) : ''}" href="${i.type === 'case' ? '#/cases/' + esc(i.id) : '#/vehicles/' + encodeURIComponent(i.vehicle_id)}">${plate(i.plate, { locked: !!i.safety_lock })}<span class="title" style="white-space:normal">${i.type === 'case' ? woTag(i) + esc(t('planned_ws_short')) + ' · ' + esc(t('st_' + i.status)) : esc(t('planned_inspection')) + ': ' + esc(mk(i.kind))}</span><span class="chip${d.date === r.today ? ' ok' : ''}" style="white-space:nowrap">${d.date === r.today ? esc(t('today')) : esc(fmtDue(d.date))}${d.date !== r.today && d.date === nextWorkdayAfter(r.today) ? ` <b data-pnwd style="white-space:normal">· ${esc(t('next_workday'))}</b>` : ''}</span>${dispoSub(i)}</a>`));
  return `<h2>${esc(t('dispo_planned'))}</h2><p class="small muted">${esc(t('dispo_planned_hint'))}</p><div class="list">${rows.join('')}</div><p><a href="${hj('#/plan')}">${esc(t('wplan'))}</a></p>`;
}

export { dispoHome };
