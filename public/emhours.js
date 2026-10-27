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

// Erreichbarkeit jetzt: null = keine Zeiten eingetragen; sonst true/false
export function reachableNow(h, date = new Date()) {
  if (!h || !h.days) return null;
  const now = berlin(date);
  const ok = (wd, day) => h.days.includes(String(wd)) && !(h.no_holidays && federalHoliday(day));
  if (!h.from) return ok(now.wd, now.day); // ganze Tage
  if (h.to > h.from) return ok(now.wd, now.day) && now.hm >= h.from && now.hm < h.to;
  // über Mitternacht (bzw. von = bis: 24 Stunden ab Beginn)
  if (now.hm >= h.from && ok(now.wd, now.day)) return true;
  if (now.hm < h.to) { const pd = prevDay(now.day); return ok(now.wd === 1 ? 7 : now.wd - 1, pd); }
  return false;
}

// Wochentage zusammengefasst: „12345“ → [[1,5]], „1357“ → [[1,1],[3,3],[5,5],[7,7]]
export function dayRanges(days) {
  const n = String(days || '').split('').map(Number); const out = [];
  for (const d of n) { const last = out[out.length - 1]; if (last && last[1] === d - 1) last[1] = d; else out.push([d, d]); }
  return out;
}
