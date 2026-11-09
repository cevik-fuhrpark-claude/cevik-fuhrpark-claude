// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { $, $$, S, SEND_TIMEOUT_MS, api, bDate, clipTxt, conflictKeep, conflictMine, decIn, download, downloadChecked, envFn, esc, eur, eur3, fmtD, fmtDT, fmtHM, fmtNum, helpLink, helpNorm, isMgr, isStockHash, lostDup, lostMark, ltxt, markInvalid, nDays, noneP, nowMs, onPage, parseQty, partsEta, partsWaitDays, plate, pnCompact, printHead, printStamp, rc2, readCsvFile, reasonText, render, rkFor, stockHit, stockNoteText, supplierLabel, t, tn, toast, uid, unitL, wsAll, wsLabel, wsName } from './app-main.js';


const stNote = (x) => stockNoteText(x, S.lang, { site: wsName, num: (n) => fmtNum(n), date: fmtD, unit: unitL });
const stockOpt = (i) => `<option value="${esc(i.id)}">${esc(i.name)}${i.part_number ? ' · ' + esc(i.part_number) : ''} (${fmtNum(i.on_hand)} ${esc(unitL(i.unit))})</option>`;
const STOCK_Q_MIN = 8;
const stockQHtml = (id) => `<input type="search" id="${id}" class="stockq" data-stockq placeholder="${esc(t('stock_q_ph'))}" aria-label="${esc(t('stock_q_ph'))}" autocomplete="off" enterkeyhint="search" style="margin-bottom:4px"><p class="small muted" data-stockqn role="status" aria-live="polite" hidden></p>`;






function stockPick(inp, sel, list, first, next) {
  const info = inp.nextElementSibling;
  inp.onkeydown = (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    const q = inp.value.trim(); const it = sel.value ? list().find((i) => i.id === sel.value) : null;
    const n = it && next && (!q || stockHit(it, q)) ? next() : null;
    const el = n && !n.disabled && !n.hidden ? n : inp; el.focus(); try { el.select(); } catch {   }
  };
  inp.oninput = () => {
    const cur = sel.value; const all = list(); const q = inp.value.trim(); const hits = all.filter((i) => i.id === cur || stockHit(i, q));
    sel.innerHTML = first + hits.map(stockOpt).join('');
    const n = hits.filter((i) => i.id !== cur || stockHit(i, q)).length;
    if (cur && hits.some((i) => i.id === cur)) sel.value = cur; else if (!cur && q && n === 1) sel.value = hits[0].id; else sel.value = '';
    if (info) { info.hidden = !q; info.textContent = n ? tn('stock_q_hits', n) : t('stock_q_none'); }
    if (sel.value !== cur && sel.onchange) sel.onchange();
  };
}





function scanWatch(inp) {
  if (inp._scanW) return inp._scanW;
  let ts = [];
  inp.addEventListener('focus', () => { ts = []; inp._v0 = inp.value; });
  inp.addEventListener('keydown', (e) => { if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { const n = Date.now(); if (ts.length && n - ts[ts.length - 1] > 50) ts = []; ts.push(n); } else if (e.key === 'Backspace' || e.key === 'Delete') ts = []; });
  inp.addEventListener('paste', () => { ts = []; });
  inp._scanW = (items) => {
    const v = inp.value.trim(); if (!v) return null; const c = pnCompact(v);
    const item = c.length >= 3 ? (items || []).find((i) => pnCompact(i.part_number) === c) || null : null;
    return item || ts.length >= 6 || /^\d{7,}$/.test(v) ? { code: v, item } : null;
  };
  return inp._scanW;
}

function scanRestore(inp, s) { const v0 = inp._v0 === undefined ? '' : String(inp._v0); inp.value = v0.trim() && v0.trim() !== s.code ? v0 : ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp._v0 = inp.value; }
function scanNote(inp, s, moved) {
  if (moved) { toast(t('scan_qty_moved').replace('{c}', s.code)); return; }
  toast(t('scan_in_qty').replace('{c}', s.code), true); markInvalid(inp, t('scan_in_qty').replace('{c}', s.code)); inp.focus(); try { inp.select(); } catch {   }
}

