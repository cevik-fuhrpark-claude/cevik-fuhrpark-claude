// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { $, S, announceHits, api, caseList, ctChip, esc, fmtD, fmtNum, helpLoaded, helpMatches, helpNorm, helpSections, isMgr, loadHelp, noTr, noneP, plate, render, searchKey, stockHit, t, unitL, vinOf, wsName } from './app-main.js';

// Kennzeichen mit Länderkennung aus ausländischen Schreiben („D SZ-YC 5501“, „SZYC5501 (D)“) – gleiche Regel wie plateNoCountry im Server (Backlog 902)
const plateNoCountry = (p) => { const x = String(p || '').trim(); const y = x.replace(/^\(?(?:D|DE|DEU)\)?[\s\-–:/.]+(?=\S)/i, '').replace(/(\S)[\s\-–/,]+\(?(?:D|DE|DEU)\)?$/i, '$1').replace(/(\S)\((?:D|DE|DEU)\)$/i, '$1').trim(); return y !== x && searchKey(y).length >= 4 ? y : null; };
async function viewSearch() {
  if (S.me.role === 'driver') { location.hash = '#/'; return; }
  render(`<h1>${esc(t('search_title'))}</h1><input id="gq" type="search" autocomplete="off" aria-label="${esc(t('search_title'))}" placeholder="${esc(t('search_ph'))}" value="${esc(S.lastSearch || '')}"><div id="gr"></div>`, '');
  let vehicles = null; let fineList = null; let fineTrunc = false; let stockList = null; let ctList = null; let timer = null; let seq = 0;
  // Bußgelder nur Inhaber/Fuhrparkleitung/Lesezugriff, Lager nur Inhaber/Fuhrparkleitung/Werkstatt (eigenes Lager) – wie die Server-Rechte
  const canFines = ['owner', 'fleet', 'viewer'].includes(S.me.role); const canStock = ['owner', 'fleet', 'workshop'].includes(S.me.role);
  const norm = searchKey;
  const run = async () => {
    const q = $('#gq').value.trim(); S.lastSearch = q; const my = ++seq; const box = $('#gr');
    if (q.length < 2) { box.innerHTML = `<p class="muted small">${esc(t('search_hint'))}</p>${matchMedia('(hover: hover) and (pointer: fine)').matches ? `<p class="muted small" data-kbd>${esc(t('search_kbd'))}</p>` : ''}`; return; }
    try {
      // Inhaber/Leitung: auch außer Betrieb genommene Fahrzeuge (Weg zur Akte, z. B. verkauft) – Vorgänge dazu fand die Suche schon (19.10.2026)
      if (!vehicles) {
        const [va, vi] = await Promise.all([api('GET', '/api/vehicles'), isMgr() ? api('GET', '/api/vehicles?inactive=1') : null]);
        vehicles = va.vehicles.concat(vi ? vi.vehicles.map((v) => ({ ...v, __inactive: true })) : []);
      }
      const n = norm(q);
      // Treffer je Bereich höchstens 10 (Vorgänge 20) – Gesamtzahl und Hinweis „Suche genauer eingeben“ statt stillem Abschneiden
      const vHit = (k) => vehicles.filter((v) => [v.plate, v.vin, v.trailer_plate, v.truck_plate, v.manufacturer, v.model].some((x) => norm(x).includes(k)) || (v.former_plates || []).some((x) => norm(x).includes(k))); // früheres Kennzeichen (Backlog 256)
      const ncq = plateNoCountry(q); let vAll = vHit(n); if (!vAll.length && ncq) vAll = vHit(norm(ncq)); if (!vAll.length) { const fv = vinOf(q); if (fv && fv.v) vAll = vHit(norm(fv.v)); } /* eingefügte „FIN: …“ (Backlog 980) */ const vs = vAll.slice(0, 10); // Länderkennung aus ausländischem Schreiben (Backlog 902)
      const cr = await api('GET', '/api/cases?status=&limit=20&q=' + encodeURIComponent(q)); const cs = cr.cases;
      // Suche nur in den 500 jüngsten Schreiben – Hinweis statt stillem Abschneiden (20.10.2026)
      if (canFines && !fineList) { const fr = await api('GET', '/api/fines'); fineList = fr.fines; fineTrunc = !!fr.truncated; }
      if (canStock && !stockList) stockList = (await api('GET', '/api/stock')).items;
      // Backlog 899 (Blickwinkel „Leasinggesellschaft/Versicherer ruft an und nennt nur die Vertrags- bzw. Schadennummer“): Verträge
      // (Nummer/Partner, Schreibweise ohne Leerzeichen/Bindestrich/Punkt egal) und Versicherungsfälle (Server-Suche wie die Liste) – nur Inhaber/Leitung
      if (isMgr() && !ctList) ctList = (await api('GET', '/api/contracts?filter=alle')).contracts;
      const clr = isMgr() ? await api('GET', '/api/claims?filter=alle&q=' + encodeURIComponent(q.slice(0, 60))) : null;
      await loadHelp(S.lang).catch(() => {}); // Hilfe-Schritte (Backlog 597); fehlt das Paket (offline ohne Cache), ohne Hilfe-Treffer
      if (my !== seq) return;
      const lq = q.toLowerCase(); const hq = helpNorm(q); // Lager, Behörde, Vertragspartner: Umlaute/ue/ss gleich (Backlog 995)
      const refQ = q.toUpperCase().replace(/[ ./-]/g, '').replace(/^(AZ|AKTENZEICHEN):?/, ''); const fAll = canFines ? fineList.filter((f) => [f.plate, f.plate_in_letter].some((x) => norm(x).includes(n)) || [f.fine_no, f.reference, f.authority].some((x) => String(x || '').toLowerCase().includes(lq)) || (hq.length >= 3 && helpNorm(f.authority).includes(hq)) || (refQ.length >= 4 && String(f.reference || '').toUpperCase().replace(/[ ./-]/g, '').includes(refQ))) : []; /* Backlog 993: Aktenzeichen ohne Leerzeichen/Punkte/Striche */ const fs = fAll.slice(0, 10);
      // Backlog 995 (Blickwinkel „Kollegin mit ukrainischer/englischer Tastatur sucht „Munchen“, „Dusseldorf“, „Strasse“): Behörde des
      // Bußgelds und Vertragspartner wie Lager und Hilfe mit `helpNorm` (ü = ue = u, ß = ss) – vorher fand nur die genaue Schreibweise mit Umlaut.
      const sAll = canStock && hq ? stockList.filter((i) => stockHit(i, q)) : []; // Backlog 862: Teilenummer auch ohne Leerzeichen/Bindestrich
      const ss = sAll.slice(0, 10);
      const nk = (x) => norm(x).replace(/[\s\-./]/g, ''); const nq = nk(q);
      const kAll = ctList && nq ? ctList.filter((c) => (c.contract_no && nk(c.contract_no).includes(nq)) || norm(c.partner).includes(n) || (hq.length >= 3 && helpNorm(c.partner).includes(hq))) : []; const ks = kAll.slice(0, 10);
      const clAll = clr ? clr.claims : []; const cls = clAll.slice(0, 10);
      const more = (shown, all) => (all > shown ? `<p class="small muted" data-more>${esc(t('search_more').replace('{n}', shown).replace('{m}', all))}</p>` : '');
      // Hilfe-Abschnitte der eigenen Rolle (gleiche Suche wie auf der Hilfeseite)
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

export { viewSearch };
