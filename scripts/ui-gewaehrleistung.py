# [CLAUDE] UI-Test: laufende Gewährleistungen ohne stilles Kappen – Fahrzeugakte zeigt höchstens 50, die Kurzinfo im Vorgang höchstens 20
# (früheste Abläufe zuerst) und nennt dann „es laufen weitere“. 51 Fremdleistungen mit Gewährleistung (synthetisch, ohne Betrag).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VIN='WDB96340310888851'; VID='VIN:'+VIN
MORE={'de':'Es werden die {n} mit dem frühesten Ablauf angezeigt','uk':'Показано {n} із найближчим закінченням','en':'Showing the {n} expiring first'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'gw.inhaber','display_name':'GW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'gw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'plate':'GW-UI 1','vin':VIN,'site':'Dortmund'})
    ws_site=api('GET','/api/meta')['d']['workshops'][0]['code']
    c=api('POST','/api/cases',{'vehicle_id':VID,'description':'Gewährleistungstest: viele Fremdleistungen','priority':'niedrig','driveability':'fahrbereit','request_key':'gw-1'})
    cid=c['d']['id']
    def cmd(cid,action,payload=None,note=None,key=''):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':f'gw-{action}-{key}','expected_version':v,'note':note,'payload':payload or {}})
    check(cmd(cid,'approve_repair',{'workshop_site':ws_site},'Gewährleistungstest')['s']==200,'Reparatur freigegeben')
    td=datetime.date.today(); okc=0
    for i in range(51):
        r=cmd(cid,'add_external_cost',{'supplier':f'Dienst {i:02d}','warranty_until':(td+datetime.timedelta(days=30+i)).isoformat()},key=str(i))
        okc+= r['s']==200
    check(okc==51,f'51 Fremdleistungen mit Gewährleistung erfasst ({okc})')
    c2=api('POST','/api/cases',{'vehicle_id':VID,'description':'Neue Meldung am selben Fahrzeug','priority':'niedrig','driveability':'fahrbereit','request_key':'gw-2'})['d']['id']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'gw.inhaber','password':PW}])
        q.goto(B+f'/#/vehicles/{VID}'); q.wait_for_selector('[data-warrmore]',timeout=15000)
        sec=q.locator('section.panel', has=q.locator('[data-warrmore]'))
        check(sec.locator('li').count()==50,f'{lang}/{w}: Akte zeigt 50 Gewährleistungen')
        check(MORE[lang].replace('{n}','50') in q.inner_text('[data-warrmore]'),f'{lang}/{w}: Akte nennt weitere')
        if SHOTS: q.locator('[data-warrmore]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/gw_akte_{lang}_{w}.png')
        q.goto(B+f'/#/cases/{c2}'); q.wait_for_selector('dl.kv [data-warrmore]',timeout=15000)
        check(MORE[lang].replace('{n}','20') in q.inner_text('dl.kv [data-warrmore]'),f'{lang}/{w}: Vorgang nennt weitere')
        if SHOTS: q.locator('dl.kv [data-warrmore]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/gw_vorgang_{lang}_{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Gewährleistungen: alles grün')
raise SystemExit(1 if fails else 0)
