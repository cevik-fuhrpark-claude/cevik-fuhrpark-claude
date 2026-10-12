/* [CLAUDE] Werkstatt-Panel – Demo mit Beispieldaten (keine echten Daten, nichts wird gesendet) */
(function(){
"use strict";
/* ---------- Sprachen: feste Oberflächentexte. Freie Eingaben werden nie übersetzt. ---------- */
const LANGS = [
  { code:"de", name:"Deutsch", short:"DE", locale:"de-DE" },
  { code:"en", name:"English", short:"EN", locale:"en-GB" },
  { code:"uk", name:"Українська", short:"UA", locale:"uk-UA" },
  { code:"ru", name:"Русский", short:"RU", locale:"ru-RU" },
  { code:"ro", name:"Română", short:"RO", locale:"ro-RO" }
];
const T = {
de: {
  area:"Werkstatt", loc:"Standort Dortmund", tablet:"Tablet 1", locTitle:"Fest hinterlegt für dieses Tablet",
  timer:"Abmeldung {t}", timerTitle:"Automatische Abmeldung 6 Stunden nach der Anmeldung", logout:"Abmelden",
  demo:"<b>Demo mit Beispieldaten.</b> Nichts wird gespeichert oder gesendet. Neu laden setzt alles zurück.",
  wlanOff:"WLAN aus simulieren", wlanOn:"WLAN wieder an", light:"Hell", dark:"Dunkel", lang:"Sprache",
  netOff:"Kein WLAN · offen: {n}", netWait:"Nicht gesendet: {n}", send:"Senden", netOk:"Alles gesendet",
  autoLogout:"Automatisch abgemeldet – 6 Stunden nach der Anmeldung",
  step1:"Schritt 1 von 2", step2:"Schritt 2 von 2 · ID {id}", idTitle:"Deine Mitarbeiter-ID", codeTitle:"Dein 4-stelliger Code",
  back:"Zurück", clear:"Löschen", demoUsers:"Demo-Zugänge", idUnknown:"ID {id} ist an diesem Tablet nicht freigeschaltet.", codeWrong:"Code stimmt nicht.",
  chooseLang:"Sprache wählen", langNote:"Deine Wahl wird zu deiner Mitarbeiter-ID gespeichert. Beim nächsten Mal startet das Panel direkt in deiner Sprache.",
  langSaved:"Sprache für ID {id} gespeichert", langStart:"startet in",
  "role:Werkstattmeister":"Werkstattmeister", "role:Werkstatt":"Werkstatt-Mitarbeiter",
  gm:"Guten Morgen", hi:"Hallo", ge:"Guten Abend", inEingang:"Im Eingang: {n}.", waitingParts:"Wartet auf Teile: {n}.", emptyIn:"Eingang leer. Ruhiger Tag.", today:"Werkstatt Dortmund",
  board:"Auftragstafel", stamp:"Stempeln", notActive:"noch nicht aktiv", newOrder:"+ Auftrag anlegen",
  "next:Eingang":"Übernehmen", "next:In Arbeit":"Zur Probefahrt", "next:Wartet auf Teil":"Teil ist da", "next:Probefahrt":"Zur Freigabe",
  roadworthy:"fahrbereit", fourEyes:"4-Augen", partChip:"Teil: {x}", pending:"noch nicht gesendet", since:"seit {x}", free:"frei",
  newReport:"Neue Fahrer-Meldung · vor {x}", photo:"Foto", convert:"In Auftrag umwandeln", masterConverts:"Der Werkstattmeister wandelt Meldungen in Aufträge um.",
  emptyDone:"Heute noch nichts freigegeben", emptyCol:"Nichts hier",
  boardNote:"Jede Änderung erscheint sofort in Daniels Fuhrpark-Panel. „Fertig“ zeigt die Freigaben der letzten 24 Stunden.",
  "stage:Eingang":"Eingang", "stage:In Arbeit":"In Arbeit", "stage:Wartet auf Teil":"Wartet auf Teil", "stage:Probefahrt":"Probefahrt", "stage:Fertig":"Fertig",
  "lvl:Kritisch":"Kritisch", "lvl:Hoch":"Hoch", "lvl:Normal":"Normal",
  "art:Service":"Service", "art:Bremse":"Bremse", "art:Reifen":"Reifen", "art:Licht/Elektrik":"Licht/Elektrik", "art:SP-Vorbereitung":"SP-Vorbereitung", "art:Abfahrtkontrolle":"Abfahrtkontrolle", "art:Lenkung/Achse":"Lenkung/Achse",
  "src:Fahrer-Meldung":"Fahrer-Meldung", "src:Service fällig nach km":"Service fällig nach km", "src:Werkstatt":"Werkstatt", "src:Daniel":"Daniel (Fuhrpark)", autoTele:"automatisch aus Telematik",
  inactiveTitle:"Noch nicht aktiv", inactiveText:"Das Stempeln startet erst, wenn Betriebsrat (falls vorhanden) und Datenschutz geklärt sind und alle Mitarbeiter informiert wurden. Bis dahin sind die Knöpfe gesperrt und es wird nichts erfasst.",
  sIn:"Kommen", sInSub:"Arbeitsbeginn", sPause:"Pause", sPauseSub:"Beginn / Ende", sWork:"Arbeite an …", sWorkSub:"Auftrag wählen", sOut:"Gehen", sOutSub:"Feierabend",
  whoSees:"Wer sieht später was?", wsWhat:"Was", wsEmp:"Mitarbeiter", wsMaster:"Werkstattmeister", yes:"ja", no:"nein",
  wsRow1:"Eigene Stempelzeiten", wsRow2:"Zeiten anderer Mitarbeiter", wsRow3:"Arbeitsstunden je Auftrag (Summe, ohne Namen)",
  stampNote:"Die Schnittstelle in n8n ist vorbereitet, aber ausgeschaltet. Keine Ortung, keine Bewertung einzelner Personen.",
  checklistDone:"Checkliste vollständig ({a}/{b})", testDrive:"Probefahrt durchgeführt", photoAfter:"Foto nachher (Teile getauscht)", second:"Zweite Prüfung durch eine andere Person (4-Augen)",
  close:"Schließen", source:"Quelle", sinceL:"Seit", assignee:"Zuständig", freeOpt:"– frei –", transfer:"Übertragung", resend:"wird automatisch nachgesendet",
  stageL:"Stand", waitingFor:"Wartet auf:", delivery:"Liefertermin", openL:"offen", noEscalation:"Solange läuft im Fuhrpark-Panel keine Eskalation.", doneOnly:"„Fertig“ geht nur über die Freigabe unten.",
  checklist:"Checkliste", serviceNote:"Mit dem km-Stand setzt die Freigabe die Service-Erinnerung im Fuhrpark-Panel automatisch zurück.",
  photos:"Fotos", before:"Vorher", after:"Nachher", takePhoto:"Foto aufnehmen", photoNote:"Im Echtbetrieb öffnet „+“ die Tablet-Kamera. Pflicht bei Schaden und Teiletausch.",
  parts:"Verbaute Teile", sum:"Summe {x}", noParts:"Noch keine Teile", partSearch:"Teil (Lager-Suche)", partPh:"z. B. Ölfilter oder Teilenummer", qty:"Menge", price:"Preis je Stück (€)", fromStock:"aus Lager", addPart:"+ Teil",
  partsNote:"Verbaute Teile werden später automatisch aus dem Lager abgebucht. Lagerbestand ist vorläufig.", priceMaster:"Preise sieht nur der Werkstattmeister.",
  finding:"Befund / Notiz", findingPh:"Was wurde festgestellt, was gemacht?",
  release:"Freigabe „fahrbereit“", released:"Freigegeben von {w} um {t}. Im Fuhrpark-Panel wieder einsatzbereit.", serviceReset:"Service-Erinnerung zurückgesetzt.",
  testDriveOk:"Probefahrt durchgeführt, ohne Befund", secondBy:"Zweite Prüfung durch", pleaseChoose:"bitte wählen", releaseBtn:"Fahrbereit freigeben (mit Meister-Code)",
  allDoneMaster:"Alles erledigt – der Werkstattmeister gibt jetzt mit seinem Code frei.", masterReleases:"Die Freigabe macht der Werkstattmeister, sobald alles abgehakt ist.",
  kmPh:"km-Stand", bin:"Fach", inStock:"{n} da", emptyStock:"leer",
  releaseTitle:"Freigabe mit Meister-Code", confirms:"Mit dem Code bestätigt {n}, dass der LKW verkehrs- und betriebssicher ist.", cancel:"Abbrechen",
  toastReleased:"✓ {kz} ist fahrbereit – im Fuhrpark-Panel wieder einsatzbereit", toastReset:"Service-Erinnerung zurückgesetzt",
  waitTitle:"Wartet auf Teil", whichPart:"Welches Teil?", whichPartPh:"z. B. Rückleuchte rechts", deliveryPh:"z. B. morgen 10:00, Winkler",
  waitNote:"Solange ein Auftrag auf ein Teil wartet, läuft im Fuhrpark-Panel keine Eskalation. Daniel sieht den Liefertermin.", save:"Speichern", needPart:"Bitte das Teil angeben.", toastWait:"Wartet auf Teil – Daniel sieht den Liefertermin",
  newTitle:"Auftrag anlegen", convertTitle:"Meldung in Auftrag umwandeln", truck:"LKW", plateEx:"z. B. SZ-CM 5544", todo:"Was ist zu tun?", type:"Auftragsart", urgency:"Dringlichkeit", create:"Auftrag anlegen",
  needPlate:"Bitte volles Kennzeichen (z. B. SZ-CM 5544) und Beschreibung angeben.", toastCreated:"Auftrag angelegt – Daniel sieht ihn im Fuhrpark-Panel",
  loggedOut:"Abgemeldet", wlanBack:"WLAN zurück – Änderungen werden gesendet …", allSent:"✓ Alles gesendet", needPartName:"Bitte ein Teil eingeben",
  taken:"{t}: {n} × aus Fach {f} entnommen", noStockNr:"Teil ohne Lagernummer erfasst", noNr:"ohne Lagernummer",
  uMin:"min", uH:"Std.", uD:"Tg."
},
en: {
  area:"Workshop", loc:"Site Dortmund", tablet:"Tablet 1", locTitle:"Fixed for this tablet",
  timer:"Log-out {t}", timerTitle:"Automatic log-out 6 hours after log-in", logout:"Log out",
  demo:"<b>Demo with sample data.</b> Nothing is saved or sent. Reloading resets everything.",
  wlanOff:"Simulate Wi-Fi off", wlanOn:"Wi-Fi back on", light:"Light", dark:"Dark", lang:"Language",
  netOff:"No Wi-Fi · pending: {n}", netWait:"Not sent: {n}", send:"Send", netOk:"All sent",
  autoLogout:"Logged out automatically – 6 hours after log-in",
  step1:"Step 1 of 2", step2:"Step 2 of 2 · ID {id}", idTitle:"Your employee ID", codeTitle:"Your 4-digit code",
  back:"Back", clear:"Clear", demoUsers:"Demo log-ins", idUnknown:"ID {id} is not enabled on this tablet.", codeWrong:"Wrong code.",
  chooseLang:"Choose language", langNote:"Your choice is saved to your employee ID. Next time the panel starts in your language.",
  langSaved:"Language saved for ID {id}", langStart:"starts in",
  "role:Werkstattmeister":"Workshop foreman", "role:Werkstatt":"Mechanic",
  gm:"Good morning", hi:"Hello", ge:"Good evening", inEingang:"Incoming: {n}.", waitingParts:"Waiting for parts: {n}.", emptyIn:"Nothing incoming. Quiet day.", today:"Dortmund workshop",
  board:"Job board", stamp:"Time clock", notActive:"not active yet", newOrder:"+ New job",
  "next:Eingang":"Take job", "next:In Arbeit":"To test drive", "next:Wartet auf Teil":"Part arrived", "next:Probefahrt":"To release",
  roadworthy:"ready to drive", fourEyes:"Two-person check", partChip:"Part: {x}", pending:"not sent yet", since:"for {x}", free:"unassigned",
  newReport:"New driver report · {x} ago", photo:"Photo", convert:"Turn into job", masterConverts:"The workshop foreman turns reports into jobs.",
  emptyDone:"Nothing released today", emptyCol:"Nothing here",
  boardNote:"Every change appears at once in Daniel's fleet panel. “Done” shows releases from the last 24 hours.",
  "stage:Eingang":"Incoming", "stage:In Arbeit":"In progress", "stage:Wartet auf Teil":"Waiting for part", "stage:Probefahrt":"Test drive", "stage:Fertig":"Done",
  "lvl:Kritisch":"Critical", "lvl:Hoch":"High", "lvl:Normal":"Normal",
  "art:Service":"Service", "art:Bremse":"Brakes", "art:Reifen":"Tyres", "art:Licht/Elektrik":"Lights/electrics", "art:SP-Vorbereitung":"Safety inspection prep (SP)", "art:Abfahrtkontrolle":"Pre-trip check", "art:Lenkung/Achse":"Steering/axle",
  "src:Fahrer-Meldung":"Driver report", "src:Service fällig nach km":"Service due by mileage", "src:Werkstatt":"Workshop", "src:Daniel":"Daniel (fleet)", autoTele:"automatic from telematics",
  inactiveTitle:"Not active yet", inactiveText:"Time clocking only starts once the works council (if any) and data protection are cleared and all staff are informed. Until then the buttons are locked and nothing is recorded.",
  sIn:"Clock in", sInSub:"Start of work", sPause:"Break", sPauseSub:"Start / end", sWork:"Working on …", sWorkSub:"Choose job", sOut:"Clock out", sOutSub:"End of day",
  whoSees:"Who will see what?", wsWhat:"What", wsEmp:"Mechanic", wsMaster:"Workshop foreman", yes:"yes", no:"no",
  wsRow1:"Own clock times", wsRow2:"Other staff's times", wsRow3:"Hours per job (total, no names)",
  stampNote:"The n8n interface is prepared but switched off. No tracking, no rating of individuals.",
  checklistDone:"Checklist complete ({a}/{b})", testDrive:"Test drive done", photoAfter:"Photo after (parts replaced)", second:"Second check by another person (two-person check)",
  close:"Close", source:"Source", sinceL:"Since", assignee:"Assigned to", freeOpt:"– unassigned –", transfer:"Transfer", resend:"will be sent automatically",
  stageL:"Status", waitingFor:"Waiting for:", delivery:"Delivery", openL:"open", noEscalation:"Meanwhile no escalation runs in the fleet panel.", doneOnly:"“Done” only via the release below.",
  checklist:"Checklist", serviceNote:"With the mileage, the release resets the service reminder in the fleet panel automatically.",
  photos:"Photos", before:"Before", after:"After", takePhoto:"Take photo", photoNote:"In live use “+” opens the tablet camera. Required for damage and part replacement.",
  parts:"Parts fitted", sum:"Total {x}", noParts:"No parts yet", partSearch:"Part (stock search)", partPh:"e.g. oil filter or part number", qty:"Qty", price:"Unit price (€)", fromStock:"from stock", addPart:"+ Part",
  partsNote:"Fitted parts will later be booked out of stock automatically. Stock levels are provisional.", priceMaster:"Only the workshop foreman sees prices.",
  finding:"Findings / note", findingPh:"What was found, what was done?",
  release:"Release “ready to drive”", released:"Released by {w} at {t}. Ready for use again in the fleet panel.", serviceReset:"Service reminder reset.",
  testDriveOk:"Test drive done, no findings", secondBy:"Second check by", pleaseChoose:"please choose", releaseBtn:"Release as ready to drive (foreman code)",
  allDoneMaster:"All done – the workshop foreman now releases with his code.", masterReleases:"The workshop foreman releases once everything is ticked.",
  kmPh:"Mileage", bin:"Bin", inStock:"{n} in stock", emptyStock:"empty",
  releaseTitle:"Release with foreman code", confirms:"With the code, {n} confirms the truck is roadworthy and safe to operate.", cancel:"Cancel",
  toastReleased:"✓ {kz} is ready to drive – ready for use again in the fleet panel", toastReset:"service reminder reset",
  waitTitle:"Waiting for part", whichPart:"Which part?", whichPartPh:"e.g. rear light right", deliveryPh:"e.g. tomorrow 10:00, Winkler",
  waitNote:"While a job waits for a part, no escalation runs in the fleet panel. Daniel sees the delivery date.", save:"Save", needPart:"Please enter the part.", toastWait:"Waiting for part – Daniel sees the delivery date",
  newTitle:"New job", convertTitle:"Turn report into job", truck:"Truck", plateEx:"e.g. SZ-CM 5544", todo:"What needs doing?", type:"Job type", urgency:"Urgency", create:"Create job",
  needPlate:"Please enter the full plate (e.g. SZ-CM 5544) and a description.", toastCreated:"Job created – Daniel sees it in the fleet panel",
  loggedOut:"Logged out", wlanBack:"Wi-Fi back – sending changes …", allSent:"✓ All sent", needPartName:"Please enter a part",
  taken:"{t}: {n} × taken from bin {f}", noStockNr:"Part recorded without stock number", noNr:"no stock number",
  uMin:"min", uH:"h", uD:"d"
},
uk: {
  area:"Майстерня", loc:"Локація Дортмунд", tablet:"Планшет 1", locTitle:"Закріплено за цим планшетом",
  timer:"Вихід {t}", timerTitle:"Автоматичний вихід через 6 годин після входу", logout:"Вийти",
  demo:"<b>Демо з прикладами.</b> Нічого не зберігається і не надсилається. Перезавантаження скидає все.",
  wlanOff:"Імітувати відсутність Wi-Fi", wlanOn:"Увімкнути Wi-Fi", light:"Світла", dark:"Темна", lang:"Мова",
  netOff:"Немає Wi-Fi · очікує: {n}", netWait:"Не надіслано: {n}", send:"Надіслати", netOk:"Усе надіслано",
  autoLogout:"Автоматичний вихід – минуло 6 годин після входу",
  step1:"Крок 1 з 2", step2:"Крок 2 з 2 · ID {id}", idTitle:"Ваш ID працівника", codeTitle:"Ваш 4-значний код",
  back:"Назад", clear:"Стерти", demoUsers:"Демо-доступи", idUnknown:"ID {id} не активовано на цьому планшеті.", codeWrong:"Невірний код.",
  chooseLang:"Оберіть мову", langNote:"Ваш вибір зберігається за вашим ID. Наступного разу панель відкриється вашою мовою.",
  langSaved:"Мову збережено для ID {id}", langStart:"мова",
  "role:Werkstattmeister":"Майстер цеху", "role:Werkstatt":"Механік",
  gm:"Доброго ранку", hi:"Вітаю", ge:"Добрий вечір", inEingang:"Вхідні: {n}.", waitingParts:"Чекають на деталі: {n}.", emptyIn:"Вхідних немає. Спокійний день.", today:"Майстерня Дортмунд",
  board:"Дошка замовлень", stamp:"Облік часу", notActive:"ще не активно", newOrder:"+ Нове замовлення",
  "next:Eingang":"Взяти в роботу", "next:In Arbeit":"На пробну поїздку", "next:Wartet auf Teil":"Деталь прибула", "next:Probefahrt":"На допуск",
  roadworthy:"готовий до рейсу", fourEyes:"Подвійна перевірка", partChip:"Деталь: {x}", pending:"ще не надіслано", since:"{x}", free:"вільне",
  newReport:"Нове повідомлення водія · {x} тому", photo:"Фото", convert:"Створити замовлення", masterConverts:"Майстер цеху перетворює повідомлення на замовлення.",
  emptyDone:"Сьогодні ще нічого не допущено", emptyCol:"Тут порожньо",
  boardNote:"Кожна зміна одразу з'являється в панелі автопарку Даніеля. «Готово» показує допуски за останні 24 години.",
  "stage:Eingang":"Вхідні", "stage:In Arbeit":"В роботі", "stage:Wartet auf Teil":"Чекає на деталь", "stage:Probefahrt":"Пробна поїздка", "stage:Fertig":"Готово",
  "lvl:Kritisch":"Критично", "lvl:Hoch":"Високий", "lvl:Normal":"Звичайний",
  "art:Service":"Сервіс", "art:Bremse":"Гальма", "art:Reifen":"Шини", "art:Licht/Elektrik":"Світло/електрика", "art:SP-Vorbereitung":"Підготовка до техогляду (SP)", "art:Abfahrtkontrolle":"Перевірка перед виїздом", "art:Lenkung/Achse":"Кермо/вісь",
  "src:Fahrer-Meldung":"Повідомлення водія", "src:Service fällig nach km":"Сервіс за пробігом", "src:Werkstatt":"Майстерня", "src:Daniel":"Даніель (автопарк)", autoTele:"автоматично з телематики",
  inactiveTitle:"Ще не активно", inactiveText:"Облік часу почнеться лише після погодження з виробничою радою (якщо є) та захисту даних і після інформування всіх працівників. До того кнопки заблоковані й нічого не записується.",
  sIn:"Прихід", sInSub:"Початок роботи", sPause:"Перерва", sPauseSub:"Початок / кінець", sWork:"Працюю над …", sWorkSub:"Обрати замовлення", sOut:"Вихід", sOutSub:"Кінець зміни",
  whoSees:"Хто що бачитиме?", wsWhat:"Що", wsEmp:"Механік", wsMaster:"Майстер цеху", yes:"так", no:"ні",
  wsRow1:"Власний облік часу", wsRow2:"Час інших працівників", wsRow3:"Години на замовлення (сума, без імен)",
  stampNote:"Інтерфейс у n8n підготовлено, але вимкнено. Без відстеження місця, без оцінки окремих людей.",
  checklistDone:"Чек-лист виконано ({a}/{b})", testDrive:"Пробну поїздку виконано", photoAfter:"Фото після (замінено деталі)", second:"Друга перевірка іншою людиною (подвійна перевірка)",
  close:"Закрити", source:"Джерело", sinceL:"Відколи", assignee:"Відповідальний", freeOpt:"– вільне –", transfer:"Передача", resend:"буде надіслано автоматично",
  stageL:"Статус", waitingFor:"Чекає на:", delivery:"Дата поставки", openL:"невідомо", noEscalation:"Доти в панелі автопарку немає ескалації.", doneOnly:"«Готово» – лише через допуск нижче.",
  checklist:"Чек-лист", serviceNote:"З пробігом допуск автоматично скидає нагадування про сервіс у панелі автопарку.",
  photos:"Фото", before:"До", after:"Після", takePhoto:"Зробити фото", photoNote:"У робочій версії «+» відкриває камеру планшета. Обов'язково при пошкодженні та заміні деталей.",
  parts:"Встановлені деталі", sum:"Разом {x}", noParts:"Деталей ще немає", partSearch:"Деталь (пошук на складі)", partPh:"напр. масляний фільтр або номер деталі", qty:"Кількість", price:"Ціна за шт. (€)", fromStock:"зі складу", addPart:"+ Деталь",
  partsNote:"Встановлені деталі пізніше автоматично списуються зі складу. Залишки на складі попередні.", priceMaster:"Ціни бачить лише майстер цеху.",
  finding:"Висновок / примітка", findingPh:"Що виявлено, що зроблено?",
  release:"Допуск «готовий до рейсу»", released:"Допустив {w} о {t}. У панелі автопарку знову готовий до роботи.", serviceReset:"Нагадування про сервіс скинуто.",
  testDriveOk:"Пробну поїздку виконано, без зауважень", secondBy:"Друга перевірка:", pleaseChoose:"оберіть", releaseBtn:"Допустити до рейсу (код майстра)",
  allDoneMaster:"Усе виконано – майстер цеху тепер допускає своїм кодом.", masterReleases:"Допуск робить майстер цеху, коли все відмічено.",
  kmPh:"Пробіг", bin:"Комірка", inStock:"є {n}", emptyStock:"немає",
  releaseTitle:"Допуск кодом майстра", confirms:"Цим кодом {n} підтверджує, що вантажівка технічно справна й безпечна.", cancel:"Скасувати",
  toastReleased:"✓ {kz} готовий до рейсу – у панелі автопарку знову готовий до роботи", toastReset:"нагадування про сервіс скинуто",
  waitTitle:"Чекає на деталь", whichPart:"Яка деталь?", whichPartPh:"напр. задній ліхтар праворуч", deliveryPh:"напр. завтра 10:00, Winkler",
  waitNote:"Поки замовлення чекає на деталь, у панелі автопарку немає ескалації. Даніель бачить дату поставки.", save:"Зберегти", needPart:"Вкажіть деталь.", toastWait:"Чекає на деталь – Даніель бачить дату поставки",
  newTitle:"Нове замовлення", convertTitle:"Перетворити повідомлення на замовлення", truck:"Вантажівка", plateEx:"напр. SZ-CM 5544", todo:"Що потрібно зробити?", type:"Тип замовлення", urgency:"Терміновість", create:"Створити замовлення",
  needPlate:"Вкажіть повний номер (напр. SZ-CM 5544) та опис.", toastCreated:"Замовлення створено – Даніель бачить його в панелі автопарку",
  loggedOut:"Ви вийшли", wlanBack:"Wi-Fi є – зміни надсилаються …", allSent:"✓ Усе надіслано", needPartName:"Введіть деталь",
  taken:"{t}: {n} × взято з комірки {f}", noStockNr:"Деталь записано без складського номера", noNr:"без складського номера",
  uMin:"хв", uH:"год", uD:"дн."
},
ru: {
  area:"Мастерская", loc:"Площадка Дортмунд", tablet:"Планшет 1", locTitle:"Закреплено за этим планшетом",
  timer:"Выход {t}", timerTitle:"Автоматический выход через 6 часов после входа", logout:"Выйти",
  demo:"<b>Демо с примерами.</b> Ничего не сохраняется и не отправляется. Перезагрузка сбрасывает всё.",
  wlanOff:"Имитировать отсутствие Wi-Fi", wlanOn:"Включить Wi-Fi", light:"Светлая", dark:"Тёмная", lang:"Язык",
  netOff:"Нет Wi-Fi · ожидает: {n}", netWait:"Не отправлено: {n}", send:"Отправить", netOk:"Всё отправлено",
  autoLogout:"Автоматический выход – прошло 6 часов после входа",
  step1:"Шаг 1 из 2", step2:"Шаг 2 из 2 · ID {id}", idTitle:"Ваш ID сотрудника", codeTitle:"Ваш 4-значный код",
  back:"Назад", clear:"Стереть", demoUsers:"Демо-доступы", idUnknown:"ID {id} не активирован на этом планшете.", codeWrong:"Неверный код.",
  chooseLang:"Выберите язык", langNote:"Ваш выбор сохраняется за вашим ID. В следующий раз панель откроется на вашем языке.",
  langSaved:"Язык сохранён для ID {id}", langStart:"язык",
  "role:Werkstattmeister":"Мастер цеха", "role:Werkstatt":"Механик",
  gm:"Доброе утро", hi:"Здравствуйте", ge:"Добрый вечер", inEingang:"Входящие: {n}.", waitingParts:"Ждут запчасти: {n}.", emptyIn:"Входящих нет. Спокойный день.", today:"Мастерская Дортмунд",
  board:"Доска заказов", stamp:"Учёт времени", notActive:"ещё не активно", newOrder:"+ Новый заказ",
  "next:Eingang":"Взять в работу", "next:In Arbeit":"На пробную поездку", "next:Wartet auf Teil":"Запчасть пришла", "next:Probefahrt":"На допуск",
  roadworthy:"готов к рейсу", fourEyes:"Двойная проверка", partChip:"Запчасть: {x}", pending:"ещё не отправлено", since:"{x}", free:"свободно",
  newReport:"Новое сообщение водителя · {x} назад", photo:"Фото", convert:"Создать заказ", masterConverts:"Мастер цеха превращает сообщения в заказы.",
  emptyDone:"Сегодня ещё ничего не допущено", emptyCol:"Здесь пусто",
  boardNote:"Каждое изменение сразу появляется в панели автопарка Даниэля. «Готово» показывает допуски за последние 24 часа.",
  "stage:Eingang":"Входящие", "stage:In Arbeit":"В работе", "stage:Wartet auf Teil":"Ждёт запчасть", "stage:Probefahrt":"Пробная поездка", "stage:Fertig":"Готово",
  "lvl:Kritisch":"Критично", "lvl:Hoch":"Высокий", "lvl:Normal":"Обычный",
  "art:Service":"Сервис", "art:Bremse":"Тормоза", "art:Reifen":"Шины", "art:Licht/Elektrik":"Свет/электрика", "art:SP-Vorbereitung":"Подготовка к техосмотру (SP)", "art:Abfahrtkontrolle":"Проверка перед выездом", "art:Lenkung/Achse":"Рулевое/ось",
  "src:Fahrer-Meldung":"Сообщение водителя", "src:Service fällig nach km":"Сервис по пробегу", "src:Werkstatt":"Мастерская", "src:Daniel":"Даниэль (автопарк)", autoTele:"автоматически из телематики",
  inactiveTitle:"Ещё не активно", inactiveText:"Учёт времени начнётся только после согласования с производственным советом (если он есть) и защиты данных, а также информирования всех сотрудников. До этого кнопки заблокированы и ничего не записывается.",
  sIn:"Приход", sInSub:"Начало работы", sPause:"Перерыв", sPauseSub:"Начало / конец", sWork:"Работаю над …", sWorkSub:"Выбрать заказ", sOut:"Уход", sOutSub:"Конец смены",
  whoSees:"Кто что будет видеть?", wsWhat:"Что", wsEmp:"Механик", wsMaster:"Мастер цеха", yes:"да", no:"нет",
  wsRow1:"Своё рабочее время", wsRow2:"Время других сотрудников", wsRow3:"Часы на заказ (сумма, без имён)",
  stampNote:"Интерфейс в n8n подготовлен, но выключен. Без отслеживания местоположения, без оценки отдельных людей.",
  checklistDone:"Чек-лист выполнен ({a}/{b})", testDrive:"Пробная поездка выполнена", photoAfter:"Фото после (заменены запчасти)", second:"Вторая проверка другим человеком (двойная проверка)",
  close:"Закрыть", source:"Источник", sinceL:"С момента", assignee:"Ответственный", freeOpt:"– свободно –", transfer:"Передача", resend:"будет отправлено автоматически",
  stageL:"Статус", waitingFor:"Ждёт:", delivery:"Дата поставки", openL:"неизвестно", noEscalation:"Пока в панели автопарка нет эскалации.", doneOnly:"«Готово» – только через допуск ниже.",
  checklist:"Чек-лист", serviceNote:"С пробегом допуск автоматически сбрасывает напоминание о сервисе в панели автопарка.",
  photos:"Фото", before:"До", after:"После", takePhoto:"Сделать фото", photoNote:"В рабочей версии «+» открывает камеру планшета. Обязательно при повреждении и замене запчастей.",
  parts:"Установленные запчасти", sum:"Итого {x}", noParts:"Запчастей пока нет", partSearch:"Запчасть (поиск на складе)", partPh:"напр. масляный фильтр или номер детали", qty:"Количество", price:"Цена за шт. (€)", fromStock:"со склада", addPart:"+ Запчасть",
  partsNote:"Установленные запчасти позже автоматически списываются со склада. Остатки на складе предварительные.", priceMaster:"Цены видит только мастер цеха.",
  finding:"Заключение / заметка", findingPh:"Что обнаружено, что сделано?",
  release:"Допуск «готов к рейсу»", released:"Допустил {w} в {t}. В панели автопарка снова готов к работе.", serviceReset:"Напоминание о сервисе сброшено.",
  testDriveOk:"Пробная поездка выполнена, без замечаний", secondBy:"Вторая проверка:", pleaseChoose:"выберите", releaseBtn:"Допустить к рейсу (код мастера)",
  allDoneMaster:"Всё выполнено – мастер цеха теперь допускает своим кодом.", masterReleases:"Допуск делает мастер цеха, когда всё отмечено.",
  kmPh:"Пробег", bin:"Ячейка", inStock:"есть {n}", emptyStock:"нет",
  releaseTitle:"Допуск кодом мастера", confirms:"Этим кодом {n} подтверждает, что грузовик технически исправен и безопасен.", cancel:"Отмена",
  toastReleased:"✓ {kz} готов к рейсу – в панели автопарка снова готов к работе", toastReset:"напоминание о сервисе сброшено",
  waitTitle:"Ждёт запчасть", whichPart:"Какая запчасть?", whichPartPh:"напр. задний фонарь справа", deliveryPh:"напр. завтра 10:00, Winkler",
  waitNote:"Пока заказ ждёт запчасть, в панели автопарка нет эскалации. Даниэль видит дату поставки.", save:"Сохранить", needPart:"Укажите запчасть.", toastWait:"Ждёт запчасть – Даниэль видит дату поставки",
  newTitle:"Новый заказ", convertTitle:"Превратить сообщение в заказ", truck:"Грузовик", plateEx:"напр. SZ-CM 5544", todo:"Что нужно сделать?", type:"Тип заказа", urgency:"Срочность", create:"Создать заказ",
  needPlate:"Укажите полный номер (напр. SZ-CM 5544) и описание.", toastCreated:"Заказ создан – Даниэль видит его в панели автопарка",
  loggedOut:"Вы вышли", wlanBack:"Wi-Fi есть – изменения отправляются …", allSent:"✓ Всё отправлено", needPartName:"Введите запчасть",
  taken:"{t}: {n} × взято из ячейки {f}", noStockNr:"Запчасть записана без складского номера", noNr:"без складского номера",
  uMin:"мин", uH:"ч", uD:"дн."
},
ro: {
  area:"Atelier", loc:"Locație Dortmund", tablet:"Tabletă 1", locTitle:"Fixat pentru această tabletă",
  timer:"Deconectare {t}", timerTitle:"Deconectare automată la 6 ore după conectare", logout:"Deconectare",
  demo:"<b>Demo cu date de exemplu.</b> Nimic nu se salvează și nu se trimite. Reîncărcarea resetează totul.",
  wlanOff:"Simulează fără Wi-Fi", wlanOn:"Wi-Fi pornit din nou", light:"Luminos", dark:"Întunecat", lang:"Limbă",
  netOff:"Fără Wi-Fi · în așteptare: {n}", netWait:"Netrimise: {n}", send:"Trimite", netOk:"Totul trimis",
  autoLogout:"Deconectat automat – au trecut 6 ore de la conectare",
  step1:"Pasul 1 din 2", step2:"Pasul 2 din 2 · ID {id}", idTitle:"ID-ul tău de angajat", codeTitle:"Codul tău din 4 cifre",
  back:"Înapoi", clear:"Șterge", demoUsers:"Accese demo", idUnknown:"ID {id} nu este activat pe această tabletă.", codeWrong:"Cod greșit.",
  chooseLang:"Alege limba", langNote:"Alegerea ta se salvează la ID-ul tău. Data viitoare panoul pornește direct în limba ta.",
  langSaved:"Limbă salvată pentru ID {id}", langStart:"pornește în",
  "role:Werkstattmeister":"Șef atelier", "role:Werkstatt":"Mecanic",
  gm:"Bună dimineața", hi:"Bună ziua", ge:"Bună seara", inEingang:"Intrări: {n}.", waitingParts:"Așteaptă piese: {n}.", emptyIn:"Nicio intrare. Zi liniștită.", today:"Atelier Dortmund",
  board:"Tablă comenzi", stamp:"Pontaj", notActive:"încă inactiv", newOrder:"+ Comandă nouă",
  "next:Eingang":"Preia", "next:In Arbeit":"La proba pe drum", "next:Wartet auf Teil":"Piesa a sosit", "next:Probefahrt":"La aprobare",
  roadworthy:"gata de drum", fourEyes:"Verificare dublă", partChip:"Piesă: {x}", pending:"netrimis încă", since:"de {x}", free:"liber",
  newReport:"Raport nou de la șofer · acum {x}", photo:"Foto", convert:"Transformă în comandă", masterConverts:"Șeful de atelier transformă rapoartele în comenzi.",
  emptyDone:"Nimic aprobat azi", emptyCol:"Nimic aici",
  boardNote:"Orice schimbare apare imediat în panoul de flotă al lui Daniel. „Gata” arată aprobările din ultimele 24 de ore.",
  "stage:Eingang":"Intrare", "stage:In Arbeit":"În lucru", "stage:Wartet auf Teil":"Așteaptă piesă", "stage:Probefahrt":"Probă pe drum", "stage:Fertig":"Gata",
  "lvl:Kritisch":"Critic", "lvl:Hoch":"Ridicat", "lvl:Normal":"Normal",
  "art:Service":"Service", "art:Bremse":"Frâne", "art:Reifen":"Anvelope", "art:Licht/Elektrik":"Lumini/electrică", "art:SP-Vorbereitung":"Pregătire inspecție (SP)", "art:Abfahrtkontrolle":"Verificare înainte de plecare", "art:Lenkung/Achse":"Direcție/punte",
  "src:Fahrer-Meldung":"Raport șofer", "src:Service fällig nach km":"Service scadent după km", "src:Werkstatt":"Atelier", "src:Daniel":"Daniel (flotă)", autoTele:"automat din telematică",
  inactiveTitle:"Încă inactiv", inactiveText:"Pontajul pornește doar după clarificarea cu comitetul de întreprindere (dacă există) și protecția datelor și după informarea tuturor angajaților. Până atunci butoanele sunt blocate și nu se înregistrează nimic.",
  sIn:"Sosire", sInSub:"Început lucru", sPause:"Pauză", sPauseSub:"Început / sfârșit", sWork:"Lucrez la …", sWorkSub:"Alege comanda", sOut:"Plecare", sOutSub:"Sfârșit program",
  whoSees:"Cine ce va vedea?", wsWhat:"Ce", wsEmp:"Mecanic", wsMaster:"Șef atelier", yes:"da", no:"nu",
  wsRow1:"Propriul pontaj", wsRow2:"Orele altor angajați", wsRow3:"Ore pe comandă (total, fără nume)",
  stampNote:"Interfața din n8n este pregătită, dar oprită. Fără localizare, fără evaluarea persoanelor.",
  checklistDone:"Listă de verificare completă ({a}/{b})", testDrive:"Probă pe drum efectuată", photoAfter:"Foto după (piese schimbate)", second:"A doua verificare de altă persoană (verificare dublă)",
  close:"Închide", source:"Sursă", sinceL:"De la", assignee:"Responsabil", freeOpt:"– liber –", transfer:"Transmitere", resend:"se trimite automat",
  stageL:"Stadiu", waitingFor:"Așteaptă:", delivery:"Termen livrare", openL:"necunoscut", noEscalation:"Între timp nu rulează nicio escaladare în panoul de flotă.", doneOnly:"„Gata” doar prin aprobarea de mai jos.",
  checklist:"Listă de verificare", serviceNote:"Cu kilometrajul, aprobarea resetează automat memento-ul de service în panoul de flotă.",
  photos:"Fotografii", before:"Înainte", after:"După", takePhoto:"Fă o poză", photoNote:"În utilizare reală „+” deschide camera tabletei. Obligatoriu la daune și schimb de piese.",
  parts:"Piese montate", sum:"Total {x}", noParts:"Încă nicio piesă", partSearch:"Piesă (căutare în depozit)", partPh:"ex. filtru de ulei sau cod piesă", qty:"Cantitate", price:"Preț/buc. (€)", fromStock:"din depozit", addPart:"+ Piesă",
  partsNote:"Piesele montate se scad ulterior automat din depozit. Stocul este provizoriu.", priceMaster:"Prețurile le vede doar șeful de atelier.",
  finding:"Constatare / notă", findingPh:"Ce s-a constatat, ce s-a făcut?",
  release:"Aprobare „gata de drum”", released:"Aprobat de {w} la {t}. Din nou disponibil în panoul de flotă.", serviceReset:"Memento service resetat.",
  testDriveOk:"Probă pe drum efectuată, fără probleme", secondBy:"A doua verificare de", pleaseChoose:"alege", releaseBtn:"Aprobă gata de drum (cod șef atelier)",
  allDoneMaster:"Totul gata – șeful de atelier aprobă acum cu codul său.", masterReleases:"Aprobarea o face șeful de atelier după ce totul e bifat.",
  kmPh:"Kilometraj", bin:"Raft", inStock:"{n} în stoc", emptyStock:"gol",
  releaseTitle:"Aprobare cu codul șefului", confirms:"Cu acest cod, {n} confirmă că camionul este sigur în trafic și în exploatare.", cancel:"Anulează",
  toastReleased:"✓ {kz} este gata de drum – din nou disponibil în panoul de flotă", toastReset:"memento service resetat",
  waitTitle:"Așteaptă piesă", whichPart:"Ce piesă?", whichPartPh:"ex. lampă spate dreapta", deliveryPh:"ex. mâine 10:00, Winkler",
  waitNote:"Cât timp o comandă așteaptă o piesă, nu rulează nicio escaladare în panoul de flotă. Daniel vede termenul de livrare.", save:"Salvează", needPart:"Te rog indică piesa.", toastWait:"Așteaptă piesă – Daniel vede termenul de livrare",
  newTitle:"Comandă nouă", convertTitle:"Transformă raportul în comandă", truck:"Camion", plateEx:"ex. SZ-CM 5544", todo:"Ce trebuie făcut?", type:"Tip comandă", urgency:"Urgență", create:"Creează comanda",
  needPlate:"Te rog introdu numărul complet (ex. SZ-CM 5544) și o descriere.", toastCreated:"Comandă creată – Daniel o vede în panoul de flotă",
  loggedOut:"Deconectat", wlanBack:"Wi-Fi revenit – se trimit modificările …", allSent:"✓ Totul trimis", needPartName:"Te rog introdu o piesă",
  taken:"{t}: {n} × luat din raftul {f}", noStockNr:"Piesă înregistrată fără cod de depozit", noNr:"fără cod de depozit",
  uMin:"min", uH:"h", uD:"zile"
}
};
/* Checklisten-Punkte: Schlüssel = deutscher Text */
const CK = {
  "Motoröl gewechselt": ["Engine oil changed","Моторну оливу замінено","Моторное масло заменено","Ulei de motor schimbat"],
  "Ölfilter gewechselt": ["Oil filter changed","Масляний фільтр замінено","Масляный фильтр заменён","Filtru de ulei schimbat"],
  "Luftfilter geprüft / gewechselt": ["Air filter checked / changed","Повітряний фільтр перевірено / замінено","Воздушный фильтр проверен / заменён","Filtru de aer verificat / schimbat"],
  "Kraftstofffilter gewechselt": ["Fuel filter changed","Паливний фільтр замінено","Топливный фильтр заменён","Filtru de combustibil schimbat"],
  "Kühlmittel und AdBlue geprüft": ["Coolant and AdBlue checked","Охолоджувальну рідину та AdBlue перевірено","Охлаждающая жидкость и AdBlue проверены","Lichid de răcire și AdBlue verificate"],
  "Sichtprüfung Unterboden, keine Undichtigkeit": ["Underbody visual check, no leaks","Огляд днища, течі немає","Осмотр днища, течей нет","Verificare vizuală dedesubt, fără scurgeri"],
  "km-Stand eingetragen": ["Mileage entered","Пробіг внесено","Пробег внесён","Kilometraj introdus"],
  "Belagstärke gemessen": ["Pad thickness measured","Товщину колодок виміряно","Толщина колодок измерена","Grosimea plăcuțelor măsurată"],
  "Bremsscheiben geprüft": ["Brake discs checked","Гальмівні диски перевірено","Тормозные диски проверены","Discuri de frână verificate"],
  "Bremsleitungen dicht": ["Brake lines without leaks","Гальмівні магістралі без течі","Тормозные магистрали без утечек","Conducte de frână etanșe"],
  "Druckluftanlage dicht": ["Air system without leaks","Пневмосистема без витоків","Пневмосистема без утечек","Instalația de aer etanșă"],
  "Bremsprobe / Prüfstand bestanden": ["Brake test / test bench passed","Перевірку гальм / стенд пройдено","Проверка тормозов / стенд пройдена","Test frâne / stand trecut"],
  "Profiltiefe gemessen": ["Tread depth measured","Глибину протектора виміряно","Глубина протектора измерена","Adâncimea profilului măsurată"],
  "Luftdruck eingestellt": ["Tyre pressure set","Тиск у шинах встановлено","Давление в шинах установлено","Presiunea setată"],
  "Radmuttern mit Drehmoment angezogen": ["Wheel nuts torqued","Колісні гайки затягнуто з моментом","Колёсные гайки затянуты с моментом","Piulițele roților strânse la cuplu"],
  "Nachziehen nach 50 km vermerkt": ["Re-torque after 50 km noted","Підтяжку через 50 км відмічено","Подтяжка через 50 км отмечена","Restrângere după 50 km notată"],
  "Reifenalter (DOT) geprüft": ["Tyre age (DOT) checked","Вік шин (DOT) перевірено","Возраст шин (DOT) проверен","Vârsta anvelopei (DOT) verificată"],
  "Fehler gefunden": ["Fault found","Несправність знайдено","Неисправность найдена","Defect găsit"],
  "Leuchte / Sicherung ersetzt": ["Lamp / fuse replaced","Ліхтар / запобіжник замінено","Фонарь / предохранитель заменён","Lampă / siguranță înlocuită"],
  "Alle Leuchten geprüft": ["All lights checked","Усі ліхтарі перевірено","Все фонари проверены","Toate luminile verificate"],
  "Fehlerspeicher ausgelesen und gelöscht": ["Fault memory read and cleared","Пам'ять помилок зчитано й очищено","Память ошибок считана и очищена","Memoria de erori citită și ștearsă"],
  "Bremsanlage geprüft": ["Brake system checked","Гальмівну систему перевірено","Тормозная система проверена","Sistemul de frânare verificat"],
  "Lenkung geprüft": ["Steering checked","Рульове керування перевірено","Рулевое управление проверено","Direcția verificată"],
  "Achsen und Federung geprüft": ["Axles and suspension checked","Осі та підвіску перевірено","Оси и подвеска проверены","Punțile și suspensia verificate"],
  "Rahmen und Aufbau geprüft": ["Frame and body checked","Раму та кузов перевірено","Рама и кузов проверены","Șasiul și caroseria verificate"],
  "Beleuchtung geprüft": ["Lighting checked","Освітлення перевірено","Освещение проверено","Iluminarea verificată"],
  "Fehlerspeicher ausgelesen": ["Fault memory read","Пам'ять помилок зчитано","Память ошибок считана","Memoria de erori citită"],
  "Licht": ["Lights","Світло","Свет","Lumini"],
  "Reifen und Räder": ["Tyres and wheels","Шини та колеса","Шины и колёса","Anvelope și roți"],
  "Bremsen": ["Brakes","Гальма","Тормоза","Frâne"],
  "Spiegel und Scheiben": ["Mirrors and windows","Дзеркала та скло","Зеркала и стёкла","Oglinzi și geamuri"],
  "Flüssigkeiten": ["Fluids","Рідини","Жидкости","Lichide"],
  "Ladungssicherung vorhanden": ["Load securing equipment present","Засоби кріплення вантажу є","Средства крепления груза есть","Echipament de ancorare a mărfii prezent"],
  "Spurstangen und Gelenke geprüft": ["Tie rods and joints checked","Рульові тяги та шарніри перевірено","Рулевые тяги и шарниры проверены","Bieletele și articulațiile verificate"],
  "Lenkspiel geprüft": ["Steering play checked","Люфт керма перевірено","Люфт руля проверен","Jocul volanului verificat"],
  "Achsvermessung durchgeführt": ["Wheel alignment done","Розвал-сходження виконано","Развал-схождение выполнено","Geometria roților efectuată"],
  "Schrauben mit Drehmoment angezogen": ["Bolts torqued","Болти затягнуто з моментом","Болты затянуты с моментом","Șuruburile strânse la cuplu"]
};

/* ---------- Ergänzung 12.10.: Rückmeldung, Kategorie, gleichberechtigte Mechaniker ---------- */
Object.assign(T.de, {
  fbTitle:"Rückmeldung an Daniel", fbBadge:"geht an Daniels Fuhrpark-Panel", fbDone:"Was wurde gemacht?", fbNot:"Was konnte nicht gemacht werden?", fbWhy:"Warum nicht?",
  r_tool:"Werkzeug fehlt", r_mat:"Material fehlt", r_stock:"Teil nicht auf Lager", r_time:"Zeit reicht nicht", r_other:"Anderer Grund", fbOtherPh:"Grund kurz beschreiben",
  fbMic:"Reinsprechen", fbMicNote:"In der Demo nur angedeutet: fügt einen Beispieltext ein. Im Echtbetrieb wird gesprochen, aufgenommen und übersetzt.", fbType:"oder tippen",
  fbSave:"Rückmeldung senden", fbNeed:"Bitte mindestens ausfüllen, was gemacht wurde.", fbNeedWhy:"Bitte einen Grund wählen, warum etwas nicht gemacht wurde.",
  fbOrig:"Original ({l})", fbDe:"Deutsch für Daniel", fbDemoTr:"Übersetzung im Echtbetrieb automatisch – in der Demo nur bei Beispieltexten.", fbNone:"Noch keine Rückmeldung.", fbSent:"Rückmeldung an Daniel gesendet",
  stuck:"Nicht erledigt / liegen geblieben", stuckChip:"liegen geblieben", fbKindDone:"Abschluss", fbKindStuck:"Liegen geblieben",
  fromDaniel:"von Daniel eingestuft", triageNote:"Fahrer-Meldungen erscheinen hier erst, wenn Daniel sie eingestuft hat.", takeOver:"Als Auftrag übernehmen",
  category:"Kategorie", "cat:Reifen":"Reifen", "cat:Bremsen":"Bremsen", "cat:Hydraulik":"Hydraulik", "cat:Motor/Getriebe":"Motor/Getriebe", "cat:Elektrik":"Elektrik", "cat:Standard":"Standard",
  skillNote:"Später: Daniel weist zu, das Panel schlägt passende Mechaniker nach Können-Profil vor.", "role:Mechaniker":"Mechaniker",
  releaseTitle:"Freigabe mit deinem Code", releaseBtn:"Fahrbereit freigeben (mit deinem Code)", ready:"Alles erledigt – mit deinem Code freigeben.", notReady:"Freigabe geht, sobald alles abgehakt ist.",
  priceNote:"Preise sieht nur Yilmaz im Admin-Panel.", trPending:"[Übersetzung im Echtbetrieb]", fbStep:"Erst Rückmeldung, dann Freigabe mit Code."
});
Object.assign(T.en, {
  fbTitle:"Feedback to Daniel", fbBadge:"goes to Daniel's fleet panel", fbDone:"What was done?", fbNot:"What could not be done?", fbWhy:"Why not?",
  r_tool:"Tool missing", r_mat:"Material missing", r_stock:"Part not in stock", r_time:"Not enough time", r_other:"Other reason", fbOtherPh:"Describe the reason briefly",
  fbMic:"Speak", fbMicNote:"Only simulated in the demo: inserts a sample text. In live use you speak, it is recorded and translated.", fbType:"or type",
  fbSave:"Send feedback", fbNeed:"Please at least fill in what was done.", fbNeedWhy:"Please choose why something was not done.",
  fbOrig:"Original ({l})", fbDe:"German for Daniel", fbDemoTr:"Translated automatically in live use – in the demo only for sample texts.", fbNone:"No feedback yet.", fbSent:"Feedback sent to Daniel",
  stuck:"Not done / stuck", stuckChip:"stuck", fbKindDone:"Completion", fbKindStuck:"Stuck",
  fromDaniel:"rated by Daniel", triageNote:"Driver reports appear here only after Daniel has rated them.", takeOver:"Take as job",
  category:"Category", "cat:Reifen":"Tyres", "cat:Bremsen":"Brakes", "cat:Hydraulik":"Hydraulics", "cat:Motor/Getriebe":"Engine/gearbox", "cat:Elektrik":"Electrics", "cat:Standard":"Standard",
  skillNote:"Later: Daniel assigns, the panel suggests suitable mechanics by skill profile.", "role:Mechaniker":"Mechanic",
  releaseTitle:"Release with your code", releaseBtn:"Release as ready to drive (your code)", ready:"All done – release with your code.", notReady:"Release is possible once everything is ticked.",
  priceNote:"Only Yilmaz sees prices in the admin panel.", trPending:"[translation follows in live use]", fbStep:"First feedback, then release with code."
});
Object.assign(T.uk, {
  fbTitle:"Звіт для Даніеля", fbBadge:"йде в панель автопарку Даніеля", fbDone:"Що зроблено?", fbNot:"Що не вдалося зробити?", fbWhy:"Чому ні?",
  r_tool:"Немає інструмента", r_mat:"Немає матеріалу", r_stock:"Деталі немає на складі", r_time:"Не вистачило часу", r_other:"Інша причина", fbOtherPh:"Коротко опишіть причину",
  fbMic:"Надиктувати", fbMicNote:"У демо лише імітація: вставляє приклад тексту. У робочій версії ви говорите, мова записується та перекладається.", fbType:"або надрукувати",
  fbSave:"Надіслати звіт", fbNeed:"Будь ласка, вкажіть принаймні, що зроблено.", fbNeedWhy:"Оберіть, чому щось не зроблено.",
  fbOrig:"Оригінал ({l})", fbDe:"Німецькою для Даніеля", fbDemoTr:"У робочій версії переклад автоматичний – у демо лише для прикладів.", fbNone:"Звіту ще немає.", fbSent:"Звіт надіслано Даніелю",
  stuck:"Не виконано / зупинено", stuckChip:"зупинено", fbKindDone:"Завершення", fbKindStuck:"Зупинено",
  fromDaniel:"оцінено Даніелем", triageNote:"Повідомлення водіїв з'являються тут лише після оцінки Даніелем.", takeOver:"Взяти як замовлення",
  category:"Категорія", "cat:Reifen":"Шини", "cat:Bremsen":"Гальма", "cat:Hydraulik":"Гідравліка", "cat:Motor/Getriebe":"Двигун/КПП", "cat:Elektrik":"Електрика", "cat:Standard":"Стандарт",
  skillNote:"Пізніше: Даніель розподіляє, панель пропонує механіків за профілем навичок.", "role:Mechaniker":"Механік",
  releaseTitle:"Допуск вашим кодом", releaseBtn:"Допустити до рейсу (ваш код)", ready:"Усе виконано – допустіть своїм кодом.", notReady:"Допуск можливий, коли все відмічено.",
  priceNote:"Ціни бачить лише Їлмаз в адмін-панелі.", trPending:"[переклад у робочій версії]", fbStep:"Спочатку звіт, потім допуск кодом."
});
Object.assign(T.ru, {
  fbTitle:"Отчёт для Даниэля", fbBadge:"идёт в панель автопарка Даниэля", fbDone:"Что сделано?", fbNot:"Что не удалось сделать?", fbWhy:"Почему нет?",
  r_tool:"Нет инструмента", r_mat:"Нет материала", r_stock:"Запчасти нет на складе", r_time:"Не хватило времени", r_other:"Другая причина", fbOtherPh:"Кратко опишите причину",
  fbMic:"Надиктовать", fbMicNote:"В демо только имитация: вставляет пример текста. В рабочей версии вы говорите, речь записывается и переводится.", fbType:"или напечатать",
  fbSave:"Отправить отчёт", fbNeed:"Пожалуйста, укажите хотя бы, что сделано.", fbNeedWhy:"Выберите, почему что-то не сделано.",
  fbOrig:"Оригинал ({l})", fbDe:"На немецком для Даниэля", fbDemoTr:"В рабочей версии перевод автоматический – в демо только для примеров.", fbNone:"Отчёта ещё нет.", fbSent:"Отчёт отправлен Даниэлю",
  stuck:"Не выполнено / остановлено", stuckChip:"остановлено", fbKindDone:"Завершение", fbKindStuck:"Остановлено",
  fromDaniel:"оценено Даниэлем", triageNote:"Сообщения водителей появляются здесь только после оценки Даниэлем.", takeOver:"Взять как заказ",
  category:"Категория", "cat:Reifen":"Шины", "cat:Bremsen":"Тормоза", "cat:Hydraulik":"Гидравлика", "cat:Motor/Getriebe":"Двигатель/КПП", "cat:Elektrik":"Электрика", "cat:Standard":"Стандарт",
  skillNote:"Позже: Даниэль распределяет, панель предлагает механиков по профилю навыков.", "role:Mechaniker":"Механик",
  releaseTitle:"Допуск вашим кодом", releaseBtn:"Допустить к рейсу (ваш код)", ready:"Всё выполнено – допустите своим кодом.", notReady:"Допуск возможен, когда всё отмечено.",
  priceNote:"Цены видит только Йылмаз в админ-панели.", trPending:"[перевод в рабочей версии]", fbStep:"Сначала отчёт, потом допуск кодом."
});
Object.assign(T.ro, {
  fbTitle:"Raport pentru Daniel", fbBadge:"merge în panoul de flotă al lui Daniel", fbDone:"Ce s-a făcut?", fbNot:"Ce nu s-a putut face?", fbWhy:"De ce nu?",
  r_tool:"Lipsește scula", r_mat:"Lipsește materialul", r_stock:"Piesa nu e în stoc", r_time:"Nu a ajuns timpul", r_other:"Alt motiv", fbOtherPh:"Descrie pe scurt motivul",
  fbMic:"Dictează", fbMicNote:"În demo doar simulat: inserează un text de exemplu. În utilizare reală vorbești, se înregistrează și se traduce.", fbType:"sau scrie",
  fbSave:"Trimite raportul", fbNeed:"Te rog completează cel puțin ce s-a făcut.", fbNeedWhy:"Te rog alege de ce ceva nu s-a făcut.",
  fbOrig:"Original ({l})", fbDe:"În germană pentru Daniel", fbDemoTr:"În utilizare reală traducerea e automată – în demo doar pentru texte de exemplu.", fbNone:"Încă niciun raport.", fbSent:"Raport trimis lui Daniel",
  stuck:"Neterminat / blocat", stuckChip:"blocat", fbKindDone:"Finalizare", fbKindStuck:"Blocat",
  fromDaniel:"evaluat de Daniel", triageNote:"Rapoartele șoferilor apar aici doar după ce Daniel le-a evaluat.", takeOver:"Preia ca comandă",
  category:"Categorie", "cat:Reifen":"Anvelope", "cat:Bremsen":"Frâne", "cat:Hydraulik":"Hidraulică", "cat:Motor/Getriebe":"Motor/cutie de viteze", "cat:Elektrik":"Electrică", "cat:Standard":"Standard",
  skillNote:"Mai târziu: Daniel repartizează, panoul propune mecanici potriviți după profilul de competențe.", "role:Mechaniker":"Mecanic",
  releaseTitle:"Aprobare cu codul tău", releaseBtn:"Aprobă gata de drum (codul tău)", ready:"Totul gata – aprobă cu codul tău.", notReady:"Aprobarea e posibilă după ce totul e bifat.",
  priceNote:"Prețurile le vede doar Yilmaz în panoul de administrare.", trPending:"[traducere în utilizare reală]", fbStep:"Întâi raportul, apoi aprobarea cu cod."
});
/* Beispieltext für den angedeuteten Sprach-Knopf (je Sprache) */
const FB_EX = {
  de:{ gemacht:"Bremsbeläge vorne gewechselt, Bremse geprüft.", nicht:"Zweite Bremsscheibe nicht gewechselt." },
  en:{ gemacht:"Front brake pads replaced, brakes checked.", nicht:"Second brake disc not replaced." },
  uk:{ gemacht:"Передні гальмівні колодки замінено, гальма перевірено.", nicht:"Другий гальмівний диск не замінено." },
  ru:{ gemacht:"Передние тормозные колодки заменены, тормоза проверены.", nicht:"Второй тормозной диск не заменён." },
  ro:{ gemacht:"Plăcuțele de frână față schimbate, frânele verificate.", nicht:"Al doilea disc de frână nu a fost schimbat." }
};

/* ---------- Ergänzung: vereinfachte Startansicht ---------- */
Object.assign(T.de, { tabStart:"Start", tabAll:"Alle Aufträge", newIn:"Neu reingekommen", mine:"Meine Aufträge", nothingNew:"Nichts Neues.", nothingMine:"Du hast gerade keinen Auftrag. Nimm einen aus „Neu reingekommen“.", allClear:"Nichts zu tun. Alles erledigt.", take:"Übernehmen", toastTaken:"{kz} ist jetzt bei dir", btnToTest:"Fertig – zur Probefahrt", btnPartIn:"Teil ist da – weiter", btnRelease:"Freigeben", btnWait:"Wartet auf Teil", btnStuck:"Liegen geblieben", needChecks:"Erst die Checkliste abhaken – der Auftrag ist geöffnet.", headMine:"Meine Aufträge: {n}.", "art:Reparatur":"Reparatur" });
Object.assign(T.en, { tabStart:"Start", tabAll:"All jobs", newIn:"New in", mine:"My jobs", nothingNew:"Nothing new.", nothingMine:"You have no job right now. Take one from “New in”.", allClear:"Nothing to do. All done.", take:"Take", toastTaken:"{kz} is now yours", btnToTest:"Done – to test drive", btnPartIn:"Part arrived – continue", btnRelease:"Release", btnWait:"Waiting for part", btnStuck:"Stuck", needChecks:"Tick the checklist first – the job is open.", headMine:"My jobs: {n}.", "art:Reparatur":"Repair" });
Object.assign(T.uk, { tabStart:"Старт", tabAll:"Усі замовлення", newIn:"Нові надходження", mine:"Мої замовлення", nothingNew:"Нічого нового.", nothingMine:"Зараз у вас немає замовлення. Візьміть з «Нові надходження».", allClear:"Нічого робити. Усе виконано.", take:"Взяти", toastTaken:"{kz} тепер у вас", btnToTest:"Готово – на пробну поїздку", btnPartIn:"Деталь прибула – далі", btnRelease:"Допустити", btnWait:"Чекає на деталь", btnStuck:"Зупинено", needChecks:"Спочатку відмітьте чек-лист – замовлення відкрито.", headMine:"Мої замовлення: {n}.", "art:Reparatur":"Ремонт" });
Object.assign(T.ru, { tabStart:"Старт", tabAll:"Все заказы", newIn:"Новые поступления", mine:"Мои заказы", nothingNew:"Ничего нового.", nothingMine:"Сейчас у вас нет заказа. Возьмите из «Новые поступления».", allClear:"Нечего делать. Всё выполнено.", take:"Взять", toastTaken:"{kz} теперь у вас", btnToTest:"Готово – на пробную поездку", btnPartIn:"Запчасть пришла – дальше", btnRelease:"Допустить", btnWait:"Ждёт запчасть", btnStuck:"Остановлено", needChecks:"Сначала отметьте чек-лист – заказ открыт.", headMine:"Мои заказы: {n}.", "art:Reparatur":"Ремонт" });
Object.assign(T.ro, { tabStart:"Start", tabAll:"Toate comenzile", newIn:"Intrate nou", mine:"Comenzile mele", nothingNew:"Nimic nou.", nothingMine:"Acum nu ai nicio comandă. Ia una din „Intrate nou”.", allClear:"Nimic de făcut. Totul gata.", take:"Preia", toastTaken:"{kz} este acum la tine", btnToTest:"Gata – la proba pe drum", btnPartIn:"Piesa a sosit – continuă", btnRelease:"Aprobă", btnWait:"Așteaptă piesă", btnStuck:"Blocat", needChecks:"Bifează întâi lista de verificare – comanda e deschisă.", headMine:"Comenzile mele: {n}.", "art:Reparatur":"Reparație" });
Object.assign(CK, {
  "Fehler gefunden und behoben": ["Fault found and fixed","Несправність знайдено й усунуто","Неисправность найдена и устранена","Defect găsit și remediat"],
  "Funktion geprüft": ["Function checked","Роботу перевірено","Работа проверена","Funcționare verificată"],
  "Fahrzeug sauber übergeben": ["Vehicle handed over clean","Авто передано чистим","Машина передана чистой","Vehicul predat curat"]
});

/* ---------- Ergänzung 12.10. (Testbericht-Fixes): 4-Augen-Code, Lager-Prüfung, Sperre, Entwurf ---------- */
Object.assign(T.de, {
  secondSelf:"Du bist als Zweitprüfer eingetragen. Freigeben muss eine andere Person.",
  secondStep1:"Schritt 1 von 2 · Code von {n} (gibt frei)", secondStep2:"Schritt 2 von 2 · Code von {n} (Zweitprüfer)",
  secondConfirms:"Mit dem eigenen Code bestätigt {n}, die Arbeit selbst geprüft zu haben.", secondCodeWrong:"Code stimmt nicht – hier muss {n} den eigenen Code eingeben.",
  alreadyTaken:"{kz} hat bereits {n} übernommen.",
  qtyBad:"Menge bitte als ganze Zahl von 1 bis 999 eingeben.",
  overTitle:"Mehr als im Bestand", overText:"Laut Bestand liegen nur {n} × {t} im Fach {f}. Wirklich {m} buchen? Daniel bekommt einen Hinweis zur Bestandsprüfung.", overBtn:"Trotzdem buchen",
  fbNeedOther:"Bitte den anderen Grund kurz beschreiben.",
  idleWarn:"In 30 Sekunden automatische Abmeldung (6 Stunden um). Danach einfach neu anmelden.", draftKept:"Deine Rückmeldung bleibt als Entwurf erhalten.",
  kmLow:"km-Stand liegt unter dem Telematik-Stand ({x} km) – bitte prüfen.", kmHigh:"km-Stand liegt weit über dem Telematik-Stand ({x} km) – bitte prüfen.",
  codeLocked:"Zu viele falsche Codes. ID {id} ist 2 Minuten gesperrt.",
  needStage:"Stand „Probefahrt“ erreicht", delPhoto:"Foto löschen",
  artChanged:"Auftragsart geändert – Checkliste startet neu.",
  restored:"{n} ungesendete Einträge wiederhergestellt.", demoKeep:"Ausnahme: noch nicht gesendete Einträge bleiben auch nach dem Neuladen erhalten."
});
Object.assign(T.en, {
  secondSelf:"You are entered as the second checker. Someone else must release.",
  secondStep1:"Step 1 of 2 · Code of {n} (releases)", secondStep2:"Step 2 of 2 · Code of {n} (second checker)",
  secondConfirms:"With their own code, {n} confirms having checked the work personally.", secondCodeWrong:"Wrong code – {n} must enter their own code here.",
  alreadyTaken:"{n} has already taken {kz}.",
  qtyBad:"Please enter the quantity as a whole number from 1 to 999.",
  overTitle:"More than in stock", overText:"Stock shows only {n} × {t} in bin {f}. Really book {m}? Daniel will get a note to check the stock.", overBtn:"Book anyway",
  fbNeedOther:"Please describe the other reason briefly.",
  idleWarn:"Automatic log-out in 30 seconds (6 hours are up). Then simply log in again.", draftKept:"Your feedback is kept as a draft.",
  kmLow:"Mileage is below the telematics reading ({x} km) – please check.", kmHigh:"Mileage is far above the telematics reading ({x} km) – please check.",
  codeLocked:"Too many wrong codes. ID {id} is locked for 2 minutes.",
  needStage:"Stage “Test drive” reached", delPhoto:"Delete photo",
  artChanged:"Job type changed – checklist starts again.",
  restored:"{n} unsent entries restored.", demoKeep:"Exception: entries not yet sent are kept even after reloading."
});
Object.assign(T.uk, {
  secondSelf:"Вас вказано як другого перевіряючого. Допустити має інша людина.",
  secondStep1:"Крок 1 з 2 · Код: {n} (допускає)", secondStep2:"Крок 2 з 2 · Код: {n} (другий перевіряючий)",
  secondConfirms:"Власним кодом {n} підтверджує, що особисто перевірив роботу.", secondCodeWrong:"Невірний код – тут {n} має ввести власний код.",
  alreadyTaken:"{kz} вже взяв {n}.",
  qtyBad:"Введіть кількість цілим числом від 1 до 999.",
  overTitle:"Більше, ніж на складі", overText:"За обліком у комірці {f} лише {n} × {t}. Справді списати {m}? Даніель отримає нагадування перевірити залишок.", overBtn:"Все одно списати",
  fbNeedOther:"Коротко опишіть іншу причину.",
  idleWarn:"Через 30 секунд автоматичний вихід (минуло 6 годин). Потім просто увійдіть знову.", draftKept:"Ваш відгук збережено як чернетку.",
  kmLow:"Пробіг менший за показник телематики ({x} км) – перевірте.", kmHigh:"Пробіг значно більший за показник телематики ({x} км) – перевірте.",
  codeLocked:"Забагато невірних кодів. ID {id} заблоковано на 2 хвилини.",
  needStage:"Етап «Пробна поїздка» досягнуто", delPhoto:"Видалити фото",
  artChanged:"Тип замовлення змінено – чек-лист починається заново.",
  restored:"Відновлено ненадісланих записів: {n}.", demoKeep:"Виняток: ще не надіслані записи зберігаються й після перезавантаження."
});
Object.assign(T.ru, {
  secondSelf:"Вы указаны вторым проверяющим. Допустить должен другой человек.",
  secondStep1:"Шаг 1 из 2 · Код: {n} (допускает)", secondStep2:"Шаг 2 из 2 · Код: {n} (второй проверяющий)",
  secondConfirms:"Своим кодом {n} подтверждает, что лично проверил работу.", secondCodeWrong:"Неверный код – здесь {n} должен ввести свой код.",
  alreadyTaken:"{kz} уже взял {n}.",
  qtyBad:"Введите количество целым числом от 1 до 999.",
  overTitle:"Больше, чем на складе", overText:"По учёту в ячейке {f} только {n} × {t}. Действительно списать {m}? Даниэль получит напоминание проверить остаток.", overBtn:"Всё равно списать",
  fbNeedOther:"Кратко опишите другую причину.",
  idleWarn:"Через 30 секунд автоматический выход (прошло 6 часов). Затем просто войдите снова.", draftKept:"Ваш отчёт сохранён как черновик.",
  kmLow:"Пробег меньше показаний телематики ({x} км) – проверьте.", kmHigh:"Пробег намного больше показаний телематики ({x} км) – проверьте.",
  codeLocked:"Слишком много неверных кодов. ID {id} заблокирован на 2 минуты.",
  needStage:"Этап «Пробная поездка» достигнут", delPhoto:"Удалить фото",
  artChanged:"Тип заказа изменён – чек-лист начинается заново.",
  restored:"Восстановлено неотправленных записей: {n}.", demoKeep:"Исключение: ещё не отправленные записи сохраняются и после перезагрузки."
});
Object.assign(T.ro, {
  secondSelf:"Ești trecut ca al doilea verificator. Aprobarea trebuie dată de altă persoană.",
  secondStep1:"Pasul 1 din 2 · Codul lui {n} (aprobă)", secondStep2:"Pasul 2 din 2 · Codul lui {n} (al doilea verificator)",
  secondConfirms:"Cu propriul cod, {n} confirmă că a verificat personal lucrarea.", secondCodeWrong:"Cod greșit – aici {n} trebuie să introducă propriul cod.",
  alreadyTaken:"{kz} a fost deja preluat de {n}.",
  qtyBad:"Introdu cantitatea ca număr întreg de la 1 la 999.",
  overTitle:"Mai mult decât în stoc", overText:"Conform stocului sunt doar {n} × {t} în raftul {f}. Sigur scoți {m}? Daniel primește o notă să verifice stocul.", overBtn:"Scoate oricum",
  fbNeedOther:"Descrie pe scurt celălalt motiv.",
  idleWarn:"Deconectare automată în 30 de secunde (au trecut 6 ore). Apoi conectează-te din nou.", draftKept:"Raportul tău rămâne salvat ca ciornă.",
  kmLow:"Kilometrajul este sub valoarea din telematică ({x} km) – verifică.", kmHigh:"Kilometrajul este mult peste valoarea din telematică ({x} km) – verifică.",
  codeLocked:"Prea multe coduri greșite. ID {id} este blocat 2 minute.",
  needStage:"Etapa „Probă pe drum” atinsă", delPhoto:"Șterge poza",
  artChanged:"Tipul comenzii schimbat – lista de verificare începe din nou.",
  restored:"{n} înregistrări netrimise restaurate.", demoKeep:"Excepție: înregistrările încă netrimise rămân și după reîncărcare."
});


const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const H = 36e5, NOW = Date.now();
const ago = h => new Date(NOW - h * H).toISOString();

/* ---------- Sprache ---------- */
let lang = "de", loginLang = "de";
const DEFAULT_LANG = { "40":"de", "41":"uk", "42":"ro", "43":"ru" };   // Demo: so starten die Beispiel-IDs
const KEY = id => "cevik_werkstatt_sprache_" + id;
function getLang(id){ try { const v = localStorage.getItem(KEY(id)); if (v && T[v]) return v; } catch(e){} return DEFAULT_LANG[id] || null; }
function setLang(id, v){ try { localStorage.setItem(KEY(id), v); } catch(e){} }
const t = (k, v) => { let s = (T[lang] && T[lang][k]) ?? T.de[k] ?? k; if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]); return s; };
const ck = txt => lang === "de" || !CK[txt] ? txt : CK[txt][["en","uk","ru","ro"].indexOf(lang)];
const locale = () => (LANGS.find(l => l.code === lang) || LANGS[0]).locale;
const seit = iso => { const h = (Date.now() - Date.parse(iso)) / H; return h < 1 ? Math.max(1, Math.round(h * 60)) + " " + t("uMin") : h < 24 ? Math.floor(h) + " " + t("uH") : Math.floor(h / 24) + " " + t("uD"); };
const uhr = iso => new Date(iso).toLocaleTimeString(locale(), {hour:"2-digit", minute:"2-digit"});
const eur = n => Number(n).toLocaleString(locale(), {style:"currency", currency:"EUR"});
const ini = n => String(n || "?").split(" ").map(w => w[0]).join("").slice(0,2);
const wer = w => w === "@auto" ? t("autoTele") : w;
const src = q => t("src:" + q);

