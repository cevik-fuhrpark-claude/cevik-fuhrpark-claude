// [CLAUDE] Arbeitszeit lesen – gemeinsam für Server (`hoursNum` in src/util.js) und Oberfläche (Umrechnung unter dem Stundenfeld).
// Backlog 973: „1:30“, „1 h 30“, „1 Std. 30 Min.“, „90 min“, „2 год 15 хв“.
// Backlog 982 (Blickwinkel „Werkstatt-Tablet: Mechaniker diktiert den Arbeitsbericht“): Diktat (Tablet/PC) bzw. eine kopierte Nachricht
// liefert Zahlwörter und Brüche – „zweieinhalb Stunden“, „eine halbe Stunde“, „anderthalb Stunden“, „eine Stunde und zehn Minuten“,
// „half an hour“, „two and a half hours“, „півтори години“, „пів години“, „полтора часа“, „1½ h“ – vorher „ungültige Zahl“.
// Nur ganze Angaben werden gelesen (keine Schätzung, kein „ca.“); Dezimalzahlen („1,5 h“) bleiben beim Aufrufer (Dezimalkomma je Sprache).
// Ohne Lookbehind (ältere iOS, Backlog 794).
export const H_UNIT = '(?:h|std|stdn|stunden?|hrs?|hours?|год(?:ин[аиу]?)?|час(?:а|ов)?)';
export const M_UNIT = '(?:m|min|mins|minuten?|minutes?|хв(?:илин[аиу]?)?|мин(?:ут[аыу]?)?)';
const HM_RX = new RegExp(`^(\\d{1,2})\\s*${H_UNIT}\\.?\\s*(?:(?:und|and|і|и|та)\\s+)?(\\d{1,2})\\s*(?:${M_UNIT}\\.?)?$`, 'i');
const COLON_RX = new RegExp(`^(\\d{1,2}):(\\d{2})(?:\\s*${H_UNIT}\\.?)?$`, 'i');
const MIN_RX = new RegExp(`^(\\d{1,4})\\s*${M_UNIT}\\.?$`, 'i');
const HONLY_RX = new RegExp(`^(\\d{1,2}(?:\\.5)?)\\s*${H_UNIT}\\.?$`, 'i');

// Zahlwörter 1–12 (Stunden) und gängige Minutenangaben; Umlaute vorher als ue/oe/ss
const NUM = {
  ein: 1, eine: 1, einer: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwoelf: 12,
  fuenfzehn: 15, zwanzig: 20, fuenfundzwanzig: 25, dreissig: 30, fuenfunddreissig: 35, vierzig: 40, fuenfundvierzig: 45, fuenfzig: 50, fuenfundfuenfzig: 55,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  'один': 1, 'одна': 1, 'одну': 1, 'дві': 2, 'два': 2, 'две': 2, 'три': 3, 'чотири': 4, 'четыре': 4, "п'ять": 5, 'пять': 5, 'шість': 6, 'шесть': 6,
  'сім': 7, 'семь': 7, 'вісім': 8, 'восемь': 8, "дев'ять": 9, 'девять': 9, 'десять': 10, 'одинадцять': 11, 'одиннадцать': 11, 'дванадцять': 12, 'двенадцать': 12,
  dreizehn: 13, vierzehn: 14, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19, einen: 1, einem: 1,
  thirteen: 13, fourteen: 14, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  "п'ятнадцять": 15, 'пятнадцать': 15, 'двадцять': 20, 'двадцать': 20, 'тридцять': 30, 'тридцать': 30, 'сорок': 40, "п'ятдесят": 50, 'пятьдесят': 50,
};
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, 'двадцять': 20, 'двадцать': 20, 'тридцять': 30, 'тридцать': 30, 'сорок': 40, "п'ятдесят": 50, 'пятьдесят': 50 };
const FIVE = { five: 5, "п'ять": 5, 'пять': 5 };
const HALF_DE = /^(ein|zwei|drei|vier|fuenf|sechs|sieben|acht|neun|zehn|elf|zwoelf)einhalb$/;

