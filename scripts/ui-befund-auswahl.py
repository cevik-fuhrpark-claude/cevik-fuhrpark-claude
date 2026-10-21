# [CLAUDE] UI-Test: Startseite der Leitung „Befunde (Kritisch + Handeln): n“ → Management-Panel mit vorgewählter Auswahl „Kritisch + Handeln“
# (#/master?sev=act, Backlog 107 Teil 2): angezeigte Befunde = Zähler der Startseite, Adresse ohne Parameter, „Alle“ zeigt wieder alle;
# DE/UK/EN bei 390/820/1366 px ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, re
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
ACT={'de':'Kritisch + Handeln','uk':'Критично + Діяти','en':'Critical + Act'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ba.inhaber','display_name':'BA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ba.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    # Befunde verschiedener Schweregrade: kritischer Vorgang (kritisch), UVV überfällig, HU ohne Gesamtmasse (Frist ungeklärt)
    api('POST','/api/vehicles',{'vin':'WDB96340310777001','plate':'BA-ANL 1','site':'Dortmund'})
    api('POST','/api/vehicles/VIN:WDB96340310777001/maintenance',{'kind':'UVV','last_done_date':'2025-01-10','interval_months':12,'evidence':'UI-Test Auswahl'})
    api('POST','/api/vehicles/VIN:WDB96340310777001/maintenance',{'kind':'HU','last_done_date':'2026-03-15','interval_months':12,'evidence':'UI-Test HU-Bericht'})
    api('POST','/api/vehicles',{'vin':'WDB96340310777002','plate':'BA-ANL 2','site':'Dortmund'})
    api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310777002','description':'UI-Test: Bremsleitung undicht','priority':'kritisch','driveability':'nicht_fahrbereit','request_key':'ba-krit-1'})
    check(api('POST','/api/agent/run')['s']==200,'Agent gelaufen')
    fs=api('GET','/api/master')['d']['findings']; sev=[f['severity'] for f in fs]
    nact=sum(1 for x in sev if x in ('kritisch','handeln'))
    check(nact>=1 and len(sev)>nact,f'Befunde gemischt: {sev}')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'ba.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/'); q.wait_for_selector('#homefind')
        ht=q.inner_text('#homefind'); m=re.search(r'(\d+)\s*$',ht.strip())
        check(ACT[lang] in ht and m and int(m.group(1))==nact,f'{lang} {w}px: Startseite „{ht.strip()}“ (erwartet {nact})')
        if SHOTS and w==390: q.locator('#homefind').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/home_{lang}_{w}.png')
        q.click('#homefind'); q.wait_for_selector('#afl')
        q.wait_for_function("()=>location.hash==='#/master'")
        btn=q.locator('[data-afsev="act"]')
        check(btn.count()==1 and ACT[lang] in btn.inner_text() and 'secondary' not in (btn.get_attribute('class') or ''),f'{lang} {w}px: Auswahl „{ACT[lang]}“ aktiv')
        vis=q.evaluate("()=>[...document.querySelectorAll('#afl [data-afi]')].filter(r=>r.style.display!=='none').map(r=>r.dataset.sev)")
        check(len(vis)==nact and all(x in ('kritisch','handeln') for x in vis),f'{lang} {w}px: angezeigt {vis}')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/master_act_{lang}_{w}.png')
        q.click('[data-afsev="all"]'); q.wait_for_selector('[data-afsev="all"]:not(.secondary)')
        vis=q.evaluate("()=>[...document.querySelectorAll('#afl [data-afi]')].filter(r=>r.style.display!=='none').length")
        check(vis==len(sev) and q.locator('[data-afsev="act"]').count()==0,f'{lang} {w}px: „Alle“ zeigt {vis}/{len(sev)}, Kombi-Knopf weg')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'Alles grün'); raise SystemExit(1 if fails else 0)
