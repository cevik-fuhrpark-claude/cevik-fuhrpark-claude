// [CLAUDE] Backlog 441 (Blickwinkel „Rückruf eines Teilelieferanten: an welchen Lkw ist Teil X verbaut?“):
// Teile-Verwendung über alle Vorgänge – je Einbau (Teil im Vorgang) Fahrzeug, Datum, Menge, Lieferant, Beleg, Gewährleistung.
// Suche über Teilenummer (Leerzeichen, Bindestriche, Punkte, Schrägstriche egal), Bezeichnung, Lieferant und Beleg.
// Inhaber/Fuhrparkleitung: alle Vorgänge der Umgebung; Werkstatt: nur Aufträge des eigenen Standorts; sonst 403.
// Keine Preise und keine Personen (Datensparsamkeit) – die Liste dient dem Auffinden der Fahrzeuge, nicht der Kostenauswertung.
// Die App weiß nur, wo ein Teil laut Vorgang eingebaut wurde – nicht, ob es inzwischen wieder ausgebaut ist (Hinweis in der Oberfläche).
import { bad, forbidden, str, isCalendarDate, berlinDate, berlinDayStartIso, caseVariants, plateCmp, quoteCell } from './util.js';
import { CASE_STATUS_DE } from './cases.js';

export const PARTS_USAGE_MAX = 2000;
const PN_STRIP = [' ', '-', '.', '/'];
const pnKeySql = (x) => PN_STRIP.reduce((acc, ch) => `REPLACE(${acc},'${ch}','')`, `UPPER(COALESCE(${x},''))`);
export const pnKey = (s) => String(s || '').toLocaleUpperCase('de').replace(/[\s\-./]/g, '');

