// [CLAUDE] AUTOMATISCH ERZEUGT durch scripts/build-i18n.mjs aus public/i18n.js – nicht von Hand bearbeiten (Texte in i18n.js ändern, dann npm run build)
// [CLAUDE] Oberflächentexte Deutsch / Українська / English
import { ICS_MK_KEYS } from './ics-texts.js';
export const STRINGS = { de: {}, uk: {}, en: {} };

export { CHECK_LABELS } from './check-labels.js';

// [CLAUDE] HU/SP nach StVZO Anlage VIII (eigene Zeilen, damit parallele Änderungen nicht kollidieren)
// [CLAUDE] Fahrerakte
// HU/SP-Hinweise (Codes aus src/inspection_rules.js; Deutsch kommt als Servertext)
// Backlog 259: Hinweis „Neue Restarbeit (Werkstatt)“ abschaltbar
// Backlog 283: nach dem Senden einer kritischen Meldung
// Backlog 282: Einrichtungsstand – nur ein Inhaber-Konto
// Backlog 280: nächste nicht bestätigte Meldung
// Backlog 274: Versicherungsfälle nach Zeitraum/Versicherer
// Backlog 271: Standortwechsel – zugeordnete Fahrer eines anderen Standorts
// Backlog 267: bundesweite gesetzliche Feiertage (public/holidays.js) – Hinweise, Werkstattplan
// Backlog 266: Fahrerzuordnung beim Außer-Betrieb-Nehmen beendet
// Backlog 265: Werkstatt wechseln im Werkstattplan
// Backlog 261: Foto/PDF zur Restarbeit
// Backlog 260: Restarbeit → Folgeauftrag
// Backlog 255: Fahrzeug korrigieren für Mängel aus einer Abfahrtskontrolle (ganze Kontrolle wird umgehängt)

// Backlog 467 (Blickwinkel „Sporadische Störung – Werkstatt findet keinen Fehler“)

// [CLAUDE] Hilfe: Mängelstatistik lesen (Inhaber/Fuhrparkleitung)
// [CLAUDE] Datenqualität: fast gleiche FIN
// [CLAUDE] Kennzahlen: Sperrzeit je Fahrzeug
// [CLAUDE] Hinweise: Push-Zustand lesbar
// [CLAUDE] Testkonten: gemeinsame Stammdaten nur lesen (Einstellung des Inhabers, Standard aus)
// [CLAUDE] Abmeldung nach Leerlauf (Einstellung, Standard aus)
// [CLAUDE] Werkstattplan
// [CLAUDE] Vertragsdokument (Verknüpfung mit der Dokumentablage des Fahrzeugs)
// [CLAUDE] Kostenbericht: Vertragsraten getrennt von der Instandhaltung
// [CLAUDE] Versicherungsfälle je Vorgang
// Hilfe „Fahrtenschreiber gestört“ (Backlog 213): dieselben Pflichten wie der Hinweis im Meldeformular, dazu der Weg in der App
// Teilagent „Fahrer im Ausland mit Panne“ (Backlog 217): deutsche Nummern im Inlandsformat zusätzlich mit +49 anbieten, Hinweis beim Eintragen
// Hinweis „Diebstahl/Einbruch“ im Meldeformular (Backlog 214) und Hilfe-Abschnitt dazu (Backlog 215) – keine Fristen, nur Ablauf
// Backlog 653/654 (Blickwinkel „Parkschaden – Unfallgegner unbekannt (Unfallflucht)“): Schritte im Meldeformular, Hilfe, Hinweis im Versicherungsabschnitt
// Backlog 659–661 (30.10.2026, Blickwinkel „Vandalismus über Nacht – Reifen zerstochen, Graffiti“): Schritte im Meldeformular, Hinweis für die Leitung im Versicherungsabschnitt, Hilfe
// Backlog 662–664 (30.10.2026, Blickwinkel „Marder hat Kabel/Schläuche angefressen“): Schritte im Meldeformular, Hinweis Versicherungsschutz für die Leitung, Hilfe
// Backlog 294 (Blickwinkel „Fahrer verliert unterwegs Fahrzeugschlüssel oder Fahrzeugschein“): Hinweise im Meldeformular + Hilfe-Abschnitt; reine Information, keine Frist
// Backlog 295 (Blickwinkel „Falsch getankt – AdBlue im Dieseltank“): Hinweise im Meldeformular + Hilfe-Abschnitt; reine Information, keine Frist, keine Literangabe
// Backlog 651/652 (Blickwinkel „Falsch getankt – AdBlue im Dieseltank“, 30.10.2026): Warnzeile bei passender Fahrbereitschaft, Hinweis für die Leitung im Versicherungsabschnitt
// Backlog 307: Blickwinkel „Ladung verrutscht während der Fahrt“
// Backlog 308: Blickwinkel „Spiegel abgefahren“
// Backlog 311: Blickwinkel „Tür/Ladebordwand/Hecktür schließt nicht“
// Backlog 312: Blickwinkel „Lkw festgefahren oder kommt bei Glätte nicht weiter“
// Backlog 313: Blickwinkel „Heizung/Gebläse/Scheibenwischer fällt aus, Scheibe beschlägt oder vereist“
// Backlog 314: Blickwinkel „Teil hängt herunter, schleift oder wurde unterwegs verloren“
// Backlog 315: Blickwinkel „Fahrerassistenzsystem fällt aus oder bremst grundlos“
// Backlog 747: Kraftstoff ausgegangen, Tank leergefahren (Meldeformular + Hilfe)
// Backlog 354: Autotransporter – Ladeetage, Auffahrrampe oder Hydraulik des Aufbaus gestört (Hinweis im Meldeformular + Hilfe).
// Backlog 306: mehrere passende Hinweise im Meldeformular – wichtigster offen, weitere eingeklappt

// [CLAUDE] Panne & Notfall (Rufnummern für unterwegs; fest nur Notruf 112)
// [CLAUDE] Backlog 431: Bundesland für landesweite Feiertage (Erreichbarkeit einer Rufnummer)
// [CLAUDE] Hilfe: Kennzahlen Instandhaltung lesen (Inhaber/Fuhrparkleitung)
// Backlog 618: HU/SP mit erheblichen/gefährlichen Mängeln ohne spätere bestandene Prüfung (Fahrzeugliste, Gespann)
// Backlog 620: HU-Formular – SP am selben Tag, Prüfbericht als Datei
// Backlog 621: Versicherungsfall – Vertrag am Schadentag
// Backlog 622/623: Datenqualität – Versicherungsverträge überschneiden sich bzw. Lücke im erfassten Versicherungsschutz
// Hilfe: Nachfassen bei Vorgängen ohne Bewegung (nur wenn der Inhaber die Tage eingestellt hat)
// [CLAUDE] Weitere Server-Fehler in der App-Sprache (Werkstatt/Fahrer arbeiten oft auf Ukrainisch/Englisch); Deutsch zeigt den Server-Text

