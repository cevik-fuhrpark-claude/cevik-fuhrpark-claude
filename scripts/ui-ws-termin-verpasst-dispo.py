# [CLAUDE] UI-Test (13.11.2026, Backlog 1431, Blickwinkel „Disposition plant einen Lkw ein, dessen Werkstatttermin gestern verstrichen ist“):
# Terminplan der Dispo-Tafel zeigt den verstrichenen Termin eines nicht begonnenen Auftrags zuerst (rot, Datum) mit Hinweis. DE/UK/EN 390/820/1366 px.
import os, datetime
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tu.inhaber','display_name':'TU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tu.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def cmd(cid,action,payload=None,note=None):
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'dv-{action}-{R}-{n}-{cid[-6:]}-{v}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        r=api('POST',f'/api/cases/{cid}/commands',b)
        if r['s']!=200: print('   ',action,r)
        return r['s']
    def iso(d): return (datetime.date.today()+datetime.timedelta(days=d)).isoformat()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        pl=f'DV-W {R%900}{n}'; vin=f'WDV{R:05d}{n:04d}0000000'[:17]
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        cid=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Kupplung rutscht (Test)','priority':'mittel','driveability':'fahrbereit','request_key':f'dv-{R}-{n}'})['d']['id']
        check(cmd(cid,'approve_repair',{'workshop_site':'DORTMUND'},'Kupplung prüfen')==200 and cmd(cid,'acknowledge')==200,'freigegeben + übernommen')
        check(cmd(cid,'set_planned_date',{'planned_date':iso(-1),'planned_note':'Abgabe 7 Uhr'})==200,'Termin gestern')
        un=f'dv.di{R}.{n}'
        u=api('POST','/api/users',{'username':un,'display_name':f'DV Dispo {n}','role':'dispatch','environment':envn,'language':lang})
        check(u['s'] in (200,201),f'{lang}/{w}: Dispokonto')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        T=q.evaluate("async (l) => { const S = (await import('/i18n.js')); return { chip: S.STRINGS[l].drv_ws_missed, one: S.PLURALS[l].dispo_ws_missed_n.one }; }", lang)
        q.goto(B+'/#/'); q.reload()
        q.wait_for_selector(f'a[data-dwsmissed][href="#/cases/{cid}"]',timeout=20000)
        r=q.locator(f'a[data-dwsmissed][href="#/cases/{cid}"]'); tx=r.inner_text()
        d=iso(-1); dd=f'{d[8:10]}.{d[5:7]}.'
        check(T['chip'] in tx and (dd in tx or f'{d[8:10]}/{d[5:7]}/' in tx),f'{lang}/{w}: „⚠ {T["chip"]} {dd}“')
        check(r.locator('.chip.kritisch').count()==1,f'{lang}/{w}: rote Markierung')
        check(q.locator('[data-dwsmissedhint]').count()==1 and T['one'].split('{n}')[1][:25] in q.locator('[data-dwsmissedhint]').inner_text(),f'{lang}/{w}: Hinweis über der Liste')
        first=q.evaluate("() => { const h=document.querySelector('[data-dwsmissedhint]'); const l=h && h.nextElementSibling; const a=l && l.querySelector('a'); return a && a.hasAttribute('data-dwsmissed'); }")
        check(first,f'{lang}/{w}: verstrichene Termine zuerst')
        if SHOTS: q.locator('[data-dwsmissedhint]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ws-verpasst-dispo-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
        cmd(cid,'set_planned_date',{'planned_date':''})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
