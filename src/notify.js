// [CLAUDE] Benachrichtigungen: Ereignis -> Empfänger (nur bestätigte Benutzerkonten) -> In-App + Push
// Zustände getrennt: gespeichert -> Push vom Dienst angenommen -> am Gerät empfangen -> geöffnet -> übernommen
import { nowIso, uuid, quietHoldUntil, dateLang, PLATE_KEY_SQL } from './util.js';
import { sendPush } from './push.js';
import { localizedAgentBody, localizedAgentTitle } from './agent.js';

// Priorität im Hinweistext in der Sprache der Person (Sperrbildschirm)
const PRIO = { de: { niedrig: 'niedrig', mittel: 'mittel', kritisch: 'kritisch' }, uk: { niedrig: 'низький', mittel: 'середній', kritisch: 'критичний' }, en: { niedrig: 'low', mittel: 'medium', kritisch: 'critical' } };
const T = {
  de: {
    created: 'Neue Schadensmeldung', created_urgent: 'KRITISCH: neue Meldung (ungeprüft)', received: 'Meldung ist eingegangen',
    priority_changed: 'Priorität geändert', approved: 'Neuer Werkstattauftrag', rejected: 'Meldung abgelehnt',
    acknowledged: 'Werkstatt hat übernommen', started: 'Reparatur begonnen', waiting_parts: 'Wartet auf Teile', resumed: 'Reparatur fortgesetzt',
    quality_check: 'Bereit zur Abschlusskontrolle', rework: 'Nacharbeit angefordert', released: 'Fahrzeug technisch freigegeben',
    safety_lock: 'Fahrzeug gesperrt', safety_lock_lifted: 'Sperre aufgehoben', comment: 'Neuer Kommentar', open_item_safety: 'Sicherheitsrelevante Restarbeit',
    agent: 'Fuhrparkagent: Handlungsbedarf', cost_limit: 'Kostenfreigabe nötig (Grenze überschritten)', cost_approved: 'Kosten freigegeben', reassigned_away: 'Auftrag an andere Werkstatt übergeben', inspection_defect: 'Prüfung mit gefährlichen Mängeln', fine: 'Neues Schreiben einer Behörde', test: 'Testbenachrichtigung', test_body: 'Push funktioniert auf diesem Gerät.',
    new_login: 'Neue Anmeldung auf einem anderen Gerät', new_login_body: '{d} · {t}. Waren Sie das nicht? Mehr → Mein Konto: unter „Meine Anmeldungen (Geräte)“ das Gerät abmelden und das Passwort ändern.', unknown_device: 'Unbekanntes Gerät',
    res_gefaehrliche_maengel: 'gefährliche Mängel', res_verkehrsunsicher: 'verkehrsunsicher', do_not_plan: 'nicht einplanen',
  },
  uk: {
    created: 'Нове повідомлення про пошкодження', created_urgent: 'КРИТИЧНО: нове повідомлення (неперевірене)', received: 'Повідомлення отримано',
    priority_changed: 'Пріоритет змінено', approved: 'Нове замовлення для майстерні', rejected: 'Повідомлення відхилено',
    acknowledged: 'Майстерня прийняла', started: 'Ремонт розпочато', waiting_parts: 'Очікування запчастин', resumed: 'Ремонт продовжено',
    quality_check: 'Готово до фінального контролю', rework: 'Потрібна доробка', released: 'Транспорт технічно допущено',
    safety_lock: 'Транспорт заблоковано', safety_lock_lifted: 'Блокування знято', comment: 'Новий коментар', open_item_safety: 'Залишкова робота (безпека)',
    agent: 'Агент автопарку: потрібні дії', cost_limit: 'Потрібне погодження витрат (ліміт перевищено)', cost_approved: 'Витрати погоджено', reassigned_away: 'Замовлення передано іншій майстерні', inspection_defect: 'Огляд із небезпечними дефектами', fine: 'Новий лист від органу влади', test: 'Тестове сповіщення', test_body: 'Push працює на цьому пристрої.',
    new_login: 'Новий вхід на іншому пристрої', new_login_body: '{d} · {t}. Це були не ви? Ще → Мій акаунт: у «Мої входи (пристрої)» вийдіть на цьому пристрої та змініть пароль.', unknown_device: 'Невідомий пристрій',
    res_gefaehrliche_maengel: 'небезпечні дефекти', res_verkehrsunsicher: 'небезпечний для руху', do_not_plan: 'не планувати',
  },
  en: {
    created: 'New damage report', created_urgent: 'CRITICAL: new report (unverified)', received: 'Report received',
    priority_changed: 'Priority changed', approved: 'New workshop order', rejected: 'Report rejected',
    acknowledged: 'Workshop accepted', started: 'Repair started', waiting_parts: 'Waiting for parts', resumed: 'Repair resumed',
    quality_check: 'Ready for final inspection', rework: 'Rework requested', released: 'Vehicle technically released',
    safety_lock: 'Vehicle locked', safety_lock_lifted: 'Lock lifted', comment: 'New comment', open_item_safety: 'Safety-relevant open item',
    agent: 'Fleet agent: action required', cost_limit: 'Cost approval needed (limit exceeded)', cost_approved: 'Costs approved', reassigned_away: 'Order handed over to another workshop', inspection_defect: 'Inspection with dangerous defects', fine: 'New letter from an authority', test: 'Test notification', test_body: 'Push works on this device.',
    new_login: 'New sign-in on another device', new_login_body: '{d} · {t}. Not you? More → My account: under “My sign-ins (devices)” sign out that device and change your password.', unknown_device: 'Unknown device',
    res_gefaehrliche_maengel: 'dangerous defects', res_verkehrsunsicher: 'unroadworthy', do_not_plan: 'do not schedule',
  },
};

