// [CLAUDE] Bußgelder & Zeugenfragebögen: Erfassung, Fahrerermittlung zum Tatzeitpunkt mit Nachweis, Fristen, Information des Fahrers
import { icsLang } from '../public/ics-texts.js';
import { findingText as fm } from '../public/finding-messages.js';
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, num, oneOf, sha256Hex, berlinDate, berlinDateTime, berlinLocalToIso, isCalendarDate, pickVehicleByPlate, PLATE_KEY_SQL } from './util.js';
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
    rows = (await env.DB.prepare(`SELECT f.*, v.plate, v.site AS vehicle_site, u.display_name AS driver_name FROM fines f LEFT JOIN vehicles v ON v.id=f.vehicle_id LEFT JOIN users u ON u.id=f.driver_id
      WHERE f.environment=? ${open ? "AND f.status NOT IN ('bezahlt','eingestellt','erledigt')" : ''}
      ORDER BY f.created_at DESC, f.rowid DESC LIMIT ?`).bind(envName, max + 1).all()).results;
    // die 500 jüngsten Schreiben (vorher: nach Frist aufsteigend begrenzt – dann wären bei > 500 die neuesten weggefallen), Anzeige-Reihenfolge wie bisher
    if (rows.length > max) { rows.length = max; truncated = true; }
    rows.sort((x, y) => (x.response_due === null) - (y.response_due === null) || (x.response_due || '').localeCompare(y.response_due || '') || (y.created_at || '').localeCompare(x.created_at || ''));
    sel = siteSelection(rows.map((r) => ({ site: r.vehicle_site })), query.site);
    if (sel.site) rows = rows.filter((r) => sel.match(r.vehicle_site));
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
    WHERE d.vehicle_id IN (${fineVehiclesSql('?1')}) AND u.environment=?2 AND d.valid_from <= ?3 AND (d.valid_to IS NULL OR d.valid_to > ?3)`).bind(f.vehicle_id, envName, f.offense_at).all()).results;
  for (const a of assigned) {
    const via = a.vehicle_id !== f.vehicle_id ? ` – Zugmaschine ${a.plate}` : '';
    if (out.some((o) => o.user_id === a.user_id && o.basis === 'zuordnung')) continue;
    out.push({ user_id: a.user_id, display_name: a.display_name, basis: 'zuordnung', evidence: `Fahrzeugzuordnung seit ${berlinDate(a.valid_from)}${via}${a.evidence ? ' (' + a.evidence + ')' : ''}`, since: berlinDate(a.valid_from), assign_evidence: a.evidence || null, ...(via ? { via_plate: a.plate } : {}) });
  }
  const day = berlinDate(f.offense_at);
  const checks = (await env.DB.prepare(`SELECT i.performed_by AS user_id, u.display_name, i.created_at FROM inspections i JOIN users u ON u.id=i.performed_by
    WHERE i.vehicle_id IN (${fineVehiclesSql('?1')}) AND i.environment=?2 AND u.environment=?2 AND i.kind='abfahrt' AND u.role='driver' AND i.created_at BETWEEN ?3 AND ?4`)
    .bind(f.vehicle_id, envName, new Date(Date.parse(day + 'T00:00:00Z') - 4 * 3600000).toISOString(), new Date(Date.parse(day + 'T23:59:59Z') + 2 * 3600000).toISOString()).all()).results;
  for (const c of checks) {
    if (berlinDate(c.created_at) !== day) continue;
    if (out.some((o) => o.user_id === c.user_id && o.basis === 'manuell')) continue; // je Person einmal (mehrere Kontrollen am Tattag)
    out.push({ user_id: c.user_id, display_name: c.display_name, basis: 'manuell', evidence: `Abfahrtskontrolle am Tattag ${berlinDateTime(c.created_at).slice(-5)} Uhr`, check_at: c.created_at });
  }
  return out;
}

export async function fineDetail(env, user, envName, id) {
  const f = await loadFine(env, user, envName, id);
  const events = (await env.DB.prepare(`SELECT e.*, u.display_name AS actor_name FROM fine_events e LEFT JOIN users u ON u.id=e.actor_id WHERE fine_id=? ORDER BY created_at`).bind(id).all()).results;
  const files = (await env.DB.prepare('SELECT id, filename, content_type, size, created_at FROM files WHERE fine_id=? ORDER BY created_at').bind(id).all()).results;
  const driver = f.driver_id ? await env.DB.prepare('SELECT display_name FROM users WHERE id=?').bind(f.driver_id).first() : null;
  const out = { fine: shape(f, user), files, driver_name: user.role === 'viewer' ? null : driver?.display_name || f.driver_name_note || null };
  if (isMgr(user)) {
    out.events = events;
    out.candidates = await driverCandidates(env, envName, f);
    out.allowed_actions = fineActions(user, f);
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

export async function createFine(env, user, envName, body) {
  if (!isMgr(user)) throw forbidden();
  const kind = oneOf(body.kind, FINE_KINDS, 'Art');
  const offense = oneOf(body.offense_type, OFFENSES, 'Verstoß');
  // Tatzeit wie im Schreiben (Berliner Ortszeit, ohne Zeitzone) → UTC; Angaben mit Zeitzone werden nur vereinheitlicht
  const offenseRaw = berlinLocalToIso(str(body.offense_at, { required: true, max: 30, field: 'Tatzeit' }));
  // nur ISO-Schreibweisen (ohne Zone = Berlin, sonst mit Z/±hh:mm) – freies Datumsformat („10/01/2026 14:30“) wäre als UTC gelesen worden
  if (!offenseRaw || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/i.test(offenseRaw) || Number.isNaN(Date.parse(offenseRaw))
    || !isCalendarDate(offenseRaw.slice(0, 10))) throw bad('validation', 'Tatzeit ungültig.'); // 2026-02-30T10:00Z rollte sonst still auf den 02.03.
  const offenseAt = new Date(offenseRaw).toISOString();
  // Tippfehler im Jahr (2062): Fahrerermittlung „zum Tatzeitpunkt“ lieferte sonst die heutige Zuordnung (17.10.2026); 5 Min. Uhrenspiel
  if (Date.parse(offenseAt) > Date.now() + 5 * 60000) throw bad('validation', 'Tatzeit liegt in der Zukunft.');
  if (offenseAt < '2000-01-01') throw bad('validation', 'Tatzeit vor 2000 – bitte Jahr prüfen.'); // Tippfehler 1926 (18.10.2026), wie Versicherungsfälle
  const plate = str(body.plate_in_letter, { required: true, max: 20, field: 'Kennzeichen' }).toUpperCase();
  const due = str(body.response_due, { max: 10 });
  if (due && !isCalendarDate(due)) throw bad('validation', 'Frist im Format JJJJ-MM-TT.');
  if (due && due < '2000-01-01') throw bad('validation', 'Frist vor 2000 – bitte Jahr prüfen.');
  // Frist vor der Tat: Tippfehler im Jahr – Agent meldete sofort „überfällig“ (18.10.2026)
  if (due && due < berlinDate(offenseAt)) throw bad('validation', 'Frist liegt vor der Tatzeit – bitte Jahr prüfen.');
  // alle Eingaben vor dem Hochzählen der Bußgeldnummer prüfen (18.10.2026: jeder Tippfehler verbrauchte eine Nummer)
  const location = str(body.location, { max: 200 }); const amount = num(body.amount_eur, { min: 0, max: 1e6, field: 'Betrag', nullable: true, cents: true }); const fnote = str(body.note, { max: 2000 });
  // bei gleichem Kennzeichen zählt das aktive bewertete vor dem ruhenden vor dem außer Betrieb genommenen, sonst mehrdeutig = keine Zuordnung
  // (Fahrerermittlung über ein falsches Fahrzeug wäre schlimmer als eine manuelle Klärung). Außer Betrieb genommene zählen mit: das Schreiben
  // kommt oft Wochen nach der Tat, wenn das Fahrzeug schon verkauft ist (vorher kein Fahrzeug, kein Fahrer – 17.10.2026)
  const pick = pickVehicleByPlate((await env.DB.prepare('SELECT id, plate, active, eval_excluded FROM vehicles').all()).results, plate);
  const veh = pick.vehicle;
  const reference = str(body.reference, { max: 80 });
  const authority = str(body.authority, { required: true, max: 200, field: 'Behörde' });
  const dupCheck = async () => {
    if (!reference) return;
    const dup = await env.DB.prepare('SELECT id, fine_no FROM fines WHERE environment=? AND reference=? AND authority=?').bind(envName, reference, authority).first();
    if (dup) throw conflict('duplicate_fine', `Aktenzeichen bereits erfasst (${dup.fine_no}).`, { id: dup.id });
  };
  await dupCheck();
  const year = Number(berlinDate().slice(0, 4)); // Berliner Kalenderjahr wie alle Tagesangaben
  const c = await env.DB.prepare(`INSERT INTO fine_counters(environment, year, last_no) VALUES (?, ?, 1) ON CONFLICT(environment, year) DO UPDATE SET last_no = last_no + 1 RETURNING last_no`).bind(envName, year).first();
  const fineNo = `${envName === 'test' ? 'TB' : 'B'}-${year}-${String(c.last_no).padStart(4, '0')}`;
  const id = uuid();
  const now = nowIso();
  // Aktenzeichen-Dublette auch bei gleichzeitiger Erfassung ausschließen: Einfügen nur, wenn (Umgebung, Behörde, Aktenzeichen) noch fehlt –
  // in derselben Anweisung (vorher: erst prüfen, dann schreiben → zwei parallele Erfassungen ergaben zwei Vorgänge, 17.10.2026).
  // Kein UNIQUE-Index, weil vorhandene Dubletten im Bestand die Migration scheitern ließen.
  const res = await env.DB.batch([
    env.DB.prepare(`INSERT INTO fines(id,fine_no,environment,kind,authority,reference,offense_type,offense_at,location,plate_in_letter,vehicle_id,amount_eur,response_due,status,note,created_by,created_at,updated_at)
      SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,'eingegangen',?14,?15,?16,?17
      WHERE ?6 IS NULL OR NOT EXISTS (SELECT 1 FROM fines WHERE environment=?3 AND reference=?6 AND authority=?5)`).bind(id, fineNo, envName, kind, authority, reference, offense, new Date(offenseAt).toISOString(),
      location, plate, veh ? veh.id : null, amount, due,
      fnote, user.id, now, now),
    env.DB.prepare('INSERT INTO fine_events(id,fine_id,actor_id,action,note,payload,created_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM fines WHERE id=?)').bind(uuid(), id, user.id, 'create', null, JSON.stringify(pick.ambiguous ? { vehicle_matched: false, vehicle_ambiguous: true } : { vehicle_matched: !!veh }), now, id),
  ]);
  if (!(res[0] && res[0].meta && res[0].meta.changes)) { await dupCheck(); throw conflict('version_conflict', 'Vorgang wurde zwischenzeitlich geändert. Bitte neu laden.'); }
  return { id, fine_no: fineNo, vehicle_matched: !!veh, ...(pick.ambiguous ? { vehicle_ambiguous: true } : {}) };
}

export async function fineCommand(env, ctx, user, envName, id, body) {
  const f = await loadFine(env, user, envName, id);
  const action = str(body.action, { required: true, max: 30, field: 'Aktion' });
  const p = body.payload || {};
  const note = str(body.note, { max: 2000 });
  const now = nowIso();
  const set = {};
  let payload = {};
  if (action === 'driver_ack') {
    if (user.role !== 'driver' || f.driver_id !== user.id) throw forbidden();
    if (f.driver_ack_at) return { ok: true, version: f.version, duplicate: true };
    set.driver_ack_at = now;
  } else {
    if (!fineActions(user, f).includes(action)) throw forbidden(`Aktion „${action}“ ist hier nicht möglich.`);
    if (body.expected_version !== undefined && Number(body.expected_version) !== f.version) throw conflict('version_conflict', 'Vorgang wurde zwischenzeitlich geändert. Bitte neu laden.');
    switch (action) {
      case 'confirm_driver': {
        const basis = oneOf(p.basis, BASES, 'Grundlage');
        const evidence = str(p.evidence, { required: true, max: 500, field: 'Nachweis' });
        const did = str(p.driver_id, { max: 64, field: 'Fahrer' }); // Liste/Objekt → 400 statt 500 (17.10.2026)
        if (did) {
          // ausgeschiedener (deaktivierter) Fahrer nur, wenn er zur Tatzeit zugeordnet war – genau so wird er als Kandidat angeboten (17.10.2026: Angebot ließ sich nicht bestätigen)
          // Rolle inzwischen gewechselt: wer zur Tatzeit zugeordnet war, bleibt bestätigbar (18.10.2026: Kandidat angeboten, Bestätigen → 400)
          const d = await env.DB.prepare(`SELECT id FROM users u WHERE id=? AND environment=? AND ((active=1 AND role='driver')
            OR EXISTS (SELECT 1 FROM driver_vehicles dv WHERE dv.user_id=u.id AND dv.vehicle_id IN (${fineVehiclesSql('?3')}) AND dv.valid_from <= ?4 AND (dv.valid_to IS NULL OR dv.valid_to > ?4)))`)
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
        break;
      }
      case 'update':
        if (p.amount_eur !== undefined) set.amount_eur = num(p.amount_eur, { min: 0, max: 1e6, field: 'Betrag', nullable: true, cents: true });
        if (p.response_due !== undefined) {
          const due = str(p.response_due, { max: 10 });
          if (due && !isCalendarDate(due)) throw bad('validation', 'Frist im Format JJJJ-MM-TT.');
          if (due && due < '2000-01-01') throw bad('validation', 'Frist vor 2000 – bitte Jahr prüfen.');
          if (due && due < berlinDate(f.offense_at)) throw bad('validation', 'Frist liegt vor der Tatzeit – bitte Jahr prüfen.');
          set.response_due = due;
        }
        if (p.reference !== undefined) {
          set.reference = str(p.reference, { max: 80 });
          // gleiche Dublettenregel wie beim Anlegen (Umgebung + Behörde + Aktenzeichen) – vorher über „Ändern“ umgehbar
          const dup = set.reference && set.reference !== f.reference ? await env.DB.prepare('SELECT id, fine_no FROM fines WHERE environment=? AND reference=? AND authority=? AND id<>?').bind(envName, set.reference, f.authority, id).first() : null;
          if (dup) throw conflict('duplicate_fine', `Aktenzeichen bereits erfasst (${dup.fine_no}).`, { id: dup.id });
        }
        // nichts geändert: keine neue Version, kein Verlaufseintrag (ein offenes Formular bekam sonst unnötig 409, 18.10.2026)
        if (!Object.keys(set).length || Object.keys(set).every((k) => (set[k] ?? null) === (f[k] ?? null))) return { ok: true, version: f.version, unchanged: true };
        payload = { ...set };
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
    const refGuard = set.reference && set.reference !== f.reference
      ? [env.DB.prepare('INSERT INTO cmd_guard(ok) SELECT CASE WHEN EXISTS (SELECT 1 FROM fines WHERE environment=? AND reference=? AND authority=? AND id<>?) THEN 0 ELSE 1 END').bind(envName, set.reference, f.authority, id), env.DB.prepare('DELETE FROM cmd_guard')]
      : [];
    await env.DB.batch([
      ...refGuard,
      // Fahrer neu ermittelt: Hinweise des bisherigen Fahrers ausblenden (Link führte auf 404, zurückgehaltener Push ging noch raus – 17.10.2026)
      ...(action === 'confirm_driver' && f.driver_id ? [env.DB.prepare(`UPDATE notifications SET hidden_at=? WHERE user_id=? AND ref=? AND hidden_at IS NULL
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
      const dup = set.reference && set.reference !== f.reference ? await env.DB.prepare('SELECT id, fine_no FROM fines WHERE environment=? AND reference=? AND authority=? AND id<>?').bind(envName, set.reference, f.authority, id).first() : null;
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
  return { ok: true, version: f.version + 1 };
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
  const ins = await env.DB.prepare(`INSERT INTO files(id,case_id,fine_id,environment,r2_key,filename,content_type,size,sha256,uploaded_by,created_at)
    SELECT ?1,NULL,?2,?3,?4,?5,?6,?7,?8,?9,?10 WHERE (SELECT COUNT(*) FROM files WHERE fine_id=?2) < ?11 AND NOT EXISTS (SELECT 1 FROM files WHERE fine_id=?2 AND sha256=?8)`)
    .bind(fid, id, envName, key, name, type, buf.length, sha, user.id, nowIso(), MAX_FINE_FILES).run();
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
const KIND_DE = { anhoerung: 'Anhörung', zeugenfragebogen: 'Zeugenfragebogen', bussgeldbescheid: 'Bußgeldbescheid', verwarnung: 'Verwarnung', maut: 'Maut', sonstiges: 'Sonstiges' };
export function finesCsv(rows, csvCell, withDriver) {
  const head = ['Vorgang', 'Art', 'Behörde', 'Aktenzeichen', 'Tatvorwurf', 'Tatzeit', 'Ort', 'Kennzeichen laut Schreiben', 'Fahrzeug', 'Betrag (EUR)', 'Antwortfrist', 'Status', ...(withDriver ? ['Fahrer'] : [])];
  const lines = [head.join(';')];
  for (const f of rows) lines.push([csvCell(f.fine_no), KIND_DE[f.kind] || f.kind, csvCell(f.authority), csvCell(f.reference), OFFENSE_DE[f.offense_type] || csvCell(f.offense_type), berlinDateTime(f.offense_at) || csvCell(f.offense_at), csvCell(f.location),
    csvCell(f.plate_in_letter), csvCell(f.plate), f.amount_eur === null || f.amount_eur === undefined ? '' : String(f.amount_eur).replace('.', ','), f.response_due || '', FINE_STATUS_DE[f.status] || csvCell(f.status),
    ...(withDriver ? [csvCell(f.driver_name || f.driver_name_note)] : [])].join(';'));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}
