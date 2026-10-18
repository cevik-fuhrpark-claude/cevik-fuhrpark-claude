# [CLAUDE] UI-Test: Auslesung stornieren (Fahrerakte und Fahrzeugakte) – „Stornieren“ mit Begründung, Eintrag durchgestrichen mit Hinweis
# „storniert“, Frist aus der nächstälteren Auslesung. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CANC={'de':'storniert','uk':'анульовано','en':'cancelled'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
day=lambda n: (today-datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'as.inhaber','display_name':'AS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'as.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vid=api('POST','/api/vehicles',{'plate':'AS-UI 1','vin':'WDB96340310777772','site':'Dortmund'})['d']['id']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        did=api('POST','/api/drivers',{'display_name':f'Storno {lang} {w}'})['d']['id']
        api('POST',f'/api/drivers/{did}/documents',{'kind':'fahrerkarte','evidence':'Karte','valid_until':'2030-01-01'})
        api('POST','/api/tacho/downloads',{'kind':'fahrerkarte','driver_id':did,'downloaded_on':day(40),'evidence':'alt.ddd'})
        api('POST','/api/tacho/downloads',{'kind':'fahrerkarte','driver_id':did,'downloaded_on':day(1),'evidence':'tippfehler.ddd'})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept('Tippfehler im Datum'))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'as.inhaber','password':PW}])
        q.goto(B+f'/#/drivers/{did}'); ok=True
        try:
          q.wait_for_selector('#dthist',state='attached',timeout=15000)
          q.evaluate("() => { document.querySelector('#dthist').open = true; }")
          q.locator('#dthist [data-tcancel]').first.click()
          q.wait_for_selector('#dthist .chip',timeout=8000); q.evaluate("() => { const d = document.querySelector('#dthist'); if (d) d.open = true; }")
        except Exception as ex: ok=False; print('   ',ex)
        txt=q.inner_text('#dthist') if ok else ''
        check(ok and CANC[lang] in txt and 'Tippfehler im Datum' in txt,f'{lang}/{w}: Fahrerakte zeigt Storno')
        st=api('GET',f'/api/drivers/{did}')['d']['tacho']
        check(st['last']==day(40),f'{lang}/{w}: Frist aus der älteren Auslesung ({st["last"]})')
        if SHOTS and ok: q.screenshot(path=f'{SHOTS}/storno_{lang}_{w}.png',full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    # Fahrzeugakte (Massenspeicher)
    api('PATCH','/api/me',{'language':'de'})
    api('POST','/api/tacho/downloads',{'kind':'massenspeicher','vehicle_id':vid,'downloaded_on':day(3),'evidence':'vu.ddd'})
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); q.on('dialog',lambda d: d.accept('falsches Fahrzeug'))
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'as.inhaber','password':PW}]); q.goto(B+f'/#/vehicles/{vid}'); ok=True
    try:
      q.wait_for_selector('#vthist',state='attached',timeout=15000); q.evaluate("() => { document.querySelector('#vthist').open = true; }")
      q.locator('#vthist [data-tcancel]').first.click(); q.wait_for_selector('#vthist .chip',state='attached',timeout=8000)
    except Exception as ex: ok=False; print('   ',ex)
    check(ok and api('GET',f'/api/vehicles/{vid}')['d']['tacho']['last'] is None,'Fahrzeugakte: Storno, keine gültige Auslesung')
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
