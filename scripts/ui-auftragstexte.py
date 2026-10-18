# [CLAUDE] UI-Test: Aufträge aus Prüftermin zeigen den Rahmen in der Oberflächensprache (DE/UK/EN, 390/820/1366 px):
# „Prüfung/Wartung Ölwechsel durchführen – <Vermerk>“ → UK „Провести огляд/ТО: Заміна оливи – …“, EN „Carry out inspection/maintenance: Oil change – …“.
# Vorgang, Verlauf (Freigabe-Vermerk „Auftrag aus Prüftermin …“) und Vorgangsliste; Vermerk unverändert; kein JS-Fehler, kein waagrechtes Scrollen. Frischer Dev-Server nötig (sh scripts/restart-dev.sh).
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Prüfung/Wartung Ölwechsel durchführen – Filter mitbringen','uk':'Провести огляд/ТО: Заміна оливи – Filter mitbringen','en':'Carry out inspection/maintenance: Oil change – Filter mitbringen'}
EXP2={'de':'Auftrag aus Prüftermin Ölwechsel: Filter mitbringen','uk':'Замовлення з терміну огляду: Заміна оливи: Filter mitbringen','en':'Order from inspection due date: Oil change: Filter mitbringen'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'a.inhaber','display_name':'A Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    for u in ['a.inhaber','w.inhaber']:
        if api('POST','/api/login',{'username':u,'password':PW})['s']==200: break
    api('POST','/api/vehicles',{'vin':'WDB96340510399931','plate':'SZ-YC 9931','site':'Dortmund','kind':'lkw'})
    vid='VIN:WDB96340510399931'
    r=api('POST',f'/api/vehicles/{vid}/maintenance',{'kind':'Ölwechsel','evidence':'Wartungsheft','interval_months':12})
    check(r['s'] in (201,409),'Prüftermin angelegt '+str(r['s']))
    rid=(r['d'] or {}).get('id') or ((r['d'] or {}).get('rule_id'))
    o=api('POST',f'/api/maintenance/{rid}/order',{'workshop_site':'DORTMUND','note':'Filter mitbringen'})
    check(o['s']==201,'Auftrag aus Prüftermin '+str(o['s'])+' '+str(o['d'])[:200])
    cid=(o['d'] or {}).get('id') or (o['d'] or {}).get('case_id')
    me=api('GET','/api/me')['d']; uname=me['user']['username'] if me and 'user' in me else 'a.inhaber'
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        print('—',lang,w)
        c=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=c.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':uname,'password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/cases/'+cid); q.wait_for_selector('main h2, main h1')
        q.wait_for_timeout(300)
        check(EXP[lang] in q.inner_text('main'),'Vorgang zeigt Rahmen in '+lang)
        check(EXP2[lang] in q.inner_text('main'),'Verlauf: Freigabe-Vermerk in '+lang)
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),'kein waagrechtes Scrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/auftragstext_{lang}_{w}.png')
        q.goto(B+'/#/cases'); q.wait_for_timeout(500)
        check(EXP[lang][:20] in q.inner_text('main'),'Vorgangsliste zeigt Rahmen in '+lang)
        check(not errs,'keine JS-Fehler '+';'.join(errs))
        c.close()
    br.close()
print('alles grün' if not fails else 'FEHLER: '+' | '.join(fails))
raise SystemExit(1 if fails else 0)
