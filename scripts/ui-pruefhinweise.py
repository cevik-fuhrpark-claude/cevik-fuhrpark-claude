# [CLAUDE] UI-Test: Browser-Prüfhinweise (Pflichtfeld, Auswahl) in der App-Sprache DE/UK/EN bei 390/820/1366 px;
# eigener „mehrdeutig“-Hinweis bleibt; kein hängender Hinweis nach Umschalten (Mangel → OK). Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
import os, sys
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'v.inhaber','display_name':'V Inhaber'})
    api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    v=api('POST','/api/vehicles',{'vin':'VAK656EBDG1613170','plate':'SZ-YC 5514','site':'Dortmund'})
    vid=v['d'].get('id') or v['d'].get('vehicle',{}).get('id')
    for lang,req,choose in [('uk','Заповніть це поле.','Виберіть варіант.'),('en','Please fill in this field.','Please select an option.'),('de','Bitte dieses Feld ausfüllen.','Bitte eine Auswahl treffen.')]:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        print('—',lang,w)
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'v.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        # Vertrag: Pflichtfeld leer
        q.goto(B+'/#/vehicles/'+vid); q.wait_for_selector('#ctf',state='attached')
        q.evaluate("()=>document.querySelector('#ctf').closest('details').open=true")
        q.click('#ctf button')
        check(q.eval_on_selector('#ctf [name=partner]','e=>e.validationMessage')==req,'Pflichtfeld in App-Sprache')
        q.fill('#ctf [name=partner]','X')
        check(q.eval_on_selector('#ctf [name=partner]','e=>e.validity.valid'),'nach Eingabe wieder gültig')
        # mehrdeutig bleibt erhalten
        q.fill('#ctf [name=monthly_rate_net]','2.000')
        check('2000' in q.eval_on_selector('#ctf [name=monthly_rate_net]','e=>e.validationMessage'),'„mehrdeutig“-Hinweis bleibt eigener Text')
        # Fehlermeldungen: nur eine gleichzeitig, Antippen schließt
        q.fill('#ctf [name=monthly_rate_net]',''); q.fill('#ctf [name=evidence]','Test')
        q.fill('#ctf [name=start_date]','2026-05-01'); q.fill('#ctf [name=end_date]','2026-01-01')
        q.click('#ctf button'); q.wait_for_selector('.toast.err'); q.click('#ctf button'); q.wait_for_timeout(400)
        check(q.locator('.toast.err').count()==1,'nur eine Fehlermeldung gleichzeitig')
        q.locator('.toast.err').click(); q.wait_for_timeout(100)
        check(q.locator('.toast.err').count()==0,'Antippen schließt die Fehlermeldung')
        # Abfahrtskontrolle
        q.goto(B+'/#/check'); q.wait_for_selector('#f #v')
        q.select_option('#v','')
        q.click('#sb')
        q.wait_for_timeout(200)
        check(q.eval_on_selector('#v','e=>e.validationMessage')==choose,'Auswahlfeld in App-Sprache')
        q.select_option('#v',vid)
        rows=q.locator('.checkitem')
        for i in range(rows.count()): rows.nth(i).locator('label').first.click()
        rows.nth(0).locator('label.bad').click()
        q.click('#sb'); q.wait_for_timeout(300)
        check(q.query_selector('.checkitem .detail input') and q.eval_on_selector('.checkitem .detail input','e=>e.required'),'Mangelbeschreibung Pflicht')
        rows.nth(0).locator('label').first.click()
        q.click('#sb'); q.wait_for_selector('.toast:not(.err)',timeout=5000)
        check(True,'Nach Umschalten auf OK speicherbar (kein hängender Hinweis): '+q.inner_text('.toast:not(.err)'))
        check(not errs,'keine JS-Fehler '+';'.join(errs))
        check(q.evaluate('document.documentElement.scrollWidth<=innerWidth'),'kein waagrechtes Scrollen')
        c.close()
    br.close()
print('FEHLER' if fails else 'Alles grün'); sys.exit(1 if fails else 0)