function scanGuard(inp, items, onScan) {
  if (!inp) return () => false;
  const chk = scanWatch(inp);
  const run = () => { const s = chk(typeof items === 'function' ? items() : items); if (!s) return false; scanRestore(inp, s); scanNote(inp, s, !!(onScan && onScan(s))); return true; };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing && run()) { e.preventDefault(); e.stopImmediatePropagation(); } });
  return run;
}
async function loadStockSelect(c) {
  const el = $('#stocksel'); if (!el) return;
  let items = [];
  let siteItems = [];
  try { siteItems = (await api('GET', `/api/stock?site=${encodeURIComponent(c.workshop_site || '')}`)).items.filter((i) => i.site === c.workshop_site); items = siteItems.filter((i) => i.on_hand > 0); } catch { return; }


  if (!items.length) { if (siteItems.length && c.workshop_site) el.innerHTML = `<p class="small muted" data-stocknone>${esc(t('stock_none_ws').replace('{ws}', wsName(c.workshop_site)))}</p>`; return; }
  const first = `<option value="">${esc(t('without_stock'))}</option>`;
  el.innerHTML = `<label for="stocksi">${esc(t('from_stock'))}: ${esc(wsName(c.workshop_site))}</label>${items.length >= STOCK_Q_MIN ? stockQHtml('stockq') : ''}<select name="stock_item_id" id="stocksi">${first}${items.map(stockOpt).join('')}</select><p class="small muted" id="stockpricehint" hidden>${esc(t('stock_out_price_hint'))}</p>`;
  const sel = $('select', el); el._items = items;
  sel.onchange = () => {
    const fp = $('#freepart'); fp.querySelector('[name=name]').required = !sel.value; $$('[name=name],[name=part_number],[name=supplier]', fp).forEach((x) => { x.disabled = !!sel.value; });

    const it = items.find((i) => i.id === sel.value); const fixed = !!it && it.unit_price_net !== null && it.unit_price_net !== undefined;
    const pr = el.closest('form') && el.closest('form').querySelector('[name=unit_price_net]');
    if (pr) { pr.disabled = fixed; if (fixed) pr.value = ''; }

    const es = el.closest('form') && el.closest('form').querySelector('[name=estimate]');
    if (es) { es.disabled = fixed; if (fixed) es.checked = false; }
    $('#stockpricehint').hidden = !fixed;
    qtyCheck();
  };

  const qf = el.closest('form') && el.closest('form').querySelector('[name=quantity]');
  const qtyCheck = () => {
    let h = $('#stockqty'); const it = items.find((i) => i.id === sel.value);
    const raw = qf ? String(qf.value).trim() : ''; const pw = parseQty(raw); const q = pw ? pw.n : Number(raw.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.'));
    const over = !!it && raw !== '' && Number.isFinite(q) && q > it.on_hand + 1e-9;
    if (!over) { if (h) h.remove(); return; }
    if (!h) { h = document.createElement('p'); h.id = 'stockqty'; h.className = 'small panel warn'; h.setAttribute('role', 'status'); qf.after(h); }
    h.textContent = t('stock_qty_over').replace('{q}', fmtNum(it.on_hand)).replace('{u}', unitL(it.unit)).replace(/\.\.(?=\s|$)/g, '.');
  };
  if (qf) qf.addEventListener('input', qtyCheck);
  const sq = $('#stockq', el); if (sq) stockPick(sq, sel, () => items.filter((i) => i.on_hand > 0), first, () => qf);


  if (qf && el.closest('form')) el.closest('form')._scanChk = scanGuard(qf, () => items, (s) => {
    if (sq) { sel.value = ''; sq.value = s.code; sq.oninput(); if (!sel.value) sel.onchange(); sq.onkeydown({ key: 'Enter', isComposing: false, preventDefault() {} }); return true; }
    if (s.item && items.some((i) => i.id === s.item.id)) { sel.value = s.item.id; sel.onchange(); qf.focus(); try { qf.select(); } catch {   } return true; }
    return false;
  });



  const fpn = $('#freepart [name=part_number]');
  if (fpn) {
    const box = document.createElement('p'); box.className = 'small panel'; box.id = 'pninstock'; box.setAttribute('role', 'status'); box.hidden = true; fpn.after(box);
    const pnCheck = () => {
      const c = pnCompact(fpn.value); const hits = !sel.value && !fpn.disabled && c.length >= 3 ? items.filter((i) => i.on_hand > 0 && pnCompact(i.part_number) === c) : [];
      box.hidden = !hits.length; if (!hits.length) { box.textContent = ''; return; }
      box.innerHTML = `📦 ${esc(t('stock_pn_instock'))}<br>${hits.slice(0, 3).map((i) => `<button type="button" class="btn secondary small" data-pnpick="${esc(i.id)}" style="margin-top:4px">${esc(i.name)}${i.part_number ? ' · ' + esc(i.part_number) : ''} (${fmtNum(i.on_hand)} ${esc(unitL(i.unit))})</button>`).join(' ')}${hits.length > 3 ? ` +${hits.length - 3}` : ''}`;
      box.querySelectorAll('[data-pnpick]').forEach((b) => { b.onclick = () => {
        if (sq && ![...sel.options].some((o) => o.value === b.dataset.pnpick)) { sq.value = ''; sq.dispatchEvent(new Event('input', { bubbles: true })); }
        sel.value = b.dataset.pnpick; sel.onchange(); box.hidden = true; box.textContent = ''; sel.focus();
      }; });
    };
    fpn.addEventListener('input', pnCheck); sel.addEventListener('change', pnCheck); pnCheck();
  }
}
async function viewStock() {
  try { sessionStorage.removeItem('cfp_sj_item'); } catch {   }
  const stockResp = await api('GET', '/api/stock'); const items = stockResp.items; const lastInv = stockResp.last_inventory || {};

  const nReorder = items.filter((i) => i.below_min && !(i.ordered_on && i.min_qty - i.on_hand - (i.ordered_qty || 0) <= 1e-9)).length;
  const sites = S.me.role === 'workshop' ? S.meta.workshops.filter((w) => w.code === S.me.workshop_site) : S.meta.workshops;


  const stSites = S.me.role === 'workshop' ? [] : [...new Set(items.map((i) => i.site))].sort((a, b) => wsName(a).localeCompare(wsName(b)));
  let stSite = ''; try { stSite = sessionStorage.getItem('cfp_stock_site') || ''; } catch {   }
  if (!stSites.includes(stSite)) stSite = '';




  if (!onPage('#/stock')) return;
  if (S.quietBg && !isStockHash()) return;
  render(`<h1>${esc(t('stock'))}</h1><p class="small muted noprint" id="stockasof" style="margin:-6px 0 8px">${esc(t('home_asof').replace('{t}', fmtHM(new Date(nowMs()).toISOString())))} · <a href="#/stock" id="stockreload" title="${esc(t('stock_asof_hint'))}">${esc(t('update_now'))}</a></p>${printHead([S.me.role === 'workshop' ? `${t('workshop')}: ${wsName(S.me.workshop_site)}` : ''])}<p class="print-only small" id="sprsel"></p>${helpLink('stock')}
    <div class="actions"><button type="button" class="btn secondary" id="scsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="sprt">${esc(t('print'))}</button><a class="btn secondary" href="#/stock/receipt" id="srcpt">${esc(t('rcpt_title'))}</a><a class="btn secondary" href="#/stock/journal">${esc(t('stock_journal'))}</a><a class="btn secondary" href="#/stock/asof" id="sasof">${esc(t('asof_title'))}</a><a class="btn secondary" href="#/stock/usage" id="spu">${esc(t('ptu_title'))}</a><a class="btn secondary" href="#/stock/reorder">${esc(t('reorder'))}${nReorder ? ` <span class="chip mittel">${nReorder}</span>` : ''}</a></div>
    <div class="noprint"><input id="q" placeholder="${esc(t('part_name'))} / ${esc(t('part_number'))}" aria-label="${esc(t('part_name'))} / ${esc(t('part_number'))}" style="margin-bottom:8px">
    ${stSites.length > 1 ? `<label for="ssite">${esc(t('workshop'))}</label><select id="ssite"><option value="">${esc(t('all'))}</option>${stSites.map((c) => `<option value="${esc(c)}"${c === stSite ? ' selected' : ''}>${esc(wsName(c))}</option>`).join('')}</select>` : ''}
    <label for="sf">${esc(t('stock_filter'))}</label><select id="sf"><option value="">${esc(t('all'))}</option><option value="min">${esc(t('below_min'))}</option><option value="180">${esc(t('stock_idle').replace('{d}', 180))}</option><option value="365">${esc(t('stock_idle').replace('{d}', 365))}</option><option value="c365">${esc(t('count_age_n').replace('{n}', 365))}</option></select></div>
    <p class="small muted" id="sfsum" hidden></p>
    <div class="list" id="sl">${items.map((i) => `<a class="row ${i.below_min ? 'p-mittel' : ''}" href="#/stock/${esc(i.id)}" data-s="${esc(helpNorm(i.name + ' ' + (i.part_number || '')))}" data-pk="${esc(pnCompact(i.part_number))}" data-id="${esc(i.id)}">${S.me.role === 'workshop' ? '<span></span>' : `<span class="chip">${esc(wsName(i.site))}</span>`}<span class="title" style="white-space:normal">${esc(i.name)}</span><b>${fmtNum(i.on_hand)} ${esc(unitL(i.unit))}</b><span class="sub">${[i.part_number && esc(i.part_number), i.location && esc(i.location), i.below_min && esc(t('below_min')) + ' (' + fmtNum(i.min_qty) + ')', i.unit_price_net !== null && eur3(i.unit_price_net), esc(t('last_out')) + ': ' + (i.last_out_date ? esc(fmtD(i.last_out_date)) : esc(t('never')))].filter(Boolean).join(' · ')}</span></a>`).join('') || noneP()}</div>
    <details class="panel noprint"><summary>${esc(t('new_item'))}</summary><form id="nf">
      ${sites.length > 1 ? `<label>${esc(t('workshop'))}</label><select name="site">${sites.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>` : ''}
      <label>${esc(t('part_name'))}</label><input name="name" required><label>${esc(t('part_number'))}</label><input name="part_number"><div class="small" data-pndup role="status" aria-live="polite" hidden></div>
      <label>${esc(t('unit'))}</label><input name="unit" value="${esc(unitL('Stk'))}" maxlength="20"><label>${esc(t('initial_qty'))}</label><input name="initial_qty" inputmode="decimal">
      <label>${esc(t('min_qty'))}</label><input name="min_qty" inputmode="decimal"><label>${esc(t('storage'))}</label><input name="location">
      <label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    <details class="panel noprint" id="simp"><summary>${esc(t('stock_import'))}</summary><p class="small muted">${esc(t('stock_import_hint'))}</p>
      ${sites.length > 1 ? `<label for="simpsite">${esc(t('workshop'))}</label><select id="simpsite">${sites.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>` : ''}
      <label for="simpf">${esc(t('csv_file'))}</label><input type="file" id="simpf" accept=".csv,.txt,text/csv,text/plain"><div id="simpr"></div></details>
    ${items.length ? `<details class="panel noprint" id="inv"><summary>${esc(t('inventory'))}</summary><p class="small muted">${esc(t('inventory_hint'))}</p>
      ${sites.length > 1 ? `<label for="invsite">${esc(t('workshop'))}</label><select id="invsite">${sites.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>` : ''}
      <p class="small" id="invlast"></p><p class="noprint actions"><a class="btn secondary" href="#/stock/count" id="invsheet">${esc(t('count_sheet'))}</a><a class="btn secondary" href="#/stock/journal" id="invdiffs">${esc(t('inventory_diffs'))}</a></p><div id="invdraft"></div><div id="invlist"></div><label for="invnote">${esc(t('note'))}</label><input id="invnote" maxlength="300">
      <div class="actions"><button type="button" class="btn secondary" id="invchk">${esc(t('inventory_check'))}</button><button type="button" class="btn" id="invbook" disabled>${esc(t('inventory_book'))}</button></div><div id="invres"></div></details>` : ''}`, 'more');

  S.stockAt = Date.now();
  const srl = $('#stockreload'); if (srl) srl.onclick = async (e) => { e.preventDefault(); try { await viewStock(); } catch (err) { toast(err.message, true); } };
  const byId = new Map(items.map((i) => [i.id, i]));


  const slRows = $$('#sl a').map((a) => ({ a, s: a.dataset.s, pk: a.dataset.pk, i: byId.get(a.dataset.id) }));
  const applyStock = () => {
    const ws = $('#ssite') ? $('#ssite').value : ''; const q = helpNorm($('#q').value); const f = $('#sf').value; const qc = pnCompact($('#q').value); const qcOk = qc.length >= 3;
    const cut = /^\d+$/.test(f) ? bDate(-Number(f)) : null;
    const hit = (i) => (!f || (f === 'min' ? i.below_min : f === 'c365' ? !i.last_counted_date || i.last_counted_date <= bDate(-365) : i.on_hand > 0 && (!i.last_out_date || i.last_out_date < cut)));
    const shown = [];
    for (const r of slRows) { const h = !!((ws && r.i.site !== ws) || (q && !r.s.includes(q) && !(qcOk && r.pk.includes(qc))) || !hit(r.i)); if (r.a.hidden !== h) r.a.hidden = h; if (!h) shown.push(r.i); }

    const sum = $('#sfsum'); sum.hidden = !shown.length;
    const stocked = shown.filter((i) => i.on_hand > 0); const priced = stocked.filter((i) => i.unit_price_net !== null);
    const v = priced.length ? eur(rc2(priced.reduce((a, i) => a + rc2(i.on_hand * i.unit_price_net), 0))) : '–';
    const unv = stocked.length - priced.length ? ` (${stocked.length - priced.length} ${t('unvalued_short')})` : '';
    const qv = $('#q').value.trim(); const sfo = $('#sf').selectedOptions[0];
    $('#sprsel').textContent = [ws ? `${t('workshop')}: ${wsName(ws)}` : '', `${t('print_filter')}: ${f && sfo ? sfo.textContent : t('all')}`, qv ? `${t('print_search')}: „${qv}“` : ''].filter(Boolean).join(' · ');
    sum.textContent = cut ? tn('stock_idle_sum', shown.length).replace('{v}', v) + unv : tn('stock_value_sum', shown.length).replace('{v}', v) + unv;
  };
  let sqT = null; $('#q').oninput = () => { clearTimeout(sqT); sqT = setTimeout(applyStock, items.length > 300 ? 150 : 0); };


  $('#q').onkeydown = (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault(); clearTimeout(sqT); applyStock();
    const vis = slRows.filter((r) => !r.a.hidden); const qc = pnCompact($('#q').value);
    const exact = qc.length >= 3 ? vis.filter((r) => r.pk === qc) : [];
    const one = vis.length === 1 ? vis[0] : exact.length === 1 ? exact[0] : null;
    if (one) { location.hash = one.a.getAttribute('href'); return; }
    try { $('#q').select(); } catch {   }
  };

  const reoA = $('a[href="#/stock/reorder"]');
  const passSite = () => {
    const ws = $('#ssite') ? $('#ssite').value : '';
    try { sessionStorage.setItem('cfp_stock_site', ws); } catch {   }
    if (reoA) { const nr = items.filter((i) => (!ws || i.site === ws) && i.below_min && !(i.ordered_on && i.min_qty - i.on_hand - (i.ordered_qty || 0) <= 1e-9)).length; reoA.innerHTML = `${esc(t('reorder'))}${nr ? ` <span class="chip mittel">${nr}</span>` : ''}`; }
    if (ws && $('#invsite') && [...$('#invsite').options].some((o) => o.value === ws) && $('#invsite').value !== ws) { $('#invsite').value = ws; if ($('#invsite').onchange) $('#invsite').onchange(); }
  };
  const setSub = (k) => { const ws = $('#ssite') ? $('#ssite').value : ''; try { sessionStorage.setItem(k, ws); } catch {   } };
  if ($('#ssite')) {
    $('#ssite').onchange = () => { passSite(); applyStock(); };
    if (reoA) reoA.addEventListener('click', () => setSub('cfp_reorder_site'));
    $$('a[href="#/stock/journal"]:not(#invdiffs)').forEach((a) => a.addEventListener('click', () => { setSub('cfp_sj_site'); }));
    $('#sasof').addEventListener('click', () => setSub('cfp_sa_site'));
  }
  $('#sf').onchange = applyStock; applyStock();
  const sqFlush = () => { if (sqT) { clearTimeout(sqT); sqT = null; applyStock(); } };
  $('#sprt').onclick = () => { sqFlush(); window.print(); };

  $('#scsv').onclick = async () => { sqFlush(); try { const vis = $$('#sl a').filter((a) => !a.hidden).map((a) => a.dataset.id); download(vis.length < items.length ? await api('POST', '/api/stock/export', { ids: vis }) : await api('GET', '/api/stock?format=csv'), `fuhrpark-lager_${envFn()}_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
  if ($('#inv')) {

    $('#invdiffs').onclick = () => { try { sessionStorage.setItem('cfp_sj_type', 'inventur'); sessionStorage.setItem('cfp_sj_from', bDate(-364)); sessionStorage.setItem('cfp_sj_to', bDate()); sessionStorage.setItem('cfp_sj_site', $('#invsite') ? $('#invsite').value : ''); } catch {   } };
    const invSite = () => ($('#invsite') ? $('#invsite').value : sites[0] && sites[0].code);
    const fill = () => { const li = lastInv[invSite()]; $('#invlast').textContent = li ? t('inventory_last').replace('{d}', fmtDT(li.at)).replace('{c}', li.counted ?? '–').replace('{x}', li.differences ?? '–') : t('inventory_last_none');
      $('#invbook').textContent = t('inventory_book');


      const coll = new Intl.Collator(S.lang === 'uk' ? 'uk' : S.lang === 'en' ? 'en' : 'de', { numeric: true, sensitivity: 'base' });
      const its = items.filter((i) => i.site === invSite()).sort((a, b) => (a.location ? 0 : 1) - (b.location ? 0 : 1) || coll.compare(a.location || '', b.location || '') || coll.compare(a.name, b.name));
      const locs = [...new Set(its.map((i) => i.location || ''))]; const wb = !!S.invBook;
      $('#invlist').innerHTML = `<div class="actions" style="flex-wrap:wrap;align-items:end;margin-top:0">${locs.length > 1 ? `<div><label for="invloc">${esc(t('inventory_loc'))}</label><select id="invloc"><option value="*">${esc(t('filter_all'))}</option>${locs.map((l) => `<option value="${esc(l)}">${esc(l || t('inventory_loc_none'))}</option>`).join('')}</select></div>` : ''}${its.length >= STOCK_Q_MIN ? `<div style="flex:1 1 220px"><label for="invq">${esc(t('inventory_find'))}</label><input id="invq" type="search" autocomplete="off" enterkeyhint="go" placeholder="${esc(t('stock_q_ph'))}"><p class="small muted" id="invqn" role="status" aria-live="polite" hidden></p></div>` : ''}<label style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="invbookshow"${wb ? ' checked' : ''} style="width:auto">${esc(t('inventory_show_book'))}</label></div>
        <div class="scroll"><table><thead><tr><th>${esc(t('part_name'))}</th>${wb ? `<th>${esc(t('inventory_book_qty'))}</th>` : ''}<th>${esc(t('inventory_counted'))}</th></tr></thead><tbody>${its.map((i) => `<tr data-invloc="${esc(i.location || '')}"><td>${esc(i.name)}${i.part_number ? `<div class="small muted pn">${esc(i.part_number)}</div>` : ''}${i.location ? `<div class="small muted">${esc(i.location)}</div>` : ''}<div class="small muted" data-lc>${esc(i.last_counted_date ? t('last_counted') + ': ' + fmtD(i.last_counted_date) : t('never_counted'))}</div></td>${wb ? `<td>${fmtNum(i.on_hand)} ${esc(unitL(i.unit))}</td>` : ''}<td><input data-inv="${esc(i.id)}" data-invname="${esc(i.name + (i.location ? ' (' + i.location + ')' : ''))}" inputmode="decimal" style="max-width:110px" aria-label="${esc(t('inventory_counted'))} ${esc(i.name)}"></td></tr>`).join('')}</tbody></table></div>`; $('#invbook').disabled = true; $('#invres').innerHTML = ''; invPrev = null;
      const il = $('#invloc'); if (il) il.onchange = () => $$('#invlist tr[data-invloc]').forEach((tr) => (tr.hidden = il.value !== '*' && tr.dataset.invloc !== il.value));



      const iq = $('#invq');
      if (iq) {
        const find = () => {
          const q = iq.value.trim(); const info = $('#invqn'); if (!q) { info.hidden = true; return; }
          const hits = its.filter((i) => stockHit(i, q)); const qc = pnCompact(q); const exact = qc.length >= 3 ? hits.filter((i) => pnCompact(i.part_number) === qc) : [];
          const one = hits.length === 1 ? hits[0] : exact.length === 1 ? exact[0] : null;
          if (!one) { info.hidden = false; info.textContent = hits.length ? tn('stock_q_hits', hits.length) : t('stock_q_none'); try { iq.select(); } catch {   } return; }
          info.hidden = true; const x = $(`[data-inv="${CSS.escape(one.id)}"]`); const tr = x.closest('tr');
          if (tr.hidden && il) { il.value = '*'; il.onchange(); }
          try { tr.scrollIntoView({ block: 'center' }); } catch { tr.scrollIntoView(); }
          x.focus(); try { x.select(); } catch {   }
        };
        iq.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); find(); } };

        $$('[data-inv]').forEach((x) => { x._scanChk = scanGuard(x, its, (s) => { iq.value = s.code; find(); return true; }); });
        $$('[data-inv]').forEach((x) => x.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); iq.focus(); try { iq.select(); } catch {   } } }));
      }
      else $$('[data-inv]').forEach((x) => { x._scanChk = scanGuard(x, its); });
      $('#invbookshow').onchange = () => { invDraft.save(); S.invBook = $('#invbookshow').checked; fill(); };


      const dr = invDraft.load(); let restored = 0;
      if (dr) for (const x of $$('[data-inv]')) if (typeof dr.counts[x.dataset.inv] === 'string' && dr.counts[x.dataset.inv] !== '') { x.value = dr.counts[x.dataset.inv]; restored++; }
      if (dr && dr.note && !$('#invnote').value) $('#invnote').value = dr.note;
      $('#invdraft').innerHTML = restored ? `<div class="panel" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"><span class="small" style="flex:1 1 200px">${esc(tn('inventory_draft', restored).replace('{d}', fmtDT(dr.at)))}</span><button type="button" class="btn secondary" id="invdx">${esc(t('inventory_draft_discard'))}</button></div>` : '';
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
    const body = () => ({ site: invSite(), note: $('#invnote').value || null, counts: $$('[data-inv]').filter((x) => x.value.trim() !== '').map((x) => ({ item_id: x.dataset.inv, counted: x.value.trim() })) });

    const unc = () => $$('[data-inv]').filter((x) => x.value.trim() === '');
    const prog = () => { const all = $$('[data-inv]').length; const u = unc(); return `<p class="small" data-invprog>${esc(t('inventory_progress').replace('{c}', all - u.length).replace('{n}', all))}${u.length ? ` · <b>${esc(tn('inventory_uncounted', u.length))}</b>` : ''}</p>${u.length ? `<details class="small"><summary>${esc(t('inventory_uncounted_list'))}</summary><ul>${u.slice(0, 300).map((x) => `<li>${esc(x.dataset.invname || '')}</li>`).join('')}${u.length > 300 ? '<li>…</li>' : ''}</ul></details>` : ''}`; };
    const uncTxt = () => { const n = unc().length; return n ? '\n\n' + tn('inventory_uncounted_confirm', n) : ''; };

    const ctToday = (r) => (r.already_counted_today && r.already_counted_today.length ? `<div class="panel warn small" role="note" data-invtoday><b>${esc(tn('inventory_counted_today', r.already_counted_today.length))}</b><ul style="margin:.3rem 0;padding-left:1.2rem">${r.already_counted_today.slice(0, 100).map((x) => `<li>${esc(x.name)}${x.part_number ? ' (' + esc(x.part_number) + ')' : ''}: ${esc(t('inventory_counted_at').replace('{t}', fmtHM(x.at)))}${x.qty !== null && x.qty !== undefined ? ` – ${esc(t('inventory_counted'))} ${fmtNum(x.qty)} ${esc(unitL(x.unit))}` : ''}</li>`).join('')}${r.already_counted_today.length > 100 ? '<li>…</li>' : ''}</ul><span class="muted">${esc(t('inventory_counted_today_hint'))}</span></div>` : '');
    const show = (r, booked) => { $('#invres').innerHTML = (booked ? '' : prog() + ctToday(r)) + (r.differences.length ? `<div class="list">${r.differences.map((d) => `<div class="row ${booked ? '' : 'p-mittel'}" data-invdiff style="grid-template-columns:minmax(0,1fr) auto"><span class="title" style="white-space:normal">${esc(d.name)}</span><b style="white-space:nowrap">${d.delta > 0 ? '+' : ''}${fmtNum(d.delta)} ${esc(unitL(d.unit))}</b><span class="sub" style="white-space:normal;grid-column:1/-1">${esc(t('inventory_book_qty'))} ${fmtNum(d.book)} → ${esc(t('inventory_counted'))} ${fmtNum(d.counted)}</span></div>`).join('')}</div>` : `<p>${esc(t('inventory_no_diff'))}</p>`); };
    $('#invchk').onclick = async () => { if ($$('[data-inv]').some((x) => x._scanChk && x._scanChk())) return; try { const r = await api('POST', '/api/stock/inventory?dry_run=1', body(), { timeoutMs: SEND_TIMEOUT_MS }); show(r, false); invPrev = r.differences; $('#invbook').disabled = !(r.counted > 0); $('#invbook').textContent = t(r.differences.length ? 'inventory_book' : 'inventory_close'); } catch (err) { toast(err.message, true); } };
    $('#invbook').onclick = async () => {
      if (!invPrev) return;
      if (!confirm((invPrev.length ? tn('inventory_book_confirm', invPrev.length) : t('inventory_close_confirm')) + uncTxt())) return;
      try { const r = await api('POST', '/api/stock/inventory', { ...body(), preview: invPrev.map((d) => ({ item_id: d.item_id, book: d.book, counted: d.counted })) }); invDraft.clear(); toast(r.booked ? `✓ ${r.booked}` : t('inventory_closed')); viewStock(); }
      catch (err) { toast(err.message, true); if (err.code === 'inventory_changed') { invPrev = null; $('#invbook').disabled = true; $('#invres').innerHTML = `<p class="small muted">${esc(t('inventory_recheck'))}</p>`; } }
    };
  }

  const simpf = $('#simpf');
  if (simpf) simpf.onchange = async () => {
    const file = simpf.files[0]; if (!file) return;
    const text = await readCsvFile(file); const sel = $('#simpsite'); const q = sel ? `&site=${encodeURIComponent(sel.value)}` : '';
    const show = (r, applied) => {
      const box = $('#simpr'); if (!box) return;
      box.innerHTML = `<p id="simpsum"><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(wsName(r.site))} · ${esc(t('ia_neu'))}: ${r.created} · ${esc(t('ia_unverändert'))}: ${r.unchanged} · ${esc(t('skipped'))}: ${r.skipped.length}</p>${(r.ignored_columns || []).length ? `<p class="small muted" id="simpign">${esc(t('stock_import_ignored').replace('{c}', r.ignored_columns.join(', ')))}</p>` : ''}
        ${r.rows.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('line'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('part_number'))}</th><th>${esc(t('initial_qty'))}</th><th></th></tr></thead><tbody>${r.rows.map((x) => `<tr><td data-label="${esc(t('line'))}">${x.line}</td><td data-label="${esc(t('part_name'))}">${esc(x.name)}${x.note ? `<br><span class="small muted">${esc(reasonText(x.note))}</span>` : ''}</td><td data-label="${esc(t('part_number'))}">${esc(x.part_number || '–')}${x.existing_part_number ? `<br><span class="small muted" data-pnspelled>${esc(t('stock_pn_spelled').replace('{pn}', () => x.existing_part_number))}</span>` : ''}</td><td data-label="${esc(t('initial_qty'))}">${x.initial_qty === null ? '–' : `${fmtNum(x.initial_qty)} ${esc(unitL(x.unit))}`}</td><td><span class="chip${x.action === 'neu' ? ' ok' : ''}">${esc(t('ia_' + x.action))}</span>${x.inactive ? ` <span class="chip mittel">${esc(t('item_inactive_badge'))}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
        ${r.skipped.length ? `<details ${applied ? '' : 'open'}><summary>${esc(t('skipped'))} (${r.skipped.length})</summary><ul class="small">${r.skipped.map((x) => `<li>${esc(t('line'))} ${x.line}${x.plate ? ' · ' + esc(x.plate) : ''}: ${esc(reasonText(x.reason))}</li>`).join('')}</ul></details>` : ''}
        ${!applied && r.created ? `<div class="actions"><button type="button" class="btn" id="simpapply">${esc(t('apply_import'))}</button></div>` : ''}`;
      const ap = $('#simpapply');
      if (ap) ap.onclick = async () => { ap.disabled = true; try { const done = await api('POST', '/api/stock/import' + (q ? '?' + q.slice(1) : ''), text, { headers: { 'content-type': 'text/csv' } }); toast('✓'); S.simpDone = done; await viewStock(); } catch (err) { ap.disabled = false; toast(err.message, true); } };
    };
    try { show(await api('POST', '/api/stock/import?dry_run=1' + q, text, { headers: { 'content-type': 'text/csv' } }), false); } catch (err) { toast(err.message, true); }
  };
  if (S.simpDone && $('#simpr')) { const d = $('#simp'); d.open = true; const r = S.simpDone; S.simpDone = null; $('#simpr').innerHTML = `<p id="simpsum"><b>✓</b> · ${esc(wsName(r.site))} · ${esc(t('ia_neu'))}: ${r.created} · ${esc(t('ia_unverändert'))}: ${r.unchanged} · ${esc(t('skipped'))}: ${r.skipped.length}</p>`; }


  const nfm = $('#nf'); const pnBox = nfm.querySelector('[data-pndup]');
  const pnDupShow = (list) => { pnBox.hidden = !list.length; pnBox.innerHTML = list.length ? `⚠ ${esc(t('stock_pn_dup'))} ${list.slice(0, 3).map((i) => `<a href="#/stock/${esc(i.id)}" data-pndupitem="${esc(i.id)}">${esc(i.name)}${i.part_number ? ' · ' + esc(i.part_number) : ''}</a>${i.on_hand === null || i.on_hand === undefined ? '' : ` (${fmtNum(i.on_hand)} ${esc(unitL(i.unit))})`}`).join(', ')}${list.length > 3 ? ` +${list.length - 3}` : ''}` : ''; };
  const pnDupCheck = () => { const c = pnCompact(nfm.part_number.value); const site = nfm.site ? nfm.site.value : (sites[0] || {}).code; pnDupShow(c.length >= 3 ? items.filter((i) => i.site === site && pnCompact(i.part_number) === c) : []); };
  nfm.part_number.oninput = pnDupCheck; if (nfm.site) nfm.site.onchange = pnDupCheck;
  if ($('#ssite') && $('#ssite').value) { passSite(); if (nfm.site && [...nfm.site.options].some((o) => o.value === $('#ssite').value)) nfm.site.value = $('#ssite').value; }
  $('#nf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k of Object.keys(b)) { if (b[k] === '') delete b[k]; else if (['initial_qty', 'min_qty', 'unit_price_net'].includes(k)) b[k] = b[k].trim(); } const sf = e.target; try { await api('POST', '/api/stock', b, { timeoutMs: SEND_TIMEOUT_MS }); viewStock(); } catch (err) {   if (lostDup(sf, b, err, ['duplicate_item'])) { toast(t('saved_before')); viewStock(); return; } lostMark(sf, b, err); if (err.code === 'duplicate_item' && err.data && err.data.item_id) { const tw = items.find((i) => i.id === err.data.item_id); pnDupShow([tw || { id: err.data.item_id, name: err.data.name, part_number: err.data.part_number }]); } toast(err.message, true); } };
}

async function viewStockCount() {
  const sites = S.me.role === 'workshop' ? S.meta.workshops.filter((w) => w.code === S.me.workshop_site) : S.meta.workshops;
  const site = S.countSite && sites.some((w) => w.code === S.countSite) ? S.countSite : (sites[0] && sites[0].code) || '';
  const withBook = !!S.countBook;
  const sr = site ? await api('GET', '/api/stock?site=' + encodeURIComponent(site)) : { items: [], last_inventory: {} };
  const li = (sr.last_inventory || {})[site];

  const age = ['90', '180', '365'].includes(S.countAge) ? Number(S.countAge) : 0;
  const items = age ? sr.items.filter((i) => !i.last_counted_date || i.last_counted_date <= bDate(-age)) : sr.items;
  const ageLabel = age ? t('count_age_n').replace('{n}', age) : '';
  const coll = new Intl.Collator(S.lang === 'uk' ? 'uk' : S.lang === 'en' ? 'en' : 'de', { numeric: true, sensitivity: 'base' });
  items.sort((a, b) => (a.location ? 0 : 1) - (b.location ? 0 : 1) || coll.compare(a.location || '', b.location || '') || coll.compare(a.name, b.name));
  const n = (x) => fmtNum(x);
  if (!onPage('#/stock/count')) return;
  render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('count_sheet_title'))}</h1>${helpLink('stock')}
    <p class="small muted noprint">${esc(t('count_sheet_hint'))}</p>
    ${printHead([t('count_sheet_title'), site ? `${t('workshop')}: ${wsName(site)}` : '', withBook ? t('count_with_book') : t('count_blind'), ageLabel, t('print_count').replace('{n}', items.length), li ? t('inventory_last').replace('{d}', fmtDT(li.at)).replace('{c}', li.counted ?? '–').replace('{x}', li.differences ?? '–') : t('inventory_last_none')])}
    <div class="actions noprint" style="flex-wrap:wrap;align-items:flex-end;margin-top:0">
      ${sites.length > 1 ? `<div style="flex:1 1 200px"><label for="csite">${esc(t('workshop'))}</label><select id="csite">${sites.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}</select></div>` : ''}
      <div style="flex:1 1 200px"><label for="cage">${esc(t('count_age'))}</label><select id="cage"><option value="">${esc(t('count_age_all'))}</option>${[90, 180, 365].map((x) => `<option value="${x}"${x === age ? ' selected' : ''}>${esc(t('count_age_n').replace('{n}', x))}</option>`).join('')}</select></div>
      <label style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="cbook"${withBook ? ' checked' : ''} style="width:auto">${esc(t('count_with_book'))}</label>
      <button type="button" class="btn secondary" id="cprt"${items.length ? '' : ' disabled'}>${esc(t('print'))}</button></div>
    ${items.length ? `<div class="scroll"><table class="printsm" id="ctab"><thead><tr><th>${esc(t('storage'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('unit'))}</th><th>${esc(t('last_counted'))}</th>${withBook ? `<th>${esc(t('inventory_book_qty'))}</th>` : ''}<th style="min-width:90px">${esc(t('inventory_counted'))}</th></tr></thead><tbody>
      ${items.map((i) => `<tr><td>${esc(i.location || '–')}</td><td>${esc(i.name)}${i.part_number ? `<div class="small muted pn">${esc(i.part_number)}</div>` : ''}</td><td>${esc(unitL(i.unit))}</td><td>${i.last_counted_date ? esc(fmtD(i.last_counted_date)) : '–'}</td>${withBook ? `<td>${n(i.on_hand)}</td>` : ''}<td style="border-bottom:1px solid currentColor">&nbsp;</td></tr>`).join('')}
      </tbody></table></div><p style="margin-top:24px">${esc(t('count_sign'))}: ______________________________</p>` : `<p class="muted" id="cnone">${esc(age && sr.items.length ? t('count_age_none') : t('count_none'))}</p>`}`, 'more');
  const cs = $('#csite'); if (cs) cs.onchange = () => { S.countSite = cs.value; viewStockCount(); };
  $('#cbook').onchange = () => { S.countBook = $('#cbook').checked; viewStockCount(); };
  $('#cage').onchange = () => { S.countAge = $('#cage').value; viewStockCount(); };
  $('#cprt').onclick = () => window.print();
}

async function viewReorder() {
  const sites = S.me.role === 'workshop' ? [] : S.meta.workshops;
  let site = ''; try { site = sessionStorage.getItem('cfp_reorder_site') || ''; } catch {   }
  const q = site && sites.some((w) => w.code === site) ? `&site=${encodeURIComponent(site)}` : '';
  const items = (await api('GET', '/api/stock?reorder=1' + q)).items;
  const valued = items.filter((i) => i.shortfall_value_net !== null);
  const sum = rc2(valued.reduce((a, i) => a + i.shortfall_value_net, 0));
  const n = (x) => fmtNum(x);
  if (!onPage('#/stock/reorder')) return;
  render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('reorder'))}</h1>
    <p class="small muted">${esc(t('reorder_hint'))}</p>
    <p class="print-only small" id="rprsite">${printStamp()}${q ? ` · ${esc(t('workshop'))}: ${esc(wsName(site))}` : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    ${sites.length > 1 ? `<div class="noprint"><label for="rsite">${esc(t('workshop'))}</label><select id="rsite"><option value="">${esc(t('all'))}</option>${sites.map((w) => `<option value="${esc(w.code)}"${q && w.code === site ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}</select></div>` : ''}
    <div class="actions noprint"><button type="button" class="btn secondary" id="rcsv"${items.length ? '' : ' disabled'}>${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="rprt">${esc(t('print'))}</button></div>
    ${items.length ? `<div class="scroll"><table class="stack printsm"><thead><tr><th>${esc(t('workshop'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('on_hand'))}</th><th>${esc(t('min_qty'))}</th><th>${esc(t('shortfall'))}</th><th>${esc(t('used_90d'))}</th><th>${esc(t('shortfall_value'))}</th><th>${esc(t('last_supplier'))}</th></tr></thead><tbody>
      ${items.map((i) => `<tr><td>${esc(wsName(i.site))}</td><td><a href="#/stock/${esc(i.id)}">${esc(i.name)}</a>${i.part_number || i.location ? `<div class="small muted">${[i.part_number, i.location].filter(Boolean).map(esc).join(' · ')}</div>` : ''}</td><td>${n(i.on_hand)} ${esc(unitL(i.unit))}</td><td>${n(i.min_qty)}</td><td><b>${n(i.shortfall)} ${esc(unitL(i.unit))}</b>${i.ordered_on ? `<div class="small">${esc(t('ordered_line').replace('{q}', n(i.ordered_qty)).replace('{u}', unitL(i.unit)).replace('{d}', fmtD(i.ordered_on)))}${i.ordered_eta ? ` · ${esc(t('ordered_eta'))}: ${esc(fmtD(i.ordered_eta))}` : ''}</div><div class="small muted">${esc(t('open_after_order'))}: ${n(i.open_after_order)} ${esc(unitL(i.unit))}</div>` : ''}${i.other_stock && i.other_stock.length ? `<div class="small" data-otherstock>📦 ${esc(t('other_stock'))}:<br>${otherStockLine(i.other_stock, i.unit)}</div>` : ''}</td><td>${n(i.used_90d)}</td><td>${i.shortfall_value_net === null ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : eur(i.shortfall_value_net)}</td><td>${i.last_supplier ? esc(i.last_supplier) : '–'}${i.last_receipt_date ? `<div class="small muted">${esc(t('last_receipt'))}: ${esc(fmtD(i.last_receipt_date))}</div>` : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <p id="rosum"><b>${esc(t('reorder_sum'))}:</b> ${valued.length ? eur(sum) : '–'}${valued.length < items.length ? ` <span class="small muted">(${esc(tn('unvalued_items_n', items.length - valued.length))})</span>` : ''}</p>` : `<p class="muted">${esc(t('reorder_none'))}</p>`}`, 'more');
  if ($('#rsite')) $('#rsite').onchange = () => { try { sessionStorage.setItem('cfp_reorder_site', $('#rsite').value); } catch {} viewReorder(); };
  $('#rprt').onclick = () => window.print();
  $('#rcsv').onclick = async () => { try { download(await api('GET', '/api/stock?reorder=1&format=csv' + q), `fuhrpark-bestellvorschlag_${envFn()}_${bDate()}${q ? '_' + site : ''}.csv`); } catch (err) { toast(err.message, true); } };
}

async function viewStockAsOf() {
  if (!['owner', 'fleet', 'workshop'].includes(S.me.role)) return render(`<p>${esc(t('err_forbidden'))}</p>`);
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k) || ''; sessionStorage.setItem(k, v); } catch { return ''; } return ''; };
  const sites = S.me.role === 'workshop' ? [] : wsAll();
  const today = bDate();
  const date = ss('cfp_sa_date') || `${Number(today.slice(0, 4)) - 1}-12-31`;
  const site = sites.some((w) => w.code === ss('cfp_sa_site')) ? ss('cfp_sa_site') : '';
  const qs = `date=${encodeURIComponent(date)}${site ? '&site=' + encodeURIComponent(site) : ''}`;
  let rep;
  try { rep = await api('GET', '/api/stock/asof?' + qs); } catch (err) { ss('cfp_sa_date', ''); toast(err.message, true); rep = null; }
  const n = (x) => (x === null || x === undefined ? '' : fmtNum(x));
  const val = (x) => (x === null ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : eur(x));
  const sm = (k) => `${rep.summary[k].unvalued === rep.summary.count ? '–' : eur(rep.summary[k].value_net)}${rep.summary[k].unvalued ? ` <span class="small muted">(${rep.summary[k].unvalued} ${esc(t('unvalued_short'))})</span>` : ''}`;
  if (!onPage('#/stock/asof')) return;
  render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('asof_title'))}</h1>
    <p class="small muted">${esc(t('asof_hint'))}</p>
    <p class="print-only small">${printStamp()} · ${esc(t('asof_date'))} ${esc(fmtD(date))}${site ? ' · ' + esc(wsName(site)) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <form id="saf" class="panel noprint"><label for="sadate">${esc(t('asof_date'))}</label><input type="date" id="sadate" value="${esc(date)}" max="${esc(today)}" required>
      ${sites.length > 1 ? `<label for="sasite">${esc(t('workshop'))}</label><select id="sasite"><option value="">${esc(t('all'))}</option>${sites.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}</select>` : ''}
      <div class="actions"><button class="btn">${esc(t('show'))}</button><button type="button" class="btn secondary" id="sacsv"${rep && rep.items.length ? '' : ' disabled'}>${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="saprt">${esc(t('print'))}</button></div></form>
    ${rep && rep.items.length ? `<ul class="small" id="sasum"><li>${esc(tn('asof_count', rep.summary.count).replace('{d}', fmtD(rep.date)))}</li><li>${esc(t('asof_val_purchase'))}: ${sm('purchase')}</li><li>${esc(t('asof_val_today'))}: ${sm('today')}</li></ul>
      ${rep.summary.negative ? `<p class="panel warn">${esc(tn('asof_negative', rep.summary.negative))}</p>` : ''}
      ${rep.inventory_after && rep.inventory_after.count ? `<p class="panel warn" id="sainvafter">${esc(tn('asof_inv_after', rep.inventory_after.count).replace('{d}', fmtD(rep.inventory_after.first_date)).replace('{s}', fmtD(rep.date)))}</p>` : ''}
      <div class="scroll"><table class="stack printsm" id="satab"><thead><tr><th>${esc(t('workshop'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('asof_qty'))}</th><th>${esc(t('asof_last_purchase'))}</th><th>${esc(t('asof_val_purchase'))}</th><th>${esc(t('inv_item_price'))}</th><th>${esc(t('asof_val_today'))}</th></tr></thead><tbody>
      ${rep.items.map((i) => `<tr><td>${esc(wsName(i.site))}</td><td><a href="#/stock/${esc(i.id)}">${esc(i.name)}</a>${i.part_number || i.location ? `<div class="small muted">${[i.part_number, i.location].filter(Boolean).map(esc).join(' · ')}</div>` : ''}${i.active ? '' : ` <span class="chip">${esc(t('asof_inactive'))}</span>`}</td><td><b>${n(i.qty)}</b> ${esc(unitL(i.unit))}</td><td>${val(i.last_purchase_price)}</td><td>${i.value_purchase_net === null ? '–' : eur(i.value_purchase_net)}</td><td>${val(i.price_today)}</td><td>${i.value_today_net === null ? '–' : eur(i.value_today_net)}</td></tr>`).join('')}
      </tbody></table></div>` : rep ? `<p class="muted">${esc(t('asof_none'))}</p>` : ''}`, 'more');
  $('#saf').onsubmit = (e) => { e.preventDefault(); ss('cfp_sa_date', $('#sadate').value); if ($('#sasite')) ss('cfp_sa_site', $('#sasite').value); viewStockAsOf(); };
  $('#saprt').onclick = () => window.print();
  $('#sacsv').onclick = async () => { try { download(await api('GET', '/api/stock/asof?format=csv&' + qs), `fuhrpark-lagerbestand-stichtag_${envFn()}_${date}${site ? '_' + site : ''}.csv`); } catch (err) { toast(err.message, true); } };
}

async function viewStockJournal() {
  if (!['owner', 'fleet', 'workshop'].includes(S.me.role)) return render(`<p>${esc(t('err_forbidden'))}</p>`);
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k) || ''; sessionStorage.setItem(k, v); } catch { return ''; } return ''; };
  const sites = S.me.role === 'workshop' ? [] : wsAll();
  const today = bDate();
  const from = ss('cfp_sj_from') || today.slice(0, 8) + '01'; const to = ss('cfp_sj_to') || today;
  const site = sites.some((w) => w.code === ss('cfp_sj_site')) ? ss('cfp_sj_site') : ''; const type = ss('cfp_sj_type');
  const itemId = ss('cfp_sj_item');
  const qs = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${site ? '&site=' + encodeURIComponent(site) : ''}${type ? '&type=' + encodeURIComponent(type) : ''}${itemId ? '&item=' + encodeURIComponent(itemId) : ''}`;
  let rep;
  try { rep = await api('GET', '/api/stock/journal?' + qs); } catch (err) { ss('cfp_sj_from', ''); ss('cfp_sj_to', ''); ss('cfp_sj_item', ''); toast(err.message, true); rep = null; }
  const n = (x) => (x === null || x === undefined ? '' : fmtNum(x));
  const TYPES = ['zugang', 'entnahme', 'korrektur', 'umlagerung'];
  const inv = type === 'inventur' && rep && rep.summary.inventur; const is = inv ? rep.summary.inventur : null;
  const sumRow = rep ? TYPES.map((k) => { const x = rep.summary[k]; return x.count ? `<li>${esc(t('mv_' + k))}: ${x.count} · ${x.unvalued === x.count ? '–' : eur(x.value_net)}${x.unvalued ? ` <span class="small muted">(${x.unvalued} ${esc(t('unvalued_short'))})</span>` : ''}</li>` : ''; }).join('') : '';
  if (!onPage('#/stock/journal')) return;
  render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t(inv ? 'inventory_diffs' : 'stock_journal'))}</h1>
    <p class="small muted">${esc(t(inv ? 'inv_hint' : 'journal_hint'))}</p>
    <p class="print-only small">${printStamp()} · ${esc(fmtD(from))} – ${esc(fmtD(to))}${site ? ' · ' + esc(wsName(site)) : ''}${rep && rep.item ? ' · ' + esc(rep.item.name) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <form id="jf" class="panel noprint"><div class="grid2"><div><label for="jfrom">${esc(t('from'))}</label><input type="date" id="jfrom" value="${esc(from)}" max="${esc(today)}"></div><div><label for="jto">${esc(t('to'))}</label><input type="date" id="jto" value="${esc(to)}" max="${esc(today)}"></div></div>
      ${sites.length > 1 ? `<label for="jsite">${esc(t('workshop'))}</label><select id="jsite"><option value="">${esc(t('all'))}</option>${sites.map((w) => `<option value="${esc(w.code)}"${w.code === site ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}</select>` : ''}
      <label for="jtype">${esc(t('kind'))}</label><select id="jtype"><option value="">${esc(t('all'))}</option>${[...TYPES, 'inventur'].map((k) => `<option value="${k}"${k === type ? ' selected' : ''}>${esc(t('mv_' + k))}</option>`).join('')}</select>
      ${rep && rep.item ? `<p id="jitem" style="margin-top:12px"><span class="chip">${esc(t('part_name'))}: ${esc(rep.item.name)}${rep.item.part_number ? ' · ' + esc(rep.item.part_number) : ''}</span> <button type="button" class="btn secondary" id="jitemclr">${esc(t('journal_item_all'))}</button></p>` : ''}
      <div class="actions"><button class="btn">${esc(t('show'))}</button><button type="button" class="btn secondary" id="jcsv"${rep && rep.movements.length ? '' : ' disabled'}>${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="jprt">${esc(t('print'))}</button></div></form>
    ${rep && rep.truncated ? `<p class="panel warn">${esc(t('journal_truncated').replaceAll('{n}', rep.max))}</p>` : ''}
    ${inv ? (rep.movements.length ? `<p class="small" id="invsum">${esc(t('inv_sum').replace('{n}', is.count).replace('{p}', is.plus).replace('{pv}', rep.movements.some((m) => m.qty > 0 && m.diff_value_net !== null) ? eur(is.plus_value_net) : '–').replace('{m}', is.minus).replace('{mv}', rep.movements.some((m) => m.qty < 0 && m.diff_value_net !== null) ? eur(is.minus_value_net) : '–'))}${is.unvalued ? ` <span class="muted">(${is.unvalued} ${esc(t('unvalued_short'))})</span>` : ''}</p><div class="scroll"><table class="stack printsm" id="invtab"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('workshop'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('inv_book_before'))}</th><th>${esc(t('inventory_counted'))}</th><th>${esc(t('inv_diff'))}</th><th>${esc(t('inv_item_price'))}</th><th>${esc(t('inv_diff_value'))}</th><th>${esc(t('note'))}</th></tr></thead><tbody>
      ${rep.movements.map((m) => `<tr><td class="small">${fmtDT(m.created_at)}</td><td>${esc(wsName(m.site))}</td><td><a href="#/stock/${esc(m.item_id)}">${esc(m.name)}</a>${m.part_number ? `<div class="small muted pn">${esc(m.part_number)}</div>` : ''}</td><td>${n(m.book)} ${esc(unitL(m.unit))}</td><td>${n(m.counted)} ${esc(unitL(m.unit))}</td><td><b>${m.qty > 0 ? '+' : ''}${n(m.qty)}</b> ${esc(unitL(m.unit))}</td><td>${m.item_price_net === null ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : eur3(m.item_price_net)}</td><td>${m.diff_value_net === null ? '–' : eur(m.diff_value_net)}</td><td class="small">${esc(stNote(m.document_ref || ''))}</td></tr>`).join('')}
      </tbody></table></div>` : `<p class="muted">${esc(t('inv_none'))}</p>`) : rep && rep.movements.length ? `<ul class="small">${sumRow}</ul><div class="scroll"><table class="stack printsm"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('workshop'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('kind'))}</th><th>${esc(t('qty'))}</th><th>${esc(t('price_net'))}</th><th>${esc(t('value_net'))}</th><th>${esc(t('vehicle'))}</th><th>${esc(t('note'))}</th></tr></thead><tbody>
      ${rep.movements.map((m) => `<tr><td class="small">${fmtDT(m.created_at)}</td><td>${esc(wsName(m.site))}</td><td><a href="#/stock/${esc(m.item_id)}">${esc(m.name)}</a>${m.part_number ? `<div class="small muted pn">${esc(m.part_number)}</div>` : ''}</td><td>${m.transfer_id ? `${esc(t('mv_umlagerung'))} ${m.qty < 0 ? '→' : '←'} ${esc(wsName(m.transfer_site))}` : esc(t('mv_' + m.type))}</td><td><b>${m.qty > 0 ? '+' : ''}${n(m.qty)}</b> ${esc(unitL(m.unit))}</td><td>${m.unit_price_net === null ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : eur3(m.unit_price_net)}</td><td>${m.value_net === null ? '–' : eur(m.value_net)}</td><td>${m.case_no ? `<a href="#/cases/${esc(m.case_id)}" translate="no">${esc(m.case_no)}</a>${m.plate ? ' · ' + esc(m.plate) : ''}` : '–'}</td><td class="small">${[m.supplier, m.document_ref && !(m.note || '').startsWith(m.document_ref) ? stNote(m.document_ref) : null, stNote(m.note)].filter(Boolean).map(esc).join(' · ') || '–'}</td></tr>`).join('')}
      </tbody></table></div>` : rep ? `<p class="muted">${esc(t('journal_none'))}</p>` : ''}`, 'more');
  $('#jf').onsubmit = (e) => { e.preventDefault(); ss('cfp_sj_from', $('#jfrom').value); ss('cfp_sj_to', $('#jto').value); if ($('#jsite')) ss('cfp_sj_site', $('#jsite').value); ss('cfp_sj_type', $('#jtype').value); viewStockJournal(); };
  $('#jprt').onclick = () => window.print();
  if ($('#jitemclr')) $('#jitemclr').onclick = () => { ss('cfp_sj_item', ''); viewStockJournal(); };
  $('#jcsv').onclick = async () => { try { downloadChecked(await api('GET', '/api/stock/journal?format=csv&' + qs), `fuhrpark-${inv ? 'inventurdifferenzen' : 'lagerjournal'}_${envFn()}_${from}_${to}${site ? '_' + site : ''}${rep && rep.item && rep.item.part_number ? '_' + rep.item.part_number.replace(/[^\w-]/g, '') : ''}.csv`); } catch (err) { toast(err.message, true); } };
}


async function viewStockReceipt() {
  if (!['owner', 'fleet', 'workshop'].includes(S.me.role)) return render(`<p>${esc(t('err_forbidden'))}</p>`);
  const items = (await api('GET', '/api/stock?last=1')).items.filter((i) => i.active);


  const sites = S.me.role === 'workshop' ? S.meta.workshops.filter((w) => w.code === S.me.workshop_site)
    : [...S.meta.workshops.filter((w) => items.some((i) => i.site === w.code)), ...S.meta.workshops.filter((w) => !items.some((i) => i.site === w.code))];
  if (!onPage('#/stock/receipt')) return;
  if (!sites.length) return render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('rcpt_title'))}</h1><p class="muted" id="rcnone">${esc(t('rcpt_no_items'))}</p>`, 'more');
  let key = uid().replace(/[^\w-]/g, '');
  render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('rcpt_title'))}</h1><p class="print-only small">${printStamp()} · CEVIK ${esc(t('app'))} [CLAUDE]</p><p class="small muted">${esc(t('rcpt_hint'))}</p>
    <form id="rcf" class="panel" novalidate>${sites.length > 1 ? `<label for="rcsite">${esc(t('workshop'))}</label><select id="rcsite">${sites.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>` : ''}
      <label for="rcsup">${esc(t('supplier'))}</label><input id="rcsup" maxlength="120" list="rcsupl" autocomplete="off"><datalist id="rcsupl"></datalist><label for="rcdoc">${esc(t('doc_ref'))}</label><input id="rcdoc" maxlength="200"><label for="rcnote">${esc(t('note'))}</label><input id="rcnote" maxlength="500">
      <h3 style="margin-top:16px">${esc(t('rcpt_lines'))}</h3><div id="rclines"></div>
      <div class="actions"><button type="button" class="btn secondary" id="rcadd">${esc(t('rcpt_add'))}</button></div>
      <p class="small" id="rcsum" role="status" aria-live="polite"></p>
      <div class="actions"><button class="btn" id="rcbook">${esc(t('rcpt_book'))}</button></div></form><div id="rcres"></div>`, 'more');
  const site = () => ($('#rcsite') ? $('#rcsite').value : sites[0].code);
  const siteItems = () => items.filter((i) => i.site === site());
  const opts = () => `<option value="">–</option>${siteItems().map(stockOpt).join('')}`;

  const rcQVis = (d) => { const q = $('.stockq', d); q.value = ''; q.hidden = siteItems().length < STOCK_Q_MIN; q.nextElementSibling.hidden = true; };


  const byId = new Map(items.map((i) => [i.id, i]));
  const decNum = (x) => {
    const v = String(x || '').replace(/\s/g, ''); if (!/^\d[\d.,]*$/.test(v)) return null;
    const k = Math.max(v.lastIndexOf(','), v.lastIndexOf('.')); const seps = (v.match(/[.,]/g) || []).length;
    const dec = k >= 0 && !(seps === 1 && v.length - k - 1 === 3 && v[k] === (S.lang === 'en' ? ',' : '.'));
    const f = Number(dec ? v.slice(0, k).replace(/[.,]/g, '') + '.' + v.slice(k + 1) : v.replace(/[.,]/g, '')); return Number.isFinite(f) ? f : null;
  };
  const supKey = (x) => String(x || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const rcLast = (d) => {
    const box = $('.rclast', d); if (!box) return;
    const it = byId.get($('select', d).value);
    if (!it) { box.innerHTML = ''; return; }
    const parts = [];
    if (it.last_supplier || it.last_receipt_date) parts.push(`${esc(t('rcl_last'))}: ${it.last_supplier ? esc(it.last_supplier) : esc(t('rcl_no_sup'))}${it.last_receipt_date ? ' · ' + esc(fmtD(it.last_receipt_date)) : ''}`);
    else parts.push(`<span class="muted">${esc(t('rcl_none'))}</span>`);
    parts.push(`${esc(t('rcl_price'))}: ${it.unit_price_net === null || it.unit_price_net === undefined ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : `${eur(it.unit_price_net)} / ${esc(unitL(it.unit))}`}`);
    const sup = supKey($('#rcsup').value); const chips = [];
    if (sup && it.last_supplier && supKey(it.last_supplier) !== sup) chips.push(`<span class="chip mittel" data-rclsup>${esc(t('rcl_other_sup'))}</span>`);
    const p = decNum($('.rcp', d).value);
    if (p !== null && it.unit_price_net && p !== Number(it.unit_price_net)) { const pc = Math.round((p / it.unit_price_net - 1) * 1000) / 10; chips.push(`<span class="chip${pc > 0 ? ' mittel' : ''}" data-rclpct>${esc(t('rcl_diff').replace('{p}', (pc > 0 ? '+' : '') + fmtNum(pc) + ' %'))}</span>`); }
    box.innerHTML = `<span class="muted">${parts.join(' · ')}</span>${chips.length ? `<div>${chips.join(' ')}</div>` : ''}`;
  };





  const rcAddItem = (it) => {
    if (!byId.has(it.id)) { items.push(it); byId.set(it.id, it); }
    $$('#rclines .rcl').forEach((r) => { const sel = $('select', r); const cur = sel.value; const q = $('.stockq', r);
      if (q.value.trim()) q.oninput(); else { sel.innerHTML = opts(); sel.value = cur; }
      if (q.hidden && siteItems().length >= STOCK_Q_MIN) q.hidden = false; });
  };
  const rcPick = (d, id, created) => {
    const sel = $('select', d); const q = $('.stockq', d); q.value = ''; q.nextElementSibling.hidden = true; sel.innerHTML = opts(); sel.value = id; sel.onchange();
    const it = byId.get(id); const ok = $('[data-rcnok]', d);
    ok.hidden = false; ok.innerHTML = `${created ? '✓ ' + esc(t('rcn_done')) : esc(t('rcn_taken'))}: <a href="#/stock/${esc(id)}">${esc(it ? it.name : '')}${it && it.part_number ? ' · ' + esc(it.part_number) : ''}</a>`;
    const f = $('[data-rcnf]', d); f.hidden = true; f.innerHTML = ''; $('.rcnew', d).setAttribute('aria-expanded', 'false'); $('.rcnew', d).style.fontWeight = ''; $('.rcnew', d).removeAttribute('data-rcnhot');
    $('.rcq', d).focus();
  };
  const rcNew = (d) => {
    const f = $('[data-rcnf]', d); const btn = $('.rcnew', d);
    if (!f.hidden) { f.hidden = true; f.innerHTML = ''; btn.setAttribute('aria-expanded', 'false'); return; }
    const q = $('.stockq', d).value.trim(); const asPn = /\d/.test(q) && !/\p{L}{4,}/u.test(q);
    const id = 'rcn' + Math.random().toString(36).slice(2, 8);
    f.innerHTML = `<div class="panel" style="margin:4px 0 8px"><p class="small muted">${esc(t('rcn_hint').replace('{ws}', wsName(site())))}</p>
      <label for="${id}n">${esc(t('part_name'))} *</label><input id="${id}n" data-rcnname maxlength="200" autocomplete="off" value="${asPn ? '' : esc(q)}">
      <label for="${id}p">${esc(t('part_number'))}</label><input id="${id}p" data-rcnpn maxlength="80" autocomplete="off" value="${asPn ? esc(q) : ''}"><div class="small" data-rcndup role="status" aria-live="polite" hidden></div>
      <div class="grid2"><div><label for="${id}u">${esc(t('unit'))}</label><input id="${id}u" data-rcnunit maxlength="20" value="${esc(unitL('Stk'))}"></div><div><label for="${id}l">${esc(t('storage'))}</label><input id="${id}l" data-rcnloc maxlength="80"></div></div>
      <div class="actions"><button type="button" class="btn" data-rcnsave>${esc(t('rcn_save'))}</button><button type="button" class="btn secondary" data-rcncancel>${esc(t('cancel'))}</button></div></div>`;
    f.hidden = false; btn.setAttribute('aria-expanded', 'true');
    const nm = $('[data-rcnname]', f); const pn = $('[data-rcnpn]', f); const dup = $('[data-rcndup]', f);

    const dupCheck = () => { const c = pnCompact(pn.value); const tw = c.length >= 3 ? siteItems().filter((i) => pnCompact(i.part_number) === c) : [];
      dup.hidden = !tw.length; dup.innerHTML = tw.length ? `⚠ ${esc(t('rcn_dup'))} ${tw.slice(0, 3).map((i) => `<button type="button" class="linkbtn" data-rcnuse="${esc(i.id)}">${esc(i.name)} · ${esc(i.part_number)} (${fmtNum(i.on_hand)} ${esc(unitL(i.unit))})</button>`).join(' ')}${tw.length > 3 ? ` +${tw.length - 3}` : ''}` : '';
      $$('[data-rcnuse]', dup).forEach((b) => { b.onclick = () => rcPick(d, b.dataset.rcnuse, false); }); };
    pn.oninput = dupCheck; dupCheck();

    f.onkeydown = (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); $('[data-rcnsave]', f).click(); } };
    $('[data-rcncancel]', f).onclick = () => { f.hidden = true; f.innerHTML = ''; btn.setAttribute('aria-expanded', 'false'); btn.focus(); };
    $('[data-rcnsave]', f).onclick = async () => {
      if (!nm.value.trim()) { toast(t('rcn_need_name'), true); markInvalid(nm, t('rcn_need_name')); nm.focus(); return; }
      const body = { site: site(), name: nm.value.trim(), part_number: pn.value.trim() || undefined, unit: $('[data-rcnunit]', f).value.trim() || undefined, location: $('[data-rcnloc]', f).value.trim() || undefined };
      try {
        const r = await api('POST', '/api/stock', body, { timeoutMs: SEND_TIMEOUT_MS });
        rcAddItem({ id: r.id, site: body.site, name: body.name, part_number: body.part_number || null, unit: body.unit || 'Stk', location: body.location || null, on_hand: 0, min_qty: null, unit_price_net: null, active: 1, last_supplier: null, last_receipt_date: null });
        rcPick(d, r.id, true);
      } catch (err) {

        if (err.code === 'duplicate_item' && err.data && err.data.item_id) {
          if (!byId.has(err.data.item_id)) { try { const x = (await api('GET', `/api/stock/${encodeURIComponent(err.data.item_id)}`)).item; if (x.active) rcAddItem({ ...x, last_supplier: null, last_receipt_date: null }); else { toast(t('rcn_inactive'), true); return; } } catch (e2) { toast(e2.message, true); return; } }
          rcPick(d, err.data.item_id, false); return;
        }
        toast(err.message, true);
      }
    };
    (asPn || !q ? nm : pn).focus();
  };
  let n = 0;
  const sum = () => { const k = $$('#rclines .rcl').filter((r) => $('select', r).value).length; $('#rcsum').textContent = t('rcpt_count').replace('{n}', k); };
  const addLine = () => {
    if ($$('#rclines .rcl').length >= 50) { toast(t('rcpt_max'), true); return; }
    n += 1; const d = document.createElement('div'); d.className = 'rcl'; d.style.cssText = 'border-top:1px solid var(--rule);padding-top:8px;margin-top:8px';
    d.innerHTML = `<label for="rci${n}">${esc(t('part_name'))}</label>${stockQHtml('rcq' + n + 's')}<select id="rci${n}" class="rci">${opts()}</select>
      <button type="button" class="linkbtn small rcnew" data-rcnew aria-expanded="false">+ ${esc(t('rcn_open'))}</button><div class="rcnf" data-rcnf hidden></div><p class="small" data-rcnok role="status" aria-live="polite" hidden></p>
      <div class="grid2"><div><label for="rcq${n}">${esc(t('qty'))}</label><input id="rcq${n}" class="rcq" inputmode="decimal"></div><div><label for="rcp${n}">${esc(t('price_net'))}</label><input id="rcp${n}" class="rcp" inputmode="decimal"></div></div>
      <div class="small rclast" data-rclast style="margin:4px 0 8px"></div>
      <button type="button" class="btn secondary rcdel">${esc(t('rcpt_remove'))}</button>`;
    $('#rclines').append(d);
    stockPick($('.stockq', d), $('select', d), siteItems, '<option value="">–</option>', () => $('.rcq', d)); rcQVis(d);
    $('select', d).onchange = () => { sum(); rcLast(d); if (!$('select', d).value) $('[data-rcnok]', d).hidden = true; }; $('.rcp', d).oninput = () => rcLast(d); $('.rcnew', d).onclick = () => rcNew(d);

    const qi = $('.stockq', d); const qin = qi.oninput; qi.oninput = () => { qin(); const none = !!qi.value.trim() && !$('select', d).value && !siteItems().some((i) => stockHit(i, qi.value.trim())); $('.rcnew', d).style.fontWeight = none ? '700' : ''; if (none) $('.rcnew', d).setAttribute('data-rcnhot', ''); else $('.rcnew', d).removeAttribute('data-rcnhot'); };
    $('.rcdel', d).onclick = () => { d.remove(); if (!$$('#rclines .rcl').length) addLine(); sum(); };



    const rq = $('.rcq', d); const rp = $('.rcp', d);
    const fwd = (s) => rcScanNext(d, s.code);
    const rqS = scanGuard(rq, siteItems, fwd); const rpS = scanGuard(rp, siteItems, fwd); d._scan = () => rqS() || rpS();
    rq.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); rp.focus(); try { rp.select(); } catch {   } } });
    rp.addEventListener('keydown', (e) => { if (e.key !== 'Enter' || e.isComposing) return; e.preventDefault(); if (!$('select', d).value || !rq.value.trim()) { (!$('select', d).value ? $('select', d) : rq).focus(); return; } rcFocus(rcFree(d)); });
    sum();
  };

  const rcFree = (d) => { const all = $$('#rclines .rcl'); const nx = all.slice(all.indexOf(d) + 1).find((r) => !$('select', r).value && !$('.rcq', r).value.trim()); if (nx) return nx; addLine(); const l = $$('#rclines .rcl'); return l[l.length - 1]; };
  const rcFocus = (r) => { const q = $('.stockq', r); const el = q && !q.hidden ? q : $('select', r); el.focus(); try { el.select(); } catch {   } return q; };

  const rcScanNext = (d, code) => { const q0 = $('.stockq', d); if (q0 && q0.hidden && !siteItems().some((i) => stockHit(i, code))) return false;
    const r = rcFree(d); const q = rcFocus(r); if (!q) return false; q.value = code; q.oninput(); q.onkeydown({ key: 'Enter', isComposing: false, preventDefault() {} }); return true; };


  const supList = () => { const seen = new Map(); items.filter((i) => i.site === site() && i.last_supplier).forEach((i) => { const k = supKey(i.last_supplier); if (!seen.has(k)) seen.set(k, i.last_supplier); });
    $('#rcsupl').innerHTML = [...seen.values()].sort((x, y) => x.localeCompare(y, 'de')).map((v) => `<option value="${esc(v)}">`).join(''); };
  supList();
  addLine();
  $('#rcadd').onclick = () => addLine();
  $('#rcsup').oninput = () => $$('#rclines .rcl').forEach(rcLast);
  if ($('#rcsite')) $('#rcsite').onchange = () => { $$('#rclines [data-rcnf]').forEach((f) => { f.hidden = true; f.innerHTML = ''; }); $$('#rclines [data-rcnok]').forEach((x) => { x.hidden = true; }); $$('#rclines .rci').forEach((x) => { x.innerHTML = opts(); }); $$('#rclines .rcl').forEach(rcQVis); $$('#rclines .rcl').forEach(rcLast); supList(); sum(); };
  $('#rcf').onsubmit = async (e) => {
    e.preventDefault();
    for (const r of $$('#rclines .rcl')) if (r._scan && r._scan()) return;
    const rows = $$('#rclines .rcl').filter((r) => $('select', r).value || $('.rcq', r).value.trim());
    if (!rows.length) { toast(t('rcpt_need_line'), true); return; }
    for (const r of rows) {
      if (!$('select', r).value) { toast(t('rcpt_need_item'), true); markInvalid($('select', r), t('rcpt_need_item')); $('select', r).focus(); return; }
      if (!$('.rcq', r).value.trim()) { toast(t('rcpt_need_qty'), true); markInvalid($('.rcq', r), t('rcpt_need_qty')); $('.rcq', r).focus(); return; }
    }
    const ids = rows.map((r) => $('select', r).value);
    if (new Set(ids).size !== ids.length) { toast(t('rcpt_twice'), true); return; }
    const body = { site: site(), supplier: $('#rcsup').value.trim() || null, document_ref: $('#rcdoc').value.trim() || null, note: $('#rcnote').value.trim() || null, request_key: key,
      lines: rows.map((r) => ({ item_id: $('select', r).value, qty: $('.rcq', r).value.trim(), unit_price_net: $('.rcp', r).value.trim() || null })) };
    try {


      const res = await api('POST', '/api/stock/receipt', body, { timeoutMs: SEND_TIMEOUT_MS });
      key = uid().replace(/[^\w-]/g, '');
      toast('✓');
      const names = new Map(items.map((i) => [i.id, i]));
      $('#rcres').innerHTML = `<section class="panel ok" id="rcdone"><p><b>${esc(t('rcpt_done').replace('{n}', res.lines))}</b>${body.document_ref ? ' · ' + esc(body.document_ref) : ''}</p>${res.items ? `<ul>${res.items.map((x) => `<li><a href="#/stock/${esc(x.id)}">${esc(x.name)}</a>: +${fmtNum(x.qty)} ${esc(unitL((names.get(x.id) || {}).unit || 'Stk'))} · ${esc(t('on_hand'))} ${fmtNum(x.on_hand)}${x.order_rest ? ` <span class="chip mittel" data-rcrest>${esc(t('rcpt_order_rest').replace('{q}', fmtNum(x.order_rest)).replace('{u}', unitL((names.get(x.id) || {}).unit || 'Stk')))}</span>` : ''}</li>`).join('')}</ul>` : ''}</section>`;
      $('#rclines').innerHTML = ''; $('#rcsup').value = ''; $('#rcdoc').value = ''; $('#rcnote').value = ''; addLine();
      if (!res.duplicate) rcptWaiting(body.site, body.supplier, (res.items || []).map((x) => names.get(x.id) || x));
    } catch (err) { toast(err.message, true); }
  };
}



