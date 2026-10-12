// [CLAUDE] Hinweise zum Fahrzeug: kurze Notizen je Fahrzeug/Umgebung, optional für zugeordnete Fahrer sichtbar; Archiv statt Löschen
import { nowIso, uuid, bad, forbidden, notFound, str, hideDriverName } from './util.js';
import { audit } from './auth.js';

const WRITE = ['owner', 'fleet', 'workshop', 'dispatch'];
const READ = [...WRITE, 'viewer'];
export const NOTES_MAX_ACTIVE = 20;

async function vehicleOk(env, vehicleId) {
  const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound('Fahrzeug nicht gefunden.');
}

export async function listNotes(env, user, envName, vehicleId, query = {}) {
  if (!READ.includes(user.role)) throw forbidden();
  await vehicleOk(env, vehicleId);
  const archived = query.archived === '1';
  const rows = (await env.DB.prepare(`SELECT n.id, n.text, n.for_driver, n.created_at, n.archived_at, u.display_name AS created_by_name, u.role AS created_by_role, a.display_name AS archived_by_name
    FROM vehicle_notes n JOIN users u ON u.id=n.created_by LEFT JOIN users a ON a.id=n.archived_by
    WHERE n.vehicle_id=? AND n.environment=? AND n.archived_at IS ${archived ? 'NOT NULL' : 'NULL'} ORDER BY ${archived ? 'n.archived_at' : 'n.created_at'} DESC, n.rowid DESC LIMIT 100`).bind(vehicleId, envName).all()).results;
  return { notes: rows.map((r) => ({ ...hideDriverName(user, r, 'created_by_name', 'created_by_role'), for_driver: !!r.for_driver })), can_write: WRITE.includes(user.role) };
}

export async function addNote(env, user, envName, vehicleId, body) {
  if (!WRITE.includes(user.role)) throw forbidden();
  await vehicleOk(env, vehicleId);
  const text = str(body.text, { required: true, max: 500, field: 'Hinweis' });
  if (text.length < 3) throw bad('validation', 'Hinweis ist zu kurz.');
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM vehicle_notes WHERE vehicle_id=? AND environment=? AND archived_at IS NULL').bind(vehicleId, envName).first();
  if (n.n >= NOTES_MAX_ACTIVE) throw bad('validation', `Höchstens ${NOTES_MAX_ACTIVE} aktive Hinweise je Fahrzeug – bitte erledigte archivieren.`);
  const id = uuid();
  await env.DB.prepare('INSERT INTO vehicle_notes(id,environment,vehicle_id,text,for_driver,created_by,created_at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, envName, vehicleId, text, body.for_driver ? 1 : 0, user.id, nowIso()).run();
  await audit(env, user.id, 'vehicle.note_add', vehicleId, { note: id, for_driver: !!body.for_driver });
  return { id };
}

export async function archiveNote(env, user, envName, vehicleId, noteId) {
  if (!WRITE.includes(user.role)) throw forbidden();
  const r = await env.DB.prepare('UPDATE vehicle_notes SET archived_at=?, archived_by=? WHERE id=? AND vehicle_id=? AND environment=? AND archived_at IS NULL')
    .bind(nowIso(), user.id, noteId, vehicleId, envName).run();
  if (!r.meta || r.meta.changes !== 1) throw notFound('Hinweis nicht gefunden oder bereits archiviert.');
  await audit(env, user.id, 'vehicle.note_archive', vehicleId, { note: noteId });
  return { ok: true };
}
