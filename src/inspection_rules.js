// [CLAUDE] Zentrale HU-/SP-Fristberechnung nach StVZO § 29 i. V. m. Anlage VIII (Stand geprüft 10.10.2026)
//
// Rechtsgrundlage (Anlage VIII Nr. 2.1, 2.3, 2.4, 2.7; § 29 Abs. 2 / Nr. 3.1.2):
//  - Lkw > 3,5 t: HU alle 12 Monate (2.1.4.2 ff.).
//  - Lkw > 7,5 t bis 12 t: in den ersten 36 Monaten keine SP, danach SP 6 Monate nach der HU (2.1.4.3) → erste SP 42 Monate nach Erstzulassung.
//  - Lkw > 12 t: in den ersten 24 Monaten keine SP, danach SP 6 Monate nach der HU (2.1.4.4) → erste SP 30 Monate nach Erstzulassung.
//  - Lkw ≤ 7,5 t: keine SP.  Anhänger > 10 t: wie Lkw > 12 t (2.1.5.4); Anhänger ≤ 10 t: keine SP (2.1.5.3).
//  - Frist der HU läuft vom Monat/Jahr der letzten HU (2.3); Frist der SP läuft vom Monat/Jahr der letzten HU (2.4),
//    die SP darf im Vormonat durchgeführt werden, ohne den Turnus zu verschieben (2.4). Fristende = Ablauf des Monats.
//  - Keine Kulanz: Die einmonatige Überschreitung nach 2.4 gilt nur mit Bestätigung im Prüfprotokoll – wird nie automatisch angenommen.
// Grundsätze: Es werden keine Fahrzeugdaten oder Prüfnachweise erfunden. Fehlende oder widersprüchliche Grundlagen → „Frist ungeklärt“.
// Eine bestandene HU erledigt keine offene SP; erledigt wird eine SP nur durch einen SP-Nachweis (auch „SP i. V. m. HU“ am HU-Tag).

import { maintenanceWarnDays, SETTING_DEFAULTS } from './settings.js';
const RULE_VERSION = 'StVZO Anl. VIII Nr. 2.1/2.3/2.4 (geprüft 10.10.2026)';
// Bezug + Prüfdatum getrennt, damit die App sie in UK/EN zeigt (18.10.2026: „geprüft 10.10.2026“ stand deutsch in der Fahrzeugakte)
const RULE_INFO = { rule_version: RULE_VERSION, rule_ref: 'StVZO Anl. VIII Nr. 2.1/2.3/2.4', rule_checked: '2026-10-10' };
export const ZGM_CLASSES_LKW = ['bis_3_5', '3_5_7_5', '7_5_12', 'ueber_12'];
export const ZGM_CLASSES_TRAILER = ['bis_3_5', '3_5_10', 'ueber_10'];
export const HUSP_STATUSES = ['ok', 'bald_faellig', 'ueberfaellig', 'nicht_sp_pflichtig', 'erste_sp_kuenftig', 'ungeklaert'];
const BAD_RESULTS = ['erhebliche_maengel', 'gefaehrliche_maengel', 'verkehrsunsicher'];

// zGM-Klasse aus kg (Grenzen inklusive: genau 7.500 kg = bis 7,5 t; genau 12.000 kg = bis 12 t; genau 10.000 kg Anhänger = bis 10 t)
export function zgmClassFromKg(kind, kg) {
  if (kg === null || kg === undefined || kg === '' || !Number.isFinite(Number(kg))) return null;
  const k = Number(kg);
  if (kind === 'anhaenger') return k <= 3500 ? 'bis_3_5' : k <= 10000 ? '3_5_10' : 'ueber_10';
  return k <= 3500 ? 'bis_3_5' : k <= 7500 ? '3_5_7_5' : k <= 12000 ? '7_5_12' : 'ueber_12';
}

// SP-Pflicht nach zGM-Klasse (gleiche Grenze wie computeHuSp): true/false, null = Klasse unbekannt
export function spRequired(vehicle) {
  const kind = vehicle.kind === 'anhaenger' ? 'anhaenger' : 'lkw';
  const cls = vehicle.zgm_class || zgmClassFromKg(kind, vehicle.zgm_kg);
  if (!cls) return null;
  return (kind === 'lkw' && (cls === '7_5_12' || cls === 'ueber_12')) || (kind === 'anhaenger' && cls === 'ueber_10');
}