// Text in der Sprache der Person (unbekannte Sprache → Deutsch)
export const nt = (lang, key) => (T[lang] && T[lang][key]) || T.de[key];

// Nicht dringende Ereignisarten, deren Push jede Person für sich abschalten kann (dringende und Sicherheitsereignisse nie)
export const MUTABLE_KINDS = ['created', 'received', 'priority_changed', 'approved', 'rejected', 'acknowledged', 'started', 'waiting_parts', 'resumed',
  'quality_check', 'rework', 'released', 'safety_lock_lifted', 'comment', 'agent_reminder', 'cost_limit', 'cost_approved', 'reassigned_away'];
// Titel von Vorgangs-Hinweisen in der aktuellen Sprache der Person anzeigen (gespeichert wird die Sprache zum Zeitpunkt des Versands)
export function localizedTitle(n, lang) {
  const L = T[lang] ? lang : 'de';
  if (!T.de[n.kind] || !n.case_id && n.kind === 'created') return n.title; // Agent/Sonstiges: Text wie gespeichert
  if (n.title !== T.de[n.kind] && n.title !== T.uk[n.kind] && n.title !== T.en[n.kind] && !(n.kind === 'created' && [T.de, T.uk, T.en].some((x) => x.created_urgent === n.title))) return n.title;
  return n.kind === 'created' && n.urgent ? T[L].created_urgent : T[L][n.kind];
}

