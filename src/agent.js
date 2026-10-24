// [CLAUDE] Fuhrparkagent (regelbasiert, deterministisch) und Übergabe an den Master-Agenten
// Der Agent erzeugt Befunde – er gibt nie Fahrzeuge frei, beauftragt nichts und erfindet keine Fristen.
import { nowIso, uuid, sha256HexSync, berlinDateTime, berlinDate, oneOf, str, notFound, conflict, rateOf, PLATE_KEY_SQL, COUPLING_PREFERRED_SQL } from './util.js';
import { notifyUsers, deliverPush } from './notify.js';
import { audit } from './auth.js';
import { tireFindings } from './tires.js';
import { stockFindings } from './stock.js';
import { fineFindings } from './fines.js';
import { driverFindings } from './drivers.js';
import { tachoFindings } from './tacho.js';
import { documentFindings } from './vehicles.js';
import { contractFindings } from './contracts.js';
import { claimFindings } from './claims.js';
import { staleBefore } from './cases.js';
import { latestKmByVehicle, kmDue, ruleDueKm, maintenanceEventLists } from './maintenance.js';
import { syncHuSpDues, loadHuSpInputs, huSpFor } from './inspection_rules.js';
import { findingLabel } from '../public/finding-labels.js';
import { findingText as fm, FINDING_ENUMS } from '../public/finding-messages.js';
import { maintenanceWarnDays } from './settings.js';

// Fingerabdrücke wiederkehrender Befunde je Worker-Instanz zwischengespeichert (22.10.2026): dieselben Befunde werden alle 15 Min. neu bewertet,
// SHA-256 je Befund war der größte Rechenanteil des Agenten (CPU-Grenze je Aufruf). Gleiches Ergebnis wie sha256Hex; höchstens 20 000 Einträge.
// Seit 22.10.2026 (09:15) synchron (`sha256HexSync`): im ersten Lauf einer Instanz kostete crypto.subtle je Befund einen eigenen asynchronen Auftrag.
const FP_MEMO = new Map();
export const FP_STATS = { hashed: 0 }; // Test/Messung: Anzahl tatsächlich gehashter Fingerabdrücke
export function fpMemoClear() { FP_MEMO.clear(); } // Test: neue Worker-Instanz nachstellen
export function sha256Memo(input) {
  const hit = FP_MEMO.get(input); if (hit) return hit;
  const h = sha256HexSync(input); FP_STATS.hashed++;
  if (FP_MEMO.size >= 20000) FP_MEMO.clear();
  FP_MEMO.set(input, h); return h;
}

const SEV_RANK = { info: 0, hinweis: 1, handeln: 2, kritisch: 3 };

async function setting(env, key) {
  const r = await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();
  if (!r || r.value === '' || r.value === null) return null;
  return r.value;
}

