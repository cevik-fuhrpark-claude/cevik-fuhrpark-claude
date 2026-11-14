# [CLAUDE] UI-Prüfung (14.11.2026, Backlog 1490, Blickwinkel „Fuhrparkleitung mit Rot-Grün-Sehschwäche“):
# Flottenbalken der Startseite (Gesperrt / In Werkstatt / Meldung offen / Keine offenen Meldungen): Gesperrt schräg schraffiert,
# Werkstatt gepunktet – in Balken und Legende gleich –, Fuge zwischen Segmenten, aria-label mit Zahlen. Hell und dunkel, DE/UK/EN,
# 390/820/1366 px, ohne Querscrollen/Skriptfehler. Screenshots (CFP_SHOTS=<Ordner>) zusätzlich mit simulierter Deuteranopie (SVG-Filter).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
PROBE = """() => { const bar = document.querySelector('.fleetbar'); if (!bar) return null;
  const sp = [...bar.querySelectorAll('span')].map((s) => { const cs = getComputedStyle(s); return [s.className, cs.backgroundImage.split('(')[0], cs.borderLeftWidth, s.getBoundingClientRect().width]; });
  const lg = [...document.querySelectorAll('.legend a[data-fbk] i')].map((i) => { const cs = getComputedStyle(i); return [i.className, cs.backgroundImage.split('(')[0], i.getBoundingClientRect().width]; });
  return { sp, lg, label: bar.getAttribute('aria-label'), ink: getComputedStyle(bar).getPropertyValue('--fb-ink').trim(), over: document.documentElement.scrollWidth > innerWidth + 1 }; }"""
DEUT = """() => { const ns = 'http://www.w3.org/2000/svg'; const s = document.createElementNS(ns, 'svg'); s.setAttribute('style', 'position:absolute;width:0;height:0');
  s.innerHTML = '<filter id="cfpdeut" color-interpolation-filters="linearRGB"><feColorMatrix type="matrix" values="0.367322 0.860646 -0.227968 0 0 0.280085 0.672501 0.047413 0 0 -0.01182 0.04294 0.968881 0 0 0 0 0 1 0"/></filter>';
  document.body.appendChild(s); document.documentElement.style.filter = 'url(#cfpdeut)'; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fs.inhaber','display_name':'FS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fs.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'; un=(me.get('user') or me).get('username')
    sfx=str(uuid.uuid4().int)[:5]; V={}
    for i,k in enumerate(['SP','WS','MO','OK']):
        vin=f'WDB9634031{sfx}{i:02d}'; r=api('POST','/api/vehicles',{'vin':vin,'plate':f'FS-{k} {sfx[:4]}','site':'Dortmund'}); V[k]='VIN:'+vin
        check(r['s'] in (200,201),f'Fahrzeug {k} angelegt ({r["s"]})')
    def case(v,prio,drive,site=None):
        b={'vehicle_id':V[v],'description':'Test Farbsehschwäche '+v,'priority':prio,'driveability':drive,'request_key':str(uuid.uuid4())}
        if site: b['workshop_site']=site
        r=api('POST','/api/cases',b); return r['d']['cases'][0]['id'] if r['d'] and 'cases' in r['d'] else (r['d'] or {}).get('id')
    check(case('SP','kritisch','nicht_fahrbereit') is not None,'gesperrter Vorgang')
    cid=case('WS','niedrig','fahrbereit','DORTMUND')
    ver=api('GET',f'/api/cases/{cid}')['d']['case']['version']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':str(uuid.uuid4()),'expected_version':ver,'payload':{'workshop_site':'DORTMUND'},'note':'frei'})['s']==200,'Werkstatt freigegeben')
    check(case('MO','niedrig','fahrbereit') is not None,'offene Meldung')
    for scheme in ['light','dark']:
      for lang in ['de','uk','en']:
        for wd,h in [(390,844),(820,1180),(1366,900)]:
            ctx=br.new_context(viewport={'width':wd,'height':h},color_scheme=scheme); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
            q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fs.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
            q.goto(B+'/#/'); q.reload(); q.wait_for_selector('.fleetbar',timeout=15000); q.wait_for_timeout(500)
            r=q.evaluate(PROBE); tag=f'{scheme} {lang} {wd}px'
            cls=[x[0] for x in r['sp']]
            check(all(c.startswith('fb-') for c in cls) and 'fb-gesperrt' in cls and 'fb-werkstatt' in cls,f'{tag}: Segmente mit Zustandsklasse {cls}')
            for c,img,_,w in r['sp']:
                want={'fb-gesperrt':'repeating-linear-gradient','fb-werkstatt':'radial-gradient'}.get(c,'none')
                check(img==want and w>0,f'{tag}: {c} Muster {img} (Breite {w:.0f})')
            check(all(x[2]=='2px' for x in r['sp'][1:]) and r['sp'][0][2]=='0px',f'{tag}: Fuge zwischen Segmenten {[x[2] for x in r["sp"]]}')
            for c,img,w in r['lg']:
                want={'fb-gesperrt':'repeating-linear-gradient','fb-werkstatt':'radial-gradient'}.get(c,'none')
                check(img==want and w>=14,f'{tag}: Legende {c} wie Balken ({img}, {w:.0f}px)')
            check(len(r['lg'])==4,f'{tag}: vier Legendeneinträge')
            nums=[int(x.rsplit(' ',1)[1]) for x in r['label'].split(': ',1)[1].split(', ')]
            check(len(nums)==4 and all(n>=1 for n in nums[:3]),f'{tag}: aria-label mit Zahlen „{r["label"]}“')
            check(('0, 0, 0' in r['ink'])==(scheme=='dark'),f'{tag}: Musterfarbe passend zum Farbschema ({r["ink"]})')
            check(not r['over'],f'{tag}: ohne Querscrollen')
            check(not errs,f'{tag}: keine Skriptfehler {errs}')
            if SHOTS:
                el=q.locator('.fleetbar').locator('xpath=..'); el.screenshot(path=f'{SHOTS}/flotte_{scheme}_{lang}_{wd}.png')
                if lang=='de': q.evaluate(DEUT); q.wait_for_timeout(100); el.screenshot(path=f'{SHOTS}/flotte_deut_{scheme}_{wd}.png')
            ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
