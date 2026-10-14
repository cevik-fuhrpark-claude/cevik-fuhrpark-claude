# [CLAUDE] UI-Test: Protokoll je Person. Benutzer → „Protokoll“ öffnet das Protokoll gefiltert auf die Person (handelnd oder betroffen),
# Adresse wird bereinigt, „Alle Personen“ hebt den Filter auf. DE/UK/EN bei 390/820/1366 px ohne Querscrollen/Skriptfehler.
# Aktionen erscheinen als Text in der App-Sprache mit Code daneben. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ALL={'de':'Alle Personen','uk':'Усі особи','en':'All persons'}
LOGIN={'de':'Anmeldung','uk':'Вхід','en':'Sign-in'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pp.inhaber','display_name':'PP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pp.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r=api('POST','/api/users',{'username':'pp.leitung','display_name':'PP Leitung','role':'fleet','environment':'production'})
    uid=r['d']['user']['id'] if 'user' in r['d'] else r['d']['id']
    api('POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW})
    api('POST','/api/login',{'username':'pp.leitung','password':PW}); api('POST','/api/login',{'username':'pp.inhaber','password':PW})
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pp.inhaber','password':PW}])
        q.goto(B+'/#/users'); q.wait_for_selector(f'a[href="#/audit?u={uid}"]')
        q.click(f'a[href="#/audit?u={uid}"]'); q.wait_for_selector('#aupers')
        check('PP Leitung' in q.inner_text('#aupers'),f'{lang} {w}px: Person genannt')
        check(q.evaluate('()=>location.hash')=='#/audit',f'{lang} {w}px: Adresse bereinigt')
        rows=q.locator('.list .row').count(); check(rows>=2,f'{lang} {w}px: Einträge ({rows})')
        check(LOGIN[lang] in q.inner_text('.list') and 'login' in q.inner_text('.list'),f'{lang} {w}px: Aktion als Text „{LOGIN[lang]}“ mit Code')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/protokoll_person_{lang}_{w}.png',full_page=True)
        q.click('#aupx'); q.wait_for_function("()=>!document.querySelector('#aupers')")
        check(q.locator('.list .row').count()>=rows,f'{lang} {w}px: „{ALL[lang]}“ hebt Filter auf')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'UI Protokoll je Person: alles in Ordnung')
raise SystemExit(1 if fails else 0)