// [CLAUDE] Allgemeine Eingabefehler des Servers (Code „validation“, deutscher Text aus festen Vorlagen in src/util.js) in die App-Sprache.
// Feldnamen nur für häufige Felder übersetzt, sonst bleibt der deutsche Feldname stehen. Unbekannte Texte: null (App zeigt den Server-Text).
const FIELD_NAMES = {
  uk: { Stunden: 'Години', Menge: 'Кількість', Preis: 'Ціна', Betrag: 'Сума', Kilometerstand: 'Пробіг', km: 'Пробіг', Bemerkung: 'Примітка', Grund: 'Причина', Fahrzeug: 'Транспорт', Bezeichnung: 'Назва', Name: 'Ім’я', Benutzername: 'Ім’я користувача', Kennzeichen: 'Номерний знак', Restarbeit: 'Залишкова робота', Tätigkeit: 'Робота', Teil: 'Деталь', Mindestbestand: 'Мінімальний запас', Profiltiefe: 'Глибина протектора', Winterkennzeichnung: 'Зимове маркування', Werkstatt: 'Майстерня', Fahrer: 'Водій', Prüfergebnis: 'Результат перевірки', Beschreibung: 'Опис' },
  en: { Stunden: 'Hours', Menge: 'Quantity', Preis: 'Price', Betrag: 'Amount', Kilometerstand: 'Odometer', km: 'Odometer', Bemerkung: 'Note', Grund: 'Reason', Fahrzeug: 'Vehicle', Bezeichnung: 'Description', Name: 'Name', Benutzername: 'Username', Kennzeichen: 'Licence plate', Restarbeit: 'Remaining task', Tätigkeit: 'Activity', Teil: 'Part', Mindestbestand: 'Minimum stock', Profiltiefe: 'Tread depth', Winterkennzeichnung: 'Winter marking', Werkstatt: 'Workshop', Fahrer: 'Driver', Prüfergebnis: 'Check result', Beschreibung: 'Description' },
};
const VALIDATION_TEXTS = {
  uk: { required: '{f}: обов’язкове поле.', too_long: '{f}: занадто довго (макс. {n} символів).', value: '{f}: недійсне значення.', number: '{f}: недійсне число.', num_range: '{f}: допустимо від {a} до {b}.', num_max: '{f}: не більше {b}.', num_min: '{f}: не менше {a}.', ambiguous: '{f}: «{v}» неоднозначно – вводьте без крапки-розділювача тисяч (напр. 2000) або з комою для дробової частини (напр. 2,5).',
    'Jeder Mangel braucht eine kurze Beschreibung.': 'Кожен дефект потребує короткого опису.', 'Fehlerbeschreibung ist zu kurz.': 'Опис несправності занадто короткий.', 'Fahrzeug unbekannt.': 'Транспорт невідомий.',
    // Werkstatt/Lager
    'Datum ungültig.': 'Недійсна дата.', 'Werkstatt ist unverändert.': 'Майстерня не змінилася.', 'Der Bestellvermerk wurde zwischenzeitlich geändert. Bitte neu laden.': 'Позначку про замовлення тим часом змінено. Оновіть сторінку.', 'Für diesen Artikel ist bereits eine Bestellung vermerkt. Bitte neu laden.': 'Для цієї позиції вже позначено замовлення. Оновіть сторінку.', 'Liefertermin ist unverändert.': 'Дата постачання не змінилася.', 'Termin ist unverändert.': 'Термін не змінився.', 'Restarbeit nicht gefunden oder bereits erledigt.': 'Залишкову роботу не знайдено або вже виконано.', 'Artikel ist deaktiviert.': 'Позицію деактивовано.', 'Korrektur braucht einen Grund.': 'Для коригування потрібна причина.', 'Korrektur ungleich 0 angeben.': 'Коригування має бути не 0.', 'Lagerartikel nicht gefunden.': 'Позицію складу не знайдено.', 'Lagerartikel gehört nicht zur zuständigen Werkstatt.': 'Позиція складу не належить до відповідальної майстерні.', 'Artikel gehört nicht zu diesem Lager.': 'Позиція не належить до цього складу.', 'Menge muss größer 0 sein.': 'Кількість має бути більшою за 0.', 'Ziellager ist das eigene Lager.': 'Цільовий склад – це власний склад.', 'Liefertermin: gültiges Datum, nicht vor dem Bestelldatum.': 'Дата постачання: дійсна дата, не раніше дати замовлення.', 'Bestelldatum: gültiges Datum, nicht in der Zukunft.': 'Дата замовлення: дійсна дата, не в майбутньому.', 'Fahrzeug ist bereits gesperrt.': 'Транспорт уже заблоковано.' },
  en: { required: '{f} is required.', too_long: '{f} is too long (max. {n} characters).', value: '{f}: invalid value.', number: '{f}: invalid number.', num_range: '{f}: allowed from {a} to {b}.', num_max: '{f}: at most {b}.', num_min: '{f}: at least {a}.', ambiguous: '{f}: “{v}” is ambiguous – please enter without thousands separator (e.g. 2000) or with a point for decimals (e.g. 2.5).',
    'Jeder Mangel braucht eine kurze Beschreibung.': 'Every defect needs a short description.', 'Fehlerbeschreibung ist zu kurz.': 'Fault description is too short.', 'Fahrzeug unbekannt.': 'Unknown vehicle.',
    'Datum ungültig.': 'Invalid date.', 'Werkstatt ist unverändert.': 'Workshop is unchanged.', 'Der Bestellvermerk wurde zwischenzeitlich geändert. Bitte neu laden.': 'The order note was changed in the meantime. Please reload.', 'Für diesen Artikel ist bereits eine Bestellung vermerkt. Bitte neu laden.': 'An order is already noted for this item. Please reload.', 'Liefertermin ist unverändert.': 'Delivery date is unchanged.', 'Termin ist unverändert.': 'Appointment is unchanged.', 'Restarbeit nicht gefunden oder bereits erledigt.': 'Remaining task not found or already done.', 'Artikel ist deaktiviert.': 'Item is deactivated.', 'Korrektur braucht einen Grund.': 'A correction needs a reason.', 'Korrektur ungleich 0 angeben.': 'Enter a correction other than 0.', 'Lagerartikel nicht gefunden.': 'Stock item not found.', 'Lagerartikel gehört nicht zur zuständigen Werkstatt.': 'Stock item does not belong to the responsible workshop.', 'Artikel gehört nicht zu diesem Lager.': 'Item does not belong to this store.', 'Menge muss größer 0 sein.': 'Quantity must be greater than 0.', 'Ziellager ist das eigene Lager.': 'Target store is your own store.', 'Liefertermin: gültiges Datum, nicht vor dem Bestelldatum.': 'Delivery date: valid date, not before the order date.', 'Bestelldatum: gültiges Datum, nicht in der Zukunft.': 'Order date: valid date, not in the future.', 'Fahrzeug ist bereits gesperrt.': 'Vehicle is already locked.' },
};
// [CLAUDE] Backlog 83: restliche feste Eingabefehler (v. a. Inhaber/Fuhrparkleitung: Verträge, Bußgelder, Importe, Versicherung, Fahrer).
// CSV-Spaltennamen bleiben deutsch (so heißen sie in der Datei). Rein technische Integrationsfehler bleiben unübersetzt.
const V_MORE = [
  ['Artikel nicht in diesem Lager.', 'Артикула немає на цьому складі.', 'Item is not in this stock location.'],
  ['Lager angeben.', 'Вкажіть склад.', 'Please specify the stock location.'],
  ['Mindestens eine Position angeben.', 'Вкажіть щонайменше одну позицію.', 'Please enter at least one line.'],
  ['Höchstens 50 Positionen je Wareneingang.', 'Не більше 50 позицій на одне надходження.', 'At most 50 lines per goods receipt.'],
  ['Jede Position braucht einen Artikel.', 'Кожна позиція потребує артикула.', 'Each line needs an item.'],
  ['Ein Artikel steht mehrfach im Wareneingang – Mengen bitte zusammenfassen.', 'Артикул кілька разів у надходженні – об’єднайте кількості.', 'An item appears more than once in the goods receipt – please combine the quantities.'],
  ['Bitte mindestens 3 Zeichen der Teilenummer oder Bezeichnung angeben.', 'Вкажіть щонайменше 3 символи номера запчастини або назви.', 'Please enter at least 3 characters of the part number or name.'],
  ['Kennzeichen Unfallgegner: bitte Buchstaben/Ziffern laut Unfallbericht angeben oder leer lassen.', 'Номер авто другої сторони: вкажіть літери/цифри за протоколом ДТП або залиште порожнім.', 'Other party’s plate: please enter letters/digits as in the accident report or leave it empty.'],
  ['Bitte Grund für die Korrektur angeben (z. B. Kennzeichen verwechselt).', 'Вкажіть причину виправлення (напр., переплутано номер).', 'Please state the reason for the correction (e.g. plates mixed up).'],
  ['Fahrzeug ist unverändert.', 'Транспорт не змінено.', 'Vehicle is unchanged.'],
  ['Fahrzeug nicht gefunden oder außer Betrieb.', 'Транспорт не знайдено або виведено з експлуатації.', 'Vehicle not found or out of service.'],
  ['Zu dieser Meldung gibt es Dubletten oder Folgeaufträge – Fahrzeug lässt sich nicht korrigieren. Bitte ablehnen und am richtigen Fahrzeug neu melden.', 'До цього повідомлення є дублікати або подальші замовлення – транспорт виправити не можна. Відхиліть і повідомте заново для правильного транспорту.', 'This report has duplicates or follow-up orders – the vehicle cannot be corrected. Please reject it and report again on the correct vehicle.'],
  ['Zu dieser Meldung gibt es einen Versicherungsfall – Fahrzeug lässt sich nicht korrigieren. Bitte ablehnen und am richtigen Fahrzeug neu melden.', 'До цього повідомлення є страховий випадок – транспорт виправити не можна. Відхиліть і повідомте заново для правильного транспорту.', 'This report has an insurance claim – the vehicle cannot be corrected. Please reject it and report again on the correct vehicle.'],
  ['Liste veraltet – bitte neu laden.', 'Список застарів – будь ласка, оновіть.', 'List out of date – please reload.'],
  ['Die Prüfliste wurde inzwischen geändert – bitte die Kontrolle neu durchführen.', 'Перелік пунктів перевірки тим часом змінено – будь ласка, проведіть перевірку заново.', 'The checklist has changed in the meantime – please carry out the check again.'],
  ['Unbekannte Aktion.', 'Невідома дія.', 'Unknown action.'],
  ['repeat_days: 1–30 Tage', 'repeat_days: 1–30 днів', 'repeat_days: 1–30 days'],
  ['Priorität: niedrig, mittel oder kritisch.', 'Пріоритет: низький, середній або критичний.', 'Priority: low, medium or critical.'],
  ['Konto ist deaktiviert – erst aktivieren, dann neuen Einladungslink erzeugen.', 'Обліковий запис деактивовано – спершу активуйте, потім створіть нове посилання-запрошення.', 'Account is deactivated – activate it first, then create a new invitation link.'],
  ['Fahrer bereits ermittelt – Tatzeit nur vor der Fahrerermittlung änderbar.', 'Водія вже встановлено – час порушення можна змінити лише до встановлення водія.', 'Driver already identified – the offence time can only be changed before the driver is identified.'],
  ['Fahrer bereits ermittelt – Kennzeichen nur vor der Fahrerermittlung änderbar.', 'Водія вже встановлено – номерний знак можна змінити лише до встановлення водія.', 'Driver already identified – the plate can only be changed before the driver is identified.'],
  ['Altes Passwort falsch.', 'Неправильний старий пароль.', 'Old password is incorrect.'],
  ['Beide Vorgänge haben einen Versicherungsfall – bitte zuerst klären, welcher gilt.', 'Обидва випадки мають страховий випадок – спершу з’ясуйте, який із них чинний.', 'Both cases have an insurance claim – please clarify first which one applies.'],
  ['Kündigungsfrist in Tagen oder Wochen erkannt – bitte in Monaten angeben (Spalte „Kündigungsfrist (Monate)“; Tage/Wochen werden nicht umgerechnet).', 'Розпізнано строк розірвання в днях або тижнях – вкажіть у місяцях (стовпець «Kündigungsfrist (Monate)»; дні/тижні не перераховуються).', 'Notice period in days or weeks detected – please give it in months (column “Kündigungsfrist (Monate)”; days/weeks are not converted).'],
  ['days: 7–730 Tage', 'days: 7–730 днів', 'days: 7–730 days'],
  ['kind: abfahrt oder nach_reparatur', 'kind: abfahrt або nach_reparatur', 'kind: abfahrt or nach_reparatur'],
  ['Diese Personalnummer ist bereits einem aktiven Fahrer zugeordnet.', 'Цей табельний номер уже призначено активному водієві.', 'This personnel number is already assigned to an active driver.'],
  ['Diese Kontrolle ist bereits erfasst.', 'Цю перевірку вже внесено.', 'This check has already been recorded.'],
  ['Ein Versicherungsfall verweist auf diesen Vertrag – Vertragsart bleibt „Versicherung“.', 'На цей договір посилається страховий випадок – вид договору залишається «Страхування».', 'An insurance claim refers to this contract – the contract type remains “Insurance”.'],
  ['Ein Versicherungsfall der Testumgebung verweist auf diesen Vertrag – Vertragsart bleibt „Versicherung“.', 'На цей договір посилається страховий випадок тестового середовища – вид договору залишається «Страхування».', 'An insurance claim in the test environment refers to this contract – the contract type remains “Insurance”.'],
  ['Ein Versicherungsfall des Betriebs verweist auf diesen Vertrag – Vertragsart bleibt „Versicherung“.', 'На цей договір посилається страховий випадок робочого середовища – вид договору залишається «Страхування».', 'An insurance claim in live operation refers to this contract – the contract type remains “Insurance”.'],
  ['Inzwischen wurde ein anderer Kilometerstand erfasst. Bitte neu laden und prüfen.', 'Тим часом внесено інший пробіг. Оновіть сторінку та перевірте.', 'Another odometer reading has been recorded in the meantime. Please reload and check.'],
  ['since: Zeitpunkt nach ISO 8601 (z. B. 2026-10-17T08:00:00Z).', 'since: момент часу за ISO 8601 (напр. 2026-10-17T08:00:00Z).', 'since: point in time in ISO 8601 (e.g. 2026-10-17T08:00:00Z).'],
  ['Diese Befehlskennung wurde bereits für eine andere Aktion verwendet.', 'Цей ідентифікатор команди вже використано для іншої дії.', 'This command ID has already been used for a different action.'],
  ['Diese Befehlskennung wurde bereits mit anderem Inhalt verwendet.', 'Цей ідентифікатор команди вже використано з іншим вмістом.', 'This command ID has already been used with different content.'],
  ['Artikel wurde zwischenzeitlich geändert. Bitte neu laden.', 'Артикул тим часом змінено. Оновіть сторінку.', 'The item has been changed in the meantime. Please reload.'],
  ['Fahrerakte wurde zwischenzeitlich geändert. Bitte neu laden.', 'Картку водія тим часом змінено. Оновіть сторінку.', 'The driver record has been changed in the meantime. Please reload.'],
  ['Die Dokumentangaben wurden zwischenzeitlich geändert. Bitte neu laden.', 'Дані документа тим часом змінено. Оновіть сторінку.', 'The document details have been changed in the meantime. Please reload.'],
  ['Für dieses Fahrzeug gibt es bereits einen Prüftermin dieser Art – bitte den vorhandenen bearbeiten bzw. „erledigt“ erfassen.', 'Для цього транспорту вже є строк огляду цього виду – відредагуйте наявний або внесіть «виконано».', 'This vehicle already has an inspection date of this type – please edit the existing one or record it as “done”.'],
  ['Gerät nicht gefunden.', 'Пристрій не знайдено.', 'Device not found.'],
  ['Eintrag nicht gefunden.', 'Запис не знайдено.', 'Entry not found.'],
  ['Der Fuhrparkagent läuft gerade – bitte in einer Minute erneut versuchen.', 'Агент автопарку саме працює – спробуйте ще раз за хвилину.', 'The fleet agent is running right now – please try again in a minute.'],
  ['Eintrag wurde zwischenzeitlich weiter bearbeitet. Bitte neu laden.', 'Запис тим часом оброблено далі. Оновіть сторінку.', 'The entry has been processed further in the meantime. Please reload.'],
  ['Unbekannte Werkstatt.', 'Невідома майстерня.', 'Unknown workshop.'],
  ['Bitte mindestens zwei Fahrzeuge wählen.', 'Виберіть щонайменше два транспортні засоби.', 'Please choose at least two vehicles.'],
  ['Fahrzeug doppelt gewählt.', 'Транспорт вибрано двічі.', 'Vehicle selected twice.'],
  ['Höchstens 12 Fahrzeuge je Aufruf.', 'Не більше 12 транспортних засобів за один запит.', 'At most 12 vehicles per request.'],
  ['Eigene Zwei-Faktor-Anmeldung bitte unter „Mein Konto“ ausschalten.', 'Власний двофакторний вхід вимикайте в «Мій акаунт».', 'Please turn off your own two-factor sign-in under “My account”.'],
  ['Datum im Format JJJJ-MM-TT.', 'Дата у форматі РРРР-ММ-ДД.', 'Date in format YYYY-MM-DD.'],
  ['CSV leer.', 'Файл CSV порожній.', 'The CSV file is empty.'],
  ['Spalte „Bezeichnung“ erforderlich.', 'Потрібна колонка «Bezeichnung» (назва).', 'Column “Bezeichnung” (name) required.'],
  ['„Von“ liegt nach „bis“.', '«З» пізніше, ніж «по».', '“From” is after “to”.'],
  ['„Von“ liegt nach „Bis“.', '«З» пізніше, ніж «По».', '“From” is after “To”.'],
  ['Frist im Format JJJJ-MM-TT.', 'Строк у форматі РРРР-ММ-ДД.', 'Deadline in format YYYY-MM-DD.'],
  ['Fahrzeug ist außer Betrieb.', 'Транспорт виведено з експлуатації.', 'The vehicle is out of service.'],
  ['Kostenfreigabe nicht mehr nötig – bitte neu laden und erneut freigeben.', 'Погодження витрат більше не потрібне – оновіть сторінку й підтвердіть знову.', 'Cost approval is no longer needed – please reload and release again.'],
  ['Datum und Nachweis angeben.', 'Вкажіть дату та підтвердження.', 'Enter the date and the evidence.'],
  ['Termin angeben.', 'Вкажіть дату запису.', 'Enter the appointment date.'],
  ['Bitte 1 bis 200 Prüftermine auswählen.', 'Виберіть від 1 до 200 перевірок.', 'Please select 1 to 200 inspections.'],
  ['Bitte 1 bis 200 Fahrzeuge auswählen.', 'Виберіть від 1 до 200 транспортних засобів.', 'Please select 1 to 200 vehicles.'],
  ['HU/SP und Rückrufe bitte je Fahrzeug bzw. über „Rückrufe importieren“ anlegen.', 'HU/SP та відкликання створюйте для кожного транспорту окремо або через «Імпорт відкликань».', 'Please create HU/SP and recalls per vehicle or via “Import recalls”.'],
  ['Für dieses Fahrzeug ist keine SP vorgeschrieben.', 'Для цього транспорту SP не вимагається.', 'No SP (safety inspection) is required for this vehicle.'],
  ['„Gültig bis“ ist kein gültiges Datum (JJJJ-MM-TT).', '«Дійсний до» – недійсна дата (РРРР-ММ-ДД).', '“Valid until” is not a valid date (YYYY-MM-DD).'],
  ['„Gültig bis“ darf nicht in der Vergangenheit liegen.', '«Дійсний до» не може бути в минулому.', '“Valid until” must not be in the past.'],
  ['Zeitraum: „von“ liegt nach „bis“.', 'Період: «з» пізніше, ніж «по».', 'Period: “from” is after “to”.'],
  ['Zeitraum: Datum im Format JJJJ-MM-TT angeben.', 'Період: вкажіть дату у форматі РРРР-ММ-ДД.', 'Period: enter dates in format YYYY-MM-DD.'],
  ['Zeitraum im Format JJJJ-MM angeben.', 'Вкажіть період у форматі РРРР-ММ.', 'Enter the period in format YYYY-MM.'],
  ['Zeitraum höchstens ein Jahr.', 'Період – не більше одного року.', 'The period may be at most one year.'],
  ['Stichtag: Datum im Format JJJJ-MM-TT angeben.', 'Дата звітності: вкажіть дату у форматі РРРР-ММ-ДД.', 'Key date: enter a date in the format YYYY-MM-DD.'],
  ['Bitte mindestens einen Fahrer auswählen.', 'Виберіть принаймні одного водія.', 'Please select at least one driver.'],
  ['Höchstens 200 Fahrer je Erfassung.', 'Не більше 200 водіїв за один запис.', 'At most 200 drivers per entry.'],
  ['Sammelerfassung nur für „in Ordnung“ – Mängel bitte einzeln in der Fahrerakte erfassen.', 'Груповий запис лише для «в порядку» – недоліки вносьте окремо в картці водія.', 'Batch entry only for “OK” – please record defects individually in the driver file.'],
  ['Stichtag und „Fällig bis“ bitte nicht zusammen verwenden.', 'Не використовуйте дату звітності та «Кінець/розірвання до» разом.', 'Please do not use the key date and “End/notice by” together.'],
  ['Stichtag liegt in der Zukunft.', 'Дата звітності в майбутньому.', 'The key date is in the future.'],
  ['Keine Zählmengen eingetragen – nichts zu buchen.', 'Не внесено жодної підрахованої кількості – нічого проводити.', 'No counted quantities entered – nothing to book.'],
  ['Wiedervorlage liegt mehr als ein Jahr in der Zukunft.', 'Дата нагадування більш ніж через рік.', 'The follow-up date is more than one year ahead.'],
  ['Wiedervorlage ist unverändert.', 'Нагадування не змінилося.', 'The follow-up is unchanged.'],
  ['Wiedervorlage im Format JJJJ-MM-TT.', 'Дата нагадування у форматі РРРР-ММ-ДД.', 'Follow-up date in format YYYY-MM-DD.'],
  ['Werkstatt/Lager ist erforderlich.', 'Потрібно вказати майстерню/склад.', 'Workshop/store is required.'],
  ['Werkstatt ist für Rolle Werkstatt erforderlich.', 'Для ролі «Майстерня» потрібно вказати майстерню.', 'A workshop is required for the workshop role.'],
  ['Vorgang passt nicht zu diesem Fahrzeug.', 'Заявка не відповідає цьому транспорту.', 'The case does not match this vehicle.'],
  ['Vertragsende muss nach dem Vertragsbeginn liegen.', 'Кінець договору має бути після його початку.', 'The contract end must be after the contract start.'],
  ['Vertragsdokument: bitte ein Dokument aus der Dokumentablage dieses Fahrzeugs wählen.', 'Документ договору: виберіть документ з архіву документів цього транспорту.', 'Contract document: please choose a document from this vehicle’s documents.'],
  ['Versicherungsvertrag: bitte einen Versicherungsvertrag dieses Fahrzeugs wählen.', 'Договір страхування: виберіть договір страхування цього транспорту.', 'Insurance contract: please choose an insurance contract of this vehicle.'],
  ['Vorgang ist als Dublette abgelehnt – Versicherungsfall beim ursprünglichen Vorgang erfassen.', 'Заявку відхилено як дублікат – оформіть страховий випадок в початковій заявці.', 'This case was rejected as a duplicate – record the insurance claim on the original case.'],
  ['Intervall als ganze Zahl angeben.', 'Вкажіть інтервал цілим числом.', 'Enter the interval as a whole number.'],
  ['Kilometerstand bei Durchführung ist kleiner als der km-Stand der letzten Durchführung. Bitte prüfen; bei Tachotausch zuerst den neuen km-Stand mit Begründung in der Fahrzeugakte erfassen.', 'Пробіг під час виконання менший за пробіг останнього виконання. Перевірте; у разі заміни тахографа спочатку внесіть новий пробіг з обґрунтуванням у картці транспорту.', 'Odometer at completion is lower than at the last completion. Please check; after an odometer replacement, first record the new reading with a reason in the vehicle file.'],
  ['Versicherer angeben (oder Versicherungsvertrag wählen).', 'Вкажіть страховика (або виберіть договір страхування).', 'Enter the insurer (or choose an insurance contract).'],
  ['Ursprünglicher Vorgang nicht gefunden.', 'Початкову заявку не знайдено.', 'Original case not found.'],
  ['Ungültiger Benutzername.', 'Недійсне ім’я користувача.', 'Invalid username.'],
  ['Termin liegt außerhalb des zulässigen Zeitraums.', 'Термін поза допустимим періодом.', 'The date is outside the permitted period.'],
  ['Termin im Format JJJJ-MM-TT.', 'Термін у форматі РРРР-ММ-ДД.', 'Date in format YYYY-MM-DD.'],
  ['Tatzeit ungültig.', 'Недійсний час порушення.', 'Invalid time of the offence.'],
  ['Standort: höchstens 60 Zeichen.', 'Локація: не більше 60 символів.', 'Site: at most 60 characters.'],
  ['Spalten Kennzeichen und FIN erforderlich.', 'Потрібні стовпці «Kennzeichen» і «FIN».', 'Columns “Kennzeichen” and “FIN” are required.'],
  ['Spalten Art und Nachweis erforderlich.', 'Потрібні стовпці «Art» і «Nachweis».', 'Columns “Art” and “Nachweis” are required.'],
  ['Spalte „Vertragspartner“ erforderlich.', 'Потрібен стовпець «Vertragspartner».', 'Column “Vertragspartner” is required.'],
  ['Spalte „Vertragsart“ erforderlich.', 'Потрібен стовпець «Vertragsart».', 'Column “Vertragsart” is required.'],
  ['Spalte „Nächster Termin“ oder „Letzte Prüfung“ erforderlich.', 'Потрібен стовпець «Nächster Termin» або «Letzte Prüfung».', 'Column “Nächster Termin” or “Letzte Prüfung” is required.'],
  ['Spalte „Nachweis“/„Datei“ oder Angabe „Quelle“ für alle Zeilen erforderlich.', 'Потрібен стовпець «Nachweis»/«Datei» або «Quelle» для всіх рядків.', 'Column “Nachweis”/“Datei” or a “Quelle” for all rows is required.'],
  ['Spalte „Nachweis“ oder Angabe „Quelle“ für alle Zeilen erforderlich.', 'Потрібен стовпець «Nachweis» або «Quelle» для всіх рядків.', 'Column “Nachweis” or a “Quelle” for all rows is required.'],
  ['Spalte „Kennzeichen“ oder „FIN“ erforderlich.', 'Потрібен стовпець «Kennzeichen» або «FIN».', 'Column “Kennzeichen” or “FIN” is required.'],
  ['Spalte „Datum“ erforderlich.', 'Потрібен стовпець «Datum».', 'Column “Datum” is required.'],
  ['Spalte „Art“ (Fahrerkarte/Massenspeicher) erforderlich.', 'Потрібен стовпець «Art» (Fahrerkarte/Massenspeicher).', 'Column “Art” (Fahrerkarte/Massenspeicher) is required.'],
  ['Spalte Personalnummer/Fahrer oder Kennzeichen/FIN erforderlich.', 'Потрібен стовпець «Personalnummer»/«Fahrer» або «Kennzeichen»/«FIN».', 'Column “Personalnummer”/“Fahrer” or “Kennzeichen”/“FIN” is required.'],
  ['Spalte Kennzeichen oder FIN erforderlich.', 'Потрібен стовпець «Kennzeichen» або «FIN».', 'Column “Kennzeichen” or “FIN” is required.'],
  ['Spalte FIN fehlt.', 'Відсутній стовпець «FIN».', 'Column “FIN” is missing.'],
  ['Priorität ist unverändert.', 'Пріоритет не змінився.', 'The priority is unchanged.'],
  ['Messung braucht Profiltiefe oder Luftdruck.', 'Для вимірювання потрібна глибина протектора або тиск.', 'A measurement needs tread depth or tyre pressure.'],
  ['Maximal 5000 Fahrzeuge je Import.', 'Не більше 5000 транспортних засобів за один імпорт.', 'At most 5000 vehicles per import.'],
  ['Maximal 36 Monate je Abfrage.', 'Не більше 36 місяців за один запит.', 'At most 36 months per query.'],
  ['Maximal 2000 Artikel je Inventur.', 'Не більше 2000 позицій за одну інвентаризацію.', 'At most 2000 items per stocktake.'],
  ['Liefertermin liegt mehr als ein Jahr in der Zukunft.', 'Дата постачання більш ніж через рік.', 'The delivery date is more than one year ahead.'],
  ['Liefertermin im Format JJJJ-MM-TT.', 'Дата постачання у форматі РРРР-ММ-ДД.', 'Delivery date in format YYYY-MM-DD.'],
  ['Letzte Durchführung liegt in der Zukunft – geplante Termine über „Werkstatttermin planen“ eintragen.', 'Останнє проведення в майбутньому – заплановані терміни вносьте через «Запланувати візит».', 'The last completion is in the future – enter planned dates via “Plan workshop date”.'],
  ['Durchführungsdatum liegt in der Zukunft – geplante Termine über „Werkstatttermin planen“ eintragen.', 'Дата проведення в майбутньому – заплановані терміни вносьте через «Запланувати візит».', 'The completion date is in the future – enter planned dates via “Plan workshop date”.'],
  ['Auswahl ungültig – bitte neu laden.', 'Вибір недійсний – оновіть сторінку.', 'Selection invalid – please reload.'],
  ['1 bis 200 Verträge auswählen.', 'Виберіть від 1 до 200 договорів.', 'Select 1 to 200 contracts.'],
  ['Vertragsende angeben.', 'Вкажіть кінець договору.', 'Enter the contract end.'],
  ['Durchführungsdatum vor 1950 ist nicht plausibel.', 'Дата проведення до 1950 року неправдоподібна.', 'A completion date before 1950 is not plausible.'],
  ['Durchführungsdatum liegt vor der Erstzulassung des Fahrzeugs.', 'Дата проведення раніша за першу реєстрацію транспортного засобу.', 'The completion date is before the vehicle’s first registration.'],
  ['Lager (Werkstatt) angeben.', 'Вкажіть склад (майстерню).', 'Specify the store (workshop).'],
  ['Kündigungsfrist nur zusammen mit einem Vertragsende (laut Vertrag).', 'Строк розірвання – лише разом із кінцем договору (згідно з договором).', 'Notice period only together with a contract end (as per contract).'],
  ['Kilometerstand bei Durchführung angeben – diese Prüfung hat ein Kilometer-Intervall.', 'Вкажіть пробіг на момент проведення – ця перевірка має інтервал у кілометрах.', 'Enter the odometer at completion – this inspection has a kilometre interval.'],
  ['Keine Zählmengen übermittelt.', 'Підраховані кількості не передано.', 'No counted quantities submitted.'],
  ['Auswahl ungültig.', 'Недійсний вибір.', 'Invalid selection.'],
  ['Keine Kostenfreigabe ausstehend.', 'Немає витрат, що очікують погодження.', 'No cost approval pending.'],
  ['Höchstens ein Jahr je Export.', 'Не більше одного року за один експорт.', 'At most one year per export.'],
  ['Unbekannte Person.', 'Невідома особа.', 'Unknown person.'],
  ['Unbekanntes Fahrzeug.', 'Невідомий транспорт.', 'Unknown vehicle.'],
  ['Hinweis ist zu kurz.', 'Примітка занадто коротка.', 'The note is too short.'],
  ['Gültig bis liegt vor dem Ausstellungsdatum.', '«Дійсний до» раніше дати видачі.', '“Valid until” is before the issue date.'],
  ['Gültig bis laut Dokument angeben.', 'Вкажіть «Дійсний до» згідно з документом.', 'Enter “valid until” as stated in the document.'],
  ['Gültig bis im Format JJJJ-MM-TT.', '«Дійсний до» у форматі РРРР-ММ-ДД.', '“Valid until” in format YYYY-MM-DD.'],
  ['Gewährleistung bis: höchstens 10 Jahre voraus.', 'Гарантія до: не більше ніж на 10 років уперед.', 'Warranty until: at most 10 years ahead.'],
  ['Gewährleistung bis: bitte gültiges Datum (JJJJ-MM-TT) angeben.', 'Гарантія до: вкажіть дійсну дату (РРРР-ММ-ДД).', 'Warranty until: please enter a valid date (YYYY-MM-DD).'],
  ['Gewichtsklasse passt nicht zur angegebenen Gesamtmasse.', 'Вагова категорія не відповідає вказаній повній масі.', 'The weight class does not match the stated gross weight.'],
  ['Für ein km-Kontingent bitte den km-Stand bei Übernahme laut Übergabeprotokoll angeben.', 'Для ліміту пробігу вкажіть пробіг при отриманні згідно з актом передачі.', 'For a mileage allowance please enter the odometer at handover as per the handover report.'],
  ['Fahrer nicht gefunden.', 'Водія не знайдено.', 'Driver not found.'],
  ['Fahrer nicht gefunden (gleiche Umgebung erforderlich).', 'Водія не знайдено (потрібне те саме середовище).', 'Driver not found (same environment required).'],
  ['Kennzeichen enthält unzulässige Zeichen (nur lateinische Buchstaben, Ziffern, Leerzeichen und Bindestrich).', 'Номерний знак містить недопустимі символи (лише латинські літери, цифри, пробіл і дефіс).', 'The licence plate contains invalid characters (Latin letters, digits, spaces and hyphens only).'],
  ['Anhänger-Kennzeichen enthält unzulässige Zeichen (nur lateinische Buchstaben, Ziffern, Leerzeichen und Bindestrich).', 'Номерний знак причепа містить недопустимі символи (лише латинські літери, цифри, пробіл і дефіс).', 'The trailer licence plate contains invalid characters (Latin letters, digits, spaces and hyphens only).'],
  ['FIN muss 17 Zeichen haben (ohne I, O, Q).', 'VIN має містити 17 символів (без I, O, Q).', 'The VIN must have 17 characters (without I, O, Q).'],
  ['Erstzulassung im Format JJJJ-MM-TT, nicht in der Zukunft.', 'Перша реєстрація у форматі РРРР-ММ-ДД, не в майбутньому.', 'First registration in format YYYY-MM-DD, not in the future.'],
  ['Erstattung: Betrag und Datum nur zusammen laut Abrechnung des Versicherers angeben.', 'Відшкодування: суму й дату вказуйте лише разом згідно з розрахунком страховика.', 'Reimbursement: enter amount and date only together, as per the insurer’s statement.'],
  ['Erstattet am liegt vor dem Meldedatum.', 'Дата відшкодування раніше дати повідомлення.', 'The reimbursement date is before the report date.'],
  ['Eigene Rolle/Aktivierung kann nicht selbst geändert werden.', 'Власну роль/активацію не можна змінити самостійно.', 'You cannot change your own role/activation.'],
  ['Eigene Anmeldungen bitte unter „Mein Konto“ beenden.', 'Власні входи завершуйте в розділі «Мій акаунт».', 'End your own sign-ins under “My account”.'],
  ['Dublette nur zu einem Vorgang desselben Fahrzeugs.', 'Дублікат можливий лише до заявки того самого транспорту.', 'A duplicate can only refer to a case of the same vehicle.'],
  ['Dieser Status entsteht über die Fahrerermittlung.', 'Цей статус встановлюється через визначення водія.', 'This status results from identifying the driver.'],
  ['Die Prüfung hat kein Ergebnis mit erheblichen/gefährlichen Mängeln.', 'Перевірка не має результату зі значними/небезпечними дефектами.', 'The inspection has no result with major/dangerous defects.'],
  ['Datei: bitte eine Datei dieses Vorgangs wählen.', 'Файл: виберіть файл цієї заявки.', 'File: please choose a file of this case.'],
  ['DOT: letzte 4 Ziffern = Woche und Jahr (z. B. 2324).', 'DOT: останні 4 цифри = тиждень і рік (напр. 2324).', 'DOT: last 4 digits = week and year (e.g. 2324).'],
  ['DOT: Herstellwoche liegt in der Zukunft.', 'DOT: тиждень виготовлення в майбутньому.', 'DOT: production week is in the future.'],
  ['Benutzername: 3–64 Zeichen, nur a–z, 0–9, Punkt, Bindestrich, Unterstrich.', 'Ім’я користувача: 3–64 символи, лише a–z, 0–9, крапка, дефіс, підкреслення.', 'Username: 3–64 characters, only a–z, 0–9, dot, hyphen, underscore.'],
  ['Reifengröße unplausibel (z. B. 315/80 R22.5).', 'Неправдоподібний розмір шини (напр. 315/80 R22.5).', 'Implausible tyre size (e.g. 315/80 R22.5).'],
  ['Beim Reifenwechsel ist die Reifengröße Pflicht.', 'При заміні шини розмір шини обов’язковий.', 'The tyre size is mandatory for a tyre change.'],
  ['Bei „abgelehnt“/„zurückgezogen“ keine Erstattung eintragen.', 'При «відхилено»/«відкликано» не вносьте відшкодування.', 'Do not enter a reimbursement for “rejected”/“withdrawn”.'],
  ['Bei Mängeln oder nicht vorgelegtem Führerschein bitte Vermerk angeben.', 'При дефектах або ненаданому посвідченні водія додайте примітку.', 'Please add a note for defects or a licence not presented.'],
  ['Beendet am liegt vor dem Vertragsbeginn.', 'Дата завершення раніше початку договору.', '“Ended on” is before the contract start.'],
  ['Auslesedatum im Format JJJJ-MM-TT.', 'Дата зчитування у форматі РРРР-ММ-ДД.', 'Download date in format YYYY-MM-DD.'],
  ['Auslesedatum darf nicht in der Zukunft liegen.', 'Дата зчитування не може бути в майбутньому.', 'The download date must not be in the future.'],
  ['App-Konto nicht gefunden (Rolle Fahrer, gleiche Umgebung).', 'Обліковий запис не знайдено (роль «Водій», те саме середовище).', 'App account not found (role driver, same environment).'],
  ['Anhänger haben keinen Fahrtenschreiber.', 'Причепи не мають тахографа.', 'Trailers have no tachograph.'],
  ['Ablesedatum ungültig (JJJJ-MM-TT).', 'Недійсна дата зчитування пробігу (РРРР-ММ-ДД).', 'Invalid reading date (YYYY-MM-DD).'],
  ['HU/SP sind zeitabhängig – keine km-Fälligkeit angeben.', 'HU/SP залежать лише від часу – не вказуйте строк за пробігом.', 'HU/SP depend on time only – do not enter a mileage due.'],
  ['Fällig bei km liegt nicht nach dem km-Stand der letzten Prüfung.', '«Строк за пробігом, км» не перевищує пробіг під час останньої перевірки.', '“Due at km” is not above the mileage at the last inspection.'],
  ['Ablesedatum darf nicht in der Zukunft liegen.', 'Дата зчитування пробігу не може бути в майбутньому.', 'The reading date must not be in the future.'],
  ['Spalte „Referenz“ (Rückrufnummer laut Schreiben) erforderlich.', 'Потрібен стовпець «Referenz» (номер відкликання згідно з листом).', 'Column “Referenz” (recall number as stated in the letter) required.'],
  ['Nur Inhaber und Fuhrparkleitung dürfen Rückrufe importieren.', 'Імпортувати відкликання можуть лише власник і керівник автопарку.', 'Only the owner and fleet management may import recalls.'],
  ['Dieser Rückruf ist bereits durchgeführt.', 'Це відкликання вже виконано.', 'This recall has already been carried out.'],
  ['Dieser Prüftermin hat kein km-Intervall – bitte die nächste km-Fälligkeit oder den nächsten Termin laut Nachweis angeben, sonst entfällt die Erinnerung.', 'Для цього огляду немає інтервалу за км – вкажіть наступний строк за км або наступну дату згідно з документом, інакше нагадування зникне.', 'This inspection has no km interval – enter the next due km or the next date per the record, otherwise the reminder is dropped.'],
  ['Dieser Prüftermin hat kein Intervall – bitte den nächsten Termin laut Nachweis (z. B. Ablaufdatum) angeben, sonst entfällt die Erinnerung.', 'Для цього огляду немає інтервалу – вкажіть наступний строк згідно з документом (напр. термін придатності), інакше нагадування зникне.', 'This inspection has no interval – enter the next date per the record (e.g. expiry date), otherwise the reminder is dropped.'],
  ['Ein Titel ist nur bei der Prüfart „Sonstiges“ vorgesehen.', 'Назва передбачена лише для виду перевірки «Інше».', 'A title is only intended for the inspection type “Other”.'],
  ['HU/SP-Fristen berechnet die App nach StVZO – hier nicht bearbeitbar.', 'Строки ТО/SP застосунок розраховує за StVZO – тут не редагуються.', 'The app calculates HU/SP deadlines per StVZO – not editable here.'],
  ['Zu diesem Prüftermin ist noch ein Werkstattauftrag offen – erst abschließen oder ablehnen.', 'До цього огляду ще відкрите замовлення майстерні – спершу завершіть або відхиліть його.', 'A workshop order for this inspection is still open – complete or reject it first.'],
  ['Rückruf ist eine einmalige Aktion – keine Folgefrist angeben.', 'Відкликання – одноразова акція: не вказуйте наступний строк.', 'A recall is a one-off action – do not enter a follow-up deadline.'],
  ['Rückruf ist bereits durchgeführt – keine Frist angeben.', 'Відкликання вже виконано – не вказуйте строк.', 'The recall has already been carried out – do not enter a deadline.'],
  ['Rückruf ist eine einmalige Aktion – kein Intervall angeben.', 'Відкликання – одноразова акція: не вказуйте інтервал.', 'A recall is a one-off action – do not enter an interval.'],
  ['Position passt nicht zum Anhänger (nur AH-Achsen oder Reserve).', 'Позиція не відповідає причепу (лише осі AH або запасне колесо).', 'Position does not match the trailer (AH axles or spare only).'],
  ['Position passt nicht zum Lkw (Anhängerachsen AH beim Anhänger erfassen).', 'Позиція не відповідає вантажівці (осі причепа AH вносьте у причепа).', 'Position does not match the truck (record trailer axles AH on the trailer).'],
  ['Anhänger sind von der Winterreifenpflicht nicht betroffen.', 'Причепи не підпадають під обов’язок зимових шин.', 'Trailers are not subject to the winter tyre requirement.'],
  ['Werkstatttermin darf nicht in der Vergangenheit liegen.', 'Дата в майстерні не може бути в минулому.', 'The workshop date must not be in the past.'],
  ['Winterreifen laut Erfassung bereits erfüllt – kein Auftrag nötig.', 'Згідно з записами зимові шини вже відповідають вимогам – замовлення не потрібне.', 'Winter tyres already compliant according to records – no order needed.'],
  ['Telefonnummer: nur Ziffern, Leerzeichen, + ( ) / - (3 bis 20 Ziffern).', 'Номер телефону: лише цифри, пробіли, + ( ) / - (від 3 до 20 цифр).', 'Phone number: digits, spaces and + ( ) / - only (3 to 20 digits).'],
  ['Bezeichnung ist zu kurz.', 'Назва закоротка.', 'Name is too short.'],
  ['Standort angeben.', 'Вкажіть локацію.', 'Please specify the site.'],
  ['Standort ist im Fahrzeugstamm nicht vorhanden.', 'Такої локації немає в реєстрі транспорту.', 'Site does not exist in the vehicle master data.'],
  ['Fahrzeug angeben.', 'Вкажіть транспорт.', 'Please specify the vehicle.'],
  ['Ruhezeit: Uhrzeit im Format HH:MM angeben (von und bis).', 'Час тиші: вкажіть час у форматі ГГ:ХХ (з і до).', 'Quiet hours: enter times as HH:MM (from and to).'],
  ['Ruhezeit: Beginn und Ende dürfen nicht gleich sein.', 'Час тиші: початок і кінець не можуть збігатися.', 'Quiet hours: start and end must not be the same.'],
  ['Höchstens 50 aktive Rufnummern – bitte nicht mehr gültige archivieren.', 'Не більше 50 активних номерів – заархівуйте ті, що вже не дійсні.', 'At most 50 active phone numbers – please archive those no longer valid.'],
  // [CLAUDE] Konflikt-Meldungen (409) mit festem Text – übersetzt über dieselbe Tabelle (21:15-Sitzung 15.10.2026)
  ['Dieses App-Konto ist bereits einem Fahrer zugeordnet.', 'Цей обліковий запис застосунку вже призначено водієві.', 'This app account is already linked to a driver.'],
  ['Es gibt eine ausgeschiedene Fahrerakte mit gleicher Personalnummer oder gleichem Namen – bei Wiedereinstellung besser diese reaktivieren.', 'Є картка звільненого водія з тим самим табельним номером або ім’ям – у разі повторного прийому краще активувати її знову.', 'There is a former employee’s driver file with the same personnel number or name – when re-hiring, better reactivate it.'],
  ['Für diesen Tag ist bereits eine Auslesung erfasst.', 'За цей день зчитування вже внесено.', 'A download has already been recorded for this day.'],
  ['Artikel existiert in diesem Lager bereits.', 'Така позиція вже є на цьому складі.', 'This item already exists in this store.'],
  ['Für dieses Gerät gibt es bereits eine bestätigte Zuordnung – zuerst aufheben.', 'Для цього пристрою вже є підтверджена прив’язка – спочатку скасуйте її.', 'This device already has a confirmed assignment – remove it first.'],
  ['Achse passt nicht zum Anhänger.', 'Вісь не підходить для причепа.', 'Axle does not match the trailer.'],
  ['Dieser Code wurde gerade schon verwendet – bitte den nächsten Code abwarten.', 'Цей код щойно вже використано – зачекайте наступний код.', 'This code was just used – please wait for the next code.'],
  ['Fahrzeug ist bereits außer Betrieb.', 'Транспортний засіб уже виведено з експлуатації.', 'Vehicle is already out of service.'],
  ['Fahrzeug ist bereits in Betrieb.', 'Транспортний засіб уже в експлуатації.', 'Vehicle is already in service.'],
  ['Fahrzeug ist bereits ruhend (aus Auswertungen ausgenommen).', 'Транспортний засіб уже в резерві (виключено з аналізу).', 'Vehicle is already dormant (excluded from evaluations).'],
  ['Fahrzeug ist bereits in den Auswertungen.', 'Транспортний засіб уже враховано в аналізі.', 'Vehicle is already included in evaluations.'],
  ['Für diese Durchführung ist bereits ein Prüfergebnis eingetragen – es wird nicht überschrieben.', 'Для цього проведення вже внесено результат перевірки – його не буде перезаписано.', 'An inspection result has already been entered for this completion – it will not be overwritten.'],
  ['Rufnummer wurde zwischenzeitlich geändert. Bitte neu laden.', 'Номер тим часом змінено. Оновіть сторінку.', 'The phone number was changed in the meantime. Please reload.'],
  ['Rufnummer wurde zwischenzeitlich geändert oder archiviert. Bitte neu laden.', 'Номер тим часом змінено або архівовано. Оновіть сторінку.', 'The phone number was changed or archived in the meantime. Please reload.'],
  ['Die Reifengröße dieser Achse ist am Fahrzeug geprüft – nur mit neuer Prüfung am Fahrzeug änderbar.', 'Розмір шин цієї осі перевірено на транспорті – змінити можна лише після нової перевірки на транспорті.', 'The tyre size of this axle was checked on the vehicle – it can only be changed with a new check on the vehicle.'],
  ['Tatzeit liegt in der Zukunft.', 'Час порушення в майбутньому.', 'Time of offence is in the future.'],
  ['Tatzeit vor 2000 – bitte Jahr prüfen.', 'Час порушення до 2000 року – перевірте рік.', 'Time of offence before 2000 – please check the year.'],
  ['„Gültig bis“ liegt mehr als 20 Jahre in der Zukunft – bitte Jahr prüfen.', '«Дійсний до» більш ніж на 20 років у майбутньому – перевірте рік.', '“Valid until” is more than 20 years in the future – please check the year.'],
  ['Fälligkeit liegt mehr als 20 Jahre in der Zukunft – bitte Jahr prüfen.', 'Термін більш ніж на 20 років у майбутньому – перевірте рік.', 'Due date is more than 20 years in the future – please check the year.'],
  ['„Gültig bis“ liegt vor 1990 – bitte Jahr prüfen.', '«Дійсний до» раніше 1990 року – перевірте рік.', '“Valid until” is before 1990 – please check the year.'],
  ['Datei zu groß (max. 500 KB).', 'Файл завеликий (макс. 500 КБ).', 'File too large (max. 500 KB).'],
  ['Datei zu groß (max. 300 KB).', 'Файл завеликий (макс. 300 КБ).', 'File too large (max. 300 KB).'],
  ['Anfrage zu groß.', 'Запит завеликий.', 'Request too large.'],
  ['Begründung ist zu kurz.', 'Обґрунтування закоротке.', 'Reason is too short.'],
  ['Bestelldatum liegt mehr als 5 Jahre zurück – bitte prüfen.', 'Дата замовлення понад 5 років тому – перевірте.', 'Order date is more than 5 years ago – please check.'],
  ['Liefertermin liegt mehr als 2 Jahre nach dem Bestelldatum – bitte prüfen.', 'Дата постачання більш ніж через 2 роки після замовлення – перевірте.', 'Delivery date is more than 2 years after the order date – please check.'],
  ['Nachweis nicht gefunden.', 'Документ не знайдено.', 'Record not found.'],
  ['Kontrolle nicht gefunden.', 'Перевірку не знайдено.', 'Check not found.'],
  ['Auslesung nicht gefunden.', 'Зчитування не знайдено.', 'Download not found.'],
  ['Frist vor 2000 – bitte Jahr prüfen.', 'Строк до 2000 року – перевірте рік.', 'Deadline before 2000 – please check the year.'],
  ['Durchführungszeitpunkt ungültig.', 'Неправильний час проведення.', 'Time of completion is invalid.'],
  ['Gerätezeit ungültig.', 'Неправильний час пристрою.', 'Device time invalid.'],
  ['Die Kontrolle liegt mehr als 7 Tage zurück und wird nicht mehr übernommen. Bitte neu durchführen.', 'Перевірка була понад 7 днів тому і більше не приймається. Проведіть її заново.', 'The check is more than 7 days old and is no longer accepted. Please carry it out again.'],
  ['Diese Meldung wurde bereits mit anderem Inhalt gesendet.', 'Це повідомлення вже надіслано з іншим змістом.', 'This report was already sent with different content.'],
  ['Kilometerstand bei Durchführung ist größer als ein später erfasster km-Stand. Bitte prüfen.', 'Пробіг на момент проведення більший за пізніше внесений. Перевірте.', 'Odometer at completion is higher than a later recorded reading. Please check.'],
  ['Kilometerstand bei Durchführung ist kleiner als ein zuvor erfasster km-Stand. Bitte prüfen; bei Tachotausch zuerst den neuen km-Stand mit Begründung in der Fahrzeugakte erfassen.', 'Пробіг на момент проведення менший за раніше внесений. Перевірте; у разі заміни тахографа спочатку внесіть новий пробіг з обґрунтуванням у картці транспорту.', 'The odometer reading at completion is lower than a previously recorded reading. Please check; if the odometer was replaced, first record the new reading with a reason in the vehicle file.'],
  ['Der Benutzer wurde zwischenzeitlich geändert. Bitte neu laden.', 'Користувача тим часом змінено. Оновіть сторінку.', 'The user has been changed in the meantime. Please reload.'],
  ['Ungültige Push-Schlüssel.', 'Недійсні ключі push-сповіщень.', 'Invalid push keys.'],
  ['Ungültiger Push-Endpunkt.', 'Недійсна адреса push-сповіщень.', 'Invalid push endpoint.'],
  ['Der ermittelte Fahrer ist in dieser Umgebung nicht mehr als Fahrer aktiv. Bitte Fahrer neu ermitteln.', 'Встановлений водій більше не активний як водій у цьому середовищі. Встановіть водія заново.', 'The identified driver is no longer active as a driver in this environment. Please identify the driver again.'],
  ['Anhänger-FIN muss 17 Zeichen haben (ohne I, O, Q).', 'VIN причепа має містити 17 символів (без I, O, Q).', 'Trailer VIN must have 17 characters (no I, O, Q).'],
  ['Nächster Termin liegt vor der letzten Durchführung.', 'Наступний строк раніше за останнє проведення.', 'Next due date is before the last completion.'],
  ['expected: ungültiger Wert.', 'expected: недійсне значення.', 'expected: invalid value.'],
  ['Ungültiger Prüfpunkt.', 'Недійсний пункт перевірки.', 'Invalid check item.'],
  ['Vermerk der Wiedervorlage ist zu lang (max. 300 Zeichen).', 'Примітка до нагадування задовга (макс. 300 символів).', 'Follow-up note is too long (max. 300 characters).'],
  ['Diesen Vertrag gibt es für das Fahrzeug bereits (gleiche Art und Vertragsnummer bzw. Partner und Beginn).', 'Цей договір для транспорту вже існує (той самий вид і номер договору або контрагент і початок).', 'This contract already exists for the vehicle (same type and contract number, or partner and start).'],
  ['Spalte mit Laufleistung pro Jahr erkannt – bitte das Gesamt-km-Kontingent der Laufzeit als Spalte „km-Kontingent“ angeben (Jahreswerte werden nicht umgerechnet).', 'Розпізнано стовпець із пробігом на рік – вкажіть загальний ліміт км за весь строк у стовпці «km-Kontingent» (річні значення не перераховуються).', 'Column with annual mileage detected – please provide the total km allowance for the term as column “km-Kontingent” (annual values are not converted).'],
  ['Fahrverbot: 1 bis 3 Monate laut Schreiben (leer = kein Fahrverbot).', 'Заборона керування: від 1 до 3 місяців згідно з листом (порожньо = без заборони).', 'Driving ban: 1 to 3 months according to the letter (empty = no driving ban).'],
  ['Frist liegt vor der Tatzeit – bitte Jahr prüfen.', 'Строк раніше за час порушення – перевірте рік.', 'Deadline is before the time of the offence – please check the year.'],
  ['Diese Rufnummer ist mit derselben Art und Geltung bereits eingetragen.', 'Цей номер уже внесено з тим самим видом і сферою дії.', 'This number is already entered with the same type and scope.'],
  ['Datumsspalte nicht eindeutig – bitte die Spalte mit dem Auslesedatum „Auslesedatum“ nennen.', 'Стовпець дати неоднозначний – назвіть стовпець із датою зчитування «Auslesedatum».', 'Date column is ambiguous – please name the column with the download date “Auslesedatum”.'],
  ['Weitere Positionen bitte als Liste angeben.', 'Додаткові позиції вкажіть списком.', 'Please give further positions as a list.'],
  // Berechtigungs-Begründungen (403 forbidden) – vorher in UK/EN nur „No permission.“ (21.10.2026)
  ['Keine Berechtigung für diese Aktion.', 'Немає дозволу на цю дію.', 'You are not permitted to perform this action.'],
  ['Fuhrparkleitung darf nur Fahrer, Werkstatt und Leser anlegen.', 'Керівник автопарку може створювати лише водіїв, майстерні та читачів.', 'Fleet management may only create drivers, workshops and read-only users.'],
  ['Nur der Inhaber sieht das Protokoll.', 'Журнал бачить лише власник.', 'Only the owner can view the audit log.'],
  ['Nur der Inhaber darf eine Datensicherung herunterladen.', 'Завантажувати резервну копію може лише власник.', 'Only the owner may download a backup.'],
  ['Kontrolle nach Reparatur ist nur im Status „in Reparatur“ durch die zuständige Werkstatt möglich.', 'Перевірка після ремонту можлива лише у статусі «У ремонті» відповідальною майстернею.', 'Post-repair check is only possible in status “In repair” by the responsible workshop.'],
  ['Nur Inhaber und Fuhrparkleitung dürfen Prüftermine importieren.', 'Імпортувати строки оглядів можуть лише власник і керівник автопарку.', 'Only the owner and fleet management may import inspection dates.'],
  ['Datenauskunft nur durch den Inhaber.', 'Довідку про дані надає лише власник.', 'Data access requests can only be handled by the owner.'],
  ['Nur das Lager der eigenen Werkstatt.', 'Лише склад власної майстерні.', 'Only the store of your own workshop.'],
  ['Reifendaten nur für zugeordnete Fahrzeuge.', 'Дані шин лише для закріпленого транспорту.', 'Tyre data only for assigned vehicles.'],
  ['Nur für zugeordnete Fahrzeuge.', 'Лише для закріпленого транспорту.', 'Only for assigned vehicles.'],
  ['Nur der Inhaber darf importieren.', 'Імпортувати може лише власник.', 'Only the owner may import.'],
  ['Nur der Inhaber darf die Zwei-Faktor-Anmeldung zurücksetzen.', 'Скинути двофакторний вхід може лише власник.', 'Only the owner may reset two-factor sign-in.'],
  ['Nur der Inhaber sieht die Nutzungsstatistik.', 'Статистику використання бачить лише власник.', 'Only the owner can view the usage statistics.'],
  ['Nur der Inhaber sieht den Einrichtungsstand.', 'Стан налаштування бачить лише власник.', 'Only the owner can view the setup status.'],
  ['Fahrzeugakten sind für Fahrer nicht freigegeben.', 'Картки транспорту недоступні для водіїв.', 'Vehicle files are not available to drivers.'],
  ['Nur der Inhaber darf Stammdaten importieren.', 'Імпортувати основні дані може лише власник.', 'Only the owner may import master data.'],
  ['Ungültige Anfrage (CSRF-Schutz).', 'Недійсний запит (захист CSRF).', 'Invalid request (CSRF protection).'],
  ['Ungültige Herkunft.', 'Недійсне джерело запиту.', 'Invalid origin.'],
  ['Erstzulassung vor 1950 ist nicht plausibel.', 'Перша реєстрація до 1950 року неправдоподібна.', 'A first registration before 1950 is not plausible.'],
  ['Bei deaktivierten Artikeln ist nur das Ausbuchen des Restbestands auf 0 möglich.', 'Для деактивованих артикулів можливе лише списання залишку до 0.', 'For deactivated items, only writing off the remaining stock to 0 is possible.'],
  ['Ein gleichartiger Mangel wurde gerade gemeldet. Bitte die Kontrolle erneut senden.', 'Щойно повідомлено про такий самий дефект. Будь ласка, надішліть перевірку ще раз.', 'An identical defect has just been reported. Please send the check again.'],
  ['Schadenhöhe laut Gutachten nur mit dem Eingangsdatum des Gutachtens angeben.', 'Суму збитку за висновком експерта вказуйте лише з датою отримання висновку.', 'Enter the damage amount per appraisal only together with the date the appraisal was received.'],
  ['Gutachten eingegangen am liegt vor der Besichtigung.', 'Дата отримання висновку раніше дати огляду.', 'The appraisal received date is before the inspection.'],
  ['Besichtigung am: höchstens ein Jahr im Voraus.', 'Огляд: не більше ніж на рік наперед.', 'Inspection on: at most one year ahead.'],
  ['Bitte Grund angeben, warum der Auftrag ohne Reparatur endet (z. B. Totalschaden, Verkauf).', 'Вкажіть причину, чому замовлення завершується без ремонту (напр. повна загибель, продаж).', 'Please state why the order ends without repair (e.g. total loss, sale).'],
  ['Polizeiliches Aktenzeichen nur zusammen mit der Dienststelle angeben.', 'Номер справи поліції вказуйте лише разом із відділком поліції.', 'Enter the police case number only together with the police station.'],
  ['Schadennummer Unfallgegner nur zusammen mit dem Versicherer der Gegenseite angeben.', 'Номер справи другої сторони вказуйте лише разом зі страховиком другої сторони.', 'Enter the other party’s claim number only together with the other party’s insurer.'],
  ['Vorgang mit aktiver Sicherheitssperre kann nicht ohne Reparatur beendet werden. Zuerst Sperre fachlich aufheben (z. B. „Fahrzeug wird außer Betrieb genommen“).', 'Справу з активним блокуванням безпеки не можна завершити без ремонту. Спочатку зніміть блокування по суті (напр. «транспорт виводиться з експлуатації»).', 'A case with an active safety lock cannot be ended without repair. Lift the lock on its merits first (e.g. “vehicle is being taken out of service”).'],
  ['Abschleppdatum nur zusammen mit dem Abschleppdienst angeben.', 'Дату евакуації вказуйте лише разом з евакуаційною службою.', 'Enter the towing date only together with the towing service.'],
  ['Schadenzeitpunkt: ungültiges Datum.', 'Час пошкодження: недійсна дата.', 'Time of damage: invalid date.'],
  ['Schadenzeitpunkt liegt in der Zukunft.', 'Час пошкодження в майбутньому.', 'Time of damage is in the future.'],
  ['Schadenzeitpunkt liegt mehr als ein Jahr zurück.', 'Час пошкодження понад рік тому.', 'Time of damage is more than a year ago.'],
  ['Schadenzeitpunkt ist unverändert.', 'Час пошкодження не змінено.', 'Time of damage is unchanged.'],
  ['Abgeschleppt am: liegt mehr als ein Jahr zurück.', 'Евакуйовано: понад рік тому.', 'Towed on: more than a year ago.'],
  ['Standort ist unverändert.', 'Місцезнаходження не змінено.', 'Location is unchanged.'],
  ['Angaben zu Schlüssel/Fahrzeugschein sind unverändert.', 'Дані про ключ/свідоцтво про реєстрацію не змінилися.', 'Key/registration certificate details are unchanged.'],
  ['Abholung: bitte zuerst eintragen, wo Schlüssel/Fahrzeugschein liegen.', 'Отримання: спершу вкажіть, де лежать ключ/свідоцтво про реєстрацію.', 'Pick-up: please first enter where the key/registration certificate are.'],
  ['Abholung: „Gültig bis“ liegt mehr als ein Jahr in der Zukunft.', 'Отримання: «Дійсний до» більш ніж на рік у майбутньому.', 'Pick-up: “valid until” is more than one year in the future.'],
  ['Vermerk ist zu lang (max. 300 Zeichen).', 'Примітка задовга (макс. 300 символів).', 'The note is too long (max. 300 characters).'],
  ['Bitte Begründung angeben.', 'Будь ласка, вкажіть обґрунтування.', 'Please give a reason.'],
  ['Diese Rechnungsnummer ist bereits als Fremdleistung erfasst. Bitte prüfen (doppelte Buchung?) und nur bei Bedarf ausdrücklich bestätigen, z. B. bei einer Sammelrechnung für mehrere Fahrzeuge.', 'Цей номер рахунку вже внесено як сторонню послугу. Перевірте (подвійне проведення?) і за потреби явно підтвердьте, напр. для збірного рахунку на кілька транспортних засобів.', 'This invoice number is already recorded as an external service. Please check (double booking?) and confirm explicitly only if needed, e.g. for a collective invoice covering several vehicles.'],
  ['Diese Kontrolle hat Mängel an bereits offenen Vorgängen erneut festgestellt – Fahrzeug lässt sich nicht korrigieren. Bitte ablehnen und am richtigen Fahrzeug neu melden.', 'Ця перевірка повторно виявила дефекти у вже відкритих заявках – транспорт виправити не можна. Відхиліть і повідомте заново для правильного транспорту.', 'This check re-reported defects on cases that were already open – the vehicle cannot be corrected. Please reject and report again on the correct vehicle.'],
  // Backlog 412: Stundensatz-Verlauf
  ['Bisheriger Stundensatz gilt bis: Datum im Format JJJJ-MM-TT angeben.', 'Попередня ставка діє до: вкажіть дату у форматі РРРР-ММ-ДД.', 'Previous rate valid until: enter a date as YYYY-MM-DD.'],
  ['Bisherigen Stundensatz nur zusammen mit einem neuen Stundensatz behalten.', 'Попередню ставку можна залишити лише разом із новою ставкою.', 'Keep the previous hourly rate only together with a new hourly rate.'],
  ['Es ist noch kein gültiger Stundensatz gespeichert, der behalten werden kann.', 'Ще не збережено чинної погодинної ставки, яку можна залишити.', 'No valid hourly rate is stored yet that could be kept.'],
  ['Der Stundensatz ist unverändert – der bisherige Satz muss nicht behalten werden.', 'Погодинна ставка не змінилася – попередню ставку зберігати не потрібно.', 'The hourly rate is unchanged – the previous rate does not need to be kept.'],
  ['Bisheriger Stundensatz gilt bis: Datum liegt zu weit zurück.', 'Попередня ставка діє до: дата надто давня.', 'Previous rate valid until: date is too far back.'],
  ['Bisheriger Stundensatz gilt bis: höchstens bis Ende des nächsten Jahres.', 'Попередня ставка діє до: не пізніше кінця наступного року.', 'Previous rate valid until: at most until the end of next year.'],
  ['Der bisherige Stundensatz muss nach dem letzten Satzwechsel enden.', 'Попередня ставка має закінчуватися після останньої зміни ставки.', 'The previous hourly rate must end after the last rate change.'],
  ['Erreichbarkeit: bitte die Wochentage wählen.', 'Доступність: оберіть дні тижня.', 'Availability: please choose the weekdays.'],
  ['Erreichbarkeit: Wochentage ungültig.', 'Доступність: недійсні дні тижня.', 'Availability: invalid weekdays.'],
  ['Bundesland: ungültiger Wert.', 'Федеральна земля: недійсне значення.', 'State: invalid value.'],
  ['Bundesland nur zusammen mit „nicht an Feiertagen“.', 'Федеральну землю лише разом із «не у святкові дні».', 'State only together with “not on public holidays”.'],
  ['Weitere Zeitspannen: ungültiger Wert.', 'Додаткові проміжки: недійсне значення.', 'Further time spans: invalid value.'],
  ['Erreichbarkeit: höchstens 2 weitere Zeitspannen.', 'Доступність: щонайбільше 2 додаткові проміжки.', 'Availability: at most 2 further time spans.'],
  ['Weitere Zeitspanne: bitte die Wochentage wählen.', 'Додатковий проміжок: оберіть дні тижня.', 'Further time span: please choose the weekdays.'],
  ['Erreichbarkeit: Uhrzeit „von“ und „bis“ beide angeben (HH:MM) oder beide leer lassen.', 'Доступність: вкажіть час «з» і «до» (ГГ:ХХ) або залиште обидва порожніми.', 'Availability: enter both “from” and “to” times (HH:MM) or leave both empty.'],
  ['Hinweis zum Termin nur zusammen mit einem Termin angeben.', 'Примітку до терміну вказуйте лише разом із терміном.', 'Enter the note on the date only together with a date.'],
  ['Bitte angeben, worauf noch gewartet wird.', 'Вкажіть, на що ще чекаємо.', 'Please state what is still outstanding.'],
  ['Rückfrage nur mit „Nur benachrichtigen: Gemeldet von“.', 'Уточнення лише з «Сповістити лише: Повідомив».', 'A question requires “Notify only: Reported by”.'],
  ['Rückfrage an sich selbst ist nicht möglich.', 'Уточнення самому собі неможливе.', 'You cannot ask yourself a question.'],
  ['Rückfrage nur an offenen Vorgängen.', 'Уточнення лише для відкритих заявок.', 'Questions are only possible on open cases.'],
  ['question: open oder answered.', 'question: open або answered.', 'question: open or answered.'],
  ['Unbekannter Filter.', 'Невідомий фільтр.', 'Unknown filter.'],
  ['Unbekannte Prüfart.', 'Невідомий вид перевірки.', 'Unknown inspection type.'],
  ['Datum „fällig bis“ ungültig.', 'Недійсна дата «до терміну».', 'Invalid “due by” date.'],
  ['Datum „Fristen bis“ ungültig.', 'Недійсна дата «Строки до».', 'Invalid “Deadlines by” date.'],
];
for (const [de, uk, en] of V_MORE) { VALIDATION_TEXTS.uk[de] = uk; VALIDATION_TEXTS.en[de] = en; }
Object.assign(VALIDATION_TEXTS.uk, { cv_busy: 'Інші дефекти цієї перевірки вже в роботі ({v}) – транспорт виправити не можна. Відхиліть і повідомте заново для правильного транспорту.' });
Object.assign(VALIDATION_TEXTS.en, { cv_busy: 'Other defects from this check are already being handled ({v}) – the vehicle cannot be corrected. Please reject and report again on the correct vehicle.' });
Object.assign(VALIDATION_TEXTS.uk, { receipt_pos: 'Позиція {n}: {m}', dup_closed: 'Справа {v} вже закрита – дублікат лише до відкритої справи.', vin_exists: 'Транспорт із цим VIN уже існує ({v}) – скористайтеся «Редагувати дані» в картці транспорту.', cents: '{f}: не більше 2 знаків після коми.', work_date_range: 'Дата роботи: не в майбутньому і не раніше {d}.', open_cases: 'Транспорт ще має відкриті заявки ({n}, усі середовища) – спочатку закрийте їх.', already_assigned: '{v} уже призначено цьому транспорту.', duplicate_fine: 'Номер справи вже внесено ({v}).', date_fmt: '{f}: вкажіть дійсну дату у форматі РРРР-ММ-ДД.', date_range: '{f}: дата поза допустимим діапазоном.', not_future: '{f}: не може бути в майбутньому.', integer: '{f}: ціле число.', max_rows: 'Не більше {n} рядків за один імпорт.', notes_max: 'Не більше {n} активних приміток на транспорт – заархівуйте виконані.', kind_unknown: 'Невідомий тип транспорту: {v} (Lkw або Anhänger)', counted_twice: 'Позицію підраховано двічі: {v}', unit_differs: 'Одиниця на цільовому складі інша ({a} замість {b}) – перевірте там.', dup_of_dup: 'Заявка {v} сама є дублікатом – виберіть початкову заявку.', unknown_item: 'Невідомий пункт перевірки {v}.' });
Object.assign(VALIDATION_TEXTS.en, { receipt_pos: 'Line {n}: {m}', dup_closed: 'Case {v} is already closed – duplicate only of an open case.', vin_exists: 'A vehicle with this VIN already exists ({v}) – please use “Edit master data” in the vehicle file.', cents: '{f}: at most 2 decimal places.', work_date_range: 'Work date: not in the future and not before {d}.', open_cases: 'Vehicle still has open cases ({n}, all environments) – close them first.', already_assigned: '{v} is already assigned to this vehicle.', duplicate_fine: 'Case reference already recorded ({v}).', date_fmt: '{f}: valid date in format YYYY-MM-DD.', date_range: '{f}: date outside the permitted range.', not_future: '{f}: must not be in the future.', integer: '{f}: whole number.', max_rows: 'At most {n} rows per import.', notes_max: 'At most {n} active notes per vehicle – please archive completed ones.', kind_unknown: 'Unknown vehicle type: {v} (Lkw or Anhänger)', counted_twice: 'Item counted twice: {v}', unit_differs: 'Different unit in the target store ({a} instead of {b}) – please check there.', dup_of_dup: 'Case {v} is itself a duplicate – please choose the original case.', unknown_item: 'Unknown check item {v}.' });
Object.assign(FIELD_NAMES.uk, { 'Anhänger-FIN': 'VIN причепа', Stand: 'Стан', Telefonnummer: 'Номер телефону', Lager: 'Склад', 'Art der Rufnummer': 'Вид номера', Geltung: 'Діє для', Kontrolldatum: 'Дата перевірки', 'Gültig bis': 'Дійсний до', 'Beendet am': 'Завершено', 'Ausgestellt am': 'Видано', Vertragsende: 'Кінець договору', Vertragsbeginn: 'Початок договору', 'Erstattet am': 'Відшкодовано', 'Gemeldet am': 'Повідомлено', Vertragspartner: 'Контрагент', Vertragsnummer: 'Номер договору', Monatsrate: 'Щомісячний платіж', Versicherer: 'Страховик', Schadennummer: 'Номер страхового випадку', Selbstbeteiligung: 'Франшиза', Behörde: 'Орган влади', Tatzeit: 'Час порушення', Lieferant: 'Постачальник', Anfangsbestand: 'Початковий запас', Nachweis: 'Підтвердження', Quelle: 'Джерело', Reifengröße: 'Розмір шини', Luftdruck: 'Тиск у шинах', Hinweis: 'Примітка', Datum: 'Дата', Status: 'Статус', Priorität: 'Пріоритет', Art: 'Вид', Vertragsart: 'Вид договору', 'km-Kontingent': 'Ліміт пробігу', 'km bei Übernahme': 'Пробіг при отриманні', 'Kündigungsfrist (Monate)': 'Строк розірвання (місяці)', 'Intervall Monate': 'Інтервал (місяці)', 'Intervall km': 'Інтервал (км)', Erstattung: 'Відшкодування', Baujahr: 'Рік випуску', Auslesedatum: 'Дата зчитування', Marke: 'Марка', DOT: 'DOT', Vorgang: 'Заявка', Grundlage: 'Підстава', Verstoß: 'Порушення', Aktion: 'Дія' , Feld: 'Поле', Ort: 'Місце', Aktenzeichen: 'Номер справи', Standort: 'Локація', Hersteller: 'Виробник', Modell: 'Модель', Stammstatus: 'Статус у реєстрі', Beleg: 'Документ', Teilenummer: 'Номер деталі', Einheit: 'Одиниця', Nummer: 'Номер', Klassen: 'Категорії', Personalnummer: 'Табельний номер', 'Anhänger-Kennzeichen': 'Номер причепа', Prüfpunkt: 'Пункт перевірки', Antwortfrist: 'Строк відповіді', 'Letzte Prüfung': 'Остання перевірка', 'Nächster Termin': 'Наступний термін', Termin: 'Термін', Erstzulassung: 'Перша реєстрація', 'Fällig bis': 'Кінець/розірвання до' });
Object.assign(FIELD_NAMES.en, { 'Anhänger-FIN': 'Trailer VIN', Stand: 'State', Telefonnummer: 'Phone number', Lager: 'Store', 'Art der Rufnummer': 'Number type', Geltung: 'Applies to', Kontrolldatum: 'Check date', 'Gültig bis': 'Valid until', 'Beendet am': 'Ended on', 'Ausgestellt am': 'Issued on', Vertragsende: 'Contract end', Vertragsbeginn: 'Contract start', 'Erstattet am': 'Reimbursed on', 'Gemeldet am': 'Reported on', Vertragspartner: 'Contract partner', Vertragsnummer: 'Contract number', Monatsrate: 'Monthly rate', Versicherer: 'Insurer', Schadennummer: 'Claim number', Selbstbeteiligung: 'Deductible', Behörde: 'Authority', Tatzeit: 'Time of offence', Lieferant: 'Supplier', Anfangsbestand: 'Opening stock', Nachweis: 'Evidence', Quelle: 'Source', Reifengröße: 'Tyre size', Luftdruck: 'Tyre pressure', Hinweis: 'Note', Datum: 'Date', Status: 'Status', Priorität: 'Priority', Art: 'Type', Vertragsart: 'Contract type', 'km-Kontingent': 'Mileage allowance', 'km bei Übernahme': 'Odometer at handover', 'Kündigungsfrist (Monate)': 'Notice period (months)', 'Intervall Monate': 'Interval (months)', 'Intervall km': 'Interval (km)', Erstattung: 'Reimbursement', Baujahr: 'Year of manufacture', Auslesedatum: 'Download date', Marke: 'Brand', DOT: 'DOT', Vorgang: 'Case', Grundlage: 'Basis', Verstoß: 'Offence', Aktion: 'Action' , Feld: 'Field', Ort: 'Location', Aktenzeichen: 'Reference', Standort: 'Site', Hersteller: 'Manufacturer', Modell: 'Model', Stammstatus: 'Master status', Beleg: 'Document', Teilenummer: 'Part number', Einheit: 'Unit', Nummer: 'Number', Klassen: 'Classes', Personalnummer: 'Personnel number', 'Anhänger-Kennzeichen': 'Trailer plate', Prüfpunkt: 'Check item', Antwortfrist: 'Response deadline', 'Letzte Prüfung': 'Last inspection', 'Nächster Termin': 'Next date', Termin: 'Date', Erstzulassung: 'First registration', 'Fällig bis': 'End/notice by' });
// [CLAUDE] 23.10.2026 Gutachter im Versicherungsfall (Teilagent „Versicherungsschaden mit Gutachter“)
Object.assign(FIELD_NAMES.uk, { Suche: 'Пошук' });
Object.assign(FIELD_NAMES.uk, { Abholung: 'Отримання' });
Object.assign(FIELD_NAMES.en, { Abholung: 'Pick-up' });
Object.assign(FIELD_NAMES.en, { Suche: 'Search' });
Object.assign(FIELD_NAMES.uk, { 'Kennzeichen Unfallgegner': 'Номер авто другої сторони', 'Versicherer Unfallgegner': 'Страховик другої сторони', 'Schadennummer Unfallgegner': 'Номер справи другої сторони' });
Object.assign(FIELD_NAMES.en, { 'Kennzeichen Unfallgegner': 'Other party’s plate', 'Versicherer Unfallgegner': 'Other party’s insurer', 'Schadennummer Unfallgegner': 'Other party’s claim number' });
Object.assign(FIELD_NAMES.uk, { Gutachter: 'Експерт', 'Besichtigung am': 'Огляд', 'Gutachten eingegangen am': 'Висновок отримано', 'Schadenhöhe laut Gutachten': 'Сума збитку за висновком' });
Object.assign(FIELD_NAMES.en, { Gutachter: 'Appraiser', 'Besichtigung am': 'Inspection on', 'Gutachten eingegangen am': 'Appraisal received on', 'Schadenhöhe laut Gutachten': 'Damage per appraisal' });
// Polizeiliche Anzeige im Versicherungsfall (Teilagent „Kraftstoffdiebstahl am Rastplatz“, 24.10.2026) – nur laut Anzeigebestätigung/Fahrerangabe
Object.assign(FIELD_NAMES.uk, { Polizeidienststelle: 'Відділок поліції', 'Polizeiliches Aktenzeichen': 'Номер справи поліції', 'Anzeige erstattet am': 'Заяву подано' });
Object.assign(FIELD_NAMES.en, { Polizeidienststelle: 'Police station', 'Polizeiliches Aktenzeichen': 'Police case number', 'Anzeige erstattet am': 'Report filed on' });
// [CLAUDE] 24.10.2026 Standort des Fahrzeugs / Abschleppung am Vorgang (Migration 0079, Teilagent „Fahrzeug wird abgeschleppt“)
// Backlog 423: Schlüssel/Fahrzeugschein bei der Werkstatt
Object.assign(FIELD_NAMES.uk, { Schadenzeitpunkt: 'Час пошкодження', 'Standort des Fahrzeugs': 'Де стоїть транспорт', Abschleppdienst: 'Евакуаційна служба', 'Abgeschleppt am': 'Евакуйовано' });
Object.assign(FIELD_NAMES.en, { Schadenzeitpunkt: 'Time of damage', 'Standort des Fahrzeugs': 'Vehicle location', Abschleppdienst: 'Towing service', 'Abgeschleppt am': 'Towed on' });
Object.assign(FIELD_NAMES.uk, { Fahrzeugschlüssel: 'Ключ від транспорту', Fahrzeugschein: 'Свідоцтво про реєстрацію' });
Object.assign(FIELD_NAMES.en, { Fahrzeugschlüssel: 'Vehicle key', Fahrzeugschein: 'Registration certificate' });
// Unfallgegner im Versicherungsfall (Teilagent „Unfall mit fremdem Fahrzeug“, 24.10.2026) – nur laut Unfallbericht/Schreiben, kein Namensfeld
// Suche in den Versicherungsfällen (Backlog 219): nur eingetragene Nummern/Namen, kein Freitext-Vermerk
// [CLAUDE] 23.10.2026 Werkstattauftrag ohne Reparatur beenden (Teilagent „Totalschaden“)
Object.assign(FIELD_NAMES.uk, { Frist: 'Строк', Begründung: 'Обґрунтування', Aktiv: 'Активний', Bestätigung: 'Підтвердження', Sicherheitsrelevant: 'Важливо для безпеки', 'Ersetzt eigene Arbeit/Teile': 'Замінює власну роботу/запчастини', Geprüft: 'Перевірено', 'Für Fahrer sichtbar': 'Видно водію', Ausgenommen: 'Виключено', 'Bisherige Zuordnung beenden': 'Завершити попереднє призначення', 'Aktiv lassen': 'Залишити активним', 'Nur anlegen': 'Лише створити' });
Object.assign(FIELD_NAMES.en, { Frist: 'Deadline', Begründung: 'Reason', Aktiv: 'Active', Bestätigung: 'Confirmation', Sicherheitsrelevant: 'Safety-relevant', 'Ersetzt eigene Arbeit/Teile': 'Replaces own labour/parts', Geprüft: 'Verified', 'Für Fahrer sichtbar': 'Visible to drivers', Ausgenommen: 'Excluded', 'Bisherige Zuordnung beenden': 'End previous assignment', 'Aktiv lassen': 'Keep active', 'Nur anlegen': 'Create only' });
// Feldnamen aus Auswahl-/Formularprüfungen (19.10.2026: „Rolle/Umgebung/Ergebnis/Passwort … is required“ blieb deutsch)
Object.assign(FIELD_NAMES.uk, { 'Nicht an Feiertagen': 'Не у святкові дні', 'Vermerk': 'Примітка', 'Passwort': 'Пароль', 'Fehlerbeschreibung': 'Опис несправності', 'Versicherungsvertrag': 'Договір страхування', 'Datei': 'Файл', 'Vertragsdokument': 'Документ договору', 'Ziellager': 'Склад призначення', 'Geräte-ID': 'ID пристрою', 'Nachweis/Quelle': 'Підтвердження / джерело', 'Nachweis (z. B. Fahrzeugschein)': 'Підтвердження (напр. свідоцтво про реєстрацію)', 'zulässige Gesamtmasse (kg)': 'Дозволена повна маса (кг)', 'Nachweis (z. B. Prüfbericht-Nr.)': 'Підтвердження (напр. № протоколу огляду)', 'Entscheidung': 'Рішення', 'Rolle': 'Роль', 'Umgebung': 'Середовище', 'Dringlichkeit': 'Терміновість', 'Fahrbereitschaft': 'Готовність до руху', 'Wertart': 'Вид оцінки', 'Kontrollart': 'Вид перевірки', 'Ergebnis': 'Результат', 'Buchungsart': 'Вид операції', 'Position': 'Позиція', 'Achse': 'Вісь', 'Gewichtsklasse': 'Вагова категорія', 'Dokumentart': 'Вид документа', 'Zählmenge': 'Підрахована кількість' });
Object.assign(FIELD_NAMES.en, { 'Nicht an Feiertagen': 'Not on public holidays', 'Vermerk': 'Note', 'Passwort': 'Password', 'Fehlerbeschreibung': 'Fault description', 'Versicherungsvertrag': 'Insurance contract', 'Datei': 'File', 'Vertragsdokument': 'Contract document', 'Ziellager': 'Target store', 'Geräte-ID': 'Device ID', 'Nachweis/Quelle': 'Evidence / source', 'Nachweis (z. B. Fahrzeugschein)': 'Evidence (e.g. registration certificate)', 'zulässige Gesamtmasse (kg)': 'Permissible gross weight (kg)', 'Nachweis (z. B. Prüfbericht-Nr.)': 'Evidence (e.g. inspection report no.)', 'Entscheidung': 'Decision', 'Rolle': 'Role', 'Umgebung': 'Environment', 'Dringlichkeit': 'Urgency', 'Fahrbereitschaft': 'Roadworthiness', 'Wertart': 'Valuation type', 'Kontrollart': 'Check type', 'Ergebnis': 'Result', 'Buchungsart': 'Movement type', 'Position': 'Position', 'Achse': 'Axle', 'Gewichtsklasse': 'Weight class', 'Dokumentart': 'Document type', 'Zählmenge': 'Counted quantity' });
Object.assign(VALIDATION_TEXTS.uk, { ct_date_col: 'Стовпець дати «{x}» не розпізнано – використайте назви стовпців «Beginn» (початок) і «Ende» (кінець).', work_day_max: 'Не більше {max} годин на обліковий запис за робочий день – на {d} вже внесено {h} год.' });
Object.assign(VALIDATION_TEXTS.en, { ct_date_col: 'Date column “{x}” not assigned – please use “Beginn” (start) and “Ende” (end) as column names.', work_day_max: 'At most {max} hours per user account and working day – {h} h are already recorded on {d}.' });
export const VALIDATION_FIXED = Object.keys(VALIDATION_TEXTS.uk).filter((k) => k.endsWith('.') && k.includes(' ') || /^[A-ZÄÖÜ]/.test(k));
// Zahlgrenzen in Prüfmeldungen im Format der Sprache (Server schreibt „0.01“/„100000“): Dezimalzeichen je Sprache,
// Tausendertrennung erst ab 10 000 (Jahreszahlen wie 2027 bleiben ohne Trenner) – 19.10.2026
export function fmtLimit(lang, x) {
  const n = Number(x); if (!Number.isFinite(n)) return String(x);
  return n.toLocaleString(lang === 'uk' ? 'uk-UA' : lang === 'en' ? 'en-GB' : 'de-DE', { maximumFractionDigits: 6, useGrouping: Math.abs(n) >= 10000 });
}
// Deutsche Server-Meldung mit Zahlgrenze im deutschen Zahlformat (sonst unverändert → null)
export function deLimitText(msg) {
  if (typeof msg !== 'string') return null;
  let m;
  if ((m = msg.match(/^(.{1,60}): zulässig von (-?[\d.e+]+) bis (-?[\d.e+]+)\.$/))) return `${m[1]}: zulässig von ${fmtLimit('de', m[2])} bis ${fmtLimit('de', m[3])}.`;
  if ((m = msg.match(/^(.{1,60}): (höchstens|mindestens) (-?[\d.e+]+)\.$/))) return `${m[1]}: ${m[2]} ${fmtLimit('de', m[3])}.`;
  return null;
}
Object.assign(VALIDATION_TEXTS.uk, { csv_quote: 'Рядок {n}: лапки не закрито – перевірте файл.' });
Object.assign(VALIDATION_TEXTS.en, { csv_quote: 'Line {n}: quotation mark not closed – please check the file.' });
Object.assign(VALIDATION_TEXTS.uk, { csv_columns: 'Рядок {n}: значень більше, ніж стовпців у заголовку – роздільник у значенні? Візьміть значення з комою в лапки або збережіть як CSV з крапкою з комою.' });
Object.assign(VALIDATION_TEXTS.en, { csv_columns: 'Line {n}: more values than header columns – separator inside a value? Put values containing commas in quotation marks or save as CSV with semicolons.' });
Object.assign(VALIDATION_TEXTS.uk, { int_sep: '{f}: «{v}» – вводьте без розділювача тисяч (напр. {x}).' });
Object.assign(VALIDATION_TEXTS.en, { int_sep: '{f}: “{v}” – please enter without thousands separator (e.g. {x}).' });
export function translateValidation(lang, msg) {
  const T = VALIDATION_TEXTS[lang]; if (!T || typeof msg !== 'string') return null;
  if (Object.hasOwn(T, msg) && msg.endsWith('.') && msg.includes(' ')) return T[msg];
  const fx = (x) => (FIELD_NAMES[lang] && Object.hasOwn(FIELD_NAMES[lang], x) ? FIELD_NAMES[lang][x] : null);
  // Feld mit Artikelname („Zählmenge AdBlue“, Inventur 19.10.2026): Feldname übersetzen, Name bleibt wörtlich (lange Artikelnamen bis 200 Zeichen: eigenes Muster, 20.10.2026 blieb die Meldung sonst deutsch)
  const f = (x) => fx(x) ?? (/^Zählmenge ./.test(x) && fx('Zählmenge') ? fx('Zählmenge') + x.slice('Zählmenge'.length) : x);
  let m;
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}) ist erforderlich\.$/))) return T.required.replace('{f}', f(m[1]));
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}) ist zu lang \(max\. (\d+) Zeichen\)\.$/))) return T.too_long.replace('{f}', f(m[1])).replace('{n}', m[2]);
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): ungültiger Wert\.$/))) return T.value.replace('{f}', f(m[1]));
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): ungültige Zahl\.$/))) return T.number.replace('{f}', f(m[1]));
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): zulässig von (-?[\d.e+]+) bis (-?[\d.e+]+)\.$/))) return T.num_range.replace('{f}', f(m[1])).replace('{a}', fmtLimit(lang, m[2])).replace('{b}', fmtLimit(lang, m[3]));
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): höchstens (-?[\d.e+]+)\.$/))) return T.num_max.replace('{f}', f(m[1])).replace('{b}', fmtLimit(lang, m[2]));
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): mindestens (-?[\d.e+]+)\.$/))) return T.num_min.replace('{f}', f(m[1])).replace('{a}', fmtLimit(lang, m[2]));
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): „(.{0,40})“ – bitte ohne Tausendertrennzeichen eingeben \(z\. B\. (-?\d{1,12})\)\.$/)) && T.int_sep) return T.int_sep.replace('{f}', () => f(m[1])).replace('{v}', () => m[2]).replace('{x}', () => m[3]);
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): „(.{0,40})“ ist mehrdeutig/))) return T.ambiguous.replace('{f}', () => f(m[1])).replace('{v}', () => m[2]);
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): (?:gültiges )?Datum im Format JJJJ-MM-TT\.$/))) return T.date_fmt.replace('{f}', f(m[1]));
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): Datum außerhalb des zulässigen Bereichs\.$/))) return T.date_range.replace('{f}', f(m[1]));
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): darf nicht in der Zukunft liegen\.$/))) return T.not_future.replace('{f}', f(m[1]));
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): ganze Zahl\.$/))) return T.integer.replace('{f}', f(m[1]));
  if ((m = msg.match(/^(Zählmenge .{1,210}|.{1,60}): höchstens 2 Nachkommastellen\.$/))) return T.cents.replace('{f}', f(m[1]));
  if ((m = msg.match(/^Maximal (\d{1,6}) Zeilen je Import\.$/))) return T.max_rows.replace('{n}', m[1]);
  if ((m = msg.match(/^Zeile (\d{1,7}): Anführungszeichen nicht geschlossen – bitte die Datei prüfen\.$/)) && T.csv_quote) return T.csv_quote.replace('{n}', m[1]);
  if ((m = msg.match(/^Zeile ([\d, …]{1,60}): mehr Werte als Spalten in der Kopfzeile – Trennzeichen im Wert\? Werte mit Komma in Anführungszeichen setzen oder als CSV mit Semikolon speichern\.$/)) && T.csv_columns) return T.csv_columns.replace('{n}', m[1]);
  if ((m = msg.match(/^Höchstens (\d{1,4}) aktive Hinweise je Fahrzeug – bitte erledigte archivieren\.$/))) return T.notes_max.replace('{n}', m[1]);
  if ((m = msg.match(/^Fahrzeugart unbekannt: (.{0,60}) \(Lkw oder Anhänger\)$/))) return T.kind_unknown.replace('{v}', () => m[1]);
  // Wareneingang (Backlog 445): „Position N: <Meldung>“ – Meldung übersetzen, Nummer bleibt
  if ((m = msg.match(/^Position (\d{1,2}): (.{1,200})$/)) && Object.hasOwn(T, m[2])) return T.receipt_pos.replace('{n}', m[1]).replace('{m}', () => T[m[2]]);
  if ((m = msg.match(/^Artikel doppelt gezählt: (.{1,200})$/))) return T.counted_twice.replace('{v}', () => m[1]);
  if ((m = msg.match(/^Einheit im Ziellager abweichend \((.{0,40}) statt (.{0,40})\) – bitte dort prüfen\.$/))) return T.unit_differs.replace('{a}', () => m[1]).replace('{b}', () => m[2]);
  if ((m = msg.match(/^Vorgang (\S{1,40}) ist selbst eine Dublette – bitte den ursprünglichen Vorgang wählen\.$/))) return T.dup_of_dup.replace('{v}', () => m[1]);
  if ((m = msg.match(/^Vorgang (\S{1,40}) ist bereits abgeschlossen – Dublette nur zu einem offenen Vorgang\.$/))) return T.dup_closed.replace('{v}', () => m[1]);
  if ((m = msg.match(/^Weitere Mängel dieser Kontrolle sind bereits in Bearbeitung \(([^()]{1,400})\) – Fahrzeug lässt sich nicht korrigieren\. Bitte ablehnen und am richtigen Fahrzeug neu melden\.$/)) && T.cv_busy) return T.cv_busy.replace('{v}', () => m[1]);
  if ((m = msg.match(/^Unbekannter Prüfpunkt (.{1,60})\.$/))) return T.unknown_item.replace('{v}', () => m[1]);
  if ((m = msg.match(/^Datumsspalte „(.{1,80})“ nicht zugeordnet – bitte „Beginn“ und „Ende“ als Spaltennamen verwenden\.$/))) return T.ct_date_col.replace('{x}', m[1]);
  if ((m = msg.match(/^Höchstens (\d{1,2}) Stunden je Benutzerkonto und Arbeitstag – am (\d{2}\.\d{2}\.\d{4}) sind bereits (\d{1,3}(?:,\d{1,2})?) h erfasst\.$/))) return T.work_day_max.replace('{max}', m[1]).replace('{d}', lang === 'en' ? m[2].replace(/\./g, '/') : m[2]).replace('{h}', lang === 'en' ? m[3].replace(',', '.') : m[3]);
  if ((m = msg.match(/^Arbeitsdatum: nicht in der Zukunft und nicht vor dem (\d{2}\.\d{2}\.\d{4})\.$/))) return T.work_date_range.replace('{d}', lang === 'en' ? m[1].replace(/\./g, '/') : m[1]);
  if ((m = msg.match(/^Fahrzeug hat noch offene Vorgänge \((\d{1,6}), alle Umgebungen\) – zuerst abschließen\.$/))) return T.open_cases.replace('{n}', m[1]);
  if ((m = msg.match(/^Für diese Durchführung am (\d{2}\.\d{2}\.\d{4}) ist bereits ein anderer Nachweis erfasst \(„([\s\S]{1,120})“\) – bitte Datum und Bericht prüfen\.$/)) && T.evidence_exists) return T.evidence_exists.replace('{d}', lang === 'en' ? m[1].replace(/\./g, '/') : m[1]).replace('{v}', () => m[2]);
  if ((m = msg.match(/^(.{1,120}) ist diesem Fahrzeug bereits zugeordnet\.$/))) return T.already_assigned.replace('{v}', () => m[1]);
  if ((m = msg.match(/^Aktenzeichen bereits erfasst \((\S{1,40})\)\.$/))) return T.duplicate_fine.replace('{v}', () => m[1]);
  if ((m = msg.match(/^Fahrzeug mit dieser FIN besteht bereits \((.{1,40})\) – bitte in der Fahrzeugakte „Stammdaten bearbeiten“ verwenden\.$/))) return T.vin_exists.replace('{v}', () => m[1]);
  return null;
}
// [CLAUDE] Weitere Fehlercodes in der App-Sprache (Benutzerverwaltung, Ersteinrichtung, falscher Import)
// [CLAUDE] Browser-Prüfhinweise an Formularfeldern in der App-Sprache (sonst Gerätesprache, z. B. Deutsch auf dem Handy, App auf Ukrainisch)
// [CLAUDE] Zeilenhinweise der Import-Vorschauen (Fahrzeugstamm, Prüftermine, Verträge, Auslesungen) in der App-Sprache.
// Der Server liefert deutsche Gründe je Zeile; Werte aus der Datei (Kennzeichen, Datum, Art) bleiben wörtlich stehen.
// Unbekannte Gründe: über translateValidation (Feldfehler aus readBody/vehicleRow), sonst der deutsche Server-Text.
const IMPORT_FIXED = [
  ['Kennzeichen gehörte zu diesem Datum einem anderen Fahrzeug (Kennzeichenwechsel) – bitte FIN angeben', 'Номер на цю дату належав іншому транспорту (зміна номера) – вкажіть VIN', 'On this date the plate belonged to another vehicle (plate change) – please provide the VIN'],
  ['Fahrzeug ruhend – Rückruf erscheint nicht in Prüftermin-Übersicht, Werkstattplan und Fuhrparkagent (nur in der Fahrzeugakte)', 'Транспорт «Неактивний облік» – відкликання не з’являється в огляді перевірок, плані майстерні та агенті автопарку (лише в картці транспорту)', 'Vehicle dormant – recall does not appear in the inspection overview, workshop plan or fleet agent (only in the vehicle file)'],
  ['FIN ungültig/fehlt', 'VIN недійсний/відсутній', 'VIN invalid/missing'],
  ['FIN ungültig', 'VIN недійсний', 'VIN invalid'],
  ['FIN nicht im Fahrzeugstamm', 'VIN немає в реєстрі транспорту', 'VIN not in the vehicle master data'],
  ['Achse passt nicht zum Anhänger', 'Вісь не підходить для причепа', 'Axle does not match a trailer'],
  ['Fahrzeug außer Betrieb – nicht übernommen', 'Транспортний засіб виведено з експлуатації – не перенесено', 'Vehicle out of service – not imported'],
  ['Kennzeichen auch an außer Betrieb genommenem Fahrzeug, Datum vor Anlage dieses Fahrzeugs – bitte FIN angeben', 'Номерний знак є також у виведеного з експлуатації транспортного засобу, дата раніше створення цього транспортного засобу – вкажіть VIN', 'Licence plate also on a vehicle taken out of service, date before this vehicle was created – please give the VIN'],
  ['Kennzeichen nicht im Fahrzeugstamm', 'Номерного знака немає в реєстрі транспорту', 'Licence plate not in the vehicle master data'],
  ['Kennzeichen mehrdeutig – FIN angeben', 'Номерний знак неоднозначний – вкажіть VIN', 'Licence plate ambiguous – please give the VIN'],
  ['Nachweis/Quelle fehlt', 'Відсутній підтверджувальний документ/джерело', 'Evidence/source missing'],
  ['Mehrere Prüftermine „Sonstiges“ an diesem Fahrzeug – einzeln in der Fahrzeugakte pflegen', 'Кілька термінів «Інше» для цього транспорту – редагуйте окремо в картці транспорту', 'Several “Other” inspection dates on this vehicle – maintain them individually in the vehicle file'],
  ['Rückrufe über „Rückrufe importieren“ oder einzeln in der Fahrzeugakte erfassen', 'Відкликання вносьте через «Імпорт відкликань» або окремо в картці транспорту', 'Enter recalls via “Import recalls” or individually in the vehicle file'],
  ['Kein Termin eingetragen – Zeile bleibt unverändert', 'Дату не вказано – рядок залишається без змін', 'No date entered – row left unchanged'],
  ['Nachweis zu lang (max. 300 Zeichen)', 'Підтвердження занадто довге (макс. 300 символів)', 'Evidence too long (max. 300 characters)'],
  ['Letzte Prüfung bitte taggenau (JJJJ-MM-TT oder TT.MM.JJJJ)', 'Останню перевірку вкажіть з точністю до дня (РРРР-ММ-ДД або ДД.ММ.РРРР)', 'Please give the last inspection to the day (YYYY-MM-DD or DD.MM.YYYY)'],
  ['Kein Datum: „Nächster Termin“ oder „Letzte Prüfung“ angeben', 'Немає дати: вкажіть «Nächster Termin» або «Letzte Prüfung»', 'No date: enter “Nächster Termin” or “Letzte Prüfung”'],
  ['Letzte Prüfung liegt nach dem nächsten Termin', 'Остання перевірка пізніше наступного терміну', 'The last inspection is after the next due date'],
  ['Letzte Prüfung liegt in der Zukunft', 'Остання перевірка в майбутньому', 'The last inspection is in the future'],
  ['doppelt in der Datei', 'двічі у файлі', 'duplicate in the file'],
  ['Bezeichnung fehlt', 'Відсутня назва', 'Name missing'],
  ['Bezeichnung/Teilenummer zu lang', 'Назва/номер деталі задовгі', 'Name/part number too long'],
  ['Einheit zu lang (max. 20 Zeichen)', 'Одиниця задовга (макс. 20 символів)', 'Unit too long (max. 20 characters)'],
  ['Lagerort zu lang (max. 80 Zeichen)', 'Місце зберігання задовге (макс. 80 символів)', 'Storage location too long (max. 80 characters)'],
  ['Artikel vorhanden – Angaben/Bestand aus der Datei nicht übernommen; in der Artikelakte prüfen bzw. Zugang/Inventur buchen', 'Позиція вже є – дані/залишок із файлу не перенесено; перевірте картку позиції або оформіть надходження/інвентаризацію', 'Item exists – details/stock from the file not applied; check the item record or book a receipt/stocktake'],
  ['Auslesung wurde storniert – nicht erneut übernommen (bei Bedarf einzeln erfassen)', 'Зчитування скасовано – повторно не перенесено (за потреби внесіть окремо)', 'Download was cancelled – not imported again (record it individually if needed)'],
  ['Fällig bei km liegt nicht nach dem km-Stand der letzten Prüfung', '«Строк за пробігом, км» не перевищує пробіг під час останньої перевірки', '“Due at km” is not above the mileage at the last inspection'],
  ['km-Intervall fehlt: „Intervall km“ oder „Fällig bei km“ angeben', 'Немає інтервалу в км: вкажіть «Intervall km» або «Faellig bei km»', 'Mileage interval missing: enter “Intervall km” or “Faellig bei km”'],
  ['Datum liegt in der Zukunft', 'Дата в майбутньому', 'The date is in the future'],
  ['Referenz fehlt', 'Відсутній номер відкликання', 'Reference missing'],
  ['Referenz/Bemerkung zu lang (max. 250 Zeichen)', 'Номер/примітка задовгі (макс. 250 символів)', 'Reference/remark too long (max. 250 characters)'],
];
const IMPORT_TPL = [
  [/^Vertragsnummer läuft noch \(Beginn (.{1,40})\) – Folgevertrag erst nach „Vertrag beenden“ importieren$/, 'Номер договору ще діє (початок $1) – наступний договір імпортуйте лише після «Завершити договір»', 'Contract number still running (start $1) – import the follow-up contract only after “End contract”'],
  // [Muster, uk, en] – $1/$2 = wörtliche Werte aus der Datei
  [/^Prüfart unbekannt: (.{0,200})$/, 'Невідомий вид перевірки: $1', 'Unknown inspection type: $1'],
  [/^km ungültig: (.{0,200})$/, 'Недійсний пробіг (км): $1', 'Invalid mileage (km): $1'],
  [/^Vorhandener km-Stand der letzten Prüfung (.{1,40}) ist höher – nicht überschrieben$/, 'Наявний пробіг останньої перевірки $1 більший – не перезаписано', 'Existing mileage at last inspection $1 is higher – not overwritten'],
  [/^Vorhandene km-Fälligkeit (.{1,40}) ist höher – nicht überschrieben$/, 'Наявний строк за км $1 більший – не перезаписано', 'Existing mileage due $1 is higher – not overwritten'],
  [/^Intervall ungültig: (.{0,200})$/, 'Недійсний інтервал: $1', 'Invalid interval: $1'],
  [/^Doppelt in der Datei \(Zeile (\d{1,6}) ist gleich oder neuer\)$/, 'Двічі у файлі (рядок $1 такий самий або новіший)', 'Duplicate in the file (line $1 is the same or newer)'],
  [/^Ersetzt durch Zeile (\d{1,6}) \(neuerer Beleg\)$/, 'Замінено рядком $1 (новіший документ)', 'Replaced by line $1 (newer evidence)'],
  [/^Vorhandener Termin (\d{4}-\d{2}-\d{2}) ist neuer – nicht überschrieben$/, 'Наявний термін $1 новіший – не перезаписано', 'Existing due date $1 is newer – not overwritten'],
  [/^Vorhandene letzte Prüfung (\d{4}-\d{2}-\d{2}) liegt nach dem Termin – nicht überschrieben$/, 'Наявна остання перевірка $1 пізніша за термін – не перезаписано', 'Existing last inspection $1 is after the due date – not overwritten'],
  [/^Vorhandene letzte Prüfung (\d{4}-\d{2}-\d{2}) ist neuer – nicht überschrieben$/, 'Наявна остання перевірка $1 новіша – не перезаписано', 'Existing last inspection $1 is newer – not overwritten'],
  [/^Datum nicht erkannt: (.{0,200}) \(JJJJ-MM-TT, TT\.MM\.JJJJ oder MM\/JJJJ\)$/, 'Дату не розпізнано: $1 (РРРР-ММ-ДД, ДД.ММ.РРРР або ММ/РРРР)', 'Date not recognised: $1 (YYYY-MM-DD, DD.MM.YYYY or MM/YYYY)'],
  [/^Datum nicht erkannt: (.{0,200})$/, 'Дату не розпізнано: $1', 'Date not recognised: $1'],
  [/^FIN doppelt in der Datei \(Zeile (\d{1,6}) gilt\)$/, 'VIN двічі у файлі (діє рядок $1)', 'VIN twice in the file (row $1 applies)'],
  [/^Datum ungültig: (.{0,200})$/, 'Недійсна дата: $1', 'Invalid date: $1'],
  [/^Monat ungültig: (.{0,200})$/, 'Недійсний місяць: $1', 'Invalid month: $1'],
  [/^Zahl nicht erkannt: (.{0,200})$/, 'Число не розпізнано: $1', 'Number not recognised: $1'],
  [/^Kennzeichen nicht eindeutig: (.{0,200})$/, 'Номерний знак неоднозначний: $1', 'Licence plate not unique: $1'],
  [/^Vertrag besteht bereits beim Fahrzeug mit gleichem Kennzeichen \(FIN (.{0,40})\) – bitte FIN angeben$/, 'Договір уже є в транспортного засобу з тим самим номером (VIN $1) – вкажіть VIN', 'Contract already exists on the vehicle with the same plate (VIN $1) – please state the VIN'],
  [/^Fahrzeug nicht gefunden: (.{0,200})$/, 'Транспорт не знайдено: $1', 'Vehicle not found: $1'],
  [/^Vertragsart unbekannt: (.{0,200})$/, 'Невідомий вид договору: $1', 'Unknown contract type: $1'],
  [/^Art unbekannt: (.{0,200})$/, 'Невідомий вид: $1', 'Unknown type: $1'],
  [/^Fahrer nicht eindeutig: (.{0,200})$/, 'Водій неоднозначний: $1', 'Driver not unique: $1'],
  [/^Fahrer nicht gefunden: (.{0,200})$/, 'Водія не знайдено: $1', 'Driver not found: $1'],
  [/^Fahrerakte ausgeschieden – Auslesung in der Akte erfassen: (.{0,200})$/, 'Картку водія позначено як звільненого – внесіть зчитування в картці водія: $1', 'Driver record marked as left – record the download in the driver record: $1'],
  [/^Frist in der Liste \((\d{4}-\d{2}-\d{2})\) weicht ab – vorhandene Frist (\d{4}-\d{2}-\d{2}) bleibt; in der Fahrzeugakte prüfen$/, 'Строк у списку ($1) відрізняється – наявний строк $2 залишається; перевірте в картці транспорту', 'Deadline in the list ($1) differs – existing deadline $2 is kept; check in the vehicle file'],
  [/^Anhänger ohne Fahrtenschreiber: (.{0,200})$/, 'Причіп без тахографа: $1', 'Trailer without tachograph: $1'],
  [/^Reifengröße zu lang \(max\. 40 Zeichen\): (.{0,200})$/, 'Розмір шини задовгий (макс. 40 символів): $1', 'Tyre size too long (max. 40 characters): $1'],
  [/^FIN doppelt in der Datei mit abweichender Größe \(Zeile (\d+)\): (.{0,60})$/, 'VIN у файлі двічі з іншим розміром (рядок $1): $2', 'VIN twice in the file with a different size (line $1): $2'],
];
export const IMPORT_REASONS_FIXED = IMPORT_FIXED.map(([de]) => de);
export const IMPORT_REASONS_TPL = IMPORT_TPL.map(([re]) => re);
export function translateImportReason(lang, reason) {
  if (typeof reason !== 'string' || lang === 'de' || !VALIDATION_TEXTS[lang]) return reason;
  const k = lang === 'uk' ? 1 : 2;
  const fixed = IMPORT_FIXED.find((x) => x[0] === reason);
  if (fixed) return fixed[k];
  for (const row of IMPORT_TPL) {
    const m = reason.match(row[0]);
    if (m) return row[k].replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '');
  }
  return translateValidation(lang, reason) || reason;
}
// [CLAUDE] Belegte km-Fälligkeit (Migration 0040)
// [CLAUDE] Hilfe „Ausdrucke & Exporte“ (13.10.2026)
// [CLAUDE] Kurzanleitung für Fahrer (Aushang, 14.10.2026): {key} = Text der App in der Sprache des Aushangs (fett), {=key} = ohne Hervorhebung
// [CLAUDE] Disposition: Winterreifen-Hinweis (13.10.2026) – nur Information, keine Sperre
// [CLAUDE] Fahrer „Mein Fahrzeug“: Winterreifen laut Erfassung nicht erfüllt (13.10.2026)
// [CLAUDE] Werkstatt-Startseite: Winterreifen-Arbeitsvorrat (13.10.2026) – nur Information, keine Sperre
// [CLAUDE] Fuhrparkleitung „Heute zu tun“: Winterreifen nicht erfüllt (13.10.2026)
// [CLAUDE] Reifen erfassen: gleiche Angaben für weitere Positionen (13.10.2026)
// [CLAUDE] Werkstattauftrag „Winterreifen“ aus der Fahrzeugakte → Reifen (13.10.2026)
// [CLAUDE] Konfliktmeldungen Werkstattaufträge (Prüftermin/Prüfung/Winterreifen) übersetzt – vorher in UK/EN deutsch (13.10.2026)
// [CLAUDE] Vorgang aus Winterreifen-Auftrag: aktuelle Winterlage im Vorgang (13.10.2026)
// [CLAUDE] Winterreifen-Auftrag: Abschlusskontrolle anfordern, obwohl die Winterlage laut Reifenerfassung noch nicht erfüllt ist (13.10.2026)
// [CLAUDE] Vorgang Winterreifen-Auftrag nach Abschluss: kein „Vor dem Abschluss …“ mehr, sondern Hinweis auf offene Lage (13.10.2026)
// [CLAUDE] Reifen – Flotte: Reiter „Winterauftrag abgeschlossen, Lage offen“ (nur bei Treffern, 13.10.2026)
// [CLAUDE] Hinweis beim Speichern: Kennzeichen schon an einem anderen Fahrzeug (13.10.2026)
// [CLAUDE] Datenqualität: Telematik-Gerät meldet anderes Kennzeichen (13.10.2026)
// [CLAUDE] Telematik-Übersicht: abweichend gemeldete Kennzeichen (13.10.2026)
// [CLAUDE] Telematik-Übersicht: letzter Stand je Fahrzeug (13.10.2026)
// [CLAUDE] Telematik-Übersicht: Empfang je Anbieter (13.10.2026)
// [CLAUDE] 14.10.2026: „Nächster Schritt“ (next_action) der Agentenbefunde im Management-Panel in der Oberflächensprache.
// Server liefert weiterhin den deutschen Text (Integrations-API, Master-Eingang); der Client übersetzt per exaktem Text.
// Wächter-Test: jeder feste next_action-Text in src/*.js steht hier, keine verwaisten Einträge.
const NEXT_ACTIONS = [
  ['Fuhrparkleitung als Benutzer anlegen und Einladung annehmen lassen.', 'Створіть керівника автопарку як користувача і попросіть прийняти запрошення.', 'Create fleet management as a user and have them accept the invitation.'],
  ['Vorgang prüfen; neue Wiedervorlage setzen oder entfernen.', 'Перевірте заявку; встановіть нове нагадування або видаліть його.', 'Review the case; set a new follow-up or remove it.'],
  ['Vorgang an eine Werkstatt weiterleiten oder begründet ablehnen.', 'Передайте заявку в майстерню або обґрунтовано відхиліть.', 'Forward the case to a workshop or reject it with a reason.'],
  ['Versicherungsschutz bzw. Folgevertrag klären; Vertrag beenden oder Folgevertrag mit Nachweis erfassen.', 'З’ясуйте страховий захист або наступний договір; завершіть договір або внесіть наступний із підтвердженням.', 'Clarify insurance cover or the follow-up contract; end the contract or record the follow-up contract with evidence.'],
  ['Stand bei der externen Werkstatt erfragen; Fortschritt oder Termin im Vorgang eintragen.', 'Дізнайтеся стан у зовнішній майстерні; внесіть у заявку прогрес або дату.', 'Ask the external workshop for the status; record progress or the date in the case.'],
  ['Übergabe an die externe Werkstatt im Vorgang mit „Auftrag übernehmen“ bestätigen.', 'Підтвердьте передачу зовнішній майстерні в заявці кнопкою «Прийняти замовлення».', 'Confirm the handover to the external workshop in the case with “Accept order”.'],
  ['Stand bei der Werkstatt erfragen; Fortschritt, Teilebedarf oder Termin im Vorgang eintragen.', 'Дізнайтеся стан у майстерні; внесіть у заявку прогрес, потребу в запчастинах або дату.', 'Ask the workshop for the status; record progress, parts needed or appointment in the case.'],
  ['Meldung bewerten, Fahrzeug nicht disponieren, Werkstatt festlegen.', 'Оцініть повідомлення, не плануйте транспорт, визначте майстерню.', 'Assess the report, do not dispatch the vehicle, choose a workshop.'],
  ['Meldung bewerten und Priorität bestätigen.', 'Оцініть повідомлення і підтвердьте пріоритет.', 'Assess the report and confirm the priority.'],
  ['Meldung bewerten.', 'Оцініть повідомлення.', 'Assess the report.'],
  ['Werkstattbenutzer anlegen oder andere Werkstatt zuweisen.', 'Створіть користувача майстерні або призначте іншу майстерню.', 'Create a workshop user or assign another workshop.'],
  ['Werkstattbenutzer anlegen oder Auftrag als Fuhrparkleitung weiterführen.', 'Створіть користувача майстерні або продовжуйте замовлення як керівник автопарку.', 'Create a workshop user or continue the order as fleet management.'],
  ['Werkstatt geschlossen – andere Werkstatt zuweisen.', 'Майстерню закрито – призначте іншу майстерню.', 'Workshop closed – assign another workshop.'],
  ['Werkstatt geschlossen – Auftrag als Fuhrparkleitung weiterführen.', 'Майстерню закрито – продовжуйте замовлення як керівництво автопарку.', 'Workshop closed – continue the order as fleet management.'],
  ['Werkstatt direkt kontaktieren oder Auftrag umleiten.', 'Зв’яжіться з майстернею напряму або перенаправте замовлення.', 'Contact the workshop directly or redirect the order.'],
  ['Auftrag übernehmen.', 'Прийміть замовлення.', 'Accept the order.'],
  ['Teilelieferung klären, Dispo informieren.', 'З’ясуйте постачання запчастин, повідомте диспетчерську.', 'Clarify the parts delivery, inform dispatch.'],
  ['Kosten prüfen und freigeben oder mit der Werkstatt klären.', 'Перевірте й погодьте витрати або з’ясуйте з майстернею.', 'Check and approve the costs or clarify with the workshop.'],
  ['Kontrolle durchführen: freigeben oder Nacharbeit anfordern.', 'Проведіть перевірку: допустіть або вимагайте доопрацювання.', 'Carry out the check: release or request rework.'],
  ['Restarbeiten erledigen oder Teile beschaffen.', 'Виконайте залишкові роботи або придбайте запчастини.', 'Complete the remaining work or obtain parts.'],
  ['Neuen Liefertermin bei der Werkstatt erfragen, Dispo informieren.', 'Запитати в майстерні новий термін постачання, повідомити диспетчера.', 'Ask the workshop for a new delivery date, inform dispatch.'],
  ['Bis zur technischen Freigabe nicht einplanen.', 'Не планувати до технічного допуску.', 'Do not schedule until technical release.'],
  ['Klären, wer das gesperrte Fahrzeug bewegt hat; Fahrzeug abstellen und bis zur technischen Freigabe nicht einsetzen.', 'З’ясувати, хто рухав заблокований транспорт; поставити його на стоянку й не використовувати до технічного допуску.', 'Find out who moved the locked vehicle; park it and do not use it until technical release.'],
  ['Werkstatttermin für Restarbeiten planen.', 'Заплануйте візит до майстерні для залишкових робіт.', 'Schedule a workshop appointment for the remaining work.'],
  ['Empfänger telefonisch informieren; Push auf deren Geräten aktivieren.', 'Повідомте одержувачів телефоном; увімкніть push на їхніх пристроях.', 'Inform recipients by phone; enable push on their devices.'],
  ['Stundensatz in den Einstellungen festlegen; fehlende Teilepreise lassen sich nach der Freigabe nicht nachtragen – Rechnung am Vorgang hochladen bzw. kommentieren (Hinweis endet 90 Tage nach Abschluss).', 'Встановіть погодинну ставку в налаштуваннях; відсутні ціни запчастин після випуску внести неможливо – завантажте рахунок до заявки або додайте коментар (нагадування зникне через 90 днів після закриття).', 'Set the hourly rate in the settings; missing parts prices cannot be added after release – upload the invoice to the case or add a comment (the notice ends 90 days after closing).'],
  ['Stundensatz ggf. in den Einstellungen festlegen; fehlende Rechnungsbeträge bzw. Teilepreise lassen sich nach der Freigabe nicht nachtragen – Rechnung am Vorgang hochladen bzw. kommentieren (Hinweis endet 90 Tage nach Abschluss).', 'За потреби встановіть погодинну ставку в налаштуваннях; відсутні суми рахунків або ціни запчастин після випуску внести неможливо – завантажте рахунок до заявки або додайте коментар (нагадування зникне через 90 днів після закриття).', 'Set the hourly rate in the settings if needed; missing invoice amounts or parts prices cannot be added after release – upload the invoice to the case or add a comment (the notice ends 90 days after closing).'],
  ['Termin vereinbaren; Einsatzfähigkeit fachlich prüfen.', 'Домовтеся про дату; фахово перевірте придатність до експлуатації.', 'Arrange an appointment; have roadworthiness checked by an expert.'],
  ['Werkstatttermin einplanen.', 'Заплануйте візит до майстерні.', 'Schedule a workshop appointment.'],
  ['Durchführung mit km-Stand des neuen Zählers erfassen oder km-Fälligkeit mit Nachweis neu eintragen.', 'Внесіть виконання з пробігом нового лічильника або заново внесіть строк за пробігом із підтвердженням.', 'Record the service with the new odometer reading or re-enter the mileage due with evidence.'],
  ['Prüftermin vereinbaren; Einsatzfähigkeit fachlich prüfen. Kein automatisches Verschieben.', 'Домовтеся про дату огляду; фахово перевірте придатність до експлуатації. Без автоматичного перенесення.', 'Arrange an inspection date; have roadworthiness checked by an expert. No automatic postponement.'],
  ['Geplanten Termin wahrnehmen; Einsatzfähigkeit fachlich prüfen.', 'Дотримайтеся запланованої дати; фахово перевірте придатність до експлуатації.', 'Keep the planned appointment; have roadworthiness checked by an expert.'],
  ['Geplanten Termin wahrnehmen und Durchführung belegen.', 'Дотримайтеся запланованої дати і підтвердьте виконання.', 'Keep the planned appointment and record evidence of completion.'],
  ['Geplanter Termin liegt nach dem Fristende – früheren Termin vereinbaren.', 'Запланована дата пізніша за кінцевий термін – домовтеся про ранішу.', 'The planned date is after the deadline – arrange an earlier one.'],
  ['Prüfbericht/Fahrzeugschein prüfen und fehlende Angaben in der Fahrzeugakte nachtragen.', 'Перевірте протокол огляду/техпаспорт і доповніть відсутні дані в картці транспорту.', 'Check the inspection report/registration document and add missing details to the vehicle file.'],
  ['Gültiges Dokument beschaffen und in der Fahrzeugakte hinterlegen.', 'Отримайте дійсний документ і збережіть у картці транспорту.', 'Obtain a valid document and store it in the vehicle file.'],
  ['Verlängerung/Nachfolgedokument veranlassen.', 'Організуйте продовження/новий документ.', 'Arrange renewal or a successor document.'],
  ['In der Fahrzeugakte „Auftrag Mängelbeseitigung“ anlegen; Nachprüfung belegen.', 'Створіть у картці транспорту «Замовлення на усунення дефектів»; підтвердьте повторний огляд.', 'Create a “Defect repair order” in the vehicle file; record the re-inspection.'],
  ['Einsatzfähigkeit fachlich prüfen, ggf. sperren; Auftrag Mängelbeseitigung anlegen.', 'Фахово перевірте придатність, за потреби заблокуйте; створіть замовлення на усунення дефектів.', 'Have roadworthiness checked, lock if necessary; create a defect repair order.'],
  ['Nachprüfung/Wiedervorführung durchführen lassen und mit Nachweis in der Fahrzeugakte eintragen (Frist laut Prüfbericht).', 'Проведіть повторний огляд і внесіть його з підтвердженням у картку транспорту (строк згідно з протоколом).', 'Have the re-inspection carried out and record it with evidence in the vehicle file (deadline per inspection report).'],
  ['Ergebnis laut Prüfbericht in der Fahrzeugakte nachtragen (Bisherige Durchführungen → Prüfergebnis nachtragen).', 'Внесіть результат згідно з протоколом у картку транспорту (Попередні виконання → Додати результат огляду).', 'Add the result per inspection report to the vehicle file (Previous completions → Add inspection result).'],
  ['Reifen vor weiterer Fahrt prüfen/tauschen lassen.', 'Перед подальшою поїздкою перевірте/замініть шини.', 'Have the tyres checked/replaced before driving further.'],
  ['Reifenwechsel einplanen.', 'Заплануйте заміну шин.', 'Schedule a tyre change.'],
  ['Reserverad nicht montieren – ersetzen lassen.', 'Не монтуйте запасне колесо – замініть його.', 'Do not fit the spare wheel – have it replaced.'],
  ['Beim Lieferanten nachfragen; bei Eingang Zugang buchen (beendet den Vermerk).', 'Зверніться до постачальника; після надходження оформіть прихід (це закриває позначку).', 'Ask the supplier; book the receipt on arrival (ends the note).'],
  ['Nachbestellung prüfen (Bestellung nur nach Freigabe).', 'Перевірте дозамовлення (замовлення лише після погодження).', 'Check reordering (order only after approval).'],
  ['Beim Versicherer nach dem Stand fragen; Status bzw. Erstattung mit Nachweis im Vorgang eintragen.', 'Дізнайтеся стан у страховика; внесіть статус або відшкодування з підтвердженням у заявку.', 'Ask the insurer for the status; record status or reimbursement with evidence in the case.'],
  ['Rückgabe/Verlängerung klären; Vertrag in der Fahrzeugakte beenden oder mit neuem Nachweis aktualisieren.', 'З’ясуйте повернення/продовження; завершіть договір у картці транспорту або оновіть з новим підтвердженням.', 'Clarify return/extension; end the contract in the vehicle file or update it with new evidence.'],
  ['Rückgabe, Verlängerung oder Ersatzfahrzeug klären.', 'З’ясуйте повернення, продовження або заміну транспорту.', 'Clarify return, extension or replacement vehicle.'],
  ['Versicherungsschutz ab Vertragsende sicherstellen: Verlängerung oder Folgevertrag klären.', 'Забезпечте страховий захист після закінчення договору: з’ясуйте продовження або новий договір.', 'Ensure insurance cover from the end of the contract: clarify extension or a follow-up contract.'],
  ['Wartung ab Vertragsende klären: Verlängerung bzw. Folgevertrag mit Nachweis erfassen oder Vertrag beenden und Prüftermine über die eigene Werkstatt einplanen.', 'З’ясуйте обслуговування після закінчення договору: внесіть продовження або новий договір з підтвердженням чи завершіть договір і плануйте терміни через власну майстерню.', 'Clarify maintenance from the end of the contract: record an extension or follow-up contract with evidence, or end the contract and schedule inspections via your own workshop.'],
  ['Wartung ab Vertragsende klären: Verlängerung, Folgevertrag oder eigene Werkstatt.', 'З’ясуйте обслуговування після закінчення договору: продовження, новий договір або власна майстерня.', 'Clarify maintenance from the end of the contract: extension, follow-up contract or your own workshop.'],
  ['Vertragsende laut Vertrag abwickeln; Vertrag in der Fahrzeugakte beenden oder Verlängerung/Folgevertrag mit Nachweis erfassen.', 'Оформіть закінчення договору згідно з його умовами; завершіть договір у картці транспорту або внесіть продовження/новий договір з підтвердженням.', 'Settle the end of the contract per its terms; end the contract in the vehicle file or record an extension/follow-up contract with evidence.'],
  ['Vertragsende laut Vertrag klären: Verlängerung, Folgevertrag oder Abschluss.', 'З’ясуйте закінчення договору згідно з його умовами: продовження, новий договір або завершення.', 'Clarify the end of the contract per its terms: extension, follow-up contract or completion.'],
  ['Folgevertrag ist erfasst – Vertrag in der App beenden (Mehr → Verträge: „Mehrere Verträge beenden“ oder in der Fahrzeugakte).', 'Наступний договір внесено – завершіть договір у застосунку (Ще → Договори: «Завершити кілька договорів» або в картці транспорту).', 'Follow-up contract recorded – end the contract in the app (More → Contracts: “End several contracts” or in the vehicle record).'],
  ['Folgevertrag ist erfasst – nach dem Vertragsende den Vertrag in der App beenden.', 'Наступний договір внесено – після закінчення договору завершіть його в застосунку.', 'Follow-up contract recorded – end the contract in the app after its end date.'],
  ['Entscheiden: kündigen oder verlängern. Frist und Form laut Vertrag prüfen.', 'Вирішіть: розірвати чи продовжити. Перевірте строк і форму згідно з договором.', 'Decide: terminate or extend. Check deadline and form per contract.'],
  ['Mehrkilometer-Regelung im Vertrag prüfen; ggf. Vertrag anpassen.', 'Перевірте в договорі умови щодо перевищення пробігу; за потреби змініть договір.', 'Check the excess mileage clause in the contract; adjust the contract if needed.'],
  ['Einsatz des Fahrzeugs bzw. Vertragsanpassung prüfen.', 'Перевірте використання транспорту або зміну договору.', 'Review the vehicle’s use or a contract adjustment.'],
  ['km-Stand bei Übernahme bzw. Tausch laut Beleg prüfen und im Vertrag „km bei Übernahme … geprüft“ bestätigen.', 'Перевірте пробіг на момент отримання або заміни за документом і підтвердьте в договорі «Км при отриманні перевірено …».', 'Check the mileage at handover or replacement against the document and confirm “km at handover checked …” in the contract.'],
  ['Nicht einsetzen, bis ein gültiger Nachweis vorliegt; neuen Nachweis erfassen.', 'Не залучати, доки немає дійсного підтвердження; внесіть нове підтвердження.', 'Do not deploy until valid evidence is available; record new evidence.'],
  ['Verlängerung rechtzeitig veranlassen.', 'Своєчасно організуйте продовження.', 'Arrange renewal in good time.'],
  ['Original-Führerschein vorlegen lassen und Kontrolle erfassen.', 'Попросіть пред’явити оригінал посвідчення водія і внесіть перевірку.', 'Have the original driving licence presented and record the check.'],
  ['Termin für die Führerscheinkontrolle vereinbaren.', 'Домовтеся про термін перевірки посвідчення водія.', 'Arrange a date for the licence check.'],
  ['„km bei Übernahme“ im Vertrag laut Beleg bzw. den letzten km-Stand prüfen und korrigieren.', 'Перевірте й виправте «пробіг при прийнятті» в договорі за документом або останній показ пробігу.', 'Check and correct the “mileage at handover” in the contract against the document, or the latest odometer reading.'],
  ['Einsatz klären; Führerschein prüfen.', 'З’ясуйте залучення; перевірте посвідчення водія.', 'Clarify deployment; check the driving licence.'],
  ['Sofort beantworten bzw. Fristverlängerung klären.', 'Негайно дайте відповідь або з’ясуйте продовження строку.', 'Reply immediately or clarify a deadline extension.'],
  ['Fahrer ermitteln und Schreiben beantworten.', 'Встановіть водія і дайте відповідь на лист.', 'Identify the driver and reply to the letter.'],
  ['Schreiben fristgerecht beantworten.', 'Дайте відповідь на лист у встановлений строк.', 'Answer the letter within the deadline.'],
  ['Bußgeld öffnen, unter „Angaben ändern“ speichern – das Fahrzeug wird übernommen.', 'Відкрийте штраф і збережіть у «Змінити дані» – транспорт буде прив’язано.', 'Open the fine and save under “Change details” – the vehicle will be assigned.'],
  ['Anhänger im Fahrzeugstamm anlegen, danach im Bußgeld unter „Angaben ändern“ speichern.', 'Створіть причіп у реєстрі транспорту, потім збережіть у штрафі в «Змінити дані».', 'Create the trailer in the vehicle master data, then save the fine under “Change details”.'],
  ['Kennzeichen prüfen (Fremd-/Mietfahrzeug?).', 'Перевірте номерний знак (чужий/орендований транспорт?).', 'Check the registration (third-party/rental vehicle?).'],
  ['Fahrzeugstamm prüfen: Kennzeichen steht an mehreren aktiven Fahrzeugen (Datenqualität).', 'Перевірте дані транспорту: номер є в кількох активних транспортних засобів (якість даних).', 'Check the vehicle master data: the plate is on several active vehicles (data quality).'],
  ['Mit dem Fahrer klären, wann der Führerschein abgegeben wird; in diesem Zeitraum nicht als Fahrer einsetzen.', 'З’ясуйте з водієм, коли він здасть посвідчення водія; у цей період не залучайте його як водія.', 'Clarify with the driver when the licence will be surrendered; do not use them as a driver during that period.'],
  ['Einwand des Fahrers prüfen (Urlaub, Vertretung, Tourenplan) und Fahrer bestätigen oder neu ermitteln.', 'Перевірте заперечення водія (відпустка, заміна, план рейсів) і підтвердьте водія або визначте заново.', 'Check the driver’s objection (holiday, cover, trip plan) and confirm the driver or identify again.'],
  ['Fahrer anhand Zuordnung/Tourenplan/Telematik bestätigen.', 'Підтвердьте водія за закріпленням/планом рейсів/телематикою.', 'Confirm the driver using assignment/tour plan/telematics.'],
  ['Antwortfrist aus dem Schreiben unter „Angaben ändern“ nachtragen.', 'Додайте строк відповіді з листа в розділі «Змінити дані».', 'Add the response deadline from the letter under “Change details”.'],
  ['Fahrerkarte auslesen und Auslesung erfassen.', 'Зчитайте картку водія і внесіть зчитування.', 'Download the driver card and record the download.'],
  ['Auslesung einplanen.', 'Заплануйте зчитування.', 'Schedule the download.'],
  ['Fahrtenschreiber auslesen und Auslesung erfassen.', 'Зчитайте тахограф і внесіть зчитування.', 'Download the tachograph and record the download.'],
];
const NEXT_ACTION_TEXTS = { uk: {}, en: {} };
for (const [de, uk, en] of NEXT_ACTIONS) { NEXT_ACTION_TEXTS.uk[de] = uk; NEXT_ACTION_TEXTS.en[de] = en; }
export const NEXT_ACTION_FIXED = NEXT_ACTIONS.map(([de]) => de);
// Unbekannte Texte (z. B. ältere Einträge im Master-Eingang) bleiben unverändert deutsch.
export function translateNextAction(lang, s) {
  const T = NEXT_ACTION_TEXTS[lang];
  return T && typeof s === 'string' && Object.hasOwn(T, s) ? T[s] : s;
}
// Management-Panel: Agentenbefunde als CSV (Spaltenköpfe)
// Fahrzeugakte: offene Agentenbefunde des Fahrzeugs (nur Inhaber/Fuhrparkleitung)
// Befund-Kurzbezeichnungen (fc_<CODE>) aus der gemeinsamen Datei finding-labels.js (auch vom Server für Push-Texte genutzt)

