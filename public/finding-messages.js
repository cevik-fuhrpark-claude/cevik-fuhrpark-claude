// [CLAUDE] Meldungstexte der Agentenbefunde als Vorlagen (DE/UK/EN) – gemeinsam für Server (src/agent.js erzeugt daraus den
// deutschen Text in `message`) und Oberfläche (Management-Panel zeigt denselben Befund in der Sprache der Person).
// Gespeichert wird je Befund `message_args` = {"k": Vorlagenschlüssel, "a": {Werte}}. Fehlt eine Vorlage, gilt der deutsche Text.
// Platzhalter: {name} Wert unverändert · {name:km} Zahl mit Tausendertrennung der Sprache · {name|LISTE} Wert aus ENUMS[Sprache][LISTE]
// [[ … ]] optionaler Abschnitt: entfällt, wenn ein Platzhalter darin leer ist (null/undefined/''). Keine Verschachtelung.
// Werte, die Menschen eingegeben haben (Sperrgrund, Vermerk, Teilename), bleiben unübersetzt. Feste Wertelisten (Prüfart, Reifenposition,
// Einheit, Werkstatt-/Lagercode) übersetzt die Oberfläche vor dem Rendern (`fMsg` in public/app.js, 19.10.2026).
// Nur Daten und reine Funktionen, keine Abhängigkeiten.
export const FINDING_MESSAGES = {
  de: {
    NO_FLEET_RECIPIENT: 'Keine aktive Fuhrparkleitung mit Zugang in dieser Umgebung – Meldungen haben keinen Empfänger.',
    CASE_FOLLOWUP_DUE: '{label}: Wiedervorlage am {date}[[ – {note}]].',
    CASE_STALE: '{label}: {state|STALE} – letzte Änderung am {date} (Nachfassen nach {days} {days#Tag/Tagen} eingestellt).',
    CRITICAL_UNTRIAGED: '{label}: sicherheitsrelevante Meldung seit {at} nicht von der Fuhrparkleitung bestätigt.',
    TRIAGE_OVERDUE: '{label}: Erstbewertung überfällig (gemeldet {at}, Frist {sla} Min.).',
    TRIAGE_OPEN: '{label}: wartet auf Erstbewertung (seit {at}).',
    TRIAGE_OPEN_NOSLA: '{label}: wartet auf Erstbewertung (seit {at}; Frist nicht konfiguriert).',
    NO_WORKSHOP_RECIPIENT: '{label}: Werkstatt {site} hat keinen aktiven Benutzer – Auftrag kann nicht übernommen werden.',
    NO_WORKSHOP_RECIPIENT_ACKED: '{label}: Werkstatt {site} hat keinen aktiven Benutzer mehr – der übernommene Auftrag wird dort nicht weiterbearbeitet, Hinweise an die Werkstatt erreichen niemanden.',
    WORKSHOP_ACK_MISSING: '{label}: freigegebener Auftrag seit {at} nicht von Werkstatt {site} übernommen.',
    WORKSHOP_ACK_PENDING: '{label}: wartet auf Übernahme durch Werkstatt {site} (seit {at}).',
    WORKSHOP_ACK_PENDING_NOSLA: '{label}: wartet auf Übernahme durch Werkstatt {site} (seit {at}; Frist nicht konfiguriert).',
    WAITING_PARTS: '{label}: Reparatur wartet auf Teile (seit {at})[[ – Liefertermin laut Werkstatt {eta}]].',
    WAITING_PARTS_LATE: '{label}: Reparatur wartet auf Teile (seit {at}) – Liefertermin {eta} überschritten.',
    COST_APPROVAL_PENDING: '{label}: Kosten-Freigabegrenze überschritten – Kostenfreigabe offen (seit {at}).',
    QC_PENDING: '{label}: Reparatur gemeldet – Abschlusskontrolle und technische Freigabe durch einen Menschen offen.',
    SAFETY_OPEN_ITEMS: '{label}: {n} sicherheitsrelevante {n#Restarbeit/Restarbeiten} offen.',
    VEHICLE_LOCKED: '{plate}[[ (Anhänger von {truck})]]: gesperrt ({reason}) – nicht disponieren.',
    VEHICLE_LOCKED_DEFAULT: '{plate}[[ (Anhänger von {truck})]]: gesperrt (Sicherheitsprüfung) – nicht disponieren.',
    VEHICLE_USED_WHILE_LOCKED: '{plate}: gesperrt seit {at}, trotzdem genutzt[[ – km {km_from:km} → {km_to:km} ({src|KMSRC}, {date})]][[ – {n} {n#Abfahrtskontrolle/Abfahrtskontrollen} seit der Sperre, zuletzt {last}]].',
    VEHICLE_USED_WHILE_LOCKED_TRAILER: '{plate} (Anhänger von {truck}): gesperrt seit {at}, Zugmaschine {truck} seitdem genutzt[[ – km {km_from:km} → {km_to:km} ({src|KMSRC}, {date})]][[ – {n} {n#Abfahrtskontrolle/Abfahrtskontrollen}, zuletzt {last}]].',
    RELEASED_WITH_OPEN_ITEMS: '{label}: freigegeben mit {n} {n#offener nicht sicherheitsrelevanter Restarbeit/offenen nicht sicherheitsrelevanten Restarbeiten}.',
    URGENT_NOT_DELIVERED_BULK: 'Dringende Benachrichtigungen an dieselben Empfänger nicht per Push zugestellt (kein aktiviertes Gerät oder Fehler) – Nachrichten: {k}, Empfänger: {n}.[[ Betroffen: {labels}.]][[ Empfänger: {who|ROLE}.]]',
    URGENT_NOT_DELIVERED: 'Dringende Benachrichtigung an {n} Empfänger nicht per Push zugestellt (kein aktiviertes Gerät oder Fehler).[[ Empfänger: {who|ROLE}.]]',
    COSTS_UNVALUED_RATE: '{label}: Kosten unvollständig bewertet (kein Stundensatz).',
    COSTS_UNVALUED_PARTS: '{label}: Kosten unvollständig bewertet ({n} {n#Teil/Teile} ohne Preis).',
    COSTS_UNVALUED_BOTH: '{label}: Kosten unvollständig bewertet (kein Stundensatz, {n} {n#Teil/Teile} ohne Preis).',
    COSTS_UNVALUED_EXT: '{label}: Kosten unvollständig bewertet ({n} {n#Fremdleistung/Fremdleistungen} ohne Betrag).',
    COSTS_UNVALUED_ITEMS: '{label}: Kosten unvollständig bewertet ({n} {n#Position/Positionen} ohne Betrag bzw. Stundensatz).',
    MAINT_KM_OVERDUE: '{plate}: {kind} war bei {due:km} km fällig – Stand {km:km} km (abgelesen {date}).',
    MAINT_KM_DUE: '{plate}: {kind} fällig bei {due:km} km – Stand {km:km} km (noch {rest:km} km).',
    MAINT_KM_UNCLEAR: '{plate}: {kind} – Fälligkeit nach km ungeklärt, km-Stand am {date} gesunken (z. B. Tachotausch).',
    MAINT_DATE_OVERDUE: '{plate}: {kind} seit {days} {days#Tag/Tagen} überfällig (fällig {due}).',
    MAINT_DATE_DUE: '{plate}: {kind} fällig am {due} (in {days} {days#Tag/Tagen}).',
    HUSP_OVERDUE: '{plate}: {kind} überfällig (fällig bis Ende {due}[[, 6 Monate nach HU {hu}]]).',
    HUSP_DUE: '{plate}: {kind} fällig bis Ende {due}[[ (Werkstatttermin geplant {planned})]].',
    HUSP_OVERDUE_DAY: '{plate}: {kind} überfällig (fällig bis {due}).',
    HUSP_DUE_DAY: '{plate}: {kind} fällig bis {due}[[ (Werkstatttermin geplant {planned})]].',
    INSPECTION_UNCLEAR: '{plate}: {kind}-Frist ungeklärt – {note}',
    DOCUMENT_EXPIRED: '{plate}: {doc|DOC}[[ „{topic}“]] abgelaufen am {date}.',
    DOCUMENT_EXPIRES_SOON: '{plate}: {doc|DOC}[[ „{topic}“]] gültig bis {date} (in {days} {days#Tag/Tagen}).',
    INSPECTION_DEFECTS_NO_CASE: '{plate}: {kind} vom {date} mit Ergebnis „{res|RES}“ – seitdem kein Vorgang/Auftrag.',
    REINSPECTION_PENDING: '{plate}: Mängel aus {kind} vom {date} ({res|RES}) laut Auftrag {case_no} beseitigt – Nachprüfung noch nicht eingetragen.',
    INSPECTION_RESULT_MISSING: '{plate}: {kind} vom {date} ohne eingetragenes Prüfergebnis.',
    TIRE_TREAD: '{plate} {pos}: Profiltiefe {mm} mm (Grenze {limit} mm, gemessen {date}).',
    STOCK_ORDER_OVERDUE: 'Lager {site}: {name}[[ ({pn})]] – Liefertermin überschritten.[[ Bestellt {oq} {unit} am {oon}, Liefertermin laut Lieferant {eta}.]] Bestand {stock} {unit}, Mindestbestand {min}.',
    STOCK_BELOW_MIN: 'Lager {site}: {name}[[ ({pn})]] – Bestand {stock} {unit}, Mindestbestand {min}.',
    STOCK_BELOW_MIN_ORD: 'Lager {site}: {name}[[ ({pn})]] – Bestand {stock} {unit}, Mindestbestand {min}. Bestellt {oq} {unit} am {oon}[[, Liefertermin laut Lieferant {eta}]]. Noch zu bestellen: {open} {unit}.',
    CONTRACT_ENDED: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) endete laut Eintrag am {end} – in der App noch nicht als beendet markiert[[ – offene Vorgänge am Fahrzeug: {open}]][[ – offene Restarbeiten nach Freigabe: {items}]].',
    CONTRACT_ENDS_SOON: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) endet am {end} (in {days} {days#Tag/Tagen})[[ – offene Vorgänge am Fahrzeug: {open}]][[ – offene Restarbeiten nach Freigabe: {items}]].',
    CONTRACT_NOTICE_DUE: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) – Kündigung laut Vertrag spätestens bis {by} ({months} {months#Monat/Monate} vor Ende {end}).',
    CONTRACT_KM_OVER: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) – km-Kontingent {allow:km} km überschritten (seit Übernahme {driven:km} km).',
    CONTRACT_KM_FORECAST: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) – bei gleicher Fahrleistung voraussichtlich {fc:km} km bis Vertragsende (Kontingent {allow:km} km; Prognose).',
    CONTRACT_KM_UNCLEAR: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) – km-Kontingent nicht berechenbar: Kilometerzähler zurückgesprungen[[ (Tachotausch?) am {at}]]; km bei Übernahme prüfen und bestätigen.',
    CONTRACT_KM_BELOW_START: '{plate}: {ckind|CKIND} ({partner}[[, Nr. {no}]]) – km-Stand {km:km} km liegt unter „km bei Übernahme“ {start:km} km; Kontingent nicht berechenbar. Übernahme-km laut Beleg bzw. km-Stand prüfen.',
    CLAIM_OPEN_LONG: '{label}: Versicherungsfall bei {insurer}[[, Schaden-Nr. {claim_no}]] gemeldet am {date}, Status „{st|CLAIM}“ (Nachfassen nach {days} {days#Tag/Tagen} eingestellt).',
    DRIVER_DOC_EXPIRED: 'Fahrer {name}: {ddoc|DDOC}[[ „{topic}“]] abgelaufen (gültig bis {date}).',
    DRIVER_DOC_EXPIRES_SOON: 'Fahrer {name}: {ddoc|DDOC}[[ „{topic}“]] läuft am {date} ab (in {days} {days#Tag/Tagen}).',
    LICENSE_CHECK_DUE: 'Fahrer {name}: Führerscheinkontrolle fällig (letzte {last}).',
    LICENSE_CHECK_DUE_SOON: 'Fahrer {name}: Führerscheinkontrolle fällig am {date} (in {days} {days#Tag/Tagen}; letzte {last}).',
    LICENSE_CHECK_FAILED: 'Fahrer {name}: letzte Führerscheinkontrolle nicht in Ordnung ({last}).',
    TACHO_CARD_OVERDUE: 'Fahrer {name}: Fahrerkarte überfällig – spätestens am {due} auszulesen (letzte Auslesung {last}; Frist 28 Tage, FPersV § 2 Abs. 5).',
    TACHO_CARD_DUE: 'Fahrer {name}: Fahrerkarte spätestens am {due} auslesen.',
    TACHO_VU_OVERDUE: '{plate}: Massenspeicher überfällig – spätestens am {due} auszulesen (letzte Auslesung {last}; Frist 90 Tage, FPersV § 2 Abs. 5).',
    TACHO_VU_DUE: '{plate}: Massenspeicher spätestens am {due} auslesen.',
    FINE_OVERDUE: '{label}: Antwortfrist {due} überschritten.',
    FINE_DUE_SOON: '{label}: Antwortfrist {due} (in {days} {days#Tag/Tagen}).',
    FINE_DUE_TODAY: '{label}: Antwortfrist {due} (heute fällig).',
    FINE_VEHICLE_MATCHABLE: '{label}: Kennzeichen {plate} ist jetzt im Fahrzeugstamm eindeutig – Fahrzeug noch nicht übernommen.',
    FINE_VEHICLE_TRAILER: '{label}: Kennzeichen {plate} steht nur als Anhänger von {truck} in der Stammliste – kein Fahrzeug zugeordnet.',
    FINE_VEHICLE_UNKNOWN: '{label}: Kennzeichen {plate} keinem Fahrzeug zugeordnet.',
    FINE_VEHICLE_AMBIGUOUS: '{label}: Kennzeichen {plate} steht an mehreren aktiven Fahrzeugen – nicht zugeordnet.',
    FINE_DRIVER_OPEN: '{label}: Fahrer zur Tatzeit noch nicht ermittelt.',
    FINE_DRIVING_BAN: '{label}: Fahrverbot laut Schreiben ({n} {n#Monat/Monate}).',
    FINE_DRIVER_DISPUTED: '{label}: Der ermittelte Fahrer widerspricht (nicht gefahren) – Ermittlung prüfen.',
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
    NO_WORKSHOP_RECIPIENT_ACKED: '{label}: майстерня {site} більше не має активного користувача – прийняте замовлення там не опрацьовується, повідомлення для майстерні нікого не досягають.',
    WORKSHOP_ACK_MISSING: '{label}: передане замовлення з {at} не прийняте майстернею {site}.',
    WORKSHOP_ACK_PENDING: '{label}: очікує прийняття майстернею {site} (з {at}).',
    WORKSHOP_ACK_PENDING_NOSLA: '{label}: очікує прийняття майстернею {site} (з {at}; строк не налаштовано).',
    WAITING_PARTS: '{label}: ремонт очікує запчастин (з {at})[[ – термін постачання за даними майстерні {eta}]].',
    WAITING_PARTS_LATE: '{label}: ремонт очікує запчастин (з {at}) – термін постачання {eta} минув.',
    COST_APPROVAL_PENDING: '{label}: перевищено межу погодження витрат – погодження витрат відкрите (з {at}).',
    QC_PENDING: '{label}: ремонт завершено – заключна перевірка і технічний допуск людиною відкриті.',
    SAFETY_OPEN_ITEMS: '{label}: відкритих залишкових робіт, важливих для безпеки: {n}.',
    VEHICLE_LOCKED: '{plate}[[ (причіп тягача {truck})]]: заблоковано ({reason}) – не планувати.',
    VEHICLE_LOCKED_DEFAULT: '{plate}[[ (причіп тягача {truck})]]: заблоковано (перевірка безпеки) – не планувати.',
    VEHICLE_USED_WHILE_LOCKED: '{plate}: заблоковано з {at}, але використовується[[ – км {km_from:km} → {km_to:km} ({src|KMSRC}, {date})]][[ – {n} {n#перевірка перед виїздом/перевірки перед виїздом/перевірок перед виїздом} після блокування, остання {last}]].',
    VEHICLE_USED_WHILE_LOCKED_TRAILER: '{plate} (причіп тягача {truck}): заблоковано з {at}, тягач {truck} відтоді використовується[[ – км {km_from:km} → {km_to:km} ({src|KMSRC}, {date})]][[ – {n} {n#перевірка перед виїздом/перевірки перед виїздом/перевірок перед виїздом}, остання {last}]].',
    RELEASED_WITH_OPEN_ITEMS: '{label}: допущено з відкритими залишковими роботами, не важливими для безпеки: {n}.',
    URGENT_NOT_DELIVERED_BULK: 'Термінові сповіщення тим самим отримувачам не доставлено push-повідомленням (немає активованого пристрою або помилка) – повідомлень: {k}, отримувачів: {n}.[[ Стосується: {labels}.]][[ Отримувачі: {who|ROLE}.]]',
    URGENT_NOT_DELIVERED: 'Термінове сповіщення для {n} {n#отримувача/отримувачів/отримувачів} не доставлено push-повідомленням (немає активованого пристрою або помилка).[[ {n#Отримувач/Отримувачі/Отримувачі}: {who|ROLE}.]]',
    COSTS_UNVALUED_RATE: '{label}: витрати оцінено не повністю (немає погодинної ставки).',
    COSTS_UNVALUED_PARTS: '{label}: витрати оцінено не повністю (запчастин без ціни: {n}).',
    COSTS_UNVALUED_BOTH: '{label}: витрати оцінено не повністю (немає погодинної ставки, запчастин без ціни: {n}).',
    COSTS_UNVALUED_EXT: '{label}: витрати оцінено не повністю (сторонніх робіт без суми: {n}).',
    COSTS_UNVALUED_ITEMS: '{label}: витрати оцінено не повністю (позицій без суми чи погодинної ставки: {n}).',
    MAINT_KM_OVERDUE: '{plate}: {kind} мав бути на {due:km} км – пробіг {km:km} км (зчитано {date}).',
    MAINT_KM_DUE: '{plate}: {kind} на {due:km} км – пробіг {km:km} км (залишилось {rest:km} км).',
    MAINT_KM_UNCLEAR: '{plate}: {kind} – строк за пробігом не з’ясовано, {date} показник пробігу зменшився (напр. заміна тахографа).',
    MAINT_DATE_OVERDUE: '{plate}: {kind} прострочено на {days} дн. (строк {due}).',
    MAINT_DATE_DUE: '{plate}: {kind} до {due} (через {days} дн.).',
    HUSP_OVERDUE: '{plate}: {kind} прострочено (строк до кінця {due}[[, 6 місяців після HU {hu}]]).',
    HUSP_DUE: '{plate}: {kind} до кінця {due}[[ (запланований візит до майстерні {planned})]].',
    HUSP_OVERDUE_DAY: '{plate}: {kind} прострочено (строк до {due}).',
    HUSP_DUE_DAY: '{plate}: {kind} до {due}[[ (запланований візит до майстерні {planned})]].',
    INSPECTION_UNCLEAR: '{plate}: строк {kind} не з’ясовано – {note}',
    DOCUMENT_EXPIRED: '{plate}: {doc|DOC}[[ «{topic}»]] – строк дії минув {date}.',
    DOCUMENT_EXPIRES_SOON: '{plate}: {doc|DOC}[[ «{topic}»]] дійсний до {date} (через {days} дн.).',
    INSPECTION_DEFECTS_NO_CASE: '{plate}: {kind} від {date} з результатом «{res|RES}» – відтоді немає заявки/замовлення.',
    REINSPECTION_PENDING: '{plate}: дефекти з {kind} від {date} ({res|RES}) усунуто за замовленням {case_no} – повторний огляд ще не внесено.',
    INSPECTION_RESULT_MISSING: '{plate}: {kind} від {date} без внесеного результату.',
    TIRE_TREAD: '{plate} {pos}: глибина протектора {mm} мм (межа {limit} мм, виміряно {date}).',
    STOCK_ORDER_OVERDUE: 'Склад {site}: {name}[[ ({pn})]] – строк поставки минув.[[ Замовлено {oq} {unit} {oon}, строк поставки за постачальником {eta}.]] Залишок {stock} {unit}, мінімальний запас {min}.',
    STOCK_BELOW_MIN: 'Склад {site}: {name}[[ ({pn})]] – залишок {stock} {unit}, мінімальний запас {min}.',
    STOCK_BELOW_MIN_ORD: 'Склад {site}: {name}[[ ({pn})]] – залишок {stock} {unit}, мінімальний запас {min}. Замовлено {oq} {unit} {oon}[[, строк поставки за постачальником {eta}]]. Ще замовити: {open} {unit}.',
    CONTRACT_ENDED: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) закінчився за записом {end} – у застосунку ще не позначений як завершений[[ – відкриті справи щодо транспорту: {open}]][[ – відкриті залишкові роботи після допуску: {items}]].',
    CONTRACT_ENDS_SOON: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) закінчується {end} (через {days} дн.)[[ – відкриті справи щодо транспорту: {open}]][[ – відкриті залишкові роботи після допуску: {items}]].',
    CONTRACT_NOTICE_DUE: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) – розірвання за договором не пізніше {by} ({months} міс. до кінця {end}).',
    CONTRACT_KM_OVER: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) – ліміт пробігу {allow:km} км перевищено (з моменту отримання {driven:km} км).',
    CONTRACT_KM_FORECAST: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) – за такого ж пробігу орієнтовно {fc:km} км до кінця договору (ліміт {allow:km} км; прогноз).',
    CONTRACT_KM_UNCLEAR: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) – ліміт пробігу неможливо розрахувати: одометр скинуто[[ (заміна тахографа?) {at}]]; перевірте й підтвердіть пробіг на момент отримання.',
    CONTRACT_KM_BELOW_START: '{plate}: {ckind|CKIND} ({partner}[[, № {no}]]) – пробіг {km:km} km менший за «пробіг при прийнятті» {start:km} km; ліміт неможливо розрахувати. Перевірте пробіг при прийнятті за документом або показ одометра.',
    CLAIM_OPEN_LONG: '{label}: страховий випадок у {insurer}[[, № збитку {claim_no}]] повідомлено {date}, статус «{st|CLAIM}» (нагадування через {days} дн. налаштовано).',
    DRIVER_DOC_EXPIRED: 'Водій {name}: {ddoc|DDOC}[[ «{topic}»]] – строк дії минув (дійсний до {date}).',
    DRIVER_DOC_EXPIRES_SOON: 'Водій {name}: {ddoc|DDOC}[[ «{topic}»]] спливає {date} (через {days} дн.).',
    LICENSE_CHECK_DUE: 'Водій {name}: потрібна перевірка посвідчення (остання {last}).',
    LICENSE_CHECK_DUE_SOON: 'Водій {name}: перевірка посвідчення {date} (через {days} дн.; остання {last}).',
    LICENSE_CHECK_FAILED: 'Водій {name}: остання перевірка посвідчення не в порядку ({last}).',
    TACHO_CARD_OVERDUE: 'Водій {name}: зчитування картки водія прострочено – мало бути не пізніше {due} (останнє зчитування {last}; строк 28 днів, FPersV § 2 абз. 5).',
    TACHO_CARD_DUE: 'Водій {name}: зчитати картку водія не пізніше {due}.',
    TACHO_VU_OVERDUE: '{plate}: зчитування пам’яті тахографа прострочено – мало бути не пізніше {due} (останнє зчитування {last}; строк 90 днів, FPersV § 2 абз. 5).',
    TACHO_VU_DUE: '{plate}: зчитати пам’ять тахографа не пізніше {due}.',
    FINE_OVERDUE: '{label}: строк відповіді {due} минув.',
    FINE_DUE_SOON: '{label}: строк відповіді {due} (через {days} дн.).',
    FINE_DUE_TODAY: '{label}: строк відповіді {due} (сьогодні).',
    FINE_VEHICLE_MATCHABLE: '{label}: номерний знак {plate} тепер однозначний у реєстрі транспорту – транспорт ще не прив’язано.',
    FINE_VEHICLE_TRAILER: '{label}: номерний знак {plate} є в реєстрі лише як причіп {truck} – транспорт не прив’язано.',
    FINE_VEHICLE_UNKNOWN: '{label}: номерний знак {plate} не прив’язаний до жодного транспорту.',
    FINE_VEHICLE_AMBIGUOUS: '{label}: номерний знак {plate} є в кількох активних транспортних засобів – не прив’язано.',
    FINE_DRIVER_OPEN: '{label}: водія на момент порушення ще не встановлено.',
    FINE_DRIVING_BAN: '{label}: заборона керування згідно з листом ({n} {n#місяць/місяці/місяців}).',
    FINE_DRIVER_DISPUTED: '{label}: визначений водій заперечує (не керував) – перевірте встановлення водія.',
  },
  en: {
    NO_FLEET_RECIPIENT: 'No active fleet manager with access in this environment – notifications have no recipient.',
    CASE_FOLLOWUP_DUE: '{label}: follow-up on {date}[[ – {note}]].',
    CASE_STALE: '{label}: {state|STALE} – last change on {date} (follow-up after {days} {days#day/days} configured).',
    CRITICAL_UNTRIAGED: '{label}: safety-relevant report not confirmed by fleet management since {at}.',
    TRIAGE_OVERDUE: '{label}: initial assessment overdue (reported {at}, deadline {sla} min).',
    TRIAGE_OPEN: '{label}: awaiting initial assessment (since {at}).',
    TRIAGE_OPEN_NOSLA: '{label}: awaiting initial assessment (since {at}; no deadline configured).',
    NO_WORKSHOP_RECIPIENT: '{label}: workshop {site} has no active user – the order cannot be accepted.',
    NO_WORKSHOP_RECIPIENT_ACKED: '{label}: workshop {site} no longer has an active user – the accepted order is not being worked on there, notes to the workshop reach no one.',
    WORKSHOP_ACK_MISSING: '{label}: released order not accepted by workshop {site} since {at}.',
    WORKSHOP_ACK_PENDING: '{label}: awaiting acceptance by workshop {site} (since {at}).',
    WORKSHOP_ACK_PENDING_NOSLA: '{label}: awaiting acceptance by workshop {site} (since {at}; no deadline configured).',
    WAITING_PARTS: '{label}: repair waiting for parts (since {at})[[ – delivery date per workshop {eta}]].',
    WAITING_PARTS_LATE: '{label}: repair waiting for parts (since {at}) – delivery date {eta} passed.',
    COST_APPROVAL_PENDING: '{label}: cost approval limit exceeded – cost approval pending (since {at}).',
    QC_PENDING: '{label}: repair reported – final check and technical release by a person pending.',
    SAFETY_OPEN_ITEMS: '{label}: {n} safety-relevant remaining {n#job/jobs} open.',
    VEHICLE_LOCKED: '{plate}[[ (trailer of {truck})]]: locked ({reason}) – do not dispatch.',
    VEHICLE_LOCKED_DEFAULT: '{plate}[[ (trailer of {truck})]]: locked (safety check) – do not dispatch.',
    VEHICLE_USED_WHILE_LOCKED: '{plate}: locked since {at}, but used[[ – km {km_from:km} → {km_to:km} ({src|KMSRC}, {date})]][[ – {n} {n#departure check/departure checks} since the lock, last {last}]].',
    VEHICLE_USED_WHILE_LOCKED_TRAILER: '{plate} (trailer of {truck}): locked since {at}, tractor {truck} used since then[[ – km {km_from:km} → {km_to:km} ({src|KMSRC}, {date})]][[ – {n} {n#departure check/departure checks}, last {last}]].',
    RELEASED_WITH_OPEN_ITEMS: '{label}: released with {n} open non-safety-relevant remaining {n#job/jobs}.',
    URGENT_NOT_DELIVERED_BULK: 'Urgent notifications to the same recipients not delivered by push (no enabled device or error) – notifications: {k}, recipients: {n}.[[ Affected: {labels}.]][[ Recipients: {who|ROLE}.]]',
    URGENT_NOT_DELIVERED: 'Urgent notification to {n} {n#recipient/recipients} not delivered by push (no enabled device or error).[[ {n#Recipient/Recipients}: {who|ROLE}.]]',
    COSTS_UNVALUED_RATE: '{label}: costs not fully valued (no hourly rate).',
    COSTS_UNVALUED_PARTS: '{label}: costs not fully valued ({n} {n#part/parts} without price).',
    COSTS_UNVALUED_BOTH: '{label}: costs not fully valued (no hourly rate, {n} {n#part/parts} without price).',
    COSTS_UNVALUED_EXT: '{label}: costs not fully valued ({n} {n#external service/external services} without amount).',
    COSTS_UNVALUED_ITEMS: '{label}: costs not fully valued ({n} {n#item/items} without amount or hourly rate).',
    MAINT_KM_OVERDUE: '{plate}: {kind} was due at {due:km} km – reading {km:km} km (read on {date}).',
    MAINT_KM_DUE: '{plate}: {kind} due at {due:km} km – reading {km:km} km ({rest:km} km left).',
    MAINT_KM_UNCLEAR: '{plate}: {kind} – mileage due unclear, odometer reading dropped on {date} (e.g. odometer replaced).',
    MAINT_DATE_OVERDUE: '{plate}: {kind} overdue for {days} {days#day/days} (due {due}).',
    MAINT_DATE_DUE: '{plate}: {kind} due on {due} (in {days} {days#day/days}).',
    HUSP_OVERDUE: '{plate}: {kind} overdue (due by end of {due}[[, 6 months after HU {hu}]]).',
    HUSP_DUE: '{plate}: {kind} due by end of {due}[[ (workshop appointment planned {planned})]].',
    HUSP_OVERDUE_DAY: '{plate}: {kind} overdue (due by {due}).',
    HUSP_DUE_DAY: '{plate}: {kind} due by {due}[[ (workshop appointment planned {planned})]].',
    INSPECTION_UNCLEAR: '{plate}: {kind} deadline unclear – {note}',
    DOCUMENT_EXPIRED: '{plate}: {doc|DOC}[[ "{topic}"]] expired on {date}.',
    DOCUMENT_EXPIRES_SOON: '{plate}: {doc|DOC}[[ "{topic}"]] valid until {date} (in {days} {days#day/days}).',
    INSPECTION_DEFECTS_NO_CASE: '{plate}: {kind} on {date} with result “{res|RES}” – no case/order since.',
    REINSPECTION_PENDING: '{plate}: defects from {kind} on {date} ({res|RES}) fixed according to order {case_no} – re-inspection not yet recorded.',
    INSPECTION_RESULT_MISSING: '{plate}: {kind} on {date} without a recorded result.',
    TIRE_TREAD: '{plate} {pos}: tread depth {mm} mm (limit {limit} mm, measured {date}).',
    STOCK_ORDER_OVERDUE: 'Store {site}: {name}[[ ({pn})]] – delivery date passed.[[ Ordered {oq} {unit} on {oon}, delivery date per supplier {eta}.]] Stock {stock} {unit}, minimum stock {min}.',
    STOCK_BELOW_MIN: 'Store {site}: {name}[[ ({pn})]] – stock {stock} {unit}, minimum stock {min}.',
    STOCK_BELOW_MIN_ORD: 'Store {site}: {name}[[ ({pn})]] – stock {stock} {unit}, minimum stock {min}. Ordered {oq} {unit} on {oon}[[, delivery date per supplier {eta}]]. Still to order: {open} {unit}.',
    CONTRACT_ENDED: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) ended on {end} according to the record – not yet marked as ended in the app[[ – open cases on the vehicle: {open}]][[ – open remaining jobs after release: {items}]].',
    CONTRACT_ENDS_SOON: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) ends on {end} (in {days} {days#day/days})[[ – open cases on the vehicle: {open}]][[ – open remaining jobs after release: {items}]].',
    CONTRACT_NOTICE_DUE: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) – notice per contract by {by} at the latest ({months} {months#month/months} before end {end}).',
    CONTRACT_KM_OVER: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) – mileage allowance {allow:km} km exceeded ({driven:km} km since handover).',
    CONTRACT_KM_FORECAST: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) – at the same usage approx. {fc:km} km by contract end (allowance {allow:km} km; forecast).',
    CONTRACT_KM_UNCLEAR: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) – mileage allowance cannot be calculated: odometer went backwards[[ (tachograph replaced?) on {at}]]; check and confirm the mileage at handover.',
    CONTRACT_KM_BELOW_START: '{plate}: {ckind|CKIND} ({partner}[[, no. {no}]]) – odometer {km:km} km is below the “mileage at handover” {start:km} km; allowance cannot be calculated. Check the handover mileage against the document or the odometer reading.',
    CLAIM_OPEN_LONG: '{label}: insurance claim with {insurer}[[, claim no. {claim_no}]] reported on {date}, status “{st|CLAIM}” (follow-up after {days} {days#day/days} configured).',
    DRIVER_DOC_EXPIRED: 'Driver {name}: {ddoc|DDOC}[[ "{topic}"]] expired (valid until {date}).',
    DRIVER_DOC_EXPIRES_SOON: 'Driver {name}: {ddoc|DDOC}[[ "{topic}"]] expires on {date} (in {days} {days#day/days}).',
    LICENSE_CHECK_DUE: 'Driver {name}: licence check due (last {last}).',
    LICENSE_CHECK_DUE_SOON: 'Driver {name}: licence check due on {date} (in {days} {days#day/days}; last {last}).',
    LICENSE_CHECK_FAILED: 'Driver {name}: last licence check not OK ({last}).',
    TACHO_CARD_OVERDUE: 'Driver {name}: driver card download overdue – due by {due} at the latest (last download {last}; limit 28 days, FPersV § 2 (5)).',
    TACHO_CARD_DUE: 'Driver {name}: download driver card by {due} at the latest.',
    TACHO_VU_OVERDUE: '{plate}: vehicle unit download overdue – due by {due} at the latest (last download {last}; limit 90 days, FPersV § 2 (5)).',
    TACHO_VU_DUE: '{plate}: download vehicle unit by {due} at the latest.',
    FINE_OVERDUE: '{label}: response deadline {due} passed.',
    FINE_DUE_SOON: '{label}: response deadline {due} (in {days} {days#day/days}).',
    FINE_DUE_TODAY: '{label}: response deadline {due} (due today).',
    FINE_VEHICLE_MATCHABLE: '{label}: licence plate {plate} is now unique in the vehicle master data – vehicle not yet assigned.',
    FINE_VEHICLE_TRAILER: '{label}: licence plate {plate} is only listed as the trailer of {truck} – no vehicle assigned.',
    FINE_VEHICLE_UNKNOWN: '{label}: licence plate {plate} not assigned to any vehicle.',
    FINE_VEHICLE_AMBIGUOUS: '{label}: licence plate {plate} is on several active vehicles – not assigned.',
    FINE_DRIVER_OPEN: '{label}: driver at the time of the offence not yet identified.',
    FINE_DRIVING_BAN: '{label}: driving ban according to the letter ({n} {n#month/months}).',
    FINE_DRIVER_DISPUTED: '{label}: the identified driver objects (did not drive) – check the identification.',
  },
};