/* ---------- Beispieldaten ---------- */
const STAFF = [
  { id:"40", code:"1111", name:"Thomas Krüger", rolle:"Mechaniker", koennen:[] },
  { id:"41", code:"2222", name:"Andrii Kovalenko", rolle:"Mechaniker", koennen:[] },
  { id:"42", code:"3333", name:"Ion Popescu", rolle:"Mechaniker", koennen:[] },
  { id:"43", code:"4444", name:"Dmitri Volkov", rolle:"Mechaniker", koennen:[] },
  { id:"44", code:"5555", name:"Neuer Kollege", rolle:"Mechaniker", koennen:[] }
];
const STAGES = ["Eingang","In Arbeit","Wartet auf Teil","Probefahrt","Fertig"];
const ARTEN = ["Reparatur","Service","Bremse","Reifen","Licht/Elektrik","SP-Vorbereitung","Abfahrtkontrolle","Lenkung/Achse"];
const VIER_AUGEN = ["Bremse","Lenkung/Achse"];
const KATEGORIEN = ["Reifen","Bremsen","Hydraulik","Motor/Getriebe","Elektrik","Standard"];   // Gerüst für spätere Zuweisung nach Können-Profil
const katVon = art => ({ "Bremse":"Bremsen", "Reifen":"Reifen", "Licht/Elektrik":"Elektrik" })[art] || "Standard";
const GRUENDE = ["r_tool","r_mat","r_stock","r_time","r_other"];
const CHECK = {
  "Service": ["Motoröl gewechselt","Ölfilter gewechselt","Luftfilter geprüft / gewechselt","Kraftstofffilter gewechselt","Kühlmittel und AdBlue geprüft","Sichtprüfung Unterboden, keine Undichtigkeit","km-Stand eingetragen"],
  "Bremse": ["Belagstärke gemessen","Bremsscheiben geprüft","Bremsleitungen dicht","Druckluftanlage dicht","Bremsprobe / Prüfstand bestanden"],
  "Reifen": ["Profiltiefe gemessen","Luftdruck eingestellt","Radmuttern mit Drehmoment angezogen","Nachziehen nach 50 km vermerkt","Reifenalter (DOT) geprüft"],
  "Licht/Elektrik": ["Fehler gefunden","Leuchte / Sicherung ersetzt","Alle Leuchten geprüft","Fehlerspeicher ausgelesen und gelöscht"],
  "SP-Vorbereitung": ["Bremsanlage geprüft","Lenkung geprüft","Achsen und Federung geprüft","Rahmen und Aufbau geprüft","Beleuchtung geprüft","Fehlerspeicher ausgelesen"],
  "Abfahrtkontrolle": ["Licht","Reifen und Räder","Bremsen","Spiegel und Scheiben","Flüssigkeiten","Ladungssicherung vorhanden"],
  "Reparatur": ["Fehler gefunden und behoben","Funktion geprüft","Fahrzeug sauber übergeben"],
  "Lenkung/Achse": ["Spurstangen und Gelenke geprüft","Lenkspiel geprüft","Achsvermessung durchgeführt","Schrauben mit Drehmoment angezogen"]
};
const TELE_KM = { "SZ-YC 5548":1084230, "SZ-YC 5517":1101480 };   // Demo: letzter Stand aus YellowFox
const LAGER = [
  { teil:"Bremsscheibe VA", nr:"BS-22.4711", fach:"B-12", bestand:2, preis:189.00 },
  { teil:"Bremsbelagsatz VA", nr:"BB-29.0871", fach:"B-14", bestand:4, preis:96.50 },
  { teil:"Ölfilter", nr:"OF-51.0553", fach:"A-03", bestand:6, preis:24.90 },
  { teil:"Luftfilter", nr:"LF-81.0841", fach:"A-05", bestand:1, preis:61.20 },
  { teil:"Kraftstofffilter", nr:"KF-51.1250", fach:"A-04", bestand:3, preis:38.40 },
  { teil:"Motoröl 10W-40 (Liter)", nr:"OEL-1040", fach:"Fass 1", bestand:180, preis:4.10 },
  { teil:"Rückleuchte rechts", nr:"RL-81.2520", fach:"C-02", bestand:0, preis:142.00 },
  { teil:"Reifen 315/70 R22.5", nr:"RF-31570", fach:"Reifenlager", bestand:5, preis:410.00 },
  { teil:"Außenspiegel rechts", nr:"SP-81.6371", fach:"C-08", bestand:1, preis:118.00 }
];
let auftraege = [
  { id:"A101", kz:"SZ-CM 5521", art:"Bremse", lvl:"Hoch", text:"Bremse hinten links schleift, Fahrer meldet Geräusch beim Bremsen", quelle:"Fahrer-Meldung", quelleWer:"Oleksii M.", stage:"Eingang", erstellt:ago(1.5), wer:"", checks:{}, teile:[], fotos:{vor:1,nach:0}, notiz:"" },
  { id:"A102", kz:"SZ-YC 5548", art:"Service", lvl:"Normal", text:"Ölwechsel + Filter fällig – noch 640 km bis zum Intervall", quelle:"Service fällig nach km", quelleWer:"@auto", stage:"Eingang", erstellt:ago(5), wer:"", checks:{}, teile:[], fotos:{vor:0,nach:0}, notiz:"", km:"" },
  { id:"A103", kz:"SZ-YC 5531", art:"Licht/Elektrik", lvl:"Normal", text:"Rückleuchte rechts ohne Funktion", quelle:"Daniel", quelleWer:"Daniel Sandner", stage:"In Arbeit", erstellt:ago(26), wer:"Andrii Kovalenko", checks:{0:true}, teile:[], fotos:{vor:1,nach:0}, notiz:"Stecker korrodiert, Leuchte trotzdem defekt" },
  { id:"A104", kz:"SZ-CM 5509", art:"Reifen", lvl:"Hoch", text:"Reifen vorne rechts nur noch 3 mm Profil – wechseln", quelle:"Daniel", quelleWer:"Daniel Sandner", stage:"In Arbeit", erstellt:ago(3), wer:"Ion Popescu", checks:{0:true,1:true}, teile:[{teil:"Reifen 315/70 R22.5", nr:"RF-31570", menge:1, preis:410.00}], fotos:{vor:2,nach:0}, notiz:"", profil:"3" },
  { id:"A105", kz:"SZ-YC 5513", art:"Bremse", lvl:"Kritisch", text:"Bremsscheiben und Beläge Vorderachse verschlissen", quelle:"Fahrer-Meldung", quelleWer:"Ruslan K.", stage:"Wartet auf Teil", erstellt:ago(30), wer:"Dmitri Volkov", checks:{0:true,1:true}, teile:[{teil:"Bremsbelagsatz VA", nr:"BB-29.0871", menge:1, preis:96.50}], fotos:{vor:3,nach:0}, notiz:"", warteTeil:"Bremsscheibe VA (2. Scheibe)", liefer:"morgen 10:00, Löchterfeld" },
  { id:"A106", kz:"SZ-CM 5536", art:"SP-Vorbereitung", lvl:"Normal", text:"Sicherheitsprüfung am Donnerstag vorbereiten", quelle:"Daniel", quelleWer:"Daniel Sandner", stage:"Probefahrt", erstellt:ago(28), wer:"Thomas Krüger", checks:{0:true,1:true,2:true,3:true,4:true,5:true}, teile:[], fotos:{vor:1,nach:1}, notiz:"Alles ohne Befund" },
  { id:"A107", kz:"SZ-YC 5517", art:"Service", lvl:"Normal", text:"Ölwechsel + Filter nach km", quelle:"Service fällig nach km", quelleWer:"@auto", stage:"Fertig", erstellt:ago(20), wer:"Andrii Kovalenko", checks:{0:true,1:true,2:true,3:true,4:true,5:true,6:true}, teile:[{teil:"Ölfilter", nr:"OF-51.0553", menge:1, preis:24.90},{teil:"Motoröl 10W-40 (Liter)", nr:"OEL-1040", menge:38, preis:4.10}], fotos:{vor:1,nach:1}, notiz:"", km:"1101520", probe:true, frei:{wer:"Thomas Krüger", zeit:ago(2.2)} }
];
let meldungen = [
  { id:"M1", kz:"SZ-YC 5552", text:"Außenspiegel rechts gebrochen, Glas lose", wer:"Yevhenii Z.", zeit:ago(0.6), lvl:"Hoch", eingestuft:ago(0.4), kat:"Standard", art:"Reparatur" },
  { id:"M2", kz:"SZ-CM 5527", text:"Kontrollleuchte AdBlue leuchtet seit heute früh", wer:"Cristian P.", zeit:ago(2.4), lvl:"Normal", eingestuft:ago(2), kat:"Motor/Getriebe", art:"Reparatur" }
];

