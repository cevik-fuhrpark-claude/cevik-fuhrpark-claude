// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { BERLIN_FMT, BRIDGE_HINT, CARGO_HINT, FUEL_HINT, GLASS_HINT, HITRUN2_HINT, HITRUN3_HINT, HITRUN_HINT, MARTEN_HINT, NUMPLATE_HINT, ROOFICE_HINT, STORM_HINT, STOW_HINT, THEFT_HINT, TOW_HINT, VANDAL_HINT, WILD_HINT, bDate, claimChip, decIn, esc, eur, fileUrl, fmtD, mayReport, noSticker, noTicket, noTr, noWsObj, plate, recurFix, t, tn } from './app-main.js';

const CLAIM_ST = ['gemeldet', 'in_pruefung', 'reguliert', 'abgelehnt', 'zurueckgezogen'];

function claimAppraisalInfo(cl) {
  if (!cl || !(cl.appraiser || cl.appraisal_on || cl.appraisal_received_on || cl.appraisal_net !== null && cl.appraisal_net !== undefined)) return '';
  const rows = [];
  if (cl.appraiser) rows.push(`<dt>${esc(t('ca_appraiser'))}</dt><dd>${esc(cl.appraiser)}</dd>`);
  if (cl.appraisal_on) rows.push(`<dt>${esc(t('ca_on'))}</dt><dd>${fmtD(cl.appraisal_on)}${cl.appraisal_on === bDate() && !cl.appraisal_received_on ? ` <span class="chip mittel">${esc(t('today'))}</span>` : ''}</dd>`);
  rows.push(`<dt>${esc(t('ca_received'))}</dt><dd>${cl.appraisal_received_on ? fmtD(cl.appraisal_received_on) : cl.appraisal_pending ? `<span class="chip mittel">${esc(t('ca_pending'))}</span>` : '–'}</dd>`);
  if (cl.appraisal_net !== null && cl.appraisal_net !== undefined) rows.push(`<dt>${esc(t('ca_net'))}</dt><dd>${eur(cl.appraisal_net)}</dd>`);
  return `<h4 style="margin:.4rem 0 .2rem">${esc(t('ca_title'))}</h4><dl class="kv">${rows.join('')}</dl>`;
}

function claimOpponentInfo(cl) {
  if (!cl || !(cl.opponent_plate || cl.opponent_insurer || cl.opponent_claim_no)) return '';
  const rows = [];
  if (cl.opponent_plate) rows.push(`<dt>${esc(t('co_plate'))}</dt><dd><b data-coplate>${esc(cl.opponent_plate)}</b></dd>`);
  if (cl.opponent_insurer) rows.push(`<dt>${esc(t('co_insurer'))}</dt><dd>${esc(cl.opponent_insurer)}</dd>`);
  if (cl.opponent_claim_no) rows.push(`<dt>${esc(t('co_claim_no'))}</dt><dd>${noTr(cl.opponent_claim_no)}</dd>`);

  const ov = cl.opponent_vehicle;
  const own = ov ? `<p class="small" data-coown>ℹ️ ${esc(t('co_own').replace('{p}', ov.plate))} <a href="#/vehicles/${encodeURIComponent(ov.id)}" style="white-space:nowrap">${esc(t('co_own_file'))}</a>${ov.cases.length
    ? `<br>${esc(t('co_own_cases'))} ${ov.cases.map((x) => `<a href="#/cases/${esc(x.id)}" data-coowncase style="white-space:nowrap" translate="no">${esc(x.case_no)}</a> (${esc(t('st_' + x.status))})`).join(', ')}`
    : ov.active && mayReport() ? ` · <a href="#/new/${esc(ov.id)}" data-coownnew style="white-space:nowrap">${esc(t('co_own_report'))}</a>` : ''}</p>` : '';
  return `<h4 style="margin:.4rem 0 .2rem">${esc(t('co_title'))}</h4><dl class="kv">${rows.join('')}</dl>${own}`;
}

