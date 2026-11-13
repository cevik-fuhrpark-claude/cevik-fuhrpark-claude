# [CLAUDE] UI-Test (13.11.2026, Backlog 1438): Agentenbefund „Prüftermin verstrichen“ (MAINTENANCE_PLAN_MISSED) – verstrichener geplanter
# UVV-Termin ohne Durchführung und ohne Auftrag erscheint im Master-Panel mit Text, Bezeichnung und nächstem Schritt in der Sprache der Oberfläche;
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MSG={'de':'Durchführung nicht eingetragen','uk':'виконання не внесено','en':'completion not recorded'}
ACT={'de':'„Erledigt“ mit Nachweis eintragen','uk':'внесіть «Виконано»','en':'record it as “Done”'}
LBL={'de':'Prüftermin verstrichen','uk':'Візит на огляд минув','en':'Inspection appointment passed'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B+'/#/login')
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'atv.inhaber','display_name':'ATV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'atv.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    today=datetime.date.fromisoformat(a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())"))
    d=lambda n: str(today+datetime.timedelta(days=n))
    api('POST','/api/vehicles',{'vin':'WDB96340311438001','plate':'AT-V 1438','site':'Dortmund','kind':'lkw'})
    r=api('POST','/api/vehicles/VIN:WDB96340311438001/maintenance',{'kind':'UVV','last_done_date':d(-30),'interval_months':12,'evidence':'UI-Test 1438'})
    check(r['s']==201,'UVV-Regel '+str(r['s']))
    check(api('POST',f'/api/maintenance/{r["d"]["id"]}/plan',{'planned_date':d(-1)})['s']==200,'Termin gestern')
    check(api('POST','/api/agent/run',{})['s'] in (200,202),'Agent-Lauf')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B+'/#/login')
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'atv.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/master?q=AT-V'); q.reload(); q.wait_for_selector('#afl [data-afi]', timeout=15000); q.wait_for_timeout(300)
        rows=[x for x in q.locator('#afl [data-afi]').all() if x.is_visible() and 'AT-V 1438' in x.inner_text() and MSG[lang] in x.inner_text()]
        check(len(rows)==1,f'{lang} {w}: Master genau ein Befund „Termin verstrichen“ ({len(rows)})')
        if rows:
            t=rows[0].inner_text()
            check(ACT[lang] in t,f'{lang} {w}: nächster Schritt übersetzt')
            check(LBL[lang] in t or LBL[lang] in q.inner_text('#afl'),f'{lang} {w}: Bezeichnung übersetzt')
            check('UI-Test 1438' not in t,f'{lang} {w}: kein Nachweistext')
            if SHOTS: rows[0].scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/agenttermin-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}: ohne Querscrollen')
        check(not errs,f'{lang} {w}: keine Skriptfehler {errs[:2]}')
        c.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
