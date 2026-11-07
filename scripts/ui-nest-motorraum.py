# [CLAUDE] UI-Test (07.11.2026, Backlog 1148, Sonde „Vogel- oder Mäusenest im Motorraum“): Meldeformular zeigt eigene Schritte (#engnest)
# mit Brandgefahr-Hinweis; Wespennest bleibt #nest, Mäuse im Lkw bleiben #pest, „Nest entfernt“ zeigt nichts. Hilfe hat den Abschnitt.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Vogelnest im Motorraum gefunden','uk':'пташине гніздо під капотом','en':'bird nest in the engine bay'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'nm.inhaber','display_name':'NM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'nm.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    check(api('POST','/api/vehicles',{'plate':'NM-ZM 1148','vin':'WMA15SZZ2HM761148','site':'Dortmund'})['s'] in (200,201),'Fahrzeug angelegt')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'nm.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        q.fill('#d',TXT[lang]); q.wait_for_timeout(150)
        check(vis('#engnest'),f'{lang}/{w}: Nest-im-Motorraum-Schritte bei „{TXT[lang]}“')
        check(not vis('#nest') and not vis('#pest'),f'{lang}/{w}: keine Wespen-/Ungeziefer-Schritte')
        tx=q.inner_text('#engnest'); check('engnest_' not in tx and 'drv_' not in tx and len(tx)>200,f'{lang}/{w}: Text übersetzt')
        if SHOTS: q.locator('#engnest').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/nest-motorraum-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Formular)')
        q.fill('#d','Wespennest am Spiegel'); q.wait_for_timeout(150)
        check(vis('#nest') and not vis('#engnest'),f'{lang}/{w}: Wespennest → Wespen-Schritte, nicht Motorraum')
        q.fill('#d','Vogelnest im Motorraum entfernt'); q.wait_for_timeout(150)
        check(not vis('#engnest'),f'{lang}/{w}: „entfernt“ → kein Hinweis')
        q.fill('#d','')
        q.goto(B+'/#/help?q='+{'de':'Motorraum','uk':'моторному','en':'engine bay'}[lang]); q.wait_for_timeout(1500)
        body=q.inner_text('#app')
        check({'de':'Vogel- oder Mäusenest im Motorraum','uk':'Пташине чи мишаче гніздо в моторному відсіку','en':'Bird or mouse nest in the engine bay'}[lang] in body,f'{lang}/{w}: Hilfe-Abschnitt gefunden')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