// Text (body) gespeicherter Hinweise in der aktuellen Sprache der Person – wie localizedTitle; nur bekannte, maschinell aufgebaute Formen:
// Vorgangs-Hinweise „Nr · Kennzeichen · Priorität[ · TEST]“ und „Prüfung mit gefährlichen Mängeln“ „Kennzeichen · Art Datum: Ergebnis[ – nicht einplanen][ · TEST]“.
// Alles andere (Agent, Anmeldung, Bußgeld, Test) bleibt wie gespeichert. Unbekannte Form → unverändert.
const LANGS = ['de', 'uk', 'en'];
export const NOTIF_REF = /^(vehicle|fine):[A-Za-z0-9:_-]{1,80}$/;
const PRIO_KEY = new Map(LANGS.flatMap((l) => Object.entries(PRIO[l]).map(([k, v]) => [v, k])));
const RES_KEY = new Map(LANGS.flatMap((l) => ['gefaehrliche_maengel', 'verkehrsunsicher'].map((k) => [T[l]['res_' + k], k])));
const DNP = new Set(LANGS.map((l) => T[l].do_not_plan));
const NO_CASE_BODY = new Set(['agent', 'agent_reminder', 'new_login', 'fine', 'test', 'inspection_defect']);
// Anmelde-Hinweis „{Gerät} · {Zeit}. Waren Sie das nicht? …“: Zeit in der Schreibweise der Sprache (berlinDateTimeLang) zurücklesen und neu schreiben
const EN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TIME_RE = { de: /^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}:\d{2}) Uhr$/, uk: /^(\d{2})\.(\d{2})\.(\d{4}) о (\d{2}:\d{2})$/, en: /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4}), (\d{2}:\d{2})$/ };
function loginTime(t, from, to) {
  const m = TIME_RE[from].exec(t);
  if (!m) return null;
  const [d, mo, y, hm] = from === 'en' ? [m[1].padStart(2, '0'), String(EN_MON.indexOf(m[2]) + 1).padStart(2, '0'), m[3], m[4]] : [m[1], m[2], m[3], m[4]];
  if (mo === '00') return null;
  if (to === 'en') return `${Number(d)} ${EN_MON[Number(mo) - 1]} ${y}, ${hm}`;
  return to === 'uk' ? `${d}.${mo}.${y} о ${hm}` : `${d}.${mo}.${y}, ${hm} Uhr`;
}
function localizedLoginBody(b, L) {
  for (const l of LANGS) {
    const tpl = T[l].new_login_body; const i = tpl.indexOf('{t}'); const tail = tpl.slice(i + 3);
    if (!tpl.startsWith('{d} · ') || !b.endsWith(tail)) continue;
    const head = b.slice(0, b.length - tail.length); const k = head.lastIndexOf(' · ');
    if (k < 0) continue;
    const dev = head.slice(0, k); const t = loginTime(head.slice(k + 3), l, L);
    if (t === null) continue;
    const devL = LANGS.some((x) => T[x].unknown_device === dev) ? T[L].unknown_device : dev;
    return T[L].new_login_body.replace('{d}', devL).replace('{t}', t);
  }
  return b;
}
export function localizedBody(n, lang) {
  const L = T[lang] ? lang : 'de';
  const b = n.body;
  if (typeof b !== 'string' || !b) return b;
  if (n.kind === 'inspection_defect') {
    const m = /^(.+) · (.+) (\d{4}-\d{2}-\d{2}|\d{2}[./]\d{2}[./]\d{4}): (.+?)(?: – (.+?))?( · TEST)?$/.exec(b);
    if (!m || !RES_KEY.has(m[4]) || (m[5] !== undefined && !DNP.has(m[5]))) return b;
    const d = /^\d{4}/.test(m[3]) ? m[3] : `${m[3].slice(6)}-${m[3].slice(3, 5)}-${m[3].slice(0, 2)}`;
    return `${m[1]} · ${m[2]} ${dateLang(d, L)}: ${T[L]['res_' + RES_KEY.get(m[4])]}${m[5] !== undefined ? ' – ' + T[L].do_not_plan : ''}${m[6] || ''}`;
  }
  if (n.kind === 'new_login') return localizedLoginBody(b, L);
  if (n.kind === 'test') return LANGS.some((l) => T[l].test_body === b) ? T[L].test_body : b;
  if (NO_CASE_BODY.has(n.kind) || !T.de[n.kind]) return b;
  const test = b.endsWith(' · TEST') ? ' · TEST' : '';
  const core = test ? b.slice(0, -test.length) : b;
  const i = core.lastIndexOf(' · ');
  const prio = i > 0 ? core.slice(i + 3) : null;
  if (!prio || !PRIO_KEY.has(prio)) return b;
  return `${core.slice(0, i + 3)}${PRIO[L][PRIO_KEY.get(prio)]}${test}`;
}