// Feste Wertelisten (Schlüssel aus der Datenbank → Text je Sprache)
export const FINDING_ENUMS = {
  de: {
    STALE: { gemeldet: 'bewertet, nicht weitergeleitet', werkstatt_freigegeben: 'von der Werkstatt übernommen, Reparatur nicht begonnen', in_reparatur: 'in Reparatur', wartet_teile: 'wartet auf Teile' },
    RES: { erhebliche_maengel: 'erhebliche Mängel', gefaehrliche_maengel: 'gefährliche Mängel', verkehrsunsicher: 'verkehrsunsicher' },
    DOC: { zulassung: 'Zulassung', pruefbericht: 'Prüfbericht', rechnung: 'Rechnung', versicherung: 'Versicherung', leasing: 'Leasing/Miete', rueckruf: 'Rückrufschreiben', foto: 'Foto', sonstiges: 'Dokument' },
    CKIND: { leasing: 'Leasing', miete: 'Miete', finanzierung: 'Finanzierung', versicherung: 'Versicherung', wartung: 'Wartungsvertrag', sonstiges: 'Vertrag' },
    CLAIM: { gemeldet: 'gemeldet', in_pruefung: 'in Prüfung', reguliert: 'reguliert', abgelehnt: 'abgelehnt', zurueckgezogen: 'zurückgezogen' },
    DDOC: { fuehrerschein: 'Führerschein', fahrerkarte: 'Fahrerkarte', code95: 'Code 95 / Weiterbildung', unterweisung: 'Unterweisung', sonstiges: 'Nachweis' },
    KMSRC: { telematik: 'Telematik', kontrolle: 'Abfahrtskontrolle', manuell: 'Eingabe' },
    ROLE: { owner: 'Inhaber', fleet: 'Fuhrparkleitung', workshop: 'Werkstatt', dispatch: 'Disposition', driver: 'Fahrer', viewer: 'Leser' },
  },
  uk: {
    STALE: { gemeldet: 'оцінено, не передано далі', werkstatt_freigegeben: 'прийнято майстернею, ремонт не розпочато', in_reparatur: 'у ремонті', wartet_teile: 'очікує запчастин' },
    RES: { erhebliche_maengel: 'значні дефекти', gefaehrliche_maengel: 'небезпечні дефекти', verkehrsunsicher: 'небезпечний для руху' },
    DOC: { zulassung: 'Реєстрація', pruefbericht: 'Протокол огляду', rechnung: 'Рахунок', versicherung: 'Страхування', leasing: 'Лізинг/оренда', rueckruf: 'Лист про відкликання', foto: 'Фото', sonstiges: 'Документ' },
    CKIND: { leasing: 'Лізинг', miete: 'Оренда', finanzierung: 'Фінансування', versicherung: 'Страхування', wartung: 'Договір обслуговування', sonstiges: 'Договір' },
    CLAIM: { gemeldet: 'повідомлено', in_pruefung: 'на розгляді', reguliert: 'врегульовано', abgelehnt: 'відхилено', zurueckgezogen: 'відкликано' },
    DDOC: { fuehrerschein: 'Посвідчення водія', fahrerkarte: 'Картка водія', code95: 'Код 95 / підвищення кваліфікації', unterweisung: 'Інструктаж', sonstiges: 'Підтвердження' },
    KMSRC: { telematik: 'телематика', kontrolle: 'перевірка перед виїздом', manuell: 'введення' },
    ROLE: { owner: 'Власник', fleet: 'Керівник автопарку', workshop: 'Майстерня', dispatch: 'Диспетчер', driver: 'Водій', viewer: 'Перегляд' },
  },
  en: {
    STALE: { gemeldet: 'assessed, not forwarded', werkstatt_freigegeben: 'accepted by the workshop, repair not started', in_reparatur: 'in repair', wartet_teile: 'waiting for parts' },
    RES: { erhebliche_maengel: 'major defects', gefaehrliche_maengel: 'dangerous defects', verkehrsunsicher: 'unroadworthy' },
    DOC: { zulassung: 'Registration', pruefbericht: 'Inspection report', rechnung: 'Invoice', versicherung: 'Insurance', leasing: 'Leasing/rental', rueckruf: 'Recall letter', foto: 'Photo', sonstiges: 'Document' },
    CKIND: { leasing: 'Leasing', miete: 'Rental', finanzierung: 'Financing', versicherung: 'Insurance', wartung: 'Maintenance contract', sonstiges: 'Contract' },
    CLAIM: { gemeldet: 'reported', in_pruefung: 'under review', reguliert: 'settled', abgelehnt: 'rejected', zurueckgezogen: 'withdrawn' },
    DDOC: { fuehrerschein: 'Driving licence', fahrerkarte: 'Driver card', code95: 'Code 95 / training', unterweisung: 'Briefing', sonstiges: 'Proof' },
    KMSRC: { telematik: 'telematics', kontrolle: 'departure check', manuell: 'manual entry' },
    ROLE: { owner: 'Owner', fleet: 'Fleet manager', workshop: 'Workshop', dispatch: 'Dispatch', driver: 'Driver', viewer: 'Viewer' },
  },
};

