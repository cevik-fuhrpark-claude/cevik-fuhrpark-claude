// [CLAUDE] Kalenderdateien (.ics) in der Sprache der Person (DE/UK/EN) – Server (src/*Ics) und Wächter-Test nutzen dieselben Texte.
// Bezeichnungen (Prüfart, Status, Vertrags-/Schreibenart) gleichen den Oberflächentexten in public/i18n.js (Test prüft die Übereinstimmung).
// Kalender enthalten bewusst keine Beschreibungen, Namen, Raten oder Vertragsnummern (werden oft in fremde Clouds synchronisiert).
export const ICS_LANGS = ['de', 'uk', 'en'];

// gespeicherter deutscher Name der Prüf-/Wartungsart → Schlüssel (wie MK_KEYS in app.js); HU/SP/UVV sind Fachkürzel und bleiben
export const ICS_MK_KEYS = { Tachograph: 'tacho', 'Ölwechsel': 'oil', Inspektion: 'service', Bremsen: 'brakes', Reifen: 'tires', 'Hydraulik/Aufbau': 'hydraulics', 'Feuerlöscher': 'extinguisher', Verbandkasten: 'firstaid', Ladungssicherung: 'loadsec', Ladebordwand: 'taillift', Ladekran: 'crane', 'Kühlgerät': 'reefer', 'ATP-Bescheinigung': 'atp', Temperaturschreiber: 'templog', 'Rückruf': 'recall', Sonstiges: 'other' };

export const ICS_LABELS = {
  de: {
    mk_tacho: 'Tachograph', mk_oil: 'Ölwechsel', mk_service: 'Inspektion', mk_brakes: 'Bremsen', mk_tires: 'Reifen', mk_hydraulics: 'Hydraulik/Aufbau', mk_extinguisher: 'Feuerlöscher', mk_firstaid: 'Verbandkasten', mk_loadsec: 'Ladungssicherung', mk_taillift: 'Ladebordwand', mk_crane: 'Ladekran', mk_reefer: 'Kühlgerät', mk_atp: 'ATP-Bescheinigung', mk_templog: 'Temperaturschreiber', mk_recall: 'Rückruf', mk_other: 'Sonstiges',
    st_gemeldet: 'Gemeldet', st_werkstatt_freigegeben: 'Werkstatt freigegeben', st_in_reparatur: 'In Reparatur', st_wartet_teile: 'Wartet auf Teile', st_abschlusskontrolle: 'Abschlusskontrolle',
    ck_leasing: 'Leasing', ck_miete: 'Miete', ck_finanzierung: 'Finanzierung', ck_versicherung: 'Versicherung', ck_wartung: 'Wartungsvertrag', ck_sonstiges: 'Sonstiger Vertrag',
    fk_anhoerung: 'Anhörung', fk_zeugenfragebogen: 'Zeugenfragebogen', fk_bussgeldbescheid: 'Bußgeldbescheid', fk_verwarnung: 'Verwarnung', fk_maut: 'Mautnacherhebung', fk_sonstiges: 'Sonstiges',
    wo_tag: 'Winterreifen', locked: 'Gesperrt',
  },
  uk: {
    mk_tacho: 'Тахограф', mk_oil: 'Заміна оливи', mk_service: 'Техобслуговування', mk_brakes: 'Гальма', mk_tires: 'Шини', mk_hydraulics: 'Гідравліка/надбудова', mk_extinguisher: 'Вогнегасник', mk_firstaid: 'Аптечка', mk_loadsec: 'Кріплення вантажу', mk_taillift: 'Гідроборт', mk_crane: 'Кран-маніпулятор', mk_reefer: 'Холодильна установка (ТО)', mk_atp: 'Свідоцтво ATP', mk_templog: 'Термописач', mk_recall: 'Відкликання (виробник)', mk_other: 'Інше',
    st_gemeldet: 'Повідомлено', st_werkstatt_freigegeben: 'Передано в майстерню', st_in_reparatur: 'У ремонті', st_wartet_teile: 'Очікує запчастини', st_abschlusskontrolle: 'Фінальний контроль',
    ck_leasing: 'Лізинг', ck_miete: 'Оренда', ck_finanzierung: 'Фінансування', ck_versicherung: 'Страхування', ck_wartung: 'Договір обслуговування', ck_sonstiges: 'Інший договір',
    fk_anhoerung: 'Запит на пояснення', fk_zeugenfragebogen: 'Анкета свідка', fk_bussgeldbescheid: 'Постанова про штраф', fk_verwarnung: 'Попередження', fk_maut: 'Донарахування мита', fk_sonstiges: 'Інше',
    wo_tag: 'Зимові шини', locked: 'Заблоковано',
  },
  en: {
    mk_tacho: 'Tachograph', mk_oil: 'Oil change', mk_service: 'Service', mk_brakes: 'Brakes', mk_tires: 'Tyres', mk_hydraulics: 'Hydraulics/body', mk_extinguisher: 'Fire extinguisher', mk_firstaid: 'First-aid kit', mk_loadsec: 'Load securing', mk_taillift: 'Tail lift', mk_crane: 'Loader crane', mk_reefer: 'Reefer unit (service)', mk_atp: 'ATP certificate', mk_templog: 'Temperature recorder', mk_recall: 'Recall (manufacturer)', mk_other: 'Other',
    st_gemeldet: 'Reported', st_werkstatt_freigegeben: 'Approved for workshop', st_in_reparatur: 'In repair', st_wartet_teile: 'Waiting for parts', st_abschlusskontrolle: 'Final inspection',
    ck_leasing: 'Leasing', ck_miete: 'Rental', ck_finanzierung: 'Financing', ck_versicherung: 'Insurance', ck_wartung: 'Maintenance contract', ck_sonstiges: 'Other contract',
    fk_anhoerung: 'Hearing notice', fk_zeugenfragebogen: 'Witness questionnaire', fk_bussgeldbescheid: 'Penalty notice', fk_verwarnung: 'Warning', fk_maut: 'Toll back-charge', fk_sonstiges: 'Other',
    wo_tag: 'Winter tyres', locked: 'Locked',
  },
};

