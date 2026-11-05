# [CLAUDE] UI-Test (05.11.2026, Backlog 1003, Blickwinkel „Mietauflieger/Kühlaggregat: Zähler zeigt Meilen bzw. Betriebsstunden“): „152.000 mi“
# bzw. „1.234 h“ im km-Feld der Abfahrtskontrolle und der Fahrzeugakte wird beim Verlassen in der App-Sprache erklärt (statt „Format stimmt nicht“),
# nichts gespeichert; nach Korrektur auf km ist das Feld wieder gültig und der Stand wird gespeichert. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
WANT={'de':('Meilenstand','Betriebsstunden'),'uk':('милях','мотогодини'),'en':('miles','operating hours')}
MI={'de':'152.000 mi','uk':'152 000 миль','en':'152,000 miles'}
HR={'de':'Betriebsstunden 1.234','uk':'1234 мотогодин','en':'1,234 h'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'km.inhaber','display_name':'KM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'km.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA06XZZ8RM'+str(uuid.uuid4().int)[:6]; plate='KM-M '+str(uuid.uuid4().int)[:3]
    r=api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund','kind':'lkw'}); check(r['s'] in (200,201),'Fahrzeug angelegt')
    vid=r['d'].get('id') or r['d'].get('vehicle',{}).get('id')
    n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang}/{wd}'; wmi,whr=WANT[lang]
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'km.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.evaluate("sessionStorage.clear()")
        q.goto(B+'/#/check'); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        q.select_option('#v','VIN:'+vin); q.wait_for_timeout(50)
        k=q.locator('#km'); k.click(); k.type(MI[lang]); k.evaluate('el => el.blur()')
        msg=q.evaluate("document.querySelector('#km').validationMessage")
        check(wmi in msg,f'{tag}: Abfahrtskontrolle „{MI[lang]}“ erklärt ({msg[:60]!r})')
        check(q.input_value('#km')==MI[lang],f'{tag}: Wert nicht umgerechnet/verändert')
        if SHOTS and n in (1,5,9): k.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/km-meilen-{lang}-{wd}.png')
        k.fill(''); k.type('152000'); k.evaluate('el => el.blur()')
        check(q.evaluate("document.querySelector('#km').validity.valid"),f'{tag}: nach Korrektur gültig')
        k.fill(''); k.type(HR[lang]); k.evaluate('el => el.blur()')
        msg=q.evaluate("document.querySelector('#km').validationMessage")
        check(whr in msg,f'{tag}: „{HR[lang]}“ als Betriebsstunden erklärt ({msg[:60]!r})')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen (Kontrolle)')
        q.evaluate("sessionStorage.clear()")
        q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('#kf',state='attached',timeout=15000)
        q.evaluate("document.querySelector('#kf').closest('details').open = true")
        before=len((api('GET','/api/vehicles/'+vid)['d'] or {}).get('odometer') or [])
        f=q.locator('#kfkm'); f.click(); f.type(MI[lang]); f.evaluate('el => el.blur()')
        msg=q.evaluate("document.querySelector('#kfkm').validationMessage")
        check(wmi in msg,f'{tag}: Fahrzeugakte erklärt Meilen')
        q.click('#kf button.btn'); q.wait_for_timeout(600)
        check(len((api('GET','/api/vehicles/'+vid)['d'] or {}).get('odometer') or [])==before,f'{tag}: Meilen nicht gespeichert')
        ka=200000+n*1000
        f.fill(''); f.type(str(ka)); f.evaluate('el => el.blur()')
        q.click('#kf button.btn'); km=None
        for _ in range(40):
            q.wait_for_timeout(250); od=(api('GET','/api/vehicles/'+vid)['d'] or {}).get('odometer') or []
            km=od[0]['km'] if od else None
            if km==ka: break
        check(km==ka,f'{tag}: korrigierter Stand {ka} gespeichert ({km})')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
