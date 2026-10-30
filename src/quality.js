// [CLAUDE] Datenqualität (Einführungsphase): prüft Stammdaten und Zuordnungen auf Lücken und Widersprüche.
// Nur Befunde aus gespeicherten Daten – es wird nichts geändert und nichts ergänzt.
import { forbidden, nowIso, addMonths, berlinDate, berlinWindowStartIso, berlinDateTime, berlinDaySql, normPlate, caseVariants, intParam } from './util.js';

// Unfall-Wortstämme auf Ukrainisch: lower() wirkt in SQLite/D1 nur auf A–Z – daher alle Schreibweisen (klein, GROSS, Anfang groß)
// einzeln suchen („АВАРІЯ“, „Дтп“ wurden vorher nicht erkannt). Deutsch/Englisch genügt lower().
// nur Formen des Substantivs „аварія“ – „аварійн…“ (Warnblinkanlage, Notschalter) ist kein Unfall (18.10.2026);
// dazu russ. „авария“ (diktierte Meldungen russischsprachiger Fahrer, „аварийка“ = Warnblinker bleibt außen vor) – gleiche Wörter wie
// ACC_HINT im Meldeformular (`public/app.js`, Backlog 228, 24.10.2026; ein Test vergleicht beide)
export const ACC_WORDS_CYR = ['аварія', 'аварії', 'аварію', 'аварією', 'авария', 'аварии', 'аварию', 'аварией', 'дтп'];
const ACC_CYR = [...new Set(ACC_WORDS_CYR.flatMap(caseVariants))];
// Backlog 631 (Blickwinkel „Diebstahl über Nacht auf dem Rastplatz“): Diebstahl ohne Versicherungsfall – Wortstämme wie THEFT_HINT im
// Meldeformular (ohne „Einbruch“: „Leistungseinbruch“); Deutsch/Englisch per lower(), Ukrainisch/Russisch in allen Schreibweisen
export const THEFT_WORDS_LAT = ['diebstahl', 'gestohlen', 'geklaut', 'entwendet', 'abgezapft', 'aufgebrochen', 'theft', 'stolen', 'siphon'];
export const THEFT_WORDS_CYR = ['крадіж', 'вкрал', 'викрал', 'вкрад', 'викрад', 'украл', 'украд'];
const THEFT_CYR = [...new Set(THEFT_WORDS_CYR.flatMap(caseVariants))];
// Backlog 655 (Blickwinkel „Parkschaden – Unfallgegner unbekannt (Unfallflucht)“): Wortstämme wie HITRUN_HINT im Meldeformular (ein Test vergleicht beide)
export const HITRUN_WORDS_LAT = ['fahrerflucht', 'unfallflucht', 'parkschaden', 'hit and run', 'hit-and-run', 'fled the scene'];
export const HITRUN_WORDS_CYR = ['втік', 'втекл', 'втеча', 'втечі', 'втечу', 'скрылся', 'скрылась'];
const HITRUN_CYR = [...new Set(HITRUN_WORDS_CYR.flatMap(caseVariants))];
const hitrunSql = () => `(${HITRUN_WORDS_LAT.map(() => 'instr(lower(c.description),?)>0').join(' OR ')} OR ${HITRUN_CYR.map(() => 'instr(c.description,?)>0').join(' OR ')})`;
import { siteKey, siteLabels, siteSelection } from './reports.js';
import { REQUIRED_KINDS, REQUIRED_KINDS_TRAILER, defectsWithoutCaseQuery, noResultQuery } from './maintenance.js';
import { spRequired, loadHuSpInputs, huSpFor } from './inspection_rules.js';

