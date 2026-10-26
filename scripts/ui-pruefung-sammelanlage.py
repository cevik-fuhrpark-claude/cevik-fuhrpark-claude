# [CLAUDE] UI-Test Blickwinkel „Wintercheck vor der Saison für alle Lkw“ (26.10.2026, Backlog 405): Prüftermine → „Prüftermin für mehrere
# Fahrzeuge anlegen“, Art „Sonstiges“, Bezeichnung + Fälligkeit, 5 Fahrzeuge → je Fahrzeug ein Eintrag mit Link zur Fahrzeugakte; ohne
# Bezeichnung bzw. ohne Fahrzeug → Hinweis, nichts gesendet; erneutes Anlegen derselben Bezeichnung → „bereits vorhanden“. DE/UK/EN bei
# 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DONE={'de':'5 Prüftermine angelegt','uk':'Створено 5 оглядів','en':'5 inspections created'}
SAME={'de':'Bereits vorhanden (unverändert): 5','uk':'Уже існує (без змін): 5','en':'Already present (unchanged): 5'}
NEEDEV={'de':'Bezeichnung','uk':'назву','en':'label'}
NEEDV={'de':'mindestens ein Fahrzeug','uk':'принаймні один','en':'at least one vehicle'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
due=(datetime.date.today()+datetime.timedelta(days=21)).isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wc.inhaber','display_name':'WC Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wc.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for i in range(5): api('POST','/api/vehicles',{'plate':f'WC-SA {700+i}','vin':f'WMA06XZZ0HP1097{10+i}','site':'Dortmund'})
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wc.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/maintenance'); q.wait_for_selector('#tomcreate',timeout=15000); q.click('#tomcreate'); q.wait_for_selector('#mcpick',timeout=15000)
        ev=f'Wintercheck 2026 {lang}{w}'
        q.fill('#vq','WC-SA'); q.wait_for_timeout(200)
        q.click('#mcsb'); q.wait_for_timeout(400)
        check(NEEDEV[lang] in q.inner_text('body') and not q.query_selector('[data-mcdone]'),f'{lang}/{w}: ohne Bezeichnung → Hinweis')
        q.fill('#mce',ev); q.fill('#mcd',due)
        q.click('#mcsb'); q.wait_for_timeout(400)
        check(NEEDV[lang] in q.inner_text('body') and not q.query_selector('[data-mcdone]'),f'{lang}/{w}: ohne Fahrzeug → Hinweis')
        q.click('#mcall')
        check('5' in q.inner_text('#mccount'),f'{lang}/{w}: Zähler 5 ({q.inner_text("#mccount")})')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/wc_form_{lang}.png',full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Formular ohne Querscrollen')
        q.click('#mcsb'); q.wait_for_selector('[data-mcdone]',timeout=20000)
        t=q.inner_text('[data-mcdone]')
        check(DONE[lang] in t and len(q.query_selector_all('[data-mcdone] ul.list a'))==5,f'{lang}/{w}: 5 Einträge mit Link ({t[:60]!r})')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/wc_done_{lang}.png',full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Ergebnis ohne Querscrollen')
        q.click('[data-mcdone] ul.list a'); q.wait_for_timeout(1200)
        check(ev in q.inner_text('body'),f'{lang}/{w}: Link öffnet die Fahrzeugakte mit dem Eintrag')
        # gleiche Bezeichnung erneut → nichts doppelt
        q.goto(B+'/#/maintenance/multi'); q.wait_for_selector('#mcpick',timeout=15000)
        q.fill('#mce',ev); q.click('#mcall'); q.click('#mcsb'); q.wait_for_selector('[data-mcdone]',timeout=20000)
        check(SAME[lang] in q.inner_text('[data-mcdone]'),f'{lang}/{w}: erneut → bereits vorhanden')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
