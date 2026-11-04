# [CLAUDE] UI-Test (04.11.2026, Backlog 995, Blickwinkel „Kollegin mit ukrainischer/englischer Tastatur sucht „Munchen“, „Strasse“):
# globale Suche (Lupe) findet die Bußgeld-Behörde „Landeshauptstadt München – Straßenverkehrsbehörde“ auch ohne Umlaute/ß getippt.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='()=>document.documentElement.scrollWidth<=innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tz.inhaber','display_name':'TZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'tz.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['nw.inhaber','nb.inhaber','ab.inhaber','ws.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    R=os.getpid()%100000; auth=f'Landeshauptstadt München – Straßenverkehrsbehörde {R}'
    oa=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(days=3)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    r=api('POST','/api/fines',{'kind':'anhoerung','authority':auth,'reference':f'995-{R}','offense_type':'geschwindigkeit','offense_at':oa,'plate_in_letter':'XX 995'})
    check(r['s']==201,f'Schreiben angelegt {r["s"]}'); fid=r['d']['id']
    for lang,q in [('de',f'strassenverkehrsbehorde {R}'),('uk','Muenchen'),('en','strassenverkehrs')]:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/search'); m.reload(); m.wait_for_selector('#gq'); m.fill('#gq',q)
        try: m.wait_for_selector(f'#gfines a[href="#/fines/{fid}"]',timeout=8000); hit=True
        except Exception: hit=False
        check(hit,f'{lang} {w}px: „{q}“ findet die Behörde mit Umlaut/ß')
        if SHOTS: m.screenshot(path=f'{SHOTS}/suche_ohne_umlaut_{lang}_{w}.png')
        check(m.evaluate(noscroll),f'{lang} {w}px: ohne Querscrollen')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
