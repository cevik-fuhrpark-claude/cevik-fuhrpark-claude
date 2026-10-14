# [CLAUDE] UI-Test: Management-Panel und Fahrzeugakte („Offene Agentenbefunde“) zeigen Meldungstexte der Agentenbefunde in der App-Sprache DE/UK/EN (Vorlagen
# public/finding-messages.js), bei 390/820/1366 px ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
# Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
# UVV zuletzt 10.01.2025, Intervall 12 Monate → überfällig (Prüfart-Wert „UVV“ bleibt wörtlich)
EXP={'de':['PS-ANL 1: UVV seit','Tag(en) überfällig (fällig 2026-01-10)'],
     'uk':['PS-ANL 1: UVV прострочено на','дн. (строк 2026-01-10)'],
     'en':['PS-ANL 1: UVV overdue for','day(s) (due 2026-01-10)']}
UNCL={'de':'PS-ANL 1: HU-Frist ungeklärt – ','uk':'PS-ANL 1: строк HU не з’ясовано – ','en':'PS-ANL 1: HU deadline unclear – '}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ps.inhaber','display_name':'PS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ps.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'vin':'WDB96340310888001','plate':'PS-ANL 1','site':'Dortmund'})
    r=api('POST','/api/vehicles/VIN:WDB96340310888001/maintenance',{'kind':'UVV','last_done_date':'2025-01-10','interval_months':12,'evidence':'UI-Test Panel'})
    check(r['s'] in (200,201),'Prüftermin angelegt '+str(r['s']))
    # HU belegt, aber ohne zulässige Gesamtmasse → HU-Frist ungeklärt (Hinweis „Fahrzeugklasse fehlt“)
    r=api('POST','/api/vehicles/VIN:WDB96340310888001/maintenance',{'kind':'HU','last_done_date':'2026-03-15','interval_months':12,'evidence':'UI-Test HU-Bericht'})
    check(r['s'] in (200,201),'HU angelegt '+str(r['s']))
    check(api('POST','/api/agent/run')['s']==200,'Agent gelaufen')
    vid=api('GET','/api/vehicles/VIN:WDB96340310888001')['d']['vehicle']['id']
    for lang in ['uk','en','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'ps.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/master'); q.wait_for_function("()=>document.body.innerText.includes('PS-ANL 1')")
        txt=q.inner_text('body')
        for e in EXP[lang]: check(e in txt,f'{lang} {w}px: {e}')
        if lang!='de': check('überfällig (fällig' not in txt,f'{lang} {w}px: kein deutscher Meldungstext')
        # HU/SP „Frist ungeklärt“: Hinweistext aus der Fahrzeugakten-Übersetzung (hn_<code>), nicht der deutsche Servertext
        check(UNCL[lang] in txt,f'{lang} {w}px: {UNCL[lang]}')
        if lang!='de': check('ungeklärt –' not in txt and 'Gesamtmasse' not in txt,f'{lang} {w}px: HU/SP-Hinweis übersetzt')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        if SHOTS:
            q.get_by_text('PS-ANL 1').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/panel_{lang}_{w}.png')
        # Fahrzeugakte: dieselben Befunde des Fahrzeugs im aufklappbaren Abschnitt „Offene Agentenbefunde“
        q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('#vaf summary')
        q.click('#vaf summary'); vt=q.inner_text('#vaf')
        for e in EXP[lang]+[UNCL[lang]]: check(e in vt,f'Akte {lang} {w}px: {e}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'Akte {lang} {w}px: kein Querscrollen')
        check(not errs,f'Akte {lang} {w}px: keine Skriptfehler {errs}')
        if SHOTS: q.locator('#vaf').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/akte_{lang}_{w}.png')
        c.close()
    br.close()
print('Panel-Sprache: alles grün' if not fails else f'FEHLER: {len(fails)}')
raise SystemExit(1 if fails else 0)
