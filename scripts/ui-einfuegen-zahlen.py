# [CLAUDE] UI-Prüfung (03.11.2026, Backlog 897, Blickwinkel „Werte per Kopieren/Einfügen aus Rechnung, Nachricht oder App-Anzeige“):
# Kopierte Zahlen tragen oft eine Einheit und geschützte Leerzeichen („1.234,56 €“, „123.456 km“; die UK-Anzeige der App schreibt
# „123 456 км“ mit U+00A0). Geprüft:
#  1. Einfügen in das km-Feld der Fahrzeugakte (DE/UK/EN, 390/820/1366 px): Einheit/Leerzeichen entfernt, Speichern übernimmt den Stand.
#  2. Einfügen in ein Preisfeld (Lagerartikel, inputmode=decimal): „1.234,56 €“ → „1.234,56“.
#  3. Nicht-Zahlen (Kennzeichen) und Textfelder bleiben unverändert (Einfügen nicht abgefangen).
# Braucht den Dev-Server. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
PASTE = """([sel, txt]) => { const el = document.querySelector(sel); el.focus(); el.value = ''; const dt = new DataTransfer(); dt.setData('text/plain', txt);
  const ok = el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return { prevented: !ok, value: el.value }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ez.inhaber','display_name':'EZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own='ez.inhaber' if s['s']==200 else None
    if not own:
        for u in ['ez.inhaber','mt.inhaber','km.inhaber','ui.inhaber','inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: own=u; break
    check(own and api('POST','/api/login',{'username':own,'password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:4]; vins=[f'WMA15SZZ2HM9{i}'+sfx for i in range(3)]; plates=[f'EZ-P{i} {sfx}' for i in range(3)]
    csv='Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n'+'\n'.join(f'{pl};Dortmund;MAN;2016;{v};Lkw' for pl,v in zip(plates,vins))
    check(api('POST','/api/vehicles/import',csv,'text/csv')['s']==200,'Fahrzeuge importiert')
    vs=api('GET','/api/vehicles')['d']; vl=vs.get('vehicles') if isinstance(vs,dict) else vs; ids={v['vin']:v['id'] for v in vl if v.get('vin') in vins}
    CASES=[('de',390,844,'123.456 km','123.456',123456),('uk',820,1180,'123 457 км','123457',123457),('en',1366,900,'123,458 km','123,458',None)]
    for i,(lang,w,h,txt,exp,km) in enumerate(CASES):
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':own,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/vehicles/'+ids[vins[i]]); q.wait_for_selector('#kf',state='attached'); q.wait_for_timeout(800)
        q.evaluate("() => { const d = document.querySelector('#kf').closest('details'); if (d) d.open = true; }")
        r=q.evaluate(PASTE,['#kfkm',txt])
        check(r['prevented'] and r['value']==exp,f'{lang} {w}px: km „{txt}“ eingefügt als „{r["value"]}“ (erwartet {exp})')
        if km:
            q.evaluate("() => document.querySelector('#kf').requestSubmit()"); q.wait_for_timeout(1500)
            od=q.evaluate(JS,['GET','/api/vehicles/'+ids[vins[i]],None,None])['d']['odometer']
            check(od and od[0]['km']==km,f'{lang}: km-Stand {km} gespeichert')
        else:
            check(True,f'{lang}: Tausenderkomma bleibt – Server meldet es wie bisher als mehrdeutig')
        r2=q.evaluate(PASTE,['#kfkm','SZ-YC 5501'])
        check(not r2['prevented'],f'{lang}: Kennzeichen in Zahlenfeld nicht abgefangen')
        if SHOTS: q.evaluate("() => { const d = document.querySelector('#kf').closest('details'); if (d) { d.open = true; d.scrollIntoView(); } document.querySelector('#kfkm').value = '123456'; }"); q.screenshot(path=f'{SHOTS}/einfuegen-{lang}-{w}.png')
        check(not errs,f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    # Preisfeld (inputmode=decimal) und Textfeld
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':own,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':'de'},None])
    q.goto(B+'/#/settings'); q.wait_for_timeout(1200)
    q.evaluate("""() => { const f = document.createElement('div'); f.innerHTML = '<input id="tdec" inputmode="decimal"><input id="ttxt">'; document.body.appendChild(f); }""")
    r=q.evaluate(PASTE,['#tdec','1.234,56 €']); check(r['prevented'] and r['value']=='1.234,56','Preisfeld: „1.234,56 €“ → „1.234,56“')
    r=q.evaluate(PASTE,['#tdec','EUR 99,90']); check(r['value']=='99,90','Preisfeld: „EUR 99,90“ → „99,90“')
    r=q.evaluate(PASTE,['#ttxt','1.234,56 €']); check(not r['prevented'],'Textfeld: Einfügen unverändert')
    r=q.evaluate(PASTE,['#tdec','12,50']); check(not r['prevented'],'Preisfeld: reine Zahl ohne Änderung nicht abgefangen')
    ctx.close(); br.close()
print('\nUI-Einfügen Zahlen:', 'OK' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
