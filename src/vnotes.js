// [CLAUDE] Hinweise zum Fahrzeug: kurze Notizen je Fahrzeug/Umgebung, optional für zugeordnete Fahrer sichtbar; Archiv statt Löschen
import { nowIso, uuid, bad, forbidden, notFound, str, hideDriverName, berlinDate, isCalendarDate } from './util.js';

// aktiv = nicht archiviert und nicht abgelaufen („gültig bis“ heute einschließlich, Berliner Datum); Platzhalter ? = berlinDate()
export const noteActiveSql = (a = '') => `${a}archived_at IS NULL AND (${a}valid_until IS NULL OR ${a}valid_until >= ?)`;
import { audit } from './auth.js';

const WRITE = ['owner', 'fleet', 'workshop', 'dispatch'];
const READ = [...WRITE, 'viewer'];
export const NOTES_MAX_ACTIVE = 20;
export const NOTES_ARCHIVE_MAX = 100; // Archiv-Anzeige: neueste 100 (eine Zeile mehr gelesen → truncated; vollständig in der Zeitleiste „Hinweise“)

async function vehicleOk(env, vehicleId) {
  const v = await env.DB.prepare('SELECT id FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound('Fahrzeug nicht gefunden.');
}

export async function listNotes(env, user, envName, vehicleId, query = {}) {
  if (!READ.includes(user.role)) throw forbidden();
  await vehicleOk(env, vehicleId);
  const archived = query.archived === '1';
  const today = berlinDate();
  // Archiv: archivierte und abgelaufene Hinweise (abgelaufen = „gültig bis“ vor heute), jüngstes Ende zuerst
  const rows = (await env.DB.prepare(`SELECT n.id, n.text, n.for_driver, n.created_at, n.archived_at, n.valid_until, u.display_name AS created_by_name, u.role AS created_by_role, a.display_name AS archived_by_name
    FROM vehicle_notes n JOIN users u ON u.id=n.created_by LEFT JOIN users a ON a.id=n.archived_by
    WHERE n.vehicle_id=? AND n.environment=? AND ${archived ? 'NOT (' + noteActiveSql('n.') + ')' : noteActiveSql('n.')}
    ORDER BY ${archived ? 'COALESCE(n.archived_at, n.valid_until)' : 'n.created_at'} DESC, n.rowid DESC LIMIT ?`).bind(vehicleId, envName, today, NOTES_ARCHIVE_MAX + 1).all()).results;
  // aktive Hinweise sind auf NOTES_MAX_ACTIVE begrenzt; nur das Archiv wächst – dort Hinweis statt stillem Abschneiden
  const truncated = rows.length > NOTES_ARCHIVE_MAX; if (truncated) rows.length = NOTES_ARCHIVE_MAX;
  return { ...(archived ? { truncated, max: NOTES_ARCHIVE_MAX } : { max_active: NOTES_MAX_ACTIVE }), notes: rows.map((r) => ({ ...hideDriverName(user, r, 'created_by_name', 'created_by_role'), for_driver: !!r.for_driver, expired: !r.archived_at && !!r.valid_until && r.valid_until < today })), can_write: WRITE.includes(user.role) };
}

export async function addNote(env, user, envName, vehicleId, body) {
  if (!WRITE.includes(user.role)) throw forbidden();
  await vehicleOk(env, vehicleId);
  const text = str(body.text, { required: true, max: 500, field: 'Hinweis' });
  if (text.length < 3) throw bad('validation', 'Hinweis ist zu kurz.');
  const today = berlinDate();
  let validUntil = null;
  if (body.valid_until !== undefined && body.valid_until !== null && body.valid_until !== '') {
    validUntil = String(body.valid_until);
    if (!isCalendarDate(validUntil)) throw bad('validation', '„Gültig bis“ ist kein gültiges Datum (JJJJ-MM-TT).');
    if (validUntil < today) throw bad('validation', '„Gültig bis“ darf nicht in der Vergangenheit liegen.');
  }
  const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM vehicle_notes WHERE vehicle_id=? AND environment=? AND ${noteActiveSql()}`).bind(vehicleId, envName, today).first();
  if (n.n >= NOTES_MAX_ACTIVE) throw bad('validation', `Höchstens ${NOTES_MAX_ACTIVE} aktive Hinweise je Fahrzeug – bitte erledigte archivieren.`);
  const id = uuid();
  await env.DB.prepare('INSERT INTO vehicle_notes(id,environment,vehicle_id,text,for_driver,created_by,created_at,valid_until) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, envName, vehicleId, text, body.for_driver ? 1 : 0, user.id, nowIso(), validUntil).run();
  await audit(env, user.id, 'vehicle.note_add', vehicleId, { note: id, for_driver: !!body.for_driver, valid_until: validUntil });
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
