# [CLAUDE] UI-Test (24.10.2026, Backlog 245 – Betriebsprüfung): Auslesungen → „Verlauf für einen Zeitraum“: Fristüberschreitungen je
# Fahrerkarte/Massenspeicher (offen, in den Zeitraum hinein), ausgeschiedener Fahrer sichtbar, Zeitraum ändern, Ausdruck ohne Bedienelemente;
# DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler/mitten im Wort umgebrochene Wörter. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
SPLIT = r"""() => { const out = []; const w = document.createTreeWalker(document.querySelector('#app'), NodeFilter.SHOW_TEXT); const rg = document.createRange();
  while (w.nextNode()) { const n = w.currentNode; const el = n.parentElement; if (!el || el.offsetParent === null || el.closest('.plate, input, select')) continue;
    const re = /(?<![^\s(„"'])[\p{L}]{4,24}(?=$|[\s,.:;!?)“"'])/gu; let m; while ((m = re.exec(n.textContent))) { rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
      if (new Set([...rg.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size > 1) out.push(m[0]); } } return out; }"""
TITLE={'de':'Verlauf für einen Zeitraum','uk':'Історія за період','en':'history for a period'}
OPEN={'de':'noch offen','uk':'досі відкрито','en':'still open'}
INACT={'de':'nicht mehr aktiv','uk':'більше не активний','en':'no longer active'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today(); d=lambda n: str(today+datetime.timedelta(days=n))
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'av.inhaber','display_name':'AV Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'av.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    A=api('POST','/api/drivers',{'display_name':'Anna Verlaufsprüfung','personnel_no':'AV-1','site':'Dortmund'})['d']['id']
    Bd=api('POST','/api/drivers',{'display_name':'Bernd Ausgeschieden','personnel_no':'AV-2'})['d']['id']
    api('POST','/api/vehicles',{'vin':'WDB96340310824599','plate':'AV-LK 245','site':'Dortmund'})
    for n in [-300,-280,-200]: check(api('POST','/api/tacho/downloads',{'kind':'fahrerkarte','driver_id':A,'downloaded_on':d(n),'evidence':'UI-Test'})['s']==201,f'Auslesung A {n}')
    for n in [-90,-70]: api('POST','/api/tacho/downloads',{'kind':'fahrerkarte','driver_id':Bd,'downloaded_on':d(n),'evidence':'UI-Test'})
    api('PATCH',f'/api/drivers/{Bd}',{'active':False})
    for n in [-250,-100]: api('POST','/api/tacho/downloads',{'kind':'massenspeicher','vehicle_id':'VIN:WDB96340310824599','downloaded_on':d(n),'evidence':'UI-Test'})
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':w,'height':h}); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'av.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/tacho'); q.wait_for_selector('#thlink', timeout=15000)
        check(TITLE[lang].lower() in q.inner_text('#thlink').lower(),f'{lang} {w}px: Link in der Übersicht')
        q.click('#thlink'); q.wait_for_selector('#thf', timeout=15000)
        body=q.inner_text('#app')
        check('Bernd Ausgeschieden' in body and INACT[lang] in body,f'{lang} {w}px: ausgeschiedener Fahrer mit Kennzeichnung')
        check(body.count(OPEN[lang])>=2,f'{lang} {w}px: offene Fristüberschreitungen (Anna, Bernd)')
        check(q.locator('table[data-th=vehicles] tbody tr').count()==1,f'{lang} {w}px: Massenspeicher-Zeile')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: kein Querscrollen')
        sp=q.evaluate(SPLIT); check(not sp,f'{lang} {w}px: kein Wort mitten im Wort umgebrochen {sp[:3]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/auslesung-verlauf_{lang}_{w}.png', full_page=True)
        # Zeitraum in der Vergangenheit: Bernd ohne Auslesung im Zeitraum fehlt, Anna „bis Zeitraumende“ statt offen
        q.fill('#thfrom', d(-260)); q.fill('#thto', d(-150)); q.click('#thf button.btn:not(.secondary)')
        q.wait_for_function("()=>document.querySelector('#thfrom') && !document.body.innerText.includes('Bernd Ausgeschieden')", timeout=10000)
        check(OPEN[lang] not in q.inner_text('#app'),f'{lang} {w}px: vergangener Zeitraum ohne „offen“')
        q.emulate_media(media='print')
        check(not q.locator('#thf').is_visible(),f'{lang} {w}px: Ausdruck ohne Formular')
        q.emulate_media(media='screen')
        q.evaluate("()=>{ sessionStorage.removeItem('cfp_th_from'); sessionStorage.removeItem('cfp_th_to'); }")
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'OK' if not fails else 'FEHLER: '+str(len(fails))}")
raise SystemExit(1 if fails else 0)
