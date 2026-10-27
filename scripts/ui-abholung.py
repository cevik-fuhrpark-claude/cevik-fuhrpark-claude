# [CLAUDE] UI-Test (27.10.2026, Backlog 425, Blickwinkel „Fahrzeug kommt aus der Werkstatt zurück, Fahrer findet den Schlüssel nicht“):
# Werkstatt trägt bei „Bereit zur Abschlusskontrolle“ den Abholvermerk ein → Leitung sieht ihn vorbelegt im Formular „Technisch freigeben“,
# setzt „auch den Fahrern anzeigen“ (Feld „gültig bis“ erscheint erst dann) → Vorgang zeigt „Abholung nach der Reparatur“, Verlauf den
# Fahrerhinweis, Fahrzeugakte die Tafel #vpickup. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Abholung nach der Reparatur','uk':'Отримання після ремонту','en':'Pick-up after repair'}
NOTE='Schlüssel im Schlüsselkasten Halle 2, Fach 7 – Lkw auf Platz 4'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ab.inhaber','display_name':'AB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'ab.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    items=[{'key':i['key'],'result':'ok'} for i in api('GET','/api/meta')['d']['checklist']]
    R=os.getpid()%100000; n=0
    def cmd(page,cid,action,payload=None,note=None,tag=''):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'ab-{action}-{R}-{n}{tag}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; pl=f'AB-H {R%900}{n}'; vin=f'WDB97{R:05d}H{n:04d}00'
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel locker (Test Abholung)','priority':'mittel','driveability':'fahrbereit','request_key':f'ab-{R}-{n}'})
        check(c['s']==201,f'Vorgang angelegt {c["s"]}'); cid=c['d']['id']
        check(cmd(a,cid,'approve_repair',{'workshop_site':'DORTMUND'},'Spiegel befestigen')==200,'freigegeben')
        u=api('POST','/api/users',{'username':f'ab.ws{R}.{n}','display_name':f'AB Werkstatt {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(u['s'] in (200,201),'Werkstatt-Konto angelegt')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'ab.ws{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        check(cmd(q,cid,'start_repair')==200 and cmd(q,cid,'record_work',{'hours':1,'description':'Spiegel'})==200,'Reparatur + Arbeitszeit')
        check(q.evaluate(JS,['POST','/api/inspections',{'kind':'nach_reparatur','case_id':cid,'request_key':f'ab-i-{R}-{n}','items':items}])['s']==201,'Kontrolle nach Reparatur')
        q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('button[data-act="request_quality_check"]',timeout=15000)
        q.click('button[data-act="request_quality_check"]'); q.wait_for_selector('#pu_note',timeout=5000)
        check(TITLE[lang] in q.inner_text('#af') and q.locator('#pu_drv').count()==0,f'{lang} {w}px: Werkstatt sieht Abholfeld (ohne Fahreroption)')
        q.fill('#pu_note',NOTE); q.fill('#af textarea[name=note]','Spiegel befestigt')
        check(q.evaluate(noscroll),f'{lang} {w}px: Formular Werkstatt ohne Querscrollen')
        if SHOTS: q.locator('#pu_note').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/abholung_ws_{lang}_{w}.png')
        q.click('#af button.btn:not(.secondary)'); q.wait_for_selector('#pickup',timeout=15000)
        check(NOTE in q.inner_text('#pickup'),f'{lang} {w}px: Vorgang zeigt Abholvermerk (Werkstatt)')
        check(not errs,f'{lang} {w}px: Werkstatt ohne Skriptfehler {errs[:1]}')
        ctx.close()
        # Leitung: Freigabe-Formular vorbelegt, Fahrerhinweis mit „gültig bis“
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/cases/'+cid); m.reload(); m.wait_for_selector('button[data-act="technical_release"]',timeout=15000)
        m.click('button[data-act="technical_release"]'); m.wait_for_selector('#pu_note',timeout=5000)
        check(m.input_value('#pu_note')==NOTE,f'{lang} {w}px: Freigabe-Formular übernimmt den Vermerk der Werkstatt')
        check(m.locator('#pu_until_box').is_hidden(),f'{lang} {w}px: „gültig bis“ erst nach Auswahl')
        m.check('#pu_drv'); check(m.locator('#pu_until_box').is_visible(),f'{lang} {w}px: „gültig bis“ sichtbar')
        m.check('#af input[name=confirm]'); m.fill('#af textarea[name=note]','Kontrolle in Ordnung')
        check(m.evaluate(noscroll),f'{lang} {w}px: Freigabe-Formular ohne Querscrollen')
        if SHOTS: m.locator('#pu_drv').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/abholung_freigabe_{lang}_{w}.png')
        m.click('#af button.btn:not(.secondary)'); m.wait_for_selector('[data-puev]',timeout=15000)
        check(NOTE in m.inner_text('#pickup') and m.locator('[data-puev]').count()==1,f'{lang} {w}px: Vorgang + Verlauf nach Freigabe')
        st=m.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['status']; check(st=='fahrzeug_freigegeben',f'{lang} {w}px: freigegeben ({st})')
        m.goto(B+'/#/vehicles/'+'VIN%3A'+vin); m.wait_for_selector('#vpickup',timeout=15000)
        check(NOTE in m.inner_text('#vpickup') and TITLE[lang] in m.inner_text('#vpickup'),f'{lang} {w}px: Fahrzeugakte zeigt Abholung')
        check(m.evaluate(noscroll),f'{lang} {w}px: Fahrzeugakte ohne Querscrollen')
        if SHOTS: m.locator('#vpickup').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/abholung_akte_{lang}_{w}.png')
        notes=m.evaluate(JS,['GET','/api/vehicles/VIN%3A'+vin+'/notes',None])['d']['notes']
        check(any(NOTE in x['text'] and x['for_driver'] for x in notes),f'{lang} {w}px: Hinweis für Fahrer angelegt')
        check(not errs,f'{lang} {w}px: Leitung ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('\nErgebnis:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
