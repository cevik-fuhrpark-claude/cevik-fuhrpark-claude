# [CLAUDE] UI-Prüfung (04.11.2026, Backlog 980, Blickwinkel „Leitung überträgt die FIN aus Zulassungsbescheinigung, Rechnung oder
# E-Mail“): Eingefügtes „FIN: …“ wurde abgeschnitten (maxlength 25) bzw. abgewiesen. Geprüft (DE/UK/EN, 390/820/1366 px):
#  1. Fahrzeuge → Neues Fahrzeug: „Fahrgestellnummer: WDB 9634 031L …“ eingefügt → Feld zeigt nur die 17-stellige FIN, Speichern legt
#     das Fahrzeug mit dieser FIN an.
#  2. Rechnungszeile mit zwei FIN → Meldung in der App-Sprache, Feld unverändert; Teilstück → Zähler „N von 17“; I/O → Hinweis.
#  3. Globale Suche findet das Fahrzeug über eingefügtes „FIN: …“.
# Braucht den Dev-Server. Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
PASTE = """([sel, txt]) => { const el = document.querySelector(sel); el.focus(); const dt = new DataTransfer(); dt.setData('text/plain', txt);
  const ok = el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); return { prevented: !ok, value: el.value }; }"""
TOAST = "() => { const x = [...document.querySelectorAll('.toast.err')].pop(); return x ? x.textContent : ''; }"
CHK = "() => { const x = document.querySelector('#vinchk'); return x && !x.hidden ? x.textContent : ''; }"
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fz.inhaber','display_name':'FZ Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    own='fz.inhaber' if s['s']==200 else None
    if not own:
        for u in ['fz.inhaber','dz.inhaber','ez.inhaber','mt.inhaber','km.inhaber','ui.inhaber','inhaber']:
            if api('POST','/api/login',{'username':u,'password':PW})['s']==200: own=u; break
    check(own and api('POST','/api/login',{'username':own,'password':PW})['s']==200,'Anmeldung Inhaber')
    sfx=str(uuid.uuid4().int)[:5]
    CASES=[('de',390,844,'Fahrgestellnummer: WDB 9634 031L 1{s}','mehrere','von 17','nicht vor'),
           ('uk',820,1180,'VIN-код: WDB9634031L2{s}','кілька','із 17','не буває'),
           ('en',1366,900,'Invoice 4711, plate SZ-YC 5501, FIN WDB9634031L3{s}, km 412.345','several','of 17','never occur')]
    for i,(lang,w,h,txt,m_many,m_len,m_ioq) in enumerate(CASES):
        txt=txt.replace('{s}',sfx); vin=f'WDB9634031L{i+1}{sfx}'
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':own,'password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/vehicles'); q.wait_for_selector('#nvf',state='attached',timeout=15000); q.wait_for_timeout(500)
        q.evaluate("() => { const d = document.querySelector('#nvf').closest('details'); if (d) d.open = true; }")
        sel='#nvf input[name=vin]'
        r=q.evaluate(PASTE,[sel,'WDB963']); check(r['prevented'] is False or r['value']=='WDB963',f'{lang}: Teilstück eingefügt')
        q.wait_for_timeout(100); c=q.evaluate(CHK); check(m_len in c and '6' in c,f'{lang}: Zähler „{c}“')
        q.evaluate("() => document.querySelectorAll('.toast').forEach((x) => x.remove())")
        r=q.evaluate(PASTE,[sel,f'Zugmaschine WDB9634031L{sfx[:4]}99\nAnhänger WDB9634031L{sfx[:4]}98']); q.wait_for_timeout(150); tt=q.evaluate(TOAST)
        check(r['prevented'] and r['value']=='WDB963' and m_many.lower() in tt.lower(),f'{lang}: zwei FIN → Feld unverändert, Meldung „{tt[:70]}“')
        r=q.evaluate(PASTE,[sel,'FIN: WDB963403IL123456']); q.wait_for_timeout(100); c=q.evaluate(CHK)
        check(r['value']=='WDB963403IL123456' and m_ioq in c,f'{lang}: I bleibt I, Hinweis „{c[:60]}“')
        r=q.evaluate(PASTE,[sel,txt]); q.wait_for_timeout(100); c=q.evaluate(CHK)
        check(r['prevented'] and r['value']==vin and c=='',f'{lang} {w}px: „{txt[:40]}…“ → {r["value"]}')
        if SHOTS:
            q.evaluate(PASTE,[sel,'WDB963403IL12345']); q.wait_for_timeout(100)
            q.evaluate("() => document.querySelector('#nvf input[name=vin]').scrollIntoView({block:'center'})"); q.screenshot(path=f'{SHOTS}/fin-einfuegen-{lang}-{w}.png')
            q.evaluate(PASTE,[sel,txt])
        q.fill('#nvf input[name=plate]',f'FZ-{lang.upper()} {sfx[:4]}'); q.evaluate("() => document.querySelector('#nvf').requestSubmit()"); q.wait_for_timeout(1500)
        g=q.evaluate(JS,['GET','/api/vehicles/'+'VIN%3A'+vin,None,None])
        check(g['s']==200 and g['d']['vehicle']['vin']==vin,f'{lang}: Fahrzeug mit FIN {vin} angelegt ({g["s"]})')
        q.goto(B+'/#/search'); q.wait_for_selector('#gq',timeout=15000); q.fill('#gq','FIN: '+vin); q.wait_for_timeout(1500)
        hit=q.evaluate("(pl) => [...document.querySelectorAll('#gr a.row')].some((a) => a.textContent.includes(pl))",f'FZ-{lang.upper()} {sfx[:4]}')
        check(hit,f'{lang}: Suche „FIN: …“ findet das Fahrzeug')
        check(not errs,f'{lang}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('\nUI-FIN einfügen:', 'OK' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
