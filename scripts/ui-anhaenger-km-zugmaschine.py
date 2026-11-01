# [CLAUDE] UI-Test Backlog 833 (Blickwinkel „km der Zugmaschine beim Anhänger eingetragen“): Datenqualität zeigt
# „Anhänger-km gleich dem Stand der Zugmaschine“ mit Detail in der Sprache und verlinkt die Zeitleiste (Filter Wartung);
# dort Markierung „gleicher Stand wie Zugmaschine …“ und „Begründung nachtragen“ mit eigener Abfrage; danach Hinweis erledigt.
# Backlog 834: Abfahrtskontrolle am Anhänger mit dem Stand der Zugmaschine zeigt nach dem Speichern den Hinweis.
# DE/UK/EN bei 390/820/1366 px ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BTN={'de':'Begründung nachtragen','uk':'Додати обґрунтування','en':'Add reason'}
MARK={'de':'gleicher Stand wie Zugmaschine','uk':'такий самий показник, як у тягача','en':'same reading as tractor unit'}
DQ={'de':'gleich Zugmaschine','uk':'як у тягача','en':'same as tractor unit'}
TOAST={'de':'Tacho der Zugmaschine abgelesen?','uk':'зчитано з тахометра тягача?','en':'read from the tractor’s odometer?'}
PROMPT={'de':'Achszähler','uk':'Лічильник на осі','en':'Hub odometer'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'akz.inhaber','display_name':'AKZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'akz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tv=f'WMA06XZZ8RP83{3000+n}'; av=f'WKESDP2708183{3000+n}'; TK='VIN:'+tv; TR='VIN:'+av
        tp=f'DO-AZ {8330+n}'; ap=f'DO-AZ {8360+n}'
        check(api('POST','/api/vehicles',{'vin':tv,'plate':tp,'site':'Dortmund','trailer_plate':ap,'kind':'lkw'})['s'] in (200,201),f'{lang} {w}px: Lkw angelegt')
        check(api('POST','/api/vehicles',{'vin':av,'plate':ap,'site':'Dortmund','kind':'anhaenger'})['s'] in (200,201),f'{lang} {w}px: Anhänger angelegt')
        api('POST',f'/api/vehicles/{TK}/odometer',{'km':612000+n})
        api('POST',f'/api/vehicles/{TR}/odometer',{'km':612000+n})
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'akz.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/quality'); q.wait_for_selector('main h1'); q.wait_for_timeout(700)
        lk=q.locator(f'a[href="#/vehicles/{TR}/timeline?f=maintenance"]')
        check(lk.count()>=1,f'{lang} {w}px: Datenqualität verlinkt die Zeitleiste des Anhängers')
        row=lk.first.inner_text() if lk.count() else ''
        check(DQ[lang] in row and tp in row,f'{lang} {w}px: Detail in der Sprache „{row[:120]}“')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: Datenqualität ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/akz_dq_{lang}_{w}.png')
        if lk.count(): lk.first.click()
        else: q.goto(B+f'/#/vehicles/{TR}/timeline?f=maintenance')
        q.wait_for_selector('[data-odoeqtruck]',timeout=8000)
        mk=q.inner_text('[data-odoeqtruck]')
        check(MARK[lang] in mk and tp in mk,f'{lang} {w}px: Markierung „{mk}“')
        check(q.inner_text('[data-odonote]').strip()==BTN[lang],f'{lang} {w}px: Knopf')
        bx=q.locator('[data-odonote]').bounding_box(); check(bx and bx['height']>=44,f'{lang} {w}px: Tippfläche {bx and round(bx["height"])}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: Zeitleiste ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/akz_tl_{lang}_{w}.png')
        msg=[]
        def acc(d): msg.append(d.message); d.accept('Achszähler zeigt zufällig denselben Stand')
        q.once('dialog', acc)
        q.click('[data-odonote]'); q.wait_for_function("()=>!document.querySelector('[data-odonote]')",timeout=8000)
        check(msg and PROMPT[lang] in msg[0],f'{lang} {w}px: eigene Abfrage „{(msg[0] if msg else "")[:60]}“')
        check('Achszähler zeigt zufällig denselben Stand' in q.inner_text('main') and not q.locator('[data-odoeqtruck]').count(),f'{lang} {w}px: Begründung angezeigt, Markierung weg')
        dq=q.evaluate(JS,['GET','/api/admin/data-quality'])['d']['items']
        check(not any(i['check']=='trailer_km_equals_truck' and i['vehicle_id']==TR for i in dq),f'{lang} {w}px: Datenqualität erledigt')
        # Backlog 834: Abfahrtskontrolle am Anhänger mit dem heutigen Stand der Zugmaschine → Hinweis in der Bestätigung
        api('POST',f'/api/vehicles/{TK}/odometer',{'km':650000+n})
        q.evaluate("sessionStorage.clear()"); q.goto(B+'/#/check/'+TR); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        q.evaluate("() => document.querySelectorAll('.checkitem').forEach(r => r.querySelector('input[value=ok]').click())")
        q.fill('#km',str(650000+n)); q.click('#sb')
        q.wait_for_selector('.toast',timeout=15000); q.wait_for_timeout(300)
        tt=' '.join(q.locator('.toast').all_inner_texts())
        check(TOAST[lang] in tt and tp in tt,f'{lang} {w}px: Hinweis nach dem Speichern „{tt[:140]}“')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: Bestätigung ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/akz_check_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'Alles grün (ui-anhaenger-km-zugmaschine)')
raise SystemExit(1 if fails else 0)
