// [CLAUDE] Meldungstexte der Agentenbefunde als Vorlagen (DE/UK/EN) – gemeinsam für Server (src/agent.js erzeugt daraus den
// deutschen Text in `message`) und Oberfläche (Management-Panel zeigt denselben Befund in der Sprache der Person).
// Gespeichert wird je Befund `message_args` = {"k": Vorlagenschlüssel, "a": {Werte}}. Fehlt eine Vorlage, gilt der deutsche Text.
// Platzhalter: {name} Wert unverändert · {name:km} Zahl mit Tausendertrennung der Sprache · {name|LISTE} Wert aus ENUMS[Sprache][LISTE]
// [[ … ]] optionaler Abschnitt: entfällt, wenn ein Platzhalter darin leer ist (null/undefined/''). Keine Verschachtelung.
// Werte, die Menschen eingegeben haben (Prüfart, Sperrgrund, Vermerk, Teilename, Reifenposition), bleiben unübersetzt.
// Nur Daten und reine Funktionen, keine Abhängigkeiten.
export const FINDING_MESSAGES = {
  de: {
    NO_FLEET_RECIPIENT: 'Keine aktive Fuhrparkleitung mit Zugang in dieser Umgebung – Meldungen haben keinen Empfänger.',
    CASE_FOLLOWUP_DUE: '{label}: Wiedervorlage am {date}[[ – {note}]].',
    CASE_STALE: '{label}: {state|STALE} – letzte Änderung am {date} (Nachfassen nach {days} Tagen eingestellt).',
    CRITICAL_UNTRIAGED: '{label}: sicherheitsrelevante Meldung seit {at} nicht von der Fuhrparkleitung bestätigt.',
    TRIAGE_OVERDUE: '{label}: Erstbewertung überfällig (gemeldet {at}, Frist {sla} Min.).',
    TRIAGE_OPEN: '{label}: wartet auf Erstbewertung (seit {at}).',
    TRIAGE_OPEN_NOSLA: '{label}: wartet auf Erstbewertung (seit {at}; Frist nicht konfiguriert).',
    NO_WORKSHOP_RECIPIENT: '{label}: Werkstatt {site} hat keinen aktiven Benutzer – Auftrag kann nicht übernommen werden.',
    WORKSHOP_ACK_MISSING: '{label}: freigegebener Auftrag seit {at} nicht von Werkstatt {site} übernommen.',
    WORKSHOP_ACK_PENDING: '{label}: wartet auf Übernahme durch Werkstatt {site} (seit {at}).',
    WORKSHOP_ACK_PENDING_NOSLA: '{label}: wartet auf Übernahme durch Werkstatt {site} (seit {at}; Frist nicht konfiguriert).',
    WAITING_PARTS: '{label}: Reparatur wartet auf Teile (seit {at}).',
    COST_APPROVAL_PENDING: '{label}: Kosten-Freigabegrenze überschritten – Kostenfreigabe offen (seit {at}).',
    QC_PENDING: '{label}: Reparatur gemeldet – Abschlusskontrolle und technische Freigabe durch einen Menschen offen.',
    SAFETY_OPEN_ITEMS: '{label}: {n} sicherheitsrelevante Restarbeit(en) offen.',
    VEHICLE_LOCKED: '{plate}: gesperrt ({reason}) – nicht disponieren.',
    VEHICLE_LOCKED_DEFAULT: '{plate}: gesperrt (Sicherheitsprüfung) – nicht disponieren.',
    RELEASED_WITH_OPEN_ITEMS: '{label}: freigegeben mit {n} offener nicht sicherheitsrelevanter Restarbeit(en).',
    URGENT_NOT_DELIVERED: 'Dringende Benachrichtigung an {n} Empfänger nicht per Push zugestellt (kein aktiviertes Gerät oder Fehler).',
    COSTS_UNVALUED_RATE: '{label}: Kosten unvollständig bewertet (kein Stundensatz).',
    COSTS_UNVALUED_PARTS: '{label}: Kosten unvollständig bewertet ({n} Teil(e) ohne Preis).',
    COSTS_UNVALUED_BOTH: '{label}: Kosten unvollständig bewertet (kein Stundensatz, {n} Teil(e) ohne Preis).',
    MAINT_KM_OVERDUE: '{plate}: {kind} war bei {due:km} km fällig – Stand {km:km} km (abgelesen {date}).',
    MAINT_KM_DUE: '{plate}: {kind} fällig bei {due:km} km – Stand {km:km} km (noch {rest:km} km).',
    MAINT_DATE_OVERDUE: '{plate}: {kind} seit {days} Tag(en) überfällig (fällig {due}).',
    MAINT_DATE_DUE: '{plate}: {kind} fällig am {due} (in {days} Tag(en)).',
    HUSP_OVERDUE: '{plate}: {kind} überfällig (fällig bis Ende {due}[[, 6 Monate nach HU {hu}]]).',
    HUSP_DUE: '{plate}: {kind} fällig bis Ende {due}[[ (Werkstatttermin geplant {planned})]].',
    INSPECTION_UNCLEAR: '{plate}: {kind}-Frist ungeklärt – {note}',
    DOCUMENT_EXPIRED: '{plate}: {doc|DOC} abgelaufen am {date}.',
    DOCUMENT_EXPIRES_SOON: '{plate}: {doc|DOC} gültig bis {date} (in {days} Tag(en)).',
    INSPECTION_DEFECTS_NO_CASE: '{plate}: {kind} vom {date} mit Ergebnis „{res|RES}“ – seitdem kein Vorgang/Auftrag.',
    REINSPECTION_PENDING: '{plate}: Mängel aus {kind} vom {date} ({res|RES}) laut Auftrag {case_no} beseitigt – Nachprüfung noch nicht eingetragen.',
    INSPECTION_RESULT_MISSING: '{plate}: {kind} vom {date} ohne eingetragenes Prüfergebnis.',
    TIRE_TREAD: '{plate} {pos}: Profiltiefe {mm} mm (Grenze {limit} mm, gemessen {date}).',
  },
  uk: {
    NO_FLEET_RECIPIENT: 'У цьому середовищі немає активного керівника автопарку з доступом – повідомлення не мають отримувача.',
    CASE_FOLLOWUP_DUE: '{label}: нагадування на {date}[[ – {note}]].',
    CASE_STALE: '{label}: {state|STALE} – остання зміна {date} (нагадування через {days} дн. налаштовано).',
    CRITICAL_UNTRIAGED: '{label}: повідомлення, важливе для безпеки, з {at} не підтверджене керівником автопарку.',
    TRIAGE_OVERDUE: '{label}: первинну оцінку прострочено (повідомлено {at}, строк {sla} хв).',
    TRIAGE_OPEN: '{label}: очікує первинної оцінки (з {at}).',
    TRIAGE_OPEN_NOSLA: '{label}: очікує первинної оцінки (з {at}; строк не налаштовано).',
    NO_WORKSHOP_RECIPIENT: '{label}: майстерня {site} не має активного користувача – замовлення не може бути прийняте.',
    WORKSHOP_ACK_MISSING: '{label}: передане замовлення з {at} не прийняте майстернею {site}.',
    WORKSHOP_ACK_PENDING: '{label}: очікує прийняття майстернею {site} (з {at}).',
    WORKSHOP_ACK_PENDING_NOSLA: '{label}: очікує прийняття майстернею {site} (з {at}; строк не налаштовано).',
    WAITING_PARTS: '{label}: ремонт очікує запчастин (з {at}).',
    COST_APPROVAL_PENDING: '{label}: перевищено межу погодження витрат – погодження витрат відкрите (з {at}).',
    QC_PENDING: '{label}: ремонт завершено – заключна перевірка і технічний допуск людиною відкриті.',
    SAFETY_OPEN_ITEMS: '{label}: відкритих залишкових робіт, важливих для безпеки: {n}.',
    VEHICLE_LOCKED: '{plate}: заблоковано ({reason}) – не планувати.',
    VEHICLE_LOCKED_DEFAULT: '{plate}: заблоковано (перевірка безпеки) – не планувати.',
    RELEASED_WITH_OPEN_ITEMS: '{label}: допущено з відкритими залишковими роботами, не важливими для безпеки: {n}.',
    URGENT_NOT_DELIVERED: 'Термінове сповіщення для {n} отримувач(ів) не доставлено push-повідомленням (немає активованого пристрою або помилка).',
    COSTS_UNVALUED_RATE: '{label}: витрати оцінено не повністю (немає погодинної ставки).',
    COSTS_UNVALUED_PARTS: '{label}: витрати оцінено не повністю (запчастин без ціни: {n}).',
    COSTS_UNVALUED_BOTH: '{label}: витрати оцінено не повністю (немає погодинної ставки, запчастин без ціни: {n}).',
    MAINT_KM_OVERDUE: '{plate}: {kind} мав бути на {due:km} км – пробіг {km:km} км (зчитано {date}).',
    MAINT_KM_DUE: '{plate}: {kind} на {due:km} км – пробіг {km:km} км (залишилось {rest:km} км).',
    MAINT_DATE_OVERDUE: '{plate}: {kind} прострочено на {days} дн. (строк {due}).',
    MAINT_DATE_DUE: '{plate}: {kind} до {due} (через {days} дн.).',
    HUSP_OVERDUE: '{plate}: {kind} прострочено (строк до кінця {due}[[, 6 місяців після HU {hu}]]).',
    HUSP_DUE: '{plate}: {kind} до кінця {due}[[ (запланований візит до майстерні {planned})]].',
    INSPECTION_UNCLEAR: '{plate}: строк {kind} не з’ясовано – {note}',
    DOCUMENT_EXPIRED: '{plate}: {doc|DOC} – строк дії минув {date}.',
    DOCUMENT_EXPIRES_SOON: '{plate}: {doc|DOC} дійсний до {date} (через {days} дн.).',
    INSPECTION_DEFECTS_NO_CASE: '{plate}: {kind} від {date} з результатом «{res|RES}» – відтоді немає заявки/замовлення.',
    REINSPECTION_PENDING: '{plate}: дефекти з {kind} від {date} ({res|RES}) усунуто за замовленням {case_no} – повторний огляд ще не внесено.',
    INSPECTION_RESULT_MISSING: '{plate}: {kind} від {date} без внесеного результату.',
    TIRE_TREAD: '{plate} {pos}: глибина протектора {mm} мм (межа {limit} мм, виміряно {date}).',
  },
  en: {
    NO_FLEET_RECIPIENT: 'No active fleet manager with access in this environment – notifications have no recipient.',
    CASE_FOLLOWUP_DUE: '{label}: follow-up on {date}[[ – {note}]].',
    CASE_STALE: '{label}: {state|STALE} – last change on {date} (follow-up after {days} days configured).',
    CRITICAL_UNTRIAGED: '{label}: safety-relevant report not confirmed by fleet management since {at}.',
    TRIAGE_OVERDUE: '{label}: initial assessment overdue (reported {at}, deadline {sla} min).',
    TRIAGE_OPEN: '{label}: awaiting initial assessment (since {at}).',
    TRIAGE_OPEN_NOSLA: '{label}: awaiting initial assessment (since {at}; no deadline configured).',
    NO_WORKSHOP_RECIPIENT: '{label}: workshop {site} has no active user – the order cannot be accepted.',
    WORKSHOP_ACK_MISSING: '{label}: released order not accepted by workshop {site} since {at}.',
    WORKSHOP_ACK_PENDING: '{label}: awaiting acceptance by workshop {site} (since {at}).',
    WORKSHOP_ACK_PENDING_NOSLA: '{label}: awaiting acceptance by workshop {site} (since {at}; no deadline configured).',
    WAITING_PARTS: '{label}: repair waiting for parts (since {at}).',
    COST_APPROVAL_PENDING: '{label}: cost approval limit exceeded – cost approval pending (since {at}).',
    QC_PENDING: '{label}: repair reported – final check and technical release by a person pending.',
    SAFETY_OPEN_ITEMS: '{label}: {n} safety-relevant remaining job(s) open.',
    VEHICLE_LOCKED: '{plate}: locked ({reason}) – do not dispatch.',
    VEHICLE_LOCKED_DEFAULT: '{plate}: locked (safety check) – do not dispatch.',
    RELEASED_WITH_OPEN_ITEMS: '{label}: released with {n} open non-safety-relevant remaining job(s).',
    URGENT_NOT_DELIVERED: 'Urgent notification to {n} recipient(s) not delivered by push (no enabled device or error).',
    COSTS_UNVALUED_RATE: '{label}: costs not fully valued (no hourly rate).',
    COSTS_UNVALUED_PARTS: '{label}: costs not fully valued ({n} part(s) without price).',
    COSTS_UNVALUED_BOTH: '{label}: costs not fully valued (no hourly rate, {n} part(s) without price).',
    MAINT_KM_OVERDUE: '{plate}: {kind} was due at {due:km} km – reading {km:km} km (read on {date}).',
    MAINT_KM_DUE: '{plate}: {kind} due at {due:km} km – reading {km:km} km ({rest:km} km left).',
    MAINT_DATE_OVERDUE: '{plate}: {kind} overdue for {days} day(s) (due {due}).',
    MAINT_DATE_DUE: '{plate}: {kind} due on {due} (in {days} day(s)).',
    HUSP_OVERDUE: '{plate}: {kind} overdue (due by end of {due}[[, 6 months after HU {hu}]]).',
    HUSP_DUE: '{plate}: {kind} due by end of {due}[[ (workshop appointment planned {planned})]].',
    INSPECTION_UNCLEAR: '{plate}: {kind} deadline unclear – {note}',
    DOCUMENT_EXPIRED: '{plate}: {doc|DOC} expired on {date}.',
    DOCUMENT_EXPIRES_SOON: '{plate}: {doc|DOC} valid until {date} (in {days} day(s)).',
    INSPECTION_DEFECTS_NO_CASE: '{plate}: {kind} on {date} with result “{res|RES}” – no case/order since.',
    REINSPECTION_PENDING: '{plate}: defects from {kind} on {date} ({res|RES}) fixed according to order {case_no} – re-inspection not yet recorded.',
    INSPECTION_RESULT_MISSING: '{plate}: {kind} on {date} without a recorded result.',
    TIRE_TREAD: '{plate} {pos}: tread depth {mm} mm (limit {limit} mm, measured {date}).',
  },
};

