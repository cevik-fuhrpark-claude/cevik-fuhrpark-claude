# [CLAUDE] UI-Test (01.11.2026, Backlog 829, Blickwinkel „Werkstatt trägt Wartung am Anhänger mit km der Zugmaschine ein“): Formular „erledigt“
# eines Prüftermins mit km-Intervall zeigt am km-Feld beim Anhänger den Hinweis „nur Achskilometerzähler“ und den zuletzt erfassten Stand,
# beim Tippen die Differenz bzw. bei kleinerem Stand einen Hinweis; Lkw ohne Anhänger-Hinweis. DE/UK/EN bei 390/820/1366 px. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TR='VIN:WKV00000829000011'; TK='VIN:WMA06XZZ8RP829012'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wk.inhaber','display_name':'WK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    rid={}
    for vid,plate,kind,km in [(TR,'WK-AN 829','anhaenger',98000),(TK,'WK-LK 829','lkw',612000)]:
        r=api('POST','/api/vehicles',{'vin':vid[4:],'plate':plate,'site':'Dortmund','kind':kind})
        k=api('POST',f'/api/vehicles/{vid}/odometer',{'km':km})
        m=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'Bremsen','interval_km':50000,'last_done_km':km-40000,'last_done_date':'2026-01-15','evidence':'Werkstattbericht (UI-Test)'})
        check(r['s'] in (200,201,409) and k['s'] in (200,201,409) and m['s'] in (200,201),f'{plate} angelegt ({r["s"]}/{k["s"]}/{m["s"]})')
        rid[vid]=(m['d'] or {}).get('id')
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wk.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/vehicles/{TR}'); q.reload(); q.wait_for_selector(f'button[data-done="{rid[TR]}"]',timeout=15000)
        q.click(f'button[data-done="{rid[TR]}"]'); fm=q.locator(f'form[data-mdone="{rid[TR]}"]'); q.wait_for_timeout(100)
        check(fm.locator('[data-mdkmtr]').is_visible(),f'{lang}/{wd}: Anhänger-Hinweis')
        check(fm.locator('[data-mdkmlast]').is_visible() and '98' in fm.locator('[data-mdkmlast]').inner_text(),f'{lang}/{wd}: letzter Stand')
        fm.locator('input[name=done_km]').fill('98 400'); q.wait_for_timeout(50)
        check(fm.locator('[data-mdkmdiff]').is_visible(),f'{lang}/{wd}: Differenz')
        fm.locator('input[name=done_km]').fill('89000'); q.wait_for_timeout(50)
        check(fm.locator('[data-mdkmlow]').is_visible(),f'{lang}/{wd}: kleiner → Hinweis')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: ohne Querscrollen')
        if SHOTS: fm.locator('input[name=done_km]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wartkm-{lang}-{wd}.png')
        q.locator('#kf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(50)
        check(q.locator('#kfkmtr').is_visible(),f'{lang}/{wd}: Kilometerstand erfassen – Anhänger-Hinweis (Backlog 830)')
        q.goto(B+f'/#/vehicles/{TK}'); q.wait_for_selector(f'button[data-done="{rid[TK]}"]',timeout=15000)
        q.click(f'button[data-done="{rid[TK]}"]'); fk=q.locator(f'form[data-mdone="{rid[TK]}"]'); q.wait_for_timeout(100)
        check(q.locator('#kfkmtr').count()==0,f'{lang}/{wd}: Lkw – Kilometerstand erfassen ohne Hinweis')
        check(fk.locator('[data-mdkmtr]').count()==0 and fk.locator('[data-mdkmlast]').is_visible(),f'{lang}/{wd}: Lkw ohne Anhänger-Hinweis, mit letztem Stand')
        check(not errs,f'{lang}/{wd}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
