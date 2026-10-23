# [CLAUDE] UI-Test (23.10.2026, Teilagent „Disposition plant die Woche“): Termine im Plan nennen das gekoppelte Fahrzeug (🔗) und kennzeichnen
# ruhende Fahrzeuge („Ruhend“) – Dispo-Startseite „Geplante Termine“ und Werkstattplan (#/plan). DE/UK/EN bei 390/820/1366 px, kein
# Querscrollen, keine Skriptfehler. Braucht einen frischen Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
DORM={'de':'Ruhend','uk':'Неактивний облік','en':'Dormant'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
d=lambda n: (datetime.date.today()+datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'pg.inhaber','display_name':'PG Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'pg.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    u=api('POST','/api/users',{'username':'pg.dispo','display_name':'PG Dispo','role':'dispatch','environment':'production'})
    c0=br.new_context(); q0=c0.new_page(); q0.goto(B); q0.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}]); c0.close()
    for b in [{'vin':'WDB9634031P100001','plate':'PG-ZM 1','site':'Dortmund','trailer_plate':'PG-AH 1'},{'vin':'WDB9634031P100002','plate':'PG-AH 1','site':'Dortmund','kind':'anhaenger'},{'vin':'WDB9634031P100003','plate':'PG-RU 1','site':'Dortmund'}]:
        check(api('POST','/api/vehicles',b)['s']==201,f"Fahrzeug {b['plate']}")
    check(api('POST','/api/vehicles/VIN:WDB9634031P100003/evaluation',{'excluded':True,'reason':'Reserve (Test)'})['s']==200,'ruhend gesetzt')
    for vin,kind,n in [('WDB9634031P100002','Bremsen',1),('WDB9634031P100003','UVV',2)]:
        r=api('POST',f'/api/vehicles/VIN:{vin}/maintenance',{'kind':kind,'interval_months':12,'evidence':'UI-Test'}); check(r['s']==201,f'Regel {kind} ({r["s"]} {r["d"]})')
        rid=r['d'].get('id') if r['d'] else None
        check(rid and api('POST',f'/api/maintenance/{rid}/plan',{'planned_date':d(n)})['s']==200,f'Termin {kind}')
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        for who in ['pg.dispo','pg.inhaber']:
          api('PATCH','/api/me',{'language':lang}) if who=='pg.inhaber' else None
          ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
          q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':who,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
          q.goto(B+('/#/' if who=='pg.dispo' else '/#/plan')); q.wait_for_timeout(1500)
          txt=q.inner_text('body')
          check('🔗' in txt and 'PG-ZM 1' in txt,f'{who}/{lang}/{w}: Anhänger-Termin nennt Zugmaschine')
          check(DORM[lang] in txt and 'PG-RU 1' in txt,f'{who}/{lang}/{w}: ruhendes Fahrzeug gekennzeichnet')
          check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{who}/{lang}/{w}: ohne Querscrollen')
          if SHOTS: el=q.locator('[data-pcoupled]').first; el.scroll_into_view_if_needed() if el.count() else None; q.screenshot(path=f'{SHOTS}/pg_{who}_{lang}_{w}.png')
          check(not errs,f'{who}/{lang}/{w}: keine Skriptfehler {errs[:1]}')
          ctx.close()
    br.close()
print('FEHLER: '+'; '.join(fails) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
