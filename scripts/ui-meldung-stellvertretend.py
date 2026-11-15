# [CLAUDE] UI-Test (15.11.2026, Backlog 1510, Blickwinkel „Fahrer ruft an – Disposition erfasst die Meldung stellvertretend“):
# Inhaber/Leitung sieht im Meldeformular „Gemeldet von (Name, falls nicht Sie)“, trägt den Namen ein und sendet → Vorgang zeigt „Angabe von …“.
# Fahrer sieht das Feld nicht. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body, ct]) => { const r = await fetch(path, { method: m, headers: { 'content-type': ct || 'application/json', 'x-cfp': '1' }, body: body ? (ct ? body : JSON.stringify(body)) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
LBL={'de':'Gemeldet von','uk':'Повідомив','en':'Reported by'}
SHOWN={'de':'Angabe von','uk':'Зі слів','en':'As stated by'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None,ct=None: a.evaluate(JS,[m,pa,b,ct])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'sv.inhaber','display_name':'SV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    user='sv.inhaber'
    check(api('POST','/api/login',{'username':user,'password':PW})['s']==200,'Anmeldung Inhaber')
    drv='sv.fahrer.'+uuid.uuid4().hex[:6]
    inv=api('POST','/api/users',{'username':drv,'display_name':'SV Fahrer','role':'driver','environment':'test'})
    check(inv['s'] in (200,201),'Fahrer eingeladen')
    tok=inv['d']['invite_token']
    vin='WMA15SZZ2HM77' + str(uuid.uuid4().int)[:4]; plate='SV-ZM '+vin[-3:]
    api('POST','/api/vehicles/import',f'Kennzeichen;Standort;Hersteller;Baujahr;FIN;Fahrzeugart\n{plate};Dortmund;MAN;2016;{vin};Lkw','text/csv')
    # Fahrer: Feld fehlt
    dc=br.new_context(viewport={'width':390,'height':844}); dq=dc.new_page(); dq.goto(B)
    dq.evaluate(JS,['POST','/api/invite/accept',{'token':tok,'password':PW},None]); dq.evaluate(JS,['POST','/api/login',{'username':drv,'password':PW},None])
    dq.goto(B+'/#/new'); dq.reload(); dq.wait_for_selector('#f #d',timeout=15000)
    check(dq.locator('#rnn').count()==0,'Fahrer: kein Feld „Gemeldet von“')
    dc.close()
    n=0
    for lang,(w,h) in [(l,v) for l in ['de','uk','en'] for v in [(390,844),(820,1180),(1366,900)]]:
        n+=1; api('PATCH','/api/me',{'language':lang})
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':user,'password':PW},None]); q.evaluate("localStorage.setItem('cfp_lang', %r)" % lang)
        q.goto(B+'/#/new'); q.wait_for_selector('#f #rnn',timeout=15000)
        check(LBL[lang] in q.inner_text('label[for=rnn]'),f'{lang}/{w}: Beschriftung')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Formular ohne Querscrollen')
        q.fill('#vq',plate); q.wait_for_selector(f'input[name=veh][value="VIN:{vin}"]',state='attached',timeout=15000)
        q.check(f'input[name=veh][value="VIN:{vin}"]',force=True)
        q.fill('#d',f'Rückleuchte links defekt (Test {n})')
        name=f'Fahrer Test {n}, telefonisch'
        q.fill('#rnn',name)
        if SHOTS: q.locator('#rnn').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/stellvertretend-form-{lang}-{w}.png')
        q.click('#f button[type=submit], #f button:not([type])')
        q.wait_for_selector('[data-rnn]',timeout=20000)
        check(q.inner_text('[data-rnn]').strip()==name,f'{lang}/{w}: Vorgang zeigt Vermerk')
        check(SHOWN[lang] in q.inner_text('dl.kv'),f'{lang}/{w}: Beschriftung „{SHOWN[lang]}“')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: Vorgang ohne Querscrollen')
        if SHOTS: q.locator('[data-rnn]').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/stellvertretend-vorgang-{lang}-{w}.png')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
