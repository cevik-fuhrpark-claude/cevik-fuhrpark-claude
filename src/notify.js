// [CLAUDE] Benachrichtigungen: Ereignis -> Empfänger (nur bestätigte Benutzerkonten) -> In-App + Push
// Zustände getrennt: gespeichert -> Push vom Dienst angenommen -> am Gerät empfangen -> geöffnet -> übernommen
import { nowIso, uuid } from './util.js';
import { sendPush } from './push.js';

const T = {
  de: {
    created: 'Neue Schadensmeldung', created_urgent: 'KRITISCH: neue Meldung (ungeprüft)', received: 'Meldung ist eingegangen',
    priority_changed: 'Priorität geändert', approved: 'Neuer Werkstattauftrag', rejected: 'Meldung abgelehnt',
    acknowledged: 'Werkstatt hat übernommen', started: 'Reparatur begonnen', waiting_parts: 'Wartet auf Teile', resumed: 'Reparatur fortgesetzt',
    quality_check: 'Bereit zur Abschlusskontrolle', rework: 'Nacharbeit angefordert', released: 'Fahrzeug technisch freigegeben',
    safety_lock: 'Fahrzeug gesperrt', safety_lock_lifted: 'Sperre aufgehoben', comment: 'Neuer Kommentar', open_item_safety: 'Sicherheitsrelevante Restarbeit',
    agent: 'Fuhrparkagent: Handlungsbedarf',
  },
  uk: {
    created: 'Нове повідомлення про пошкодження', created_urgent: 'КРИТИЧНО: нове повідомлення (неперевірене)', received: 'Повідомлення отримано',
    priority_changed: 'Пріоритет змінено', approved: 'Нове замовлення для майстерні', rejected: 'Повідомлення відхилено',
    acknowledged: 'Майстерня прийняла', started: 'Ремонт розпочато', waiting_parts: 'Очікування запчастин', resumed: 'Ремонт продовжено',
    quality_check: 'Готово до фінального контролю', rework: 'Потрібна доробка', released: 'Транспорт технічно допущено',
    safety_lock: 'Транспорт заблоковано', safety_lock_lifted: 'Блокування знято', comment: 'Новий коментар', open_item_safety: 'Залишкова робота (безпека)',
    agent: 'Агент автопарку: потрібні дії',
  },
  en: {
    created: 'New damage report', created_urgent: 'CRITICAL: new report (unverified)', received: 'Report received',
    priority_changed: 'Priority changed', approved: 'New workshop order', rejected: 'Report rejected',
    acknowledged: 'Workshop accepted', started: 'Repair started', waiting_parts: 'Waiting for parts', resumed: 'Repair resumed',
    quality_check: 'Ready for final inspection', rework: 'Rework requested', released: 'Vehicle technically released',
    safety_lock: 'Vehicle locked', safety_lock_lifted: 'Lock lifted', comment: 'New comment', open_item_safety: 'Safety-relevant open item',
    agent: 'Fleet agent: action required',
  },
};

async function usersByRole(env, environment, roles, extraWhere = '', extraArgs = []) {
  return (await env.DB.prepare(`SELECT id, language, role FROM users WHERE active=1 AND password_hash IS NOT NULL AND environment=? AND role IN (${roles.map(() => '?').join(',')}) ${extraWhere}`)
    .bind(environment, ...roles, ...extraArgs).all()).results;
}

export async function recipientsFor(env, c, kind, ctxData = {}) {
  const e = c.environment;
  const urgent = c.priority === 'kritisch' || c.reported_driveability === 'nicht_fahrbereit' || !!c.safety_lock;
  const list = [];
  const add = (rows) => { for (const r of rows) if (!list.find((x) => x.id === r.id)) list.push(r); };
  const reporter = (await env.DB.prepare('SELECT id, language, role FROM users WHERE id=? AND active=1').bind(c.reporter_id).all()).results;
  const site = c.workshop_site || c.suggested_workshop_site;
  const workshopUsers = site ? await usersByRole(env, e, ['workshop'], 'AND workshop_site=?', [site]) : [];
  switch (kind) {
    case 'created':
      add(await usersByRole(env, e, ['fleet', 'owner']));
      if (urgent) { add(await usersByRole(env, e, ['dispatch'])); add(workshopUsers); }
      break;
    case 'received': case 'rejected': case 'priority_changed':
      add(reporter);
      if (kind === 'priority_changed' && c.status !== 'gemeldet') add(workshopUsers);
      break;
    case 'approved': case 'rework':
      add(workshopUsers);
      if (kind === 'approved') add(reporter);
      break;
    case 'acknowledged': case 'started': case 'waiting_parts': case 'resumed': case 'quality_check': case 'open_item_safety':
      add(await usersByRole(env, e, ['fleet', 'owner']));
      if (kind === 'waiting_parts') add(await usersByRole(env, e, ['dispatch']));
      break;
    case 'released': case 'safety_lock': case 'safety_lock_lifted':
      add(reporter); add(await usersByRole(env, e, ['dispatch', 'fleet', 'owner'])); add(workshopUsers);
      break;
    case 'comment':
      add(reporter); add(await usersByRole(env, e, ['fleet', 'owner']));
      if (c.status !== 'gemeldet') add(workshopUsers);
      break;
  }
  const actorId = ctxData.actor?.id;
  return { list: list.filter((u) => u.id !== actorId), urgent };
}

