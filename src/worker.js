// [CLAUDE] Cevik Fuhrpark – Worker-Einstieg: Router, Sicherheit, Selbstmigration, Cron
import { json, errorResponse, readJson, HttpError, forbidden, notFound, nowIso, str, timingSafeEqual, uuid, rateLimit, berlinDateTime } from './util.js';
import * as auth from './auth.js';
import * as cases from './cases.js';
import * as veh from './vehicles.js';
import { runFleetAgent, masterPanel, decideMasterItem } from './agent.js';
import { getVapid } from './push.js';
import { retryFailedPush, notifyUsers, MUTABLE_KINDS, parseMuted } from './notify.js';
import { MIGRATIONS } from './schema.js';
import { integrationRouter } from './integration.js';
import * as tires from './tires.js';
import * as stock from './stock.js';
import * as fines from './fines.js';
import * as reports from './reports.js';
import { exportBackup } from './backup.js';
import * as maint from './maintenance.js';
import { recordUsage, usageReport } from './usage.js';
import { dataQuality } from './quality.js';
import * as telem from './telematics.js';

// Angemeldete API-Aufrufe für die Nutzungsstatistik (nur Umgebung, keine Person)
const usageEnv = new WeakMap();
const usageAction = new WeakMap(); // Befehlsname bei …/commands (z. B. receive, add_part) – keine Inhalte

const migratedDbs = new WeakSet();
export async function ensureSchema(env) {
  if (migratedDbs.has(env.DB)) return;
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)').run();
  const done = new Set((await env.DB.prepare('SELECT id FROM _migrations').all()).results.map((r) => r.id));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await env.DB.batch([
      ...m.statements.map((s) => env.DB.prepare(s)),
      env.DB.prepare('INSERT INTO _migrations(id, applied_at) VALUES (?, ?)').bind(m.id, nowIso()),
    ]);
  }
  migratedDbs.add(env.DB);
}

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'geolocation=(), microphone=()',
  'strict-transport-security': 'max-age=31536000',
};

function withHeaders(res, extra = {}) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries({ ...SECURITY_HEADERS, ...extra })) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

// Schutz gegen CSRF: schreibende API-Aufrufe brauchen eigenen Header und gleiche Herkunft
function checkCsrf(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  if (request.headers.get('x-cfp') !== '1') throw forbidden('Ungültige Anfrage (CSRF-Schutz).');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw forbidden('Ungültige Herkunft.');
}

function requireRole(user, roles) {
  if (!roles.includes(user.role)) throw forbidden();
}

const SETTINGS_KEYS = [
  'workshop_hourly_rate_net', 'maintenance_warn_days', 'maintenance_warn_km', 'tire_warn_tread_mm', 'fine_warn_days',
  ...['test', 'production'].flatMap((e) => ['triage', 'ack'].flatMap((k) => ['niedrig', 'mittel', 'kritisch'].map((p) => `sla_${e}_${k}_${p}_min`))),
];

