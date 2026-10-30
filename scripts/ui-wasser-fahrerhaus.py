# [CLAUDE] UI-Test (30.10.2026, Backlog 700–701, Blickwinkel „Wasser im Fahrerhaus“): Meldeformular zeigt
# bei Wasser im Fahrerhaus eigene Schritte (#cableak), nicht die Planen-/Fenster-Schritte;
# „Wasser im Laderaum“ nicht. Hilfe zeigt den Abschnitt. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Dachluke undicht, es regnet rein','uk':'Вода тече в кабіну','en':'Water leaking into the cab'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'km.inhaber','display_name':'KM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'km.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=str(uuid.uuid4().int)[:4]; plate=f'KM-ZM {tag}'
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;WMA15SZZ2HM79{tag};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'km.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        q.fill('#d',TXT[lang]); q.wait_for_timeout(150)
        check(vis('#cableak'),f'{lang}/{w}: Wasser-Schritte bei „{TXT[lang]}“')
        check(not vis('#tarp') and not vis('#window'),f'{lang}/{w}: keine Planen-/Fenster-Schritte')
        check(q.evaluate("!document.querySelector('#cableak ul').hidden"),f'{lang}/{w}: Schritte aufgeklappt')
        tx=q.inner_text('#cableak'); check('cableak_' not in tx and len(tx)>200,f'{lang}/{w}: Text übersetzt')
        if SHOTS: q.locator('#cableak').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wasser-kabine-{lang}-{w}.png')
        q.fill('#d','Wasser im Laderaum'); q.wait_for_timeout(150)
        check(not vis('#cableak'),f'{lang}/{w}: Laderaum → kein Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Formular)')
        q.fill('#d','')
        q.goto(B+'/#/help'); q.wait_for_timeout(1200)
        ht=q.inner_text('#app'); check('help_cableak' not in ht and (('Wasser im Fahrerhaus' in ht) or ('Вода в кабіні' in ht) or ('Water in the cab' in ht)),f'{lang}/{w}: Hilfe-Abschnitt vorhanden')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
