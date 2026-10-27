// [CLAUDE] Nutzungsstatistik ohne Personenbezug: welche Funktionen werden genutzt (für die Einführungsphase)
// Gespeichert werden nur Tag, Umgebung, Funktionspfad (IDs/Kennzeichen/Token ersetzt) und Anzahl – keine Person, keine Rolle, keine Inhalte.
import { berlinDate, HttpError, intParam } from './util.js';

const AREA = { cases: 'cases', vehicles: 'vehicles', contracts: 'vehicles', tires: 'tires', stock: 'stock', fines: 'fines', maintenance: 'maintenance', reports: 'reports',
  master: 'master', agent: 'master', notifications: 'notifications', push: 'notifications', users: 'admin', admin: 'admin', settings: 'admin',
  me: 'account', logout: 'account', meta: 'account', dashboard: 'dashboard', inspections: 'checks',
  // 18.10.2026: ganze Fachbereiche standen unter „Sonstiges“
  drivers: 'drivers', claims: 'claims', telematics: 'telematics', workshop: 'workshop', emergency: 'emergency', tacho: 'tacho', sites: 'vehicles',
  'part-suggestions': 'cases', 'work-suggestions': 'cases', 'work-day': 'cases',
  // 18.10.2026 (10:15): Foto-/Dokumentansichten (überwiegend Vorgänge), Zuordnung beenden, Integrations-API standen unter „Sonstiges“
  files: 'cases', assignments: 'vehicles', integration: 'admin' };

// Pfadsegmente, die Einzelobjekte bezeichnen (UUID, Vorgangsnummer, FIN, Token, Zahlen), werden zu ':id'
export function featureOf(method, path, action, status = 200) {
  // Fehler (nicht gefunden 404/405 u. a.): freie Wörter aus der Adresse nie speichern („cases/hans-mueller-krank“) – nach dem Bereich alles „:id“,
  // unbekannter Bereich „…“ (19.10.2026)
  // 21.10.2026: ebenso bei allen anderen Fehlern (400/403/409 …) – „admin/users/hans-mueller/data-export“ mit 403 stand im Klartext in der Statistik
  if (status >= 400) {
    const segs = path.replace(/^\/api\//, '').split('/').filter(Boolean).slice(0, 5);
    const act = status !== 404 && status !== 405 && typeof action === 'string' && /^[a-z_]{2,32}$/.test(action) ? `:${action}` : '';
    return `${method} ${Object.hasOwn(AREA, segs[0] || '') ? [segs[0], ...segs.slice(1).map(() => ':id')].join('/') : '…'}${act}`.slice(0, 80);
  }
  // Befehle: nur bekannte, kurze Befehlsnamen anhängen (keine freien Inhalte)
  const act = typeof action === 'string' && /^[a-z_]{2,32}$/.test(action) ? `:${action}` : '';
  const segs = path.replace(/^\/api\//, '').split('/').filter(Boolean).slice(0, 5)
    .map((s) => (/^[a-z_-]+$/.test(s) && s.length <= 24 ? s : ':id'));
  return `${method} ${segs.join('/')}${act}`.slice(0, 80);
}
export const areaOf = (feature) => AREA[feature.split(' ')[1]?.split('/')[0]] || 'other';

export function recordUsage(env, ctx, environment, method, path, status, action) {
  const job = env.DB.prepare(`INSERT INTO usage_daily(day, environment, feature, calls, errors) VALUES (?1, ?2, ?3, 1, ?4)
    ON CONFLICT(day, environment, feature) DO UPDATE SET calls = calls + 1, errors = errors + ?4`)
    .bind(berlinDate(), environment, featureOf(method, path, action, status), status >= 400 ? 1 : 0).run().catch(() => {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(job); else return job;
}

export async function usageReport(env, user, environment, query = {}) {
  if (user.role !== 'owner') throw new HttpError(403, 'forbidden', 'Nur der Inhaber sieht die Nutzungsstatistik.');
  const days = intParam(query.days, 30, 1, 366);
  // Berliner Kalendertage zurückrechnen (24-h-Schritte lagen in der Stunde nach einer Zeitumstellung einen Tag daneben, 17.10.2026)
  const from = new Date(Date.parse(berlinDate(new Date(Date.now()).toISOString()) + 'T00:00:00Z') - (days - 1) * 86400000).toISOString().slice(0, 10);
  const rows = (await env.DB.prepare(`SELECT day, feature, calls, errors FROM usage_daily WHERE environment=? AND day >= ? ORDER BY day`).bind(environment, from).all()).results;
  const byFeature = new Map(); const byDay = new Map(); const byArea = new Map();
  for (const r of rows) {
    const f = byFeature.get(r.feature) || { feature: r.feature, area: areaOf(r.feature), calls: 0, errors: 0, days: 0, last_day: null };
    f.calls += r.calls; f.errors += r.errors; f.days += 1; f.last_day = r.day; byFeature.set(r.feature, f);
    byDay.set(r.day, (byDay.get(r.day) || 0) + r.calls);
    const a = byArea.get(f.area) || { area: f.area, calls: 0, errors: 0 }; a.calls += r.calls; a.errors += r.errors; byArea.set(f.area, a);
  }
  return {
    environment, from, days, total_calls: rows.reduce((s, r) => s + r.calls, 0),
    areas: [...byArea.values()].sort((a, b) => b.calls - a.calls),
    features: [...byFeature.values()].sort((a, b) => b.calls - a.calls),
    daily: [...byDay].map(([day, calls]) => ({ day, calls })),
  };
}
