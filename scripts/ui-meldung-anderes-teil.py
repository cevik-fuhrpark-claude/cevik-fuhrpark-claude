# [CLAUDE] UI-Test (16.11.2026, Backlog 1537, Blickwinkel „Nach der Reparatur ist das andere Teil defekt“):
# Meldeformular zeigt bei „Reifen gewechselt, jetzt ist der andere platt“, „Lampe getauscht, jetzt geht die andere nicht“, „Spiegel ersetzt, jetzt ist der linke kaputt“,
# „tyre replaced, now the other one is flat“ genau den erwarteten Hinweis (otherPart im Start-Modul); „…, jetzt ist der andere in Ordnung“ sowie
# „retarder repaired, was overheating“/„Retarder wurde repariert, er war überhitzt“/„ретардер отремонтирован, перегревался“ ohne Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["Reifen gewechselt, jetzt ist der andere platt", "flat"], ["Lampe getauscht, jetzt geht die andere nicht", "lights"], ["Spiegel ersetzt, jetzt ist der linke kaputt", "mirror"], ["Spiegel ersetzt und jetzt ist der rechte auch kaputt", "mirror"], ["tyre replaced, now the other one is flat", "flat"], ["bulb replaced, now the other one is out", "lights"]]
NO=["Reifen gewechselt, jetzt ist der andere in Ordnung", "Reifen gewechselt, jetzt ist der andere auch ok", "Lampe getauscht, die andere geht", "retarder repaired, was overheating", "Retarder repariert, war überhitzt", "Retarder wurde repariert, er war überhitzt", "gearbox repaired, was overheating", "ретардер отремонтирован, перегревался"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'anderteil.inhaber','display_name':'Anderteil Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='anderteil.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM76' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nAT-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(shown==[want],f'{lang}/{w}: „{txt}“ → {want} (sichtbar: {shown})')
            if SHOTS and txt=='Reifen gewechselt, jetzt ist der andere platt': q.locator('#'+want).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/anderteil-{CASES.index([txt,want])}-{lang}-{w}.png')
        for txt in NO:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(not shown,f'{lang}/{w}: „{txt}“ ohne Hinweis {shown}')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        q.fill('#d','')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