// Feste Wertelisten (Schlüssel aus der Datenbank → Text je Sprache)
export const FINDING_ENUMS = {
  de: {
    STALE: { gemeldet: 'bewertet, nicht weitergeleitet', werkstatt_freigegeben: 'von der Werkstatt übernommen, Reparatur nicht begonnen', in_reparatur: 'in Reparatur' },
    RES: { erhebliche_maengel: 'erhebliche Mängel', gefaehrliche_maengel: 'gefährliche Mängel', verkehrsunsicher: 'verkehrsunsicher' },
    DOC: { zulassung: 'Zulassung', pruefbericht: 'Prüfbericht', rechnung: 'Rechnung', versicherung: 'Versicherung', leasing: 'Leasing/Miete', rueckruf: 'Rückrufschreiben', foto: 'Foto', sonstiges: 'Dokument' },
  },
  uk: {
    STALE: { gemeldet: 'оцінено, не передано далі', werkstatt_freigegeben: 'прийнято майстернею, ремонт не розпочато', in_reparatur: 'у ремонті' },
    RES: { erhebliche_maengel: 'значні дефекти', gefaehrliche_maengel: 'небезпечні дефекти', verkehrsunsicher: 'небезпечний для руху' },
    DOC: { zulassung: 'Реєстрація', pruefbericht: 'Протокол огляду', rechnung: 'Рахунок', versicherung: 'Страхування', leasing: 'Лізинг/оренда', rueckruf: 'Лист про відкликання', foto: 'Фото', sonstiges: 'Документ' },
  },
  en: {
    STALE: { gemeldet: 'assessed, not forwarded', werkstatt_freigegeben: 'accepted by the workshop, repair not started', in_reparatur: 'in repair' },
    RES: { erhebliche_maengel: 'major defects', gefaehrliche_maengel: 'dangerous defects', verkehrsunsicher: 'unroadworthy' },
    DOC: { zulassung: 'Registration', pruefbericht: 'Inspection report', rechnung: 'Invoice', versicherung: 'Insurance', leasing: 'Leasing/rental', rueckruf: 'Recall letter', foto: 'Photo', sonstiges: 'Document' },
  },
};

