// [CLAUDE] Fahrzeugverträge: Leasing, Miete, Finanzierung, Versicherung, Wartungsvertrag, Sonstiges.
// Grundsätze: Alle Angaben nur laut Vertrag (Pflicht-Nachweis); die App berechnet nur, was sich daraus ergibt
// (spätester Kündigungstag = Vertragsende − Kündigungsfrist; km seit Übernahme; lineare Prognose, deutlich als Prognose gekennzeichnet).
// Sichtbar und änderbar nur für Inhaber/Fuhrparkleitung (Raten sind Geschäftsdaten). Gemeinsame Stammdaten wie Fahrzeuge.
import { icsLang } from '../public/ics-texts.js';
import { findingText as fm } from '../public/finding-messages.js';
import { nowIso, laterIso, conflict, uuid, bad, forbidden, notFound, str, num, oneOf, addMonths, berlinDate, parseCsv, icsCalendar, isCalendarDate, normPlate, pickVehicleByPlate, commaDec, pointDec, berlinDayStartIso, maxFutureDate } from './util.js';
import { audit } from './auth.js';
import { latestKmByVehicle, csvCell, csvText, KM_DROP_SQL, parseKmDrop } from './maintenance.js';
import { siteSelection } from './reports.js';
import { SETTING_DEFAULTS } from './settings.js';

export const CONTRACT_KINDS = ['leasing', 'miete', 'finanzierung', 'versicherung', 'wartung', 'sonstiges'];
export const KIND_DE = { leasing: 'Leasing', miete: 'Miete', finanzierung: 'Finanzierung', versicherung: 'Versicherung', wartung: 'Wartungsvertrag', sonstiges: 'Vertrag' };
export const FORECAST_MIN_DAYS = 30; // Prognose erst nach mindestens 30 Tagen Laufzeit mit km-Stand (sonst zu unsicher)
const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';
const ISO = { test: isCalendarDate }; // echtes Kalenderdatum JJJJ-MM-TT
const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

function date(v, field, { notFuture = false } = {}) {
  const d = str(v, { max: 10, field });
  if (!d) return null;
  if (!ISO.test(d) || Number.isNaN(Date.parse(d + 'T00:00:00Z')) || new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) !== d) throw bad('validation', `${field}: gültiges Datum im Format JJJJ-MM-TT.`);
  // höchstens heute + 20 Jahre (21.10.2026: Ende 2062 statt 2026 hieß „läuft nie aus“, Beginn 2062 „noch nicht begonnen“ – vorher bis 2100)
  if (d < '1990-01-01' || d > maxFutureDate()) throw bad('validation', `${field}: Datum außerhalb des zulässigen Bereichs.`);
  if (notFuture && d > berlinDate()) throw bad('validation', `${field}: darf nicht in der Zukunft liegen.`);
  return d;
}
const intOrNull = (v, field, max) => { const n = num(v, { min: 0, max, field, nullable: true, grouped: true }); if (n !== null && !Number.isInteger(n)) throw bad('validation', `${field}: ganze Zahl.`); return n; };

export function warnDaysOf(settings) {
  // Regel = Wirkung (SETTING_RULES: 0–730): 0 = Vorwarnung erst am Stichtag, leer = Standard 60 – vorher wurde 0 still zu 60
  const v = settings && settings.get ? settings.get('contract_warn_days') : null;
  const n = v === undefined || v === null || v === '' ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : SETTING_DEFAULTS.contract_warn_days;
}

// Status eines Vertrags (reine Funktion, für Akte, Übersicht und Fuhrparkagent gleich)
export function contractStatus(c, latest, today, warnDays) {
  if (c.ended_on) return { overall: 'beendet', end: null, notice: null, km: null };
  let end = null; let notice = null; let km = null;
  if (c.end_date) {
    const d = days(today, c.end_date);
    end = { date: c.end_date, days: d, status: d < 0 ? 'abgelaufen' : d <= warnDays ? 'laeuft_aus' : 'ok' };
    if (c.notice_months) {
      const by = addMonths(c.end_date, -c.notice_months);
      const nd = days(today, by);
      notice = { by, days: nd, status: d < 0 ? null : nd < 0 ? 'verstrichen' : nd <= warnDays ? 'bald' : 'ok' };
    }
  }
  if (c.km_allowance) {
    if (c.start_km === null || c.start_km === undefined) km = { status: 'ohne_start', allowance: c.km_allowance };
    // km-Zähler nach Vertragsbeginn gesunken (Tachotausch o. Ä.): gefahrene km gegen das Kontingent nicht berechenbar – nie schätzen
    // Gilt nur, bis der Vertrag danach gespeichert wurde (km bei Übernahme geprüft) – wie `km_basis_at` bei Prüfterminen; vorher blieb ein
    // korrigierter Tippfehler für immer „nicht berechenbar“ und eine echte Überschreitung unbemerkt (17.10.2026)
    else if (latest && latest.drop_at && (!c.start_date || berlinDate(latest.drop_at) >= c.start_date) && !((c.km_basis_at || c.updated_at) && (c.km_basis_at || c.updated_at) > (latest.drop_rec || latest.drop_at))) km = { status: 'zaehler', allowance: c.km_allowance, drop_at: latest.drop_at };
    else if (!latest || (c.start_date && berlinDate(latest.measured_at) < c.start_date)) km = { status: 'ohne_km', allowance: c.km_allowance };
    // km-Stand seit Beginn liegt unter „km bei Übernahme“ (Tippfehler im Vertrag oder beim km-Stand) – nicht „kein km-Stand“ (20.10.2026); ohne Zähler-Rücksprung seit Beginn
    // auch nach bestätigtem Zähler-Rücksprung (Tachotausch): Hinweis statt „kein km-Stand“ – vorher blieb eine Überschreitung unsichtbar (20.10.2026)
    else if (latest.km < c.start_km) km = { status: 'unter_start', allowance: c.km_allowance, current_km: latest.km, measured_at: latest.measured_at, start_km: c.start_km };
    else {
      const driven = latest.km - c.start_km;
      km = { status: driven > c.km_allowance ? 'ueber' : 'ok', allowance: c.km_allowance, current_km: latest.km, measured_at: latest.measured_at, driven, remaining: c.km_allowance - driven, forecast_driven: null };
      const measuredDay = berlinDate(latest.measured_at);
      // Fahrzeug außer Betrieb (vehicle_active = 0): keine Hochrechnung – es fährt nicht mehr; echte Überschreitung und Fristen bleiben (22.10.2026)
      if (c.start_date && c.end_date && km.status === 'ok' && measuredDay < c.end_date && c.vehicle_active !== 0 && c.vehicle_active !== false) {
        const elapsed = days(c.start_date, measuredDay); const total = days(c.start_date, c.end_date);
        if (elapsed >= FORECAST_MIN_DAYS && total > 0) {
          km.forecast_driven = Math.round(driven * total / elapsed);
          if (km.forecast_driven > c.km_allowance) km.status = 'prognose_ueber';
        }
      }
    }
  }
  const handeln = (end && end.status === 'abgelaufen') || (km && km.status === 'ueber');
  const hinweis = (end && end.status === 'laeuft_aus') || (notice && notice.status === 'bald') || (km && (km.status === 'prognose_ueber' || km.status === 'zaehler' || km.status === 'unter_start'));
  return { overall: handeln ? 'handeln' : hinweis ? 'hinweis' : 'ok', end, notice, km };
}

