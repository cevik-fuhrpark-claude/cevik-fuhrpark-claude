# [CLAUDE] UI-Test Backlog 1587 (Backlog 195, Blickwinkel „Räder gewechselt – Radmuttern nachziehen“):
# Werkstatt erfasst am Auftrag einen Reifenwechsel (Reifenerfassung mit Auftragsbezug) bzw. nennt ihn in der Arbeitszeit →
# „Abschlusskontrolle anfordern“ zeigt den Hinweis; „In den Abholvermerk übernehmen“ hängt den Satz einmal an (Knopf danach gesperrt).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'Radmuttern müssen nach einer kurzen Fahrstrecke','uk':'Колісні гайки потрібно підтягнути','en':'wheel nuts must be re-torqued'}
TXT={'de':'Räder wurden gewechselt: Radmuttern nach Herstellervorgabe nachziehen lassen.','uk':'Колеса замінено: підтягнути колісні гайки згідно з вимогами виробника.','en':'Wheels were changed: have the wheel nuts re-torqued as specified by the manufacturer.'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rm.inhaber','display_name':'RM Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'rm.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['ab.inhaber','ws.inhaber','ls.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'rm-{action}-{R}-{n}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; pl=f'RM-R {R%900}{n}'; vin=f'WDB98{R:05d}R{n:04d}00'; viaTire = n%2==1
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Reifen vorne links Flanke beschädigt (Test Radmuttern)','priority':'mittel','driveability':'eingeschraenkt','request_key':f'rm-{R}-{n}'})
        check(c['s']==201,f'Vorgang angelegt {c["s"]}'); cid=c['d']['id']
        check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Reifen tauschen')==200,'freigegeben')
        u=api('POST','/api/users',{'username':f'rm.ws{R}.{n}','display_name':f'RM Werkstatt {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(u['s'] in (200,201),'Werkstatt-Konto angelegt')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'rm.ws{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        check(cmd(q,cid,'start_repair')==200,'Reparatur begonnen')
        if viaTire:
            check(cmd(q,cid,'record_work',{'hours':1,'description':'Arbeit Vorderachse'})==200,'Arbeitszeit ohne Radwort')
            r=q.evaluate(JS,['POST',f'/api/vehicles/VIN:{vin}/tires/events',{'event_type':'wechsel','position':'VA-L','size':'385/65 R22.5','case_id':cid,'request_key':f'rm-t-{R}-{n}'}])
            check(r['s']==201,f'Reifenwechsel mit Auftragsbezug {r["s"]}')
        else:
            check(cmd(q,cid,'record_work',{'hours':1,'description':'Reifenwechsel VA links'})==200,'Arbeitszeit „Reifenwechsel“')
        check(q.evaluate(JS,['POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':f'rm-i-{R}-{n}','items':items}])['s']==201,'Kontrolle nach Reparatur')
        q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('button[data-act="request_quality_check"]',timeout=15000)
        q.click('button[data-act="request_quality_check"]'); q.wait_for_selector('#wheelrt',timeout=5000)
        check(HINT[lang] in q.inner_text('#wheelrt'),f'{lang} {w}px: Hinweis Radmuttern ({"Reifenerfassung" if viaTire else "Arbeitstext"})')
        q.fill('#pu_note','Schlüssel im Kasten')
        q.click('#wheelrt_add')
        v=q.input_value('#pu_note')
        check(v==f'Schlüssel im Kasten. {TXT[lang]}',f'{lang} {w}px: Satz angehängt ({v[:80]})')
        check(q.is_disabled('#wheelrt_add'),f'{lang} {w}px: Knopf danach gesperrt')
        q.click('#wheelrt_add', force=True); check(q.input_value('#pu_note')==v,f'{lang} {w}px: nicht doppelt')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.locator('#wheelrt').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/radmuttern_{lang}_{w}.png')
        q.fill('#af textarea[name=note]','Reifen gewechselt (Test)')
        q.click('#af button.btn:not(.secondary)'); q.wait_for_selector('#pickup',timeout=15000)
        check(TXT[lang] in q.inner_text('#pickup'),f'{lang} {w}px: Abholvermerk gespeichert')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    # Gegenprobe: ohne Rad-/Reifenarbeit kein Hinweis
    n+=1; vin=f'WDB98{R:05d}R{n:04d}00'
    api('POST','/api/vehicles',{'plate':f'RM-R {R%900}{n}','vin':vin,'kind':'lkw','site':'Dortmund'})
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel locker (Gegenprobe Radmuttern)','priority':'mittel','driveability':'fahrbereit','request_key':f'rm-{R}-{n}'}); cid=c['d']['id']
    cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel')
    u=api('POST','/api/users',{'username':f'rm.ws{R}.{n}','display_name':'RM Werkstatt G','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':'de'})
    q=br.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); q.evaluate(JS,['POST','/api/login',{'username':f'rm.ws{R}.{n}','password':PW}])
    cmd(q,cid,'start_repair'); cmd(q,cid,'record_work',{'hours':1,'description':'Spiegel befestigt'})
    q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('button[data-act="request_quality_check"]',timeout=15000)
    q.click('button[data-act="request_quality_check"]'); q.wait_for_selector('#pu_note',timeout=5000)
    check(q.locator('#wheelrt').count()==0,'Gegenprobe: ohne Rad-/Reifenarbeit kein Hinweis')
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