export function parseMuted(v) { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a.filter((k) => MUTABLE_KINDS.includes(k)) : []; } catch { return []; } }

// Alle möglichen Empfänger eines Vorgangs in EINER Abfrage (Abfragebudget je Aufruf): Melder (nur aktiv), Leitung/Inhaber/Dispo
// der Umgebung, Werkstatt des Standorts und Fahrer mit aktueller Zuordnung zum Fahrzeug. Auswahl je Ereignis danach im Speicher.
// Fahrer sehen fremde Vorgänge nicht – ihr Hinweis verlinkt daher nicht auf den Vorgang (assigned), sondern erscheint in „Hinweise“/„Mein Fahrzeug“.
// Gespann (17.10.2026): mit withCoupled zählen auch Fahrer des fest gekoppelten Fahrzeugs laut Stammliste (Lkw ↔ Anhänger, Regel wie
// „Mein Fahrzeug“) – eine Sperre/Freigabe am Anhänger betrifft den Fahrer der Zugmaschine und umgekehrt. In derselben Abfrage
// (Abfragebudget); Kennzeichen-Vergleich ohne Leer-/Trennzeichen wie normPlate (PLATE_KEY_SQL).
async function candidateUsers(env, c, site, withCoupled, oldSite) {
  const own = `d.vehicle_id=?4`;
  const coupled = withCoupled ? ` OR d.vehicle_id IN (SELECT x.id FROM vehicles x JOIN vehicles v ON v.id=?4 WHERE x.active=1 AND x.id<>v.id AND (
      (v.kind='anhaenger' AND x.kind='lkw' AND ${PLATE_KEY_SQL('x.trailer_plate')}<>'' AND ${PLATE_KEY_SQL('x.trailer_plate')}=${PLATE_KEY_SQL('v.plate')})
      OR (v.kind='lkw' AND x.kind='anhaenger' AND ${PLATE_KEY_SQL('v.trailer_plate')}<>'' AND ${PLATE_KEY_SQL('x.plate')}=${PLATE_KEY_SQL('v.trailer_plate')})))` : '';
  const assigned = `EXISTS (SELECT 1 FROM driver_vehicles d WHERE d.user_id=u.id AND (${own}${coupled}) AND (d.valid_to IS NULL OR d.valid_to > ?5))`;
  return (await env.DB.prepare(`SELECT u.id, u.language, u.role, (u.id=?1) AS is_reporter,
      (u.password_hash IS NOT NULL AND u.environment=?2) AS qualified,
      (u.role='workshop' AND u.workshop_site IS ?3) AS at_site,
      (u.role='workshop' AND ?6 IS NOT NULL AND u.workshop_site IS ?6) AS at_old_site,
      (u.role='driver' AND ${assigned}) AS is_assigned
    FROM users u WHERE u.active=1 AND (u.id=?1 OR (u.password_hash IS NOT NULL AND u.environment=?2 AND (u.role IN ('fleet','owner','dispatch')
      OR (u.role='workshop' AND (u.workshop_site IS ?3 OR (?6 IS NOT NULL AND u.workshop_site IS ?6)))
      OR (u.role='driver' AND ${assigned}))))`)
    .bind(c.reporter_id ?? null, c.environment, site || null, c.vehicle_id ?? null, nowIso(), oldSite || null).all()).results;
}

