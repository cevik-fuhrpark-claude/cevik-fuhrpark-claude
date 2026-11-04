# [CLAUDE] UI-Test (04.11.2026, Backlog 977, Blickwinkel „Fahrer meldet den Schaden erst am nächsten Morgen: ‚gestern Abend‘“):
# Meldeformular – Schnellwahl Heute/Gestern/Vorgestern setzt nur den Tag (Uhrzeit bleibt leer); Beschreibung mit „gestern“/„вчора“/„yesterday“
# zeigt einen Vorschlag mit Knopf (nur bei leerem Tag, nie automatisch); gesendeter Vorgang trägt den gewählten Tag.
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
today=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date(); D=lambda n:(today-datetime.timedelta(days=n)).isoformat()
CASES=[('de',390,844,'Gestern','Spiegel gestern Abend beim Rangieren abgefahren (Test)','„gestern“'),
       ('uk',820,1180,'Вчора','Вчора ввечері пошкодив дзеркало (тест)','«вчора»'),
       ('en',1366,900,'Yesterday','Hit a pole yesterday evening (test)','“yesterday”')]
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=window.innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sw.inhaber','display_name':'SW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own=None
    for u in ['sw.inhaber','sz.inhaber','dz.inhaber','ez.inhaber','mt.inhaber','km.inhaber','ui.inhaber','inhaber']:
        if api('POST','/api/login',{'username':u,'password':PW})['s']==200: own=u; break
    check(own,'Anmeldung Inhaber')
    pid=os.getpid()
    for n,(lang,wd,h,lbl,desc,word) in enumerate(CASES):
        print('—',lang,wd)
        va=f'WDB9634031S{pid%10000:04d}{n:02d}'[:17].ljust(17,'0'); pl=f'SW-ZQ {pid%1000}{n}'
        check(api('POST','/api/vehicles',{'vin':va,'plate':pl,'site':'Dortmund'})['s']==201,'Fahrzeug')
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':own,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/new'); q.reload(); q.wait_for_selector('#occd',timeout=15000)
        bt=q.locator('[data-occq] [data-occd]'); check(bt.count()==3 and bt.nth(1).inner_text().strip()==lbl,f'{lang} {wd}px: drei Schnellwahl-Knöpfe ({bt.nth(1).inner_text().strip()})')
        bt.nth(2).click(); check(q.input_value('#occd')==D(2) and q.input_value('#occt')=='',f'{lang} {wd}px: Vorgestern → {q.input_value("#occd")}, Uhrzeit leer')
        bt.nth(0).click(); check(q.input_value('#occd')==D(0),f'{lang} {wd}px: Heute')
        q.fill('#occd','')
        q.fill('#vq',pl); q.locator('.vehpick label:not([hidden])').filter(has_text=pl).first.click()
        q.fill('#d',desc); q.wait_for_timeout(100)
        hint=q.locator('[data-occdesc]')
        check(hint.is_visible() and word in hint.inner_text(),f'{lang} {wd}px: Vorschlag aus der Beschreibung ({hint.inner_text()[:60]})')
        check(q.input_value('#occd')=='',f'{lang} {wd}px: Tag nicht automatisch gesetzt')
        check(q.evaluate(noscroll),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.locator('[data-occ]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/occ-schnellwahl-{lang}-{wd}.png')
        hint.locator('[data-occd]').click()
        check(q.input_value('#occd')==D(1) and not hint.is_visible(),f'{lang} {wd}px: Knopf übernimmt gestern, Hinweis weg')
        q.fill('#occt','21:15')
        q.click('#sb'); q.wait_for_function("()=>location.hash.startsWith('#/cases/')",timeout=15000)
        cid=q.evaluate("()=>decodeURIComponent(location.hash.slice(8))")
        c=api('GET',f'/api/cases/{cid}')['d']['case']
        loc=datetime.datetime.fromisoformat(c['occurred_at'].replace('Z','+00:00')).astimezone(ZoneInfo('Europe/Berlin'))
        check(loc.date().isoformat()==D(1) and loc.strftime('%H:%M')=='21:15',f'{lang} {wd}px: Vorgang mit gestern 21:15 ({c["occurred_at"]})')
        # Aktion „Schadenzeitpunkt“ hat dieselbe Schnellwahl
        q.wait_for_selector('[data-act=set_occurred_at]',timeout=15000); q.click('[data-act=set_occurred_at]'); q.wait_for_selector('#af [data-occq]',timeout=5000)
        q.click('#af [data-occd="2"]'); check(q.input_value('#af #occd')==D(2) and q.input_value('#af #occt')=='21:15',f'{lang} {wd}px: Aktion – Tag gesetzt, Uhrzeit bleibt')
        check(q.evaluate(noscroll),f'{lang} {wd}px: Aktion ohne Querscrollen')
        if SHOTS and wd==390: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/occ-schnellwahl-aktion-{lang}-{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('\nUI-Schadenzeitpunkt Schnellwahl:', 'OK' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
