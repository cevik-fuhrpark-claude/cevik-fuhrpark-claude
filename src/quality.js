// [CLAUDE] Datenqualität (Einführungsphase): prüft Stammdaten und Zuordnungen auf Lücken und Widersprüche.
// Nur Befunde aus gespeicherten Daten – es wird nichts geändert und nichts ergänzt.
import { forbidden, nowIso } from './util.js';
import { siteKey, siteLabels, siteSelection } from './reports.js';
import { REQUIRED_KINDS, REQUIRED_KINDS_TRAILER, defectsWithoutCaseQuery, noResultQuery } from './maintenance.js';

const normPlate = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9ÄÖÜ]/g, '');
// Schweregrad: fehler = widersprüchlich, luecke = fehlt für Auswertungen, hinweis = sollte gepflegt werden
export const CHECKS = {
  duplicate_plate: 'fehler', vin_similar: 'fehler', trailer_unknown: 'fehler', trailer_multi: 'fehler', assignment_inactive_user: 'fehler',
  missing_site: 'luecke', no_km: 'luecke', km_stale: 'hinweis', missing_inspection: 'luecke',
  km_inspection_rejected: 'hinweis', missing_manufacturer: 'hinweis', missing_build_year: 'hinweis', invite_pending: 'hinweis', trailer_without_truck: 'hinweis',
  // fest gekoppeltes Gespann (Stammliste), aber Lkw und Anhänger mit unterschiedlichem Standort – Stammdaten prüfen
  coupled_site_mismatch: 'hinweis',
  // gleicher Standort in abweichender Schreibweise (Dortmund/DORTMUND) – Auswertungen fassen sie zusammen, Stammdaten vereinheitlichen
  site_spelling: 'hinweis',
  // Fahrerakte & Auslesungen
  driver_account_inactive: 'fehler', driver_no_license: 'luecke', driver_card_no_download: 'luecke', vu_no_download: 'hinweis', driver_account_no_file: 'hinweis',
  // Fahrzeugverträge
  contract_vehicle_inactive: 'fehler', contract_km_no_reading: 'luecke', leasing_doc_no_contract: 'hinweis', contract_no_document: 'hinweis',
  // Versicherungsfälle
  accident_no_claim: 'hinweis',
  // Prüfergebnis mit erheblichen/gefährlichen Mängeln bzw. verkehrsunsicher, aber kein Vorgang zum Fahrzeug seit der Prüfung
  inspection_defects_no_case: 'luecke',
  // Nachprüfung nach freigegebenem Mängelauftrag zeigt erneut erhebliche/gefährliche Mängel bzw. verkehrsunsicher (Wiederholungsmangel)
  reinspection_defects_again: 'luecke',
  // in der App erfasste Pflichtprüfung (≤ 180 Tage, neueste ihrer Art) ohne Prüfergebnis – Ergebnis in der Fahrzeugakte nachtragen
  inspection_no_result: 'hinweis',
  // Wartungsregel mit Intervall km, aber ohne km-Stand der letzten Durchführung und ohne belegte km-Fälligkeit – km-Fälligkeit nicht berechenbar
  km_rule_no_base: 'luecke',
};

// FIN-Paare, die sich nur an einer Stelle unterscheiden oder zwei benachbarte Zeichen vertauscht haben (typische Tippfehler).
// Liefert [Fahrzeug, anderes Fahrzeug, erste abweichende Stelle 1–17] in beide Richtungen.
export function similarVins(list) {
  const out = [];
  const vs = list.filter((v) => v.vin && v.vin.length === 17).map((v) => ({ ...v, vin: v.vin.toUpperCase() }));
  for (let a = 0; a < vs.length; a++) {
    for (let b = a + 1; b < vs.length; b++) {
      const x = vs[a].vin; const y = vs[b].vin;
      if (x === y) continue;
      const diff = [];
      for (let i = 0; i < 17 && diff.length < 3; i++) if (x[i] !== y[i]) diff.push(i);
      const typo = diff.length === 1 || (diff.length === 2 && diff[1] === diff[0] + 1 && x[diff[0]] === y[diff[1]] && x[diff[1]] === y[diff[0]]);
      if (typo) { out.push([vs[a], vs[b], diff[0] + 1], [vs[b], vs[a], diff[0] + 1]); }
    }
  }
  return out;
}

