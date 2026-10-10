// [CLAUDE] Fuhrparkagent (regelbasiert, deterministisch) und Übergabe an den Master-Agenten
// Der Agent erzeugt Befunde – er gibt nie Fahrzeuge frei, beauftragt nichts und erfindet keine Fristen.
import { nowIso, uuid, sha256Hex } from './util.js';
import { notifyUsers } from './notify.js';
import { tireFindings } from './tires.js';
import { stockFindings } from './stock.js';

const SEV_RANK = { info: 0, hinweis: 1, handeln: 2, kritisch: 3 };

async function setting(env, key) {
  const r = await env.DB.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();
  if (!r || r.value === '' || r.value === null) return null;
  return r.value;
}

// Fristen nur, wenn ausdrücklich konfiguriert (je Umgebung, Minuten). Sonst: "Frist nicht konfiguriert".
async function slaMinutes(env, environment, kind, priority) {
  const v = await setting(env, `sla_${environment}_${kind}_${priority}_min`);
  const n = v === null ? null : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const ageMin = (iso) => Math.round((Date.now() - Date.parse(iso)) / 60000);

export async function runFleetAgent(env, ctx, environment, trigger = 'cron') {
  const runId = uuid();
  const started = nowIso();
  await env.DB.prepare('INSERT INTO agent_runs(id,environment,trigger,started_at) VALUES (?,?,?,?)').bind(runId, environment, trigger, started).run();
  try {
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

    for (const c of open) {
      const label = `${c.case_no} (${c.plate})`;
      if (c.status === 'gemeldet' && !c.fleet_received_at) {
        const urgent = c.priority === 'kritisch' || c.safety_lock;
        const sla = await slaMinutes(env, environment, 'triage', c.priority);
        const age = ageMin(c.created_at);
        if (urgent) {
          add({ code: 'CRITICAL_UNTRIAGED', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'kritisch', owner_role: 'fleet', requires_decision: 1,
            message: `${label}: sicherheitsrelevante Meldung seit ${age} Min. nicht von der Fuhrparkleitung bestätigt.`,
            next_action: 'Meldung bewerten, Fahrzeug nicht disponieren, Werkstatt festlegen.' });
        } else if (sla !== null && age > sla) {
          add({ code: 'TRIAGE_OVERDUE', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 0,
            message: `${label}: Erstbewertung überfällig (${age} Min., Frist ${sla} Min.).`, next_action: 'Meldung bewerten und Priorität bestätigen.' });
        } else {
          add({ code: 'TRIAGE_OPEN', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
            message: `${label}: wartet auf Erstbewertung (seit ${age} Min.${sla === null ? '; Frist nicht konfiguriert' : ''}).`, next_action: 'Meldung bewerten.' });
        }
      }
      if (c.status === 'werkstatt_freigegeben' && !c.workshop_ack_at) {
        const sla = await slaMinutes(env, environment, 'ack', c.priority);
        const age = ageMin(c.updated_at);
        const noUser = c.workshop_site && !sitesWithUsers.has(c.workshop_site);
        if (noUser) {
          add({ code: 'NO_WORKSHOP_RECIPIENT', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'kritisch', owner_role: 'fleet', requires_decision: 1,
            message: `${label}: Werkstatt ${c.workshop_site} hat keinen aktiven Benutzer – Auftrag kann nicht übernommen werden.`,
            next_action: 'Werkstattbenutzer anlegen oder andere Werkstatt zuweisen.' });
        } else if (c.priority === 'kritisch' || (sla !== null && age > sla)) {
          add({ code: 'WORKSHOP_ACK_MISSING', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: c.priority === 'kritisch' ? 'kritisch' : 'handeln', owner_role: 'fleet', requires_decision: c.priority === 'kritisch' ? 1 : 0,
            message: `${label}: freigegebener Auftrag seit ${age} Min. nicht von Werkstatt ${c.workshop_site} übernommen.`,
            next_action: 'Werkstatt direkt kontaktieren oder Auftrag umleiten.' });
        } else {
          add({ code: 'WORKSHOP_ACK_PENDING', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'workshop',
            message: `${label}: wartet auf Übernahme durch Werkstatt ${c.workshop_site} (seit ${age} Min.${sla === null ? '; Frist nicht konfiguriert' : ''}).`, next_action: 'Auftrag übernehmen.' });
        }
      }
      if (c.status === 'wartet_teile') {
        add({ code: 'WAITING_PARTS', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: c.priority === 'kritisch' ? 'handeln' : 'hinweis', owner_role: 'fleet',
          message: `${label}: Reparatur wartet auf Teile (seit ${ageMin(c.updated_at)} Min.).`, next_action: 'Teilelieferung klären, Dispo informieren.' });
      }
      if (c.status === 'abschlusskontrolle') {
        add({ code: 'QC_PENDING', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 1,
          message: `${label}: Reparatur gemeldet – Abschlusskontrolle und technische Freigabe durch einen Menschen offen.`,
          next_action: 'Kontrolle durchführen: freigeben oder Nacharbeit anfordern.' });
      }
      if (c.status === 'in_reparatur') {
        const oi = await env.DB.prepare(`SELECT COUNT(*) AS n FROM open_items WHERE case_id=? AND status='offen' AND safety_relevant=1`).bind(c.id).first();
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
    const rate = await setting(env, 'workshop_hourly_rate_net');
    const closed = (await env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate FROM cases c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.environment=? AND c.status='fahrzeug_freigegeben' AND c.closed_at > ?`)
      .bind(environment, new Date(Date.now() - 90 * 86400000).toISOString()).all()).results;
    for (const c of closed) {
      const hasHours = await env.DB.prepare('SELECT COUNT(*) AS n FROM work_entries WHERE case_id=?').bind(c.id).first();
      const unvParts = await env.DB.prepare(`SELECT COUNT(*) AS n FROM parts WHERE case_id=? AND valuation='unvalued'`).bind(c.id).first();
      const ext = await env.DB.prepare(`SELECT COUNT(*) AS n FROM external_costs WHERE case_id=? AND covers_work_and_parts=1`).bind(c.id).first();
      if (!ext.n && ((hasHours.n > 0 && rate === null) || unvParts.n > 0)) {
        add({ code: 'COSTS_UNVALUED', subject: c.id, case_id: c.id, vehicle_id: c.vehicle_id, severity: 'hinweis', owner_role: 'owner',
          message: `${c.case_no} (${c.plate}): Kosten unvollständig bewertet (${rate === null && hasHours.n ? 'kein Stundensatz' : ''}${unvParts.n ? ` ${unvParts.n} Teil(e) ohne Preis` : ''}).`,
          next_action: 'Stundensatz festlegen bzw. Teilepreise nachtragen.' });
      }
    }

    // Wartung/Prüftermine (nur aus belegten Regeln)
    const today = new Date().toISOString().slice(0, 10);
    const rules = (await env.DB.prepare(`SELECT m.*, v.plate FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id WHERE v.active=1`).all()).results;
    const warnDays = Number(await setting(env, 'maintenance_warn_days')) || 30;
    for (const r of rules) {
      const due = r.next_due_date;
      if (!due) continue;
      const days = Math.round((Date.parse(due) - Date.parse(today)) / 86400000);
      if (days < 0) add({ code: 'MAINTENANCE_OVERDUE', subject: r.id, vehicle_id: r.vehicle_id, severity: 'handeln', owner_role: 'fleet', requires_decision: 1,
        message: `${r.plate}: ${r.kind} seit ${-days} Tag(en) überfällig (fällig ${due}).`, next_action: 'Termin vereinbaren; Einsatzfähigkeit fachlich prüfen.' });
      else if (days <= warnDays) add({ code: 'MAINTENANCE_DUE', subject: r.id, vehicle_id: r.vehicle_id, severity: 'hinweis', owner_role: 'fleet',
        message: `${r.plate}: ${r.kind} fällig am ${due} (in ${days} Tag(en)).`, next_action: 'Werkstatttermin einplanen.' });
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

    // ---- Befunde persistieren (Upsert), Erledigtes schließen, Übergaben an Master ----
    const now = nowIso();
    const seen = new Set();
    let handoffs = 0;
    const newCritical = [];
    for (const f of findings) {
      const key = `${f.code}|${f.subject}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const fingerprint = await sha256Hex(`${f.code}|${f.subject}|${f.severity}|${f.requires_decision}`);
      const existing = await env.DB.prepare('SELECT * FROM agent_findings WHERE environment=? AND finding_code=? AND subject_key=?').bind(environment, f.code, f.subject).first();
      let findingId;
      let changed = false;
      if (!existing) {
        findingId = uuid();
        await env.DB.prepare(`INSERT INTO agent_findings(id,environment,finding_code,subject_key,case_id,vehicle_id,severity,message,next_action,owner_role,requires_decision,status,fingerprint,first_seen,last_seen)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,'offen',?,?,?)`).bind(findingId, environment, f.code, f.subject, f.case_id, f.vehicle_id, f.severity, f.message, f.next_action, f.owner_role, f.requires_decision, fingerprint, now, now).run();
        changed = true;
      } else {
        findingId = existing.id;
        changed = existing.status !== 'offen' || existing.fingerprint !== fingerprint;
        await env.DB.prepare(`UPDATE agent_findings SET severity=?, message=?, next_action=?, owner_role=?, requires_decision=?, status='offen', fingerprint=?, last_seen=?, resolved_at=NULL,
          first_seen=CASE WHEN status='erledigt' THEN ? ELSE first_seen END WHERE id=?`).bind(f.severity, f.message, f.next_action, f.owner_role, f.requires_decision, fingerprint, now, now, findingId).run();
      }
      if (changed && SEV_RANK[f.severity] >= SEV_RANK.handeln) {
        const eventId = await sha256Hex(`${findingId}|${fingerprint}|${existing ? existing.first_seen : now}`);
        const payload = {
          schema_version: '1.0', event_id: eventId, event_type: 'fleet.finding.review_required', environment,
          occurred_at: now, finding_id: findingId, finding_code: f.code, case_id: f.case_id, vehicle_id: f.vehicle_id,
          severity: f.severity, message: f.message, next_action: f.next_action, owner_role: f.owner_role,
          requires_human_approval: !!f.requires_decision, source_agent: 'claude-fleet-agent', agent_run_id: runId,
        };
        const r = await env.DB.prepare(`INSERT OR IGNORE INTO master_inbox(event_id,schema_version,environment,source_agent,event_type,finding_id,case_id,vehicle_id,severity,payload,received_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(eventId, '1.0', environment, 'claude-fleet-agent', payload.event_type, findingId, f.case_id, f.vehicle_id, f.severity, JSON.stringify(payload), now).run();
        if (r.meta && r.meta.changes === 1) {
          handoffs++;
          if (f.severity === 'kritisch') newCritical.push({ eventId, f });
        }
      }
    }
    // Nicht mehr zutreffende Befunde schließen
    const openRows = (await env.DB.prepare(`SELECT id, finding_code, subject_key FROM agent_findings WHERE environment=? AND status='offen'`).bind(environment).all()).results;
    for (const r of openRows) {
      if (!seen.has(`${r.finding_code}|${r.subject_key}`)) {
        await env.DB.prepare(`UPDATE agent_findings SET status='erledigt', resolved_at=? WHERE id=?`).bind(now, r.id).run();
      }
    }
    // Master verarbeitet Eingänge (Bestätigung der Übernahme, getrennt von menschlicher Entscheidung)
    await processMasterInbox(env, environment);

    // Kritische neue Befunde zusätzlich an Fuhrparkleitung/Owner pushen
    if (newCritical.length) {
      const ids = (await env.DB.prepare(`SELECT id FROM users WHERE environment=? AND role IN ('fleet','owner') AND active=1 AND password_hash IS NOT NULL`).bind(environment).all()).results.map((r) => r.id);
      for (const { eventId, f } of newCritical) {
        await notifyUsers(env, ctx, environment, ids, { kind: 'agent', title: 'Fuhrparkagent: Handlungsbedarf', body: `${f.code}${environment === 'test' ? ' · TEST' : ''}`, eventKey: `agent:${eventId}`, caseId: f.case_id, urgent: true });
      }
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
  const vehicles = (await env.DB.prepare('SELECT COUNT(*) AS n FROM vehicles WHERE active=1').first()).n;
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
