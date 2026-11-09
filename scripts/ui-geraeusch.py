# [CLAUDE] UI-Test (09.11.2026, Backlog 1242, Blickwinkel „Fahrer meldet ein ungewohntes Geräusch“): Meldeformular zeigt
# allgemeine Geräusch-Schritte (#noise) nur ohne genaueren Hinweis; „Bremse quietscht“ zeigt nur die Bremsen-Schritte, „Radio knackt“ nichts. Hilfe zeigt den Abschnitt. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OVL={'de':'Motor macht komische Geräusche beim Anfahren','uk':'дивний звук у двигуні','en':'engine making strange noise'}
HELP={'de':'Neues oder ungewohntes Geräusch','uk':'Новий або незвичний звук','en':'New or unusual noise'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gr.inhaber','display_name':'GR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'gr.inhaber','password':PW})['s']==200,'Anmeldung Inhaber'); user='gr.inhaber'
    tag=str(uuid.uuid4().int)[:4]; plate=f'GR-ZM {tag}'
    csv=f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;WMA15SZZ2HM80{tag};Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        q.fill('#d',OVL[lang]); q.wait_for_timeout(150)
        check(vis('#noise'),f'{lang}/{w}: Geräusch-Schritte bei „{OVL[lang]}“')
        tx=q.inner_text('#noise'); check('noise_' not in tx and len(tx)>200,f'{lang}/{w}: Text übersetzt')
        if SHOTS: q.locator('#noise').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/geraeusch-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen (Formular)')
        q.fill('#d','Bremse quietscht'); q.wait_for_timeout(150)
        check(vis('#brake') and not vis('#noise'),f'{lang}/{w}: „Bremse quietscht“ → nur Bremsen-Schritte')
        q.fill('#d','Blinkerhebel abgebrochen, es klappert'); q.wait_for_timeout(150)
        check(not vis('#noise'),f'{lang}/{w}: Lenkstockhebel → keine allgemeinen Geräusch-Schritte')
        q.fill('#d','Radio knackt'); q.wait_for_timeout(150)
        check(not vis('#noise'),f'{lang}/{w}: „Radio knackt“ → kein Hinweis')
        q.fill('#d','')
        q.goto(B+'/#/help'); q.wait_for_timeout(1200)
        ht=q.inner_text('#app'); check('help_noise' not in ht and HELP[lang] in ht,f'{lang}/{w}: Hilfe-Abschnitt vorhanden')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
