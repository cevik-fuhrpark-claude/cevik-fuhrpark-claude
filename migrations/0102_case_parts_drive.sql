-- [CLAUDE] 02.11.2026 Backlog 880 (Blickwinkel „Werkstatt wartet auf Teile, der Lkw fährt so lange weiter“):
-- Die Leitung vermerkt an einem Auftrag „wartet auf Teile“, dass das Fahrzeug bis zur Teilelieferung wieder fahren darf (nur ohne
-- Sicherheitssperre und ohne offene sicherheitsrelevante Restarbeiten). Solange gilt das Fahrzeug nicht als „in Werkstatt“.
-- Mit jedem Statuswechsel (z. B. „Reparatur fortsetzen“), einer Sperre oder einer sicherheitsrelevanten Restarbeit automatisch entfernt
-- (bleibt im Verlauf). Nichts wird geschätzt; der Liefertermin bleibt der laut Werkstatt/Lieferant.
ALTER TABLE cases ADD COLUMN parts_drive_at TEXT NULL;
ALTER TABLE cases ADD COLUMN parts_drive_by TEXT NULL;
