# [CLAUDE] UI-Test: Vorgang → Restarbeiten zeigt den Status als Bezeichnung in der Oberflächensprache
# („offen“/„відкрито“/„open“, „erledigt“/„виконано“/„done“) statt des internen Codes (vorher in UK/EN deutsch „offen“/„erledigt“).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LBL={'de':('offen','erledigt'),'uk':('відкрито','виконано'),'en':('open','done')}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ra.inhaber','display_name':'RA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ra.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    ws=api('GET','/api/meta')['d']['workshops'][0]['code']
    api('POST','/api/vehicles',{'vin':'WDB96340310777001','plate':'RA-UI 1','site':'Dortmund'})
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310777001','description':'UI-Test: Restarbeiten','priority':'niedrig','driveability':'fahrbereit','request_key':'ra-ui-1'})
    check(r['s'] in (200,201),f'Vorgang angelegt ({r["s"]})'); cid=r['d']['id']
    def cmd(action,payload={},note=None):
        c=api('GET',f'/api/cases/{cid}')['d']['case']
        return api('POST',f'/api/cases/{cid}/commands',{'action':action,'command_id':os.urandom(8).hex(),'expected_version':c['version'],'payload':payload,'note':note})
    check(cmd('approve_repair',{'workshop_site':ws},'Restarbeiten-Test')['s']==200,'zur Reparatur freigegeben')
    check(cmd('add_open_item',{'description':'Probe offen','safety_relevant':False})['s']==200,'Restarbeit 1')
    check(cmd('add_open_item',{'description':'Probe erledigt','safety_relevant':False})['s']==200,'Restarbeit 2')
    oi=[o for o in api('GET',f'/api/cases/{cid}')['d']['open_items'] if o['description']=='Probe erledigt'][0]
    check(cmd('resolve_open_item',{'open_item_id':oi['id']},'erledigt (Test)')['s']==200,'Restarbeit 2 erledigt')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ra.inhaber','password':PW}])
        q.goto(B+f'/#/cases/{cid}'); q.wait_for_selector('text=Probe offen',timeout=10000)
        rows={}
        for d in ['Probe offen','Probe erledigt']:
            rows[d]=q.locator('.row',has_text=d).first.locator('.chip').first.inner_text().strip()
        o,e=LBL[lang]
        check(rows['Probe offen']==o and rows['Probe erledigt']==e,f'{lang} {w}px: Status {rows}')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.locator('text=Probe offen').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/restarbeiten_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('alles grün' if not fails else f'FEHLER: {len(fails)}')
raise SystemExit(1 if fails else 0)
