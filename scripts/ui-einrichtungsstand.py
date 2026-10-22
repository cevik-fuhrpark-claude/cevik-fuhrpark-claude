# [CLAUDE] UI-Test (22.10.2026, eigene Verbesserung): Inhaber → Mehr → „Einrichtungsstand“ – Liste der Punkte mit Status, offene mit
# Hinweis, Antippen öffnet die passende Seite; Fuhrparkleitung sieht den Menüpunkt nicht. DE/UK/EN, 390/820/1366 px, ohne Querscrollen/
# Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Einrichtungsstand','uk':'Стан налаштування','en':'Setup status'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'es.inhaber','display_name':'ES Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'es.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    u=api('POST','/api/users',{'username':'es.leitung','display_name':'ES Leitung','role':'fleet','environment':'production'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    api('PUT','/api/settings',{'workshop_hourly_rate_net':90})
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'es.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/more'); q.reload(); q.wait_for_selector('a[href="#/readiness"]',timeout=15000)
        q.click('a[href="#/readiness"]'); q.wait_for_selector('[data-rd]',timeout=15000)
        check(TITLE[lang] in q.inner_text('h1'),f'{lang} {w}px: Überschrift')
        n=q.locator('[data-rd]').count(); check(n>=12,f'{lang} {w}px: {n} Punkte')
        st=q.evaluate("()=>document.querySelector('[data-rd=hourly_rate] .chip').className")
        check(' ok' in ' '+st,f'{lang} {w}px: Stundensatz eingerichtet')
        check(q.evaluate("()=>!!document.querySelector('[data-rd=emergency] .small:not(.muted)')"),f'{lang} {w}px: offener Punkt mit Hinweis')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/einrichtung_{lang}_{w}.png',full_page=True)
        q.click('[data-rd=emergency]'); q.wait_for_timeout(800)
        check(q.evaluate('()=>location.hash')=='#/emergency/edit',f'{lang} {w}px: Antippen öffnet Rufnummern')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); q.goto(B)
    q.evaluate(JS,['POST','/api/login',{'username':'es.leitung','password':PW}]); q.goto(B+'/#/more'); q.reload(); q.wait_for_selector('.morelist',timeout=15000)
    check(q.locator('a[href="#/readiness"]').count()==0,'Leitung: kein Menüpunkt'); ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
