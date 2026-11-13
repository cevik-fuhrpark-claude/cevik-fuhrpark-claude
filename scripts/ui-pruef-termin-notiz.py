# [CLAUDE] UI-Test (13.11.2026, Backlog 1442, Blickwinkel „Prüfstelle vereinbart den Termin telefonisch – Uhrzeit, Ort und Absprachen gehen
# verloren“): Fahrzeugakte → „Termin planen“ mit Hinweis zum Termin; Hinweis steht danach in der Akte (Feld vorbelegt), in den Prüfterminen und im
# Werkstattplan. Werkstattkonto, DE/UK/EN 390/820/1366 px.
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
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'; me_un=(me.get('user') or me).get('username')
    R=os.getpid()%100000; n=0
    def iso(d): return (datetime.date.today()+datetime.timedelta(days=d)).isoformat()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        pl=f'TN-T {R%900}{n}'; vin=f'WTN{R:05d}{n:04d}0000000'[:17]; vid='VIN:'+vin
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        r=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'Feuerlöscher','last_done_date':iso(-30),'interval_months':24,'evidence':'Prüfplakette (Test)'})
        check(r['s']==201,f'{lang}/{w}: Feuerlöscher angelegt'); rid=r['d']['id']
        un=f'tn.ws{R}.{n}'
        u=api('POST','/api/users',{'username':un,'display_name':f'TN Werkstatt {n}','role':'workshop','environment':envn,'language':lang,'workshop_site':'DORTMUND'})
        check(u['s'] in (200,201),f'{lang}/{w}: Werkstattkonto')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        L=q.evaluate("async (l) => { const S = (await import('/i18n.js')); return { l: S.STRINGS[l].plan_note_lbl, h: S.STRINGS[l].mplan_note_hint }; }", lang)
        q.goto(B+'/#/vehicles/'+vid.replace(':','%3A')); q.reload()
        fm=q.locator(f'form[data-hsplan="{rid}"]')
        fm.wait_for(state='attached',timeout=20000)
        fm.locator('xpath=ancestor::details[1]/summary').click()
        note=f'7:00 Prüfstelle Nord {n}'
        check(fm.locator('input[name=planned_note]').count()==1 and L['l'] in fm.inner_text() and L['h'][:20] in fm.inner_text(),f'{lang}/{w}: Feld „{L["l"]}“ mit Hinweis')
        fm.locator('input[name=planned_date]').fill(iso(3)); fm.locator('input[name=planned_note]').fill(note)
        if SHOTS: fm.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pruef-termin-notiz-form-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Formular ohne Querscrollen')
        fm.locator('button').click()
        q.wait_for_selector('[data-mplannote]',timeout=15000)
        check(note in q.locator('[data-mplannote]').first.inner_text(),f'{lang}/{w}: Akte zeigt den Hinweis')
        check(any(x['id']==rid and x.get('planned_note')==note for x in api('GET','/api/maintenance')['d']['rows']),f'{lang}/{w}: gespeichert')
        fm=q.locator(f'form[data-hsplan="{rid}"]'); fm.wait_for(state='attached',timeout=10000)
        check(fm.locator('input[name=planned_note]').input_value()==note,f'{lang}/{w}: Feld vorbelegt')
        q.goto(B+'/#/plan'); q.wait_for_selector('[data-plannote]',timeout=20000)
        check(any(note in x for x in q.locator('[data-plannote]').all_inner_texts()),f'{lang}/{w}: Werkstattplan zeigt den Hinweis')
        if SHOTS:
            q.locator('[data-plannote]', has_text=note).first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pruef-termin-notiz-plan-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Plan ohne Querscrollen')
        q.goto(B+'/#/maintenance'); q.wait_for_selector('button[data-mf="all"]',timeout=20000); q.click('button[data-mf="all"]'); q.wait_for_selector('[data-mplannote]',timeout=20000)
        check(any(note in x for x in q.locator('[data-mplannote]').all_inner_texts()),f'{lang}/{w}: Prüftermine zeigen den Hinweis')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
        api('POST',f'/api/maintenance/{rid}/complete',{'done_date':iso(0),'evidence':'Prüfplakette (Test 2)'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
