// [CLAUDE] Fuhrparkagent (regelbasiert, deterministisch) und Übergabe an den Master-Agenten
// Der Agent erzeugt Befunde – er gibt nie Fahrzeuge frei, beauftragt nichts und erfindet keine Fristen.
import { nowIso, uuid, sha256Hex, berlinDateTime } from './util.js';
import { notifyUsers } from './notify.js';
import { tireFindings } from './tires.js';
import { stockFindings } from './stock.js';
import { fineFindings } from './fines.js';
import { documentFindings } from './vehicles.js';
import { latestKmByVehicle, kmDue } from './maintenance.js';

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
const CHUNK = 400;
// Befunde, die als ruhige Erinnerung (nicht dringend) an Fuhrparkleitung/Inhaber gehen, sobald sie neu auftreten
const REMINDER_LABEL = { MAINTENANCE_OVERDUE: 'Prüftermin überfällig', MAINTENANCE_DUE: 'Prüftermin bald fällig', FINE_OVERDUE: 'Behördenfrist überschritten', FINE_DUE_SOON: 'Behördenfrist läuft ab', DOCUMENT_EXPIRED: 'Dokument abgelaufen', DOCUMENT_EXPIRES_SOON: 'Dokument läuft ab' };
const REMINDER_CODES = new Set(Object.keys(REMINDER_LABEL));
const chunks = (a) => { const out = []; for (let i = 0; i < a.length; i += CHUNK) out.push(a.slice(i, i + CHUNK)); return out; };

const ageMin = (iso) => Math.round((Date.now() - Date.parse(iso)) / 60000);
// Meldungstexte enthalten den Zeitpunkt statt einer laufenden Minutenzahl: so bleibt der Text zwischen zwei Läufen gleich
// und der Agent schreibt nur geänderte Befunde (D1-Schreibkontingent: sonst jede Viertelstunde alle Befunde neu).
const since = (iso) => `seit ${berlinDateTime(iso)}`;
// Felder, deren Änderung einen Befund „geändert“ macht (sonst kein Schreibzugriff)
const ROW_FIELDS = ['case_id', 'vehicle_id', 'severity', 'message', 'next_action', 'owner_role', 'requires_decision', 'fingerprint'];

