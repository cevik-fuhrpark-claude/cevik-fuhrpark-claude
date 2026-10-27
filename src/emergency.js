// [CLAUDE] Panne & Notfall: Rufnummern für unterwegs, vom Betrieb eingetragen (die App gibt keine Nummern vor – feste Nummer nur Notruf 112
// in der Oberfläche). Geltung: alle Fahrzeuge, ein Standort (laut Fahrzeugstamm, Schreibweisen zusammengefasst) oder ein Fahrzeug.
// Je Umgebung getrennt (Test/Betrieb). Archiv statt Löschen. Lesen: alle angemeldeten Rollen (Fahrer brauchen die Nummern unterwegs);
// gepflegt von Inhaber, Fuhrparkleitung und Disposition.
import { nowIso, uuid, bad, forbidden, notFound, str, normPlate, conflict, laterIso, flag } from './util.js';
import { normDays, isHm } from '../public/emhours.js';
import { AXLES, axleFits } from './tires.js';
import { audit } from './auth.js';
import { siteKey, siteLabels } from './reports.js';

export const EMERGENCY_KINDS = ['dispo', 'panne', 'werkstatt', 'versicherung', 'sonstiges'];
export const EMERGENCY_MAX_ACTIVE = 50;
export const EMERGENCY_ARCHIVE_MAX = 200; // Archiv-Anzeige: neueste 200 (eine Zeile mehr gelesen → truncated; alle Änderungen im Protokoll)
const WRITE = ['owner', 'fleet', 'dispatch'];
const KIND_ORDER = (k) => EMERGENCY_KINDS.indexOf(k);
const sortContacts = (a, b) => KIND_ORDER(a.kind) - KIND_ORDER(b.kind) || a.label.localeCompare(b.label, 'de');

