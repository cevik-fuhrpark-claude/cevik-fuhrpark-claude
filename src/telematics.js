// [CLAUDE] Telematik-Prüffälle: Geräte ohne sichere Zuordnung (keine FIN, kein bestätigtes Mapping) und bestätigte Zuordnungen.
// Zuordnung nur durch Inhaber/Fuhrparkleitung mit Nachweis – nie automatisch über das Kennzeichen.
import { bad, forbidden, notFound, conflict, str, oneOf, nowIso, normPlate, berlinDateTime, berlinDate } from './util.js';
import { audit } from './auth.js';
import { siteSelection } from './reports.js';

const PROVIDERS = ['webfleet', 'yellowfox'];
const canManage = (u) => ['owner', 'fleet'].includes(u.role);

export async function telematicsOverview(env, user, query = {}) {
  if (!canManage(user)) throw forbidden();
  const [unmatched, mappings, latest, reported, positions, perProvider, unmatchedCount] = await Promise.all([
    env.DB.prepare(`SELECT t.provider, t.external_id, t.source_plate, t.source_vin, t.candidate_vehicle_id, v.plate AS candidate_plate, t.last_seen
      FROM telematics_unmatched t LEFT JOIN vehicles v ON v.id=t.candidate_vehicle_id ORDER BY t.last_seen DESC LIMIT 501`).all(),
    env.DB.prepare(`SELECT m.provider, m.external_id, m.vehicle_id, v.plate, m.evidence, m.confirmed_at, u.display_name AS confirmed_by_name
      FROM telematics_mappings m JOIN vehicles v ON v.id=m.vehicle_id LEFT JOIN users u ON u.id=m.confirmed_by ORDER BY v.plate`).all(),
    // Fahrzeuge, nicht Zeilen (ein Fahrzeug mit zwei Anbietern zählte doppelt, 18.10.2026); nur aktive, bewertete wie `positions`;
    // nur mit GPS-Zeit (Stand ohne gps_time erscheint in der Liste als „keine Telematikdaten“ – Kachel zählte ihn mit, 20.10.2026)
    env.DB.prepare(`SELECT COUNT(DISTINCT CASE WHEN t.gps_time IS NOT NULL THEN t.vehicle_id END) AS vehicles, MAX(t.received_at) AS last_received FROM telematics_latest t JOIN vehicles v ON v.id=t.vehicle_id AND v.active=1 AND v.eval_excluded=0`).first(),
    // Zugeordnete Geräte, die zuletzt ein anderes Kennzeichen gemeldet haben (gleiche Regel wie Datenqualität telematics_plate_mismatch),
    // und Geräte, deren letzter km-Stand kleiner ist als der davor erfasste oder größer als ein später erfasster ohne Begründung
    // (gleiche Regel wie Datenqualität telematics_km_rejected, beide Richtungen seit 18.10.2026) – eine Abfrage;
    // wie die Datenqualität nur aktive, bewertete Fahrzeuge (ruhende sind aus allen Bewertungen ausgenommen, außer Betrieb genommene
    // meldet `inactive_vehicle_reports`; vorher zählten Übersicht/Status sie mit, 18.10.2026)
    env.DB.prepare(`SELECT t.vehicle_id, v.plate, t.provider, t.external_id, t.match_basis, t.source_plate, t.received_at, t.km, t.gps_time, p.km AS prev_km, p.measured_at AS prev_at,
      (SELECT json_object('km', o.km, 'at', o.measured_at, 'note', o.note) FROM odometer_readings o WHERE o.vehicle_id=t.vehicle_id AND o.measured_at > t.gps_time ORDER BY o.measured_at ASC LIMIT 1) AS next_json
      FROM telematics_latest t JOIN vehicles v ON v.id=t.vehicle_id
      LEFT JOIN odometer_readings p ON p.id = (SELECT o.id FROM odometer_readings o WHERE o.vehicle_id=t.vehicle_id AND o.measured_at <= t.gps_time ORDER BY o.measured_at DESC LIMIT 1)
      WHERE v.active=1 AND v.eval_excluded=0 AND (t.source_plate IS NOT NULL OR (t.km IS NOT NULL AND t.gps_time IS NOT NULL)) ORDER BY v.plate, t.provider`).all(),
    // Letzter Stand je bewertetem, aktivem Kraftfahrzeug; Anhänger nur, wenn sie ein eigenes Gerät haben (sonst fiele dessen Ausfall nirgends auf).
    // Ohne Daten zuerst, dann ältester Stand zuerst.
    // Reine Information – keine Frist, kein Grenzwert (ob das Fahrzeug stand oder das Gerät ausgefallen ist, steht nicht fest).
    env.DB.prepare(`SELECT v.id AS vehicle_id, v.plate, v.site, CASE WHEN COALESCE(v.kind,'')='anhaenger' THEN 'anhaenger' ELSE 'kfz' END AS kind,
      MAX(t.gps_time) AS gps_time, MAX(t.received_at) AS received_at, group_concat(t.provider) AS providers
      FROM vehicles v LEFT JOIN telematics_latest t ON t.vehicle_id=v.id
      WHERE v.active=1 AND v.eval_excluded=0
      GROUP BY v.id HAVING COALESCE(v.kind,'')<>'anhaenger' OR COUNT(t.vehicle_id) > 0
      ORDER BY MAX(t.gps_time) IS NOT NULL, MAX(t.gps_time), v.plate`).all(),
    // je Anbieter: Geräte, Fahrzeuge, letzter Empfang – fällt eine Quelle aus, ist das hier sichtbar (kein Grenzwert).
    // inactive_vehicle_reports: Geräte, die nach „außer Betrieb nehmen“ (Protokollzeitpunkt) weiter liefern – gleiche Regel wie
    // Datenqualität telematics_vehicle_inactive; ohne Protokolleintrag zählt nichts (kein geschätzter Zeitpunkt).
    env.DB.prepare(`SELECT t.provider, COUNT(*) AS devices, COUNT(DISTINCT t.vehicle_id) AS vehicles, MAX(t.received_at) AS last_received, MAX(t.gps_time) AS last_gps_time,
      SUM(CASE WHEN v.active=0 AND t.gps_time > (SELECT MAX(a.created_at) FROM audit_log a WHERE a.target=t.vehicle_id AND a.action='vehicle.deactivate') THEN 1 ELSE 0 END) AS inactive_vehicle_reports
      FROM telematics_latest t LEFT JOIN vehicles v ON v.id=t.vehicle_id GROUP BY t.provider`).all(),
    // Prüffälle je Anbieter vollständig gezählt – die Liste ist auf 500 begrenzt (vorher still gekappt, 18.10.2026)
    env.DB.prepare('SELECT provider, COUNT(*) AS n FROM telematics_unmatched GROUP BY provider').all(),
  ]);
  const unmatchedTruncated = unmatched.results.length > 500; if (unmatchedTruncated) unmatched.results.length = 500;
  const unmatched_by_provider = Object.fromEntries(unmatchedCount.results.map((r) => [r.provider, r.n]));
  const unmatched_total = unmatchedCount.results.reduce((a, r) => a + r.n, 0);
  const byP = new Map(perProvider.results.map((r) => [r.provider, r]));
  const by_provider = PROVIDERS.map((provider) => { const r = byP.get(provider) || {};
    return { provider, devices: r.devices || 0, vehicles: r.vehicles || 0, last_received: r.last_received || null, last_gps_time: r.last_gps_time || null, inactive_vehicle_reports: r.inactive_vehicle_reports || 0 }; });
  const plate_mismatches = reported.results.filter((r) => r.source_plate && normPlate(r.source_plate) !== normPlate(r.plate))
    .map(({ vehicle_id, plate, provider, external_id, match_basis, source_plate, received_at }) => ({ vehicle_id, plate, provider, external_id, match_basis, source_plate, received_at }));
  // km-Stand des Geräts kleiner als der erfasste – nicht übernommen (nur Hinweis, keine Korrektur, kein Grenzwert)
  const km_rejected = reported.results.map((r) => kmRejection(r)).filter(Boolean);
  const kmRej = new Map();
  for (const k of km_rejected) { if (!kmRej.has(k.vehicle_id)) kmRej.set(k.vehicle_id, []); kmRej.get(k.vehicle_id).push(k); }
  // Standortfilter nur für „Letzter Stand je Fahrzeug“ (Schreibweise egal wie in anderen Übersichten); Abweichungen bleiben vollständig
  const sel = siteSelection(positions.results, query.site);
  return { providers: PROVIDERS, unmatched: unmatched.results, unmatched_total, unmatched_by_provider, unmatched_truncated: unmatchedTruncated, mappings: mappings.results, latest, by_provider, plate_mismatches, km_rejected, site: sel.site, site_options: sel.options,
    positions: positions.results.filter((r) => sel.match(r.site)).map((r) => ({ ...r, providers: r.providers ? r.providers.split(',').sort() : [],
      km_rejected: (kmRej.get(r.vehicle_id) || []).map(({ vehicle_id, plate, ...k }) => k) })) };
}