/* ---------- Zustand ---------- */
let user = null, tab = "start", online = true, idle = 21600, abmeldenUm = 0, tick = null, entry = { step:"id", id:"", code:"" }, offenId = null;
const meister = () => !!user;        // alle Mechaniker gleichberechtigt
const preise = () => false;          // Preise nur im Admin-Panel (Yilmaz), nicht am Tablet
const pendings = () => auftraege.filter(a => a.pending).length;

function toast(x){ document.querySelectorAll(".toast").forEach(el => el.remove()); const el = document.createElement("div"); el.className = "toast"; el.textContent = x; document.body.appendChild(el); setTimeout(() => el.remove(), 2800); }
function aenderung(a){ if (!online) { a.pending = true; a.offline = true; } sichern(); renderNet(); }
/* Offline-Puffer dauerhaft im Gerät: solange etwas ungesendet ist, übersteht es auch Neuladen/Absturz (Echtbetrieb: IndexedDB) */
const STORE = "cevik_werkstatt_puffer";
function sichern(){ try { if (auftraege.some(a => a.pending && a.offline)) localStorage.setItem(STORE, JSON.stringify({ auftraege, meldungen, lager: LAGER.map(l => l.bestand) })); else localStorage.removeItem(STORE); } catch(e){} }
function laden(){ try { const x = JSON.parse(localStorage.getItem(STORE) || "null"); if (x && Array.isArray(x.auftraege)) { auftraege = x.auftraege; meldungen = Array.isArray(x.meldungen) ? x.meldungen : []; (x.lager || []).forEach((b, i) => { if (LAGER[i] && Number.isFinite(b)) LAGER[i].bestand = b; }); return pendings(); } } catch(e){} return 0; }
let sperreBis = 0, tippX = -999, tippY = -999, fbCtx = null;          // Entprellen gegen Doppeltipp · offene Rückmeldung (für Entwurf bei Auto-Logout)
const fehl = {};                           // falsche Codes je ID (Demo-Sperre; Echtbetrieb: Server-Sperre)

