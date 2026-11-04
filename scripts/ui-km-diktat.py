# [CLAUDE] UI-Test (04.11.2026, Backlog 985, Blickwinkel „km-Stand diktiert“): In der Abfahrtskontrolle wird „123.456 Kilometer“
# („123 456 кілометрів“, „123456 kilometres“) beim Verlassen des km-Felds zur Zahl, das Feld gilt als gültig (vorher „Format stimmt nicht“);
# in der Fahrzeugakte wird der diktierte Stand gespeichert. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SAY={'de':'{a}.{b} Kilometer','uk':'{a} {b} кілометрів','en':'{a}{b} kilometres'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kd.inhaber','display_name':'KD Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'kd.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vin='WMA06XZZ8RP'+str(uuid.uuid4().int)[:6]; plate='KD-K '+str(uuid.uuid4().int)[:3]
    r=api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund','kind':'lkw'}); check(r['s'] in (200,201),'Fahrzeug angelegt')
    vid=r['d'].get('id') or r['d'].get('vehicle',{}).get('id')
    n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang}/{wd}'; ka=str(200+n); say=SAY[lang].format(a=ka,b='456'); want=say.split(' ')[0] if lang=='en' else ' '.join(say.split(' ')[:-1])
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'kd.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.evaluate("sessionStorage.clear()")
        q.goto(B+'/#/check'); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        q.select_option('#v','VIN:'+vin); q.wait_for_timeout(50)
        k=q.locator('#km'); k.click(); k.type(say); k.evaluate('el => el.blur()')
        v=q.input_value('#km')
        check(v==want,f'{tag}: Abfahrtskontrolle „{say}“ → {v!r}')
        check(q.evaluate("document.querySelector('#km').validity.valid"),f'{tag}: km-Feld gültig (kein „Format stimmt nicht“)')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen (Kontrolle)')
        if SHOTS: k.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/km-diktat-{lang}-{wd}.png')
        q.evaluate("sessionStorage.clear()")
        q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('#kf',state='attached',timeout=15000)
        q.evaluate("document.querySelector('#kf').closest('details').open = true")
        f=q.locator('#kfkm'); f.click(); f.type(say); f.evaluate('el => el.blur()')
        check(q.input_value('#kfkm')==want,f'{tag}: Fahrzeugakte „{say}“ → {q.input_value("#kfkm")!r}')
        q.click('#kf button.btn'); km=None
        for _ in range(40):
            q.wait_for_timeout(250); od=(api('GET','/api/vehicles/'+vid)['d'] or {}).get('odometer') or []
            km=od[0]['km'] if od else None
            if km==int(ka+'456'): break
        check(km==int(ka+'456'),f'{tag}: als {ka}456 km gespeichert ({km})')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
