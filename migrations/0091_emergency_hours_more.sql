-- [CLAUDE] 27.10.2026 Backlog 430 (Folge aus 427, Blickwinkel „Wochenend-Bereitschaft Fr 18:00 – Mo 06:00“):
-- Eine Rufnummer konnte nur eine Zeitspanne tragen; eine Wochenend-Bereitschaft (Fr 18 – Mo 06) war so nicht abbildbar und eine zweite
-- Eintragung derselben Nummer weist die Dublettenregel ab. hours_more = bis zu zwei weitere Zeitspannen als JSON-Liste
-- [{"days":"57","from":"18:00","to":"06:00"},{"days":"67","from":null,"to":null}] (gleiche Regeln wie hours_days/hours_from/hours_to;
-- „nicht an Feiertagen“ gilt für alle Zeitspannen). NULL = keine weiteren Zeitspannen. Nur vom Betrieb eingetragen.
ALTER TABLE emergency_contacts ADD COLUMN hours_more TEXT NULL;