// ---- Kalendermonate ----
const ym = (d) => [Number(d.slice(0, 4)), Number(d.slice(5, 7))];
export function monthEnd(y, m) { // m 1..12, beliebig überlaufend
  const d = new Date(Date.UTC(y, m, 0)); // Tag 0 des Folgemonats = letzter Tag des Monats m
  return d.toISOString().slice(0, 10);
}
export function dueMonthEnd(dateOrYm, plusMonths) {
  const [y, m] = ym(dateOrYm);
  return monthEnd(y, m + plusMonths);
}
const monthStart = (y, m) => new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
// Erster Tag des Vormonats eines Fälligkeitsmonats
function prevMonthStart(dueDate) { const [y, m] = ym(dueDate); return monthStart(y, m - 1); }
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
// Datum im deutschen Hinweistext als TT.MM.JJJJ (Werte in p bleiben ISO) – 19.10.2026
const deD = (d) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : d);
export const fmtMonth = (d) => (d ? `${d.slice(5, 7)}/${d.slice(0, 4)}` : null);

// Widerspruch zweier Fristen: ungeklärt, außer beide sind schon verstrichen – dann ist die Prüfung nach jeder Lesart überfällig
// (22.10.2026: Fahrzeugliste zeigte „überfällig“, Übersicht/Agent nur „ungeklärt“ ohne Handlungsbefund)
function conflictStatus(a, b, today, warnDays) {
  return statusFor(a > b ? a : b, today, warnDays) === 'ueberfaellig' ? 'ueberfaellig' : 'ungeklaert';
}

function statusFor(due, today, warnDays) {
  const d = daysBetween(today, due);
  return d < 0 ? 'ueberfaellig' : d <= warnDays ? 'bald_faellig' : 'ok';
}

/**
 * Berechnet HU und SP für ein Fahrzeug.
 * @param vehicle  { kind: 'lkw'|'anhaenger', zgm_class, first_registration (JJJJ-MM[-TT]|null), active }
 * @param events   [{ kind: 'HU'|'SP', done_date: 'JJJJ-MM-TT', evidence, result? }]  – nur tatsächlich durchgeführte Prüfungen
 * @param documented { HU?: { due, evidence }, SP?: { due, evidence } } – verbindliche Fälligkeit laut Nachweis (z. B. Plakette)
 * @param planned  { HU?: 'JJJJ-MM-TT', SP?: … } – geplante Werkstatttermine (ersetzen nie eine Durchführung)
 */
// Hinweis: deutscher Text (Agent, Protokoll) + Code mit Werten, damit die App ihn in UK/EN anzeigen kann
const note = (o, code, text, p = {}) => { o.notes.push(text); o.note_codes.push({ code, p }); };

