# [CLAUDE] UI-Test (20.11.2026, Backlog 1629/1630, Blickwinkel „Leitung nimmt einen fabrikneuen Lkw in Betrieb“):
# Fahrzeugakte → HU/SP: Erstzulassung vor dem Baujahr laut Stamm → dauerhafter Hinweis (data-ezbuild) über dem Formular, Speichern bleibt möglich;
# Datumsfeld Erstzulassung mit min/max (heute). DE/UK/EN, 390/820/1366 px. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
WORD={'de':'Baujahr 2026','uk':'рік випуску 2026','en':'build year 2026'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ez.inhaber','display_name':'EZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ez.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    check(api('POST','/api/vehicles',{'plate':'EZ-AB 1629','vin':'WDB96340316290001','site':'Dortmund','build_year':2026})['s'] in (200,201),'Neufahrzeug Baujahr 2026')
    V='VIN%3AWDB96340316290001'
    first=True
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ez.inhaber','password':PW}])
        q.goto(B+'/#/vehicles/'+V); q.reload(); q.wait_for_selector('#specf',state='attached',timeout=20000); q.wait_for_timeout(500)
        inp=q.locator('#specf input[name=first_registration]')
        check(inp.get_attribute('min')=='1950-01-01' and (inp.get_attribute('max') or '').startswith('20'),f'{lang} {wd}px: Datumsfeld mit min/max')
        if first:
            check(q.locator('[data-ezbuild]').count()==0,f'{lang} {wd}px: ohne Erstzulassung kein Hinweis')
            q.evaluate("()=>{ const f=document.querySelector('#specf'); f.closest('details').open=true; }")
            q.fill('#specf input[name=zgm_kg]','18000'); inp.fill('2025-11-15'); q.fill('#specf input[name=spec_source]','Zulassungsbescheinigung'); q.locator('#specf button.btn').click()
            q.wait_for_selector('[data-ezbuild]',timeout=15000); first=False
        hint=q.locator('[data-ezbuild]')
        check(hint.count()==1 and WORD[lang] in hint.inner_text(),f'{lang} {wd}px: Hinweis Erstzulassung vor Baujahr')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS:
            hint.scroll_into_view_if_needed(); q.wait_for_timeout(300); q.screenshot(path=f'{SHOTS}/ezbuild_{lang}_{wd}.png',full_page=False)
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    # korrigiert → Hinweis weg
    check(api('POST',f'/api/vehicles/VIN:WDB96340316290001/spec',{'zgm_kg':18000,'first_registration':'2026-01-15','spec_source':'Zulassungsbescheinigung'})['s']==200,'Erstzulassung korrigiert')
    q=br.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ez.inhaber','password':PW}]); q.goto(B+'/#/vehicles/'+V); q.reload(); q.wait_for_selector('#specf',state='attached',timeout=20000); q.wait_for_timeout(500)
    check(q.locator('[data-ezbuild]').count()==0,'nach Korrektur kein Hinweis')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
