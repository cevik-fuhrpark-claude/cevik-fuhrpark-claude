// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { $, $$, BERLIN_FMT, CT_KINDS, DEFECT_RESULTS, OPEN_CASE_ST, PHOTO_TIMEOUT_MS, S, SEND_TIMEOUT_MS, TST, VEH_SORTS, afLink, announceHits, api, bDate, bindTachoCancel, caseList, checkLabel, comboClearV, conflictKeep, conflictMine, ctChip, ctLines, ctRet, decIn, download, dqDetail, dur, envFn, esc, eur, eurIst, fMsg, fcLabel, fileUrl, fmtD, fmtDT, fmtKm, fmtMm, fmtMonth, fmtNum, formVals, hj, hoMissing, huNote, isMgr, kmDigHtml, kmDigitsWarn, kmFcHint, kmFcHtml, kmInputOk, langAttr, lostDup, lostIs, lostMark, mEv, mY, maintOrderHtml, mayReport, mk, mkR, noTr, noneP, offDayWatch, plate, plateCmp, pnm, posL, prepareUpload, printHead, printStamp, provL, render, rkFor, searchKey, siteKeyUi, sortPref, stackTables, supplierLabel, t, tachoHistList, tireAge, tlHash, tmAge, tmKmRej, tn, toast, translateNextAction, uid, unitIn, vOverdue, vlAt, vsDef, warrChip, wsForSite, wsOptions } from './app-main.js';

