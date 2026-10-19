# [CLAUDE] UI-Test (19.10.2026): Vorgang – Formular „Wiedervorlage“ ist mit dem gespeicherten Vermerk vorbelegt (nur Datum ändern
# behält ihn); fällig gewordener Termin lässt sich unverändert absenden. Globale Suche (Inhaber) findet außer Betrieb genommene Fahrzeuge
# mit Chip „außer Betrieb“. Zeilen mit Chip vorne (Restarbeiten/Folgeaufträge, .row.note) bei 390 px: Titel in voller Breite.
# EN 390 px, UK 390 px, DE 1440 px; kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
INACT={'de':'Außer Betrieb','uk':None,'en':None}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today()
iso=lambda n:(today+datetime.timedelta(days=n)).isoformat()
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wv.inhaber','display_name':'WV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wv.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    v1=api('POST','/api/vehicles',{'plate':'WV-UI 71','vin':'WDB96340310777771','site':'Dortmund'})['d']['id']
    v2=api('POST','/api/vehicles',{'plate':'WV-UI 72','vin':'WDB96340310777772','site':'Dortmund'})['d']['id']
    check(api('POST',f'/api/vehicles/{v2}/active',{'active':False,'reason':'verkauft (UI-Test)'})['s']==200,'Fahrzeug außer Betrieb')
    cs=api('POST','/api/cases',{'vehicle_id':v1,'description':'Spiegel locker','priority':'mittel','driveability':'fahrbereit','request_key':'wv-1'})['d']
    cid=cs['case']['id'] if 'case' in cs else cs['id']
    ver=lambda: api('GET',f'/api/cases/{cid}')['d']['case']['version']
    check(api('POST',f'/api/cases/{cid}/commands',{'action':'set_followup','command_id':'wv-c1','expected_version':ver(),'payload':{'followup_on':iso(3)},'note':'Kosten nachfragen'})['s']==200,'Wiedervorlage gesetzt')
    for lang,w,h in [('en',390,844),('uk',390,844),('de',1440,900)]:
      api('PATCH','/api/me',{'language':lang})
      ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
      q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wv.inhaber','password':PW}])
      q.goto(B+f'/#/cases/{cid}')
      q.wait_for_selector('[data-act=set_followup]',timeout=15000); q.click('[data-act=set_followup]')
      q.wait_for_selector('#af textarea[name=note]')
      check(q.input_value('#af textarea[name=note]')=='Kosten nachfragen',f'{lang}/{w}: Vermerk vorbelegt')
      q.fill('#af [name=followup_on]',iso(4+['en','uk','de'].index(lang))); q.click('#af button.btn:not(.secondary)')
      q.wait_for_function("() => !document.querySelector('#af')",timeout=10000)
      c=api('GET',f'/api/cases/{cid}')['d']['case']
      check(c['followup_note']=='Kosten nachfragen' and c['followup_on']==iso(4+['en','uk','de'].index(lang)),f'{lang}/{w}: nur Datum geändert, Vermerk bleibt ({c["followup_on"]}, {c["followup_note"]})')
      # Suche: außer Betrieb genommenes Fahrzeug
      q.goto(B+'/#/search'); q.fill('#gq','WV-UI 72')
      try: q.wait_for_selector('#gr a[href*="WDB96340310777772"]',timeout=10000); found=True
      except Exception: found=False
      chip=q.locator('#gr a[href*="WDB96340310777772"] .chip').last.inner_text() if found else ''
      check(found and (INACT[lang] is None or chip==INACT[lang]) and chip!='',f'{lang}/{w}: Suche findet außer Betrieb ({chip})')
      # Zeile mit Chip vorne (.row.note) bei schmaler Breite: Titel in voller Breite
      if w<=420:
        r=q.evaluate("""() => { const l = document.createElement('div'); l.className = 'list'; l.innerHTML = '<a class="row note"><span class="chip">S-2026-0001</span><span class="title" style="white-space:normal">Пневмосистема гальм герметична – перевірити</span><span class="chip">У ремонті</span></a>';
          document.querySelector('main, #app, body').appendChild(l); const t = l.querySelector('.title'); const row = l.querySelector('.row'); const res = t.getBoundingClientRect().width / row.getBoundingClientRect().width; l.remove(); return res; }""")
        check(r>0.8,f'{lang}/{w}: Titel in voller Breite ({r:.2f})')
      if SHOTS: q.screenshot(path=f'{SHOTS}/wiedervorlage_suche_{lang}_{w}.png',full_page=False)
      check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{lang}/{w}: kein Querscrollen')
      check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
      ctx.close()
    br.close()
print('FEHLER: '+' | '.join(fails) if fails else 'alle UI-Prüfungen bestanden')
raise SystemExit(1 if fails else 0)