// [CLAUDE] Automatischer Sperrgrund bei Meldungen (Server speichert Deutsch, z. B. „Fahrer meldet: nicht fahrbereit (ungeprüft)“) –
// in der Oberfläche in der Sprache der Person. Von Hand eingegebene Sperrgründe bleiben unverändert.
const LOCK_REASON = {
  uk: { driver: 'Водій повідомляє', report: 'Повідомлення ({r})', nicht_fahrbereit: 'не може їхати (не перевірено)', sicherheitskritisch: 'загроза безпеці (не перевірено)', order: 'Замовлення ({r})', nicht_fahrbereit_o: 'не може їхати', sicherheitskritisch_o: 'загроза безпеці' },
  en: { driver: 'Driver reports', report: 'Report ({r})', nicht_fahrbereit: 'not drivable (unverified)', sicherheitskritisch: 'safety-critical (unverified)', order: 'Order ({r})', nicht_fahrbereit_o: 'not drivable', sicherheitskritisch_o: 'safety-critical' },
};
const LOCK_ROLE = { Inhaber: 'role_owner', Fuhrparkleitung: 'role_fleet', Werkstatt: 'role_workshop', Disposition: 'role_dispatch' };
export function translateLockReason(lang, msg) {
  const T = LOCK_REASON[lang]; if (!T || typeof msg !== 'string') return msg;
  // „Auftrag <Rolle>: …“ ohne „(ungeprüft)“ = Auftrag der Leitung aus Prüftermin/Prüfmangel (20.10.2026: blieb in UK/EN deutsch)
  const m = msg.match(/^(Fahrer meldet|(Meldung|Auftrag)(?: (Inhaber|Fuhrparkleitung|Werkstatt|Disposition))?): (nicht fahrbereit|sicherheitskritisch)( \(ungeprüft\))?$/);
  if (!m || (m[2] === 'Auftrag') === !!m[5]) return msg;
  const who = m[1] === 'Fahrer meldet' ? T.driver : T[m[2] === 'Auftrag' ? 'order' : 'report'].replace('{r}', m[3] ? STRINGS[lang][LOCK_ROLE[m[3]]] : '').replace(' ()', '');
  const k = m[4] === 'nicht fahrbereit' ? 'nicht_fahrbereit' : 'sicherheitskritisch';
  return `${who}: ${m[5] ? T[k] : T[k + '_o']}`;
}
// [CLAUDE] 14.10.2026: Bekannte Geräte (Anmelde-Hinweis) – eigene Liste in „Mein Konto“, Anzahl in der Benutzerliste

