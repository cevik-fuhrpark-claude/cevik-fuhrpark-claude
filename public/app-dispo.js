// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-app.mjs aus public/app.js – nicht von Hand bearbeiten (Code in app.js ändern, dann npm run build)
import { BERLIN_FMT, S, WST_ST, api, bDate, cDesc, clipTxt, comboClearV, esc, federalHoliday, fmtD, fmtDT, fmtDue, helpLink, hj, hoMissing, langAttr, ltxt, mk, partsEta, planVehTag, plate, plateCmp, posL, rdyOf, rdyTxt, siteKeyUi, t, tn, translateLockReason, vlAt, woApptTxt, woTag, wsName } from './app-main.js';

// Teile-Liefertermin laut Werkstatt (nur bei „wartet auf Teile“); überschritten = markiert
// „Rückkehr: ungeklärt“ (Disposition): der Werkstatttermin ist der Beginn, nicht die Fertigstellung – ein Datum zählt nur, solange es noch
// bevorsteht; in Reparatur bzw. Termin/Liefertermin heute oder vorbei → ungeklärt (Blickwinkel „Disposition, erster Tag“, 26.10.2026)
const dispoReturnKnown = (c) => {
  if (c.status === 'abschlusskontrolle') return true;
  if (c.ready_expected_on && rdyOf(c) && c.ready_expected_on > bDate()) return true; // Backlog 871: Werkstatt nennt die Fertigstellung
  if (c.status === 'in_reparatur') return false;
  const d = c.status === 'wartet_teile' ? c.parts_expected_date : c.planned_date;
  return !!d && d > bDate();
};
// Backlog 968: Startseite der Disposition (Tafel, Hinweise, Ausdruck, eingeplante Werkstatttermine) – ausgelagert in die Gruppe „dispo“
// (async, Aufruf in viewHome vor dem Seitenaufbau). cases === null: Fahrer-/Offline-Fall (keine Nachabfragen).
async function dispoHome(cases) {
  let html = '';
  // Standard-Standort aus „Mein Konto“: Tafel nur für diesen Standort – sichtbar vermerkt und jederzeit auf „alle“ umschaltbar
  const hs = S.me.home_site && !S.dispoAll ? S.me.home_site : '';
  const hq = hs ? encodeURIComponent(hs) : '';
  const [dcs, dmo, dvs] = await Promise.all([cases === null ? [] : api('GET', '/api/cases?status=open&limit=500' + (hq ? '&vsite=' + hq : '')).then((r) => r.cases).catch(() => []), cases === null ? null : api('GET', '/api/maintenance' + (hq ? '?site=' + hq : '')).catch(() => null),
    cases === null ? [] : api('GET', '/api/vehicles').then((r) => r.vehicles).catch(() => [])]);
  html += dispoBoard(dcs, dmo && dmo.defects_without_case ? dmo.defects_without_case : [], new Map(dvs.filter((v) => v.coupled).map((v) => [v.id, v.coupled])), new Set(dvs.filter((v) => v.eval_excluded).map((v) => v.id)));
  if (cases !== null) html += await dispoBack(dcs, hq);
  // Neue Meldungen, deren Eingang die Leitung noch nicht bestätigt hat (gleiche Regel wie Filter `unreceived`; Standort wie die Tafel) –
  // vorher sah die Disposition „was ist neu?“ nur über die nach Dringlichkeit sortierte Liste (Blickwinkel „Disposition, erster Tag“, 26.10.2026)
  const nu = dcs.filter((c) => c.status === 'gemeldet' && !c.fleet_received_at).length;
  if (nu) html += `<p class="noprint"><a href="${hj('#/cases?f=unreceived')}" id="dunrec" data-site="${esc(hs)}"><b>${esc(t('dispo_unreceived'))} (${nu})</b></a></p>`;
  // Backlog 474: eingeschränkt fahrbereit gemeldet, noch ohne Werkstattauftrag und ohne Sperre (gleiche Regel wie Filter `limited`) –
  // stand vorher in keinem Abschnitt der Tafel; nur Hinweis, ob das Fahrzeug eingeplant wird, entscheidet die Disposition
  const nlL = dcs.filter((c) => c.status === 'gemeldet' && !c.safety_lock && c.reported_driveability === 'eingeschraenkt'); const nl = nlL.length;
  if (nl) html += `<p class="noprint"><a href="${hj('#/cases?f=limited')}" id="dlimited"><b>${esc(t('dispo_limited_new'))} (${nl})</b></a></p>${dispoPrintLine('limited', t('dispo_limited_new'), nlL.map((c) => c.plate))}`;
  // Fahrzeuge mit aktiven Hinweisen (z. B. „Ladebordwand nur manuell“) – Link auf die gefilterte Fahrzeugliste; Standortregel wie oben
  // Backlog 475: gleiche Standortregel wie Server/Fahrzeugliste (siteKeyUi: NFC, Leerraum vereinheitlicht) – vorher zählte z. B. „Nürnberg  Süd“
  // (doppeltes Leerzeichen) hier nicht mit, die verlinkte Liste zeigte es aber
  const nk = siteKeyUi;
  const wn = dvs.filter((v) => v.notes_active > 0 && (!hs || nk(v.site) === nk(hs === 'ohne' ? null : hs))).length;
  if (wn) html += `<p class="noprint"><a href="${hj('#/vehicles?f=with_notes')}" id="dnotes">${esc(t('vnotes_with_veh'))} (${wn})</a></p>`;
  // Prüfung/Wartung überfällig (gleiche Regel wie der Filter der Fahrzeugliste, ohne ruhende) – vorher nur in der Liste sichtbar (23.10.2026)
  const moL = dvs.filter((v) => !v.eval_excluded && (!hs || nk(v.site) === nk(hs === 'ohne' ? null : hs)) && ((v.next_due && v.next_due < bDate()) || (v.km_remaining !== null && v.km_remaining !== undefined && v.km_remaining < 0))); const mo = moL.length;
  if (mo) html += `<p class="noprint"><a class="panel alert" style="display:block;text-decoration:none" href="${hj('#/vehicles?f=maint_overdue')}" id="dmover"><b>${esc(t('av_maint_overdue'))} (${mo})</b></a></p>${dispoPrintLine('mover', t('av_maint_overdue'), moL.map((v) => v.plate + (v.next_due && v.next_due < bDate() ? ` (${v.next_due_kind ? mk(v.next_due_kind) + ' ' : ''}${fmtD(v.next_due)})` : '')), true)}`;
  html += dispoDueSoon(dvs, (v) => !hs || nk(v.site) === nk(hs === 'ohne' ? null : hs), dmo && Array.isArray(dmo.rows) ? dmo.rows : null);
  // Gespann gesperrt (gekoppeltes Fahrzeug gesperrt, eigenes nicht; ohne ruhende) – gleiche Regel wie der Filter der Fahrzeugliste (Backlog 209,
  // Teilagent „Panne – Ersatzfahrzeug“: Lkw mit gesperrtem Anhänger zählte grün und war nur über den Anhänger erkennbar)
  const clL = dvs.filter((v) => !v.eval_excluded && v.availability !== 'gesperrt' && v.coupled && v.coupled.availability === 'gesperrt' && (!hs || nk(v.site) === nk(hs === 'ohne' ? null : hs))); const cl = clL.length;
  if (cl) html += `<p class="noprint"><a class="panel alert" style="display:block;text-decoration:none" href="${hj('#/vehicles?f=coupled_locked')}" id="dcoupled"><b>${esc(t('av_coupled_locked'))} (${cl})</b></a></p>${dispoPrintLine('coupled', t('av_coupled_locked'), clL.map((v) => `${v.plate} (🔗 ${t('vk_' + v.coupled.kind)} ${v.coupled.plate})`), true)}`;
  // Backlog 981 (Folge aus 979, Blickwinkel „Disposition plant morgens die Touren“): Zähler „Gespann ohne Meldungen“ – gleiche Regel und gleicher
  // Standort wie die Fahrzeugliste; sichtbar, sobald am Standort ein Lkw mit gekoppeltem Anhänger steht (auch 0 = kein freies Gespann ist eine Aussage)
  const inSite = (v) => !hs || nk(v.site) === nk(hs === 'ohne' ? null : hs);
  const ccAll = dvs.filter((v) => v.kind === 'lkw' && v.coupled && v.coupled.kind === 'anhaenger' && !v.eval_excluded && inSite(v));
  const ccL = ccAll.filter(comboClearV);
  if (ccAll.length) html += `<p class="noprint"><a href="${hj('#/vehicles?f=combo_clear')}" id="dcombo" data-n="${ccL.length}" title="${esc(t('av_combo_clear_t'))}">${esc(t('av_combo_clear'))} (${ccL.length})</a></p>${dispoPrintLine('combo', t('av_combo_clear'), ccL.map((v) => `${v.plate} + ${v.coupled.plate}`))}`;
  if (cases !== null) html += await dispoWinter(hs);
  html += `<p class="noprint"><button type="button" class="btn secondary" id="dprint">${esc(t('print'))}</button></p>`;
  html += helpLink('dispo');
  if (cases !== null) html += await dispoPlanned(S.me.home_site && !S.dispoAll ? S.me.home_site : '');
  return html;
}
// Backlog 560: Warnhinweise der Dispo-Tafel im Ausdruck mit Kennzeichen (am Bildschirm nur Zähler mit Link auf die Liste)
function dispoPrintLine(key, label, items, alert = false) {
  if (!items.length) return '';
  const sorted = [...items].sort(plateCmp);
  return `<div class="print-only panel small${alert ? ' alert' : ''}" data-dprint="${esc(key)}"><b>${esc(label)} (${items.length})</b>: ${sorted.map(esc).join(', ')}</div>`;
}
// Disposition: nicht einplanbare Fahrzeuge (gesperrt / in Werkstatt / wartet auf Teile) mit Status und „seit“ – nur gespeicherte Angaben
// Prüfung mit gefährlichen Mängeln bzw. verkehrsunsicher, zu der noch kein Vorgang existiert (sonst greift die Sperre/der Auftrag oben)
const DISPO_DEFECTS = ['gefaehrliche_maengel', 'verkehrsunsicher'];
function dispoBoard(cs, defects = [], coupled = new Map(), dormant = new Set()) {
  const insp = defects.filter((x) => DISPO_DEFECTS.includes(x.result)).sort((a, b) => (a.result === 'verkehrsunsicher' ? -1 : 0) - (b.result === 'verkehrsunsicher' ? -1 : 0) || plateCmp(a.plate, b.plate));
  const inspHtml = insp.length ? `<h2>${esc(t('dispo_insp_defects'))}</h2><div class="list">${insp.map((x) => `<a class="row p-kritisch" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('res_' + x.result))}${x.result === 'verkehrsunsicher' ? ' – ' + esc(t('do_not_drive')) : ''}</span><span class="chip kritisch">${esc(mk(x.kind))} ${fmtD(x.done_date)}</span><span class="sub wrap" data-inspsub>${esc(t('dispo_insp_hint'))}${coupled.has(x.vehicle_id) ? ` · <b data-inspcoupled>${esc(t(coupled.get(x.vehicle_id).kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(coupled.get(x.vehicle_id).plate)}</b>` : ''}</span></a>`).join('')}</div>` : '';
  return inspHtml + dispoCases(cs, !!insp.length, coupled, dormant);
}
// Backlog 458 (Blickwinkel „Disposition fragt am Nachmittag: welcher Lkw ist morgen früh wieder da?“): Fahrzeuge, deren Vorgang heute oder gestern
// technisch freigegeben wurde und die kein anderer offener Vorgang blockiert – mit Freigabezeit, Werkstatt und „Abholung nach der Reparatur“.
// Vorher verschwand ein Fahrzeug nach der Freigabe still aus „Nicht einplanen“ (nur ein Push), wo es abzuholen ist, stand nur im Vorgang.
const DISPO_BLOCK_ST = ['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'];
const DISPO_BACK_LIMIT = 200;
function lastWorkdayBefore(iso) {
  // reine Kalenderrechnung (UTC-Mittag als Anker, Jahr/Monat/Tag ohne toISOString – Wächter für Berliner Kalendertage)
  const ymd = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  let d = new Date(Date.parse(iso + 'T12:00:00Z'));
  for (let i = 0; i < 10; i++) { d = new Date(d.getTime() - 86400000); const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6 && !federalHoliday(ymd(d))) return ymd(d); }
  return ymd(new Date(Date.parse(iso + 'T12:00:00Z') - 86400000));
}
// Backlog 559: nächster Werktag nach `iso` (Sa/So und bundesweite Feiertage übersprungen) – wie lastWorkdayBefore
function nextWorkdayAfter(iso) {
  const ymd = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  let d = new Date(Date.parse(iso + 'T12:00:00Z'));
  for (let i = 0; i < 10; i++) { d = new Date(d.getTime() + 86400000); const wd = d.getUTCDay(); if (wd !== 0 && wd !== 6 && !federalHoliday(ymd(d))) return ymd(d); }
  return ymd(new Date(Date.parse(iso + 'T12:00:00Z') + 86400000));
}
// Backlog 559 (Blickwinkel „Disposition Freitag → Montag“): Prüf-/Wartungsfristen von heute bis zum nächsten Werktag (Wochenende/Feiertage
// dazwischen eingeschlossen) als eigene Gruppe – Anhänger mit Zugmaschine; Überfälliges steht weiter in „Prüfung/Wartung überfällig“
function dispoDueSoon(dvs, inSite, mrows = null) {
  const today = bDate(); const nwd = nextWorkdayAfter(today);
  const byV = new Map(dvs.map((v) => [v.id, v])); const g = new Map();
  // Backlog 564: alle Fristen des Zeitraums je Fahrzeug aus der Prüfterminliste (auch neben einer schon überfälligen Frist); ohne Liste nur `next_due`
  const put = (v, kind, due) => { if (!v || v.eval_excluded || !inSite(v) || !due || due < today || due > nwd) return; const x = g.get(v.id) || { v, d: [] }; x.d.push({ kind, due }); g.set(v.id, x); };
  if (Array.isArray(mrows)) for (const r of mrows) { if (!['erledigt', 'nicht_pflichtig'].includes(r.status)) put(byV.get(r.vehicle_id), r.kind, r.next_due_date); }
  else for (const v of dvs) put(v, v.next_due_kind, v.next_due);
  const list = [...g.values()].map((x) => ({ ...x, d: x.d.sort((a, b) => a.due.localeCompare(b.due) || String(a.kind).localeCompare(String(b.kind))) }))
    .sort((a, b) => a.d[0].due.localeCompare(b.d[0].due) || plateCmp(a.v.plate, b.v.plate));
  if (!list.length) return '';
  const dueTxt = (d) => (d === today ? t('today') : fmtDue(d));
  return `<h2 id="dduesoon">${esc(t('dispo_due_soon').replace('{d}', fmtDue(nwd)))} <span class="chip mittel">${list.length}</span></h2><p class="small muted">${esc(t('dispo_due_soon_hint'))}</p><div class="list">${list.map(({ v, d }) => `<a class="row p-mittel" href="#/vehicles/${encodeURIComponent(v.id)}" data-dduesoon>${plate(v.plate)}<span class="title" style="white-space:normal">${d.length > 1 ? d.map((x) => `${esc(x.kind ? mk(x.kind) : t('next_due'))} (${esc(dueTxt(x.due))})`).join(' · ') : esc(d[0].kind ? mk(d[0].kind) : t('next_due'))}</span><span class="chip mittel" style="white-space:nowrap">${esc(dueTxt(d[0].due))}</span>${v.coupled ? `<span class="sub wrap" data-dduecoupled>🔗 ${esc(t('vk_' + v.coupled.kind))} ${esc(v.coupled.plate)}</span>` : ''}</a>`).join('')}</div>`;
}
// Backlog 877 (Blickwinkel „Disposition plant den Lkw nach der Rückkehr aus der Werkstatt wieder ein“): mit offenen (nicht sicherheitsrelevanten)
// Restarbeiten freigegeben → Anzahl in der Zeile (Liste liefert `open_items`); vorher sah die Disposition nur „frei seit“
async function dispoBack(open, hq = '') {
  let rows;
  try { rows = (await api('GET', `/api/cases?status=fahrzeug_freigegeben&sort=updated&limit=${DISPO_BACK_LIMIT}${hq ? '&vsite=' + hq : ''}`)).cases; } catch { return ''; }
  // Backlog 556 (Blickwinkel „Disposition plant am Freitag den Montag“): seit dem letzten Werktag vor heute (Sa/So und bundesweite Feiertage
  // übersprungen) – vorher „gestern“: am Sonntag/Montag fehlten die Freitags-Freigaben samt Abholvermerk
  const from = lastWorkdayBefore(bDate());
  const blocked = new Set(open.filter((c) => c.safety_lock || DISPO_BLOCK_ST.includes(c.status)).map((c) => c.vehicle_id));
  const byV = new Map();
  for (const c of rows) {
    if (!c.closed_at || BERLIN_FMT.format(new Date(c.closed_at)) < from || blocked.has(c.vehicle_id)) continue;
    const cur = byV.get(c.vehicle_id); if (!cur || c.closed_at > cur.closed_at) byV.set(c.vehicle_id, c);
  }
  // updated_at ≥ closed_at: mit voller Seite und letzter Zeile noch im Zeitraum könnten ältere Änderungen fehlen – dann „+“ statt still kürzen
  const more = rows.length >= DISPO_BACK_LIMIT && rows.length && BERLIN_FMT.format(new Date(rows[rows.length - 1].updated_at)) >= from;
  const list = [...byV.values()].sort((a, b) => String(b.closed_at).localeCompare(String(a.closed_at)));
  if (!list.length) return '';
  return `<h2 id="dback">${esc(from === bDate(-1) ? t('dispo_back') : t('dispo_back_since').replace('{d}', fmtD(from)))} <span class="chip ok">${list.length}${more ? '+' : ''}</span></h2><p class="small muted">${esc(t('dispo_back_hint'))}</p><div class="list">${list.map((c) => `<a class="row p-niedrig" href="#/cases/${esc(c.id)}" data-dback>${plate(c.plate)}<span class="title" style="white-space:normal">${ltxt(clipTxt(cDesc(c.description), 80))}</span><span class="chip ok" style="white-space:nowrap">${esc(t('dispo_back_at'))} ${fmtDT(c.closed_at)}</span><span class="sub wrap">${esc(c.case_no)}${c.workshop_site ? ' · ' + esc(wsName(c.workshop_site)) : ''}${c.open_items > 0 ? ` · <b data-dbitems style="white-space:nowrap">${esc(tn('rc_open_items', c.open_items))}</b> (${esc(t('dback_ns'))})` : ''}${c.pickup_note ? ` · <b data-dbpickup>${esc(t('pu_title'))}:</b> <span${langAttr(c.pickup_note)}>${esc(clipTxt(c.pickup_note, 120))}</span>` : ''}</span></a>`).join('')}</div>`;
}
// Backlog 459 (Blickwinkel „Lkw hat nächste Woche einen Werkstatttermin – darf die Disposition ihn bis dahin einplanen?“): ein erteilter
// Werkstattauftrag mit Termin nach heute, noch nicht begonnen, ohne Sperre, ohne eingetragenen Standort/Abschleppung und nicht „nicht
// fahrbereit“ gemeldet, blockiert das Fahrzeug bis zum Vortag nicht. Vorher stand es ab der Freigabe in „Nicht einplanen“ (Disposition
// suchte unnötig Ersatz). Fahrzeugleiste/`availability` bleiben unverändert („In Werkstatt“, offene Frage an den Auftraggeber).
function dispoUpcoming(c, today) {
  return c.status === 'werkstatt_freigegeben' && !c.safety_lock && !!c.planned_date && c.planned_date > today && !c.vehicle_location && !c.tow_service && c.reported_driveability !== 'nicht_fahrbereit';
}
function dispoDayBefore(d) { const [y, m, dd] = String(d).split('-').map(Number); const x = new Date(Date.UTC(y, m - 1, dd - 1)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`; }
// Backlog 870 (Blickwinkel „Disposition: Lkw steht halb zerlegt in der Werkstatt“): Arbeitsstand (Backlog 867) auch in „Nicht einplanen“ –
// die Zeile zeigt nur den ranghöchsten Vorgang, der Arbeitsstand kann an einem anderen offenen Vorgang desselben Fahrzeugs stehen
const dispoWst = (cs, c) => { const w = [c, ...cs.filter((x) => x.vehicle_id === c.vehicle_id && x !== c)].find((x) => x.work_state_note && WST_ST.includes(x.status)); return w ? ` · <span data-dwst>⏸ <b>${esc(t('wst_short'))}</b>: ${ltxt(clipTxt(w.work_state_note, 80))}${w !== c ? ` (${esc(w.case_no)})` : ''}</span>` : ''; };
function dispoCases(cs, hasOther = false, coupled = new Map(), dormant = new Set()) {
  const byV = new Map(); const upc = new Map(); const today0 = bDate();
  const rank = (c) => (c.safety_lock ? 3 : c.status === 'wartet_teile' && c.parts_drive_at ? 0 : c.status === 'wartet_teile' ? 2 : dispoUpcoming(c, today0) ? 0 : ['werkstatt_freigegeben', 'in_reparatur', 'abschlusskontrolle'].includes(c.status) ? 1 : 0);
  for (const c of cs) if (dispoUpcoming(c, today0)) { const u = upc.get(c.vehicle_id); if (!u || c.planned_date < u.planned_date) upc.set(c.vehicle_id, c); }
  // gleicher Rang: der früher begonnene Vorgang (Fahrzeug ist seit der ältesten Sperre nicht einplanbar – vorher zeigte „seit“ die jüngste, 21.10.2026)
  const since = (r, c) => String(r === 3 ? c.lock_since || c.created_at : c.status_since || c.updated_at || '');
  for (const c of cs) { const r = rank(c); if (!r) continue; const cur = byV.get(c.vehicle_id); if (!cur || r > cur.r || (r === cur.r && since(r, c) < since(cur.r, cur.c))) byV.set(c.vehicle_id, { r, c }); }
  const list = [...byV.values()].sort((a, b) => b.r - a.r || plateCmp(a.c.plate, b.c.plate));
  const up = [...upc.values()].filter((c) => !byV.has(c.vehicle_id)).sort((a, b) => String(a.planned_date).localeCompare(String(b.planned_date)) || plateCmp(a.plate, b.plate));
  const upHtml = up.length ? `<h2 id="dupc">${esc(t('dispo_upcoming'))} <span class="chip">${up.length}</span></h2><p class="small muted">${esc(t('dispo_upcoming_hint').replace('{w}', t('av_werkstatt')))}</p><div class="list">${up.map((c) => `<a class="row p-niedrig" href="#/cases/${esc(c.id)}" data-dupc>${plate(c.plate)}<span class="title" style="white-space:normal">${esc(t('dispo_upcoming_on').replace('{d}', fmtDue(c.planned_date)))}</span><span class="chip ok" style="white-space:nowrap" data-dupcuntil>${esc(t('dispo_upcoming_until').replace('{d}', fmtD(dispoDayBefore(c.planned_date))))}</span>${dormant.has(c.vehicle_id) ? ` <span class="chip" data-dormant>${esc(t('eval_excluded'))}</span>` : ''}<span class="sub wrap">${esc(c.case_no)}${c.workshop_site ? ' · ' + esc(wsName(c.workshop_site)) : ''}${coupled.has(c.vehicle_id) ? ` · <b>${esc(t(coupled.get(c.vehicle_id).kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(coupled.get(c.vehicle_id).plate)}</b>` : ''}${c.reported_driveability === 'eingeschraenkt' ? ` · <b data-dupclim>${esc(t('dispo_upcoming_limited'))}</b>` : ''}${c.planned_note ? ` · <span data-plannote>${esc(clipTxt(c.planned_note, 80))}</span>` : ''} · ${ltxt(clipTxt(cDesc(c.description), 80))}</span></a>`).join('')}</div>` : '';
  // Backlog 880: Fahrzeuge, die laut Leitung bis zur Teilelieferung fahren (kein anderer Vorgang blockiert) – einplanbar, aber mit Rückkehr zur Werkstatt
  const pd = new Map(); for (const c of cs) if (c.status === 'wartet_teile' && c.parts_drive_at && !c.safety_lock && !byV.has(c.vehicle_id)) { const x = pd.get(c.vehicle_id); if (!x || String(c.parts_expected_date || '9') < String(x.parts_expected_date || '9')) pd.set(c.vehicle_id, c); }
  const pdL = [...pd.values()].sort((a, b) => String(a.parts_expected_date || '9').localeCompare(String(b.parts_expected_date || '9')) || plateCmp(a.plate, b.plate));
  const pdHtml = pdL.length ? `<h2 id="dpdrive">${esc(t('dispo_pdrive'))} <span class="chip">${pdL.length}</span></h2><p class="small muted">${esc(t('dispo_pdrive_hint'))}</p><div class="list">${pdL.map((c) => `<a class="row p-niedrig" href="#/cases/${esc(c.id)}" data-dpdr>${plate(c.plate)}<span class="title" style="white-space:normal">🚚 ${esc(t('pdr_short'))}</span><span class="sub wrap" data-dpdreta>${c.parts_expected_date ? `<b>${esc(t('parts_eta'))} ${fmtD(c.parts_expected_date)}</b>` : esc(t('parts_eta_none'))}${c.workshop_site ? ` · ${esc(wsName(c.workshop_site))}` : ''}</span></a>`).join('')}</div>` : '';
  if (!list.length) return (hasOther ? '' : `<section class="panel good"><b>${esc(t('dispo_all_ok'))}</b></section>`) + pdHtml + upHtml;
  // Unterzeile umbrechen (24.10.2026, Blickwinkel „Disposition plant die Woche“: am Tablet fielen „Teile erwartet am …“/„Rückkehr: ungeklärt“ ins „…“)
  return `<h2>${esc(t('dispo_not_plannable'))}</h2><div class="list">${list.map(({ r, c }) => `<a class="row ${r === 3 ? 'p-kritisch' : 'p-mittel'}" href="#/cases/${esc(c.id)}">${plate(c.plate, { locked: c.safety_lock })}<span class="title" style="white-space:normal">${esc(r === 3 ? t('locked') + ' – ' + t('do_not_drive') : t('st_' + c.status))}</span><span class="chip ${r === 3 ? 'kritisch' : 'mittel'}">${esc(t('since'))} ${fmtDT(r === 3 ? c.lock_since || c.created_at : c.status_since || c.updated_at)}</span>${dormant.has(c.vehicle_id) ? ` <span class="chip" data-dormant>${esc(t('eval_excluded'))}</span>` : ''}<span class="sub wrap" data-dnpsub>${esc(c.case_no)}${r === 3 && c.safety_lock_reason ? ` · <span data-lockreason>${esc(translateLockReason(S.lang, c.safety_lock_reason))}</span>` : ''}${coupled.has(c.vehicle_id) ? ` · <b>${esc(t(coupled.get(c.vehicle_id).kind === 'anhaenger' ? 'trailer' : 'truck'))} ${esc(coupled.get(c.vehicle_id).plate)}</b>` : ''}${c.workshop_site ? ' · ' + esc(wsName(c.workshop_site)) : ''}${r !== 3 && c.reported_driveability === 'eingeschraenkt' ? ` · <b data-dupclim>${esc(t('dispo_upcoming_limited'))}</b>` : ''}${hoMissing(c).length ? ` · <b data-hodispo>${esc(hoMissing(c).join(', '))}</b>` : ''}${c.tow_service || c.vehicle_location ? ` · <span data-vloc>${c.tow_service ? `<b>${esc(t('vl_towed_chip'))}</b>` : ''}${c.tow_service && c.vehicle_location ? ': ' : ''}${esc(c.vehicle_location || '')}${vlAt(c)}</span>` : ''}${c.planned_date && c.status !== 'abschlusskontrolle' ? ' · ' + esc(t('planned_ws_short')) + ' ' + fmtD(c.planned_date) + (c.planned_note ? ` <span data-plannote>(${esc(clipTxt(c.planned_note, 80))})</span>` : '') : ''}${dispoWst(cs, c)}${partsEta(c)}${c.ready_expected_on && rdyOf(c) ? ` · <span data-dprdy>${rdyTxt(c.ready_expected_on)}</span>` : ''}${!dispoReturnKnown(c) ? ` · <b data-retunk>${esc(t('dispo_return_unknown'))}</b>` : ''}</span></a>`).join('')}</div>` + pdHtml + upHtml;
}
// Disposition: Lkw ohne ausreichende Winterkennzeichnung (laut Erfasstem) – nur Information, keine Sperre (situative Pflicht bei Glätte)
async function dispoWinter(vsite = '') {
  const r = await api('GET', '/api/tires/winter' + (vsite ? '?site=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || (!r.totals.nicht_erfuellt && !r.totals.unbekannt)) return '';
  const rows = r.noncompliant.map((x) => `<a class="row p-mittel" href="#/vehicles/${encodeURIComponent(x.vehicle_id)}?sec=tires">${plate(x.plate)}<span class="title" style="white-space:normal">${esc(t('winter_bad').replace('{p}', x.noncompliant.map(posL).join(', ')))}</span><span class="chip mittel">${esc(t('ws_nicht_erfuellt'))}</span>${x.missing.length || x.open_order || x.closed_order ? `<span class="sub wrap">${[x.missing.length && esc(t('winter_missing').replace('{p}', x.missing.map(posL).join(', '))), x.open_order && woApptTxt(x.open_order), x.closed_order && `⚠ ${esc(t('wo_closed_short').replace('{no}', x.closed_order.case_no))}`].filter(Boolean).join(' · ')}</span>` : ''}</a>`).join('');
  // nur unvollständig erfasst (keine Lkw „nicht erfüllt“): neutrale Überschrift statt „nicht wintertauglich“ (23.10.2026)
  return `<section id="dwinter"><h2>${esc(t(r.totals.nicht_erfuellt ? 'dispo_winter' : 'dispo_winter_incomplete'))}</h2>${rows ? `<div class="list">${rows}</div>` : ''}${r.totals.unbekannt ? `<p class="small">${esc(t('dispo_winter_unknown').replace('{n}', r.totals.unbekannt))}</p>` : ''}<p class="small muted">${esc(t('dispo_winter_hint'))}</p></section>`;
}
function dispoSub(i) {
  const parts = i.type === 'case' ? [esc(i.case_no), esc(wsName(i.workshop_site))] : [];
  // Hinweis zum Termin (Migration 0093): „nur vormittags“ o. ä. – die Disposition sieht, ob das Fahrzeug den ganzen Tag fehlt
  // Backlog 473: „laut Meldung eingeschränkt fahrbereit“ auch im Terminplan (Überführungsfahrt am Termintag; vorher nur bis zum Vortag sichtbar)
  if (i.type === 'case' && i.reported_driveability === 'eingeschraenkt' && !i.safety_lock) parts.push(`<b data-dupclim>${esc(t('dispo_upcoming_limited'))}</b>`);
  if (i.type === 'case' && i.planned_note) parts.push(`<b data-plannote>📝 ${esc(clipTxt(i.planned_note, 120))}</b>`);
  if (planVehTag(i)) parts.push(planVehTag(i));
  if (i.other_dates && i.other_dates.length) parts.push(`<b>${esc(t('plan_other_dates'))}: ${i.other_dates.map(fmtD).join(', ')}</b>`);
  // Backlog 477: umbrechen statt „…“ (Hinweis zum Termin, „eingeschränkt fahrbereit“ entscheiden, ob der Lkw heute ganz ausfällt)
  return parts.length ? `<span class="sub wrap">${parts.join(' · ')}</span>` : '';
}
// Disposition: geplante Werkstatt- und Prüftermine der nächsten 7 Tage (aus dem Werkstattplan, nur gespeicherte Termine)
async function dispoPlanned(vsite = '') {
  const r = await api('GET', '/api/workshop/plan?days=7' + (vsite ? '&vsite=' + encodeURIComponent(vsite) : '')).catch(() => null);
  if (!r || !r.days.length) return '';
  const rows = r.days.flatMap((d) => d.items.map((i) => `<a class="row ${i.type === 'case' ? 'p-' + esc(i.priority) : ''}" href="${i.type === 'case' ? '#/cases/' + esc(i.id) : '#/vehicles/' + encodeURIComponent(i.vehicle_id)}">${plate(i.plate, { locked: !!i.safety_lock })}<span class="title" style="white-space:normal">${i.type === 'case' ? woTag(i) + esc(t('planned_ws_short')) + ' · ' + esc(t('st_' + i.status)) : esc(t('planned_inspection')) + ': ' + esc(mk(i.kind))}</span><span class="chip${d.date === r.today ? ' ok' : ''}" style="white-space:nowrap">${d.date === r.today ? esc(t('today')) : esc(fmtDue(d.date))}${d.date !== r.today && d.date === nextWorkdayAfter(r.today) ? ` <b data-pnwd style="white-space:normal">· ${esc(t('next_workday'))}</b>` : ''}</span>${dispoSub(i)}</a>`));
  return `<h2>${esc(t('dispo_planned'))}</h2><p class="small muted">${esc(t('dispo_planned_hint'))}</p><div class="list">${rows.join('')}</div><p><a href="${hj('#/plan')}">${esc(t('wplan'))}</a></p>`;
}

export { dispoHome };
