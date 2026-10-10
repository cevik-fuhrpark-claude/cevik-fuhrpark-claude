-- [CLAUDE] Ersatzteillager je Werkstatt: Artikel, Bewegungen (Zugang/Entnahme/Korrektur), Verknüpfung mit Vorgangsteilen

CREATE TABLE IF NOT EXISTS stock_items (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment IN ('test','production')),
  site TEXT NOT NULL REFERENCES workshops(code),
  part_number TEXT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'Stk',
  min_qty REAL NULL,                      -- Mindestbestand (leer = keine Meldung)
  location TEXT NULL,                     -- Lagerort/Regal
  unit_price_net REAL NULL,               -- letzter bekannter Einkaufspreis (leer = unbewertet)
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_unique ON stock_items(environment, site, COALESCE(part_number, ''), name);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL,
  item_id TEXT NOT NULL REFERENCES stock_items(id),
  type TEXT NOT NULL CHECK (type IN ('zugang','entnahme','korrektur')),
  qty REAL NOT NULL,                      -- vorzeichenbehaftet: Zugang +, Entnahme -
  case_id TEXT NULL REFERENCES cases(id),
  part_id TEXT NULL,
  unit_price_net REAL NULL,
  supplier TEXT NULL,
  document_ref TEXT NULL,
  note TEXT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stock_mov_item ON stock_movements(item_id, created_at);

ALTER TABLE parts ADD COLUMN stock_item_id TEXT NULL;
