// [CLAUDE] Bußgelder & Zeugenfragebögen: Erfassung, Fahrerermittlung zum Tatzeitpunkt mit Nachweis, Fristen, Information des Fahrers
import { icsLang } from '../public/ics-texts.js';
import { findingText as fm } from '../public/finding-messages.js';
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, num, oneOf, sha256Hex, berlinDate, berlinDateTime, berlinLocalToIso, isCalendarDate, pickVehicleByPlate, normPlate, PLATE_KEY_SQL, quoteCell, pointDec } from './util.js';
import { notifyUsers, nt } from './notify.js';
import { siteSelection } from './reports.js';

export const FINE_KINDS = ['anhoerung', 'zeugenfragebogen', 'bussgeldbescheid', 'verwarnung', 'maut', 'sonstiges'];
export const OFFENSES = ['geschwindigkeit', 'abstand', 'parken', 'rotlicht', 'lenk_ruhezeit', 'ladung', 'maut', 'handy', 'sonstiges'];
export const FINE_STATUSES = ['eingegangen', 'fahrer_ermittelt', 'fahrer_informiert', 'beantwortet', 'bezahlt', 'eingestellt', 'erledigt'];
const BASES = ['zuordnung', 'tourenplan', 'telematik', 'fahrerangabe', 'manuell'];
const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';

function shape(f, user) {
  if (isMgr(user)) return f;
  if (user.role === 'viewer') {
    // Lesezugriff (z. B. Buchhaltung/Steuerberatung): ohne Fahreridentität und interne Notiz – wie der CSV-Export ohne with_driver
    const { driver_id, driver_name, driver_name_note, driver_evidence, driver_confirmed_by, note, created_by, ...rest } = f;
    return { ...rest, driver_hidden: !!(driver_id || driver_name_note) };
  }
  // Fahrer: nur eigene, ohne interne Nachweise
  const { driver_evidence, driver_confirmed_by, created_by, note, ...rest } = f;
  return rest;
}

// Obergrenze für Fristen: heute + 20 Jahre (wie Fahrerakte/Hinweise)
const maxDueDay = () => String(Number(berlinDate().slice(0, 4)) + 20) + berlinDate().slice(4);

// Lkw (aktiv, nicht ruhend), an dem das Kennzeichen als Anhänger-Kennzeichen laut Stammliste steht – genau einer, sonst null (21.10.2026)
function trailerOf(vehicles, plate) {
  const k = normPlate(plate); if (!k) return null;
  const hits = vehicles.filter((v) => v.trailer_plate && normPlate(v.trailer_plate) === k && v.active && !v.eval_excluded);
  return hits.length === 1 ? hits[0] : null;
}

// Kennzeichen laut Schreiben ist ein früheres Kennzeichen (Umkennzeichnung, Backlog 257b, Migration 0082): genau ein Fahrzeug trug es bis nach
// der Tatzeit (Zeitpunkt der Änderung in der App) und heute trägt es keines → dieses Fahrzeug; sonst null (manuelle Klärung wie bisher)
function formerPick(list, plate, offenseAt) {
  const k = normPlate(plate); if (!k || !offenseAt) return null;
  const rows = list.filter((r) => r.valid_until > offenseAt && normPlate(r.plate) === k);
  const ids = [...new Set(rows.map((r) => r.vehicle_id))];
  return ids.length === 1 ? { vehicle_id: ids[0], until: rows.filter((r) => r.vehicle_id === ids[0]).map((r) => r.valid_until).sort()[0] } : null;
}
async function formerPlateVehicle(env, plate, offenseAt) {
  if (!normPlate(plate) || !offenseAt) return null;
  return formerPick((await env.DB.prepare('SELECT vehicle_id, plate, valid_until FROM vehicle_plates WHERE valid_until > ?').bind(offenseAt).all()).results, plate, offenseAt);
}

export async function listFines(env, user, envName, query) {
  return (await listFinesSel(env, user, envName, query)).rows;
}

// Liste mit Standortfilter (Fahrzeug-Standort laut Fahrzeugstamm, Schreibweise egal; Schreiben ohne erkanntes Fahrzeug = „ohne“).
// Auswahl aus den Fahrzeugen der Schreiben (wie Mängelstatistik); Fahrer: keine Standortauswahl.
// max: Liste 500, CSV/Kalender bis 5000 (die jüngsten; truncated = es gibt ältere)
export async function listFinesSel(env, user, envName, query = {}, max = 500) {
  let rows; let sel = null; let truncated = false;
  if (isMgr(user) || user.role === 'viewer') {
    const open = query.status === 'open';
    // Standort und „offen“ über alle Schreiben auswählen, erst dann begrenzen (18.10.2026: Filter wirkten nach der 500er-Grenze –
    // älteres offenes Schreiben eines Standorts fehlte in der Standortliste und in „Heute zu tun“)
    const idx = (await env.DB.prepare(`SELECT f.id, f.response_due, v.site AS vehicle_site FROM fines f LEFT JOIN vehicles v ON v.id=f.vehicle_id
      WHERE f.environment=? ${open ? "AND f.status NOT IN ('bezahlt','eingestellt','erledigt')" : ''}
      ORDER BY f.created_at DESC, f.rowid DESC`).bind(envName).all()).results;
    sel = siteSelection(idx.map((r) => ({ site: r.vehicle_site })), query.site);
    let pick = sel.site ? idx.filter((r) => sel.match(r.vehicle_site)) : idx;
    // offen: die mit der nächsten Frist behalten (sonst fiele ein bald fälliges älteres Schreiben weg); sonst die jüngsten
    if (open) pick = [...pick].sort((x, y) => (x.response_due === null) - (y.response_due === null) || (x.response_due || '').localeCompare(y.response_due || ''));
    if (pick.length > max) { pick = pick.slice(0, max); truncated = true; }
    rows = pick.length ? (await env.DB.prepare(`SELECT f.*, v.plate, v.site AS vehicle_site, u.display_name AS driver_name FROM fines f LEFT JOIN vehicles v ON v.id=f.vehicle_id LEFT JOIN users u ON u.id=f.driver_id
      WHERE f.environment=? AND f.id IN (SELECT value FROM json_each(?))`).bind(envName, JSON.stringify(pick.map((r) => r.id))).all()).results : [];
    // offene zuerst, dann nach Frist (20.10.2026: erledigte mit alter Frist standen vor offenen)
    const closed = (r) => (['bezahlt', 'eingestellt', 'erledigt'].includes(r.status) ? 1 : 0);
    rows.sort((x, y) => closed(x) - closed(y) || (x.response_due === null) - (y.response_due === null) || (x.response_due || '').localeCompare(y.response_due || '') || (y.created_at || '').localeCompare(x.created_at || ''));
  } else if (user.role === 'driver') {
    rows = (await env.DB.prepare(`SELECT f.*, v.plate FROM fines f LEFT JOIN vehicles v ON v.id=f.vehicle_id
      WHERE f.environment=? AND f.driver_id=? AND f.driver_informed_at IS NOT NULL ORDER BY f.offense_at DESC`).bind(envName, user.id).all()).results;
  } else throw forbidden();
  return { rows: rows.map((r) => shape(r, user)), site: sel ? sel.site : null, site_options: sel ? sel.options : [], truncated };
}