export async function recipientsFor(env, c, kind, ctxData = {}) {
  const urgent = c.priority === 'kritisch' || c.reported_driveability === 'nicht_fahrbereit' || !!c.safety_lock;
  const list = [];
  const add = (rows) => { for (const r of rows) if (!list.find((x) => x.id === r.id)) list.push(r); };
  const site = c.workshop_site || c.suggested_workshop_site;
  const oldSite = kind === 'reassigned' && ctxData.previous?.workshop_site !== site ? ctxData.previous?.workshop_site : null;
  const pool = await candidateUsers(env, c, site, ['released', 'safety_lock', 'safety_lock_lifted'].includes(kind) || (kind === 'created' && !!c.safety_lock), oldSite);
  const pick = (u, extra = {}) => ({ id: u.id, language: u.language, role: u.role, ...extra });
  // Melder nur in derselben Umgebung (nach einem Umgebungswechsel kamen sonst Hinweise/Pushs aus der alten Umgebung, unsichtbar in der Liste – 17.10.2026)
  const reporter = pool.filter((u) => u.is_reporter && u.qualified).map((u) => pick(u));
  const usersByRole = (roles) => pool.filter((u) => u.qualified && roles.includes(u.role)).map((u) => pick(u));
  const workshopUsers = site ? pool.filter((u) => u.qualified && u.at_site).map((u) => pick(u)) : [];
  const assignedDrivers = () => pool.filter((u) => u.qualified && u.is_assigned && u.id !== c.reporter_id).map((u) => pick(u, { assigned: 1 }));
  switch (kind) {
    case 'created':
      add(usersByRole(['fleet', 'owner']));
      if (urgent) { add(usersByRole(['dispatch'])); add(workshopUsers); }
      if (c.safety_lock) add(assignedDrivers()); // „nicht fahren“ auch an die anderen Fahrer dieses Fahrzeugs
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
      add(usersByRole(['fleet', 'owner']));
      if (kind === 'waiting_parts') add(usersByRole(['dispatch']));
      break;
    case 'cost_limit':
      add(usersByRole(['fleet', 'owner']));
      break;
    case 'cost_approved':
      add(workshopUsers);
      break;
    case 'reassigned':
      // Werkstattwechsel (17.10.2026): neue Werkstatt bekommt „Neuer Werkstattauftrag“, die bisherige erfährt die Abgabe
      // (ohne Link – sie hat danach keinen Zugriff mehr); Melder nicht erneut (er bekam die Freigabe schon)
      add(workshopUsers.map((u) => ({ ...u, kind: 'approved' })));
      add(pool.filter((u) => u.qualified && u.at_old_site && !u.at_site).map((u) => pick(u, { kind: 'reassigned_away', away: 1 })));
      break;
    case 'released': case 'safety_lock': case 'safety_lock_lifted':
      add(reporter); add(usersByRole(['dispatch', 'fleet', 'owner'])); add(workshopUsers);
      add(assignedDrivers());
      break;
    case 'comment': {
      // Optional gezielt: payload.notify ⊆ ['reporter','fleet','workshop'] (Standard: alle Beteiligten)
      const want = Array.isArray(ctxData.payload?.notify) && ctxData.payload.notify.length ? new Set(ctxData.payload.notify) : null;
      if (!want || want.has('reporter')) add(reporter);
      if (!want || want.has('fleet')) add(usersByRole(['fleet', 'owner']));
      // Werkstatt nur mit Zugriff (abgelehnte Meldung: Vorschlags-Werkstatt sah den Vorgang nicht – Hinweis führte ins Leere)
      if ((!want || want.has('workshop')) && !['gemeldet', 'abgelehnt'].includes(c.status)) add(workshopUsers);
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
  const sql = `INSERT OR IGNORE INTO notifications(id,environment,user_id,case_id,event_key,kind,urgent,title,body,created_at,lang,ref,push_status)`;
  if (rows.length === 1) {
    const x = rows[0];
    const r = await env.DB.prepare(`${sql} VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending')`).bind(x.id, x.environment, x.user_id, x.case_id, x.event_key, x.kind, x.urgent, x.title, x.body, x.created_at, x.lang || null, x.ref || null).run();
    return r.meta && r.meta.changes === 1 ? rows : [];
  }
  const f = (k) => `json_extract(value,'$.${k}')`;
  await env.DB.prepare(`${sql} SELECT ${['id', 'environment', 'user_id', 'case_id', 'event_key', 'kind', 'urgent', 'title', 'body', 'created_at', 'lang', 'ref'].map(f).join(',')},'pending' FROM json_each(?)`)
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
    const k = u.kind || kind;
    const title = k === 'created' && urgent ? T[lang].created_urgent : T[lang][k] || k;
    // Sperrbildschirm: nur Vorgangsnummer, Kennzeichen, Priorität – keine Schadensbeschreibung
    const body = `${c.case_no} · ${vehicle?.plate || ''} · ${PRIO[lang][c.priority] || c.priority}${c.environment === 'test' ? ' · TEST' : ''}`;
    rows.push({ id: uuid(), environment: c.environment, user_id: u.id, case_id: u.assigned || u.away ? null : c.id, event_key: eventKey, kind: k, urgent: urgent ? 1 : 0, title, body, created_at: now, lang });
  }
  const created = (await insertNotifications(env, rows)).map((r) => ({ id: r.id, user_id: r.user_id, title: r.title, body: r.body, urgent, case_id: r.case_id, kind: r.kind, lang: r.lang, created_at: r.created_at }));
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
        title: urgent ? T[lang].created_urgent : T[lang].created, body: `${c.case_no} · ${plate} · ${PRIO[lang][c.priority] || c.priority}${c.environment === 'test' ? ' · TEST' : ''}`, created_at: now, lang };
      rows.push(row); meta.set(row.id, urgent);
    }
  }
  const created = (await insertNotifications(env, rows)).map((r) => ({ id: r.id, user_id: r.user_id, title: r.title, body: r.body, urgent: meta.get(r.id), case_id: r.case_id, kind: 'created', lang: r.lang, created_at: r.created_at }));
  const job = deliverPush(env, created, { collapse: true });
  if (ctx && ctx.waitUntil) ctx.waitUntil(job); else await job;
  return created.length;
}