// Durchführung älter als die gespeicherte letzte: nur im Verlauf gespeichert, Fälligkeit unverändert – ausdrücklich sagen (17.10.2026)
const doneToast = (r) => toast(r && r.older_than_last ? '✓ ' + t('mt_older_saved').replace('{d}', fmtD(r.last_done_date)) : '✓');
// Papiervordruck der Abfahrtskontrolle (Notfall: Handy leer/defekt) – gleiche Prüfpunkte wie in der App
async function viewCheckPaper() {
  const line = (l) => `<div class="paper-field"><span>${esc(l)}</span><i></i></div>`;
  render(`<p class="noprint"><a class="backlink" href="#/check">‹ ${esc(t('back'))}</a></p><h1>${esc(t('departure_check'))} – ${esc(t('paper_form'))}</h1>
    <p class="small noprint">${esc(t('paper_hint'))}</p><div class="actions noprint"><button type="button" class="btn" id="pprt">${esc(t('print'))}</button></div>
    <div class="paper-head">${[t('plate_label'), t('date'), t('km'), t('driver_name')].map(line).join('')}</div>
    <div class="scroll"><table class="paper"><thead><tr><th>${esc(t('check_item'))}</th><th style="white-space:nowrap">${esc(t('ok'))}</th><th style="white-space:nowrap">${esc(t('defect'))}</th><th style="white-space:nowrap">${esc(t('na'))}</th><th>${esc(t('defect_note'))}</th></tr></thead>
    <tbody>${S.meta.checklist.map((i) => `<tr><td>${esc(checkLabel(i.key))}</td><td class="box">☐</td><td class="box">☐</td><td class="box">☐</td><td></td></tr>`).join('')}</tbody></table></div>
    <p class="small">☐ ${esc(t('safety_relevant'))} – ${esc(t('outbox_call'))}</p>
    <div class="paper-head">${line(t('signature'))}</div>
    <p class="small muted">${esc(t('paper_footer'))} · CEVIK ${esc(t('app'))} [CLAUDE]</p>`, 'check');
  $('#pprt').onclick = () => window.print();
}
function vehicleForm(v = {}) {
  const f = (name, label, val, extra = '') => `<label>${esc(label)}</label><input name="${name}" value="${esc(val ?? '')}" ${extra}>`;
  return `${v.trailer_vin ? `<input type="hidden" name="trailer_vin" value="${esc(v.trailer_vin)}">` : ''}${v.vin ? `<input type="hidden" name="vin" value="${esc(v.vin)}">` : f('vin', t('vin'), '', 'required minlength="17" maxlength="25" autocapitalize="characters" aria-describedby="vinhint"') + `<p class="small muted" id="vinhint">${esc(t('vin_hint_new'))}</p><p class="small" id="vinchk" role="status" aria-live="polite" hidden></p>`}
    ${f('plate', t('plate_label'), v.plate, 'required maxlength="20" autocapitalize="characters"')}
    <label>${esc(t('vehicle_kind'))}</label><select name="kind">${['lkw', 'anhaenger'].map((k) => `<option value="${k}"${(v.kind || 'lkw') === k ? ' selected' : ''}>${esc(t('vk_' + k))}</option>`).join('')}</select>
    ${f('site', t('site'), v.site, 'maxlength="60"')}${f('manufacturer', t('manufacturer'), v.manufacturer, 'maxlength="60"')}${f('model', t('model_label'), v.model, 'maxlength="60"')}${f('build_year', t('year'), v.build_year, 'inputmode="numeric" maxlength="4"')}
    ${f('trailer_plate', t('trailer') + ' (' + t('plate_label') + ')', v.trailer_plate, 'maxlength="20" autocapitalize="characters"')}${f('master_status', t('master_status'), v.master_status, 'maxlength="40"')}
    ${f('source', t('evidence'), v.vin ? '' : '', 'maxlength="200"')}`;
}
async function saveVehicleForm(form, edit = false) {
  const b = Object.fromEntries(new FormData(form));
  for (const k in b) if (b[k] === '') delete b[k];
  // Bearbeiten nimmt ein außer Betrieb genommenes Fahrzeug nicht wieder in Betrieb; Anlegen überschreibt nie ein Fahrzeug in Betrieb (409 vin_exists, 20.10.2026)
  if (edit) b.keep_active = true; else b.create_only = true;
  const r = await api('POST', '/api/vehicles', b, { timeoutMs: SEND_TIMEOUT_MS }); // Backlog 805e: Bearbeiten ist wiederholbar, Anlegen → vin_exists
  // Hinweis, wenn dasselbe Kennzeichen schon an einem anderen Fahrzeug steht (gespeichert wird trotzdem – Mensch entscheidet)
  const d = r && r.duplicate_plates;
  if (d && d.length) {
    const lst = d.slice(0, 3).map((x) => String(x.id).replace(/^VIN:/, '') + (!x.active ? ' (' + t('inactive_vehicles') + ')' : x.eval_excluded ? ' (' + t('eval_excluded') + ')' : '')).join(', ') + (d.length > 3 ? ` +${d.length - 3}` : '');
    setTimeout(() => toast(t('dup_plate_warn').replace('{p}', String(b.plate || '').toUpperCase()).replace('{list}', lst), true), 400);
  }
  // Anhänger umgekennzeichnet: Zugmaschinen tragen noch das alte Anhänger-Kennzeichen → Gespann gelöst, bis dort nachgetragen
  const tr = r && r.trailer_of_trucks;
  if (tr && tr.length) setTimeout(() => toast(t('trailer_renamed_warn').replace('{old}', r.trailer_plate_old).replace('{list}', tr.map((x) => x.plate).join(', ')), true), d && d.length ? 6000 : 400);
  // Standort geändert: was beim bisherigen Standort bleibt (offene Aufträge, geplante Prüftermine, gekoppeltes Fahrzeug) – reine Information (22.10.2026)
  if (r && r.site_changed) {
    const sh = [r.open_workshop_cases ? tn('veh_site_ws_open', r.open_workshop_cases).replace('{list}', (r.open_workshop_sites || []).join(', ')) : '',
      r.planned_appointments ? tn('veh_site_planned', r.planned_appointments) : '',
      ...(r.coupled_other_site || []).map((x) => t('veh_site_coupled').replace('{p}', x.plate).replace('{site}', x.site || t('cs_nosite'))),
      (r.drivers_other_site || []).length ? t('veh_site_drivers').replace('{list}', () => r.drivers_other_site.map((x) => `${x.name} (${x.site})`).join(', ')) : ''].filter(Boolean);
    if (sh.length) setTimeout(() => toast(sh.join(' · '), true), (d && d.length ? 6000 : 400) + (tr && tr.length ? 6000 : 0));
  }
  return r;
}
const VEH_AV_LINK = ['gesperrt', 'werkstatt', 'meldung_offen', 'einsatzbereit_lt_system', 'coupled_locked', 'with_notes', 'maint_overdue', 'recall_open', 'combo_clear', 'with_findings', 'with_findings_crit', 'dormant'];
async function viewVehicles() {
  const hf = new URLSearchParams(location.hash.split('?')[1] || '').get('f');
  if (hf !== null) {
    // Sprung aus einem Zähler: übrige Filter zurücksetzen (Art, außer Betrieb) – sonst zeigte die Liste weniger/andere Fahrzeuge als die Zahl (22.10.2026)
    if (VEH_AV_LINK.includes(hf) && (!hf.startsWith('with_findings') || isMgr())) { S.vehAvail = hf; S.vehKind = 'all'; S.vehInactive = false; if (hf.startsWith('with_findings')) S.vehSort = 'findings'; }
    try { history.replaceState(history.state, '', '#/vehicles'); } catch {}
  }
  const inact = !!S.vehInactive && isMgr();
  const vs = (await api('GET', '/api/vehicles' + (inact ? '?inactive=1' : ''))).vehicles;
  const f = S.vehKind || 'all';
  const av = S.vehAvail || 'all';
  const site = vsDef('vehSite') || '';
  // Schreibweisen desselben Standorts (Dortmund/DORTMUND) als ein Eintrag – wie Kostenbericht und Datenqualität; angezeigt die häufigste
  // ohne Standort = 'ohne' (wie Startseite/Server; 20.10.2026: Standard-Standort „ohne Standort“ ergab eine leere Liste)
  const sk = siteKeyUi;
  const siteCnt = new Map(); for (const v of vs) if (v.site && String(v.site).trim()) { const m = siteCnt.get(sk(v.site)) || new Map(); const raw = String(v.site).trim(); m.set(raw, (m.get(raw) || 0) + 1); siteCnt.set(sk(v.site), m); }
  const sites = [...siteCnt.values()].map((m) => [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'))[0][0]).sort((a, b) => a.localeCompare(b, 'de'));
  const base = vs.filter((v) => (!site || sk(v.site) === sk(site)) && (f === 'all' || v.kind === f));
  // „Gespann gesperrt“: eigenes Fahrzeug nicht gesperrt, aber gekoppelter Anhänger/Lkw gesperrt (nur Information, Kopplung laut Stammliste)
  const cLocked = (v) => !v.eval_excluded && v.availability !== 'gesperrt' && v.coupled && v.coupled.availability === 'gesperrt'; // ruhende nicht (wie die übrigen Verfügbarkeits-Knöpfe, 23.10.2026)
  const nCL = base.filter(cLocked).length;
  const nN = base.filter((v) => v.notes_active > 0).length; // aktive Hinweise zum Fahrzeug (nicht für Fahrer)
  // Prüfung/Wartung überfällig: frühester Termin vor heute oder km-Fälligkeit überschritten (gespeicherte Werte, nur Anzeige)
  const mOver = vOverdue; // ruhende nicht (wie Übersicht/Agent, Entscheidung 10.10.2026); Regel seit Backlog 981 gemeinsam mit der Dispo-Startseite
  const nMO = base.filter(mOver).length;
  const comboClear = comboClearV; // Backlog 979, Regel seit Backlog 981 gemeinsam mit der Dispo-Startseite
  const nCC = base.filter(comboClear).length;
  const nRC = base.filter((v) => v.open_recalls > 0).length; // offene Herstellerrückrufe (noch nicht durchgeführt)
  const nAF = base.filter((v) => v.agent_findings_open > 0).length; const nAFC = base.filter((v) => v.agent_findings_critical > 0).length; // offene Agentenbefunde (nur Inhaber/Fuhrparkleitung bekommen das Feld)
  const shown = base.filter((v) => av === 'all' || (av === 'coupled_locked' ? cLocked(v) : av === 'with_notes' ? v.notes_active > 0 : av === 'maint_overdue' ? mOver(v) : av === 'recall_open' ? v.open_recalls > 0 : av === 'with_findings' ? v.agent_findings_open > 0 : av === 'with_findings_crit' ? v.agent_findings_critical > 0 : av === 'combo_clear' ? comboClear(v) : av === 'dormant' ? !!v.eval_excluded : v.availability === av && !v.eval_excluded));
  const nDo = base.filter((v) => v.eval_excluded).length; // ruhende eigener Knopf; Verfügbarkeits-Knöpfe ohne sie wie die Startseite (23.10.2026, Teilagent „Disposition“)
  // Sortierung (nur Anzeige, gespeicherte Werte; fehlende Werte zuletzt bzw. bei „Abfahrtskontrolle“ zuerst – nie kontrolliert ist am ältesten)
  const so = S.vehSort || (S.vehSort = sortPref('vehicles', VEH_SORTS, 'plate'));
  const cmpStr = (a, b) => (a === b ? 0 : !a ? 1 : !b ? -1 : a < b ? -1 : 1);
  const SORTS = { plate: (a, b) => plateCmp(a.plate, b.plate), next_due: (a, b) => cmpStr(a.next_due, b.next_due),
    check_oldest: (a, b) => (a.last_check_at || '') < (b.last_check_at || '') ? -1 : (a.last_check_at || '') > (b.last_check_at || '') ? 1 : 0,
    km_desc: (a, b) => (b.last_km ?? -1) - (a.last_km ?? -1),
    // wenigste Rest-km zuerst (überschritten = negativ); ohne km-Fälligkeit oder ohne km-Stand ans Ende
    km_due: (a, b) => (a.km_remaining ?? Infinity) - (b.km_remaining ?? Infinity) || 0,
    // meiste offene Agentenbefunde zuerst (kritische vor allen anderen) – Felder gibt es nur für Inhaber/Fuhrparkleitung
    findings: (a, b) => (b.agent_findings_critical || 0) - (a.agent_findings_critical || 0) || (b.agent_findings_open || 0) - (a.agent_findings_open || 0) };
  if (S.me.role !== 'driver' && SORTS[so]) shown.sort((a, b) => SORTS[so](a, b) || plateCmp(a.plate, b.plate));
  // Art-Reiter zählen innerhalb des gewählten Standorts (wie Verfügbarkeits-Knöpfe und Liste) – 20.10.2026
  const bySite = vs.filter((v) => !site || sk(v.site) === sk(site));
  const anyT = vs.some((v) => v.kind === 'anhaenger');
  const nT = bySite.filter((v) => v.kind === 'anhaenger').length;
  const AV = ['gesperrt', 'werkstatt', 'meldung_offen', 'einsatzbereit_lt_system'];
  render(`<h1>${esc(t('vehicles'))}${inact ? ` · ${esc(t('inactive_vehicles'))}` : ''}</h1>${isMgr() ? `<details class="panel"><summary>${esc(t('new_vehicle'))}</summary><form id="nvf">${vehicleForm()}<div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
    <p class="noprint"><label style="display:inline-flex;gap:8px;align-items:center;margin:0"><input type="checkbox" id="inact" ${inact ? 'checked' : ''} style="width:auto"> ${esc(t('inactive_vehicles'))}</label></p>` : ''}<input id="q" class="noprint" type="search" autocomplete="off" placeholder="${esc(S.me.role === 'driver' ? 'SZ-…' : t('veh_search_ph'))}" aria-label="${esc(t('search_label'))}" style="margin-bottom:12px"><div id="vprl"></div>
    ${anyT ? `<div class="actions" role="group" aria-label="${esc(t('kind'))}" style="margin-top:0">${[['all', t('filter_all'), bySite.length], ['lkw', t('vk_lkw'), bySite.length - nT], ['anhaenger', t('vk_anhaenger'), nT]].map(([k, l, n]) => `<button type="button" class="btn ${f === k ? '' : 'secondary'}" data-vk="${k}">${esc(l)} (${n})</button>`).join('')}</div>` : ''}
    ${S.me.role !== 'driver' ? `<div class="actions" style="flex-wrap:wrap;margin-top:0">${sites.length + (vs.some((v) => !(v.site && String(v.site).trim())) ? 1 : 0) > 1 || site ? `<select id="vsite" aria-label="${esc(t('site'))}" style="max-width:220px"><option value="">${esc(t('site'))}: ${esc(t('filter_all'))}</option>${sites.map((x) => `<option${sk(x) === sk(site) ? ' selected' : ''}>${esc(x)}</option>`).join('')}${site && site !== 'ohne' && !sites.some((x) => sk(x) === sk(site)) ? `<option selected>${esc(site)}</option>` : ''}${vs.some((v) => !(v.site && String(v.site).trim())) || site === 'ohne' ? `<option value="ohne"${site === 'ohne' ? ' selected' : ''}>${esc(t('cs_nosite'))}</option>` : ''}</select>` : ''}
      ${[['all', t('filter_all'), base.length], ...AV.map((k) => [k, t('av_' + k), base.filter((v) => v.availability === k && !v.eval_excluded).length]), ...(nDo || av === 'dormant' ? [['dormant', t('eval_excluded'), nDo]] : []), ...(nCL || av === 'coupled_locked' ? [['coupled_locked', t('av_coupled_locked'), nCL]] : []), ...(nCC || av === 'combo_clear' ? [['combo_clear', t('av_combo_clear'), nCC]] : []), ...(nN || av === 'with_notes' ? [['with_notes', t('vnotes_with'), nN]] : []), ...(nMO || av === 'maint_overdue' ? [['maint_overdue', t('av_maint_overdue'), nMO]] : []), ...(nRC || av === 'recall_open' ? [['recall_open', t('av_recall_open'), nRC]] : []), ...(nAF || av === 'with_findings' ? [['with_findings', t('av_with_findings'), nAF]] : []), ...(av === 'with_findings_crit' ? [['with_findings_crit', t('av_with_findings_crit'), nAFC]] : [])].map(([k, l, n]) => `<button type="button" class="btn ${av === k ? '' : 'secondary'}" data-av="${k}"${k === 'combo_clear' ? ` title="${esc(t('av_combo_clear_t'))}"` : ''}>${esc(l)} (${n})</button>`).join('')}</div>` : ''}
    ${S.me.role !== 'driver' ? `<div class="actions" style="margin-top:0;flex-wrap:wrap"><select id="vsort" aria-label="${esc(t('sort_by'))}" style="flex:1 1 100%;max-width:420px">${VEH_SORTS.filter((k) => k !== 'findings' || isMgr()).map((k) => `<option value="${k}"${so === k ? ' selected' : ''}>${esc(t('sort_by'))}: ${esc(t('vsort_' + k))}</option>`).join('')}</select><button type="button" class="btn secondary" id="vcsv">${esc(t('export_csv'))}</button><button type="button" class="btn secondary" id="vprt">${esc(t('print'))}</button>${isMgr() ? `<a class="btn secondary" href="#/vehicles/qr">${esc(t('qr_sheet'))}</a>` : ''}</div>` : ''}
    ${av === 'combo_clear' ? `<p class="muted small" data-combohint>${esc(t('av_combo_clear_t'))}</p>` : ''}<p id="vnohit" class="muted small" hidden>${esc(t('search_no_hits'))}</p><div class="list" id="vl">${shown.map((v) => `<a class="row ${v.availability === 'gesperrt' ? 'p-kritisch' : v.availability === 'werkstatt' ? 'p-mittel' : ''}" href="#/vehicles/${esc(v.id)}" data-s="${esc((v.plate + ' ' + (v.site || '') + ' ' + (v.vin || '') + ' ' + (v.trailer_plate || '') + ' ' + (v.truck_plate || '') + ' ' + (v.manufacturer || '') + ' ' + (v.model || '') + ' ' + (v.former_plates || []).join(' ')).toLowerCase())}">${plate(v.plate, { locked: v.availability === 'gesperrt' })}<span class="title">${v.kind === 'anhaenger' ? `<span class="chip">${esc(t('vk_anhaenger'))}</span> ` : ''}${v.eval_excluded ? `<span class="chip">${esc(t('eval_excluded'))}</span> ` : ''}${esc([v.manufacturer, v.model, v.build_year].filter(Boolean).join(' '))}</span><span class="chip ${v.availability === 'gesperrt' ? 'gesperrt' : ''}">${esc(t('av_' + v.availability))}</span><span class="sub">${coupledChip(v.coupled)}${v.failed_inspection ? `<b class="chip kritisch">${esc(t('insp_failed_chip'))}: ${esc(mk(v.failed_inspection.kind))} – ${esc(t('res_' + v.failed_inspection.result))}</b><br>` : v.reinspection_open ? `<span class="chip mittel" data-reinsp title="${esc(t('reinsp_open_title'))}">${esc(t('reinsp_open_chip'))}: ${esc(mk(v.reinspection_open.kind))} ${fmtD(v.reinspection_open.done_date)} – ${esc(t('res_' + v.reinspection_open.result))}</span><br>` : ''}${[v.site && esc(v.site), v.trailer_plate && esc(t('trailer')) + ' ' + esc(v.trailer_plate), v.truck_plate && esc(t('truck')) + ' ' + esc(v.truck_plate), v.next_due && (v.next_due < bDate() ? `<b class="chip kritisch" data-overdue>${esc(t('overdue'))}: ${esc(t('next_due'))} ${fmtD(v.next_due)}${v.next_due_kind ? ' (' + esc(mk(v.next_due_kind)) + ')' : ''}</b>` : esc(t('next_due')) + ' ' + fmtD(v.next_due) + (v.next_due_kind ? ' (' + esc(mk(v.next_due_kind)) + ')' : '')), v.next_due_km !== null && v.next_due_km !== undefined && (v.km_unclear ? `${esc(mk(v.next_due_km_kind))} ${esc(t('due_at_km'))} ${fmtKm(v.next_due_km)} <span class="chip mittel km-unclear" title="${esc(t('km_unclear_drop').replace('{d}', fmtD(v.km_drop_at)))}">${esc(t('ms_ungeklaert'))}</span>` : v.km_remaining !== null && v.km_remaining < 0 ? `<b class="chip kritisch">${esc(mk(v.next_due_km_kind))} ${esc(t('km_over'))} ${fmtKm(-v.km_remaining)}</b>` : `${esc(mk(v.next_due_km_kind))} ${esc(t('due_at_km'))} ${fmtKm(v.next_due_km)}`), v.last_km != null && fmtKm(v.last_km), v.last_check_at && esc(t('departure_check')) + ' ' + fmtD(v.last_check_at) + (v.last_check_result === 'maengel' ? ' (' + esc(t('defect')) + ')' : ''), v.planned_workshop_date && esc(t('planned_ws_short')) + ' ' + fmtD(v.planned_workshop_date) + todayMark(v.planned_workshop_date), v.planned_inspection_date && esc(t('planned_inspection')) + (v.planned_inspection_kind ? ' ' + esc(String(v.planned_inspection_kind).split(', ').map(mk).join(', ')) : '') + ' ' + fmtD(v.planned_inspection_date) + todayMark(v.planned_inspection_date), v.parts_expected_date && esc(t('parts_eta')) + ' ' + fmtD(v.parts_expected_date), v.notes_active && `<span class="chip">${esc(tn('vnotes_n', v.notes_active))}</span>`, v.open_recalls > 0 && `<span class="chip mittel">${esc(t('recall_open_n').replace('{n}', v.open_recalls))}</span>`, v.agent_findings_open > 0 && `<span class="chip ${v.agent_findings_critical > 0 ? 'kritisch' : 'mittel'}" data-af="${v.agent_findings_open}">${esc(t('vfind_n').replace('{n}', v.agent_findings_open))}${v.agent_findings_critical > 0 ? ' · ' + esc(t('vfind_crit').replace('{n}', v.agent_findings_critical)) : ''}</span>`].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>${shown.length ? '' : `<p class="muted" data-vlempty>${esc(t(vs.length ? 'no_vehicles_filter' : (isMgr() ? 'no_vehicles_mgr' : 'no_vehicles_list')))}</p>`}`, 'vehicles');
  $$('[data-vk]').forEach((b) => (b.onclick = () => { S.vehKind = b.dataset.vk; viewVehicles(); }));
  $$('[data-av]').forEach((b) => (b.onclick = () => { S.vehAvail = b.dataset.av; viewVehicles(); }));
  // CSV = angezeigte Auswahl in angezeigter Reihenfolge (Filter, Suche, Sortierung); ungefiltert der ganze Bestand (20.10.2026)
  const vcsv = $('#vcsv'); if (vcsv) vcsv.onclick = async () => { try {
    const vis = $$('#vl a').filter((a) => !a.hidden).map((a) => decodeURIComponent(a.getAttribute('href').split('/').pop()));
    const sel = vis.length < vs.length || S.vehSort && S.vehSort !== 'plate' ? '&ids=' + encodeURIComponent(vis.join(',')) : '';
    download(await api('GET', '/api/vehicles?format=csv' + (inact ? '&inactive=1' : '') + sel), `fuhrpark-fahrzeuge_${envFn()}${inact ? '_ausser-betrieb' : ''}_${bDate()}.csv`); } catch (err) { toast(err.message, true); } };
  const vsite = $('#vsite'); if (vsite) vsite.onchange = () => { S.vehSite = vsite.value; viewVehicles(); };
  const vsort = $('#vsort'); if (vsort) vsort.onchange = () => { S.vehSort = sortPref('vehicles', VEH_SORTS, 'plate', VEH_SORTS.includes(vsort.value) ? vsort.value : 'plate'); viewVehicles(); };
  const ia = $('#inact'); if (ia) ia.onchange = () => { S.vehInactive = ia.checked; viewVehicles(); };
  // Backlog 805e (Funkloch): Anlegen mit Zeitlimit; nach verlorener Antwort meldet der Server für dieselbe FIN `vin_exists` → „War bereits gespeichert“, Akte öffnen
  const nvf = $('#nvf'); if (nvf) nvf.onsubmit = async (e) => { e.preventDefault(); const sig = Object.fromEntries(new FormData(nvf)); try { const r = await saveVehicleForm(nvf); toast('✓'); location.hash = '#/vehicles/' + encodeURIComponent(r.id); } catch (err) { if (lostDup(nvf, sig, err, ['vin_exists']) && err.data && err.data.id) { toast(t('saved_before')); location.hash = '#/vehicles/' + encodeURIComponent(err.data.id); return; } lostMark(nvf, sig, err); toast(err.message, true); } };
  // Ausdruck: gewählte Auswahl (Art, Verfügbarkeit, Standort, außer Betrieb), Suche, Sortierung und Anzahl sichtbarer Fahrzeuge
  const avLabel = av === 'all' ? '' : av === 'coupled_locked' ? t('av_coupled_locked') : av === 'with_notes' ? t('vnotes_with') : av === 'maint_overdue' ? t('av_maint_overdue') : av === 'recall_open' ? t('av_recall_open') : av === 'combo_clear' ? t('av_combo_clear') : av === 'dormant' ? t('eval_excluded') : t('av_' + av); // Backlog 483: „ruhend“ wie der Knopf (vorher „av_dormant“ im Druckkopf)
  const vPrint = () => { const qq = $('#q').value.trim(); $('#vprl').innerHTML = printHead([
    `${t('print_filter')}: ${[inact ? t('inactive_vehicles') : '', f !== 'all' ? t('vk_' + f) : '', avLabel, site ? `${t('site')} ${site === 'ohne' ? t('cs_nosite') : site}` : ''].filter(Boolean).join(', ') || t('filter_all')}`,
    qq ? `${t('print_search')}: „${qq}“` : '', S.me.role !== 'driver' ? `${t('sort_by')}: ${t('vsort_' + so)}` : '', t('print_count').replace('{n}', $$('#vl a').filter((a) => !a.hidden).length)]); };
  vPrint();
  const vprt = $('#vprt'); if (vprt) vprt.onclick = () => window.print();
  let vAnn = null;
  $('#q').oninput = () => { const q = searchKey($('#q').value); $$('#vl a').forEach((a) => (a.hidden = q && !searchKey(a.dataset.s).includes(q))); vPrint();
    // Trefferzahl für Screenreader (Liste wird nur ausgeblendet), entprellt; sichtbar „keine Treffer“ bei leerer Liste
    const n = $$('#vl a').filter((a) => !a.hidden).length; const nh = $('#vnohit'); if (nh) nh.hidden = !(q && !n);
    clearTimeout(vAnn); vAnn = setTimeout(() => announceHits(n), 400); };
}
// Wieder in Betrieb / wieder in Auswertungen (Backlog 204): was vor der ersten Fahrt zu klären ist – km-Stand immer, Rest nur wenn vorhanden
function returnCheckText(rc) {
  if (!rc) return '';
  const parts = [rc.locked_cases ? tn('rc_locked', rc.locked_cases) : '', rc.overdue_inspections ? tn('rc_overdue', rc.overdue_inspections) : '', rc.unclear_inspections ? tn('rc_unclear', rc.unclear_inspections) : '',
    rc.expired_contracts ? tn('rc_contracts', rc.expired_contracts) : '', rc.insurance_none_running ? t('rc_no_insurance') : '',
    // Backlog 469: aktive Hinweise (z. B. ausgebautes Teil) und offene Restarbeiten
    rc.active_notes ? tn('rc_notes', rc.active_notes) : '', rc.open_items ? tn('rc_open_items', rc.open_items) + (rc.open_items_safety ? ' ' + t('oi_safety_deact').replace('{n}', fmtNum(rc.open_items_safety)) : '') : '', rc.last_km_at ? t('rc_km').replace('{d}', fmtD(rc.last_km_at)) : t('rc_km_none')].filter(Boolean);
  return `${t('rc_head')}: ${parts.join(' · ')}`;
}
// „(heute)“ hinter einem geplanten Termin in Listen (Backlog 209: Prüftermin heute in der Fahrzeugliste nicht erkennbar – Ersatzsuche)
// Backlog 484 (Blickwinkel „Disposition plant abends den nächsten Tag“): Termin morgen ebenso markieren (Berliner Datum)
const todayMark = (d) => (d && d === bDate() ? ` <b data-today>(${esc(t('today'))})</b>` : d && d === bDate(1) ? ` <b data-tomorrow>(${esc(t('tomorrow'))})</b>` : '');
function coupledChip(c) {
  if (!c) return '';
  const who = `${esc(t(c.kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(c.plate)}`;
  let h = '';
  if (['gesperrt', 'werkstatt', 'meldung_offen'].includes(c.availability)) h += `<span class="chip ${c.availability === 'gesperrt' ? 'kritisch' : 'mittel'}" data-cav>${who}: ${esc(t('av_' + c.availability))}</span> `;
  // Prüfstand des gekoppelten Fahrzeugs (gleiche Regel wie „Prüfung/Wartung überfällig“; ruhende nicht) – sonst wählt die Disposition ein Gespann mit überfälligem Anhänger
  if (c.failed_inspection) h += `<b class="chip kritisch" data-cfail>${who}: ${esc(t('insp_failed_chip'))}</b> `;
  else if (c.reinspection_open && !c.eval_excluded) h += `<span class="chip mittel" data-creinsp title="${esc(t('reinsp_open_title'))}">${who}: ${esc(t('reinsp_open_chip'))}</span> `; // Backlog 618
  if (!c.eval_excluded && ((c.next_due && c.next_due < bDate()) || (c.km_remaining !== null && c.km_remaining !== undefined && c.km_remaining < 0))) h += `<b class="chip kritisch" data-cover>${who}: ${esc(t('av_maint_overdue'))}</b> `;
  return h;
}
const fmtBar = (n) => fmtNum(n) + (S.lang === 'uk' ? ' бар' : ' bar');
// DOT ohne vorangestelltes „DOT“ anzeigen (Server nimmt den ganzen Code an; Anzeige war „DOT DOT U2LL …“)
const dotTxt = (v) => String(v || '').replace(/^\s*DOT\s*/i, '');
const ruleDueKm = (m) => (['HU', 'SP'].includes(m.kind) ? null : m.due_km !== null && m.due_km !== undefined ? m.due_km : m.interval_km && m.last_done_km !== null && m.last_done_km !== undefined ? m.last_done_km + m.interval_km : null);
function kmDueHtml(m, latest) {
  const next = ruleDueKm(m);
  if (next === null) return '';
  // km-Zähler nach der letzten Änderung der Regel gesunken (Server: km_unclear) – keine Restlaufleistung aus gemischten Zählerständen
  if (m.km_unclear) return `<div class="small" style="margin-top:4px">${esc(t('due_at_km'))} ${fmtKm(next)}<br><b class="km-unclear" style="hyphens:auto">${esc(t('km_unclear_drop').replace('{d}', fmtD(m.km_drop_at)))}</b></div>`;
  // Backlog 635: Rest-km, Status und Stand-Datum vom Server (wie Prüftermine/Agent: belegter km-Stand der letzten Durchführung, Vorwarnung in km)
  const rest = m.km_remaining !== undefined ? m.km_remaining : latest ? next - latest.km : null;
  if (m.km_status === 'ohne_km') return `<div class="small" style="margin-top:4px">${esc(t('due_at_km'))} ${fmtKm(next)}<br><b data-kmnone>${esc(t('km_none_unclear'))}</b></div>`;
  const chip = m.km_status === 'faellig' ? ` <span class="chip mittel" data-kmsoon>${esc(t('ms_faellig'))}</span>` : m.km_status === 'ueberfaellig' ? ` <span class="chip kritisch">${esc(t('ms_ueberfaellig'))}</span>` : '';
  return `<div class="small" style="margin-top:4px">${esc(t('due_at_km'))} ${fmtKm(next)}${rest === null ? '' : `<br><b style="${rest < 0 ? 'color:var(--stop)' : ''}">${rest < 0 ? esc(t('km_over')) + ' ' + fmtKm(-rest) : esc(t('km_left')) + ' ' + fmtKm(rest)}</b>${chip}${kmDigHtml(m)}${m.km_measured_at ? ` <span class="muted" data-kmasof>${esc(t('km_as_of').replace('{d}', fmtD(m.km_measured_at)))}</span>` : ''}`}${m.km_forecast ? `<br>${kmFcHtml(m.km_forecast, true)}` : ''}</div>`;
}
// HU/SP getrennt: letzte Prüfung, Fälligkeit (verbindlich/Prognose), Status, Nachweis, geplanter Termin (StVZO Anlage VIII, serverseitig berechnet)
const HS_CLS = { ok: 'ok', bald_faellig: 'mittel', ueberfaellig: 'kritisch', ungeklaert: 'mittel', nicht_sp_pflichtig: '', erste_sp_kuenftig: '' };
// Fälligkeit laut Nachweis mit Tag (z. B. 15.11.): die App rechnet mit diesem Tag (vorsichtiger) – dann auch genau ihn anzeigen statt „bis Ende MM/JJJJ“ (Backlog 94, 19.10.2026)
const isMonthEnd = (d) => { const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate() === dd; };
// Werkstattauftrag „Winterreifen“ (nur Leitung) im Reifenbereich der Fahrzeugakte: offener Auftrag als Link, sonst Formular
// Backlog 408: Achse einer Position (wie tire_specs.axle) und offene Winterpositionen (ohne Alpine-Symbol zuerst, dann nicht erfasste) in Achsreihenfolge
const posAxle = (p) => (/^VA/.test(p) ? 'lenkachse' : /^LA/.test(p) ? 'liftachse' : /^HA/.test(p) ? 'antriebsachse' : /^AH/.test(p) ? 'anhaenger' : null);
const woOpenPos = (d) => { const w = d.winter; if (!w || !['nicht_erfuellt', 'unbekannt'].includes(w.status)) return []; const al = d.allowed_positions || S.meta.tire_positions; return [...al.filter((p) => w.noncompliant.includes(p)), ...al.filter((p) => w.missing.includes(p))]; };
function winterOrderHtml(d) {
  const w = d.winter;
  if (w.open_order) return `<p class="small" id="wolink">🔧 ${w.open_order.id ? `<a href="#/cases/${esc(w.open_order.id)}">${esc(t('mo_open'))} ${esc(w.open_order.case_no)}</a>` : `${esc(t('mo_open'))} ${esc(w.open_order.case_no)}`}</p>`;
  // Auftrag abgeschlossen, Winterlage laut Erfassung weiter offen (Server liefert closed_order nur dann)
  const closed = w.closed_order ? `<p class="panel warn small" id="woclosed">⚠ ${t('wo_closed_open').split(/(\{no\}|\{d\})/).map((x) => (x === '{no}' ? (w.closed_order.id ? `<a href="#/cases/${esc(w.closed_order.id)}">${esc(w.closed_order.case_no)}</a>` : esc(w.closed_order.case_no)) : x === '{d}' ? fmtD(w.closed_order.closed_at) : esc(x))).join('')}</p>` : '';
  if (!isMgr() || d.vehicle.active === 0 || !['nicht_erfuellt', 'unbekannt'].includes(w.status)) return closed;
  const site = wsForSite(d.vehicle.site);
  return `${closed}<details class="noprint" id="wodet"><summary>${esc(t(w.status === 'nicht_erfuellt' ? 'wo_create' : 'wo_create_check'))}</summary><form id="woform"><label>${esc(t('workshop'))}</label><select name="workshop_site">${wsOptions(site)}</select><label>${esc(t('wo_date'))}</label><input type="date" name="planned_date" min="${bDate()}"><label>${esc(t('urgency'))}</label><select name="priority"><option value="niedrig">${esc(t('prio_niedrig'))}</option><option value="mittel">${esc(t('prio_mittel'))}</option></select><label>${esc(t('note'))}</label><input name="note" maxlength="300"><p class="small muted">${esc(t('wo_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('mo_create'))}</button></div></form></details>`;
}
// Backlog 579: Prüftermin bearbeiten (Titel bei „Sonstiges“, Intervall, Bezeichnung) bzw. beenden/entfernen – nur Leitung, nicht HU/SP
function maintEditHtml(m) {
  const rc = m.kind === 'Rückruf';
  return `<details class="noprint" data-meditbox><summary>${esc(t('medit_title'))}</summary><form data-medit="${esc(m.id)}">${m.kind === 'Sonstiges' ? `<label>${esc(t('rule_title'))}</label><input name="title" maxlength="80" value="${esc(m.title || '')}" placeholder="${esc(t('rule_title_ph'))}">` : ''}${rc ? '' : `<label>${esc(t('interval_months'))}</label><input name="interval_months" inputmode="numeric" maxlength="20" value="${esc(m.interval_months ?? '')}" style="max-width:9em">`}<label>${esc(t('evidence'))}</label><input name="evidence" maxlength="300" required value="${esc(m.evidence || '')}"><p class="small muted">${esc(t('medit_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form>
  <form data-mend="${esc(m.id)}"><label>${esc(t('mend_reason'))}</label><input name="reason" maxlength="300" required placeholder="${esc(t('mend_reason_ph'))}"><p class="small muted">${esc(t('mend_hint'))}</p><div class="actions"><button class="btn danger">${esc(t('mend_btn'))}</button></div></form></details>`;
}
// Durchführung einer Prüfregel (nicht HU/SP) erfassen; bei km-Intervall ist der km-Stand Pflicht (wie serverseitig)
// Backlog 829 (Blickwinkel „Werkstatt trägt Wartung am Anhänger mit km der Zugmaschine ein“): km-Feld mit Hinweis beim Anhänger und dem zuletzt
// erfassten Stand (der km-Stand der Durchführung geht in die Fahrzeugakte – ein zu großer fremder Stand fällt dort sonst erst später auf)
function maintDoneForm(m, v = null, lastKm = null) {
  return `<form data-mdone="${esc(m.id)}" hidden class="panel noprint"><h3 style="margin-top:0">${esc(t('done'))}: ${esc(mkR(m))}</h3><label>${esc(t('date'))} (${esc(mk(m.kind))})</label><input type="date" name="done_date" required value="${esc(m.planned_date && m.planned_date <= bDate() ? m.planned_date : bDate())}" max="${esc(bDate())}">${m.planned_date && m.planned_date < bDate() ? `<p class="small muted" data-mdoneplan>${esc(t('mdone_from_plan'))}</p>` : ''}${!['HU', 'SP'].includes(m.kind) && (m.interval_km || ruleDueKm(m) !== null) ? `<label>${esc(t('last_done_km'))}${v && v.kind === 'anhaenger' ? `<span class="hint" data-mdkmtr>${esc(t('mdone_kmtr'))}</span>` : ''}${lastKm ? `<span class="hint" data-mdkmlast>${esc(t('irv_last_km').replace('{km}', fmtNum(lastKm.km)).replace('{d}', fmtD(lastKm.measured_at)))}</span>` : ''}</label><input name="done_km" inputmode="numeric"${m.interval_km ? ' required' : ''}${lastKm ? ` data-lastkm="${esc(lastKm.km)}"` : ''}><div data-mdkmd aria-live="polite"></div>` : ''}<label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" placeholder="${esc(t('evidence_ph'))}"><label>${esc(t('result'))}</label><select name="result"><option value="">–</option>${['ohne_maengel', 'geringe_maengel', 'erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'].map((r) => `<option value="${r}">${esc(t('res_' + r))}</option>`).join('')}</select>${m.kind === 'Rückruf' ? '' : (() => { const need = !['HU', 'SP'].includes(m.kind) && !m.interval_months && !m.interval_km && !!m.next_due_date; return `<label>${esc(t(need ? 'documented_due_req' : 'documented_due'))}</label><input type="date" name="next_due_date"${need ? ' required' : ''}>${need ? `<p class="small" data-mdonenoint>${esc(t('mdone_no_interval'))}</p>` : ''}`; })()}${['HU', 'SP', 'Rückruf'].includes(m.kind) ? '' : `<label>${esc(t('due_km_doc'))}</label><input name="next_due_km" inputmode="numeric">${!m.interval_months && !m.interval_km && !m.next_due_date && m.due_km !== null && m.due_km !== undefined ? `<p class="small" data-mdonenokm>${esc(t('mdone_no_km_interval'))}</p>` : ''}`}<p class="small muted">${esc(t('mdone_hint'))}</p>${m.kind === 'Tachograph' ? `<p class="small muted" data-tachodone>${esc(t('mdone_tacho_hint'))}</p>` : ''}<div class="actions"><button class="btn">${esc(t('save'))}</button></div></form>`;
}
// Werkstattauftrag zur Mängelbeseitigung aus einer Prüfung mit erheblichen/gefährlichen Mängeln (nur Inhaber/Fuhrparkleitung)
function defectOrderHtml(h, orders, v, sinceCase, released, superseded) {
  if (!isMgr() || !DEFECT_RESULTS.includes(h.result)) return '';
  const o = orders.get(h.id);
  if (!o && superseded) return ''; // neuere Durchführung derselben Prüfart eingetragen → Nachprüfung erledigt bzw. die neuere zählt
  if (o) return `<p class="small">🔧 <a href="#/cases/${esc(o.id)}">${esc(t('md_open'))} ${esc(o.case_no)}</a> · ${esc(t('st_' + o.status))}</p>`;
  if (released) return `<p class="small"><span class="chip mittel">${esc(t('todo_reinspection'))}</span> <a href="#/cases/${esc(released.id)}" style="white-space:nowrap" translate="no">${esc(released.case_no)}</a> ${esc(t('released_short'))} ${fmtD(released.closed_at)}</p><p class="small muted">${esc(t('reinsp_hint'))}</p>`;
  const site = wsForSite(v && v.site);
  const prio = h.result === 'erhebliche_maengel' ? 'mittel' : 'kritisch';
  const drv = h.result === 'verkehrsunsicher' ? 'nicht_fahrbereit' : 'unbekannt';
  return `<details class="noprint"${sinceCase ? '' : ' open'}><summary>${esc(t('md_create'))}</summary>${sinceCase ? '' : `<p class="small"><span class="chip mittel">${esc(t('md_no_case'))}</span></p>`}<form data-mdef="${esc(h.id)}"><label>${esc(t('workshop'))}</label><select name="workshop_site">${wsOptions(site)}</select><label>${esc(t('urgency'))}</label><select name="priority">${['niedrig', 'mittel', 'kritisch'].map((p) => `<option value="${p}"${p === prio ? ' selected' : ''}>${esc(t('prio_' + p))}</option>`).join('')}</select><label>${esc(t('driveable'))}</label><select name="driveability">${['unbekannt', 'fahrbereit', 'eingeschraenkt', 'nicht_fahrbereit'].map((p) => `<option value="${p}"${p === drv ? ' selected' : ''}>${esc(t('drv_' + p))}</option>`).join('')}</select><label>${esc(t('note'))}</label><input name="note" maxlength="300" placeholder="${esc(t('md_note_ph'))}"><p class="small muted">${esc(t('md_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('md_create'))}</button></div></form></details>`;
}
// Prüfung mit geringen Mängeln (Backlog 435): Plakette erteilt, Mängel laut Bericht beheben – nur Hinweis an der letzten Durchführung
// dieser Art, mit Weg zur Meldung; keine Frist, keine Erinnerung (Gesetz: „unverzüglich“, Frage an den Auftraggeber)
function minorResHtml(h, v, superseded) {
  if (!isMgr() || h.result !== 'geringe_maengel' || superseded) return '';
  return `<p class="small muted" data-resminor>${esc(t('res_minor_hint'))}${v && mayReport() ? ` <a href="#/new/${esc(v.id)}" style="white-space:nowrap">${esc(t('report_damage'))}</a>` : ''}</p>`;
}
function huSpHtml(h, v, canEdit, orders, docOk) {
  // Backlog 620: HU und SP am selben Tag mit einem Bericht in einem Formular (zweiter Aufruf für die SP); nur wenn die SP erfassbar ist
  const spRid = h.rules.SP || (h.sp.status !== 'nicht_sp_pflichtig' ? 'husp:SP' : null);
  const spSame = !!spRid && h.sp.status !== 'nicht_sp_pflichtig';
  const card = (k, x) => {
    // ohne eigenen Eintrag (Frist berechnet bzw. ungeklärt): dieselben Formulare, der Server legt den Eintrag erst beim Speichern an (19.10.2026)
    const rid = h.rules[k] || (x.status !== 'nicht_sp_pflichtig' ? 'husp:' + k : null);
    return `<section class="panel"><h3 style="margin-top:0">${k === 'HU' ? esc(t('hu_long')) : esc(t('sp_long'))} <span class="chip ${HS_CLS[x.status] || ''}">${esc(t('hs_' + x.status))}</span></h3>
      <dl class="kv"><dt>${esc(t('last_done'))}</dt><dd>${fmtD(x.last_done)}${x.last_result ? ` · ${esc(t('res_' + x.last_result))}` : ''}</dd>
      <dt>${esc(t('next_due'))}</dt><dd data-hsdue="${esc(k)}">${x.due ? `<b>${isMonthEnd(x.due) ? `${esc(t('due_until_end'))} ${mY(x.due)}` : `${esc(t('due_until_day'))} ${fmtD(x.due)}`}</b> <span class="small muted">(${esc(t('db_' + x.due_basis))})</span>` : '–'}</dd>
      ${x.prognosis ? `<dt>${esc(t('prognosis'))}</dt><dd>${mY(x.prognosis)} <span class="small muted">(${esc(t('not_binding'))})</span></dd>` : ''}
      ${x.planned_date ? `<dt>${esc(t('planned_appt'))}</dt><dd>${fmtD(x.planned_date)}</dd>` : ''}
      <dt>${esc(t('evidence'))}</dt><dd>${esc(x.last_evidence || '–')}</dd></dl>
      ${canEdit && rid && !h.rules[k] ? `<p class="small muted noprint" data-hsvirt="${esc(k)}">${esc(t('husp_virtual_hint'))}</p>` : ''}
      ${x.notes && x.notes.length ? `<ul class="small" style="margin:8px 0 0 18px">${x.notes.map((n, i) => `<li>${esc(huNote(x, i))}</li>`).join('')}</ul>` : ''}
      ${canEdit && rid && x.status !== 'nicht_sp_pflichtig' ? `<details><summary>${esc(t('record_done'))}</summary><form data-hsdone="${esc(rid)}" data-hskind="${esc(k)}"><label>${esc(t('date'))}</label><input type="date" name="done_date" required max="${esc(bDate())}" value="${esc(x.planned_date && x.planned_date <= bDate() ? x.planned_date : '')}">${x.planned_date && x.planned_date <= bDate() ? `<p class="small muted" data-hsfromplan>${esc(t('mdone_from_plan'))}</p>` : ''}<label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('evidence_ph'))}">
        <label>${esc(t('result'))}</label><select name="result"><option value="">–</option>${['ohne_maengel', 'geringe_maengel', 'erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'].map((r) => `<option value="${r}">${esc(t('res_' + r))}</option>`).join('')}</select>
        <label>${esc(t('documented_due'))}</label><input type="date" name="next_due_date"><p class="small muted" data-hsreshint>${esc(t('husp_done_hint'))}</p>${k === 'HU' && spSame ? `<label class="check" style="margin-top:10px"><input type="checkbox" name="sp_same" data-hsspsame> ${esc(t('hs_sp_same'))}</label><div data-hsspbox hidden><label>${esc(t('result'))} (${esc(t('sp_long'))})</label><select name="sp_result"><option value="">–</option>${['ohne_maengel', 'geringe_maengel', 'erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'].map((r) => `<option value="${r}">${esc(t('res_' + r))}</option>`).join('')}</select><p class="small muted">${esc(t('hs_sp_same_hint'))}</p></div>` : ''}${docOk ? `<label>${esc(t('hs_report_file'))}<span class="hint">${esc(t('hs_report_file_hint'))}</span></label><input type="file" name="report_file" accept="application/pdf,image/jpeg,image/png,image/webp">` : ''}<div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>
        <details><summary>${esc(t('plan_appt'))}</summary><form data-hsplan="${esc(rid)}" data-hskind="${esc(k)}"><label>${esc(t('planned_appt'))}</label><input type="date" name="planned_date" value="${esc(x.planned_date || '')}"><p class="small muted">${esc(t('plan_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>${maintOrderHtml(rid, k, orders, v)}` : ''}</section>`;
  };
  const clsList = v.kind === 'anhaenger' ? ['bis_3_5', '3_5_10', 'ueber_10'] : ['bis_3_5', '3_5_7_5', '7_5_12', 'ueber_12'];
  return `<h2>${esc(t('hu_sp'))}</h2><div class="grid2">${card('HU', h.hu)}${card('SP', h.sp)}</div>
    <p class="small muted">${esc(t('zgm'))}: ${v.zgm_kg ? `${fmtNum(v.zgm_kg)} kg` : v.zgm_class ? esc(t('zc_' + v.zgm_class)) : '–'} · ${esc(t('first_reg'))}: ${fmtD(v.first_registration)}${v.spec_source ? ` · ${esc(t('evidence'))}: ${esc(v.spec_source)}` : ''} · ${h.rule_ref ? `${esc(h.rule_ref)} (${esc(t('rule_checked_on').replace('{d}', fmtD(h.rule_checked)))})` : esc(h.rule_version)}</p>
    ${isMgr() ? `<details class="panel"><summary>${esc(t('edit_spec'))}</summary><form id="specf"><input type="hidden" name="expected_updated_at" value="${esc(v.updated_at || '')}"><label>${esc(t('zgm'))} (kg, F.2)</label><input name="zgm_kg" inputmode="numeric" value="${esc(v.zgm_kg || '')}">
      <label>${esc(t('zgm_class'))}</label><select name="zgm_class"><option value="">–</option>${clsList.map((c) => `<option value="${c}"${v.zgm_class === c ? ' selected' : ''}>${esc(t('zc_' + c))}</option>`).join('')}</select>
      <label>${esc(t('first_reg'))} (B)</label><input type="date" name="first_registration" value="${esc(v.first_registration || '')}"><label>${esc(t('evidence'))}</label><input name="spec_source" required placeholder="${esc(t('spec_src_ph'))}">
      <div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}`;
}
const VNOTES_MAX = 20;
// Hinweise zum Fahrzeug (angeheftet): eigene Abfrage nach dem Aufbau der Akte, Archiv auf Wunsch
async function loadVehicleNotes(vid, showArchive = false) {
  const box = $('#vnotes'); if (!box) return;
  const base = '/api/vehicles/' + encodeURIComponent(vid) + '/notes';
  let r; try { r = await api('GET', base); } catch { box.hidden = true; return; }
  const arr = showArchive ? await api('GET', base + '?archived=1').catch(() => ({ notes: [] })) : null; const ar = arr ? arr.notes : null;
  if (!box.isConnected) return; // Ansicht inzwischen gewechselt (z. B. Link angeklickt, während das Archiv lud)
  const nMax = r.max_active || VNOTES_MAX; // Höchstzahl aktiver Hinweise (Server NOTES_MAX_ACTIVE): voll → Hinweis statt Formular
  box.innerHTML = `<h3 style="margin-top:0">${esc(t('vnotes'))}${r.notes.length ? ` <span class="chip mittel">${r.notes.length}</span>` : ''}</h3>
    ${r.notes.length ? `<ul class="vnotes">${r.notes.map((n) => `<li><b>${esc(n.text)}</b>${n.for_driver ? ` <span class="chip">${esc(t('vnote_driver_chip'))}</span>` : ''}${n.valid_until ? ` <span class="chip">${esc(t('vnote_until').replace('{d}', fmtD(n.valid_until)))}</span>` : ''}<div class="small muted">${esc(pnm(n.created_by_name, n.created_by_name_hidden))}${n.created_by_active === false && !n.created_by_name_hidden ? ` <span class="chip" data-noteinactive>${esc(t('vnote_author_inactive'))}</span>` : ''} · ${fmtDT(n.created_at)}</div>${r.can_write ? `<button type="button" class="linkbtn noprint" data-arch="${esc(n.id)}">${esc(t('vnote_archive'))}</button>` : ''}</li>`).join('')}</ul>` : `<p class="small muted">${esc(t('vnotes_none'))}</p>`}
    ${r.can_write && r.notes.length >= nMax ? `<p class="small muted noprint" id="vnfull">${esc(t('vnotes_full').replace('{max}', nMax))}</p>` : ''}${r.can_write && r.notes.length < nMax ? `<details class="noprint"><summary>${esc(t('vnote_add'))}${r.notes.length >= nMax / 2 ? ` <span class="small muted" id="vnfree">(${esc(t('vnotes_free').replace('{n}', nMax - r.notes.length).replace('{max}', nMax))})</span>` : ''}</summary><form id="vnf"><label for="vnt">${esc(t('vnote_text'))}</label><textarea id="vnt" name="text" maxlength="500" required></textarea>
      <label class="check"><input type="checkbox" name="for_driver"> ${esc(t('vnote_for_driver'))}</label><label for="vnv">${esc(t('vnote_valid'))}<span class="hint">${esc(t('vnote_valid_hint'))}</span></label><input type="date" id="vnv" name="valid_until" style="max-width:220px"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}
    <p class="noprint"><button type="button" class="linkbtn" id="vnar">${esc(showArchive ? t('vnote_hide_archive') : t('vnote_show_archive'))}</button></p>
    ${ar ? (ar.length ? `<ul class="vnotes small muted">${ar.map((n) => `<li><s>${esc(n.text)}</s> · ${fmtDT(n.created_at)} – ${n.archived_at ? `${esc(t('vnote_archived'))} ${fmtDT(n.archived_at)}${n.archived_by_name ? ' · ' + esc(n.archived_by_name) : ''}` : esc(t('vnote_expired').replace('{d}', fmtD(n.valid_until)))}</li>`).join('')}</ul>${arr.truncated ? `<p class="small muted" id="vnartrunc">${esc(t('vnote_arch_truncated').replace('{n}', ar.length))} <a href="${tlHash(encodeURIComponent(vid), 'note')}">${esc(t('timeline'))}</a></p>` : ''}` : `<p class="small muted">–</p>`) : ''}`;
  $$('[data-arch]', box).forEach((b) => (b.onclick = async () => { try { await api('POST', `${base}/${b.dataset.arch}/archive`, undefined, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805g */ loadVehicleNotes(vid, showArchive); } catch (err) { toast(err.message, true); } }));
  $('#vnar', box).onclick = () => loadVehicleNotes(vid, !showArchive);
  if ($('#vnf', box)) $('#vnf', box).onsubmit = async (e) => { e.preventDefault(); const fd = new FormData(e.target);
    const nb = { text: fd.get('text'), for_driver: fd.get('for_driver') === 'on', valid_until: fd.get('valid_until') || null }; nb.request_key = rkFor(e.target, nb); // Backlog 804: Zeitlimit, Wiederholung ohne zweiten Hinweis
    try { await api('POST', base, nb, { timeoutMs: SEND_TIMEOUT_MS }); loadVehicleNotes(vid, showArchive); } catch (err) { toast(err.message, true); } };
}
async function viewVehicle(id, focusEv = null, sec = null) {
  const d = await api('GET', '/api/vehicles/' + encodeURIComponent(id));
  const v = d.vehicle;
  const canMaint = isMgr() || S.me.role === 'workshop';
  const fi = d.failed_inspection; const fiHtml = fi ? `<div class="panel alert" role="alert" id="vfi"><b>${esc(t('dispo_insp_defects'))}</b><div>${esc(mk(fi.kind))} · ${fmtD(fi.done_date)} · <span class="chip kritisch">${esc(t('res_' + fi.result))}</span></div><div class="small">${esc(t('dispo_insp_hint'))}</div>${isMgr() ? `<div class="actions noprint"><button type="button" class="btn secondary" id="vfi-go">${esc(t('md_create'))}</button></div>` : ''}</div>` : '';
  // Offene Agentenbefunde dieses Fahrzeugs (Server liefert sie nur Inhaber/Fuhrparkleitung); bei kritischen aufgeklappt
  const AFS = { kritisch: 'kritisch', handeln: 'mittel', hinweis: '', info: '' };
  const af = d.agent_findings || [];
  const afHtml = af.length ? `<details class="panel" id="vaf"${af.some((f) => f.severity === 'kritisch') ? ' open' : ''}><summary><b>${esc(t('veh_findings'))}</b> <span class="chip ${AFS[af[0].severity]}">${af.length}</span></summary><div class="list" style="margin-top:8px">${af.map((f) => `<div class="row ${f.severity === 'kritisch' ? 'p-kritisch' : f.severity === 'handeln' ? 'p-mittel' : ''}"><span class="chip ${AFS[f.severity]}">${esc(t('asev_' + f.severity))}</span><span class="title" style="white-space:normal">${fcLabel(f.finding_code)}${esc(fMsg(f.message_args, f.message))}</span><span>${afLink(f.case_id, f.finding_code, f.subject_key)}</span><span class="sub" style="white-space:normal">${esc(translateNextAction(S.lang, f.next_action))} · ${esc(t('open_since'))} ${fmtDT(f.first_seen)}</span></div>`).join('')}</div><p class="small muted">${esc(t('veh_findings_hint'))} <a class="noprint" href="#/master?q=${encodeURIComponent(v.plate)}" id="vafm">${esc(t('nav_master'))} ›</a></p></details>` : '';
  // Prüfergebnis fehlt (in der App erfasste Pflichtprüfung ohne Ergebnis) – Knopf öffnet das Formular in „Bisherige Durchführungen“
  const rmHtml = (d.result_missing || []).length ? `<div class="panel" id="vrm"><b>${esc(t('dq_inspection_no_result'))}</b><div>${d.result_missing.map((r) => `${esc(mk(r.kind))} · ${fmtD(r.done_date)}`).join(' · ')}</div>${canMaint ? `<div class="actions noprint">${d.result_missing.map((r) => `<button type="button" class="btn secondary" data-rmgo="${esc(r.event_id)}">${esc(t('res_add_go'))}: ${esc(mk(r.kind))}</button>`).join('')}</div>` : ''}</div>` : '';
  // Backlog 883 (Blickwinkel „Lkw kommt aus der Fremdwerkstatt mit Rechnung, aber ohne Prüfbericht“): Prüfbericht fehlt → direkt hochladen
  const docRoom = (d.documents || []).length < VEH_DOCS_MAX;
  const nrHtml = (d.report_missing || []).length ? `<div class="panel" id="vnr"><b>${esc(t('dq_husp_no_report'))}</b><div>${d.report_missing.map((r) => `${esc(mk(r.kind))} · ${fmtD(r.done_date)}`).join(' · ')}</div><p class="small muted">${esc(t('nr_hint'))}</p>${docRoom ? `<div class="actions noprint">${d.report_missing.map((r) => `<button type="button" class="btn secondary" data-nrgo="${esc(`${r.kind} ${r.done_date}`)}">${esc(t('nr_go'))}: ${esc(mk(r.kind))}</button>`).join('')}</div>` : `<p class="small muted noprint">${esc(t('docs_full').replace('{max}', VEH_DOCS_MAX))}</p>`}</div>` : '';
  let html = `<p class="noprint"><a class="backlink" href="#/vehicles">‹ ${esc(t('back'))}</a></p><div>${plate(v.plate, { big: true, locked: d.locked ?? d.cases.some((c) => c.safety_lock && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)) })}</div>
    <h1 style="margin-top:12px" data-title="${esc(v.plate)} · ${esc(t('vehicle_file'))}" aria-label="${esc(t('vehicle_file'))} ${esc(v.plate)}">${esc(t('vehicle_file'))}</h1><p class="print-only small">${printStamp()} · CEVIK ${esc(t('app'))} [CLAUDE]</p>${S.me.shared_readonly ? `<p class="panel warn small noprint" role="note" id="sharedro">ⓘ ${esc(t('shared_readonly_note'))}</p>` : ''}${fiHtml}${rmHtml}${nrHtml}${afHtml}<section class="panel"><dl class="kv"><dt>${esc(t('vin'))}</dt><dd translate="no">${esc(v.vin)}</dd>${(d.former_plates || []).length ? `<dt>${esc(t('former_plates'))}</dt><dd data-formerplates>${d.former_plates.map((x) => `${esc(x.plate)} <span class="small muted" style="white-space:nowrap">(${esc(t('former_plate_until').replace('{d}', fmtD(x.valid_until)))})</span>`).join(', ')}</dd>` : ''}<dt>${esc(t('manufacturer'))}</dt><dd>${esc(v.manufacturer || '–')} ${esc(v.model || '')}</dd><dt>${esc(t('year'))}</dt><dd>${esc(v.build_year || '–')}</dd><dt>${esc(t('site'))}</dt><dd>${esc(v.site || '–')}</dd><dt>${esc(t('vehicle_kind'))}</dt><dd>${esc(t('vk_' + (v.kind || 'lkw')))}</dd>${v.kind === 'anhaenger' ? `<dt>${esc(t('truck'))}</dt><dd>${(d.coupled || []).map((c) => `<a href="#/vehicles/${encodeURIComponent(c.id)}">${esc(c.plate)}</a>${c.locked ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}`).join(', ') || '–'}</dd>` : `<dt>${esc(t('trailer'))}</dt><dd>${(d.coupled || []).length ? d.coupled.map((c) => `<a href="#/vehicles/${encodeURIComponent(c.id)}">${esc(c.plate)}</a>${c.locked ? ` <span class="chip kritisch">${esc(t('locked'))}</span>` : ''}`).join(', ') : esc(v.trailer_plate || '–')}</dd>`}<dt>${esc(t('km'))}</dt><dd>${d.odometer[0] ? fmtKm(d.odometer[0].km) + ' · ' + fmtD(d.odometer[0].measured_at) : '–'}</dd>${v.kind !== 'anhaenger' ? `<dt>${esc(t('last_check'))}</dt><dd>${d.last_check ? `${fmtDT(d.last_check.created_at)} <span class="chip ${d.last_check.result === 'ok' ? 'ok' : 'kritisch'}">${d.last_check.result === 'ok' ? 'OK' : esc(t('defect'))}</span> <span class="small muted">${esc(pnm(d.last_check.performed_by_name, d.last_check.performed_by_name_hidden))}</span>` : esc(t('last_check_none'))}<div class="small muted">${esc(t('last_check_info'))}</div></dd>` : ''}</dl></section>`;
  if (!v.active) { const ia = d.inactive_info; html += `<div class="panel alert" data-inactive>${esc(t('vehicle_inactive'))}${ia ? `<div class="small">${esc(t('inactive_since'))} ${fmtDT(ia.since)}${ia.by_name ? ' · ' + esc(ia.by_name) : ''}${ia.reason ? ` · ${esc(t('inactive_reason'))}: ${esc(ia.reason)}` : ''}</div>` : ''}${isMgr() ? `<div class="actions noprint"><button type="button" class="btn secondary" data-goto="react">${esc(t('activate_vehicle'))}</button></div>` : ''}</div>`; }
  // Standort laut offenem Vorgang (Migration 0079): abgeschleppt / steht nicht am Standort – oben in der Akte statt nur im Vorgang
  { const vlc = d.cases.filter((c) => OPEN_CASE_ST.includes(c.status) && (c.vehicle_location || c.tow_service));
    // Backlog 424: offener Vorgang mit fehlendem Schlüssel/Fahrzeugschein – in der Fahrzeugakte oben (Disposition/Leitung suchen dort zuerst)
    const hoc = d.cases.filter((c) => hoMissing(c).length);
    // Abholvermerk des letzten Werkstattaufenthalts (Backlog 425): nur solange das Fahrzeug nicht wieder bei einer Werkstatt ist
    const puLast = d.cases.filter((c) => c.status === 'fahrzeug_freigegeben' && c.closed_at).sort((x, y) => (y.closed_at > x.closed_at ? 1 : -1))[0];
    if (puLast && puLast.pickup_note && !d.cases.some((c) => ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'].includes(c.status))) html += `<div class="panel small" id="vpickup"><b>${esc(t('pu_title'))}:</b> <span${langAttr(puLast.pickup_note)}>${esc(puLast.pickup_note)}</span> – <a href="#/cases/${esc(puLast.id)}" translate="no">${esc(puLast.case_no)}</a> · ${esc(t('st_fahrzeug_freigegeben'))} ${fmtDT(puLast.closed_at)}</div>`;
    if (hoc.length) html += `<div class="panel warn" id="vho">${hoc.map((c) => `<b>${esc(t('ho_title'))}:</b> ${esc(hoMissing(c).join(', '))} – <a href="#/cases/${esc(c.id)}" translate="no">${esc(c.case_no)}</a>`).join('<br>')}</div>`;
    if (vlc.length) html += `<div class="panel warn" id="vvehloc">${vlc.map((c) => `<b>${esc(t('vl_title'))}:</b> ${c.vehicle_location ? esc(c.vehicle_location) : c.location_note ? `${esc(t('location_shown'))}: ${esc(c.location_note)}` : `<span class="muted">${esc(t('vl_unknown'))}</span>`}${c.tow_service ? ` · <span class="chip mittel">${esc(t('vl_towed_chip'))}</span> ${esc(c.tow_service)}${c.towed_on ? ' · ' + fmtD(c.towed_on) : ''}` : ''}${vlAt(c)} – <a href="#/cases/${esc(c.id)}" translate="no">${esc(c.case_no)}</a>`).join('<br>')}</div>`; }
  if (S.me.role !== 'driver') html += `<section class="panel" id="vnotes" aria-live="polite"></section>`;
  if (v.eval_excluded) html += `<div class="panel alert"><b>${esc(t('eval_excluded'))}</b> – ${esc(t('eval_excluded_hint'))}${v.eval_excluded_reason ? `<div class="small">${esc(v.eval_excluded_reason)}</div>` : ''}${isMgr() && v.active ? `<div class="actions noprint"><button type="button" class="btn secondary" data-goto="evx">${esc(t('eval_include'))}</button></div>` : ''}</div>`;
  html += `<div class="actions noprint"><a class="btn secondary" href="#/vehicles/${esc(v.id)}/timeline">${esc(t('timeline'))}</a><a class="btn secondary" href="#/emergency?v=${esc(v.id)}&from=file">☎ ${esc(t('em_title'))}</a>${isMgr() ? `<a class="btn secondary" href="#/vehicles/qr/${esc(v.id)}">${esc(t('qr_sticker'))}</a>` : ''}${S.me.role === 'owner' ? `<a class="btn secondary" href="#/audit?v=${esc(v.id)}" title="${esc(t('audit_veh_hint'))}">${esc(t('audit'))}</a>` : ''}<button type="button" class="btn secondary" id="prt">${esc(t('print'))}</button></div>`;
  // „Was fehlt noch?“ je Fahrzeug (Backlog 373, Teilagent „Neuer Lkw kommt in den Bestand“): Befunde der Datenqualität nur zu diesem Fahrzeug –
  // erst beim Aufklappen geladen (Abfrage über die ganze Flotte, die Akte bleibt schnell); ruhende/außer Betrieb genommene prüft die Datenqualität nicht
  if (isMgr() && v.active && !v.eval_excluded) html += `<details class="panel noprint" id="vdq"><summary>${esc(t('vdq_title'))}</summary><div id="vdqbody"><p class="muted">${esc(t('loading'))}</p></div></details>`;
  if (isMgr()) html += `<details class="panel"><summary>${esc(t('edit_master'))}</summary><form id="evf"><input type="hidden" name="expected_updated_at" value="${esc(v.updated_at || '')}">${vehicleForm(v)}<div class="actions"><button class="btn">${esc(t('save'))}</button>${v.active ? `<button type="button" class="btn secondary" id="deact">${esc(t('deactivate_vehicle'))}</button>` : `<button type="button" class="btn secondary" id="react">${esc(t('activate_vehicle'))}</button>`}<button type="button" class="btn secondary" id="evx">${esc(v.eval_excluded ? t('eval_include') : t('eval_exclude'))}</button></div></form></details>`;
  // Link zur Datenqualität nur, wenn sie geöffnet werden darf (Inhaber/Leitung) und das Fahrzeug dort erscheint (in Betrieb, nicht ruhend) – 20.10.2026
  const dqLink = (href) => (isMgr() && v.active && !v.eval_excluded ? ` · <a href="${href}">${esc(t('show_in_dq'))} ›</a>` : '');
  if (d.telematics && d.telematics.length) html += `<section class="panel"><h3 style="margin-top:0">${esc(t('tm_live'))}</h3>${d.telematics.map((x) => `${x.reported_plate ? `<p class="small" style="color:var(--stop)" data-tmmism>⚠ ${esc(t('dq_telematics_plate_mismatch'))}: ${esc(provL(x.provider))} ${esc(x.external_id || '')} → ${esc(t('tm_reports'))} <b>${esc(x.reported_plate)}</b>${dqLink('#/quality?f=telematics_plate_mismatch')}</p>` : ''}<dl class="kv"><dt>${esc(t('tm_source'))}</dt><dd>${esc(provL(x.provider))} (${esc(x.match_basis === 'vin' ? t('vin') : t('tm_mappings'))})</dd><dt>${esc(t('tm_time'))}</dt><dd>${fmtDT(x.gps_time || x.received_at)}${x.gps_time && tmAge(x.gps_time) ? ` <span class="chip">${esc(tmAge(x.gps_time))}</span>` : ''}</dd>${x.km !== null ? `<dt>${esc(t('km'))}</dt><dd>${fmtKm(x.km)}${x.km_rejected_below !== null && x.km_rejected_below !== undefined ? ` <span class="small" style="color:var(--mid)" data-tmkm>⚠ ${esc(tmKmRej('below', x.km_rejected_below))}${dqLink('#/quality?f=telematics_km_rejected')}</span>` : x.km_rejected_above ? ` <span class="small" style="color:var(--mid)" data-tmkm="above">⚠ ${esc(tmKmRej('above', x.km_rejected_above.km, x.km_rejected_above.at))}${dqLink('#/quality?f=telematics_km_rejected')}</span>` : ''}</dd>` : ''}${x.ignition !== null ? `<dt>${esc(t('tm_ignition'))}</dt><dd>${esc(t(x.ignition ? 'tm_on' : 'tm_off'))}</dd>` : ''}${x.lat !== null && x.lon !== null ? `<dt>${esc(t('tm_position'))}</dt><dd><a href="https://www.openstreetmap.org/?mlat=${x.lat}&mlon=${x.lon}#map=14/${x.lat}/${x.lon}" target="_blank" rel="noopener noreferrer">${x.lat.toFixed(4)}, ${x.lon.toFixed(4)}</a></dd>` : ''}</dl>`).join('')}</section>`;
  if (d.tacho) html += `<section class="panel"><h3 style="margin-top:0">${esc(t('tacho_vu'))}</h3><dl class="kv"><dt>${esc(t('tacho_last'))}</dt><dd>${d.tacho.last ? fmtD(d.tacho.last) : '–'}</dd><dt>${esc(t('tacho_due'))}</dt><dd>${d.tacho.due ? fmtD(d.tacho.due) + ' ' : ''}<span class="chip ${TST[d.tacho.status]}">${esc(t('tst_' + d.tacho.status))}</span></dd></dl>
    ${(d.tacho_downloads || []).length ? `<details id="vthist"><summary>${esc(t('history'))} (${d.tacho_downloads.length}${d.tacho_downloads_truncated ? '+' : ''})</summary>${tachoHistList(d.tacho_downloads, isMgr())}${d.tacho_downloads_truncated ? `<p class="small muted vtrunc">${esc(t('hist_truncated').replace('{n}', d.tacho_downloads.length))}</p>` : ''}</details>` : ''}
    <form id="tvf" class="actions" style="flex-wrap:wrap;align-items:flex-end"><div><label>${esc(t('tacho_date'))}</label><input type="date" name="downloaded_on" required value="${bDate()}"></div><div style="flex:1;min-width:200px"><label>${esc(t('evidence'))}</label><input name="evidence" required placeholder="${esc(t('tacho_ev_ph'))}"></div><button class="btn secondary">${esc(t('tacho_record'))}</button></form></section>`;
  if (d.costs) html += `<section class="panel"><h3>${esc(t('costs'))}</h3><dl class="kv"><dt>${esc(t('actual_cost'))}</dt><dd>${eurIst(d.costs)}</dd><dt>${esc(t('estimate'))}</dt><dd>${eur(d.costs.estimate_net)}</dd><dt>${esc(t('unvalued'))}</dt><dd>${d.costs.unvalued_items}</dd>${d.claims_summary && d.claims_summary.total ? `<dt>${esc(t('claims'))}</dt><dd>${d.claims_summary.total}${d.claims_summary.open ? ` · <a href="#/claims" id="vclaims">${esc(t('claim_f_open'))}: ${d.claims_summary.open}</a>` : ''}${d.claims_summary.reimbursed_net !== null ? ` · ${esc(t('claim_reimbursed_short'))} ${eur(d.claims_summary.reimbursed_net)}` : ''}</dd>` : ''}</dl>${d.claims_summary && d.claims_summary.reimbursed_net !== null ? `<p class="small muted">${esc(t('vc_claims_rule'))}</p>` : ''}</section>`;
  // Ausfall je Monat (Werkstatt-Übernahme bis Freigabe und Sperrzeit, Überschneidungen einmal) – nur Monate mit Ausfall, neueste zuerst
  if (d.downtime && d.downtime.total_h) html += `<section class="panel" id="vdown"><h3>${esc(t('vd_title').replace('{n}', d.downtime.max_months))}</h3><dl class="kv">${d.downtime.months.filter((x) => x.hours).map((x) => `<dt>${esc(fmtMonth(x.month))}</dt><dd>${dur(x.hours)}${x.pct !== null && x.pct !== undefined ? ` <span class="muted">· ${esc(t('kpi_av_short'))} ${esc(fmtNum(x.pct, { minimumFractionDigits: 1, maximumFractionDigits: 1 }))} %</span>` : ''}</dd>`).join('')}<dt><b>${esc(t('vd_total'))}</b></dt><dd><b>${dur(d.downtime.total_h)}</b></dd></dl><p class="small muted">${esc(t('vd_rule'))}</p></section>`;
  if (d.warranties && d.warranties.length) html += `<section class="panel"><h3>${esc(t('vi_warranty'))}</h3><ul class="vnotes">${d.warranties.map((w) => `<li><a href="#/cases/${esc(w.case_id)}" translate="no">${esc(w.case_no)}</a> · ${esc(w.item)}${w.item_kind === 'part' && w.supplier ? ` <span class="small muted">(${esc(supplierLabel(w.supplier))})</span>` : ''}${warrChip(w.warranty_until)}</li>`).join('')}</ul>${d.warranties_truncated ? `<p class="small" role="note" data-warrmore>${esc(t('warr_more').replace('{n}', d.warranties_max))}</p>` : ''}</section>`;
  const mOrders = new Map(d.cases.filter((c) => c.maintenance_rule_id && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)).map((c) => [c.maintenance_rule_id, c]));
  // Backlog 415: laufender Wartungs-/Full-Service-Vertrag → Hinweis im Formular „Werkstattauftrag erstellen“ (Leitung; Verträge nur für sie geliefert)
  const svcRun = (d.contracts || []).filter((c) => c.kind === 'wartung' && !c.ended_on && (!c.start_date || c.start_date <= bDate()) && (!c.end_date || c.end_date >= bDate()));
  const vS = svcRun.length ? { ...v, svc: svcRun } : v;
  if (d.hu_sp) html += huSpHtml(d.hu_sp, vS, canMaint, mOrders, canMaint && !!d.documents && d.documents.length < VEH_DOCS_MAX);
  html += `<h2>${esc(t('maintenance'))}</h2>${d.maintenance.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('kind'))}</th><th>${esc(t('last_done'))}</th><th>${esc(t('next_due'))}</th>${canMaint ? '<th></th>' : ''}</tr></thead><tbody>${d.maintenance.map((m) => { const rcDone = m.kind === 'Rückruf' && !!m.last_done_date; const rcOpen = m.kind === 'Rückruf' && !m.last_done_date; const hs = ['HU', 'SP'].includes(m.kind) && d.hu_sp ? d.hu_sp[m.kind.toLowerCase()] : null; const hsNo = !!hs && hs.status === 'nicht_sp_pflichtig'; const nd = hs ? (hsNo ? null : hs.due || null) : m.next_due_date; /* HU/SP: Frist nach der zentralen Regel wie der HU/SP-Block (21.10.2026: Rohwert zeigte „überfällig“ trotz „nicht SP-pflichtig“) */ const days = nd ? Math.round((Date.parse(nd.slice(0, 10) + 'T00:00:00Z') - Date.parse(bDate() + 'T00:00:00Z')) / 86400000) : null; return `<tr><td>${esc(mkR(m))}</td><td>${m.last_done_date || m.last_done_km === null || m.last_done_km === undefined ? fmtD(m.last_done_date) : ''}${m.last_done_km !== null && m.last_done_km !== undefined && !['HU', 'SP'].includes(m.kind) ? `${m.last_done_date ? '<br>' : ''}<span class="small">${fmtKm(m.last_done_km)}</span>` : ''}</td><td>${nd && !rcDone ? `<span class="chip ${days < 0 ? 'kritisch' : days <= (Number.isFinite(d.maintenance_warn_days) ? d.maintenance_warn_days : 30) ? 'mittel' : ''}">${fmtD(nd)}${days < 0 ? ` · <span data-mover>${esc(t('ms_ueberfaellig'))}</span>` : ''}</span>` : hsNo ? `<span class="chip">${esc(t('hs_nicht_sp_pflichtig'))}</span>` : rcDone ? `<span class="chip">${esc(t('ms_erledigt'))}</span>` : rcOpen ? `<span class="chip mittel">${esc(t('vi_recall_open'))}</span>` : (ruleDueKm(m) !== null ? '' : '–')}${kmDueHtml(m, d.odometer[0])}</td>${canMaint ? `<td>${rcDone ? '' : `<button class="btn secondary" data-done="${esc(m.id)}" aria-expanded="false">${esc(t('done'))}</button>`}</td>` : ''}</tr><tr><td colspan="${canMaint ? 4 : 3}" class="small muted" style="border-top:0;padding-top:0">${esc(t('evidence'))}: ${esc(mEv(m.evidence))}${m.km_forecast ? `<br>${esc(kmFcHint(m.km_forecast))}` : ''}${m.planned_date ? ` · <b>${esc(t('planned_appt'))} ${fmtD(m.planned_date)}</b>` : ''}${canMaint && !rcDone && !['HU', 'SP'].includes(m.kind) ? `<details class="noprint"><summary>${esc(t('plan_appt'))}</summary><form data-hsplan="${esc(m.id)}"><label>${esc(t('planned_appt'))} (${esc(mk(m.kind))})</label><input type="date" name="planned_date" value="${esc(m.planned_date || '')}"><p class="small muted">${esc(t('plan_hint'))}</p><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>` : ''}${!rcDone && !['HU', 'SP'].includes(m.kind) ? maintOrderHtml(m.id, m.kind, mOrders, vS) : ''}${isMgr() && !['HU', 'SP'].includes(m.kind) ? maintEditHtml(m) : ''}</td></tr>`; }).join('')}</tbody></table></div>${canMaint ? d.maintenance.filter((m) => !(m.kind === 'Rückruf' && m.last_done_date)).map((m) => maintDoneForm(m, v, d.odometer && d.odometer[0])).join('') : ''}` : noneP()}`;
  if (d.maintenance_history && d.maintenance_history.length) {
    const evOrders = new Map(d.cases.filter((c) => c.maintenance_event_id && !['fahrzeug_freigegeben', 'abgelehnt'].includes(c.status)).map((c) => [c.maintenance_event_id, c]));
    const yearAgo = bDate(-365);
    // Berliner Kalendertag der Meldung wie der Server (berlinDaySql) – UTC-Vergleich verfehlte Meldungen 00:00–02:00 Uhr am Prüftag (21.10.2026)
    const caseSince = (h) => d.cases.some((c) => c.status !== 'abgelehnt' && BERLIN_FMT.format(new Date(c.created_at)) >= h.done_date);
    // Mängelauftrag freigegeben, aber keine neuere Durchführung derselben Prüfart → Nachprüfung eintragen (gleiche Regel wie der Server)
    const releasedFor = (h) => {
      if (!DEFECT_RESULTS.includes(h.result) || h.done_date < yearAgo || evOrders.has(h.id)) return null;
      if (d.maintenance_history.some((e) => e.id !== h.id && e.kind === h.kind && (e.done_date > h.done_date || (e.done_date === h.done_date && e.created_at > h.created_at)))) return null;
      return d.cases.filter((c) => c.maintenance_event_id === h.id && c.status === 'fahrzeug_freigegeben').sort((a, b) => String(b.closed_at).localeCompare(String(a.closed_at)))[0] || null;
    };
    // Nachprüfung = nächste spätere Durchführung derselben Prüfart (gleiche Regel wie Nachweisliste/Server); umgekehrt: vorherige Prüfung mit Mängeln
    const later = (a, b) => b.done_date > a.done_date || (b.done_date === a.done_date && b.created_at > a.created_at);
    const nextOf = (h) => d.maintenance_history.filter((e) => e.id !== h.id && e.kind === h.kind && (!['Rückruf', 'Sonstiges'].includes(h.kind) || e.rule_id === h.rule_id) && later(h, e)).sort((a, b) => (later(a, b) ? -1 : 1))[0] || null;
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

    html += `<details class="panel" id="mhist"${pending && isMgr() ? ' open' : ''}><summary>${esc(t('maint_history'))} (${d.maintenance_history.length}${d.maintenance_history_truncated ? '+' : ''})</summary>${d.maintenance_history_truncated ? `<p class="small muted" id="mhisttrunc">${esc(t('maint_hist_truncated').replace('{n}', d.maintenance_history.length))} <a href="${tlHash(v.id, 'maintenance')}">${esc(t('timeline'))}</a></p>` : ''}<div class="list">${d.maintenance_history.map((h) => `<div class="row"><span class="chip">${fmtD(h.done_date)}</span><span class="title">${esc(mk(h.kind))}${h.done_km !== null ? ' · ' + fmtKm(h.done_km) : ''}</span>${h.result ? `<span class="chip ${DEFECT_RESULTS.includes(h.result) ? 'kritisch' : h.result === 'ohne_maengel' ? 'ok' : ''}">${esc(t('res_' + h.result))}</span>` : '<span></span>'}<span class="sub" style="white-space:normal">${esc(h.evidence)}${h.recorded_by_name ? ' · ' + esc(h.recorded_by_name) : ''}</span></div>${reinspHtml(h)}${resAddHtml(h)}${defectOrderHtml(h, evOrders, v, caseSince(h), releasedFor(h), !!nextOf(h))}${minorResHtml(h, v, !!nextOf(h))}`).join('')}</div></details>`;
  }
  if (canMaint) html += `<details class="panel"><summary>${esc(t('add_rule'))}</summary><form id="mf"><label>${esc(t('kind'))}</label><select name="kind">${S.meta.maintenance_kinds.map((k) => `<option value="${esc(k)}">${esc(mk(k))}</option>`).join('')}</select><div data-mftitle${S.meta.maintenance_kinds[0] === 'Sonstiges' ? '' : ' hidden'}><label for="mftitle">${esc(t('rule_title'))}</label><input id="mftitle" name="title" maxlength="80" placeholder="${esc(t('rule_title_ph'))}"${S.meta.maintenance_kinds[0] === 'Sonstiges' ? ' required' : ' disabled'}></div><label>${esc(t('last_done'))}</label><input type="date" name="last_done_date" max="${esc(bDate())}"><label>${esc(t('interval_months'))}</label><input name="interval_months" inputmode="numeric"><label>${esc(t('next_due'))}</label><input type="date" name="next_due_date"><label>${esc(t('last_done_km'))}</label><input name="last_done_km" inputmode="numeric"><div id="mfkmw" aria-live="polite"></div><label>${esc(t('interval_km'))}</label><input name="interval_km" inputmode="numeric"><label>${esc(t('due_km_doc'))}</label><input name="due_km" inputmode="numeric"><label>${esc(t('evidence'))}</label><input name="evidence" required><p class="small muted" data-mftacho${S.meta.maintenance_kinds[0] === 'Tachograph' ? '' : ' hidden'}>${esc(t('rule_tacho_hint'))}</p><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
  if (d.documents) {
    const canDoc = ['owner', 'fleet', 'workshop'].includes(S.me.role);
    html += `<h2>${esc(t('documents'))}</h2>${d.documents.length ? `<div class="list">${d.documents.map((f) => `<a class="row" href="${fileUrl(f.id)}" target="_blank" rel="noopener"><span class="chip">${esc(t('dk_' + (f.doc_kind || 'sonstiges')))}</span><span class="title">${esc(f.filename)}</span><span class="small muted">${fmtNum(Math.max(1, Math.round(f.size / 1024)))} ${esc(t('unit_kb'))}</span>${f.doc_status && f.doc_status !== 'gueltig' ? `<span class="chip ${f.doc_status === 'abgelaufen' ? 'kritisch' : f.doc_status === 'laeuft_ab' ? 'mittel' : ''}" data-docst="${esc(f.doc_status)}">${esc(t('docst_' + f.doc_status))}</span>` : ''}<span class="sub" style="white-space:normal">${[f.doc_valid_until && `${esc(t('valid_until'))} ${fmtD(f.doc_valid_until)}`, f.doc_note && esc(f.doc_note), fmtD(f.created_at), esc(f.uploaded_by_name)].filter(Boolean).join(' · ')}</span></a>`).join('')}</div>` : noneP()}
      ${canDoc && d.documents.length ? `<details class="panel noprint" id="docedit-d"><summary>${esc(t('doc_edit'))}</summary><form id="docedit"><label>${esc(t('documents'))}</label><select name="file_id">${d.documents.map((f) => `<option value="${esc(f.id)}">${esc(t('dk_' + (f.doc_kind || 'sonstiges')))} · ${esc(f.filename)} · ${fmtD(f.created_at)}</option>`).join('')}</select><label>${esc(t('doc_kind'))}</label><select name="kind">${(S.meta.doc_kinds || []).map((k) => `<option value="${k}">${esc(t('dk_' + k))}</option>`).join('')}</select><label>${esc(t('note'))}<span class="hint">${esc(t('doc_note_hint'))}</span></label><input name="note" maxlength="200"><label>${esc(t('valid_until'))}<span class="hint">${esc(t('doc_edit_hint'))}</span></label><input type="date" name="valid_until"><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}${canDoc && d.documents.length >= VEH_DOCS_MAX ? `<p class="small muted noprint" id="docfull">${esc(t('docs_full').replace('{max}', VEH_DOCS_MAX))}</p>` : ''}${canDoc && d.documents.length < VEH_DOCS_MAX ? `<details class="panel noprint" id="docadd-d"><summary>${esc(t('add_document'))}${d.documents.length >= VEH_DOCS_MAX / 2 ? ` <span class="small muted" id="docfree">(${esc(t('files_free').replace('{n}', VEH_DOCS_MAX - d.documents.length).replace('{max}', VEH_DOCS_MAX))})</span>` : ''}</summary><form id="docf"><label>${esc(t('doc_kind'))}</label><select name="kind">${(S.meta.doc_kinds || []).map((k) => `<option value="${k}">${esc(t('dk_' + k))}</option>`).join('')}</select><label>${esc(t('note'))}<span class="hint">${esc(t('doc_note_hint'))}</span></label><input name="note" maxlength="200"><label>${esc(t('valid_until'))}<span class="hint">${esc(t('valid_until_hint'))}</span></label><input type="date" name="valid_until"><label>${esc(t('file'))}<span class="hint">${esc(t('doc_file_hint'))}</span></label><input type="file" name="file" accept="application/pdf,image/jpeg,image/png,image/webp" required><div class="actions"><button class="btn">${esc(t('upload'))}</button></div></form></details>` : ''}`;
  }
  if (d.contracts) html += ctSection(d.contracts, d.documents || null);
  html += `<h2 id="tires-h" tabindex="-1" data-keepfocus>${esc(t('tires'))}</h2><div id="tires"><p class="muted">${esc(t('loading'))}</p></div>`;
  html += `<h2>${esc(t('nav_cases'))}</h2>${caseList(d.cases.map((c) => ({ ...c, plate: v.plate })))}`;
  if (d.recurring_defects && d.recurring_defects.length) html += `<section class="panel"><h2 style="margin-top:0">${esc(t('recurring_defects'))}</h2><p class="small muted">${esc(t('recurring_hint'))}</p><ul>${d.recurring_defects.map((r) => `<li><b>${esc(checkLabel(r.item))}</b>: ${r.n}× · ${esc(t('last_used'))} ${fmtD(r.last_at)}</li>`).join('')}</ul></section>`;
  if (d.inspections.length) html += `<h2>${esc(t('inspections'))}</h2><div class="list">${d.inspections.map((i) => `<div class="row"><span class="chip ${i.result === 'ok' ? 'ok' : 'kritisch'}">${i.result === 'ok' ? 'OK' : esc(t('defect'))}</span><span class="title">${esc(i.kind === 'abfahrt' ? t('departure_check') : t('inspection'))}</span><span>${i.odometer_km ? fmtKm(i.odometer_km) : ''}</span><span class="sub${i.received_at ? ' wrap' : ''}">${fmtDT(i.created_at)}${i.received_at ? ` · ${esc(t('insp_received_late').replace('{d}', fmtDT(i.received_at)))}` : ''} · ${esc((pnm(i.performed_by_name, i.performed_by_name_hidden) || t('role_' + i.performed_by_name_role)))}</span></div>`).join('')}</div>${d.inspections_truncated ? `<p class="small muted" id="insptrunc">${esc(t('insp_truncated').replace('{n}', d.inspections.length))} <a href="${tlHash(v.id, 'inspection')}">${esc(t('timeline'))}</a></p>` : ''}`;
  if (isMgr()) {
    html += `<h2${d.drivers.length ? '' : ' class="noprint"'}>${esc(t('drivers'))}</h2>${d.drivers.length ? `<div class="list">${d.drivers.map((r) => `<div class="row"><span>${esc(r.display_name)}</span><span class="small muted"><span style="white-space:nowrap">${fmtD(r.valid_from)} –</span> <span style="white-space:nowrap">${r.valid_to ? fmtD(r.valid_to) : ''}</span></span>${!r.valid_to ? `<button class="btn secondary" data-end="${esc(r.id)}" data-name="${esc(r.display_name)}">${esc(t('end'))}</button>` : '<span></span>'}</div>`).join('')}</div>` : ''}
      ${!v.active ? '' : `<form id="df"><div class="actions"><select name="user_id" id="drvsel" style="max-width:300px" aria-label="${esc(t('assign_driver'))}"></select><button class="btn secondary">${esc(t('assign_driver'))}</button></div><label class="small"><input type="checkbox" id="endprev" checked> ${esc(t('end_previous'))}</label></form>`}`; // außer Betrieb: keine Zuordnung möglich (19.10.2026)
  }
  // Fahrleistung je Monat (nur gespeicherte Ablesungen) – Monate mit Ablesung, neueste zuerst
  if (d.mileage && d.mileage.months.some((x) => x.status !== 'no_reading')) {
    const ml = d.mileage; const last = ml.months.find((x) => x.to_km !== undefined);
    html += `<section class="panel" id="vmile"><h3>${esc(t('vm_title').replace('{n}', ml.max_months))}</h3><dl class="kv">${last ? `<dt>${esc(t('vm_last'))}</dt><dd>${esc(fmtKm(last.to_km))} <span class="muted">· ${fmtD(last.to_at)}</span></dd>` : ''}${ml.months.filter((x) => x.status !== 'no_reading').map((x) => `<dt>${esc(fmtMonth(x.month))}</dt><dd data-vm="${esc(x.status)}">${x.status === 'ok' ? `${esc(fmtKm(x.km))}${x.spans ? ` <span class="muted">· ${esc(t('vm_since').replace('{d}', fmtD(x.from_at)))}</span>` : ''}` : x.status === 'decrease' ? `<span class="muted">${esc(t('vm_decrease'))}</span>` : `<span class="muted">${esc(t('vm_first'))}: ${esc(fmtKm(x.to_km))}</span>`}</dd>`).join('')}${ml.total_km !== null ? `<dt><b>${esc(t('vm_total'))}</b></dt><dd><b>${esc(fmtKm(ml.total_km))}</b></dd>` : ''}</dl><p class="small muted">${esc(t('vm_rule'))}</p></section>`;
  }
  // km erfassen nur mit Recht (Lesezugriff bekam 403, 17.10.2026)
  if (S.me.role !== 'viewer') html += `<details class="panel"><summary>${esc(t('add_km'))}</summary><form id="kf"><label for="kfkm">${esc(t('km'))}${v.kind === 'anhaenger' ? `<span class="hint" id="kfkmtr">${esc(t('mdone_kmtr'))}</span>` : ''}</label>${d.odometer && d.odometer[0] ? `<p class="small muted" id="kflast" style="margin:0 0 4px">${esc(t('irv_last_km').replace('{km}', fmtNum(d.odometer[0].km)).replace('{d}', fmtD(d.odometer[0].measured_at)))}</p>` : ''}<input id="kfkm" name="km" inputmode="numeric" required style="max-width:200px"><div id="kfkmd" aria-live="polite"></div><label>${esc(t('km_date'))}<span class="hint">${esc(t('km_date_hint'))}</span></label><input type="date" name="measured_on" max="${bDate()}" style="max-width:200px"><div id="kmnote" hidden><label>${esc(t('km_reason'))}</label><input name="note" maxlength="300"></div><div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>`;
  if (canMaint) html += `<section class="panel noprint"><h3>${esc(t('ai'))}</h3><div id="ai"></div><button class="btn secondary" id="aib">${esc(t('ai_run'))}</button></section>`;
  render(html, isMgr() ? 'master' : 'vehicles');
  if ($('#vnotes')) loadVehicleNotes(v.id);
  // „Offen: n“ zeigt die Fälle dieses Fahrzeugstandorts (20.10.2026: vorher Standard-Standort aus „Mein Konto“ – Fall des Fahrzeugs fehlte)
  const vcl = $('#vclaims'); if (vcl) vcl.onclick = () => { S.claimSite = v.site || 'ohne'; S.clFilter = 'offen'; };

  // Direktsprung aus Reifen-/Winterlisten (#/vehicles/…?sec=tires, 23.10.2026 Teilagent Reifenwechsel-Saison): Abschnitt Reifen zeigen,
  // Erfassung aufgeklappt – vorher ~4 Bildschirmhöhen Scrollen je Fahrzeug am Umrüsttag
  // Backlog 408: ?sec=wo (aus dem Winterreifen-Auftrag) = Reifen + Umrüstung vorbereitet
  renderTires(id, $('#tires'), sec === 'tires' ? { open: true } : sec === 'wo' ? { open: true, wo: true } : null).then(() => { if (sec !== 'tires' && sec !== 'wo') return; const h = $('#tires-h'); if (h) { h.scrollIntoView({ block: 'start' }); h.focus({ preventScroll: true }); } });
  if (d.contracts) bindCtSection(id, () => viewVehicle(id), d.odometer || []);
  const prt = $('#prt'); if (prt) prt.onclick = () => window.print();
  const docf = $('#docf'); if (docf) docf.onsubmit = async (e) => {
    e.preventDefault(); const file = docf.file.files[0]; if (!file) return;
    const fsig = [file.name, file.size, file.lastModified, docf.kind.value, docf.note.value, docf.valid_until.value].join('|'); // Backlog 805c: Antwort verloren → „War bereits gespeichert“
    try { const blob = file.type === 'application/pdf' ? file : await prepareUpload(file); const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/documents?kind=${encodeURIComponent(docf.kind.value)}&note=${encodeURIComponent(docf.note.value)}${docf.valid_until.value ? '&valid_until=' + docf.valid_until.value : ''}`, blob, { timeoutMs: PHOTO_TIMEOUT_MS, headers: { 'x-filename': encodeURIComponent(file.name), 'content-type': blob.type || 'application/octet-stream' } }); /* Backlog 805c: gleiche Datei = duplicate, nie doppelt */ if (r.duplicate && r.differs) {
        // gleiche Datei mit anderen Angaben: nichts übernommen – Korrekturformular mit den neuen Angaben öffnen (19.10.2026: still verworfen)
        const want = { kind: docf.kind.value, note: docf.note.value, valid_until: docf.valid_until.value };
        toast(t('doc_duplicate_differs'), true); await viewVehicle(id);
        // erst nach dem Wiederherstellen der Seite (keepRestore – ggf. verzögert bis finishRender – setzt alte Feldwerte zurück)
        for (let i = 0; i < 40 && S.pendingRestore; i++) await new Promise((res) => setTimeout(res, 50));
        await new Promise((res) => setTimeout(res, 0));
        const ed = $('#docedit'); const dd = $('#docedit-d');
        if (ed && dd && [...ed.file_id.options].some((o) => o.value === r.id)) { ed.file_id.value = r.id; ed.kind.value = want.kind; ed.note.value = want.note; ed.valid_until.value = want.valid_until; dd.open = true; dd.scrollIntoView({ block: 'start' }); }
      } else { toast(r.duplicate ? t(docf.dataset.lostFile === fsig ? 'saved_before' : 'doc_duplicate') : '✓'); viewVehicle(id); } } catch (err) { if (err && err.offline) docf.dataset.lostFile = fsig; toast(err.message, true); }
  };
  // Angaben eines Dokuments korrigieren (Art, Bemerkung, „gültig bis“) – Formular mit den gelesenen Werten, Server prüft den gelesenen Stand
  const doced = $('#docedit'); if (doced) {
    const cur = () => d.documents.find((f) => f.id === doced.file_id.value);
    // Backlog 817: gelesene Werte auch als Vorgabe (defaultValue/defaultSelected) – Grundlage für den Konfliktvergleich (conflictMine/conflictKeep)
    const fill = () => { const f = cur(); if (!f) return; const k = f.doc_kind || 'sonstiges'; for (const o of doced.kind.options) o.defaultSelected = o.value === k; doced.kind.value = k;
      doced.note.defaultValue = doced.note.value = f.doc_note || ''; doced.valid_until.defaultValue = doced.valid_until.value = f.doc_valid_until || ''; };
    doced.file_id.onchange = fill; fill();
    // Backlog 817 (Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig“): Konflikt beim Korrigieren eines Dokuments → Akte neu laden, dasselbe
    // Dokument wählen, eigene Änderungen zurück ins Formular, Felder der anderen Person markieren (vorher Meldung „Bitte neu laden“, Eingaben gingen verloren)
    if (S.docLost && S.docLost.id === id) { const L = S.docLost; S.docLost = null; if ([...doced.file_id.options].some((o) => o.value === L.file)) { doced.file_id.value = L.file; fill(); const dd = doced.closest('details'); if (dd) dd.open = true; conflictKeep(doced, L, 'doclost'); } else toast(L.msg, true); }
    doced.onsubmit = async (e) => {
      e.preventDefault(); const f = cur(); if (!f) return;
      const db = { file: f.id, kind: doced.kind.value, note: doced.note.value, valid_until: doced.valid_until.value };
      try { const r = await api('PATCH', `/api/vehicles/${encodeURIComponent(id)}/documents/${encodeURIComponent(f.id)}`, { kind: doced.kind.value, note: doced.note.value, valid_until: doced.valid_until.value, expected: { kind: f.doc_kind || 'sonstiges', note: f.doc_note ?? null, valid_until: f.doc_valid_until ?? null } }, { timeoutMs: SEND_TIMEOUT_MS }); toast(r.unchanged ? (lostIs(doced, db) ? t('saved_before') : t('unchanged')) : '✓'); viewVehicle(id); } catch (err) { /* Backlog 805j (Funkloch) */ lostMark(doced, db, err); if (err.code === 'doc_changed') { const m = conflictMine(doced); delete m.seen.file_id; delete m.mine.file_id; S.docLost = { id, file: f.id, msg: err.message, ...m }; viewVehicle(id); return; } toast(err.message, true); }
    };
  }
  // Backlog 810: Konflikt bei Stammdaten/Technik (andere Leitung hat inzwischen gespeichert) → neu laden, eigene Änderungen bleiben im Formular
  if (S.vLost && S.vLost.id === id) { const L = S.vLost; S.vLost = null; const fm = $('#' + L.form); if (fm) conflictKeep(fm, L, 'vlost-' + L.form); }
  const evf = $('#evf'); if (evf) evf.onsubmit = async (e) => { e.preventDefault(); try { await saveVehicleForm(evf, true); toast('✓'); viewVehicle(id); } catch (err) { if (err.code === 'version_conflict') { S.vLost = { id, form: 'evf', ...conflictMine(evf) }; viewVehicle(id); return; } toast(err.message, true); } };
  // Sprung von der Startseite „Prüfergebnis fehlt“ bzw. Knopf in der Akte: Prüfhistorie und Formular „Ergebnis nachtragen“ der Durchführung öffnen
  const openResAdd = (evId, smooth) => { const rf = document.querySelector(`[data-resadd="${CSS.escape(evId)}"]`); const mh = $('#mhist'); if (rf && mh) { mh.open = true; const dt = rf.closest('details'); dt.open = true; dt.style.scrollMarginTop = '90px'; dt.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' }); const sel = rf.querySelector('select'); if (sel) sel.focus({ preventScroll: true }); } };
  if (focusEv) openResAdd(focusEv, false);
  $$('[data-rmgo]').forEach((b) => (b.onclick = () => openResAdd(b.dataset.rmgo, true)));
  // Backlog 883: Formular „Dokument hinzufügen“ öffnen, Art „Prüfbericht“ und Bemerkung „<Art> <JJJJ-MM-TT>“ vorbelegt (wie beim Erledigen)
  $$('[data-nrgo]').forEach((b) => (b.onclick = () => { const dd = $('#docadd-d'); const f = $('#docf'); if (!dd || !f) return; dd.open = true; f.kind.value = 'pruefbericht'; if (!f.note.value.trim()) f.note.value = b.dataset.nrgo; dd.scrollIntoView({ block: 'start' }); f.file.focus({ preventScroll: true }); }));
  const vfiGo = $('#vfi-go'); if (vfiGo) vfiGo.onclick = () => { const mh = $('#mhist'); if (mh) { mh.open = true; mh.style.scrollMarginTop = '90px'; mh.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  // Rückkehr direkt aus dem roten Hinweisfeld (Backlog 205; Knöpfe sonst nur in „Stammdaten bearbeiten“) – löst denselben Knopf aus
  $$('[data-goto]').forEach((b) => (b.onclick = () => { const x = $('#' + b.dataset.goto); if (x) x.click(); }));
  // Grund beim Wiederaufnehmen/Reaktivieren optional (steht dann in der Zeitleiste), Abbrechen bricht ab
  const evx = $('#evx'); if (evx) evx.onclick = async () => { let reason = null; if (!v.eval_excluded) { reason = prompt(t('evx_reason')); if (!reason) return; } else { reason = prompt(t('return_reason')); if (reason === null) return; reason = reason.trim() || null; } const eb = { excluded: !v.eval_excluded }; try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/evaluation`, { excluded: !v.eval_excluded, reason }, { timeoutMs: SEND_TIMEOUT_MS }); const rc = returnCheckText(r && r.return_check); toast(rc ? `✓ ${t('saved_ok')} – ${rc}` : '✓', !!rc); viewVehicle(id); } catch (err) { /* Backlog 805j (Funkloch): Wiederholung → already_* */ if (lostDup(evx, eb, err, ['already_excluded', 'already_included'])) { toast(t('saved_before')); viewVehicle(id); return; } lostMark(evx, eb, err); toast(err.message, true); } };
  const vdq = $('#vdq'); if (vdq) vdq.ontoggle = async () => {
    if (!vdq.open || vdq.dataset.loaded) return; vdq.dataset.loaded = '1'; const box = $('#vdqbody');
    try {
      const r = await api('GET', '/api/admin/data-quality'); const its = r.items.filter((i) => i.vehicle_id === v.id); const cls = { fehler: 'kritisch', luecke: 'mittel', hinweis: '' };
      box.innerHTML = (its.length ? `<div class="list">${its.map((i) => `<div class="row ${i.severity === 'fehler' ? 'p-kritisch' : i.severity === 'luecke' ? 'p-mittel' : ''}" data-vdq="${esc(i.check)}"><span class="chip lead ${cls[i.severity]}" style="white-space:nowrap">${esc(t('dq_sev_' + i.severity))}</span><span class="title" style="white-space:normal">${esc(t('dq_' + i.check))}</span><span></span>${i.detail ? `<span class="sub" style="white-space:normal">${esc(dqDetail(i))}</span>` : ''}</div>`).join('')}</div>`
        : `<p class="small">✓ ${esc(t('vdq_none'))}</p>`) + `<p class="small muted">${esc(t('vdq_hint'))} <a href="${hj('#/quality')}">${esc(t('dq'))} ›</a></p>`;
    } catch (err) { vdq.dataset.loaded = ''; box.innerHTML = `<p class="small" style="color:var(--stop)">${esc(err.message)}</p>`; }
  };
  const deact = $('#deact'); if (deact) deact.onclick = async () => { const reason = prompt(t('deactivate_reason')); if (!reason) return; try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/active`, { active: false, reason }, { timeoutMs: SEND_TIMEOUT_MS }); const hints = [r.running_contracts ? tn('ct_running_deact', r.running_contracts) : '', r.telematics_devices ? tn('tm_devices_deact', r.telematics_devices) : '', r.planned_appointments ? tn('mt_planned_deact', r.planned_appointments) : '', r.open_items ? tn('oi_open_deact', r.open_items) + (r.open_items_safety ? ' ' + t('oi_safety_deact').replace('{n}', fmtNum(r.open_items_safety)) : '') : '', r.open_claims ? tn('claims_open_deact', r.open_claims) : '', r.active_notes ? tn('notes_active_deact', r.active_notes) : '', r.active_warranties ? tn('warr_active_deact', r.active_warranties) : '', (r.trailer_of_trucks || []).length ? t('trailer_deact_warn').replace('{list}', r.trailer_of_trucks.map((x) => x.plate).join(', ')) : '', (r.ended_drivers || []).length ? t('deact_drivers_ended').replace('{list}', () => r.ended_drivers.map((x) => x.display_name).join(', ')) : ''].filter(Boolean); if (hints.length) toast(hints.join(' · '), true); else toast('✓'); viewVehicle(id); } catch (err) { /* Backlog 805j (Funkloch): Wiederholung → already_inactive */ if (lostDup(deact, { active: false }, err, ['already_inactive'])) { toast(t('saved_before')); viewVehicle(id); return; } lostMark(deact, { active: false }, err); toast(err.code === 'open_cases' ? `${err.message} ${t('deact_open_hint')}` : err.message, true); } };
  const react = $('#react'); if (react) react.onclick = async () => { let reason = prompt(t('return_reason')); if (reason === null) return; reason = reason.trim() || null; try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/active`, { active: true, reason }, { timeoutMs: SEND_TIMEOUT_MS }); const rc = returnCheckText(r && r.return_check); toast(rc ? `✓ ${t('saved_ok')} – ${rc}` : '✓', !!rc); await viewVehicle(id);
    // Nachfolger mit gleichem Kennzeichen in Betrieb: Hinweis wie beim Anlegen (23.10.2026)
    const d = r && r.duplicate_plates; if (d && d.length) setTimeout(() => toast(t('dup_plate_warn').replace('{p}', String(d[0].plate || '').toUpperCase()).replace('{list}', d.slice(0, 3).map((x) => String(x.id).replace(/^VIN:/, '')).join(', ') + (d.length > 3 ? ` +${d.length - 3}` : '')), true), 400);
  } catch (err) { /* Backlog 805j (Funkloch): Wiederholung → already_active */ if (lostDup(react, { active: true }, err, ['already_active'])) { toast(t('saved_before')); viewVehicle(id); return; } lostMark(react, { active: true }, err); toast(err.message, true); } };
  // Hinweis Fahrtenschreiber beim Anlegen (Backlog 436): nur bei Auswahl „Tachograph“, kein Intervall vorbelegt
  { const mfk = $('#mf'), th = mfk && mfk.querySelector('[data-mftacho]'), tt = mfk && mfk.querySelector('[data-mftitle]'); if (th) mfk.kind.onchange = () => { th.hidden = mfk.kind.value !== 'Tachograph'; const o = mfk.kind.value === 'Sonstiges'; const ti = mfk.querySelector('#mftitle'); tt.hidden = !o; ti.disabled = !o; ti.required = o; }; } // Backlog 577: Titel nur bei „Sonstiges“, dort Pflicht
  // Backlog 843: km der letzten Durchführung mit mehr Stellen als der letzte erfasste Stand → Hinweis „Ziffern im Beleg prüfen“ (gespeichert wird wie bisher)
  { const mfx = $('#mf'), lo = d.odometer && d.odometer[0], w = $('#mfkmw'); if (mfx && w && lo) mfx.last_done_km.oninput = () => { const v = String(mfx.last_done_km.value).replace(/[\s.]/g, ''); const k = /^\d+$/.test(v) ? Number(v) : NaN; w.innerHTML = kmDigitsWarn(k, lo.km, 'id="mfkmdigits"', 'mf_km_digits'); }; }
  const mf = $('#mf'); if (mf) mf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(mf)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; b.request_key = rkFor(mf, b); try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/maintenance`, b, { timeoutMs: SEND_TIMEOUT_MS }); if (r && r.duplicate) toast(t('saved_before')); viewVehicle(id); } catch (err) { toast(err.message, true); } }; // Backlog 804: Zeitlimit, Wiederholung ohne zweiten Prüftermin
  // Aus dem Werkstattplan (`?done=<Eintrag>`, Backlog 236): nach dem Speichern zurück in den Plan, sonst Akte neu laden
  const doneNext = () => { if (S.fromPlan && sec && sec.startsWith('done:')) { const h = S.fromPlan; S.fromPlan = null; location.hash = h; } else viewVehicle(id); };
  // Erledigt (UVV, Tachograph, Ausrüstung …): Formular statt Browser-Abfragen – Datum, ggf. km, Nachweis, optional Ergebnis und belegte nächste Fälligkeit
  $$('[data-done]').forEach((b) => (b.onclick = () => {
    const fm = $(`form[data-mdone="${b.dataset.done}"]`); if (!fm) return;
    fm.hidden = !fm.hidden; b.setAttribute('aria-expanded', String(!fm.hidden)); if (!fm.hidden) { fm.scrollIntoView({ block: 'nearest' }); fm.done_date.focus(); }
  }));
  // Backlog 829: Differenz zum zuletzt erfassten Stand beim Tippen; kleiner → Hinweis (der Server lehnt kleinere Stände ab)
  $$('form[data-mdone] input[data-lastkm]').forEach((inp) => inp.addEventListener('input', () => {
    const box = inp.parentNode.querySelector('[data-mdkmd]'); if (!box) return; const last = Number(inp.dataset.lastkm); const val = inp.value;
    const k = /^ *[0-9][0-9 .]*$/.test(val) ? Number(val.replace(/[ .]/g, '')) : null;
    box.innerHTML = k === null || !Number.isFinite(k) ? '' : k < last ? `<p class="panel warn small" role="alert" data-mdkmlow style="margin:4px 0 0">⚠️ ${esc(t('mdone_km_lower').replace('{prev}', fmtNum(last)))}</p>` : `<p class="small muted" data-mdkmdiff style="margin:4px 0 0">${esc(t('irv_km_diff').replace('{n}', fmtNum(k - last)))}</p>${kmDigitsWarn(k, last, 'data-mdkmdigits')}`; // Backlog 837
  }));
  $$('form[data-mdone]').forEach((fm) => (fm.onsubmit = async (e) => {
    e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k];
    fm.querySelector('button.btn').disabled = true;
    try { doneToast(await api('POST', `/api/maintenance/${fm.dataset.mdone}/complete`, b, { timeoutMs: SEND_TIMEOUT_MS })); /* Backlog 805: Wiederholung idempotent */ doneNext(); } catch (err) { fm.querySelector('button.btn').disabled = false; toast(err.message, true); }
  }));
  // HU/SP: Durchführung mit Prüfergebnis, Werkstatttermin planen, Fahrzeugdaten (zGM/Erstzulassung)
  // HU/SP ohne eigenen Eintrag („husp:SP“): Aktion über die Fahrzeugakte, der Server legt den Eintrag dabei an
  const hsUrl = (r, act) => (r.startsWith('husp:') ? `/api/vehicles/${encodeURIComponent(v.id)}/husp/${r.slice(5)}/${act}` : `/api/maintenance/${r}/${act}`);
  // Hinweis zum Fälligkeitsfeld je Ergebnis (Backlog 435): erhebliche Mängel und schlechter → keine Plakette, Feld leer lassen;
  // geringe Mängel → Plakette erteilt, Mängel beheben. Nur Text – der Server bleibt unverändert (Frage an den Auftraggeber).
  $$('form[data-hsdone]').forEach((fm) => { const hint = fm.querySelector('[data-hsreshint]'); if (hint && fm.result) fm.result.onchange = () => { const r = fm.result.value; hint.textContent = t(DEFECT_RESULTS.includes(r) ? 'husp_bad_hint' : r === 'geringe_maengel' ? 'husp_minor_hint' : 'husp_done_hint'); hint.dataset.hsreshint = DEFECT_RESULTS.includes(r) ? 'bad' : r === 'geringe_maengel' ? 'minor' : ''; }; });
  $$('form[data-hsdone] [data-hsspsame]').forEach((cb) => (cb.onchange = () => { cb.closest('form').querySelector('[data-hsspbox]').hidden = !cb.checked; }));
  // Backlog 620: optional SP am selben Tag (gleicher Nachweis) und Prüfbericht als Fahrzeugdokument – nacheinander, jede Stufe meldet ihren Fehler einzeln
  $$('form[data-hsdone]').forEach((fm) => (fm.onsubmit = async (e) => {
    e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); const spSame = !!b.sp_same; const spRes = b.sp_result; const file = fm.report_file && fm.report_file.files[0];
    delete b.sp_same; delete b.sp_result; delete b.report_file; for (const k of Object.keys(b)) if (b[k] === '') delete b[k];
    const kind = fm.dataset.hskind; let r;
    try { r = await api('POST', hsUrl(fm.dataset.hsdone, 'complete'), b, { timeoutMs: SEND_TIMEOUT_MS }); } catch (err) { toast(err.message, true); return; }
    const errs = [];
    if (spSame) {
      const spForm = document.querySelector('form[data-hsdone][data-hskind="SP"]');
      try { await api('POST', hsUrl(spForm ? spForm.dataset.hsdone : 'husp:SP', 'complete'), { done_date: b.done_date, evidence: b.evidence, ...(spRes ? { result: spRes } : {}) }, { timeoutMs: SEND_TIMEOUT_MS }); } catch (err) { errs.push(`${mk('SP')}: ${err.message}`); }
    }
    if (file) {
      const note = `${kind}${spSame ? '+SP' : ''} ${b.done_date}: ${b.evidence}`.slice(0, 200); // gespeicherter Text: Datum als JJJJ-MM-TT (nicht je Sprache)
      try { const blob = file.type === 'application/pdf' ? file : await prepareUpload(file); await api('POST', `/api/vehicles/${encodeURIComponent(id)}/documents?kind=pruefbericht&note=${encodeURIComponent(note)}`, blob, { timeoutMs: PHOTO_TIMEOUT_MS, /* Backlog 805c */ headers: { 'x-filename': encodeURIComponent(file.name), 'content-type': blob.type || 'application/octet-stream' } }); } catch (err) { errs.push(`${t('hs_report_file')}: ${err.message}`); }
    }
    if (errs.length) { toast(t('hs_saved_partly').replace('{k}', mk(kind)) + ' ' + errs.join(' · '), true); viewVehicle(id); return; }
    doneToast(r); doneNext();
  }));
  $$('form[data-resadd]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); fm.querySelector('button').disabled = true; try { await api('POST', `/api/maintenance/events/${fm.dataset.resadd}/result`, b, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805: Wiederholung → result_exists, nie doppelt */ toast('✓'); viewVehicle(id); } catch (err) { fm.querySelector('button').disabled = false; toast(err.message, true); } }));
  $$('form[data-mdef]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); fm.querySelector('button').disabled = true; try { const r = await api('POST', `/api/maintenance/events/${fm.dataset.mdef}/order`, { ...b, request_key: fm.dataset.key || (fm.dataset.key = uid()) }, { timeoutMs: SEND_TIMEOUT_MS }); toast('✓ ' + r.case_no); location.hash = '#/cases/' + r.id; } catch (err) { fm.querySelector('button').disabled = false; toast(err.message, true); } }));
  $$('form[data-mord]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); fm.querySelector('button').disabled = true; try { const r = await api('POST', hsUrl(fm.dataset.mord, 'order'), { ...b, request_key: fm.dataset.key || (fm.dataset.key = uid()) }, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805 */ toast('✓ ' + r.case_no); location.hash = '#/cases/' + r.id; } catch (err) { fm.querySelector('button').disabled = false; toast(err.message, true); } }));
  // Backlog 819 (Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig“): gelesene Werte mitsenden; Konflikt → Akte neu laden, eigene Änderungen
  // bleiben im Formular, Felder der anderen Person markiert (vorher setzte das Speichern z. B. ein inzwischen geändertes Intervall still zurück)
  if (S.meLost && S.meLost.id === id) { const L = S.meLost; S.meLost = null; const fm = $(`form[data-medit="${CSS.escape(L.rid)}"]`); if (fm) { let dp = fm.closest('details'); while (dp) { dp.open = true; dp = dp.parentElement && dp.parentElement.closest('details'); } conflictKeep(fm, L, 'melost'); } else toast(L.msg, true); }
  $$('form[data-medit]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(fm)); if ('interval_months' in b && !b.interval_months.trim()) b.interval_months = null; const ex = formVals(fm, true); try { const r = await api('PATCH', '/api/maintenance/' + encodeURIComponent(fm.dataset.medit), { ...b, expected: ex }, { timeoutMs: SEND_TIMEOUT_MS }); toast(r && r.changed && r.changed.length ? '✓' : lostIs(fm, b) ? t('saved_before') : t('medit_nochange')); viewVehicle(id); } catch (err) { /* Backlog 805j (Funkloch) */ lostMark(fm, b, err); if (err.code === 'version_conflict') { S.meLost = { id, rid: fm.dataset.medit, msg: err.message, ...conflictMine(fm) }; viewVehicle(id); return; } toast(err.message, true); } }));
  $$('form[data-mend]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); if (!confirm(t('mend_confirm'))) return; try { const mb = { reason: fm.reason.value }; const r = await api('POST', '/api/maintenance/' + encodeURIComponent(fm.dataset.mend) + '/end', mb, { timeoutMs: SEND_TIMEOUT_MS }); toast(t(r && r.deleted ? 'mend_deleted' : 'mend_ended')); viewVehicle(id); }
    // Backlog 805h (Funkloch): ohne Nachweise wird der Prüftermin gelöscht – die Wiederholung nach verlorener Antwort findet ihn nicht mehr (404)
    catch (err) { if (lostDup(fm, mb, err, ['not_found'])) { toast(t('saved_before')); viewVehicle(id); return; } lostMark(fm, mb, err); toast(err.message, true); } }));
  // Backlog 818 (Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig“): gelesenen Termin mitsenden; Konflikt → Akte neu laden, eigenes Datum bleibt
  // im Formular, Termin der anderen Person markiert (vorher überschrieb das spätere Speichern die Absprache still). HU/SP ohne Eintrag: Formular
  // nach dem Neuladen über die Prüfart finden (der Eintrag kann inzwischen angelegt sein – Kennung wechselt)
  if (S.hsLost && S.hsLost.id === id) { const L = S.hsLost; S.hsLost = null; const fm = $(`form[data-hsplan="${CSS.escape(L.rid)}"]`) || (L.kind ? $(`form[data-hskind="${CSS.escape(L.kind)}"]`) : null); if (fm) conflictKeep(fm, L, 'hslost'); else toast(L.msg, true); }
  offDayWatch($$('form[data-hsplan] input[name=planned_date]')); // Backlog 890
  $$('form[data-hsplan]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); try { const r = await api('POST', hsUrl(fm.dataset.hsplan, 'plan'), { planned_date: fm.planned_date.value || null, expected_planned_date: fm.planned_date.defaultValue || null }, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805f: Termin setzen ist wiederholbar */ if (r && r.after_due) toast(t('plan_after_due').replace('{d}', fmtD(r.planned_date)).replace('{due}', fmtD(r.after_due)), true); else toast(r && r.unchanged && fm.planned_date.value !== fm.planned_date.defaultValue ? t('saved_before') : '✓'); viewVehicle(id); } catch (err) { if (err.code === 'version_conflict') { S.hsLost = { id, rid: fm.dataset.hsplan, kind: fm.dataset.hskind || null, msg: err.message, ...conflictMine(fm) }; viewVehicle(id); return; } toast(err.message, true); } }));
  // Direktsprung „Durchführung erfassen“ (Werkstattplan): Formular des Eintrags öffnen; HU/SP stehen im aufklappbaren Bereich der Prüfung
  if (sec && sec.startsWith('done:')) {
    const rid = sec.slice(5); const b = document.querySelector(`button[data-done="${CSS.escape(rid)}"]`);
    if (b) { const fm = $(`form[data-mdone="${CSS.escape(rid)}"]`); if (fm && fm.hidden) b.click(); if (fm) { fm.style.scrollMarginTop = '90px'; fm.scrollIntoView({ block: 'start' }); } }
    else { const hf = document.querySelector(`form[data-hsdone="${CSS.escape(rid)}"]`); const dt = hf && hf.closest('details'); if (dt) { dt.open = true; dt.style.scrollMarginTop = '90px'; dt.scrollIntoView({ block: 'start' }); hf.done_date.focus({ preventScroll: true }); } }
  }
  const spf = $('#specf'); if (spf) spf.onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(spf)); for (const k of Object.keys(b)) if (b[k] === '') delete b[k]; try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/spec`, b, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805c */ toast(r && r.unchanged ? t('saved_before') : '✓'); viewVehicle(id); } catch (err) { if (err.code === 'version_conflict') { S.vLost = { id, form: 'specf', ...conflictMine(spf) }; viewVehicle(id); return; } toast(err.message, true); } };
  // Backlog 837 (Folge aus 836): „Kilometerstand erfassen“ zeigt den letzten Stand, beim Tippen die Differenz bzw. Hinweise (kleiner → nur mit
  // Begründung; mehr Stellen → Ziffern prüfen). Nur für heute – ein nachgetragenes Ablesedatum vergleicht der Server mit den Nachbarwerten.
  const kfo = d.odometer && d.odometer[0];
  const kfInfo = () => {
    const box = $('#kfkmd'); if (!box || !kfo) return; const raw = kf.km.value; const past = kf.measured_on.value && kf.measured_on.value < bDate();
    const k = !past && raw.trim() && kmInputOk(raw) ? Number(raw.replace(/[\s\u00a0.]/g, '')) : null;
    box.innerHTML = k === null ? '' : k < kfo.km ? `<p class="panel warn small" role="alert" id="kfkmlow" style="margin:4px 0 0">⚠️ ${esc(t('kf_km_lower').replace('{prev}', fmtNum(kfo.km)).replace('{d}', fmtD(kfo.measured_at)))}</p>`
      : `<p class="small muted" id="kfkmdiff" style="margin:4px 0 0">${esc(t('irv_km_diff').replace('{n}', fmtNum(k - kfo.km)))}</p>${kmDigitsWarn(k, kfo.km, 'id="kfkmdigits"')}`;
  };
  const kf = $('#kf'); if (kf) { kf.km.addEventListener('input', kfInfo); kf.measured_on.addEventListener('input', kfInfo); kf.measured_on.addEventListener('change', kfInfo); }
  if (kf) kf.onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/odometer`, { km: kf.km.value, measured_on: kf.measured_on.value || null, note: kf.note.value || null }, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 804: gleicher Stand am selben Tag = duplicate */ if (r.warning) toast(r.warning_items ? `${t('km_warn_saved')}: ${r.warning_items.map((w) => t(w.dir === 'below' ? 'km_warn_below' : 'km_warn_above').replace('{km}', fmtNum(w.km)).replace('{d}', fmtD(w.at))).join(' · ')}` : r.warning, true); viewVehicle(id); }
    catch (err) { toast(err.message, true); if (err.code === 'km_not_plausible') { $('#kmnote').hidden = false; kf.note.required = true; kf.note.focus(); } }
  };
  bindTachoCancel(document, () => viewVehicle(id));
  const tvf = $('#tvf'); if (tvf) tvf.onsubmit = async (e) => { e.preventDefault(); const tb = { kind: 'massenspeicher', vehicle_id: id, ...Object.fromEntries(new FormData(tvf)) }; try { await api('POST', '/api/tacho/downloads', tb, { timeoutMs: SEND_TIMEOUT_MS }); toast('✓'); viewVehicle(id); } catch (err) { if (lostDup(tvf, tb, err, ['duplicate'])) { toast(t('saved_before')); viewVehicle(id); return; } lostMark(tvf, tb, err); toast(err.message, true); } }; // Backlog 805
  const df = $('#df');
  // Fahrerliste nachladen: nur Fahrer der angezeigten Umgebung (Inhaber sah sonst auch Betriebs-/Testkonten → 400), Ladefehler ersetzt
  // nicht die ganze Akte, ohne Fahrer Hinweis statt leerer Auswahl (20.10.2026)
  let us = null;
  if (df) {
    const envShown = (S.viewEnv && S.me.role === 'owner') ? S.viewEnv : S.me.environment;
    try { us = (await api('GET', '/api/users')).users.filter((u) => u.role === 'driver' && u.active && (!u.environment || u.environment === envShown)); }
    catch (err) { us = null; df.innerHTML = `<p class="small muted">${esc(err.message)}</p>`; }
    if (us && !us.length) df.innerHTML = `<p class="small muted">${esc(t('no_drivers_env'))}</p>`;
  }
  if (df && us && us.length) {
    $('#drvsel').innerHTML = us.map((u) => `<option value="${esc(u.id)}">${esc(u.display_name)}${u.driver_record_active === 0 ? ` (${esc(t('drv_rec_left'))})` : ''}</option>`).join('');
    df.onsubmit = async (e) => { e.preventDefault(); const db = { user_id: $('#drvsel').value, end_previous: $('#endprev').checked }; try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/drivers`, db, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805 */ /* Backlog 855: weitere Fahrer dieses Fahrzeugs bleiben zugeordnet */ const vo = r.vehicle_other_drivers && r.vehicle_other_drivers.length ? ' · ' + t('assign_veh_others').replace('{list}', r.vehicle_other_drivers.join(', ')) : ''; if (r.driving_ban_fines && r.driving_ban_fines.length) toast(t('drv_ban_warn').replace('{list}', r.driving_ban_fines.map((b) => `${b.fine_no} (${tn('ban_months', b.months)})`).join(', ')), true); else if (r.driver_record_left) toast(t('drv_rec_left_warn'), true); else if (r.ended_previous.length) toast(`${t('ended_assignment')}: ${r.ended_previous.join(', ')}${vo}`, !!vo); else if (r.other_open.length) toast(`${t('also_assigned')}: ${r.other_open.join(', ')}${vo}`, true); else if (vo) toast(vo.slice(3), true); viewVehicle(id); } catch (err) { if (lostDup(df, db, err, ['already_assigned'])) { toast(t('saved_before')); viewVehicle(id); return; } lostMark(df, db, err); toast(err.message, true); } };
  }
  // Zuordnung beenden wirkt auf die Fahrerermittlung (Bußgelder) – nachfragen
  $$('[data-end]').forEach((b) => (b.onclick = async () => { if (!confirm(t('end_assign_confirm').replace('{name}', b.dataset.name).replace('{plate}', d.vehicle.plate))) return; const ab = { end: b.dataset.end }; try { await api('DELETE', '/api/assignments/' + b.dataset.end, undefined, { timeoutMs: SEND_TIMEOUT_MS }); viewVehicle(id); } catch (err) { /* Backlog 805j (Funkloch): Wiederholung → 404 „bereits beendet“ */ if (lostDup(b, ab, err, ['not_found'])) { toast(t('saved_before')); viewVehicle(id); return; } lostMark(b, ab, err); toast(err.message, true); } }));
  const aib = $('#aib'); if (aib) aib.onclick = async () => {
    aib.disabled = true; $('#ai').innerHTML = `<p class="muted">${esc(t('loading'))}</p>`;
    try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/ai`); $('#ai').innerHTML = r.suggestion ? `<p style="white-space:pre-wrap">${esc(r.suggestion)}</p><p class="small muted">${esc(r.disclaimer_code ? t(r.disclaimer_code) : r.disclaimer)}</p>` : `<p class="muted">${esc(r.code ? t(r.code) : r.message || '–')}</p>`; }
    catch (err) { $('#ai').innerHTML = `<p class="muted">${esc(err.message)}</p>`; }
    aib.disabled = false;
  };
}
function ctForm(c = {}, docs = null) {
  const v = (k) => (c[k] === null || c[k] === undefined ? '' : esc(String(c[k])));
  // Vertragsdokument: Auswahl aus der Dokumentablage des Fahrzeugs (nur angezeigte Umgebung); liegt die Verknüpfung in der anderen Umgebung, bleibt sie unverändert (Feld fehlt)
  const docSel = docs && !c.file_other_env ? `<label>${esc(t('ct_doc'))}<span class="hint">${esc(t('ct_doc_hint'))}</span></label><select name="file_id"><option value="">${esc(t('ct_doc_none'))}</option>${docs.map((f) => `<option value="${esc(f.id)}"${c.file_id === f.id ? ' selected' : ''}>${esc(t('dk_' + (f.doc_kind || 'sonstiges')))} · ${esc(f.filename)} · ${fmtD(f.created_at)}</option>`).join('')}</select>` : '';
  return `<label>${esc(t('ct_kind'))}</label><select name="kind">${CT_KINDS.map((k) => `<option value="${k}"${c.kind === k ? ' selected' : ''}>${esc(t('ck_' + k))}</option>`).join('')}</select>
    <label>${esc(t('ct_partner'))}</label><input name="partner" required maxlength="120" value="${v('partner')}"><label>${esc(t('ct_no'))}</label><input name="contract_no" maxlength="60" value="${v('contract_no')}">
    <label>${esc(t('ct_start'))}</label><input type="date" name="start_date" value="${v('start_date')}"><label>${esc(t('ct_end'))}</label><input type="date" name="end_date" value="${v('end_date')}">
    <label>${esc(t('ct_notice'))}</label><input name="notice_months" inputmode="numeric" value="${v('notice_months')}"><label>${esc(t('ct_km_allow'))}</label><input name="km_allowance" inputmode="numeric" value="${v('km_allowance')}">
    <label>${esc(t('ct_start_km'))}<span class="hint">${esc(t('ct_start_km_hint'))}</span></label><input name="start_km" inputmode="numeric" value="${v('start_km')}"><div data-ctskw aria-live="polite"></div><label>${esc(t('ct_rate'))}</label><input name="monthly_rate_net" inputmode="decimal" value="${c.monthly_rate_net === null || c.monthly_rate_net === undefined ? '' : esc(decIn(c.monthly_rate_net))}">
    <label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" value="${v('evidence')}"><label>${esc(t('note'))}</label><input name="note" maxlength="1000" value="${v('note')}">${docSel}`;
}
const ctDocLine = (c) => (c.file_id ? `<div><a href="${fileUrl(c.file_id)}" target="_blank" rel="noopener">📎 ${esc(t('ct_doc'))}: ${esc(c.file_name)}</a></div>` : c.file_other_env ? `<div class="small muted">📎 ${esc(t('ct_doc_other_env'))}</div>` : c.ended_on ? '' : `<div class="small muted">${esc(t('ct_doc_missing'))}</div>`);
const ctBody = (fm) => { const b = Object.fromEntries(new FormData(fm)); for (const k of Object.keys(b)) if (b[k] === '') b[k] = null; return b; };
function ctSection(list, docs = null) {
  return `<h2>${esc(t('ct_title'))}</h2>${list.length ? list.map((c) => `<section class="panel ${c.status.overall === 'handeln' ? 'p-kritisch' : ''}"><p style="margin-top:0"><b>${esc(t('ck_' + c.kind))}</b> · ${esc(c.partner)}${c.contract_no ? ' · ' + noTr(c.contract_no) : ''} ${ctChip(c.status)}</p>${ctLines(c).map((x) => `<div>${x}</div>`).join('')}${ctDocLine(c)}
    ${c.ended_on ? '' : `<details class="noprint"><summary>${esc(t('ct_edit'))}</summary><form data-ctedit="${esc(c.id)}" data-upd="${esc(c.updated_at || '')}">${ctForm(c, docs)}${c.status.km && c.status.km.status === 'zaehler' ? `<label class="check"><input type="checkbox" name="confirm_km_basis" value="1"> ${esc(t('ct_km_basis_ok'))}</label>` : ''}<div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details>
    <details class="noprint"><summary>${esc(t('ct_end_btn'))}</summary><form data-ctend="${esc(c.id)}">${ctRetEnd(c)}<label>${esc(t('ct_ended_on'))}</label><input type="date" name="ended_on" max="${bDate()}" value="${bDate()}"><label>${esc(t('ct_end_reason'))}</label><input name="end_note" required maxlength="300"><p class="small muted">${esc(t('ct_ended_note'))}</p><div class="actions"><button class="btn secondary">${esc(t('ct_end_btn'))}</button></div></form></details>`}</section>`).join('') : `<p class="muted">${esc(t('ct_none'))}</p>`}
    <details class="panel noprint"><summary>${esc(t('ct_add'))}</summary><p class="small muted">${esc(t('ct_hint'))}</p><form id="ctf">${ctForm({}, docs)}<div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>`;
}
function bindCtSection(id, reload, odo = []) {
  // Backlog 845 (Folge aus 844): beim Tippen von „km bei Übernahme“ warnen, wenn die letzte geladene Ablesung bis zum Tag „Beginn“ mehr Stellen hat
  // (vermutlich fehlt eine Ziffer). Nur Hinweis, Speichern bleibt möglich; ohne Beginn bzw. ohne Ablesung davor kein Hinweis.
  $$('#ctf, form[data-ctedit]').forEach((fm) => { const w = fm.querySelector('[data-ctskw]'); if (!w || !fm.elements.start_km) return;
    const upd = () => { const raw = String(fm.elements.start_km.value).replace(/[\s.]/g, ''); const k = /^\d+$/.test(raw) ? Number(raw) : NaN; const sd = fm.elements.start_date && fm.elements.start_date.value;
      const pr = sd && k > 0 ? odo.filter((o) => o.measured_at && BERLIN_FMT.format(new Date(o.measured_at)) <= sd).sort((a, b) => String(b.measured_at).localeCompare(String(a.measured_at)))[0] : null;
      w.innerHTML = pr && String(Math.trunc(pr.km)).length > String(Math.trunc(k)).length ? `<p class="panel warn small" role="alert" data-ctskdigits style="margin:4px 0 0">⚠️ ${esc(t('ct_start_digits').replace('{prev}', fmtKm(pr.km)))}</p>` : ''; };
    fm.elements.start_km.addEventListener('input', upd); if (fm.elements.start_date) fm.elements.start_date.addEventListener('input', upd); });
  const f = $('#ctf'); if (f) f.onsubmit = async (e) => { e.preventDefault(); const b = ctBody(f); try { await api('POST', `/api/vehicles/${encodeURIComponent(id)}/contracts`, b, { timeoutMs: SEND_TIMEOUT_MS }); toast('✓'); reload(); } catch (err) { if (lostDup(f, b, err, ['duplicate_contract'])) { toast(t('saved_before')); reload(); return; } lostMark(f, b, err); toast(err.message, true); } }; // Backlog 804
  // Ratenänderung an einem Vertrag, der vor dem laufenden Monat begann: gilt rückwirkend für alle Laufzeitmonate (Kostenbericht Vorjahr ändert sich) –
  // Rückfrage mit dem Weg „beenden + Folgevertrag“ (Backlog 188, Jahresabschluss)
  const rateRetro = (fm) => { const ri = fm.elements.monthly_rate_net; const sd = fm.elements.start_date;
    return !!(ri && sd && ri.defaultValue.trim() !== '' && ri.value.trim() !== ri.defaultValue.trim() && sd.value && sd.value < BERLIN_FMT.format(new Date()).slice(0, 7) + '-01'); };
  // Backlog 808 (Blickwinkel „Zwei Leitungen bearbeiten gleichzeitig denselben Vertrag am Handy“): Konflikt → Ansicht neu laden, nur die
  // selbst geänderten Felder zurück ins frische Formular, Felder der anderen Person markieren (vorher: „Bitte neu laden“, jeder neue Versuch
  // scheiterte am alten Stand, Neuladen verwarf die Eingaben)
  if (S.ctLost) { const L = S.ctLost; S.ctLost = null; const fm = $(`form[data-ctedit="${CSS.escape(L.id)}"]`); if (fm) conflictKeep(fm, L, 'ctlost-' + L.id); }
  $$('form[data-ctedit]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); if (rateRetro(fm) && !confirm(t('ct_rate_retro_confirm'))) return; try { const r = await api('PATCH', `/api/contracts/${fm.dataset.ctedit}`, { ...ctBody(fm), ...(fm.dataset.upd ? { expected_updated_at: fm.dataset.upd } : {}) }, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805j: Wiederholung → duplicate */ toast(r && r.duplicate ? t('saved_before') : '✓'); reload(); } catch (err) {
    if (err.code === 'version_conflict') { S.ctLost = { id: fm.dataset.ctedit, ...conflictMine(fm) }; reload(); return; }
    toast(err.message, true); } }));
  $$('form[data-ctend]').forEach((fm) => (fm.onsubmit = async (e) => { e.preventDefault(); try { const r = await api('POST', `/api/contracts/${fm.dataset.ctend}/end`, ctBody(fm), { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805g */ toast(r && r.duplicate ? t('saved_before') : '✓'); reload(); } catch (err) { toast(err.message, true); } }));
}
// Backlog 289: beim Beenden von Leasing/Miete (Rückgabe) offene Vorgänge/Restarbeiten und den letzten km-Stand zeigen – die Rückgabe-km
// zählen für Mehr-/Minder-km; fehlt ein aktueller Stand, zuerst erfassen (nichts wird geschätzt)
function ctRetEnd(c) {
  if (!c.return_check) return '';
  const r = c.reading; const old = !r || (r.measured_at && BERLIN_FMT.format(new Date(r.measured_at)) < bDate());
  return `<div data-ct-retend><p class="small">${ctRet(c.return_check)}</p><p class="small ${old ? '' : 'muted'}">${r ? esc(t('ct_ret_km').replace('{km}', fmtKm(r.km)).replace('{d}', fmtD(r.measured_at))) : esc(t('ct_ret_km_none'))}${old ? ` <b>${esc(t('ct_ret_km_old'))}</b>` : ''}</p></div>`;
}
async function renderTires(id, el, keep = null) {
  let d;
  try { d = await api('GET', `/api/vehicles/${encodeURIComponent(id)}/tires`); } catch (e) { el.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
  // außer Betrieb: Server weist Erfassung und Winterreifen-Auftrag ab – Formulare nicht anbieten (20.10.2026)
  const vActive = !d.vehicle || d.vehicle.active !== 0;
  const canWrite = vActive && ['owner', 'fleet', 'workshop'].includes(S.me.role);
  const stCls = { ok: 'ok', warnung: 'mittel', reserve_unter_minimum: 'mittel', unter_minimum: 'kritisch', unbekannt: '' };
  const wCls = { erfuellt: 'ok', nicht_erfuellt: 'kritisch', unbekannt: 'mittel' };
  el.innerHTML = `<section class="panel"><h3>${esc(t('tire_sizes'))}</h3>${d.specs.length ? d.specs.map((s) => `<div class="specrow"><div><span class="muted">${esc(t('axle_' + s.axle))}</span> <b>${esc(s.size)}</b></div><div>${s.verified ? `<span class="chip ok">${esc(t('verified'))}</span>` : `<span class="chip mittel">${esc(t('source_unverified'))}</span>`}${canWrite && !s.verified ? ` <button class="btn secondary small" data-ver="${esc(s.axle)}" data-size="${esc(s.size)}">${esc(t('mark_verified'))}</button>` : ''}</div></div>`).join('') : noneP()}</section>
    ${d.winter && d.winter.status !== 'nicht_pflichtig' ? `<section class="panel" id="twinter"><h3>${esc(t('winter_title'))} <span class="chip ${wCls[d.winter.status]}">${esc(t('ws_' + d.winter.status))}</span></h3>${d.winter.noncompliant.length ? `<p><b>${esc(t('winter_bad').replace('{p}', d.winter.noncompliant.map(posL).join(', ')))}</b></p>` : ''}${d.winter.missing.length ? `<p>${esc(t('winter_missing').replace('{p}', d.winter.missing.map(posL).join(', ')))}</p>` : ''}<p class="small muted">${esc(t('winter_rule'))}</p>${winterOrderHtml(d)}${canWrite && d.winter.open_order && woOpenPos(d).length ? `<div class="actions noprint"><button type="button" class="btn secondary" id="twopre">❄ ${esc(t('wo_rec'))}</button></div>` : ''}</section>` : ''}
    ${keep && keep.wo && d.winter && d.winter.status === 'erfuellt' && d.winter.open_order ? `<p class="panel good" id="twodone" role="status">✓ ${esc(t('wo_rec_done').replace('{no}', d.winter.open_order.case_no))}${d.winter.open_order.id ? ` <a href="#/cases/${esc(d.winter.open_order.id)}">${esc(d.winter.open_order.case_no)} ›</a>` : ''}</p>` : ''}
    <section class="panel"><h3>${esc(t('positions'))}</h3>${d.positions.length ? `<div class="scroll"><table class="stack"><thead><tr><th>${esc(t('position'))}</th><th>${esc(t('tread'))}</th><th></th></tr></thead><tbody>${d.positions.map((p) => `<tr><td><b>${esc(posL(p.position))}</b><div class="small muted">${esc(t('te_' + p.last_event))} · ${fmtD(p.last_event_at)}</div>${p.size ? `<div class="small" data-tsize="${esc(p.position)}"><span class="muted">${esc(t('tire_mounted'))}</span> <span translate="no">${esc(p.size)}</span>${p.size_differs ? ` <span class="chip mittel" data-tsdiff="${esc(p.position)}" style="white-space:normal">${esc(t('tire_size_diff_chip').replace('{axle}', t('axle_' + p.spec_axle)).replace('{spec}', p.spec_size))}${p.spec_verified ? '' : ` · ${esc(t('dq_sd_unverified'))}`}</span>` : ''}</div>` : ''}${p.dot ? `<div class="small${p.age_warn ? '' : ' muted'}">DOT ${esc(dotTxt(p.dot))} · ${esc(t('tire_age'))} ${esc(tireAge(p.age_months))}${p.age_warn ? ` <span class="chip mittel">${esc(tn('tire_age_warn', d.warn_age_years))}</span>` : ''}</div>` : ''}</td><td>${p.tread_mm === null ? '–' : esc(fmtNum(p.tread_mm))}${p.tread_mm !== null && p.tread_at && fmtD(p.tread_at) !== fmtD(p.last_event_at) ? `<div class="small muted" data-tat="${esc(p.position)}">${esc(t('tread_measured_at'))} ${fmtD(p.tread_at)}</div>` : ''}</td><td><span class="chip ${stCls[p.status]}">${esc(t('ts_' + p.status))}</span>${p.winter_mark ? `<div style="margin-top:4px"><span class="chip ${p.winter_mark === '3pmsf' ? 'ok' : (d.winter && (d.winter.required || []).includes(p.position)) ? 'kritisch' : ''}" data-wm="${esc(p.position)}" style="white-space:normal" title="${esc(t('winter_mark'))}">❄ ${esc(t('wm_' + p.winter_mark))}</span></div>` : ''}</td></tr>`).join('')}</tbody></table></div>` : noneP()}
    ${canWrite || (vActive && S.me.role === 'driver') ? `<details><summary>${esc(t('record_tire'))}</summary><form id="tf">
      <label>${esc(t('kind'))}</label><select name="event_type">${S.meta.tire_events.filter((e) => canWrite || ['messung', 'sichtpruefung'].includes(e)).map((e) => `<option value="${e}">${esc(t('te_' + e))}</option>`).join('')}</select>
      <label>${esc(t('position'))}</label><select name="position">${(d.allowed_positions || S.meta.tire_positions).map((p) => `<option value="${esc(p)}">${esc(posL(p))}</option>`).join('')}</select>
      <details id="tfmore"><summary class="small">${esc(t('tire_more_pos'))}</summary><p class="small muted">${esc(t('tire_more_pos_hint'))}</p><div class="tfpos">${(d.allowed_positions || S.meta.tire_positions).map((p) => `<label class="check"><input type="checkbox" name="positions" value="${esc(p)}"> ${esc(posL(p))}</label>`).join('')}</div></details>
      <label>${esc(t('tread'))}</label><input name="tread_mm" inputmode="decimal"><div id="tfrise" aria-live="polite"></div><label>${esc(t('pressure'))}</label><input name="pressure_bar" inputmode="decimal">
      <label>${esc(t('tire_sizes'))}</label><input name="size" maxlength="40" placeholder="315/70 R22.5"><p class="small" id="tfspec" hidden></p><div id="tfsizediff" aria-live="polite"></div><label>${esc(t('brand'))}</label><input name="brand" maxlength="60"><label>${esc(t('dot'))}</label><input name="dot" maxlength="20" autocapitalize="characters" placeholder="DOT … 0124">
      <label>${esc(t('winter_mark'))}</label><select name="winter_mark"><option value="">${esc(t('wm_none'))}</option>${(S.meta.tire_winter_marks || []).map((w) => `<option value="${w}">${esc(t('wm_' + w))}</option>`).join('')}</select>
      <label for="tfkm">${esc(t('km'))}${d.vehicle && d.vehicle.kind === 'anhaenger' ? `<span class="hint" id="tfkmtr">${esc(t('kmtr_hint'))}</span>` : ''}${d.last_km ? `<span class="hint" id="tfkmlast">${esc(t('irv_last_km').replace('{km}', fmtNum(d.last_km.km)).replace('{d}', fmtD(d.last_km.measured_at)))}</span>` : ''}</label><input id="tfkm" name="odometer_km" inputmode="numeric"><div id="tfkmd" aria-live="polite"></div><label>${esc(t('note'))}</label><input name="note" maxlength="1000">
      <input type="hidden" name="case_id"><p class="panel small" id="tfwo" hidden></p><div class="actions"><button class="btn">${esc(t('save'))}</button></div></form></details>` : ''}</section>
    ${d.history.length ? `<details class="panel" id="tirehistd"><summary>${esc(t('history'))} (${d.history.length}${d.history_truncated ? '+' : ''})</summary>${d.history_truncated ? `<p class="small muted" id="tiretrunc">${esc(t('tire_hist_truncated').replace('{n}', d.history.length))} <a href="${tlHash(id, 'tire')}">${esc(t('timeline'))}</a></p>` : ''}<div class="scroll"><table class="stack" id="tirehist"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('position'))}</th><th>${esc(t('kind'))}</th><th>${esc(t('audit_person'))}</th></tr></thead><tbody>${d.history.map((h) => `<tr><td class="small">${fmtDT(h.created_at)}</td><td>${esc(posL(h.position))}</td><td>${esc(t('te_' + h.event_type))}${h.tread_mm !== null ? ' · ' + esc(fmtMm(h.tread_mm)) : ''}${h.pressure_bar !== null ? ' · ' + esc(fmtBar(h.pressure_bar)) : ''}${h.size ? ' · ' + esc(h.size) : ''}${h.brand ? ' · ' + esc(h.brand) : ''}${h.winter_mark ? ' · ' + esc(t('wm_' + h.winter_mark)) : ''}${h.note ? '<br><span class="small muted">' + esc(h.note) + '</span>' : ''}</td><td class="small">${esc(pnm(h.recorded_by_name, h.recorded_by_name_hidden))}</td></tr>`).join('')}</tbody></table></div></details>` : ''}`;
  stackTables(el);
  const tf = $('#tf', el);
  // Erfassung offen halten (Sprung aus der Liste bzw. nach dem Speichern): Art und km-Stand bleiben, Position rückt weiter,
  // Messwerte leer – Reifenwechsel-Saison: je Position neu aufklappen/auswählen/km tippen entfällt (23.10.2026, Teilagent)
  if (tf && keep) {
    tf.closest('details').open = true;
    if (keep.event_type && [...tf.event_type.options].some((o) => o.value === keep.event_type)) tf.event_type.value = keep.event_type;
    if (keep.position && [...tf.position.options].some((o) => o.value === keep.position)) tf.position.value = keep.position;
    if (keep.odometer_km) tf.odometer_km.value = keep.odometer_km;
    if (keep.saved && !keep.wo) { const ff = keep.event_type === 'wechsel' ? tf.size : tf.tread_mm; if (ff) ff.focus(); }
  }
  // Backlog 408 (Blickwinkel „Reifendienst wechselt an einem Tag die Reifen von 10 Lkw“): hinterlegte Größe der Achse per Knopf übernehmen
  // (nie still vorbelegt – die montierte Größe kann abweichen) und Umrüstung zum offenen Winterreifen-Auftrag vorbereiten: offene Positionen
  // einer Achse, Art, Bezug zum Auftrag; Winterkennzeichnung bleibt Pflichtauswahl der Person (keine Vorgabe)
  const updSpec = () => {
    const sp = $('#tfspec', tf); if (!sp) return;
    const ax = posAxle(tf.position.value); const s = ax && (d.specs || []).find((x) => x.axle === ax);
    tfSize(); if (!s || tf.event_type.value !== 'wechsel') { sp.hidden = true; sp.innerHTML = ''; return; }
    sp.hidden = false; sp.innerHTML = `${esc(t('tfspec_hint'))} <b>${esc(s.size)}</b>${s.verified ? '' : ` <span class="muted">(${esc(t('source_unverified'))})</span>`} <button type="button" class="btn secondary small" id="tfspecgo">${esc(t('tfspec_take'))}</button>`;
    $('#tfspecgo', tf).onclick = () => { tf.size.value = s.size; tf.size.focus(); tfSize(); };
  };
  // Backlog 849 (Blickwinkel „Reifendienst montiert eine andere Größe als für die Achse hinterlegt“): beim Reifenwechsel Hinweis je Achse, wenn die
  // eingegebene Größe von der hinterlegten abweicht (Schreibweise/Leerzeichen egal); gespeichert wird trotzdem, die hinterlegte Größe bleibt
  function tfSize() {
    const box = $('#tfsizediff', tf); if (!box) return; const k = (x) => String(x || '').toUpperCase().replace(/\s+/g, ''); const sz = String(tf.size.value).trim();
    const sel = [...new Set([tf.position.value, ...$$('input[name="positions"]:checked', tf).map((c) => c.value)])];
    const axs = tf.event_type.value !== 'wechsel' || !/\d/.test(sz) ? [] : [...new Set(sel.map(posAxle).filter(Boolean))];
    const hits = axs.map((ax) => ({ ax, s: (d.specs || []).find((x) => x.axle === ax) })).filter((h) => h.s && k(h.s.size) !== k(sz));
    box.innerHTML = hits.map((h) => `<p class="panel warn small" role="alert" data-tfsizediff="${esc(h.ax)}" style="margin:4px 0 0">⚠️ ${esc(t('size_differs').replace('{pos}', sel.filter((p) => posAxle(p) === h.ax).map(posL).join(', ')).replace('{size}', sz).replace('{spec}', h.s.size).replace('{axle}', t('axle_' + h.ax)))}</p>`).join('');
  }
  const applyWo = () => {
    const open = woOpenPos(d); if (!tf || !open.length) return false;
    const w = d.winter; const first = open[0]; const bad0 = w.noncompliant.includes(first);
    const grp = open.filter((p) => posAxle(p) === posAxle(first) && w.noncompliant.includes(p) === bad0);
    tf.closest('details').open = true;
    tf.event_type.value = bad0 ? 'wechsel' : 'sichtpruefung';
    tf.position.value = first;
    $$('input[name="positions"]', tf).forEach((cb) => (cb.checked = grp.slice(1).includes(cb.value)));
    const more = $('#tfmore', tf); if (more) more.open = grp.length > 1;
    tf.winter_mark.value = ''; tf.winter_mark.required = true;
    tf.case_id.value = w.open_order && w.open_order.id ? w.open_order.id : '';
    const n = $('#tfwo', tf); n.hidden = false;
    n.textContent = (w.open_order ? t('wo_rec_for').replace('{no}', w.open_order.case_no) : t('wo_rec_for_noorder')).replace('{p}', grp.map(posL).join(', '));
    updSpec(); (bad0 ? tf.size : tf.winter_mark).focus();
    return true;
  };
  // Backlog 828 (Blickwinkel „Werkstatt erfasst Reifen am Anhänger mit km der Zugmaschine“): Bezug zum zuletzt erfassten Stand des Fahrzeugs;
  // kleiner → Hinweis (anderes Fahrzeug oder Tippfehler), gespeichert wird trotzdem (km bleibt nur am Reifenereignis)
  const tfKm = () => {
    const box = $('#tfkmd', tf); if (!box) return; const v = tf.odometer_km.value;
    const k = /^ *[0-9][0-9 .]*$/.test(v) ? Number(v.replace(/[ .]/g, '')) : null;
    if (!d.last_km || k === null || !Number.isFinite(k)) { box.innerHTML = ''; return; }
    box.innerHTML = k < d.last_km.km
      ? `<p class="panel warn small" role="alert" id="tfkmlow" style="margin:4px 0 0">⚠️ ${esc(t('tfkm_lower').replace('{prev}', fmtNum(d.last_km.km)).replace('{d}', fmtD(d.last_km.measured_at)).replace('{plate}', (d.vehicle && d.vehicle.plate) || ''))}</p>`
      : `<p class="small muted" id="tfkmdiff" style="margin:4px 0 0">${esc(t('irv_km_diff').replace('{n}', fmtNum(k - d.last_km.km)))}</p>${kmDigitsWarn(k, d.last_km.km, 'id="tfkmdigits"')}`; // Backlog 837
  };
  if (tf) { tf.odometer_km.addEventListener('input', tfKm); tfKm(); }
  // Backlog 847: mehr Profil als die letzte Messung derselben Position ohne erfassten Wechsel (Einstellung tire_tread_rise_mm, leer = aus) – Hinweis beim Tippen
  const tfRise = () => {
    const box = $('#tfrise', tf); if (!box) return; const lim = d.tread_rise_mm; const raw0 = String(tf.tread_mm.value).trim(); const raw = unitIn(raw0, 'mm') ?? raw0; // Backlog 986: „6,5 mm“
    const v = /^\d{1,2}([.,]\d{1,3})?$/.test(raw) ? Number(raw.replace(',', '.')) : null;
    const sel = [...new Set([tf.position.value, ...$$('input[name="positions"]:checked', tf).map((c) => c.value)])];
    const hits = !lim || v === null || tf.event_type.value === 'wechsel' ? [] : sel.map((ps) => (d.positions || []).find((p) => p.position === ps)).filter((p) => p && p.tread_mm !== null && p.tread_mm !== undefined && Math.round((v - p.tread_mm) * 1000) >= Math.round(lim * 1000));
    box.innerHTML = hits.length ? hits.map((p) => `<p class="panel warn small" role="alert" data-tfrise="${esc(p.position)}" style="margin:4px 0 0">⚠️ ${esc(t('tread_rise').replace('{pos}', posL(p.position)).replace('{mm}', fmtNum(v)).replace('{prev}', fmtNum(p.tread_mm)).replace('{d}', fmtD(p.tread_at)))}</p>`).join('') : '';
  };
  if (tf) { tf.size.addEventListener('input', tfSize); $$('input[name="positions"]', tf).forEach((c) => c.addEventListener('change', tfSize)); }
  if (tf) { tf.tread_mm.addEventListener('input', tfRise); tf.position.addEventListener('change', tfRise); tf.event_type.addEventListener('change', tfRise); $$('input[name="positions"]', tf).forEach((c) => c.addEventListener('change', tfRise)); }
  let woMode = false;
  if (tf) { tf.position.onchange = updSpec; tf.event_type.onchange = updSpec; updSpec(); if (keep && keep.wo) woMode = applyWo(); }
  const twp = $('#twopre', el); if (twp) twp.onclick = () => { woMode = applyWo(); if (woMode) tf.closest('details').scrollIntoView({ block: 'start' }); };
  if (tf) tf.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(tf); const b = Object.fromEntries(fd);
    for (const k of Object.keys(b)) if (b[k] === '') delete b[k];
    b.positions = fd.getAll('positions'); if (!b.positions.length) delete b.positions;
    // Wiederholung nach Netzabbruch legt nichts doppelt an (19.10.2026); Kennung je Inhalt – geänderte Eingaben nach einem Fehler sind eine neue
    // Erfassung (21.10.2026: wurden sonst als „duplicate“ verworfen und mit ✓ quittiert), nach Erfolg verworfen
    const ck = JSON.stringify(Object.entries(b).sort()); if (tf.dataset.ck !== ck) { tf.dataset.ck = ck; tf.dataset.key = uid(); }
    b.request_key = tf.dataset.key;
    try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/tires/events`, b, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805: request_key je Formular */ const wl = (r.warning_items && r.warning_items.length ? r.warning_items.map((w) => (['tread_below_min', 'spare_below_min'].includes(w.code) ? t(w.code).replace('{mm}', fmtNum(w.tread_mm)).replace('{min}', fmtNum(w.min_mm)) : w.code === 'tacho_check_possible' ? t('tacho_check_possible') : w.code === 'size_differs' ? t('size_differs').replace('{pos}', (w.positions || []).map(posL).join(', ')).replace('{size}', w.size).replace('{spec}', w.spec).replace('{axle}', t('axle_' + w.axle)) /* Backlog 849 */ : w.code === 'tire_km_lower' ? t('tire_km_lower').replace('{km}', fmtNum(w.km)).replace('{prev}', fmtNum(w.prev_km)) : w.code === 'tread_rise' ? t('tread_rise').replace('{pos}', posL(w.position)).replace('{mm}', fmtNum(w.tread_mm)).replace('{prev}', fmtNum(w.prev_mm)).replace('{d}', fmtD(w.prev_at)) /* Backlog 847 */ : '')).filter(Boolean) : r.warnings || []).filter(Boolean); if (wl.length) toast(wl.join(' · '), true); /* ein Fehler-Toast ersetzt den vorherigen – alle Warnungen in einem (20.10.2026) */ if (!r.warnings || !r.warnings.length) toast(r.positions && r.positions.length > 1 ? '✓ ' + r.positions.map(posL).join(', ') : '✓');
      const ap = [...tf.position.options].map((o) => o.value); const nx = !b.positions && ap.indexOf(b.position) >= 0 ? ap[ap.indexOf(b.position) + 1] : null;
      renderTires(id, el, { saved: true, event_type: b.event_type, odometer_km: b.odometer_km || '', position: nx || b.position, wo: woMode }); }
    catch (err) { toast(err.message, true); }
  };
  offDayWatch($$('#woform input[name=planned_date]', el)); // Backlog 890
  if ($('#woform', el)) $('#woform', el).onsubmit = async (e) => { e.preventDefault(); const fm = e.target; const b = Object.fromEntries(new FormData(fm)); if (!b.planned_date) delete b.planned_date; fm.querySelector('button').disabled = true;
    try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/tires/winter-order`, { ...b, request_key: fm.dataset.key || (fm.dataset.key = uid()) }, { timeoutMs: SEND_TIMEOUT_MS }); toast('✓ ' + r.case_no); renderTires(id, el); } catch (err) { fm.querySelector('button').disabled = false; toast(err.message, true); } };
  $$('[data-ver]', el).forEach((b) => (b.onclick = async () => { try { const r = await api('POST', `/api/vehicles/${encodeURIComponent(id)}/tires/specs`, { axle: b.dataset.ver, size: b.dataset.size, verified: true }, { timeoutMs: SEND_TIMEOUT_MS }); /* Backlog 805c: Wiederholung = unchanged */ if (r && r.tacho_check_possible) toast(t('tacho_check_possible')); renderTires(id, el); } catch (err) { toast(err.message, true); } }));
}
const VEH_DOCS_MAX = 30;

export { viewCheckPaper, viewVehicle, viewVehicles };
