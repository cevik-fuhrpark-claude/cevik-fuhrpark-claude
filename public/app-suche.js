// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { $, $$, FORM_DRAFT_MS, ICON, S, SEND_TIMEOUT_MS, announceHits, api, bindLang, caseList, clearOfflineData, ctChip, esc, flushOutbox, fmtD, fmtNum, helpLoaded, helpMatches, helpNorm, helpSections, isMgr, langSelect, loadHelp, loadSessions, loadTotp, markSession, mayCheck, noTr, noneP, otherEnvOutbox, outboxGet, plate, pushOffForLogout, render, resetUserState, searchKey, siteKeyUi, stockHit, t, tn, toast, unitL, vinOf, wsName } from './app-main.js';

// Kennzeichen mit Länderkennung aus ausländischen Schreiben („D SZ-YC 5501“, „SZYC5501 (D)“) – gleiche Regel wie plateNoCountry im Server (Backlog 902)
const plateNoCountry = (p) => { const x = String(p || '').trim(); const y = x.replace(/^\(?(?:D|DE|DEU)\)?[\s\-–:/.]+(?=\S)/i, '').replace(/(\S)[\s\-–/,]+\(?(?:D|DE|DEU)\)?$/i, '$1').replace(/(\S)\((?:D|DE|DEU)\)$/i, '$1').trim(); return y !== x && searchKey(y).length >= 4 ? y : null; };
// Abmelden mit unversendeten Meldungen: vorher senden versuchen, sonst ausdrücklich bestätigen (sie bleiben auf dem Gerät für diese Person – 18.10.2026)
async function logoutOutboxOk() {
  if (outboxGet().some((x) => !x.failed) && navigator.onLine !== false) await flushOutbox().catch(() => {});
  const pend = outboxGet().filter((x) => !x.failed).length;
  if (pend && !confirm(tn('logout_outbox_confirm', pend))) return false;
  // Backlog 532: abgelehnte Meldungen (auch aus der anderen Umgebung) liegen nur auf diesem Gerät – vor dem Abmelden ausdrücklich nachfragen
  const bad = outboxGet().filter((x) => x.failed).length + otherEnvOutbox().length;
  if (bad && !confirm(tn('logout_failed_confirm', bad))) return false;
  // Backlog 479: ungesicherte Formularentwürfe (Arbeitszeit/Teil nach Netzabbruch, Meldung, Kontrolle) und Inventurzählungen dieser Person
  // werden beim Abmelden gelöscht (gewollt: geteiltes Gerät) – vorher ohne Rückfrage
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
// want = Abschnitt (?s=), q = Suchbegriff (&q=, z. B. aus der globalen Suche – Treffer bleiben markiert)
async function viewHelp(want, q) {
  // Hilfe-Schritte als eigenes Paket (Backlog 597): erst hier laden; Fehler → Fehlerseite mit „Erneut versuchen“ (route)
  try { await loadHelp(S.lang); } catch (e) { console.error(e); throw new Error(t('lazy_load_failed')); }
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
    $('#hres').textContent = !res ? '' : res.length === 1 ? t('help_hits1') : res.length ? tn('help_hits', res.length) : t('help_none');
  };
  if (document.getElementById('hq').value) run(); // vorbelegter Suchbegriff: erst filtern, dann zum Abschnitt springen
  if (want && parts.includes(want)) go(want);
  return run;
}
async function viewMore(open) { // Backlog 1196: liegt im nachgeladenen Modul app-suche.js (Reserve Start-Modul)
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
      // gespeicherter Standort in anderer Schreibweise („Hamburg“ ↔ „HAMBURG“): vorhandene Option wählen statt doppelt anzeigen (23.10.2026)
      const cur0 = S.me.home_site || ''; const cur = (cur0 && r.sites.find((x) => siteKeyUi(x) === siteKeyUi(cur0))) || cur0;
      hs.innerHTML = `<option value="">${esc(t('filter_all'))}</option>` + [...new Set([...r.sites, ...(cur ? [cur] : [])])].map((x) => `<option value="${esc(x)}"${x === cur ? ' selected' : ''}>${esc(x === 'ohne' ? t('cs_nosite') : x)}</option>`).join('');
    }).catch(() => {});
    hs.onchange = async () => {
      try {
        await api('PATCH', '/api/me', { home_site: hs.value }, { timeoutMs: SEND_TIMEOUT_MS }); // Backlog 805k: Wiederholung unverändert
        S.me.home_site = hs.value || null;
        // neue Voreinstellung gilt sofort für alle Standortfilter dieser Sitzung
        for (const k of ['costSite', 'defSite', 'fineSite', 'maintSite', 'tireSite', 'vehSite', 'caseVsite', 'kpiVsite', 'planVsite', 'dqSite', 'claimSite', 'ctSite', 'drvSite', 'tachoSite']) delete S[k];
        toast('✓');
      } catch (err) { toast(err.message, true); }
    };
  }
  const sess = $('#sess');
  sess.ontoggle = () => { if (sess.open) loadSessions().catch((err) => toast(err.message, true)); };
  // Sprung aus dem Hinweis „Neue Anmeldung auf einem anderen Gerät“: Geräteliste gleich öffnen
  if (open === 'sess') { sess.open = true; sess.scrollIntoView({ block: 'start' }); }
  const tfa = $('#tfa');
  tfa.ontoggle = () => { if (tfa.open) loadTotp().catch((err) => toast(err.message, true)); };
  // Abmelden ohne Netz: Meldung statt stillem Abbruch (Sitzung bliebe sonst unbemerkt bestehen – geteilte Tablets); bereits abgelaufen (401): trotzdem aufräumen
  // Backlog 533: ohne Verbindung stehender Hinweis (#lo_off) statt kurzer Einblendung, damit das Gerät nicht angemeldet weitergegeben wird
  $('#lo').onclick = async () => { if (!(await logoutOutboxOk())) return; try { await api('POST', '/api/logout', { push_endpoint: await pushOffForLogout() }); } catch (err) { if (err.status !== 401) { if (err.offline) { const box = $('#lo_off') || Object.assign(document.createElement('p'), { id: 'lo_off', className: 'small alert' }); box.setAttribute('role', 'alert'); box.textContent = t('logout_offline'); $('#lo').closest('.actions').after(box); return; } toast(err.message, true); return; } } clearOfflineData(); resetUserState(); markSession(''); location.hash = '#/login'; };
  $('#pw').onsubmit = async (e) => { e.preventDefault(); try { const r = await api('POST', '/api/me/password', Object.fromEntries(new FormData(e.target)), { timeoutMs: SEND_TIMEOUT_MS });
    // Passwörter nicht im offenen Formular stehen lassen; der Server meldet andere Geräte ab (19.10.2026)
    // Backlog 805k (Funkloch): Wiederholung nach verlorener Antwort – neues Passwort gilt schon → duplicate statt „Altes Passwort falsch“
    e.target.reset(); const dd = e.target.closest('details'); if (dd) dd.open = false; toast(r && r.duplicate ? t('saved_before') : '✓ ' + t('pw_changed_others')); } catch (err) { toast(err.message, true); } };
}

export { viewHelp, viewMore, viewSearch };
