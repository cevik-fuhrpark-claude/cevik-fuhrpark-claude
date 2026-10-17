// [CLAUDE] Panne & Notfall: Rufnummern für unterwegs, vom Betrieb eingetragen (die App gibt keine Nummern vor – feste Nummer nur Notruf 112
// in der Oberfläche). Geltung: alle Fahrzeuge, ein Standort (laut Fahrzeugstamm, Schreibweisen zusammengefasst) oder ein Fahrzeug.
// Je Umgebung getrennt (Test/Betrieb). Archiv statt Löschen. Lesen: alle angemeldeten Rollen (Fahrer brauchen die Nummern unterwegs);
// gepflegt von Inhaber, Fuhrparkleitung und Disposition.
import { nowIso, uuid, bad, forbidden, notFound, str, normPlate, conflict, laterIso } from './util.js';
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

const pub = (r) => ({ id: r.id, kind: r.kind, label: r.label, phone: r.phone, note: r.note || null, scope: r.vehicle_id ? 'vehicle' : r.site ? 'site' : 'all', site: r.site || null });

async function activeContacts(env, envName) {
  return (await env.DB.prepare('SELECT id, kind, label, phone, note, site, vehicle_id FROM emergency_contacts WHERE environment=? AND archived_at IS NULL').bind(envName).all()).results;
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
    // fest gekoppelter Anhänger bzw. Zugmaschine laut Stammliste (wie „Mein Fahrzeug“) – z. B. Hotline des Kühlaufliegers (17.10.2026)
    if (vehicles.length) {
      const pool = (await env.DB.prepare(`SELECT id, plate, site, kind, trailer_plate FROM vehicles WHERE active=1 AND (kind='anhaenger' OR (kind='lkw' AND trailer_plate IS NOT NULL AND trailer_plate<>''))`).all()).results;
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
  const out = vehicles.map((v) => ({ id: v.id, plate: v.plate,
    contacts: all.filter((c) => c.vehicle_id === v.id || (c.site && v.site && siteKey(c.site) === siteKey(v.site))).sort((a, b) => (a.vehicle_id ? 0 : 1) - (b.vehicle_id ? 0 : 1) || sortContacts(a, b)).map(pub) }));
  return { general, vehicles: out, can_edit: WRITE.includes(user.role) };
}

// Pflegeliste (aktiv bzw. Archiv) mit Geltung, Kennzeichen und letzter Änderung
export async function listContacts(env, user, envName, query = {}) {
  if (!WRITE.includes(user.role)) throw forbidden();
  const archived = query.archived === '1';
  const rows = (await env.DB.prepare(`SELECT c.id, c.kind, c.label, c.phone, c.note, c.site, c.vehicle_id, v.plate, c.created_at, c.updated_at, c.archived_at,
      COALESCE(uu.display_name, cu.display_name) AS changed_by_name, au.display_name AS archived_by_name
    FROM emergency_contacts c LEFT JOIN vehicles v ON v.id=c.vehicle_id JOIN users cu ON cu.id=c.created_by LEFT JOIN users uu ON uu.id=c.updated_by LEFT JOIN users au ON au.id=c.archived_by
    WHERE c.environment=? AND c.archived_at IS ${archived ? 'NOT NULL' : 'NULL'} ORDER BY ${archived ? 'c.archived_at DESC, c.rowid DESC' : 'c.created_at'} LIMIT ?`).bind(envName, EMERGENCY_ARCHIVE_MAX + 1).all()).results;
  const truncated = archived && rows.length > EMERGENCY_ARCHIVE_MAX; if (rows.length > EMERGENCY_ARCHIVE_MAX) rows.length = EMERGENCY_ARCHIVE_MAX;
  const contacts = rows.map((r) => ({ ...pub(r), plate: r.plate || null, vehicle_id: r.vehicle_id || null, created_at: r.created_at, updated_at: r.updated_at, changed_by_name: r.changed_by_name, archived_at: r.archived_at, archived_by_name: r.archived_by_name || null }));
  if (!archived) contacts.sort((a, b) => ({ all: 0, site: 1, vehicle: 2 }[a.scope] - { all: 0, site: 1, vehicle: 2 }[b.scope]) || sortContacts(a, b));
  return { contacts, kinds: EMERGENCY_KINDS, max_active: EMERGENCY_MAX_ACTIVE, ...(archived ? { truncated, archive_max: EMERGENCY_ARCHIVE_MAX } : {}) };
}

async function readBody(env, body, existing = {}) {
  const pick = (k) => (body[k] !== undefined ? body[k] : existing[k]);
  const kind = pick('kind');
  if (!EMERGENCY_KINDS.includes(kind)) throw bad('validation', 'Art der Rufnummer: ungültiger Wert.');
  const label = str(pick('label'), { required: true, max: 60, field: 'Bezeichnung' });
  if (label.length < 2) throw bad('validation', 'Bezeichnung ist zu kurz.');
  const phone = normPhone(pick('phone'));
  const note = str(pick('note'), { max: 200, field: 'Hinweis' });
  // Geltung: scope all | site | vehicle (Standard: bisherige Geltung, sonst alle)
  const scope = body.scope !== undefined ? body.scope : existing.vehicle_id ? 'vehicle' : existing.site ? 'site' : 'all';
  let site = null; let vehicleId = null;
  if (scope === 'site') {
    const raw = str(body.site !== undefined ? body.site : existing.site, { max: 60, field: 'Standort' });
    if (!raw) throw bad('validation', 'Standort angeben.');
    const labels = siteLabels((await env.DB.prepare('SELECT site FROM vehicles').all()).results);
    if (siteKey(raw) === 'ohne' || !labels.has(siteKey(raw))) throw bad('validation', 'Standort ist im Fahrzeugstamm nicht vorhanden.');
    site = labels.get(siteKey(raw));
  } else if (scope === 'vehicle') {
    const vid = str(body.vehicle_id !== undefined ? body.vehicle_id : existing.vehicle_id, { max: 40, field: 'Fahrzeug' });
    if (!vid) throw bad('validation', 'Fahrzeug angeben.');
    if (!(await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vid).first())) throw notFound('Fahrzeug nicht gefunden.');
    vehicleId = vid;
  } else if (scope !== 'all') throw bad('validation', 'Geltung: ungültiger Wert.');
  return { kind, label, phone, note, site, vehicle_id: vehicleId };
}

