// [CLAUDE] Telematik-Prüffälle: Geräte ohne sichere Zuordnung (keine FIN, kein bestätigtes Mapping) und bestätigte Zuordnungen.
// Zuordnung nur durch Inhaber/Fuhrparkleitung mit Nachweis – nie automatisch über das Kennzeichen.
import { bad, forbidden, notFound, conflict, str, oneOf, nowIso } from './util.js';
import { audit } from './auth.js';

const PROVIDERS = ['webfleet', 'yellowfox'];
const canManage = (u) => ['owner', 'fleet'].includes(u.role);

export async function telematicsOverview(env, user) {
  if (!canManage(user)) throw forbidden();
  const [unmatched, mappings, latest] = await Promise.all([
    env.DB.prepare(`SELECT t.provider, t.external_id, t.source_plate, t.source_vin, t.candidate_vehicle_id, v.plate AS candidate_plate, t.last_seen
      FROM telematics_unmatched t LEFT JOIN vehicles v ON v.id=t.candidate_vehicle_id ORDER BY t.last_seen DESC LIMIT 500`).all(),
    env.DB.prepare(`SELECT m.provider, m.external_id, m.vehicle_id, v.plate, m.evidence, m.confirmed_at, u.display_name AS confirmed_by_name
      FROM telematics_mappings m JOIN vehicles v ON v.id=m.vehicle_id LEFT JOIN users u ON u.id=m.confirmed_by ORDER BY v.plate`).all(),
    env.DB.prepare(`SELECT COUNT(*) AS vehicles, MAX(received_at) AS last_received FROM telematics_latest`).first(),
  ]);
  return { providers: PROVIDERS, unmatched: unmatched.results, mappings: mappings.results, latest };
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
