# [CLAUDE] UI-Test Blickwinkel „Hagelschaden an mehreren Lkw auf dem Hof“ (26.10.2026, Backlog 404): Melden → „Gleicher Schaden an mehreren
# Fahrzeugen“, 14 Fahrzeuge (zwei Blöcke à 7 an den Server) mit einer Beschreibung → je Fahrzeug ein Vorgang mit Link; weniger als zwei
# Fahrzeuge → Hinweis, nichts gesendet. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DONE={'de':'14 Vorgänge angelegt','uk':'Створено 14 справ','en':'14 cases created'}
NEED={'de':'mindestens zwei','uk':'щонайменше два','en':'at least two'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'hg.inhaber','display_name':'HG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'hg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for i in range(14): api('POST','/api/vehicles',{'plate':f'HG-SM {500+i}','vin':f'WMA06XZZ0HP1095{10+i}','site':'Dortmund'})
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'hg.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/new'); q.wait_for_selector('#tomulti',timeout=15000); q.click('#tomulti'); q.wait_for_selector('#mpick',timeout=15000)
        q.fill('#vq','HG-SM'); q.wait_for_timeout(200)
        boxes=q.query_selector_all('#mpick label:not([hidden])')
        check(len(boxes)==14,f'{lang}/{w}: Filter zeigt 14 Fahrzeuge ({len(boxes)})')
        boxes[0].click(); q.fill('#d','Hagelschaden: Dellen im Dach'); q.click('#sb'); q.wait_for_timeout(500)
        check(NEED[lang] in q.inner_text('body') and not q.query_selector('[data-multidone]'),f'{lang}/{w}: ein Fahrzeug → Hinweis, nichts gesendet')
        for b in boxes[1:]: b.click()
        check('14' in q.inner_text('#mcount'),f'{lang}/{w}: Zähler 14')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/hg_form_{lang}.png',full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Formular ohne Querscrollen')
        q.click('#sb'); q.wait_for_selector('[data-multidone]',timeout=20000)
        t=q.inner_text('[data-multidone]')
        check(DONE[lang] in t and len(q.query_selector_all('[data-mcase]'))==14,f'{lang}/{w}: 14 Vorgänge mit Link')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/hg_done_{lang}.png',full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Ergebnis ohne Querscrollen')
        q.click('[data-mcase]'); q.wait_for_timeout(1200)
        check('Hagelschaden' in q.inner_text('body'),f'{lang}/{w}: Link öffnet den Vorgang')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