// noResultQuery liegt in maintenance.js (auch für „Heute zu tun“ der Übersicht); hier weiter exportiert
export { noResultQuery };

export async function myInspectionsWithoutResult(env, user) {
  if (!['owner', 'fleet', 'workshop'].includes(user.role)) throw forbidden();
  return { items: (await noResultQuery(env, user.id).all()).results };
}

export async function dataQuality(env, user, envName, query = {}) {
  if (!['owner', 'fleet'].includes(user.role)) throw forbidden();
  const staleDays = Math.min(Math.max(Number(query.stale_days) || 90, 7), 730);
  const staleBefore = new Date(Date.now() - staleDays * 86400000).toISOString();
  const [veh, kms, rules, assigns, invites, drv, acc, vu, insKm, vins, ctr, ldocs, acc365, defects, again, noResult] = await Promise.all([
    env.DB.prepare('SELECT id, plate, kind, site, manufacturer, build_year, trailer_plate FROM vehicles WHERE active=1 AND eval_excluded=0').all(),
    env.DB.prepare('SELECT vehicle_id, MAX(measured_at) AS last FROM odometer_readings GROUP BY vehicle_id').all(),
    env.DB.prepare(`SELECT vehicle_id, kind, next_due_date, interval_km, last_done_km, due_km FROM maintenance_rules WHERE next_due_date IS NOT NULL
      OR (interval_km IS NOT NULL AND last_done_km IS NULL AND due_km IS NULL AND kind NOT IN ('HU','SP'))`).all(),
    env.DB.prepare(`SELECT d.id, d.vehicle_id, v.plate, u.display_name, u.active FROM driver_vehicles d JOIN users u ON u.id=d.user_id JOIN vehicles v ON v.id=d.vehicle_id
      WHERE u.environment=? AND (d.valid_to IS NULL OR d.valid_to > ?)`).bind(envName, nowIso()).all(),
    env.DB.prepare(`SELECT u.id, u.display_name, u.role, MAX(i.expires_at) AS expires_at FROM users u JOIN invites i ON i.user_id=u.id
      WHERE u.environment=? AND u.active=1 AND u.password_hash IS NULL GROUP BY u.id`).bind(envName).all(),
    env.DB.prepare(`SELECT d.id, d.display_name, d.user_id, u.active AS u_active,
      EXISTS(SELECT 1 FROM driver_documents x WHERE x.driver_id=d.id AND x.kind='fuehrerschein' AND x.superseded=0) AS has_license,
      EXISTS(SELECT 1 FROM driver_documents x WHERE x.driver_id=d.id AND x.kind='fahrerkarte' AND x.superseded=0) AS has_card,
      EXISTS(SELECT 1 FROM tacho_downloads t WHERE t.driver_id=d.id) AS has_download
      FROM drivers d LEFT JOIN users u ON u.id=d.user_id WHERE d.environment=? AND d.active=1`).bind(envName).all(),
    env.DB.prepare(`SELECT u.id, u.display_name FROM users u WHERE u.environment=? AND u.role='driver' AND u.active=1 AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id=u.id)`).bind(envName).all(),
    env.DB.prepare(`SELECT DISTINCT vehicle_id FROM tacho_downloads WHERE environment=? AND vehicle_id IS NOT NULL`).bind(envName).all(),
    // Kontrollen im Zeitraum, deren km-Stand kleiner war als der zuvor erfasste (nicht in die Akte übernommen) – zur Klärung
    env.DB.prepare(`SELECT * FROM (SELECT i.vehicle_id, i.odometer_km, i.created_at,
      (SELECT o.km FROM odometer_readings o WHERE o.vehicle_id=i.vehicle_id AND o.measured_at <= i.created_at ORDER BY o.measured_at DESC LIMIT 1) AS prev_km
      FROM inspections i WHERE i.environment=? AND i.odometer_km IS NOT NULL AND i.created_at >= ?) WHERE prev_km IS NOT NULL AND odometer_km < prev_km ORDER BY created_at DESC LIMIT 200`).bind(envName, staleBefore).all(),
    // alle aktiven Fahrzeuge inkl. ruhender: fast gleiche FIN deutet auf Tippfehler/Doppelanlage hin
    env.DB.prepare('SELECT id, vin, plate, eval_excluded FROM vehicles WHERE active=1 AND vin IS NOT NULL').all(),
    // laufende Verträge (auch an Fahrzeugen außer Betrieb) mit letztem km-Stand
    env.DB.prepare(`SELECT c.id, c.vehicle_id, c.kind, c.partner, c.km_allowance, c.start_date, c.file_id, v.plate, v.active,
      (SELECT MAX(o.measured_at) FROM odometer_readings o WHERE o.vehicle_id=c.vehicle_id) AS last_km_at
      FROM vehicle_contracts c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.ended_on IS NULL AND v.eval_excluded=0`).all(),
    // Leasing-/Mietdokumente ohne erfassten Vertrag dieser Art
    env.DB.prepare(`SELECT DISTINCT f.vehicle_id FROM files f WHERE f.environment=? AND f.case_id IS NULL AND f.doc_kind='leasing'
      AND NOT EXISTS (SELECT 1 FROM vehicle_contracts c WHERE c.vehicle_id=f.vehicle_id AND c.kind IN ('leasing','miete','finanzierung'))`).bind(envName).all(),
    // Vorgänge der letzten 365 Tage, deren Beschreibung „Unfall“ nennt (DE/UK/EN), ohne erfassten Versicherungsfall – nur Hinweis (Wortsuche, keine Bewertung)
    env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate, c.created_at FROM cases c JOIN vehicles v ON v.id=c.vehicle_id
      WHERE c.environment=? AND c.created_at >= ? AND c.status<>'abgelehnt' AND v.eval_excluded=0
      AND (instr(lower(c.description),'unfall')>0 OR instr(lower(c.description),'accident')>0 OR instr(lower(c.description),'дтп')>0 OR instr(lower(c.description),'аварі')>0 OR instr(c.description,'ДТП')>0 OR instr(c.description,'Аварі')>0)
      AND NOT EXISTS (SELECT 1 FROM insurance_claims ic WHERE ic.case_id=c.id) ORDER BY c.created_at DESC LIMIT 200`).bind(envName, new Date(Date.now() - 365 * 86400000).toISOString()).all(),
    // Prüfungen der letzten 365 Tage mit Ergebnis erhebliche/gefährliche Mängel bzw. verkehrsunsicher ohne Vorgang zum Fahrzeug seit dem Prüfdatum
    defectsWithoutCaseQuery(env, envName).all(),
    // Nachprüfung (nächste spätere Durchführung derselben Prüfart, ≤ 365 Tage, am/nach dem Freigabetag des Mängelauftrags) erneut mit erheblichen Mängeln
    env.DB.prepare(`SELECT n.id, n.vehicle_id, v.plate, n.kind, n.done_date, n.result, e.done_date AS first_date, MAX(c.case_no) AS case_no
      FROM maintenance_events e JOIN cases c ON c.maintenance_event_id=e.id AND c.environment=? AND c.status='fahrzeug_freigegeben'
      JOIN maintenance_events n ON n.id = (SELECT x.id FROM maintenance_events x WHERE x.vehicle_id=e.vehicle_id AND x.kind=e.kind AND x.id<>e.id
        AND (x.done_date > e.done_date OR (x.done_date = e.done_date AND x.created_at > e.created_at)) ORDER BY x.done_date, x.created_at LIMIT 1)
      JOIN vehicles v ON v.id=e.vehicle_id
      WHERE v.active=1 AND v.eval_excluded=0 AND n.done_date >= ? AND substr(c.closed_at,1,10) <= n.done_date
      AND n.result IN ('erhebliche_maengel','gefaehrliche_maengel','verkehrsunsicher')
      GROUP BY n.id ORDER BY n.done_date DESC LIMIT 200`).bind(envName, new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)).all(),    // Pflichtprüfung in der App erfasst/erledigt (≤ 180 Tage), neueste ihrer Art, ohne Prüfergebnis (Importe/Bestand bewusst ausgenommen)
    noResultQuery(env).all(),
  ]);
  const vs = veh.results;
  const items = [];
  const add = (check, v, detail = null) => items.push({ check, severity: CHECKS[check], vehicle_id: v && v.id || null, plate: v && v.plate || null, detail });
  const byPlate = new Map();
  for (const v of vs) { const k = normPlate(v.plate); byPlate.set(k, [...(byPlate.get(k) || []), v]); }
  for (const [, list] of byPlate) if (list.length > 1) for (const v of list) add('duplicate_plate', v, list.filter((x) => x !== v).map((x) => x.id).join(', '));
  for (const [v, other, pos] of similarVins(vins.results)) add('vin_similar', v, `${other.plate} · ${other.vin} · #${pos}`);
  const lastKm = new Map(kms.results.map((r) => [r.vehicle_id, r.last]));
  const hasRule = new Set(rules.results.filter((r) => r.next_due_date).map((r) => `${r.vehicle_id}|${r.kind}`));
  const pulledBy = new Map();
  const siteLabel = siteLabels(vs);
  for (const v of vs) {
    if (!v.site) add('missing_site', v);
    else if (String(v.site).trim() !== siteLabel.get(siteKey(v.site))) add('site_spelling', v, `${String(v.site).trim()} → ${siteLabel.get(siteKey(v.site))}`);
    if (!v.manufacturer) add('missing_manufacturer', v);
    if (!v.build_year && v.kind === 'lkw') add('missing_build_year', v);
    if (v.kind === 'lkw') {
      const km = lastKm.get(v.id);
      if (!km) add('no_km', v); else if (km < staleBefore) add('km_stale', v, km.slice(0, 10));
      if (v.trailer_plate) {
        const t = (byPlate.get(normPlate(v.trailer_plate)) || []).find((x) => x.kind === 'anhaenger');
        if (!t) add('trailer_unknown', v, v.trailer_plate);
        else {
          pulledBy.set(t.id, [...(pulledBy.get(t.id) || []), v.plate]);
          if (v.site && t.site && v.site.trim().toLowerCase() !== t.site.trim().toLowerCase()) add('coupled_site_mismatch', v, `${v.site} · ${t.plate}: ${t.site}`);
        }
      }
    }
    const required = v.kind === 'anhaenger' ? REQUIRED_KINDS_TRAILER : REQUIRED_KINDS;
    const missing = required.filter((k) => !hasRule.has(`${v.id}|${k}`));
    if (missing.length) add('missing_inspection', v, missing.join(', '));
  }
  const vAct = new Map(vs.map((v) => [v.id, v]));
  for (const r of rules.results) if (r.interval_km && r.last_done_km === null && r.due_km === null && !['HU', 'SP'].includes(r.kind) && vAct.has(r.vehicle_id)) add('km_rule_no_base', vAct.get(r.vehicle_id), `${r.kind} · ${r.interval_km} km`);
  for (const v of vs.filter((x) => x.kind === 'anhaenger')) {
    const trucks = pulledBy.get(v.id) || [];
    if (trucks.length > 1) add('trailer_multi', v, trucks.join(', '));
    if (!trucks.length) add('trailer_without_truck', v);
  }
  const vById = new Map(vs.map((v) => [v.id, v]));
  for (const k of insKm.results) { const v = vById.get(k.vehicle_id); if (v) add('km_inspection_rejected', v, `${k.odometer_km} km (${k.created_at.slice(0, 10)}) < ${k.prev_km} km`); }
  for (const a of assigns.results) if (!a.active) items.push({ check: 'assignment_inactive_user', severity: CHECKS.assignment_inactive_user, vehicle_id: a.vehicle_id, plate: a.plate, detail: a.display_name });
  const withVu = new Set(vu.results.map((r) => r.vehicle_id));
  for (const v of vs) if (v.kind === 'lkw' && !withVu.has(v.id)) add('vu_no_download', v);
  const CK_DE = { leasing: 'Leasing', miete: 'Miete', finanzierung: 'Finanzierung', versicherung: 'Versicherung', wartung: 'Wartungsvertrag', sonstiges: 'Vertrag' };
  for (const c of ctr.results) {
    const v = { id: c.vehicle_id, plate: c.plate };
    if (!c.active) add('contract_vehicle_inactive', v, `${CK_DE[c.kind]} · ${c.partner}`);
    else if (c.km_allowance && (!c.last_km_at || (c.start_date && c.last_km_at.slice(0, 10) < c.start_date))) add('contract_km_no_reading', v, `${CK_DE[c.kind]} · ${c.partner}`);
    // Leasing/Miete/Finanzierung ohne verknüpftes Vertragsdokument (Nachweis nur als Text) – Hinweis, keine Pflicht
    if (c.active && !c.file_id && ['leasing', 'miete', 'finanzierung'].includes(c.kind)) add('contract_no_document', v, `${CK_DE[c.kind]} · ${c.partner}`);
  }
  for (const c of acc365.results) items.push({ check: 'accident_no_claim', severity: CHECKS.accident_no_claim, vehicle_id: c.vehicle_id, plate: c.plate, case_id: c.id, detail: `${c.case_no} · ${c.created_at.slice(0, 10)}` });
  const RES_DE = { erhebliche_maengel: 'erhebliche Mängel', gefaehrliche_maengel: 'gefährliche Mängel', verkehrsunsicher: 'verkehrsunsicher' };
  for (const d of defects.results) items.push({ check: 'inspection_defects_no_case', severity: CHECKS.inspection_defects_no_case, vehicle_id: d.vehicle_id, plate: d.plate, event_id: d.id, detail: `${d.kind} ${d.done_date.split('-').reverse().join('.')} · ${RES_DE[d.result]}` });
  for (const d of again.results) items.push({ check: 'reinspection_defects_again', severity: CHECKS.reinspection_defects_again, vehicle_id: d.vehicle_id, plate: d.plate, event_id: d.id,
    detail: `${d.kind} ${d.done_date.split('-').reverse().join('.')} · ${RES_DE[d.result]} · Mängelauftrag ${d.case_no} zur Prüfung vom ${d.first_date.split('-').reverse().join('.')}` });
  for (const d of noResult.results) items.push({ check: 'inspection_no_result', severity: CHECKS.inspection_no_result, vehicle_id: d.vehicle_id, plate: d.plate, event_id: d.id, detail: `${d.kind} ${d.done_date.split('-').reverse().join('.')}` });
  for (const r of ldocs.results) { const v = vById.get(r.vehicle_id); if (v) add('leasing_doc_no_contract', v); }
  const addD = (check, d, detail = null) => items.push({ check, severity: CHECKS[check], vehicle_id: null, plate: null, driver_id: d.id, driver_name: d.display_name, detail });
  for (const d of drv.results) {
    if (d.user_id && !d.u_active) addD('driver_account_inactive', d);
    if (!d.has_license) addD('driver_no_license', d);
    if (d.has_card && !d.has_download) addD('driver_card_no_download', d);
  }
  for (const u of acc.results) items.push({ check: 'driver_account_no_file', severity: CHECKS.driver_account_no_file, vehicle_id: null, plate: null, detail: u.display_name });
  for (const u of invites.results) items.push({ check: 'invite_pending', severity: CHECKS.invite_pending, vehicle_id: null, plate: null, detail: `${u.display_name} (${u.role})${u.expires_at < nowIso() ? ' – Einladung abgelaufen' : ''}` });
  const rank = { fehler: 0, luecke: 1, hinweis: 2 };
  items.sort((a, b) => rank[a.severity] - rank[b.severity] || a.check.localeCompare(b.check) || String(a.plate || a.driver_name).localeCompare(String(b.plate || b.driver_name)));
  // optional nur ein Standort laut Fahrzeugstamm: fahrzeugbezogene Befunde dieses Standorts; Personen-/Konto-/Einladungsbefunde
  // haben keinen Standort und werden dann nur gezählt (other_hidden) – sichtbar mit „Alle“
  const sel = siteSelection(vs, query.site);
  let shown = items; let otherHidden = 0; let checked = vs.length;
  if (sel.site) {
    const siteOf = new Map((await env.DB.prepare('SELECT id, site FROM vehicles').all()).results.map((v) => [v.id, v.site]));
    shown = items.filter((i) => i.vehicle_id && sel.match(siteOf.get(i.vehicle_id)));
    otherHidden = items.filter((i) => !i.vehicle_id).length;
    checked = vs.filter((v) => sel.match(v.site)).length;
  }
  const counts = {};
  for (const i of shown) counts[i.check] = (counts[i.check] || 0) + 1;
  return { generated_at: nowIso(), environment: envName, stale_days: staleDays, vehicles_checked: checked, site: sel.site, site_options: sel.options, other_hidden: otherHidden, counts, items: shown };
}