/* ---------- Feste Texte im Kopf ---------- */
function statisch(){
  document.documentElement.lang = lang;
  $("#sArea").textContent = t("area");
  $("#sLoc").innerHTML = esc(t("loc")) + " <small>· " + esc(t("tablet")) + "</small>"; $("#sLoc").title = t("locTitle");
  $("#timer").title = t("timerTitle");
  $("#logout").textContent = t("logout");
  $("#sDemo").innerHTML = t("demo") + " " + esc(t("demoKeep"));
  $("#wlan").textContent = online ? t("wlanOff") : t("wlanOn");
  $("#theme").textContent = document.documentElement.dataset.theme === "light" ? t("dark") : t("light");
  const l = LANGS.find(x => x.code === lang); $("#langBtn").textContent = "🌐 " + l.short; $("#langBtn").setAttribute("aria-label", t("lang") + ": " + l.name);
  if (user) $("#urole").textContent = t("role:" + user.rolle);
  showIdle(); renderNet();
}

/* ---------- WLAN / Puffer ---------- */
function renderNet(){
  const n = $("#net"); n.hidden = !user;
  const p = pendings();
  n.className = "net" + (!online ? " off" : p ? " wait" : "");
  n.innerHTML = !online ? `<i></i>${esc(t("netOff", {n:p}))}` : p ? `<i></i>${esc(t("netWait", {n:p}))} <button type="button" id="sendNow">${esc(t("send"))}</button>` : `<i></i>${esc(t("netOk"))}`;
}

