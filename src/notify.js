// [CLAUDE] Benachrichtigungen: Ereignis -> Empfänger (nur bestätigte Benutzerkonten) -> In-App + Push
// Zustände getrennt: gespeichert -> Push vom Dienst angenommen -> am Gerät empfangen -> geöffnet -> übernommen
import { nowIso, uuid } from './util.js';
import { sendPush } from './push.js';

// Priorität im Hinweistext in der Sprache der Person (Sperrbildschirm)
const PRIO = { de: { niedrig: 'niedrig', mittel: 'mittel', kritisch: 'kritisch' }, uk: { niedrig: 'низький', mittel: 'середній', kritisch: 'критичний' }, en: { niedrig: 'low', mittel: 'medium', kritisch: 'critical' } };
const T = {
  de: {
    created: 'Neue Schadensmeldung', created_urgent: 'KRITISCH: neue Meldung (ungeprüft)', received: 'Meldung ist eingegangen',
    priority_changed: 'Priorität geändert', approved: 'Neuer Werkstattauftrag', rejected: 'Meldung abgelehnt',
    acknowledged: 'Werkstatt hat übernommen', started: 'Reparatur begonnen', waiting_parts: 'Wartet auf Teile', resumed: 'Reparatur fortgesetzt',
    quality_check: 'Bereit zur Abschlusskontrolle', rework: 'Nacharbeit angefordert', released: 'Fahrzeug technisch freigegeben',
    safety_lock: 'Fahrzeug gesperrt', safety_lock_lifted: 'Sperre aufgehoben', comment: 'Neuer Kommentar', open_item_safety: 'Sicherheitsrelevante Restarbeit',
    agent: 'Fuhrparkagent: Handlungsbedarf', cost_limit: 'Kostenfreigabe nötig (Grenze überschritten)', cost_approved: 'Kosten freigegeben', inspection_defect: 'Prüfung mit gefährlichen Mängeln',
  },
  uk: {
    created: 'Нове повідомлення про пошкодження', created_urgent: 'КРИТИЧНО: нове повідомлення (неперевірене)', received: 'Повідомлення отримано',
    priority_changed: 'Пріоритет змінено', approved: 'Нове замовлення для майстерні', rejected: 'Повідомлення відхилено',
    acknowledged: 'Майстерня прийняла', started: 'Ремонт розпочато', waiting_parts: 'Очікування запчастин', resumed: 'Ремонт продовжено',
    quality_check: 'Готово до фінального контролю', rework: 'Потрібна доробка', released: 'Транспорт технічно допущено',
    safety_lock: 'Транспорт заблоковано', safety_lock_lifted: 'Блокування знято', comment: 'Новий коментар', open_item_safety: 'Залишкова робота (безпека)',
    agent: 'Агент автопарку: потрібні дії', cost_limit: 'Потрібне погодження витрат (ліміт перевищено)', cost_approved: 'Витрати погоджено', inspection_defect: 'Огляд із небезпечними дефектами',
  },
  en: {
    created: 'New damage report', created_urgent: 'CRITICAL: new report (unverified)', received: 'Report received',
    priority_changed: 'Priority changed', approved: 'New workshop order', rejected: 'Report rejected',
    acknowledged: 'Workshop accepted', started: 'Repair started', waiting_parts: 'Waiting for parts', resumed: 'Repair resumed',
    quality_check: 'Ready for final inspection', rework: 'Rework requested', released: 'Vehicle technically released',
    safety_lock: 'Vehicle locked', safety_lock_lifted: 'Lock lifted', comment: 'New comment', open_item_safety: 'Safety-relevant open item',
    agent: 'Fleet agent: action required', cost_limit: 'Cost approval needed (limit exceeded)', cost_approved: 'Costs approved', inspection_defect: 'Inspection with dangerous defects',
  },
};

// Nicht dringende Ereignisarten, deren Push jede Person für sich abschalten kann (dringende und Sicherheitsereignisse nie)
export const MUTABLE_KINDS = ['created', 'received', 'priority_changed', 'approved', 'rejected', 'acknowledged', 'started', 'waiting_parts', 'resumed',
  'quality_check', 'rework', 'released', 'safety_lock_lifted', 'comment', 'agent_reminder', 'cost_limit', 'cost_approved'];
