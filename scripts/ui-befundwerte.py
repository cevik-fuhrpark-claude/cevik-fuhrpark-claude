# [CLAUDE] UI-Test (19.10.2026): Agentenbefunde zeigen feste Wertelisten (Prüfart, Reifenposition) und Dezimalzahlen in der App-Sprache;
# Datenqualität „Wartung nach km ohne Ausgangs-km“ mit übersetzter Wartungsart und km im Sprachformat. 390/820/1366 px, ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':['BW-ANL 1: Ölwechsel seit','VA-L: Profiltiefe 1,4 mm'],
     'uk':['BW-ANL 1: Заміна оливи прострочено','глибина протектора 1,4 мм'],
     'en':['BW-ANL 1: Oil change overdue','tread depth 1.4 mm']}
DQ={'de':'Inspektion · 50.000 km','uk':'Техобслуговування · 50 000 км','en':'Service · 50,000 km'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bw.inhaber','display_name':'BW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    VID='VIN:WDB96340310888101'
    api('POST','/api/vehicles',{'vin':'WDB96340310888101','plate':'BW-ANL 1','site':'Dortmund'})
    r=api('POST',f'/api/vehicles/{VID}/maintenance',{'kind':'Ölwechsel','last_done_date':'2025-01-10','interval_months':6,'evidence':'UI-Test Befundwerte'})
    check(r['s'] in (200,201),'Ölwechsel angelegt '+str(r['s']))
    r=api('POST',f'/api/vehicles/{VID}/maintenance',{'kind':'Inspektion','interval_km':50000,'evidence':'UI-Test km ohne Ausgangswert'})
    check(r['s'] in (200,201),'Inspektion nach km angelegt '+str(r['s']))
    r=api('POST',f'/api/vehicles/{VID}/tires/events',{'event_type':'messung','position':'VA-L','tread_mm':1.4})
    check(r['s'] in (200,201),'Reifenmessung '+str(r['s']))
    check(api('POST','/api/agent/run')['s']==200,'Agent gelaufen')
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'bw.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/master'); q.wait_for_function("()=>document.body.innerText.includes('BW-ANL 1')")
        txt=q.inner_text('body')
        check(EXP[lang][0] in txt,f'{lang} {w}px: {EXP[lang][0]}')
        check(EXP[lang][1] in txt,f'{lang} {w}px: {EXP[lang][1]}')
        if lang!='de': check('Ölwechsel' not in txt,f'{lang} {w}px: kein deutscher Prüfart-Wert')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen (Panel)')
        if SHOTS: q.get_by_text('BW-ANL 1').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/befund_{lang}_{w}.png')
        q.goto(B+'/#/quality'); q.wait_for_selector('#dqcsv'); q.wait_for_function("()=>document.body.innerText.includes('BW-ANL 1')")
        dq=q.inner_text('body')
        check(DQ[lang] in dq.replace('\u00a0',' ').replace('\u202f',' '),f'{lang} {w}px: Datenqualität {DQ[lang]}')
        if lang!='de': check('Inspektion · 50000 km' not in dq,f'{lang} {w}px: Datenqualität ohne deutschen Rohtext')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen (Datenqualität)')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/dq_{lang}_{w}.png', full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'OK' if not fails else 'FEHLER: '+str(len(fails))}")
raise SystemExit(1 if fails else 0)