export async function runFleetAgent(env, ctx, environment, trigger = 'cron') {
  const runId = uuid();
  const started = nowIso();
  await env.DB.prepare('INSERT INTO agent_runs(id,environment,trigger,started_at) VALUES (?,?,?,?)').bind(runId, environment, trigger, started).run();
  try {
    const settings = new Map((await env.DB.prepare('SELECT key, value FROM settings').all()).results.map((r) => [r.key, r.value]));
    const findings = [];
    const add = (f) => findings.push({ requires_decision: 0, case_id: null, vehicle_id: null, ...f });

    const fleetUsers = (await env.DB.prepare(`SELECT id FROM users WHERE environment=? AND role IN ('fleet','owner') AND active=1 AND password_hash IS NOT NULL`).bind(environment).all()).results;
    if (fleetUsers.length === 0) {
      add({ code: 'NO_FLEET_RECIPIENT', subject: 'system', severity: 'kritisch', owner_role: 'owner', requires_decision: 1,
        message: 'Keine aktive Fuhrparkleitung mit Zugang in dieser Umgebung – Meldungen haben keinen Empfänger.',
        next_action: 'Fuhrparkleitung als Benutzer anlegen und Einladung annehmen lassen.' });
    }

    const open = (await env.DB.prepare(`SELECT c.*, v.plate FROM cases c JOIN vehicles v ON v.id=c.vehicle_id
      WHERE c.environment=? AND c.status IN ('gemeldet','werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle')`).bind(environment).all()).results;

    const sitesWithUsers = new Set((await env.DB.prepare(`SELECT DISTINCT workshop_site FROM users WHERE environment=? AND role='workshop' AND active=1 AND password_hash IS NOT NULL`).bind(environment).all()).results.map((r) => r.workshop_site));

    const safetyOpen = new Map((await env.DB.prepare(`SELECT o.case_id, COUNT(*) AS n FROM open_items o JOIN cases c ON c.id=o.case_id
      WHERE c.environment=? AND c.status='in_reparatur' AND o.status='offen' AND o.safety_relevant=1 GROUP BY o.case_id`).bind(environment).all()).results.map((r) => [r.case_id, r.n]));

    for (const c of open) {
      const label = `${c.case_no} (${c.plate})`;
      if (c.status === 'gemeldet' && !c.fleet_received_at) {
        const urgent = c.priority === 'kritisch' || c.safety_lock;
        const sla = slaMinutes(settings, environment, 'triage', c.priority);
        const age = ageMin(c.created_at);
        if (urgent) {
          add({ code: 'CRITICAL_UNTRIAGED', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'kritisch', owner_role: 'fleet', requires_decision: 1,
            message: `${label}: sicherheitsrelevante Meldung ${since(c.created_at)} nicht von der Fuhrparkleitung bestätigt.`,
            next_action: 'Meldung bewerten, Fahrzeug nicht disponieren, Werkstatt festlegen.' });
        } else if (sla !== null && age > sla) {
          add({ code: 'TRIAGE_OVERDUE', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 0,
            message: `${label}: Erstbewertung überfällig (gemeldet ${berlinDateTime(c.created_at)}, Frist ${sla} Min.).`, next_action: 'Meldung bewerten und Priorität bestätigen.' });
        } else {
          add({ code: 'TRIAGE_OPEN', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
            message: `${label}: wartet auf Erstbewertung (${since(c.created_at)}${sla === null ? '; Frist nicht konfiguriert' : ''}).`, next_action: 'Meldung bewerten.' });
        }
      }
      if (c.status === 'werkstatt_freigegeben' && !c.workshop_ack_at) {
        const sla = slaMinutes(settings, environment, 'ack', c.priority);
        const age = ageMin(c.updated_at);
        const noUser = c.workshop_site && !sitesWithUsers.has(c.workshop_site);
        if (noUser) {
          add({ code: 'NO_WORKSHOP_RECIPIENT', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'kritisch', owner_role: 'fleet', requires_decision: 1,
            message: `${label}: Werkstatt ${c.workshop_site} hat keinen aktiven Benutzer – Auftrag kann nicht übernommen werden.`,
            next_action: 'Werkstattbenutzer anlegen oder andere Werkstatt zuweisen.' });
        } else if (c.priority === 'kritisch' || (sla !== null && age > sla)) {
          add({ code: 'WORKSHOP_ACK_MISSING', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: c.priority === 'kritisch' ? 'kritisch' : 'handeln', owner_role: 'fleet', requires_decision: c.priority === 'kritisch' ? 1 : 0,
            message: `${label}: freigegebener Auftrag ${since(c.updated_at)} nicht von Werkstatt ${c.workshop_site} übernommen.`,
            next_action: 'Werkstatt direkt kontaktieren oder Auftrag umleiten.' });
        } else {
          add({ code: 'WORKSHOP_ACK_PENDING', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'workshop',
            message: `${label}: wartet auf Übernahme durch Werkstatt ${c.workshop_site} (${since(c.updated_at)}${sla === null ? '; Frist nicht konfiguriert' : ''}).`, next_action: 'Auftrag übernehmen.' });
        }
      }
      if (c.status === 'wartet_teile') {
        add({ code: 'WAITING_PARTS', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: c.priority === 'kritisch' ? 'handeln' : 'hinweis', owner_role: 'fleet',
          message: `${label}: Reparatur wartet auf Teile (${since(c.updated_at)}).`, next_action: 'Teilelieferung klären, Dispo informieren.' });
      }
      if (c.status === 'abschlusskontrolle') {
        add({ code: 'QC_PENDING', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 1,
          message: `${label}: Reparatur gemeldet – Abschlusskontrolle und technische Freigabe durch einen Menschen offen.`,
          next_action: 'Kontrolle durchführen: freigeben oder Nacharbeit anfordern.' });
      }
      if (c.status === 'in_reparatur') {
        const oi = { n: safetyOpen.get(c.id) || 0 };
        if (oi.n > 0) add({ code: 'SAFETY_OPEN_ITEMS', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'handeln', owner_role: 'workshop',
          message: `${label}: ${oi.n} sicherheitsrelevante Restarbeit(en) offen.`, next_action: 'Restarbeiten erledigen oder Teile beschaffen.' });
      }
    }

    // Gesperrte Fahrzeuge (für Dispo sichtbar)
    const locked = (await env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate, c.safety_lock_reason FROM cases c JOIN vehicles v ON v.id=c.vehicle_id
      WHERE c.environment=? AND c.safety_lock=1 AND c.status NOT IN ('fahrzeug_freigegeben','abgelehnt')`).bind(environment).all()).results;
    for (const l of locked) {
      add({ code: 'VEHICLE_LOCKED', subject: l.vehicle_id, case_id: l.id, vehicle_id: l.vehicle_id, severity: 'info', owner_role: 'dispatch',
        message: `${l.plate}: gesperrt (${l.safety_lock_reason || 'Sicherheitsprüfung'}) – nicht disponieren.`, next_action: 'Bis zur technischen Freigabe nicht einplanen.' });
    }

    // Freigegeben, aber Restarbeiten offen
    const relOpen = (await env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate, COUNT(o.id) AS n FROM cases c JOIN vehicles v ON v.id=c.vehicle_id
      JOIN open_items o ON o.case_id=c.id AND o.status='offen' WHERE c.environment=? AND c.status='fahrzeug_freigegeben' GROUP BY c.id`).bind(environment).all()).results;
    for (const r of relOpen) {
      add({ code: 'RELEASED_WITH_OPEN_ITEMS', subject: r.id, case_id: r.id, vehicle_id: r.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
        message: `${r.case_no} (${r.plate}): freigegeben mit ${r.n} offener nicht sicherheitsrelevanter Restarbeit(en).`, next_action: 'Werkstatttermin für Restarbeiten planen.' });
    }

    // Dringende Benachrichtigungen ohne Push-Zustellung
    const undelivered = (await env.DB.prepare(`SELECT n.case_id, COUNT(*) AS n FROM notifications n WHERE n.environment=? AND n.urgent=1 AND n.acknowledged_at IS NULL AND n.opened_at IS NULL
      AND n.push_status IN ('failed','no_subscription') AND n.created_at > ? GROUP BY n.case_id`).bind(environment, new Date(Date.now() - 48 * 3600000).toISOString()).all()).results;
    for (const u of undelivered) {
      add({ code: 'URGENT_NOT_DELIVERED', subject: u.case_id || 'system', case_id: u.case_id, severity: 'handeln', owner_role: 'fleet',
        message: `Dringende Benachrichtigung an ${u.n} Empfänger nicht per Push zugestellt (kein aktiviertes Gerät oder Fehler).`,
        next_action: 'Empfänger telefonisch informieren; Push auf deren Geräten aktivieren.' });
    }

    // Kosten unbewertet bei abgeschlossenen Vorgängen (letzte 90 Tage)
    const rateRaw = settings.get('workshop_hourly_rate_net');
    const rate = rateRaw === undefined || rateRaw === null || rateRaw === '' ? null : rateRaw;
    const closed = (await env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate,
        (SELECT COUNT(*) FROM work_entries w WHERE w.case_id=c.id) AS hours_n,
        (SELECT COUNT(*) FROM parts p WHERE p.case_id=c.id AND p.valuation='unvalued') AS unv_n,
        (SELECT COUNT(*) FROM external_costs e WHERE e.case_id=c.id AND e.covers_work_and_parts=1) AS ext_n
      FROM cases c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.environment=? AND c.status='fahrzeug_freigegeben' AND c.closed_at > ?`)
      .bind(environment, new Date(Date.now() - 90 * 86400000).toISOString()).all()).results;
    for (const c of closed) {
      const hasHours = { n: c.hours_n }; const unvParts = { n: c.unv_n }; const ext = { n: c.ext_n };
      if (!ext.n && ((hasHours.n > 0 && rate === null) || unvParts.n > 0)) {
        add({ code: 'COSTS_UNVALUED', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'owner',
          message: `${c.case_no} (${c.plate}): Kosten unvollständig bewertet (${rate === null && hasHours.n ? 'kein Stundensatz' : ''}${unvParts.n ? ` ${unvParts.n} Teil(e) ohne Preis` : ''}).`,
          next_action: 'Stundensatz festlegen bzw. Teilepreise nachtragen.' });
      }
    }

    // Wartung/Prüftermine (nur aus belegten Regeln)
    const today = new Date().toISOString().slice(0, 10);
    const rules = (await env.DB.prepare(`SELECT m.*, v.plate FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id WHERE v.active=1`).all()).results;
    const warnDays = Number(settings.get('maintenance_warn_days')) || 30;
    const warnKm = Number(settings.get('maintenance_warn_km')) > 0 ? Number(settings.get('maintenance_warn_km')) : null;
    const latestKm = rules.some((r) => r.interval_km) ? await latestKmByVehicle(env) : new Map();
    const fmtKm = (n) => n.toLocaleString('de-DE');
    for (const r of rules) {
      // Kilometer-Intervall (nur wenn Intervall, letzte Durchführung in km und ein km-Stand belegt sind)
      const k = kmDue(r, latestKm.get(r.vehicle_id), warnKm);
      if (k && k.km_status === 'ueberfaellig') add({ code: 'MAINTENANCE_OVERDUE', subject: `${r.id}|km`, vehicle_id: r.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 1,
        message: `${r.plate}: ${r.kind} war bei ${fmtKm(k.next_due_km)} km fällig – Stand ${fmtKm(k.current_km)} km (abgelesen ${berlinDateTime(k.km_measured_at).slice(0, 10)}).`, next_action: 'Termin vereinbaren; Einsatzfähigkeit fachlich prüfen.' });
      else if (k && k.km_status === 'faellig') add({ code: 'MAINTENANCE_DUE', subject: `${r.id}|km`, vehicle_id: r.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
        message: `${r.plate}: ${r.kind} fällig bei ${fmtKm(k.next_due_km)} km – Stand ${fmtKm(k.current_km)} km (noch ${fmtKm(k.km_remaining)} km).`, next_action: 'Werkstatttermin einplanen.' });
      const due = r.next_due_date;
      if (!due) continue;
      const days = Math.round((Date.parse(due) - Date.parse(today)) / 86400000);
      if (days < 0) add({ code: 'MAINTENANCE_OVERDUE', subject: r.id, vehicle_id: r.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 1,
        message: `${r.plate}: ${r.kind} seit ${-days} Tag(en) überfällig (fällig ${due}).`, next_action: 'Termin vereinbaren; Einsatzfähigkeit fachlich prüfen.' });
      else if (days <= warnDays) add({ code: 'MAINTENANCE_DUE', subject: r.id, vehicle_id: r.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
        message: `${r.plate}: ${r.kind} fällig am ${due} (in ${days} Tag(en)).`, next_action: 'Werkstatttermin einplanen.' });
    }

    // Fahrzeugdokumente mit Gültig-bis-Datum (z. B. Versicherung, Leasing) – nur wenn das Datum beim Hochladen angegeben wurde
    const DOC_LABEL = { zulassung: 'Zulassung', pruefbericht: 'Prüfbericht', rechnung: 'Rechnung', versicherung: 'Versicherung', leasing: 'Leasing/Miete', foto: 'Foto', sonstiges: 'Dokument' };
    for (const d of await documentFindings(env, environment)) {
      const days = Math.round((Date.parse(d.valid_until) - Date.parse(today)) / 86400000);
      const label = DOC_LABEL[d.doc_kind] || 'Dokument';
      if (days < 0) add({ code: 'DOCUMENT_EXPIRED', subject: `${d.vehicle_id}|${d.doc_kind}`, vehicle_id: d.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 1,
        message: `${d.plate}: ${label} abgelaufen am ${d.valid_until}.`, next_action: 'Gültiges Dokument beschaffen und in der Fahrzeugakte hinterlegen.' });
      else if (days <= warnDays) add({ code: 'DOCUMENT_EXPIRES_SOON', subject: `${d.vehicle_id}|${d.doc_kind}`, vehicle_id: d.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
        message: `${d.plate}: ${label} gültig bis ${d.valid_until} (in ${days} Tag(en)).`, next_action: 'Verlängerung/Nachfolgedokument veranlassen.' });
    }

    // Reifen: letzte Profilmessung unter gesetzlichem Minimum bzw. konfigurierter Warnschwelle
    for (const t of await tireFindings(env, environment)) {
      add({ code: t.severity === 'kritisch' ? 'TIRE_BELOW_MINIMUM' : 'TIRE_WARN', subject: `${t.vehicle_id}|${t.position}`, vehicle_id: t.vehicle_id,
        severity: t.severity, owner_role: 'fleet', requires_decision: t.severity === 'kritisch' ? 1 : 0,
        message: `${t.plate} ${t.position}: Profiltiefe ${t.tread_mm} mm (Grenze ${t.limit} mm, gemessen ${t.created_at.slice(0, 10)}).`,
        next_action: t.severity === 'kritisch' ? 'Reifen vor weiterer Fahrt prüfen/tauschen lassen.' : 'Reifenwechsel einplanen.' });
    }

    // Ersatzteile unter Mindestbestand
    for (const it of await stockFindings(env, environment)) {
      add({ code: 'STOCK_BELOW_MIN', subject: it.id, severity: 'hinweis', owner_role: 'workshop',
        message: `Lager ${it.site}: ${it.name}${it.part_number ? ' (' + it.part_number + ')' : ''} – Bestand ${it.on_hand} ${it.unit}, Mindestbestand ${it.min_qty}.`,
        next_action: 'Nachbestellung prüfen (Bestellung nur nach Freigabe).' });
    }

    // Bußgelder: Fristen nur aus dem Schreiben; Fahrer offen; Kennzeichen unbekannt
    for (const x of await fineFindings(env, environment)) {
      add({ code: x.code, subject: x.f.id, vehicle_id: x.f.vehicle_id, severity: x.severity, owner_role: 'fleet', requires_decision: x.requires_decision, message: x.message, next_action: x.next_action });
    }

    // Ruhende Fahrzeuge (Inhaberentscheidung): keine fahrzeugbezogenen Bewertungsbefunde; vorgangsbezogene Sicherheitsbefunde bleiben
    const excludedVeh = new Set((await env.DB.prepare('SELECT id FROM vehicles WHERE eval_excluded=1').all()).results.map((r) => r.id));
    if (excludedVeh.size) for (let i = findings.length - 1; i >= 0; i--) if (findings[i].vehicle_id && !findings[i].case_id && excludedVeh.has(findings[i].vehicle_id)) findings.splice(i, 1);

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
    const fingerprints = await Promise.all(unique.map((f) => sha256Hex(`${f.code}|${f.subject}|${f.severity}|${f.requires_decision}`)));
    const rows = [];
    const candidates = [];
    for (let i = 0; i < unique.length; i++) {
      const f = unique[i]; const fingerprint = fingerprints[i];
      const existing = existingMap.get(`${f.code}|${f.subject}`);
      const findingId = existing ? existing.id : uuid();
      const changed = !existing || existing.status !== 'offen' || existing.fingerprint !== fingerprint;
      const row = { id: findingId, code: f.code, subject: f.subject, case_id: f.case_id ?? null, vehicle_id: f.vehicle_id ?? null, severity: f.severity, message: f.message,
        next_action: f.next_action, owner_role: f.owner_role, requires_decision: f.requires_decision ? 1 : 0, fingerprint };
      // Unveränderte offene Befunde nicht erneut schreiben
      if (changed || ROW_FIELDS.some((k) => (existing[k] ?? null) !== row[k])) rows.push(row);
      if (changed && f.severity !== 'kritisch' && REMINDER_CODES.has(f.code)) newReminders.push(f);
      if (changed && SEV_RANK[f.severity] >= SEV_RANK.handeln) {
        candidates.push({ eventInput: `${findingId}|${fingerprint}|${existing ? existing.first_seen : now}`, findingId, fingerprint, f });
      }
    }
    const eventIds = await Promise.all(candidates.map((c) => sha256Hex(c.eventInput)));
    candidates.forEach((c, i) => { c.eventId = eventIds[i]; delete c.eventInput; });
    const J = (k) => `json_extract(value,'$.${k}')`;
    const upserts = chunks(rows).map((part) => env.DB.prepare(`INSERT INTO agent_findings(id,environment,finding_code,subject_key,case_id,vehicle_id,severity,message,next_action,owner_role,requires_decision,status,fingerprint,first_seen,last_seen)
      SELECT ${J('id')}, ?1, ${J('code')}, ${J('subject')}, ${J('case_id')}, ${J('vehicle_id')}, ${J('severity')}, ${J('message')}, ${J('next_action')}, ${J('owner_role')}, ${J('requires_decision')}, 'offen', ${J('fingerprint')}, ?2, ?2
      FROM json_each(?3) WHERE 1
      ON CONFLICT(environment, finding_code, subject_key) DO UPDATE SET case_id=excluded.case_id, vehicle_id=excluded.vehicle_id, severity=excluded.severity, message=excluded.message,
        next_action=excluded.next_action, owner_role=excluded.owner_role, requires_decision=excluded.requires_decision, fingerprint=excluded.fingerprint, last_seen=excluded.last_seen,
        first_seen=CASE WHEN agent_findings.status='erledigt' THEN excluded.first_seen ELSE agent_findings.first_seen END, status='offen', resolved_at=NULL`)
      .bind(environment, now, JSON.stringify(part)));
    // Nicht mehr zutreffende Befunde schließen (eine Anweisung)
    upserts.push(env.DB.prepare(`UPDATE agent_findings SET status='erledigt', resolved_at=?1 WHERE environment=?2 AND status='offen'
      AND (finding_code || '|' || subject_key) NOT IN (SELECT value FROM json_each(?3))`).bind(now, environment, JSON.stringify([...seen])));
    await env.DB.batch(upserts);

    // Übergaben an den Master: idempotent über event_id; nur neue zählen
    if (candidates.length) {
      const known = new Set();
      for (const part of chunks(candidates)) {
        for (const r of (await env.DB.prepare('SELECT event_id FROM master_inbox WHERE event_id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(part.map((c) => c.eventId))).all()).results) known.add(r.event_id);
      }
      const fresh = candidates.filter((c) => !known.has(c.eventId));
      const payloads = fresh.map(({ eventId, findingId, f }) => ({
        schema_version: '1.0', event_id: eventId, event_type: 'fleet.finding.review_required', environment,
        occurred_at: now, finding_id: findingId, finding_code: f.code, case_id: f.case_id, vehicle_id: f.vehicle_id,
        severity: f.severity, message: f.message, next_action: f.next_action, owner_role: f.owner_role,
        requires_human_approval: !!f.requires_decision, source_agent: 'claude-fleet-agent', agent_run_id: runId,
      }));
      if (payloads.length) {
        await env.DB.batch(chunks(payloads).map((part) => env.DB.prepare(`INSERT OR IGNORE INTO master_inbox(event_id,schema_version,environment,source_agent,event_type,finding_id,case_id,vehicle_id,severity,payload,received_at)
          SELECT json_extract(value,'$.event_id'), '1.0', ?1, 'claude-fleet-agent', json_extract(value,'$.event_type'), json_extract(value,'$.finding_id'), json_extract(value,'$.case_id'),
            json_extract(value,'$.vehicle_id'), json_extract(value,'$.severity'), value, ?2 FROM json_each(?3)`).bind(environment, now, JSON.stringify(part))));
      }
      handoffs = fresh.length;
      for (const c of fresh) if (c.f.severity === 'kritisch') newCritical.push({ eventId: c.eventId, f: c.f });
    }
    // Master verarbeitet Eingänge (Bestätigung der Übernahme, getrennt von menschlicher Entscheidung)
    await processMasterInbox(env, environment);

    // Kritische neue Befunde zusätzlich an Fuhrparkleitung/Owner pushen
    let ids = null;
    const recipients = async () => ids || (ids = (await env.DB.prepare(`SELECT id FROM users WHERE environment=? AND role IN ('fleet','owner') AND active=1 AND password_hash IS NOT NULL`).bind(environment).all()).results.map((r) => r.id));
    if (newCritical.length) {
      await recipients();
      // Abfragebudget: bei vielen neuen kritischen Befunden eine Sammelmeldung statt Einzel-Pushs
      if (newCritical.length > 3) {
        await notifyUsers(env, ctx, environment, ids, { kind: 'agent', title: 'Fuhrparkagent: Handlungsbedarf', body: `${newCritical.length} neue kritische Befunde${environment === 'test' ? ' · TEST' : ''}`, eventKey: `agent:${runId}`, caseId: null, urgent: true });
      } else for (const { eventId, f } of newCritical) {
        await notifyUsers(env, ctx, environment, ids, { kind: 'agent', title: 'Fuhrparkagent: Handlungsbedarf', body: `${f.code}${environment === 'test' ? ' · TEST' : ''}`, eventKey: `agent:${eventId}`, caseId: f.case_id, urgent: true });
      }
    }

    // Neue Termine/Fristen (Prüftermine, Behördenfristen): eine ruhige Sammel-Erinnerung je Lauf, ohne Details im Push-Text
    if (newReminders.length) {
      const counts = {};
      for (const f of newReminders) counts[REMINDER_LABEL[f.code]] = (counts[REMINDER_LABEL[f.code]] || 0) + 1;
      const body = Object.entries(counts).map(([k, n]) => `${n}× ${k}`).join(', ') + (environment === 'test' ? ' · TEST' : '');
      await notifyUsers(env, ctx, environment, await recipients(), { kind: 'agent_reminder', title: 'Fuhrparkagent: neue Termine/Fristen', body, eventKey: `agent-reminder:${runId}`, caseId: null, urgent: false });
    }

    const openCount = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM agent_findings WHERE environment=? AND status='offen'`).bind(environment).first()).n;
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
export async function masterPanel(env, environment) {
  const cases = (await env.DB.prepare(`SELECT c.id, c.case_no, c.status, c.priority, c.safety_lock, c.description, c.workshop_site, c.fleet_received_at, c.workshop_ack_at, c.updated_at, c.created_at,
      v.plate, v.vin, (SELECT COUNT(*) FROM open_items o WHERE o.case_id=c.id AND o.status='offen') AS open_items
    FROM cases c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.environment=? AND (c.status NOT IN ('fahrzeug_freigegeben','abgelehnt') OR c.updated_at > ?)
    ORDER BY CASE c.priority WHEN 'kritisch' THEN 0 WHEN 'mittel' THEN 1 ELSE 2 END, c.updated_at DESC LIMIT 300`)
    .bind(environment, new Date(Date.now() - 14 * 86400000).toISOString()).all()).results;
  const findings = (await env.DB.prepare(`SELECT * FROM agent_findings WHERE environment=? AND status='offen' ORDER BY CASE severity WHEN 'kritisch' THEN 0 WHEN 'handeln' THEN 1 WHEN 'hinweis' THEN 2 ELSE 3 END, last_seen DESC`).bind(environment).all()).results;
  const inbox = (await env.DB.prepare(`SELECT m.*, f.status AS finding_status FROM master_inbox m LEFT JOIN agent_findings f ON f.id=m.finding_id
    WHERE m.environment=? ORDER BY CASE WHEN m.decision_status IN ('offen','gesehen') THEN 0 ELSE 1 END, m.received_at DESC LIMIT 100`).bind(environment).all()).results
    .map((m) => ({ ...m, payload: JSON.parse(m.payload) }));
  const lastRun = await env.DB.prepare('SELECT * FROM agent_runs WHERE environment=? ORDER BY started_at DESC LIMIT 1').bind(environment).first();
  const counts = {};
  for (const c of cases) counts[c.status] = (counts[c.status] || 0) + 1;
  const vehicles = (await env.DB.prepare('SELECT COUNT(*) AS n FROM vehicles WHERE active=1 AND eval_excluded=0').first()).n;
  const lockedVehicles = (await env.DB.prepare(`SELECT COUNT(DISTINCT vehicle_id) AS n FROM cases WHERE environment=? AND safety_lock=1 AND status NOT IN ('fahrzeug_freigegeben','abgelehnt')`).bind(environment).first()).n;
  const inWorkshop = (await env.DB.prepare(`SELECT COUNT(DISTINCT vehicle_id) AS n FROM cases WHERE environment=? AND status IN ('werkstatt_freigegeben','in_reparatur','wartet_teile','abschlusskontrolle')`).bind(environment).first()).n;
  const decisionsOpen = inbox.filter((m) => ['offen', 'gesehen'].includes(m.decision_status) && m.finding_status === 'offen').length;
  return {
    environment, generated_at: nowIso(), vehicles_total: vehicles, vehicles_locked: lockedVehicles, vehicles_in_workshop: inWorkshop,
    status_counts: counts, decisions_open: decisionsOpen,
    all_clear: findings.filter((f) => SEV_RANK[f.severity] >= SEV_RANK.handeln).length === 0,
    cases, findings, inbox, last_agent_run: lastRun,
  };
}

export async function decideMasterItem(env, user, environment, eventId, body) {
  const st = body.decision_status;
  if (!['gesehen', 'entschieden', 'erledigt'].includes(st)) throw new Error('invalid');
  const note = String(body.note || '').slice(0, 2000) || null;
  const r = await env.DB.prepare(`UPDATE master_inbox SET decision_status=?, decided_by=?, decision_note=?, decided_at=? WHERE event_id=? AND environment=?`)
    .bind(st, user.id, note, nowIso(), eventId, environment).run();
  return { ok: r.meta.changes === 1 };
}
