// [CLAUDE] Datenauskunft je Person (Vorbereitung Art. 15 DSGVO): alle gespeicherten Daten eines App-Kontos und der
// verknüpften Fahrerakte als JSON. Nur Inhaber; ändert nichts; ohne Passwort-Hashes, Sitzungs-Token und Push-Schlüssel.
import { nowIso, forbidden, notFound } from './util.js';
import { audit } from './auth.js';

const LIMIT = 5000;
// neutrale Detail-Angaben eigener Protokolleinträge (keine Namen, Vermerke, Begründungen, Benutzernamen)
const AUDIT_KEEP = new Set(['kind', 'valid_until', 'checked_on', 'result', 'environment', 'role', 'count', 'sessions', 'from', 'to', 'downloaded_on', 'rows', 'site', 'status', 'sections', 'driver_only', 'active', 'size']);

// Aufruf mit App-Konto (userId) oder Fahrerakte (driverId); ist die Fahrerakte mit einem Konto verknüpft, gilt die volle Auskunft des Kontos
const EXPORT_TEXT = {
  de: { title: 'Datenauskunft (Art. 15 DSGVO) – Fuhrpark-App', note: 'Alle in der Fuhrpark-App gespeicherten Daten zu Ihrer Person (App-Konto und verknüpfte Fahrerakte), ohne Passwort-Hashes, Sitzungs-Token und Push-Schlüssel. Dateiinhalte (Fotos/PDF) sind nicht enthalten, nur ihre Angaben. Gespeicherte Texte und Werte stehen so in der Datei, wie sie erfasst wurden (meist Deutsch).' },
  uk: { title: 'Довідка про персональні дані (ст. 15 GDPR) – застосунок автопарку', note: 'Усі дані про вас, збережені в застосунку автопарку (обліковий запис і пов’язана картка водія), без хешів паролів, токенів сеансів і ключів push. Вміст файлів (фото/PDF) не включено, лише їхні дані. Збережені тексти й значення наведено так, як їх було внесено (здебільшого німецькою).' },
  en: { title: 'Data access export (Art. 15 GDPR) – fleet app', note: 'All data stored about you in the fleet app (app account and linked driver record), without password hashes, session tokens and push keys. File contents (photos/PDF) are not included, only their details. Stored texts and values appear as they were recorded (mostly German).' },
};

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
  // eine Zeile mehr lesen: „gekappt“ nur, wenn wirklich mehr als LIMIT Zeilen vorhanden sind (19.10.2026: schon bei genau LIMIT gemeldet)
  // Gekappt bleiben die NEUESTEN Einträge (20.10.2026: vorher die ältesten 5000 – wie bei der Sicherung seit 18.10.): innen absteigend
  // lesen, außen wieder in der Reihenfolge der Abfrage ausgeben; die überzählige älteste Zeile entfällt unten (`slice(-LIMIT)`).
  const q = (sql, ...args) => {
    const m = sql.match(/^([\s\S]*)ORDER BY ([\w.]+)\s*$/); // absteigend sortierte (Sitzungen) behalten ohnehin die neuesten
    if (!m) return env.DB.prepare(`${sql} LIMIT ${LIMIT + 1}`).bind(...args);
    return env.DB.prepare(`SELECT * FROM (${m[1]}ORDER BY ${m[2]} DESC LIMIT ${LIMIT + 1}) ORDER BY ${m[2].split('.').pop()}`).bind(...args);
  };
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
    files_uploaded: q('SELECT filename, content_type, size, created_at, case_id, vehicle_id, doc_kind, doc_note, doc_valid_until FROM files WHERE uploaded_by=? ORDER BY created_at', userId),
    notifications: q('SELECT environment, kind, title, body, created_at, push_status, push_accepted_at, device_received_at, opened_at, acknowledged_at, hidden_at FROM notifications WHERE user_id=? ORDER BY created_at', userId),
    odometer_recorded: q(`SELECT o.km, o.measured_at, o.source, o.note, v.plate FROM odometer_readings o JOIN vehicles v ON v.id=o.vehicle_id WHERE o.recorded_by=? ORDER BY o.measured_at`, userId),
    // 18.10.2026: Nachweis der Fahrerermittlung, Betrag, Frist und Verlauf (auch Einträge der Leitung) gehören zur Auskunft der betroffenen Person
    // 21.10.2026 (Backlog 104): auch Schreiben, bei denen die Person ermittelt war und später abgelöst wurde (Verlauf `fine_events.payload`);
    // `driver_status` aktuell/abgelöst, Ermittlungsangaben nur, solange sie die Person betreffen
    fines_as_driver: q(`SELECT fine_no, environment, kind, authority, reference, offense_type, offense_at, location, amount_eur, response_due, status,
        CASE WHEN driver_id=?1 THEN 'aktuell' ELSE 'abgelöst' END AS driver_status,
        CASE WHEN driver_id=?1 THEN driver_basis END AS driver_basis, CASE WHEN driver_id=?1 THEN driver_evidence END AS driver_evidence,
        CASE WHEN driver_id=?1 THEN driver_confirmed_at END AS driver_confirmed_at, CASE WHEN driver_id=?1 THEN driver_informed_at END AS driver_informed_at,
        CASE WHEN driver_id=?1 THEN driver_ack_at END AS driver_ack_at, created_at FROM fines
      WHERE driver_id=?1 OR id IN (SELECT fine_id FROM fine_events WHERE json_valid(payload) AND (json_extract(payload,'$.driver_id')=?1 OR json_extract(payload,'$.driver_reset.driver_id')=?1)) ORDER BY offense_at`, userId),
    // Verlauf nur bis zur ersten Ermittlung überhaupt und für den eigenen Ermittlungszeitraum (bis einschließlich der Rücksetzung) – nicht die Zeit
    // eines anderen Fahrers (vorher sah der neue Fahrer Vermerke über den Vorgänger, der abgelöste fehlte ganz)
    fine_events_as_driver: q(`SELECT f.fine_no, e.action, e.note, e.created_at FROM fine_events e JOIN fines f ON f.id=e.fine_id
      WHERE (f.driver_id=?1 OR f.id IN (SELECT fine_id FROM fine_events WHERE json_valid(payload) AND (json_extract(payload,'$.driver_id')=?1 OR json_extract(payload,'$.driver_reset.driver_id')=?1)))
        AND (e.created_at < COALESCE((SELECT MIN(x.created_at) FROM fine_events x WHERE x.fine_id=f.id AND json_valid(x.payload) AND json_extract(x.payload,'$.driver_id') IS NOT NULL), '9999')
          OR EXISTS (SELECT 1 FROM fine_events st WHERE st.fine_id=f.id AND json_valid(st.payload) AND json_extract(st.payload,'$.driver_id')=?1 AND st.created_at<=e.created_at
            AND NOT EXISTS (SELECT 1 FROM fine_events r WHERE r.fine_id=f.id AND json_valid(r.payload) AND json_extract(r.payload,'$.driver_reset.driver_id')=?1 AND r.created_at>=st.created_at AND r.created_at<e.created_at)))
      ORDER BY e.created_at`, userId),
    vehicle_notes_written: q(`SELECT n.environment, n.text, n.for_driver, n.created_at, n.valid_until, n.archived_at, v.plate FROM vehicle_notes n JOIN vehicles v ON v.id=n.vehicle_id WHERE n.created_by=? ORDER BY n.created_at`, userId),
    // weitere Erfassungen dieser Person (17.10.2026 ergänzt – vorher fehlten u. a. Reifenmessungen und Teile in der Auskunft)
    tire_events_recorded: q(`SELECT t.environment, t.position, t.event_type, t.tread_mm, t.pressure_bar, t.dot, t.created_at, v.plate FROM tire_events t JOIN vehicles v ON v.id=t.vehicle_id WHERE t.recorded_by=? ORDER BY t.created_at`, userId),
    tire_specs_verified: q(`SELECT s.axle, s.size, s.verified_at, v.plate FROM tire_specs s JOIN vehicles v ON v.id=s.vehicle_id WHERE s.verified_by=? ORDER BY s.verified_at`, userId),
    parts_recorded: q(`SELECT c.case_no, p.name, p.quantity, p.unit, p.created_at FROM parts p JOIN cases c ON c.id=p.case_id WHERE p.user_id=? ORDER BY p.created_at`, userId),
    external_costs_recorded: q(`SELECT c.case_no, x.supplier, x.created_at FROM external_costs x JOIN cases c ON c.id=x.case_id WHERE x.user_id=? ORDER BY x.created_at`, userId),
    open_items: q(`SELECT c.case_no, o.description, o.status, o.created_at, o.resolved_at, CASE WHEN o.created_by=?1 THEN 1 ELSE 0 END AS created, CASE WHEN o.resolved_by=?1 THEN 1 ELSE 0 END AS resolved FROM open_items o JOIN cases c ON c.id=o.case_id WHERE o.created_by=?1 OR o.resolved_by=?1 ORDER BY o.created_at`, userId),
    stock_movements: q(`SELECT m.environment, m.type, m.qty, m.note, m.created_at, i.name FROM stock_movements m JOIN stock_items i ON i.id=m.item_id WHERE m.user_id=? ORDER BY m.created_at`, userId),
    maintenance_recorded: q(`SELECT e.kind, e.done_date, e.result, e.created_at, v.plate FROM maintenance_events e JOIN vehicles v ON v.id=e.vehicle_id WHERE e.recorded_by=? ORDER BY e.created_at`, userId),
    // eigene Handlungen an Bußgeldern ohne Vermerktext (Vermerke betreffen meist den ermittelten Fahrer – Art. 15 Abs. 4 DSGVO, wie 20.10.2026), nur ob einer vorliegt
    fine_events: q(`SELECT f.fine_no, e.action, CASE WHEN e.note IS NOT NULL AND e.note<>'' THEN 1 ELSE 0 END AS with_note, e.created_at FROM fine_events e JOIN fines f ON f.id=e.fine_id WHERE e.actor_id=? ORDER BY e.created_at`, userId),
    audit_as_actor: q('SELECT action, target, detail, created_at FROM audit_log WHERE actor_id=? ORDER BY created_at', userId),
    // auch Fahrzeugzuordnungen der Person (Ziel = Fahrzeug, Person nur im Detail; gleiche Regel wie Protokoll je Person, 20.10.2026)
    audit_about: q(`SELECT actor_id, action, detail, created_at FROM audit_log WHERE target IN (?1, ?2) OR (target IN (SELECT vehicle_id FROM driver_vehicles WHERE user_id = ?1)
      AND action IN ('vehicle.assign_driver', 'vehicle.end_assignment') AND CASE WHEN json_valid(detail) THEN json_extract(detail, '$.driver') END = ?1) ORDER BY created_at`, userId, did),
    driver_documents: q('SELECT * FROM driver_documents WHERE driver_id=? ORDER BY created_at', did),
    license_checks: q('SELECT * FROM driver_license_checks WHERE driver_id=? ORDER BY checked_on', did),
    card_downloads: q('SELECT kind, downloaded_on, evidence, created_at, cancelled_at, cancel_reason FROM tacho_downloads WHERE driver_id=? ORDER BY downloaded_on', did),
    // Agentenbefunde zur Fahrerakte (Schlüssel „<Fahrer-ID>|…“, Text mit Name und Nachweisstand) und ihre Einträge im Master-Eingang (17.10.2026 ergänzt)
    agent_findings: q("SELECT environment, finding_code, severity, message, status, first_seen, last_seen, resolved_at FROM agent_findings WHERE substr(subject_key, 1, length(?1) + 1) = ?1 || '|' ORDER BY first_seen", did || ''),
    master_inbox: q("SELECT m.environment, m.received_at, m.decision_status, m.decision_note, m.decided_at FROM master_inbox m WHERE m.finding_id IN (SELECT id FROM agent_findings WHERE substr(subject_key, 1, length(?1) + 1) = ?1 || '|') ORDER BY m.received_at", did || ''),
    // Erfassungen/Entscheidungen dieser Person als Leitung, Prüfer oder Werkstatt (19.10.2026 ergänzt – vorher fehlten u. a. Führerscheinkontrollen,
    // Auslesungen, Master-Entscheidungen, Verträge, Versicherungsfälle, Bußgelder und Übernahmen von Vorgängen in der Auskunft)
    // Art. 15 Abs. 4 DSGVO: Handlungen an Daten anderer Personen ohne deren Namen/Vermerke (20.10.2026: Auskunft der Leitung enthielt Name, Ergebnis-
    // Vermerk geprüfter Fahrer, angelegte Fahrer, zugeordnete und eingeladene Personen)
    // auch Stornos (Migration 0065, wie Nachweise/Auslesungen; 21.10.2026)
    license_checks_performed: q(`SELECT checked_on, result, created_at, cancelled_at, CASE WHEN checked_by=?1 THEN 1 ELSE 0 END AS checked, CASE WHEN cancelled_by=?1 THEN 1 ELSE 0 END AS cancelled
      FROM driver_license_checks WHERE checked_by=?1 OR cancelled_by=?1 ORDER BY checked_on`, userId),
    tacho_downloads_recorded: q(`SELECT t.kind, t.downloaded_on, t.evidence, t.created_at, t.cancelled_at, t.cancel_reason, CASE WHEN t.created_by=?1 THEN 1 ELSE 0 END AS created, CASE WHEN t.cancelled_by=?1 THEN 1 ELSE 0 END AS cancelled
      FROM tacho_downloads t WHERE t.created_by=?1 OR t.cancelled_by=?1 ORDER BY t.created_at`, userId),
    master_decisions: q('SELECT environment, received_at, decision_status, decision_note, decided_at FROM master_inbox WHERE decided_by=? ORDER BY decided_at', userId),
    drivers_created: q('SELECT created_at FROM drivers WHERE created_by=? ORDER BY created_at', userId),
    driver_documents_recorded: q(`SELECT kind, valid_until, created_at, cancelled_at, CASE WHEN created_by=?1 THEN 1 ELSE 0 END AS created, CASE WHEN cancelled_by=?1 THEN 1 ELSE 0 END AS cancelled
      FROM driver_documents WHERE created_by=?1 OR cancelled_by=?1 ORDER BY created_at`, userId), // auch Stornos (Migration 0063, wie Auslesungen; 20.10.2026)
    contracts_recorded: q(`SELECT k.kind, k.partner, k.contract_no, k.created_at, v.plate FROM vehicle_contracts k JOIN vehicles v ON v.id=k.vehicle_id WHERE k.created_by=? ORDER BY k.created_at`, userId),
    claims_recorded: q(`SELECT c.case_no, i.insurer, i.status, i.created_at FROM insurance_claims i JOIN cases c ON c.id=i.case_id WHERE i.created_by=? ORDER BY i.created_at`, userId),
    fines_recorded: q(`SELECT fine_no, environment, kind, created_at, driver_confirmed_at, CASE WHEN created_by=?1 THEN 1 ELSE 0 END AS created, CASE WHEN driver_confirmed_by=?1 THEN 1 ELSE 0 END AS driver_confirmed
      FROM fines WHERE created_by=?1 OR driver_confirmed_by=?1 ORDER BY created_at`, userId),
    cases_received: q(`SELECT case_no, environment, created_at, CASE WHEN fleet_received_by=?1 THEN 1 ELSE 0 END AS fleet_received, CASE WHEN workshop_ack_by=?1 THEN workshop_ack_at END AS workshop_ack_at
      FROM cases WHERE fleet_received_by=?1 OR workshop_ack_by=?1 ORDER BY created_at`, userId),
    emergency_contacts_edited: q(`SELECT environment, kind, label, created_at, updated_at, archived_at, CASE WHEN created_by=?1 THEN 1 ELSE 0 END AS created, CASE WHEN updated_by=?1 THEN 1 ELSE 0 END AS updated, CASE WHEN archived_by=?1 THEN 1 ELSE 0 END AS archived
      FROM emergency_contacts WHERE created_by=?1 OR updated_by=?1 OR archived_by=?1 ORDER BY created_at`, userId),
    vehicle_notes_archived: q(`SELECT n.environment, n.text, n.archived_at, v.plate FROM vehicle_notes n JOIN vehicles v ON v.id=n.vehicle_id WHERE n.archived_by=? ORDER BY n.archived_at`, userId),
    maintenance_rules_created: q(`SELECT m.kind, m.created_at, v.plate FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id WHERE m.created_by=? ORDER BY m.created_at`, userId),
    telematics_mappings_confirmed: q('SELECT provider, external_id, evidence, confirmed_at FROM telematics_mappings WHERE confirmed_by=? ORDER BY confirmed_at', userId),
    // 19.10.2026 ergänzt: Zuordnungen/Einladungen, die die Person vorgenommen hat, Lagerartikel (angelegt/bestellt), geänderte Einstellungen –
    // in EINER Abfrage (Abfragebudget ≤ 50 je Aufruf), unten in Abschnitte aufgeteilt; 21.10.2026: Anmelde-Fehlversuche/Sperre (`login_attempts`,
    // Schlüssel = Benutzername; offene Zwei-Faktor-Anmeldungen `login_challenges` leben 5 Min. und bleiben bewusst außen vor)
    _made_by: env.DB.prepare(`SELECT
      (SELECT json_group_array(json_object('valid_from', valid_from, 'valid_to', valid_to, 'evidence', evidence, 'created_at', created_at, 'plate', plate)) FROM (SELECT * FROM (SELECT d.valid_from, d.valid_to, d.evidence, d.created_at, v.plate FROM driver_vehicles d JOIN vehicles v ON v.id=d.vehicle_id WHERE d.created_by=?1 ORDER BY d.created_at DESC LIMIT ?2) ORDER BY created_at)) AS vehicle_assignments_made,
      (SELECT json_group_array(json_object('created_at', created_at, 'expires_at', expires_at, 'used_at', used_at)) FROM (SELECT * FROM (SELECT i.created_at, i.expires_at, i.used_at FROM invites i WHERE i.created_by=?1 ORDER BY i.created_at DESC LIMIT ?2) ORDER BY created_at)) AS invites_created,
      (SELECT json_group_array(json_object('environment', environment, 'site', site, 'name', name, 'part_number', part_number, 'created_at', created_at, 'ordered_on', ordered_on, 'ordered_qty', ordered_qty, 'created', created, 'ordered', ordered)) FROM (SELECT * FROM (SELECT environment, site, name, part_number, created_at, ordered_on, ordered_qty, CASE WHEN created_by=?1 THEN 1 ELSE 0 END AS created, CASE WHEN ordered_by=?1 THEN 1 ELSE 0 END AS ordered FROM stock_items WHERE created_by=?1 OR ordered_by=?1 ORDER BY created_at DESC LIMIT ?2) ORDER BY created_at)) AS stock_items_edited,
      (SELECT json_group_array(json_object('key', key, 'updated_at', updated_at)) FROM (SELECT * FROM (SELECT key, updated_at FROM settings WHERE updated_by=?1 ORDER BY updated_at DESC LIMIT ?2) ORDER BY updated_at)) AS settings_changed,
      (SELECT json_group_array(json_object('failures', failures, 'locked_until', locked_until, 'updated_at', updated_at)) FROM login_attempts WHERE key IN (SELECT username FROM users WHERE id=?1 UNION SELECT lower(username) FROM users WHERE id=?1)) AS login_attempts`).bind(userId, LIMIT + 1),
  };
  const names = Object.keys(stmts);
  const res = await env.DB.batch(names.map((n) => stmts[n]));
  const data = {};
  const truncated = [];
  names.forEach((n, i) => {
    if (n === '_made_by') { const row = (res[i].results || [])[0] || {}; for (const [k, j] of Object.entries(row)) { const r = JSON.parse(j || '[]'); if (r.length > LIMIT) truncated.push(k); data[k] = r.slice(-LIMIT); } return; } // neueste LIMIT Zeilen (21.10.2026: waren die ältesten)
    const r = res[i].results || []; if (r.length > LIMIT) truncated.push(n); data[n] = r.length > LIMIT ? (n === 'sessions' ? r.slice(0, LIMIT) : r.slice(-LIMIT)) /* nur Sitzungen sind absteigend sortiert */ : r;
  });
  // Art. 15 Abs. 4 DSGVO: eigene Protokolleinträge ohne Namen/Vermerke Dritter (20.10.2026: `detail` enthielt z. B. Namen angelegter Fahrer,
  // Storno-Begründungen und Benutzernamen) – nur neutrale Angaben bleiben; bei Handlungen an Personen entfällt auch die Ziel-Kennung.
  data.audit_as_actor = data.audit_as_actor.map((r) => {
    let d = null; try { d = JSON.parse(r.detail); } catch { d = null; }
    const keep = d && typeof d === 'object' && !Array.isArray(d) ? Object.fromEntries(Object.entries(d).filter(([k]) => AUDIT_KEEP.has(k))) : null;
    return { action: r.action, target: /^(driver|user|tacho|privacy|fine)\./.test(r.action) ? null : r.target, detail: keep && Object.keys(keep).length ? keep : null, created_at: r.created_at };
  });
  const generatedAt = nowIso();
  const lang = u && EXPORT_TEXT[u.language] ? u.language : 'de';
  await audit(env, actor.id, 'privacy.export', u ? u.id : driver.id, { sections: Object.keys(data).filter((n) => data[n].length).length, ...(u ? {} : { driver_only: true }) });
  return {
    meta: {
      // Titel/Erläuterung in der Sprache der Person (die Datei geht an sie), ohne Entwicklervermerk; der Prüfhinweis für den Inhaber
      // steht in der Oberfläche (data_export_hint), nicht in der Datei (19.10.2026). Gespeicherte Werte bleiben wie gespeichert.
      language: lang, title: EXPORT_TEXT[lang].title, generated_at: generatedAt, generated_by: actor.display_name,
      note: EXPORT_TEXT[lang].note,
      limit_per_section: LIMIT,
      truncated,
    },
    user: u, // null = Fahrer ohne App-Konto
    driver_record: driver || null,
    ...data,
  };
}
