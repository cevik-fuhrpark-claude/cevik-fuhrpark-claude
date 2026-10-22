# [CLAUDE] UI-Test (22.10.2026): Erstnutzung mit leerem Bestand – Hinweise statt leerer Seiten/irreführendem „alles grün“:
# Startseite ohne Fahrzeuge bzw. mit Pflichtprüfungen ohne Termin, Melden/Abfahrtskontrolle ohne Fahrzeug, leere Fahrzeugliste,
# Reifen ohne eigene Warnschwelle, Fahrer ohne Zuordnung. DE/UK, 390/1366 px. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def page(br,user,lang,w):
    c=br.new_context(viewport={'width':w,'height':900},locale='de-DE'); q=c.new_page(); q.goto(B)
    errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
    q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
    return c,q,errs
def go(q,h,sel):
    q.goto(B+'/#/x'); q.goto(B+h); q.wait_for_selector(sel,timeout=15000); return q.inner_text('body')
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'en.inhaber','display_name':'EN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'en.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    if api('GET','/api/vehicles')['d']['vehicles']: print('Hinweis: Server nicht frisch – Teil „ohne Fahrzeuge“ entfällt'); fresh=False
    else: fresh=True
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment','production')
    u=api('POST','/api/users',{'username':'en.fahrer','display_name':'EN Fahrer','role':'driver','environment':envn})
    if u['s'] in (200,201):
        c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    for lang in ['uk','de']:
      for w in [390,1366]:
        if fresh:
            c,q,errs=page(br,'en.inhaber',lang,w)
            go(q,'/#/','[data-novehicles]'); check(True,f'{lang} {w}: Startseite ohne Fahrzeuge – Hinweis')
            check(q.locator('section.panel.good').count()==0,f'{lang} {w}: kein grünes „alles erledigt“')
            if SHOTS: q.screenshot(path=f'{SHOTS}/leer_start_{lang}_{w}.png')
            go(q,'/#/new','[data-novehicles]'); check(q.locator('#f').count()==0,f'{lang} {w}: Melden ohne leere Auswahl')
            go(q,'/#/check','[data-novehicles]'); check(q.locator('#f').count()==0,f'{lang} {w}: Kontrolle ohne Checkliste')
            go(q,'/#/vehicles','[data-vlempty]'); check(True,f'{lang} {w}: leere Fahrzeugliste mit Text')
            txt=go(q,'/#/tires','h1'); q.wait_for_timeout(500); txt=q.inner_text('body')
            check('– mm' not in txt and '– мм' not in txt,f'{lang} {w}: Reifen ohne „– mm“')
            check(not errs,f'{lang} {w}: keine Skriptfehler {errs}'); c.close()
        c,q,errs=page(br,'en.fahrer',lang,w)
        go(q,'/#/','[data-novehicle]'); check(True,f'{lang} {w}: Fahrer ohne Zuordnung – Hinweis')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}: kein Querscrollen (Fahrer)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/leer_fahrer_{lang}_{w}.png')
        check(not errs,f'{lang} {w}: keine Skriptfehler Fahrer {errs}'); c.close()
    # ein Fahrzeug ohne Prüftermine → Hinweis auf Pflichtprüfungen statt grün
    api('POST','/api/vehicles',{'vin':'WDB96340310888122','plate':'EN-LEER 1','site':'Dortmund'})
    for lang in ['uk','de']:
        c,q,errs=page(br,'en.inhaber',lang,390)
        txt=go(q,'/#/','h1'); q.wait_for_timeout(1500)
        has=q.locator('[data-todogaps]').count()>0 or q.locator('details.panel').count()>0
        check(has and q.locator('section.panel.good').count()==0,f'{lang}: Lücke statt „Nichts Dringendes“ in grün')
        if SHOTS: q.screenshot(path=f'{SHOTS}/leer_luecke_{lang}.png')
        check(not errs,f'{lang}: keine Skriptfehler {errs}'); c.close()
    br.close()
print(f"\n{'OK' if not fails else 'FEHLER: '+str(len(fails))}")
raise SystemExit(1 if fails else 0)