export async function addContact(env, user, envName, body) {
  if (!WRITE.includes(user.role)) throw forbidden();
  const f = await readBody(env, body || {});
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM emergency_contacts WHERE environment=? AND archived_at IS NULL').bind(envName).first();
  if (n.n >= EMERGENCY_MAX_ACTIVE) throw bad('validation', 'Höchstens 50 aktive Rufnummern – bitte nicht mehr gültige archivieren.');
  const id = uuid(); const now = nowIso();
  // Höchstzahl in derselben Anweisung (parallele Anlagen überschritten sie vorher, 17.10.2026)
  const r = await env.DB.prepare(`INSERT INTO emergency_contacts(id,environment,kind,label,phone,note,site,vehicle_id,created_by,created_at,updated_at) SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11
    WHERE (SELECT COUNT(*) FROM emergency_contacts WHERE environment=?2 AND archived_at IS NULL) < ?12`)
    .bind(id, envName, f.kind, f.label, f.phone, f.note, f.site, f.vehicle_id, user.id, now, now, EMERGENCY_MAX_ACTIVE).run();
  if (!(r.meta && r.meta.changes)) throw bad('validation', 'Höchstens 50 aktive Rufnummern – bitte nicht mehr gültige archivieren.');
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
  const changed = Object.keys(f).filter((k) => (f[k] ?? null) !== (ex[k] ?? null));
  if (!changed.length) return { ok: true, changed: [] };
  // atomar: nicht archiviert und unverändert seit dem Lesen (gleichzeitiges Archivieren/Ändern)
  const r = await env.DB.prepare('UPDATE emergency_contacts SET kind=?, label=?, phone=?, note=?, site=?, vehicle_id=?, updated_by=?, updated_at=? WHERE id=? AND archived_at IS NULL AND updated_at=?')
    .bind(f.kind, f.label, f.phone, f.note, f.site, f.vehicle_id, user.id, laterIso(ex.updated_at), id, ex.updated_at).run();
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
