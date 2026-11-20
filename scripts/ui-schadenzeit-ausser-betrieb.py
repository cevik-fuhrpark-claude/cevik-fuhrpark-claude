# [CLAUDE] UI-Test (20.11.2026, Backlog 1637, Blickwinkel „Leitung trägt einen Schadenzeitpunkt ein, an dem das Fahrzeug noch nicht
# zugelassen bzw. schon außer Betrieb war“): Vorgangsdetail zeigt der Leitung neben „Fahrer zum Schadenzeitpunkt“ den Hinweis mit Datum der
# Außerbetriebnahme, Grund und Korrekturweg (DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler). Frischer Dev-Server nötig
# (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime, urllib.request
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'in der Zeit, in der EZ-SZ 1637 außer Betrieb war','uk':'був виведений з експлуатації','en':'when EZ-SZ 1637 was out of service'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sz.inhaber','display_name':'SZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'sz.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    v=api('POST','/api/vehicles',{'vin':'WDB96340310163701','plate':'EZ-SZ 1637','site':'Dortmund'})
    check(v['s'] in (200,201),'Fahrzeug '+str(v['s']))
    # Standzeit: außer Betrieb (Grund), 30 Tage zurückdatiert (nur Dev-Server), heute wieder in Betrieb; der Vorgang nennt einen Schadentag darin
    d=api('POST','/api/vehicles/VIN:WDB96340310163701/active',{'active':False,'reason':'abgemeldet (Test)'})
    check(d['s']==200,'außer Betrieb '+str(d['s'])+' '+str(d['d'])[:200])
    rq=urllib.request.Request(B+'/__dev/backdate?deact=VIN:WDB96340310163701&hours=720',method='POST'); urllib.request.urlopen(rq).read()
    d=api('POST','/api/vehicles/VIN:WDB96340310163701/active',{'active':True})
    check(d['s']==200,'wieder in Betrieb '+str(d['s'])+' '+str(d['d'])[:200])
    c=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310163701','description':'Spiegel beim Rangieren abgefahren','priority':'niedrig','driveability':'fahrbereit','occurred_at':(today-datetime.timedelta(days=5)).isoformat(),'request_key':'ui-1637-1'})
    check(c['s']==201,'Vorgang '+str(c['s'])+' '+str(c['d'])[:200]); CID=c['d']['id']
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'sz.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/cases/'+CID); q.reload()
        try: q.wait_for_selector('#coccveh',timeout=15000)
        except Exception: pass
        tx=q.evaluate("()=>{const e=document.querySelector('#coccveh');return e?e.innerText:''}")
        check(EXP[lang] in tx and 'EZ-SZ 1637' in tx and 'abgemeldet (Test)' in tx,f'{lang} {w}px Hinweis mit Grund sichtbar')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.locator('[data-occurred]').locator('xpath=..').screenshot(path=f'{SHOTS}/schadenzeit_ab_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
