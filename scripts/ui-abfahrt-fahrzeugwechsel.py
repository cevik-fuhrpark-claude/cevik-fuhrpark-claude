# [CLAUDE] UI-Test (01.11.2026, Backlog 823, Blickwinkel „Fahrer wechselt mitten in der Abfahrtskontrolle das Fahrzeug“): Wer nach
# eingetragenen Antworten/km/Fotos ein anderes Fahrzeug wählt, bekommt eine Rückfrage (beide Kennzeichen); Senden ist bis zur Entscheidung
# gesperrt (keine Anfrage). „Neu prüfen“ leert Antworten, Mängelbeschreibung, km-Stand und Fotos; „Übernehmen“ behält alles und sendet für das
# neu gewählte Fahrzeug; zurück zum ursprünglichen Fahrzeug schließt die Rückfrage; erst Antworten, dann Fahrzeug wählen → keine Rückfrage;
# wiederhergestellter Entwurf → keine Rückfrage. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
VA='VIN:WDB9634031L823001'; VB='VIN:WDB9634031L823002'
PNG=bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082')
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fw.inhaber','display_name':'FW Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fw.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'vin':VA[4:],'plate':'FW-AA 1','site':'Dortmund'})
    api('POST','/api/vehicles',{'vin':VB[4:],'plate':'FW-BB 2','site':'Dortmund'})
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        posts=[]; q.on('request',lambda r: posts.append(r.post_data_json) if r.method=='POST' and r.url.endswith('/api/inspections') else None)
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'fw.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.evaluate("sessionStorage.clear()")
        q.goto(B+'/#/check'); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        box=lambda: q.locator('#dcsw').count()
        # 1) A gewählt, Mangel + km + Foto → B wählen → Rückfrage mit beiden Kennzeichen
        q.select_option('#v',VA)
        q.click('.checkitem[data-key=kontrollleuchten] label.bad'); q.fill('input[name=kontrollleuchten__note]','Test 823 Lampe')
        q.fill('#km','123456'); q.set_input_files('#ph',{'name':'a.png','mimeType':'image/png','buffer':PNG})
        q.select_option('#v',VB); q.wait_for_timeout(200)
        tx=q.inner_text('#dcsw') if box() else ''
        check(box()==1 and 'FW-AA 1' in tx and 'FW-BB 2' in tx,f'{lang}/{wd}: Rückfrage nennt beide Kennzeichen ({tx[:70]!r})')
        check(q.evaluate("document.querySelector('#dcsw').getAttribute('role')")=='alert',f'{lang}/{wd}: Rückfrage als Hinweis (role=alert)')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{wd}: ohne Querscrollen')
        if SHOTS: q.locator('#dcsw').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/fahrzeugwechsel-{lang}-{wd}.png')
        q.click('#sb'); q.wait_for_timeout(300)
        check(not posts and box()==1,f'{lang}/{wd}: Senden vor der Entscheidung gesperrt')
        # 2) Neu prüfen → alles leer, B bleibt gewählt
        q.click('#dcswnew'); q.wait_for_timeout(200)
        st=q.evaluate("({r: document.querySelectorAll('#f input[type=radio]:checked').length, n: document.querySelector('input[name=kontrollleuchten__note]').value, km: document.querySelector('#km').value, ph: document.querySelector('#ph').files.length, v: document.querySelector('#v').value, det: document.querySelector('.checkitem[data-key=kontrollleuchten] .detail').hidden})")
        check(box()==0 and st=={'r':0,'n':'','km':'','ph':0,'v':VB,'det':True},f'{lang}/{wd}: „Neu prüfen“ leert alles ({st})')
        # 3) für B eingetragen, kurz A gewählt, zurück zu B → Rückfrage verschwindet
        q.click('.checkitem[data-key=kontrollleuchten] input[value=ok]',force=True)
        q.select_option('#v',VA); q.wait_for_timeout(150); had=box()
        q.select_option('#v',VB); q.wait_for_timeout(150)
        check(had==1 and box()==0,f'{lang}/{wd}: zurück zum geprüften Fahrzeug schließt die Rückfrage')
        # 4) Entwurf wiederhergestellt (Seitenwechsel) → keine Rückfrage
        q.goto(B+'/#/more'); q.wait_for_timeout(300); q.goto(B+'/#/check'); q.wait_for_selector('#f .checkitem',timeout=15000); q.wait_for_timeout(300)
        check(box()==0 and q.input_value('#v')==VB and q.locator('#fdraft').count()==1,f'{lang}/{wd}: Entwurf ohne Rückfrage wiederhergestellt')
        # 5) Übernehmen → alle Antworten bleiben, gesendet für A
        q.select_option('#v',VA); q.wait_for_timeout(150)
        q.click('#dcswkeep'); q.wait_for_timeout(150)
        check(box()==0 and q.evaluate("document.querySelector('.checkitem[data-key=kontrollleuchten] input[value=ok]').checked"),f'{lang}/{wd}: „Übernehmen“ behält die Antworten')
        q.evaluate("document.querySelectorAll('#f .checkitem').forEach((r) => { if (!r.querySelector('input[type=radio]:checked')) r.querySelector('input[value=ok]').click(); })")
        q.click('#sb'); q.wait_for_timeout(1200)
        check(len(posts)==1 and posts[0]['vehicle_id']==VA,f'{lang}/{wd}: gesendet für das neu gewählte Fahrzeug ({[x.get("vehicle_id") for x in posts]})')
        # 6) erst Antworten, dann Fahrzeug wählen → keine Rückfrage
        q.goto(B+'/#/check'); q.wait_for_selector('#f .checkitem',timeout=15000)
        if q.locator('#fdx').count(): q.evaluate("sessionStorage.clear()"); q.reload(); q.wait_for_selector('#f .checkitem',timeout=15000)
        q.select_option('#v','')
        q.click('.checkitem[data-key=kontrollleuchten] input[value=ok]',force=True); q.fill('#km','1000')
        q.select_option('#v',VB); q.wait_for_timeout(150)
        check(box()==0,f'{lang}/{wd}: Fahrzeug erst nach den Antworten gewählt → keine Rückfrage')
        check(not errs,f'{lang}/{wd}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
