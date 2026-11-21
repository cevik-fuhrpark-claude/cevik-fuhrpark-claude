# [CLAUDE] UI-Test (21.11.2026, Backlog 1645, Folge aus 1644): „Auslesung erfassen“ in der Übersicht Auslesungen (Tab Massenspeicher) und in der
# Fahrerakte – Beschriftungen per for/id, Auslesedatum mit max; Datum vor der Erstzulassung → Feld Auslesedatum markiert, Meldung in der
# Oberflächensprache (DE/UK/EN, 390/820/1366 px, ohne Querscrollen/Skriptfehler). Frischer Dev-Server nötig. Screenshots: CFP_SHOTS=<Ordner>.
import os, datetime
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
EXP={'de':'Auslesedatum liegt vor der Erstzulassung des Fahrzeugs.','uk':'Дата зчитування раніша за першу реєстрацію транспортного засобу.','en':'The download date is before the vehicle’s first registration.'}
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'tf.inhaber','display_name':'TF Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'tf.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    VIN='WDB96340310164501'
    v=api('POST','/api/vehicles',{'vin':VIN,'plate':'TF-AB 1645','site':'Dortmund','kind':'lkw'}); check(v['s'] in (200,201),'Fahrzeug '+str(v['s']))
    today=datetime.date.today(); ez=today.replace(day=1)
    check(api('POST','/api/vehicles/VIN:'+VIN+'/spec',{'first_registration':ez.isoformat(),'spec_source':'Fahrzeugschein (Test)'})['s']==200,'Erstzulassung gesetzt')
    d=api('POST','/api/drivers',{'display_name':'TF Fahrer 1645'}); check(d['s'] in (200,201),'Fahrerakte '+str(d['s'])); DID=d['d'].get('id')
    old=(ez-datetime.timedelta(days=20)).isoformat()
    for lang in ['en','uk','de']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        ctx=br.new_context(viewport={'width':w,'height':h},locale='de-DE'); q=ctx.new_page(); q.goto(B)
        errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.evaluate(JS,['POST','/api/login',{'username':'tf.inhaber','password':PW}])
        q.evaluate(JS,['PATCH','/api/me',{'language':lang}])
        q.goto(B+'/#/tacho'); q.reload()
        try: q.wait_for_selector('[data-tt="vehicles"]',timeout=15000); q.click('[data-tt="vehicles"]'); q.wait_for_selector('#tnf',state='attached',timeout=15000)
        except Exception: pass
        at=q.evaluate("()=>{const f=document.querySelector('#tnf'); if(!f) return null; return ['tnft','tnfd','tnfe','tnfn'].every((i)=>f.querySelector('label[for='+i+']') && f.querySelector('#'+i)) && f.querySelector('#tnfd').max && f.querySelector('#tnft').dataset.fkey}")
        check(at=='vehicle_id', f'{lang} {w}px: Übersicht beschriftet, max, data-fkey ({at})')
        if w==390 or w==1366:
          q.evaluate("()=>{ const f=document.querySelector('#tnf'); f.closest('details').open=true; }")
          vid=q.evaluate("(p)=>{ const o=[...document.querySelectorAll('#tnft option')].find((x)=>x.textContent.includes(p)); return o ? o.value : null }", 'TF-AB 1645')
          check(bool(vid), f'{lang}: Fahrzeug in der Auswahl')
          if vid:
            q.select_option('#tnft', vid); q.fill('#tnfd', old); q.fill('#tnfe', 'M_1645'); q.click('#tnf button.btn')
            try: q.wait_for_function("()=>document.querySelector('#tnfd') && document.querySelector('#tnfd').getAttribute('aria-invalid')==='true'", timeout=8000); mk=True
            except Exception: mk=False
            check(mk, f'{lang} {w}px: Auslesedatum markiert')
            check(EXP[lang] in q.evaluate("()=>document.body.innerText"), f'{lang} {w}px: Meldung übersetzt')
            if SHOTS: q.evaluate("()=>document.querySelector('#tnfd').scrollIntoView({block:'center'})"); q.screenshot(path=f'{SHOTS}/tf_tacho_{lang}_{w}.png')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: Übersicht kein Querscrollen')
        q.goto(B+'/#/drivers/'+str(DID))
        try: q.wait_for_selector('#tdf',timeout=15000)
        except Exception: pass
        at2=q.evaluate("()=>{const f=document.querySelector('#tdf'); return !!f && !!f.querySelector('label[for=tdfd]') && !!f.querySelector('label[for=tdfe]') && f.querySelector('#tdfd').max.length===10}")
        check(at2, f'{lang} {w}px: Fahrerakte beschriftet, max')
        check(q.evaluate('()=>document.documentElement.scrollWidth<=window.innerWidth+1'),f'{lang} {w}px: Fahrerakte kein Querscrollen')
        if SHOTS and w==390: q.evaluate("()=>document.querySelector('#tdf') && document.querySelector('#tdf').scrollIntoView({block:'center'})"); q.screenshot(path=f'{SHOTS}/tf_fahrer_{lang}_{w}.png')
        check(not errs,f'{lang} {w}px: keine Skriptfehler {errs}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'Alles grün')
raise SystemExit(1 if fails else 0)