// Fristenkalender: nur Antwortfristen laut Schreiben offener Vorgänge, ohne Fahrernamen (Kalender werden oft geteilt)
// Texte in der Sprache der Person (lang; DE/UK/EN, sonst Deutsch); Behörde/Aktenzeichen wie gespeichert
export function finesIcs(rows, warnDays, icsCalendar, site = null, lang = 'de') {
  const I = icsLang(lang);
  const open = rows.filter((f) => f.response_due && !['bezahlt', 'eingestellt', 'erledigt', 'beantwortet'].includes(f.status));
  return icsCalendar(`${I.tx('cal_fines')}${site ? ' – ' + (site === 'ohne' ? I.tx('no_site') : site) : ''}`, open.map((f) => ({ uid: `fine-${f.id}`, date: f.response_due,
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
  for (const f of rows) {
    const label = `${f.fine_no} (${f.plate || f.plate_in_letter}, ${f.authority})`;
    if (f.response_due) {
      const days = Math.round((Date.parse(f.response_due) - Date.parse(today)) / 86400000);
      if (days < 0) out.push({ code: 'FINE_OVERDUE', f, severity: 'handeln', requires_decision: 1, ...fm('FINE_OVERDUE', { label, due: f.response_due }), next_action: 'Sofort beantworten bzw. Fristverlängerung klären.' });
      else if (warnDays !== null && days <= warnDays) out.push({ code: 'FINE_DUE_SOON', f, severity: 'hinweis', requires_decision: 0, ...fm('FINE_DUE_SOON', { label, due: f.response_due, days }), next_action: 'Fahrer ermitteln und Schreiben beantworten.' });
    }
    if (!f.vehicle_id) out.push({ code: 'FINE_VEHICLE_UNKNOWN', f, severity: 'hinweis', requires_decision: 0, ...fm('FINE_VEHICLE_UNKNOWN', { label, plate: f.plate_in_letter }), next_action: 'Kennzeichen prüfen (Fremd-/Mietfahrzeug?).' });
    else if (f.status === 'eingegangen') out.push({ code: 'FINE_DRIVER_OPEN', f, severity: 'hinweis', requires_decision: 0, ...fm('FINE_DRIVER_OPEN', { label }), next_action: 'Fahrer anhand Zuordnung/Tourenplan/Telematik bestätigen.' });
  }
  return out;
}