// Satzbausteine je Kalender; {x} = Platzhalter. Datumswerte kommen bereits in der Schreibweise der Sprache.
export const ICS_TEXTS = {
  de: {
    ev_plaque_month: '(Plakette {m}: fällig bis Monatsende)', ev_done_label: 'Durchführung',
    cal_maint: 'Fuhrpark Prüftermine', maint_due: '{kind} fällig – {plate}', maint_desc: 'Nachweis: {evidence}', maint_desc_calc: 'berechnet nach StVZO Anlage VIII (kein eigener Eintrag)', ev_husp_rule: 'Frist nach StVZO Anlage VIII berechnet (aus der Fahrzeugakte angelegt)', maint_last: 'letzte Prüfung {d}',
    maint_plan: 'Werkstatttermin {kind} – {plate}', maint_plan_desc: 'geplanter Werkstatttermin', maint_plan_due: 'fällig {d}',
    cal_contracts: 'Fuhrpark Verträge', no_site: 'ohne Standort', c_notice: 'Kündigung spätestens: {label}',
    c_notice_desc: 'Laut Vertrag {n} {months} vor Vertragsende {end}. Form und Zugang der Kündigung laut Vertrag prüfen.', month_one: 'Monat', month_other: 'Monate',
    c_end: 'Vertragsende: {label}', c_end_desc: 'Rückgabe, Verlängerung oder Ersatzfahrzeug klären; danach Vertrag in der Fahrzeugakte beenden.',
    cal_plan: 'Werkstattplan', plan_vsite: 'Fahrzeuge {site}', plan_case: 'Werkstatt: {no} – {plate}', test_tag: 'TEST', plan_status: 'Status: {status}',
    plan_maint: 'Prüfung {kind} – {plate}', plan_due_by: 'fällig bis {d}', plan_coupled_lkw: 'gekoppelt mit Lkw {plate}', plan_coupled_anh: 'gekoppelt mit Anhänger {plate}', plan_parts_eta: 'Teile erwartet am {d}', plan_note: 'Hinweis zum Termin: {n}',
    cal_fines: 'Fuhrpark Behördenfristen', fine_due: 'Frist {kind} – {plate} ({no})', fine_ref: 'Az. {ref}', fine_by_letter: 'Frist laut Schreiben', fine_offday: 'fällt auf Wochenende/Feiertag – bis zum letzten Arbeitstag davor beantworten',
    cal_followup: 'Fuhrpark Wiedervorlagen', test_env: 'Test', followup: 'Wiedervorlage {no} – {plate}', followup_desc: 'Vorgang {no} ({status}) in der App öffnen',
  },
  uk: {
    ev_plaque_month: '(наліпка {m}: до кінця місяця)', ev_done_label: 'Виконання',
    cal_maint: 'Автопарк: терміни перевірок', maint_due: '{kind}: строк – {plate}', maint_desc: 'Підстава: {evidence}', maint_desc_calc: 'розраховано за StVZO, додаток VIII (без власного запису)', ev_husp_rule: 'Строк розраховано за StVZO, додаток VIII (створено з картки ТЗ)', maint_last: 'остання перевірка {d}',
    maint_plan: 'Візит у майстерню {kind} – {plate}', maint_plan_desc: 'запланований візит у майстерню', maint_plan_due: 'строк {d}',
    cal_contracts: 'Автопарк: договори', no_site: 'без місця базування', c_notice: 'Розірвати не пізніше: {label}',
    c_notice_desc: 'За договором – за {n} {months} до закінчення договору {end}. Форму та спосіб подання розірвання перевірте за договором.', month_one: 'місяць', month_few: 'місяці', month_many: 'місяців',
    c_end: 'Закінчення договору: {label}', c_end_desc: 'Узгодьте повернення, продовження або заміну авто; потім завершіть договір у картці авто.',
    cal_plan: 'План майстерні', plan_vsite: 'Авто {site}', plan_case: 'Майстерня: {no} – {plate}', test_tag: 'ТЕСТ', plan_status: 'Статус: {status}',
    plan_maint: 'Перевірка {kind} – {plate}', plan_due_by: 'строк до {d}', plan_coupled_lkw: 'зчеплено з вантажівкою {plate}', plan_coupled_anh: 'зчеплено з причепом {plate}', plan_parts_eta: 'Запчастини очікуються {d}', plan_note: 'Примітка до терміну: {n}',
    cal_fines: 'Автопарк: строки відповіді органам', fine_due: 'Строк: {kind} – {plate} ({no})', fine_ref: 'Спр. № {ref}', fine_by_letter: 'строк згідно з листом', fine_offday: 'припадає на вихідний/свято – відповісти до останнього робочого дня перед ним',
    cal_followup: 'Автопарк: нагадування', test_env: 'Тест', followup: 'Нагадування {no} – {plate}', followup_desc: 'Відкрийте випадок {no} ({status}) у застосунку',
  },
  en: {
    ev_plaque_month: '(sticker {m}: due by end of month)', ev_done_label: 'Done',
    cal_maint: 'Fleet inspection dates', maint_due: '{kind} due – {plate}', maint_desc: 'Evidence: {evidence}', maint_desc_calc: 'calculated per StVZO Annex VIII (no own entry)', ev_husp_rule: 'Due date calculated per StVZO Annex VIII (created from the vehicle file)', maint_last: 'last inspection {d}',
    maint_plan: 'Workshop appointment {kind} – {plate}', maint_plan_desc: 'planned workshop appointment', maint_plan_due: 'due {d}',
    cal_contracts: 'Fleet contracts', no_site: 'no location', c_notice: 'Give notice by: {label}',
    c_notice_desc: 'Per contract {n} {months} before contract end {end}. Check form and delivery of the notice in the contract.', month_one: 'month', month_other: 'months',
    c_end: 'Contract end: {label}', c_end_desc: 'Arrange return, extension or replacement vehicle; then end the contract in the vehicle file.',
    cal_plan: 'Workshop plan', plan_vsite: 'vehicles {site}', plan_case: 'Workshop: {no} – {plate}', test_tag: 'TEST', plan_status: 'Status: {status}',
    plan_maint: 'Inspection {kind} – {plate}', plan_due_by: 'due by {d}', plan_coupled_lkw: 'coupled with truck {plate}', plan_coupled_anh: 'coupled with trailer {plate}', plan_parts_eta: 'Parts expected {d}', plan_note: 'Note on the date: {n}',
    cal_fines: 'Fleet authority deadlines', fine_due: 'Deadline {kind} – {plate} ({no})', fine_ref: 'Ref. {ref}', fine_by_letter: 'deadline per letter', fine_offday: 'falls on a weekend/public holiday – reply by the last working day before it',
    cal_followup: 'Fleet follow-ups', test_env: 'Test', followup: 'Follow-up {no} – {plate}', followup_desc: 'Open case {no} ({status}) in the app',
  },
};

