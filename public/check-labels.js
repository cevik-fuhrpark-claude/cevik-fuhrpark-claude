// [CLAUDE] Prüfpunkte der Fahrzeugkontrollen (DE/UK/EN) und Anzeige automatisch erzeugter Vorgangstexte.
// Eigenes kleines Modul, damit der Server (CSV) dieselben Bezeichnungen nutzt, ohne die große i18n.js zu laden.
export const CHECK_LABELS = {
  de: {
    beleuchtung: 'Beleuchtung vorne/hinten', blinker_warnblinker: 'Blinker & Warnblinker', bremsleuchten: 'Bremsleuchten', kontrollleuchten: 'Kontrollleuchten im Cockpit',
    bremsen_funktion: 'Bremsen – Funktion', bremsluft_dicht: 'Bremsluftanlage dicht', reifen_zustand: 'Reifenzustand / Profil', reifendruck: 'Reifendruck', radmuttern: 'Radmuttern fest',
    lenkung: 'Lenkung ohne Spiel', fluessigkeiten: 'Öl, Kühlmittel, AdBlue', leckagen: 'Keine Leckagen', spiegel_scheiben_wischer: 'Spiegel, Scheiben, Wischer',
    ladungssicherung_auffahrten: 'Auffahrten & Ladungssicherung', hydraulik_ladeetagen: 'Hydraulik & Ladeetagen', kupplung_anhaenger: 'Kupplung & Anhängeranschlüsse',
    sicherheitsausruestung: 'Warndreieck, Weste, Verbandkasten', probefahrt: 'Probefahrt ohne Befund',
  },
  uk: {
    beleuchtung: 'Освітлення спереду/ззаду', blinker_warnblinker: 'Покажчики повороту й аварійка', bremsleuchten: 'Стоп-сигнали', kontrollleuchten: 'Контрольні лампи',
    bremsen_funktion: 'Гальма – робота', bremsluft_dicht: 'Пневмосистема гальм герметична', reifen_zustand: 'Стан шин / протектор', reifendruck: 'Тиск у шинах', radmuttern: 'Колісні гайки затягнуті',
    lenkung: 'Рульове без люфту', fluessigkeiten: 'Масло, антифриз, AdBlue', leckagen: 'Немає протікань', spiegel_scheiben_wischer: 'Дзеркала, скло, двірники',
    ladungssicherung_auffahrten: 'Трапи та кріплення вантажу', hydraulik_ladeetagen: 'Гідравліка та платформи', kupplung_anhaenger: 'Зчіпка та роз’єми причепа',
    sicherheitsausruestung: 'Знак аварійної зупинки, жилет, аптечка', probefahrt: 'Пробний виїзд без зауважень',
  },
  en: {
    beleuchtung: 'Lights front/rear', blinker_warnblinker: 'Indicators & hazards', bremsleuchten: 'Brake lights', kontrollleuchten: 'Dashboard warning lights',
    bremsen_funktion: 'Brakes – function', bremsluft_dicht: 'Air brake system tight', reifen_zustand: 'Tyre condition / tread', reifendruck: 'Tyre pressure', radmuttern: 'Wheel nuts tight',
    lenkung: 'Steering without play', fluessigkeiten: 'Oil, coolant, AdBlue', leckagen: 'No leaks', spiegel_scheiben_wischer: 'Mirrors, glass, wipers',
    ladungssicherung_auffahrten: 'Ramps & load securing', hydraulik_ladeetagen: 'Hydraulics & decks', kupplung_anhaenger: 'Coupling & trailer connections',
    sicherheitsausruestung: 'Warning triangle, vest, first aid', probefahrt: 'Test drive without findings',
  },
};

