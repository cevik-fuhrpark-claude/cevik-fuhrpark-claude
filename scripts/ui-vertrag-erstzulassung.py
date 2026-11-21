# [CLAUDE] UI-Test (21.11.2026, Backlog 1652, Blickwinkel „Leitung erfasst einen Leasingvertrag mit vertipptem Beginn“): Fahrzeugakte →
# „Vertrag hinzufügen“ mit Vertragsbeginn vor der Erstzulassung → Vertrag gespeichert, Hinweis mit beiden Daten übersetzt sichtbar (DE/UK/EN);
# Backlog 1653: Vertragsimport-Vorschau nennt die Zeile mit Beginn vor der Erstzulassung. 390/820/1366 px, ohne Querscrollen/Skriptfehler. Frischer Dev-Server nötig.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'liegt vor der Erstzulassung','uk':'раніший за першу реєстрацію','en':'is before the first registration'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'vt.inhaber','display_name':'VT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'vt.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    VIN='WDB96340310165201'; VID='VIN%3A'+VIN
    api('POST','/api/vehicles',{'vin':VIN,'plate':'VT-AB 1652','site':'Dortmund','kind':'lkw'})
    check(api('POST','/api/vehicles/VIN:'+VIN+'/spec',{'first_registration':'2024-03-15','spec_source':'Fahrzeugschein (Test)'})['s']==200,'Erstzulassung gesetzt')
    n=0
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang} {w}px'
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'vt.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/vehicles/'+VID); q.reload(); q.wait_for_selector('#ctf',state='attached',timeout=15000)
        q.evaluate("()=>{ document.querySelector('#ctf').closest('details').open=true; }")
        q.select_option('#ctf [name=kind]','leasing'); q.fill('#ctf [name=partner]',f'Leasing {n}'); q.fill('#ctf [name=contract_no]',f'L-1652-{n}')
        q.fill('#ctf [name=start_date]','2014-03-01'); q.fill('#ctf [name=evidence]','Vertrag (Test)')
        q.locator('#ctf button.btn').scroll_into_view_if_needed(); q.click('#ctf button.btn')
        try: q.wait_for_function("(t)=>[...document.querySelectorAll('.toast')].some((x)=>x.textContent.includes(t))", arg=EXP[lang], timeout=8000); shown=True
        except Exception: shown=False
        check(shown, f'{tag}: Hinweis übersetzt sichtbar')
        if SHOTS: q.screenshot(path=f'{SHOTS}/vt_{lang}_{w}.png')
        cts=api('GET','/api/vehicles/VIN:'+VIN)['d'].get('contracts') or []
        check(any(c.get('contract_no')==f'L-1652-{n}' for c in cts), f'{tag}: Vertrag gespeichert')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: kein Querscrollen')
        # Backlog 1653: Importvorschau
        CCSV=('\ufeffKennzeichen;FIN;Vertragsart;Vertragspartner;Vertragsnummer;Beginn;Ende;Kündigungsfrist (Monate);km-Kontingent;km bei Übernahme;Monatsrate;Nachweis\r\n'
              +f'VT-AB 1652;{VIN};Versicherung;Vers AG;V-1653-{n};01.01.2014;;;;;;Import 1653\r\n').encode('utf-8')
        q.goto(B+'/#/contracts'); q.wait_for_selector('#ctimp',state='attached')
        q.evaluate("()=>{const d=document.querySelector('#ctimp').closest('details'); if(d) d.open=true}")
        q.set_input_files('#ctimp',{'name':'v.csv','mimeType':'text/csv','buffer':CCSV})
        try: q.wait_for_selector('#ctimpr [data-ctimpreg]',state='attached',timeout=10000); hint=q.evaluate("()=>document.querySelector('#ctimpr [data-ctimpreg]').textContent")
        except Exception: hint=''
        check(('15.03.2024' in hint or '2024' in hint) and len(hint)>20, f'{tag}: Importvorschau nennt Erstzulassung ({hint[:80]!r})')
        q.evaluate("()=>{const x=document.querySelector('#ctimpr [data-ctimpreg]'); if(x){ x.closest('details') && (x.closest('details').open=true); x.scrollIntoView({block:'center'}); }}")
        if SHOTS: q.screenshot(path=f'{SHOTS}/vtimp_{lang}_{w}.png')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: Import kein Querscrollen')
        check(not errs,f'{tag}: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
