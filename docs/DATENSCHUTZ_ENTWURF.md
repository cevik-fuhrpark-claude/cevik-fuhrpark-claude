# [CLAUDE] Datenschutz – Entwurf zur Prüfung durch den Auftraggeber

**Status: Entwurf, nicht freigegeben, in der App noch nicht sichtbar.** Technische Bestandsaufnahme aus dem Quellcode (Stand 10.10.2026)
als Grundlage für (a) eine kurze Mitarbeiterinformation in der Hilfe und (b) den Eintrag im Verzeichnis der Verarbeitungstätigkeiten.
Keine Rechtsberatung – Rechtsgrundlagen, Aufbewahrungsfristen und Text der Mitarbeiterinformation legt der Auftraggeber
(ggf. mit Datenschutzbeauftragtem/Betriebsrat) fest. Fristen sind hier bewusst **nicht** vorgegeben.

## 1. Welche personenbezogenen Daten die App speichert
| Bereich | Daten | Tabelle(n) | Wer sieht es |
|---|---|---|---|
| Benutzerkonto | Benutzername, Anzeigename, optional Personalnummer, Rolle, Werkstatt, Sprache, Passwort nur als PBKDF2-Hash | `users`, `invites` | Inhaber, Fuhrparkleitung (Benutzerverwaltung) |
| Anmeldung | Sitzungen (30 Tage, Gerätekennung = Browser-Kennung), Fehlversuche je Benutzername, Kontosperre | `sessions`, `login_attempts` | nur technisch; Sperren im Protokoll (Inhaber) |
| Protokoll | wer wann angemeldet, Benutzer/Fahrzeuge geändert, importiert, exportiert | `audit_log` | nur Inhaber |
| Schadensmeldungen | meldende Person, Zeitpunkt, Beschreibung, Fotos/PDF, Bearbeitungsschritte mit handelnder Person | `cases`, `case_events`, `files` | je Rolle (Fahrer: eigene Meldungen; Werkstatt: eigener Standort) |
| Werkstattarbeit | erfasste Arbeitszeit je Mitarbeiter und Tag, Teile, Kontrollen | `work_entries`, `inspections`, `open_items` | Fuhrparkleitung, Werkstatt, Inhaber |
| Abfahrtskontrolle | Fahrer, Fahrzeug, Zeitpunkt, Ergebnis, Mängel | `inspections` | Fuhrparkleitung, Inhaber |
| Fahrerzuordnung | welcher Fahrer wann welchem Fahrzeug zugeordnet war (Historie) | `driver_vehicles` | Fuhrparkleitung, Dispo, Inhaber |
| Bußgelder/Anhörungen | Tatvorwurf, Tatzeit/-ort, Fahrer (mit Nachweis), Kenntnisnahme, Schreiben als Datei | `fines`, `fine_events`, `files` | Fuhrparkleitung, Inhaber, **nur** betroffener Fahrer |
| Fahrerakte (seit 10.10.2026) | Name, Personalnummer, Standort, Nachweise Führerschein (Nummer, Klassen, Gültig-bis), Fahrerkarte, Code 95, Unterweisungen, Führerscheinkontrollen (Datum, Ergebnis, Prüfer) | `drivers`, `driver_documents`, `driver_license_checks` | Inhaber, Fuhrparkleitung; Fahrer nur eigene Daten (laut Freigabe) |
| Benachrichtigungen | Empfänger, Zustellung/Öffnen/Gesehen-Zeitpunkte, Push-Geräteadresse und Gerätebezeichnung | `notifications`, `push_subscriptions` | Empfänger; Zustellstatus für Fuhrparkleitung |
| Telematik (noch nicht angebunden) | Fahrzeugposition, km, Geschwindigkeit, Zündung – fahrzeug-, nicht personenbezogen gespeichert, über Zuordnung aber Fahrern zuordenbar | `telematics_latest` | Fuhrparkleitung, Dispo |
| Nutzungsstatistik | **ohne** Personenbezug (nur Tag, Umgebung, Funktion, Anzahl) | `usage_daily` | Inhaber |

Nicht gespeichert: IP-Adressen, Standort des Handys, Kontakte, Passwörter im Klartext.

## 2. Speicherort und Dienstleister
Cloudflare (Worker, Datenbank D1 und Dateispeicher KV mit Jurisdiktion **EU**), Push über die Dienste von Google/Apple/Mozilla
(nur verschlüsselter Hinweistext, Ende-zu-Ende nach RFC 8291), KI-Analyse über Cloudflare Workers AI (nur Schadenshistorie eines Fahrzeugs).

## 2a. Auskunft (Art. 15 DSGVO) – vorbereitet
Inhaber → Mehr → Benutzer → „Datenauskunft“ je Person: JSON-Datei mit allen in der App gespeicherten Daten zu diesem Konto
(Konto, Anmeldungen/Geräte ohne Token, Fahrzeugzuordnungen, Meldungen, Vorgangsverlauf, Arbeitszeiten, Kontrollen, Dateiangaben,
Hinweise, km-Stände, Bußgelder als Fahrer, Protokolleinträge, verknüpfte Fahrerakte). Ohne Passwort-Hashes und Push-Schlüssel,
Dateiinhalte (Fotos/PDF) nur als Angaben. Abruf wird protokolliert (`privacy.export`). Vor Herausgabe auf Daten Dritter in Freitexten prüfen.
Fahrer ohne App-Konto: Fahrerakte direkt (Mehr → Fahrer) bzw. künftig eigene Auskunft – noch offen.

## 3. Offene Entscheidungen (Auftraggeber)
1. Aufbewahrungsfristen je Bereich (z. B. Schadensvorgänge, Abfahrtskontrollen, Bußgeldakten, Fahrerakte/Führerscheinkontrollen nach Ausscheiden, Protokoll, Benachrichtigungen) – danach
   kann eine automatische Löschung/Anonymisierung umgesetzt werden (bisher wird nichts automatisch gelöscht außer abgelaufenen Sitzungen, Mengenzählern und alten Fehlanmeldungen).
2. Ob und in welcher Form die Mitarbeiterinformation in der App (Hilfe-Seite, DE/UK/EN) erscheinen soll.
3. Ansprechpartner für Datenschutzfragen, der in der Information genannt wird.

## 4. Vorschlag Kurztext für die Hilfe (nach Freigabe)
> Die App speichert, was du meldest (Text, Fotos), wann du es gemeldet hast und welche Schritte du in der App ausführst.
> Wir speichern keine Standortdaten deines Handys und keine Passwörter im Klartext. Deine Daten liegen in Rechenzentren in der EU.
> Fragen dazu: [Ansprechpartner laut Auftraggeber].