async function rcptWaiting(site, supplier, got) {

  let cs; try { cs = (await api('GET', `/api/cases?status=wartet_teile&ws=${encodeURIComponent(site)}&limit=500`)).cases; } catch { return; }
  const box = $('#rcres'); if (!box || !$('#rcdone')) return;
  const w = cs.filter((c) => c.status === 'wartet_teile' && c.workshop_site === site);
  if (!w.length) return;
  const low = (x) => String(x || '').toLowerCase(); const pn = (x) => low(x).replace(/[^a-z0-9]/g, '');
  const keys = [...(supplier && supplier.trim().length >= 3 ? [{ k: low(supplier.trim()) }] : []), ...got.flatMap((i) => [...(i.name && i.name.trim().length >= 4 ? [{ k: low(i.name.trim()) }] : []), ...(pn(i.part_number).length >= 4 ? [{ p: pn(i.part_number) }] : [])])];
  const hit = (c) => { const n = low(c.parts_wait_note); const np = pn(c.parts_wait_note); return !!n && keys.some((x) => (x.k ? n.includes(x.k) : np.includes(x.p))); };
  const rows = w.map((c) => ({ c, m: hit(c), d: partsWaitDays(c) })).sort((a, b) => (b.m - a.m) || ((b.d || 0) - (a.d || 0)));
  box.insertAdjacentHTML('beforeend', `<section class="panel" id="rcwait"><h3>${esc(t('rcw_title'))} <span class="chip">${rows.length}</span></h3><p class="small muted">${esc(t('rcw_hint').replace('{a}', t('act_resume_repair')).replace('{b}', t('act_parts_partial')))}</p>
    <ul>${rows.map(({ c, m, d }) => `<li${m ? ' data-rcwhit' : ''}><a href="#/cases/${esc(c.id)}">${esc(c.case_no)} · ${esc(c.plate)}</a>${m ? ` <span class="chip mittel">${esc(t('rcw_match'))}</span>` : ''}<div class="small">${c.parts_wait_note ? `${esc(t('parts_wait_for'))}: ${ltxt(clipTxt(c.parts_wait_note, 120))}` : `<span class="muted">${esc(t('rcw_no_note'))}</span>`}${d ? ` · ${esc(t('parts_wait_days').replace('{d}', nDays(d)))}` : ''}${partsEta(c)}</div></li>`).join('')}</ul></section>`);
}


