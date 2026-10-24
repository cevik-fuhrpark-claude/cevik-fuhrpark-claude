-- [CLAUDE] Backlog 233 (24.10.2026): Prüfung „Rechnungsnummer bereits als Fremdleistung erfasst“ beim Buchen einer Fremdleistung.
-- Teilindex nur über vorhandene Rechnungsnummern, Vergleich ohne Groß-/Kleinschreibung (wie die Abfrage in src/cases.js).
CREATE INDEX IF NOT EXISTS idx_external_costs_invoice ON external_costs(invoice_no COLLATE NOCASE) WHERE invoice_no IS NOT NULL;
