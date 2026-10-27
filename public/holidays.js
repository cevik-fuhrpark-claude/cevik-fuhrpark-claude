// [CLAUDE] 25.10.2026 Backlog 267 (Teilagent „Feiertage und Brückentage“): die neun bundesweit einheitlichen gesetzlichen Feiertage
// (Neujahr, Karfreitag, Ostermontag, 1. Mai, Christi Himmelfahrt, Pfingstmontag, Tag der Deutschen Einheit, 1./2. Weihnachtstag),
// berechnet nach Gesetz (Ostersonntag nach der gregorianischen Osterformel). Nur für Hinweise und Terminvorschläge – keine Frist wird
// verschoben. Landesrechtliche Feiertage (z. B. Fronleichnam, Allerheiligen, 6. Januar) bewusst nicht: dafür fehlt die Zuordnung
// Standort → Bundesland (offene Frage an den Auftraggeber).
function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const cache = new Map();
function holidaysOf(y) {
  if (cache.has(y)) return cache.get(y);
  const e = easterSunday(y); const D = 86400000;
  const m = new Map([[`${y}-01-01`, 'neujahr'], [iso(e - 2 * D), 'karfreitag'], [iso(e + D), 'ostermontag'], [`${y}-05-01`, 'tag_der_arbeit'],
    [iso(e + 39 * D), 'himmelfahrt'], [iso(e + 50 * D), 'pfingstmontag'], [`${y}-10-03`, 'einheit'], [`${y}-12-25`, 'weihnacht1'], [`${y}-12-26`, 'weihnacht2']]);
  cache.set(y, m); return m;
}
// Schlüssel des bundesweiten Feiertags an diesem Kalendertag (JJJJ-MM-TT) oder null
export function federalHoliday(d) {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const y = Number(d.slice(0, 4)); if (y < 1900 || y > 2200) return null;
  return holidaysOf(y).get(d) || null;
}
export const HOLIDAY_KEYS = ['neujahr', 'karfreitag', 'ostermontag', 'tag_der_arbeit', 'himmelfahrt', 'pfingstmontag', 'einheit', 'weihnacht1', 'weihnacht2'];

// [CLAUDE] 27.10.2026 Backlog 431 (Blickwinkel „Allerheiligen – Büro in Dortmund geschlossen, App sagt ‚jetzt erreichbar‘“): landesweit geltende
// gesetzliche Feiertage je Bundesland (Feiertagsgesetze der Länder), zusätzlich zu den bundesweiten. Nur landesweit geltende Tage – örtlich
// begrenzte (Mariä Himmelfahrt in Teilen Bayerns, Augsburger Friedensfest, Fronleichnam in Teilen Sachsens/Thüringens) bewusst nicht.
// Genutzt nur dort, wo der Betrieb das Bundesland selbst wählt (Erreichbarkeit einer Rufnummer) – keine Zuordnung Standort → Land.
export const STATES = ['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'];
const STATE_RULES = [
  ['heilige3', ['BW', 'BY', 'ST'], (y) => `${y}-01-06`],
  ['frauentag', ['BE', 'MV'], (y) => `${y}-03-08`, { BE: 2019, MV: 2023 }],
  ['ostersonntag', ['BB'], (y, e) => iso(e)],
  ['pfingstsonntag', ['BB'], (y, e) => iso(e + 49 * 86400000)],
  ['fronleichnam', ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'], (y, e) => iso(e + 60 * 86400000)],
  ['mariae', ['SL'], (y) => `${y}-08-15`],
  ['kindertag', ['TH'], (y) => `${y}-09-20`, { TH: 2019 }],
  ['reformation', ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'], (y) => `${y}-10-31`, { HB: 2018, HH: 2018, NI: 2018, SH: 2018 }],
  ['allerheiligen', ['BW', 'BY', 'NW', 'RP', 'SL'], (y) => `${y}-11-01`],
  // Buß- und Bettag: Mittwoch vor dem 23. November
  ['busstag', ['SN'], (y) => { let ms = Date.UTC(y, 10, 22); while (new Date(ms).getUTCDay() !== 3) ms -= 86400000; return iso(ms); }],
];
const stCache = new Map();
// Schlüssel des landesweiten Feiertags (ohne bundesweite) an diesem Tag im Bundesland st oder null
export function stateHoliday(d, st) {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !STATES.includes(st)) return null;
  const y = Number(d.slice(0, 4)); if (y < 1900 || y > 2200) return null;
  const k = `${y}|${st}`;
  if (!stCache.has(k)) { const e = easterSunday(y); stCache.set(k, new Map(STATE_RULES.filter(([, sts, , from]) => sts.includes(st) && !(from && from[st] && y < from[st])).map(([key, , day]) => [day(y, e), key]))); }
  return stCache.get(k).get(d) || null;
}
// bundesweiter oder (mit Bundesland) landesweiter Feiertag
export const holidayIn = (d, st) => federalHoliday(d) || (st ? stateHoliday(d, st) : null);
export const STATE_HOLIDAY_KEYS = STATE_RULES.map(([k]) => k);
