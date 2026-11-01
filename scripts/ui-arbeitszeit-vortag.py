# [CLAUDE] UI-Test (01.11.2026, Backlog 835, Blickwinkel „Mechaniker trägt am nächsten Morgen die Stunden vom Vortag nach“):
# Formular Arbeitszeit zeigt der Werkstatt den letzten Arbeitstag ohne Eintrag (#wdprev) mit Knopf, der das Datum setzt; nach einer Buchung
# an diesem Tag verschwindet der Hinweis; Inhaber sieht ihn nicht. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vt.inhaber','display_name':'VT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'vt.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'vt-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    def open_form(q,cid):
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('button[data-act=record_work]',timeout=15000); q.click('button[data-act=record_work]')
        q.wait_for_function("() => (document.querySelector('#workday')||{}).textContent", timeout=15000); q.wait_for_timeout(600)
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        u=api('POST','/api/users',{'username':f'vt.ws{R}.{n}','display_name':f'VT Werkstatt {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(u['s'] in (200,201),f'{lang}/{w}: Werkstatt-Konto angelegt')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e))); q.on('dialog',lambda d: d.accept())  # Rückfrage „Vormonat“ bestätigen
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'vt.ws{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        pl=f'VT-L {R%900}{n}'; vin=f'WVTL{R:05d}V{n:04d}0000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'{lang}/{w}: Lkw angelegt')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel locker (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'vt-{R}-{n}'})
        check(c['s']==201,f'{lang}/{w}: Vorgang ({c["s"]})')
        if c['s']!=201: ctx.close(); continue
        cid=c['d']['id']
        check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel befestigen')==200,f'{lang}/{w}: freigegeben')
        check(cmd(q,cid,'start_repair')==200,f'{lang}/{w}: Reparatur begonnen')
        open_form(q,cid)
        vis=q.locator('#wdprev:not([hidden])').count()==1
        check(vis,f'{lang}/{w}: Hinweis letzter Arbeitstag sichtbar')
        today=q.input_value('#af input[name=work_date]')
        if vis:
            check(q.evaluate("(()=>{const b=document.querySelector('[data-wdprevgo]').getBoundingClientRect(); return b.height>=30 && b.right<=window.innerWidth+1;})()"),f'{lang}/{w}: Knopf bedienbar, im Bild')
            check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
            if SHOTS: q.locator('#wdprev').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/wdprev-{lang}-{w}.png')
            q.click('[data-wdprevgo]'); q.wait_for_timeout(300)
            pd=q.input_value('#af input[name=work_date]')
            check(pd<today,f'{lang}/{w}: Datum auf letzten Arbeitstag gesetzt ({pd} < {today})')
            check(q.locator('#wdprev[hidden]').count()==1,f'{lang}/{w}: Hinweis nach dem Umstellen ausgeblendet')
            q.fill('#af input[name=hours]','1,5' if lang=='de' else '1.5'); q.fill('#af input[name=description]','Spiegel befestigt')
            q.click('#af .actions button:not([type])'); q.wait_for_timeout(1500)
            wk=q.evaluate(JS,['GET','/api/work-day?date='+pd,None])['d']
            check(abs((wk or {}).get('hours',0)-1.5)<1e-9,f'{lang}/{w}: 1,5 h am {pd} gebucht ({(wk or {}).get("hours")})')
            open_form(q,cid)
            check(q.locator('#wdprev:not([hidden])').count()==0,f'{lang}/{w}: nach Buchung kein Hinweis mehr')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    # Inhaber sieht den Hinweis nicht
    pl=f'VT-O {R%900}'; vin=f'WVTO{R:05d}O00000000'[:17]
    api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel (Test Inhaber)','priority':'mittel','driveability':'fahrbereit','request_key':f'vt-{R}-own'})
    if c['s']==201:
        cid=c['d']['id']; cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Test'); cmd(a,cid,'start_repair')
        open_form(a,cid)
        check(a.locator('#wdprev:not([hidden])').count()==0,'Inhaber: kein Hinweis letzter Arbeitstag')
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'OK'); raise SystemExit(1 if fails else 0)
