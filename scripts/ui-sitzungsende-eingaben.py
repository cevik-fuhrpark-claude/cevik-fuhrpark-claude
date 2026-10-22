# [CLAUDE] UI-Test (22.10.2026, Backlog 152, Teilagent „Fahrer mehrere Tage offline“): Anmeldung endet, während der Fahrer eine Meldung
# eintippt – Hintergrund-Abfrage (Glocke) bekommt 401: kein Sprung zur Anmeldung, Eingaben bleiben, Hinweis in der App-Sprache; Absenden
# sichert die Meldung im Postausgang, nach erneuter Anmeldung wird sie gesendet. Außerdem: voller Gerätespeicher (IndexedDB-Abbruch)
# lässt das Absenden nicht hängen. Handy 390 px, DE/UK/EN. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
HINT={'de':'Anmeldung abgelaufen','uk':'Сеанс завершився','en':'sign-in has expired'}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'se.inhaber','display_name':'SE Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'se.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['active_environment']
    VIN='WDB96340310776041'; api('POST','/api/vehicles',{'plate':'SE-AB 1','vin':VIN,'site':'Dortmund'})
    u=api('POST','/api/users',{'username':'se.fahrer','display_name':'SE Fahrer','role':'driver','environment':env})
    c0=br.new_context(); p0=c0.new_page(); p0.goto(B); p0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    uid=u['d']['id']
    check(api('POST',f'/api/vehicles/VIN:{VIN}/drivers',{'user_id':uid,'evidence':'Test'})['s']==201,'Zuordnung')
    for lang in ('de','uk','en'):
        ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.clock.install()
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'se.fahrer','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/new'); q.reload(); q.wait_for_selector('#d',timeout=15000)
        q.locator(f'input[name=veh][value="VIN:{VIN}"]').check(force=True); desc=f'SE Spiegel lose {lang}'; q.fill('#d',desc)
        check(api('POST',f'/api/users/{uid}/revoke-sessions')['s']==200,f'{lang}: Anmeldung serverseitig beendet')
        q.clock.fast_forward(40000); q.evaluate("()=>document.dispatchEvent(new Event('visibilitychange'))"); q.wait_for_timeout(1200)
        check(q.evaluate('location.hash')=='#/new' and q.input_value('#d')==desc,f'{lang}: kein Sprung zur Anmeldung, Eingabe bleibt')
        tt=q.evaluate("()=>[...document.querySelectorAll('.toast.err')].map(e=>e.textContent).join(' ')")
        check(HINT[lang] in tt,f'{lang}: Hinweis „{tt[:60]}“')
        q.click('#sb'); q.wait_for_timeout(1500)
        check(q.evaluate('location.hash').startswith('#/login'),f'{lang}: nach dem Absenden Anmeldeseite')
        ob=q.evaluate("()=>Object.keys(localStorage).filter(k=>k.startsWith('cfp_outbox_')).map(k=>JSON.parse(localStorage.getItem(k)).length).reduce((a,b)=>a+b,0)")
        check(ob==1,f'{lang}: Meldung im Postausgang gesichert ({ob})')
        q.evaluate(JS,['POST','/api/login',{'username':'se.fahrer','password':PW}]); q.goto(B+'/#/'); q.reload(); q.wait_for_timeout(2500)
        cs=api('GET','/api/cases?status=&q='+desc.replace(' ','%20'))['d']['cases']
        check(len(cs)==1,f'{lang}: nach Anmeldung genau einmal gesendet ({len(cs)})')
        check(not errs,f'{lang}: keine Skriptfehler {errs}')
        ctx.close()
    # Speicher voll: IndexedDB-Transaktion bricht ab → Absenden hängt nicht, Meldung kommt ohne Foto an bzw. Fehler sichtbar
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page()
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'se.fahrer','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
    cdp=ctx.new_cdp_session(q); cdp.send('Storage.overrideQuotaForOrigin',{'origin':B,'quotaSize':50000})  # Gerätespeicher fast voll
    q.goto(B+'/#/new'); q.reload(); q.wait_for_selector('#d',timeout=15000)
    q.locator(f'input[name=veh][value="VIN:{VIN}"]').check(force=True); q.fill('#d','SE Speicher voll')
    import zlib, struct
    def png(w,h):  # Rauschbild: lässt sich kaum komprimieren (auch nach dem Verkleinern einige 100 KB)
        raw=b''.join(b'\x00'+os.urandom(w*3) for _ in range(h))
        ch=lambda t,d: struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
        return b'\x89PNG\r\n\x1a\n'+ch(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+ch(b'IDAT',zlib.compress(raw,1))+ch(b'IEND',b'')
    q.set_input_files('#ph',files=[{'name':'foto.png','mimeType':'image/png','buffer':png(900,900)}])
    q.click('#sb')
    try: q.wait_for_function("()=>location.hash.startsWith('#/cases/')",timeout=20000); moved=True
    except Exception: moved=False
    check(moved,'Speicher voll: nach dem Absenden zum Vorgang (vorher hing „wird gesendet“)')
    cs=api('GET','/api/cases?status=&q=SE%20Speicher%20voll')['d']['cases']
    check(len(cs)==1,'Speicher voll: Meldung angelegt, Absenden hängt nicht')
    ctx.close(); br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
