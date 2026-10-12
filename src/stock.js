// [CLAUDE] Ersatzteillager: Bestand je Werkstatt, Zugang/Entnahme/Korrektur, Entnahme direkt aus dem Vorgang
import { nowIso, uuid, bad, forbidden, notFound, conflict, str, num, oneOf, berlinDate, berlinDateTime, isCalendarDate } from './util.js';
import { audit } from './auth.js';

const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';

function siteScope(user, site) {
  if (isMgr(user)) return site || null;
  if (user.role === 'workshop') {
    if (site && site !== user.workshop_site) throw forbidden('Nur das Lager der eigenen Werkstatt.');
    return user.workshop_site;
  }
  throw forbidden();
}

export async function onHand(env, itemId) {
  const r = await env.DB.prepare('SELECT COALESCE(SUM(qty),0) AS q FROM stock_movements WHERE item_id=?').bind(itemId).first();
  return Math.round(r.q * 1000) / 1000;
}

const r3 = (x) => Math.round(x * 1000) / 1000;
export async function listStock(env, user, envName, query) {
  const site = siteScope(user, query.site);
  // Verbrauch = Entnahmen der letzten 90 Tage (nur Information für den Bestellvorschlag)
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const rows = (await env.DB.prepare(`SELECT i.*, COALESCE((SELECT SUM(m.qty) FROM stock_movements m WHERE m.item_id=i.id),0) AS on_hand,
      COALESCE((SELECT -SUM(m.qty) FROM stock_movements m WHERE m.item_id=i.id AND m.type='entnahme' AND m.created_at >= ?),0) AS used_90d
    FROM stock_items i WHERE i.environment=? AND i.active=1 ${site ? 'AND i.site=?' : ''} ORDER BY i.site, i.name`)
    .bind(...(site ? [since, envName, site] : [since, envName])).all()).results;
  let list = rows.map((r) => ({ ...r, on_hand: r3(r.on_hand), used_90d: r3(r.used_90d), below_min: r.min_qty !== null && r.on_hand < r.min_qty }));
  // Bestellvorschlag: nur Artikel unter Mindestbestand; Fehlmenge bis Mindestbestand – es wird nichts bestellt
  if (query.reorder === '1') {
    list = list.filter((r) => r.below_min).map((r) => {
      const shortfall = r3(r.min_qty - r.on_hand);
      return { ...r, shortfall, shortfall_value_net: r.unit_price_net === null ? null : Math.round(shortfall * r.unit_price_net * 100) / 100 };
    });
    // Zum Bestellen: letzter Lieferant (jüngster Zugang mit Lieferant) und letzter Zugang – nur aus gebuchten Zugängen, eine Abfrage
    if (list.length) {
      const last = new Map((await env.DB.prepare(`SELECT i.value AS id,
          (SELECT m.supplier FROM stock_movements m WHERE m.item_id=i.value AND m.type='zugang' AND m.supplier IS NOT NULL AND m.supplier<>'' ORDER BY m.created_at DESC LIMIT 1) AS last_supplier,
          (SELECT MAX(m.created_at) FROM stock_movements m WHERE m.item_id=i.value AND m.type='zugang') AS last_receipt_at
        FROM json_each(?) i`).bind(JSON.stringify(list.map((r) => r.id))).all()).results.map((x) => [x.id, x]));
      list = list.map((r) => ({ ...r, last_supplier: last.get(r.id)?.last_supplier || null, last_receipt_date: last.get(r.id)?.last_receipt_at ? berlinDate(last.get(r.id).last_receipt_at) : null }));
      // je Lager nach Lieferant gruppiert (ohne Lieferant zuletzt), dann Bezeichnung
      list.sort((a, b) => a.site.localeCompare(b.site) || (a.last_supplier === null) - (b.last_supplier === null) || String(a.last_supplier || '').localeCompare(String(b.last_supplier || ''), 'de') || a.name.localeCompare(b.name, 'de'));
    }
  }
  return list;
}

