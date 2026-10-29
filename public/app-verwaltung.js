// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { $, $$, BERLIN_DT_FMT, CT_KINDS, DEFECT_RESULTS, MORE_MAX, S, STATES, TM_PROV, TST, afLink, agentFindingsCsv, api, auditActionLabel, auditDetailText, bDate, berlinLocalDT, bindTachoCancel, cDesc, checkLabel, claimChip, clipTxt, coverageGaps, ctChip, ctLines, ctRet, dataQualityCsv, decIn, defectItemsCsv, defectVehiclesCsv, download, downloadChecked, dqDetail, dur, emHoursText, envFn, esc, eur, eurIst, fMsg, fcLabel, federalHoliday, fileUrl, filterUsers, fmtD, fmtDT, fmtDue, fmtKm, fmtMm, fmtMonth, fmtNum, helpLink, hoMissing, holName, holidayGaps, huNote, inviteExpired, isMgr, isUnusedUser, isWeekendD, kmFcHtml, kmUnclearDateDue, langAttr, ltxt, mEv, mY, maintOrderHtml, markInvalid, mk, mkR, nDays, noVehiclesNote, noneP, nowMs, occurredFields, occurredValue, odoSrc, offDayWatch, ownerT, partsEta, planVehTag, plate, plateCmp, pnm, posL, prepareUpload, printHead, printStamp, provL, qrSvg, readCsvFile, reasonText, render, rwsDrop, searchKey, siteKeyUi, siteSelect, sortPref, sortUsers, stackTables, t, tachoHistList, telAbroad, telHref, tireAge, tlHash, tmAge, tmKmRej, tn, toast, translateNextAction, uiLoc, uid, usersCsv, vehiclesCached, vlAt, vsDef, woApptTxt, woTag, wsAll, wsLabel, wsName, wsOptions } from './app-main.js';

// Folgetag eines Kalenderdatums JJJJ-MM-TT (Stundensatz-Verlauf: „ab“ = Tag nach „bis“)
const bDateNext = (d) => { const [y, m, dd] = String(d).split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, dd + 1)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`; };
const bYm = (back = 0) => { const [y, m] = bDate().slice(0, 7).split('-').map(Number); return new Date(Date.UTC(y, m - 1 - back, 1)).toISOString().slice(0, 7); };
// Konto schon mit einer (oft ausgeschiedenen) Fahrerakte verknüpft: Akte nennen (Backlog 191)
const linkedMsg = (err) => { const ld = err && err.code === 'duplicate' && err.data && err.data.linked_driver; return ld ? `${err.message} ${t('dr_linked_to').replace('{name}', ld.display_name)}${ld.active ? '' : ' (' + t('inactive') + ')'}` : err.message; };
// Hinweistext zur Antwortfrist: Feiertag vor Wochenende (Frist bleibt der Tag laut Schreiben)
const dueOffHint = (iso) => (federalHoliday(iso) ? t('due_holiday_hint') : isWeekendD(iso) ? t('due_weekend_hint') : '');
function dueWeekendWatch() { for (const el of $$('input[name=response_due]')) { const h = document.createElement('p'); h.className = 'small muted'; h.dataset.dueWe = ''; h.textContent = t('due_weekend_hint'); el.after(h); const upd = () => { const x = dueOffHint(el.value); h.hidden = !x; if (x) h.textContent = x; }; el.addEventListener('input', upd); el.addEventListener('change', upd); upd(); } }
// Lange Import-Vorschauen zeigen nur die ersten Zeilen – dann ausdrücklich sagen, wie viele es insgesamt sind (nie still abschneiden)
const impMore = (total, shown) => (total > shown ? `<p class="small" role="note" data-impmore>${esc(t('imp_first_n').replace('{n}', fmtNum(shown)).replace('{m}', fmtNum(total)))}</p>` : '');
// Offline-Fahrzeugliste auffrischen: fehlt sie oder ist sie älter als 5 Minuten (bzw. force nach eigener Änderung) – 20.10.2026: vorher nur
// angelegt, wenn sie fehlte; nach Fahrzeugimport/-änderung/neuer Zuordnung blieb sie auf dem Gerät veraltet
// Datenauskunft mit gekappten Abschnitten: Hinweis wie bei der Datensicherung (21.10.2026: Vermerk stand nur in der Datei)
function dexTrunc(x) { const tr = x && x.meta && Array.isArray(x.meta.truncated) ? x.meta.truncated : []; if (tr.length) toast(t('dex_truncated').replace('{t}', tr.join(', ')), true); }
// Backlog 404 (26.10.2026, Blickwinkel „Hagelschaden an mehreren Lkw auf dem Hof“): gleicher Schaden an mehreren Fahrzeugen in einem Schritt
// (nur Inhaber/Fuhrparkleitung). Je Fahrzeug ein eigener Vorgang; Fotos danach im jeweiligen Vorgang ergänzen.
// App: bis 40 Fahrzeuge (ganzer Hof); Server nimmt höchstens 12 je Aufruf → gleichmäßige Blöcke (je ≥ 2) mit demselben Schlüssel
const BATCH_MAX = 40;
const BATCH_CHUNK = 12;
const tfill = (k, o) => Object.entries(o).reduce((a, [x, y]) => a.split(`{${x}}`).join(String(y)), t(k));
async function viewNewMulti() {
  if (!S.me || !['owner', 'fleet'].includes(S.me.role)) { render(`<h1>${esc(t('multi_title'))}</h1><p class="muted">${esc(t('no_permission_view'))}</p>`, 'new'); return; }
  const vs = await vehiclesCached();
  if (!vs.length) { render(`<h1>${esc(t('multi_title'))}</h1>${noVehiclesNote()}`, 'new'); return; }
  const ws = S.meta.workshops;
  render(`<h1>${esc(t('multi_title'))}</h1><p class="small muted">${esc(t('multi_intro'))}</p><form id="f" novalidate>
    <label for="vq">${esc(t('multi_choose'))}</label><input id="vq" placeholder="SZ-…" autocomplete="off" style="margin-bottom:8px">
    <p class="small" id="mcount" role="status" aria-live="polite"></p>
    <div class="vehpick multi" id="mpick" role="group" aria-label="${esc(t('multi_choose'))}">${vs.map((v) => `<label><input type="checkbox" name="mveh" value="${esc(v.id)}">${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="small muted">${v.kind === 'anhaenger' ? esc(t('vk_anhaenger')) + ' · ' : ''}${esc(v.site || '')}</span></label>`).join('')}</div>
    <label for="d">${esc(t('what_wrong'))}<span class="hint">${esc(t('multi_desc_hint'))}</span></label><textarea id="d" required minlength="5" maxlength="4000"></textarea>
    <label id="lbl_prio">${esc(t('urgency'))}</label><div class="choices" role="radiogroup" aria-labelledby="lbl_prio">${['niedrig', 'mittel', 'kritisch'].map((p, i) => `<label class="choice c-${p}"><input type="radio" name="prio" value="${p}"${i === 0 ? ' checked' : ''}><span><b>${esc(t('prio_' + p))}</b></span></label>`).join('')}</div>
    <label id="lbl_drv">${esc(t('driveable'))}</label><div class="choices" role="radiogroup" aria-labelledby="lbl_drv">${['fahrbereit', 'eingeschraenkt', 'nicht_fahrbereit', 'unbekannt'].map((p) => `<label class="choice${p === 'nicht_fahrbereit' ? ' c-kritisch' : ''}"><input type="radio" name="drv" value="${p}"${p === 'unbekannt' ? ' checked' : ''}><span><b>${esc(t('drv_' + p))}</b></span></label>`).join('')}</div>
    <label for="w">${esc(t('workshop'))}</label><select id="w"><option value="">–</option>${ws.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>
    <label for="l">${esc(t('location'))}</label><input id="l" maxlength="300">
    ${occurredFields(null)}
    <p class="small muted" data-multiphotos>${esc(t('multi_photos_hint'))}</p>
    <div class="actions"><button class="btn block" id="sb">${esc(t('multi_send'))}</button></div></form>`, 'new');
  const chosen = () => $$('input[name=mveh]:checked');
  const count = () => { const n = chosen().length; const el = $('#mcount'); if (el) { el.textContent = tfill('multi_selected', { n, max: BATCH_MAX }); el.classList.toggle('err', n > BATCH_MAX); } };
  $$('input[name=mveh]').forEach((x) => x.addEventListener('change', count)); count();
  $('#vq').onkeydown = (e) => { if (e.key === 'Enter') e.preventDefault(); };
  // Filter blendet nur aus – bereits gewählte Fahrzeuge bleiben gewählt und sichtbar (Hof-Liste wird oft in mehreren Suchen zusammengestellt)
  $('#vq').oninput = () => { const q = searchKey($('#vq').value); $$('#mpick label').forEach((l) => { const r = $('input', l); l.hidden = !!q && !(r && r.checked) && !searchKey(l.textContent).includes(q); }); };
  const key = uid();
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const sb = $('#sb'); const ids = chosen().map((x) => x.value);
    if (ids.length < 2) { toast(t('multi_need_two'), true); markInvalid($('#mpick'), t('multi_need_two')); $('#vq').focus(); return; }
    if (ids.length > BATCH_MAX) { toast(tfill('multi_too_many', { max: BATCH_MAX }), true); markInvalid($('#mpick'), tfill('multi_too_many', { max: BATCH_MAX })); return; }
    if ($('#d').value.trim().length < 5) { toast(t('desc_too_short'), true); markInvalid($('#d'), t('desc_too_short')); $('#d').focus(); return; }
    const occ = occurredValue($('#occd').value, $('#occt').value);
    if (occ === undefined) { toast(t('occ_need_date'), true); markInvalid($('#occd'), t('occ_need_date')); $('#occd').focus(); return; }
    if (occ && occ.slice(0, 10) > bDate()) { toast(t('occ_future'), true); markInvalid($('#occd'), t('occ_future')); $('#occd').focus(); return; }
    sb.disabled = true;
    const body = { vehicle_ids: ids, description: $('#d').value, priority: $('input[name=prio]:checked').value, driveability: $('input[name=drv]:checked').value,
      workshop_site: $('#w').value || null, location_note: $('#l').value || null, request_key: key, ...(occ ? { occurred_at: occ } : {}) };
    try {
      const k = Math.ceil(ids.length / BATCH_CHUNK); const size = Math.ceil(ids.length / k); const r = { count: 0, cases: [] };
      try {
        for (let i = 0; i < ids.length; i += size) { const x = await api('POST', '/api/cases/batch', { ...body, vehicle_ids: ids.slice(i, i + size) }); r.count += x.count; r.cases.push(...x.cases); }
      } catch (err) { if (r.count) err.message = `${err.offline ? t('multi_offline') : err.message} ${tfill('multi_partial', { n: r.count, m: ids.length })}`; err.offline = err.offline && !r.count; throw err; }
      if (!sb.isConnected) return;
      document.querySelectorAll('.toast.err').forEach((x) => x.remove()); // Hinweis eines früheren Versuchs (z. B. „mindestens zwei“) ist erledigt
      const pl = new Map(vs.map((v) => [v.id, v]));
      render(`<h1>${esc(t('multi_title'))}</h1><div class="panel" role="status" data-multidone><p><b>${esc(tn('multi_done', r.count))}</b></p><p class="small muted">${esc(t('multi_photos_after'))}</p>
        <ul class="list">${r.cases.map((c) => { const v = pl.get(c.vehicle_id); return `<li><a href="#/cases/${esc(c.id)}" data-mcase="${esc(c.case_no)}">${esc(c.case_no)}</a> · ${v ? plate(v.plate, { locked: !!c.safety_lock }) : esc(c.vehicle_id)}${c.duplicate ? ` <span class="small muted">${esc(t('multi_dup'))}</span>` : ''}</li>`; }).join('')}</ul>
        <p><a class="btn" href="#/cases">${esc(t('nav_cases'))}</a></p></div>`, 'new');
    } catch (err) {
      sb.disabled = false;
      toast(err.offline ? t('multi_offline') : err.message, true);
    }
  };
}
async function viewClaims() {
  let timer = null;
  const f = S.clFilter || 'offen';
  const cs = vsDef('claimSite') || ''; const csq = cs ? '&site=' + encodeURIComponent(cs) : '';
  const q = S.clQ || ''; const qq0 = q ? '&q=' + encodeURIComponent(q) : ''; // Suche nach Kennzeichen/Nummern (Backlog 219)
  // Zeitraum (Meldedatum) und Versicherer (Backlog 274, Schadenaufstellung für den Versicherer)
  const pq = `${S.clFrom ? '&from=' + S.clFrom : ''}${S.clTo ? '&to=' + S.clTo : ''}${S.clIns ? '&insurer=' + encodeURIComponent(S.clIns) : ''}`;
  const qq = qq0 + pq;
  let r;
  // ungültiger Zeitraum (400): Filter zurücksetzen und einmal neu laden; ohne gesetzte Filter normale Fehlerbehandlung (keine Schleife)
  try { r = await api('GET', `/api/claims?filter=${f}${csq}${qq}`); } catch (err) { if (!pq) throw err; S.clFrom = S.clTo = S.clIns = null; toast(err.message, true); return viewClaims(); }
  // Backlog 527/531: „Nachfassen fällig“ (nur mit eingestellter Frist), „reguliert ohne eingetragene Erstattung“ und „zurückgezogen“ als eigene Reiter
  const tabs = ['offen', ...(r.followup_days || f === 'nachfassen' ? ['nachfassen'] : []), 'gutachten', 'alle', 'reguliert', ...(r.counts.ohne_erstattung || f === 'ohne_erstattung' ? ['ohne_erstattung'] : []), 'abgelehnt', 'zurueckgezogen'];
  const fName = (x) => (x === 'offen' ? t('claim_f_open') : x === 'gutachten' ? t('ca_pending') : x === 'alle' ? t('filter_all') : x === 'nachfassen' ? t('todo_claims') : x === 'ohne_erstattung' ? t('claim_f_noreimb') : t('cls_' + x));
  const fLabel = fName(f);
  let html = `<h1>${esc(t('claims'))}</h1>${printHead([`${t('print_filter')}: ${fLabel}`, r.site ? `${t('kpi_vsite')}: ${r.site === 'ohne' ? t('cs_nosite') : r.site}` : '', r.from || r.to ? `${t('claim_period')}: ${r.from ? fmtD(r.from) : '…'} – ${r.to ? fmtD(r.to) : '…'}` : '', r.insurer ? `${t('claim_insurer')}: ${r.insurer}` : '', q ? t('claim_print_search').replace('{q}', q) : '', t('print_count').replace('{n}', r.claims.length)])}${helpLink('claims')}<p class="small muted">${esc(t('claims_hint'))}</p>
    <div class="actions noprint" style="flex-wrap:wrap">${tabs.map((x) => `<button type="button" class="btn ${f === x ? '' : 'secondary'}" data-clf="${x}">${esc(fName(x))} (${r.counts[x] || 0})</button>`).join('')}</div>
    ${(r.site_options || []).length > 1 || r.site ? `<div class="actions noprint" style="margin-top:0"><div>${siteSelect('clsite', '', r.site_options, r.site, t('kpi_vsite'), t('filter_all'))}</div></div>` : ''}
    <div class="actions noprint" style="margin-top:0;align-items:end;flex-wrap:wrap" id="clper"><div><label for="clfrom">${esc(t('claim_from'))}</label><input type="date" id="clfrom" value="${esc(r.from || '')}"></div><div><label for="clto">${esc(t('claim_to'))}</label><input type="date" id="clto" value="${esc(r.to || '')}"></div>${(r.insurer_options || []).length > 1 || r.insurer ? `<div><label for="clins">${esc(t('claim_insurer'))}</label><select id="clins"><option value="">${esc(t('filter_all'))}</option>${[...new Set([...(r.insurer_options || []), ...(r.insurer ? [r.insurer] : [])])].map((x) => `<option value="${esc(x)}"${x === r.insurer ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></div>` : ''}</div>
    <input id="clq" class="noprint" type="search" maxlength="60" value="${esc(q)}" placeholder="${esc(t('claim_search'))}" aria-label="${esc(t('claim_search'))}" autocomplete="off" style="margin-bottom:12px">
    ${q ? `<p class="small muted" id="clqinfo">${esc(t('claim_search_info').replace('{q}', q).replace('{n}', r.claims.length))}</p>` : ''}
    ${r.reimbursed_sum_net !== null || r.reimbursed_sum_excluded_net != null ? `<section class="panel"><dl class="kv">${r.reimbursed_sum_net !== null ? `<dt>${esc(t('claim_sum'))}</dt><dd><b>${eur(r.reimbursed_sum_net)}</b></dd>` : ''}${r.reimbursed_sum_excluded_net != null ? `<dt>${esc(t('claim_sum_excluded'))}</dt><dd>${eur(r.reimbursed_sum_excluded_net)}<div class="small muted">${esc(t('claim_sum_excluded_hint'))}</div></dd>` : ''}</dl></section>` : ''}
    <div class="list">${r.claims.length ? r.claims.map((c) => `<a class="row${c.followup_due ? ' p-mittel' : ''}" href="#/cases/${encodeURIComponent(c.case_id)}">${plate(c.plate)}<span class="title">${c.eval_excluded ? `<span class="chip">${esc(t('eval_excluded'))}</span> ` : ''}${esc(c.insurer)}${c.claim_no ? ' · ' + esc(c.claim_no) : ''}${c.opponent ? ` <span class="chip" title="${esc(t('co_title'))}">${esc(t('co_chip'))}</span>` : ''}${c.police ? ` <span class="chip" title="${esc(t('cp_title'))}">${esc(t('cp_chip'))}</span>` : ''}</span>${claimChip(c.status)}<span class="sub" style="white-space:normal">${c.followup_due ? `<b>${esc(t('todo_claims'))}</b> · ` : ''}${esc(c.case_no)}${c.case_location ? ` · <span data-clloc${langAttr(c.case_location)}>${esc(t('location_shown'))}: ${esc(clipTxt(c.case_location, 60))}</span>` : ''} · ${esc(t('claim_reported'))} ${fmtD(c.reported_on)}${c.days_open !== null ? ` · ${esc(tn('claim_days_open', c.days_open))}` : ''}${c.deductible_net !== null ? ` · ${esc(t('claim_deductible_short'))} ${eur(c.deductible_net)}` : ''}${c.reimbursed_net !== null ? ` · ${esc(t('claim_reimbursed_short'))} ${eur(c.reimbursed_net)}` : ''}${c.case_cost_net !== null ? ` · ${esc(t('claim_case_cost'))} ${eur(c.case_cost_net)}` : c.cost_incomplete ? ` · ${esc(t('claim_case_cost'))} – <span class="chip mittel">${esc(t('incomplete'))}</span>` : ''}${c.balance_net !== null ? ` · <b>${esc(t('claim_balance'))} ${eur(c.balance_net)}</b>` : ''}${c.appraisal_pending ? ` · <span class="chip mittel">${esc(t('ca_pending'))}</span>${c.appraisal_on ? ` ${esc(t('ca_on'))} ${fmtD(c.appraisal_on)}` : ''}` : c.appraisal_net !== null && c.appraisal_net !== undefined ? ` · ${esc(t('ca_net'))} ${eur(c.appraisal_net)}` : ''}</span></a>`).join('') : `<p class="muted">${esc(t('claims_none'))}</p>`}</div>
    ${r.sums && r.sums.total && r.sums.total.n ? `<section class="panel" id="clsums"><h2 style="margin-top:0">${esc(t('claim_sums'))}</h2><div class="scroll"><table class="stack"><thead><tr><th>${esc(t('claim_year'))}</th><th>${esc(t('claim_count'))}</th><th>${esc(t('claim_ded_short'))}</th><th>${esc(t('ca_net_short'))}</th><th>${esc(t('claim_case_cost'))}</th><th>${esc(t('claim_reimbursed_short'))}</th></tr></thead><tbody>${[...r.sums.by_year, { year: t('total'), ...r.sums.total }].map((y) => `<tr><td data-l="${esc(t('claim_year'))}">${esc(y.year)}</td><td data-l="${esc(t('claim_count'))}">${y.n}</td><td data-l="${esc(t('claim_ded_short'))}">${y.deductible_n ? eur(y.deductible_net) : '–'}</td><td data-l="${esc(t('ca_net_short'))}">${y.appraisal_n ? eur(y.appraisal_net) : '–'}</td><td data-l="${esc(t('claim_case_cost'))}">${y.cost_n ? eur(y.case_cost_net) : '–'}${y.cost_incomplete ? ` <span class="small muted">(${esc(tn('claim_cost_incompl', y.cost_incomplete))})</span>` : ''}</td><td data-l="${esc(t('claim_reimbursed_short'))}">${y.reimbursed_n ? eur(y.reimbursed_net) : '–'}</td></tr>`).join('')}</tbody></table></div><p class="small muted">${esc(t('claim_sums_hint'))}</p></section>` : ''}
    <div class="actions noprint" style="flex-wrap:wrap;align-items:center"><button type="button" class="btn secondary" id="clcsv">${esc(t('export_csv'))}</button><label class="check" style="margin:0"><input type="checkbox" id="cl3p"> ${esc(t('claim_third_party'))}</label><button type="button" class="btn secondary" id="clprt">${esc(t('print'))}</button></div>`;
  render(html, 'more');
  $$('[data-clf]').forEach((b) => (b.onclick = () => { S.clFilter = b.dataset.clf; viewClaims(); }));
  const clq = $('#clq');
  clq.oninput = () => { clearTimeout(timer); timer = setTimeout(() => { const v = clq.value.trim(); if (v === (S.clQ || '')) return; S.clQ = v; viewClaims().then(() => { const n = $('#clq'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }); }, 300); };
  const cls = $('#clsite'); if (cls) cls.onchange = () => { S.claimSite = cls.value; viewClaims(); };
  $('#clfrom').onchange = () => { S.clFrom = $('#clfrom').value || null; viewClaims(); };
  $('#clto').onchange = () => { S.clTo = $('#clto').value || null; viewClaims(); };
  const cli = $('#clins'); if (cli) cli.onchange = () => { S.clIns = cli.value || null; viewClaims(); };
  $('#clprt').onclick = () => window.print();
  $('#clcsv').onclick = async () => { try { download(await api('GET', `/api/claims?format=csv&filter=${f}${csq}${qq}${$('#cl3p').checked ? '&third_party=1' : ''}`), `fuhrpark-versicherungsfaelle_${envFn()}_${r.today}${r.site ? '_' + fnPart(r.site) : ''}${r.from || r.to ? '_' + (r.from || '') + '-' + (r.to || '') : ''}${q ? '_suche-' + fnPart(q) : ''}.csv`); } catch (err) { toast(err.message, true); } };
}
// Backlog 409: letzter Tag des Quartals (0 = laufendes, 1 = nächstes) zum Berliner Tag `ymd` (JJJJ-MM-TT)
function quarterEnd(ymd, off = 0) {
  const y = Number(ymd.slice(0, 4)); const m = Number(ymd.slice(5, 7));
  const em = (Math.floor((m - 1) / 3) + off + 1) * 3; // Endmonat ab Jahresbeginn, kann > 12 sein
  const yy = y + Math.floor((em - 1) / 12); const mm = ((em - 1) % 12) + 1;
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate(); return `${yy}-${String(mm).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}
// Backlog 624 (Blickwinkel „Versichererwechsel zum 01.01.“): mehrere laufende Verträge der aktuellen Ansicht beenden oder ein Vertragsende eintragen
function ctBatch(list) {
  // keine laufenden Verträge mehr in der Ansicht (z. B. gerade alle beendet): Ergebnis trotzdem zeigen
  if (!list.length) { const res = S.ctbRes || ''; S.ctbRes = ''; S.ctbOpen = false; return { html: res ? `<div class="noprint" id="ctbatch">${res}</div>` : '', bind: () => {} }; }
  const res = S.ctbRes || ''; const open = !!S.ctbOpen; S.ctbRes = ''; S.ctbOpen = false;
  const html = `<details class="panel noprint" id="ctbatch"${open ? ' open' : ''}><summary>${esc(t('ctb_title'))}</summary><p class="small muted">${esc(t('ctb_hint'))}</p>${res}
    <form id="ctbf"><fieldset style="border:0;padding:0;margin:0"><legend class="small"><b>${esc(t('ctb_action'))}</b></legend>
      <label class="check"><input type="radio" name="mode" value="end_date" checked> ${esc(t('ctb_mode_end_date'))}</label><label class="check"><input type="radio" name="mode" value="end"> ${esc(t('ctb_mode_end'))}</label></fieldset>
      <div data-ctbm="end_date"><label for="ctbdate">${esc(t('ct_end'))}</label><input type="date" id="ctbdate" name="end_date" style="max-width:200px"><label class="check small"><input type="checkbox" name="replace"> ${esc(t('ctb_replace'))}</label></div>
      <div data-ctbm="end" hidden><label for="ctbon">${esc(t('ct_ended_on'))}</label><input type="date" id="ctbon" name="ended_on" max="${bDate()}" value="${bDate()}" style="max-width:200px"><label for="ctbnote">${esc(t('ct_end_reason'))}</label><input id="ctbnote" name="end_note" maxlength="300" placeholder="${esc(t('ctb_note_ph'))}"></div>
      <div class="actions" style="margin:8px 0"><button type="button" class="btn secondary" id="ctball">${esc(t('mb_all'))}</button><button type="button" class="btn secondary" id="ctbnone">${esc(t('mb_none'))}</button> <span class="small muted" id="ctbcount" aria-live="polite"></span></div>
      <div class="list" style="max-height:340px;overflow:auto">${list.slice(0, 200).map((c) => `<label class="row" style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:8px 10px;margin:0"><input type="checkbox" name="ctbid" value="${esc(c.id)}"> ${plate(c.plate)}<span class="title" style="white-space:normal;flex:1 1 150px">${esc(t('ck_' + c.kind))} · ${esc(c.partner)}${c.contract_no ? ' · ' + esc(c.contract_no) : ''} <span class="small muted">(${c.start_date ? fmtD(c.start_date) : '…'}–${c.end_date ? fmtD(c.end_date) : '…'})</span></span></label>`).join('')}</div>${impMore(list.length, 200)}
      <div class="actions"><button class="btn" id="ctbgo">${esc(t('ctb_submit'))}</button></div></form></details>`;
  return { html, bind };
  function bind() {
  const fm = $('#ctbf'); if (!fm) return;
  const boxes = () => $$('#ctbf input[name=ctbid]');
  const cnt = () => { $('#ctbcount').textContent = tn('mb_selected', boxes().filter((x) => x.checked).length); };
  boxes().forEach((x) => (x.onchange = cnt)); cnt();
  $('#ctball').onclick = () => { boxes().forEach((x) => (x.checked = true)); cnt(); };
  $('#ctbnone').onclick = () => { boxes().forEach((x) => (x.checked = false)); cnt(); };
  const sync = () => { const m = fm.mode.value; $$('#ctbf [data-ctbm]').forEach((d) => { d.hidden = d.dataset.ctbm !== m; }); fm.end_date.required = m === 'end_date'; fm.end_note.required = m === 'end'; };
  $$('#ctbf input[name=mode]').forEach((x) => (x.onchange = sync)); sync();
  fm.onsubmit = async (e) => {
    e.preventDefault();
    const ids = boxes().filter((x) => x.checked).map((x) => x.value);
    if (!ids.length) { toast(t('mb_pick'), true); return; }
    const m = fm.mode.value;
    if (m === 'end' && !confirm(t('ctb_confirm_end').replace('{n}', ids.length))) return;
    try {
      const r = await api('POST', '/api/contracts/batch', m === 'end' ? { mode: m, ids, ended_on: fm.ended_on.value || null, end_note: fm.end_note.value } : { mode: m, ids, end_date: fm.end_date.value, replace: fm.replace.checked });
      const skip = (r.skipped || []).map((x) => `<li>${x.plate ? esc(x.plate) + ' · ' : ''}${x.kind ? esc(t('ck_' + x.kind)) + ' · ' : ''}${x.partner ? esc(x.partner) + ': ' : ''}${esc(t('ctb_sk_' + x.code))}</li>`).join('');
      S.ctbRes = `<div class="panel ${skip ? 'warn' : 'ok'}" style="margin-top:8px" data-ctbres><b>${esc(t(m === 'end' ? 'ctb_done_end' : 'ctb_done_date').replace('{n}', r.done.length).replace('{d}', fmtD(m === 'end' ? r.ended_on : r.end_date)))}</b>${skip ? `<br><span class="small">${esc(t('ctb_skipped'))}:</span><ul class="small" style="margin:4px 0 0 18px">${skip}</ul>` : ''}</div>`;
      S.ctbOpen = true; toast('✓');
      await viewContracts();
    } catch (err) { toast(err.message, true); }
  };
  }
}
async function viewContracts() {
  const f = S.ctFilter || 'aktiv'; const k = S.ctKind || '';
  const cts = vsDef('ctSite') || ''; const asof = S.ctAsOf || '';
  // Backlog 409: „Ende/Kündigung bis“ (laufende Verträge mit Vertragsende oder Kündigungsfrist bis zum Datum) – nicht zusammen mit dem Stichtag
  const eby = !asof && f !== 'beendet' ? S.ctEndsBy || '' : '';
  // Stichtag (Backlog 196): km/Status zum Ende des Berliner Tags – nur Ablesungen bis dahin; gilt für Liste, Ausdruck und CSV
  const ctp = S.ctPartner || ''; // Backlog 625: Vertragspartner
  const sq = (cts ? '&site=' + encodeURIComponent(cts) : '') + (asof ? '&as_of=' + asof : '') + (eby ? '&ends_by=' + eby : '') + (ctp ? '&partner=' + encodeURIComponent(ctp) : '');
  const r = await api('GET', `/api/contracts?filter=${f}${k ? '&kind=' + k : ''}${sq}`);
  const ctb = ctBatch(r.contracts.filter((c) => !c.ended_on)); // Backlog 624
  render(`<h1>${esc(t('ct_title'))}</h1>${helpLink('contracts')}<p class="small muted">${esc(t('ct_hint'))}</p>
    <p class="print-only small">${printStamp()} · ${esc(t('print_filter'))}: ${esc(t('cf_' + f))}${k ? ' · ' + esc(t('ck_' + k)) : ''}${r.partner ? ' · ' + esc(r.partner) : ''}${r.site ? ' · ' + esc(r.site === 'ohne' ? t('cs_nosite') : r.site) : ''}${r.as_of ? ' · ' + esc(t('ct_asof')) + ': ' + fmtD(r.as_of) : ''}${r.ends_by ? ' · ' + esc(t('ct_endsby')) + ': ' + fmtD(r.ends_by) : ''} · ${esc(t('print_count').replace('{n}', r.contracts.length))} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="actions noprint" style="flex-wrap:wrap">${['aktiv', 'aktion', 'beendet', 'alle'].map((x) => `<button type="button" class="btn ${f === x ? '' : 'secondary'}" data-cf="${x}">${esc(t('cf_' + x))} (${r.counts[x]})</button>`).join('')}</div>
    <div class="actions noprint" style="margin-top:0"><select id="ctk" aria-label="${esc(t('ct_kind'))}" style="max-width:260px"><option value="">${esc(t('ct_all_kinds'))}</option>${CT_KINDS.map((x) => `<option value="${x}"${k === x ? ' selected' : ''}>${esc(t('ck_' + x))}</option>`).join('')}</select>
      <label class="small" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0"><span style="white-space:nowrap">${esc(t('ct_asof'))}</span> <input type="date" id="ctasof" value="${esc(asof)}" max="${bDate()}" style="max-width:170px"></label>${asof ? `<button type="button" class="btn secondary" id="ctasofx">${esc(t('ct_asof_clear'))}</button>` : `<button type="button" class="btn secondary small" id="ctasofprev">${esc(t('ct_asof_prevmonth'))}</button>`}</div>
    ${!asof && f !== 'beendet' ? `<div class="actions noprint" style="margin-top:0;flex-wrap:wrap"><label class="small" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0"><span style="white-space:nowrap">${esc(t('ct_endsby'))}</span> <input type="date" id="ctendsby" value="${esc(eby)}" style="max-width:170px"></label><button type="button" class="btn secondary small" data-ctq="0">${esc(t('ct_endsby_q0'))}</button><button type="button" class="btn secondary small" data-ctq="1">${esc(t('ct_endsby_q1'))}</button><button type="button" class="btn secondary small" id="ctyear">${esc(t('mdueby_year'))}</button>${eby ? `<button type="button" class="btn secondary small" id="ctendsbyx">${esc(t('ct_endsby_clear'))}</button>` : ''}</div>` : ''}
    ${r.ends_by ? `<p class="small" data-ct-endsby><span class="chip mittel" style="white-space:normal">${esc(t('ct_endsby_note').replace('{d}', fmtD(r.ends_by)))}</span></p>` : ''}
    ${r.as_of ? `<p class="small" data-ct-asof><span class="chip mittel" style="white-space:normal">${esc(t('ct_asof_note').replace('{d}', fmtD(r.as_of)))}</span></p>` : ''}
    ${(r.site_options || []).length > 1 || r.site ? `<div class="actions noprint" style="margin-top:0"><div>${siteSelect('ctsite', '', r.site_options, r.site, t('kpi_vsite'), t('filter_all'))}</div></div>` : ''}
    ${(r.partner_options || []).length > 1 || r.partner ? `<div class="actions noprint" style="margin-top:0"><select id="ctpartner" aria-label="${esc(t('ct_partner'))}" style="max-width:320px"><option value="">${esc(t('ct_all_partners'))}</option>${(r.partner_options || []).map((x) => `<option value="${esc(x.partner)}"${r.partner && x.partner.toLocaleLowerCase('de') === r.partner.toLocaleLowerCase('de') ? ' selected' : ''}>${esc(x.partner)} (${x.n})</option>`).join('')}</select></div>` : ''}
    ${f !== 'beendet' ? `<p>${esc(t('ct_rate_sum'))}: <b>${eur(r.monthly_rate_sum_net)}</b>${r.unrated ? ` <span class="small muted">· ${r.unrated} ${esc(t('ct_unrated'))}</span>` : ''}${r.contracts.some((c) => c.vehicle_eval_excluded) ? ` <span class="small muted">· ${esc(t('ct_excluded_hint'))}</span>` : ''}</p>` : ''}
    <div class="list">${r.contracts.length ? r.contracts.map((c) => `<a class="row ${c.status.overall === 'handeln' ? 'p-kritisch' : c.status.overall === 'hinweis' ? 'p-mittel' : ''}" href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${plate(c.plate)}<span class="title">${c.vehicle_eval_excluded ? `<span class="chip">${esc(t('eval_excluded'))}</span> ` : ''}${esc(t('ck_' + c.kind))} · ${esc(c.partner)}</span>${ctChip(c.status)}<span class="sub" style="white-space:normal">${ctLines(c, { noEvidence: true }).join(' · ').replace(/<br>/g, ' · ')}${c.file_id ? ` · 📎 ${esc(t('ct_doc_linked'))}` : ''}${c.successor ? ` · <span data-ctsucc>${esc(t('ct_successor').replace('{p}', c.successor.partner + (c.successor.contract_no ? ' · ' + c.successor.contract_no : '')).replace('{d}', fmtD(c.successor.start_date)))}</span>` : ''}</span>${ctRet(c.return_check)}</a>`).join('') : `<p class="muted">${esc(t('ct_none'))}</p>`}</div>
    <div class="actions noprint"><button type="button" class="btn secondary" id="ctcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="ctics" title="${esc(t('ct_ics_hint'))}">${esc(t('export_ics'))}</button><button type="button" class="btn secondary" id="ctprt">${esc(t('print'))}</button></div>
    ${ctb.html}
    <details class="panel noprint"><summary>${esc(t('ct_import'))}</summary><p class="small muted">${esc(t('ct_import_hint'))}</p>
      <label for="ctsrc">${esc(t('ct_import_src'))}</label><input id="ctsrc" maxlength="300"><input type="file" id="ctimp" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('ct_import'))}" style="margin-top:8px"><div id="ctimpr"></div></details>`, 'more');
  $$('[data-cf]').forEach((b) => (b.onclick = () => { S.ctFilter = b.dataset.cf; viewContracts(); }));
  ctb.bind();
  $('#ctk').onchange = () => { S.ctKind = $('#ctk').value; viewContracts(); };
  const ao = $('#ctasof'); if (ao) ao.onchange = () => { const v = ao.value; if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return; S.ctAsOf = v && v <= bDate() ? v : ''; /* Backlog 511: heute als Stichtag zulässig (Monatsletzter am Monatsende) */ if (S.ctAsOf) S.ctEndsBy = ''; viewContracts(); };
  const aox = $('#ctasofx'); if (aox) aox.onclick = () => { S.ctAsOf = ''; viewContracts(); };
  // Backlog 601: Monatsmeldung Leasing – Stichtag „Ende Vormonat“ mit einem Tipp (Berliner Datum)
  const aop = $('#ctasofprev'); if (aop) aop.onclick = () => { S.ctAsOf = bDate(-Number(bDate().slice(8, 10))); S.ctEndsBy = ''; viewContracts(); }; // heute minus Tag des Monats = Monatsletzter davor
  const ebEl = $('#ctendsby'); if (ebEl) ebEl.onchange = () => { const v = ebEl.value; if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return; S.ctEndsBy = v; viewContracts(); };
  $$('[data-ctq]').forEach((b) => (b.onclick = () => { S.ctEndsBy = quarterEnd(bDate(), Number(b.dataset.ctq)); viewContracts(); }));
  { const cy = $('#ctyear'); if (cy) cy.onclick = () => { S.ctEndsBy = `${Number(bDate().slice(0, 4)) + 1}-12-31`; viewContracts(); }; } // Backlog 613: Jahresplanung wie Prüftermine (545)
  const ebx = $('#ctendsbyx'); if (ebx) ebx.onclick = () => { S.ctEndsBy = ''; viewContracts(); };
  const ctsEl = $('#ctsite'); if (ctsEl) ctsEl.onchange = () => { S.ctSite = ctsEl.value; viewContracts(); };
  const ctpEl = $('#ctpartner'); if (ctpEl) ctpEl.onchange = () => { S.ctPartner = ctpEl.value; viewContracts(); };
  $('#ctprt').onclick = () => window.print();
  const inp = $('#ctimp');
  inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    const text = await readCsvFile(file); const src = $('#ctsrc').value.trim(); const q = src ? `&source=${encodeURIComponent(src)}` : '';
    const show = (x, applied) => {
      const box = $('#ctimpr'); if (!box) return;
      box.innerHTML = `<p><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(t('ia_neu'))}: ${x.counts.neu} · ${esc(t('ct_known'))}: ${x.counts.vorhanden} · ${esc(t('skipped'))}: ${x.counts.uebersprungen}</p>
        ${x.rows.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('line'))}</th><th>${esc(t('vehicle'))}</th><th>${esc(t('ct_kind'))}</th><th>${esc(t('ct_partner'))}</th><th>${esc(t('ct_end'))}</th><th></th></tr></thead><tbody>${x.rows.map((r) => `<tr><td>${r.line}</td><td style="white-space:nowrap">${esc(r.plate)}</td><td>${esc(t('ck_' + r.kind))}</td><td>${esc(r.partner)}${r.contract_no ? ' · ' + esc(r.contract_no) : ''}</td><td>${fmtD(r.end_date)}</td><td><span class="chip ${r.status === 'neu' ? 'ok' : ''}">${esc(r.status === 'neu' ? t('ia_neu') : t('ct_known'))}</span>${r.parallel ? `<div class="small" data-ctpar>⚠️ ${esc(t('ct_parallel').replace('{p}', r.parallel.partner + (r.parallel.contract_no ? ' · ' + r.parallel.contract_no : '')).replace('{e}', r.parallel.end_date ? fmtD(r.parallel.end_date) : t('ct_no_end')))}</div>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}${x.counts.parallel ? `<p class="small" data-ctparhint>⚠️ ${esc(tn('ct_parallel_n', x.counts.parallel))}</p>` : ''}
        ${x.skipped.length ? `<details ${applied ? '' : 'open'}><summary>${esc(t('skipped'))} (${x.skipped.length})</summary><ul class="small">${x.skipped.map((y) => `<li>${esc(t('line'))} ${y.line}: ${esc(reasonText(y.reason))}</li>`).join('')}</ul></details>` : ''}
        ${!applied && x.counts.neu ? `<div class="actions"><button type="button" class="btn" id="ctapply">${esc(t('apply_import'))}</button></div>` : ''}`;
      stackTables(box);
      const ap = $('#ctapply');
      if (ap) ap.onclick = async () => { ap.disabled = true; try { const done = await api('POST', '/api/contracts/import' + (q ? '?' + q.slice(1) : ''), text, { headers: { 'content-type': 'text/csv' } }); toast('✓'); await viewContracts(); const d = $('#ctimpr'); if (d) { d.closest('details').open = true; show(done, true); } } catch (err) { ap.disabled = false; toast(err.message, true); } };
    };
    try { show(await api('POST', '/api/contracts/import?dry_run=1' + q, text, { headers: { 'content-type': 'text/csv' } }), false); } catch (err) { toast(err.message, true); }
  };
  $('#ctics').onclick = async () => { try { download(await api('GET', `/api/contracts?format=ics&filter=aktiv${k ? '&kind=' + k : ''}${sq.replace(/&as_of=[^&]*/, '')}`), `fuhrpark-vertraege_${r.today}${r.site ? '_' + fnPart(r.site) : ''}.ics`); } catch (err) { toast(err.message, true); } };
  $('#ctcsv').onclick = async () => { try { download(await api('GET', `/api/contracts?format=csv&filter=${f}${k ? '&kind=' + k : ''}${sq}`), `fuhrpark-vertraege_${r.as_of ? 'stichtag-' + r.as_of : r.today}${r.ends_by ? '_bis-' + r.ends_by : ''}${r.site ? '_' + fnPart(r.site) : ''}${r.partner ? '_' + fnPart(r.partner) : ''}.csv`); } catch (err) { toast(err.message, true); } };
}
async function viewFines() {
  const fsite = S.me.role === 'driver' ? '' : (vsDef('fineSite') || '');
  const fq = fsite ? `site=${encodeURIComponent(fsite)}` : '';
  const fr = await api('GET', '/api/fines' + (fq ? '?' + fq : ''));
  const list = fr.fines;
  const mgr = isMgr();
  const today = bDate();
  const own = S.me.role === 'driver'; // Lesezugriff sieht alle Schreiben – Überschrift/Hilfe wie Leitung (19.10.2026: „Meine …“)
  let html = `<h1>${esc(own ? t('my_fines') : t('fines'))}</h1>${helpLink(own ? 'myfines' : 'fines')}`;
  const fsiteSel = (fr.site_options || []).length > 1 || fr.site ? `<div class="panel noprint" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end"><div>${siteSelect('fsite', '', fr.site_options, fr.site, t('kpi_vsite'), t('filter_all'))}</div></div>` : '';
  if (mgr) html += `<details class="panel"><summary>${esc(t('new_fine'))}</summary><form id="nf">
    <label>${esc(t('kind'))}</label><select name="kind">${S.meta.fine_kinds.map((k) => `<option value="${k}">${esc(t('fk_' + k))}</option>`).join('')}</select>
    <label>${esc(t('authority'))}</label><input name="authority" required maxlength="200"><label>${esc(t('reference'))}</label><input name="reference" maxlength="80">
    <label>${esc(t('offense'))}</label><select name="offense_type">${S.meta.fine_offenses.map((k) => `<option value="${k}">${esc(t('of_' + k))}</option>`).join('')}</select>
    <label>${esc(t('offense_at'))}</label><input type="datetime-local" name="offense_at" required aria-describedby="nf-tz"><p class="small muted" id="nf-tz" style="margin:2px 0 8px">${esc(t('offense_at_tz'))}</p><label>${esc(t('offense_place'))}</label><input name="location" maxlength="200">
    <label>${esc(t('plate_letter'))}</label><input name="plate_in_letter" required maxlength="20" placeholder="SZ-YC 5513"><label>${esc(t('amount'))}</label><input name="amount_eur" inputmode="decimal">
    <label for="nfban">${esc(t('fine_ban'))}</label>${fineBanSel('nfban', null)}
    <label>${esc(t('response_due'))}</label><input type="date" name="response_due"><label>${esc(t('note'))}</label><textarea name="note" maxlength="2000"></textarea>
    <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
  html += fsiteSel;
  // Backlog 565: Auswahl „Antwortfrist fehlt“ (offene Schreiben ohne erfasste Frist, wie Chip/Agent-Hinweis FINE_NO_DUE)
  const noDue = (f) => !f.response_due && ['eingegangen', 'fahrer_ermittelt', 'fahrer_informiert'].includes(f.status);
  const noDueN = own ? 0 : list.filter(noDue).length; if (!noDueN) S.fineNoDue = false;
  const shownF = S.fineNoDue ? list.filter(noDue) : list;
  if (noDueN) html += `<p class="noprint"><label class="small" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="fnodue"${S.fineNoDue ? ' checked' : ''}> ${esc(t('fine_no_due'))} (${noDueN})</label></p>`;
  html += printHead([fr.site ? `${t('kpi_vsite')}: ${fr.site === 'ohne' ? t('cs_nosite') : fr.site}` : '', S.fineNoDue ? `${t('print_filter')}: ${t('fine_no_due')}` : '', t('print_count').replace('{n}', shownF.length)]);
  if (fr.truncated) html += `<p class="small muted">${esc(t('fines_truncated'))}</p>`;
  html += `<div class="list">${shownF.map((f) => { const over = f.response_due && f.response_due < today && ['eingegangen', 'fahrer_ermittelt', 'fahrer_informiert'].includes(f.status); return `<a class="row ${over ? 'p-kritisch' : ''}" href="#/fines/${esc(f.id)}">${plate(f.plate || f.plate_in_letter)}<span class="title">${esc(t('fk_' + f.kind))} · ${esc(t('of_' + f.offense_type))}</span><span class="chip ${over ? 'kritisch' : ['bezahlt', 'eingestellt', 'erledigt', 'beantwortet'].includes(f.status) ? 'ok' : ''}">${esc(t('fs_' + f.status))}</span>${f.driving_ban_months ? `<span class="chip kritisch" data-fban>${esc(t('fine_ban'))}: ${esc(tn('ban_months', f.driving_ban_months))}</span>` : ''}${!f.response_due && ['eingegangen', 'fahrer_ermittelt', 'fahrer_informiert'].includes(f.status) ? `<span class="chip" data-fnodue>${esc(t('fine_no_due'))}</span>` : ''}<span class="sub">${esc(f.fine_no)} · ${fmtDT(f.offense_at)}${f.authority ? ' · ' + esc(f.authority) : ''}${f.response_due ? ' · ' + esc(t('response_due')) + ' ' + esc(fmtDue(f.response_due)) : ''}${f.driver_name || f.driver_name_note ? ' · ' + esc(f.driver_name || f.driver_name_note) : ''}</span></a>`; }).join('') || `<p class="muted">${esc(t('no_fines'))}</p>`}</div>`;
  if (['owner', 'fleet', 'viewer'].includes(S.me.role)) html += `<div class="actions" style="flex-wrap:wrap"><button type="button" class="btn secondary" id="fcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="fics">${esc(t('export_ics'))}</button><button type="button" class="btn secondary" id="fprt">${esc(t('print'))}</button>${mgr ? `<label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="fdrv"> ${esc(t('with_driver_names'))}</label>` : ''}</div>`;
  render(html, 'more');
  const day = bDate();
  const fc = $('#fcsv'); if (fc) fc.onclick = async () => { try { downloadChecked(await api('GET', `/api/fines?format=csv${$('#fdrv') && $('#fdrv').checked ? '&with_driver=1' : ''}${fq ? '&' + fq : ''}`), `fuhrpark-bussgelder_${envFn()}_${day}${fr.site ? '_' + fnPart(fr.site === 'ohne' ? t('cs_nosite') : fr.site) : ''}.csv`); } catch (err) { toast(err.message, true); } };
  const fi = $('#fics'); if (fi) fi.onclick = async () => { try { downloadChecked(await api('GET', '/api/fines?format=ics' + (fq ? '&' + fq : '')), `fuhrpark-behoerdenfristen_${envFn()}_${day}.ics`); } catch (err) { toast(err.message, true); } };
  const fs = $('#fsite'); if (fs) fs.onchange = () => { S.fineSite = fs.value; viewFines(); };
  const fp = $('#fprt'); if (fp) fp.onclick = () => window.print();
  const fnd = $('#fnodue'); if (fnd) fnd.onchange = () => { S.fineNoDue = fnd.checked; viewFines(); };
  dueWeekendWatch();
  const nf = $('#nf');
  if (nf) nf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(nf)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; if (b.amount_eur) b.amount_eur = b.amount_eur.trim(); b.request_key = nf.dataset.rk || (nf.dataset.rk = uid()); try { const r = await api('POST', '/api/fines', b); if (r.duplicate) toast(t('fine_dup_existing').replace('{no}', r.fine_no), true); else if (!r.vehicle_matched) toast(t(r.vehicle_ambiguous ? 'fine_vehicle_ambiguous' : 'vehicle_unknown'), true); location.hash = '#/fines/' + r.id; } catch (err) { toast(err.message, true); } };
}
// Verlauf: Zielstatus bzw. geänderte Angaben aus payload (19.10.2026: nur „Status setzen“/„Angaben geändert“ ohne Inhalt)
function fineEvDetail(e, names = {}) {
  let p = e.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch { p = null; } }
  if (!p || typeof p !== 'object') return '';
  // Fahrer im Verlauf mit Namen (bestätigt bzw. beim Zurücksetzen abgelöst; 20.10.2026)
  const who = (o) => (o.driver_id ? names[o.driver_id] || '' : o.driver_name_note || '');
  if (e.action === 'confirm_driver') { const n = who(p); return (n ? ' → ' + esc(n) : '') + (p.basis ? ' · ' + esc(t('fb_' + p.basis)) : ''); }
  if (e.action === 'set_status' && p.to) return ' → ' + esc(t('fs_' + p.to)) + (p.driver_reset ? ' · ' + esc(t('fine_driver_reset')) + (who(p.driver_reset) ? ` (${esc(t('fine_prev_driver').replace('{n}', who(p.driver_reset)))})` : '') : '');
  if (e.action !== 'update') return '';
  const fv = { driving_ban_months: (v) => (v ? tn('ban_months', v) : t('fine_ban_none')), amount_eur: (v) => (v === null || v === undefined ? '–' : eur(v)), response_due: (v) => (v ? fmtD(v) : '–'), offense_at: (v) => (v ? fmtDT(v) : '–') };
  const val = (k, v) => (fv[k] ? fv[k](v) : v || '–');
  const name = { offense_at: 'offense_at', amount_eur: 'amount', driving_ban_months: 'fine_ban', response_due: 'response_due', reference: 'reference', authority: 'authority', plate_in_letter: 'plate_letter' };
  // seit 19.10.2026 mit bisherigem Wert (prev): „alt → neu“; ältere Einträge nur der neue Wert
  const parts = Object.keys(name).filter((k) => k in p).map((k) => `${t(name[k])}: ${p.prev && k in p.prev ? val(k, p.prev[k]) + ' → ' : ''}${val(k, p[k])}${k === 'plate_in_letter' && p.vehicle_id === null ? ' (' + t(p.vehicle_ambiguous ? 'fine_vehicle_ambiguous' : 'vehicle_unknown') + ')' : ''}`);
  return parts.length ? ' · ' + esc(parts.join(' · ')) : '';
}
// Fahrverbot laut Schreiben (Backlog 364): Auswahl 1–3 Monate, leer = nicht angegeben
function fineBanSel(id, cur) {
  return `<select name="driving_ban_months" id="${id}" aria-describedby="${id}h"><option value="">${esc(t('fine_ban_none'))}</option>${[1, 2, 3].map((n) => `<option value="${n}"${cur === n ? ' selected' : ''}>${esc(tn('ban_months', n))}</option>`).join('')}</select><p class="small muted" id="${id}h" style="margin:2px 0 8px">${esc(t('fine_ban_hint'))}</p>`;
}
// Zustellstand der Fahrerinformation (Backlog 375): informiert/quittiert, Push am Gerät angekommen (nicht „geöffnet“), Hinweis zur Frist
function fineInfLine(d, f) {
  const x = d.inform_delivery; if (!x) return '';
  const ps = x.push === 'received' ? t('fine_push_received') : x.push === 'held' ? t('pst_held').replace('{t}', fmtDT(x.hold_until)) : !x.push ? t('fine_push_none') : t('pst_' + x.push) === 'pst_' + x.push ? x.push : t('pst_' + x.push);
  const open = !x.ack_at && !['beantwortet', 'bezahlt', 'eingestellt', 'erledigt'].includes(f.status);
  let h = `<div class="small" data-finf>${esc(t('fine_inf_at').replace('{t}', fmtDT(x.informed_at)))} · ${x.ack_at ? esc(t('fine_ack_done').replace('{t}', fmtDT(x.ack_at))) : `<b>${esc(t('fine_ack_open'))}</b>`}<br>Push: ${esc(ps)}</div>`;
  if (open && !d.driver_unreachable && ['failed', 'no_subscription', 'disabled', null].includes(x.push)) h += `<div class="panel alert small" data-fpushmiss role="note" style="margin-top:6px">${esc(t('fine_push_missing'))}</div>`;
  if (open && f.response_due) h += `<div class="small muted" data-fackdue style="margin-top:4px">${esc(t('fine_ack_due_hint').replace('{due}', fmtDue(f.response_due)))}</div>`;
  return h;
}
const FINE_EV = { create: 'new_fine', confirm_driver: 'confirm_driver', inform_driver: 'inform_driver', set_status: 'set_status', driver_ack: 'ack_fine', update: 'fine_updated', upload: 'upload', driver_dispute: 'fine_dispute_ev' };
async function viewFine(id) {
  const d = await api('GET', '/api/fines/' + id);
  const f = d.fine; const A = d.allowed_actions;
  let html = `<p class="noprint"><a class="backlink" href="#/fines">‹ ${esc(t('back'))}</a></p><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">${plate(f.plate || f.plate_in_letter, { big: true })}<span class="chip">${esc(t('fs_' + f.status))}</span>${f.environment === 'test' ? '<span class="chip test">TEST</span>' : ''}</div>
    <h1 style="margin-top:12px">${esc(f.fine_no)} · ${esc(t('fk_' + f.kind))}</h1>${printHead([t('fines'), f.fine_no])}
    <div class="actions noprint"><button type="button" class="btn secondary" id="fdprt">${esc(t('print'))}</button></div>
    ${f.vehicle_id && f.plate && f.plate_in_letter && searchKey(f.plate) !== searchKey(f.plate_in_letter) ? `<p class="panel small" id="fformer">${esc(t('fine_former_plate').replace('{old}', f.plate_in_letter).replace('{plate}', f.plate))}</p>` : ''}
    ${!f.vehicle_id ? `<div class="panel alert" id="fvu">${d.vehicle_ambiguous ? `${esc(f.plate_in_letter)}: ${esc(t('fine_vehicle_ambiguous'))}` : `${esc(t('vehicle_unknown'))}: ${esc(f.plate_in_letter)}`}${d.vehicle_matchable ? `<div class="small" data-fmatch>${esc(t('fine_vehicle_matchable').replace('{p}', d.vehicle_matchable.plate))}</div>` : d.trailer_of ? `<div class="small" data-ftrailer>${esc(t('fine_trailer_of').replace('{p}', d.trailer_of.plate))}</div>` : ''}</div>` : ''}
    ${d.driver_dispute ? `<div class="panel alert" id="fdisp" role="note"><b>${esc(t('fine_dispute_mgr').replace('{t}', fmtDT(d.driver_dispute.at)))}</b><div style="white-space:pre-wrap">${esc(d.driver_dispute.note || '')}</div></div>` : ''}
    ${f.driving_ban_months && ['owner', 'fleet'].includes(S.me.role) ? `<div class="panel alert" id="fban" role="note">${esc(t('fine_ban_alert').replace('{m}', tn('ban_months', f.driving_ban_months)))}</div>` : ''}
    <section class="panel"><dl class="kv"><dt>${esc(t('offense'))}</dt><dd>${esc(t('of_' + f.offense_type))}</dd><dt>${esc(t('offense_at'))}</dt><dd>${fmtDT(f.offense_at)}</dd><dt>${esc(t('offense_place'))}</dt><dd>${esc(f.location || '–')}</dd>
      <dt>${esc(t('authority'))}</dt><dd>${esc(f.authority)}</dd><dt>${esc(t('reference'))}</dt><dd>${esc(f.reference || '–')}</dd><dt>${esc(t('amount'))}</dt><dd>${eur(f.amount_eur)}</dd><dt>${esc(t('fine_ban'))}</dt><dd>${f.driving_ban_months ? esc(tn('ban_months', f.driving_ban_months)) : esc(t('fine_ban_none'))}</dd>
      <dt>${esc(t('response_due'))}</dt><dd>${f.response_due ? esc(fmtDue(f.response_due)) : '–' + (['eingegangen', 'fahrer_ermittelt', 'fahrer_informiert'].includes(f.status) ? ` <span class="chip" data-fnodue title="${esc(t('fine_no_due_hint'))}">${esc(t('fine_no_due'))}</span><div class="small muted">${esc(t('fine_no_due_hint'))}</div>` : '')}${dueOffHint(f.response_due) ? `<div class="small muted">${esc(dueOffHint(f.response_due))}</div>` : ''}</dd><dt>${esc(t('role_driver'))}</dt><dd>${f.driver_hidden ? esc(t('fine_driver_hidden')) : esc(d.driver_name || '–')}${f.driver_basis ? ' · ' + esc(t('fb_' + f.driver_basis)) : ''}${f.driver_evidence ? `<div class="small muted">${esc(fineEvTr(f.driver_evidence))}</div>` : ''}${d.driver_unreachable ? `<div class="panel alert small" data-funreach role="note" style="margin-top:6px">${esc(t('fine_driver_unreachable'))}</div>` : ''}${fineInfLine(d, f)}</dd></dl>
      ${f.note ? `<p style="white-space:pre-wrap;margin-top:8px">${esc(f.note)}</p>` : ''}</section>`;
  html += `<h2>${esc(t('files'))}</h2><div class="thumbs">${d.files.map((x) => `<a href="${fileUrl(x.id)}" target="_blank" rel="noopener">${x.content_type.startsWith('image/') ? `<img src="${fileUrl(x.id)}" alt="${esc(x.filename)}">` : 'PDF<br>' + esc(x.filename.slice(0, 14))}</a>`).join('')}</div>`;
  // Höchstzahl je Bußgeldvorgang wie Server (MAX_FINE_FILES): voll → Hinweis statt Knopf
  if (A.includes('upload') && d.files.length < FINE_FILES_MAX) html += `<label class="btn secondary noprint" style="margin-top:8px;display:inline-flex">${esc(t('upload'))}<input id="ff" type="file" accept="application/pdf,image/jpeg,image/png" hidden></label>`;
  else if (A.includes('upload')) html += `<p class="small muted" id="ffull">${esc(t('files_full').replace('{max}', FINE_FILES_MAX))}</p>`;
  if (A.includes('confirm_driver')) {
    html += `<div class="noprint"><h2>${esc(t('candidates'))}</h2>${d.candidates.length ? `<div class="list">${d.candidates.map((c, i) => `<label class="row"><input type="radio" name="cand" value="${i}"><span class="title">${esc(c.display_name)}</span><span class="chip">${esc(t('fb_' + c.basis))}</span><span class="sub" style="white-space:normal">${esc(candEv(c))}</span></label>`).join('')}</div>` : `<p class="muted">${esc(t('no_candidates'))}</p>`}${d.candidates_differ ? `<p class="panel alert small" data-fcdiff role="note">${esc(t('fine_cand_differ'))}</p>` : ''}${d.assignments_ambiguous ? `<p class="panel alert small" data-fcmulti role="note">${esc(t('fine_cand_multi'))}</p>` : ''}${sameDayHtml(d.same_day_assignments)}</div>
      <form id="cf" class="panel"><h3>${esc(t('confirm_driver'))}</h3><label>${esc(t('role_driver'))}</label><select name="driver_id" id="drv"><option value="">–</option></select>
      <label>${esc(t('driver_without_account'))}</label><input name="driver_name_note"><label>${esc(t('basis'))}</label><select name="basis">${['zuordnung', 'tourenplan', 'telematik', 'fahrerangabe', 'manuell'].map((b) => `<option value="${b}">${esc(t('fb_' + b))}</option>`).join('')}</select>
      <label>${esc(t('evidence'))}</label><input name="evidence" required><div class="actions"><button class="btn">${esc(t('confirm_driver'))}</button></div></form>`;
  }
  const acts = [];
  if (A.includes('inform_driver')) acts.push(`<button class="btn" id="inf">${esc(t('inform_driver'))}</button>`);
  if (A.includes('driver_ack')) acts.push(`<button class="btn" id="ack">${esc(t('ack_fine'))}</button>`);
  if (acts.length) html += `<div class="actions">${acts.join('')}</div>`;
  // Einwand des Fahrers (Backlog 377): Fahrer kann begründet widersprechen, die Leitung sieht es im Schreiben
  if (d.my_dispute) html += `<p class="panel small" data-fmydisp>${esc(t('fine_dispute_sent').replace('{t}', fmtDT(d.my_dispute.at)))}</p>`;
  if (A.includes('driver_dispute')) html += `<details class="panel noprint"><summary>${esc(t('fine_dispute'))}</summary><form id="dpf"><p class="small muted" id="dpfh">${esc(t('fine_dispute_hint'))}</p><label for="dpn">${esc(t('fine_dispute_reason'))}</label><textarea id="dpn" name="note" required maxlength="2000" rows="3" aria-describedby="dpfh"></textarea><div class="actions"><button class="btn secondary">${esc(t('fine_dispute_send'))}</button></div></form></details>`;
  // Frist/Betrag/Aktenzeichen laut neuem Schreiben ändern (Server konnte es, die App bot es nicht an – 18.10.2026; z. B. Fristverlängerung)
  if (A.includes('update')) html += `<details class="panel noprint"><summary>${esc(t('fine_edit'))}</summary><form id="uf"><label>${esc(t('offense_at'))}</label><input type="datetime-local" name="offense_at" required value="${esc(berlinLocalDT(f.offense_at))}"${f.driver_confirmed_at ? ` disabled aria-describedby="ufoth"><p class="small muted" id="ufoth">${esc(t('fine_offense_locked'))}</p>` : ` aria-describedby="ufotz"><p class="small muted" id="ufotz">${esc(t('offense_at_tz'))}</p>`}<label>${esc(t('response_due'))}</label><input type="date" name="response_due" value="${esc(f.response_due || '')}"><label>${esc(t('amount'))}</label><input name="amount_eur" inputmode="decimal" value="${f.amount_eur === null || f.amount_eur === undefined ? '' : esc(decIn(f.amount_eur))}"><label for="ufban">${esc(t('fine_ban'))}</label>${fineBanSel('ufban', f.driving_ban_months)}<label>${esc(t('reference'))}</label><input name="reference" maxlength="80" value="${esc(f.reference || '')}"><label>${esc(t('authority'))}</label><input name="authority" required maxlength="200" value="${esc(f.authority || '')}"><label>${esc(t('plate_letter'))}</label><input name="plate_in_letter" required maxlength="20" value="${esc(f.plate_in_letter || '')}"${f.driver_confirmed_at ? ` disabled aria-describedby="ufplh"><p class="small muted" id="ufplh">${esc(t('fine_plate_locked'))}</p>` : '>'}<p class="small muted">${esc(t('fine_edit_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>`;
  if (A.includes('set_status')) html += `<details class="panel"><summary>${esc(t('set_status'))}</summary><form id="sf"><label>${esc(t('status'))}</label><select name="status">${['beantwortet', 'bezahlt', 'eingestellt', 'erledigt', 'eingegangen'].map((x) => `<option value="${x}">${esc(t('fs_' + x))}</option>`).join('')}</select><label>${esc(t('note'))}</label><input name="note" required><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>`;
  if (d.events) html += `<h2>${esc(t('history'))}</h2><ol class="timeline">${d.events.map((e) => `<li><time>${fmtDT(e.created_at)}</time> · <b>${esc(FINE_EV[e.action] ? t(FINE_EV[e.action]) : e.action)}</b>${fineEvDetail(e, d.event_driver_names || {})}${e.actor_name ? ' · ' + esc(e.actor_name) : ''}${e.note ? `<div>${esc(e.note)}</div>` : ''}</li>`).join('')}</ol>`;
  render(html, 'more');
  $('#fdprt').onclick = () => window.print();
  const cmd = async (action, payload = {}, note = null) => { try { await api('POST', `/api/fines/${id}/commands`, { action, payload, note, expected_version: f.version }); toast('✓'); viewFine(id); } catch (err) { toast(err.message, true); } };
  const cf = $('#cf');
  if (cf) {
    // nur Fahrer der Umgebung des Schreibens (Inhaber sieht Konten aller Umgebungen); Kandidaten ergänzen, auch wenn inzwischen deaktiviert/Rolle gewechselt (18.10.2026)
    try {
      const us = (await api('GET', '/api/users')).users.filter((u) => u.role === 'driver' && u.active && (!u.environment || !f.environment || u.environment === f.environment));
      const ids = new Set(us.map((u) => u.id)); const extra = [];
      for (const c of d.candidates || []) if (c.user_id && !ids.has(c.user_id)) { ids.add(c.user_id); extra.push({ id: c.user_id, display_name: c.display_name }); }
      $('#drv').innerHTML = `<option value="">–</option>` + [...us, ...extra].map((u) => `<option value="${esc(u.id)}">${esc(u.display_name)}</option>`).join('');
    } catch {
      const ex = $('#drv'); if (ex) for (const c of d.candidates || []) if (c.user_id && ![...ex.options].some((o) => o.value === c.user_id)) ex.add(new Option(c.display_name, c.user_id));
    }
    $$('input[name=cand]').forEach((r) => (r.onchange = () => { const c = d.candidates[r.value]; $('#drv').value = c.user_id; cf.basis.value = c.basis; cf.evidence.value = candEv(c); cf.dataset.evShown = cf.evidence.value; cf.dataset.evDe = c.evidence; }));
    cf.onsubmit = (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(cf)); if (cf.dataset.evShown && b.evidence === cf.dataset.evShown) b.evidence = cf.dataset.evDe; /* angezeigt in der Oberflächensprache, gespeichert wie vom Server (Übersetzung später über fineEvTr) */ if (!b.driver_id) delete b.driver_id; if (!b.driver_name_note) delete b.driver_name_note; return cmd('confirm_driver', b); };
  }
  const inf = $('#inf'); if (inf) inf.onclick = () => cmd('inform_driver');
  const ack = $('#ack'); if (ack) ack.onclick = () => cmd('driver_ack');
  const dpf = $('#dpf'); if (dpf) dpf.onsubmit = (e) => { e.preventDefault(); const n = dpf.note.value.trim(); if (!n) return; return cmd('driver_dispute', {}, n); };
  const sf = $('#sf'); if (sf) sf.onsubmit = (e) => { e.preventDefault(); if (sf.status.value === 'eingegangen' && (f.driver_confirmed_at || f.driver_id || f.driver_name_note || f.driver_hidden) && !confirm(t('fine_reopen_confirm'))) return; return cmd('set_status', { status: sf.status.value }, sf.note.value); };
  // Behörde/Kennzeichen korrigierbar (19.10.2026); Kennzeichen nur senden, wenn geändert – Antwort meldet die neue Zuordnung
  dueWeekendWatch();
  const uf = $('#uf'); if (uf) uf.onsubmit = async (e) => { e.preventDefault();
    const b = { response_due: uf.response_due.value || null, amount_eur: uf.amount_eur.value.trim() || null, reference: uf.reference.value.trim() || null, authority: uf.authority.value.trim(), driving_ban_months: uf.driving_ban_months.value ? Number(uf.driving_ban_months.value) : null };
    // ohne zugeordnetes Fahrzeug immer senden: Server ordnet neu zu, wenn das Kennzeichen inzwischen eindeutig ist (21.10.2026)
    // Tatzeit (Berliner Ortszeit) nur senden, wenn geändert – sonst Minutenrundung = scheinbare Änderung (23.10.2026)
    if (!uf.offense_at.disabled && uf.offense_at.value && uf.offense_at.value !== berlinLocalDT(f.offense_at)) b.offense_at = uf.offense_at.value;
    if (!uf.plate_in_letter.disabled && (!f.vehicle_id || uf.plate_in_letter.value.trim().toUpperCase() !== String(f.plate_in_letter || ''))) b.plate_in_letter = uf.plate_in_letter.value.trim();
    try { const r = await api('POST', `/api/fines/${id}/commands`, { action: 'update', payload: b, expected_version: f.version });
      if (r.vehicle_matched === false) toast(t(r.vehicle_ambiguous ? 'fine_vehicle_ambiguous' : 'vehicle_unknown'), true); else toast('✓'); viewFine(id); } catch (err) { toast(err.message, true); } };
  const ff = $('#ff'); if (ff) ff.onchange = async () => { const file = ff.files[0]; if (!file) return; try { const blob = await prepareUpload(file); await api('POST', `/api/fines/${id}/files`, blob, { headers: { 'x-filename': encodeURIComponent(file.name), 'content-type': blob.type || 'application/octet-stream' } }); viewFine(id); } catch (err) { toast(err.message, true); } };
}
// Standortauswahl (Standort laut Fahrzeugstamm; Server liefert options in häufigster Schreibweise, 'ohne' = ohne Standort)
// Filter „Fahrzeug-Standort“: in dieser Sitzung gewählter Wert (auch „Alle“ = ''), sonst der Standard-Standort aus „Mein Konto“
// Standort als Teil eines Dateinamens (Umlaute bleiben, sonst Bindestrich)
function fnPart(x) { return String(x).replace(/[^\wÄÖÜäöüß-]+/g, '-'); }
// Abrufzeitpunkt (Berlin, Serverzeit) im Dateinamen der Kosten-CSVs wie auf dem Server: „stand-JJJJ-MM-TT-HHMM“ (24.10.2026, Abgabe an die Buchhaltung)
function standTag() { const x = BERLIN_DT_FMT.format(new Date(nowMs())).replace(/[^0-9]/g, ''); return x.length === 12 ? `stand-${x.slice(0, 4)}-${x.slice(4, 6)}-${x.slice(6, 8)}-${x.slice(8)}` : 'stand'; }
async function viewCosts() {
  const to = S.costTo || bYm(); const from = S.costFrom || bYm(11); const site = vsDef('costSite') || '';
  const siteQ = site ? `&site=${encodeURIComponent(site)}` : '';
  let rep;
  try { rep = await api('GET', `/api/reports/costs?from=${from}&to=${to}${siteQ}`); } catch (err) {
    // ungültiger Zeitraum: Meldung zeigen und mit dem Standardzeitraum weiter – sonst blieb die Seite bis zum Neuladen gesperrt (19.10.2026)
    if (S.costFrom || S.costTo) { S.costFrom = null; S.costTo = null; toast(err.message, true); return viewCosts(); }
    if (err.status === 403 || err.status === 404) throw err; // gemeinsamer Fehlerpfad „Seite nicht verfügbar“ + „Zur Übersicht“ (23.10.2026)
    render(`<h1>${esc(t('costs_report'))}</h1><div class="panel alert">${esc(err.message)}</div>`, 'more'); return; }
  const byV = new Map();
  for (const r of rep.rows) { const v = byV.get(r.vehicle_id) || { plate: r.plate, site: r.site, inactive: r.vehicle_active === false, actual: 0, valued: 0, estimate: 0, unvalued: 0, hours: 0, months: [] }; v.actual += r.actual_net; v.valued += r.valued_items || 0; v.estimate += r.estimate_net; v.unvalued += r.unvalued_items; v.hours += r.hours; v.months.push(r); byV.set(r.vehicle_id, v); }
  const vs = [...byV.entries()].sort((a, b) => b[1].actual - a[1].actual);
  const kmBy = new Map((rep.vehicles || []).map((v) => [v.vehicle_id, v]));
  // Backlog 413 (Blickwinkel „Jahresabschluss: Kosten 2026 für die Steuerberatung“): Schnellwahl laufendes Jahr / Vorjahr / letzte 12 Monate
  const cy = bYm().slice(0, 4);
  const costQuick = [['prevm', bYm(1), bYm(1)], ['year', `${cy}-01`, bYm()], ['prev', `${Number(cy) - 1}-01`, `${Number(cy) - 1}-12`], ['12m', bYm(11), bYm()]];
  // Ausdruck (Besprechung/Ablage): Zeitraum und Standort im Vermerk, weil das Formular nicht mitgedruckt wird
  let html = `<h1>${esc(t('costs_report'))}</h1>${printHead([`${t('period')}: ${fmtMonth(from)} – ${fmtMonth(to)}`, site ? `${t('site')}: ${site === 'ohne' ? t('cs_nosite') : site}` : ''])}${helpLink('costs')}<form id="cr" class="panel" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
    <div><label>${esc(t('from'))}</label><input type="month" name="from" value="${esc(from)}" required></div><div><label>${esc(t('to'))}</label><input type="month" name="to" value="${esc(to)}" required></div>
    ${(rep.site_options || []).length > 1 || site ? `<div>${siteSelect('crsite', 'site', rep.site_options, site)}</div>` : ''}
    <div class="noprint" id="crq" style="flex-basis:100%;display:flex;gap:6px;flex-wrap:wrap">${costQuick.map(([k, f, tt]) => `<button type="button" class="btn ${f === from && tt === to ? '' : 'secondary '}small" data-crq="${k}" aria-pressed="${f === from && tt === to}" style="white-space:nowrap">${esc(t('crq_' + k).replace('{y}', f.slice(0, 4)).replace('{m}', fmtMonth(f)))}</button>`).join('')}</div>
    <div class="actions" style="margin:0"><button class="btn secondary">${esc(t('show'))}</button><button type="button" class="btn" id="csv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="csvi" title="${esc(t('cost_items_csv_hint'))}">${esc(t('cost_items_csv'))}</button><button type="button" class="btn secondary" id="csvv" title="${esc(t('cost_vehicles_csv_hint'))}">${esc(t('cost_vehicles_csv'))}</button><button type="button" class="btn secondary" id="costprt">${esc(t('print'))}</button></div></form>
    <section class="panel"><dl class="kv"><dt>${esc(t('cost_actual'))}</dt><dd><b>${eurIst(rep.totals)}</b></dd><dt>${esc(t('cost_estimate'))}</dt><dd>${eur(rep.totals.estimate_net)}</dd>
    <dt>${esc(t('hours'))}</dt><dd>${esc(fmtNum(rep.totals.hours))}</dd><dt>${esc(t('unvalued_positions'))}</dt><dd>${rep.totals.unvalued_items ? `<span class="chip kritisch">${rep.totals.unvalued_items}</span>` : '0'}</dd></dl>
    <p class="small muted" style="margin-top:8px">${esc(t('cost_rules'))}${(rep.hourly_rate_periods || []).length ? ' ' + esc(t('cost_rate_periods').replace('{list}', rep.hourly_rate_periods.map((x) => t('hr_until').replace('{d}', fmtD(x.valid_until)) + ' ' + eur(x.rate_net)).join(', '))) + (rep.hourly_rate_net === null ? ' ' + esc(ownerT('no_rate')) : '') : rep.hourly_rate_net === null ? ' ' + esc(ownerT('no_rate')) : ' ' + esc(t('cost_rate_today'))} ${esc(t('cost_per_km_rule'))}</p>${rep.excluded_dormant ? `<p class="small" data-costdormant>${esc(tn('cost_dormant_hidden', rep.excluded_dormant.vehicles))}</p>` : ''}</section>`;
  const sites = rep.sites || [];
  if (sites.length > 1) html += `<section class="panel" id="costsites"><h3>${esc(t('cs_title'))}</h3><dl class="kv">${sites.map((s) => `<dt>${esc(s.site === 'ohne' ? t('cs_nosite') : s.site)}</dt><dd><b>${eurIst(s)}</b>${s.estimate_net ? ' · ' + esc(t('estimate')) + ' ' + eur(s.estimate_net) : ''}${s.unvalued_items ? ` · <span class="chip kritisch">${s.unvalued_items} ${esc(t('unvalued_short'))}</span>` : ''} · ${esc(t('cs_vehicles').replace('{n}', s.vehicles))}</dd>`).join('')}</dl><p class="small muted" style="margin-top:8px">${esc(t('cs_rule'))}</p></section>`;
  html += `<div class="list print-summary">${vs.map(([id, v]) => `<details class="row" style="display:block"><summary style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;cursor:pointer">${plate(v.plate || id)}${v.inactive ? `<span class="chip" data-cinact>${esc(t('inactive_vehicles'))}</span>` : ''}<span class="title">${eurIst({ actual_net: Math.round(v.actual * 100) / 100, valued_items: v.valued, unvalued_items: v.unvalued })}</span>${v.estimate ? `<span class="chip">${esc(t('estimate'))}: ${eur(Math.round(v.estimate * 100) / 100)}</span>` : ''}${v.unvalued ? `<span class="chip kritisch">${v.unvalued} ${esc(t('unvalued_short'))}</span>` : ''}${(() => { const k = kmBy.get(id); return k && k.km ? `<span class="chip">${fmtKm(k.km)} · ${k.cost_per_km !== null ? fmtNum(k.cost_per_km, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + (S.lang === 'uk' ? ' €/км' : ' €/km') : '–'}${k.complete ? '' : ' (' + esc(t('incomplete')) + ')'}</span>${k.km_partial ? ` <span class="chip mittel" data-ckmpartial title="${esc(t('ckm_partial_hint'))}">${esc(t('ckm_partial').replace('{a}', fmtD(k.km_from_at)).replace('{b}', fmtD(k.km_to_at)))}</span>` : ''}` : k && k.km_status === 'decrease' ? `<span class="chip" data-ckm="decrease">${esc(t('vm_decrease'))}</span>` : ''; })()}</summary>
    <dl class="kv" style="margin-top:8px">${v.months.map((m) => `<dt>${esc(fmtMonth(m.month))}</dt><dd>${eurIst(m)}${m.estimate_net ? ' · ' + esc(t('estimate')) + ' ' + eur(m.estimate_net) : ''}${m.unvalued_items ? ' · ' + m.unvalued_items + ' ' + esc(t('unvalued_short')) : ''}${m.late_items ? ` · <span class="chip mittel" data-clate title="${esc(t('late_items_hint'))}">${esc(tn('late_items_n', m.late_items))}</span>` : ''} · ${esc(fmtNum(m.hours))} ${esc(t('h_short'))}${m.km !== null && m.km !== undefined ? ' · ' + fmtKm(m.km) : ''}</dd>`).join('')}</dl>${(() => { const k = kmBy.get(id); return k && k.km !== null && k.km_from_at ? `<p class="small muted" data-ckm="span">${esc(t('ckm_span').replace('{a}', fmtD(k.km_from_at)).replace('{b}', fmtD(k.km_to_at)))}${k.km_basis === 'first_in_period' ? ' · ' + esc(t('ckm_first')) : ''}</p>` : ''; })()}
    <p class="navlinks"><a href="#/vehicles/${encodeURIComponent(id)}">${esc(t('vehicle'))} ›</a></p></details>`).join('') || `<p class="muted">${esc(t('no_costs'))}</p>`}</div>`;
  const cc = rep.contract_costs;
  if (cc) html += `<h2>${esc(t('cc_title'))}</h2><section class="panel"><dl class="kv"><dt>${esc(t('cc_total'))}</dt><dd><b>${cc.total_net === null ? '–' : eur(cc.total_net)}</b></dd></dl>
    ${cc.without_start ? `<p class="small"><span class="chip mittel" style="white-space:normal">${esc(tn('cc_without_start', cc.without_start))}</span></p>` : ''}${cc.without_rate ? `<p class="small"><span class="chip mittel" style="white-space:normal">${esc(tn('cc_without_rate', cc.without_rate))}</span></p>` : ''}${cc.excluded_dormant ? `<p class="small" data-ccdormant><span class="chip" style="white-space:normal">${esc(tn('cc_dormant', cc.excluded_dormant.contracts))}</span></p>` : ''}
    <p class="small muted">${esc(t('cc_rule').replace('{m}', fmtMonth(cc.until_month)))}</p></section>
    <div class="list">${cc.vehicles.length ? cc.vehicles.map((v) => `<a class="row" href="#/vehicles/${encodeURIComponent(v.vehicle_id)}">${plate(v.plate || v.vehicle_id)}<span class="title">${eur(v.net)}${v.vehicle_active === false ? ` <span class="chip" data-cinact>${esc(t('inactive_vehicles'))}</span>` : ''}</span><span></span><span class="sub" style="white-space:normal">${v.contracts.map((c) => `${esc(t('ck_' + c.kind))} · ${esc(c.partner)}: ${c.months} × ${eur(c.monthly_rate_net)}`).join(' · ')}</span></a>`).join('') : `<p class="muted">${esc(t('cc_none'))}</p>`}</div>`;
  const cl = rep.claim_reimbursements;
  if (cl) html += `<h2>${esc(t('cr_title'))}</h2><section class="panel"><dl class="kv"><dt>${esc(t('cr_sum'))}</dt><dd><b>${cl.total_net === null ? '–' : eur(cl.total_net)}</b></dd></dl><p class="small muted">${esc(t('cr_rule'))}</p></section>
    <div class="list">${cl.items.length ? cl.items.map((x) => `<a class="row" href="#/cases/${encodeURIComponent(x.case_id)}">${plate(x.plate || x.vehicle_id)}<span class="title">${eur(x.reimbursed_net)}</span><span class="chip">${fmtD(x.reimbursed_on)}</span><span class="sub" style="white-space:normal">${esc(x.case_no)} · ${esc(x.insurer)}${x.claim_no ? ' · ' + esc(x.claim_no) : ''}</span></a>`).join('') : `<p class="muted">${esc(t('cr_none'))}</p>`}</div>`;
  render(html, 'more');
  const cr = $('#cr');
  $('#costprt').onclick = () => window.print();
  cr.onsubmit = (e) => { e.preventDefault(); S.costFrom = cr.from.value; S.costTo = cr.to.value; S.costSite = cr.site ? cr.site.value : ''; viewCosts(); };
  $$('[data-crq]').forEach((bt) => { bt.onclick = () => { const q = costQuick.find((x) => x[0] === bt.dataset.crq); S.costFrom = q[1]; S.costTo = q[2]; viewCosts(); }; });
  // Dateiname aus dem angezeigten Zeitraum/Standort (nicht aus noch nicht abgeschickten Formularfeldern)
  $('#csv').onclick = async () => { try { const blob = await api('GET', `/api/reports/costs?from=${from}&to=${to}${siteQ}&format=csv`); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fuhrpark-kosten_${envFn()}_${rep.from || from}_${rep.to || to}${rep.site ? '_' + fnPart(rep.site) : ''}_${standTag()}.csv`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } catch (err) { toast(err.message, true); } };
  // Einzelpositionen (Lieferant, Rechnung/Beleg) für den Abgleich mit den Belegen – Jahresabschluss (23.10.2026)
  // Backlog 616: eine Zeile je Fahrzeug + Summen je Standort/gesamt (Jahresaufstellung)
  $('#csvv').onclick = async () => { try { download(await api('GET', `/api/reports/costs?from=${from}&to=${to}${siteQ}&format=csv&part=vehicles`), `fuhrpark-kosten-je-fahrzeug_${envFn()}_${rep.from || from}_${rep.to || to}${rep.site ? '_' + fnPart(rep.site) : ''}_${standTag()}.csv`); } catch (err) { toast(err.message, true); } };
  $('#csvi').onclick = async () => { try { const blob = await api('GET', `/api/reports/costs?from=${from}&to=${to}${siteQ}&part=items`); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `fuhrpark-kostenpositionen_${envFn()}_${rep.from || from}_${rep.to || to}${rep.site ? '_' + fnPart(rep.site) : ''}_${standTag()}.csv`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); } catch (err) { toast(err.message, true); } };
}
const DST = { ok: 'ok', hinweis: 'mittel', kritisch: 'kritisch', laeuft_ab: 'mittel', abgelaufen: 'kritisch', faellig: 'kritisch', bald: 'mittel', fehlt: 'mittel', mangel: 'kritisch' };
// Nachweise und Führerscheinkontrollen aller Fahrer für einen Zeitraum (Backlog 246, Betriebsprüfung) – Ansicht, 2 CSV, Ausdruck
async function viewDriverRecords() {
  if (!isMgr()) return render(`<p>${esc(t('err_forbidden'))}</p>`);
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k) || ''; sessionStorage.setItem(k, v); } catch { return ''; } return ''; };
  const qs = () => { const f = ss('cfp_dr_from'); const to = ss('cfp_dr_to'); return [f && 'from=' + encodeURIComponent(f), to && 'to=' + encodeURIComponent(to)].filter(Boolean).join('&'); };
  let r;
  try { r = await api('GET', '/api/drivers/records' + (qs() ? '?' + qs() : '')); } catch (err) { ss('cfp_dr_from', ''); ss('cfp_dr_to', ''); toast(err.message, true); r = await api('GET', '/api/drivers/records'); }
  const today = bDate();
  const ST = { aktuell: 'ok', abgelaufen: 'kritisch', abgeloest: '', storniert: '' };
  const who = (x) => `<a href="#/drivers/${esc(x.driver_id)}">${esc(x.display_name)}</a>${x.personnel_no ? `<div class="small muted">${esc(x.personnel_no)}</div>` : ''}${x.active ? '' : `<div><span class="chip">${esc(t('th_inactive'))}</span></div>`}`;
  const docs = r.documents.length ? `<div class="scroll"><table class="stack printsm" id="drdocs"><thead><tr><th>${esc(t('role_driver'))}</th><th>${esc(t('dr_doc'))}</th><th>${esc(t('dr_issued'))}</th><th>${esc(t('dr_valid'))}</th><th>${esc(t('dr_state'))}</th></tr></thead><tbody>${r.documents.map((x) => `<tr>
      <td>${who(x)}</td><td data-label="${esc(t('dr_doc'))}"><div>${esc(t('dk2_' + x.kind))}${x.title ? ' · ' + esc(x.title) : ''}${x.license_classes ? ` <span class="small muted">(${esc(x.license_classes)})</span>` : ''}</div></td>
      <td data-label="${esc(t('dr_issued'))}">${x.issued_on ? esc(fmtD(x.issued_on)) : `<span class="small muted">${esc(t('dr_entered'))} ${esc(fmtD(x.entry_day))}</span>`}</td>
      <td data-label="${esc(t('dr_valid'))}">${x.valid_until ? esc(fmtD(x.valid_until)) : '–'}</td>
      <td data-label="${esc(t('dr_state'))}"><span class="chip ${ST[x.state]}">${esc(t('dr_st_' + x.state))}</span></td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(t('dr_none_docs'))}</p>`;
  const checks = r.checks.length ? `<div class="scroll"><table class="stack printsm" id="drchecks"><thead><tr><th>${esc(t('role_driver'))}</th><th>${esc(t('date'))}</th><th>${esc(t('dr_result'))}</th><th>${esc(t('dr_by'))}</th></tr></thead><tbody>${r.checks.map((x) => `<tr>
      <td>${who(x)}</td><td data-label="${esc(t('date'))}">${esc(fmtD(x.checked_on))}</td>
      <td data-label="${esc(t('dr_result'))}">${x.cancelled_at ? `<s>${esc(t('lcr_' + x.result))}</s> <span class="chip">${esc(t('dr_st_storniert'))}</span>` : `<span class="chip ${x.result === 'in_ordnung' ? 'ok' : 'kritisch'}">${esc(t('lcr_' + x.result))}</span>`}</td>
      <td data-label="${esc(t('dr_by'))}">${esc(x.checked_by_name || '–')}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(t('dr_none_checks'))}</p>`;
  render(`<p class="noprint"><a class="backlink" href="#/drivers">‹ ${esc(t('back'))}</a></p><h1>${esc(t('dr_title'))}</h1>
    <p class="small muted">${esc(t('dr_hint'))}</p>
    <p class="print-only small">${printStamp()} · ${esc(fmtD(r.from))} – ${esc(fmtD(r.to))} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <form id="drf" class="panel noprint"><div class="grid2"><div><label for="drfrom">${esc(t('from'))}</label><input type="date" id="drfrom" value="${esc(r.from)}" max="${esc(today)}"></div><div><label for="drto">${esc(t('to'))}</label><input type="date" id="drto" value="${esc(r.to)}" max="${esc(today)}"></div></div>
      <div class="actions"><button class="btn">${esc(t('show'))}</button><button type="button" class="btn secondary" id="drcsvd">${esc(t('dr_csv_docs'))}</button><button type="button" class="btn secondary" id="drcsvc">${esc(t('dr_csv_checks'))}</button><button type="button" class="btn secondary" id="drprt">${esc(t('print'))}</button></div></form>
    ${r.truncated ? `<p class="panel warn" id="drtrunc">${esc(t('dr_truncated').replaceAll('{n}', r.max))}</p>` : ''}
    <h2>${esc(t('dr_docs'))} <span class="small muted">${r.documents.length}</span></h2>${docs}
    <h2>${esc(t('dr_checks'))} <span class="small muted">${r.checks.length}</span></h2>${checks}`, 'more');
  $('#drf').onsubmit = (e) => { e.preventDefault(); ss('cfp_dr_from', $('#drfrom').value); ss('cfp_dr_to', $('#drto').value); viewDriverRecords(); };
  $('#drprt').onclick = () => window.print();
  const csv = (part, name) => async () => { try { download(await api('GET', `/api/drivers/records?from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}&format=csv&part=${part}`), `fuhrpark-fahrer-${name}_${envFn()}_${r.from}_${r.to}.csv`); } catch (err) { toast(err.message, true); } };
  $('#drcsvd').onclick = csv('documents', 'nachweise'); $('#drcsvc').onclick = csv('checks', 'kontrollen');
}
// Backlog 410 (Blickwinkel „Jährliche Fahrerunterweisung – viele Fahrer in einer Schulung“): eine Unterweisung für mehrere Fahrer erfassen
// (nur aktive Fahrer der Liste; „gültig bis“ nur laut Nachweis; erneutes Senden legt nichts doppelt an – Server vergleicht Thema/Datum/Nachweis)
const dtbHtml = (list) => {
  if (!isMgr() || S.drvInactive || !list.length) return '';
  return `<details class="panel noprint" id="dtb"${S.dtbRes ? ' open' : ''}><summary>${esc(t('dtb_title'))}</summary><p class="small muted">${esc(t('dtb_hint'))}</p><form id="dtbf">
    <label>${esc(t('doc_title'))}</label><input name="title" required maxlength="120" placeholder="${esc(t('doc_title_ph'))}">
    <label>${esc(t('dtb_date'))}</label><input type="date" name="issued_on" required max="${bDate()}" value="${bDate()}">
    <label>${esc(t('valid_until'))} <span class="hint">${esc(t('driver_valid_until_hint'))}</span></label><input type="date" name="valid_until">
    <label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" placeholder="${esc(t('dtb_ev_ph'))}">
    <p style="margin:12px 0 0"><b>${esc(t('dtb_pick'))}</b></p>
    <div class="actions" style="margin:8px 0"><button type="button" class="btn secondary" data-dtb="1">${esc(t('mb_all'))}</button><button type="button" class="btn secondary" data-dtb="0">${esc(t('mb_none'))}</button> <span class="small muted" id="dtbcount" aria-live="polite"></span></div>
    <div class="tfpos" style="max-height:340px;overflow:auto;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${list.map((d) => `<label class="check"><input type="checkbox" name="driver_ids" value="${esc(d.id)}"> <span>${esc(d.display_name)}${d.personnel_no ? `<br><span class="small muted" style="white-space:nowrap">${esc(d.personnel_no)}</span>` : ''}</span></label>`).join('')}</div>
    <div class="actions"><button class="btn" id="dtbgo">${esc(t('dtb_send'))}</button></div></form>${S.dtbRes ? `<div id="dtbres" role="status">${S.dtbRes}</div>` : ''}</details>`;
};
function wireDtb() {
  const fm = $('#dtbf'); if (!fm) return;
  const boxes = () => $$('input[name="driver_ids"]', fm);
  const cnt = () => { const n = boxes().filter((b) => b.checked).length; $('#dtbcount').textContent = n ? tn('dtb_selected', n) : ''; };
  boxes().forEach((b) => (b.onchange = cnt));
  $$('[data-dtb]', fm).forEach((b) => (b.onclick = () => { boxes().forEach((x) => (x.checked = b.dataset.dtb === '1')); cnt(); }));
  fm.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(fm); const ids = fd.getAll('driver_ids');
    if (!ids.length) { toast(t('dtb_none'), true); return; }
    const b = { driver_ids: ids, title: fd.get('title'), issued_on: fd.get('issued_on'), evidence: fd.get('evidence') }; if (fd.get('valid_until')) b.valid_until = fd.get('valid_until');
    try {
      const r = await api('POST', '/api/drivers/trainings', b);
      document.querySelectorAll('.toast.err').forEach((x) => x.remove()); // Hinweis eines früheren Versuchs („Fahrer auswählen“) ist erledigt
      S.dtbRes = `<p class="panel good" data-dtbdone>✓ ${esc(tn('dtb_done', r.created))}${r.existing ? ` · ${esc(tn('dtb_existing', r.existing))}` : ''}</p><p class="small">${r.rows.map((x) => `<a href="#/drivers/${esc(x.driver_id)}">${esc(x.display_name)}</a>${x.status === 'vorhanden' ? ` <span class="muted">(${esc(t('dtb_was'))})</span>` : ''}`).join(', ')}</p>`;
      await viewDrivers(); // zeigt S.dtbRes einmal im aufgeklappten Bereich und setzt es zurück
    } catch (err) { toast(err.code === 'driver_inactive' && err.data && err.data.drivers ? t('dtb_inactive').replace('{list}', err.data.drivers.map((x) => x.display_name).join(', ')) : err.message, true); }
  };
}
// Backlog 411 (Blickwinkel „Halbjährliche Führerscheinkontrolle aller Fahrer an einem Tag“): Kontrolle „in Ordnung“ für mehrere Fahrer;
// Mängel/nicht vorgelegt nur einzeln in der Akte (Vermerk je Person). „Fällige auswählen“ = Kontrolle fällig, bald fällig oder noch keine erfasst.
const DLB_DUE = ['faellig', 'bald', 'fehlt'];
const dlbHtml = (list) => {
  if (!isMgr() || S.drvInactive || !list.length) return '';
  const st = (d) => (d.status && d.status.check ? d.status.check.status : 'ok');
  return `<details class="panel noprint" id="dlb"${S.dlbRes ? ' open' : ''}><summary>${esc(t('dlb_title'))}</summary><p class="small muted">${esc(t('dlb_hint'))}</p><form id="dlbf">
    <label>${esc(t('date'))}</label><input type="date" name="checked_on" required max="${bDate()}" value="${bDate()}">
    <label>${esc(t('note'))}</label><input name="note" maxlength="500">
    <p style="margin:12px 0 0"><b>${esc(t('dlb_pick'))}</b></p>
    <div class="actions" style="margin:8px 0;flex-wrap:wrap"><button type="button" class="btn secondary" data-dlb="due">${esc(t('dlb_due'))}</button><button type="button" class="btn secondary" data-dlb="1">${esc(t('mb_all'))}</button><button type="button" class="btn secondary" data-dlb="0">${esc(t('mb_none'))}</button> <span class="small muted" id="dlbcount" aria-live="polite"></span></div>
    <div class="tfpos" style="max-height:340px;overflow:auto;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))">${list.map((d) => `<label class="check"><input type="checkbox" name="driver_ids" value="${esc(d.id)}" data-due="${DLB_DUE.includes(st(d)) ? 1 : 0}"> <span>${esc(d.display_name)}${d.personnel_no ? `<br><span class="small muted" style="white-space:nowrap">${esc(d.personnel_no)}</span>` : ''}${st(d) !== 'ok' ? `<br><span class="chip ${st(d) === 'mangel' || st(d) === 'faellig' ? 'kritisch' : 'mittel'}" style="white-space:nowrap">${esc(t('dck_' + st(d)))}</span>` : ''}</span></label>`).join('')}</div>
    <div class="actions"><button class="btn" id="dlbgo">${esc(t('dlb_send'))}</button></div></form>${S.dlbRes ? `<div id="dlbres" role="status">${S.dlbRes}</div>` : ''}</details>`;
};
function wireDlb() {
  const fm = $('#dlbf'); if (!fm) return;
  const boxes = () => $$('input[name="driver_ids"]', fm);
  const cnt = () => { const n = boxes().filter((b) => b.checked).length; $('#dlbcount').textContent = n ? tn('dtb_selected', n) : ''; };
  boxes().forEach((b) => (b.onchange = cnt));
  $$('[data-dlb]', fm).forEach((b) => (b.onclick = () => { boxes().forEach((x) => (x.checked = b.dataset.dlb === 'due' ? x.dataset.due === '1' : b.dataset.dlb === '1')); cnt(); }));
  fm.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(fm); const ids = fd.getAll('driver_ids');
    if (!ids.length) { toast(t('dtb_none'), true); return; }
    const b = { driver_ids: ids, checked_on: fd.get('checked_on'), result: 'in_ordnung' }; if (fd.get('note')) b.note = fd.get('note');
    try {
      const r = await api('POST', '/api/drivers/license-checks', b);
      document.querySelectorAll('.toast.err').forEach((x) => x.remove());
      S.dlbRes = `<p class="panel good" data-dlbdone>✓ ${esc(tn('dlb_done', r.created))}${r.existing ? ` · ${esc(tn('dtb_existing', r.existing))}` : ''}</p><p class="small">${r.rows.map((x) => `<a href="#/drivers/${esc(x.driver_id)}">${esc(x.display_name)}</a>${x.status === 'vorhanden' ? ` <span class="muted">(${esc(t('dtb_was'))})</span>` : ''}`).join(', ')}</p>`;
      await viewDrivers(); // zeigt S.dlbRes einmal im aufgeklappten Bereich und setzt es zurück
    } catch (err) { toast(err.code === 'driver_inactive' && err.data && err.data.drivers ? t('dtb_inactive').replace('{list}', err.data.drivers.map((x) => x.display_name).join(', ')) : err.message, true); }
  };
}
async function viewDrivers() {
  const dsite = isMgr() ? vsDef('drvSite') || '' : '';
  // Backlog 611: „Fristen bis“ (Jahresplanung) – nur Leitung; Stichtag in der Vergangenheit zählt nicht
  const ddue = isMgr() && S.drvDueBy && S.drvDueBy >= bDate() ? S.drvDueBy : '';
  const dq = [S.drvInactive ? 'inactive=1' : '', dsite ? 'site=' + encodeURIComponent(dsite) : '', ddue ? 'due_by=' + ddue : ''].filter(Boolean).join('&');
  const dr = await api('GET', '/api/drivers' + (dq ? '?' + dq : '')); const list = dr.drivers;
  if (!isMgr()) { if (list.length) { location.replace('#/drivers/' + encodeURIComponent(list[0].id)); return; } /* ohne Verlaufseintrag: „Zurück“ führte sonst sofort wieder hierher (20.10.2026) */ render(`<h1>${esc(t('my_driver_file'))}</h1><p class="muted">${esc(t('no_driver_file'))}</p>`, 'more'); return; }
  let users = [];
  // nur wählbare Konten: Rolle Fahrer, aktiv, Umgebung der Ansicht, noch keiner Akte zugeordnet (Server prüft dasselbe, 19.10.2026)
  const ve = S.me.role === 'owner' && S.viewEnv ? S.viewEnv : S.me.environment; const linked = new Set([...list.map((d) => d.user_id).filter(Boolean), ...(dr.linked_user_ids || [])]); // auch Akten anderer Standorte/inaktive (Backlog 101)
  try { users = (await api('GET', '/api/users')).users.filter((u) => u.role === 'driver' && u.active && (!ve || !u.environment || u.environment === ve) && !linked.has(u.id)); } catch {}
  const html = `<h1>${esc(t('drivers'))}</h1>${helpLink('drivers')}<p class="small muted">${esc(t('driver_privacy'))}</p>
    <details class="panel"><summary>${esc(t('new_driver'))}</summary><form id="ndf"><label>${esc(t('display_name'))}</label><input name="display_name" required><label>${esc(t('personnel_no'))}</label><input name="personnel_no"><label>${esc(t('site'))}</label><input name="site">
      <label>${esc(t('app_account'))}</label><select name="user_id"><option value="">${esc(t('no_account'))}</option>${users.map((u) => `<option value="${esc(u.id)}">${esc(u.display_name)} (${esc(u.username)})</option>`).join('')}</select>
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    ${dtbHtml(list)}${dlbHtml(list)}
    <div class="actions" style="margin-top:0"><button type="button" class="btn secondary" id="dcsv">${esc(t('driver_csv'))}</button><button type="button" class="btn secondary" id="dprl">${esc(t('print'))}</button></div>
    <p class="noprint"><a href="#/drivers/records" id="drlink">${esc(t('dr_link'))} ›</a></p>
    ${printHead([S.drvInactive ? t('inactive_drivers') : '', dr.site ? `${t('site')}: ${dr.site === 'ohne' ? t('cs_nosite') : dr.site}` : '', dr.due_by ? t('ddue_label') + ' ' + fmtD(dr.due_by) : '', t('print_count').replace('{n}', list.length)])}
    <div class="noprint" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin:0 0 10px"><div><label for="ddueby">${esc(t('ddue_label'))}</label><input type="date" id="ddueby" min="${esc(bDate())}" value="${esc(ddue)}"></div><button type="button" class="btn secondary" id="dduenext">${esc(t('mdueby_next'))}</button><button type="button" class="btn secondary" id="ddueyear">${esc(t('mdueby_year'))}</button>${ddue ? `<button type="button" class="btn secondary" id="dueclr">${esc(t('ddue_clear'))}</button>` : ''}</div>${dr.due_by ? `<p class="small muted" data-ddue>${esc(t('ddue_hint').replace('{d}', fmtD(dr.due_by)))}</p>` : ''}
    <p class="noprint"><label style="display:inline-flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="dinact" ${S.drvInactive ? 'checked' : ''} style="width:auto"> ${esc(t('inactive_drivers'))}</label></p>
    ${(dr.site_options || []).length > 1 || dr.site ? `<div class="actions noprint" style="margin-top:0"><div>${siteSelect('dsite', '', dr.site_options, dr.site, t('site'), t('filter_all'))}</div></div>` : ''}${dr.no_site_hidden ? `<p class="small muted noprint" data-nositehidden>${esc(tn('drv_nosite_hidden', dr.no_site_hidden))}</p>` : ''}
    <div class="list">${list.map((d) => { const crit = d.status.items.filter((i) => i.status !== 'ok'); return `<a class="row ${d.status.overall === 'kritisch' ? 'p-kritisch' : d.status.overall === 'hinweis' ? 'p-mittel' : ''}" href="#/drivers/${esc(d.id)}"><span>🪪</span><span class="title">${esc(d.display_name)}${d.personnel_no ? ` <span class="small muted">${esc(d.personnel_no)}</span>` : ''}</span><span class="chip ${DST[d.status.overall]}">${esc(t('dov_' + d.status.overall))}</span><span class="sub">${d.due_items ? [...d.due_items.map((i) => `${i.kind === 'kontrolle' ? t('license_check') : i.kind === 'auslesung' ? t('tacho_card') : t('dk2_' + i.kind) + (i.title ? ' ' + i.title : '')}: ${fmtD(i.date)}`), d.username ? t('app_account') + ': ' + d.username : ''].filter(Boolean).map(esc).join(' · ') : [...crit.map((i) => `${t('dk2_' + i.kind)}${i.title ? ' ' + i.title : ''}: ${t('dst_' + i.status)} (${fmtD(i.valid_until)})`), d.status.check.status !== 'ok' ? `${t('license_check')}: ${t('dck_' + d.status.check.status)}` : '', d.status.tacho_status && d.status.tacho_status !== 'ok' ? `${t('tacho_card')}: ${t('tst_' + d.status.tacho_status)}` : '', !d.status.has_license ? t('no_license_doc') : '', d.username ? t('app_account') + ': ' + d.username : ''].filter(Boolean).map(esc).join(' · ')}</span></a>`; }).join('') || noneP()}</div>`;
  render(html, 'more');
  S.dtbRes = ''; S.dlbRes = ''; wireDtb(); wireDlb();
  const ia = $('#dinact'); if (ia) ia.onchange = () => { S.drvInactive = ia.checked; viewDrivers(); };
  const dse = $('#dsite'); if (dse) dse.onchange = () => { S.drvSite = dse.value; viewDrivers(); };
  { const di = $('#ddueby'); if (di) di.onchange = () => { S.drvDueBy = di.value && di.value >= bDate() ? di.value : null; viewDrivers(); };
    const dn = $('#dduenext'); if (dn) dn.onclick = () => { const [y, m] = bDate().split('-').map(Number); const x = new Date(Date.UTC(y, m + 1, 0)); S.drvDueBy = `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`; viewDrivers(); };
    const dy = $('#ddueyear'); if (dy) dy.onclick = () => { S.drvDueBy = `${Number(bDate().slice(0, 4)) + 1}-12-31`; viewDrivers(); };
    const dc = $('#dueclr'); if (dc) dc.onclick = () => { S.drvDueBy = null; viewDrivers(); }; }
  $('#dprl').onclick = () => window.print();
  $('#dcsv').onclick = async () => { try { download(await api('GET', '/api/drivers?format=csv' + (dq ? '&' + dq : '')), `fuhrpark-fahrer-fristen_${envFn()}_${S.drvInactive ? 'inaktiv_' : ''}${bDate()}${dr.site ? '_' + fnPart(dr.site) : ''}${dr.due_by ? '_bis_' + dr.due_by : ''}.csv`); } catch (err) { toast(err.message, true); } };
  const f = $('#ndf'); f.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(f)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; b.check_inactive = true; try {
    // ausgeschiedene Akte mit gleicher Personalnummer/gleichem Namen (Wiedereinstellung, Backlog 191): nachfragen – Abbrechen öffnet die alte Akte
    let r; try { r = await api('POST', '/api/drivers', b); } catch (err) {
      const mm = err.code === 'inactive_match' && err.data && err.data.matches; if (!mm || !mm.length) throw err;
      if (!confirm(t('dr_inactive_match').replace('{list}', mm.map((x) => x.personnel_no ? `${x.display_name} (${x.personnel_no})` : x.display_name).join(', ')))) { location.hash = '#/drivers/' + mm[0].id; return; }
      r = await api('POST', '/api/drivers', { ...b, confirm_inactive: true }); }
    location.hash = '#/drivers/' + r.id;
    // gleichnamige aktive Fahrer: nur Hinweis, gespeichert ist die Akte trotzdem (gleiche Namen sind möglich, 23.10.2026)
    const dn = r && r.duplicate_names;
    if (dn && dn.length) setTimeout(() => toast(tn('dup_driver_name_warn', dn.length).replace('{name}', b.display_name || '').replace('{list}', dn.slice(0, 3).map((x) => x.personnel_no ? x.display_name + ' (' + x.personnel_no + ')' : x.display_name).join(', ') + (dn.length > 3 ? ` +${dn.length - 3}` : '')), true), 400);
  } catch (err) { toast(linkedMsg(err), true); } };
}
async function viewDriver(id) {
  const x = await api('GET', '/api/drivers/' + id);
  const d = x.driver; const st = x.status; const mgr = isMgr();
  const cur = x.documents.filter((o) => !o.superseded); const old = x.documents.filter((o) => o.superseded);
  const docRow = (o) => { const it = st.items.find((i) => i.id === o.id); const rp = (st.replaced || []).find((i) => i.id === o.id); return `<tr><td>${esc(t('dk2_' + o.kind))}${o.title ? `<div class="small muted">${esc(o.title)}</div>` : ''}</td><td>${o.license_classes ? esc(o.license_classes) + '<br>' : ''}${o.number ? `<span class="small">${esc(o.number)}</span>` : ''}</td><td>${o.valid_until ? `<span class="chip ${it ? DST[it.status] : ''}">${fmtD(o.valid_until)}</span>${it && ['laeuft_ab', 'abgelaufen'].includes(it.status) ? ` <b class="small" data-dst>${esc(t('dst_' + it.status))}</b>` : ''}` : '–'}${rp ? `<div class="small muted" data-ddoc-replaced>${esc(rp.by_valid_until ? t('ddoc_replaced').replace('{date}', fmtD(rp.by_valid_until)) : t('ddoc_replaced_issued').replace('{date}', fmtD(rp.by_issued_on)))}</div>` : ''}</td><td class="small">${o.cancelled_at ? `<s>${esc(o.evidence)}</s>` : esc(o.evidence)}<div class="muted">${fmtD(o.created_at)}${o.created_by_name ? ' · ' + esc(o.created_by_name) : ''}</div>${o.cancelled_at ? `<div data-ddoc-cancelled><span class="chip">${esc(t('tacho_cancelled'))}</span> ${fmtD(o.cancelled_at)} – ${esc(o.cancel_reason || '')}</div>` : mgr ? `<button type="button" class="btn secondary small noprint" data-dcancel="${esc(o.id)}">${esc(t('tacho_cancel'))}</button>` : ''}</td></tr>`; };
  let html = `${mgr ? `<p class="noprint"><a class="backlink" href="#/drivers">‹ ${esc(t('back'))}</a></p>` : ''}<h1>🪪 ${esc(d.display_name)}</h1>${printHead([t('driver_file'), d.display_name])}
    <section class="panel"><dl class="kv"><dt>${esc(t('personnel_no'))}</dt><dd>${esc(d.personnel_no || '–')}</dd><dt>${esc(t('site'))}</dt><dd>${esc(d.site || '–')}</dd>
    <dt>${esc(t('status'))}</dt><dd><span class="chip ${DST[st.overall]}">${esc(t('dov_' + st.overall))}</span></dd>
    <dt>${esc(t('license_check'))}</dt><dd>${st.check.last ? `${fmtD(st.check.last)} · ${esc(t('lcr_' + st.check.result))}` : '–'}${st.check.due ? ` · ${esc(t('next_due'))} ${fmtD(st.check.due)}` : st.check.no_interval ? ` · <span class="muted">${esc(ownerT('lc_no_interval'))}</span>` : ''} <span class="chip ${DST[st.check.status]}">${esc(t('dck_' + st.check.status))}</span></dd>
    ${x.vehicles.length ? `<dt>${esc(t('vehicles'))}</dt><dd>${x.vehicles.map((v) => plate(v.plate)).join(' ')}</dd>` : ''}</dl>
    ${!d.active ? `<p class="chip">${esc(t('driver_inactive'))}</p>` : ''}${(x.driving_ban_fines || []).length ? `<div class="panel alert small" id="dban" role="note" style="margin-top:8px">${esc(t('drv_ban_file'))} ${x.driving_ban_fines.map((b) => `<a href="#/fines/${esc(b.id)}" style="white-space:nowrap">${esc(b.fine_no)}</a> (${esc(tn('ban_months', b.months))}, ${esc(t('fs_' + b.status))})`).join(', ')}</div>` : ''}${!st.has_license ? `<div class="alert small" style="margin-top:8px">${esc(t('no_license_doc'))}</div>` : ''}${S.me.role === 'owner' ? `<div class="actions"><button type="button" class="btn secondary" id="ddex" title="${esc(t('data_export_hint'))}">${esc(t('data_export'))}</button></div>` : ''}<div class="actions noprint"><button type="button" class="btn secondary" id="ddprt">${esc(t('print'))}</button></div></section>
    <h2>${esc(t('driver_docs'))}</h2>${cur.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('kind'))}</th><th>${esc(t('ddoc_col_detail'))}</th><th>${esc(t('valid_until'))}</th><th>${esc(t('evidence'))}</th></tr></thead><tbody>${cur.map(docRow).join('')}</tbody></table></div>` : noneP()}
    ${old.length ? `<details id="ddhist"><summary>${esc(t('history'))} (${old.length})</summary><div class="scroll"><table class="stack"><thead><tr><th>${esc(t('kind'))}</th><th>${esc(t('ddoc_col_detail'))}</th><th>${esc(t('valid_until'))}</th><th>${esc(t('evidence'))}</th></tr></thead><tbody>${old.map(docRow).join('')}</tbody></table></div></details>` : ''}`;
  // Leitung: erste Fahrerkarten-Auslesung auch ohne erfasste Fahrerkarte erfassbar (vorher nur per Import, 18.10.2026)
  if (!x.tacho && mgr) x.tacho = { last: null, due: null, days: null, status: 'keine' };
  if (x.tacho) html += `<h2>${esc(t('tacho_card'))}</h2><section class="panel"><dl class="kv"><dt>${esc(t('tacho_last'))}</dt><dd>${x.tacho.last ? fmtD(x.tacho.last) : '–'}</dd><dt>${esc(t('tacho_due'))}</dt><dd>${x.tacho.due ? fmtD(x.tacho.due) + ' ' : ''}<span class="chip ${TST[x.tacho.status]}">${esc(t('tst_' + x.tacho.status))}</span></dd></dl>
    ${x.tacho_downloads.length ? `<details id="dthist"><summary>${esc(t('history'))} (${x.tacho_downloads.length}${x.tacho_downloads_truncated ? '+' : ''})</summary>${tachoHistList(x.tacho_downloads, mgr)}${x.tacho_downloads_truncated ? `<p class="small muted dtrunc">${esc(t('hist_truncated').replace('{n}', x.tacho_downloads.length))}</p>` : ''}</details>` : ''}
    ${mgr ? `<form id="tdf" class="actions" style="flex-wrap:wrap;align-items:flex-end"><div><label>${esc(t('tacho_date'))}</label><input type="date" name="downloaded_on" required value="${bDate()}"></div><div style="flex:1;min-width:200px"><label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('tacho_ev_ph'))}"></div><button class="btn secondary">${esc(t('tacho_record'))}</button></form>` : ''}</section>`;
  // App-Konto nachträglich verknüpfen/lösen (z. B. Akte vor der Einladung angelegt oder nach Umgebungs-/Rollenwechsel gelöst; 19.10.2026)
  let linkUsers = [];
  if (mgr) { try { const taken = new Set(x.linked_user_ids || []); linkUsers = (await api('GET', '/api/users')).users.filter((u) => u.role === 'driver' && (u.active || u.id === d.user_id) && (!d.environment || !u.environment || u.environment === d.environment) && (u.id === d.user_id || !taken.has(u.id))); } catch {} if (d.user_id && !linkUsers.some((u) => u.id === d.user_id)) linkUsers.unshift({ id: d.user_id, display_name: d.username || d.user_id, username: d.username || '' }); }
  if (mgr) {
    html += `<details class="panel"><summary>${esc(t('add_driver_doc'))}</summary><form id="ddf"><label>${esc(t('kind'))}</label><select name="kind">${['fuehrerschein', 'fahrerkarte', 'code95', 'unterweisung', 'sonstiges'].map((k) => `<option value="${k}">${esc(t('dk2_' + k))}</option>`).join('')}</select>
      <label>${esc(t('doc_title'))}</label><input name="title" placeholder="${esc(t('doc_title_ph'))}"><span id="ddcls"><label>${esc(t('license_classes'))}</label><input name="license_classes" placeholder="C, CE"></span><label>${esc(t('doc_number'))}</label><input name="number">
      <label>${esc(t('issued_on'))}</label><input type="date" name="issued_on"><label>${esc(t('valid_until'))} <span class="hint">${esc(t('driver_valid_until_hint'))}</span></label><input type="date" name="valid_until">
      <label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('driver_ev_ph'))}"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
      <details class="panel"><summary>${esc(t('record_license_check'))}</summary><form id="lcf"><label>${esc(t('date'))}</label><input type="date" name="checked_on" required value="${bDate()}">
      <label>${esc(t('result'))}</label><select name="result">${['in_ordnung', 'maengel', 'nicht_vorgelegt'].map((r) => `<option value="${r}">${esc(t('lcr_' + r))}</option>`).join('')}</select><label>${esc(t('note'))}</label><input name="note"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
    if (x.license_checks.length) html += `<details id="dlchist"><summary>${esc(t('license_check'))} – ${esc(t('history'))} (${x.license_checks.length}${x.license_checks_truncated ? '+' : ''})</summary><ul class="small">${x.license_checks.map((c) => `<li data-lc="${esc(c.id)}">${c.cancelled_at ? '<s>' : ''}${fmtD(c.checked_on)} · ${esc(t('lcr_' + c.result))}${c.checked_by_name ? ' · ' + esc(c.checked_by_name) : ''}${c.note ? ' – ' + esc(c.note) : ''}${c.cancelled_at ? `</s> <span class="chip">${esc(t('tacho_cancelled'))}</span> ${fmtD(c.cancelled_at)} – ${esc(c.cancel_reason || '')}` : mgr ? ` <button type="button" class="btn secondary small noprint" data-lccancel="${esc(c.id)}">${esc(t('tacho_cancel'))}</button>` : ''}</li>`).join('')}</ul>${x.license_checks_truncated ? `<p class="small muted dtrunc">${esc(t('hist_truncated').replace('{n}', x.license_checks.length))}</p>` : ''}</details>`;
    html += `<details class="panel"><summary>${esc(t('edit_master'))}</summary><form id="edf"><label>${esc(t('display_name'))}</label><input name="display_name" required value="${esc(d.display_name)}"><label>${esc(t('personnel_no'))}</label><input name="personnel_no" value="${esc(d.personnel_no || '')}"><label>${esc(t('site'))}</label><input name="site" value="${esc(d.site || '')}"><label>${esc(t('app_account'))}</label><select name="user_id"><option value="">${esc(t('no_account'))}</option>${linkUsers.map((u) => `<option value="${esc(u.id)}"${u.id === d.user_id ? ' selected' : ''}>${esc(u.display_name)} (${esc(u.username)})</option>`).join('')}</select>
      <label class="check"><input type="checkbox" name="active" ${d.active ? 'checked' : ''}> ${esc(t('active'))}</label><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>`;
  }
  render(html, 'more');
  $('#ddprt').onclick = () => window.print();
  const dx = $('#ddex'); if (dx) dx.onclick = async () => { if (!confirm(t('data_export_hint'))) return; try { const r = await api('GET', `/api/drivers/${id}/data-export`); dexTrunc(r); download(r instanceof Blob ? r : new Blob([JSON.stringify(r, null, 1)], { type: 'application/json' }), `datenauskunft_fahrer_${String(d.personnel_no || d.display_name || id).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || String(id).slice(0, 8)}_${bDate()}.json`); } catch (err) { toast(err.message, true); } };
  const post = async (path, b) => { for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; try { const r = await api('POST', path, b); toast(r && r.older_than_current ? t('ddoc_older_saved') : '✓'); viewDriver(id); } catch (err) { toast(err.message, true); } };
  bindTachoCancel(document, () => viewDriver(id));
  // Nachweis stornieren (Tippfehler): bleibt mit Begründung im Verlauf, der neueste verbliebene gilt wieder
  $$('[data-lccancel]').forEach((b) => (b.onclick = async () => { const reason = prompt(t('lc_cancel_reason')); if (!reason) return; try { await api('POST', `/api/drivers/${encodeURIComponent(id)}/license-checks/${b.dataset.lccancel}/cancel`, { reason }); toast('✓'); viewDriver(id); } catch (err) { toast(err.message, true); } }));
  $$('[data-dcancel]').forEach((b) => (b.onclick = async () => { const reason = prompt(t('ddoc_cancel_reason')); if (!reason) return; try { await api('POST', `/api/drivers/${encodeURIComponent(id)}/documents/${b.dataset.dcancel}/cancel`, { reason }); toast('✓'); viewDriver(id); } catch (err) { toast(err.message, true); } }));
  const ddf = $('#ddf');
  // Klassen nur beim Führerschein (Server speichert sie sonst nicht – vorher still verworfen, 20.10.2026)
  if (ddf) { const cls = () => { $('#ddcls').hidden = ddf.kind.value !== 'fuehrerschein'; }; ddf.kind.onchange = cls; cls();
    ddf.onsubmit = (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(ddf)); if (b.kind !== 'fuehrerschein') delete b.license_classes; return post(`/api/drivers/${id}/documents`, b); }; }
  const tdf = $('#tdf'); if (tdf) tdf.onsubmit = (e) => { e.preventDefault(); return post('/api/tacho/downloads', { kind: 'fahrerkarte', driver_id: id, ...Object.fromEntries(new FormData(tdf)) }); };
  const lcf = $('#lcf'); if (lcf) lcf.onsubmit = (e) => { e.preventDefault(); return post(`/api/drivers/${id}/license-checks`, Object.fromEntries(new FormData(lcf))); };
  const edf = $('#edf'); if (edf) edf.onsubmit = async (e) => { e.preventDefault(); const all = Object.fromEntries(new FormData(edf)); all.active = !!edf.active.checked;
    // nur geänderte Felder auf dem gelesenen Stand senden (älteres Formular machte sonst z. B. eine Deaktivierung still rückgängig)
    const was = { display_name: d.display_name || '', personnel_no: d.personnel_no || '', site: d.site || '', active: !!d.active, user_id: d.user_id || '' };
    const b = Object.fromEntries(Object.entries(all).filter(([k, v]) => v !== was[k])); if (!Object.keys(b).length) { toast('✓'); return; }
    if (d.updated_at) b.expected_updated_at = d.updated_at; try { const r = await api('PATCH', `/api/drivers/${id}`, b);
      // ausgeschieden: verknüpftes Konto weiter aktiv / Fahrzeug weiter zugeordnet → Hinweis (Backlog 190)
      const h = []; if (r && r.account_still_active) h.push(t('dr_left_account_active').replace('{name}', r.account_still_active.name)); if (r && r.open_assignments) h.push(tn('dr_left_assignments', r.open_assignments));
      toast(h.length ? h.join(' ') : '✓'); viewDriver(id); } catch (err) { toast(linkedMsg(err), true); } };
}
// Fahrzeug außer Betrieb kenntlich (Nachfolger kann dasselbe Kennzeichen tragen, 23.10.2026)
const emScope = (c) => (c.scope === 'vehicle' ? (c.plate || t('em_scope_vehicle')) + (c.vehicle_active === false ? ` (${t('inactive_vehicles')})` : '') : c.scope === 'site' ? `${t('site')}: ${c.site}` : t('em_scope_all'));
// Backlog 429: Lücken der Erreichbarkeit über die Nummern „für alle Fahrzeuge“ (nur wenn alle Zeiten tragen; Feiertage nicht eingerechnet)
function emGapsPanel(contacts) {
  const g = coverageGaps(contacts.filter((c) => c.scope === 'all').map((c) => c.hours));
  if (!g) return '';
  if (!g.length) return `<p class="panel small" id="emgaps" data-gaps="0" role="note">${esc(t('em_gaps_none'))}</p>`;
  const wd = (x) => t('em_wd_' + x.wd);
  const txt = g[0].all ? t('em_gaps_all') : g.map((x) => `${wd(x.from)} ${x.from.hm} – ${x.to.wd === x.from.wd && x.to.hm > x.from.hm ? '' : wd(x.to) + ' '}${x.to.hm}`).join('; ');
  return `<section class="panel warn small" id="emgaps" data-gaps="${g.length}" role="note"><p style="margin:0"><b>${esc(t('em_gaps_title'))}</b></p><p style="margin:4px 0" translate="no">${esc(txt)}</p><p class="muted" style="margin:0">${esc(t('em_gaps_hint'))}</p></section>`;
}
// Backlog 434: Feiertage der nächsten 60 Tage, an denen wegen „nicht an Feiertagen“ zusätzlich keine Nummer „für alle Fahrzeuge“ besetzt ist
function emHolGapsPanel(contacts, now = new Date()) {
  const g = holidayGaps(contacts.filter((c) => c.scope === 'all').map((c) => c.hours), now, 60);
  if (!g || !g.length) return '';
  const name = (x) => `${x.prev ? t('em_hol_after').replace('{x}', t('hol_' + x.key)) : t('hol_' + x.key)}${x.states.length ? ` (${x.states.map((st) => t('st_' + st)).join(', ')})` : ''}`;
  const li = g.map((x) => `<li data-emholgap="${esc(x.day)}"><span style="white-space:nowrap">${esc(t('em_wd_' + x.wd))} ${fmtD(x.day)}</span> · ${esc(x.hol.map(name).join(', '))}: <b>${x.all ? esc(t('em_allday')) : x.ranges.map(([a, b]) => `<span style="white-space:nowrap">${esc(`${a}–${b}`)}</span>`).join(', ')}</b></li>`).join('');
  return `<section class="panel warn small" id="emholgaps" data-holgaps="${g.length}" role="note"><p style="margin:0"><b>${esc(t('em_holgaps_title'))}</b></p><ul style="margin:4px 0;padding-left:18px">${li}</ul><p class="muted" style="margin:0">${esc(t('em_holgaps_hint'))}</p></section>`;
}
async function viewEmergencyEdit() {
  render(`<p class="muted">${esc(t('loading'))}</p>`, 'more');
  const showArch = !!S.emArch;
  const [d, vs, sites] = await Promise.all([api('GET', '/api/emergency/contacts' + (showArch ? '?archived=1' : '')), vehiclesCached(), api('GET', '/api/sites').then((r) => r.sites.filter((x) => x !== 'ohne')).catch(() => [])]);
  const edit = S.emEdit ? d.contacts.find((c) => c.id === S.emEdit) : null;
  const e = edit || { kind: 'dispo', scope: 'all' };
  const opt = (v, cur, label) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label)}</option>`;
  const emFull = !edit && d.contacts.length >= d.max_active; // voll: nur Bearbeiten/Archivieren, kein neues Formular (Server lehnt ab)
  const form = showArch ? '' : emFull ? `<p class="panel small" id="emfull" role="note">${esc(t('em_full').replace('{m}', d.max_active))}</p>` : `<section class="panel"><h2 style="margin-top:0">${esc(t(edit ? 'em_edit' : 'em_add'))}</h2><form id="emf">${edit ? `<input type="hidden" name="expected_updated_at" value="${esc(edit.updated_at || '')}">` : ''}
    <label>${esc(t('em_kind'))}</label><select name="kind">${d.kinds.map((k) => opt(k, e.kind, t('em_kind_' + k))).join('')}</select>
    <label>${esc(t('em_label'))}</label><input name="label" maxlength="60" required value="${esc(e.label || '')}">
    <label>${esc(t('em_phone'))}</label><input name="phone" type="tel" inputmode="tel" maxlength="30" required value="${esc(e.phone || '')}"><p class="small muted" id="emnat" role="status" hidden></p>
    <label>${esc(t('em_note'))}</label><input name="note" maxlength="200" value="${esc(e.note || '')}">
    <fieldset id="emhrs" class="panel" style="margin:.6rem 0"><legend>${esc(t('em_hours'))}</legend><p class="small muted" style="margin-top:0">${esc(t('em_hours_hint'))}</p>
      <div class="chips" role="group" aria-label="${esc(t('em_hours_days'))}">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<label class="check" style="white-space:nowrap;display:inline-flex;margin-right:10px"><input type="checkbox" data-emwd="${d}"${e.hours && e.hours.days.includes(String(d)) ? ' checked' : ''}> ${esc(t('em_wd_' + d))}</label>`).join('')}</div>
      <div class="grid2"><div><label for="emfrom">${esc(t('em_hours_from'))}</label><input type="time" id="emfrom" name="hours_from" value="${esc((e.hours && e.hours.from) || '')}"></div><div><label for="emto">${esc(t('em_hours_to'))}</label><input type="time" id="emto" name="hours_to" value="${esc((e.hours && e.hours.to) || '')}"></div></div>
      ${(() => { const more = (e.hours && e.hours.more) || []; return `<details id="emmore" style="margin:.4rem 0"${more.length ? ' open' : ''}><summary>${esc(t('em_more_title'))}</summary><p class="small muted" style="margin:.3rem 0">${esc(t('em_more_hint'))}</p>${Array.from({ length: MORE_MAX }, (_, i) => { const w = more[i] || {}; return `<div class="emmorew" data-emmore="${i}" role="group" aria-label="${esc(t('em_more_n').replace('{n}', i + 1))}"><p class="small" style="margin:.4rem 0 .2rem"><b>${esc(t('em_more_n').replace('{n}', i + 1))}</b></p><div class="chips">${[1, 2, 3, 4, 5, 6, 7].map((d) => `<label class="check" style="white-space:nowrap;display:inline-flex;margin-right:10px"><input type="checkbox" data-emmwd="${d}"${w.days && String(w.days).includes(String(d)) ? ' checked' : ''}> ${esc(t('em_wd_' + d))}</label>`).join('')}</div><div class="grid2"><div><label for="emmf${i}">${esc(t('em_hours_from'))}</label><input type="time" id="emmf${i}" data-emmfrom value="${esc(w.from || '')}"></div><div><label for="emmt${i}">${esc(t('em_hours_to'))}</label><input type="time" id="emmt${i}" data-emmto value="${esc(w.to || '')}"></div></div></div>`; }).join('')}</details>`; })()}
      <label class="check"><input type="checkbox" id="emnohol"${e.hours && e.hours.no_holidays ? ' checked' : ''}> ${esc(t('em_no_hol'))}</label>
      <div id="emst"><label for="emstate">${esc(t('em_hol_state'))}</label><select id="emstate"${e.hours && e.hours.no_holidays ? '' : ' disabled'}><option value="">${esc(t('em_hol_state_none'))}</option>${STATES.map((x) => opt(x, (e.hours && e.hours.holiday_state) || '', t('st_' + x))).join('')}</select><p class="small muted" style="margin:.2rem 0 0">${esc(t('em_hol_state_hint'))}</p></div></fieldset>
    <label>${esc(t('em_scope'))}</label><select name="scope" id="emscope">${['all', 'site', 'vehicle'].map((k) => opt(k, e.scope, t('em_scope_' + k))).join('')}</select>
    <div id="emsite"${e.scope === 'site' ? '' : ' hidden'}><label>${esc(t('site'))}</label><select name="site">${(() => { const cur = (e.site && sites.find((x) => siteKeyUi(x) === siteKeyUi(e.site))) || e.site; return [...new Set([...sites, ...(cur ? [cur] : [])])].map((x) => opt(x, cur, x)).join(''); })()}</select></div>
    <div id="emveh"${e.scope === 'vehicle' ? '' : ' hidden'}><label>${esc(t('vehicle'))}</label><select name="vehicle_id">${vs.slice().sort((a, b) => plateCmp(a.plate, b.plate)).map((v) => opt(v.id, e.vehicle_id, v.plate)).join('')}${e.vehicle_id && !vs.some((v) => v.id === e.vehicle_id) ? opt(e.vehicle_id, e.vehicle_id, e.plate || e.vehicle_id) : ''}</select></div>
    <div class="actions"><button class="btn">${esc(t('save'))}</button>${edit ? `<button type="button" class="btn secondary" id="emcancel">${esc(t('cancel'))}</button>` : ''}</div></form></section>`;
  const rows = d.contacts.map((c) => `<div class="row emman"><span class="title"><b>${esc(c.label)}</b> · <a class="emphone" href="${esc(telHref(c.phone))}">${esc(c.phone)}</a> <span class="chip">${esc(t('em_kind_' + c.kind))}</span><br><span class="small">${esc(t('em_scope'))}: ${esc(emScope(c))}${c.note ? ' · ' + esc(c.note) : ''}</span>${c.hours ? `<br><span class="small emhours">${esc(t('em_hours_short'))}: ${esc(emHoursText(c.hours))}</span>` : ''}<br><span class="small muted">${showArch ? `${esc(t('em_archived_at'))} ${fmtDT(c.archived_at)} · ${esc(c.archived_by_name || '')}` : `${fmtDT(c.updated_at)} · ${esc(c.changed_by_name || '')}`}</span></span>${showArch ? '' : `<span class="actions" style="margin:0"><button type="button" class="btn secondary" data-emedit="${esc(c.id)}">${esc(t('em_edit'))}</button><button type="button" class="btn secondary" data-emarch="${esc(c.id)}">${esc(t('em_archive'))}</button></span>`}</div>`).join('');
  render(`<p class="noprint"><a class="backlink" href="#/emergency">‹ ${esc(t('back'))}</a></p><h1>${esc(t('em_manage'))}</h1><p class="small muted">${esc(t('em_manage_hint'))}</p>
    <div class="actions" role="group" aria-label="${esc(t('em_manage'))}"><button type="button" class="btn ${showArch ? 'secondary' : ''}" data-emtab="0" aria-pressed="${!showArch}">${esc(t('em_active'))}</button><button type="button" class="btn ${showArch ? '' : 'secondary'}" data-emtab="1" aria-pressed="${showArch}">${esc(t('em_archive_list'))}</button></div>
    ${showArch ? '' : emGapsPanel(d.contacts) + emHolGapsPanel(d.contacts)}${form}${showArch ? '' : `<p class="small muted" id="emcount">${esc(t('em_count').replace('{n}', d.contacts.length).replace('{m}', d.max_active))}</p>`}
    ${showArch && d.truncated ? `<p class="small muted" id="emartrunc">${esc(t('em_arch_truncated').replace('{n}', d.contacts.length))}</p>` : ''}<div class="list" id="emlist">${rows || noneP()}</div>`, 'more');
  $$('[data-emtab]').forEach((b) => (b.onclick = () => { S.emArch = b.dataset.emtab === '1'; S.emEdit = null; viewEmergencyEdit(); }));
  const f = $('#emf');
  if (f) {
    const natHint = () => { const a = telAbroad(f.elements.phone.value); $('#emnat').hidden = !a; $('#emnat').textContent = a ? t('em_phone_national').replace('{p}', a.label) : ''; };
    f.elements.phone.addEventListener('input', natHint); natHint();
    $('#emnohol').onchange = () => { $('#emstate').disabled = !$('#emnohol').checked; };
    $('#emscope').onchange = () => { const sc = $('#emscope').value; $('#emsite').hidden = sc !== 'site'; $('#emveh').hidden = sc !== 'vehicle'; };
    const cc = $('#emcancel'); if (cc) cc.onclick = () => { S.emEdit = null; viewEmergencyEdit(); };
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const b = Object.fromEntries(new FormData(f));
      if (b.scope !== 'site') delete b.site; if (b.scope !== 'vehicle') delete b.vehicle_id;
      // Erreichbarkeit: Wochentage aus den Kästchen; ohne Wochentage keine Zeiten (Server weist Uhrzeit ohne Tage ab)
      b.hours_days = $$('[data-emwd]').filter((x) => x.checked).map((x) => x.dataset.emwd).join('');
      b.hours_no_holidays = !!b.hours_days && $('#emnohol').checked;
      b.hours_holiday_state = b.hours_no_holidays ? $('#emstate').value || null : null; // Backlog 431
      // Backlog 430: weitere Zeitspannen – ganz leere Blöcke entfallen; unvollständige gehen an den Server (der nennt, was fehlt)
      b.hours_more = $$('[data-emmore]').map((x) => ({ days: $$('[data-emmwd]', x).filter((c) => c.checked).map((c) => c.dataset.emmwd).join(''), from: $('[data-emmfrom]', x).value || null, to: $('[data-emmto]', x).value || null })).filter((w) => w.days || w.from || w.to);
      if (!b.hours_days && !b.hours_more.length) b.hours_more = null;
      try { if (edit) await api('PATCH', `/api/emergency/contacts/${edit.id}`, b); else await api('POST', '/api/emergency/contacts', b); toast(t('em_saved')); S.emEdit = null; viewEmergencyEdit(); } catch (err) { toast(err.message, true); }
    };
  }
  $$('[data-emedit]').forEach((b) => (b.onclick = async () => { S.emEdit = b.dataset.emedit; await viewEmergencyEdit(); window.scrollTo(0, 0); }));
  $$('[data-emarch]').forEach((b) => (b.onclick = async () => { if (!confirm(t('em_archive_confirm'))) return; try { await api('POST', `/api/emergency/contacts/${b.dataset.emarch}/archive`); if (S.emEdit === b.dataset.emarch) S.emEdit = null; toast(t('em_saved')); viewEmergencyEdit(); } catch (err) { toast(err.message, true); } }));
}
async function viewQrSheet(oneId) {
  if (!isMgr()) { location.hash = '#/'; return; }
  const all = (await api('GET', '/api/vehicles')).vehicles;
  const k = S.qrKind || 'lkw';
  const list = oneId ? all.filter((v) => v.id === oneId) : all.filter((v) => k === 'all' || v.kind === k).sort((a, b) => plateCmp(a.plate, b.plate));
  const card = (v) => { const link = `${location.origin}/#/v/${v.id}`; return `<div class="qrcard"><div class="qr">${qrSvg(link, { label: `${t('report_damage')} ${v.plate}` })}</div><div>${plate(v.plate)}<p class="small"><b>${esc(t('qr_sticker_text'))}</b></p><p class="small muted">${esc(t('qr_sticker_sub'))}</p></div></div>`; };
  render(`<div class="noprint">${oneId ? `<p><a class="backlink" href="#/vehicles/${esc(oneId)}">‹ ${esc(t('back'))}</a></p>` : `<p><a class="backlink" href="#/vehicles">‹ ${esc(t('back'))}</a></p>`}<h1>${esc(t('qr_sheet'))}</h1><p class="small muted">${esc(t('qr_sheet_hint'))}</p>
    ${oneId ? '' : `<div class="actions" style="flex-wrap:wrap">${[['lkw', t('vk_lkw')], ['anhaenger', t('vk_anhaenger')], ['all', t('filter_all')]].map(([key, l]) => `<button type="button" class="btn ${k === key ? '' : 'secondary'}" data-qk="${key}">${esc(l)}</button>`).join('')}</div>`}
    <div class="actions"><button type="button" class="btn" id="qprt">${esc(t('print'))} (${list.length})</button></div></div>
    <div class="qrsheet">${list.map(card).join('') || noneP()}</div>`, 'more');
  $$('[data-qk]').forEach((b) => (b.onclick = () => { S.qrKind = b.dataset.qk; viewQrSheet(); }));
  $('#qprt').onclick = () => window.print();
}
// Verlauf der Auslesungen für einen Zeitraum mit Fristüberschreitungen (Backlog 245, Betriebsprüfung) – Ansicht, CSV, Ausdruck
async function viewTachoHistory() {
  if (!isMgr()) return render(`<p>${esc(t('err_forbidden'))}</p>`);
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k) || ''; sessionStorage.setItem(k, v); } catch { return ''; } return ''; };
  const qs = () => { const f = ss('cfp_th_from'); const to = ss('cfp_th_to'); return [f && 'from=' + encodeURIComponent(f), to && 'to=' + encodeURIComponent(to)].filter(Boolean).join('&'); };
  let h;
  try { h = await api('GET', '/api/tacho/history' + (qs() ? '?' + qs() : '')); } catch (err) { ss('cfp_th_from', ''); ss('cfp_th_to', ''); toast(err.message, true); h = await api('GET', '/api/tacho/history'); }
  const today = bDate();
  const gapTxt = (g) => `${esc(t('th_overdue').replace('{d}', fmtD(g.overdue_from)))} – ${g.open ? `<b>${esc(t('th_open'))}</b>` : g.cut ? esc(t('th_cut')) : esc(t('th_until').replace('{d}', fmtD(g.until)))} · ${esc(nDays(g.days))}`;
  const table = (list, kind) => list.length ? `<div class="scroll"><table class="stack printsm" data-th="${kind}"><thead><tr><th>${esc(kind === 'drivers' ? t('role_driver') : t('vehicle'))}</th><th>${esc(t('th_downloads'))}</th><th>${esc(t('th_gaps'))}</th></tr></thead><tbody>${list.map((x) => `<tr>
      <td>${kind === 'drivers' ? `<a href="#/drivers/${esc(x.id)}">${esc(x.display_name)}</a>${x.personnel_no ? `<div class="small muted">${esc(x.personnel_no)}</div>` : ''}` : `<a href="#/vehicles/${encodeURIComponent(x.id)}">${plate(x.plate)}</a>`}${x.site ? `<div class="small muted">${esc(x.site)}</div>` : ''}${x.active ? '' : `<div><span class="chip">${esc(t('th_inactive'))}</span></div>`}</td>
      <td data-label="${esc(t('th_downloads'))}"><div><b>${x.count}</b>${x.downloads.length ? ': ' + x.downloads.map((d) => esc(fmtD(d))).join(', ') : ''}</div>${x.last_before ? `<div class="small muted">${esc(t('th_before'))}: ${esc(fmtD(x.last_before))}</div>` : ''}</td>
      <td data-label="${esc(t('th_gaps'))}">${x.gaps.length ? `<ul class="small" style="margin:0;padding-left:1.1em">${x.gaps.map((g) => `<li>${gapTxt(g)}</li>`).join('')}</ul>` : x.none_recorded ? `<span class="chip mittel" data-thnone>${esc(t(x.no_card ? 'th_none_card' : 'th_none_recorded'))}</span>` : `<span class="chip ok">${esc(t('th_no_gap'))}</span>`}</td></tr>`).join('')}</tbody></table></div>` : `<p class="muted">${esc(t('th_none'))}</p>`;
  const sum = (k) => `${h.totals[k].subjects} · ${esc(t('th_with_gaps').replace('{n}', h.totals[k].with_gaps))}${h.totals[k].none_recorded ? ' · ' + esc(t('th_none_count').replace('{n}', h.totals[k].none_recorded)) : ''}`;
  render(`<p class="noprint"><a class="backlink" href="#/tacho">‹ ${esc(t('back'))}</a></p><h1>${esc(t('th_title'))}</h1>
    <p class="small muted">${esc(t('th_hint'))}</p><p class="small muted">${esc(t('tacho_rule'))}</p>
    <p class="print-only small">${printStamp()} · ${esc(fmtD(h.from))} – ${esc(fmtD(h.to))} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <form id="thf" class="panel noprint"><div class="grid2"><div><label for="thfrom">${esc(t('from'))}</label><input type="date" id="thfrom" value="${esc(h.from)}" max="${esc(today)}"></div><div><label for="thto">${esc(t('to'))}</label><input type="date" id="thto" value="${esc(h.to)}" max="${esc(today)}"></div></div>
      <div class="actions"><button class="btn">${esc(t('show'))}</button><button type="button" class="btn secondary" id="thcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="thprt">${esc(t('print'))}</button></div></form>
    ${h.truncated ? `<p class="panel warn" id="thtrunc">${esc(t('th_truncated').replaceAll('{n}', h.max))}</p>` : ''}
    <h2>${esc(t('tacho_cards'))} <span class="small muted">${sum('drivers')}</span></h2>${table(h.drivers, 'drivers')}
    <h2>${esc(t('tacho_vus'))} <span class="small muted">${sum('vehicles')}</span></h2>${table(h.vehicles, 'vehicles')}`, 'more');
  $('#thf').onsubmit = (e) => { e.preventDefault(); ss('cfp_th_from', $('#thfrom').value); ss('cfp_th_to', $('#thto').value); viewTachoHistory(); };
  $('#thprt').onclick = () => window.print();
  $('#thcsv').onclick = async () => { try { download(await api('GET', `/api/tacho/history?from=${encodeURIComponent(h.from)}&to=${encodeURIComponent(h.to)}&format=csv`), `fuhrpark-auslesungen-verlauf_${h.from}_${h.to}.csv`); } catch (err) { toast(err.message, true); } };
}
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
    ${(r.site_options || []).length > 1 || r.site ? `<div class="actions noprint" style="margin-top:0"><div>${siteSelect('tsite', '', r.site_options, r.site, t('site'), t('filter_all'))}</div></div>` : ''}${r.no_site_hidden ? `<p class="small muted noprint" data-nositehidden>${esc(tn('drv_nosite_hidden', r.no_site_hidden))}</p>` : ''}
    <div class="list">${rows.map((x) => `<a class="row ${x.status === 'ueberfaellig' ? 'p-kritisch' : x.status === 'bald' ? 'p-mittel' : ''}" href="${tab === 'drivers' ? '#/drivers/' + esc(x.id) : '#/vehicles/' + encodeURIComponent(x.id)}">${tab === 'drivers' ? '<span>🪪</span>' : plate(x.plate)}<span class="title">${tab === 'drivers' ? esc(x.display_name) : x.due ? `${esc(t('tacho_due'))} ${fmtD(x.due)}` : '–'}</span><span class="chip ${TST[x.status]}">${esc(t('tst_' + x.status))}</span><span class="sub">${[tab === 'drivers' && x.due && `${esc(t('tacho_due'))} ${fmtD(x.due)}`, `${esc(t('tacho_last'))}: ${x.last ? fmtD(x.last) : '–'}`, x.site && esc(x.site), tab === 'drivers' && x.personnel_no && esc(x.personnel_no)].filter(Boolean).join(' · ')}</span></a>`).join('') || noneP()}</div>
    ${tab === 'drivers' && r.without_card.length ? `<p class="small muted">${esc(t('tacho_without_card'))}: ${r.without_card.map((d) => esc(d.display_name)).join(', ')}</p>` : ''}
    ${list.length ? `<details class="panel"><summary>${esc(t('tacho_record'))}</summary><form id="tnf"><label>${esc(tab === 'drivers' ? t('role_driver') : t('vehicle'))}</label><select name="target" required>${opts}</select>
      <label>${esc(t('tacho_date'))}</label><input type="date" name="downloaded_on" required value="${bDate()}"><label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('tacho_ev_ph'))}"><label>${esc(t('note'))}</label><input name="note" maxlength="500">
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}
    <div class="actions"><button type="button" class="btn secondary" id="tcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="tprt">${esc(t('print'))}</button></div>
    <p class="noprint"><a href="#/tacho/history" id="thlink">${esc(t('th_link'))} ›</a></p>
    <section class="panel noprint"><h2 style="margin-top:0">${esc(t('tacho_import'))}</h2><p class="small muted">${esc(t('tacho_import_hint'))}</p>
      <label for="tsrc">${esc(t('tacho_import_src'))}</label><input id="tsrc" maxlength="300" placeholder="${esc(t('tacho_ev_ph'))}"><input type="file" id="timp" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('tacho_import'))}" style="margin-top:8px"><div id="timpr"></div></section>`, 'more');
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
// Fuhrparkagent läuft planmäßig alle 15 (Betrieb) bzw. 30 Min. (Test): > 75 Min. ohne Lauf, offener Lauf oder Fehler → Hinweis
const agentStale = (r) => !r || !!r.error || nowMs() - Date.parse(r.finished_at || r.started_at) > 75 * 60000 || (!r.finished_at && nowMs() - Date.parse(r.started_at) > 10 * 60000);
const AF_SEVS = ['all', 'act', 'kritisch', 'handeln', 'hinweis', 'info'];
const afSevMatch = (sel, sv) => sel === 'all' || sv === sel || (sel === 'act' && (sv === 'kritisch' || sv === 'handeln'));
// Leistung bei großem Bestand (22.10.2026, Fund Teilagent „Oberfläche bei großem Bestand“): offene Entscheidungen zuerst 100
// („weitere anzeigen“), Schweregrad-Knopf baut aus den geladenen Daten neu auf (vorher /api/master je Klick neu, bis 4,6 MB),
// Suche entprellt mit vorab berechnetem Zeilentext (vorher je Taste alle Zeilen neu gelesen, Hänger bis 1,7 s bei 3000 Befunden).
const DEC_SHOW = 100;
async function viewMaster(argKey, argVal, cached) {
  const q = argKey === 'q' ? (argVal ?? '') : undefined; const sevArg = argKey === 'sev' ? (argVal ?? '') : undefined;
  // Direktsprung #/master?q=<Kennzeichen> (z. B. aus der Fahrzeugakte): Suche vorbelegen, alle Schweregrade, Adresse ohne Parameter
  if (q !== undefined) { S.afQ = String(q).slice(0, 80); S.afSev = 'all'; try { history.replaceState(history.state, '', '#/master'); } catch {} }
  // Direktsprung #/master?sev=act (Startseite „Befunde: n“ zählt kritisch + handeln): passende Auswahl vorbelegen, Suche leeren
  if (sevArg !== undefined) { S.afSev = AF_SEVS.includes(sevArg) ? sevArg : 'all'; S.afQ = ''; try { history.replaceState(history.state, '', '#/master'); } catch {} }
  const p = cached || await api('GET', '/api/master');
  // Backlog 502: nach „gesehen“/„erledigt“ (Neuladen ohne Cache) bleibt „alle anzeigen“ offen – nur beim Navigieren zurück auf 100
  if (!cached && !S.mDecKeep) S.mDecAll = false; S.mDecKeep = false;
  const decOpen = p.inbox.filter((m) => ['offen', 'gesehen'].includes(m.decision_status) && !m.superseded);
  const decShown = S.mDecAll ? decOpen : decOpen.slice(0, DEC_SHOW);
  // zuletzt entschiedene/erledigte Übergaben mit Person und Vermerk (Server liefert bis 100) – Rückkehr aus Urlaub/Vertretung (23.10.2026, Teilagent)
  const decDone = p.inbox.filter((m) => !['offen', 'gesehen'].includes(m.decision_status) && m.decided_at).sort((a, b) => String(b.decided_at).localeCompare(String(a.decided_at)));
  // Befunde filtern (nur Anzeige im Browser): Schweregrad + Freitext über den angezeigten Zeilentext; CSV exportiert die angezeigte Auswahl
  if (p.findings.length <= 1) { S.afSev = 'all'; S.afQ = ''; } // Filterknöpfe/Suchfeld gibt es erst ab zwei Befunden
  const afSev = AF_SEVS.includes(S.afSev) ? S.afSev : 'all';
  const sev = { kritisch: 'kritisch', handeln: 'mittel', hinweis: '', info: '' };
  let html = `<h1>${esc(t('master_title'))}</h1>
    <div class="panel ${p.all_clear && !agentStale(p.last_agent_run) ? 'good' : 'alert'}"><b>${esc(p.all_clear ? t('all_clear') : t('not_clear'))}</b>${p.decisions_open ? ` · ${esc(t('decisions'))}: ${fmtNum(p.decisions_open)}` : ''}<div class="small muted">${esc(t('last_run'))}: ${p.last_agent_run ? fmtDT(p.last_agent_run.finished_at || p.last_agent_run.started_at) + (p.last_agent_run.error ? ' · ' + esc(p.last_agent_run.error) : '') : '–'}</div>${agentStale(p.last_agent_run) ? `<div class="alert small" style="margin-top:6px">${esc(t('agent_stale'))}</div>` : ''}</div>
    <div class="stats"><div><b>${p.vehicles_total}</b>${esc(t('total'))}</div><div><b style="color:var(--stop)">${p.vehicles_locked}</b>${esc(t('locked_vehicles'))}</div><div><b>${p.vehicles_in_workshop}</b>${esc(t('in_workshop'))}</div></div>
    <div class="actions"><button class="btn secondary" id="ra">${esc(t('run_agent'))}</button><a class="btn secondary" href="#/vehicles">${esc(t('vehicles'))}</a>${p.findings.length ? `<button class="btn secondary noprint" id="afcsv">${esc(t('export_csv'))}</button>` : ''}<button type="button" class="btn secondary noprint" id="mprt">${esc(t('print'))}</button></div>
    ${printHead([t(p.environment === 'test' ? 'env_testname' : 'env_prod'), `${t('findings')}: ${p.findings.length}`, ...(afSev !== 'all' || (S.afQ || '').trim() ? [`${t('af_filter')}: ${afSev !== 'all' ? t('asev_' + afSev) : ''}${(S.afQ || '').trim() ? ` „${S.afQ.trim()}“` : ''}`] : []), `${t('decisions')}: ${p.decisions_open}`])}
    <h2>${esc(t('decisions'))}</h2><div class="list">${decShown.map((m) => `<div class="row ${m.severity === 'kritisch' ? 'p-kritisch' : 'p-mittel'}"><span class="chip ${sev[m.severity]}">${esc(t('asev_' + m.severity))}</span><span class="title" style="white-space:normal">${fcLabel(m.payload.finding_code)}${esc(fMsg(m.payload.message_args, m.payload.message))}</span><span>${afLink(m.case_id, m.payload.finding_code, m.finding_subject)}</span><span class="sub" style="white-space:normal">${esc(translateNextAction(S.lang, m.payload.next_action))}${!m.case_id && m.vehicle_id ? ` · <a href="#/vehicles/${esc(m.vehicle_id)}">${esc(t('vehicle_file'))}</a>` : ''} · ${fmtDT(m.received_at)}${m.finding_status === 'erledigt' ? ' · ✓ ' + esc(t('resolved')) : ''} · ${m.decision_status === 'gesehen' && m.decided_by_current !== 0 ? `<span data-seen>${esc(t('seen_by').replace('{n}', m.decided_by_name || '–').replace('{t}', m.decided_at ? fmtDT(m.decided_at) : ''))}</span>` : `${m.decision_status === 'gesehen' ? `<span data-seengone class="small">${esc(t('seen_by').replace('{n}', m.decided_by_name || '–').replace('{t}', m.decided_at ? fmtDT(m.decided_at) : ''))} · ${esc(t('seen_gone'))}</span> ` : ''}<button type="button" class="btn secondary small" data-dec="${esc(m.event_id)}" data-st="gesehen" data-was="${esc(m.decision_status)}">${esc(t('seen'))}</button>`} <button type="button" class="btn secondary small" data-dec="${esc(m.event_id)}" data-st="erledigt" data-was="${esc(m.decision_status)}">${esc(t('resolved'))}</button></span></div>`).join('') || noneP()}</div>${decOpen.length > decShown.length ? `<p class="small muted" id="decmore">${esc(t('dec_shown').replace('{n}', fmtNum(decShown.length)).replace('{m}', fmtNum(decOpen.length)))} <button type="button" class="btn secondary noprint" id="decall">${esc(t('kpi_veh_all').replace('{m}', fmtNum(decOpen.length)))}</button></p>` : ''}${decDone.length ? `<details class="panel noprint" id="decdone"><summary>${esc(t('dec_recent').replace('{n}', fmtNum(decDone.length)))}</summary><p class="small muted">${esc(t('dec_recent_hint'))}</p><div class="list">${decDone.map((m) => `<div class="row"><span class="chip ${sev[m.severity]}">${esc(t('asev_' + m.severity))}</span><span class="title" style="white-space:normal">${fcLabel(m.payload.finding_code)}${esc(fMsg(m.payload.message_args, m.payload.message))}</span><span class="chip ok">${esc(t(m.decision_status === 'erledigt' ? 'resolved' : 'dec_decided'))}</span><span class="sub" style="white-space:normal">${esc(m.decided_by_name || '–')}${m.decided_at ? ' · ' + fmtDT(m.decided_at) : ''}${m.decision_note ? ' · ' + esc(m.decision_note) : ''}${((l) => (l ? ' · ' + l : ''))(afLink(m.case_id, m.payload.finding_code, m.finding_subject) || (m.vehicle_id ? `<a href="#/vehicles/${esc(m.vehicle_id)}">${esc(t('vehicle_file'))}</a>` : ''))}</span></div>`).join('')}</div></details>` : ''}
    <h2>${esc(t('findings'))}</h2>${p.findings.length > 1 ? `<div class="actions noprint" style="flex-wrap:wrap;margin-top:0">${[['all', t('filter_all'), p.findings.length], ...(afSev === 'act' ? [['act', t('asev_act'), p.findings.filter((f) => afSevMatch('act', f.severity)).length]] : []), ...['kritisch', 'handeln', 'hinweis', 'info'].map((k) => [k, t('asev_' + k), p.findings.filter((f) => f.severity === k).length]).filter(([k, , n]) => n || afSev === k)].map(([k, l, n]) => `<button type="button" class="btn ${afSev === k ? '' : 'secondary'}" data-afsev="${k}">${esc(l)} (${n})</button>`).join('')}</div><input id="afq" class="noprint" placeholder="${esc(t('search_label'))}" aria-label="${esc(t('search_label'))}" style="margin-bottom:8px" value="${esc(S.afQ || '')}"><p class="small muted noprint" id="afcnt" aria-live="polite"></p>` : ''}<div class="list" id="afl">${p.findings.map((f, i) => `<div class="row ${f.severity === 'kritisch' ? 'p-kritisch' : f.severity === 'handeln' ? 'p-mittel' : ''}" data-afi="${i}" data-sev="${esc(f.severity)}"><span class="chip ${sev[f.severity]}">${esc(t('asev_' + f.severity))}</span><span class="title" style="white-space:normal">${fcLabel(f.finding_code)}${esc(fMsg(f.message_args, f.message))}</span><span>${afLink(f.case_id, f.finding_code, f.subject_key)}</span><span class="sub" style="white-space:normal">${esc(translateNextAction(S.lang, f.next_action))}${!f.case_id && f.vehicle_id ? ` · <a href="#/vehicles/${esc(f.vehicle_id)}" data-afv>${esc(t('vehicle_file'))}</a>` : ''} · ${esc(t('role_' + f.owner_role))} · ${esc(t('open_since'))} ${fmtDT(f.first_seen)}</span></div>`).join('') || noneP()}</div>
    <h2>${esc(t('nav_cases'))}</h2><div class="scroll"><table class="stack mtab"><thead><tr><th></th><th>${esc(t('case_no'))}</th><th>${esc(t('urgency'))}</th><th>${esc(t('status_label'))}</th><th>${esc(t('workshop'))}</th><th>${esc(t('received'))}</th><th>${esc(t('workshop_ack'))}</th><th>${esc(t('open_items'))}</th></tr></thead><tbody>
    ${p.cases.map((c) => `<tr><td>${plate(c.plate, { locked: c.safety_lock })}</td><td><a href="#/cases/${esc(c.id)}" style="white-space:nowrap">${esc(c.case_no)}</a><div class="small muted">${esc(cDesc(c.description).slice(0, 60))}</div></td><td><span class="chip ${esc(c.priority)}">${esc(t('prio_' + c.priority))}</span></td><td>${esc(t('st_' + c.status))}</td><td>${esc(wsName(c.workshop_site))}</td><td>${c.fleet_received_at ? fmtDT(c.fleet_received_at) : '–'}</td><td>${c.workshop_ack_at ? fmtDT(c.workshop_ack_at) : '–'}</td><td>${c.open_items || ''}</td></tr>`).join('')}</tbody></table></div>${p.cases.length ? '' : `<p class="muted" data-none>${esc(t('no_cases'))}</p>`}${p.cases_truncated ? `<p class="small muted" id="mctrunc">${esc(t('master_cases_truncated').replace('{n}', p.cases.length))} <a href="#/cases">${esc(t('nav_cases'))} ›</a></p>` : ''}`;
  render(html, 'master');
  $('#mprt').onclick = () => window.print();
  const afRows = $$('#afl [data-afi]');
  const afText = new Map(); // Zeilentext einmal vorab (Suche je Taste ohne erneutes Auslesen)
  const afShown = () => afRows.filter((r) => r.style.display !== 'none').map((r) => p.findings[Number(r.dataset.afi)]);
  const applyAf = () => {
    // Backlog 490: wie Fahrzeugliste/globale Suche über `searchKey` (Kennzeichen ohne Leer-/Bindestriche, kyrillische Doppelgänger) – die Akte verlinkt #/master?q=<Kennzeichen>
    const q = $('#afq') ? searchKey((S.afQ || '').trim()) : ''; // ohne Suchfeld (≤ 1 Befund) nie unsichtbar filtern
    if (q && !afText.size) for (const r of afRows) afText.set(r, searchKey(r.textContent));
    for (const r of afRows) { const v = afSevMatch(afSev, r.dataset.sev) && (!q || afText.get(r).includes(q)) ? '' : 'none'; if (r.style.display !== v) r.style.display = v; }
    const c = $('#afcnt'); if (c) { const n = afShown().length; c.textContent = n === p.findings.length ? '' : t('af_shown').replace('{n}', n).replace('{m}', p.findings.length); }
  };
  applyAf();
  $$('[data-afsev]').forEach((b) => (b.onclick = () => { S.afSev = b.dataset.afsev; viewMaster(undefined, undefined, p); }));
  const dall = $('#decall'); if (dall) dall.onclick = () => { S.mDecAll = true; viewMaster(undefined, undefined, p); };
  let afT = null; const afq = $('#afq'); if (afq) afq.oninput = () => { S.afQ = afq.value; clearTimeout(afT); afT = setTimeout(applyAf, afRows.length > 300 ? 150 : 0); };
  const afc = $('#afcsv'); if (afc) afc.onclick = () => download(new Blob([agentFindingsCsv(afShown(), t, (f) => fMsg(f.message_args, f.message), (x) => translateNextAction(S.lang, x), fmtDT)], { type: 'text/csv;charset=utf-8' }), `fuhrpark-agentenbefunde_${p.environment}_${bDate()}.csv`);
  $('#ra').onclick = async () => { try { const r = await api('POST', '/api/agent/run'); toast(`${t('findings')}: ${fmtNum(r.findings_open)}`); viewMaster(); } catch (err) { toast(err.message, true); } };
  // Entscheidung im Master-Eingang: ohne Netz Meldung statt stillem Abbruch; Doppeltippen sendet nicht zweimal
  // „Erledigt“ ist endgültig (Status steigt nur auf, schließt auch ältere Einträge desselben Befunds) – Rückfrage gegen Fehltipp am Handy (23.10.2026)
  $$('[data-dec]').forEach((a) => (a.onclick = async (e) => { e.preventDefault(); if (a.dataset.busy) return; if (a.dataset.st === 'erledigt' && !confirm(t('dec_resolve_confirm'))) return; a.dataset.busy = '1'; a.setAttribute('aria-disabled', 'true');
    try { await api('POST', `/api/master/${a.dataset.dec}/decision`, { decision_status: a.dataset.st, ...(a.dataset.was ? { expected_status: a.dataset.was } : {}) }); S.mDecKeep = true; await viewMaster(); } catch (err) { toast(err.message, true); } finally { delete a.dataset.busy; a.removeAttribute('aria-disabled'); } }));
}
const evTr = (e) => (e === 'Zuordnung durch Fuhrparkleitung' ? t('ev_assign_default') : e || '');
// Fahrerkandidat (Bußgeld): Begründung in der App-Sprache; übernommen wird weiter der gespeicherte deutsche Nachweis
// gespeicherter Nachweis der Fahrerermittlung (deutscher Aktenvermerk aus dem Kandidaten) in der App-Sprache anzeigen; Freitext bleibt (19.10.2026)
const fineEvTr = (s) => {
  const m = /^Fahrzeugzuordnung seit (\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4})(?: (\d{2}:\d{2}) Uhr)?(?: bis (\d{2}\.\d{2}\.\d{4})(?: (\d{2}:\d{2}) Uhr)?)?(?: – Zugmaschine (.+?))?(?: \((.*)\))?$/.exec(s || '');
  const iso = (x) => (x.includes('.') ? x.split('.').reverse().join('-') : x);
  if (m) return candEv({ since: iso(m[1]), since_time: m[2] || null, until: m[3] ? iso(m[3]) : null, until_time: m[4] || null, via_plate: m[5] || null, assign_evidence: m[6] || null });
  const k = /^Abfahrtskontrolle am Tattag (\d{2}:\d{2}) Uhr( – nach der Tatzeit)?(?: – Zugmaschine (.+))?$/.exec(s || '');
  return k ? t('cand_check').replace('{t}', k[1]) + (k[2] ? ' – ' + t('cand_after') : '') + (k[3] ? ' – ' + t('cand_via').replace('{p}', k[3]) : '') : s || '';
};
// Backlog 557: Zuordnungswechsel am Tattag (Beginn/Ende mit Uhrzeit der Eingabe, nicht der Übergabe)
const sameDayHtml = (list) => (list && list.length ? `<div class="panel small" data-fcsameday role="note"><b>${esc(t('fine_sameday_title'))}</b><ul style="margin:.3rem 0;padding-left:1.2rem">${list.map((x) => `<li>${esc(x.time)} – ${esc(x.display_name)}: ${esc(t(x.change === 'start' ? 'fine_sameday_start' : 'fine_sameday_end'))}${x.via_plate ? ' – ' + esc(t('cand_via').replace('{p}', x.via_plate)) : ''}${x.after_offense ? ' – ' + esc(t('cand_after')) : ''}</li>`).join('')}</ul><span class="muted">${esc(t('fine_sameday_note'))}</span></div>` : '');
// Backlog 422: zugeordnete Person hat am Tattag die Abfahrtskontrolle an einem anderen Fahrzeug gemacht (Hinweis auf Fahrzeugtausch)
const candElse = (c) => (c.checks_elsewhere && c.checks_elsewhere.length ? ' – ' + t('cand_elsewhere').replace('{p}', c.checks_elsewhere.map((x) => `${x.plate} ${fmtDT(x.at)}`).join(', ')) : '');
// Backlog 557: Uhrzeit, wenn die Zuordnung am Tattag begann/endete
const candEv = (c) => (c.since ? t('cand_since').replace('{d}', fmtD(c.since) + (c.since_time ? ' ' + c.since_time : '')) + (c.until ? ' ' + t('cand_until').replace('{d}', fmtD(c.until) + (c.until_time ? ' ' + c.until_time : '')) : '') + (c.via_plate ? ' – ' + t('cand_via').replace('{p}', c.via_plate) : '') + (c.assign_evidence ? ` (${evTr(c.assign_evidence)})` : '') + candElse(c) : c.check_at ? t('cand_check').replace('{t}', fmtDT(c.check_at)) + (c.after_offense ? ' – ' + t('cand_after') : '') + (c.via_plate ? ' – ' + t('cand_via').replace('{p}', c.via_plate) : '') : c.evidence || '');
// Planungshilfe: km-Prognose fällt in die nächsten 30 Tage (ändert keinen Status, nur Anzeige)
const fcSoon = (r, today, days = 30) => !!(r.km_forecast && r.km_forecast.date && Date.parse(r.km_forecast.date) - Date.parse(today) <= days * 86400000);
// Backlog 405 (Blickwinkel „Wintercheck vor der Saison für alle Lkw“): Prüftermin für mehrere Fahrzeuge anlegen – Inhaber/Fuhrparkleitung.
// Je Fahrzeug ein eigener Eintrag (Server `POST /api/maintenance/create-batch`); Durchführung/km danach je Fahrzeug mit „Erledigt“.
const MC_MAX = 200;
async function viewMaintMulti() {
  if (!isMgr()) { render(`<h1>${esc(t('mc_title'))}</h1><p class="muted">${esc(t('no_permission_view'))}</p>`, 'more'); return; }
  const vs = (await vehiclesCached()).filter((v) => !v.eval_excluded);
  if (!vs.length) { render(`<h1>${esc(t('mc_title'))}</h1>${noVehiclesNote()}`, 'more'); return; }
  const kinds = (S.meta.maintenance_kinds || []).filter((k) => !['HU', 'SP', 'Rückruf'].includes(k));
  render(`<h1>${esc(t('mc_title'))}</h1>${helpLink('dates')}<p class="small muted">${esc(t('mc_intro'))}</p><form id="mcf" novalidate>
    <label for="mck">${esc(t('mc_kind'))}</label><select id="mck">${kinds.map((k) => `<option value="${esc(k)}"${k === 'Sonstiges' ? ' selected' : ''}>${esc(mk(k))}</option>`).join('')}</select>
    <div data-mctitle><label for="mct">${esc(t('rule_title'))}</label><input id="mct" maxlength="80" placeholder="${esc(t('rule_title_ph'))}"><p class="small muted">${esc(t('rule_title_hint'))}</p></div>
    <label for="mce">${esc(t('mc_evidence'))}<span class="hint">${esc(t('mc_evidence_hint'))}</span></label><input id="mce" maxlength="300" required>
    <div style="display:flex;gap:12px;flex-wrap:wrap"><div><label for="mcd">${esc(t('mc_due'))}</label><input type="date" id="mcd"></div><div><label for="mci">${esc(t('mc_interval'))}</label><input id="mci" inputmode="numeric" maxlength="3" style="max-width:9em"></div></div>
    <p class="small muted">${esc(t('mc_due_hint'))}</p>
    <label for="vq">${esc(t('mc_choose'))}</label><input id="vq" placeholder="SZ-…" autocomplete="off" style="margin-bottom:8px">
    <div class="actions" style="margin:0 0 8px"><button type="button" class="btn secondary" id="mcall">${esc(t('mc_all'))}</button><button type="button" class="btn secondary" id="mcnone">${esc(t('mc_none'))}</button></div>
    <p class="small" id="mccount" role="status" aria-live="polite"></p>
    <div class="vehpick multi" id="mcpick" role="group" aria-label="${esc(t('mc_choose'))}">${vs.map((v) => `<label><input type="checkbox" name="mcveh" value="${esc(v.id)}">${plate(v.plate)}<span class="small muted">${v.kind === 'anhaenger' ? esc(t('vk_anhaenger')) + ' · ' : ''}${esc(v.site || '')}</span></label>`).join('')}</div>
    <div class="actions"><button class="btn block" id="mcsb">${esc(t('mc_send'))}</button></div></form>`, 'more');
  const boxes = () => $$('input[name=mcveh]');
  const chosen = () => boxes().filter((x) => x.checked);
  const count = () => { const n = chosen().length; const el = $('#mccount'); if (el) { el.textContent = tn('mc_selected', n); el.classList.toggle('err', n > MC_MAX); } };
  boxes().forEach((x) => x.addEventListener('change', count)); count();
  $('#vq').onkeydown = (e) => { if (e.key === 'Enter') e.preventDefault(); };
  // Filter blendet nur aus – gewählte Fahrzeuge bleiben sichtbar (wie die Sammelmeldung)
  $('#vq').oninput = () => { const q = searchKey($('#vq').value); $$('#mcpick label').forEach((l) => { const r = $('input', l); l.hidden = !!q && !(r && r.checked) && !searchKey(l.textContent).includes(q); }); };
  $('#mcall').onclick = () => { $$('#mcpick label').forEach((l) => { const r = $('input', l); if (r && !l.hidden) r.checked = true; }); count(); };
  $('#mcnone').onclick = () => { boxes().forEach((x) => (x.checked = false)); count(); };
  { const tt = () => { $('[data-mctitle]').hidden = $('#mck').value !== 'Sonstiges'; }; $('#mck').addEventListener('change', tt); tt(); } // Backlog 577
  $('#mcf').onsubmit = async (e) => {
    e.preventDefault();
    const sb = $('#mcsb'); const ids = chosen().map((x) => x.value);
    if (!$('#mce').value.trim()) { toast(t('mc_need_evidence'), true); markInvalid($('#mce'), t('mc_need_evidence')); $('#mce').focus(); return; }
    if (!ids.length) { toast(t('mc_need_one'), true); markInvalid($('#mcpick'), t('mc_need_one')); $('#vq').focus(); return; }
    if (ids.length > MC_MAX) { toast(t('mc_too_many'), true); markInvalid($('#mcpick'), t('mc_too_many')); return; }
    sb.disabled = true;
    try {
      const r = await api('POST', '/api/maintenance/create-batch', { kind: $('#mck').value, evidence: $('#mce').value, ...($('#mck').value === 'Sonstiges' && $('#mct').value.trim() ? { title: $('#mct').value.trim() } : {}), next_due_date: $('#mcd').value || null, interval_months: $('#mci').value.trim() || null, vehicle_ids: ids });
      if (!sb.isConnected) return;
      document.querySelectorAll('.toast.err').forEach((x) => x.remove());
      const skip = (r.skipped || []).map((x) => `<li>${x.plate ? esc(x.plate) + ' · ' : ''}${esc(t('mc_sk_' + x.code))}</li>`).join('');
      render(`<h1>${esc(t('mc_title'))}</h1><div class="panel ${skip ? 'warn' : 'ok'}" role="status" data-mcdone><p><b>${esc(tn('mc_done', r.created.length))}</b>${r.unchanged ? ` · ${esc(t('mc_unchanged').replace('{n}', fmtNum(r.unchanged)))}` : ''}</p>
        ${r.created.length ? `<ul class="list">${r.created.map((c) => `<li><a href="#/vehicles/${encodeURIComponent(c.vehicle_id)}">${plate(c.plate)}</a> · ${esc(mk(r.kind))}</li>`).join('')}</ul>` : ''}
        ${skip ? `<p class="small"><b>${esc(t('mc_skipped'))}</b></p><ul class="small">${skip}</ul>` : ''}
        <p><a class="btn" href="#/maintenance">${esc(t('inspections_due'))}</a></p></div>`, 'more');
    } catch (err) { sb.disabled = false; toast(err.message, true); }
  };
}
async function viewMaint(fq) {
  if (typeof fq === 'string' && fq) S.maintFilter = fq; // Wegweiser „#/maintenance?f=gaps“ (Startseite: Pflichtprüfungen ohne Termin)
  let ov;
  const msQ = vsDef('maintSite') ? '&site=' + encodeURIComponent(vsDef('maintSite')) : '';
  try { ov = await api('GET', '/api/maintenance' + (msQ ? '?' + msQ.slice(1) : '')); } catch (err) { render(`<h1>${esc(t('inspections_due'))}</h1><div class="panel alert">${esc(err.message)}</div>`, 'more'); return; }
  const f = S.maintFilter || 'due';
  // „Fällig bis“ (Backlog 504): erweitert „bald fällig“ um eingetragene Fristen bis zu diesem Tag (gleiche Regel wie `maintFilterRows` am Server)
  const dueBy = S.maintDueBy && /^\d{4}-\d{2}-\d{2}$/.test(S.maintDueBy) ? S.maintDueBy : null;
  const inWin = (r) => r.status === 'ueberfaellig' || r.status === 'faellig' || (!!dueBy && !!r.next_due_date && r.next_due_date <= dueBy && !['erledigt', 'nicht_pflichtig'].includes(r.status));
  const unclDueBy = (r) => r.status === 'ungeklaert' && !!dueBy && !!r.next_due_date && r.next_due_date <= dueBy;
  // „fällig ohne Termin“: überfällig/bald fällig und kein geplanter Werkstatttermin ab heute – was noch eingeplant werden muss
  // Backlog 608: Termin nach dem Fristende zählt nicht als eingeplant (wie `maintFilterRows` im Server)
  const noPlan = (r) => (inWin(r) || kmUnclearDateDue(r) || unclDueBy(r)) && !(r.planned_date && r.planned_date >= ov.today && !(r.next_due_date && r.planned_date > r.next_due_date));
  // Backlog 541 (Blickwinkel „UVV/Tachograph des Folgejahres im Dezember planen“): Auswahl „Prüfart“ wirkt auf Liste, Zähler, Sammeltermin, Druck, CSV und Kalender
  const mKinds = [...new Set(ov.rows.map((r) => r.kind))].sort((a, b) => mk(a).localeCompare(mk(b)));
  const mKind = S.maintKind && mKinds.includes(S.maintKind) ? S.maintKind : null;
  if (mKind) { ov.rows = ov.rows.filter((r) => r.kind === mKind); ov.totals = { ...ov.totals, overdue: ov.rows.filter((r) => r.status === 'ueberfaellig').length, unclear: ov.rows.filter((r) => r.status === 'ungeklaert').length }; }
  const mkQ = mKind ? '&kind=' + encodeURIComponent(mKind) : '';
  const fcN = ov.rows.filter((r) => fcSoon(r, ov.today)).length;
  // „nach km fällig“: km-Regel überschritten bzw. innerhalb der Warnschwelle (gleiche km_status wie Status/Werkstatt-Startseite)
  const kmDue = (r) => r.km_status === 'ueberfaellig' || r.km_status === 'faellig';
  const kmN = ov.rows.filter(kmDue).length;
  const sel = (r) => (f === 'all' ? true : f === 'due' ? inWin(r) : f === 'noplan' ? noPlan(r) : f === 'fc30' ? fcSoon(r, ov.today) : f === 'km' ? kmDue(r) : r.status === f);
  const rows = ov.rows.filter(sel);
  if (f === 'km') rows.sort((a, b) => (a.km_remaining ?? 0) - (b.km_remaining ?? 0) || plateCmp(a.plate, b.plate));
  if (f === 'fc30') rows.sort((a, b) => (a.km_forecast.date < b.km_forecast.date ? -1 : a.km_forecast.date > b.km_forecast.date ? 1 : 0));
  const cls = { ueberfaellig: 'kritisch', faellig: 'mittel', ok: 'ok', ohne_termin: '', erledigt: 'ok', ungeklaert: 'mittel', nicht_pflichtig: '', erste_sp: '' };
  const tabs = [['due', `${t('ms_ueberfaellig')} + ${dueBy ? t('mdueby_tab').replace('{d}', fmtD(dueBy)) : t('ms_faellig')}`, ov.rows.filter(inWin).length], ['noplan', t('due_no_plan'), ov.rows.filter(noPlan).length], ['ueberfaellig', t('ms_ueberfaellig'), ov.totals.overdue], ['ungeklaert', t('ms_ungeklaert'), ov.totals.unclear || 0], ...(kmN || f === 'km' ? [['km', t('km_due_tab'), kmN]] : []), ...(fcN || f === 'fc30' ? [['fc30', t('fc30_tab'), fcN]] : []), ['all', t('filter_all'), ov.rows.length], ['gaps', t('gaps'), ov.totals.vehicles_with_gaps]];
  let html = `<h1>${esc(t('inspections_due'))}</h1>${helpLink('dates')}${isMgr() ? `<p class="small noprint navlinks"><a href="#/maintenance/multi" id="tomcreate">${esc(t('mc_link'))}</a></p>` : ''}
    <section class="panel"><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="chip ${ov.totals.overdue ? 'kritisch' : ''}">${esc(t('ms_ueberfaellig'))}: ${ov.totals.overdue}</span><span class="chip ${ov.totals.due ? 'mittel' : ''}">${esc(t('ms_faellig'))} (≤ ${esc(nDays(ov.warn_days))}): ${ov.totals.due}</span><span class="chip ok">${esc(t('ms_ok'))}: ${ov.totals.ok}</span><span class="chip ${ov.totals.vehicles_with_gaps ? 'mittel' : ''}">${esc(t('gaps'))}: ${ov.totals.vehicles_with_gaps} / ${ov.totals.vehicles}</span></div>
    ${(ov.site_options || []).length > 1 || ov.site ? `<div class="noprint" style="margin-top:10px">${siteSelect('msite', '', ov.site_options, ov.site)}</div>` : ''}
    <div class="noprint" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin-top:10px"><div><label for="mdueby">${esc(t('mdueby_label'))}</label><input type="date" id="mdueby" min="${esc(ov.today)}" value="${esc(dueBy || '')}"></div><button type="button" class="btn secondary" id="mduenext">${esc(t('mdueby_next'))}</button><button type="button" class="btn secondary" id="mdueyear">${esc(t('mdueby_year'))}</button>${dueBy ? `<button type="button" class="btn secondary" id="mdueclr">${esc(t('mdueby_clear'))}</button>` : ''}${mKinds.length > 1 || mKind ? `<div><label for="mkind">${esc(t('mkind_label'))}</label><select id="mkind"><option value="">${esc(t('filter_all'))}</option>${mKinds.map((k) => `<option value="${esc(k)}"${k === mKind ? ' selected' : ''}>${esc(mk(k))}</option>`).join('')}</select></div>` : ''}</div>
    ${dueBy ? `<p class="small muted" data-mdueby>${esc(t('mdueby_hint').replace('{d}', fmtD(dueBy)))}</p>` : ''}
    <div class="actions"><button type="button" class="btn secondary" id="mcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="mics">${esc(t('export_ics'))}</button><button type="button" class="btn secondary" id="mprt">${esc(t('print'))}</button></div></section>
    <p class="print-only small">${printStamp()}${ov.site ? ' · ' + esc(t('site')) + ': ' + esc(ov.site === 'ohne' ? t('cs_nosite') : ov.site) : ''}${(tabs.find(([k]) => k === f) || [])[1] ? ' · ' + esc(t('print_filter')) + ': ' + esc(tabs.find(([k]) => k === f)[1]) : ''}${dueBy && f === 'noplan' ? ' · ' + esc(t('mdueby_label')) + ' ' + fmtD(dueBy) : ''}${mKind ? ' · ' + esc(t('mkind_label')) + ': ' + esc(mk(mKind)) : ''} · ${esc(t('print_count').replace('{n}', f === 'gaps' ? (ov.gaps || []).length : rows.length))} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="actions" role="group" aria-label="${esc(t('maintenance'))}" style="flex-wrap:wrap">${tabs.map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-mf="${k}">${esc(l)} (${n})</button>`).join('')}</div>`;
  if (f === 'fc30') html += `<p class="small muted">${esc(t('fc30_hint'))}</p>`;
  if (f === 'km') html += `<p class="small muted">${esc(t('km_due_tab_hint'))}</p>`;
  if (f === 'gaps') {
    html += `<p class="small muted">${esc(t('gaps_hint'))}</p><div class="list">${ov.gaps.map((g) => `<a class="row" href="#/vehicles/${encodeURIComponent(g.vehicle_id)}">${plate(g.plate)}<span class="title">${g.vehicle_kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${esc(g.site || '')}</span><span></span><span class="sub" style="white-space:normal">${g.missing.map((k) => `<span class="chip">${esc(mk(k))}</span>`).join(' ')}</span></a>`).join('') || noneP()}</div>`;
  } else {
    // Backlog 506: Inhaber/Leitung/Werkstatt springen wie im Werkstattplan (Backlog 236) direkt ins Formular „Durchführung erfassen“ und nach dem
    // Speichern zurück in diese Liste; HU/SP ohne eigenen Eintrag (`husp:`) und erledigte Rückrufe wie bisher zur Akte
    const canDone = isMgr() || S.me.role === 'workshop';
    const mHref = (r) => '#/vehicles/' + encodeURIComponent(r.vehicle_id) + (canDone && !r.virtual && /^[\w-]+$/.test(String(r.id)) && !(r.kind === 'Rückruf' && r.last_done_date) ? '?done=' + encodeURIComponent(r.id) : '');
    // Backlog 612 (Blickwinkel „Jahresplanung 2027“): mit „Fällig bis“ Zwischenüberschriften je Fälligkeitsmonat (überfällig zuerst) – Liste und Ausdruck
    const mGrpOn = !!dueBy && (f === 'due' || f === 'noplan'); let mGrpLast = null;
    const mGrp = (r) => { if (!mGrpOn) return ''; const k = r.status === 'ueberfaellig' ? 'over' : r.next_due_date ? r.next_due_date.slice(0, 7) : 'none'; if (k === mGrpLast) return ''; mGrpLast = k;
      return `<h3 class="mgrp" data-mgrp="${esc(k)}" style="margin:12px 0 4px">${esc(k === 'over' ? t('ms_ueberfaellig') : k === 'none' ? t('mgrp_none') : fmtMonth(k))}</h3>`; };
    const mGk = (r) => (r.status === 'ueberfaellig' ? '0' : r.next_due_date ? '1' + r.next_due_date : '2');
    html += `<div class="list">${(mGrpOn ? [...rows].sort((a, b) => (mGk(a) < mGk(b) ? -1 : mGk(a) > mGk(b) ? 1 : 0)) : rows).map((r) => mGrp(r) + `<a class="row ${r.status === 'ueberfaellig' ? 'p-kritisch' : r.status === 'faellig' ? 'p-mittel' : ''}" href="${mHref(r)}"${mHref(r).includes('?done=') ? ' data-fromplan' : ''}>${plate(r.plate)}<span class="title">${r.vehicle_kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${esc(mkR(r))}${r.due_month || r.next_due_date || r.prognosis || !r.next_due_km ? ' · ' : ''}${r.due_month ? `${esc(t('due_until_end'))} ${esc(r.due_month)}${r.due_basis ? ` <span class="small muted">(${esc(t('db_' + r.due_basis))})</span>` : ''}` : r.next_due_date ? fmtD(r.next_due_date) : r.prognosis ? `${esc(t('prognosis'))} ${mY(r.prognosis)}` : r.next_due_km ? '' : r.status === 'erledigt' && r.last_done_date ? `${esc(t('done_on'))} ${fmtD(r.last_done_date)}` : '–'}${r.planned_date ? ` · ${esc(t('planned_appt'))} ${fmtD(r.planned_date)}` : ''}${r.open_order ? ` · 🔧 ${esc(r.open_order.case_no)}` : ''}${r.next_due_km ? ` · ${esc(t('due_at_km'))} ${fmtKm(r.next_due_km)}${r.km_remaining !== null ? ` (${r.km_remaining < 0 ? esc(t('km_over')) + ' ' + fmtKm(-r.km_remaining) : esc(t('km_left')) + ' ' + fmtKm(r.km_remaining)})` : ''}` : ''}</span><span class="chip ${cls[r.status]}">${esc(t('ms_' + r.status))}${kmUnclearDateDue(r) ? ' · ' + esc(t('ms_' + r.date_status)) : ''}${r.days !== null ? ` (${r.days})` : ''}</span><span class="sub">${r.km_unclear ? `<span class="km-unclear">${esc(t('km_unclear_drop').replace('{d}', fmtD(r.km_drop_at)))}</span> · ` : ''}${r.km_forecast ? kmFcHtml(r.km_forecast) + ' · ' : ''}${r.notes && r.notes.length && ['ungeklaert', 'ueberfaellig'].includes(r.status) ? esc(huNote(r, r.notes.length - 1)) + ' · ' : ''}${esc(mEv(r.evidence))}${r.site ? ' · ' + esc(r.site) : ''}</span></a>`).join('') || `<p class="muted">${esc(t('none_due'))}</p>`}</div>`;
  }
  // Sammeltermin (Backlog 235): gleichen Termin für ausgewählte Einträge der aktuellen Ansicht – Inhaber, Fuhrparkleitung, Werkstatt
  const mbRows = f === 'gaps' ? [] : rows.filter((r) => !(r.kind === 'Rückruf' && r.last_done_date));
  if ((isMgr() || S.me.role === 'workshop') && mbRows.length) html += `<details class="panel noprint" id="mbatch"${S.mbOpen ? ' open' : ''}><summary>${esc(t('mb_title'))}</summary><p class="small muted">${esc(t('mb_hint'))}</p>
    <form id="mbf"><div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end"><div><label for="mbdate">${esc(t('mb_date'))}</label><input type="date" id="mbdate" name="planned_date" min="${esc(ov.today)}" value="${esc(S.mbDate || '')}" required></div>
    <label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="replace"> ${esc(t('mb_replace'))}</label></div>
    <div class="actions" style="margin:8px 0"><button type="button" class="btn secondary" id="mball">${esc(t('mb_all'))}</button><button type="button" class="btn secondary" id="mbnone">${esc(t('mb_none'))}</button> <span class="small muted" id="mbcount" aria-live="polite"></span></div>
    <div class="list" style="max-height:340px;overflow:auto">${mbRows.slice(0, 200).map((r) => `<label class="row" style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:8px 10px;margin:0"><input type="checkbox" name="mbid" value="${esc(r.id)}"${r.virtual ? ' disabled' : ''}> ${plate(r.plate)}<span class="title" style="white-space:normal;flex:1 1 150px">${r.vehicle_kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${esc(mkR(r))}${r.due_month ? ` · ${esc(t('due_until_end'))} ${esc(r.due_month)}` : r.next_due_date ? ` · ${fmtD(r.next_due_date)}` : ''}${!ov.site && r.site ? ` · <span class="small muted">${esc(r.site)}</span>` : ''}${r.virtual ? ` <span class="small muted">– ${esc(t('mb_virtual'))}</span>` : ''}${r.planned_date && r.planned_date >= ov.today ? ` <span class="chip">${esc(t('mb_has_plan').replace('{d}', fmtD(r.planned_date)))}</span>` : ''}</span></label>`).join('')}</div>${impMore(mbRows.length, 200)}
    <div class="actions"><button class="btn" id="mbgo">${esc(t('mb_submit'))}</button></div></form></details>`;
  if (S.mbRes) html += `<div id="mbres" class="noprint" role="status">${S.mbRes}</div>`;
  // Durchgeführte Prüfungen (Wartungshistorie der Flotte) – Inhaber, Fuhrparkleitung, Lesezugriff
  if (['owner', 'fleet', 'viewer'].includes(S.me.role)) html += `<details class="panel noprint" id="mhist"><summary>${esc(t('mh_title'))}</summary><p class="small muted">${esc(t('mh_hint'))}</p>
    <form id="mhf" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end"><div><label>${esc(t('from'))}</label><input type="date" name="from" value="${esc(ov.today.slice(0, 4))}-01-01" required></div><div><label>${esc(t('to'))}</label><input type="date" name="to" value="${esc(ov.today)}" required></div>
    <div><label>${esc(t('kind'))}</label><select name="kind"><option value="">${esc(t('filter_all'))}</option>${(S.meta.maintenance_kinds || []).map((k) => `<option value="${esc(k)}">${esc(mk(k))}</option>`).join('')}</select></div>
    <div class="actions" style="margin:0"><button class="btn secondary">${esc(t('show'))}</button><button type="button" class="btn secondary" id="mhcsv">${esc(t('export_csv'))}</button></div></form><div id="mhres"></div></details>`;
  if (isMgr()) html += `<section class="panel noprint"><h2 style="margin-top:0">${esc(t('import_maint'))}</h2><p class="small muted">${esc(t('import_maint_hint'))}</p><input type="file" id="mimp" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('import_maint'))}"><div id="mimpr"></div></section>
    <section class="panel noprint"><h2 style="margin-top:0">${esc(t('import_recalls'))}</h2><p class="small muted">${esc(t('import_recalls_hint'))}</p><input type="file" id="rimp" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('import_recalls'))}"><div id="rimpr"></div></section>`;
  render(html, 'more');
  $$('[data-mf]').forEach((b) => (b.onclick = () => { S.maintFilter = b.dataset.mf; viewMaint(); }));
  $$('#app a[data-fromplan]').forEach((a) => (a.onclick = () => { S.fromPlan = '#/maintenance'; }));
  { const di = $('#mdueby'); if (di) di.onchange = () => { S.maintDueBy = di.value && di.value >= ov.today ? di.value : null; viewMaint(); };
    const dn = $('#mduenext'); if (dn) dn.onclick = () => { const [y, m] = ov.today.split('-').map(Number); const x = new Date(Date.UTC(y, m + 1, 0)); S.maintDueBy = `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`; viewMaint(); };
    // Backlog 545: Jahresplanung „bis Ende nächsten Jahres“ (nur Vergleich mit eingetragenen Fristen, keine neue Frist)
    const dy = $('#mdueyear'); if (dy) dy.onclick = () => { S.maintDueBy = `${Number(ov.today.slice(0, 4)) + 1}-12-31`; viewMaint(); };
    const mks = $('#mkind'); if (mks) mks.onchange = () => { S.maintKind = mks.value || null; viewMaint(); };
    const dc = $('#mdueclr'); if (dc) dc.onclick = () => { S.maintDueBy = null; viewMaint(); }; }
  S.mbRes = ''; S.mbOpen = false; // Ergebnis des Sammeltermins nur direkt nach dem Speichern zeigen
  const mbf = $('#mbf');
  if (mbf) {
    const boxes = () => $$('#mbf input[name=mbid]:not(:disabled)');
    const cnt = () => { $('#mbcount').textContent = tn('mb_selected', boxes().filter((x) => x.checked).length); };
    boxes().forEach((x) => (x.onchange = cnt)); cnt();
    $('#mball').onclick = () => { boxes().forEach((x) => (x.checked = true)); cnt(); };
    $('#mbnone').onclick = () => { boxes().forEach((x) => (x.checked = false)); cnt(); };
    mbf.onsubmit = async (e) => {
      e.preventDefault();
      const ids = boxes().filter((x) => x.checked).map((x) => x.value);
      if (!ids.length) { toast(t('mb_pick'), true); return; }
      try {
        const r = await api('POST', '/api/maintenance/plan-batch', { planned_date: mbf.planned_date.value, ids, replace: mbf.replace.checked });
        const skip = (r.skipped || []).map((x) => `<li>${x.plate ? esc(x.plate) + ' · ' : ''}${x.kind ? esc(mk(x.kind)) + ': ' : ''}${esc(t('mb_sk_' + x.code).replace('{d}', fmtD(x.planned_date)))}</li>`).join('');
        S.mbRes = `<p class="panel ${r.skipped && r.skipped.length ? 'warn' : 'ok'}" style="margin-top:8px"><b>${esc(tn('mb_done', r.planned.length).replace('{d}', fmtD(r.planned_date)))}</b>${r.unchanged ? ` · ${esc(t('mb_unchanged').replace('{n}', fmtNum(r.unchanged)))}` : ''}${r.planned.some((x) => x.after_due) ? `<br><span class="small" data-mbafterdue>⚠ ${esc(t('mb_after_due'))}: ${r.planned.filter((x) => x.after_due).map((x) => `${esc(x.plate)} · ${esc(mk(x.kind))} (${esc(t('next_due'))} ${fmtD(x.after_due)})`).join('; ')}</span>` : ''}${r.planned.some((x) => x.replaced) ? `<br><span class="small">${r.planned.filter((x) => x.replaced).map((x) => `${esc(x.plate)} · ${esc(mk(x.kind))} (${esc(t('mb_replaced').replace('{d}', fmtD(x.replaced)))})`).join('; ')}</span>` : ''}</p>${skip ? `<p class="small"><b>${esc(t('mb_skipped'))}</b></p><ul class="small">${skip}</ul>` : ''}`;
        S.mbOpen = true; S.mbDate = r.planned_date;
        await viewMaint();
      } catch (err) { toast(err.message, true); }
    };
  }
  const msel = $('#msite'); if (msel) msel.onchange = () => { S.maintSite = msel.value; viewMaint(); };
  $('#mics').onclick = async () => { try { download(await api('GET', `/api/maintenance?format=ics&filter=${encodeURIComponent(f)}${dueBy ? '&due_by=' + dueBy : ''}${mkQ}` + msQ), `fuhrpark-prueftermine_${ov.today}${ov.site ? '_' + fnPart(ov.site) : ''}_${f}${dueBy ? '_bis-' + dueBy : ''}${mKind ? '_' + fnPart(mKind) : ''}.ics`); } catch (err) { toast(err.message, true); } };
  $('#mprt').onclick = () => window.print();
  // Mängelauftrag und Nachprüfung zu Prüfungen mit erheblichen Mängeln (nur gespeicherte Daten; ohne Nachprüfung „noch nicht eingetragen“)
  const mhDefect = (r) => DEFECT_RESULTS.includes(r.result) ? `<br><span class="small">${esc(t('mh_order'))}: ${r.defect_case_no ? `${esc(r.defect_case_no)} (${esc(t('st_' + r.defect_case_status))})` : esc(t('mh_no_order'))} · ${esc(t('mh_reinsp'))}: ${r.reinspection_date ? `${fmtD(r.reinspection_date)}${r.reinspection_result ? ' – ' + esc(t('res_' + r.reinspection_result)) : ''}` : esc(t('mh_reinsp_none'))}</span>` : '';
  const mhf = $('#mhf');
  if (mhf) {
    const mhq = () => `from=${encodeURIComponent(mhf.from.value)}&to=${encodeURIComponent(mhf.to.value)}${mhf.kind.value ? '&kind=' + encodeURIComponent(mhf.kind.value) : ''}`;
    mhf.onsubmit = async (e) => { e.preventDefault(); try {
      const h = await api('GET', '/api/maintenance/history?' + mhq());
      $('#mhres').innerHTML = `${h.truncated ? `<p class="panel warn">${esc(t('mh_truncated').replaceAll('{n}', h.max))}</p>` : ''}<p><b>${h.rows.length}</b> ${esc(t('mh_count'))}${Object.keys(h.by_kind).length ? ' · ' + Object.entries(h.by_kind).map(([k, n]) => `${esc(mk(k))} ${n}`).join(' · ') : ''}</p>${h.rows.length ? `<div class="list">${h.rows.slice(0, 50).map((r) => { const go = r.result_addable && isMgr(); const vhref = `#/vehicles/${encodeURIComponent(r.vehicle_id)}` + (go ? `?ev=${encodeURIComponent(r.event_id)}` : ''); return `<a class="row" href="${vhref}">${plate(r.plate)}<span class="title">${esc(mk(r.kind))}</span><span class="chip">${fmtD(r.done_date)}</span>${go ? `<span class="chip mittel">${esc(t('res_add_go'))} ›</span>` : ''}<span class="sub" style="white-space:normal">${[r.done_km !== null ? fmtKm(r.done_km) : '', r.result ? t('res_' + r.result) : '', r.evidence].filter(Boolean).map(esc).join(' · ')}${mhDefect(r)}</span></a>`; }).join('')}</div>${h.rows.length > 50 ? `<p class="small muted">${esc(t('mh_more'))}</p>` : ''}` : ''}`;
    } catch (err) { toast(err.message, true); } };
    $('#mhcsv').onclick = async () => { if (!mhf.reportValidity()) return; try { const blob = await api('GET', '/api/maintenance/history?format=csv&' + mhq()); download(blob, `fuhrpark-durchgefuehrte-pruefungen_${mhf.from.value}_${mhf.to.value}.csv`); if (blob.cfpTruncated) toast(t('mh_truncated').replaceAll('{n}', blob.cfpTruncated), true); } catch (err) { toast(err.message, true); } };
  }
  // CSV mit derselben Auswahl wie Liste/Ausdruck (Backlog 505); Dateiname nennt Filter und „fällig bis“
  $('#mcsv').onclick = async () => { try { download(await api('GET', `/api/maintenance?format=csv&filter=${encodeURIComponent(f)}${dueBy ? '&due_by=' + dueBy : ''}${mkQ}` + msQ), `fuhrpark-prueftermine_${ov.today}${ov.site ? '_' + fnPart(ov.site) : ''}_${f}${dueBy ? '_bis-' + dueBy : ''}${mKind ? '_' + fnPart(mKind) : ''}.csv`); } catch (err) { toast(err.message, true); } };
  const inp = $('#mimp');
  // Lückenzeilen aus dem eigenen Export (nicht ausgefüllt) getrennt und zugeklappt – sonst verdecken sie die echten Hinweise
  const GAP_ROW = 'Kein Termin eingetragen – Zeile bleibt unverändert';
  // Backlog 589: bei „Prüfart unbekannt“ die erlaubten Arten nennen (Spalte „Art“ erwartet den deutschen Namen bzw. einen Alias, Rückrufe eigener Import)
  const skipList = (list, title, open) => (list.length ? `<details ${open ? 'open' : ''}><summary>${esc(title)} (${list.length})</summary><ul class="small">${list.map((x) => `<li>${esc(t('line'))} ${x.line}${x.plate ? ' · ' + esc(x.plate) : ''}: ${esc(reasonText(x.reason))}</li>`).join('')}</ul></details>` : '');
  if (inp) inp.onchange = async () => {
    const file = inp.files[0]; if (!file) return;
    const text = await readCsvFile(file);
    const show = (r, applied) => {
      const box = $('#mimpr'); if (!box) return;
      box.innerHTML = `<p><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(t('ia_neu'))}: ${r.created} · ${esc(t('ia_aktualisiert'))}: ${r.updated} · ${esc(t('ia_unverändert'))}: ${r.unchanged} · ${esc(t('skipped'))}: ${r.skipped.length}</p>
        ${r.rows.length ? `<div class="scroll"><table><thead><tr><th>${esc(t('line'))}</th><th></th><th>${esc(t('kind'))}</th><th>${esc(t('next_due'))}</th><th></th></tr></thead><tbody>${r.rows.map((x) => `<tr><td>${x.line}</td><td style="white-space:nowrap">${esc(x.plate)}</td><td>${esc(mk(x.kind))}</td><td>${x.next_due_date || !x.next_due_km ? fmtD(x.next_due_date) : ''}${x.next_due_basis === 'berechnet' ? ` <span class="small muted">${esc(t('db_berechnet'))}</span>` : ''}${x.previous_due_date && x.previous_due_date !== x.next_due_date ? ` <span class="small muted">(${fmtD(x.previous_due_date)})</span>` : ''}${x.next_due_km ? `${x.next_due_date ? '<br>' : ''}<span>${esc(t('due_at_km'))} ${fmtKm(x.next_due_km)}</span>${x.previous_due_km && x.previous_due_km !== x.next_due_km ? ` <span class="small muted">(${fmtKm(x.previous_due_km)})</span>` : ''}` : ''}</td><td><span class="chip ${x.action === 'neu' ? 'ok' : x.action === 'aktualisiert' ? 'mittel' : ''}">${esc(t('ia_' + x.action))}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${skipList(r.skipped.filter((x) => x.reason !== GAP_ROW), t('skipped'), !applied)}${skipList(r.skipped.filter((x) => x.reason === GAP_ROW), t('imp_gap_rows'), false)}${r.skipped.some((x) => /^Prüfart unbekannt: /.test(x.reason || '')) ? `<p class="small" data-impkinds>${esc(t('imp_kinds_allowed'))}: ${(S.meta.maintenance_kinds || []).filter((k) => k !== 'Rückruf').map((k) => esc(k) + (mk(k) !== k ? ' (' + esc(mk(k)) + ')' : '')).join(', ')}</p>` : ''}
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
        ${r.rows.length ? `<div class="scroll"><table><thead><tr><th>${esc(t('line'))}</th><th></th><th>${esc(t('recall_ref'))}</th><th>${esc(t('next_due'))}</th><th></th></tr></thead><tbody>${r.rows.map((x) => `<tr><td>${x.line}</td><td style="white-space:nowrap">${esc(x.plate)}</td><td>${esc(x.reference)}${x.note ? `<br><span class="small muted">${esc(reasonText(x.note))}</span>` : ''}</td><td>${x.action === 'erledigt' ? `${esc(t('done_on'))} ${fmtD(x.done_on)}` : x.next_due_date ? fmtD(x.next_due_date) : esc(t('vi_recall_open'))}</td><td><span class="chip ${x.action === 'neu' ? 'ok' : x.action === 'aktualisiert' ? 'mittel' : ''}">${esc(act(x.action))}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${skipList(r.skipped, t('skipped'), !applied)}
        ${!applied && (r.created || r.updated) ? `<div class="actions"><button type="button" class="btn" id="rapply">${esc(t('apply_import'))}</button></div>` : ''}`;
      const ap = $('#rapply');
      if (ap) ap.onclick = async () => { ap.disabled = true; try { const done = await api('POST', '/api/maintenance/recalls/import', text, { headers: { 'content-type': 'text/csv' } }); toast('✓'); await viewMaint(); show(done, true); } catch (err) { ap.disabled = false; toast(err.message, true); } };
    };
    try { show(await api('POST', '/api/maintenance/recalls/import?dry_run=1', text, { headers: { 'content-type': 'text/csv' } }), false); } catch (err) { toast(err.message, true); }
  };
}
const KPI_VEH_MAX = 20;
const FINE_FILES_MAX = 20;
async function viewKpi() {
  const to = S.kpiTo || bYm(); const from = S.kpiFrom || bYm(2);
  let r;
  try { r = await api('GET', `/api/reports/kpi?from=${from}&to=${to}${S.kpiSite ? '&site=' + encodeURIComponent(S.kpiSite) : ''}${vsDef('kpiVsite') ? '&vsite=' + encodeURIComponent(vsDef('kpiVsite')) : ''}`); } catch (err) { if (err.status === 403 || err.status === 404) throw err; if (S.kpiFrom || S.kpiTo) { S.kpiFrom = null; S.kpiTo = null; toast(err.message, true); return viewKpi(); } render(`<h1>${esc(t('kpi'))}</h1><div class="panel alert">${esc(err.message)}</div>`, 'more'); return; }
  const st = (x) => (x.n ? `${dur(x.median_h)} <span class="small muted">(P90 ${dur(x.p90_h)}, n=${x.n})</span>` : '–');
  let html = `<h1>${esc(t('kpi'))}</h1>${printHead([`${t('period')}: ${fmtMonth(from)} – ${fmtMonth(to)}`, r.site ? `${t('workshop')}: ${r.site === 'ohne' ? t('kpi_no_site') : wsName(r.site)}` : '', r.vehicle_site ? `${t('kpi_vsite')}: ${r.vehicle_site === 'ohne' ? t('cs_nosite') : r.vehicle_site}` : ''])}${helpLink('kpi')}<form id="kf2" class="panel" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
    <div><label>${esc(t('from'))}</label><input type="month" name="from" value="${esc(from)}" required></div><div><label>${esc(t('to'))}</label><input type="month" name="to" value="${esc(to)}" required></div>
    ${r.sites.length > 1 || r.site ? `<div><label>${esc(t('workshop'))}</label><select name="site"><option value="">${esc(t('filter_all'))}</option>${[...new Set([...r.sites, ...(r.site ? [r.site] : [])])].map((x) => `<option value="${esc(x)}"${x === r.site ? ' selected' : ''}>${esc(x === 'ohne' ? t('kpi_no_site') : wsName(x))}</option>`).join('')}</select></div>` : ''}
    ${(r.vehicle_sites || []).length > 1 || r.vehicle_site ? `<div>${siteSelect('kvsite', 'vsite', r.vehicle_sites, r.vehicle_site, t('kpi_vsite'), t('filter_all'))}</div>` : ''}
    <div class="actions" style="margin:0"><button class="btn secondary">${esc(t('show'))}</button><button type="button" class="btn secondary" id="kpiprt">${esc(t('print'))}</button></div></form>${r.generated_at ? `<p class="small muted">${esc(t('kpi_status_basis').replace('{at}', fmtDT(r.generated_at)))}</p>` : ''}${r.site ? `<p class="small muted">${esc(t('kpi_site_hint'))}</p>` : ''}${r.vehicle_site ? `<p class="small muted">${esc(t('kpi_vsite_hint'))}</p>` : ''}${r.by_priority.length ? `<div class="actions" style="margin-top:0"><button type="button" class="btn secondary" id="kcsvv">${esc(t('kpi_csv_veh'))}</button><button type="button" class="btn secondary" id="kcsvp">${esc(t('kpi_csv_prio'))}</button></div>` : ''}`;
  html += r.by_priority.length ? r.by_priority.map((p) => `<section class="panel ${p.priority === 'kritisch' ? 'alert' : ''}"><h3>${esc(p.priority === 'alle' ? t('filter_all') : t('prio_' + p.priority))}</h3><dl class="kv">
    <dt>${esc(t('kpi_reports'))}</dt><dd>${p.created} · ${esc(t('kpi_released'))} ${p.released} · ${esc(t('kpi_open'))} ${p.open}${p.rejected ? ` · ${esc(t('kpi_rejected'))} ${p.rejected}${p.duplicates || p.withdrawn ? ` (${[p.duplicates ? esc(t('kpi_dupes').replace('{n}', p.duplicates)) : '', p.withdrawn ? esc(t('kpi_withdrawn').replace('{n}', p.withdrawn)) : ''].filter(Boolean).join(', ')})` : ''}` : ''}${p.internal ? ` · ${esc(t('kpi_internal').replace('{n}', p.internal))}` : ''}</dd>
    <dt>${esc(t('kpi_triage'))}</dt><dd>${st(p.triage)}</dd><dt>${esc(t('kpi_ack'))}</dt><dd>${st(p.workshop_ack)}</dd><dt>${esc(t('kpi_total'))}</dt><dd>${st(p.created_to_release)}</dd><dt>${esc(t('kpi_parts'))}</dt><dd>${dur(p.parts_wait_h)}</dd></dl></section>`).join('') : noneP();
  // Technische Verfügbarkeit (Flotte) – nur ohne Werkstattfilter; Liste der geringsten nur mit Ausfall
  const pct = (x) => `${fmtNum(x, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  const av = r.availability;
  if (av) html += `<section class="panel" id="kpiav"><h3>${esc(t('kpi_av'))}</h3><p><b style="font-size:1.4em">${esc(pct(av.pct))}</b> <span class="muted">${esc(t('kpi_av_of'))}</span></p><p>${esc(t('kpi_av_line').replace('{n}', fmtNum(av.vehicles)).replace('{d}', dur(av.downtime_h)))}</p>${av.lowest.length ? `<h4>${esc(t('kpi_av_lowest'))}</h4><div class="list">${av.lowest.map((x) => `<a class="row" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate || x.vehicle_id)}<span class="title">${esc(pct(x.pct))}</span><span class="sub">${esc(t('kpi_downtime'))}: ${dur(x.downtime_h)}</span></a>`).join('')}</div>` : `<p class="muted">${esc(t('kpi_av_none'))}</p>`}<p class="small muted">${esc(t('kpi_av_rule'))}</p><p class="small muted" id="kpical">${esc(t('kpi_calendar_hint'))}</p></section>`;
  else if (r.site) html += `<p class="small muted" id="kpiavsite">${esc(t('kpi_av_site'))}</p>`;
  // Fahrzeugliste: meiste Werkstattzeit zuerst, die ersten KPI_VEH_MAX; Gesamtzahl und „Alle anzeigen“ statt stillem Abschneiden (Druck zeigt alle)
  const kvAll = !!S.kpiVehAll || r.vehicles.length <= KPI_VEH_MAX; const kvShown = kvAll ? r.vehicles : r.vehicles.slice(0, KPI_VEH_MAX);
  if (r.vehicles.length) html += `<h2 id="kpiveh">${esc(t('kpi_vehicles'))} <span class="chip">${r.vehicles.length}</span></h2>${kvAll ? '' : `<div id="kpivmore" role="status"><p class="small muted">${esc(t('kpi_veh_more').replace('{n}', KPI_VEH_MAX).replace('{m}', r.vehicles.length))}</p><div class="actions" style="margin-top:0"><button type="button" class="btn secondary" id="kpivall">${esc(t('kpi_veh_all').replace('{m}', r.vehicles.length))}</button></div></div>`}<div class="list" id="kpivl">${kvShown.map((v) => `<a class="row" href="#/vehicles/${encodeURIComponent(v.vehicle_id)}">${plate(v.plate || v.vehicle_id)}<span class="title">${esc(t('kpi_workshop'))}: ${dur(v.workshop_h)}</span><span class="chip">${v.cases}</span><span class="sub">${esc(t('kpi_parts'))}: ${dur(v.parts_wait_h)} · ${esc(t('kpi_released'))} ${v.released}${v.duplicates ? ` · ${esc(t('kpi_dupes').replace('{n}', v.duplicates))}` : ''}${v.locked_h ? ` · <b style="color:var(--stop)">${esc(t('kpi_locked'))}: ${dur(v.locked_h)}</b>` : ''}${v.downtime_h ? ` · ${esc(t('kpi_downtime'))}: ${dur(v.downtime_h)}` : ''}${v.availability_pct !== null && v.availability_pct !== undefined && (v.downtime_h || v.availability_pct < 100) ? ` · ${esc(t('kpi_av_short'))}: ${esc(pct(v.availability_pct))}${v.availability_downtime_h && v.availability_downtime_h !== v.downtime_h ? ` (${esc(t('kpi_downtime'))}: ${dur(v.availability_downtime_h)})` : ''}` : ''}</span></a>`).join('')}</div>`;
  // Termintreue Teile-Liefertermine (nur Abschnitte „wartet auf Teile“ aus dem Zeitraum; Termin laut Werkstatt)
  const pe = r.parts_eta;
  const peLine = (x) => `${esc(t('kpi_pe_kept'))} ${x.kept} · ${esc(t('kpi_pe_late'))} ${x.late}${x.on_time_pct !== null ? ` (${x.on_time_pct} % ${esc(t('kpi_pe_on_time'))})` : ''}${x.late_days_median !== null ? ` · ${esc(t('kpi_pe_median'))} ${esc(nDays(x.late_days_median))}` : ''}${x.open_overdue ? ` · <b style="color:var(--stop)">${esc(t('kpi_pe_open'))} ${x.open_overdue}</b>` : ''}${x.without_eta ? ` · ${esc(t('kpi_pe_without'))} ${x.without_eta}` : ''}`;
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
  const dD = (v) => `${esc(nDays(v))}`;
  const stD = (x) => (x.n ? `${dD(x.median_d)} <span class="small muted">(P90 ${dD(x.p90_d)}, n=${x.n})</span>` : '–');
  if (idf && idf.inspections) html += `<section class="panel" id="kpiid"><h3>${esc(t('kpi_id'))}</h3><dl class="kv">
    <dt>${esc(t('kpi_id_insp'))}</dt><dd>${idf.inspections}</dd>
    <dt>${esc(t('kpi_id_ordered'))}</dt><dd>${idf.ordered}${idf.without_order ? ` · <b style="color:var(--stop)">${esc(t('kpi_id_without'))} ${idf.without_order}</b>` : ''}${idf.settled_without_order ? ` · ${esc(t('kpi_id_settled'))} ${idf.settled_without_order}` : ''}</dd>
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
    const b = $(id); if (b) b.onclick = async () => { try { download(await api('GET', `${kq}&part=${part}`), `fuhrpark-kennzahlen-${name}_${envFn()}_${from}_${to}${r.site ? '_' + fnPart(r.site) : ''}${r.vehicle_site ? '_' + fnPart(r.vehicle_site) : ''}.csv`); } catch (err) { toast(err.message, true); } };
  }
}
async function viewAudit(more, uArg, vArg) {
  // Person (handelnd oder betroffen) aus dem Direktsprung #/audit?u=<id> (Benutzer → „Protokoll“), Fahrzeug aus #/audit?v=<VIN:…>
  // (Fahrzeugakte → „Protokoll“); Adresse danach bereinigt. Ein Direktsprung ersetzt die jeweils andere Auswahl nicht.
  if (uArg) { S.auditUser = uArg; S.auditUserName = null; }
  if (vArg) { S.auditVeh = vArg; S.auditVehName = null; }
  if (uArg || vArg) { history.replaceState(history.state, '', '#/audit'); S.lastHash = '#/audit'; }
  const pv = S.auditVeh || '';
  const f = S.auditFilter || '';
  const pu = S.auditUser || '';
  const before = more ? S.auditBefore : null;
  const aq = S.auditQ || ''; const au = S.auditUntil || '';
  const extra = `${aq.length >= 2 ? '&q=' + encodeURIComponent(aq) : ''}${au ? '&until=' + encodeURIComponent(au) : ''}${pu ? '&user=' + encodeURIComponent(pu) : ''}${pv ? '&vehicle=' + encodeURIComponent(pv) : ''}`;
  let r;
  try { r = await api('GET', `/api/admin/audit?limit=100${f ? '&action=' + encodeURIComponent(f) : ''}${before ? '&before=' + encodeURIComponent(before) + (S.auditBeforeId ? '&before_id=' + encodeURIComponent(S.auditBeforeId) : '') : ''}${extra}`); }
  catch (err) { if ((pu || pv) && err.status === 404) { S.auditUser = null; S.auditVeh = null; toast(err.message, true); return viewAudit(); } throw err; }
  if (r.person) S.auditUserName = r.person.display_name || r.person.username;
  if (r.vehicle) S.auditVehName = r.vehicle.plate || r.vehicle.id;
  S.auditRows = more ? [...(S.auditRows || []), ...r.entries] : r.entries;
  S.auditBefore = r.entries.length ? r.entries[r.entries.length - 1].created_at : null;
  S.auditBeforeId = r.entries.length ? r.entries[r.entries.length - 1].id : null;
  const groups = [['', t('filter_all')], ['login', t('au_login')], ['user.', t('users')], ['vehicle', t('vehicles')], ['maintenance.', t('inspections_due')], ['backup.', t('backup')], ['reports.,contract.export,claim.export,maintenance.export,maintenance.history_export,stock.journal.export,admin.audit_export,backup.export', t('au_exports')] /* alle Exporte (20.10.2026: nur „reports.“), höchstens 8 Präfixe */, ['stock.', t('stock')], ['contract', t('ct_title')], ['claim', t('claims')], ['driver', t('drivers')], ['tacho.', t('tacho')], ['privacy.', t('data_export')], ['admin.', t('audit')], ['settings.', t('settings')], ['invite.,password.,session.,totp.,setup.,integration.', t('au_access')], ['tires.', t('tires')], ['telematics.', t('telematics')], ['emergency.', t('em_title')], ['master.', t('nav_master')]];
  const det = (d, refs) => auditDetailText(S.lang, d, refs); // Schlüssel in der Oberflächensprache, Werte unverändert (Rohtext in CSV/Suche)
  const gl = (groups.find(([k]) => k === f) || [])[1];
  // Betrifft: anderes Konto → Protokoll dieser Person, Fahrzeug → Fahrzeugakte (Ausdruck zeigt den Namen ohne Link)
  const auTarget = (e) => (e.target_plate ? ` · ${esc(t('au_target'))}: <a class="autgt" href="#/vehicles/${esc(e.target)}">${esc(e.target_plate)}</a>`
    : (e.target_name || e.target_username) && e.target !== e.actor_id ? ` · ${esc(t('au_target'))}: <a class="autgt" href="#/audit?u=${esc(e.target)}">${esc(e.target_name || e.target_username)}</a>`
    : e.target_driver_name ? ` · ${esc(t('au_target'))}: <a class="autgt" href="#/drivers/${esc(e.target)}">${esc(e.target_driver_name)}</a>` : ''); // Fahrerakte (20.10.2026)
  render(`<h1>${esc(t('audit'))}</h1>${helpLink('access')}<p class="small muted">${esc(t('audit_hint'))}</p>
    ${printHead([t('audit'), f ? `${t('audit_area')}: ${gl || f}` : '', aq.length >= 2 ? `${t('print_search')}: „${aq}“` : '', au ? `${t('audit_until')} ${fmtD(au)}` : '', pu ? `${t('audit_person')}: ${S.auditUserName || ''}` : '', pv ? `${t('vehicle')}: ${S.auditVehName || ''}` : '', t('print_count').replace('{n}', S.auditRows.length)])}
    <form id="aqf" class="actions noprint" style="flex-wrap:wrap;align-items:flex-end;margin-top:0"><div style="flex:1 1 200px"><label for="afsel">${esc(t('audit_area'))}</label><select id="afsel">${groups.map(([k, l]) => `<option value="${esc(k)}"${f === k ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div style="flex:1 1 200px"><label for="aqs">${esc(t('audit_search'))}</label><input id="aqs" name="q" type="search" value="${esc(aq)}" maxlength="60" placeholder="${esc(t('audit_search_ph'))}">${aq.length === 1 ? `<p class="small muted" id="aqmin" role="status" style="margin:4px 0 0">${esc(t('audit_search_min').replace('{q}', aq))}</p>` : ''}</div>
      <div><label for="auntil">${esc(t('audit_until'))}</label><input id="auntil" name="until" type="date" value="${esc(au)}" max="${esc(bDate())}"></div><button class="btn secondary">${esc(t('show'))}</button><button type="button" class="btn secondary" id="aprt">${esc(t('print'))}</button></form>
    ${pu ? `<div class="panel" id="aupers" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span><b>${esc(t('audit_person'))}:</b> ${esc(S.auditUserName || '')}</span><span class="small muted" style="flex:1 1 200px">${esc(t('audit_person_hint'))}</span><button type="button" class="btn secondary noprint" id="aupx">${esc(t('audit_person_all'))}</button></div>` : ''}
    ${pv ? `<div class="panel" id="auveh" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span><b>${esc(t('vehicle'))}:</b> <a href="#/vehicles/${esc(pv)}">${esc(S.auditVehName || '')}</a></span><span class="small muted" style="flex:1 1 200px">${esc(t('audit_veh_hint'))}</span><button type="button" class="btn secondary noprint" id="auvx">${esc(t('audit_veh_all'))}</button></div>` : ''}
    <details class="panel noprint"><summary>${esc(t('audit_csv'))}</summary><form id="auf" class="actions" style="flex-wrap:wrap;align-items:flex-end"><div><label>${esc(t('from'))}</label><input type="date" name="from" required value="${esc(S.auditFrom || bDate().slice(0, 8) + '01')}" max="${esc(bDate())}"></div><div><label>${esc(t('to'))}</label><input type="date" name="to" required value="${esc(S.auditTo || bDate())}" max="${esc(bDate())}"></div><button class="btn secondary">${esc(t('export_csv'))}</button></form><p class="small muted">${esc(t('audit_csv_hint'))}</p></details>
    <div class="list">${S.auditRows.map((e) => `<div class="row ${['login.locked', 'login.ip_limited', 'integration.token_limited'].includes(e.action) ? 'p-kritisch' : e.action === 'login.new_device' ? 'p-mittel' : ''}"><span class="chip">${fmtDT(e.created_at)}</span><span class="title" style="white-space:normal">${auditActionLabel(S.lang, e.action) ? `${esc(auditActionLabel(S.lang, e.action))} <span class="small muted">${esc(e.action)}</span>` : esc(e.action)}</span><span></span><span class="sub" style="white-space:normal">${esc(e.actor_name || t('au_system'))}${e.detail ? ' · ' + esc(det(e.detail, e.refs)) : ''}${auTarget(e)}</span></div>`).join('') || noneP()}</div>
    ${r.entries.length === 100 ? `<div class="actions noprint"><button type="button" class="btn secondary" id="amore">${esc(t('load_more'))}</button></div><p class="print-only small" id="aumorep">${esc(t('audit_more_print'))}</p>` : ''}`, 'more');
  $('#afsel').onchange = (e) => { S.auditFilter = e.target.value; viewAudit(); };
  $('#aqf').onsubmit = (e) => { e.preventDefault(); S.auditQ = $('#aqs').value.trim(); S.auditUntil = $('#auntil').value; viewAudit(); };
  const am = $('#amore'); if (am) am.onclick = () => viewAudit(true);
  const apx = $('#aupx'); if (apx) apx.onclick = () => { S.auditUser = null; S.auditUserName = null; viewAudit(); };
  $('#aprt').onclick = () => window.print();
  const avx = $('#auvx'); if (avx) avx.onclick = () => { S.auditVeh = null; S.auditVehName = null; viewAudit(); };
  const af = $('#auf');
  af.onsubmit = async (e) => { e.preventDefault(); S.auditFrom = af.from.value; S.auditTo = af.to.value;
    if (af.from.value > af.to.value) { toast(t('err_from_after_to'), true); return; }
    try { const blob = await api('GET', `/api/admin/audit?format=csv&from=${encodeURIComponent(af.from.value)}&to=${encodeURIComponent(af.to.value)}${f ? '&action=' + encodeURIComponent(f) : ''}${aq.length >= 2 ? '&q=' + encodeURIComponent(aq) : ''}${pu ? '&user=' + encodeURIComponent(pu) : ''}${pv ? '&vehicle=' + encodeURIComponent(pv) : ''}`); download(blob, `fuhrpark-protokoll_${af.from.value}_${af.to.value}${pu && S.auditUserName ? '_' + fnPart(S.auditUserName) : ''}${pv && S.auditVehName ? '_' + fnPart(S.auditVehName) : ''}.csv`); if (blob.cfpTruncated) toast(t('audit_csv_truncated').replace('{n}', blob.cfpTruncated), true); } catch (err) { toast(err.message, true); } };
}
// Filter steht in der Adresse (#/vehicles/<id>/timeline?f=<Bereich>): „Zurück“ aus einem Vorgang zeigt dieselbe Auswahl,
// Links können direkt gefiltert öffnen; unbekannte oder für die Rolle nicht sichtbare Bereiche → „Alle“
const TL_GROUPS = { '': [], case: ['case', 'case_closed'], inspection: ['inspection'], tire: ['tire'], maintenance: ['maintenance', 'odometer'], document: ['document'], driver: ['driver_from', 'driver_to'], fine: ['fine'], tacho: ['tacho'], contract: ['contract'], claim: ['claim'], note: ['note'], status: ['status'] };
const TL_MGR_ONLY = ['fine', 'tacho', 'contract', 'claim', 'status'];
async function viewTimeline(id, fArg) {
  const groups = TL_GROUPS;
  const f = fArg && Object.prototype.hasOwnProperty.call(groups, fArg) && (!TL_MGR_ONLY.includes(fArg) || isMgr()) ? fArg : '';
  const r = await api('GET', `/api/vehicles/${encodeURIComponent(id)}/timeline?limit=500${f ? '&types=' + groups[f].join(',') : ''}`);
  const km = (n) => (n === null || n === undefined ? '' : ` · ${fmtKm(n)}`);
  const caseLink = (x) => (x.case_id ? ` · <a href="#/cases/${esc(x.case_id)}">${esc(x.case_no || t('details'))}</a>` : '');
  const line = (x) => {
    switch (x.type) {
      case 'case': return [x.priority === 'kritisch' ? 'p-kritisch' : '', `${esc(t('tl_case'))}: ${esc(clipTxt(cDesc(x.text), 140))}`, `<span class="chip ${esc(x.priority)}">${esc(t('prio_' + x.priority))}</span> ${esc(t('st_' + x.status))}${caseLink(x)}`];
      case 'case_closed': return ['', `${esc(t('tl_case_closed'))}`, `${esc(t('st_' + x.status))}${caseLink(x)}`];
      case 'inspection': return [x.result === 'maengel' ? 'p-mittel' : '', `${esc(t(x.inspection_kind === 'abfahrt' ? 'departure_check' : 'inspection'))}: ${esc(t(x.result === 'ok' ? 'ok' : 'defect'))}`, `${esc(pnm(x.by, x.by_hidden) || '')}${km(x.km)}${x.received_at ? ` · ${esc(t('insp_received_late').replace('{d}', fmtDT(x.received_at)))}` : ''}${caseLink(x)}`];
      case 'odometer': return [x.note || x.km_drop ? 'p-mittel' : '', `${esc(t('km'))}${km(x.km)}`, `${esc(odoSrc(x.source))}${x.note ? ' · ' + esc(x.note) : ''}${x.km_drop && !x.note && x.odometer_id ? ` · ${esc(t('odo_drop_unexplained'))} <button type="button" class="linkbtn" data-odonote="${esc(x.odometer_id)}">${esc(t('odo_add_reason'))}</button>` : ''}`];
      case 'driver_from': return ['', `${esc(t('tl_driver_from'))}: ${esc(x.by)}`, esc(evTr(x.evidence))];
      case 'driver_to': return ['', `${esc(t('tl_driver_to'))}: ${esc(x.by)}`, ''];
      case 'document': return ['', `${esc(t('dk_' + (x.doc_kind || 'sonstiges')))}: <a href="${fileUrl(x.file_id)}" target="_blank" rel="noopener">${esc(x.text)}</a>`, x.valid_until ? `${esc(t('valid_until'))} ${fmtD(x.valid_until)}` : ''];
      case 'tire': return [x.tread_mm !== null && x.tread_mm < 1.6 ? (x.position === 'Reserve' ? 'p-mittel' : 'p-kritisch') : '', `${esc(t('tires'))} ${esc(posL(x.position))}: ${esc(t('te_' + x.tire_event))}${x.tread_mm !== null ? ' · ' + esc(fmtMm(x.tread_mm)) : ''}`, `${km(x.km).replace(/^ · /, '')}${caseLink(x)}`];
      case 'maintenance': return [DEFECT_RESULTS.includes(x.result) ? 'p-kritisch' : '', `${esc(mk(x.maintenance_kind))} ${esc(t('tl_done'))}${x.result ? ` <span class="chip ${DEFECT_RESULTS.includes(x.result) ? 'kritisch' : x.result === 'ohne_maengel' ? 'ok' : ''}">${esc(t('res_' + x.result))}</span>` : ''}`, `${esc(x.evidence || '')}${km(x.km)}${x.by ? ' · ' + esc(x.by) : ''}`];
      case 'tacho': return ['', esc(t('tl_tacho')), `${esc(x.evidence || '')}${x.by ? ' · ' + esc(x.by) : ''}`];
      case 'contract': return ['', `${esc(t('ck_' + x.contract_kind))}: ${esc(t(x.contract_event === 'end' ? 'tl_contract_end' : 'tl_contract_start'))}`, `${esc(x.partner)}${x.evidence ? ' · ' + esc(x.evidence) : ''}`];
      case 'claim': return ['', `${esc(t('claim_title'))}: ${esc(t({ reimbursed: 'tl_claim_reimbursed', appraisal: 'ca_on', appraisal_received: 'ca_received' }[x.claim_event] || 'tl_claim_reported'))}${x.claim_event === 'reimbursed' && x.reimbursed_net !== null ? ' · ' + eur(x.reimbursed_net) : ''}${x.claim_event === 'appraisal_received' && x.appraisal_net != null ? ' · ' + eur(x.appraisal_net) : ''}${x.appraiser && x.claim_event.startsWith('appraisal') ? ' · ' + esc(x.appraiser) : ''}`, `${esc(x.insurer)}${x.claim_no ? ' · ' + esc(t('claim_no')) + ' ' + esc(x.claim_no) : ''}${x.claim_event === 'reported' ? ' · ' + esc(t('cls_' + x.status)) : ''}${caseLink(x)}`];
      case 'note': { const gone = x.note_event === 'archive' || x.note_event === 'expire';
        const meta = x.note_event === 'archive' ? [t('vnote_archived')] : x.note_event === 'expire' ? [t('vnote_expired').replace('{d}', fmtD(x.valid_until))] : [x.for_driver ? t('vnote_driver_chip') : '', x.valid_until ? t('vnote_until').replace('{d}', fmtD(x.valid_until)) : ''];
        return ['', `${esc(t('vnotes'))}: ${gone ? `<s>${esc(x.text)}</s>` : esc(x.text)}`, esc(meta.filter(Boolean).join(' · '))]; }
      case 'fine': return ['', `${esc(t('fk_' + x.fine_kind))}: <a href="#/fines/${esc(x.fine_id)}">${esc(x.fine_no)}</a>`, esc(t('fs_' + x.status))];
      case 'status': if (x.status_event === 'site') return ['', esc(t('tl_st_site')), `${esc(x.site_from || t('cs_nosite'))} → ${esc(x.site_to || t('cs_nosite'))}${x.by ? ' · ' + esc(x.by) : ''}`];
        return [['eval_exclude', 'deactivate'].includes(x.status_event) ? 'p-mittel' : '', esc(t('tl_st_' + x.status_event)), `${x.status_reason ? esc(t('inactive_reason')) + ': ' + esc(x.status_reason) : ''}${x.status_reason && x.by ? ' · ' : ''}${x.by ? esc(x.by) : ''}`];
      default: return ['', esc(x.type), ''];
    }
  };
  const labels = { '': t('filter_all'), case: t('nav_cases'), inspection: t('inspections'), tire: t('tires'), maintenance: t('maintenance'), document: t('documents'), driver: t('drivers'), fine: t('fines'), tacho: t('tacho'), contract: t('ct_title'), claim: t('claims'), note: t('vnotes'), status: t('tl_status') };
  const visible = Object.keys(groups).filter((k) => !TL_MGR_ONLY.includes(k) || isMgr()).filter((k) => k !== 'tacho' || r.vehicle.kind !== 'anhaenger')
    .filter((k) => k !== 'driver' || isMgr() || S.me.role === 'dispatch'); // Fahrerzuordnungen liefert der Server nur diesen Rollen (sonst „–“ wie „nie zugeordnet“, 20.10.2026)
  // Ausdruck (z. B. Fahrzeughistorie für Verkauf/Rückgabe): Kennzeichen, Auswahl und Anzahl im Vermerk
  render(`<p class="noprint"><a class="backlink" href="#/vehicles/${esc(id)}">‹ ${esc(t('back'))}</a></p><div>${plate(r.vehicle.plate, { big: true })}</div>
    <h1 style="margin-top:12px" data-title="${esc(r.vehicle.plate)} · ${esc(t('timeline'))}">${esc(t('timeline'))}</h1>${printHead([r.vehicle.plate, `${t('print_filter')}: ${labels[f]}`, t('print_count').replace('{n}', r.items.length) + (r.truncated ? ' · ' + t('tl_trunc_short') : '')])}<p class="small muted">${esc(t('timeline_hint'))}</p>${r.truncated ? `<p class="small" id="tltrunc">⚠ ${esc(t('tl_truncated').replace('{n}', r.items.length))}</p>` : ''}
    <div class="actions noprint"><button type="button" class="btn secondary" id="tlprt">${esc(t('print'))}</button></div>
    <div class="actions" style="flex-wrap:wrap">${visible.map((k) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" aria-pressed="${f === k}" data-tl="${esc(k)}">${esc(labels[k])}</button>`).join('')}</div>
    <div class="list">${r.items.map((x) => { const [cls, title, sub] = line(x); return `<div class="row ${cls}"><span class="chip">${x.at.length === 10 ? fmtD(x.at) : fmtDT(x.at)}</span><span class="title" style="white-space:normal">${title}</span><span></span>${sub ? `<span class="sub" style="white-space:normal">${sub}</span>` : ''}</div>`; }).join('') || noneP()}</div>
`, 'vehicles');
  $('#tlprt').onclick = () => window.print();
  // Rücksprung ohne Begründung: Begründung nachtragen (km-Wert bleibt; Datenqualität „Rücksprung ohne Begründung“ erledigt sich)
  $$('[data-odonote]').forEach((b) => (b.onclick = async () => {
    const n = prompt(t('odo_reason_prompt')); if (!n || !n.trim()) return;
    try { await api('POST', `/api/odometer/${encodeURIComponent(b.dataset.odonote)}/note`, { note: n.trim() }); toast(t('saved_ok')); viewTimeline(id, fArg); } catch (err) { toast(err.message, true); }
  }));
  // Filterwechsel ersetzt nur den Verlaufseintrag (kein neuer Eintrag je Klick), Fokus bleibt auf dem gewählten Knopf
  $$('[data-tl]').forEach((b) => (b.onclick = async () => {
    const k = b.dataset.tl;
    try { history.replaceState(history.state, '', tlHash(id, k)); } catch { /* z. B. eingeschränkte Vorschau */ }
    S.lastHash = (location.hash || '').replace(/%3A/gi, ':');
    await viewTimeline(id, k);
    const nb = document.querySelector(`[data-tl="${k}"]`); if (nb) nb.focus({ preventScroll: true });
  }));
}
async function viewPlan(sec) {
  const days = S.planDays || 14;
  const mgr = S.me.role !== 'workshop';
  const site = mgr ? (S.planSite || '') : '';
  const vsite = vsDef('planVsite') || '';
  const pq = `${site ? '&site=' + encodeURIComponent(site) : ''}${vsite ? '&vsite=' + encodeURIComponent(vsite) : ''}`;
  const r = await api('GET', `/api/workshop/plan?days=${days}${pq}`);
  const loc = uiLoc();
  // Wochentag einzeln (Chromium setzt ihn im Ukrainischen mit Tag/Monat in den Akkusativ: „середу“ statt „середа“, 19.10.2026)
  const wd = (d) => { const x = new Date(d + 'T12:00:00Z'); return `${x.toLocaleDateString(loc, { weekday: 'long', timeZone: 'UTC' })}, ${x.toLocaleDateString(loc, { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}`; };
  // weiterer geplanter Tag desselben Fahrzeugs → Hinweis zum Zusammenlegen (nur Anzeige)
  const other = (i) => (i.other_dates && i.other_dates.length ? `<span class="otherdates">${esc(t('plan_other_dates'))}: ${i.other_dates.map(fmtD).join(', ')}</span>` : '') + (i.coupled && i.coupled_dates && i.coupled_dates.length ? `${i.other_dates && i.other_dates.length ? ' · ' : ''}<span class="otherdates" data-cdates>🔗 ${esc(t('plan_coupled_dates').replace('{v}', i.coupled.plate))}: ${i.coupled_dates.map(fmtD).join(', ')}</span>` : '');
  const subs = (...xs) => { const x = xs.filter(Boolean); return x.length ? `<span class="sub" style="white-space:normal">${x.join(' · ')}</span>` : ''; };
  // Prüftermin abarbeiten (Backlog 236): Inhaber/Leitung/Werkstatt springen direkt ins Formular „Durchführung erfassen“ des Eintrags und nach dem
  // Speichern zurück in den Plan (Sammeltermin: ein Fahrzeug nach dem anderen); HU/SP ohne eigenen Eintrag (`husp:`) wie bisher zur Akte
  const canDone = isMgr() || S.me.role === 'workshop';
  const doneHref = (i) => '#/vehicles/' + encodeURIComponent(i.vehicle_id) + (canDone && i.id && /^[\w-]+$/.test(i.id) ? '?done=' + encodeURIComponent(i.id) : '');
  // Fahrzeug-Standort je Zeile, wenn nicht nach Fahrzeug-Standort gefiltert und mehrere Standorte (23.10.2026)
  const vsTag = (i) => (!r.vehicle_site && (r.vehicle_sites || []).length > 1 && i.vehicle_site_label ? `<span data-vsite>📍 ${esc(i.vehicle_site_label === 'ohne' ? t('cs_nosite') : i.vehicle_site_label)}</span>` : '');
  const row = (i) => i.type === 'case'
    ? `<a class="row p-${esc(i.priority)}" href="#/cases/${esc(i.id)}">${plate(i.plate, { locked: i.safety_lock })}<span class="title">${esc(i.case_no)} · ${woTag(i)}${ltxt(clipTxt(cDesc(i.description), 100))}</span><span class="chip">${esc(t('st_' + i.status))}</span>${subs(vsTag(i), planVehTag(i), mgr && !site && esc(wsName(i.workshop_site)), i.planned_note && `<span data-plannote>📝 ${esc(t('plan_note_lbl'))}: ${esc(clipTxt(i.planned_note, 120))}</span>`, i.vehicle_location && `<span data-vloc>${esc(t('vl_title'))}: ${esc(clipTxt(i.vehicle_location, 80))}${vlAt(i)}</span>`, hoMissing(i).length && `<span class="chip mittel" data-hotag style="white-space:nowrap">${esc(hoMissing(i).join(', '))}</span>`, partsEta(i, '', true), i.status === 'wartet_teile' && i.parts_expected_date && i.planned_date && i.planned_date < i.parts_expected_date && `<span class="chip mittel">${esc(t('plan_before_parts'))}</span>`, i.reschedules >= 2 && `<span class="chip mittel" style="white-space:nowrap">${esc(tn('plan_moved_n', i.reschedules))}</span>`, i.after_due_date && `<span class="chip kritisch">${esc(t('wplan_mdue_late').replace('{d}', fmtD(i.planned_date)))} (${fmtD(i.after_due_date)})</span>`, other(i))}</a>`
    : `<a class="row" href="${doneHref(i)}" data-fromplan>${plate(i.plate)}<span class="title">${esc(t('planned_inspection'))}: ${esc(mk(i.kind))}</span>${i.next_due_date ? `<span class="chip">${esc(t('next_due'))} ${fmtD(i.next_due_date)}</span>` : ''}${subs(vsTag(i), planVehTag(i), i.after_due_date && `<span class="chip kritisch" data-afterdue>${esc(t('wplan_mdue_late').replace('{d}', fmtD(i.planned_date)))} (${fmtD(i.after_due_date)})</span>`, i.order && `🔧 ${esc(t('mo_open'))} ${esc(i.order.case_no)}`, kmTxt(i), other(i))}</a>`;
  // km-Fälligkeit als Text (Rest bzw. überschritten); ohne km-Regel leer
  function kmTxt(i) {
    if (i.next_due_km === null || i.next_due_km === undefined) return '';
    // Zähler gesunken: keine Restlaufleistung, sondern Hinweis (gleicher Text wie Fahrzeugakte/Prüftermine)
    if (i.km_unclear) return `${esc(t('due_at_km'))} ${fmtKm(i.next_due_km)} · <span class="km-unclear">${esc(t('km_unclear_drop').replace('{d}', fmtD(i.km_drop_at)))}</span>`;
    const rest = i.km_remaining === null || i.km_remaining === undefined ? '' : ` (${i.km_remaining < 0 ? esc(t('km_over')) + ' ' + fmtKm(-i.km_remaining) : esc(t('km_left')) + ' ' + fmtKm(i.km_remaining)})`;
    return `${esc(t('due_at_km'))} ${fmtKm(i.next_due_km)}${rest}`;
  }
  // Fällig ohne Termin (nach Datum oder km): Sprung in die Fahrzeugakte, dort Termin planen oder Werkstattauftrag anlegen
  const drow = (i) => `<a class="row ${i.status === 'ueberfaellig' ? 'p-kritisch' : 'p-mittel'}" href="${doneHref(i)}" data-fromplan>${plate(i.plate)}<span class="title">${esc(mk(i.kind))}${i.next_due_date ? ' · ' + esc(t('next_due')) + ' ' + fmtD(i.next_due_date) : ''}</span><span class="chip ${i.status === 'ueberfaellig' ? 'kritisch' : 'mittel'}">${esc(i.status === 'ohne_termin' && i.recall_ref ? t('vi_recall_open') : t('ms_' + i.status))}${i.by_km ? ' · km' : ''}</span>${subs(vsTag(i), kmTxt(i), i.recall_ref && esc(i.recall_ref), i.prev_cycle_open && `<span data-mdue-prev>${esc(t('wplan_sp_prev_open').replace('{m}', `${i.prev_cycle_open.slice(5, 7)}/${i.prev_cycle_open.slice(0, 4)}`))}</span>`, i.past_planned_date && `${esc(t('wplan_mdue_past'))} ${fmtD(i.past_planned_date)}`, i.planned_after_due && `<span data-mdue-late>${esc(t('wplan_mdue_late').replace('{d}', fmtD(i.planned_after_due)))}</span>`, other(i))}</a>`;
  let html = `<h1>${esc(t('wplan'))}</h1><p class="small muted noprint">${esc(t('wplan_hint'))}</p>${r.days.some((d) => d.items.filter((x) => x.type === 'case').length > 1) ? `<p class="small muted noprint" id="wpdayorder">${esc(t('day_order_hint'))}</p>` : ''}
    <p class="print-only small">${printStamp()} · ${site || r.site ? esc(wsName(site || r.site)) + ' · ' : ''}${r.vehicle_site ? esc(t('kpi_vsite')) + ': ' + esc(r.vehicle_site === 'ohne' ? t('cs_nosite') : r.vehicle_site) + ' · ' : ''}${fmtD(r.from)} – ${fmtD(r.to)} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="panel noprint" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
      ${mgr ? `<div><label for="psite">${esc(t('workshop'))}</label><select id="psite"><option value="">${esc(t('all'))}</option>${wsAll().map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}</select></div>` : ''}
      ${(r.vehicle_sites || []).length > 1 || r.vehicle_site ? `<div>${siteSelect('pvsite', '', r.vehicle_sites, r.vehicle_site, t('kpi_vsite'), t('filter_all'))}</div>` : ''}
      <div><label for="pdays">${esc(t('period'))}</label><select id="pdays">${[7, 14, 30, 60].map((n) => `<option value="${n}"${n === days ? ' selected' : ''}>${esc(nDays(n))}</option>`).join('')}</select></div>
      <button type="button" class="btn secondary" id="plprt">${esc(t('print'))}</button><button type="button" class="btn secondary" id="pics">${esc(t('export_ics'))}</button></div>`;
  // Termin direkt im Plan setzen (Backlog 60): nur für Aufträge, die der Vorgangsbefehl set_planned_date zulässt.
  // „Vorschlag“ füllt nur das Feld (Werktag mit den wenigsten geplanten Aufträgen) – gespeichert wird erst mit „Termin setzen“.
  const canEdit = ['owner', 'fleet', 'workshop'].includes(S.me.role);
  const setForm = (i) => i.can_plan
    ? `<div class="planset noprint"><label for="pd-${esc(i.id)}">${esc(t('planned'))}</label><input type="date" id="pd-${esc(i.id)}" min="${esc(r.today)}" value="">${i.planned_date ? `<input type="text" id="pr-${esc(i.id)}" maxlength="500" placeholder="${esc(t('plan_reason_ph'))}" aria-label="${esc(t('plan_reason_ph'))}">` : ''}<button type="button" class="btn secondary" data-psug="${esc(i.id)}" title="${esc(t('plan_suggest_hint'))}">${esc(t('plan_suggest'))}</button><button type="button" class="btn" data-pset="${esc(i.id)}">${esc(t('plan_set'))}</button></div>`
    : canEdit ? `<p class="small muted noprint planset">${esc(t('plan_need_ack'))}</p>` : '';
  // Werkstatt wechseln direkt im Plan (Backlog 265, Teilagent „Werkstatt fällt eine Woche aus“): Leitung, Aufträge im Status „freigegeben“
  // (wie der Vorgangsbefehl reassign_workshop), Grund Pflicht; aktive Werkstätten außer der bisherigen
  const canWs = (i) => i.type === 'case' && isMgr() && i.status === 'werkstatt_freigegeben';
  const wsForm = (i) => canWs(i) ? `<details class="planws noprint"><summary>${esc(t('act_reassign_workshop'))}</summary><label for="pw-${esc(i.id)}">${esc(t('workshop'))}</label><select id="pw-${esc(i.id)}">${(S.meta.workshops || []).filter((w) => w.code !== i.workshop_site).map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>${rwsDrop(i)}<input type="text" id="pwr-${esc(i.id)}" maxlength="2000" placeholder="${esc(t('pws_reason_ph'))}" aria-label="${esc(t('pws_reason_ph'))}"><button type="button" class="btn secondary" data-pws="${esc(i.id)}">${esc(t('save'))}</button></details>` : '';
  const prow = (i, base) => i.type === 'case' && canEdit ? `<div class="planitem">${base}${setForm(i)}${wsForm(i)}</div>` : base;
  const drowC = (i) => (canWs(i) ? `<div class="planitem">${row(i)}${wsForm(i)}</div>` : row(i));
  if (r.overdue.length) html += `<h2>${esc(t('wplan_overdue'))} <span class="chip kritisch">${r.overdue.length}</span></h2><div class="list">${r.overdue.map((i) => prow(i, row(i).replace('<span class="chip">', `<span class="chip kritisch">${fmtD(i.planned_date)} · `))).join('')}</div>`;
  // begonnene Aufträge mit vergangenem Termin (Backlog 253): eigene Gruppe, Termin neutral, Teile-Liefertermin in der Zeile
  const iw = r.in_work || [];
  if (iw.length) html += `<h2 id="wp-inwork">${esc(t('wplan_inwork'))} <span class="chip">${iw.length}</span></h2><p class="small muted noprint">${esc(t('wplan_inwork_hint'))}</p><div class="list">${iw.map((i) => prow(i, row(i).replace('<span class="chip">', `<span class="chip">${fmtD(i.planned_date)} · `))).join('')}</div>`;
  html += r.days.length ? r.days.map((d) => `<h2>${esc(wd(d.date))}${d.date === r.today ? ` <span class="chip ok">${esc(t('today'))}</span>` : ''}${holName(d.date) ? ` <span class="chip mittel" data-hol title="${esc(t('plan_holiday_hint'))}">${esc(holName(d.date))}</span>` : ''}</h2><div class="list">${d.items.map(drowC).join('')}</div>`).join('') : `<div class="panel">${esc(t('wplan_empty'))}</div>`;
  if (r.unplanned.length) html += `<h2>${esc(t('wplan_unplanned'))} <span class="chip mittel">${r.unplanned.length}</span></h2><p class="small muted noprint">${esc(t('wplan_unplanned_hint'))}</p><div class="list">${r.unplanned.map((i) => prow(i, row(i))).join('')}</div>`;
  const md = r.maintenance_due || [];
  if (md.length) html += `<h2 id="wp-mdue" tabindex="-1" data-keepfocus>${esc(t('wplan_mdue'))} <span class="chip ${md.some((i) => i.status === 'ueberfaellig') ? 'kritisch' : 'mittel'}">${md.length}</span></h2><p class="small muted noprint">${esc(t('wplan_mdue_hint'))}</p><div class="list">${md.map((i) => { const f = !['HU', 'SP'].includes(i.kind) ? maintOrderHtml(i.id, i.kind, null, { site: i.vehicle_site, svc: i.service_contracts || [] }) : ''; return f ? `<div class="planitem">${drow(i)}${f}</div>` : drow(i); }).join('')}</div>`;
  render(html, 'more');
  // Direktsprung aus Startseite/„Heute zu tun“ (#/plan?s=mdue): Abschnitt „Fällig – ohne Termin“ zeigen; fehlt er, bleibt der Plan oben
  $$('a[data-fromplan]').forEach((a) => (a.onclick = () => { S.fromPlan = location.hash || '#/plan'; }));
  if (sec === 'mdue') { const h = $('#wp-mdue'); if (h) { h.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true }); } }
  const all = [...r.overdue, ...(r.in_work || []), ...r.unplanned];
  const suggest = (i) => {
    // Wartet der Auftrag auf Teile mit Liefertermin: frühestens an diesem Tag (Termin laut Werkstatt, die App schätzt nichts).
    const minD = i.status === 'wartet_teile' && i.parts_expected_date > r.today ? i.parts_expected_date : '';
    // Hat dasselbe Fahrzeug ab morgen schon einen Termin (anderer Auftrag oder Prüfung) an einem Werktag: diesen vorschlagen –
    // das Fahrzeug fällt dann nur einmal aus. Sonst Werktag ab morgen mit den wenigsten geplanten Aufträgen derselben Werkstatt.
    // Wochenende und bundesweite Feiertage nie vorschlagen (Backlog 267; vorher z. B. 25.12./01.01.)
    const same = r.days.filter((d) => d.date > r.today && d.date >= minD && ![0, 6].includes(new Date(d.date + 'T12:00:00Z').getUTCDay()) && !federalHoliday(d.date)
      && d.items.some((x) => x.vehicle_id === i.vehicle_id && x.id !== i.id && (x.type === 'maintenance' || x.workshop_site === i.workshop_site)))[0];
    if (same) return same.date;
    // Auslastung vom Server (alle Aufträge der Werkstatt, auch bei Fahrzeug-Standortfilter); ältere Antwort: aus den angezeigten Tagen
    const load = r.case_load ? new Map(Object.entries(r.case_load).map(([d, m]) => [d, m[i.workshop_site] || 0])) : new Map(r.days.map((d) => [d.date, d.items.filter((x) => x.type === 'case' && x.workshop_site === i.workshop_site).length]));
    let best = null;
    for (let n = 1; n <= days + 7 + (minD ? Math.max(0, Math.round((Date.parse(minD) - Date.parse(r.today)) / 86400000)) : 0); n++) {
      const d = new Date(Date.parse(r.today + 'T00:00:00Z') + n * 86400000);
      if ([0, 6].includes(d.getUTCDay())) continue;
      const ds = [d.getUTCFullYear(), String(d.getUTCMonth() + 1).padStart(2, '0'), String(d.getUTCDate()).padStart(2, '0')].join('-'); const c = load.get(ds) || 0;
      if (federalHoliday(ds)) continue;
      if (ds < minD) continue;
      if (!best || c < best.c) best = { ds, c };
      if (ds >= r.to && ds >= minD && best) break;
    }
    return best && best.ds;
  };
  // Werkstattauftrag aus „Fällig – ohne Termin“ (nur Leitung, nicht HU/SP): bleibt im Plan, der Auftrag erscheint danach unter „Ohne Termin“
  $$('form[data-mord]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); fm.querySelector('button').disabled = true; try { const x = await api('POST', `/api/maintenance/${fm.dataset.mord}/order`, { ...b, request_key: fm.dataset.key || (fm.dataset.key = uid()) }); toast('✓ ' + x.case_no); viewPlan(); } catch (err) { fm.querySelector('button').disabled = false; toast(err.message, true); } }));
  offDayWatch($$('.planset input[type=date]'));
  $$('[data-psug]').forEach((b) => (b.onclick = () => { const i = all.find((x) => x.id === b.dataset.psug); const f = $('#pd-' + CSS.escape(i.id)); f.value = suggest(i) || ''; f.focus(); }));
  $$('[data-pset]').forEach((b) => (b.onclick = async () => {
    const i = all.find((x) => x.id === b.dataset.pset); const f = $('#pd-' + CSS.escape(i.id));
    if (!f.value) { toast(t('plan_pick_date'), true); f.focus(); return; }
    b.disabled = true;
    try { await api('POST', `/api/cases/${i.id}/commands`, { action: 'set_planned_date', command_id: uid(), expected_version: i.version, note: ($('#pr-' + CSS.escape(i.id))?.value || '').trim() || null, payload: { planned_date: f.value } }); toast('✓'); viewPlan(); }
    catch (err) { b.disabled = false; toast(err.message, true); if (err.code === 'version_conflict') viewPlan(); }
  }));
  const allCases = [...all, ...r.days.flatMap((d) => d.items.filter((x) => x.type === 'case'))];
  $$('[data-pws]').forEach((b) => (b.onclick = async () => {
    const i = allCases.find((x) => x.id === b.dataset.pws); const sel = $('#pw-' + CSS.escape(i.id)); const rs = $('#pwr-' + CSS.escape(i.id));
    const note = (rs.value || '').trim();
    if (note.length < 3) { toast(t('pws_need_reason'), true); rs.focus(); return; }
    if (!sel.value) return;
    b.disabled = true;
    try {
      const x = await api('POST', `/api/cases/${i.id}/commands`, { action: 'reassign_workshop', command_id: uid(), expected_version: i.version, note, payload: { workshop_site: sel.value } });
      toast(x && x.no_workshop_user ? t('no_ws_user_warn') : x && x.external_workshop ? t('ext_ws_hint') : '✓', !!(x && x.no_workshop_user)); viewPlan();
    } catch (err) { b.disabled = false; toast(err.message, true); if (err.code === 'version_conflict') viewPlan(); }
  }));
  const ps = $('#psite'); if (ps) ps.onchange = () => { S.planSite = ps.value; viewPlan(); };
  const pvs = $('#pvsite'); if (pvs) pvs.onchange = () => { S.planVsite = pvs.value; viewPlan(); };
  $('#pdays').onchange = () => { S.planDays = Number($('#pdays').value); viewPlan(); };
  $('#plprt').onclick = () => window.print();
  $('#pics').onclick = async () => { try { download(await api('GET', `/api/workshop/plan?days=${days}&format=ics${pq}`), `werkstattplan_${envFn()}_${bDate()}${site ? '_' + fnPart(site) : ''}${r.vehicle_site ? '_' + fnPart(r.vehicle_site) : ''}.ics`); } catch (err) { toast(err.message, true); } };
}
async function viewWsLoad() {
  const weeks = S.wlWeeks || 8;
  const r = await api('GET', `/api/reports/workshop-load?weeks=${weeks}`);
  const n = (x) => fmtNum(x);
  render(`<h1>${esc(t('ws_load'))}</h1>${printHead([`${tn('weeks_n', weeks)}`])}<p class="small muted">${esc(t('ws_load_hint'))}</p>
    <div class="actions" style="flex-wrap:wrap">${[4, 8, 13, 26].map((w) => `<button type="button" class="btn ${w === weeks ? '' : 'secondary'}" data-wl="${w}">${esc(tn('weeks_n', w))}</button>`).join('')}<button type="button" class="btn secondary" id="wlcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="wlprt">${esc(t('print'))}</button></div>
    ${r.sites.map((s) => { const max = Math.max(1, ...s.weeks.map((w) => w.hours)); return `<section class="panel"><h2 style="margin-top:0">${esc(s.name === 'ohne' ? t('no_workshop') : s.site === 'EXTERN' ? t('ws_extern') : s.name)}</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${r.open_statuses.map((st) => `<span class="chip ${s.open[st] ? 'mittel' : ''}">${esc(t('st_' + st))}: ${s.open[st] || 0}</span>`).join('')}</div>
      <div class="scroll"><table style="font-size:.85rem"><thead><tr><th>${esc(t('week'))}</th><th>${esc(t('hours'))}</th><th>${esc(t('ws_acknowledged'))}</th><th>${esc(t('ws_released'))}</th></tr></thead><tbody>
      ${s.weeks.slice().reverse().map((w) => `<tr><td style="white-space:nowrap" title="${esc(w.week)}">${esc(t('cw'))} ${esc(w.week.slice(6))}</td><td><div style="display:flex;align-items:center;gap:6px"><span aria-hidden="true" style="display:inline-block;height:10px;width:${Math.round((w.hours / max) * 40)}px;background:var(--steel);border-radius:2px"></span>${n(w.hours)}</div></td><td>${w.acknowledged}</td><td>${w.released}</td></tr>`).join('')}</tbody></table></div></section>`; }).join('') || noneP()}`, 'more');
  $$('[data-wl]').forEach((b) => (b.onclick = () => { S.wlWeeks = Number(b.dataset.wl); viewWsLoad(); }));
  $('#wlprt').onclick = () => window.print();
  $('#wlcsv').onclick = async () => { try { download(await api('GET', `/api/reports/workshop-load?weeks=${weeks}&format=csv`), `werkstatt-auslastung_${envFn()}_${r.from}_${weeks}kw.csv`); } catch (err) { toast(err.message, true); } };
}
function tmPositions(list, r) {
  const none = list.filter((x) => !x.gps_time).length;
  const kmr = list.filter((x) => (x.km_rejected || []).length).length;
  return `<details class="panel" id="tmpos"${r.site || S.tmSite !== undefined ? ' open' : ''}><summary><b>${esc(t('tm_positions'))}</b> <span class="chip">${list.length}</span>${none ? ` <span class="chip mittel">${esc(t('tm_no_data'))}: ${none}</span>` : ''}${kmr ? ` <span class="chip mittel" data-tmkmsum>⚠ km: ${kmr}</span>` : ''}</summary>
    <p class="small muted">${esc(t('tm_positions_hint'))}</p><div class="actions noprint" style="margin-top:0;flex-wrap:wrap;align-items:end">${(r.site_options || []).length > 1 || r.site ? `<div>${siteSelect('tmsite', '', r.site_options, r.site, t('site'), t('filter_all'))}</div>` : ''}<button type="button" class="btn secondary" id="tmcsv">${esc(t('export_csv'))}</button></div><div class="list">${list.map((x) => `<a class="row${x.gps_time ? '' : ' p-mittel'}" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}"${x.kind === 'anhaenger' ? ' data-tmtrailer' : ''}>${plate(x.plate)}<span class="title" style="white-space:normal">${x.gps_time ? `${fmtDT(x.gps_time)} <span class="chip">${esc(tmAge(x.gps_time))}</span>` : esc(t('tm_no_data'))}</span><span class="sub">${x.kind === 'anhaenger' ? esc(t('trailer')) + (x.site ? ' · ' : '') : ''}${esc(x.site || '')}${x.providers.length ? ' · ' + esc(x.providers.map(provL).join(', ')) : ''}</span>${(x.km_rejected || []).map((k) => `<span class="sub" style="color:var(--mid);white-space:normal" data-tmkm${k.direction === 'above' ? '="above"' : ''}>⚠ ${esc(provL(k.provider))} ${esc(k.external_id || '')}: ${fmtKm(k.km)} ${esc(tmKmRej(k.direction, k.recorded_km, k.recorded_at))}</span>`).join('')}</a>`).join('') || noneP()}</div>${kmr ? `<p class="small noprint" style="margin:10px 0 0"><a href="#/quality?f=telematics_km_rejected">${esc(t('dq_telematics_km_rejected'))} – ${esc(t('show_in_dq'))} ›</a></p>` : ''}</details>`;
}
async function viewTelematics() {
  const tsq = S.tmSite ? '?site=' + encodeURIComponent(S.tmSite) : '';
  const r = await api('GET', '/api/telematics' + tsq);
  const vs = await vehiclesCached();
  const opts = (sel) => vs.map((v) => `<option value="${esc(v.id)}"${v.id === sel ? ' selected' : ''}>${esc(v.plate)}${v.kind === 'anhaenger' ? ' (' + esc(t('vk_anhaenger')) + ')' : ''}</option>`).join('');
  render(`<h1>${esc(t('telematics'))}</h1><p class="small muted">${esc(t('telematics_hint'))}</p>
    <div class="stats"><div><b>${r.latest.vehicles}</b>${esc(t('tm_with_data'))}</div><div><b style="${r.unmatched_total ? 'color:var(--mid)' : ''}">${r.unmatched_total ?? r.unmatched.length}</b>${esc(t('tm_unmatched'))}</div><div><b>${r.mappings.length}</b>${esc(t('tm_mappings'))}</div></div>
    ${r.latest.last_received ? `<p class="small muted">${esc(t('tm_last'))}: ${fmtDT(r.latest.last_received)}</p>${(r.by_provider || []).length ? `<p class="small muted" id="tmprov">${r.by_provider.map((x) => `<b>${esc(TM_PROV[x.provider] || x.provider)}</b>: ${x.last_received ? `${fmtDT(x.last_received)} · ${esc(t('tm_devices').replace('{n}', x.devices))}${x.inactive_vehicle_reports ? ` · <a href="#/quality?f=telematics_vehicle_inactive" class="tm-inact">⚠ ${esc(t('tm_inact_reports').replace('{n}', x.inactive_vehicle_reports))}</a>` : ''}` : '–'}`).join(' · ')}</p>` : ''}` : r.unmatched.length ? '' : `<div class="panel">${esc(t('tm_none'))}</div>`}
    <div class="actions noprint" style="margin-top:0"><button type="button" class="btn secondary" id="tmprt">${esc(t('print'))}</button></div>
    ${printHead([r.site ? `${t('site')}: ${r.site === 'ohne' ? t('cs_nosite') : r.site}` : '', r.latest.vehicles ? t('print_count').replace('{n}', (r.positions || []).length) : ''])}
    ${(r.plate_mismatches || []).length ? `<section class="panel" id="tmmism"><h2 style="margin-top:0">${esc(t('dq_telematics_plate_mismatch'))} <span class="chip kritisch">${r.plate_mismatches.length}</span></h2><p class="small muted">${esc(t('tm_mismatch_hint'))}</p><div class="list">${r.plate_mismatches.map((x) => `<a class="row p-kritisch" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(provL(x.provider))} · ${esc(x.external_id || '')} → ${esc(t('tm_reports'))} <b>${esc(x.source_plate)}</b></span><span class="sub">${fmtDT(x.received_at)}</span></a>`).join('')}</div><p class="small"><a href="#/quality?f=telematics_plate_mismatch">${esc(t('show_in_dq'))} ›</a></p></section>` : ''}
    ${r.latest.vehicles ? tmPositions(r.positions || [], r) : ''}
    <h2>${esc(t('tm_unmatched'))}</h2>${r.unmatched_truncated ? `<p class="panel warn small" id="tmtrunc">${esc(t('tm_unmatched_truncated').replace('{n}', r.unmatched.length).replace('{m}', r.unmatched_total))}</p>` : ''}<div class="list">${r.unmatched.map((u, i) => `<div class="row p-mittel"><span class="chip">${esc(provL(u.provider))}</span><span class="title" style="white-space:normal">${esc(u.external_id)}${u.source_plate ? ' · ' + esc(u.source_plate) : ''}${u.source_vin ? ' · ' + esc(t('vin')) + ' ' + esc(u.source_vin) : ''}</span><span></span>
      <form class="sub" data-map="${i}" style="white-space:normal;display:grid;gap:6px;margin-top:6px"><label>${esc(t('vehicle'))}</label><select name="vehicle_id" required><option value="">–</option>${opts(null)}</select>${u.candidate_plate ? `<span class="small muted">${esc(t('tm_candidate'))}: ${esc(u.candidate_plate)}</span>` : ''}<label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" placeholder="${esc(t('tm_evidence_ph'))}"><button class="btn secondary">${esc(t('tm_confirm'))}</button></form></div>`).join('') || noneP()}</div>
    <h2>${esc(t('tm_mappings'))}</h2><div class="list">${r.mappings.map((m) => `<div class="row">${plate(m.plate)}<span class="title" style="white-space:normal">${esc(provL(m.provider))} · ${esc(m.external_id)}</span><button type="button" class="btn secondary" data-unmap="${esc(provL(m.provider))}|${esc(m.external_id)}">${esc(t('tm_remove'))}</button><span class="sub" style="white-space:normal">${esc(m.evidence)} · ${esc(m.confirmed_by_name || '')} · ${fmtDT(m.confirmed_at)}</span></div>`).join('') || noneP()}</div>`, 'more');
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
    const u = b.dataset.unmap; const cut = u.indexOf('|'); const provider = u.slice(0, cut), ext = u.slice(cut + 1); // Geräte-ID darf „|“ enthalten (18.10.2026)
    try { await api('DELETE', `/api/telematics/mappings?provider=${encodeURIComponent(provider)}&external_id=${encodeURIComponent(ext)}`); viewTelematics(); } catch (err) { toast(err.message, true); }
  }));
}
async function viewQuality(pre) {
  // Direktsprung mit Prüffilter (#/quality?f=<Prüfung>, z. B. aus „Heute zu tun“): Schweregrad-Filter zurücksetzen
  const jump = !!pre && pre !== S.dqPre;
  if (jump) { S.dqFilter = pre; S.dqSev = ''; }
  S.dqPre = pre || '';
  const dqUrl = () => '/api/admin/data-quality' + (vsDef('dqSite') ? '?site=' + encodeURIComponent(vsDef('dqSite')) : '');
  let r = await api('GET', dqUrl());
  // Direktsprung, aber der Befund liegt außerhalb des gewählten (bzw. Heimat-)Standorts → Standort „Alle“ statt still eine fremde Liste (20.10.2026)
  if (jump && vsDef('dqSite') && !r.counts[pre]) { S.dqSite = ''; r = await api('GET', dqUrl()); }
  const sevCls = { fehler: 'kritisch', luecke: 'mittel', hinweis: '' };
  // Filter nach Schweregrad (fehler/luecke/hinweis) und darin nach Prüfung; ein Prüffilter außerhalb des Schweregrads wird verworfen
  const sevOf = Object.fromEntries(r.items.map((i) => [i.check, i.severity]));
  let sev = ['fehler', 'luecke', 'hinweis'].includes(S.dqSev) ? S.dqSev : '';
  // Schweregrad ohne Treffer in der neuen Auswahl (z. B. nach Standortwechsel) verwerfen – sonst leere Liste ohne gedrückten Knopf und leere CSV (20.10.2026)
  if (sev && !r.items.some((i) => i.severity === sev)) { S.dqSev = ''; sev = ''; }
  const sevCount = (s) => r.items.filter((i) => i.severity === s).length;
  if (S.dqFilter && (!r.counts[S.dqFilter] || (sev && sevOf[S.dqFilter] !== sev))) S.dqFilter = '';
  const f = S.dqFilter || '';
  const items = r.items.filter((i) => (!sev || i.severity === sev) && (!f || i.check === f));
  const checks = Object.keys(r.counts).filter((c) => !sev || sevOf[c] === sev);
  // Ausdruck (Arbeitsliste zum Abarbeiten): Schweregrad, Prüfung, Standort und Anzahl im Vermerk
  render(`<h1>${esc(t('dq'))}</h1>${printHead([sev ? `${t('dq_col_severity')}: ${t('dq_sev_' + sev)}` : '', f ? `${t('dq_col_check')}: ${t('dq_' + f)}` : '', r.site ? `${t('kpi_vsite')}: ${r.site === 'ohne' ? t('cs_nosite') : r.site}` : '', t('print_count').replace('{n}', items.length)])}${helpLink('dates')}<p class="small muted">${esc(t('dq_hint'))}</p>
    ${(r.site_options || []).length > 1 || r.site ? `<div class="panel noprint">${siteSelect('dqsite', '', r.site_options, r.site, t('kpi_vsite'), t('filter_all'))}${r.other_hidden ? `<p class="small muted" style="margin-bottom:0">${esc(tn('dq_other_hidden', r.other_hidden))}</p>` : ''}</div>` : ''}
    ${(r.truncated_checks || []).length ? `<p class="panel warn small" id="dqtrunc">${esc(t('dq_truncated').replaceAll('{n}', r.check_max))} ${r.truncated_checks.map((c) => esc(t('dq_' + c))).join(' · ')}</p>` : ''}
    <div class="stats"><div><b>${r.vehicles_checked}</b>${esc(t('vehicles'))}</div><div><b style="${r.items.some((i) => i.severity === 'fehler') ? 'color:var(--stop)' : ''}">${r.items.filter((i) => i.severity === 'fehler').length}</b>${esc(t('dq_sev_fehler'))}</div><div><b>${r.items.filter((i) => i.severity !== 'fehler').length}</b>${esc(t('dq_sev_luecke'))} / ${esc(t('dq_sev_hinweis'))}</div></div>
    ${r.items.length ? `<div class="actions noprint"><button type="button" class="btn secondary" id="dqcsv">${esc(t('export_csv'))}${f ? ' (' + esc(t('dq_' + f)) + ')' : sev ? ' (' + esc(t('dq_sev_' + sev)) + ')' : ''}</button><button type="button" class="btn secondary" id="dqprt">${esc(t('print'))}</button></div>` : ''}
    ${r.items.length ? `<div class="actions" style="flex-wrap:wrap" role="group" aria-label="${esc(t('dq_col_severity'))}"><span class="small muted" style="align-self:center">${esc(t('dq_col_severity'))}:</span><button type="button" class="btn ${sev ? 'secondary' : ''}" data-dqsev="" aria-pressed="${!sev}">${esc(t('filter_all'))} (${r.items.length})</button>${['fehler', 'luecke', 'hinweis'].filter((x) => sevCount(x)).map((x) => `<button type="button" class="btn ${sev === x ? '' : 'secondary'}" data-dqsev="${x}" aria-pressed="${sev === x}">${esc(t('dq_sev_' + x))} (${sevCount(x)})</button>`).join('')}</div>` : ''}
    ${r.items.length ? `<div class="actions" style="flex-wrap:wrap" role="group" aria-label="${esc(t('dq_col_check'))}"><span class="small muted" style="align-self:center">${esc(t('dq_col_check'))}:</span><button type="button" class="btn ${f ? 'secondary' : ''}" data-dq="">${esc(t('filter_all'))} (${sev ? sevCount(sev) : r.items.length})</button>${checks.map((c) => `<button type="button" class="btn ${f === c ? '' : 'secondary'}" data-dq="${esc(c)}">${esc(t('dq_' + c))} (${r.counts[c]}${(r.truncated_checks || []).includes(c) ? '+' : ''})</button>`).join('')}</div>` : `<div class="panel good"><b>${esc(t('dq_ok'))}</b></div>`}
    <div class="list">${items.map((i) => { const href = i.case_id ? `#/cases/${esc(i.case_id)}` : i.vehicle_id && i.check === 'inspection_no_result' && i.event_id ? `#/vehicles/${esc(i.vehicle_id)}?ev=${esc(i.event_id)}` : i.vehicle_id && i.check === 'km_drop_unexplained' ? tlHash(esc(i.vehicle_id), 'maintenance') : i.vehicle_id ? `#/vehicles/${esc(i.vehicle_id)}` : i.driver_id ? `#/drivers/${esc(i.driver_id)}` : i.check === 'invite_pending' || i.check === 'driver_account_file_inactive' ? '#/users' : i.check === 'driver_account_no_file' ? '#/drivers' : null; return `${href ? `<a class="row ${i.severity === 'fehler' ? 'p-kritisch' : i.severity === 'luecke' ? 'p-mittel' : ''}" href="${href}">` : `<div class="row">`}${i.plate ? plate(i.plate) : i.driver_id ? `<span class="chip lead">${esc(i.driver_name)}</span>` : `<span class="chip lead">${esc(t('users'))}</span>`}<span class="title" style="white-space:normal">${esc(t('dq_' + i.check))}</span><span class="chip ${sevCls[i.severity]}">${esc(t('dq_sev_' + i.severity))}</span>${i.detail ? `<span class="sub" style="white-space:normal">${esc(dqDetail(i))}</span>` : ''}${href ? '</a>' : '</div>'}`; }).join('')}</div>`, 'more');
  $$('[data-dq]').forEach((b) => (b.onclick = () => { S.dqFilter = b.dataset.dq; viewQuality(); }));
  $$('[data-dqsev]').forEach((b) => (b.onclick = () => { S.dqSev = b.dataset.dqsev; viewQuality(); }));
  const dqs = $('#dqsite'); if (dqs) dqs.onchange = () => { S.dqSite = dqs.value; viewQuality(); };
  const dp = $('#dqprt'); if (dp) dp.onclick = () => window.print();
  const dc = $('#dqcsv'); if (dc) dc.onclick = () => download(new Blob([dataQualityCsv(items, t, fmtD, mk, { km: (n) => fmtKm(n), src: (v) => odoSrc(v) })], { type: 'text/csv;charset=utf-8' }), `fuhrpark-datenqualitaet_${r.environment}_${bDate()}.csv`);
}
// Einrichtungsstand (nur Inhaber, nur lesend, 22.10.2026): was vor bzw. im Betrieb noch offen ist – Werte nur aus Daten/Einstellungen
const RD_ORDER = ['agent', 'vehicles', 'emergency', 'two_factor', 'own_push', 'idle_workshop', 'test_readonly', 'hourly_rate', 'license_interval', 'cost_limit', 'backup', 'owner_backup', 'prod_accounts', 'integration'];
async function viewReadiness() {
  if (!S.me || S.me.role !== 'owner') { location.hash = '#/'; return; }
  const r = await api('GET', '/api/admin/readiness');
  const by = new Map(r.items.map((x) => [x.key, x]));
  const CLS = { ok: 'ok', open: 'mittel', info: '' };
  const detail = (x) => {
    if (x.key === 'two_factor' && x.names && x.names.length) return x.names.map((n) => `${n.name} (${t('role_' + n.role)})`).join(', ');
    if (x.key === 'agent' && x.last) return `${t('rd_last_run')}: ${fmtDT(x.last)}`;
    if (x.key === 'backup' && x.last) return `${t('rd_last_backup')}: ${fmtD(x.last)}`;
    if (x.key === 'vehicles' || x.key === 'emergency' || x.key === 'own_push' || x.key === 'owner_backup') return `${t('rd_count')}: ${x.n || 0}`;
    if (x.key === 'idle_workshop' && x.value) return `${x.value} min`;
    if (x.key === 'prod_accounts') return [...['owner', 'fleet', 'workshop', 'dispatch', 'driver', 'viewer'].filter((k) => x.roles && x.roles[k]).map((k) => `${t('role_' + k)}: ${x.roles[k]}`), `${t('rd_open_invites')}: ${x.open_invites || 0}`, `${t('rd_test_accounts')}: ${x.test_accounts || 0}`].join(' · ');
    return '';
  };
  const rows = RD_ORDER.map((k) => by.get(k)).filter(Boolean).map((x) => `<a class="row" href="${esc(x.link)}" data-rd="${esc(x.key)}" style="display:block"><span class="title" style="white-space:normal">${esc(t('rd_' + x.key + '_t'))}</span> <span class="chip ${CLS[x.state]}">${esc(t('rd_state_' + x.state))}</span>
    ${detail(x) ? `<div class="small muted" style="overflow-wrap:anywhere">${esc(detail(x))}</div>` : ''}${x.state !== 'ok' ? `<div class="small">${esc(t('rd_' + x.key + '_todo'))}</div>` : ''}</a>`).join('');
  render(`<h1>${esc(t('rd_title'))}</h1><p class="small muted">${esc(t('rd_hint'))}</p>
    <div class="stats"><div><b${r.open ? ' style="color:var(--stop)"' : ''}>${r.open}</b>${esc(t('rd_open_n'))}</div><div><b>${r.items.filter((x) => x.state === 'ok').length}</b>${esc(t('rd_ok_n'))}</div></div>
    <div class="list">${rows}</div>`, 'more');
}
async function viewUsage() {
  const days = S.usageDays || 30;
  const r = await api('GET', `/api/admin/usage?days=${days}`);
  const AREA = { cases: 'nav_cases', vehicles: 'vehicles', tires: 'fleet_tires', stock: 'stock', fines: 'fines', maintenance: 'inspections_due', reports: 'area_reports',
    master: 'nav_master', notifications: 'notifications', admin: 'area_admin', account: 'nav_profile', dashboard: 'nav_home', checks: 'departure_check', drivers: 'area_drivers', claims: 'area_claims', telematics: 'area_telematics', workshop: 'area_workshop', emergency: 'area_emergency', tacho: 'area_tacho', other: 'area_other' };
  const max = Math.max(1, ...r.daily.map((d) => d.calls));
  render(`<h1>${esc(t('usage'))}</h1><p class="small muted">${esc(t('usage_hint'))}</p>
    <div class="actions" style="flex-wrap:wrap">${[7, 30, 90, 365].map((d) => `<button type="button" class="btn ${d === days ? '' : 'secondary'}" data-ud="${d}">${esc(nDays(d))}</button>`).join('')}</div>
    <div class="stats"><div><b>${r.total_calls}</b>${esc(t('calls'))}</div><div><b>${r.daily.length}</b>${esc(t('days_used'))}</div><div><b${r.areas.some((a) => a.errors) ? ' style="color:var(--stop)"' : ''}>${r.areas.reduce((s, a) => s + a.errors, 0)}</b>${esc(t('errors_count'))}</div></div>
    ${r.daily.length ? `<div class="panel" aria-hidden="true" style="display:flex;align-items:flex-end;gap:2px;height:70px;padding:8px">${r.daily.map((d) => `<span title="${esc(fmtD(d.day))}: ${d.calls}" style="flex:1;min-width:2px;max-width:28px;background:var(--steel);height:${Math.max(4, Math.round((d.calls / max) * 100))}%"></span>`).join('')}</div>` : ''}
    <div class="scroll"><table><thead><tr><th>${esc(t('area_col'))}</th><th>${esc(t('calls'))}</th><th>${esc(t('errors_count'))}</th></tr></thead><tbody>
    ${r.areas.map((a) => `<tr><td><b>${esc(t(AREA[a.area] || 'area_other'))}</b></td><td>${a.calls}</td><td>${a.errors ? `<span class="chip kritisch">${a.errors}</span>` : '0'}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">–</td></tr>`}</tbody></table></div>
    <details><summary>${esc(t('functions_detail'))} (${r.features.length})</summary><div class="scroll"><table class="stack"><thead><tr><th>${esc(t('function_col'))}</th><th>${esc(t('calls'))}</th><th>${esc(t('errors_count'))}</th><th>${esc(t('last_used'))}</th></tr></thead><tbody>
    ${r.features.map((f) => `<tr><td><code>${esc(f.feature)}</code></td><td>${f.calls}</td><td>${f.errors}</td><td>${fmtD(f.last_day)}</td></tr>`).join('')}</tbody></table></div></details>`, 'more');
  $$('[data-ud]').forEach((b) => (b.onclick = () => { S.usageDays = Number(b.dataset.ud); viewUsage(); }));
}
async function viewDefects() {
  const days = S.defDays || 90; const kind = S.defKind || '';
  const r = await api('GET', `/api/reports/defects?days=${days}${kind ? '&kind=' + kind : ''}${vsDef('defSite') ? '&site=' + encodeURIComponent(vsDef('defSite')) : ''}`);
  const veh = (id, p) => `<a href="#/vehicles/${encodeURIComponent(id)}">${esc(p)}</a>`;
  const vlist = r.vehicles.filter((v) => v.defect_items > 0);
  render(`<h1>${esc(t('defect_stats'))}</h1>${helpLink('defects')}<p class="small muted">${esc(t('defect_stats_hint'))}</p>
    <p class="print-only small">${printStamp()} · ${esc(nDays(days))}${kind ? ' · ' + esc(kind === 'abfahrt' ? t('nav_check') : t('inspection')) : ''}${r.site ? ' · ' + esc(r.site === 'ohne' ? t('cs_nosite') : r.site) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <div class="panel noprint" style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">
      <div><label for="dd">${esc(t('period'))}</label><select id="dd">${[30, 90, 180, 365].map((d) => `<option value="${d}"${d === days ? ' selected' : ''}>${esc(nDays(d))}</option>`).join('')}</select></div>
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
// Backlog 407 (Blickwinkel „Winterreifen bestellen“, Fortsetzung von 406): Winterreifen-Aufträge für mehrere Lkw in einem Schritt –
// nur Inhaber/Fuhrparkleitung, nur in den Winter-Reitern, Lkw mit offenem Auftrag nicht wählbar. Die App ruft je Lkw den bestehenden
// Einzelauftrag (`POST /api/vehicles/:id/tires/winter-order`) nacheinander auf – gleiche Prüfungen, gleiches Abfragebudget je Aufruf;
// `request_key` je Lkw aus einem Schlüssel je Absenden (erneutes Senden nach Netzabbruch legt nichts doppelt an). Fehler je Lkw werden
// gesammelt, die übrigen laufen weiter.
const woBatchHtml = (f, rows) => {
  if (!isMgr() || !['winter_bad', 'winter_unknown'].includes(f)) return '';
  const cand = rows.filter((x) => x.kind !== 'anhaenger');
  if (!cand.filter((x) => !x.winter_order).length) return '';
  return `<details class="panel noprint" id="wobatch"><summary>${esc(t('wob_title'))}</summary><p class="small muted">${esc(t('wob_hint'))}</p><form id="wobf" novalidate>
    <div class="actions" style="margin:8px 0"><button type="button" class="btn secondary" data-wob="1">${esc(t('mb_all'))}</button><button type="button" class="btn secondary" data-wob="0">${esc(t('mb_none'))}</button> <span class="small muted" id="wobcount" aria-live="polite"></span></div>
    <div class="list" style="max-height:340px;overflow:auto">${cand.map((x) => `<label class="row" style="display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;padding:8px 10px;margin:0"><input type="checkbox" name="wobid" value="${esc(x.vehicle_id)}" data-plate="${esc(x.plate)}"${x.winter_order ? ' disabled' : ''}> ${plate(x.plate)}<span class="title" style="white-space:normal;flex:1 1 150px">${x.winter_order ? `<span class="small muted">🔧 ${esc(t('mo_open'))} ${esc(x.winter_order.case_no)}</span>` : esc(x.site || '')}</span></label>`).join('')}</div>
    <label for="wobws">${esc(t('workshop'))}</label><select id="wobws" name="workshop_site">${wsOptions(null)}</select>
    <label for="wobd">${esc(t('wo_date'))}</label><input type="date" id="wobd" name="planned_date" min="${bDate()}">
    <label for="wobp">${esc(t('urgency'))}</label><select id="wobp" name="priority"><option value="niedrig">${esc(t('prio_niedrig'))}</option><option value="mittel">${esc(t('prio_mittel'))}</option></select>
    <label for="wobn">${esc(t('note'))}</label><input id="wobn" name="note" maxlength="300">
    <div class="actions"><button class="btn" id="wobgo">${esc(t('wob_send'))}</button></div></form></details>`;
};
function wireWoBatch() {
  const fm = $('#wobf'); if (!fm) return;
  const boxes = () => $$('#wobf input[name=wobid]:not(:disabled)');
  const cnt = () => { $('#wobcount').textContent = tn('mb_selected', boxes().filter((x) => x.checked).length); };
  boxes().forEach((x) => (x.onchange = cnt)); cnt();
  $$('[data-wob]', fm).forEach((b) => (b.onclick = () => { boxes().forEach((x) => (x.checked = b.dataset.wob === '1')); cnt(); }));
  fm.onsubmit = async (e) => {
    e.preventDefault();
    const sel = boxes().filter((x) => x.checked);
    if (!sel.length) { toast(t('wob_pick'), true); return; }
    if (!fm.workshop_site.value) { toast(t('wob_ws'), true); markInvalid(fm.workshop_site, t('wob_ws')); fm.workshop_site.focus(); return; }
    const body = { workshop_site: fm.workshop_site.value, priority: fm.priority.value, ...(fm.planned_date.value ? { planned_date: fm.planned_date.value } : {}), ...(fm.note.value.trim() ? { note: fm.note.value.trim() } : {}) };
    // Schlüssel je Inhalt (wie „Reifen erfassen“): gleiche Eingaben erneut → dieselben Aufträge; geänderte Eingaben → neue Kennung
    const ck = JSON.stringify([body, sel.map((x) => x.value)]); if (fm.dataset.ck !== ck) { fm.dataset.ck = ck; fm.dataset.key = uid(); }
    const go = $('#wobgo'); go.disabled = true;
    const ok = []; const bad = [];
    for (const [i, x] of sel.entries()) {
      go.textContent = t('wob_progress').replace('{i}', i + 1).replace('{m}', sel.length);
      try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(x.value)}/tires/winter-order`, { ...body, request_key: `${fm.dataset.key.slice(0, 24)}-${x.value.slice(-20)}` }); ok.push({ plate: x.dataset.plate, id: r.id, case_no: r.case_no }); }
      catch (err) { bad.push({ plate: x.dataset.plate, msg: err.offline ? t('wob_offline') : err.message }); if (err.offline) { for (const y of sel.slice(i + 1)) bad.push({ plate: y.dataset.plate, msg: t('wob_offline') }); break; } }
    }
    if (!go.isConnected) return;
    if (!bad.length) document.querySelectorAll('.toast.err').forEach((x) => x.remove()); // Hinweis eines früheren Versuchs (z. B. „Werkstatt wählen“) ist erledigt
    S.woRes = `<p class="panel ${bad.length ? 'warn' : 'ok'}" style="margin-top:8px" data-wobdone><b>${esc(tn('wob_done', ok.length))}</b>${ok.length ? `<br><span class="small">${ok.map((o) => `${esc(o.plate)} · <a href="#/cases/${esc(o.id)}">${esc(o.case_no)}</a>`).join('; ')}</span>` : ''}</p>${bad.length ? `<p class="small"><b>${esc(t('wob_failed'))}</b></p><ul class="small" data-wobfail>${bad.map((b) => `<li>${esc(b.plate)}: ${esc(b.msg)}</li>`).join('')}</ul>` : ''}`;
    await viewFleetTires();
    const res = $('#wobres'); if (res) res.scrollIntoView({ block: 'nearest' });
  };
}
// Backlog 406: Winterreifen-Bedarf je Achse und Reifengröße (Server `winter_need`), auch im Druck – Grundlage für die Anfrage beim Reifendienst
const winterNeedHtml = (n) => `<section class="panel" id="twneed"><h2 style="margin-top:0">${esc(t('twn_title'))}</h2><p class="small muted">${esc(t('twn_hint'))}</p>
  ${n.groups.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('twn_axle'))}</th><th>${esc(t('twn_size'))}</th><th>${esc(t('twn_positions'))}</th><th>${esc(t('twn_vehicles'))}</th></tr></thead><tbody>${n.groups.map((g) => `<tr data-twn="${esc(g.axle)}"><td>${esc(t('axle_' + g.axle))}</td><td>${g.size ? `<b>${esc(g.size)}</b>` : `<span class="muted">${esc(t('twn_nosize'))}</span>`}${g.unverified ? `<br><span class="small muted">${esc(t('twn_unverified').replace('{n}', fmtNum(g.unverified)))}</span>` : ''}</td><td><b>${fmtNum(g.positions)}</b></td><td>${fmtNum(g.vehicles)}<br><span class="small" style="white-space:normal">${g.plates.map((pl, i) => g.vehicle_ids && g.vehicle_ids[i] ? `<a href="#/vehicles/${encodeURIComponent(g.vehicle_ids[i])}?sec=tires">${esc(pl)}</a>` : esc(pl)).join(', ')}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
  ${n.missing_positions ? `<p class="small">${esc(tn('twn_missing', n.missing_positions))} · ${esc(t('twn_vehicles'))}: ${fmtNum(n.missing_vehicles)}</p>` : ''}</section>`;
async function viewFleetTires() {
  const r = await api('GET', '/api/tires/fleet' + (vsDef('tireSite') ? '?site=' + encodeURIComponent(vsDef('tireSite')) : ''));
  // Direktsprung von der Werkstatt-Startseite (#/tires?f=winter_bad|winter_unknown): Reiter übernehmen, danach normale Bedienung
  const hf = new URLSearchParams(location.hash.split('?')[1] || '').get('f');
  if (hf && ['attention', 'stale', 'never', 'winter_bad', 'winter_unknown', 'winter_closed', 'age', 'all'].includes(hf)) S.tireFilter = hf;
  if (hf) try { history.replaceState(history.state, '', '#/tires'); } catch {} // Reiterwechsel danach nicht vom Link überschrieben
  const f = S.tireFilter || 'attention';
  const sel = { attention: (x) => x.status === 'unter_minimum' || x.status === 'warnung', never: (x) => x.measured_positions === 0, stale: (x) => x.stale && x.measured_positions > 0, winter_bad: (x) => x.winter === 'nicht_erfuellt', winter_unknown: (x) => x.winter === 'unbekannt', winter_closed: (x) => !!x.winter_closed_order, age: (x) => x.age_warn > 0, all: () => true }[f] || (() => true);
  const rows = r.rows.filter(sel);
  const wf = f === 'winter_bad' || f === 'winter_unknown' || f === 'winter_closed'; // Winter-Reiter: Positionen und Aufträge in der Zeile
  const cls = { unter_minimum: 'kritisch', warnung: 'mittel', ok: 'ok', unbekannt: '' };
  // Backlog 520: Fortschritt der Umrüstung (Server zählt `winter_ok` schon) – in Winter-Reitern und „Alle“, auch im Ausdruck
  const nTrucks = r.rows.filter((x) => x.kind !== 'anhaenger').length;
  const wProg = (wf || f === 'all') && nTrucks ? t('tires_winter_prog').replace('{ok}', fmtNum(r.totals.winter_ok || 0)).replace('{n}', fmtNum(nTrucks)) : '';
  const tabs = [['attention', `${t('ts_unter_minimum')} / ${t('ts_warnung')}`, r.totals.below_min + r.totals.warn], ['stale', t('tires_stale').replace('{d}', r.stale_days), r.totals.stale], ['never', t('tires_never'), r.totals.never_measured], ['winter_bad', t('tires_winter_bad'), r.totals.winter_noncompliant], ['winter_unknown', t('tires_winter_unknown'), r.totals.winter_unknown], ['winter_closed', t('tires_winter_closed'), r.rows.filter((x) => x.winter_closed_order).length], ...(r.warn_age_years !== null ? [['age', tn('tires_age_tab', r.warn_age_years), r.totals.age_warn]] : []), ['all', t('filter_all'), r.totals.vehicles]].filter(([k, , n]) => n || k === f || !(k.startsWith('winter') || k === 'age'));
  render(`<h1>${esc(t('fleet_tires'))}</h1>${helpLink('tires')}<p class="small muted">${esc(t(r.warn_tread_mm === null || r.warn_tread_mm === undefined ? (S.me.role === 'owner' ? 'tires_rule_nowarn' : 'tires_rule_nowarn_mgr') : 'tires_rule').replace('{min}', fmtNum(r.legal_min_tread_mm)).replace('{warn}', r.warn_tread_mm == null ? '' : fmtNum(r.warn_tread_mm)))}</p>
    ${(r.site_options || []).length > 1 || r.site ? `<div class="panel noprint">${siteSelect('tsite', '', r.site_options, r.site)}</div>` : ''}
    <div class="actions noprint" style="flex-wrap:wrap">${tabs.map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-tf="${k}" aria-pressed="${f === k}">${esc(l)} (${n})</button>`).join('')}</div>
    <div class="actions noprint"><button type="button" class="btn secondary" id="trcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="trprt">${esc(t('print'))}</button></div>
    ${printHead([`${t('print_filter')}: ${(tabs.find(([k]) => k === f) || [, t('filter_all')])[1]}`, r.site ? `${t('site')}: ${r.site === 'ohne' ? t('cs_nosite') : r.site}` : '', t('print_count').replace('{n}', rows.length), wProg])}
    ${wProg ? `<p class="small noprint" data-wprog>${esc(wProg)}</p>` : ''}
    ${(f === 'winter_bad' || f === 'winter_unknown') && r.winter_need && (r.winter_need.groups.length || r.winter_need.missing_positions) ? winterNeedHtml(r.winter_need) : ''}
    <div class="list">${rows.map((x) => `<a class="row ${x.status === 'unter_minimum' ? 'p-kritisch' : x.status === 'warnung' ? 'p-mittel' : ''}" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}?sec=tires">${plate(x.plate)}<span class="title">${x.min_tread_mm === null ? '–' : esc(fmtMm(x.min_tread_mm))}</span><span class="chip ${cls[x.status]}">${esc(t('ts_' + x.status))}</span>${x.winter === 'nicht_erfuellt' ? `<span class="chip kritisch">${esc(t('ws_nicht_erfuellt'))}</span>` : ''}<span class="sub">${[x.kind === 'anhaenger' && esc(t('vk_anhaenger')), x.site && esc(x.site), `${esc(tn('tires_measured_n', x.measured_positions))}`, x.below_min && `${x.below_min}× < ${fmtMm(r.legal_min_tread_mm)}`, x.spare_below_min && esc(t('tires_spare_below').replace('{min}', fmtNum(r.legal_min_tread_mm))), x.oldest_measure_at && `${esc(t('tires_oldest'))} ${fmtD(x.oldest_measure_at)}`, x.oldest_dot_months !== null && `${esc(t('tires_oldest_dot'))} ${esc(tireAge(x.oldest_dot_months))}${x.age_warn ? ` (${x.age_warn}× ${esc(tn('tire_age_warn', r.warn_age_years))})` : ''}`, wf && x.winter_noncompliant.length && esc(t('winter_bad').replace('{p}', x.winter_noncompliant.map(posL).join(', '))), wf && x.winter_missing.length && esc(t('winter_missing').replace('{p}', x.winter_missing.map(posL).join(', '))), wf && x.winter_order && woApptTxt(x.winter_order), wf && x.winter_closed_order && `⚠ ${esc(t('wo_closed_short').replace('{no}', x.winter_closed_order.case_no))}`].filter(Boolean).join(' · ')}</span></a>`).join('') || noneP()}</div>${woBatchHtml(f, rows)}${S.woRes ? `<div id="wobres" class="noprint" role="status">${S.woRes}</div>` : ''}${wf ? `<p class="small muted">${esc(t('winter_rule'))}</p>` : ''}`, 'more');
  S.woRes = ''; wireWoBatch();
  $$('[data-tf]').forEach((b) => (b.onclick = () => { S.tireFilter = b.dataset.tf; viewFleetTires(); }));
  // CSV: alle Fahrzeuge (gewählter Standort) mit Status und Reifengrößen je Achse – unabhängig vom Filterknopf
  $('#trcsv').onclick = async () => { try { download(await api('GET', '/api/tires/fleet?format=csv' + (r.site ? '&site=' + encodeURIComponent(r.site) : '')), `fuhrpark-reifen_${envFn()}_${bDate()}${r.site ? '_' + fnPart(r.site) : ''}.csv`); } catch (err) { toast(err.message, true); } };
  const ts = $('#tsite'); if (ts) ts.onchange = () => { S.tireSite = ts.value; viewFleetTires(); };
  $('#trprt').onclick = () => window.print();
}
const USER_SORTS = ['role', 'name', 'login_oldest'];
const USER_ROLES = ['owner', 'fleet', 'workshop', 'dispatch', 'driver', 'viewer'];
const USER_FILTERS = ['all', 'active', 'inactive', 'invite', 'locked', 'unused', ...USER_ROLES.map((r) => 'r_' + r)];
// Hinweise nach Deaktivieren/Versetzen eines Kontos (22.10.2026): Fahrerakte weiter aktiv, Werkstatt-Standort ohne Zugang mit offenen Aufträgen
function userUpdateHints(r) {
  const h = [];
  if (r && r.driver_file_active) h.push(t('ue_driver_file_active').replace('{name}', r.driver_file_active.name));
  if (r && r.ended_assignments && r.ended_assignments.length) h.push(t('ue_assign_ended').replace('{plates}', r.ended_assignments.join(', '))); // Backlog 248
  if (r && r.invites_voided) h.push(tn('ue_invites_voided', r.invites_voided)); // Backlog 193: Einladungen des deaktivierten Kontos entwertet
  if (r && r.workshop_orphaned_cases) h.push(tn('ue_ws_orphaned', r.workshop_orphaned_cases).replace('{site}', wsName(r.workshop_site)));
  // Leitungswechsel (Backlog 258d): was hängt noch an der ausscheidenden Fuhrparkleitung
  const fh = r && r.fleet_handover;
  if (fh) { if (fh.received_untriaged) h.push(t('ue_fleet_recv').replace('{n}', fh.received_untriaged)); if (fh.notes) h.push(t('ue_fleet_notes').replace('{n}', fh.notes) + ((fh.notes_plates || []).length ? ' · ' + fh.notes_plates.join(', ') : '')); if (fh.emergency) h.push(t('ue_fleet_emerg').replace('{n}', fh.emergency)); if (fh.questions_open) h.push(t('ue_fleet_questions').replace('{n}', fh.questions_open)); if (fh.followups) h.push(t('ue_fleet_followups').replace('{n}', fh.followups)); if (fh.last_fleet) h.push(t('ue_fleet_last')); }
  return h;
}
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
  const ufLabel = (k) => (k.startsWith('r_') ? t('role_' + k.slice(2)) : t('ufilter_' + k).replace('{d}', nDays(ud)));
  // Hinweise immer über alle Konten (unabhängig von der Auswahl)
  // Hinweis (nur Anzeige, keine Pflicht): aktive Verwaltungskonten im Betrieb ohne Zwei-Faktor-Anmeldung
  const no2fa = all.filter((u) => u.active && u.has_password && u.environment === 'production' && ['owner', 'fleet'].includes(u.role) && !u.has_totp);
  // Hinweis (nur Anzeige): aktive Betriebskonten ohne angemeldetes Push-Gerät – dringende Hinweise (z. B. Fahrzeugsperre) nur in der App
  const noPush = all.filter((u) => u.active && u.has_password && u.environment === 'production' && u.role !== 'viewer' && !u.push_devices);
  // Hinweis (nur Anzeige, nichts wird automatisch deaktiviert): aktive Konten ohne Anmeldung seit über ud Tagen
  const unused = ud ? all.filter((u) => isUnusedUser(u, ud)) : [];
  render(`<h1>${esc(t('users'))}</h1>${helpLink('access')}${no2fa.length ? `<div class="panel warn small" role="note">${esc(tn('tf_admin_hint', no2fa.length))} <a class="noprint" href="#/help?s=login2fa">${esc(t('help_login2fa_t'))} ›</a></div>` : ''}${noPush.length ? `<div class="panel warn small" role="note" id="nopush">${esc(tn('push_admin_hint', noPush.length))} <a class="noprint" href="#/help?s=push">${esc(t('help_push_t'))} ›</a></div>` : ''}${unused.length ? `<div class="panel warn small" role="note" id="unusedhint">${esc(tn('unused_admin_hint', unused.length).replace('{d}', nDays(ud)))}${ufi !== 'unused' ? `<div class="actions"><button type="button" class="btn secondary" id="ushowunused">${esc(t('unused_show'))}</button></div>` : ''}</div>` : ''}<div id="inv"></div>
    <details class="panel"><summary>${esc(t('new_user'))}</summary><form id="nf">
      <label>${esc(t('display_name'))}</label><input name="display_name" required><label>${esc(t('username'))}</label><input name="username" required autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="m.mustermann">
      <label>${esc(t('role'))}</label><select name="role" id="rs">${roles.map((r) => `<option value="${r}">${esc(t('role_' + r))}</option>`).join('')}</select>
      <div id="wsrow" hidden><label>${esc(t('workshop'))}</label><select name="workshop_site">${S.meta.workshops.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select></div>
      <label for="nulang">${esc(t('user_language'))}<span class="hint">${esc(t('user_language_hint'))}</span></label><select id="nulang" name="language"><option value="">${esc(t('user_language_device'))}</option><option value="de">Deutsch</option><option value="uk">Українська</option><option value="en">English</option></select>
      ${S.me.role === 'owner' ? `<label>${esc(t('environment'))}</label><select name="environment"><option value="test">${esc(t('env_testname'))}</option><option value="production">${esc(t('env_prod'))}</option></select>` : ''}
      <div class="actions"><button class="btn">${esc(t('new_user'))}</button></div></form></details>
    <div class="actions" style="flex-wrap:wrap"><select id="usort" aria-label="${esc(t('sort_by'))}" style="flex:1 1 100%;max-width:420px">${USER_SORTS.map((k) => `<option value="${k}"${uso === k ? ' selected' : ''}>${esc(t('sort_by'))}: ${esc(t('usort_' + k))}</option>`).join('')}</select><select id="ufilt" aria-label="${esc(t('ufilter'))}" style="flex:1 1 100%;max-width:420px"><optgroup label="${esc(t('status'))}">${USER_FILTERS.filter((k) => !k.startsWith('r_') && (k !== 'unused' || ud)).map((k) => `<option value="${k}"${ufi === k ? ' selected' : ''}>${esc(t('ufilter'))}: ${esc(ufLabel(k))}</option>`).join('')}</optgroup><optgroup label="${esc(t('role'))}">${USER_FILTERS.filter((k) => k.startsWith('r_') && (S.me.role === 'owner' || roles.includes(k.slice(2)) || all.some((u) => u.role === k.slice(2)))).map((k) => `<option value="${k}"${ufi === k ? ' selected' : ''}>${esc(t('ufilter'))}: ${esc(ufLabel(k))}</option>`).join('')}</optgroup></select><button type="button" class="btn secondary" id="ucsv" title="${esc(t('uc_hint'))}">${esc(t('uc_btn'))}</button><button type="button" class="btn secondary" id="uprt" title="${esc(t('uc_hint'))}">${esc(t('print'))}</button></div>
    ${ufi !== 'all' ? `<p class="small muted noprint" id="ufcount">${esc(t('ufilter_shown').replace('{n}', us.length).replace('{m}', all.length))}</p>` : ''}
    ${printHead([t('uc_print'), ufi !== 'all' ? `${t('ufilter')}: ${ufLabel(ufi)}` : '', `${t('sort_by')}: ${t('usort_' + uso)}`, t('print_count').replace('{n}', us.length)])}
    <div class="scroll"><table class="stack printsm"><thead><tr><th>${esc(t('display_name'))}</th><th>${esc(t('role'))}</th><th>${esc(t('environment'))}</th><th class="noprint"></th></tr></thead><tbody>
    ${us.map((u) => `<tr><td>${esc(u.display_name)}<div class="small muted">${esc(u.username)}${u.has_password || !u.active ? '' : ' · ' + esc(t('dq_invite_pending'))}</div>${!u.has_password && u.active ? (inviteExpired(u) ? `<span class="chip mittel" title="${esc(t('inv_expired_hint'))}">${esc(t('inv_expired'))}</span> ` : `<div class="small muted">${esc(t('inv_valid_until'))} ${fmtDT(u.invite_expires_at)}</div>`) : ''}${!u.active ? `<span class="chip">${esc(t('inactive'))}</span> ` : ''}${u.locked_until ? `<span class="chip kritisch">${esc(t('locked_until'))} ${fmtDT(u.locked_until)}</span>` : ''}${ud && isUnusedUser(u, ud) ? ` <span class="chip mittel">${esc(t('unused_chip').replace('{d}', nDays(ud)))}</span>` : ''}${u.has_totp ? ` <span class="chip ok" title="${esc(t('tf_title'))}">${esc(t('tf_chip'))}</span>` : ''}${u.sessions ? `<div class="small muted">${esc(tn('active_sessions', u.sessions))} · ${fmtDT(u.last_seen)}</div>` : ''}${u.active && u.has_password && u.role !== 'viewer' ? (u.push_devices ? `<div class="small muted">${esc(tn('push_dev_n', u.push_devices))}</div>` : ` <span class="chip mittel">${esc(t('push_dev_none'))}</span>`) : ''}${u.known_devices ? `<div class="small muted">${esc(t('kd_n').replace('{n}', u.known_devices))}</div>` : ''}${u.has_password ? `<div class="small muted">${u.last_login ? `${esc(t('last_login'))}: ${fmtDT(u.last_login)}` : esc(t('last_login_none'))}</div>` : ''}</td><td>${esc(t('role_' + u.role))}${u.workshop_site ? ' · ' + esc(wsName(u.workshop_site)) : ''}</td><td>${u.environment === 'test' ? '<span class="chip test">TEST</span>' : esc(t('env_prod'))}</td><td class="noprint">${mayEdit(u) ? `${u.locked_until ? `<button class="btn secondary" data-unlock="${esc(u.id)}">${esc(t('unlock'))}</button> ` : ''}${(u.sessions || u.push_devices) ? `<button class="btn secondary" data-revoke="${esc(u.id)}" data-name="${esc(u.display_name)}">${esc(t('revoke_sessions'))}</button> ` : ''}${u.active ? `<button class="btn secondary" data-inv="${esc(u.id)}" data-name="${esc(u.display_name)}"${u.has_password ? ' data-haspw="1"' : ''}>${esc(t('new_invite'))}</button> ` : ''}<button class="btn secondary" data-act="${esc(u.id)}" data-on="${u.active ? 0 : 1}" data-name="${esc(u.display_name)}">${esc(u.active ? t('deactivate') : t('activate'))}</button>${mayEdit(u) ? ` <button class="btn secondary" data-ue="${esc(u.id)}">${esc(t('ue_edit'))}</button>` : ''}` : ''}${S.me.role === 'owner' && u.has_totp && u.id !== S.me.id ? ` <button class="btn secondary" data-tfr="${esc(u.id)}" data-name="${esc(u.display_name)}">${esc(t('tf_reset'))}</button>` : ''}${S.me.role === 'owner' ? ` <a class="btn secondary" href="#/audit?u=${esc(u.id)}" title="${esc(t('audit_person_hint'))}">${esc(t('audit'))}</a>` : ''}${S.me.role === 'owner' ? ` <button class="btn secondary" data-dex="${esc(u.id)}" data-user="${esc(u.username)}" title="${esc(t('data_export_hint'))}">${esc(t('data_export'))}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`, 'more');
  if ($('#ushowunused')) $('#ushowunused').onclick = () => { S.userFilter = sortPref('users_filter', USER_FILTERS, 'all', 'unused'); viewUsers(); };
  $('#ufilt').onchange = () => { const v = $('#ufilt').value; S.userFilter = sortPref('users_filter', USER_FILTERS, 'all', USER_FILTERS.includes(v) ? v : 'all'); viewUsers(); };
  $('#usort').onchange = () => { const v = $('#usort').value; S.userSort = sortPref('users', USER_SORTS, 'role', USER_SORTS.includes(v) ? v : 'role'); viewUsers(); };
  $('#uprt').onclick = () => window.print();
  $('#ucsv').onclick = () => download(new Blob([usersCsv(us, t, wsName, fmtDT)], { type: 'text/csv;charset=utf-8' }), `fuhrpark-benutzer_${bDate()}.csv`);
  $$('[data-revoke]').forEach((b) => (b.onclick = async () => { if (!confirm(t('revoke_sessions_confirm').replace('{name}', b.dataset.name))) return; try { const r = await api('POST', `/api/users/${b.dataset.revoke}/revoke-sessions`); toast(t('revoked_n').replace('{n}', r.sessions).replace('{p}', r.push_devices)); viewUsers(); } catch (err) { toast(err.message, true); } }));
  $$('[data-dex]').forEach((b) => (b.onclick = async () => { if (!confirm(t('data_export_hint'))) return; try { const x = await api('GET', `/api/admin/users/${b.dataset.dex}/data-export`); dexTrunc(x); download(x instanceof Blob ? x : new Blob([JSON.stringify(x, null, 1)], { type: 'application/json' }), `datenauskunft_${b.dataset.user}_${bDate()}.json`); } catch (err) { toast(err.message, true); } }));
  $$('[data-tfr]').forEach((b) => (b.onclick = async () => { if (!confirm(t('tf_reset_confirm').replace('{name}', b.dataset.name))) return; try { await api('POST', `/api/users/${b.dataset.tfr}/totp-reset`); toast('✓'); viewUsers(); } catch (err) { toast(err.message, true); } }));
  $$('[data-unlock]').forEach((b) => (b.onclick = async () => { try { await api('POST', `/api/users/${b.dataset.unlock}/unlock`); toast('✓'); viewUsers(); } catch (err) { toast(err.message, true); } }));
  const showInvite = (token) => { const link = `${location.origin}/#/invite/${token}`; $('#inv').innerHTML = `<div class="panel good"><p>${esc(t('invite_link'))}</p><input readonly value="${esc(link)}" id="il"><div class="actions"><button class="btn" id="cp">${esc(t('copy'))}</button></div><p class="small muted">${esc(t('invite_qr_hint'))}</p><div class="qr">${(() => { try { return qrSvg(link, { label: t('invite_link') }); } catch { return ''; } })()}</div></div>`; $('#cp').onclick = async () => { try { await navigator.clipboard.writeText(link); toast(t('copied')); } catch { $('#il').select(); } }; window.scrollTo(0, 0); };
  $('#rs').onchange = () => ($('#wsrow').hidden = $('#rs').value !== 'workshop');
  $('#nf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); if (b.role !== 'workshop') delete b.workshop_site; if (!b.language) delete b.language; b.username = b.username.toLowerCase(); try { const r = await api('POST', '/api/users', b); await viewUsers(); showInvite(r.invite_token); } catch (err) { toast(err.message, true); } };
  // Konto mit Passwort: Rückfrage (frühere Links werden ungültig; Einlösen setzt ein neues Passwort und beendet alle Anmeldungen)
  $$('[data-inv]').forEach((b) => (b.onclick = async () => { if (b.dataset.haspw && !confirm(t('reinvite_confirm').replace('{name}', b.dataset.name))) return; try { const r = await api('POST', `/api/users/${b.dataset.inv}/invite`); showInvite(r.invite_token); } catch (err) { toast(err.message, true); } }));
  $$('[data-ue]').forEach((b) => (b.onclick = () => {
    const u = all.find((x) => x.id === b.dataset.ue); if (!u) return;
    $('#inv').innerHTML = `<form class="panel" id="uef" style="scroll-margin-top:84px"><h2 style="margin-top:0">${esc(t('ue_title').replace('{name}', u.display_name))}</h2>
      <label for="uen">${esc(t('display_name'))}</label><input id="uen" name="display_name" required maxlength="120" value="${esc(u.display_name)}">
      <label for="uer">${esc(t('role'))}</label><select id="uer" name="role">${roles.map((r) => `<option value="${r}"${u.role === r ? ' selected' : ''}>${esc(t('role_' + r))}</option>`).join('')}</select>
      <div id="uewsrow"${u.role === 'workshop' ? '' : ' hidden'}><label for="uews">${esc(t('workshop'))}</label><select id="uews" name="workshop_site">${u.workshop_site && !S.meta.workshops.some((w) => w.code === u.workshop_site) ? `<option value="${esc(u.workshop_site)}" selected data-wsclosed>${esc(u.workshop_site)} (${esc(t('ws_closed'))})</option>` : ''}${S.meta.workshops.map((w) => `<option value="${esc(w.code)}"${u.workshop_site === w.code ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}</select></div>
      ${S.me.role === 'owner' ? `<label for="uee">${esc(t('environment'))}</label><select id="uee" name="environment"><option value="test"${u.environment === 'test' ? ' selected' : ''}>${esc(t('env_testname'))}</option><option value="production"${u.environment === 'production' ? ' selected' : ''}>${esc(t('env_prod'))}</option></select>` : ''}
      <div class="actions"><button class="btn">${esc(t('save'))}</button><button type="button" class="btn secondary" id="uex">${esc(t('cancel'))}</button></div></form>`;
    $('#uer').onchange = () => ($('#uewsrow').hidden = $('#uer').value !== 'workshop');
    $('#uex').onclick = () => ($('#inv').innerHTML = '');
    $('#uef').onsubmit = async (e) => {
      e.preventDefault();
      // leerer Name: Server prüft und meldet (übersetzt) – vorher galt „“ als „unverändert“ und die App zeigte „✓“ (20.10.2026)
      const body = { display_name: $('#uen').value.trim() || ' ', role: $('#uer').value };
      if (body.role === 'workshop') body.workshop_site = $('#uews').value;
      if ($('#uee')) body.environment = $('#uee').value;
      const roleEnvChange = body.role !== u.role || (body.environment && body.environment !== u.environment);
      // Werkstatt-Standortwechsel beendet serverseitig ebenfalls alle Anmeldungen (Tablet) – dieselbe Rückfrage (20.10.2026)
      const ends = roleEnvChange || (u.role === 'workshop' && body.role === 'workshop' && (body.workshop_site || null) !== (u.workshop_site || null));
      if (!roleEnvChange && body.display_name === u.display_name && (body.role !== 'workshop' || body.workshop_site === u.workshop_site)) { toast(t('ue_none')); return; }
      if (ends && !confirm(t('ue_confirm').replace('{name}', u.display_name))) return;
      try { const r = await api('PATCH', `/api/users/${u.id}`, body); const h = userUpdateHints(r); toast([r.sessions_ended && ends ? t('ue_saved_ended') : '✓', ...h].join(' · '), h.length > 0); viewUsers(); } catch (err) { toast(err.message, true); }
    };
    $('#uen').focus({ preventScroll: true }); $('#uef').scrollIntoView({ block: 'start' });
  }));
  // Deaktivieren beendet sofort alle Anmeldungen (z. B. am geteilten Tablet) – deshalb nachfragen; Aktivieren ohne Rückfrage
  $$('[data-act]').forEach((b) => (b.onclick = async () => { if (b.dataset.on !== '1' && !confirm(t('deactivate_confirm').replace('{name}', b.dataset.name))) return; try { const r = await api('PATCH', `/api/users/${b.dataset.act}`, { active: b.dataset.on === '1' }); const h = userUpdateHints(r); if (h.length) toast(h.join(' · '), true); viewUsers(); } catch (err) { toast(err.message, true); } }));
}
async function viewSettings(sec) {
  const s = await api('GET', '/api/settings');
  const v = s.values;
  // gespeicherte Kommazahlen („12.5“) im Formular mit Dezimalkomma (DE/UK) – der Server liest beide Schreibweisen
  const shown = (x) => (x !== null && x !== undefined && S.lang !== 'en' && /^\d+\.\d+$/.test(String(x)) ? String(x).replace('.', ',') : x ?? '');
  // Kommazahlen nur bei Euro/mm (Prüfung „2.000 mehrdeutig“ am Feld); ganze Zahlen (Tage, km, Minuten) numerisch – „15.000“ km = 15000 (Server)
  const DEC = ['workshop_hourly_rate_net', 'tire_warn_tread_mm', 'repair_cost_limit_net'];
  const field = (k, label) => `<label for="${k}">${esc(label)}</label><input id="${k}" name="${k}" inputmode="${DEC.includes(k) ? 'decimal' : 'numeric'}"${s.defaults && s.defaults[k] !== undefined ? ` placeholder="${esc(fmtNum(s.defaults[k]))}"` : ''} value="${esc(shown(v[k]))}">`; // Platzhalter = Standard bei leerem Feld (Server)
  const slaRows = ['test', 'production'].map((e) => `<h3>${esc(e === 'test' ? t('env_testname') : t('env_prod'))}</h3><div class="scroll"><table class="stack slatab"><thead><tr><th></th>${['niedrig', 'mittel', 'kritisch'].map((p) => `<th>${esc(t('prio_' + p))}</th>`).join('')}</tr></thead><tbody>${['triage', 'ack'].map((k) => `<tr><td class="slak">${esc(k === 'triage' ? t('act_receive') : t('act_acknowledge'))}</td>${['niedrig', 'mittel', 'kritisch'].map((p) => p === 'kritisch' ? `<td class="small muted" style="white-space:nowrap" data-label="${esc(t('prio_' + p))}">${esc(t('sla_immediate'))}</td>` /* Agent meldet kritische Vorgänge sofort – eine Frist wirkte nie (20.10.2026) */ : `<td data-label="${esc(t('prio_' + p))}"><input name="sla_${e}_${k}_${p}_min" inputmode="numeric" style="width:4em;padding:6px" value="${esc(v[`sla_${e}_${k}_${p}_min`] ?? '')}" aria-label="${esc((e === 'test' ? t('env_testname') : t('env_prod')) + ' · ' + (k === 'triage' ? t('act_receive') : t('act_acknowledge')) + ' · ' + t('prio_' + p) + ' (min)')}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('');
  // Backlog 412: bisherigen Stundensatz beim Ändern für Arbeit bis einschließlich Datum behalten (frühere Monate bleiben unverändert)
  const oldRate = Number(v.workshop_hourly_rate_net); const hasOldRate = v.workshop_hourly_rate_net && Number.isFinite(oldRate) && oldRate > 0;
  const periods = s.hourly_rate_periods || [];
  const hrKeep = hasOldRate ? `<div id="hrkeep" hidden><label class="check"><input type="checkbox" id="hrk"> ${esc(t('hr_keep').replace('{r}', eur(oldRate)))}</label><div id="hrkd" hidden><label for="hrkdate">${esc(t('hr_keep_until'))}</label><input type="date" id="hrkdate" value="${esc(bDate(-1))}"${periods.length ? ` min="${esc(bDateNext(periods[periods.length - 1].valid_until))}"` : ''}><p class="small muted">${esc(t('hr_keep_hint'))}</p></div></div>` : '';
  const hrList = periods.length ? `<div id="hrper" class="small"><p style="margin:4px 0"><b>${esc(t('hr_periods'))}</b></p><ul style="margin:0 0 8px">${periods.map((x, i) => `<li>${esc(i ? t('hr_period_item').replace('{from}', fmtD(bDateNext(periods[i - 1].valid_until))).replace('{to}', fmtD(x.valid_until)).replace('{r}', eur(x.rate_net)) : t('hr_until').replace('{d}', fmtD(x.valid_until)) + ': ' + eur(x.rate_net))} <button type="button" class="btn secondary small" data-hrdel="${esc(x.valid_until)}" style="padding:2px 8px">${esc(t('hr_remove'))}</button></li>`).join('')}<li>${esc(t('hr_period_now').replace('{from}', fmtD(bDateNext(periods[periods.length - 1].valid_until))))}</li></ul></div>` : '';
  render(`<h1>${esc(t('settings'))}</h1>${helpLink('settings')}<div id="sinv"></div><form id="sf" class="panel"><label class="check"><input type="checkbox" id="tmr"${v.test_master_readonly === '1' ? ' checked' : ''}> ${esc(t('test_master_readonly'))}</label><p class="small muted">${esc(t('test_master_readonly_hint'))}</p>${field('idle_logout_workshop_min', t('idle_ws'))}${field('idle_logout_other_min', t('idle_other'))}<p class="small muted">${esc(t('idle_hint'))}</p>${field('workshop_hourly_rate_net', t('hourly_rate'))}${hrKeep}${hrList}${field('maintenance_warn_days', t('warn_days'))}${field('maintenance_warn_km', t('warn_km'))}${field('tire_warn_tread_mm', t('tire_warn'))}${field('tire_warn_age_years', t('tire_warn_age'))}<p class="small muted">${esc(t('tire_age_hint'))}</p>${field('fine_warn_days', t('fine_warn'))}${field('driver_doc_warn_days', t('driver_doc_warn'))}${field('license_check_months', t('license_check_months'))}${field('tacho_warn_days', t('tacho_warn'))}${field('contract_warn_days', t('ct_warn'))}<p class="small muted">${esc(t('warn_zero_hint'))}</p>${field('claim_followup_days', t('claim_followup'))}${field('case_stale_days', t('case_stale_setting'))}${field('user_unused_days', t('unused_setting'))}<p class="small muted">${esc(t('unused_setting_hint'))}</p>${field('repair_cost_limit_net', t('cost_limit_setting'))}<p class="small muted">${esc(t('cost_limit_setting_hint'))}</p>${field('work_day_max_hours', t('work_day_setting'))}<p class="small muted">${esc(t('work_day_setting_hint'))}</p><h2>${esc(t('sla'))}</h2>${slaRows}<p class="small muted" id="slacal">${esc(t('sla_calendar_hint'))}</p><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form>
    <section class="panel"><h2 style="margin-top:0">${esc(t('import_csv'))}</h2><p class="small muted">${esc(t('import_vehicle_cols'))} · ${esc(t('import_trailer_hint'))}</p><input type="file" id="csv" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('import_csv'))}"><div id="csvr"></div></section>
    <section class="panel"><h2 style="margin-top:0">${esc(t('import_tires'))}</h2><p class="small muted" id="tirecols">${esc(t('import_tire_cols'))}</p><input type="file" id="tcsv" accept=".csv,.txt,text/csv,text/plain" aria-label="${esc(t('import_tires'))}"><div id="tcsvr"></div></section>
    <section class="panel"><h2 style="margin-top:0">${esc(t('backup'))}</h2><p class="small muted">${esc(t('backup_hint'))}</p><button type="button" class="btn secondary" id="bkp">${esc(t('backup_download'))}</button></section>`, 'more');
  // Gespeicherte Werte außerhalb der Regeln (vor der Werteprüfung 16.10.2026 oder aus einer Sicherung) gleich beim Öffnen zeigen und markieren
  const setLabel = (inp, k) => ((inp && inp.id && $(`label[for="${inp.id}"]`) ? $(`label[for="${inp.id}"]`).textContent : inp && inp.getAttribute('aria-label')) || (k === 'test_master_readonly' ? t('test_master_readonly') : k)).trim();
  if ((s.invalid || []).length) {
    const items = s.invalid.map((x) => {
      const inp = x.setting === 'test_master_readonly' ? $('#tmr') : $(`#sf [name="${x.setting}"]`);
      if (inp) inp.setAttribute('aria-invalid', 'true');
      const range = x.min !== undefined ? t('setting_stored_range').replace('{min}', fmtNum(x.min)).replace('{max}', fmtNum(x.max)).replace('{int}', x.integer ? t('setting_int') : '') : '';
      // gespeicherter Text unverändert; bei mehrdeutiger Schreibweise Grund + heutige Wirkung statt „außerhalb des Bereichs“ (20.10.2026)
      const why = x.reason && x.reason !== 'range' ? t('setting_stored_' + (x.reason === 'format' ? 'format' : 'precision')).replace('{e}', x.effective !== undefined ? fmtNum(x.effective) : t('setting_off')) : '';
      return `<li data-reason="${esc(x.reason || '')}">${esc(t('setting_stored_item').replace('{f}', setLabel(inp, x.setting)).replace('{v}', x.reason ? String(x.value) : shown(x.value)))}${esc(why)}${esc(range)}</li>`;
    });
    $('#sinv').innerHTML = `<section class="panel warn" role="alert"><p style="margin-top:0"><b>${esc(t('settings_stored_invalid'))}</b></p><ul class="small">${items.join('')}</ul></section>`;
  }
  // Sprung aus dem Einrichtungsstand (Adresse mit Abschnitt s=…): Feld zeigen und fokussieren
  const SEC = { idle_workshop: '#idle_logout_workshop_min', test_readonly: '#tmr', hourly_rate: '#workshop_hourly_rate_net', license_interval: '#license_check_months', cost_limit: '#repair_cost_limit_net', backup: '#bkp', import: '#csv' };
  const secEl = sec && SEC[sec] ? $(SEC[sec]) : null;
  if (secEl) { secEl.scrollIntoView({ block: 'center' }); try { secEl.focus({ preventScroll: true }); } catch {} }
  if ($('#hrkeep')) {
    const ri = $('#workshop_hourly_rate_net');
    const sync = () => { const ch = ri.value.trim() !== String(shown(v.workshop_hourly_rate_net) ?? '').trim(); $('#hrkeep').hidden = !ch; if (!ch) $('#hrk').checked = false; $('#hrkd').hidden = !$('#hrk').checked; };
    ri.oninput = sync; $('#hrk').onchange = sync;
  }
  $$('[data-hrdel]').forEach((bt) => { bt.onclick = async () => {
    if (!confirm(t('hr_period_remove_confirm').replace('{d}', fmtD(bt.dataset.hrdel)))) return;
    try { await api('DELETE', `/api/settings/hourly-rate-periods/${encodeURIComponent(bt.dataset.hrdel)}`); toast('✓'); viewSettings(); } catch (err) { toast(err.message, true); }
  }; });
  $('#bkp').onclick = async () => { try { const blob = await api('GET', '/api/admin/backup'); const b = blob instanceof Blob ? blob : new Blob([JSON.stringify(blob)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `fuhrpark-sicherung_${bDate()}.json`; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); if (blob && Array.isArray(blob.truncated) && blob.truncated.length) toast(t('backup_truncated').replace('{t}', blob.truncated.join(', ')), true); } catch (err) { toast(err.message, true); } };
  $('#tcsv').onchange = async () => {
    const f = $('#tcsv').files[0]; if (!f) return;
    const text = await readCsvFile(f);
    try {
      const r = await api('POST', '/api/tires/import?dry_run=1', text, { headers: { 'content-type': 'text/csv' } });
      $('#tcsvr').innerHTML = `<p><b>${esc(t('preview'))}:</b> ${esc(t('imp_new'))}: ${r.counts.neu} · ${esc(t('imp_changed'))}: ${r.counts.geaendert} · ${esc(t('imp_same'))}: ${r.counts.unveraendert} · ${esc(t('tires_kept_verified'))}: ${r.kept_verified} · ${esc(t('tires_no_vehicle'))}: ${r.skipped_no_vehicle.length}</p>${(r.skipped || []).length ? `<details open><summary>${esc(t('skipped'))} (${r.skipped.length})</summary><ul class="small">${r.skipped.slice(0, 300).map((x) => `<li>${esc(t('line'))} ${x.line}${x.plate ? ' · ' + esc(x.plate) : ''}: ${esc(reasonText(x.reason))}</li>`).join('')}</ul>${impMore(r.skipped.length, 300)}</details>` : ''}<div class="actions"><button type="button" class="btn" id="tgo"${r.counts.neu + r.counts.geaendert ? '' : ' disabled'}>${esc(t('apply_import'))}</button></div>`;
      $('#tgo').onclick = async () => { try { const g = await api('POST', '/api/tires/import', text, { headers: { 'content-type': 'text/csv' } }); $('#tcsvr').innerHTML = `<p>✓ ${esc(t('imp_new'))}: ${g.counts.neu} · ${esc(t('imp_changed'))}: ${g.counts.geaendert} · ${esc(t('imp_same'))}: ${g.counts.unveraendert}</p>`; } catch (err) { toast(err.message, true); } };
    } catch (err) { toast(err.message, true); }
  };
  // Werte unverändert senden (Server versteht „12,5“, „1.234,50“, „2000“ und weist Mehrdeutiges/außerhalb des Bereichs ab – nichts wird halb gespeichert)
  $('#sf').onsubmit = async (e) => {
    e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k in b) b[k] = b[k].trim() === '' ? null : b[k].trim(); b.test_master_readonly = $('#tmr').checked ? '1' : null;
    // nur geänderte Felder senden (17.10.2026): ein länger geöffnetes Formular setzte sonst zwischenzeitlich anderswo gespeicherte Einstellungen still zurück
    const was = (k) => { const x = k === 'test_master_readonly' ? (v[k] === '1' ? '1' : null) : String(shown(v[k]) ?? '').trim(); return x === '' ? null : x; };
    for (const k of Object.keys(b)) if (b[k] === was(k)) delete b[k];
    if ($('#hrk') && $('#hrk').checked && 'workshop_hourly_rate_net' in b) b.hourly_rate_keep_until = $('#hrkdate').value || '';
    $$('#sf [aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    try { const r = await api('PUT', '/api/settings', b); toast(r && r.hourly_rate_period ? '✓ ' + t('hr_kept_toast').replace('{r}', eur(r.hourly_rate_period.rate_net)).replace('{d}', fmtD(r.hourly_rate_period.valid_until)) : '✓'); viewSettings(); } catch (err) {
      const d = err.code === 'setting_invalid' && err.data; const inp = d && d.setting ? $(`#sf [name="${d.setting}"]`) : null;
      if (inp && d.min !== undefined) {
        const lab = (inp.id && $(`label[for="${inp.id}"]`) ? $(`label[for="${inp.id}"]`).textContent : inp.getAttribute('aria-label')) || d.setting;
        inp.setAttribute('aria-invalid', 'true'); inp.focus();
        toast(t('err_setting_invalid').replace('{f}', lab.trim()).replace('{min}', fmtNum(d.min)).replace('{max}', fmtNum(d.max)).replace('{int}', d.integer ? t('setting_int') : ''), true);
      } else toast(err.message, true);
    }
  };
  $('#csv').onchange = async () => {
    const f = $('#csv').files[0]; if (!f) return;
    const text = await readCsvFile(f);
    const skipped = (r) => (r.skipped.length ? `<p class="small">${esc(t('skipped'))} (${r.skipped.length}): ${esc(r.skipped.map((x) => `${t('line')} ${x.line} ${x.plate || ''} (${reasonText(x.reason)})`).join(', '))}</p>` : '');
    const FL = { plate: t('plate_label'), site: t('site'), manufacturer: t('manufacturer'), model: t('model_label'), build_year: t('year'), trailer_plate: t('trailer'), master_status: t('status_label'), kind: t('vehicle_kind') };
    try {
      const r = await api('POST', '/api/vehicles/import?dry_run=1', text, { headers: { 'content-type': 'text/csv' } });
      const changed = r.preview.filter((x) => x.action !== 'unverändert' || x.plate_conflict || x.year_unrecognized);
      const kd = r.preview.filter((x) => x.kind_defaulted);
      const pc = r.preview.filter((x) => x.plate_conflict);
      const igHtml = (r.ignored_columns || []).length ? `<p class="small" role="note" id="impign">⚠ ${esc(t('imp_cols_ignored').replace('{list}', r.ignored_columns.join(', ')).replace('{sec}', t('hu_sp')))}</p>` : '';
      const siHtml = (r.status_says_inactive || []).length ? `<p class="small" role="note" id="impgone">ⓘ ${esc(t('imp_status_inactive').replace('{n}', r.status_says_inactive.length))}: ${esc(r.status_says_inactive.slice(0, 50).join(', '))}${r.status_says_inactive.length > 50 ? ' …' : ''}</p>` : '';
      const ikHtml = (r.inactive_kept || []).length ? `<p class="small" role="note">ⓘ ${esc(t('imp_inactive_kept').replace('{n}', r.inactive_kept.length))}: ${esc(r.inactive_kept.slice(0, 50).join(', '))}${r.inactive_kept.length > 50 ? ' …' : ''}</p>` : '';
      const kdHtml = kd.length ? `<p class="small" role="note" id="impkind">${kd.some((x) => x.kind_maybe_trailer) ? '⚠' : 'ⓘ'} ${esc(tn('imp_kind_defaulted', kd.length))}: ${esc(kd.slice(0, 50).map((x) => x.plate + (x.kind_maybe_trailer ? ' (' + t('imp_kind_maybe_trailer') + ')' : '')).join(', '))}${kd.length > 50 ? ' …' : ''}</p>` : '';
      const pcHtml = pc.length ? `<p class="small" role="note">⚠ ${esc(tn('imp_plate_conflict', pc.length))}: ${esc(pc.slice(0, 50).map((x) => `${t('line')} ${x.line} ${x.plate} (${t('vin')} ${x.plate_conflict.join(', ')})`).join(' · '))}${pc.length > 50 ? ' …' : ''}</p>` : '';
      $('#csvr').innerHTML = `<p><b>${esc(t('preview'))}:</b> ${esc(t('imp_new'))}: ${r.counts.neu} · ${esc(t('imp_changed'))}: ${r.counts.geaendert} · ${esc(t('imp_same'))}: ${r.counts.unveraendert}</p>${skipped(r)}${igHtml}${pcHtml}${kdHtml}${ikHtml}${siHtml}
        ${changed.length ? `<div class="list">${changed.slice(0, 200).map((x) => `<div class="row ${x.action === 'neu' ? '' : 'p-mittel'}"><span class="chip">${esc(t('line'))} ${x.line}</span><span class="title">${esc(x.plate)}</span><span class="chip">${esc(x.action === 'neu' ? t('imp_new') : x.action === 'unverändert' ? t('imp_same') : t('imp_changed'))}</span>${(x.changes && x.changes.length) || x.plate_conflict || x.year_unrecognized ? `<span class="sub" style="white-space:normal">${[...(x.plate_conflict ? [`⚠ ${esc(t('dq_duplicate_plate'))}`] : []), ...(x.year_unrecognized ? [`⚠ ${esc(t('imp_year_unrecognized').replace('{v}', x.year_unrecognized))}`] : []), ...(x.changes || []).map((c) => `${esc(FL[c.field] || c.field)}: ${esc(c.field === 'kind' && c.from ? t('vk_' + c.from) : c.from ?? '–')} → ${esc(c.field === 'kind' ? t('vk_' + c.to) : c.to)}`)].join(' · ')}</span>` : ''}</div>`).join('')}</div>${impMore(changed.length, 200)}` : ''}
        <p class="small muted">${esc(t('imp_keep_hint'))}</p><div class="actions"><button type="button" class="btn" id="csvgo"${r.preview.length ? '' : ' disabled'}>${esc(t('apply_import'))}</button></div>`;
      $('#csvgo').onclick = async () => { try { const g = await api('POST', '/api/vehicles/import', text, { headers: { 'content-type': 'text/csv' } }); $('#csvr').innerHTML = `<p>✓ ${g.imported}</p>${skipped(g)}${(g.site_changes || []).length ? `<div class="panel warn small" id="impsite"><b>${esc(t('imp_site_changes'))}</b><ul>${g.site_changes.map((x) => `<li>${esc(x.plate)} → ${esc(x.site || t('cs_nosite'))}: ${[x.open_workshop_cases ? tn('veh_site_ws_open', x.open_workshop_cases).replace('{list}', () => (x.open_workshop_sites || []).join(', ')) : '', x.planned_appointments ? tn('veh_site_planned', x.planned_appointments) : '', x.drivers_other_site.length ? t('veh_site_drivers').replace('{list}', () => x.drivers_other_site.map((d) => `${d.name} (${d.site})`).join(', ')) : ''].filter(Boolean).map(esc).join(' · ')}</li>`).join('')}</ul></div>` : ''}`; } catch (err) { toast(err.message, true); } };
    } catch (err) { toast(err.message, true); }
  };
}

export { viewAudit, viewClaims, viewContracts, viewCosts, viewDefects, viewDriver, viewDriverRecords, viewDrivers, viewEmergencyEdit, viewFine, viewFines, viewFleetTires, viewKpi, viewMaint, viewMaintMulti, viewMaster, viewNewMulti, viewPlan, viewQrSheet, viewQuality, viewReadiness, viewSettings, viewTacho, viewTachoHistory, viewTelematics, viewTimeline, viewUsage, viewUsers, viewWsLoad };