function readBody(body, existing = {}, user = null) {
  const pick = (k) => (body[k] !== undefined ? body[k] : existing[k]);
  const f = {
    kind: oneOf(pick('kind'), CONTRACT_KINDS, 'Vertragsart'),
    partner: str(pick('partner'), { required: true, max: 120, field: 'Vertragspartner' }),
    contract_no: str(pick('contract_no'), { max: 60, field: 'Vertragsnummer' }),
    start_date: date(pick('start_date'), 'Vertragsbeginn'),
    end_date: date(pick('end_date'), 'Vertragsende'),
    notice_months: intOrNull(pick('notice_months'), 'Kündigungsfrist (Monate)', 60),
    km_allowance: intOrNull(pick('km_allowance'), 'km-Kontingent', 5000000),
    start_km: intOrNull(pick('start_km'), 'km bei Übernahme', 9999999),
    monthly_rate_net: num(pick('monthly_rate_net'), { min: 0, max: 1000000, field: 'Monatsrate', nullable: true, cents: true, ...(user ? { decimalComma: commaDec(user), decimalPoint: pointDec(user) } : {}) }),
    evidence: str(pick('evidence'), { required: true, max: 300, field: 'Nachweis' }),
    note: str(pick('note'), { max: 1000, field: 'Bemerkung' }),
  };
  if (f.start_date && f.end_date && f.end_date <= f.start_date) throw bad('validation', 'Vertragsende muss nach dem Vertragsbeginn liegen.');
  if (f.notice_months && !f.end_date) throw bad('validation', 'Kündigungsfrist nur zusammen mit einem Vertragsende (laut Vertrag).');
  if (f.km_allowance && f.start_km === null) throw bad('validation', 'Für ein km-Kontingent bitte den km-Stand bei Übernahme laut Übergabeprotokoll angeben.');
  return f;
}

// Vertragsdokument: nur ein Dokument aus der Ablage desselben Fahrzeugs (ohne Vorgang) in der Umgebung, in der gerade gearbeitet wird.
// Leer/null = keine Verknüpfung. Das Dokument selbst bleibt unverändert in der Ablage.
async function checkFile(env, vehicleId, envName, raw) {
  const fid = str(raw, { max: 40, field: 'Vertragsdokument' });
  if (!fid) return null;
  const f = await env.DB.prepare('SELECT id FROM files WHERE id=? AND vehicle_id=? AND case_id IS NULL AND environment=?').bind(fid, vehicleId, envName || '').first();
  if (!f) throw bad('validation', 'Vertragsdokument: bitte ein Dokument aus der Dokumentablage dieses Fahrzeugs wählen.');
  return f.id;
}

// Derselbe Vertrag (Art + Vertragsnummer, ohne Nummer Partner + Beginn), Groß-/Kleinschreibung auch bei Umlauten egal (18.10.2026: SQLite LOWER
// kennt nur A–Z – „Ü-1“/„ü-1“ ergab eine Dublette mit doppelter Rate). Ein beendeter Vertrag sperrt seine Nummer nur für denselben Beginn
// (Folgevertrag/-police mit gleicher Nummer und neuem Beginn ist möglich; 18.10.2026 vorher dauerhaft 409).
const lcDe = (x) => String(x || '').trim().toLocaleLowerCase('de');
// SQL-Vergleiche der Dublettenregel: LOWER kennt nur A–Z, deshalb Ä/Ö/Ü vorher ersetzt (21.10.2026: „ÜL-1“/„ül-1“ gleichzeitig → zwei Verträge)
export function sameContract(c, f) {
  if (c.kind !== f.kind) return false;
  if (lcDe(f.contract_no)) return lcDe(c.contract_no) === lcDe(f.contract_no) && (!c.ended_on || (c.start_date || '') === (f.start_date || ''));
  return !lcDe(c.contract_no) && lcDe(c.partner) === lcDe(f.partner) && (c.start_date || '') === (f.start_date || '');
}
// km-Grundlage eines neu angelegten/importierten bzw. im Beginn geänderten Vertrags: liegt der Beginn am oder vor dem Tag des letzten km-Rücksprungs
// (Tachotausch), gehört „km bei Übernahme“ vermutlich zum alten Zähler → Grundlage = Beginn, Kontingent bleibt „nicht berechenbar“, bis
// „km bei Übernahme geprüft“ bestätigt wird. Sonst `now`. (19.10.2026: Neuanlage/Import nach dem Tausch rechneten alte und neue km zusammen –
// gleiche Regel wie `kmBasisForDone` bei Prüfterminen, Grenztag wie `contractStatus`)
function contractKmBasis(drop, startDate, now) {
  if (!drop || !drop.drop_at || !startDate) return now;
  return startDate <= berlinDate(drop.drop_at) ? berlinDayStartIso(startDate) : now; // Berliner Tagesbeginn (21.10.2026: UTC-Mitternacht übersah Tausch 00:00–02:00 Uhr)
}
const dropOf = async (env, vehicleId) => parseKmDrop((await env.DB.prepare(`SELECT ${KM_DROP_SQL('?')} AS d`).bind(vehicleId).first() || {}).d);

const DUP_MSG = 'Diesen Vertrag gibt es für das Fahrzeug bereits (gleiche Art und Vertragsnummer bzw. Partner und Beginn).';

export async function createContract(env, user, vehicleId, body, envName) {
  if (!isMgr(user)) throw forbidden();
  const v = await env.DB.prepare('SELECT id, plate FROM vehicles WHERE id=?').bind(vehicleId).first();
  if (!v) throw notFound('Fahrzeug nicht gefunden.');
  const f = readBody(body, {}, user);
  const fileId = await checkFile(env, v.id, envName, body.file_id);
  const id = uuid(); const now = nowIso();
  const same = (await env.DB.prepare('SELECT kind, contract_no, partner, start_date, ended_on FROM vehicle_contracts WHERE vehicle_id=?').bind(v.id).all()).results;
  if (same.some((c) => sameContract(c, f))) throw conflict('duplicate_contract', DUP_MSG);
  // derselbe Vertrag (Schlüssel wie beim Import: Fahrzeug + Art + Vertragsnummer, ohne Nummer Partner + Beginn) nur einmal – Doppelklick/parallel
  // legte ihn sonst mehrfach an, Monatsraten zählten doppelt (17.10.2026)
  const r = await env.DB.prepare(`INSERT INTO vehicle_contracts(id,vehicle_id,kind,partner,contract_no,start_date,end_date,notice_months,km_allowance,start_km,monthly_rate_net,evidence,note,file_id,created_by,created_at,updated_at,km_basis_at)
    SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?16,?17
    WHERE NOT EXISTS (SELECT 1 FROM vehicle_contracts c WHERE c.vehicle_id=?2 AND c.kind=?3 AND (CASE WHEN COALESCE(?5,'')<>''
      THEN LOWER(REPLACE(REPLACE(REPLACE(COALESCE(c.contract_no,''),'Ä','ä'),'Ö','ö'),'Ü','ü'))=LOWER(REPLACE(REPLACE(REPLACE(?5,'Ä','ä'),'Ö','ö'),'Ü','ü')) AND (c.ended_on IS NULL OR COALESCE(c.start_date,'')=COALESCE(?6,''))
      ELSE COALESCE(c.contract_no,'')='' AND LOWER(REPLACE(REPLACE(REPLACE(COALESCE(c.partner,''),'Ä','ä'),'Ö','ö'),'Ü','ü'))=LOWER(REPLACE(REPLACE(REPLACE(COALESCE(?4,''),'Ä','ä'),'Ö','ö'),'Ü','ü')) AND COALESCE(c.start_date,'')=COALESCE(?6,'') END))`)
    .bind(id, v.id, f.kind, f.partner, f.contract_no, f.start_date, f.end_date, f.notice_months, f.km_allowance, f.start_km, f.monthly_rate_net, f.evidence, f.note, fileId, user.id, now,
      f.km_allowance ? contractKmBasis(await dropOf(env, v.id), f.start_date, now) : now).run();
  if (!r.meta || !r.meta.changes) throw conflict('duplicate_contract', 'Diesen Vertrag gibt es für das Fahrzeug bereits (gleiche Art und Vertragsnummer bzw. Partner und Beginn).');
  await audit(env, user.id, 'contract.create', id, { vehicle: v.plate, kind: f.kind, partner: f.partner, file: fileId || undefined });
  return { id };
}

