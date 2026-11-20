# [CLAUDE] UI-Test (20.11.2026, Backlog 1625, Blickwinkel „Leitung macht beim Versicherer der Gegenseite den Nutzungsausfall geltend“):
# Der Versicherungsfall im Vorgang zeigt „Ausfall laut Vorgang“ (Kalendertage, Stunden, Zeitraum bzw. „noch nicht freigegeben“) mit Erläuterung,
# Meldung „nicht fahrbereit“ sperrt ab der Meldung – der Ausfall beginnt deshalb mit der Meldung, nicht erst mit der Werkstatt-Übernahme.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (CFP_URL, Standard Port 8787).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
WORDS={'de':['Ausfall laut Vorgang','noch nicht freigegeben','nicht fahrbereit'],'uk':['Простій згідно зі зверненням','ще не допущено','непридатне до руху'],'en':['Downtime per case','not yet released','not drivable']}
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'na.inhaber','display_name':'NA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    owner=None
    for un in ['na.inhaber','rt.inhaber','gt.inhaber','tfa.inhaber','ba.inhaber','ww.inhaber','tl.inhaber','we.inhaber','tf.inhaber','tv.inhaber','sr.inhaber','th.inhaber','tk.inhaber','as.inhaber','pv.inhaber']:
        if api('POST','/api/login',{'username':un,'password':PW})['s']==200: owner=un; break
    check(owner is not None,'Anmeldung Inhaber')
    site=api('GET','/api/meta')['d']['workshops'][0]['code']
    api('POST','/api/vehicles',{'plate':'NA-US 1625','vin':'WDB96340310716251','site':'Dortmund'})
    tag=str(os.getpid()); n=[0]
    def cmd(cid,action,payload=None,note=None):
        n[0]+=1; v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        b={'action':action,'command_id':f'na-{tag}-{n[0]}','expected_version':v,'payload':payload or {}}
        if note: b['note']=note
        return api('POST',f'/api/cases/{cid}/commands',b)
    r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310716251','description':'Auffahrunfall an der Ampel, Heck eingedrückt','priority':'mittel','driveability':'nicht_fahrbereit','workshop_site':site,'request_key':f'na-{tag}-a'})
    check(r['s'] in (200,201),f'Meldung „nicht fahrbereit“ ({r["s"]} {str(r["d"])[:120]})')
    A=r['d']['id']
    check(cmd(A,'approve_repair',{'workshop_site':site},'freigegeben')['s']==200 and cmd(A,'start_repair')['s']==200,'in Reparatur (Übernahme)')
    c=api('PUT',f'/api/cases/{A}/claim',{'insurer':'Gegner Versicherung AG','reported_on':api('GET','/api/health')['d'].get('today') or None,'evidence':'Schreiben der Gegenseite','opponent_plate':'M-AB 123','opponent_insurer':'Gegner Versicherung AG'})
    if c['s']!=200:
        import datetime; c=api('PUT',f'/api/cases/{A}/claim',{'insurer':'Gegner Versicherung AG','reported_on':datetime.date.today().isoformat(),'evidence':'Schreiben der Gegenseite','opponent_plate':'M-AB 123','opponent_insurer':'Gegner Versicherung AG'})
    check(c['s']==200,f'Versicherungsfall mit Unfallgegner ({c["s"]})')
    dt=api('GET',f'/api/cases/{A}')['d']['claim'].get('downtime')
    check(bool(dt) and dt['open'] and dt['days']>=1 and dt['to'] is None,f'API: Ausfall {dt!r}')
    ca=api('GET',f'/api/cases/{A}')['d']['case']['created_at']
    check(bool(dt) and dt['from'][:19]==ca[:19],f'API: Ausfall ab Meldung „nicht fahrbereit“ ({dt and dt["from"]} / {ca})')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':owner,'password':PW}])
        q.goto(B+'/#/cases/'+A)
        try: q.wait_for_selector('[data-cdt]', timeout=15000)
        except Exception: pass
        tx=q.inner_text('[data-cdt]') if q.locator('[data-cdt]').count() else ''
        check(WORDS[lang][0] in tx and WORDS[lang][1] in tx and ' h' in tx,f'{lang} {w}px: Ausfall laut Vorgang ({tx[:90]!r})')
        check(q.locator('[data-cdthint]').count()==1,f'{lang} {w}px: Erläuterung')
        sw=q.evaluate('document.documentElement.scrollWidth'); check(sw<=w+1,f'{lang} {w}px: kein Querscrollen ({sw})')
        if SHOTS and (lang=='de' or w==390): q.locator('[data-cdt]').evaluate('e => e.closest("section").scrollIntoView()'); q.wait_for_timeout(150); q.screenshot(path=f'{SHOTS}/nutzungsausfall_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK'); raise SystemExit(1 if fails else 0)
