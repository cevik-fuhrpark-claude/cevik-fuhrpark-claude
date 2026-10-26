# [CLAUDE] UI-Test Backlog 408 (Blickwinkel „Reifendienst wechselt an einem Tag die Reifen von 10 Lkw“): Winterreifen-Auftrag →
# „Umrüstung erfassen ›“ → Formular vorbereitet (Wechsel, offene Positionen einer Achse, Bezug zum Auftrag), Winterkennzeichnung Pflicht,
# hinterlegte Größe nur per Knopf; nach dem Speichern folgt die nächste Achse, danach „erfüllt“ mit Link zurück zum Auftrag.
# DE/UK/EN bei 390/820/1366 px, kein Querscrollen, keine Skriptfehler.
import os
from playwright.sync_api import sync_playwright
B=os.environ.get('CFP_URL','http://localhost:8787'); PW='Sicheres-Passwort-2026'; SHOTS=os.environ.get('CFP_SHOTS')
JS = """async ([m, path, body]) => { const r = await fetch(path, { method: m, headers: { 'content-type': 'application/json', 'x-cfp': '1' }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, d: await r.json().catch(() => null) }; }"""
fails=[]
def check(c,m):
    print(('  ✔ ' if c else '  ✘ ')+m)
    if not c: fails.append(m)
noscroll='document.documentElement.scrollWidth<=window.innerWidth+1'
with sync_playwright() as p:
    br=p.chromium.launch(); a=br.new_page(); a.goto(B)
    api=lambda m,pa,b=None: a.evaluate(JS,[m,pa,b])
    s=api('POST','/api/setup',{'setup_code':'test-setup-code-123','username':'wu.inhaber','display_name':'WU Inhaber'})
    if s['s']==200: api('POST','/api/invite/accept',{'token':s['d']['invite_token'],'password':PW})
    check(api('POST','/api/login',{'username':'wu.inhaber','password':PW})['s']==200,'Anmeldung Inhaber')
    ws=[w['code'] for w in api('GET','/api/meta')['d']['workshops'] if w['code']!='EXTERN'][0]
    n=0
    for lang in ['de','uk','en']:
      for w,h in [(390,844),(820,1180),(1366,900)]:
        n+=1; vin=f'WMA06XZZ0HP20{9000+n}'; vid='VIN:'+vin
        api('POST','/api/vehicles',{'plate':f'WU-{lang.upper()} {w%1000+n}','vin':vin,'site':'Dortmund'})
        api('POST',f'/api/vehicles/{vid}/tires/specs',{'axle':'lenkachse','size':'385/65 R22.5'})
        for pos in ['VA-L','VA-R','HA-L-aussen','HA-R-aussen']: api('POST',f'/api/vehicles/{vid}/tires/events',{'event_type':'sichtpruefung','position':pos,'winter_mark':'ms'})
        o=api('POST',f'/api/vehicles/{vid}/tires/winter-order',{'workshop_site':ws,'request_key':f'wu-{lang}-{w}-{n}'})
        check(o['s']==201,f'{lang}/{w}: Auftrag angelegt {o["s"]}')
        ctx=br.new_context(viewport={'width':w,'height':h}); q=ctx.new_page(); errs=[]; q.on('pageerror',lambda e: errs.append(str(e)))
        q.goto(B); q.evaluate(JS,['POST','/api/login',{'username':'wu.inhaber','password':PW},None]); q.evaluate(JS,['PATCH','/api/me',{'language':lang},None])
        q.goto(B+'/#/cases/'+o['d']['id']); q.wait_for_selector('#cwrec',timeout=15000)
        q.click('#cwrec'); q.wait_for_selector('#tfwo:not([hidden])',timeout=15000); q.wait_for_timeout(300)
        st=q.evaluate("""() => { const f = document.querySelector('#tf'); return { t: f.event_type.value, p: f.position.value, more: [...f.querySelectorAll('input[name=positions]:checked')].map((x) => x.value),
          wm: f.winter_mark.value, req: f.winter_mark.required, cid: f.case_id.value, size: f.size.value, valid: f.checkValidity() }; }""")
        check(st['t']=='wechsel' and st['p']=='VA-L' and st['more']==['VA-R'] and st['cid']==o['d']['id'],f'{lang}/{w}: Lenkachse vorbereitet {st}')
        check(st['wm']=='' and st['req'] and st['size']=='' and not st['valid'],f'{lang}/{w}: Kennzeichnung Pflicht, Größe nicht vorbelegt')
        check(o['d']['case_no'] in q.inner_text('#tfwo'),f'{lang}/{w}: Hinweis nennt den Auftrag')
        check(q.is_visible('#tfspecgo'),f'{lang}/{w}: Knopf hinterlegte Größe')
        q.click('#tfspecgo'); check(q.input_value('#tf input[name=size]')=='385/65 R22.5',f'{lang}/{w}: Größe übernommen')
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/wu_form_{lang}.png',full_page=True)
        check(q.evaluate(noscroll),f'{lang}/{w}: Formular ohne Querscrollen')
        q.select_option('#tf select[name=winter_mark]','3pmsf'); q.click('#tf .actions .btn')
        q.wait_for_function("() => { const f = document.querySelector('#tf'); return f && f.position.value === 'HA-L-aussen'; }",timeout=15000); q.wait_for_timeout(300)
        st=q.evaluate("""() => { const f = document.querySelector('#tf'); return { t: f.event_type.value, more: [...f.querySelectorAll('input[name=positions]:checked')].map((x) => x.value), wm: f.winter_mark.value, cid: f.case_id.value, spec: !document.querySelector('#tfspec').hidden }; }""")
        check(st['t']=='wechsel' and st['more']==['HA-R-aussen'] and st['wm']=='' and st['cid']==o['d']['id'] and not st['spec'],f'{lang}/{w}: nächste Achse vorbereitet (ohne hinterlegte Größe kein Knopf) {st}')
        q.fill('#tf input[name=size]','315/70 R22.5'); q.select_option('#tf select[name=winter_mark]','3pmsf'); q.click('#tf .actions .btn')
        q.wait_for_selector('#twodone',timeout=15000)
        if SHOTS and w==390: q.screenshot(path=f'{SHOTS}/wu_done_{lang}.png',full_page=True)
        check(q.evaluate(noscroll),f'{lang}/{w}: Ergebnis ohne Querscrollen')
        check(q.query_selector('#twopre') is None and q.query_selector('#tfwo:not([hidden])') is None,f'{lang}/{w}: nach Erfüllung nichts mehr vorbereitet')
        q.click('#twodone a'); q.wait_for_selector('#cwinter',timeout=15000)
        check(q.query_selector('#cwinter .chip.ok') is not None and q.query_selector('#cwrec') is None,f'{lang}/{w}: Auftrag zeigt erfüllt')
        ev=api('GET',f'/api/vehicles/{vid}/tires')['d']['history']
        check(len([e for e in ev if e.get('case_id')==o['d']['id']])==4,f'{lang}/{w}: 4 Ereignisse mit Bezug zum Auftrag')
        check(not errs,f'{lang}/{w}: keine Skriptfehler {errs[:2]}')
        ctx.close()
    br.close()
print('FEHLER: '+str(len(fails)) if fails else 'alles grün')
raise SystemExit(1 if fails else 0)
