# [CLAUDE] UI-Prüfung (31.10.2026, Backlog 790, Blickwinkel „Fahrer hält das Handy quer im Fahrerhaus“): Im Querformat am Handy
# (844×390, 740×360, 667×375 mit Schrift 130 %) ist die Tabbar kompakt (Symbol neben Beschriftung, ≤ 56 px bzw. ≤ 16 % der Höhe;
# vorher 65 px), jede Beschriftung vollständig sichtbar, jeder Tab ≥ 44 px hoch, kein Querscrollen und der letzte Inhalt der Seite
# liegt nach dem Herunterscrollen über der Tabbar. Hochformat (390×844) behält die hohe Tabbar mit Melden-Punkt. DE/UK/EN, Fahrer,
# Werkstatt, Inhaber. Dev-Server: CFP_URL (Standard Port 8787).
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
MEAS = r"""() => { const tb = document.querySelector('.tabbar'); const r = tb.getBoundingClientRect();
  const tabs = [...tb.querySelectorAll('a')].map((a) => { const s = a.querySelector('span:last-child'); return { t: s.textContent, cut: s.scrollHeight > s.clientHeight + 1 || s.scrollWidth > s.clientWidth + 1, h: a.getBoundingClientRect().height }; });
  window.scrollTo(0, document.documentElement.scrollHeight); const m = document.querySelector('main') || document.getElementById('app');
  const kids = [...m.querySelectorAll('*')].filter((e) => { const q = e.getBoundingClientRect(); return q.height > 0 && e.checkVisibility({ visibilityProperty: true }); }); // geschlossene <details> zählen nicht
  const last = Math.max(...kids.map((e) => e.getBoundingClientRect().bottom));
  return { sw: document.documentElement.scrollWidth, iw: innerWidth, vh: innerHeight, tbh: Math.round(r.height), tbtop: r.top, tabs, last: Math.round(last) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'qf.inhaber','display_name':'QF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'qf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vin='WMA15SZZ2HM76'+sfx
    check(api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\nQF-ZM {sfx};Dortmund;MAN;2016;{vin};Lkw','text/csv')['s']==200,'Fahrzeug importiert')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    users={'owner':'qf.inhaber'}
    for role in ['driver','workshop']:
        un=f'qf.{role}{sfx}'; r=api('POST','/api/users',{'username':un,'display_name':f'QF {role}','role':role,'workshop_site':'DORTMUND','environment':envn,'language':'de'})
        c2=br.new_context(); q2=c2.new_page(); q2.goto(B); q2.evaluate(JS,['POST','/api/invite/accept',{'token':r['d']['invite_token'],'password':PW},None]); c2.close(); users[role]=un
    c=api('POST','/api/cases',{'vehicle_id':'VIN:'+vin,'description':'Spiegel rechts lose (Querformat)','priority':'mittel','driveability':'fahrbereit','request_key':'qf-'+sfx})
    check(c['s']==201,'Vorgang angelegt'); cid=c['d']['id']
    R={'driver':['#/','#/new','#/check','#/cases/'+cid],'workshop':['#/','#/cases/'+cid],'owner':['#/','#/cases','#/more']}
    for lang in ['de','uk','en']:
        for role,routes in R.items():
            for (w,h,pct) in [(844,390,100),(740,360,100),(667,375,130),(390,844,100)]:
                ctx=br.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,device_scale_factor=2); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
                q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':users[role],'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
                for rt in routes:
                    q.goto(B+'/'+rt); q.reload(); q.wait_for_selector('.tabbar',timeout=20000); q.wait_for_timeout(700)
                    if pct!=100: q.add_style_tag(content=f'html{{font-size:{pct}%}}'); q.wait_for_timeout(200)
                    m=q.evaluate(MEAS); tag=f'{lang} {role} {w}×{h} {pct}% {rt[:12]}'
                    check(m['sw']<=m['iw']+1,f'{tag}: kein Querscrollen ({m["sw"]}/{m["iw"]})')
                    cut=[t['t'] for t in m['tabs'] if t['cut']]; check(not cut,f'{tag}: Beschriftungen vollständig {cut}')
                    check(all(t['h']>=44 for t in m['tabs']),f'{tag}: Tabs ≥ 44 px hoch {[round(t["h"]) for t in m["tabs"]]}')
                    if w>h:
                        check(m['tbh']<=max(56, 0.16*m['vh']),f'{tag}: Tabbar kompakt ({m["tbh"]} px von {m["vh"]})')
                    else:
                        check(m['tbh']>=60,f'{tag}: Hochformat behält hohe Tabbar ({m["tbh"]} px)')
                    check(m['last']<=m['tbtop']+1,f'{tag}: letzter Inhalt über der Tabbar ({m["last"]} ≤ {round(m["tbtop"])})')
                    if SHOTS: q.screenshot(path=f"{SHOTS}/querformat-{lang}-{role}-{w}-{rt.strip('#/').split('/')[0] or 'start'}.png")
                check(not errs,f'{lang} {role} {w}: keine Skriptfehler {errs[:1]}')
                ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün'); raise SystemExit(1 if fails else 0)
