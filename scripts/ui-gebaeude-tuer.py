# [CLAUDE] UI-Test (03.11.2026, Backlog 932, Blickwinkel „Gebäude statt Lkw“): „Tür vom Büro geht nicht zu“, „Licht im Büro kaputt“,
# „Office door won't close“, „Двері в офісі не зачиняються“ zeigen im Meldeformular keine Lkw-Hinweise (Tür, Licht, Fenster, Sicht, Klima, Elektrik);
# kommt eine Lkw-Tür dazu, erscheint der Tür-Hinweis. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Hecktür am Auflieger schließt nicht','uk':'Задні двері не закриваються','en':'Rear door on the trailer won\'t close'}
BOTH={'de':'Unfall, Seitentür klemmt','uk':'ДТП, двері не закриваються','en':'Accident, side door stuck'}
NO={'de':'Tür eingedrückt','uk':'Двері пошкоджені','en':'Door dented'}
HT={'de':'Tür, Hecktür oder Ladebordwand schließt nicht','uk':'Двері, задні двері чи гідроборт не закриваються','en':'Door, rear door or tail lift will not close'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
BLD={'de':'Tür vom Büro geht nicht zu, im Büro ist das Licht kaputt','uk':'Двері в офісі не зачиняються, у офісі не працює світло','en':"Office door won't close, light in the warehouse not working"}
MIX={'de':'Tür vom Büro geht nicht zu, Fahrertür klemmt','uk':'Двері в офісі не зачиняються, двері кабіни не зачиняються','en':"Office door won't close, cab door stuck"}
HINTS=['#door','#lights','#window','#visib','#climate','#elec']
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tu.inhaber','display_name':'TU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tu.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM78' + str(uuid.uuid4().int)[:4]
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nTU-ZM 1;Dortmund;MAN;2016;{vin};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'tu.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        q.fill('#d',BLD[lang]); q.wait_for_timeout(150)
        shown=[h for h in HINTS if vis(h)]
        check(not shown and not vis('#hintsum'),f'{lang}/{w}: Gebäude („{BLD[lang]}“) → keine Lkw-Hinweise {shown}')
        q.fill('#d',MIX[lang]); q.wait_for_timeout(150)
        check(vis('#door'),f'{lang}/{w}: zusätzlich Lkw-Tür → Tür-Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#door').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/gebaeude-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
