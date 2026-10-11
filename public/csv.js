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
