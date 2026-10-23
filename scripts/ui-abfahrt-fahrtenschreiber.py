# [CLAUDE] UI-Test (24.10.2026, Backlog 216, Teilagent „Abfahrtskontrolle findet Fahrtenschreiber-Störung“): Abfahrtskontrolle zeigt bei
# einem Mangel mit Fahrtenschreiber/Fahrerkarte in der Beschreibung die Pflichten laut VO (EU) 165/2014; anderer Mangel oder „Ok“ zeigt nichts;
# Mangel zurück auf „Ok“ blendet den Hinweis aus; nach „Mehr“ → zurück (Entwurf) sichtbar.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TXT={'de':'Fahrtenschreiber zeigt Fehler','uk':'Тахограф показує помилку','en':'Tachograph shows error'}
NEG={'de':'Tachometer flackert','uk':'Спідометр блимає','en':'Speedometer flickers'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ak.inhaber','display_name':'AK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ak.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    csv='Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nAK-ZM 1;Dortmund;MAN;2016;WMA15SZZ2HM722790;Lkw'
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeug importiert')
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ak.inhaber','password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/check'); q.wait_for_selector('#f .checkitem',timeout=15000)
        q.select_option('#v',index=1)
        vis=lambda: q.evaluate("!document.querySelector('#tacho').hidden")
        check(not vis(),f'{lang}/{w}: anfangs kein Hinweis')
        q.click('.checkitem[data-key=kontrollleuchten] label.bad'); q.fill('input[name=kontrollleuchten__note]',NEG[lang]); q.wait_for_timeout(100)
        check(not vis(),f'{lang}/{w}: anderer Mangel ohne Hinweis')
        q.fill('input[name=kontrollleuchten__note]',TXT[lang]); q.wait_for_timeout(100)
        check(vis(),f'{lang}/{w}: Mangel Fahrtenschreiber → Hinweis')
        tx=q.inner_text('#tacho'); check('165/2014' in tx and tx.count('\n')>=4,f'{lang}/{w}: Titel mit VO und 4 Schritte')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#tacho').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/abfahrt-tacho-{lang}-{w}.png')
        q.click('.checkitem[data-key=kontrollleuchten] input[value=ok]', force=True); q.wait_for_timeout(100)
        check(not vis(),f'{lang}/{w}: zurück auf Ok → kein Hinweis')
        q.click('.checkitem[data-key=kontrollleuchten] label.bad'); q.wait_for_timeout(100)
        check(vis(),f'{lang}/{w}: wieder Mangel → Hinweis')
        q.type('input[name=kontrollleuchten__note]',' '); q.wait_for_timeout(300)
        q.goto(B+'/#/more'); q.wait_for_timeout(400); q.goto(B+'/#/check'); q.wait_for_selector('#f .checkitem',timeout=15000); q.wait_for_timeout(400)
        check(TXT[lang] in q.input_value('input[name=kontrollleuchten__note]') and vis(),f'{lang}/{w}: nach Wiederherstellen Hinweis sichtbar')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