// Letzte SP mit erheblichen/gefährlichen Mängeln oder verkehrsunsicher: wie bei der HU nicht „in Ordnung“, sondern „Frist ungeklärt“ mit
// Hinweis „Nachprüfung belegen“ (Backlog 207, Teilagent „HU-Tag in der Werkstatt“: SP mit erheblichen Mängeln galt als erledigt, Fahrer und
// Akte zeigten „in Ordnung“). Gilt nur, wenn danach keine HU/SP ohne solche Mängel belegt ist; „überfällig“ bleibt überfällig.
export function computeHuSp(vehicle, events, opts = {}) {
  const res = computeHuSpRaw(vehicle, events, opts);
  const sorted = (k) => events.filter((e) => e.kind === k && e.done_date).sort((a, b) => a.done_date.localeCompare(b.done_date));
  const lastSp = sorted('SP').pop(); const lastHu = sorted('HU').pop();
  const sp = res.sp;
  if (lastSp && BAD_RESULTS.includes(lastSp.result) && (!lastHu || lastSp.done_date > lastHu.done_date) && !['ueberfaellig', 'nicht_sp_pflichtig'].includes(sp.status)) {
    sp.status = 'ungeklaert';
    note(sp, 'sp_bad_result', 'Letzte SP mit erheblichen/gefährlichen Mängeln – Nachprüfung belegen.');
  }
  return res;
}
function computeHuSpRaw(vehicle, events, { today, warnDays = SETTING_DEFAULTS.maintenance_warn_days, documented = {}, planned = {} } = {}) {
  const kind = vehicle.kind === 'anhaenger' ? 'anhaenger' : 'lkw';
  const cls = vehicle.zgm_class || null;
  const sorted = (k) => events.filter((e) => e.kind === k && e.done_date).sort((a, b) => a.done_date.localeCompare(b.done_date));
  const hus = sorted('HU');
  const sps = sorted('SP');
  const lastHu = hus[hus.length - 1] || null;
  // Vorzyklus: HU mit erheblichen/gefährlichen Mängeln vor einer späteren HU (= Nachprüfung) zählt nicht als eigener Zyklus
  // (18.10.2026: HU nicht bestanden + Nachprüfung ließen die offene SP des Vorzyklus verschwinden)
  const cycleHus = hus.filter((h, i) => i === hus.length - 1 || !BAD_RESULTS.includes(h.result));
  const prevHu = cycleHus.length > 1 ? cycleHus[cycleHus.length - 2] : null;
  const lastSp = sps[sps.length - 1] || null;

  // ---------- HU ----------
  const hu = { last_done: lastHu ? lastHu.done_date : null, last_evidence: lastHu ? lastHu.evidence : null, last_result: lastHu ? lastHu.result || null : null,
    due: null, due_basis: null, status: 'ungeklaert', notes: [], note_codes: [], planned_date: planned.HU || null, interval_months: null };
  const huApplicableKnown = cls !== null;
  if (cls === 'bis_3_5' && kind === 'lkw') note(hu, 'hu_small_lkw', 'Lkw bis 3,5 t: HU-Intervall hängt von weiteren Merkmalen ab – nicht automatisch berechnet.');
  // Anhänger bis 3,5 t zGM: 24 Monate (Anl. VIII Nr. 2.1.5.1/2.1.5.2), sonst 12 (17.10.2026; vorher pauschal 12)
  else if (huApplicableKnown) hu.interval_months = cls === 'bis_3_5' && kind === 'anhaenger' ? 24 : 12;
  const huCalc = lastHu && hu.interval_months ? dueMonthEnd(lastHu.done_date, hu.interval_months) : null;
  const huDoc = documented.HU && documented.HU.due ? documented.HU.due : null;
  if (huDoc && huCalc && huDoc.slice(0, 7) !== huCalc.slice(0, 7)) {
    note(hu, 'hu_conflict', `Widerspruch: Nachweis nennt ${fmtMonth(huDoc)}, Berechnung aus letzter HU ergibt ${fmtMonth(huCalc)}.`, { doc: fmtMonth(huDoc), calc: fmtMonth(huCalc) });
    hu.due = huDoc; hu.due_basis = 'nachweis'; hu.status = conflictStatus(huDoc, huCalc, today, warnDays);
  } else if (huDoc || huCalc) {
    hu.due = huDoc || huCalc; hu.due_basis = huDoc ? 'nachweis' : 'berechnet';
    hu.status = statusFor(hu.due, today, warnDays);
  } else {
    if (!lastHu) note(hu, 'hu_none', 'Keine durchgeführte HU belegt.');
    else if (cls === null) note(hu, 'hu_no_class', 'Fahrzeugklasse (zulässige Gesamtmasse) fehlt – HU-Intervall nicht bestimmbar.');
  }
  if (lastHu && BAD_RESULTS.includes(lastHu.result) && hu.status !== 'ueberfaellig') {
    hu.status = 'ungeklaert'; note(hu, 'hu_bad_result', 'Letzte HU mit erheblichen/gefährlichen Mängeln – Nachprüfung belegen.');
  }

  // ---------- SP ----------
  const sp = { last_done: lastSp ? lastSp.done_date : null, last_evidence: lastSp ? lastSp.evidence : null,
    due: null, due_basis: null, prognosis: null, status: 'ungeklaert', notes: [], note_codes: [], planned_date: planned.SP || null, sp_required: null, basis: null };
  if (!cls) {
    note(sp, 'sp_no_class', 'Zulässige Gesamtmasse fehlt – SP-Pflicht nicht bestimmbar.');
    return { hu, sp, ...RULE_INFO };
  }
  const spRequiredClass = spRequired({ kind, zgm_class: cls });
  if (!spRequiredClass) {
    sp.status = 'nicht_sp_pflichtig'; sp.sp_required = false;
    if (kind === 'lkw') note(sp, 'sp_not_req_lkw', 'Lkw bis 7,5 t zGM: keine Sicherheitsprüfung.');
    else note(sp, 'sp_not_req_trailer', 'Anhänger bis 10 t zGM: keine Sicherheitsprüfung.');
    return { hu, sp, ...RULE_INFO };
  }
  sp.sp_required = true;
  const firstSpMonths = cls === '7_5_12' ? 42 : 30; // 36 bzw. 24 Monate ohne SP, danach 6 Monate nach der HU
  const firstSpDue = vehicle.first_registration ? dueMonthEnd(vehicle.first_registration, firstSpMonths) : null;
  const spDoc = documented.SP && documented.SP.due ? documented.SP.due : null;
  const useDoc = (code, text) => { sp.due = spDoc; sp.due_basis = 'nachweis'; sp.status = statusFor(spDoc, today, warnDays); note(sp, code, text); return { hu, sp, ...RULE_INFO }; };
  // Nachweis widerspricht der ersten SP-Frist aus der Erstzulassung: Fälligkeit laut Nachweis, Status ungeklärt (nie still übergehen)
  const firstConflict = () => { sp.due = spDoc; sp.due_basis = 'nachweis'; sp.status = conflictStatus(spDoc, firstSpDue, today, warnDays); sp.prognosis = firstSpDue;
    note(sp, 'sp_first_conflict', `Widerspruch: Nachweis nennt ${fmtMonth(spDoc)}, erste SP ${firstSpMonths} Monate nach Erstzulassung ergibt ${fmtMonth(firstSpDue)}.`, { doc: fmtMonth(spDoc), calc: fmtMonth(firstSpDue), m: firstSpMonths }); return { hu, sp, ...RULE_INFO }; };

  if (!lastHu) {
    if (spDoc) return useDoc('sp_doc_no_hu', 'Fälligkeit laut Nachweis (Plakette/Beleg); keine durchgeführte HU belegt.');
    if (firstSpDue && daysBetween(today, firstSpDue) >= 0) {
      sp.status = 'erste_sp_kuenftig'; sp.prognosis = firstSpDue; sp.basis = 'erstzulassung';
      note(sp, 'sp_first_prognosis', `Erste SP ${firstSpMonths} Monate nach Erstzulassung (Prognose; verbindlich 6 Monate nach der dann letzten HU).`, { m: firstSpMonths });
    } else note(sp, 'sp_no_hu', 'Keine durchgeführte HU belegt – SP-Frist (6 Monate nach HU) nicht bestimmbar.');
    return { hu, sp, ...RULE_INFO };
  }

  const cycleDue = dueMonthEnd(lastHu.done_date, 6);
  // Beginn der SP-Pflicht: aus Erstzulassung; ohne Erstzulassung nur, wenn bereits eine SP belegt ist (dann durch Prüfstelle festgestellt)
  if (firstSpDue) {
    sp.basis = 'erstzulassung';
    if (cycleDue < firstSpDue) {
      if (daysBetween(today, firstSpDue) >= 0) {
        // Nachweis (Plakette/Beleg) wird nie übergangen: passt er zur ersten SP, gilt er; sonst Widerspruch → ungeklärt (19.10.2026)
        if (spDoc && spDoc.slice(0, 7) === firstSpDue.slice(0, 7)) return useDoc('sp_doc_matches', 'Fälligkeit laut Nachweis (Plakette/Beleg) stimmt mit der Berechnung überein.');
        if (spDoc) return firstConflict();
        sp.status = 'erste_sp_kuenftig'; sp.prognosis = firstSpDue;
        note(sp, 'sp_starts_later', `SP-Pflicht beginnt erst; erste SP ${firstSpMonths} Monate nach Erstzulassung (Prognose).`, { m: firstSpMonths });
        return { hu, sp, ...RULE_INFO };
      }
      // Erste SP-Frist ist verstrichen, bevor die SP 6 Monate nach dieser HU greift (HU etwas vor dem Turnus): die erste SP ist fällig
      // (18.10.2026: stand vorher dauerhaft auf „erste SP künftig“ mit vergangener Prognose – die versäumte erste SP wurde nie gemeldet)
      const firstDone = sps.filter((x) => x.done_date >= prevMonthStart(firstSpDue));
      if (firstDone.length) {
        sp.cycle_done = firstDone[firstDone.length - 1].done_date; sp.status = 'ok'; sp.prognosis = dueMonthEnd(lastHu.done_date, 18);
        note(sp, 'sp_cycle_done', `SP für diesen Zyklus durchgeführt (${sp.cycle_done}). Nächste SP 6 Monate nach der nächsten HU.`, { date: sp.cycle_done });
      } else if (spDoc && spDoc.slice(0, 7) !== firstSpDue.slice(0, 7)) {
        return firstConflict(); // Nachweis widerspricht der ersten SP-Frist → ungeklärt (19.10.2026: vorher „in Ordnung“ laut Nachweis)
      } else {
        sp.due = spDoc || firstSpDue; sp.due_basis = spDoc ? 'nachweis' : 'berechnet'; sp.status = statusFor(sp.due, today, warnDays);
        note(sp, 'sp_first_due', `Erste SP ${firstSpMonths} Monate nach Erstzulassung (${fmtMonth(firstSpDue)}) – noch nicht belegt.`, { m: firstSpMonths, due: fmtMonth(firstSpDue) });
      }
      return { hu, sp, ...RULE_INFO };
    }
  } else if (sps.length) {
    sp.basis = 'sp_nachweis';
    note(sp, 'sp_from_sp_evidence', 'Erstzulassung fehlt; SP-Pflicht aus vorhandenem SP-Nachweis abgeleitet.');
  } else {
    if (spDoc && spDoc.slice(0, 7) === cycleDue.slice(0, 7)) { sp.basis = 'sp_nachweis'; return useDoc('sp_doc_matches', 'Fälligkeit laut Nachweis (Plakette/Beleg) stimmt mit der Berechnung überein.'); }
    note(sp, 'sp_start_unclear', 'Erstzulassung fehlt und keine SP belegt – Beginn der SP-Pflicht unklar.');
    sp.prognosis = cycleDue;
    // abweichender Nachweis bleibt sichtbar (Fälligkeit laut Nachweis, Status ungeklärt) – 19.10.2026
    if (spDoc) { sp.due = spDoc; sp.due_basis = 'nachweis'; sp.status = conflictStatus(spDoc, cycleDue, today, warnDays); note(sp, 'sp_conflict', `Widerspruch: Nachweis nennt ${fmtMonth(spDoc)}, Berechnung (6 Monate nach HU ${deD(lastHu.done_date)}) ergibt ${fmtMonth(cycleDue)}.`, { doc: fmtMonth(spDoc), calc: fmtMonth(cycleDue), hu: lastHu.done_date }); }
    return { hu, sp, ...RULE_INFO };
  }

  // Offene SP aus dem Zyklus vor der letzten HU? Eine HU erledigt keine SP – nur ein SP-Nachweis (auch „SP i. V. m. HU“ am HU-Tag).
  if (prevHu) {
    const prevDue = dueMonthEnd(prevHu.done_date, 6);
    const pduty = !firstSpDue || prevDue >= firstSpDue;
    // auch eine HU im Zeitraum der fälligen SP (ab Vormonat) erledigt sie nicht (18.10.2026: vorher nur, wenn die SP schon überfällig war)
    if (pduty && lastHu.done_date >= prevMonthStart(prevDue)) {
      const closed = sps.some((s) => s.done_date > prevHu.done_date && s.done_date >= prevMonthStart(prevDue) && s.done_date <= lastHu.done_date);
      if (!closed) note(sp, 'sp_prev_open', `SP fällig ${fmtMonth(prevDue)} (nach HU ${deD(prevHu.done_date)}) nicht belegt – die spätere HU ersetzt sie nicht.`, { due: fmtMonth(prevDue), hu: prevHu.done_date });
      if (!closed) sp.prev_cycle_open = prevDue;
    } else if (!pduty && lastHu.done_date >= prevMonthStart(firstSpDue)) { // ab Vormonat wie oben (19.10.2026)
      // erste SP fiel in den Vorzyklus (vor der SP nach der vorigen HU) und ist nicht belegt (18.10.2026)
      const closed = sps.some((s) => s.done_date >= prevMonthStart(firstSpDue) && s.done_date <= lastHu.done_date);
      if (!closed) { note(sp, 'sp_prev_open', `SP fällig ${fmtMonth(firstSpDue)} (nach HU ${deD(prevHu.done_date)}) nicht belegt – die spätere HU ersetzt sie nicht.`, { due: fmtMonth(firstSpDue), hu: prevHu.done_date }); sp.prev_cycle_open = firstSpDue; }
    }
  } else if (firstSpDue && firstSpDue > dueMonthEnd(lastHu.done_date, -6) && lastHu.done_date >= prevMonthStart(firstSpDue)) {
    // nur eine HU belegt, die erste SP-Frist lag im Jahr davor (ab Vormonat bis zur HU) und ist nicht belegt (19.10.2026: wurde nie gemeldet)
    const closed = sps.some((s) => s.done_date >= prevMonthStart(firstSpDue) && s.done_date <= lastHu.done_date);
    if (!closed) { note(sp, 'sp_prev_open', `SP fällig ${fmtMonth(firstSpDue)} (nach HU ${deD(lastHu.done_date)}) nicht belegt – die spätere HU ersetzt sie nicht.`, { due: fmtMonth(firstSpDue), hu: lastHu.done_date }); sp.prev_cycle_open = firstSpDue; }
  }

  // SP dieses Zyklus: Nachweis nach der letzten HU (nicht am HU-Tag), frühestens im Vormonat der Fälligkeit
  const afterHu = sps.filter((s) => s.done_date > lastHu.done_date);
  const valid = afterHu.filter((s) => s.done_date >= prevMonthStart(cycleDue));
  const tooEarly = afterHu.filter((s) => s.done_date < prevMonthStart(cycleDue));

  if (valid.length) {
    sp.cycle_done = valid[valid.length - 1].done_date;
    sp.status = 'ok'; sp.due = null; sp.due_basis = null;
    // Nächste SP richtet sich nach der nächsten HU → nur Prognose (6 Monate nach voraussichtlicher HU)
    sp.prognosis = dueMonthEnd(lastHu.done_date, 18);
    note(sp, 'sp_cycle_done', `SP für diesen Zyklus durchgeführt (${sp.cycle_done}). Nächste SP 6 Monate nach der nächsten HU.`, { date: sp.cycle_done });
  } else if (tooEarly.length) {
    sp.status = 'ungeklaert'; sp.due = cycleDue; sp.due_basis = 'berechnet';
    note(sp, 'sp_too_early', `SP am ${tooEarly[tooEarly.length - 1].done_date} vor dem zulässigen Zeitraum (ab ${fmtMonth(prevMonthStart(cycleDue))}) – Frist ungeklärt, Prüfprotokoll prüfen.`, { date: tooEarly[tooEarly.length - 1].done_date, from: fmtMonth(prevMonthStart(cycleDue)) });
  } else {
    sp.due = cycleDue; sp.due_basis = 'berechnet';
    if (spDoc && spDoc.slice(0, 7) !== cycleDue.slice(0, 7)) {
      sp.status = conflictStatus(spDoc, cycleDue, today, warnDays); sp.due = spDoc; sp.due_basis = 'nachweis';
      note(sp, 'sp_conflict', `Widerspruch: Nachweis nennt ${fmtMonth(spDoc)}, Berechnung (6 Monate nach HU ${deD(lastHu.done_date)}) ergibt ${fmtMonth(cycleDue)}.`, { doc: fmtMonth(spDoc), calc: fmtMonth(cycleDue), hu: lastHu.done_date });
    } else sp.status = statusFor(cycleDue, today, warnDays);
  }
  if (sp.prev_cycle_open && sp.status !== 'ueberfaellig') sp.status = 'ungeklaert';
  return { hu, sp, ...RULE_INFO };
}

