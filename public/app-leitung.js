// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { S, WST_ST, api, bDate, clipTxt, esc, fmtD, fmtDT, fmtDue, fmtKm, hj, hoMissing, isMgr, mk, mkR, nDays, partsWaitDays, plate, plateCmp, posL, rdyOf, recentRepeat, t, tn, wsName } from './app-main.js';

// Fuhrparkleitung: „Heute zu tun“ – nur aus gespeicherten Daten, mit direkten Links
async function fleetTodo() {
  // Teilausfall (Funkloch, Zeitüberschreitung) zählen: vorher still „leer“ → grünes „Nichts Dringendes offen“ trotz offener Kostenfreigaben (23.10.2026)
  let failed = 0; const soft = (d) => () => { failed++; return d; };
  const [cs, ov, fs, tc, dr, ct, cl, wi, af] = await Promise.all([
    api('GET', '/api/cases?status=open&limit=500').then((r) => r.cases).catch(soft([])),
    api('GET', '/api/maintenance').catch(soft(null)),
    api('GET', '/api/fines?status=open').then((r) => Object.assign(r.fines, { warn_days: r.warn_days })).catch(soft([])),
    isMgr() ? api('GET', '/api/tacho').catch(soft(null)) : null,
    isMgr() ? api('GET', '/api/drivers').then((r) => r.drivers).catch(soft([])) : [],
    isMgr() ? api('GET', '/api/contracts?filter=aktiv').then((r) => r.contracts).catch(soft([])) : [],
    isMgr() ? api('GET', '/api/claims?filter=nachfassen').then((r) => r.claims).catch(soft([])) : [],
    // Lkw ohne Alpine-Symbol laut Erfassung – Entscheidung zur Umrüstung liegt bei der Fuhrparkleitung (nur Information, keine Sperre)
    isMgr() ? api('GET', '/api/tires/winter').then((r) => r.noncompliant).catch(soft([])) : [],
    // Fahrzeuge mit kritischen offenen Agentenbefunden (Felder nur für Inhaber/Fuhrparkleitung, Umgebung der Person)
    isMgr() ? api('GET', '/api/vehicles').then((r) => r.vehicles.filter((v) => v.agent_findings_critical > 0)).catch(soft([])) : [],
  ]);
  af.sort((a, b) => b.agent_findings_critical - a.agent_findings_critical || b.agent_findings_open - a.agent_findings_open || plateCmp(a.plate, b.plate));
  const today = bDate();
  const in7 = bDate(7);
  // Wartende zuerst (Backlog 239, Blickwinkel „Inhaber nach dem Urlaub“): die Liste kommt nach Dringlichkeit und *neueste* zuerst –
  // bei mehr als 8 Einträgen fielen gerade die am längsten wartenden Kostenfreigaben/Meldungen ins „+N“
  const asc = (f) => (a, b) => String(f(a) || '9').localeCompare(String(f(b) || '9'));
  const PR = { kritisch: 0, mittel: 1, niedrig: 2 };
  const groups = [
    // gesperrte zuerst (wie die Vorgangsliste, Backlog 193/278 – gesperrte Meldung mit „niedrig“ stand sonst hinten), Zeile nennt die Sperre
    ['todo_receive', cs.filter((c) => c.status === 'gemeldet' && !c.fleet_received_at).sort((a, b) => (b.safety_lock ? 1 : 0) - (a.safety_lock ? 1 : 0) || (PR[a.priority] ?? 3) - (PR[b.priority] ?? 3) || asc((c) => c.created_at)(a, b)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}${c.safety_lock ? ' · ' + t('locked') : ''}`, 'kritisch'],
    // Backlog 1041 (Blickwinkel „Leitung vertritt die erkrankte Kollegin“): Eingang bestätigt, Bewertung offen – am längsten wartende zuerst, gesperrte vorn;
    // ohne Namen der bestätigenden Person (steht im Vorgang)
    ['todo_untriaged', cs.filter((c) => c.status === 'gemeldet' && c.fleet_received_at).sort((a, b) => (b.safety_lock ? 1 : 0) - (a.safety_lock ? 1 : 0) || asc((c) => c.fleet_received_at)(a, b)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}${c.safety_lock ? ' · ' + t('locked') : ''} · ${t('received')} ${fmtD(c.fleet_received_at)}`, 'mittel'],
    // Backlog 463: Antwort des Melders auf eine Rückfrage eingegangen, älteste Rückfrage zuerst
    ['todo_q_answered', cs.filter((c) => c.q_state === 'answered').sort(asc((c) => c.q_at)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${t('q_asked_at')} ${fmtD(c.q_at)}`, 'mittel'],
    // Backlog 522 (Blickwinkel „Leitung im Urlaub, Inhaber vertritt“): Werkstatt meldet fehlenden Schlüssel/Fahrzeugschein – Leitung klärt (vorher nur Push/Vorgang)
    ['todo_handover', cs.filter((c) => hoMissing(c).length).sort(asc((c) => c.status_since || c.updated_at)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${hoMissing(c).join(', ')}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''}`, 'mittel'],
    ['todo_vfind_crit', af, (v) => `#/vehicles/${encodeURIComponent(v.id)}`, (v) => `${v.plate} · ${t('vfind_crit').replace('{n}', v.agent_findings_critical)} · ${t('vfind_n').replace('{n}', v.agent_findings_open)}`, 'kritisch'],
    ['todo_followup', cs.filter((c) => c.followup_on && c.followup_on <= today).sort(asc((c) => c.followup_on)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${fmtD(c.followup_on)}${c.followup_note ? ' · ' + c.followup_note : ''}`, 'mittel'],
    ['todo_repeat', cs.filter(recentRepeat), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${fmtD(c.last_repeat_at)}`, 'mittel'],
    ['todo_cost_approval', cs.filter((c) => c.cost_over_limit_at).sort(asc((c) => c.cost_over_limit_at)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''} · ${fmtD(c.cost_over_limit_at)}`, 'mittel'],
    ['todo_qc', cs.filter((c) => c.status === 'abschlusskontrolle').sort(asc((c) => c.status_since || c.updated_at)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate}`, 'mittel'],
    ['todo_plan_passed', cs.filter((c) => c.status === 'werkstatt_freigegeben' && c.planned_date && c.planned_date < today).sort(asc((c) => c.planned_date)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${fmtD(c.planned_date)}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''}`, 'mittel'],
    ['todo_parts_passed', cs.filter((c) => c.status === 'wartet_teile' && c.parts_expected_date && c.parts_expected_date < today).sort(asc((c) => c.parts_expected_date)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${t('parts_eta')} ${fmtD(c.parts_expected_date)}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''}`, 'mittel'],
    ['todo_parts', cs.filter((c) => c.status === 'wartet_teile' && !(c.parts_expected_date && c.parts_expected_date < today)).sort(asc((c) => c.status_since || c.updated_at)), (c) => `#/cases/${c.id}`, (c) => { const d = partsWaitDays(c); return `${c.case_no} · ${c.plate}${c.parts_expected_date ? ' · ' + t('parts_eta') + ' ' + fmtD(c.parts_expected_date) : ' · ' + t('parts_eta_none')}${d ? ' · ' + t('parts_wait_days').replace('{d}', nDays(d)) : ''}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''}`; }, ''], // Backlog 447: Wartezeit, fehlender Termin und Werkstatt – wen die Leitung anruft
    // Backlog 872 (Folge aus 871): „voraussichtlich fertig“ laut Werkstatt vorbei, Fahrzeug noch nicht fertig – am längsten überschritten zuerst
    ['todo_ready_overdue', cs.filter((c) => c.ready_expected_on && rdyOf(c) && c.ready_expected_on < today).sort(asc((c) => c.ready_expected_on)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ${t('rdy_title')} ${fmtD(c.ready_expected_on)} · ${t('st_' + c.status)}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''}`, ''],
    // Backlog 869 (Blickwinkel „Fuhrparkleitung sieht morgens, welche Reparaturen unterbrochen wurden“): Arbeitsstand eingetragen (Backlog 867),
    // am längsten unterbrochene zuerst – Information, wo ein Lkw halb zerlegt steht und wer zuletzt daran war
    ['todo_paused', cs.filter((c) => c.work_state_note && WST_ST.includes(c.status)).sort(asc((c) => c.work_state_at)), (c) => `#/cases/${c.id}`, (c) => `${c.case_no} · ${c.plate} · ⏸ ${fmtDT(c.work_state_at)}${c.work_state_by_name ? ' · ' + c.work_state_by_name : ''}${c.workshop_site ? ' · ' + wsName(c.workshop_site) : ''} · ${clipTxt(c.work_state_note, 80)}`, ''],
    ['todo_defects_no_case', ov && ov.defects_without_case ? ov.defects_without_case : [], (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}`, (x) => `${x.plate} · ${mk(x.kind)} ${fmtD(x.done_date)} · ${t('res_' + x.result)}`, 'kritisch'],
    ['todo_reinspection', ov && ov.reinspection_pending ? ov.reinspection_pending : [], (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}`, (x) => `${x.plate} · ${mk(x.kind)} ${fmtD(x.done_date)} · ${t('res_' + x.result)} · ${x.case_no} ${t('released_short')} ${fmtD(x.closed_at)}`, 'mittel'],
    ['todo_result_missing', ov && ov.result_missing ? ov.result_missing : [], (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}?ev=${encodeURIComponent(x.id)}`, (x) => `${x.plate} · ${mk(x.kind)} ${fmtD(x.done_date)}`, ''],
    // Backlog 884 (Folge aus 883): HU/SP/Tachograph erfasst, Prüfbericht nicht hochgeladen – Akte zeigt oben „Prüfbericht fehlt“ mit Knopf zum Hochladen
    ['todo_report_missing', ov && ov.report_missing ? ov.report_missing : [], (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}`, (x) => `${x.plate} · ${mk(x.kind)} ${fmtD(x.done_date)}`, ''],
    ['todo_maint_unrecorded', ov ? ov.rows.filter((r) => r.unrecorded_order) : [], (r) => `#/vehicles/${encodeURIComponent(r.vehicle_id)}`, (r) => `${r.plate} · ${mk(r.kind)} · ${r.unrecorded_order.case_no} ${t('released_short')} ${fmtD(r.unrecorded_order.closed_at)}`, 'mittel'],
    ['todo_inspections', ov ? ov.rows.filter((r) => r.status === 'ueberfaellig' || (r.next_due_date && r.next_due_date <= in7 && r.date_status !== 'erledigt')) : [], (r) => `#/vehicles/${encodeURIComponent(r.vehicle_id)}`, (r) => `${r.plate} · ${mkR(r)} · ${r.km_status === 'ueberfaellig' ? `${t('due_at_km')} ${fmtKm(r.next_due_km)} (${t('km_over')} ${fmtKm(-r.km_remaining)})` : r.next_due_date ? fmtD(r.next_due_date) : (r.next_due_km ? fmtKm(r.next_due_km) : '')} · ${r.planned_date && r.planned_date >= today ? t('planned') + ' ' + fmtD(r.planned_date) : t('no_planned_date')}`, 'mittel'],
    ['todo_tacho', tc ? [...tc.drivers.map((x) => ({ ...x, label: x.display_name, href: '#/drivers/' + x.id })), ...tc.vehicles.map((x) => ({ ...x, label: x.plate, href: '#/vehicles/' + encodeURIComponent(x.id) }))].filter((x) => x.status === 'ueberfaellig' || x.status === 'bald')
      // Fahrer und Fahrzeuge gemeinsam nach Dringlichkeit, dann Frist – ein überfälliger Massenspeicher stand sonst hinter acht „bald fälligen“ Fahrerkarten im „+N“ (23.10.2026)
      .sort((a, b) => (a.status === 'ueberfaellig' ? 0 : 1) - (b.status === 'ueberfaellig' ? 0 : 1) || String(a.due || '9').localeCompare(String(b.due || '9'))) : [], (x) => x.href, (x) => `${x.label} · ${fmtD(x.due)}${x.status === 'ueberfaellig' ? ' !' : ''}`, 'mittel'],
    ['todo_driver_docs', dr.filter((d) => (d.status.overall_docs || d.status.overall) === 'kritisch'), /* Auslesung steht unter todo_tacho */ (d) => `#/drivers/${d.id}`, (d) => `${d.display_name} · ${[...d.status.items.filter((i) => i.status === 'abgelaufen').map((i) => t('dk2_' + i.kind) + (i.title ? ' ' + i.title : '')), d.status.check.status === 'mangel' ? t('license_check') : ''].filter(Boolean).join(', ')}`, 'kritisch'],
    ['todo_contracts', ct.filter((c) => (c.status.end && (c.status.end.status === 'abgelaufen' || c.end_date <= in7)) || (c.status.notice && c.status.notice.by >= today && c.status.notice.by <= in7)), (c) => `#/vehicles/${encodeURIComponent(c.vehicle_id)}`,
      (c) => `${c.plate} · ${t('ck_' + c.kind)} · ${c.status.notice && c.status.notice.by >= today && c.status.notice.by <= in7 ? t('ct_notice_by') + ' ' + fmtD(c.status.notice.by) : t('ct_end') + ' ' + fmtD(c.end_date)}${c.end_date < today ? ' !' : ''}`, 'mittel'],
    ['todo_claims', cl, (c) => `#/cases/${c.case_id}`, (c) => `${c.case_no} · ${c.plate} · ${c.insurer} · ${tn('claim_days_open', c.days_open)}`, ''],
    ['todo_winter', wi, (x) => `#/vehicles/${encodeURIComponent(x.vehicle_id)}?sec=tires`, (x) => `${x.plate} · ${t('winter_bad').replace('{p}', x.noncompliant.map(posL).join(', '))}${x.open_order ? ` · 🔧 ${t('mo_open')} ${x.open_order.case_no}` : ''}${x.closed_order ? ` · ⚠ ${t('wo_closed_short').replace('{no}', x.closed_order.case_no)}` : ''}`, ''],
    ['todo_fines', fs.filter((f) => f.response_due && f.response_due <= (Number.isInteger(fs.warn_days) ? bDate(fs.warn_days) : in7) && ['eingegangen', 'fahrer_ermittelt', 'fahrer_informiert'].includes(f.status)), (f) => `#/fines/${f.id}`, (f) => `${f.fine_no} · ${f.plate || f.plate_in_letter} · ${fmtDue(f.response_due)}${f.response_due < today ? ' !' : ''}`, 'mittel'],
  ].filter(([, list]) => list.length);
  const failNote = failed ? `<section class="panel alert" role="alert" data-todofail><b>${esc(t('todo_partial_fail'))}</b> <button type="button" class="btn secondary" id="todoretry">${esc(t('retry'))}</button></section>` : '';
  if (failed && !groups.length) return failNote;
  // Erstnutzung/Lücken (22.10.2026): „Nichts Dringendes offen“ stand grün auch ohne Fahrzeuge bzw. mit Pflichtprüfungen ohne Termin
  if (!groups.length && ov && ov.totals && ov.totals.vehicles === 0) return `<section class="panel" role="note" data-novehicles><b>${esc(t('todo_none'))}</b><p class="small">${esc(t(S.me && S.me.role === 'fleet' ? 'todo_no_vehicles_fleet' : 'todo_no_vehicles'))} <a href="#/vehicles">${esc(t('nav_vehicles'))} ›</a></p></section>`;
  if (!groups.length && ov && ov.gaps && ov.gaps.length) return `<section class="panel" role="note" data-todogaps><b>${esc(t('todo_none'))}</b><p class="small">${esc(tn('todo_gaps_hint', ov.gaps.length))} <a href="#/maintenance?f=gaps">${esc(t('maintenance'))} ›</a></p></section>`;
  if (!groups.length) return `<section class="panel good"><b>${esc(t('todo_none'))}</b></section>`;
  return `${failNote}<h2>${esc(t('todo_today'))}</h2>${groups.map(([k, list, href, label, cls]) => `<details class="panel"${cls === 'kritisch' ? ' open' : ''}><summary><b>${esc(k === 'todo_fines' ? t(k).replace('{n}', Number.isInteger(fs.warn_days) ? fs.warn_days : 7) : t(k))}</b> <span class="chip ${cls}">${list.length}${(ov && ov.lists_truncated || []).includes(TODO_TRUNC[k]) ? '+' : ''}</span></summary><div class="list" style="margin-top:8px">${list.slice(0, 8).map((x) => `<a class="row" href="${href(x)}"><span class="title" style="white-space:normal">${esc(label(x))}</span></a>`).join('')}</div>${list.length > 8 ? `<p class="small muted" data-todomore="${k}">+${list.length - 8}${TODO_LIST[k] ? ` · <a href="${hj(TODO_LIST[k])}">${esc(t('show_in_list'))} ›</a>` : ''}</p>` : ''}${k === 'todo_vfind_crit' ? `<p class="small"><a href="${hj('#/vehicles?f=with_findings_crit')}" id="todovfind">${esc(t('show_in_vlist'))} ›</a> · <a href="#/master">${esc(t('nav_master'))} ›</a></p>` : ''}${k === 'todo_repeat' ? `<p class="small"><a href="${hj('#/cases?f=repeat')}">${esc(t('show_in_list'))} ›</a></p>` : ''}${k === 'todo_tacho' ? `<p class="small"><a href="${hj('#/tacho')}" id="todotacho">${esc(t('tacho'))} ›</a></p>` : ''}${k === 'todo_plan_passed' ? `<p class="small"><a href="${hj('#/plan')}">${esc(t('wplan'))} ›</a></p>` : ''}${k === 'todo_inspections' ? `<p class="small"><a href="${hj('#/plan?s=mdue')}">${esc(t('wplan'))}: ${esc(t('wplan_mdue'))} ›</a></p>` : ''}${k === 'todo_winter' ? `<p class="small"><a href="${hj('#/tires?f=winter_bad')}" id="todowinter">${esc(t('ws_winter_show'))} ›</a></p>${list.some((x) => x.closed_order) ? `<p class="small"><a href="${hj('#/tires?f=winter_closed')}" id="todowclosed">${esc(t('tires_winter_closed'))} ›</a></p>` : ''}` : ''}${k === 'todo_result_missing' ? `<p class="small"><a href="${hj('#/quality?f=inspection_no_result')}">${esc(t('show_in_dq'))} ›</a></p>` : ''}</details>`).join('')}`;
}
// „+N“ in „Heute zu tun“ verlinkt die vollständige, gleich gefilterte Vorgangsliste (Backlog 239)
const TODO_LIST = { todo_receive: '#/cases?f=unreceived', todo_untriaged: '#/cases?f=received_open', todo_followup: '#/cases?f=followup', todo_cost_approval: '#/cases?f=cost_approval', todo_q_answered: '#/cases?f=q_answered', todo_paused: '#/cases?f=paused', todo_ready_overdue: '#/cases?f=ready_overdue' };
// Listen der Prüftermin-Übersicht, die der Server bei 200 kappt (`lists_truncated`) → Zähler „200+“
const TODO_TRUNC = { todo_defects_no_case: 'defects_without_case', todo_reinspection: 'reinspection_pending', todo_result_missing: 'result_missing', todo_report_missing: 'report_missing' };

export { fleetTodo };