const LOCALE = { de: 'de-DE', uk: 'uk-UA', en: 'en-GB' };
const empty = (v) => v === null || v === undefined || v === '';
const PH = /\{([a-z_]+)(?::(km)|\|([A-Z]+))?\}/g;

function fill(text, args, lang) {
  return text.replace(PH, (_, name, fmt, list) => {
    const v = args[name];
    if (empty(v)) return '';
    if (fmt === 'km') return Number(v).toLocaleString(LOCALE[lang] || 'de-DE');
    if (list) { const e = (FINDING_ENUMS[lang] || FINDING_ENUMS.de)[list] || {}; return e[v] ?? FINDING_ENUMS.de[list]?.[v] ?? String(v); }
    return String(v);
  });
}

// Text einer Vorlage in einer Sprache; null, wenn die Vorlage fehlt (Aufrufer nimmt dann den gespeicherten deutschen Text)
export function renderFindingMessage(key, args = {}, lang = 'de') {
  const tpl = (FINDING_MESSAGES[lang] && FINDING_MESSAGES[lang][key]) || null;
  if (!tpl) return null;
  const a = args || {};
  const withOptional = tpl.replace(/\[\[([^\[\]]*)\]\]/g, (_, inner) => {
    const names = [...inner.matchAll(PH)].map((m) => m[1]);
    return names.some((n) => empty(a[n])) ? '' : inner;
  });
  return fill(withOptional, a, lang);
}

// Gespeicherte Form `message_args` (JSON-Text oder Objekt) → Text; Rückfall auf den deutschen Text des Befunds
export function findingMessage(stored, fallback, lang) {
  if (!stored) return fallback;
  let o = stored;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { return fallback; } }
  if (!o || typeof o.k !== 'string') return fallback;
  return renderFindingMessage(o.k, o.a, lang) ?? fallback;
}
