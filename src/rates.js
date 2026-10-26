// [CLAUDE] 26.10.2026 Backlog 412 (Blickwinkel „Jahreswechsel: Werkstatt-Stundensatz steigt zum 01.01.“, Migration 0086)
// Frühere Werkstatt-Stundensätze mit Gültigkeit „bis einschließlich“ (Arbeitsdatum). Bisher bewertete jede Satzänderung auch alle
// vergangenen Monate neu (Kostenbericht, Akte, Vorgang, Versicherungsfälle) – ein Jahresabschluss änderte sich nachträglich.
// Der Inhaber kann beim Ändern des Satzes den bisherigen Satz für Arbeit bis zu einem Datum behalten. Ohne diese Angabe: wie bisher.
// Kein Satz wird geschätzt: es wird nur der bisher gespeicherte, gültige Satz übernommen.
import { bad, conflict, notFound, nowIso, isCalendarDate, berlinDate, rateOf } from './util.js';

export async function listRatePeriods(env) {
  return (await env.DB.prepare(`SELECT p.valid_until, p.rate_net, p.created_at, u.display_name AS created_by_name FROM hourly_rate_periods p
    LEFT JOIN users u ON u.id=p.created_by ORDER BY p.valid_until`).all()).results;
}

// Prüfung vor dem Speichern der Einstellungen: liefert die Anweisung (für denselben Stapel wie die Einstellung) oder null
export async function keepRateStatement(env, user, body, pairs) {
  const raw = body ? body.hourly_rate_keep_until : undefined;
  if (raw === undefined || raw === null || raw === '' || raw === false) return null;
  const until = String(raw).trim().slice(0, 12);
  if (!isCalendarDate(until)) throw bad('validation', 'Bisheriger Stundensatz gilt bis: Datum im Format JJJJ-MM-TT angeben.');
  const pair = pairs.find(([k]) => k === 'workshop_hourly_rate_net');
  if (!pair) throw bad('validation', 'Bisherigen Stundensatz nur zusammen mit einem neuen Stundensatz behalten.');
  const cur = await env.DB.prepare(`SELECT (SELECT value FROM settings WHERE key='workshop_hourly_rate_net') AS rate,
    (SELECT MAX(valid_until) FROM hourly_rate_periods) AS last_until`).first();
  const old = rateOf(cur && cur.rate);
  if (old === null) throw bad('validation', 'Es ist noch kein gültiger Stundensatz gespeichert, der behalten werden kann.');
  const next = rateOf(pair[1]);
  if (next !== null && next === old) throw bad('validation', 'Der Stundensatz ist unverändert – der bisherige Satz muss nicht behalten werden.');
  if (until < '2000-01-01') throw bad('validation', 'Bisheriger Stundensatz gilt bis: Datum liegt zu weit zurück.');
  // höchstens bis Ende des nächsten Kalenderjahres (Vorab-Eintrag „ab 01.01.“ im Dezember; kein Datum Jahre im Voraus)
  if (until > `${Number(berlinDate().slice(0, 4)) + 1}-12-31`) throw bad('validation', 'Bisheriger Stundensatz gilt bis: höchstens bis Ende des nächsten Jahres.');
  if (cur.last_until && until <= cur.last_until) throw conflict('rate_period_order', 'Der bisherige Stundensatz muss nach dem letzten Satzwechsel enden.', { last_until: cur.last_until });
  // Stand-Prüfung im Stapel: nur wenn der gespeicherte Satz noch derselbe ist und kein späterer Wechsel dazukam (gleichzeitiges Speichern)
  return {
    until, rate: old,
    stmt: env.DB.prepare(`INSERT INTO hourly_rate_periods(valid_until, rate_net, created_by, created_at)
      SELECT ?1, ?2, ?3, ?4 WHERE NOT EXISTS (SELECT 1 FROM hourly_rate_periods WHERE valid_until >= ?1)
        AND (SELECT value FROM settings WHERE key='workshop_hourly_rate_net') = ?5`).bind(until, old, user.id, nowIso(), String(cur.rate)),
  };
}

// Eintrag entfernen (Korrektur eines falsch gesetzten Datums): die Arbeitszeit bis dahin fällt in den nächsten Abschnitt
export async function removeRatePeriod(env, until) {
  if (!isCalendarDate(until)) throw notFound();
  const r = await env.DB.prepare('DELETE FROM hourly_rate_periods WHERE valid_until=? RETURNING valid_until, rate_net').bind(until).first();
  if (!r) throw notFound();
  return r;
}
