# [CLAUDE] UI-Test (02.11.2026, Backlog 883, Blickwinkel „Lkw kommt aus der Fremdwerkstatt mit Rechnung, aber ohne Prüfbericht“):
# HU in der App erfasst, kein Fahrzeugdokument „Prüfbericht“ → Akte zeigt oben „Prüfbericht fehlt“; „Prüfbericht hochladen“ öffnet
# „Dokument hinzufügen“ mit Art Prüfbericht und Bemerkung „HU <Datum>“; nach dem Hochladen ist der Hinweis weg. DE/UK/EN bei 390/820/1366 px.
import os, tempfile, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
pdf=os.path.join(tempfile.mkdtemp(),'HU-Bericht.pdf')
open(pdf,'wb').write(b'%PDF-1.4\n% Pruefbericht Test\n%%EOF')
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rb.inhaber','display_name':'RH Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    if api('POST','/api/login',{'username':'rb.inhaber','password':PW})['s']!=200:
        okl=False
        for un in ['pd.inhaber','as.inhaber','ma.inhaber','vt.inhaber','ka.inhaber','ab.inhaber','ws.inhaber','ft.inhaber','fa.inhaber','az.inhaber']:
            if api('POST','/api/login',{'username':un,'password':PW})['s']==200: okl=True; break
        check(okl,'Anmeldung Inhaber')
    me=api('GET','/api/me')['d']; envn=(me.get('user') or me).get('environment') or 'production'
    R=os.getpid()%100000; n=0
    day=(datetime.date.today()-datetime.timedelta(days=3)).isoformat()
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1
        uf=api('POST','/api/users',{'username':f'pb.f{R}.{n}','display_name':f'PB Leitung {n}','role':'fleet','environment':envn,'language':lang})
        check(uf['s'] in (200,201),f'{lang}/{w}: Konto')
        pl=f'PB-{R%900} {n}'; vin=f'WPB{R:05d}{n:04d}0000000'[:17]; V='VIN:'+vin
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':uf['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'pb.f{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.on('pageerror',lambda e: errs.append(str(e)))
        hu=q.evaluate(JS,['POST',f'/api/vehicles/{V}/husp/HU/complete',{'done_date':day,'evidence':'Rechnung Fremdwerkstatt (Test)','result':'ohne_maengel'}])
        check(hu['s']==200,f'{lang}/{w}: HU erfasst')
        T=q.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { t: S.dq_husp_no_report, go: S.nr_go, hint: S.nr_hint }; }", lang)
        q.goto(B+f'/#/vehicles/{V}'); q.reload(); q.wait_for_selector('#vnr',timeout=15000)
        check(T['t'] in q.locator('#vnr').inner_text() and T['hint'] in q.locator('#vnr').inner_text(),f'{lang}/{w}: Hinweis „{T["t"][:30]}…“')
        b=q.locator('#vnr [data-nrgo]'); check(b.count()==1 and T['go'] in b.inner_text(),f'{lang}/{w}: Knopf „{T["go"]}“')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        b.click()
        check(q.evaluate("document.querySelector('#docadd-d').open"),f'{lang}/{w}: Formular offen')
        check(q.evaluate("document.querySelector('#docf').kind.value")=='pruefbericht',f'{lang}/{w}: Art Prüfbericht')
        check(q.evaluate("document.querySelector('#docf').note.value")==f'HU {day}',f'{lang}/{w}: Bemerkung vorbelegt')
        if SHOTS: q.locator('#vnr').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/pruefbericht-fehlt-{lang}-{w}.png')
        q.set_input_files('#docf input[name=file]',pdf)
        q.locator('#docf button.btn').last.click()
        try: q.wait_for_selector('#vnr',state='detached',timeout=15000); gone=True
        except Exception: gone=False
        check(gone,f'{lang}/{w}: nach dem Hochladen kein Hinweis mehr')
        dq=api('GET','/api/admin/data-quality')['d']
        check(not any(i['check']=='husp_no_report' and i.get('vehicle_id')==V for i in dq['items']),f'{lang}/{w}: Datenqualität ohne Befund')
        check(not errs,f'{lang}/{w}: keine JS-Fehler {errs[:1]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK'); exit(1 if fails else 0)
