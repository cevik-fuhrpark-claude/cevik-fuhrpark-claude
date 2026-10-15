# [CLAUDE] UI-Test: Benutzer → „Bearbeiten“ (Name, Rolle, Werkstatt, Umgebung). Inhaber ändert Rolle Fahrer → Werkstatt (Bestätigung, Standortfeld erscheint),
# Zeile zeigt die neue Rolle; Fuhrparkleitung sieht „Bearbeiten“ nur bei Fahrer/Werkstatt/Leser der eigenen Umgebung. DE/UK/EN bei 390/820/1366 px.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
WS={'de':'Werkstatt','uk':'Майстерня','en':'Workshop'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ub.inhaber','display_name':'UB Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ub.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    r=api('POST','/api/users',{'username':'ub.leitung','display_name':'UB Leitung','role':'fleet','environment':'production'})
    api('POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW}); fid=r['d']['id']
    api('POST','/api/login',{'username':'ub.inhaber','password':PW})
    n=0
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; un=f'ub.fahrer{n}'
        r=api('POST','/api/users',{'username':un,'display_name':f'UB Fahrer {n}','role':'driver','environment':'production'}); uid=r['d']['id']
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept())
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ub.inhaber','password':PW}])
        q.goto(B+'/#/users'); q.wait_for_selector(f'[data-ue="{uid}"]')
        q.click(f'[data-ue="{uid}"]'); q.wait_for_selector('#uef')
        check(q.locator('#uewsrow').is_hidden(),f'{lang} {w}px: Werkstattfeld zunächst verborgen')
        q.select_option('#uer','workshop'); check(q.locator('#uewsrow').is_visible(),f'{lang} {w}px: Werkstattfeld bei Rolle Werkstatt')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen (Formular)')
        if SHOTS: q.screenshot(path=f'{SHOTS}/benutzer_bearbeiten_{lang}_{w}.png')
        q.click('#uef button:not([type])'); q.wait_for_function(f'()=>!document.querySelector("#uef") && document.querySelector(\'[data-ue="{uid}"]\')')
        row=q.locator('tr',has=q.locator(f'[data-ue="{uid}"]')).inner_text()
        check(WS[lang] in row,f'{lang} {w}px: Zeile zeigt neue Rolle')
        got=api('GET',f'/api/admin/audit?user={uid}&action=user.')['d']['entries'][0]['detail']
        check(got.get('changed',{}).get('role')=={'from':'driver','to':'workshop'},f'{lang} {w}px: Protokoll alt → neu')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    # Deaktivieren fragt nach: Abbrechen lässt das Konto aktiv, Bestätigen deaktiviert (Text nennt die Person)
    c=br.new_context(viewport={'width':390,'height':844}); q=c.new_page(); msgs=[]; mode={'ok':False}
    def dlg(d): msgs.append(d.message); (d.accept() if mode['ok'] else d.dismiss())
    q.on('dialog',dlg)
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ub.inhaber','password':PW}])
    q.goto(B+'/#/users'); q.wait_for_selector(f'[data-act="{fid}"]')
    q.click(f'[data-act="{fid}"]'); q.wait_for_timeout(500)
    check(len(msgs)==1 and 'UB Leitung' in msgs[0],'Rückfrage nennt Person')
    check(q.locator(f'[data-act="{fid}"][data-on="0"]').count()==1,'Abbrechen: bleibt aktiv')
    mode['ok']=True; q.click(f'[data-act="{fid}"]'); q.wait_for_selector(f'[data-act="{fid}"][data-on="1"]')
    check(True,'Bestätigen: deaktiviert')
    q.click(f'[data-act="{fid}"]'); q.wait_for_selector(f'[data-act="{fid}"][data-on="0"]')
    check(len(msgs)==2,'Aktivieren ohne Rückfrage')
    c.close()
    # Fahrzeugakte: Fahrerzuordnung „Beenden“ fragt nach (Name + Kennzeichen); Abbrechen lässt sie bestehen
    api('POST','/api/vehicles',{'vin':'WDB96340310777123','plate':'UB-ZU 1','site':'Dortmund'}); VID='VIN:WDB96340310777123'
    dr=api('POST','/api/users',{'username':'ub.zfahrer','display_name':'UB Zuordnung','role':'driver','environment':'production'})['d']['id']
    check(api('POST',f'/api/vehicles/{VID}/drivers',{'user_id':dr})['s']==201,'Zuordnung angelegt')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      c=br.new_context(viewport={'width':390,'height':844}); q=c.new_page(); msgs=[]; mode={'ok':lang=='en'}; errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
      q.on('dialog',lambda d: (msgs.append(d.message), d.accept() if mode['ok'] else d.dismiss()))
      q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ub.inhaber','password':PW}])
      q.goto(B+'/#/vehicles/'+VID); q.wait_for_selector('[data-end]'); q.click('[data-end]'); q.wait_for_timeout(600)
      check(len(msgs)==1 and 'UB Zuordnung' in msgs[0] and 'UB-ZU 1' in msgs[0],f'{lang}: Rückfrage nennt Person und Kennzeichen')
      check((q.locator('[data-end]').count()==1)!=mode['ok'],f'{lang}: {"beendet" if mode["ok"] else "Abbrechen lässt Zuordnung bestehen"}')
      check(not errs,f'{lang}: keine Skriptfehler {errs}')
      c.close()
    # Neuer Einladungslink: Konto mit Passwort → Rückfrage mit Name (Abbrechen erzeugt keinen Link); offene Einladung → ohne Rückfrage
    ul=api('GET','/api/users')['d']['users']; lid=[u for u in ul if u['username']=='ub.leitung'][0]['id']; lname=[u for u in ul if u['username']=='ub.leitung'][0]['display_name']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      c=br.new_context(viewport={'width':390,'height':844}); q=c.new_page(); msgs=[]; errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
      q.on('dialog',lambda d: (msgs.append(d.message), d.dismiss()))
      q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ub.inhaber','password':PW}])
      q.goto(B+'/#/users'); q.wait_for_selector(f'[data-inv="{lid}"]'); q.click(f'[data-inv="{lid}"]'); q.wait_for_timeout(500)
      check(len(msgs)==1 and lname in msgs[0] and q.locator('#il').count()==0,f'{lang}: neuer Link bei Konto mit Passwort fragt nach (Abbrechen: kein Link)')
      q.click(f'[data-inv="{dr}"]'); q.wait_for_selector('#il')
      check(len(msgs)==1,f'{lang}: offene Einladung ohne Rückfrage, Link angezeigt')
      check(not errs,f'{lang}: keine Skriptfehler {errs}')
      c.close()
    api('PATCH','/api/me',{'language':'de'})
    # Fuhrparkleitung: kein „Bearbeiten“ beim Inhaber/bei sich, aber bei Werkstatt im Betrieb
    c=br.new_context(viewport={'width':390,'height':844}); q=c.new_page()
    q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ub.leitung','password':PW}])
    q.goto(B+'/#/users'); q.wait_for_selector('[data-ue]')
    me=api('GET','/api/me')['d']; oid=(me.get('user') or me)['id']
    check(q.locator(f'[data-ue="{oid}"]').count()==0 and q.locator(f'[data-ue="{fid}"]').count()==0,'Leitung: kein Bearbeiten bei Inhaber/eigenem Konto')
    check(q.locator('[data-ue]').count()==10,'Leitung: Bearbeiten bei den 9 Werkstattkonten und dem Fahrer')
    c.close(); br.close()
if fails: print(f'{len(fails)} Fehler'); raise SystemExit(1)
print('Benutzer bearbeiten: alles grün')
