# [CLAUDE] UI-Test (24.10.2026, Backlog 246 – Betriebsprüfung): Mehr → Fahrer → „Nachweise und Führerscheinkontrollen für einen Zeitraum“:
# Stand heute je Nachweis (aktuell/abgelaufen/abgelöst/storniert), ausgeschiedener Fahrer, Kontrollen mit Storno, Zeitraum ändern, Ausdruck ohne Formular;
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
ST={'de':['aktuell','abgelöst','abgelaufen','storniert'],'uk':['чинний','замінений','прострочений','скасований'],'en':['current','replaced','expired','cancelled']}
LINK={'de':'Nachweise und Führerscheinkontrollen','uk':'Документи та перевірки','en':'Records and licence checks'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
today=datetime.date.today(); d=lambda n: str(today+datetime.timedelta(days=n))
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'fn.inhaber','display_name':'FN Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'fn.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    A=api('POST','/api/drivers',{'display_name':'Ada Zeitraumnachweis','personnel_no':'FN-1','site':'Dortmund'})['d']['id']
    Bd=api('POST','/api/drivers',{'display_name':'Bodo Ausgeschieden','personnel_no':'FN-2'})['d']['id']
    doc=lambda i,b: api('POST',f'/api/drivers/{i}/documents',{'evidence':'UI-Test',**b})
    doc(A,{'kind':'fuehrerschein','license_classes':'C, CE','issued_on':d(-1000),'valid_until':d(500)})
    doc(A,{'kind':'unterweisung','title':'Ladungssicherung','issued_on':d(-400),'valid_until':d(-35)})
    doc(A,{'kind':'unterweisung','title':'Ladungssicherung','issued_on':d(-30),'valid_until':d(335)})
    doc(A,{'kind':'fahrerkarte','issued_on':d(-1800),'valid_until':d(-10)})
    w=doc(A,{'kind':'sonstiges','title':'ADR-Schein','issued_on':d(-20),'valid_until':d(700)})['d']['id']
    api('POST',f'/api/drivers/{A}/documents/{w}/cancel',{'reason':'falsche Akte'})
    doc(Bd,{'kind':'fuehrerschein','issued_on':d(-3000),'valid_until':d(900)})
    api('POST',f'/api/drivers/{A}/license-checks',{'checked_on':d(-200),'result':'in_ordnung'})
    c2=api('POST',f'/api/drivers/{Bd}/license-checks',{'checked_on':d(-50),'result':'in_ordnung'})['d']['id']
    api('POST',f'/api/drivers/{Bd}/license-checks/{c2}/cancel',{'reason':'Tippfehler'})
    api('PATCH',f'/api/drivers/{Bd}',{'active':False})
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        c=br.new_context(viewport={'width':wd,'height':h}); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'fn.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/drivers'); q.wait_for_selector('#drlink', timeout=15000)
        check(LINK[lang].lower() in q.inner_text('#drlink').lower(),f'{lang} {wd}px: Link in der Fahrerliste')
        q.click('#drlink'); q.wait_for_selector('#drf', timeout=15000)
        body=q.inner_text('#drdocs')
        check(all(x in body for x in ST[lang]),f'{lang} {wd}px: alle Stände sichtbar')
        check('Bodo Ausgeschieden' in body and q.locator('#drchecks tbody tr').count()==2,f'{lang} {wd}px: Ausgeschiedener + 2 Kontrollen')
        check(q.locator('#drchecks s').count()==1,f'{lang} {wd}px: stornierte Kontrolle durchgestrichen')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {wd}px: kein Querscrollen')
        sp=q.evaluate(SPLIT); check(not sp,f'{lang} {wd}px: kein Wort mitten im Wort umgebrochen {sp[:3]}')
        if SHOTS: q.screenshot(path=f'{SHOTS}/fahrernachweise_{lang}_{wd}.png', full_page=True)
        q.fill('#drfrom', d(-300)); q.fill('#drto', d(-150)); q.click('#drf button.btn:not(.secondary)')
        q.wait_for_function("()=>document.querySelector('#drf') && !document.querySelector('#drchecks s')", timeout=10000)
        check(q.locator('#drchecks tbody tr').count()==1,f'{lang} {wd}px: älterer Zeitraum – 1 Kontrolle')
        q.emulate_media(media='print'); check(not q.locator('#drf').is_visible(),f'{lang} {wd}px: Ausdruck ohne Formular'); q.emulate_media(media='screen')
        q.evaluate("()=>{ sessionStorage.removeItem('cfp_dr_from'); sessionStorage.removeItem('cfp_dr_to'); }")
        check(not errs,f'{lang} {wd}px: keine Skriptfehler {errs}')
        c.close()
    br.close()
print(f"\n{'OK' if not fails else 'FEHLER: '+str(len(fails))}")
raise SystemExit(1 if fails else 0)
