# [CLAUDE] UI-Test: Fahrerakte – nachgetragene ältere Fahrerkarte wird nur als Verlauf gespeichert (Hinweis in der App-Sprache, neue Karte
# bleibt gültig) und Vertragsformular sendet den gelesenen Stand (veraltetes Formular → Konfliktmeldung statt stillem Überschreiben).
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
OLDER={'de':'Gespeichert als Verlauf','uk':'Збережено як історію','en':'Saved as history'}
VIN='WDB96340310888873'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fn.inhaber','display_name':'FN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fn.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vid=api('POST','/api/vehicles',{'plate':'FN-UI 1','vin':VIN,'site':'Dortmund'})['d']['id']
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        did=api('POST','/api/drivers',{'display_name':f'Nachtrag {lang} {w}'})['d']['id']
        api('POST',f'/api/drivers/{did}/documents',{'kind':'fahrerkarte','evidence':'neue Karte','issued_on':'2025-03-01','valid_until':'2030-03-01'})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fn.inhaber','password':PW}])
        q.goto(B+f'/#/drivers/{did}'); ok=True
        try:
          q.wait_for_selector('#ddf',state='attached',timeout=15000)
          q.evaluate("""() => { const f = document.querySelector('#ddf'); let el = f; while (el) { if (el.tagName === 'DETAILS') el.open = true; el = el.parentElement; } }""")
          q.select_option('#ddf [name=kind]','fahrerkarte'); q.fill('#ddf [name=evidence]','alte Karte (Nachtrag)')
          q.fill('#ddf [name=issued_on]','2021-03-01'); q.fill('#ddf [name=valid_until]','2026-03-01')
          q.locator('#ddf button').first.click(); q.wait_for_selector('.toast',timeout=8000)
        except Exception as ex: ok=False; print('   ',ex)
        txt=q.inner_text('.toast') if ok else ''
        check(ok and OLDER[lang] in txt,f'{lang}/{w}: Hinweis „als Verlauf gespeichert“ ({txt[:40]})')
        if SHOTS and ok: q.screenshot(path=f'{SHOTS}/fn_nachtrag_{lang}_{w}.png')
        cur=api('GET',f'/api/drivers/{did}')['d']['documents']
        check([d['valid_until'] for d in cur if d['kind']=='fahrerkarte' and not d['superseded']]==['2030-03-01'],f'{lang}/{w}: neue Karte bleibt gültig')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    # Vertragsformular mit gelesenem Stand: zwischenzeitliche Änderung → Konfliktmeldung, Rate bleibt
    api('PATCH','/api/me',{'language':'de'})
    cid=api('POST',f'/api/vehicles/{vid}/contracts',{'kind':'leasing','partner':'LeaseCo','evidence':'L-1','start_date':'2026-01-01','end_date':'2028-12-31','monthly_rate_net':1000})['d']['id']
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fn.inhaber','password':PW}])
    q.goto(B+f'/#/vehicles/{vid}'); ok=True
    try:
      q.wait_for_selector(f'form[data-ctedit="{cid}"]',state='attached',timeout=15000)
      api('PATCH',f'/api/contracts/{cid}',{'monthly_rate_net':1180})
      q.evaluate(f"""() => {{ const f = document.querySelector('form[data-ctedit="{cid}"]'); let el = f; while (el) {{ if (el.tagName === 'DETAILS') el.open = true; el = el.parentElement; }} }}""")
      q.fill(f'form[data-ctedit="{cid}"] [name=note]','Ansprechpartner'); q.locator(f'form[data-ctedit="{cid}"] button').first.click(); q.wait_for_selector('.toast.err',timeout=8000)
    except Exception as ex: ok=False; print('   ',ex)
    check(ok,'veraltetes Vertragsformular: Konfliktmeldung')
    rate=[c for c in api('GET',f'/api/vehicles/{vid}')['d']['contracts'] if c['id']==cid][0]['monthly_rate_net']
    check(rate==1180,f'Rate nicht überschrieben ({rate})')
    ctx.close(); br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Fahrerakte-Nachtrag/Vertragsformular: alles grün')
raise SystemExit(1 if fails else 0)
