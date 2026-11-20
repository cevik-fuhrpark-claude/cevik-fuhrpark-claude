# [CLAUDE] UI-Test Backlog 1633 (Blickwinkel „Leitung prüft am Monatsende, wofür Lagerware entnommen wurde“): Lagerjournal zeigt unter
# „Entnahme“ die Aufteilung „davon ohne Vorgang (Werkstattbedarf)“ samt Hinweis; Auswahl „Entnahme ohne Vorgang“ zeigt nur diese Buchungen.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SPLIT={'de':'ohne Vorgang','uk':'без заявки','en':'without case'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'eov.inhaber','display_name':'EOV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'eov.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    r=api('POST','/api/stock',{'site':site,'name':'EOV Bremsenreiniger','unit_price_net':4.2,'initial_qty':50}); check(r['s']==201,'Artikel'); iid=r['d']['id']
    check(api('POST',f'/api/stock/{iid}/movements',{'type':'entnahme','qty':3,'note':'Werkstattbedarf'})['s']==201,'Entnahme ohne Vorgang')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'eov.inhaber','password':PW}])
        q.goto(B+'/#/stock/journal'); q.wait_for_selector('#jf',timeout=15000)
        q.select_option('#jtype',''); q.click('#jf button.btn:not(.secondary)'); q.wait_for_selector('#sjsplit',timeout=15000)
        check(SPLIT[lang] in q.inner_text('#sjsplit') and q.is_visible('#sjnchint'),f'{lang}/{w}: Aufteilung und Hinweis sichtbar')
        if SHOTS: q.locator('#jf').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/eov_{lang}_{w}.png',full_page=True)
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
        q.select_option('#jtype','entnahme_ohne_vorgang'); q.click('#jf button.btn:not(.secondary)'); q.wait_for_timeout(1200)
        rows=q.locator('table.stack tbody tr').count()
        check(rows>=1 and q.locator('#sjsplit').count()==0 and q.is_visible('#sjnchint'),f'{lang}/{w}: Filter „ohne Vorgang“ ({rows} Zeilen)')
        q.select_option('#jtype','')
        q.click('#jf button.btn:not(.secondary)'); q.wait_for_timeout(500)
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Entnahme ohne Vorgang: alles grün')
raise SystemExit(1 if fails else 0)