// ---- Laden & Synchronisieren (serverseitig, mit Abfragebudget: feste Anzahl Abfragen) ----
export async function loadHuSpInputs(env, vehicleIds = null) {
  const filter = vehicleIds ? ` AND v.id IN (SELECT value FROM json_each(?))` : '';
  const bindV = vehicleIds ? [JSON.stringify(vehicleIds)] : [];
  const vehicles = (await env.DB.prepare(`SELECT v.id, v.plate, v.kind, v.zgm_class, v.zgm_kg, v.first_registration, v.active, v.eval_excluded FROM vehicles v WHERE 1=1${filter}`).bind(...bindV).all()).results;
  const rules = (await env.DB.prepare(`SELECT m.id, m.vehicle_id, m.kind, m.next_due_date, m.due_source, m.planned_date, m.last_done_date, m.evidence FROM maintenance_rules m
    JOIN vehicles v ON v.id=m.vehicle_id WHERE m.kind IN ('HU','SP')${filter}`).bind(...bindV).all()).results;
  const events = (await env.DB.prepare(`SELECT e.vehicle_id, e.kind, e.done_date, e.evidence, e.result FROM maintenance_events e
    JOIN vehicles v ON v.id=e.vehicle_id WHERE e.kind IN ('HU','SP')${filter}`).bind(...bindV).all()).results;
  const byV = new Map(vehicles.map((v) => [v.id, { v, rules: [], events: [] }]));
  for (const r of rules) byV.get(r.vehicle_id)?.rules.push(r);
  for (const e of events) byV.get(e.vehicle_id)?.events.push(e);
  for (const x of byV.values()) addRuleEvents(x);
  return byV;
}
// Altbestand ohne Ereignis: letzte Durchführung aus der Regel übernehmen (keine erfundenen Daten)
function addRuleEvents(x) {
  for (const r of x.rules) {
    if (r.last_done_date && !x.events.some((e) => e.kind === r.kind && e.done_date === r.last_done_date)) x.events.push({ vehicle_id: r.vehicle_id, kind: r.kind, done_date: r.last_done_date, evidence: r.evidence, result: null });
  }
  return x;
}
// Eingaben eines Fahrzeugs als Spalten einer bestehenden Abfrage (Vorgangsdetail, Abfragebudget – 21.10.2026): SQL-Teile und Auswertung.
// ?1 = Fahrzeug-ID. Gleiche Felder wie loadHuSpInputs.
export const HUSP_ONE_SQL = `(SELECT json_object('id', v.id, 'plate', v.plate, 'kind', v.kind, 'zgm_class', v.zgm_class, 'zgm_kg', v.zgm_kg, 'first_registration', v.first_registration, 'active', v.active, 'eval_excluded', v.eval_excluded) FROM vehicles v WHERE v.id=?1) AS husp_v,
  (SELECT json_group_array(json_object('id', m.id, 'vehicle_id', m.vehicle_id, 'kind', m.kind, 'next_due_date', m.next_due_date, 'due_source', m.due_source, 'planned_date', m.planned_date, 'last_done_date', m.last_done_date, 'evidence', m.evidence)) FROM maintenance_rules m WHERE m.vehicle_id=?1 AND m.kind IN ('HU','SP')) AS husp_rules,
  (SELECT json_group_array(json_object('vehicle_id', e.vehicle_id, 'kind', e.kind, 'done_date', e.done_date, 'evidence', e.evidence, 'result', e.result)) FROM maintenance_events e WHERE e.vehicle_id=?1 AND e.kind IN ('HU','SP')) AS husp_events`;
