-- [CLAUDE] Bestellvermerk je Lagerartikel: „beim Lieferanten bestellt“ (Menge, Datum, optional Liefertermin laut Lieferant, Vermerk),
-- damit der Bestellvorschlag keine Doppelbestellung nahelegt. Die App bestellt nichts; der Vermerk endet mit dem nächsten Zugang oder manuell.
ALTER TABLE stock_items ADD COLUMN ordered_qty REAL NULL;
ALTER TABLE stock_items ADD COLUMN ordered_on TEXT NULL;
ALTER TABLE stock_items ADD COLUMN ordered_eta TEXT NULL;
ALTER TABLE stock_items ADD COLUMN ordered_note TEXT NULL;
ALTER TABLE stock_items ADD COLUMN ordered_by TEXT NULL;