// Schweregrad: fehler = widersprüchlich, luecke = fehlt für Auswertungen, hinweis = sollte gepflegt werden
export const CHECKS = {
  duplicate_plate: 'fehler', vin_similar: 'fehler', trailer_unknown: 'fehler', trailer_multi: 'fehler', assignment_inactive_user: 'fehler',
  // Fahrzeughinweis eines deaktivierten Kontos noch aktiv (Backlog 563) – Inhalt prüfen, ggf. archivieren
  note_inactive_author: 'hinweis',
  missing_site: 'luecke', no_km: 'luecke', km_stale: 'hinweis', missing_inspection: 'luecke',
  km_inspection_rejected: 'hinweis',
  // km-Stand kleiner als der vorherige, ohne Begründung gespeichert (z. B. Tippfehler bei „Prüfung erledigt“) – km-Fälligkeiten werden „ungeklärt“
  km_drop_unexplained: 'hinweis', missing_manufacturer: 'hinweis', missing_build_year: 'hinweis', invite_pending: 'hinweis', trailer_without_truck: 'hinweis',
  // fest gekoppeltes Gespann (Stammliste), aber Lkw und Anhänger mit unterschiedlichem Standort – Stammdaten prüfen
  coupled_site_mismatch: 'hinweis',
  // Anhängerkennzeichen an der Zugmaschine gehört zu einem außer Betrieb genommenen Anhänger – Stammliste nachziehen (23.10.2026)
  trailer_inactive: 'hinweis',
  // gleicher Standort in abweichender Schreibweise (Dortmund/DORTMUND) – Auswertungen fassen sie zusammen, Stammdaten vereinheitlichen
  site_spelling: 'hinweis',
  // Fahrerakte & Auslesungen
  driver_account_inactive: 'fehler', driver_no_license: 'luecke', driver_card_no_download: 'luecke', vu_no_download: 'hinweis', driver_account_no_file: 'hinweis', driver_account_file_inactive: 'fehler',
  // Fahrzeugverträge
  contract_vehicle_inactive: 'fehler', contract_km_no_reading: 'luecke',
  // letzter km-Stand unter „km bei Übernahme“ (Tippfehler im Vertrag oder Zähler) – Kontingent wird sonst nie überwacht (17.10.2026)
  contract_km_below_start: 'fehler', leasing_doc_no_contract: 'hinweis', contract_no_document: 'hinweis',
  // zwei laufende Leasing-/Miet-/Finanzierungsverträge desselben Fahrzeugs mit überschneidender Laufzeit – Raten zählen in Übersicht/Kostenbericht
  // doppelt (z. B. Vorgänger nicht beendet). Versicherung/Wartung/Sonstiges ausgenommen (mehrere Policen nebeneinander üblich). 19.10.2026
  contract_overlap: 'hinweis',
  // Versicherungsfälle
  accident_no_claim: 'hinweis',
  // Backlog 631: Vorgang nennt Diebstahl (DE/UK/EN), kein Versicherungsfall – nur Hinweis (Polizeianzeige/Teilkasko klären), Unfall-Vorgänge nur dort
  theft_no_claim: 'hinweis',
  // Backlog 655: offener Versicherungsfall, Vorgang nennt Unfallflucht/Parkschaden, keine Angabe zur polizeilichen Anzeige – nur Hinweis
  claim_hitrun_no_police: 'hinweis',
  // offener Versicherungsfall ohne Schadenzeitpunkt am Vorgang (Backlog 285) – im Vorgang „Schadenzeitpunkt“ nachtragen
  claim_no_occurred: 'hinweis',
  // Backlog 399: Reifengröße der Antriebsachse nach der letzten Tachographenprüfung geändert (Protokoll `tires.spec`) – Prüfung nach § 57b StVZO klären
  tire_size_after_tacho: 'hinweis',
  // Backlog 400: aktives Fahrzeug, für das ein Kfz-Versicherungsvertrag erfasst ist, aber keiner läuft (beendet/Ende überschritten); ohne je erfassten Vertrag kein Hinweis
  insurance_none_running: 'hinweis',
  insurance_gap: 'hinweis', // Backlog 623: Lücke im erfassten Versicherungsschutz
  // Prüfergebnis mit erheblichen/gefährlichen Mängeln bzw. verkehrsunsicher, aber kein Vorgang zum Fahrzeug seit der Prüfung
  inspection_defects_no_case: 'luecke',
  // Nachprüfung nach freigegebenem Mängelauftrag zeigt erneut erhebliche/gefährliche Mängel bzw. verkehrsunsicher (Wiederholungsmangel)
  reinspection_defects_again: 'luecke',
  // in der App erfasste Pflichtprüfung (≤ 180 Tage, neueste ihrer Art) ohne Prüfergebnis – Ergebnis in der Fahrzeugakte nachtragen
  inspection_no_result: 'hinweis',
  // Wartungsregel mit Intervall km, aber ohne km-Stand der letzten Durchführung und ohne belegte km-Fälligkeit – km-Fälligkeit nicht berechenbar
  km_rule_no_base: 'luecke',
  // Telematik-Gerät (zugeordnet über FIN oder bestätigtes Mapping) meldet beim letzten Stand ein anderes Kennzeichen als das Fahrzeug
  telematics_plate_mismatch: 'fehler',
  // letzter Telematik-km-Stand kleiner als der zuvor erfasste km-Stand – wird nicht in die Akte übernommen (Gerätezähler/Zuordnung prüfen)
  telematics_km_rejected: 'hinweis',
  // Telematik-Gerät liefert nach dem Zeitpunkt „außer Betrieb genommen“ (Protokoll) weiter Daten – verkauft/abgemeldet? Zuordnung bzw. Gerät prüfen
  telematics_vehicle_inactive: 'hinweis',
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

// Höchstzahl Befunde je Listen-Prüfung (Kontroll-km, Unfall ohne Versicherungsfall, Prüfmängel, Wiederholungsmangel, Prüfergebnis fehlt).
// Gelesen wird eine Zeile mehr: dann steht fest, dass es weitere gibt → truncated_checks (App zeigt Hinweis statt still abzuschneiden).
export const DQ_MAX = 200;

export async function dataQuality(env, user, envName, query = {}) {
  if (!['owner', 'fleet'].includes(user.role)) throw forbidden();
  const staleDays = intParam(query.stale_days, 90, 7, 730);
  const staleBefore = berlinWindowStartIso(staleDays);
  // Standortfilter VOR den Listen-Grenzen (18.10.2026: vorher erst danach – ein Standort mit älteren Befunden wirkte bei mehr als
  // 200 neueren anderer Standorte fehlerfrei, wie in maintenance.js am 18.10. behoben): JSON-Liste der Fahrzeug-IDs des Standorts
  let siteOf = null; let vf = null; let sel0 = null;
  if (query.site) {
    const all = (await env.DB.prepare('SELECT id, site, active, eval_excluded FROM vehicles').all()).results;
    siteOf = new Map(all.map((v) => [v.id, v.site]));
    sel0 = siteSelection(all.filter((v) => v.active && !v.eval_excluded), query.site);
    if (sel0.site) vf = JSON.stringify(all.filter((v) => sel0.match(v.site)).map((v) => v.id));
  }
  const VF = vf ? 'AND i.vehicle_id IN (SELECT value FROM json_each(?))' : '';
  const [veh, kms, rules, assigns, invites, drv, acc, vu, insKm, vins, ctr, ldocs, acc365, defects, again, noResult, telPlates, claimNoOcc, tireTacho, insNone, insAll, theft365, hitrunNoPol] = await Promise.all([
    // aktive Fahrzeuge inkl. ruhender (nur für die Anhänger-Suche; Prüfungen laufen über die bewerteten)
    // dazu außer Betrieb genommene Anhänger (nur für „Anhänger außer Betrieb“, 23.10.2026) – gleich danach abgetrennt
    env.DB.prepare(`SELECT id, plate, kind, site, manufacturer, build_year, trailer_plate, zgm_class, zgm_kg, eval_excluded, active FROM vehicles WHERE active=1 OR kind='anhaenger'`).all(),
    // letzter km-Stand je Fahrzeug; dazu der späteste Rücksprung OHNE Begründung (Ablesung kleiner als die unmittelbar vorherige, z. B. aus
    // „Prüfung erledigt“ oder Import – die Akte verlangt sonst eine Begründung) mit Anzahl – eine Abfrage (Abfragebudget)
    env.DB.prepare(`WITH u AS (SELECT vehicle_id, km, km_drop_prev AS prev_km, measured_at, source, ROW_NUMBER() OVER (PARTITION BY vehicle_id ORDER BY measured_at DESC) AS rn, COUNT(*) OVER (PARTITION BY vehicle_id) AS n
        FROM odometer_readings WHERE km_drop_prev IS NOT NULL AND (note IS NULL OR trim(note) = ''))
      SELECT k.vehicle_id, k.last, u.km AS drop_km, u.prev_km AS drop_prev_km, u.measured_at AS drop_at, u.source AS drop_source, u.n AS drop_n
      FROM (SELECT vehicle_id, MAX(measured_at) AS last FROM odometer_readings GROUP BY vehicle_id) k LEFT JOIN u ON u.vehicle_id = k.vehicle_id AND u.rn = 1`).all(),
    env.DB.prepare(`SELECT vehicle_id, kind, next_due_date, interval_km, last_done_km, due_km FROM maintenance_rules WHERE next_due_date IS NOT NULL OR kind IN ('HU','SP')
      OR (interval_km IS NOT NULL AND last_done_km IS NULL AND due_km IS NULL AND kind NOT IN ('HU','SP'))`).all(),
    env.DB.prepare(`SELECT d.id, d.vehicle_id, v.plate, u.display_name, u.active FROM driver_vehicles d JOIN users u ON u.id=d.user_id JOIN vehicles v ON v.id=d.vehicle_id
      WHERE u.environment=? AND v.active=1 AND v.eval_excluded=0 AND (d.valid_to IS NULL OR d.valid_to > ?)`).bind(envName, nowIso()).all(),
    // gültiger Link nach derselben Regel wie die Benutzerliste (nicht entwertet, Aussteller darf dieses Konto noch einladen) – vorher zählte
    // auch ein beim Deaktivieren entwerteter Link, die Datenqualität zeigte ihn bis zu 7 Tage als offen, die Benutzerliste „abgelaufen“ (20.10.2026)
    env.DB.prepare(`SELECT u.id, u.display_name, u.role, (SELECT MAX(i.expires_at) FROM invites i WHERE i.user_id=u.id AND i.used_at IS NULL
        AND (i.created_by IS NULL OR EXISTS (SELECT 1 FROM users c WHERE c.id=i.created_by AND c.active=1 AND (c.role='owner' OR (c.role='fleet' AND u.role IN ('driver','workshop','viewer') AND u.environment=c.environment))))) AS expires_at
      FROM users u WHERE u.environment=? AND u.active=1 AND u.password_hash IS NULL AND EXISTS (SELECT 1 FROM invites i WHERE i.user_id=u.id)`).bind(envName).all(),
    env.DB.prepare(`SELECT d.id, d.display_name, d.user_id, u.active AS u_active,
      EXISTS(SELECT 1 FROM driver_documents x WHERE x.driver_id=d.id AND x.kind='fuehrerschein' AND x.superseded=0) AS has_license,
      EXISTS(SELECT 1 FROM driver_documents x WHERE x.driver_id=d.id AND x.kind='fahrerkarte' AND x.superseded=0) AS has_card,
      EXISTS(SELECT 1 FROM tacho_downloads t WHERE t.driver_id=d.id AND t.cancelled_at IS NULL) AS has_download
      FROM drivers d LEFT JOIN users u ON u.id=d.user_id WHERE d.environment=? AND d.active=1`).bind(envName).all(),
    // aktives Fahrerkonto, dessen Akte ausgeschieden (inaktiv) ist (Backlog 191): eigener Fehler – Konto arbeitete weiter (Push, Meldungen)
    env.DB.prepare(`SELECT u.id, u.display_name, EXISTS (SELECT 1 FROM drivers d WHERE d.user_id=u.id) AS has_file FROM users u WHERE u.environment=? AND u.role='driver' AND u.active=1 AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.user_id=u.id AND d.active=1)`).bind(envName).all(),
    env.DB.prepare(`SELECT DISTINCT vehicle_id FROM tacho_downloads WHERE environment=? AND vehicle_id IS NOT NULL AND cancelled_at IS NULL`).bind(envName).all(),
    // nur aktive, bewertete Fahrzeuge schon in SQL – ruhende/außer Betrieb verbrauchten sonst die Grenze (18.10.2026)
    // Kontrollen im Zeitraum, deren km-Stand kleiner war als der zuvor erfasste (nicht in die Akte übernommen) – zur Klärung;
    // seit 17.10.2026 auch größer als ein später erfasster Stand (nachgereichte Offline-Kontrolle), sofern nicht übernommen
    env.DB.prepare(`SELECT * FROM (SELECT i.vehicle_id, i.odometer_km, i.created_at,
      (SELECT o.km FROM odometer_readings o WHERE o.vehicle_id=i.vehicle_id AND o.measured_at <= i.created_at ORDER BY o.measured_at DESC LIMIT 1) AS prev_km,
      (SELECT o.km FROM odometer_readings o WHERE o.vehicle_id=i.vehicle_id AND o.measured_at > i.created_at ORDER BY o.measured_at ASC LIMIT 1) AS next_km,
      (SELECT MAX(o.km) FROM odometer_readings o WHERE o.vehicle_id=i.vehicle_id AND o.measured_at > i.created_at) AS later_max_km,
      EXISTS (SELECT 1 FROM odometer_readings o WHERE o.vehicle_id=i.vehicle_id AND o.km=i.odometer_km AND o.source LIKE 'kontrolle:%') AS taken
      FROM inspections i JOIN vehicles v ON v.id=i.vehicle_id AND v.active=1 AND v.eval_excluded=0 WHERE i.environment=? AND i.odometer_km IS NOT NULL AND i.created_at >= ? ${VF})
      -- kleiner als der vorige Stand: geklärt, sobald danach irgendein Stand ≥ dem vorigen erfasst ist (der Kontrollwert war der Tippfehler; 22.10.2026 – blieb sonst bis zum Ablauf des Zeitraums stehen)
      WHERE (prev_km IS NOT NULL AND odometer_km < prev_km AND NOT (later_max_km IS NOT NULL AND later_max_km >= prev_km)) OR (next_km IS NOT NULL AND odometer_km > next_km AND NOT taken) ORDER BY created_at DESC LIMIT ${DQ_MAX + 1}`).bind(envName, staleBefore, ...(vf ? [vf] : [])).all(),
    // alle aktiven Fahrzeuge inkl. ruhender: fast gleiche FIN deutet auf Tippfehler/Doppelanlage hin
    env.DB.prepare('SELECT id, vin, plate, eval_excluded FROM vehicles WHERE active=1 AND vin IS NOT NULL').all(),
    // laufende Verträge (auch an Fahrzeugen außer Betrieb) mit letztem km-Stand
    env.DB.prepare(`SELECT c.id, c.vehicle_id, c.kind, c.partner, c.contract_no, c.km_allowance, c.start_date, c.end_date, c.start_km, c.file_id, v.plate, v.active,
      (SELECT MAX(o.measured_at) FROM odometer_readings o WHERE o.vehicle_id=c.vehicle_id) AS last_km_at,
      (SELECT o.km FROM odometer_readings o WHERE o.vehicle_id=c.vehicle_id ORDER BY o.measured_at DESC, o.created_at DESC LIMIT 1) AS last_km,
      -- begründeter km-Rücksprung (Tachotausch) seit Vertragsbeginn und nach der letzten Prüfung „km bei Übernahme“: Zählerwechsel, kein Tippfehler
      -- (wie die Vertragsseite, Status „zaehler“; 20.10.2026)
      EXISTS (SELECT 1 FROM odometer_readings o WHERE o.vehicle_id=c.vehicle_id AND c.start_km IS NOT NULL AND o.km < c.start_km AND o.note IS NOT NULL AND trim(o.note)<>''
        AND (c.start_date IS NULL OR ${berlinDaySql('o.measured_at')} >= c.start_date) AND (c.km_basis_at IS NULL OR o.created_at > c.km_basis_at)) AS reasoned_drop
      FROM vehicle_contracts c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.ended_on IS NULL AND v.eval_excluded=0`).all(),
    // Leasing-/Mietdokumente ohne erfassten Vertrag dieser Art
    env.DB.prepare(`SELECT DISTINCT f.vehicle_id FROM files f WHERE f.environment=? AND f.case_id IS NULL AND f.doc_kind='leasing'
      AND NOT EXISTS (SELECT 1 FROM vehicle_contracts c WHERE c.vehicle_id=f.vehicle_id AND c.kind IN ('leasing','miete','finanzierung'))`).bind(envName).all(),
    // Vorgänge der letzten 365 Tage, deren Beschreibung „Unfall“ nennt (DE/UK/EN), ohne erfassten Versicherungsfall – nur Hinweis (Wortsuche, keine Bewertung).
    // Abgelehnte Meldungen nicht, wohl aber „ohne Reparatur beendete“ Werkstattaufträge (abgelehnt mit Werkstatt, z. B. Totalschaden – Backlog 211)
    env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate, c.created_at FROM cases c JOIN vehicles v ON v.id=c.vehicle_id
      WHERE c.environment=? AND c.created_at >= ? AND (c.status<>'abgelehnt' OR c.workshop_site IS NOT NULL) AND v.eval_excluded=0
      AND (instr(lower(c.description),'unfall')>0 OR instr(lower(c.description),'accident')>0 OR ${ACC_CYR.map(() => 'instr(c.description,?)>0').join(' OR ')} OR ${hitrunSql()})
      AND NOT EXISTS (SELECT 1 FROM insurance_claims ic WHERE ic.case_id=c.id) ${vf ? 'AND c.vehicle_id IN (SELECT value FROM json_each(?))' : ''} ORDER BY c.created_at DESC LIMIT ${DQ_MAX + 1}`).bind(envName, berlinWindowStartIso(365), ...ACC_CYR, ...HITRUN_WORDS_LAT, ...HITRUN_CYR, ...(vf ? [vf] : [])).all(),
    // Prüfungen der letzten 12 Monate mit Ergebnis erhebliche/gefährliche Mängel bzw. verkehrsunsicher ohne Vorgang zum Fahrzeug seit dem Prüfdatum
    defectsWithoutCaseQuery(env, envName, DQ_MAX + 1, vf).all(),
    // Nachprüfung (nächste spätere Durchführung derselben Prüfart, ≤ 12 Monate, am/nach dem Freigabetag des Mängelauftrags) erneut mit erheblichen Mängeln
    env.DB.prepare(`SELECT n.id, n.vehicle_id, v.plate, n.kind, n.done_date, n.result, e.done_date AS first_date, MAX(c.case_no) AS case_no
      FROM maintenance_events e JOIN cases c ON c.maintenance_event_id=e.id AND c.environment=? AND c.status='fahrzeug_freigegeben'
      JOIN maintenance_events n ON n.id = (SELECT x.id FROM maintenance_events x WHERE x.vehicle_id=e.vehicle_id AND x.kind=e.kind AND (x.kind NOT IN ('Rückruf','Sonstiges') OR x.rule_id=e.rule_id) AND x.id<>e.id
        AND (x.done_date > e.done_date OR (x.done_date = e.done_date AND x.created_at > e.created_at)) ORDER BY x.done_date, x.created_at LIMIT 1)
      JOIN vehicles v ON v.id=e.vehicle_id
      WHERE v.active=1 AND v.eval_excluded=0 AND n.done_date >= ? AND ${berlinDaySql('c.closed_at')} <= n.done_date
      AND n.result IN ('erhebliche_maengel','gefaehrliche_maengel','verkehrsunsicher') ${vf ? 'AND n.vehicle_id IN (SELECT value FROM json_each(?))' : ''}
      GROUP BY n.id ORDER BY n.done_date DESC LIMIT ${DQ_MAX + 1}`).bind(envName, addMonths(berlinDate(), -12), ...(vf ? [vf] : [])).all(), // Berliner Tag (20.10.2026: vorher UTC-Datum, 00–02 Uhr ein Tag mehr)    // Pflichtprüfung in der App erfasst/erledigt (≤ 180 Tage), neueste ihrer Art, ohne Prüfergebnis (Importe/Bestand bewusst ausgenommen)
    noResultQuery(env, null, DQ_MAX + 1, vf).all(),
    // letzter Telematik-Stand je Fahrzeug und Anbieter mit vom Gerät gemeldetem Kennzeichen (Vergleich in JS: Schreibweise egal)
    // dazu km des letzten Stands und der davor zuletzt erfasste km-Stand (gleiche Plausibilitätsregel wie die Einspeisung)
    // außerdem: Stände außer Betrieb genommener Fahrzeuge mit dem letzten Zeitpunkt „außer Betrieb genommen“ laut Protokoll (ohne Protokolleintrag kein Befund)
    // sowie der nächste spätere unbegründete km-Stand (nachgereichter Telematikwert größer → ebenfalls nicht übernommen, 17.10.2026)
    env.DB.prepare(`SELECT t.vehicle_id, t.provider, t.external_id, t.source_plate, t.km, t.gps_time, COALESCE(t.km_at, t.gps_time) AS km_time, p.km AS prev_km, p.measured_at AS prev_at,
      (SELECT json_object('km', o.km, 'at', o.measured_at, 'note', o.note) FROM odometer_readings o WHERE o.vehicle_id=t.vehicle_id AND o.measured_at > COALESCE(t.km_at, t.gps_time) ORDER BY o.measured_at ASC LIMIT 1) AS next_json,
      v.active AS v_active, v.plate AS v_plate,
      CASE WHEN v.active=0 THEN (SELECT MAX(a.created_at) FROM audit_log a WHERE a.target=t.vehicle_id AND a.action='vehicle.deactivate') END AS deact_at
      FROM telematics_latest t JOIN vehicles v ON v.id=t.vehicle_id
      LEFT JOIN odometer_readings p ON p.id = (SELECT o.id FROM odometer_readings o WHERE o.vehicle_id=t.vehicle_id AND o.measured_at <= COALESCE(t.km_at, t.gps_time) ORDER BY o.measured_at DESC LIMIT 1)
      WHERE t.source_plate IS NOT NULL OR (t.km IS NOT NULL AND t.gps_time IS NOT NULL) OR v.active=0`).all(),
    // Backlog 285: offener Versicherungsfall, dessen Vorgang (Meldung) keinen Schadenzeitpunkt nennt – Versicherer fragen das Schadendatum ab
    env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate, ic.reported_on FROM insurance_claims ic JOIN cases c ON c.id=ic.case_id JOIN vehicles v ON v.id=ic.vehicle_id
      WHERE ic.environment=? AND ic.status IN ('gemeldet','in_pruefung') AND (c.origin='meldung' OR (c.origin='kontrolle' AND c.check_item IS NOT NULL AND c.parent_case_id IS NULL)) AND c.occurred_at IS NULL AND v.eval_excluded=0
      ${vf ? 'AND ic.vehicle_id IN (SELECT value FROM json_each(?))' : ''} ORDER BY ic.reported_on DESC LIMIT ${DQ_MAX + 1}`).bind(envName, ...(vf ? [vf] : [])).all(),
    // Backlog 399: Größenänderungen der Antriebsachse (Protokoll, Index target/action) nach dem Tag der letzten Tachographenprüfung; nur Fahrzeuge mit erfasster Prüfung
    env.DB.prepare(`SELECT m.vehicle_id, v.plate, m.last_done_date, a.created_at, a.detail FROM maintenance_rules m JOIN vehicles v ON v.id=m.vehicle_id
      JOIN audit_log a ON a.target=m.vehicle_id AND a.action='tires.spec' AND a.created_at >= m.last_done_date
      WHERE m.kind='Tachograph' AND m.last_done_date IS NOT NULL AND v.active=1 AND v.eval_excluded=0 AND ${berlinDaySql('a.created_at')} > m.last_done_date
      ${vf ? 'AND m.vehicle_id IN (SELECT value FROM json_each(?))' : ''} ORDER BY a.created_at DESC LIMIT ${DQ_MAX * 4}`).bind(...(vf ? [vf] : [])).all(),
    env.DB.prepare(`SELECT v.id AS vehicle_id, v.plate, (SELECT json_object('partner', c.partner, 'no', c.contract_no, 'end', COALESCE(c.ended_on, c.end_date)) FROM vehicle_contracts c
        WHERE c.vehicle_id=v.id AND c.kind='versicherung' ORDER BY COALESCE(c.ended_on, c.end_date) DESC LIMIT 1) AS last_json
      FROM vehicles v WHERE v.active=1 AND v.eval_excluded=0 AND EXISTS (SELECT 1 FROM vehicle_contracts c WHERE c.vehicle_id=v.id AND c.kind='versicherung')
      AND NOT EXISTS (SELECT 1 FROM vehicle_contracts c WHERE c.vehicle_id=v.id AND c.kind='versicherung' AND (c.ended_on IS NULL OR c.ended_on >= ?) AND (c.end_date IS NULL OR c.end_date >= ?))
      ${vf ? 'AND v.id IN (SELECT value FROM json_each(?))' : ''} ORDER BY v.plate LIMIT ${DQ_MAX + 1}`).bind(berlinDate(), berlinDate(), ...(vf ? [vf] : [])).all(),
    // Backlog 623: alle Versicherungsverträge aktiver, bewerteter Fahrzeuge (Lücke beim Versichererwechsel) + Vorwarnzeit Verträge
    env.DB.prepare(`SELECT c.vehicle_id, v.plate, c.partner, c.contract_no, c.start_date, COALESCE(c.ended_on, c.end_date) AS eff_end, (SELECT value FROM settings WHERE key='contract_warn_days') AS warn
      FROM vehicle_contracts c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.kind='versicherung' AND v.active=1 AND v.eval_excluded=0
      ${vf ? 'AND c.vehicle_id IN (SELECT value FROM json_each(?))' : ''}`).bind(...(vf ? [vf] : [])).all(),
    // Backlog 631: wie acc365, aber Diebstahl-Wörter; Vorgänge, die auch „Unfall“ nennen, meldet bereits accident_no_claim
    env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate, c.created_at FROM cases c JOIN vehicles v ON v.id=c.vehicle_id
      WHERE c.environment=? AND c.created_at >= ? AND (c.status<>'abgelehnt' OR c.workshop_site IS NOT NULL) AND v.eval_excluded=0
      AND (${THEFT_WORDS_LAT.map(() => 'instr(lower(c.description),?)>0').join(' OR ')} OR ${THEFT_CYR.map(() => 'instr(c.description,?)>0').join(' OR ')})
      AND NOT (instr(lower(c.description),'unfall')>0 OR instr(lower(c.description),'accident')>0 OR ${ACC_CYR.map(() => 'instr(c.description,?)>0').join(' OR ')})
      AND NOT EXISTS (SELECT 1 FROM insurance_claims ic WHERE ic.case_id=c.id) ${vf ? 'AND c.vehicle_id IN (SELECT value FROM json_each(?))' : ''} ORDER BY c.created_at DESC LIMIT ${DQ_MAX + 1}`).bind(envName, berlinWindowStartIso(365), ...THEFT_WORDS_LAT, ...THEFT_CYR, ...ACC_CYR, ...(vf ? [vf] : [])).all(),
    // Backlog 655: offener Versicherungsfall (gemeldet/in Prüfung) zu einer Unfallflucht ohne Dienststelle, Aktenzeichen und Anzeigedatum
    env.DB.prepare(`SELECT c.id, c.case_no, c.vehicle_id, v.plate, ic.reported_on FROM insurance_claims ic JOIN cases c ON c.id=ic.case_id JOIN vehicles v ON v.id=ic.vehicle_id
      WHERE ic.environment=? AND ic.status IN ('gemeldet','in_pruefung') AND v.eval_excluded=0 AND ${hitrunSql()}
      AND (ic.police_station IS NULL OR trim(ic.police_station)='') AND (ic.police_ref IS NULL OR trim(ic.police_ref)='') AND ic.police_reported_on IS NULL
      ${vf ? 'AND ic.vehicle_id IN (SELECT value FROM json_each(?))' : ''} ORDER BY ic.reported_on DESC LIMIT ${DQ_MAX + 1}`).bind(envName, ...HITRUN_WORDS_LAT, ...HITRUN_CYR, ...(vf ? [vf] : [])).all(),
  ]);
  const offTrailers = new Map(veh.results.filter((v) => !v.active).map((v) => [normPlate(v.plate), v]));
  veh.results = veh.results.filter((v) => v.active);
  const truncatedChecks = [];
  for (const [check, res] of [['km_inspection_rejected', insKm], ['accident_no_claim', acc365], ['theft_no_claim', theft365], ['claim_hitrun_no_police', hitrunNoPol], ['inspection_defects_no_case', defects], ['reinspection_defects_again', again], ['inspection_no_result', noResult], ['claim_no_occurred', claimNoOcc], ['insurance_none_running', insNone]]) {
    if (res.results.length > DQ_MAX) { truncatedChecks.push(check); res.results = res.results.slice(0, DQ_MAX); }
  }
  const vs = veh.results.filter((v) => !v.eval_excluded);
  // Anhänger laut Stammliste auch unter ruhenden Fahrzeugen suchen (wie die Kopplung in der Fahrzeugakte) – vorher „Anhänger unbekannt“ (17.10.2026)
  const byPlateAll = new Map();
  for (const v of veh.results) { const k = normPlate(v.plate); byPlateAll.set(k, [...(byPlateAll.get(k) || []), v]); }
  const items = [];
  const add = (check, v, detail = null) => items.push({ check, severity: CHECKS[check], vehicle_id: v && v.id || null, plate: v && v.plate || null, detail });
  const addA = (check, v, detail, detail_args) => items.push({ check, severity: CHECKS[check], vehicle_id: v && v.id || null, plate: v && v.plate || null, detail, detail_args });
  const byPlate = new Map();
  for (const v of vs) { const k = normPlate(v.plate); byPlate.set(k, [...(byPlate.get(k) || []), v]); }
  for (const [, list] of byPlate) if (list.length > 1) for (const v of list) add('duplicate_plate', v, list.filter((x) => x !== v).map((x) => x.id).join(', '));
  for (const [v, other, pos] of similarVins(vins.results)) addA('vin_similar', v, `${other.plate} · ${other.vin} · #${pos}`, { other_plate: other.plate, other_vin: other.vin, pos }); // App: „abweichende Stelle 17“ statt „#17“ (19.10.2026)
  const lastKm = new Map(kms.results.map((r) => [r.vehicle_id, r.last]));
  // Rücksprung ohne Begründung (alle aktiven, bewerteten Fahrzeuge, auch Anhänger mit km-Ständen) – Datum/Werte des spätesten, Anzahl
  for (const r of kms.results) {
    const v = r.drop_at ? vs.find((x) => x.id === r.vehicle_id) : null;
    if (v) addA('km_drop_unexplained', v, `${berlinDate(r.drop_at)}: ${r.drop_prev_km} → ${r.drop_km} km · ${r.drop_source}${r.drop_n > 1 ? ` · ${r.drop_n}×` : ''}`,
      { day: berlinDate(r.drop_at), prev_km: r.drop_prev_km, km: r.drop_km, source: r.drop_source, n: r.drop_n }); // App: Herkunft/km in der Sprache (19.10.2026: „wartung:Ölwechsel“)
  }
  // gleiche Lückenregel wie die Prüftermin-Übersicht: HU/SP-Eintrag zählt auch ohne Datum (Frist ungeklärt bzw. erste SP künftig),
  // nicht SP-pflichtige Fahrzeuge brauchen keine SP (vorher „SP fehlt“ bei Lkw bis 7,5 t, 17.10.2026)
  const hasRule = new Set(rules.results.filter((r) => r.next_due_date || r.kind === 'HU' || r.kind === 'SP').map((r) => `${r.vehicle_id}|${r.kind}`));
  for (const v of vs) if (spRequired(v) === false) hasRule.add(`${v.id}|SP`);
  // HU/SP ohne Eintrag, aber mit berechenbarer Frist (Backlog 93): zählt wie in der Prüftermin-Übersicht nicht als Lücke (3 Abfragen, nur wenn nötig)
  const needHs = vs.filter((v) => ['HU', 'SP'].some((k) => !hasRule.has(`${v.id}|${k}`)));
  if (needHs.length) {
    const today = berlinDate();
    for (const [vid, x] of await loadHuSpInputs(env, needHs.map((v) => v.id))) { const h = huSpFor(x, today, 30); if (h.hu && h.hu.due) hasRule.add(`${vid}|HU`); if (h.sp && (h.sp.due || h.sp.status === 'erste_sp_kuenftig')) hasRule.add(`${vid}|SP`);
      // Backlog 610: HU/SP „Frist ungeklärt“ ohne Datum bei belegter HU steht wie in der Prüftermin-Übersicht mit Grund unter „Frist ungeklärt“ (keine Lücke)
      for (const k of ['HU', 'SP']) { const y = k === 'HU' ? h.hu : h.sp; if (y && !y.due && y.status === 'ungeklaert' && h.hu.last_done && (y.notes || []).length) hasRule.add(`${vid}|${k}`); } }
  }
  const pulledBy = new Map();
  const siteLabel = siteLabels(vs);
  for (const v of vs) {
    if (!v.site) add('missing_site', v);
    // abweichende Leerzeichen (doppelt, geschützt aus Excel) zählen als abweichende Schreibweise (23.10.2026)
    else if (String(v.site).trim() !== siteLabel.get(siteKey(v.site))) add('site_spelling', v, `${String(v.site).trim()} → ${siteLabel.get(siteKey(v.site))}`);
    if (!v.manufacturer) add('missing_manufacturer', v);
    if (!v.build_year && v.kind === 'lkw') add('missing_build_year', v);
    if (v.kind === 'lkw') {
      const km = lastKm.get(v.id);
      if (!km) add('no_km', v); else if (km < staleBefore) add('km_stale', v, berlinDate(km));
      if (v.trailer_plate) {
        const t = (byPlate.get(normPlate(v.trailer_plate)) || []).find((x) => x.kind === 'anhaenger');
        const tAny = t || (byPlateAll.get(normPlate(v.trailer_plate)) || []).find((x) => x.kind === 'anhaenger');
        // Anhänger außer Betrieb genommen: eigener Hinweis statt „ohne Anhänger im Bestand“ (23.10.2026)
        if (!tAny && offTrailers.has(normPlate(v.trailer_plate))) add('trailer_inactive', v, v.trailer_plate);
        else if (!tAny) add('trailer_unknown', v, v.trailer_plate);
        else if (t) {
          pulledBy.set(t.id, [...(pulledBy.get(t.id) || []), v.plate]);
          if (v.site && t.site && siteKey(v.site) !== siteKey(t.site)) add('coupled_site_mismatch', v, `${v.site} · ${t.plate}: ${t.site}`);
        }
      }
    }
    const required = v.kind === 'anhaenger' ? REQUIRED_KINDS_TRAILER : REQUIRED_KINDS;
    const missing = required.filter((k) => !hasRule.has(`${v.id}|${k}`));
    if (missing.length) addA('missing_inspection', v, missing.join(', '), { kinds: missing }); // App übersetzt die Prüfarten (19.10.2026: UK/EN roh „Tachograph“)
  }
  const vAct = new Map(vs.map((v) => [v.id, v]));
  for (const r of rules.results) if (r.interval_km && r.last_done_km === null && r.due_km === null && !['HU', 'SP'].includes(r.kind) && vAct.has(r.vehicle_id)) addA('km_rule_no_base', vAct.get(r.vehicle_id), `${r.kind} · ${r.interval_km} km`, { kind: r.kind, interval_km: r.interval_km });
  // Anhänger eines ruhenden Lkw ist gekoppelt (Akte zeigt die Kopplung) – kein „keinem Lkw zugeordnet“; Mehrfach-Kopplung zählt nur bewertete
  const pulledByResting = new Set();
  for (const v of veh.results) if (v.eval_excluded && v.kind === 'lkw' && v.trailer_plate) for (const x of byPlateAll.get(normPlate(v.trailer_plate)) || []) if (x.kind === 'anhaenger') pulledByResting.add(x.id);
  for (const v of vs.filter((x) => x.kind === 'anhaenger')) {
    const trucks = pulledBy.get(v.id) || [];
    if (trucks.length > 1) add('trailer_multi', v, trucks.join(', '));
    if (!trucks.length && !pulledByResting.has(v.id)) add('trailer_without_truck', v);
  }
  const vById = new Map(vs.map((v) => [v.id, v]));
  for (const k of insKm.results) { const v = vById.get(k.vehicle_id); if (v) { const lt = k.prev_km !== null && k.odometer_km < k.prev_km; addA('km_inspection_rejected', v, lt ? `${k.odometer_km} km (${berlinDate(k.created_at)}) < ${k.prev_km} km` : `${k.odometer_km} km (${berlinDate(k.created_at)}) > ${k.next_km} km`,
    { km: k.odometer_km, day: berlinDate(k.created_at), other_km: lt ? k.prev_km : k.next_km, cmp: lt ? 'lt' : 'gt' }); } }
  for (const a of assigns.results) if (!a.active) items.push({ check: 'assignment_inactive_user', severity: CHECKS.assignment_inactive_user, vehicle_id: a.vehicle_id, plate: a.plate, detail: a.display_name });
  // Backlog 563 (Blickwinkel „neue Fuhrparkleiterin“): aktive Fahrzeughinweise eines deaktivierten Kontos – Inhalt prüfen (Hinweise für Fahrer zuerst)
  const nia = (await env.DB.prepare(`SELECT n.vehicle_id, v.plate, u.display_name, n.for_driver, n.text FROM vehicle_notes n JOIN users u ON u.id=n.created_by JOIN vehicles v ON v.id=n.vehicle_id
    WHERE n.environment=? AND n.archived_at IS NULL AND (n.valid_until IS NULL OR n.valid_until >= ?) AND u.active=0 AND v.active=1 ORDER BY n.for_driver DESC, n.created_at DESC`).bind(envName, berlinDate()).all()).results;
  for (const n of nia) {
    const txt = String(n.text || '').replace(/\s+/g, ' ').trim(); const clip = txt.length > 80 ? txt.slice(0, 79) + '…' : txt;
    items.push({ check: 'note_inactive_author', severity: CHECKS.note_inactive_author, vehicle_id: n.vehicle_id, plate: n.plate,
      detail: `${n.display_name}${n.for_driver ? ' · für Fahrer sichtbar' : ''}: ${clip}`, detail_args: { name: n.display_name, for_driver: !!n.for_driver, text: clip } });
  }
  const withVu = new Set(vu.results.map((r) => r.vehicle_id));
  for (const v of vs) if (v.kind === 'lkw' && !withVu.has(v.id)) add('vu_no_download', v);
  const CK_DE = { leasing: 'Leasing', miete: 'Miete', finanzierung: 'Finanzierung', versicherung: 'Versicherung', wartung: 'Wartungsvertrag', sonstiges: 'Vertrag' };
  for (const c of ctr.results) {
    const v = { id: c.vehicle_id, plate: c.plate };
    // detail bleibt deutsch (CSV, Integrations-API); detail_args sprachneutral für die Oberfläche (DE/UK/EN)
    const ca = { contract_kind: c.kind, partner: c.partner };
    if (!c.active) addA('contract_vehicle_inactive', v, `${CK_DE[c.kind]} · ${c.partner}`, ca);
    // Vertrag beginnt erst künftig: eine Ablesung ab Beginn kann es noch nicht geben – keine Lücke (18.10.2026)
    else if (c.km_allowance && !(c.start_date && c.start_date > berlinDate()) && (!c.last_km_at || (c.start_date && berlinDate(c.last_km_at) < c.start_date))) addA('contract_km_no_reading', v, `${CK_DE[c.kind]} · ${c.partner}`, ca);
    else if (c.km_allowance && c.start_km !== null && c.last_km !== null && c.last_km < c.start_km && !c.reasoned_drop) addA('contract_km_below_start', v, `${CK_DE[c.kind]} · ${c.partner} · ${c.last_km} km < ${c.start_km} km`, { ...ca, km: c.last_km, start_km: c.start_km });
    // Leasing/Miete/Finanzierung ohne verknüpftes Vertragsdokument (Nachweis nur als Text) – Hinweis, keine Pflicht
    if (c.active && !c.file_id && ['leasing', 'miete', 'finanzierung'].includes(c.kind)) addA('contract_no_document', v, `${CK_DE[c.kind]} · ${c.partner}`, ca);
  }
  // überschneidende laufende Verträge gleicher Art (je Paar ein Hinweis); fehlender Beginn/Ende = offen
  const OVL = ['leasing', 'miete', 'finanzierung'];
  const ctrOv = ctr.results.filter((c) => OVL.includes(c.kind)).sort((a, b) => String(a.start_date || '').localeCompare(String(b.start_date || '')) || String(a.id).localeCompare(String(b.id)));
  for (let i = 0; i < ctrOv.length; i++) for (let j = i + 1; j < ctrOv.length; j++) {
    const a = ctrOv[i]; const b = ctrOv[j];
    if (a.vehicle_id !== b.vehicle_id || a.kind !== b.kind) continue;
    if ((a.start_date || '0000') > (b.end_date || '9999') || (b.start_date || '0000') > (a.end_date || '9999')) continue;
    const nm = (c) => c.partner + (c.contract_no ? ` (${c.contract_no})` : '');
    addA('contract_overlap', { id: a.vehicle_id, plate: a.plate }, `${CK_DE[a.kind]} · ${nm(a)} / ${nm(b)}`, { contract_kind: a.kind, partner: `${nm(a)} / ${nm(b)}` });
  }
  { const seen = new Set();
    for (const r of tireTacho.results) {
      if (seen.has(r.vehicle_id)) continue; let x = null; try { x = JSON.parse(r.detail || '{}'); } catch { /* alter Eintrag */ }
      if (!x || x.axle !== 'antriebsachse' || !x.from || String(x.from).replace(/\s+/g, '').toUpperCase() === String(x.to || '').replace(/\s+/g, '').toUpperCase()) continue;
      seen.add(r.vehicle_id); const day = berlinDate(r.created_at);
      items.push({ check: 'tire_size_after_tacho', severity: CHECKS.tire_size_after_tacho, vehicle_id: r.vehicle_id, plate: r.plate, detail: `${x.from} → ${x.to} am ${day.split('-').reverse().join('.')} · letzte Tachographenprüfung ${r.last_done_date.split('-').reverse().join('.')}`,
        detail_args: { from: x.from, to: x.to, changed_on: day, last_done: r.last_done_date } });
    } }
  for (const r of insNone.results) { let x = {}; try { x = JSON.parse(r.last_json || '{}') || {}; } catch { /* leer */ }
    items.push({ check: 'insurance_none_running', severity: CHECKS.insurance_none_running, vehicle_id: r.vehicle_id, plate: r.plate,
      detail: `Letzter Versicherungsvertrag ${x.partner || ''}${x.no ? ' (' + x.no + ')' : ''} beendet am ${x.end ? x.end.split('-').reverse().join('.') : '–'} – kein laufender erfasst`,
      detail_args: { partner: x.partner || null, contract_no: x.no || null, ended: x.end || null } }); }
  // Backlog 623: Lücke im erfassten Versicherungsschutz – ein Vertrag endet (in den letzten 365 Tagen oder innerhalb der Vorwarnzeit) und der nächste
  // beginnt erst später bzw. es ist (noch) keiner erfasst. Bereits ganz ohne laufenden Vertrag meldet `insurance_none_running`. Nur erfasste Daten.
  { const today = berlinDate(); const plus = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
    const w0 = Number((insAll.results[0] || {}).warn); const warn = Number.isFinite(w0) && w0 >= 0 && String((insAll.results[0] || {}).warn ?? '') !== '' ? w0 : 60;
    const byV = new Map(); for (const c of insAll.results) { if (!byV.has(c.vehicle_id)) byV.set(c.vehicle_id, []); byV.get(c.vehicle_id).push(c); }
    for (const [vid, cs] of byV) {
      let hit = null;
      for (const a of cs) {
        if (!a.eff_end || a.eff_end < plus(today, -365) || a.eff_end > plus(today, warn)) continue;
        const next = plus(a.eff_end, 1);
        if (cs.some((b) => b !== a && (b.start_date || '0000-00-00') <= next && (b.eff_end || '9999-12-31') > a.eff_end)) continue; // nahtlos fortgesetzt
        const later = cs.filter((b) => b !== a && b.start_date && b.start_date > next).sort((x, y) => x.start_date.localeCompare(y.start_date))[0] || null;
        if (!later && a.eff_end < today) continue; // nichts läuft mehr → insurance_none_running
        if (!hit || a.eff_end < hit.a.eff_end) hit = { a, later };
      }
      if (!hit) continue;
      const { a, later } = hit; const gapDays = later ? Math.round((Date.parse(later.start_date) - Date.parse(a.eff_end)) / 86400000) - 1 : null;
      const nm = (c) => c.partner + (c.contract_no ? ` (${c.contract_no})` : ''); const de = (d) => d.split('-').reverse().join('.');
      items.push({ check: 'insurance_gap', severity: CHECKS.insurance_gap, vehicle_id: vid, plate: a.plate,
        detail: later ? `${nm(a)} bis ${de(a.eff_end)}, ${nm(later)} ab ${de(later.start_date)} – ${gapDays} ${gapDays === 1 ? 'Tag' : 'Tage'} ohne erfassten Vertrag` : `${nm(a)} endet am ${de(a.eff_end)} – kein Folgevertrag erfasst`,
        detail_args: { partner: a.partner, contract_no: a.contract_no || null, end: a.eff_end, next_partner: later ? later.partner : null, next_start: later ? later.start_date : null, gap_days: gapDays } });
    } }
  for (const c of claimNoOcc.results) items.push({ check: 'claim_no_occurred', severity: CHECKS.claim_no_occurred, vehicle_id: c.vehicle_id, plate: c.plate, case_id: c.id, detail: `${c.case_no} · ${c.reported_on}` });
  for (const c of hitrunNoPol.results) items.push({ check: 'claim_hitrun_no_police', severity: CHECKS.claim_hitrun_no_police, vehicle_id: c.vehicle_id, plate: c.plate, case_id: c.id, detail: `${c.case_no} · ${c.reported_on}` });
  for (const c of theft365.results) items.push({ check: 'theft_no_claim', severity: CHECKS.theft_no_claim, vehicle_id: c.vehicle_id, plate: c.plate, case_id: c.id, detail: `${c.case_no} · ${berlinDate(c.created_at)}` });
  for (const c of acc365.results) items.push({ check: 'accident_no_claim', severity: CHECKS.accident_no_claim, vehicle_id: c.vehicle_id, plate: c.plate, case_id: c.id, detail: `${c.case_no} · ${berlinDate(c.created_at)}` });
  const RES_DE = { erhebliche_maengel: 'erhebliche Mängel', gefaehrliche_maengel: 'gefährliche Mängel', verkehrsunsicher: 'verkehrsunsicher' };
  for (const d of defects.results) items.push({ check: 'inspection_defects_no_case', severity: CHECKS.inspection_defects_no_case, vehicle_id: d.vehicle_id, plate: d.plate, event_id: d.id, detail: `${d.kind} ${d.done_date.split('-').reverse().join('.')} · ${RES_DE[d.result]}`,
    detail_args: { kind: d.kind, done_date: d.done_date, result: d.result } });
  for (const d of again.results) items.push({ check: 'reinspection_defects_again', severity: CHECKS.reinspection_defects_again, vehicle_id: d.vehicle_id, plate: d.plate, event_id: d.id,
    detail: `${d.kind} ${d.done_date.split('-').reverse().join('.')} · ${RES_DE[d.result]} · Mängelauftrag ${d.case_no} zur Prüfung vom ${d.first_date.split('-').reverse().join('.')}`,
    detail_args: { kind: d.kind, done_date: d.done_date, result: d.result, case_no: d.case_no, first_date: d.first_date } });
  for (const d of noResult.results) items.push({ check: 'inspection_no_result', severity: CHECKS.inspection_no_result, vehicle_id: d.vehicle_id, plate: d.plate, event_id: d.id, detail: `${d.kind} ${d.done_date.split('-').reverse().join('.')}`,
    detail_args: { kind: d.kind, done_date: d.done_date } }); // App formatiert das Datum je Sprache (vorher „UVV 08.10.2026“ auch in EN, 18.10.2026)
  for (const r of ldocs.results) { const v = vById.get(r.vehicle_id); if (v) add('leasing_doc_no_contract', v); }
  const PROV = { webfleet: 'Webfleet', yellowfox: 'YellowFox' };
  for (const r of telPlates.results) {
    if (!r.v_active && r.deact_at && r.gps_time && r.gps_time > r.deact_at) addA('telematics_vehicle_inactive', { id: r.vehicle_id, plate: r.v_plate }, `${PROV[r.provider] || r.provider} ${r.external_id || ''}: ${berlinDateTime(r.gps_time)} · außer Betrieb seit ${berlinDate(r.deact_at).split('-').reverse().join('.')}`.replace(/\s+:/, ':'),
      { source: `${PROV[r.provider] || r.provider} ${r.external_id || ''}`.trim(), day: berlinDate(r.gps_time), time: berlinDateTime(r.gps_time).slice(-5), since: berlinDate(r.deact_at) });
    const v = vById.get(r.vehicle_id); if (!v) continue;
    if (r.source_plate && normPlate(r.source_plate) !== normPlate(v.plate)) add('telematics_plate_mismatch', v, `${PROV[r.provider] || r.provider} ${r.external_id || ''} → ${r.source_plate}`);
    if (r.km !== null && r.prev_km !== null && Math.round(r.km) < r.prev_km) addA('telematics_km_rejected', v, `${PROV[r.provider] || r.provider} ${r.external_id || ''}: ${Math.round(r.km)} km (${berlinDate(r.km_time || r.gps_time)}) < ${r.prev_km} km (${berlinDate(r.prev_at)})`,
      { source: `${PROV[r.provider] || r.provider} ${r.external_id || ''}`.trim(), km: Math.round(r.km), day: berlinDate(r.km_time || r.gps_time), other_km: r.prev_km, other_day: berlinDate(r.prev_at), cmp: 'lt' });
    else if (r.km !== null && (r.km_time || r.gps_time) && r.next_json) {
      const n = JSON.parse(r.next_json);
      if (n.km < Math.round(r.km) && !(n.note && String(n.note).trim())) addA('telematics_km_rejected', v, `${PROV[r.provider] || r.provider} ${r.external_id || ''}: ${Math.round(r.km)} km (${berlinDate(r.km_time || r.gps_time)}) > ${n.km} km (${berlinDate(n.at)})`,
        { source: `${PROV[r.provider] || r.provider} ${r.external_id || ''}`.trim(), km: Math.round(r.km), day: berlinDate(r.km_time || r.gps_time), other_km: n.km, other_day: berlinDate(n.at), cmp: 'gt' });
    }
  }
  const addD = (check, d, detail = null) => items.push({ check, severity: CHECKS[check], vehicle_id: null, plate: null, driver_id: d.id, driver_name: d.display_name, detail });
  for (const d of drv.results) {
    if (d.user_id && !d.u_active) addD('driver_account_inactive', d);
    if (!d.has_license) addD('driver_no_license', d);
    if (d.has_card && !d.has_download) addD('driver_card_no_download', d);
  }
  for (const u of acc.results) { const ck = u.has_file ? 'driver_account_file_inactive' : 'driver_account_no_file'; items.push({ check: ck, severity: CHECKS[ck], vehicle_id: null, plate: null, detail: u.display_name }); }
  for (const u of invites.results) items.push({ check: 'invite_pending', severity: CHECKS.invite_pending, vehicle_id: null, plate: null, detail: `${u.display_name} (${u.role})${!u.expires_at || u.expires_at < nowIso() ? ' – Einladung abgelaufen' : ''}`,
    detail_args: { name: u.display_name, role: u.role, expired: !u.expires_at || u.expires_at < nowIso() } });
  const rank = { fehler: 0, luecke: 1, hinweis: 2 };
  items.sort((a, b) => rank[a.severity] - rank[b.severity] || a.check.localeCompare(b.check) || String(a.plate || a.driver_name).localeCompare(String(b.plate || b.driver_name)));
  // optional nur ein Standort laut Fahrzeugstamm: fahrzeugbezogene Befunde dieses Standorts; Personen-/Konto-/Einladungsbefunde
  // haben keinen Standort und werden dann nur gezählt (other_hidden) – sichtbar mit „Alle“
  const sel = siteSelection(vs, query.site);
  let shown = items; let otherHidden = 0; let checked = vs.length;
  if (sel.site) {
    if (!siteOf) siteOf = new Map((await env.DB.prepare('SELECT id, site FROM vehicles').all()).results.map((v) => [v.id, v.site]));
    shown = items.filter((i) => i.vehicle_id && sel.match(siteOf.get(i.vehicle_id)));
    otherHidden = items.filter((i) => !i.vehicle_id).length;
    checked = vs.filter((v) => sel.match(v.site)).length;
  }
  const counts = {};
  for (const i of shown) counts[i.check] = (counts[i.check] || 0) + 1;
  return { generated_at: nowIso(), environment: envName, stale_days: staleDays, vehicles_checked: checked, site: sel.site, site_options: sel.options, other_hidden: otherHidden, counts, check_max: DQ_MAX, truncated_checks: truncatedChecks, items: shown };
}
