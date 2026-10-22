# [CLAUDE] UI-Test (22.10.2026): Ausdrucke aus der Testumgebung sind als Test erkennbar (Vermerk „TESTMODUS“ im Druckkopf,
# Band/Chip schwarz auf weiß mit Rahmen), Betriebsausdrucke ohne Vermerk; Kartenlisten im Druck kompakt; Leitungsübersicht ohne
# Wortbruch in Kopf-/Statuszellen. DE/UK/EN, A4-Breite (794 px). Frischer Dev-Server nötig (sh scripts/restart-dev.sh). Screenshots: CFP_SHOTS=<Ordner>.
import os, uuid
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1', 'x-cfp-env': 'test' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
TEST={'de':'TESTMODUS','uk':'ТЕСТОВИЙ РЕЖИМ','en':'TEST MODE'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'dr.inhaber','display_name':'DR Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'dr.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    api('POST','/api/vehicles',{'vin':'WDB96340310666123','plate':'DR-TE 123','site':'Dortmund'})
    for i in range(3):
        r=api('POST','/api/cases',{'vehicle_id':'VIN:WDB96340310666123','description':'Rückleuchte defekt '+str(i),'priority':'mittel','driveability':'fahrbereit','workshop_site':'DORTMUND','request_key':str(uuid.uuid4())})
        check(r['s']==201,'Testvorgang '+str(r['s']))
    for lang in ['de','uk','en']:
      for envn in ['test','production']:
        c=br.new_context(viewport={'width':794,'height':1123},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'dr.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.evaluate(f"()=>localStorage.setItem('cfp_env','{envn}')")
        q.goto(B+'/#/cases'); q.reload(); q.wait_for_selector('.print-only',state='attached',timeout=15000)
        q.emulate_media(media='print')
        head=q.eval_on_selector('.print-only','e=>e.innerText')
        if envn=='test':
            check(TEST[lang] in head,f'{lang} Test: Druckkopf „{head[:90]}“')
            band=q.eval_on_selector('.testband','e=>{const s=getComputedStyle(e);return [s.color,s.borderTopWidth,s.backgroundImage]}') if q.query_selector('.testband') else None
            check(band and band[0]=='rgb(0, 0, 0)' and band[1]=='2px' and band[2]=='none',f'{lang} Test: Band schwarz auf weiß mit Rahmen {band}')
        else:
            check(not any(v in head for v in TEST.values()),f'{lang} Betrieb: kein Testvermerk')
        mh=q.evaluate("()=>{const r=document.querySelector('.list .row');return r?getComputedStyle(r).minHeight:null}")
        check(mh in (None,'0px'),f'{lang} {envn}: Listenzeile im Druck kompakt ({mh})')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {envn}: kein Querscrollen im Druck')
        if SHOTS: q.screenshot(path=f'{SHOTS}/druck_{envn}_{lang}.png')
        if envn=='test' and lang=='de':
            q.emulate_media(media='screen'); q.goto(B+'/#/master'); q.wait_for_selector('table.mtab',state='attached',timeout=15000); q.emulate_media(media='print')
            ow=q.eval_on_selector('table.mtab th','e=>getComputedStyle(e).overflowWrap')
            check(ow=='normal',f'Leitungsübersicht: Kopfzellen ohne Wortbruch ({ow})')
        check(not errs,f'{lang} {envn}: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'OK' if not fails else 'FEHLER: '+str(len(fails))}")
raise SystemExit(1 if fails else 0)