async function handleApi(request, env, ctx, url) {
  let path = url.pathname;
  try { path = decodeURIComponent(url.pathname); } catch { throw new HttpError(400, "bad_path", "Ungültiger Pfad."); }
  const m = request.method;
  checkCsrf(request);

  if (path === '/api/health') return json({ ok: true, time: nowIso() });

  // ---- Integration (Unternehmensbetriebssystem, n8n) per Bearer-Token ----
  if (path.startsWith('/api/integration/')) return integrationRouter(request, env, ctx, url);

  // ---- Öffentlich: Einrichtung, Einladung, Login ----
  if (path === '/api/setup/status' && m === 'GET') {
    const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM users').first()).n;
    return json({ needs_setup: n === 0, setup_code_configured: !!env.SETUP_CODE });
  }
  if (path === '/api/setup' && m === 'POST') return json(await auth.setupFirstOwner(env, await readJson(request)));
  if (path.startsWith('/api/invite/') && m === 'GET') {
    const { row } = await auth.inviteInfo(env, decodeURIComponent(path.split('/')[3]));
    return json({ username: row.username, display_name: row.display_name, role: row.role, environment: row.environment });
  }
  if (path === '/api/invite/accept' && m === 'POST') {
    const r = await auth.acceptInvite(env, request, await readJson(request));
    return json({ user: r.user }, 200, { 'set-cookie': r.cookie });
  }
  if (path === '/api/login' && m === 'POST') {
    const r = await auth.login(env, request, await readJson(request));
    return json({ user: r.user }, 200, { 'set-cookie': r.cookie });
  }

  // ---- Ab hier: angemeldet ----
  const user = await auth.getSessionUser(env, request);
  if (!user) throw new HttpError(401, 'unauthenticated', 'Bitte anmelden.');
  const envName = auth.effectiveEnv(user, request);
  usageEnv.set(request, envName);
  const { _session, ...me } = user;

  if (path === '/api/logout' && m === 'POST') return json({ ok: true }, 200, { 'set-cookie': await auth.logout(env, user) });
  if (path === '/api/me' && m === 'GET') {
    const row = await env.DB.prepare('SELECT language FROM users WHERE id=?').bind(user.id).first();
    return json({ user: { ...me, language: row.language }, active_environment: envName });
  }
  if (path === '/api/me' && m === 'PATCH') {
    const b = await readJson(request);
    if (b.language && ['de', 'uk', 'en'].includes(b.language)) await env.DB.prepare('UPDATE users SET language=?, updated_at=? WHERE id=?').bind(b.language, nowIso(), user.id).run();
    return json({ ok: true });
  }
  if (path === '/api/me/notify-prefs' && m === 'GET') {
    const row = await env.DB.prepare('SELECT push_muted FROM users WHERE id=?').bind(user.id).first();
    return json({ kinds: MUTABLE_KINDS, muted: parseMuted(row && row.push_muted) });
  }
  if (path === '/api/me/notify-prefs' && m === 'PUT') {
    const b = await readJson(request);
    const muted = Array.isArray(b.muted) ? [...new Set(b.muted.filter((k) => MUTABLE_KINDS.includes(k)))] : [];
    await env.DB.prepare('UPDATE users SET push_muted=?, updated_at=? WHERE id=?').bind(muted.length ? JSON.stringify(muted) : null, nowIso(), user.id).run();
    return json({ kinds: MUTABLE_KINDS, muted });
  }
  if (path === '/api/me/vehicles' && m === 'GET') return json(await veh.myVehicles(env, user, envName));
  if (path === '/api/me/sessions' && m === 'GET') return json({ sessions: await auth.listOwnSessions(env, user) });
  if (path === '/api/me/sessions/revoke-others' && m === 'POST') return json(await auth.revokeOtherSessions(env, user));
  const sm = path.match(/^\/api\/me\/sessions\/([0-9a-f]{16})$/);
  if (sm && m === 'DELETE') return json(await auth.revokeOwnSession(env, user, sm[1]));
  if (path === '/api/me/password' && m === 'POST') return json(await auth.changePassword(env, user, await readJson(request)));

  if (path === '/api/meta' && m === 'GET') {
    const workshops = (await env.DB.prepare('SELECT code, name FROM workshops WHERE active=1').all()).results;
    let vapid = null;
    try { vapid = (await getVapid(env)).publicKey; } catch {}
    return json({ workshops, checklist: cases.CHECKLIST, checklist_version: cases.CHECKLIST_VERSION, priorities: cases.PRIORITIES,
      driveability: cases.DRIVEABILITY, statuses: cases.STATUSES, maintenance_kinds: veh.MAINT_KINDS, doc_kinds: veh.DOC_KINDS, tire_positions: tires.POSITIONS, tire_axles: tires.AXLES, tire_events: tires.TIRE_EVENTS, legal_min_tread_mm: tires.LEGAL_MIN_TREAD_MM, fine_kinds: fines.FINE_KINDS, fine_offenses: fines.OFFENSES, fine_statuses: fines.FINE_STATUSES, vapid_public_key: vapid, app_name: env.APP_NAME });
  }

  // Benutzer
  if (path === '/api/users' && m === 'GET') return json({ users: await auth.listUsers(env, user) });
  if (path === '/api/users' && m === 'POST') return json(await auth.createUser(env, user, await readJson(request)), 201);
  let mm;
  if ((mm = path.match(/^\/api\/users\/([\w-]+)$/)) && m === 'PATCH') return json(await auth.updateUser(env, user, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/users\/([\w-]+)\/invite$/)) && m === 'POST') return json(await auth.resetInvite(env, user, mm[1]));

  // Fahrzeuge
  if (path === '/api/vehicles' && m === 'GET') return json({ vehicles: await veh.listVehicles(env, user, envName, Object.fromEntries(url.searchParams)) });
  if (path === '/api/vehicles' && m === 'POST') return json(await veh.upsertVehicle(env, user, await readJson(request)), 201);
  if (path === '/api/vehicles/import' && m === 'POST') {
    await rateLimit(env, 'import', user.id);
    const text = await request.text();
    if (text.length > 500000) throw new HttpError(413, 'too_large', 'Datei zu groß.');
    return json(await veh.importVehiclesCsv(env, user, text));
  }
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)$/)) && m === 'GET') return json(await veh.vehicleDetail(env, user, envName, mm[1]));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/timeline$/)) && m === 'GET') return json(await veh.vehicleTimeline(env, user, envName, mm[1], Object.fromEntries(url.searchParams)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/evaluation$/)) && m === 'POST') return json(await veh.setVehicleEvaluation(env, user, envName, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/active$/)) && m === 'POST') return json(await veh.setVehicleActive(env, user, envName, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/documents$/)) && m === 'POST') { await rateLimit(env, 'upload', user.id); return json(await veh.uploadVehicleDocument(env, user, envName, mm[1], request, Object.fromEntries(url.searchParams)), 201); }
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/drivers$/)) && m === 'POST') return json(await veh.assignDriver(env, user, envName, mm[1], await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/assignments\/([\w-]+)$/)) && m === 'DELETE') return json(await veh.endAssignment(env, user, envName, mm[1]));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/maintenance$/)) && m === 'POST') return json(await veh.addMaintenanceRule(env, user, mm[1], await readJson(request)), 201);
  if (path === '/api/maintenance' && m === 'GET') {
    const ov = await maint.maintenanceOverview(env, user);
    if (url.searchParams.get('format') === 'ics') {
      await auth.audit(env, user.id, 'maintenance.export_ics', null, { rows: ov.rows.length });
      return new Response(maint.maintenanceIcs(ov), { headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-prueftermine_${ov.today}.ics"` } });
    }
    if (url.searchParams.get('format') === 'csv') {
      await auth.audit(env, user.id, 'maintenance.export', null, { rows: ov.rows.length, gaps: ov.gaps.length });
      return new Response(maint.maintenanceCsv(ov), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-prueftermine_${ov.today}.csv"` } });
    }
    return json(ov);
  }
  if (path === '/api/maintenance/import' && m === 'POST') {
    await rateLimit(env, 'import', user.id);
    const text = await request.text();
    if (text.length > 500000) throw new HttpError(413, 'too_large', 'Datei zu groß.');
    return json(await maint.importMaintenanceCsv(env, user, text, { dryRun: url.searchParams.get('dry_run') === '1' }));
  }
  if ((mm = path.match(/^\/api\/maintenance\/([\w-]+)\/complete$/)) && m === 'POST') return json(await veh.completeMaintenance(env, user, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/odometer$/)) && m === 'POST') return json(await veh.addOdometer(env, user, mm[1], await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/ai$/)) && m === 'POST') return json(await veh.aiAnalysis(env, user, envName, mm[1]));

  // Reifen
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/tires$/)) && m === 'GET') return json(await tires.tireOverview(env, user, envName, mm[1]));
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/tires\/events$/)) && m === 'POST') return json(await tires.addTireEvent(env, user, envName, mm[1], await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/vehicles\/(VIN:[A-Z0-9]+)\/tires\/specs$/)) && m === 'POST') return json(await tires.setTireSpec(env, user, mm[1], await readJson(request)));
  if (path === '/api/tires/fleet' && m === 'GET') return json(await tires.fleetTires(env, user, envName, Object.fromEntries(url.searchParams)));
  if (path === '/api/tires/import' && m === 'POST') {
    await rateLimit(env, 'import', user.id);
    const text = await request.text();
    if (text.length > 500000) throw new HttpError(413, 'too_large', 'Datei zu groß.');
    return json(await tires.importTireSpecs(env, user, text));
  }

  if (path === '/api/telematics' && m === 'GET') return json(await telem.telematicsOverview(env, user));
  if (path === '/api/telematics/mappings' && m === 'POST') return json(await telem.confirmMapping(env, user, await readJson(request)), 201);
  if (path === '/api/telematics/mappings' && m === 'DELETE') return json(await telem.removeMapping(env, user, Object.fromEntries(url.searchParams)));
  if (path === '/api/admin/data-quality' && m === 'GET') return json(await dataQuality(env, user, envName, Object.fromEntries(url.searchParams)));
  if (path === '/api/admin/usage' && m === 'GET') return json(await usageReport(env, user, envName, Object.fromEntries(url.searchParams)));
  if (path === '/api/admin/audit' && m === 'GET') return json({ entries: await auth.listAudit(env, user, Object.fromEntries(url.searchParams)) });

  // Datensicherung (Inhaber)
  if (path === '/api/admin/backup' && m === 'GET') {
    const b = await exportBackup(env, user);
    return new Response(JSON.stringify(b), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-sicherung_${b.created_at.slice(0, 10)}.json"` } });
  }

  // Kostenbericht je Fahrzeug/Monat
  if (path === '/api/reports/costs' && m === 'GET') {
    const rep = await reports.costReport(env, user, envName, Object.fromEntries(url.searchParams));
    if (url.searchParams.get('format') === 'csv') {
      await auth.audit(env, user.id, 'reports.costs.export', null, { from: rep.from, to: rep.to, environment: envName });
      return new Response(reports.costReportCsv(rep), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-kosten_${envName}_${rep.from}_${rep.to}.csv"` } });
    }
    return json(rep);
  }

  if (path === '/api/reports/workshop-load' && m === 'GET') return json(await reports.workshopLoad(env, user, envName, Object.fromEntries(url.searchParams)));
  if (path === '/api/reports/kpi' && m === 'GET') return json(await reports.kpiReport(env, user, envName, Object.fromEntries(url.searchParams)));

  // Ersatzteillager
  if (path === '/api/stock' && m === 'GET') return json({ items: await stock.listStock(env, user, envName, Object.fromEntries(url.searchParams)) });
  if (path === '/api/stock' && m === 'POST') return json(await stock.createItem(env, user, envName, await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/stock\/([\w-]+)$/)) && m === 'GET') return json(await stock.itemDetail(env, user, envName, mm[1]));
  if ((mm = path.match(/^\/api\/stock\/([\w-]+)$/)) && m === 'PATCH') return json(await stock.updateItem(env, user, envName, mm[1], await readJson(request)));
  if ((mm = path.match(/^\/api\/stock\/([\w-]+)\/movements$/)) && m === 'POST') return json(await stock.addMovement(env, user, envName, mm[1], await readJson(request)), 201);

  // Bußgelder & Zeugenfragebögen
  if (path === '/api/fines' && m === 'GET') return json({ fines: await fines.listFines(env, user, envName, Object.fromEntries(url.searchParams)) });
  if (path === '/api/fines' && m === 'POST') return json(await fines.createFine(env, user, envName, await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/fines\/([\w-]+)$/)) && m === 'GET') return json(await fines.fineDetail(env, user, envName, mm[1]));
  if ((mm = path.match(/^\/api\/fines\/([\w-]+)\/commands$/)) && m === 'POST') { const b = await readJson(request); usageAction.set(request, b && b.action); return json(await fines.fineCommand(env, ctx, user, envName, mm[1], b)); }
  if ((mm = path.match(/^\/api\/fines\/([\w-]+)\/files$/)) && m === 'POST') { await rateLimit(env, 'upload', user.id); return json(await fines.uploadFineFile(env, user, envName, mm[1], request), 201); }

  // Vorgänge
  if (path === '/api/cases' && m === 'GET') {
    const q = Object.fromEntries(url.searchParams);
    if (q.format === 'csv') {
      if (user.role === 'driver') throw forbidden();
      const rows = await cases.listCases(env, user, envName, { ...q, limit: 5000, __export: true });
      await auth.audit(env, user.id, 'reports.cases.export', null, { status: q.status || null, q: q.q ? '(Suche)' : null, rows: rows.length, environment: envName });
      const fmt = (iso) => (iso ? berlinDateTime(iso) : '');
      return new Response(cases.casesCsv(rows, maint.csvCell, fmt), { headers: { 'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="fuhrpark-vorgaenge_${envName}_${new Date().toISOString().slice(0, 10)}.csv"` } });
    }
    return json({ cases: await cases.listCases(env, user, envName, q) });
  }
  if (path === '/api/cases' && m === 'POST') return json(await cases.createCase(env, ctx, user, envName, await readJson(request)), 201);
  if ((mm = path.match(/^\/api\/cases\/([\w-]+)$/)) && m === 'GET') return json(await cases.getCaseDetail(env, user, envName, mm[1]));
  if ((mm = path.match(/^\/api\/cases\/([\w-]+)\/commands$/)) && m === 'POST') { const b = await readJson(request); usageAction.set(request, b && b.action); return json(await cases.runCommand(env, ctx, user, envName, mm[1], b)); }
  if ((mm = path.match(/^\/api\/cases\/([\w-]+)\/files$/)) && m === 'POST') { await rateLimit(env, 'upload', user.id); return json(await cases.uploadFile(env, user, envName, mm[1], request), 201); }
  if ((mm = path.match(/^\/api\/files\/([\w-]+)$/)) && m === 'GET') return cases.downloadFile(env, user, envName, mm[1]);
  if (path === '/api/inspections' && m === 'POST') return json(await cases.submitInspection(env, ctx, user, envName, await readJson(request)), 201);

  // Benachrichtigungen & Push
  if (path === '/api/notifications' && m === 'GET') {
    const rows = (await env.DB.prepare(`SELECT id, case_id, kind, urgent, title, body, created_at, push_status, device_received_at, opened_at, acknowledged_at
      FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100`).bind(user.id).all()).results;
    return json({ notifications: rows, unread: rows.filter((r) => !r.opened_at && !r.acknowledged_at).length });
  }
  if ((mm = path.match(/^\/api\/notifications\/([\w-]+)\/(received|opened|ack)$/)) && m === 'POST') {
    const col = { received: 'device_received_at', opened: 'opened_at', ack: 'acknowledged_at' }[mm[2]];
    const now = nowIso();
    const extra = mm[2] === 'ack' ? ', opened_at=COALESCE(opened_at, ?)' : '';
    const st = env.DB.prepare(`UPDATE notifications SET ${col}=COALESCE(${col}, ?)${extra} WHERE id=? AND user_id=?`);
    await (mm[2] === 'ack' ? st.bind(now, now, mm[1], user.id) : st.bind(now, mm[1], user.id)).run();
    return json({ ok: true });
  }
  if (path === '/api/notifications/read-all' && m === 'POST') {
    await env.DB.prepare('UPDATE notifications SET opened_at=COALESCE(opened_at, ?) WHERE user_id=?').bind(nowIso(), user.id).run();
    return json({ ok: true });
  }
  if (path === '/api/push/subscribe' && m === 'POST') {
    const b = await readJson(request);
    const endpoint = str(b.endpoint, { required: true, max: 1000, field: 'endpoint' });
    if (!/^https:\/\//.test(endpoint)) throw new HttpError(400, 'validation', 'Ungültiger Push-Endpunkt.');
    const p256dh = str(b.keys?.p256dh, { required: true, max: 200 });
    const authKey = str(b.keys?.auth, { required: true, max: 100 });
    const now = nowIso();
    await env.DB.prepare(`INSERT INTO push_subscriptions(id,user_id,endpoint,p256dh,auth,device_label,created_at) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, p256dh=excluded.p256dh, auth=excluded.auth, device_label=excluded.device_label, revoked_at=NULL`)
      .bind(uuid(), user.id, endpoint, p256dh, authKey, str(b.device_label, { max: 80 }), now).run();
    return json({ ok: true });
  }
  if (path === '/api/push/unsubscribe' && m === 'POST') {
    const b = await readJson(request);
    await env.DB.prepare('UPDATE push_subscriptions SET revoked_at=? WHERE endpoint=? AND user_id=?').bind(nowIso(), String(b.endpoint || ''), user.id).run();
    return json({ ok: true });
  }
  if (path === '/api/push/devices' && m === 'GET') {
    return json({ devices: (await env.DB.prepare('SELECT id, device_label, created_at, last_success_at FROM push_subscriptions WHERE user_id=? AND revoked_at IS NULL').bind(user.id).all()).results });
  }
  if (path === '/api/push/test' && m === 'POST') {
    const n = await notifyUsers(env, null, envName, [user.id], { kind: 'test', title: 'Testbenachrichtigung', body: 'Push funktioniert auf diesem Gerät.', eventKey: `test:${user.id}:${Date.now()}` });
    const row = await env.DB.prepare('SELECT push_status, push_last_error FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 1').bind(user.id).first();
    return json({ created: n, push_status: row?.push_status, error: row?.push_last_error });
  }

  // Dashboard / Management / Agent
  if (path === '/api/dashboard' && m === 'GET') return json(await dashboard(env, user, envName));
  if (path === '/api/master' && m === 'GET') { requireRole(user, ['owner', 'fleet']); return json(await masterPanel(env, envName)); }
  if ((mm = path.match(/^\/api\/master\/([a-f0-9]{64})\/decision$/)) && m === 'POST') {
    requireRole(user, ['owner', 'fleet']);
    return json(await decideMasterItem(env, user, envName, mm[1], await readJson(request)));
  }
  if (path === '/api/agent/run' && m === 'POST') { requireRole(user, ['owner', 'fleet']); return json(await runFleetAgent(env, ctx, envName, `manuell:${user.username}`)); }

  // Einstellungen (nur Inhaber)
  if (path === '/api/settings' && m === 'GET') {
    requireRole(user, ['owner']);
    const rows = (await env.DB.prepare(`SELECT key, value FROM settings WHERE key IN (${SETTINGS_KEYS.map(() => '?').join(',')})`).bind(...SETTINGS_KEYS).all()).results;
    return json({ keys: SETTINGS_KEYS, values: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
  }
  if (path === '/api/settings' && m === 'PUT') {
    requireRole(user, ['owner']);
    const b = await readJson(request);
    for (const [k, v] of Object.entries(b)) {
      if (!SETTINGS_KEYS.includes(k)) continue;
      const val = v === null || v === '' ? '' : String(Number(v));
      if (val !== '' && !Number.isFinite(Number(val))) continue;
      await env.DB.prepare(`INSERT INTO settings(key,value,updated_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_by=excluded.updated_by, updated_at=excluded.updated_at`)
        .bind(k, val, user.id, nowIso()).run();
    }
    await auth.audit(env, user.id, 'settings.update', null, b);
    return json({ ok: true });
  }

  throw notFound('Unbekannter API-Pfad.');
}

async function dashboard(env, user, envName) {
  const open = await cases.listCases(env, user, envName, { status: 'open', limit: 200 });
  const out = {
    environment: envName,
    open_cases: open.length,
    critical: open.filter((c) => c.priority === 'kritisch').length,
    locked: open.filter((c) => c.safety_lock).length,
    by_status: open.reduce((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {}),
  };
  if (user.role === 'workshop') {
    out.inbox = open.filter((c) => c.access === 'full' && c.status === 'werkstatt_freigegeben' && !c.workshop_ack_at).length;
    out.in_progress = open.filter((c) => c.access === 'full' && ['in_reparatur', 'wartet_teile'].includes(c.status)).length;
    out.preview = open.filter((c) => c.access === 'preview').length;
  }
  if (['owner', 'fleet', 'dispatch'].includes(user.role)) {
    const vs = await veh.listVehicles(env, user, envName);
    out.vehicles = { total: vs.length, gesperrt: vs.filter((v) => v.availability === 'gesperrt').length, werkstatt: vs.filter((v) => v.availability === 'werkstatt').length,
      meldung_offen: vs.filter((v) => v.availability === 'meldung_offen').length, einsatzbereit: vs.filter((v) => v.availability === 'einsatzbereit_lt_system').length };
  }
  if (['owner', 'fleet'].includes(user.role)) {
    out.findings = (await env.DB.prepare(`SELECT severity, COUNT(*) AS n FROM agent_findings WHERE environment=? AND status='offen' GROUP BY severity`).bind(envName).all()).results;
  }
  return out;
}

const CRON_TEST = '7,37 * * * *';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      await ensureSchema(env);
      if (url.pathname === '/healthz') return withHeaders(json({ ok: true }));
      if (url.pathname.startsWith('/api/')) {
        let res;
        try { res = await handleApi(request, env, ctx, url); } catch (e) { res = errorResponse(e); }
        if (usageEnv.has(request)) recordUsage(env, ctx, usageEnv.get(request), request.method, url.pathname, res.status, usageAction.get(request));
        return withHeaders(res);
      }
      if (env.ASSETS) return withHeaders(await env.ASSETS.fetch(request), { 'content-security-policy': "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'" });
      return withHeaders(json({ error: 'not_found' }, 404));
    } catch (e) {
      return withHeaders(errorResponse(e));
    }
  },
  async scheduled(event, env, ctx) {
    await ensureSchema(env);
    // Abfragebudget je Aufruf: Betrieb und Test laufen in getrennten Cron-Aufrufen (siehe wrangler.toml)
    const testRun = event && event.cron === CRON_TEST;
    try { await runFleetAgent(env, ctx, testRun ? 'test' : 'production', 'cron'); } catch (err) { console.error('Agent', err); }
    if (!testRun) {
      try { await retryFailedPush(env); } catch (err) { console.error('Push-Retry', err); }
    } else {
      await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(nowIso()).run();
    }
  },
};
