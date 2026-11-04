# [CLAUDE] UI-Test (04.11.2026, Backlog 993, Blickwinkel „Zweites Schreiben derselben Bußgeldstelle – Anhörung, dann Bescheid – erfasst eine Kollegin“):
# Bußgelder → „Schreiben erfassen“ mit anders geschriebenem Aktenzeichen derselben Behörde („123 45 678901 2“ zu „Az.: 123.45.678901.2“)
# → Hinweis im Formular mit Link zum vorhandenen Vorgang, Eingaben bleiben stehen; globale Suche findet „12345678901“.
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
    R=os.getpid()%100000; ref=f'{R:05d}.45.678901.2'; auth=f'Stadt Dortmund Bußgeldstelle {R}'
    oa=(datetime.datetime.utcnow()-datetime.timedelta(days=3)).strftime('%Y-%m-%dT%H:%M:%S.000Z')
    r=api('POST','/api/fines',{'kind':'anhoerung','authority':auth,'reference':'Az.: '+ref,'offense_type':'geschwindigkeit','offense_at':oa,'plate_in_letter':'XX 993'})
    check(r['s']==201,f'erstes Schreiben angelegt {r["s"]}'); fid=r['d']['id']; fno=r['d']['fine_no']
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/fines'); m.reload(); m.wait_for_selector('#nf',state='attached',timeout=15000)
        m.evaluate("()=>{ const d=document.querySelector('#nf').closest('details'); if(d) d.open=true; }")
        m.select_option('#nf select[name=kind]','bussgeldbescheid')
        m.fill('#nf input[name=authority]',auth.lower()+' '); m.fill('#nf input[name=reference]',ref.replace('.',' '))
        m.fill('#nf input[name=offense_at]',(datetime.datetime.now()-datetime.timedelta(days=3)).strftime('%Y-%m-%dT%H:%M'))
        m.fill('#nf input[name=plate_in_letter]','XX 993'); m.fill('#nf textarea[name=note]','zweites Schreiben')
        m.click('#nf button.btn'); m.wait_for_selector('#nfdup',timeout=8000)
        info=m.evaluate("()=>{ const h=document.querySelector('#nfdup'); const a=h.querySelector('a'); return { t:h.textContent, href:a?a.getAttribute('href'):null, note:document.querySelector('#nf textarea[name=note]').value, hash:location.hash }; }")
        check(info['href']==f'#/fines/{fid}' and fno in info['t'],f'{lang} {w}px: Hinweis mit Link zum vorhandenen Vorgang {info["t"][:90]}')
        check(info['note']=='zweites Schreiben' and info['hash']=='#/fines',f'{lang} {w}px: Eingaben bleiben, Seite bleibt')
        check(m.evaluate("()=>{ const h=document.querySelector('#nfdup'); return h.scrollWidth<=h.clientWidth+1; }"),f'{lang} {w}px: Hinweis ohne Überlauf')
        if SHOTS: m.screenshot(path=f'{SHOTS}/bussgeld_dublette_{lang}_{w}.png')
        m.click('#nfdup a'); m.wait_for_function(f"()=>location.hash==='#/fines/{fid}'",timeout=8000)
        check(True,f'{lang} {w}px: Link öffnet den Vorgang')
        check(m.evaluate(noscroll),f'{lang} {w}px: ohne Querscrollen')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    # globale Suche ohne Trennzeichen
    ctx=br.new_context(viewport={'width':390,'height':844}); m=ctx.new_page(); m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':'de'}])
    m.goto(B+'/#/search'); m.reload(); m.wait_for_selector('#gq'); m.fill('#gq',ref.replace('.','')); m.wait_for_timeout(2500)
    check(m.locator(f'#gfines a[href="#/fines/{fid}"]').count()==1,'Suche findet Aktenzeichen ohne Punkte')
    ctx.close(); br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
