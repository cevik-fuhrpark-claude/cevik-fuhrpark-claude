# [CLAUDE] UI-Test (05.11.2026, Backlog 1022, Blickwinkel „Inhaber wechselt das Handy“): Mein Konto → Zwei-Faktor-Anmeldung →
# „Auf neues Handy übertragen“: Passwort + Ersatzcode (altes Handy fehlt) → QR-Code für das neue Handy + Hinweis „Ersatzcode verbraucht“,
# Code der neuen App → „Übertragen“; 2FA bleibt eingeschaltet, Codes des alten Geheimnisses gelten danach nicht mehr (Anmeldung per API geprüft).
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, hmac, hashlib, struct, time, base64
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MOVE={'de':'Auf neues Handy übertragen','uk':'Перенести на новий телефон','en':'Move to a new phone'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def totp(secret, k=0):
    key=base64.b32decode(secret); ctr=int(time.time()//30)+k
    h=hmac.new(key,struct.pack('>Q',ctr),hashlib.sha1).digest(); o=h[-1]&15
    return '%06d' % ((struct.unpack('>I',h[o:o+4])[0]&0x7fffffff)%1000000)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'as.inhaber','display_name':'AS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'as.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        name='hw2fa.'+uuid.uuid4().hex[:6]
        u=api('POST','/api/users',{'username':name,'display_name':'2FA '+lang,'role':'fleet','environment':'test'})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); qa=lambda m,pa,b=None: q.evaluate(JS,[m,pa,b])
        qa('POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}); qa('PATCH','/api/me',{'language':lang})
        old=qa('POST','/api/me/totp/setup',{'password':PW})['d']['secret']
        en=qa('POST','/api/me/totp/enable',{'code':totp(old)})
        check(en['s']==200,f'{lang}/{w}: 2FA per API eingeschaltet')
        q.evaluate("l => localStorage.setItem('cfp_lang', l)", lang)
        q.goto(B+'/#/more'); q.reload(); q.wait_for_selector('#tfa',timeout=15000)
        q.evaluate("document.querySelector('#tfa').open=true; document.querySelector('#tfa').dispatchEvent(new Event('toggle'))")
        q.wait_for_selector('#tfmv',timeout=8000)
        check(q.locator('#tfmv summary').inner_text().strip()==MOVE[lang],f'{lang}/{w}: Abschnitt „{MOVE[lang]}“')
        q.evaluate("document.querySelector('#tfmv').open=true")
        q.fill('#tfmpw',PW); q.fill('#tfmc',en['d']['recovery_codes'][0]); q.click('#tfm button')
        q.wait_for_selector('#tfmf',timeout=8000)
        check(q.locator('#tfmstep .qr svg').count()==1,f'{lang}/{w}: QR-Code für das neue Handy')
        check(q.locator('#tfmstep [role=note]').count()==1 and '9' in q.locator('#tfmstep [role=note]').inner_text(),f'{lang}/{w}: Hinweis Ersatzcode verbraucht (9 übrig)')
        key=q.locator('#tfmstep code').inner_text().replace(' ','')
        check(len(key)==32 and key!=old,f'{lang}/{w}: neuer Schlüssel angezeigt')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: QR-Schritt ohne Querscrollen')
        if SHOTS: q.locator('#tfmstep').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/2fa-handywechsel-qr-{lang}-{w}.png')
        q.fill('#tfmn',totp(key)); q.click('#tfmf button:not([type=button])')
        q.wait_for_selector('#tfmok',timeout=8000)
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Abschluss ohne Querscrollen')
        if SHOTS: q.locator('#tfmok').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/2fa-handywechsel-fertig-{lang}-{w}.png')
        st=qa('GET','/api/me/totp')['d']
        check(st['enabled'] and st['recovery_left']==9,f'{lang}/{w}: 2FA weiter eingeschaltet, 9 Ersatzcodes')
        # Anmeldung in neuem Kontext: alter Code ungültig, neuer gültig
        c2=br.new_context(); q2=c2.new_page(); q2.goto(B)
        l=q2.evaluate(JS,['POST','/api/login',{'username':name,'password':PW}])
        oc=totp(old,1); nc=totp(key,1)
        if oc!=nc: check(q2.evaluate(JS,['POST','/api/login/totp',{'challenge':l['d']['challenge'],'code':oc}])['s']==401,f'{lang}/{w}: Code vom alten Handy ungültig')
        check(q2.evaluate(JS,['POST','/api/login/totp',{'challenge':l['d']['challenge'],'code':nc}])['s']==200,f'{lang}/{w}: Code vom neuen Handy gültig')
        c2.close()
        q.click('#tfdone'); q.wait_for_selector('#tfmv',timeout=8000)
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('UI 2FA-Handywechsel:', 'grün' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
