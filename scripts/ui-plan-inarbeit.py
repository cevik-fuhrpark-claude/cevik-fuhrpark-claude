# [CLAUDE] UI-Test (25.10.2026, Backlog 253, Blickwinkel „Auftrag wartet wochenlang auf Teile“): Werkstattplan führt einen begonnenen
# Auftrag (wartet auf Teile) mit vergangenem Termin unter „In Arbeit – Termin vorbei“ statt „Termin überschritten“, mit Liefertermin.
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HEAD={'de':'In Arbeit – Termin vorbei','uk':'У роботі – дата минула','en':'In progress – date passed'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pi.inhaber','display_name':'PI Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pi.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    env=api('GET','/api/me')['d']['user']['environment']; pid=os.getpid()
    wu=api('POST','/api/users',{'username':f'pi.ws{pid}','display_name':'PI Werkstatt','role':'workshop','environment':env,'workshop_site':'DORTMUND'})
    wctx=br.new_context(); wp=wctx.new_page(); wp.goto(B); wp.evaluate(JS,['POST','/api/invite/accept',{'token':wu['d']['invite_token'],'password':PW}])
    today=datetime.datetime.now(datetime.timezone.utc).date()
    vin=f'WDB9634031P{pid%10000:04d}01'[:17].ljust(17,'0'); VID='VIN:'+vin
    check(api('POST','/api/vehicles',{'vin':vin,'plate':'PI-TW 1','site':'Dortmund'})['s']==201,'Fahrzeug')
    cid=api('POST','/api/cases',{'vehicle_id':VID,'description':'Luftfederbalg undicht (Test)','priority':'niedrig','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})['d']['id']
    def cmd(cl,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        r=cl(JS,['POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':str(uuid.uuid4()),'expected_version':v,'payload':payload or {},**({'note':note} if note else {})}])
        check(r['s']==200,f'{action} {r["s"]} {str(r["d"])[:100] if r["s"]!=200 else ""}')
    cmd(a.evaluate,'approve_repair',{'workshop_site':'DORTMUND'},'frei'); cmd(wp.evaluate,'acknowledge')
    cmd(wp.evaluate,'set_planned_date',{'planned_date':today.isoformat()})
    cmd(wp.evaluate,'start_repair')
    cmd(wp.evaluate,'wait_parts',{'parts_expected_date':(today+datetime.timedelta(days=5)).isoformat()},'Luftfederbalg bestellt')
    # Ein Termin in der Vergangenheit lässt sich über die App nicht setzen: die Planantwort wird im Browser auf „Termin gestern“ umgeschrieben
    # (Server-Seite prüft API-Test 613).
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pi.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        # Antwort des Plans so umschreiben, dass der Termin gestern war (Darstellung der Gruppe „in Arbeit“)
        def route(r):
            resp=r.fetch(); d=resp.json()
            for day in d['days']:
                keep=[i for i in day['items'] if not (i.get('type')=='case' and i.get('id')==cid)]
                moved=[i for i in day['items'] if i.get('type')=='case' and i.get('id')==cid]
                for i in moved: i['planned_date']=(today-datetime.timedelta(days=1)).isoformat(); d.setdefault('in_work',[]).append(i)
                day['items']=keep
            d['days']=[x for x in d['days'] if x['items']]
            r.fulfill(response=resp, json=d)
        q.route('**/api/workshop/plan*', route)
        q.goto(B+'/#/plan'); q.reload(); q.wait_for_selector('#wp-inwork',timeout=15000)
        sec=q.evaluate("()=>{const h=document.querySelector('#wp-inwork');let t=h.innerText;let n=h.nextElementSibling;while(n&&n.tagName!=='H2'){t+='\\n'+n.innerText;n=n.nextElementSibling}return t}")
        check(HEAD[lang] in sec and 'PI-TW 1' in sec,f'{lang} {wd}px: Gruppe „in Arbeit“ mit Fahrzeug')
        check(q.locator(f'a.row[href="#/cases/{cid}"] .chip.kritisch').count()==0,f'{lang} {wd}px: kein roter Termin-Chip')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.locator('#wp-inwork').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/plan-inarbeit-{lang}-{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
