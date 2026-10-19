// [CLAUDE] Einstellungen (nur Inhaber): zulässige Werte je Schlüssel. Vorher wurde jede endliche Zahl gespeichert (auch −5 Tage,
// 0,5 Minuten, Stundensatz 0 €) und ein nicht lesbarer Wert („abc“, „1.500,50“ nach Komma→Punkt im Browser) still übergangen,
// obwohl die App „✓ gespeichert“ meldete; „1.000“ (Tausenderpunkt) wurde als 1 € Freigabegrenze gespeichert (16.10.2026).
// Die Grenzen sind Plausibilitätsgrenzen gegen Tippfehler, keine fachlichen Vorgaben – leer bleibt immer „aus“ bzw. Standard.
import { HttpError, num } from './util.js';

const SLA_KEYS = ['test', 'production'].flatMap((e) => ['triage', 'ack'].flatMap((k) => ['niedrig', 'mittel', 'kritisch'].map((p) => `sla_${e}_${k}_${p}_min`)));

// int = ganze Zahl; min/max einschließlich. 0 nur, wo es eine Bedeutung hat (Vorwarnung 0 Tage, Freigabegrenze/„lange nicht angemeldet“ 0 = aus).
export const SETTING_RULES = {
  workshop_hourly_rate_net: { min: 0.01, max: 1000 },
  idle_logout_workshop_min: { int: true, min: 5, max: 10080 }, // wirksam war schon immer mind. 5 (src/auth.js, Hilfetext) – 1–4 wurde still auf 5 angehoben
  idle_logout_other_min: { int: true, min: 5, max: 10080 }, // wirksam war schon immer mind. 5 (src/auth.js, Hilfetext) – 1–4 wurde still auf 5 angehoben
  driver_doc_warn_days: { int: true, min: 0, max: 365 },
  tacho_warn_days: { int: true, min: 0, max: 90 },
  license_check_months: { int: true, min: 1, max: 60 },
  maintenance_warn_days: { int: true, min: 0, max: 365 }, // 0 = „bald fällig“ erst am Fälligkeitstag (wie Fahrernachweise/Verträge/Auslesungen; bis 17.10.2026 min 1)
  maintenance_warn_km: { int: true, min: 1, max: 200000 },
  tire_warn_tread_mm: { min: 1.6, max: 30 },
  tire_warn_age_years: { int: true, min: 1, max: 20 },
  fine_warn_days: { int: true, min: 0, max: 365 },
  contract_warn_days: { int: true, min: 0, max: 730 },
  claim_followup_days: { int: true, min: 1, max: 365 },
  case_stale_days: { int: true, min: 1, max: 365 },
  repair_cost_limit_net: { min: 0, max: 1000000 },
  user_unused_days: { int: true, min: 0, max: 3650 },
  ...Object.fromEntries(SLA_KEYS.map((k) => [k, { int: true, min: 1, max: 43200 }])),
};
// Standardwerte bei leerem Feld (einzige Quelle: Verbraucher, Einstellungs-Antwort `defaults`, Platzhalter im Formular; Bezeichnungen per Test geprüft).
// Alle übrigen Einstellungen: leer = aus bzw. nicht festgelegt (keine eigene Vorgabe der App).
export const SETTING_DEFAULTS = { maintenance_warn_days: 30, driver_doc_warn_days: 30, tacho_warn_days: 7, contract_warn_days: 60 };
// Vorwarnung Prüftermine/Wartung (Tage) aus dem gespeicherten Text: 0 bleibt 0, leer/ungültig = Standard (einzige Auswertung für Übersicht, Akte, Agent, Kalender).
export function maintenanceWarnDays(v) {
  const n = v === undefined || v === null || v === '' ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : SETTING_DEFAULTS.maintenance_warn_days;
}
export const SETTINGS_KEYS = ['test_master_readonly', ...Object.keys(SETTING_RULES)];

// Ein Wert → gespeicherter Text ('' = aus). Ungültig → 400 setting_invalid mit Schlüssel und Grenzen (die App nennt das Feld in ihrer Sprache).
export function settingValue(key, v, { decimalPoint = false } = {}) {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return '';
  if (key === 'test_master_readonly') {
    if (v === true || v === 1 || v === '1') return '1';
    if (v === false || v === 0 || v === '0') return '';
    throw invalid(key);
  }
  const r = SETTING_RULES[key];
  if (typeof v !== 'number' && typeof v !== 'string') throw invalid(key, r);
  let n;
  try { n = num(v, { min: r.min, max: r.max, grouped: !!r.int, decimalPoint: decimalPoint && !r.int }); } catch { throw invalid(key, r); }
  if (r.int && !Number.isInteger(n)) throw invalid(key, r);
  // höchstens 2 Nachkommastellen (Euro, mm) – mehr wird abgewiesen statt gerundet (18.10.2026: „0,004“ € wurde still zu 0 = Grenze aus)
  if (Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) throw invalid(key, r);
  if (n !== 0 && Math.round(n * 100) === 0) throw invalid(key, r); // 1e-9 lag innerhalb der Toleranz und wurde still zu „0 = aus“ (19.10.2026)
  return String(Math.round(n * 100) / 100);
}

function invalid(key, r) {
  const range = r ? ` Erlaubt: ${String(r.min).replace('.', ',')} bis ${String(r.max).replace('.', ',')}${r.int ? ', ganze Zahl' : ''}.` : '';
  return new HttpError(400, 'setting_invalid', `Einstellung ungültig – nichts gespeichert.${range}`, { setting: key, ...(r ? { min: r.min, max: r.max, integer: !!r.int } : {}) });
}

// Alle Felder prüfen, bevor etwas gespeichert wird (sonst halb gespeichertes Formular). Unbekannte Schlüssel werden ignoriert.
export function settingPairs(body, { decimalPoint = false } = {}) { // decimalPoint: EN-Oberfläche („1.500“ € = 1,50 €)
  const pairs = [];
  for (const [k, v] of Object.entries(body)) if (SETTINGS_KEYS.includes(k)) pairs.push([k, settingValue(k, v, { decimalPoint })]);
  return pairs;
}

// Gespeicherte Werte gegen die Regeln prüfen (Werte von vor der Werteprüfung am 16.10.2026 oder aus einer eingespielten Sicherung):
// die App markiert sie beim Öffnen der Einstellungen, statt dass sie erst beim nächsten Speichern auffallen. Nichts wird geändert.
export function storedInvalid(values) {
  const out = [];
  for (const k of SETTINGS_KEYS) {
    const v = values[k];
    if (v === null || v === undefined || v === '') continue;
    try { settingValue(k, v); } catch (e) { out.push({ setting: k, value: String(v), ...(e.extra || {}) }); }
  }
  return out;
}
