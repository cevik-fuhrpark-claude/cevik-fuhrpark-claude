// [CLAUDE] Datenqualität (Einführungsphase): prüft Stammdaten und Zuordnungen auf Lücken und Widersprüche.
// Nur Befunde aus gespeicherten Daten – es wird nichts geändert und nichts ergänzt.
import { forbidden, nowIso } from './util.js';
import { REQUIRED_KINDS, REQUIRED_KINDS_TRAILER } from './maintenance.js';

const normPlate = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');
// Schweregrad: fehler = widersprüchlich, luecke = fehlt für Auswertungen, hinweis = sollte gepflegt werden
export const CHECKS = {
  duplicate_plate: 'fehler', trailer_unknown: 'fehler', trailer_multi: 'fehler', assignment_inactive_user: 'fehler',
  missing_site: 'luecke', no_km: 'luecke', km_stale: 'hinweis', missing_inspection: 'luecke',
  missing_manufacturer: 'hinweis', missing_build_year: 'hinweis', invite_pending: 'hinweis', trailer_without_truck: 'hinweis',
};

export async function dataQuality(env, user, envName, query = {}) {
  if (!['owner', 'fleet'].includes(user.role)) throw forbidden();
  const staleDays = Math.min(Math.max(Number(query.stale_days) || 90, 7), 730);
  const staleBefore = new Date(Date.now() - staleDays * 86400000).toISOString();
  const [veh, kms, rules, assigns, invites] = await Promise.all([
    env.DB.prepare('SELECT id, plate, kind, site, manufacturer, build_year, trailer_plate FROM vehicles WHERE active=1 AND eval_excluded=0').all(),
    env.DB.prepare('SELECT vehicle_id, MAX(measured_at) AS last FROM odometer_readings GROUP BY vehicle_id').all(),
    env.DB.prepare('SELECT DISTINCT vehicle_id, kind FROM maintenance_rules WHERE next_due_date IS NOT NULL').all(),
    env.DB.prepare(`SELECT d.id, d.vehicle_id, v.plate, u.display_name, u.active FROM driver_vehicles d JOIN users u ON u.id=d.user_id JOIN vehicles v ON v.id=d.vehicle_id
      WHERE u.environment=? AND (d.valid_to IS NULL OR d.valid_to > ?)`).bind(envName, nowIso()).all(),
    env.DB.prepare(`SELECT u.id, u.display_name, u.role, MAX(i.expires_at) AS expires_at FROM users u JOIN invites i ON i.user_id=u.id
      WHERE u.environment=? AND u.active=1 AND u.password_hash IS NULL GROUP BY u.id`).bind(envName).all(),
  ]);
  const vs = veh.results;
  const items = [];
  const add = (check, v, detail = null) => items.push({ check, severity: CHECKS[check], vehicle_id: v && v.id || null, plate: v && v.plate || null, detail });
  const byPlate = new Map();
  for (const v of vs) { const k = normPlate(v.plate); byPlate.set(k, [...(byPlate.get(k) || []), v]); }
  for (const [, list] of byPlate) if (list.length > 1) for (const v of list) add('duplicate_plate', v, list.filter((x) => x !== v).map((x) => x.id).join(', '));
  const lastKm = new Map(kms.results.map((r) => [r.vehicle_id, r.last]));
  const hasRule = new Set(rules.results.map((r) => `${r.vehicle_id}|${r.kind}`));
  const pulledBy = new Map();
  for (const v of vs) {
    if (!v.site) add('missing_site', v);
    if (!v.manufacturer) add('missing_manufacturer', v);
    if (!v.build_year && v.kind === 'lkw') add('missing_build_year', v);
    if (v.kind === 'lkw') {
      const km = lastKm.get(v.id);
      if (!km) add('no_km', v); else if (km < staleBefore) add('km_stale', v, km.slice(0, 10));
      if (v.trailer_plate) {
        const t = (byPlate.get(normPlate(v.trailer_plate)) || []).find((x) => x.kind === 'anhaenger');
        if (!t) add('trailer_unknown', v, v.trailer_plate);
        else pulledBy.set(t.id, [...(pulledBy.get(t.id) || []), v.plate]);
      }
    }
    const required = v.kind === 'anhaenger' ? REQUIRED_KINDS_TRAILER : REQUIRED_KINDS;
    const missing = required.filter((k) => !hasRule.has(`${v.id}|${k}`));
    if (missing.length) add('missing_inspection', v, missing.join(', '));
  }
  for (const v of vs.filter((x) => x.kind === 'anhaenger')) {
    const trucks = pulledBy.get(v.id) || [];
    if (trucks.length > 1) add('trailer_multi', v, trucks.join(', '));
    if (!trucks.length) add('trailer_without_truck', v);
  }
  for (const a of assigns.results) if (!a.active) items.push({ check: 'assignment_inactive_user', severity: CHECKS.assignment_inactive_user, vehicle_id: a.vehicle_id, plate: a.plate, detail: a.display_name });
  for (const u of invites.results) items.push({ check: 'invite_pending', severity: CHECKS.invite_pending, vehicle_id: null, plate: null, detail: `${u.display_name} (${u.role})${u.expires_at < nowIso() ? ' – Einladung abgelaufen' : ''}` });
  const rank = { fehler: 0, luecke: 1, hinweis: 2 };
  items.sort((a, b) => rank[a.severity] - rank[b.severity] || a.check.localeCompare(b.check) || String(a.plate).localeCompare(String(b.plate)));
  const counts = {};
  for (const i of items) counts[i.check] = (counts[i.check] || 0) + 1;
  return { generated_at: nowIso(), environment: envName, stale_days: staleDays, vehicles_checked: vs.length, counts, items };
}
