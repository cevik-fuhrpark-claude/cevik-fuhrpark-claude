# [CLAUDE] UI-Test (25.10.2026, Backlog 255, Folge aus 254): Mangel aus einer Abfahrtskontrolle am falschen Fahrzeug – Leitung wählt
# „Fahrzeug korrigieren“, Hinweis nennt die ganze Kontrolle; nach dem Speichern stehen beide Mängel der Kontrolle am richtigen Fahrzeug,
# der Verlauf zeigt „ganze Abfahrtskontrolle umgehängt · weitere Mängel · km-Stand übernommen“. DE/UK/EN, 390/820/1366 px.
# Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ACT={'de':'Fahrzeug korrigieren','uk':'Виправити транспорт','en':'Correct vehicle'}
INSP={'de':'Ganze Abfahrtskontrolle umgehängt','uk':'Усю передрейсову перевірку перенесено','en':'Whole departure check moved'}
KMM={'de':'übernommen','uk':'перенесено','en':'moved'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'kk.inhaber','display_name':'KK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'kk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    pid=os.getpid(); n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; print('—',lang,wd)
        va=f'WDB9634031P{pid%10000:04d}{n:02d}'[:17].ljust(17,'0'); vb=f'WDB9634031R{pid%10000:04d}{n:02d}'[:17].ljust(17,'0')
        pa=f'KK-AB {n}1'; pb=f'KK-AB {n}7'
        check(api('POST','/api/vehicles',{'vin':va,'plate':pa,'site':'Dortmund'})['s']==201 and api('POST','/api/vehicles',{'vin':vb,'plate':pb,'site':'Dortmund'})['s']==201,'Fahrzeuge')
        keys=[c['key'] for c in api('GET','/api/meta')['d']['checklist']]
        items=[{'key':k,'result':'ok'} for k in keys]; items[0]={'key':keys[0],'result':'mangel','note':'Bremse links schleift (Test)','safety_relevant':True}; items[1]={'key':keys[1],'result':'mangel','note':'Spiegel locker (Test)'}
        ins=api('POST','/api/inspections',{'kind':'abfahrt','vehicle_id':'VIN:'+va,'request_key':str(uuid.uuid4()),'items':items,'odometer_km':123400+n})
        check(ins['s']==201,'Kontrolle '+str(ins['s']))
        other,cid=[f['id'] for f in ins['d']['followups']]
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'kk.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/cases/{cid}'); q.reload(); q.wait_for_selector('[data-act=correct_vehicle]',timeout=15000)
        check(q.inner_text('[data-act=correct_vehicle]').strip()==ACT[lang],f'{lang} {wd}px: Knopf')
        q.click('[data-act=correct_vehicle]'); q.wait_for_selector(f'#cvveh option[value="VIN:{vb}"]',state='attached',timeout=15000)
        check(q.locator(f'#cvveh option[value="VIN:{va}"]').count()==0,f'{lang} {wd}px: bisheriges Fahrzeug nicht in der Auswahl')
        check(len(q.inner_text('#cvhint'))>80,f'{lang} {wd}px: Hinweis ganze Kontrolle')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: Formular ohne Querscrollen')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kontrolle-korrigieren-form-{lang}-{wd}.png')
        q.select_option('#cvveh','VIN:'+vb); q.fill('#af textarea[name=note]','Kennzeichen verwechselt'); q.click('#af button:not([type=button])')
        q.wait_for_function("(p)=>document.querySelector('main') && document.querySelector('main').innerText.includes(p) && !document.querySelector('#af')",arg=pb,timeout=15000)
        tl=q.inner_text('.timeline')
        check(pa in tl and pb in tl and ACT[lang] in tl,f'{lang} {wd}px: Verlauf alt → neu')
        ci=q.inner_text('.cvinsp') if q.locator('.cvinsp').count() else ''
        check(INSP[lang] in ci and KMM[lang] in ci,f'{lang} {wd}px: Verlauf nennt Kontrolle und km-Stand: {ci}')
        d=api('GET',f'/api/cases/{cid}')['d']
        o=api('GET',f'/api/cases/{other}')['d']
        check(d['case']['vehicle_id']=='VIN:'+vb and o['case']['vehicle_id']=='VIN:'+vb and o['case']['safety_lock'],f'{lang} {wd}px: beide Mängel am neuen Fahrzeug, Sperre wandert mit')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: ohne Querscrollen')
        if SHOTS: q.locator('.timeline').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/kontrolle-korrigieren-verlauf-{lang}-{wd}.png')
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER:' if fails else 'Alles grün', len(fails))
raise SystemExit(1 if fails else 0)
