# [CLAUDE] UI-Test (19.10.2026): Fehlersuche Fahrzeugimport/Versicherungsfälle/Push-Test.
# Einstellungen: Spaltenhinweis Fahrzeugimport nennt die deutschen Spaltenköpfe (UK/EN mit Übersetzung in Klammern); Import-Vorschau zeigt
# die Fahrzeugart als Bezeichnung (nicht „anhaenger“/„lkw“). Versicherungsfälle: Fall mit unbewerteter Kostenposition zeigt
# „Kosten belegt – unvollständig“. EN-Zahlenfeld: „2.125“ wird nicht als „mehrdeutig“ markiert (DE schon).
# EN 390 px, UK 390 px, DE 1440 px; kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
KIND={'de':('Anhänger','Lkw'),'uk':('Причіп','Вантажівка'),'en':('Trailer','Truck')}
INC={'de':'unvollständig','uk':'неповно','en':'incomplete'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today().isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'il.inhaber','display_name':'IL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'il.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    vid=api('POST','/api/vehicles',{'plate':'IL-UI 81','vin':'WDB96340310888881','site':'Dortmund','kind':'anhaenger'})['d']['id']
    v2=api('POST','/api/vehicles',{'plate':'IL-UI 82','vin':'WDB96340310888882','site':'Dortmund'})['d']['id']
    cs=api('POST','/api/cases',{'vehicle_id':v2,'description':'Unfallschaden Spiegel','priority':'mittel','driveability':'fahrbereit','request_key':'il-1','workshop_site':'DORTMUND'})['d']
    cid=cs['case']['id'] if 'case' in cs else cs['id']
    ver=lambda: api('GET',f'/api/cases/{cid}')['d']['case']['version']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'approve_repair','command_id':'il-c1','expected_version':ver(),'payload':{'workshop_site':'DORTMUND'},'note':'frei'})['s']==200,'Reparatur freigegeben')
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'add_external_cost','command_id':'il-c2','expected_version':ver(),'payload':{'supplier':'Gutachter'}})['s']==200,'Fremdleistung ohne Betrag')
    check(api('PUT',f'/api/cases/{cid}/claim',{'insurer':'UI-Versicherung','reported_on':today,'evidence':'Meldung','status':'in_pruefung'})['s']==200,'Versicherungsfall')
    CSV=b'Kennzeichen;FIN;Fahrzeugart\nIL-UI 81;WDB96340310888881;Lkw\n'
    for lang,w,h in [('en',390,844),('uk',390,844),('de',1440,900)]:
      api('PATCH','/api/me',{'language':lang})
      ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
      q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'il.inhaber','password':PW}])
      q.goto(B+'/#/settings'); q.wait_for_selector('#csv',state='attached',timeout=15000)
      hint=q.locator('#csv').locator('xpath=preceding-sibling::p[1]').inner_text()
      check(all(x in hint for x in ['Kennzeichen','FIN','Fahrzeugart','Anhänger']) and (lang=='de' or '(' in hint),f'{lang}/{w}: Spaltenhinweis Fahrzeugimport ({hint[:70]}…)')
      q.set_input_files('#csv',{'name':'f.csv','mimeType':'text/csv','buffer':CSV}); q.wait_for_selector('#csvr .list',timeout=10000)
      t=q.inner_text('#csvr .list')
      check(f'{KIND[lang][0]} → {KIND[lang][1]}' in t and 'anhaenger' not in t,f'{lang}/{w}: Fahrzeugart als Bezeichnung ({t.splitlines()[-1][:60]})')
      if SHOTS: q.screenshot(path=f'{SHOTS}/import_{lang}_{w}.png',full_page=False)
      q.goto(B+'/#/claims'); q.wait_for_selector('.list a.row',timeout=15000)
      row=q.locator('.list a.row',has_text='UI-Versicherung').first.inner_text()
      check(INC[lang] in row,f'{lang}/{w}: Versicherungsfall „unvollständig“ ({row.splitlines()[-1][:80]})')
      # Zahlenfeld: EN „2.125“ gültig, DE/UK mehrdeutig
      amb=q.evaluate("""() => { const i = document.createElement('input'); i.inputMode = 'decimal'; document.body.appendChild(i); i.value = '2.125'; i.dispatchEvent(new Event('input', { bubbles: true })); const r = i.validationMessage; i.remove(); return r; }""")
      check((amb=='') if lang=='en' else (amb!=''),f'{lang}/{w}: „2.125“ {"gültig" if lang=="en" else "mehrdeutig"} ({amb[:40]})')
      if SHOTS: q.screenshot(path=f'{SHOTS}/claims_{lang}_{w}.png',full_page=False)
      check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
      check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
      ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
