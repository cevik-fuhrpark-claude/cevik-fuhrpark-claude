// [CLAUDE] CSV-Erzeugung im Browser (Excel-tauglich: BOM, Semikolon, CRLF, Formelschutz) – reine Funktionen, auch in den Tests genutzt
export function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // Formelschutz (CSV-Injection)
  return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function toCsv(header, rows) {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
// Datenqualität: Befunde mit Beschriftungen in der App-Sprache (t = Übersetzungsfunktion)
export function dataQualityCsv(items, t) {
  return toCsv([t('dq_col_severity'), t('dq_col_check'), t('dq_col_object'), t('dq_col_detail')],
    items.map((i) => [t('dq_sev_' + i.severity), t('dq_' + i.check), i.plate || i.driver_name || '', i.detail || '']));
}
// Mängelstatistik: je Prüfpunkt bzw. je Fahrzeug (alle Fahrzeuge mit Kontrollen im Zeitraum, auch ohne Mangel).
// label(k) = Prüfpunkt-Bezeichnung in der App-Sprache, d(iso) = Datum; leere Zelle = kein Wert.
export function defectItemsCsv(r, t, label, d) {
  return toCsv([t('check_item'), t('defect_items'), t('again_after_repair'), t('nav_vehicles'), t('last_used')],
    r.items.map((i) => [label(i.item), i.defects, i.again_after_repair, i.vehicle_count, i.last_at ? d(i.last_at) : '']));
}
export function defectVehiclesCsv(r, t, d) {
  return toCsv([t('vehicle'), t('checks_done'), t('checks_with_defects'), t('defect_items'), t('last_check_any')],
    r.vehicles.map((v) => [v.plate, v.checks, v.checks_with_defects, v.defect_items, v.last_check_at ? d(v.last_check_at) : '']));
}