// Aus einer Kontrolle erzeugte Vorgänge speichern „[Kontrolle Abfahrt] <prüfpunkt>: <Vermerk>“ (Schlüssel bleibt maschinenlesbar,
// u. a. für Wiederholungs-Erkennung). Angezeigt wird die Bezeichnung des Prüfpunkts in der gewünschten Sprache statt des Schlüssels.
const CHECK_PREFIX = {
  de: { abfahrt: 'Kontrolle Abfahrt', nach_reparatur: 'Kontrolle nach Reparatur' },
  uk: { abfahrt: 'Перевірка перед виїздом', nach_reparatur: 'Перевірка після ремонту' },
  en: { abfahrt: 'Pre-trip check', nach_reparatur: 'Post-repair vehicle check' },
};
const GEN_RE = /^\[Kontrolle (Abfahrt|nach Reparatur)\] ([a-z0-9_]+): /;
// Aufträge aus Prüftermin/Prüfmangel/Rückruf/Winterreifen (src/cases.js) speichern einen festen deutschen Rahmen um Freitexte
// (Nachweis, Referenz, Vermerk). Angezeigt wird der Rahmen in der gewünschten Sprache, Freitexte bleiben unverändert (18.10.2026).
// opts.kind(k): Bezeichnung der Prüfart, opts.res(code): Bezeichnung des Prüfergebnisses (aus i18n.js; ohne Angabe unverändert).
const ORDER_TX = {
  uk: { maint: (k) => `Провести огляд/ТО: ${k}`, recall: 'Виконати відкликання виробника (референс: ', defects: (k, d, r) => `Усунути недоліки з ${k} від ${d} (результат: ${r}; підтвердження: `,
    w1: 'Перехід на зимові шини (символ Alpine)', w2: 'Перевірити зимові шини й внести зимове маркування', wpos: ' – позиції за обліком шин ', wno: 'без символу Alpine: ', wmiss: 'не внесено: ',
    wend: '. Заміну із зимовим маркуванням внесіть у картці транспорту → Шини.' },
  en: { maint: (k) => `Carry out inspection/maintenance: ${k}`, recall: 'Carry out manufacturer recall (reference: ', defects: (k, d, r) => `Rectify defects from ${k} on ${d} (result: ${r}; evidence: `,
    w1: 'Change to winter tyres (Alpine symbol)', w2: 'Check winter tyres and record winter marking', wpos: ' – positions per tyre records ', wno: 'without Alpine symbol: ', wmiss: 'not recorded: ',
    wend: '. Record the change with winter marking in the vehicle file → Tyres.' },
};
const DEFECT_CODE = { 'erhebliche Mängel': 'erhebliche_maengel', 'gefährliche Mängel': 'gefaehrliche_maengel', verkehrsunsicher: 'verkehrsunsicher' };
const MAINT_RE = /^Prüfung\/Wartung (.{1,40}?) durchführen(?= – |$)/;
const RECALL_RE = /^Herstellerrückruf durchführen \(Referenz: /;
const DEFECT_RE = /^Mängel aus (.{1,40}?) vom (\d{2})\.(\d{2})\.(\d{4}) beseitigen \(Ergebnis: (erhebliche Mängel|gefährliche Mängel|verkehrsunsicher); Nachweis: /;
const WINTER_RE = /^(Umrüstung auf Winterreifen \(Alpine-Symbol\)|Winterreifen prüfen und Winterkennzeichnung erfassen) – Positionen laut Reifenerfassung (.*?)\. Wechsel mit Winterkennzeichnung in der Fahrzeugakte → Reifen erfassen\./;
function orderText(s, L, opts) {
  const T = ORDER_TX[L]; if (!T) return null;
  const kind = (k) => (opts && opts.kind ? opts.kind(k) || k : k);
  let m;
  if ((m = s.match(MAINT_RE))) return T.maint(kind(m[1])) + s.slice(m[0].length);
  if ((m = s.match(RECALL_RE))) return T.recall + s.slice(m[0].length);
  if ((m = s.match(DEFECT_RE))) {
    const r = opts && opts.res ? opts.res(DEFECT_CODE[m[5]]) || m[5] : m[5];
    return T.defects(kind(m[1]), L === 'en' ? `${m[2]}/${m[3]}/${m[4]}` : `${m[2]}.${m[3]}.${m[4]}`, r) + s.slice(m[0].length);
  }
  if ((m = s.match(WINTER_RE))) {
    const pos = m[2].replace(/(^|; )ohne Alpine-Symbol: /, `$1${T.wno}`).replace(/(^|; )nicht erfasst: /, `$1${T.wmiss}`);
    return (m[1].startsWith('Umrüstung') ? T.w1 : T.w2) + T.wpos + pos + T.wend + s.slice(m[0].length);
  }
  return null;
}
export function caseDescText(s, lang = 'de', opts = null) {
  if (typeof s !== 'string') return s;
  const m = s.match(GEN_RE);
  if (!m) return (lang !== 'de' && orderText(s, lang, opts)) || s;
  const L = CHECK_LABELS[lang] ? lang : 'de';
  const label = CHECK_LABELS[L][m[2]] || CHECK_LABELS.de[m[2]];
  if (!label) return s; // unbekannter Schlüssel: Text unverändert (nichts erfinden)
  return `[${CHECK_PREFIX[L][m[1] === 'Abfahrt' ? 'abfahrt' : 'nach_reparatur']}] ${label}: ${s.slice(m[0].length)}`;
}

// Suche: Prüfpunkt-Schlüssel, deren Bezeichnung (DE/UK/EN) das Wort enthält – damit „Indicators“ oder „Blinker“ erzeugte Vorgänge findet
export function checkKeysFor(word) {
  const w = String(word || '').toLocaleLowerCase('de');
  if (w.length < 3) return [];
  const out = [];
  for (const k of Object.keys(CHECK_LABELS.de)) {
    if (['de', 'uk', 'en'].some((l) => String(CHECK_LABELS[l][k] || '').toLocaleLowerCase('de').includes(w))) out.push(k);
    if (out.length >= 3) break; // D1: höchstens 100 Parameter je Abfrage (5 Wörter × (4 Schreibweisen + 3 Schlüssel + 2 Vorsätze))
  }
  // angezeigter Vorsatz in UK/EN („[Pre-trip check]“, „[Перевірка перед виїздом]“) → gespeicherter deutscher Vorsatz (20.10.2026: Suche fand ihn nicht)
  for (const [k, de] of Object.entries(CHECK_PREFIX.de)) {
    if (['uk', 'en'].some((l) => CHECK_PREFIX[l][k].toLocaleLowerCase('de').includes(w))) out.push(`[${de}]`);
  }
  return out;
}

// [CLAUDE] Automatisch erzeugte Lager-Buchungstexte (src/stock.js) in der Oberflächensprache (18.10.2026). Gespeichert bleibt der deutsche
// Text (CSV, Suche, Protokoll); freie Vermerke nach „ – “ bleiben unverändert. Unbekannte Texte unverändert (nichts erfinden).
// Muster müssen zu src/stock.js passen (Wächter-Test).
export const STOCK_NOTE_RE = {
  initial: /^Anfangsbestand( \(Import\))?$/, // „(Import)“: Artikel-Import (stock.js)
  transfer: /^Umlagerung (nach|von) ([^\s–]+)( – [\s\S]*)?$/,
  caseOut: /^Vorgang ([A-Z]{1,3}-\d{4}-\d{1,6})$/,
  inventory: /^Inventur (\d{4}-\d{2}-\d{2}): gezählt (-?\d+(?:\.\d+)?) (.{1,20}?), Buchbestand (-?\d+(?:\.\d+)?) \3( – [\s\S]*)?$/,
  inventoryRef: /^Inventur (\d{4}-\d{2}-\d{2})$/,
};
const STOCK_T = {
  de: { initial: 'Anfangsbestand', initialImp: 'Anfangsbestand (Import)', to: 'Umlagerung nach {s}', from: 'Umlagerung von {s}', caseOut: 'Vorgang {n}', inv: 'Inventur {d}: gezählt {c} {u}, Buchbestand {b} {u}', invRef: 'Inventur {d}' },
  uk: { initial: 'Початковий залишок', initialImp: 'Початковий залишок (імпорт)', to: 'Переміщення до {s}', from: 'Переміщення з {s}', caseOut: 'Заявка {n}', inv: 'Інвентаризація {d}: пораховано {c} {u}, обліковий залишок {b} {u}', invRef: 'Інвентаризація {d}' },
  en: { initial: 'Opening stock', initialImp: 'Opening stock (import)', to: 'Transfer to {s}', from: 'Transfer from {s}', caseOut: 'Case {n}', inv: 'Stocktake {d}: counted {c} {u}, book stock {b} {u}', invRef: 'Stocktake {d}' },
};
export function stockNoteText(s, lang = 'de', { site = (x) => x, num = (x) => x, date = (x) => x, unit = (x) => x } = {}) {
  if (typeof s !== 'string' || !s) return s;
  const T = STOCK_T[lang] || STOCK_T.de; const R = STOCK_NOTE_RE; let m;
  const fill = (tpl, o) => tpl.replace(/\{(\w)\}/g, (_, k) => o[k]);
  if ((m = s.match(R.initial))) return m[1] ? T.initialImp : T.initial;
  if ((m = s.match(R.transfer))) return fill(m[1] === 'nach' ? T.to : T.from, { s: site(m[2]) }) + (m[3] || '');
  if ((m = s.match(R.caseOut))) return fill(T.caseOut, { n: m[1] });
  if ((m = s.match(R.inventory))) return fill(T.inv, { d: date(m[1]), c: num(Number(m[2])), u: unit(m[3]), b: num(Number(m[4])) }) + (m[5] || '');
  if ((m = s.match(R.inventoryRef))) return fill(T.invRef, { d: date(m[1]) });
  return s;
}
