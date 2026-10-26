# [CLAUDE] UI-Test (26.10.2026, Backlog 379/380, Blickwinkel „Neuer Fahrer, erster Arbeitstag“): Fahrer macht die Abfahrtskontrolle
# mit einem Mangel im Formular → stehende Ergebnisseite „Kontrolle gespeichert, 1 Mangel gemeldet: T-…, vor der Abfahrt klären“
# mit Notfallkontakten und Link zum Auftrag; Auftrag zeigt „nicht abgefragt (aus der Abfahrtskontrolle) – … klären“; Hinweis am
# Kästchen „sicherheitsrelevant“; Fahrer-Startseite: HU/SP ausgeschrieben, „ungeklärt“ mit „klärt die Fuhrparkleitung“.
# Einladungsseite in der beim Anlegen gewählten Sprache (Backlog 381). DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
CLAR={'de':'vor der Abfahrt','uk':'перед виїздом','en':'Before setting off'}
NOTASK={'de':'nicht abgefragt','uk':'не запитувалося','en':'not asked'}
HU={'de':'Hauptuntersuchung (HU)','uk':'Технічний огляд (HU)','en':'Main inspection (HU)'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ft.inhaber','display_name':'FT Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'ft.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; vin=f'WDB9634031073{n:04d}'; vid='VIN:'+vin
        api('POST','/api/vehicles',{'plate':f'FT-ET {n}','vin':vin,'kind':'lkw','site':'Dortmund'})
        u=api('POST','/api/users',{'username':f'ft.fahrer{n}','display_name':f'FT Fahrer {n}','role':'driver','environment':envn,'language':lang})
        check(u['s'] in (200,201),f'Fahrer {n} angelegt ({u["s"]})')
        check(api('POST',f'/api/vehicles/{vid}/drivers',{'user_id':u['d']['id'],'end_previous':False})['s']==201,f'Fahrzeug zugeordnet')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        # Einladungsseite in der von der Leitung gewählten Sprache (Browser ist en-US) – Backlog 381
        q.goto(B+'/#/invite/'+u['d']['invite_token']); q.wait_for_selector('#p',timeout=15000)
        check(q.evaluate('()=>document.documentElement.lang')==lang,f'{lang} {w}px: Einladungsseite in gewählter Sprache')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/erster_tag_einladung_{lang}.png',full_page=True)
        check(q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])['s'] in (200,201),'Einladung angenommen')
        q.evaluate(JS,['POST','/api/login',{'username':f'ft.fahrer{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        # Startseite: HU/SP ausgeschrieben, ungeklärt mit „klärt die Fuhrparkleitung“
        q.goto(B+'/#/'); q.reload(); q.wait_for_timeout(1500)
        if q.locator('[data-unclear]').count():
            body=q.inner_text('body')
            check(q.locator('[data-unclearwho]').count()==q.locator('[data-unclear]').count() and HU[lang] in body,f'{lang} {w}px: HU ausgeschrieben, wer klärt')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/erster_tag_start_{lang}.png',full_page=True)
        # Abfahrtskontrolle mit einem Mangel über das Formular
        q.goto(B+'/#/check'); q.wait_for_selector('.checkitem',timeout=15000)
        if q.locator('#v').count() and q.locator('#v').evaluate('e=>e.tagName')=='SELECT': q.select_option('#v',vid)
        q.evaluate("() => document.querySelectorAll('.checkitem').forEach(r => r.querySelector('input[value=ok]').click())")
        first=q.locator('.checkitem').first; first.locator('label.bad').click()
        check(first.locator('[data-safetyhint]').is_visible(),f'{lang} {w}px: Hinweis am Kästchen sichtbar')
        first.locator('input[name$="__note"]').fill('Rückleuchte links defekt (Test)')
        q.click('#sb'); q.wait_for_selector('[data-defectresult]',timeout=15000)
        res=q.inner_text('[data-defectresult]')
        check(CLAR[lang] in res and ('T-' in res or 'S-' in res),f'{lang} {w}px: Ergebnisseite ({res!r})')
        check(q.locator('[data-defectresult] a[href^="#/emergency"]').count()==1,f'{lang} {w}px: Notfallkontakte erreichbar')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Ergebnis ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/erster_tag_ergebnis_{lang}_{w}.png',full_page=True)
        q.locator('[data-defectresult] a[href^="#/cases/"]').first.click(); q.wait_for_selector('[data-drvcheck]',timeout=15000)
        dc=q.inner_text('[data-drvcheck]')
        check(NOTASK[lang] in dc and CLAR[lang].lower() in dc.lower(),f'{lang} {w}px: Fahrbereitschaft im Auftrag ({dc!r})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Auftrag ohne Querscrollen')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('alles grün' if not fails else f'{len(fails)} Fehler'); raise SystemExit(1 if fails else 0)