const norm = (raw) => String(raw ?? '').toLowerCase().replace(/[\s ]+/g, ' ').trim()
  .replace(/[’ʼ`´]/g, "'").replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/½/g, ' ½').replace(/(\d) 1\/2/g, '$1 ½').replace(/^1\/2/, '½').replace(/([^\d\s])-([^\d\s])/g, '$1 $2').replace(/([^\d.])[.!]+$/, '$1').replace(/\s+/g, ' ').trim();

// Zahlwörter → Ziffern; „a“/„an“ nur vor „hour“
function digits(s) {
  const w = s.split(' '); const out = []; let changed = false;
  for (let i = 0; i < w.length; i++) {
    const x = w[i]; const nx = w[i + 1];
    if (TENS[x] !== undefined && nx !== undefined && FIVE[nx] !== undefined) { out.push(String(TENS[x] + FIVE[nx])); i++; changed = true; continue; }
    if ((x === 'a' || x === 'an') && nx !== undefined && /^hours?$/.test(nx)) { out.push('1'); changed = true; continue; }
    if (x === 'anderthalb' || x === 'eineinhalb') { out.push('1.5'); changed = true; continue; }
    const m = x.match(HALF_DE); if (m) { out.push(String(NUM[m[1]] + 0.5)); changed = true; continue; }
    if (NUM[x] !== undefined) { out.push(String(NUM[x])); changed = true; continue; }
    out.push(x);
  }
  return { s: out.join(' '), changed };
}

// Ergebnis: Stunden (Zahl), { minutesOver: true } bei „1:75“/„1 h 60“, sonst null (nicht als Dauer erkannt – Aufrufer prüft Dezimalzahl)
export function parseHours(raw) {
  const s0 = norm(raw); if (!s0 || s0.length > 60) return null;
  const { s } = digits(s0);
  let m;
  const hm = (h, mi) => (mi > 59 ? { minutesOver: true } : h + mi / 60);
  if ((m = s.match(COLON_RX))) return hm(Number(m[1]), Number(m[2]));
  if ((m = s.match(HM_RX))) return hm(Number(m[1]), Number(m[2]));
  if ((m = s.match(MIN_RX))) return Number(m[1]) / 60;
  if (s0 !== s || /½/.test(s)) { // nur bei Zahlwörtern/Brüchen – „2 h“ bleibt beim Aufrufer (Dezimalregeln)
    if ((m = s.match(HONLY_RX))) return Number(m[1]);
    if (/^\d{1,2}(\.5)?$/.test(s) && s0 !== s && !/^\d/.test(s0)) return Number(s);
  }
  // Brüche und feste Wendungen
  if (/^(1 )?halbe stunde$|^half (1 |a )?hour$|^(a |1 )?half hour$|^пів ?години$|^пол ?часа$/.test(s)) return 0.5;
  if (/^(1 )?viertel ?stunde$|^(a |1 )?quarter (of 1 )?hour$|^чверть години$|^четверть часа$/.test(s)) return 0.25;
  if (/^(1 )?dreiviertel ?stunde$|^3 quarters? (of 1 )?hour$/.test(s)) return 0.75;
  if (/^півтори години$|^полтора часа$/.test(s)) return 1.5;
  if ((m = s.match(/^(\d{1,2}) (?:und 1 halbe stunden?|and a half hours?|з половиною годин[иау]?|с половиной час(?:а|ов)?)$/))) return Number(m[1]) + 0.5;
  if ((m = s.match(new RegExp(`^(\\d{1,2}) ${H_UNIT} and a half$`)))) return Number(m[1]) + 0.5;
  if ((m = s.match(new RegExp(`^(?:(\\d{1,2}) ?)?½(?: ?${H_UNIT}\\.?)?$`)))) return (m[1] ? Number(m[1]) : 0) + 0.5;
  if (/^(stunde|hour|година|годину|час)$/.test(s)) return 1; // „Stunde“, „hour“, „година“, „час“ allein = 1 (nicht Mehrzahl/Abkürzung)
  return null;
}

// Backlog 982: Dauer am Anfang oder Ende eines diktierten Tätigkeitstexts („Bremsbeläge vorne getauscht, zweieinhalb Stunden“).
// Nur mit Einheit bzw. fester Wendung (eine bloße Zahl wie „2 Bremsbeläge“ ist keine Dauer). Ergebnis { hours, rest } oder null.
const UNIT_OR_FRACTION = new RegExp(`(^|[\\s\\d])${H_UNIT}\\.?$|(^|[\\s\\d])${M_UNIT}\\.?$|^${H_UNIT}|stunde|hour|годин|часа|½|half|halb|anderthalb|півтор|полтор|пів|пол`, 'i');
const DEC_H_RX = new RegExp(`^(\\d{1,2}(?:[.,]\\d{1,2})?)\\s*${H_UNIT}\\.?$`, 'i');
export function durationIn(text) {
  const raw = String(text ?? '').replace(/[\s ]+/g, ' ').trim(); if (!raw || raw.length > 300) return null;
  const words = raw.split(' ');
  const strip = (x) => x.replace(/^[\s,;:–—\-(]+|[\s,;:–—\-.!)]+$/g, '');
  for (let k = Math.min(8, words.length); k >= 1; k--) {
    for (const end of [true, false]) {
      const part = strip((end ? words.slice(-k) : words.slice(0, k)).join(' '));
      const rest = strip((end ? words.slice(0, -k) : words.slice(k)).join(' '));
      if (!part || !rest || !UNIT_OR_FRACTION.test(norm(part))) continue;
      let h = parseHours(part); let d;
      if (h === null && (d = part.match(DEC_H_RX))) h = Number(d[1].replace(',', '.'));
      if (typeof h === 'number' && h > 0 && h <= 24) return { hours: h, rest, part };
    }
  }
  return null;
}

// Backlog 983 (Blickwinkel „Werkstatt-Tablet: Mechaniker diktiert Teile und Mengen“): Mengen kommen als Zahlwort/Bruch („zwei“, „vier Liter“,
// „anderthalb Liter“, „ein halber Liter“, „two and a half litres“, „дві штуки“, „півтора літри“, „1½ l“) – vorher „ungültige Zahl“.
// Einheiten-Gruppen (Backlog 974) gemeinsam für Server (`qtyNum` in src/util.js) und Oberfläche. „ein paar“ ist keine Menge (unbestimmt) – nie geraten.
export const UNIT_GROUPS = [
  ['stk', 'stck', 'st', 'stück', 'stueck', 'pcs', 'pc', 'piece', 'pieces', 'x', '×', 'шт', 'штук', 'штука', 'штуки', 'штуку'],
  ['l', 'ltr', 'liter', 'litre', 'litres', 'liters', 'л', 'літр', 'літри', 'літрів', 'літра', 'литр', 'литра', 'литров'],
  ['m', 'mtr', 'meter', 'metre', 'metres', 'meters', 'м', 'метр', 'метри', 'метрів', 'метра', 'метров'],
  ['kg', 'kilo', 'kilogramm', 'кг'],
  ['satz', 'sätze', 'set', 'sets', 'kit', 'комплект', 'компл', 'комплекти', 'комплекта'],
  ['paar', 'pair', 'pairs', 'пара', 'пари'],
];
const UNIT_CANON = ['Stk', 'l', 'm', 'kg', 'Satz', 'Paar'];
export const unitKey = (u) => String(u || '').trim().toLowerCase().replace(/\.$/, '');
export const unitGroup = (u) => { const k = unitKey(u); return UNIT_GROUPS.find((g) => g.includes(k)) || null; };
// Einheit in Schreibweise der App („Liter“ → „l“, „штуки“ → „Stk“); unbekannt → null
export const unitCanon = (u) => { const g = unitGroup(u); return g ? UNIT_CANON[UNIT_GROUPS.indexOf(g)] : null; };

const wkey = (x) => String(x).toLowerCase().replace(/[’ʼ`´]/g, "'").replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
// Zahl am Anfang einer Wortfolge (nur Zahlwörter/Brüche – Ziffern bleiben beim Aufrufer, Dezimalkomma je Sprache). Ergebnis { n, used } oder null.
function qtyHead(w) {
  const k = w.map(wkey); let m;
  if (k[0] === 'ein' || k[0] === 'eine' || k[0] === 'einen' || k[0] === 'einem' || k[0] === 'one' || k[0] === 'a' || k[0] === 'an') {
    if (k[1] === 'paar') return null; // „ein paar Schrauben“ = einige
    if (k[1] !== undefined && /^halbe[rsn]?$/.test(k[1])) return { n: 0.5, used: 2 };
    if (k[0] === 'a' || k[0] === 'an') return null;
  }
  if (k[0] === 'half' && (k[1] === 'a' || k[1] === 'an')) return { n: 0.5, used: 2 };
  if (k[0] === 'anderthalb' || k[0] === 'eineinhalb' || k[0] === 'півтора' || k[0] === 'півтори' || k[0] === 'полтора' || k[0] === 'полторы') return { n: 1.5, used: 1 };
  if ((m = k[0] && k[0].match(HALF_DE))) return { n: NUM[m[1]] + 0.5, used: 1 };
  if (/^(пів|пол)$/.test(k[0] || '') && k[1] !== undefined && unitGroup(k[1].replace(/[.,;:]+$/, ''))) return { n: 0.5, used: 1 }; // „пів літра“
  if ((m = (k[0] || '').match(/^(\d{1,4})?½$/))) return { n: (m[1] ? Number(m[1]) : 0) + 0.5, used: 1 };
  let n = null; let used = 0;
  if (TENS[k[0]] !== undefined && k[1] !== undefined && FIVE[k[1]] !== undefined) { n = TENS[k[0]] + FIVE[k[1]]; used = 2; }
  else if (NUM[k[0]] !== undefined) { n = NUM[k[0]]; used = 1; }
  else if (/^\d{1,4}$/.test(k[0] || '') && k[1] === '½') return { n: Number(k[0]) + 0.5, used: 2 };
  if (n === null) return null;
  // „two and a half“, „zwei und eine halbe“ (Einheit folgt), „дві з половиною“
  if (k[used] === 'and' && k[used + 1] === 'a' && k[used + 2] === 'half') return { n: n + 0.5, used: used + 3 };
  if (k[used] === 'und' && /^(eine|ein)$/.test(k[used + 1] || '') && /^halbe[rsn]?$/.test(k[used + 2] || '')) return { n: n + 0.5, used: used + 3 };
  if (/^(з|с)$/.test(k[used] || '') && /^половин(ою|ой)$/.test(k[used + 1] || '')) return { n: n + 0.5, used: used + 2 };
  return { n, used };
}
const qwords = (raw) => String(raw ?? '').replace(/[\s\u00a0]+/g, ' ').trim().replace(/(\d)½/g, '$1 ½').replace(/(\d) 1\/2(?=\s|$)/g, '$1 ½').replace(/^1\/2(?=\s|$)/, '½').split(' ').filter(Boolean);
const unitTok = (x) => (x === undefined ? null : unitGroup(x.replace(/[.,;:]+$/, '')) ? x.replace(/[.,;:]+$/, '') : null);

