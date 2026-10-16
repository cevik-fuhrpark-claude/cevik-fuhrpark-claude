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
    SAFETY_OPEN_ITEMS: '{label}: {n} sicherheitsrelevante {n#Restarbeit/Restarbeiten} offen.',
    VEHICLE_LOCKED: '{plate}: gesperrt ({reason}) – nicht disponieren.',
    VEHICLE_LOCKED_DEFAULT: '{plate}: gesperrt (Sicherheitsprüfung) – nicht disponieren.',
    RELEASED_WITH_OPEN_ITEMS: '{label}: freigegeben mit {n} {n#offener nicht sicherheitsrelevanter Restarbeit/offenen nicht sicherheitsrelevanten Restarbeiten}.',
    URGENT_NOT_DELIVERED: 'Dringende Benachrichtigung an {n} Empfänger nicht per Push zugestellt (kein aktiviertes Gerät oder Fehler).',
    COSTS_UNVALUED_RATE: '{label}: Kosten unvollständig bewertet (kein Stundensatz).',
    COSTS_UNVALUED_PARTS: '{label}: Kosten unvollständig bewertet ({n} {n#Teil/Teile} ohne Preis).',
    COSTS_UNVALUED_BOTH: '{label}: Kosten unvollständig bewertet (kein Stundensatz, {n} {n#Teil/Teile} ohne Preis).',
    MAINT_KM_OVERDUE: '{plate}: {kind} war bei {due:km} km fällig – Stand {km:km} km (abgelesen {date}).',
    MAINT_KM_DUE: '{plate}: {kind} fällig bei {due:km} km – Stand {km:km} km (noch {rest:km} km).',
    MAINT_DATE_OVERDUE: '{plate}: {kind} seit {days} {days#Tag/Tagen} überfällig (fällig {due}).',
    MAINT_DATE_DUE: '{plate}: {kind} fällig am {due} (in {days} {days#Tag/Tagen}).',
    HUSP_OVERDUE: '{plate}: {kind} überfällig (fällig bis Ende {due}[[, 6 Monate nach HU {hu}]]).',
    HUSP_DUE: '{plate}: {kind} fällig bis Ende {due}[[ (Werkstatttermin geplant {planned})]].',
    INSPECTION_UNCLEAR: '{plate}: {kind}-Frist ungeklärt – {note}',
    DOCUMENT_EXPIRED: '{plate}: {doc|DOC} abgelaufen am {date}.',
    DOCUMENT_EXPIRES_SOON: '{plate}: {doc|DOC} gültig bis {date} (in {days} {days#Tag/Tagen}).',
    INSPECTION_DEFECTS_NO_CASE: '{plate}: {kind} vom {date} mit Ergebnis „{res|RES}“ – seitdem kein Vorgang/Auftrag.',
    REINSPECTION_PENDING: '{plate}: Mängel aus {kind} vom {date} ({res|RES}) laut Auftrag {case_no} beseitigt – Nachprüfung noch nicht eingetragen.',
    INSPECTION_RESULT_MISSING: '{plate}: {kind} vom {date} ohne eingetragenes Prüfergebnis.',
    TIRE_TREAD: '{plate} {pos}: Profiltiefe {mm} mm (Grenze {limit} mm, gemessen {date}).',
    STOCK_ORDER_OVERDUE: 'Lager {site}: {name}[[ ({pn})]] – Liefertermin überschritten.[[ Bestellt {oq} {unit} am {oon}, Liefertermin laut Lieferant {eta}.]] Bestand {stock} {unit}, Mindestbestand {min}.',
    STOCK_BELOW_MIN: 'Lager {site}: {name}[[ ({pn})]] – Bestand {stock} {unit}, Mindestbestand {min}.',
    STOCK_BELOW_MIN_ORD: 'Lager {site}: {name}[[ ({pn})]] – Bestand {stock} {unit}, Mindestbestand {min}. Bestellt {oq} {unit} am {oon}[[, Liefertermin laut Lieferant {eta}]]. Noch zu bestellen: {open} {unit}.',
    CONTRACT_ENDED: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) endete laut Eintrag am {end} – in der App noch nicht als beendet markiert.',
    CONTRACT_ENDS_SOON: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) endet am {end} (in {days} {days#Tag/Tagen}).',
    CONTRACT_NOTICE_DUE: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) – Kündigung laut Vertrag spätestens bis {by} ({months} {months#Monat/Monate} vor Ende {end}).',
    CONTRACT_KM_OVER: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) – km-Kontingent {allow:km} km überschritten (seit Übernahme {driven:km} km).',
    CONTRACT_KM_FORECAST: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) – bei gleicher Fahrleistung voraussichtlich {fc:km} km bis Vertragsende (Kontingent {allow:km} km; Prognose).',
    CLAIM_OPEN_LONG: '{label}: Versicherungsfall bei {insurer}[[, Schaden-Nr. {claim_no}]] seit {date} {st|CLAIM} (Nachfassen nach {days} Tagen eingestellt).',
    DRIVER_DOC_EXPIRED: 'Fahrer {name}: {ddoc|DDOC} abgelaufen (gültig bis {date}).',
    DRIVER_DOC_EXPIRES_SOON: 'Fahrer {name}: {ddoc|DDOC} läuft am {date} ab (in {days} Tagen).',
    LICENSE_CHECK_DUE: 'Fahrer {name}: Führerscheinkontrolle fällig (letzte {last}).',
    LICENSE_CHECK_FAILED: 'Fahrer {name}: letzte Führerscheinkontrolle nicht in Ordnung ({last}).',
    TACHO_CARD_OVERDUE: 'Fahrer {name}: Fahrerkarte seit {due} nicht ausgelesen (letzte Auslesung {last}; Frist 28 Tage, FPersV § 2 Abs. 5).',
    TACHO_CARD_DUE: 'Fahrer {name}: Fahrerkarte spätestens am {due} auslesen.',
    TACHO_VU_OVERDUE: '{plate}: Massenspeicher seit {due} nicht ausgelesen (letzte Auslesung {last}; Frist 90 Tage, FPersV § 2 Abs. 5).',
    TACHO_VU_DUE: '{plate}: Massenspeicher spätestens am {due} auslesen.',
    FINE_OVERDUE: '{label}: Antwortfrist {due} überschritten.',
    FINE_DUE_SOON: '{label}: Antwortfrist {due} (in {days} {days#Tag/Tagen}).',
    FINE_VEHICLE_UNKNOWN: '{label}: Kennzeichen {plate} keinem Fahrzeug zugeordnet.',
    FINE_DRIVER_OPEN: '{label}: Fahrer zur Tatzeit noch nicht ermittelt.',
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
    URGENT_NOT_DELIVERED: 'Термінове сповіщення для {n} {n#отримувача/отримувачів/отримувачів} не доставлено push-повідомленням (немає активованого пристрою або помилка).',
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
    STOCK_ORDER_OVERDUE: 'Склад {site}: {name}[[ ({pn})]] – строк поставки минув.[[ Замовлено {oq} {unit} {oon}, строк поставки за постачальником {eta}.]] Залишок {stock} {unit}, мінімальний запас {min}.',
    STOCK_BELOW_MIN: 'Склад {site}: {name}[[ ({pn})]] – залишок {stock} {unit}, мінімальний запас {min}.',
    STOCK_BELOW_MIN_ORD: 'Склад {site}: {name}[[ ({pn})]] – залишок {stock} {unit}, мінімальний запас {min}. Замовлено {oq} {unit} {oon}[[, строк поставки за постачальником {eta}]]. Ще замовити: {open} {unit}.',
    CONTRACT_ENDED: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) закінчився за записом {end} – у застосунку ще не позначений як завершений.',
    CONTRACT_ENDS_SOON: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) закінчується {end} (через {days} дн.).',
    CONTRACT_NOTICE_DUE: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) – розірвання за договором не пізніше {by} ({months} міс. до кінця {end}).',
    CONTRACT_KM_OVER: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) – ліміт пробігу {allow:km} км перевищено (з моменту отримання {driven:km} км).',
    CONTRACT_KM_FORECAST: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) – за такого ж пробігу орієнтовно {fc:km} км до кінця договору (ліміт {allow:km} км; прогноз).',
    CLAIM_OPEN_LONG: '{label}: страховий випадок у {insurer}[[, № збитку {claim_no}]] з {date} у статусі «{st|CLAIM}» (нагадування через {days} дн. налаштовано).',
    DRIVER_DOC_EXPIRED: 'Водій {name}: {ddoc|DDOC} – строк дії минув (дійсний до {date}).',
    DRIVER_DOC_EXPIRES_SOON: 'Водій {name}: {ddoc|DDOC} спливає {date} (через {days} дн.).',
    LICENSE_CHECK_DUE: 'Водій {name}: потрібна перевірка посвідчення (остання {last}).',
    LICENSE_CHECK_FAILED: 'Водій {name}: остання перевірка посвідчення не в порядку ({last}).',
    TACHO_CARD_OVERDUE: 'Водій {name}: картку водія не зчитано з {due} (останнє зчитування {last}; строк 28 днів, FPersV § 2 абз. 5).',
    TACHO_CARD_DUE: 'Водій {name}: зчитати картку водія не пізніше {due}.',
    TACHO_VU_OVERDUE: '{plate}: пам’ять тахографа не зчитано з {due} (останнє зчитування {last}; строк 90 днів, FPersV § 2 абз. 5).',
    TACHO_VU_DUE: '{plate}: зчитати пам’ять тахографа не пізніше {due}.',
    FINE_OVERDUE: '{label}: строк відповіді {due} минув.',
    FINE_DUE_SOON: '{label}: строк відповіді {due} (через {days} дн.).',
    FINE_VEHICLE_UNKNOWN: '{label}: номерний знак {plate} не прив’язаний до жодного транспорту.',
    FINE_DRIVER_OPEN: '{label}: водія на момент порушення ще не встановлено.',
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
    SAFETY_OPEN_ITEMS: '{label}: {n} safety-relevant remaining {n#job/jobs} open.',
    VEHICLE_LOCKED: '{plate}: locked ({reason}) – do not dispatch.',
    VEHICLE_LOCKED_DEFAULT: '{plate}: locked (safety check) – do not dispatch.',
    RELEASED_WITH_OPEN_ITEMS: '{label}: released with {n} open non-safety-relevant remaining {n#job/jobs}.',
    URGENT_NOT_DELIVERED: 'Urgent notification to {n} {n#recipient/recipients} not delivered by push (no enabled device or error).',
    COSTS_UNVALUED_RATE: '{label}: costs not fully valued (no hourly rate).',
    COSTS_UNVALUED_PARTS: '{label}: costs not fully valued ({n} {n#part/parts} without price).',
    COSTS_UNVALUED_BOTH: '{label}: costs not fully valued (no hourly rate, {n} {n#part/parts} without price).',
    MAINT_KM_OVERDUE: '{plate}: {kind} was due at {due:km} km – reading {km:km} km (read on {date}).',
    MAINT_KM_DUE: '{plate}: {kind} due at {due:km} km – reading {km:km} km ({rest:km} km left).',
    MAINT_DATE_OVERDUE: '{plate}: {kind} overdue for {days} {days#day/days} (due {due}).',
    MAINT_DATE_DUE: '{plate}: {kind} due on {due} (in {days} {days#day/days}).',
    HUSP_OVERDUE: '{plate}: {kind} overdue (due by end of {due}[[, 6 months after HU {hu}]]).',
    HUSP_DUE: '{plate}: {kind} due by end of {due}[[ (workshop appointment planned {planned})]].',
    INSPECTION_UNCLEAR: '{plate}: {kind} deadline unclear – {note}',
    DOCUMENT_EXPIRED: '{plate}: {doc|DOC} expired on {date}.',
    DOCUMENT_EXPIRES_SOON: '{plate}: {doc|DOC} valid until {date} (in {days} {days#day/days}).',
    INSPECTION_DEFECTS_NO_CASE: '{plate}: {kind} on {date} with result “{res|RES}” – no case/order since.',
    REINSPECTION_PENDING: '{plate}: defects from {kind} on {date} ({res|RES}) fixed according to order {case_no} – re-inspection not yet recorded.',
    INSPECTION_RESULT_MISSING: '{plate}: {kind} on {date} without a recorded result.',
    TIRE_TREAD: '{plate} {pos}: tread depth {mm} mm (limit {limit} mm, measured {date}).',
    STOCK_ORDER_OVERDUE: 'Store {site}: {name}[[ ({pn})]] – delivery date passed.[[ Ordered {oq} {unit} on {oon}, delivery date per supplier {eta}.]] Stock {stock} {unit}, minimum stock {min}.',
    STOCK_BELOW_MIN: 'Store {site}: {name}[[ ({pn})]] – stock {stock} {unit}, minimum stock {min}.',
    STOCK_BELOW_MIN_ORD: 'Store {site}: {name}[[ ({pn})]] – stock {stock} {unit}, minimum stock {min}. Ordered {oq} {unit} on {oon}[[, delivery date per supplier {eta}]]. Still to order: {open} {unit}.',
    CONTRACT_ENDED: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) ended on {end} according to the record – not yet marked as ended in the app.',
    CONTRACT_ENDS_SOON: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) ends on {end} (in {days} {days#day/days}).',
    CONTRACT_NOTICE_DUE: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) – notice per contract by {by} at the latest ({months} {months#month/months} before end {end}).',
    CONTRACT_KM_OVER: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) – mileage allowance {allow:km} km exceeded ({driven:km} km since handover).',
    CONTRACT_KM_FORECAST: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) – at the same usage approx. {fc:km} km by contract end (allowance {allow:km} km; forecast).',
    CLAIM_OPEN_LONG: '{label}: insurance claim with {insurer}[[, claim no. {claim_no}]] {st|CLAIM} since {date} (follow-up after {days} days configured).',
    DRIVER_DOC_EXPIRED: 'Driver {name}: {ddoc|DDOC} expired (valid until {date}).',
    DRIVER_DOC_EXPIRES_SOON: 'Driver {name}: {ddoc|DDOC} expires on {date} (in {days} days).',
    LICENSE_CHECK_DUE: 'Driver {name}: licence check due (last {last}).',
    LICENSE_CHECK_FAILED: 'Driver {name}: last licence check not OK ({last}).',
    TACHO_CARD_OVERDUE: 'Driver {name}: driver card not downloaded since {due} (last download {last}; limit 28 days, FPersV § 2 (5)).',
    TACHO_CARD_DUE: 'Driver {name}: download driver card by {due} at the latest.',
    TACHO_VU_OVERDUE: '{plate}: vehicle unit not downloaded since {due} (last download {last}; limit 90 days, FPersV § 2 (5)).',
    TACHO_VU_DUE: '{plate}: download vehicle unit by {due} at the latest.',
    FINE_OVERDUE: '{label}: response deadline {due} passed.',
    FINE_DUE_SOON: '{label}: response deadline {due} (in {days} {days#day/days}).',
    FINE_VEHICLE_UNKNOWN: '{label}: licence plate {plate} not assigned to any vehicle.',
    FINE_DRIVER_OPEN: '{label}: driver at the time of the offence not yet identified.',
  },
};

