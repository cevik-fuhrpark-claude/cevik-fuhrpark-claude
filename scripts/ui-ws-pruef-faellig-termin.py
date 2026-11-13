# [CLAUDE] UI-Test (13.11.2026, Backlog 1449, Blickwinkel „Werkstatt sieht fällige Prüfungen auf der Startseite und weiß nicht, ob schon ein Termin steht“):
# Werkstatt-Startseite „Prüfungen fällig“ nennt je Zeile den geplanten Termin (morgen) samt Hinweis zum Termin. DE/UK/EN 390/820/1366 px.
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
    def iso(d): return (datetime.date.today()+datetime.timedelta(days=d)).isoformat()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        pl=f'WM-T {R%900}{n}'; vin=f'WWM{R:05d}{n:04d}0000000'[:17]; vid='VIN:'+vin
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        r=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'UVV','next_due_date':iso(6),'evidence':'Prüfbuch UVV (Test 1449)'})
        check(r['s']==201,f'{lang}/{w}: UVV angelegt'); rid=r['d']['id']
        NOTE=f'6:30 Uhr, Prüfdienst Halle {n} – Schlüssel an der Pforte'
        check(api('POST',f'/api/maintenance/{rid}/plan',{'planned_date':iso(1),'planned_note':NOTE})['s']==200,f'{lang}/{w}: Termin morgen mit Hinweis')
        un=f'wm.ws{R}.{n}'
        u=api('POST','/api/users',{'username':un,'display_name':f'WM Werkstatt {n}','role':'workshop','environment':envn,'language':lang,'workshop_site':'DORTMUND'})
        check(u['s'] in (200,201),f'{lang}/{w}: Dispokonto')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.on('pageerror',lambda e: errs.append(str(e))); q.goto(B)
        q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':un,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        T=q.evaluate("async (l) => { const S = (await import('/i18n.js')); return { pl: S.STRINGS[l].planned, tm: S.STRINGS[l].tomorrow }; }", lang)
        q.goto(B+'/#/'); q.reload()
        q.wait_for_selector('[data-wsmplan]',timeout=20000)
        r=q.locator('#app a.row').filter(has_text=pl)
        check(r.count()==1,f'{lang}/{w}: Zeile für {pl}')
        nt=r.locator('[data-wsmplan]')
        tx=nt.inner_text() if nt.count()==1 else ''
        check(T['pl'] in tx and T['tm'] in tx and NOTE in tx,f'{lang}/{w}: „📅 {T["pl"]} … ({T["tm"]}) 📝 {NOTE}“')
        check(r.locator('[data-mplannote]').count()==1,f'{lang}/{w}: Hinweis markiert')
        if nt.count()==1:
            bx=nt.bounding_box(); rb=r.bounding_box()
            check(bx and rb and bx['x']+bx['width']<=rb['x']+rb['width']+1,f'{lang}/{w}: Termin innerhalb der Zeile')
        check('Prüfbuch' not in q.locator('#app').inner_text(),f'{lang}/{w}: kein Nachweistext')
        if SHOTS: r.scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/ws-pruef-faellig-termin-{lang}-{w}.png')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        # Zeile führt zur Fahrzeugakte
        if r.count(): r.click(); q.wait_for_timeout(1500); check('#/vehicles/' in q.url,f'{lang}/{w}: Sprung zur Fahrzeugakte')
        ctx.close()
        api('POST',f'/api/maintenance/{rid}/complete',{'done_date':iso(0),'evidence':'Prüfbuch UVV (Test 1449b)'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
