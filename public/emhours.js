// [CLAUDE] 27.10.2026 Backlog 427 (Blickwinkel „Fahrer ruft nachts an: Lkw springt nicht an – wer hat Bereitschaft?“):
// Erreichbarkeit einer Rufnummer unter „Panne & Notfall“ – vom Betrieb eingetragen (Wochentage, optional Uhrzeit von–bis, optional
// „nicht an bundesweiten Feiertagen“). Die App gibt keine Zeiten vor: ohne Angabe gilt „keine Zeiten eingetragen“ (keine Aussage).
// Gerechnet in deutscher Zeit (Europe/Berlin), auch ohne Netz aus dem zuletzt geladenen Stand. Ende vor Beginn = über Mitternacht
// (z. B. Fr 18:00 – Sa 06:00 gehört zum Freitag). Gemeinsam von Server (Prüfung) und Oberfläche (Anzeige) genutzt.
import { federalHoliday } from './holidays.js';

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isHm = (s) => typeof s === 'string' && HM.test(s);

// Wochentage als Ziffernfolge ISO (1 = Montag … 7 = Sonntag), sortiert, ohne Doppel; ungültig → null
export function normDays(v) {
  const arr = Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split('') : null;
  if (!arr) return null;
  if (arr.some((d) => !/^[1-7]$/.test(d))) return null;
  return [...new Set(arr)].sort().join('');
}

const PARTS = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' });
const WD = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
function berlin(date) {
  const p = Object.fromEntries(PARTS.formatToParts(date).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, wd: WD[p.weekday], hm: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}
const prevDay = (d) => new Date(Date.parse(d + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);

// Erreichbar an Wochentag wd (1–7) um hm („HH:MM“)? holToday/holPrev: heute bzw. gestern bundesweiter Feiertag (für „nicht an Feiertagen“)
export function openAt(h, wd, hm, holToday = false, holPrev = false) {
  const ok = (d, hol) => h.days.includes(String(d)) && !(h.no_holidays && hol);
  if (!h.from) return ok(wd, holToday); // ganze Tage
  if (h.to > h.from) return ok(wd, holToday) && hm >= h.from && hm < h.to;
  // über Mitternacht (bzw. von = bis: 24 Stunden ab Beginn)
  if (hm >= h.from && ok(wd, holToday)) return true;
  return hm < h.to && ok(wd === 1 ? 7 : wd - 1, holPrev);
}

// Erreichbarkeit jetzt: null = keine Zeiten eingetragen; sonst true/false
export function reachableNow(h, date = new Date()) {
  if (!h || !h.days) return null;
  const now = berlin(date);
  return openAt(h, now.wd, now.hm, !!federalHoliday(now.day), !!federalHoliday(prevDay(now.day)));
}

// Backlog 429: Lücken einer Woche, in denen laut Eintrag keine der Nummern besetzt ist (ohne Feiertage). null = keine Aussage möglich
// (keine Nummer oder eine Nummer ohne Zeiten – die gilt als „unbekannt“); [] = lückenlos; sonst [{from:{wd,hm}, to:{wd,hm}}] (Ende ausgeschlossen),
// eine durchgehend unbesetzte Woche als [{all:true}].
export function coverageGaps(hoursList) {
  if (!hoursList.length || hoursList.some((h) => !h || !h.days)) return null;
  const b = [...new Set(['00:00', ...hoursList.flatMap((h) => (h.from ? [h.from, h.to] : []))])].sort();
  const seg = [];
  for (let wd = 1; wd <= 7; wd++) for (const hm of b) seg.push({ wd, hm, open: hoursList.some((h) => openAt(h, wd, hm)) });
  if (seg.every((x) => !x.open)) return [{ all: true }];
  if (seg.every((x) => x.open)) return [];
  const k = seg.findIndex((x) => x.open); const rot = [...seg.slice(k), ...seg.slice(0, k)]; // bei einem offenen Abschnitt beginnen (Lücke über Sonntag→Montag bleibt eine)
  const gaps = [];
  for (let i = 0; i < rot.length; i++) {
    if (rot[i].open || (i > 0 && !rot[i - 1].open)) continue;
    let j = i; while (!rot[(j + 1) % rot.length].open) j++;
    const end = rot[(j + 1) % rot.length];
    gaps.push({ from: { wd: rot[i].wd, hm: rot[i].hm }, to: { wd: end.wd, hm: end.hm } });
  }
  return gaps.sort((x, y) => x.from.wd - y.from.wd || (x.from.hm < y.from.hm ? -1 : 1));
}

// Wochentage zusammengefasst: „12345“ → [[1,5]], „1357“ → [[1,1],[3,3],[5,5],[7,7]]
export function dayRanges(days) {
  const n = String(days || '').split('').map(Number); const out = [];
  for (const d of n) { const last = out[out.length - 1]; if (last && last[1] === d - 1) last[1] = d; else out.push([d, d]); }
  return out;
}