/* ---------- Abmelde-Timer ---------- */
const DAUER = 6 * 3600;   // feste Anmeldedauer: 6 Stunden ab Anmeldung (nicht Leerlauf)
function resetIdle(){ abmeldenUm = Date.now() + DAUER * 1000; idle = DAUER; showIdle(); }
function showIdle(){ const el = $("#timer"); el.hidden = !user; el.classList.toggle("warn", !!user && idle <= 30); el.textContent = t("timer", {t: Math.floor(idle/3600) + ":" + String(Math.floor(idle/60)%60).padStart(2,"0") + ":" + String(idle%60).padStart(2,"0")}); }
function startTimer(){ clearInterval(tick); tick = setInterval(() => { if (!user) return; const vorher = idle; idle = Math.max(0, Math.ceil((abmeldenUm - Date.now()) / 1000)); showIdle(); if (vorher > 30 && idle <= 30 && idle > 0) toast(t("idleWarn")); if (idle <= 0) { const msg = t("autoLogout"), dk = t("draftKept"); const ent = abmelden(); toast(msg + (ent ? " " + dk : "")); } }, 1000); }

/* ---------- Anmeldung ---------- */
function loginView(msg){
  $("#userBox").hidden = true; $("#timer").hidden = true; $("#net").hidden = true;
  const val = entry.step === "id" ? entry.id : entry.code;
  const len = entry.step === "id" ? 2 : 4;
  const boxes = Array.from({length: len}, (_, i) => `<span class="${i === val.length ? "on" : ""}">${entry.step === "code" ? (val[i] ? "•" : "") : (val[i] || "")}</span>`).join("");
  const sprache = entry.step === "id" ? `<div class="langpick" role="group" aria-label="${esc(t("chooseLang"))}"><span class="step">${esc(t("chooseLang"))}</span><div class="langrow">${LANGS.map(l => `<button type="button" data-lang="${l.code}" aria-pressed="${l.code === lang}"><b>${l.short}</b><span>${esc(l.name)}</span></button>`).join("")}</div><span class="fine">${esc(t("langNote"))}</span></div>` : "";
  const demo = STAFF.map(s => { const g = getLang(s.id); return `<b>${s.id} / ${s.code}</b> ${esc(s.name.split(" ")[0])} · ${g ? esc(t("langStart")) + " " + LANGS.find(l => l.code === g).short : "—"}`; }).join("<br>");
  $("#view").innerHTML = `<section class="login" aria-live="polite">
    ${sprache}
    <span class="step">${entry.step === "id" ? esc(t("step1")) : esc(t("step2", {id: entry.id}))}</span>
    <h1>${entry.step === "id" ? esc(t("idTitle")) : esc(t("codeTitle"))}</h1>
    <div class="pinbox">${boxes}</div>
    <p class="err">${esc(msg || "")}</p>
    <div class="pad">${[1,2,3,4,5,6,7,8,9].map(n => `<button type="button" data-k="${n}">${n}</button>`).join("")}<button type="button" class="fn" data-k="back">${entry.step === "code" ? esc(t("back")) : esc(t("clear"))}</button><button type="button" data-k="0">0</button><button type="button" class="fn" data-k="del" aria-label="${esc(t("clear"))}">⌫</button></div>
    <p class="hint">${esc(t("demoUsers"))}:<br>${demo}</p>
  </section>`;
}
function taste(k){
  if (k === "back") { if (entry.step === "code") { entry = { step:"id", id:"", code:"" }; lang = loginLang; statisch(); } else entry.id = ""; return loginView(); }
  if (k === "del") { if (entry.step === "id") entry.id = entry.id.slice(0,-1); else entry.code = entry.code.slice(0,-1); return loginView(); }
  if (entry.step === "id") {
    entry.id += k;
    if (entry.id.length === 2) {
      if (!STAFF.some(s => s.id === entry.id)) { const bad = entry.id; entry.id = ""; return loginView(t("idUnknown", {id: bad})); }
      if (fehl[entry.id] && fehl[entry.id].bis > Date.now()) { const g = entry.id; entry.id = ""; return loginView(t("codeLocked", {id: g})); }
      entry.step = "code";
      const g = getLang(entry.id); if (g) { lang = g; statisch(); }   // ab hier in der gespeicherten Sprache dieser ID
    }
    return loginView();
  }
  entry.code += k;
  if (entry.code.length < 4) return loginView();
  const s = STAFF.find(x => x.id === entry.id && x.code === entry.code);
  if (!s) {
    const f = fehl[entry.id] = fehl[entry.id] || { n:0, bis:0 }; f.n++;
    if (f.n >= 5) { f.n = 0; f.bis = Date.now() + 120000; const g = entry.id; entry = { step:"id", id:"", code:"" }; lang = loginLang; statisch(); return loginView(t("codeLocked", {id: g})); }
    entry.code = ""; return loginView(t("codeWrong"));
  }
  delete fehl[s.id];
  const gewaehlt = entry.langWahl;
  user = s; entry = { step:"id", id:"", code:"" }; tab = "start";
  if (gewaehlt || !hasStored(s.id)) setLang(s.id, lang);       // Sprache erst nach gültigem Code zur ID speichern
  $("#userBox").hidden = false; $("#avatar").textContent = ini(s.name); $("#uname").textContent = s.name;
  statisch(); resetIdle(); startTimer(); render();
}
function hasStored(id){ try { return !!localStorage.getItem(KEY(id)); } catch(e){ return false; } }
function abmelden(){
  let ent = false;
  const oa = offenId && auftraege.find(x => x.id === offenId), nz = $("[data-notiz]");
  if (oa && nz && oa.stage !== "Fertig") oa.notiz = nz.value;
  ent = fbEntwurf();
  fbCtx = null; user = null; offenId = null; $("#layer").innerHTML = ""; kleinZu(); clearInterval(tick); loginLang = "de"; lang = "de"; statisch(); loginView(); return ent; }

