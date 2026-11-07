# [CLAUDE] Sonde für die Hinweise im Meldeformular (07.11.2026, Backlog 1136): tippt jede Zeile einer Textdatei in „Melden“ (#d) und gibt
# die sichtbaren Hinweis-Panels aus – so, wie die App sie zeigt (mit recurFix, Prädikat vorne, noFixed, noSticker …), nicht nur das rohe
# Muster. Kein Test (kein Ergebnis grün/rot), nur Werkzeug für „Sonde über vorhandene Muster“ (Backlog 195).
# Aufruf: eigener Dev-Server  PORT=8788 node --experimental-sqlite scripts/dev-server.mjs  (per PID beenden), dann
#         CFP_URL=http://localhost:8788 python3 scripts/sonde-hinweise.py saetze.txt
# Frischer Server je Lauf nicht nötig (Ersteinrichtung nur beim ersten Lauf, Anmeldung danach mit demselben Konto).
import os, sys
from playwright.sync_api import sync_playwright
B = os.environ.get('CFP_URL', 'http://localhost:8788'); PW = 'Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined }); return { s: r.status, d: await r.json().catch(() => null) }; }"""
if len(sys.argv) < 2: raise SystemExit('Aufruf: python3 scripts/sonde-hinweise.py <Datei mit einem Satz je Zeile>')
lines = [l.strip() for l in open(sys.argv[1], encoding='utf-8') if l.strip()]
with sync_playwright() as p:
    br = p.chromium.launch(); q = br.new_page(); q.goto(B)
    api = lambda m, pa, b=None: q.evaluate(JS, [m, pa, b])
    s = api('POST', '/api/setup', {'setup_code': 'test-setup-code-123', 'username': 'sonde.inhaber', 'display_name': 'Sonde Inhaber'})
    if s['s'] == 200: api('POST', '/api/invite/accept', {'token': s['d']['invite_token'], 'password': PW})
    if api('POST', '/api/login', {'username': 'sonde.inhaber', 'password': PW})['s'] != 200: raise SystemExit('Anmeldung fehlgeschlagen – frischen Dev-Server starten')
    api('POST', '/api/vehicles', {'plate': 'SO-ND 1', 'vin': 'WDB96340310899991', 'site': 'Dortmund'})
    q.goto(B + '/#/new'); q.reload(); q.wait_for_selector('#d', timeout=15000)
    for x in lines:
        q.fill('#d', x); q.wait_for_timeout(120)
        ids = q.evaluate("()=>[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
        print(','.join(ids).ljust(30), '|', x)
    br.close()
