# [CLAUDE] UI-Test (23.10.2026, Backlog 212, Teilagent „Fahrtenschreiber gestört unterwegs“): Meldeformular zeigt bei Fahrtenschreiber/
# Fahrerkarte die Pflichten laut VO (EU) 165/2014 (Vermerk, Reparatur, Ersatzkarte); „Tachometer“ zeigt nichts; Unfall- und
# Fahrtenschreiber-Hinweis gleichzeitig möglich; nach „Mehr“ → zurück (Entwurf wiederhergestellt) ist der Hinweis ohne Tippen sichtbar.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Fahrtenschreiber zeigt Fehler, kein Ausdruck','uk':'Тахограф не працює, роздруківки немає','en':'Tachograph error, no printout'}
ACC={'de':'Unfall beim Rangieren, Fahrerkarte klemmt','uk':'ДТП, картка водія застрягла','en':'Accident while manoeuvring, driver card stuck'}
NEG={'de':'Tachometer zeigt nichts an','uk':'Спідометр не працює','en':'Speedometer shows nothing'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fs.inhaber','display_name':'FS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fs.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    csv='Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nFS-ZM 1;Dortmund;MAN;2016;WMA15SZZ2HM722790;Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fs.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000)
        vis=lambda sel: q.evaluate(f"!document.querySelector('{sel}').hidden")
        check(not vis('#tacho'),f'{lang}/{w}: anfangs kein Hinweis')
        q.fill('#d',NEG[lang]); q.wait_for_timeout(100)
        check(not vis('#tacho'),f'{lang}/{w}: „{NEG[lang]}“ ohne Hinweis')
        q.fill('#d',TXT[lang]); q.wait_for_timeout(100)
        check(vis('#tacho') and not vis('#acc'),f'{lang}/{w}: Fahrtenschreiber-Hinweis sichtbar')
        tx=q.inner_text('#tacho')
        check('165/2014' in tx and tx.count('\n')>=4,f'{lang}/{w}: Titel mit VO und 4 Schritte')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#tacho').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fahrtenschreiber-{lang}-{w}.png')
        q.fill('#d',ACC[lang]); q.wait_for_timeout(100)
        check(vis('#tacho') and vis('#acc'),f'{lang}/{w}: Unfall- und Fahrtenschreiber-Hinweis zusammen')
        # Entwurf: Mehr → zurück, Hinweis ohne erneutes Tippen
        q.fill('#d',TXT[lang]); q.type('#d',' '); q.wait_for_timeout(200)
        q.goto(B+'/#/more'); q.wait_for_timeout(400); q.goto(B+'/#/new'); q.wait_for_selector('#f #d',timeout=15000); q.wait_for_timeout(300)
        check(q.input_value('#d').startswith(TXT[lang]) and vis('#tacho'),f'{lang}/{w}: nach Wiederherstellen Hinweis sichtbar')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
