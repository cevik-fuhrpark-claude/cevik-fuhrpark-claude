# [CLAUDE] UI-Test (22.10.2026, Backlog 148, Teilagent „Tastatur/Screenreader“): Trefferzahl nach Suche in der Live-Region (#live)
# für Vorgänge, Fahrzeuge und globale Suche (DE/UK/EN), sichtbares „Keine Treffer“ in der Fahrzeugliste, aktiver Vorgangsfilter mit
# aria-current, Fahrzeugakte-Überschrift mit Kennzeichen im zugänglichen Namen, Fokusring auf dem Kalendersymbol von Datums-/Monatsfeldern,
# 390/1366 px. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
WANT={'de':('2 Treffer','Keine Treffer'),'uk':('2 результати','Нічого не знайдено'),'en':('2 results','No results')}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sr.inhaber','display_name':'SR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sr.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    api('POST','/api/vehicles',{'plate':'SR-AB 1','vin':'WDB96340310776021','site':'Dortmund'})
    api('POST','/api/vehicles',{'plate':'SR-AB 2','vin':'WDB96340310776022','site':'Dortmund'})
    for i in range(2): api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310776021','description':f'SR Bremse quietscht {i}','priority':'niedrig','driveability':'fahrbereit','workshop_site':site,'request_key':f'sr-{i}'})
    live=lambda q: q.evaluate("()=>{const l=document.getElementById('live');return l?l.textContent:''}")
    for w in (390,1366):
        ctx=br.new_context(viewport={'width':w,'height':900}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'sr.inhaber','password':PW}])
        for lang in ('de','uk','en'):
            q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); tag=f'{w}px {lang}'
            q.goto(B+'/#/cases'); q.reload(); q.wait_for_selector('#cq',timeout=15000)
            cur=q.locator('.seg-tabs a[aria-current="true"]')
            check(cur.count()==1 and q.evaluate("()=>document.querySelector('.seg-tabs a.on').getAttribute('aria-current')")=='true',f'{tag}: aktiver Filter mit aria-current')
            q.fill('#cq','Bremse'); q.wait_for_timeout(1200)
            check(live(q)==WANT[lang][0],f'{tag}: Vorgangssuche angesagt „{live(q)}“')
            q.goto(B+'/#/vehicles'); q.wait_for_selector('#q',timeout=15000)
            q.fill('#q','SR-AB'); q.wait_for_timeout(900)
            check(live(q)==WANT[lang][0] and q.locator('#vnohit').is_hidden(),f'{tag}: Fahrzeugsuche angesagt „{live(q)}“')
            q.fill('#q','ZZZ'); q.wait_for_timeout(900)
            check(live(q)==WANT[lang][1] and q.locator('#vnohit').is_visible(),f'{tag}: Fahrzeugsuche ohne Treffer sichtbar und angesagt')
            if SHOTS and lang=='de': q.screenshot(path=f'{SHOTS}/sr_fahrzeuge_ohne_{w}.png')
            q.goto(B+'/#/search'); q.wait_for_selector('#gq',timeout=15000)
            q.fill('#gq','SR-AB 2'); q.wait_for_timeout(1500)
            got=live(q); one={'de':'1 Treffer','uk':'1 результат','en':'1 result'}[lang]
            check(got==one,f'{tag}: globale Suche angesagt „{got}“')
            q.goto(B+'/#/vehicles/VIN:WDB96340310776021'); q.wait_for_selector('h1[aria-label]',timeout=15000)
            check('SR-AB 1' in (q.get_attribute('h1','aria-label') or ''),f'{tag}: Fahrzeugakte-Überschrift mit Kennzeichen')
        q.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
        # Fokusring auf dem Kalendersymbol: so lange Tab, bis ein Monatsfeld fokussiert ist, dann noch zweimal (Jahr/Monat → Symbol)
        q.goto(B+'/#/kpi'); q.reload(); q.wait_for_selector('main input[type=month], main input[type=date]',timeout=15000)
        q.focus('main input[type=month], main input[type=date]')
        for _ in range(2): q.keyboard.press('Tab')
        st=q.evaluate("()=>{const e=document.activeElement;const c=getComputedStyle(e);return {t:e.type,o:c.outlineStyle,w:c.outlineWidth}}")
        check(st['t'] in ('month','date') and st['o']!='none',f'{w}px: Kalendersymbol mit Fokusring {st}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/sr_kpi_fokus_{w}.png')
        check(not errs,f'{w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