export function huSpInputFromRow(row) {
  if (!row || !row.husp_v) return null;
  return addRuleEvents({ v: JSON.parse(row.husp_v), rules: JSON.parse(row.husp_rules || '[]'), events: JSON.parse(row.husp_events || '[]') });
}

export function huSpFor(x, today, warnDays) {
  const v = { ...x.v, zgm_class: x.v.zgm_class || zgmClassFromKg(x.v.kind, x.v.zgm_kg) };
  const documented = {}; const planned = {};
  for (const r of x.rules) {
    if (r.due_source === 'nachweis' && r.next_due_date) documented[r.kind] = { due: r.next_due_date, evidence: r.evidence };
    if (r.planned_date) planned[r.kind] = r.planned_date;
  }
  return { ...computeHuSp(v, x.events, { today, warnDays, documented, planned }), rules: Object.fromEntries(x.rules.map((r) => [r.kind, r.id])) };
}

// Verbindliche berechnete Fälligkeit in maintenance_rules.next_due_date spiegeln (nur due_source='berechnet', nie Nachweise überschreiben).
// Jede Änderung wird im Audit-Log protokolliert.
export async function syncHuSpDues(env, { today, warnDays, actorId = null, vehicleIds = null } = {}) {
  // Status im Protokolleintrag nach der eingestellten Vorwarnung (vorher fest 30 Tage, wenn der Aufrufer keine übergab)
  if (warnDays === undefined) warnDays = maintenanceWarnDays((await env.DB.prepare(`SELECT value FROM settings WHERE key='maintenance_warn_days'`).first())?.value);
  const byV = await loadHuSpInputs(env, vehicleIds);
  const stmts = []; const changes = [];
  const now = new Date().toISOString();
  for (const x of byV.values()) {
    const res = huSpFor(x, today, warnDays);
    for (const kind of ['HU', 'SP']) {
      const r = x.rules.find((q) => q.kind === kind);
      if (!r || r.due_source === 'nachweis') continue;
      const readDue = r.next_due_date || null;
      // HU: eine früher berechnete Frist, die nicht mehr berechenbar ist (z. B. Masse korrigiert), wird geleert – sonst zeigten Fahrer-Startseite
      // und Akte-Tabelle weiter das alte Datum, obwohl die Frist „ungeklärt“ ist (21.10.2026); Altbestand ohne Grundlage bleibt
      const target = kind === 'HU' ? (res.hu.due_basis === 'berechnet' ? res.hu.due : (r.due_source === 'berechnet' ? null : r.next_due_date)) : res.sp.due;
      if ((target || null) !== (r.next_due_date || null)) {
        changes.push({ vehicle_id: x.v.id, plate: x.v.plate, kind, from: r.next_due_date || null, to: target || null, status: kind === 'HU' ? res.hu.status : res.sp.status });
        // nur auf dem gelesenen Stand (18.10.2026): ein gleichzeitig eingetragener Nachweis wurde sonst mit „berechnet“ überschrieben
        stmts.push(env.DB.prepare(`UPDATE maintenance_rules SET next_due_date=?, due_source='berechnet', interval_months=?, updated_at=? WHERE id=?
          AND (due_source IS NULL OR due_source<>'nachweis') AND next_due_date IS ?`)
          .bind(target || null, kind === 'HU' ? res.hu.interval_months : null, now, r.id, readDue));
        Object.assign(r, { next_due_date: target || null, due_source: 'berechnet' }); // Eingangsdaten auf Stand halten (Weiterverwendung im Agenten)
      }
    }
  }
  let applied = [];
  if (changes.length) {
    const results = [];
    for (let i = 0; i < stmts.length; i += 90) results.push(...(await env.DB.batch(stmts.slice(i, i + 90))));
    // nur tatsächlich geschriebene Neuberechnungen protokollieren
    applied = changes.filter((_, i) => results[i] && results[i].meta && results[i].meta.changes);
    if (applied.length) await env.DB.prepare(`INSERT INTO audit_log(id,actor_id,action,target,detail,created_at)
      SELECT lower(hex(randomblob(16))), ?1, 'maintenance.husp_recalc', json_extract(value,'$.vehicle_id'), value, ?2 FROM json_each(?3)`)
      .bind(actorId, now, JSON.stringify(applied)).run();
  }
  return { changed: applied.length, changes: applied, inputs: byV };
}
