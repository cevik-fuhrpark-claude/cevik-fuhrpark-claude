// [CLAUDE] Einstellungen (nur Inhaber): zulässige Werte je Schlüssel. Vorher wurde jede endliche Zahl gespeichert (auch −5 Tage,
// 0,5 Minuten, Stundensatz 0 €) und ein nicht lesbarer Wert („abc“, „1.500,50“ nach Komma→Punkt im Browser) still übergangen,
// obwohl die App „✓ gespeichert“ meldete; „1.000“ (Tausenderpunkt) wurde als 1 € Freigabegrenze gespeichert (16.10.2026).
// Die Grenzen sind Plausibilitätsgrenzen gegen Tippfehler, keine fachlichen Vorgaben – leer bleibt immer „aus“ bzw. Standard.
import { HttpError, num } from './util.js';

const SLA_KEYS = ['test', 'production'].flatMap((e) => ['triage', 'ack'].flatMap((k) => ['niedrig', 'mittel', 'kritisch'].map((p) => `sla_${e}_${k}_${p}_min`)));

// int = ganze Zahl; min/max einschließlich. 0 nur, wo es eine Bedeutung hat (Vorwarnung 0 Tage, Freigabegrenze/„lange nicht angemeldet“ 0 = aus).
export const SETTING_RULES = {
  workshop_hourly_rate_net: { min: 0.01, max: 1000 },
  idle_logout_workshop_min: { int: true, min: 1, max: 10080 },
  idle_logout_other_min: { int: true, min: 1, max: 10080 },
  driver_doc_warn_days: { int: true, min: 0, max: 365 },
  tacho_warn_days: { int: true, min: 0, max: 90 },
  license_check_months: { int: true, min: 1, max: 60 },
  maintenance_warn_days: { int: true, min: 1, max: 365 },
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
export const SETTINGS_KEYS = ['test_master_readonly', ...Object.keys(SETTING_RULES)];

// Ein Wert → gespeicherter Text ('' = aus). Ungültig → 400 setting_invalid mit Schlüssel und Grenzen (die App nennt das Feld in ihrer Sprache).
export function settingValue(key, v) {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return '';
  if (key === 'test_master_readonly') {
    if (v === true || v === 1 || v === '1') return '1';
    if (v === false || v === 0 || v === '0') return '';
    throw invalid(key);
  }
  const r = SETTING_RULES[key];
  if (typeof v !== 'number' && typeof v !== 'string') throw invalid(key, r);
  let n;
  try { n = num(v, { min: r.min, max: r.max, grouped: !!r.int }); } catch { throw invalid(key, r); }
  if (r.int && !Number.isInteger(n)) throw invalid(key, r);
  return String(Math.round(n * 100) / 100); // höchstens 2 Nachkommastellen (Euro, mm)
}

function invalid(key, r) {
  const range = r ? ` Erlaubt: ${String(r.min).replace('.', ',')} bis ${String(r.max).replace('.', ',')}${r.int ? ', ganze Zahl' : ''}.` : '';
  return new HttpError(400, 'setting_invalid', `Einstellung ungültig – nichts gespeichert.${range}`, { setting: key, ...(r ? { min: r.min, max: r.max, integer: !!r.int } : {}) });
}

// Alle Felder prüfen, bevor etwas gespeichert wird (sonst halb gespeichertes Formular). Unbekannte Schlüssel werden ignoriert.
export function settingPairs(body) {
  const pairs = [];
  for (const [k, v] of Object.entries(body)) if (SETTINGS_KEYS.includes(k)) pairs.push([k, settingValue(k, v)]);
  return pairs;
}
