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
// x = { km(n) → „200.000 km“ in der Sprache, src(code) → Herkunft eines km-Stands lesbar } (19.10.2026)
export function dataQualityCsv(items, t, fmtD = null, mk = (k) => k, x = {}) {
  return toCsv([t('dq_col_severity'), t('dq_col_check'), t('dq_col_object'), t('dq_col_detail')],
    items.map((i) => [t('dq_sev_' + i.severity), t('dq_' + i.check), i.plate || i.driver_name || '', fmtD ? dqDetailText(i, t, fmtD, mk, x) : i.detail || '']));
}
// [CLAUDE] Datenqualität: Detail in der App-Sprache (Ansicht und CSV). Server liefert detail (deutsch, für Integrations-API)
// und ggf. detail_args (sprachneutral); ohne detail_args werden ISO-Daten im Detail lokal formatiert.
export function dqDetailText(i, t, fmtD, mk = (k) => k, x = {}) {
  const a = i.detail_args;
  const km = x.km || ((n) => `${n} km`); const src = x.src || ((v) => v);
  if (!i.detail) return '';
  if (i.check === 'km_stale') return fmtD(i.detail);
  if (i.check === 'telematics_vehicle_inactive') return a && a.since ? `${a.source}: ${fmtD(a.day)} ${a.time} · ${t('inactive_since')} ${fmtD(a.since)}` : i.detail.replace('außer Betrieb seit', t('inactive_since'));
  if (!a) return i.detail.replace(/\b\d{4}-\d{2}-\d{2}\b/g, (d) => fmtD(d));
  if (i.check === 'missing_inspection' && Array.isArray(a.kinds)) return a.kinds.map(mk).join(', ');
  if (i.check === 'km_drop_unexplained' && a.day) return `${fmtD(a.day)}: ${km(a.prev_km)} → ${km(a.km)}${a.source ? ' · ' + src(a.source) : ''}${a.n > 1 ? ` · ${a.n}×` : ''}`;
  if (i.check === 'km_rule_no_base' && a.kind) return `${mk(a.kind)} · ${km(a.interval_km)}`;
  if ((i.check === 'km_inspection_rejected' || i.check === 'telematics_km_rejected') && a.cmp)
    return `${a.source ? a.source + ': ' : ''}${km(a.km)} (${fmtD(a.day)}) ${a.cmp === 'lt' ? '<' : '>'} ${km(a.other_km)}${a.other_day ? ` (${fmtD(a.other_day)})` : ''}`;
  if (i.check === 'vin_similar' && a.pos) return `${a.other_plate} · ${a.other_vin} · ${t('dq_vin_pos').replace('{n}', a.pos)}`;
  if (a.contract_kind) return `${t('ck_' + a.contract_kind)} · ${a.partner}${a.start_km !== undefined ? ` · ${km(a.km)} < ${km(a.start_km)}` : ''}`;
  if (a.role) return `${a.name} (${t('role_' + a.role)})${a.expired ? ' – ' + t('dq_invite_expired') : ''}`;
  if (i.check === 'inspection_no_result' && a.done_date) return `${mk(a.kind)} ${fmtD(a.done_date)}`;
  if (a.result) return `${mk(a.kind)} ${fmtD(a.done_date)} · ${t('res_' + a.result)}${a.case_no ? ' · ' + t('dq_defect_case').replace('{no}', a.case_no).replace('{d}', fmtD(a.first_date)) : ''}`;
  return i.detail;
}
// Agentenbefunde (Management-Panel) in der App-Sprache – zum Abarbeiten in Excel. msg(f) = Meldungstext in der App-Sprache,
// next(text) = nächster Schritt übersetzt, d(iso) = Zeitpunkt. Kurzbezeichnung leer, wenn für den Code keine existiert.
export function agentFindingsCsv(findings, t, msg, next, d) {
  return toCsv([t('afc_severity'), t('afc_label'), t('afc_code'), t('afc_message'), t('afc_next'), t('afc_owner'), t('afc_since')],
    findings.map((f) => [t('asev_' + f.severity), t('fc_' + f.finding_code) === 'fc_' + f.finding_code ? '' : t('fc_' + f.finding_code), f.finding_code, msg(f), next(f.next_action), t('role_' + f.owner_role), d(f.first_seen)]));
}
// [CLAUDE] Berechtigungsübersicht (Benutzer): wer hat welche Rolle, aktiv?, 2FA, Push, letzte Anmeldung – für die regelmäßige Prüfung
// der Zugänge (ausgeschiedene Personen). Keine Kennungen/Hashes, keine Personalnummer. ws(code) = Werkstattname, d(iso) = Zeitpunkt.
// Benutzerliste sortieren (Ansicht, Druck und CSV gleich). 'role' = Reihenfolge des Servers (Umgebung → Rolle → Name).
// 'login_oldest' für die Zugangsprüfung: zuerst Konten ohne protokollierte Anmeldung, dann die am längsten nicht genutzten;
// offene Einladungen (noch kein Passwort) zuletzt.
export function sortUsers(us, mode) {
  const nm = (a, b) => String(a.display_name || '').localeCompare(String(b.display_name || ''), 'de') || String(a.username || '').localeCompare(String(b.username || ''));
  if (mode === 'name') us.sort(nm);
  if (mode === 'login_oldest') {
    const rank = (u) => (!u.has_password ? 2 : u.last_login ? 1 : 0);
    us.sort((a, b) => rank(a) - rank(b) || String(a.last_login || '').localeCompare(String(b.last_login || '')) || nm(a, b));
  }
  return us;
}

