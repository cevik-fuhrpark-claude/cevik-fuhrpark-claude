# [CLAUDE] Testrundgang – Schaden → Werkstatt → Kontrolle → Freigabe

Ablaufplan für Backlog 1 („Gehosteter Rundgang“). Der Inhaber führt ihn selbst in der Live-App durch (Dauer ca. 30–45 Min.).
Derselbe Ablauf läuft automatisiert lokal mit synthetischen Daten (`scripts/ui-ablauf.py`, Teil von `sh scripts/pruefen.sh`) –
der Rundgang prüft zusätzlich echte Geräte, Push und die gehostete Umgebung.

Alle Knopf- und Statusnamen unten sind die deutschen Texte der App. Testvorgänge tragen die Nummer `T-…` und sind nur in der
Umgebung „Test“ sichtbar; Betriebskonten sehen sie nicht.

## Vorbereitung (Inhaber, ca. 10 Min.)
1. **Mehr → Einstellungen → „Testkonten dürfen gemeinsame Stammdaten nur lesen“ einschalten.** Fahrzeuge, Prüftermine und
   km-Stände gibt es nur einmal; ohne diesen Schalter könnte eine Test-Abfahrtskontrolle einen km-Stand in die echte
   Fahrzeugakte schreiben (siehe Offene Fragen in `docs/CHECKPOINT.md`).
2. Inhaber-Konto: oben **„Ansicht“ → „Test“** wählen (Banner „TESTMODUS“). Erst in dieser Ansicht lassen sich Testkonten
   Fahrzeugen zuordnen und Testvorgänge sehen.
3. **Mehr → Benutzer → „Benutzer anlegen“** – drei Konten mit **Umgebung „Test“**:
   - Rolle **Fahrer** (danach in der Fahrzeugakte eines Lkw als Fahrer zuordnen – ein eigenes Test-Fahrzeug ist nicht nötig),
   - Rolle **Fuhrparkleitung**,
   - Rolle **Werkstatt** mit Werkstatt (z. B. Dortmund).
   Jeder Einladungslink gilt 7 Tage. Für den Rundgang reicht ein Handy plus ein zweites Gerät oder ein privates
   Browserfenster je Konto (Konten nicht im selben Fenster wechseln).
4. Optional: in jedem Testkonto unter **„Hinweise“ → Push „Aktivieren“** (iPhone: vorher „Teilen → Zum Home-Bildschirm“).

## Ablauf und erwartetes Ergebnis
| # | Wer / Gerät | Schritt | Erwartet |
|---|---|---|---|
| 1 | Fahrer (Handy) | **Melden**: Fahrzeug ist vorausgewählt; Text z. B. „TEST Spiegel locker“, Dringlichkeit **Mittel**, „Meldung senden“; danach 1 Foto anhängen | Vorgang `T-…`, Status **Gemeldet**; Foto erscheint unter „Fotos & Dokumente“ |
| 2 | Fuhrparkleitung | Hinweis bzw. Push öffnen → Vorgang → **„Eingang bestätigen“**, dann **„Reparatur freigeben“** (Werkstatt wählen, Vermerk) | Status **Werkstatt freigegeben**; Werkstatt erhält Hinweis/Push |
| 3 | Werkstatt (Tablet) | Vorgang → **„Auftrag übernehmen“** → **„Reparatur beginnen“** → **„Arbeitszeit erfassen“** (z. B. 0,5 h) | Status **In Reparatur**; Fahrer sieht „Werkstatt hat übernommen“ |
| 4 | Werkstatt | Optional **„Teil erfassen“** (ohne Preis = „unbewertet“, nie 0 €) | Kosten zeigen „unbewertet“, solange Preis/Stundensatz fehlt |
| 5 | Werkstatt | **„Kontrolle durchführen“** (Kontrolle nach Reparatur, 18 Punkte); einen Punkt als Mangel markieren | Mangel wird automatisch **Folgeauftrag** (eigener Vorgang) |
| 6 | Werkstatt | **„Zur Abschlusskontrolle“** | Status **Abschlusskontrolle**; Fuhrparkleitung erhält Hinweis |
| 7 | Fuhrparkleitung | **„Technisch freigeben“** (Kontrollnachweis bestätigen) | Status **Fahrzeug freigegeben**; nur ein Mensch kann freigeben |
| 8 | Fahrer | **Abfahrtskontrolle** (Menü oder QR-Aufkleber des Fahrzeugs) ohne Mangel absenden | Kontrolle gespeichert; km-Stand bei eingeschaltetem Schalter **nicht** in der echten Akte |
| 9 | Inhaber | **Management** und **Übersicht → „Heute zu tun“** ansehen | Folgeauftrag aus Schritt 5 offen; keine Fehlermeldung |

Zusatzprüfungen (optional): Schritt 1 mit **Kritisch** und „Nein, nicht fahrbereit“ – der Vorgang ist sofort
**gesperrt** (Sperrgrund „nicht fahrbereit (ungeprüft)“), der dringende Push kommt auch bei abgewählten Push-Arten; Fahrer-Konto auf **Українська** umstellen
(„Mein Konto“) und Schritt 1 wiederholen.

## Rückmeldung
Je Schritt bitte notieren: ✔ wie erwartet / ✘ Abweichung (Gerät, Browser, Uhrzeit, Bildschirmfoto). Abweichungen in den Chat
oder per Mail an Claude geben; sie werden als Backlog-Punkte übernommen. Testdaten bleiben in der Umgebung „Test“ und
stören den Betrieb nicht; Löschen von Testdaten ist bisher nicht vorgesehen (Aufbewahrungsfristen offen, siehe Datenschutz-Frage).
