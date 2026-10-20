# [CLAUDE] UI-Test Bußgeld (20.10.2026): Agentenbefund zum Schreiben (Kennzeichen unbekannt) verlinkt im Management-Panel das Schreiben
# (vorher kein Link); „Status setzen → Eingegangen“ fragt nach und setzt die Fahrerermittlung zurück, Verlauf nennt das.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Frischer Dev-Server nötig.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
RESET={'de':'Fahrerermittlung zurückgesetzt','uk':'Визначення водія скинуто','en':'Driver identification reset'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'bl.inhaber','display_name':'BL Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'bl.inhaber','password':PW})['s']==200,'Anmeldung')
    fi=api('POST','/api/fines',{'kind':'anhoerung','authority':'Stadt Test','reference':'AZ-BL-1','offense_type':'parken','offense_at':'2026-10-01T09:00','plate_in_letter':'XX-UNBEK 9','request_key':'bl-1'})
    check(fi['s']==201,f'Schreiben erfasst ({fi["s"]} {fi["d"]})'); FID=fi['d']['id']
    r=api('POST','/api/agent/run'); check(r['s']==200,f'Agent gelaufen ({r["s"]})')
    first=True
    for lang in ['de','uk','en']:
      api('PATCH','/api/me',{'language':lang})
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'bl.inhaber','password':PW}])
        q.goto(B+'/#/master'); q.wait_for_selector('#afl', state='attached', timeout=15000)
        links=q.eval_on_selector_all('#afl a[data-afine]','els => els.map(e => e.getAttribute("href"))')
        check(('#/fines/'+FID) in links,f'{lang} {w}px: Befund verlinkt das Schreiben ({links})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Panel ohne Querscrollen')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/bl_master_{lang}_{w}.png',full_page=True)
        if first:
            first=False
            # Fahrer per Freitext ermitteln, bezahlt, dann zurück auf „Eingegangen“ über die Oberfläche
            v=api('GET',f'/api/fines/{FID}')['d']['fine']['version']
            api('POST',f'/api/fines/{FID}/commands',{'action':'confirm_driver','expected_version':v,'payload':{'driver_name_note':'Aushilfe BL','basis':'fahrerangabe','evidence':'Angabe'}})
            q.goto(B+'/#/fines/'+FID); q.wait_for_selector('#sf', state='attached', timeout=15000)
            q.evaluate("()=>document.querySelector('#sf').closest('details').open=true")
            q.select_option('#sf select[name=status]','eingegangen'); q.fill('#sf input[name=note]','wieder offen')
            dialogs=[]
            def ondlg(d): dialogs.append(d.message); d.accept()
            q.on('dialog',ondlg)
            q.locator('#sf button').click(); q.wait_for_timeout(1200)
            check(len(dialogs)==1,f'Rückfrage beim Zurücksetzen ({dialogs})')
            f=api('GET',f'/api/fines/{FID}')['d']['fine']
            check(f['status']=='eingegangen' and not f.get('driver_name_note'),f'Ermittlung zurückgesetzt ({f["status"]}, {f.get("driver_name_note")})')
        q.goto(B+'/#/fines/'+FID); q.wait_for_selector('#sf', state='attached', timeout=15000)
        check(RESET[lang] in q.inner_text('body'),f'{lang} {w}px: Verlauf nennt das Zurücksetzen')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: Schreiben ohne Querscrollen')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/bl_fine_{lang}_{w}.png',full_page=True)
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK')
raise SystemExit(1 if fails else 0)
