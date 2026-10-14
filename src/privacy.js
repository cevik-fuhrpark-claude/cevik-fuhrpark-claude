// [CLAUDE] Datenauskunft je Person (Vorbereitung Art. 15 DSGVO): alle gespeicherten Daten eines App-Kontos und der
// verknüpften Fahrerakte als JSON. Nur Inhaber; ändert nichts; ohne Passwort-Hashes, Sitzungs-Token und Push-Schlüssel.
import { nowIso, forbidden, notFound } from './util.js';
import { audit } from './auth.js';

const LIMIT = 5000;

// Aufruf mit App-Konto (userId) oder Fahrerakte (driverId); ist die Fahrerakte mit einem Konto verknüpft, gilt die volle Auskunft des Kontos
export async function personExport(env, actor, { userId = null, driverId = null }) {
  if (actor.role !== 'owner') throw forbidden('Datenauskunft nur durch den Inhaber.');
  let driver = null;
  if (driverId) {
    driver = await env.DB.prepare('SELECT * FROM drivers WHERE id=?').bind(driverId).first();
    if (!driver) throw notFound('Fahrer nicht gefunden.');
    userId = driver.user_id || null;
  }
  let u = null;
  if (userId) {
    u = await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(userId).first();
    if (!u) throw notFound('Benutzer nicht gefunden.');
    delete u.password_hash; delete u.password_salt;
    for (const k of ['totp_secret', 'totp_pending', 'totp_last_step', 'totp_recovery']) delete u[k];
    if (!driver) driver = await env.DB.prepare('SELECT * FROM drivers WHERE user_id=?').bind(userId).first();
  } else userId = '\u0000'; // Fahrer ohne App-Konto: nur Fahrerakte
  const did = driver ? driver.id : '\u0000';
  const q = (sql, ...args) => env.DB.prepare(`${sql} LIMIT ${LIMIT}`).bind(...args);
  const stmts = {
    sessions: q('SELECT created_at, last_seen, expires_at, user_agent FROM sessions WHERE user_id=? ORDER BY last_seen DESC', userId),
    push_devices: q('SELECT device_label, created_at, last_success_at, revoked_at FROM push_subscriptions WHERE user_id=? ORDER BY created_at', userId),
    invites: q('SELECT created_at, expires_at, used_at FROM invites WHERE user_id=? ORDER BY created_at', userId),
    vehicle_assignments: q(`SELECT d.valid_from, d.valid_to, d.evidence, v.plate FROM driver_vehicles d JOIN vehicles v ON v.id=d.vehicle_id WHERE d.user_id=? ORDER BY d.valid_from`, userId),
    reported_cases: q(`SELECT c.case_no, c.environment, c.status, c.priority, c.description, c.created_at, v.plate FROM cases c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.reporter_id=? ORDER BY c.created_at`, userId),
    case_events: q(`SELECT c.case_no, e.environment, e.action, e.note, e.created_at FROM case_events e JOIN cases c ON c.id=e.case_id WHERE e.actor_id=? ORDER BY e.created_at`, userId),
    work_entries: q(`SELECT c.case_no, w.* FROM work_entries w JOIN cases c ON c.id=w.case_id WHERE w.user_id=? ORDER BY w.created_at`, userId),
    inspections: q(`SELECT i.kind, i.environment, i.result, i.odometer_km, i.note, i.created_at, v.plate FROM inspections i JOIN vehicles v ON v.id=i.vehicle_id WHERE i.performed_by=? ORDER BY i.created_at`, userId),
    files_uploaded: q('SELECT filename, content_type, size, created_at, case_id, vehicle_id, doc_kind FROM files WHERE uploaded_by=? ORDER BY created_at', userId),
    notifications: q('SELECT environment, kind, title, body, created_at, push_status, opened_at, acknowledged_at FROM notifications WHERE user_id=? ORDER BY created_at', userId),
    odometer_recorded: q(`SELECT o.km, o.measured_at, o.source, v.plate FROM odometer_readings o JOIN vehicles v ON v.id=o.vehicle_id WHERE o.recorded_by=? ORDER BY o.measured_at`, userId),
    fines_as_driver: q('SELECT fine_no, environment, kind, authority, reference, offense_type, offense_at, location, status, driver_basis, driver_informed_at, driver_ack_at, created_at FROM fines WHERE driver_id=? ORDER BY offense_at', userId),
    vehicle_notes_written: q(`SELECT n.environment, n.text, n.for_driver, n.created_at, n.valid_until, n.archived_at, v.plate FROM vehicle_notes n JOIN vehicles v ON v.id=n.vehicle_id WHERE n.created_by=? ORDER BY n.created_at`, userId),
    audit_as_actor: q('SELECT action, target, detail, created_at FROM audit_log WHERE actor_id=? ORDER BY created_at', userId),
    audit_about: q('SELECT actor_id, action, detail, created_at FROM audit_log WHERE target IN (?, ?) ORDER BY created_at', userId, did),
    driver_documents: q('SELECT * FROM driver_documents WHERE driver_id=? ORDER BY created_at', did),
    license_checks: q('SELECT * FROM driver_license_checks WHERE driver_id=? ORDER BY checked_on', did),
    card_downloads: q('SELECT kind, downloaded_on, evidence, created_at FROM tacho_downloads WHERE driver_id=? ORDER BY downloaded_on', did),
  };
  const names = Object.keys(stmts);
  const res = await env.DB.batch(names.map((n) => stmts[n]));
  const data = {};
  names.forEach((n, i) => { data[n] = res[i].results || []; });
  const generatedAt = nowIso();
  await audit(env, actor.id, 'privacy.export', u ? u.id : driver.id, { sections: names.filter((n) => data[n].length).length, ...(u ? {} : { driver_only: true }) });
  return {
    meta: {
      title: 'Datenauskunft je Person ([CLAUDE] CEVIK Fuhrpark)', generated_at: generatedAt, generated_by: actor.display_name,
      note: 'Alle in der Fuhrpark-App gespeicherten Daten zu dieser Person (App-Konto und verknüpfte Fahrerakte), ohne Passwort-Hashes, Sitzungs-Token und Push-Schlüssel. Dateiinhalte (Fotos/PDF) sind nicht enthalten, nur ihre Angaben. Vor Herausgabe prüfen (z. B. Daten Dritter in Freitexten).',
      limit_per_section: LIMIT,
      truncated: names.filter((n) => data[n].length >= LIMIT),
    },
    user: u, // null = Fahrer ohne App-Konto
    driver_record: driver || null,
    ...data,
  };
}
