// [CLAUDE] Ersatzteillager: Bestand je Werkstatt, Zugang/Entnahme/Korrektur, Entnahme direkt aus dem Vorgang
import { HttpError, nowIso, uuid, bad, forbidden, notFound, conflict, str, num, oneOf, berlinDate, berlinDateTime, isCalendarDate, berlinDayStartIso } from './util.js';
import { audit } from './auth.js';

const isMgr = (u) => u.role === 'owner' || u.role === 'fleet';

function siteScope(user, site) {
  site = str(site, { max: 40, field: 'Lager' }); // Liste/Objekt statt Text → 400 statt „Interner Fehler“ (Fuzz 15.10.2026)
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
  // Verbrauch = Entnahmen der letzten 90 Tage ohne Umlagerungen (nur Information für den Bestellvorschlag)
  const since = new Date(Date.now() - 90 * 86400000).toISOString();
  const rows = (await env.DB.prepare(`SELECT i.*, COALESCE((SELECT SUM(m.qty) FROM stock_movements m WHERE m.item_id=i.id),0) AS on_hand,
      COALESCE((SELECT -SUM(m.qty) FROM stock_movements m WHERE m.item_id=i.id AND m.type='entnahme' AND m.transfer_id IS NULL AND m.created_at >= ?),0) AS used_90d,
      (SELECT MAX(m.created_at) FROM stock_movements m WHERE m.item_id=i.id AND m.type='entnahme' AND m.transfer_id IS NULL) AS last_out_at
    FROM stock_items i WHERE i.environment=? AND i.active=1 ${site ? 'AND i.site=?' : ''} ORDER BY i.site, i.name`)
    .bind(...(site ? [since, envName, site] : [since, envName])).all()).results;
  let list = rows.map(({ last_out_at, ...r }) => ({ ...r, on_hand: r3(r.on_hand), used_90d: r3(r.used_90d), below_min: r.min_qty !== null && r.on_hand < r.min_qty, last_out_date: last_out_at ? berlinDate(last_out_at) : null, last_counted_date: r.last_counted_at ? berlinDate(r.last_counted_at) : null }));
  // Bestellvorschlag: nur Artikel unter Mindestbestand; Fehlmenge bis Mindestbestand – es wird nichts bestellt
  if (query.reorder === '1') {
    list = list.filter((r) => r.below_min).map((r) => {
      const shortfall = r3(r.min_qty - r.on_hand);
      // nach Bestellvermerk noch offen (Fehlmenge minus bestellte Menge, nie negativ) – Hinweis gegen Doppelbestellung
      const open_after_order = r.ordered_on ? r3(Math.max(0, shortfall - (r.ordered_qty || 0))) : shortfall;
      return { ...r, shortfall, open_after_order, shortfall_value_net: r.unit_price_net === null ? null : Math.round(shortfall * r.unit_price_net * 100) / 100 };
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

export const ITEM_HISTORY_MAX = 200;
export async function itemDetail(env, user, envName, id) {
  const it = await loadItem(env, user, envName, id);
  const movements = (await env.DB.prepare(`SELECT m.*, u.display_name AS user_name, c.case_no FROM stock_movements m JOIN users u ON u.id=m.user_id
    LEFT JOIN cases c ON c.id=m.case_id WHERE m.item_id=? ORDER BY m.created_at DESC LIMIT ?`).bind(id, ITEM_HISTORY_MAX + 1).all()).results;
  // eine Zeile mehr gelesen → es gibt ältere Buchungen (Hinweis + Verweis aufs Lagerjournal, gefiltert auf diesen Artikel)
  const movements_truncated = movements.length > ITEM_HISTORY_MAX; if (movements_truncated) movements.length = ITEM_HISTORY_MAX;
  return { item: { ...it, on_hand: await onHand(env, id) }, movements, movements_truncated, movements_max: ITEM_HISTORY_MAX };
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
  // Nur tatsächliche Änderungen speichern und protokollieren (Stammdaten-Pflege in der Artikelakte, 15.10.2026)
  const changed = Object.keys(fields).filter((k) => fields[k] !== it[k]);
  if (!changed.length) return { ok: true, changed: [] };
  try {
    await env.DB.prepare('UPDATE stock_items SET name=?, part_number=?, min_qty=?, location=?, unit_price_net=?, active=?, updated_at=? WHERE id=?')
      .bind(fields.name, fields.part_number, fields.min_qty, fields.location, fields.unit_price_net, fields.active, nowIso(), id).run();
  } catch (e) {
    // Umbenennen auf Bezeichnung/Teilenummer eines anderen Artikels im selben Lager (eindeutiger Index) – vorher „Interner Fehler“
    if (String(e.message).includes('UNIQUE')) throw conflict('duplicate_item', 'Artikel existiert in diesem Lager bereits.');
    throw e;
  }
  await audit(env, user.id, 'stock.update', null, { item: id, name: fields.name, site: it.site, changed: Object.fromEntries(changed.map((k) => [k, { from: it[k], to: fields[k] }])) });
  return { ok: true, changed };
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
  // Lieferung eingegangen: Bestellvermerk endet (Teillieferung → neu vermerken, falls noch offen)
  if (type === 'zugang' && it.ordered_on) stmts.push(env.DB.prepare('UPDATE stock_items SET ordered_qty=NULL, ordered_on=NULL, ordered_eta=NULL, ordered_note=NULL, ordered_by=NULL, updated_at=? WHERE id=?').bind(nowIso(), id));
  await env.DB.batch(stmts);
  return { ok: true, on_hand: await onHand(env, id) };
}

// Bestellvermerk setzen/aufheben (nur Vermerk, es wird nichts bestellt oder versendet)
export async function setOrder(env, user, envName, id, body) {
  const it = await loadItem(env, user, envName, id);
  if (body === null) {
    await env.DB.prepare('UPDATE stock_items SET ordered_qty=NULL, ordered_on=NULL, ordered_eta=NULL, ordered_note=NULL, ordered_by=NULL, updated_at=? WHERE id=?').bind(nowIso(), id).run();
    await audit(env, user.id, 'stock.order_clear', null, { item: id });
    return { ok: true };
  }
  if (!it.active) throw bad('validation', 'Artikel ist deaktiviert.');
  const qty = r3(num(body.qty, { min: 0, max: 1e6, field: 'Menge' }));
  if (qty <= 0) throw bad('validation', 'Menge muss größer 0 sein.');
  const today = berlinDate();
  const on = body.ordered_on ? String(body.ordered_on) : today;
  if (!isCalendarDate(on) || on > today) throw bad('validation', 'Bestelldatum: gültiges Datum, nicht in der Zukunft.');
  const eta = body.eta ? String(body.eta) : null;
  if (eta && (!isCalendarDate(eta) || eta < on)) throw bad('validation', 'Liefertermin: gültiges Datum, nicht vor dem Bestelldatum.');
  await env.DB.prepare('UPDATE stock_items SET ordered_qty=?, ordered_on=?, ordered_eta=?, ordered_note=?, ordered_by=?, updated_at=? WHERE id=?')
    .bind(qty, on, eta, str(body.note, { max: 200 }), user.id, nowIso(), id).run();
  await audit(env, user.id, 'stock.order_mark', null, { item: id, qty, eta });
  return { ok: true };
}

// Umlagerung in das Lager einer anderen Werkstatt: Entnahme hier, Zugang dort (gleiche transfer_id, in einer Transaktion).
// Zielartikel: gleiche Teilenummer+Bezeichnung (auch deaktiviert → wieder aktiv), sonst eindeutige Teilenummer, sonst neu angelegt
// (Bezeichnung/Teilenummer/Einheit/Preis übernommen, ohne Mindestbestand/Lagerort). Wert neutral: Preis des Quellartikels.
export async function transfer(env, user, envName, id, body) {
  const it = await loadItem(env, user, envName, id);
  if (!it.active) throw bad('validation', 'Artikel ist deaktiviert.');
  const toSite = str(body.to_site, { required: true, max: 20, field: 'Ziellager' });
  if (toSite === it.site) throw bad('validation', 'Ziellager ist das eigene Lager.');
  if (!(await env.DB.prepare('SELECT code FROM workshops WHERE code=? AND active=1').bind(toSite).first())) throw bad('validation', 'Unbekannte Werkstatt.');
  const qty = r3(num(body.qty, { min: 0, max: 1e6, field: 'Menge' }));
  if (qty <= 0) throw bad('validation', 'Menge muss größer 0 sein.');
  const avail = await onHand(env, id);
  if (avail < qty) throw bad('insufficient_stock', `Bestand reicht nicht (verfügbar: ${avail} ${it.unit}).`);
  const note = str(body.note, { max: 300 });
  const cands = (await env.DB.prepare('SELECT * FROM stock_items WHERE environment=? AND site=? AND (name=? OR (part_number IS NOT NULL AND part_number<>\'\' AND part_number=?))')
    .bind(envName, toSite, it.name, it.part_number || '\u0000').all()).results;
  let target = cands.find((c) => (c.part_number || '') === (it.part_number || '') && c.name === it.name) || null;
  if (!target && it.part_number) { const pn = cands.filter((c) => c.active && c.part_number === it.part_number); if (pn.length === 1) target = pn[0]; }
  const now = nowIso(); const tid = uuid(); const stmts = []; let created = false;
  if (!target) {
    target = { id: uuid(), site: toSite, unit: it.unit, unit_price_net: it.unit_price_net, active: 1 }; created = true;
    stmts.push(env.DB.prepare(`INSERT INTO stock_items(id,environment,site,part_number,name,unit,min_qty,location,unit_price_net,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,NULL,NULL,?,?,?,?)`)
      .bind(target.id, envName, toSite, it.part_number, it.name, it.unit, it.unit_price_net, user.id, now, now));
  } else {
    if (target.unit !== it.unit) throw bad('validation', `Einheit im Ziellager abweichend (${target.unit} statt ${it.unit}) – bitte dort prüfen.`);
    if (!target.active || (target.unit_price_net === null && it.unit_price_net !== null)) stmts.push(env.DB.prepare('UPDATE stock_items SET active=1, unit_price_net=COALESCE(unit_price_net, ?), updated_at=? WHERE id=?').bind(it.unit_price_net, now, target.id));
  }
  const ins = `INSERT INTO stock_movements(id,environment,item_id,type,qty,case_id,unit_price_net,supplier,document_ref,note,user_id,created_at,transfer_id,transfer_site) VALUES (?,?,?,?,?,NULL,?,NULL,?,?,?,?,?,?)`;
  const ref = 'UML-' + tid.slice(0, 8).toUpperCase();
  stmts.push(env.DB.prepare(ins).bind(uuid(), envName, it.id, 'entnahme', -qty, it.unit_price_net, ref, `Umlagerung nach ${toSite}${note ? ' – ' + note : ''}`, user.id, now, tid, toSite));
  stmts.push(env.DB.prepare(ins).bind(uuid(), envName, target.id, 'zugang', qty, it.unit_price_net, ref, `Umlagerung von ${it.site}${note ? ' – ' + note : ''}`, user.id, now, tid, it.site));
  await env.DB.batch(stmts);
  await audit(env, user.id, 'stock.transfer', null, { item: it.id, from: it.site, to: toSite, qty, target: target.id, created });
  return { ok: true, transfer_id: tid, on_hand: r3(avail - qty), target_item_id: target.id, target_created: created };
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
  const head = ['Lager', 'Artikelnummer', 'Bezeichnung', 'Einheit', 'Lagerort', 'Bestand', 'Mindestbestand', 'Unter Mindestbestand', 'Preis netto', 'Bestandswert netto', 'Letzte Entnahme', 'Zuletzt gezählt (Inventur)', 'Zählmenge'];
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const lines = [head.join(';')];
  for (const i of items) lines.push([csvCell(i.site), csvCell(i.part_number), csvCell(i.name), csvCell(i.unit), csvCell(i.location), n(i.on_hand), n(i.min_qty), i.below_min ? 'ja' : 'nein',
    n(i.unit_price_net), i.unit_price_net === null ? '' : n(Math.round(i.on_hand * i.unit_price_net * 100) / 100), i.last_out_date || '', i.last_counted_date || '', n(i.last_counted_qty)].join(';'));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

// Bestellvorschlag als CSV: Fehlmenge bis Mindestbestand, Verbrauch 90 Tage, Wert nur mit hinterlegtem Preis (nie 0 €)
export function reorderCsv(items, csvCell) {
  const head = ['Lager', 'Artikelnummer', 'Bezeichnung', 'Einheit', 'Lagerort', 'Bestand', 'Mindestbestand', 'Fehlmenge bis Mindestbestand', 'Verbrauch 90 Tage', 'Preis netto', 'Wert Fehlmenge netto', 'Letzter Lieferant', 'Letzter Zugang', 'Bestellt Menge', 'Bestellt am', 'Liefertermin laut Lieferant', 'Noch zu bestellen'];
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const lines = [head.join(';')];
  for (const i of items) lines.push([csvCell(i.site), csvCell(i.part_number), csvCell(i.name), csvCell(i.unit), csvCell(i.location), n(i.on_hand), n(i.min_qty), n(i.shortfall), n(i.used_90d),
    n(i.unit_price_net), n(i.shortfall_value_net), csvCell(i.last_supplier), i.last_receipt_date || '', n(i.ordered_qty), i.ordered_on || '', i.ordered_eta || '', n(i.open_after_order)].join(';'));
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
  const countedList = [];
  for (const c of body.counts) {
    const it = items.get(String(c.item_id || ''));
    if (!it) throw bad('validation', 'Artikel gehört nicht zu diesem Lager.');
    if (seen.has(it.id)) throw bad('validation', `Artikel doppelt gezählt: ${it.name}`);
    seen.add(it.id);
    if (c.counted === '' || c.counted === null || c.counted === undefined) continue; // nicht gezählt = keine Buchung
    const counted = Math.round(num(c.counted, { min: 0, max: 1e6, field: `Zählmenge ${it.name}` }) * 1000) / 1000;
    countedList.push({ id: it.id, counted });
    const delta = Math.round((counted - it.on_hand) * 1000) / 1000;
    if (delta !== 0) diffs.push({ item_id: it.id, name: it.name, part_number: it.part_number, unit: it.unit, book: it.on_hand, counted, delta });
  }
  const countedN = body.counts.filter((c) => !(c.counted === '' || c.counted === null || c.counted === undefined)).length;
  const result = { site, counted_items: seen.size, counted: countedN, differences: diffs, booked: 0 };
  if (dryRun) return result;
  if (!countedN) throw bad('validation', 'Keine Zählmengen eingetragen – nichts zu buchen.');
  // Optional (Oberfläche sendet sie immer): die geprüften Abweichungen. Weicht das heutige Ergebnis ab (Buchbestand hat sich seit der
  // Prüfung geändert, z. B. Entnahme in einem Auftrag, oder Zählmengen wurden danach geändert), wird nichts gebucht → erneut prüfen.
  if (Array.isArray(body.preview)) {
    const sig = (list) => list.map((d) => (d && typeof d === 'object' ? `${d.item_id}|${Number(d.book)}|${Number(d.counted)}` : '?')).sort().join('\n');
    if (body.preview.length > 2000 || sig(body.preview) !== sig(diffs)) throw new HttpError(409, 'inventory_changed', 'Der Buchbestand oder die Zählmengen haben sich seit der Prüfung geändert – bitte „Abweichungen prüfen“ erneut ausführen. Es wurde nichts gebucht.');
  }
  const now = nowIso();
  // „Zuletzt gezählt“ je Artikel (auch ohne Abweichung) – im selben Stapel wie die Korrekturen, also ganz oder gar nicht
  const cj = JSON.stringify(countedList.map((x) => ({ id: x.id, q: x.counted })));
  const markCounted = env.DB.prepare(`UPDATE stock_items SET last_counted_at=?,
      last_counted_qty=(SELECT json_extract(j.value,'$.q') FROM json_each(?) j WHERE json_extract(j.value,'$.id')=stock_items.id)
    WHERE environment=? AND id IN (SELECT json_extract(value,'$.id') FROM json_each(?))`).bind(now, cj, envName, cj);
  // Inventur ohne Abweichungen: nichts zu buchen, aber mit Datum im Protokoll vermerkt (Nachweis „Lager gezählt“)
  if (!diffs.length) { await env.DB.batch([markCounted]); await audit(env, user.id, 'stock.inventory', `stock:${envName}:${site}`, { site, environment: envName, counted: countedN, differences: 0 }); return result; }
  await env.DB.batch([markCounted, ...diffs.map((d) => env.DB.prepare(`INSERT INTO stock_movements(id,environment,item_id,type,qty,case_id,unit_price_net,supplier,document_ref,note,user_id,created_at)
    VALUES (?,?,?,'korrektur',?,NULL,NULL,NULL,?,?,?,?)`).bind(uuid(), envName, d.item_id, d.delta, `Inventur ${date}`,
    `Inventur ${date}: gezählt ${d.counted} ${d.unit}, Buchbestand ${d.book} ${d.unit}${note ? ' – ' + note : ''}`, user.id, now))]);
  await audit(env, user.id, 'stock.inventory', `stock:${envName}:${site}`, { site, environment: envName, counted: countedN, differences: diffs.length });
  result.booked = diffs.length;
  return result;
}

// Letzte Inventur je Lager (auch ohne Abweichung) aus dem Protokoll: Ziel „stock:<Umgebung>:<Lager>“ über idx_audit_target_action.
// Einträge vor dem 15.10.2026 hatten kein Ziel und erscheinen hier nicht.
export async function lastInventories(env, envName, sites) {
  if (!sites.length) return {};
  const rows = (await env.DB.prepare(`SELECT j.value AS t, (SELECT a.created_at || '|' || COALESCE(a.detail, '') FROM audit_log a WHERE a.target=j.value AND a.action='stock.inventory' ORDER BY a.created_at DESC LIMIT 1) AS last
    FROM json_each(?) j`).bind(JSON.stringify(sites.slice(0, 50).map((x) => `stock:${envName}:${x}`))).all()).results;
  const out = {};
  for (const r of rows) {
    if (!r.last) continue;
    const at = r.last.slice(0, r.last.indexOf('|')); let d = {};
    try { d = JSON.parse(r.last.slice(at.length + 1) || '{}') || {}; } catch { d = {}; }
    out[r.t.slice(`stock:${envName}:`.length)] = { at, counted: d.counted ?? null, differences: d.differences ?? null };
  }
  return out;
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
  const type = query.type ? oneOf(String(query.type), ['zugang', 'entnahme', 'korrektur', 'umlagerung', 'inventur'], 'Buchungsart') : null;
  // optional: nur ein Artikel (Verweis aus der Artikelakte); gleiche Sichtprüfung wie die Artikelakte (Umgebung, Werkstatt nur eigenes Lager)
  const item = query.item ? await loadItem(env, user, envName, String(query.item).slice(0, 64)) : null;
  const inv = type === 'inventur'; // Inventurdifferenzen = Korrekturen aus „Inventur buchen“ (Beleg „Inventur JJJJ-MM-TT“)
  // UTC-Spanne mit einem Tag Rand, danach exakt nach Berliner Datum filtern
  const lo = new Date(Date.parse(from) - 86400000).toISOString();
  const hi = new Date(Date.parse(to) + 2 * 86400000).toISOString();
  const typeSql = type === 'umlagerung' ? 'AND m.transfer_id IS NOT NULL' : inv ? "AND m.type='korrektur' AND m.transfer_id IS NULL AND substr(m.document_ref,1,9)='Inventur '" : type ? 'AND m.type=? AND m.transfer_id IS NULL' : '';
  // Inventur: Buchbestand unmittelbar vor der Korrektur (Summe aller früheren Buchungen des Artikels) und heutiger Artikelpreis
  const invSql = inv ? ', (SELECT COALESCE(SUM(p.qty),0) FROM stock_movements p WHERE p.item_id=m.item_id AND p.created_at < m.created_at) AS book_before, i.unit_price_net AS item_price_net' : '';
  const rows = (await env.DB.prepare(`SELECT m.id, m.type, m.qty, m.unit_price_net, m.supplier, m.document_ref, m.note, m.created_at, m.case_id, m.transfer_id, m.transfer_site,
      i.id AS item_id, i.site, i.name, i.part_number, i.unit, c.case_no, v.plate${invSql}
    FROM stock_movements m JOIN stock_items i ON i.id=m.item_id LEFT JOIN cases c ON c.id=m.case_id LEFT JOIN vehicles v ON v.id=c.vehicle_id
    WHERE m.environment=? AND m.created_at >= ? AND m.created_at < ? ${site ? 'AND i.site=?' : ''} ${item ? 'AND m.item_id=?' : ''} ${typeSql}
    ORDER BY m.created_at, m.id LIMIT ?`).bind(...[envName, lo, hi, ...(site ? [site] : []), ...(item ? [item.id] : []), ...(type && type !== 'umlagerung' && !inv ? [type] : []), JOURNAL_MAX + 400]).all()).results;
  const r2 = (x) => Math.round(x * 100) / 100;
  let list = rows.map((r) => ({ ...r, date: berlinDate(r.created_at), qty: r3(r.qty), value_net: r.unit_price_net === null ? null : r2(r.qty * r.unit_price_net) }))
    .filter((r) => r.date >= from && r.date <= to);
  const truncated = list.length > JOURNAL_MAX;
  if (truncated) list = list.slice(0, JOURNAL_MAX);
  const sum = {};
  // Umlagerungen getrennt: Entnahme im Quell- und Zugang im Ziellager heben sich im Gesamtbestand auf
  for (const t of ['zugang', 'entnahme', 'korrektur', 'umlagerung']) sum[t] = { count: 0, value_net: 0, unvalued: 0 };
  for (const r of list) { const x = sum[r.transfer_id ? 'umlagerung' : r.type]; x.count++; if (r.value_net === null) x.unvalued++; else x.value_net = r2(x.value_net + r.value_net); }
  if (inv) {
    // Wert der Differenz zum heute hinterlegten Artikelpreis (Korrekturen tragen keinen eigenen Preis); ohne Preis leer, nie 0 €
    const s = { count: 0, plus: 0, minus: 0, plus_value_net: 0, minus_value_net: 0, unvalued: 0 };
    list = list.map(({ book_before, item_price_net, ...r }) => {
      const book = r3(book_before), diff_value_net = item_price_net === null ? null : r2(r.qty * item_price_net);
      s.count++; if (r.qty > 0) s.plus++; else s.minus++;
      if (diff_value_net === null) s.unvalued++; else if (diff_value_net > 0) s.plus_value_net = r2(s.plus_value_net + diff_value_net); else s.minus_value_net = r2(s.minus_value_net + diff_value_net);
      return { ...r, book, counted: r3(book + r.qty), item_price_net, diff_value_net };
    });
    sum.inventur = s;
  }
  return { from, to, site, type, item: item ? { id: item.id, name: item.name, part_number: item.part_number, site: item.site } : null, environment: envName, truncated, max: JOURNAL_MAX, summary: sum, movements: list };
}

// Bestand zum Stichtag (z. B. 31.12. für den Jahresabschluss): Summe aller Buchungen bis Ende des Berliner Kalendertags,
// auch inzwischen ausgebuchte Artikel; nur Artikel mit Bestand ≠ 0. Zwei Preisangaben, die Bewertungsmethode legt die Buchhaltung fest:
// letzter Einkaufspreis bis zum Stichtag (jüngster Zugang mit Preis, ohne Umlagerungen) und der heute hinterlegte Artikelpreis.
// Ohne Preis bleibt der Wert leer (nie 0 €). Werkstattrolle nur eigenes Lager.
export async function stockAsOf(env, user, envName, query = {}) {
  const site = siteScope(user, query.site ? String(query.site).slice(0, 20) : null);
  const today = berlinDate();
  const date = query.date ? String(query.date) : `${Number(today.slice(0, 4)) - 1}-12-31`;
  if (!isCalendarDate(date)) throw bad('validation', 'Stichtag: Datum im Format JJJJ-MM-TT angeben.');
  if (date > today) throw bad('validation', 'Stichtag liegt in der Zukunft.');
  const end = berlinDayStartIso(new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10));
  const rows = (await env.DB.prepare(`SELECT i.id, i.site, i.part_number, i.name, i.unit, i.location, i.active, i.unit_price_net AS price_today,
      (SELECT SUM(m.qty) FROM stock_movements m WHERE m.item_id=i.id AND m.created_at < ?) AS qty,
      (SELECT m.unit_price_net FROM stock_movements m WHERE m.item_id=i.id AND m.type='zugang' AND m.transfer_id IS NULL AND m.unit_price_net IS NOT NULL AND m.created_at < ? ORDER BY m.created_at DESC LIMIT 1) AS last_purchase_price
    FROM stock_items i WHERE i.environment=? ${site ? 'AND i.site=?' : ''} ORDER BY i.site, i.name`).bind(...[end, end, envName, ...(site ? [site] : [])]).all()).results;
  const r2 = (x) => Math.round(x * 100) / 100;
  const items = rows.map((r) => ({ ...r, qty: r3(r.qty || 0) })).filter((r) => r.qty !== 0).map((r) => ({ ...r, active: !!r.active,
    value_purchase_net: r.last_purchase_price === null ? null : r2(r.qty * r.last_purchase_price), value_today_net: r.price_today === null ? null : r2(r.qty * r.price_today) }));
  const sum = (k) => ({ value_net: r2(items.reduce((a, i) => a + (i[k] || 0), 0)), unvalued: items.filter((i) => i[k] === null).length });
  return { date, site, environment: envName, items, summary: { count: items.length, purchase: sum('value_purchase_net'), today: sum('value_today_net'), negative: items.filter((i) => i.qty < 0).length } };
}
export function stockAsOfCsv(rep, csvCell) {
  const head = ['Stichtag', 'Lager', 'Artikelnummer', 'Bezeichnung', 'Einheit', 'Lagerort', 'Bestand zum Stichtag', 'Letzter Einkaufspreis netto bis Stichtag', 'Wert netto (letzter Einkaufspreis)', 'Artikelpreis netto (heute)', 'Wert netto (Artikelpreis heute)', 'Artikel aktiv'];
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const lines = [head.join(';')];
  for (const i of rep.items) lines.push([rep.date, csvCell(i.site), csvCell(i.part_number), csvCell(i.name), csvCell(i.unit), csvCell(i.location), n(i.qty), n(i.last_purchase_price), n(i.value_purchase_net), n(i.price_today), n(i.value_today_net), i.active ? 'ja' : 'nein'].join(';'));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

const TYPE_DE = { zugang: 'Zugang', entnahme: 'Entnahme', korrektur: 'Korrektur' };
// Inventurdifferenzen als CSV: Buchbestand vor der Korrektur, gezählt, Differenz, Wert zum heutigen Artikelpreis (leer ohne Preis)
export function inventoryDiffCsv(rep, csvCell) {
  const head = ['Datum', 'Uhrzeit', 'Lager', 'Artikelnummer', 'Bezeichnung', 'Einheit', 'Buchbestand', 'Gezählt', 'Differenz', 'Artikelpreis netto (heute)', 'Wert Differenz netto', 'Beleg', 'Bemerkung'];
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const lines = [head.join(';')];
  for (const r of rep.movements) lines.push([r.date, berlinDateTime(r.created_at).slice(-5), csvCell(r.site), csvCell(r.part_number), csvCell(r.name), csvCell(r.unit), n(r.book), n(r.counted), n(r.qty), n(r.item_price_net), n(r.diff_value_net), csvCell(r.document_ref), csvCell(r.note)].join(';'));
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}
export function journalCsv(rep, csvCell) {
  const head = ['Datum', 'Uhrzeit', 'Lager', 'Artikelnummer', 'Bezeichnung', 'Buchungsart', 'Menge', 'Einheit', 'Preis netto', 'Wert netto', 'Vorgang', 'Kennzeichen', 'Lieferant', 'Beleg', 'Bemerkung'];
  const n = (x) => (x === null || x === undefined ? '' : String(x).replace('.', ','));
  const lines = [head.join(';')];
  for (const r of rep.movements) {
    lines.push([r.date, berlinDateTime(r.created_at).slice(-5), csvCell(r.site), csvCell(r.part_number), csvCell(r.name), r.transfer_id ? `Umlagerung ${r.qty < 0 ? 'nach' : 'von'} ${r.transfer_site}` : TYPE_DE[r.type], n(r.qty), csvCell(r.unit),
      n(r.unit_price_net), n(r.value_net), csvCell(r.case_no), csvCell(r.plate), csvCell(r.supplier), csvCell(r.document_ref), csvCell(r.note)].join(';'));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

// Befunde für den Fuhrparkagenten: unter Mindestbestand – außer die Fehlmenge ist vollständig bestellt (Bestellvermerk);
// dann nur ein Hinweis, wenn der Liefertermin laut Lieferant überschritten ist (ohne Liefertermin keine Annahme, kein Befund).
export async function stockFindings(env, environment) {
  const today = berlinDate();
  const out = [];
  for (const i of (await listStock(env, { role: 'owner' }, environment, {})).filter((x) => x.below_min)) {
    const open = r3(Math.max(0, i.min_qty - i.on_hand - (i.ordered_on ? i.ordered_qty || 0 : 0)));
    if (!i.ordered_on || open > 0) out.push({ ...i, code: 'STOCK_BELOW_MIN', open });
    else if (i.ordered_eta && i.ordered_eta < today) out.push({ ...i, code: 'STOCK_ORDER_OVERDUE', open });
  }
  return out;
}