// Fristen nur, wenn ausdrücklich konfiguriert (je Umgebung, Minuten). Sonst: "Frist nicht konfiguriert".
function slaMinutes(settings, environment, kind, priority) {
  const v = settings.get(`sla_${environment}_${kind}_${priority}_min`);
  const n = v === undefined || v === null || v === '' ? null : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Abfragebudget: Cloudflare begrenzt D1-Abfragen je Aufruf. Der Agent arbeitet daher mit Sammelabfragen
// (unabhängig von der Anzahl der Vorgänge) und schreibt Befunde blockweise über json_each.
const CHUNK = 1000; // JSON-Parameter je Anweisung ≈ 0,5 MB (D1: max. 2 MB je Wert) – weniger Anweisungen je Lauf
// Befunde, die als ruhige Erinnerung (nicht dringend) an Fuhrparkleitung/Inhaber gehen, sobald sie neu auftreten
export const REMINDER_LABEL = { MAINTENANCE_OVERDUE: 'Prüftermin überfällig', MAINTENANCE_DUE: 'Prüftermin bald fällig', INSPECTION_UNCLEAR: 'Prüffrist ungeklärt', FINE_OVERDUE: 'Behördenfrist überschritten', FINE_DUE_SOON: 'Behördenfrist läuft ab', DOCUMENT_EXPIRED: 'Dokument abgelaufen', DOCUMENT_EXPIRES_SOON: 'Dokument läuft ab', DRIVER_DOC_EXPIRED: 'Fahrernachweis abgelaufen', DRIVER_DOC_EXPIRES_SOON: 'Fahrernachweis läuft ab', LICENSE_CHECK_DUE: 'Führerscheinkontrolle fällig', LICENSE_CHECK_DUE_SOON: 'Führerscheinkontrolle bald fällig', LICENSE_CHECK_FAILED: 'Führerscheinkontrolle mit Mangel', TACHO_CARD_OVERDUE: 'Fahrerkarte nicht ausgelesen', TACHO_CARD_DUE: 'Fahrerkarte bald auslesen', TACHO_VU_OVERDUE: 'Massenspeicher nicht ausgelesen', TACHO_VU_DUE: 'Massenspeicher bald auslesen', CONTRACT_ENDED: 'Vertrag abgelaufen', CONTRACT_ENDS_SOON: 'Vertrag endet bald', CONTRACT_NOTICE_DUE: 'Kündigungsfrist Vertrag', CONTRACT_KM_OVER: 'km-Kontingent überschritten', CONTRACT_KM_FORECAST: 'km-Kontingent (Prognose)', CONTRACT_KM_UNCLEAR: 'km-Kontingent nicht berechenbar', CONTRACT_KM_BELOW_START: 'km-Stand unter Übernahme-km', CLAIM_OPEN_LONG: 'Versicherungsfall nachfassen', CASE_STALE: 'Vorgang ohne Bewegung', CASE_FOLLOWUP_DUE: 'Wiedervorlage', INSPECTION_DEFECTS_NO_CASE: 'Prüfmangel ohne Auftrag', REINSPECTION_PENDING: 'Nachprüfung eintragen' };
const REMINDER_CODES = new Set(Object.keys(REMINDER_LABEL));
// Push-Texte des Agenten in der Sprache der Person (Fuhrparkleitung/Inhaber arbeiten nicht immer auf Deutsch); Befundcodes bleiben sprachneutral
const REMINDER_LABEL_I18N = {
  uk: { MAINTENANCE_OVERDUE: 'Техогляд прострочено', MAINTENANCE_DUE: 'Техогляд незабаром', INSPECTION_UNCLEAR: 'Строк огляду не з’ясовано', FINE_OVERDUE: 'Строк органу влади минув', FINE_DUE_SOON: 'Строк органу влади спливає', DOCUMENT_EXPIRED: 'Документ прострочено', DOCUMENT_EXPIRES_SOON: 'Документ спливає', DRIVER_DOC_EXPIRED: 'Документ водія прострочено', DRIVER_DOC_EXPIRES_SOON: 'Документ водія спливає', LICENSE_CHECK_DUE: 'Потрібна перевірка посвідчення', LICENSE_CHECK_DUE_SOON: 'Незабаром перевірка посвідчення', LICENSE_CHECK_FAILED: 'Перевірка посвідчення з дефектом', TACHO_CARD_OVERDUE: 'Картку водія не зчитано', TACHO_CARD_DUE: 'Незабаром зчитати картку водія', TACHO_VU_OVERDUE: 'Пам’ять тахографа не зчитано', TACHO_VU_DUE: 'Незабаром зчитати пам’ять тахографа', CONTRACT_ENDED: 'Договір закінчився', CONTRACT_ENDS_SOON: 'Договір незабаром закінчується', CONTRACT_NOTICE_DUE: 'Строк розірвання договору', CONTRACT_KM_OVER: 'Ліміт пробігу перевищено', CONTRACT_KM_FORECAST: 'Ліміт пробігу (прогноз)', CONTRACT_KM_UNCLEAR: 'Ліміт пробігу не розраховано', CONTRACT_KM_BELOW_START: 'Пробіг менший за пробіг при прийнятті', CLAIM_OPEN_LONG: 'Страховий випадок: нагадати', CASE_STALE: 'Заявка без руху', CASE_FOLLOWUP_DUE: 'Нагадування', INSPECTION_DEFECTS_NO_CASE: 'Дефект огляду без замовлення', REINSPECTION_PENDING: 'Внести повторний огляд' },
  en: { MAINTENANCE_OVERDUE: 'Inspection overdue', MAINTENANCE_DUE: 'Inspection due soon', INSPECTION_UNCLEAR: 'Inspection deadline unclear', FINE_OVERDUE: 'Authority deadline passed', FINE_DUE_SOON: 'Authority deadline expiring', DOCUMENT_EXPIRED: 'Document expired', DOCUMENT_EXPIRES_SOON: 'Document expiring', DRIVER_DOC_EXPIRED: 'Driver document expired', DRIVER_DOC_EXPIRES_SOON: 'Driver document expiring', LICENSE_CHECK_DUE: 'Licence check due', LICENSE_CHECK_DUE_SOON: 'Licence check due soon', LICENSE_CHECK_FAILED: 'Licence check with defect', TACHO_CARD_OVERDUE: 'Driver card not downloaded', TACHO_CARD_DUE: 'Driver card download due soon', TACHO_VU_OVERDUE: 'Vehicle unit not downloaded', TACHO_VU_DUE: 'Vehicle unit download due soon', CONTRACT_ENDED: 'Contract expired', CONTRACT_ENDS_SOON: 'Contract ending soon', CONTRACT_NOTICE_DUE: 'Contract notice deadline', CONTRACT_KM_OVER: 'Mileage allowance exceeded', CONTRACT_KM_FORECAST: 'Mileage allowance (forecast)', CONTRACT_KM_UNCLEAR: 'Mileage allowance not calculable', CONTRACT_KM_BELOW_START: 'Odometer below handover mileage', CLAIM_OPEN_LONG: 'Follow up insurance claim', CASE_STALE: 'Case without progress', CASE_FOLLOWUP_DUE: 'Follow-up', INSPECTION_DEFECTS_NO_CASE: 'Inspection defect without order', REINSPECTION_PENDING: 'Record re-inspection' },
};
export const AGENT_PUSH_T = {
  de: { agent: 'Fuhrparkagent: Handlungsbedarf', critical_n: '{n} neue kritische Befunde', reminder: 'Fuhrparkagent: neue Termine/Fristen' },
  uk: { agent: 'Агент автопарку: потрібні дії', critical_n: 'Нових критичних знахідок: {n}', reminder: 'Агент автопарку: нові терміни/строки' },
  en: { agent: 'Fleet agent: action required', critical_n: '{n} new critical findings', reminder: 'Fleet agent: new dates/deadlines' },
};
export const reminderLabel = (code, lang) => (REMINDER_LABEL_I18N[lang] && REMINDER_LABEL_I18N[lang][code]) || REMINDER_LABEL[code];
// Sammel-Erinnerung je Sprache: „2× Prüftermin bald fällig, 1× …“ (Reihenfolge wie die Befunde, ohne Kennzeichen/Details)
export function reminderBody(codes, lang, environment) {
  const counts = new Map();
  for (const c of codes) counts.set(reminderLabel(c, lang), (counts.get(reminderLabel(c, lang)) || 0) + 1);
  return [...counts].map(([k, n]) => `${n}× ${k}`).join(', ') + (environment === 'test' ? ' · TEST' : '');
}
// Einzelner neuer kritischer Befund: Kurzbezeichnung in der Sprache der Person statt des rohen Codes (ohne Kennzeichen/Namen –
// Push-Texte erscheinen auf dem Sperrbildschirm), Code in Klammern für Rückfragen.
export const criticalBody = (code, lang, environment) => `${findingLabel(code, lang)}${findingLabel(code, lang) !== code ? ` (${code})` : ''}${environment === 'test' ? ' · TEST' : ''}`;
// Gespeicherte Agent-Hinweise in der aktuellen Sprache der Person anzeigen (Hinweisliste): Einzelbefund „Bezeichnung (CODE)“,
// Sammel-Erinnerung „2× Bezeichnung, 1× …“ und „N neue kritische Befunde“. Unbekannte Bestandteile → Text unverändert.
const REM_LABEL_CODE = new Map(['de', 'uk', 'en'].flatMap((l) => Object.keys(REMINDER_LABEL).map((c) => [reminderLabel(c, l), c])));
export function localizedAgentBody(n, lang) {
  const L = AGENT_PUSH_T[lang] ? lang : 'de';
  const b = n.body;
  if (typeof b !== 'string' || !b || (n.kind !== 'agent' && n.kind !== 'agent_reminder')) return b;
  const test = b.endsWith(' · TEST') ? ' · TEST' : '';
  const core = test ? b.slice(0, -test.length) : b;
  if (n.kind === 'agent') {
    const c = /^.+ \(([A-Z][A-Z0-9_]*)\)$/.exec(core);
    if (c) return findingLabel(c[1], L) !== c[1] ? criticalBody(c[1], L, test ? 'test' : 'production') : b;
    for (const l of ['de', 'uk', 'en']) {
      const [pre, post] = AGENT_PUSH_T[l].critical_n.split('{n}');
      if (core.startsWith(pre) && core.endsWith(post) && /^\d+$/.test(core.slice(pre.length, core.length - post.length))) return AGENT_PUSH_T[L].critical_n.replace('{n}', core.slice(pre.length, core.length - post.length)) + test;
    }
    return b;
  }
  const parts = core.split(', ').map((x) => /^(\d+)× (.+)$/.exec(x));
  if (!parts.every((m) => m && REM_LABEL_CODE.has(m[2]))) return b;
  return parts.map((m) => `${m[1]}× ${reminderLabel(REM_LABEL_CODE.get(m[2]), L)}`).join(', ') + test;
}
export function localizedAgentTitle(n, lang) {
  const L = AGENT_PUSH_T[lang] ? lang : 'de';
  if (n.kind !== 'agent_reminder') return n.title;
  return ['de', 'uk', 'en'].some((l) => AGENT_PUSH_T[l].reminder === n.title) ? AGENT_PUSH_T[L].reminder : n.title;
}
const chunks = (a) => { const out = []; for (let i = 0; i < a.length; i += CHUNK) out.push(a.slice(i, i + CHUNK)); return out; };

const ageMin = (iso) => Math.round((Date.now() - Date.parse(iso)) / 60000);
// Meldungstexte enthalten den Zeitpunkt statt einer laufenden Minutenzahl: so bleibt der Text zwischen zwei Läufen gleich
// und der Agent schreibt nur geänderte Befunde (D1-Schreibkontingent: sonst jede Viertelstunde alle Befunde neu).
// (Vorlagen: „seit {at}“ mit at = berlinDateTime(…))
// Felder, deren Änderung einen Befund „geändert“ macht (sonst kein Schreibzugriff)
const ROW_FIELDS = ['case_id', 'vehicle_id', 'severity', 'message', 'message_args', 'next_action', 'owner_role', 'requires_decision', 'fingerprint', 'fp_src'];

// Ausgangslisten des Agenten (Einstellungen, Empfänger, Sperren, Restarbeiten, nicht zugestellte Push, ruhende Fahrzeuge)
// als JSON-Arrays in einer Abfrage – gleiche Bedingungen wie zuvor die sieben Einzelabfragen.
const BASICS_SQL = `SELECT
  (SELECT json_group_array(json_object('key', key, 'value', value)) FROM settings) AS settings,
  (SELECT json_group_array(json_object('id', id, 'role', role, 'workshop_site', workshop_site, 'language', language)) FROM users
     WHERE environment=?1 AND role IN ('fleet','owner','workshop') AND active=1 AND password_hash IS NOT NULL) AS users,
  (SELECT json_group_array(json_object('case_id', case_id, 'n', n)) FROM (SELECT o.case_id, COUNT(*) AS n FROM open_items o JOIN cases c ON c.id=o.case_id
     WHERE c.environment=?1 AND c.status IN ('werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle') AND o.status='offen' AND o.safety_relevant=1 GROUP BY o.case_id)) AS safety_open,
  (SELECT json_group_array(json_object('id', c.id, 'case_no', c.case_no, 'vehicle_id', c.vehicle_id, 'plate', v.plate, 'safety_lock_reason', c.safety_lock_reason,
       -- gesperrter Anhänger: fest gekoppelte Zugmaschine laut Stammliste (Befundtext nennt sie, 23.10.2026)
       'truck', CASE WHEN v.kind='anhaenger' THEN (SELECT o.plate FROM vehicles o WHERE o.active=1 AND o.kind='lkw' AND ${PLATE_KEY_SQL('o.trailer_plate')}<>''
         AND ${PLATE_KEY_SQL('o.trailer_plate')}=${PLATE_KEY_SQL('v.plate')} AND ${COUPLING_PREFERRED_SQL('o')} AND ${COUPLING_PREFERRED_SQL('v')} ORDER BY o.plate LIMIT 1) END))
     FROM cases c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.environment=?1 AND c.safety_lock=1 AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')) AS locked,
  (SELECT json_group_array(json_object('id', id, 'case_no', case_no, 'vehicle_id', vehicle_id, 'plate', plate, 'n', n)) FROM (SELECT c.id, c.case_no, c.vehicle_id, v.plate, COUNT(o.id) AS n
     FROM cases c JOIN vehicles v ON v.id=c.vehicle_id AND v.active=1 JOIN open_items o ON o.case_id=c.id AND o.status='offen'
     WHERE c.environment=?1 AND c.status='fahrzeug_freigegeben' GROUP BY c.id)) AS released_open,
  (SELECT json_group_array(json_object('case_id', case_id, 'vehicle_id', vehicle_id, 'n', n, 'who', json(who),
     -- Bezeichnung für den gebündelten Befund (Backlog 194): Vorgang „Nr. (Kennzeichen)“ bzw. Kennzeichen des Fahrzeugs
     'label', CASE WHEN case_id IS NOT NULL THEN (SELECT x.case_no || ' (' || xv.plate || ')' FROM cases x JOIN vehicles xv ON xv.id=x.vehicle_id WHERE x.id=case_id)
       WHEN vehicle_id IS NOT NULL THEN (SELECT xv.plate FROM vehicles xv WHERE xv.id=vehicle_id) END)) FROM (SELECT q.cid AS case_id, MAX(q.vref) AS vehicle_id, COUNT(DISTINCT q.user_id) AS n,
     -- Empfänger mit Name und Rolle (Backlog 114, 22.10.2026: „telefonisch informieren“ ohne zu sagen, wen) – Schnittstelle schwärzt die Namen
     json_group_array(DISTINCT json_object('id', q.user_id, 'name', q.uname, 'role', q.urole)) AS who FROM (
     -- Hinweise an zugeordnete Fahrer tragen bewusst keine case_id (Fahrer sieht den Vorgang nicht) – Vorgang aus dem event_key
     -- „<case_id>:<art>:<version>“ (21.10.2026: Befund blieb nach Abschluss des Vorgangs 48 h als „system“ offen)
     -- ohne Vorgang: Fahrzeug aus dem Bezug (z. B. Prüfung „verkehrsunsicher“) – Befund mit Link zur Fahrzeugakte statt „system“ (22.10.2026)
     SELECT n.user_id, u.display_name AS uname, u.role AS urole, n.created_at, CASE WHEN n.ref LIKE 'vehicle:%' THEN substr(n.ref, 9) END AS vref, COALESCE(n.case_id, (SELECT x.id FROM cases x WHERE x.id=substr(n.event_key, 1, instr(n.event_key, ':') - 1) AND x.environment=?1)) AS cid
     FROM notifications n JOIN users u ON u.id=n.user_id AND u.active=1
     WHERE n.environment=?1 AND n.urgent=1 AND n.acknowledged_at IS NULL AND n.opened_at IS NULL
     AND n.push_status IN ('failed','no_subscription') AND n.created_at > ?2 AND n.hidden_at IS NULL
     -- eigene Agent-Pushs an Leitung/Inhaber nicht (Inhalt steht ohnehin im Master-Eingang; 21.10.2026: Leitung ohne Push-Gerät bekam
     -- „telefonisch informieren“ über sich selbst, 48 h offen)
     AND n.kind NOT IN ('agent','agent_reminder')) q
     -- erledigt, wenn der Vorgang abgeschlossen ist oder die Person ihn seitdem selbst bearbeitet hat (vorher meldete der Agent bis 48 h
     -- „nicht zugestellt – telefonisch informieren“, obwohl die Werkstatt den Auftrag längst übernommen/erledigt hatte, 20.10.2026)
     WHERE NOT EXISTS (SELECT 1 FROM cases x WHERE x.id=q.cid AND x.status IN ('fahrzeug_freigegeben','abgelehnt'))
     AND NOT EXISTS (SELECT 1 FROM case_events e WHERE e.case_id=q.cid AND e.actor_id=q.user_id AND e.created_at >= q.created_at)
     GROUP BY q.cid, CASE WHEN q.cid IS NULL THEN q.vref END)) AS undelivered,
  (SELECT json_group_array(id) FROM vehicles WHERE eval_excluded=1) AS excluded,
  (SELECT json_group_array(code) FROM workshops WHERE active=0) AS closed_ws`;

// Empfänger einer nicht zugestellten dringenden Nachricht: [{name, role}] nach Name sortiert (gleiche Reihenfolge je Lauf – sonst würde der
// Befund bei jedem Lauf neu geschrieben), höchstens 8 genannt, Rest als „+n“
export const WHO_MAX = 8;
export function undeliveredWho(list) {
  const seen = new Set(); const out = [];
  for (const x of Array.isArray(list) ? list : []) { if (!x || seen.has(x.id)) continue; seen.add(x.id); out.push({ name: String(x.name || ''), role: x.role || null }); }
  out.sort((a, b) => a.name.localeCompare(b.name, 'de') || String(a.role).localeCompare(String(b.role)));
  return out.length > WHO_MAX ? [...out.slice(0, WHO_MAX), `+${out.length - WHO_MAX}`] : (out.length ? out : null);
}

// Bündelung der nicht zugestellten dringenden Nachrichten je Empfängerliste (Backlog 194). Schlüssel = sortierte Konto-IDs;
// Betreff „recipients:<Hash>“ bleibt gleich, solange dieselben Personen betroffen sind. Bezeichnungen sortiert (gleicher Text je Lauf),
// höchstens LABELS_MAX genannt, Rest „+n“.
export const URGENT_BUNDLE_MIN = 3;
export const LABELS_MAX = 8;
export function bundleUndelivered(list) {
  const groups = new Map();
  for (const u of Array.isArray(list) ? list : []) {
    const ids = [...new Set((Array.isArray(u.who) ? u.who : []).filter((x) => x && x.id).map((x) => String(x.id)))].sort();
    const key = ids.join(',');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(u);
  }
  const out = [];
  for (const [key, items] of groups) {
    if (!key || items.length < URGENT_BUNDLE_MIN) { for (const u of items) out.push({ single: u }); continue; }
    const labels = items.map((u) => String(u.label || '')).filter(Boolean).sort((a, b) => a.localeCompare(b, 'de'));
    const shown = labels.length > LABELS_MAX ? [...labels.slice(0, LABELS_MAX), `+${labels.length - LABELS_MAX}`] : labels;
    out.push({ subject: `recipients:${sha256HexSync(key).slice(0, 24)}`, items, n: key.split(',').length,
      who: items[0].who, labels: shown.length ? shown.join(', ') : null });
  }
  return out;
}

export async function agentBasics(env, environment) {
  const row = await env.DB.prepare(BASICS_SQL).bind(environment, new Date(Date.now() - 48 * 3600000).toISOString()).first();
  const out = {};
  for (const k of ['settings', 'users', 'safety_open', 'locked', 'released_open', 'undelivered', 'excluded', 'closed_ws']) out[k] = JSON.parse(row?.[k] || '[]');
  return out;
}

export async function runFleetAgent(env, ctx, environment, trigger = 'cron') {
  const runId = uuid();
  const started = nowIso();
  // Lauf-Sperre je Umgebung (Backlog 86): läuft schon ein Lauf (jünger als 10 Min., nicht beendet), startet kein zweiter – sonst doppelte
  // Übergaben und Sammel-Pushs bei gleichzeitigem Cron und „Agent ausführen“. Abgebrochene Läufe (> 10 Min. ohne Ende) sperren nicht.
  const ins = await env.DB.prepare(`INSERT INTO agent_runs(id,environment,trigger,started_at) SELECT ?1,?2,?3,?4
    WHERE NOT EXISTS (SELECT 1 FROM agent_runs WHERE environment=?2 AND finished_at IS NULL AND started_at > ?5)`).bind(runId, environment, trigger, started, new Date(Date.parse(started) - 600000).toISOString()).run();
  if (!(ins.meta && ins.meta.changes)) {
    if (trigger === 'cron') return { skipped: true, running: true };
    throw conflict('agent_running', 'Der Fuhrparkagent läuft gerade – bitte in einer Minute erneut versuchen.');
  }
  try {
    // Kleine Ausgangslisten in EINER D1-Abfrage (Abfragebudget je Aufruf, siehe Backlog 74)
    const base = await agentBasics(env, environment);
    const settings = new Map(base.settings.map((r) => [r.key, r.value]));
    const findings = [];
    const add = (f) => findings.push({ requires_decision: 0, case_id: null, vehicle_id: null, message_args: null, ...f });

    // Leitung (Empfänger) und Werkstattstandorte mit Zugang in einer Abfrage
    const activeUsers = base.users;
    const fleetUsers = activeUsers.filter((u) => u.role !== 'workshop');
    if (fleetUsers.length === 0) {
      add({ code: 'NO_FLEET_RECIPIENT', subject: 'system', severity: 'kritisch', owner_role: 'owner', requires_decision: 1,
        ...fm('NO_FLEET_RECIPIENT', {}),
        next_action: 'Fuhrparkleitung als Benutzer anlegen und Einladung annehmen lassen.' });
    }

    // status_since: Eintritt in den aktuellen Status (Werkstattfreigabe/-umleitung, Teilewarten) – Kommentar/Wiedervorlage ändern updated_at
    // und starteten die Übernahmefrist sonst neu (17.10.2026); in derselben Abfrage (Abfragebudget)
    const open = (await env.DB.prepare(`SELECT c.*, v.plate, COALESCE((SELECT MAX(e.created_at) FROM case_events e WHERE e.case_id=c.id AND e.to_status=c.status
        AND (e.from_status IS NOT e.to_status OR e.action='reassign_workshop')), c.updated_at) AS status_since FROM cases c JOIN vehicles v ON v.id=c.vehicle_id
      WHERE c.environment=? AND c.status IN ('gemeldet','werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle')`).bind(environment).all()).results;

    // geschlossene Werkstatt (workshops.active=0, Backlog 191): ihr noch aktives Konto zählt nicht als Empfänger – vorher meldete der
    // Master-Eingang „alles erledigt“, obwohl dort niemand mehr arbeitet; Handlungsempfehlung ohne „Werkstattbenutzer anlegen“ (dort unmöglich)
    const closedWs = new Set(base.closed_ws || []);
    const sitesWithUsers = new Set(activeUsers.filter((u) => u.role === 'workshop' && !closedWs.has(u.workshop_site)).map((r) => r.workshop_site));

    const safetyOpen = new Map(base.safety_open.map((r) => [r.case_id, r.n]));

    // Vorgang ohne Bewegung: nur mit Einstellung `case_stale_days` (leer = aus, keine eigene Frist). Bezug = letzte Änderung am Vorgang
    // (jede Aktion inkl. Kommentar setzt updated_at); der Text nennt das Datum statt einer laufenden Tageszahl. „Wartet auf Teile“ und
    // „Abschlusskontrolle“ haben eigene Befunde, unbewertete Meldungen/nicht übernommene Aufträge ebenfalls.
    const staleDays = Number(settings.get('case_stale_days'));
    const staleLimit = staleBefore(staleDays);
    const STALE_DE = FINDING_ENUMS.de.STALE; // Zustände mit Nachfassen (Texte in public/finding-messages.js)
    const fuToday = berlinDate();
    for (const c of open) {
      const label = `${c.case_no} (${c.plate})`;
      // Wiedervorlage (von der Leitung selbst gesetztes Datum): ab dem Tag als Hinweis, bis neu gesetzt/entfernt oder Vorgang abgeschlossen
      if (c.followup_on && c.followup_on <= fuToday) {
        add({ code: 'CASE_FOLLOWUP_DUE', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
          ...fm('CASE_FOLLOWUP_DUE', { label, date: c.followup_on.split('-').reverse().join('.'), note: c.followup_note || null }),
          next_action: 'Vorgang prüfen; neue Wiedervorlage setzen oder entfernen.' });
      }
      if (staleLimit && STALE_DE[c.status] && (c.status !== 'gemeldet' || c.fleet_received_at) && (c.status !== 'werkstatt_freigegeben' || c.workshop_ack_at)) {
        const last = berlinDate(c.updated_at);
        if (c.updated_at < staleLimit) {
          add({ code: 'CASE_STALE', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: c.status === 'gemeldet' ? 'fleet' : 'workshop',
            ...fm('CASE_STALE', { label, state: c.status, date: last.split('-').reverse().join('.'), days: staleDays }),
            next_action: c.status === 'gemeldet' ? 'Vorgang an eine Werkstatt weiterleiten oder begründet ablehnen.' : 'Stand bei der Werkstatt erfragen; Fortschritt, Teilebedarf oder Termin im Vorgang eintragen.' });
        }
      }
      if (c.status === 'gemeldet' && !c.fleet_received_at) {
        const urgent = c.priority === 'kritisch' || c.safety_lock;
        const sla = slaMinutes(settings, environment, 'triage', c.priority);
        const age = ageMin(c.created_at);
        if (urgent) {
          add({ code: 'CRITICAL_UNTRIAGED', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'kritisch', owner_role: 'fleet', requires_decision: 1,
            ...fm('CRITICAL_UNTRIAGED', { label, at: berlinDateTime(c.created_at) }),
            next_action: 'Meldung bewerten, Fahrzeug nicht disponieren, Werkstatt festlegen.' });
        } else if (sla !== null && age > sla) {
          add({ code: 'TRIAGE_OVERDUE', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 0,
            ...fm('TRIAGE_OVERDUE', { label, at: berlinDateTime(c.created_at), sla }), next_action: 'Meldung bewerten und Priorität bestätigen.' });
        } else {
          add({ code: 'TRIAGE_OPEN', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
            ...fm(sla === null ? 'TRIAGE_OPEN_NOSLA' : 'TRIAGE_OPEN', { label, at: berlinDateTime(c.created_at) }), next_action: 'Meldung bewerten.' });
        }
      }
      if (c.status === 'werkstatt_freigegeben' && !c.workshop_ack_at) {
        const sla = slaMinutes(settings, environment, 'ack', c.priority);
        const age = ageMin(c.status_since);
        const noUser = c.workshop_site && !sitesWithUsers.has(c.workshop_site);
        if (noUser) {
          add({ code: 'NO_WORKSHOP_RECIPIENT', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'kritisch', owner_role: 'fleet', requires_decision: 1,
            ...fm('NO_WORKSHOP_RECIPIENT', { label, site: c.workshop_site }),
            next_action: closedWs.has(c.workshop_site) ? 'Werkstatt geschlossen – andere Werkstatt zuweisen.' : 'Werkstattbenutzer anlegen oder andere Werkstatt zuweisen.' });
        } else if (c.priority === 'kritisch' || (sla !== null && age > sla)) {
          add({ code: 'WORKSHOP_ACK_MISSING', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: c.priority === 'kritisch' ? 'kritisch' : 'handeln', owner_role: 'fleet', requires_decision: c.priority === 'kritisch' ? 1 : 0,
            ...fm('WORKSHOP_ACK_MISSING', { label, at: berlinDateTime(c.status_since), site: c.workshop_site }),
            next_action: 'Werkstatt direkt kontaktieren oder Auftrag umleiten.' });
        } else {
          add({ code: 'WORKSHOP_ACK_PENDING', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'workshop',
            ...fm(sla === null ? 'WORKSHOP_ACK_PENDING_NOSLA' : 'WORKSHOP_ACK_PENDING', { label, site: c.workshop_site, at: berlinDateTime(c.status_since) }), next_action: 'Auftrag übernehmen.' });
        }
      }
      // Übernommener Auftrag, dessen Werkstatt-Standort kein aktives Konto mehr hat (Konto deaktiviert/versetzt, 22.10.2026):
      // vorher nur bei nicht übernommenen Aufträgen gemeldet – Werkstatthinweise (Kommentar, Nacharbeit) liefen still ins Leere.
      // „Abschlusskontrolle“ ausgenommen (handelt die Leitung; Nacharbeit führt zurück nach „in Reparatur“ und wird dann gemeldet).
      if (((c.status === 'werkstatt_freigegeben' && c.workshop_ack_at) || c.status === 'in_reparatur' || c.status === 'wartet_teile')
          && c.workshop_site && !sitesWithUsers.has(c.workshop_site)) {
        const crit = c.priority === 'kritisch' || !!c.safety_lock;
        add({ code: 'NO_WORKSHOP_RECIPIENT', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: crit ? 'kritisch' : 'handeln', owner_role: 'fleet', requires_decision: 1,
          ...fm('NO_WORKSHOP_RECIPIENT_ACKED', { label, site: c.workshop_site }),
          next_action: closedWs.has(c.workshop_site) ? 'Werkstatt geschlossen – Auftrag als Fuhrparkleitung weiterführen.' : 'Werkstattbenutzer anlegen oder Auftrag als Fuhrparkleitung weiterführen.' });
      }
      if (c.status === 'wartet_teile') {
        add({ code: 'WAITING_PARTS', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: c.priority === 'kritisch' ? 'handeln' : 'hinweis', owner_role: 'fleet',
          ...fm('WAITING_PARTS', { label, at: berlinDateTime(c.status_since) }), next_action: 'Teilelieferung klären, Dispo informieren.' });
      }
      // Kostenfreigabe ausstehend (Grenze überschritten): Zustand, keine Frist – ohne Beträge im Text
      if (c.cost_over_limit_at) {
        add({ code: 'COST_APPROVAL_PENDING', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'fleet', requires_decision: 1,
          ...fm('COST_APPROVAL_PENDING', { label, at: berlinDateTime(c.cost_over_limit_at) }), next_action: 'Kosten prüfen und freigeben oder mit der Werkstatt klären.' });
      }
      if (c.status === 'abschlusskontrolle') {
        add({ code: 'QC_PENDING', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 1,
          ...fm('QC_PENDING', { label }),
          next_action: 'Kontrolle durchführen: freigeben oder Nacharbeit anfordern.' });
      }
      // alle Werkstattzustände – bei „wartet auf Teile“ erledigte sich der Befund sonst und wurde nach „fortgesetzt“ erneut übergeben (17.10.2026)
      if (['werkstatt_freigegeben', 'in_reparatur', 'wartet_teile', 'abschlusskontrolle'].includes(c.status)) {
        const oi = { n: safetyOpen.get(c.id) || 0 };
        if (oi.n > 0) add({ code: 'SAFETY_OPEN_ITEMS', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'handeln', owner_role: 'workshop',
          ...fm('SAFETY_OPEN_ITEMS', { label, n: oi.n }), next_action: 'Restarbeiten erledigen oder Teile beschaffen.' });
      }
    }

    // Gesperrte Fahrzeuge (für Dispo sichtbar)
    const locked = base.locked;
    for (const l of locked) {
      add({ code: 'VEHICLE_LOCKED', subject: l.vehicle_id, case_id: l.id, vehicle_id: l.vehicle_id, severity: 'info', owner_role: 'dispatch',
        ...fm(l.safety_lock_reason ? 'VEHICLE_LOCKED' : 'VEHICLE_LOCKED_DEFAULT', { plate: l.plate, reason: l.safety_lock_reason || null, ...(l.truck ? { truck: l.truck } : {}) }), next_action: 'Bis zur technischen Freigabe nicht einplanen.' });
    }

    // Freigegeben, aber Restarbeiten offen
    const relOpen = base.released_open;
    for (const r of relOpen) {
      add({ code: 'RELEASED_WITH_OPEN_ITEMS', subject: r.id, case_id: r.id, vehicle_id: r.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
        ...fm('RELEASED_WITH_OPEN_ITEMS', { label: `${r.case_no} (${r.plate})`, n: r.n }), next_action: 'Werkstatttermin für Restarbeiten planen.' });
    }

    // Dringende Benachrichtigungen ohne Push-Zustellung
    // Backlog 194 (Teilagent „Frostmorgen“, 23.10.2026): 13 kritische Meldungen an dieselben Empfänger ergaben 13 gleichlautende Befunde.
    // Ab URGENT_BUNDLE_MIN Vorgängen/Fahrzeugen mit genau derselben Empfängerliste ein Befund „an N Vorgängen“ – nur Bündelung,
    // nichts wird unterdrückt (jede Zeile zählt weiter, auch wenn sie später einzeln wieder auftaucht).
    const undelivered = [];
    for (const g of bundleUndelivered(base.undelivered)) {
      if (g.single) { undelivered.push(g.single); continue; }
      add({ code: 'URGENT_NOT_DELIVERED', subject: g.subject, severity: 'handeln', owner_role: 'fleet',
        ...fm('URGENT_NOT_DELIVERED_BULK', { k: g.items.length, n: g.n, labels: g.labels, who: undeliveredWho(g.who) }),
        next_action: 'Empfänger telefonisch informieren; Push auf deren Geräten aktivieren.' });
    }
    for (const u of undelivered) {
      add({ code: 'URGENT_NOT_DELIVERED', subject: u.case_id || (u.vehicle_id ? `vehicle:${u.vehicle_id}` : 'system'), case_id: u.case_id, ...(u.case_id || !u.vehicle_id ? {} : { vehicle_id: u.vehicle_id }), severity: 'handeln', owner_role: 'fleet',
        ...fm('URGENT_NOT_DELIVERED', { n: u.n, who: undeliveredWho(u.who) }),
        next_action: 'Empfänger telefonisch informieren; Push auf deren Geräten aktivieren.' });
    }

    // Kosten unbewertet bei abgeschlossenen Vorgängen (letzte 90 Tage)
    const rateRaw = settings.get('workshop_hourly_rate_net');
    const rate = rateOf(rateRaw);
    const closed = (await env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate,
        (SELECT COUNT(*) FROM work_entries w WHERE w.case_id=c.id) AS hours_n,
        (SELECT COUNT(*) FROM parts p WHERE p.case_id=c.id AND (p.unit_price_net IS NULL OR p.valuation='unvalued')) AS unv_n,
        (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id AND e.covers_work_and_parts=1) AS ext_n,
        (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id AND (e.amount_net IS NULL OR e.valuation='unvalued')) AS ext_unv_n
      FROM cases c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.environment=? AND c.status='fahrzeug_freigegeben' AND c.closed_at > ?`)
      .bind(environment, new Date(Date.now() - 90 * 86400000).toISOString()).all()).results;
    for (const c of closed) {
      const hasHours = { n: c.hours_n }; const unvParts = { n: c.unv_n }; const ext = { n: c.ext_n };
      // gleiche Regel wie computeCosts (Akte/Vorgang): auch Fremdleistungen ohne Betrag – auch wenn sie eigene Arbeit/Teile ersetzen (vorher kein Befund, 17.10.2026)
      if (c.ext_unv_n > 0) {
        const own = ext.n ? 0 : (hasHours.n > 0 && rate === null ? 1 : 0) + unvParts.n;
        add({ code: 'COSTS_UNVALUED', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'owner',
          ...fm(own ? 'COSTS_UNVALUED_ITEMS' : 'COSTS_UNVALUED_EXT', { label: `${c.case_no} (${c.plate})`, n: own + c.ext_unv_n }),
          next_action: 'Stundensatz ggf. in den Einstellungen festlegen; fehlende Rechnungsbeträge bzw. Teilepreise lassen sich nach der Freigabe nicht nachtragen – Rechnung am Vorgang hochladen bzw. kommentieren (Hinweis endet 90 Tage nach Abschluss).' }); // 22.10.2026: Nachtragen nach Freigabe gibt es nicht (offene Frage „Kostenpositionen stornieren“)
      } else if (!ext.n && ((hasHours.n > 0 && rate === null) || unvParts.n > 0)) {
        add({ code: 'COSTS_UNVALUED', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'owner',
          ...fm(rate === null && hasHours.n ? (unvParts.n ? 'COSTS_UNVALUED_BOTH' : 'COSTS_UNVALUED_RATE') : 'COSTS_UNVALUED_PARTS', { label: `${c.case_no} (${c.plate})`, n: unvParts.n || null }),
          next_action: 'Stundensatz in den Einstellungen festlegen; fehlende Teilepreise lassen sich nach der Freigabe nicht nachtragen – Rechnung am Vorgang hochladen bzw. kommentieren (Hinweis endet 90 Tage nach Abschluss).' });
      }
    }

    // Wartung/Prüftermine (nur aus belegten Regeln); „heute“ nach Berliner Kalender wie Übersicht und HU/SP-Regeln
    const today = berlinDate();
    const rules = (await env.DB.prepare(`SELECT m.*, v.plate FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id WHERE v.active=1`).all()).results;
    const warnDays = maintenanceWarnDays(settings.get('maintenance_warn_days'));
    const warnKm = Number(settings.get('maintenance_warn_km')) > 0 ? Number(settings.get('maintenance_warn_km')) : null;
    const latestKm = rules.some((r) => ruleDueKm(r) !== null) ? await latestKmByVehicle(env) : new Map();
    for (const r of rules) {
      if (r.kind === 'Rückruf' && r.last_done_date) continue; // durchgeführt: keine Folgefrist (20.10.2026)
      // geplanter Werkstatttermin (ab heute) wie bei HU/SP: nicht erneut „einplanen“ raten (23.10.2026, Rückrufaktion mit Termin + Auftrag)
      const planned = r.planned_date && r.planned_date >= today;
      // km-Fälligkeit (belegt oder aus Intervall + letzter Durchführung in km) – nur mit belegtem km-Stand
      const k = kmDue(r, latestKm.get(r.vehicle_id), warnKm);
      if (k && k.km_status === 'ueberfaellig') add({ code: 'MAINTENANCE_OVERDUE', subject: `${r.id}|km`, vehicle_id: r.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 1,
        ...fm('MAINT_KM_OVERDUE', { plate: r.plate, kind: r.kind, due: k.next_due_km, km: k.current_km, date: berlinDateTime(k.km_measured_at).slice(0, 10) }), next_action: planned ? 'Geplanten Termin wahrnehmen; Einsatzfähigkeit fachlich prüfen.' : 'Termin vereinbaren; Einsatzfähigkeit fachlich prüfen.' });
      else if (k && k.km_status === 'faellig') add({ code: 'MAINTENANCE_DUE', subject: `${r.id}|km`, vehicle_id: r.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
        ...fm('MAINT_KM_DUE', { plate: r.plate, kind: r.kind, due: k.next_due_km, km: k.current_km, rest: k.km_remaining }), next_action: planned ? 'Geplanten Termin wahrnehmen und Durchführung belegen.' : 'Werkstatttermin einplanen.' });
      // km-Zähler nach der letzten Änderung der Regel gesunken (Tachotausch o. Ä.): Fälligkeit nach km ungeklärt statt falscher Restlaufleistung
      else if (k && k.km_status === 'ungeklaert' && k.km_unclear === 'counter_drop') add({ code: 'INSPECTION_UNCLEAR', subject: `${r.id}|km|zaehler`, vehicle_id: r.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
        ...fm('MAINT_KM_UNCLEAR', { plate: r.plate, kind: r.kind, date: berlinDateTime(k.km_drop_at).slice(0, 10) }), next_action: 'Durchführung mit km-Stand des neuen Zählers erfassen oder km-Fälligkeit mit Nachweis neu eintragen.' });
      if (r.kind === 'HU' || r.kind === 'SP') continue; // HU/SP: zentrale Berechnung nach StVZO Anlage VIII (unten)
      const due = r.next_due_date;
      if (!due) continue;
      const days = Math.round((Date.parse(due) - Date.parse(today)) / 86400000);
      if (days < 0) add({ code: 'MAINTENANCE_OVERDUE', subject: r.id, vehicle_id: r.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 1,
        ...fm('MAINT_DATE_OVERDUE', { plate: r.plate, kind: r.kind, days: -days, due }), next_action: planned ? 'Geplanten Termin wahrnehmen; Einsatzfähigkeit fachlich prüfen.' : 'Termin vereinbaren; Einsatzfähigkeit fachlich prüfen.' });
      else if (days <= warnDays) add({ code: 'MAINTENANCE_DUE', subject: r.id, vehicle_id: r.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
        ...fm('MAINT_DATE_DUE', { plate: r.plate, kind: r.kind, due, days }), next_action: planned ? 'Geplanten Termin wahrnehmen und Durchführung belegen.' : 'Werkstatttermin einplanen.' });
    }

    // HU/SP nach StVZO Anlage VIII: gespiegelte Fälligkeiten aktualisieren (nur Betrieb-Lauf, protokolliert) und Befunde bilden
    const todayB = berlinDate();
    // Betrieb: Eingangsdaten der Synchronisierung weiterverwenden (spart 3 Abfragen; Spiegelung ändert nur berechnete Termine, nicht die Bewertung)
    const huspIn = environment === 'production' ? (await syncHuSpDues(env, { today: todayB, warnDays })).inputs : await loadHuSpInputs(env);
    const H_LABEL = { HU: 'HU', SP: 'SP' };
    for (const [vid, x] of huspIn) {
      if (!x.v.active) continue; // außer Betrieb: Prüfpflicht ruht (Anlage VIII Nr. 2.7)
      const res = huSpFor(x, todayB, warnDays);
      for (const kind of ['HU', 'SP']) {
        const h = kind === 'HU' ? res.hu : res.sp;
        // fester Schlüssel je Fahrzeug und Prüfart (21.10.2026: war die Eintrags-ID, sobald es einen gab – „Termin planen“/„Auftrag erstellen“ bei
        // nur berechneter Frist legte den Eintrag an → Befund wechselte den Schlüssel: zweiter Master-Eintrag, erneute Erinnerung). Bisheriger
        // Schlüssel (Eintrags-ID) als legacy_subject: vorhandene Befunde werden einmal umgeschlüsselt, ohne neue Übergabe.
        const subject = `${vid}|${kind}`; const legacy_subject = res.rules[kind] || null;
        const m = (d) => `${d.slice(5, 7)}/${d.slice(0, 4)}`;
        // Fälligkeit laut Nachweis mit Tag (nicht Monatsende): die App rechnet mit diesem Tag – Befund nennt ihn (Backlog 94, 19.10.2026)
        const dayDue = (d) => { const [yy, mm, dd] = d.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(yy, mm, 0)).getUTCDate() !== dd; };
        const dDe = (d) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`; // deutsch gespeichert, Anzeige je Sprache (DATE_ARGS)
        // „6 Monate nach HU“ nur nennen, wenn die Fälligkeit tatsächlich daraus folgt (erste SP nach Erstzulassung hat eine andere Grundlage, 18.10.2026)
        const huPlus6 = (d) => { const t = Number(d.slice(0, 4)) * 12 + Number(d.slice(5, 7)) - 1 + 6; return `${String(t % 12 + 1).padStart(2, '0')}/${Math.floor(t / 12)}`; };
        // verstrichener Werkstatttermin zählt nicht als „geplant“ (wie bei den übrigen Prüfarten, Z. „planned … >= today“) – sonst „Geplanten
        // Termin wahrnehmen“ statt „einplanen“, wenn das Fahrzeug nicht zum Termin kam (Blickwinkel „Termin verpasst“, 24.10.2026)
        const hPlanned = h.planned_date && h.planned_date >= todayB ? h.planned_date : null;
        if (h.status === 'ueberfaellig') add({ code: 'MAINTENANCE_OVERDUE', subject, legacy_subject, vehicle_id: vid, severity: 'handeln', owner_role: 'fleet', requires_decision: 1,
          ...(dayDue(h.due) ? fm('HUSP_OVERDUE_DAY', { plate: x.v.plate, kind: H_LABEL[kind], due: dDe(h.due) }) : fm('HUSP_OVERDUE', { plate: x.v.plate, kind: H_LABEL[kind], due: m(h.due), hu: kind === 'SP' && res.hu.last_done && m(h.due) === huPlus6(res.hu.last_done) ? res.hu.last_done : null })),
          next_action: 'Prüftermin vereinbaren; Einsatzfähigkeit fachlich prüfen. Kein automatisches Verschieben.' });
        else if (h.status === 'bald_faellig') add({ code: 'MAINTENANCE_DUE', subject, legacy_subject, vehicle_id: vid, severity: 'hinweis', owner_role: 'fleet',
          ...fm(dayDue(h.due) ? 'HUSP_DUE_DAY' : 'HUSP_DUE', { plate: x.v.plate, kind: H_LABEL[kind], due: dayDue(h.due) ? dDe(h.due) : m(h.due), planned: hPlanned }), next_action: hPlanned ? 'Geplanten Termin wahrnehmen und Durchführung belegen.' : 'Werkstatttermin einplanen.' });
        else if (h.status === 'ungeklaert' && x.rules.length) add({ code: 'INSPECTION_UNCLEAR', subject: `${vid}|${kind}|unklar`, vehicle_id: vid, severity: 'hinweis', owner_role: 'fleet',
          ...fm('INSPECTION_UNCLEAR', { plate: x.v.plate, kind: H_LABEL[kind], note: h.notes[h.notes.length - 1] || 'Grundlage fehlt', nc: h.note_codes?.[h.note_codes.length - 1] || null }), next_action: 'Prüfbericht/Fahrzeugschein prüfen und fehlende Angaben in der Fahrzeugakte nachtragen.' });
      }
    }

    // Fahrzeugdokumente mit Gültig-bis-Datum (z. B. Versicherung, Leasing) – nur wenn das Datum beim Hochladen angegeben wurde
    const DOC_LABEL = { zulassung: 'Zulassung', pruefbericht: 'Prüfbericht', rechnung: 'Rechnung', versicherung: 'Versicherung', leasing: 'Leasing/Miete', rueckruf: 'Rückrufschreiben', foto: 'Foto', sonstiges: 'Dokument' };
    for (const d of await documentFindings(env, environment)) {
      const days = Math.round((Date.parse(d.valid_until) - Date.parse(today)) / 86400000);
      const subject = `${d.vehicle_id}|${d.doc_kind}${d.topic_key ? '|' + d.topic_key : ''}`; // ohne Thema unverändert (bestehende Befunde)
      if (days < 0) add({ code: 'DOCUMENT_EXPIRED', subject, vehicle_id: d.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 1,
        ...fm('DOCUMENT_EXPIRED', { plate: d.plate, doc: DOC_LABEL[d.doc_kind] ? d.doc_kind : 'sonstiges', topic: d.topic || null, date: d.valid_until }), next_action: 'Gültiges Dokument beschaffen und in der Fahrzeugakte hinterlegen.' });
      else if (days <= warnDays) add({ code: 'DOCUMENT_EXPIRES_SOON', subject, vehicle_id: d.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
        ...fm('DOCUMENT_EXPIRES_SOON', { plate: d.plate, doc: DOC_LABEL[d.doc_kind] ? d.doc_kind : 'sonstiges', topic: d.topic || null, date: d.valid_until, days }), next_action: 'Verlängerung/Nachfolgedokument veranlassen.' });
    }

    // Prüfung mit erheblichen/gefährlichen Mängeln bzw. verkehrsunsicher (≤ 12 Monate), seitdem kein Vorgang zum Fahrzeug – keine Frist angenommen
    const evLists = await maintenanceEventLists(env, environment); // eine D1-Abfrage für die drei Prüfungs-Listen
    for (const d of evLists.defects_without_case) {
      add({ code: 'INSPECTION_DEFECTS_NO_CASE', subject: d.id, vehicle_id: d.vehicle_id, severity: d.result === 'erhebliche_maengel' ? 'handeln' : 'kritisch', owner_role: 'fleet', requires_decision: 1,
        ...fm('INSPECTION_DEFECTS_NO_CASE', { plate: d.plate, kind: d.kind, date: d.done_date.split('-').reverse().join('.'), res: d.result }),
        next_action: d.result === 'erhebliche_maengel' ? 'In der Fahrzeugakte „Auftrag Mängelbeseitigung“ anlegen; Nachprüfung belegen.' : 'Einsatzfähigkeit fachlich prüfen, ggf. sperren; Auftrag Mängelbeseitigung anlegen.' });
    }

    // Mängelauftrag freigegeben, Nachprüfung noch nicht in der Akte – keine Frist angenommen (steht im Prüfbericht)
    for (const d of evLists.reinspection_pending) {
      add({ code: 'REINSPECTION_PENDING', subject: d.id, vehicle_id: d.vehicle_id, case_id: d.case_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 0,
        ...fm('REINSPECTION_PENDING', { plate: d.plate, kind: d.kind, date: d.done_date.split('-').reverse().join('.'), res: d.result, case_no: d.case_no }),
        next_action: 'Nachprüfung/Wiedervorführung durchführen lassen und mit Nachweis in der Fahrzeugakte eintragen (Frist laut Prüfbericht).' });
    }

    // In der App erfasste Pflichtprüfung (≤ 180 Tage, neueste ihrer Art) ohne Prüfergebnis – gleiche Regel wie Datenqualität `inspection_no_result`.
    // Ruhiger Hinweis ohne Push: ohne Ergebnis bliebe ein Prüfmangel (Auftrag, Sperre, Nachprüfung) unbemerkt.
    for (const d of evLists.result_missing) {
      add({ code: 'INSPECTION_RESULT_MISSING', subject: d.id, vehicle_id: d.vehicle_id, severity: 'hinweis', owner_role: 'fleet', requires_decision: 0,
        ...fm('INSPECTION_RESULT_MISSING', { plate: d.plate, kind: d.kind, date: d.done_date.split('-').reverse().join('.') }),
        next_action: 'Ergebnis laut Prüfbericht in der Fahrzeugakte nachtragen (Bisherige Durchführungen → Prüfergebnis nachtragen).' });
    }

    // Fahrzeugverträge (Leasing/Miete/…): Ende, Kündigungsfrist, km-Kontingent – nur laut eingetragenem Vertrag
    for (const x of await contractFindings(env, settings)) add(x);
    // Versicherungsfälle: nur mit eingestellter Nachfass-Frist (sonst keine Abfrage)
    for (const x of await claimFindings(env, environment, settings)) add(x);

    // Reifen: letzte Profilmessung unter gesetzlichem Minimum bzw. konfigurierter Warnschwelle
    for (const t of await tireFindings(env, environment, settings)) {
      // Reserverad unter 1,6 mm: kein Fahrverbot (Minimum gilt für montierte Reifen), aber vor Montage ersetzen – eigener Code, keine Entscheidung
      if (t.spare) { add({ code: 'TIRE_SPARE_BELOW_MINIMUM', subject: `${t.vehicle_id}|${t.position}`, vehicle_id: t.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 0,
        ...fm('TIRE_TREAD', { plate: t.plate, pos: t.position, mm: t.tread_mm, limit: t.limit, date: berlinDate(t.created_at) }), next_action: 'Reserverad nicht montieren – ersetzen lassen.' }); continue; }
      add({ code: t.severity === 'kritisch' ? 'TIRE_BELOW_MINIMUM' : 'TIRE_WARN', subject: `${t.vehicle_id}|${t.position}`, vehicle_id: t.vehicle_id,
        severity: t.severity, owner_role: 'fleet', requires_decision: t.severity === 'kritisch' ? 1 : 0,
        ...fm('TIRE_TREAD', { plate: t.plate, pos: t.position, mm: t.tread_mm, limit: t.limit, date: berlinDate(t.created_at) }),
        next_action: t.severity === 'kritisch' ? 'Reifen vor weiterer Fahrt prüfen/tauschen lassen.' : 'Reifenwechsel einplanen.' });
    }

    // Ersatzteile unter Mindestbestand
    for (const it of await stockFindings(env, environment)) {
      const sa = { site: it.site, name: it.name, pn: it.part_number || null, stock: it.on_hand, unit: it.unit, min: it.min_qty, oq: it.ordered_on ? it.ordered_qty : null, oon: it.ordered_on || null, eta: it.ordered_eta || null };
      if (it.code === 'STOCK_ORDER_OVERDUE') {
        add({ code: 'STOCK_ORDER_OVERDUE', subject: it.id, severity: 'hinweis', owner_role: 'workshop',
          ...fm('STOCK_ORDER_OVERDUE', sa),
          next_action: 'Beim Lieferanten nachfragen; bei Eingang Zugang buchen (beendet den Vermerk).' });
        continue;
      }
      add({ code: 'STOCK_BELOW_MIN', subject: it.id, severity: 'hinweis', owner_role: 'workshop',
        ...(it.ordered_on ? fm('STOCK_BELOW_MIN_ORD', { ...sa, open: it.open }) : fm('STOCK_BELOW_MIN', sa)),
        next_action: 'Nachbestellung prüfen (Bestellung nur nach Freigabe).' });
    }

    // Bußgelder: Fristen nur aus dem Schreiben; Fahrer offen; Kennzeichen unbekannt
    // Fahrerakte: Nachweise und Führerscheinkontrolle (Fristen nur laut Dokument)
    for (const x of await driverFindings(env, environment, settings)) add({ code: x.code, subject: x.subject, severity: x.severity, owner_role: 'fleet', requires_decision: x.requires_decision, message: x.message, message_args: x.message_args, next_action: x.next_action });
    for (const x of await tachoFindings(env, environment, settings)) add({ code: x.code, subject: x.subject, vehicle_id: x.vehicle_id || null, severity: x.severity, owner_role: 'fleet', requires_decision: x.requires_decision, message: x.message, message_args: x.message_args, next_action: x.next_action });

    for (const x of await fineFindings(env, environment, settings)) {
      add({ code: x.code, subject: x.f.id, vehicle_id: x.f.vehicle_id, severity: x.severity, owner_role: 'fleet', requires_decision: x.requires_decision, message: x.message, message_args: x.message_args, next_action: x.next_action });
    }

    // Ruhende Fahrzeuge (Inhaberentscheidung): keine fahrzeugbezogenen Bewertungsbefunde; vorgangsbezogene Sicherheitsbefunde bleiben
    // Kostenbewertung ist eine Auswertung (Kostenbericht nimmt ruhende Fahrzeuge aus) – deren Befund trotz Vorgangsbezug ebenfalls (17.10.2026)
    const EXCLUDED_CASE_CODES = ['COSTS_UNVALUED'];
    const excludedVeh = new Set(base.excluded);
    // Behördenfristen (Bußgelder) bleiben – sie hängen nicht an der Bewertung des Fahrzeugs (17.10.2026); ebenso Vertragsfristen (Kündigung,
    // Vertragsende): eine verpasste Kündigung verlängert das Leasing auch für ein ruhendes Fahrzeug, die Vertragsliste zeigt sie (18.10.2026)
    if (excludedVeh.size) for (let i = findings.length - 1; i >= 0; i--) if (findings[i].vehicle_id && (!findings[i].case_id || EXCLUDED_CASE_CODES.includes(findings[i].code)) && !String(findings[i].code).startsWith('FINE_') && !String(findings[i].code).startsWith('CONTRACT_') && excludedVeh.has(findings[i].vehicle_id)) findings.splice(i, 1);

    // ---- Befunde persistieren (Sammel-Upsert), Erledigtes schließen, Übergaben an Master ----
    const now = nowIso();
    const seen = new Set();
    let handoffs = 0;
    const newCritical = []; const newReminders = [];
    const existingMap = new Map((await env.DB.prepare(`SELECT id, finding_code, subject_key, status, fingerprint, first_seen, ${ROW_FIELDS.filter((k) => k !== 'fingerprint').join(', ')}
      FROM agent_findings WHERE environment=?`).bind(environment).all()).results.map((r) => [`${r.finding_code}|${r.subject_key}`, r]));
    const unique = [];
    for (const f of findings) {
      const key = `${f.code}|${f.subject}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(f);
    }
    // Fingerabdrücke gemeinsam berechnen (nicht 3000× nacheinander warten)
    // Gespeicherte Eingabe gleich → gespeicherten Fingerabdruck übernehmen (Migration 0073; erster Lauf einer Instanz ohne Hashen, 22.10.2026)
    const fpSrcs = unique.map((f) => `${f.code}|${f.subject}|${f.severity}|${f.requires_decision}`);
    const fingerprints = unique.map((f, i) => {
      const ex = existingMap.get(`${f.code}|${f.subject}`);
      return ex && ex.fp_src === fpSrcs[i] && ex.fingerprint ? ex.fingerprint : sha256Memo(fpSrcs[i]);
    });
    const rows = [];
    const renames = [];
    const candidates = [];
    for (let i = 0; i < unique.length; i++) {
      const f = unique[i]; const fingerprint = fingerprints[i];
      let existing = existingMap.get(`${f.code}|${f.subject}`);
      let legacyFp = null;
      if (!existing && f.legacy_subject && existingMap.has(`${f.code}|${f.legacy_subject}`)) {
        existing = existingMap.get(`${f.code}|${f.legacy_subject}`);
        renames.push(env.DB.prepare('UPDATE agent_findings SET subject_key=? WHERE id=?').bind(f.subject, existing.id));
        legacyFp = sha256HexSync(`${f.code}|${f.legacy_subject}|${f.severity}|${f.requires_decision}`);
      }
      const findingId = existing ? existing.id : uuid();
      const changed = !existing || existing.status !== 'offen' || (existing.fingerprint !== fingerprint && existing.fingerprint !== legacyFp);
      const row = { id: findingId, code: f.code, subject: f.subject, case_id: f.case_id ?? null, vehicle_id: f.vehicle_id ?? null, severity: f.severity, message: f.message, message_args: f.message_args ?? null,
        next_action: f.next_action, owner_role: f.owner_role, requires_decision: f.requires_decision ? 1 : 0, fingerprint, fp_src: fpSrcs[i] };
      // Unveränderte offene Befunde nicht erneut schreiben
      if (changed || ROW_FIELDS.some((k) => (existing[k] ?? null) !== row[k])) rows.push(row);
      if (changed && f.severity !== 'kritisch' && REMINDER_CODES.has(f.code)) newReminders.push(f);
      if (changed && SEV_RANK[f.severity] >= SEV_RANK.handeln) {
        // erledigter Befund, der wieder auftritt = neue Episode (das Upsert setzt first_seen neu) → neue Übergabe/Push (vorher alte event_id, nichts kam an, 17.10.2026)
        // offener Befund mit geändertem Fingerabdruck (z. B. kritisch → mittel → kritisch) = neue Eskalation: neue event_id (vorher kehrte die alte
        // event_id zurück, galt als bekannt – keine Übergabe, kein kritischer Push, 18.10.2026)
        candidates.push({ eventInput: `${findingId}|${fingerprint}|${existing && existing.status !== 'erledigt' && existing.fingerprint === fingerprint ? existing.first_seen : now}`, findingId, fingerprint, f });
      }
    }
    const eventIds = candidates.map((c) => sha256HexSync(c.eventInput));
    candidates.forEach((c, i) => { c.eventId = eventIds[i]; delete c.eventInput; });
    const J = (k) => `json_extract(value,'$.${k}')`;
    const upserts = [...renames, ...chunks(rows).map((part) => env.DB.prepare(`INSERT INTO agent_findings(id,environment,finding_code,subject_key,case_id,vehicle_id,severity,message,message_args,next_action,owner_role,requires_decision,status,fingerprint,fp_src,first_seen,last_seen)
      SELECT ${J('id')}, ?1, ${J('code')}, ${J('subject')}, ${J('case_id')}, ${J('vehicle_id')}, ${J('severity')}, ${J('message')}, ${J('message_args')}, ${J('next_action')}, ${J('owner_role')}, ${J('requires_decision')}, 'offen', ${J('fingerprint')}, ${J('fp_src')}, ?2, ?2
      FROM json_each(?3) WHERE 1
      ON CONFLICT(environment, finding_code, subject_key) DO UPDATE SET case_id=excluded.case_id, vehicle_id=excluded.vehicle_id, severity=excluded.severity, message=excluded.message, message_args=excluded.message_args,
        next_action=excluded.next_action, owner_role=excluded.owner_role, requires_decision=excluded.requires_decision, fingerprint=excluded.fingerprint, fp_src=excluded.fp_src, last_seen=excluded.last_seen,
        first_seen=CASE WHEN agent_findings.status='erledigt' THEN excluded.first_seen ELSE agent_findings.first_seen END, status='offen', resolved_at=NULL`)
      .bind(environment, now, JSON.stringify(part)))];
    // Gekappte Prüfungslisten (> 200 Einträge, nur die jüngsten gelesen): offene Befunde dieser Codes nicht als „erledigt“ schließen –
    // sie wurden nur nicht gelesen (19.10.2026; vorher erledigten sich ältere Prüfmängel still)
    const EV_CODE = { defects_without_case: 'INSPECTION_DEFECTS_NO_CASE', reinspection_pending: 'REINSPECTION_PENDING', result_missing: 'INSPECTION_RESULT_MISSING' };
    const keepCodes = new Set((evLists.truncated || []).map((n) => EV_CODE[n]).filter(Boolean));
    // … aber nicht für ruhende bzw. außer Betrieb genommene Fahrzeuge (19.10.2026: deren Befund blieb sonst dauerhaft offen)
    if (keepCodes.size) {
      const gone = new Set([...excludedVeh, ...(await env.DB.prepare('SELECT id FROM vehicles WHERE active=0').all()).results.map((r) => r.id)]);
      for (const [key, ex] of existingMap) if (ex.status === 'offen' && keepCodes.has(ex.finding_code) && !(ex.vehicle_id && gone.has(ex.vehicle_id))) seen.add(key);
    }
    // Nicht mehr zutreffende Befunde schließen (eine Anweisung)
    upserts.push(env.DB.prepare(`UPDATE agent_findings SET status='erledigt', resolved_at=?1 WHERE environment=?2 AND status='offen'
      AND (finding_code || '|' || subject_key) NOT IN (SELECT value FROM json_each(?3))`).bind(now, environment, JSON.stringify([...seen])));
    // Übergaben an den Master: idempotent über event_id; nur neue zählen. Im selben Stapel wie das Speichern der Befunde (18.10.2026: scheiterte
    // die Übergabe nach gespeicherten Befunden einmal, galt der Befund im nächsten Lauf als unverändert – die Übergabe ging endgültig verloren)
    let fresh = [];
    if (candidates.length) {
      const known = new Set();
      for (const part of chunks(candidates)) {
        for (const r of (await env.DB.prepare('SELECT event_id FROM master_inbox WHERE event_id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(part.map((c) => c.eventId))).all()).results) known.add(r.event_id);
      }
      fresh = candidates.filter((c) => !known.has(c.eventId));
      const payloads = fresh.map(({ eventId, findingId, f }) => ({
        schema_version: '1.0', event_id: eventId, event_type: 'fleet.finding.review_required', environment,
        occurred_at: now, finding_id: findingId, finding_code: f.code, case_id: f.case_id, vehicle_id: f.vehicle_id,
        severity: f.severity, message: f.message, ...(f.message_args ? { message_args: JSON.parse(f.message_args) } : {}), next_action: f.next_action, owner_role: f.owner_role,
        requires_human_approval: !!f.requires_decision, source_agent: 'claude-fleet-agent', agent_run_id: runId,
      }));
      if (payloads.length) {
        upserts.push(...chunks(payloads).map((part) => env.DB.prepare(`INSERT OR IGNORE INTO master_inbox(event_id,schema_version,environment,source_agent,event_type,finding_id,case_id,vehicle_id,severity,payload,received_at)
          SELECT json_extract(value,'$.event_id'), '1.0', ?1, 'claude-fleet-agent', json_extract(value,'$.event_type'), json_extract(value,'$.finding_id'), json_extract(value,'$.case_id'),
            json_extract(value,'$.vehicle_id'), json_extract(value,'$.severity'), value, ?2 FROM json_each(?3)`).bind(environment, now, JSON.stringify(part))));
      }
    }
    await env.DB.batch(upserts);
    if (fresh.length) {
      handoffs = fresh.length;
      for (const c of fresh) if (c.f.severity === 'kritisch') newCritical.push({ eventId: c.eventId, f: c.f });
    }
    // Master verarbeitet Eingänge (Bestätigung der Übernahme, getrennt von menschlicher Entscheidung)
    await processMasterInbox(env, environment);

    // Kritische neue Befunde zusätzlich an Fuhrparkleitung/Owner pushen
    let ids = null;
    const recipients = async () => ids || (ids = fleetUsers.map((r) => r.id)); // Empfänger wurden zu Beginn des Laufs geladen
    const langOf = new Map(fleetUsers.map((u) => [u.id, u.language]));
    const toDeliver = [];
    if (newCritical.length) {
      await recipients();
      // Abfragebudget: ab 2 neuen kritischen Befunden eine Sammelmeldung statt Einzel-Pushs (je Push ≈ 4 Abfragen; Agent liegt bei ≈ 44 von 50)
      if (newCritical.length > 1) {
        toDeliver.push(...await notifyUsers(env, ctx, environment, ids, { defer: true, kind: 'agent', title: AGENT_PUSH_T.de.agent, body: '', eventKey: `agent:${runId}`, caseId: null, localize: (l) => ({ title: AGENT_PUSH_T[l].agent, body: AGENT_PUSH_T[l].critical_n.replace('{n}', newCritical.length) + (environment === 'test' ? ' · TEST' : '') }), langOf, urgent: true }));
      } else for (const { eventId, f } of newCritical) {
        toDeliver.push(...await notifyUsers(env, ctx, environment, ids, { defer: true, kind: 'agent', localize: (l) => ({ title: AGENT_PUSH_T[l].agent, body: criticalBody(f.code, l, environment) }), langOf, title: AGENT_PUSH_T.de.agent, body: criticalBody(f.code, 'de', environment), eventKey: `agent:${eventId}`, caseId: f.case_id, urgent: true,
          ref: !f.case_id && f.vehicle_id ? `vehicle:${f.vehicle_id}` : null })); // Befund ohne Vorgang → Tippen öffnet die Fahrzeugakte
      }
    }

    // Neue Termine/Fristen (Prüftermine, Behördenfristen): eine ruhige Sammel-Erinnerung je Lauf, ohne Details im Push-Text
    if (newReminders.length) {
      const codes = newReminders.map((f) => f.code);
      toDeliver.push(...await notifyUsers(env, ctx, environment, await recipients(), { defer: true, kind: 'agent_reminder', title: AGENT_PUSH_T.de.reminder, body: reminderBody(codes, 'de', environment), langOf,
        localize: (l) => ({ title: AGENT_PUSH_T[l].reminder, body: reminderBody(codes, l, environment) }), eventKey: `agent-reminder:${runId}`, caseId: null, urgent: false }));
    }

    // eine gemeinsame Zustellung für kritische Pushs und Sammel-Erinnerung (21.10.2026: zwei Zustellungen sprengten mit Push-Geräten das Agent-Budget 40)
    if (toDeliver.length) { const job = deliverPush(env, toDeliver); if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job; }

    // Nach dem Sammel-Upsert sind genau die in diesem Lauf gefundenen Befunde offen, alle anderen erledigt – keine Zählabfrage nötig
    const openCount = unique.length;
    await env.DB.prepare('UPDATE agent_runs SET finished_at=?, findings_open=?, handoffs=? WHERE id=?').bind(nowIso(), openCount, handoffs, runId).run();
    return { run_id: runId, findings_open: openCount, handoffs };
  } catch (e) {
    await env.DB.prepare('UPDATE agent_runs SET finished_at=?, error=? WHERE id=?').bind(nowIso(), String(e && e.message || e).slice(0, 500), runId).run();
    throw e;
  }
}

export async function processMasterInbox(env, environment) {
  await env.DB.prepare(`UPDATE master_inbox SET processed_at=? WHERE environment=? AND processed_at IS NULL`).bind(nowIso(), environment).run();
}

// Management-Kontrollpanel: Fuhrpark & Werkstatt / Vorgänge und Agentenmeldungen
// Vorgangstabelle im Management-Panel: offene Vorgänge zuerst (nach Priorität), danach die der letzten 14 Tage abgeschlossenen/abgelehnten;
// höchstens MASTER_CASES_MAX Zeilen (eine mehr gelesen → cases_truncated). Vorher standen abgeschlossene zwischen den offenen gleicher
// Priorität und konnten bei vielen Vorgängen offene verdrängen; status_counts zählte nur die angezeigten – jetzt eigene Zählung über alle.
export const MASTER_CASES_MAX = 300;
// Master-Eingang: ALLE offenen/gesehenen Entscheidungen (sonst fehlten bei mehr als 100 offene in Liste und Zähler) + die neuesten 100 entschiedenen
export const MASTER_INBOX_DONE_MAX = 100;
export async function masterPanel(env, environment) {
  const since14 = new Date(Date.now() - 14 * 86400000).toISOString();
  const [caseRows, countRows] = await Promise.all([
    env.DB.prepare(`SELECT c.id, c.case_no, c.status, c.priority, c.safety_lock, c.description, c.workshop_site, c.fleet_received_at, c.workshop_ack_at, c.updated_at, c.created_at,
      v.plate, v.vin, (SELECT COUNT(*) FROM open_items o WHERE o.case_id=c.id AND o.status='offen') AS open_items
    FROM cases c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.environment=? AND (c.status NOT IN ('fahrzeug_freigegeben','abgelehnt') OR c.updated_at > ?)
    ORDER BY CASE WHEN c.status IN ('fahrzeug_freigegeben','abgelehnt') THEN 1 ELSE 0 END, CASE WHEN c.priority='kritisch' OR c.safety_lock=1 THEN 0 WHEN c.priority='mittel' THEN 1 ELSE 2 END, c.updated_at DESC LIMIT ?`)
      .bind(environment, since14, MASTER_CASES_MAX + 1).all(),
    env.DB.prepare(`SELECT status, COUNT(*) AS n FROM cases WHERE environment=? AND (status NOT IN ('fahrzeug_freigegeben','abgelehnt') OR updated_at > ?) GROUP BY status`)
      .bind(environment, since14).all(),
  ]);
  const casesTruncated = caseRows.results.length > MASTER_CASES_MAX;
  const cases = caseRows.results.slice(0, MASTER_CASES_MAX);
  const findings = (await env.DB.prepare(`SELECT * FROM agent_findings WHERE environment=? AND status='offen' ORDER BY CASE severity WHEN 'kritisch' THEN 0 WHEN 'handeln' THEN 1 WHEN 'hinweis' THEN 2 ELSE 3 END, last_seen DESC`).bind(environment).all()).results.map(({ fp_src, ...f }) => f); // fp_src nur intern (Migration 0073)
  // has_newer: es gibt eine neuere Übergabe desselben Befunds – unabhängig von deren Entscheidung (18.10.2026: nach Entscheidung der neuesten
  // zählte die ältere, nie entschiedene wieder als offene Entscheidung)
  // offene Einträge nach Dringlichkeit (wie die Befundliste), dann neueste zuerst – nach dem Urlaub standen kritische sonst hinter 70 Hinweisen (23.10.2026)
  const inbox = (await env.DB.prepare(`SELECT m.*, f.status AS finding_status, f.subject_key AS finding_subject, EXISTS (SELECT 1 FROM master_inbox n WHERE n.environment=m.environment AND n.finding_id=m.finding_id
      AND (n.received_at > m.received_at OR (n.received_at = m.received_at AND n.rowid > m.rowid))) AS has_newer, du.display_name AS decided_by_name FROM master_inbox m LEFT JOIN agent_findings f ON f.id=m.finding_id LEFT JOIN users du ON du.id=m.decided_by
    WHERE m.environment=?1 ORDER BY CASE WHEN m.decision_status IN ('offen','gesehen') THEN 0 ELSE 1 END,
      CASE WHEN m.decision_status IN ('offen','gesehen') THEN CASE m.severity WHEN 'kritisch' THEN 0 WHEN 'handeln' THEN 1 WHEN 'hinweis' THEN 2 ELSE 3 END ELSE 0 END, m.received_at DESC, m.rowid DESC
    LIMIT (SELECT COUNT(*) FROM master_inbox WHERE environment=?1 AND decision_status IN ('offen','gesehen')) + ${MASTER_INBOX_DONE_MAX}`).bind(environment).all()).results
    .map((m) => ({ ...m, payload: JSON.parse(m.payload) }));
  const lastRun = await env.DB.prepare('SELECT * FROM agent_runs WHERE environment=? ORDER BY started_at DESC LIMIT 1').bind(environment).first();
  const counts = {};
  for (const r of countRows.results) counts[r.status] = r.n;
  const vehicles = (await env.DB.prepare('SELECT COUNT(*) AS n FROM vehicles WHERE active=1 AND eval_excluded=0').first()).n;
  // Gesperrt/in Werkstatt nach derselben Grundmenge wie vehicles_total (aktiv, nicht ruhend) – sonst „3 von 38“ mit ruhenden Fahrzeugen
  const lockedVehicles = (await env.DB.prepare(`SELECT COUNT(DISTINCT c.vehicle_id) AS n FROM cases c JOIN vehicles v ON v.id=c.vehicle_id AND v.active=1 AND v.eval_excluded=0
    WHERE c.environment=? AND c.safety_lock=1 AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')`).bind(environment).first()).n;
  const inWorkshop = (await env.DB.prepare(`SELECT COUNT(DISTINCT c.vehicle_id) AS n FROM cases c JOIN vehicles v ON v.id=c.vehicle_id AND v.active=1 AND v.eval_excluded=0
    WHERE c.environment=?1 AND c.status IN ('werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle')
      AND NOT EXISTS (SELECT 1 FROM cases l WHERE l.vehicle_id=c.vehicle_id AND l.environment=?1 AND l.safety_lock=1 AND l.status NOT IN ('fahrzeug_freigegeben','abgelehnt'))`).bind(environment).first()).n;
  // „In Werkstatt“ ohne gesperrte (zählen unter „Gesperrt“) – wie die Startseite, jedes Fahrzeug einmal (22.10.2026: Startseite 2, Management 3)
  // je Befund eine offene Entscheidung: wiederkehrender Befund (neue Übergabe) zählte den alten, nie entschiedenen Eintrag mit (17.10.2026);
  // ältere Einträge desselben Befunds sind als `superseded` markiert (neuester steht zuerst)
  const openIds = new Set();
  // 20.10.2026: Zähler = angezeigte Liste – auch Einträge, deren Befund inzwischen erledigt ist (stehen mit „✓ erledigt“ zum Abschließen
  // in der Liste), je Befund einmal (vorher Zähler 3, Liste 6, derselbe erledigte Befund doppelt)
  for (const m of inbox) if (['offen', 'gesehen'].includes(m.decision_status) && m.finding_id) { if (m.has_newer || openIds.has(m.finding_id)) m.superseded = true; else openIds.add(m.finding_id); }
  for (const m of inbox) delete m.has_newer;
  const decisionsOpen = openIds.size + inbox.filter((m) => ['offen', 'gesehen'].includes(m.decision_status) && !m.finding_id).length;
  return {
    environment, generated_at: nowIso(), vehicles_total: vehicles, vehicles_locked: lockedVehicles, vehicles_in_workshop: inWorkshop,
    status_counts: counts, decisions_open: decisionsOpen,
    all_clear: findings.filter((f) => SEV_RANK[f.severity] >= SEV_RANK.handeln).length === 0,
    cases, cases_truncated: casesTruncated, cases_max: MASTER_CASES_MAX, findings, inbox, last_agent_run: lastRun,
  };
}

export async function decideMasterItem(env, user, environment, eventId, body) {
  // Werteprüfung (vorher 500 bei unbekanntem Status, Objekt als „[object Object]“) und keine Rückstufung: eine gleichzeitige oder spätere
  // „gesehen“-Markierung überschrieb sonst „erledigt“ samt Vermerk (17.10.2026). Gleiche Stufe erneut: Vermerk bleibt, wenn keiner mitkommt.
  const st = oneOf(body.decision_status, ['gesehen', 'entschieden', 'erledigt'], 'Entscheidung');
  const note = str(body.note, { max: 2000, field: 'Vermerk' }) || null;
  const RANK = { offen: 0, gesehen: 1, entschieden: 2, erledigt: 3 };
  // Gleiche Stufe erneut nur „gesehen“ oder durch dieselbe Person (17.10.2026: zwei Leitungen entschieden gleichzeitig mit verschiedenen
  // Vermerken – der zweite überschrieb den ersten still); optional expected_status = gelesener Stand (die App sendet ihn). Protokoll master.decision.
  const exp = body.expected_status === undefined || body.expected_status === null ? null : oneOf(body.expected_status, ['offen', 'gesehen', 'entschieden', 'erledigt'], 'Stand');
  const before = await env.DB.prepare('SELECT decision_status, decided_by, decision_note, finding_id FROM master_inbox WHERE event_id=? AND environment=?').bind(String(eventId), environment).first();
  if (!before) throw notFound('Eintrag nicht gefunden.');
  // „gesehen“ auf schon gesehenem Eintrag: nichts ändern (19.10.2026: zweite Person überschrieb Person/Zeitpunkt ohne Protokoll)
  if (st === 'gesehen' && before.decision_status === 'gesehen' && !note && (exp === null || exp === 'gesehen')) return { ok: true, unchanged: true };
  const r = await env.DB.prepare(`UPDATE master_inbox SET decision_status=?1, decided_by=?2, decision_note=COALESCE(?3, decision_note), decided_at=?4 WHERE event_id=?5 AND environment=?6
    AND ((CASE decision_status WHEN 'offen' THEN 0 WHEN 'gesehen' THEN 1 WHEN 'entschieden' THEN 2 ELSE 3 END) < ?7 OR (decision_status=?1 AND (?1='gesehen' OR decided_by=?2)))
    AND (?8 IS NULL OR decision_status=?8)`)
    .bind(st, user.id, note, nowIso(), String(eventId), environment, RANK[st], exp).run();
  if (r.meta.changes === 1) {
    // ältere, noch offene Einträge desselben Befunds (wiederkehrender Befund, in der App als „ersetzt“ ausgeblendet) mit entscheiden (19.10.2026)
    let older = 0;
    if (st !== 'gesehen' && before.finding_id) older = (await env.DB.prepare(`UPDATE master_inbox SET decision_status=?1, decided_by=?2, decided_at=?3 WHERE environment=?4 AND finding_id=?5 AND event_id<>?6
      AND decision_status IN ('offen','gesehen') AND received_at <= (SELECT received_at FROM master_inbox WHERE event_id=?6 AND environment=?4)`).bind(st, user.id, nowIso(), environment, before.finding_id, String(eventId)).run()).meta.changes || 0;
    if (st !== 'gesehen' || before.decision_status === 'offen') await audit(env, user.id, 'master.decision', String(eventId), { environment, from: before.decision_status, to: st, ...(note ? { note } : {}), ...(before.decision_note && note && before.decision_note !== note ? { note_before: before.decision_note } : {}), ...(older ? { older_entries: older } : {}) });
    return { ok: true, ...(older ? { older_entries: older } : {}) };
  }
  if (!(await env.DB.prepare('SELECT 1 FROM master_inbox WHERE event_id=? AND environment=?').bind(String(eventId), environment).first())) throw notFound('Eintrag nicht gefunden.');
  throw conflict('version_conflict', 'Eintrag wurde zwischenzeitlich weiter bearbeitet. Bitte neu laden.');
}
