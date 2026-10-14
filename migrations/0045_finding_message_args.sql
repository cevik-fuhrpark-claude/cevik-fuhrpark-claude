-- [CLAUDE] Agentenbefunde: Vorlagenschlüssel + Werte des Meldungstextes (JSON {"k":…,"a":{…}}), damit die Oberfläche den Befund
-- in der Sprache der Person zeigt (Vorlagen: public/finding-messages.js). `message` bleibt der deutsche Text. NULL = nur deutscher Text.
ALTER TABLE agent_findings ADD COLUMN message_args TEXT NULL;
