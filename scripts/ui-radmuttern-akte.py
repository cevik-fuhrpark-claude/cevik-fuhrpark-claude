# [CLAUDE] UI-Test Backlog 1588 (Backlog 195, Blickwinkel „Reifenwechsel ohne Auftrag – Radmuttern nachziehen“):
# Werkstatt erfasst in der Fahrzeugakte (Reifen) einen Reifenwechsel ohne Auftragsbezug → Hinweis mit Knopf „Hinweis für Fahrer vorbereiten“;
# der Knopf füllt das Formular „Hinweis zum Fahrzeug“ vor (Text, „für Fahrer“, Fokus auf „Gültig bis“), gespeichert wird erst durch die Person;
# danach meldet der Knopf „bereits aktiv“. Gegenprobe: Messung zeigt keinen Hinweis.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler. Screenshots: CFP_SHOTS=<Ordner>.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
HINT={'de':'Ohne Auftrag gibt es keinen Abholvermerk','uk':'Без замовлення немає примітки про отримання','en':'Without an order there is no pick-up note'}
TXT={'de':'Räder wurden gewechselt: Radmuttern nach Herstellervorgabe nachziehen lassen.','uk':'Колеса замінено: підтягнути колісні гайки згідно з вимогами виробника.','en':'Wheels were changed: have the wheel nuts re-torqued as specified by the manufacturer.'}
EXISTS={'de':'bereits aktiv','uk':'вже активна','en':'already active'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'ra.inhaber','display_name':'RA Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'ra.inhaber','password':PW})['s']!=200:
        ok=False
        for un in ['rm.inhaber','ab.inhaber','ws.inhaber','ls.inhaber','ft.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: ok=True; break
        check(ok,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    def save_tire(q,kind,pos,size=None,tread=None):
        q.select_option('#tf select[name=event_type]',kind); q.select_option('#tf select[name=position]',pos)
        if size: q.fill('#tf input[name=size]',size)
        if tread: q.fill('#tf input[name=tread_mm]',tread)
        with q.expect_response(lambda r: '/tires/events' in r.url and r.request.method=='POST') as rr: q.click('#tf button.btn')
        return rr.value.status
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; pl=f'RA-R {R%900}{n}'; vin=f'WDB97{R:05d}A{n:04d}00'
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,'Fahrzeug angelegt')
        u=api('POST','/api/users',{'username':f'ra.ws{R}.{n}','display_name':f'RA Werkstatt {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(u['s'] in (200,201),'Werkstatt-Konto angelegt')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':u['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'ra.ws{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/vehicles/VIN:{vin}?sec=tires'); q.reload(); q.wait_for_selector('#tf',timeout=15000); q.wait_for_selector('#vnf',state='attached',timeout=15000)
        # Gegenprobe: Messung → kein Hinweis
        check(save_tire(q,'messung','VA-L',tread='9')==201,'Messung gespeichert')
        q.wait_for_selector('#tf',timeout=10000); q.wait_for_timeout(300)
        check(q.locator('#tfwheel').count()==0,f'{lang} {w}px: Messung ohne Radmuttern-Hinweis')
        check(save_tire(q,'wechsel','VA-L',size='385/65 R22.5')==201,'Reifenwechsel ohne Auftrag gespeichert')
        q.wait_for_selector('#tfwheel',timeout=10000)
        check(HINT[lang] in q.inner_text('#tfwheel'),f'{lang} {w}px: Hinweis nach Reifenwechsel')
        check(q.locator('#vnotes ul.vnotes:not(.muted) li').count()==0,'noch kein Hinweis gespeichert (nichts automatisch)')
        if SHOTS: q.locator('#tfwheel').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/radmuttern_akte_{lang}_{w}.png')
        q.click('#tfwheelgo')
        check(q.input_value('#vnt')==TXT[lang],f'{lang} {w}px: Text vorbefüllt')
        check(q.is_checked('#vnf input[name=for_driver]'),f'{lang} {w}px: „für Fahrer“ angehakt')
        check(q.evaluate("()=>document.activeElement && document.activeElement.id")=='vnv',f'{lang} {w}px: Fokus auf „Gültig bis“')
        check(q.input_value('#vnv')=='',f'{lang} {w}px: keine vorgegebene Frist')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'),f'{lang} {w}px: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/radmuttern_akte_form_{lang}_{w}.png')
        with q.expect_response(lambda r: r.url.endswith('/notes') and r.request.method=='POST') as rr: q.click('#vnf button.btn')
        check(rr.value.status==201,f'{lang} {w}px: Hinweis gespeichert')
        q.wait_for_function("t=>[...document.querySelectorAll('#vnotes ul.vnotes:not(.muted) li b')].some(b=>b.textContent.includes(t))",arg=TXT[lang],timeout=10000)
        q.click('#tfwheelgo'); q.wait_for_timeout(300)
        check(EXISTS[lang] in q.inner_text('body'),f'{lang} {w}px: zweiter Klick meldet „bereits aktiv“')
        check(q.locator('#vnotes ul.vnotes:not(.muted) li').count()==1,f'{lang} {w}px: kein zweiter Hinweis')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
