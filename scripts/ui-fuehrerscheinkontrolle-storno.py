# [CLAUDE] UI-Test (20.10.2026, Backlog 99): Führerscheinkontrolle stornieren – Knopf im Kontrollverlauf der Fahrerakte, Rückfrage mit
# Begründung, danach durchgestrichen mit „storniert“ und Begründung, Status aus der verbliebenen Kontrolle. DE/UK/EN bei 390/820/1366 px,
# kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fk.inhaber','display_name':'FK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'fk.inhaber','password':PW})
    dr=api('POST','/api/drivers',{'display_name':'Fk Testfahrer'})['d']['id']
    api('POST',f'/api/drivers/{dr}/license-checks',{'checked_on':'2025-03-01','result':'in_ordnung'})
    i=0
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        i+=1
        cid=api('POST',f'/api/drivers/{dr}/license-checks',{'checked_on':'2025-06-%02d'%i,'result':'maengel','note':f'falsch {i}'})['d']['id']
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept('Tippfehler im Datum'))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fk.inhaber','password':PW}])
        q.goto(B+f'/#/drivers/{dr}'); q.wait_for_selector('#dlchist')
        q.click('#dlchist summary')
        q.click(f'[data-lccancel="{cid}"]'); q.wait_for_timeout(700)
        if not q.locator('#dlchist[open]').count(): q.click('#dlchist summary')
        li=q.locator(f'li[data-lc="{cid}"]')
        check(li.locator('s').count()==1 and 'Tippfehler im Datum' in li.inner_text(),f'{lang} {w}px: storniert, durchgestrichen mit Begründung')
        check(q.locator(f'[data-lccancel="{cid}"]').count()==0,f'{lang} {w}px: kein Knopf mehr')
        st=api('GET',f'/api/drivers/{dr}')['d']['status']['check']
        check(st['last']=='2025-03-01',f'{lang} {w}px: Status aus verbliebener Kontrolle ({st.get("last")})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fk_storno_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'Führerscheinkontrolle stornieren: alles grün')
raise SystemExit(1 if fails else 0)
