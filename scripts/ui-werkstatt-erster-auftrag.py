# [CLAUDE] UI-Test Backlog 1025 (Blickwinkel „Werkstatt Bayern, erster Auftrag“): neue Werkstattkraft (Standort München) sieht auf der
# Startseite und im Profil ihren Standort, die leere Tafel erklärt sich; im Formular „Zur Abschlusskontrolle“ stehen vor dem Absenden die
# fehlenden Schritte (Arbeitszeit, Kontrolle nach Reparatur) – Werkstatt-Text ohne „Fremdleistung“. Synthetische Daten.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310888853'; VID='VIN:'+VIN
TXT={'de':('Ihr Standort','Zurzeit keine Aufträge','Noch keine Arbeitszeit','Fahrzeugkontrolle nach der Reparatur'),
     'uk':('Ваш підрозділ','Наразі немає замовлень','Робочий час ще не внесено','перевірку транспорту після ремонту'),
     'en':('Your site','No orders for','No working time recorded','vehicle check after repair')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ea.inhaber','display_name':'EA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own='ea.inhaber' if s['s']==200 else None
    if not own:
        for u in ['ea.inhaber','nf.inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: own=u; break
    check(own and api('POST','/api/login',{'username':own,'password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':'EA-UI 1','vin':VIN,'site':'München'})
    inv=api('POST','/api/users',{'username':'ea.werkstatt','display_name':'EA Werkstatt','role':'workshop','environment':api('GET','/api/me')['d']['user']['environment'],'workshop_site':'MUENCHEN'})
    ctxw=br.new_context(); w=ctxw.new_page(); w.goto(B); wapi=lambda m,pa,b=None: w.evaluate(JS,[m,pa,b])
    if inv['s']==201: wapi('POST','/api/invite/accept',{'token':inv['d']['invite_token'],'password':PW})
    check(wapi('POST','/api/login',{'username':'ea.werkstatt','password':PW})['s']==200,'Anmeldung Werkstatt München')
    def shoot(q,tag):
        if SHOTS: q.screenshot(path=f'{SHOTS}/ea_{tag}.png')
    # 1) leere Tafel + Profil
    for lang in ['de','uk','en']:
      wapi('PATCH','/api/me',{'language':lang})
      for W,H in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':W,'height':H}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ea.werkstatt','password':PW}]); q.goto(B+'/#/'); q.reload()
        try: q.wait_for_selector('[data-wssite]',timeout=15000); t1=q.inner_text('[data-wssite]')
        except Exception: t1=''
        check(TXT[lang][0] in t1 and 'München' in t1,f'{lang}/{W}: Standort auf der Tafel ({t1!r})')
        e1=q.inner_text('[data-wsempty]') if q.query_selector('[data-wsempty]') else ''
        check(TXT[lang][1] in e1 and 'München' in e1,f'{lang}/{W}: leere Tafel erklärt')
        shoot(q,f'leer_{lang}_{W}')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{W}: kein Querscrollen (Tafel)')
        q.goto(B+'/#/more')
        try: q.wait_for_selector('[data-mysite]',timeout=15000); t2=q.inner_text('[data-mysite]')
        except Exception: t2=''
        check(TXT[lang][0] in t2 and 'München' in t2,f'{lang}/{W}: Standort im Profil')
        check(not errs,f'{lang}/{W}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    # 2) Auftrag in Reparatur ohne Stunden/Kontrolle → Hinweise im Formular
    n=[0]
    def cmd(cl,cid,action,payload=None,note=None):
        n[0]+=1; g=cl('GET',f'/api/cases/{cid}')
        if g['s']!=200: print('GET',g); return g['s']
        v=g['d']['case']['version']
        return cl('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'ea-{n[0]}','expected_version':v,'note':note,'payload':payload or {}})['s']
    rc=api('POST','/api/cases',{'vehicle_id':VID,'description':'Erster Auftrag Bayern Spiegel','priority':'niedrig','driveability':'fahrbereit','request_key':'ea-case-1'})
    check(rc['s'] in (200,201),f'Meldung angelegt {rc}'); cid=rc['d']['id']
    st=[cmd(api,cid,'approve_repair',{'workshop_site':'MUENCHEN'},'Test')]
    st.append(cmd(wapi,cid,'start_repair'))
    check(st==[200,200],f'Auftrag vorbereitet {st}')
    for lang in ['de','uk','en']:
      wapi('PATCH','/api/me',{'language':lang})
      for W,H in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':W,'height':H}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ea.werkstatt','password':PW}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-act="request_quality_check"]',timeout=15000); q.click('[data-act="request_quality_check"]')
        ok=True
        try: q.wait_for_selector('#qcmwork',timeout=8000)
        except Exception: ok=False
        tw=q.inner_text('#qcmwork') if ok else ''
        check(ok and TXT[lang][2] in tw,f'{lang}/{W}: Hinweis Arbeitszeit')
        check(ok and ('oder eine Fremdleistung' not in tw and 'Fremdleistungen trägt' in tw if lang=='de' else True),f'{lang}/{W}: Werkstatt-Text verweist Fremdleistungen an die Leitung')
        ti=q.inner_text('#qcminsp') if q.query_selector('#qcminsp') else ''
        check(TXT[lang][3].lower() in ti.lower(),f'{lang}/{W}: Hinweis Kontrolle nach Reparatur')
        if ok: q.locator('#qcmwork').scroll_into_view_if_needed(); shoot(q,f'qc_{lang}_{W}')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{W}: kein Querscrollen (Formular)')
        check(not errs,f'{lang}/{W}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    wapi('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Werkstatt erster Auftrag: alles grün')
raise SystemExit(1 if fails else 0)
