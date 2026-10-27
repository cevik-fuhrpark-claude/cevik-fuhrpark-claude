# [CLAUDE] UI-Test (27.10.2026, Backlog 423, Blickwinkel „Werkstatt bekommt den Lkw ohne Schlüssel/Fahrzeugschein“): Werkstatt öffnet den
# Auftrag, wählt „Schlüssel / Fahrzeugschein“, trägt „Schlüssel fehlt“ ein → Vorgang zeigt es, Vorgangsliste („hotag“) und Werkstattplan
# (data-hotag) markieren es; Leitung sieht es im Vorgang und im Verlauf. DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
# Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MISS={'de':'Schlüssel fehlt','uk':'Ключа немає','en':'Key missing'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ws.inhaber','display_name':'WS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'ws.inhaber','password':PW})['s']!=200:
        check(api('POST','/api/login',{'username':'ft.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; pl=f'WS-K {R%900}{n}'; vin=f'WDB97{R:05d}K{n:04d}00'
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
        c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Bremse quietscht (Test Schlüssel)','priority':'mittel','driveability':'fahrbereit','request_key':f'ws-k-{R}-{n}'})
        check(c['s']==201,f'Vorgang angelegt {c["s"]}'); cid=c['d']['id']
        ver=api('GET',f'/api/cases/{cid}')['d']['case']['version']
        check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':f'ws-k-a-{R}-{n}','expected_version':ver,'note':'Bremse prüfen','payload':{'workshop_site':'DORTMUND'}})['s']==200,'freigegeben')
        u=api('POST','/api/users',{'username':f'ws.schl{R}.{n}','display_name':f'WS Schlüssel {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(u['s'] in (200,201),'Werkstatt-Konto angelegt')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'ws.schl{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/cases/'+cid); q.reload(); q.wait_for_selector('button[data-act="set_handover"]',timeout=15000)
        q.click('button[data-act="set_handover"]'); q.wait_for_selector('#ho_keys',timeout=5000)
        q.select_option('#ho_keys','fehlt'); q.select_option('#ho_papers','da'); q.fill('#af textarea[name=note]','Schlüssel beim Fahrer?')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Formular ohne Querscrollen')
        if SHOTS: q.locator('#af').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/schluessel_form_{lang}_{w}.png')
        q.click('#af button.btn:not(.secondary)'); q.wait_for_selector('#handover',timeout=15000); q.wait_for_timeout(300)
        tx=q.inner_text('#handover')
        check(q.locator('#handover .chip').count()==1,f'{lang} {w}px: Vorgang zeigt „fehlt“ ({tx[:60]!r})')
        if SHOTS: q.locator('#handover').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/schluessel_vorgang_{lang}_{w}.png')
        # Backlog 424: Reparatur begonnen → „Bereit zur Abschlusskontrolle“ warnt (Schlüssel fehlt noch)
        vv=q.evaluate(JS,['GET',f'/api/cases/{cid}',None])['d']['case']['version']
        check(q.evaluate(JS,['POST',f'/api/cases/{cid}/commands',{'action':'start_repair','command_id':f'ws-k-s-{R}-{n}','expected_version':vv,'payload':{}}])['s']==200,'Reparatur begonnen')
        q.reload(); q.wait_for_selector('button[data-act="request_quality_check"]',timeout=15000); q.click('button[data-act="request_quality_check"]'); q.wait_for_selector('#af',timeout=5000)
        check(q.locator('#relho').count()==1 and MISS[lang] in q.inner_text('#relho'),f'{lang} {w}px: Abschlusskontrolle-Formular warnt')
        if SHOTS: q.locator('#relho').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/schluessel_warn_{lang}_{w}.png')
        q.click('#ac')
        q.goto(B+'/#/cases'); q.wait_for_timeout(1200)
        check(any(MISS[lang] in x for x in q.locator('.hotag').all_inner_texts()),f'{lang} {w}px: Vorgangsliste markiert „{MISS[lang]}“')
        q.goto(B+'/#/plan'); q.wait_for_timeout(1500)
        check(any(MISS[lang] in x for x in q.locator('[data-hotag]').all_inner_texts()),f'{lang} {w}px: Werkstattplan markiert „{MISS[lang]}“')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Werkstattplan ohne Querscrollen')
        if SHOTS: q.locator('[data-hotag]').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/schluessel_plan_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: Werkstatt ohne Skriptfehler {errs[:1]}')
        ctx.close()
        # Leitung (Inhaber) sieht Angabe und Verlauf
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/cases/'+cid); m.reload(); m.wait_for_selector('#handover',timeout=15000)
        check(m.locator('#handover .chip').count()==1 and m.locator('button[data-act="set_handover"]').count()==1,f'{lang} {w}px: Leitung sieht Angabe und darf ändern')
        m.goto(B+'/#/vehicles/'+'VIN%3A'+vin); m.wait_for_selector('#vho',timeout=15000)
        check(MISS[lang] in m.inner_text('#vho'),f'{lang} {w}px: Fahrzeugakte zeigt „{MISS[lang]}“')
        check(m.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Fahrzeugakte ohne Querscrollen')
        if SHOTS: m.locator('#vho').scroll_into_view_if_needed(); m.screenshot(path=f'{SHOTS}/schluessel_akte_{lang}_{w}.png')
        check(m.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Vorgang (Leitung) ohne Querscrollen')
        check(not errs,f'{lang} {w}px: Leitung ohne Skriptfehler {errs[:1]}')
        ctx.close()
    api('PATCH','/api/me',{'language':'de'})
    br.close()
print('\nErgebnis:', 'OK' if not fails else f'{len(fails)} Fehler')
raise SystemExit(1 if fails else 0)