async function loadFine(env, user, envName, id) {
  const f = await env.DB.prepare(`SELECT f.*, v.plate FROM fines f LEFT JOIN vehicles v ON v.id=f.vehicle_id WHERE f.id=? AND f.environment=?`).bind(id, envName).first();
  if (!f) throw notFound('Vorgang nicht gefunden.');
  if (isMgr(user) || user.role === 'viewer') return f;
  if (user.role === 'driver' && f.driver_id === user.id && f.driver_informed_at) return f;
  throw notFound('Vorgang nicht gefunden.');
}

// Mögliche Fahrer zum Tatzeitpunkt – nur aus belegten Quellen, keine Automatik-Zuordnung
// Schreiben zum Anhänger-Kennzeichen (Blitzer von hinten): Fahrer werden der fest gekoppelten Zugmaschine zugeordnet (Entscheidung 10.10.2026:
// Kopplung laut Stammliste maßgeblich) – Kandidaten auch von dort (17.10.2026: vorher keiner angeboten)
export const fineVehiclesSql = (vid) => `SELECT ${vid} UNION SELECT x.id FROM vehicles x JOIN vehicles v ON v.id=${vid} WHERE v.kind='anhaenger' AND x.kind='lkw' AND x.id<>v.id
  AND ${PLATE_KEY_SQL('x.trailer_plate')}<>'' AND ${PLATE_KEY_SQL('x.trailer_plate')}=${PLATE_KEY_SQL('v.plate')}`;
export async function driverCandidates(env, envName, f) {
  if (!f.vehicle_id) return [];
  const out = [];
  const assigned = (await env.DB.prepare(`SELECT d.user_id, u.display_name, d.valid_from, d.valid_to, d.evidence, d.vehicle_id, vv.plate FROM driver_vehicles d JOIN users u ON u.id=d.user_id JOIN vehicles vv ON vv.id=d.vehicle_id
    WHERE d.vehicle_id IN (${fineVehiclesSql('?1')}) AND d.environment=?2 AND d.valid_from <= ?3 AND (d.valid_to IS NULL OR d.valid_to > ?3)`).bind(f.vehicle_id, envName, f.offense_at).all()).results;
  for (const a of assigned) {
    const via = a.vehicle_id !== f.vehicle_id ? ` – Zugmaschine ${a.plate}` : '';
    if (out.some((o) => o.user_id === a.user_id && o.basis === 'zuordnung')) continue;
    // beendete Zuordnung: Ende im Aktenvermerk nennen (23.10.2026, Teilagent Fahrerwechsel – vorher klang „seit …“ nach heute noch zugeordnet)
    const until = a.valid_to ? ` bis ${berlinDateTime(a.valid_to).slice(0, 10)}` : '';
    out.push({ user_id: a.user_id, display_name: a.display_name, basis: 'zuordnung', evidence: `Fahrzeugzuordnung seit ${berlinDateTime(a.valid_from).slice(0, 10)}${until}${via}${a.evidence ? ' (' + a.evidence + ')' : ''}`, since: berlinDate(a.valid_from), ...(a.valid_to ? { until: berlinDate(a.valid_to) } : {}), assign_evidence: a.evidence || null, ...(via ? { via_plate: a.plate } : {}) });
  }
  const day = berlinDate(f.offense_at);
  const checks = (await env.DB.prepare(`SELECT i.performed_by AS user_id, u.display_name, i.created_at, i.vehicle_id, vv.plate FROM inspections i JOIN users u ON u.id=i.performed_by JOIN vehicles vv ON vv.id=i.vehicle_id
    WHERE i.vehicle_id IN (${fineVehiclesSql('?1')}) AND i.environment=?2 AND u.environment=?2 AND i.kind='abfahrt' AND u.role='driver' AND i.created_at BETWEEN ?3 AND ?4`)
    .bind(f.vehicle_id, envName, new Date(Date.parse(day + 'T00:00:00Z') - 4 * 3600000).toISOString(), new Date(Date.parse(day + 'T23:59:59Z') + 2 * 3600000).toISOString()).all()).results;
  for (const c of checks) {
    if (berlinDate(c.created_at) !== day) continue;
    if (out.some((o) => o.user_id === c.user_id && o.basis === 'manuell')) continue; // je Person einmal (mehrere Kontrollen am Tattag)
    // Kontrolle an der gekoppelten Zugmaschine: im Nachweis nennen (wie bei Zuordnungen) – sonst behauptete der Aktenvermerk eine Kontrolle am Anhänger (20.10.2026)
    const via = c.vehicle_id !== f.vehicle_id ? ` – Zugmaschine ${c.plate}` : '';
    out.push({ user_id: c.user_id, display_name: c.display_name, basis: 'manuell', evidence: `Abfahrtskontrolle am Tattag ${berlinDateTime(c.created_at).slice(-5)} Uhr${via}`, check_at: c.created_at, ...(via ? { via_plate: c.plate } : {}) });
  }
  return out;
}

