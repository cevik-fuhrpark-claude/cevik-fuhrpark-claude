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