async function loadContract(env, id) {
  const c = await env.DB.prepare('SELECT c.*, v.plate FROM vehicle_contracts c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.id=?').bind(id).first();
  if (!c) throw notFound('Vertrag nicht gefunden.');
  return c;
}

export async function updateContract(env, user, id, body, envName) {
  if (!isMgr(user)) throw forbidden();
  const c = await loadContract(env, id);
  if (c.ended_on) throw bad('contract_ended', 'Beendete Verträge werden nicht mehr geändert (Nachweis bleibt erhalten).');
  // Stand beim Öffnen des Formulars (die App sendet ihn): ein länger offenes Formular überschrieb sonst inzwischen gespeicherte Änderungen
  if (body.expected_updated_at && String(body.expected_updated_at) !== c.updated_at) throw conflict('version_conflict', 'Vertrag wurde zwischenzeitlich geändert. Bitte neu laden.');
  const f = readBody(body, c, user);
  // Vertragsdokument nur ändern, wenn das Feld mitgeschickt wird (Import/ältere Oberflächen lassen es unverändert)
  f.file_id = body.file_id !== undefined ? await checkFile(env, c.vehicle_id, envName, body.file_id) : c.file_id;
  const changed = Object.keys(f).filter((k) => f[k] !== c[k]);
  // km-Grundlage nach Zähler-Rücksprung geprüft (Formular sendet `confirm_km_basis`, wenn das Kontingent „nicht berechenbar“ ist): Speichern ohne
  // Änderung zählt als Bestätigung – ab jetzt wird wieder gerechnet (Stand des Vertrags = Grundlage, siehe contractStatus)
  if (!changed.length && flagLike(body.confirm_km_basis) && c.km_allowance) { // nur echte Bestätigung (18.10.2026: "false"/"0" bestätigte)
    const nt = laterIso(c.updated_at);
    const t = await env.DB.prepare('UPDATE vehicle_contracts SET updated_at=?, km_basis_at=? WHERE id=? AND ended_on IS NULL AND updated_at=?').bind(nt, nt, id, c.updated_at).run();
    if (!(t.meta && t.meta.changes)) throw conflict('version_conflict', 'Vertrag wurde zwischenzeitlich geändert. Bitte neu laden.');
    await audit(env, user.id, 'contract.update', id, { vehicle: c.plate, km_basis_confirmed: true });
    return { id, changed: [], km_basis_confirmed: true };
  }
  if (!changed.length) return { id, changed: [] };
  if (['kind', 'contract_no', 'partner', 'start_date'].some((k) => changed.includes(k))) {
    const same = (await env.DB.prepare('SELECT kind, contract_no, partner, start_date, ended_on FROM vehicle_contracts WHERE vehicle_id=? AND id<>?').bind(c.vehicle_id, id).all()).results;
    if (same.some((x) => sameContract(x, f))) throw conflict('duplicate_contract', DUP_MSG);
  }
  // nur auf dem gelesenen Stand und solange nicht beendet (vorher: parallele Änderungen überschrieben sich gegenseitig, beendete Verträge
  // wurden trotzdem geändert – 17.10.2026)
  // dieselbe Dublettenregel wie beim Anlegen (Ändern der Vertragsnummer erzeugte vorher die Dublette, Raten doppelt) und kein Wechsel weg von
  // „Versicherung“, solange ein Versicherungsfall auf den Vertrag verweist (der Fall war danach nicht mehr speicherbar) – 17.10.2026
  const DUP = `EXISTS (SELECT 1 FROM vehicle_contracts d WHERE d.vehicle_id=?16 AND d.id<>?14 AND d.kind=?1 AND (CASE WHEN COALESCE(?3,'')<>''
      THEN LOWER(REPLACE(REPLACE(REPLACE(COALESCE(d.contract_no,''),'Ä','ä'),'Ö','ö'),'Ü','ü'))=LOWER(REPLACE(REPLACE(REPLACE(?3,'Ä','ä'),'Ö','ö'),'Ü','ü')) AND (d.ended_on IS NULL OR COALESCE(d.start_date,'')=COALESCE(?4,''))
      ELSE COALESCE(d.contract_no,'')='' AND LOWER(REPLACE(REPLACE(REPLACE(COALESCE(d.partner,''),'Ä','ä'),'Ö','ö'),'Ü','ü'))=LOWER(REPLACE(REPLACE(REPLACE(COALESCE(?2,''),'Ä','ä'),'Ö','ö'),'Ü','ü')) AND COALESCE(d.start_date,'')=COALESCE(?4,'') END))`;
  const CLAIM = `(?1<>'versicherung' AND EXISTS (SELECT 1 FROM insurance_claims ic WHERE ic.contract_id=?14))`;
  const r = await env.DB.prepare(`UPDATE vehicle_contracts SET kind=?1,partner=?2,contract_no=?3,start_date=?4,end_date=?5,notice_months=?6,km_allowance=?7,start_km=?8,monthly_rate_net=?9,evidence=?10,note=?11,file_id=?12,updated_at=?13,
      km_basis_at=COALESCE(?17, km_basis_at)
      WHERE id=?14 AND ended_on IS NULL AND updated_at=?15 AND NOT ${DUP} AND NOT ${CLAIM}`)
    .bind(f.kind, f.partner, f.contract_no, f.start_date, f.end_date, f.notice_months, f.km_allowance, f.start_km, f.monthly_rate_net, f.evidence, f.note, f.file_id, laterIso(c.updated_at), id, c.updated_at, c.vehicle_id,
      // km-Grundlage nur neu, wenn sie sich ändert oder ausdrücklich bestätigt wird (Bemerkung/Rate klärten sonst einen Tachotausch, 17.10.2026)
      // 19.10.2026: Kontingent allein klärt keinen Tachotausch mehr; geänderter Beginn/km bei Übernahme nach derselben Regel wie die Neuanlage
      flagLike(body.confirm_km_basis) ? laterIso(c.updated_at)
        // 20.10.2026: erstmals eingetragenes Kontingent – Grundlage nach derselben Regel wie die Neuanlage (beim Anlegen ohne Kontingent stand sie
        // auf „jetzt“, ein Tachotausch dazwischen wurde überrechnet und eine Überschreitung blieb verborgen)
        : (['start_km', 'start_date'].some((k) => changed.includes(k)) || (!c.km_allowance && f.km_allowance)) ? contractKmBasis(await dropOf(env, c.vehicle_id), f.start_date, laterIso(c.updated_at)) : null).run();
  if (!(r.meta && r.meta.changes)) {
    const why = await env.DB.prepare(`SELECT ${DUP} AS dup, ${CLAIM} AS claim`).bind(f.kind, f.partner, f.contract_no, f.start_date, null, null, null, null, null, null, null, null, null, id, null, c.vehicle_id).first();
    if (why && why.claim) {
      // Fall der anderen Umgebung benennen (21.10.2026: ein Test-Versicherungsfall sperrte den echten Vertrag, im Betrieb war kein Fall zu finden)
      const refs = (await env.DB.prepare(`SELECT c.case_no, ic.environment FROM insurance_claims ic LEFT JOIN cases c ON c.id=ic.case_id WHERE ic.contract_id=? ORDER BY ic.created_at LIMIT 5`).bind(id).all()).results;
      const own = refs.some((x) => x.environment === envName);
      const other = refs.find((x) => x.environment !== envName);
      // Vorgangsnummern nur der eigenen Umgebung (22.10.2026: Testkonto bekam Nummern echter Schadensfälle); andere Umgebung nur gezählt –
      // der Inhaber sieht beide Umgebungen ohnehin
      const extra = { claim_cases: refs.filter((x) => x.environment === envName || user.role === 'owner').map((x) => ({ case_no: x.case_no || null, environment: x.environment })),
        other_environment_claims: refs.filter((x) => x.environment !== envName).length };
      if (!own && other) throw conflict('contract_in_claim', other.environment === 'test' ? 'Ein Versicherungsfall der Testumgebung verweist auf diesen Vertrag – Vertragsart bleibt „Versicherung“.' : 'Ein Versicherungsfall des Betriebs verweist auf diesen Vertrag – Vertragsart bleibt „Versicherung“.', extra);
      throw conflict('contract_in_claim', 'Ein Versicherungsfall verweist auf diesen Vertrag – Vertragsart bleibt „Versicherung“.', extra);
    }
    if (why && why.dup) throw conflict('duplicate_contract', 'Diesen Vertrag gibt es für das Fahrzeug bereits (gleiche Art und Vertragsnummer bzw. Partner und Beginn).');
    throw conflict('version_conflict', 'Vertrag wurde zwischenzeitlich geändert. Bitte neu laden.');
  }
  await audit(env, user.id, 'contract.update', id, { vehicle: c.plate, changed: Object.fromEntries(changed.map((k) => [k, { from: c[k], to: f[k] }])) });
  return { id, changed };
}

