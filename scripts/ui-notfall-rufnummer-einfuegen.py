# [CLAUDE] UI-Test (04.11.2026, Backlog 992, Blickwinkel „Leitung überträgt die Rufnummer aus E-Mail-Signatur, Website oder Visitenkarte“):
# „Rufnummern pflegen“: eingefügtes „Service-Hotline: +49 (0) 800 / 111 22 – 33.“ wird nicht bei 30 Zeichen abgeschnitten, beim Verlassen
# bereinigt und gespeichert; „Tel.: 0231 …“ zeigt den Auslandshinweis schon beim Tippen; „Fax: …“ wird mit Meldung abgewiesen.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Braucht den Dev-Server (scripts/dev-server.mjs). Screenshots: CFP_SHOTS=<Ordner>.
import os
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
    R=os.getpid()%100000; made=[]
    for lang in ['de','uk','en']:
      for i,(w,h) in enumerate([(390,844),(820,1180),(1366,900)]):
        ctx=br.new_context(viewport={'width':w,'height':h}); m=ctx.new_page(); errs=[]; m.on('pageerror',lambda e: errs.append(str(e)))
        m.goto(B); m.context.add_cookies(a.context.cookies()); m.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        m.goto(B+'/#/emergency/edit'); m.reload(); m.wait_for_selector('#emf input[name=phone]',timeout=15000)
        ph=m.locator('#emf input[name=phone]')
        # Auslandshinweis schon beim Tippen mit Bezeichnung
        ph.fill('Tel.: 0231 4711'); check(m.locator('#emnat').is_visible() and '+49 231 4711' in m.locator('#emnat').text_content(),f'{lang} {w}px: Auslandshinweis trotz „Tel.:“')
        n=(R*10+i)%1000; raw=f'Service-Hotline: +49 (0) 800 / {lang}{n:03d} 22 – 33.'.replace(lang,str(100+['de','uk','en'].index(lang)))
        ph.fill(raw); check(len(ph.input_value())==len(raw),f'{lang} {w}px: nicht abgeschnitten ({len(raw)} Zeichen)')
        m.fill('#emf input[name=label]',f'Panne 992 {lang} {w}'); exp=ph.input_value()
        ph.press('Tab'); v=ph.input_value()
        check(v.startswith('+49 (0) 800 / ') and v.endswith(' 22 - 33') and 'Hotline' not in v,f'{lang} {w}px: beim Verlassen bereinigt „{v}“')
        if SHOTS and w==390: m.screenshot(path=f'{SHOTS}/notfall_rufnummer_{lang}_{w}.png')
        m.click('#emf button.btn:not(.secondary)'); m.wait_for_timeout(900)
        lst=api('GET','/api/emergency/contacts')['d']['contacts']; c=[x for x in lst if x['label']==f'Panne 992 {lang} {w}']
        check(len(c)==1 and c[0]['phone']==v,f'{lang} {w}px: gespeichert {c[0]["phone"] if c else None}')
        made+= [x['id'] for x in c]
        # Fax: abgewiesen, Meldung in der Sprache
        m.wait_for_selector('#emf input[name=phone]'); m.fill('#emf input[name=label]',f'Fax 992 {lang}'); m.fill('#emf input[name=phone]','Fax: 0231 4712'); m.locator('#emf input[name=phone]').press('Tab')
        check(m.locator('#emf input[name=phone]').input_value()=='Fax: 0231 4712',f'{lang} {w}px: Fax bleibt stehen')
        m.click('#emf button.btn:not(.secondary)'); m.wait_for_timeout(700)
        toast=m.evaluate("()=>[...document.querySelectorAll('.toast')].map(x=>x.textContent).join(' ')")
        word={'de':'Telefonnummer','uk':'Номер телефону','en':'Phone number'}[lang]
        check(word in toast,f'{lang} {w}px: Fax abgewiesen mit Meldung „{toast[:80]}“')
        check(m.evaluate(noscroll),f'{lang} {w}px: ohne Querscrollen')
        check(not errs,f'{lang} {w}px: ohne Skriptfehler {errs[:1]}')
        ctx.close()
    for cid in made: api('POST',f'/api/emergency/contacts/{cid}/archive',{})
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