// Feste Wertelisten (Schlüssel aus der Datenbank → Text je Sprache)
export const FINDING_ENUMS = {
  de: {
    STALE: { gemeldet: 'bewertet, nicht weitergeleitet', werkstatt_freigegeben: 'von der Werkstatt übernommen, Reparatur nicht begonnen', in_reparatur: 'in Reparatur' },
    RES: { erhebliche_maengel: 'erhebliche Mängel', gefaehrliche_maengel: 'gefährliche Mängel', verkehrsunsicher: 'verkehrsunsicher' },
    DOC: { zulassung: 'Zulassung', pruefbericht: 'Prüfbericht', rechnung: 'Rechnung', versicherung: 'Versicherung', leasing: 'Leasing/Miete', rueckruf: 'Rückrufschreiben', foto: 'Foto', sonstiges: 'Dokument' },
    CKIND: { leasing: 'Leasing', miete: 'Miete', finanzierung: 'Finanzierung', versicherung: 'Versicherung', wartung: 'Wartungsvertrag', sonstiges: 'Vertrag' },
    CLAIM: { gemeldet: 'gemeldet', in_pruefung: 'in Prüfung', reguliert: 'reguliert', abgelehnt: 'abgelehnt', zurueckgezogen: 'zurückgezogen' },
    DDOC: { fuehrerschein: 'Führerschein', fahrerkarte: 'Fahrerkarte', code95: 'Code 95 / Weiterbildung', unterweisung: 'Unterweisung', sonstiges: 'Nachweis' },
  },
  uk: {
    STALE: { gemeldet: 'оцінено, не передано далі', werkstatt_freigegeben: 'прийнято майстернею, ремонт не розпочато', in_reparatur: 'у ремонті' },
    RES: { erhebliche_maengel: 'значні дефекти', gefaehrliche_maengel: 'небезпечні дефекти', verkehrsunsicher: 'небезпечний для руху' },
    DOC: { zulassung: 'Реєстрація', pruefbericht: 'Протокол огляду', rechnung: 'Рахунок', versicherung: 'Страхування', leasing: 'Лізинг/оренда', rueckruf: 'Лист про відкликання', foto: 'Фото', sonstiges: 'Документ' },
    CKIND: { leasing: 'Лізинг', miete: 'Оренда', finanzierung: 'Фінансування', versicherung: 'Страхування', wartung: 'Договір обслуговування', sonstiges: 'Договір' },
    CLAIM: { gemeldet: 'повідомлено', in_pruefung: 'на розгляді', reguliert: 'врегульовано', abgelehnt: 'відхилено', zurueckgezogen: 'відкликано' },
    DDOC: { fuehrerschein: 'Посвідчення водія', fahrerkarte: 'Картка водія', code95: 'Код 95 / підвищення кваліфікації', unterweisung: 'Інструктаж', sonstiges: 'Підтвердження' },
  },
  en: {
    STALE: { gemeldet: 'assessed, not forwarded', werkstatt_freigegeben: 'accepted by the workshop, repair not started', in_reparatur: 'in repair' },
    RES: { erhebliche_maengel: 'major defects', gefaehrliche_maengel: 'dangerous defects', verkehrsunsicher: 'unroadworthy' },
    DOC: { zulassung: 'Registration', pruefbericht: 'Inspection report', rechnung: 'Invoice', versicherung: 'Insurance', leasing: 'Leasing/rental', rueckruf: 'Recall letter', foto: 'Photo', sonstiges: 'Document' },
    CKIND: { leasing: 'Leasing', miete: 'Rental', finanzierung: 'Financing', versicherung: 'Insurance', wartung: 'Maintenance contract', sonstiges: 'Contract' },
    CLAIM: { gemeldet: 'reported', in_pruefung: 'under review', reguliert: 'settled', abgelehnt: 'rejected', zurueckgezogen: 'withdrawn' },
    DDOC: { fuehrerschein: 'Driving licence', fahrerkarte: 'Driver card', code95: 'Code 95 / training', unterweisung: 'Briefing', sonstiges: 'Proof' },
  },
};

