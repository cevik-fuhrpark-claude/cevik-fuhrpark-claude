// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { $, $$, S, api, bDate, clipTxt, decIn, download, downloadChecked, envFn, esc, eur, eur3, fmtD, fmtDT, fmtHM, fmtNum, helpLink, helpNorm, isMgr, ltxt, markInvalid, nDays, noneP, partsEta, partsWaitDays, plate, printHead, printStamp, rc2, readCsvFile, reasonText, render, stockNoteText, t, tn, toast, uid, unitL, wsLabel, wsName } from './app-main.js';

// Anfrageschlüssel je Formularinhalt: gleicher Inhalt (Wiederholung nach verlorener Antwort) = gleicher Schlüssel, geänderter Inhalt = neue Buchung
// (21.10.2026: Lager – nach „Keine Verbindung“ korrigierte Buchung wurde als Wiederholung still verworfen)
const rkFor = (form, b) => { const sig = JSON.stringify(b); if (!form.dataset.rk || form.dataset.rkSig !== sig) { form.dataset.rk = crypto.randomUUID(); form.dataset.rkSig = sig; } return form.dataset.rk; };
// Lager-Buchungstexte in der Oberflächensprache (Standortcode → Name, Zahl/Datum im Sprachformat)
const stNote = (x) => stockNoteText(x, S.lang, { site: wsName, num: (n) => fmtNum(n), date: fmtD, unit: unitL });
async function viewStock() {
  try { sessionStorage.removeItem('cfp_sj_item'); } catch { /* egal */ } // Artikelfilter des Journals gilt nur für den Weg aus der Artikelakte
  const stockResp = await api('GET', '/api/stock'); const items = stockResp.items; const lastInv = stockResp.last_inventory || {};
  // Zahl am „Bestellvorschlag“: nur Artikel mit noch offener Fehlmenge (voll bestellte nicht – wie der Agent, 19.10.2026)
  const nReorder = items.filter((i) => i.below_min && !(i.ordered_on && i.min_qty - i.on_hand - (i.ordered_qty || 0) <= 1e-9)).length;
  const sites = S.me.role === 'workshop' ? S.meta.workshops.filter((w) => w.code === S.me.workshop_site) : S.meta.workshops;
  // Ausdruck der Lagerliste: genau die angezeigten Artikel (Suche/Filter) samt Lagerwert-Zeile; Auswahl im Vermerk (#sprsel)
  render(`<h1>${esc(t('stock'))}</h1>${printHead([S.me.role === 'workshop' ? `${t('workshop')}: ${wsName(S.me.workshop_site)}` : ''])}<p class="print-only small" id="sprsel"></p>${helpLink('stock')}
    <details class="panel noprint"><summary>${esc(t('new_item'))}</summary><form id="nf">
      ${sites.length > 1 ? `<label>${esc(t('workshop'))}</label><select name="site">${sites.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>` : ''}
      <label>${esc(t('part_name'))}</label><input name="name" required><label>${esc(t('part_number'))}</label><input name="part_number">
      <label>${esc(t('unit'))}</label><input name="unit" value="${esc(unitL('Stk'))}" maxlength="20"><label>${esc(t('initial_qty'))}</label><input name="initial_qty" inputmode="decimal">
      <label>${esc(t('min_qty'))}</label><input name="min_qty" inputmode="decimal"><label>${esc(t('storage'))}</label><input name="location">
      <label>${esc(t('price_net'))}</label><input name="unit_price_net" inputmode="decimal"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    <details class="panel noprint" id="simp"><summary>${esc(t('stock_import'))}</summary><p class="small muted">${esc(t('stock_import_hint'))}</p>
      ${sites.length > 1 ? `<label for="simpsite">${esc(t('workshop'))}</label><select id="simpsite">${sites.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>` : ''}
      <label for="simpf">${esc(t('csv_file'))}</label><input type="file" id="simpf" accept=".csv,.txt,text/csv,text/plain"><div id="simpr"></div></details>
    <div class="actions"><button type="button" class="btn secondary" id="scsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="sprt">${esc(t('print'))}</button><a class="btn secondary" href="#/stock/receipt" id="srcpt">${esc(t('rcpt_title'))}</a><a class="btn secondary" href="#/stock/journal">${esc(t('stock_journal'))}</a><a class="btn secondary" href="#/stock/asof" id="sasof">${esc(t('asof_title'))}</a><a class="btn secondary" href="#/stock/usage" id="spu">${esc(t('ptu_title'))}</a><a class="btn secondary" href="#/stock/reorder">${esc(t('reorder'))}${nReorder ? ` <span class="chip mittel">${nReorder}</span>` : ''}</a></div>
    ${items.length ? `<details class="panel noprint" id="inv"><summary>${esc(t('inventory'))}</summary><p class="small muted">${esc(t('inventory_hint'))}</p>
      ${sites.length > 1 ? `<label for="invsite">${esc(t('workshop'))}</label><select id="invsite">${sites.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>` : ''}
      <p class="small" id="invlast"></p><p class="noprint actions"><a class="btn secondary" href="#/stock/count" id="invsheet">${esc(t('count_sheet'))}</a><a class="btn secondary" href="#/stock/journal" id="invdiffs">${esc(t('inventory_diffs'))}</a></p><div id="invdraft"></div><div id="invlist"></div><label for="invnote">${esc(t('note'))}</label><input id="invnote" maxlength="300">
      <div class="actions"><button type="button" class="btn secondary" id="invchk">${esc(t('inventory_check'))}</button><button type="button" class="btn" id="invbook" disabled>${esc(t('inventory_book'))}</button></div><div id="invres"></div></details>` : ''}
    <div class="noprint"><input id="q" placeholder="${esc(t('part_name'))} / ${esc(t('part_number'))}" aria-label="${esc(t('part_name'))} / ${esc(t('part_number'))}" style="margin-bottom:8px">
    <label for="sf">${esc(t('stock_filter'))}</label><select id="sf"><option value="">${esc(t('all'))}</option><option value="min">${esc(t('below_min'))}</option><option value="180">${esc(t('stock_idle').replace('{d}', 180))}</option><option value="365">${esc(t('stock_idle').replace('{d}', 365))}</option><option value="c365">${esc(t('count_age_n').replace('{n}', 365))}</option></select></div>
    <p class="small muted" id="sfsum" hidden></p>
    <div class="list" id="sl">${items.map((i) => `<a class="row ${i.below_min ? 'p-mittel' : ''}" href="#/stock/${esc(i.id)}" data-s="${esc(helpNorm(i.name + ' ' + (i.part_number || '')))}" data-id="${esc(i.id)}">${S.me.role === 'workshop' ? '<span></span>' : `<span class="chip">${esc(wsName(i.site))}</span>`}<span class="title" style="white-space:normal">${esc(i.name)}</span><b>${fmtNum(i.on_hand)} ${esc(unitL(i.unit))}</b><span class="sub">${[i.part_number && esc(i.part_number), i.location && esc(i.location), i.below_min && esc(t('below_min')) + ' (' + fmtNum(i.min_qty) + ')', i.unit_price_net !== null && eur3(i.unit_price_net), esc(t('last_out')) + ': ' + (i.last_out_date ? esc(fmtD(i.last_out_date)) : esc(t('never')))].filter(Boolean).join(' · ')}</span></a>`).join('') || noneP()}</div>`, 'more');
  // Filter: unter Mindestbestand bzw. „ohne Entnahme seit N Tagen“ (nur Artikel mit Bestand; nie entnommen zählt mit) bzw. „nicht gezählt seit 365 Tagen“ – nur Anzeige
  const byId = new Map(items.map((i) => [i.id, i]));
  // Zeilen einmal vorab lesen (Suchtext, Artikel) und „hidden“ nur bei Änderung setzen; Suche ab 300 Artikeln entprellt (22.10.2026:
  // vorher je Taste alle Zeilen aus dem DOM gelesen und neu gesetzt – 500 Artikel am Handy ≈ 40 ms je Taste)
  const slRows = $$('#sl a').map((a) => ({ a, s: a.dataset.s, i: byId.get(a.dataset.id) }));
  const applyStock = () => {
    const q = helpNorm($('#q').value); const f = $('#sf').value; // Umlaute/ue gleich: „bremsbelaege“ findet „Bremsbeläge“
    const cut = /^\d+$/.test(f) ? bDate(-Number(f)) : null;
    const hit = (i) => (!f || (f === 'min' ? i.below_min : f === 'c365' ? !i.last_counted_date || i.last_counted_date <= bDate(-365) : i.on_hand > 0 && (!i.last_out_date || i.last_out_date < cut)));
    const shown = [];
    for (const r of slRows) { const h = !!((q && !r.s.includes(q)) || !hit(r.i)); if (r.a.hidden !== h) r.a.hidden = h; if (!h) shown.push(r.i); }
    // Summe der angezeigten Artikel: Bestand × hinterlegter Artikelpreis (netto); Artikel mit Bestand ohne Preis = unbewertet (nie 0 €), ohne bewertbaren Artikel „–“
    const sum = $('#sfsum'); sum.hidden = !shown.length;
    const stocked = shown.filter((i) => i.on_hand > 0); const priced = stocked.filter((i) => i.unit_price_net !== null);
    const v = priced.length ? eur(rc2(priced.reduce((a, i) => a + rc2(i.on_hand * i.unit_price_net), 0))) : '–';
    const unv = stocked.length - priced.length ? ` (${stocked.length - priced.length} ${t('unvalued_short')})` : '';
    const qv = $('#q').value.trim(); const sfo = $('#sf').selectedOptions[0];
    $('#sprsel').textContent = [`${t('print_filter')}: ${f && sfo ? sfo.textContent : t('all')}`, qv ? `${t('print_search')}: „${qv}“` : ''].filter(Boolean).join(' · ');
    sum.textContent = cut ? tn('stock_idle_sum', shown.length).replace('{v}', v) + unv : tn('stock_value_sum', shown.length).replace('{v}', v) + unv;
  };
  let sqT = null; $('#q').oninput = () => { clearTimeout(sqT); sqT = setTimeout(applyStock, items.length > 300 ? 150 : 0); };
  $('#sf').onchange = applyStock; applyStock(); // Lagerwert gleich beim Öffnen
  const sqFlush = () => { if (sqT) { clearTimeout(sqT); sqT = null; applyStock(); } }; // Druck/CSV direkt nach dem Tippen: entprellte Suche zuerst anwenden
  $('#sprt').onclick = () => { sqFlush(); window.print(); };
  // CSV = angezeigte Auswahl (Filter/Suche) wie der Druck; ungefiltert alle Artikel (20.10.2026)
  $('#scsv').onclick = async () => { sqFlush(); try { const vis = $$('#sl a').filter((a) => !a.hidden).map((a) => a.dataset.id); download(vis.length < items.length ? await api('POST', '/api/stock/export', { ids: vis }) : await api('GET', '/api/stock?format=csv'), `fuhrpark-lager_${envFn()}_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
  if ($('#inv')) {
    // „Inventurdifferenzen“: Lagerjournal mit Auswahl Inventur, letzte 12 Monate, aktuelles Inventurlager
    $('#invdiffs').onclick = () => { try { sessionStorage.setItem('cfp_sj_type', 'inventur'); sessionStorage.setItem('cfp_sj_from', bDate(-364)); sessionStorage.setItem('cfp_sj_to', bDate()); sessionStorage.setItem('cfp_sj_site', $('#invsite') ? $('#invsite').value : ''); } catch { /* ohne Speicher: Standardzeitraum */ } };
    const invSite = () => ($('#invsite') ? $('#invsite').value : sites[0] && sites[0].code);
    const fill = () => { const li = lastInv[invSite()]; $('#invlast').textContent = li ? t('inventory_last').replace('{d}', fmtDT(li.at)).replace('{c}', li.counted ?? '–').replace('{x}', li.differences ?? '–') : t('inventory_last_none');
      $('#invbook').textContent = t('inventory_book');
      // Backlog 546/548 (Blickwinkel „Jahresinventur am Werkstatt-Tablet“): gleiche Reihenfolge wie die gedruckte Zählliste (Lagerort, Name; nach Sprache
      // sortiert), Teilenummer, Anzeige nach Lagerort (nur ausblenden – gesendet werden alle Werte) und Buchbestand nur auf Wunsch (Blindzählung wie die Zählliste)
      const coll = new Intl.Collator(S.lang === 'uk' ? 'uk' : S.lang === 'en' ? 'en' : 'de', { numeric: true, sensitivity: 'base' });
      const its = items.filter((i) => i.site === invSite()).sort((a, b) => (a.location ? 0 : 1) - (b.location ? 0 : 1) || coll.compare(a.location || '', b.location || '') || coll.compare(a.name, b.name));
      const locs = [...new Set(its.map((i) => i.location || ''))]; const wb = !!S.invBook;
      $('#invlist').innerHTML = `<div class="actions" style="flex-wrap:wrap;align-items:end;margin-top:0">${locs.length > 1 ? `<div><label for="invloc">${esc(t('inventory_loc'))}</label><select id="invloc"><option value="*">${esc(t('filter_all'))}</option>${locs.map((l) => `<option value="${esc(l)}">${esc(l || t('inventory_loc_none'))}</option>`).join('')}</select></div>` : ''}<label style="display:flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="invbookshow"${wb ? ' checked' : ''} style="width:auto">${esc(t('inventory_show_book'))}</label></div>
        <div class="scroll"><table><thead><tr><th>${esc(t('part_name'))}</th>${wb ? `<th>${esc(t('inventory_book_qty'))}</th>` : ''}<th>${esc(t('inventory_counted'))}</th></tr></thead><tbody>${its.map((i) => `<tr data-invloc="${esc(i.location || '')}"><td>${esc(i.name)}${i.part_number ? `<div class="small muted pn">${esc(i.part_number)}</div>` : ''}${i.location ? `<div class="small muted">${esc(i.location)}</div>` : ''}<div class="small muted" data-lc>${esc(i.last_counted_date ? t('last_counted') + ': ' + fmtD(i.last_counted_date) : t('never_counted'))}</div></td>${wb ? `<td>${fmtNum(i.on_hand)} ${esc(unitL(i.unit))}</td>` : ''}<td><input data-inv="${esc(i.id)}" data-invname="${esc(i.name + (i.location ? ' (' + i.location + ')' : ''))}" inputmode="decimal" style="max-width:110px" aria-label="${esc(t('inventory_counted'))} ${esc(i.name)}"></td></tr>`).join('')}</tbody></table></div>`; $('#invbook').disabled = true; $('#invres').innerHTML = ''; invPrev = null;
      const il = $('#invloc'); if (il) il.onchange = () => $$('#invlist tr[data-invloc]').forEach((tr) => (tr.hidden = il.value !== '*' && tr.dataset.invloc !== il.value));
      $('#invbookshow').onchange = () => { invDraft.save(); S.invBook = $('#invbookshow').checked; fill(); };
      // Zählmengen nach der Prüfung geändert → erst erneut prüfen (gebucht wird nur, was geprüft wurde)
      // Entwurf der Zählmengen auf diesem Gerät (je Person/Umgebung/Lager, 14 Tage): Wegklicken oder Neuladen verliert keine Zählung
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
    const body = () => ({ site: invSite(), note: $('#invnote').value || null, counts: $$('[data-inv]').filter((x) => x.value.trim() !== '').map((x) => ({ item_id: x.dataset.inv, counted: x.value.trim() })) }); // nur gezählte Zeilen (Lager > 2000 Artikel, 20.10.2026)
    // Backlog 547: wie viele Artikel des Lagers nicht gezählt sind (bleiben unverändert) – vorher wirkte eine Teilzählung als vollständige Inventur
    const unc = () => $$('[data-inv]').filter((x) => x.value.trim() === '');
    const prog = () => { const all = $$('[data-inv]').length; const u = unc(); return `<p class="small" data-invprog>${esc(t('inventory_progress').replace('{c}', all - u.length).replace('{n}', all))}${u.length ? ` · <b>${esc(tn('inventory_uncounted', u.length))}</b>` : ''}</p>${u.length ? `<details class="small"><summary>${esc(t('inventory_uncounted_list'))}</summary><ul>${u.slice(0, 300).map((x) => `<li>${esc(x.dataset.invname || '')}</li>`).join('')}${u.length > 300 ? '<li>…</li>' : ''}</ul></details>` : ''}`; };
    const uncTxt = () => { const n = unc().length; return n ? '\n\n' + tn('inventory_uncounted_confirm', n) : ''; };
    // Backlog 562: heute schon gezählt (andere Person/anderes Gerät) – Hinweis vor dem Buchen
    const ctToday = (r) => (r.already_counted_today && r.already_counted_today.length ? `<div class="panel warn small" role="note" data-invtoday><b>${esc(tn('inventory_counted_today', r.already_counted_today.length))}</b><ul style="margin:.3rem 0;padding-left:1.2rem">${r.already_counted_today.slice(0, 100).map((x) => `<li>${esc(x.name)}${x.part_number ? ' (' + esc(x.part_number) + ')' : ''}: ${esc(t('inventory_counted_at').replace('{t}', fmtHM(x.at)))}${x.qty !== null && x.qty !== undefined ? ` – ${esc(t('inventory_counted'))} ${fmtNum(x.qty)} ${esc(unitL(x.unit))}` : ''}</li>`).join('')}${r.already_counted_today.length > 100 ? '<li>…</li>' : ''}</ul><span class="muted">${esc(t('inventory_counted_today_hint'))}</span></div>` : '');
    const show = (r, booked) => { $('#invres').innerHTML = (booked ? '' : prog() + ctToday(r)) + (r.differences.length ? `<div class="list">${r.differences.map((d) => `<div class="row ${booked ? '' : 'p-mittel'}" data-invdiff style="grid-template-columns:minmax(0,1fr) auto"><span class="title" style="white-space:normal">${esc(d.name)}</span><b style="white-space:nowrap">${d.delta > 0 ? '+' : ''}${fmtNum(d.delta)} ${esc(unitL(d.unit))}</b><span class="sub" style="white-space:normal;grid-column:1/-1">${esc(t('inventory_book_qty'))} ${fmtNum(d.book)} → ${esc(t('inventory_counted'))} ${fmtNum(d.counted)}</span></div>`).join('')}</div>` : `<p>${esc(t('inventory_no_diff'))}</p>`); };
    $('#invchk').onclick = async () => { try { const r = await api('POST', '/api/stock/inventory?dry_run=1', body()); show(r, false); invPrev = r.differences; $('#invbook').disabled = !(r.counted > 0); $('#invbook').textContent = t(r.differences.length ? 'inventory_book' : 'inventory_close'); } catch (err) { toast(err.message, true); } };
    $('#invbook').onclick = async () => {
      if (!invPrev) return;
      if (!confirm((invPrev.length ? tn('inventory_book_confirm', invPrev.length) : t('inventory_close_confirm')) + uncTxt())) return;
      try { const r = await api('POST', '/api/stock/inventory', { ...body(), preview: invPrev.map((d) => ({ item_id: d.item_id, book: d.book, counted: d.counted })) }); invDraft.clear(); toast(r.booked ? `✓ ${r.booked}` : t('inventory_closed')); viewStock(); }
      catch (err) { toast(err.message, true); if (err.code === 'inventory_changed') { invPrev = null; $('#invbook').disabled = true; $('#invres').innerHTML = `<p class="small muted">${esc(t('inventory_recheck'))}</p>`; } }
    };
  }
  // Artikel-Import (CSV): Vorschau, dann Übernehmen – nur neue Artikel, vorhandene bleiben unverändert (19.10.2026)
  const simpf = $('#simpf');
  if (simpf) simpf.onchange = async () => {
    const file = simpf.files[0]; if (!file) return;
    const text = await readCsvFile(file); const sel = $('#simpsite'); const q = sel ? `&site=${encodeURIComponent(sel.value)}` : '';
    const show = (r, applied) => {
      const box = $('#simpr'); if (!box) return;
      box.innerHTML = `<p id="simpsum"><b>${esc(applied ? '✓' : t('preview'))}</b> · ${esc(wsName(r.site))} · ${esc(t('ia_neu'))}: ${r.created} · ${esc(t('ia_unverändert'))}: ${r.unchanged} · ${esc(t('skipped'))}: ${r.skipped.length}</p>${(r.ignored_columns || []).length ? `<p class="small muted" id="simpign">${esc(t('stock_import_ignored').replace('{c}', r.ignored_columns.join(', ')))}</p>` : ''}
        ${r.rows.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('line'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('part_number'))}</th><th>${esc(t('initial_qty'))}</th><th></th></tr></thead><tbody>${r.rows.map((x) => `<tr><td data-label="${esc(t('line'))}">${x.line}</td><td data-label="${esc(t('part_name'))}">${esc(x.name)}${x.note ? `<br><span class="small muted">${esc(reasonText(x.note))}</span>` : ''}</td><td data-label="${esc(t('part_number'))}">${esc(x.part_number || '–')}</td><td data-label="${esc(t('initial_qty'))}">${x.initial_qty === null ? '–' : `${fmtNum(x.initial_qty)} ${esc(unitL(x.unit))}`}</td><td><span class="chip${x.action === 'neu' ? ' ok' : ''}">${esc(t('ia_' + x.action))}</span>${x.inactive ? ` <span class="chip mittel">${esc(t('item_inactive_badge'))}</span>` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''}
        ${r.skipped.length ? `<details ${applied ? '' : 'open'}><summary>${esc(t('skipped'))} (${r.skipped.length})</summary><ul class="small">${r.skipped.map((x) => `<li>${esc(t('line'))} ${x.line}${x.plate ? ' · ' + esc(x.plate) : ''}: ${esc(reasonText(x.reason))}</li>`).join('')}</ul></details>` : ''}
        ${!applied && r.created ? `<div class="actions"><button type="button" class="btn" id="simpapply">${esc(t('apply_import'))}</button></div>` : ''}`;
      const ap = $('#simpapply');
      if (ap) ap.onclick = async () => { ap.disabled = true; try { const done = await api('POST', '/api/stock/import' + (q ? '?' + q.slice(1) : ''), text, { headers: { 'content-type': 'text/csv' } }); toast('✓'); S.simpDone = done; await viewStock(); } catch (err) { ap.disabled = false; toast(err.message, true); } };
    };
    try { show(await api('POST', '/api/stock/import?dry_run=1' + q, text, { headers: { 'content-type': 'text/csv' } }), false); } catch (err) { toast(err.message, true); }
  };
  if (S.simpDone && $('#simpr')) { const d = $('#simp'); d.open = true; const r = S.simpDone; S.simpDone = null; $('#simpr').innerHTML = `<p id="simpsum"><b>✓</b> · ${esc(wsName(r.site))} · ${esc(t('ia_neu'))}: ${r.created} · ${esc(t('ia_unverändert'))}: ${r.unchanged} · ${esc(t('skipped'))}: ${r.skipped.length}</p>`; }
  $('#nf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k of Object.keys(b)) { if (b[k] === '') delete b[k]; else if (['initial_qty', 'min_qty', 'unit_price_net'].includes(k)) b[k] = b[k].trim(); } try { await api('POST', '/api/stock', b); viewStock(); } catch (err) { toast(err.message, true); } };
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
// Bestellvorschlag: Artikel unter Mindestbestand mit Fehlmenge – es wird nichts bestellt (Liste für den Einkauf)
async function viewReorder() {
  const sites = S.me.role === 'workshop' ? [] : S.meta.workshops;
  const site = sessionStorage.getItem('cfp_reorder_site') || '';
  const q = site && sites.some((w) => w.code === site) ? `&site=${encodeURIComponent(site)}` : '';
  const items = (await api('GET', '/api/stock?reorder=1' + q)).items;
  const valued = items.filter((i) => i.shortfall_value_net !== null);
  const sum = rc2(valued.reduce((a, i) => a + i.shortfall_value_net, 0));
  const n = (x) => fmtNum(x);
  render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('reorder'))}</h1>
    <p class="small muted">${esc(t('reorder_hint'))}</p>
    <p class="print-only small">${printStamp()} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    ${sites.length > 1 ? `<div class="noprint"><label for="rsite">${esc(t('workshop'))}</label><select id="rsite"><option value="">${esc(t('all'))}</option>${sites.map((w) => `<option value="${esc(w.code)}"${q && w.code === site ? ' selected' : ''}>${esc(wsLabel(w))}</option>`).join('')}</select></div>` : ''}
    <div class="actions noprint"><button type="button" class="btn secondary" id="rcsv"${items.length ? '' : ' disabled'}>${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="rprt">${esc(t('print'))}</button></div>
    ${items.length ? `<div class="scroll"><table class="stack printsm"><thead><tr><th>${esc(t('workshop'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('on_hand'))}</th><th>${esc(t('min_qty'))}</th><th>${esc(t('shortfall'))}</th><th>${esc(t('used_90d'))}</th><th>${esc(t('shortfall_value'))}</th><th>${esc(t('last_supplier'))}</th></tr></thead><tbody>
      ${items.map((i) => `<tr><td>${esc(wsName(i.site))}</td><td><a href="#/stock/${esc(i.id)}">${esc(i.name)}</a>${i.part_number || i.location ? `<div class="small muted">${[i.part_number, i.location].filter(Boolean).map(esc).join(' · ')}</div>` : ''}</td><td>${n(i.on_hand)} ${esc(unitL(i.unit))}</td><td>${n(i.min_qty)}</td><td><b>${n(i.shortfall)} ${esc(unitL(i.unit))}</b>${i.ordered_on ? `<div class="small">${esc(t('ordered_line').replace('{q}', n(i.ordered_qty)).replace('{u}', unitL(i.unit)).replace('{d}', fmtD(i.ordered_on)))}${i.ordered_eta ? ` · ${esc(t('ordered_eta'))}: ${esc(fmtD(i.ordered_eta))}` : ''}</div><div class="small muted">${esc(t('open_after_order'))}: ${n(i.open_after_order)} ${esc(unitL(i.unit))}</div>` : ''}</td><td>${n(i.used_90d)}</td><td>${i.shortfall_value_net === null ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : eur(i.shortfall_value_net)}</td><td>${i.last_supplier ? esc(i.last_supplier) : '–'}${i.last_receipt_date ? `<div class="small muted">${esc(t('last_receipt'))}: ${esc(fmtD(i.last_receipt_date))}</div>` : ''}</td></tr>`).join('')}
      </tbody></table></div>
      <p id="rosum"><b>${esc(t('reorder_sum'))}:</b> ${valued.length ? eur(sum) : '–'}${valued.length < items.length ? ` <span class="small muted">(${esc(tn('unvalued_items_n', items.length - valued.length))})</span>` : ''}</p>` : `<p class="muted">${esc(t('reorder_none'))}</p>`}`, 'more');
  if ($('#rsite')) $('#rsite').onchange = () => { try { sessionStorage.setItem('cfp_reorder_site', $('#rsite').value); } catch {} viewReorder(); };
  $('#rprt').onclick = () => window.print();
  $('#rcsv').onclick = async () => { try { download(await api('GET', '/api/stock?reorder=1&format=csv' + q), `fuhrpark-bestellvorschlag_${envFn()}_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
}
// Bestand zum Stichtag (Jahresabschluss): Menge aus allen Buchungen bis Tagesende, zwei Preisangaben, Bewertung legt die Buchhaltung fest
async function viewStockAsOf() {
  if (!['owner', 'fleet', 'workshop'].includes(S.me.role)) return render(`<p>${esc(t('err_forbidden'))}</p>`); // Formulare nicht für Fahrer/Lesezugriff (Server antwortet ohnehin 403)
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
// Lagerjournal: alle Buchungen eines Zeitraums (Berliner Datum), Wert nur mit Preis, ohne buchende Person
async function viewStockJournal() {
  if (!['owner', 'fleet', 'workshop'].includes(S.me.role)) return render(`<p>${esc(t('err_forbidden'))}</p>`); // Formulare nicht für Fahrer/Lesezugriff (Server antwortet ohnehin 403)
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
      ${rep.movements.map((m) => `<tr><td class="small">${fmtDT(m.created_at)}</td><td>${esc(wsName(m.site))}</td><td><a href="#/stock/${esc(m.item_id)}">${esc(m.name)}</a>${m.part_number ? `<div class="small muted pn">${esc(m.part_number)}</div>` : ''}</td><td>${m.transfer_id ? `${esc(t('mv_umlagerung'))} ${m.qty < 0 ? '→' : '←'} ${esc(wsName(m.transfer_site))}` : esc(t('mv_' + m.type))}</td><td><b>${m.qty > 0 ? '+' : ''}${n(m.qty)}</b> ${esc(unitL(m.unit))}</td><td>${m.unit_price_net === null ? `<span class="muted">${esc(t('unvalued_short'))}</span>` : eur3(m.unit_price_net)}</td><td>${m.value_net === null ? '–' : eur(m.value_net)}</td><td>${m.case_no ? `<a href="#/cases/${esc(m.case_id)}">${esc(m.case_no)}</a>${m.plate ? ' · ' + esc(m.plate) : ''}` : '–'}</td><td class="small">${[m.supplier, m.document_ref && !(m.note || '').startsWith(m.document_ref) ? stNote(m.document_ref) : null, stNote(m.note)].filter(Boolean).map(esc).join(' · ') || '–'}</td></tr>`).join('')}
      </tbody></table></div>` : rep ? `<p class="muted">${esc(t('journal_none'))}</p>` : ''}`, 'more');
  $('#jf').onsubmit = (e) => { e.preventDefault(); ss('cfp_sj_from', $('#jfrom').value); ss('cfp_sj_to', $('#jto').value); if ($('#jsite')) ss('cfp_sj_site', $('#jsite').value); ss('cfp_sj_type', $('#jtype').value); viewStockJournal(); };
  $('#jprt').onclick = () => window.print();
  if ($('#jitemclr')) $('#jitemclr').onclick = () => { ss('cfp_sj_item', ''); viewStockJournal(); };
  $('#jcsv').onclick = async () => { try { downloadChecked(await api('GET', '/api/stock/journal?format=csv&' + qs), `fuhrpark-${inv ? 'inventurdifferenzen' : 'lagerjournal'}_${envFn()}_${from}_${to}${site ? '_' + site : ''}${rep && rep.item && rep.item.part_number ? '_' + rep.item.part_number.replace(/[^\w-]/g, '') : ''}.csv`); } catch (err) { toast(err.message, true); } };
}
// Backlog 445 (Blickwinkel „Lieferung mit mehreren Positionen kommt – Wareneingang“): Lieferant/Lieferschein einmal, mehrere Artikel eines Lagers
// in einem Schritt als Zugang buchen (ganz oder gar nicht, Wiederholung bucht nichts doppelt).
async function viewStockReceipt() {
  if (!['owner', 'fleet', 'workshop'].includes(S.me.role)) return render(`<p>${esc(t('err_forbidden'))}</p>`);
  const items = (await api('GET', '/api/stock')).items.filter((i) => i.active);
  const sites = S.me.role === 'workshop' ? S.meta.workshops.filter((w) => w.code === S.me.workshop_site) : S.meta.workshops.filter((w) => items.some((i) => i.site === w.code));
  if (!items.length || !sites.length) return render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('rcpt_title'))}</h1><p class="muted" id="rcnone">${esc(t('rcpt_no_items'))}</p>`, 'more');
  let key = uid().replace(/[^\w-]/g, '');
  render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('rcpt_title'))}</h1><p class="print-only small">${printStamp()} · CEVIK ${esc(t('app'))} [CLAUDE]</p><p class="small muted">${esc(t('rcpt_hint'))}</p>
    <form id="rcf" class="panel" novalidate>${sites.length > 1 ? `<label for="rcsite">${esc(t('workshop'))}</label><select id="rcsite">${sites.map((w) => `<option value="${esc(w.code)}">${esc(wsLabel(w))}</option>`).join('')}</select>` : ''}
      <label for="rcsup">${esc(t('supplier'))}</label><input id="rcsup" maxlength="120"><label for="rcdoc">${esc(t('doc_ref'))}</label><input id="rcdoc" maxlength="200"><label for="rcnote">${esc(t('note'))}</label><input id="rcnote" maxlength="500">
      <h3 style="margin-top:16px">${esc(t('rcpt_lines'))}</h3><div id="rclines"></div>
      <div class="actions"><button type="button" class="btn secondary" id="rcadd">${esc(t('rcpt_add'))}</button></div>
      <p class="small" id="rcsum" role="status" aria-live="polite"></p>
      <div class="actions"><button class="btn" id="rcbook">${esc(t('rcpt_book'))}</button></div></form><div id="rcres"></div>`, 'more');
  const site = () => ($('#rcsite') ? $('#rcsite').value : sites[0].code);
  const opts = () => `<option value="">–</option>${items.filter((i) => i.site === site()).map((i) => `<option value="${esc(i.id)}">${esc(i.name)}${i.part_number ? ' · ' + esc(i.part_number) : ''} (${fmtNum(i.on_hand)} ${esc(unitL(i.unit))})</option>`).join('')}`;
  let n = 0;
  const sum = () => { const k = $$('#rclines .rcl').filter((r) => $('select', r).value).length; $('#rcsum').textContent = t('rcpt_count').replace('{n}', k); };
  const addLine = () => {
    if ($$('#rclines .rcl').length >= 50) { toast(t('rcpt_max'), true); return; }
    n += 1; const d = document.createElement('div'); d.className = 'rcl'; d.style.cssText = 'border-top:1px solid var(--rule);padding-top:8px;margin-top:8px';
    d.innerHTML = `<label for="rci${n}">${esc(t('part_name'))}</label><select id="rci${n}" class="rci">${opts()}</select>
      <div class="grid2"><div><label for="rcq${n}">${esc(t('qty'))}</label><input id="rcq${n}" class="rcq" inputmode="decimal"></div><div><label for="rcp${n}">${esc(t('price_net'))}</label><input id="rcp${n}" class="rcp" inputmode="decimal"></div></div>
      <button type="button" class="btn secondary rcdel">${esc(t('rcpt_remove'))}</button>`;
    $('#rclines').append(d);
    $('select', d).onchange = sum; $('.rcdel', d).onclick = () => { d.remove(); if (!$$('#rclines .rcl').length) addLine(); sum(); };
    sum();
  };
  addLine();
  $('#rcadd').onclick = () => addLine();
  if ($('#rcsite')) $('#rcsite').onchange = () => { $$('#rclines .rci').forEach((x) => { x.innerHTML = opts(); }); sum(); };
  $('#rcf').onsubmit = async (e) => {
    e.preventDefault();
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
      const res = await api('POST', '/api/stock/receipt', body);
      key = uid().replace(/[^\w-]/g, '');
      toast('✓');
      const names = new Map(items.map((i) => [i.id, i]));
      $('#rcres').innerHTML = `<section class="panel ok" id="rcdone"><p><b>${esc(t('rcpt_done').replace('{n}', res.lines))}</b>${body.document_ref ? ' · ' + esc(body.document_ref) : ''}</p>${res.items ? `<ul>${res.items.map((x) => `<li><a href="#/stock/${esc(x.id)}">${esc(x.name)}</a>: +${fmtNum(x.qty)} ${esc(unitL((names.get(x.id) || {}).unit || 'Stk'))} · ${esc(t('on_hand'))} ${fmtNum(x.on_hand)}${x.order_rest ? ` <span class="chip mittel" data-rcrest>${esc(t('rcpt_order_rest').replace('{q}', fmtNum(x.order_rest)).replace('{u}', unitL((names.get(x.id) || {}).unit || 'Stk')))}</span>` : ''}</li>`).join('')}</ul>` : ''}</section>`;
      $('#rclines').innerHTML = ''; $('#rcsup').value = ''; $('#rcdoc').value = ''; $('#rcnote').value = ''; addLine();
      if (!res.duplicate) rcptWaiting(body.site, body.supplier, (res.items || []).map((x) => names.get(x.id) || x));
    } catch (err) { toast(err.message, true); }
  };
}
// Backlog 450 (Folge aus 449, Blickwinkel „Wareneingang: gelieferte Teile gehören zu einem wartenden Auftrag“): nach dem Buchen die Aufträge
// dieser Werkstatt im Status „wartet auf Teile“ mit ihrem Vermerk zeigen – nennt der Vermerk den Lieferanten, einen gelieferten Artikel oder
// dessen Teilenummer, steht der Auftrag oben mit Kennzeichnung. Reine Textübereinstimmung, keine Zuordnung, nichts wird automatisch gebucht.
async function rcptWaiting(site, supplier, got) {
  // Backlog 524: nur „wartet auf Teile“ dieser Werkstatt abfragen (vorher erste 200 offene aller Standorte → wartende konnten fehlen)
  let cs; try { cs = (await api('GET', `/api/cases?status=wartet_teile&ws=${encodeURIComponent(site)}&limit=500`)).cases; } catch { return; }
  const box = $('#rcres'); if (!box || !$('#rcdone')) return;
  const w = cs.filter((c) => c.status === 'wartet_teile' && c.workshop_site === site);
  if (!w.length) return;
  const low = (x) => String(x || '').toLowerCase(); const pn = (x) => low(x).replace(/[^a-z0-9]/g, '');
  const keys = [...(supplier && supplier.trim().length >= 3 ? [{ k: low(supplier.trim()) }] : []), ...got.flatMap((i) => [...(i.name && i.name.trim().length >= 4 ? [{ k: low(i.name.trim()) }] : []), ...(pn(i.part_number).length >= 4 ? [{ p: pn(i.part_number) }] : [])])];
  const hit = (c) => { const n = low(c.parts_wait_note); const np = pn(c.parts_wait_note); return !!n && keys.some((x) => (x.k ? n.includes(x.k) : np.includes(x.p))); };
  const rows = w.map((c) => ({ c, m: hit(c), d: partsWaitDays(c) })).sort((a, b) => (b.m - a.m) || ((b.d || 0) - (a.d || 0)));
  box.insertAdjacentHTML('beforeend', `<section class="panel" id="rcwait"><h3>${esc(t('rcw_title'))} <span class="chip">${rows.length}</span></h3><p class="small muted">${esc(t('rcw_hint').replace('{a}', t('act_resume_repair')).replace('{b}', t('act_parts_partial')))}</p>
    <ul>${rows.map(({ c, m, d }) => `<li${m ? ' data-rcwhit' : ''}><a href="#/cases/${esc(c.id)}">${esc(c.case_no)} · ${esc(c.plate)}</a>${m ? ` <span class="chip mittel">${esc(t('rcw_match'))}</span>` : ''}<div class="small">${c.parts_wait_note ? `${esc(t('parts_wait_for'))}: ${ltxt(clipTxt(c.parts_wait_note, 120))}` : `<span class="muted">${esc(t('rcw_no_note'))}</span>`}${d ? ` · ${esc(t('parts_wait_days').replace('{d}', nDays(d)))}` : ''}${partsEta(c)}</div></li>`).join('')}</ul></section>`); // Backlog 524: Liefertermin
}
// Backlog 441 (Blickwinkel „Rückruf eines Teilelieferanten“): Teile-Verwendung – an welchen Fahrzeugen ist Teil X laut Vorgang verbaut?
// Suche über Teilenummer (Schreibweise egal), Bezeichnung, Lieferant, Beleg; optional Einbauzeitraum. Keine Preise, keine Personen.
async function viewPartsUsage() {
  if (!['owner', 'fleet', 'workshop'].includes(S.me.role)) return render(`<p>${esc(t('err_forbidden'))}</p>`);
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k) || ''; sessionStorage.setItem(k, v); } catch { return ''; } return ''; };
  const q = ss('cfp_pu_q'); const from = ss('cfp_pu_from'); const to = ss('cfp_pu_to'); const today = bDate();
  const qs = `q=${encodeURIComponent(q)}${from ? '&from=' + encodeURIComponent(from) : ''}${to ? '&to=' + encodeURIComponent(to) : ''}`;
  let rep = null;
  if (q.trim().length >= 3) { try { rep = await api('GET', '/api/parts/usage?' + qs); } catch (err) { toast(err.message, true); rep = null; } }
  // Backlog 442: betroffene Fahrzeuge (in Betrieb) in einem Schritt als offenen Rückruf erfassen – über den vorhandenen Rückruf-Import
  // (Vorschau, dann Übernehmen; gleiche Referenz am Fahrzeug nie doppelt; Frist nur laut Schreiben). Nur Inhaber/Fuhrparkleitung.
  // Backlog 470 (Blickwinkel „Teilespender“): ruhende Fahrzeuge nicht vorgewählt (oft Teilespender – Teil evtl. ausgebaut), bleiben wählbar
  const rcVeh = rep && isMgr() ? rep.vehicles.filter((v) => v.active) : [];
  const rcOff = rep && isMgr() ? rep.vehicles.length - rcVeh.length : 0;
  const rcPanel = () => (!rcVeh.length ? '' : `<details class="panel noprint" id="purc"><summary>${esc(t('ptu_rc_title'))}</summary><p class="small muted">${esc(t('ptu_rc_hint'))}</p>
    <form id="purcf" novalidate><label for="purcref">${esc(t('ptu_rc_ref'))}</label><input id="purcref" maxlength="120" required autocomplete="off">
      <label for="purcnote">${esc(t('note'))}</label><input id="purcnote" maxlength="120" placeholder="${esc(t('ptu_rc_note_ph'))}">
      <label for="purcdue">${esc(t('ptu_rc_due'))}</label><input type="date" id="purcdue" style="max-width:200px">
      <p class="small" style="margin:12px 0 6px"><b>${esc(t('ptu_rc_vehicles'))}</b></p><div class="vehpick multi" id="purcpick">${rcVeh.map((v) => `<label><input type="checkbox" name="purcveh" value="${esc(v.vehicle_id)}" data-plate="${esc(v.plate)}"${v.eval_excluded ? ' data-purcdorm' : ' checked'}>${plate(v.plate)}${v.eval_excluded ? `<span class="small muted">${esc(t('eval_excluded'))} – ${esc(t('ptu_rc_dormant_hint'))}</span>` : ''}</label>`).join('')}</div>
      ${rcOff ? `<p class="small muted" id="purcoff">${esc(t('ptu_rc_off').replace('{n}', rcOff))}</p>` : ''}
      <div class="actions"><button class="btn secondary" id="purcprev">${esc(t('preview'))}</button></div></form><div id="purcres" role="status" aria-live="polite"></div></details>`);
  // Backlog 444: passende Lagerartikel mit Bestand – Rückruf betrifft oft auch noch nicht verbaute Teile (vor Verwendung prüfen/sperren)
  const stockPanel = () => (!rep || !rep.stock || !rep.stock.length ? '' : `<section class="panel warn" id="pustock"><h3>${esc(t('ptu_stock_title'))}</h3><p class="small">${esc(t('ptu_stock_hint'))}</p>
    <ul>${rep.stock.map((i) => `<li><a href="#/stock/${esc(i.id)}">${esc(i.name)}</a>${i.part_number ? ` <span class="small muted pn">${esc(i.part_number)}</span>` : ''} · <b>${fmtNum(i.on_hand)} ${esc(unitL(i.unit))}</b> · ${esc(wsName(i.site))}${i.location ? ' · ' + esc(i.location) : ''}${i.active ? '' : ` <span class="chip">${esc(t('item_inactive_badge'))}</span>`}</li>`).join('')}</ul>${rep.stock_truncated ? `<p class="small muted">${esc(t('ptu_stock_more'))}</p>` : ''}</section>`);
  const vChip = (i) => (!i.vehicle_active ? ` <span class="chip" data-puinact>${esc(t('inactive_vehicles'))}</span>` : i.eval_excluded ? ` <span class="chip" data-pudorm>${esc(t('eval_excluded'))}</span>` : '');
  render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(t('ptu_title'))}</h1>
    <p class="small muted">${esc(t(S.me.role === 'workshop' ? 'ptu_hint_ws' : 'ptu_hint'))}</p>
    <p class="print-only small">${printStamp()} · ${esc(t('ptu_q'))}: ${esc(q)}${from || to ? ` · ${esc(from ? fmtD(from) : '…')} – ${esc(to ? fmtD(to) : '…')}` : ''}${S.me.role === 'workshop' ? ' · ' + esc(wsName(S.me.workshop_site)) : ''} · CEVIK ${esc(t('app'))} [CLAUDE]</p>
    <form id="puf" class="panel noprint"><label for="puq">${esc(t('ptu_q'))}</label><input id="puq" value="${esc(q)}" minlength="3" maxlength="80" required autocomplete="off" placeholder="${esc(t('ptu_q_ph'))}">
      <div class="grid2"><div><label for="pufrom">${esc(t('ptu_from'))}</label><input type="date" id="pufrom" value="${esc(from)}" max="${esc(today)}"></div><div><label for="puto">${esc(t('to'))}</label><input type="date" id="puto" value="${esc(to)}" max="${esc(today)}"></div></div>
      <div class="actions"><button class="btn">${esc(t('show'))}</button><button type="button" class="btn secondary" id="pucsv"${rep && rep.items.length ? '' : ' disabled'}>${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="puprt"${rep && rep.items.length ? '' : ' disabled'}>${esc(t('print'))}</button></div></form>
    ${rep && rep.truncated ? `<p class="panel warn">${esc(t('ptu_truncated').replaceAll('{n}', rep.max))}</p>` : ''}
    ${rep && rep.items.length ? `<p id="pusum"><b>${esc(t('ptu_sum').replace('{n}', rep.items.length).replace('{v}', rep.vehicles.length))}</b></p><p class="small muted">${esc(t('ptu_removed_hint'))}</p>
      <div class="scroll"><table class="stack printsm" id="putab"><thead><tr><th>${esc(t('vehicle'))}</th><th>${esc(t('ptu_installed'))}</th><th>${esc(t('part_name'))}</th><th>${esc(t('qty'))}</th><th>${esc(t('supplier'))}</th><th>${esc(t('doc_ref'))}</th><th>${esc(t('ptu_case'))}</th></tr></thead><tbody>
      ${rep.items.map((i) => `<tr><td><a href="#/vehicles/${encodeURIComponent(i.vehicle_id)}">${esc(i.plate)}</a>${vChip(i)}${i.vehicle_site ? `<div class="small muted">${esc(i.vehicle_site)}</div>` : ''}</td><td>${esc(fmtD(i.date))}</td><td>${esc(i.name)}${i.part_number ? `<div class="small muted pn">${esc(i.part_number)}</div>` : ''}${i.warranty_until ? `<div class="small">${esc(t('warranty_until_d').replace('{d}', fmtD(i.warranty_until)))}</div>` : ''}${i.from_stock ? `<div class="small muted">${esc(t('from_stock'))}</div>` : ''}</td><td>${fmtNum(i.quantity)} ${esc(unitL(i.unit))}</td><td>${esc(i.supplier || '–')}</td><td>${esc(i.document_ref || '–')}</td><td><a href="#/cases/${esc(i.case_id)}">${esc(i.case_no)}</a><div class="small muted">${esc(t('st_' + i.case_status))}${i.workshop_site ? ' · ' + esc(wsName(i.workshop_site)) : ''}</div></td></tr>`).join('')}
      </tbody></table></div>${rcPanel()}` : rep ? `<p class="muted" id="punone">${esc(t('ptu_none'))}</p>` : ''}${stockPanel()}`, 'more');
  $('#puf').onsubmit = (e) => { e.preventDefault(); ss('cfp_pu_q', $('#puq').value.trim()); ss('cfp_pu_from', $('#pufrom').value); ss('cfp_pu_to', $('#puto').value); viewPartsUsage(); };
  $('#puprt').onclick = () => window.print();
  if ($('#purcf')) {
    const q2 = (x) => `"${String(x).replace(/"/g, '""')}"`;
    // CSV wie „Rückrufe importieren“: FIN (sonst Kennzeichen), Referenz, Frist (nur wenn eingetragen), Bemerkung
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
async function viewStockItem(id) {
  const d = await api('GET', '/api/stock/' + id);
  const it = d.item;
  const others = (S.meta.workshops || []).filter((w) => w.code !== it.site);
  render(`<p class="noprint"><a class="backlink" href="#/stock">‹ ${esc(t('back'))}</a></p><h1>${esc(it.name)}${it.active ? '' : ` <span class="chip" id="itinact">${esc(t('item_inactive_badge'))}</span>`}</h1>${printHead([`${t('workshop')}: ${wsName(it.site)}`, it.part_number ? `${t('part_number')}: ${it.part_number}` : ''])}
    <section class="panel"><dl class="kv"><dt>${esc(t('on_hand'))}</dt><dd><b style="font-size:1.4rem">${fmtNum(it.on_hand)} ${esc(unitL(it.unit))}</b></dd><dt>${esc(t('part_number'))}</dt><dd>${esc(it.part_number || '–')}</dd><dt>${esc(t('workshop'))}</dt><dd>${esc(wsName(it.site))}</dd><dt>${esc(t('storage'))}</dt><dd>${esc(it.location || '–')}</dd><dt>${esc(t('min_qty'))}</dt><dd>${it.min_qty === null || it.min_qty === undefined ? '–' : fmtNum(it.min_qty)}</dd><dt>€</dt><dd>${eur3(it.unit_price_net)}</dd><dt>${esc(t('last_counted'))}</dt><dd id="lcnt">${it.last_counted_at ? `${esc(fmtD(it.last_counted_at))} · ${fmtNum(it.last_counted_qty)} ${esc(unitL(it.unit))}` : esc(t('never_counted'))}</dd></dl></section>
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
    <h2>${esc(t('history'))}</h2>${d.movements_truncated ? `<p class="panel warn small" id="histtrunc">${esc(t('item_history_truncated').replaceAll('{n}', d.movements_max))}</p>` : ''}<p class="noprint"><button type="button" class="btn secondary" id="histjournal">${esc(t('item_in_journal'))}</button> <button type="button" class="btn secondary" id="itemprt">${esc(t('print'))}</button> <button type="button" class="btn secondary" id="itempu">${esc(t('ptu_item_btn'))}</button></p><div class="scroll"><table class="stack"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('kind'))}</th><th>${esc(t('qty'))}</th><th>${esc(t('note'))}</th></tr></thead><tbody>${d.movements.map((m) => `<tr><td class="small">${fmtDT(m.created_at)}</td><td>${m.transfer_id ? `${esc(t('mv_umlagerung'))} ${m.qty < 0 ? '→' : '←'} ${esc(wsName(m.transfer_site))}` : esc(t('mv_' + m.type))}</td><td><b>${m.qty > 0 ? '+' : ''}${fmtNum(m.qty)}</b></td><td class="small">${m.case_no ? `<a href="#/cases/${esc(m.case_id)}">${esc(m.case_no)}</a> · ` : ''}${esc(m.supplier || '')} ${m.document_ref && !(m.note || '').startsWith(m.document_ref) ? esc(stNote(m.document_ref)) : ''} ${esc(stNote(m.note || ''))}<br>${esc(m.user_name)}</td></tr>`).join('')}</tbody></table></div>`, 'more');
  // Artikelakte drucken (Stammdaten + Verlauf; Buchungs-/Bestell-/Umlagerungsformulare erscheinen im Ausdruck nicht)
  $('#itemprt').onclick = () => window.print();
  // Backlog 441: Teile-Verwendung mit Teilenummer (sonst Bezeichnung) dieses Artikels – alle Einbauten, nicht nur Entnahmen aus diesem Lager
  $('#itempu').onclick = () => { try { sessionStorage.setItem('cfp_pu_q', it.part_number || it.name); sessionStorage.setItem('cfp_pu_from', ''); sessionStorage.setItem('cfp_pu_to', ''); } catch { /* ohne Sitzungsspeicher: leeres Suchfeld */ } location.hash = '#/stock/usage'; };
  // Lagerjournal auf diesen Artikel eingrenzen, Zeitraum: letzte 12 Monate (Höchstspanne des Journals), Buchungsart: alle
  $('#histjournal').onclick = () => { try { const today = bDate(); const f = bDate(-365);
    sessionStorage.setItem('cfp_sj_item', id); sessionStorage.setItem('cfp_sj_from', f); sessionStorage.setItem('cfp_sj_to', today); sessionStorage.setItem('cfp_sj_type', ''); sessionStorage.setItem('cfp_sj_site', ''); } catch { /* ohne Sitzungsspeicher: Journal ungefiltert */ } location.hash = '#/stock/journal'; };
  // Entnahme: Wert = hinterlegter Artikelpreis (Server übernimmt ihn) – Preisfeld dann aus, Hinweis an
  const mfType = $('#mf [name=type]'); const mfSync = () => { const fixed = mfType.value !== 'zugang' && !!$('#mfpricehint'); /* Korrektur ebenfalls zum Artikelpreis (23.10.2026) */ $('#mfprice').hidden = fixed; $('#mf [name=unit_price_net]').disabled = fixed; if ($('#mfpricehint')) $('#mfpricehint').hidden = !fixed; };
  mfType.onchange = mfSync; mfSync();
  // Restbestand eines deaktivierten Artikels ausbuchen (23.10.2026): Korrektur genau auf 0, Grund Pflicht
  if ($('#wof')) $('#wof').onsubmit = async (e) => { e.preventDefault(); if (!confirm(t('item_writeoff_confirm').replace('{q}', fmtNum(it.on_hand)).replace('{u}', unitL(it.unit)))) return;
    const b = { type: 'korrektur', qty: String(-it.on_hand), note: e.target.elements.namedItem('note').value.trim() }; b.request_key = rkFor(e.target, b);
    try { await api('POST', `/api/stock/${id}/movements`, b); viewStockItem(id); } catch (err) { toast(err.message, true); } };
  $('#mf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); for (const k of Object.keys(b)) { if (b[k] === '') delete b[k]; else if (['qty', 'unit_price_net'].includes(k)) b[k] = b[k].trim(); } b.request_key = rkFor(e.target, b); try { await api('POST', `/api/stock/${id}/movements`, b); viewStockItem(id); } catch (err) { toast(err.message, true); } };
  // Backlog 480 (Blickwinkel „geteiltes Werkstatt-Tablet“): nach einem Versionskonflikt ist die Ansicht neu geladen – eigene Eingaben zurück ins
  // Formular – nur die selbst geänderten Felder, die Änderung der anderen Person bleibt sichtbar und wird nicht still zurückgesetzt (vorher
  // „Bitte neu laden“, jeder neue Versuch scheiterte am alten Stand; Neuladen verwarf die Eingaben)
  if (S.stockLost && S.stockLost.id === id) {
    const L = S.stockLost; S.stockLost = null; const f = $('#' + L.form); const dp = f && f.closest('details');
    if (f) { for (const [k, v] of Object.entries(L.v)) { const el = f.elements.namedItem(k); if (!el) continue; if (el.type === 'checkbox') el.checked = !!v; else el.value = v; } if (dp) dp.open = true;
      f.insertAdjacentHTML('afterbegin', `<div class="panel warn small" role="status" data-stocklost>${esc(t('case_conflict_kept'))}</div>`); dp && dp.scrollIntoView({ block: 'center' }); }
  }
  const stockConflict = (err, form, v, codes) => { if (!codes.includes(err.code)) return false; S.stockLost = { id, form, v }; viewStockItem(id); return true; };
  // Artikel-Stammdaten: alle Felder senden (leer = entfernen); Deaktivieren mit Restbestand nur nach Rückfrage
  $('#itedf').onsubmit = async (e) => { e.preventDefault(); const g = (k) => e.target.elements.namedItem(k);
    const b = { name: g('name').value, part_number: g('part_number').value, min_qty: g('min_qty').value, location: g('location').value, unit_price_net: g('unit_price_net').value, active: g('active').checked };
    if (it.active && !b.active && it.on_hand !== 0 && !confirm(t('item_inactive_onhand').replace('{q}', fmtNum(it.on_hand)).replace('{u}', unitL(it.unit)))) return;
    // nur geänderte Felder auf dem gelesenen Stand (18.10.2026: älteres Formular setzte Preis aus Zugang/Mindestbestand der Leitung still zurück)
    const nv = (x) => (x === null || x === undefined ? '' : decIn(x));
    const was = { name: it.name, part_number: it.part_number || '', min_qty: nv(it.min_qty), location: it.location || '', unit_price_net: nv(it.unit_price_net), active: !!it.active };
    for (const k of Object.keys(b)) if (b[k] === was[k]) delete b[k];
    if (!Object.keys(b).length) { toast(t('item_unchanged')); return; }
    if (it.updated_at) b.expected_updated_at = it.updated_at;
    try { const r = await api('PATCH', `/api/stock/${id}`, b); toast(r.changed && r.changed.length ? '✓' : t('item_unchanged')); viewStockItem(id); } catch (err) { if (!stockConflict(err, 'itedf', Object.fromEntries(Object.entries(b).filter(([k]) => k !== 'expected_updated_at')), ['version_conflict'])) toast(err.message, true); } };
  if ($('#of')) $('#of').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); b.qty = String(b.qty).trim(); for (const k of ['eta', 'note']) if (!b[k]) delete b[k];
    try { await api('PUT', `/api/stock/${id}/order`, b); viewStockItem(id); } catch (err) { if (!stockConflict(err, 'of', b, ['order_changed', 'stock_order_exists'])) toast(err.message, true); } };
  if ($('#ordclr')) $('#ordclr').onclick = async () => { try { await api('DELETE', `/api/stock/${id}/order?expected=${encodeURIComponent((it.ordered_on || '') + '|' + (it.ordered_by || ''))}`); viewStockItem(id); } catch (err) { if (['order_changed', 'stock_order_exists'].includes(err.code)) { toast(err.message, true); viewStockItem(id); } else toast(err.message, true); } };
  if ($('#tf')) $('#tf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); b.qty = String(b.qty).trim(); if (!b.note) delete b.note; b.request_key = rkFor(e.target, b);
    try { const r = await api('POST', `/api/stock/${id}/transfer`, b); toast(t('transfer_done').replace('{q}', fmtNum(r.qty)).replace('{u}', unitL(it.unit)).replace('{w}', wsName(b.to_site)) + (r.target_created ? ' · ' + t('transfer_created') : '')); viewStockItem(id); } catch (err) { toast(err.message, true); } };
}

export { viewPartsUsage, viewReorder, viewStock, viewStockAsOf, viewStockCount, viewStockItem, viewStockJournal, viewStockReceipt };