// Protokoll (Mehr → Protokoll): Bezeichnung je Aktionscode in der Oberflächensprache. Der Code bleibt sichtbar (Suche, CSV, Bereichsfilter);
// unbekannte (künftige) Codes erscheinen unverändert. Wächter-Test: jeder Code aus src/ und jeder in der Testsuite protokollierte hat einen Eintrag.
const AUDIT_ACTIONS = {
  'login': ['Anmeldung', 'Вхід', 'Sign-in'],
  'login.locked': ['Konto gesperrt (Fehlversuche)', 'Акаунт заблоковано (невдалі спроби)', 'Account locked (failed attempts)'],
  'login.ip_limited': ['Netzadresse gesperrt (Fehlversuche)', 'Мережеву адресу заблоковано (невдалі спроби)', 'Network address blocked (failed attempts)'],
  'login.new_device': ['Anmeldung auf neuem Gerät', 'Вхід на новому пристрої', 'Sign-in on a new device'],
  'invite.accept': ['Einladung angenommen', 'Запрошення прийнято', 'Invitation accepted'],
  'setup.owner': ['Ersteinrichtung (Inhaber)', 'Початкове налаштування (власник)', 'Initial setup (owner)'],
  'password.change': ['Passwort geändert', 'Пароль змінено', 'Password changed'],
  'password.set_by_invite': ['Passwort per Einladungslink gesetzt (Code noch nicht eingegeben)', 'Пароль встановлено за посиланням-запрошенням (код ще не введено)', 'Password set via invitation link (code not yet entered)'],
  'session.revoke': ['Sitzung beendet', 'Сеанс завершено', 'Session ended'],
  'session.revoke_others': ['Andere Sitzungen beendet', 'Інші сеанси завершено', 'Other sessions ended'],
  'session.replaced': ['Sitzung beendet (andere Person am selben Gerät angemeldet)', 'Сеанс завершено (на тому ж пристрої увійшла інша особа)', 'Session ended (another person signed in on the same device)'],
  'totp.setup_started': ['Zwei-Faktor-Anmeldung: Einrichtung begonnen', 'Двофакторний вхід: налаштування розпочато', 'Two-factor sign-in: setup started'],
  'totp.enable': ['Zwei-Faktor-Anmeldung eingeschaltet', 'Двофакторний вхід увімкнено', 'Two-factor sign-in enabled'],
  'totp.disable': ['Zwei-Faktor-Anmeldung ausgeschaltet', 'Двофакторний вхід вимкнено', 'Two-factor sign-in disabled'],
  'totp.reset': ['Zwei-Faktor-Anmeldung zurückgesetzt', 'Двофакторний вхід скинуто', 'Two-factor sign-in reset'],
  'totp.recovery_renewed': ['Ersatzcodes erneuert', 'Резервні коди оновлено', 'Recovery codes renewed'],
  'user.create': ['Benutzer angelegt', 'Користувача створено', 'User created'],
  'user.update': ['Benutzer geändert (Rolle/Umgebung/aktiv)', 'Користувача змінено (роль/середовище/активний)', 'User changed (role/environment/active)'],
  'user.invite_reset': ['Neuer Einladungslink', 'Нове посилання-запрошення', 'New invitation link'],
  'user.unlock': ['Sperre aufgehoben', 'Блокування знято', 'Lock lifted'],
  'user.revoke_sessions': ['Alle Sitzungen beendet', 'Усі сеанси завершено', 'All sessions ended'],
  'user.forget_device': ['Bekanntes Gerät vergessen', 'Відомий пристрій забуто', 'Known device forgotten'],
  'user.push_quiet': ['Push-Ruhezeit geändert', 'Тихий час push змінено', 'Push quiet hours changed'],
  'settings.update': ['Einstellungen geändert', 'Налаштування змінено', 'Settings changed'],
  'settings.hourly_rate_period': ['Bisherigen Stundensatz behalten', 'Попередню погодинну ставку збережено', 'Previous hourly rate kept'],
  'settings.hourly_rate_period_removed': ['Früheren Stundensatz entfernt', 'Попередню погодинну ставку видалено', 'Previous hourly rate removed'],
  'master.decision': ['Entscheidung im Master-Eingang', 'Рішення у головній вхідній', 'Decision in master inbox'],
  'admin.audit_export': ['Protokoll exportiert', 'Журнал експортовано', 'Audit log exported'],
  'backup.export': ['Datensicherung heruntergeladen', 'Резервну копію завантажено', 'Backup downloaded'],
  'privacy.export': ['Datenauskunft erstellt', 'Довідку про дані створено', 'Data access report created'],
  'integration.token_limited': ['Integrations-API: Adresse gesperrt (ungültige Token)', 'API інтеграції: адресу заблоковано (недійсні токени)', 'Integration API: address blocked (invalid tokens)'],
  'vehicle.upsert': ['Fahrzeug gespeichert', 'Транспорт збережено', 'Vehicle saved'],
  'vehicles.import': ['Fahrzeuge importiert', 'Транспорт імпортовано', 'Vehicles imported'],
  'vehicle.activate': ['Fahrzeug wieder in Betrieb', 'Транспорт знову в експлуатації', 'Vehicle back in service'],
  'vehicle.deactivate': ['Fahrzeug außer Betrieb genommen', 'Транспорт виведено з експлуатації', 'Vehicle taken out of service'],
  'vehicle.eval_exclude': ['Fahrzeug aus Bewertungen ausgenommen', 'Транспорт виключено з оцінок', 'Vehicle excluded from evaluations'],
  'vehicle.eval_include': ['Fahrzeug wieder bewertet', 'Транспорт знову оцінюється', 'Vehicle included in evaluations again'],
  'vehicle.spec': ['Fahrzeugdaten geändert', 'Дані транспорту змінено', 'Vehicle data changed'],
  'vehicle.document': ['Fahrzeugdokument', 'Документ транспорту', 'Vehicle document'],
  'vehicle.document_update': ['Fahrzeugdokument korrigiert', 'Документ транспорту виправлено', 'Vehicle document corrected'],
  'vehicle.assign_driver': ['Fahrer zugeordnet', 'Водія призначено', 'Driver assigned'],
  'vehicle.end_assignment': ['Fahrerzuordnung beendet', 'Призначення водія завершено', 'Driver assignment ended'],
  'vehicle.note_add': ['Fahrzeughinweis hinzugefügt', 'Примітку до транспорту додано', 'Vehicle note added'],
  'vehicle.note_archive': ['Fahrzeughinweis archiviert', 'Примітку до транспорту архівовано', 'Vehicle note archived'],
  'maintenance.plan': ['Prüftermin geplant', 'Огляд заплановано', 'Inspection scheduled'],
  'maintenance.rule_add': ['Prüftermin angelegt', 'Огляд створено', 'Inspection entry created'],
  'maintenance.rule_edit': ['Prüftermin bearbeitet', 'Огляд змінено', 'Inspection entry edited'],
  'maintenance.rule_end': ['Prüftermin beendet', 'Огляд припинено', 'Inspection entry ended'],
  'maintenance.rule_delete': ['Prüftermin entfernt', 'Огляд видалено', 'Inspection entry removed'],
  'maintenance.done': ['Prüfung/Wartung erledigt', 'Огляд/обслуговування виконано', 'Inspection/maintenance done'],
  'maintenance.result_add': ['Prüfergebnis nachgetragen', 'Результат огляду додано', 'Inspection result added'],
  'maintenance.import': ['Prüftermine importiert', 'Огляди імпортовано', 'Inspections imported'],
  'maintenance.recall_import': ['Rückrufe importiert', 'Відкликання імпортовано', 'Recalls imported'],
  'stock.import': ['Lagerartikel importiert', 'Складські позиції імпортовано', 'Stock items imported'],
  'maintenance.export': ['Prüftermine exportiert (CSV)', 'Огляди експортовано (CSV)', 'Inspections exported (CSV)'],
  'maintenance.export_ics': ['Prüftermine exportiert (Kalender)', 'Огляди експортовано (календар)', 'Inspections exported (calendar)'],
  'maintenance.history_export': ['Prüfhistorie exportiert', 'Історію оглядів експортовано', 'Inspection history exported'],
  'maintenance.husp_rule': ['HU/SP-Eintrag angelegt', 'Запис HU/SP створено', 'HU/SP entry created'],
  'maintenance.husp_rule_undo': ['HU/SP-Eintrag zurückgenommen (Aktion abgewiesen)', 'Запис HU/SP скасовано (дію відхилено)', 'HU/SP entry withdrawn (action rejected)'],
  'maintenance.husp_recalc': ['HU/SP-Frist neu berechnet', 'Строк HU/SP перераховано', 'HU/SP deadline recalculated'],
  'maintenance.husp_migration': ['HU/SP-Regeln umgestellt', 'Правила HU/SP змінено', 'HU/SP rules changed'],
  'tires.import': ['Reifen importiert', 'Шини імпортовано', 'Tyres imported'],
  'tires.spec': ['Reifengröße geändert', 'Розмір шин змінено', 'Tyre size changed'],
  'contract.create': ['Vertrag angelegt', 'Договір створено', 'Contract created'],
  'contract.update': ['Vertrag geändert', 'Договір змінено', 'Contract changed'],
  'contract.end': ['Vertrag beendet', 'Договір завершено', 'Contract ended'],
  'vehicle.odometer_note': ['Begründung zum km-Stand nachgetragen', 'Додано обґрунтування до показу пробігу', 'Reason added to odometer reading'],
  'contract.import': ['Verträge importiert', 'Договори імпортовано', 'Contracts imported'],
  'contract.export': ['Verträge exportiert', 'Договори експортовано', 'Contracts exported'],
  'claim.create': ['Versicherungsfall angelegt', 'Страховий випадок створено', 'Insurance claim created'],
  'claim.update': ['Versicherungsfall geändert', 'Страховий випадок змінено', 'Insurance claim changed'],
  'claim.export': ['Versicherungsfälle exportiert', 'Страхові випадки експортовано', 'Insurance claims exported'],
  'driver.create': ['Fahrerakte angelegt', 'Картку водія створено', 'Driver file created'],
  'driver.update': ['Fahrerakte geändert', 'Картку водія змінено', 'Driver file changed'],
  'driver.document': ['Fahrernachweis erfasst', 'Документ водія внесено', 'Driver record entered'],
  'driver.document_cancel': ['Fahrernachweis storniert', 'Документ водія анульовано', 'Driver record cancelled'],
  'driver.license_check_cancel': ['Führerscheinkontrolle storniert', 'Перевірку посвідчення анульовано', 'Licence check cancelled'],
  'driver.license_check': ['Führerscheinkontrolle erfasst', 'Перевірку посвідчення внесено', 'Licence check entered'],
  'tacho.download': ['Auslesung erfasst', 'Зчитування внесено', 'Download recorded'],
  'tacho.cancel': ['Auslesung storniert', 'Зчитування анульовано', 'Download cancelled'],
  'tacho.import': ['Auslesungen importiert', 'Зчитування імпортовано', 'Downloads imported'],
  'telematics.map': ['Telematik-Gerät zugeordnet', 'Телематичний пристрій призначено', 'Telematics device mapped'],
  'telematics.unmap': ['Telematik-Zuordnung gelöst', 'Призначення телематики скасовано', 'Telematics mapping removed'],
  'stock.inventory': ['Lager-Inventur', 'Інвентаризація складу', 'Stock count'],
  'stock.transfer': ['Lager-Umbuchung', 'Переміщення на складі', 'Stock transfer'],
  'stock.order_mark': ['Als bestellt markiert', 'Позначено як замовлене', 'Marked as ordered'],
  'stock.order_clear': ['Bestellvermerk entfernt', 'Позначку замовлення знято', 'Order mark removed'],
  'stock.price': ['Artikelpreis durch Zugang geändert', 'Ціну артикула змінено надходженням', 'Item price changed by receipt'],
  'maintenance.import_update': ['Prüftermin per Import geändert', 'Огляд змінено імпортом', 'Inspection changed by import'],
  'stock.update': ['Artikel-Stammdaten geändert', 'Дані артикула змінено', 'Item details changed'],
  'stock.receipt': ['Wareneingang gebucht', 'Надходження проведено', 'Goods receipt posted'],
  'stock.journal.export': ['Lagerjournal exportiert', 'Журнал складу експортовано', 'Stock journal exported'],
  'reports.parts_usage_export': ['Teile-Verwendung (Rückruf) exportiert', 'Використання запчастин (відкликання) експортовано', 'Parts usage (recall) exported'],
  'emergency.add': ['Notfallnummer hinzugefügt', 'Екстрений номер додано', 'Emergency number added'],
  'emergency.update': ['Notfallnummer geändert', 'Екстрений номер змінено', 'Emergency number changed'],
  'emergency.archive': ['Notfallnummer archiviert', 'Екстрений номер архівовано', 'Emergency number archived'],
  'reports.cases.export': ['Vorgänge exportiert', 'Заявки експортовано', 'Cases exported'],
  'reports.costs.export': ['Kostenbericht exportiert', 'Звіт про витрати експортовано', 'Cost report exported'],
  'reports.costs.items_export': ['Kosten-Einzelpositionen exportiert', 'Окремі позиції витрат експортовано', 'Cost line items exported'],
  'reports.drivers.export': ['Fahrerliste exportiert', 'Список водіїв експортовано', 'Driver list exported'],
  'reports.fines.export': ['Bußgelder exportiert', 'Штрафи експортовано', 'Fines exported'],
  'reports.kpi.export': ['Kennzahlen exportiert', 'Показники експортовано', 'KPIs exported'],
  'reports.tacho.export': ['Auslesungen exportiert', 'Зчитування експортовано', 'Downloads exported'],
  'reports.tacho.history_export': ['Auslesungsverlauf exportiert', 'Історію зчитувань експортовано', 'Download history exported'],
  'reports.drivers.records_export': ['Fahrernachweise (Zeitraum) exportiert', 'Документи водіїв (період) експортовано', 'Driver records (period) exported'],
  'reports.workshop_load.export': ['Werkstattauslastung exportiert', 'Завантаження майстерні експортовано', 'Workshop load exported'],
};
export const AUDIT_ACTION_CODES = Object.keys(AUDIT_ACTIONS);
export function auditActionLabel(lang, code) {
  const e = AUDIT_ACTIONS[code];
  return e ? e[{ de: 0, uk: 1, en: 2 }[lang] ?? 0] : null;
}

