# [CLAUDE] UI-Test: Vorwarnfristen Regel = Wirkung. Bezeichnungen nennen den Standardwert (Prüftermine/Fahrernachweise 30, Auslesungen 7, Verträge 60),
# Bußgeld-Feld hat eine eigene Bezeichnung (vorher „Antwortfrist – Vorwarnung Prüftermine“), Hinweis „0 = erst am Fälligkeitstag“ sichtbar;
# 0 Tage für Fahrernachweise/Verträge wird gespeichert und als 0 wieder angezeigt. DE/UK/EN bei 390/820/1366 px ohne Querscrollen/Skriptfehler.
# Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':{'maintenance_warn_days':'Standard 30','driver_doc_warn_days':'Standard 30','tacho_warn_days':'Standard 7','contract_warn_days':'Standard 60','fine_warn_days':'Bußgelder'},
     'uk':{'maintenance_warn_days':'стандартно 30','driver_doc_warn_days':'стандартно 30','tacho_warn_days':'стандартно 7','contract_warn_days':'стандартно 60','fine_warn_days':'Штрафи'},
     'en':{'maintenance_warn_days':'default 30','driver_doc_warn_days':'default 30','tacho_warn_days':'default 7','contract_warn_days':'default 60','fine_warn_days':'Fines'}}
HINT={'de':'0 = Hinweis erst am Fälligkeitstag','uk':'0 = нагадування лише в день строку','en':'0 = notice only on the due date'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ep.inhaber','display_name':'EP Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ep.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        api('PUT','/api/settings',{'driver_doc_warn_days':None,'contract_warn_days':None})
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'ep.inhaber','password':PW}])
        q.goto(B+'/#/settings'); q.wait_for_selector('#fine_warn_days')
        for k,v in EXP[lang].items():
          lab=q.inner_text(f'label[for="{k}"]').strip()
          check(v in lab,f'{lang} {w}px: {k} → {lab!r}')
        check('Prüftermine' not in q.inner_text('label[for="fine_warn_days"]'),f'{lang} {w}px: Bußgeld-Feld ohne „Prüftermine“')
        check(HINT[lang] in q.inner_text('#sf'),f'{lang} {w}px: Hinweis zu 0 sichtbar')
        q.fill('#driver_doc_warn_days','0'); q.fill('#contract_warn_days','0'); q.click('#sf button:not([type])')
        q.wait_for_selector('.toast'); q.wait_for_timeout(300)
        vals=api('GET','/api/settings')['d']['values']
        check(vals.get('driver_doc_warn_days')=='0' and vals.get('contract_warn_days')=='0',f'{lang} {w}px: 0 gespeichert')
        q.goto(B+'/#/'); q.goto(B+'/#/settings'); q.wait_for_selector('#driver_doc_warn_days')
        check(q.input_value('#driver_doc_warn_days')=='0' and q.input_value('#contract_warn_days')=='0',f'{lang} {w}px: 0 wieder angezeigt')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        if SHOTS: q.wait_for_timeout(400); q.evaluate("()=>document.getElementById('fine_warn_days').scrollIntoView({block:'center'})"); q.screenshot(path=f'{SHOTS}/einstellungen_vorwarnung_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:1]}')
        c.close()
    api('PUT','/api/settings',{'driver_doc_warn_days':None,'contract_warn_days':None}); api('PATCH','/api/me',{'language':'de'})
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
