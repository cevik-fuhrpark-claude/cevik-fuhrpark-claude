# [CLAUDE] UI-Test Backlog 1584 (Backlog 195, Blickwinkel „Leitung scheidet aus – ihr Vermerk „fährt bis zur Teilelieferung“ gilt weiter“):
# Werkstatt meldet „wartet auf Teile“, ein Leitungskonto vermerkt „Fahrzeug darf bis zur Teilelieferung fahren“; der Inhaber deaktiviert das
# Leitungskonto in der Benutzerverwaltung → Hinweis nennt die Auftragsnummer; danach wieder aktiviert (nächster Durchlauf).
# DE/UK/EN bei 390/820/1366 px. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
PDR={'de':'„Fahrzeug darf bis zur Teilelieferung fahren“ vermerkt hat: 1','uk':'«Транспорт може їздити до постачання запчастин»: 1','en':'“Vehicle may drive until the parts arrive”: 1'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'lp.inhaber','display_name':'LP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'lp.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment','production'); pid=os.getpid()
    vin=f'WDB96{pid%100000:05d}W158300'; plate=f'LP-AB {pid%10000}'
    check(api('POST','/api/vehicles',{'vin':vin,'plate':plate,'site':'Dortmund','kind':'lkw'})['s'] in (201,409),'Fahrzeug')
    veh=[v for v in api('GET','/api/vehicles')['d']['vehicles'] if v['id']=='VIN:'+vin][0]
    c=api('POST','/api/cases',{'vehicle_id':veh['id'],'description':'Bremse hinten links schleift (Test Leitung Teile)','priority':'mittel','driveability':'eingeschraenkt','request_key':f'lp-{pid}'})
    check(c['s']==201,f'Vorgang {c["s"]}'); cid=c['d']['id']
    def cmd(page,action,payload=None,note=None):
        v=page.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        b={'action':action,'command_id':f'lp-{action}-{pid}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return page.evaluate(JS,['POST',f'/api/cases/{cid}/commands',b])['s']
    check(cmd(a,'approve_repair',{'workshop_site':'DORTMUND'},'Bremse prüfen')==200,'freigegeben')
    u=api('POST','/api/users',{'username':f'lp.ws{pid}','display_name':'LP Mechaniker','role':'workshop','workshop_site':'DORTMUND','environment':envn})
    check(u['s'] in (200,201),'Werkstattkonto '+str(u['s']))
    wc=br.new_context(); wp=wc.new_page(); wp.goto(B); wp.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
    wp.evaluate(JS,['POST','/api/login',{'username':f'lp.ws{pid}','password':PW}])
    check(cmd(wp,'start_repair')==200,'Reparatur begonnen')
    import datetime; eta=(datetime.date.today()+datetime.timedelta(days=6)).isoformat()
    check(cmd(wp,'wait_parts',{'parts_expected_date':eta},'Luftbalg bestellt (Test)')==200,'wartet auf Teile')
    wc.close()
    f=api('POST','/api/users',{'username':f'lp.fl{pid}','display_name':'LP Leitung','role':'fleet','environment':envn})
    check(f['s'] in (200,201),'Leitungskonto '+str(f['s'])); UID=f['d']['id']
    fc=br.new_context(); fp=fc.new_page(); fp.goto(B); fp.evaluate(JS,['POST','/api/invite/accept',{'token':f['d']['invite_token'],'password':PW}])
    fp.evaluate(JS,['POST','/api/login',{'username':f'lp.fl{pid}','password':PW}])
    check(cmd(fp,'set_parts_drive',{'on':'1'},'nur Nahverkehr (Test)')==200,'Vermerk fährt bis zur Teilelieferung')
    fc.close()
    no=api('GET',f'/api/cases/{cid}')['d']['case']['case_no']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.on('dialog',lambda d: d.accept())
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'lp.inhaber','password':PW}])
        q.goto(B+'/#/users'); q.wait_for_selector(f'[data-act="{UID}"]',state='attached',timeout=15000)
        q.evaluate(f"()=>{{ const b = document.querySelector('[data-act=\"{UID}\"]'); for (let d = b.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; b.scrollIntoView(); }}")
        q.click(f'[data-act="{UID}"]'); q.wait_for_selector('.toast',timeout=15000); tx=q.inner_text('.toast')
        check(PDR[lang] in tx and no in tx,f'{lang} {w}px: Vermerk mit Auftragsnummer ({tx[:160]})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/lp_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        check(api('PATCH',f'/api/users/{UID}',{'active':True})['s']==200,f'{lang} {w}px: wieder aktiv')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
