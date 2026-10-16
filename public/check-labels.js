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
export function caseDescText(s, lang = 'de') {
  if (typeof s !== 'string') return s;
  const m = s.match(GEN_RE);
  if (!m) return s;
  const L = CHECK_LABELS[lang] ? lang : 'de';
  const label = CHECK_LABELS[L][m[2]] || CHECK_LABELS.de[m[2]];
  if (!label) return s; // unbekannter Schlüssel: Text unverändert (nichts erfinden)
  return `[${CHECK_PREFIX[L][m[1] === 'Abfahrt' ? 'abfahrt' : 'nach_reparatur']}] ${label}: ${s.slice(m[0].length)}`;
}
