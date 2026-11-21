# [CLAUDE] UI-Test (21.11.2026, Backlog 1661, Blickwinkel „Reifendienst wechselt Freitag, Werkstatt trägt Montag nach“): Reifen erfassen in der
# Fahrzeugakte hat „Durchgeführt am“ (Beschriftung verknüpft, min 2000-01-01, max heute); Nachtrag mit Datum erscheint im Verlauf mit
# Durchführungstag und „erfasst …“; ein Datum vor der letzten Erfassung derselben Position lehnt der Server ab – Feld markiert, Meldung
# übersetzt. DE/UK/EN bei 390/820/1366 px, ohne Querscrollen/Skriptfehler. Braucht den Dev-Server.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Durchgeführt am liegt vor der letzten Erfassung dieser Position','uk':'Дата виконання раніша за останній запис цієї позиції','en':'Performed on is before the last entry for this position'}
LBL={'de':'Durchgeführt am','uk':'Виконано','en':'Performed on'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'rd.inhaber','display_name':'RD Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'rd.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    today=datetime.date.today(); d3=(today-datetime.timedelta(days=3)).isoformat(); d5=(today-datetime.timedelta(days=5)).isoformat()
    n=0
    for lang in ['de','uk','en']:
      for wd,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; tag=f'{lang}/{wd}'; vid=f'VIN:WMA06XZZ8RP1661{n:02d}'
        r=api('POST','/api/vehicles',{'vin':vid[4:],'plate':f'RD-LK 16{n:02d}','site':'Dortmund','kind':'lkw'}); check(r['s'] in (200,201,409),f'{tag}: Fahrzeug ({r["s"]})')
        ctx=br.new_context(viewport={'width':wd,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'rd.inhaber','password':PW}]); q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+f'/#/vehicles/{vid}'); q.reload(); q.wait_for_selector('#tf',state='attached',timeout=15000)
        q.locator('#tf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(100)
        at=q.evaluate("()=>{const i=document.getElementById('tfdone'); return [i.min, i.max, i.labels.length, i.labels[0] && i.labels[0].innerText]}")
        check(at[0]=='2000-01-01' and at[1]==today.isoformat() and at[2]>=1 and LBL[lang] in (at[3] or ''), f'{tag}: Feld min/max/Beschriftung {at}')
        q.select_option('#tf select[name=event_type]','messung'); q.select_option('#tf select[name=position]','VA-L')
        q.fill('#tf input[name=tread_mm]','12'); q.fill('#tfdone',d3); q.click('#tf .actions button.btn')
        try: q.wait_for_selector('[data-tedone]',state='attached',timeout=10000); ok=True
        except Exception: ok=False
        check(ok, f'{tag}: Nachtrag gespeichert, Verlauf mit Durchführungstag')
        if ok:
            txt=q.evaluate("()=>{const d=document.getElementById('tirehistd'); if(d) d.open=true; return document.querySelector('[data-tedone]').closest('td').innerText}")
            check(d3[8:10] in txt and d3[:4] in txt and len(txt.splitlines())>=2, f'{tag}: Verlauf-Zelle {txt!r}')
        q.wait_for_selector('#tf',state='attached',timeout=15000); q.locator('#tf').evaluate("f => f.closest('details').open = true"); q.wait_for_timeout(100)
        q.select_option('#tf select[name=event_type]','messung'); q.select_option('#tf select[name=position]','VA-L')
        q.fill('#tf input[name=tread_mm]','11'); q.fill('#tfdone',d5); q.click('#tf .actions button.btn')
        try: q.wait_for_function("()=>document.getElementById('tfdone') && document.getElementById('tfdone').getAttribute('aria-invalid')==='true'", timeout=8000); mk=True
        except Exception: mk=False
        check(mk, f'{tag}: Datum vor letzter Erfassung → Feld markiert')
        try: q.wait_for_function("(t)=>document.body.innerText.includes(t)", arg=EXP[lang], timeout=5000); shown=True
        except Exception: shown=False
        check(shown, f'{tag}: Meldung übersetzt')
        ev=api('GET',f'/api/vehicles/{vid}/tires')['d']
        check(len(ev['history'])==1, f'{tag}: nichts zusätzlich gespeichert ({len(ev["history"])})')
        q.evaluate("()=>document.getElementById('tfdone').scrollIntoView({block:'center'})")
        check(q.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'{tag}: ohne Querscrollen')
        if SHOTS: q.screenshot(path=f'{SHOTS}/reifendone-{lang}-{wd}.png')
        check(not errs,f'{tag}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün'); raise SystemExit(1 if fails else 0)
