# [CLAUDE] UI-Test: Fahrzeugakte – Dokumentangaben korrigieren (Art, Bemerkung, „gültig bis“). Formular übernimmt die Werte des
# gewählten Dokuments, Speichern ändert nur dieses Dokument; veraltetes Formular → Konfliktmeldung statt stillem Überschreiben.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
UP = """async ([path, txt]) => { const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/pdf', 'x-cfp': '1', 'x-filename': 'dok.pdf' }, body: new TextEncoder().encode('%PDF-1.4\\n% ' + txt + '\\n%%EOF') });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TITLE={'de':'Dokumentangaben korrigieren','uk':'Виправити дані документа','en':'Correct document details'}
VIN='WDB96340310888874'
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dk.inhaber','display_name':'DK Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'dk.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vid=api('POST','/api/vehicles',{'plate':'DK-UI 1','vin':VIN,'site':'Dortmund'})['d']['id']
    n=0
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        d1=a.evaluate(UP,[f'/api/vehicles/{vid}/documents?kind=versicherung&valid_until=2026-01-31',f'Versicherung {n}'])['d']['id']
        d2=a.evaluate(UP,[f'/api/vehicles/{vid}/documents?kind=zulassung&note=Teil%20I',f'Zulassung {n}'])['d']['id']
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'dk.inhaber','password':PW}])
        q.goto(B+f'/#/vehicles/{vid}'); ok=True; pre=''; summ=''
        try:
          q.wait_for_selector('#docedit',state='attached',timeout=15000)
          q.evaluate("() => { document.querySelector('#docedit-d').open = true; }")
          summ=q.inner_text('#docedit-d summary')
          q.select_option('#docedit [name=file_id]',d1); pre=q.input_value('#docedit [name=valid_until]')
          q.select_option('#docedit [name=file_id]',d2)
          check(q.input_value('#docedit [name=note]')=='Teil I' and q.input_value('#docedit [name=valid_until]')=='',f'{lang}/{w}: Werte des gewählten Dokuments')
          q.select_option('#docedit [name=file_id]',d1); q.fill('#docedit [name=valid_until]','2027-01-31'); q.fill('#docedit [name=note]','verlängert')
          if SHOTS: q.locator('#docedit-d').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/dok_korrigieren_{lang}_{w}.png')
          q.locator('#docedit button').first.click(); q.wait_for_selector('.toast',timeout=8000)
        except Exception as ex: ok=False; print('   ',ex)
        check(ok and summ.strip().startswith(TITLE[lang]),f'{lang}/{w}: Überschrift ({summ[:40]})')
        check(pre=='2026-01-31',f'{lang}/{w}: „gültig bis“ vorbelegt ({pre})')
        docs={x['id']:x for x in api('GET',f'/api/vehicles/{vid}')['d']['documents']}
        check(docs[d1]['doc_valid_until']=='2027-01-31' and docs[d1]['doc_note']=='verlängert',f'{lang}/{w}: gespeichert')
        check(docs[d2]['doc_note']=='Teil I' and docs[d2]['doc_valid_until'] is None,f'{lang}/{w}: anderes Dokument unverändert')
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    # veraltetes Formular: zwischenzeitliche Änderung → Konfliktmeldung, gespeicherter Wert bleibt
    api('PATCH','/api/me',{'language':'de'})
    d3=a.evaluate(UP,[f'/api/vehicles/{vid}/documents?kind=versicherung&valid_until=2026-05-31','Konflikt'])['d']['id']
    ctx=br.new_context(viewport={'width':390,'height':844}); q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'dk.inhaber','password':PW}])
    q.goto(B+f'/#/vehicles/{vid}'); ok=True
    try:
      q.wait_for_selector('#docedit',state='attached',timeout=15000)
      api('PATCH',f'/api/vehicles/{vid}/documents/{d3}',{'valid_until':'2028-05-31'})
      q.evaluate("() => { document.querySelector('#docedit-d').open = true; }")
      q.select_option('#docedit [name=file_id]',d3); q.fill('#docedit [name=valid_until]','2026-06-30'); q.locator('#docedit button').first.click(); q.wait_for_selector('.toast.err',timeout=8000)
    except Exception as ex: ok=False; print('   ',ex)
    check(ok,'veraltetes Formular: Konfliktmeldung')
    cur=[x for x in api('GET',f'/api/vehicles/{vid}')['d']['documents'] if x['id']==d3][0]['doc_valid_until']
    check(cur=='2028-05-31',f'nicht überschrieben ({cur})')
    ctx.close(); br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Dokumentangaben korrigieren: alles grün')
raise SystemExit(1 if fails else 0)