async function viewPartsUsage() {
  if (!['owner', 'fleet', 'workshop'].includes(S.me.role)) return render(`<p>${esc(t('err_forbidden'))}</p>`);
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k) || ''; sessionStorage.setItem(k, v); } catch { return ''; } return ''; };
  const q = ss('cfp_pu_q'); const from = ss('cfp_pu_from'); const to = ss('cfp_pu_to'); const today = bDate();
  const qs = `q=${encodeURIComponent(q)}${from ? '&from=' + encodeURIComponent(from) : ''}${to ? '&to=' + encodeURIComponent(to) : ''}`;
  let rep = null;
  if (q.trim().length >= 3) { try { rep = await api('GET', '/api/parts/usage?' + qs); } catch (err) { toast(err.message, true); rep = null; } }



  const rcVeh = rep && isMgr() ? rep.vehicles.filter((v) => v.active) : [];
  const rcOff = rep && isMgr() ? rep.vehicles.length - rcVeh.length : 0;
  const rcPanel = () => (!rcVeh.length ? '' : `<details class="panel noprint" id="purc"><summary>${esc(t('ptu_rc_title'))}</summary><p class="small muted">${esc(t('ptu_rc_hint'))}</p>
    <form id="purcf" novalidate><label for="purcref">${esc(t('ptu_rc_ref'))}</label><input id="purcref" maxlength="120" required autocomplete="off">
      <label for="purcnote">${esc(t('note'))}</label><input id="purcnote" maxlength="120" placeholder="${esc(t('ptu_rc_note_ph'))}">
      <label for="purcdue">${esc(t('ptu_rc_due'))}</label><input type="date" id="purcdue" style="max-width:200px">
      <p class="small" style="margin:12px 0 6px"><b>${esc(t('ptu_rc_vehicles'))}</b></p><div class="vehpick multi" id="purcpick">${rcVeh.map((v) => `<label><input type="checkbox" name="purcveh" value="${esc(v.vehicle_id)}" data-plate="${esc(v.plate)}"${v.eval_excluded ? ' data-purcdorm' : ' checked'}>${plate(v.plate)}${v.eval_excluded ? `<span class="small muted">${esc(t('eval_excluded'))} – ${esc(t('ptu_rc_dormant_hint'))}</span>` : ''}</label>`).join('')}</div>
      ${rcOff ? `<p class="small muted" id="purcoff">${esc(t('ptu_rc_off').replace('{n}', rcOff))}</p>` : ''}
      <div class="actions"><button class="btn secondary" id="purcprev">${esc(t('preview'))}</button></div></form><div id="purcres" role="status" aria-live="polite"></div></details>`);

  const stockPanel = () => (!rep || !rep.stock || !rep.stock.length ? '' : `<section class="panel warn" id="pustock"><h3>${esc(t('ptu_stock_title'))}</h3><p class="small">${esc(t('ptu_stock_hint'))}</p>
    <ul>${rep.stock.map((i) => `<li><a href="#/stock/${esc(i.id)}">${esc(i.name)}</a>${i.part_number ? ` <span class="small muted pn">${esc(i.part_number)}</span>` : ''} · <b>${fmtNum(i.on_hand)} ${esc(unitL(i.unit))}</b> · ${esc(wsName(i.site))}${i.location ? ' · ' + esc(i.location) : ''}${i.active ? '' : ` <span class="chip">${esc(t('item_inactive_badge'))}</span>`}</li>`).join('')}</ul>${rep.stock_truncated ? `<p class="small muted">${esc(t('ptu_stock_more'))}</p>` : ''}</section>`);
  const vChip = (i) => (!i.vehicle_active ? ` <span class="chip" data-puinact>${esc(t('inactive_vehicles'))}</span>` : i.eval_excluded ? ` <span class="chip" data-pudorm>${esc(t('eval_excluded'))}</span>` : '');
  if (!onPage('#/stock/usage')) return;
  render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('ptu_title'))}</h1>
    <p class="small muted">${esc(t(S.me.role === 'workshop' ? 'ptu_hint_ws' : 'ptu_hint'))}</p>
    <p class="print-only small">${printStamp()} · ${esc(t('ptu_q'))}: ${esc(q)}${from || to ? ` · ${esc(from ? fmtD(from) : '…')} – ${esc(to ? fmtD(to) : '…')}` : ''}${S.me.role === 'workshop' ? ' · ' + esc(wsName(S.me.workshop_site)) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <form id="puf" class="panel noprint"><label for="puq">${esc(t('ptu_q'))}</label><input id="puq" value="${esc(q)}" minlength="3" maxlength="80" required autocomplete="off" placeholder="${esc(t('ptu_q_ph'))}">
      <div class="grid2"><div><label for="pufrom">${esc(t('ptu_from'))}</label><input type="date" id="pufrom" value="${esc(from)}" max="${esc(today)}"></div><div><label for="puto">${esc(t('to'))}</label><input type="date" id="puto" value="${esc(to)}" max="${esc(today)}"></div></div>
      <div class="actions"><button class="btn">${esc(t('show'))}</button><button type="button" class="btn secondary" id="pucsv"${rep && rep.items.length ? '' : ' disabled'}>${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="puprt"${rep && rep.items.length ? '' : ' disabled'}>${esc(t('print'))}</button></div></form>
    ${rep && rep.truncated ? `<p class="panel warn">${esc(t('ptu_truncated').replaceAll('{n}', rep.max))}</p>` : ''}
    ${rep && rep.items.length ? `<p id="pusum"><b>${esc(t('ptu_sum').replace('{n}', rep.items.length).replace('{v}', rep.vehicles.length))}</b></p><p class="small muted">${esc(t('ptu_removed_hint'))}</p>
      <div class="scroll"><table class="stack printsm" id="putab"><thead><tr><th>${esc(t('vehicle'))}</th><th>${esc(t('ptu_installed'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('qty'))}</th><th>${esc(t('supplier'))}</th><th>${esc(t('doc_ref'))}</th><th>${esc(t('ptu_case'))}</th></tr></thead><tbody>
      ${rep.items.map((i) => `<tr><td><a href="#/vehicles/${encodeURIComponent(i.vehicle_id)}">${esc(i.plate)}</a>${vChip(i)}${i.vehicle_site ? `<div class="small muted">${esc(i.vehicle_site)}</div>` : ''}</td><td>${esc(fmtD(i.date))}</td><td>${esc(i.name)}${i.part_number ? `<div class="small muted pn">${esc(i.part_number)}</div>` : ''}${i.warranty_until ? `<div class="small">${esc(t('warranty_until_d').replace('{d}', fmtD(i.warranty_until)))}</div>` : ''}${i.from_stock ? `<div class="small muted">${esc(t('from_stock'))}</div>` : ''}</td><td>${fmtNum(i.quantity)} ${esc(unitL(i.unit))}</td><td>${esc(supplierLabel(i.supplier) || '–')}</td><td>${esc(i.document_ref || '–')}</td><td><a href="#/cases/${esc(i.case_id)}" translate="no">${esc(i.case_no)}</a><div class="small muted">${esc(t('st_' + i.case_status))}${i.workshop_site ? ' · ' + esc(wsName(i.workshop_site)) : ''}</div></td></tr>`).join('')}
      </tbody></table></div>${rcPanel()}` : rep ? `<p class="muted" id="punone">${esc(t('ptu_none'))}</p>` : ''}${stockPanel()}`, 'more');
  $('#puf').onsubmit = (e) => { e.preventDefault(); ss('cfp_pu_q', $('#puq').value.trim()); ss('cfp_pu_from', $('#pufrom').value); ss('cfp_pu_to', $('#puto').value); viewPartsUsage(); };
  $('#puprt').onclick = () => window.print();
  if ($('#purcf')) {
    const q2 = (x) => `"${String(x).replace(/"/g, '""')}"`;

    const csvOf = () => ['Kennzeichen;FIN;Referenz;Frist;Bemerkung', ...$$('input[name=purcveh]').filter((x) => x.checked).map((x) => [x.dataset.plate, x.value.startsWith('VIN:') ? x.value.slice(4) : '', $('#purcref').value.trim(), $('#purcdue').value, $('#purcnote').value.trim()].map(q2).join(';'))].join('\r\n');
    const act = (a) => (a === 'erledigt' ? t('ms_erledigt') : t('ia_' + a));
    const show = (r, applied, text) => {
      const box = $('#purcres');
      box.innerHTML = `<p><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(t('ia_neu'))}: ${r.created} · ${esc(t('ia_aktualisiert'))}: ${r.updated} · ${esc(t('ia_unverändert'))}: ${r.unchanged} · ${esc(t('skipped'))}: ${r.skipped.length}</p>
        ${r.rows.length ? `<div class="scroll"><table class="stack" id="purctab"><thead><tr><th>${esc(t('vehicle'))}</th><th>${esc(t('recall_ref'))}</th><th>${esc(t('next_due'))}</th><th></th></tr></thead><tbody>${r.rows.map((x) => `<tr><td style="white-space:nowrap">${esc(x.plate)}</td><td>${esc(x.reference)}${x.note ? `<br><span class="small muted">${esc(reasonText(x.note))}</span>` : ''}</td><td>${x.action === 'erledigt' ? `${esc(t('done_on'))} ${fmtD(x.done_on)}` : x.next_due_date ? fmtD(x.next_due_date) : esc(t('vi_recall_open'))}</td><td><span class="chip ${x.action === 'neu' ? 'ok' : x.action === 'aktualisiert' ? 'mittel' : ''}">${esc(act(x.action))}</span></td></tr>`).join('')}</tbody></table></div>` : ''}
        ${r.skipped.length ? `<ul class="small">${r.skipped.map((x) => `<li>${x.plate ? esc(x.plate) + ': ' : ''}${esc(reasonText(x.reason))}</li>`).join('')}</ul>` : ''}
        ${applied ? `<p class="small"><a href="#/maintenance">${esc(t('ptu_rc_done_link'))}</a></p>` : r.created || r.updated ? `<div class="actions"><button type="button" class="btn" id="purcapply">${esc(t('apply_import'))}</button></div>` : ''}`;
      const ap = $('#purcapply');
      if (ap) ap.onclick = async () => { ap.disabled = true; try { const done = await api('POST', '/api/maintenance/recalls/import', text, { headers: { 'content-type': 'text/csv' } }); toast('✓'); show(done, true, text); } catch (err) { ap.disabled = false; toast(err.message, true); } };
    };
    $('#purcf').onsubmit = async (e) => {
      e.preventDefault();
      if (!$('#purcref').value.trim()) { toast(t('ptu_rc_need_ref'), true); markInvalid($('#purcref'), t('ptu_rc_need_ref')); $('#purcref').focus(); return; }
      if (!$$('input[name=purcveh]').some((x) => x.checked)) { toast(t('mc_need_one'), true); markInvalid($('#purcpick'), t('mc_need_one')); return; }
      const text = csvOf();
      try { show(await api('POST', '/api/maintenance/recalls/import?dry_run=1', text, { headers: { 'content-type': 'text/csv' } }), false, text); } catch (err) { toast(err.message, true); }
    };
  }
  $('#pucsv').onclick = async () => { try { downloadChecked(await api('GET', '/api/parts/usage?format=csv&' + qs), `fuhrpark-teileverwendung_${envFn()}_${q.replace(/[^\w-]/g, '').slice(0, 40) || 'suche'}${from ? '_' + from : ''}${to ? '_' + to : ''}.csv`); } catch (err) { toast(err.message, true); } };
}