// Titel von Vorgangs-Hinweisen in der aktuellen Sprache der Person anzeigen (gespeichert wird die Sprache zum Zeitpunkt des Versands)
export function localizedTitle(n, lang) {
  const L = T[lang] ? lang : 'de';
  if (!T.de[n.kind] || !n.case_id && n.kind === 'created') return n.title; // Agent/Sonstiges: Text wie gespeichert
  if (n.title !== T.de[n.kind] && n.title !== T.uk[n.kind] && n.title !== T.en[n.kind] && !(n.kind === 'created' && [T.de, T.uk, T.en].some((x) => x.created_urgent === n.title))) return n.title;
  return n.kind === 'created' && n.urgent ? T[L].created_urgent : T[L][n.kind];
}

export function parseMuted(v) { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a.filter((k) => MUTABLE_KINDS.includes(k)) : []; } catch { return []; } }

async function usersByRole(env, environment, roles, extraWhere = '', extraArgs = []) {
  return (await env.DB.prepare(`SELECT id, language, role FROM users WHERE active=1 AND password_hash IS NOT NULL AND environment=? AND role IN (${roles.map(() => '?').join(',')}) ${extraWhere}`)
    .bind(environment, ...roles, ...extraArgs).all()).results;
}

// Fahrer mit aktueller Zuordnung zum Fahrzeug (Sperre/Aufhebung/Freigabe betrifft sie direkt). Sie sehen fremde Vorgänge
// nicht – ihr Hinweis verlinkt daher nicht auf den Vorgang (assigned), sondern erscheint in „Hinweise“/„Mein Fahrzeug“.
async function assignedDrivers(env, c) {
  return (await env.DB.prepare(`SELECT u.id, u.language, u.role, 1 AS assigned FROM driver_vehicles d JOIN users u ON u.id=d.user_id
    WHERE d.vehicle_id=? AND (d.valid_to IS NULL OR d.valid_to > ?) AND u.active=1 AND u.password_hash IS NOT NULL AND u.environment=? AND u.role='driver' AND u.id<>?`)
    .bind(c.vehicle_id, nowIso(), c.environment, c.reporter_id).all()).results;
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
      if (c.safety_lock) add(await assignedDrivers(env, c)); // „nicht fahren“ auch an die anderen Fahrer dieses Fahrzeugs
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
    case 'cost_limit':
      add(await usersByRole(env, e, ['fleet', 'owner']));
      break;
    case 'cost_approved':
      add(workshopUsers);
      break;
    case 'released': case 'safety_lock': case 'safety_lock_lifted':
      add(reporter); add(await usersByRole(env, e, ['dispatch', 'fleet', 'owner'])); add(workshopUsers);
      add(await assignedDrivers(env, c));
      break;
    case 'comment': {
      // Optional gezielt: payload.notify ⊆ ['reporter','fleet','workshop'] (Standard: alle Beteiligten)
      const want = Array.isArray(ctxData.payload?.notify) && ctxData.payload.notify.length ? new Set(ctxData.payload.notify) : null;
      if (!want || want.has('reporter')) add(reporter);
      if (!want || want.has('fleet')) add(await usersByRole(env, e, ['fleet', 'owner']));
      if ((!want || want.has('workshop')) && c.status !== 'gemeldet') add(workshopUsers);
      break;
    }
  }
  const actorId = ctxData.actor?.id;
  return { list: list.filter((u) => u.id !== actorId), urgent: kind.startsWith('cost_') ? false : urgent }; // Kostenhinweise nie dringend
}