// Rufnummer: Ziffern mit üblichen Trennzeichen, optional führendes +; 3–20 Ziffern. Gespeichert wie eingegeben (Leerzeichen zusammengefasst).
export function normPhone(v) {
  const s = str(v, { required: true, max: 30, field: 'Telefonnummer' }).replace(/\s+/g, ' ');
  const digits = s.replace(/\D/g, '').length;
  if (!/^\+?[0-9(][0-9 ()/.-]*[0-9]$/.test(s) || digits < 3 || digits > 20) throw bad('validation', 'Telefonnummer: nur Ziffern, Leerzeichen, + ( ) / - (3 bis 20 Ziffern).');
  return s;
}

// Rufnummern-Vergleich nach Ziffern: „0231 123456“, „0231/123456“, „0231-123456“ sind dieselbe Nummer (17.10.2026: viermal angelegt)
// „+49 (0)231 …“: die (0) wird international nicht gewählt – gilt als dieselbe Nummer wie „+49 231 …“ (18.10.2026)
const PK0 = (x) => [' ', '/', '-', '.', '(', ')'].reduce((a, ch) => `REPLACE(${a},'${ch}','')`, `REPLACE(${x},'(0)','')`);
// deutsche Vorwahl: „+49 231 …“ / „0049 231 …“ = „0231 …“ (19.10.2026: wurden als zwei Nummern angelegt); andere Ländervorwahlen bleiben wie erfasst
const PK = (x) => { const p = PK0(x); return `(CASE WHEN substr(${p},1,3)='+49' THEN '0'||substr(${p},4) WHEN substr(${p},1,4)='0049' THEN '0'||substr(${p},5) ELSE ${p} END)`; };
// dieselbe Regel in JS (für Abfragen mit unnummerierten Parametern – PK wiederholt seinen Ausdruck)
export const phoneKey = (x) => { const p = String(x).replaceAll('(0)', '').replace(/[ /.()-]/g, ''); return p.startsWith('+49') ? '0' + p.slice(3) : p.startsWith('0049') ? '0' + p.slice(4) : p; };
// Erreichbarkeit laut Eintrag (Backlog 427): null = keine Zeiten eingetragen
const hoursOf = (r) => (r.hours_days ? { days: r.hours_days, from: r.hours_from || null, to: r.hours_to || null, no_holidays: !!r.hours_no_holidays } : null);
const pub = (r) => ({ id: r.id, kind: r.kind, label: r.label, phone: r.phone, note: r.note || null, scope: r.vehicle_id ? 'vehicle' : r.site ? 'site' : 'all', site: r.site || null, hours: hoursOf(r) });
const HCOLS = 'hours_days, hours_from, hours_to, hours_no_holidays';

async function activeContacts(env, envName) {
  return (await env.DB.prepare(`SELECT id, kind, label, phone, note, site, vehicle_id, ${HCOLS} FROM emergency_contacts WHERE environment=? AND archived_at IS NULL`).bind(envName).all()).results;
}

// Anzeige „Panne & Notfall“: allgemeine Nummern + je Fahrzeug die Nummern für dessen Standort bzw. das Fahrzeug selbst.
// Fahrzeuge: ?vehicle_id= (z. B. nach QR-Scan) – sonst bei Fahrern die aktuell zugeordneten Fahrzeuge.
export async function emergencyView(env, user, envName, query = {}) {
  let vehicles = [];
  if (query.vehicle_id) {
    const v = await env.DB.prepare('SELECT id, plate, site FROM vehicles WHERE id=?').bind(String(query.vehicle_id).slice(0, 40)).first();
    if (!v) throw notFound('Fahrzeug nicht gefunden.');
    vehicles = [v];
  } else if (user.role === 'driver') {
    vehicles = (await env.DB.prepare(`SELECT v.id, v.plate, v.site FROM driver_vehicles d JOIN vehicles v ON v.id=d.vehicle_id
      WHERE d.user_id=? AND (d.valid_to IS NULL OR d.valid_to > ?) AND v.active=1 ORDER BY d.valid_from DESC LIMIT 10`).bind(user.id, nowIso()).all()).results;
  }
  {
    // auch nach QR-Scan (?vehicle_id=) – Lkw-Aufkleber zeigt die Hotline des Aufliegers (18.10.2026)
    // fest gekoppelter Anhänger bzw. Zugmaschine laut Stammliste (wie „Mein Fahrzeug“) – z. B. Hotline des Kühlaufliegers (17.10.2026)
    if (vehicles.length) {
      const pool = (await env.DB.prepare(`SELECT id, plate, site, kind, trailer_plate FROM vehicles WHERE active=1 AND (kind='anhaenger' OR (kind='lkw' AND trailer_plate IS NOT NULL AND trailer_plate<>'')) ORDER BY COALESCE(eval_excluded,0), created_at`).all()).results; // bewertetes vor ruhendem Doppel (wie „Mein Fahrzeug“)
      const own = (await env.DB.prepare(`SELECT id, kind, trailer_plate FROM vehicles WHERE id IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(vehicles.map((v) => v.id))).all()).results;
      for (const o of own) {
        const ov = vehicles.find((v) => v.id === o.id);
        const p = o.kind === 'anhaenger' ? pool.find((x) => x.kind === 'lkw' && normPlate(x.trailer_plate) === normPlate(ov.plate))
          : o.trailer_plate ? pool.find((x) => x.kind === 'anhaenger' && normPlate(x.plate) === normPlate(o.trailer_plate)) : null;
        if (p && !vehicles.some((v) => v.id === p.id)) vehicles.push({ id: p.id, plate: p.plate, site: p.site });
      }
    }
  }
  const all = await activeContacts(env, envName);
  const general = all.filter((c) => !c.site && !c.vehicle_id).sort(sortContacts).map(pub);
  // jede Nummer nur einmal je Ansicht (20.10.2026: Standort-Nummer erschien bei Zugmaschine und Anhänger desselben Standorts doppelt) –
  // fahrzeugbezogene zuerst vergeben, Standort-Nummern beim ersten Fahrzeug des Standorts
  const shown = new Set(all.filter((c) => c.vehicle_id && vehicles.some((v) => v.id === c.vehicle_id)).map((c) => c.id));
  const out = vehicles.map((v) => ({ id: v.id, plate: v.plate,
    contacts: all.filter((c) => c.vehicle_id === v.id || (!c.vehicle_id && c.site && v.site && siteKey(c.site) === siteKey(v.site) && !shown.has(c.id) && shown.add(c.id)))
      .sort((a, b) => (a.vehicle_id ? 0 : 1) - (b.vehicle_id ? 0 : 1) || sortContacts(a, b)).map(pub) }));
  // Backlog 428 (Blickwinkel „Pannendienst fragt nach FIN, Hersteller und Reifengröße“): Fahrzeugangaben aus dem Stamm, ohne Netz mit gespeichert.
  // Nur vorhandene Werte (fehlend = nicht angezeigt); Reifengrößen je Achse mit Prüfstatus (am Fahrzeug bestätigt oder nur laut Quelle).
  if (out.length) {
    const ids = JSON.stringify(out.map((v) => v.id));
    const [info, specs] = await Promise.all([
      env.DB.prepare('SELECT id, kind, manufacturer, model FROM vehicles WHERE id IN (SELECT value FROM json_each(?))').bind(ids).all(),
      env.DB.prepare('SELECT vehicle_id, axle, size, verified FROM tire_specs WHERE vehicle_id IN (SELECT value FROM json_each(?))').bind(ids).all()]);
    for (const v of out) {
      const i = info.results.find((x) => x.id === v.id) || {};
      v.vin = String(v.id).startsWith('VIN:') ? v.id.slice(4) : null; v.kind = i.kind || null; v.manufacturer = i.manufacturer || null; v.model = i.model || null;
      v.tires = specs.results.filter((x) => x.vehicle_id === v.id && axleFits(i.kind, x.axle)).sort((a, b) => AXLES.indexOf(a.axle) - AXLES.indexOf(b.axle)).map((x) => ({ axle: x.axle, size: x.size, verified: !!x.verified }));
    }
  }
  return { general, vehicles: out, can_edit: WRITE.includes(user.role) };
}

// Pflegeliste (aktiv bzw. Archiv) mit Geltung, Kennzeichen und letzter Änderung
export async function listContacts(env, user, envName, query = {}) {
  if (!WRITE.includes(user.role)) throw forbidden();
  const archived = query.archived === '1';
  const rows = (await env.DB.prepare(`SELECT c.id, c.kind, c.label, c.phone, c.note, c.site, c.vehicle_id, c.hours_days, c.hours_from, c.hours_to, c.hours_no_holidays, v.plate, v.active AS vehicle_active, c.created_at, c.updated_at, c.archived_at,
      COALESCE(uu.display_name, cu.display_name) AS changed_by_name, au.display_name AS archived_by_name
    FROM emergency_contacts c LEFT JOIN vehicles v ON v.id=c.vehicle_id JOIN users cu ON cu.id=c.created_by LEFT JOIN users uu ON uu.id=c.updated_by LEFT JOIN users au ON au.id=c.archived_by
    WHERE c.environment=? AND c.archived_at IS ${archived ? 'NOT NULL' : 'NULL'} ORDER BY ${archived ? 'c.archived_at DESC, c.rowid DESC' : 'c.created_at'} LIMIT ?`).bind(envName, EMERGENCY_ARCHIVE_MAX + 1).all()).results;
  const truncated = archived && rows.length > EMERGENCY_ARCHIVE_MAX; if (rows.length > EMERGENCY_ARCHIVE_MAX) rows.length = EMERGENCY_ARCHIVE_MAX;
  const contacts = rows.map((r) => ({ ...pub(r), plate: r.plate || null, vehicle_id: r.vehicle_id || null, ...(r.vehicle_id ? { vehicle_active: !!r.vehicle_active } : {}), created_at: r.created_at, updated_at: r.updated_at, changed_by_name: r.changed_by_name, archived_at: r.archived_at, archived_by_name: r.archived_by_name || null }));
  if (!archived) contacts.sort((a, b) => ({ all: 0, site: 1, vehicle: 2 }[a.scope] - { all: 0, site: 1, vehicle: 2 }[b.scope]) || sortContacts(a, b));
  return { contacts, kinds: EMERGENCY_KINDS, max_active: EMERGENCY_MAX_ACTIVE, ...(archived ? { truncated, archive_max: EMERGENCY_ARCHIVE_MAX } : {}) };
}

// Erreichbarkeit (Backlog 427): Wochentage (Pflicht, sobald etwas angegeben ist), Uhrzeit von/bis beide oder keine (HH:MM, deutsche Zeit;
// Ende vor Beginn = über Mitternacht), „nicht an bundesweiten Feiertagen“. Leere Wochentage = keine Zeiten eingetragen (alles leer).
// PATCH: nur mitgesendete Felder ändern sich; die Prüfung gilt für das Ergebnis.
function readHours(body, ex) {
  const has = (k) => body[k] !== undefined;
  const any = ['hours_days', 'hours_from', 'hours_to', 'hours_no_holidays'].some(has);
  if (!any) return { hours_days: ex.hours_days ?? null, hours_from: ex.hours_from ?? null, hours_to: ex.hours_to ?? null, hours_no_holidays: ex.hours_no_holidays ?? null };
  const rawDays = has('hours_days') ? body.hours_days : ex.hours_days;
  const tm = (k) => { const v = has(k) ? body[k] : ex[k]; return v === null || v === undefined || v === '' ? null : String(v).trim(); };
  const from = tm('hours_from'); const to = tm('hours_to');
  const noHol = has('hours_no_holidays') ? flag(body.hours_no_holidays, 'Nicht an Feiertagen') : !!ex.hours_no_holidays;
  const empty = rawDays === null || rawDays === undefined || rawDays === '' || (Array.isArray(rawDays) && !rawDays.length);
  if (empty) {
    if (from || to || (has('hours_no_holidays') && noHol)) throw bad('validation', 'Erreichbarkeit: bitte die Wochentage wählen.');
    return { hours_days: null, hours_from: null, hours_to: null, hours_no_holidays: null };
  }
  const days = normDays(rawDays);
  if (!days) throw bad('validation', 'Erreichbarkeit: Wochentage ungültig.');
  if (!!from !== !!to || (from && (!isHm(from) || !isHm(to)))) throw bad('validation', 'Erreichbarkeit: Uhrzeit „von“ und „bis“ beide angeben (HH:MM) oder beide leer lassen.');
  return { hours_days: days, hours_from: from, hours_to: to, hours_no_holidays: noHol ? 1 : null };
}

async function readBody(env, body, existing = {}) {
  const pick = (k) => (body[k] !== undefined ? body[k] : existing[k]);
  const kind = pick('kind');
  if (!EMERGENCY_KINDS.includes(kind)) throw bad('validation', 'Art der Rufnummer: ungültiger Wert.');
  const label = str(pick('label'), { required: true, max: 60, field: 'Bezeichnung' });
  if (label.length < 2) throw bad('validation', 'Bezeichnung ist zu kurz.');
  const phone = normPhone(pick('phone'));
  const note = str(pick('note'), { max: 200, field: 'Hinweis' });
  const hours = readHours(body, existing);
  // Geltung: scope all | site | vehicle (Standard: bisherige Geltung, sonst alle)
  const scope = body.scope !== undefined ? body.scope : existing.vehicle_id ? 'vehicle' : existing.site ? 'site' : 'all';
  let site = null; let vehicleId = null;
  if (scope === 'site') {
    const raw = str(body.site !== undefined ? body.site : existing.site, { max: 60, field: 'Standort' });
    if (!raw) throw bad('validation', 'Standort angeben.');
    // Standort unverändert (z. B. nur Nummer korrigiert): ohne Stammprüfung behalten – sonst ließ sich eine Nummer nicht mehr korrigieren,
    // sobald kein Fahrzeug mehr an diesem Standort steht (18.10.2026)
    if (existing.site && siteKey(raw) === siteKey(existing.site)) return { kind, label, phone, note, site: existing.site, vehicle_id: null, ...hours };
    const labels = siteLabels((await env.DB.prepare('SELECT site FROM vehicles').all()).results);
    if (siteKey(raw) === 'ohne' || !labels.has(siteKey(raw))) throw bad('validation', 'Standort ist im Fahrzeugstamm nicht vorhanden.');
    site = labels.get(siteKey(raw));
  } else if (scope === 'vehicle') {
    const vid = str(body.vehicle_id !== undefined ? body.vehicle_id : existing.vehicle_id, { max: 40, field: 'Fahrzeug' });
    if (!vid) throw bad('validation', 'Fahrzeug angeben.');
    const veh = await env.DB.prepare('SELECT id, active FROM vehicles WHERE id=?').bind(vid).first();
    if (!veh) throw notFound('Fahrzeug nicht gefunden.');
    // neue/umgehängte fahrzeugbezogene Nummer nur an Fahrzeugen in Betrieb (wie Fahrerzuordnung/Termin); bestehende bleibt korrigierbar (23.10.2026)
    if (!veh.active && vid !== existing.vehicle_id) throw bad('validation', 'Fahrzeug ist außer Betrieb.');
    vehicleId = vid;
  } else if (scope !== 'all') throw bad('validation', 'Geltung: ungültiger Wert.');
  return { kind, label, phone, note, site, vehicle_id: vehicleId, ...hours };
}

// Standort einer Rufnummer in der Schreibweise einer schon aktiven Nummer desselben Standorts (Groß-/Kleinschreibung, Leerzeichen):
// die Stammliste kann ihre häufigste Schreibweise ändern („Dortmund“ → „DORTMUND“) – die Dublettenprüfung vergleicht exakt (18.10.2026)
async function sameSiteSpelling(env, envName, f, selfId = null) {
  if (!f.site) return;
  const same = (await activeContacts(env, envName)).find((c) => c.id !== selfId && c.site && siteKey(c.site) === siteKey(f.site));
  if (same) f.site = same.site;
}

export async function addContact(env, user, envName, body) {
  if (!WRITE.includes(user.role)) throw forbidden();
  const f = await readBody(env, body || {});
  await sameSiteSpelling(env, envName, f);
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM emergency_contacts WHERE environment=? AND archived_at IS NULL').bind(envName).first();
  if (n.n >= EMERGENCY_MAX_ACTIVE) throw bad('validation', 'Höchstens 50 aktive Rufnummern – bitte nicht mehr gültige archivieren.');
  const id = uuid(); const now = nowIso();
  // Höchstzahl in derselben Anweisung (parallele Anlagen überschritten sie vorher, 17.10.2026)
  const r = await env.DB.prepare(`INSERT INTO emergency_contacts(id,environment,kind,label,phone,note,site,vehicle_id,created_by,created_at,updated_at,hours_days,hours_from,hours_to,hours_no_holidays) SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?13,?14,?15,?16
    WHERE (SELECT COUNT(*) FROM emergency_contacts WHERE environment=?2 AND archived_at IS NULL) < ?12
      AND NOT EXISTS (SELECT 1 FROM emergency_contacts WHERE environment=?2 AND archived_at IS NULL AND ${PK('phone')}=${PK('?5')} AND kind=?3 AND site IS ?7 AND vehicle_id IS ?8)`)
    .bind(id, envName, f.kind, f.label, f.phone, f.note, f.site, f.vehicle_id, user.id, now, now, EMERGENCY_MAX_ACTIVE, f.hours_days, f.hours_from, f.hours_to, f.hours_no_holidays).run();
  if (!(r.meta && r.meta.changes)) {
    // dieselbe Rufnummer mit derselben Art und Geltung ist bereits aktiv (Doppelklick/parallel ergab sonst zwei gleiche Einträge, 17.10.2026)
    if (await env.DB.prepare(`SELECT 1 AS x FROM emergency_contacts WHERE environment=? AND archived_at IS NULL AND ${PK('phone')}=? AND kind=? AND site IS ? AND vehicle_id IS ?`).bind(envName, phoneKey(f.phone), f.kind, f.site, f.vehicle_id).first()) throw conflict('duplicate_contact', 'Diese Rufnummer ist mit derselben Art und Geltung bereits eingetragen.');
    throw bad('validation', 'Höchstens 50 aktive Rufnummern – bitte nicht mehr gültige archivieren.');
  }
  await audit(env, user.id, 'emergency.add', id, { environment: envName, ...f });
  return { id };
}

export async function updateContact(env, user, envName, id, body) {
  if (!WRITE.includes(user.role)) throw forbidden();
  const ex = await env.DB.prepare('SELECT * FROM emergency_contacts WHERE id=? AND environment=? AND archived_at IS NULL').bind(id, envName).first();
  if (!ex) throw notFound('Rufnummer nicht gefunden oder archiviert.');
  // Formular aus älterer Ansicht (sendet alle Felder): nur auf dem gelesenen Stand speichern – sonst setzte es eine inzwischen
  // korrigierte Nummer still zurück (17.10.2026)
  if (body && body.expected_updated_at && String(body.expected_updated_at) !== ex.updated_at) throw conflict('version_conflict', 'Rufnummer wurde zwischenzeitlich geändert. Bitte neu laden.');
  const f = await readBody(env, body || {}, ex);
  await sameSiteSpelling(env, envName, f, id);
  const changed = Object.keys(f).filter((k) => (f[k] ?? null) !== (ex[k] ?? null));
  if (!changed.length) return { ok: true, changed: [] };
  // atomar: nicht archiviert und unverändert seit dem Lesen (gleichzeitiges Archivieren/Ändern)
  // dieselbe Dublettenregel wie beim Anlegen (Ändern erzeugte vorher die Dublette, die die Anlage abweist, 17.10.2026)
  const r = await env.DB.prepare(`UPDATE emergency_contacts SET kind=?1, label=?2, phone=?3, note=?4, site=?5, vehicle_id=?6, updated_by=?7, updated_at=?8, hours_days=?12, hours_from=?13, hours_to=?14, hours_no_holidays=?15 WHERE id=?9 AND archived_at IS NULL AND updated_at=?10
      AND NOT EXISTS (SELECT 1 FROM emergency_contacts d WHERE d.environment=?11 AND d.archived_at IS NULL AND d.id<>?9 AND ${PK('d.phone')}=${PK('?3')} AND d.kind=?1 AND d.site IS ?5 AND d.vehicle_id IS ?6)`)
    .bind(f.kind, f.label, f.phone, f.note, f.site, f.vehicle_id, user.id, laterIso(ex.updated_at), id, ex.updated_at, envName, f.hours_days, f.hours_from, f.hours_to, f.hours_no_holidays).run();
  if ((!r.meta || r.meta.changes !== 1) && await env.DB.prepare(`SELECT 1 AS x FROM emergency_contacts WHERE environment=? AND archived_at IS NULL AND id<>? AND ${PK('phone')}=? AND kind=? AND site IS ? AND vehicle_id IS ?`).bind(envName, id, phoneKey(f.phone), f.kind, f.site, f.vehicle_id).first()) throw conflict('duplicate_contact', 'Diese Rufnummer ist mit derselben Art und Geltung bereits eingetragen.');
  if (!r.meta || r.meta.changes !== 1) throw conflict('version_conflict', 'Rufnummer wurde zwischenzeitlich geändert oder archiviert. Bitte neu laden.');
  await audit(env, user.id, 'emergency.update', id, Object.fromEntries(changed.map((k) => [k, { from: ex[k] ?? null, to: f[k] ?? null }])));
  return { ok: true, changed };
}

export async function archiveContact(env, user, envName, id) {
  if (!WRITE.includes(user.role)) throw forbidden();
  const r = await env.DB.prepare('UPDATE emergency_contacts SET archived_at=?, archived_by=? WHERE id=? AND environment=? AND archived_at IS NULL').bind(nowIso(), user.id, id, envName).run();
  if (!r.meta || r.meta.changes !== 1) throw notFound('Rufnummer nicht gefunden oder archiviert.');
  await audit(env, user.id, 'emergency.archive', id, null);
  return { ok: true };
}
