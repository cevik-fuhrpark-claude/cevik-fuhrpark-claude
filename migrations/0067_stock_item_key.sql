-- [CLAUDE] 21.10.2026: Artikel-Dublettenregel (gleiche Bezeichnung/Teilenummer ohne Groß-/Kleinschreibung und Leerzeichen, Regel vom 19.10.)
-- auch bei gleichzeitigen Aufrufen durchsetzen. item_key wird in JS berechnet (itemKey in src/stock.js; SQLite lower() kennt keine Umlaute).
-- Bestand bleibt NULL (kein Fehlschlag bei vorhandenen Schreibvarianten); neu angelegte/umbenannte Artikel tragen den Schlüssel.
ALTER TABLE stock_items ADD COLUMN item_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_item_key ON stock_items(environment, site, item_key) WHERE item_key IS NOT NULL;
