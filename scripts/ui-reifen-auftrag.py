# [CLAUDE] UI-Test Backlog 1604 (Blickwinkel „Werkstatt wechselt den platten Reifen im Auftrag und erfasst ihn in der Reifenakte“): Werkstatt
# öffnet ihren Auftrag → Link „Reifenwechsel zu diesem Auftrag erfassen ›“ → Fahrzeugakte, Reifenformular offen mit Hinweis „Erfassung zum
# Auftrag …“; Wechsel speichern → Auftrag zeigt den Radmuttern-Hinweis-Bezug (wheel_changed), Bezug bleibt für die nächste Position.
# DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler.
import os
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
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ra.inhaber','display_name':'RA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    un='ra.inhaber'
    if api('POST','/api/login',{'username':un,'password':PW})['s']!=200:
        un=None
        for x in ['vr.inhaber','ot.inhaber','vb.inhaber','or.inhaber','tf.inhaber']:
            if api('POST','/api/login',{'username':x,'password':PW})['s']==200: un=x; break
    check(un is not None,'Anmeldung')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; vin=f'WRA{R:05d}{n:04d}0000000'[:17]; VID='VIN:'+vin
        check(api('POST','/api/vehicles',{'plate':f'RA-R {R%900}{n}','vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'{lang}/{w}: Lkw')
        c=api('POST','/api/cases',{'vehicle_id':VID,'description':'Reifen platt hinten links (Test)','priority':'mittel','driveability':'eingeschraenkt','request_key':f'ra-{R}-{n}'}); cid=c['d']['id']; cno=c['d']['case_no']
        v=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'ra-{R}-{n}','expected_version':v,'note':'Reifen tauschen','payload':{'workshop_site':'DORTMUND'}})['s']==200,f'{lang}/{w}: freigegeben')
        u=api('POST','/api/users',{'username':f'ra.ws{R}.{n}','display_name':f'RA Werkstatt {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); q.evaluate(JS,['POST','/api/login',{'username':f'ra.ws{R}.{n}','password':PW}])
        T=q.evaluate("async (l) => { const m = await import('/i18n.js'); return { l: m.STRINGS[l].tf_case_link, f: m.STRINGS[l].tf_case_for.split('{no}')[0].trim() }; }", lang)
        q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('#ctires a',timeout=20000)
        check(T['l'] in q.inner_text('#ctires'),f'{lang}/{w}: Link im Auftrag')
        if SHOTS: q.locator('#ctires').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ra_auftrag_{lang}_{w}.png')
        q.click('#ctires a'); q.wait_for_selector('[data-tfcase]',state='visible',timeout=20000)
        check(T['f'] in q.inner_text('[data-tfcase]') and cno in q.inner_text('[data-tfcase]'),f'{lang}/{w}: Hinweis „Erfassung zum Auftrag {cno}“')
        check(q.evaluate("()=>document.querySelector('#tires form input[name=case_id]').value")==cid,f'{lang}/{w}: Auftragsbezug im Formular')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('[data-tfcase]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ra_form_{lang}_{w}.png')
        f=q.locator('[data-tfcase]').locator('xpath=ancestor::form')
        f.locator('select[name=position]').select_option('HA-L-aussen'); f.locator('select[name=event_type]').select_option('wechsel')
        f.locator('input[name=size]').fill('315/70 R22.5')
        f.locator('button.btn').last.click()
        q.wait_for_function(f"async () => (await (await fetch('/api/cases/{cid}')).json()).wheel_changed === true",timeout=15000)
        check(True,f'{lang}/{w}: Wechsel am Auftrag (wheel_changed)')
        q.wait_for_selector('[data-tfcase]',state='visible',timeout=15000)
        check(q.evaluate("()=>document.querySelector('#tires form input[name=case_id]').value")==cid,f'{lang}/{w}: Bezug bleibt für die nächste Position')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