// Vertrag als beendet markieren (Rückgabe, Kündigung, Ablösung) – mit Datum und Grund; bleibt in der Akte sichtbar
export async function endContract(env, user, id, body) {
  if (!isMgr(user)) throw forbidden();
  const c = await loadContract(env, id);
  if (c.ended_on) throw bad('contract_ended', 'Vertrag ist bereits beendet.');
  const on = date(body.ended_on, 'Beendet am', { notFuture: true }) || berlinDate();
  const note = str(body.end_note, { required: true, max: 300, field: 'Grund' });
  // Storno vor Beginn (Beginn noch in der Zukunft): Beenden vor dem Beginn zulässig – sonst blieb er „aktiv“ und zählte ab Beginn Raten (18.10.2026)
  if (c.start_date && on < c.start_date && c.start_date <= berlinDate()) throw bad('validation', 'Beendet am liegt vor dem Vertragsbeginn.');
  const r = await env.DB.prepare('UPDATE vehicle_contracts SET ended_on=?, end_note=?, updated_at=? WHERE id=? AND ended_on IS NULL AND updated_at=?').bind(on, note, laterIso(c.updated_at), id, c.updated_at).run();
  if (!(r.meta && r.meta.changes)) throw conflict('version_conflict', 'Vertrag wurde zwischenzeitlich geändert. Bitte neu laden.');
  await audit(env, user.id, 'contract.end', id, { vehicle: c.plate, ended_on: on, note });
  return { id, ended_on: on };
}

// Verträge eines Fahrzeugs (Fahrzeugakte); latest = letzter km-Stand der Akte
// Vertragsdokument: Dateiname nur, wenn das Dokument in der angezeigten Umgebung liegt (sonst file_other_env)
export async function vehicleContracts(env, vehicleId, latest, settings, envName) {
  const rows = (await env.DB.prepare(`SELECT c.*, (SELECT v.active FROM vehicles v WHERE v.id=c.vehicle_id) AS vehicle_active, u.display_name AS created_by_name, f.filename AS file_name, f.doc_kind AS file_doc_kind FROM vehicle_contracts c LEFT JOIN users u ON u.id=c.created_by
    LEFT JOIN files f ON f.id=c.file_id AND f.environment=?
    WHERE c.vehicle_id=? ORDER BY c.ended_on IS NOT NULL, c.ended_on DESC, c.end_date IS NULL, c.end_date`).bind(envName || '', vehicleId).all()).results;
  const today = berlinDate(); const w = warnDaysOf(settings);
  return rows.map((c) => ({ ...c, file_id: c.file_name ? c.file_id : null, file_other_env: !!(c.file_id && !c.file_name), status: contractStatus(c, latest, today, w) }));
}

const ORDER = { handeln: 0, hinweis: 1, ok: 2, beendet: 3 };
// Übersicht über alle Fahrzeuge (Mehr → Verträge): Filter offen/aktion/beendet/alle, Vertragsart
export async function contractOverview(env, user, query = {}, envName = null) {
  if (!isMgr(user)) throw forbidden();
  const filter = ['aktiv', 'aktion', 'beendet', 'alle'].includes(query.filter) ? query.filter : 'aktiv';
  const kind = CONTRACT_KINDS.includes(query.kind) ? query.kind : null;
  const [rows, settingsRows, latestKm] = await Promise.all([
    // Vertragsdokument nur aus der eigenen Umgebung (wie die Fahrzeugakte; 18.10.2026: Übersicht/CSV zeigten „verknüpft“ für ein Test-Dokument im Betrieb)
    env.DB.prepare(`SELECT c.*, v.plate, v.kind AS vehicle_kind, v.active AS vehicle_active, v.eval_excluded AS vehicle_eval_excluded, v.site AS vehicle_site, f.id AS file_ok FROM vehicle_contracts c JOIN vehicles v ON v.id=c.vehicle_id LEFT JOIN files f ON f.id=c.file_id AND f.environment=? ORDER BY v.plate, c.kind`).bind(envName).all(),
    env.DB.prepare(`SELECT key, value FROM settings WHERE key='contract_warn_days'`).all(),
    latestKmByVehicle(env),
  ]);
  const settings = new Map(settingsRows.results.map((r) => [r.key, r.value]));
  const today = berlinDate(); const w = warnDaysOf(settings);
  // Filter „Fahrzeug-Standort“ (Standort laut Fahrzeugstamm, Schreibweisen zusammengefasst) – vor den Zählern, damit diese zum Standort passen
  const sel = siteSelection(rows.results.map((r) => ({ site: r.vehicle_site })), query.site);
  // Vertragsart ebenfalls vor den Zählern (vorher „Handlungsbedarf (2)“ bei leerer Liste der gewählten Art, 17.10.2026)
  let list = rows.results.filter((c) => (!sel.site || sel.match(c.vehicle_site)) && (!kind || c.kind === kind)).map(({ file_ok, ...c }) => ({ ...c, file_id: file_ok ? c.file_id : null, file_other_env: !!(c.file_id && !file_ok), vehicle_eval_excluded: !!c.vehicle_eval_excluded, status: contractStatus(c, latestKm.get(c.vehicle_id), today, w) }));
  const counts = { aktiv: 0, aktion: 0, beendet: 0, alle: list.length };
  for (const c of list) { if (c.ended_on) counts.beendet++; else { counts.aktiv++; if (c.status.overall !== 'ok') counts.aktion++; } }
  // laufend = nicht beendet und heute innerhalb der Laufzeit, unabhängig vom Listenfilter (17.10.2026: abgelaufene Verträge und der Filter
  // „Handlungsbedarf“ verfälschten die Summe gegenüber dem Kostenbericht)
  // ruhende Fahrzeuge zählen nicht (wie im Kostenbericht; 18.10.2026)
  const running = list.filter((c) => !c.vehicle_eval_excluded && !c.ended_on && (!c.end_date || c.end_date >= today) && (!c.start_date || c.start_date <= today));
  if (filter === 'aktiv') list = list.filter((c) => !c.ended_on);
  else if (filter === 'aktion') list = list.filter((c) => !c.ended_on && c.status.overall !== 'ok');
  else if (filter === 'beendet') list = list.filter((c) => c.ended_on);
  list.sort((a, b) => ORDER[a.status.overall] - ORDER[b.status.overall] || String(a.end_date || '9999').localeCompare(String(b.end_date || '9999')) || a.plate.localeCompare(b.plate));
  // Summe der Monatsraten nur über aktive Verträge mit hinterlegter Rate (fehlende Rate = unbewertet, nie 0 €)
  const active = running;
  const rated = active.filter((c) => c.monthly_rate_net !== null);
  return { today, warn_days: w, filter, kind, site: sel.site, site_options: sel.options, counts, contracts: list, monthly_rate_sum_net: rated.length ? Math.round(rated.reduce((s, c) => s + c.monthly_rate_net, 0) * 100) / 100 : null, unrated: active.length - rated.length };
}

