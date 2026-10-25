# [CLAUDE] UI-Test (25.10.2026, Backlog 285, Blickwinkel „Schaden wird erst Tage später gemeldet“): Meldeformular mit „Wann ist es passiert?“
# (Tag + optionale Uhrzeit), Uhrzeit ohne Tag wird in der App abgewiesen, Vorgang zeigt Schadenzeitpunkt, „N Tage später gemeldet“ und für die
# Leitung „Fahrer zum Schadenzeitpunkt“; Knopf „Schadenzeitpunkt“ mit vorbelegtem Formular. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
BTN={'de':'Schadenzeitpunkt','uk':'Час пошкодження','en':'Time of damage'}
LATE={'de':'später gemeldet','uk':'повідомлено через','en':'later'}
today=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date(); d3=(today-datetime.timedelta(days=3)).isoformat()
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=window.innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sz.inhaber','display_name':'SZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    pid=os.getpid(); n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,wd)
        va=f'WDB9634031Z{pid%10000:04d}{n:02d}'[:17].ljust(17,'0'); pl=f'SZ-ZP {n}5'
        check(api('POST','/api/vehicles',{'vin':va,'plate':pl,'site':'Dortmund'})['s']==201,'Fahrzeug')
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sz.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/new'); q.reload(); q.wait_for_selector('#occd',timeout=15000)
        check(q.locator('#occt').count()==1 and q.get_attribute('#occd','max')==today.isoformat(),f'{lang} {wd}px: Felder Tag/Uhrzeit, max heute')
        q.fill('#vq',pl); q.locator('.vehpick label:not([hidden])').filter(has_text=pl).first.click()
        q.fill('#d','Plane hinten links eingerissen (Test)')
        q.fill('#occt','14:30'); q.click('#sb'); q.wait_for_timeout(400)
        check(q.evaluate("()=>location.hash")=='#/new',f'{lang} {wd}px: Uhrzeit ohne Tag nicht gesendet')
        q.fill('#occd',d3)
        check(q.evaluate(noscroll),f'{lang} {wd}px: Formular ohne Querscrollen')
        if SHOTS: q.locator('[data-occ]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/schadenzeitpunkt-form-{lang}-{wd}.png')
        q.click('#sb'); q.wait_for_function("()=>location.hash.startsWith('#/cases/')",timeout=15000)
        cid=q.evaluate("()=>decodeURIComponent(location.hash.slice(8))")
        q.wait_for_selector('[data-occurred]',timeout=15000)
        txt=q.inner_text('[data-occurred]')
        check('14:30' in txt and q.locator('[data-occlate]').count()==1 and LATE[lang] in q.inner_text('[data-occlate]'),f'{lang} {wd}px: Zeitpunkt + „später gemeldet“ ({txt.strip()[:60]})')
        check(q.locator('[data-occdrivers]').count()==1,f'{lang} {wd}px: Fahrer zum Schadenzeitpunkt (Leitung)')
        c=api('GET',f'/api/cases/{cid}')['d']['case']; check(c['occurred_at'] and c['occurred_at'].endswith('Z'),f'{lang} {wd}px: gespeichert als UTC')
        btn=q.locator('[data-act=set_occurred_at]'); check(btn.count()==1 and btn.inner_text().strip()==BTN[lang],f'{lang} {wd}px: Knopf')
        btn.click(); q.wait_for_selector('#af [data-occ]',timeout=5000)
        check(q.input_value('#occd')==d3 and q.input_value('#occt')=='14:30',f'{lang} {wd}px: Formular vorbelegt')
        check(q.evaluate(noscroll),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/schadenzeitpunkt-vorgang-{lang}-{wd}.png',full_page=True)
        q.fill('#occt',''); q.click('#af button:not([type=button])')
        try: q.wait_for_function("(c)=>document.querySelector('[data-occurred]') && !document.querySelector('[data-occurred]').innerText.includes('14:30')",timeout=15000); okc=True
        except Exception: okc=False
        check(okc and api('GET',f'/api/cases/{cid}')['d']['case']['occurred_at']==d3,f'{lang} {wd}px: berichtigt auf Tag ohne Uhrzeit')
        # Backlog 287: Versicherungsfall ohne Schadenzeitpunkt → Hinweis im Abschnitt
        check(api('PUT',f'/api/cases/{cid}/claim',{'insurer':'Test-Versicherung','reported_on':today.isoformat(),'status':'gemeldet','evidence':'Mail'})['s']==200,f'{lang} {wd}px: Versicherungsfall')
        ver=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        check(api('POST',f'/api/cases/{cid}/commands',{'action':'set_occurred_at','command_id':str(uuid.uuid4()),'expected_version':ver,'payload':{'occurred_at':''}})['s']==200,f'{lang} {wd}px: Zeitpunkt entfernt')
        q.reload(); q.wait_for_selector('[data-claimnoocc]',timeout=15000)
        check(BTN[lang] in q.inner_text('[data-claimnoocc]') and q.evaluate(noscroll),f'{lang} {wd}px: Hinweis im Versicherungsfall')
        if SHOTS and wd==390: q.locator('[data-claimnoocc]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/schadenzeitpunkt-claim-{lang}-{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