// Protokoll-Details: häufige Schlüssel in der Oberflächensprache. Werte bleiben unverändert (Daten, Kennzeichen, Daten-IDs) –
// übersetzt werden nur Ja/Nein, Umgebung (test/production) und Rolle; {from,to} wird „alt → neu“, Listen mit Komma.
// Unbekannte Schlüssel erscheinen roh (künftige Details, Einstellungsschlüssel). CSV und Suche nutzen weiter den Rohtext.
const AUDIT_DETAIL_KEYS = {
  hours_days: ['Erreichbar an Wochentagen', 'Дні доступності', 'Reachable on weekdays'], hours_from: ['Erreichbar von', 'Доступний з', 'Reachable from'], hours_to: ['Erreichbar bis', 'Доступний до', 'Reachable until'], hours_no_holidays: ['Nicht an Feiertagen', 'Не у святкові дні', 'Not on public holidays'], hours_more: ['Weitere Zeitspannen', 'Додаткові проміжки', 'Further time spans'], hours_holiday_state: ['Feiertage des Bundeslands', 'Свята федеральної землі', 'Public holidays of the state'],
  recreated: ['durch erneutes Anlegen', 'через повторне створення', 'by creating again'],
  plate_old: ['bisheriges Kennzeichen', 'попередній номерний знак', 'previous plate'], manufacturer: ['Hersteller', 'Виробник', 'Manufacturer'], model: ['Modell', 'Модель', 'Model'],
  build_year: ['Baujahr', 'Рік випуску', 'Year of manufacture'], trailer_plate: ['Anhänger-Kennzeichen', 'Номер причепа', 'Trailer plate'], trailer_vin: ['Anhänger-FIN', 'ідентифікаційний номер причепа', 'Trailer VIN'],
  // 22.10.2026: alt → neu bei Prüftermin-Import und Fahrerakte
  next_due_date: ['fällig am', 'строк до', 'due on'], last_done_date: ['zuletzt durchgeführt', 'востаннє проведено', 'last done'], interval_months: ['Intervall (Monate)', 'Інтервал (місяці)', 'Interval (months)'],
  interval_km: ['Intervall km', 'Інтервал км', 'Interval km'], last_done_km: ['km bei letzter Durchführung', 'км під час останнього проведення', 'km at last service'], due_km: ['fällig bei km', 'строк за км', 'due at km'],
  personnel_no: ['Personalnummer', 'Табельний номер', 'Personnel no.'], account: ['App-Konto', 'Обліковий запис у застосунку', 'App account'],
  master_status: ['Stammstatus', 'Статус у реєстрі', 'Master status'],
  // 21.10.2026: Reifengröße (tires.spec) und Nachweis als Verlauf (driver.document) zeigten Feldnamen roh
  axle: ['Achse', 'Вісь', 'Axle'], verified: ['am Fahrzeug geprüft', 'перевірено на транспортному засобі', 'checked on the vehicle'],
  history_only: ['nur als Verlauf gespeichert', 'збережено лише як історію', 'saved as history only'],
  km_basis_confirmed: ['km-Grundlage geprüft', 'Базу км перевірено', 'Mileage basis checked'],
  ordered_on: ['bestellt am', 'замовлено', 'ordered on'], order_cleared: ['Bestellvermerk beendet', 'Позначку замовлення знято', 'Order note ended'],
  environment: ['Umgebung', 'Середовище', 'Environment'], kind: ['Art', 'Вид', 'Kind'], site: ['Standort', 'Локація', 'Site'],
  rows: ['Zeilen', 'Рядки', 'Rows'], plate: ['Kennzeichen', 'Номерний знак', 'Plate'], note: ['Vermerk', 'Примітка', 'Note'],
  from: ['von', 'з', 'from'], to: ['bis', 'до', 'to'], vehicle_id: ['Fahrzeug', 'Транспортний засіб', 'Vehicle'],
  vehicle: ['Fahrzeug', 'Транспортний засіб', 'Vehicle'], phone: ['Rufnummer', 'Номер телефону', 'Phone'],
  label: ['Bezeichnung', 'Назва', 'Label'], result: ['Ergebnis', 'Результат', 'Result'], done_date: ['durchgeführt am', 'виконано', 'done on'],
  evidence: ['Nachweis', 'Підтвердження', 'Evidence'], status: ['Status', 'Статус', 'Status'], device: ['Gerät', 'Пристрій', 'Device'],
  q: ['Suche', 'Пошук', 'Search'], device_id: ['Gerätekennung', 'Ідентифікатор пристрою', 'Device ID'],
  vsite: ['Fahrzeugstandort', 'Локація ТЗ', 'Vehicle site'], vehicle_site: ['Fahrzeugstandort', 'Локація ТЗ', 'Vehicle site'],
  username: ['Benutzername', 'Ім’я користувача', 'Username'], role: ['Rolle', 'Роль', 'Role'], reason: ['Grund', 'Причина', 'Reason'],
  skipped: ['übersprungen', 'пропущено', 'skipped'], created: ['angelegt', 'створено', 'created'], valid_until: ['gültig bis', 'дійсне до', 'valid until'],
  partner: ['Vertragspartner', 'Контрагент', 'Partner'], gaps: ['Lücken', 'Прогалини', 'Gaps'], planned_date: ['geplant am', 'заплановано на', 'planned for'],
  filter: ['Auswahl', 'Фільтр', 'Filter'], updated: ['aktualisiert', 'оновлено', 'updated'], unchanged: ['unverändert', 'без змін', 'unchanged'],
  changed: ['geändert', 'змінено', 'changed'], qty: ['Menge', 'Кількість', 'Quantity'], case_no: ['Vorgang', 'Заявка', 'Case'],
  driver: ['Fahrer', 'Водій', 'Driver'], weeks: ['Wochen', 'Тижні', 'Weeks'], filename: ['Datei', 'Файл', 'File'], file: ['Datei', 'Файл', 'File'],
  size: ['Größe (Byte)', 'Розмір (байт)', 'Size (bytes)'], name: ['Name', 'Ім’я', 'Name'], imported: ['importiert', 'імпортовано', 'imported'],
  minutes: ['Minuten', 'Хвилини', 'Minutes'], for_driver: ['für Fahrer', 'для водіїв', 'for drivers'], truncated: ['gekürzt', 'скорочено', 'truncated'],
  count: ['Anzahl', 'Кількість', 'Count'], sections: ['Abschnitte', 'Розділи', 'Sections'], factor: ['Verfahren', 'Метод', 'Method'],
  by: ['Verfahren', 'Метод', 'Method'], recovery_left: ['verbleibende Ersatzcodes', 'залишилось резервних кодів', 'recovery codes left'],
  failures: ['Fehlversuche', 'Невдалі спроби', 'Failed attempts'], ended_on: ['beendet am', 'завершено', 'ended on'],
  insurer: ['Versicherer', 'Страховик', 'Insurer'], source: ['Quelle', 'Джерело', 'Source'], active: ['aktiv', 'активний', 'active'],
  user: ['Person', 'Особа', 'Person'], counted: ['gezählt', 'пораховано', 'counted'], differences: ['Abweichungen', 'Відхилення', 'Differences'], eta: ['erwartet am', 'очікується', 'expected on'],
  with_driver: ['mit Fahrer', 'з водієм', 'with driver'], ended_previous: ['beendete Zuordnungen', 'завершені призначення', 'ended assignments'], vehicle_change: ['durch Fahrzeugwechsel', 'через зміну транспортного засобу', 'by vehicle change'], account_deactivated: ['durch Deaktivierung des Kontos', 'через деактивацію облікового запису', 'by account deactivation'], account_changed: ['durch Rollen-/Umgebungswechsel des Kontos', 'через зміну ролі або середовища облікового запису', 'by account role/environment change'],
  action: ['Bereich', 'Розділ', 'Area'], counts: ['Anzahlen', 'Кількості', 'Counts'], item: ['Artikel', 'Артикул', 'Item'],
  part_number: ['Teilenummer', 'Номер деталі', 'Part number'], min_qty: ['Mindestbestand', 'Мінімальний залишок', 'Minimum stock'],
  location: ['Lagerort', 'Місце зберігання', 'Location'], unit_price_net: ['Preis netto (€)', 'Ціна нетто (євро)', 'Net price (€)'],
  part: ['Teil', 'Частина', 'Part'], type: ['Typ', 'Тип', 'Type'], neu: ['neu', 'нові', 'new'], geaendert: ['geändert', 'змінено', 'changed'],
  unveraendert: ['unverändert', 'без змін', 'unchanged'], vorhanden: ['vorhanden', 'вже є', 'existing'], uebersprungen: ['übersprungen', 'пропущено', 'skipped'],
  plate_conflict: ['Kennzeichen-Konflikt', 'Конфлікт номерного знака', 'plate conflict'],
  year_unrecognized: ['Baujahr nicht erkannt', 'Рік випуску не розпізнано', 'year not recognised'],
  zgm_class: ['zGM-Klasse', 'Клас повної маси', 'GVW class'], doc_kind: ['Dokumentart', 'Тип документа', 'Document type'], vehicle_kind: ['Fahrzeugart', 'Вид транспорту', 'Vehicle type'], zgm_kg: ['zGM (kg)', 'Повна маса (кг)', 'GVW (kg)'],
  first_registration: ['Erstzulassung', 'Перша реєстрація', 'First registration'], duplicate_plate_of: ['Kennzeichen auch bei', 'Номерний знак також у', 'Plate also on'],
  display_name: ['Anzeigename', 'Відображуване ім’я', 'Display name'], workshop_site: ['Werkstatt', 'Майстерня', 'Workshop'],
  assignment: ['Zuordnung', 'Призначення', 'Assignment'], end_date: ['Enddatum', 'Дата завершення', 'End date'], downloaded_on: ['ausgelesen am', 'зчитано', 'downloaded on'], checked_on: ['geprüft am', 'перевірено', 'checked on'],
  // ergänzt 16.10.2026 (Rauchtest-Prüfung auf sichtbare Codes): seltene Schlüssel und geänderte Felder
  grund: ['Grund', 'Причина', 'Reason'], provider: ['Anbieter', 'Постачальник', 'Provider'], external_id: ['Gerätekennung beim Anbieter', 'Ідентифікатор у постачальника', 'Provider device ID'],
  target: ['Ziel', 'Ціль', 'Target'], sessions: ['beendete Anmeldungen', 'завершені сеанси', 'ended sign-ins'], push_devices: ['abgemeldete Push-Geräte', 'вимкнені пристрої сповіщень', 'removed push devices'],
  driver_only: ['nur Fahrerakte', 'лише картка водія', 'driver file only'], contract_no: ['Vertragsnummer', 'Номер договору', 'Contract no.'],
  file_id: ['Datei', 'Файл', 'File'], reimbursed_net: ['Erstattung netto (€)', 'Відшкодування нетто (євро)', 'Reimbursement net (€)'], reimbursed_on: ['erstattet am', 'відшкодовано', 'reimbursed on'],
  // 23.10.2026: Filter des Vorgangs-CSV-Exports, gleichnamige Fahrerakten beim Anlegen
  warranty: ['Filter Gewährleistung', 'Фільтр гарантії', 'Warranty filter'], followup: ['Filter Wiedervorlage', 'Фільтр нагадувань', 'Follow-up filter'],
  stale: ['Filter ohne Bewegung', 'Фільтр без руху', 'No-progress filter'], repeat_days: ['Filter erneut gemeldet (Tage)', 'Фільтр повторних (днів)', 'Repeat filter (days)'],
  sort: ['Sortierung', 'Сортування', 'Sort order'], duplicate_names: ['gleichnamige aktive Fahrer', 'активні водії з тим самим ім’ям', 'active drivers with the same name'],
};
export const AUDIT_DETAIL_KEY_CODES = Object.keys(AUDIT_DETAIL_KEYS);
// Datensicherung („backup.export“, Detail „counts“): Tabellen als Bezeichnung statt Tabellenname (16.10.2026). Test: jede Tabelle aus
// src/backup.js (BACKUP_TABLES + users/settings) hat hier eine Bezeichnung. Nur für Schlüssel ohne eigene Bezeichnung oben.
const BACKUP_TABLE_KEYS = {
  workshops: ['Werkstätten', 'Майстерні', 'Workshops'], vehicles: ['Fahrzeuge', 'Транспортні засоби', 'Vehicles'],
  vehicle_plates: ['Frühere Kennzeichen', 'Попередні номери', 'Former plates'], hourly_rate_periods: ['Frühere Stundensätze', 'Попередні погодинні ставки', 'Previous hourly rates'], driver_vehicles: ['Fahrerzuordnungen', 'Призначення водіїв', 'Driver assignments'], case_counters: ['Vorgangszähler', 'Лічильники заявок', 'Case counters'],
  cases: ['Vorgänge', 'Заявки', 'Cases'], case_events: ['Vorgangsverlauf', 'Історія заявок', 'Case history'], work_entries: ['Arbeitszeiten', 'Робочий час', 'Labour entries'],
  parts: ['Teile', 'Запчастини', 'Parts'], open_items: ['Restarbeiten', 'Залишкові роботи', 'Remaining work'], external_costs: ['Fremdleistungen', 'Сторонні послуги', 'External services'],
  files: ['Dateien (nur Angaben)', 'Файли (лише дані)', 'Files (metadata only)'], inspections: ['Kontrollen', 'Перевірки', 'Inspections'],
  maintenance_rules: ['Prüftermine', 'Терміни перевірок', 'Inspection schedules'], maintenance_events: ['Prüf-/Wartungsverlauf', 'Історія перевірок/ТО', 'Inspection/maintenance history'],
  odometer_readings: ['Kilometerstände', 'Показники одометра', 'Odometer readings'], tire_specs: ['Reifengrößen', 'Розміри шин', 'Tyre sizes'], tire_events: ['Reifenverlauf', 'Історія шин', 'Tyre history'],
  stock_items: ['Lagerartikel', 'Артикули складу', 'Stock items'], stock_movements: ['Lagerbuchungen', 'Складські операції', 'Stock movements'],
  fines: ['Bußgelder', 'Штрафи', 'Fines'], fine_events: ['Bußgeldverlauf', 'Історія штрафів', 'Fine history'], fine_counters: ['Bußgeldzähler', 'Лічильники штрафів', 'Fine counters'],
  agent_findings: ['Agentenbefunde', 'Висновки агента', 'Agent findings'], master_inbox: ['Master-Eingang', 'Головні вхідні', 'Master inbox'], notifications: ['Hinweise', 'Сповіщення', 'Notifications'],
  telematics_latest: ['Telematik-Stand', 'Стан телематики', 'Telematics status'], telematics_mappings: ['Telematik-Zuordnungen', 'Призначення телематики', 'Telematics mappings'],
  telematics_unmatched: ['Telematik ohne Zuordnung', 'Телематика без призначення', 'Unmatched telematics'], drivers: ['Fahrerakten', 'Картки водіїв', 'Driver files'],
  driver_documents: ['Fahrerdokumente', 'Документи водіїв', 'Driver documents'], driver_license_checks: ['Führerscheinkontrollen', 'Перевірки посвідчень', 'Licence checks'],
  tacho_downloads: ['Auslesungen', 'Зчитування', 'Downloads'], vehicle_contracts: ['Fahrzeugverträge', 'Договори ТЗ', 'Vehicle contracts'],
  insurance_claims: ['Versicherungsfälle', 'Страхові випадки', 'Insurance claims'], vehicle_notes: ['Hinweise zum Fahrzeug', 'Примітки до ТЗ', 'Vehicle notes'],
  emergency_contacts: ['Panne-Rufnummern', 'Аварійні номери', 'Breakdown numbers'], audit_log: ['Protokoll', 'Журнал', 'Audit log'], _migrations: ['Schema-Versionen', 'Версії схеми', 'Schema versions'],
  users: ['Benutzer', 'Користувачі', 'Users'], settings: ['Einstellungen', 'Налаштування', 'Settings'],
};
export const BACKUP_TABLE_KEY_CODES = Object.keys(BACKUP_TABLE_KEYS);
// Einstellungen im Protokoll: Bezeichnung wie unter Einstellungen (STRINGS-Schlüssel); SLA-Fristen aus Umgebung · Schritt · Priorität
const SETTING_LABEL_KEYS = { test_master_readonly: 'test_master_readonly', idle_logout_workshop_min: 'idle_ws', idle_logout_other_min: 'idle_other', workshop_hourly_rate_net: 'hourly_rate',
  maintenance_warn_days: 'warn_days', maintenance_warn_km: 'warn_km', tire_warn_tread_mm: 'tire_warn', tire_warn_age_years: 'tire_warn_age', fine_warn_days: 'fine_warn',
  driver_doc_warn_days: 'driver_doc_warn', license_check_months: 'license_check_months', tacho_warn_days: 'tacho_warn', contract_warn_days: 'ct_warn',
  claim_followup_days: 'claim_followup', case_stale_days: 'case_stale_setting', user_unused_days: 'unused_setting', repair_cost_limit_net: 'cost_limit_setting', work_day_max_hours: 'work_day_setting' };
