-- [CLAUDE] „Zuletzt gezählt“ je Artikel: Datum und Zählmenge der letzten gebuchten/abgeschlossenen Inventur.
-- Nur Nachweis (welche Artikel wurden wann gezählt), keine Bestandsbuchung. Leer = noch nie per Inventur gezählt.
ALTER TABLE stock_items ADD COLUMN last_counted_at TEXT NULL;
ALTER TABLE stock_items ADD COLUMN last_counted_qty REAL NULL;