const otherStockLine = (l, unit) => l.map((o) => `<a href="#/stock/${esc(o.item_id)}">${esc(wsName(o.site))}</a>: <b>${fmtNum(o.on_hand)} ${esc(unitL(unit))}</b>${o.min_qty !== null && o.min_qty !== undefined ? ` <span class="muted">(${esc(t('min_qty'))} ${fmtNum(o.min_qty)})</span>` : ''}`).join('<br>');
const otherStockP = (l, unit) => (l && l.length ? `<section class="panel noprint" id="otherstock"><h3 style="margin-top:0">📦 ${esc(t('other_stock'))}</h3><p>${otherStockLine(l, unit)}</p><p class="small muted">${esc(t('other_stock_hint'))}</p></section>` : '');
async function viewStockItem(id) {
  const d = await api('GET', '/api/stock/' + id);
  const it = d.item;
  const others = (S.meta.workshops || []).filter((w) => w.code !== it.site);
  if (!onPage('#/stock/' + id, '#/stock/' + it.id)) return;
  render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(it.name)}${it.active ? '' : ` <span class="chip" id="itinact">${esc(t('item_inactive_badge'))}</span>`}</h1>${printHead([`${t('workshop')}: ${wsName(it.site)}`, it.part_number ? `${t('part_number')}: ${it.part_number}` : ''])}
    <section class="panel"><dl class="kv"><dt>${esc(t('on_hand'))}</dt><dd><b style="font-size:1.4rem">${fmtNum(it.on_hand)} ${esc(unitL(it.unit))}</b></dd><dt>${esc(t('part_number'))}</dt><dd>${esc(it.part_number || '–')}</dd><dt>${esc(t('workshop'))}</dt><dd>${esc(wsName(it.site))}</dd><dt>${esc(t('storage'))}</dt><dd>${esc(it.location || '–')}</dd><dt>${esc(t('min_qty'))}</dt><dd>${it.min_qty === null || it.min_qty === undefined ? '–' : fmtNum(it.min_qty)}</dd><dt>${esc(t('stock_price_per').replace('{u}', unitL(it.unit)))}</dt><dd>${it.unit_price_net === null || it.unit_price_net === undefined ? esc(t('unvalued')) : eur3(it.unit_price_net)}</dd><dt>${esc(t('last_counted'))}</dt><dd id="lcnt">${it.last_counted_at ? `${esc(fmtD(it.last_counted_at))} · ${fmtNum(it.last_counted_qty)} ${esc(unitL(it.unit))}` : esc(t('never_counted'))}</dd></dl></section>
    ${otherStockP(d.other_stock, it.unit)}
    <form id="mf" class="panel"${it.active ? '' : ' hidden'}><h3>${esc(t('book'))}</h3><label>${esc(t('kind'))}</label><select name="type"><option value="zugang">${esc(t('mv_zugang'))}</option><option value="entnahme">${esc(t('mv_entnahme'))}</option><option value="korrektur">${esc(t('mv_korrektur'))}</option></select>
      <label>${esc(t('qty'))}</label><input name="qty" inputmode="decimal" required><div id="mfprice"><label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"></div>${it.unit_price_net !== null && it.unit_price_net !== undefined ? `<p class="small muted" id="mfpricehint" hidden>${esc(t('stock_out_price_hint'))}</p>` : ''}<label>${esc(t('supplier'))}</label><input name="supplier" maxlength="120"><label>${esc(t('doc_ref'))}</label><input name="document_ref" maxlength="200"><label>${esc(t('note'))}</label><input name="note" maxlength="500">
      <div class="actions"><button class="btn">${esc(t('book'))}</button></div></form>
    ${!it.active && it.on_hand !== 0 ? `<form id="wof" class="panel noprint"><h3>${esc(t('item_writeoff'))}</h3><p class="small">${esc(t('item_writeoff_hint').replace('{q}', fmtNum(it.on_hand)).replace('{u}', unitL(it.unit)))}</p><label for="wof_note">${esc(t('item_writeoff_reason'))}</label><input id="wof_note" name="note" required maxlength="500"><div class="actions"><button class="btn">${esc(t('item_writeoff'))}</button></div></form>` : ''}
    <details class="panel noprint" id="itedp"><summary>${esc(t('item_edit'))}</summary><form id="itedf">
      <label for="ie_name">${esc(t('part_name'))}</label><input id="ie_name" name="name" required maxlength="200" value="${esc(it.name)}">
      <label for="ie_pn">${esc(t('part_number'))}</label><input id="ie_pn" name="part_number" maxlength="80" value="${esc(it.part_number || '')}">
      <label for="ie_min">${esc(t('min_qty'))} (${esc(unitL(it.unit))})</label><input id="ie_min" name="min_qty" inputmode="decimal" value="${it.min_qty === null || it.min_qty === undefined ? '' : esc(decIn(it.min_qty))}">
      <label for="ie_loc">${esc(t('storage'))}</label><input id="ie_loc" name="location" maxlength="80" value="${esc(it.location || '')}">
      <label for="ie_price">${esc(t('price_net'))}</label><input id="ie_price" name="unit_price_net" inputmode="decimal" value="${it.unit_price_net === null || it.unit_price_net === undefined ? '' : esc(decIn(it.unit_price_net))}">
      <label class="check"><input type="checkbox" name="active" id="ie_act" ${it.active ? 'checked' : ''}> ${esc(t('item_active'))}</label>
      <p class="small muted">${esc(t('item_edit_hint'))}</p>
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    ${it.ordered_on ? `<section class="panel" id="ordp"><h3>${esc(t('ordered'))}</h3><p>${esc(t('ordered_line').replace('{q}', fmtNum(it.ordered_qty)).replace('{u}', unitL(it.unit)).replace('{d}', fmtD(it.ordered_on)))}${it.ordered_eta ? ` · ${esc(t('ordered_eta'))}: ${esc(fmtD(it.ordered_eta))}` : ''}${it.ordered_note ? ` · ${esc(it.ordered_note)}` : ''}</p>
      <p class="small muted">${esc(t('ordered_hint'))}</p><div class="actions"><button type="button" class="btn secondary" id="ordclr">${esc(t('ordered_clear'))}</button></div></section>`
    : it.active ? `<details class="panel" id="ordp"><summary>${esc(t('order_mark'))}</summary><form id="of"><p class="small muted">${esc(t('ordered_hint'))}</p>
      <label for="oqty">${esc(t('qty'))}</label><input id="oqty" name="qty" inputmode="decimal" required><label for="oeta">${esc(t('ordered_eta'))}</label><input id="oeta" name="eta" type="date">
      <label for="onote">${esc(t('note'))}</label><input id="onote" name="note" maxlength="200"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}
    ${others.length && it.active && it.on_hand > 0 ? `<details class="panel" id="trp"><summary>${esc(t('transfer'))}</summary><form id="tf"><p class="small muted">${esc(t('transfer_hint'))}</p>
      <label for="tsite">${esc(t('transfer_to'))}</label><select id="tsite" name="to_site" required>${others.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>
      <label for="tqty">${esc(t('qty'))} (${esc(t('on_hand'))} ${fmtNum(it.on_hand)} ${esc(unitL(it.unit))})</label><input id="tqty" name="qty" inputmode="decimal" required><label for="tnote">${esc(t('note'))}</label><input id="tnote" name="note" maxlength="300">
      <div class="actions"><button class="btn">${esc(t('transfer'))}</button></div></form></details>` : ''}
    <h2>${esc(t('history'))}</h2>${d.movements_truncated ? `<p class="panel warn small" id="histtrunc">${esc(t('item_history_truncated').replaceAll('{n}', d.movements_max))}</p>` : ''}<p class="noprint"><button type="button" class="btn secondary" id="histjournal">${esc(t('item_in_journal'))}</button> <button type="button" class="btn secondary" id="itemprt">${esc(t('print'))}</button> <button type="button" class="btn secondary" id="itempu">${esc(t('ptu_item_btn'))}</button></p><div class="scroll"><table class="stack"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('kind'))}</th><th>${esc(t('qty'))}</th><th>${esc(t('note'))}</th></tr></thead><tbody>${d.movements.map((m) => `<tr><td class="small">${fmtDT(m.created_at)}</td><td>${m.transfer_id ? `${esc(t('mv_umlagerung'))} ${m.qty < 0 ? '→' : '←'} ${esc(wsName(m.transfer_site))}` : esc(t('mv_' + m.type))}</td><td><b>${m.qty > 0 ? '+' : ''}${fmtNum(m.qty)}</b></td><td class="small">${m.case_no ? `<a href="#/cases/${esc(m.case_id)}" translate="no">${esc(m.case_no)}</a> · ` : ''}${esc(m.supplier || '')} ${m.document_ref && !(m.note || '').startsWith(m.document_ref) ? esc(stNote(m.document_ref)) : ''} ${esc(stNote(m.note || ''))}<br>${esc(m.user_name)}</td></tr>`).join('')}</tbody></table></div>`, 'more');

  $('#itemprt').onclick = () => window.print();

  $('#itempu').onclick = () => { try { sessionStorage.setItem('cfp_pu_q', it.part_number || it.name); sessionStorage.setItem('cfp_pu_from', ''); sessionStorage.setItem('cfp_pu_to', ''); } catch {   } location.hash = '#/stock/usage'; };

  $('#histjournal').onclick = () => { try { const today = bDate(); const f = bDate(-365);
    sessionStorage.setItem('cfp_sj_item', id); sessionStorage.setItem('cfp_sj_from', f); sessionStorage.setItem('cfp_sj_to', today); sessionStorage.setItem('cfp_sj_type', ''); sessionStorage.setItem('cfp_sj_site', ''); } catch {   } location.hash = '#/stock/journal'; };

  const mfType = $('#mf [name=type]'); const mfSync = () => { const fixed = mfType.value !== 'zugang' && !!$('#mfpricehint');   $('#mfprice').hidden = fixed; $('#mf [name=unit_price_net]').disabled = fixed; if ($('#mfpricehint')) $('#mfpricehint').hidden = !fixed; };
  mfType.onchange = mfSync; mfSync();

  if ($('#wof')) $('#wof').onsubmit = async (e) => { e.preventDefault(); if (!confirm(t('item_writeoff_confirm').replace('{q}', fmtNum(it.on_hand)).replace('{u}', unitL(it.unit)))) return;
    const b = { type: 'korrektur', qty: String(-it.on_hand), note: e.target.elements.namedItem('note').value.trim() }; b.request_key = rkFor(e.target, b);
    try { await api('POST', `/api/stock/${id}/movements`, b, { timeoutMs: SEND_TIMEOUT_MS }); viewStockItem(id); } catch (err) { toast(err.message, true); } };

  const mfScan = scanGuard($('#mf [name=qty]'), [it]); const ofScan = scanGuard($('#oqty'), [it]); const tfScan = scanGuard($('#tqty'), [it]);
  $('#mf').onsubmit = async (e) => { e.preventDefault(); if (mfScan()) return; const b = Object.fromEntries(new FormData(e.target)); for (const k of Object.keys(b)) { if (b[k] === '') delete b[k]; else if (['qty', 'unit_price_net'].includes(k)) b[k] = b[k].trim(); } b.request_key = rkFor(e.target, b); try { await api('POST', `/api/stock/${id}/movements`, b, { timeoutMs: SEND_TIMEOUT_MS }); viewStockItem(id); } catch (err) { toast(err.message, true); } };



  if (S.stockLost && S.stockLost.id === id) {
    const L = S.stockLost; S.stockLost = null; const f = $('#' + L.form); const dp = f && f.closest('details');

    if (f && L.mine) conflictKeep(f, L, 'stlost-' + L.form);
    else if (f) { for (const [k, v] of Object.entries(L.v)) { const el = f.elements.namedItem(k); if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; } if (dp) dp.open = true;
      f.insertAdjacentHTML('afterbegin', `<div class="panel warn small" role="status" data-stocklost>${esc(t('case_conflict_kept'))}</div>`); dp && dp.scrollIntoView({ block: 'center' }); }
  }
  const stockConflict = (err, form, v, codes) => { if (!codes.includes(err.code)) return false; S.stockLost = { id, form, v }; viewStockItem(id); return true; };

  $('#itedf').onsubmit = async (e) => { e.preventDefault(); const g = (k) => e.target.elements.namedItem(k);
    const b = { name: g('name').value, part_number: g('part_number').value, min_qty: g('min_qty').value, location: g('location').value, unit_price_net: g('unit_price_net').value, active: g('active').checked };
    if (it.active && !b.active && it.on_hand !== 0 && !confirm(t('item_inactive_onhand').replace('{q}', fmtNum(it.on_hand)).replace('{u}', unitL(it.unit)))) return;

    const nv = (x) => (x === null || x === undefined ? '' : decIn(x));
    const was = { name: it.name, part_number: it.part_number || '', min_qty: nv(it.min_qty), location: it.location || '', unit_price_net: nv(it.unit_price_net), active: !!it.active };
    for (const k of Object.keys(b)) if (b[k] === was[k]) delete b[k];
    if (!Object.keys(b).length) { toast(t('item_unchanged')); return; }
    if (it.updated_at) b.expected_updated_at = it.updated_at;
    try { const r = await api('PATCH', `/api/stock/${id}`, b, { timeoutMs: SEND_TIMEOUT_MS });   toast(r.changed && r.changed.length ? '✓' : t('item_unchanged')); viewStockItem(id); } catch (err) { if (err.code === 'version_conflict') { S.stockLost = { id, form: 'itedf', ...conflictMine(e.target) }; viewStockItem(id); return; } toast(err.message, true); } };
  if ($('#of')) $('#of').onsubmit = async (e) => { e.preventDefault(); if (ofScan()) return; const b = Object.fromEntries(new FormData(e.target)); b.qty = String(b.qty).trim(); for (const k of ['eta', 'note']) if (!b[k]) delete b[k];
    const ofm = e.target; try { await api('PUT', `/api/stock/${id}/order`, b, { timeoutMs: SEND_TIMEOUT_MS }); viewStockItem(id); } catch (err) { if (lostDup(ofm, b, err, ['stock_order_exists'])) { toast(t('saved_before')); viewStockItem(id); return; } lostMark(ofm, b, err);   if (!stockConflict(err, 'of', b, ['order_changed', 'stock_order_exists'])) toast(err.message, true); } };
  if ($('#ordclr')) $('#ordclr').onclick = async () => { try { await api('DELETE', `/api/stock/${id}/order?expected=${encodeURIComponent((it.ordered_on || '') + '|' + (it.ordered_by || ''))}`, undefined, { timeoutMs: SEND_TIMEOUT_MS });   viewStockItem(id); } catch (err) { if (['order_changed', 'stock_order_exists'].includes(err.code)) { toast(err.message, true); viewStockItem(id); } else toast(err.message, true); } };
  if ($('#tf')) $('#tf').onsubmit = async (e) => { e.preventDefault(); if (tfScan()) return; const b = Object.fromEntries(new FormData(e.target)); b.qty = String(b.qty).trim(); if (!b.note) delete b.note; b.request_key = rkFor(e.target, b);
    try { const r = await api('POST', `/api/stock/${id}/transfer`, b, { timeoutMs: SEND_TIMEOUT_MS }); toast(t('transfer_done').replace('{q}', fmtNum(r.qty)).replace('{u}', unitL(it.unit)).replace('{w}', wsName(b.to_site)) + (r.target_created ? ' · ' + t('transfer_created') : '')); viewStockItem(id); } catch (err) { toast(err.message, true); } };
}

export { loadStockSelect, viewPartsUsage, viewReorder, viewStock, viewStockAsOf, viewStockCount, viewStockItem, viewStockJournal, viewStockReceipt };
