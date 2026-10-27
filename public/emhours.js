// [CLAUDE] 27.10.2026 Backlog 427 (Blickwinkel „Fahrer ruft nachts an: Lkw springt nicht an – wer hat Bereitschaft?“):
// Erreichbarkeit einer Rufnummer unter „Panne & Notfall“ – vom Betrieb eingetragen (Wochentage, optional Uhrzeit von–bis, optional
// „nicht an bundesweiten Feiertagen“). Die App gibt keine Zeiten vor: ohne Angabe gilt „keine Zeiten eingetragen“ (keine Aussage).
// Gerechnet in deutscher Zeit (Europe/Berlin), auch ohne Netz aus dem zuletzt geladenen Stand. Ende vor Beginn = über Mitternacht
// (z. B. Fr 18:00 – Sa 06:00 gehört zum Freitag). Gemeinsam von Server (Prüfung) und Oberfläche (Anzeige) genutzt.
import { holidayIn, federalHoliday, stateHoliday } from './holidays.js';

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

// Backlog 430: weitere Zeitspannen derselben Nummer (h.more, höchstens zwei) – „nicht an Feiertagen“ gilt für alle
export const MORE_MAX = 2;
export const windowsOf = (h) => (!h || !h.days ? [] : [h, ...(Array.isArray(h.more) ? h.more : [])].filter((w) => w && w.days).map((w) => ({ days: String(w.days), from: w.from || null, to: w.to || null, no_holidays: !!h.no_holidays })));

// eine Zeitspanne: erreichbar an Wochentag wd (1–7) um hm („HH:MM“)? holToday/holPrev: heute bzw. gestern bundesweiter Feiertag
function openWin(h, wd, hm, holToday, holPrev) {
  const ok = (d, hol) => h.days.includes(String(d)) && !(h.no_holidays && hol);
  if (!h.from) return ok(wd, holToday); // ganze Tage
  if (h.to > h.from) return ok(wd, holToday) && hm >= h.from && hm < h.to;
  // über Mitternacht (bzw. von = bis: 24 Stunden ab Beginn)
  if (hm >= h.from && ok(wd, holToday)) return true;
  return hm < h.to && ok(wd === 1 ? 7 : wd - 1, holPrev);
}
// Erreichbar laut Eintrag (eine der Zeitspannen) an Wochentag wd um hm?
export function openAt(h, wd, hm, holToday = false, holPrev = false) {
  return windowsOf(h).some((w) => openWin(w, wd, hm, holToday, holPrev));
}

// Erreichbarkeit jetzt: null = keine Zeiten eingetragen; sonst true/false
export function reachableNow(h, date = new Date()) {
  if (!h || !h.days) return null;
  const now = berlin(date);
  // Backlog 431: mit Bundesland zusätzlich dessen landesweite Feiertage (z. B. Allerheiligen in NRW/Bayern)
  const st = h.holiday_state || null;
  return openAt(h, now.wd, now.hm, !!holidayIn(now.day, st), !!holidayIn(prevDay(now.day), st));
}

// Backlog 432 (Blickwinkel „Fahrer steht nachts liegen, Büro ‚jetzt nicht besetzt‘ – ab wann wieder?“): nächster Beginn einer Erreichbarkeit
// laut Eintrag in deutscher Zeit, höchstens `days` Tage voraus (Feiertage wie bei „jetzt“ eingerechnet). null = keine Zeiten bzw. nicht absehbar.
// Ergebnis {day: JJJJ-MM-TT, wd, hm, in_days} (in_days 0 = heute, 1 = morgen). Nur sinnvoll, wenn gerade nicht erreichbar.
const nextDay = (d) => new Date(Date.parse(d + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
export function nextOpen(h, date = new Date(), days = 8) {
  if (!h || !h.days) return null;
  const now = berlin(date); const st = h.holiday_state || null;
  const b = [...new Set(['00:00', ...windowsOf(h).flatMap((w) => (w.from ? [w.from, w.to] : []))])].sort();
  let day = now.day; let wd = now.wd;
  for (let i = 0; i <= days; i++) {
    const hol = !!holidayIn(day, st); const holP = !!holidayIn(prevDay(day), st);
    for (const hm of b) { if (i === 0 && hm <= now.hm) continue; if (openAt(h, wd, hm, hol, holP)) return { day, wd, hm, in_days: i }; }
    day = nextDay(day); wd = wd === 7 ? 1 : wd + 1;
  }
  return null;
}

// Backlog 433 (Blickwinkel „Fahrer im Ausland, Handy in Ortszeit: ‚wieder ab 06:00‘ – deutsche Zeit oder Ortszeit?“): Die Zeiten gelten
// in deutscher Zeit. Weicht die Uhr des Geräts davon ab (andere Zeitzone, z. B. Türkei, Rumänien, Großbritannien), nennt die Anzeige beide.
// tz = Zeitzone des Geräts (Standard: laut Browser); ungültige Zeitzone → keine Aussage (null).
const fmtCache = new Map();
function hmIn(date, tz) {
  let f = fmtCache.get(tz);
  if (!f) { f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); fmtCache.set(tz, f); }
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}
export const deviceTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch { return null; } };
// {berlin, local, tz} wenn die Gerätezeit jetzt von der deutschen Zeit abweicht, sonst null
export function tzDiff(date = new Date(), tz = deviceTz()) {
  if (!tz) return null;
  let loc; try { loc = hmIn(date, tz); } catch { return null; }
  const b = berlin(date);
  return loc.day === b.day && loc.hm === b.hm ? null : { berlin: b.hm, local: loc.hm, local_day: loc.day, berlin_day: b.day, tz };
}
// deutsche Wandzeit (Tag + „HH:MM“) → Zeitpunkt (Date); bei der Zeitumstellung gilt die erste passende Angabe
export function berlinInstant(day, hm) {
  const guess = Date.parse(`${day}T${hm}:00Z`);
  for (const off of [120, 60]) { const d = new Date(guess - off * 60000); const b = berlin(d); if (b.day === day && b.hm === hm) return d; }
  return new Date(guess - 60 * 60000); // Uhrzeit fällt in die übersprungene Stunde (Ende März 02:xx) – Näherung MEZ
}
// Beginn laut nextOpen in Gerätezeit: {hm, day} oder null, wenn die Gerätezeit nicht abweicht
export function nextOpenLocal(n, tz = deviceTz(), date = new Date()) {
  if (!n || !tz) return null;
  const at = berlinInstant(n.day, n.hm);
  if (!tzDiff(at, tz) && !tzDiff(date, tz)) return null;
  try { return hmIn(at, tz); } catch { return null; }
}

