# [CLAUDE] UI-Test Backlog 1580 (Backlog 1501 Stufe 21, WCAG 3.3.1): CSV-Import – Fehler der ganzen Datei am Dateifeld bzw. an „Quelle“.
# Verträge: Datei ohne Nachweis-Spalte und ohne Quelle → Feld „Quelle“ markiert und fokussiert, Datei bleibt; leere Datei → Dateifeld markiert,
# geleert und fokussiert. Prüftermine: Datei ohne Pflichtspalten → Dateifeld markiert. DE/UK/EN bei 390/820/1366 px. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
def csv(name, text): return {'name': name, 'mimeType': 'text/csv', 'buffer': text.encode('utf-8')}
STATE="""(sel) => { const el = document.querySelector(sel); if (!el) return null; const d = document.getElementById(el.getAttribute('aria-describedby') ? el.getAttribute('aria-describedby').split(' ')[0] : '');
  return { inv: el.getAttribute('aria-invalid'), focus: document.activeElement === el, msg: d ? d.textContent : '', vis: !!(d && d.offsetParent), files: el.files ? el.files.length : -1 }; }"""
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'id.inhaber','display_name':'ID Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'id.inhaber','password':PW})['s']==200,'Anmeldung')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'id.inhaber','password':PW}])
        q.goto(B+'/#/contracts'); q.wait_for_selector('#ctimp',state='attached',timeout=15000)
        q.evaluate("()=>{ const d = document.querySelector('#ctimp').closest('details'); if (d) d.open = true; }")
        q.set_input_files('#ctimp', csv('vertraege.csv','Kennzeichen;Vertragsart;Vertragspartner\nSZ-YC 5513;leasing;Testbank\n'))
        q.wait_for_function("()=>document.querySelector('#ctsrc').getAttribute('aria-invalid')==='true'",timeout=15000)
        st=q.evaluate(STATE,'#ctsrc')
        check(st['focus'] and st['vis'] and st['msg'],f'{lang} {w}px: Quelle markiert/fokussiert ({st["msg"][:60]})')
        check(q.evaluate(STATE,'#ctimp')['files']==1,f'{lang} {w}px: Datei bleibt gewählt')
        if SHOTS: q.screenshot(path=f'{SHOTS}/id_src_{lang}_{w}.png')
        q.set_input_files('#ctimp', csv('leer.csv','Kennzeichen;Vertragsart\n'))
        q.wait_for_function("()=>document.querySelector('#ctimp').getAttribute('aria-invalid')==='true'",timeout=15000)
        st=q.evaluate(STATE,'#ctimp')
        check(st['focus'] and st['vis'] and st['msg'] and st['files']==0,f'{lang} {w}px: leere Datei – Dateifeld markiert, geleert, fokussiert ({st["msg"][:40]})')
        check(q.evaluate("()=>document.querySelector('#ctsrc').getAttribute('aria-invalid')")!='true','Quelle-Hinweis nach neuer Datei aufgehoben')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/id_file_{lang}_{w}.png')
        q.goto(B+'/#/maintenance'); q.wait_for_selector('#mimp',state='attached',timeout=15000)
        q.set_input_files('#mimp', csv('pruef.csv','Kennzeichen\nSZ-YC 5513\n'))
        q.wait_for_function("()=>document.querySelector('#mimp').getAttribute('aria-invalid')==='true'",timeout=15000)
        st=q.evaluate(STATE,'#mimp'); check(st['focus'] and st['vis'] and st['files']==0,f'{lang} {w}px: Prüftermin-Import – Dateifeld markiert')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
