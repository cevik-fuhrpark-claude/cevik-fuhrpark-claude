# [CLAUDE] UI-Test (02.11.2026, Backlog 885, Folge aus 884): HU in der App erfasst, kein Fahrzeugdokument „Prüfbericht“ →
# Startseite der Werkstatt zeigt den Abschnitt „Prüfbericht fehlt (HU/SP/Tachograph)“ (#wsnr) mit Kennzeichen; der Eintrag öffnet
# die Fahrzeugakte mit Hinweis und Knopf „Prüfbericht hochladen“, der das Dokument-Formular öffnet. DE/UK/EN bei 390/820/1366 px.
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
        uf=api('POST','/api/users',{'username':f'pw.w{R}.{n}','display_name':f'PW Werkstatt {n}','role':'workshop','workshop_site':'DORTMUND','environment':envn,'language':lang})
        check(uf['s'] in (200,201),f'{lang}/{w}: Konto')
        pl=f'PW-{R%900} {n}'; vin=f'WPW{R:05d}{n:04d}0000000'[:17]; V='VIN:'+vin
        check(api('POST','/api/vehicles',{'plate':pl,'vin':vin,'kind':'lkw','site':'Dortmund'})['s']==201,f'Lkw {pl}')
        ctx=br.new_context(viewport={'width':w,'height':h}); errs=[]
        q=ctx.new_page(); q.goto(B); q.evaluate(JS,['POST','/api/invite/accept',{'token':uf['d']['invite_token'],'password':PW}])
        q.evaluate(JS,['POST','/api/login',{'username':f'pw.w{R}.{n}','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.on('pageerror',lambda e: errs.append(str(e)))
        hu=q.evaluate(JS,['POST',f'/api/vehicles/{V}/husp/HU/complete',{'done_date':day,'evidence':'Rechnung Fremdwerkstatt (Test)','result':'ohne_maengel'}])
        check(hu['s']==200,f'{lang}/{w}: HU erfasst')
        T=q.evaluate("async (l) => { const m = await import('/i18n.js'); const S = m.STRINGS[l]; return { g: S.todo_report_missing, t: S.dq_husp_no_report, b: S.nr_go }; }", lang)
        q.goto(B+'/#/'); q.reload()
        try: q.wait_for_selector('#wsnr',timeout=15000); has=True
        except Exception: has=False
        check(has and T['g'] in q.locator('#wsnr').inner_text(),f'{lang}/{w}: Abschnitt „{T["g"]}“ auf der Werkstatt-Startseite')
        if not has: ctx.close(); continue
        row=q.locator('#wsnr + p + .list a.row', has_text=pl)
        check(row.count()==1 and T['b'] in row.first.inner_text(),f'{lang}/{w}: Eintrag {pl} mit „{T["b"]}“')
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang}/{w}: ohne Querscrollen')
        if SHOTS: q.locator('#wsnr').scroll_into_view_if_needed(); q.screenshot(path=f'{SHOTS}/werkstatt-pruefbericht-{lang}-{w}.png')
        row.first.click()
        try: q.wait_for_selector('#vnr',timeout=15000); ok=True
        except Exception: ok=False
        check(ok and T['t'] in q.locator('#vnr').inner_text(),f'{lang}/{w}: Akte zeigt „Prüfbericht fehlt“')
        if ok:
            q.locator('#vnr [data-nrgo]').first.click()
            try: q.wait_for_function("() => { const d = document.querySelector('#docadd-d'); return d && d.open; }",timeout=10000); op=True
            except Exception: op=False
            check(op,f'{lang}/{w}: „{T["b"]}“ öffnet das Dokument-Formular')
        check(not errs,f'{lang}/{w}: keine JS-Fehler {errs[:1]}')
        # aufräumen: Bericht hochladen, damit „Heute zu tun“ (höchstens 8 Einträge je Gruppe) für den nächsten Lauf übersichtlich bleibt
        up=q.evaluate("async (v) => (await fetch(`/api/vehicles/${encodeURIComponent(v)}/documents?kind=pruefbericht&note=HU`, { method: 'POST', headers: { 'x-cfp': '1', 'content-type': 'application/pdf', 'x-filename': 'HU.pdf' }, body: new TextEncoder().encode('%PDF-1.4\\n% Bericht\\n%%EOF') })).status", V)
        check(up==201,f'{lang}/{w}: Bericht hochgeladen (aufräumen)')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'OK'); exit(1 if fails else 0)