export async function fineDetail(env, user, envName, id) {
  const f = await loadFine(env, user, envName, id);
  const events = (await env.DB.prepare(`SELECT e.*, u.display_name AS actor_name FROM fine_events e LEFT JOIN users u ON u.id=e.actor_id WHERE fine_id=? ORDER BY created_at`).bind(id).all()).results;
  const files = (await env.DB.prepare('SELECT id, filename, content_type, size, created_at FROM files WHERE fine_id=? ORDER BY created_at').bind(id).all()).results;
  const driver = f.driver_id ? await env.DB.prepare('SELECT display_name, active, role, environment FROM users WHERE id=?').bind(f.driver_id).first() : null;
  const out = { fine: shape(f, user), files, driver_name: user.role === 'viewer' ? null : driver?.display_name || f.driver_name_note || null };
  // „Fahrer informiert“, Quittung offen, Konto inzwischen deaktiviert bzw. Rolle/Umgebung gewechselt: die Quittung kann nicht mehr kommen
  // (Fahrer sieht das Schreiben nicht mehr) – Hinweis für die Leitung statt stillem Warten (22.10.2026, Teilagent Rollenwechsel)
  // 23.10.2026 (Teilagent Fahrerwechsel): auch schon bei „Fahrer ermittelt“ – ausgeschiedener Fahrer war zur Tatzeit richtig, „Fahrer informieren“
  // scheiterte dann immer mit „neu ermitteln“; jetzt Hinweis statt Knopf
  const unreachable = !!(isMgr(user) && ['fahrer_ermittelt', 'fahrer_informiert'].includes(f.status) && f.driver_id && !f.driver_ack_at && driver
    && !(driver.active && driver.role === 'driver' && driver.environment === envName));
  if (unreachable) out.driver_unreachable = true;
  // nicht zugeordnet, weil das Kennzeichen an mehreren aktiven Fahrzeugen steht → Fahrzeugstamm bereinigen statt „Fremdfahrzeug?“ (20.10.2026)
  if (!f.vehicle_id && f.plate_in_letter) {
    const vs = (await env.DB.prepare('SELECT id, plate, active, eval_excluded, trailer_plate FROM vehicles').all()).results;
    const pk = pickVehicleByPlate(vs, f.plate_in_letter); out.vehicle_ambiguous = pk.ambiguous;
    // 21.10.2026: Fahrzeugstamm inzwischen bereinigt/ergänzt → Kennzeichen jetzt eindeutig (Übernahme per „Ändern“, nicht automatisch);
    // nur als „Anhänger-Kennzeichen“ an einem Lkw bekannt → Hinweis auf die Zugmaschine (Anhänger im Fahrzeugstamm anlegen)
    if (pk.vehicle) out.vehicle_matchable = { id: pk.vehicle.id, plate: pk.vehicle.plate };
    else if (!pk.ambiguous) { const tr = trailerOf(vs, f.plate_in_letter); if (tr) out.trailer_of = { id: tr.id, plate: tr.plate }; }
  }
  if (isMgr(user)) {
    out.events = events;
    // bestätigte bzw. beim Zurücksetzen abgelöste Fahrer im Verlauf mit Namen (20.10.2026: „bisheriger Fahrer bleibt im Verlauf“ galt nur in der Datenbank)
    const evIds = new Set();
    for (const e of events) { let p = null; try { p = e.payload ? JSON.parse(e.payload) : null; } catch {} if (p && p.driver_id) evIds.add(p.driver_id); if (p && p.driver_reset && p.driver_reset.driver_id) evIds.add(p.driver_reset.driver_id); }
    out.event_driver_names = evIds.size ? Object.fromEntries((await env.DB.prepare('SELECT id, display_name FROM users WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify([...evIds])).all()).results.map((u) => [u.id, u.display_name])) : {};
    out.candidates = await driverCandidates(env, envName, f);
    out.allowed_actions = fineActions(user, f).filter((a) => !(a === 'inform_driver' && unreachable));
  } else {
    out.allowed_actions = user.role === 'driver' && !f.driver_ack_at ? ['driver_ack'] : [];
  }
  return out;
}

function fineActions(user, f) {
  if (!isMgr(user)) return [];
  const a = ['update', 'set_status', 'upload'];
  if (['eingegangen', 'fahrer_ermittelt'].includes(f.status)) a.push('confirm_driver');
  if (f.status === 'fahrer_ermittelt' && f.driver_id) a.push('inform_driver');
  return a;
}

// Tatzeit wie im Schreiben (Berliner Ortszeit, ohne Zeitzone) → UTC; Angaben mit Zeitzone werden nur vereinheitlicht.
// Gemeinsam für Anlegen und „Angaben ändern“ (23.10.2026: Tatzeit war nicht korrigierbar, „update“ meldete still „unverändert“)
function parseOffenseAt(v) {
  const offenseRaw = berlinLocalToIso(str(v, { required: true, max: 30, field: 'Tatzeit' }));
  // nur ISO-Schreibweisen (ohne Zone = Berlin, sonst mit Z/±hh:mm) – freies Datumsformat („10/01/2026 14:30“) wäre als UTC gelesen worden
  if (!offenseRaw || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/i.test(offenseRaw) || Number.isNaN(Date.parse(offenseRaw))
    || !isCalendarDate(offenseRaw.slice(0, 10))) throw bad('validation', 'Tatzeit ungültig.'); // 2026-02-30T10:00Z rollte sonst still auf den 02.03.
  const offenseAt = new Date(offenseRaw).toISOString();
  // Tippfehler im Jahr (2062): Fahrerermittlung „zum Tatzeitpunkt“ lieferte sonst die heutige Zuordnung (17.10.2026); 5 Min. Uhrenspiel
  if (Date.parse(offenseAt) > Date.now() + 5 * 60000) throw bad('validation', 'Tatzeit liegt in der Zukunft.');
  if (offenseAt < '2000-01-01') throw bad('validation', 'Tatzeit vor 2000 – bitte Jahr prüfen.'); // Tippfehler 1926 (18.10.2026), wie Versicherungsfälle
  return offenseAt;
}

export async function createFine(env, user, envName, body) {
  if (!isMgr(user)) throw forbidden();
  const kind = oneOf(body.kind, FINE_KINDS, 'Art');
  const offense = oneOf(body.offense_type, OFFENSES, 'Verstoß');
  const offenseAt = parseOffenseAt(body.offense_at);
  const plate = str(body.plate_in_letter, { required: true, max: 20, field: 'Kennzeichen' }).toUpperCase();
  const due = str(body.response_due, { max: 10, field: 'Antwortfrist' });
  if (due && !isCalendarDate(due)) throw bad('validation', 'Frist im Format JJJJ-MM-TT.');
  if (due && due < '2000-01-01') throw bad('validation', 'Frist vor 2000 – bitte Jahr prüfen.');
  if (due && due > maxDueDay()) throw bad('validation', 'Frist: Datum außerhalb des zulässigen Bereichs.'); // Jahres-Tippfehler 2062: nie fällig (18.10.2026), Grenze wie Fahrerakte
  // Frist vor der Tat: Tippfehler im Jahr – Agent meldete sofort „überfällig“ (18.10.2026)
  if (due && due < berlinDate(offenseAt)) throw bad('validation', 'Frist liegt vor der Tatzeit – bitte Jahr prüfen.');
  // alle Eingaben vor dem Hochzählen der Bußgeldnummer prüfen (18.10.2026: jeder Tippfehler verbrauchte eine Nummer)
  const location = str(body.location, { max: 200, field: 'Ort' }); const amount = num(body.amount_eur, { min: 0, max: 1e6, field: 'Betrag', nullable: true, cents: true, decimalPoint: pointDec(user) }); const fnote = str(body.note, { max: 2000, field: 'Bemerkung' });
  // bei gleichem Kennzeichen zählt das aktive bewertete vor dem ruhenden vor dem außer Betrieb genommenen, sonst mehrdeutig = keine Zuordnung
  // (Fahrerermittlung über ein falsches Fahrzeug wäre schlimmer als eine manuelle Klärung). Außer Betrieb genommene zählen mit: das Schreiben
  // kommt oft Wochen nach der Tat, wenn das Fahrzeug schon verkauft ist (vorher kein Fahrzeug, kein Fahrer – 17.10.2026)
  const pick = pickVehicleByPlate((await env.DB.prepare('SELECT id, plate, active, eval_excluded FROM vehicles').all()).results, plate);
  // kein Fahrzeug trägt das Kennzeichen (mehr): zur Tatzeit eindeutig früheres Kennzeichen eines Fahrzeugs (Backlog 257b) → dieses Fahrzeug
  const former = !pick.vehicle && !pick.ambiguous ? await formerPlateVehicle(env, plate, offenseAt) : null;
  const veh = pick.vehicle || (former ? { id: former.vehicle_id } : null);
  const reference = str(body.reference, { max: 80, field: 'Aktenzeichen' });
  const authority = str(body.authority, { required: true, max: 200, field: 'Behörde' });
  // Idempotenzschlüssel je Formular: Doppelklick/Netzwiederholung ergibt denselben Vorgang statt eines zweiten (18.10.2026) –
  // wichtig bei Schreiben ohne Aktenzeichen, die keine Dublettenprüfung haben. Geprüft vor allem anderen (auch vor der Aktenzeichen-Dublette
  // und vor dem Hochzählen der Nummer), damit die Wiederholung einer erfolgreichen Anlage nicht als „Aktenzeichen bereits erfasst“ scheitert.
  const rk = body.request_key;
  if (rk !== undefined && rk !== null && rk !== '' && (typeof rk !== 'string' || rk.length > 80 || !/^[\w.-]+$/.test(rk))) throw bad('validation', 'request_key: ungültiger Wert.');
  const rkey = rk ? 'fine:' + rk : null;
  const byKey = async () => {
    if (!rkey) return null;
    const prev = await env.DB.prepare('SELECT id, fine_no, vehicle_id, environment, created_by FROM fines WHERE request_key=?').bind(rkey).first();
    if (!prev) return null;
    if (prev.environment !== envName || prev.created_by !== user.id) throw conflict('fine_key_reused', 'request_key wurde bereits für einen anderen Bußgeldvorgang verwendet.');
    // mehrdeutiges Kennzeichen auch bei der Wiederholung melden (19.10.2026: App zeigte sonst „Fahrzeug unbekannt“)
    const ev = prev.vehicle_id ? null : await env.DB.prepare(`SELECT payload FROM fine_events WHERE fine_id=? AND action='create'`).bind(prev.id).first();
    let amb = false; try { amb = !!(ev && JSON.parse(ev.payload || '{}').vehicle_ambiguous); } catch { /* alter Eintrag */ }
    return { id: prev.id, fine_no: prev.fine_no, vehicle_matched: !!prev.vehicle_id, ...(amb ? { vehicle_ambiguous: true } : {}), duplicate: true };
  };
  const again = await byKey();
  if (again) return again;
  const dupCheck = async () => {
    if (!reference) return;
    const dup = await env.DB.prepare('SELECT id, fine_no FROM fines WHERE environment=? AND reference=? AND authority=?').bind(envName, reference, authority).first();
    if (dup) throw conflict('duplicate_fine', `Aktenzeichen bereits erfasst (${dup.fine_no}).`, { id: dup.id });
  };
  await dupCheck();
  // Berliner Kalenderjahr aus demselben Zeitpunkt wie created_at (22.10.2026: vorher vor dem Zählerzugriff bestimmt – Silvester-Grenze)
  const now = nowIso();
  const year = Number(berlinDate(now).slice(0, 4));
  const c = await env.DB.prepare(`INSERT INTO fine_counters(environment, year, last_no) VALUES (?, ?, 1) ON CONFLICT(environment, year) DO UPDATE SET last_no = last_no + 1 RETURNING last_no`).bind(envName, year).first();
  const fineNo = `${envName === 'test' ? 'TB' : 'B'}-${year}-${String(c.last_no).padStart(4, '0')}`;
  // nicht angelegt (Dublette, Wiederholung, Fehler): Nummer zurückgeben, solange niemand danach eine gezogen hat – keine Nummernlücke (22.10.2026, Backlog 127b)
  // Nur wenn die Nummer wirklich nicht gespeichert ist (Fehlermeldung nach geschriebenem Stapel → sonst Dauer-500 bis Silvester, 22.10.2026);
  // UNIQUE-Fehler auf die Nummer (Altzustand) hebt den Zähler auf die höchste vergebene Nummer des Jahres an (Selbstheilung)
  const prefix = `${envName === 'test' ? 'TB' : 'B'}-${year}-`;
  const giveBackNo = () => env.DB.prepare('UPDATE fine_counters SET last_no=last_no-1 WHERE environment=? AND year=? AND last_no=? AND NOT EXISTS (SELECT 1 FROM fines WHERE fine_no=?)')
    .bind(envName, year, c.last_no, fineNo).run().catch(() => null);
  const healCounter = () => env.DB.prepare(`UPDATE fine_counters SET last_no=MAX(last_no, COALESCE((SELECT MAX(CAST(substr(fine_no, length(?3) + 1) AS INTEGER))
      FROM fines WHERE environment=?1 AND substr(fine_no, 1, length(?3))=?3), 0)) WHERE environment=?1 AND year=?2`).bind(envName, year, prefix).run().catch(() => null);
  const id = uuid();
  // Aktenzeichen-Dublette auch bei gleichzeitiger Erfassung ausschließen: Einfügen nur, wenn (Umgebung, Behörde, Aktenzeichen) noch fehlt –
  // in derselben Anweisung (vorher: erst prüfen, dann schreiben → zwei parallele Erfassungen ergaben zwei Vorgänge, 17.10.2026).
  // Kein UNIQUE-Index, weil vorhandene Dubletten im Bestand die Migration scheitern ließen.
  let res;
  try { res = await env.DB.batch([
    env.DB.prepare(`INSERT INTO fines(id,fine_no,environment,kind,authority,reference,offense_type,offense_at,location,plate_in_letter,vehicle_id,amount_eur,response_due,status,note,created_by,created_at,updated_at,request_key)
      SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,'eingegangen',?14,?15,?16,?17,?18
      WHERE ?6 IS NULL OR NOT EXISTS (SELECT 1 FROM fines WHERE environment=?3 AND reference=?6 AND authority=?5)`).bind(id, fineNo, envName, kind, authority, reference, offense, new Date(offenseAt).toISOString(),
      location, plate, veh ? veh.id : null, amount, due,
      fnote, user.id, now, now, rkey),
    env.DB.prepare('INSERT INTO fine_events(id,fine_id,actor_id,action,note,payload,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM fines WHERE id=?)').bind(uuid(), id, user.id, 'create', null, JSON.stringify(pick.ambiguous ? { vehicle_matched: false, vehicle_ambiguous: true } : { vehicle_matched: !!veh }), now, id),
  ]); } catch (e) {
    await giveBackNo();
    if (/fine_no/.test(String(e && e.message))) await healCounter();
    // gleichzeitige Wiederholung mit demselben Schlüssel: der eindeutige Index weist die zweite ab → den ersten Vorgang melden
    if (rkey && /request_key|UNIQUE/i.test(String(e && e.message))) { const w = await byKey(); if (w) return w; }
    throw e;
  }
  if (!(res[0] && res[0].meta && res[0].meta.changes)) { await giveBackNo(); const w = await byKey(); if (w) return w; await dupCheck(); throw conflict('version_conflict', 'Vorgang wurde zwischenzeitlich geändert. Bitte neu laden.'); }
  return { id, fine_no: fineNo, vehicle_matched: !!veh, ...(pick.ambiguous ? { vehicle_ambiguous: true } : {}) };
}

export async function fineCommand(env, ctx, user, envName, id, body) {
  const f = await loadFine(env, user, envName, id);
  const action = str(body.action, { required: true, max: 30, field: 'Aktion' });
  const p = body.payload || {};
  const note = str(body.note, { max: 2000, field: 'Bemerkung' });
  const now = nowIso();
  const set = {};
  let payload = {}; let plateAmbiguous = false;
  if (action === 'driver_ack') {
    if (user.role !== 'driver' || f.driver_id !== user.id) throw forbidden();
    if (f.driver_ack_at) return { ok: true, version: f.version, duplicate: true };
    set.driver_ack_at = now;
  } else {
    // Wiederholung (Doppeltipp/verlorene Antwort) von „Fahrer informieren“/„Status setzen“ auf den Stand davor: war der letzte Schritt genau
    // diese Aktion derselben Person (bei Status mit demselben Ziel), Erfolg melden statt 403/409 (19.10.2026)
    if (['inform_driver', 'set_status'].includes(action) && body.expected_version !== undefined && Number(body.expected_version) === f.version - 1) {
      const last = await env.DB.prepare('SELECT action, actor_id, payload FROM fine_events WHERE fine_id=? ORDER BY created_at DESC, rowid DESC LIMIT 1').bind(id).first();
      let to = null; try { to = JSON.parse(last?.payload || '{}').to ?? null; } catch { /* alter Eintrag */ }
      if (last && last.action === action && last.actor_id === user.id && (action !== 'set_status' || (to !== null && to === p.status))) return { ok: true, version: f.version, duplicate: true };
    }
    // unbekannte Aktion → 400 unknown_action (vorher 403 „ist hier nicht möglich“, 20.10.2026)
    if (!['confirm_driver', 'inform_driver', 'set_status', 'update'].includes(action)) throw bad('unknown_action', 'Unbekannte Aktion.');
    if (!fineActions(user, f).includes(action)) throw forbidden(`Aktion „${action}“ ist hier nicht möglich.`, { denied: 'fine_action_not_allowed', action, status: f.status });
    if (body.expected_version !== undefined && Number(body.expected_version) !== f.version) throw conflict('version_conflict', 'Vorgang wurde zwischenzeitlich geändert. Bitte neu laden.');
    switch (action) {
      case 'confirm_driver': {
        const basis = oneOf(p.basis, BASES, 'Grundlage');
        const evidence = str(p.evidence, { required: true, max: 500, field: 'Nachweis' });
        const did = str(p.driver_id, { max: 64, field: 'Fahrer' }); // Liste/Objekt → 400 statt 500 (17.10.2026)
        if (did) {
          // ausgeschiedener (deaktivierter) Fahrer nur, wenn er zur Tatzeit zugeordnet war – genau so wird er als Kandidat angeboten (17.10.2026: Angebot ließ sich nicht bestätigen)
          // Rolle inzwischen gewechselt: wer zur Tatzeit zugeordnet war, bleibt bestätigbar (18.10.2026: Kandidat angeboten, Bestätigen → 400)
          // Umgebung der Zuordnung zählt, nicht die heutige des Kontos (22.10.2026: Testfahrer in den Betrieb übernommen → Test-Zuordnung als Betriebsbeleg)
          const d = await env.DB.prepare(`SELECT id FROM users u WHERE id=?1 AND ((active=1 AND role='driver' AND environment=?2)
            OR EXISTS (SELECT 1 FROM driver_vehicles dv WHERE dv.user_id=u.id AND dv.environment=?2 AND dv.vehicle_id IN (${fineVehiclesSql('?3')}) AND dv.valid_from <= ?4 AND (dv.valid_to IS NULL OR dv.valid_to > ?4)))`)
            .bind(did, envName, f.vehicle_id, f.offense_at).first();
          // … ebenso jeder angebotene Kandidat (18.10.2026: Fahrer mit Abfahrtskontrolle am Tattag, inzwischen deaktiviert → 400)
          if (!d && !(await driverCandidates(env, envName, f)).some((c) => c.user_id === did)) throw bad('validation', 'Fahrer nicht gefunden.');
          set.driver_id = did; set.driver_name_note = null;
        } else {
          set.driver_name_note = str(p.driver_name_note, { required: true, max: 120, field: 'Fahrer' });
          set.driver_id = null;
        }
        set.driver_basis = basis; set.driver_evidence = evidence; set.driver_confirmed_by = user.id; set.driver_confirmed_at = now; set.status = 'fahrer_ermittelt';
        // neuer/erneut ermittelter Fahrer: „informiert“/„quittiert“ galten der vorherigen Ermittlung (vorher sah ein neuer Fahrer den Vorgang
        // ohne Information und konnte nie quittieren, weil die Quittung des alten Fahrers stehen blieb – 17.10.2026)
        set.driver_informed_at = null; set.driver_ack_at = null;
        payload = { basis, driver_id: set.driver_id, driver_name_note: set.driver_name_note };
        break;
      }
      case 'inform_driver': {
        // Fahrer seit der Ermittlung in andere Umgebung/Rolle gewechselt oder deaktiviert: nicht informieren (Push ginge an ein Gerät, auf dem
        // der Vorgang nicht sichtbar ist) – Fahrer neu ermitteln (17.10.2026)
        const d = await env.DB.prepare(`SELECT 1 AS x FROM users WHERE id=? AND role='driver' AND environment=? AND active=1`).bind(f.driver_id, envName).first();
        if (!d) throw conflict('driver_changed', 'Der ermittelte Fahrer ist in dieser Umgebung nicht mehr als Fahrer aktiv. Bitte Fahrer neu ermitteln.');
        set.driver_informed_at = now; set.status = 'fahrer_informiert';
        break;
      }
      case 'set_status': {
        const st = oneOf(p.status, FINE_STATUSES, 'Status');
        if (['fahrer_ermittelt', 'fahrer_informiert'].includes(st)) throw bad('validation', 'Dieser Status entsteht über die Fahrerermittlung.');
        if (!note) throw bad('note_required', 'Bitte Vermerk angeben.');
        set.status = st; payload = { from: f.status, to: st };
        // zurück auf „eingegangen“ = Fahrer offen: bisherige Ermittlung samt Information/Quittung zurücksetzen (bleibt im Verlauf) – vorher
        // „eingegangen“ mit eingetragenem Fahrer: Agent meldete „Fahrer nicht ermittelt“, Kennzeichen blieb gesperrt, Fahrer sah den Vorgang (20.10.2026)
        if (st === 'eingegangen' && (f.driver_confirmed_at || f.driver_id || f.driver_name_note)) {
          Object.assign(set, { driver_id: null, driver_name_note: null, driver_basis: null, driver_evidence: null, driver_confirmed_by: null, driver_confirmed_at: null, driver_informed_at: null, driver_ack_at: null });
          payload.driver_reset = { driver_id: f.driver_id || null, driver_name_note: f.driver_name_note || null };
        }
        break;
      }
      case 'update':
        if (p.amount_eur !== undefined) set.amount_eur = num(p.amount_eur, { min: 0, max: 1e6, field: 'Betrag', nullable: true, cents: true, decimalPoint: pointDec(user) });
        if (p.response_due !== undefined) {
          const due = str(p.response_due, { max: 10 });
          if (due && !isCalendarDate(due)) throw bad('validation', 'Frist im Format JJJJ-MM-TT.');
          if (due && due < '2000-01-01') throw bad('validation', 'Frist vor 2000 – bitte Jahr prüfen.');
          if (due && due > maxDueDay()) throw bad('validation', 'Frist: Datum außerhalb des zulässigen Bereichs.'); // Jahres-Tippfehler 2062: nie fällig (18.10.2026), Grenze wie Fahrerakte
          set.response_due = due;
        }
        // Tatzeit korrigierbar – nur vor der Fahrerermittlung (die Kandidaten hängen an ihr), wie das Kennzeichen (23.10.2026)
        if (p.offense_at !== undefined) {
          const oa = parseOffenseAt(p.offense_at);
          if (oa !== f.offense_at) {
            if (f.driver_confirmed_at) throw conflict('driver_confirmed', 'Fahrer bereits ermittelt – Tatzeit nur vor der Fahrerermittlung änderbar.');
            set.offense_at = oa;
          }
        }
        {
          const due = set.response_due !== undefined ? set.response_due : f.response_due; const oa = set.offense_at || f.offense_at;
          if (('response_due' in set || 'offense_at' in set) && due && due < berlinDate(oa)) throw bad('validation', 'Frist liegt vor der Tatzeit – bitte Jahr prüfen.');
        }
        if (p.reference !== undefined) set.reference = str(p.reference, { max: 80 });
        // Behörde korrigierbar (19.10.2026, Backlog 91) – Pflichtfeld wie beim Anlegen
        if (p.authority !== undefined) set.authority = str(p.authority, { required: true, max: 200, field: 'Behörde' });
        {
          // gleiche Dublettenregel wie beim Anlegen (Umgebung + Behörde + Aktenzeichen) – vorher über „Ändern“ umgehbar; auch bei geänderter Behörde
          const ref = set.reference !== undefined ? set.reference : f.reference; const auth = set.authority !== undefined ? set.authority : f.authority;
          const dup = ref && (ref !== f.reference || auth !== f.authority) ? await env.DB.prepare('SELECT id, fine_no FROM fines WHERE environment=? AND reference=? AND authority=? AND id<>?').bind(envName, ref, auth, id).first() : null;
          if (dup) throw conflict('duplicate_fine', `Aktenzeichen bereits erfasst (${dup.fine_no}).`, { id: dup.id });
        }
        // Kennzeichen laut Schreiben korrigierbar (Tippfehler/mehrdeutig blieb sonst dauerhaft ohne Fahrzeug, Kandidaten und Standort) –
        // nur vor der Fahrerermittlung: eine bestätigte Ermittlung bezog sich auf das bisherige Fahrzeug (19.10.2026, Backlog 91)
        if (p.plate_in_letter !== undefined) {
          const np = str(p.plate_in_letter, { required: true, max: 20, field: 'Kennzeichen' }).toUpperCase();
          // auch bei gleichem Kennzeichen, solange kein Fahrzeug zugeordnet ist (Fahrzeugstamm inzwischen eindeutig, 21.10.2026)
          if (np !== f.plate_in_letter || !f.vehicle_id) {
            if (f.driver_confirmed_at) throw conflict('driver_confirmed', 'Fahrer bereits ermittelt – Kennzeichen nur vor der Fahrerermittlung änderbar.');
            const pk = pickVehicleByPlate((await env.DB.prepare('SELECT id, plate, active, eval_excluded FROM vehicles').all()).results, np);
            const fo = !pk.vehicle && !pk.ambiguous ? await formerPlateVehicle(env, np, set.offense_at || f.offense_at) : null; // Backlog 257b
            set.plate_in_letter = np; set.vehicle_id = pk.vehicle ? pk.vehicle.id : fo ? fo.vehicle_id : null;
            if (pk.ambiguous) plateAmbiguous = true;
          }
        }
        // nichts geändert: keine neue Version, kein Verlaufseintrag (ein offenes Formular bekam sonst unnötig 409, 18.10.2026)
        if (!Object.keys(set).length || Object.keys(set).every((k) => (set[k] ?? null) === (f[k] ?? null))) return { ok: true, version: f.version, unchanged: true };
        // nur tatsächlich geänderte Angaben, mit bisherigem Wert (`prev`) – Verlauf zeigt alt → neu (19.10.2026)
        for (const k of Object.keys(set)) if ((set[k] ?? null) === (f[k] ?? null)) delete set[k];
        payload = { ...set, prev: Object.fromEntries(Object.keys(set).map((k) => [k, f[k] ?? null])), ...(plateAmbiguous ? { vehicle_ambiguous: true } : {}) };
        // Fahrzeug bei unverändertem Kennzeichen übernommen: Kennzeichen im Verlauf nennen (21.10.2026)
        if ('vehicle_id' in set && !('plate_in_letter' in set)) payload.plate_in_letter = f.plate_in_letter;
        break;
      default:
        throw bad('unknown_action', 'Unbekannte Aktion.');
    }
  }
  set.updated_at = now; set.version = f.version + 1;
  const cols = Object.keys(set);
  // atomarer Versions-Guard wie bei Vorgängen (cmd_guard): zwei gleichzeitige Befehle auf denselben Stand → einer gewinnt, der andere 409
  // (vorher meldeten beide „ok“, die erste Fahrerbestätigung ging still verloren – 17.10.2026)
  try {
    // geändertes Aktenzeichen: Dublettenprüfung im selben Stapel (zwei gleichzeitige Änderungen auf „Z9“ ergaben sonst zwei Vorgänge)
    const gRef = set.reference !== undefined ? set.reference : f.reference; const gAuth = set.authority !== undefined ? set.authority : f.authority;
    const refGuard = gRef && (gRef !== f.reference || gAuth !== f.authority)
      ? [env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT CASE WHEN EXISTS (SELECT 1 FROM fines WHERE environment=? AND reference=? AND authority=? AND id<>?) THEN 0 ELSE 1 END').bind(envName, gRef, gAuth, id), env.DB.prepare('DELETE FROM cmd_guard')]
      : [];
    await env.DB.batch([
      ...refGuard,
      // Fahrer neu ermittelt: Hinweise des bisherigen Fahrers ausblenden (Link führte auf 404, zurückgehaltener Push ging noch raus – 17.10.2026)
      ...((action === 'confirm_driver' || (action === 'set_status' && set.driver_id === null)) && f.driver_id ? [env.DB.prepare(`UPDATE notifications SET hidden_at=? WHERE user_id=? AND ref=? AND hidden_at IS NULL
        AND EXISTS (SELECT 1 FROM fines WHERE id=? AND version=?)`).bind(now, f.driver_id, `fine:${id}`, id, f.version)] : []),
      env.DB.prepare(`UPDATE fines SET ${cols.map((k) => `${k}=?`).join(', ')} WHERE id=? AND version=?`).bind(...cols.map((k) => set[k]), id, f.version),
      env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT changes()'),
      env.DB.prepare('DELETE FROM cmd_guard'),
      env.DB.prepare('INSERT INTO fine_events(id,fine_id,actor_id,action,note,payload,created_at) VALUES (?,?,?,?,?,?,?)').bind(uuid(), id, user.id, action, note, JSON.stringify(payload), now),
    ]);
  } catch (e) {
    if (String(e && e.message).includes('CHECK')) {
      // gleichzeitig doppelt quittiert (Doppelklick/Netzwiederholung): wie die spätere Wiederholung „duplicate“ statt 409
      if (action === 'driver_ack') {
        const cur = await env.DB.prepare('SELECT version, driver_ack_at, driver_id FROM fines WHERE id=?').bind(id).first();
        if (cur && cur.driver_ack_at && cur.driver_id === user.id) return { ok: true, version: cur.version, duplicate: true };
      }
      const dR = set.reference !== undefined ? set.reference : f.reference; const dA = set.authority !== undefined ? set.authority : f.authority;
      const dup = dR && (dR !== f.reference || dA !== f.authority) ? await env.DB.prepare('SELECT id, fine_no FROM fines WHERE environment=? AND reference=? AND authority=? AND id<>?').bind(envName, dR, dA, id).first() : null;
      if (dup) throw conflict('duplicate_fine', `Aktenzeichen bereits erfasst (${dup.fine_no}).`, { id: dup.id });
      throw conflict('version_conflict', 'Vorgang wurde zwischenzeitlich geändert. Bitte neu laden.');
    }
    throw e;
  }
  if (action === 'inform_driver') {
    // Sperrbildschirm: nur Vorgangsnummer; Details erst nach Anmeldung
    // Fahrer arbeiten oft auf Ukrainisch/Englisch: Titel in ihrer Sprache
    const du = await env.DB.prepare('SELECT language FROM users WHERE id=?').bind(f.driver_id).first();
    await notifyUsers(env, ctx, envName, [f.driver_id], { kind: 'fine', title: nt(du && du.language, 'fine'), body: `${f.fine_no}${envName === 'test' ? ' · TEST' : ''}`, eventKey: `fine:${id}:inform:${f.version}`, urgent: false, langOf: new Map([[f.driver_id, du && du.language]]), ref: `fine:${id}` });
  }
  return { ok: true, version: f.version + 1, ...(set.plate_in_letter !== undefined || set.vehicle_id !== undefined ? { vehicle_matched: !!set.vehicle_id, ...(plateAmbiguous ? { vehicle_ambiguous: true } : {}) } : {}) };
}

export const MAX_FINE_FILES = 20;
export async function uploadFineFile(env, user, envName, id, request) {
  const f = await loadFine(env, user, envName, id);
  if (!fineActions(user, f).includes('upload')) throw forbidden();
  const buf = new Uint8Array(await request.arrayBuffer());
  if (!buf.length || buf.length > 5 * 1024 * 1024) throw bad('too_large', 'Datei leer oder größer als 5 MB.');
  const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46;
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const type = isPdf ? 'application/pdf' : isJpg ? 'image/jpeg' : isPng ? 'image/png' : null;
  if (!type) throw bad('type', 'Nur PDF, JPG oder PNG.');
  const sha = await sha256Hex(buf);
  const dup = await env.DB.prepare('SELECT id FROM files WHERE fine_id=? AND sha256=?').bind(id, sha).first();
  if (dup) return { id: dup.id, duplicate: true };
  // Höchstzahl je Bußgeldvorgang (Schreiben, Fotos, Zeugenfragebogen) – begrenzt Speicher; gleiche Datei zählt nicht doppelt (oben)
  const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM files WHERE fine_id=?').bind(id).first();
  if (cnt.n >= MAX_FINE_FILES) throw bad('too_many', `Maximal ${MAX_FINE_FILES} Dateien je Bußgeldvorgang.`);
  const fid = uuid();
  const key = `${envName}/fines/${id}/${fid}`;
  // Dateiname vor dem Speichern ermitteln; ungültige %-Folge → Ersatzname (vorher 500 und verwaiste Datei im Speicher, 17.10.2026)
  const name = (() => { try { return decodeURIComponent(request.headers.get('x-filename') || 'schreiben'); } catch { return 'schreiben'; } })().replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120) || 'schreiben';
  await env.FILES.put(key, buf, { metadata: { type, fine_id: id } });
  // Höchstzahl und Dublette im Einfügen selbst geprüft – 25 gleichzeitige Uploads ergaben vorher 25 Dateien (17.10.2026)
  let ins;
  // D1-Fehler beim Eintragen: gespeicherte Datei wieder entfernen (wie bei Vorgangsdateien/Fahrzeugdokumenten; 22.10.2026, Backlog 127c)
  try {
    ins = await env.DB.prepare(`INSERT INTO files(id,case_id,fine_id,environment,r2_key,filename,content_type,size,sha256,uploaded_by,created_at)
    SELECT ?1,NULL,?2,?3,?4,?5,?6,?7,?8,?9,?10 WHERE (SELECT COUNT(*) FROM files WHERE fine_id=?2) < ?11 AND NOT EXISTS (SELECT 1 FROM files WHERE fine_id=?2 AND sha256=?8)`)
      .bind(fid, id, envName, key, name, type, buf.length, sha, user.id, nowIso(), MAX_FINE_FILES).run();
  } catch (e) { await env.FILES.delete(key).catch(() => {}); throw e; }
  if (!ins.meta || ins.meta.changes !== 1) {
    await env.FILES.delete(key).catch(() => {});
    const d2 = await env.DB.prepare('SELECT id FROM files WHERE fine_id=? AND sha256=?').bind(id, sha).first();
    if (d2) return { id: d2.id, duplicate: true };
    throw bad('too_many', `Maximal ${MAX_FINE_FILES} Dateien je Bußgeldvorgang.`);
  }
  return { id: fid, duplicate: false };
}

export async function canReadFineFile(env, user, envName, fineId) {
  await loadFine(env, user, envName, fineId);
  return true;
}

// CSV-Export (Buchhaltung/Steuerberatung): Tatzeit in Berliner Ortszeit (TT.MM.JJJJ HH:MM, wie im Schreiben – gespeichert ist UTC); Fahrernamen nur auf ausdrücklichen Wunsch (with_driver=1) und nur für Inhaber/Fuhrparkleitung
// Status als Bezeichnung wie in der App (bis 16.10.2026 Code in der CSV); Test prüft Gleichheit mit i18n.js
export const FINE_STATUS_DE = { eingegangen: 'Eingegangen', fahrer_ermittelt: 'Fahrer ermittelt', fahrer_informiert: 'Fahrer informiert', beantwortet: 'Beantwortet', bezahlt: 'Bezahlt', eingestellt: 'Eingestellt', erledigt: 'Erledigt' };
export const OFFENSE_DE = { geschwindigkeit: 'Geschwindigkeit', abstand: 'Abstand', parken: 'Parken/Halten', rotlicht: 'Rotlicht', lenk_ruhezeit: 'Lenk-/Ruhezeit', ladung: 'Ladung/Gewicht', maut: 'Maut', handy: 'Handy', sonstiges: 'Sonstiges' };
const KIND_DE = { anhoerung: 'Anhörung', zeugenfragebogen: 'Zeugenfragebogen', bussgeldbescheid: 'Bußgeldbescheid', verwarnung: 'Verwarnung', maut: 'Mautnacherhebung', sonstiges: 'Sonstiges' };
export function finesCsv(rows, csvCell, withDriver) {
  const head = ['Vorgang', 'Art', 'Behörde', 'Aktenzeichen', 'Tatvorwurf', 'Tatzeit', 'Ort', 'Kennzeichen laut Schreiben', 'Fahrzeug', 'Betrag (EUR)', 'Antwortfrist', 'Status', ...(withDriver ? ['Fahrer'] : [])];
  const lines = [head.join(';')];
  for (const f of rows) lines.push([csvCell(f.fine_no), KIND_DE[f.kind] || f.kind, csvCell(f.authority), quoteCell(csvCell(f.reference)), OFFENSE_DE[f.offense_type] || csvCell(f.offense_type), berlinDateTime(f.offense_at) || csvCell(f.offense_at), csvCell(f.location),
    csvCell(f.plate_in_letter), csvCell(f.plate), f.amount_eur === null || f.amount_eur === undefined ? '' : Number(f.amount_eur).toFixed(2).replace('.', ','), f.response_due || '', FINE_STATUS_DE[f.status] || csvCell(f.status),
    ...(withDriver ? [csvCell(f.driver_name || f.driver_name_note)] : [])].join(';'));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}
// Fristenkalender: nur Antwortfristen laut Schreiben offener Vorgänge, ohne Fahrernamen (Kalender werden oft geteilt)
// Texte in der Sprache der Person (lang; DE/UK/EN, sonst Deutsch); Behörde/Aktenzeichen wie gespeichert
export function finesIcs(rows, warnDays, icsCalendar, site = null, lang = 'de', envName = 'production') {
  const I = icsLang(lang);
  const open = rows.filter((f) => f.response_due && !['bezahlt', 'eingestellt', 'erledigt', 'beantwortet'].includes(f.status));
  return icsCalendar(`${I.tx('cal_fines')}${site ? ' – ' + (site === 'ohne' ? I.tx('no_site') : site) : ''}${envName === 'test' ? ` (${I.tx('test_env')})` : ''}`, open.map((f) => ({ uid: `fine-${f.id}`, date: f.response_due,
    summary: I.tx('fine_due', { kind: I.label('fk_' + f.kind, KIND_DE[f.kind] || f.kind), plate: f.plate || f.plate_in_letter, no: f.fine_no }),
    description: `${f.authority}${f.reference ? ' · ' + I.tx('fine_ref', { ref: f.reference }) : ''} · ${I.tx('fine_by_letter')}`, alarmDays: warnDays })));
}

export async function fineFindings(env, environment, settings = null) {
  // leer/nicht gesetzt = keine Vorwarnung (wie Kalender); vorher wurde ein fehlender Schlüssel über die Agenten-Einstellungen zu 0 → „Frist läuft ab (in 0 Tagen)“ (17.10.2026)
  const raw = settings ? settings.get('fine_warn_days') : (await env.DB.prepare(`SELECT value FROM settings WHERE key='fine_warn_days'`).first())?.value;
  const warnDays = raw === undefined || raw === null || raw === '' || !Number.isFinite(Number(raw)) ? null : Number(raw);
  const rows = (await env.DB.prepare(`SELECT f.*, v.plate FROM fines f LEFT JOIN vehicles v ON v.id=f.vehicle_id WHERE f.environment=? AND f.status IN ('eingegangen','fahrer_ermittelt','fahrer_informiert')`).bind(environment).all()).results;
  const today = berlinDate();
  const out = [];
  // frühere Kennzeichen in derselben Abfrage (Abfragebudget des Agenten; Backlog 257b)
  const vehs = rows.some((f) => !f.vehicle_id) ? (await env.DB.prepare(`SELECT id, plate, active, eval_excluded, trailer_plate,
    (SELECT json_group_array(json_object('plate', p.plate, 'valid_until', p.valid_until)) FROM vehicle_plates p WHERE p.vehicle_id=vehicles.id) AS fp FROM vehicles`).all()).results : [];
  const vplates = vehs.flatMap((v) => { try { return JSON.parse(v.fp || '[]').map((x) => ({ vehicle_id: v.id, ...x })); } catch { return []; } });
  for (const f of rows) {
    const label = `${f.fine_no} (${f.plate || f.plate_in_letter}, ${f.authority})`;
    if (f.response_due) {
      const days = Math.round((Date.parse(f.response_due) - Date.parse(today)) / 86400000);
      if (days < 0) out.push({ code: 'FINE_OVERDUE', f, severity: 'handeln', requires_decision: 1, ...fm('FINE_OVERDUE', { label, due: f.response_due }), next_action: 'Sofort beantworten bzw. Fristverlängerung klären.' });
      else if (warnDays !== null && days <= warnDays) out.push({ code: 'FINE_DUE_SOON', f, severity: 'hinweis', requires_decision: 0, ...fm(days === 0 ? 'FINE_DUE_TODAY' : 'FINE_DUE_SOON', { label, due: f.response_due, days }), next_action: f.status === 'eingegangen' ? 'Fahrer ermitteln und Schreiben beantworten.' : 'Schreiben fristgerecht beantworten.' });
    }
    if (!f.vehicle_id && pickVehicleByPlate(vehs, f.plate_in_letter).ambiguous) out.push({ code: 'FINE_VEHICLE_UNKNOWN', f, severity: 'hinweis', requires_decision: 0, ...fm('FINE_VEHICLE_AMBIGUOUS', { label, plate: f.plate_in_letter }), next_action: 'Fahrzeugstamm prüfen: Kennzeichen steht an mehreren aktiven Fahrzeugen (Datenqualität).' });
    else if (!f.vehicle_id && (pickVehicleByPlate(vehs, f.plate_in_letter).vehicle || formerPick(vplates, f.plate_in_letter, f.offense_at))) out.push({ code: 'FINE_VEHICLE_UNKNOWN', f, severity: 'hinweis', requires_decision: 0, ...fm('FINE_VEHICLE_MATCHABLE', { label, plate: f.plate_in_letter }), next_action: 'Bußgeld öffnen, unter „Angaben ändern“ speichern – das Fahrzeug wird übernommen.' });
    else if (!f.vehicle_id && trailerOf(vehs, f.plate_in_letter)) out.push({ code: 'FINE_VEHICLE_UNKNOWN', f, severity: 'hinweis', requires_decision: 0, ...fm('FINE_VEHICLE_TRAILER', { label, plate: f.plate_in_letter, truck: trailerOf(vehs, f.plate_in_letter).plate }), next_action: 'Anhänger im Fahrzeugstamm anlegen, danach im Bußgeld unter „Angaben ändern“ speichern.' });
    else if (!f.vehicle_id) out.push({ code: 'FINE_VEHICLE_UNKNOWN', f, severity: 'hinweis', requires_decision: 0, ...fm('FINE_VEHICLE_UNKNOWN', { label, plate: f.plate_in_letter }), next_action: 'Kennzeichen prüfen (Fremd-/Mietfahrzeug?).' });
    else if (f.status === 'eingegangen') out.push({ code: 'FINE_DRIVER_OPEN', f, severity: 'hinweis', requires_decision: 0, ...fm('FINE_DRIVER_OPEN', { label }), next_action: 'Fahrer anhand Zuordnung/Tourenplan/Telematik bestätigen.' });
  }
  return out;
}