// localize(lang) → { title?, body? } je Sprache der Person (langOf: Map Benutzer-ID → Sprache); ohne Angabe gilt title/body für alle
// ref: Bezug ohne Vorgang ('vehicle:<id>', 'fine:<id>') – Ziel beim Tippen auf Hinweis/Push
export async function notifyUsers(env, ctx, environment, userIds, { kind, title, body, eventKey, caseId = null, urgent = false, localize = null, langOf = null, ref = null }) {
  const now = nowIso();
  const langFor = (uid) => (langOf && LANGS.includes(langOf.get(uid)) ? langOf.get(uid) : 'de');
  const text = (uid) => {
    if (!localize) return { title, body };
    const x = localize(langFor(uid)) || {}; return { title: x.title ?? title, body: x.body ?? body };
  };
  // Sprache des Textes (für die Vorlesefunktion des Geräts) nur, wenn sie feststeht: übersetzt (localize) oder vom Aufrufer genannt (langOf)
  const rows = userIds.map((uid) => ({ id: uuid(), environment, user_id: uid, case_id: caseId, event_key: eventKey, kind, urgent: urgent ? 1 : 0, ...text(uid), created_at: now, lang: localize || langOf ? langFor(uid) : null, ref: NOTIF_REF.test(ref || '') ? ref : null }));
  const created = (await insertNotifications(env, rows)).map((r) => ({ id: r.id, user_id: r.user_id, title: r.title, body: r.body, urgent, case_id: caseId, kind, lang: r.lang, created_at: r.created_at, ref: r.ref }));
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
  const holdByUser = new Map(); // Person in ihrer Ruhezeit → Ende der Ruhezeit (ISO); nicht dringende Pushs warten bis dahin
  let sends = 0; const deferred = new Set();
  if (all.some((n) => !n.urgent)) {
    const nowMs = env.__nowMs || Date.now();
    for (const u of (await env.DB.prepare('SELECT id, push_muted, push_quiet_from, push_quiet_to FROM users WHERE (push_muted IS NOT NULL OR push_quiet_from IS NOT NULL) AND id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(userIds)).all()).results) {
      if (u.push_muted) mutedByUser.set(u.id, new Set(parseMuted(u.push_muted)));
      const h = quietHoldUntil(u.push_quiet_from, u.push_quiet_to, nowMs);
      if (h) holdByUser.set(u.id, h);
    }
  }
  for (const n of notifications) {
    if (!n.urgent && n.kind && mutedByUser.get(n.user_id)?.has(n.kind)) { states.push({ id: n.id, s: 'disabled', a: 0 }); continue; }
    if (!n.urgent && holdByUser.has(n.user_id)) { states.push({ id: n.id, s: 'pending', a: 0, h: holdByUser.get(n.user_id) }); continue; }
    const subs = (subsByUser.get(n.user_id) || []).filter((s) => !revoked.has(s.id));
    if (subs.length === 0) { states.push({ id: n.id, s: 'no_subscription', a: 0 }); continue; }
    if (sends + subs.length > maxSends) { deferred.add(n.id); continue; } // bleibt pending → Cron
    let accepted = false; let lastErr = null;
    for (const s of subs) {
      sends++;
      // lang: Sprache des Textes, damit das Gerät die Mitteilung richtig vorliest/trennt (fehlt bei nicht übersetzten Freitexten)
      // ein einzelnes unbrauchbares Abo (Schlüssel) darf die Zustellung an die übrigen Empfänger nicht abbrechen (17.10.2026)
      const res = await sendPush(env, s, { id: n.id, title: n.title, body: n.body, case_id: n.case_id, urgent: n.urgent, ...(n.kind ? { kind: n.kind } : {}), ...(n.ref ? { ref: n.ref } : {}), ...(LANGS.includes(n.lang) ? { lang: n.lang } : {}),
        // ts: Zeitpunkt des Ereignisses (ms) – nachgeholte Pushs (Wiederholung, Ende der Ruhezeit) zeigen am Gerät die echte Uhrzeit, nicht die Zustellzeit
        ...(Date.parse(n.created_at) ? { ts: Date.parse(n.created_at) } : {}) }, { urgent: n.urgent }).catch((e) => ({ status: 'failed', http: 0, error: String(e && e.name || 'Fehler') }));
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
    // Ruhezeit: ein dringender Träger nimmt nicht dringende Folgehinweise mit (ein Push je Person) – sie gelten damit als zugestellt
    states.push(!f.urgent && f.kind && mutedByUser.get(f.user_id)?.has(f.kind) ? { id: f.id, s: 'disabled', a: 0 } : { ...st, id: f.id });
  }
  const now = nowIso();
  const writes = [];
  if (states.length) {
    writes.push(env.DB.prepare(`UPDATE notifications SET push_status=j.s, push_attempts=push_attempts + j.a,
      push_last_error=CASE WHEN j.a=1 THEN j.e ELSE notifications.push_last_error END,
      push_accepted_at=CASE WHEN j.a=1 THEN j.t ELSE notifications.push_accepted_at END,
      push_hold_until=COALESCE(j.h, notifications.push_hold_until)
      FROM (SELECT json_extract(value,'$.id') AS id, json_extract(value,'$.s') AS s, json_extract(value,'$.a') AS a,
        json_extract(value,'$.e') AS e, json_extract(value,'$.t') AS t, json_extract(value,'$.h') AS h FROM json_each(?)) AS j WHERE notifications.id=j.id`).bind(JSON.stringify(states)));
  }
  if (okSubs.size) writes.push(env.DB.prepare('UPDATE push_subscriptions SET last_success_at=? WHERE id IN (SELECT value FROM json_each(?))').bind(now, JSON.stringify([...okSubs])));
  if (revoked.size) writes.push(env.DB.prepare('UPDATE push_subscriptions SET revoked_at=? WHERE id IN (SELECT value FROM json_each(?))').bind(now, JSON.stringify([...revoked])));
  if (writes.length) await env.DB.batch(writes);
}

// Nachträglich zugestellte Pushs (Wiederholung, Ende der Ruhezeit) in der AKTUELLEN Sprache der Person – wie die Hinweisliste
// (GET /api/notifications). Gespeichert bleibt der Text zum Zeitpunkt des Ereignisses; nur erkannte, maschinell aufgebaute Formen werden übersetzt.
export function currentLangText(r) {
  const lang = LANGS.includes(r.lang) ? r.lang : 'de';
  return { title: localizedAgentTitle({ ...r, title: localizedTitle(r, lang) }, lang), body: localizedAgentBody({ ...r, body: localizedBody(r, lang) }, lang) };
}
// Sprachangabe: aktuelle Sprache, wenn der Text (Titel oder Text) übersetzt wurde oder schon in ihr gespeichert ist; sonst die gespeicherte
// Sprache des Textes (leer bei unbekannt) – ein unübersetzbarer Freitext wird nie mit der neuen Sprache ausgezeichnet.
const forDelivery = (r) => {
  const { lang, text_lang, ...x } = r; const t = currentLangText(r);
  const cur = LANGS.includes(lang) ? lang : 'de';
  const translated = t.title !== r.title || t.body !== r.body;
  return { ...x, ...t, urgent: !!r.urgent, lang: translated || text_lang === cur ? cur : text_lang || null };
};

// Wiederholung fehlgeschlagener Pushs (Cron), max. 3 Versuche. Wegen Ruhezeit zurückgehaltene Hinweise erst nach deren Ende.
export async function retryFailedPush(env) {
  const now = env.__nowMs || Date.now();
  await releaseQuietPush(env, now);
  const rows = (await env.DB.prepare(`SELECT n.id, n.user_id, n.title, n.body, n.urgent, n.case_id, n.kind, n.ref, n.created_at, n.lang AS text_lang, u.language AS lang FROM notifications n LEFT JOIN users u ON u.id=n.user_id
    WHERE n.acknowledged_at IS NULL AND n.opened_at IS NULL AND n.hidden_at IS NULL AND (u.environment IS NULL OR u.role = 'owner' OR n.environment = u.environment) AND n.created_at > ? AND ((n.push_status='failed' AND n.push_attempts < 3) OR (n.push_status='pending' AND n.push_hold_until IS NULL AND n.created_at < ?))
    ORDER BY n.urgent DESC, n.created_at LIMIT 20`)
    // „pending“ älter als 5 Min.: verschoben (Grenze je Aufruf) oder Zustellung abgebrochen (z. B. Zeitlimit) – wird jetzt nachgeholt
    .bind(new Date(now - 24 * 3600 * 1000).toISOString(), new Date(now - 5 * 60000).toISOString()).all()).results;
  await deliverPush(env, rows.map(forDelivery));
  return rows.length;
}

// Ende der Ruhezeit: zurückgehaltene, noch nicht geöffnete/quittierte Hinweise der letzten 24 Std. gesammelt zustellen
// (ein Push je Person mit „· +N“). Bereits in der App geöffnete Hinweise brauchen keinen Push mehr und bleiben „pending“ (Anzeige „zurückgehalten“).
export async function releaseQuietPush(env, now = env.__nowMs || Date.now()) {
  const rows = (await env.DB.prepare(`SELECT n.id, n.user_id, n.title, n.body, n.urgent, n.case_id, n.kind, n.ref, n.created_at, n.lang AS text_lang, u.language AS lang FROM notifications n LEFT JOIN users u ON u.id=n.user_id
    WHERE n.push_status='pending' AND n.push_hold_until IS NOT NULL AND n.push_hold_until <= ? AND n.acknowledged_at IS NULL AND n.opened_at IS NULL AND n.hidden_at IS NULL AND n.created_at > ?
    ORDER BY n.created_at LIMIT 200`).bind(new Date(now).toISOString(), new Date(now - 24 * 3600 * 1000).toISOString()).all()).results;
  if (rows.length) await deliverPush(env, rows.map(forDelivery), { collapse: true });
  return rows.length;
}