/* ---------- Tafel ---------- */
function render(){
  if (!user) return loginView();
  const c = s => auftraege.filter(a => a.stage === s).length;
  const vorname = user.name.split(" ")[0];
  const h = new Date().getHours(), gruss = h < 11 ? t("gm") : h < 18 ? t("hi") : t("ge");
  const eingang = c("Eingang") + meldungen.length, warten = c("Wartet auf Teil");
  const meine = auftraege.filter(a => a.wer === user.name && a.stage !== "Fertig").length;
  const satz = !eingang && !meine ? esc(t("allClear")) : `${eingang ? `<em>${esc(t("inEingang", {n:eingang}))}</em> ` : ""}${meine ? esc(t("headMine", {n:meine})) : ""}`;
  const body = tab === "stempeln" ? stempeln() : tab === "alle" ? tafel() : start();
  $("#view").innerHTML = `<section class="head"><small>${new Date().toLocaleDateString(locale(),{weekday:"long",day:"numeric",month:"long"})} · ${esc(t("today"))}</small>
      <h1>${esc(gruss)}, ${esc(vorname)}. ${satz}</h1></section>
    <nav class="nav" aria-label="${esc(t("board"))}">
      <button class="tabbtn" type="button" data-tab="start" aria-pressed="${tab === "start"}">${esc(t("tabStart"))}</button>
      <button class="tabbtn quiet" type="button" data-tab="alle" aria-pressed="${tab === "alle"}">${esc(t("tabAll"))} <span class="cnt">${auftraege.filter(a => a.stage !== "Fertig").length}</span></button>
      ${meister() ? `<button class="tabbtn quiet" type="button" data-tab="stempeln" aria-pressed="${tab === "stempeln"}">${esc(t("stamp"))} <span class="lock">${esc(t("notActive"))}</span></button>` : ""}
      <span class="spacer"></span>
      <button class="btn" type="button" data-new="1">${esc(t("newOrder"))}</button>
    </nav>${body}`;
}
function karte(a){
  const vier = VIER_AUGEN.includes(a.art);
  const next = a.stage !== "Fertig" ? t("next:" + a.stage) : "";
  return `<div style="display:flex;flex-direction:column;gap:6px">
    <button type="button" class="card" data-open="${a.id}" data-lvl="${esc(a.lvl)}" data-done="${a.stage === "Fertig" ? 1 : 0}">
      <span class="top"><span class="plate">${esc(a.kz)}</span><span class="art">${esc(t("cat:" + (a.kat || katVon(a.art))))}</span></span>
      <span class="txt">${esc(a.text)}</span>
      <span class="chips">${a.stage !== "Fertig" ? `<span class="chip ${a.lvl === "Kritisch" ? "alert" : a.lvl === "Hoch" ? "warn" : ""}">${esc(t("lvl:" + a.lvl))}</span>` : `<span class="chip ok">${esc(t("roadworthy"))} ${a.frei ? uhr(a.frei.zeit) : ""}</span>`}${vier && a.stage !== "Fertig" ? `<span class="chip info">${esc(t("fourEyes"))}</span>` : ""}${a.stage === "Wartet auf Teil" && a.liefer ? `<span class="chip">${esc(t("partChip", {x: a.liefer}))}</span>` : ""}${a.liegen ? `<span class="chip alert">${esc(t("stuckChip"))}</span>` : ""}${a.rueck && a.rueck.length ? `<span class="chip info">✉ ${esc(t("fbTitle"))}</span>` : ""}${a.pending ? `<span class="chip pend">${esc(t("pending"))}</span>` : ""}</span>
      <span class="meta"><span>${esc(src(a.quelle))} · ${esc(t("since", {x: seit(a.erstellt)}))}</span>${a.wer ? `<span class="ini" title="${esc(a.wer)}">${ini(a.wer)}</span>` : `<span>${esc(t("free"))}</span>`}</span>
    </button>
    ${next ? `<button type="button" class="btn go" data-next="${a.id}" data-from="${a.stage}">${esc(next)} →</button>` : ""}
  </div>`;
}
/* ---------- Startansicht: "Was ist neu?" und "Woran arbeite ich?" ---------- */
function start(){
  const R = {Kritisch:0,Hoch:1,Normal:2};
  const neu = [
    ...meldungen.map(m => ({ typ:"m", id:m.id, kz:m.kz, lvl:m.lvl, kat:m.kat || "Standard", text:m.text, quelle:"Fahrer-Meldung", zeit:m.zeit })),
    ...auftraege.filter(a => a.stage === "Eingang").map(a => ({ typ:"a", id:a.id, kz:a.kz, lvl:a.lvl, kat:a.kat || katVon(a.art), text:a.text, quelle:a.quelle, zeit:a.erstellt }))
  ].sort((x,y) => R[x.lvl] - R[y.lvl] || Date.parse(x.zeit) - Date.parse(y.zeit));
  const meine = auftraege.filter(a => a.wer === user.name && a.stage !== "Fertig" && a.stage !== "Eingang")
    .sort((x,y) => R[x.lvl] - R[y.lvl] || Date.parse(x.erstellt) - Date.parse(y.erstellt));
  const lvlChip = l => `<span class="chip ${l === "Kritisch" ? "alert" : l === "Hoch" ? "warn" : ""}">${esc(t("lvl:" + l))}</span>`;
  const neuKarte = x => `<article class="big" data-lvl="${esc(x.lvl)}">
      <div class="b-main" ${x.typ === "a" ? `data-open="${x.id}" role="button" tabindex="0"` : ""}>
        <div class="b-top"><span class="plate xl">${esc(x.kz)}</span>${lvlChip(x.lvl)}</div>
        <div class="b-kat">${esc(t("cat:" + x.kat))} · ${esc(src(x.quelle))} · ${esc(seit(x.zeit))}</div>
        <div class="b-txt">${esc(x.text)}</div>
        ${x.typ === "m" ? `<span class="chip info">✓ ${esc(t("fromDaniel"))}</span>` : ""}
      </div>
      <div class="b-act"><button type="button" class="btn primary huge" data-take="${x.typ}:${x.id}">${esc(t("take"))}</button></div>
    </article>`;
  const schritt = a => a.stage === "In Arbeit" ? `<button type="button" class="btn primary huge" data-step="${a.id}" data-from="${a.stage}">${esc(t("btnToTest"))} →</button>`
    : a.stage === "Wartet auf Teil" ? `<button type="button" class="btn primary huge" data-step="${a.id}" data-from="${a.stage}">${esc(t("btnPartIn"))} →</button>`
    : `<button type="button" class="btn ok huge" data-step="${a.id}" data-from="${a.stage}">✓ ${esc(t("btnRelease"))}</button>`;
  const meinKarte = a => `<article class="big" data-lvl="${esc(a.lvl)}">
      <div class="b-main" data-open="${a.id}" role="button" tabindex="0">
        <div class="b-top"><span class="plate xl">${esc(a.kz)}</span>${lvlChip(a.lvl)}<span class="chip">${esc(t("stage:" + a.stage))}</span>${a.liegen ? `<span class="chip alert">${esc(t("stuckChip"))}</span>` : ""}${a.pending ? `<span class="chip pend">${esc(t("pending"))}</span>` : ""}</div>
        <div class="b-kat">${esc(t("cat:" + (a.kat || katVon(a.art))))} · ${esc(t("since", {x: seit(a.erstellt)}))}${a.stage === "Wartet auf Teil" && a.liefer ? " · " + esc(t("partChip", {x: a.liefer})) : ""}</div>
        <div class="b-txt">${esc(a.text)}</div>
      </div>
      <div class="b-act">${schritt(a)}
        <div class="b-small">${a.stage === "In Arbeit" ? `<button type="button" class="btn" data-wait="${a.id}">${esc(t("btnWait"))}</button>` : ""}<button type="button" class="btn" data-stuckq="${a.id}">⚠ ${esc(t("btnStuck"))}</button></div>
      </div>
    </article>`;
  return `<section class="block"><div class="blk-h"><h2>${esc(t("newIn"))}</h2><span class="n">${neu.length}</span></div>
      ${neu.length ? neu.map(neuKarte).join("") : `<div class="calm">${esc(t("nothingNew"))}</div>`}
      <p class="fine">${esc(t("triageNote"))}</p></section>
    <section class="block"><div class="blk-h"><h2>${esc(t("mine"))}</h2><span class="n">${meine.length}</span></div>
      ${meine.length ? meine.map(meinKarte).join("") : `<div class="calm">${esc(t("nothingMine"))}</div>`}</section>`;
}
function uebernehmen(typ, id){
  let a;
  if (typ === "m") {
    const m = meldungen.find(x => x.id === id); if (!m) return render();
    a = { id:"A" + (200 + auftraege.length), kz:m.kz, art:m.art || "Reparatur", kat:m.kat || "Standard", lvl:m.lvl, text:m.text, quelle:"Fahrer-Meldung", quelleWer:m.wer, stage:"In Arbeit", erstellt:m.zeit, wer:user.name, checks:{}, teile:[], fotos:{vor:1, nach:0}, notiz:"" };
    auftraege.push(a); meldungen = meldungen.filter(x => x !== m);
  } else {
    a = auftraege.find(x => x.id === id); if (!a) return;
    if (a.stage !== "Eingang") { render(); return toast(t("alreadyTaken", {kz: a.kz, n: a.wer || "?"})); }   // Echtbetrieb: Server prüft zusätzlich
    a.wer = user.name; a.stage = "In Arbeit"; a.liegen = false;
  }
  aenderung(a); render(); toast(t("toastTaken", {kz: a.kz}));
}
function naechsterSchritt(a){
  if (a.stage === "In Arbeit" || a.stage === "Wartet auf Teil") {
    a.stage = a.stage === "In Arbeit" ? "Probefahrt" : "In Arbeit"; a.liegen = false;
    aenderung(a); render(); return toast(`${a.kz}: ${t("stage:" + a.stage)}`);
  }
  if (a.stage === "Probefahrt") {
    const offen = reqs(a).filter(r => !r.ok);
    if (offen.length) { oeffnen(a.id); return toast(t("needChecks")); }
    return rueckmeldung(a, "fertig", r => freigabe(a, r));
  }
}
function tafel(){
  const R = {Kritisch:0,Hoch:1,Normal:2};
  const cols = STAGES.map((s, i) => {
    const list = auftraege.filter(a => a.stage === s).sort((x,y) => R[x.lvl] - R[y.lvl] || Date.parse(x.erstellt) - Date.parse(y.erstellt));
    const mel = s === "Eingang" ? `<p class="fine">${esc(t("triageNote"))}</p>` + meldungen.map(m => `<div class="mel"><span class="lbl">${esc(t("newReport", {x: seit(m.zeit)}))}</span>
        <div class="chips"><span class="chip ${m.lvl === "Kritisch" ? "alert" : m.lvl === "Hoch" ? "warn" : ""}">${esc(t("lvl:" + m.lvl))}</span><span class="chip info">✓ ${esc(t("fromDaniel"))}</span></div>
        <div class="row2"><span class="thumb">${esc(t("photo"))}</span><div><span class="plate">${esc(m.kz)}</span><div style="font-weight:600;margin-top:4px">${esc(m.text)}</div><div class="who">${esc(m.wer)}</div></div></div>
        <button type="button" class="btn primary" data-wandle="${m.id}">${esc(t("takeOver"))}</button></div>`).join("") : "";
    const shown = s === "Fertig" ? list.filter(a => a.frei && (Date.now() - Date.parse(a.frei.zeit)) < 24 * H) : list;
    return `<section class="col" aria-label="${esc(t("stage:" + s))}"><div class="col-h"><h2><span class="stepn">${i + 1}</span>${esc(t("stage:" + s))}</h2><span class="n">${s === "Eingang" ? list.length + meldungen.length : shown.length}</span></div>
      ${mel}${shown.map(karte).join("") || (mel ? "" : `<div class="empty">${esc(s === "Fertig" ? t("emptyDone") : t("emptyCol"))}</div>`)}</section>`;
  }).join("");
  return `<div class="board">${cols}</div><p class="fine">${esc(t("boardNote"))}</p>`;
}

/* ---------- Stempeln (vorbereitet) ---------- */
function stempeln(){
  const j = x => esc(t(x ? "yes" : "no"));
  return `<section class="inactive"><b>${esc(t("inactiveTitle"))}</b><span>${esc(t("inactiveText"))}</span></section>
    <section class="stamp" aria-label="${esc(t("stamp"))}">
      <button type="button" disabled>${esc(t("sIn"))}<small>${esc(t("sInSub"))}</small></button>
      <button type="button" disabled>${esc(t("sPause"))}<small>${esc(t("sPauseSub"))}</small></button>
      <button type="button" disabled>${esc(t("sWork"))}<small>${esc(t("sWorkSub"))}</small></button>
      <button type="button" disabled>${esc(t("sOut"))}<small>${esc(t("sOutSub"))}</small></button>
    </section>
    <section class="panel"><h2 style="font-size:1.2rem">${esc(t("whoSees"))}</h2>
      <div class="tbl-wrap"><table class="who-sees"><thead><tr><th>${esc(t("wsWhat"))}</th><th>${esc(t("wsEmp"))}</th><th>Daniel</th><th>Yilmaz</th></tr></thead><tbody>
        <tr><td>${esc(t("wsRow1"))}</td><td>${j(1)}</td><td>${j(0)}</td><td>${j(1)}</td></tr>
        <tr><td>${esc(t("wsRow2"))}</td><td>${j(0)}</td><td>${j(0)}</td><td>${j(1)}</td></tr>
        <tr><td>${esc(t("wsRow3"))}</td><td>${j(1)}</td><td>${j(1)}</td><td>${j(1)}</td></tr>
      </tbody></table></div>
      <p class="fine">${esc(t("stampNote"))}</p></section>`;
}

