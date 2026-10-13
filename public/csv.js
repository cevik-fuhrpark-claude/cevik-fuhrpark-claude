// [CLAUDE] CSV-Erzeugung im Browser (Excel-tauglich: BOM, Semikolon, CRLF, Formelschutz) – reine Funktionen, auch in den Tests genutzt
export function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-\d+(?:[.,]\d+)?$/.test(s)) s = "'" + s; // Formelschutz (CSV-Injection); negative Zahlen bleiben Zahlen
  return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function toCsv(header, rows) {
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
// Datenqualität: Befunde mit Beschriftungen in der App-Sprache (t = Übersetzungsfunktion)
export function dataQualityCsv(items, t, fmtD = null) {
  return toCsv([t('dq_col_severity'), t('dq_col_check'), t('dq_col_object'), t('dq_col_detail')],
    items.map((i) => [t('dq_sev_' + i.severity), t('dq_' + i.check), i.plate || i.driver_name || '', fmtD ? dqDetailText(i, t, fmtD) : i.detail || '']));
}
// [CLAUDE] Datenqualität: Detail in der App-Sprache (Ansicht und CSV). Server liefert detail (deutsch, für Integrations-API)
// und ggf. detail_args (sprachneutral); ohne detail_args werden ISO-Daten im Detail lokal formatiert.
export function dqDetailText(i, t, fmtD) {
  const a = i.detail_args;
  if (!i.detail) return '';
  if (i.check === 'km_stale') return fmtD(i.detail);
  if (i.check === 'telematics_vehicle_inactive') return i.detail.replace('außer Betrieb seit', t('inactive_since'));
  if (!a) return i.detail.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (d) => fmtD(d));
  if (a.contract_kind) return `${t('ck_' + a.contract_kind)} · ${a.partner}`;
  if (a.role) return `${a.name} (${t('role_' + a.role)})${a.expired ? ' – ' + t('dq_invite_expired') : ''}`;
  if (a.result) return `${a.kind} ${fmtD(a.done_date)} · ${t('res_' + a.result)}${a.case_no ? ' · ' + t('dq_defect_case').replace('{no}', a.case_no).replace('{d}', fmtD(a.first_date)) : ''}`;
  return i.detail;
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
// [CLAUDE] CSV-Datei lesen: UTF-8 (mit/ohne BOM) oder – wie Excel unter deutschem Windows „CSV (Trennzeichen-getrennt)“
// speichert – Windows-1252. Ohne diese Erkennung wurden Umlaute in Kopfzeilen („Nächster Termin“, „Fällig am“) und Werten
// zu „�“ und die Spalte nicht gefunden. UTF-16 nur mit BOM. Reine Funktion (Bytes → Text), auch in den Tests genutzt.
export function decodeCsvBytes(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (b[0] === 0xFF && b[1] === 0xFE) return new TextDecoder('utf-16le').decode(b.subarray(2));
  if (b[0] === 0xFE && b[1] === 0xFF) return new TextDecoder('utf-16be').decode(b.subarray(2));
  const bom = b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF;
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bom ? b.subarray(3) : b); } catch { return new TextDecoder('windows-1252').decode(b); }
}
export async function readCsvFile(file) { return decodeCsvBytes(await file.arrayBuffer()); }