const LOCALE = { de: 'de-DE', uk: 'uk-UA', en: 'en-GB' };
const empty = (v) => v === null || v === undefined || v === '';
// {name#Form1/Form2[/Form3]}: Wort in der Pluralform der Zahl `name` (de/en: eins/sonst; uk: one/few/many) – statt „Tag(en)“
const PH = /\{([a-z_]+)(?::(km)|\|([A-Z]+)|#([^{}]+))?\}/g;
const PL_ORDER = { uk: ['one', 'few', 'many'] };
const pluralWord = (v, forms, lang) => {
  const f = forms.split('/'); const order = PL_ORDER[lang] || ['one', 'other'];
  let c = 'other'; try { c = new Intl.PluralRules(LOCALE[lang] || 'de-DE').select(Number(v)); } catch { /* alte Umgebung */ }
  const i = order.indexOf(c); return f[i >= 0 ? i : f.length - 1] ?? f[f.length - 1];
};

// Datumswerte in Befunden kommen gemischt an: ISO „2027-01-05“ (Ablauf-/Vertragsdaten) oder deutsch „05.01.2027“ (ggf. mit Uhrzeit).
// Für die Anzeige (nicht für den gespeicherten deutschen Text) im Format der Sprache: DE/UK „05.01.2027“, EN „05/01/2027“ –
// wie die übrige Oberfläche (vorher z. B. „abgelaufen am 2027-01-05“ bzw. auf Englisch „on 05.01.2027“).
// Nur Platzhalter, die laut Vorlagen Datumswerte tragen (Teilenummern o. Ä. wie „12.34.5678“ bleiben unverändert)
export const DATE_ARGS = new Set(['date', 'due', 'end', 'eta', 'last', 'planned', 'hu', 'at', 'oon', 'by']);
export function localDateArg(v, lang) {
  if (typeof v !== 'string') return v;
  const sep = lang === 'en' ? '/' : '.';
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return [m[3], m[2], m[1]].join(sep);
  m = /^(\d{2})\.(\d{2})\.(\d{4})( \d{2}:\d{2})?$/.exec(v);
  if (m) return [m[1], m[2], m[3]].join(sep) + (m[4] || '');
  return v;
}

function fill(text, args, lang, dates = false) {
  return text.replace(PH, (_, name, fmt, list, forms) => {
    const v = args[name];
    if (empty(v)) return '';
    if (forms) return pluralWord(v, forms, lang);
    if (fmt === 'km') return Number(v).toLocaleString(LOCALE[lang] || 'de-DE');
    if (list) { const e = (FINDING_ENUMS[lang] || FINDING_ENUMS.de)[list] || {}; return e[v] ?? FINDING_ENUMS.de[list]?.[v] ?? String(v); }
    return String(dates && DATE_ARGS.has(name) ? localDateArg(v, lang) : v);
  });
}

// Text einer Vorlage in einer Sprache; null, wenn die Vorlage fehlt (Aufrufer nimmt dann den gespeicherten deutschen Text)
export function renderFindingMessage(key, args = {}, lang = 'de', { dates = false } = {}) {
  const tpl = (FINDING_MESSAGES[lang] && FINDING_MESSAGES[lang][key]) || null;
  if (!tpl) return null;
  const a = args || {};
  const withOptional = tpl.replace(/\[\[([^\[\]]*)\]\]/g, (_, inner) => {
    const names = [...inner.matchAll(PH)].map((m) => m[1]);
    return names.some((n) => empty(a[n])) ? '' : inner;
  });
  return fill(withOptional, a, lang, dates);
}

// Gespeicherte Form `message_args` (JSON-Text oder Objekt) → Text; Rückfall auf den deutschen Text des Befunds
export function findingMessage(stored, fallback, lang) {
  if (!stored) return fallback;
  let o = stored;
  if (typeof o === 'string') { try { o = JSON.parse(o); } catch { return fallback; } }
  if (!o || typeof o.k !== 'string') return fallback;
  return renderFindingMessage(o.k, o.a, lang, { dates: true }) ?? fallback;
}

// Server: Befund-Felder aus einer Vorlage – deutscher Text in `message` (Master, Integrations-API, Protokoll), Schlüssel + Werte
// in `message_args` für die Anzeige in der Sprache der Person. In src/ als `fm` importiert (Wächter-Test sucht `fm('…'`).
export const findingText = (k, a) => ({ message: renderFindingMessage(k, a, 'de'), message_args: JSON.stringify({ k, a }) });
