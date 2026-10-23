// [CLAUDE] Einrichtungsstand (22.10.2026, eigene Verbesserung): Was ist vor bzw. im Betrieb noch offen? Nur Inhaber, nur lesend.
// Jeder Punkt kommt aus vorhandenen Daten/Einstellungen – die App gibt keine Werte vor und ändert nichts. Status:
//   ok   = eingerichtet
//   open = empfohlen, noch nicht eingerichtet (Entscheidung/Aufgabe des Inhabers)
//   info = nur Hinweis (bewusst freiwillig oder nicht prüfbar)
// Eine Abfrage (Abfragebudget), keine Namen außer denen der Leitungskonten ohne Zwei-Faktor (der Inhaber verwaltet sie ohnehin).
import { HttpError, nowIso } from './util.js';

export async function readiness(env, user) {
  if (user.role !== 'owner') throw new HttpError(403, 'forbidden', 'Nur der Inhaber sieht den Einrichtungsstand.');
  const now = nowIso();
  const r = await env.DB.prepare(`SELECT
      (SELECT json_group_array(json_object('name', display_name, 'role', role)) FROM users WHERE active=1 AND environment='production' AND role IN ('owner','fleet') AND totp_enabled_at IS NULL) AS no2fa,
      (SELECT COUNT(*) FROM push_subscriptions WHERE user_id=?1 AND revoked_at IS NULL) AS own_push,
      (SELECT COUNT(*) FROM emergency_contacts WHERE environment='production' AND archived_at IS NULL) AS em_prod,
      (SELECT value FROM settings WHERE key='idle_logout_workshop_min') AS idle_ws,
      (SELECT value FROM settings WHERE key='test_master_readonly') AS test_ro,
      (SELECT value FROM settings WHERE key='workshop_hourly_rate_net') AS rate,
      (SELECT value FROM settings WHERE key='license_check_months') AS lic_months,
      (SELECT value FROM settings WHERE key='repair_cost_limit_net') AS cost_limit,
      (SELECT MAX(created_at) FROM audit_log WHERE action='backup.export') AS backup_at,
      (SELECT json_object('started_at', started_at, 'finished_at', finished_at, 'error', error IS NOT NULL) FROM agent_runs WHERE environment='production' ORDER BY started_at DESC LIMIT 1) AS agent,
      (SELECT json_group_object(role, n) FROM (SELECT role, COUNT(*) AS n FROM users WHERE active=1 AND environment='production' AND password_hash IS NOT NULL GROUP BY role)) AS prod_roles,
      (SELECT COUNT(*) FROM users u WHERE u.active=1 AND u.password_hash IS NULL AND EXISTS (SELECT 1 FROM invites i WHERE i.user_id=u.id AND i.used_at IS NULL AND i.expires_at > ?2)) AS open_invites,
      (SELECT COUNT(*) FROM users WHERE active=1 AND environment='test') AS test_accounts,
      (SELECT COUNT(*) FROM vehicles WHERE active=1 AND eval_excluded=0) AS vehicles`).bind(user.id, now).first();
  const parse = (x, d) => { try { return x ? JSON.parse(x) : d; } catch { return d; } };
  const set = (v) => v !== null && v !== undefined && String(v).trim() !== '';
  const no2fa = parse(r.no2fa, []);
  const agent = parse(r.agent, null);
  const nowMs = Date.parse(now);
  const agentOk = !!agent && !agent.error && (agent.finished_at ? nowMs - Date.parse(agent.finished_at) <= 75 * 60000 : nowMs - Date.parse(agent.started_at) <= 10 * 60000);
  const roles = parse(r.prod_roles, {});
  const backupDays = r.backup_at ? Math.floor((nowMs - Date.parse(r.backup_at)) / 86400000) : null;
  // Einstellungs-Links mit Abschnitt (`?s=`): die App springt zum Feld statt an den Anfang der langen Seite (23.10.2026, Inhaber am Handy)
  const items = [
    { key: 'agent', state: agentOk ? 'ok' : 'open', last: agent ? agent.finished_at || agent.started_at : null, link: '#/master' },
    { key: 'vehicles', state: r.vehicles ? 'ok' : 'open', n: r.vehicles, link: r.vehicles ? '#/vehicles' : '#/settings?s=import' },
    { key: 'emergency', state: r.em_prod ? 'ok' : 'open', n: r.em_prod, link: '#/emergency/edit' },
    { key: 'two_factor', state: no2fa.length ? 'open' : 'ok', n: no2fa.length, names: no2fa.slice(0, 8), link: '#/users' },
    { key: 'own_push', state: r.own_push ? 'ok' : 'open', n: r.own_push, link: '#/inbox' },
    { key: 'idle_workshop', state: set(r.idle_ws) ? 'ok' : 'open', value: set(r.idle_ws) ? Number(r.idle_ws) : null, link: '#/settings?s=idle_workshop' },
    { key: 'test_readonly', state: r.test_ro === '1' ? 'ok' : 'open', link: '#/settings?s=test_readonly' },
    { key: 'hourly_rate', state: set(r.rate) ? 'ok' : 'open', link: '#/settings?s=hourly_rate' },
    { key: 'license_interval', state: set(r.lic_months) ? 'ok' : 'open', link: '#/settings?s=license_interval' },
    { key: 'cost_limit', state: set(r.cost_limit) && Number(r.cost_limit) > 0 ? 'ok' : 'info', link: '#/settings?s=cost_limit' },
    { key: 'backup', state: backupDays !== null && backupDays <= 31 ? 'ok' : 'open', last: r.backup_at || null, days: backupDays, link: '#/settings?s=backup' },
    { key: 'prod_accounts', state: 'info', roles, open_invites: r.open_invites, test_accounts: r.test_accounts, link: '#/users' },
    { key: 'integration', state: env.INTEGRATION_TOKEN ? 'ok' : 'info', link: '#/help' },
  ];
  return { generated_at: now, items, open: items.filter((x) => x.state === 'open').length };
}
