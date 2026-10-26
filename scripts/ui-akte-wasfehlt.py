# [CLAUDE] UI-Test (26.10.2026, Teilagent „Neuer Lkw / Lkw wird verkauft“, Backlog 370/373):
# Fahrzeugakte (Leitung): „Was fehlt noch?“ lädt beim Aufklappen nur die Datenqualitäts-Befunde dieses Fahrzeugs (z. B. fehlende Prüftermine),
# Link zur Datenqualität (die Hinweise beim Außer-Betrieb-Nehmen aus Backlog 370 prüft Test 723 am Server).
# DE/UK/EN, 390/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Was fehlt noch?','uk':'Чого ще бракує?','en':'What is still missing?'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wf.inhaber','display_name':'WF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    V={}
    for i,lang in enumerate(['en','uk','de']):
        vin=f'WDB9634031L37300{i}'; api('POST','/api/vehicles',{'vin':vin,'plate':f'WF-{lang.upper()} {i+1}','site':'Dortmund'}); V[lang]='VIN:'+vin
    for lang in ['en','uk','de']:
        vid=V[lang]
        for wd,h in [(390,844),(1366,900)]:
            ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wf.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
            q.goto(B+f'/#/vehicles/{vid}'); q.reload(); q.wait_for_selector('#vdq',timeout=15000)
            check(TITLE[lang] in q.inner_text('#vdq summary'),f'{lang} {wd}px: Titel')
            q.click('#vdq summary'); q.wait_for_selector('#vdqbody [data-vdq], #vdqbody p.small',timeout=15000); q.wait_for_timeout(300)
            checks=q.evaluate("()=>[...document.querySelectorAll('#vdqbody [data-vdq]')].map(e=>e.dataset.vdq)")
            check('missing_inspection' in checks,f'{lang} {wd}px: fehlende Prüftermine genannt {checks}')
            check(q.locator('#vdqbody a[href*="quality"]').count()==1,f'{lang} {wd}px: Link Datenqualität')
            check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
            if SHOTS: q.locator('#vdq').screenshot(path=f'{SHOTS}/wasfehlt_{lang}_{wd}.png')
            check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
            ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