function claimPoliceInfo(cl) {
  if (!cl || !(cl.police_station || cl.police_ref || cl.police_reported_on)) return '';
  const rows = [];
  if (cl.police_station) rows.push(`<dt>${esc(t('cp_station'))}</dt><dd>${esc(cl.police_station)}</dd>`);
  if (cl.police_ref) rows.push(`<dt>${esc(t('cp_ref'))}</dt><dd translate="no">${esc(cl.police_ref)}</dd>`);
  if (cl.police_reported_on) rows.push(`<dt>${esc(t('cp_on'))}</dt><dd>${fmtD(cl.police_reported_on)}</dd>`);
  return `<h4 style="margin:.4rem 0 .2rem">${esc(t('cp_title'))}</h4><dl class="kv">${rows.join('')}</dl>`;
}
async function claimSection(cl, contracts, files = [], desc = '', c = null, coupled = []) {


  desc = recurFix(desc);

  const cpc = coupled.flatMap((g) => g.open_cases.filter((o) => o.claim).map((o) => ({ ...o.claim, case_no: o.case_no, plate: g.plate })));
  const cpPull = cpc.filter((x) => x.police_station || x.police_ref || x.police_reported_on);


  const clKey = (x) => String(x || '').toLocaleLowerCase('de').replace(/ß/g, 'ss').replace(/[\s.\-/_\u2010-\u2015]/g, '');
  const sameNo = cl && cl.claim_no ? cpc.filter((x) => x.claim_no && clKey(x.claim_no) === clKey(cl.claim_no)) : [];
  const cpPlates = coupled.map((g) => g.plate);
  const sameElse = cl && cl.same_claim_no ? cl.same_claim_no.filter((x) => !cpPlates.includes(x.plate) && !sameNo.some((y) => y.case_no === x.case_no)) : [];

  const occDay = c ? (c.occurred_at ? (String(c.occurred_at).length === 10 ? c.occurred_at : BERLIN_FMT.format(new Date(c.occurred_at))) : c.created_at ? BERLIN_FMT.format(new Date(c.created_at)) : null) : null;
  const kEnd = (k) => k.ended_on || k.end_date || null;
  const validAt = (k, d) => !!d && (!k.start_date || k.start_date <= d) && (!kEnd(k) || kEnd(k) >= d);
  const kPeriod = (k) => (k.start_date || kEnd(k) ? ` (${k.start_date ? fmtD(k.start_date) : '…'}–${kEnd(k) ? fmtD(kEnd(k)) : '…'})` : '');
  const validK = contracts.filter((k) => validAt(k, occDay));
  const preK = validK.length === 1 ? validK[0].id : null;

  const noOcc = !!(cl && c && (c.origin === 'meldung' || (c.origin === 'kontrolle' && c.check_item && !c.parent_case_id)) && !c.occurred_at && ['gemeldet', 'in_pruefung'].includes(cl.status));

  const theftNoRef = THEFT_HINT.test(desc || '') && !(cl && cl.police_ref);

  const hitrunNoRef = !theftNoRef && (HITRUN_HINT.test(desc || '') || HITRUN2_HINT.test(desc || '') || HITRUN3_HINT.test(desc || '')) && !(cl && cl.police_ref);

  const vandalNoRef = !theftNoRef && !hitrunNoRef && VANDAL_HINT.test(desc || '') && !(cl && cl.police_ref);

  const bridgeNoRef = !theftNoRef && !hitrunNoRef && !vandalNoRef && BRIDGE_HINT.test(desc || '') && !(cl && cl.police_ref);

  const stowNoRef = !theftNoRef && !hitrunNoRef && !vandalNoRef && !bridgeNoRef && STOW_HINT.test(desc || '') && !(cl && cl.police_ref);

  const glassNoClaim = !cl && GLASS_HINT.test(noTicket(noWsObj(noSticker(desc))));

  const martenNoClaim = !cl && MARTEN_HINT.test(desc || '');

  const stormNoClaim = !cl && STORM_HINT.test(desc || '');

  const rooficeNoClaim = !cl && ROOFICE_HINT.test(desc || '');

  const cargoNoClaim = !cl && CARGO_HINT.test(desc || '');

  const numplateHint = NUMPLATE_HINT.test(noSticker(desc));

  const fuelNoClaim = !cl && FUEL_HINT.test(desc || '');

  const towHint = TOW_HINT.test(desc || '');

  const wildHint = WILD_HINT.test(desc || '') && !(cl && cl.file_id);
  const v = (k) => (cl && cl[k] !== null && cl[k] !== undefined ? esc(String(cl[k])) : '');
  const money = (k) => (cl && cl[k] !== null && cl[k] !== undefined ? esc(decIn(cl[k])) : '');
  const info = cl ? `<p style="margin-top:0">${claimChip(cl.status)} ${esc(cl.insurer)}${cl.claim_no ? ` · ${esc(t('claim_no'))} ${noTr(cl.claim_no)}` : ''}</p>
    <dl class="kv"><dt>${esc(t('claim_reported'))}</dt><dd>${fmtD(cl.reported_on)}${cl.days_open !== null ? ` · ${esc(tn('claim_days_open', cl.days_open))}` : ''}</dd>${cl.deductible_net !== null ? `<dt>${esc(t('claim_deductible'))}</dt><dd>${eur(cl.deductible_net)}</dd>` : ''}${cl.reimbursed_net !== null ? `<dt>${esc(t('claim_reimbursed'))}</dt><dd>${eur(cl.reimbursed_net)} · ${fmtD(cl.reimbursed_on)}</dd>` : ''}</dl>
    ${sameNo.map((x) => `<p class="small" data-claimsameno>ℹ️ ${esc(t('claim_same_no').replace('{c}', x.case_no).replace('{p}', x.plate))}</p>`).join('')}${sameElse.map((x) => `<p class="small" data-claimsamenodup role="note">⚠️ ${esc(t('claim_same_no_dup').replace('{p}', x.plate).replace('{i}', x.insurer || ''))} <a href="#/cases/${encodeURIComponent(x.case_id)}" translate="no">${esc(x.case_no)}</a></p>`).join('')}${claimAppraisalInfo(cl)}${claimOpponentInfo(cl)}${claimPoliceInfo(cl)}<p class="small muted">${esc(t('evidence'))}: ${esc(cl.evidence)}${cl.note ? ' · ' + esc(cl.note) : ''}</p>${cl.file_id && cl.file_name ? `<p class="small">📎 ${esc(t('claim_file'))}: <a href="${fileUrl(cl.file_id)}" target="_blank" rel="noopener">${esc(cl.file_name)}</a></p>` : ''}` : `<p class="muted small" style="margin-top:0">${esc(t('claim_none'))}</p>`;
  return `<section class="panel"><h3 style="margin-top:0">${esc(t('claim_title'))}</h3>${theftNoRef ? `<p class="small" id="cptheft">⚠️ ${esc(t('cp_theft_hint'))}</p>` : ''}${hitrunNoRef ? `<p class="small" data-claimhitrun>⚠️ ${esc(t('cp_hitrun_hint'))}</p>` : ''}${vandalNoRef ? `<p class="small" data-claimvandal>⚠️ ${esc(t('cp_vandal_hint'))}</p>` : ''}${bridgeNoRef ? `<p class="small" data-claimbridge>⚠️ ${esc(t('cp_bridge_hint'))}</p>` : ''}${stowNoRef ? `<p class="small" data-claimstow>⚠️ ${esc(t('cp_stow_hint'))}</p>` : ''}${glassNoClaim ? `<p class="small" data-claimglass>ℹ️ ${esc(t('claim_glass_hint').replace('{b}', t('claim_add')))}</p>` : ''}${martenNoClaim ? `<p class="small" data-claimmarten>ℹ️ ${esc(t('claim_marten_hint').replace('{b}', t('claim_add')))}</p>` : ''}${stormNoClaim ? `<p class="small" data-claimstorm>ℹ️ ${esc(t('claim_storm_hint').replace('{b}', t('claim_add')))}</p>` : ''}${cargoNoClaim ? `<p class="small" data-claimcargo>ℹ️ ${esc(t('claim_cargo_hint'))}</p>` : ''}${numplateHint ? `<p class="small" data-claimnumplate>ℹ️ ${esc(t('claim_numplate_hint').replace('{p}', t('cp_title')).replace('{e}', t('edit_master')).replace('{f}', t('former_plates')))}</p>` : ''}${rooficeNoClaim ? `<p class="small" data-claimroofice>ℹ️ ${esc(t('claim_roofice_hint').replace('{b}', t('claim_add')))}</p>` : ''}${fuelNoClaim ? `<p class="small" data-claimfuel>ℹ️ ${esc(t('claim_fuel_hint').replace('{b}', t('claim_add')))}</p>` : ''}${towHint ? `<p class="small" data-claimtow>ℹ️ ${esc(t('claim_tow_hint').replace('{f}', t('fines')))}</p>` : ''}${wildHint ? `<p class="small" data-claimwild>ℹ️ ${esc(t('claim_wild_hint'))}</p>` : ''}${noOcc ? `<p class="small" data-claimnoocc>⚠️ ${esc(t('claim_no_occ_hint').replace('{b}', t('act_set_occurred_at')))}</p>` : ''}${info}<details class="noprint"><summary>${esc(t(cl ? 'claim_edit' : 'claim_add'))}</summary><form id="clf"><input type="hidden" name="expected_updated_at" value="${cl ? esc(cl.updated_at || '') : ''}">
    <p class="small muted">${esc(t('claim_hint'))}</p>
    <label>${esc(t('claim_contract'))}</label><select name="contract_id"><option value="">${esc(t('claim_no_contract'))}</option>${contracts.map((k) => `<option value="${esc(k.id)}"${(cl ? cl.contract_id === k.id : preK === k.id) ? ' selected' : ''}>${esc(k.partner)}${k.contract_no ? ' · ' + esc(k.contract_no) : ''}${kPeriod(k)}${k.ended_on ? ` (${esc(t('cs_beendet'))})` : ''}</option>`).join('')}</select>${!cl && preK ? `<p class="small muted" data-claimprek>${esc(t('claim_contract_pre').replace('{d}', fmtD(occDay)))}</p>` : ''}
    <label>${esc(t('claim_insurer'))}<span class="hint">${esc(t('claim_insurer_hint'))}</span></label><input name="insurer" maxlength="120" value="${v('insurer')}">
    <label>${esc(t('claim_no'))}</label><input name="claim_no" maxlength="60" value="${v('claim_no')}">
    <label>${esc(t('claim_reported'))}</label><input type="date" name="reported_on" required max="${bDate()}" value="${cl ? v('reported_on') : ''}">
    <label>${esc(t('status_label'))}</label><select name="status">${CLAIM_ST.map((x) => `<option value="${x}"${(cl ? cl.status : 'gemeldet') === x ? ' selected' : ''}>${esc(t('cls_' + x))}</option>`).join('')}</select>
    <label>${esc(t('claim_deductible'))}</label><input name="deductible_net" inputmode="decimal" value="${money('deductible_net')}">
    <label>${esc(t('claim_reimbursed'))}</label><input name="reimbursed_net" inputmode="decimal" value="${money('reimbursed_net')}">
    <label>${esc(t('claim_reimbursed_on'))}</label><input type="date" name="reimbursed_on" max="${bDate()}" value="${v('reimbursed_on')}">
    <label>${esc(t('evidence'))}</label><input name="evidence" required maxlength="300" value="${v('evidence')}"><label>${esc(t('note'))}</label><input name="note" maxlength="1000" value="${v('note')}">
    <fieldset class="panel" style="margin:.6rem 0"><legend>${esc(t('ca_title'))}</legend><p class="small muted" style="margin-top:0">${esc(t('ca_hint'))}</p>
    <label>${esc(t('ca_appraiser'))}</label><input name="appraiser" maxlength="120" value="${v('appraiser')}">
    <label>${esc(t('ca_on'))}<span class="hint">${esc(t('ca_on_hint'))}</span></label><input type="date" name="appraisal_on" max="${bDate(366)}" value="${v('appraisal_on')}">
    <label>${esc(t('ca_received'))}</label><input type="date" name="appraisal_received_on" max="${bDate()}" value="${v('appraisal_received_on')}">
    <label>${esc(t('ca_net'))}<span class="hint">${esc(t('ca_net_hint'))}</span></label><input name="appraisal_net" inputmode="decimal" value="${money('appraisal_net')}"></fieldset>
    <fieldset class="panel" style="margin:.6rem 0"><legend>${esc(t('co_title'))}</legend><p class="small muted" style="margin-top:0">${esc(t('co_hint'))}</p>
    <label>${esc(t('co_plate'))}</label><input name="opponent_plate" maxlength="20" value="${v('opponent_plate')}">
    <label>${esc(t('co_insurer'))}</label><input name="opponent_insurer" maxlength="120" value="${v('opponent_insurer')}">
    <label>${esc(t('co_claim_no'))}</label><input name="opponent_claim_no" maxlength="60" value="${v('opponent_claim_no')}"></fieldset>
    <fieldset class="panel" style="margin:.6rem 0"><legend>${esc(t('cp_title'))}</legend><p class="small muted" style="margin-top:0">${esc(t('cp_hint'))}</p>${cpPull.map((x, i) => `<button type="button" class="btn secondary" data-cppull="${i}" data-st="${esc(x.police_station || '')}" data-ref="${esc(x.police_ref || '')}" data-on="${esc(x.police_reported_on || '')}">${esc(t('cp_pull').replace('{c}', `${x.case_no} (${x.plate})`))}</button>`).join(' ')}
    <label>${esc(t('cp_station'))}</label><input name="police_station" maxlength="120" value="${v('police_station')}">
    <label>${esc(t('cp_ref'))}</label><input name="police_ref" maxlength="60" value="${v('police_ref')}">
    <label>${esc(t('cp_on'))}</label><input type="date" name="police_reported_on" max="${bDate()}" value="${v('police_reported_on')}"></fieldset>
    <label>${esc(t('claim_file'))}<span class="hint">${esc(t('claim_file_hint'))}</span></label><select name="file_id"><option value="">–</option>${files.map((f) => `<option value="${esc(f.id)}"${cl && cl.file_id === f.id ? ' selected' : ''}>${esc(f.filename)}</option>`).join('')}${cl && cl.file_id && cl.file_name && !files.some((f) => f.id === cl.file_id) ? `<option value="${esc(cl.file_id)}" selected>${esc(cl.file_name)}</option>` : ''}</select>
    <div class="actions"><button class="btn secondary">${esc(t('save'))}</button></div></form></details></section>`;
}

export { claimSection };
