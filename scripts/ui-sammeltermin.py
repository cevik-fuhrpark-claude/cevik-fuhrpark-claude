# [CLAUDE] UI-Test (24.10.2026, Backlog 235, Blickwinkel „Fuhrparkleitung plant die UVV aller Fahrzeuge an einem Tag“): Prüftermine →
# „Sammeltermin für mehrere Prüftermine“: Termin wählen, drei überfällige UVV ankreuzen (eine mit anderer Absprache), „Termin für Auswahl
# setzen“ → Ergebnis nennt 2 eingeplant und die nicht ersetzte Absprache; danach zeigen die Zeilen den Termin. Werkstatt sieht den Bereich,
# Disposition nicht. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server; Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid, datetime
from zoneinfo import ZoneInfo
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Sammeltermin für mehrere Prüftermine','uk':'Спільний термін для кількох перевірок','en':'Joint appointment for several inspections'}
DONE={'de':'2 Prüftermine eingeplant','uk':'2 перевірки заплановано','en':'2 inspections planned'}
OTHER={'de':'hat schon Termin','uk':'уже має термін','en':'already has appointment'}
SEL={'de':'3 ausgewählt','uk':'3 вибрано','en':'3 selected'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.datetime.now(ZoneInfo('Europe/Berlin')).date()
day=(today+datetime.timedelta(days=12)).isoformat(); other=(today+datetime.timedelta(days=4)).isoformat()
last=(today-datetime.timedelta(days=380)).isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'as.inhaber','display_name':'AS Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'as.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    tag=str(uuid.uuid4().int)[:3]; rids=[]; plates=[]
    for i in range(3):
        vin='WDB9634031S'+str(uuid.uuid4().int)[:6]; pl=f'ST-U{i} {tag}'; plates.append(pl)
        check(api('POST','/api/vehicles',{'vin':vin,'plate':pl,'site':'Dortmund'})['s'] in (200,201),'Fahrzeug '+pl)
        r=api('POST',f'/api/vehicles/VIN:{vin}/maintenance',{'kind':'UVV','last_done_date':last,'interval_months':12,'evidence':'UVV-Protokoll (UI-Test Sammeltermin)'})
        check(r['s']==201,'UVV '+pl); rids.append(r['d']['id'])
    check(api('POST',f'/api/maintenance/{rids[2]}/plan',{'planned_date':other})['s']==200,'Absprache am dritten Fahrzeug')
    # Rollen für die Sichtbarkeit
    for u,role,extra in [('st.werkstatt','workshop',{'workshop_site':'DORTMUND'}),('st.dispo','dispatch',{})]:
        r=api('POST','/api/users',{'username':u+tag,'display_name':u,'role':role,'environment':'production',**extra})
        tok=(r['d'] or {}).get('invite_token')
        if tok:
            q=br.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW}]); q.close()
    first=True
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'as.inhaber','password':PW}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/maintenance'); q.wait_for_selector('#mbatch',timeout=15000)
        check(TITLE[lang] in q.inner_text('#mbatch summary'),f'{lang}/{w}: Bereich „{TITLE[lang]}“')
        q.click('#mbatch summary')
        if first:
            q.fill('#mbdate',day)
            for rid in rids: q.check(f'#mbf input[name=mbid][value="{rid}"]')
            check(SEL[lang] in q.inner_text('#mbcount'),f'{lang}/{w}: Zähler „{SEL[lang]}“')
            if SHOTS: q.locator('#mbatch').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/sammeltermin-form-{lang}-{w}.png')
            q.click('#mbgo'); q.wait_for_selector('#mbres',timeout=10000)
            res=q.inner_text('#mbres')
            check(DONE[lang] in res and OTHER[lang] in res and plates[2] in res,f'{lang}/{w}: Ergebnis nennt Einplanung und Absprache ({res[:90]!r})')
            check(q.locator('#mbatch[open]').count()==1,f'{lang}/{w}: Bereich bleibt offen')
            if SHOTS: q.locator('#mbres').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/sammeltermin-ergebnis-{lang}-{w}.png')
            first=False
            q.evaluate("location.hash='#/'"); q.wait_for_timeout(600); q.evaluate("location.hash='#/maintenance'"); q.wait_for_selector('#mbatch:not([open])',timeout=15000); q.click('#mbatch summary')
            check(q.locator('#mbres').count()==0,f'{lang}/{w}: Ergebnis verschwindet beim nächsten Aufruf')
        txt=q.inner_text('#mbatch')
        check(all(pl in txt for pl in plates),f'{lang}/{w}: eigene Einträge angeboten')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS and w!=820: q.locator('#mbatch').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/sammeltermin-liste-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    pl_=api('GET','/api/maintenance')['d']['rows']
    got={r['id']:r.get('planned_date') for r in pl_ if r['id'] in rids}
    check(got.get(rids[0])==day and got.get(rids[1])==day and got.get(rids[2])==other,f'Server: Termine {got}')
    for u,want in [('st.werkstatt',1),('st.dispo',0)]:
        ctx=br.new_context(viewport={'width':1366,'height':900}); q=ctx.new_page(); q.goto(B)
        if q.evaluate(JS,['POST','/api/login',{'username':u+tag,'password':PW}])['s']==200:
            q.goto(B+'/#/maintenance'); q.wait_for_selector('h1',timeout=15000); q.wait_for_timeout(800)
            check(q.locator('#mbatch').count()==want,f'{u}: Bereich {"sichtbar" if want else "nicht sichtbar"}')
        else: check(False,f'{u}: Anmeldung')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