async function loadItem(env, user, envName, id) {
  const it = await env.DB.prepare('SELECT * FROM stock_items WHERE id=? AND environment=?').bind(id, envName).first();
  if (!it) throw notFound('Artikel nicht gefunden.');
  if (user.role === 'workshop' && it.site !== user.workshop_site) throw notFound('Artikel nicht gefunden.');
  if (!isMgr(user) && user.role !== 'workshop') throw forbidden();
  return it;
}

export async function itemDetail(env, user, envName, id) {
  const it = await loadItem(env, user, envName, id);
  const movements = (await env.DB.prepare(`SELECT m.*, u.display_name AS user_name, c.case_no FROM stock_movements m JOIN users u ON u.id=m.user_id
    LEFT JOIN cases c ON c.id=m.case_id WHERE m.item_id=? ORDER BY m.created_at DESC LIMIT 200`).bind(id).all()).results;
  return { item: { ...it, on_hand: await onHand(env, id) }, movements };
}

export async function createItem(env, user, envName, body) {
  const site = siteScope(user, body.site);
  if (!site) throw bad('validation', 'Werkstatt/Lager ist erforderlich.');
  const ws = await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(site).first();
  if (!ws) throw bad('validation', 'Unbekannte Werkstatt.');
  const id = uuid();
  const now = nowIso();
  try {
    await env.DB.prepare(`INSERT INTO stock_items(id,environment,site,part_number,name,unit,min_qty,location,unit_price_net,created_by,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, envName, site, str(body.part_number, { max: 80 }), str(body.name, { required: true, max: 200, field: 'Bezeichnung' }),
      str(body.unit, { max: 20 }) || 'Stk', num(body.min_qty, { min: 0, max: 1e6, field: 'Mindestbestand', nullable: true }), str(body.location, { max: 80 }),
      num(body.unit_price_net, { min: 0, max: 1e7, field: 'Preis', nullable: true }), user.id, now, now).run();
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw conflict('duplicate_item', 'Artikel existiert in diesem Lager bereits.');
    throw e;
  }
  const initial = num(body.initial_qty, { min: 0, max: 1e6, field: 'Anfangsbestand', nullable: true });
  if (initial) await addMovement(env, user, envName, id, { type: 'zugang', qty: initial, note: 'Anfangsbestand', unit_price_net: body.unit_price_net });
  return { id };
}

export async function updateItem(env, user, envName, id, body) {
  const it = await loadItem(env, user, envName, id);
  const fields = {
    name: body.name !== undefined ? str(body.name, { required: true, max: 200, field: 'Bezeichnung' }) : it.name,
    part_number: body.part_number !== undefined ? str(body.part_number, { max: 80 }) : it.part_number,
    min_qty: body.min_qty !== undefined ? num(body.min_qty, { min: 0, max: 1e6, field: 'Mindestbestand', nullable: true }) : it.min_qty,
    location: body.location !== undefined ? str(body.location, { max: 80 }) : it.location,
    unit_price_net: body.unit_price_net !== undefined ? num(body.unit_price_net, { min: 0, max: 1e7, field: 'Preis', nullable: true }) : it.unit_price_net,
    active: body.active === undefined ? it.active : (body.active ? 1 : 0),
  };
  await env.DB.prepare('UPDATE stock_items SET name=?, part_number=?, min_qty=?, location=?, unit_price_net=?, active=?, updated_at=? WHERE id=?')
    .bind(fields.name, fields.part_number, fields.min_qty, fields.location, fields.unit_price_net, fields.active, nowIso(), id).run();
  return { ok: true };
}

export async function addMovement(env, user, envName, id, body) {
  const it = await loadItem(env, user, envName, id);
  const type = oneOf(body.type, ['zugang', 'entnahme', 'korrektur'], 'Buchungsart');
  let qty = num(body.qty, { min: -1e6, max: 1e6, field: 'Menge' });
  if (type !== 'korrektur' && qty <= 0) throw bad('validation', 'Menge muss größer 0 sein.');
  if (type === 'korrektur' && qty === 0) throw bad('validation', 'Korrektur ungleich 0 angeben.');
  if (type === 'korrektur' && !str(body.note, { max: 500 })) throw bad('validation', 'Korrektur braucht einen Grund.');
  if (type === 'entnahme') qty = -qty;
  if (qty < 0 && (await onHand(env, id)) + qty < 0) throw bad('insufficient_stock', `Bestand reicht nicht (verfügbar: ${await onHand(env, id)} ${it.unit}).`);
  const price = num(body.unit_price_net, { min: 0, max: 1e7, field: 'Preis', nullable: true });
  const stmts = [env.DB.prepare(`INSERT INTO stock_movements(id,environment,item_id,type,qty,case_id,unit_price_net,supplier,document_ref,note,user_id,created_at)
    VALUES (?,?,?,?,?,NULL,?,?,?,?,?,?)`).bind(uuid(), envName, id, type, qty, price, str(body.supplier, { max: 120 }), str(body.document_ref, { max: 200 }),
    str(body.note, { max: 500 }), user.id, nowIso())];
  if (type === 'zugang' && price !== null) stmts.push(env.DB.prepare('UPDATE stock_items SET unit_price_net=?, updated_at=? WHERE id=?').bind(price, nowIso(), id));
  await env.DB.batch(stmts);
  return { ok: true, on_hand: await onHand(env, id) };
}

// Für den Werkstattbefehl add_part: liefert Artikel + Statement für die Entnahme (in derselben Transaktion)
export async function prepareCaseWithdrawal(env, user, envName, c, itemId, qty, partId) {
  const it = await env.DB.prepare('SELECT * FROM stock_items WHERE id=? AND environment=? AND active=1').bind(itemId, envName).first();
  if (!it) throw bad('validation', 'Lagerartikel nicht gefunden.');
  if (it.site !== c.workshop_site) throw bad('validation', 'Lagerartikel gehört nicht zur zuständigen Werkstatt.');
  if (user.role === 'workshop' && it.site !== user.workshop_site) throw forbidden();
  const avail = await onHand(env, itemId);
  if (avail < qty) throw bad('insufficient_stock', `Bestand reicht nicht (verfügbar: ${avail} ${it.unit}). Zugang buchen oder Teil ohne Lager erfassen.`);
  const stmt = env.DB.prepare(`INSERT INTO stock_movements(id,environment,item_id,type,qty,case_id,part_id,unit_price_net,note,user_id,created_at)
    VALUES (?,?,?,'entnahme',?,?,?,?,?,?,?)`).bind(uuid(), envName, itemId, -qty, c.id, partId, it.unit_price_net, `Vorgang ${c.case_no}`, user.id, nowIso());
  return { item: it, stmt };
}

// Bestandsliste als CSV (Excel): Bestand und Bestandswert nur, wenn ein Preis hinterlegt ist (sonst leer, nie 0 €)
export function stockCsv(items, csvCell) {
  const head = ['Lager', 'Artikelnummer', 'Bezeichnung', 'Einheit', 'Lagerort', 'Bestand', 'Mindestbestand', 'Unter Mindestbestand', 'Preis netto', 'Bestandswert netto'];
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const lines = [head.join(';')];
  for (const i of items) lines.push([csvCell(i.site), csvCell(i.part_number), csvCell(i.name), csvCell(i.unit), csvCell(i.location), n(i.on_hand), n(i.min_qty), i.below_min ? 'ja' : 'nein',
    n(i.unit_price_net), i.unit_price_net === null ? '' : n(Math.round(i.on_hand * i.unit_price_net * 100) / 100)].join(';'));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

// Bestellvorschlag als CSV: Fehlmenge bis Mindestbestand, Verbrauch 90 Tage, Wert nur mit hinterlegtem Preis (nie 0 €)
export function reorderCsv(items, csvCell) {
  const head = ['Lager', 'Artikelnummer', 'Bezeichnung', 'Einheit', 'Lagerort', 'Bestand', 'Mindestbestand', 'Fehlmenge bis Mindestbestand', 'Verbrauch 90 Tage', 'Preis netto', 'Wert Fehlmenge netto', 'Letzter Lieferant', 'Letzter Zugang'];
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const lines = [head.join(';')];
  for (const i of items) lines.push([csvCell(i.site), csvCell(i.part_number), csvCell(i.name), csvCell(i.unit), csvCell(i.location), n(i.on_hand), n(i.min_qty), n(i.shortfall), n(i.used_90d),
    n(i.unit_price_net), n(i.shortfall_value_net), csvCell(i.last_supplier), i.last_receipt_date || ''].join(';'));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

// Inventur: gezählte Mengen je Artikel eines Lagers; Abweichungen werden als Korrektur mit Grund gebucht (Vorschau mit dry_run)
export async function inventory(env, user, envName, body, { dryRun = false } = {}) {
  const site = siteScope(user, body.site);
  if (!site) throw bad('validation', 'Lager (Werkstatt) angeben.');
  if (!Array.isArray(body.counts) || !body.counts.length) throw bad('validation', 'Keine Zählmengen übermittelt.');
  if (body.counts.length > 2000) throw bad('validation', 'Maximal 2000 Artikel je Inventur.');
  const items = new Map((await listStock(env, user, envName, { site })).map((i) => [i.id, i]));
  const note = str(body.note, { max: 300 });
  const date = berlinDate();
  const diffs = [];
  const seen = new Set();
  for (const c of body.counts) {
    const it = items.get(String(c.item_id || ''));
    if (!it) throw bad('validation', 'Artikel gehört nicht zu diesem Lager.');
    if (seen.has(it.id)) throw bad('validation', `Artikel doppelt gezählt: ${it.name}`);
    seen.add(it.id);
    if (c.counted === '' || c.counted === null || c.counted === undefined) continue; // nicht gezählt = keine Buchung
    const counted = Math.round(num(c.counted, { min: 0, max: 1e6, field: `Zählmenge ${it.name}` }) * 1000) / 1000;
    const delta = Math.round((counted - it.on_hand) * 1000) / 1000;
    if (delta !== 0) diffs.push({ item_id: it.id, name: it.name, part_number: it.part_number, unit: it.unit, book: it.on_hand, counted, delta });
  }
  const result = { site, counted_items: seen.size, differences: diffs, booked: 0 };
  if (dryRun || !diffs.length) return result;
  const now = nowIso();
  await env.DB.batch(diffs.map((d) => env.DB.prepare(`INSERT INTO stock_movements(id,environment,item_id,type,qty,case_id,unit_price_net,supplier,document_ref,note,user_id,created_at)
    VALUES (?,?,?,'korrektur',?,NULL,NULL,NULL,?,?,?,?)`).bind(uuid(), envName, d.item_id, d.delta, `Inventur ${date}`,
    `Inventur ${date}: gezählt ${d.counted} ${d.unit}, Buchbestand ${d.book} ${d.unit}${note ? ' – ' + note : ''}`, user.id, now)));
  await audit(env, user.id, 'stock.inventory', null, { site, counted: seen.size, differences: diffs.length });
  result.booked = diffs.length;
  return result;
}

// Lagerjournal: alle Buchungen (Zugang/Entnahme/Korrektur) eines Zeitraums nach Berliner Datum – z. B. für die Monatsabgrenzung.
// Wert = Menge × Preis der Buchung (bei Entnahme der zum Zeitpunkt hinterlegte Artikelpreis); ohne Preis bleibt der Wert leer (nie 0 €).
// Bewusst ohne Namen der buchenden Person (keine Auswertung je Mitarbeiter); Werkstattrolle nur eigenes Lager.
export const JOURNAL_MAX = 5000;
export async function journal(env, user, envName, query = {}) {
  const site = siteScope(user, query.site ? String(query.site).slice(0, 20) : null);
  const today = berlinDate();
  const from = query.from ? String(query.from) : today.slice(0, 8) + '01';
  const to = query.to ? String(query.to) : today;
  if (!isCalendarDate(from) || !isCalendarDate(to)) throw bad('validation', 'Zeitraum: Datum im Format JJJJ-MM-TT angeben.');
  if (from > to) throw bad('validation', 'Zeitraum: „von“ liegt nach „bis“.');
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 366) throw bad('validation', 'Zeitraum höchstens ein Jahr.');
  const type = query.type ? oneOf(String(query.type), ['zugang', 'entnahme', 'korrektur'], 'Buchungsart') : null;
  // UTC-Spanne mit einem Tag Rand, danach exakt nach Berliner Datum filtern
  const lo = new Date(Date.parse(from) - 86400000).toISOString();
  const hi = new Date(Date.parse(to) + 2 * 86400000).toISOString();
  const rows = (await env.DB.prepare(`SELECT m.id, m.type, m.qty, m.unit_price_net, m.supplier, m.document_ref, m.note, m.created_at, m.case_id,
      i.id AS item_id, i.site, i.name, i.part_number, i.unit, c.case_no, v.plate
    FROM stock_movements m JOIN stock_items i ON i.id=m.item_id LEFT JOIN cases c ON c.id=m.case_id LEFT JOIN vehicles v ON v.id=c.vehicle_id
    WHERE m.environment=? AND m.created_at >= ? AND m.created_at < ? ${site ? 'AND i.site=?' : ''} ${type ? 'AND m.type=?' : ''}
    ORDER BY m.created_at, m.id LIMIT ?`).bind(...[envName, lo, hi, ...(site ? [site] : []), ...(type ? [type] : []), JOURNAL_MAX + 400]).all()).results;
  const r2 = (x) => Math.round(x * 100) / 100;
  let list = rows.map((r) => ({ ...r, date: berlinDate(r.created_at), qty: r3(r.qty), value_net: r.unit_price_net === null ? null : r2(r.qty * r.unit_price_net) }))
    .filter((r) => r.date >= from && r.date <= to);
  const truncated = list.length > JOURNAL_MAX;
  if (truncated) list = list.slice(0, JOURNAL_MAX);
  const sum = {};
  for (const t of ['zugang', 'entnahme', 'korrektur']) sum[t] = { count: 0, value_net: 0, unvalued: 0 };
  for (const r of list) { const x = sum[r.type]; x.count++; if (r.value_net === null) x.unvalued++; else x.value_net = r2(x.value_net + r.value_net); }
  return { from, to, site, type, environment: envName, truncated, max: JOURNAL_MAX, summary: sum, movements: list };
}

const TYPE_DE = { zugang: 'Zugang', entnahme: 'Entnahme', korrektur: 'Korrektur' };
export function journalCsv(rep, csvCell) {
  const head = ['Datum', 'Uhrzeit', 'Lager', 'Artikelnummer', 'Bezeichnung', 'Buchungsart', 'Menge', 'Einheit', 'Preis netto', 'Wert netto', 'Vorgang', 'Kennzeichen', 'Lieferant', 'Beleg', 'Bemerkung'];
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const lines = [head.join(';')];
  for (const r of rep.movements) {
    lines.push([r.date, berlinDateTime(r.created_at).slice(-5), csvCell(r.site), csvCell(r.part_number), csvCell(r.name), TYPE_DE[r.type], n(r.qty), csvCell(r.unit),
      n(r.unit_price_net), n(r.value_net), csvCell(r.case_no), csvCell(r.plate), csvCell(r.supplier), csvCell(r.document_ref), csvCell(r.note)].join(';'));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export async function stockFindings(env, environment) {
  return (await listStock(env, { role: 'owner' }, environment, {})).filter((i) => i.below_min);
}