// Gerät-km nicht übernommen (gleiche Regel wie Datenqualität telematics_km_rejected):
// direction 'below' – kleiner als der zuletzt davor erfasste Stand; 'above' – größer als der nächste später erfasste Stand,
// sofern dieser keine Begründung (Vermerk, z. B. Tachotausch) trägt. recorded_km/recorded_at = der Vergleichsstand.
// Nur Hinweis, keine Korrektur, kein Grenzwert.
export function kmRejection(r) {
  if (r.km === null || r.km === undefined || !r.gps_time) return null;
  const km = Math.round(r.km);
  const base = { vehicle_id: r.vehicle_id, plate: r.plate, provider: r.provider, external_id: r.external_id, km, gps_time: r.gps_time };
  if (r.prev_km !== null && r.prev_km !== undefined && km < r.prev_km) return { ...base, direction: 'below', recorded_km: r.prev_km, recorded_at: r.prev_at };
  if (r.next_json) {
    let n; try { n = JSON.parse(r.next_json); } catch { return null; }
    if (n && n.km !== null && n.km < km && !(n.note && String(n.note).trim())) return { ...base, direction: 'above', recorded_km: n.km, recorded_at: n.at };
  }
  return null;
}

// CSV-/Textform eines nicht übernommenen Gerät-km (deutsch wie die übrigen CSV-Texte)
export const kmRejectionText = (k) => `${k.provider} ${k.external_id || ''}: ${k.km} km (${berlinDate(k.gps_time)}) ${k.direction === 'above' ? '>' : '<'} ${k.recorded_km} km (${berlinDate(k.recorded_at)})`.replace(/\s+:/, ':');