const LOCALE = { de: 'de-DE', uk: 'uk-UA', en: 'en-GB' };
const empty = (v) => v === null || v === undefined || v === '';
// {name#Form1/Form2[/Form3]}: Wort in der Pluralform der Zahl `name` (de/en: eins/sonst; uk: one/few/many) – statt „Tag(en)“
const PH = /\{([a-z_]+)(?::(km)|\|([A-Z]+)|#([^{}]+))?\}/g;
const PL_ORDER = { uk: ['one', 'few', 'many'] };
// Intl-Objekte je Sprache zwischengespeichert (22.10.2026: neue PluralRules je Platzhalter kosteten im Fuhrparkagenten ≈ 5 % der Rechenzeit)
const PLURAL_RULES = new Map(); const NUM_FMT = new Map();
const pluralRules = (lang) => { const l = LOCALE[lang] || 'de-DE'; if (!PLURAL_RULES.has(l)) { let r = null; try { r = new Intl.PluralRules(l); } catch { /* alte Umgebung */ } PLURAL_RULES.set(l, r); } return PLURAL_RULES.get(l); };
const numFmt = (lang, digits) => { const k = `${LOCALE[lang] || 'de-DE'}|${digits}`; if (!NUM_FMT.has(k)) NUM_FMT.set(k, new Intl.NumberFormat(LOCALE[lang] || 'de-DE', digits == null ? undefined : { maximumFractionDigits: digits })); return NUM_FMT.get(k); };
const pluralWord = (v, forms, lang) => {
  const f = forms.split('/'); const order = PL_ORDER[lang] || ['one', 'other'];
  let c = 'other'; try { const r = pluralRules(lang); if (r) c = r.select(Number(v)); } catch { /* alte Umgebung */ }
  const i = order.indexOf(c); return f[i >= 0 ? i : f.length - 1] ?? f[f.length - 1];
};

// Datumswerte in Befunden kommen gemischt an: ISO „2027-01-05“ (Ablauf-/Vertragsdaten) oder deutsch „05.01.2027“ (ggf. mit Uhrzeit).
// Für die Anzeige (nicht für den gespeicherten deutschen Text) im Format der Sprache: DE/UK „05.01.2027“, EN „05/01/2027“ –
// wie die übrige Oberfläche (vorher z. B. „abgelaufen am 2027-01-05“ bzw. auf Englisch „on 05.01.2027“).
// Nur Platzhalter, die laut Vorlagen Datumswerte tragen (Teilenummern o. Ä. wie „12.34.5678“ bleiben unverändert)
export const DATE_ARGS = new Set(['date', 'due', 'end', 'eta', 'last', 'planned', 'hu', 'at', 'oon', 'by']);
// Dezimalzahlen (Profiltiefe, Lagermengen) für die Anzeige im Zahlenformat der Sprache (DE „1,4“, EN „1.4“); gespeicherter deutscher Text unverändert
export const NUM_ARGS = new Set(['mm', 'limit', 'stock', 'min', 'oq', 'open']);
export function localNumArg(v, lang) {
  const n = typeof v === 'number' ? v : (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : NaN);
  return Number.isFinite(n) ? numFmt(lang, 3).format(n) : v;
}
export function localDateArg(v, lang) {
  if (typeof v !== 'string') return v;
  const sep = lang === 'en' ? '/' : '.';
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return [m[3], m[2], m[1]].join(sep);
  m = /^(\d{2})\.(\d{2})\.(\d{4})( \d{2}:\d{2})?$/.exec(v);
  if (m) return [m[1], m[2], m[3]].join(sep) + (m[4] || '');
  return v;
}

// Reifenpositionen: gespeichert als Kürzel (VA-L, HA-L-aussen, AH1-R, Reserve …); Deutsch zeigt das Kürzel, UK/EN Klartext
// (gemeinsam für App und Agentenbefunde – 21.10.2026: Befunde zeigten auf UK/EN „HA-L-aussen“/„Reserve“)
export const POS_WORDS = { uk: { VA: 'Перед.', LA: 'Підйомна', HA: 'Задня', AH: 'Причіп', L: 'Л', R: 'П', aussen: 'зовн.', innen: 'внутр.', Reserve: 'Запасне колесо' },
  en: { VA: 'Front', LA: 'Lift', HA: 'Rear', AH: 'Trailer', L: 'L', R: 'R', aussen: 'outer', innen: 'inner', Reserve: 'Spare wheel' } };
export function posWord(code, lang) {
  const w = POS_WORDS[lang]; if (!w || !code) return code; if (code === 'Reserve') return w.Reserve;
  const m = /^(VA|LA|HA|AH)(\d?)-(L|R)(?:-(aussen|innen))?$/.exec(code); return m ? [w[m[1]] + (m[2] ? ' ' + m[2] : ''), w[m[3]], m[4] ? w[m[4]] : ''].filter(Boolean).join(' ') : code;
}

function fill(text, args, lang, dates = false) {
  return text.replace(PH, (_, name, fmt, list, forms) => {
    const v = args[name];
    if (empty(v)) return '';
    if (forms) return pluralWord(v, forms, lang);
    if (fmt === 'km') return numFmt(lang, null).format(Number(v));
    // Liste von Personen [{name, role}] bzw. Texten („+3“): „Name (Rolle)“, ohne Name nur die Rolle (Schnittstelle), kommagetrennt
    if (list && Array.isArray(v)) {
      const e = (FINDING_ENUMS[lang] || FINDING_ENUMS.de)[list] || {};
      const one = (x) => { if (x && typeof x === 'object') { const r = x.role == null ? '' : (e[x.role] ?? FINDING_ENUMS.de[list]?.[x.role] ?? String(x.role)); return x.name ? (r ? `${x.name} (${r})` : String(x.name)) : r; } return String(x ?? ''); };
      return v.map(one).filter(Boolean).join(', ');
    }
    if (list) { const e = (FINDING_ENUMS[lang] || FINDING_ENUMS.de)[list] || {}; return e[v] ?? FINDING_ENUMS.de[list]?.[v] ?? String(v); }
    if (name === 'pos') return String(posWord(String(v), lang));
    if (dates && NUM_ARGS.has(name)) return String(localNumArg(v, lang));
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