export async function notifyCaseEvent(env, ctx, c, kind, ctxData = {}) {
  const { list, urgent } = await recipientsFor(env, c, kind, ctxData);
  const vehicle = ctxData.vehicle || await env.DB.prepare('SELECT plate FROM vehicles WHERE id=?').bind(c.vehicle_id).first();
  const eventKey = `${c.id}:${kind}:${c.version}`;
  const now = nowIso();
  const created = [];
  for (const u of list) {
    const lang = T[u.language] ? u.language : 'de';
    const title = kind === 'created' && urgent ? T[lang].created_urgent : T[lang][kind] || kind;
    // Sperrbildschirm: nur Vorgangsnummer, Kennzeichen, Priorität – keine Schadensbeschreibung
    const body = `${c.case_no} · ${vehicle?.plate || ''} · ${c.priority}${c.environment === 'test' ? ' · TEST' : ''}`;
    const id = uuid();
    const r = await env.DB.prepare(`INSERT OR IGNORE INTO notifications(id,environment,user_id,case_id,event_key,kind,urgent,title,body,created_at,push_status)
      VALUES (?,?,?,?,?,?,?,?,?,?,'pending')`).bind(id, c.environment, u.id, c.id, eventKey, kind, urgent ? 1 : 0, title, body, now).run();
    if (r.meta && r.meta.changes === 1) created.push({ id, user_id: u.id, title, body, urgent, case_id: c.id });
  }
  const job = deliverPush(env, created);
  if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
  return created.length;
}

export async function notifyUsers(env, ctx, environment, userIds, { kind, title, body, eventKey, caseId = null, urgent = false }) {
  const created = [];
  for (const uid of userIds) {
    const id = uuid();
    const r = await env.DB.prepare(`INSERT OR IGNORE INTO notifications(id,environment,user_id,case_id,event_key,kind,urgent,title,body,created_at,push_status)
      VALUES (?,?,?,?,?,?,?,?,?,?,'pending')`).bind(id, environment, uid, caseId, eventKey, kind, urgent ? 1 : 0, title, body, nowIso()).run();
    if (r.meta && r.meta.changes === 1) created.push({ id, user_id: uid, title, body, urgent, case_id: caseId });
  }
  const job = deliverPush(env, created);
  if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
  return created.length;
}

export async function deliverPush(env, notifications) {
  if (!notifications.length) return;
  // Abfragebudget: Geräte aller Empfänger in einer Abfrage laden, Statusänderungen gesammelt schreiben
  const userIds = [...new Set(notifications.map((n) => n.user_id))];
  const subsByUser = new Map();
  for (const s of (await env.DB.prepare('SELECT * FROM push_subscriptions WHERE revoked_at IS NULL AND user_id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(userIds)).all()).results) {
    if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
    subsByUser.get(s.user_id).push(s);
  }
  const writes = [];
  const revoked = new Set();
  for (const n of notifications) {
    const subs = (subsByUser.get(n.user_id) || []).filter((s) => !revoked.has(s.id));
    if (subs.length === 0) {
      writes.push(env.DB.prepare(`UPDATE notifications SET push_status='no_subscription' WHERE id=?`).bind(n.id));
      continue;
    }
    let accepted = false; let lastErr = null;
    for (const s of subs) {
      const res = await sendPush(env, s, { id: n.id, title: n.title, body: n.body, case_id: n.case_id, urgent: n.urgent }, { urgent: n.urgent });
      if (res.status === 'accepted') {
        accepted = true;
        writes.push(env.DB.prepare('UPDATE push_subscriptions SET last_success_at=? WHERE id=?').bind(nowIso(), s.id));
      } else if (res.status === 'gone') {
        revoked.add(s.id);
        writes.push(env.DB.prepare('UPDATE push_subscriptions SET revoked_at=? WHERE id=?').bind(nowIso(), s.id));
        lastErr = `Gerät abgemeldet (${res.http})`;
      } else {
        lastErr = `HTTP ${res.http} ${res.error || ''}`.trim();
      }
    }
    writes.push(env.DB.prepare(`UPDATE notifications SET push_status=?, push_attempts=push_attempts+1, push_last_error=?, push_accepted_at=? WHERE id=?`)
      .bind(accepted ? 'accepted' : 'failed', accepted ? null : lastErr, accepted ? nowIso() : null, n.id));
  }
  if (writes.length) await env.DB.batch(writes);
}

// Wiederholung fehlgeschlagener Pushs (Cron), max. 3 Versuche
export async function retryFailedPush(env) {
  const rows = (await env.DB.prepare(`SELECT id, user_id, title, body, urgent, case_id FROM notifications
    WHERE push_status='failed' AND push_attempts < 3 AND acknowledged_at IS NULL AND created_at > ? LIMIT 20`)
    .bind(new Date(Date.now() - 24 * 3600 * 1000).toISOString()).all()).results;
  await deliverPush(env, rows.map((r) => ({ ...r, urgent: !!r.urgent })));
  return rows.length;
}