// Backlog 429: Lücken einer Woche, in denen laut Eintrag keine der Nummern besetzt ist (ohne Feiertage). null = keine Aussage möglich
// (keine Nummer oder eine Nummer ohne Zeiten – die gilt als „unbekannt“); [] = lückenlos; sonst [{from:{wd,hm}, to:{wd,hm}}] (Ende ausgeschlossen),
// eine durchgehend unbesetzte Woche als [{all:true}].
export function coverageGaps(hoursList) {
  if (!hoursList.length || hoursList.some((h) => !h || !h.days)) return null;
  const b = [...new Set(['00:00', ...hoursList.flatMap((h) => windowsOf(h).flatMap((w) => (w.from ? [w.from, w.to] : [])))])].sort();
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

// Backlog 434 (Blickwinkel „Allerheiligen und Weihnachten: Büro zu – ist für die Fahrer überhaupt jemand erreichbar?“): Feiertage der nächsten
// `days` Tage, an denen wegen „nicht an Feiertagen“ zusätzliche Zeiten ohne besetzte Nummer entstehen (nur laut Eintrag; Feiertag je Nummer
// bundesweit bzw. mit deren Bundesland). null = keine Aussage (keine Nummer bzw. eine ohne Zeiten); sonst [{day, wd, hol:[{key, states}],
// ranges:[[von, bis]] (bis „24:00“ = Tagesende), all}] – je Tag die durch den Feiertag zusätzlich unbesetzten Zeiten.
export function holidayGaps(hoursList, date = new Date(), days = 60) {
  if (!hoursList.length || hoursList.some((h) => !h || !h.days)) return null;
  const hs = hoursList.filter((h) => h.no_holidays);
  if (!hs.length) return [];
  const b = [...new Set(['00:00', ...hoursList.flatMap((h) => windowsOf(h).flatMap((w) => (w.from ? [w.from, w.to] : [])))])].sort();
  const out = []; let { day, wd } = berlin(date);
  for (let i = 0; i < days; i++) {
    const prev = prevDay(day);
    const hit = hs.some((h) => holidayIn(day, h.holiday_state || null) || holidayIn(prev, h.holiday_state || null));
    if (hit) {
      const closed = (withHol) => b.map((hm) => !hoursList.some((h) => openAt(h, wd, hm, withHol && !!holidayIn(day, h.holiday_state || null), withHol && !!holidayIn(prev, h.holiday_state || null))));
      const c1 = closed(true), c0 = closed(false);
      if (c1.some((x, k) => x && !c0[k])) {
        const ranges = [];
        c1.forEach((x, k) => { if (!x || c0[k]) return; /* nur die durch den Feiertag zusätzlich unbesetzten Zeiten */ const to = b[k + 1] || '24:00'; const last = ranges[ranges.length - 1]; if (last && last[1] === b[k]) last[1] = to; else ranges.push([b[k], to]); });
        const fed = federalHoliday(day); const hol = [];
        if (fed) hol.push({ key: fed, states: [] });
        else { const m = new Map(); for (const h of hs) { const k = h.holiday_state && stateHoliday(day, h.holiday_state); if (k) m.set(k, [...new Set([...(m.get(k) || []), h.holiday_state])].sort()); } for (const [key, states] of m) hol.push({ key, states }); }
        if (!hol.length) { const pf = federalHoliday(prev); if (pf) hol.push({ key: pf, states: [], prev: true }); else for (const h of hs) { const k = h.holiday_state && stateHoliday(prev, h.holiday_state); if (k && !hol.some((x) => x.key === k)) hol.push({ key: k, states: [h.holiday_state], prev: true }); } }
        out.push({ day, wd, hol, ranges, all: ranges.length === 1 && ranges[0][0] === '00:00' && ranges[0][1] === '24:00' });
      }
    }
    day = nextDay(day); wd = wd === 7 ? 1 : wd + 1;
  }
  return out;
}

// Wochentage zusammengefasst: „12345“ → [[1,5]], „1357“ → [[1,1],[3,3],[5,5],[7,7]]
export function dayRanges(days) {
  const n = String(days || '').split('').map(Number); const out = [];
  for (const d of n) { const last = out[out.length - 1]; if (last && last[1] === d - 1) last[1] = d; else out.push([d, d]); }
  return out;
}