// Menge als Zahlwort/Bruch mit optionaler Einheit („zwei“, „vier Liter“, „anderthalb l“, „half a litre“, „пів літра“).
// Ergebnis { n, unit } (unit = getippter Text oder null) oder null, wenn es keine Wort-Menge ist.
export function parseQty(raw) {
  const w = qwords(raw); if (!w.length || w.length > 6) return null;
  const h = qtyHead(w); if (!h) return null;
  const rest = w.slice(h.used);
  if (!rest.length) return { n: h.n, unit: null };
  if (rest.length === 1) { const u = rest[0].replace(/\.$/, ''); return { n: h.n, unit: u }; }
  return null;
}

// Menge am Anfang oder Ende eines diktierten Teilenamens („zwei Bremsscheiben vorne“, „4 Liter Motoröl 10W-40“, „Bremsbelag-Satz, 2 Stück“,
// „Ölfilter x2“). Ziffer am Anfang nur vor einem Wort mit mindestens 3 Buchstaben („24 V Glühlampe“, „10 mm Schraube“ sind keine Mengen);
// am Ende nur mit Einheit bzw. „x2“. Ergebnis { n, unit, part, rest } oder null.
export function qtyIn(text) {
  const raw = String(text ?? '').replace(/[\s\u00a0]+/g, ' ').trim(); if (!raw || raw.length > 200) return null;
  const w = raw.split(' '); if (w.length < 2) return null;
  const clean = (x) => x.replace(/^[\s,;:–—\-(]+|[\s,;:–—\-)]+$/g, '');
  const word3 = (x) => x !== undefined && /^[A-Za-zÄÖÜäöüßА-Яа-яІіЇїЄєҐґ'’]{3,}/.test(x);
  // Anfang: Zahlwort/Bruch oder Ziffer, optional Einheit bzw. „x“
  let head = qtyHead(qwords(w.slice(0, 4).join(' '))); let used; let n;
  let hw = w;
  if (/½/.test(w[0]) || /^\d{1,4} 1\/2$/.test(w.slice(0, 2).join(' '))) { hw = qwords(raw); head = qtyHead(hw); }
  if (head) { n = head.n; used = head.used; }
  else { let m; if ((m = w[0].match(/^(\d{1,3})(?:x|×)?$/i))) { n = Number(m[1]); used = 1; if (w[1] && /^(x|×)$/i.test(w[1])) used = 2; } }
  if (n !== undefined && n > 0) {
    let unit = null; if (unitTok(hw[used])) { unit = unitTok(hw[used]); used++; }
    const part = clean(hw.slice(0, used).join(' '));
    if (/^(of)$/i.test(hw[used] || '') && unit) used++; // „2 litres of oil“
    const rest = clean(hw.slice(used).join(' '));
    if (rest && word3(rest.split(' ')[0])) return { n, unit, part, rest };
  }
  // Ende: „…, 2 Stück“, „… zwei Liter“, „… x2“, „… 2x“
  for (const k of [3, 2, 1]) {
    if (w.length <= k) continue;
    const tail = clean(w.slice(-k).join(' ')); const rest = clean(w.slice(0, -k).join(' '));
    if (!rest || !word3(rest)) continue;
    let m;
    if (k === 1 && (m = tail.match(/^(?:x|×)\s*(\d{1,3})$|^(\d{1,3})\s*(?:x|×)$/i))) return { n: Number(m[1] || m[2]), unit: null, part: tail, rest };
    const q = parseQty(tail);
    if (q && q.unit && unitGroup(q.unit)) return { n: q.n, unit: q.unit, part: tail, rest };
    if ((m = tail.match(/^(\d{1,4}(?:[.,]\d{1,3})?) ?([^\s\d]{1,12})$/)) && unitGroup(m[2].replace(/\.$/, ''))) return { n: Number(m[1].replace(',', '.')), unit: m[2].replace(/\.$/, ''), part: tail, rest };
  }
  return null;
}
