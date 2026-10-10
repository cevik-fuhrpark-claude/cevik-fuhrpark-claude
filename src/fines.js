// [CLAUDE] Bußgelder & Zeugenfragebögen: Erfassung, Fahrerermittlung zum Tatzeitpunkt mit Nachweis, Fristen, Information des Fahrers
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, num, oneOf, sha256Hex, berlinDate } from './util.js';
import { notifyUsers } from './notify.js';

export const FINE_KINDS = ['anhoerung', 'zeugenfragebogen', 'bussgeldbescheid', 'verwarnung', 'maut', 'sonstiges'];
export const OFFENSES = ['geschwindigkeit', 'abstand', 'parken', 'rotlicht', 'lenk_ruhezeit', 'ladung', 'maut', 'handy', 'sonstiges'];
export const FINE_STATUSES = ['eingegangen', 'fahrer_ermittelt', 'fahrer_informiert', 'beantwortet', 'bezahlt', 'eingestellt', 'erledigt'];
const BASES = ['zuordnung', 'tourenplan', 'telematik', 'fahrerangabe', 'manuell'];
const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';
const normPlate = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');

function shape(f, user) {
  if (isMgr(user) || user.role === 'viewer') return f;
  // Fahrer: nur eigene, ohne interne Nachweise
  const { driver_evidence, driver_confirmed_by, created_by, note, ...rest } = f;
  return rest;
}

export async function listFines(env, user, envName, query) {
  let rows;
  if (isMgr(user) || user.role === 'viewer') {
    const open = query.status === 'open';
    rows = (await env.DB.prepare(`SELECT f.*, v.plate, u.display_name AS driver_name FROM fines f LEFT JOIN vehicles v ON v.id=f.vehicle_id LEFT JOIN users u ON u.id=f.driver_id
      WHERE f.environment=? ${open ? "AND f.status NOT IN ('bezahlt','eingestellt','erledigt')" : ''}
      ORDER BY CASE WHEN f.response_due IS NULL THEN 1 ELSE 0 END, f.response_due, f.created_at DESC LIMIT 500`).bind(envName).all()).results;
  } else if (user.role === 'driver') {
    rows = (await env.DB.prepare(`SELECT f.*, v.plate FROM fines f LEFT JOIN vehicles v ON v.id=f.vehicle_id
      WHERE f.environment=? AND f.driver_id=? AND f.driver_informed_at IS NOT NULL ORDER BY f.offense_at DESC`).bind(envName, user.id).all()).results;
  } else throw forbidden();
  return rows.map((r) => shape(r, user));
}

async function loadFine(env, user, envName, id) {
  const f = await env.DB.prepare(`SELECT f.*, v.plate FROM fines f LEFT JOIN vehicles v ON v.id=f.vehicle_id WHERE f.id=? AND f.environment=?`).bind(id, envName).first();
  if (!f) throw notFound('Vorgang nicht gefunden.');
  if (isMgr(user) || user.role === 'viewer') return f;
  if (user.role === 'driver' && f.driver_id === user.id && f.driver_informed_at) return f;
  throw notFound('Vorgang nicht gefunden.');
}

// Mögliche Fahrer zum Tatzeitpunkt – nur aus belegten Quellen, keine Automatik-Zuordnung
export async function driverCandidates(env, envName, f) {
  if (!f.vehicle_id) return [];
  const out = [];
  const assigned = (await env.DB.prepare(`SELECT d.user_id, u.display_name, d.valid_from, d.valid_to, d.evidence FROM driver_vehicles d JOIN users u ON u.id=d.user_id
    WHERE d.vehicle_id=? AND u.environment=? AND d.valid_from <= ? AND (d.valid_to IS NULL OR d.valid_to > ?)`).bind(f.vehicle_id, envName, f.offense_at, f.offense_at).all()).results;
  for (const a of assigned) out.push({ user_id: a.user_id, display_name: a.display_name, basis: 'zuordnung', evidence: `Fahrzeugzuordnung seit ${a.valid_from.slice(0, 10)}${a.evidence ? ' (' + a.evidence + ')' : ''}` });
  const day = berlinDate(f.offense_at);
  const checks = (await env.DB.prepare(`SELECT i.performed_by AS user_id, u.display_name, i.created_at FROM inspections i JOIN users u ON u.id=i.performed_by
    WHERE i.vehicle_id=? AND i.environment=? AND i.kind='abfahrt' AND u.role='driver' AND i.created_at BETWEEN ? AND ?`)
    .bind(f.vehicle_id, envName, new Date(Date.parse(day + 'T00:00:00Z') - 4 * 3600000).toISOString(), new Date(Date.parse(day + 'T23:59:59Z') + 2 * 3600000).toISOString()).all()).results;
  for (const c of checks) {
    if (berlinDate(c.created_at) !== day) continue;
    out.push({ user_id: c.user_id, display_name: c.display_name, basis: 'manuell', evidence: `Abfahrtskontrolle am Tattag ${c.created_at.slice(11, 16)} UTC` });
  }
  return out;
}