// „Letzter Stand je Fahrzeug“ als CSV (Excel DE) – z. B. für die Rückfrage beim Telematik-Anbieter oder der Werkstatt.
// Reine Information wie in der Ansicht: Alter in Stunden ab Abrufzeitpunkt, keine Bewertung, kein Grenzwert.
export function positionsCsv(ov, csvCell, now = Date.now()) {
  const mism = new Map();
  for (const m of ov.plate_mismatches) { if (!mism.has(m.vehicle_id)) mism.set(m.vehicle_id, []); mism.get(m.vehicle_id).push(`${m.provider} ${m.external_id || ''}: ${m.source_plate}`.replace(/\s+:/, ':')); }
  const head = ['Kennzeichen', 'Standort', 'Letzte GPS-Zeit', 'Empfangen', 'Alter GPS-Stand (Stunden)', 'Anbieter', 'Gerät meldet anderes Kennzeichen', 'Geräte-km passt nicht zu erfassten Ständen (nicht übernommen)', 'Anhänger'];
  const lines = [head.join(';')];
  for (const r of ov.positions) {
    const age = r.gps_time ? Math.floor((now - Date.parse(r.gps_time)) / 3600000) : null;
    lines.push([csvCell(r.plate), csvCell(r.site), r.gps_time ? berlinDateTime(r.gps_time) : 'keine Daten', r.received_at ? berlinDateTime(r.received_at) : '',
      age === null || !(age >= 0) ? '' : age, csvCell(r.providers.join(', ')), csvCell((mism.get(r.vehicle_id) || []).join(' | ')),
      csvCell((r.km_rejected || []).map(kmRejectionText).join(' | ')), r.kind === 'anhaenger' ? 'ja' : ''].join(';'));
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
  // gleichzeitig bestätigt: 409 statt 500 (Primärschlüssel) – 17.10.2026
  const [ins] = await env.DB.batch([
    env.DB.prepare('INSERT INTO telematics_mappings(provider,external_id,vehicle_id,evidence,confirmed_by,confirmed_at) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING').bind(provider, ext, v.id, evidence, user.id, nowIso()),
    env.DB.prepare('DELETE FROM telematics_unmatched WHERE provider=? AND external_id=? AND changes()=1').bind(provider, ext),
    // Gerätestand dieses Geräts bei einem anderen Fahrzeug (Zuordnung über eine falsch eingerichtete FIN) entfernen – blieb sonst dauerhaft als
    // „Daten vorhanden“/Kennzeichen-Abweichung beim falschen Fahrzeug stehen (19.10.2026); km-Ablesungen bleiben als Beleg in der Akte
    env.DB.prepare(`DELETE FROM telematics_latest WHERE provider=? AND external_id=? AND vehicle_id<>? AND EXISTS (SELECT 1 FROM telematics_mappings WHERE provider=? AND external_id=? AND vehicle_id=?)`).bind(provider, ext, v.id, provider, ext, v.id),
  ]);
  if (!ins.meta.changes) throw conflict('mapping_exists', 'Für dieses Gerät gibt es bereits eine bestätigte Zuordnung – zuerst aufheben.');
  await audit(env, user.id, 'telematics.map', v.id, { provider, external_id: ext, plate: v.plate });
  return { ok: true };
}

export async function removeMapping(env, user, query) {
  if (!canManage(user)) throw forbidden();
  const provider = oneOf(String(query.provider || '').toLowerCase(), PROVIDERS, 'Anbieter');
  const ext = str(query.external_id, { required: true, max: 80, field: 'Geräte-ID' });
  // Gerätestand aus der aufgehobenen (falschen) Zuordnung mit entfernen – blieb sonst als Position/km beim falschen Fahrzeug stehen und zählte
  // doppelt in der Übersicht (17.10.2026); km-Ablesungen bleiben als Beleg in der Akte
  const [r] = await env.DB.batch([
    env.DB.prepare('DELETE FROM telematics_mappings WHERE provider=? AND external_id=?').bind(provider, ext),
    env.DB.prepare(`DELETE FROM telematics_latest WHERE provider=? AND external_id=? AND match_basis='confirmed_mapping' AND NOT EXISTS (SELECT 1 FROM telematics_mappings WHERE provider=? AND external_id=?)`).bind(provider, ext, provider, ext),
  ]);
  if (!r.meta.changes) throw notFound('Zuordnung nicht gefunden.');
  await audit(env, user.id, 'telematics.unmap', null, { provider, external_id: ext });
  return { ok: true };
}