// „Lange nicht angemeldet“ (Einstellung user_unused_days, leer/0 = aus → nie): nur aktive Konten mit Passwort; Bezug = letzte
// protokollierte Anmeldung oder letzte Nutzung einer Sitzung (last_seen; Sitzungen laufen 30 Tage – wer täglich arbeitet, gibt
// das Passwort selten ein, 17.10.2026), ohne beides der Anlagezeitpunkt (frisch angelegte Konten zählen nicht sofort).
export function isUnusedUser(u, days, nowMs = Date.now()) {
  const d = Math.floor(Number(days));
  if (!(d > 0) || !u.has_password || !u.active) return false;
  const last = [u.last_login, u.last_seen].filter(Boolean).sort().pop();
  const ref = Date.parse(last || u.created_at || '');
  return Number.isFinite(ref) && ref < nowMs - d * 86400000;
}

// Benutzerliste eingrenzen (Ansicht, Druck und CSV gleich): all | active | inactive (deaktiviert) | invite (Einladung offen)
// | locked (gesperrt nach Fehlversuchen) | unused (lange nicht angemeldet, siehe isUnusedUser) | r_<rolle>. Unbekannte Auswahl = alle. Gibt eine neue Liste zurück.
export function filterUsers(us, f, unusedDays) {
  const now = new Date().toISOString();
  const pick = {
    unused: (u) => isUnusedUser(u, unusedDays),
    active: (u) => u.has_password && u.active,
    inactive: (u) => !u.active, // auch nie eingerichtete Konten (19.10.2026)
    invite: (u) => !u.has_password && !!u.active,
    locked: (u) => !!u.locked_until && String(u.locked_until) > now,
  }[f] || (String(f || '').startsWith('r_') ? (u) => u.role === f.slice(2) : () => true);
  return us.filter(pick);
}

// Offene Einladung, deren neuester Link abgelaufen ist (Server: invite_expires_at nur ohne Passwort) → „Neue Einladung“ nötig
export function inviteExpired(u, nowIso = new Date().toISOString()) {
  return !u.has_password && !!u.active && (!u.invite_expires_at || String(u.invite_expires_at) < nowIso); // kein gültiger Link (entwertet/Aussteller ausgeschieden) wie abgelaufen (19.10.2026)
}

export function usersCsv(us, t, ws, d) {
  return toCsv([t('display_name'), t('username'), t('role'), t('workshop'), t('environment'), t('status'), t('tf_chip'), t('uc_push'), t('last_login')],
    us.map((u) => [u.display_name, u.username, t('role_' + u.role), u.workshop_site ? ws(u.workshop_site) : '', u.environment === 'test' ? t('env_testname') : t('env_prod'),
      (!u.active ? t('inactive') : !u.has_password ? t('dq_invite_pending') + (inviteExpired(u) ? ` (${t('inv_expired')})` : '') : t('active'))
        + (u.active && u.locked_until && String(u.locked_until) > new Date().toISOString() ? ` (${t('locked_until')} ${d(u.locked_until)})` : ''), u.has_totp ? t('uc_yes') : t('uc_no'), u.push_devices || 0, u.last_login ? d(u.last_login) : '']));
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
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bom ? b.subarray(3) : b); } catch { /* kein reines UTF-8 */ }
  // Gemischte Kodierung (UTF-8-Datei mit angehängten Windows-1252-Zeilen): als Windows-1252 gelesen würden alle UTF-8-Umlaute zu „Ã¶“ –
  // still gespeichert (21.10.2026). Typische UTF-8-Folge C2/C3 + 80–BF gefunden → abweisen (App: „als CSV UTF-8 neu speichern“).
  const err = (code) => Object.assign(new Error(code), { code, status: 400 });
  // 22.10.2026: mit BOM ist die Datei als UTF-8 gekennzeichnet – ungültige Bytes sind dann immer angehängte Fremdzeilen; außerdem
  // dreibytige UTF-8-Folgen E2 80–9F xx („–“, „€“, „„“) als UTF-8-Hinweis (vorher „Keilriemen â€“ Satz“ still übernommen)
  if (bom) throw err('csv_mixed_encoding');
  for (let i = 0; i + 1 < b.length; i++) {
    if ((b[i] === 0xC2 || b[i] === 0xC3) && b[i + 1] >= 0x80 && b[i + 1] <= 0xBF) throw err('csv_mixed_encoding');
    if (b[i] === 0xE2 && b[i + 1] >= 0x80 && b[i + 1] <= 0x9F && i + 2 < b.length && b[i + 2] >= 0x80 && b[i + 2] <= 0xBF) throw err('csv_mixed_encoding');
  }
  // Excel für Mac „CSV“ speichert Mac Roman: Umlaute 80/85/86/8A/9A/9F, ß A7 – als Windows-1252 gelesen „MŸnchen“, „…lfilter“ (22.10.2026,
  // still gespeichert). Solche Bytes zwischen Buchstaben ohne ein einziges Windows-Umlaut-Byte → abweisen statt raten.
  const W = new Set([0xC4, 0xD6, 0xDC, 0xE4, 0xF6, 0xFC, 0xDF]); const M = new Set([0x80, 0x85, 0x86, 0x8A, 0x9A, 0x9F, 0xA7]);
  const letter = (x) => x !== undefined && ((x >= 0x41 && x <= 0x5A) || (x >= 0x61 && x <= 0x7A));
  const edge = (x) => x === undefined || [0x3B, 0x2C, 0x09, 0x20, 0x22, 0x0A, 0x0D].includes(x);
  if (!b.some((x) => W.has(x))) for (let i = 0; i < b.length; i++) if (M.has(b[i]) && letter(b[i + 1]) && (letter(b[i - 1]) || edge(b[i - 1]))) throw err('csv_unknown_encoding');
  return new TextDecoder('windows-1252').decode(b);
}
export async function readCsvFile(file) { return decodeCsvBytes(await file.arrayBuffer()); }