export async function fineDetail(env, user, envName, id) {
  const f = await loadFine(env, user, envName, id);
  const events = (await env.DB.prepare(`SELECT e.*, u.display_name AS actor_name FROM fine_events e LEFT JOIN users u ON u.id=e.actor_id WHERE fine_id=? ORDER BY created_at`).bind(id).all()).results;
  const files = (await env.DB.prepare('SELECT id, filename, content_type, size, created_at FROM files WHERE fine_id=? ORDER BY created_at').bind(id).all()).results;
  const driver = f.driver_id ? await env.DB.prepare('SELECT display_name FROM users WHERE id=?').bind(f.driver_id).first() : null;
  const out = { fine: shape(f, user), files, driver_name: driver?.display_name || f.driver_name_note || null };
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
  const offenseAt = str(body.offense_at, { required: true, max: 30, field: 'Tatzeit' });
  if (Number.isNaN(Date.parse(offenseAt))) throw bad('validation', 'Tatzeit ungültig.');
  const plate = str(body.plate_in_letter, { required: true, max: 20, field: 'Kennzeichen' }).toUpperCase();
  const due = str(body.response_due, { max: 10 });
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw bad('validation', 'Frist im Format JJJJ-MM-TT.');
  const veh = (await env.DB.prepare('SELECT id, plate FROM vehicles WHERE active=1').all()).results.find((v) => normPlate(v.plate) === normPlate(plate));
  const reference = str(body.reference, { max: 80 });
  const authority = str(body.authority, { required: true, max: 200, field: 'Behörde' });
  if (reference) {
    const dup = await env.DB.prepare('SELECT id, fine_no FROM fines WHERE environment=? AND reference=? AND authority=?').bind(envName, reference, authority).first();
    if (dup) throw conflict('duplicate_fine', `Aktenzeichen bereits erfasst (${dup.fine_no}).`, { id: dup.id });
  }
  const year = new Date().getUTCFullYear();
  const c = await env.DB.prepare(`INSERT INTO fine_counters(environment, year, last_no) VALUES (?, ?, 1) ON CONFLICT(environment, year) DO UPDATE SET last_no = last_no + 1 RETURNING last_no`).bind(envName, year).first();
  const fineNo = `${envName === 'test' ? 'TB' : 'B'}-${year}-${String(c.last_no).padStart(4, '0')}`;
  const id = uuid();
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO fines(id,fine_no,environment,kind,authority,reference,offense_type,offense_at,location,plate_in_letter,vehicle_id,amount_eur,response_due,status,note,created_by,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'eingegangen',?,?,?,?)`).bind(id, fineNo, envName, kind, authority, reference, offense, new Date(offenseAt).toISOString(),
      str(body.location, { max: 200 }), plate, veh ? veh.id : null, num(body.amount_eur, { min: 0, max: 1e6, field: 'Betrag', nullable: true }), due,
      str(body.note, { max: 2000 }), user.id, now, now),
    env.DB.prepare('INSERT INTO fine_events(id,fine_id,actor_id,action,note,payload,created_at) VALUES (?,?,?,?,?,?,?)').bind(uuid(), id, user.id, 'create', null, JSON.stringify({ vehicle_matched: !!veh }), now),
  ]);
  return { id, fine_no: fineNo, vehicle_matched: !!veh };
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
    set.driver_ack_at = now;
  } else {
    if (!fineActions(user, f).includes(action)) throw forbidden(`Aktion „${action}“ ist hier nicht möglich.`);
    if (body.expected_version !== undefined && Number(body.expected_version) !== f.version) throw conflict('version_conflict', 'Vorgang wurde zwischenzeitlich geändert. Bitte neu laden.');
    switch (action) {
      case 'confirm_driver': {
        const basis = oneOf(p.basis, BASES, 'Grundlage');
        const evidence = str(p.evidence, { required: true, max: 500, field: 'Nachweis' });
        if (p.driver_id) {
          const d = await env.DB.prepare(`SELECT id FROM users WHERE id=? AND role='driver' AND environment=?`).bind(p.driver_id, envName).first();
          if (!d) throw bad('validation', 'Fahrer nicht gefunden.');
          set.driver_id = d.id; set.driver_name_note = null;
        } else {
          set.driver_name_note = str(p.driver_name_note, { required: true, max: 120, field: 'Fahrer' });
          set.driver_id = null;
        }
        set.driver_basis = basis; set.driver_evidence = evidence; set.driver_confirmed_by = user.id; set.driver_confirmed_at = now; set.status = 'fahrer_ermittelt';
        payload = { basis, driver_id: set.driver_id, driver_name_note: set.driver_name_note };
        break;
      }
      case 'inform_driver':
        set.driver_informed_at = now; set.status = 'fahrer_informiert';
        break;
      case 'set_status': {
        const st = oneOf(p.status, FINE_STATUSES, 'Status');
        if (['fahrer_ermittelt', 'fahrer_informiert'].includes(st)) throw bad('validation', 'Dieser Status entsteht über die Fahrerermittlung.');
        if (!note) throw bad('note_required', 'Bitte Vermerk angeben.');
        set.status = st; payload = { from: f.status, to: st };
        break;
      }
      case 'update':
        if (p.amount_eur !== undefined) set.amount_eur = num(p.amount_eur, { min: 0, max: 1e6, field: 'Betrag', nullable: true });
        if (p.response_due !== undefined) {
          const due = str(p.response_due, { max: 10 });
          if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw bad('validation', 'Frist im Format JJJJ-MM-TT.');
          set.response_due = due;
        }
        if (p.reference !== undefined) set.reference = str(p.reference, { max: 80 });
        payload = { ...set };
        break;
      default:
        throw bad('unknown_action', 'Unbekannte Aktion.');
    }
  }
  set.updated_at = now; set.version = f.version + 1;
  const cols = Object.keys(set);
  await env.DB.batch([
    env.DB.prepare(`UPDATE fines SET ${cols.map((k) => `${k}=?`).join(', ')} WHERE id=?`).bind(...cols.map((k) => set[k]), id),
    env.DB.prepare('INSERT INTO fine_events(id,fine_id,actor_id,action,note,payload,created_at) VALUES (?,?,?,?,?,?,?)').bind(uuid(), id, user.id, action, note, JSON.stringify(payload), now),
  ]);
  if (action === 'inform_driver') {
    // Sperrbildschirm: nur Vorgangsnummer; Details erst nach Anmeldung
    await notifyUsers(env, ctx, envName, [f.driver_id], { kind: 'fine', title: 'Neues Schreiben einer Behörde', body: `${f.fine_no}${envName === 'test' ? ' · TEST' : ''}`, eventKey: `fine:${id}:inform:${f.version}`, urgent: false });
  }
  return { ok: true, version: f.version + 1 };
}

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
  const fid = uuid();
  const key = `${envName}/fines/${id}/${fid}`;
  await env.FILES.put(key, buf, { metadata: { type, fine_id: id } });
  const name = decodeURIComponent(request.headers.get('x-filename') || 'schreiben').replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 120);
  await env.DB.prepare(`INSERT INTO files(id,case_id,fine_id,environment,r2_key,filename,content_type,size,sha256,uploaded_by,created_at) VALUES (?,NULL,?,?,?,?,?,?,?,?,?)`)
    .bind(fid, id, envName, key, name, type, buf.length, sha, user.id, nowIso()).run();
  return { id: fid, duplicate: false };
}

export async function canReadFineFile(env, user, envName, fineId) {
  await loadFine(env, user, envName, fineId);
  return true;
}

export async function fineFindings(env, environment) {
  const warnRow = await env.DB.prepare(`SELECT value FROM settings WHERE key='fine_warn_days'`).first();
  const warnDays = warnRow && warnRow.value !== '' ? Number(warnRow.value) : null;
  const rows = (await env.DB.prepare(`SELECT f.*, v.plate FROM fines f LEFT JOIN vehicles v ON v.id=f.vehicle_id WHERE f.environment=? AND f.status IN ('eingegangen','fahrer_ermittelt','fahrer_informiert')`).bind(environment).all()).results;
  const today = berlinDate();
  const out = [];
  for (const f of rows) {
    const label = `${f.fine_no} (${f.plate || f.plate_in_letter}, ${f.authority})`;
    if (f.response_due) {
      const days = Math.round((Date.parse(f.response_due) - Date.parse(today)) / 86400000);
      if (days < 0) out.push({ code: 'FINE_OVERDUE', f, severity: 'handeln', requires_decision: 1, message: `${label}: Antwortfrist ${f.response_due} überschritten.`, next_action: 'Sofort beantworten bzw. Fristverlängerung klären.' });
      else if (warnDays !== null && days <= warnDays) out.push({ code: 'FINE_DUE_SOON', f, severity: 'hinweis', requires_decision: 0, message: `${label}: Antwortfrist ${f.response_due} (in ${days} Tag(en)).`, next_action: 'Fahrer ermitteln und Schreiben beantworten.' });
    }
    if (!f.vehicle_id) out.push({ code: 'FINE_VEHICLE_UNKNOWN', f, severity: 'hinweis', requires_decision: 0, message: `${label}: Kennzeichen ${f.plate_in_letter} keinem Fahrzeug zugeordnet.`, next_action: 'Kennzeichen prüfen (Fremd-/Mietfahrzeug?).' });
    else if (f.status === 'eingegangen') out.push({ code: 'FINE_DRIVER_OPEN', f, severity: 'hinweis', requires_decision: 0, message: `${label}: Fahrer zur Tatzeit noch nicht ermittelt.`, next_action: 'Fahrer anhand Zuordnung/Tourenplan/Telematik bestätigen.' });
  }
  return out;
}