// Hinweise anlegen (doppelte Ereignisse je Person werden ignoriert) und die tatsächlich neuen zurückgeben.
// Abfragebudget: ab 2 Empfängern 2 Anweisungen statt einer je Empfänger (Agent-Läufe mit mehreren Leitungskonten blieben sonst nicht unter 50).
async function insertNotifications(env, rows) {
  if (!rows.length) return [];
  const sql = `INSERT OR IGNORE INTO notifications(id,environment,user_id,case_id,event_key,kind,urgent,title,body,created_at,push_status)`;
  if (rows.length === 1) {
    const x = rows[0];
    const r = await env.DB.prepare(`${sql} VALUES (?,?,?,?,?,?,?,?,?,?,'pending')`).bind(x.id, x.environment, x.user_id, x.case_id, x.event_key, x.kind, x.urgent, x.title, x.body, x.created_at).run();
    return r.meta && r.meta.changes === 1 ? rows : [];
  }
  const f = (k) => `json_extract(value,'$.${k}')`;
  await env.DB.prepare(`${sql} SELECT ${['id', 'environment', 'user_id', 'case_id', 'event_key', 'kind', 'urgent', 'title', 'body', 'created_at'].map(f).join(',')},'pending' FROM json_each(?)`)
    .bind(JSON.stringify(rows)).run();
  const ok = new Set((await env.DB.prepare('SELECT id FROM notifications WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(rows.map((r) => r.id))).all()).results.map((r) => r.id));
  return rows.filter((r) => ok.has(r.id));
}

export async function notifyCaseEvent(env, ctx, c, kind, ctxData = {}) {
  const { list, urgent } = await recipientsFor(env, c, kind, ctxData);
  const vehicle = ctxData.vehicle || await env.DB.prepare('SELECT plate FROM vehicles WHERE id=?').bind(c.vehicle_id).first();
  const eventKey = `${c.id}:${kind}:${c.version}`;
  const now = nowIso();
  const rows = [];
  for (const u of list) {
    const lang = T[u.language] ? u.language : 'de';
    const title = kind === 'created' && urgent ? T[lang].created_urgent : T[lang][kind] || kind;
    // Sperrbildschirm: nur Vorgangsnummer, Kennzeichen, Priorität – keine Schadensbeschreibung
    const body = `${c.case_no} · ${vehicle?.plate || ''} · ${PRIO[lang][c.priority] || c.priority}${c.environment === 'test' ? ' · TEST' : ''}`;
    rows.push({ id: uuid(), environment: c.environment, user_id: u.id, case_id: u.assigned ? null : c.id, event_key: eventKey, kind, urgent: urgent ? 1 : 0, title, body, created_at: now });
  }
  const created = (await insertNotifications(env, rows)).map((r) => ({ id: r.id, user_id: r.user_id, title: r.title, body: r.body, urgent, case_id: r.case_id, kind }));
  const job = deliverPush(env, created);
  if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
  return created.length;
}

// Neue Meldungen gesammelt benachrichtigen (Folgeaufträge einer Kontrolle): Empfänger je gleicher Ausgangslage nur einmal
// ermitteln, alle Hinweise mit einer Einfüge- und einer Zustellrunde – Abfragezahl unabhängig von der Anzahl der Meldungen.
export async function notifyCasesCreated(env, ctx, cases, { actor, vehicles }) {
  if (cases.length === 1) return notifyCaseEvent(env, ctx, cases[0], 'created', { actor, vehicle: vehicles.get(cases[0].vehicle_id) });
  const cache = new Map();
  const now = nowIso();
  const rows = []; const meta = new Map();
  for (const c of cases) {
    const urgentNow = c.priority === 'kritisch' || c.reported_driveability === 'nicht_fahrbereit' || !!c.safety_lock;
    const sig = [c.environment, c.vehicle_id, c.reporter_id, c.workshop_site || c.suggested_workshop_site || '', urgentNow ? 1 : 0, c.safety_lock ? 1 : 0].join('|');
    if (!cache.has(sig)) cache.set(sig, await recipientsFor(env, c, 'created', { actor }));
    const { list, urgent } = cache.get(sig);
    const plate = vehicles.get(c.vehicle_id)?.plate || '';
    for (const u of list) {
      const lang = T[u.language] ? u.language : 'de';
      const row = { id: uuid(), environment: c.environment, user_id: u.id, case_id: u.assigned ? null : c.id, event_key: `${c.id}:created:${c.version}`, kind: 'created', urgent: urgent ? 1 : 0,
        title: urgent ? T[lang].created_urgent : T[lang].created, body: `${c.case_no} · ${plate} · ${PRIO[lang][c.priority] || c.priority}${c.environment === 'test' ? ' · TEST' : ''}`, created_at: now };
      rows.push(row); meta.set(row.id, urgent);
    }
  }
  const created = (await insertNotifications(env, rows)).map((r) => ({ id: r.id, user_id: r.user_id, title: r.title, body: r.body, urgent: meta.get(r.id), case_id: r.case_id, kind: 'created' }));
  const job = deliverPush(env, created, { collapse: true });
  if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
  return created.length;
}

export async function notifyUsers(env, ctx, environment, userIds, { kind, title, body, eventKey, caseId = null, urgent = false }) {
  const now = nowIso();
  const rows = userIds.map((uid) => ({ id: uuid(), environment, user_id: uid, case_id: caseId, event_key: eventKey, kind, urgent: urgent ? 1 : 0, title, body, created_at: now }));
  const created = (await insertNotifications(env, rows)).map((r) => ({ id: r.id, user_id: r.user_id, title, body, urgent, case_id: caseId, kind }));
  const job = deliverPush(env, created);
  if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
  return created.length;
}

// collapse: je Person nur ein Push (dringendster Hinweis, Text „· +N“), die übrigen Hinweise erhalten denselben Zustellstatus.
// Für Sammelereignisse (Kontrolle mit mehreren Mängeln) – sonst ein Netzaufruf je Hinweis und Gerät (Cloudflare-Grenze je Aufruf).
// maxSends: Netzaufrufe (Geräte) je Zustellung – Cloudflare erlaubt im Gratis-Tarif 50 Unteranfragen je Aufruf. Dringende zuerst;
// was darüber hinausgeht, bleibt „pending“ und wird vom Cron (retryFailedPush, nach 5 Min.) zugestellt statt den Aufruf abzubrechen.
export const PUSH_MAX_SENDS = 40;
export async function deliverPush(env, notifications, { collapse = false, maxSends = env.__pushMaxSends || PUSH_MAX_SENDS } = {}) {
  if (!notifications.length) return;
  notifications = [...notifications].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  const all = notifications;
  const followers = new Map(); // Träger-ID -> weitere Hinweise derselben Person
  if (collapse) {
    const byUser = new Map();
    for (const n of notifications) { if (!byUser.has(n.user_id)) byUser.set(n.user_id, []); byUser.get(n.user_id).push(n); }
    const carriers = [];
    for (const list of byUser.values()) {
      const carrier = list.find((n) => n.urgent) || list[0];
      const rest = list.filter((n) => n !== carrier);
      carriers.push(rest.length ? { ...carrier, body: `${carrier.body} · +${rest.length}` } : carrier);
      if (rest.length) followers.set(carrier.id, rest);
    }
    notifications = carriers;
  }
  // Abfragebudget: Geräte aller Empfänger in einer Abfrage laden, Statusänderungen gesammelt schreiben
  const userIds = [...new Set(notifications.map((n) => n.user_id))];
  const subsByUser = new Map();
  for (const s of (await env.DB.prepare('SELECT * FROM push_subscriptions WHERE revoked_at IS NULL AND user_id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(userIds)).all()).results) {
    if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
    subsByUser.get(s.user_id).push(s);
  }
  // Abfragebudget: höchstens 3 Schreibanweisungen je Zustellung, unabhängig von Empfänger- und Gerätezahl
  // (vorher 1 je Hinweis + 1 je Gerät – ein kritischer Fall an viele Konten mit mehreren Geräten konnte die Grenze von 50 sprengen)
  const states = []; // { id, s: Status, a: 1 = Zustellversuch (zählt Versuche, setzt Fehler/Annahmezeit), e, t }
  const okSubs = new Set();
  const revoked = new Set();
  const mutedByUser = new Map();
  let sends = 0; const deferred = new Set();
  if (all.some((n) => !n.urgent && n.kind)) {
    for (const u of (await env.DB.prepare('SELECT id, push_muted FROM users WHERE push_muted IS NOT NULL AND id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(userIds)).all()).results) mutedByUser.set(u.id, new Set(parseMuted(u.push_muted)));
  }
  for (const n of notifications) {
    if (!n.urgent && n.kind && mutedByUser.get(n.user_id)?.has(n.kind)) { states.push({ id: n.id, s: 'disabled', a: 0 }); continue; }
    const subs = (subsByUser.get(n.user_id) || []).filter((s) => !revoked.has(s.id));
    if (subs.length === 0) { states.push({ id: n.id, s: 'no_subscription', a: 0 }); continue; }
    if (sends + subs.length > maxSends) { deferred.add(n.id); continue; } // bleibt pending → Cron
    let accepted = false; let lastErr = null;
    for (const s of subs) {
      sends++;
      const res = await sendPush(env, s, { id: n.id, title: n.title, body: n.body, case_id: n.case_id, urgent: n.urgent }, { urgent: n.urgent });
      if (res.status === 'accepted') {
        accepted = true;
        okSubs.add(s.id);
      } else if (res.status === 'gone') {
        revoked.add(s.id);
        lastErr = `Gerät abgemeldet (${res.http})`;
      } else {
        lastErr = `HTTP ${res.http} ${res.error || ''}`.trim();
      }
    }
    states.push({ id: n.id, s: accepted ? 'accepted' : 'failed', a: 1, e: accepted ? null : lastErr, t: accepted ? nowIso() : null });
  }
  // gesammelte Folgehinweise eines verschobenen Trägers bleiben ebenfalls pending (werden einzeln nachgeholt)
  for (const st of [...states]) for (const f of followers.get(st.id) || []) {
    // Stumm geschaltete Art gilt je Hinweis; sonst teilt der Hinweis das Ergebnis des gesammelten Pushs
    states.push(!f.urgent && f.kind && mutedByUser.get(f.user_id)?.has(f.kind) ? { id: f.id, s: 'disabled', a: 0 } : { ...st, id: f.id });
  }
  const now = nowIso();
  const writes = [];
  if (states.length) {
    writes.push(env.DB.prepare(`UPDATE notifications SET push_status=j.s, push_attempts=push_attempts + j.a,
      push_last_error=CASE WHEN j.a=1 THEN j.e ELSE notifications.push_last_error END,
      push_accepted_at=CASE WHEN j.a=1 THEN j.t ELSE notifications.push_accepted_at END
      FROM (SELECT json_extract(value,'$.id') AS id, json_extract(value,'$.s') AS s, json_extract(value,'$.a') AS a,
        json_extract(value,'$.e') AS e, json_extract(value,'$.t') AS t FROM json_each(?)) AS j WHERE notifications.id=j.id`).bind(JSON.stringify(states)));
  }
  if (okSubs.size) writes.push(env.DB.prepare('UPDATE push_subscriptions SET last_success_at=? WHERE id IN (SELECT value FROM json_each(?))').bind(now, JSON.stringify([...okSubs])));
  if (revoked.size) writes.push(env.DB.prepare('UPDATE push_subscriptions SET revoked_at=? WHERE id IN (SELECT value FROM json_each(?))').bind(now, JSON.stringify([...revoked])));
  if (writes.length) await env.DB.batch(writes);
}

// Wiederholung fehlgeschlagener Pushs (Cron), max. 3 Versuche
export async function retryFailedPush(env) {
  const rows = (await env.DB.prepare(`SELECT id, user_id, title, body, urgent, case_id, kind FROM notifications
    WHERE acknowledged_at IS NULL AND created_at > ? AND ((push_status='failed' AND push_attempts < 3) OR (push_status='pending' AND created_at < ?))
    ORDER BY urgent DESC, created_at LIMIT 20`)
    // „pending“ älter als 5 Min.: verschoben (Grenze je Aufruf) oder Zustellung abgebrochen (z. B. Zeitlimit) – wird jetzt nachgeholt
    .bind(new Date(Date.now() - 24 * 3600 * 1000).toISOString(), new Date(Date.now() - 5 * 60000).toISOString()).all()).results;
  await deliverPush(env, rows.map((r) => ({ ...r, urgent: !!r.urgent })));
  return rows.length;
}
