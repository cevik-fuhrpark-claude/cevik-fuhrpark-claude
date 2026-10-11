// [CLAUDE] Hilfe-Suche – reine Funktionen (Browser und Tests)
export const helpNorm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/([aou])e/g, '$1').replace(/\s+/g, ' ').trim();

// Umlaut-Schreibweisen (ü/ue/u) werden auf beiden Seiten gleich behandelt – „pruefung“ findet „Prüfung“
// Abschnitte, deren Titel oder Schritte alle Suchwörter enthalten; je Abschnitt die passenden Schritte (Indizes)
export function helpMatches(sections, query) {
  const words = helpNorm(query).split(' ').filter(Boolean);
  if (!words.length) return null;
  const out = [];
  for (const s of sections) {
    const all = helpNorm(s.title + ' ' + s.steps.join(' '));
    if (!words.every((w) => all.includes(w))) continue;
    out.push({ name: s.name, title_hit: words.some((w) => helpNorm(s.title).includes(w)), steps: s.steps.map((x, i) => [i, helpNorm(x)]).filter(([, x]) => words.some((w) => x.includes(w))).map(([i]) => i) });
  }
  return out;
}
