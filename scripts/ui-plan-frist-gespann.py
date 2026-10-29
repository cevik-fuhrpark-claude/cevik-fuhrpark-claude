# [CLAUDE] UI-Test (29.10.2026, Backlog 607/608, Blickwinkel „Fuhrparkleitung plant am 25. die Prüftermine des nächsten Monats“):
# Werkstattplan zeigt „Termin … liegt nach dem Fristende“ auch für Prüftermine im Zeitraum und „🔗 SZ-… geplant am …“ (Termin des fest
# gekoppelten Fahrzeugs an einem anderen Tag); Prüftermine-Reiter „ohne Termin“ enthält den Termin nach Fristende. DE/UK/EN bei 390/820/1366 px,
# kein Querscrollen, keine Skriptfehler. Braucht einen frischen Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
from datetime import date, timedelta
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CPL={'de':'geplant am','uk':'заплановано на','en':'planned on'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pf.inhaber','display_name':'PF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    today=date.fromisoformat(a.evaluate("() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())"))
    d=lambda n: (today+timedelta(days=n)).isoformat()
    for b in [{'vin':'WDB9634031P607001','plate':'PF-ZM 1','site':'Dortmund','trailer_plate':'PF-AH 1'},{'vin':'WDB9634031P607002','plate':'PF-AH 1','site':'Dortmund','kind':'anhaenger'}]:
        check(api('POST','/api/vehicles',b)['s']==201,f"Fahrzeug {b['plate']}")
    r1=api('POST','/api/vehicles/VIN:WDB9634031P607001/maintenance',{'kind':'UVV','next_due_date':d(4),'evidence':'UVV-Nachweis'}); check(r1['s']==201,'UVV Zugmaschine')
    r2=api('POST','/api/vehicles/VIN:WDB9634031P607002/maintenance',{'kind':'Bremsen','next_due_date':d(40),'evidence':'Bremsenprüfung'}); check(r2['s']==201,'Bremsen Anhänger')
    p1=api('POST',f"/api/maintenance/{r1['d']['id']}/plan",{'planned_date':d(6)}); check(p1['s']==200 and p1['d'].get('after_due')==d(4),f'Termin nach Fristende gemeldet ({p1["d"]})')
    check(api('POST',f"/api/maintenance/{r2['d']['id']}/plan",{'planned_date':d(2)})['s']==200,'Termin Anhänger')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'pf.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/plan'); q.reload(); q.wait_for_selector('[data-afterdue]',timeout=15000); q.wait_for_timeout(500)
        check(q.locator('[data-afterdue]').count()>=1,f'{lang}/{w}: Hinweis Termin nach Fristende')
        cd=q.locator('[data-cdates]')
        check(cd.count()>=2 and all(CPL[lang] in x for x in cd.all_inner_texts()),f'{lang}/{w}: Gespann-Termine an beiden Einträgen ({cd.count()})')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Plan ohne Querscrollen')
        if SHOTS and w==390: q.locator('[data-afterdue]').first.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pf_plan_{lang}.png',full_page=True)
        q.goto(B+'/#/maintenance'); q.wait_for_timeout(1200)
        txt=q.inner_text('body')
        check('PF-ZM 1' in txt,f'{lang}/{w}: Prüftermine zeigen PF-ZM 1')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