export const AUDIT_SETTING_KEYS = Object.keys(SETTING_LABEL_KEYS);
function settingLabel(lang, k) {
  const S = (x) => (STRINGS[lang] && STRINGS[lang][x]) || STRINGS.de[x] || null;
  if (SETTING_LABEL_KEYS[k]) return S(SETTING_LABEL_KEYS[k]);
  const m = /^sla_(test|production)_(triage|ack)_(niedrig|mittel|kritisch)_min$/.exec(k);
  return m ? `${S(m[1] === 'test' ? 'env_testname' : 'env_prod')} · ${S(m[2] === 'triage' ? 'act_receive' : 'act_acknowledge')} · ${S('prio_' + m[3])} (min)` : null;
}
// Codewerte (snake_case) je Schlüssel als Bezeichnung: Prüfergebnis, Ergebnis Führerscheinkontrolle, zGM-Klasse, HU/SP-Status
// 18.10.2026: Status Versicherungsfall (cls_) und Art Rufnummer/Vertrag (em_kind_/ck_) – Protokoll zeigte „gemeldet → reguliert“, „Kind: werkstatt“
// kind: auch Nachweisarten der Fahrerakte (dk2_) und Auslesearten (tk_) – 21.10.2026: „Art: fuehrerschein“/„massenspeicher“ roh
const AUDIT_VALUE_PREFIX = { result: ['res_', 'lcr_'], zgm_class: ['zc_'], status: ['hs_', 'cls_'], kind: ['em_kind_', 'ck_', 'dk2_', 'tk_'], doc_kind: ['dk_'], vehicle_kind: ['vk_'], axle: ['axle_'] };
const AUDIT_BY = { totp: ['App-Code', 'Код із застосунку', 'App code'], recovery: ['Ersatzcode', 'Резервний код', 'Recovery code'] };
const AUDIT_SINGLE_WORD = new Set(['doc_kind', 'vehicle_kind', 'status', 'kind', 'axle', 'result']); // 21.10.2026: auch „result: maengel“ (Führerscheinkontrolle), „kind: code95“ (Ziffern) // Codes ohne Unterstrich (versicherung, lkw) trotzdem übersetzen
const AUDIT_DETAIL_VALUES = { true: ['ja', 'так', 'yes'], false: ['nein', 'ні', 'no'], test: ['Test', 'Тест', 'Test'], production: ['Betrieb', 'Робочий', 'Production'] };
// refs: vom Server aufgelöste Kennungen (Fahrer/Person → Name, Fahrzeug → Kennzeichen) je oberstem Schlüssel; ersetzt nur die Anzeige
// Datumswerte im Protokoll-Detail (Anzeige) im Format der Sprache: „2026-08-01“ → DE/UK 01.08.2026, EN 01/08/2026; Zeitstempel in Berliner Zeit.
// CSV und Suche nutzen weiter den Rohwert (Server). Gefunden 16.10.2026 vom Rauchtest („ausgelesen am: 2026-08-01“).
// Feste deutsche Systemtexte älterer Protokolleinträge (Migration 0016, nicht mehr änderbar) in der Oberflächensprache (21.10.2026)
const AUDIT_FIXED_TEXTS = {
  'CSV-Import': ['CSV-Import', 'Імпорт CSV', 'CSV import'],
  'SP-Frist nach StVZO Anlage VIII (6 Monate nach HU) statt pauschal 6 Monate nach letzter SP; zGM-Klassen laut Angabe Inhaber': [
    'SP-Frist nach StVZO Anlage VIII (6 Monate nach HU) statt pauschal 6 Monate nach letzter SP; zGM-Klassen laut Angabe Inhaber',
    'Строк SP за StVZO, додаток VIII (6 місяців після HU) замість загальних 6 місяців після останньої SP; класи повної маси за даними власника',
    'SP deadline per StVZO Annex VIII (6 months after HU) instead of a flat 6 months after the last SP; GVW classes as stated by the owner'],
};
const AUDIT_LOC = ['de-DE', 'uk-UA', 'en-GB'];
const AUDIT_DT = {};
function auditDateVal(v, li) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [y, m, d] = v.split('-'); return [d, m, y].join(li === 2 ? '/' : '.'); }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(v) && !Number.isNaN(Date.parse(v))) {
    const f = AUDIT_DT[li] || (AUDIT_DT[li] = new Intl.DateTimeFormat(AUDIT_LOC[li], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Berlin' }));
    return f.format(new Date(v));
  }
  return v;
}

export function auditDetailText(lang, detail, refs) {
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return detail === null || detail === undefined ? '' : (typeof detail === 'object' ? JSON.stringify(detail) : String(detail));
  const li = { de: 0, uk: 1, en: 2 }[lang] ?? 0;
  const key = (k) => (AUDIT_DETAIL_KEYS[k] ? AUDIT_DETAIL_KEYS[k][li] : settingLabel(lang, k) || (BACKUP_TABLE_KEYS[k] ? BACKUP_TABLE_KEYS[k][li] : k));
  const isFT = (v) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 2 && 'from' in v && 'to' in v && [v.from, v.to].every((x) => x === null || typeof x !== 'object');
  const val = (k, v) => {
    if (v === null || v === undefined || v === '') return '–';
    if (typeof v === 'boolean') return AUDIT_DETAIL_VALUES[String(v)][li];
    if (k === 'hours_no_holidays' && v === 1) return AUDIT_DETAIL_VALUES.true[li]; // Rufnummer: nicht an Feiertagen (Backlog 427)
    if (k === 'hours_holiday_state' && typeof v === 'string' && (STRINGS[lang] || STRINGS.de)['st_' + v]) return (STRINGS[lang] || STRINGS.de)['st_' + v]; // Backlog 431
    if (k === 'hours_more' && typeof v === 'string' && v.startsWith('[')) { try { const L = STRINGS[lang] || STRINGS.de; return JSON.parse(v).map((w) => `${String(w.days).split('').map((d) => L['em_wd_' + d]).join(', ')} ${w.from ? `${w.from}–${w.to}` : L.em_allday}`).join('; '); } catch {} } // Backlog 430
    if (k === 'hours_days' && typeof v === 'string' && /^[1-7]+$/.test(v)) return v.split('').map((d) => (STRINGS[lang] || STRINGS.de)['em_wd_' + d]).join(', '); // „12345“ → „Mo, Di, Mi, Do, Fr“
    if (k === 'active' && (v === 0 || v === 1)) return AUDIT_DETAIL_VALUES[String(v === 1)][li]; // ältere Einträge (bis 19.10.2026 als Zahl)
    if (k === 'by' && AUDIT_BY[v]) return AUDIT_BY[v][li]; // Zwei-Faktor ausgeschaltet mit App-Code/Ersatzcode
    if (k === 'environment' && AUDIT_DETAIL_VALUES[v]) return AUDIT_DETAIL_VALUES[v][li];
    // Standort „ohne“ und gespeicherte deutsche Prüfarten in der Oberflächensprache (20.10.2026: EN zeigte „Site: ohne“, „Kind: Ölwechsel“)
    if (k === 'site' && v === 'ohne') return (STRINGS[lang] || STRINGS.de).cs_nosite;
    if (k === 'kind' && typeof v === 'string' && ICS_MK_KEYS[v] && (STRINGS[lang] || STRINGS.de)['mk_' + ICS_MK_KEYS[v]]) return (STRINGS[lang] || STRINGS.de)['mk_' + ICS_MK_KEYS[v]];
    if (k === 'role' && typeof v === 'string' && STRINGS[lang] && STRINGS[lang]['role_' + v]) return STRINGS[lang]['role_' + v];
    if (Array.isArray(v)) return v.length && v.every((x) => x === null || typeof x !== 'object') ? v.map((x) => (typeof x === 'string' ? key(x) : String(x))).join(', ') : (v.length ? JSON.stringify(v) : '–');
    if (isFT(v)) return `${val(k, v.from)} → ${val(k, v.to)}`;
    if (typeof v === 'object' && Object.values(v).every((x) => x === null || typeof x !== 'object')) return Object.entries(v).map(([f, x]) => `${key(f)} ${val(f, x)}`).join(', ');
    if (typeof v === 'object') return Object.values(v).every(isFT) ? Object.entries(v).map(([f, x]) => `${key(f)} ${val(f, x.from)} → ${val(f, x.to)}`).join(', ') : JSON.stringify(v);
    if (typeof v === 'string' && (/^[a-z]+(_[a-z0-9]+)+$/.test(v) || (AUDIT_SINGLE_WORD.has(k) && /^[a-z][a-z0-9]*$/.test(v))) && AUDIT_VALUE_PREFIX[k]) { const p = AUDIT_VALUE_PREFIX[k].find((x) => STRINGS.de[x + v]); if (p) return (STRINGS[lang] && STRINGS[lang][p + v]) || STRINGS.de[p + v]; }
    if (typeof v === 'string' && AUDIT_FIXED_TEXTS[v]) return AUDIT_FIXED_TEXTS[v][li];
    if (typeof v === 'string') return auditDateVal(v, li);
    return String(v);
  };
  const rf = refs && typeof refs === 'object' ? refs : {};
  return Object.entries(detail).map(([k, v]) => `${key(k)}: ${typeof rf[k] === 'string' && rf[k] ? rf[k] : val(k, v)}`).join(' · ');
}

// Inventur: Rückfrage vor dem Buchen, erneute Prüfung nach Änderungen (Server lehnt abweichende Buchung mit inventory_changed ab)
// Inventur-Zählliste (Ausdruck, Blindzählung ohne Buchbestand als Standard)
// Inventur: Entwurf der Zählmengen auf diesem Gerät
// Neuer Einladungslink für ein Konto, das schon ein Passwort hat
// Inventurdifferenzen (Lagerjournal, Auswahl „Inventurdifferenzen“): Buchbestand → gezählt, Wert zum heutigen Artikelpreis
// Bestand zum Stichtag (Jahresabschluss)
// Inventur ohne Abweichungen abschließen und „letzte Inventur“ je Lager
// [CLAUDE] Zeitleiste: Hinweis, wenn ältere Einträge nicht angezeigt werden (15.10.2026)
// [CLAUDE] Artikel-Stammdaten in der Artikelakte bearbeiten (Bezeichnung, Teilenummer, Mindestbestand, Lagerort, Preis, aktiv) – 15.10.2026
// [CLAUDE] Pluralformen für Zähltexte (16.10.2026): statt „1 Hinweis(e)“, „3 заявк(и)“, „1 device(s)“ die richtige Form je Sprache
// (Intl.PluralRules: de/en one/other, uk one/few/many). Fehlt eine Sprache oder Form, gilt der Grundtext aus STRINGS.
const P_PUSH_DE = 'dringende Hinweise (z. B. Fahrzeugsperre) erreichen {who} nur, wenn {sub} die App {open}. Empfehlung: bei der Einführung Push auf dem Handy einschalten lassen.';
const pushDe = (who, sub, open) => P_PUSH_DE.replace('{who}', who).replace('{sub}', sub).replace('{open}', open);
const P_UNUSED_DE = ' länger als {d} nicht angemeldet (ohne protokollierte Anmeldung: seit der Anlage). Bitte prüfen, ob der Zugang noch gebraucht wird – sonst deaktivieren. Die App deaktiviert nichts selbst.';
const P_UNUSED_EN = ' without a sign-in for over {d} (no sign-in recorded: since creation). Please check whether the access is still needed – otherwise deactivate it. The app does not deactivate anything by itself.';
// Einstellungen: Wert außerhalb des zulässigen Bereichs bzw. nicht lesbar (Server-Code setting_invalid mit Schlüssel und Grenzen, 16.10.2026)
export const PLURALS = { de: {}, uk: {}, en: {} };
// km-Zähler gesunken (Tachotausch o. Ä.): km-Fälligkeit und km-Kontingent ungeklärt statt falscher Werte (16.10.2026)
// Datenqualität: km-Rücksprung ohne Begründung (16.10.2026)

// [CLAUDE] 18.10.2026: Auslesungen stornieren
// [CLAUDE] 18.10.2026: Telematik-Prüffälle nicht still kappen
// [CLAUDE] 18.10.2026: Kennzahlen – interne Aufträge, Prüfmängel ohne Auftrag erledigt
// [CLAUDE] Hilfe „Einstellungen“ (nur Inhaber, 19.10.2026) – beschreibt nur vorhandene Felder der Seite Mehr → Einstellungen
// [CLAUDE] 20.10.2026: Fehlersuche Reifen/Lager/Fahrerakte/Einstellungen
// [CLAUDE] 403 mit Grund (reason) in der Oberflächensprache, Status als Bezeichnung statt Code (21.10.2026)
// [CLAUDE] 22.10.2026: Rollen-/Konsistenz-/Tastaturprüfung

// [CLAUDE] 22.10.2026: Erstnutzung mit leerem Bestand
// 23.10.2026 (Teilagenten Inhaber am Handy / Fremdvergabe): Teilausfall der Startseite, „Erledigt“-Rückfrage, Fremdleistung ersetzt eigene Kosten
// 23.10.2026 (Teilagenten geteiltes Werkstatt-Konto / Rückrufaktion / Monatswechsel): Wiederholung erkannt, Stundensatz von heute, Stichtag der Kennzahlen
// 23.10.2026 (Teilagenten Anhänger abgestellt / Urlaubsrückkehr / neuer Standort)
// [CLAUDE] Backlog 188 (Jahresabschluss): Rückfrage bei Ratenänderung an einem Vertrag, der vor dem laufenden Monat begann
// [CLAUDE] Backlog 189 (Jahresabschluss): nachträglich erfasste Arbeitszeit im Kostenbericht, Rückfrage bei Arbeitsdatum vor dem laufenden Monat
// [CLAUDE] Backlog 190 (Werkstatt geschlossen): bisherige, nicht mehr aktive Werkstatt eines Kontos bleibt beim Bearbeiten ausgewählt
// [CLAUDE] Backlog 190 (Fahrer verlässt das Unternehmen): Fahrerakte deaktiviert, App-Konto aber noch aktiv / Fahrzeug zugeordnet
// [CLAUDE] Backlog 191 (Wiedereinstellung): ausgeschiedene Akte statt neuer Akte, verknüpfte Akte nennen
// Backlog 196 (23.10.2026, Teilagent „Monatsende: km-Stände für Leasing“): Stichtag der Vertragsübersicht, Ablesedatum, Mehr-km
Object.assign(FIELD_NAMES.uk, { Stichtag: 'Дата звітності' });
Object.assign(FIELD_NAMES.en, { Stichtag: 'Key date' });
// 23.10.2026 (Teilagent „Disposition erster Tag“): Push-Fehler des Browsers übersetzt, Standort-Hinweis der Disposition, Winterreifen nur unvollständig erfasst
// Backlog 536: „Ort laut Meldung“ (vorher gleich beschriftet wie der eingetragene „Standort des Fahrzeugs“)

// Backlog 200 (23.10.2026, Teilagent „Unfall nachts“): noch nicht gesendete Meldung/Kontrolle im Postausgang wirkt auf dem eigenen Gerät
// Backlog 204 (23.10.2026, Teilagent „Wiederinbetriebnahme nach Standzeit“): Hinweise beim Wieder-in-Betrieb-Nehmen/Wiederaufnehmen
// Backlog 470: ruhende Fahrzeuge im Rückruf-Schritt der Teile-Verwendung nicht vorgewählt
// Backlog 471: Gebrauchtteil aus eigenem Fahrzeug (Teilespender) – Herkunft einheitlich im Feld „Lieferant“
// Backlog 469: Rückkehr nach Standzeit nennt aktive Fahrzeughinweise und offene Restarbeiten
// Backlog 205 (23.10.2026): Standzeit in der Zeitleiste, optionaler Grund bei der Rückkehr
// Backlog 207 (23.10.2026, Teilagent „HU-Tag in der Werkstatt“): SP mit erheblichen/gefährlichen Mängeln
Object.assign(VALIDATION_TEXTS.uk, { evidence_exists: 'Для цього виконання {d} вже внесено інше підтвердження («{v}») – перевірте дату та протокол.' });
Object.assign(VALIDATION_TEXTS.en, { evidence_exists: 'A different proof is already recorded for this inspection on {d} (“{v}”) – please check the date and report.' });
// Backlog 224 (24.10.2026, Teilagent „Leitung gibt Kostenvoranschlag als PDF frei“): Beleg einer Fremdleistung
// Backlog 225 (24.10.2026, Teilagent „Fahrer wechselt sein Handy“): Push-Geräte ohne aktive Anmeldung
// Backlog 227 (24.10.2026): Hinweis „Push auf diesem Gerät einschalten“ auf der Fahrer-Startseite
// Backlog 226 (24.10.2026): Anmelde-Hinweis auf dem Gerät, das sich angemeldet hat
// Sammeltermin für mehrere Prüftermine (Backlog 235, 24.10.2026)
// Auslesungen – Verlauf mit Fristüberschreitungen für einen Zeitraum (24.10.2026, Backlog 245: Betriebsprüfung)
// Nachweise und Führerscheinkontrollen für einen Zeitraum (24.10.2026, Backlog 246: Betriebsprüfung)
// Backlog 249: Kommentar ohne Empfänger / Melder nicht erreichbar
// Backlog 250: Fahrerakte ausgeschieden bei der Fahrzeugzuordnung
// Blickwinkel „Termin verpasst“ (24.10.2026): Verschiebungen im Werkstattplan, Grund beim Verschieben
// Backlog 275: Versicherungsfall-Summen – Fälle mit unvollständig bewerteten Kosten

// Backlog 285 (Blickwinkel „Schaden wird erst Tage später gemeldet“): Schadenzeitpunkt laut Meldung
// Backlog 287: Hinweis im Versicherungsfall ohne Schadenzeitpunkt
// Backlog 288 (Leasingrückgabe): offene Vorgänge/Restarbeiten bei Leasing/Miete, die bald enden bzw. abgelaufen sind
// Backlog 289: Rückgabe beim Beenden von Leasing/Miete – letzter km-Stand
// Backlog 290: Leasing-/Mietfahrzeug im Vorgang (nur Leitung)
// Backlog 414: Wartungs-/Full-Service-Vertrag im Vorgang (nur Leitung)
// Backlog 415: Wartungsvertrag beim Werkstattauftrag aus Prüftermin (Fahrzeugakte, nur Leitung)
// [CLAUDE] 26.10.2026 Backlog 364: Fahrverbot laut Bußgeldschreiben (1–3 Monate, § 25 StVG)
// Backlog 375: Zustellstand der Fahrerinformation im Bußgeld (Leitung)
// Backlog 376: Kandidaten aus Zuordnung und Abfahrtskontrolle widersprechen sich
// Backlog 377: Einwand des Fahrers zum Bußgeld

// Backlog 378 (Blickwinkel „Werkstatt bekommt Teile falsch geliefert“)
// Backlog 379/380 (Blickwinkel „Neuer Fahrer, erster Arbeitstag“)
// Backlog 381 (Blickwinkel „Neuer Fahrer, erster Arbeitstag“): Sprache beim Anlegen
Object.assign(FIELD_NAMES.uk, { Sprache: 'Мова' });
Object.assign(FIELD_NAMES.en, { Sprache: 'Language' });
// Backlog 384 (Blickwinkel „Betriebskontrolle“): Auslesungsverlauf ohne jede Auslesung
// Backlog 404 (Blickwinkel „Hagelschaden an mehreren Lkw auf dem Hof“): Sammelmeldung gleicher Schaden an mehreren Fahrzeugen
// Backlog 665–667 (30.10.2026, Blickwinkel „Unwetter: Ast/Baum auf dem Lkw, Hagel, Hochwasser auf dem Hof“): Schritte im Meldeformular, Hinweis Versicherungsschutz, Hilfe
// Backlog 668–670 (30.10.2026, Blickwinkel „Lkw bleibt an Brücke/Unterführung/Tankstellendach hängen – Durchfahrtshöhe“): Schritte im Meldeformular, Hinweis Anzeige/Versicherer im Vorgang, Hilfe
// Backlog 671–673 (30.10.2026, Blickwinkel „Lkw steht nicht mehr da – abgeschleppt, umgesetzt oder Parkkralle“): Schritte im Meldeformular, Hinweis Kosten/Schreiben im Vorgang, Hilfe
// Backlog 674–676 (30.10.2026, Blickwinkel „Personen im Laderaum entdeckt – blinde Passagiere am Rastplatz/Hafen“): Schritte im Meldeformular, Hinweis Anzeige im Vorgang, Hilfe
// [CLAUDE] Backlog 405: Prüftermin für mehrere Fahrzeuge anlegen (Sammelanlage, z. B. Wintercheck)
// [CLAUDE] Backlog 406: Winterreifen-Bedarf je Reifengröße (Reifen-Flotte, Reiter „Winter nicht erfüllt“)
// [CLAUDE] Backlog 407: Winterreifen-Aufträge für mehrere Lkw (Reifen-Flotte, Winter-Reiter)

// [CLAUDE] Backlog 408 (Blickwinkel „Reifendienst wechselt an einem Tag die Reifen von 10 Lkw“): Umrüstung zum Winterreifen-Auftrag erfassen
// [CLAUDE] Backlog 409 (Blickwinkel „Jahresende: Verträge, die im 1. Quartal enden“): Verträge mit Ende/Kündigungsfrist bis zu einem Datum
// [CLAUDE] Backlog 410 (Blickwinkel „Jährliche Fahrerunterweisung – viele Fahrer in einer Schulung“): Unterweisung für mehrere Fahrer
// [CLAUDE] Backlog 411 (Blickwinkel „Halbjährliche Führerscheinkontrolle aller Fahrer an einem Tag“)

// [CLAUDE] 26.10.2026 Backlog 412: Stundensatz-Verlauf (bisherigen Satz beim Ändern behalten)
// [CLAUDE] 26.10.2026 Backlog 413: Kostenbericht Schnellwahl Zeitraum (Jahresabschluss)
Object.assign(FIELD_NAMES.uk, { 'Hinweis zum Termin': 'Примітка до терміну' });
Object.assign(FIELD_NAMES.en, { 'Hinweis zum Termin': 'Note on the date' });
// Backlog 449 (Blickwinkel „Lieferant liefert nur einen Teil der Bestellung“): Teillieferung eingegangen
// Backlog 450: Wareneingang – wartende Aufträge dieser Werkstatt
// Backlog 451: Buchungsformulare nennen Auftrag und Fahrzeug
// Backlog 452: Teillieferung im Lager – Bestellvermerk bleibt mit Restmenge
// Backlog 453: Kurzablauf eines Werkstattauftrags auf der Werkstatt-Startseite ({a}/{b} = Knopf-Beschriftungen)
// Backlog 454: Werkstatt-Startseite – Auftrag steht in einem hervorgehobenen Abschnitt oben und zusätzlich in seinem Arbeitsschritt
// Backlog 457: feste Tagesreihenfolge (Startseite „Heute geplant“, Werkstattplan)
// Backlog 458: Disposition – wieder einsatzbereit (heute/gestern technisch freigegeben)
// Backlog 462: Foto/Datei vom Melder nachgereicht (Verlauf, Push-Einstellung)
// Backlog 463: Rückfrage an den Melder als erkennbarer offener Zustand
// Backlog 464: Restarbeiten nach der Freigabe für Fahrer
// [CLAUDE] Backlog 472 (Blickwinkel „Überführungsfahrt zur Werkstatt“): Fahrbereitschaft laut Meldung in „Mein Fahrzeug“
// [CLAUDE] Backlog 474: Tafel der Disposition – eingeschränkt fahrbereit gemeldet, noch ohne Werkstattauftrag
// [CLAUDE] Backlog 479: Rückfrage beim Abmelden, wenn ungesicherte Entwürfe verloren gehen


// [CLAUDE] Backlog 484: Markierung „(morgen)“ an geplanten Terminen der Fahrzeugliste
// [CLAUDE] Backlog 487: freigegebene Aufträge mit offenen Restarbeiten (Filter der Vorgangsliste, Werkstatt-Startseite)
// [CLAUDE] Backlog 488: eigene Arbeitszeit der Woche im Formular „Arbeitszeit erfassen“
// [CLAUDE] Backlog 504: Prüftermine „fällig bis“ (z. B. Monatsende des nächsten Monats) zusätzlich zur Warnfrist
// [CLAUDE] Backlog 508: Abfahrtskontrolle heute bereits erfasst (z. B. auf einem zweiten Gerät)
// [CLAUDE] Backlog 512: Leasing/Miete ohne Kontingent und ohne km-Stand
// [CLAUDE] Backlog 513–515: Werkstattwechsel (Auswahl, Termin/Übernahme entfallen), Lager der zuständigen Werkstatt ohne Bestand
// [CLAUDE] Backlog 520: Fortschritt der Winterumrüstung
// [CLAUDE] Backlog 522/523: „Heute zu tun“ – Schlüssel/Fahrzeugschein fehlt bei der Werkstatt; Kommentar-Empfänger „Fuhrparkleitung / Inhaber“
// [CLAUDE] Backlog 527–531: Versicherungsfälle zum Quartalsende (Reiter „reguliert ohne Erstattung“, Suche im Ausdruck)
// [CLAUDE] Backlog 532–535: Leihhandy am ersten Arbeitstag (abgelehnte Meldungen beim Abmelden, Abmelden ohne Netz, lateinischer Benutzername, Passwort anzeigen)
// [CLAUDE] Backlog 536–540: liegengebliebenes Fahrzeug in Listen erkennbar, Foto-Stand im Notfall-Panel
// [CLAUDE] Backlog 541–545: Prüftermine des Folgejahres planen (Prüfart, „bis Ende nächsten Jahres“, Durchführung vom geplanten Termin)
// [CLAUDE] Backlog 546–548: Inventur am Tablet (Lagerort-Anzeige, Fortschritt, nicht gezählte Artikel)
// [CLAUDE] Backlog 549: nach dem Stichtag gebuchte Inventurdifferenzen
// [CLAUDE] Backlog 550: Hinweise auf Einstellungen für Rollen ohne Einstellungen
// [CLAUDE] Backlog 551: Hilfe „Übernahme als neue Fuhrparkleitung“ (nur Wegweiser zu vorhandenen Funktionen)
// Backlog 656–658 (Blickwinkel „Fahrer verlässt das Unternehmen – letzter Arbeitstag“): Hinweise beim Deaktivieren/Ausscheiden, Hilfe-Checkliste
// [CLAUDE] Backlog 552: Hinweis eines deaktivierten Kontos
// [CLAUDE] Backlog 553/554: Fahrerermittlung zum Anhörungsbogen
// [CLAUDE] Backlog 556: „Wieder einsatzbereit“ seit dem letzten Werktag
// Backlog 569 (Blickwinkel „Fahrerkarte defekt/verloren“): Hinweis im Vorgang für die Leitung
// Backlog 576: Hinweis im Formular „erledigt“ bei Terminen ohne Intervall
// Backlog 577: Titel je Prüftermin „Sonstiges“
Object.assign(FIELD_NAMES.uk, { 'Titel': 'Назва' }); Object.assign(FIELD_NAMES.en, { 'Titel': 'Title' }); // Backlog 577
// Backlog 579: Prüftermin bearbeiten / beenden
// Backlog 589: Prüftermin-Import – erlaubte Prüfarten bei „Prüfart unbekannt“
// Backlog 593: ausgelagerter App-Bereich konnte nicht geladen werden (z. B. Funkloch beim ersten Aufruf)
// Backlog 605: gekoppeltes Fahrzeug im Sperr-Hinweis (Hinweisliste)
// Backlog 606: Kostenbericht – Schnellwahl Vormonat (Monatsprüfung)
// Backlog 607: geplanter Prüftermin nach Fristende
// Backlog 608: Werkstattplan – Termine des gekoppelten Fahrzeugs
// Backlog 611 (Blickwinkel „Jahresplanung 2027“): Fahrerliste „Fristen bis“
// Backlog 612: Prüftermine mit „Fällig bis“ nach Monat gruppiert
// Backlog 614: Kosten je km – Kostenmonate außerhalb der km-Ablesungen
// Backlog 616: Kosten-CSV je Fahrzeug
// Backlog 622 (Blickwinkel „Versichererwechsel zum 01.01.“): Vertragsimport – neuer Vertrag läuft neben einem nicht beendeten gleicher Art
// Backlog 624: Verträge gesammelt beenden bzw. Vertragsende eintragen (Mehr → Verträge)
// Backlog 625: Verträge nach Vertragspartner, Folgevertrag
// Backlog 629: externe Werkstatt (EXTERN, ohne Werkstattkonto) – Abschlusskontrolle und Freigabe in einem Schritt
// Backlog 631: Datenqualität – Diebstahl ohne Versicherungsfall
// Backlog 634: Schaden am Auflieger bei Meldung am Lkw
// Backlog 633: Gespann im Vorgang, Polizeiangaben übernehmen, gleiche Schadennummer
// Backlog 635/637/638: km-Fälligkeit – Stand-Datum, fehlender km-Stand
// Backlog 636: km-Fälligkeit ohne Intervall beim Erledigen
// [CLAUDE] Backlog 678–680 (30.10.2026, Blickwinkel „Eis/Schnee auf dem Aufliegerdach“): Schritte im Meldeformular, Hinweis an die Leitung, Hilfe
// [CLAUDE] Backlog 682–684 (30.10.2026, Blickwinkel „Ladungsschaden beim Kunden reklamiert“): Schritte im Meldeformular, Hinweis an die Leitung, Hilfe
// [CLAUDE] Backlog 685–687 (30.10.2026, Blickwinkel „Kennzeichen verloren, gestohlen oder unleserlich“): Schritte im Meldeformular, Hilfe, Hinweis an die Leitung im Vorgang

// [CLAUDE] Backlog 688–689 (30.10.2026, Blickwinkel „Partikelfilter (DPF) voll – Regeneration nötig oder bricht ab“): Schritte im Meldeformular, Hilfe
// [CLAUDE] Backlog 690–691 (30.10.2026, Blickwinkel „Fahrer rutscht beim Absteigen aus – Trittstufe oder Haltegriff defekt“): Schritte im Meldeformular, Hilfe
// [CLAUDE] Backlog 692–693 (30.10.2026, Blickwinkel „Vor dem Laden: Zurrgurte, Kantenschutz oder Antirutschmatten fehlen bzw. sind beschädigt“): Schritte im Meldeformular, Hilfe
// [CLAUDE] Backlog 741–742 (30.10.2026, Blickwinkel „Ladeboden, Bordwand, Seitenwand oder Runge beschädigt“): eigene Schritte im Meldeformular und Hilfe-Abschnitt.
// [CLAUDE] Backlog 694–695 (30.10.2026, Blickwinkel „Konturmarkierung, Rückstrahler oder Warntafel abgerissen/fehlt“): Schritte im Meldeformular, Hilfe
// Sprachpaket nachladen (vollständig, deutsche Rückfalltexte sind enthalten); Fehler (z. B. offline ohne Cache) → erneut versuchbar
const LOADING = {}, LOADED = new Set();
export const langLoaded = (l) => LOADED.has(l);
export function loadLang(l) {
  if (!LANGS.includes(l)) l = 'de';
  if (!LOADING[l]) LOADING[l] = import(`./i18n-${l}.js`).then((m) => { Object.assign(STRINGS[l], m.S); Object.assign(PLURALS[l], m.P); LOADED.add(l); }).catch((e) => { delete LOADING[l]; throw e; });
  return LOADING[l];
}
export const LANGS = ['de', 'uk', 'en'];
// Hilfe-Schritte (Backlog 597): eigenes Paket je Sprache; nach einem Fehler neuer Versuch mit „?r=N“ (Browser merkt sich fehlgeschlagene Importe)
const HELP_LOADING = {}, HELP_TRY = {};
export const helpLoaded = (l) => !!HELP_LOADING[l] && HELP_LOADING[l].done === true;
export function loadHelp(l) {
  if (!LANGS.includes(l)) l = 'de';
  if (!HELP_LOADING[l]) {
    const p = import(`./i18n-${l}-hilfe.js${HELP_TRY[l] ? `?r=${HELP_TRY[l]}` : ''}`).then((m) => { Object.assign(STRINGS[l], m.S); p.done = true; })
      .catch((e) => { delete HELP_LOADING[l]; HELP_TRY[l] = (HELP_TRY[l] || 0) + 1; throw e; });
    HELP_LOADING[l] = p;
  }
  return HELP_LOADING[l];
}