const ST_DE = { handeln: 'handeln', hinweis: 'Hinweis', ok: 'in Ordnung', beendet: 'beendet' };
export function contractsCsv(ov) {
  const head = ['Kennzeichen', 'Vertragsart', 'Vertragspartner', 'Vertragsnummer', 'Beginn', 'Ende', 'Kündigungsfrist (Monate)', 'Kündigung spätestens', 'Monatsrate netto (EUR)',
    'km-Kontingent', 'km bei Übernahme', 'km gefahren', 'km Prognose bis Ende (linear)', 'Status', 'Beendet am', 'Grund', 'Nachweis', 'Bemerkung', 'Vertragsdokument verknüpft', 'Fahrzeug ruhend (nicht in Summen)'];
  const lines = [head.join(';')];
  for (const c of ov.contracts) {
    const s = c.status;
    lines.push([c.plate, KIND_DE[c.kind], c.partner, c.contract_no, c.start_date, c.end_date, c.notice_months, s.notice ? s.notice.by : '',
      c.monthly_rate_net === null ? '' : String(c.monthly_rate_net).replace('.', ','), c.km_allowance, c.start_km, s.km && s.km.driven !== undefined ? s.km.driven : '',
      s.km && s.km.forecast_driven ? s.km.forecast_driven : '', ST_DE[s.overall], c.ended_on, c.end_note, c.evidence, c.note, c.file_id ? 'ja' : 'nein', c.vehicle_eval_excluded ? 'ja' : 'nein'].map((x, i) => (i === 3 ? csvText(x) : csvCell(x))).join(';'));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// Kalenderdatei (.ics) für laufende Verträge: spätester Kündigungstag und Vertragsende ab heute, Erinnerung = Vorwarnung (Tage).
// Ohne Raten, Vertragsnummern oder Personen (Kalender werden oft in fremde Clouds synchronisiert); nur belegte Daten.
// Texte in der Sprache der Person (lang; DE/UK/EN, sonst Deutsch); Partner/Kennzeichen wie gespeichert
export function contractsIcs(ov, lang = 'de') {
  const I = icsLang(lang);
  const ev = [];
  for (const c of ov.contracts) {
    if (c.ended_on) continue;
    const s = c.status; const label = `${I.label('ck_' + c.kind, KIND_DE[c.kind])} ${c.plate} (${c.partner})`;
    if (s.notice && s.notice.by >= ov.today) ev.push({ uid: `contract-${c.id}-notice`, date: s.notice.by, summary: I.tx('c_notice', { label }),
      description: I.tx('c_notice_desc', { n: c.notice_months, months: I.months(c.notice_months), end: I.d(c.end_date) }), alarmDays: ov.warn_days });
    if (c.end_date && c.end_date >= ov.today) ev.push({ uid: `contract-${c.id}-end`, date: c.end_date, summary: I.tx('c_end', { label }),
      description: I.tx('c_end_desc'), alarmDays: ov.warn_days });
  }
  return icsCalendar(`${I.tx('cal_contracts')}${ov.site ? ' – ' + (ov.site === 'ohne' ? I.tx('no_site') : ov.site) : ''}`, ev.sort((a, b) => a.date.localeCompare(b.date)));
}

// Für den Fuhrparkagenten (genau eine Abfrage inkl. letztem km-Stand – Abfragebudget je Lauf): Befunde je Vertrag
export async function contractFindings(env, settings) {
  const rows = (await env.DB.prepare(`SELECT c.*, v.plate, v.active AS vehicle_active,
      (SELECT o.km || '|' || o.measured_at FROM odometer_readings o WHERE o.vehicle_id=c.vehicle_id ORDER BY o.measured_at DESC LIMIT 1) AS latest_km,
      ${KM_DROP_SQL('c.vehicle_id')} AS drop_at
    FROM vehicle_contracts c JOIN vehicles v ON v.id=c.vehicle_id WHERE c.ended_on IS NULL AND (c.end_date IS NOT NULL OR c.km_allowance IS NOT NULL)`).all()).results;
  if (!rows.length) return [];
  const km = new Map(rows.filter((r) => r.latest_km).map((r) => { const [k, at] = r.latest_km.split('|'); return [r.vehicle_id, { km: Number(k), measured_at: at, ...parseKmDrop(r.drop_at) }]; }));
  const today = berlinDate(); const w = warnDaysOf(settings); const out = [];
  for (const c of rows) {
    const s = contractStatus(c, km.get(c.vehicle_id), today, w);
    const base = { vehicle_id: c.vehicle_id, owner_role: 'fleet' };
    if (s.end && s.end.status === 'abgelaufen') out.push({ ...base, code: 'CONTRACT_ENDED', subject: `${c.id}|end`, severity: 'handeln', requires_decision: 1,
      ...fm('CONTRACT_ENDED', { plate: c.plate, ckind: c.kind, partner: c.partner, no: c.contract_no || null, end: c.end_date }), next_action: 'Rückgabe/Verlängerung klären; Vertrag in der Fahrzeugakte beenden oder mit neuem Nachweis aktualisieren.' });
    else if (s.end && s.end.status === 'laeuft_aus') out.push({ ...base, code: 'CONTRACT_ENDS_SOON', subject: `${c.id}|end`, severity: 'hinweis', requires_decision: 0,
      ...fm('CONTRACT_ENDS_SOON', { plate: c.plate, ckind: c.kind, partner: c.partner, no: c.contract_no || null, end: c.end_date, days: s.end.days }), next_action: 'Rückgabe, Verlängerung oder Ersatzfahrzeug klären.' });
    if (s.notice && s.notice.status === 'bald') out.push({ ...base, code: 'CONTRACT_NOTICE_DUE', subject: `${c.id}|notice`, severity: 'hinweis', requires_decision: 1,
      ...fm('CONTRACT_NOTICE_DUE', { plate: c.plate, ckind: c.kind, partner: c.partner, no: c.contract_no || null, by: s.notice.by, months: c.notice_months, end: c.end_date }), next_action: 'Entscheiden: kündigen oder verlängern. Frist und Form laut Vertrag prüfen.' });
    // Schweregrad wie die Vertragsübersicht (Status „handeln“, bis 19.10.2026 hier nur „hinweis“)
    if (s.km && s.km.status === 'ueber') out.push({ ...base, code: 'CONTRACT_KM_OVER', subject: `${c.id}|km`, severity: 'handeln', requires_decision: 0,
      ...fm('CONTRACT_KM_OVER', { plate: c.plate, ckind: c.kind, partner: c.partner, no: c.contract_no || null, allow: c.km_allowance, driven: s.km.driven }), next_action: 'Mehrkilometer-Regelung im Vertrag prüfen; ggf. Vertrag anpassen.' });
    else if (s.km && s.km.status === 'prognose_ueber') out.push({ ...base, code: 'CONTRACT_KM_FORECAST', subject: `${c.id}|km`, severity: 'hinweis', requires_decision: 0,
      ...fm('CONTRACT_KM_FORECAST', { plate: c.plate, ckind: c.kind, partner: c.partner, no: c.contract_no || null, fc: s.km.forecast_driven, allow: c.km_allowance }), next_action: 'Einsatz des Fahrzeugs bzw. Vertragsanpassung prüfen.' });
    // km-Kontingent nach Zähler-Rücksprung (Tachotausch) nicht berechenbar – analog INSPECTION_UNCLEAR; bis 19.10.2026 ohne Befund,
    // eine echte Überschreitung blieb so unbemerkt, bis jemand die Akte öffnete
    else if (s.km && s.km.status === 'zaehler') out.push({ ...base, code: 'CONTRACT_KM_UNCLEAR', subject: `${c.id}|km`, severity: 'hinweis', requires_decision: 0,
      ...fm('CONTRACT_KM_UNCLEAR', { plate: c.plate, ckind: c.kind, partner: c.partner, no: c.contract_no || null, at: s.km.drop_at ? berlinDate(s.km.drop_at) : null }),
      next_action: 'km-Stand bei Übernahme bzw. Tausch laut Beleg prüfen und im Vertrag „km bei Übernahme … geprüft“ bestätigen.' });
    // km-Stand unter „km bei Übernahme“: Übersicht und Datenqualität melden es, der Agent bis 22.10.2026 nicht
    else if (s.km && s.km.status === 'unter_start') out.push({ ...base, code: 'CONTRACT_KM_BELOW_START', subject: `${c.id}|km`, severity: 'hinweis', requires_decision: 0,
      ...fm('CONTRACT_KM_BELOW_START', { plate: c.plate, ckind: c.kind, partner: c.partner, no: c.contract_no || null, km: s.km.current_km, start: s.km.start_km }),
      next_action: '„km bei Übernahme“ im Vertrag laut Beleg bzw. den letzten km-Stand prüfen und korrigieren.' });
  }
  return out;
}

// ---------- Sammelimport (CSV, „;“ oder „,“) mit Vorschau ----------
// Spalten (Groß/Klein egal, Anfang genügt): Kennzeichen und/oder FIN, Vertragsart, Vertragspartner, Vertragsnummer, Beginn, Ende,
// Kündigungsfrist (Monate), km-Kontingent, km bei Übernahme, Monatsrate, Nachweis (sonst `source` für alle Zeilen), Bemerkung.
// Nur eindeutige Fahrzeuge (FIN, sonst eindeutiges Kennzeichen); vorhandene Verträge (gleiches Fahrzeug, Art und Vertragsnummer
// bzw. ohne Nummer gleicher Partner und Beginn) bleiben unverändert – der Import überschreibt nie.
const MAX_IMPORT = 500;
const flagLike = (v) => v === true || v === 1 || v === '1' || v === 'true';
const normVin = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const KIND_ALIASES = { leasing: 'leasing', leasingvertrag: 'leasing', miete: 'miete', mietvertrag: 'miete', vermietung: 'miete', rental: 'miete', finanzierung: 'finanzierung', kredit: 'finanzierung', darlehen: 'finanzierung',
  versicherung: 'versicherung', 'kfz-versicherung': 'versicherung', haftpflicht: 'versicherung', vollkasko: 'versicherung', teilkasko: 'versicherung', wartung: 'wartung', wartungsvertrag: 'wartung', service: 'wartung', 'full-service': 'wartung', sonstiges: 'sonstiges', sonstige: 'sonstiges', vertrag: 'sonstiges' };
export function contractKindOf(raw) { return KIND_ALIASES[String(raw || '').trim().toLowerCase()] || null; }
export function parseDay(raw) {
  const t = String(raw || '').trim(); let m;
  const iso = (d) => (ISO.test(d) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d ? d : null);
  if (!t) return '';
  if (ISO.test(t)) return iso(t);
  if ((m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) return iso(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  return null;
}
// Deutsche Zahlen: „1.234,50“, „100.000“, „1234,5“, „1 234“, „€ 999“ → Zahl; leer → null; sonst NaN
export function parseDeNum(raw) {
  let t = String(raw || '').replace(/[€\s ]|EUR|km/gi, '');
  if (!t) return null;
  // Komma nur im deutschen Muster (1.234,50 bzw. 1234,5) – „1,234.50“ ergab vorher still 1,2345 (17.10.2026)
  if (t.includes(',')) { if (!/^\d{1,3}(\.\d{3})*,\d+$|^\d+,\d+$/.test(t)) return NaN; t = t.replace(/\./g, '').replace(',', '.'); }
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  // „1,000“/„120,000“ (englische Tausender) ist mehrdeutig – wurde still 1,00 € bzw. 120 km (18.10.2026); wie das Formular abweisen
  if (/^\d{1,3}(,\d{3})+$/.test(String(raw || '').replace(/[€\s ]|EUR|km/gi, ''))) return NaN;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

export async function importContracts(env, user, text, { dryRun = false, source = '' } = {}) {
  if (!isMgr(user)) throw forbidden();
  const table = parseCsv(text);
  if (table.length < 2) throw bad('validation', 'CSV leer.');
  if (table.length - 1 > MAX_IMPORT) throw bad('validation', `Maximal ${MAX_IMPORT} Zeilen je Import.`);
  const head = table[0].map((h) => h.toLowerCase().trim());
  // Spalten nach Vorrang der Suchwörter (nicht nach Spaltenreihenfolge); kurze Suchwörter nur bei genauer Übereinstimmung –
  // „Ratenanzahl“ oder „Nr.“ (laufende Nummer) vor der richtigen Spalte ergaben sonst falsche Raten/Vertragsnummern (17.10.2026)
  const EXACT = new Set(['art', 'typ', 'nr', 'rate', 'fin', 'vin']);
  const bare = (h) => h.replace(/[.:]+$/, '').trim();
  const col = (names, exclude = []) => {
    for (const n of names) {
      const i = head.findIndex((h) => !(typeof exclude === 'function' ? exclude(h) : exclude.some((x) => h.includes(x))) && (EXACT.has(n) ? bare(h) === n : h.startsWith(n)));
      if (i >= 0) return i;
    }
    return -1;
  };
  // Jahreswerte („Laufleistung p.a.“) sind kein Gesamt-Kontingent – nicht still übernehmen (18.10.2026: 20 000 km/Jahr galt als Gesamtkontingent)
  // auch „p. a.“, „pa“, „jährl.“ (18.10.2026: nur genau „p.a“ wurde erkannt)
  const isAnnual = (h) => /\bp\.?\s*a\b\.?|jährl|jaehrl|jahr/.test(h);
  if (head.some((h) => ['laufleistung', 'kontingent'].some((k) => h.includes(k)) && isAnnual(h))
    && !head.some((h) => ['km-kontingent', 'km kontingent', 'kontingent', 'laufleistung'].some((k) => h.startsWith(k)) && !isAnnual(h))) {
    throw bad('validation', 'Spalte mit Laufleistung pro Jahr erkannt – bitte das Gesamt-km-Kontingent der Laufzeit als Spalte „km-Kontingent“ angeben (Jahreswerte werden nicht umgerechnet).');
  }
  // Brutto-Rate („inkl. MwSt.“, „gross“) ist keine Netto-Rate (18.10.2026: wurde still 19 % zu hoch übernommen); „zzgl./netto/exkl.“ bleibt netto
  const isGrossOrCount = (h) => h.includes('anzahl') || h.includes('brutto') || (/inkl|gross|mwst|\bust\b/.test(h) && !/zzgl|netto|exkl|ohne/.test(h));
  // Kündigungsfrist in Tagen/Wochen ist keine Monatsangabe (18.10.2026: 30 Tage galten still als 30 Monate)
  if (head.some((h) => /^(kündigung|kuendigung)/.test(h) && /tag|woche/.test(h))) throw bad('validation', 'Kündigungsfrist in Tagen oder Wochen erkannt – bitte in Monaten angeben (Spalte „Kündigungsfrist (Monate)“; Tage/Wochen werden nicht umgerechnet).');
  // FIN/Fahrgestell ohne Anhänger-/Aufliegerspalten („FIN Anhänger“ ist nicht die Fahrzeug-FIN; 21.10.2026: Lkw-Vertrag landete am Anhänger)
  // Beginn auch „Laufzeitbeginn“/„Leasingbeginn“ (wurde still ignoriert, 17.10.2026)
  const ci = { plate: col(['kennzeichen', 'amtl'], (h) => /anh(ä|ae)nger|auflieger|trailer/.test(h)) /* „Kennzeichen Anhänger“ ist nicht das Fahrzeug (21.10.2026) */, vin: col(['fin', 'fahrgestell', 'vin'], (h) => /anh(ä|ae)nger|auflieger|trailer/.test(h)), kind: col(['vertragsart', 'art', 'typ']),
    partner: col(['vertragspartner', 'partner', 'leasinggeber', 'vermieter', 'versicherer', 'gesellschaft']), no: col(['vertragsnummer', 'vertrags-nr', 'vertragsnr', 'vertrag nr', 'vertrag-nr', 'police', 'versicherungsschein', 'versicherungsnummer', 'vsnr', 'nummer', 'nr'], (h) => /schild|kennz|kfz-nr|amtl/.test(h)), // auch Versicherungsköpfe (19.10.2026)
    start: col(['vertragsbeginn', 'laufzeitbeginn', 'leasingbeginn', 'mietbeginn', 'versicherungsbeginn', 'policenbeginn', 'beginn', 'start', 'gültig ab', 'gueltig ab', 'gültig von', 'gueltig von']), end: col(['vertragsende', 'laufzeitende', 'leasingende', 'mietende', 'versicherungsende', 'policenende', 'ende', 'ablauf', 'gültig bis', 'gueltig bis']), notice: col(['kündigungsfrist', 'kuendigungsfrist', 'kündigung', 'kuendigung']),
    allowance: col(['km-kontingent', 'km kontingent', 'kontingent', 'laufleistung'], isAnnual), start_km: col(['km bei übernahme', 'km bei uebernahme', 'übernahme', 'uebernahme', 'km-stand bei']),
    rate: col(['monatsrate netto', 'monatsrate (netto)', 'rate netto', 'leasingrate netto', 'leasingrate (netto)', 'mietrate netto', 'monatliche rate', 'rate (netto)', 'monatsrate', 'leasingrate', 'mietrate', 'rate'], isGrossOrCount), ev: col(['nachweis', 'beleg', 'quelle', 'datei']), note: col(['bemerkung', 'notiz']) };
  // Datumsspalte erkannt, aber keiner Spalte Beginn/Ende zugeordnet (z. B. „Hauptfälligkeit“-Varianten): nicht still ohne Laufzeit anlegen (23.10.2026:
  // „Versicherungsbeginn/-ende“ ergaben Verträge ohne Beginn/Ende – nie „läuft aus“, beim Re-Import doppelt)
  const dateHead = head.findIndex((h, i) => { const b = h.replace(/\s*\(.*\)$/, ''); return i !== ci.start && i !== ci.end && !/km|prognose/.test(b) && /(beginn|ende|ablauf)$|^gültig|^gueltig/.test(b); });
  if (dateHead >= 0) throw bad('validation', `Datumsspalte „${table[0][dateHead]}“ nicht zugeordnet – bitte „Beginn“ und „Ende“ als Spaltennamen verwenden.`);
  const fallbackEv = str(source, { max: 300, field: 'Quelle' });
  if (ci.plate < 0 && ci.vin < 0) throw bad('validation', 'Spalte „Kennzeichen“ oder „FIN“ erforderlich.');
  if (ci.kind < 0) throw bad('validation', 'Spalte „Vertragsart“ erforderlich.');
  if (ci.partner < 0) throw bad('validation', 'Spalte „Vertragspartner“ erforderlich.');
  if (ci.ev < 0 && !fallbackEv) throw bad('validation', 'Spalte „Nachweis“ oder Angabe „Quelle“ für alle Zeilen erforderlich.');

  const [vehRes, exRes] = await Promise.all([
    env.DB.prepare('SELECT id, vin, plate, active, eval_excluded FROM vehicles').all(),
    env.DB.prepare('SELECT vehicle_id, kind, contract_no, partner, start_date, end_date, ended_on FROM vehicle_contracts').all(),
  ]);
  const vehicles = vehRes.results;
  const byVin = new Map(vehicles.map((v) => [normVin(v.vin), v]));
  // Kennzeichen doppelt (ruhendes/außer Betrieb genommenes Doppel): das bewertete aktive Fahrzeug wie bei den anderen Importen (17.10.2026)
  const byPlate = { get: (raw) => { const r = pickVehicleByPlate(vehicles, raw); return r.vehicle || (r.ambiguous ? 'mehrdeutig' : undefined); } };
  // mit Nummer auch der Beginn: Folgevertrag mit gleicher Nummer (nach Beenden erlaubt, `sameContract`) galt beim Rückimport sonst als „doppelt in der Datei“ (18.10.2026)
  const keyOf = (vid, kind, no, partner, start) => (no ? `${vid}|${kind}|#${lcDe(no)}|${start || ''}` : `${vid}|${kind}|${lcDe(partner)}|${start || ''}`);
  // Formelschutz des eigenen CSV-Exports („'-“, „'+Assekuranz“) zurücknehmen – Re-Import ergab sonst Dubletten (18.10.2026)
  const get = (cells, i) => (i >= 0 ? String(cells[i] || '').trim().replace(/^'(?=[=+\-@\t\r])/, '') : '');
  const rows = []; const skipped = []; const seen = new Set();
  table.slice(1).forEach((cells, idx) => {
    const line = cells.line || idx + 2;
    const skip = (reason) => skipped.push({ line, reason });
    const vin = normVin(get(cells, ci.vin));
    const v = vin ? byVin.get(vin) : get(cells, ci.plate) ? byPlate.get(get(cells, ci.plate)) : undefined;
    if (v === 'mehrdeutig') return skip(`Kennzeichen nicht eindeutig: ${get(cells, ci.plate)}`);
    if (!v) return skip(`Fahrzeug nicht gefunden: ${get(cells, ci.vin) || get(cells, ci.plate) || '–'}`);
    const kind = contractKindOf(get(cells, ci.kind));
    if (!kind) return skip(`Vertragsart unbekannt: ${get(cells, ci.kind) || '–'}`);
    const body = { kind, partner: get(cells, ci.partner), contract_no: get(cells, ci.no), evidence: get(cells, ci.ev) || fallbackEv, note: get(cells, ci.note) };
    for (const [k, c] of [['start_date', ci.start], ['end_date', ci.end]]) {
      const d = parseDay(get(cells, c));
      if (d === null) return skip(`Datum nicht erkannt: ${get(cells, c)}`);
      body[k] = d || null;
    }
    for (const [k, c] of [['notice_months', ci.notice], ['km_allowance', ci.allowance], ['start_km', ci.start_km], ['monthly_rate_net', ci.rate]]) {
      // „3 Monate“ in der Spalte Kündigungsfrist: Einheit entfernen (wurde als „Zahl nicht erkannt“ übersprungen)
      const n = parseDeNum(k === 'notice_months' ? get(cells, c).replace(/\s*(monate?|mon\.?|mo\.?)\s*$/i, '') : get(cells, c));
      if (Number.isNaN(n)) return skip(`Zahl nicht erkannt: ${get(cells, c)}`);
      body[k] = n;
    }
    let f;
    try { f = readBody(body); } catch (e) { return skip(e.message); }
    const key = keyOf(v.id, f.kind, f.contract_no, f.partner, f.start_date);
    if (seen.has(key)) return skip('doppelt in der Datei');
    seen.add(key);
    const match = exRes.results.find((c) => c.vehicle_id === v.id && sameContract(c, f));
    // gleiche Vertragsnummer läuft noch mit anderem Beginn (Verlängerung/Folgepolice): nicht „vorhanden“ melden, ohne etwas anzulegen (23.10.2026 –
    // ab 01.01. meldete der Agent „abgelaufen“); das Formular weist denselben Fall mit 409 ab
    if (match && f.contract_no && f.start_date && !match.ended_on && (match.start_date || '') !== f.start_date) return skip(`Vertragsnummer läuft noch (Beginn ${match.start_date || '–'}) – Folgevertrag erst nach „Vertrag beenden“ importieren`);
    const status = match ? 'vorhanden' : 'neu';
    // nur über das Kennzeichen zugeordnet: derselbe Vertrag steht schon an einem anderen Fahrzeug mit diesem Kennzeichen (z. B. zurückgegebener Lkw,
    // Nachfolger trägt das Kennzeichen) → nicht als neuen laufenden Vertrag am Nachfolger anlegen (23.10.2026: Raten doppelt im Kostenbericht)
    if (status === 'neu' && !vin) {
      const pk = normPlate(v.plate);
      const other = exRes.results.find((c) => c.vehicle_id !== v.id && sameContract(c, f) && vehicles.some((x) => x.id === c.vehicle_id && normPlate(x.plate) === pk));
      if (other) { const ov = vehicles.find((x) => x.id === other.vehicle_id); return skip(`Vertrag besteht bereits beim Fahrzeug mit gleichem Kennzeichen (FIN ${ov.vin || '–'}) – bitte FIN angeben`); }
    }
    // zwei neue Zeilen derselben Vertragsnummer (anderer oder fehlender Beginn) wären zwei laufende Verträge – das Formular weist das
    // schon ab (`sameContract` gegen laufenden Vertrag); die Einfüge-Prüfung sieht Zeilen derselben Anweisung nicht (18.10.2026)
    if (status === 'neu' && rows.some((r) => r.status === 'neu' && r.vehicle_id === v.id && sameContract({ ...r, ended_on: null }, f))) return skip('doppelt in der Datei');
    rows.push({ line, vehicle_id: v.id, plate: v.plate, ...f, status });
  });
  const fresh = rows.filter((r) => r.status === 'neu');
  const result = { dry_run: dryRun, counts: { neu: fresh.length, vorhanden: rows.length - fresh.length, uebersprungen: skipped.length }, rows, skipped }; // höchstens 500 Zeilen – vorher still auf 300 gekürzt (17.10.2026)
  if (dryRun || !fresh.length) return result;
  const now = nowIso();
  const drops = new Map((await env.DB.prepare(`SELECT v.id, ${KM_DROP_SQL('v.id')} AS d FROM vehicles v WHERE v.id IN (SELECT value FROM json_each(?))`).bind(JSON.stringify([...new Set(fresh.map((r) => r.vehicle_id))])).all()).results.map((x) => [x.id, parseKmDrop(x.d)]));
  const items = fresh.map((r) => ({ id: uuid(), v: r.vehicle_id, kind: r.kind, partner: r.partner, no: r.contract_no, sd: r.start_date, ed: r.end_date, nm: r.notice_months, ka: r.km_allowance, sk: r.start_km, rate: r.monthly_rate_net, ev: r.evidence, note: r.note,
    kb: contractKmBasis(drops.get(r.vehicle_id), r.start_date, now) }));
  const J = (k) => `json_extract(value,'$.${k}')`;
  // Vorhanden-Prüfung im Einfügen selbst (gleicher Schlüssel wie keyOf): zwei gleichzeitige Importe derselben Datei legten sonst jeden Vertrag doppelt an (17.10.2026)
  const r = await env.DB.prepare(`INSERT INTO vehicle_contracts(id,vehicle_id,kind,partner,contract_no,start_date,end_date,notice_months,km_allowance,start_km,monthly_rate_net,evidence,note,created_by,created_at,updated_at,km_basis_at)
    SELECT ${J('id')}, ${J('v')}, ${J('kind')}, ${J('partner')}, ${J('no')}, ${J('sd')}, ${J('ed')}, ${J('nm')}, ${J('ka')}, ${J('sk')}, ${J('rate')}, ${J('ev')}, ${J('note')}, ?1, ?2, ?2, ${J('kb')} FROM json_each(?3)
    WHERE NOT EXISTS (SELECT 1 FROM vehicle_contracts c WHERE c.vehicle_id=${J('v')} AND c.kind=${J('kind')} AND (CASE WHEN COALESCE(${J('no')},'')<>''
      THEN LOWER(REPLACE(REPLACE(REPLACE(COALESCE(c.contract_no,''),'Ä','ä'),'Ö','ö'),'Ü','ü'))=LOWER(REPLACE(REPLACE(REPLACE(${J('no')},'Ä','ä'),'Ö','ö'),'Ü','ü')) AND (c.ended_on IS NULL OR COALESCE(c.start_date,'')=COALESCE(${J('sd')},''))
      ELSE COALESCE(c.contract_no,'')='' AND LOWER(REPLACE(REPLACE(REPLACE(COALESCE(c.partner,''),'Ä','ä'),'Ö','ö'),'Ü','ü'))=LOWER(REPLACE(REPLACE(REPLACE(COALESCE(${J('partner')},''),'Ä','ä'),'Ö','ö'),'Ü','ü')) AND COALESCE(c.start_date,'')=COALESCE(${J('sd')},'') END))`)
    .bind(user.id, now, JSON.stringify(items)).run();
  const inserted = r.meta && typeof r.meta.changes === 'number' ? r.meta.changes : fresh.length;
  if (inserted < fresh.length) {
    result.counts.vorhanden += fresh.length - inserted; result.counts.neu = inserted; result.concurrent = true;
    // Zeilen der Ergebnistabelle wie die Zähler (20.10.2026: Tabelle zeigte „neu“ für nicht angelegte Verträge)
    const have = new Set((await env.DB.prepare('SELECT id FROM vehicle_contracts WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(items.map((x) => x.id))).all()).results.map((x) => x.id));
    fresh.forEach((row, i) => { if (!have.has(items[i].id)) row.status = 'vorhanden'; });
  }
  await audit(env, user.id, 'contract.import', null, result.counts);
  return result;
}