export async function partsUsage(env, user, envName, query = {}) {
  const ws = user.role === 'workshop';
  if (!(user.role === 'owner' || user.role === 'fleet' || (ws && user.workshop_site))) throw forbidden();
  const q = String(str(query.q, { max: 80, field: 'Suche' }) || '').trim().replace(/\s+/g, ' ');
  if (q.length < 3) throw bad('validation', 'Bitte mindestens 3 Zeichen der Teilenummer oder Bezeichnung angeben.');
  const from = query.from ? String(query.from) : ''; const to = query.to ? String(query.to) : '';
  if ((from && !isCalendarDate(from)) || (to && !isCalendarDate(to))) throw bad('validation', 'Zeitraum: Datum im Format JJJJ-MM-TT angeben.');
  if (from && to && from > to) throw bad('validation', 'Zeitraum: „von“ liegt nach „bis“.');
  const key = pnKey(q);
  // Bezeichnung/Lieferant/Beleg: instr statt LIKE (D1: Muster > 50 Byte), Schreibweisen-Varianten für Umlaute/Kyrillisch (lower() nur A–Z)
  const vs = caseVariants(q);
  const textSql = vs.flatMap(() => ['p.name', 'p.supplier', 'p.document_ref'].map((c) => `instr(lower(COALESCE(${c},'')), lower(?)) > 0`)).join(' OR ');
  const where = ['c.environment=?', `((? <> '' AND instr(${pnKeySql('p.part_number')}, ?) > 0) OR ${textSql})`];
  const args = [envName, key, key, ...vs.flatMap((v) => [v, v, v])];
  if (ws) { where.push('c.workshop_site=?'); args.push(user.workshop_site); }
  if (from) { where.push('p.created_at >= ?'); args.push(berlinDayStartIso(from)); }
  if (to) { where.push('p.created_at < ?'); args.push(berlinDayStartIso(new Date(Date.parse(to) + 86400000).toISOString().slice(0, 10))); }
  const rows = (await env.DB.prepare(`SELECT p.id, p.name, p.part_number, p.quantity, p.unit, p.supplier, p.document_ref, p.warranty_until, p.created_at,
      CASE WHEN p.stock_item_id IS NULL THEN 0 ELSE 1 END AS from_stock,
      c.id AS case_id, c.case_no, c.status AS case_status, c.workshop_site, v.id AS vehicle_id, v.plate, v.site AS vehicle_site, v.kind AS vehicle_kind,
      v.active AS vehicle_active, COALESCE(v.eval_excluded,0) AS eval_excluded
    FROM parts p JOIN cases c ON c.id=p.case_id JOIN vehicles v ON v.id=c.vehicle_id
    WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC LIMIT ?`).bind(...args, PARTS_USAGE_MAX + 1).all()).results;
  const truncated = rows.length > PARTS_USAGE_MAX;
  if (truncated) rows.length = PARTS_USAGE_MAX;
  const items = rows.map((r) => ({ ...r, date: berlinDate(r.created_at), from_stock: !!r.from_stock, vehicle_active: r.vehicle_active !== 0, eval_excluded: !!r.eval_excluded }))
    .sort((a, b) => plateCmp(a.plate, b.plate) || a.created_at.localeCompare(b.created_at));
  // je Fahrzeug: Anzahl Einbauten, Menge je Einheit, letzter Einbau – für die Zusammenfassung „Fahrzeuge: n“
  const byV = new Map();
  for (const i of items) {
    const x = byV.get(i.vehicle_id) || { vehicle_id: i.vehicle_id, plate: i.plate, site: i.vehicle_site, active: i.vehicle_active, eval_excluded: i.eval_excluded, count: 0, last_date: i.date };
    x.count++; if (i.date > x.last_date) x.last_date = i.date; byV.set(i.vehicle_id, x);
  }
  // Backlog 444: passende Lagerartikel mit Bestand (Rückruf betrifft oft auch noch nicht verbaute Teile) – gleiche Suche über Teilenummer und
  // Bezeichnung, Werkstatt nur das eigene Lager; Zeitraum gilt hier nicht (Bestand ist heute). Ohne Preise.
  const sv = caseVariants(q);
  const stock = (await env.DB.prepare(`SELECT * FROM (SELECT i.id, i.site, i.name, i.part_number, i.unit, i.location, i.active, ROUND(COALESCE((SELECT SUM(m.qty) FROM stock_movements m WHERE m.item_id=i.id),0),3) AS on_hand
    FROM stock_items i WHERE i.environment=?${ws ? ' AND i.site=?' : ''}
      AND ((? <> '' AND instr(${pnKeySql('i.part_number')}, ?) > 0) OR ${sv.map(() => "instr(lower(i.name), lower(?)) > 0").join(' OR ')})
    ) WHERE on_hand > 0 ORDER BY site, name LIMIT 201`).bind(envName, ...(ws ? [user.workshop_site] : []), key, key, ...sv).all()).results
    .map((i) => ({ ...i, active: i.active !== 0 }));
  return { q, from: from || null, to: to || null, environment: envName, workshop_site: ws ? user.workshop_site : null, truncated, max: PARTS_USAGE_MAX, items, vehicles: [...byV.values()], stock: stock.slice(0, 200), stock_truncated: stock.length > 200 };
}

export function partsUsageCsv(rep, csvCell) {
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const head = ['Kennzeichen', 'Fahrzeugstandort', 'Fahrzeugstatus', 'Einbau am', 'Vorgang', 'Status Vorgang', 'Werkstatt', 'Bezeichnung', 'Teilenummer', 'Menge', 'Einheit', 'Lieferant', 'Beleg', 'Gewährleistung bis', 'Aus dem Lager'];
  const lines = [head.join(';')];
  for (const i of rep.items) {
    lines.push([csvCell(i.plate), csvCell(i.vehicle_site), !i.vehicle_active ? 'außer Betrieb' : i.eval_excluded ? 'ruhend' : 'aktiv', i.date.split('-').reverse().join('.'), csvCell(i.case_no), CASE_STATUS_DE[i.case_status] || csvCell(i.case_status),
      csvCell(i.workshop_site), csvCell(i.name), quoteCell(csvCell(i.part_number)), n(i.quantity), csvCell(i.unit), csvCell(i.supplier), quoteCell(csvCell(i.document_ref)), i.warranty_until ? i.warranty_until.split('-').reverse().join('.') : '', i.from_stock ? 'ja' : 'nein'].join(';'));
  }
  if (rep.truncated) lines.push(`Gekürzt: nur die ersten ${rep.max} Einbauten – Suche oder Zeitraum eingrenzen.`);
  return '﻿' + lines.join('\r\n') + '\r\n';
}