/* ---------- Detailblatt ---------- */
function reqs(a){
  const items = CHECK[a.art] || [];
  const alle = items.every((_, i) => a.checks[i]);
  const kmP = kmPruef(a), km = a.art !== "Service" || kmP.ok;
  const foto = !a.teile.length || a.fotos.nach > 0;
  const vier = !VIER_AUGEN.includes(a.art) || (!!a.zweit && a.zweit !== user.name);
  return [
    { ok: a.stage === "Probefahrt", t: t("needStage") },
    { ok: alle, t: t("checklistDone", {a: items.filter((_, i) => a.checks[i]).length, b: items.length}) },
    ...(a.art === "Service" ? [{ ok: km, t: kmP.msg || ck("km-Stand eingetragen") }] : []),
    { ok: !!a.probe, t: t("testDrive") },
    ...(a.teile.length ? [{ ok: foto, t: t("photoAfter") }] : []),
    ...(VIER_AUGEN.includes(a.art) ? [{ ok: vier, t: t("second") }] : [])
  ];
}
function kmPruef(a){
  const s = String(a.km || ""); if (!/^\d{4,7}$/.test(s)) return { ok:false };
  const tele = TELE_KM[a.kz], k = Number(s); if (!tele) return { ok:true };
  const x = tele.toLocaleString(locale());
  if (k < tele) return { ok:false, msg: t("kmLow", {x}) };
  if (k > tele + 3000) return { ok:false, msg: t("kmHigh", {x}) };
  return { ok:true };
}
function oeffnen(id){
  const a = auftraege.find(x => x.id === id); if (!a) return; offenId = id;
  const items = CHECK[a.art] || [];
  const rq = reqs(a), bereit = rq.every(r => r.ok);
  const vier = VIER_AUGEN.includes(a.art);
  const fertig = a.stage === "Fertig";
  const andere = STAFF.filter(s => (s.id !== user.id || a.zweit === s.name) && s.name !== "Neuer Kollege");
  const summe = a.teile.reduce((s, x) => s + x.menge * (x.preis || 0), 0);
  const checks = items.map((txt, i) => {
    const isKm = a.art === "Service" && txt === "km-Stand eingetragen";
    const isProfil = a.art === "Reifen" && txt === "Profiltiefe gemessen";
    return `<label class="ck ${a.checks[i] ? "done" : ""}"><input type="checkbox" data-ck="${i}" ${a.checks[i] ? "checked" : ""} ${fertig ? "disabled" : ""}>${esc(ck(txt))}
      ${isKm ? `<span class="val"><input class="field" inputmode="numeric" data-km="1" placeholder="${esc(t("kmPh"))}" value="${esc(a.km || "")}" ${fertig ? "disabled" : ""}></span>` : ""}
      ${isProfil ? `<span class="val"><input class="field" inputmode="decimal" data-profil="1" placeholder="mm" value="${esc(a.profil || "")}" style="width:90px"> mm</span>` : ""}</label>`;
  }).join("");
  const teile = a.teile.map(x => `<div class="part"><span class="nm"><b>${esc(x.teil)}</b><small>${esc(x.nr === "@ohne" ? t("noNr") : x.nr)}</small></span><span class="q">${x.ueber ? "⚠ " : ""}${x.menge} ×</span>${preise() ? `<span class="pr">${x.preis ? eur(x.preis * x.menge) : "—"}</span>` : ""}</div>`).join("");
  const lagerOpts = LAGER.map(l => `<option value="${esc(l.teil)}">${esc(l.teil)} · ${esc(t("bin"))} ${esc(l.fach)} · ${esc(l.bestand ? t("inStock", {n:l.bestand}) : t("emptyStock"))}</option>`).join("");
  const lbl = `style="display:flex;flex-direction:column;gap:6px;font-weight:600"`;
  $("#layer").innerHTML = `<div class="overlay" data-close="1"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="shT">
    <div class="sh-head"><div class="t"><span><span class="plate">${esc(a.kz)}</span></span><h2 id="shT">${esc(t("art:" + a.art))} · ${esc(t("lvl:" + a.lvl))}${vier ? " · " + esc(t("fourEyes")) : ""}</h2></div><button type="button" class="sh-x" data-close="1" aria-label="${esc(t("close"))}">×</button></div>
    <div class="sh-body">
      <section><p class="problem">${esc(a.text)}</p>
        <div class="facts"><div><small>${esc(t("source"))}</small><b>${esc(src(a.quelle))}</b><span class="fine">${esc(wer(a.quelleWer))}</span></div><div><small>${esc(t("sinceL"))}</small><b>${seit(a.erstellt)}</b><span class="fine">${new Date(a.erstellt).toLocaleString(locale(),{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</span></div>
        <div><small>${esc(t("assignee"))}</small>${fertig ? `<b>${esc(a.wer || "—")}</b>` : `<select class="field" data-wer="1"><option value="">${esc(t("freeOpt"))}</option>${STAFF.filter(s => s.name !== "Neuer Kollege").map(s => `<option${s.name === a.wer ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select>`}</div>
        <div><small>${esc(t("type"))}</small>${fertig ? `<b>${esc(t("art:" + a.art))}</b>` : `<select class="field" data-art="1">${ARTEN.map(x => `<option value="${x}"${a.art === x ? " selected" : ""}>${esc(t("art:" + x))}</option>`).join("")}</select>`}</div>
        <div><small>${esc(t("category"))}</small>${fertig ? `<b>${esc(t("cat:" + (a.kat || katVon(a.art))))}</b>` : `<select class="field" data-kat="1">${KATEGORIEN.map(k => `<option value="${k}"${(a.kat || katVon(a.art)) === k ? " selected" : ""}>${esc(t("cat:" + k))}</option>`).join("")}</select>`}</div>
        ${a.pending ? `<div><small>${esc(t("transfer"))}</small><b style="color:var(--high)">${esc(t("pending"))}</b><span class="fine">${esc(t("resend"))}</span></div>` : ""}</div><p class="fine">${esc(t("skillNote"))}</p></section>
      <section class="fb-sec"><h3>${esc(t("fbTitle"))} <span class="chip info">→ ${esc(t("fbBadge"))}</span></h3>
        ${a.rueck && a.rueck.length ? a.rueck.map(fbKarte).join("") : `<div class="empty">${esc(t("fbNone"))}</div>`}
        ${!fertig ? `<button type="button" class="btn" data-stuck="1">⚠ ${esc(t("stuck"))}</button>` : ""}</section>
      <section><h3>${esc(t("stageL"))}</h3><div class="stages">${STAGES.map((s, i) => `<button type="button" data-stage="${s}" aria-pressed="${a.stage === s}" class="${STAGES.indexOf(a.stage) > i ? "past" : ""}" ${s === "Fertig" || fertig ? "disabled" : ""}><small>${i + 1}</small>${esc(t("stage:" + s))}</button>`).join("")}</div>
        ${a.stage === "Wartet auf Teil" ? `<div class="note-box warn"><b>${esc(t("waitingFor"))}</b> ${esc(a.warteTeil || "—")} · ${esc(t("delivery"))} ${esc(a.liefer || t("openL"))}. ${esc(t("noEscalation"))}</div>` : ""}
        <p class="fine">${esc(t("doneOnly"))}</p></section>
      <section><h3>${esc(t("checklist"))} · ${esc(t("art:" + a.art))} <span class="fine">${items.filter((_, i) => a.checks[i]).length}/${items.length}</span></h3><div class="checks">${checks}</div>
        ${a.art === "Service" ? `<div class="note-box">${esc(t("serviceNote"))}</div>` : ""}</section>
      <section><h3>${esc(t("photos"))}</h3><div class="photos">
        <div class="grp"><b>${esc(t("before"))}</b><div class="ph-row">${Array.from({length:a.fotos.vor}, (_, i) => `<span class="ph">${esc(t("photo"))} ${i + 1}${!fertig ? `<button type="button" class="ph-del" data-delfoto="vor" aria-label="${esc(t("delPhoto"))}">×</button>` : ""}</span>`).join("")}${!fertig ? `<button type="button" class="ph add" data-foto="vor" aria-label="${esc(t("takePhoto"))} – ${esc(t("before"))}">+</button>` : ""}</div></div>
        <div class="grp"><b>${esc(t("after"))}</b><div class="ph-row">${Array.from({length:a.fotos.nach}, (_, i) => `<span class="ph">${esc(t("photo"))} ${i + 1}${!fertig ? `<button type="button" class="ph-del" data-delfoto="nach" aria-label="${esc(t("delPhoto"))}">×</button>` : ""}</span>`).join("")}${!fertig ? `<button type="button" class="ph add" data-foto="nach" aria-label="${esc(t("takePhoto"))} – ${esc(t("after"))}">+</button>` : ""}</div></div></div>
        <p class="fine">${esc(t("photoNote"))}</p></section>
      <section><h3>${esc(t("parts"))} ${preise() && a.teile.length ? `<span class="fine">${esc(t("sum", {x: eur(summe)}))}</span>` : ""}</h3>
        <div class="parts">${teile || `<div class="empty">${esc(t("noParts"))}</div>`}</div>
        ${!fertig ? `<div class="addpart"><label>${esc(t("partSearch"))}<input class="field" list="lagerList" id="pTeil" placeholder="${esc(t("partPh"))}"></label><label>${esc(t("qty"))}<input class="field" id="pMenge" inputmode="numeric" value="1"></label><span></span><button type="button" class="btn" data-addteil="1">${esc(t("addPart"))}</button></div><datalist id="lagerList">${lagerOpts}</datalist>
        <p class="fine">${esc(t("partsNote"))} ${esc(t("priceNote"))}</p>` : ""}</section>
      <section><h3>${esc(t("finding"))}</h3><textarea class="field" data-notiz="1" placeholder="${esc(t("findingPh"))}" ${fertig ? "disabled" : ""}>${esc(a.notiz)}</textarea></section>
      <section><h3>${esc(t("release"))}</h3>
        ${fertig ? `<div class="done-box"><span class="tick">✓</span><span>${esc(t("released", {w: a.frei.wer, t: uhr(a.frei.zeit)}))}${a.frei.zweit ? " · " + esc(t("fourEyes")) + ": " + esc(a.frei.zweit) : ""}${a.art === "Service" ? " " + esc(t("serviceReset")) : ""}</span></div>` :
        `<div class="release ${bereit ? "ready" : ""}">
          <label class="ck ${a.probe ? "done" : ""}"><input type="checkbox" data-probe="1" ${a.probe ? "checked" : ""}>${esc(t("testDriveOk"))}</label>
          ${vier ? `<label class="ck ${a.zweit ? "done" : ""}">${esc(t("secondBy"))}<span class="val"><select class="field" data-zweit="1" style="width:200px"><option value="">${esc(t("pleaseChoose"))}</option>${andere.map(s => `<option${a.zweit === s.name ? " selected" : ""}>${esc(s.name)}</option>`).join("")}</select></span></label>` : ""}
          ${vier && a.zweit === user.name ? `<div class="note-box warn">${esc(t("secondSelf"))}</div>` : ""}
          ${rq.map(r => `<div class="req ${r.ok ? "ok" : "no"}"><i>${r.ok ? "✓" : "–"}</i>${esc(r.t)}</div>`).join("")}
          <p class="fine">${esc(bereit ? t("ready") : t("notReady"))} ${esc(t("fbStep"))}</p>
          <button type="button" class="btn ok big" data-frei="1" ${bereit ? "" : "disabled"}>${esc(t("releaseBtn"))}</button>
        </div>`}
      </section>
    </div>
  </div></div>`;
}
function fbKarte(r){
  const L = LANGS.find(l => l.code === r.lang) || LANGS[0];
  const zeile = (lbl, txt) => txt ? `<div><small>${esc(lbl)}</small><div>${esc(txt)}</div></div>` : "";
  const grund = r.grund ? T.de[r.grund] + (r.grundText ? ": " + r.grundText : "") : "";
  return `<div class="fb ${r.art === "liegen" ? "stuck" : ""}"><div class="fb-h"><b>${esc(r.art === "liegen" ? t("fbKindStuck") : t("fbKindDone"))}</b><span class="fine">${esc(r.wer)} · ${uhr(r.zeit)} · ${r.weg === "mic" ? "🎤" : "⌨"}</span></div>
    <div class="fb-cols">
      ${r.lang !== "de" ? `<div class="fb-col"><span class="fb-l">${esc(t("fbOrig", {l: L.name}))}</span>${zeile(T[r.lang].fbDone, r.gemacht)}${zeile(T[r.lang].fbNot, r.nicht)}${r.grund ? zeile(T[r.lang].fbWhy, T[r.lang][r.grund] + (r.grundText ? ": " + r.grundText : "")) : ""}</div>` : ""}
      <div class="fb-col de"><span class="fb-l">${esc(t("fbDe"))}</span>${zeile(T.de.fbDone, r.de.gemacht)}${zeile(T.de.fbNot, r.de.nicht)}${grund ? zeile(T.de.fbWhy, r.lang !== "de" && r.grundText ? T.de[r.grund] + ": " + (r.de.grundText || T.de.trPending) : grund) : ""}</div>
    </div></div>`;
}
/* Rückmeldung: sprechen (Demo: Beispieltext) oder tippen; Original + deutsche Fassung werden gespeichert */
function rueckmeldung(a, art, weiter){
  let grund = "", weg = "tipp";
  const ent = a.entwurf || {};
  const lbl = `style="display:flex;flex-direction:column;gap:6px;font-weight:600"`;
  const d = klein(t("fbTitle"), `<p style="margin:0"><span class="plate">${esc(a.kz)}</span> ${esc(art === "liegen" ? t("fbKindStuck") : t("fbKindDone"))} · <span class="chip info">→ ${esc(t("fbBadge"))}</span></p>
    <button type="button" class="btn big mic" id="fbMic">🎤 ${esc(t("fbMic"))}</button><p class="fine">${esc(t("fbMicNote"))}</p>
    <p class="fine" style="text-align:center;font-weight:600">— ${esc(t("fbType"))} —</p>
    <label ${lbl}>${esc(t("fbDone"))}<textarea class="field" id="fbG">${esc(ent.gemacht || "")}</textarea></label>
    <label ${lbl}>${esc(t("fbNot"))}<textarea class="field" id="fbN">${esc(ent.nicht || "")}</textarea></label>
    <div><b>${esc(t("fbWhy"))}</b><div class="seg why" id="fbW" style="margin-top:6px">${GRUENDE.map(g => `<button type="button" data-g="${g}" aria-pressed="false">${esc(t(g))}</button>`).join("")}</div></div>
    <input class="field" id="fbO" placeholder="${esc(t("fbOtherPh"))}" value="${esc(ent.grundText || "")}">
    <p class="fine">${esc(t("fbDemoTr"))}</p>`,
    `<button type="button" class="btn" data-close2="1">${esc(t("cancel"))}</button><button type="button" class="btn primary" id="fbOk">${esc(t("fbSave"))}</button>`);
  const setG = g => { grund = g; d.querySelectorAll("#fbW button").forEach(x => x.setAttribute("aria-pressed", x.dataset.g === g)); };
  if (ent.grund) setG(ent.grund);
  fbCtx = { a, d, grund: () => grund };
  d.querySelector("#fbW").onclick = e => { const b = e.target.closest("[data-g]"); if (b) setG(b.dataset.g); };
  d.querySelector("#fbMic").onclick = () => { const ex = FB_EX[lang]; d.querySelector("#fbG").value = ex.gemacht; d.querySelector("#fbN").value = ex.nicht; setG("r_stock"); weg = "mic"; };
  d.querySelector("#fbOk").onclick = () => {
    const g = d.querySelector("#fbG").value.trim(), n = d.querySelector("#fbN").value.trim(), o = d.querySelector("#fbO").value.trim();
    if (!g && art !== "liegen") { d.querySelector("#kErr").textContent = t("fbNeed"); return; }
    if ((n || art === "liegen") && !grund) { d.querySelector("#kErr").textContent = t("fbNeedWhy"); return; }
    if (grund === "r_other" && !o) { d.querySelector("#kErr").textContent = t("fbNeedOther"); return; }
    const ex = FB_EX[lang], istBeispiel = g === ex.gemacht && n === ex.nicht;
    const uebersetzt = txt => lang === "de" || !txt ? txt : istBeispiel ? (txt === ex.gemacht ? FB_EX.de.gemacht : FB_EX.de.nicht) : txt + " " + T.de.trPending;
    const r = { art, zeit:new Date().toISOString(), wer:user.name, lang, weg, gemacht:g, nicht:n, grund, grundText:o,
      de:{ gemacht: uebersetzt(g), nicht: uebersetzt(n), grundText: lang === "de" ? o : (o ? o + " " + T.de.trPending : "") } };
    fbCtx = null;
    if (weiter) {                       // Freigabe: Rückmeldung erst nach gültigem Code speichern
      a.entwurf = { gemacht:g, nicht:n, grund, grundText:o }; kleinZu(); return weiter(r);
    }
    (a.rueck = a.rueck || []).push(r); delete a.entwurf;
    if (art === "liegen") a.liegen = true;
    aenderung(a); kleinZu(); toast(t("fbSent"));
    render(); nachOeffnen();
  };
}
function zu(){ offenId = null; $("#layer").innerHTML = ""; render(); }
function nachOeffnen(){ if (offenId) { const top = ($(".sheet") || {}).scrollTop || 0; oeffnen(offenId); const s = $(".sheet"); if (s) s.scrollTop = top; } }

/* Kleine Blätter: Code, Wartet auf Teil, Auftrag anlegen, Sprache */
function klein(titel, inhalt, foot){
  const d = document.createElement("div"); d.className = "overlay"; d.dataset.close2 = "1"; d.style.zIndex = 55;
  d.innerHTML = `<div class="sheet small" role="dialog" aria-modal="true"><div class="sh-head"><div class="t"><h2>${esc(titel)}</h2></div><button type="button" class="sh-x" data-close2="1" aria-label="${esc(t("close"))}">×</button></div><div class="sh-body">${inhalt}<p class="err" id="kErr" style="color:var(--sos);font-weight:600;margin:0"></p></div>${foot ? `<div class="foot">${foot}</div>` : ""}</div>`;
  document.body.appendChild(d); return d;
}
/* Offene Rückmeldung als Entwurf sichern (beim Schließen, Escape, Auto-Logout) – nichts Getipptes geht verloren */
function fbEntwurf(){
  if (!fbCtx || !document.body.contains(fbCtx.d)) { fbCtx = null; return false; }
  const v = q => ((fbCtx.d.querySelector(q) || {}).value || "").trim();
  const e = { gemacht:v("#fbG"), nicht:v("#fbN"), grundText:v("#fbO"), grund:fbCtx.grund() };
  const a = fbCtx.a; fbCtx = null;
  if (e.gemacht || e.nicht || e.grundText) { a.entwurf = e; return true; }
  return false;
}
function kleinZu(){ const ent = user && fbEntwurf(); document.querySelectorAll("[data-close2].overlay").forEach(x => x.remove()); if (ent) toast(t("draftKept")); }

function spracheDialog(){
  klein(t("chooseLang"), `<div class="langrow big">${LANGS.map(l => `<button type="button" data-lang="${l.code}" aria-pressed="${l.code === lang}"><b>${l.short}</b><span>${esc(l.name)}</span></button>`).join("")}</div><p class="fine">${esc(t("langNote"))}</p>`, "");
}
function waehleSprache(code){
  lang = code;
  if (user) { setLang(user.id, code); } else if (entry.step === "id") { loginLang = code; } else { entry.langWahl = true; }   // gespeichert wird erst nach gültigem Code
  kleinZu(); statisch();
  if (user) { render(); nachOeffnen(); toast(t("langSaved", {id: user.id})); } else loginView();
}
function freigabe(a, r){
  const vier = VIER_AUGEN.includes(a.art);
  const zweit = vier ? STAFF.find(x => x.name === a.zweit) : null;
  if (a.stage !== "Probefahrt" || reqs(a).some(q => !q.ok) || (vier && (!zweit || zweit.id === user.id))) { oeffnen(a.id); return toast(vier && zweit && zweit.id === user.id ? t("secondSelf") : t("needChecks")); }
  let pin = "", schritt = 1;
  const d = klein(t("releaseTitle"), `<p style="margin:0"><span class="plate">${esc(a.kz)}</span> ${esc(t("art:" + a.art))}</p>${vier ? `<span class="step" id="fStep"></span>` : ""}<div class="pinbox" id="fPin">${"<span></span>".repeat(4)}</div><div class="pad" id="fPad">${[1,2,3,4,5,6,7,8,9].map(n => `<button type="button" data-fk="${n}">${n}</button>`).join("")}<span></span><button type="button" data-fk="0">0</button><button type="button" class="fn" data-fk="del" aria-label="${esc(t("clear"))}">⌫</button></div><p class="fine" id="fConf"></p>`, `<button type="button" class="btn" data-close2="1">${esc(t("cancel"))}</button>`);
  const show = () => d.querySelectorAll("#fPin span").forEach((s, i) => { s.textContent = pin[i] ? "•" : ""; s.className = i === pin.length ? "on" : ""; });
  const texte = () => {
    if (vier) d.querySelector("#fStep").textContent = schritt === 1 ? t("secondStep1", {n: user.name}) : t("secondStep2", {n: zweit.name});
    d.querySelector("#fConf").textContent = schritt === 1 ? t("confirms", {n: user.name}) : t("secondConfirms", {n: zweit.name});
  };
  show(); texte();
  d.querySelector("#fPad").onclick = e => {
    const b = e.target.closest("[data-fk]"); if (!b || pin.length >= 4) return;
    if (b.dataset.fk === "del") pin = pin.slice(0,-1); else pin += b.dataset.fk;
    show();
    if (pin.length < 4) return;
    if (schritt === 1) {
      if (pin !== user.code) { pin = ""; show(); d.querySelector("#kErr").textContent = t("codeWrong"); return; }
      if (vier) { schritt = 2; pin = ""; show(); texte(); d.querySelector("#kErr").textContent = ""; return; }
    } else if (pin !== zweit.code) { pin = ""; show(); d.querySelector("#kErr").textContent = t("secondCodeWrong", {n: zweit.name}); return; }
    if (a.stage === "Fertig") return kleinZu();
    if (r) (a.rueck = a.rueck || []).push(r);
    delete a.entwurf;
    a.stage = "Fertig"; a.frei = { wer:user.name, zeit:new Date().toISOString(), ...(vier ? { zweit: zweit.name } : {}) }; aenderung(a);
    kleinZu(); zu(); toast(t("toastReleased", {kz: a.kz}) + (a.art === "Service" ? ", " + t("toastReset") : ""));
  };
}
function warteDialog(a){
  const lbl = `style="display:flex;flex-direction:column;gap:6px;font-weight:600"`;
  const d = klein(t("waitTitle"), `<label ${lbl}>${esc(t("whichPart"))}<input class="field" id="wTeil" list="lagerList2" value="${esc(a.warteTeil || "")}" placeholder="${esc(t("whichPartPh"))}"></label><datalist id="lagerList2">${LAGER.map(l => `<option value="${esc(l.teil)}">`).join("")}</datalist>
    <label ${lbl}>${esc(t("delivery"))}<input class="field" id="wLief" value="${esc(a.liefer || "")}" placeholder="${esc(t("deliveryPh"))}"></label>
    <p class="fine">${esc(t("waitNote"))}</p>`,
    `<button type="button" class="btn" data-close2="1">${esc(t("cancel"))}</button><button type="button" class="btn primary" id="wOk">${esc(t("save"))}</button>`);
  d.querySelector("#wOk").onclick = () => {
    const x = d.querySelector("#wTeil").value.trim();
    if (!x) { d.querySelector("#kErr").textContent = t("needPart"); return; }
    a.warteTeil = x; a.liefer = d.querySelector("#wLief").value.trim(); a.stage = "Wartet auf Teil"; aenderung(a);
    kleinZu(); render(); nachOeffnen(); toast(t("toastWait"));
  };
}
function umwandeln(m, frei){
  let lvl = m ? m.lvl : "Hoch";
  const lbl = `style="display:flex;flex-direction:column;gap:6px;font-weight:600"`;
  const d = klein(frei ? t("newTitle") : t("convertTitle"), `
    ${frei ? `<label ${lbl}>${esc(t("truck"))}<input class="field" id="uKz" placeholder="${esc(t("plateEx"))}" autocapitalize="characters"></label>` : `<p style="margin:0"><span class="plate">${esc(m.kz)}</span> ${esc(m.wer)}</p>`}
    <label ${lbl}>${esc(t("todo"))}<textarea class="field" id="uTxt">${esc(m ? m.text : "")}</textarea></label>
    <label ${lbl}>${esc(t("type"))}<select class="field" id="uArt">${ARTEN.map(x => `<option value="${x}">${esc(t("art:" + x))}</option>`).join("")}</select></label>
    <label ${lbl}>${esc(t("category"))}<select class="field" id="uKat">${KATEGORIEN.map(k => `<option value="${k}">${esc(t("cat:" + k))}</option>`).join("")}</select></label>
    ${m ? `<p style="margin:0"><span class="chip ${m.lvl === "Kritisch" ? "alert" : m.lvl === "Hoch" ? "warn" : ""}">${esc(t("lvl:" + m.lvl))}</span> <span class="chip info">✓ ${esc(t("fromDaniel"))}</span></p>` : ""}
    <div ${m ? "hidden" : ""}><b>${esc(t("urgency"))}</b><div class="seg" id="uLvl" style="margin-top:6px">${["Kritisch","Hoch","Normal"].map(x => `<button type="button" data-l="${x}" aria-pressed="${x === lvl}" style="min-height:52px">${esc(t("lvl:" + x))}</button>`).join("")}</div></div>`,
    `<button type="button" class="btn" data-close2="1">${esc(t("cancel"))}</button><button type="button" class="btn primary" id="uOk">${esc(t("create"))}</button>`);
  d.querySelector("#uLvl").onclick = e => { const b = e.target.closest("[data-l]"); if (!b) return; lvl = b.dataset.l; d.querySelectorAll("#uLvl button").forEach(x => x.setAttribute("aria-pressed", x === b)); };
  d.querySelector("#uOk").onclick = () => {
    const kzRoh = frei ? d.querySelector("#uKz").value : m.kz;
    const mm = String(kzRoh).toUpperCase().match(/SZ[\s-]*(YC|KC|CM)[\s-]*(\d{4})/);
    const txt = d.querySelector("#uTxt").value.trim();
    if (!mm || txt.length < 3) { d.querySelector("#kErr").textContent = t("needPlate"); return; }
    const a = { id:"A" + (200 + auftraege.length), kz:"SZ-" + mm[1] + " " + mm[2], art:d.querySelector("#uArt").value, kat:d.querySelector("#uKat").value, lvl, text:txt, quelle: frei ? "Werkstatt" : "Fahrer-Meldung", quelleWer: frei ? user.name : m.wer, stage:"Eingang", erstellt:new Date().toISOString(), wer:"", checks:{}, teile:[], fotos:{vor: frei ? 0 : 1, nach:0}, notiz:"" };
    auftraege.push(a); if (m) meldungen = meldungen.filter(x => x !== m); aenderung(a);
    kleinZu(); render(); toast(t("toastCreated"));
  };
}

/* ---------- Stand wechseln ---------- */
function setStage(a, s){
  if (s === a.stage || s === "Fertig" || a.stage === "Fertig") return;
  if (s === "Wartet auf Teil") return warteDialog(a);
  if (s === "In Arbeit" && !a.wer) a.wer = user.name;
  a.stage = s; a.liegen = false; aenderung(a);
  render(); nachOeffnen();
}
function allesSenden(){ auftraege.forEach(a => { a.pending = false; delete a.offline; }); sichern(); renderNet(); if (user) { render(); nachOeffnen(); } toast(t("allSent")); }

/* ---------- Bedienung ---------- */
document.addEventListener("click", e => {
  const el = e.target;
  const lg = el.closest("[data-lang]"); if (lg) return waehleSprache(lg.dataset.lang);
  if (el.closest("#langBtn")) return spracheDialog();
  const c2 = el.closest("[data-close2]"); if (c2 && (!c2.classList.contains("overlay") || el === c2)) { kleinZu(); return; }
  if (c2) return;
  const k = el.closest("[data-k]"); if (k && !user) return taste(k.dataset.k);
  if (el.closest("#logout")) { abmelden(); return toast(t("loggedOut")); }
  if (el.closest("#wlan")) { online = !online; statisch(); if (online && pendings()) { toast(t("wlanBack")); setTimeout(() => { if (online) allesSenden(); }, 1800); } return; }
  if (el.closest("#theme")) { const r = document.documentElement; r.dataset.theme = r.dataset.theme === "light" ? "dark" : "light"; return statisch(); }
  if (el.closest("#sendNow")) { if (online) allesSenden(); return; }
  if (!user) return;
  const cl = el.closest("[data-close]"); if (cl && (cl.classList.contains("overlay") ? el === cl : true)) return zu();
  const akt = el.closest("[data-step],[data-next],[data-take],[data-wandle],[data-frei],[data-addteil],[data-stuckq],[data-wait],[data-stuck],[data-new]");
  if (akt) {   // Doppeltipp abfangen: zweiter Tipp an fast gleicher Stelle innerhalb 0,5 s zählt nicht
    const jetzt = Date.now(), nah = Math.abs(e.clientX - tippX) < 48 && Math.abs(e.clientY - tippY) < 48;
    if (jetzt < sperreBis && nah) return;
    sperreBis = jetzt + 500; tippX = e.clientX; tippY = e.clientY;
  }
  const tb = el.closest("[data-tab]"); if (tb) { tab = tb.dataset.tab; return render(); }
  if (el.closest("[data-new]")) return umwandeln(null, true);
  const wd = el.closest("[data-wandle]"); if (wd) return umwandeln(meldungen.find(m => m.id === wd.dataset.wandle), false);
  const tk = el.closest("[data-take]"); if (tk) { const [ty, id] = tk.dataset.take.split(":"); return uebernehmen(ty, id); }
  const sp = el.closest("[data-step]"); if (sp) { const a = auftraege.find(x => x.id === sp.dataset.step); if (!a || a.stage !== sp.dataset.from) return render(); return naechsterSchritt(a); }
  const wt = el.closest("[data-wait]"); if (wt) { const a = auftraege.find(x => x.id === wt.dataset.wait); offenId = null; return warteDialog(a); }
  const sq = el.closest("[data-stuckq]"); if (sq) { const a = auftraege.find(x => x.id === sq.dataset.stuckq); offenId = null; return rueckmeldung(a, "liegen"); }
  const op = el.closest("[data-open]"); if (op) return oeffnen(op.dataset.open);
  const nx = el.closest("[data-next]"); if (nx) {
    const a = auftraege.find(x => x.id === nx.dataset.next);
    if (!a || a.stage !== nx.dataset.from) return render();
    if (a.stage === "Probefahrt") return oeffnen(a.id);
    const to = { "Eingang":"In Arbeit", "In Arbeit":"Probefahrt", "Wartet auf Teil":"In Arbeit" }[a.stage];
    if (a.stage === "Eingang") a.wer = a.wer || user.name;
    a.stage = to; aenderung(a); render(); return toast(`${a.kz}: ${t("stage:" + to)}`);
  }
  const a = offenId && auftraege.find(x => x.id === offenId); if (!a) return;
  const st = el.closest("[data-stage]"); if (st) return setStage(a, st.dataset.stage);
  const df = el.closest("[data-delfoto]"); if (df) { const k = df.dataset.delfoto; a.fotos[k] = Math.max(0, a.fotos[k] - 1); aenderung(a); return nachOeffnen(); }
  const fo = el.closest("[data-foto]"); if (fo) { a.fotos[fo.dataset.foto]++; aenderung(a); return nachOeffnen(); }
  if (el.closest("[data-addteil]")) {
    const name = $("#pTeil").value.trim(), roh = $("#pMenge").value.trim();
    if (!name) return toast(t("needPartName"));
    if (!/^\d{1,3}$/.test(roh) || Number(roh) < 1) return toast(t("qtyBad"));
    const menge = Number(roh);
    const l = LAGER.find(x => x.teil.toLowerCase() === name.toLowerCase() || x.nr.toLowerCase() === name.toLowerCase());
    const buchen = ueber => {
      a.teile.push({ teil: l ? l.teil : name, nr: l ? l.nr : "@ohne", menge, preis: l ? l.preis : 0, ...(ueber ? { ueber:true } : {}) });
      if (l) l.bestand = Math.max(0, l.bestand - menge);
      aenderung(a); nachOeffnen(); toast(l ? t("taken", {t: l.teil, n: menge, f: l.fach}) : t("noStockNr"));
    };
    if (l && menge > l.bestand) {
      const d = klein(t("overTitle"), `<p style="margin:0">${esc(t("overText", {n: l.bestand, t: l.teil, f: l.fach, m: menge}))}</p>`, `<button type="button" class="btn" data-close2="1">${esc(t("cancel"))}</button><button type="button" class="btn primary" id="oOk">${esc(t("overBtn"))}</button>`);
      d.querySelector("#oOk").onclick = () => { kleinZu(); buchen(true); };
      return;
    }
    return buchen(false);
  }
  if (el.closest("[data-frei]")) return rueckmeldung(a, "fertig", r => freigabe(a, r));
  if (el.closest("[data-stuck]")) return rueckmeldung(a, "liegen");
});
const spaeter = mitTafel => setTimeout(() => { if (!user) return; if (mitTafel) render(); nachOeffnen(); }, 0);   // nicht mitten im Neuaufbau neu zeichnen
document.addEventListener("change", e => {
  const el = e.target; const a = offenId && auftraege.find(x => x.id === offenId); if (!a) return;
  if (el.dataset.art !== undefined) { if (a.stage === "Fertig" || el.value === a.art || !ARTEN.includes(el.value)) return; a.art = el.value; a.checks = {}; if (!VIER_AUGEN.includes(a.art)) delete a.zweit; aenderung(a); toast(t("artChanged")); return spaeter(true); }
  if (el.dataset.ck !== undefined) { a.checks[el.dataset.ck] = el.checked; aenderung(a); return spaeter(); }
  if (el.dataset.probe) { a.probe = el.checked; aenderung(a); return spaeter(); }
  if (el.dataset.zweit !== undefined) { a.zweit = el.value; aenderung(a); return spaeter(); }
  if (el.dataset.kat !== undefined) { a.kat = el.value; aenderung(a); return spaeter(true); }
  if (el.dataset.wer !== undefined) { a.wer = el.value; aenderung(a); return spaeter(true); }
  if (el.dataset.km) { a.km = el.value.replace(/\D/g, ""); if (a.km) a.checks[CHECK.Service.indexOf("km-Stand eingetragen")] = true; aenderung(a); return spaeter(); }
  if (el.dataset.profil) { a.profil = el.value; aenderung(a); return; }
  if (el.dataset.notiz) { a.notiz = el.value; aenderung(a); return; }
});
document.addEventListener("keydown", e => {
  if (!user && /^[0-9]$/.test(e.key) && !$("[data-close2].overlay")) return taste(e.key);
  if (!user && e.key === "Backspace" && !$("[data-close2].overlay")) return taste("del");
  if (e.key === "Escape") { if ($("[data-close2].overlay")) kleinZu(); else if (offenId) zu(); }
});

document.documentElement.dataset.theme = "dark";
const wieder = laden();
statisch();
loginView();
if (wieder) toast(t("restored", {n: wieder}));
/* Browser-Zurück verlässt das Panel nicht, sondern schließt nur das offene Fenster (Echtbetrieb zusätzlich Kiosk-Modus) */
try { history.pushState({ ws:1 }, ""); } catch(e){}
window.addEventListener("popstate", () => { try { history.pushState({ ws:1 }, ""); } catch(e){} if ($("[data-close2].overlay")) kleinZu(); else if (offenId) zu(); });
})();
