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
    known_devices: q('SELECT label, first_seen, last_seen FROM known_devices WHERE user_id=? ORDER BY first_seen', userId),
    push_devices: q('SELECT device_label, created_at, last_success_at, revoked_at FROM push_subscriptions WHERE user_id=? ORDER BY created_at', userId),
    invites: q('SELECT created_at, expires_at, used_at FROM invites WHERE user_id=? ORDER BY created_at', userId),
    vehicle_assignments: q(`SELECT d.valid_from, d.valid_to, d.evidence, v.plate FROM driver_vehicles d JOIN vehicles v ON v.id=d.vehicle_id WHERE d.user_id=? ORDER BY d.valid_from`, userId),
    reported_cases: q(`SELECT c.case_no, c.environment, c.status, c.priority, c.description, c.created_at, v.plate FROM cases c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.reporter_id=? ORDER BY c.created_at`, userId),
    case_events: q(`SELECT c.case_no, e.environment, e.action, e.note, e.created_at FROM case_events e JOIN cases c ON c.id=e.case_id WHERE e.actor_id=? ORDER BY e.created_at`, userId),
    work_entries: q(`SELECT c.case_no, w.* FROM work_entries w JOIN cases c ON c.id=w.case_id WHERE w.user_id=? ORDER BY w.created_at`, userId),
    inspections: q(`SELECT i.kind, i.environment, i.result, i.odometer_km, i.note, i.items, i.created_at, v.plate FROM inspections i JOIN vehicles v ON v.id=i.vehicle_id WHERE i.performed_by=? ORDER BY i.created_at`, userId),
    files_uploaded: q('SELECT filename, content_type, size, created_at, case_id, vehicle_id, doc_kind FROM files WHERE uploaded_by=? ORDER BY created_at', userId),
    notifications: q('SELECT environment, kind, title, body, created_at, push_status, opened_at, acknowledged_at FROM notifications WHERE user_id=? ORDER BY created_at', userId),
    odometer_recorded: q(`SELECT o.km, o.measured_at, o.source, v.plate FROM odometer_readings o JOIN vehicles v ON v.id=o.vehicle_id WHERE o.recorded_by=? ORDER BY o.measured_at`, userId),
    // 18.10.2026: Nachweis der Fahrerermittlung, Betrag, Frist und Verlauf (auch Einträge der Leitung) gehören zur Auskunft der betroffenen Person
    fines_as_driver: q('SELECT fine_no, environment, kind, authority, reference, offense_type, offense_at, location, amount_eur, response_due, status, driver_basis, driver_evidence, driver_confirmed_at, driver_informed_at, driver_ack_at, created_at FROM fines WHERE driver_id=? ORDER BY offense_at', userId),
    fine_events_as_driver: q(`SELECT f.fine_no, e.action, e.note, e.created_at FROM fine_events e JOIN fines f ON f.id=e.fine_id WHERE f.driver_id=? ORDER BY e.created_at`, userId),
    vehicle_notes_written: q(`SELECT n.environment, n.text, n.for_driver, n.created_at, n.valid_until, n.archived_at, v.plate FROM vehicle_notes n JOIN vehicles v ON v.id=n.vehicle_id WHERE n.created_by=? ORDER BY n.created_at`, userId),
    // weitere Erfassungen dieser Person (17.10.2026 ergänzt – vorher fehlten u. a. Reifenmessungen und Teile in der Auskunft)
    tire_events_recorded: q(`SELECT t.environment, t.position, t.event_type, t.tread_mm, t.pressure_bar, t.dot, t.created_at, v.plate FROM tire_events t JOIN vehicles v ON v.id=t.vehicle_id WHERE t.recorded_by=? ORDER BY t.created_at`, userId),
    tire_specs_verified: q(`SELECT s.axle, s.size, s.verified_at, v.plate FROM tire_specs s JOIN vehicles v ON v.id=s.vehicle_id WHERE s.verified_by=? ORDER BY s.verified_at`, userId),
    parts_recorded: q(`SELECT c.case_no, p.name, p.quantity, p.unit, p.created_at FROM parts p JOIN cases c ON c.id=p.case_id WHERE p.user_id=? ORDER BY p.created_at`, userId),
    external_costs_recorded: q(`SELECT c.case_no, x.supplier, x.created_at FROM external_costs x JOIN cases c ON c.id=x.case_id WHERE x.user_id=? ORDER BY x.created_at`, userId),
    open_items: q(`SELECT c.case_no, o.description, o.status, o.created_at, o.resolved_at, CASE WHEN o.created_by=?1 THEN 1 ELSE 0 END AS created, CASE WHEN o.resolved_by=?1 THEN 1 ELSE 0 END AS resolved FROM open_items o JOIN cases c ON c.id=o.case_id WHERE o.created_by=?1 OR o.resolved_by=?1 ORDER BY o.created_at`, userId),
    stock_movements: q(`SELECT m.environment, m.type, m.qty, m.note, m.created_at, i.name FROM stock_movements m JOIN stock_items i ON i.id=m.item_id WHERE m.user_id=? ORDER BY m.created_at`, userId),
    maintenance_recorded: q(`SELECT e.kind, e.done_date, e.result, e.created_at, v.plate FROM maintenance_events e JOIN vehicles v ON v.id=e.vehicle_id WHERE e.recorded_by=? ORDER BY e.created_at`, userId),
    fine_events: q(`SELECT f.fine_no, e.action, e.note, e.created_at FROM fine_events e JOIN fines f ON f.id=e.fine_id WHERE e.actor_id=? ORDER BY e.created_at`, userId),
    audit_as_actor: q('SELECT action, target, detail, created_at FROM audit_log WHERE actor_id=? ORDER BY created_at', userId),
    audit_about: q('SELECT actor_id, action, detail, created_at FROM audit_log WHERE target IN (?, ?) ORDER BY created_at', userId, did),
    driver_documents: q('SELECT * FROM driver_documents WHERE driver_id=? ORDER BY created_at', did),
    license_checks: q('SELECT * FROM driver_license_checks WHERE driver_id=? ORDER BY checked_on', did),
    card_downloads: q('SELECT kind, downloaded_on, evidence, created_at, cancelled_at, cancel_reason FROM tacho_downloads WHERE driver_id=? ORDER BY downloaded_on', did),
    // Agentenbefunde zur Fahrerakte (Schlüssel „<Fahrer-ID>|…“, Text mit Name und Nachweisstand) und ihre Einträge im Master-Eingang (17.10.2026 ergänzt)
    agent_findings: q("SELECT environment, finding_code, severity, message, status, first_seen, last_seen, resolved_at FROM agent_findings WHERE substr(subject_key, 1, length(?1) + 1) = ?1 || '|' ORDER BY first_seen", did || ''),
    master_inbox: q("SELECT m.environment, m.received_at, m.decision_status, m.decision_note, m.decided_at FROM master_inbox m WHERE m.finding_id IN (SELECT id FROM agent_findings WHERE substr(subject_key, 1, length(?1) + 1) = ?1 || '|') ORDER BY m.received_at", did || ''),
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
