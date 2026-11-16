# [CLAUDE] UI-Test (17.11.2026, Backlog 1544, Blickwinkel „Fahrer aus Spanien/Lateinamerika schreibt Spanisch“):
# Meldeformular zeigt bei „los frenos no funcionan“, „se pinchó la rueda“, „el motor no arranca“, „se está quemando la cabina“, „pierde aceite“,
# „tuve un accidente“, „el frigo no enfría“, „me robaron el gasoil“ u. a. den passenden Hinweis; Reparaturvermerk („ya está arreglado“, „funciona bien“),
# Verneinung („no pierde aceite“, „no hubo accidente“, „sin fugas“) und Alltagssätze ohne Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CASES=[["los frenos no funcionan", "brake"], ["sin frenos", "brake"], ["se me ponchó la llanta", "flat"], ["la rueda está pinchada", "flat"], ["el neumático está muy gastado", "tyre"],
       ["la dirección está dura", "steer"], ["pierde aceite", "leak"], ["se está quemando la cabina", "fire"], ["tuve un accidente", "acc"], ["estoy herido", "injury"],
       ["el motor no arranca", "nostart"], ["el motor se calienta", "engine"], ["humo negro del escape", "engine"], ["el espejo está roto", "mirror"], ["las luces no funcionan", "lights"],
       ["se encendió el testigo del motor", "warnlight"], ["la batería está descargada", "batt"], ["la tarjeta de gasoil está bloqueada", "fuelcard"], ["perdí las llaves", "lost"],
       ["se soltó el remolque", "coupling"], ["me quedé sin gasoil", "dryfuel"], ["el frigo no enfría", "reefer"], ["el aire acondicionado no enfría", "climate"], ["la lona está rota", "tarp"],
       ["se cayó el tubo de escape", "exhaust"], ["la puerta no cierra", "door"], ["el camión está atascado en el barro", "stuck"], ["no entran las marchas", "gear"],
       ["las tuercas de la rueda están flojas", "wheel"], ["me robaron el gasoil", "theft"], ["alguien rayó la puerta", "vandal"], ["la ventanilla no sube", "window"]]
NO=["ya está arreglado el freno", "los frenos ya funcionan bien", "ya está cambiada", "no pierde aceite", "sin fugas", "no hubo accidente", "no robaron nada",
    "todo bien", "ya voy para la base", "mi hijo está en el hospital", "hay mucho tráfico en la autopista", "voy en dirección a Madrid"]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'esp.inhaber','display_name':'ESP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='esp.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA15SZZ2HM75' + str(uuid.uuid4().int)[:4]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nES-ZM 1;Dortmund;MAN;2016;{vin};Lkw','text/csv')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        for txt,want in CASES:
            q.fill('#d',txt); q.wait_for_timeout(100)
            shown=q.evaluate("[...document.querySelectorAll('.panel[role=status]')].filter(e=>!e.hidden&&e.id).map(e=>e.id)")
            check(','.join(sorted(shown))==want,f'{lang}/{w}: „{txt}“ → {want} (sichtbar: {shown})')
            if SHOTS and txt in ('los frenos no funcionan','se está quemando la cabina'): q.locator('#'+want.split(',')[-1]).scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/esp-{CASES.index([txt,want])}-{lang}-{w}.png')
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
