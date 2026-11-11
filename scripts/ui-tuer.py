# [CLAUDE] UI-Test (25.10.2026, Backlog 311, Blickwinkel „Tür/Ladebordwand/Hecktür schließt nicht“): Meldeformular zeigt
# fünf Schritte (nicht losfahren, unterwegs anhalten/nichts mit Gewalt, Leitung, Fotos, Auswahl Fahrbereitschaft); „Tür eingedrückt“
# zeigt keinen Hinweis; zusammen mit „Unfall“ ist der Unfall-Hinweis offen und der Tür-Hinweis eingeklappt; Hilfe enthält den Abschnitt. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DIK={'de':'fahrer tür schliest nicht','uk':'задні двері не зачиняються','en':'door flies open while driving'}
TXT={'de':'Hecktür am Auflieger schließt nicht','uk':'Задні двері не закриваються','en':'Rear door on the trailer won\'t close'}
BOTH={'de':'Unfall, Seitentür klemmt','uk':'ДТП, двері не закриваються','en':'Accident, side door stuck'}
DIK3={'de':'heckportal verbogen portaltür klemmt','uk':'рольставня заклинила','en':'rear portal bent roller shutter jammed'}  # Backlog 1261
DIK5={'de':'ladebordwand ist beim entladen stehen geblieben','uk':'гідроборт не працює','en':'tail lift stuck down'}  # Backlog 1284
DIK4={'de':'ladebordwand sinkt ab hat keinen strom','uk':'гідроборт без струму','en':'tail lift has no power fuse blown'}  # Backlog 1266
DIK6={'de':['дверь открывается на ходу','ручка двери оторвалась'],'uk':['двері провисли','двері погано закриваються'],'en':['штанга запора заклинила','дверь не захлопывается']}  # Backlog 1293: Diktat RU/UK
NEG6=['дверь в офисе плохо закрывается','замок зажигания заклинило','дверь не провисла']
DIK7={'de':['гидроборт застрял внизу','гидроборт не складывается'],'uk':['гідроборт застряг унизу','гідроборт пищить'],'en':['заклинило гидроборт','гідроборт не реагує на пульт']}  # Backlog 1312: Ladebordwand RU/UK
NEG7=['гидроборт не пищит','гидроборт отремонтировали теперь складывается']
NO={'de':'Tür eingedrückt','uk':'Двері пошкоджені','en':'Door dented'}
HT={'de':'Tür, Hecktür oder Ladebordwand schließt nicht','uk':'Двері, задні двері чи гідроборт не закриваються','en':'Door, rear door or tail lift will not close'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
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
        check(not vis('#door'),f'{lang}/{w}: anfangs kein Hinweis')
        q.fill('#d',NO[lang]); q.wait_for_timeout(100)
        check(not vis('#door') and vis('#hintsum')==False,f'{lang}/{w}: „{NO[lang]}“ → kein Tür-Hinweis')
        for dk in DIK7[lang]: q.fill('#d',dk); q.wait_for_timeout(100); check(vis('#door') and not vis('#stuck'),f'{lang}/{w}: Diktat „{dk}“ → Ladebordwand, nicht Festgefahren (Backlog 1312)')
        for dk in NEG7: q.fill('#d',dk); q.wait_for_timeout(100); check(not vis('#door'),f'{lang}/{w}: „{dk}“ → kein Tür-Hinweis (Backlog 1312)')
        q.fill('#d',TXT[lang]); q.wait_for_timeout(100)
        q.fill('#d',DIK[lang]); q.wait_for_timeout(100)
        check(vis('#door'),f'{lang}/{w}: Diktat „{DIK[lang]}“ → Tür-Hinweis (Backlog 1256)')
        q.fill('#d',DIK3[lang]); q.wait_for_timeout(100)
        check(vis('#door'),f'{lang}/{w}: Diktat „{DIK3[lang]}“ → Tür-Hinweis (Backlog 1261)')
        q.fill('#d',DIK4[lang]); q.wait_for_timeout(100)
        check(vis('#door'),f'{lang}/{w}: Diktat „{DIK4[lang]}“ → Tür-Hinweis (Backlog 1266)')
        q.fill('#d',DIK5[lang]); q.wait_for_timeout(100)
        check(vis('#door'),f'{lang}/{w}: Diktat „{DIK5[lang]}“ → Hinweis (Backlog 1284)')
        for dk in DIK6[lang]: q.fill('#d',dk); q.wait_for_timeout(100); check(vis('#door'),f'{lang}/{w}: Diktat „{dk}“ → Tür-Hinweis (Backlog 1293)')
        for dk in NEG6: q.fill('#d',dk); q.wait_for_timeout(100); check(not vis('#door'),f'{lang}/{w}: „{dk}“ → kein Tür-Hinweis (Backlog 1293)')
        q.fill('#d',TXT[lang]); q.wait_for_timeout(100)
        check(vis('#door'),f'{lang}/{w}: Hinweis bei nicht schließender Tür')
        tx=q.inner_text('#door')
        check(tx.count('\n')>=5,f'{lang}/{w}: Titel und 5 Schritte')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#door').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/tuer-{lang}-{w}.png')
        q.fill('#d',BOTH[lang]); q.wait_for_timeout(100)
        check(vis('#door') and vis('#acc') and q.evaluate("!document.querySelector('#acc ul').hidden && document.querySelector('#door ul').hidden"),f'{lang}/{w}: mit Unfall zusammen → Unfall offen, Tür eingeklappt')
        q.fill('#d','')
        q.goto(B+'/#/help?s=door'); q.wait_for_timeout(800); bt=q.evaluate("document.body.innerText")
        check(HT[lang] in bt and 'help_door' not in bt,f'{lang}/{w}: Hilfe mit Abschnitt')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
