// [CLAUDE] Telematik-Prüffälle: Geräte ohne sichere Zuordnung (keine FIN, kein bestätigtes Mapping) und bestätigte Zuordnungen.
// Zuordnung nur durch Inhaber/Fuhrparkleitung mit Nachweis – nie automatisch über das Kennzeichen.
import { bad, forbidden, notFound, conflict, str, oneOf, nowIso, normPlate, berlinDateTime } from './util.js';
import { audit } from './auth.js';
import { siteSelection } from './reports.js';

const PROVIDERS = ['webfleet', 'yellowfox'];
const canManage = (u) => ['owner', 'fleet'].includes(u.role);

export async function telematicsOverview(env, user, query = {}) {
  if (!canManage(user)) throw forbidden();
  const [unmatched, mappings, latest, reported, positions] = await Promise.all([
    env.DB.prepare(`SELECT t.provider, t.external_id, t.source_plate, t.source_vin, t.candidate_vehicle_id, v.plate AS candidate_plate, t.last_seen
      FROM telematics_unmatched t LEFT JOIN vehicles v ON v.id=t.candidate_vehicle_id ORDER BY t.last_seen DESC LIMIT 500`).all(),
    env.DB.prepare(`SELECT m.provider, m.external_id, m.vehicle_id, v.plate, m.evidence, m.confirmed_at, u.display_name AS confirmed_by_name
      FROM telematics_mappings m JOIN vehicles v ON v.id=m.vehicle_id LEFT JOIN users u ON u.id=m.confirmed_by ORDER BY v.plate`).all(),
    env.DB.prepare(`SELECT COUNT(*) AS vehicles, MAX(received_at) AS last_received FROM telematics_latest`).first(),
    // Zugeordnete Geräte, die zuletzt ein anderes Kennzeichen gemeldet haben (gleiche Regel wie Datenqualität telematics_plate_mismatch)
    env.DB.prepare(`SELECT t.vehicle_id, v.plate, t.provider, t.external_id, t.match_basis, t.source_plate, t.received_at
      FROM telematics_latest t JOIN vehicles v ON v.id=t.vehicle_id WHERE t.source_plate IS NOT NULL ORDER BY v.plate, t.provider`).all(),
    // Letzter Stand je bewertetem, aktivem Kraftfahrzeug (ohne Anhänger): ohne Daten zuerst, dann ältester Stand zuerst.
    // Reine Information – keine Frist, kein Grenzwert (ob das Fahrzeug stand oder das Gerät ausgefallen ist, steht nicht fest).
    env.DB.prepare(`SELECT v.id AS vehicle_id, v.plate, v.site, MAX(t.gps_time) AS gps_time, MAX(t.received_at) AS received_at, group_concat(t.provider) AS providers
      FROM vehicles v LEFT JOIN telematics_latest t ON t.vehicle_id=v.id
      WHERE v.active=1 AND v.eval_excluded=0 AND COALESCE(v.kind,'')<>'anhaenger'
      GROUP BY v.id ORDER BY MAX(t.gps_time) IS NOT NULL, MAX(t.gps_time), v.plate`).all(),
  ]);
  const plate_mismatches = reported.results.filter((r) => normPlate(r.source_plate) !== normPlate(r.plate));
  // Standortfilter nur für „Letzter Stand je Fahrzeug“ (Schreibweise egal wie in anderen Übersichten); Abweichungen bleiben vollständig
  const sel = siteSelection(positions.results, query.site);
  return { providers: PROVIDERS, unmatched: unmatched.results, mappings: mappings.results, latest, plate_mismatches, site: sel.site, site_options: sel.options,
    positions: positions.results.filter((r) => sel.match(r.site)).map((r) => ({ ...r, providers: r.providers ? r.providers.split(',').sort() : [] })) };
}

// „Letzter Stand je Fahrzeug“ als CSV (Excel DE) – z. B. für die Rückfrage beim Telematik-Anbieter oder der Werkstatt.
// Reine Information wie in der Ansicht: Alter in Stunden ab Abrufzeitpunkt, keine Bewertung, kein Grenzwert.
export function positionsCsv(ov, csvCell, now = Date.now()) {
  const mism = new Map();
  for (const m of ov.plate_mismatches) { if (!mism.has(m.vehicle_id)) mism.set(m.vehicle_id, []); mism.get(m.vehicle_id).push(`${m.provider} ${m.external_id || ''}: ${m.source_plate}`.replace(/\s+:/, ':')); }
  const head = ['Kennzeichen', 'Standort', 'Letzte GPS-Zeit', 'Empfangen', 'Alter GPS-Stand (Stunden)', 'Anbieter', 'Gerät meldet anderes Kennzeichen'];
  const lines = [head.join(';')];
  for (const r of ov.positions) {
    const age = r.gps_time ? Math.floor((now - Date.parse(r.gps_time)) / 3600000) : null;
    lines.push([csvCell(r.plate), csvCell(r.site), r.gps_time ? berlinDateTime(r.gps_time) : 'keine Daten', r.received_at ? berlinDateTime(r.received_at) : '',
      age === null || !(age >= 0) ? '' : age, csvCell(r.providers.join(', ')), csvCell((mism.get(r.vehicle_id) || []).join(' | '))].join(';'));
  }
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

export async function confirmMapping(env, user, body) {
  if (!canManage(user)) throw forbidden();
  const provider = oneOf(String(body.provider || '').toLowerCase(), PROVIDERS, 'Anbieter');
  const ext = str(body.external_id, { required: true, max: 80, field: 'Geräte-ID' });
  const evidence = str(body.evidence, { required: true, max: 300, field: 'Nachweis' });
  const v = await env.DB.prepare('SELECT id, plate FROM vehicles WHERE id=?').bind(str(body.vehicle_id, { required: true, max: 40 })).first();
  if (!v) throw notFound('Fahrzeug nicht gefunden.');
  const exists = await env.DB.prepare('SELECT vehicle_id FROM telematics_mappings WHERE provider=? AND external_id=?').bind(provider, ext).first();
  if (exists) throw conflict('mapping_exists', 'Für dieses Gerät gibt es bereits eine bestätigte Zuordnung – zuerst aufheben.');
  await env.DB.batch([
    env.DB.prepare('INSERT INTO telematics_mappings(provider,external_id,vehicle_id,evidence,confirmed_by,confirmed_at) VALUES (?,?,?,?,?,?)').bind(provider, ext, v.id, evidence, user.id, nowIso()),
    env.DB.prepare('DELETE FROM telematics_unmatched WHERE provider=? AND external_id=?').bind(provider, ext),
  ]);
  await audit(env, user.id, 'telematics.map', v.id, { provider, external_id: ext, plate: v.plate });
  return { ok: true };
}

export async function removeMapping(env, user, query) {
  if (!canManage(user)) throw forbidden();
  const provider = oneOf(String(query.provider || '').toLowerCase(), PROVIDERS, 'Anbieter');
  const ext = str(query.external_id, { required: true, max: 80, field: 'Geräte-ID' });
  const r = await env.DB.prepare('DELETE FROM telematics_mappings WHERE provider=? AND external_id=?').bind(provider, ext).run();
  if (!r.meta.changes) throw notFound('Zuordnung nicht gefunden.');
  await audit(env, user.id, 'telematics.unmap', null, { provider, external_id: ext });
  return { ok: true };
}