const ymd = (lang, s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); if (!m) return String(s ?? ''); return lang === 'en' ? `${m[3]}/${m[2]}/${m[1]}` : `${m[3]}.${m[2]}.${m[1]}`; };
const monthForm = (lang, n) => {
  const x = Math.abs(Number(n));
  if (lang === 'uk') { const m10 = x % 10; const m100 = x % 100; return m10 === 1 && m100 !== 11 ? 'month_one' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'month_few' : 'month_many'; }
  return x === 1 ? 'month_one' : 'month_other';
};

// Werkzeug je Sprache: tx(key, vars), label(key), kind(gespeicherte Prüfart), status(code), months(n), d(JJJJ-MM-TT)
export function icsLang(lang) {
  const L = ICS_LANGS.includes(lang) ? lang : 'de';
  const T = ICS_TEXTS[L]; const B = ICS_LABELS[L];
  const tx = (k, vars = {}) => String(T[k] ?? ICS_TEXTS.de[k] ?? k).replace(/\{(\w+)\}/g, (m, v) => (vars[v] === undefined || vars[v] === null ? '' : String(vars[v])));
  return {
    lang: L, tx,
    label: (k, fb) => B[k] ?? fb ?? k,
    kind: (k) => (ICS_MK_KEYS[k] ? B['mk_' + ICS_MK_KEYS[k]] : String(k ?? '')),
    status: (s) => B['st_' + s] ?? String(s ?? ''),
    months: (n) => T[monthForm(L, n)],
    d: (s) => ymd(L, s),
  };
}
